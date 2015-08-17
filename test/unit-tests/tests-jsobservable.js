/* test, equal, module, ok*/
(function($, undefined) {
"use strict";

var isIE8 = window.attachEvent && !window.addEventListener,
	listeners,
	result = "",
	calls = 0;

function reset() {
	result = "";
	calls = 0;
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

function onFoo1() { return; }

var address1 = { street: "StreetOne", ZIP: "111" },
	address2 = { street: "StreetTwo", ZIP: "222" },
	home1 = { address: address1 },
	home2 = { address: address2 },
	homeOfOwner = { address: { street: "OwnerStreet" } },
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
	return [person1, "firstName", "~settings.width"];
};

// =============== Callbacks for observeAll ===============
function observeAllCb1(ev, eventArgs) {
	result += "ObserveAll Path: " + ev.data.observeAll.path() + " eventArgs: ";
	for (var key in eventArgs) {
		result += key + ": " + JSON.stringify(eventArgs[key]) + "|";
	}
}

function observeAllCb2(ev, eventArgs) {
	result += "ObserveAll Path: " + ev.data.observeAll.path() + " eventArgs: ";
	for (var key in eventArgs) {
		result += key + ": " + eventArgs[key] + "|";
	}
}

function observeAllCb3(ev, eventArgs) { }

module("jsobservable");

test("dataMap", function() {
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
	var map = sortMap.map(data.rows, {sortby: "name"});

	// ............................... Assert .................................
	equal(viewSrcTgt(map, "name"), "Jeff,Ariel,Pete|ARIEL,JEFF,PETE",
		'map = sortMap.map(data.rows, {sortby: "name"}) creates a map with sorted target');

	// ............................... Assert .................................
	equal(map.options.sortby, "name",
		'map.options is the initial options passed to .map(source, options)');

	// ............................... Assert .................................
	ok(map.src === data.rows,
		'map.src is the source');

	// ................................ Act ..................................
	map.update({sortby: "role"});

	// ............................... Assert .................................
	equal(viewSrcTgt(map, "role"), "Goalie,Consultant,Assistant|ASSISTANT,CONSULTANT,GOALIE",
		'map.update({sortby: "role"}) re-sorts target');

	// ............................... Assert .................................
	equal(map.options.sortby, "role",
		'map.options is the current options - as passed to .update(options)');

	// ................................ Act ..................................
	$.observable(data.rows).insert({
		id: "new",
		name: "Mary",
		role: "Broker"
	});

	// ............................... Assert .................................
	equal(viewSrcTgt(map, "role"), "Goalie,Consultant,Assistant,Broker|ASSISTANT,CONSULTANT,GOALIE",
		'If map has no obsSrc method, target does not update observably');

	// ................................ Act ..................................
	map.update({sortby: "role"});

	// ............................... Assert .................................
	equal(viewSrcTgt(map, "role"), "Goalie,Consultant,Assistant,Broker|ASSISTANT,BROKER,CONSULTANT,GOALIE",
		'map.update({sortby: "role"}) re-sorts target based on current source');

	// ................................ Act ..................................
	var myTarget = [1,2,3],
		map2 = sortMap.map(data.rows, {sortby: "name"}, myTarget);

	// ............................... Assert .................................
	ok(map2.tgt===myTarget,
		'sortMap.map(data.rows, {sortby: "name"}, myTarget) - can provide existing target array to a new map');

	// ............................... Assert .................................
	equal(viewSrcTgt(map2, "name"), "Jeff,Ariel,Pete,Mary|ARIEL,JEFF,MARY,PETE",
		'sortMap.map(data.rows, {sortby: "name"}, myTarget) replaces contents of myTarget array with sorted copy of source array');

	// ................................ Act ..................................
	$.observable(data.rows).remove();

	// ............................... Assert .................................
	equal(viewSrcTgt(map, "role") + "/" + viewSrcTgt(map2, "name"),
		"Goalie,Consultant,Assistant|ASSISTANT,BROKER,CONSULTANT,GOALIE/Jeff,Ariel,Pete|ARIEL,JEFF,MARY,PETE",
		'If map has no obsSrc method, target does not update observably');

	map.update();

	// ............................... Assert .................................
	equal(viewSrcTgt(map, "role") + "/" + viewSrcTgt(map2, "name"),
		"Goalie,Consultant,Assistant|ASSISTANT,CONSULTANT,GOALIE/Jeff,Ariel,Pete|ARIEL,JEFF,MARY,PETE",
		'map.update() will update target to current source using current options (sortby is now "role")');

	// ............................... Assert .................................
	equal(map.options.sortby, "role",
		'map.options is still the current options - as passed previously to .map(source, options) or .update(options)');

	var tgt = map.tgt;

	// ................................ Act ..................................
	map.unmap();

	// ............................... Assert .................................
	ok(map.src === undefined, 'map.unmap() removes src');

	// ................................ Act ..................................
	map.map(data.rows, {sortby: "id"}, tgt);

	// ............................... Assert .................................
	equal(viewSrcTgt(map, "id"), "id1,id2,id3|ID1,ID2,ID3",
		'map.map(source, options, target) will remap to chosen source, options, and target');

	// ................................ Act ..................................
	map.map(data.rows, {sortby: "name"});

	after = (map.tgt === tgt);

	// ............................... Assert .................................
	equal(viewSrcTgt(map, "name") + " " + after, "Jeff,Ariel,Pete|ARIEL,JEFF,PETE true",
		'map.map(source, options) will remap to chosen source and options, and keep target');

	// ................................ Act ..................................
	var otherRows =  [
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

	tgt = map.tgt;

	map.map(otherRows);

	after = (tgt === map.tgt);

	// ............................... Assert .................................
	equal(viewSrcTgt(map, "name") + " " + after, "OtherGuy,Abel|ABEL,OTHERGUY true",
		'map.map(newSource) will remap new source, using current options and target');

	// ................................ Act ..................................
	map.unmap();
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
	map = observableSortMap.map(data.rows, {sortby: "name"});

	// ............................... Assert .................................
	equal(viewSrcTgt(map, "name"), "Jeff,Ariel,Pete|ARIEL,JEFF,PETE",
		'map = observableSortMap.map(data.rows, {sortby: "name"}) creates a map with sorted target');

	// ............................... Assert .................................
	equal(map.options.sortby, "name",
		'map.options is the initial options passed to .map(source, options)');

	// ............................... Assert .................................
	ok(map.src === data.rows,
		'map.src is the source');

	// ................................ Act ..................................
	map.update({sortby: "role"});

	// ............................... Assert .................................
	equal(viewSrcTgt(map, "role"), "Goalie,Consultant,Assistant|ASSISTANT,CONSULTANT,GOALIE",
		'map.update({sortby: "role"}) re-sorts target');

	// ............................... Assert .................................
	equal(map.options.sortby, "role",
		'map.options is the current options - as passed to .update(options)');

	// ................................ Act ..................................
	$.observable(data.rows).insert({
		id: "new",
		name: "Mary",
		role: "Broker"
	});

	// ............................... Assert .................................
	equal(viewSrcTgt(map, "role"), "Goalie,Consultant,Assistant,Broker|ASSISTANT,BROKER,CONSULTANT,GOALIE",
		'If map has an obsSrc method, observable changes to source trigger observable target updates too');

	// ................................ Act ..................................
	map.update({sortby: "role"});

	// ............................... Assert .................................
	equal(viewSrcTgt(map, "role"), "Goalie,Consultant,Assistant,Broker|ASSISTANT,BROKER,CONSULTANT,GOALIE",
		'map.update({sortby: "role"}) re-sorts target based on current source');

	// ................................ Act ..................................
	myTarget = [1,2,3];
	map2 = observableSortMap.map(data.rows, {sortby: "name"}, myTarget);

	// ............................... Assert .................................
	ok(map2.tgt===myTarget,
		'observableSortMap.map(data.rows, {sortby: "name"}, myTarget) - can provide existing target array to a new map');

	// ............................... Assert .................................
	equal(viewSrcTgt(map2, "name"), "Jeff,Ariel,Pete,Mary|ARIEL,JEFF,MARY,PETE",
		'observableSortMap.map(data.rows, {sortby: "name"}, myTarget) replaces contents of myTarget array with sorted copy of source array');

	// ................................ Act ..................................
	$.observable(data.rows).remove(2, 2);

	// ............................... Assert .................................
	equal(viewSrcTgt(map, "role") + "/" + viewSrcTgt(map2, "name"),
		"Goalie,Consultant|CONSULTANT,GOALIE/Jeff,Ariel|ARIEL,JEFF",
		'If map has an obsSrc method, observable changes to source trigger observable target updates too');

	// ................................ Act ..................................
	data.rows.splice(1, 0, {
		id: "inserted",
		name: "Amadeus",
		role: "Musician"
	});
	map.update();

	// ............................... Assert .................................
	equal(viewSrcTgt(map, "role"),
		"Goalie,Musician,Consultant|CONSULTANT,GOALIE,MUSICIAN",
		'map.update() will update target to current source using current options (sortby is now "role")');

	// ................................ Act ..................................
	var before = viewSrcTgt(map2, "name");

	map2.update();

	// ............................... Assert .................................
	equal(before + "/" + viewSrcTgt(map2, "name"),
		"Jeff,Amadeus,Ariel|ARIEL,JEFF/Jeff,Amadeus,Ariel|AMADEUS,ARIEL,JEFF",
		'map2.update() will update target to current source using current options (sortby is now "name")');

	// ............................... Assert .................................
	equal(map.options.sortby, "role",
		'map.options is still the current options - as passed previously to .map(source, options) or .update(options)');

	tgt = map.tgt;
	before = $._data(data.rows).events.arrayChange.length + "-" + ($._data(map.tgt).events === undefined);

	// ................................ Act ..................................
	map.unmap();

	var after = $._data(data.rows).events.arrayChange.length + "-" + ($._data(map.tgt).events === undefined);

	// ............................... Assert .................................
	ok(map.src === undefined,
		'map.unmap() removes src');

	// ............................... Assert .................................
	equal(before + "|" + after, "2-true|1-true",
		'map.unmap() removes dataMap observe bindings from src. (Note: map.tgt has no bindings since obsTgt not defined for this dataMap)');

	// ................................ Act ..................................
	map.map(data.rows, {sortby: "id"}, tgt);

	after = $._data(data.rows).events.arrayChange.length;

	// ............................... Assert .................................
	equal(viewSrcTgt(map, "id") + " events: " + after, "id1,inserted,id2|ID1,ID2,INSERTED events: 2",
		'map.map(source, options, target) will remap to chosen source, options, and target');

	// ................................ Act ..................................

	map.map(data.rows, {sortby: "name"});

	after = $._data(data.rows).events.arrayChange.length + "-" + (map.tgt === tgt);

	// ............................... Assert .................................
	equal(viewSrcTgt(map, "name") + " events: " + after, "Jeff,Amadeus,Ariel|AMADEUS,ARIEL,JEFF events: 2-true",
		'map.map(source, options) will remap to chosen source and options, keep target - and remove previous bindings');

	// ................................ Act ..................................
	otherRows =  [
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

	tgt = map.tgt;

	map.map(otherRows);

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
	equal(viewSrcTgt(map, "name") + " " + after, "OtherGuy,Isabel,Xavier,Abel|ABEL,ISABEL,OTHERGUY,XAVIER 2-true",
		'map.map(newSource) will remap new source, using current options and target');

	// ................................ Act ..................................
	map.unmap();
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
	map = observableSortMap2.map(data.rows, {sortby: "name"});

	// ............................... Assert .................................
	equal(viewSrcTgt(map, "name"), "Jeff,Amadeus,Ariel|AMADEUS,ARIEL,JEFF",
		'map = observableSortMap2.map(data.rows, {sortby: "name"}) with obsTgt creates a map with sorted target');

	$.observable(map.tgt).insert(1, [
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

	equal(viewSrcTgt(map, "name"), "Jeff,Amadeus,Ariel,Mary,Jane|AMADEUS,ARIEL,JANE,JEFF,MARY",
		'If map has an obsTgt method, observable changes to target trigger observable source updates too');

	$.observable(map.tgt).remove(1, 2);

	equal(viewSrcTgt(map, "name"), "Jeff,Amadeus,Mary|AMADEUS,JEFF,MARY",
		'If map has an obsTgt method, observable changes to target trigger observable source updates too');

	map.unmap();
});

test("observeAll", function() {
	reset();

	// =============================== Arrange ===============================
	var inc = 0,
		data = {
			person: {
			  name: "Pete",
			  address: {
				street: "1st Ave",
			  },
			  phones: [{number: "111 111 1111"}, {number:"222 222 2222"}]
			}
		};

	$.observable(data).observeAll(observeAllCb1);

	// ................................ Act ..................................
	$.observable(data.person).setProperty({
		name: "Hermione",
		"address.street": "Main St",
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

	equal(result,
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
		things: [{ thing: "tree" }]
	});
	$.observable(model.things).insert({ thing: "bush" });
	$.observable(model.things).refresh([model.things[1], model.things[0], model.things[1]]);
	$.observable(model.things[2]).setProperty("thing", model.things[2].thing + "+");

	// ............................... Assert .................................
	equal(result, 'ObserveAll Path: root.person1.home eventArgs: change: "set"|path: "address"|value: {"street":"1st","ZIP":"00000"}|oldValue: {"street":"StreetOne","ZIP":"111"}|remove: false|ObserveAll Path: root.person1.home.address eventArgs: change: "set"|path: "street"|value: "upper St"|oldValue: "1st"|remove: false|ObserveAll Path: root.person1.home.address eventArgs: change: "set"|path: "ZIP"|value: "33333"|oldValue: "00000"|remove: false|ObserveAll Path: root eventArgs: change: "set"|path: "things"|value: [{"thing":"tree"}]|oldValue: []|remove: false|ObserveAll Path: root.things eventArgs: change: "insert"|index: 1|items: [{"thing":"bush"}]|ObserveAll Path: root.things eventArgs: change: "refresh"|oldItems: [{"thing":"tree"},{"thing":"bush"}]|ObserveAll Path: root.things[0] eventArgs: change: "set"|path: "thing"|value: "bush+"|oldValue: "bush"|remove: false|',
		"observeAll raises correct change events");

	// ............................... Assert .................................
	listeners = $._data(model).events.propertyChange.length + " "
	+ $._data(model.person1).events.propertyChange.length + " "
	+ $._data(model.person1.home).events.propertyChange.length + " "
	+ $._data(model.person1.home.address).events.propertyChange.length + " "
	+ $._data(model.things).events.arrayChange.length + " "
	+ $._data(model.things[0]).events.propertyChange.length + " "
	+ $._data(model.things[1]).events.propertyChange.length;

	equal(listeners, "1 1 1 1 1 1 1", 'observeAll maintains a single event handler binding on every object in the graph, regardless of structural observable changes made');

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

	equal(listeners, "1 1 1 1 1 1 1", 'Calling observeAll more than once does not add extra event bindings');

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

	equal(listeners, "2 2 2 2 2 2 2", 'Calling observeAll with a different callback adds one binding for the new callback on each object or array');

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

	equal(listeners, "1 1 1 1 1 1 1", 'Calling unobserveAll(myCallback) removes just my callback bindings');

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

	equal(listeners, "2 2 2 2 1 1 1", 'Calling $.observable(objectOrArrayInTree).unobserveAll(myCallback) removes just my callback bindings in the subtree only');

	// ................................ Act ..................................
	$.observable(model).unobserveAll();

	// ............................... Assert .................................
	equal(!$._data(model).events + " "
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

	equal(listeners, "1 1 1", '$.observable(someArray).observeAll(observeAllCb2) works correctly');

	$.observable(model.things).unobserveAll(observeAllCb2);

	// ................................ Reset ..................................
	model = {
		person1: person1,
		person2: person2,
		things: []
	};
	person1.home.address.street = "StreetOne",
	person1.home.address.ZIP = "111";
});

test("observeAll - cyclic graphs", function() {
	reset();

	// =============================== Arrange ===============================
	// Test observeAll using data with cyclic graph - (children/parent cycle)
	var data = { name: "Jo" };

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
	equal(result,
		"ObserveAll Path: root eventArgs: change: set|path: name|value: Hermione|oldValue: Jo|remove: false|"
		+ "ObserveAll Path: root.children[0] eventArgs: change: set|path: name|value: Mary|oldValue: Pete|remove: false|",
		"observeAll with cyclic children/parent graph");

	// ................................ Act ..................................
	$.observable(data).unobserveAll();
	ok(!$._data(data).events && !$._data(data.children).events && !$._data(data.children[0]).events && !$._data(data.children[0].parent).events,
		"unobserveAll with cyclic children/parent graph removes all handlers");

	reset();

	// =============================== Arrange ===============================
	// Test observeAll using data with cyclic graph - (children/parent cycle)
	var data = { name: "Jo" };

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
	equal(result,
		"ObserveAll Path: root eventArgs: change: set|path: name|value: Hermione|oldValue: Jo|remove: false|"
		+ "ObserveAll Path: root.children[1] eventArgs: change: set|path: name|value: Mary|oldValue: Francois|remove: false|"
		+ "ObserveAll Path: root.children eventArgs: change: remove|index: 0|items: [object Object]|ChildListener: false|"
		+ "ObserveAll Path: root.children eventArgs: change: insert|index: 1|items: [object Object]|ChildListener: true|"
		+ "ObserveAll Path: root.children eventArgs: change: remove|index: 1|items: [object Object]|"
		+ "ObserveAll Path: root.children eventArgs: change: remove|index: 0|items: [object Object]|ChildListener: false|ArrayListener: true|",
		"observeAll with cyclic children/parent graph, including remove action");

	// ................................ Act ..................................
	$.observable(data).unobserveAll();
	ok(!$._data(data).events && !$._data(data.children).events,
		"unobserveAll with cyclic children/parent graph removes all handlers");

	reset();

	// =============================== Arrange ===============================
	// Test observeAll using data with cyclic graph - (child/parent cycle and duplicate object property - child/descendant)
	data = { name: "Jo" };

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
	equal(result,
		"ObserveAll Path: root eventArgs: change: set|path: name|value: Hermione|oldValue: Jo|remove: false|"
		+ "ObserveAll Path: root.descendant eventArgs: change: set|path: name|value: Mary|oldValue: Pete|remove: false|"
		+ "ObserveAll Path: root.descendant eventArgs: change: set|path: name|value: Jane|oldValue: Mary|remove: false|",
		"observeAll with cyclic child/parent graph with dup property child/descendant");

	// ................................ Act ..................................
	$.observable(data).unobserveAll();
	ok(!$._data(data).events && !$._data(data.child).events && !$._data(data.descendant).events,
		"unobserveAll with cyclic cyclic child/parent graph with dup property child/descendant removes all handlers");

	reset();

	// =============================== Arrange ===============================
	// Test observeAll using data with cyclic graph - (children/parent cycle)
	data = { name: "Jo" };

	var children = data.children = [
		{
			parent: data,
			name: "Pete"
		}
	];

	child =  data.children[0];

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

	child =  data.children[0];
	result += "NewChildListener: " + !!$._data(child).events + "|";

	$.observable(data).removeProperty("children");

	result += "ArrayListener: " + !!$._data(children).events + "|";

	result += "ChildListener: " + !!$._data(child).events + "|";

	// ............................... Assert .................................
	equal(result,
		"ArrayListener: true|ChildListener: true|"
		+ "ObserveAll Path: root.children eventArgs: change: refresh|oldItems: [object Object]|ArrayListener: true|ChildListener: false|NewChildListener: true|"
		+ "ObserveAll Path: root eventArgs: change: set|path: children|value: undefined|oldValue: [object Object]|remove: true|ArrayListener: false|ChildListener: false|",
		"observeAll with cyclic children/parent graph - action refresh, remove array properties");

	// ................................ Act ..................................
	$.observable(data).unobserveAll();
	ok(!$._data(data).events,
		"unobserveAll with cyclic cyclic children/parent graph removes all handlers");

	reset();

	// =============================== Arrange ===============================
	// Test observeAll using data with cyclic graph - (children/parent cycle and duplicate array - children/descendants)
	data = { name: "Jo" };

	var children = data.children = [
		{
			parent: data,
			name: "Pete"
		}
	];

	child =  data.children[0];

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
	equal(result,
		"ArrayListener: true|ChildListener: true|"
		+ "ObserveAll Path: root.children eventArgs: change: remove|index: 0|items: [object Object]|ArrayListener: true|ChildListener: false|"
		+ "ObserveAll Path: root eventArgs: change: set|path: children|value: string|oldValue: |remove: false|ArrayListener: false|",
		"observeAll with cyclic children/parent graph - action set array to string");

	// ................................ Act ..................................
	$.observable(data).unobserveAll();
	ok(!$._data(data).events,
		"unobserveAll with cyclic cyclic children/parent graph removes all handlers");

	reset();

	// =============================== Arrange ===============================
	// Test observeAll using data with cyclic graph - (children/parent cycle and duplicate array - children/descendants)
	data = { name: "Jo" };

	var children = data.children = [
		{
			parent: data,
			name: "Pete"
		}
	];

	child =  data.children[0];

	$.observable(data).observeAll(observeAllCb2);

	// ................................ Act ..................................
	$.observable(data).setProperty("name", "Hermione");

	$.observable(child).setProperty("name", "Mary");

	$.observable(data.children).refresh([{
			parent: data,
			name: "Fresh"
		}]);

	result += "ChildListener: " + !!$._data(child).events + "|";

	child =  data.children[0];
	result += "NewChildListener: " + !!$._data(child).events + "|";

	result += "ArrayListener: " + !!$._data(children).events + "|";

	$.observable(data).removeProperty("children");

	result += "ArrayListener: " + !!$._data(children).events + "|";

	result += "ChildListener: " + !!$._data(child).events + "|";

	// ............................... Assert .................................
	equal(result,
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
	data = { name: "Jo" };

	var child = data.child = data.descendant = {
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
	equal(result,
		"ObserveAll Path: root eventArgs: change: set|path: name|value: Hermione|oldValue: Jo|remove: false|"
		+ "ObserveAll Path: root.descendant eventArgs: change: set|path: name|value: Mary|oldValue: Pete|remove: false|"
		+ "ObserveAll Path: root eventArgs: change: set|path: child|value: undefined|oldValue: [object Object]|remove: false|ChildListener: true|"
		+ "ObserveAll Path: root eventArgs: change: set|path: descendant|value: undefined|oldValue: [object Object]|remove: true|ChildListener: false|",
		"observeAll with cyclic child/parent graph with dup property child/descendant, with set undefined and removeProperty actions");

	// ................................ Act ..................................
	$.observable(data).unobserveAll();
	ok(!$._data(data).events,
		"unobserveAll with cyclic cyclic child/parent graph with dup property child/descendant removes all handlers");

	reset();

	// NOTE - WE DO NOT support ObserveAll on data with cyclic graphs which include DUPLICATE REFERENCES TO ARRAY PROPERTIES - such as data.children = data.descendants = []
});

test("observeAll/unobserveAll using namespaces", function() {

	reset();

	// =============================== Arrange ===============================
	$.observable(model).observeAll("my.nmspace", observeAllCb1);

	// ................................ Act ..................................
	$.observable(model).setProperty({
		"person1.home.address": {
			street: "1st",
			ZIP: "00000"
		},
		"person1.home.address.street": "upper St",
		"person1.home.address.ZIP": "33333",
		things: [{ thing: "tree" }]
	});
	$.observable(model.things).insert({ thing: "bush" });
	$.observable(model.things).refresh([model.things[1], model.things[0], model.things[1]]);
	$.observable(model.things[2]).setProperty("thing", model.things[2].thing + "+");

	// ............................... Assert .................................
	equal(result, 'ObserveAll Path: root.person1.home eventArgs: change: "set"|path: "address"|value: {"street":"1st","ZIP":"00000"}|oldValue: {"street":"StreetOne","ZIP":"111"}|remove: false|ObserveAll Path: root.person1.home.address eventArgs: change: "set"|path: "street"|value: "upper St"|oldValue: "1st"|remove: false|ObserveAll Path: root.person1.home.address eventArgs: change: "set"|path: "ZIP"|value: "33333"|oldValue: "00000"|remove: false|ObserveAll Path: root eventArgs: change: "set"|path: "things"|value: [{"thing":"tree"}]|oldValue: []|remove: false|ObserveAll Path: root.things eventArgs: change: "insert"|index: 1|items: [{"thing":"bush"}]|ObserveAll Path: root.things eventArgs: change: "refresh"|oldItems: [{"thing":"tree"},{"thing":"bush"}]|ObserveAll Path: root.things[0] eventArgs: change: "set"|path: "thing"|value: "bush+"|oldValue: "bush"|remove: false|',
	"observeAll with namespace raises correct change events");

	// ............................... Assert .................................
	listeners = $._data(model).events.propertyChange.length + " "
	+ $._data(model.person1).events.propertyChange.length + " "
	+ $._data(model.person1.home).events.propertyChange.length + " "
	+ $._data(model.person1.home.address).events.propertyChange.length + " "
	+ $._data(model.things).events.arrayChange.length + " "
	+ $._data(model.things[0]).events.propertyChange.length + " "
	+ $._data(model.things[1]).events.propertyChange.length;

	equal(listeners, "1 1 1 1 1 1 1", 'observeAll with namespace maintains a single event handler binding on every object in the graph, regardless of structural observable changes made');

	// ................................ Act ..................................
	$.observable(model).observeAll("my.nmspace", observeAllCb1);

	// ............................... Assert .................................
	listeners = $._data(model).events.propertyChange.length + " "
	+ $._data(model.person1).events.propertyChange.length + " "
	+ $._data(model.person1.home).events.propertyChange.length + " "
	+ $._data(model.person1.home.address).events.propertyChange.length + " "
	+ $._data(model.things).events.arrayChange.length + " "
	+ $._data(model.things[0]).events.propertyChange.length + " "
	+ $._data(model.things[1]).events.propertyChange.length;

	equal(listeners, "1 1 1 1 1 1 1", 'Calling observeAll with namespace more than once does not add extra event bindings');

	// ................................ Act ..................................
	$.observable(model).observeAll("my.nmspace", observeAllCb3);

	// ............................... Assert .................................
	listeners = $._data(model).events.propertyChange.length + " "
	+ $._data(model.person1).events.propertyChange.length + " "
	+ $._data(model.person1.home).events.propertyChange.length + " "
	+ $._data(model.person1.home.address).events.propertyChange.length + " "
	+ $._data(model.things).events.arrayChange.length + " "
	+ $._data(model.things[0]).events.propertyChange.length + " "
	+ $._data(model.things[1]).events.propertyChange.length;

	equal(listeners, "2 2 2 2 2 2 2", 'Calling observeAll with namespace with a different callback adds one binding for the new callback on each object or array');

	// ................................ Act ..................................
	$.observable(model).unobserveAll("my.nmspace");

	// ............................... Assert .................................
	equal(!$._data(model).events + " "
		+ !$._data(model.person1).events + " "
		+ !$._data(model.person1.home).events + " "
		+ !$._data(model.person1.home.address).events + " "
		+ !$._data(model.things).events + " "
		+ !$._data(model.things[0]).events + " "
		+ !$._data(model.things[1]).events,
		"true true true true true true true",
		'Calling unobserveAll("my.nmspace") removes all bindings with that namespace');

	// ................................ Act ..................................
	$.observable(model).observeAll("my.nmspace", observeAllCb1);
	$.observable(model).observeAll("our.nmspace", observeAllCb1);

	// ............................... Assert .................................
	listeners = $._data(model).events.propertyChange.length + " "
	+ $._data(model.person1).events.propertyChange.length + " "
	+ $._data(model.person1.home).events.propertyChange.length + " "
	+ $._data(model.person1.home.address).events.propertyChange.length + " "
	+ $._data(model.things).events.arrayChange.length + " "
	+ $._data(model.things[0]).events.propertyChange.length + " "
	+ $._data(model.things[1]).events.propertyChange.length;

	equal(listeners, "2 2 2 2 2 2 2", 'Calling observeAll with different namespaces adds one binding for each namespace for each object or array');

	// ................................ Act ..................................
	$.observable(model).unobserveAll("my.nmspace");

	// ............................... Assert .................................
	listeners = $._data(model).events.propertyChange.length + " "
	+ $._data(model.person1).events.propertyChange.length + " "
	+ $._data(model.person1.home).events.propertyChange.length + " "
	+ $._data(model.person1.home.address).events.propertyChange.length + " "
	+ $._data(model.things).events.arrayChange.length + " "
	+ $._data(model.things[0]).events.propertyChange.length + " "
	+ $._data(model.things[1]).events.propertyChange.length;

	equal(listeners, "1 1 1 1 1 1 1", 'Calling unobserveAll("my.nmspace") removes all bindings with that namespace');

	// ................................ Act ..................................
	$.observable(model).observeAll("my.nmspace our.nmspace", observeAllCb1);

	// ............................... Assert .................................
	listeners = $._data(model).events.propertyChange.length + " "
	+ $._data(model.person1).events.propertyChange.length + " "
	+ $._data(model.person1.home).events.propertyChange.length + " "
	+ $._data(model.person1.home.address).events.propertyChange.length + " "
	+ $._data(model.things).events.arrayChange.length + " "
	+ $._data(model.things[0]).events.propertyChange.length + " "
	+ $._data(model.things[1]).events.propertyChange.length;

	equal(listeners, "2 2 2 2 2 2 2", 'Calling observeAll with whitespace-separated namespaces adds one binding for each namespace (if not already bound) for each object or array');

	// ................................ Act ..................................
	$.observable(model).observeAll("my.nmspace", observeAllCb1);

	$.observable(model.things).unobserveAll("my.nmspace", observeAllCb1);

	// ............................... Assert .................................
	listeners = $._data(model).events.propertyChange.length + " "
	+ $._data(model.person1).events.propertyChange.length + " "
	+ $._data(model.person1.home).events.propertyChange.length + " "
	+ $._data(model.person1.home.address).events.propertyChange.length + " "
	+ $._data(model.things).events.arrayChange.length + " "
	+ $._data(model.things[0]).events.propertyChange.length + " "
	+ $._data(model.things[1]).events.propertyChange.length;

	equal(listeners, "2 2 2 2 1 1 1", 'Calling $.observable(objectOrArrayInTree).unobserveAll("my.nmspace", myCallback) removes just my callback bindings in the subtree only');

	// ................................ Act ..................................
	$.observable(model).unobserveAll();

	// ............................... Assert .................................
	equal(!$._data(model).events + " "
		+ !$._data(model.person1).events + " "
		+ !$._data(model.person1.home).events + " "
		+ !$._data(model.person1.home.address).events + " "
		+ !$._data(model.things).events + " "
		+ !$._data(model.things[0]).events + " "
		+ !$._data(model.things[1]).events,
		"true true true true true true true",
	'unobserveAll() with no callback and no namespace removes all bindings from the tree');

	// ................................ Act ..................................
	$.observable(model.things).observeAll("my.nmspace", observeAllCb1);

	// ............................... Assert .................................
	listeners = $._data(model.things).events.arrayChange.length + " "
	+ $._data(model.things[0]).events.propertyChange.length + " "
	+ $._data(model.things[1]).events.propertyChange.length;

	equal(listeners, "1 1 1", '$.observable("my.nmspace", someArray).observeAll(changeHandler) works correctly');

	$.observable(model.things).unobserveAll(observeAllCb1);

	// ................................ Act ..................................
	$.observable(model).observeAll("my.nmspace", observeAllCb1);
	$.observable(model).observeAll("our.nmspace", observeAllCb1);
	$.observable(model).unobserveAll("my.nmspace our.nmspace");

	// ............................... Assert .................................
	equal(!$._data(model).events + " "
		+ !$._data(model.person1).events + " "
		+ !$._data(model.person1.home).events + " "
		+ !$._data(model.person1.home.address).events + " "
		+ !$._data(model.things).events + " "
		+ !$._data(model.things[0]).events + " "
		+ !$._data(model.things[1]).events,
		"true true true true true true true",
	'unobserveAll("my.nmspace our.nmspace") removes all bindings for each namespace in whitespace-separated list');

	// ................................ Act ..................................
	$.observable(model).observeAll("my.nmspace", observeAllCb1);
	$.observable(model).observeAll("our.nmspace", observeAllCb1);
	$.observable(model).unobserveAll("nmspace");

	// ............................... Assert .................................
	equal(!$._data(model).events + " "
		+ !$._data(model.person1).events + " "
		+ !$._data(model.person1.home).events + " "
		+ !$._data(model.person1.home.address).events + " "
		+ !$._data(model.things).events + " "
		+ !$._data(model.things[0]).events + " "
		+ !$._data(model.things[1]).events,
		"true true true true true true true",
	'unobserveAll("nmspace") removes all bindings for all namespaces that include that namespace component');

	// ................................ Reset ..................................
	model = {
		person1: person1,
		person2: person2,
		things: []
	};
	person1.home.address.street = "StreetOne",
	person1.home.address.ZIP = "111";

});
})(this.jQuery);
