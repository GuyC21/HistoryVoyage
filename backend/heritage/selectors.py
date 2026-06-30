from django.db.models import QuerySet, Q, Case, When, Value, IntegerField, ExpressionWrapper, BooleanField
from django.contrib.gis.geos import Point, Polygon
from django.contrib.gis.measure import D
from django.contrib.gis.db.models.functions import Distance
from .models import HistoricalSite

def get_sites_in_bbox(queryset: QuerySet, bbox_str: str, limit: int = 100) -> QuerySet:
    """
    Returns sites within the provided bounding box, prioritized by wikidata presence.
    """
    try:
        west, south, east, north = map(float, bbox_str.split(','))
        bbox_polygon = Polygon.from_bbox((west, south, east, north))
        
        queryset = queryset.filter(location__within=bbox_polygon)
        
        # Annotate and prioritize sites with populated wikidata first (famous/significant sites)
        queryset = queryset.annotate(
            has_wikidata=ExpressionWrapper(
                ~Q(wikidata__isnull=True) & ~Q(wikidata=''),
                output_field=BooleanField()
            )
        ).order_by('-has_wikidata', 'id')
        
        return queryset[:limit]
    except ValueError:
        # If parsing fails, return original queryset
        return queryset

def search_sites_by_text(queryset: QuerySet, search_query: str, limit: int = 15) -> QuerySet:
    """
    Performs a global text search across name and english_name.
    Ranks exact matches > prefix matches > loose contains.
    """
    queryset = queryset.filter(
        Q(name__icontains=search_query) | 
        Q(english_name__icontains=search_query)
    ).annotate(
        search_rank=Case(
            When(Q(name__iexact=search_query) | Q(english_name__iexact=search_query), then=Value(3)),
            When(Q(name__istartswith=search_query) | Q(english_name__istartswith=search_query), then=Value(2)),
            default=Value(1),
            output_field=IntegerField()
        ),
        has_wikidata=ExpressionWrapper(
            ~Q(wikidata__isnull=True) & ~Q(wikidata=''),
            output_field=BooleanField()
        )
    ).order_by('-search_rank', '-has_wikidata', 'name')
    
    return queryset[:limit]

def get_sites_nearby(lat: float, lng: float, radius_m: float) -> QuerySet:
    """
    Returns sites within a specific radius in meters, sorted by distance.
    """
    point = Point(float(lng), float(lat), srid=4326)
    
    return HistoricalSite.objects.filter(
        location__distance_lte=(point, D(m=radius_m))
    ).annotate(
        distance=Distance('location', point)
    ).order_by('distance')
