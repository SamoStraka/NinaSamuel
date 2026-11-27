import assert from 'node:assert/strict'
import { after, before, test } from 'node:test'
import { readFile } from 'node:fs/promises'
import { createElement } from 'react'
import { renderToString } from 'react-dom/server'
import { createServer } from 'vite'

let server
let scratch
let advent
let AdventPage
let AdventEntryView
let AdventDialog
let stickers

before(async () => {
  server = await createServer({ server: { middlewareMode: true }, appType: 'custom' })
  scratch = await server.ssrLoadModule('/src/lib/scratch.ts')
  advent = await server.ssrLoadModule('/src/lib/advent.ts')
  stickers = await server.ssrLoadModule('/src/lib/stickers.ts')
  ;({ default: AdventPage, AdventEntryView, AdventDialog } = await server.ssrLoadModule('/src/pages/AdventPage.tsx'))
})

after(async () => {
  await server?.close()
})

for (const value of [0, 0.999]) {
  test(`stickers appear and disappear on schedule with random value ${value}`, (t) => {
    t.mock.timers.enable({ apis: ['setTimeout'] })
    t.mock.method(Math, 'random', () => value)
    const appearances = []
    let hidden = 0
    const stop = stickers.scheduleStickers((sticker) => appearances.push(sticker), () => hidden++)
    const interval = 20000 + value * 30000
    const duration = 3000 + value * 7000

    t.mock.timers.tick(interval - 1)
    assert.equal(appearances.length, 0)
    t.mock.timers.tick(1)
    assert.deepEqual(appearances[0], {
      image: value === 0 ? 'n1.png' : 'n5.png',
      x: value * 100,
      y: value * 100,
      size: 60 + value * 100,
      duration,
      destination: value === 0 ? { x: 0, y: 0 } : null,
    })
    t.mock.timers.tick(duration - 1)
    assert.equal(hidden, 0)
    t.mock.timers.tick(1)
    assert.equal(hidden, 1)
    t.mock.timers.tick(interval - duration)
    assert.equal(appearances.length, 2)
    stop()
    t.mock.timers.tick(interval + duration)
    assert.equal(appearances.length, 2)
    assert.equal(hidden, 1)
  })
}

test('moving stickers can travel in different directions and have varying sizes', (t) => {
  t.mock.timers.enable({ apis: ['setTimeout'] })
  const values = [
    0, 0.5, 0.2, 0.8, 0.2, 0.1, 0.2, 0.9, 0.1,
    0, 0.5, 0.8, 0.2, 0.8, 0.9, 0.2, 0.1, 0.9, 0,
  ]
  t.mock.method(Math, 'random', () => {
    assert.ok(values.length > 0, 'unexpected random value requested')
    return values.shift()
  })
  const appearances = []
  const stop = stickers.scheduleStickers((sticker) => appearances.push(sticker), () => {})
  t.mock.timers.tick(20000)
  t.mock.timers.tick(20000)
  stop()
  assert.equal(appearances.length, 2)
  assert.equal(appearances[0].size, 70)
  assert.equal(appearances[1].size, 150)
  assert.ok(appearances[0].destination.x > appearances[0].x)
  assert.ok(appearances[0].destination.y < appearances[0].y)
  assert.ok(appearances[1].destination.x < appearances[1].x)
  assert.ok(appearances[1].destination.y > appearances[1].y)
})

test('scratch coverage measures unique erased area and only reveals after 40 percent', () => {
  const cells = new Set()
  let ratio = scratch.scratchSegment(cells, { x: 100, y: 100 }, { x: 100, y: 100 })
  assert.ok(ratio > 0 && ratio < scratch.REVEAL_THRESHOLD)
  const initial = ratio
  for (let count = 0; count < 10; count++) {
    ratio = scratch.scratchSegment(cells, { x: 100, y: 100 }, { x: 100, y: 100 })
  }
  assert.equal(ratio, initial, 'repeated scratches in one spot must not inflate coverage')
  ratio = scratch.scratchSegment(new Set(), { x: 0, y: 150 }, { x: 600, y: 150 })
  assert.ok(ratio < scratch.REVEAL_THRESHOLD, 'one narrow swipe is not enough')
  for (let y = 0; y <= scratch.SCRATCH_HEIGHT; y += 30) {
    ratio = scratch.scratchSegment(cells, { x: 0, y }, { x: scratch.SCRATCH_WIDTH, y })
  }
  assert.equal(ratio, 1)
})

test('surprise dialog displays the day number in a heart and retains an accessible name', () => {
  for (const day of [1, 24]) {
    const html = renderToString(createElement(AdventDialog, {
      day, opened: false, loading: false, loadError: false,
      onReveal: () => {}, onClose: () => {}, onRetry: () => {},
    }))
    assert.ok(html.includes(`aria-label="Prekvapenie na deň ${day}"`))
    assert.match(html, new RegExp(`<span class="surprise-day-heart" aria-hidden="true">.*<span>${day}</span></span>`))
    assert.ok(!html.includes(`<h2`))
    assert.ok(html.includes('A LITTLE<br/> EVERYDAY MAGIC'))
    assert.ok(!html.includes('Odhaliť prekvapenie'))
    assert.ok(html.includes('Zotri políčko prstom alebo myšou.'))
    assert.match(html, /<canvas\b/)
    assert.ok(html.includes('Priebeh stierania'))
  }
})

test('surprise links only allow HTTP and HTTPS URLs', () => {
  for (const value of ['javascript:alert(1)', 'data:text/html,test', '/private/image', 'not a URL', null]) {
    assert.equal(scratch.safeHttpUrl(value), null)
  }
  assert.equal(scratch.safeHttpUrl('https://example.com/gift'), 'https://example.com/gift')
})

test('calendar content parses supported entries and ignores invalid days and types', () => {
  const parsed = advent.parseAdventContent({ days: [{
    1: { type: 'poem', content: 'Line one\nLine two' },
    2: { type: 'link', content: 'https://example.com' },
    3: { type: 'online_image', content: 'https://example.com/a.jpg' },
    4: { type: 'image', content: '/images/sample.jpg' },
    25: { type: 'poem', content: 'out of range' },
    5: { type: 'video', content: 'x' },
  }] })
  assert.deepEqual(Object.keys(parsed).map(Number), [1, 2, 3, 4])
  assert.equal(parsed[3].type, 'image')
  assert.deepEqual(advent.parseAdventContent({ days: { 7: { type: 'poem', content: 'hi' } } }), {
    7: { type: 'poem', content: 'hi' },
  })
})

test('media URLs reject executable, protocol-relative, and relative values', () => {
  assert.equal(advent.safeMediaUrl('/images/sample.svg'), '/images/sample.svg')
  for (const value of ['//evil.example/x.jpg', 'javascript:alert(1)', 'images/x.jpg']) {
    assert.equal(advent.safeMediaUrl(value), null)
  }
  assert.equal(advent.safeLocalMediaUrl('/images/badge.svg'), '/images/badge.svg')
  for (const value of ['//evil.example/x.jpg', 'https://example.com/badge.png', '/\\evil.example/badge.png', 'images/badge.png']) {
    assert.equal(advent.safeLocalMediaUrl(value), null)
  }
})

test('new surprise types retain their content and type-specific fields', () => {
  const parsed = advent.parseAdventContent({ days: {
    5: { type: 'audio', content: '/audio/message.wav' },
    6: { type: 'challenge', content: 'Make hot chocolate.' },
    7: { type: 'riddle', content: 'What has hands?', answer: 'A clock.' },
    8: { type: 'coupon', content: 'Movie night', image: '/images/badge.svg' },
    9: { type: 'riddle', content: 'Missing answer' },
    10: { type: 'coupon', content: 'Missing badge' },
    11: { type: 'joke', content: 'What melts?', punchline: 'A snowman.' },
    12: { type: 'joke', content: 'Missing punchline' },
    13: { type: 'fact', content: 'Snowflakes have six sides.' },
    14: { type: 'fact', content: '  ' },
    15: { type: 'quote', content: 'A little kindness goes a long way.', author: 'Unknown' },
    16: { type: 'quote', content: 'A quote without attribution.' },
  } })
  assert.deepEqual(parsed[5], { type: 'audio', content: '/audio/message.wav' })
  assert.deepEqual(parsed[6], { type: 'challenge', content: 'Make hot chocolate.' })
  assert.deepEqual(parsed[7], { type: 'riddle', content: 'What has hands?', answer: 'A clock.' })
  assert.deepEqual(parsed[8], { type: 'coupon', content: 'Movie night', image: '/images/badge.svg' })
  assert.equal(parsed[9].answer, null)
  assert.equal(parsed[10].image, null)
  assert.deepEqual(parsed[11], { type: 'joke', content: 'What melts?', punchline: 'A snowman.' })
  assert.equal(parsed[12].punchline, null)
  assert.deepEqual(parsed[13], { type: 'fact', content: 'Snowflakes have six sides.' })
  assert.equal(parsed[14], undefined)
  assert.deepEqual(parsed[15], { type: 'quote', content: 'A little kindness goes a long way.', author: 'Unknown' })
  assert.deepEqual(parsed[16], { type: 'quote', content: 'A quote without attribution.', author: null })
})

test('new surprise types render accessible controls and errors for invalid data', () => {
  const render = (entry) => renderToString(createElement(AdventEntryView, { day: 5, entry }))
  const audio = render({ type: 'audio', content: '/audio/message.wav' })
  assert.match(audio, /<audio[^>]*controls=""/)
  assert.ok(audio.includes('src="/audio/message.wav"'))
  assert.ok(render({ type: 'audio', content: 'javascript:alert(1)' }).includes('role="alert"'))
  const challenge = render({ type: 'challenge', content: 'Make hot chocolate.' })
  assert.ok(challenge.includes('Make hot chocolate.'))
  const riddle = render({ type: 'riddle', content: 'What has hands?', answer: 'A clock.' })
  assert.match(riddle, /<details[^>]*><summary>Odhaliť odpoveď<\/summary>/)
  assert.ok(riddle.includes('A clock.'))
  assert.ok(render({ type: 'riddle', content: 'Question', answer: null }).includes('role="alert"'))
  const coupon = render({ type: 'coupon', content: 'Movie night', image: '/images/badge.svg' })
  assert.ok(coupon.includes('src="/images/badge.svg"'))
  assert.match(coupon, /href="\/images\/badge.svg" download=""/)
  assert.ok(render({ type: 'coupon', content: 'Gift', image: 'https://example.com/badge.svg' }).includes('role="alert"'))
  assert.ok(render({ type: 'coupon', content: 'Gift', image: null }).includes('role="alert"'))
  const joke = render({ type: 'joke', content: 'What melts?', punchline: 'A snowman.' })
  assert.match(joke, /<details[^>]*><summary>Odhaliť pointu<\/summary>/)
  assert.ok(joke.includes('A snowman.'))
  assert.ok(render({ type: 'joke', content: 'Question', punchline: null }).includes('role="alert"'))
  const fact = render({ type: 'fact', content: 'Snowflakes have six sides.' })
  assert.ok(fact.includes('Snowflakes have six sides.'))
  assert.ok(fact.includes('lucide-lightbulb'))
  const quote = render({ type: 'quote', content: 'Be kind.', author: 'A friend' })
  assert.ok(quote.includes('surprise-quote'))
  assert.ok(quote.includes('Be kind.'))
  assert.ok(quote.includes('A friend'))
  assert.ok(quote.includes('lucide-quote'))
  assert.ok(riddle.includes('lucide-puzzle'))
  assert.ok(!riddle.includes('lucide-lightbulb'))
})

test('sample calendar includes usable local audio and a downloadable badge', async () => {
  const sample = JSON.parse(await readFile(new URL('../public/advent-calendar.json', import.meta.url), 'utf8'))
  const parsed = advent.parseAdventContent(sample)
  assert.deepEqual([5, 6, 7, 8, 9, 10].map((day) => parsed[day].type), ['audio', 'challenge', 'riddle', 'coupon', 'joke', 'fact'])
  assert.deepEqual(parsed[11], {
    type: 'quote',
    content: 'Vianočná radosť je ešte krajšia, keď sa o ňu delíme.',
    author: null,
  })
  const audio = await readFile(new URL(`../public${parsed[5].content}`, import.meta.url))
  assert.equal(audio.toString('ascii', 0, 4), 'RIFF')
  assert.equal(audio.toString('ascii', 8, 12), 'WAVE')
  const badge = await readFile(new URL(`../public${parsed[8].image}`, import.meta.url), 'utf8')
  assert.match(badge, /<svg\b/)
})

test('each surprise type has its own presentation', () => {
  const entries = [
    [{ type: 'poem', content: 'Poem' }, 'poem-paper'],
    [{ type: 'link', content: 'https://example.com' }, 'surprise-link'],
    [{ type: 'image', content: '/images/sample.svg' }, 'surprise-photo'],
    [{ type: 'audio', content: '/audio/message.wav' }, 'surprise-audio-card'],
    [{ type: 'challenge', content: 'Challenge' }, 'surprise-challenge'],
    [{ type: 'riddle', content: 'Riddle', answer: 'Answer' }, 'surprise-riddle'],
    [{ type: 'coupon', content: 'Coupon', image: '/images/badge.svg' }, 'surprise-coupon'],
    [{ type: 'joke', content: 'Joke', punchline: 'Punchline' }, 'surprise-joke'],
    [{ type: 'fact', content: 'Fact' }, 'surprise-fact'],
    [{ type: 'quote', content: 'A kind word.', author: 'Someone' }, 'surprise-quote'],
  ]
  for (const [entry, className] of entries) {
    const html = renderToString(createElement(AdventEntryView, { day: 1, entry }))
    assert.ok(html.includes(className), `${entry.type} should use ${className}`)
  }
})

test('shuffled order contains each day once and invalid stored orders are rejected', () => {
  const shuffled = advent.shuffleDays(() => 0)
  assert.equal(shuffled.length, 24)
  assert.deepEqual([...shuffled].sort((a, b) => a - b), Array.from({ length: 24 }, (_, i) => i + 1))
  assert.notDeepEqual(shuffled, Array.from({ length: 24 }, (_, i) => i + 1))
  assert.notDeepEqual(advent.shuffleDays(() => 0.999), Array.from({ length: 24 }, (_, i) => i + 1))
  assert.equal(advent.isValidDayOrder(shuffled), true)
  assert.equal(advent.isValidDayOrder([...shuffled.slice(0, 23), shuffled[0]]), false)
  assert.equal(advent.isValidDayOrder([...shuffled.slice(0, 23), 25]), false)
  assert.equal(advent.isValidDayOrder(null), false)
})

test('next available day is the first missing day, including legacy out-of-order progress', () => {
  assert.equal(advent.nextUnopenedDay(new Set()), 1)
  assert.equal(advent.nextUnopenedDay(new Set([1, 2])), 3)
  assert.equal(advent.nextUnopenedDay(new Set([1, 3, 5])), 2)
  assert.equal(advent.nextUnopenedDay(new Set(Array.from({ length: 24 }, (_, i) => i + 1))), null)
})

test('advent days unlock on their December date and support an explicit date', () => {
  const decemberFifth = new Date(2026, 11, 5)
  assert.equal(advent.isAdventDayAvailable(1, decemberFifth), true)
  assert.equal(advent.isAdventDayAvailable(5, decemberFifth), true)
  assert.equal(advent.isAdventDayAvailable(6, decemberFifth), false)
  assert.equal(advent.isAdventDayAvailable(24, decemberFifth), false)
  assert.equal(advent.isAdventDayAvailable(1, decemberFifth, '2026-12-10'), false)
  assert.equal(advent.isAdventDayAvailable(1, new Date(2026, 11, 10), '2026-12-10'), true)
  assert.equal(advent.isAdventDayAvailable(1, new Date(2026, 11, 10), 'not-a-date'), true)
})

test('calendar renders saved tile order and locks future dates', (t) => {
  t.mock.timers.enable({ apis: ['Date'], now: new Date(2026, 9, 31) })
  const previous = Object.getOwnPropertyDescriptor(globalThis, 'localStorage')
  const order = Array.from({ length: 24 }, (_, i) => 24 - i)
  const storage = new Map([
    ['advent-day-order', JSON.stringify(order)],
    ['advent-opened-days', JSON.stringify([1, 3])],
  ])
  Object.defineProperty(globalThis, 'localStorage', {
    configurable: true,
    value: { getItem: (key) => storage.get(key) ?? null },
  })
  try {
    const html = renderToString(createElement(AdventPage))
    assert.equal((html.match(/class="day-door/g) ?? []).length, 24)
    assert.deepEqual([...html.matchAll(/aria-label="Deň (\d+):/g)].map((match) => Number(match[1])), order)
    assert.match(html, /disabled="" aria-label="Deň 24: zamknuté do určeného dňa"/)
    assert.match(html, /disabled="" aria-label="Deň 2: zamknuté do určeného dňa"/)
    assert.match(html, /<button type="button" aria-label="Deň 1: otvorené, pozrieť prekvapenie"/)
    assert.match(html, /<button type="button" aria-label="Deň 3: otvorené, pozrieť prekvapenie"/)
    assert.ok(html.includes('A LITTLE JOY AWAITS'))
    assert.ok(html.includes('A LITTLE DECEMBER MAGIC'))
    assert.ok(html.includes('Made for moments worth keeping'))
    assert.ok(html.includes('A little magic,<br/><em>every day.</em>'))
    assert.match(html, /<span class="door-label" lang="en">DAY<\/span>/)
    assert.ok(html.includes('Tvoj kalendár'))
    assert.ok(!html.includes('Sign in'))
    assert.ok(!html.includes('My account'))
  } finally {
    if (previous) Object.defineProperty(globalThis, 'localStorage', previous)
    else delete globalThis.localStorage
  }
})

test('document declares Slovak and sample image text is localized', async () => {
  const [html, image, badge] = await Promise.all([
    readFile(new URL('../index.html', import.meta.url), 'utf8'),
    readFile(new URL('../public/images/sample.svg', import.meta.url), 'utf8'),
    readFile(new URL('../public/images/cozy-evening-badge.svg', import.meta.url), 'utf8'),
  ])
  assert.match(html, /<html lang="sk">/)
  assert.ok(image.includes('Veselé Vianoce'))
  assert.ok(badge.includes('Útulný večer'))
})

test('mobile calendar has four columns and no breakpoint reduces the column count', async () => {
  const css = await readFile(new URL('../src/index.css', import.meta.url), 'utf8')
  const columns = [...css.matchAll(/grid-template-columns:\s*repeat\((\d+),\s*minmax\(0,\s*1fr\)\)/g)]
    .map((match) => Number(match[1]))
  assert.deepEqual(columns, [4, 6])
})

test('surprise entries render safe links, images, and poems', () => {
  const poem = renderToString(createElement(AdventEntryView, {
    day: 1, entry: { type: 'poem', content: 'A\nB' },
  }))
  assert.ok(poem.includes('A\nB'))
  assert.match(poem, /class="poem-paper"/)
  assert.match(poem, /class="poem-text"/)
  assert.equal((poem.match(/class="[^"]*poem-heart[^"]*"/g) ?? []).length, 2)
  assert.ok(poem.indexOf('poem-heart') < poem.indexOf('A\nB'))
  assert.ok(poem.lastIndexOf('poem-heart') > poem.indexOf('A\nB'))

  const link = renderToString(createElement(AdventEntryView, {
    day: 2, entry: { type: 'link', content: 'https://example.com' },
  }))
  assert.ok(link.includes('href="https://example.com/"'))
  assert.ok(link.includes('rel="noopener noreferrer"'))
  assert.ok(!link.includes('poem-paper'))

  const image = renderToString(createElement(AdventEntryView, {
    day: 4, entry: { type: 'image', content: '/images/sample.svg' },
  }))
  assert.ok(image.includes('src="/images/sample.svg"'))
  assert.ok(!image.includes('poem-paper'))
})
