var STATUS_CHARS = 140;
var RESERVED_CHARS = 23;
var MAX_LENGTH = STATUS_CHARS - RESERVED_CHARS;
var URL_CHARS = 23;
var AMAZON_DOMAINS = ['amazon.com', 'www.amazon.com', 'amzn.to'];

var $status_wrapper = null;
var $display_status = null;
var $display_quote = null;
var $display_attribution = null;

var $poster = null;
var $logo_wrapper = null;

var $status = null;
var $count = null;
var $quote = null;
var $source = null;
var $fontSize = null;

var $login = null;
var $tweet = null;
var $save = null;

var exampleQuotes = [
    {
        'status': 'Words of wisdom.',
        'quote': 'A social movement that only moves people is merely a revolt. A movement that changes both people and institutions is a revolution.',
        'source': 'Martin Luther King, Jr., <em>Why We Can\'t Wait</em>',
        'fontSize': 31
    }
];

/*
 * On page load.
 */
var onDocumentReady = function() {
    $status_wrapper = $('.status');
    $display_quote = $('.poster blockquote p');
    $display_attribution = $('.attribution');
    $display_status = $('#display-status');
    $count = $('.count');

    $poster = $('.poster');
    $logo_wrapper = $('.logo-wrapper');

    $status = $('#status');
    $quote = $('#quote'); 
    $source = $('#source');
    $fontSize = $('#fontsize');

    $login = $('#login');
    $save = $('#save');
    $tweet = $('#tweet');

    // Event binding
    $quote.on('keyup', onQuoteKeyUp);
    $source.on('keyup', onSourceKeyUp);
    $status.on('keyup', onStatusKeyUp);
    $fontSize.on('change', onFontSizeChange);

    $login.on('click', onLoginClick);
    $tweet.on('click', onTweetClick);
    $save.on('click', onSaveClick);

    var quote = loadQuote();   
    
    if (!quote) {
        quote = loadExampleQuote();
    }

    setQuote(quote);
}

/*
 * Load an example quote.
 */
var loadExampleQuote = function() {
    return exampleQuotes[Math.floor(Math.random() * exampleQuotes.length)];
}

/*
 * Load quote from cookies.
 */
var loadQuote = function() {
    if ($.cookie('status') === undefined) {
        return null;
    }

    return {
        'status': $.cookie('status'),
        'quote': $.cookie('quote'),
        'source': $.cookie('source'),
        'fontSize': $.cookie('fontSize')
    }
}

/*
 * Save quote to cookies.
 */
var saveQuote = function() {
    $.cookie('status', $status.val());
    $.cookie('quote', $quote.val());
    $.cookie('source', $source.val());
    $.cookie('fontSize', $fontSize.val());
}

/*
 * Update form with quote data.
 */
var setQuote = function(quote) {
    $status.val(quote['status']);
    $quote.val(quote['quote']);
    $source.val(quote['source']);
    $fontSize.val(quote['fontSize']);

    $status.trigger('keyup');
    $quote.trigger('keyup');
    $source.trigger('keyup');
    $fontSize.trigger('change');
}

/*
 * Smarten quotes.
 */
var smarten = function(a) {
    // opening singles
    a = a.replace(/(^|[-\u2014\s(\["])'/g, "$1\u2018");
    // closing singles & apostrophes
    a = a.replace(/'/g, "\u2019");
    // opening doubles
    a = a.replace(/(^|[-\u2014/\[(\u2018\s])"/g, "$1\u201c");
    // closing doubles
    a = a.replace(/"/g, "\u201d");
    // em-dashes
    a = a.replace(/--/g, "\u2014");
    // full spaces wrapping em dash
    a = a.replace(/ \u2014 /g, "\u2009\u2014\u2009");
    
    return a;
}

/*
 * POST without a pre-generated form.
 */
var post = function(path, params) {
    var $form = $('<form></form>');
    $form.attr('method', 'post');
    $form.attr('action', path);

    for (var key in params) {
        if (params.hasOwnProperty(key)) {
            var $hiddenField = $('<input />');
            $hiddenField.attr('type', 'hidden');
            $hiddenField.attr('name', key);
            $hiddenField.attr('value', params[key]);

            $form.append($hiddenField);
         }
    }

    $('body').append($form);
    $form.submit();
}

/*
 * Slugify a string for a filename.
 */
var slugify = function(text){
    return text
        .toLowerCase()
        .replace(/[^\w ]+/g,'')
        .replace(/ +/g,'-');
}

/*
 * Gets data for the image calls a callback when its ready
 */
var getImage = function(callback) {
    html2canvas($poster, {
        onrendered: function(canvas) {
            var dataUrl = canvas.toDataURL();

            callback(dataUrl);
        }
    });
}

/*
 * Tweet the image.
 */
var tweet = function(dataUrl) {
    // Ensure we aren't mid-debounce
    updateStatus();

    if ($count.hasClass('negative')) {
        alert('Sorry, your status update is too long to post to Twitter.');

        return;
    }

    var status = $display_status.text();

    ga('send', 'event', 'pixelcite', 'tweet');

    post('/post/', {
        'status': status,
        'image': dataUrl.split(',')[1]
    });
}

/*
 * Downloads the image.
 */
var saveImage = function(dataUrl) {
    ga('send', 'event', 'pixelcite', 'save-image');

    // Ensure we aren't mid-debounce
    updateStatus();

    var quote = $('blockquote').text().split(' ', 5);
    var filename = slugify(quote.join(' '));

    var a = $('<a>').attr('href', dataUrl).attr('download', 'quote-' + filename + '.png').appendTo('body');

    a[0].click();

    a.remove();

    $('#download').attr('href', dataUrl).attr('target', '_blank');
    $('#download').trigger('click');
}

/*
 * Process urls and apply affiliate codes.
 */
var processUrl = function(url) {
    if (url.indexOf('http') != 0) {
        url = 'http://' + url;
    }

    var parser = document.createElement('a');
    parser.href = url;

    if (AMAZON_DOMAINS.indexOf(parser.hostname) >= 0) {
        var pixelciteTag = 'tag=' + APP_CONFIG.AMAZON_AFFILIATE_TAG;

        var tag = /(tag\=.*?)[&\W]/;
        var match = url.match(tag);

        if (match) {
            var existingTag = match[1];

            return url.replace(existingTag, pixelciteTag); 
        }

        if (parser.search) {
            return url + '&' + pixelciteTag;
        }

        return url + '?' + pixelciteTag;
    }

    return url;
}

var updateAttribution = function() {
    var source = $source.val();
    var attr = '';

    if (source) {
        attr += '&mdash;&thinsp;' + source;
    }

    $display_attribution.html(attr);
}

var updateStatus = function() {
    var status = $status.val();
    var count = status.length;

    var entities = twttr.txt.extractEntitiesWithIndices(status, {
        'extractUrlsWithoutProtocol': true
    });

    _.each(entities, function(entity) {
        if (entity.url === undefined) {
            return;
        }

        count -= entity.url.length;
        count += URL_CHARS;

        entity.url = processUrl(entity.url);
    });

    var status = twttr.txt.autoLinkEntities(status, entities, {
        'targetBlank': true
    });

    $display_status.html(status);

    var remaining = MAX_LENGTH - count;

    $count.text(remaining);
    $count.toggleClass('negative', remaining < 0);
}

var updateStatusDebounced = _.debounce(updateStatus, 200); 

var onStatusKeyUp = function() {
    updateStatusDebounced();
    saveQuote();
}

var onQuoteKeyUp = function() {
    $display_quote.text(smarten($(this).val()));
    saveQuote();
}

var onSourceKeyUp = function() {
    updateAttribution();
    saveQuote();
}

var onFontSizeChange = function() {
    var fontSize = $fontSize.val().toString() + 'px';

    $poster.css('font-size', fontSize);
    
    saveQuote();
}

var onLoginClick = function() {
    ga('send', 'event', 'pixelcite', 'login');

    window.location.href = '/authenticate/';
}

var onTweetClick = function() {
    getImage(tweet);
}

var onSaveClick =  function() {
    getImage(saveImage);
}

$(onDocumentReady);
