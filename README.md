# Little December

A lightweight, frontend-only advent calendar. It has no login, backend, API,
or database. The 24 doors load content from `public/advent-calendar.json`;
opened days are remembered in the browser's `localStorage`.
The doors appear in a randomized order that is saved on the device. By
default, day N opens on December N and previously opened days remain available
to revisit. A door also cannot be opened before that date.

## Run locally

```sh
npm ci
npm run dev
```

## Calendar content

Edit `public/advent-calendar.json` and use one entry per day:

```json
{
  "days": {
    "1": { "type": "poem", "content": "In the quiet of the night" },
    "2": { "type": "link", "content": "https://example.com" },
    "3": { "type": "image", "content": "https://example.com/image.jpg" },
    "4": { "type": "image", "content": "/images/sample.svg" },
    "5": { "type": "audio", "content": "/audio/christmas-message.wav" },
    "6": { "type": "challenge", "content": "Make a cozy drink." },
    "7": { "type": "riddle", "content": "What has hands but cannot clap?", "answer": "A clock!" },
    "8": { "type": "coupon", "content": "A cozy movie night together.", "image": "/images/cozy-evening-badge.svg" },
    "9": { "type": "joke", "content": "What do you call a snowman in summer?", "punchline": "A puddle!" },
    "10": { "type": "fact", "content": "Snowflakes have six sides." }
  }
}
```

Supported types are `poem`, `link`, `image` (`online_image` is also accepted),
`audio`, `challenge`, `riddle`, `coupon`, `joke`, `fact`, and `quote`. `content` holds the text or
media URL; riddles also need an `answer`, jokes need a `punchline`, quotes may include an `author`,
and coupons need an `image` path
for their downloadable badge. Put local images and audio under `public/` and
use root-relative paths, such as `/audio/message.mp3` or `/images/badge.png`.
Coupon badges must be local so they can be downloaded. Links and remote
images or audio must use HTTP or HTTPS. Audio formats depend on browser
support; MP3, M4A, and WAV are common choices. The sample audio and badge
can be replaced with your own files. Days without content show a placeholder.

The examples for the new types are on days 5–10; open earlier days first.

## Build and run with Docker

```sh
npm run build
docker build -t little-december .
docker run --rm -p 8080:8080 little-december
```

The production build includes an installable PWA. App name and theme colors
can be set with `VITE_APP_NAME`, `VITE_THEME_COLOR`, and
`VITE_BACKGROUND_COLOR` at build time.
