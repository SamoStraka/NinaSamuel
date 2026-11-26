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

before(async () => {
  server = await createServer({ server: { middlewareMode: true }, appType: 'custom' })
  scratch = await server.ssrLoadModule('/src/lib/scratch.ts')
  advent = await server.ssrLoadModule('/src/lib/advent.ts')
  ;({ default: AdventPage, AdventEntryView } = await server.ssrLoadModule('/src/pages/AdventPage.tsx'))
})

after(async () => {
  await server?.close()
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
  assert.match(riddle, /<details[^>]*><summary>Reveal the answer<\/summary>/)
  assert.ok(riddle.includes('A clock.'))
  assert.ok(render({ type: 'riddle', content: 'Question', answer: null }).includes('role="alert"'))
  const coupon = render({ type: 'coupon', content: 'Movie night', image: '/images/badge.svg' })
  assert.ok(coupon.includes('src="/images/badge.svg"'))
  assert.match(coupon, /href="\/images\/badge.svg" download=""/)
  assert.ok(render({ type: 'coupon', content: 'Gift', image: 'https://example.com/badge.svg' }).includes('role="alert"'))
  assert.ok(render({ type: 'coupon', content: 'Gift', image: null }).includes('role="alert"'))
  const joke = render({ type: 'joke', content: 'What melts?', punchline: 'A snowman.' })
  assert.match(joke, /<details[^>]*><summary>Reveal the punchline<\/summary>/)
  assert.ok(joke.includes('A snowman.'))
  assert.ok(render({ type: 'joke', content: 'Question', punchline: null }).includes('role="alert"'))
  const fact = render({ type: 'fact', content: 'Snowflakes have six sides.' })
  assert.ok(fact.includes('Snowflakes have six sides.'))
  assert.ok(fact.includes('lucide-lightbulb'))
  assert.ok(riddle.includes('lucide-puzzle'))
  assert.ok(!riddle.includes('lucide-lightbulb'))
})

test('sample calendar includes usable local audio and a downloadable badge', async () => {
  const sample = JSON.parse(await readFile(new URL('../public/advent-calendar.json', import.meta.url), 'utf8'))
  const parsed = advent.parseAdventContent(sample)
  assert.deepEqual([5, 6, 7, 8, 9, 10].map((day) => parsed[day].type), ['audio', 'challenge', 'riddle', 'coupon', 'joke', 'fact'])
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

test('calendar renders saved tile order and locks all but the next unopened day', () => {
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
    assert.deepEqual([...html.matchAll(/aria-label="Day (\d+):/g)].map((match) => Number(match[1])), order)
    assert.match(html, /disabled="" aria-label="Day 24: locked, open day 2 first"/)
    assert.match(html, /<button type="button" aria-label="Day 2: scratch to reveal surprise"/)
    assert.match(html, /<button type="button" aria-label="Day 1: opened, view surprise"/)
    assert.match(html, /<button type="button" aria-label="Day 3: opened, view surprise"/)
    assert.ok(!html.includes('Sign in'))
    assert.ok(!html.includes('My account'))
  } finally {
    if (previous) Object.defineProperty(globalThis, 'localStorage', previous)
    else delete globalThis.localStorage
  }
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
