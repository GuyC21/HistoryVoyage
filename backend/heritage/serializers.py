from rest_framework import serializers
from rest_framework_gis.serializers import GeoFeatureModelSerializer
from .models import HistoricalSite

class HistoricalSiteListSerializer(GeoFeatureModelSerializer):
    englishName = serializers.CharField(source='english_name', read_only=True, allow_null=True)
    englishDescription = serializers.CharField(source='english_description', read_only=True, allow_null=True)
    osmType = serializers.CharField(source='osm_type', read_only=True, allow_null=True)
    osmId = serializers.IntegerField(source='osm_id', read_only=True, allow_null=True)

    class Meta:
        model = HistoricalSite
        geo_field = 'location'
        fields = ('id', 'name', 'site_type', 'country', 'description', 'wikidata', 'englishName', 'englishDescription', 'osmType', 'osmId')

class HistoricalSiteDetailSerializer(GeoFeatureModelSerializer):
    englishName = serializers.CharField(source='english_name', read_only=True, allow_null=True)
    englishDescription = serializers.CharField(source='english_description', read_only=True, allow_null=True)
    osmType = serializers.CharField(source='osm_type', read_only=True, allow_null=True)
    osmId = serializers.IntegerField(source='osm_id', read_only=True, allow_null=True)

    class Meta:
        model = HistoricalSite
        geo_field = 'location'
        fields = ('id', 'name', 'site_type', 'country', 'description', 'wikidata', 'englishName', 'englishDescription', 'osmType', 'osmId', 'boundary')
