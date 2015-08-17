/*global test, equal, module, ok*/
(function(global, jQuery, undefined) {
"use strict";
if (!window.attachEvent || window.addEventListener) { // Running RequireJS in qunit async test seems to fail in IE8

module("AMD Script Loader");

function undefine() { // Undefine registered modules from previously run tests.
	require.undef("jsviews");
	require.undef("jquery.views");
	require.undef("jquery.observable");
	require.undef("jsrender");
	require.undef("jquery");
	delete window.jQuery;
}

test("Loading jquery.observable.js using RequireJS", function(assert) {
	var done = assert.async(),
		jq = window.jQuery;
	undefine();
	console.log("4");

	require(["./unit-tests/requirejs-config"], function() {
		require(["jquery.observable"], function($) {
			// Note: $ is a new instance of jQuery loaded by RequireJS, not the instance loaded by script block in page header, for QUnit.
			var data = {name: "Jo"};
			$.observable(data).setProperty("name", "Jo updated!");

			var result = data.name + " " + (jq !== $ && $ === window.jQuery);
			equal(result, "Jo updated! true", "jsviews.js loaded");
			done();
		});
	});
});

test("Loading jquery.views.js, plus dependencies, using RequireJS", function(assert) {
	var done = assert.async(),
		jq = window.jQuery;
	undefine();
	console.log("5");
	require(["./unit-tests/requirejs-config"], function() {
		require(["jquery.views"], function($) {
			// Note: $ is a new instance of jQuery loaded by RequireJS, not the instance loaded by script block in page header, for QUnit.
			var data = {name: "Jo"};
			$.templates("Name: {^{:name}}").link("#result", data);
			$.observable(data).setProperty("name", "Jo updated!");

			var result = $("#result").text() + " " + (jq !== $ && $ === window.jQuery);
			equal(result, "Name: Jo updated! true", "jquery.views.js loaded");
			done();
		});
	});
});

test("Loading jsviews.js using RequireJS", function(assert) {
	var done = assert.async(),
		jq = window.jQuery;
	undefine();
	console.log("6");

	require(["./unit-tests/requirejs-config"], function() {
		require(["jsviews"], function($) {
			// Note: $ is a new instance of jQuery loaded by RequireJS, not the instance loaded by script block in page header, for QUnit.
			var data = {name: "Jo"};
			$.templates("Name: {^{:name}}").link("#result", data);
			$.observable(data).setProperty("name", "Jo updated!");

			var result = $("#result").text() + " " + (jq !== $ && $ === window.jQuery);
			equal(result, "Name: Jo updated! true", "jsviews.js loaded");
			$.observable = $.link = undefined;
			done();
		});
	});
});

}
})(this, this.jQuery);
