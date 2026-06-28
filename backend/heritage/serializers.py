from rest_framework_gis.serializers import GeoFeatureModelSerializer
from .models import HistoricalSite

class HistoricalSiteSerializer(GeoFeatureModelSerializer):
    class Meta:
        model = HistoricalSite
        geo_field = 'location'
        fields = ('id', 'name', 'site_type', 'country', 'description', 'wikidata')
