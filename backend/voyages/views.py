from django.shortcuts import get_object_or_404
from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from drf_spectacular.utils import extend_schema

from heritage.models import HistoricalSite
from .models import Voyage
from .serializers import (
    VoyageSerializer,
    AddSiteRequestSerializer,
    ReorderStopsRequestSerializer
)
from .selectors import get_voyages_for_user
from .services import create_voyage, add_site_to_voyage, reorder_voyage_stops, remove_site_from_voyage

class VoyageViewSet(viewsets.ModelViewSet):
    """
    ViewSet for listing, retrieving, creating, updating, and deleting Voyages.
    
    Enforces strict user-level multi-tenant boundaries (users can only access their own voyages).
    """
    serializer_class = VoyageSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        """
        Returns a prefetch-optimized queryset of Voyages belonging to the authenticated user.
        Supports drf-spectacular schema generation when request context is empty or anonymous.
        """
        if not self.request or not self.request.user or self.request.user.is_anonymous:
            return Voyage.objects.none()
        return get_voyages_for_user(self.request.user)

    def perform_create(self, serializer):
        """
        Delegates the creation of a new Voyage to the service layer.
        """
        title = serializer.validated_data.get('title')
        instance = create_voyage(user=self.request.user, title=title)
        serializer.instance = instance

    @extend_schema(
        request=AddSiteRequestSerializer,
        responses={200: VoyageSerializer},
        summary="Add a stop/historical site to a voyage",
        description="Appends a stop at the specified historical site to the end of the voyage sequence."
    )
    @action(detail=True, methods=['post'], url_path='add-site')
    def add_site(self, request, pk=None):
        """
        Action to append a historical site stop to the voyage.
        
        Expects a body containing 'siteId' (or 'site_id').
        """
        voyage = self.get_object()
        
        # Support both snake_case and camelCase parameters
        site_id = request.data.get('siteId') or request.data.get('site_id')
        if not site_id:
            return Response(
                {"detail": "Field 'siteId' or 'site_id' is required."},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            site_id_int = int(site_id)
        except (ValueError, TypeError):
            return Response(
                {"detail": "Invalid 'siteId'. It must be an integer."},
                status=status.HTTP_400_BAD_REQUEST
            )

        site = get_object_or_404(HistoricalSite, pk=site_id_int)
        
        # Invoke service logic
        add_site_to_voyage(user=request.user, voyage=voyage, site=site)
        
        # Refresh and serialize updated voyage details
        updated_voyage = self.get_queryset().get(pk=voyage.pk)
        return Response(self.get_serializer(updated_voyage).data)

    @extend_schema(
        request=ReorderStopsRequestSerializer,
        responses={200: VoyageSerializer},
        summary="Reorder stops within a voyage",
        description="Updates the order_index sequence of all stops in the voyage. Must supply the complete list of stop IDs in the new order."
    )
    @action(detail=True, methods=['post'], url_path='reorder-stops')
    def reorder_stops(self, request, pk=None):
        """
        Action to reorder stops in a voyage.
        
        Expects a body containing 'stopIds' (or 'stop_ids') as an ordered list of IDs.
        """
        voyage = self.get_object()
        
        stop_ids = request.data.get('stopIds') or request.data.get('stop_ids')
        if not stop_ids or not isinstance(stop_ids, list):
            return Response(
                {"detail": "Field 'stopIds' or 'stop_ids' is required and must be a list of stop IDs."},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            stop_ids_ints = [int(sid) for sid in stop_ids]
        except (ValueError, TypeError):
            return Response(
                {"detail": "All stop IDs in the list must be integers."},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Invoke service logic
        reorder_voyage_stops(user=request.user, voyage=voyage, stop_ids=stop_ids_ints)
        
        # Refresh and serialize updated voyage details
        updated_voyage = self.get_queryset().get(pk=voyage.pk)
        return Response(self.get_serializer(updated_voyage).data)

    @extend_schema(
        request=AddSiteRequestSerializer,
        responses={200: VoyageSerializer},
        summary="Remove a stop/historical site from a voyage",
        description="Removes the stop at the specified historical site from the voyage and re-indexes remaining stops."
    )
    @action(detail=True, methods=['post'], url_path='remove-site')
    def remove_site(self, request, pk=None):
        """
        Action to remove a historical site stop from the voyage.
        
        Expects a body containing 'siteId' (or 'site_id').
        """
        voyage = self.get_object()
        
        site_id = request.data.get('siteId') or request.data.get('site_id')
        if not site_id:
            return Response(
                {"detail": "Field 'siteId' or 'site_id' is required."},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            site_id_int = int(site_id)
        except (ValueError, TypeError):
            return Response(
                {"detail": "Invalid 'siteId'. It must be an integer."},
                status=status.HTTP_400_BAD_REQUEST
            )

        site = get_object_or_404(HistoricalSite, pk=site_id_int)
        
        # Invoke service logic
        remove_site_from_voyage(user=request.user, voyage=voyage, site=site)
        
        # Refresh and serialize updated voyage details
        updated_voyage = self.get_queryset().get(pk=voyage.pk)
        return Response(self.get_serializer(updated_voyage).data)


