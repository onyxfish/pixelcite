var $display_quote = null;
var $display_attribution = null;

var $save = null;
var $tweet = null;
var $poster = null;
var $font_size = null;
var $logo_wrapper = null;

var $quote = null;
var $author = null;
var $source = null;
var $comment = null;

var quotes = [
    {
        "quote": "Not all those who wander are lost.",
        "author": "J.R.R. Tolkien",
        "source": "The Lord of the Rings"
    }
];

/*
 * On page load.
 */
var onDocumentReady = function() {
    $display_quote = $('.poster blockquote p');
    $display_attribution = $('.attribution');

    $save = $('#save');
    $tweet = $('#tweet');
    $poster = $('.poster');
    $font_size = $('#fontsize');
    $logo_wrapper = $('.logo-wrapper');

    $quote = $('#quote'); 
    $author = $('#author');
    $source = $('#source');
    $comment = $('#comment');

    // Event binding
    $quote.on('keyup', onQuoteKeyUp);
    $author.on('keyup', onAuthorKeyUp);
    $source.on('keyup', onSourceKeyUp);

    $tweet.on('click', onTweetClick);
    $save.on('click', onSaveClick);
    $font_size.on('change', onFontSizeChange);

    // Setup initial quote
    var quote = quotes[Math.floor(Math.random() * quotes.length)];
    
    if (quote.size) {
        adjustFontSize(quote.size);
    }

    $quote.val(quote.quote);
    $author.val(quote.author);
    $source.val(quote.source);

    $quote.trigger('keyup');
    $author.trigger('keyup');
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
        alert("Your quote doesn't quite fit. Shorten the text or choose a smaller font-size.");
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
 *Downloads the image.
 */
var saveImage = function(dataUrl) {
    var quote = $('blockquote').text().split(' ', 5);
    var filename = slugify(quote.join(' '));

    var a = $('<a>').attr('href', dataUrl).attr('download', 'quote-' + filename + '.png').appendTo('body');

    a[0].click();

    a.remove();

    $('#download').attr('href', dataUrl).attr('target', '_blank');
    $('#download').trigger('click');
}

/*
 * Tweet the image.
 */
var tweet = function(dataUrl) {
    var status = $comment.val();

    post('/post/', {
        'status': status,
        'image': dataUrl.split(',')[1]
    });
}

var adjustFontSize = function(size){
    var font_size = size.toString() + 'px';

    $poster.css('font-size', font_size);
    
    if ($font_size.val() !== size){
        $font_size.val(size);
    };
}

var updateAttribution = function() {
    var author = $author.val();
    var source = $source.val();
    var attr = '';

    if (author || source) {
        attr += '&mdash;&thinsp;';
    }

    if (author && source) {
        attr += author + ', &ldquo;' + source + '&rdquo;';
    } else if (author) {
        attr += author;
    } else if (source) {
        attr += '&ldquo;' + source + '&rdquo;';
    }

    $display_attribution.html(attr);
}

var onQuoteKeyUp = function() {
    $display_quote.text(smarten($(this).val()));
}

var onAuthorKeyUp = function() {
    updateAttribution();
}

var onSourceKeyUp = function() {
    updateAttribution();
}

var onTweetClick = function() {
    getImage(tweet);
}

var onSaveClick =  function() {
    getImage(saveImage);
}

var onFontSizeChange = function() {
    adjustFontSize($(this).val());
}

$(onDocumentReady);
