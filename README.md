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
