from django.urls import path

from . import views

urlpatterns = [
    path('', views.home, name='home'),
    path('login/', views.portal_login, name='login'),
    path('logout/', views.portal_logout, name='logout'),
    path('register/', views.register, name='register'),
    path('dashboard/', views.dashboard, name='dashboard'),
    path('records/', views.records_list, name='records'),
    path('records/search/', views.record_search, name='record-search'),
    path('records/import/', views.import_record, name='record-import'),
    path('records/<str:pk>/', views.record_detail, name='record-detail'),
    path('appointments/', views.appointments_list, name='appointments'),
    path('appointments/<int:pk>/cancel/', views.appointment_cancel,
         name='appointment-cancel'),
    path('profile/', views.profile_view, name='profile'),
    path('media/download/', views.media_download, name='media-download'),
    path('internal/health-export/', views.internal_health_export,
         name='internal-health'),
]
