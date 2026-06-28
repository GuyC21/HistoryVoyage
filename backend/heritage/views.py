from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django.contrib.gis.geos import Point, Polygon
from django.contrib.gis.measure import D
from django.contrib.gis.db.models.functions import Distance
from .models import HistoricalSite
from .serializers import HistoricalSiteSerializer

class HistoricalSiteViewSet(viewsets.ReadOnlyModelViewSet):
    """
    API endpoint that allows historical sites to be viewed and searched geographically.
    """
    queryset = HistoricalSite.objects.all()
    serializer_class = HistoricalSiteSerializer

    def get_queryset(self):
        queryset = super().get_queryset()
        
        # Bounding box filter (format: in_bbox=west,south,east,north)
        bbox_str = self.request.query_params.get('in_bbox')
        if bbox_str:
            try:
                west, south, east, north = map(float, bbox_str.split(','))
                # Create a spatial Polygon from the bounding box
                bbox_polygon = Polygon.from_bbox((west, south, east, north))
                # __within spatial lookup checks if the point is inside the polygon bounding box
                queryset = queryset.filter(location__within=bbox_polygon)
            except ValueError:
                pass  # Ignore invalid parameter formats
                
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
            # Note: Point constructor takes (x, y) which is (longitude, latitude)
            point = Point(float(lng), float(lat), srid=4326)
            radius_m = float(radius_m)
            
            # __distance_lte filters sites within the distance threshold.
            # We also annotate each site with its calculated distance and sort closest-first.
            sites = HistoricalSite.objects.filter(
                location__distance_lte=(point, D(m=radius_m))
            ).annotate(
                distance=Distance('location', point)
            ).order_by('distance')

            serializer = self.get_serializer(sites, many=True)
            return Response(serializer.data)
        except ValueError:
            return Response(
                {"error": "Invalid 'lat', 'lng', or 'radius' values. They must be numeric."},
                status=status.HTTP_400_BAD_REQUEST
            )
