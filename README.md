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
├── css/styles.css          # design system, layout, responsive, reduced motion
├── js/main.js              # scroll-linked motion engine + site interactions
├── assets/favicon.svg      # browser tab icon (SVG)
├── assets/favicon-32.png   # 32px fallback icon
├── assets/apple-touch-icon.png  # 180px home screen icon
└── assets/gallery/         # 1.jpg to 3.jpg, real site photographs
```

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
