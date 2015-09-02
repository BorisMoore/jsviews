/*global QUnit, test, equal, ok*/
(function(undefined) {
"use strict";

QUnit.module("Browserify - client code");

test('Error cases for require() for JsRender, JsViews, JsObservable, JsRender templates', function() {
	// ............................... Hide QUnit global jQuery .................................
	var jQuery = global.jQuery;
	global.jQuery = undefined;

	var $jq, $jsr, tmpl, result;
	// ................................ Act ..................................

	try {
		// Server template in bundle, thanks to Browserify jsrender/tmplify transform
		tmpl = require('../templates/name-template.html')(); // Should provide $ with $.templates defined (jsrender or jQuery namespace)
	}
	catch(e) {
		result = e;
	}

	// ............................... Assert .................................
	equal(result, "Requires jsrender/jQuery", 'require("../templates/name-template.html")() throws "Requires jsrender/jQuery"');

	// ................................ Act ..................................

	try {
		tmpl = require('../templates/name-template.html')(22); // Should provide $ with $.templates defined (jsrender or jQuery namespace)
	}
	catch(e) {
		result = e;
	}

	// ............................... Assert .................................
	equal(result, "Requires jsrender/jQuery", 'require("../templates/name-template.html")(22) throws "Requires jsrender/jQuery"');

	// ................................ Act ..................................

	$jq = require("jQuery");
	try {
		tmpl = require('../templates/name-template.html')($jq); // Should provide $ with $.templates defined (jsrender or jQuery namespace)
	}
	catch(e) {
		result = e;
	}

	// ............................... Assert .................................
	equal(result, "Requires jsrender/jQuery", 'require("../templates/name-template.html")(jq) ($ without jsrender) throws "Requires jsrender/jQuery"');

	// ................................ Act ..................................

	try {
		$jsr = require('jsrender')({}); // Should provide null, or jQuery
	}
	catch(e) {
		result = e;
	}

	// ............................... Assert .................................
	equal(result, "Provide jQuery or null", 'require("jsrender")({}) throws "Provide jQuery or null"');

	// ................................ Act ..................................

	try {
		$jsr = require('../../jquery.observable')(); // Should provide jQuery
	
	}
	catch(e) {
		result = e;
	}

	// ............................... Assert .................................
	equal(result, "JsObservable requires jQuery", 'require("jquery.observable")() throws "JsObservable requires jQuery"');

	// ................................ Act ..................................

	try {
		$jsr = require('../../jquery.observable')("a"); // Should provide jQuery
	}
	catch(e) {
		result = e;
	}

	// ............................... Assert .................................
	equal(result, "JsObservable requires jQuery", 'require("jquery.observable")("a") throws "JsObservable requires jQuery"');

	// ................................ Act ..................................

	try {
		$jsr = require('../../jquery.views')(); // Should provide jQuery with JsRender, JsObservable
	
	}
	catch(e) {
		result = e;
	}

	// ............................... Assert .................................
	equal(result, "JsViews requires jQuery", 'require("jquery.views")() throws "JsViews requires jQuery"');

	// ................................ Act ..................................

	try {
		$jsr = require('../../jquery.views')("a"); // Should provide jQuery with JsRender, JsObservable
	}
	catch(e) {
		result = e;
	}

	// ............................... Assert .................................
	equal(result, "JsViews requires jQuery", 'require("jquery.views")("a") throws "JsViews requires jQuery"');

	// ................................ Act ..................................

	$jq = require("jQuery");
	
	try {
		$jsr = require('../../jquery.views')($jq); // Should provide jQuery with JsRender, JsObservable
	}
	catch(e) {
		result = e;
	}

	// ............................... Assert .................................
	equal(result, "JsViews requires JsRender", 'require("jquery.views")(jQuery) throws "JsViews requires JsRender"');

	// ................................ Act ..................................

	$jsr = require('jsrender');
	
	try {
		$jsr = require('../../jquery.views')($jsr); // Should provide jQuery with JsRender, JsObservable
	}
	catch(e) {
		result = e;
	}

	// ............................... Assert .................................
	equal(result, "JsViews requires jQuery", 'require("jquery.views")(jsrender) throws "JsViews requires jQuery"');

	// ................................ Act ..................................

	$jsr = require('jsrender')(require("jQuery"));
	
	try {
		$jsr = require('../../jquery.views')($jsr); // Should provide jQuery with JsRender, JsObservable
	}
	catch(e) {
		result = e;
	}

	// ............................... Assert .................................
	equal(result, "JsViews requires JsObservable", 'require("jquery.views")($jsr) throws "JsViews requires JsObservable"');

	// ............................... Reset .................................
	global.jQuery = jQuery; // Replace QUnit global jQuery
});

})();
