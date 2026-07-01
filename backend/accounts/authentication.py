import jwt
from django.conf import settings
from django.contrib.auth import get_user_model
from rest_framework import authentication, exceptions

class SupabaseJWTAuthentication(authentication.BaseAuthentication):
    """
    Authentication class for Django REST Framework to authenticate requests
    using Supabase JWT tokens.

    Expects an Authorization header in the format:
    Authorization: Bearer <supabase_jwt_token>
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

        if not getattr(settings, "SUPABASE_JWT_SECRET", None):
            raise exceptions.AuthenticationFailed("SUPABASE_JWT_SECRET is not configured on the server settings.")

        try:
            # Decode the JWT token.
            # Supabase JWTs are signed with the project's JWT secret using HS256.
            # We strictly enforce that the audience claim ('aud') is 'authenticated'.
            payload = jwt.decode(
                token,
                settings.SUPABASE_JWT_SECRET,
                algorithms=["HS256"],
                audience="authenticated"
            )
        except jwt.ExpiredSignatureError:
            raise exceptions.AuthenticationFailed("Token has expired.")
        except jwt.InvalidTokenError:
            raise exceptions.AuthenticationFailed("Invalid token.")

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
            raise exceptions.AuthenticationFailed(f"Failed to authenticate user: {str(e)}")

        return (user, token)
