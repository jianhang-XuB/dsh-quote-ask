/**
 * One idempotent <style> element, built on DSH Web design tokens so the card
 * tracks the active theme instead of hard-coding colors. The trailing fallbacks
 * only engage if a token is renamed upstream.
 */
const STYLE_ID = 'dsh-quote-ask-style'
const STYLE_VERSION = '0.1.2'

const CSS = `
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
`

export function ensureStyles() {
	const head = document.head
	if (head === null || typeof head.appendChild !== 'function') return
	const existing = document.getElementById(STYLE_ID)
	if (existing !== null) {
		if (existing.getAttribute('data-dsh-quote-ask-version') === STYLE_VERSION) return
		existing.remove()
	}
	const style = document.createElement('style')
	style.id = STYLE_ID
	style.setAttribute('data-dsh-quote-ask-version', STYLE_VERSION)
	style.textContent = CSS
	head.appendChild(style)
}
