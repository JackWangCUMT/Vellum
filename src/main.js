requirejs.config({
    // For some reason when using the map config as suggested by some of the
    // plugins' documentation, and only when including vellum in another
    // app, it tries to get requirejs-promise instead of
    // requirejs-promise.js, so using packages instead.  This might be a bug
    // that should be reported.
    packages: [
        {
            name: 'less',
            location: '../bower_components/require-less',
            main: 'less.js'
        },
        {
            name: 'css',
            location: '../bower_components/require-css',
            main: 'css.js'
        },
        {
            name: 'text',
            location: '../bower_components/requirejs-text',
            main: 'text.js'
        },
        {
            name: 'tpl',
            location: '../bower_components/requirejs-tpl',
            main: 'tpl.js'
        },
        {
            name: 'json',
            location: '../bower_components/requirejs-plugins/src',
            main: 'json.js'
        }
    ],
    paths: {
        'vellum': '.',

        'codemirror': '../lib/codemirror/xml',
        'codemirrorBase': '../lib/codemirror/codemirror',
        'CryptoJS': '../lib/sha1',
        'diff-match-patch': '../lib/diff_match_patch',
        'jquery': '../bower_components/jquery/jquery',
        'jquery-ui': '../lib/jquery-ui/jquery-ui-1.8.14.custom.min',
        'jquery.jstree': '../lib/jstree/jquery.jstree',
        'jquery.fancybox': '../lib/fancybox/jquery.fancybox-1.3.4',
        'jquery.bootstrap': '../lib/bootstrap',
        'jquery.bootstrap-popout': '../lib/bootstrap-popout',
        'jquery.bootstrap-better-typeahead': '../bower_components/bootstrap-better-typeahead/js/bootstrap-better-typeahead',
        'underscore': '../bower_components/underscore/underscore',
        'XMLWriter': '../bower_components/XMLWriter/XMLWriter',

        // todo: should convert xpath submodule to AMD
        'xpath': '../bower_components/xpath/xpath',
        'xpathmodels': '../bower_components/xpath/models',
        'scheme-number': '../bower_components/xpath/lib/schemeNumber',
        'biginteger': '../bower_components/xpath/lib/biginteger',

        'langCodes': '../bower_components/langcodes/langs.json',

        'save-button': '../lib/SaveButton',

        'yui-base': '../bower_components/MediaUploader/yui-base',
        'yui-combo': '../bower_components/MediaUploader/yui-combo',
        'yui-loader': '../bower_components/MediaUploader/yui-loader',
        'yui-uploader': '../bower_components/MediaUploader/yui-uploader',

        'swfobject': '../bower_components/MediaUploader/swfobject',
        'file-uploader': '../bower_components/MediaUploader/hqmedia.upload_controller',
    },
    shim: {
        'codemirror': {
            deps: ['codemirrorBase', 'css!../lib/codemirror/codemirror'],
            exports: 'CodeMirror',
        },
        'codemirrorBase': {
            exports: 'CodeMirror'
        },
        'CryptoJS': {
            exports: 'CryptoJS'
        },
        'diff-match-patch': {
            exports: 'diff_match_patch'
        },

        'jquery-ui': {
            deps: ['jquery', 'css!../lib/jquery-ui/redmond/jquery-ui-1.8.14.custom'],
            exports: '$.fn.autocomplete'
        },
        'jquery.jstree': {
            deps: ['jquery', 'css!../lib/jstree/default/style'],
            exports: '$.fn.jstree'
        },
        'jquery.fancybox': {
            deps: ['jquery', 'css!../lib/fancybox/jquery.fancybox-1.3.4'],
            exports: '$.fn.fancybox'
        },
        'jquery.bootstrap': {
            deps: ['jquery'],
            exports: '$.fn.popover'
        },
        'jquery.bootstrap-popout': {
            deps: ['jquery.bootstrap'],
            exports: '$.fn.popout'
        },
        'jquery.bootstrap-better-typeahead': {
            deps: ['jquery.bootstrap']
        },
        'underscore': {
            exports: '_'
        },
        'XMLWriter': {
            exports: 'XMLWriter'
        },

        'save-button': {
            deps: ['jquery'],
            exports: 'SaveButton'
        },

        'yui-base': {
            exports: 'YUI'
        },
        'yui-loader': {
            deps: ['yui-base'],
            exports: 'YUI'
        },
        'yui-uploader': {
            deps: ['yui-base', 'yui-loader', 'css!yui-combo'],
            exports: 'YUI'
        },
        'swfobject': {
            exports: 'swfobject'
        },
        'file-uploader': {
            deps: ['yui-uploader', 'swfobject', 'underscore', 'jquery'],
            exports: 'HQMediaFileUploadController'
        },

        'xpath': {
            deps: ['xpathmodels'],
            exports: 'xpath'
        },
        'xpathmodels': {
            deps: ['scheme-number'],
            exports: 'xpathmodels'
        },
        'scheme-number': {
            deps: ['biginteger'],
            exports: 'SchemeNumber'
        },
        'biginteger': {
            exports: 'BigInteger'
        }
    },
    less: {
        logLevel: 1
    }
});

// If jQuery was loaded before RequireJS, use the existing instance.
// http://www.manuel-strehl.de/dev/load_jquery_before_requirejs.en.html
if (window.jQuery) {
    define('jquery', [], function() {
        return jQuery;
    });
    if (jQuery.fn.typeahead) {
        define('jquery.bootstrap', [], function () {});
    }
    if (jQuery.fn.popout) {
        define('jquery.bootstrap-popout', [], function () {});
    }

    if (jQuery.fn.datepicker) {
        define('jquery-ui', [], function () {});
    }
}

define([
    // begin buildmain.py delimiter
    'vellum/core',
    'vellum/ignoreButRetain',
    'vellum/intentManager',
    'vellum/itemset',
    'vellum/javaRosa',
    'vellum/lock',
    'vellum/uploader',
    'vellum/window',
    'vellum/polyfills'
    // end buildmain.py delimiter
], function () {
    // adds $.vellum as a side-effect
});