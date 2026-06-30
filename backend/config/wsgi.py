"""
WSGI Config for the config project.

Exposes the WSGI callable as a module-level variable named `application`
for web servers like Gunicorn, uWSGI, or Mod_WSGI to communicate with Django.
"""

import os

from django.core.wsgi import get_wsgi_application

# Bind settings module context to the config project settings.
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')

# Expose WSGI callable interface.
application = get_wsgi_application()
