"""
Unit and integration tests for the heritage application.
"""

from django.test import TestCase
from django.core.exceptions import ValidationError
from unittest.mock import patch
from io import BytesIO
from heritage.models import Country

class CountryModelTests(TestCase):
    
    @patch('urllib.request.urlopen')
    def test_auto_geocoding_on_clean(self, mock_urlopen):
        """
        Verifies that saving a Country only by its name automatically fetches
        its bbox and ISO country code from Nominatim.
        """
        # Mock successful Nominatim response
        mock_response = BytesIO(b"""
        [
            {
                "boundingbox": ["41.3673", "51.0890", "-5.1406", "9.5593"],
                "address": {
                    "country": "France",
                    "country_code": "fr"
                }
            }
        ]
        """)
        mock_urlopen.return_value.__enter__.return_value = mock_response

        country = Country(name="France")
        country.save()
        
        # Verify that code and bbox were auto-populated
        self.assertEqual(country.code, "FR")
        # Store is [south, west, north, east] from Nominatim's [south, north, west, east]
        self.assertEqual(country.bbox, [41.3673, -5.1406, 51.0890, 9.5593])
        
    @patch('urllib.request.urlopen')
    def test_invalid_country_raises_validation_error(self, mock_urlopen):
        """
        Verifies that entering an invalid/non-existent country raises a ValidationError.
        """
        # Mock empty response from Nominatim
        mock_response = BytesIO(b"[]")
        mock_urlopen.return_value.__enter__.return_value = mock_response

        country = Country(name="NonExistentCountry")
        with self.assertRaises(ValidationError):
            country.save()
