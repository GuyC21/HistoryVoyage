import logging
from deep_translator import GoogleTranslator
from .models import HistoricalSite

logger = logging.getLogger(__name__)

def translate_site_details(site: HistoricalSite) -> HistoricalSite:
    """
    Translates the site's name and description into English if missing.
    Returns the updated (and saved) HistoricalSite instance.
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
