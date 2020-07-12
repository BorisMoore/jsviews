/*global QUnit, test, equal, ok*/
(function(undefined) {
"use strict";

browserify.done.six = true;

QUnit.module("Browserify - client code");

var isIE8 = window.attachEvent && !window.addEventListener;

if (!isIE8) {

QUnit.test("No jQuery global: require('jquery.views')", function(assert) {
	// ............................... Hide QUnit global jQuery and any previous global jsrender.................................
	var jQuery = global.jQuery, jsr = global.jsrender;
	global.jQuery = global.jsrender = undefined;

	// =============================== Arrange ===============================
	var data = {name: "Jo"};

	// ................................ Act ..................................
	var $jq = require('jquery');
	var $jsr = require('jsrender')($jq); // Provide jQuery, so $jsr === $jq is local jQuery namespace // Else JsViews requires JsRender
	$jsr = require('../../jquery.observable.js')($jsr); // Provide $jsr === $jq // Else JsViews requires JsObservable
	$jsr = require('../../jquery.views.js')($jsr); // Provide $jsr === $jq
	
	// Use require to get server template, thanks to Browserify bundle that used jsrender/tmplify transform
	var tmpl = require('../templates/name-template.html')($jsr); // Provide $jsr === $jq

	var result = tmpl(data);

	$jsr.observe(data, "name", function(ev, eventArgs) {
		result += " " + eventArgs.value;
	})
	$jsr.observable(data).setProperty("name", "new name"); // result === "new name"

	result += " " + ($jsr !== jQuery && $jsr === $jq);

	// ............................... Assert .................................
	assert.equal(result, "Name: Jo (name-template.html) new name true", "result: No jQuery global: require('jquery.views')");

	// ............................... Reset .................................
	global.jQuery = jQuery; // Replace QUnit global jQuery
	global.jsrender = jsr; // Replace any previous global jsrender
});
}
})();
