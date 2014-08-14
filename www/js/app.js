var STATUS_CHARS = 140;
var RESERVED_CHARS = 23;
var URL_CHARS = 23;

var $status_wrapper = null;
var $display_quote = null;
var $display_attribution = null;
var $display_status = null;
var $count = null;

var $poster = null;
var $logo_wrapper = null;

var $comment = null;
var $quote = null;
var $source = null;
var $fontSize = null;
var $url = null;

var $login = null;
var $tweet = null;
var $save = null;

var quotes = [
    {
        'comment': 'One of my favorite LOTR quotes.',
        'quote': 'Not all those who wander are lost.',
        'source': 'J.R.R. Tolkien, <strong>The Lord of the Rings</strong>',
        'url': 'http://www.amazon.com/Lord-Rings-50th-Anniversary-Vol/dp/0618640150/ref=sr_1_3?s=books&ie=UTF8&qid=1408030941&sr=1-3&keywords=lord+of+the+rings'
    }
];

/*
 * On page load.
 */
var onDocumentReady = function() {
    $status_wrapper = $('.status');
    $display_quote = $('.poster blockquote p');
    $display_attribution = $('.attribution');
    $display_status = $('.status .text');
    $count = $('.count');

    $poster = $('.poster');
    $logo_wrapper = $('.logo-wrapper');

    $comment = $('#comment');
    $quote = $('#quote'); 
    $source = $('#source');
    $fontSize = $('#fontsize');
    $url = $('#url');

    $login = $('#login');
    $save = $('#save');
    $tweet = $('#tweet');

    // Event binding
    $quote.on('keyup', onQuoteKeyUp);
    $source.on('keyup', onSourceKeyUp);
    $comment.on('keyup', onCommentKeyUp);
    $fontSize.on('change', onFontSizeChange);
    $url.on('keyup', onUrlKeyUp);

    $login.on('click', onLoginClick);
    $tweet.on('click', onTweetClick);
    $save.on('click', onSaveClick);

    // Setup initial quote
    var quote = quotes[Math.floor(Math.random() * quotes.length)];
    
    if (quote.size) {
        adjustFontSize(quote.size);
    }

    $quote.val(quote.quote);
    $source.val(quote.source);
    $comment.val(quote.comment);
    $url.val(quote.url);

    $quote.trigger('keyup');
    $source.trigger('keyup');
    $comment.trigger('keyup');
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
    if (($source.offset().top + $source.height()) > $logo_wrapper.offset().top){
        alert('Your quote doesn\'t quite fit. Shorten the text or choose a smaller font-size.');
        return;
    }

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
    var status = $display_status.val(status);

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

    var quote = $('blockquote').text().split(' ', 5);
    var filename = slugify(quote.join(' '));

    var a = $('<a>').attr('href', dataUrl).attr('download', 'quote-' + filename + '.png').appendTo('body');

    a[0].click();

    a.remove();

    $('#download').attr('href', dataUrl).attr('target', '_blank');
    $('#download').trigger('click');
}

var adjustFontSize = function(size) {
    var fontSize = size.toString() + 'px';

    $poster.css('font-size', fontSize);
    
    if ($fontSize.val() !== size){
        $fontSize.val(size);
    };
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
    var status = $comment.val();
    var url = $url.val();

    if (url) {
        status += ' ' + url;
    }

    $display_status.text(status);

    updateCount();
}

var updateCount = function() {
    var count = $comment.val().length;
    
    var url = $url.val();

    if (url) {
        count += URL_CHARS; 
    }

    var max = STATUS_CHARS - RESERVED_CHARS;
    var remaining = max - count;

    $count.text(remaining);

    $count.toggleClass('negative', remaining < 0);
}

var onCommentKeyUp = function() {
    updateStatus();
}

var onQuoteKeyUp = function() {
    $display_quote.text(smarten($(this).val()));
}

var onSourceKeyUp = function() {
    updateAttribution();
}

var onUrlKeyUp = function () {
    updateStatus();
}

var onFontSizeChange = function() {
    adjustFontSize($(this).val());
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
