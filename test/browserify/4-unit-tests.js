/*global QUnit, test, equal, ok*/
(function(undefined) {
"use strict";

QUnit.module("Browserify - client code");

test("No jQuery global: require('jquery.observable')", function() {
	// ............................... Hide QUnit global jQuery .................................
	var jQuery = global.jQuery;
	global.jQuery = undefined;

	// =============================== Arrange ===============================
	var data = {name: "Jo"};

	// ................................ Act ..................................
	var $jq = require('jquery');
	var $jsr = require('../../jquery.observable')($jq); // Provide jQuery, so $jsr === $jq is local jQuery namespace && !$jsr.templates

	var result = "";

	$jsr.observe(data, "name", function(ev, eventArgs) {
		result += " " + eventArgs.value;
	})

	$jsr.observable(data).setProperty("name", "new name"); // result === "new name"

	result += " " + ($jsr !== jQuery && $jsr === $jq);

	// ............................... Assert .................................
	equal(result, " new name true", "result");

	// ............................... Reset .................................
	global.jQuery = jQuery; // Replace QUnit global jQuery
});

})();
