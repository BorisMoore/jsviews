/*global test, equal, module, ok*/
(function(global, jQuery, undefined) {
"use strict";

function undefine() { // Undefine registered modules from previously run tests.
	require.undef("jsviews");
	require.undef("jquery.views");
	require.undef("jquery.observable");
	require.undef("jsrender");
	require.undef("jquery");
	delete window.jQuery;
}

if (!window.attachEvent || window.addEventListener) { // Running RequireJS in qunit async test seems to fail in IE8

QUnit.module("AMD Script Loader");

QUnit.test("Loading jquery.observable.js using RequireJS", function(assert) {
var done;
if (assert.async) { done = assert.async() } else { stop() }
	var jq = window.jQuery;
	undefine();

	require(["./unit-tests/requirejs-config"], function() {
		require(["jquery.observable"], function($) {
			// Note: $ is a new instance of jQuery loaded by RequireJS, not the instance loaded by script block in page header, for QUnit.
			var data = {name: "Jo"};
			$.observable(data).setProperty("name", "Jo updated!");

			var result = data.name + " " + (jq !== $ && $ === window.jQuery);
			assert.equal(result, "Jo updated! true", "jsviews.js loaded");
			if (assert.async) { done() } else { start() }
		});
	});
});

QUnit.test("Loading jquery.views.js, plus dependencies, using RequireJS", function(assert) {
var done;
if (assert.async) { done = assert.async() } else { stop() }
	var jq = window.jQuery;
	undefine();

	require(["./unit-tests/requirejs-config"], function() {
		require(["jquery.views"], function($) {
			// Note: $ is a new instance of jQuery loaded by RequireJS, not the instance loaded by script block in page header, for QUnit.
			var data = {name: "Jo"};
			$.templates("Name: {^{:name}}").link("#result", data);
			$.observable(data).setProperty("name", "Jo updated!");

			var result = $("#result").text() + " " + (jq !== $ && $ === window.jQuery);
			assert.equal(result, "Name: Jo updated! true", "jquery.views.js loaded");
			if (assert.async) { done() } else { start() }
		});
	});
});

QUnit.test("Loading jsviews.js using RequireJS", function(assert) {
var done;
if (assert.async) { done = assert.async() } else { stop() }
	var jq = window.jQuery;
	undefine();

	require(["./unit-tests/requirejs-config"], function() {
		require(["jsviews"], function($) {
			// Note: $ is a new instance of jQuery loaded by RequireJS, not the instance loaded by script block in page header, for QUnit.
			var data = {name: "Jo"};
			$.templates("Name: {^{:name}}").link("#result", data);
			$.observable(data).setProperty("name", "Jo updated!");

			var result = $("#result").text() + " " + (jq !== $ && $ === window.jQuery);
			assert.equal(result, "Name: Jo updated! true", "jsviews.js loaded");
			if (assert.async) { done() } else { start() }
		});
	});
});

}
})(this, this.jQuery);
