"""WSGI config for the HexaClinic project (unused by the dev server,
kept because a real project ships one)."""
import os

from django.core.wsgi import get_wsgi_application

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'hexaclinic.settings')

application = get_wsgi_application()
