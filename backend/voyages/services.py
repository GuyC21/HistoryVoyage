"""
Services for the voyages application.

Implements all write operations, business rules, and state modifications for Voyage
and VoyageStop objects, enforcing security bounds and transaction integrity.
"""

from django.db import transaction
from django.db.models import Max
from django.contrib.auth import get_user_model
from rest_framework.exceptions import ValidationError, PermissionDenied
from heritage.models import HistoricalSite, Country
from .models import Voyage, VoyageStop

User = get_user_model()

def create_voyage(*, user: User, title: str, focus_country: Country = None, focus_city: str = None, focus_city_latitude: float = None, focus_city_longitude: float = None, focus_city_bbox: list = None) -> Voyage:
    """
    Creates a new Voyage instance for the specified user.

    Args:
        user (User): The user creating the voyage.
        title (str): The user-defined title of the voyage.
        focus_country (Country, optional): The country this voyage focuses on.
        focus_city (str, optional): The specific city this voyage focuses on.
        focus_city_latitude (float, optional): Latitude coordinates of the city.
        focus_city_longitude (float, optional): Longitude coordinates of the city.
        focus_city_bbox (list, optional): Bounding box coordinates of the city.

    Returns:
        Voyage: The created Voyage database instance.
    """
    return Voyage.objects.create(
        user=user,
        title=title,
        focus_country=focus_country,
        focus_city=focus_city,
        focus_city_latitude=focus_city_latitude,
        focus_city_longitude=focus_city_longitude,
        focus_city_bbox=focus_city_bbox
    )


def add_site_to_voyage(*, user: User, voyage: Voyage, site: HistoricalSite) -> VoyageStop:
    """
    Appends a new historical site stop to the end of a user's voyage.
    Enforces voyage ownership validation.

    Args:
        user (User): The user attempting to modify the voyage.
        voyage (Voyage): The Voyage instance to modify.
        site (HistoricalSite): The HistoricalSite database record.

    Returns:
        VoyageStop: The created VoyageStop instance.

    Raises:
        PermissionDenied: If the voyage does not belong to the user.
    """
    # Enforce multi-tenant permission boundaries
    if voyage.user != user:
        raise PermissionDenied("You do not have permission to modify this voyage.")

    # Enforce unique site constraint per voyage
    if voyage.stops.filter(site=site).exists():
        raise ValidationError("This site is already in your voyage.")

    with transaction.atomic():
        # Find maximum current order index to append
        max_idx = voyage.stops.aggregate(Max('order_index'))['order_index__max']
        next_idx = 0 if max_idx is None else max_idx + 1

        stop = VoyageStop.objects.create(
            voyage=voyage,
            site=site,
            order_index=next_idx
        )
        return stop


def reorder_voyage_stops(*, user: User, voyage: Voyage, stop_ids: list[int]) -> list[VoyageStop]:
    """
    Reorders the sequence of stops for a voyage based on a list of IDs.
    Enforces ownership validation, input integrity verification, and transaction safety.

    Args:
        user (User): The user attempting to reorder the stops.
        voyage (Voyage): The Voyage instance.
        stop_ids (list[int]): Sorted list of VoyageStop IDs representing the new order.

    Returns:
        list[VoyageStop]: The updated VoyageStop objects in their new order.

    Raises:
        PermissionDenied: If the voyage does not belong to the user.
        ValidationError: If the provided stop IDs are invalid, incomplete, or contain elements
            belonging to other voyages (preventing cross-tenant injections).
    """
    if voyage.user != user:
        raise PermissionDenied("You do not have permission to modify this voyage.")

    # Retrieve all current stop IDs in the database for this voyage
    existing_stops = voyage.stops.all()
    existing_stop_ids = set(existing_stops.values_list('id', flat=True))

    # Verify input matches exactly the existing stops to prevent injection or omissions
    if set(stop_ids) != existing_stop_ids:
        raise ValidationError("Provided stop IDs do not match the existing stops for this voyage.")

    with transaction.atomic():
        # Map stop objects by their primary key
        stop_map = {stop.id: stop for stop in existing_stops}

        # Step 1: Assign temporary, non-overlapping indices to prevent unique constraint failures
        # (avoiding conflicts during shift swaps).
        for i, stop_id in enumerate(stop_ids):
            stop = stop_map[stop_id]
            stop.order_index = 100000 + i
            stop.save()

        # Step 2: Assign final sequential indices
        updated_stops = []
        for i, stop_id in enumerate(stop_ids):
            stop = stop_map[stop_id]
            stop.order_index = i
            stop.save()
            updated_stops.append(stop)

        return updated_stops


def remove_site_from_voyage(*, user: User, voyage: Voyage, site: HistoricalSite) -> None:
    """
    Removes a historical site stop from a user's voyage and re-indexes remaining stops.
    Enforces ownership validation.
    """
    if voyage.user != user:
        raise PermissionDenied("You do not have permission to modify this voyage.")

    with transaction.atomic():
        # Find the stop to delete
        stop_to_delete = voyage.stops.filter(site=site).first()
        if not stop_to_delete:
            raise ValidationError("This site is not part of the voyage.")

        stop_to_delete.delete()

        # Re-index remaining stops to keep indices sequential
        remaining_stops = voyage.stops.all().order_by('order_index')
        for i, stop in enumerate(remaining_stops):
            if stop.order_index != i:
                stop.order_index = i
                stop.save()

