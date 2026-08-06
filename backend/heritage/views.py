"""
Views for the heritage application.

Provides Django REST Framework ViewSets for interacting with HistoricalSite objects.
Supports retrieve translation overrides, text search, bounding box filters, and geographic queries.
"""

from rest_framework import viewsets, status, permissions
from rest_framework.decorators import action
from rest_framework.response import Response
from django.conf import settings

from .models import HistoricalSite, Country
from .serializers import HistoricalSiteListSerializer, HistoricalSiteDetailSerializer, CountrySerializer
from .services import translate_site_details, resolve_site_address, update_site_wikidata
from .selectors import get_sites_in_bbox, search_sites_by_text

class CountryViewSet(viewsets.ReadOnlyModelViewSet):
    """
    ViewSet for listing and retrieving Country instances.
    """
    queryset = Country.objects.all()
    serializer_class = CountrySerializer
    permission_classes = [permissions.AllowAny]
    pagination_class = None

class HistoricalSiteViewSet(viewsets.ReadOnlyModelViewSet):
    """
    ViewSet for listing, retrieving, and searching HistoricalSite instances.

    Provides geographic and text filtering interfaces. Bounding box filters expect coordinate
    bounds, whereas search endpoints rank matched terms.
    """
    queryset = HistoricalSite.objects.select_related('country').all()
    permission_classes = [permissions.AllowAny]
    pagination_class = None
    
    def get_serializer_class(self):
        """
        Determines the serializer class based on the request action.

        Returns `HistoricalSiteListSerializer` for 'list' actions to optimize payload sizes,
        and `HistoricalSiteDetailSerializer` (which includes boundaries) for all other actions.
        """
        if self.action == 'list':
            return HistoricalSiteListSerializer
        return HistoricalSiteDetailSerializer

    def retrieve(self, request, *args, **kwargs):
        """
        Retrieves a single HistoricalSite instance.

        Triggers on-the-fly translation through the services layer before serializing,
        guaranteeing translation resolution on detail inspection.
        """
        instance = self.get_object()
        
        # Translate on-the-fly via services layer if missing
        instance = translate_site_details(instance)
        
        # Resolve address on-the-fly if missing
        instance = resolve_site_address(instance)
                
        serializer = self.get_serializer(instance)
        return Response(serializer.data)

    def get_queryset(self):
        """
        Filters and returns the queryset of HistoricalSites.

        Supports the following query parameters:
        - `osm_type`: Filters by OSM element type ('node', 'way', 'relation').
        - `site_type`: Filters by category choice (e.g., 'castle', 'ruins').
        - `search`: Triggers a ranked text query search (ignores bounding boxes).
        - `in_bbox`: Restricts results to coordinates inside a bounding box ('w,s,e,n').
        - `limit`: Limits bounding box return counts (capped at 100).
        """
        queryset = super().get_queryset()
        
        if self.action != 'retrieve':
            queryset = queryset.defer('boundary')
        
        # Filter by osm_type (e.g. osm_type=relation)
        osm_type = self.request.query_params.get('osm_type')
        if osm_type:
            queryset = queryset.filter(osm_type=osm_type)
            
        # Filter by site_type (e.g. site_type=castle)
        site_type = self.request.query_params.get('site_type')
        if site_type:
            queryset = queryset.filter(site_type=site_type)
            
        # Text search filter (global, ignores bounding box)
        search_query = self.request.query_params.get('search')
        if search_query:
            return search_sites_by_text(queryset, search_query)

        # Bounding box filter (format: in_bbox=west,south,east,north)
        bbox_str = self.request.query_params.get('in_bbox')
        if bbox_str:
            limit_str = self.request.query_params.get('limit')
            limit = 100
            if limit_str:
                try:
                    limit = min(int(limit_str), 100)
                except ValueError:
                    pass
            return get_sites_in_bbox(queryset, bbox_str, limit=limit)
                
        return queryset

    @action(detail=True, methods=['patch'], url_path='update-wikidata', permission_classes=[permissions.IsAdminUser])
    def update_wikidata(self, request, pk=None):
        """
        Updates the wikidata identifier of a site. Restrained to Django staff admin accounts.
        Delegates validation and database update logic to the services layer.
        """
        instance = self.get_object()
        wikidata_id = request.data.get('wikidata')

        try:
            instance = update_site_wikidata(instance, wikidata_id)
        except ValueError as err:
            return Response({"detail": str(err)}, status=status.HTTP_400_BAD_REQUEST)

        serializer = self.get_serializer(instance)
        return Response(serializer.data, status=status.HTTP_200_OK)

