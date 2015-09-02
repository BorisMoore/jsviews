/*global QUnit, test, equal, ok*/
(function(undefined) {
"use strict";

QUnit.module("Browserify - client code");

test("No jQuery global: require('jquery.views')", function() {
	// ............................... Hide QUnit global jQuery .................................
	var jQuery = global.jQuery;
	global.jQuery = undefined;

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
	equal(result, "Name: Jo (name-template.html) new name true", "result");

	// ............................... Reset .................................
	global.jQuery = jQuery; // Replace QUnit global jQuery
});

})();
