"""HexaNotes app factory."""
import os

from flask import Flask, g, request

from . import config
from .applog import hn_log
from .auth import check_forged_session

CONSOLE_PROOF = os.path.join(config.BASE_DIR, 'logs', 'console_proof.txt')


def create_app():
    app = Flask(__name__,
                template_folder=os.path.join(config.BASE_DIR, 'templates'),
                static_folder=os.path.join(config.BASE_DIR, 'static'))
    app.config['DEBUG'] = config.DEBUG
    app.config['SECRET_KEY'] = config.SECRET_KEY

    from .app_routes import bp as app_bp
    from .lab_routes import bp as lab_bp
    app.register_blueprint(app_bp)
    app.register_blueprint(lab_bp)

    @app.context_processor
    def inject_globals():
        from .auth import current_user
        from .progress import done_count
        done = done_count()
        return {'user': current_user(), 'lab_done': done, 'lab_total': 12,
                'lab_pct': done * 100 // 12}

    @app.before_request
    def _before():
        check_forged_session()
        path = request.path
        if request.query_string:
            path += '?' + request.query_string.decode('utf-8', 'replace')
        hn_log('%s %s' % (request.method, path))
        # The Werkzeug console runs outside Flask's routing, so its proof
        # is a file: if code executed in the debugger wrote the agreed
        # proof file into logs/, the next request records the pass.
        if os.path.isfile(CONSOLE_PROOF):
            from .progress import load_progress, pass_test
            if not load_progress().get('tests', {}).get('debug-console'):
                pass_test('debug-console')
                hn_log('DEBUG CONSOLE proof file detected — code was '
                       'executed in the Werkzeug debugger')

    return app
