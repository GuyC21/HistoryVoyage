"""
Selectors for the voyages application.

Provides read-only queries and database filters for Voyage and VoyageStop objects,
supporting user-specific resource isolation.
"""

from django.db.models import QuerySet
from django.shortcuts import get_object_or_404
from django.contrib.auth import get_user_model
from .models import Voyage

User = get_user_model()

def get_voyages_for_user(user: User) -> QuerySet:
    """
    Retrieves all voyages belonging to a specific user.
    Optimizes database access by prefetching associated stops and historical sites.

    Args:
        user (User): The user instance requesting their voyages.

    Returns:
        QuerySet: A prefetch-optimized QuerySet of Voyage instances owned by the user.
    """
    return Voyage.objects.filter(user=user).prefetch_related('stops__site')


def get_voyage_details(user: User, voyage_id: str) -> Voyage:
    """
    Retrieves a single Voyage instance for a user, raising a 404 error if not found.

    Args:
        user (User): The user instance requesting the voyage details.
        voyage_id (str): The primary key database ID of the Voyage.

    Returns:
        Voyage: The matching Voyage instance.

    Raises:
        Http404: If no Voyage matches the given ID and user.
    """
    return get_object_or_404(get_voyages_for_user(user), pk=voyage_id)
