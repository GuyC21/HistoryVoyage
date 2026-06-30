# ⚙️ HistoryVoyage - Django Backend

This is the backend API and data-harvesting engine for **HistoryVoyage**, built with **Python 3.13**, **Django 6**, and **GeoDjango (PostGIS)**. It serves spatial GeoJSON endpoints to render historical site coordinates, boundaries, and translations.

---

## 🏗️ Technical Stack & GIS Requirements

*   **Framework**: Django 6 + Django REST Framework (DRF)
*   **Geospatial Extensions**: GeoDjango + **django-rest-framework-gis** (spatially-aware serializer layers)
*   **Database**: PostgreSQL with the **PostGIS** spatial extension (cloud-hosted on Supabase)
*   **GIS Libraries**: Requires **GDAL**, **GEOS**, and **PROJ** system-level binary dependencies.
*   **Containerization**: Docker Dev environment (manages binary installations automatically)

---

## 📂 Source Code Structure

```text
backend/
├── config/             # Django Core Configuration
│   ├── settings.py     # Main project parameters (PostGIS config, CORS rules, dotenv)
│   ├── urls.py         # Main routes and DRF Router mounting
│   ├── wsgi.py         # WSGI gateway entry point
│   └── asgi.py         # ASGI gateway entry point
├── heritage/           # Core Historical Site Application
│   ├── management/     # Custom CLI scripts
│   │   └── commands/
│   │       └── load_data.py # Seeding engine querying the Overpass API
│   ├── admin.py        # Django Admin configurations
│   ├── apps.py         # Application registry configs
│   ├── models.py       # Geographical HistoricalSite database schema
│   ├── selectors.py    # Query filters (bounding box, radius, text searches)
│   ├── serializers.py  # Model serializers (converts models to GeoJSON features)
│   ├── services.py     # Business operations layer (translations client)
│   ├── tests.py        # Django unit testing suite
│   └── views.py        # Read-only Viewset controller endpoints
├── Dockerfile.dev      # Dev container build script (contains GDAL/GEOS setup)
├── docker-compose.yml  # Docker Compose services configuration
└── requirements.txt    # Python requirements
```

---

## 🚜 Data Harvesting CLI (`load_data.py`)

The database is seeded using a custom Django CLI command that harvests historical data from **OpenStreetMap** using the **Overpass API**:

```bash
# Execute harvesting inside the running web container
docker-compose exec web python manage.py load_data
```

### Script Execution Sequence
1. **Query Construction**: Submits an Overpass QL query searching for node and closed way elements tagged with `historic` tags (e.g. `historic=castle`, `historic=archaeological_site`, `historic=monument`, `historic=ruins`) inside bounding coordinate ranges representing Israel, Greece, and Italy.
2. **Tag Mapping**: Matches OSM tags to target database category categories.
3. **Geometry Conversion**:
   - Nodes are mapped to PostGIS `Point(lng, lat)` geometry structures.
   - Closed ways are parsed into boundary outline polygons (using their coordinate array sets) and stored as JSON features in the database.
4. **Deduplication**: Creates a composite cache key using `osm_type` (node/way) and `osm_id`. The script executes an `upsert` mechanism, updating existing matching records rather than introducing duplicates.
5. **Bulk Insert**: Stores sites in database batches of 1,000 to maximize performance.

---

## 💾 Database Configuration

The application database parameters are configured via environment variables inside a `.env` file (copied from `.env.example`).

### PostGIS Database URL
Database connections use `dj-database-url` in `config/settings.py` to parse connections:
```python
DATABASES = {
    'default': dj_database_url.config(
        default=DATABASE_URL,
        engine='django.contrib.gis.db.backends.postgis', # PostGIS Engine
        conn_max_age=600 # Connection pool lifetime
    )
}
```
If no `DATABASE_URL` is configured, settings fall back to a local SQLite database (note that spatial features like radius searches will be disabled on SQLite).

---

## 🛠️ Administrative & Docker Commands

### 1. Build and Run Containers
```bash
docker-compose up --build
```
Builds the Python dev environment containing the GDAL system binaries and starts the service on port `8000`.

### 2. Apply Database Migrations
```bash
docker-compose exec web python manage.py migrate
```

### 3. Create Superuser (Django Admin Access)
```bash
docker-compose exec web python manage.py createsuperuser
```
Allows login access to inspect models at `http://localhost:8000/admin/`.

### 4. Run Tests
```bash
docker-compose exec web python manage.py test
```
Runs viewset, serializer, and selector tests.
