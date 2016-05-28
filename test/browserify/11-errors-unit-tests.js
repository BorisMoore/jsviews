/*global QUnit, test, equal, ok*/
(function(undefined) {
"use strict";

browserify.done.eleven = true;

QUnit.module("Browserify - client code");

var isIE8 = window.attachEvent && !window.addEventListener;

if (!isIE8) {

test('More Errors for require() for JsRender, JsViews, JsObservable, JsRender templates', function() {
	// ............................... Hide QUnit global jQuery and any previous global jsrender.................................
	var jQuery = global.jQuery, jsr = global.jsrender;
	global.jQuery = global.jsrender = undefined;

	var $jq, $jsr, tmpl, result;

	// ................................ Act ..................................

	$jsr = require("jsrender")(require("jQuery"));
	
	try {
		$jsr = require('../../jquery.views')($jsr); // Should provide jQuery with JsRender, JsObservable
	}
	catch(e) {
		result = e;
	}

	// ............................... Assert .................................
	equal(result, "JsViews requires JsObservable", 'require("jquery.views")($jsr) throws "JsViews requires JsObservable"');

	// ................................ Act ..................................

	$jsr = require("jsrender")(require("jQuery"));
	
	try {
		$jsr = require('../../')(); // Should provide jQuery
	}
	catch(e) {
		result = e;
	}

	// ............................... Assert .................................
	equal(result, "JsViews requires jQuery", 'require("jsviews")($) throws "JsViews requires jQuery"');

	// ................................ Act ..................................

	try {
		$jsr = require('../../')("a"); // Should provide jQuery
	}
	catch(e) {
		result = e;
	}

	// ............................... Assert .................................
	equal(result, "JsViews requires jQuery", 'require("jsviews")("a") throws "JsViews requires jQuery"');

	// ................................ Act ..................................

	$jsr = require("jsrender");
	
	try {
		$jsr = require('../../')($jsr); // Should provide jQuery
	}
	catch(e) {
		result = e;
	}

	// ............................... Assert .................................
	equal(result, "JsViews requires jQuery", 'require("jsviews")(jQuery) throws "JsViews requires jQuery"');

	// ............................... Reset .................................
	global.jQuery = jQuery; // Replace QUnit global jQuery
	global.jsrender = jsr; // Replace any previous global jsrender
});
}
})();
