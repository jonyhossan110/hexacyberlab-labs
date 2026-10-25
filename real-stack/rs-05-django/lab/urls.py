from django.urls import path

from . import views

urlpatterns = [
    path('brief', views.brief, name='lab-brief'),
    path('tests', views.tests, name='lab-tests'),
    path('guide', views.guide, name='lab-guide'),
    path('review', views.review, name='lab-review'),
    path('logs', views.logs, name='lab-logs'),
    path('complete', views.complete, name='lab-complete'),
]
