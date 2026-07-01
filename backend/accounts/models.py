import uuid
from django.contrib.auth.models import AbstractUser
from django.db import models

class User(AbstractUser):
    """
    Custom User model where the primary key is a UUID.
    This matches Supabase's user UUIDs and allows seamless foreign key mapping.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)

    def __str__(self):
        return f"{self.username} ({self.email})"
