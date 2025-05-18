from django.urls import path
from .views import solve_rubiks_cube_view

urlpatterns = [
    path('solve/', solve_rubiks_cube_view, name='solve_rubiks_cube'),
]