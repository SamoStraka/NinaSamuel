export type StickerAppearance = {
  image: string
  x: number
  y: number
  size: number
  duration: number
  destination: { x: number; y: number } | null
}

const STICKERS = ['n1.png', 'n2.png', 'n3.png', 'n4.png', 'n5.png']

function randomBetween(min: number, max: number) {
  return min + Math.random() * (max - min)
}

export function scheduleStickers(show: (sticker: StickerAppearance) => void, hide: () => void) {
  let showTimer: ReturnType<typeof setTimeout>
  let hideTimer: ReturnType<typeof setTimeout>

  function scheduleNext() {
    showTimer = setTimeout(() => {
      const duration = randomBetween(1000, 7000)
      show({
        image: STICKERS[Math.floor(Math.random() * STICKERS.length)],
        x: Math.random() * 100,
        y: Math.random() * 100,
        size: randomBetween(20, 100),
        duration,
        destination: Math.random() < 0.5
          ? { x: Math.random() * 100, y: Math.random() * 100 }
          : null,
      })
      hideTimer = setTimeout(hide, duration)
      scheduleNext()
    }, randomBetween(20000, 50000))
  }

  scheduleNext()
  return () => {
    clearTimeout(showTimer)
    clearTimeout(hideTimer)
  }
}
