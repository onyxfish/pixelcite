var $text = null;
var $save = null;
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

var onDocumentReady = function() {
    $text = $('.poster blockquote p, .source');
    $save = $('#save');
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

    $save.on('click', save_image);

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
    a = a.replace(/(^|[-\u2014\s(\["])'/g, "$1\u2018");       // opening singles
    a = a.replace(/'/g, "\u2019");                            // closing singles & apostrophes
    a = a.replace(/(^|[-\u2014/\[(\u2018\s])"/g, "$1\u201c"); // opening doubles
    a = a.replace(/"/g, "\u201d");                            // closing doubles
    a = a.replace(/--/g, "\u2014");                           // em-dashes
    a = a.replace(/ \u2014 /g, "\u2009\u2014\u2009");         // full spaces wrapping em dash
    return a;
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

function save_image(){
    // first check if the quote actually fits

    if (($source.offset().top + $source.height()) > $logo_wrapper.offset().top){
        alert("Your quote doesn't quite fit. Shorten the text or choose a smaller font-size.");
        return;
    }

    $('canvas').remove();
    process_text();

    html2canvas($poster, {
      onrendered: function(canvas) {
        document.body.appendChild(canvas);
        window.oCanvas = document.getElementsByTagName("canvas");
        window.oCanvas = window.oCanvas[0];
        var strDataURI = window.oCanvas.toDataURL();

        var quote = $('blockquote').text().split(' ', 5);
        var filename = slugify(quote.join(' '));

        var a = $("<a>").attr("href", strDataURI).attr("download", "quote-" + filename + ".png").appendTo("body");

        a[0].click();

        a.remove();

        $('#download').attr('href', strDataURI).attr('target', '_blank');
        $('#download').trigger('click');
      }
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
