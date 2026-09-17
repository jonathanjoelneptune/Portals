# Portals

**Portals** is a web prototype for jumping between live windows around Earth. The core interaction is a spatial transition where the next live destination is already moving inside the opening before it expands to fill the screen.

## Prototype features

- Curated live camera destinations around the world
- Warm/preloaded next destination where the provider permits it
- Four selectable transitions: Rift, Doorway, Reality Tear, Iris
- Previous / next / random navigation
- Wander mode for passive ambient viewing
- Local time and source link for each destination
- Automatic skip when the YouTube player reports a feed as removed, offline, or non-embeddable
- Fullscreen viewing

## Important playback note

Do not open `index.html` directly as a `file://` URL. YouTube now returns player error 153 when an embed request does not include the required HTTP referrer/client identity. The deployed GitHub Pages site is the intended way to run the prototype.

## Deployment

This repository contains a GitHub Pages workflow in `.github/workflows/pages.yml`. Every push to `main` deploys the static site once Pages is configured to use **GitHub Actions** in the repository settings.

Live site target: https://jonathanjoelneptune.github.io/Portals/
