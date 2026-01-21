# Airbnb Listings Demo

This project loads and displays the **first 50 listings** from a local JSON file using **AJAX via `fetch()` + `async/await`**.

## Add your JSON file

1. Create a folder named `data/`
2. Put your JSON file at:
   - `data/listings.json`

> If you don’t have it yet, there’s an example file at `data/listings.sample.json`.

## Required fields displayed

Each listing card shows:
- Listing **name**
- **description**
- **amenities**
- **host** (name + photo)
- **price**
- **thumbnail**

## Extras

- **Search** across name/description/host/amenities
- **Max price filter**

## Deploy (GitHub Pages)

1. Push this repo to GitHub.
2. In GitHub: **Settings → Pages**
3. Source: **Deploy from a branch**, select `main` and `/ (root)`.
4. Wait for the build to finish.

Deployment link:
- [Live site](https://rahulnayak704.github.io/AirbnbListings/)

