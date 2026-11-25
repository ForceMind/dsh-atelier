#!/usr/bin/env python3
"""Acquire authenticated npm inputs without running package code or a package manager."""
from __future__ import annotations

import argparse
import base64
import gzip
import hashlib
import io
import json
import os
import re
import stat
import sys
import tarfile
import unicodedata
import urllib.error
import urllib.request
from pathlib import Path

HERE = Path(os.path.abspath(__file__)).parent
CACHE = HERE.parent / '.inputs'
LOCK = HERE / 'lock.json'
NPM = 'https://registry.npmjs.org/'
MAX_ARCHIVE = 20_000_000
MAX_TAR = 50_000_000
MAX_FILE = 10_000_000
MAX_MEMBERS = 10_000
PINNED = {
    '@deepseek-ai/cosmokit': ('@deepseek-ai/cosmokit', '1.8.6'),
    '@deepseek-ai/schemastery': ('@deepseek-ai/schemastery', '3.18.5'),
    '@standard-schema/spec': ('@standard-schema/spec', '1.1.0'),
    'dsh-atelier-plugin': ('dsh-atelier-plugin', '1.7.0'),
    'dsh-better-reasoning-effort': ('dsh-better-reasoning-effort', '0.5.4'),
    'dsh-context': ('dsh-context', '0.83.0'),
    'zod-4.4.3': ('zod', '4.4.3'),
    'zod-4.6.7': ('zod', '4.6.7'),
}
RESERVED = re.compile(r'^(?:con|prn|aux|nul|com[1-9¹²³]|lpt[1-9¹²³])\s*(?:\.|$)', re.I)


def need(condition, message):
    if not condition:
        raise ValueError(message)


def read_json(raw):
    def obj(pairs):
        out = {}
        for k, v in pairs:
            need(k not in out, f'Duplicate JSON key {k!r}')
            out[k] = v
        return out
    return json.loads(raw, object_pairs_hook=obj)


def encoded(value):
    return (json.dumps(value, ensure_ascii=False, indent=2, sort_keys=True) + '\n').encode('utf-8')


def digest(raw):
    return hashlib.sha256(raw).hexdigest()


def sri(raw):
    return 'sha512-' + base64.b64encode(hashlib.sha512(raw).digest()).decode('ascii')


def rel(path):
    need(isinstance(path, str), 'Expected path string')
    parts = path.split('/')
    for part in parts:
        need(part not in ('', '.', '..') and not part.endswith((' ', '.'))
             and not re.search(r'[<>:"\\|?*\x00-\x1f\x7f]', part)
             and not RESERVED.match(part) and len(part.encode('utf-8')) <= 255,
             f'Unsafe member path {path!r}')
    return parts


def alias(path):
    return unicodedata.normalize('NFC', path).casefold()


def path_inventory(entries):
    aliases, kinds = {}, {}
    for path, kind in entries:
        parts = rel(path)
        for i in range(1, len(parts)+1):
            actual = '/'.join(parts[:i])
            target = kind if i == len(parts) else 'dir'
            need(aliases.setdefault(alias(actual), actual) == actual, f'Case/Unicode path collision: {actual}')
            need(kinds.setdefault(actual, target) == target, f'File/directory collision: {actual}')
    return kinds


def plain_stat(path):
    s = path.lstat()
    need(not stat.S_ISLNK(s.st_mode) and not getattr(s, 'st_file_attributes', 0) & stat.FILE_ATTRIBUTE_REPARSE_POINT,
         f'Linked/reparse point refused: {path}')
    return s


def check_parents(path):
    for parent in reversed(path.parents):
        if os.path.lexists(parent):
            need(stat.S_ISDIR(plain_stat(parent).st_mode), f'Not a directory: {parent}')


def bounded_read(path, bound=MAX_ARCHIVE):
    check_parents(path)
    s = plain_stat(path)
    need(stat.S_ISREG(s.st_mode) and s.st_size <= bound, f'Invalid file or size: {path}')
    with path.open('rb') as f:
        raw = f.read(bound+1)
    need(len(raw) <= bound, f'File exceeds size limit: {path}')
    return raw


def mkdir(path):
    check_parents(path)
    if os.path.lexists(path):
        need(stat.S_ISDIR(plain_stat(path).st_mode), f'Not a directory: {path}')
    else:
        path.mkdir(parents=True)


def write_new(path, raw, mode=0o644):
    mkdir(path.parent)
    with path.open('xb') as f:
        f.write(raw)
    if os.name != 'nt':
        path.chmod(mode)


def tarball_url(name, version):
    return NPM + f'{name}/-/{name.split("/")[-1]}-{version}.tgz'


class NoRedirect(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, req, fp, code, msg, headers, newurl):
        raise ValueError(f'Redirect refused for {req.full_url}: HTTP {code}')


def download(url, name, version):
    need(url == tarball_url(name, version) and (name, version) in PINNED.values(), 'Only exact pinned HTTPS npm tarballs allowed')
    opener = urllib.request.build_opener(urllib.request.ProxyHandler({}), NoRedirect())
    request = urllib.request.Request(url, headers={'User-Agent': 'Atelier-Suite-pinned-inputs/1', 'Accept-Encoding': 'identity'})
    with opener.open(request, timeout=30) as response:
        need(response.status == 200 and response.geturl() == url, 'Unexpected tarball response')
        need(response.headers.get('Content-Encoding', 'identity') == 'identity', 'Unexpected content encoding')
        raw = response.read(MAX_ARCHIVE + 1)
    need(len(raw) <= MAX_ARCHIVE, 'Compressed size limit exceeded')
    return raw


def inspect_archive(raw, name, version):
    need(len(raw) <= MAX_ARCHIVE, 'Compressed size limit exceeded')
    with gzip.GzipFile(fileobj=io.BytesIO(raw)) as stream:
        expanded = stream.read(MAX_TAR+1)
    need(len(expanded) <= MAX_TAR, 'Expanded size limit exceeded')
    payload, metadata, seen = {}, {}, {}
    with tarfile.open(fileobj=io.BytesIO(expanded), mode='r:') as archive:
        for member in archive:
            key = member.name
            need(key not in seen and len(seen) < MAX_MEMBERS, f'Duplicate/excess archive members: {key}')
            need(member.type in (tarfile.REGTYPE, tarfile.AREGTYPE, tarfile.DIRTYPE)
                 and not member.pax_headers and not member.linkname and member.sparse is None,
                 f'Unsupported archive member: {key}')
            seen[key] = 'dir' if member.isdir() else 'file'
            if key == 'package':
                need(member.isdir() and member.size == 0, 'Invalid archive root')
                continue
            need(key.startswith('package/'), f'Member outside package root: {key}')
            name_inside = key[8:]
            rel(name_inside)
            if member.isdir():
                need(member.size == 0, f'Nonempty directory header: {key}')
                continue
            need(member.mode in (0o600, 0o644, 0o755) and 0 <= member.size <= MAX_FILE, f'Unsupported member size/mode: {key}')
            with archive.extractfile(member) as f:
                content = f.read(MAX_FILE+1)
            need(len(content) == member.size, f'Truncated member: {key}')
            payload[name_inside] = content
            metadata[name_inside] = {'bytes': len(content), 'mode': 0o755 if member.mode == 0o755 else 0o644, 'sha256': digest(content)}
    actual = path_inventory((p[8:], k) for p, k in seen.items() if p != 'package')
    need(actual == path_inventory((p, 'file') for p in payload), 'Unexpected empty directories in archive')
    need('package.json' in payload, 'Missing package.json')
    manifest = read_json(payload['package.json'])
    need((manifest.get('name'), manifest.get('version')) == (name, version), 'Archive package name/version mismatch')
    return payload, metadata


def load_lock():
    raw = bounded_read(LOCK)
    lock = read_json(raw)
    need(isinstance(lock, dict) and set(lock) == {'schemaVersion','packages'} and lock['schemaVersion'] == 1
         and isinstance(lock['packages'], list) and len(lock['packages']) == len(PINNED), 'Unsupported lock schema/count')
    seen = set()
    for row in lock['packages']:
        need(set(row) == {'name','version','location','url','archiveSha256','archiveBytes','integrity','files'}, 'Unexpected lock fields')
        name, version, location = (row[k] for k in ('name','version','location'))
        need(location not in seen and PINNED.get(location) == (name,version), 'Unexpected lock package identity')
        seen.add(location)
        need(row['url'] == tarball_url(name,version), 'Lock URL is not the exact pinned HTTPS npm tarball')
        need(re.fullmatch('[0-9a-f]{64}',row['archiveSha256']) and row['integrity'].startswith('sha512-')
             and len(base64.b64decode(row['integrity'][7:],validate=True)) == 64 and type(row['archiveBytes']) is int
             and 0 < row['archiveBytes'] <= MAX_ARCHIVE, 'Invalid archive hashes/size in lock')
        files = row['files']
        need(isinstance(files,dict) and 'package.json' in files and len(files) <= MAX_MEMBERS, 'Invalid lock manifest')
        path_inventory((p,'file') for p in files)
        for meta in files.values():
            need(set(meta) == {'bytes','mode','sha256'} and type(meta['bytes']) is int and 0 <= meta['bytes'] <= MAX_FILE
                 and meta['mode'] in (0o644,0o755) and re.fullmatch('[0-9a-f]{64}',meta['sha256']), 'Invalid file metadata')
    return lock


def verify_archive(raw, row):
    need(len(raw) == row['archiveBytes'] and digest(raw) == row['archiveSha256'] and sri(raw) == row['integrity'],
         f'Archive integrity mismatch: {row["location"]}')
    payload, files = inspect_archive(raw,row['name'],row['version'])
    need(files == row['files'], f'Archive file inventory mismatch: {row["location"]}')
    return payload


def verify_tree(root, files):
    check_parents(root)
    need(stat.S_ISDIR(plain_stat(root).st_mode), f'Not a package directory: {root}')
    found = {}
    def scan(base):
        for path in base.iterdir():
            name = path.relative_to(root).as_posix()
            s = plain_stat(path)
            if stat.S_ISDIR(s.st_mode):
                found[name] = 'dir'
                scan(path)
            else:
                need(stat.S_ISREG(s.st_mode) and name in files, f'Unexpected file: {path}')
                meta = files[name]
                b = bounded_read(path,MAX_FILE)
                need(len(b) == meta['bytes'] and digest(b) == meta['sha256'], f'Extracted content changed: {path}')
                need(os.name == 'nt' or stat.S_IMODE(s.st_mode) == meta['mode'], f'Extracted mode changed: {path}')
                found[name] = 'file'
    scan(root)
    need(found == path_inventory((p,'file') for p in files), f'Extracted inventory mismatch: {root}')


def package_index(lock):
    return {'schemaVersion':1,'packages':[{k: row[k] for k in ('name','version','location','archiveSha256','files')} for row in lock['packages']]}


def run(lock, action):
    packages = CACHE/'packages'
    index = CACHE/'package-index.json'
    loaded = []
    for row in lock['packages']:
        archive = CACHE/'archives'/(row['archiveSha256']+'.tgz')
        if action == 'check-public' or (action == 'fetch' and not os.path.lexists(archive)):
            raw = download(row['url'], row['name'],row['version'])
        else:
            need(os.path.lexists(archive), f'Missing locked archive {row["location"]}; run --fetch or seed the exact cache object')
            raw = bounded_read(archive)
        payload = verify_archive(raw,row)
        loaded.append((row, archive, raw, payload))
        if action == 'check-public':
            print(f'Public URL and hashes verified: {row["name"]}@{row["version"]}',flush=True)
    if action == 'check-public':
        return
    expected_index = package_index(lock)
    # A completed snapshot is verified, not overwritten. Partial tree output is never reused.
    if os.path.lexists(index):
        need(read_json(bounded_read(index)) == expected_index, 'Local package index disagrees with public lock')
        roots = {row['location'].split('/')[0] for row in lock['packages']}
        need(stat.S_ISDIR(plain_stat(packages).st_mode), 'Package root is not a directory')
        need({x.name for x in packages.iterdir()} == roots, 'Unexpected root package entries')
        for scope in (k for k in roots if k.startswith('@')):
            need(stat.S_ISDIR(plain_stat(packages/scope).st_mode), 'Scope root is not a directory')
            need({x.name for x in (packages/scope).iterdir()} == {row['location'].split('/')[1] for row in lock['packages'] if row['location'].startswith(scope+'/')}, 'Unexpected scoped package entries')
        for row in lock['packages']:
            verify_tree(packages/row['location'],row['files'])
    else:
        need(action != 'verify', 'No completed input snapshot; run --offline or --fetch')
        need(not os.path.lexists(packages), 'Partial input tree exists; preserve it separately before starting fresh')
        for row, archive, raw, payload in loaded:
            if not os.path.lexists(archive):
                write_new(archive,raw)
        mkdir(CACHE)
        packages.mkdir()
        for row, _, _, payload in loaded:
            dest = packages/row['location']
            for name, b in payload.items():
                write_new(dest/name,b,row['files'][name]['mode'])
            verify_tree(dest,row['files'])
        write_new(index,encoded(expected_index))
    print(f'Verified {len(loaded)} package archives and {sum(len(row["files"]) for row in lock["packages"])} files')


def main():
    cli = argparse.ArgumentParser(description=__doc__)
    actions = cli.add_mutually_exclusive_group(required=True)
    for action in ('fetch','offline','verify','check-public'):
        actions.add_argument('--'+action,dest='action',action='store_const',const=action)
    args = cli.parse_args()
    try:
        run(load_lock(),args.action)
    except urllib.error.HTTPError as e:
        print(f'Locked public tarball returned HTTP {e.code}: {e.url}',file=sys.stderr)
        return 1
    except (ValueError, OSError, tarfile.TarError, RuntimeError) as e:
        print(f'Input verification refused: {e}',file=sys.stderr)
        return 1
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
