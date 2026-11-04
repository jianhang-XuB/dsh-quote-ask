/**
 * The three seats.
 *
 *   QuoteDock      conversation.input.dock           → the quote cards, above the composer
 *   FloatingQuote  (rendered by QuoteDock, portal)   → the selection-driven button
 *   QuoteAction    conversation.chat.assistant-actions → per-message entry point
 *
 * The cards are a PURE PROJECTION of `input.occurrences`: no plugin-side state
 * mirrors the draft, so a card can never disagree with what will be sent.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { SOURCE, decode, getT, makePayload, roleLabel, subscribeT } from './quote.js'
import { appendQuote, currentSelection, registerIdentity, removeQuote } from './bridge.js'

export function useTranslate() {
	const [, bump] = useState(0)
	useEffect(() => subscribeT(() => bump((n) => n + 1)), [])
	return getT()
}

/* ------------------------------------------------------------------- notice */

function useNotice() {
	const [notice, setNotice] = useState(null)
	const timer = useRef(null)
	const show = useCallback((text) => {
		if (timer.current !== null) window.clearTimeout(timer.current)
		setNotice(text)
		timer.current = window.setTimeout(() => {
			timer.current = null
			setNotice(null)
		}, 3200)
	}, [])
	useEffect(
		() => () => {
			if (timer.current !== null) window.clearTimeout(timer.current)
		},
		[],
	)
	return [notice, show]
}

function Notice({ text }) {
	if (text === null) return null
	return createPortal(<div className="dsh-qa-notice">{text}</div>, document.body)
}

/* -------------------------------------------------------------- quote cards */

function QuoteCard({ sessionId, occurrence, onNotice }) {
	const t = useTranslate()
	const [open, setOpen] = useState(false)
	const payload = useMemo(() => decode(occurrence.ref), [occurrence.ref])
	if (payload === null) return null

	const lines = payload.text.split('\n')
	const clipped = !open && lines.length > 3
	const meta = [t('card.kind'), roleLabel(payload.role, t)]
	if (payload.turn !== null) meta.push(t('turn').replace('{n}', String(payload.turn)))
	if (payload.truncated) meta.push(t('truncated'))

	return (
		<div className="dsh-qa-card">
			<div className="dsh-qa-head">
				<span className="dsh-qa-kind">{meta.join(' · ')}</span>
				<span className="dsh-qa-tools">
					{lines.length > 3 ? (
						<button type="button" className="dsh-qa-btn" onClick={() => setOpen((v) => !v)}>
							{open ? t('collapse') : t('expand')}
						</button>
					) : null}
					<button
						type="button"
						className="dsh-qa-btn dsh-qa-remove"
						title={t('remove')}
						onClick={() => {
							if (!removeQuote(sessionId, occurrence.occurrenceId)) onNotice(t('notice.failed'))
						}}
					>
						×
					</button>
				</span>
			</div>
			<div className="dsh-qa-body">
				{open ? payload.text : lines.slice(0, 3).join('\n')}
				{clipped ? '…' : ''}
			</div>
		</div>
	)
}

/* ---------------------------------------------------- floating quote button */

const FLOAT_WIDTH = 84
const FLOAT_HEIGHT = 28
const FLOAT_GAP = 6

/** Our own UI, so the selection listeners can ignore clicks that land on it. */
const OUR_UI = '.dsh-qa-float, .dsh-qa-btn, .dsh-qa-card, .dsh-qa-notice'

/** The user asked for the old plugin's placement: centred above the selection. */
function placeAbove(rect) {
	let x = rect.left + rect.width / 2 - FLOAT_WIDTH / 2
	let y = rect.top - FLOAT_HEIGHT - FLOAT_GAP
	if (y < 4) y = rect.bottom + FLOAT_GAP
	x = Math.max(4, Math.min(x, window.innerWidth - FLOAT_WIDTH - 4))
	return { left: `${Math.round(x)}px`, top: `${Math.round(y)}px` }
}

/**
 * Appears on pointer RELEASE, not while the selection is still being dragged —
 * driving this from `selectionchange` alone makes the button trail the cursor.
 */
function FloatingQuote({ sessionId, onNotice }) {
	const t = useTranslate()
	const [pending, setPending] = useState(null)
	const dragging = useRef(false)

	useEffect(() => {
		const ours = (target) => target instanceof Element && target.closest(OUR_UI) !== null

		const onMouseDown = (event) => {
			if (ours(event.target)) return
			dragging.current = true
			setPending(null)
		}
		const onMouseUp = (event) => {
			if (!dragging.current) return
			dragging.current = false
			// A press that began on our own UI is a button click, not a new selection.
			if (ours(event.target)) return
			setPending(currentSelection())
		}
		// A release that never reaches the document (drag ended outside the window)
		// would latch the flag; losing focus always ends a drag.
		const onBlur = () => {
			dragging.current = false
		}
		const onKeyDown = (event) => {
			if (event.key === 'Escape') setPending(null)
		}
		const onScroll = () => setPending(null)

		document.addEventListener('mousedown', onMouseDown, true)
		document.addEventListener('mouseup', onMouseUp, true)
		document.addEventListener('keydown', onKeyDown, true)
		window.addEventListener('scroll', onScroll, true)
		window.addEventListener('blur', onBlur)
		return () => {
			document.removeEventListener('mousedown', onMouseDown, true)
			document.removeEventListener('mouseup', onMouseUp, true)
			document.removeEventListener('keydown', onKeyDown, true)
			window.removeEventListener('scroll', onScroll, true)
			window.removeEventListener('blur', onBlur)
		}
	}, [])

	if (pending === null) return null

	return createPortal(
		<button
			type="button"
			className="dsh-qa-float"
			style={placeAbove(pending.rect)}
			title={t('button.title')}
			onMouseDown={(event) => event.preventDefault()}
			onClick={() => {
				const payload = makePayload(pending.text, pending.role, pending.turn, pending.messageId)
				const result = appendQuote(sessionId, payload, t)
				setPending(null)
				if (!result.ok) onNotice(result.reason === 'busy' ? t('notice.busy') : t('notice.failed'))
			}}
		>
			❐ {t('chip')}
		</button>,
		document.body,
	)
}

/* -------------------------------------------------------------- dock (seat 1) */

export function QuoteDock({ sessionId, input }) {
	const t = useTranslate()
	const [notice, showNotice] = useNotice()
	const occurrences = useMemo(
		() => (input?.occurrences ?? []).filter((occ) => occ.source === SOURCE),
		[input],
	)

	return (
		<>
			{occurrences.length > 0 ? (
				<div className="dsh-qa-zone">
					<div className="dsh-qa-stack">
						{occurrences.map((occ) => (
							<QuoteCard
								key={occ.occurrenceId}
								sessionId={sessionId}
								occurrence={occ}
								onNotice={showNotice}
							/>
						))}
					</div>
				</div>
			) : null}
			<FloatingQuote sessionId={sessionId} onNotice={showNotice} />
			<Notice text={notice} />
		</>
	)
}

/* ------------------------------------------------- assistant action (seat 2) */

/**
 * Rendered once per finalized assistant message, so it can hand the floating
 * button an authoritative identity for that message instead of a DOM guess.
 *
 * Stage 1: quoting here uses the text the user has selected inside this message
 * (the whole-message path needs a durable messageId → content lookup that is not
 * wired yet). The registration below is what makes role/turn authoritative.
 */
export function QuoteAction({ sessionId, messageId }) {
	const t = useTranslate()
	const host = useRef(null)
	const [notice, showNotice] = useNotice()

	useEffect(() => {
		const element = host.current
		if (element === null) return undefined
		const container = element.closest('[data-chat-flow-kind]') ?? element.parentElement
		return registerIdentity(container, {
			role: 'assistant',
			turn: turnOf(container),
			messageId: typeof messageId === 'string' ? messageId : null,
		})
	}, [messageId])

	return (
		<>
			<button
				ref={host}
				type="button"
				className="dsh-qa-btn"
				title={t('button.title')}
				// Without this the browser clears the transcript selection on mousedown,
				// so the click below would always read an empty selection.
				onMouseDown={(event) => event.preventDefault()}
				onClick={() => {
					const selection = currentSelection()
					if (selection === null) {
						showNotice(t('notice.select-first'))
						return
					}
					const payload = makePayload(selection.text, selection.role ?? 'assistant', selection.turn, selection.messageId ?? messageId)
					const result = appendQuote(sessionId, payload, t)
					if (!result.ok) showNotice(result.reason === 'busy' ? t('notice.busy') : t('notice.failed'))
				}}
			>
				❐ {t('chip')}
			</button>
			<Notice text={notice} />
		</>
	)
}

function turnOf(element) {
	let node = element
	while (node !== null) {
		const raw = node.getAttribute?.('data-chat-turn')
		if (typeof raw === 'string' && raw !== '') {
			const value = Number(raw)
			if (Number.isSafeInteger(value) && value >= 0) return value
		}
		node = node.parentElement
	}
	return null
}
