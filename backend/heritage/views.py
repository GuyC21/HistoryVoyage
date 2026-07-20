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
from .services import translate_site_details, resolve_site_address
from .selectors import get_sites_in_bbox, search_sites_by_text, get_sites_nearby

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

    @action(detail=False, methods=['get'], url_path='nearby')
    def nearby(self, request):
        """
        Performs a geographic radius query to retrieve nearby historical sites.

        URL Format:
            /api/sites/nearby/?lat=31.7683&lng=35.2137&radius=5000

        Query Params:
            lat (str/float): Latitude coordinate of the center.
            lng (str/float): Longitude coordinate of the center.
            radius (str/float): Maximum distance radius in meters.

        Returns:
            Response: A DRF Response containing serialized GeoJSON feature collections,
                or a HTTP 400 Bad Request if arguments are missing or invalid.
        """
        lat = request.query_params.get('lat')
        lng = request.query_params.get('lng')
        radius_m = request.query_params.get('radius')

        if not (lat and lng and radius_m):
            return Response(
                {"error": "Please provide 'lat', 'lng', and 'radius' (in meters) query parameters."},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            queryset = self.get_queryset()
            sites = get_sites_nearby(queryset, float(lat), float(lng), float(radius_m))
            serializer = self.get_serializer(sites, many=True)
            return Response(serializer.data)
        except ValueError:
            return Response(
                {"error": "Invalid 'lat', 'lng', or 'radius' values. They must be numeric."},
                status=status.HTTP_400_BAD_REQUEST
            )

    @action(detail=True, methods=['patch'], url_path='update-wikidata', permission_classes=[permissions.IsAdminUser])
    def update_wikidata(self, request, pk=None):
        """
        Updates the wikidata identifier of a site. Restrained to Django staff admin accounts.
        """
        instance = self.get_object()
        wikidata_id = request.data.get('wikidata')

        if wikidata_id:
            wikidata_id = wikidata_id.strip()
            if not wikidata_id.startswith('Q') or not wikidata_id[1:].isdigit():
                return Response(
                    {"detail": "Invalid Wikidata ID format. Must start with 'Q' followed by digits (e.g. Q186326)."},
                    status=status.HTTP_400_BAD_REQUEST
                )
        else:
            wikidata_id = None

        if instance.wikidata != wikidata_id:
            instance.wikidata = wikidata_id
            # Reset English translations so they are re-resolved from the new Wikidata node
            instance.english_name = None
            instance.english_description = None
            instance.save(update_fields=['wikidata', 'english_name', 'english_description'])

        serializer = self.get_serializer(instance)
        return Response(serializer.data, status=status.HTTP_200_OK)
