#!/usr/bin/env python

import argparse
import binascii
import collections
import copy
import datetime
from hashlib import sha1
import hmac
import logging
import random
import time
import urllib

from flask import Flask, abort, redirect, render_template, request, session, url_for
import requests

import app_config
from render_utils import make_context

app = Flask(__name__)
app.config['PROPAGATE_EXCEPTIONS'] = True
app.secret_key = app_config.get_secrets()['SESSION_KEY']

file_handler = logging.FileHandler(app_config.APP_LOG_PATH)
file_handler.setLevel(logging.INFO)
app.logger.addHandler(file_handler)
app.logger.setLevel(logging.INFO)

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
    url = 'https://api.twitter.com/oauth/request_token'

    session.clear()
    session['oauth_secret'] = ''

    params = {
        # TKTK: don't use IP
        'oauth_callback' : 'http://54.210.24.220/authorized/',
        'oauth_consumer_key' : app_config.get_secrets()['TWITTER_CONSUMER_KEY'],
        'oauth_nonce' : str(random.randint(1, 999999999)),
        'oauth_signature_method' : 'HMAC-SHA1',
        'oauth_timestamp' : int(time.time()),
        'oauth_version' : '1.0'
    }

    signature = sign_request(params, 'POST', url)

    params['oauth_signature'] = signature 

    response = requests.post(url, headers={
        'Authorization': create_oauth_headers(params)
    })

    data = parse_response(response.text)

    session['oauth_token'] = data['oauth_token']
    session['oauth_secret'] = data['oauth_token_secret']

    return redirect('https://api.twitter.com/oauth/authorize?oauth_token=' + session['oauth_token'])

@app.route('/authorized/')
def _authorized():
    """
    Callback for Twitter authentication.
    """
    url = 'https://api.twitter.com/oauth/access_token'

    if request.args.get('oauth_token', '') != session['oauth_token']:
        abort(401)
            
    params = {
        'oauth_consumer_key' : app_config.get_secrets()['TWITTER_CONSUMER_KEY'],
        'oauth_nonce' : str(random.randint(1, 999999999)),
        'oauth_signature_method' : 'HMAC-SHA1',
        'oauth_timestamp' : int(time.time()),
        'oauth_version' : '1.0',
        'oauth_token' : session['oauth_token']
    }

    signature = sign_request(params, 'POST', url)

    params['oauth_signature'] = signature

    response = requests.post(url, data={
        'oauth_verifier': request.args.get('oauth_verifier')
    }, headers={
        'Authorization': create_oauth_headers(params)
    })

    data = parse_response(response.text)

    session['screen_name'] = data['screen_name']
    session['oauth_token'] = data['oauth_token']

    return redirect(url_for('index'))

@app.route('/logout/')
def _logout():
    session.clear()

    return redirect(url_for('index'))

@app.route('/post/')
def _post():
    # TKTK: check if user is logged in

    url = 'https://api.twitter.com/1.1/statuses/update.json'
    status = 'test'

    oauth_params = {
        'oauth_consumer_key' : app_config.get_secrets()['TWITTER_CONSUMER_KEY'],
        'oauth_nonce' : str(random.randint(1, 999999999)),
        'oauth_signature_method' : 'HMAC-SHA1',
        'oauth_timestamp' : int(time.time()),
        'oauth_version' : '1.0',
        'oauth_token' : session['oauth_token'],
    }

    signature_params = copy.copy(oauth_params)
    signature_params['status'] = status

    signature = sign_request(signature_params, 'POST', url)

    oauth_params['oauth_signature'] = signature

    response = requests.post(url, data={
        'status': status,
    }, headers={
        'Authorization': create_oauth_headers(oauth_params)
    })

    #data = parse_response(response.text)

    return response.text

def parse_response(text):
    """
    Parse a response from Twitter into a dict.
    """
    parts = text.split('&')

    data = {}

    for p in parts:
        k, v = p.split('=')

        data[k] = v

    return data

def sign_request(parameters, method, baseURL):
    """
    Sign an oauth request for Twitter.
    """
    baseURL = urllib.quote(baseURL, '')

    p = collections.OrderedDict(sorted(parameters.items(), key=lambda t: t[0]))

    requestString = method + '&' + baseURL + '&'
    parameterString = ''

    for idx, key in enumerate(p.keys()):
        paramString = key + '=' + urllib.quote(str(p[key]), '')
        if idx < len(p.keys()) - 1:
            paramString += '&'

        parameterString += paramString

    result = requestString + urllib.quote(parameterString, '')

    signingKey = app_config.get_secrets()['TWITTER_CONSUMER_SECRET'] + '&' + session['oauth_secret']

    hashed = hmac.new(signingKey, result, sha1)
    signature = binascii.b2a_base64(hashed.digest())[:-1]

    return signature

def create_oauth_headers(oauthParams):
    """
    Create a header string containing OAuth data.
    """
    oauthp = collections.OrderedDict(sorted(oauthParams.items(), key=lambda t: t[0]))

    headerString = 'OAuth '

    for idx, key in enumerate(oauthp):
        hString = key + '="' + urllib.quote(str(oauthp[key]), '') + '"'
        if idx < len(oauthp.keys()) - 1:
            hString += ','

        headerString += hString

    return headerString

# Boilerplate
if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('-p', '--port')
    args = parser.parse_args()
    server_port = 8000

    if args.port:
        server_port = int(args.port)

    app.run(host='0.0.0.0', port=server_port, debug=app_config.DEBUG)
