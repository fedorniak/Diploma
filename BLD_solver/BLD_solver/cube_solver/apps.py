from django.apps import AppConfig


class CubeSolverConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'cube_solver'

    def ready(self):
        from .memo_builder import get_memo_table, set_memo_table
        set_memo_table(get_memo_table())