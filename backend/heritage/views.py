from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django.conf import settings

from .models import HistoricalSite
from .serializers import HistoricalSiteListSerializer, HistoricalSiteDetailSerializer
from .services import translate_site_details
from .selectors import get_sites_in_bbox, search_sites_by_text, get_sites_nearby

class HistoricalSiteViewSet(viewsets.ReadOnlyModelViewSet):
    """
    API endpoint that allows historical sites to be viewed and searched geographically.
    """
    queryset = HistoricalSite.objects.all()
    pagination_class = None
    
    def get_serializer_class(self):
        if self.action == 'list':
            return HistoricalSiteListSerializer
        return HistoricalSiteDetailSerializer

    def retrieve(self, request, *args, **kwargs):
        instance = self.get_object()
        
        # Translate on-the-fly via services layer if missing
        instance = translate_site_details(instance)
                
        serializer = self.get_serializer(instance)
        return Response(serializer.data)

    def get_queryset(self):
        queryset = super().get_queryset()
        
        # Filter by osm_type (e.g. osm_type=relation)
        osm_type = self.request.query_params.get('osm_type')
        if osm_type:
            queryset = queryset.filter(osm_type=osm_type)
            
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
        Geographic radius search.
        Format: /api/sites/nearby/?lat=31.7683&lng=35.2137&radius=5000 (radius in meters)
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
            sites = get_sites_nearby(float(lat), float(lng), float(radius_m))
            serializer = self.get_serializer(sites, many=True)
            return Response(serializer.data)
        except ValueError:
            return Response(
                {"error": "Invalid 'lat', 'lng', or 'radius' values. They must be numeric."},
                status=status.HTTP_400_BAD_REQUEST
            )
