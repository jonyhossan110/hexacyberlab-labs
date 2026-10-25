"""First-run seed — a small, believable clinic.

Every person, password and record below is fictional. The seed runs from
run.sh (and lazily from the middleware if the database is empty), only
when no users exist. Passwords are set through Django's normal user API,
so they are hashed by whatever PASSWORD_HASHERS puts first — MD5, here.
"""
import datetime

from django.contrib.auth.models import User
from django.utils import timezone

from .models import Appointment, MedicalRecord, Profile, RecordMessage

# username, first, last, email, password, role, specialty/phone
PEOPLE = [
    ('frontdesk', 'Marta', 'Kowalska', 'marta.kowalska@hexaclinic.example',
     'FrontDesk#2024', 'receptionist', ''),
    ('dr.lindqvist', 'Sarah', 'Lindqvist', 'dr.lindqvist@hexaclinic.example',
     'Rounds!2024', 'doctor', 'Cardiology'),
    ('dr.herrera', 'Tomas', 'Herrera', 'dr.herrera@hexaclinic.example',
     'Cardio#2024', 'doctor', 'Internal medicine'),
    ('dr.nair', 'Priya', 'Nair', 'dr.nair@hexaclinic.example',
     'Monsoon!Care3', 'doctor', 'Paediatrics'),
    ('amelia.hart', 'Amelia', 'Hart', 'amelia.hart@example.co.uk',
     'Teatime!42', 'patient', ''),
    ('oliver.reed', 'Oliver', 'Reed', 'oliver.reed@example.co.uk',
     'password123', 'patient', ''),
    ('jonas.weber', 'Jonas', 'Weber', 'jonas.weber@example.de',
     'Waldweg#9', 'patient', ''),
    ('sofia.rossi', 'Sofia', 'Rossi', 'sofia.rossi@example.it',
     'Venezia!7', 'patient', ''),
    ('emma.novak', 'Emma', 'Novak', 'emma.novak@example.cz',
     'Praha!sun5', 'patient', ''),
    ('noah.berg', 'Noah', 'Berg', 'noah.berg@example.no',
     'Tromso!night1', 'patient', ''),
    ('freya.nilsen', 'Freya', 'Nilsen', 'freya.nilsen@example.no',
     'Bergen!rain3', 'patient', ''),
    ('aisha.rahman', 'Aisha', 'Rahman', 'aisha.rahman@example.se',
     'Nordlys!6', 'patient', ''),
]


def _dt(day, hour=9):
    return timezone.make_aware(datetime.datetime(2026, 10, day, hour, 15))


def seed_if_empty():
    if User.objects.exists():
        return
    # The installer's account, created by runserver's first admin setup in
    # 2021 and never renamed, never given a real password. Scoring target
    # of the default-credentials test; the /admin/ panel is wide open to
    # anyone who tries the obvious pair.
    admin = User.objects.create_superuser(
        'admin', 'admin@hexaclinic.example', 'admin123')
    Profile.objects.create(user=admin, role='receptionist',
                           phone='+46 31 555 0100')

    users = {}
    for username, first, last, email, pw, role, specialty in PEOPLE:
        u = User.objects.create_user(username, email, pw,
                                     first_name=first, last_name=last)
        Profile.objects.create(
            user=u, role=role, specialty=specialty,
            phone='+46 31 555 01%02d' % (len(users) + 10),
            address='%d Lorensberg, Gothenburg' % (len(users) + 3)
            if role == 'patient' else '')
        users[username] = u

    lin = users['dr.lindqvist']
    her = users['dr.herrera']
    nai = users['dr.nair']

    appts = [
        ('amelia.hart', lin, 28, '09:30', 'Chest discomfort follow-up', 'scheduled'),
        ('amelia.hart', lin, 6, '10:00', 'Annual ECG review', 'completed'),
        ('oliver.reed', her, 29, '11:15', 'Blood pressure check', 'scheduled'),
        ('oliver.reed', her, 12, '11:00', 'Blood panel results', 'completed'),
        ('jonas.weber', nai, 30, '08:45', 'Vaccination — child', 'scheduled'),
        ('sofia.rossi', lin, 31, '13:30', 'Palpitations, first visit', 'scheduled'),
        ('emma.novak', her, 27, '14:00', 'Knee pain assessment', 'scheduled'),
        ('noah.berg', nai, 26, '09:00', 'Allergy testing review', 'completed'),
        ('freya.nilsen', lin, 3, '15:15', 'Thyroid panel discussion', 'completed'),
        ('aisha.rahman', her, 2, '10:30', 'Diabetes management plan', 'completed'),
    ]
    for uname, doc, day, t, reason, status in appts:
        hh, mm = t.split(':')
        Appointment.objects.create(
            patient=users[uname], doctor=doc,
            date=datetime.date(2026, 10, day),
            time=datetime.time(int(hh), int(mm)),
            reason=reason, status=status)

    records = [
        ('amelia.hart', lin, 'Cardiology review — palpitations',
         'Resting ECG unremarkable. 24h Holter shows occasional benign '
         'ectopics, no sustained arrhythmia. Advised caffeine reduction '
         'and a follow-up in three months. No medication change.',
         'lab-result-amelia-hart.txt', 6),
        ('amelia.hart', lin, 'Blood panel — October',
         'Lipid profile improved on current statin dose. LDL 2.4 mmol/L, '
         'HDL 1.5 mmol/L. Continue current prescription; recheck in six '
         'months.', '', 6),
        ('oliver.reed', her, 'Hypertension management plan',
         'BP averaging 148/92 over two weeks of home readings. Started '
         'amlodipine 5mg once daily. Patient reports occasional ankle '
         'swelling; review dose at next visit.',
         'lab-result-oliver-reed.txt', 12),
        ('oliver.reed', her, 'Referral — sleep study',
         'Snoring with witnessed apnoeas reported by partner. Referred '
         'to the university sleep lab; results attached to this record '
         'when they arrive.', '', 12),
        ('jonas.weber', nai, 'Paediatric check — Leo Weber (4)',
         'Growth tracking on the 55th percentile. Vaccinations up to '
         'date. Mild eczema on elbows; emollient prescribed.',
         'xray-request-form.txt', 18),
        ('sofia.rossi', lin, 'Initial consultation — palpitations',
         'Episodes of racing heartbeat lasting minutes, twice weekly. '
         'Thyroid function requested; cardiology workup started.',
         '', 20),
        ('emma.novak', her, 'Knee MRI summary',
         'MRI shows a partial meniscus tear, right knee. Conservative '
         'management with physiotherapy for six weeks before any '
         'surgical discussion.', '', 21),
        ('aisha.rahman', her, 'Diabetes review — HbA1c',
         'HbA1c down to 51 mmol/mol from 58. Metformin continued; diet '
         'plan reviewed with the nurse team. Eye screening booked.',
         '', 2),
    ]
    rec_objs = []
    for uname, doc, title, body, attachment, day in records:
        rec_objs.append(MedicalRecord.objects.create(
            patient=users[uname], doctor=doc, title=title, body=body,
            attachment=attachment, created_at=_dt(day)))

    RecordMessage.objects.create(
        record=rec_objs[0], author=users['amelia.hart'],
        body='Thank you, Dr Lindqvist — the palpitations have been much '
             'less frequent since I cut back on coffee, as you suggested.',
        created_at=_dt(7))
    RecordMessage.objects.create(
        record=rec_objs[2], author=users['dr.herrera'],
        body='Oliver — please keep the home BP diary going for one more '
             'week and bring it to your next appointment.',
        created_at=_dt(13))
