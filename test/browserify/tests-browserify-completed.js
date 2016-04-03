/*global test, equal, module, ok*/
(function(global, $, undefined) {
"use strict";

module("browserify");

test("browserify tests all run", function() {
	equal(JSON.stringify(browserify.done),
	'{"one":true,"two":true,"three":true,"four":true,"five":true,"six":true,"seven":true,"eight":true,"nine":true,"ten":true,"eleven":true}'
, "Browserify tests succeeded");
});

})(this, this.jQuery);
