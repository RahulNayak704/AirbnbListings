# Airbnb Listings Demo (JS + DOM)

This project loads and displays the **first 50 listings** from a local JSON file.

## Add your JSON file

1. Create a folder named `data/`
2. Put your JSON file at:
   - `data/listings.json`

> If you don’t have it yet, there’s an example file at `data/listings.sample.json`.

## Run locally (required for fetch)

`fetch()` will not load JSON from a `file://` path. Use a local server.

From this folder, run:

```bash
python3 -m http.server 5173
```

Then open:
- `http://localhost:5173`

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
4. Wait for the build to finish.`

