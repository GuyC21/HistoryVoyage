import jwt
import time
from django.conf import settings
from django.contrib.auth import get_user_model
from django.test import TestCase, override_settings
from rest_framework import exceptions
from rest_framework.test import APIRequestFactory
from accounts.authentication import SupabaseJWTAuthentication

User = get_user_model()

@override_settings(SUPABASE_JWT_SECRET="test-secret-key-12345")
class SupabaseJWTAuthenticationTestCase(TestCase):
    def setUp(self):
        self.factory = APIRequestFactory()
        self.authenticator = SupabaseJWTAuthentication()
        self.secret = "test-secret-key-12345"

    def test_no_auth_header(self):
        request = self.factory.get('/api/accounts/me/')
        result = self.authenticator.authenticate(request)
        self.assertIsNone(result)

    def test_invalid_header_format(self):
        request = self.factory.get('/api/accounts/me/', HTTP_AUTHORIZATION='NotBearer token123')
        result = self.authenticator.authenticate(request)
        self.assertIsNone(result)

        request2 = self.factory.get('/api/accounts/me/', HTTP_AUTHORIZATION='Bearer')
        with self.assertRaises(exceptions.AuthenticationFailed) as context:
            self.authenticator.authenticate(request2)
        self.assertIn("No credentials provided", str(context.exception))

        request3 = self.factory.get('/api/accounts/me/', HTTP_AUTHORIZATION='Bearer token extra spaces')
        with self.assertRaises(exceptions.AuthenticationFailed) as context:
            self.authenticator.authenticate(request3)
        self.assertIn("Token string should not contain spaces", str(context.exception))

    def test_invalid_signature_token(self):
        token = jwt.encode({"sub": "550e8400-e29b-41d4-a716-446655440000", "email": "test@example.com", "aud": "authenticated"}, "wrong-secret", algorithm="HS256")
        request = self.factory.get('/api/accounts/me/', HTTP_AUTHORIZATION=f'Bearer {token}')
        with self.assertRaises(exceptions.AuthenticationFailed) as context:
            self.authenticator.authenticate(request)
        self.assertIn("Invalid token", str(context.exception))

    def test_invalid_audience_token(self):
        # Create a token with 'anon' audience (public token) which must be rejected
        payload = {
            "sub": "550e8400-e29b-41d4-a716-446655440000",
            "email": "test@example.com",
            "aud": "anon"
        }
        token = jwt.encode(payload, self.secret, algorithm="HS256")
        request = self.factory.get('/api/accounts/me/', HTTP_AUTHORIZATION=f'Bearer {token}')
        with self.assertRaises(exceptions.AuthenticationFailed) as context:
            self.authenticator.authenticate(request)
        self.assertIn("Invalid token", str(context.exception))

    def test_expired_token(self):
        # Create a token that expired 1 hour ago
        payload = {
            "sub": "550e8400-e29b-41d4-a716-446655440000",
            "email": "test@example.com",
            "aud": "authenticated",
            "exp": int(time.time()) - 3600
        }
        token = jwt.encode(payload, self.secret, algorithm="HS256")
        request = self.factory.get('/api/accounts/me/', HTTP_AUTHORIZATION=f'Bearer {token}')
        with self.assertRaises(exceptions.AuthenticationFailed) as context:
            self.authenticator.authenticate(request)
        self.assertIn("Token has expired", str(context.exception))

    def test_valid_token_creates_user(self):
        payload = {
            "sub": "550e8400-e29b-41d4-a716-446655440000",
            "email": "test@example.com",
            "aud": "authenticated",
            "user_metadata": {
                "full_name": "John Doe"
            }
        }
        token = jwt.encode(payload, self.secret, algorithm="HS256")
        request = self.factory.get('/api/accounts/me/', HTTP_AUTHORIZATION=f'Bearer {token}')

        user, returned_token = self.authenticator.authenticate(request)

        self.assertEqual(returned_token, token)
        self.assertEqual(user.email, "test@example.com")
        self.assertEqual(str(user.id), "550e8400-e29b-41d4-a716-446655440000")
        self.assertEqual(user.first_name, "John")
        self.assertEqual(user.last_name, "Doe")
        self.assertEqual(User.objects.count(), 1)

    def test_valid_token_gets_existing_user(self):
        existing_user = User.objects.create(
            id="550e8400-e29b-41d4-a716-446655440000",
            username="old@example.com",
            email="old@example.com"
        )

        payload = {
            "sub": "550e8400-e29b-41d4-a716-446655440000",
            "email": "new@example.com",
            "aud": "authenticated",
            "user_metadata": {
                "full_name": "Jane Smith"
            }
        }
        token = jwt.encode(payload, self.secret, algorithm="HS256")
        request = self.factory.get('/api/accounts/me/', HTTP_AUTHORIZATION=f'Bearer {token}')

        user, returned_token = self.authenticator.authenticate(request)

        self.assertEqual(str(user.id), str(existing_user.id))
        self.assertEqual(user.email, "new@example.com")
        self.assertEqual(user.first_name, "Jane")
        self.assertEqual(user.last_name, "Smith")
        self.assertEqual(User.objects.count(), 1)

