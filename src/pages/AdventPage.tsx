import { useEffect, useRef, useState } from 'react'
import { Camera, Check, Download, ExternalLink, Gift, Heart, Lightbulb, LockKeyhole, Music, Puzzle, Smile, Sparkles, X } from 'lucide-react'
import { FestiveShell } from '@/components/FestiveShell'
import ScratchCard from '@/components/ScratchCard'
import { ADVENT_CONTENT_URL } from '@/config'
import { ADVENT_DAYS, isValidDayOrder, nextUnopenedDay, parseAdventContent, safeLocalMediaUrl, safeMediaUrl, shuffleDays, type AdventContent, type AdventEntry } from '@/lib/advent'
import { safeHttpUrl } from '@/lib/scratch'

const OPENED_KEY = 'advent-opened-days'
const ORDER_KEY = 'advent-day-order'

function loadDayOrder(): number[] {
  try {
    const stored: unknown = JSON.parse(globalThis.localStorage?.getItem(ORDER_KEY) ?? 'null')
    if (isValidDayOrder(stored)) return stored
  } catch (error) {
    console.warn('Could not read the calendar tile order', error)
  }
  return shuffleDays()
}

function loadOpened(): Set<number> {
  try {
    const stored = JSON.parse(globalThis.localStorage?.getItem(OPENED_KEY) ?? '[]')
    return new Set(Array.isArray(stored) ? stored.filter(Number.isInteger) : [])
  } catch {
    return new Set()
  }
}

function saveOpened(days: Set<number>) {
  try {
    globalThis.localStorage?.setItem(OPENED_KEY, JSON.stringify([...days]))
  } catch {
    // Storage may be unavailable (private mode); opening still works for this visit.
  }
}

async function fetchAdventContent(signal: AbortSignal): Promise<AdventContent> {
  const response = await fetch(ADVENT_CONTENT_URL, { signal, cache: 'no-cache' })
  if (!response.ok) throw new Error(`Could not load ${ADVENT_CONTENT_URL}`)
  return parseAdventContent(await response.json())
}

export function AdventEntryView({ day, entry }: { day: number; entry?: AdventEntry }) {
  const [imageError, setImageError] = useState(false)
  const [audioError, setAudioError] = useState(false)
  if (!entry) return <p className="muted-copy">A quiet moment, just for you. Nothing has been added to this day yet.</p>
  if (entry.type === 'poem') {
    return (
      <div className="poem-paper">
        <Heart className="poem-heart" size={20} fill="currentColor" aria-hidden="true" />
        <p className="poem-text">{entry.content}</p>
        <Heart className="poem-heart" size={16} fill="currentColor" aria-hidden="true" />
      </div>
    )
  }
  if (entry.type === 'link') {
    const url = safeHttpUrl(entry.content.trim())
    return (
      <div className="surprise-card surprise-link">
        <span className="surprise-icon-wrap"><ExternalLink size={24} aria-hidden="true" /></span>
        <span className="surprise-kicker">SOMETHING LOVELY AWAITS</span>
        <h3>A little journey</h3>
        <p className="surprise-card-text">A special surprise is waiting for you just beyond this door.</p>
        {url
          ? <a href={url} target="_blank" rel="noopener noreferrer" className="primary-button">Open your surprise <ExternalLink size={16} aria-hidden="true" /></a>
          : <p role="alert">This surprise link is not valid.</p>}
      </div>
    )
  }
  if (entry.type === 'audio') {
    const src = safeMediaUrl(entry.content)
    return (
      <div className="surprise-card surprise-audio-card">
        <span className="surprise-icon-wrap"><Music size={25} aria-hidden="true" /></span>
        <span className="surprise-kicker">A MOMENT TO LISTEN</span>
        <h3>A message for you</h3>
        <p className="surprise-card-text">Press play and enjoy a little moment made just for you.</p>
        {src && !audioError
          ? <audio className="surprise-audio" controls preload="metadata" src={src} onError={() => setAudioError(true)} aria-label={`Audio message for day ${day}`} />
          : <p role="alert">The audio message could not be loaded.</p>}
      </div>
    )
  }
  if (entry.type === 'challenge') {
    return (
      <div className="surprise-card surprise-challenge">
        <span className="surprise-icon-wrap"><Sparkles size={24} aria-hidden="true" /></span>
        <span className="surprise-kicker">YOUR LITTLE MISSION</span>
        <h3>A little challenge</h3>
        <p className="surprise-card-text">{entry.content}</p>
      </div>
    )
  }
  if (entry.type === 'riddle') {
    return (
      <div className="surprise-card surprise-riddle">
        <span className="surprise-icon-wrap"><Puzzle size={24} aria-hidden="true" /></span>
        <span className="surprise-kicker">SOMETHING TO PONDER</span>
        <h3>A little riddle</h3>
        <p className="surprise-card-text">{entry.content}</p>
        {entry.answer
          ? <details className="riddle-answer"><summary>Reveal the answer</summary><p>{entry.answer}</p></details>
          : <p role="alert">The answer has not been configured for this riddle.</p>}
      </div>
    )
  }
  if (entry.type === 'fact') {
    return (
      <div className="surprise-card surprise-fact">
        <span className="surprise-icon-wrap"><Lightbulb size={24} aria-hidden="true" /></span>
        <span className="surprise-kicker">A LITTLE SOMETHING TO LEARN</span>
        <h3>Did you know?</h3>
        <p className="surprise-card-text">{entry.content}</p>
      </div>
    )
  }
  if (entry.type === 'joke') {
    return (
      <div className="surprise-card surprise-joke">
        <span className="surprise-icon-wrap"><Smile size={26} aria-hidden="true" /></span>
        <span className="surprise-kicker">A LITTLE CHRISTMAS CHEER</span>
        <h3>Just for a laugh</h3>
        <p className="surprise-card-text">{entry.content}</p>
        {entry.punchline
          ? <details className="riddle-answer"><summary>Reveal the punchline</summary><p>{entry.punchline}</p></details>
          : <p role="alert">The punchline has not been configured for this joke.</p>}
      </div>
    )
  }
  if (entry.type === 'coupon') {
    const src = entry.image ? safeLocalMediaUrl(entry.image) : null
    return (
      <div className="surprise-card surprise-coupon">
        <span className="surprise-icon-wrap"><Gift size={24} aria-hidden="true" /></span>
        <span className="surprise-kicker">A LITTLE SOMETHING FOR YOU</span>
        <h3>A gift for you</h3>
        <p className="surprise-card-text">{entry.content}</p>
        {src && !imageError
          ? <>
              <img src={src} alt={`Coupon badge for day ${day}`} className="coupon-image" onError={() => setImageError(true)} />
              <a href={src} download className="primary-button"><Download size={16} aria-hidden="true" /> Download badge</a>
            </>
          : <p role="alert">The coupon badge could not be loaded. Use a local image path.</p>}
      </div>
    )
  }
  const src = safeMediaUrl(entry.content)
  return (
    <figure className="surprise-photo">
      {src && !imageError
        ? <img src={src} alt={`Surprise for day ${day}`} onError={() => setImageError(true)} />
        : <p role="alert">The surprise image could not be loaded.</p>}
      <figcaption><Camera size={15} aria-hidden="true" /> A little moment to keep <Heart size={13} fill="currentColor" aria-hidden="true" /></figcaption>
    </figure>
  )
}

function AdventDialog({ day, entry, opened, loading, loadError, onReveal, onClose, onRetry }: {
  day: number
  entry?: AdventEntry
  opened: boolean
  loading: boolean
  loadError: boolean
  onReveal: () => void
  onClose: () => void
  onRetry: () => void
}) {
  const dialog = useRef<HTMLDialogElement>(null)
  useEffect(() => {
    const element = dialog.current
    element?.showModal()
    return () => { element?.close() }
  }, [])
  return (
    <dialog ref={dialog} onCancel={onClose} aria-labelledby="surprise-title" className="surprise-dialog">
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <p className="eyebrow"><Heart size={13} aria-hidden="true" /> A LITTLE EVERYDAY MAGIC</p>
          <h2 id="surprise-title" className="surprise-heading mt-2">Day {day}</h2>
        </div>
        <button type="button" autoFocus className="close-button" onClick={onClose} aria-label="Close daily surprise"><X size={20} aria-hidden="true" /></button>
      </div>
      {loading
        ? <p role="status">Preparing your surprise...</p>
        : loadError
          ? <div role="alert" className="space-y-4">
              <p>Could not load this surprise. Try again.</p>
              <button type="button" className="calendar-action" onClick={onRetry}>Try again</button>
            </div>
          : opened
            ? <div className="space-y-5" aria-live="polite"><AdventEntryView day={day} entry={entry} /></div>
            : <ScratchCard disabled={false} onReveal={onReveal} />}
    </dialog>
  )
}

export default function AdventPage() {
  const [opened, setOpened] = useState(loadOpened)
  const [dayOrder] = useState(loadDayOrder)
  const [selected, setSelected] = useState<number | null>(null)
  const [content, setContent] = useState<AdventContent | null>(null)
  const [loadError, setLoadError] = useState(false)
  const [retry, setRetry] = useState(0)

  useEffect(() => {
    try {
      globalThis.localStorage?.setItem(ORDER_KEY, JSON.stringify(dayOrder))
    } catch (error) {
      console.warn('Could not save the calendar tile order', error)
    }
  }, [dayOrder])

  useEffect(() => {
    const controller = new AbortController()
    fetchAdventContent(controller.signal).then(setContent).catch((error: unknown) => {
      if (!controller.signal.aborted) {
        console.error('Could not load advent calendar content', error)
        setLoadError(true)
      }
    })
    return () => controller.abort()
  }, [retry])

  const retryLoading = () => {
    setLoadError(false)
    setRetry((current) => current + 1)
  }

  const nextDay = nextUnopenedDay(opened)
  const openedCount = Array.from({ length: ADVENT_DAYS }, (_, index) => index + 1)
    .filter((day) => opened.has(day)).length
  const reveal = (day: number) => setOpened((current) => {
    if (day !== nextUnopenedDay(current)) return current
    const next = new Set(current).add(day)
    saveOpened(next)
    return next
  })

  return (
    <FestiveShell>
      <div className="calendar-page">
        <div className="calendar-heading">
          <div className="calendar-heading-copy">
            <span className="hero-eyebrow"><Sparkles size={13} aria-hidden="true" /> THE MOST MAGICAL TIME</span>
            <h1 className="section-title">A little magic,<br /><em>every day.</em></h1>
            <p className="hero-copy">Twenty-four little surprises, wrapped up just for you.</p>
          </div>
          <svg className="hero-illustration" viewBox="0 0 170 190" fill="none" aria-hidden="true">
            <circle cx="87" cy="93" r="72" fill="#F6E8C9" fillOpacity=".08" />
            <circle cx="87" cy="93" r="57" stroke="#E7D5AE" strokeOpacity=".2" />
            <path d="M25 155c35-13 81-13 121 0" stroke="#E7D5AE" strokeOpacity=".45" strokeWidth="2" strokeLinecap="round" />
            <path d="M80 137h15l-2-22H82l-2 22Z" fill="#C99D70" />
            <path d="M87 31 58 79h14l-25 34h14l-15 22h82l-15-22h14l-25-34h14L87 31Z" fill="#92AB8A" />
            <path d="M87 42 65 80h11l-19 29h11l-12 18h63l-12-18h11L99 80h11L87 42Z" fill="#B3C4A5" />
            <path d="m87 17 2.4 6.7 7.1.3-5.6 4.4 1.8 6.9-5.7-3.8-5.7 3.8 1.8-6.9-5.6-4.4 7.1-.3L87 17Z" fill="#EDCF91" />
            <path d="M73 87c9 5 19 5 28 0M64 111c15 6 31 6 46 0" stroke="#F3DCAD" strokeWidth="1.5" strokeLinecap="round" />
            <circle cx="77" cy="101" r="2.5" fill="#BA5B54" /><circle cx="98" cy="102" r="2.5" fill="#F1DBA9" />
            <rect x="34" y="130" width="23" height="22" rx="3" fill="#AF554F" /><path d="M45.5 130v22M34 138h23" stroke="#F2D9B6" strokeWidth="2" />
            <rect x="116" y="135" width="20" height="17" rx="3" fill="#D6B887" /><path d="M126 135v17M116 141h20" stroke="#FFF5DB" strokeWidth="2" />
            <path d="M27 58v10m-5-5h10M139 56v12m-6-6h12M131 104v8m-4-4h8M37 100v8m-4-4h8" stroke="#E8D3A4" strokeWidth="1.5" strokeLinecap="round" />
            <circle cx="43" cy="80" r="1.5" fill="#E8D3A4" /><circle cx="133" cy="83" r="1.5" fill="#E8D3A4" />
          </svg>
        </div>
        <div className="calendar-section-heading">
          <div>
            <span className="calendar-kicker">A LITTLE JOY AWAITS</span>
            <h2>Your calendar</h2>
          </div>
          <span className="calendar-count" aria-label={`${openedCount} of ${ADVENT_DAYS} days opened`}>{openedCount} <span>/ {ADVENT_DAYS}</span></span>
        </div>
        <p className="calendar-instruction">Find and open the days in order.</p>
        {content === null && !loadError && <p role="status">Preparing your calendar...</p>}
        {loadError && (
          <div role="alert" className="empty-state space-y-4">
            <p>Could not load the calendar content. Check advent-calendar.json and try again.</p>
            <button type="button" className="calendar-action" onClick={retryLoading}>Try again</button>
          </div>
        )}
        <div className="door-grid">
          {dayOrder.map((day) => {
            const wasOpened = opened.has(day)
            const locked = !wasOpened && day !== nextDay
            return (
              <button type="button" key={day} disabled={locked} onClick={() => setSelected(day)}
                aria-label={`Day ${day}: ${wasOpened ? 'opened, view surprise' : locked ? `locked, open day ${nextDay} first` : 'scratch to reveal surprise'}`}
                className={`day-door ${wasOpened ? 'is-opened' : locked ? 'is-locked' : 'is-available'}`}>
                <span className="door-status-icon" aria-hidden="true">{wasOpened ? <Check size={14} /> : locked ? <LockKeyhole size={14} /> : <Sparkles size={14} />}</span>
                <span className="door-label">DAY</span>
                <span className="door-number">{day}</span>
                <span className="door-state">{wasOpened ? 'Opened' : locked ? 'Locked' : 'Open me'}</span>
              </button>
            )
          })}
        </div>
        {selected !== null && (
          <AdventDialog key={selected} day={selected} entry={content?.[selected]} opened={opened.has(selected)}
            loading={content === null && !loadError}
            loadError={loadError} onReveal={() => reveal(selected)}
            onClose={() => setSelected(null)} onRetry={retryLoading} />
        )}
      </div>
    </FestiveShell>
  )
}
