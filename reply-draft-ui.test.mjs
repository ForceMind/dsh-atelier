import test from 'node:test';
import assert from 'node:assert/strict';
import { generateReplyDraft, observeReplyDraftEditor, replyDraftInputEmpty, installReplyDraft } from './reply-draft-ui.mjs';

function fixture() {
  const inserts = [], calls = [];
  const state = {
    sessionId: 's1', epoch: 1, touch: 0, editable: true, composing: false, editor: {},
    input: { draft: '', attachmentIds: [], draftRev: 2, phase: 'plain', occurrences: [], queue: [] },
    session: { openState: 'open', running: false, removed: false, pendingSubmissions: [] },
    actions: { captureInsertion: () => ({ start: 0, end: 0, draftRev: 2 }), insertText: (...args) => { inserts.push(args); return true; },
      setDraft: () => { throw Error('must never replace'); }, submit: () => { throw Error('must never send'); } },
  };
  let resolve;
  const call = (...args) => { calls.push(args); return new Promise(r => { resolve = r; }); };
  return { state, inserts, calls, start: () => generateReplyDraft({ read: () => ({ ...state }), call }),
    finish: () => resolve({ text: 'Thanks, please continue.', sourceMessageId: 'a1', provider: 'p', model: 'm', reasoningEffort: 'off' }) };
}

test('one explicit paid RPC inserts by captured CAS only, never sends or changes settings', async () => {
  const f = fixture(), promise = f.start();
  assert.deepEqual(f.calls, [['reply-draft', { sessionId: 's1' }]]);
  f.finish(); assert.equal((await promise).kind, 'inserted');
  assert.deepEqual(f.inserts, [['Thanks, please continue.', { start: 0, end: 0, draftRev: 2 }]]);
});

test('nonempty, whitespace, references, attachments, claims, pending send and composition block without RPC', async () => {
  for (const mutate of [
    f => { f.state.input.draft = 'mine'; }, f => { f.state.input.draft = ' '; },
    f => { f.state.input.occurrences = [{}]; }, f => { f.state.input.attachmentIds = ['file']; },
    f => { f.state.input.phase = 'claimed'; }, f => { f.state.input.phase = 'adjudicating'; },
    f => { f.state.session.pendingSubmissions = [{}]; }, f => { f.state.composing = true; },
    f => { f.state.editable = false; }, f => { f.state.session.running = true; },
  ]) { const f = fixture(); mutate(f); assert.equal((await f.start()).kind, 'blocked'); assert.equal(f.calls.length, 0); }
  assert.equal(replyDraftInputEmpty(undefined), false);
});

test('all async races preserve user input and return manual copy draft', async () => {
  for (const mutate of [
    f => { f.state.input = { ...f.state.input, draft: 'typed', draftRev: 3 }; },
    f => { f.state.input = { ...f.state.input, draftRev: 4 }; }, // typed then cleared
    f => { f.state.input = { ...f.state.input, attachmentIds: ['upload'] }; },
    f => { f.state.input = { ...f.state.input, attachmentIds: [] }; }, // add/remove attachment, no revision increment
    f => { f.state.touch += 1; }, f => { f.state.composing = true; },
    f => { f.state.sessionId = 's2'; }, f => { f.state.actions = { ...f.state.actions }; },
    f => { f.state.session = { ...f.state.session }; }, f => { f.state.editor = {}; },
    f => { f.state.epoch += 1; }, f => { f.state.editable = false; },
    f => { f.state.actions.insertText = () => false; }, // actual editor CAS refuses
  ]) { const f = fixture(), promise = f.start(); mutate(f); f.finish();
    const result = await promise; assert.equal(result.kind, 'manual'); assert.equal(result.text, 'Thanks, please continue.'); assert.equal(f.inserts.length, 0); }
});

test('invalid response fails closed without inserting', async () => {
  const f = fixture();
  await assert.rejects(generateReplyDraft({ read: () => ({ ...f.state }), call: async () => ({ text: 'Oops', reasoningEffort: 'high' }) }), /Invalid reply/);
  assert.equal(f.inserts.length, 0);
});

test('IME observation tracks cancelled compositions, DOM attribute and post-end guard; disposes listeners', () => {
  class Editor extends EventTarget { isConnected = true; isContentEditable = true; composing = false;
    hasAttribute(name) { return name === 'data-composer-composing' && this.composing; } }
  const editor = new Editor(); let now = 100, notifications = 0;
  const watch = observeReplyDraftEditor(editor, () => notifications++, { now: () => now, Observer: null });
  const initial = watch.read(); editor.dispatchEvent(new Event('compositionstart'));
  assert.equal(watch.read().composing, true); editor.dispatchEvent(new Event('compositionend'));
  assert.equal(watch.read().composing, true); now += 11; assert.equal(watch.read().composing, false);
  assert.ok(watch.read().touch > initial.touch);
  editor.composing = true; assert.equal(watch.read().composing, true); editor.composing = false;
  editor.dispatchEvent(new Event('beforeinput')); assert.equal(notifications, 3);
  watch.dispose(); assert.equal(watch.read().editable, false);
  editor.dispatchEvent(new Event('input')); assert.equal(notifications, 3);
});

test('installation only registers composer button, performs no network calls', () => {
  let registration, component;
  const ctx = { slots: { inject(name, cb) { assert.equal(name, 'conversation.input.right'); return cb(); },
    register(options, view) { registration = options; component = view; return 'dispose'; } } };
  assert.equal(installReplyDraft(ctx, { createElement() {} }, () => { throw Error('unexpected mount request'); }), 'dispose');
  assert.equal(registration.id, 'atelier-reply-draft'); assert.equal(typeof component, 'function');
});
