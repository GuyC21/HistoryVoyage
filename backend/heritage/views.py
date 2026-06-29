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

    pagination_class = None

    def retrieve(self, request, *args, **kwargs):
        instance = self.get_object()
        
        # If english_name is null/empty, translate on-the-fly and cache
        if not instance.english_name:
            try:
                from deep_translator import GoogleTranslator
                
                # Translate name
                translated_name = GoogleTranslator(source='auto', target='en').translate(instance.name)
                if translated_name:
                    instance.english_name = translated_name
                
                # Translate description if present
                if instance.description:
                    translated_desc = GoogleTranslator(source='auto', target='en').translate(instance.description)
                    if translated_desc:
                        instance.english_description = translated_desc
                        
                instance.save(update_fields=['english_name', 'english_description'])
            except Exception as e:
                import logging
                logger = logging.getLogger(__name__)
                logger.error(f"Failed to translate site {instance.id}: {e}")
                
        serializer = self.get_serializer(instance)
        return Response(serializer.data)

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
                
                # Annotate and prioritize sites with populated wikidata first (famous/significant sites)
                from django.db.models import ExpressionWrapper, BooleanField, Q
                queryset = queryset.annotate(
                    has_wikidata=ExpressionWrapper(
                        ~Q(wikidata__isnull=True) & ~Q(wikidata=''),
                        output_field=BooleanField()
                    )
                ).order_by('-has_wikidata', 'id')
                
                # Limit size to prevent client/network performance issues
                limit_str = self.request.query_params.get('limit')
                limit = 500
                if limit_str:
                    try:
                        limit = min(int(limit_str), 1000)
                    except ValueError:
                        pass
                queryset = queryset[:limit]
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
