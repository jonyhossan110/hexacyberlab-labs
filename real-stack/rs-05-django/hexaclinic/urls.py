"""HexaClinic URL configuration — the project's root URLconf."""
from django.contrib import admin
from django.urls import include, path

urlpatterns = [
    # Django's own admin, on the default path, with the credentials the
    # installer created on day one (see clinic/seed.py).
    path('admin/', admin.site.urls),
    path('lab/', include('lab.urls')),
    path('', include('clinic.urls')),
]
