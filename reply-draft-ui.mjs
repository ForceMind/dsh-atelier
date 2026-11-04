// rc5 composer API only: never setDraft(), submit(), or mutate the editor DOM.
export function replyDraftInputEmpty(input) {
  return !!input && input.draft === '' && input.phase === 'plain' && !input.claim
    && Array.isArray(input.attachmentIds) && input.attachmentIds.length === 0
    && Array.isArray(input.occurrences) && input.occurrences.length === 0;
}
export function replyDraftSessionReady(session) {
  return !!session && session.openState === 'open' && !session.running && !session.removed
    && Array.isArray(session.pendingSubmissions) && session.pendingSubmissions.length === 0;
}
export function replyDraftCanApply(before, after) {
  return before.sessionId === after.sessionId && before.actions === after.actions
    && before.session === after.session && before.editor === after.editor
    && before.touch === after.touch && before.epoch === after.epoch && after.editable && !after.composing
    && replyDraftSessionReady(after.session) && replyDraftInputEmpty(after.input)
    && before.input.draftRev === after.input.draftRev
    // Attachments do not advance draftRev. Identity also catches add/remove churn.
    && before.input.attachmentIds === after.input.attachmentIds;
}
export async function generateReplyDraft({ read, call }) {
  const before = read();
  if (!replyDraftInputEmpty(before.input) || !replyDraftSessionReady(before.session)
    || !before.editable || before.composing || !before.sessionId
    || typeof before.actions?.captureInsertion !== 'function' || typeof before.actions?.insertText !== 'function') {
    return { kind: 'blocked' };
  }
  const span = before.actions.captureInsertion();
  if (span.start !== 0 || span.end !== 0 || span.draftRev !== before.input.draftRev) return { kind: 'blocked' };
  const result = await call('reply-draft', { sessionId: before.sessionId });
  if (!result || typeof result.text !== 'string' || !result.text.trim() || result.reasoningEffort !== 'off') {
    throw new Error('Invalid reply draft response');
  }
  // No await between the extra attachment/composition/session checks and CAS.
  if (!replyDraftCanApply(before, read()) || !before.actions.insertText(result.text, span)) return { kind: 'manual', ...result };
  return { kind: 'inserted', ...result };
}

// Read-only observation scoped to this button's composer; IME is not in InputState.
export function observeReplyDraftEditor(editor, changed, { now = Date.now, Observer = globalThis.MutationObserver } = {}) {
  let touch = 0, composing = false, composingUntil = 0, active = true, timer;
  const notify = () => { touch += 1; changed(); };
  const start = () => { clearTimeout(timer); composing = true; notify(); };
  const end = () => {
    composing = false; composingUntil = now() + 10; notify();
    clearTimeout(timer); timer = setTimeout(() => { if (active) changed(); }, 11);
  };
  const edits = ['beforeinput', 'input', 'paste', 'drop', 'cut'], capture = { capture: true };
  editor.addEventListener('compositionstart', start, capture);
  editor.addEventListener('compositionend', end, capture);
  for (const type of edits) editor.addEventListener(type, notify, capture);
  const observer = Observer ? new Observer(notify) : null;
  observer?.observe(editor, { attributes: true, attributeFilter: ['data-composer-composing', 'contenteditable'] });
  return {
    read: () => ({ editor, touch, editable: active && editor.isConnected && editor.isContentEditable,
      composing: composing || now() < composingUntil || editor.hasAttribute('data-composer-composing') }),
    dispose() {
      active = false; clearTimeout(timer); observer?.disconnect();
      editor.removeEventListener('compositionstart', start, capture);
      editor.removeEventListener('compositionend', end, capture);
      for (const type of edits) editor.removeEventListener(type, notify, capture);
    },
  };
}

export function installReplyDraft(ctx, React, call) {
  const h = React.createElement;
  function ReplyDraft(props) {
    React.useSyncExternalStore(fn => ctx.locale.subscribe(fn), () => ctx.locale.getSnapshot());
    const zh = ctx.locale.getSnapshot().active.startsWith('zh');
    const t = (cn, en) => zh ? cn : en;
    const anchor = React.useRef(null), editorWatch = React.useRef(null), live = React.useRef({});
    const request = React.useRef(0), mounted = React.useRef(false), inFlight = React.useRef(false);
    const [busy, setBusy] = React.useState(false), [message, setMessage] = React.useState('');
    const [manual, setManual] = React.useState(null), [, rerender] = React.useState(0);
    // Stable selectors see source notifications before React commits.
    const selectInput = React.useCallback(input => { live.current.input = input; return input; }, []);
    const selectSession = React.useCallback(session => { live.current.session = session; return session; }, []);
    const input = props.useInput(selectInput), session = props.useSession(selectSession);
    live.current = { ...live.current, sessionId: props.sessionId, actions: props.inputActions, input, session };
    React.useLayoutEffect(() => {
      mounted.current = true; request.current += 1; inFlight.current = false; setBusy(false); setManual(null); setMessage('');
      const editor = anchor.current?.closest('[data-composer-card]')?.querySelector('[data-composer-input]');
      editorWatch.current = editor ? observeReplyDraftEditor(editor, () => { if (mounted.current) rerender(n => n + 1); }) : null;
      rerender(n => n + 1);
      return () => { mounted.current = false; request.current += 1; editorWatch.current?.dispose(); editorWatch.current = null; };
    }, [props.sessionId, props.inputActions]);
    const read = () => ({ ...live.current, ...(editorWatch.current?.read() ?? { editable: false, composing: true }), epoch: request.current });
    const state = read();
    const disabled = busy || !replyDraftInputEmpty(input) || !replyDraftSessionReady(session)
      || !state.editable || state.composing || typeof props.inputActions?.insertText !== 'function';
    async function generate() {
      if (inFlight.current) return;
      inFlight.current = true;
      const seq = ++request.current; setBusy(true); setMessage(''); setManual(null);
      try {
        const result = await generateReplyDraft({ read, call });
        if (!mounted.current || seq !== request.current) return;
        if (result.kind === 'manual') { setManual(result); setMessage(t('输入已变化，未填入。请手动复制草稿。', 'Input changed; nothing was inserted. Copy the draft manually.')); }
        else if (result.kind === 'inserted') setMessage(t('草稿已填入，未发送。', 'Draft inserted, not sent.'));
        else setMessage(t('请先清空输入和附件，结束输入法编辑后重试。', 'Clear input and attachments and finish IME composition first.'));
      } catch (error) { if (mounted.current && seq === request.current) setMessage(t('生成失败：', 'Generation failed: ') + (error?.message ?? String(error))); }
      finally { if (mounted.current && seq === request.current) { inFlight.current = false; setBusy(false); } }
    }
    const help = t('生成你对助手最后一条消息的简短回复。会发起一次付费模型请求，使用该消息的模型；仅本次请求关闭思考，不改会话设置。只填草稿，不自动发送；已有输入或附件时不可用。', 'Draft your concise reply to the assistant’s last message. Makes one billable request using that message’s model, with thinking off for this request only. Does not change session settings, send, or overwrite input/attachments.');
    return h('span', { ref: anchor, className: 'atelier-reply-draft', 'data-atelier-reply-draft': '' },
      h('style', null, `.atelier-reply-draft{position:relative;display:inline-flex;align-items:center;font:inherit;color:var(--dsw-alias-label-secondary)}.atelier-reply-draft button{font:inherit;color:inherit;background:transparent;border:0;border-radius:6px;padding:5px 7px;cursor:pointer}.atelier-reply-draft button:hover{background:var(--dsw-alias-bg-layer-1)}.atelier-reply-draft button:disabled{opacity:.45;cursor:default}.atelier-reply-draft button:focus-visible,.atelier-reply-draft textarea:focus-visible{outline:2px solid var(--dsw-alias-brand-primary);outline-offset:2px}.atelier-reply-draft-panel{position:absolute;bottom:100%;right:0;z-index:20;width:min(340px,75vw);max-height:50vh;overflow:auto;padding:12px;border:1px solid var(--dsw-alias-border-l1);border-radius:8px;background:var(--dsw-alias-bg-layer-1);color:var(--dsw-alias-label-primary);font-size:12px}.atelier-reply-draft-panel p{margin:0 0 8px}.atelier-reply-draft textarea{box-sizing:border-box;width:100%;min-height:100px;resize:vertical;font:inherit;color:inherit;background:var(--dsw-alias-bg-base);border:1px solid var(--dsw-alias-border-l1);border-radius:4px}.atelier-reply-draft-status{position:absolute;width:1px;height:1px;overflow:hidden;clip-path:inset(50%)}`),
      h('button', { type: 'button', disabled, onClick: generate, title: help, 'aria-label': help, 'aria-busy': busy, 'data-atelier-reply-draft-button': '' }, busy ? t('生成中…', 'Drafting…') : t('回复草稿', 'Reply draft')),
      h('span', { role: 'status', 'aria-live': 'polite', className: 'atelier-reply-draft-status' }, message),
      message && h('section', { className: 'atelier-reply-draft-panel', 'aria-label': t('回复草稿结果', 'Reply draft result') },
        h('p', null, message), manual && h('textarea', { readOnly: true, value: manual.text, 'aria-label': t('手动复制回复草稿', 'Copy reply draft manually'), onFocus: event => event.currentTarget.select() }),
        h('button', { type: 'button', onClick: () => { setMessage(''); setManual(null); } }, t('关闭', 'Dismiss'))));
  }
  return ctx.slots.inject('conversation.input.right', () => ctx.slots.register({ name: 'conversation.input.right', id: 'atelier-reply-draft', order: 40 }, ReplyDraft));
}
