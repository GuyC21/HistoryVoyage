"""
Models for the heritage application.

Defines the database schema for historical sites, utilizing GeoDjango
spatial fields to support geographic indexing and queries.
"""

from django.contrib.gis.db import models

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
    country = models.CharField(max_length=100)
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

