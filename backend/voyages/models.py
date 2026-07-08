from django.db import models
from django.conf import settings
from heritage.models import HistoricalSite

class Voyage(models.Model):
    """
    Represents a user-created itinerary or trip plan containing multiple historical stops.

    Attributes:
        user (ForeignKey): The user who owns this voyage. Cascades on deletion.
        title (CharField): The name/title of the voyage.
        created_at (DateTimeField): Timestamp when the voyage was first saved.
        updated_at (DateTimeField): Timestamp when the voyage was last modified.
    """
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='voyages',
        help_text="The user who created and owns this voyage."
    )
    title = models.CharField(
        max_length=255,
        help_text="User-defined title or name of the voyage."
    )
    focus_country = models.ForeignKey(
        'heritage.Country',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='voyages',
        help_text="The country this voyage focuses on."
    )
    created_at = models.DateTimeField(
        auto_now_add=True,
        help_text="Timestamp when the voyage was created."
    )
    updated_at = models.DateTimeField(
        auto_now=True,
        help_text="Timestamp when the voyage was last updated."
    )

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.title} (User: {self.user.username})"


class VoyageStop(models.Model):
    """
    Represents an ordered stop at a historical site within a voyage.

    Attributes:
        voyage (ForeignKey): The voyage this stop belongs to.
        site (ForeignKey): The historical site visited during this stop.
        order_index (PositiveIntegerField): The ordered position of the stop within the voyage (0-indexed).
    """
    voyage = models.ForeignKey(
        Voyage,
        on_delete=models.CASCADE,
        related_name='stops',
        help_text="The parent voyage this stop belongs to."
    )
    site = models.ForeignKey(
        HistoricalSite,
        on_delete=models.CASCADE,
        related_name='voyage_stops',
        help_text="The historical site associated with this stop."
    )
    order_index = models.PositiveIntegerField(
        help_text="The sequential position of the stop (0-indexed)."
    )

    class Meta:
        ordering = ['order_index']
        # Multiple stops can exist, but each sequence position within a voyage must be unique
        unique_together = ('voyage', 'order_index')

    def __str__(self):
        return f"Stop {self.order_index} at {self.site.name} in {self.voyage.title}"

