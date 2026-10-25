"""HexaFit app factory."""
import os
import traceback

from flask import Flask, g, jsonify, request
from werkzeug.exceptions import HTTPException

from . import config
from .applog import hf_log


def create_app():
    app = Flask(__name__,
                template_folder=os.path.join(config.BASE_DIR, 'templates'),
                static_folder=os.path.join(config.BASE_DIR, 'static'))
    app.config['SECRET_KEY'] = 'hexafit-flask-session'

    from .api_routes import bp as api_bp
    from .lab_routes import bp as lab_bp
    from .web_routes import bp as web_bp
    app.register_blueprint(api_bp)
    app.register_blueprint(web_bp)
    app.register_blueprint(lab_bp)

    @app.context_processor
    def inject_globals():
        from .progress import done_count
        done = done_count()
        return {'lab_done': done, 'lab_total': 12,
                'lab_pct': done * 100 // 12}

    @app.before_request
    def _before():
        # Resolve the bearer token first so the log line can name the
        # caller (and a forged token is noticed on any route it touches).
        if request.headers.get('Authorization'):
            from .auth import _authenticate
            _authenticate()
        path = request.path
        if request.query_string:
            path += '?' + request.query_string.decode('utf-8', 'replace')
        hf_log('%s %s' % (request.method, path))

    @app.errorhandler(Exception)
    def handle_error(e):
        if isinstance(e, HTTPException):
            return jsonify({'error': e.name, 'detail': e.description}), e.code
        # Verbose errors, "to help the mobile team debug": the client gets
        # the traceback, the file paths, and a slice of the live config.
        tb = traceback.format_exc()
        body = {
            'error': str(e),
            'type': type(e).__name__,
            'traceback': tb,
            'app_root': config.BASE_DIR,
            'config': {
                'JWT_SECRET': getattr(config, 'JWT' + '_SECRET'),
                'DATABASE': config.DATABASE,
                'VERBOSE_ERRORS': config.VERBOSE_ERRORS,
            },
        }
        if 'Traceback' in tb and config.BASE_DIR in tb:
            from .progress import pass_test
            pass_test('debug-exposure')
            hf_log('ERROR verbose 500 served with traceback + config')
        return jsonify(body), 500

    return app
