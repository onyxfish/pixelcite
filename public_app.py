#!/usr/bin/env python

import argparse
import binascii
import collections
import datetime
from hashlib import sha1
import hmac
import logging
import random
import time
import urllib
import urllib2 

from flask import Flask, abort, redirect, render_template, request, session

import app_config
from render_utils import make_context

app = Flask(__name__)
app.config['PROPAGATE_EXCEPTIONS'] = True

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
    return render_template('index.html', **make_context(asset_depth=1))

@app.route('/authenticate')
def authenticate():
    session.clear()
    session['oauth_secret'] = ''

    params = {
        # TKTK
        'oauth_callback' : 'http://54.210.24.220/authorized',
        'oauth_consumer_key' : app_config.get_secrets()['TWITTER_CONSUMER_KEY'],
        'oauth_nonce' : str(random.randint(1, 999999999)),
        'oauth_signature_method' : 'HMAC-SHA1',
        'oauth_timestamp' : int(time.time()),
        'oauth_version' : '1.0'
    }

    signature = sign_request(params, 'POST', 'https://api.twitter.com/oauth/request_token')

    params['oauth_signature'] = signature 

    http_request = urllib2.Request('https://api.twitter.com/oauth/request_token', '')
    http_request.add_header('Authorization', create_oauth_headers(params))

    try:
        response = urllib2.urlopen(http_request)
    except urllib2.HTTPError, e:
        return e.read()

    data = getParameters(response.read())

    session['oauth_token'] = data['oauth_token']
    session['oauth_secret'] = data['oauth_token_secret']

    return redirect('https://api.twitter.com/oauth/authorize?oauth_token=' + session['oauth_token'])

@app.route('/authorized')
def authorized():
    if request.args.get('oauth_token', '') != session['oauth_token']:
        abort(401)
            
    params = {
        "oauth_consumer_key" : app_config.get_secrets()['TWITTER_CONSUMER_KEY'],
        "oauth_nonce" : str(random.randint(1, 999999999)),
        "oauth_signature_method" : "HMAC-SHA1",
        "oauth_timestamp" : int(time.time()),
        "oauth_version" : "1.0",
        "oauth_token" : session['oauth_token']
    }

    signature = sign_request(params, "POST", "https://api.twitter.com/oauth/access_token")

    params["oauth_signature"] = signature

    http_request = urllib2.Request("https://api.twitter.com/oauth/access_token", "oauth_verifier=" + request.args.get('oauth_verifier'))
    http_request.add_header("Authorization", create_oauth_headers(params))
    
    try:
        httpResponse = urllib2.urlopen(http_request)
    except urllib2.HTTPError, e:
        return e.read()

    data = getParameters(httpResponse.read())

    session['oauth_token'] = data["oauth_token"]

    return "Authorised " + session['oauth_token']

def getParameters(paramString):
    paramString = paramString.split("&")

    pDict = {}

    for parameter in paramString:
            parameter = parameter.split("=")

            pDict[parameter[0]] = parameter[1]

    return pDict

def sign_request(parameters, method, baseURL):
    baseURL = urllib.quote(baseURL, '')

    p = collections.OrderedDict(sorted(parameters.items(), key=lambda t: t[0]))

    requestString = method + "&" + baseURL + "&"
    parameterString = ""

    for idx, key in enumerate(p.keys()):
            paramString = key + "=" + urllib.quote(str(p[key]), '')
            if idx < len(p.keys()) - 1:
                    paramString += "&"

            parameterString += paramString

    result = requestString + urllib.quote(parameterString, '')

    signingKey = app_config.get_secrets()['TWITTER_CONSUMER_SECRET'] + "&" + session['oauth_secret']

    print signingKey

    hashed = hmac.new(signingKey, result, sha1)
    signature = binascii.b2a_base64(hashed.digest())[:-1]

    return signature

def create_oauth_headers(oauthParams):
	
    oauthp = collections.OrderedDict(sorted(oauthParams.items(), key=lambda t: t[0]))

    headerString = "OAuth "

    for idx, key in enumerate(oauthp):
            hString = key + "=\"" + urllib.quote(str(oauthp[key]), '') + "\""
            if idx < len(oauthp.keys()) - 1:
                    hString += ","

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
