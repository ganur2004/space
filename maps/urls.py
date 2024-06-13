# urls.py
from django.urls import path
from . import views

urlpatterns = [
    path('', views.home, name='home'),
    path('get_imagery/', views.get_imagery, name='get_imagery'),
    path('second/', views.second, name="second"),
    path('get_filters/', views.get_filters, name='get_filters'),
    path('get_size/', views.get_size, name='get_size'),
]
