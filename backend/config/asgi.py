"""
ASGI Config for the config project.

Exposes the ASGI callable as a module-level variable named `application`
for asynchronous web servers like Daphne, Uvicorn, or Hypercorn.
"""

import os

from django.core.asgi import get_asgi_application

# Bind settings module context to the config project settings.
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')

# Expose ASGI callable interface.
application = get_asgi_application()
