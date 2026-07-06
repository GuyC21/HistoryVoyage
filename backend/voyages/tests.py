from django.contrib.auth import get_user_model
from django.contrib.gis.geos import Point
from rest_framework import status
from rest_framework.test import APITestCase
from rest_framework.exceptions import ValidationError, PermissionDenied

from heritage.models import HistoricalSite
from .models import Voyage, VoyageStop
from .services import create_voyage, add_site_to_voyage, reorder_voyage_stops, remove_site_from_voyage
from .selectors import get_voyages_for_user, get_voyage_details

User = get_user_model()

class VoyageIntegrationTests(APITestCase):
    """
    Integration tests for the Voyages API endpoints and services.
    
    Verifies creation, stops addition, sequence reordering, and multi-tenant security isolation.
    """

    def setUp(self):
        # Create users
        self.user_a = User.objects.create_user(
            username="user_a",
            email="a@example.com",
            password="testpassword123"
        )
        self.user_b = User.objects.create_user(
            username="user_b",
            email="b@example.com",
            password="testpassword123"
        )

        # Create historical sites
        self.site_1 = HistoricalSite.objects.create(
            name="Ancient Castle",
            site_type="castle",
            location=Point(35.2137, 31.7683),  # Jerusalem
            country="Israel"
        )
        self.site_2 = HistoricalSite.objects.create(
            name="Roman Ruins",
            site_type="ruins",
            location=Point(35.2170, 31.7700),
            country="Israel"
        )
        self.site_3 = HistoricalSite.objects.create(
            name="Sacred Temple",
            site_type="holy_site",
            location=Point(35.2200, 31.7720),
            country="Israel"
        )

        # Create initial voyage for user A via service
        self.voyage_a = create_voyage(user=self.user_a, title="User A Trip")

    def test_create_voyage_service(self):
        """
        Verifies creating a voyage through the service layer creates a record correctly.
        """
        voyage = create_voyage(user=self.user_a, title="My New Voyage")
        self.assertEqual(voyage.user, self.user_a)
        self.assertEqual(voyage.title, "My New Voyage")
        self.assertEqual(Voyage.objects.filter(user=self.user_a).count(), 2)

    def test_add_site_to_voyage_service(self):
        """
        Verifies appending stops dynamically increments sequence order indices.
        """
        stop_1 = add_site_to_voyage(user=self.user_a, voyage=self.voyage_a, site=self.site_1)
        stop_2 = add_site_to_voyage(user=self.user_a, voyage=self.voyage_a, site=self.site_2)

        self.assertEqual(stop_1.order_index, 0)
        self.assertEqual(stop_2.order_index, 1)
        self.assertEqual(self.voyage_a.stops.count(), 2)

    def test_add_site_permission_denied(self):
        """
        Verifies that modifying another user's voyage raises a PermissionDenied error.
        """
        with self.assertRaises(PermissionDenied):
            add_site_to_voyage(user=self.user_b, voyage=self.voyage_a, site=self.site_1)

    def test_reorder_stops_service(self):
        """
        Verifies reordering stops works correctly with transaction safety.
        """
        stop_1 = add_site_to_voyage(user=self.user_a, voyage=self.voyage_a, site=self.site_1)
        stop_2 = add_site_to_voyage(user=self.user_a, voyage=self.voyage_a, site=self.site_2)
        stop_3 = add_site_to_voyage(user=self.user_a, voyage=self.voyage_a, site=self.site_3)

        # Reorder to [stop_3, stop_1, stop_2]
        new_order = [stop_3.id, stop_1.id, stop_2.id]
        reorder_voyage_stops(user=self.user_a, voyage=self.voyage_a, stop_ids=new_order)

        # Refresh
        stop_1.refresh_from_db()
        stop_2.refresh_from_db()
        stop_3.refresh_from_db()

        self.assertEqual(stop_3.order_index, 0)
        self.assertEqual(stop_1.order_index, 1)
        self.assertEqual(stop_2.order_index, 2)

    def test_reorder_stops_integrity_check(self):
        """
        Verifies reordering throws validation errors when input IDs do not match voyage stops.
        """
        stop_1 = add_site_to_voyage(user=self.user_a, voyage=self.voyage_a, site=self.site_1)
        
        # User B's voyage
        voyage_b = create_voyage(user=self.user_b, title="User B Trip")
        stop_b = add_site_to_voyage(user=self.user_b, voyage=voyage_b, site=self.site_2)

        # Trying to include User B's stop in User A's reordering should raise validation error (injection check)
        with self.assertRaises(ValidationError):
            reorder_voyage_stops(user=self.user_a, voyage=self.voyage_a, stop_ids=[stop_1.id, stop_b.id])

        # Trying to pass incomplete stop IDs should raise validation error
        with self.assertRaises(ValidationError):
            reorder_voyage_stops(user=self.user_a, voyage=self.voyage_a, stop_ids=[])

    def test_api_list_voyages_scoped_to_user(self):
        """
        Verifies listing voyages returns only the authenticated user's records.
        """
        # Create a voyage for user B
        create_voyage(user=self.user_b, title="User B Secret Trip")

        # Authenticate as user A
        self.client.force_authenticate(user=self.user_a)
        response = self.client.get('/api/voyages/')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        # Should only return user A's voyages
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]['title'], "User A Trip")

    def test_api_create_voyage(self):
        """
        Verifies POST /api/voyages/ successfully creates a voyage for the authenticated user.
        """
        self.client.force_authenticate(user=self.user_a)
        response = self.client.post('/api/voyages/', {'title': 'My API Voyage'})
        
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data['title'], 'My API Voyage')
        self.assertEqual(Voyage.objects.filter(user=self.user_a).count(), 2)

    def test_api_add_site_stop(self):
        """
        Verifies POST /api/voyages/<id>/add-site/ successfully appends a stop with correct nesting.
        """
        self.client.force_authenticate(user=self.user_a)
        response = self.client.post(
            f'/api/voyages/{self.voyage_a.id}/add-site/',
            {'siteId': self.site_1.id}
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data['stops']), 1)
        self.assertEqual(response.data['stops'][0]['siteId'], self.site_1.id)
        # Verify nested siteDetails in read-only nested serializer
        site_details = response.data['stops'][0]['siteDetails']
        self.assertEqual(site_details['name'], "Ancient Castle")
        self.assertEqual(site_details['coordinates'], [31.7683, 35.2137]) # [lat, lng]

    def test_api_add_site_permission_denied(self):
        """
        Verifies adding a stop to a voyage belonging to another user is rejected with a 404.
        """
        self.client.force_authenticate(user=self.user_b)
        response = self.client.post(
            f'/api/voyages/{self.voyage_a.id}/add-site/',
            {'siteId': self.site_1.id}
        )
        # returns 404 because get_object relies on get_queryset which filters by self.request.user
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_api_reorder_stops(self):
        """
        Verifies POST /api/voyages/<id>/reorder-stops/ successfully alters sequencing in DB.
        """
        stop_1 = add_site_to_voyage(user=self.user_a, voyage=self.voyage_a, site=self.site_1)
        stop_2 = add_site_to_voyage(user=self.user_a, voyage=self.voyage_a, site=self.site_2)

        self.client.force_authenticate(user=self.user_a)
        response = self.client.post(
            f'/api/voyages/{self.voyage_a.id}/reorder-stops/',
            {'stopIds': [stop_2.id, stop_1.id]},
            format='json'
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        # Check order in response
        self.assertEqual(response.data['stops'][0]['id'], stop_2.id)
        self.assertEqual(response.data['stops'][1]['id'], stop_1.id)

    def test_add_site_duplicate_validation_service(self):
        """
        Verifies that adding a duplicate site through the service layer raises a ValidationError.
        """
        add_site_to_voyage(user=self.user_a, voyage=self.voyage_a, site=self.site_1)
        with self.assertRaises(ValidationError):
            add_site_to_voyage(user=self.user_a, voyage=self.voyage_a, site=self.site_1)

    def test_remove_site_service(self):
        """
        Verifies removing a site stop from a voyage re-indexes remaining stops properly.
        """
        add_site_to_voyage(user=self.user_a, voyage=self.voyage_a, site=self.site_1)
        stop_2 = add_site_to_voyage(user=self.user_a, voyage=self.voyage_a, site=self.site_2)
        stop_3 = add_site_to_voyage(user=self.user_a, voyage=self.voyage_a, site=self.site_3)

        # Remove site 2
        remove_site_from_voyage(user=self.user_a, voyage=self.voyage_a, site=self.site_2)

        # Stop count should be 2, and stop 3 should now be order_index 1
        self.assertEqual(self.voyage_a.stops.count(), 2)
        stop_3.refresh_from_db()
        self.assertEqual(stop_3.order_index, 1)

    def test_api_add_site_duplicate_validation(self):
        """
        Verifies the API returns a 400 Bad Request if trying to add a duplicate site.
        """
        self.client.force_authenticate(user=self.user_a)
        # First addition
        self.client.post(f'/api/voyages/{self.voyage_a.id}/add-site/', {'siteId': self.site_1.id})
        # Duplicate addition
        response = self.client.post(f'/api/voyages/{self.voyage_a.id}/add-site/', {'siteId': self.site_1.id})
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_api_remove_site(self):
        """
        Verifies the POST /api/voyages/<id>/remove-site/ endpoint successfully removes a stop.
        """
        add_site_to_voyage(user=self.user_a, voyage=self.voyage_a, site=self.site_1)
        self.client.force_authenticate(user=self.user_a)
        
        response = self.client.post(
            f'/api/voyages/{self.voyage_a.id}/remove-site/',
            {'siteId': self.site_1.id}
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data['stops']), 0)


