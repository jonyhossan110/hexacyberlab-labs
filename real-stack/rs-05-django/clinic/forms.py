"""Forms. AccountForm is the interesting one: it was written for the
staff console, where admins may toggle who is staff, and then reused
unchanged on the patient profile page — fields and all."""
from django import forms
from django.contrib.auth.models import User


class AccountForm(forms.ModelForm):
    class Meta:
        model = User
        # is_staff was meant for the staff console. On the profile page
        # it is bound straight from the POST like everything else:
        # classic Django mass assignment.
        fields = ['first_name', 'last_name', 'email', 'is_staff']
