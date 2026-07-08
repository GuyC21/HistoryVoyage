"""
Admin configuration for the heritage application.

Registers database models with Django's administrative site interface.
"""

from django.contrib import admin
from .models import Country, HistoricalSite

@admin.register(Country)
class CountryAdmin(admin.ModelAdmin):
    list_display = ('name', 'code', 'bbox')
    search_fields = ('name', 'code')
    
    def get_form(self, request, obj=None, **kwargs):
        form = super().get_form(request, obj, **kwargs)
        form.base_fields['bbox'].help_text = (
            "Enter the bounding box coordinates as a JSON list in the format [south, west, north, east]. "
            "Example: [29.4, 34.0, 33.5, 36.0]"
        )
        return form

@admin.register(HistoricalSite)
class HistoricalSiteAdmin(admin.ModelAdmin):
    list_display = ('name', 'site_type', 'country')
    search_fields = ('name', 'country__name')
