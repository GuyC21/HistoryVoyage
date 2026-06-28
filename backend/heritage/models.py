from django.contrib.gis.db import models

class HistoricalSite(models.Model):
    SITE_TYPES = [
        ('castle', 'Castle'),
        ('ruins', 'Ruins'),
        ('monument', 'Monument'),
        ('holy_site', 'Holy Site'),
        ('archaeological', 'Archaeological Site'),
        ('other', 'Other'),
    ]

    name = models.CharField(max_length=255)
    site_type = models.CharField(max_length=50, choices=SITE_TYPES, default='other')
    location = models.PointField()  # Holds the Point geometry (latitude & longitude)
    country = models.CharField(max_length=100)
    description = models.TextField(blank=True, null=True)
    wikidata = models.CharField(max_length=100, blank=True, null=True)

    def __str__(self):
        return f"{self.name} ({self.get_site_type_display()} - {self.country})"

