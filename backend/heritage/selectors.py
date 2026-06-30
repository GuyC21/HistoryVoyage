"""
Selectors for the heritage application.

Contains read-only queries and database filters for HistoricalSite objects,
implementing bounding-box limits, geographic radius queries, and ranked text searches.
"""

from django.db.models import QuerySet, Q, Case, When, Value, IntegerField, ExpressionWrapper, BooleanField
from django.contrib.gis.geos import Point, Polygon
from django.contrib.gis.measure import D
from django.contrib.gis.db.models.functions import Distance
from .models import HistoricalSite

def get_sites_in_bbox(queryset: QuerySet, bbox_str: str, limit: int = 100) -> QuerySet:
    """
    Retrieves historical sites falling within a given bounding box.

    Annotates results based on Wikidata availability to prioritize key historical points
    over secondary elements.

    Args:
        queryset (QuerySet): Base query set of HistoricalSite instances to filter.
        bbox_str (str): A comma-separated string coordinates in the format 'west,south,east,north'.
        limit (int, optional): The maximum number of historical sites to return. Defaults to 100.

    Returns:
        QuerySet: A sliced Django QuerySet containing historical sites within the bounding box,
            ordered by Wikidata availability (descending) and site ID.
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
    Searches historical sites using case-insensitive text queries on names.

    Applies a priority-ranked matching strategy:
    1. Exact name matches (Rank 3)
    2. Prefix matches (Rank 2)
    3. Partial/substring matches (Rank 1)

    Matches are further ordered by whether Wikidata is present to highlight major sites first.

    Args:
        queryset (QuerySet): Base query set of HistoricalSite instances to search.
        search_query (str): The search text provided by the user.
        limit (int, optional): The maximum number of matches to return. Defaults to 15.

    Returns:
        QuerySet: A sliced Django QuerySet of matched historical sites, ordered by rank,
            Wikidata presence, and site name.
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
    Retrieves historical sites situated within a given distance of a point.

    Computes spatial distances on the database server using GeoDjango spatial functions,
    annotating each record with the calculated distance.

    Args:
        lat (float): The latitude of the center search point.
        lng (float): The longitude of the center search point.
        radius_m (float): The maximum search radius in meters.

    Returns:
        QuerySet: An annotated Django QuerySet of matching HistoricalSite instances,
            ordered by distance (ascending).
    """
    point = Point(float(lng), float(lat), srid=4326)
    
    return HistoricalSite.objects.filter(
        location__distance_lte=(point, D(m=radius_m))
    ).annotate(
        distance=Distance('location', point)
    ).order_by('distance')
