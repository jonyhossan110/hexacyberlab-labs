"""HexaClinic data model — patients, doctors, appointments, records.

Accounts are Django's own auth User (that is what makes the settings-level
mistakes — MD5 hasher, default admin — real). The clinical role lives on
the Profile, the way a small team bolting a portal onto Django would do it.
"""
from django.contrib.auth.models import User
from django.db import models
from django.utils import timezone


class Profile(models.Model):
    ROLES = [
        ('patient', 'Patient'),
        ('doctor', 'Doctor'),
        ('receptionist', 'Receptionist'),
    ]
    user = models.OneToOneField(User, on_delete=models.CASCADE,
                                related_name='profile')
    role = models.CharField(max_length=16, choices=ROLES, default='patient')
    phone = models.CharField(max_length=32, blank=True)
    specialty = models.CharField(max_length=80, blank=True)   # doctors
    address = models.CharField(max_length=160, blank=True)    # patients

    def __str__(self):
        return '%s (%s)' % (self.user.get_full_name() or self.user.username,
                            self.role)


class Appointment(models.Model):
    STATUS = [
        ('scheduled', 'Scheduled'),
        ('completed', 'Completed'),
        ('cancelled', 'Cancelled'),
    ]
    patient = models.ForeignKey(User, on_delete=models.CASCADE,
                                related_name='appointments_as_patient')
    doctor = models.ForeignKey(User, on_delete=models.CASCADE,
                               related_name='appointments_as_doctor')
    date = models.DateField()
    time = models.TimeField()
    reason = models.CharField(max_length=200)
    status = models.CharField(max_length=16, choices=STATUS,
                              default='scheduled')

    def __str__(self):
        return '%s with %s on %s' % (self.patient, self.doctor, self.date)


class MedicalRecord(models.Model):
    patient = models.ForeignKey(User, on_delete=models.CASCADE,
                                related_name='records')
    doctor = models.ForeignKey(User, on_delete=models.CASCADE,
                               related_name='authored_records')
    title = models.CharField(max_length=160)
    body = models.TextField()
    # filename inside the media folder (lab results, referral letters)
    attachment = models.CharField(max_length=120, blank=True)
    created_at = models.DateTimeField(default=timezone.now)

    def __str__(self):
        return '%s — %s' % (self.patient, self.title)


class RecordMessage(models.Model):
    """A message in a record's thread — patient follow-ups and care-team
    replies. Rendered in the record page with the |safe filter (see
    templates/record_detail.html), which is one of this lab's problems."""
    record = models.ForeignKey(MedicalRecord, on_delete=models.CASCADE,
                               related_name='messages')
    author = models.ForeignKey(User, on_delete=models.CASCADE)
    body = models.TextField()
    created_at = models.DateTimeField(default=timezone.now)

    def __str__(self):
        return 'message by %s on record %s' % (self.author, self.record_id)
