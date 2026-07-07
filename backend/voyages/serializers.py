"""
Serializers for the voyages application.

Defines serializer schemas to transform Voyage and VoyageStop models into camelCase JSON representations,
nesting minimal historical site details for the frontend.
"""

from rest_framework import serializers
from heritage.models import HistoricalSite
from .models import Voyage, VoyageStop

class HistoricalSiteMinimalSerializer(serializers.ModelSerializer):
    """
    Serializer providing a lightweight representation of a HistoricalSite.
    Includes camelCase properties and returns coordinates as [lat, lng].
    """
    englishName = serializers.CharField(source='english_name', read_only=True, allow_null=True)
    siteType = serializers.CharField(source='site_type', read_only=True)
    osmType = serializers.CharField(source='osm_type', read_only=True)
    coordinates = serializers.SerializerMethodField(read_only=True)

    class Meta:
        model = HistoricalSite
        fields = ('id', 'name', 'englishName', 'wikidata', 'country', 'siteType', 'osmType', 'coordinates')

    def get_coordinates(self, obj) -> list[float] | None:
        """
        Returns location coordinates as a [latitude, longitude] list.

        Args:
            obj (HistoricalSite): The HistoricalSite instance.

        Returns:
            list[float] | None: A [lat, lng] float array or None.
        """
        if obj.location:
            return [obj.location.y, obj.location.x]
        return None


class VoyageStopSerializer(serializers.ModelSerializer):
    """
    Serializer representing a specific stop within a Voyage.
    Includes nested minimal historical site details.
    """
    siteId = serializers.PrimaryKeyRelatedField(
        queryset=HistoricalSite.objects.all(),
        source='site',
        help_text="The ID of the historical site."
    )
    siteDetails = HistoricalSiteMinimalSerializer(
        source='site',
        read_only=True,
        help_text="Detailed metadata of the historical site."
    )
    orderIndex = serializers.IntegerField(
        source='order_index',
        read_only=True,
        help_text="The sequential 0-indexed position of this stop."
    )

    class Meta:
        model = VoyageStop
        fields = ('id', 'siteId', 'siteDetails', 'orderIndex')


class VoyageSerializer(serializers.ModelSerializer):
    """
    Serializer for Voyage objects, nesting its stops.
    """
    createdAt = serializers.DateTimeField(source='created_at', read_only=True)
    updatedAt = serializers.DateTimeField(source='updated_at', read_only=True)
    stops = VoyageStopSerializer(many=True, read_only=True)

    class Meta:
        model = Voyage
        fields = ('id', 'title', 'createdAt', 'updatedAt', 'stops')


class AddSiteRequestSerializer(serializers.Serializer):
    """
    Request schema validation for adding a site to a voyage.
    """
    siteId = serializers.IntegerField(
        required=True,
        help_text="The database ID of the HistoricalSite to append to the voyage stops."
    )


class ReorderStopsRequestSerializer(serializers.Serializer):
    """
    Request schema validation for reordering stops within a voyage.
    """
    stopIds = serializers.ListField(
        child=serializers.IntegerField(),
        required=True,
        help_text="An ordered array of VoyageStop IDs in the sequence they should occur."
    )

