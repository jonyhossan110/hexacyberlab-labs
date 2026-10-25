#!/usr/bin/env python3
"""HexaFit — entry point.

A fitness-tracking REST API written by a small startup team and served,
like so many real APIs, by the Werkzeug development server. Threaded,
because the founders turned threading on to "make the leaderboard faster"
— a decision the points-redemption endpoint will regret.
"""
import os

from hexafit import create_app

app = create_app()

if __name__ == '__main__':
    port = int(os.environ.get('PORT', '3208'))
    app.run(host='127.0.0.1', port=port, debug=False, threaded=True,
            use_reloader=False)
