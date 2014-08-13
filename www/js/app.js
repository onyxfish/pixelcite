var $text = null;
var $save = null;
var $tweet = null;
var $poster = null;
var $font_size = null;
var $source = null;
var $logo_wrapper = null;

var quotes = [
    {
        "quote": "I'd been drinking.",
        "source": "Dennis Rodman"
    }
];

/*
 * On page load.
 */
var onDocumentReady = function() {
    $text = $('.poster blockquote p, .source');
    $save = $('#save');
    $tweet = $('#tweet');
    $poster = $('.poster');
    $font_size = $('#fontsize');
    $source = $('.source');
    $logo_wrapper = $('.logo-wrapper');

    var quote = quotes[Math.floor(Math.random() * quotes.length)];
    
    if (quote.size){
        adjust_font_size(quote.size);
    }

    $('blockquote p').text(quote.quote);
    $source.html('&mdash;&thinsp;' + quote.source);
    process_text();

    $save.on('click', function() {
        get_image(save_image);
    });

    $tweet.on('click', function() {
        get_image(tweet);
    });

    $font_size.on('change', function(){
        adjust_font_size($(this).val());
    });

    var editable = document.querySelectorAll('.poster blockquote, .source');
    var editor = new MediumEditor(editable, {
        disableToolbar: true,
    });
}

/*
 * Smarten quotes.
 */
function smarten(a) {
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
function post(path, params) {
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
function slugify(text){
    return text
        .toLowerCase()
        .replace(/[^\w ]+/g,'')
        .replace(/ +/g,'-');
}

function process_text(){
    $text = $('.poster blockquote p, .source');
    $text.each(function(){
        var raw_text = $.trim($(this).html());
        $(this).html(smarten(raw_text)).find('br').remove();
    });
}

/*
 * Gets data for the image calls a callback when its ready
 */
function get_image(callback) {
    if (($source.offset().top + $source.height()) > $logo_wrapper.offset().top){
        alert("Your quote doesn't quite fit. Shorten the text or choose a smaller font-size.");
        return;
    }

    process_text();

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
function save_image(dataUrl) {
    var quote = $('blockquote').text().split(' ', 5);
    var filename = slugify(quote.join(' '));

    var a = $('<a>').attr('href', dataUrl).attr('download', 'quote-' + filename + '.png').appendTo('body');

    a[0].click();

    a.remove();

    $('#download').attr('href', strDataURI).attr('target', '_blank');
    $('#download').trigger('click');
}

/*
 * Tweet the image.
 */
function tweet(dataUrl) {
    post('/post/', {
        'status': 'testpost',
        'image': dataUrl
    });
}

function adjust_font_size(size){
    var font_size = size.toString() + 'px';

    $poster.css('font-size', font_size);
    
    if ($font_size.val() !== size){
        $font_size.val(size);
    };
}

$(onDocumentReady);
