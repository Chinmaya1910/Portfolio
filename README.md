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
| `assets/theme.js` and `assets/site.js` | Theme persistence, mobile navigation, and deferred scene loading |
| `assets/motion.js` and `assets/motion.css` | Section tracking, one-time reveals, timeline progress, and interaction styles |
| `assets/hero-scene.js` | On-demand perspective rendering and a reversible field-to-lattice animation |
| `assets/signal-assembly.webp` and `assets/signal-lattice.webp` | Static artwork for both hero states |
| `studies/index.html` | The three earlier, independently playable motion studies |
| `assets/scene.js` | Canvas renderer for the three earlier studies |
| `assets/signal-field.webp`, `assets/contour-route.webp`, `assets/query-layers.webp` | Static artwork for reduced motion or unavailable canvas |
| `images/Chinmaya-Mallappa-Giriyappa-Resume.pdf` | Public-facing version of the current CV |

The home hero loads a WebP poster before it requests the renderer. Project artwork is illustrative, and the site uses zero third-party runtime dependencies.

## Motion design

The existing site is dependency-free static HTML with a 5:4 Canvas 2D hero, optional pointer tilt on project illustrations, sticky anchor navigation, and native case-study routes. The review at wide, tablet, and narrow effective widths found room for section feedback, clearer project interactions, and a timeline that shows where the reader is. The ice-blue, cobalt, and midnight-navy palette carries through both themes.

| Hero direction | Originality and personal connection | Interaction and accessibility | Cost and mobile fit |
| --- | --- | --- | --- |
| Kinetic sculpture | Floating forms communicate engineering and design, with an indirect link to the work | Strong still image and easy camera control. Passive rotation adds motion to the first screen | Medium geometry and lighting work. A smaller version fits mobile |
| Digital playground | A table-tennis-inspired rebound is personal and playful | Responsive physics rewards play. An interaction focused on timing needs an accessible alternative | Low rendering cost. Touch inputs require their own timing and affordances |
| **Signal to Structure** | A spatial field reorganizes into a readable lattice, echoing how the portfolio connects engineering and information design | One reversible action by pointer, touch, or keyboard. Two static states convey the same idea | Procedural Canvas geometry and a bounded draw loop. The shape stays legible on mobile |
| Spatial typography | Brings typography and layered graphics to the foreground | Visually distinctive. Perspective occlusion can compete with the name and role | Low asset weight with CSS. Narrow layouts need different compositions |
| Moving lens | Two blue halftone screens form a shifting moiré image, inspired by printmaking and optics | Strong focal point. High-frequency patterns risk visual discomfort and need substantial simplification | Low asset weight. Small screens and different pixel densities change the effect |

Signal to Structure is an abstract composition. The previous Signal Field, Contour Route, and Query Layers scenes are still playable from the Motion Studies page.

| Motion scale | Use |
| --- | --- |
| 180 ms | Hover, active navigation state, and button feedback |
| 320 ms | Card perspective, image easing, and supported case-study navigation |
| 600 ms | Small one-time entrance gestures and decorative line reveals |
| 900 ms | Hero reorganization. The canvas settles after the transition and draws again on interaction |

The CSS tokens and one-shot viewport observer handle site motion. The hero renders at a capped pixel ratio and stops work outside the viewport. Its two locally stored posters support reduced motion and unavailable canvas. SVG is used for the small hobby illustration. Cross-page transitions use the browser's native opt-in on the home and case-study pages, which retain ordinary links throughout.

## Content evidence and maintenance

- The November 2026 English CV supplies employment dates, role titles, tools, and education. It reports the More App API performance improvement and the regional order increase after the ONDC launch. The public PDF keeps the city and professional email and omits the street address and phone.
- The QueryBlocks technical evaluation dated 12 November 2026 supports the prototype architecture, filter-repair checks, and the 319,227 invoice-line extract. [UCI Online Retail](https://doi.org/10.24432/C5BW33) is the source dataset. Update the study status when participant work is complete.
- The 2021–22 bachelor’s team report supports the mariculture case. The case describes team work and the proposed system architecture.
- The public [Color-detection repository](https://github.com/Chinmaya1910/Color-detection) supports the independent project listing. The DevSecOps Note API is a team fork and the fluid simulation repository is private. Confirm permission and contribution details before adding private or team project links.
- The supplied CalArts, LearnQuest, and EDUCBA certificates support the creative coursework listed under About.
- Earlier and current CVs report different cost-reduction values for the seller migration. Confirm the baseline before publishing a cost figure.

## Local validation

Run `node --check` against each JavaScript file and `git diff --check` before merging. Check the site at a narrow and wide viewport, including its mobile menu, theme persistence, both signature-hero states, the earlier studies, keyboard focus, project routes, and reduced-motion posters. Treat actual-device Core Web Vitals as a deployment check.
