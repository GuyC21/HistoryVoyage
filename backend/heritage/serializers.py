from rest_framework import serializers
from rest_framework_gis.serializers import GeoFeatureModelSerializer
from .models import HistoricalSite

class HistoricalSiteSerializer(GeoFeatureModelSerializer):
    englishName = serializers.CharField(source='english_name', read_only=True, allow_null=True)
    englishDescription = serializers.CharField(source='english_description', read_only=True, allow_null=True)

    class Meta:
        model = HistoricalSite
        geo_field = 'location'
        fields = ('id', 'name', 'site_type', 'country', 'description', 'wikidata', 'englishName', 'englishDescription')
