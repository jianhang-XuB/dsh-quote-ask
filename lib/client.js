window.__ModuleLoader__.load({
	id: "dsh-quote-ask",
	factory: (require) => {
		var module = { exports: {} };
		var exports = module.exports;

var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name2 in all)
    __defProp(target, name2, { get: all[name2], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/client/index.jsx
var index_exports = {};
__export(index_exports, {
  apply: () => apply,
  inject: () => inject,
  name: () => name
});
module.exports = __toCommonJS(index_exports);

// src/client/quote.js
var SOURCE = "quote-ask";
var LOCALE_NS = "quote-ask";
var MAX_CHARS = 2e4;
var DICT = {
  zh: {
    chip: "\u5F15\u7528",
    "button.title": "\u5F15\u7528\u9009\u4E2D\u5185\u5BB9\uFF0C\u7136\u540E\u5728\u8F93\u5165\u6846\u91CC\u9488\u5BF9\u5B83\u63D0\u95EE",
    "card.kind": "\u5F15\u7528",
    "role.user": "\u6211\u7684\u63D0\u95EE",
    "role.assistant": "\u52A9\u624B",
    "role.unknown": "\u5BF9\u8BDD",
    turn: "\u7B2C {n} \u8F6E",
    expand: "\u5C55\u5F00\u5168\u6587",
    collapse: "\u6536\u8D77",
    remove: "\u5220\u9664\u8FD9\u6761\u5F15\u7528",
    truncated: "\u5DF2\u622A\u65AD",
    "notice.busy": "\u8F93\u5165\u6846\u6B63\u5FD9\uFF0C\u7A0D\u540E\u518D\u5F15\u7528",
    "notice.failed": "\u5F15\u7528\u672A\u80FD\u63D2\u5165\uFF0C\u8BF7\u91CD\u8BD5",
    "notice.select-first": "\u5148\u5212\u9009\u8981\u5F15\u7528\u7684\u6587\u5B57\uFF0C\u518D\u70B9\u8FD9\u4E2A\u6309\u94AE"
  },
  en: {
    chip: "Quote",
    "button.title": "Quote the selection, then ask about it in the composer",
    "card.kind": "Quote",
    "role.user": "my message",
    "role.assistant": "assistant",
    "role.unknown": "conversation",
    turn: "turn {n}",
    expand: "Show all",
    collapse: "Collapse",
    remove: "Remove this quote",
    truncated: "truncated",
    "notice.busy": "The composer is busy; try quoting again shortly",
    "notice.failed": "The quote could not be inserted; please retry",
    "notice.select-first": "Select the text you want to quote, then press this button"
  }
};
var fallbackT = (key) => DICT.en[key] ?? key;
var activeT = fallbackT;
var tListeners = /* @__PURE__ */ new Set();
var getT = () => activeT;
function setT(next) {
  activeT = typeof next === "function" ? next : fallbackT;
  for (const listener of tListeners) listener();
}
function subscribeT(listener) {
  tListeners.add(listener);
  return () => tListeners.delete(listener);
}
var validTurn = (value) => Number.isSafeInteger(value) && value >= 0;
function makePayload(text, role, turn, messageId) {
  let body = String(text ?? "");
  let truncated = false;
  if (body.length > MAX_CHARS) {
    body = body.slice(0, MAX_CHARS);
    truncated = true;
  }
  return {
    text: body,
    role: role === "user" || role === "assistant" ? role : null,
    turn: validTurn(turn) ? turn : null,
    messageId: typeof messageId === "string" && messageId !== "" ? messageId : null,
    truncated
  };
}
function decode(ref) {
  try {
    const value = JSON.parse(ref);
    if (value === null || typeof value !== "object" || typeof value.text !== "string") return null;
    return {
      text: value.text,
      role: value.role === "user" || value.role === "assistant" ? value.role : null,
      turn: validTurn(value.turn) ? value.turn : null,
      messageId: typeof value.messageId === "string" ? value.messageId : null,
      truncated: value.truncated === true
    };
  } catch {
    return null;
  }
}
var roleLabel = (role, t) => role === "user" ? t("role.user") : role === "assistant" ? t("role.assistant") : t("role.unknown");
function frame(payload, t) {
  const meta = [t("card.kind"), roleLabel(payload.role, t)];
  if (payload.turn !== null) meta.push(t("turn").replace("{n}", String(payload.turn)));
  if (payload.truncated) meta.push(t("truncated"));
  const lines = payload.text.split("\n").map((line) => `> ${line}`.trimEnd());
  return `> [${meta.join(" \xB7 ")}]
${lines.join("\n")}

`;
}
function registerLocale(ctx) {
  const restore = () => setT(fallbackT);
  try {
    const locale = typeof ctx?.get === "function" ? ctx.get("locale") : null;
    if (typeof locale?.register === "function" && typeof locale?.bind === "function") {
      const unregister = locale.register(LOCALE_NS, DICT);
      const adopt = () => setT(locale.bind(LOCALE_NS));
      adopt();
      const unsubscribe = typeof locale.subscribe === "function" ? locale.subscribe(adopt) : null;
      return {
        dispose: () => {
          if (typeof unsubscribe === "function") unsubscribe();
          if (typeof unregister === "function") unregister();
          restore();
        }
      };
    }
  } catch (error) {
    console.warn("[dsh-quote-ask] locale unavailable; using English copy", error);
  }
  restore();
  return { dispose: restore };
}

// src/client/bridge.js
var pluginCtx = null;
var setContext = (ctx) => {
  pluginCtx = ctx;
};
var clearContext = () => {
  pluginCtx = null;
};
var TRANSCRIPT_SELECTOR = '[data-slot="conversation.session"]';
var elementOf = (node) => node === null || node === void 0 ? null : node.nodeType === 1 ? node : node.parentElement ?? null;
var identities = /* @__PURE__ */ new WeakMap();
function registerIdentity(element, identity) {
  if (element === null || element === void 0) return () => {
  };
  identities.set(element, identity);
  return () => identities.delete(element);
}
var FLOW_KIND_ROLES = { user: "user", steering: "user", "assistant-step": "assistant" };
function domIdentity(start, transcript) {
  let role = null;
  let turn = null;
  let element = start;
  while (element !== null && element !== transcript) {
    if (role === null) {
      const kind = element.getAttribute?.("data-chat-flow-kind");
      if (typeof kind === "string" && FLOW_KIND_ROLES[kind] !== void 0) role = FLOW_KIND_ROLES[kind];
    }
    if (turn === null) {
      const raw = element.getAttribute?.("data-chat-turn");
      if (typeof raw === "string" && raw !== "") {
        const value = Number(raw);
        if (Number.isSafeInteger(value) && value >= 0) turn = value;
      }
    }
    if (role !== null && turn !== null) break;
    element = element.parentElement;
  }
  return { role, turn, messageId: null };
}
function identityAt(node) {
  const start = elementOf(node);
  if (start === null) return { role: null, turn: null, messageId: null };
  const transcript = start.closest?.(TRANSCRIPT_SELECTOR) ?? null;
  let element = start;
  while (element !== null && element !== transcript) {
    const hit = identities.get(element);
    if (hit !== void 0) return hit;
    element = element.parentElement;
  }
  return domIdentity(start, transcript);
}
function scopeFor(sessionId) {
  const sessions = typeof pluginCtx?.get === "function" ? pluginCtx.get("sessions") : null;
  if (sessions === null || sessions === void 0) return null;
  if (sessionId === void 0 || sessionId === null) return null;
  if (typeof sessions.binding === "function") return sessions.binding(sessionId)?.ctx ?? null;
  return sessions.scope?.(sessionId) ?? null;
}
function inputFor(sessionId) {
  const scope = scopeFor(sessionId);
  if (scope === null) return null;
  const conversation = scope.get?.("conversation");
  if (typeof conversation?.input?.for !== "function") return null;
  try {
    return conversation.input.for(scope) ?? null;
  } catch (error) {
    console.warn("[dsh-quote-ask] scoped composer unavailable", error);
    return null;
  }
}
function detectLength(state) {
  const chips = state.occurrences ?? [];
  return state.draft.length - chips.reduce((extra, occ) => extra + Math.max(0, occ.length - 1), 0);
}
function quoteRef(payload, t) {
  return {
    source: SOURCE,
    ref: JSON.stringify(payload),
    // The card above the composer carries the content; the chip is only a marker.
    label: t("chip"),
    appearance: "session",
    clipboardText: frame(payload, t)
  };
}
function appendQuote(sessionId, payload, t) {
  const input = inputFor(sessionId);
  if (input === null) return { ok: false, reason: "no-composer" };
  const state = input.state?.getSnapshot?.();
  if (state === void 0 || typeof state.draftRev !== "number" || typeof input.insertReference !== "function") {
    return { ok: false, reason: "no-composer" };
  }
  if (state.phase !== "plain" && state.phase !== "claimed") return { ok: false, reason: "busy" };
  const end = detectLength(state);
  if (!Number.isSafeInteger(end) || end < 0) return { ok: false, reason: "rejected" };
  const lead = end > 0 && !/\s/u.test(state.draft.slice(-1)) ? " " : "";
  try {
    if (lead !== "" && input.insertText(lead, { start: end, end, draftRev: state.draftRev }) !== true) {
      return { ok: false, reason: "rejected" };
    }
    const current = input.state.getSnapshot();
    const at = end + lead.length;
    const inserted = input.insertReference(quoteRef(payload, t), { start: at, end: at, draftRev: current.draftRev });
    if (inserted && typeof input.focus === "function") input.focus();
    return inserted ? { ok: true } : { ok: false, reason: "rejected" };
  } catch (error) {
    console.warn("[dsh-quote-ask] quote insertion failed", error);
    return { ok: false, reason: "rejected" };
  }
}
function removeQuote(sessionId, occurrenceId) {
  const input = inputFor(sessionId);
  if (input === null) return false;
  const state = input.state?.getSnapshot?.();
  if (state === void 0 || typeof state.draftRev !== "number") return false;
  const all = state.occurrences ?? [];
  const target = all.find((occ) => occ.occurrenceId === occurrenceId && occ.source === SOURCE);
  if (target === void 0) return false;
  let detect = target.offset;
  for (const other of all) {
    if (other.offset < target.offset) detect -= Math.max(0, other.length - 1);
  }
  try {
    return input.insertText("", { start: detect, end: detect + 1, draftRev: state.draftRev }) === true;
  } catch (error) {
    console.warn("[dsh-quote-ask] quote removal failed", error);
    return false;
  }
}
function registerCodec(ctx, getT2) {
  try {
    const inputTriggers = typeof ctx?.get === "function" ? ctx.get("inputTriggers") : null;
    if (typeof inputTriggers?.registerSource !== "function") return () => {
    };
    const project = (ref) => {
      const payload = decode(ref);
      return payload === null ? "" : frame(payload, getT2());
    };
    const unregister = inputTriggers.registerSource({
      trigger: "@",
      name: SOURCE,
      order: 1e3,
      // Codec-only source: it owns quote chips but adds no `@` candidates.
      candidates: () => Promise.resolve([]),
      onPick: () => {
      },
      codec: {
        clipboardText: project,
        serialize: (ref) => Promise.resolve(project(ref))
      }
    });
    return typeof unregister === "function" ? unregister : () => {
    };
  } catch (error) {
    console.warn("[dsh-quote-ask] codec unavailable; quotes would degrade to plain text", error);
    return () => {
    };
  }
}
function currentSelection() {
  const selection = document.getSelection?.();
  if (selection === null || selection === void 0 || selection.isCollapsed || selection.rangeCount === 0) return null;
  const text = selection.toString();
  if (text.trim() === "") return null;
  const range = selection.getRangeAt(0);
  const start = elementOf(range.startContainer);
  const end = elementOf(range.endContainer);
  if (start === null || end === null) return null;
  const transcript = start.closest?.(TRANSCRIPT_SELECTOR) ?? null;
  if (transcript === null || end.closest?.(TRANSCRIPT_SELECTOR) !== transcript) return null;
  const rect = range.getBoundingClientRect();
  if (rect.width === 0 && rect.height === 0) return null;
  return { text: text.trim(), rect, range: range.cloneRange(), ...identityAt(range.startContainer) };
}

// src/client/styles.js
var STYLE_ID = "dsh-quote-ask-style";
var STYLE_VERSION = "0.1.2";
var CSS = `
/*
  Alignment with the composer card.
  ---------------------------------
  This slot ('conversation.input.dock') is a bare full-width flex column with no
  horizontal padding, whereas the composer card lives inside InputBar's root:

      .InputBar_root { padding: 0 var(--dsh-composer-side-clearance) 4px }
      .InputBar_card { width: 100%; max-width: var(--dsh-composer-card-max-width) }

  So dock entries have to reproduce that inset themselves, or they stretch across
  the whole column. This mirrors the shipped recipe exactly.
*/
.dsh-qa-zone {
  box-sizing: border-box;
  width: 100%;
  padding: 0 var(--dsh-composer-side-clearance, 16px);
  display: flex;
  flex-direction: column;
  align-items: center;
}
.dsh-qa-stack {
  width: 100%;
  max-width: var(--dsh-composer-card-max-width, 952px);
  display: flex;
  flex-direction: column;
  /* The composer stack already spaces its children; adding a margin would double it. */
  gap: var(--dsh-composer-stack-gap, 6px);
}
.dsh-qa-card {
  position: relative;
  /*
    --dsw-radius-lg (16px), not the composer card's --dsw-radius-panel (28px):
    this card is only ~3 lines tall, so 28px would let the corners dominate, and it
    would squeeze the left accent bar down to a short stub in the middle.
  */
  border-radius: var(--dsw-radius-lg, 16px);
  border-left: 2px solid var(--dsw-alias-border-l2, rgba(128, 128, 140, .55));
  background: var(--dsw-alias-bg-base-secondary, rgba(128, 128, 140, .10));
  padding: 8px 10px 8px 12px;
  font-family: var(--dsw-font-family, system-ui);
  font-size: 12px;
  line-height: 17px;
  color: var(--dsw-alias-label-secondary, inherit);
}
.dsh-qa-head {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 3px;
}
.dsh-qa-kind {
  flex: 1 1 auto;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 11px;
  line-height: 15px;
  opacity: .72;
}
.dsh-qa-tools {
  flex: 0 0 auto;
  display: inline-flex;
  align-items: center;
  gap: 4px;
}
/* Comfortable hit targets: these are small controls in a dense row, and missing
   them is the usual complaint. 22px tall, generous horizontal padding. */
.dsh-qa-btn {
  border: none;
  background: transparent;
  color: inherit;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 22px;
  padding: 0 8px;
  border-radius: 5px;
  font: inherit;
  font-size: 12px;
  line-height: 22px;
  opacity: .72;
}
.dsh-qa-btn:hover { opacity: 1; background: var(--dsw-alias-interactive-bg-hover, rgba(128, 128, 140, .18)); }
.dsh-qa-remove {
  font-size: 18px;
  line-height: 20px;
  padding: 0 9px;
  min-width: 26px;
}
.dsh-qa-body {
  white-space: pre-wrap;
  word-break: break-word;
  opacity: .92;
}
.dsh-qa-float {
  position: fixed;
  z-index: 2147483600;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  height: 28px;
  padding: 0 12px;
  border: none;
  border-radius: 14px;
  background: var(--dsw-alias-button-primary-fill, rgba(56, 56, 62, .94));
  color: var(--dsw-alias-label-primary-foreground, #f5f5f7);
  font-family: var(--dsw-font-family, system-ui);
  font-size: 12px;
  line-height: 18px;
  white-space: nowrap;
  cursor: pointer;
  box-shadow: var(--dsw-shadow-lv3, 0 2px 10px rgba(0, 0, 0, .28));
  user-select: none;
  animation: dsh-qa-pop .12s var(--ds-ease-in-out, ease);
}
.dsh-qa-float:hover { background: var(--dsw-alias-button-primary-hover, rgba(72, 72, 80, .96)); }
.dsh-qa-float:active { filter: brightness(.92); }
.dsh-qa-float:focus-visible { outline: 2px solid var(--dsw-alias-text-accent, #4c9aff); outline-offset: 1px; }
.dsh-qa-notice {
  position: fixed;
  z-index: 2147483600;
  left: 50%;
  bottom: 24px;
  transform: translateX(-50%);
  max-width: min(90vw, 480px);
  padding: 8px 12px;
  border-radius: 8px;
  background: var(--dsw-alias-button-primary-fill, rgba(56, 56, 62, .94));
  color: var(--dsw-alias-label-primary-foreground, #f5f5f7);
  font-family: var(--dsw-font-family, system-ui);
  font-size: 12px;
  pointer-events: none;
}
@keyframes dsh-qa-pop {
  from { opacity: 0; transform: translateY(3px); }
  to { opacity: 1; transform: none; }
}
`;
function ensureStyles() {
  const head = document.head;
  if (head === null || typeof head.appendChild !== "function") return;
  const existing = document.getElementById(STYLE_ID);
  if (existing !== null) {
    if (existing.getAttribute("data-dsh-quote-ask-version") === STYLE_VERSION) return;
    existing.remove();
  }
  const style = document.createElement("style");
  style.id = STYLE_ID;
  style.setAttribute("data-dsh-quote-ask-version", STYLE_VERSION);
  style.textContent = CSS;
  head.appendChild(style);
}

// src/client/components.jsx
var import_react = require("react");
var import_react_dom = require("react-dom");
var import_jsx_runtime = require("react/jsx-runtime");
function useTranslate() {
  const [, bump] = (0, import_react.useState)(0);
  (0, import_react.useEffect)(() => subscribeT(() => bump((n) => n + 1)), []);
  return getT();
}
function useNotice() {
  const [notice, setNotice] = (0, import_react.useState)(null);
  const timer = (0, import_react.useRef)(null);
  const show = (0, import_react.useCallback)((text) => {
    if (timer.current !== null) window.clearTimeout(timer.current);
    setNotice(text);
    timer.current = window.setTimeout(() => {
      timer.current = null;
      setNotice(null);
    }, 3200);
  }, []);
  (0, import_react.useEffect)(
    () => () => {
      if (timer.current !== null) window.clearTimeout(timer.current);
    },
    []
  );
  return [notice, show];
}
function Notice({ text }) {
  if (text === null) return null;
  return (0, import_react_dom.createPortal)(/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "dsh-qa-notice", children: text }), document.body);
}
function QuoteCard({ sessionId, occurrence, onNotice }) {
  const t = useTranslate();
  const [open, setOpen] = (0, import_react.useState)(false);
  const payload = (0, import_react.useMemo)(() => decode(occurrence.ref), [occurrence.ref]);
  if (payload === null) return null;
  const lines = payload.text.split("\n");
  const clipped = !open && lines.length > 3;
  const meta = [t("card.kind"), roleLabel(payload.role, t)];
  if (payload.turn !== null) meta.push(t("turn").replace("{n}", String(payload.turn)));
  if (payload.truncated) meta.push(t("truncated"));
  return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "dsh-qa-card", children: [
    /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "dsh-qa-head", children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "dsh-qa-kind", children: meta.join(" \xB7 ") }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { className: "dsh-qa-tools", children: [
        lines.length > 3 ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", { type: "button", className: "dsh-qa-btn", onClick: () => setOpen((v) => !v), children: open ? t("collapse") : t("expand") }) : null,
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
          "button",
          {
            type: "button",
            className: "dsh-qa-btn dsh-qa-remove",
            title: t("remove"),
            onClick: () => {
              if (!removeQuote(sessionId, occurrence.occurrenceId)) onNotice(t("notice.failed"));
            },
            children: "\xD7"
          }
        )
      ] })
    ] }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "dsh-qa-body", children: [
      open ? payload.text : lines.slice(0, 3).join("\n"),
      clipped ? "\u2026" : ""
    ] })
  ] });
}
var FLOAT_WIDTH = 84;
var FLOAT_HEIGHT = 28;
var FLOAT_GAP = 6;
var OUR_UI = ".dsh-qa-float, .dsh-qa-btn, .dsh-qa-card, .dsh-qa-notice";
function placeAbove(rect) {
  let x = rect.left + rect.width / 2 - FLOAT_WIDTH / 2;
  let y = rect.top - FLOAT_HEIGHT - FLOAT_GAP;
  if (y < 4) y = rect.bottom + FLOAT_GAP;
  x = Math.max(4, Math.min(x, window.innerWidth - FLOAT_WIDTH - 4));
  return { left: `${Math.round(x)}px`, top: `${Math.round(y)}px` };
}
function FloatingQuote({ sessionId, onNotice }) {
  const t = useTranslate();
  const [pending, setPending] = (0, import_react.useState)(null);
  const dragging = (0, import_react.useRef)(false);
  (0, import_react.useEffect)(() => {
    const ours = (target) => target instanceof Element && target.closest(OUR_UI) !== null;
    const onMouseDown = (event) => {
      if (ours(event.target)) return;
      dragging.current = true;
      setPending(null);
    };
    const onMouseUp = (event) => {
      if (!dragging.current) return;
      dragging.current = false;
      if (ours(event.target)) return;
      setPending(currentSelection());
    };
    const onBlur = () => {
      dragging.current = false;
    };
    const onKeyDown = (event) => {
      if (event.key === "Escape") setPending(null);
    };
    const onScroll = () => setPending(null);
    document.addEventListener("mousedown", onMouseDown, true);
    document.addEventListener("mouseup", onMouseUp, true);
    document.addEventListener("keydown", onKeyDown, true);
    window.addEventListener("scroll", onScroll, true);
    window.addEventListener("blur", onBlur);
    return () => {
      document.removeEventListener("mousedown", onMouseDown, true);
      document.removeEventListener("mouseup", onMouseUp, true);
      document.removeEventListener("keydown", onKeyDown, true);
      window.removeEventListener("scroll", onScroll, true);
      window.removeEventListener("blur", onBlur);
    };
  }, []);
  if (pending === null) return null;
  return (0, import_react_dom.createPortal)(
    /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(
      "button",
      {
        type: "button",
        className: "dsh-qa-float",
        style: placeAbove(pending.rect),
        title: t("button.title"),
        onMouseDown: (event) => event.preventDefault(),
        onClick: () => {
          const payload = makePayload(pending.text, pending.role, pending.turn, pending.messageId);
          const result = appendQuote(sessionId, payload, t);
          setPending(null);
          if (!result.ok) onNotice(result.reason === "busy" ? t("notice.busy") : t("notice.failed"));
        },
        children: [
          "\u2750 ",
          t("chip")
        ]
      }
    ),
    document.body
  );
}
function QuoteDock({ sessionId, input }) {
  const t = useTranslate();
  const [notice, showNotice] = useNotice();
  const occurrences = (0, import_react.useMemo)(
    () => (input?.occurrences ?? []).filter((occ) => occ.source === SOURCE),
    [input]
  );
  return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
    occurrences.length > 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "dsh-qa-zone", children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "dsh-qa-stack", children: occurrences.map((occ) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
      QuoteCard,
      {
        sessionId,
        occurrence: occ,
        onNotice: showNotice
      },
      occ.occurrenceId
    )) }) }) : null,
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)(FloatingQuote, { sessionId, onNotice: showNotice }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Notice, { text: notice })
  ] });
}
function QuoteAction({ sessionId, messageId }) {
  const t = useTranslate();
  const host = (0, import_react.useRef)(null);
  const [notice, showNotice] = useNotice();
  (0, import_react.useEffect)(() => {
    const element = host.current;
    if (element === null) return void 0;
    const container = element.closest("[data-chat-flow-kind]") ?? element.parentElement;
    return registerIdentity(container, {
      role: "assistant",
      turn: turnOf(container),
      messageId: typeof messageId === "string" ? messageId : null
    });
  }, [messageId]);
  return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
    /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(
      "button",
      {
        ref: host,
        type: "button",
        className: "dsh-qa-btn",
        title: t("button.title"),
        onMouseDown: (event) => event.preventDefault(),
        onClick: () => {
          const selection = currentSelection();
          if (selection === null) {
            showNotice(t("notice.select-first"));
            return;
          }
          const payload = makePayload(selection.text, selection.role ?? "assistant", selection.turn, selection.messageId ?? messageId);
          const result = appendQuote(sessionId, payload, t);
          if (!result.ok) showNotice(result.reason === "busy" ? t("notice.busy") : t("notice.failed"));
        },
        children: [
          "\u2750 ",
          t("chip")
        ]
      }
    ),
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Notice, { text: notice })
  ] });
}
function turnOf(element) {
  let node = element;
  while (node !== null) {
    const raw = node.getAttribute?.("data-chat-turn");
    if (typeof raw === "string" && raw !== "") {
      const value = Number(raw);
      if (Number.isSafeInteger(value) && value >= 0) return value;
    }
    node = node.parentElement;
  }
  return null;
}

// src/client/index.jsx
var name = "quote-ask";
var inject = ["slots", "sessions", "locale", "inputTriggers"];
function apply(ctx) {
  setContext(ctx);
  ensureStyles();
  const locale = registerLocale(ctx);
  const disposeCodec = registerCodec(ctx, getT);
  const disposers = [
    ctx.slots.inject(
      "conversation.input.dock",
      () => ctx.slots.register(
        { name: "conversation.input.dock", id: "quote-ask", order: 90, registrant: "dsh-quote-ask" },
        QuoteDock
      )
    ),
    ctx.slots.inject(
      "conversation.chat.assistant-actions",
      () => ctx.slots.register(
        {
          name: "conversation.chat.assistant-actions",
          id: "quote-ask",
          order: 90,
          registrant: "dsh-quote-ask"
        },
        QuoteAction
      )
    )
  ];
  ctx.effect(
    () => () => {
      for (const dispose of disposers) {
        if (typeof dispose === "function") dispose();
      }
      disposeCodec();
      locale.dispose();
      clearContext();
    },
    "dsh-quote-ask: teardown"
  );
}

		return module.exports;
	}
});
