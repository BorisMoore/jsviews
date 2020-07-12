/*global QUnit, test, equal, ok*/
(function(undefined) {
"use strict";

browserify.done.ten = true;

QUnit.module("Browserify - client code");

var isIE8 = window.attachEvent && !window.addEventListener;

if (!isIE8) {

QUnit.test('Error cases for require() for JsRender, JsViews, JsObservable, JsRender templates', function(assert) {
	// ............................... Hide QUnit global jQuery and any previous global jsrender.................................
	var jQuery = global.jQuery, jsr = global.jsrender;
	global.jQuery = global.jsrender = undefined;

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
	assert.equal(result, "Requires jsrender/jQuery", 'require("../templates/name-template.html")() throws "Requires jsrender/jQuery"');

	// ................................ Act ..................................

	try {
		tmpl = require('../templates/name-template.html')(22); // Should provide $ with $.templates defined (jsrender or jQuery namespace)
	}
	catch(e) {
		result = e;
	}

	// ............................... Assert .................................
	assert.equal(result, "Requires jsrender/jQuery", 'require("../templates/name-template.html")(22) throws "Requires jsrender/jQuery"');

	// ................................ Act ..................................

	$jq = require("jQuery");
	try {
		tmpl = require('../templates/name-template.html')($jq); // Should provide $ with $.templates defined (jsrender or jQuery namespace)
	}
	catch(e) {
		result = e;
	}

	// ............................... Assert .................................
	assert.equal(result, "Requires jsrender/jQuery", 'require("../templates/name-template.html")(jq) ($ without jsrender) throws "Requires jsrender/jQuery"');

	// ................................ Act ..................................

	try {
		$jsr = require('jsrender')({}); // Should provide null, or jQuery
	}
	catch(e) {
		result = e;
	}

	// ............................... Assert .................................
	assert.equal(result, "Provide jQuery or null", 'require("jsrender")({}) throws "Provide jQuery or null"');

	// ................................ Act ..................................

	try {
		$jsr = require('../../jquery.observable')(); // Should provide jQuery
	
	}
	catch(e) {
		result = e;
	}

	// ............................... Assert .................................
	assert.equal(result, "jquery.observable.js requires jQuery", 'require("jquery.observable")() throws "jquery.observable.js requires requires jQuery"');

	// ................................ Act ..................................

	try {
		$jsr = require('../../jquery.observable')("a"); // Should provide jQuery
	}
	catch(e) {
		result = e;
	}

	// ............................... Assert .................................
	assert.equal(result, "jquery.observable.js requires jQuery", 'require("jquery.observable")("a") throws "jquery.observable.js requires jQuery"');

	// ................................ Act ..................................

	try {
		$jsr = require('../../jquery.views')(); // Should provide jQuery with JsRender, JsObservable
	
	}
	catch(e) {
		result = e;
	}

	// ............................... Assert .................................
	assert.equal(result, "jquery.views.js requires jQuery", 'require("jquery.views")() throws "jquery.views.js requires jQuery"');

	// ................................ Act ..................................

	try {
		$jsr = require('../../jquery.views')("a"); // Should provide jQuery with JsRender, JsObservable
	}
	catch(e) {
		result = e;
	}

	// ............................... Assert .................................
	assert.equal(result, "jquery.views.js requires jQuery", 'require("jquery.views")("a") throws "jquery.views.js requires jQuery"');

	// ................................ Act ..................................

	$jq = require("jQuery");
	
	try {
		$jsr = require('../../jquery.views')($jq); // Should provide jQuery with JsRender, JsObservable
	}
	catch(e) {
		result = e;
	}

	// ............................... Assert .................................
	assert.equal(result, "jquery.views.js requires jsrender.js", 'require("jquery.views")(jQuery) throws "jquery.views.js requires jsrender.js"');

	// ................................ Act ..................................

	$jsr = require('jsrender');
	
	try {
		$jsr = require('../../jquery.views')($jsr); // Should provide jQuery with JsRender, JsObservable
	}
	catch(e) {
		result = e;
	}

	// ............................... Assert .................................
	assert.equal(result, "jquery.views.js requires jQuery", 'require("jquery.views")(jsrender) throws "jquery.views.js requires jQuery"');

	// ................................ Act ..................................

	$jsr = require('jsrender')(require("jQuery"));
	
	try {
		$jsr = require('../../jquery.views')($jsr); // Should provide jQuery with JsRender, JsObservable
	}
	catch(e) {
		result = e;
	}

	// ............................... Assert .................................
	assert.equal(result, "jquery.views.js requires jquery.observable.js", 'require("jquery.views")($jsr) throws "jquery.views.js requires jquery.observable "');

	// ............................... Reset .................................
	global.jQuery = jQuery; // Replace QUnit global jQuery
	global.jsrender = jsr; // Replace any previous global jsrender
});
}
})();
