#!/usr/bin/env python

import argparse
import datetime
import logging

from flask import Flask, abort, redirect, render_template, request, session, url_for
from twython import Twython

import app_config
from render_utils import make_context

app = Flask(__name__)
app.config['PROPAGATE_EXCEPTIONS'] = True
app.secret_key = app_config.get_secrets()['SESSION_KEY']

file_handler = logging.FileHandler(app_config.APP_LOG_PATH)
file_handler.setLevel(logging.INFO)
app.logger.addHandler(file_handler)
app.logger.setLevel(logging.INFO)

secrets = app_config.get_secrets()

# Example application views
@app.route('/test/', methods=['GET'])
def _test_app():
    """
    Test route for verifying the application is running.
    """
    app.logger.info('Test URL requested.')

    return datetime.datetime.now().strftime('%Y-%m-%d %H:%M:%S')

# Example of rendering HTML with the rig
import static
from render_utils import urlencode_filter

app.register_blueprint(static.static)
app.jinja_env.filters['urlencode'] = urlencode_filter

@app.route ('/', methods=['GET'])
def index():
    """
    Example view rendering a simple page.
    """
    context = make_context(asset_depth=1)

    return render_template('index.html', **context)

@app.route('/authenticate/')
def _authenticate():
    """
    Initiate Twitter authentication.
    """
    session.clear()
    session['oauth_secret'] = ''

    twitter = Twython(
        secrets['TWITTER_CONSUMER_KEY'],
        secrets['TWITTER_CONSUMER_SECRET']
    )

    auth = twitter.get_authentication_tokens(callback_url='http://54.210.24.220/authorized/')

    session['oauth_token'] = auth['oauth_token']
    session['oauth_token_secret'] = auth['oauth_token_secret']

    return redirect(auth['auth_url'])

@app.route('/authorized/')
def _authorized():
    """
    Callback for Twitter authentication.
    """
    if request.args.get('oauth_token', '') != session['oauth_token']:
        abort(401)
            
    twitter = Twython(
        secrets['TWITTER_CONSUMER_KEY'],
        secrets['TWITTER_CONSUMER_SECRET'],
        session['oauth_token'],
        session['oauth_token_secret']
    )

    auth = twitter.get_authorized_tokens(request.args.get('oauth_verifier'))

    session['oauth_token'] = auth['oauth_token']
    session['oauth_token_secret'] = auth['oauth_token_secret']
    session['screen_name'] = auth['screen_name']

    return redirect(url_for('index'))

@app.route('/logout/')
def _logout():
    session.clear()

    return redirect(url_for('index'))

@app.route('/post/')
def _post():
    # TKTK: check if user is logged in

    twitter = Twython(
        secrets['TWITTER_CONSUMER_KEY'],
        secrets['TWITTER_CONSUMER_SECRET'],
        session['oauth_token'],
        session['oauth_token_secret']
    )

    status = 'test'
    image = open('www/assets/logo36.png', 'rb')

    twitter.update_status_with_media(status=status, media=image)

    return redirect(url_for('index'))

# Boilerplate
if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('-p', '--port')
    args = parser.parse_args()
    server_port = 8000

    if args.port:
        server_port = int(args.port)

    app.run(host='0.0.0.0', port=server_port, debug=app_config.DEBUG)
