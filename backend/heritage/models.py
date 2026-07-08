"""
Models for the heritage application.

Defines the database schema for historical sites, utilizing GeoDjango
spatial fields to support geographic indexing and queries.
"""

from django.contrib.gis.db import models

class Country(models.Model):
    """
    Represents a country with geographic bounds.
    """
    name = models.CharField(max_length=100, unique=True)
    code = models.CharField(max_length=2, unique=True, blank=True, null=True)  # ISO 3166-1 alpha-2
    bbox = models.JSONField(help_text="Bounding box: [south, west, north, east]", blank=True, null=True)

    class Meta:
        verbose_name_plural = "Countries"
        ordering = ['name']

    def clean(self):
        super().clean()
        # Automatically fetch bounding box and country code from OSM Nominatim API if missing
        if not self.bbox or not self.code:
            import urllib.request
            import urllib.parse
            import json
            from django.core.exceptions import ValidationError

            try:
                # Query Nominatim API with addressdetails to get the country code
                query = urllib.parse.urlencode({
                    'country': self.name,
                    'format': 'json',
                    'limit': 1,
                    'addressdetails': 1
                })
                url = f"https://nominatim.openstreetmap.org/search?{query}"
                req = urllib.request.Request(
                    url,
                    headers={'User-Agent': 'HistoryVoyageApp/1.0 (contact@historyvoyage.local)'}
                )
                with urllib.request.urlopen(req, timeout=10) as response:
                    data = json.loads(response.read().decode('utf-8'))
                    if data:
                        result = data[0]
                        # 1. Bounding box coordinates
                        if not self.bbox and 'boundingbox' in result:
                            # Nominatim returns boundingbox as [min_lat, max_lat, min_lon, max_lon] -> [south, north, west, east]
                            nom_bbox = [float(x) for x in result['boundingbox']]
                            south, north, west, east = nom_bbox
                            # We store as [south, west, north, east]
                            self.bbox = [south, west, north, east]

                        # 2. Country code (ISO 3166-1 alpha-2)
                        if not self.code and 'address' in result and 'country_code' in result['address']:
                            self.code = result['address']['country_code'].upper()
                    else:
                        raise ValidationError(f"Could not find geographic data for country: {self.name}")
            except Exception as e:
                # If both are missing and lookup fails, raise a validation error
                if not self.bbox or not self.code:
                    raise ValidationError(f"Geocoding lookup failed for {self.name}: {str(e)}")

    def save(self, *args, **kwargs):
        # Trigger full clean when saving via code (outside admin forms) to populate fields
        self.full_clean()
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.name} ({self.code or ''})"


class HistoricalSite(models.Model):
    """
    Represents a historical, cultural, or archaeological site.

    Stores core geographic coordinates (Point), boundaries (Polygon/MultiPolygon JSON),
    multilingual identity metadata, and external reference IDs (Wikidata, OSM).

    Attributes:
        SITE_TYPES (list): Choices mapping internal category IDs to user-facing labels.
        name (str): The localized or native name of the historical site.
        site_type (str): Category grouping (e.g., castle, ruins, holy site).
        location (PointField): Spatial coordinates (latitude & longitude) of the site.
        country (str): The country where the site is physically situated.
        description (str, optional): A description of the site in its original language.
        wikidata (str, optional): Wikidata entity identifier (e.g., Q12345).
        english_name (str, optional): Machine or editor-translated English name of the site.
        english_description (str, optional): Machine or editor-translated English description.
        osm_type (str, optional): OpenStreetMap element type ('node', 'way', or 'relation').
        osm_id (int, optional): OpenStreetMap identifier for referencing raw geographic data.
        boundary (dict, optional): GeoJSON geometry representation of the site's boundary outlines.
    """

    SITE_TYPES = [
        ('castle', 'Castle'),
        ('ruins', 'Ruins'),
        ('monument', 'Monument'),
        ('holy_site', 'Holy Site'),
        ('archaeological', 'Archaeological Site'),
        ('other', 'Other'),
    ]

    name = models.CharField(max_length=255)
    site_type = models.CharField(max_length=50, choices=SITE_TYPES, default='other')
    location = models.PointField()  # Holds the Point geometry (latitude & longitude)
    country = models.ForeignKey(Country, on_delete=models.CASCADE, related_name='sites')
    description = models.TextField(blank=True, null=True)
    wikidata = models.CharField(max_length=100, blank=True, null=True)
    english_name = models.CharField(max_length=255, blank=True, null=True)
    english_description = models.TextField(blank=True, null=True)
    osm_type = models.CharField(max_length=20, blank=True, null=True)
    osm_id = models.BigIntegerField(blank=True, null=True)
    boundary = models.JSONField(blank=True, null=True)

    def __str__(self):
        """
        Returns a string representation of the HistoricalSite instance.

        Format: "<name> (<display site type> - <country>)"
        """
        return f"{self.name} ({self.get_site_type_display()} - {self.country})"

