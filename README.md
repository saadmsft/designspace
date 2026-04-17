# Space Studio — Website

A niche, editorial website for **Space Studio**, a multidisciplinary design practice
offering Architecture, Interior, Furniture and Product Design services.

## Design

- **Palette:** Black `#0a0a0a` · Grey `#8a8a8a` · White `#f5f5f2`
- **Typography:** Cormorant Garamond (display serif) + Inter (sans)
- **Aesthetic:** Monochrome, editorial, generous whitespace, slow reveals

## Pages

| File | Purpose |
| --- | --- |
| `index.html` | Hero, services overview, selected projects, stats, CTA |
| `services.html` | Detailed breakdown of each of the 4 services + pricing |
| `projects.html` | Filterable portfolio grid |
| `about.html` | Studio story + team |
| `contact.html` | Studio info + enquiry form (with service & budget fields — supports selling services) |

## Run

It's a fully static site. Just open `index.html` in a browser, or serve locally:

```bash
cd space-studio
python3 -m http.server 8080
# visit http://localhost:8080
```

## Structure

```
space-studio/
├── index.html
├── services.html
├── projects.html
├── about.html
├── contact.html
├── css/styles.css
└── js/main.js
```

## Features

- Fully responsive (desktop → mobile)
- Intro loader animation
- Sticky nav with scroll state + mix-blend-mode over hero
- Mobile slide-in menu
- Scroll-reveal animations (IntersectionObserver)
- Infinite marquee of disciplines
- Project filter by category
- Working contact form (demo submit — wire to backend/email service of choice)
- Image placeholders via CSS gradients — swap in real photography when available
