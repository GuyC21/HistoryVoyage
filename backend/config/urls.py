"""
URL Configuration for the config project.

Maps browser and API requests to respective Django views and routers.
Configures the Django REST Framework DefaultRouter to mount the historical sites endpoints.
"""

from django.contrib import admin
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from heritage.views import HistoricalSiteViewSet
from voyages.views import VoyageViewSet
from drf_spectacular.views import SpectacularAPIView, SpectacularRedocView, SpectacularSwaggerView

# Register API ViewSets using a DefaultRouter.
# This automatically creates standard RESTful endpoint routings (list, retrieve, actions).
router = DefaultRouter()
router.register(r'sites', HistoricalSiteViewSet, basename='historicalsite')
router.register(r'voyages', VoyageViewSet, basename='voyage')

urlpatterns = [
    # Django Administrative Portal interface.
    path('admin/', admin.site.urls),
    
    # OpenAPI Schema Generation
    path('api/schema/', SpectacularAPIView.as_view(), name='schema'),
    # Swagger UI:
    path('api/docs/', SpectacularSwaggerView.as_view(url_name='schema'), name='swagger-ui'),
    # Redoc UI (optional alternative to Swagger):
    path('api/redoc/', SpectacularRedocView.as_view(url_name='schema'), name='redoc'),
    
    # REST API endpoints. Mounts all routes defined inside router.urls under /api/.
    path('api/', include(router.urls)),
    path('api/accounts/', include('accounts.urls')),
]
