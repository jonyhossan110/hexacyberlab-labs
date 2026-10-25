from django.contrib import admin

from .models import Appointment, MedicalRecord, Profile, RecordMessage

admin.site.register(Profile)
admin.site.register(Appointment)
admin.site.register(MedicalRecord)
admin.site.register(RecordMessage)
