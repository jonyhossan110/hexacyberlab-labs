"""HexaClinic's own middleware: the request log the blue team reads —
plus the lab's server-side detection for the three flaws that are only
visible from inside the request/response cycle (a debug page actually
being served, a default-credential admin login actually succeeding, a
session key surviving a portal login unchanged)."""
from . import progress
from .applog import hc_log

# Markers that only appear in Django's technical debug page and in the
# content of files this download feature should never reach.
DEBUG_MARKERS = (b'Using the URLconf', b'DJANGO_SETTINGS_MODULE',
                 b"You're seeing this error because you have DEBUG = True")


class ClinicMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        self._seed_fallback()
        response = self.get_response(request)
        try:
            hc_log(request, '%s %s' % (
                request.method,
                request.get_full_path()))
        except Exception:
            pass
        try:
            self._detect(request, response)
        except Exception:
            pass
        return response

    @staticmethod
    def _seed_fallback():
        # run.sh seeds after migrating; this covers a bare `runserver`
        # on an empty database. Fails silently before migrate has run.
        try:
            from django.contrib.auth.models import User
            if not User.objects.exists():
                from .seed import seed_if_empty
                seed_if_empty()
        except Exception:
            pass

    @staticmethod
    def _detect(request, response):
        # debug-page: a real 500 response carrying Django's technical
        # debug page (settings, URLconf, environment) was served.
        if response.status_code == 500:
            content = getattr(response, 'content', b'') or b''
            if any(m in content for m in DEBUG_MARKERS):
                progress.pass_test('debug-page')
        # default-credentials: a POST to the real Django admin login
        # with the installer's pair that actually succeeded (redirect).
        if request.path == '/admin/login/' and request.method == 'POST' \
                and response.status_code in (301, 302) \
                and request.POST.get('username') == 'admin' \
                and request.POST.get('password') == 'admin123':
            progress.pass_test('default-credentials')
        # session-fixation: the portal login stored the pre-login key in
        # the session; if the live key still equals it, nothing rotated.
        session = getattr(request, 'session', None)
        user = getattr(request, 'user', None)
        if session is not None and user is not None \
                and getattr(user, 'is_authenticated', False) \
                and session.get('_portal_login') \
                and session.get('_pre_login_key') \
                and session.session_key == session.get('_pre_login_key'):
            progress.pass_test('session-fixation')
