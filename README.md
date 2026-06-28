# 🗺️ HistoryVoyage

HistoryVoyage is a geospatial full-stack application designed to explore and search historical and archaeological sites (castles, ruins, monuments, ancient temples, monasteries, and tombs) across Israel, Greece, and Italy. 

The project uses **GeoDjango** containerized with Docker, a **PostgreSQL** database hosted on **Supabase** with the **PostGIS** spatial extension, and a **React + Vite** frontend.

---

## 🏗️ Project Architecture

The workspace is organized as a full-stack monorepo:

```text
historyVoyage/
├── backend/            # GeoDjango API & Seeding Engine
│   ├── config/         # Django settings, WSGI/ASGI configurations, and urls
│   ├── heritage/       # Spatial models, views, serializers, and custom seed commands
│   ├── Dockerfile.dev  # Docker configuration for development (contains GDAL/GEOS/PROJ)
│   ├── docker-compose.yml # Backend container orchestration
│   └── requirements.txt # Python dependency file
├── frontend/           # React + Vite client app (to be integrated with map components)
│   ├── src/            # React application source code
│   └── package.json    # Javascript package file
└── README.md           # Project Documentation (this file)
```

---

## 🗄️ Spatial Database & Seeding Stats

The database is a cloud-hosted PostgreSQL instance running on Supabase with the **PostGIS** extension enabled. 

A custom Django seeding command harvests named historical sites directly from **OpenStreetMap** using the **Overpass API**. The data was successfully harvested, deduplicated, and synchronized in the database.

### Seeding Breakdown
*   **Total Seeded Sites**: `29,795`
*   **Country Distribution**:
    *   🇮🇹 **Italy**: `23,418` sites
    *   🇬🇷 **Greece**: `4,714` sites
    *   🇮🇱 **Israel**: `1,663` sites
*   **Categories**:
    *   🏺 **Archaeological Sites**: `9,257`
    *   🏚️ **Ruins**: `7,490`
    *   🗽 **Monuments**: `5,085`
    *   🏰 **Castles**: `4,430`
    *   ⛪ **Holy Sites / Places of Worship**: `3,514`
    *   ❓ **Other**: `19`

---

## 🚀 Getting Started

### Prerequisites
*   [Docker Desktop](https://www.docker.com/products/docker-desktop/) (required to run spatial libraries locally without installing GDAL/GEOS binaries manually on your host machine)
*   [Node.js](https://nodejs.org/) (for the frontend dev environment)

### 1. Run the GeoDjango Backend
1. Make sure your Docker Desktop daemon is running.
2. Navigate to the `backend/` directory:
   ```bash
   cd backend
   ```
3. Copy the example environment file and configure your database parameters:
   ```bash
   cp .env.example .env
   ```
4. Start the backend service using docker-compose:
   ```bash
   docker-compose up --build
   ```
5. The API server will be available at `http://localhost:8000/`. You can log into the Django Admin at `http://localhost:8000/admin/` once you create a superuser inside the container.

### 2. Run the React Frontend
1. Navigate to the `frontend/` directory:
   ```bash
   cd ../frontend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Run the development server:
   ```bash
   npm run dev
   ```
4. The client will be available at `http://localhost:5173/`.

---

## 📡 Spatial REST API Endpoints

The API is built using Django REST Framework and **django-rest-framework-gis**, which formats responses using **GeoJSON**.

### 1. Map Bounding Box Query
Filters and returns only the historical sites located within the bounding box defined by map viewport boundaries.

*   **Endpoint**: `GET /api/sites/`
*   **Query Params**: `in_bbox=west,south,east,north` (represented as `min_lng,min_lat,max_lng,max_lat`)
*   **Example Request**:
    `GET http://localhost:8000/api/sites/?in_bbox=23.70,37.95,23.76,38.00` *(Athens City Center)*
*   **Sample GeoJSON Response**:
    ```json
    {
      "type": "FeatureCollection",
      "features": [
        {
          "id": 14210,
          "type": "Feature",
          "geometry": {
            "type": "Point",
            "coordinates": [23.726264, 37.971489]
          },
          "properties": {
            "name": "Parthenon",
            "site_type": "archaeological",
            "country": "Greece",
            "description": "Former temple on the Athenian Acropolis, dedicated to the goddess Athena.",
            "wikidata": "Q10288"
          }
        }
      ]
    }
    ```

### 2. Radius Nearby Search
Finds and returns historical sites within a specified meter radius from a central coordinate coordinate point, sorted closest-first.

*   **Endpoint**: `GET /api/sites/nearby/`
*   **Query Params**: 
    *   `lat` (Latitude of center point)
    *   `lng` (Longitude of center point)
    *   `radius` (Radius in meters)
*   **Example Request**:
    `GET http://localhost:8000/api/sites/nearby/?lat=31.7683&lng=35.2137&radius=5000` *(Within 5km of Jerusalem)*
*   **Sample GeoJSON Response**:
    ```json
    {
      "type": "FeatureCollection",
      "features": [
        {
          "id": 2841,
          "type": "Feature",
          "geometry": {
            "type": "Point",
            "coordinates": [35.2227, 31.7767]
          },
          "properties": {
            "name": "Tower of David",
            "site_type": "castle",
            "country": "Israel",
            "description": "Ancient citadel located near the Jaffa Gate entrance to the Old City of Jerusalem.",
            "wikidata": "Q1150424"
          }
        }
      ]
    }
    ```

---

## 🛠️ Data Harvesting & Seeding CLI

If you need to seed the database again or update the records with fresh data from OpenStreetMap, you can run the custom Django command inside the Docker container:

```bash
docker-compose exec web python manage.py load_data
```

This script:
1. Connects to the **Overpass API** to query `historic` nodes and ways in Israel, Greece, and Italy.
2. Formats and validates the coordinates into PostGIS `Point` geometries.
3. Automatically maps OSM tags to site categories.
4. Performs in-memory caching and deduplication to safely insert or update entries without creating duplicates.
5. Saves the sites in batches of `1000` for optimal performance.
