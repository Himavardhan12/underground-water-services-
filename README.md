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
├── index.html              # single-page site: hero, services, about, process, gallery, contact
├── privacy.html            # privacy policy
├── terms.html              # terms and conditions
├── css/styles.css          # design tokens, layout, responsive, reduced motion
├── js/main.js              # nav, reveal, lightbox, enquiry form
├── assets/favicon.svg      # browser tab icon (SVG)
├── assets/favicon-32.png   # 32px fallback icon
├── assets/apple-touch-icon.png  # 180px home screen icon
└── assets/gallery/         # 1.jpg to 3.jpg, real site photographs
```

## Design

Field-grade industrial editorial look, rebuilt from scratch:

- **Palette:** warm ink (`#15120f`), paper (`#f7f4ef`), burnt-orange accent
  (`#d24a12`), with dark sections for services, contact and footer.
- **Type:** Archivo for display, Inter for text, JetBrains Mono for labels and
  depth-scale details (loaded from Google Fonts).
- **Sections:** hero with photo and depth scale → dark services grid → about +
  features → 5-step process with depth gauge → gallery mosaic → dark contact
  with WhatsApp enquiry form.
- **Motion:** scroll progress bar, section spotlight in the nav, reveal-on-
  scroll, hover lifts. All motion respects `prefers-reduced-motion`.

## Gallery photos

The gallery shows the real site photographs in `assets/gallery/` (`1.jpg` to
`3.jpg`, about 1600 x 1200, JPG). To swap in different photos:

1. Replace the image files, keeping the same names.
2. Update the `alt` text and `figcaption` in `index.html` to match.

A missing image falls back to a styled "Photo coming soon" tile automatically.
Clicking a tile opens it in a lightbox.

## Behaviour

- The enquiry form runs entirely in the browser and opens WhatsApp with the
  message pre-filled. No backend, no stored form data, no cookies, no analytics.

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
