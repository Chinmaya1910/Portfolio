# Chinmaya Mallappa Giriyappa · Portfolio

A static portfolio for a software engineer and master’s student in Heilbronn, Germany. The landing page leads with selected work and links to four case studies. It preserves the original section links and GitHub Pages structure.

## Run locally

From this repository:

```sh
python3 -m http.server 8000
```

Open [http://localhost:8000/](http://localhost:8000/). The root `index.html` can also be opened directly in a browser. No package installation or build is required.

## Deploy on GitHub Pages

1. Review the changes on the working branch and merge them into the branch configured for Pages.
2. In the GitHub repository, open **Settings → Pages** and use **Deploy from a branch** with the selected branch and **/ (root)** as the source.
3. After the Pages deployment succeeds, open the [portfolio](https://chinmaya1910.github.io/Portfolio/) and check its four case-study routes and CV download. If you change the host, update the canonical and Open Graph URLs in the HTML files.

## Site structure

| Path | Purpose |
| --- | --- |
| `index.html` | Intro, selected work, experience, research, about, skills, and contact |
| `projects/*/index.html` | Shareable case studies with semantic HTML and page metadata |
| `assets/site.css` | Theme tokens, layout, components, and responsive styles |
| `assets/theme.js` and `assets/site.js` | Theme persistence, mobile navigation, card tilt, and optional scene loading |
| `assets/scene.js` | Perspective projection of 3D coordinates onto Canvas 2D and on-demand animation |
| `assets/signal-field.webp`, `assets/contour-route.webp`, `assets/query-layers.webp` | Static artwork for reduced motion or unavailable canvas |
| `images/Chinmaya-Mallappa-Giriyappa-Resume.pdf` | Public-facing version of the current CV |

The hero loads its default WebP poster before it requests the renderer. The artwork chooser works with the static posters under reduced motion. When motion is enabled, the camera responds to a fine pointer and each scene has a keyboard- and touch-accessible action. The renderer draws on demand using Canvas 2D, with zero third-party runtime dependencies. Project artwork is illustrative.

## Design decisions

The palette pairs ice-blue surfaces with navy type and cobalt actions. The dark theme uses the same blue hues with lighter text and interactive accents.

| Hero concept | Interaction and design intent |
| --- | --- |
| **Signal field** | Send a pulse through an abstract 3D ribbon. This is the default because its silhouette holds up at phone width and connects to both software systems and motion design. |
| **Contour route** | Trace a cycling-inspired route across a sculpted elevation map. The lighter artwork gives the viewer a quieter option. |
| **Query layers** | Separate and reassemble plates representing inputs, query structure, and results. This option has the most direct link to the thesis. |

## Content evidence and maintenance

- The November 2026 English CV supplies employment dates, role titles, tools, and education. It reports the More App API performance improvement and the regional order increase after the ONDC launch. The public PDF keeps the city and professional email and omits the street address and phone.
- The QueryBlocks technical evaluation dated 12 November 2026 supports the prototype architecture, filter-repair checks, and the 319,227 invoice-line extract. [UCI Online Retail](https://doi.org/10.24432/C5BW33) is the source dataset. Update the study status when participant work is complete.
- The 2021–22 bachelor’s team report supports the mariculture case. The case describes team work and the proposed system architecture.
- The public [Color-detection repository](https://github.com/Chinmaya1910/Color-detection) supports the independent project listing. The DevSecOps Note API is a team fork and the fluid simulation repository is private. Confirm permission and contribution details before adding private or team project links.
- The supplied CalArts, LearnQuest, and EDUCBA certificates support the creative coursework listed under About.
- Earlier and current CVs report different cost-reduction values for the seller migration. Confirm the baseline before publishing a cost figure.

## Local validation

Run `node --check` against each JavaScript file and `git diff --check` before merging. Check the site at a narrow and wide viewport, including its mobile menu, theme persistence, artwork choices, keyboard focus, project routes, and reduced-motion posters. Treat actual-device Core Web Vitals as a deployment check.
