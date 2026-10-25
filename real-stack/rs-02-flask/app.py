#!/usr/bin/env python3
"""HexaNotes — entry point.

Written in 2021 by a two-person startup team and "temporarily" run with the
Werkzeug development server ever since. Debug mode is ON (see config.py), so
the interactive debugger console is part of the deployed app.
"""
import os

from hexanotes import create_app

app = create_app()

if __name__ == '__main__':
    port = int(os.environ.get('PORT', '3202'))
    # The development server in production, with the debugger attached.
    app.run(host='127.0.0.1', port=port, debug=app.config['DEBUG'],
            use_reloader=False)
