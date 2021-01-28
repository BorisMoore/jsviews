/* test, equal, module, ok*/
(function($, undefined) {
"use strict";

// =============== INIT APP ===============

var viewContent, before, after, lastEvData, lastEventArgsVal, lastEventArgsOldVal, listeners, result1, handlersCount, elems,
	result = "",
	calls = 0;

function reset() {
	result = "";
	calls = 0;
}

function myListener(ev, eventArgs) {
	calls++;
	lastEventArgsOldVal = eventArgs.oldValue;
	lastEventArgsVal = eventArgs.value;
	lastEvData = ev.data;

	switch (eventArgs.change) {
		case "set":
			var oldValue = eventArgs.oldValue,
				value = eventArgs.value;

			oldValue = (typeof oldValue === "function")
				? (oldValue = "" + oldValue, oldValue.slice(0, oldValue.indexOf("{")))
				: "" + oldValue === oldValue
					? oldValue
					: JSON.stringify(oldValue);
			value = (typeof value === "function")
				? (value = "" + value, value.slice(0, value.indexOf("{")))
				: "" + value === value
					? value
					: JSON.stringify(value);
			result += "calls: " + calls
				+ ", ev.data: prop: " + ev.data.prop + (ev.data.paths.length ? ", path: " + ev.data.paths.join(", ") : "")
				+ ", eventArgs: oldValue: " + oldValue + " value: " + value + ", eventArgs.path: " + eventArgs.path + "|";
			break;
		case "insert":
		case "remove":
		case "move":
		case "refresh":
			result += "regularCallbackCalls: " + calls
			+ ", eventArgs: change: " + eventArgs.change + "|";
			break;
		default:
			throw "Error";
	}
}

// =============== Model ===============
function fullName(reverse, upper) {
	var name = reverse ? (this.lastName + " " + this.firstName()) : this.firstName() + " " + this.lastName;
	return upper ? name.toUpperCase() : name;
}

fullName.depends = function(object) { // object is also the this pointer, so we could write function(this) below
	return [
		"firstName",
		function(object) {
			return "lastName";
		}
	];
};

fullName.set = function(val) {
	val = val.split(" ");
	$.observable(this).setProperty({
		lastName: val.pop(),
		firstName: val.join(" ")
	});
};

var Person = function(first, last, home) {
	this._firstName = first;
	this.lastName = last;
	this.home = home;
},

	personProto = {
		firstName: function() {
			return settings.title + " " + this._firstName;
		},
		fullName: fullName
	};

personProto.firstName.set = function(val) {
	this._firstName = val;
};

Person.prototype = personProto;

function updown(val, lower) {
	lower = this.tagCtx.props.lower !== undefined ? this.tagCtx.props.lower : lower;
	val = person1.firstName() + (val || "");
	return (lower === true ? val.toLowerCase() : val.toUpperCase()) + settings.width + this.tagCtx.props.added;
}

function sort(array) {
	var ret = "";
	if (this.tagCtx.props.reverse) {
		// Render in reverse order
		if (arguments.length > 1) {
			for (i = arguments.length; i; i--) {
				ret += sort.call(this, arguments[i - 1]);
			}
		} else for (var i = array.length; i; i--) {
			ret += this.tagCtx.render(array[i - 1]);
		}
	} else {
		// Render in original order
		ret += this.tagCtx.render(array);
	}
	return ret;
}

// =============== DATA ===============

function onFoo1() {return; }

var address1 = {street: "StreetOne", ZIP: "111"},
	address2 = {street: "StreetTwo", ZIP: "222"},
	home1 = {address: address1},
	home2 = {address: address2},
	homeOfOwner = {address: {street: "OwnerStreet"}},
	person1 = new Person("Jo", "One", home1),
	person2 = new Person("Xavier", "Two", home2),

	settings = {
		owner: new Person("Mr", "Owner", homeOfOwner),
		width: 30,
		reverse: true,
		upper: updown,
		title: "Mr",
		onFoo: onFoo1
	},

	model = {
		person1: person1,
		person2: person2,
		things: []
	},

	people = [person1, person2];

personProto.firstName.depends = [settings, "title"];

updown.depends = function() {
	return [this, "firstName", "~settings.width"];
};

// =============== Callbacks for observeAll ===============
function observeAllCb1(ev, eventArgs) {
	if (!eventArgs.refresh) {
		result += "ObserveAll Path: " + ev.data.observeAll.path() + " eventArgs: ";
		for (var key in eventArgs) {
			result += key + ": " + JSON.stringify(eventArgs[key]) + "|";
		}
	}
}

function observeAllCb2(ev, eventArgs) {
	if (!eventArgs.refresh) {
		result += "ObserveAll Path: " + ev.data.observeAll.path() + " eventArgs: ";
		for (var key in eventArgs) {
			result += key + ": " + eventArgs[key] + "|";
		}
	}
}

function observeAllCb3(ev, eventArgs) {}

QUnit.module("API - PropertyChange");

QUnit.test("PropertyChange: setProperty()", function(assert) {

	// ................................ Reset ................................
	person1.home.address.street = "StreetOne"; // reset Prop

	// =============================== Arrange ===============================
	reset();
	$.observable(undefined).setProperty("street", "abc");

	// ............................... Assert .................................
	assert.equal(result, "",
	"$.observable(undefined).setProperty(...) does nothing");

	// =============================== Arrange ===============================
	reset();
	$.observe(person1.home.address, "street", myListener);

	// ................................ Act ..................................
	$.observable(person1.home.address).setProperty("street", "newValue");

	// ............................... Assert .................................
	assert.equal(result, "calls: 1, ev.data: prop: street, eventArgs: oldValue: StreetOne value: newValue, eventArgs.path: street|",
	"setProperty triggers 'observable.observe() callbacks with ev and eventArgs correctly populated");

	// ................................ Reset ................................
	person1.home.address.street = "StreetOne"; // reset Prop
	result1 = result;
	reset();

	// =============================== Arrange ===============================

	// ................................ Act ..................................
	$.observable(person1.home).setProperty("address.street", "newValue");

	// ............................... Assert .................................
	assert.equal(result, result1,
	"setProperty on deep path is equivalent to setProperty on last object before leaf");

	// ................................ Reset ................................
	person1.home.address.street = "StreetOne"; // reset Prop
	reset();

	// =============================== Teardown ===============================

	$.unobserve();
	$.unobserve(person1.home.address, "street", myListener);

	// =============================== Arrange ===============================
	var person = {dob: "10/24/1990"};

	$.observe(person, "dob", myListener);

	// ................................ Act ..................................
	$.observable(person).setProperty("dob", "10/24/1991");

	// ............................... Assert .................................
	assert.equal(result, "calls: 1, ev.data: prop: dob, eventArgs: oldValue: 10/24/1990 value: 10/24/1991, eventArgs.path: dob|",
	"setProperty to date as string");

	// ................................ Reset ................................
	reset();

	// ................................ Act ..................................
	var dt = new Date("10/24/1980");
	
	$.observable(person).setProperty("dob", dt);

	// ............................... Assert .................................
	assert.equal(result, 'calls: 1, ev.data: prop: dob, eventArgs: oldValue: 10/24/1991 value: "1980-10-24T07:00:00.000Z", eventArgs.path: dob|',
	"setProperty to Date object");

	// ................................ Reset ................................
	reset();

	// ................................ Act ..................................
	var dt2 = new Date(dt);
	dt2.setDate(dt2.getDate() + 2);
	
	$.observable(person).setProperty("dob", dt2);

	// ............................... Assert .................................
	assert.equal(result, 'calls: 1, ev.data: prop: dob, eventArgs: oldValue: "1980-10-24T07:00:00.000Z" value: "1980-10-26T07:00:00.000Z", eventArgs.path: dob|',
	"setProperty to another Date object");

	// ................................ Reset ................................
	reset();

	// ................................ Act ..................................
	$.observable(person).setProperty("dob", "1/24/2002");

	// ............................... Assert .................................
	assert.equal(result, 'calls: 1, ev.data: prop: dob, eventArgs: oldValue: "1980-10-26T07:00:00.000Z" value: 1/24/2002, eventArgs.path: dob|',
	"setProperty to date as string");

	// ................................ Reset ................................
	reset();
	$.unobserve(person, "dob", myListener);

});

QUnit.module("API - ArrayChange");

QUnit.test("JsObservable: insert()", function(assert) {

	// =============================== Arrange ===============================
	var things = ["1", "2"];

	// ................................ Act ..................................
	$.observable(things).insert(0, "a");

	// ............................... Assert .................................
	assert.equal(things.join(" "), "a 1 2",
	'insert(0, "a") inserts at 0');

	// =============================== Arrange ===============================
	things = ["1", "2"];

	// ................................ Act ..................................
	$.observable(things).insert(1, "a");

	// ............................... Assert .................................
	assert.equal(things.join(" "), "1 a 2",
	'insert(1, "a") inserts at 1');

	// =============================== Arrange ===============================
	things = ["1", "2"];

	// ................................ Act ..................................
	$.observable(things).insert(2, "a");

	// ............................... Assert .................................
	assert.equal(things.join(" "), "1 2 a",
	'insert(2, "a") inserts at 2');

	// =============================== Arrange ===============================
	things = ["1", "2"];

	// ................................ Act ..................................
	$.observable(things).insert("a");

	// ............................... Assert .................................
	assert.equal(things.join(" "), "1 2 a",
	'insert("a") appends');

	// =============================== Arrange ===============================
	things = ["1", "2"];

	// ................................ Act ..................................
	$.observable(things).insert(1, ["a", "b"]);

	// ............................... Assert .................................
	assert.equal(things.join(" "), "1 a b 2",
	'insert(1, ["a", "b"]) inserts multiple elements at 1');

	// =============================== Arrange ===============================
	things = ["1", "2"];

	// ................................ Act ..................................
	$.observable(things).insert(["a", "b", "c"]);

	// ............................... Assert .................................
	assert.equal(things.join(" "), "1 2 a b c",
	'insert(["a", "b", "c"]) appends multiple elements');

	// =============================== Arrange ===============================
	things = ["1", "2"];

	// ................................ Act ..................................
	$.observable(things).insert("1", "b");

	// ............................... Assert .................................
	assert.equal(things.join(" "), "1 b 2",
	'insert("1", "b") treats first param as index and inserts at 1');

	// =============================== Arrange ===============================
	things = ["1", "2"];

	// ................................ Act ..................................
	$.observable(things).insert("0", "b");

	// ............................... Assert .................................
	assert.equal(things.join(" "), "b 1 2",
	'insert("0", "b") treats first param as index and inserts at 0');

	// =============================== Arrange ===============================
	things = ["1", "2"];

	// ................................ Act ..................................
	$.observable(things).insert("a", "b");

	// ............................... Assert .................................
	assert.equal(things.join(" "), "1 2",
	'insert("a", "b") does nothing - since parseInt("a") is NaN');

	// =============================== Arrange ===============================
	things = ["1", "2"];

	// ................................ Act ..................................
	$.observable(things).insert("1a", "b");

	// ............................... Assert .................................
	assert.equal(things.join(" "), "1 b 2",
	'insert("1a", "b") inserts "b" at 1 - since parseInt("1a") is 1');

	// =============================== Arrange ===============================
	things = [];

	// ................................ Act ..................................
	$.observable(things).insert("a");

	// ............................... Assert .................................
	assert.equal(things.join(" "), "a",
	'insert("a") still appends "a", correctly if array is empty at first');

	// =============================== Arrange ===============================
	things = ["1", "2"];

	// ................................ Act ..................................
	$.observable(things).insert(1);

	// ............................... Assert .................................
	assert.equal(things.join(" ") + (things[2] === 1), "1 2 1true",
	'insert(1) appends 1');

	// =============================== Arrange ===============================
	things = ["1", "2"];

	// ................................ Act ..................................
	$.observable(things).insert(0);

	// ............................... Assert .................................
	assert.equal(things.join(" ") + (things[2] === 0), "1 2 0true",
	'insert(0) appends 0');

	// =============================== Arrange ===============================
	things = ["1", "2"];

	// ................................ Act ..................................
	$.observable(things).insert(undefined);

	// ............................... Assert .................................
	assert.equal(things.join(" "), "1 2 ",
	'insert(undefined) appends undefined');

	// =============================== Arrange ===============================
	things = ["1", "2"];

	// ................................ Act ..................................
	$.observable(things).insert(1, undefined);

	// ............................... Assert .................................
	assert.equal(things.join(" "), "1  2",
	'insert(1, undefined) inserts undefined');

	// =============================== Arrange ===============================
	things = ["1", "2"];

	// ................................ Act ..................................
	$.observable(things).insert(0, undefined);

	// ............................... Assert .................................
	assert.equal(things.join(" "), " 1 2",
	'insert(0, undefined) inserts undefined');

	// =============================== Arrange ===============================
	things = ["1", "2"];

	// ................................ Act ..................................
	$.observable(things).insert([undefined, null, 0, 1, "2"]);

	// ............................... Assert .................................
	assert.equal(things.join(" "), "1 2   0 1 2",
	'insert(1, [undefined, null, 0, 1, "2"]) inserts correctly');

	// =============================== Arrange ===============================
	things = ["1", "2"];

	// ................................ Act ..................................
	$.observable(things).insert("a", "b");

	// ............................... Assert .................................
	assert.equal(things.join(" "), "1 2",
	'insert("a", "b") does nothing - since parseInt("a") is NaN');

	// =============================== Arrange ===============================
	things = ["1", "2"];

	// ................................ Act ..................................
	$.observable(things).insert(-1, "a");

	// ............................... Assert .................................
	assert.equal(things.join(" "), "1 2",
	'insert(-1, "a") does nothing');

	// =============================== Arrange ===============================
	things = ["1", "2"];

	// ................................ Act ..................................
	$.observable(things).insert(10, "a");

	// ............................... Assert .................................
	assert.equal(things.join(" "), "1 2 a",
	'insert(10, "a") (out of range) appends');
});

QUnit.test("JsObservable: remove()", function(assert) {

	// =============================== Arrange ===============================
	var things = ["1", "2"];

	// ................................ Act ..................................
	$.observable(things).remove(0);

	// ............................... Assert .................................
	assert.equal(things.join(" "), "2",
	'remove(0) removes 1 item at 0');

	// =============================== Arrange ===============================
	things = ["1", "2"];

	// ................................ Act ..................................
	$.observable(things).remove(1);

	// ............................... Assert .................................
	assert.equal(things.join(" "), "1",
	'remove(1) removes 1 item at 1');

	// =============================== Arrange ===============================
	things = ["1", "2"];

	// ................................ Act ..................................
	$.observable(things).remove(2);

	// ............................... Assert .................................
	assert.equal(things.join(" "), "1 2",
	'remove(2) does nothing (out of range');

	// =============================== Arrange ===============================
	things = ["1", "2"];

	// ................................ Act ..................................
	$.observable(things).remove();

	// ............................... Assert .................................
	assert.equal(things.join(" "), "1",
	'remove() removes from end');

	// =============================== Arrange ===============================
	things = ["1", "2", "3", "4"];

	// ................................ Act ..................................
	$.observable(things).remove(1, 2);

	// ............................... Assert .................................
	assert.equal(things.join(" "), "1 4",
	'remove(1, 2) removes multiple items at 1');

	// =============================== Arrange ===============================
	things = ["1", "2", "3", "4"];

	// ................................ Act ..................................
	$.observable(things).remove(1, 10);

	// ............................... Assert .................................
	assert.equal(things.join(" "), "1",
	'remove(1, 10) removes all relevant items');

	// =============================== Arrange ===============================
	things = ["1", "2", "3", "4"];

	// ................................ Act ..................................
	$.observable(things).remove("1c", "2.001 euros");

	// ............................... Assert .................................
	assert.equal(things.join(" "), "1 4",
	'remove("1c", "2.001 euros") does parseInt and removes 2 items at 1');

	// =============================== Arrange ===============================
	things = ["1", "2"];

	// ................................ Act ..................................
	$.observable(things).remove("a");

	// ............................... Assert .................................
	assert.equal(things.join(" "), "1 2",
	'remove("a") does nothing - since parseInt("a") is NaN');

	// =============================== Arrange ===============================
	things = ["1", "2"];

	// ................................ Act ..................................
	$.observable(things).remove("a", "b");

	// ............................... Assert .................................
	assert.equal(things.join(" "), "1 2",
	'remove(1, "b") does nothing - since parseInt("b") is NaN');

	// =============================== Arrange ===============================
	things = [];

	// ................................ Act ..................................
	$.observable(things).remove();

	// ............................... Assert .................................
	assert.equal(things.join(" "), "",
	'remove() does nothing if array is empty at first');

	// =============================== Arrange ===============================
	things = ["1", "2"];

	// ................................ Act ..................................
	$.observable(things).remove(-1);

	// ............................... Assert .................................
	assert.equal(things.join(" "), "1 2",
	'remove(-1) does nothing');

	// =============================== Arrange ===============================
	things = ["1", "2"];

	// ................................ Act ..................................
	$.observable(things).remove(10);

	// ............................... Assert .................................
	assert.equal(things.join(" "), "1 2",
	'remove(10, "a") (out of range) does nothing');

	// =============================== Arrange ===============================
	things = ["1", "2"];

	// ................................ Act ..................................
	$.observable(things).remove(10);

	// ............................... Assert .................................
	assert.equal(things.join(" "), "1 2",
	'remove(10) (out of range) does nothing');
});

QUnit.test("JsObservable: move()", function(assert) {

	// =============================== Arrange ===============================
	var things = ["1", "2", "3", "4"];

	// ................................ Act ..................................
	$.observable(things).move(1, 2);

	// ............................... Assert .................................
	assert.equal(things.join(" "), "1 3 2 4",
	'move(1, 2) moves 1 item from 1 to 2 - so swaps them');

	// =============================== Arrange ===============================
	things = ["1", "2", "3", "4"];

	// ................................ Act ..................................
	$.observable(things).move(2, 1);

	// ............................... Assert .................................
	assert.equal(things.join(" "), "1 3 2 4",
	'move(1, 2) moves 1 item from 2 to 1 - so swaps them');

	// =============================== Arrange ===============================
	things = ["1", "2", "3", "4"];

	// ................................ Act ..................................
	$.observable(things).move(1, 3);

	// ............................... Assert .................................
	assert.equal(things.join(" "), "1 3 4 2",
	'move(1, 2) moves 1 item at from 1 to 3');

	// =============================== Arrange ===============================
	things = ["1", "2", "3", "4"];

	// ................................ Act ..................................
	$.observable(things).move(1, 2, 2);

	// ............................... Assert .................................
	assert.equal(things.join(" "), "1 4 2 3",
	'move(1, 2, 2) moves 2 items at from 1 to 2');

	// =============================== Arrange ===============================
	things = ["1", "2", "3", "4"];

	// ................................ Act ..................................
	$.observable(things).move(1, 3, 2);

	// ............................... Assert .................................
	assert.equal(things.join(" "), "1 4 2 3",
	'move(1, 3, 2) moves 2 items from 1 to 2 - same as if moving to 2, since hits the end of the array');

	// =============================== Arrange ===============================
	things = ["1", "2", "3", "4"];

	// ................................ Act ..................................
	$.observable(things).move(1, 2, 3);

	// ............................... Assert .................................
	assert.equal(things.join(" "), "1 2 3 4",
	'move(1, 2, 3) moves 3 items from 1 to 2 - which does nothing since hits the end of the array');

	// =============================== Arrange ===============================
	things = ["1", "2", "3", "4"];

	// ................................ Act ..................................
	$.observable(things).move(1, 6, 2);

	// ............................... Assert .................................
	assert.equal(things.join(" "), "1 4 2 3",
	'move(1, 6, 2) moves 2 items from 1 to 6 - same as if moving to 2, since hits the end of the array');

	// =============================== Arrange ===============================
	things = ["1", "2", "3", "4"];

	// ................................ Act ..................................
	$.observable(things).move(1, 1);

	// ............................... Assert .................................
	assert.equal(things.join(" "), "1 2 3 4",
	'move(1, 1) does nothing');

	// =============================== Arrange ===============================
	things = ["1", "2", "3", "4"];

	// ................................ Act ..................................
	$.observable(things).move(1, 1, 3);

	// ............................... Assert .................................
	assert.equal(things.join(" "), "1 2 3 4",
	'move(1, 1, 3) does nothing');

	// =============================== Arrange ===============================
	things = ["1", "2", "3", "4"];

	// ................................ Act ..................................
	$.observable(things).move(1);

	// ............................... Assert .................................
	assert.equal(things.join(" "), "1 2 3 4",
	'move(1) does nothing');

	// =============================== Arrange ===============================
	things = ["1", "2", "3", "4"];

	// ................................ Act ..................................
	$.observable(things).move();

	// ............................... Assert .................................
	assert.equal(things.join(" "), "1 2 3 4",
	'move() does nothing');

	// =============================== Arrange ===============================
	things = ["1", "2", "3", "4"];

	// ................................ Act ..................................
	$.observable(things).move(10, 0);

	// ............................... Assert .................................
	assert.equal(things.join(" "), "1 2 3 4",
	'move(10, 0) does nothing (out of range)');

	// =============================== Arrange ===============================
	things = ["1", "2", "3", "4"];

	// ................................ Act ..................................
	$.observable(things).move(0, 10);

	// ............................... Assert .................................
	assert.equal(things.join(" "), "2 3 4 1",
	'move(0, 10) moves item 0 to the end (out of range)');

	// =============================== Arrange ===============================
	things = ["1", "2", "3", "4"];

	// ................................ Act ..................................
	$.observable(things).move(3, 0, 6);

	// ............................... Assert .................................
	assert.equal(things.join(" "), "4 1 2 3",
	'move(3, 0, 6) moves any items that are not out of range');

	// =============================== Arrange ===============================
	things = ["1", "2", "3", "4"];

	// ................................ Act ..................................
	$.observable(things).move(-1, 2);

	// ............................... Assert .................................
	assert.equal(things.join(" "), "1 2 3 4",
	'move(-1, 2) does nothing');

	// =============================== Arrange ===============================
	things = ["1", "2", "3", "4"];

	// ................................ Act ..................................
	$.observable(things).move(-1, 2);

	// ............................... Assert .................................
	assert.equal(things.join(" "), "1 2 3 4",
	'move(-1, 2) does nothing');

	// =============================== Arrange ===============================
	things = ["1", "2", "3", "4"];

	// ................................ Act ..................................
	$.observable(things).move(1, -1);

	// ............................... Assert .................................
	assert.equal(things.join(" "), "1 2 3 4",
	'move(1, -1) does nothing');

	// =============================== Arrange ===============================
	things = ["1", "2", "3", "4"];

	// ................................ Act ..................................
	$.observable(things).move(1, 2, -1);

	// ............................... Assert .................................
	assert.equal(things.join(" "), "1 2 3 4",
	'move(1, 2, -1) does nothing');

	// =============================== Arrange ===============================
	things = ["1", "2", "3", "4"];

	// ................................ Act ..................................
	$.observable(things).move("a", 2);

	// ............................... Assert .................................
	assert.equal(things.join(" "), "1 2 3 4",
	'move("a", 2) does nothing');

	// =============================== Arrange ===============================
	things = ["1", "2", "3", "4"];

	// ................................ Act ..................................
	$.observable(things).move("1c", "2.001 euros", "2px");

	// ............................... Assert .................................
	assert.equal(things.join(" "), "1 4 2 3",
	'move("1c", "2.001 euros, "2px") does parseInt and moves 2 items from 1 to 2');

	// =============================== Arrange ===============================
	things = ["1", "2", "3", "4"];

	// ................................ Act ..................................
	$.observable(things).move("c", "2.001 euros", "2px");

	// ............................... Assert .................................
	assert.equal(things.join(" "), "1 2 3 4",
	'move("c", "2.001 euros, "2px") does nothing since parseInt("c") is NaN');

	// =============================== Arrange ===============================
	things = ["1", "2", "3", "4"];

	// ................................ Act ..................................
	$.observable(things).move("1c", "euros", "2px");

	// ............................... Assert .................................
	assert.equal(things.join(" "), "1 2 3 4",
	'move("1c", "euros, "2px") does nothing since parseInt("euros") is NaN');

	// =============================== Arrange ===============================
	things = ["1", "2", "3", "4"];

	// ................................ Act ..................................
	$.observable(things).move("1c", "2.001 euros", "px");

	// ............................... Assert .................................
	assert.equal(things.join(" "), "1 2 3 4",
	'move("1c", "2.001 euros, "px") does nothing since parseInt("px") is NaN');

	// =============================== Arrange ===============================
	things = ["1", "2", "3", "4"];

	// ................................ Act ..................................
	$.observable(things).move("1c", "2.001 euros", undefined);

	// ............................... Assert .................................
	assert.equal(things.join(" "), "1 3 2 4",
	'move("1c", "2.001 euros, undefined) moves 1');

	// =============================== Arrange ===============================
	things = ["1", "2", "3", "4"];

	// ................................ Act ..................................
	$.observable(things).move("1c", "2.001 euros", null);

	// ............................... Assert .................................
	assert.equal(things.join(" "), "1 3 2 4",
	'move("1c", "2.001 euros, null) moves 1');

	// =============================== Arrange ===============================
	things = ["1", "2", "3", "4"];

	// ................................ Act ..................................
	$.observable(things).move("1c", undefined);

	// ............................... Assert .................................
	assert.equal(things.join(" "), "1 2 3 4",
	'move("1c", undefined) does does nothing since parseInt(undefined) is NaN');

	// =============================== Arrange ===============================
	things = ["1", "2", "3", "4"];

	// ................................ Act ..................................
	$.observable(things).move("1c", null);

	// ............................... Assert .................................
	assert.equal(things.join(" "), "1 2 3 4",
	'move("1c", null) does does nothing since parseInt(null) is NaN');

	// =============================== Arrange ===============================
	things = [];

	// ................................ Act ..................................
	$.observable(things).move(1, 2);

	// ............................... Assert .................................
	assert.equal(things.join(" "), "",
	'move(1, 2) does nothing if array is empty');

	$.views.settings.advanced({_jsv: false});
});

QUnit.module("API - $.observe() (jso)");

QUnit.test("depends, for computed observables", function(assert) {

	// =============================== Arrange ===============================
	var added = "NO", cbs = [];

	function trigger() {
		var l = cbs.length;
		while (l--) {
			cbs[l]();
		}
	}

	function callback1(ev, eventArgs) {
		out1 = app.person.fullName();
	}

	function callback2(ev, eventArgs) {
		out2 = app.person.fullName();
	}

	function fullName(val) {
		return this._first + this._last + this.more + added;
	}

	fullName.depends = function(person, callback) {
		cbs.push(callback);
		return callback === callback1
			? ["_first", "_last", "more"]
			: ["_first", "_last"];
	};

	var out1 = "",
		out2 = "",
		app = {};

	// ................................ Act ..................................
	$.observe(app, "person^fullName", "more", callback1);

	$.observe(app, "person^fullName", callback2);

	result = out1 + out2 + cbs.length + "|";

	$.observable(app).setProperty("person", {
		fullName: fullName,
		_first: "Jo",
		_last: "Blow",
		more: ""
	});

	result += out1 + " " + out2 + " " + cbs.length;

	// ............................... Assert .................................
	assert.equal(result, "0|JoBlowNO JoBlowNO 2",
		'Depends for computed observable is called once during each new handler binding of observable object (before calling handler)');

	// ................................ Act ..................................
	$.observable(app).setProperty("person.more", "SomeMore");

	result = out1 + " " + out2;

	// ............................... Assert .................................
	assert.equal(result, "JoBlowSomeMoreNO JoBlowNO",
		'Can set different depends for different binding of same computed observable (here, only first depends expression has "more")');

	// ................................ Act ..................................
	$.observable(app).setProperty("person._first", "Pete");

	result = out1 + " " + out2;

	// ............................... Assert .................................
	assert.equal(result, "PeteBlowSomeMoreNO PeteBlowSomeMoreNO",
		'Both handlers fire, since "_first" and "_last" are in both depends expressions');

	// ................................ Act ..................................
	added = "YES";

	trigger();

	result = out1 + " " + out2;

	// ............................... Assert .................................
	assert.equal(result, "PeteBlowSomeMoreYES PeteBlowSomeMoreYES",
		'Can manually trigger handlers copied from depends function call, for later updates from non-observable changes');

	// =============================== Teardown ===============================
	$.unobserve(); // Unobserve everything
	// $.unobserve(app, app.person); // Or could do this...

	reset();
});

QUnit.test("Array", function(assert) {

	$.views.settings.advanced({_jsv: true}); // For using _jsv

	// =============================== Arrange ===============================
	// Using the same event handler for arrayChange and propertyChange

	var myArray = [1, 2];

	// ................................ Act ..................................
	$.observe(myArray, myListener);

	$.observable(myArray).insert(10);

	// ............................... Assert .................................
	assert.equal(result + $._data(myArray).events.arrayChange.length + " " + !$._data(myArray).events.propertyChange,
		"regularCallbackCalls: 1, eventArgs: change: insert|1 true",
		"$.observe(myArray, myListener) listens just to array change on the array");

	// ................................ Act ..................................
	reset();
	$.unobserve(myArray, myListener);

	$.observable(myArray).insert(11);

	// ............................... Assert .................................
	assert.equal(result + !$._data(myArray).events, "true",
		"$.unobserve(myArray, myListener) removes the arraychange handler");

	// ................................ Act ..................................
	reset();
	$.observe(myArray, "length", myListener);

	$.observable(myArray).insert(14);

	// ............................... Assert .................................
	assert.equal(result + !$._data(myArray).events.arrayChange + " " + $._data(myArray).events.propertyChange.length,
		"calls: 1, ev.data: prop: length, eventArgs: oldValue: 4 value: 5, eventArgs.path: length|true 1",
		'$.observe(myArray, "length", myListener) listens to length propertyChange on the array, but not to array change on the array');

	reset();

	$.unobserve(myArray, "length", myListener);

	// ............................... Assert .................................
	assert.equal(result + !$._data(myArray).events, "true",
		'$.unobserve(myArray, "length", myListener) removes the propertychange handler');

	// ................................ Act ..................................
	$.observe(myArray, myArray, "length", myListener);

	$.observable(myArray).insert(15);

	// ............................... Assert .................................
	assert.equal(result + !$._data(myArray).events.arrayChange + " " + $._data(myArray).events.propertyChange.length,
		"calls: 1, ev.data: prop: length, eventArgs: oldValue: 5 value: 6, eventArgs.path: length|regularCallbackCalls: 2, eventArgs: change: insert|false 1",
		'$.observe(myArray, myArray, "length", myListener) listens to length propertyChange on the array, and to array change on the array');

	// ................................ Reset ..................................
	reset();
	$.unobserve(myArray, myListener);

	// ................................ Act ..................................
	$.observe(myArray, myListener);
	$.observe(myArray, "length", myListener);
	$.unobserve(myArray, myArray, "length", myListener);

	$.observable(myArray).insert(15);

	// ............................... Assert .................................
	assert.equal(result + !$._data(myArray).events, "true",
		'$.unobserve(myArray, myArray, "length", myListener) removes the propertychange handler and the array handler');

	// ................................ Reset ..................................
	reset();
	$.unobserve(myArray, myListener);

	// =============================== Arrange ===============================
	reset();

	myArray = [1, 2, 3];

	var done = false;
	function listenAndChangeAgain(ev, eventArgs) {
		myListener(ev, eventArgs);
		if (!done && eventArgs.change === "remove") {
			done = true;
			$.observable(myArray).remove();
		}
	}

	$.observe(myArray, listenAndChangeAgain);
	$.observe(myArray, "length", listenAndChangeAgain);

	$.observable(myArray).remove(1);

	// ............................... Assert .................................
	assert.equal(result + $._data(myArray).events.arrayChange.length + " " + !$._data(myArray).events.propertyChange,
			"calls: 1, ev.data: prop: length, eventArgs: oldValue: 3 value: 2, eventArgs.path: length|"
			+ "regularCallbackCalls: 2, eventArgs: change: remove|"
			+ "calls: 3, ev.data: prop: length, eventArgs: oldValue: 2 value: 1, eventArgs.path: length|"
			+ "regularCallbackCalls: 4, eventArgs: change: remove|1 false",
		'$.observe(myArray, "length", listenAndChangeAgain) with cascading changes preserves expected order on callbacks for array and array.length change');

	// ................................ Reset ..................................
	$.unobserve(myArray, listenAndChangeAgain);

	// =============================== Arrange ===============================
	reset();

	var initialArray = [1, 2],
			altArray = [4, 3, 2, 1],
			obj = {name: {first: "n", arr: initialArray}};

	$.observe(obj, "name.arr", myListener);

	// ................................ Act ..................................
	$.observable(initialArray).insert(10);

	// ............................... Assert .................................
	assert.equal(result + $._data(initialArray).events.arrayChange.length + " " + $._data(obj.name).events.propertyChange.length + " " + !$._data(initialArray).events.propertyChange,
		"regularCallbackCalls: 1, eventArgs: change: insert|1 1 true",
		'$.observe(object, "a.b.myArray", myListener) listens to array change on the array, and to property change for setting the array');

	// ................................ Act ..................................
	reset();
	$.observable(obj).setProperty("name.arr", altArray);

	// ............................... Assert .................................
	assert.equal(result, "calls: 1, ev.data: prop: arr, eventArgs: oldValue: [1,2,10] value: [4,3,2,1], eventArgs.path: arr|",
	'$.observe(object, "a.b.myArray", myListener) listens to property change for swapping the array property');

	// ............................... Assert .................................
	reset();
	assert.equal(!$._data(initialArray).events + " " + $._data(altArray).events.arrayChange.length, "true 1",
	'$.observable(obj).setProperty("name.arr", newArray) removes the arrayChange handler on previous array, and adds arrayChange to new array');

	// ................................ Act ..................................
	$.observable(obj.name.arr).insert(11);

	// ............................... Assert .................................
	assert.equal(result, "regularCallbackCalls: 1, eventArgs: change: insert|",
	'$.observe(object, "a.b.myArray", myListener) listens to array changes on leaf array property (regular callback)');

	// ................................ Act ..................................
	handlersCount = $._data(obj.name).events.propertyChange.length + $._data(obj.name.arr).events.arrayChange.length;
	$.unobserve(obj, "name.arr", myListener);

	// ............................... Assert .................................
	assert.ok(handlersCount === 2 && !$._data(obj.name).events && !$._data(obj.name.arr).events,
	'$.unobserve(object, "a.b.myArray") removes both arrayChange and propertyChange event handlers');
	reset();

	$.observe(obj, "name.arr", "name.arr.length", myListener);

	$.observable(obj.name.arr).insert(16);

	// ............................... Assert .................................
	assert.equal(result + $._data(obj.name.arr).events.arrayChange.length + " " + $._data(obj.name.arr).events.propertyChange.length + " " + $._data(obj.name).events.propertyChange.length,
		"calls: 1, ev.data: prop: length, eventArgs: oldValue: 5 value: 6, eventArgs.path: length|"
		+ "regularCallbackCalls: 2, eventArgs: change: insert|1 1 1",
		'$.observe(object, "a.b.array", "a.b.array.length", myListener) listens to array change on the array, to setting the array, and to length propertyChange on the array');

	// ................................ Act ..................................
	reset();
	$.unobserve(obj, "name.arr", "name.arr.length", myListener);

	$.observable(obj.name.arr).insert(17);

	// ............................... Assert .................................
	assert.equal(result + !$._data(obj.name.arr).events + " " + !$._data(obj.name).events, "true true",
		'$.unobserve(object, "a.b.array", "a.b.array.length", myListener) removes the arraychange handler and the propertychange handlers');

	// ................................ Act ..................................
	$.observe(obj, "name.arr^length", myListener);

	$.observable(obj.name.arr).insert(16);

	// ............................... Assert .................................
	assert.equal(result + !$._data(obj.name.arr).events.arrayChange + " " + $._data(obj.name.arr).events.propertyChange.length + " " + $._data(obj.name).events.propertyChange.length,
		"calls: 1, ev.data: prop: length, eventArgs: oldValue: 7 value: 8, eventArgs.path: length|true 1 1",
		'$.observe(object, "a.b.array^length", myListener) listens to setting array and changing array length, but not to arrayChange on the array');

	// ................................ Act ..................................
	reset();
	$.unobserve(obj, "name.arr^length", myListener);

	// ............................... Assert .................................
	assert.equal(result + !$._data(obj.name.arr).events + " " + !$._data(obj.name).events, "true true",
		'$.unobserve(object, "a.b.array^length", myListener) removes the arraychange handler and the propertychange handler');

	// ................................ Act ..................................
	$.observe(obj, "name.*", myListener);

	$.observable(obj.name.arr).insert(18);

	$.observable(obj.name).setProperty({
		first: "1st",
		notThereBefore: "2nd",
		arr: initialArray
	});
	$.observable(obj.name.arr).insert(19);

	// ............................... Assert .................................
	assert.equal(result + $._data(obj.name.arr).events.arrayChange.length + " " + $._data(obj.name).events.propertyChange.length + " " + !$._data(altArray).events,
		"regularCallbackCalls: 1, eventArgs: change: insert|"
		+ "calls: 2, ev.data: prop: *, eventArgs: oldValue: n value: 1st, eventArgs.path: first|"
		+ "calls: 3, ev.data: prop: *, eventArgs: oldValue: undefined value: 2nd, eventArgs.path: notThereBefore|"
		+ "calls: 4, ev.data: prop: *, eventArgs: oldValue: [4,3,2,1,11,16,17,16,18] value: [1,2,10], eventArgs.path: arr|"
		+ "regularCallbackCalls: 5, eventArgs: change: insert|1 1 true",
		'$.observe(object, "a.b.*", myListener) listens to all propertyChange events on object.a.b and to array change on any array properties of object.a.b');

		"regularCallbackCalls: 1, eventArgs: change: insert|"
		"calls: 2, ev.data: prop: *, eventArgs: oldValue: [4,3,2,1,11,16,17,16,18] value: [1,2,10], eventArgs.path: arr|"
		"calls: 3, ev.data: prop: *, eventArgs: oldValue: undefined value: 2nd, eventArgs.path: notThereBefore|"
		"calls: 4, ev.data: prop: *, eventArgs: oldValue: n value: 1st, eventArgs.path: first|"
		"regularCallbackCalls: 5, eventArgs: change: insert|1 1 true"

	// ................................ Act ..................................
	reset();
	$.unobserve(obj, "name.*", myListener);

	$.observable(obj.name.arr).insert(17);

	// ............................... Assert .................................
	assert.equal(result + !$._data(obj.name.arr).events, "true",
		'$.unobserve(object, "a.b.*", myListener) removes the propertychange handler and any arraychange handlers');

	// =============================== Arrange ===============================
	obj = {name: {first: "n", arr: initialArray}};
	var newArray1 = [1, 1],
		newArray2 = [2, 2],
		newArray3 = [3, 3];

	reset();
	$.observe(obj, "name.*", myListener);

	$.observable(obj.name.arr).insert(18);

	$.observable(obj.name).setProperty({
		first: newArray1,
		arrayNotThereBefore: newArray2,
		arr: newArray3
	});
	$.observable(obj.name.first).insert(10);
	$.observable(obj.name.arrayNotThereBefore).insert(11);
	$.observable(obj.name.arr).insert(12);

	// ............................... Assert .................................
	assert.equal(result + !$._data(initialArray).events + " " + $._data(obj.name).events.propertyChange.length + " "
		+ $._data(newArray1).events.arrayChange.length + " " + $._data(newArray2).events.arrayChange.length + " " + $._data(newArray3).events.arrayChange.length,
		"regularCallbackCalls: 1, eventArgs: change: insert|"
		+ "calls: 2, ev.data: prop: *, eventArgs: oldValue: n value: [1,1], eventArgs.path: first|"
		+ "calls: 3, ev.data: prop: *, eventArgs: oldValue: undefined value: [2,2], eventArgs.path: arrayNotThereBefore|"
		+ "calls: 4, ev.data: prop: *, eventArgs: oldValue: [1,2,10,19,17,18] value: [3,3], eventArgs.path: arr|"
		+ "regularCallbackCalls: 5, eventArgs: change: insert|"
		+ "regularCallbackCalls: 6, eventArgs: change: insert|"
		+ "regularCallbackCalls: 7, eventArgs: change: insert|"
		+ "true 1 1 1 1",
		'$.observe(object, "a.b.*", myListener) listens to array change on any array properties of object.a.b whether intially present, or added subsequently');

	// ................................ Act ..................................
	reset();
	$.unobserve(obj, "name.*", myListener);

	$.observable(obj.name.arr).insert(17);

	// ............................... Assert .................................
	assert.equal(result + !$._data(obj.name.arr).events + " " + !$._data(newArray1).events + " " + !$._data(newArray1).events + " " + !$._data(newArray1).events, "true true true true",
		'$.unobserve(object, "a.b.*", myListener) removes the propertychange handler and any arraychange handlers');

	// =============================== Arrange ===============================
	// Using an array event handler
	obj = {name: {first: "n", arr: [1, 2]}};

	myListener.array = function(ev, eventArgs) {
		result += "arrayListenerCalls: " + calls
		+ ", eventArgs: change: " + eventArgs.change + "|";
	};

	$.observe(obj, "name.arr", myListener);

	// ................................ Act ..................................
	reset();
	$.observable(obj).setProperty("name.arr", [4, 3, 2, 1]);

	// ............................... Assert .................................
	assert.equal(result, "calls: 1, ev.data: prop: arr, eventArgs: oldValue: [1,2] value: [4,3,2,1], eventArgs.path: arr|",
	'$.observe(object, "a.b.myArray", cbWithArrayCallback) listens to property change for swapping the array property');

	// ................................ Act ..................................
	reset();
	$.observable(obj.name.arr).insert(12);

	// ............................... Assert .................................
	assert.equal(result, "arrayListenerCalls: 0, eventArgs: change: insert|",
	'$.observe(object, "a.b.myArray", cbWithArrayCallback) listens also to array changes on leaf array property (array callback handler)');

	// ................................ Act ..................................
	handlersCount = $._data(obj.name.arr).events.arrayChange.length + " " + $._data(obj.name).events.propertyChange.length;
	$.unobserve(obj, "name.arr", myListener);

	// ............................... Assert .................................
	assert.ok(handlersCount === "1 1" && !$._data(obj.name.arr).events && !$._data(obj.name).events,
	'$.unobserve(object, "a.b.myArray") removes arrayChange and propertyChange event handlers');

	// =============================== Arrange ===============================
	$.observe(obj.name.arr, myListener);

	// ................................ Act ..................................
	reset();
	$.observable(obj.name.arr).insert(13);

	// ............................... Assert .................................
	assert.equal(result, "arrayListenerCalls: 0, eventArgs: change: insert|",
	'$.observe(myArray, cbWithArrayCallback) listens to array changes (array callback handler)');
	// ................................ Act ..................................
	handlersCount = $._data(obj.name.arr).events.arrayChange.length;
	$.unobserve(obj.name.arr, myListener);

	// ............................... Assert .................................
	assert.ok(handlersCount === 1 && !$._data(obj.name.arr).events,
	'$.unobserve(myArray) removes arrayChange event handler');
	// -----------------------------------------------------------------------

	// =============================== Arrange ===============================
	var people = [1, 2];
	function onch() {}
	function onch2() {}

	// ................................ Act ..................................
	$.observe(people, "length", onch);
	$.observe(people, "length", onch2);
	$.observe(people, "length2", onch);
	$.observe(people, "length2", onch2);
	$.unobserve(people, "length2", onch);
	$.unobserve(people, "length2", onch2);
	$.unobserve(people, "length", onch);
	$.unobserve(people, "length", onch2);

	// ............................... Assert .................................
	assert.equal(JSON.stringify([_jsv.cbBindings, $._data(people).events]), "[{},null]",
		"observe/unobserve array - API calls in different orders: all bindings removed when unobserve called");

	$.views.settings.advanced({_jsv: false});
});

QUnit.test("observe/unobserve alternative signatures", function(assert) {

	// ................................ Reset ................................
	person1.home.address.street = "StreetOne"; // reset Prop
	person1.home.address.ZIP = "111"; // reset Prop
	$.views.settings.advanced({_jsv: true}); // For using _jsv
	reset();

	// =============================== Arrange ===============================
	// ................................ Act ..................................
	$.observe(person1.home.address, "street", myListener);
	$.observable(person1.home.address).setProperty("street", "newValue");

	// ............................... Assert .................................
	assert.equal(result, "calls: 1, ev.data: prop: street, eventArgs: oldValue: StreetOne value: newValue, eventArgs.path: street|",
	"$.observe(object, path, myListener)");

	// ................................ Reset ................................
	person1.home.address.street = "StreetOne"; // reset Prop
	reset();

	// =============================== Arrange ===============================

	// ................................ Act ..................................
	$.unobserve(person1.home.address, "street", myListener);
	$.observable(person1.home.address).setProperty("street", "newValue");

	// ............................... Assert .................................
	assert.equal(result, "",
	"$.unobserve(object, path, myListener)");

	// ................................ Reset ................................
	person1.home.address.street = "StreetOne"; // reset Prop
	reset();

	// =============================== Arrange ===============================

	// ................................ Act ..................................
	$.observe(person1.home.address, "street", "ZIP", myListener);
	$.observable(person1.home.address).setProperty({street: "newValue", ZIP: "newZip"});

	// ............................... Assert .................................
	assert.equal(result, "calls: 1, ev.data: prop: street, eventArgs: oldValue: StreetOne value: newValue, eventArgs.path: street|"
				+ "calls: 2, ev.data: prop: ZIP, eventArgs: oldValue: 111 value: newZip, eventArgs.path: ZIP|",
	"$.observe(object, path1, path2, myListener)");

	// ................................ Reset ................................
	person1.home.address.street = "StreetOne"; // reset Prop
	person1.home.address.ZIP = "111"; // reset Prop
	reset();

	// =============================== Arrange ===============================

	// ................................ Act ..................................
	$.unobserve(person1.home.address, "street", "ZIP", myListener);
	$.observable(person1.home.address).setProperty({street: "newValue", ZIP: "newZip"});

	// ............................... Assert .................................
	assert.equal(result, "",
	"$.unobserve(object, path1, path2, myListener) removes previous handlers");

	// ................................ Reset ................................
	person1.home.address.street = "StreetOne"; // reset Prop
	person1.home.address.ZIP = "111"; // reset Prop
	reset();

	// =============================== Arrange ===============================
	var person = {last: " L"};
	function onch(ev, eventArgs) {}
	function onch2(ev, eventArgs) {}

	// ................................ Act ..................................
	$.observe(person, "last", onch);
	$.observe(person, "last", onch2);
	$.unobserve(person, "last", onch);
	$.unobserve(person, "last", onch2);

	// ............................... Assert .................................
	assert.equal(JSON.stringify([_jsv.cbBindings, $._data(person).events]), "[{},null]",
		"observe/unobserve API calls in different orders: all bindings removed when unobserve called");

	// =============================== Arrange ===============================
	person = {first: "F", last: " L"};

	// ................................ Act ..................................
	$.observe(person, "last", onch);
	$.observe(person, "last", onch2);
	$.observe(person, "first", onch);
	$.observe(person, "first", onch2);
	$.unobserve(person, "last", onch);
	$.unobserve(person, "last", onch2);
	$.unobserve(person, "first", onch);
	$.unobserve(person, "first", onch2);

	// ............................... Assert .................................
	assert.equal(JSON.stringify([_jsv.cbBindings, $._data(person).events]), "[{},null]",
		"observe/unobserve API calls in different orders (version 2): all bindings removed when unobserve called");

	// =============================== Arrange ===============================
	person = {
		name: "Pete",
		address: {
			street: "1st Ave"
		},
		phones: [{number: "111 111 1111"}, {number: "222 222 2222"}]
	};

	// ................................ Act ..................................
	$.observe(person, "name", myListener);
	$.unobserve(person, "name", myListener);

	// ............................... Assert .................................
	assert.equal(JSON.stringify([_jsv.cbBindings, $._data(person).events]), "[{},null]",
		"unobserve with path and handler works");

	// ................................ Act ..................................
	$.observe(person, "name", myListener);
	$.unobserve(person, myListener);

	// ............................... Assert .................................
	assert.equal(JSON.stringify([_jsv.cbBindings, $._data(person).events]), "[{},null]",
		"unobserve without path works");

	// ................................ Act ..................................
	$.observe(person, "name", myListener);
	$.unobserve(person, "name");

	// ............................... Assert .................................
	assert.equal(JSON.stringify([_jsv.cbBindings, $._data(person).events]), "[{},null]",
		"unobserve without handler works");

	// ................................ Act ..................................
	$.observe(person, "name", myListener);
	$.unobserve(person);

	// ............................... Assert .................................
	assert.equal(JSON.stringify([_jsv.cbBindings, $._data(person).events]), "[{},null]",
		"unobserve without path and handler works");

	// ................................ Act ..................................
	$.observe(person, "name", myListener);
	$.unobserve(myListener);

	// ............................... Assert .................................
	assert.equal(JSON.stringify([_jsv.cbBindings, $._data(person).events]), "[{},null]",
		"unobserve with handler only works");

	// ................................ Act ..................................
	$.observe(person, "name", myListener);
	$.unobserve();

	// ............................... Assert .................................
	assert.equal(JSON.stringify([_jsv.cbBindings, $._data(person).events]), "[{},null]",
		"unobserve() (unobserves all) works");

	// ................................ Act ..................................
	$.observe(person, "name", "address^street", "phones", myListener);
	$.unobserve(person, "name", "address^street", "phones", myListener);

	// ............................... Assert .................................
	assert.equal(JSON.stringify([_jsv.cbBindings, $._data(person).events, $._data(person.address).events, $._data(person.phones).events]), "[{},null,null,null]",
		"unobserve with multiple paths and handler works");

	// ................................ Act ..................................
	$.observe(person, "name", "address^street", "phones", myListener);
	$.unobserve(person, "*", person.address, "*");

	// ............................... Assert .................................
	assert.equal(JSON.stringify([_jsv.cbBindings, $._data(person).events, $._data(person.address).events, $._data(person.phones).events]), "[{},null,null,null]",
		"unobserve with deep paths using '*' works");

	// ................................ Act ..................................
	$.observe(person, "name", "address^street", "phones", myListener);

	$.unobserve(person, person.address, person.phones);

	// ............................... Assert .................................
	assert.equal(JSON.stringify([_jsv.cbBindings, $._data(person).events, $._data(person.address).events, $._data(person.phones).events]), "[{},null,null,null]",
		"unobserve(object1, object2) removes handlers from each object");

	// ................................ Act ..................................
	$.unobserve(person);
	$.unobserve(person.address);
	$.unobserve(person.phones);

	// ............................... Assert .................................
	assert.equal(JSON.stringify([_jsv.cbBindings, $._data(person).events, $._data(person.address).events, $._data(person.phones).events]), "[{},null,null,null]",
		"unobserve(object1) works");

	// ................................ Act ..................................
	$.observe(person, "phones", myListener);
	$.unobserve();

	// ............................... Assert .................................
	assert.equal(JSON.stringify([_jsv.cbBindings, $._data(person).events, $._data(person.address).events, $._data(person.phones).events]), "[{},null,null,null]",
		"unobserve() removes handlers from all objects");

	// ................................ Act ..................................
	$.observe(person.phones, myListener);
	$.unobserve(person.phones);

	// ............................... Assert .................................
	assert.equal(JSON.stringify([_jsv.cbBindings, $._data(person.phones).events]), "[{},null]",
		"unobserve for array works");

	// ................................ Act ..................................
	function notBound() {}

	$.observe(person, "name", "address^street", "phones", myListener);
	$.unobserve(person, person.address, person.phones, notBound);

	// ............................... Assert .................................
	assert.equal("" + $._data(person).events.propertyChange.length + $._data(person.address).events.propertyChange.length + $._data(person.phones).events.arrayChange.length,
		"311",
		"unobserve(object1, object2, unboundHandler) with another (unused) handler does nothing");

	// ................................ Act ..................................
	$.unobserve(notBound);

	// ............................... Assert .................................
	assert.equal("" + $._data(person).events.propertyChange.length + $._data(person.address).events.propertyChange.length + $._data(person.phones).events.arrayChange.length,
		"311",
		"unobserve(unboundHandler) with another (unused) handler does nothing");

	// ................................ Act ..................................
	$.unobserve(myListener);
	$.observe(person.phones, myListener);
	$.unobserve(person.phones, notBound);

	// ............................... Assert .................................
	assert.equal("" + $._data(person.phones).events.arrayChange.length, "1",
		"unobserve(array, unboundHandler), with another (unused) handler does nothing");

	$.unobserve(myListener);

	$.views.settings.advanced({_jsv: false});
});

QUnit.test("observe/unobserve using namespaces", function(assert) {
	function myListener2(ev, eventArgs) {
		calls++;
		result += "Listener2 change: " + eventArgs.change + " Handler ns: '" + ev.data.ns + "' Caller ns: '" + ev.namespace + "' calls: " + calls + "|";
	}

	function myListener3(ev, eventArgs) {
		calls++;
		result += "Listener3 change: " + eventArgs.change + " Handler ns: '" + ev.data.ns + "' Caller ns: '" + ev.namespace + "' calls: " + calls + "|";
	}

	$.views.settings.advanced({_jsv: true}); // For using _jsv
	var thing = {val: "initVal"};

	// =============================== Arrange ===============================
	// ................................ Act ..................................
	$.observe("my.nmspace", thing, "val", myListener);
	reset();
	$.observable(thing).setProperty("val", "newVal");

	// ............................... Assert .................................
	assert.equal(result + $._data(thing).events.propertyChange.length,
		"calls: 1, ev.data: prop: val, eventArgs: oldValue: initVal value: newVal, eventArgs.path: val|1",
		"$.observe(namespace, object, path, cb)");

	// =============================== Arrange ===============================
	// ................................ Act ..................................
	$.unobserve("my.nmspace", thing);
	reset();
	$.observable(thing).setProperty("val", "newVal");

	// ............................... Assert .................................
	assert.equal(result + JSON.stringify([_jsv.cbBindings, $._data(thing).events]),
		"[{},null]",
		"$.observe(namespace, object, path, cb); $.unobserve(namespace, object); removes all events added with the same namespace");

	// ................................ Reset ................................
	thing.val = "initVal"; // reset Prop

	// =============================== Arrange ===============================
	$.observe("my.nmspace", thing, "val", myListener);
	$.unobserve(thing);

	// ................................ Act ..................................
	reset();
	$.observable(thing).setProperty("val", "newVal");

	// ............................... Assert .................................
	assert.equal(result + JSON.stringify([_jsv.cbBindings, $._data(thing).events]),
		"[{},null]",
		"$.observe(namespace, object, path, cb); $.unobserve(object); removes all events even if added with the namespace");

	// ................................ Reset ................................
	thing.val = "initVal"; // reset Prop

	// =============================== Arrange ===============================
	$.observe("my.nmspace", thing, "val", myListener);
	$.unobserve("my2.nmspace", thing);

	// ................................ Act ..................................
	reset();
	$.observable(thing).setProperty("val", "newVal");

	// ............................... Assert .................................
	assert.equal(result + $._data(thing).events.propertyChange.length,
		"calls: 1, ev.data: prop: val, eventArgs: oldValue: initVal value: newVal, eventArgs.path: val|1",
		"$.observe(namespace, object, path, cb); $.unobserve(otherNamespace, object); does not remove events if added with a different namespace");

	// ................................ Reset ................................
	thing.val = "initVal"; // reset Prop

	// =============================== Arrange ===============================
	$.observe("my.nmspace", thing, "val", myListener);
	$.observe("your.nmspace", thing, "val", myListener);

	// ................................ Act ..................................
	reset();
	$.observable(thing).setProperty("val", "newVal");
	$.unobserve("my.nmspace", thing);
	$.observable(thing).setProperty("val", "newVal2");

	// ............................... Assert .................................
	assert.equal(result + $._data(thing).events.propertyChange.length,
		"calls: 1, ev.data: prop: val, eventArgs: oldValue: initVal value: newVal, eventArgs.path: val|"
		+ "calls: 2, ev.data: prop: val, eventArgs: oldValue: initVal value: newVal, eventArgs.path: val|"
		+ "calls: 3, ev.data: prop: val, eventArgs: oldValue: newVal value: newVal2, eventArgs.path: val|1",
		"$.observe(namespace1, object, path, cb); $.observe(namespace2, object, path, cb); $.unobserve(namespace1, object); Add two events with different namespaces, then remove one of the namespaces - leaves the other handlers");

	// ................................ Reset ................................
	thing.val = "initVal"; // reset Prop

	// =============================== Arrange ===============================
	$.observe("my.nmspace your.nmspace", thing, "val", myListener);

	// ................................ Act ..................................
	reset();
	$.observable(thing).setProperty("val", "newVal");
	$.unobserve("my.nmspace", thing);
	$.observable(thing).setProperty("val", "newVal2");

	// ............................... Assert .................................
	assert.equal(result + $._data(thing).events.propertyChange.length,
		"calls: 1, ev.data: prop: val, eventArgs: oldValue: initVal value: newVal, eventArgs.path: val|"
		+ "calls: 2, ev.data: prop: val, eventArgs: oldValue: initVal value: newVal, eventArgs.path: val|"
		+ "calls: 3, ev.data: prop: val, eventArgs: oldValue: newVal value: newVal2, eventArgs.path: val|1",
		'$.observe("my.nmspace your.nmspace", object, path, cb); $.unobserve(my.nmspace, object); Whitepace separated namespaces adds events for each namespace, then remove one of the namespaces - leaves the other handlers - as in previous test');

	// ................................ Reset ................................
	thing.val = "initVal"; // reset Prop

	// =============================== Arrange ===============================
	$.observe("my.nmspace", thing, "val", myListener);
	$.observe("your.nmspace", thing, "val", myListener);

	// ................................ Act ..................................
	reset();
	$.observable(thing).setProperty("val", "newVal");
	$.unobserve("my.nmspace your.nmspace", thing);
	$.observable(thing).setProperty("val", "newVal2");

	// ............................... Assert .................................
	assert.equal(result + JSON.stringify([_jsv.cbBindings, $._data(thing).events]),
		"calls: 1, ev.data: prop: val, eventArgs: oldValue: initVal value: newVal, eventArgs.path: val|"
		+ "calls: 2, ev.data: prop: val, eventArgs: oldValue: initVal value: newVal, eventArgs.path: val|"
		+ "[{},null]",
		'$.unobserve("my.nmspace your.nmspace", object); $.unobserve with whitepace separated namespaces removes handler for each namespace');

	// ................................ Reset ................................
	thing.val = "initVal"; // reset Prop

	// =============================== Arrange ===============================
	$.observe("my.nmspace", thing, "val", myListener);
	$.observe("your.nmspace", thing, "val", myListener);

	// ................................ Act ..................................
	reset();
	$.observable(thing).setProperty("val", "newVal");
	$.unobserve("my your", thing);
	$.observable(thing).setProperty("val", "newVal2");

	// ............................... Assert .................................
	assert.equal(result + JSON.stringify([_jsv.cbBindings, $._data(thing).events]),
		"calls: 1, ev.data: prop: val, eventArgs: oldValue: initVal value: newVal, eventArgs.path: val|"
		+ "calls: 2, ev.data: prop: val, eventArgs: oldValue: initVal value: newVal, eventArgs.path: val|"
		+ "[{},null]",
		'$.unobserve("my your", object); $.unobserve with whitepace separated namespaces removes handler for each namespace');

	// ................................ Reset ................................
	thing.val = "initVal"; // reset Prop

	// =============================== Arrange ===============================
	$.observe("my.nmspace", thing, "val", myListener);
	$.observe("your.nmspace", thing, "val", myListener);

	// ................................ Act ..................................
	reset();
	$.observable(thing).setProperty("val", "newVal");
	$.unobserve("nmspace", thing);
	$.observable(thing).setProperty("val", "newVal2");

	// ............................... Assert .................................
	assert.equal(result + JSON.stringify([_jsv.cbBindings, $._data(thing).events]),
		"calls: 1, ev.data: prop: val, eventArgs: oldValue: initVal value: newVal, eventArgs.path: val|"
		+ "calls: 2, ev.data: prop: val, eventArgs: oldValue: initVal value: newVal, eventArgs.path: val|"
		+ "[{},null]",
		'$.observe("my.nmspace", object, path, cb); $.observe("your.nmspace", object, path, cb); $.unobserve("nmspace", object); removes all handlers for "nmspace" no matter what other namespaces were used ("my", "your", for example');

	// ................................ Reset ................................
	thing.val = "initVal"; // reset Prop

	// =============================== Arrange ===============================
	$.observe("my.nmspace", thing, "val", myListener);
	$.observe("your.nmspace", thing, "val", myListener);

	// ................................ Act ..................................
	reset();
	$.observable(thing).setProperty("val", "newVal");
	$.unobserve("p_foo", thing); // does nothing - removes handlers that listened to changes of "foo" property - but there were none...
	$.observable(thing).setProperty("val", "newVal2");
	$.unobserve("p_val", thing); // removes handlers that listened to changes of "val" property
	$.observable(thing).setProperty("val", "newVal3");

	// ............................... Assert .................................
	assert.equal(result + JSON.stringify([_jsv.cbBindings, $._data(thing).events]),
		"calls: 1, ev.data: prop: val, eventArgs: oldValue: initVal value: newVal, eventArgs.path: val|"
		+ "calls: 2, ev.data: prop: val, eventArgs: oldValue: initVal value: newVal, eventArgs.path: val|"
		+ "calls: 3, ev.data: prop: val, eventArgs: oldValue: newVal value: newVal2, eventArgs.path: val|"
		+ "calls: 4, ev.data: prop: val, eventArgs: oldValue: newVal value: newVal2, eventArgs.path: val|"
		+ "[{},null]",
		'Using the unobserve with namespace "p_val" will remove handlers that listened to changes of the "val" property');

	// ................................ Reset ................................
	thing.val = "initVal"; // reset Prop
	reset();

	// =============================== Arrange ===============================
	var person = {
		name: "Pete",
		address: {
			street: "1st Ave"
		},
		phones: [{number: "111 111 1111"}, {number: "222 222 2222"}]
	};

	// ................................ Act ..................................
	$.observe("ns", person, "name", myListener);
	$.unobserve("ns", person, "name", myListener);

	// ............................... Assert .................................
	assert.equal(JSON.stringify([_jsv.cbBindings, $._data(person).events]), "[{},null]",
		"unobserve using namespaces, with path and handler works");

	// ................................ Act ..................................
	$.observe("ns", person, "name", myListener);
	$.unobserve("ns", person);

	// ............................... Assert .................................
	assert.equal(JSON.stringify([_jsv.cbBindings, $._data(person).events]), "[{},null]",
		"unobserve using namespaces, without path and handler works");

	// ................................ Act ..................................
	$.observe("ns", person, "name", "address^street", "phones", myListener);
	$.unobserve("ns", person, "name", "address^street", "phones", myListener);

	// ............................... Assert .................................
	assert.equal(JSON.stringify([_jsv.cbBindings, $._data(person).events, $._data(person.address).events, $._data(person.phones).events]), "[{},null,null,null]",
		"unobserve using namespaces, with multiple paths and handler works");

	// ................................ Act ..................................
	$.observe("ns", person.phones, myListener);
	$.unobserve("ns", person.phones);

	// ............................... Assert .................................
	assert.equal(JSON.stringify([_jsv.cbBindings, $._data(person.phones).events]), "[{},null]",
		"unobserve using namespaces, for array works");

	// ................................ Act ..................................
	$.observe("ns", person, "name", "address^street", "phones", myListener);
	$.unobserve("ns", person, "*", person.address, "*");

	// ............................... Assert .................................
	assert.equal(JSON.stringify([_jsv.cbBindings, $._data(person).events]), "[{},null]",
		"unobserve using namespaces, with deep paths using '*' works");

	// ................................ Act ..................................
	$.observe("ns.a.b", person, "name", "address^street", "phones", myListener);
	$.observe("ns.a.b", person, "name", myListener2);
	$.unobserve("ns.b", myListener); // Removes handlers that include all namespace tokens, any object, for this handler
	$.observable(person).setProperty("name", "newVal");

	// ............................... Assert .................................
	assert.equal(result + $._data(person).events.propertyChange.length, "Listener2 change: set Handler ns: 'ns.a.b' Caller ns: '' calls: 1|1",
		"unobserve using just namespaces and handler works");
	reset();
	$.unobserve();

	// ................................ Act ..................................
	$.observe("ns.a.b", person, "name", "address^street", "phones", myListener);
	$.observe("ns.a.b", person, "phones", myListener2);
	$.unobserve("ns.b"); // Removes handlers that include all namespace tokens, any object, any handler

	// ............................... Assert .................................
	assert.equal(JSON.stringify([_jsv.cbBindings, $._data(person).events]), "[{},null]",
		"unobserve using namespaces and no object, paths or handler works");

	// ................................ Act ..................................
	$.observe("ns.a.b", person, "name", "address^street", "phones", myListener3);
	$.observe("ns.a.b", person, "name", myListener2);
	$.observe("ns.a.c", person, "name", myListener2);
	$.observe("b.c.ns", person, "name", myListener2);
	$.observable("ns.b", person).setProperty("name", "newVal2");
	$.observable("ns.b", person).removeProperty("name");
	$.unobserve("ns"); // Removes handlers that include 'ns' namespace token, any object, any handler

	// ............................... Assert .................................
	assert.equal(result + JSON.stringify([_jsv.cbBindings, $._data(person).events]),
	"Listener3 change: set Handler ns: 'ns.a.b' Caller ns: 'b.ns' calls: 1|"
	+ "Listener2 change: set Handler ns: 'ns.a.b' Caller ns: 'b.ns' calls: 2|"
	+ "Listener2 change: set Handler ns: 'b.c.ns' Caller ns: 'b.ns' calls: 3|"
	+ "Listener3 change: set Handler ns: 'ns.a.b' Caller ns: 'b.ns' calls: 4|"
	+ "Listener2 change: set Handler ns: 'ns.a.b' Caller ns: 'b.ns' calls: 5|"
	+ "Listener2 change: set Handler ns: 'b.c.ns' Caller ns: 'b.ns' calls: 6|"
	+ "[{},null]",
		'$.observable("ns.b", object).setProperty triggers only observe handlers that include those namespace tokens');
	reset();
	$.unobserve();

	// ................................ Act ..................................
	$.observe("ns.a.b", person.phones, myListener3);
	$.observe("ns.a.b", person.phones, myListener2);
	$.observe("ns.a.c", person.phones, myListener2);
	$.observe("b.c.ns", person.phones, myListener2);
	$.observable("ns.b", person.phones).insert({number: "999"});
	$.observable("ns.b", person.phones).remove();
	$.unobserve("ns"); // Removes handlers that include 'ns' namespace token, any object, any handler


	$.observe("ns", person.phones, myListener);
	$.unobserve("ns"); // Removes handlers that include 'ns' namespace token, any object, any handler

	// ............................... Assert .................................
	assert.equal(result + JSON.stringify([_jsv.cbBindings, $._data(person.phones).events]),
		"Listener3 change: insert Handler ns: 'ns.a.b' Caller ns: 'b.ns' calls: 1|"
	+ "Listener2 change: insert Handler ns: 'ns.a.b' Caller ns: 'b.ns' calls: 2|"
	+ "Listener2 change: insert Handler ns: 'b.c.ns' Caller ns: 'b.ns' calls: 3|"
	+ "Listener3 change: remove Handler ns: 'ns.a.b' Caller ns: 'b.ns' calls: 4|"
	+ "Listener2 change: remove Handler ns: 'ns.a.b' Caller ns: 'b.ns' calls: 5|"
	+ "Listener2 change: remove Handler ns: 'b.c.ns' Caller ns: 'b.ns' calls: 6|"
	+ "[{},null]",
		'$.observable("ns.b", object).insert (array) triggers only observe handlers that include those namespace tokens');

	reset();

	$.views.settings.advanced({_jsv: false});
});

QUnit.test("Paths", function(assert) {

	// ................................ Reset ................................
	person1.home = home1;
	address1.street = "StreetOne"; // reset Prop
	address1.ZIP = "111"; // reset Prop
	address2.street = "StreetTwo"; // reset Prop
	address2.ZIP = "222"; // reset Prop
	home2 = {address: address2};

	// =============================== Arrange ===============================
	var originalAddress = person1.home.address;

	// ................................ Act ..................................
	$.observe(person1, "home^address.street", person1.home.address, "ZIP", myListener);
	$.observable(person1.home.address).setProperty({street: "newValue", ZIP: "newZip"});

	// ............................... Assert .................................
	assert.ok(result === "calls: 1, ev.data: prop: street, eventArgs: oldValue: StreetOne value: newValue, eventArgs.path: street|"
		+ "calls: 2, ev.data: prop: ZIP, eventArgs: oldValue: 111 value: newZip, eventArgs.path: ZIP|",
	"$.observe(object, some.deep.path, object2, path, cb) is listening to leaf");

	// ................................ Reset ................................
	reset();

	// ................................ Act ..................................
	$.observable(person1).setProperty({home: home2}); // Swap object higher in path

	// ............................... Assert .................................
	assert.equal("" + (lastEventArgsOldVal === home1) + (lastEventArgsVal === home2) + result, "truetruecalls: 1, ev.data: prop: home, path: address^street,"
		+ " eventArgs: oldValue: {\"address\":{\"street\":\"newValue\",\"ZIP\":\"newZip\"}} value: {\"address\":{\"street\":\"StreetTwo\",\"ZIP\":\"222\"}}, eventArgs.path: home|",
	"$.observe(object, some.deep.path, object2, path, cb) is listening to root");

	// ................................ Reset ................................
	reset();

	// ................................ Act ..................................
	$.observable(address1).setProperty({street: "newValue2", ZIP: "newZip2"});

	// ............................... Assert .................................
	assert.equal(result, "calls: 1, ev.data: prop: ZIP, eventArgs: oldValue: newZip value: newZip2, eventArgs.path: ZIP|",
	"$.observe(object, 'home.address.street', object2, 'ZIP', cb) after swapping higher up on deep path, is no longer listening to original leaf on that path - 'i.e. 'street', but is listening to other paths as before - 'i.e. 'ZIP'");

	// ................................ Reset ................................
	$.observable(address1).setProperty({street: "Street1", ZIP: "111"}); // reset Prop
	reset();

	// ................................ Act ..................................
	$.observable(address2).setProperty({street: "newValue2", ZIP: "newZip2"});

	// ............................... Assert .................................
	assert.equal(result, "calls: 1, ev.data: prop: street, eventArgs: oldValue: StreetTwo value: newValue2, eventArgs.path: street|",
	"$.observe(object, 'home.address.street', object2, 'ZIP', cb) after swapping higher up on deep path, is now listening to leaf on new descendant objects - 'i.e. 'street' on 'address2'");

	// ................................ Act ..................................
	$.observable(person1).setProperty("home", null); // Set object higher up on path to null
	$.observable(person1).setProperty("home", home1); // Set object higher up to different object
	reset();

	$.observable(address2).setProperty({street: "newValue2", ZIP: "newZip2"});
	$.observable(address1).setProperty({street: "newValue3", ZIP: "newZip3"});

	// ............................... Assert .................................

	assert.equal(result, "calls: 1, ev.data: prop: street, eventArgs: oldValue: Street1 value: newValue3, eventArgs.path: street|"
		+ "calls: 2, ev.data: prop: ZIP, eventArgs: oldValue: 111 value: newZip3, eventArgs.path: ZIP|",
	"$.observe(object, 'home.address.street', object2, 'ZIP', cb) after setting object to null, higher up on deep path, then setting to new object, is no longer listening to that path on original descendant objects but is now listening to the path on new descendant objects");

	// ................................ Reset ................................
	reset();

	// ................................ Act ..................................
	$.observable(person1).setProperty("home", home2); // Set object higher up to different object
	$.observable(home1).setProperty("address", {street: "ignoreThisStreet", ZIP: "ignoreZip"});
	$.observable(home2).setProperty("address", {street: "address3Street", ZIP: "address3Zip"});

	// ............................... Assert .................................
	assert.equal(result,
			"calls: 1, ev.data: prop: home, path: address^street, eventArgs: oldValue: {\"address\":{\"street\":\"newValue3\",\"ZIP\":\"newZip3\"}} value: {\"address\":{\"street\":\"newValue2\",\"ZIP\":\"newZip2\"}}, eventArgs.path: home|"
		+ "calls: 2, ev.data: prop: address, path: street, eventArgs: oldValue: {\"street\":\"newValue2\",\"ZIP\":\"newZip2\"} value: {\"street\":\"address3Street\",\"ZIP\":\"address3Zip\"}, eventArgs.path: address|",
	"$.observe(object, 'home.address.street', object2, 'ZIP', cb) after swapping higher up on deep path, is listening to intermediate paths on new object - 'i.e. 'address'");

	// ................................ Reset ................................
	reset();

	// ................................ Act ..................................
	$.unobserve(person1, "home^address.street", originalAddress, "ZIP", myListener);

	// ............................... Assert .................................
	assert.ok(!$._data(person1).events && !$._data(person1.home.address).events,
	"$.unobserve(object, 'home.address.street', object2, 'ZIP', cb) removes the current listeners from that path");

	// ................................ Reset ................................
	reset();

	$.observe(person1, "home^address.street", person1.home.address, "ZIP", "ZIP", "foo", myListener);
	$.observe(person1.home.address, "street", function() {});

	// ............................... Assert .................................
	assert.equal("" + $._data(person1.home.address).events.propertyChange.length + " "
	+ $._data(person1.home).events.propertyChange.length + " "
	+ $._data(person1).events.propertyChange.length, "4 1 1",
	"Avoid duplicate handlers");

	// ................................ Act ..................................
	$.unobserve(person1, "home^address.ZIP");

	// ............................... Assert .................................
	assert.equal("" + $._data(person1.home.address).events.propertyChange.length + " "
	+ !$._data(person1.home).events + " "
	+ !$._data(person1).events, "3 true true",
	"unobserve(object, paths) - with no callback specified: Remove handlers only for selected properties");

	// ................................ Act ..................................
	$.unobserve(person1.home.address, "*", myListener);

	// ............................... Assert .................................
	assert.equal("" + $._data(person1.home.address).events.propertyChange.length, "1",
	'unobserve(object, "*", myListener) removes all handlers on this object for any props, for this callback');

	// ................................ Act ..................................
	$.unobserve(person1.home.address, "*");

	// ............................... Assert .................................
	assert.ok(!$._data(person1.home.address).events,
	'unobserve(object, "*") removes all handlers on this object for any props, for any callback');

	// ................................ Reset ................................
	reset();

	// =============================== Arrange ===============================

	// ................................ Act ..................................
	$.observe(person1.home.address, "*", "ZIP", myListener);

	// ............................... Assert .................................
	assert.equal("" + $._data(person1.home.address).events.propertyChange.length, "1",
	'Add a listener for "*" - avoids duplicates');

	// ................................ Act ..................................
	$.observable(person1.home.address).setProperty({street: "newValue4", ZIP: "newZip4"});

	// ............................... Assert .................................

	assert.equal(result, "calls: 1, ev.data: prop: *, eventArgs: oldValue: address3Street value: newValue4, eventArgs.path: street|"
							+ "calls: 2, ev.data: prop: *, eventArgs: oldValue: address3Zip value: newZip4, eventArgs.path: ZIP|",
	'listen to both "*" and specific prop. Note: Eliminates duplicates for specific props when there is also a "*"');

	// ................................ Reset ................................
	$.unobserve(person1.home.address, "*");
	address1.street = "StreetOne"; // reset Prop
	address1.ZIP = "111"; // reset Prop
	address2.street = "StreetTwo"; // reset Prop
	home1 = {address: address1};
	home2 = {address: address2};
	person1.home = home1;
	reset();

	// =============================== Arrange ===============================
	// ................................ Act ..................................
	$.observe(person1, "work^address.street", myListener);
	$.observable(person1).setProperty({work: home2});
	$.observable(address2).setProperty({street: "newAddress2"});

	// ............................... Assert .................................
	assert.equal(result,
			"calls: 1, ev.data: prop: work, path: address^street, eventArgs: oldValue: undefined value: {\"address\":{\"street\":\"StreetTwo\",\"ZIP\":\"newZip2\"}}, eventArgs.path: work|"
		+ "calls: 2, ev.data: prop: street, eventArgs: oldValue: StreetTwo value: newAddress2, eventArgs.path: street|",
	'observing a deep path into missing properties, followed by $.observable(...).setProperty calls which supply the missing object property then modify subobjects deeper down the path lead to the correct callback events');

	// ................................ Reset ................................
	$.unobserve(person1, "work^address.street");
	address2.street = "StreetTwo"; // reset Prop
	delete person1.work; // reset Prop
	reset();

	// =============================== Arrange ===============================

	// ................................ Act ..................................
	$.unobserve(person1.home.address, "*");

	// ............................... Assert .................................
	assert.ok(!$._data(person1.home.address).events,
	'unobserve(object, "*") removes all handlers on this object for any props, both "*" and specific props, for any callback');

	// ................................ Act ..................................
	$.observe(person1, "fullName", myListener);

	// ............................... Assert .................................
	assert.equal("" + $._data(person1).events.propertyChange.length, "3",
	'Add a listener for computed property');

	// ................................ Act ..................................
	$.observable(person1).setProperty({firstName: "newFirst", lastName: "newLast"});
	$.observable(settings).setProperty({title: "Sir"});

	// ............................... Assert .................................
	assert.equal(result, "calls: 1, ev.data: prop: firstName, eventArgs: oldValue: Mr Jo value: Mr newFirst, eventArgs.path: firstName|"
				+ "calls: 2, ev.data: prop: lastName, eventArgs: oldValue: One value: newLast, eventArgs.path: lastName|"
				+ "calls: 3, ev.data: prop: title, eventArgs: oldValue: Mr value: Sir, eventArgs.path: title|",
	'listen to changes in dependent props for a computed');

	// ................................ Reset ................................
	person1._firstName = "Jo";
	person1.lastName = "One";
	settings.title = "Sir";
	reset();

	// =============================== Arrange ===============================
	listeners = "Before: "
	+ $._data(model.person1).events.propertyChange.length;

	// ................................ Act ..................................
	$.unobserve(person1, "fullName", myListener);

	// ............................... Assert .................................
	assert.equal(listeners + ". After: "
		+ !$._data(model.person1).events, "Before: 3. After: true",
	'unobserve(object, "computed", cb) removes handlers');

	// ................................ Act ..................................
	$.observe(model, "person1^fullName", myListener);

	// ............................... Assert .................................
	assert.equal("" + $._data(person1).events.propertyChange.length, "3",
	'Add a listener for computed property on a deep path');

	// ................................ Act ..................................
	$.observable(person1).setProperty({firstName: "newFirst", lastName: "newLast"});

	// ............................... Assert .................................

	assert.equal(result, "calls: 1, ev.data: prop: firstName, eventArgs: oldValue: Sir Jo value: Sir newFirst, eventArgs.path: firstName|"
				+ "calls: 2, ev.data: prop: lastName, eventArgs: oldValue: One value: newLast, eventArgs.path: lastName|",
	'listen to changes in dependent props for a computed');

	// ................................ Reset ................................
	person1._firstName = "Jo";
	person1.lastName = "One";
	reset();

	// =============================== Arrange ===============================
	listeners = "Before: "
	+ $._data(model).events.propertyChange.length + " "
	+ $._data(model.person1).events.propertyChange.length;

	// ................................ Act ..................................
	$.unobserve(model, "person1^fullName", myListener);

	// ............................... Assert .................................
	assert.equal(listeners + ". After: "
		+ !$._data(model).events + " "
		+ !$._data(model.person1).events, "Before: 1 3. After: true true",
	'unobserve(object, "computed", cb) removes handlers');

	// ................................ Act ..................................
	$.observe(model, "person1^fullName", "person1^firstName", "person1^lastName", "person1^firstName", myListener);

	// ............................... Assert .................................
	assert.equal("" + $._data(person1).events.propertyChange.length, "3",
	'Add a listener for computed property on deep path plus redundant computed dependency plus redundant computed prop.');

	// ................................ Act ..................................
	$.observable(person1).setProperty({firstName: "newFirst", lastName: "newLast"});

	// ............................... Assert .................................
	assert.equal(result, "calls: 1, ev.data: prop: firstName, eventArgs: oldValue: Sir Jo value: Sir newFirst, eventArgs.path: firstName|"
		+ "calls: 2, ev.data: prop: lastName, eventArgs: oldValue: One value: newLast, eventArgs.path: lastName|",
	'listen to changes in dependent props for a computed. (Note: We avoid duplicate handlers)');

	// ................................ Reset ................................
	person1._firstName = "Jo";
	person1.lastName = "One";
	reset();

	// =============================== Arrange ===============================
	listeners = "Before: "
	+ $._data(settings).events.propertyChange.length + " "
	+ $._data(model).events.propertyChange.length + " "
	+ $._data(model.person1).events.propertyChange.length;

	// ................................ Act ..................................
	$.unobserve(model, "person1^fullName", myListener);

	// ............................... Assert .................................
	assert.equal(listeners + ". After: "
		+ !$._data(settings).events + " "
		+ !$._data(model).events + " "
		+ !$._data(model.person1).events, "Before: 1 1 3. After: true true true",
	'unobserve(object, "computed", cb) removes handlers');

	// =============================== Arrange ===============================
	$.observe(model, "person1", "person2", "person1.*", "person1.home.address^street", "person1^home.address.ZIP", "person1.home^address.*", myListener);

	listeners = $._data(model).events.propertyChange.length + " "
	+ $._data(model.person1).events.propertyChange.length + " "
	+ $._data(model.person1.home).events.propertyChange.length + " "
	+ $._data(model.person1.home.address).events.propertyChange.length;

	assert.equal(listeners, "2 1 1 1", 'No duplicate handlers for $.observe(model, "person1", "person2", "person1.*", "person1.home.address^street", "person1^home.address.ZIP", "person1.home^address.*", cb)');

	// ................................ Act ..................................
	$.unobserve(model, "person1", "person2", "person1.*", "person1.home.address^street", "person1^home.address.ZIP", "person1.home^address.*", myListener);

	// ............................... Assert .................................
	assert.equal(!$._data(model).events + " "
		+ !$._data(model.person1).events + " "
		+ !$._data(model.person1.home).events + " "
		+ !$._data(model.person1.home.address).events, "true true true true",
	'$.unobserve(model, "person1", "person2", "person1.*", "person1.home.address^street", "person1^home.address.ZIP", "person1.home^address.*", cb) removes all handlers');

	// =============================== Arrange ===============================

	// ................................ Act ..................................
	$.observe(model, "person1^fullName", "person1.home.address.*", myListener);

	$.unobserve(model);

	handlersCount = !$._data(model).events + " " + $._data(model.person1).events.propertyChange.length + " " + $._data(model.person1.home.address).events.propertyChange.length;

	$.unobserve(person1);

	// ............................... Assert .................................
	assert.equal(handlersCount + "|" + !$._data(model).events + " " + !$._data(model.person1).events + " " + $._data(model.person1.home.address).events.propertyChange.length,
		"true 3 1|true true 1",
	'unobserve(object) removes all observe handlers from object, but does not remove handlers on paths on descendant objects');

	// =============================== Arrange ===============================

	// ................................ Act ..................................
	$.observe(model, "person1^fullName", "person1.address.*", myListener);
	$.observe(model, "person1^fullName", "person1.home.address.street", "person1.home.address.*", myListener);

	handlersCount = $._data(model).events.propertyChange.length + " " + $._data(model.person1).events.propertyChange.length + " " + $._data(model.person1.home.address).events.propertyChange.length;

	$.observe(model, "person1^fullName", function() {});

	handlersCount += "|" + $._data(model).events.propertyChange.length + " " + $._data(model.person1).events.propertyChange.length + " " + $._data(model.person1.home.address).events.propertyChange.length;

	$.unobserve(model, myListener);

	handlersCount += "|" + $._data(model).events.propertyChange.length + " " + $._data(model.person1).events.propertyChange.length + " " + $._data(model.person1.home.address).events.propertyChange.length;

	$.unobserve(person1, myListener);

	handlersCount += "|" + $._data(model).events.propertyChange.length + " " + $._data(model.person1).events.propertyChange.length + " " + $._data(model.person1.home.address).events.propertyChange.length;

	$.unobserve(model, "*", person1, "*");
	$.unobserve(model.person1.home.address);
	$.unobserve(model.person1.home);
	$.unobserve(settings);

	// ............................... Assert .................................
	assert.equal("" + handlersCount + " " + !$._data(model).events + " " + !$._data(model.person1).events + " " + !$._data(model.person1.home.address).events, "1 4 1|2 7 1|1 7 1|1 3 1 true true true",
	'unobserve(object) removes all observe handlers from object, but does not remove handlers on paths on descendant objects');

	// =============================== Arrange ===============================

	// ................................ Act ..................................
	$.observe(person1, "fullName", myListener);
	$.observe(settings, "*", myListener);
	handlersCount = $._data(person1).events.propertyChange.length + $._data(settings).events.propertyChange.length;

	$.unobserve(person1, "*", settings, "*");

	// ............................... Assert .................................
	assert.equal("" + handlersCount + " " + !$._data(person1).events + " " + !$._data(settings).events, "4 true true",
	'unobserve(object1, "*", object2, "*") removes all observe handlers from objects');

	// =============================== Arrange ===============================

	// ................................ Act ..................................
	$.observe(settings, "onFoo", myListener);
	$.observable(settings).setProperty("onFoo", function onfoonew() {return; });
	$.unobserve(settings);

	// ............................... Assert .................................
	assert.equal(!$._data(settings).events && result, "calls: 1, ev.data: prop: onFoo, eventArgs: oldValue: function onFoo1()  value: function onfoonew() , eventArgs.path: onFoo|",
	'Can observe properties of type function');

	// ................................ Reset ................................
	settings.onFoo = "Jo";
	person1.lastName = "One";
	reset();
	result = "";

});

QUnit.test("observe context helper", function(assert) {

	// =============================== Arrange ===============================
	var str = "aa",
		main = {
			title: "foo"
		},
		obj = {
			name: "One"
		};

	function observeCtxHelper(val, currentRoot) {
		if (val) {
			if (val.charAt(0) === "%") {
				return [obj, val.slice(1)];
			}
		}
	}

	// ................................ Act ..................................
	$.observe(main, "title", "%name", myListener, observeCtxHelper);
	$.observable(main).setProperty({title: "newTitle"});
	$.observable(obj).setProperty({name: "newName"});

	// ............................... Assert .................................
	assert.equal(result, "calls: 1, ev.data: prop: title, eventArgs: oldValue: foo value: newTitle, eventArgs.path: title|"
							+ "calls: 2, ev.data: prop: name, eventArgs: oldValue: One value: newName, eventArgs.path: name|",
	"$.observe(object, path, cb, observeCtxHelper) uses observeCtxHelper correctly to substitute objects and paths");

	// ................................ Act ..................................
	handlersCount = $._data(obj).events.propertyChange.length;
	$.unobserve({}, "%name", myListener, observeCtxHelper);

	// ................................ Reset ................................
	obj.name = "One";

	// ............................... Assert .................................
	assert.ok(handlersCount === 1 && !$._data(obj).events,
	"$.unobserve(object, path, cb, observeCtxHelper) uses observeCtxHelper correctly to substitute objects and paths and unobserve from mapped <objects,paths>");
	reset();

	$.unobserve(main, "title", "%name", myListener, observeCtxHelper);

	// =============================== Arrange ===============================
	// ................................ Act ..................................
	$.observe(str, myListener);
	$.observable(obj).setProperty({name: "newName"});

	// ............................... Assert .................................
	assert.equal(result, "",
	"$.observe(path, cb): Observe with no root object and no observeCtxHelper does nothing");

	// ................................ Reset ................................
	obj.name = "One";

	// =============================== Arrange ===============================
	// ................................ Act ..................................
	$.observe(str, myListener, observeCtxHelper);
	$.observable(obj).setProperty({name: "newName"});

	// ............................... Assert .................................
	assert.equal(result, "",
	"$.observe(path, cb): Observe with no root object and with observeCtxHelper does nothing");

	// ................................ Reset ................................
	obj.name = "One";

	// =============================== Arrange ===============================
	// ................................ Act ..................................
	$.observe(null, "%name", myListener, observeCtxHelper);
	$.observable(obj).setProperty({name: "newName"});

	// ............................... Assert .................................
	assert.equal(result, "calls: 1, ev.data: prop: name, eventArgs: oldValue: One value: newName, eventArgs.path: name|",
	"$.observe(null, path, cb, observeCtxHelper) observe with null as root object can use observeCtxHelper to substitute objects and paths. Correctly observes object(s) mapped by observeCtxHelper");

	// ................................ Act ..................................
	handlersCount = $._data(obj).events.propertyChange.length;
	$.unobserve(null, "%name", myListener, observeCtxHelper);

	// ............................... Assert .................................
	assert.ok(handlersCount === 1 && !$._data(obj).events,
	"$.unobserve(null, path, cb, observeCtxHelper) uses observeCtxHelper correctly to substitute objects and paths and unobserve from mapped <objects,paths>");
	reset();

	// ................................ Reset ................................
	obj.name = "One";

	// =============================== Arrange ===============================
	// ................................ Act ..................................
	$.observe(undefined, "%name", myListener, observeCtxHelper);
	$.observable(obj).setProperty({name: "newName"});

	// ............................... Assert .................................
	assert.equal(result, "calls: 1, ev.data: prop: name, eventArgs: oldValue: One value: newName, eventArgs.path: name|",
	"$.observe(undefined, path, cb, observeCtxHelper) observe with undefined root object can use observeCtxHelper to substitute objects and paths. Correctly observes object(s) mapped by observeCtxHelper");

	// ................................ Act ..................................
	handlersCount = $._data(obj).events.propertyChange.length;
	$.unobserve(undefined, "%name", myListener, observeCtxHelper);

	// ............................... Assert .................................
	assert.ok(handlersCount === 1 && !$._data(obj).events,
	"$.unobserve(undefined, path, cb, observeCtxHelper) uses observeCtxHelper correctly to substitute objects and paths and unobserve from mapped <objects,paths>");
	reset();

	// ................................ Reset ................................
	obj.name = "One";

	// =============================== Arrange ===============================
	// ................................ Act ..................................
	$.observe(undefined, str, myListener, observeCtxHelper);
	$.observable(obj).setProperty({name: "newName"});

	// ............................... Assert .................................
	assert.equal(result, "",
	"$.observe(path, cb, observeCtxHelper) observe with no root object can use observeCtxHelper to substitute objects and paths. If no object is mapped by observeCtxHelper, does nothing");

	// ................................ Reset ................................
	obj.name = "One";

	// =============================== Arrange ===============================
	// ................................ Act ..................................
	$.observe(null, myListener, observeCtxHelper);
	$.observe(0, myListener, observeCtxHelper);
	$.observe(false, myListener, observeCtxHelper);
	$.observe(true, myListener, observeCtxHelper);
	$.observe(2, myListener, observeCtxHelper);

	$.observe(null, str, myListener, observeCtxHelper);
	$.observe(0, str, myListener, observeCtxHelper);
	$.observe(false, str, myListener, observeCtxHelper);
	$.observe(true, str, myListener, observeCtxHelper);
	$.observe(2, str, myListener, observeCtxHelper);

	$.observable(obj).setProperty({name: "newName"});

	// ............................... Assert .................................
	assert.equal(result, "",
	"$.observe(foo, path, ...): When first parameter foo is not a string or object, it is skipped");

	// ................................ Reset ................................
	obj.name = "One";

	// =============================== Arrange ===============================
	// ................................ Act ..................................
	$.observe(true, "%name", myListener, observeCtxHelper);
	$.observable(obj).setProperty({name: "newName"});

	// ............................... Assert .................................
	assert.equal(result, "calls: 1, ev.data: prop: name, eventArgs: oldValue: One value: newName, eventArgs.path: name|",
	"$.observe(foo, path, ...): When first parameter foo is not a string or object, it is skipped");

	// ................................ Act ..................................
	handlersCount = $._data(obj).events.propertyChange.length;
	$.unobserve(true, "%name", myListener, observeCtxHelper);

	// ............................... Assert .................................
	assert.ok(handlersCount === 1 && !$._data(obj).events,
	"$.unobserve(foo, path, ...): When first parameter foo is not a string or object, it is skipped");
	reset();

	// ................................ Reset ................................
	obj.name = "One";

	// =============================== Arrange ===============================
	// ................................ Act ..................................
	$.observe(false, "%name", myListener, observeCtxHelper);
	$.observable(obj).setProperty({name: "newName"});

	// ............................... Assert .................................
	assert.equal(result, "calls: 1, ev.data: prop: name, eventArgs: oldValue: One value: newName, eventArgs.path: name|",
	"$.observe(foo, path, ...): When first parameter foo is not a string or object, it is skipped");

	// ................................ Act ..................................
	handlersCount = $._data(obj).events.propertyChange.length;
	$.unobserve(false, "%name", myListener, observeCtxHelper);

	// ............................... Assert .................................
	assert.ok(handlersCount === 1 && !$._data(obj).events,
	"$.unobserve(foo, path, ...): When first parameter foo is not a string or object, it is skipped");
	reset();

	// ................................ Reset ................................
	obj.name = "One";

	//TODO test case for observe(domElement, "a.b.c", callback) should not bind at all
});

QUnit.test("dataMap", function(assert) {
	// =============================== Arrange ===============================
	var sortMap = $.views.map(function(rows, options) {
		rows = rows.slice(); // Copy rows, then sort if sortby is provided in options
		if (options && options.sortby) {
			rows = rows.slice().sort(function(a, b) {
				return a[options.sortby].toLowerCase().localeCompare(b[options.sortby].toLowerCase());
			});
		}
		return rows; // return copied sorted rows.
	});

	var data = {
		options: {
			sortby: "name",
			page: 1,
			pageLength: 1
		},
		cols: [
			{
				field: "id",
				label: "Id",
				show: true
			},
			{
				field: "name",
				label: "Name",
				show: true
			},
			{
				field: "role",
				label: "Role",
				show: false
			}
		],
		newRow: {
			name: "",
			role: ""
		},
		rows: [
			{
				id: "id1",
				name: "Jeff",
				role: "Goalie"
			},
			{
				id: "id2",
				name: "Ariel",
				role: "Consultant"
			},
			{
				id: "id3",
				name: "Pete",
				role: "Assistant"
			}
		]
	};

	function getConcatenatedFields(array, field) {
		return $.map(array, function(item) {
			return item[field];
		}).join(",");
	}

	function viewSrcTgt(map, field) {
		return getConcatenatedFields(map.src, field) + "|" + getConcatenatedFields(map.tgt, field).toUpperCase();
	}

	// ................................ Act ..................................
	var map1 = sortMap.map(data.rows, {sortby: "name"});

	// ............................... Assert .................................
	assert.equal(viewSrcTgt(map1, "name"), "Jeff,Ariel,Pete|ARIEL,JEFF,PETE",
		'map = sortMap.map(data.rows, {sortby: "name"}) creates a map with sorted target');

	// ............................... Assert .................................
	assert.equal(map1.options.sortby, "name",
		'map.options is the initial options passed to .map(source, options)');

	// ............................... Assert .................................
	assert.ok(map1.src === data.rows,
		'map.src is the source');

	// ................................ Act ..................................
	map1.update({sortby: "role"});

	// ............................... Assert .................................
	assert.equal(viewSrcTgt(map1, "role"), "Goalie,Consultant,Assistant|ASSISTANT,CONSULTANT,GOALIE",
		'map.update({sortby: "role"}) re-sorts target');

	// ............................... Assert .................................
	assert.equal(map1.options.sortby, "role",
		'map.options is the current options - as passed to .update(options)');

	// ................................ Act ..................................
	$.observable(data.rows).insert({
		id: "new",
		name: "Mary",
		role: "Broker"
	});

	// ............................... Assert .................................
	assert.equal(viewSrcTgt(map1, "role"), "Goalie,Consultant,Assistant,Broker|ASSISTANT,CONSULTANT,GOALIE",
		'If map has no obsSrc method, target does not update observably');

	// ................................ Act ..................................
	map1.update({sortby: "role"});

	// ............................... Assert .................................
	assert.equal(viewSrcTgt(map1, "role"), "Goalie,Consultant,Assistant,Broker|ASSISTANT,BROKER,CONSULTANT,GOALIE",
		'map.update({sortby: "role"}) re-sorts target based on current source');

	// ................................ Act ..................................
	var myTarget = [1,2,3],
		map2 = sortMap.map(data.rows, {sortby: "name"}, myTarget);

	// ............................... Assert .................................
	assert.ok(map2.tgt===myTarget,
		'sortMap.map(data.rows, {sortby: "name"}, myTarget) - can provide existing target array to a new map');

	// ............................... Assert .................................
	assert.equal(viewSrcTgt(map2, "name"), "Jeff,Ariel,Pete,Mary|ARIEL,JEFF,MARY,PETE",
		'sortMap.map(data.rows, {sortby: "name"}, myTarget) replaces contents of myTarget array with sorted copy of source array');

	// ................................ Act ..................................
	$.observable(data.rows).remove();

	// ............................... Assert .................................
	assert.equal(viewSrcTgt(map1, "role") + "/" + viewSrcTgt(map2, "name"),
		"Goalie,Consultant,Assistant|ASSISTANT,BROKER,CONSULTANT,GOALIE/Jeff,Ariel,Pete|ARIEL,JEFF,MARY,PETE",
		'If map has no obsSrc method, target does not update observably');

	map1.update();

	// ............................... Assert .................................
	assert.equal(viewSrcTgt(map1, "role") + "/" + viewSrcTgt(map2, "name"),
		"Goalie,Consultant,Assistant|ASSISTANT,CONSULTANT,GOALIE/Jeff,Ariel,Pete|ARIEL,JEFF,MARY,PETE",
		'map.update() will update target to current source using current options (sortby is now "role")');

	// ............................... Assert .................................
	assert.equal(map1.options.sortby, "role",
		'map.options is still the current options - as passed previously to .map(source, options) or .update(options)');

	var tgt = map1.tgt;

	// ................................ Act ..................................
	map1.unmap();

	// ............................... Assert .................................
	assert.ok(map1.src === undefined, 'map.unmap() removes src');

	// ................................ Act ..................................
	map1.map(data.rows, {sortby: "id"}, tgt);

	// ............................... Assert .................................
	assert.equal(viewSrcTgt(map1, "id"), "id1,id2,id3|ID1,ID2,ID3",
		'map.map(source, options, target) will remap to chosen source, options, and target');

	// ................................ Act ..................................
	map1.map(data.rows, {sortby: "name"});

	after = (map1.tgt === tgt);

	// ............................... Assert .................................
	assert.equal(viewSrcTgt(map1, "name") + " " + after, "Jeff,Ariel,Pete|ARIEL,JEFF,PETE true",
		'map.map(source, options) will remap to chosen source and options, and keep target');

	// ................................ Act ..................................
	var otherRows = [
			{
				id: "idOther1",
				name: "OtherGuy",
				role: "OtherRole"
			},
			{
				id: "idOther2",
				name: "Abel",
				role: "Actor"
			}
		];

	tgt = map1.tgt;

	map1.map(otherRows);

	after = (tgt === map1.tgt);

	// ............................... Assert .................................
	assert.equal(viewSrcTgt(map1, "name") + " " + after, "OtherGuy,Abel|ABEL,OTHERGUY true",
		'map.map(newSource) will remap new source, using current options and target');

	// ................................ Act ..................................
	map1.unmap();
	map2.unmap();

	// =============================== Arrange ===============================

	var observableSortMap = $.views.map({
		baseMap: sortMap,
		obsSrc: function(map, ev, eventArgs) {
			var i, l, item, items,
				target = map.tgt;
			switch (eventArgs.change) {
			case "remove":
				items = eventArgs.items;
				for (i=0, l=items.length; i<l; i++) {
					item = items[i];
					var index = $.inArray(item, target);
					if (index > -1) {
						$.observable(target).remove(index); // Remove corresponding target. No need to resort
					}
				}
				break;
			case "insert":
				map.update(); // Need not only to insert in target, but to sort result - so simply call update
			}
		}
	});

	// ................................ Act ..................................
	var map1 = observableSortMap.map(data.rows, {sortby: "name"});

	// ............................... Assert .................................
	assert.equal(viewSrcTgt(map1, "name"), "Jeff,Ariel,Pete|ARIEL,JEFF,PETE",
		'map = observableSortMap.map(data.rows, {sortby: "name"}) creates a map with sorted target');

	// ............................... Assert .................................
	assert.equal(map1.options.sortby, "name",
		'map.options is the initial options passed to .map(source, options)');

	// ............................... Assert .................................
	assert.ok(map1.src === data.rows,
		'map.src is the source');

	// ................................ Act ..................................
	map1.update({sortby: "role"});

	// ............................... Assert .................................
	assert.equal(viewSrcTgt(map1, "role"), "Goalie,Consultant,Assistant|ASSISTANT,CONSULTANT,GOALIE",
		'map.update({sortby: "role"}) re-sorts target');

	// ............................... Assert .................................
	assert.equal(map1.options.sortby, "role",
		'map.options is the current options - as passed to .update(options)');

	// ................................ Act ..................................
	$.observable(data.rows).insert({
		id: "new",
		name: "Mary",
		role: "Broker"
	});

	// ............................... Assert .................................
	assert.equal(viewSrcTgt(map1, "role"), "Goalie,Consultant,Assistant,Broker|ASSISTANT,BROKER,CONSULTANT,GOALIE",
		'If map has an obsSrc method, observable changes to source trigger observable target updates too');

	// ................................ Act ..................................
	map1.update({sortby: "role"});

	// ............................... Assert .................................
	assert.equal(viewSrcTgt(map1, "role"), "Goalie,Consultant,Assistant,Broker|ASSISTANT,BROKER,CONSULTANT,GOALIE",
		'map.update({sortby: "role"}) re-sorts target based on current source');

	// ................................ Act ..................................
	myTarget = [1,2,3];
	map2 = observableSortMap.map(data.rows, {sortby: "name"}, myTarget);

	// ............................... Assert .................................
	assert.ok(map2.tgt===myTarget,
		'observableSortMap.map(data.rows, {sortby: "name"}, myTarget) - can provide existing target array to a new map');

	// ............................... Assert .................................
	assert.equal(viewSrcTgt(map2, "name"), "Jeff,Ariel,Pete,Mary|ARIEL,JEFF,MARY,PETE",
		'observableSortMap.map(data.rows, {sortby: "name"}, myTarget) replaces contents of myTarget array with sorted copy of source array');

	// ................................ Act ..................................
	$.observable(data.rows).remove(2, 2);

	// ............................... Assert .................................
	assert.equal(viewSrcTgt(map1, "role") + "/" + viewSrcTgt(map2, "name"),
		"Goalie,Consultant|CONSULTANT,GOALIE/Jeff,Ariel|ARIEL,JEFF",
		'If map has an obsSrc method, observable changes to source trigger observable target updates too');

	// ................................ Act ..................................
	data.rows.splice(1, 0, {
		id: "inserted",
		name: "Amadeus",
		role: "Musician"
	});
	map1.update();

	// ............................... Assert .................................
	assert.equal(viewSrcTgt(map1, "role"),
		"Goalie,Musician,Consultant|CONSULTANT,GOALIE,MUSICIAN",
		'map.update() will update target to current source using current options (sortby is now "role")');

	// ................................ Act ..................................
	var before = viewSrcTgt(map2, "name");

	map2.update();

	// ............................... Assert .................................
	assert.equal(before + "/" + viewSrcTgt(map2, "name"),
		"Jeff,Amadeus,Ariel|ARIEL,JEFF/Jeff,Amadeus,Ariel|AMADEUS,ARIEL,JEFF",
		'map2.update() will update target to current source using current options (sortby is now "name")');

	// ............................... Assert .................................
	assert.equal(map1.options.sortby, "role",
		'map.options is still the current options - as passed previously to .map(source, options) or .update(options)');

	tgt = map1.tgt;
	before = $._data(data.rows).events.arrayChange.length + "-" + ($._data(map1.tgt).events === undefined);

	// ................................ Act ..................................
	map1.unmap();

	after = $._data(data.rows).events.arrayChange.length + "-" + ($._data(map1.tgt).events === undefined);

	// ............................... Assert .................................
	assert.ok(map1.src === undefined,
		'map.unmap() removes src');

	// ............................... Assert .................................
	assert.equal(before + "|" + after, "2-true|1-true",
		'map.unmap() removes dataMap observe bindings from src. (Note: map.tgt has no bindings since obsTgt not defined for this dataMap)');

	// ................................ Act ..................................
	map1.map(data.rows, {sortby: "id"}, tgt);

	after = $._data(data.rows).events.arrayChange.length;

	// ............................... Assert .................................
	assert.equal(viewSrcTgt(map1, "id") + " events: " + after, "id1,inserted,id2|ID1,ID2,INSERTED events: 2",
		'map.map(source, options, target) will remap to chosen source, options, and target');

	// ................................ Act ..................................

	map1.map(data.rows, {sortby: "name"});

	after = $._data(data.rows).events.arrayChange.length + "-" + (map1.tgt === tgt);

	// ............................... Assert .................................
	assert.equal(viewSrcTgt(map1, "name") + " events: " + after, "Jeff,Amadeus,Ariel|AMADEUS,ARIEL,JEFF events: 2-true",
		'map.map(source, options) will remap to chosen source and options, keep target - and remove previous bindings');

	// ................................ Act ..................................
	otherRows = [
			{
				id: "idOther1",
				name: "OtherGuy",
				role: "OtherRole"
			},
			{
				id: "idOther2",
				name: "Abel",
				role: "Actor"
			}
		];

	tgt = map1.tgt;

	map1.map(otherRows);

	$.observable(otherRows).insert(1, [
		{
			id: "idOther3",
			name: "Isabel",
			role: "Director"
		},
		{
			id: "idOther4",
			name: "Xavier",
			role: "Cook"
		}
	]);

	// ............................... Assert .................................
	assert.equal(viewSrcTgt(map1, "name") + " " + after, "OtherGuy,Isabel,Xavier,Abel|ABEL,ISABEL,OTHERGUY,XAVIER 2-true",
		'map.map(newSource) will remap new source, using current options and target');

	// ................................ Act ..................................
	map1.unmap();
	map2.unmap();

	// =============================== Arrange ===============================

	var observableSortMap2 = $.views.map({
		baseMap: observableSortMap,
		obsTgt: function(map, ev, eventArgs) {
			var i, l, item, items,
				source = map.src;
			switch (eventArgs.change) {
			case "remove":
				items = eventArgs.items;
				for (i=0, l=items.length; i<l; i++) {
					item = items[i];
					var index = $.inArray(item, source);
					if (index > -1) {
						$.observable(source).remove(index); // Remove corresponding source. No need to resort
					}
				}
				break;
			case "insert":
				$.observable(source).insert(eventArgs.items); // Insert into source
				map.update(); // Re-sort target - by calling update
			}
		}
	});

	// ................................ Act ..................................
	map1 = observableSortMap2.map(data.rows, {sortby: "name"});

	// ............................... Assert .................................
	assert.equal(viewSrcTgt(map1, "name"), "Jeff,Amadeus,Ariel|AMADEUS,ARIEL,JEFF",
		'map = observableSortMap2.map(data.rows, {sortby: "name"}) with obsTgt creates a map with sorted target');

	$.observable(map1.tgt).insert(1, [
		{
			id: "new",
			name: "Mary",
			role: "Broker"
		},
		{
			id: "new2",
			name: "Jane",
			role: "Fixer"
		}
	]);

	assert.equal(viewSrcTgt(map1, "name"), "Jeff,Amadeus,Ariel,Mary,Jane|AMADEUS,ARIEL,JANE,JEFF,MARY",
		'If map has an obsTgt method, observable changes to target trigger observable source updates too');

	$.observable(map1.tgt).remove(1, 2);

	assert.equal(viewSrcTgt(map1, "name"), "Jeff,Amadeus,Mary|AMADEUS,JEFF,MARY",
		'If map has an obsTgt method, observable changes to target trigger observable source updates too');

	map1.unmap();
});

QUnit.test("observeAll", function(assert) {
	reset();

	// =============================== Arrange ===============================
	var inc = 0,
		data = {
			person: {
				name: "Pete",
				address: {
				street: "1st Ave"
				},
				phones: [{number: "111 111 1111"}, {number:"222 222 2222"}]
			}
		};

	$.observable(data).observeAll(observeAllCb1);

	// ................................ Act ..................................
	$.observable(data.person).setProperty({
		name: "Hermione",
		"address.street": "Main St"
	});

	$.observable(data.person).setProperty({
		address: {street: "New Street"},
		phones: [{number:"123 123 1234"}]
	});

	$.observable(data.person.phones[0]).setProperty("foo", 34);

	$.observable(data.person.phones).insert({
		number:"456 456 AAAA"
	});

	$.observable(data.person.phones[1]).setProperty("number", data.person.phones[1].number + inc++);

	$.observable(data.person.phones).remove(0);

	$.observable(data.person.phones[0]).setProperty("number", data.person.phones[0].number + inc++);

	$.observable(data.person.phones).insert({
		number:"456 456 BBBB"
	});

	$.observable(data.person.phones[1]).setProperty("subnum", {a: 11, b: 22});

	$.observable(data.person.phones[1]).setProperty("subnum.a", "a" + inc++);

	$.observable(data.person.phones[1]).removeProperty("subnum.b");

	$.observable(data.person.phones).insert(1, [{number:"456 456 CCCC"}, {number:"456 456 DDDD"}]);

	$.observable(data.person.phones[2]).setProperty("number", data.person.phones[2].number + inc++);

	$.observable(data.person.phones).refresh([{number:"456 456 EEEE"}, {number:"456 456 FFFF"}]);

	$.observable(data.person.phones[1]).setProperty("number", data.person.phones[1].number + inc++);

	$.observable(data.person.phones).remove(0);

	$.observable(data.person.phones[0]).setProperty("number", data.person.phones[0].number + inc++);

// ............................... Assert .................................
	result += "DATA: " + JSON.stringify(data);

	assert.equal(result,
'ObserveAll Path: root.person'
+   ' eventArgs: change: "set"|path: "name"|value: "Hermione"|oldValue: "Pete"|remove: false'

+ '|ObserveAll Path: root.person.address'
+   ' eventArgs: change: "set"|path: "street"|value: "Main St"|oldValue: "1st Ave"|remove: false'

+ '|ObserveAll Path: root.person'
+   ' eventArgs: change: "set"|path: "address"|value: {"street":"New Street"}|oldValue: {"street":"Main St"}|remove: false'

+ '|ObserveAll Path: root.person'
+   ' eventArgs: change: "set"|path: "phones"|value: [{"number":"123 123 1234"}]|oldValue: [{"number":"111 111 1111"},{"number":"222 222 2222"}]|remove: false'

+ '|ObserveAll Path: root.person.phones[0]'
+   ' eventArgs: change: "set"|path: "foo"|value: 34|oldValue: undefined|remove: false'

+ '|ObserveAll Path: root.person.phones'
+   ' eventArgs: change: "insert"|index: 1|items: [{"number":"456 456 AAAA"}]'

+ '|ObserveAll Path: root.person.phones[1]'
+   ' eventArgs: change: "set"|path: "number"|value: "456 456 AAAA0"|oldValue: "456 456 AAAA"|remove: false'

+ '|ObserveAll Path: root.person.phones'
+   ' eventArgs: change: "remove"|index: 0|items: [{"number":"123 123 1234","foo":34}]'

+ '|ObserveAll Path: root.person.phones[0]'
+   ' eventArgs: change: "set"|path: "number"|value: "456 456 AAAA01"|oldValue: "456 456 AAAA0"|remove: false'

+ '|ObserveAll Path: root.person.phones'
+   ' eventArgs: change: "insert"|index: 1|items: [{"number":"456 456 BBBB"}]'

+ '|ObserveAll Path: root.person.phones[1]'
+   ' eventArgs: change: "set"|path: "subnum"|value: {"a":11,"b":22}|oldValue: undefined|remove: false'

+ '|ObserveAll Path: root.person.phones[1].subnum'
+   ' eventArgs: change: "set"|path: "a"|value: "a2"|oldValue: 11|remove: false'

+ '|ObserveAll Path: root.person.phones[1].subnum'
+   ' eventArgs: change: "set"|path: "b"|value: undefined|oldValue: 22|remove: true'

+ '|ObserveAll Path: root.person.phones'
+   ' eventArgs: change: "insert"|index: 1|items: [{"number":"456 456 CCCC"},{"number":"456 456 DDDD"}]'

+ '|ObserveAll Path: root.person.phones[2]'
+   ' eventArgs: change: "set"|path: "number"|value: "456 456 DDDD3"|oldValue: "456 456 DDDD"|remove: false'

+ '|ObserveAll Path: root.person.phones'
+   ' eventArgs: change: "refresh"|oldItems: [{"number":"456 456 AAAA01"},{"number":"456 456 CCCC"},{"number":"456 456 DDDD3"},{"number":"456 456 BBBB","subnum":{"a":"a2"}}]'

+ '|ObserveAll Path: root.person.phones[1]'
+   ' eventArgs: change: "set"|path: "number"|value: "456 456 FFFF4"|oldValue: "456 456 FFFF"|remove: false'

+ '|ObserveAll Path: root.person.phones'
+   ' eventArgs: change: "remove"|index: 0|items: [{"number":"456 456 EEEE"}]'

+ '|ObserveAll Path: root.person.phones[0]'
+   ' eventArgs: change: "set"|path: "number"|value: "456 456 FFFF45"|oldValue: "456 456 FFFF4"|remove: false'

+ '|DATA: {"person":{"name":"Hermione","address":{"street":"New Street"},"phones":[{"number":"456 456 FFFF45"}]}}',

	'observeAll scenarios, with observeAll.path() etc.');

	$.observable(data).unobserveAll();

	reset();

	// =============================== Arrange ===============================
	$.observable(model).observeAll(observeAllCb1);

	// ................................ Act ..................................
	$.observable(model).setProperty({
		"person1.home.address": {
			street: "1st",
			ZIP: "00000"
		},
		"person1.home.address.street": "upper St",
		"person1.home.address.ZIP": "33333",
		things: [{thing: "tree"}]
	});
	$.observable(model.things).insert({thing: "bush"});
	$.observable(model.things).refresh([model.things[1], model.things[0], model.things[1]]);
	$.observable(model.things[2]).setProperty("thing", model.things[2].thing + "+");

	// ............................... Assert .................................
	assert.equal(result,
  'ObserveAll Path: root.person1.home eventArgs: change: "set"|path: "address"|value: {"street":"upper St","ZIP":"33333"}|oldValue: {"street":"StreetOne","ZIP":"111"}|remove: false|'
+ 'ObserveAll Path: root eventArgs: change: "set"|path: "things"|value: [{"thing":"tree"}]|oldValue: []|remove: false|'
+ 'ObserveAll Path: root.things eventArgs: change: "insert"|index: 1|items: [{"thing":"bush"}]|'
+ 'ObserveAll Path: root.things eventArgs: change: "refresh"|oldItems: [{"thing":"tree"},{"thing":"bush\"}]|'
+ 'ObserveAll Path: root.things[0] eventArgs: change: "set"|path: "thing"|value: "bush+"|oldValue: "bush"|remove: false|',
	"observeAll raises correct change events");

	// ............................... Assert .................................
	listeners = $._data(model).events.propertyChange.length + " "
	+ $._data(model.person1).events.propertyChange.length + " "
	+ $._data(model.person1.home).events.propertyChange.length + " "
	+ $._data(model.person1.home.address).events.propertyChange.length + " "
	+ $._data(model.things).events.arrayChange.length + " "
	+ $._data(model.things[0]).events.propertyChange.length + " "
	+ $._data(model.things[1]).events.propertyChange.length;

	assert.equal(listeners, "1 1 1 1 1 1 1", 'observeAll maintains a single event handler binding on every object in the graph, regardless of structural observable changes made');

	// ................................ Act ..................................
	$.observable(model).observeAll(observeAllCb1);

	// ............................... Assert .................................
	listeners = $._data(model).events.propertyChange.length + " "
	+ $._data(model.person1).events.propertyChange.length + " "
	+ $._data(model.person1.home).events.propertyChange.length + " "
	+ $._data(model.person1.home.address).events.propertyChange.length + " "
	+ $._data(model.things).events.arrayChange.length + " "
	+ $._data(model.things[0]).events.propertyChange.length + " "
	+ $._data(model.things[1]).events.propertyChange.length;

	assert.equal(listeners, "1 1 1 1 1 1 1", 'Calling observeAll more than once does not add extra event bindings');

	// ................................ Act ..................................
	$.observable(model).observeAll(observeAllCb3);

	// ............................... Assert .................................
	listeners = $._data(model).events.propertyChange.length + " "
	+ $._data(model.person1).events.propertyChange.length + " "
	+ $._data(model.person1.home).events.propertyChange.length + " "
	+ $._data(model.person1.home.address).events.propertyChange.length + " "
	+ $._data(model.things).events.arrayChange.length + " "
	+ $._data(model.things[0]).events.propertyChange.length + " "
	+ $._data(model.things[1]).events.propertyChange.length;

	assert.equal(listeners, "2 2 2 2 2 2 2", 'Calling observeAll with a different callback adds one binding for the new callback on each object or array');

	// ................................ Act ..................................
	$.observable(model).unobserveAll(observeAllCb1);

	// ............................... Assert .................................
	listeners = $._data(model).events.propertyChange.length + " "
	+ $._data(model.person1).events.propertyChange.length + " "
	+ $._data(model.person1.home).events.propertyChange.length + " "
	+ $._data(model.person1.home.address).events.propertyChange.length + " "
	+ $._data(model.things).events.arrayChange.length + " "
	+ $._data(model.things[0]).events.propertyChange.length + " "
	+ $._data(model.things[1]).events.propertyChange.length;

	assert.equal(listeners, "1 1 1 1 1 1 1", 'Calling unobserveAll(myCallback) removes just my callback bindings');

	// ................................ Act ..................................
	$.observable(model).observeAll(observeAllCb1);

	$.observable(model.things).unobserveAll(observeAllCb1);

	// ............................... Assert .................................
	listeners = $._data(model).events.propertyChange.length + " "
	+ $._data(model.person1).events.propertyChange.length + " "
	+ $._data(model.person1.home).events.propertyChange.length + " "
	+ $._data(model.person1.home.address).events.propertyChange.length + " "
	+ $._data(model.things).events.arrayChange.length + " "
	+ $._data(model.things[0]).events.propertyChange.length + " "
	+ $._data(model.things[1]).events.propertyChange.length;

	assert.equal(listeners, "2 2 2 2 1 1 1", 'Calling $.observable(objectOrArrayInTree).unobserveAll(myCallback) removes just my callback bindings in the subtree only');

	// ................................ Act ..................................
	$.observable(model).unobserveAll();

	// ............................... Assert .................................
	assert.equal(!$._data(model).events + " "
		+ !$._data(model.person1).events + " "
		+ !$._data(model.person1.home).events + " "
		+ !$._data(model.person1.home.address).events + " "
		+ !$._data(model.things).events + " "
		+ !$._data(model.things[0]).events + " "
		+ !$._data(model.things[1]).events,
		"true true true true true true true",
	'unobserveAll() with no callback removes all bindings from the tree');

	// ................................ Act ..................................
	$.observable(model.things).observeAll(observeAllCb2);

	// ............................... Assert .................................
	listeners = $._data(model.things).events.arrayChange.length + " "
	+ $._data(model.things[0]).events.propertyChange.length + " "
	+ $._data(model.things[1]).events.propertyChange.length;

	assert.equal(listeners, "1 1 1", '$.observable(someArray).observeAll(observeAllCb2) works correctly');

	// ................................ Act ..................................
	reset();
	$.observable(model.things).insert({thing: "bush"});
	$.observable(model.things).refresh([model.things[1], model.things[0], model.things[1]]);
	$.observable(model.things[2]).setProperty("thing", model.things[2].thing + "+");
	$.observable(model.things[1]).setProperty("thing", model.things[1].thing + "+");
	$.observable(model.things).remove(2);

	// ............................... Assert .................................
	assert.equal(result,
'ObserveAll Path: root eventArgs: change: insert|index: 3|items: [object Object]|'
+ 'ObserveAll Path: root eventArgs: change: refresh|oldItems: [object Object],[object Object],[object Object],[object Object]|'
+ 'ObserveAll Path: root[0] eventArgs: change: set|path: thing|value: tree+|oldValue: tree|remove: false|'
+ 'ObserveAll Path: root[1] eventArgs: change: set|path: thing|value: bush++|oldValue: bush+|remove: false|'
+ 'ObserveAll Path: root eventArgs: change: remove|index: 2|items: [object Object]|',

	'$.observable(someArray).observeAll(observeAllCb2) raises the correct array change events');

	$.observable(model.things).unobserveAll(observeAllCb2);

	// ............................... Assert .................................
	listeners = "" + !!$._data(model.things).events + " "
	+ !!$._data(model.things[0]).events + " "
	+ !!$._data(model.things[1]).events;

	assert.equal(listeners, "false false false", '$.unobserve(data, "arrayProp.**", observeAllCb2) removes listeners correctly');

	// ................................ Reset ..................................
	model = {
		person1: person1,
		person2: person2,
		things: []
	};
	person1.home.address.street = "StreetOne";
	person1.home.address.ZIP = "111";
});

QUnit.test('observe(... "**" ...)', function(assert) {
	reset();

	// =============================== Arrange ===============================
	var inc = 0,
		data = {
			person: {
				name: "Pete",
				address: {
				street: "1st Ave"
				},
				phones: [{number: "111 111 1111"}, {number:"222 222 2222"}]
			}
		};

	$.observe(data, "**", observeAllCb1);

	// ................................ Act ..................................
	$.observable(data.person).setProperty({
		name: "Hermione",
		"address.street": "Main St"
	});

	$.observable(data.person).setProperty({
		address: {street: "New Street"},
		phones: [{number:"123 123 1234"}]
	});

	$.observable(data.person.phones[0]).setProperty("foo", 34);

	$.observable(data.person.phones).insert({
		number:"456 456 AAAA"
	});

	$.observable(data.person.phones[1]).setProperty("number", data.person.phones[1].number + inc++);

	$.observable(data.person.phones).remove(0);

	$.observable(data.person.phones[0]).setProperty("number", data.person.phones[0].number + inc++);

	$.observable(data.person.phones).insert({
		number:"456 456 BBBB"
	});

	$.observable(data.person.phones[1]).setProperty("subnum", {a: 11, b: 22});

	$.observable(data.person.phones[1]).setProperty("subnum.a", "a" + inc++);

	$.observable(data.person.phones[1]).removeProperty("subnum.b");

	$.observable(data.person.phones).insert(1, [{number:"456 456 CCCC"}, {number:"456 456 DDDD"}]);

	$.observable(data.person.phones[2]).setProperty("number", data.person.phones[2].number + inc++);

	$.observable(data.person.phones).refresh([{number:"456 456 EEEE"}, {number:"456 456 FFFF"}]);

	$.observable(data.person.phones[1]).setProperty("number", data.person.phones[1].number + inc++);

	$.observable(data.person.phones).remove(0);

	$.observable(data.person.phones[0]).setProperty("number", data.person.phones[0].number + inc++);

// ............................... Assert .................................
	result += "DATA: " + JSON.stringify(data);

	assert.equal(result,
'ObserveAll Path: root.person'
+   ' eventArgs: change: "set"|path: "name"|value: "Hermione"|oldValue: "Pete"|remove: false'

+ '|ObserveAll Path: root.person.address'
+   ' eventArgs: change: "set"|path: "street"|value: "Main St"|oldValue: "1st Ave"|remove: false'

+ '|ObserveAll Path: root.person'
+   ' eventArgs: change: "set"|path: "address"|value: {"street":"New Street"}|oldValue: {"street":"Main St"}|remove: false'

+ '|ObserveAll Path: root.person'
+   ' eventArgs: change: "set"|path: "phones"|value: [{"number":"123 123 1234"}]|oldValue: [{"number":"111 111 1111"},{"number":"222 222 2222"}]|remove: false'

+ '|ObserveAll Path: root.person.phones[0]'
+   ' eventArgs: change: "set"|path: "foo"|value: 34|oldValue: undefined|remove: false'

+ '|ObserveAll Path: root.person.phones'
+   ' eventArgs: change: "insert"|index: 1|items: [{"number":"456 456 AAAA"}]'

+ '|ObserveAll Path: root.person.phones[1]'
+   ' eventArgs: change: "set"|path: "number"|value: "456 456 AAAA0"|oldValue: "456 456 AAAA"|remove: false'

+ '|ObserveAll Path: root.person.phones'
+   ' eventArgs: change: "remove"|index: 0|items: [{"number":"123 123 1234","foo":34}]'

+ '|ObserveAll Path: root.person.phones[0]'
+   ' eventArgs: change: "set"|path: "number"|value: "456 456 AAAA01"|oldValue: "456 456 AAAA0"|remove: false'

+ '|ObserveAll Path: root.person.phones'
+   ' eventArgs: change: "insert"|index: 1|items: [{"number":"456 456 BBBB"}]'

+ '|ObserveAll Path: root.person.phones[1]'
+   ' eventArgs: change: "set"|path: "subnum"|value: {"a":11,"b":22}|oldValue: undefined|remove: false'

+ '|ObserveAll Path: root.person.phones[1].subnum'
+   ' eventArgs: change: "set"|path: "a"|value: "a2"|oldValue: 11|remove: false'

+ '|ObserveAll Path: root.person.phones[1].subnum'
+   ' eventArgs: change: "set"|path: "b"|value: undefined|oldValue: 22|remove: true'

+ '|ObserveAll Path: root.person.phones'
+   ' eventArgs: change: "insert"|index: 1|items: [{"number":"456 456 CCCC"},{"number":"456 456 DDDD"}]'

+ '|ObserveAll Path: root.person.phones[2]'
+   ' eventArgs: change: "set"|path: "number"|value: "456 456 DDDD3"|oldValue: "456 456 DDDD"|remove: false'

+ '|ObserveAll Path: root.person.phones'
+   ' eventArgs: change: "refresh"|oldItems: [{"number":"456 456 AAAA01"},{"number":"456 456 CCCC"},{"number":"456 456 DDDD3"},{"number":"456 456 BBBB","subnum":{"a":"a2"}}]'

+ '|ObserveAll Path: root.person.phones[1]'
+   ' eventArgs: change: "set"|path: "number"|value: "456 456 FFFF4"|oldValue: "456 456 FFFF"|remove: false'

+ '|ObserveAll Path: root.person.phones'
+   ' eventArgs: change: "remove"|index: 0|items: [{"number":"456 456 EEEE"}]'

+ '|ObserveAll Path: root.person.phones[0]'
+   ' eventArgs: change: "set"|path: "number"|value: "456 456 FFFF45"|oldValue: "456 456 FFFF4"|remove: false'

+ '|DATA: {"person":{"name":"Hermione","address":{"street":"New Street"},"phones":[{"number":"456 456 FFFF45"}]}}',

	'observeAll scenarios using "**", with observeAll.path() etc.');

	$.unobserve(data, "**");

	reset();

	// =============================== Arrange ===============================
	$.observe(model, "**", observeAllCb1);

	// ................................ Act ..................................
	$.observable(model).setProperty({
		"person1.home.address": {
			street: "1st",
			ZIP: "00000"
		},
		"person1.home.address.street": "upper St",
		"person1.home.address.ZIP": "33333",
		things: [{thing: "tree"}]
	});
	$.observable(model.things).insert({thing: "bush"});
	$.observable(model.things).refresh([model.things[1], model.things[0], model.things[1]]);
	$.observable(model.things[2]).setProperty("thing", model.things[2].thing + "+");

	// ............................... Assert .................................
	assert.equal(result,
  'ObserveAll Path: root.person1.home eventArgs: change: "set"|path: "address"|value: {"street":"upper St","ZIP":"33333"}|oldValue: {"street":"StreetOne","ZIP":"111"}|remove: false|'
+ 'ObserveAll Path: root eventArgs: change: "set"|path: "things"|value: [{"thing":"tree"}]|oldValue: []|remove: false|'
+ 'ObserveAll Path: root.things eventArgs: change: "insert"|index: 1|items: [{"thing":"bush"}]|'
+ 'ObserveAll Path: root.things eventArgs: change: "refresh"|oldItems: [{"thing":"tree"},{"thing":"bush\"}]|'
+ 'ObserveAll Path: root.things[0] eventArgs: change: "set"|path: "thing"|value: "bush+"|oldValue: "bush"|remove: false|',
	'$.observe(data, "**", ...) works as observeAll and raises correct change events');

	// ............................... Assert .................................
	listeners = $._data(model).events.propertyChange.length + " "
	+ $._data(model.person1).events.propertyChange.length + " "
	+ $._data(model.person1.home).events.propertyChange.length + " "
	+ $._data(model.person1.home.address).events.propertyChange.length + " "
	+ $._data(model.things).events.arrayChange.length + " "
	+ $._data(model.things[0]).events.propertyChange.length + " "
	+ $._data(model.things[1]).events.propertyChange.length;

	assert.equal(listeners, "1 1 1 1 1 1 1", '$.observe(data, "**", ...) works as observeAll and maintains a single event handler binding on every object in the graph, regardless of structural observable changes made');

	// ................................ Act ..................................
	$.observe(model, "**", observeAllCb1);

	// ............................... Assert .................................
	listeners = $._data(model).events.propertyChange.length + " "
	+ $._data(model.person1).events.propertyChange.length + " "
	+ $._data(model.person1.home).events.propertyChange.length + " "
	+ $._data(model.person1.home.address).events.propertyChange.length + " "
	+ $._data(model.things).events.arrayChange.length + " "
	+ $._data(model.things[0]).events.propertyChange.length + " "
	+ $._data(model.things[1]).events.propertyChange.length;

	assert.equal(listeners, "1 1 1 1 1 1 1", 'Calling $.observe(data, "**", ...) more than once does not add extra event bindings');

	// ................................ Act ..................................
	$.observe(model, "**", observeAllCb3);

	// ............................... Assert .................................
	listeners = $._data(model).events.propertyChange.length + " "
	+ $._data(model.person1).events.propertyChange.length + " "
	+ $._data(model.person1.home).events.propertyChange.length + " "
	+ $._data(model.person1.home.address).events.propertyChange.length + " "
	+ $._data(model.things).events.arrayChange.length + " "
	+ $._data(model.things[0]).events.propertyChange.length + " "
	+ $._data(model.things[1]).events.propertyChange.length;

	assert.equal(listeners, "2 2 2 2 2 2 2", 'Calling $.observe(data, "**", ...) with a different callback adds one binding for the new callback on each object or array');

	// ................................ Act ..................................
	$.unobserve(model, "**", observeAllCb1);

	// ............................... Assert .................................
	listeners = $._data(model).events.propertyChange.length + " "
	+ $._data(model.person1).events.propertyChange.length + " "
	+ $._data(model.person1.home).events.propertyChange.length + " "
	+ $._data(model.person1.home.address).events.propertyChange.length + " "
	+ $._data(model.things).events.arrayChange.length + " "
	+ $._data(model.things[0]).events.propertyChange.length + " "
	+ $._data(model.things[1]).events.propertyChange.length;

	assert.equal(listeners, "1 1 1 1 1 1 1", 'Calling $.unobserve(data, "**", myCallback) removes just my callback bindings');

	// ................................ Act ..................................
	$.observe(model, "**", observeAllCb1);

	$.unobserve(model.things, "**", observeAllCb1);

	// ............................... Assert .................................
	listeners = $._data(model).events.propertyChange.length + " "
	+ $._data(model.person1).events.propertyChange.length + " "
	+ $._data(model.person1.home).events.propertyChange.length + " "
	+ $._data(model.person1.home.address).events.propertyChange.length + " "
	+ $._data(model.things).events.arrayChange.length + " "
	+ $._data(model.things[0]).events.propertyChange.length + " "
	+ $._data(model.things[1]).events.propertyChange.length;

	assert.equal(listeners, "2 2 2 2 1 1 1", 'Calling $.unobserve(objectOrArrayInTree, "**", myCallback) removes just my callback bindings in the subtree only');

	// ................................ Act ..................................
	$.unobserve(model, "**");

	// ............................... Assert .................................
	assert.equal(!$._data(model).events + " "
		+ !$._data(model.person1).events + " "
		+ !$._data(model.person1.home).events + " "
		+ !$._data(model.person1.home.address).events + " "
		+ !$._data(model.things).events + " "
		+ !$._data(model.things[0]).events + " "
		+ !$._data(model.things[1]).events,
		"true true true true true true true",
	'unobserveAll() with no callback removes all bindings from the tree');

	// ................................ Act ..................................
	$.observe(model.things, "**", observeAllCb2);

	// ............................... Assert .................................
	listeners = $._data(model.things).events.arrayChange.length + " "
	+ $._data(model.things[0]).events.propertyChange.length + " "
	+ $._data(model.things[1]).events.propertyChange.length;

	assert.equal(listeners, "1 1 1", '$.observe(someArray, "**", observeAllCb2) works correctly');

	$.unobserve(model.things, "**", observeAllCb2);

	listeners = "" + !!$._data(model.things).events + " "
	+ !!$._data(model.things[0]).events + " "
	+ !!$._data(model.things[1]).events;

	assert.equal(listeners, "false false false", '$.unobserve(someArray, "**", observeAllCb2) removes listeners correctly');

	// ................................ Act ..................................
	$.observe(model, "things.**", observeAllCb2);

	// ............................... Assert .................................
	listeners = $._data(model.things).events.arrayChange.length + " "
	+ $._data(model.things[0]).events.propertyChange.length + " "
	+ $._data(model.things[1]).events.propertyChange.length;

	assert.equal(listeners, "1 1 1", '$.observe(data, "arrayProp.**", observeAllCb2) works correctly');

	// ................................ Act ..................................
	reset();
	$.observable(model.things).insert({thing: "bush"});
	$.observable(model.things).refresh([model.things[1], model.things[0], model.things[1]]);
	$.observable(model.things[2]).setProperty("thing", model.things[2].thing + "+");
	$.observable(model.things[1]).setProperty("thing", model.things[1].thing + "+");
	$.observable(model.things).remove(2);

	// ............................... Assert .................................
	assert.equal(result,
'ObserveAll Path: root eventArgs: change: insert|index: 3|items: [object Object]|'
+ 'ObserveAll Path: root eventArgs: change: refresh|oldItems: [object Object],[object Object],[object Object],[object Object]|'
+ 'ObserveAll Path: root[0] eventArgs: change: set|path: thing|value: tree+|oldValue: tree|remove: false|'
+ 'ObserveAll Path: root[1] eventArgs: change: set|path: thing|value: bush++|oldValue: bush+|remove: false|'
+ 'ObserveAll Path: root eventArgs: change: remove|index: 2|items: [object Object]|',
		'$.observe(data, "arrayProp.**", ...) works as observeAll and raises correct change events');

	// ................................ Act ..................................
	$.unobserve(model, "things.**", observeAllCb2);

	// ............................... Assert .................................
	listeners = "" + !!$._data(model.things).events + " "
	+ !!$._data(model.things[0]).events + " "
	+ !!$._data(model.things[1]).events;

	assert.equal(listeners, "false false false", '$.unobserve(data, "arrayProp.**", observeAllCb2) removes listeners correctly');

	reset();

	// ................................ Reset ..................................
	inc = 0;
	data = {};

	// =============================== Arrange ===============================

	model = {};

	function observeAllCb4(ev, eventArgs) {
		if (!eventArgs.refresh) {
			result += "ObserveAll Path: " + (ev.data.observeAll && ev.data.observeAll.path()) + " eventArgs: ";
			for (var key in eventArgs) {
				result += key + ": " + JSON.stringify(eventArgs[key]) + "|";
			}
		}
	}

	$.observe(model, "owner", "person^address.street", "person.**", "person^**", "person^name", observeAllCb4);

	$.observable(model).setProperty({
		owner: "Jeff",
		person: {
			name: "Pete",
			address: {
				street: "1st Ave"
			},
			phones: [{number: "111 111 1111"}, {number:"222 222 2222"}]
		}
	});

	// ................................ Act ..................................
	$.observable(model.person).setProperty({
		name: "Hermione",
		"address.street": "Main St"
	});

	$.observable(model.person).setProperty({
		address: {street: "New Street"},
		phones: [{number:"123 123 1234"}]
	});

	$.observable(model).setProperty({
		"person.name": "John",
		"person.address.street": "Last St"
	});

	$.observable(model.person.phones[0]).setProperty("foo", 34);

	$.observable(model.person.phones).insert({
		number:"456 456 AAAA"
	});

	$.observable(model.person.phones[1]).setProperty("number", model.person.phones[1].number + inc++);

	$.observable(model.person.phones).remove(0);

	$.observable(model.person.phones[0]).setProperty("number", model.person.phones[0].number + inc++);

	$.observable(model.person.phones).insert({
		number:"456 456 BBBB"
	});

	$.observable(model.person.phones[1]).setProperty("subnum", {a: 11, b: 22});

	$.observable(model.person.phones[1]).setProperty("subnum.a", "a" + inc++);

	$.observable(model.person.phones[1]).removeProperty("subnum.b");

	$.observable(model.person.phones).insert(1, [{number:"456 456 CCCC"}, {number:"456 456 DDDD"}]);

	$.observable(model.person.phones[2]).setProperty("number", model.person.phones[2].number + inc++);

	$.observable(model.person.phones).refresh([{number:"456 456 EEEE"}, {number:"456 456 FFFF"}]);

	$.observable(model.person.phones[1]).setProperty("number", model.person.phones[1].number + inc++);

	$.observable(model.person.phones).remove(0);

	$.observable(model.person.phones[0]).setProperty("number", model.person.phones[0].number + inc++);

	// ............................... Assert .................................

	result += "DATA: " + JSON.stringify(model);

	assert.equal(result,
'ObserveAll Path: undefined eventArgs: change: "set"|path: "owner"|value: "Jeff"|oldValue: undefined|remove: false'

+ '|ObserveAll Path: undefined eventArgs: change: "set"|path: "person"|value: {"name":"Pete","address":{"street":"1st Ave"},"phones":[{"number":"111 111 1111"},{"number":"222 222 2222"}]}|oldValue: undefined|remove: false'

+ '|ObserveAll Path: root eventArgs: change: "set"|path: "name"|value: "Hermione"|oldValue: "Pete"|remove: false'

+ '|ObserveAll Path: root.address eventArgs: change: "set"|path: "street"|value: "Main St"|oldValue: "1st Ave"|remove: false'

+ '|ObserveAll Path: root eventArgs: change: "set"|path: "address"|value: {"street":"New Street"}|oldValue: {"street":"Main St"}|remove: false'

+ '|ObserveAll Path: root eventArgs: change: "set"|path: "phones"|value: [{"number":"123 123 1234"}]|oldValue: [{"number":"111 111 1111"},{"number":"222 222 2222"}]|remove: false'

+ '|ObserveAll Path: root eventArgs: change: "set"|path: "name"|value: "John"|oldValue: "Hermione"|remove: false'

+ '|ObserveAll Path: root.address eventArgs: change: "set"|path: "street"|value: "Last St"|oldValue: "New Street"|remove: false'

+ '|ObserveAll Path: root.phones[0] eventArgs: change: "set"|path: "foo"|value: 34|oldValue: undefined|remove: false'

+ '|ObserveAll Path: root.phones eventArgs: change: "insert"|index: 1|items: [{"number":"456 456 AAAA"}]'

+ '|ObserveAll Path: root.phones[1] eventArgs: change: "set"|path: "number"|value: "456 456 AAAA0"|oldValue: "456 456 AAAA"|remove: false'

+ '|ObserveAll Path: root.phones eventArgs: change: "remove"|index: 0|items: [{"number":"123 123 1234","foo":34}]'

+ '|ObserveAll Path: root.phones[0] eventArgs: change: "set"|path: "number"|value: "456 456 AAAA01"|oldValue: "456 456 AAAA0"|remove: false'

+ '|ObserveAll Path: root.phones eventArgs: change: "insert"|index: 1|items: [{"number":"456 456 BBBB"}]'

+ '|ObserveAll Path: root.phones[1] eventArgs: change: "set"|path: "subnum"|value: {"a":11,"b":22}|oldValue: undefined|remove: false'

+ '|ObserveAll Path: root.phones[1].subnum eventArgs: change: "set"|path: "a"|value: "a2"|oldValue: 11|remove: false'

+ '|ObserveAll Path: root.phones[1].subnum eventArgs: change: "set"|path: "b"|value: undefined|oldValue: 22|remove: true'

+ '|ObserveAll Path: root.phones eventArgs: change: "insert"|index: 1|items: [{"number":"456 456 CCCC"},{"number":"456 456 DDDD"}]'

+ '|ObserveAll Path: root.phones[2] eventArgs: change: "set"|path: "number"|value: "456 456 DDDD3"|oldValue: "456 456 DDDD"|remove: false'

+ '|ObserveAll Path: root.phones eventArgs: change: "refresh"|oldItems: [{"number":"456 456 AAAA01"},{"number":"456 456 CCCC"},{"number":"456 456 DDDD3"},{"number":"456 456 BBBB","subnum":{"a":"a2"}}]'

+ '|ObserveAll Path: root.phones[1] eventArgs: change: "set"|path: "number"|value: "456 456 FFFF4"|oldValue: "456 456 FFFF"|remove: false'

+ '|ObserveAll Path: root.phones eventArgs: change: "remove"|index: 0|items: [{"number":"456 456 EEEE"}]'

+ '|ObserveAll Path: root.phones[0] eventArgs: change: "set"|path: "number"|value: "456 456 FFFF45"|oldValue: "456 456 FFFF4"|remove: false'

+ '|DATA: {"owner":"Jeff","person":{"name":"John","address":{"street":"Last St"},"phones":[{"number":"456 456 FFFF45"}]}}',

	'observeAll scenarios using multiple paths, with or without "**", raise correct events, with observeAll.path() etc.');

	// ............................... Assert .................................
	listeners = $._data(model).events.propertyChange.length + " "
	+ $._data(model.person).events.propertyChange.length + " "
	+ $._data(model.person.address).events.propertyChange.length + " "
	+ $._data(model.person.phones).events.arrayChange.length + " "
	+ $._data(model.person.phones[0]).events.propertyChange.length;

	assert.equal(listeners, "2 1 1 1 1", 'observeAll scenarios using multiple paths, with or without "**", duplicate listeners are avoided');

	// ................................ Reset ..................................
	$.unobserve(model, "**");

	reset();

	model = {
		person1: person1,
		person2: person2,
		things: []
	};
	person1.home.address.street = "StreetOne";
	person1.home.address.ZIP = "111";

});

QUnit.test('observe(... "[]" ...)', function(assert) {
		$.views.settings.advanced({_jsv: true});

	// =============================== Arrange ===============================
	var cb = function cb(ev, eventArgs) {
		var val = eventArgs.value;
		result += eventArgs.path + ": " + ($.isArray(val) ? val.length : val) + ", ";
	},

	reset = function() {
		result = "",
		data = {
			list: [
				{a: "0a", b: "0b"},
				{a: "1a", b: "1b"}
			]
		};
	},

	observablyChange = function(list) {
		result += "|Set01| ";
		$.observable(list[0]).setProperty({a: "0a2", b: "0b2"});
		$.observable(list[1]).setProperty({a: "1a2", b: "1b2"});
		result += "|Insert23| ";
		$.observable(list).insert([{a: "2a", b: "2b"}, {a: "3a", b: "3b"}]);
		result += "|Set0123| ";
		$.observable(list[0]).setProperty({a: "0a3", b: "0b3"});
		$.observable(list[1]).setProperty({a: "1a3", b: "1b3"});
		$.observable(list[2]).setProperty({a: "2a3", b: "2b3"});
		$.observable(list[3]).setProperty({a: "3a3", b: "3b3"});
	},

	result = "",
	data;

	// ................................ Act ..................................
	reset();
	$.observe(data, 'list.[].*', cb);

	observablyChange(data.list);
	result += !!$._data(data.list).events;

	$.unobserve(data, 'list.[].*', cb);

	result += JSON.stringify(_jsv.cbBindings);

	// ............................... Assert .................................
	assert.equal(result, "|Set01| a: 0a2, b: 0b2, a: 1a2, b: 1b2, |Insert23| |Set0123| a: 0a3, b: 0b3, a: 1a3, b: 1b3, false{}",
	"observe '[].*' unobserve '[].*' works correctly");

	// ................................ Act ..................................
	reset();

	$.observe(data, 'list.[]^*', cb);

	observablyChange(data.list);
	result += $._data(data.list).events.arrayChange.length;

	$.unobserve(data, 'list.[]^*', cb);

	result += !!$._data(data.list).events + JSON.stringify(_jsv.cbBindings);

	// ............................... Assert .................................
	assert.equal(result, "|Set01| a: 0a2, b: 0b2, a: 1a2, b: 1b2, |Insert23| |Set0123| a: 0a3, b: 0b3, a: 1a3, b: 1b3, a: 2a3, b: 2b3, a: 3a3, b: 3b3, 1false{}",
	"observe '[]^*' unobserve '[]^*' works correctly");

	// ................................ Act ..................................
	reset();

	$.observe(data, 'list.[]^a', cb);

	observablyChange(data.list);
	result += $._data(data.list).events.arrayChange.length;

	$.unobserve(data, 'list.[]^*', cb);

	result += !!$._data(data.list).events + JSON.stringify(_jsv.cbBindings);

	// ............................... Assert .................................
	assert.equal(result, "|Set01| a: 0a2, a: 1a2, |Insert23| |Set0123| a: 0a3, a: 1a3, a: 2a3, a: 3a3, 1false{}",
	"observe '[]^a' unobserve '[]^*' works correctly");

	// ................................ Act ..................................
	reset();
	$.observe(data, 'list.[].a', cb);

	observablyChange(data.list);
	result += !!$._data(data.list).events;

	$.unobserve(data, 'list.[]^*', cb);

	result += JSON.stringify(_jsv.cbBindings);

	// ............................... Assert .................................
	assert.equal(result, "|Set01| a: 0a2, a: 1a2, |Insert23| |Set0123| a: 0a3, a: 1a3, false{}",
	"observe '[].a' unobserve '[]^*' works correctly");

	// ................................ Act ..................................
	reset();

	$.observe(data, 'list.[]^a', cb);

	observablyChange(data.list);
	result += $._data(data.list).events.arrayChange.length;

	$.unobserve(data, 'list.[].*', cb);

	result += $._data(data.list).events.arrayChange.length;

	$.unobserve(data, 'list.[]', cb);

	result += !!$._data(data.list).events + JSON.stringify(_jsv.cbBindings);

	// ............................... Assert .................................
	assert.equal(result, "|Set01| a: 0a2, a: 1a2, |Insert23| |Set0123| a: 0a3, a: 1a3, a: 2a3, a: 3a3, 11false{}",
	"observe '[]^a' unobserve '[].*' unobserve '[]' works correctly");

	// ................................ Act ..................................
	reset();

	$.observe(data, 'list^[].a', cb);

	result += "|setList| ";

	$.observable(data).setProperty({list: [{a: "2a4", b: "2b4"}, {a: "3a4", b: "3b4"}]});
	observablyChange(data.list);
	result += $._data(data.list).events.arrayChange.length + $._data(data).events.propertyChange.length;

	$.unobserve(data, 'list^[].*', cb);

	result += !!$._data(data.list).events + "" + !!$._data(data).events + JSON.stringify(_jsv.cbBindings);

	// ............................... Assert .................................
	assert.equal(result, "|setList| list: 2, |Set01| a: 0a2, a: 1a2, |Insert23| |Set0123| a: 0a3, a: 1a3, a: 2a3, a: 3a3, 2falsefalse{}",
	"observe 'list^[].a' unobserve 'list^[].*' works correctly");

	// =============================== Arrange ===============================
	reset = function() {
		result = "",
		data = {
			deeplist: [
				{sublist:[
					{a: "0a", b: "0b"},
					{a: "1a", b: "1b"}
				]}
			]
		};
	};

	observablyChange = function(list) {
		result += "|Set01| ";
		$.observable(list[0]).setProperty({a: "0a2", b: "0b2"});
		$.observable(list[1]).setProperty({a: "1a2", b: "1b2"});
		result += "|Insert23| ";
		$.observable(list).insert([{a: "2a", b: "2b"}, {a: "3a", b: "3b"}]);
		result += "|Set0123| ";
		$.observable(list[0]).setProperty({a: "0a3", b: "0b3"});
		$.observable(list[1]).setProperty({a: "1a3", b: "1b3"});
		$.observable(list[2]).setProperty({a: "2a3", b: "2b3"});
		$.observable(list[3]).setProperty({a: "3a3", b: "3b3"});
	};

	// ................................ Act ..................................
	reset();
	$.observe(data.deeplist, '[].sublist.[].*', cb);

	observablyChange(data.deeplist[0].sublist);
	result += !!$._data(data.deeplist[0].sublist).events;

	$.unobserve(data.deeplist, '[].sublist.[].*', cb);

	result += JSON.stringify(_jsv.cbBindings);

	// ............................... Assert .................................
	assert.equal(result, "|Set01| a: 0a2, b: 0b2, a: 1a2, b: 1b2, |Insert23| |Set0123| a: 0a3, b: 0b3, a: 1a3, b: 1b3, false{}",
	"observe '[].sublist.[].*' unobserve '[].sublist.[].*' works correctly");

	// ................................ Act ..................................
	reset();

	$.observe(data.deeplist, '[].sublist.[]^*', cb);

	observablyChange(data.deeplist[0].sublist);
	result += $._data(data.deeplist[0].sublist).events.arrayChange.length;

	$.unobserve(data.deeplist, '[].sublist.[]^*', cb);

	result += !!$._data(data.deeplist[0].sublist).events + JSON.stringify(_jsv.cbBindings);

	// ............................... Assert .................................
	assert.equal(result, "|Set01| a: 0a2, b: 0b2, a: 1a2, b: 1b2, |Insert23| |Set0123| a: 0a3, b: 0b3, a: 1a3, b: 1b3, a: 2a3, b: 2b3, a: 3a3, b: 3b3, 1false{}",
	"observe '[].sublist.[]^*' unobserve '[].sublist.[]^*' works correctly");

	// ................................ Act ..................................
	reset();

	$.observe(data, 'deeplist.[].sublist.[]^a', cb);

	observablyChange(data.deeplist[0].sublist);
	result += $._data(data.deeplist[0].sublist).events.arrayChange.length;

	$.unobserve(data, 'deeplist.[].sublist.[]^*', cb);

	result += !!$._data(data.deeplist[0].sublist).events + JSON.stringify(_jsv.cbBindings);

	// ............................... Assert .................................
	assert.equal(result, "|Set01| a: 0a2, a: 1a2, |Insert23| |Set0123| a: 0a3, a: 1a3, a: 2a3, a: 3a3, 1false{}",
	"observe '[].sublist.[].a' unobserve '[].sublist.[]^*' works correctly");

	// ................................ Act ..................................
	reset();
	$.observe(data.deeplist, '[].sublist.[].a', cb);

	observablyChange(data.deeplist[0].sublist);
	result += !!$._data(data.deeplist[0].sublist).events;

	$.unobserve(data.deeplist, '[].sublist.[]^*', cb);

	result += JSON.stringify(_jsv.cbBindings);

	// ............................... Assert .................................
	assert.equal(result, "|Set01| a: 0a2, a: 1a2, |Insert23| |Set0123| a: 0a3, a: 1a3, false{}",
	"observe '[].sublist.[].a' unobserve '[].sublist.[]^*' works correctly");

	// ................................ Act ..................................
	reset();

	$.observe(data.deeplist, '[].sublist.[]^a', cb);

	observablyChange(data.deeplist[0].sublist);
	result += $._data(data.deeplist[0].sublist).events.arrayChange.length;

	$.unobserve(data.deeplist, '[].sublist.[].*', cb);

	result += $._data(data.deeplist[0].sublist).events.arrayChange.length;

	$.unobserve(data.deeplist, '[].sublist.[]', cb);

	result += !!$._data(data.deeplist[0].sublist).events + JSON.stringify(_jsv.cbBindings);

	// ............................... Assert .................................
	assert.equal(result, "|Set01| a: 0a2, a: 1a2, |Insert23| |Set0123| a: 0a3, a: 1a3, a: 2a3, a: 3a3, 11false{}",
	"observe '[].sublist.[]^a' unobserve '[].sublist.[].*' unobserve '[].sublist.[]' works correctly");

	// ................................ Act ..................................
	reset();

	$.observe(data.deeplist, '[].sublist^[].a', cb);

	result += "|setList| ";

	$.observable(data.deeplist[0]).setProperty({sublist: [{a: "2a4", b: "2b4"}, {a: "3a4", b: "3b4"}]});
	observablyChange(data.deeplist[0].sublist);
	result += $._data(data.deeplist[0].sublist).events.arrayChange.length + $._data(data.deeplist[0]).events.propertyChange.length;

	$.unobserve(data.deeplist, '[].sublist^[].*', cb);

	result += !!$._data(data.deeplist[0].sublist).events + "" + !!$._data(data.deeplist[0]).events + JSON.stringify(_jsv.cbBindings);

	// ............................... Assert .................................
	assert.equal(result, "|setList| sublist: 2, |Set01| a: 0a2, a: 1a2, |Insert23| |Set0123| a: 0a3, a: 1a3, a: 2a3, a: 3a3, 2falsefalse{}",
	"observe '[].sublist^[].a' unobserve '[].sublist^[].*' works correctly");

	// ................................ Act ..................................

	reset();
	$.observe(data.deeplist, '[]^sublist.[].a', cb);

	result += "|insertDeepList| ";

	$.observable(data.deeplist).insert(0, {sublist: [{a: "00a", b: "00b"}, {a: "01a", b: "01b"}]});
	observablyChange(data.deeplist[0].sublist);
	observablyChange(data.deeplist[1].sublist);
	result += $._data(data.deeplist).events.arrayChange.length + $._data(data.deeplist[0].sublist).events.arrayChange.length + $._data(data.deeplist[0]).events.propertyChange.length;

	$.unobserve(data.deeplist, '[]^sublist.[].a', cb);

	result += !!$._data(data.deeplist).events + "" + !!$._data(data.deeplist[0]).events + "" + !!$._data(data.deeplist[0].sublist).events + JSON.stringify(_jsv.cbBindings);

	// ............................... Assert .................................
	assert.equal(result, "|insertDeepList| |Set01| a: 0a2, a: 1a2, |Insert23| |Set0123| a: 0a3, a: 1a3, a: 2a3, a: 3a3, |Set01| a: 0a2, a: 1a2, |Insert23| |Set0123| a: 0a3, a: 1a3, a: 2a3, a: 3a3, 3falsefalsefalse{}",
	"observe '[]^sublist.[].a'' unobserve '[]^sublist.[].a'' works correctly");

	// =============================== Arrange ===============================

	reset = function() {
		result = "",
		data = {
			listoflist: [
				[
					{a: "0a", b: "0b"},
					{a: "1a", b: "1b"}
				]
			]
		};
	};

	observablyChange = function(list) {
		result += "|Set01| ";
		$.observable(list[0]).setProperty({a: "0a2", b: "0b2"});
		$.observable(list[1]).setProperty({a: "1a2", b: "1b2"});
		result += "|Insert23| ";
		$.observable(list).insert([{a: "2a", b: "2b"}, {a: "3a", b: "3b"}]);
		result += "|Set0123| ";
		$.observable(list[0]).setProperty({a: "0a3", b: "0b3"});
		$.observable(list[1]).setProperty({a: "1a3", b: "1b3"});
		$.observable(list[2]).setProperty({a: "2a3", b: "2b3"});
		$.observable(list[3]).setProperty({a: "3a3", b: "3b3"});
	};

	// ................................ Act ..................................
	reset();
	$.observe(data.listoflist, '[].[].*', cb);

	observablyChange(data.listoflist[0]);
	result += !!$._data(data.listoflist[0]).events;

	$.unobserve(data.listoflist, '[].[].*', cb);

	result += JSON.stringify(_jsv.cbBindings);

	// ............................... Assert .................................
	assert.equal(result, "|Set01| a: 0a2, b: 0b2, a: 1a2, b: 1b2, |Insert23| |Set0123| a: 0a3, b: 0b3, a: 1a3, b: 1b3, false{}",
	"observe '[].[].*' unobserve '[].[].*' works correctly");

	// ................................ Act ..................................
	reset();

	$.observe(data.listoflist, '[].[]^*', cb);

	observablyChange(data.listoflist[0]);
	result += $._data(data.listoflist[0]).events.arrayChange.length;

	$.unobserve(data.listoflist, '[].[]^*', cb);

	result += !!$._data(data.listoflist[0]).events + JSON.stringify(_jsv.cbBindings);

	// ............................... Assert .................................
	assert.equal(result, "|Set01| a: 0a2, b: 0b2, a: 1a2, b: 1b2, |Insert23| |Set0123| a: 0a3, b: 0b3, a: 1a3, b: 1b3, a: 2a3, b: 2b3, a: 3a3, b: 3b3, 1false{}",
	"observe '[].[]^*' unobserve '[].[]^*' works correctly");

	// ................................ Act ..................................
	reset();

	$.observe(data, 'listoflist.[].[]^a', cb);

	observablyChange(data.listoflist[0]);
	result += $._data(data.listoflist[0]).events.arrayChange.length;

	$.unobserve(data, 'listoflist.[].[]^*', cb);

	result += !!$._data(data.listoflist[0]).events + JSON.stringify(_jsv.cbBindings);

	// ............................... Assert .................................
	assert.equal(result, "|Set01| a: 0a2, a: 1a2, |Insert23| |Set0123| a: 0a3, a: 1a3, a: 2a3, a: 3a3, 1false{}",
	"observe '[].[].a' unobserve '[].[].*' works correctly");

	// ................................ Act ..................................
	reset();
	$.observe(data.listoflist, '[].[].a', cb);

	observablyChange(data.listoflist[0]);
	result += !!$._data(data.listoflist[0]).events;

	$.unobserve(data.listoflist, '[].[]^*', cb);

	result += JSON.stringify(_jsv.cbBindings);

	// ............................... Assert .................................
	assert.equal(result, "|Set01| a: 0a2, a: 1a2, |Insert23| |Set0123| a: 0a3, a: 1a3, false{}",
	"observe '[].[].a' unobserve '[].[].*' works correctly");

	// ................................ Act ..................................
	reset();

	$.observe(data.listoflist, '[].[]^a', cb);

	observablyChange(data.listoflist[0]);
	result += $._data(data.listoflist[0]).events.arrayChange.length;

	$.unobserve(data.listoflist, '[].[].*', cb);

	result += $._data(data.listoflist[0]).events.arrayChange.length;

	$.unobserve(data.listoflist, '[].[]', cb);

	result += !!$._data(data.listoflist[0]).events + JSON.stringify(_jsv.cbBindings);

	// ............................... Assert .................................
	assert.equal(result, "|Set01| a: 0a2, a: 1a2, |Insert23| |Set0123| a: 0a3, a: 1a3, a: 2a3, a: 3a3, 11false{}",
	"observe '[].[]^a' unobserve '[].[].*' unobserve '[].[]' works correctly");

	// ................................ Act ..................................
	reset();

	$.observe(data.listoflist, '[]^[].a', cb);

	result += "|setList| ";

	$.observable(data.listoflist[0]).refresh([{a: "2a4", b: "2b4"}, {a: "3a4", b: "3b4"}]);
	observablyChange(data.listoflist[0]);
	result += $._data(data.listoflist[0]).events.arrayChange.length;

	$.unobserve(data.listoflist, '[]^[].*', cb);

	result += !!$._data(data.listoflist[0]).events + JSON.stringify(_jsv.cbBindings);

	// ............................... Assert .................................
	assert.equal(result, "|setList| |Set01| a: 0a2, a: 1a2, |Insert23| |Set0123| a: 0a3, a: 1a3, a: 2a3, a: 3a3, 1false{}",
	"observe '[]^[].a' unobserve '[]^[].*' works correctly");

	// ................................ Act ..................................
	reset();

	$.observe(data.listoflist, '[]^[].a', cb);

	result += "|insertDeepList| ";

	$.observable(data.listoflist).insert(0, [[{a: "00a", b: "00b"}, {a: "01a", b: "01b"}]]);
	observablyChange(data.listoflist[0]);
	observablyChange(data.listoflist[1]);
	result += $._data(data.listoflist).events.arrayChange.length + $._data(data.listoflist[0]).events.arrayChange.length + $._data(data.listoflist[1]).events.arrayChange.length;

	$.unobserve(data.listoflist, '[]^[].a', cb);

	result += !!$._data(data.listoflist).events + "" + !!$._data(data.listoflist[0]).events + "" + !!$._data(data.listoflist[1]).events + JSON.stringify(_jsv.cbBindings);

	// ............................... Assert .................................
	assert.equal(result, "|insertDeepList| |Set01| a: 0a2, a: 1a2, |Insert23| |Set0123| a: 0a3, a: 1a3, a: 2a3, a: 3a3, |Set01| a: 0a2, a: 1a2, |Insert23| |Set0123| a: 0a3, a: 1a3, a: 2a3, a: 3a3, 3falsefalsefalse{}",
	"observe '[]^[].a' unobserve '[]^[].a' works correctly");

		$.views.settings.advanced({_jsv: false});
});

QUnit.test("observeAll - cyclic graphs", function(assert) {
	reset();

	// =============================== Arrange ===============================
	// Test observeAll using data with cyclic graph - (children/parent cycle)
	var data = {name: "Jo"};

	data.children = [
		{
			parent: data,
			name: "Pete"
		}
	];

	$.observable(data).observeAll(observeAllCb2);

	// ................................ Act ..................................
	$.observable(data).setProperty("name", "Hermione");

	$.observable(data.children[0]).setProperty("name", "Mary");

	// ............................... Assert .................................
	assert.equal(result,
		"ObserveAll Path: root eventArgs: change: set|path: name|value: Hermione|oldValue: Jo|remove: false|"
		+ "ObserveAll Path: root.children[0] eventArgs: change: set|path: name|value: Mary|oldValue: Pete|remove: false|",
		"observeAll with cyclic children/parent graph");

	// ................................ Act ..................................
	$.observable(data).unobserveAll();
	assert.ok(!$._data(data).events && !$._data(data.children).events && !$._data(data.children[0]).events && !$._data(data.children[0].parent).events,
		"unobserveAll with cyclic children/parent graph removes all handlers");

	reset();

	// =============================== Arrange ===============================
	// Test observeAll using data with cyclic graph - (children/parent cycle)
	data = {name: "Jo"};

	data.children = [
		{
			parent: data,
			name: "Pete"
		},
		{
			parent: data,
			name: "Francois"
		}
	];
	var child = data.children[0];
	$.observable(data).observeAll(observeAllCb2);

	// ................................ Act ..................................
	$.observable(data).setProperty("name", "Hermione");

	$.observable(data.children[1]).setProperty("name", "Mary");

	$.observable(data.children).remove(0);
	result += "ChildListener: " + !!$._data(child).events + "|";

	$.observable(data.children).insert({
			parent: data,
			name: "Inserted"
		});
	child = data.children[0];
	result += "ChildListener: " + !!$._data(child).events + "|";

	$.observable(data.children).remove(1);
	$.observable(data.children).remove();
	result += "ChildListener: " + !!$._data(child).events + "|";
	result += "ArrayListener: " + !!$._data(data.children).events + "|";

	// ............................... Assert .................................
	assert.equal(result,
		"ObserveAll Path: root eventArgs: change: set|path: name|value: Hermione|oldValue: Jo|remove: false|"
		+ "ObserveAll Path: root.children[1] eventArgs: change: set|path: name|value: Mary|oldValue: Francois|remove: false|"
		+ "ObserveAll Path: root.children eventArgs: change: remove|index: 0|items: [object Object]|ChildListener: false|"
		+ "ObserveAll Path: root.children eventArgs: change: insert|index: 1|items: [object Object]|ChildListener: true|"
		+ "ObserveAll Path: root.children eventArgs: change: remove|index: 1|items: [object Object]|"
		+ "ObserveAll Path: root.children eventArgs: change: remove|index: 0|items: [object Object]|ChildListener: false|ArrayListener: true|",
		"observeAll with cyclic children/parent graph, including remove action");

	// ................................ Act ..................................
	$.observable(data).unobserveAll();
	assert.ok(!$._data(data).events && !$._data(data.children).events,
		"unobserveAll with cyclic children/parent graph removes all handlers");

	reset();

	// =============================== Arrange ===============================
	// Test observeAll using data with cyclic graph - (child/parent cycle and duplicate object property - child/descendant)
	data = {name: "Jo"};

	data.child = data.descendant = {
			parent: data,
			name: "Pete"
		};

	$.observable(data).observeAll(observeAllCb2);

	// ................................ Act ..................................
	$.observable(data).setProperty("name", "Hermione");

	$.observable(data.child).setProperty("name", "Mary");
	$.observable(data.descendant).setProperty("name", "Jane");

	// ............................... Assert .................................
	assert.equal(result,
		"ObserveAll Path: root eventArgs: change: set|path: name|value: Hermione|oldValue: Jo|remove: false|"
		+ "ObserveAll Path: root.descendant eventArgs: change: set|path: name|value: Mary|oldValue: Pete|remove: false|"
		+ "ObserveAll Path: root.descendant eventArgs: change: set|path: name|value: Jane|oldValue: Mary|remove: false|",
		"observeAll with cyclic child/parent graph with dup property child/descendant");

	// ................................ Act ..................................
	$.observable(data).unobserveAll();
	assert.ok(!$._data(data).events && !$._data(data.child).events && !$._data(data.descendant).events,
		"unobserveAll with cyclic cyclic child/parent graph with dup property child/descendant removes all handlers");

	reset();

	// =============================== Arrange ===============================
	// Test observeAll using data with cyclic graph - (children/parent cycle)
	data = {name: "Jo"};

	var children = data.children = [
		{
			parent: data,
			name: "Pete"
		}
	];

	child = data.children[0];

	$.observable(data).observeAll(observeAllCb2);

	// ................................ Act ..................................

	result += "ArrayListener: " + !!$._data(children).events + "|";

	result += "ChildListener: " + !!$._data(child).events + "|";

	$.observable(data.children).refresh([{
			parent: data,
			name: "Fresh"
		}]);

	result += "ArrayListener: " + !!$._data(children).events + "|";

	result += "ChildListener: " + !!$._data(child).events + "|";

	child = data.children[0];
	result += "NewChildListener: " + !!$._data(child).events + "|";

	$.observable(data).removeProperty("children");

	result += "ArrayListener: " + !!$._data(children).events + "|";

	result += "ChildListener: " + !!$._data(child).events + "|";

	// ............................... Assert .................................
	assert.equal(result,
		"ArrayListener: true|ChildListener: true|"
		+ "ObserveAll Path: root.children eventArgs: change: refresh|oldItems: [object Object]|ArrayListener: true|ChildListener: false|NewChildListener: true|"
		+ "ObserveAll Path: root eventArgs: change: set|path: children|value: undefined|oldValue: [object Object]|remove: true|ArrayListener: false|ChildListener: false|",
		"observeAll with cyclic children/parent graph - action refresh, remove array properties");

	// ................................ Act ..................................
	$.observable(data).unobserveAll();
	assert.ok(!$._data(data).events,
		"unobserveAll with cyclic cyclic children/parent graph removes all handlers");

	reset();

	// =============================== Arrange ===============================
	// Test observeAll using data with cyclic graph - (children/parent cycle and duplicate array - children/descendants)
	data = {name: "Jo"};

	children = data.children = [
		{
			parent: data,
			name: "Pete"
		}
	];

	child = data.children[0];

	$.observable(data).observeAll(observeAllCb2);

	// ................................ Act ..................................

	result += "ArrayListener: " + !!$._data(children).events + "|";

	result += "ChildListener: " + !!$._data(child).events + "|";

	$.observable(data.children).remove();

	result += "ArrayListener: " + !!$._data(children).events + "|";

	result += "ChildListener: " + !!$._data(child).events + "|";

	$.observable(data).setProperty("children", "string");

	result += "ArrayListener: " + !!$._data(children).events + "|";

	// ............................... Assert .................................
	assert.equal(result,
		"ArrayListener: true|ChildListener: true|"
		+ "ObserveAll Path: root.children eventArgs: change: remove|index: 0|items: [object Object]|ArrayListener: true|ChildListener: false|"
		+ "ObserveAll Path: root eventArgs: change: set|path: children|value: string|oldValue: |remove: false|ArrayListener: false|",
		"observeAll with cyclic children/parent graph - action set array to string");

	// ................................ Act ..................................
	$.observable(data).unobserveAll();
	assert.ok(!$._data(data).events,
		"unobserveAll with cyclic cyclic children/parent graph removes all handlers");

	reset();

	// =============================== Arrange ===============================
	// Test observeAll using data with cyclic graph - (children/parent cycle and duplicate array - children/descendants)
	data = {name: "Jo"};

	children = data.children = [
		{
			parent: data,
			name: "Pete"
		}
	];

	child = data.children[0];

	$.observable(data).observeAll(observeAllCb2);

	// ................................ Act ..................................
	$.observable(data).setProperty("name", "Hermione");

	$.observable(child).setProperty("name", "Mary");

	$.observable(data.children).refresh([{
			parent: data,
			name: "Fresh"
		}]);

	result += "ChildListener: " + !!$._data(child).events + "|";

	child = data.children[0];
	result += "NewChildListener: " + !!$._data(child).events + "|";

	result += "ArrayListener: " + !!$._data(children).events + "|";

	$.observable(data).removeProperty("children");

	result += "ArrayListener: " + !!$._data(children).events + "|";

	result += "ChildListener: " + !!$._data(child).events + "|";

	// ............................... Assert .................................
	assert.equal(result,
		"ObserveAll Path: root eventArgs: change: set|path: name|value: Hermione|oldValue: Jo|remove: false|"
		+ "ObserveAll Path: root.children[0] eventArgs: change: set|path: name|value: Mary|oldValue: Pete|remove: false|"
		+ "ObserveAll Path: root.children eventArgs: change: refresh|oldItems: [object Object]|ChildListener: false|NewChildListener: true|ArrayListener: true|"
		+ "ObserveAll Path: root eventArgs: change: set|path: children|value: undefined|oldValue: [object Object]|remove: true|ArrayListener: false|ChildListener: false|",
		"observeAll with cyclic children/parent graph - action remove array property");

	// ................................ Act ..................................
	$.observable(data).unobserveAll();
	//ok(!$._data(data).events && !$._data(data.children).events && !$._data(data.children[0]).events && !$._data(data.children[0].parent).events && !$._data(data.descendants[0].parent).events,
	//	"unobserveAll with cyclic cyclic children/parent graph with dup property children/descendants removes all handlers");

	reset();

	// =============================== Arrange ===============================
	// Test observeAll using data with cyclic graph - (child/parent cycle and duplicate object property - child/descendant)
	data = {name: "Jo"};

	child = data.child = data.descendant = {
			parent: data,
			name: "Pete"
		};

	$.observable(data).observeAll(observeAllCb2);

	// ................................ Act ..................................
	$.observable(data).setProperty("name", "Hermione");

	$.observable(child).setProperty("name", "Mary");

	$.observable(data).setProperty("child", undefined);
	result += "ChildListener: " + !!$._data(child).events + "|";

	$.observable(data).removeProperty("descendant");
	result += "ChildListener: " + !!$._data(child).events + "|";

	// ............................... Assert .................................
	assert.equal(result,
		"ObserveAll Path: root eventArgs: change: set|path: name|value: Hermione|oldValue: Jo|remove: false|"
		+ "ObserveAll Path: root.descendant eventArgs: change: set|path: name|value: Mary|oldValue: Pete|remove: false|"
		+ "ObserveAll Path: root eventArgs: change: set|path: child|value: undefined|oldValue: [object Object]|remove: false|ChildListener: true|"
		+ "ObserveAll Path: root eventArgs: change: set|path: descendant|value: undefined|oldValue: [object Object]|remove: true|ChildListener: false|",
		"observeAll with cyclic child/parent graph with dup property child/descendant, with set undefined and removeProperty actions");

	// ................................ Act ..................................
	$.observable(data).unobserveAll();
	assert.ok(!$._data(data).events,
		"unobserveAll with cyclic cyclic child/parent graph with dup property child/descendant removes all handlers");

	reset();

	// NOTE - WE DO NOT support ObserveAll on data with cyclic graphs which include DUPLICATE REFERENCES TO ARRAY PROPERTIES - such as data.children = data.descendants = []
});

QUnit.test("observeAll/unobserveAll using namespaces", function(assert) {

	reset();

	// =============================== Arrange ===============================
	$.observable("my.nmspace", model).observeAll(observeAllCb1);

	// ................................ Act ..................................
	$.observable(model).setProperty({
		"person1.home.address": {
			street: "1st",
			ZIP: "00000"
		},
		"person1.home.address.street": "upper St",
		"person1.home.address.ZIP": "33333",
		things: [{thing: "tree"}]
	});
	$.observable(model.things).insert({thing: "bush"});
	$.observable(model.things).refresh([model.things[1], model.things[0], model.things[1]]);
	$.observable(model.things[2]).setProperty("thing", model.things[2].thing + "+");

	// ............................... Assert .................................
	assert.equal(result, 
  'ObserveAll Path: root.person1.home eventArgs: change: "set"|path: "address"|value: {"street":"upper St","ZIP":"33333"}|oldValue: {"street":"StreetOne","ZIP":"111"}|remove: false|'
+ 'ObserveAll Path: root eventArgs: change: "set"|path: "things"|value: [{"thing":"tree"}]|oldValue: []|remove: false|'
+ 'ObserveAll Path: root.things eventArgs: change: "insert"|index: 1|items: [{"thing":"bush"}]|'
+ 'ObserveAll Path: root.things eventArgs: change: "refresh"|oldItems: [{"thing":"tree"},{"thing":"bush\"}]|'
+ 'ObserveAll Path: root.things[0] eventArgs: change: "set"|path: "thing"|value: "bush+"|oldValue: "bush"|remove: false|',
	"observeAll with namespace raises correct change events");

	// ............................... Assert .................................
	listeners = $._data(model).events.propertyChange.length + " "
	+ $._data(model.person1).events.propertyChange.length + " "
	+ $._data(model.person1.home).events.propertyChange.length + " "
	+ $._data(model.person1.home.address).events.propertyChange.length + " "
	+ $._data(model.things).events.arrayChange.length + " "
	+ $._data(model.things[0]).events.propertyChange.length + " "
	+ $._data(model.things[1]).events.propertyChange.length;

	assert.equal(listeners, "1 1 1 1 1 1 1", 'observeAll with namespace maintains a single event handler binding on every object in the graph, regardless of structural observable changes made');

	// ................................ Act ..................................
	$.observable("my.nmspace", model).observeAll(observeAllCb1);

	// ............................... Assert .................................
	listeners = $._data(model).events.propertyChange.length + " "
	+ $._data(model.person1).events.propertyChange.length + " "
	+ $._data(model.person1.home).events.propertyChange.length + " "
	+ $._data(model.person1.home.address).events.propertyChange.length + " "
	+ $._data(model.things).events.arrayChange.length + " "
	+ $._data(model.things[0]).events.propertyChange.length + " "
	+ $._data(model.things[1]).events.propertyChange.length;

	assert.equal(listeners, "1 1 1 1 1 1 1", 'Calling observeAll with namespace more than once does not add extra event bindings');

	// ................................ Act ..................................
	$.observable("my.nmspace", model).observeAll(observeAllCb3);

	// ............................... Assert .................................
	listeners = $._data(model).events.propertyChange.length + " "
	+ $._data(model.person1).events.propertyChange.length + " "
	+ $._data(model.person1.home).events.propertyChange.length + " "
	+ $._data(model.person1.home.address).events.propertyChange.length + " "
	+ $._data(model.things).events.arrayChange.length + " "
	+ $._data(model.things[0]).events.propertyChange.length + " "
	+ $._data(model.things[1]).events.propertyChange.length;

	assert.equal(listeners, "2 2 2 2 2 2 2", 'Calling observeAll with namespace with a different callback adds one binding for the new callback on each object or array');

	// ................................ Act ..................................
	$.observable("my.nmspace", model).unobserveAll();

	// ............................... Assert .................................
	assert.equal(!$._data(model).events + " "
		+ !$._data(model.person1).events + " "
		+ !$._data(model.person1.home).events + " "
		+ !$._data(model.person1.home.address).events + " "
		+ !$._data(model.things).events + " "
		+ !$._data(model.things[0]).events + " "
		+ !$._data(model.things[1]).events,
		"true true true true true true true",
		'Calling $.observable("my.nmspace", object).unobserveAll() removes all bindings with that namespace');

	// ................................ Act ..................................
	$.observable("my.nmspace", model).observeAll(observeAllCb1);
	$.observable("our.nmspace", model).observeAll(observeAllCb1);

	// ............................... Assert .................................
	listeners = $._data(model).events.propertyChange.length + " "
	+ $._data(model.person1).events.propertyChange.length + " "
	+ $._data(model.person1.home).events.propertyChange.length + " "
	+ $._data(model.person1.home.address).events.propertyChange.length + " "
	+ $._data(model.things).events.arrayChange.length + " "
	+ $._data(model.things[0]).events.propertyChange.length + " "
	+ $._data(model.things[1]).events.propertyChange.length;

	assert.equal(listeners, "2 2 2 2 2 2 2", 'Calling observeAll with different namespaces adds one binding for each namespace for each object or array');

	// ................................ Act ..................................
	$.observable("my.nmspace", model).unobserveAll();

	// ............................... Assert .................................
	listeners = $._data(model).events.propertyChange.length + " "
	+ $._data(model.person1).events.propertyChange.length + " "
	+ $._data(model.person1.home).events.propertyChange.length + " "
	+ $._data(model.person1.home.address).events.propertyChange.length + " "
	+ $._data(model.things).events.arrayChange.length + " "
	+ $._data(model.things[0]).events.propertyChange.length + " "
	+ $._data(model.things[1]).events.propertyChange.length;

	assert.equal(listeners, "1 1 1 1 1 1 1", 'Calling $.observable("my.nmspace", object).unobserveAll() removes all bindings with that namespace');

	// ................................ Act ..................................
	$.observable("my.nmspace our.nmspace", model).observeAll(observeAllCb1);

	// ............................... Assert .................................
	listeners = $._data(model).events.propertyChange.length + " "
	+ $._data(model.person1).events.propertyChange.length + " "
	+ $._data(model.person1.home).events.propertyChange.length + " "
	+ $._data(model.person1.home.address).events.propertyChange.length + " "
	+ $._data(model.things).events.arrayChange.length + " "
	+ $._data(model.things[0]).events.propertyChange.length + " "
	+ $._data(model.things[1]).events.propertyChange.length;

	assert.equal(listeners, "2 2 2 2 2 2 2", 'Calling observeAll with whitespace-separated namespaces adds one binding for each namespace (if not already bound) for each object or array');

	// ................................ Act ..................................
	$.observable("my.nmspace", model).observeAll(observeAllCb1);

	$.observable("my.nmspace", model.things).unobserveAll(observeAllCb1);

	// ............................... Assert .................................
	listeners = $._data(model).events.propertyChange.length + " "
	+ $._data(model.person1).events.propertyChange.length + " "
	+ $._data(model.person1.home).events.propertyChange.length + " "
	+ $._data(model.person1.home.address).events.propertyChange.length + " "
	+ $._data(model.things).events.arrayChange.length + " "
	+ $._data(model.things[0]).events.propertyChange.length + " "
	+ $._data(model.things[1]).events.propertyChange.length;

	assert.equal(listeners, "2 2 2 2 1 1 1", 'Calling $.observable("my.nmspace", objectOrArrayInTree).unobserveAll(myCallback) removes just my callback bindings in the subtree only');

	// ................................ Act ..................................
	$.observable(model).unobserveAll();

	// ............................... Assert .................................
	assert.equal(!$._data(model).events + " "
		+ !$._data(model.person1).events + " "
		+ !$._data(model.person1.home).events + " "
		+ !$._data(model.person1.home.address).events + " "
		+ !$._data(model.things).events + " "
		+ !$._data(model.things[0]).events + " "
		+ !$._data(model.things[1]).events,
		"true true true true true true true",
	'unobserveAll() with no callback and no namespace removes all bindings from the tree');

	// ................................ Act ..................................
	$.observable("my.nmspace", model.things).observeAll(observeAllCb1);

	// ............................... Assert .................................
	listeners = $._data(model.things).events.arrayChange.length + " "
	+ $._data(model.things[0]).events.propertyChange.length + " "
	+ $._data(model.things[1]).events.propertyChange.length;

	assert.equal(listeners, "1 1 1", '$.observable("my.nmspace", someArray).observeAll(changeHandler) works correctly');

	$.observable(model.things).unobserveAll(observeAllCb1);

	// ................................ Act ..................................
	$.observable("my.nmspace", model).observeAll(observeAllCb1);
	$.observable("our.nmspace", model).observeAll(observeAllCb1);
	$.observable("my.nmspace our.nmspace", model).unobserveAll();

	// ............................... Assert .................................
	assert.equal(!$._data(model).events + " "
		+ !$._data(model.person1).events + " "
		+ !$._data(model.person1.home).events + " "
		+ !$._data(model.person1.home.address).events + " "
		+ !$._data(model.things).events + " "
		+ !$._data(model.things[0]).events + " "
		+ !$._data(model.things[1]).events,
		"true true true true true true true",
	'$.observable("my.nmspace our.nmspace", model).unobserveAll() removes all bindings for each namespace in whitespace-separated list');

	// ................................ Act ..................................
	$.observable("my.nmspace", model).observeAll(observeAllCb1);
	$.observable("our.nmspace", model).observeAll(observeAllCb1);
	$.observable("nmspace", model).unobserveAll();

	// ............................... Assert .................................
	assert.equal(!$._data(model).events + " "
		+ !$._data(model.person1).events + " "
		+ !$._data(model.person1.home).events + " "
		+ !$._data(model.person1.home.address).events + " "
		+ !$._data(model.things).events + " "
		+ !$._data(model.things[0]).events + " "
		+ !$._data(model.things[1]).events,
		"true true true true true true true",
	'$.observable("nmspace", model).unobserveAll() removes all bindings for all namespaces that include that namespace component');

	// ................................ Act ..................................
	$.observable("my.nmspace.a", model).observeAll(observeAllCb1);
	$.observable("our.a.nmspace.b", model).observeAll(observeAllCb1);
	$.observable("nmspace.a", model).unobserveAll();

	// ............................... Assert .................................
	assert.equal(!$._data(model).events + " "
		+ !$._data(model.person1).events + " "
		+ !$._data(model.person1.home).events + " "
		+ !$._data(model.person1.home.address).events + " "
		+ !$._data(model.things).events + " "
		+ !$._data(model.things[0]).events + " "
		+ !$._data(model.things[1]).events,
		"true true true true true true true",
	'$.observable("nmspace.a", model).unobserveAll() removes all bindings for all namespaces that include those namespace components');

	// =============================== Arrange ===============================

	function myListener1(ev, eventArgs) {
		calls++;
		result += "Listener1 change: " + eventArgs.change + " Handler ns: '" + ev.data.ns + "' Caller ns: '" + ev.namespace + "' calls: " + calls + "|";
	}

	function myListener2(ev, eventArgs) {
		calls++;
		result += "Listener2 change: " + eventArgs.change + " Handler ns: '" + ev.data.ns + "' Caller ns: '" + ev.namespace + "' calls: " + calls + "|";
	}
	// ................................ Act ..................................

	reset();
	$.observable("my.nmspace.a", model).observeAll(myListener1);
	$.observable("our.a.nmspace.b", model).observeAll(myListener2);

	$.observable(model).setProperty("amount", 1);
	$.observable(model.things).insert("water");

	$.observable(model).unobserveAll();

	// ............................... Assert .................................
	assert.equal(result + !$._data(model).events + " "
		+ !$._data(model.person1).events + " "
		+ !$._data(model.person1.home).events + " "
		+ !$._data(model.person1.home.address).events + " "
		+ !$._data(model.things).events + " "
		+ !$._data(model.things[0]).events + " "
		+ !$._data(model.things[1]).events,
		"Listener1 change: set Handler ns: 'my.nmspace.a' Caller ns: '' calls: 1|"
		+ "Listener2 change: set Handler ns: 'our.a.nmspace.b' Caller ns: '' calls: 2|"
		+ "Listener1 change: insert Handler ns: 'my.nmspace.a' Caller ns: '' calls: 3|"
		+ "Listener2 change: insert Handler ns: 'our.a.nmspace.b' Caller ns: '' calls: 4|"
		+ "true true true true true true true",
	'$.observable(model).setProperty(...)/insert(...) triggers all listeners in all namespaces');

	// ................................ Act ..................................

	reset();
	$.observable("my.nmspace.a", model).observeAll(myListener1);
	$.observable("our.a.nmspace.b", model).observeAll(myListener2);

	$.observable("my.a", model.things).insert("bread");
	$.observable("a.my", model).setProperty("amount", 2);

	$.observable("a", model).unobserveAll();

	// ............................... Assert .................................
	assert.equal(result + !$._data(model).events + " "
		+ !$._data(model.person1).events + " "
		+ !$._data(model.person1.home).events + " "
		+ !$._data(model.person1.home.address).events + " "
		+ !$._data(model.things).events + " "
		+ !$._data(model.things[0]).events + " "
		+ !$._data(model.things[1]).events,
		"Listener1 change: insert Handler ns: 'my.nmspace.a' Caller ns: 'a.my' calls: 1|"
		+ "Listener1 change: set Handler ns: 'my.nmspace.a' Caller ns: 'a.my' calls: 2|"
		+ "true true true true true true true",
	'$.observable("a.b", model).setProperty(...)/insert(...) triggers all listeners whose namespaces include all of these tokens');

	// ................................ Act ..................................

	reset();
	$.observable("my.nmspace.a", model).observeAll(myListener1);
	$.observable("our.a.nmspace.b", model).observeAll(myListener2);

	$.observable("nmspace.a", model).setProperty("amount", 3);
	$.observable("a.nmspace", model.things).insert("cheese");

	$.unobserve("a.nmspace");

	// ............................... Assert .................................
	assert.equal(result + !$._data(model).events + " "
		+ !$._data(model.person1).events + " "
		+ !$._data(model.person1.home).events + " "
		+ !$._data(model.person1.home.address).events + " "
		+ !$._data(model.things).events + " "
		+ !$._data(model.things[0]).events + " "
		+ !$._data(model.things[1]).events,
		"Listener1 change: set Handler ns: 'my.nmspace.a' Caller ns: 'a.nmspace' calls: 1|"
		+ "Listener2 change: set Handler ns: 'our.a.nmspace.b' Caller ns: 'a.nmspace' calls: 2|"
		+ "Listener1 change: insert Handler ns: 'my.nmspace.a' Caller ns: 'a.nmspace' calls: 3|"
		+ "Listener2 change: insert Handler ns: 'our.a.nmspace.b' Caller ns: 'a.nmspace' calls: 4|"
		+ "true true true true true true true",
	'$.observable("a.b", model).setProperty(...)/insert(...) triggers all listeners  whose namespaces include all of these tokens');

// ................................ Reset ..................................
	reset();
	model = {
		person1: person1,
		person2: person2,
		things: []
	};
	person1.home.address.street = "StreetOne";
	person1.home.address.ZIP = "111";

	// =============================== Arrange ===============================

	function myListener3(ev, eventArgs) {
		calls++;
		result += "myListener3 change: '" + eventArgs.change
			+ "' Caller ns: '" + ev.namespace
			+ "' Handler ns: '" + ev.data.ns
			+ ( eventArgs.change === "set"
					? "' Handler fullPath: '" + ev.data.fullPath
						+ "' Handler paths: '" + ev.data.paths
						+ "' Handler prop: '" + ev.data.prop
						+ (ev.data.observeAll
						? "' Handler observeAll._path : '" + ev.data.observeAll._path
							+ "' Handler observeAll.path() : '" + ev.data.observeAll.path()
							+ "' Handler observeAll.parents() : '" + ev.data.observeAll.parents().length
//							+ "' Handler observeAll.filter : '" + ev.data.observeAll.filter
						: "")
					: ""
					)
			+ "' calls: " + calls + "|";
	}

// ................................ Act ..................................

	reset();
	var team = {person: {phones: []}};

	$.observable("a.b.c", team).observeAll(myListener3);

	$.observable("a", team).setProperty({
		person: {
			name: "Pete",
			phones: [],
			friend: {}
		}
	});
	$.observable("b", team.person.friend).setProperty("name","newName1");
	$.observable("c", team.person.phones).insert("newPhone");
	$.observable("d", team.person.friend).setProperty("name","newName2");
	$.observable("e", team.person.phones).insert("newPhone2");

	// ............................... Assert .................................
	assert.equal(result,
		"myListener3 change: 'set' Caller ns: 'a' Handler ns: 'a.b.c' Handler fullPath: '*' Handler paths: '' Handler prop: '*' "
		+ "Handler observeAll._path : 'root' Handler observeAll.path() : 'root' Handler observeAll.parents() : '1' calls: 1|"
		+ "myListener3 change: 'set' Caller ns: 'b' Handler ns: 'a.b.c' Handler fullPath: '*' Handler paths: '' Handler prop: '*' "
		+ "Handler observeAll._path : 'root.person.friend' Handler observeAll.path() : 'root.person.friend' Handler observeAll.parents() : '3' calls: 2|"
		+ "myListener3 change: 'insert' Caller ns: 'c' Handler ns: 'a.b.c' calls: 3|",
		"call observeAll namespaces");

$.unobserve("a.b.c");

// ................................ Act ..................................

	reset();
	team = {person: {phones: []}};

	$.observe("a.b.c", team, "**", myListener3);

	$.observable("a", team).setProperty({
		person: {
			name: "Pete",
			phones: [],
			friend: {}
		}
	});
	$.observable("b", team.person.friend).setProperty("name","newName1");
	$.observable("c", team.person.phones).insert("newPhone");
	$.observable("d", team.person.friend).setProperty("name","newName2");
	$.observable("e", team.person.phones).insert("newPhone2");

	// ............................... Assert .................................
	assert.equal(result,
		"myListener3 change: 'set' Caller ns: 'a' Handler ns: 'a.b.c' Handler fullPath: '*' Handler paths: '' Handler prop: '*' "
		+ "Handler observeAll._path : 'root' Handler observeAll.path() : 'root' Handler observeAll.parents() : '1' calls: 1|"
		+ "myListener3 change: 'set' Caller ns: 'b' Handler ns: 'a.b.c' Handler fullPath: '*' Handler paths: '' Handler prop: '*' "
		+ "Handler observeAll._path : 'root.person.friend' Handler observeAll.path() : 'root.person.friend' Handler observeAll.parents() : '3' calls: 2|"
		+ "myListener3 change: 'insert' Caller ns: 'c' Handler ns: 'a.b.c' calls: 3|",
		'call observe with "**" - namespaces');

	$.unobserve("a.b.c");

// ................................ Act ..................................

	reset();
	team = {person: {phones: []}};

	$.observe("a.b.c", team, "person^phones", "person^friend.name", myListener3);

	$.observable("a", team).setProperty({
		person: {
			name: "Pete",
			phones: [],
			friend: {}
		}
	});
	$.observable("b", team.person.friend).setProperty("name","newName1");
	$.observable("c", team.person.phones).insert("newPhone");
	$.observable("d", team.person.friend).setProperty("name","newName2");
	$.observable("e", team.person.phones).insert("newPhone2");

	// ............................... Assert .................................

	assert.equal(result,
		"myListener3 change: 'set' Caller ns: 'a' Handler ns: 'a.b.c' Handler fullPath: 'person.phones' Handler paths: 'phones,friend.name' Handler prop: 'person' calls: 1|"
		+ "myListener3 change: 'set' Caller ns: 'b' Handler ns: 'a.b.c' Handler fullPath: 'friend.name' Handler paths: '' Handler prop: 'name' calls: 2|"
		+ "myListener3 change: 'insert' Caller ns: 'c' Handler ns: 'a.b.c' calls: 3|",
		"call observe deep paths, with namespaces");

$.unobserve("a.b.c");

// ................................ Act ..................................

	reset();
	team = {person: {phones: []}};

	$.observable("a.b.c", team).observeAll(myListener3);

	$.observable("a", team).setProperty({
		person: {name: "Pete"}
	});

	$.unobserve("a.b.c", myListener3);

	// ............................... Assert .................................
	$.views.settings.advanced({_jsv: true});

	assert.equal(JSON.stringify([_jsv.cbBindings, $._data(team).events, $._data(team.person).events]), "[{},null,null]",
		"observe/unobserve with namespaces - all bindings removed when unobserve called");

	$.views.settings.advanced({_jsv: false});

	reset();

//TODO add test cases for filter with observe and observeAll, and DataMap etc.
//function filter(allPath, object, parentObs) {
// debugger;
//}
});

if ($.views.tags) { // $.views.viewModels requires JsRender to be loaded
QUnit.test("$.views.viewModels", function(assert) {
	// =============================== Arrange ===============================
	var Constr = $.views.viewModels({getters: ["a", "b"]});
	// ................................ Act ..................................
	var vm = Constr("a1 ", "b1 ");
	var result = vm.a() + vm.b();
	vm.a("a2 ");
	vm.b("b2 ");
	result += vm.a() + vm.b();
	// ............................... Assert .................................
	assert.equal(result, "a1 b1 a2 b2 ", "viewModels, two getters, no methods");

	// =============================== Arrange ===============================
	Constr = $.views.viewModels({getters: ["a", "b", "c"], extend: {add: function(val) {
		this.c(val + this.a() + this.b() + this.c());
	}}});
	// ................................ Act ..................................
	vm = Constr("a1 ", "b1 ", "c1 ");
	vm.add("before ");
	result = vm.c();
	// ............................... Assert .................................
	assert.equal(result, "before a1 b1 c1 ", "viewModels, two getters, one method");

	// =============================== Arrange ===============================
	Constr = $.views.viewModels({extend: {add: function(val) {
		this.foo = val;
	}}});
	// ................................ Act ..................................
	vm = Constr();
	vm.add("before");
	result = vm.foo;
	// ............................... Assert .................................
	assert.equal(result, "before", "viewModels, no getters, one method");

	// =============================== Arrange ===============================
	Constr = $.views.viewModels({getters: []});
	// ................................ Act ..................................
	vm = Constr();
	result = JSON.stringify(vm);
	// ............................... Assert .................................
	assert.equal(result, "{}", "viewModels, no getters, no methods");

	// =============================== Arrange ===============================
	$.views.viewModels({
		T1: {
			getters: ["a", "b"]
		}
	});
	// ................................ Act ..................................
	vm = $.views.viewModels.T1.map({a: "a1 ", b: "b1 "});
	var changes = "";
	function observeAllHandler(ev, evArgs) {
		changes += evArgs.value;
	}
	$.observable(vm).observeAll(observeAllHandler);

	result = vm.a() + vm.b();
	vm.a("a2 ");
	vm.b("b2 ");
	result += vm.a() + vm.b();

	// ............................... Assert .................................
	assert.equal(result + "|" + changes, "a1 b1 a2 b2 |a2 b2 ", "viewModels, two getters, no methods");
	changes = "";

	// ................................ Act ..................................
	vm.merge({a: "a3 ", b: "b3 "});

	result = vm.a() + vm.b();

	// ............................... Assert .................................
	assert.equal(result + "|" + changes, "a3 b3 |a3 b3 ", "viewModels merge, two getters, no methods");
	changes = "";

	// ................................ Act ..................................
	result = vm.unmap();
	result = JSON.stringify(result);

	// ............................... Assert .................................
	assert.equal(result, '{"a":"a3 ","b":"b3 "}', "viewModels unmap, two getters, no methods");

	// ............................... Reset .................................
	$.unobserve(observeAllHandler);

	// =============================== Arrange ===============================
	var viewModels = $.views.viewModels({
		T1: {
			getters: ["a", {getter: "b"}, "c", "d", {getter: "e", type: undefined}, {getter: "f", type: null}, {getter: "g", type: "foo"}, {getter: "h", type: ""}]
		}
	}, {});
	// ................................ Act ..................................
	vm = viewModels.T1.map({a: "a1 ", b: "b1 ", c: "c1 ", d: "d1 ", e: "e1 ", f: "f1 ", g: "g1 ", h: "h1 "});
	$.observable(vm).observeAll(observeAllHandler);

	result = vm.a() + vm.b() + vm.c() + vm.d() + vm.e() + vm.f() + vm.g() + vm.h();
	vm.a("a2 ");
	vm.b("b2 ");
	result += vm.a() + vm.b();
	// ............................... Assert .................................
	assert.equal(result + "|" + changes, "a1 b1 c1 d1 e1 f1 g1 h1 a2 b2 |a2 b2 ",
		"viewModels, multiple unmapped getters, no methods");
	changes = "";

	// ................................ Act ..................................
	vm.merge({a: "a3 ", b: "b3 ", c: "c3 ", d: "d3 ", e: "e3 ", f: "f3 ", g: "g3 ", h: "h3 "});

	result = vm.a() + vm.b() + vm.c() + vm.d() + vm.e() + vm.f() + vm.g() + vm.h();

	// ............................... Assert .................................
	assert.equal(result + "|" + changes, "a3 b3 c3 d3 e3 f3 g3 h3 |a3 b3 c3 d3 e3 f3 g3 h3 ",
		"viewModels merge, multiple unmapped getters, no methods");
	changes = "";

	// ................................ Act ..................................
	result = vm.unmap();
	result = JSON.stringify(result);

	// ............................... Assert .................................
	assert.equal(result, '{"a":"a3 ","b":"b3 ","c":"c3 ","d":"d3 ","e":"e3 ","f":"f3 ","g":"g3 ","h":"h3 "}',
		"viewModels unmap, multiple unmapped getters, no methods");

	// ............................... Reset .................................
	$.unobserve(observeAllHandler);

	// =============================== Arrange ===============================
	$.views.viewModels({
		T1: {
			getters: ["a", "b", "c"],
			extend : {
				add: function(val) {
					this.c(val + this.a() + this.b() + this.c());
				}
			}
		}
	});

	// ................................ Act ..................................
	vm = $.views.viewModels.T1.map({a: "a1 ", b: "b1 ", c: "c1 "});
	$.observable(vm).observeAll(observeAllHandler);

	vm.add("before ");
	result = vm.c();

	// ............................... Assert .................................
	assert.equal(result + "|" + changes, "before a1 b1 c1 |before a1 b1 c1 ", "viewModels, getters and one method");
	changes = "";

	// ................................ Act ..................................
	vm.merge({a: "a3 ", b: "b3 ", c: "c3 "});
	vm.add("updated ");
	result = vm.c();

	// ............................... Assert .................................
	assert.equal(result + "|" + changes, "updated a3 b3 c3 |a3 b3 c3 updated a3 b3 c3 ", "viewModels merge, getters and one method");
	changes = "";

	// ................................ Act ..................................
	result = vm.unmap();
	result = JSON.stringify(result);

	// ............................... Assert .................................
	assert.equal(result, '{"a":"a3 ","b":"b3 ","c":"updated a3 b3 c3 "}', "viewModels unmap, getters and one method");
	changes = "";

	// ............................... Reset .................................
	$.unobserve(observeAllHandler);

	// =============================== Arrange ===============================
	$.views.viewModels({
		T1: {
			getters: ["a", "b"]
		},
		T2: {
			getters: [{getter: "t1", type: "T1"}, {getter: "t1Arr", type: "T1"}, {getter: "t1OrNull", type: "T1", defaultVal: null}]
		}
	});
	viewModels = $.views.viewModels;
	// ................................ Act ..................................
	var t1 = viewModels.T1.map({a: "a1 ", b: "b1 "}); // Create a T1
	var t2 = viewModels.T2.map({t1: {a: "a3 ", b: "b3 "}, t1Arr: [t1.unmap(), {a: "a2 ", b: "b2 "}]}); // Create a T2 (using unmap to scrape values the T1: vm)

	$.observable(t1).observeAll(observeAllHandler);
	$.observable(t2).observeAll(observeAllHandler);

	result = JSON.stringify(t2.unmap());

	// ............................... Assert .................................
	assert.equal(result, '{"t1":{"a":"a3 ","b":"b3 "},"t1Arr":[{"a":"a1 ","b":"b1 "},{"a":"a2 ","b":"b2 "}],"t1OrNull":null}',
		"viewModels, hierarchy");

	// ................................ Act ..................................
	t2.t1Arr()[0].merge({a: "a1x ", b: "b1x "}); // merge not the root, but a VM instance within hierarchy: vm2.t1Arr()[0] - leaving rest unchanged
	result = JSON.stringify(t2.unmap());

	// ............................... Assert .................................
	assert.equal(result + "|" + changes, '{"t1":{"a":"a3 ","b":"b3 "},"t1Arr":[{"a":"a1x ","b":"b1x "},{"a":"a2 ","b":"b2 "}],"t1OrNull":null}|a1x b1x ',
		"viewModels, merge deep node");
	changes = "";

	// ............................... Reset .................................
	$.unobserve(observeAllHandler);

	// ................................ Act ..................................
	var t1Arr = viewModels.T1.map([{a: "a1 ", b: "b1 "}, {a: "a2 ", b: "b2 "}]); // Create a T1 array
	var t2FromArr =  viewModels.T2.map({t1: {a: "a3 ", b: "b3 "}, t1Arr: t1Arr.unmap()}); // Create a T2 (using unmap to scrape values the T1: vm)
	result = JSON.stringify(t2FromArr.unmap());

	// ............................... Assert .................................
	assert.equal(result, '{"t1":{"a":"a3 ","b":"b3 "},"t1Arr":[{"a":"a1 ","b":"b1 "},{"a":"a2 ","b":"b2 "}],"t1OrNull":null}',
		"viewModels, hierarchy");

	// ................................ Act ..................................
	t1Arr = viewModels.T1.map([{a: "a1 ", b: "b1 "}, {a: "a2 ", b: "b2 "}]); // Create a T1 array
	t1Arr.push(viewModels.T1("a3 ", "b3 "));
	t2FromArr = viewModels.T2.map({t1: {a: "a4 ", b: "b4 "}, t1Arr: t1Arr.unmap()}); // Create a T2 (using unmap to scrape values the T1: vm)
	result = JSON.stringify(t2FromArr.unmap());

	// ............................... Assert .................................
	assert.equal(result, '{"t1":{"a":"a4 ","b":"b4 "},"t1Arr":[{"a":"a1 ","b":"b1 "},{"a":"a2 ","b":"b2 "},{"a":"a3 ","b":"b3 "}],"t1OrNull":null}',
		"viewModels, hierarchy");

	// ................................ Act ..................................
	var t2new = viewModels.T2(viewModels.T1("a3 ", "b3 "), [viewModels.T1("a1 ", "b1 "), viewModels.T1("a2 ", "b2 ")], viewModels.T1("a4 ", "b4 ") );
	result = JSON.stringify(t2new.unmap());

	// ............................... Assert .................................
	assert.equal(result, '{"t1":{"a":"a3 ","b":"b3 "},"t1Arr":[{"a":"a1 ","b":"b1 "},{"a":"a2 ","b":"b2 "}],"t1OrNull":{"a":"a4 ","b":"b4 "}}',
		"viewModels, hierarchy");
});
}

QUnit.test("setProperty/insert/remove etc. using async or batched events", function(assert) {
	// =============================== Arrange ===============================
var done;
if (assert.async) { done = assert.async() } else { stop() }

	var count = 0,
		batch = [],
		person = { first: "Jo", last: "Blow" },
		numbers = [0],
		count = 1;

	function makeChanges(delay) {
		result+= count + ": Set first and last";
		$.observable(person, delay).setProperty({first: person.first + count, last: person.last + count});
		result+= count + ": Insert number " + count;
		$.observable(numbers, delay).insert([count, count+"b"]);
		result+= count + ": Set first";
		$.observable(person, delay).setProperty("first", person.first + "!");
		result+= count + ": Remove number " + numbers[numbers.length - 1];
		$.observable(numbers, delay).remove();
	}

	function reset() {
		$.observable(person).setProperty({first: "Jo", last: "Blow"});
		$.observable(numbers).remove(1, numbers.length-1);
		count = 1;
		result = "";
	}

	$.observe(person, "*", numbers, "**", function(ev, eventArgs) {
		var message = " Event:";
		if (eventArgs.change === "set") {
			message += "Set " + eventArgs.path + ": - " + eventArgs.value;
		} else if (eventArgs.change === "insert") {
			message += "Insert: - " + eventArgs.items[0];
		} else if (eventArgs.change === "remove") {
			message += "Remove: - " + eventArgs.items[0];
		}
		result+= message;
	});

	// ................................ Act ..................................
	result = "";
	makeChanges();

	// ............................... Assert .................................
	assert.equal(result,
		"1: Set first and last Event:Set first: - Jo1 Event:Set last: - Blow11: Insert number 1 Event:Insert: - 11: Set first Event:Set first: - Jo1!1: Remove number 1b Event:Remove: - 1b",
		"Synchronous events");

	// ................................ Act ..................................
	reset();
	makeChanges(batch);
	batch.trigger();

	// ............................... Assert .................................
	assert.equal(result,
		"1: Set first and last1: Insert number 11: Set first1: Remove number 1b Event:Set last: - Blow1 Event:Insert: - 1 Event:Set first: - Jo1! Event:Remove: - 1b",
		"Batched events, with batch.trigger()");

	// ................................ Act ..................................
	reset();
	makeChanges(true);

	// ............................... Assert .................................
	setTimeout(function() {
		assert.equal(result,
			"1: Set first and last1: Insert number 11: Set first1: Remove number 1b Event:Set last: - Blow1 Event:Insert: - 1 Event:Set first: - Jo1! Event:Remove: - 1b",
			"Asynchronous events");

		// ................................ Reset ................................
		result = "";
		$.unobserve();
	if (assert.async) { done() } else { start() }
	}, 0);
});

QUnit.test("setProperty/insert/remove etc. using namespaces", function(assert) {
	// =============================== Arrange ===============================
var done;
if (assert.async) { done = assert.async() } else { stop() }
	var count = 0,
		batch = [],
		person = { first: "Jo", last: "Blow" },
		numbers = [0],
		count = 1;

	function makeChanges(ns, delay) {
		result+= count + ": Set first and last";
		$.observable(ns, person, delay).setProperty({first: person.first + count, last: person.last + count});
		result+= count + ": Insert number " + count;
		$.observable(ns, numbers, delay).insert([count, count+"b"]);
		result+= count + ": Set first";
		$.observable(ns, person, delay).setProperty("first", person.first + "!");
		result+= count + ": Remove number " + numbers[numbers.length - 1];
		$.observable(ns, numbers, delay).remove();
	}

	function reset() {
		$.observable(person).setProperty({first: "Jo", last: "Blow"});
		$.observable(numbers).remove(1, numbers.length-1);
		count = 1;
		result = "";
	}

	$.observe("my.name.spaces", person, "*", numbers, "**", function(ev, eventArgs) {
		var message = " Event:";
		if (eventArgs.change === "set") {
			message += "Set " + eventArgs.path + ": - " + eventArgs.value;
		} else if (eventArgs.change === "insert") {
			message += "Insert: - " + eventArgs.items[0];
		} else if (eventArgs.change === "remove") {
			message += "Remove: - " + eventArgs.items[0];
		}
		result+= message;
	});

	// ................................ Act ..................................
	result = "";
	makeChanges("name.spaces.my");

	// ............................... Assert .................................
	assert.equal(result,
		"1: Set first and last Event:Set first: - Jo1 Event:Set last: - Blow11: Insert number 1 Event:Insert: - 11: Set first Event:Set first: - Jo1!1: Remove number 1b Event:Remove: - 1b",
		"Synchronous events, with namespace");

	// ................................ Act ..................................
	reset();
	makeChanges("name.spaces.my", batch);
	batch.trigger();

	// ............................... Assert .................................
	assert.equal(result,
		"1: Set first and last1: Insert number 11: Set first1: Remove number 1b Event:Set last: - Blow1 Event:Insert: - 1 Event:Set first: - Jo1! Event:Remove: - 1b",
		"Batched events, with batch.trigger(), with namespace");

	// ................................ Act ..................................
	reset();
	makeChanges("name.another", batch); // Namespace does not match the listener namespace
	batch.trigger();

	// ............................... Assert .................................
	assert.equal(result,
		"1: Set first and last1: Insert number 11: Set first1: Remove number 1b",
		"Batched events, with batch.trigger(), but non-matching namespace");

	// ................................ Act ..................................
	reset();
	makeChanges("my.name.spaces", true);

	// ............................... Assert .................................
	setTimeout(function() {
		assert.equal(result,
			"1: Set first and last1: Insert number 11: Set first1: Remove number 1b Event:Set last: - Blow1 Event:Insert: - 1 Event:Set first: - Jo1! Event:Remove: - 1b",
			"Asynchronous events, with namespace");

		// ................................ Reset ................................
		result = "";
		$.unobserve();
		if (assert.async) { done() } else { start() }
	}, 0);
});

})(this.jQuery);
