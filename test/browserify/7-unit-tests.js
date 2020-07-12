/*global QUnit, test, equal, ok*/
(function(undefined) {
"use strict";

browserify.done.seven = true;

QUnit.module("Browserify - client code");

var isIE8 = window.attachEvent && !window.addEventListener;

if (!isIE8) {

QUnit.test("jQuery global: require('jquery.views')", function(assert) {
	// ............................... Hide QUnit global jQuery .................................
	var jQuery = global.jQuery;
	global.jQuery = undefined;

	// =============================== Arrange ===============================
	var data = {name: "Jo"};

	// ................................ Act ..................................
	global.jQuery = require('jquery');

	var $jsr = require('jsrender'); // Uses global jQuery, so $jsr === global.jQuery is global jQuery namespace // Else JsViews requires JsRender
	$jsr = require('../../jquery.observable.js'); // $jsr === global.jQuery // Else JsViews requires JsObservable
	$jsr = require('../../jquery.views'); // $jsr === global.jQuery

	// Use require to get server template, thanks to Browserify bundle that used jsrender/tmplify transform
	var tmpl = require('../templates/name-template.html'); // Uses jsrender attached to global jQuery

	var result = tmpl(data);

	$jsr.observe(data, "name", function(ev, eventArgs) {
		result += " " + eventArgs.value;
	})
	$jsr.observable(data).setProperty("name", "new name"); // result === "new name"

	result += " " + ($jsr === global.jQuery);

	// ............................... Assert .................................
	assert.equal(result, "Name: Jo (name-template.html) new name true", "result: jQuery global: require('jquery.views')");

	// ............................... Reset .................................
	global.jQuery = jQuery; // Replace QUnit global jQuery
});
}
})();
