<div align="center">

# TopDarkFlames Portfolio

Dark SaaS-style portfolio with a live WebGL fiber-optic light beam, built to present my developer profile, studies, stack, and live GitHub projects.

[![Portfolio](https://img.shields.io/badge/OPEN_PORTFOLIO-DC143C?style=for-the-badge&logo=githubpages&logoColor=white)](https://topdarkflames.github.io/)
[![GitHub Pages](https://img.shields.io/badge/GITHUB_PAGES-111111?style=for-the-badge&logo=github&logoColor=white)](https://topdarkflames.github.io/)
[![Status](https://img.shields.io/badge/STATUS-LIVE-32f2a2?style=for-the-badge)](https://topdarkflames.github.io/)

</div>

---

## Overview

This repository powers my personal portfolio at:

```text
https://topdarkflames.github.io/
```

The site is a single static `index.html` (vanilla HTML, CSS and JavaScript, no build step). Its signature is a real-time WebGL2 beam: hundreds of fine glowing fibers with light pulses flowing through them, depth of field, bloom and drifting particles, laid out as one continuous ribbon that runs down the whole page and bends as you scroll. Browsers without WebGL get a lighter animated fallback.

## Visual Identity

- near-black background with an electric blue accent
- fiber-optic light beam (WebGL2, additive blending, depth of field)
- frosted glass panels, including a 3D-tilted pipeline card in the hero
- serif italic accents in the headlines, monospace labels
- scroll-driven reveals and an accent card that grows from the TF mark

## Features

- Responsive layout for desktop and mobile
- Live project cards loaded from public GitHub repositories
- Repositories sorted by recent activity
- Weekly activity chart and main-language ring from the GitHub API
- Link to the GitHub profile if the API is unavailable
- GitHub Pages deploy with no build step

## Stack

<div align="center">

![HTML5](https://img.shields.io/badge/HTML5-111?style=for-the-badge&logo=html5&logoColor=E34F26)
![CSS3](https://img.shields.io/badge/CSS3-111?style=for-the-badge&logo=css3&logoColor=1572B6)
![JavaScript](https://img.shields.io/badge/JavaScript-111?style=for-the-badge&logo=javascript&logoColor=F7DF1E)
![GitHub Pages](https://img.shields.io/badge/GitHub_Pages-111?style=for-the-badge&logo=github&logoColor=FFFFFF)
![GitHub API](https://img.shields.io/badge/GitHub_API-111?style=for-the-badge&logo=github&logoColor=32f2a2)

</div>

## Live GitHub Projects

The projects section reads public repositories from:

```text
https://api.github.com/users/TopDarkFlames/repos
```

When I update or publish a public repository, the portfolio can reflect the latest activity automatically.

## Project Structure

```text
.
|-- index.html   whole site: markup, styles, WebGL beam and GitHub data
`-- README.md
```

## Deploy

The site is deployed directly through GitHub Pages from the `main` branch.

---

<div align="center">

Built by [TopDarkFlames](https://github.com/TopDarkFlames)

</div>
