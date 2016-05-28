/*global QUnit, test, equal, ok*/
(function(undefined) {
"use strict";

browserify.done.five = true;

QUnit.module("Browserify - client code");

var isIE8 = window.attachEvent && !window.addEventListener;

if (!isIE8) {

test("jQuery global: require('jquery.observable')", function() {
	// ............................... Hide QUnit global jQuery .................................
	var jQuery = global.jQuery;
	global.jQuery = undefined;

	// =============================== Arrange ===============================
	var data = {name: "Jo"};

	// ................................ Act ..................................
	global.jQuery = require('jquery');
	var $jsr = require('../../jquery.observable'); // Uses global jQuery, so $jsr === global.jQuery is global jQuery namespace
	var result = "";

	$jsr.observe(data, "name", function(ev, eventArgs) {
		result += " " + eventArgs.value;
	})

	$jsr.observable(data).setProperty("name", "new name"); // result === "new name"

	result += " " + ($jsr === global.jQuery);

	// ............................... Assert .................................
	equal(result, " new name true", "result: jQuery global: require('jquery.observable')");

	// ............................... Reset .................................
	global.jQuery = jQuery; // Replace QUnit global jQuery
});
}
})();
