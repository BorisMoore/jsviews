/*global test, equal, module, ok*/
(function(global, $, undefined) {
"use strict";

QUnit.module("browserify");

var isIE8 = window.attachEvent && !window.addEventListener;

if (!isIE8) {

QUnit.test("browserify tests all run", function(assert) {
	assert.equal(JSON.stringify(browserify.done),
	'{"one":true,"two":true,"three":true,"four":true,"five":true,"six":true,"seven":true,"eight":true,"eightB":true,"nine":true,"ten":true,"eleven":true,"twelve":true}'
, "Browserify tests succeeded");
});
}
})(this, this.jQuery);
	