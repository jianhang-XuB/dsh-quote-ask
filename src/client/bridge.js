/**
 * The bridge between the plugin and DSH's official input/composer contracts.
 *
 * Two faces exist and they are NOT interchangeable — this was verified against
 * the shipped bundle, not assumed:
 *
 *   inputActions  (standard slot prop)  captureInsertion / insertText / setDraft /
 *                                       addAttachments / removeAttachment /
 *                                       pruneAttachments / submit
 *   SessionInput  (scoped service face) state / insertText / insertReference / focus
 *
 * `inputActions` cannot insert a reference chip, so chip insertion goes through
 * the scoped `conversation` service — the same path the shipped plugins use.
 */
import { SOURCE, decode, frame } from './quote.js'

let pluginCtx = null
export const setContext = (ctx) => {
	pluginCtx = ctx
}
export const clearContext = () => {
	pluginCtx = null
}

export const TRANSCRIPT_SELECTOR = '[data-slot="conversation.session"]'

const elementOf = (node) =>
	node === null || node === undefined ? null : node.nodeType === 1 ? node : (node.parentElement ?? null)

/* ------------------------------------------------------------------ identity */

/**
 * Authoritative identities contributed by official seats, keyed by the DOM
 * element they cover. The action drawn inside an assistant message registers its
 * own container, so a selection inside that message resolves to a real
 * `messageId` instead of a guessed role.
 */
const identities = new WeakMap()

export function registerIdentity(element, identity) {
	if (element === null || element === undefined) return () => {}
	identities.set(element, identity)
	return () => identities.delete(element)
}

/** Fallback vocabulary. `data-chat-flow-kind` is what DSH's own CSS keys off. */
const FLOW_KIND_ROLES = { user: 'user', steering: 'user', 'assistant-step': 'assistant' }

function domIdentity(start, transcript) {
	let role = null
	let turn = null
	let element = start
	while (element !== null && element !== transcript) {
		if (role === null) {
			const kind = element.getAttribute?.('data-chat-flow-kind')
			if (typeof kind === 'string' && FLOW_KIND_ROLES[kind] !== undefined) role = FLOW_KIND_ROLES[kind]
		}
		if (turn === null) {
			const raw = element.getAttribute?.('data-chat-turn')
			if (typeof raw === 'string' && raw !== '') {
				const value = Number(raw)
				if (Number.isSafeInteger(value) && value >= 0) turn = value
			}
		}
		if (role !== null && turn !== null) break
		element = element.parentElement
	}
	return { role, turn, messageId: null }
}

/** Nearest registered identity, else the DOM fallback. */
export function identityAt(node) {
	const start = elementOf(node)
	if (start === null) return { role: null, turn: null, messageId: null }
	const transcript = start.closest?.(TRANSCRIPT_SELECTOR) ?? null
	let element = start
	while (element !== null && element !== transcript) {
		const hit = identities.get(element)
		if (hit !== undefined) return hit
		element = element.parentElement
	}
	return domIdentity(start, transcript)
}

/* --------------------------------------------------------------- input face */

function scopeFor(sessionId) {
	const sessions = typeof pluginCtx?.get === 'function' ? pluginCtx.get('sessions') : null
	if (sessions === null || sessions === undefined) return null
	if (sessionId === undefined || sessionId === null) return null
	// A binding is borrowed for this synchronous edit only; never retain it.
	if (typeof sessions.binding === 'function') return sessions.binding(sessionId)?.ctx ?? null
	return sessions.scope?.(sessionId) ?? null
}

export function inputFor(sessionId) {
	const scope = scopeFor(sessionId)
	if (scope === null) return null
	const conversation = scope.get?.('conversation')
	if (typeof conversation?.input?.for !== 'function') return null
	try {
		return conversation.input.for(scope) ?? null
	} catch (error) {
		console.warn('[dsh-quote-ask] scoped composer unavailable', error)
		return null
	}
}

/** Detect-coordinate length: a chip counts as one character there, not `length`. */
export function detectLength(state) {
	const chips = state.occurrences ?? []
	return state.draft.length - chips.reduce((extra, occ) => extra + Math.max(0, occ.length - 1), 0)
}

export function quoteRef(payload, t) {
	return {
		source: SOURCE,
		ref: JSON.stringify(payload),
		// The card above the composer carries the content; the chip is only a marker.
		label: t('chip'),
		appearance: 'session',
		clipboardText: frame(payload, t),
	}
}

/**
 * Append one quote at the end of the draft.
 * @returns `{ ok: true }` or `{ ok: false, reason }` — `reason` is surfaced to the user.
 */
export function appendQuote(sessionId, payload, t) {
	const input = inputFor(sessionId)
	if (input === null) return { ok: false, reason: 'no-composer' }

	const state = input.state?.getSnapshot?.()
	if (state === undefined || typeof state.draftRev !== 'number' || typeof input.insertReference !== 'function') {
		return { ok: false, reason: 'no-composer' }
	}
	if (state.phase !== 'plain' && state.phase !== 'claimed') return { ok: false, reason: 'busy' }

	const end = detectLength(state)
	if (!Number.isSafeInteger(end) || end < 0) return { ok: false, reason: 'rejected' }
	const lead = end > 0 && !/\s/u.test(state.draft.slice(-1)) ? ' ' : ''

	try {
		if (lead !== '' && input.insertText(lead, { start: end, end, draftRev: state.draftRev }) !== true) {
			return { ok: false, reason: 'rejected' }
		}
		const current = input.state.getSnapshot()
		const at = end + lead.length
		const inserted = input.insertReference(quoteRef(payload, t), { start: at, end: at, draftRev: current.draftRev })
		if (inserted && typeof input.focus === 'function') input.focus()
		return inserted ? { ok: true } : { ok: false, reason: 'rejected' }
	} catch (error) {
		console.warn('[dsh-quote-ask] quote insertion failed', error)
		return { ok: false, reason: 'rejected' }
	}
}

/** Remove one quote by its stable occurrence id. */
export function removeQuote(sessionId, occurrenceId) {
	const input = inputFor(sessionId)
	if (input === null) return false
	const state = input.state?.getSnapshot?.()
	if (state === undefined || typeof state.draftRev !== 'number') return false

	const all = state.occurrences ?? []
	const target = all.find((occ) => occ.occurrenceId === occurrenceId && occ.source === SOURCE)
	if (target === undefined) return false

	// clipboard offset -> detect offset (every earlier chip is 1 char, not `length`)
	let detect = target.offset
	for (const other of all) {
		if (other.offset < target.offset) detect -= Math.max(0, other.length - 1)
	}
	try {
		return input.insertText('', { start: detect, end: detect + 1, draftRev: state.draftRev }) === true
	} catch (error) {
		console.warn('[dsh-quote-ask] quote removal failed', error)
		return false
	}
}

/* -------------------------------------------------------------------- codec */

/**
 * Register the reference source whose codec expands every chip at submit time.
 * This IS the official send-time injection path — the shell serializes chip
 * owners through their codec before the message leaves the browser.
 */
export function registerCodec(ctx, getT) {
	try {
		const inputTriggers = typeof ctx?.get === 'function' ? ctx.get('inputTriggers') : null
		if (typeof inputTriggers?.registerSource !== 'function') return () => {}
		const project = (ref) => {
			const payload = decode(ref)
			return payload === null ? '' : frame(payload, getT())
		}
		const unregister = inputTriggers.registerSource({
			trigger: '@',
			name: SOURCE,
			order: 1000,
			// Codec-only source: it owns quote chips but adds no `@` candidates.
			candidates: () => Promise.resolve([]),
			onPick: () => {},
			codec: {
				clipboardText: project,
				serialize: (ref) => Promise.resolve(project(ref)),
			},
		})
		return typeof unregister === 'function' ? unregister : () => {}
	} catch (error) {
		console.warn('[dsh-quote-ask] codec unavailable; quotes would degrade to plain text', error)
		return () => {}
	}
}

/* ---------------------------------------------------------------- selection */

/** The live selection, when both ends sit inside the conversation transcript. */
export function currentSelection() {
	const selection = document.getSelection?.()
	if (selection === null || selection === undefined || selection.isCollapsed || selection.rangeCount === 0) return null
	const text = selection.toString()
	if (text.trim() === '') return null
	const range = selection.getRangeAt(0)
	const start = elementOf(range.startContainer)
	const end = elementOf(range.endContainer)
	if (start === null || end === null) return null
	const transcript = start.closest?.(TRANSCRIPT_SELECTOR) ?? null
	if (transcript === null || end.closest?.(TRANSCRIPT_SELECTOR) !== transcript) return null
	const rect = range.getBoundingClientRect()
	if (rect.width === 0 && rect.height === 0) return null
	return { text: text.trim(), rect, range: range.cloneRange(), ...identityAt(range.startContainer) }
}
