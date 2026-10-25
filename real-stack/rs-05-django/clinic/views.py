"""HexaClinic portal views.

Written by the clinic's two-person dev team between 2021 and 2023. The
portal has its own hand-rolled login on top of Django's session framework
(a "legacy SSO bridge" that outlived the legacy system), one search page
that predates their ORM knowledge, and a template that trusts record
messages completely. Each flaw here is a scored test of RS-05.
"""
import os
import urllib.parse
import urllib.request
from functools import wraps

from django.conf import settings as django_settings
from django.contrib.auth import (BACKEND_SESSION_KEY, HASH_SESSION_KEY,
                                 SESSION_KEY, authenticate)
from django.contrib.auth.models import User
from django.http import HttpResponse, JsonResponse
from django.shortcuts import get_object_or_404, redirect, render
from django.views.decorators.csrf import csrf_exempt

from . import progress
from .applog import hc_log
from .forms import AccountForm
from .models import Appointment, MedicalRecord, Profile, RecordMessage

MARKUP_TOKENS = ('<script', '<svg', '<img', 'onerror', 'onload', '<iframe')
TRAVERSAL_MARKERS = (b'HEXACLINIC_DB_PASSWORD', b'HEXACLINIC_INTERNAL',
                     b'PASSWORD_HASHERS', b'SECRET_KEY')
INTERNAL_MARKER = 'HEXACLINIC_INTERNAL_EXPORT'


def role_of(user):
    try:
        return user.profile.role
    except Profile.DoesNotExist:
        return 'patient'


def portal_required(view):
    @wraps(view)
    def wrap(request, *args, **kwargs):
        if not request.user.is_authenticated:
            return redirect('/login/?next=' + request.path)
        return view(request, *args, **kwargs)
    return wrap


def _establish_portal_session(request, user):
    """The portal's hand-rolled login. It writes the auth keys Django's
    middleware expects straight into whatever session the visitor
    already has — and never cycles the session key. That is exactly
    what django.contrib.auth.login() exists to prevent, and exactly
    what session fixation needs."""
    session = request.session
    if session.session_key is None:
        session['portal'] = 'hexaclinic'
        session.save()
    pre_login_key = session.session_key
    session[SESSION_KEY] = str(user.pk)
    session[BACKEND_SESSION_KEY] = 'django.contrib.auth.backends.ModelBackend'
    session[HASH_SESSION_KEY] = user.get_session_auth_hash()
    session['_portal_login'] = True
    session['_pre_login_key'] = pre_login_key
    # No session.cycle_key() anywhere. The key you arrived with is the
    # key you keep — see the session-fixation test.


def home(request):
    if 'landing_seen' not in request.session:
        request.session['landing_seen'] = '1'
    doctors = User.objects.filter(profile__role='doctor').order_by('last_name')
    return render(request, 'home.html', {'doctors': doctors})


def portal_login(request):
    if 'login_seen' not in request.session:
        request.session['login_seen'] = '1'
    error = ''
    if request.method == 'POST':
        user = authenticate(request,
                            username=request.POST.get('username', ''),
                            password=request.POST.get('password', ''))
        if user is not None:
            _establish_portal_session(request, user)
            hc_log(request, 'LOGIN ok %s' % user.username)
            return redirect(request.POST.get('next') or '/dashboard/')
        progress.attempt('login:' + request.POST.get('username', '?'))
        error = 'Invalid username or password.'
    return render(request, 'login.html', {'error': error})


def portal_logout(request):
    request.session.flush()
    return redirect('/')


def register(request):
    error = ''
    if request.method == 'POST':
        username = request.POST.get('username', '').strip()
        email = request.POST.get('email', '').strip()
        password = request.POST.get('password', '')
        if not username or not password:
            error = 'Username and password are required.'
        elif User.objects.filter(username=username).exists():
            error = 'That username is taken.'
        else:
            user = User.objects.create_user(
                username, email, password,
                first_name=request.POST.get('first_name', ''),
                last_name=request.POST.get('last_name', ''))
            Profile.objects.create(user=user, role='patient')
            _establish_portal_session(request, user)
            return redirect('/dashboard/')
    return render(request, 'register.html', {'error': error})


@portal_required
def dashboard(request):
    user = request.user
    role = role_of(user)
    if role == 'patient':
        appointments = Appointment.objects.filter(patient=user) \
            .order_by('-date', '-time')[:6]
        records = MedicalRecord.objects.filter(patient=user) \
            .order_by('-created_at')[:6]
    else:
        appointments = Appointment.objects.all() \
            .order_by('-date', '-time')[:8]
        records = MedicalRecord.objects.all().order_by('-created_at')[:8]
    return render(request, 'dashboard.html',
                  {'appointments': appointments, 'records': records,
                   'role': role})


@portal_required
def records_list(request):
    if role_of(request.user) == 'patient':
        records = MedicalRecord.objects.filter(patient=request.user)
    else:
        records = MedicalRecord.objects.all()
    return render(request, 'records.html',
                  {'records': records.order_by('-created_at')})


@portal_required
def record_search(request):
    """Legacy record search. It predates the team's ORM knowledge and
    still builds its query by gluing the search text into a raw() call."""
    q = request.GET.get('q', '')
    results = []
    if q:
        sql = ("SELECT * FROM clinic_medicalrecord WHERE title LIKE '%"
               + q + "%' OR body LIKE '%" + q + "%' ORDER BY id")
        results = list(MedicalRecord.objects.raw(sql))
        low = q.lower()
        tautology = ("' or" in low or '" or' in low or ' or 1=1' in low)
        union = 'union' in low
        if (tautology or union) and any(
                r.patient_id != request.user.id for r in results):
            progress.pass_test('orm-sqli')
        if union and any('@' in (r.title or '') or '@' in (r.body or '')
                         or 'md5$' in (r.body or '') for r in results):
            progress.pass_test('orm-sqli')
    return render(request, 'record_search.html', {'q': q, 'results': results})


@portal_required
def record_detail(request, pk):
    # The legacy URL scheme hands the id over as a string and converts
    # here, unguarded — a non-numeric id is a 500 (see debug-page).
    record = get_object_or_404(MedicalRecord, pk=int(pk))
    user = request.user
    # The record is loaded by id alone; nobody ever compares its owner
    # to the visitor. Patients walk ids and read the whole clinic.
    if role_of(user) == 'patient' and record.patient_id != user.id:
        progress.pass_test('idor-record')
    if request.method == 'POST':
        body = request.POST.get('body', '').strip()
        if body:
            RecordMessage.objects.create(record=record, author=user,
                                         body=body)
            return redirect('/records/%d/' % record.id)
    # |safe detection: markup stored in the note or a message is about
    # to be served raw to someone who did not write it.
    stored = [(record.body, record.doctor_id)]
    stored += [(m.body, m.author_id) for m in record.messages.all()]
    for text, author_id in stored:
        if author_id != user.id and any(t in (text or '').lower()
                                        for t in MARKUP_TOKENS):
            progress.pass_test('xss-safe-filter')
            break
    return render(request, 'record_detail.html', {'record': record})


@portal_required
def import_record(request):
    """'Import a record from another clinic' — the portal fetches any
    URL it is given, from the server, with the server's network reach,
    and shows what came back."""
    message = ''
    fetched = ''
    if request.method == 'POST':
        url = request.POST.get('url', '').strip()
        if url:
            try:
                req = urllib.request.Request(
                    url, headers={'User-Agent': 'HexaClinic-Importer/1.0'})
                with urllib.request.urlopen(req, timeout=4) as resp:
                    fetched = resp.read(200000).decode('utf-8', 'replace')
                if INTERNAL_MARKER in fetched:
                    progress.pass_test('ssrf-import')
                doctor = User.objects.filter(
                    profile__role='doctor').first() or request.user
                MedicalRecord.objects.create(
                    patient=request.user, doctor=doctor,
                    title='Imported record',
                    body=fetched[:2000])
                message = 'Record imported and attached to your file.'
                hc_log(request, 'IMPORT fetched %s' % url)
            except Exception as exc:
                message = 'Import failed: %s' % exc
    return render(request, 'import_record.html',
                  {'message': message, 'fetched': fetched})


def internal_health_export(request):
    """Internal sync endpoint for the clinic's other system. Not linked
    anywhere in the UI; it assumes only the LAN can reach it. The portal
    itself is running on that 'LAN'."""
    return JsonResponse({
        'service': 'hexaclinic',
        'marker': INTERNAL_MARKER,
        'patients': User.objects.filter(profile__role='patient').count(),
        'records': MedicalRecord.objects.count(),
        'appointments': Appointment.objects.count(),
        'note': 'internal only — do not expose',
    })


@portal_required
def appointments_list(request):
    if role_of(request.user) == 'patient':
        appts = Appointment.objects.filter(patient=request.user)
    elif role_of(request.user) == 'doctor':
        appts = Appointment.objects.filter(doctor=request.user)
    else:
        appts = Appointment.objects.all()
    return render(request, 'appointments.html',
                  {'appointments': appts.order_by('-date', '-time')})


@csrf_exempt
@portal_required
def appointment_cancel(request, pk):
    """Cancelling kept failing from the clinic's old mobile app (it
    could not present a CSRF token), so the endpoint was exempted.
    The state change now trusts the session cookie alone."""
    appt = get_object_or_404(Appointment, pk=pk)
    if request.method == 'POST':
        was = appt.status
        appt.status = 'cancelled'
        appt.save()
        if was != 'cancelled':
            referer = request.META.get('HTTP_REFERER', '')
            ref_host = urllib.parse.urlparse(referer).netloc if referer else ''
            if 'csrfmiddlewaretoken' not in request.POST and (
                    not referer or ref_host != request.get_host()):
                progress.pass_test('csrf-exempt')
            hc_log(request, 'APPOINTMENT %d cancelled' % appt.id)
    return redirect('/appointments/')


@portal_required
def profile_view(request):
    user = request.user
    was_staff = user.is_staff
    message = ''
    if request.method == 'POST':
        form = AccountForm(request.POST, instance=user)
        if form.is_valid():
            form.save()
            if user.is_staff and not was_staff:
                progress.pass_test('mass-assignment')
                hc_log(request, 'PROFILE %s became staff via profile form'
                       % user.username)
            message = 'Profile saved.'
    else:
        form = AccountForm(instance=user)
    return render(request, 'profile.html', {'form': form, 'message': message})


@portal_required
def media_download(request):
    """Lab results and letters live in the media folder; the filename
    parameter is joined straight onto it."""
    name = request.GET.get('file', '')
    if not name:
        return HttpResponse('No file requested.', status=400)
    path = os.path.join(django_settings.MEDIA_ROOT, name)
    if not os.path.isfile(path):
        return HttpResponse('File not found.', status=404)
    with open(path, 'rb') as f:
        content = f.read()
    if '..' in name and any(m in content for m in TRAVERSAL_MARKERS):
        progress.pass_test('path-traversal')
    hc_log(request, 'DOWNLOAD %s' % name)
    return HttpResponse(content, content_type='text/plain')
