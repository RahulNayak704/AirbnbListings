const CONFIG = {
  jsonUrl: "./data/listings.json",
  maxListings: 50,
  maxAmenitiesShown: 5,
};

const els = {
  listings: document.getElementById("listings"),
  statusText: document.getElementById("statusText"),
  errorBox: document.getElementById("errorBox"),
  loadingBox: document.getElementById("loadingBox"),
  resetBtn: document.getElementById("resetBtn"),
  searchInput: document.getElementById("searchInput"),
  maxPriceInput: document.getElementById("maxPriceInput"),
};

let ALL = []; // normalized listings

init();

function init() {
  wireUI();
  void loadAndRender();
}

function wireUI() {
  const onControlsChange = debounce(() => render(), 80);

  els.searchInput.addEventListener("input", onControlsChange);
  els.maxPriceInput.addEventListener("input", onControlsChange);

  els.resetBtn.addEventListener("click", () => {
    els.searchInput.value = "";
    els.maxPriceInput.value = "";
    render();
  });
}

async function loadAndRender(opts = {}) {
  setError("");
  setLoading(true);
  setStatus(`Fetching ${CONFIG.jsonUrl}…`);

  try {
    const raw = await fetchJson(CONFIG.jsonUrl, { forceReload: !!opts.forceReload });
    const extracted = extractListingsArray(raw);
    ALL = extracted.map(normalizeListing).filter(Boolean).slice(0, CONFIG.maxListings);

    if (ALL.length === 0) {
      throw new Error(
        `Loaded JSON but couldn't find listings.\nExpected either an array, or an object containing an array like "listings" / "results".`
      );
    }

    setStatus(`Loaded ${ALL.length} listings. Use the search and max price filters.`);
    render();
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    setError(
      `Couldn't load listings.\n\n${msg}\n\nMake sure:\n- You have a JSON file at ${CONFIG.jsonUrl}\n- You're running a local server (not file://)\n- The JSON contains an array of listings`
    );
    setStatus("Error loading JSON.");
    clearListings();
  } finally {
    setLoading(false);
  }
}

function render() {
  setError("");
  const query = els.searchInput.value.trim().toLowerCase();
  const maxPrice = parseNumberOrNull(els.maxPriceInput.value);

  let items = ALL.slice();

  if (query) {
    items = items.filter((x) => {
      const hay = [
        x.name,
        x.description,
        x.hostName,
        ...(x.amenities || []),
        x.priceText,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return hay.includes(query);
    });
  }

  if (maxPrice != null) items = items.filter((x) => (x.priceValue ?? -Infinity) <= maxPrice);
  items = sortListings(items, query ? "relevance" : "none", query);

  clearListings();
  const frag = document.createDocumentFragment();

  for (const listing of items) {
    frag.appendChild(renderCard(listing));
  }

  els.listings.appendChild(frag);

  const suffix = items.length === 1 ? "" : "s";
  setStatus(`Showing ${items.length} listing${suffix}.`);
}

function renderCard(listing) {
  const card = document.createElement("article");
  card.className = "col-12 col-md-4";
  card.dataset.id = listing.id;

  const inner = document.createElement("div");
  inner.className = "card h-100";

  const media = document.createElement("div");
  media.className = "card-img-top-wrapper";

  const img = document.createElement("img");
  img.loading = "lazy";
  img.alt = listing.name ? `Thumbnail for ${listing.name}` : "Listing thumbnail";
  img.src = listing.thumbnailUrl || placeholderImageDataUrl();
  img.className = "card-img-top listing-card-img";
  media.appendChild(img);

  const body = document.createElement("div");
  body.className = "card-body";

  const title = document.createElement("h3");
  title.className = "card-title h6";
  title.textContent = listing.name || "Untitled listing";
  body.appendChild(title);

  const desc = document.createElement("p");
  desc.className = "card-text small";
  desc.textContent = clampText(listing.description || "No description provided.", 160);
  body.appendChild(desc);

  const meta = document.createElement("div");
  meta.className = "d-flex align-items-center justify-content-between mb-2";

  const host = document.createElement("div");
  host.className = "d-flex align-items-center gap-2";
  const hostImg = document.createElement("img");
  hostImg.loading = "lazy";
  hostImg.alt = listing.hostName ? `Host photo for ${listing.hostName}` : "Host photo";
  hostImg.src = listing.hostPictureUrl || placeholderAvatarDataUrl();
  hostImg.width = 32;
  hostImg.height = 32;
  hostImg.className = "rounded-circle";
  host.appendChild(hostImg);

  const hostName = document.createElement("div");
  hostName.className = "small";
  hostName.textContent = listing.hostName || "Unknown host";
  host.appendChild(hostName);

  const price = document.createElement("div");
  price.className = "fw-bold";
  price.textContent = listing.priceText || "";

  meta.appendChild(host);
  meta.appendChild(price);
  body.appendChild(meta);

  const amenities = document.createElement("div");
  amenities.className = "listing-amenities text-muted";
  const list = (listing.amenities || []).slice(0, CONFIG.maxAmenitiesShown);
  if (list.length === 0) {
    amenities.textContent = "No amenities listed";
  } else {
    amenities.textContent = list.join(" · ");
    if ((listing.amenities?.length ?? 0) > CONFIG.maxAmenitiesShown) {
      amenities.textContent += ` · +${listing.amenities.length - CONFIG.maxAmenitiesShown} more`;
    }
  }
  body.appendChild(amenities);

  inner.appendChild(media);
  inner.appendChild(body);
  card.appendChild(inner);
  return card;
}

function clearListings() {
  els.listings.innerHTML = "";
}

function setLoading(isLoading) {
  els.loadingBox.hidden = !isLoading;
}

function setStatus(text) {
  els.statusText.textContent = text;
}

function setError(text) {
  els.errorBox.hidden = !text;
  els.errorBox.textContent = text || "";
}

async function fetchJson(url, { forceReload } = {}) {
  // cache-bust for reload button
  const finalUrl = forceReload ? `${url}?t=${Date.now()}` : url;
  const res = await fetch(finalUrl, { headers: { Accept: "application/json" } });
  if (!res.ok) {
    throw new Error(`HTTP ${res.status} ${res.statusText}`);
  }
  return await res.json();
}

function extractListingsArray(raw) {
  if (Array.isArray(raw)) return raw;
  if (!raw || typeof raw !== "object") return [];

  // Common shapes
  if (Array.isArray(raw.listings)) return raw.listings;
  if (Array.isArray(raw.results)) return raw.results;
  if (Array.isArray(raw.data)) return raw.data;

  // sometimes nested once more
  if (raw.payload && Array.isArray(raw.payload.listings)) return raw.payload.listings;
  if (raw.payload && Array.isArray(raw.payload.results)) return raw.payload.results;

  return [];
}

function normalizeListing(x) {
  if (!x || typeof x !== "object") return null;

  const id =
    stringOrNull(x.id) ??
    stringOrNull(x.listing_id) ??
    stringOrNull(x._id) ??
    // last resort: deterministic-ish id from name + host
    hashId(`${stringOrNull(x.name) ?? ""}|${stringOrNull(x.host_name) ?? ""}|${stringOrNull(x.price) ?? ""}`);

  const name = stringOrNull(x.name) ?? stringOrNull(x.listing_name) ?? stringOrNull(x.title);
  const description = stringOrNull(x.description) ?? stringOrNull(x.summary) ?? stringOrNull(x.space);

  const thumbnailUrl =
    stringOrNull(x.thumbnail_url) ??
    stringOrNull(x.picture_url) ??
    stringOrNull(x.xl_picture_url) ??
    (x.images && stringOrNull(x.images.picture_url)) ??
    (x.images && stringOrNull(x.images.thumbnail_url)) ??
    null;

  const hostName = stringOrNull(x.host_name) ?? (x.host && stringOrNull(x.host.name)) ?? stringOrNull(x.host?.host_name);
  const hostPictureUrl =
    stringOrNull(x.host_picture_url) ??
    stringOrNull(x.host_thumbnail_url) ??
    (x.host && (stringOrNull(x.host.picture_url) ?? stringOrNull(x.host.thumbnail_url))) ??
    null;

  const amenities = normalizeAmenities(x.amenities ?? x.amenity ?? x.features);

  const priceTextRaw = x.price ?? x.nightly_price ?? x.price_per_night ?? x.rate;
  const priceValue = parsePrice(priceTextRaw);
  const priceText = formatPrice(priceTextRaw, priceValue);

  return {
    id,
    name,
    description,
    amenities,
    hostName,
    hostPictureUrl,
    priceValue,
    priceText,
    thumbnailUrl,
  };
}

function normalizeAmenities(v) {
  if (!v) return [];
  if (Array.isArray(v)) return v.map((x) => String(x).trim()).filter(Boolean);

  if (typeof v === "string") {
    // try to parse formats like: "{TV,Wifi,Kitchen}" or '["TV","Wifi"]'
    const trimmed = v.trim();
    if (!trimmed) return [];

    try {
      const maybeJson = JSON.parse(trimmed);
      if (Array.isArray(maybeJson)) return maybeJson.map((x) => String(x).trim()).filter(Boolean);
    } catch {
      // ignore
    }

    const cleaned = trimmed
      .replace(/^\{/, "")
      .replace(/\}$/, "")
      .replace(/^\[/, "")
      .replace(/\]$/, "");

    return cleaned
      .split(",")
      .map((s) => s.replace(/^"|"$/g, "").trim())
      .filter(Boolean);
  }

  return [];
}

function parsePrice(v) {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v !== "string") return null;

  const cleaned = v.replace(/[^\d.]/g, "");
  if (!cleaned) return null;
  const num = Number(cleaned);
  if (!Number.isFinite(num)) return null;
  return num;
}

function formatPrice(raw, numeric) {
  if (typeof raw === "string" && raw.trim()) return raw.trim();
  if (typeof numeric === "number" && Number.isFinite(numeric)) return `$${numeric.toFixed(0)} / night`;
  return null;
}

function sortListings(items, sort, query) {
  // Simple: keep original order, unless there is a search term.
  if (!query) return items;

  return items
    .map((x) => ({ x, s: relevanceScore(x, query) }))
    .sort((a, b) => b.s - a.s)
    .map((r) => r.x);
}

function relevanceScore(x, query) {
  const q = query.toLowerCase();
  let score = 0;
  if ((x.name ?? "").toLowerCase().includes(q)) score += 10;
  if ((x.hostName ?? "").toLowerCase().includes(q)) score += 6;
  if ((x.description ?? "").toLowerCase().includes(q)) score += 4;
  if ((x.amenities ?? []).some((a) => a.toLowerCase().includes(q))) score += 3;
  return score;
}

function parseNumberOrNull(v) {
  const s = String(v ?? "").trim();
  if (!s) return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

function stringOrNull(v) {
  if (v == null) return null;
  const s = String(v).trim();
  return s ? s : null;
}

function clampText(text, maxChars) {
  const t = String(text ?? "");
  if (t.length <= maxChars) return t;
  return `${t.slice(0, Math.max(0, maxChars - 1)).trim()}…`;
}

function debounce(fn, delayMs) {
  let t = null;
  return (...args) => {
    if (t) window.clearTimeout(t);
    t = window.setTimeout(() => fn(...args), delayMs);
  };
}

function hashId(s) {
  // tiny stable hash to avoid null ids; not crypto
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return `h_${(h >>> 0).toString(16)}`;
}

function placeholderImageDataUrl() {
  // Small SVG placeholder (no external assets needed)
  const svg = encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="640" height="400">
      <defs>
        <linearGradient id="g" x1="0" x2="1">
          <stop offset="0" stop-color="#ff385c" stop-opacity="0.20"/>
          <stop offset="1" stop-color="#00d19f" stop-opacity="0.16"/>
        </linearGradient>
      </defs>
      <rect width="100%" height="100%" fill="url(#g)"/>
      <rect x="20" y="20" width="600" height="360" rx="22" fill="rgba(255,255,255,0.10)" stroke="rgba(255,255,255,0.18)"/>
      <text x="50%" y="52%" fill="rgba(255,255,255,0.75)" font-family="Inter, Arial" font-size="18" text-anchor="middle">
        No thumbnail
      </text>
    </svg>`
  );
  return `data:image/svg+xml;charset=utf-8,${svg}`;
}

function placeholderAvatarDataUrl() {
  const svg = encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="128" height="128">
      <defs>
        <linearGradient id="g" x1="0" x2="1">
          <stop offset="0" stop-color="#5865f2" stop-opacity="0.25"/>
          <stop offset="1" stop-color="#ff385c" stop-opacity="0.25"/>
        </linearGradient>
      </defs>
      <rect width="100%" height="100%" rx="64" fill="url(#g)"/>
      <circle cx="64" cy="52" r="20" fill="rgba(255,255,255,0.45)"/>
      <path d="M24 112c8-22 24-34 40-34s32 12 40 34" fill="rgba(255,255,255,0.40)"/>
    </svg>`
  );
  return `data:image/svg+xml;charset=utf-8,${svg}`;
}

