# Sai Underground Water Services website

Borewell drilling, scanning and pumpset installation website for a Bengaluru
business. Static HTML, CSS and JavaScript. No build step, no frameworks, no
tracking scripts.

## Run it

Open `index.html` directly, or serve the folder:

```bash
cd sai
python3 -m http.server 8000
# then open http://localhost:8000
```

## Structure

```
sai/
├── index.html              # page content + the SVG borewell journey scene
├── privacy.html            # privacy policy
├── terms.html              # terms and conditions
├── vercel.json             # deploy config + all security response headers
├── css/styles.css          # design system, layout, responsive, reduced motion
├── css/noscript.css        # fallback layout, loaded only when JS is off
├── css/noscript-legal.css  # same, for privacy.html and terms.html
├── js/i18n.js              # language engine + English strings (source of truth)
├── js/lang-kn.js           # Kannada
├── js/lang-hi.js           # Hindi
├── js/lang-te.js           # Telugu
├── js/lang-ta.js           # Tamil
├── js/main.js              # scroll-linked motion engine + site interactions
├── tests/run-tests.py      # executable test suite (see Tests)
├── tests/harness.html      # drives the real index.html in an iframe
├── assets/favicon.svg      # browser tab icon (SVG)
├── assets/favicon-32.png   # 32px fallback icon
├── assets/apple-touch-icon.png  # 180px home screen icon
└── assets/gallery/         # 1.jpg to 3.jpg, real site photographs
```

## Languages

The site ships in five languages: English, Kannada (ಕನ್ನಡ), Hindi (हिन्दी),
Telugu (తెలుగు) and Tamil (தமிழ்). A globe button in the header opens the
language menu; the choice is stored in `localStorage` under `sai-lang` and
follows the visitor across all three pages.

How it works:

- Elements opt in with `data-i18n="key"` (plain text), `data-i18n-html="key"`
  (text containing markup) or `data-i18n-attrs="attr:key,attr:key"` for
  attributes such as `placeholder`, `alt`, `aria-label`, `title` and the
  `<meta name="description">` content.
- `js/i18n.js` holds the English dictionary — it is the source of truth — and
  applies the selected language, updates `<html lang>` (which switches the font
  stack to Noto Sans for that script) and persists the choice.
- Each other language is one file that calls
  `window.SaiI18n.register("xx", { ... })` with the same keys in the same
  order. English is used as the fallback for any missing key.

To change a string, edit it in `js/i18n.js` and in each `js/lang-*.js`. To add
a string, add it to all five files and reference the key from the markup.

## Gallery photos

The gallery shows the real site photographs in `assets/gallery/` (`1.jpg` to
`3.jpg`, about 1600 x 1200, JPG). To swap in different photos:

1. Replace the image files, keeping the same names.
2. Update the `alt` text and `figcaption` in `index.html` to match.

A missing image falls back to a styled "Photo coming soon" tile automatically.

## Scroll experience

The borewell journey is one continuous timeline driven by scroll position:

| Scroll progress | Scene |
| --- | --- |
| 0 to 14% | Rig arrival, dust and atmospheric motion, hero headline |
| 14 to 30% | Ground opens into a cutaway, drill breaks through |
| 30 to 55% | Drill descends through soil, gravel and hard rock (depth readout) |
| 55 to 70% | Borewell scanning probe and sonar rings |
| 70 to 86% | Pumpset and pipe lowered into position |
| 86 to 100% | Return to surface, flowing water finale |

How it is built:

- Single `requestAnimationFrame` loop, one scroll-progress value, SVG transforms.
- Pinned scene on desktop, shorter sequence and lighter particles on mobile.
- Pauses when the scene is off screen.
- `prefers-reduced-motion` gets a static composed frame, no pin, no animation.
- The enquiry form opens WhatsApp with the message pre-filled. No backend, no
  stored form data, no cookies, no analytics.

## Services in the scene

There is no separate services section. The four services are captions that
surface beside the drill, each one on the layer its own tool works on: 01 when
the bit breaks into the second layer, 02 as the probe runs the third, 03 while
the pump is set on the fourth, 04 when the water comes up.

The caption windows are derived from the scene geometry (`pAtTip()` in
`js/main.js` reads the strata tops out of `LAYER_Y`), so they follow the scene
if it is ever retimed instead of being retyped by hand. Each caption's kicker
tracks the live position of its tool, and the Services nav link scrolls to the
moment the first service appears.

## Headless checks

Two query parameters exist for automated checks. Both are off in normal use.

- `?p=<0..1>` renders one frame at that journey progress and writes the scene
  state (camera, tool depths, depth readout, active caption) into a
  `<pre id="debug">` element. The scroll loop is held off while it is on.
- `?y=<px>` jumps to a scroll offset once loaded, for checking reveals, nav
  tone and the section spotlight at a depth a real user reaches by scrolling.

## Tests

```bash
python3 tests/run-tests.py
```

The runner starts a local HTTP server that applies the exact response headers
declared in `vercel.json`, so the Content-Security-Policy is exercised for real
instead of assumed. It then runs static checks (secrets, inline script/style,
brand rules, git hygiene), header assertions, and browser checks in headless
Chrome: form validation and language switching through the production code in
`tests/harness.html`, scene caption timing at four depths, scroll and reveal
behaviour, reduced motion, and the no-JavaScript fallback driven through the
DevTools protocol with scripting switched off. It exits non-zero if anything
fails.

Notes on the harness:

- Production sends `frame-ancestors 'none'`, which correctly refuses to be
  framed by anyone. The test server therefore serves the byte-identical
  `index.html` at a test-only path (`/frame-target.html`) with framing allowed
  just there; separate assertions confirm every real path still denies framing.
  That path exists only in the test server, not in production.

## Security

There is no backend, no database, no authentication and no build step, so
there are no API keys, sessions, cookies or server-side input to protect. The
enquiry form is completed in the browser and opens WhatsApp with the message
pre-filled; nothing is stored or posted.

Response headers are declared once in `vercel.json` and applied to every path:

| Header | Purpose |
| --- | --- |
| `Content-Security-Policy` | `default-src 'self'`, no inline or `eval` scripts, JSON-LD allowed by SHA-256 hash, Google Fonts from its own origins, `frame-ancestors 'none'`, `base-uri 'self'`, `form-action 'self'` |
| `X-Content-Type-Options: nosniff` | stops MIME sniffing |
| `X-Frame-Options: DENY` | clickjacking, belt and braces with `frame-ancestors` |
| `Strict-Transport-Security` | HTTPS for one year, includeSubDomains, preload |
| `Referrer-Policy` | send only the origin on cross-site navigations |
| `Permissions-Policy` | camera, microphone, geolocation, payment, USB all denied |

The CSP has real consequences for how the site is written, so keep these rules
when editing:

- No inline `<script>`, no `on*=` handlers, no `javascript:` URLs.
- No inline `<style>` blocks or `style="..."` attributes. Setting styles from
  JavaScript through the CSSOM (`el.style.x = ...`) is allowed and is what the
  scroll engine uses.
- The no-JavaScript fallback CSS lives in `css/noscript.css` and
  `css/noscript-legal.css`, linked from inside `<noscript>` so it is only
  fetched when scripting is off.
- If the JSON-LD block in `index.html` changes, recompute its hash or the CSP
  will block it:

```bash
python3 - <<'PY'
import re, hashlib, base64
src = open('index.html', encoding='utf8').read()
for b in re.findall(r'<script type="application/ld\+json">(.*?)</script>', src, re.S):
    print("'sha256-" + base64.b64encode(hashlib.sha256(b.encode()).digest()).decode() + "'")
PY
```

Secrets: none exist in the repository, and the test suite fails if any appear.
`.env`, key files and `.DS_Store` are ignored and asserted absent from git.

## Production deployment checklist

Before launch:

- [ ] Run `python3 tests/run-tests.py` and get a green run on the commit you
      are deploying
- [ ] Deploy, then confirm the headers actually arrive from the CDN:

```bash
curl -sI https://YOUR-DOMAIN/ | grep -iE 'content-security-policy|x-frame-options|strict-transport'
curl -sI https://YOUR-DOMAIN/privacy.html | grep -i content-security-policy
```

- [ ] Check the browser console on `/`, `/privacy.html` and `/terms.html` for
      CSP violations after deploy (the JSON-LD hash in particular)
- [ ] Test the enquiry form, the language switcher and the scroll journey on a
      real phone
- [ ] Verify HTTPS redirects `http://` to `https://` and that the certificate
      auto-renews (Vercel handles both)

Operational notes:

- **HSTS preload:** the header is already marked `preload`. Only submit the
  domain to the HSTS preload list once HTTPS is confirmed working, because
  removal from the list is slow. Dropping `preload` from `vercel.json` before
  launch is fine.
- **Rollback:** every deploy is a git commit. Roll back from the Vercel
  dashboard to the previous deployment, or `git revert` and push. Nothing
  depends on generated artefacts, so a rollback cannot corrupt data.
- **Monitoring:** the site has no first-party logging by design (no analytics,
  no tracking). Add an external uptime monitor (UptimeRobot, Better Stack and
  similar) against `/` and `/privacy.html`; those services need an account and
  credentials, so this is set up outside this repository.
- **CI:** run the test suite in CI on every push. This needs a repository on
  GitHub or similar plus CI credentials, so it is a recommendation rather than
  something configured here.
- **Backups:** git is the backup. Keep at least one off-machine clone.
- **Dependencies:** there are none, so there is nothing to patch. Do not add a
  package manifest for features that plain HTML, CSS and JavaScript already
  handle.

## Launch checklist

- [ ] Connect the custom domain and enable HTTPS
- [x] Favicon and apple touch icon in place
- [x] Privacy policy page
- [x] Terms and conditions page
- [x] No third-party builder badge or watermark, no analytics, no tracking pixels
- [x] Replace gallery placeholders with real site photographs
- [ ] Confirm opening hours, phone, email and address with the client
- [ ] Have a lawyer review `privacy.html` and `terms.html`

## Editing content

- Phone: `+91 95357 50539`
- Email: `saihimavardhan001@gmail.com`
- Address: Good Weel School, 5th Cross Rd, Bhuvaneshwari Nagar, Kanaka Nagar,
  RT Nagar, Bengaluru, Karnataka 560032

Search these values in `index.html`, `privacy.html` and `terms.html` (and the
`tel:` / `mailto:` links) to update them.
