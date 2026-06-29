import urllib.request
import urllib.parse
import json
import time
from django.core.management.base import BaseCommand
from django.contrib.gis.geos import Point
from heritage.models import HistoricalSite

def is_historical_museum(name, tags):
    # 1. If it has a 'historic' tag, it is historical
    if 'historic' in tags:
        return True
        
    # 2. Check museum/subject sub-tags (e.g. museum=history, museum=archaeological)
    museum_type = tags.get('museum', '').lower()
    subject = tags.get('subject', '').lower()
    for val in [museum_type, subject]:
        if any(k in val for k in ['history', 'archaeo', 'archeo', 'castle', 'ruin', 'ancient', 'crusader', 'fortress', 'military_history', 'local_history', 'open_air']):
            return True

    # 3. Check for historical keywords in English, Hebrew, Italian, and Greek names
    keywords = [
        # English
        'castle', 'fort', 'fortress', 'ruin', 'archaeological', 'archeological', 'monument', 'monastery', 
        'tomb', 'ancient', 'history', 'heritage', 'tower', 'excavation', 'citadel', 'temple', 'crusader', 'knight',
        # Hebrew
        'אבירים', 'מצודה', 'חורבת', 'עתיקות', 'ארכאולוגי', 'מגדל', 'קבר', 'מנזר', 'היכל', 'תל', 'שער', 'חומות', 'היסטורי', 'מבצר',
        # Arabic & Transliterated Arabic (CRITICAL FOR WEST BANK DATA)
        'khirbet', 'khirba', 'tell', 'tal', 'deir', 'dair', 'nabi', 'nebby', 'maqam', 'qubba', 'weli', 'bourj',
        'خربة', 'تل', 'دير', 'مقام', 'مزار', 'قلعة', 'برج', 'آثار',
        # Italian
        'castello', 'rovine', 'archeologico', 'fortezza', 'torre', 'tomba', 'monastero', 'palazzo', 
        'mura', 'porta', 'antica', 'scavi', 'tempio', 'storico',
        # Greek
        'κάστρο', 'ερείπια', 'αρχαιολογικός', 'φρούριο', 'πύργος', 'τάφος', 'μοναστήρι', 'ναός', 'πύλη', 'αρχαία', 'ιστορικό'
    ]
    
    name_lower = name.lower()
    return any(keyword in name_lower for keyword in keywords)


def is_jewish_israeli_heritage(name, tags):
    # Explicit OSM tagging checks
    religion = tags.get('religion', '').lower()
    historic = tags.get('historic', '').lower()
    heritage = tags.get('heritage', '').lower()
    
    if religion == 'jewish' or historic == 'synagogue' or 'synagogue' in tags.get('amenity', ''):
        return True
        
    # Check names and descriptions for Jewish/Israeli keywords
    keywords = [
        # English
        'synagogue', 'jewish', 'israelite', 'tomb of joseph', 'tomb of rachel', 
        'patriarchs', 'cave of machpelah', 'shiloh', 'susya', 'herodion', 'qumran',
        'gerizim', 'samaria', 'jericho',
        # Hebrew
        'בית כנסת', 'יהודי', 'קבר', 'שילה', 'סוסיא', 'הרודיון', 'מערת המכפלה',
        'קומראן', 'גריזים', 'שומרון', 'יריחו', 'מכפלה', 'רחל', 'יוסף'
    ]
    
    name_lower = name.lower()
    description = (tags.get('description') or tags.get('note') or tags.get('comment') or '').lower()
    
    for kw in keywords:
        if kw in name_lower or kw in description:
            return True
            
    # Include amenity place of worship if marked with religion=jewish
    if tags.get('amenity') == 'place_of_worship' and religion == 'jewish':
        return True
        
    return False


class Command(BaseCommand):
    help = 'Harvest historical and holy sites from OpenStreetMap (via Overpass API) and seed the database'

    def handle(self, *args, **options):
        # Target countries in specified order: Israel, West Bank, Greece, Italy
        countries = [
            {'name': 'Israel', 'code': 'IL'},
            {'name': 'West Bank', 'code': 'PS', 'is_west_bank': True},
            {'name': 'Greece', 'code': 'GR'},
            {'name': 'Italy', 'code': 'IT'},
        ]

        overpass_url = 'https://overpass-api.de/api/interpreter'

        for country in countries:
            db_country_name = 'Israel' if country.get('is_west_bank') else country['name']
            self.stdout.write(self.style.WARNING(f"\n---> Starting harvest for {country['name']} (saving to country: {db_country_name})..."))
            
            # Construct the Overpass QL query
            # We filter for nodes and ways with a name tag in the search area
            # We fetch historic items (including expanded values) and museum attractions
            query = f"""
            [out:json][timeout:300];
            area["ISO3166-1"="{country['code']}"]->.searchArea;
            (
              // Castles, ruins, monuments, monasteries, tombs, archaeological sites, forts
              node["historic"~"castle|ruins|monument|monastery|tomb|archaeological_site|fortress|fort|city_gate|battlefield|archaeological|ruin"]["name"](area.searchArea);
              way["historic"~"castle|ruins|monument|monastery|tomb|archaeological_site|fortress|fort|city_gate|battlefield|archaeological|ruin"]["name"](area.searchArea);
              
              // Places of worship marked as historic
              node["amenity"="place_of_worship"]["historic"]["name"](area.searchArea);
              way["amenity"="place_of_worship"]["historic"]["name"](area.searchArea);
              
              // Museums (which might be Crusader citadels, ruins or ancient structures)
              node["tourism"="museum"]["name"](area.searchArea);
              way["tourism"="museum"]["name"](area.searchArea);
            );
            out center;
            """
            
            # Send POST request using built-in urllib
            data = urllib.parse.urlencode({'data': query}).encode('utf-8')
            req = urllib.request.Request(overpass_url, data=data, headers={'User-Agent': 'GeospatialHeritagePlanner/1.0'})
            
            try:
                max_retries = 3
                osm_data = None
                
                for attempt in range(1, max_retries + 1):
                    try:
                        self.stdout.write(f"Fetching data from Overpass API for {country['name']} (Attempt {attempt}/{max_retries})...")
                        start_time = time.time()
                        with urllib.request.urlopen(req) as response:
                            raw_data = response.read().decode('utf-8')
                            osm_data = json.loads(raw_data)
                        
                        # Overpass API returns a 'remark' field if it times out or fails internally
                        # (even with HTTP 200 and an empty elements list)
                        if 'remark' in osm_data:
                            raise Exception(f"Overpass Server Error: {osm_data['remark']}")
                        
                        duration = time.time() - start_time
                        elements = osm_data.get('elements', [])
                        self.stdout.write(self.style.SUCCESS(f"Successfully fetched {len(elements)} items in {duration:.2f}s"))
                        break
                    except Exception as e:
                        self.stdout.write(self.style.WARNING(f"Attempt {attempt} failed: {str(e)}"))
                        if attempt < max_retries:
                            self.stdout.write("Waiting 15 seconds before retrying...")
                            time.sleep(15)
                        else:
                            raise e

                total_elements = len(elements)
                self.stdout.write(f"Preparing to seed {total_elements} sites in database...")

                # Force Django to close the database connection.
                # If the Overpass API fetch was slow (e.g. taking >60s), the cloud router
                # will drop the idle TCP connection, leading to SSL SYSCALL EOF errors.
                # Closing it here forces Django to open a fresh, active connection.
                from django.db import connection
                connection.close()

                # Fetch existing sites for this country to build an in-memory lookup cache
                self.stdout.write("Fetching existing sites from database for in-memory deduplication...")
                existing_sites = HistoricalSite.objects.filter(country=db_country_name)
                
                lookup = {}
                for s in existing_sites:
                    # Key by (name, round(lon, 6), round(lat, 6)) to safely match coordinates
                    key = (s.name.lower(), round(s.location.x, 6), round(s.location.y, 6))
                    lookup[key] = s
                
                self.stdout.write(f"Cache built with {len(lookup)} existing sites.")

                to_create = []
                to_update = []
                added_count = 0
                updated_count = 0
                
                start_processing = time.time()
                for idx, el in enumerate(elements, 1):
                    # Progress reporting every 1000 items
                    if idx % 1000 == 0 or idx == total_elements:
                        elapsed = time.time() - start_processing
                        percentage = (idx / total_elements) * 100
                        self.stdout.write(f"  Processed {idx}/{total_elements} items ({percentage:.1f}%) - elapsed: {elapsed:.1f}s...")

                    tags = el.get('tags', {})
                    name = tags.get('name')
                    if not name:
                        continue

                    if country.get('is_west_bank') and not is_jewish_israeli_heritage(name, tags):
                        continue

                    # Filter out modern museums (e.g. art galleries, science centers)
                    tourism = tags.get('tourism', '')
                    if tourism == 'museum' and not is_historical_museum(name, tags):
                        continue

                    # Get coordinates depending on element type
                    lat = el.get('lat')
                    lon = el.get('lon')
                    
                    # If it's a way/relation with center geometry from "out center;"
                    if not lat or not lon:
                        center = el.get('center', {})
                        lat = center.get('lat')
                        lon = center.get('lon')

                    if not lat or not lon:
                        continue

                    # Determine site type mapping
                    historic = tags.get('historic', '')
                    amenity = tags.get('amenity', '')
                    
                    if historic == 'castle':
                        site_type = 'castle'
                    elif historic == 'ruins':
                        site_type = 'ruins'
                    elif historic == 'monument':
                        site_type = 'monument'
                    elif historic in ['monastery', 'tomb'] or amenity == 'place_of_worship':
                        site_type = 'holy_site'
                    elif historic == 'archaeological_site':
                        site_type = 'archaeological'
                    else:
                        # Map historical museums based on keywords
                        if tourism == 'museum':
                            name_lower = name.lower()
                            if any(k in name_lower for k in ['castle', 'fort', 'fortress', 'citadel', 'מצודה', 'מבצר', 'castello', 'fortezza', 'κάστρο', 'φρούριο', 'אבירים', 'knights']):
                                site_type = 'castle'
                            elif any(k in name_lower for k in ['ruin', 'rovine', 'ερείπια', 'חורבת']):
                                site_type = 'ruins'
                            elif any(k in name_lower for k in ['monument', 'tower', 'gate', 'מגדל', 'שער', 'torre', 'porta', 'πύργος', 'πύλη']):
                                site_type = 'monument'
                            elif any(k in name_lower for k in ['monastery', 'tomb', 'temple', 'holy', 'church', 'mosque', 'synagogue', 'מנזר', 'קבר', 'היכל', 'monastero', 'tomba', 'tempio', 'μοναστήρι', 'τάφος', 'ναός']):
                                site_type = 'holy_site'
                            else:
                                site_type = 'archaeological'
                        else:
                            site_type = 'other'

                    # Extract other metadata
                    wikidata = tags.get('wikidata')
                    description = tags.get('description') or tags.get('note') or tags.get('comment')
                    
                    # Generate lookup key
                    key = (name.lower(), round(float(lon), 6), round(float(lat), 6))
                    
                    site_match = lookup.get(key)
                    
                    if not site_match:
                        # Instantiate model for creation
                        location = Point(float(lon), float(lat), srid=4326)
                        to_create.append(HistoricalSite(
                            name=name,
                            country=db_country_name,
                            site_type=site_type,
                            location=location,
                            wikidata=wikidata,
                            description=description
                        ))
                        added_count += 1
                    else:
                        # Check if updates are needed on existing model
                        changed = False
                        if site_match.site_type != site_type:
                            site_match.site_type = site_type
                            changed = True
                        if wikidata and site_match.wikidata != wikidata:
                            site_match.wikidata = wikidata
                            changed = True
                        if description and site_match.description != description:
                            site_match.description = description
                            changed = True
                        
                        if changed:
                            to_update.append(site_match)
                            updated_count += 1

                self.stdout.write(f"Syncing with database: creating {len(to_create)} new, updating {len(to_update)} existing...")
                
                # Perform bulk operations to database in batches of 1000
                if to_create:
                    HistoricalSite.objects.bulk_create(to_create, batch_size=1000)
                if to_update:
                    HistoricalSite.objects.bulk_update(to_update, ['site_type', 'wikidata', 'description'], batch_size=1000)

                self.stdout.write(self.style.SUCCESS(
                    f"Finished {country['name']}: {added_count} sites added, {updated_count} sites updated."
                ))
                
                # Sleep briefly between requests to be polite to the free Overpass API
                time.sleep(2)

            except Exception as e:
                self.stdout.write(self.style.ERROR(f"Failed to harvest {country['name']}: {str(e)}"))
        
        self.stdout.write(self.style.SUCCESS("\nSeeding complete!"))
