/*global QUnit, test, equal, ok*/
(function(undefined) {
"use strict";

browserify.done.eightB = true;

QUnit.module("Browserify - client code");

var isIE8 = window.attachEvent && !window.addEventListener;

if (!isIE8) {

test("No jQuery global: require('jsrender') require('jsviews')", function() {
	// ............................... Hide QUnit global jQuery and any previous global jsrender.................................
	var jQuery = global.jQuery, jsr = global.jsrender;
	global.jQuery = global.jsrender = undefined;

	// =============================== Arrange ===============================
	var data = {name: "Jo"};

	// ................................ Act ..................................
var $jq = require('jquery');
var $jsr = require('jsrender')($jq); // Unnecessary loading of additional jsrender instance (Test case)
var $jsr = require('../../')($jq); // Provide jQuery, so $jsr === $jq is local jQuery namespace

	// Use require to get server template, thanks to Browserify bundle that used jsrender/tmplify transform
	var tmpl = require('../templates/name-template.html')($jsr); // Provide $jsr

	var result = tmpl(data);

	$jsr.observe(data, "name", function(ev, eventArgs) {
		result += " " + eventArgs.value;
	})
	$jsr.observable(data).setProperty("name", "new name"); // result === "new name"

	result += " " + ($jsr !== jQuery && $jsr === $jq);

	// ............................... Assert .................................
	equal(result, "Name: Jo (name-template.html) new name true", "result: No jQuery global: require('jsviews')");

	// ............................... Reset .................................
	global.jQuery = jQuery; // Replace QUnit global jQuery
	global.jsrender = jsr; // Replace any previous global jsrender
});
}
})();
