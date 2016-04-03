/*global QUnit, test, equal, ok*/
(function(undefined) {
"use strict";

browserify.done.htm = true;

QUnit.module("Browserify - client code");

test("jQuery global: require('jsrender')", function() {

	// ............................... Hide QUnit global jQuery and any previous global jsrender.................................
	var jQuery = global.jQuery, jsr = global.jsrender;
	global.jQuery = global.jsrender = undefined;

	// =============================== Arrange ===============================
	var data = {name: "Jo"};

	// ................................ Act ..................................
	var jsrender = require('jsrender')();

	// Use require to get server template, thanks to Browserify bundle that used jsrender/tmplify transform
	var tmpl = require('../templates/name-template.htm')(jsrender); // Provide jsrender
	var tmpl2 = require('../templates/name-template.jsrender')(jsrender); // Provide jsrender

	var result = tmpl(data) + " " + tmpl2(data);

	// ............................... Assert .................................
	equal(result, "Name: Jo (name-template.htm) Name: Jo (name-template.jsrender)", "result: jQuery global: require('jsrender') - htm");

	// ............................... Reset .................................
	global.jQuery = jQuery; // Replace QUnit global jQuery
	global.jsrender = jsr; // Replace any previous global jsrender
});

})();
