# TopDarkFlames Portfolio

Dark RGB portfolio for presenting my developer profile, current stack, studies, and public GitHub projects.

Live site: [topdarkflames.github.io](https://topdarkflames.github.io/)

## Overview

This portfolio is a static GitHub Pages site built with vanilla HTML, CSS, and JavaScript. It uses a dark neon interface, animated reveal effects, responsive layouts, and a live GitHub repository section that updates from the public GitHub API.

## Highlights

- Personal landing page with a dark RGB visual identity
- Responsive layout for desktop and mobile
- Featured repositories loaded from GitHub in real time
- Project cards sorted by recent activity
- Fallback project data when the GitHub API is unavailable
- Sections for stack, journey, projects, and contact

## Stack

`HTML` `CSS` `JavaScript` `GitHub Pages` `GitHub API`

## Featured System

The projects section reads public repositories from:

```text
https://api.github.com/users/TopDarkFlames/repos
```

When a repository is updated on GitHub, the portfolio can reflect that activity automatically on page load and while the page remains open.

## Repository

This repository contains the source for:

```text
https://topdarkflames.github.io/
```

Deploy is handled directly by GitHub Pages from the `main` branch.
