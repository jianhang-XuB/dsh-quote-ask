/**
 * Quote payload + the Markdown frame the model actually receives.
 *
 * Storage model: a SNAPSHOT, not a pointer. The whole excerpt is serialized into
 * the chip's `ref`, so at submit time nothing has to be looked up — the text
 * travels with the chip and survives compaction, session rotation, and paging.
 */

export const SOURCE = 'quote-ask'
export const LOCALE_NS = 'quote-ask'

/**
 * Safety valve only. A normal quote is stored whole; this exists so that
 * selecting an entire transcript cannot put an unbounded blob into the editor
 * node. Hitting it is reported to the user, never silent.
 */
export const MAX_CHARS = 20000

export const DICT = {
	zh: {
		chip: '引用',
		'button.title': '引用选中内容，然后在输入框里针对它提问',
		'card.kind': '引用',
		'role.user': '我的提问',
		'role.assistant': '助手',
		'role.unknown': '对话',
		turn: '第 {n} 轮',
		expand: '展开全文',
		collapse: '收起',
		remove: '删除这条引用',
		truncated: '已截断',
		'notice.busy': '输入框正忙，稍后再引用',
		'notice.failed': '引用未能插入，请重试',
		'notice.select-first': '先划选要引用的文字，再点这个按钮',
	},
	en: {
		chip: 'Quote',
		'button.title': 'Quote the selection, then ask about it in the composer',
		'card.kind': 'Quote',
		'role.user': 'my message',
		'role.assistant': 'assistant',
		'role.unknown': 'conversation',
		turn: 'turn {n}',
		expand: 'Show all',
		collapse: 'Collapse',
		remove: 'Remove this quote',
		truncated: 'truncated',
		'notice.busy': 'The composer is busy; try quoting again shortly',
		'notice.failed': 'The quote could not be inserted; please retry',
		'notice.select-first': 'Select the text you want to quote, then press this button',
	},
}

export const fallbackT = (key) => DICT.en[key] ?? key

/**
 * The active translator, shared by every consumer (card copy AND the codec's
 * submit-time frame). A locale switch swaps it in place so already-registered
 * codecs pick up the new language without re-registering.
 */
let activeT = fallbackT
const tListeners = new Set()

export const getT = () => activeT

export function setT(next) {
	activeT = typeof next === 'function' ? next : fallbackT
	for (const listener of tListeners) listener()
}

export function subscribeT(listener) {
	tListeners.add(listener)
	return () => tListeners.delete(listener)
}


export const validTurn = (value) => Number.isSafeInteger(value) && value >= 0

/** Bound one excerpt before it becomes editor state. */
export function makePayload(text, role, turn, messageId) {
	let body = String(text ?? '')
	let truncated = false
	if (body.length > MAX_CHARS) {
		body = body.slice(0, MAX_CHARS)
		truncated = true
	}
	return {
		text: body,
		role: role === 'user' || role === 'assistant' ? role : null,
		turn: validTurn(turn) ? turn : null,
		messageId: typeof messageId === 'string' && messageId !== '' ? messageId : null,
		truncated,
	}
}

/** Parse a chip `ref` back into a payload; malformed refs degrade to null. */
export function decode(ref) {
	try {
		const value = JSON.parse(ref)
		if (value === null || typeof value !== 'object' || typeof value.text !== 'string') return null
		return {
			text: value.text,
			role: value.role === 'user' || value.role === 'assistant' ? value.role : null,
			turn: validTurn(value.turn) ? value.turn : null,
			messageId: typeof value.messageId === 'string' ? value.messageId : null,
			truncated: value.truncated === true,
		}
	} catch {
		return null
	}
}

export const roleLabel = (role, t) =>
	role === 'user' ? t('role.user') : role === 'assistant' ? t('role.assistant') : t('role.unknown')

/** The serialized frame: what the model reads, and what the clipboard carries. */
export function frame(payload, t) {
	const meta = [t('card.kind'), roleLabel(payload.role, t)]
	if (payload.turn !== null) meta.push(t('turn').replace('{n}', String(payload.turn)))
	if (payload.truncated) meta.push(t('truncated'))
	const lines = payload.text.split('\n').map((line) => `> ${line}`.trimEnd())
	return `> [${meta.join(' · ')}]\n${lines.join('\n')}\n\n`
}

/**
 * Register the locale namespace and adopt it as the active translator. Degrades
 * to the English copy when the locale service is missing, so the plugin still
 * works on a host that does not provide it.
 */
export function registerLocale(ctx) {
	const restore = () => setT(fallbackT)
	try {
		const locale = typeof ctx?.get === 'function' ? ctx.get('locale') : null
		if (typeof locale?.register === 'function' && typeof locale?.bind === 'function') {
			const unregister = locale.register(LOCALE_NS, DICT)
			const adopt = () => setT(locale.bind(LOCALE_NS))
			adopt()
			const unsubscribe = typeof locale.subscribe === 'function' ? locale.subscribe(adopt) : null
			return {
				dispose: () => {
					if (typeof unsubscribe === 'function') unsubscribe()
					if (typeof unregister === 'function') unregister()
					restore()
				},
			}
		}
	} catch (error) {
		console.warn('[dsh-quote-ask] locale unavailable; using English copy', error)
	}
	restore()
	return { dispose: restore }
}
