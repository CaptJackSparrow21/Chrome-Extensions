# Chrome Extensions

A collection of browser extensions developed to improve productivity, simplify everyday browsing, and build useful tools for developers.

This repository contains personal browser extension projects, with a focus on practical functionality, clean interfaces, and solving real-world problems.

## Extensions

### 1. CF Problem Recommender

A browser extension for Codeforces users that recommends popular problems they haven't solved yet.

**Features**
- Automatically detects the logged-in Codeforces handle.
- Recommends the top 5 most-solved unsolved problems.
- Filter recommendations by problem rating.
- Filter problems by topic tags.
- Ranks problems based on the number of users who solved them.
- Displays recommendations directly below the Codeforces activity heatmap.
- Responsive user interface.

**Technologies**
- JavaScript
- HTML
- CSS
- Chrome Extension Manifest V3
- Codeforces API

**Version:** 2.5.0

**Source Code:** [CF Problem Recommender](./Chrome%20Extensions/CF-Problem-Recommender)

**Installation**
1. Download the extension ZIP from the Releases section.
2. Extract the downloaded ZIP file.
3. Open `chrome://extensions/` in Google Chrome or `brave://extensions/` in Brave.
4. Enable Developer mode.
5. Click **Load unpacked**.
6. Select the extracted extension folder containing `manifest.json`.

---

## Repository Structure

```text
Chrome-Extensions/
│
├── Chrome Extensions/
│   └── CF-Problem-Recommender/
│       ├── icons/
│       ├── background.js
│       ├── content.js
│       ├── manifest.json
│       └── README.md
│
└── README.md
```

## Technologies

The extensions in this repository may use technologies such as:

- JavaScript
- HTML
- CSS
- Chrome Extension APIs
- Browser APIs

## Purpose

This repository serves as a place to develop, experiment with, and maintain browser extensions that address practical problems and improve the browsing experience.

More extensions, features, and improvements will be added over time.