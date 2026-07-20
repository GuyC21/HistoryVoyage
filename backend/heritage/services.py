"""
Services for the heritage application.

Encapsulates the business logic layer, primarily handling on-the-fly translations
of local database texts using external translation clients.
"""

import logging
from deep_translator import GoogleTranslator
from geopy.geocoders import Photon
from .models import HistoricalSite

logger = logging.getLogger(__name__)

def translate_site_details(site: HistoricalSite) -> HistoricalSite:
    """
    Translates a historical site's name and description into English if missing.

    Connects to the Google Translation API via `deep_translator`. If translation
    succeeds, the English fields (`english_name`, `english_description`) are populated
    and updated in the database.

    Args:
        site (HistoricalSite): The HistoricalSite database record instance to translate.

    Returns:
        HistoricalSite: The updated (and database-saved) HistoricalSite instance.

    Raises:
        None: Suppresses external translation errors and logs exceptions via standard
            logging, returning the unmodified model instance.
    """
    if site.english_name:
        return site

    try:
        updated_fields = []
        
        # Translate name
        translated_name = GoogleTranslator(source='auto', target='en').translate(site.name)
        if translated_name:
            site.english_name = translated_name
            updated_fields.append('english_name')
        
        # Translate description if present
        if site.description:
            translated_desc = GoogleTranslator(source='auto', target='en').translate(site.description)
            if translated_desc:
                site.english_description = translated_desc
                updated_fields.append('english_description')
                
        if updated_fields:
            site.save(update_fields=updated_fields)
            
    except Exception as e:
        logger.error(f"Failed to translate site {site.id}: {e}")
        
    return site

def resolve_site_address(site: HistoricalSite) -> HistoricalSite:
    """
    On-demand address resolution for a historical site.

    Connects to the Photon Geocoder (OSM-based). If successful, populates
    the address field and saves it. Fails gracefully.
    """
    if site.address:
        return site

    try:
        # Provide a short timeout to prevent slow API requests from hanging the frontend.
        geolocator = Photon(user_agent="history_voyage_app_v1", timeout=3)
        lat, lon = site.location.y, site.location.x
        location = geolocator.reverse((lat, lon), exactly_one=True, language='en')
        
        if location and location.address:
            site.address = location.address
            site.save(update_fields=['address'])
            
    except Exception as e:
        logger.error(f"Failed to resolve address for site {site.id}: {e}")
        
    return site
