import jwt
from django.conf import settings
from django.contrib.auth import get_user_model
from rest_framework import authentication, exceptions

# Initialize JWKS client at module level to cache public keys efficiently
jwks_client = None
if getattr(settings, 'SUPABASE_URL', None):
    jwks_url = f"{settings.SUPABASE_URL}/auth/v1/.well-known/jwks.json"
    jwks_client = jwt.PyJWKClient(jwks_url)

class SupabaseJWTAuthentication(authentication.BaseAuthentication):
    """
    Authentication class for Django REST Framework to authenticate requests
    using Supabase JWT tokens.

    Supports both legacy HS256 symmetric keys and new ES256/RS256 asymmetric keys.
    """

    def authenticate(self, request):
        auth_header = request.META.get("HTTP_AUTHORIZATION")
        if not auth_header:
            return None

        parts = auth_header.split()
        if len(parts) == 0:
            return None

        if parts[0].lower() != "bearer":
            return None

        if len(parts) == 1:
            raise exceptions.AuthenticationFailed("Invalid header. No credentials provided.")
        elif len(parts) > 2:
            raise exceptions.AuthenticationFailed("Invalid header. Token string should not contain spaces.")

        token = parts[1]

        try:
            # Extract unverified header to determine the signing algorithm
            header = jwt.get_unverified_header(token)
            alg = header.get("alg")

            if alg == "HS256":
                if not getattr(settings, "SUPABASE_JWT_SECRET", None):
                    raise exceptions.AuthenticationFailed("SUPABASE_JWT_SECRET is missing for HS256 token verification.")
                
                payload = jwt.decode(
                    token,
                    settings.SUPABASE_JWT_SECRET,
                    algorithms=["HS256"],
                    audience="authenticated"
                )
            elif alg in ["RS256", "ES256"]:
                if not jwks_client:
                    raise exceptions.AuthenticationFailed("SUPABASE_URL is missing. Cannot verify asymmetric tokens.")
                
                # Fetch the public key from the cached JWKS client
                signing_key = jwks_client.get_signing_key_from_jwt(token)
                
                payload = jwt.decode(
                    token,
                    signing_key.key,
                    algorithms=[alg],
                    audience="authenticated"
                )
            else:
                raise exceptions.AuthenticationFailed(f"Unsupported JWT algorithm: {alg}")

        except jwt.ExpiredSignatureError:
            print("JWT Verification failed: Token has expired.")
            raise exceptions.AuthenticationFailed("Token has expired.")
        except jwt.InvalidTokenError as e:
            header = jwt.get_unverified_header(token)
            print("JWT Verification failed:", str(e), "Header:", header)
            raise exceptions.AuthenticationFailed(f"Invalid token: {str(e)} (Header: {header})")
        except Exception as e:
            print("JWT Verification failed with unexpected error:", str(e))
            raise exceptions.AuthenticationFailed(f"Token verification failed: {str(e)}")

        user_id = payload.get("sub")
        email = payload.get("email")

        if not user_id:
            raise exceptions.AuthenticationFailed("Token payload is missing user ID ('sub').")

        User = get_user_model()

        try:
            user, created = User.objects.get_or_create(
                id=user_id,
                defaults={
                    "username": email or user_id,
                    "email": email or "",
                    "is_active": True,
                }
            )

            # Sync user information if it changed
            updated = False
            if email and user.email != email:
                user.email = email
                if user.username == user_id or '@' in user.username:
                    user.username = email
                updated = True

            user_metadata = payload.get("user_metadata", {})
            full_name = user_metadata.get("full_name") or user_metadata.get("name") or ""
            if full_name:
                name_parts = full_name.split(" ", 1)
                first_name = name_parts[0]
                last_name = name_parts[1] if len(name_parts) > 1 else ""

                if user.first_name != first_name or user.last_name != last_name:
                    user.first_name = first_name
                    user.last_name = last_name
                    updated = True

            if updated:
                user.save()

        except Exception as e:
            print("User Sync failed:", str(e))
            raise exceptions.AuthenticationFailed(f"Failed to authenticate user: {str(e)}")

        return (user, token)
