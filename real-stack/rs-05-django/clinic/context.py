"""Template context for the lab bar (mirrors RS-02's injected globals)."""
from .progress import TOTAL, done_count


def lab_context(request):
    user = getattr(request, 'user', None)
    portal_user = user if (user is not None
                           and getattr(user, 'is_authenticated', False)) \
        else None
    done = done_count()
    return {'portal_user': portal_user, 'lab_done': done,
            'lab_total': TOTAL, 'lab_pct': done * 100 // TOTAL}
