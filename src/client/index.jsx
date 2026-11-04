/**
 * dsh-quote-ask — browser half.
 *
 * Select text in a conversation, hit the floating 「引用」 button, and the excerpt
 * lands in a card above the composer with the question box left free for the
 * follow-up. The excerpt is stored as a SNAPSHOT (the whole text, inside the
 * chip), so submitting needs no lookup and survives compaction.
 *
 * Identity comes from official seats wherever possible:
 *   assistant message → `conversation.chat.assistant-actions` (durable messageId)
 *   turn              → the seat's own container marker
 * The one thing DSH has no API for is "which message is this selection in" — a
 * selection is a browser concept — so that step walks the DOM and fails LOUDLY
 * (no button) rather than silently producing a wrong role.
 */
import { clearContext, registerCodec, setContext } from './bridge.js'
import { getT, registerLocale } from './quote.js'
import { ensureStyles } from './styles.js'
import { QuoteAction, QuoteDock } from './components.jsx'

export const name = 'quote-ask'
export const inject = ['slots', 'sessions', 'locale', 'inputTriggers']

export function apply(ctx) {
	setContext(ctx)
	ensureStyles()

	const locale = registerLocale(ctx)
	const disposeCodec = registerCodec(ctx, getT)

	const disposers = [
		ctx.slots.inject('conversation.input.dock', () =>
			ctx.slots.register(
				{ name: 'conversation.input.dock', id: 'quote-ask', order: 90, registrant: 'dsh-quote-ask' },
				QuoteDock,
			),
		),
		ctx.slots.inject('conversation.chat.assistant-actions', () =>
			ctx.slots.register(
				{
					name: 'conversation.chat.assistant-actions',
					id: 'quote-ask',
					order: 90,
					registrant: 'dsh-quote-ask',
				},
				QuoteAction,
			),
		),
	]

	ctx.effect(
		() => () => {
			for (const dispose of disposers) {
				if (typeof dispose === 'function') dispose()
			}
			disposeCodec()
			locale.dispose()
			clearContext()
		},
		'dsh-quote-ask: teardown',
	)
}
