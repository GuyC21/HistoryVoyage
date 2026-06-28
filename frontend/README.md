# 💻 HistoryVoyage - Frontend

This is the frontend React client for **HistoryVoyage**, built using **Vite**.

## 🛠️ Tech Stack & Configurations
*   **Core**: React 19 + JavaScript (ESM)
*   **Build Tool**: Vite 8
*   **Linter**: Oxlint (configured with `.oxlintrc.json`)
*   **Styling**: Vanilla CSS

---

## 🚀 Getting Started

### 1. Install Dependencies
Run the following command in this directory:
```bash
npm install
```

### 2. Start the Development Server
```bash
npm run dev
```
The application will be available at `http://localhost:5173/`.

### 3. Build for Production
To generate the static production build:
```bash
npm run build
```
This builds the application into the `dist/` directory.

### 4. Run Linter
To run the fast Oxlint code linter:
```bash
npm run lint
```

---

## 🗺️ Future Map Integration
In the next phase, the React frontend will integrate with interactive mapping libraries (such as Leaflet or MapLibre GL) to fetch and render the GeoJSON features returned by the GeoDjango spatial endpoints:
*   **Bounding Box Search**: Updates the map markers dynamically based on the current map viewport boundaries.
*   **Nearby Search**: Allows users to click on the map or input a location to find historical sites within a specific radius.
