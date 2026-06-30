"""
Serializers for the heritage application.

Handles the transformation of HistoricalSite models into standardized GeoJSON payloads
using DRF-GIS GeoFeatureModelSerializer, converting database columns to camelCase.
"""

from rest_framework import serializers
from rest_framework_gis.serializers import GeoFeatureModelSerializer
from .models import HistoricalSite

class HistoricalSiteListSerializer(GeoFeatureModelSerializer):
    """
    Serializer for mapping historical site collections into GeoJSON formats.

    Produces a GeoJSON feature list payload where geometry holds coordinates (Point),
    and properties contains general metadata, omitting boundary outlines.
    """
    englishName = serializers.CharField(source='english_name', read_only=True, allow_null=True)
    englishDescription = serializers.CharField(source='english_description', read_only=True, allow_null=True)
    osmType = serializers.CharField(source='osm_type', read_only=True, allow_null=True)
    osmId = serializers.IntegerField(source='osm_id', read_only=True, allow_null=True)

    class Meta:
        model = HistoricalSite
        geo_field = 'location'
        fields = ('id', 'name', 'site_type', 'country', 'description', 'wikidata', 'englishName', 'englishDescription', 'osmType', 'osmId')

class HistoricalSiteDetailSerializer(GeoFeatureModelSerializer):
    """
    Serializer for detail views of a single HistoricalSite instance.

    Includes the site's boundary outlines (polygons or complex multi-polygons)
    mapped within the GeoJSON property fields.
    """
    englishName = serializers.CharField(source='english_name', read_only=True, allow_null=True)
    englishDescription = serializers.CharField(source='english_description', read_only=True, allow_null=True)
    osmType = serializers.CharField(source='osm_type', read_only=True, allow_null=True)
    osmId = serializers.IntegerField(source='osm_id', read_only=True, allow_null=True)

    class Meta:
        model = HistoricalSite
        geo_field = 'location'
        fields = ('id', 'name', 'site_type', 'country', 'description', 'wikidata', 'englishName', 'englishDescription', 'osmType', 'osmId', 'boundary')
