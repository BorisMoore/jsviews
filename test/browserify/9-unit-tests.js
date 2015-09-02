/*global QUnit, test, equal, ok*/
(function(undefined) {
"use strict";

QUnit.module("Browserify - client code");

test("jQuery global: require('jsviews')", function() {
	// ............................... Hide QUnit global jQuery .................................
	var jQuery = global.jQuery;
	global.jQuery = undefined;

	// =============================== Arrange ===============================
	var data = {name: "Jo"};

	// ................................ Act ..................................
	global.jQuery = require('jquery');

	var $jsr = require('../../'); // Uses global jQuery, so $jsr === global.jQuery is global jQuery namespace 

	// Use require to get server template, thanks to Browserify bundle that used jsrender/tmplify transform
	var tmpl = require('../templates/name-template.html'); // Uses jsrender attached to global jQuery

	var result = tmpl(data);

	$jsr.observe(data, "name", function(ev, eventArgs) {
		result += " " + eventArgs.value;
	})
	$jsr.observable(data).setProperty("name", "new name"); // result === "new name"

	result += " " + ($jsr === global.jQuery);

	// ............................... Assert .................................
	equal(result, "Name: Jo (name-template.html) new name true", "result");

	// ............................... Reset .................................
	global.jQuery = jQuery; // Replace QUnit global jQuery
});

})();
