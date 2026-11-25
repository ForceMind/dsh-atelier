"""Offline tests for the upstream archive trust boundary; use python -I -S -B."""
import gzip
import importlib.util
import io
import tarfile
import unittest
from pathlib import Path
from unittest.mock import patch

SPEC = importlib.util.spec_from_file_location('suite_acquire', Path(__file__).with_name('acquire.py'))
a = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(a)


def fixture(entries=(), package=b'{"name":"fixture","version":"1.0.0"}'):
    result = io.BytesIO()
    with tarfile.open(fileobj=result, mode='w', format=tarfile.USTAR_FORMAT) as tar:
        for path, kind, body in [('package/package.json', tarfile.REGTYPE, package), *entries]:
            info = tarfile.TarInfo(path)
            info.type = kind
            info.size = len(body) if kind == tarfile.REGTYPE else 0
            if kind in (tarfile.SYMTYPE, tarfile.LNKTYPE):
                info.linkname = '../outside'
            tar.addfile(info, io.BytesIO(body) if info.size else None)
    return gzip.compress(result.getvalue(), mtime=0)


def inspect(entries):
    return a.inspect_archive(fixture(entries), 'fixture', '1.0.0')


class Acquisition(unittest.TestCase):
    def test_valid_archive_payload_and_normalized_modes(self):
        files, meta = inspect([('package/src/index.js', tarfile.REGTYPE, b'fixture')])
        self.assertEqual(files['src/index.js'], b'fixture')
        self.assertEqual(meta['src/index.js'], {'bytes': 7, 'mode': 0o644, 'sha256': a.digest(b'fixture')})

    def test_path_escape_windows_ads_devices_and_case_collisions(self):
        for path in ['package/../../outside', '/absolute', 'package/c:\\x', 'package/a:stream', 'package/CON.txt',
                     'package/LPT¹.foo', 'package/con .txt', 'package/trailing.', 'package/a\\b', 'package//b', 'package/a/./b']:
            with self.subTest(path=path), self.assertRaises(ValueError):
                inspect([(path, tarfile.REGTYPE, b'x')])
        with self.assertRaisesRegex(ValueError, 'Case/Unicode'):
            inspect([('package/Test/a', tarfile.REGTYPE, b'x'), ('package/test/b', tarfile.REGTYPE, b'x')])
        with self.assertRaisesRegex(ValueError, 'Case/Unicode'):
            a.path_inventory([('é/a','file'),('e\u0301/b','file')])

    def test_links_special_entries_duplicates_conflicts_and_empty_directories(self):
        for kind in (tarfile.SYMTYPE, tarfile.LNKTYPE, tarfile.CHRTYPE, tarfile.FIFOTYPE):
            with self.subTest(kind=kind), self.assertRaises(ValueError):
                inspect([('package/external', kind, b'')])
        for paths in (['package/a','package/a'], ['package/a','package/a/b'], ['package/a/b','package/a']):
            with self.subTest(paths=paths), self.assertRaises(ValueError):
                inspect([(p, tarfile.REGTYPE, b'x') for p in paths])
        with self.assertRaisesRegex(ValueError, 'empty directories'):
            inspect([('package/empty', tarfile.DIRTYPE, b'')])

    def test_bounds_identity_and_strict_json(self):
        raw = fixture()
        with patch.object(a, 'MAX_ARCHIVE', len(raw)-1), self.assertRaisesRegex(ValueError, 'Compressed size'):
            a.inspect_archive(raw, 'fixture','1.0.0')
        with patch.object(a, 'MAX_TAR', 512), self.assertRaisesRegex(ValueError, 'Expanded size'):
            a.inspect_archive(raw, 'fixture','1.0.0')
        with self.assertRaisesRegex(ValueError, 'name/version'):
            a.inspect_archive(raw, 'wrong','1.0.0')
        with self.assertRaisesRegex(ValueError, 'Duplicate JSON key'):
            a.inspect_archive(fixture(package=b'{"name":"fixture","name":"fixture","version":"1.0.0"}'), 'fixture','1.0.0')

    def test_only_exact_tarball_can_reach_network_and_redirects_rejected(self):
        u = a.tarball_url('zod','4.4.3')
        with patch.object(a.urllib.request, 'build_opener') as opener:
            for url in (u + '?token=x', u.replace('https:', 'http:'), u.replace('npmjs.org','invalid'), u.replace('/zod/-/','/zod/%2e/')):
                with self.assertRaisesRegex(ValueError, 'exact pinned'):
                    a.download(url, 'zod','4.4.3')
            with self.assertRaisesRegex(ValueError, 'exact pinned'):
                a.download(a.tarball_url('unlocked','1.0.0'), 'unlocked','1.0.0')
            opener.assert_not_called()
        with self.assertRaisesRegex(ValueError, 'Redirect refused'):
            a.NoRedirect().redirect_request(a.urllib.request.Request(u), None, 302, 'Redirect', None, 'https://example.invalid')

    def test_index_is_exact_projection_and_existing_inputs_verify_offline(self):
        lock = a.load_lock()
        self.assertEqual(len(lock['packages']), 8)
        expected = a.package_index(lock)
        self.assertEqual(a.read_json(a.bounded_read(a.CACHE/'package-index.json')), expected)
        with patch.object(a, 'download', side_effect=AssertionError('unexpected network')), patch.object(a, 'write_new', side_effect=AssertionError('unexpected write')):
            a.run(lock, 'verify')
        row = lock['packages'][0]
        raw = a.bounded_read(a.CACHE/'archives'/(row['archiveSha256'] + '.tgz'))
        with self.assertRaisesRegex(ValueError, 'Archive integrity mismatch'):
            a.verify_archive(raw[:-1] + bytes([raw[-1] ^ 1]),row)
        with self.assertRaisesRegex(ValueError, 'Archive file inventory mismatch'):
            a.verify_archive(raw,{**row,'files':{}})


if __name__ == '__main__':
    unittest.main()
