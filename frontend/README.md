# 💻 HistoryVoyage - Frontend React Client

This is the interactive map browser frontend client for **HistoryVoyage**, built with **React 19** and **Vite 8**. It provides a dashboard to explore, query, and search geo-indexed historical sites across Israel, Greece, and Italy.

---

## 🛠️ Technology Stack & Configurations

*   **Core**: React 19 + JavaScript (ESM modules)
*   **Build Engine**: Vite 8 + ESBuild
*   **Map Framework**: Leaflet via **react-leaflet**
*   **Fast Linter**: Oxlint (rules defined in `.oxlintrc.json`)
*   **Styling**: Premium custom Vanilla CSS (color palettes, translucent glassmorphism overlays, pulsing animations)

---

## 📂 Source Code Structure

```text
frontend/src/
├── assets/          # Static logos and local media
├── components/      # UI display blocks and Leaflet wrappers
│   ├── GeolocationHandler.jsx # Non-visual HTML5 geolocation tracker
│   ├── HeaderCard.jsx         # Floating control panel (categories, quick jumps, radius search)
│   ├── MapView.jsx            # Tile layers, markers, circles, and polygons rendering
│   ├── SearchBar.jsx          # Input debounced autocomplete search suggestions list
│   ├── SiteDrawer.jsx         # Sliding side sheet details panel
│   └── ZoomPrompt.jsx         # Glassmorphic low-zoom warning blocking overlay
├── hooks/           # State managers and backend APIs coordinators
│   ├── useDeepLink.js         # Syncs site selection from URL query params (?site=)
│   ├── useMapData.js          # Fetch trigger for bounding box and radius queries
│   └── useSiteDetails.js      # Multi-tiered metadata translation resolver workflow
├── pages/           # Page controllers
│   └── MapExplorer.jsx        # Main dashboard and context orchestrator
├── services/        # Fetch API clients
│   ├── api.js                 # Local Django REST API calls
│   ├── wikidataApi.js         # Wikidata entity details & Wikimedia images
│   └── wikipediaApi.js        # Wikipedia intro extracts & search queries
├── utils/           # Helper scripts
│   ├── distance.js            # Geodesic Haversine math & driving routing (OSRM)
│   └── wikipediaHelpers.js    # Wikipedia language mapping & fuzzy match heuristics
├── App.css          # Core layout rules
├── App.jsx          # Main client controller
├── index.css        # Theme variables, layouts, and animations
└── main.jsx         # React DOM mount point
```

---

## ⚙️ Key Component & Hook Interactions

### 1. The Map Controller (`MapExplorer` page)
Orchestrates shared react states and maps lifecycle events. When the viewport shifts, it collects new bounds and invokes the custom `useMapData` hook.

### 2. Multi-tiered Metadata Resolution (`useSiteDetails` hook)
When a marker is selected, this hook fires a chain of API calls to build a rich historical profile:
1. **Django API**: Pulls basic database fields and spatial boundaries (`boundary` polygon).
2. **Wikidata Entity API**: Resolves claims using the site's Wikidata ID. It evaluates the image property (`P18`) to fetch Wikimedia cover images.
3. **Wikipedia Article API**: Fetches localized summary texts. If no direct link is registered on Wikidata, it uses a word intersection heuristic (stripping stop-words like 'castle' and country labels) to search Wikipedia.

### 3. Distance Calculations (`utils/distance.js`)
- **Driving Route**: Calls the public **OSRM (Open Source Routing Machine) API** to fetch real road-driving distance from the user's current GPS position to the site.
- **Air Distance Fallback**: Calculates geodesic straight-line distance via the **Haversine formula** if OSRM is offline.

---

## 🚀 Running the Client

### 1. Install Dependencies
```bash
npm install
```

### 2. Start Hot-Reloading Development Server
```bash
npm run dev
```
The application will launch on `http://localhost:5173/`.

### 3. Build for Production
To bundle and optimize static assets into the `dist/` directory:
```bash
npm run build
```

### 4. Code Quality & Linting
Run Oxlint to perform fast code validation checks:
```bash
npm run lint
```
