/// <reference path="../_references.js" />
(function($, global, QUnit, undefined) {
"use strict";
(function() {

/* Setup */

// =============== Model ===============
	function fullName(reverse, upper) {
		var name = reverse ? (this.lastName + " " + this.firstName()) : this.firstName() + " " + this.lastName;
		return upper ? name.toUpperCase() : name;
	}

	fullName.depends = function(object) {
		return [
			"firstName",
			function(object) {
				return "lastName";
			}
		];
	}

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
		$.observable(this).setProperty("_firstName", val);
	}

	Person.prototype = personProto;

	function updown(val, lower) {
		lower = this.tagCtx.props.lower !== undefined ? this.tagCtx.props.lower : lower;
		val = person1.firstName() + (val||"");
		return (lower === true ? val.toLowerCase() : val.toUpperCase()) + settings.width + this.tagCtx.props.added;
	}

	function sort( array ) {
		var ret = "";
		if ( this.tagCtx.props.reverse ) {
			// Render in reverse order
			var test = this.tagCtx.view.getRsc("helpers", "foo");
			if (arguments.length > 1) {
				for ( i = arguments.length; i; i-- ) {
					ret += sort.call( this, arguments[ i - 1 ]);
				}
			} else for ( var i = array.length; i; i-- ) {
				ret += this._.tmpl.render( array[ i - 1 ] );
			}
		} else {
			// Render in original order
			ret += this._.tmpl.render( array );
		}
		return ret;
	}

// =============== DATA ===============

	function onFoo1() { return; }

	var address1 = { street: "StreetOne", ZIP: "111" },
		address2 = { street: "StreetTwo", ZIP: "222" },
		home1 = { address: address1 },
		home2 = { address: address2 },
		homeOfOwner = { address: {street: "OwnerStreet"} },
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

	personProto.firstName.depends = ["_firstName", settings, "title"];

	updown.depends = function(tagCtx) {
		return [person, "firstName", "~settings.width"];
	}

// =============== RESOURCES ===============
	var foo = {
			markup: "#personTmpl"
		};

	$.views
		.converters({
			upper: updown,
			cvtBack: function(val){
				return val;
			}
		})
		.helpers({
			settings: settings,
			upper: updown
		})
		.templates({personTmpl: foo})
		.tags({
			tmplTag: {
				template: "Name: {{:firstName()}}. Width: {{:~settings.width}}",
				depends: ["firstName", "~settings.width"],
				onBeforeLink: function() {
				},
				onAfterLink: function() {
				}
			},
			fnTag: {
				render: function() {
					return "Name: " + this.tagCtx.view.data.firstName() + ". Width: " + this.ctx.settings.width;
				},
				depends: ["firstName", "~settings.width"]
			},
			fnTagElNoInit: function() {
				return "<span>Name: " + this.tagCtx.view.data.firstName() + ". Width: " + this.ctx.settings.width + "</span>";
			},
			tmplTagEl: {
				template: "<span>Name: {{:firstName()}}. Width: {{:~settings.width}}</span>",
				depends: ["firstName", "~settings.width"]
			},
			fnTagEl: {
				render: function() {
					return "<span>Name: " + this.tagCtx.view.data.firstName() + ". Width: " + this.ctx.settings.width + "</span>";
				},
				depends: ["firstName", "~settings.width"]
			},
			fnTagElCnt: {
				render: function() {
					return "<li>Name: " + this.tagCtx.view.data.firstName() + ". Width: " + this.ctx.settings.width + "</li>";
				},
				depends: ["firstName", "~settings.width"]
			},
			fnTagElCntNoInit: function() {
				return "<li>Name: " + this.tagCtx.view.data.firstName() + ". Width: " + this.ctx.settings.width + "</li>";
			},
			fnTagWithProps: {
				render: function(data, val) {
					return "Name: " + this.tagCtx.view.data.firstName() + ". Width: " + this.ctx.settings.width + ". Value: " + val + ". Prop theTitle: " + this.tagCtx.props.theTitle + ". Prop ~street: " + this.ctx.street;
				},
				depends: ["firstName", "~settings.width"]
			},
			tmplTagWithProps: {
				render: function(val) {
					this.ctx.theTitle = this.tagCtx.props.theTitle;
				},
				template: "Name: {{:firstName()}}. Width: {{:~settings.width}}. Value: {{:~settings.reverse}}. Prop theTitle: {{:~theTitle}}. Prop ~street: {{:~street}}",
				depends: ["firstName", "~settings.width"]
			}
		});

	var topData = {people: people};
	$.views.tags({
		myWrap: {},
		myWrap2: {},
		myFlow: {
			flow: true
		},
		myWrapElCnt: {
			attr: "html",
			render: function() {
				return "<tbody>" + this.renderContent() + "</tbody>";
			},
			onAfterLink: function() {
				//debugger;
			}
		},
		myWrap2ElCnt: {
			attr: "html",
			render: function() {
				return "<td>" + this.renderContent() + "</td>";
			},
			onAfterLink: function() {
				//debugger;
			}
		},
		myFlowElCnt: {
			attr: "html",
			flow: true,
			render: function() {
				return "<td>" + this.renderContent() + "</td>";
			}
		}
	});

	$.templates({

		tmplHierarchy:

			'{{for people ~val=1}}'
				+ '{{if true ~index=#index}}'
					+ '{{myWrap val=1}}'
						+ '<span id="{{:~index+1}}">'
							+ '<em>a</em>'
							+ '{{myWrap2}}'
								+ '{{if true}}xx<span id="sp{{:#getIndex()}}"></span>{{/if}}'
							+ '{{/myWrap2}}'
							+ '{{if true}}'
								+ '<span>yy</span>'
							+ '{{/if}}'
							+ '{{myFlow}}'
								+ '<span>zz</span>'
							+ '{{/myFlow}}'
						+ '</span>'
					+ '{{/myWrap}}'
					+ '{{myWrap val=2/}}'
				+ '{{/if}}'
				+ 'www<span id="b{{:#index+1}}"></span>'
			+ '{{/for}}',

		tmplHierarchyElCnt:

			'<table>{{for people ~val=1}}'
				+ '{{if true ~index=#index}}'
					+ '{{myWrapElCnt val=1}}'
						+ '<tr id="tr{{:~index+1}}">'
							+ '{{myWrap2ElCnt}}'
								+ 'xx<span id="sp{{:#getIndex()+1}}"></span>'
							+ '{{/myWrap2ElCnt}}'
							+ '{{if true}}'
								+ '<td id="td{{:~index+1}}">yy</td>'
							+ '{{/if}}'
							+ '{{myFlowElCnt}}'
								+ 'xx<span id="spInFlow{{:#getIndex()+1}}"></span>'
							+ '{{/myFlowElCnt}}'
						+ '</tr>'
					+ '{{/myWrapElCnt}}'
					+ '{{myWrapElCnt val=2/}}'
					+ '<tbody>33</tbody>'
				+ '{{/if}}'
			+ '{{/for}}</table>',

		boundTmplHierarchy:

			'{{for people ~val=1}}'
				+ '{{if true ~index=#index}}'
					+ '{^{myWrap val=1}}'
						+ '<span id="{{:~index+1}}">'
							+ '<em>a</em>'
							+ '{^{myWrap2}}'
								+ '{{if true}}xx<span id="sp{{:#getIndex()}}"></span>{{/if}}'
								+ '{^{myFlow val=3}}xyz{{/myFlow}}'
							+ '{{/myWrap2}}'
							+ '{{if true}}'
								+ '<td>yy</td>'
							+ '{{/if}}'
							+ '{^{myFlow val=4}}'
								+ '<span>zz</span>'
							+ '{{/myFlow}}'
						+ '</span>'
					+ '{{/myWrap}}'
					+ '{^{myWrap val=2/}}'
					+ '{{myWrap "this is unbound"/}}'
				+ '{{/if}}'
				+ 'www<span id="b{{:#index+1}}"></span>'
			+ '{{/for}}',

		boundTmplHierarchyElCnt:

			'<table>{{for people ~val=1}}'
				+ '{{if true ~index=#index}}'
					+ '{^{myWrapElCnt val=1}}'
						+ '<tr id="tr{{:~index+1}}">'
							+ '{^{myWrap2ElCnt}}'
								+ 'xx<span id="sp{{:#getIndex()+1}}"></span>'
								+ '{^{myFlow val=3}}xyz{{/myFlow}}'
							+ '{{/myWrap2ElCnt}}'
							+ '{{if true}}'
								+ '<td id="td{{:~index+1}}">yy</td>'
							+ '{{/if}}'
							+ '{^{myFlowElCnt val=4}}'
								+ 'xx<span id="spInFlow{{:#getIndex()+1}}"></span>'
							+ '{{/myFlowElCnt}}'
						+ '</tr>'
					+ '{{/myWrapElCnt}}'
					+ '{^{myWrapElCnt val=2/}}'
					+ '{{myWrapElCnt "this is unbound"/}}'
				+ '{{/if}}'
				+ '<tbody id="b{{:#index+1}}"></tbody>'
			+ '{{/for}}</table>',

		boundTmplHierarchyElCntWithDataLink: '<table data-link="{myWrapElCnt val=1 tmpl=\'wrapCnt\' inline=true} class{:lastName}"></table>',

		wrapCnt: '<tr id="tr{{:~index+1}}" data-link="{myWrap2ElCnt val=2 tmpl=\'innerWrap\' inline=true}"></tr>',

		innerWrap: 'xx<span id="sp{{:#getIndex()+1}}"></span>'
	});



// =============== INIT APP ===============

var viewContent, before, after, tmpl, lastEvData, lastEventArgs, listeners, result1, handlersCount, elems,
	result = "",
	calls = 0;

function reset() {
	result = "";
	calls = 0;
}

function myListener(ev, eventArgs) {
	calls++;
	lastEventArgs = eventArgs;
	lastEvData = ev.data;
	var oldValue = eventArgs.oldValue,
		value = eventArgs.value;

	oldValue = (typeof oldValue === "function") ? (oldValue = "" + oldValue, oldValue.slice(0, oldValue.indexOf("{"))) : oldValue;
	value = (typeof value === "function") ? (value = "" + value, value.slice(0, value.indexOf("{"))) : value;
	result += "calls: " + calls
		+ ", ev.data: prop: " + ev.data.prop + (ev.data.path ? ", path: " + ev.data.path : "")
		+ ", eventArgs: oldValue: " + oldValue + " value: " + value + ", eventArgs.path: " + eventArgs.path + "|";
}

// End Setup

//test("TEST", function() {
//});
//return;

module("API - data-link");

test("link(expression, container, data)", function() {

	// =============================== Arrange ===============================
	$("#result").html('<span id="inner"></span>')
	$.link("lastName", "#inner", person1);

	// ................................ Act ..................................
	before = $("#inner").html();
	$.observable(person1).setProperty("lastName", "newLast");
	after = $("#inner").html();

	// ............................... Assert .................................
	equal(before + "|" + after,
	'One|newLast',
	'$.link("fieldName", "#container", data) links field to content of container (equivalent to data-link="fieldName")');
	// -----------------------------------------------------------------------

	// =============================== Arrange ===============================

	// ................................ Act ..................................
	$("#result").empty();

	// ............................... Assert .................................

	ok(!viewsAndBindings() && !$._data(person1).events,
	"$(container).empty removes current listeners from that content");
	// -----------------------------------------------------------------------

	// ................................ Reset ................................
	person1.lastName = "One"; // reset Prop

	// =============================== Arrange ===============================

	$("#result").html('<span id="inner"></span>')
	$.link("person1.lastName + ' ' + person1.home.address^street", "#inner", model);

	// ................................ Act ..................................
	before = $("#inner").html();
	$.observable(person1).setProperty("lastName", "newLast");
	$.observable(person1.home).setProperty("address", address2); // Using deep observability
	after = $("#inner").html();

	// ............................... Assert .................................
	equal(before + "|" + after,
	'One StreetOne|newLast StreetTwo',
	'$.link("expression", "#container", data) links expression to content of container (equivalent to data-link="fieldName")');
	// -----------------------------------------------------------------------

	// =============================== Arrange ===============================

	// ................................ Act ..................................
	$("#result").empty();

	// ............................... Assert .................................

	ok(!viewsAndBindings() && !$._data(person1).events && !$._data(person1.home).events,
	"$(container).empty removes current listeners from that content");
	// -----------------------------------------------------------------------

	// ................................ Reset ................................
	person1.lastName = "One"; // reset Prop
	home1.address = address1; // reset Prop

	// =============================== Arrange ===============================

	var tmpl = $.templates("{{for #data}}{^{:lastName}}{{/for}}");
	$.link(tmpl, "#result", person1);

	// ................................ Act ..................................
	before = $("#result").text();
	$.observable(person1).setProperty("lastName", "newLast");
	after = $("#result").text();

	// ............................... Assert .................................
	equal(before + "|" + after,
	'One|newLast',
	'$.link(template, "#container", data) links template to content of container (equivalent to template.link(container, data)');
	// -----------------------------------------------------------------------

	// =============================== Arrange ===============================

	// ................................ Act ..................................
	$("#result").empty();

	// ............................... Assert .................................

	ok(!viewsAndBindings() && !$._data(person1).events,
	"$(container).empty removes both views and current listeners from that content");
	// -----------------------------------------------------------------------

	// ................................ Reset ................................
	person1.lastName = "One"; // reset Prop

});

test('data-link="expression"', function() {

	// =============================== Arrange ===============================

	$.templates('prop: <span data-link="lastName"></span>')
		.link("#result", person1);

	// ................................ Act ..................................
	before = $("#result span").html();
	$.observable(person1).setProperty("lastName", "newLast");
	after = $("#result span").html();

	// ............................... Assert .................................
	equal(before + "|" + after,
	'One|newLast',
	'Data link using: <span data-link="lastName"></span>');
	// -----------------------------------------------------------------------

	// ................................ Reset ................................
	$("#result").empty();
	person1.lastName = "One"; // reset Prop

	// =============================== Arrange ===============================

	$.templates('prop: <input id="last" data-link="lastName"/>')
		.link("#result", person1);

	// ................................ Act ..................................
	before = $("#last").val();
	$.observable(person1).setProperty("lastName", "newLast");
	after = $("#last").val();

	// ............................... Assert .................................
	equal(before + "|" + after,
	'One|newLast',
	'Data link using: <input data-link="lastName"/> binds from data');
	// -----------------------------------------------------------------------

	// ................................ Act ..................................
	$("#result input").val("editedName").change();
	after = $("#result").html() + $("#last").val();

	// ............................... Assert .................................
	equal(person1.lastName, "editedName",
	'Data link using: <input data-link="lastName"/> does two-way binding');
	// -----------------------------------------------------------------------

	// ................................ Reset ................................
	$("#result").empty();
	person1.lastName = "One"; // reset Prop

	// =============================== Arrange ===============================

	$.templates('prop: <span data-link="person1.lastName + \' \' + person1.home^address.street"></span>')
		.link("#result", model);

	// ................................ Act ..................................
	before = $("#result span").html();
	$.observable(person1).setProperty("lastName", "newLast");
	$.observable(person1.home).setProperty("address", address2); // Using deep observability
	after = $("#result span").html();

	// ............................... Assert .................................
	equal(before + "|" + after,
	'One StreetOne|newLast StreetTwo',
	'Data link using: <span data-link="expression"></span>');
	// -----------------------------------------------------------------------

	// ................................ Act ..................................
	$("#result").empty();
	before = $("#result").html();

	// ............................... Assert .................................
	ok(!viewsAndBindings() && !$._data(person1).events && !$._data(home1).events && !$._data(address2).events,
	"$(container).empty removes both views and current listeners from that content - including after swapping data on deep paths");
	// -----------------------------------------------------------------------

	person1.lastName = "One"; // reset Prop
	home1.address = address1; // reset Prop

	// =============================== Arrange ===============================

	$.templates('<span data-link="fullName()"></span>')
		.link("#result", person1);

	// ................................ Act ..................................
	before = $("#result span").html();
	$.observable(person1).setProperty({firstName: "newFirst", lastName: "newLast"});
	$.observable(settings).setProperty("title", "Sir");
	after = $("#result span").html();

	// ............................... Assert .................................
	equal(before + "|" + after,
	'Mr Jo One|Sir newFirst newLast',
	'data-link="fullName()"');
	// -----------------------------------------------------------------------

	// ................................ Reset ................................
	person1._firstName = "Jo"; // reset Prop
	person1.lastName = "One"; // reset Prop
	settings.title = "Mr"; // reset Prop

	// =============================== Arrange ===============================

	$.templates('<span data-link="person1.home.address.street"></span><span data-link="person1.home^address.street"></span>')
		.link("#result", model);

	// ................................ Act ..................................
	elems = $("#result span");
	before = elems[0].innerHTML + elems[1].innerHTML;
	$.observable(address1).setProperty("street", "newStreetOne");
	$.observable(person1).setProperty("home", home2);
	elems = $("#result span");
	after = elems[0].innerHTML + elems[1].innerHTML;

	// ............................... Assert .................................
	equal(before + "|" + after,
	'StreetOneStreetOne|newStreetOneStreetTwo',
	'person1.home.address.street binds only to the leaf, but person1.home^address.street does deep binding');

	// ................................ Reset ................................
	$("#result").empty();
	address1.street = "StreetOne";
	person1.home = home1;

	// =============================== Arrange ===============================

	$.templates('<span data-link="~model.person1.home^address.street"></span>')
		.link("#result", 1, {model: model});

	// ................................ Act ..................................
	before = $("#result span").html();
	$.observable(address1).setProperty("street", "newStreetOne");
	$.observable(person1).setProperty("home", home2);
	$.observable(address2).setProperty("street", address2.street + "+");
	after = $("#result span").html();

	// ............................... Assert .................................
	equal(before + "|" + after,
	'StreetOne|StreetTwo+',
	'~a.b^c does deep binding');

	// ................................ Reset ................................
	$("#result").empty();
	address1.street = "StreetOne";
	person1.home = home1;
	address2.street = "StreetTwo";

	// =============================== Arrange ===============================

	var util1 = {getVal: function(val) {return "getVal1 = " + val;}};
	var util2 = {getVal: function(val) {return "getVal2 = " + val;}};
	var appHelpers = {util: util1};

	$.templates('<span data-link="~app.util^getVal(#data)"></span>')
		.link("#result", 22, {app: appHelpers});

	// ................................ Act ..................................
	before = $("#result span").html();
	$.observable(appHelpers).setProperty("util", util2);
	after = $("#result span").html();
	$.observable(util2).setProperty("getVal", function(val) {return "getNewVal = " + val;});
	after += "|" + $("#result span").html();

	// ............................... Assert .................................
	equal(before + "|" + after,
	'getVal1 = 22|getVal2 = 22|getNewVal = 22',
	'~a.b.helperFunction() does deep binding even for functions');

	// ................................ Reset ................................
	$("#result").empty();

});

test('data-link="{cvt:expression:cvtBack}"', function() {

	// =============================== Arrange ===============================

	$.templates('prop: <span data-link="{upper:lastName true added=firstName()}"></span>')
		.link("#result", person2);

	// ................................ Act ..................................
	before = $("#result span").html();
	$.observable(person1).setProperty({firstName: "newOneFirst", lastName: "newOneLast"});
	$.observable(person2).setProperty({firstName: "newTwoFirst", lastName: "newTwoLast"});
	$.observable(settings).setProperty({ title: "Sir", width: 40});
	after = $("#result span").html();

	// ............................... Assert .................................
	equal(before + "|" + after,
	"mr jotwo30Mr Xavier|sir newonefirstnewtwolast30Sir newTwoFirst",
	'Data link using: <span data-link="{cvt:expr ...}"></span> - with declared dependencies for converter');
	// -----------------------------------------------------------------------

	// ................................ Reset ................................
	$("#result").empty();
	person1._firstName = "Jo"; // reset Prop
	person1.lastName = "One"; // reset Prop
	person2._firstName = "Xavier"; // reset Prop
	person2.lastName = "Two"; // reset Prop
	settings.title = "Mr"; // reset Prop
	settings.width = 30; // reset Prop

	// =============================== Arrange ===============================
	$.views
		.converters({
			from: function(val, amount) {
				return val + "from" + amount + this.tagCtx.props.frst;
			},
			to: function(val){
				return val + "to" + this.tagCtx.args[1] + this.tagCtx.props.frst;
			}
		});

	// =============================== Arrange ===============================

	$.templates('prop: <input id="twoWay" data-link="{:lastName 88 frst=firstName():to}"/>')
		.link("#result", person1);

	// ................................ Act ..................................
	var value = $("#twoWay").val();
	$("#twoWay").val(value + "+").change();

	// ............................... Assert .................................
	equal(person1.lastName,
	"One+to88Mr Jo",
	'Data link using: <input data-link="{:expr:to}"/>  with no convert. - convertBack called with tag as this pointer.');
	// -----------------------------------------------------------------------

	// ................................ Reset ................................
	$("#result").empty();
	person1.lastName = "One"; // reset Prop

	// =============================== Arrange ===============================

	$.templates('prop: <input id="twoWay" data-link="{from:lastName 99 frst=firstName():to}"/>')
		.link("#result", person1);

	// ................................ Act ..................................
	value = $("#twoWay").val();
	$("#twoWay").val(value + "+").change();

	// ............................... Assert .................................
	equal(person1.lastName,
	"Onefrom99Mr Jo+to99Mr Jo",
	'Data link using: <input data-link="{from:expr:to}"/> - convert and convertBack called with tag as this pointer.');
	// -----------------------------------------------------------------------

	// ................................ Reset ................................
	$("#result").empty();
	person1.lastName = "One"; // reset Prop
});

test('data-link="{tag...}"', function() {

	// =============================== Arrange ===============================

	$.templates('<span data-link="{tmplTag}"></span>')
		.link("#result", person1, {settings: settings});

	// ................................ Act ..................................
	before = $("#result span").text();
	$.observable(person1).setProperty({firstName: "newFirst", lastName: "newLast"});
	$.observable(settings).setProperty({ title: "Sir", width: 40});
	$.observable(person1).setProperty({fullName: "compFirst compLast"});
	after = $("#result span").text();

	// ............................... Assert .................................
	equal(before + "|" + after,
	'Name: Mr Jo. Width: 30|Name: Sir compFirst. Width: 40',
	'Data link using: <span data-link="{tmplTag}"></span>');
	// -----------------------------------------------------------------------

	// ................................ Reset ................................
	$("#result").empty();
	person1._firstName = "Jo"; // reset Prop
	person1.lastName = "One"; // reset Prop
	settings.title = "Mr"; // reset Prop
	settings.width = 30; // reset Prop

	// =============================== Arrange ===============================

	$.templates('<span data-link="{fnTag}"></span>')
		.link("#result", person1, {settings: settings});

	// ................................ Act ..................................
	before = $("#result span").text(); 
	$.observable(person1).setProperty({firstName: "newFirst", lastName: "newLast"});
	$.observable(settings).setProperty({ title: "Sir", width: 40});
	$.observable(person1).setProperty({fullName: "compFirst compLast"});
	after = $("#result span").text();

	// ............................... Assert .................................
	equal(before + "|" + after,
	'Name: Mr Jo. Width: 30|Name: Sir compFirst. Width: 40',
	'Data link using: <span data-link="{fnTag}"></span>');
	// -----------------------------------------------------------------------

	// ................................ Reset ................................
	$("#result").empty();
	person1._firstName = "Jo"; // reset Prop
	person1.lastName = "One"; // reset Prop
	settings.title = "Mr"; // reset Prop
	settings.width = 30; // reset Prop

	// =============================== Arrange ===============================

	$.templates('<div data-link="{fnTagEl}"></div>')
		.link("#result", person1, {settings: settings});

	// ................................ Act ..................................
	before = $("#result div").html();
	$.observable(person1).setProperty({firstName: "newFirst", lastName: "newLast"});
	$.observable(settings).setProperty({ title: "Sir", width: 40});
	$.observable(person1).setProperty({fullName: "compFirst compLast"});
	after = $("#result div").html();

	// ............................... Assert .................................
	equal(before + "|" + after,
	'<span>Name: Mr Jo. Width: 30</span>|<span>Name: Sir compFirst. Width: 40</span>',
	'Data link fnTagEl rendering <span>, using: <div data-link="{fnTagEl}"></div>');
	// -----------------------------------------------------------------------

	// ................................ Reset ................................
	$("#result").empty();
	person1._firstName = "Jo"; // reset Prop
	person1.lastName = "One"; // reset Prop
	settings.title = "Mr"; // reset Prop
	settings.width = 30; // reset Prop

	// =============================== Arrange ===============================

	$.templates('<ul data-link="{fnTagElCnt}"></ul>')
		.link("#result", person1, {settings: settings});

	// ................................ Act ..................................
	before = $("#result ul li").html(); // The innerHTML will be "<li data-jsv=\"#25_\">Name: Mr Jo. Width: 30</li>"
	$.observable(person1).setProperty({firstName: "newFirst", lastName: "newLast"});
	$.observable(settings).setProperty({ title: "Sir", width: 40});
	$.observable(person1).setProperty({fullName: "compFirst compLast"});
	after = $("#result ul li").html();

	// ............................... Assert .................................
	equal(before + "|" + after,
	'Name: Mr Jo. Width: 30|Name: Sir compFirst. Width: 40',
	'Data link fnTagElCnt rendering <li>, using: <ul data-link="{fnTagElCnt}"></ul>');
	// -----------------------------------------------------------------------

	// ................................ Reset ................................
	$("#result").empty();
	person1._firstName = "Jo"; // reset Prop
	person1.lastName = "One"; // reset Prop
	settings.title = "Mr"; // reset Prop
	settings.width = 30; // reset Prop

	// =============================== Arrange ===============================

	$.templates('<ul data-link="{fnTagElCntNoInit firstName ~settings.width}"></ul>')
		.link("#result", person1, {settings: settings});

	// ................................ Act ..................................
	before = $("#result ul li").html(); // The innerHTML will be "<li data-jsv=\"#25_\">Name: Mr Jo. Width: 30</li>"
	$.observable(person1).setProperty({firstName: "newFirst", lastName: "newLast"});
	$.observable(settings).setProperty({ title: "Sir", width: 40});
	$.observable(person1).setProperty({fullName: "compFirst compLast"});
	after = $("#result ul li").html();

	// ............................... Assert .................................
	equal(before + "|" + after,
	'Name: Mr Jo. Width: 30|Name: Sir compFirst. Width: 40',
	'Data link fnTagElCntNoInit rendering <li>, using: <ul data-link="{fnTagElCnt}"></ul>');
	// -----------------------------------------------------------------------

	// ................................ Reset ................................
	$("#result").empty();
	person1._firstName = "Jo"; // reset Prop
	person1.lastName = "One"; // reset Prop
	settings.title = "Mr"; // reset Prop
	settings.width = 30; // reset Prop

	// =============================== Arrange ===============================

	$.templates('<span data-link="{tmplTagWithProps #data ~settings.reverse theTitle=~settings.title ~street=home.address.street}"></span>')
		.link("#result", person1, {settings: settings});

	// ................................ Act ..................................
	before = $("#result span").text();
	$.observable(person1).setProperty({firstName: "newFirst", lastName: "newLast", "home.address.street": "newStreet"});
	$.observable(settings).setProperty({ title: "Sir", width: 40, reverse: false});
	$.observable(person1).setProperty({fullName: "compFirst compLast"});
	after = $("#result span").text();

	// ............................... Assert .................................
	equal(before + "|" + after,
	'Name: Mr Jo. Width: 30. Value: true. Prop theTitle: Mr. Prop ~street: StreetOne|Name: Sir compFirst. Width: 40. Value: false. Prop theTitle: Sir. Prop ~street: newStreet',
	'Data link using: <span data-link="{tmplTagWithProps ~some.path foo=~other.path ~bar=another.path}"></span> updates correctly when data changes');
	// -----------------------------------------------------------------------

	// ................................ Reset ................................
	$("#result").empty();
	person1._firstName = "Jo"; // reset Prop
	person1.lastName = "One"; // reset Prop
	settings.title = "Mr"; // reset Prop
	settings.width = 30; // reset Prop
	settings.reverse = true; // reset Prop
	address1.street = "StreetOne"; // reset Prop

	// =============================== Arrange ===============================

	$.templates('<span data-link="{fnTagWithProps #data ~settings.reverse theTitle=~settings.title ~street=home.address.street}"></span>')
		.link("#result", person1, {settings: settings});

	// ................................ Act ..................................
	before = $("#result span").text();
	$.observable(person1).setProperty({firstName: "newFirst", lastName: "newLast", "home.address.street": "newStreet"});
	$.observable(settings).setProperty({ title: "Sir", width: 40, reverse: false});
	$.observable(person1).setProperty({fullName: "compFirst compLast"});
	after = $("#result span").text();

	// ............................... Assert .................................
	equal(before + "|" + after,
	'Name: Mr Jo. Width: 30. Value: true. Prop theTitle: Mr. Prop ~street: StreetOne|Name: Sir compFirst. Width: 40. Value: false. Prop theTitle: Sir. Prop ~street: newStreet',
	'Data link using: <span data-link="{fnTagWithProps ~some.path foo=~other.path ~bar=another.path}"></span> updates correctly when data changes');
	// -----------------------------------------------------------------------

	// ................................ Reset ................................
	$("#result").empty();
	person1._firstName = "Jo"; // reset Prop
	person1.lastName = "One"; // reset Prop
	settings.title = "Mr"; // reset Prop
	settings.width = 30; // reset Prop
	settings.reverse = true; // reset Prop
	address1.street = "StreetOne"; // reset Prop

});

test("{^{:expression}}", function() {

	// =============================== Arrange ===============================

	$.templates('prop:{^{:lastName}}')
		.link("#result", person1);

	// ................................ Act ..................................
	before = $("#result").text();
	$.observable(person1).setProperty("lastName", "newLast");
	after = $("#result").text();

	// ............................... Assert .................................
	equal(before + "|" + after,
	'prop:One|prop:newLast',
	'Data link using: {^{:lastName}}');
	// -----------------------------------------------------------------------

	// =============================== Arrange ===============================

	// ................................ Act ..................................

	$("#result").empty();

	// ............................... Assert .................................

	ok(!viewsAndBindings() && !$._data(person1).events,
	"$(container).empty removes both views and current listeners from that content");
	// -----------------------------------------------------------------------

	// ................................ Reset ................................
	person1.lastName = "One"; // reset Prop

	// =============================== Arrange ===============================

	var tmpl = $.templates("{^{:#data.person1.home.address.street}}{^{:person1.home^address.street}}")
	$.link(tmpl, "#result", model);

	// ................................ Act ..................................
	before = $("#result").text();
	$.observable(address1).setProperty("street", "newStreetOne");
	$.observable(person1).setProperty("home", home2); // Deep change
	after = $("#result").text();

	// ............................... Assert .................................
	equal(before + "|" + after,
	"StreetOneStreetOne|newStreetOneStreetTwo",
	'#data.person1.home.address.street binds only to the leaf, but person1.home^address.street does deep binding');

	// ................................ Reset ................................
	$("#result").empty();
	address1.street = "StreetOne";
	person1.home = home1;

});

test("{^{tag}}", function() {

	// =============================== Arrange ===============================

	$.templates('{^{tmplTag/}}')
		.link("#result", person1, {settings: settings});

	// ................................ Act ..................................
	before = $("#result").text();
	$.observable(person1).setProperty({firstName: "newFirst", lastName: "newLast"});
	$.observable(settings).setProperty({ title: "Sir", width: 40});
	$.observable(person1).setProperty({fullName: "compFirst compLast"});
	after = $("#result").text();

	// ............................... Assert .................................
	equal(before + "|" + after, 'Name: Mr Jo. Width: 30|Name: Sir compFirst. Width: 40',
	'Data link with: {^{tmplTag/}} updates when dependant object paths change');
	// -----------------------------------------------------------------------

	// ................................ Reset ................................
	$("#result").empty();
	person1._firstName = "Jo"; // reset Prop
	person1.lastName = "One"; // reset Prop
	settings.title = "Mr"; // reset Prop
	settings.width = 30; // reset Prop

	// =============================== Arrange ===============================

	$.templates('{{tmplTag/}}')
		.link("#result", person1, {settings: settings});

	// ................................ Act ..................................
	before = $("#result").text();
	$.observable(person1).setProperty({firstName: "newFirst", lastName: "newLast"});
	$.observable(settings).setProperty({ title: "Sir", width: 40});
	$.observable(person1).setProperty({fullName: "compFirst compLast"});
	after = $("#result").text();

	// ............................... Assert .................................
	ok(before === 'Name: Mr Jo. Width: 30' && before === after && !$._data(person1).events && !$._data(settings).events,
	'Data link with: {{tmplTag/}} does nothing');
	// -----------------------------------------------------------------------

	// ................................ Reset ................................
	$("#result").empty();
	person1._firstName = "Jo"; // reset Prop
	person1.lastName = "One"; // reset Prop
	settings.title = "Mr"; // reset Prop
	settings.width = 30; // reset Prop

	// =============================== Arrange ===============================

	$.templates('{^{fnTag/}}')
		.link("#result", person1, {settings: settings});

	// ................................ Act ..................................
	before = $("#result").text();
	$.observable(person1).setProperty({firstName: "newFirst", lastName: "newLast"});
	$.observable(settings).setProperty({ title: "Sir", width: 40});
	$.observable(person1).setProperty({fullName: "compFirst compLast"});
	after = $("#result").text();

	// ............................... Assert .................................
	equal(before + "|" + after, 'Name: Mr Jo. Width: 30|Name: Sir compFirst. Width: 40',
	'Data link with: {^{fnTag/}} updates when dependant object paths change');
	// -----------------------------------------------------------------------

	// ................................ Reset ................................
	$("#result").empty();
	person1._firstName = "Jo"; // reset Prop
	person1.lastName = "One"; // reset Prop
	settings.title = "Mr"; // reset Prop
	settings.width = 30; // reset Prop

	// =============================== Arrange ===============================

	$.templates('{{fnTag/}}')
		.link("#result", person1, {settings: settings});

	// ................................ Act ..................................
	before = $("#result").text();
	$.observable(person1).setProperty({firstName: "newFirst", lastName: "newLast"});
	$.observable(settings).setProperty({ title: "Sir", width: 40});
	$.observable(person1).setProperty({fullName: "compFirst compLast"});
	after = $("#result").text();

	// ............................... Assert .................................
	ok(before === 'Name: Mr Jo. Width: 30' && before === after && !$._data(person1).events && !$._data(settings).events,
	'Data link with: {{fnTag/}} does nothing');
	// -----------------------------------------------------------------------

	// ................................ Reset ................................
	$("#result").empty();
	person1._firstName = "Jo"; // reset Prop
	person1.lastName = "One"; // reset Prop
	settings.title = "Mr"; // reset Prop
	settings.width = 30; // reset Prop

	// =============================== Arrange ===============================

	$.templates('<div>{^{fnTagEl/}}</div>')
		.link("#result", person1, {settings: settings});

	// ................................ Act ..................................
	before = $("#result div *")[1].outerHTML // The innerHTML will be <script type="jsv#^6_"></script>Name: Sir compFirst. Width: 40<script type="jsv/^6_"></script>
	$.observable(person1).setProperty({firstName: "newFirst", lastName: "newLast"});
	$.observable(settings).setProperty({ title: "Sir", width: 40});
	$.observable(person1).setProperty({fullName: "compFirst compLast"});
	after = $("#result div *")[1].outerHTML;
	// ............................... Assert .................................
	equal(before + "|" + after,
	'<span>Name: Mr Jo. Width: 30</span>|<span>Name: Sir compFirst. Width: 40</span>',
	'Data link with: {^{fnTagEl/}} rendering <span>, updates when dependant object paths change');
	// -----------------------------------------------------------------------

	// ................................ Reset ................................
	$("#result").empty();
	person1._firstName = "Jo"; // reset Prop
	person1.lastName = "One"; // reset Prop
	settings.title = "Mr"; // reset Prop
	settings.width = 30; // reset Prop

	// =============================== Arrange ===============================
	$.templates('<div>{^{fnTagElNoInit firstName ~settings.width/}}</div>')
		.link("#result", person1, {settings: settings});

	// ................................ Act ..................................
	before = $("#result div span").html(); // The innerHTML will be ""<li data-jsv=\"#37_\">Name: Mr Jo. Width: 30</li>"
	$.observable(person1).setProperty({firstName: "newFirst", lastName: "newLast"});
	$.observable(settings).setProperty({ title: "Sir", width: 40});
	$.observable(person1).setProperty({fullName: "compFirst compLast"});
	after = $("#result div span").html();

	// ............................... Assert .................................
	equal(before + "|" + after,
	'Name: Mr Jo. Width: 30|Name: Sir compFirst. Width: 40',
	'Data link with {^{fnTagElNoInit}} rendering <span>, updates when dependant object paths change');
	// -----------------------------------------------------------------------

	// ................................ Reset ................................
	$("#result").empty();
	person1._firstName = "Jo"; // reset Prop
	person1.lastName = "One"; // reset Prop
	settings.title = "Mr"; // reset Prop
	settings.width = 30; // reset Prop

	// =============================== Arrange ===============================

	$.templates('<ul>{^{fnTagElCnt/}}</ul>')
		.link("#result", person1, {settings: settings});

	// ................................ Act ..................................
	before = $("#result ul li").html(); // The innerHTML will be ""<li data-jsv=\"#37_\">Name: Mr Jo. Width: 30</li>"
	$.observable(person1).setProperty({firstName: "newFirst", lastName: "newLast"});
	$.observable(settings).setProperty({ title: "Sir", width: 40});
	$.observable(person1).setProperty({fullName: "compFirst compLast"});
	after = $("#result ul li").html();

	// ............................... Assert .................................
	equal(before + "|" + after,
	'Name: Mr Jo. Width: 30|Name: Sir compFirst. Width: 40',
	'Data link with {^{fnTagElCnt}} rendering <li>, updates when dependant object paths change');
	// -----------------------------------------------------------------------

	// ................................ Reset ................................
	$("#result").empty();
	person1._firstName = "Jo"; // reset Prop
	person1.lastName = "One"; // reset Prop
	settings.title = "Mr"; // reset Prop
	settings.width = 30; // reset Prop

	// =============================== Arrange ===============================

	$.templates('<ul>{^{fnTagElCntNoInit firstName ~settings.width/}}</ul>')
		.link("#result", person1, {settings: settings});

	// ................................ Act ..................................
	before = $("#result ul li").html(); // The innerHTML will be ""<li data-jsv=\"#37_\">Name: Mr Jo. Width: 30</li>"
	$.observable(person1).setProperty({firstName: "newFirst", lastName: "newLast"});
	$.observable(settings).setProperty({ title: "Sir", width: 40});
	$.observable(person1).setProperty({fullName: "compFirst compLast"});
	after = $("#result ul li").html();

	// ............................... Assert .................................
	equal(before + "|" + after,
	'Name: Mr Jo. Width: 30|Name: Sir compFirst. Width: 40',
	'Data link with {^{fnTagElCntNoInit}} rendering <li>, updates when dependant object paths change');
	// -----------------------------------------------------------------------

	// ................................ Reset ................................
	$("#result").empty();
	person1._firstName = "Jo"; // reset Prop
	person1.lastName = "One"; // reset Prop
	settings.title = "Mr"; // reset Prop
	settings.width = 30; // reset Prop

	// =============================== Arrange ===============================

	$.templates('{^{tmplTagWithProps #data ~settings.reverse theTitle=~settings.title ~street=home.address.street/}}')
		.link("#result", person1, {settings: settings});

	// ................................ Act ..................................
	before = $("#result").text();
	$.observable(person1).setProperty({firstName: "newFirst", lastName: "newLast", "home.address.street": "newStreet"});
	$.observable(settings).setProperty({ title: "Sir", width: 40, reverse: false});
	$.observable(person1).setProperty({fullName: "compFirst compLast"});
	after = $("#result").text();

	// ............................... Assert .................................
	equal(before + "|" + after, 'Name: Mr Jo. Width: 30. Value: true. Prop theTitle: Mr. Prop ~street: StreetOne|Name: Sir compFirst. Width: 40. Value: false. Prop theTitle: Sir. Prop ~street: newStreet',
	'Data link with: {^{tmplTagWithProps ~some.path foo=~other.path ~bar=another.path/}} updates when dependant object paths change');
	// -----------------------------------------------------------------------

	// ................................ Reset ................................
	$("#result").empty();
	person1._firstName = "Jo"; // reset Prop
	person1.lastName = "One"; // reset Prop
	settings.title = "Mr"; // reset Prop
	settings.width = 30; // reset Prop
	settings.reverse = true; // reset Prop
	address1.street = "StreetOne"; // reset Prop

	// =============================== Arrange ===============================

	$.templates('{{tmplTagWithProps #data ~settings.reverse theTitle=~settings.title ~street=home.address.street/}}')
		.link("#result", person1, {settings: settings});

	// ................................ Act ..................................
	before = $("#result").text();
	$.observable(person1).setProperty({firstName: "newFirst", lastName: "newLast", "home.address.street": "newStreet"});
	$.observable(settings).setProperty({ title: "Sir", width: 40, reverse: false});
	$.observable(person1).setProperty({fullName: "compFirst compLast"});
	after = $("#result").text();

	// ............................... Assert .................................
	ok(before === 'Name: Mr Jo. Width: 30. Value: true. Prop theTitle: Mr. Prop ~street: StreetOne' && before === after && !$._data(person1).events && !$._data(settings).events,
	'Data link with: {{tmplTagWithProps ~some.path foo=~other.path ~bar=another.path/}} does nothing');
	// -----------------------------------------------------------------------

	// ................................ Reset ................................
	$("#result").empty();
	person1._firstName = "Jo"; // reset Prop
	person1.lastName = "One"; // reset Prop
	settings.title = "Mr"; // reset Prop
	settings.width = 30; // reset Prop
	settings.reverse = true; // reset Prop
	address1.street = "StreetOne"; // reset Prop

	// =============================== Arrange ===============================

	$.templates('{^{fnTagWithProps #data ~settings.reverse theTitle=~settings.title ~street=home.address.street/}}')
		.link("#result", person1, {settings: settings});

	// ................................ Act ..................................
	before = $("#result").text();
	$.observable(person1).setProperty({firstName: "newFirst", lastName: "newLast", "home.address.street": "newStreet"});
	$.observable(settings).setProperty({ title: "Sir", width: 40, reverse: false});
	$.observable(person1).setProperty({fullName: "compFirst compLast"});
	after = $("#result").text();

	// ............................... Assert .................................
	equal(before + "|" + after, 'Name: Mr Jo. Width: 30. Value: true. Prop theTitle: Mr. Prop ~street: StreetOne|Name: Sir compFirst. Width: 40. Value: false. Prop theTitle: Sir. Prop ~street: newStreet',
	'Data link with: {^{fnTagWithProps ~some.path foo=~other.path ~bar=another.path/}} updates when dependant object paths change');
	// -----------------------------------------------------------------------

	// ................................ Reset ................................
	$("#result").empty();
	person1._firstName = "Jo"; // reset Prop
	person1.lastName = "One"; // reset Prop
	settings.title = "Mr"; // reset Prop
	settings.width = 30; // reset Prop
	settings.reverse = true; // reset Prop
	address1.street = "StreetOne"; // reset Prop

	// =============================== Arrange ===============================

	$.templates('{{fnTagWithProps #data ~settings.reverse theTitle=~settings.title ~street=home.address.street/}}')
		.link("#result", person1, {settings: settings});

	// ................................ Act ..................................
	before = $("#result").text();
	$.observable(person1).setProperty({firstName: "newFirst", lastName: "newLast", "home.address.street": "newStreet"});
	$.observable(settings).setProperty({ title: "Sir", width: 40, reverse: false});
	$.observable(person1).setProperty({fullName: "compFirst compLast"});
	after = $("#result").text();

	// ............................... Assert .................................
	ok(before === 'Name: Mr Jo. Width: 30. Value: true. Prop theTitle: Mr. Prop ~street: StreetOne' && before === after && !$._data(person1).events && !$._data(settings).events,
	'Data link with: {{fnTagWithProps ~some.path foo=~other.path ~bar=another.path/}} does nothing');
	// -----------------------------------------------------------------------

	// ................................ Reset ................................
	$("#result").empty();
	person1._firstName = "Jo"; // reset Prop
	person1.lastName = "One"; // reset Prop
	settings.title = "Mr"; // reset Prop
	settings.width = 30; // reset Prop
	settings.reverse = true; // reset Prop
	address1.street = "StreetOne"; // reset Prop

});

test("{^{for}}", function() {

	// =============================== Arrange ===============================

	// ................................ Act ..................................
	$.templates("testTmpl", '{{if ~things.length}}<tbody>{{for ~things}}<tr><td>{{:thing}}</td></tr>{{/for}}</tbody>{{/if}}')
	$.templates('<table><thead><tr><td>top</td></tr></thead>{{for things ~things=things tmpl="testTmpl"/}}</table>')
		.link("#result", model);

	before = $("#result td").text();
	$.observable(model.things).insert(0, {thing: "tree"});
	after = $("#result").text();

	// ............................... Assert .................................
	equal(before + "|" + after, 'top|toptree',
	'Complex template, with empty placeholder for tbody after thead, and subsequent data-linked insertion of tbody');
	// -----------------------------------------------------------------------

	// =============================== Arrange ===============================

	// ................................ Act ..................................
	$.view("#result", true).refresh();
	result = "" + (after === $("#result").text());
	$.view("#result", true).views["_2"].refresh();
	result += " " + (after === $("#result").text());
	$.view("#result", true).views["_2"].views[0].refresh();
	result += " " + (after === $("#result").text());
	$.view("#result", true).views["_2"].views[0].views["_2"].refresh();
	result += " " + (after === $("#result").text());
	$.view("#result", true).views["_2"].views[0].views["_2"].views["_2"].refresh();
	result += " " + (after === $("#result").text());
	$.view("#result", true).views["_2"].views[0].views["_2"].views["_2"].views[0].refresh();
	result += " " + (after === $("#result").text());


	// ............................... Assert .................................
	equal(result, 'true true true true true true',
	'view refresh at all levels correctly maintains content');
	// -----------------------------------------------------------------------

	// ................................ Reset ................................
	$("#result").empty();
	model.things = []; // reset Prop

	// =============================== Arrange ===============================

	$.templates("<ul>{{for}}<li>Name: {{:firstName()}}. Width: {{:~settings.width}}</li>{{/for}}</ul>")
		.link("#result", person1, {settings: settings});

	// ................................ Act ..................................
	before = $("#result ul li").html(); // The innerHTML will be <script type="jsv#^6_"></script>Name: Sir compFirst. Width: 40<script type="jsv/^6_"></script>
	person1.fullName.set.call(person1, "compFirst compLast");
	settings.title = "Sir";
	settings.width = 40;
	$.view("li").refresh();
	after = $("#result ul li").html();

	// ............................... Assert .................................
	equal(before + "|" + after,
	'Name: Mr Jo. Width: 30|Name: Sir compFirst. Width: 40',
	'Calling view("li").refresh() for a view in element-only content (elCnt true) updates correctly: "<ul>{{for}}<li>...</li>{{/for}}</ul>"' );
	// -----------------------------------------------------------------------

	// ................................ Reset ................................
	$("#result").empty();
	person1._firstName = "Jo"; // reset Prop
	person1.lastName = "One"; // reset Prop
	settings.title = "Mr"; // reset Prop
	settings.width = 30; // reset Prop

	// =============================== Arrange ===============================

	$.templates('{{for things}}<div>#index:<b data-link="#index"></b> #view.index:<b data-link="#view.index"></b> {{:thing}} Nested:{{for true}}{{for true}} #get(\'item\').index:<em data-link="#get(\'item\').index"></em> #parent.parent.index:<em data-link="#parent.parent.index"></em>|{{/for}}{{/for}}</div>{{/for}}')
		.link("#result", model);

	// ................................ Act ..................................
	$.observable(model.things).insert(0, {thing: "tree"});
	$.observable(model.things).insert(0, {thing: "bush"});

	// ............................... Assert .................................
	equal($("#result").text(), "#index:0 #view.index:0 bush Nested: #get('item').index:0 #parent.parent.index:0|#index:1 #view.index:1 tree Nested: #get('item').index:0 #parent.parent.index:1|",
	'Data-link to "#index" and "#get(\'item\').index" works correctly - but note that currently #get(\'item\').index does NOT update through data-linking. TODO provide as computed observable value');
	// -----------------------------------------------------------------------

	// ................................ Reset ................................
	$.unlink(true, "#result");
	$("#result").empty();
	model.things = []; // reset Prop

	// =============================== Arrange ===============================
	$.templates('<div><ul>{{for things}}xxx{{/for}}</ul></div>')
		.link("#result", model);

	// ................................ Act ..................................
	$("#result div").empty();

	// ............................... Assert .................................

	ok(viewsAndBindings().split(" ").length === 3 // We removed view inside div, but still have the view for the outer template.
		&& !$._data(model.things).events,
		'$(container).empty removes listeners for empty tags in element-only content (_dfr="#n_/n_")');
	// -----------------------------------------------------------------------
});

test('data-link="{tag...} and {^{tag}} in same template"', function() {

	// =============================== Arrange ===============================

	$.templates('{^{tmplTag/}}-{^{:lastName}} <span data-link="{tmplTag}"></span>-<span data-link="lastName"></span><input data-link="lastName"/>')
		.link("#result", person1);

	// ................................ Act ..................................
	before = $("#result").text() + $("#result input").val();
	$.observable(person1).setProperty({firstName: "newFirst", lastName: "newLast"});
	$.observable(settings).setProperty({ title: "Sir", width: 40});
	after = $("#result").text() + $("#result input").val();

	// ............................... Assert .................................
	equal(before + "|" + after,
	'Name: Mr Jo. Width: 30-One Name: Mr Jo. Width: 30-OneOne|Name: Sir newFirst. Width: 40-newLast Name: Sir newFirst. Width: 40-newLastnewLast'
,
	'Data link using: {^{tmplTag/}} {^{:lastName}} <span data-link="{tmplTag}"></span><span data-link="lastName"></span><input data-link="lastName"/>');
	// -----------------------------------------------------------------------

	// ................................ Reset ................................
	$("#result").empty();
	person1._firstName = "Jo"; // reset Prop
	person1.lastName = "One"; // reset Prop
	settings.title = "Mr"; // reset Prop
	settings.width = 30; // reset Prop

	// =============================== Arrange ===============================

	$.templates('prop:{^{:lastName}}<span data-link="lastName"></span><input id="last" data-link="lastName"/> computed:{^{:fullName()}}<span data-link="fullName()"></span><input id="full" data-link="fullName()"/> Tag:{^{tmplTag/}}<span data-link="{tmplTag}"></span>')
		.link("#result", person1);

	// ................................ Act ..................................
	before = $("#result").text() + $("#last").val() + $("#full").val();
	$.observable(person1).setProperty({firstName: "newFirst", lastName: "newLast"});
	$.observable(settings).setProperty({ title: "Sir", width: 40});
	$.observable(person1).setProperty({fullName: "compFirst compLast"});
	after = $("#result").text() + $("#last").val() + $("#full").val();

	// ............................... Assert .................................
	equal(before + "|" + after,
	'prop:OneOne computed:Mr Jo OneMr Jo One Tag:Name: Mr Jo. Width: 30Name: Mr Jo. Width: 30OneMr Jo One|prop:compLastcompLast computed:Sir compFirst compLastSir compFirst compLast Tag:Name: Sir compFirst. Width: 40Name: Sir compFirst. Width: 40compLastSir compFirst compLast',
	'Data link using: {^{:lastName}} <span data-link="lastName"></span> <input id="last" data-link="lastName"/> {^{:fullName()}}<span data-link="fullName()"></span> <input data-link="fullName()"/> {^{tmplTag/}} <span data-link="{tmplTag}"></span>');
	// -----------------------------------------------------------------------

	// =============================== Arrange ===============================

	// ................................ Act ..................................
	$("#result").empty();

	// ............................... Assert .................................

	ok(!viewsAndBindings() && !$._data(person1).events && !$._data(settings).events,
	"$(container).empty removes the views and current listeners from that content");
	// -----------------------------------------------------------------------

	// ................................ Reset ................................
	person1._firstName = "Jo"; // reset Prop
	person1.lastName = "One"; // reset Prop
	settings.title = "Mr"; // reset Prop
	settings.width = 30; // reset Prop

	// =============================== Arrange ===============================

	$.templates('prop:{^{:lastName}}<span data-link="lastName"></span><input id="last" data-link="lastName"/> computed:{^{:fullName()}}<span data-link="fullName()"></span><input id="full" data-link="fullName()"/> Tag:{^{tmplTag/}}<span data-link="{tmplTag}"></span>')
		.link("#result", person1);

	// ................................ Act ..................................
	before = $("#result").text() + $("#last").val() + $("#full").val();
	$.observable(person1).setProperty({firstName: "newFirst", lastName: "newLast"});
	$.observable(settings).setProperty({ title: "Sir", width: 40});
	$.observable(person1).setProperty({fullName: "compFirst compLast"});
	after = $("#result").text() + $("#last").val() + $("#full").val();

	// ............................... Assert .................................
	result = 'prop:OneOne computed:Mr Jo OneMr Jo One Tag:Name: Mr Jo. Width: 30Name: Mr Jo. Width: 30OneMr Jo One|prop:compLastcompLast computed:Sir compFirst compLastSir compFirst compLast Tag:Name: Sir compFirst. Width: 40Name: Sir compFirst. Width: 40compLastSir compFirst compLast'

	// ................................ Act ..................................
	$.unlink(true, "#result");

	// ............................... Assert .................................

	ok(before + "|" + after === result && !viewsAndBindings() && !$._data(person1).events && !$._data(settings).events,
	"$.unlink(true, container) removes the views and current listeners from that content");
	// -----------------------------------------------------------------------

	// ................................ Reset ................................
	person1._firstName = "Jo"; // reset Prop
	person1.lastName = "One"; // reset Prop
	settings.title = "Mr"; // reset Prop
	settings.width = 30; // reset Prop

	// =============================== Arrange ===============================

	$.templates('prop:{^{:lastName}}<span data-link="lastName"></span><input id="last" data-link="lastName"/> computed:{^{:fullName()}}<span data-link="fullName()"></span><input id="full" data-link="fullName()"/> Tag:{^{tmplTag/}}<span data-link="{tmplTag}"></span>')
		.link("#result", person1);

	// ................................ Act ..................................
	before = $("#result").text() + $("#last").val() + $("#full").val();
	$.observable(person1).setProperty({firstName: "newFirst", lastName: "newLast"});
	$.observable(settings).setProperty({ title: "Sir", width: 40});
	$.observable(person1).setProperty({fullName: "compFirst compLast"});
	after = $("#result").text() + $("#last").val() + $("#full").val();

	// ............................... Assert .................................
	result = 'prop:OneOne computed:Mr Jo OneMr Jo One Tag:Name: Mr Jo. Width: 30Name: Mr Jo. Width: 30OneMr Jo One|prop:compLastcompLast computed:Sir compFirst compLastSir compFirst compLast Tag:Name: Sir compFirst. Width: 40Name: Sir compFirst. Width: 40compLastSir compFirst compLast'

	// ................................ Act ..................................
	viewContent = viewsAndBindings()

	$.observable.unobserve(person1, "*", settings, "*");

	// ............................... Assert .................................

	ok(before + "|" + after === result && viewContent === viewsAndBindings() && !$._data(person1).events && !$._data(settings).events,
	'$.observable.unobserve(person1, "*", settings, "*") removes the current listeners from that content, but leaves the views');
	// -----------------------------------------------------------------------

	// ................................ Reset ................................
	person1._firstName = "Jo"; // reset Prop
	person1.lastName = "One"; // reset Prop
	settings.title = "Mr"; // reset Prop
	settings.width = 30; // reset Prop

	// =============================== Arrange ===============================

	$.templates('prop:{^{:lastName}}<span data-link="lastName"></span><input id="last" data-link="lastName"/> computed:{^{:fullName()}}<span data-link="fullName()"></span><input id="full" data-link="fullName()"/> Tag:{^{tmplTag/}}<span data-link="{tmplTag}"></span>')
		.link("#result", person1);

	// ................................ Act ..................................
	before = $("#result").text() + $("#last").val() + $("#full").val();
	$.observable(person1).setProperty({firstName: "newFirst", lastName: "newLast"});
	$.observable(settings).setProperty({ title: "Sir", width: 40});
	$.observable(person1).setProperty({fullName: "compFirst compLast"});
	after = $("#result").text() + $("#last").val() + $("#full").val();

	// ............................... Assert .................................
	result = 'prop:OneOne computed:Mr Jo OneMr Jo One Tag:Name: Mr Jo. Width: 30Name: Mr Jo. Width: 30OneMr Jo One|prop:compLastcompLast computed:Sir compFirst compLastSir compFirst compLast Tag:Name: Sir compFirst. Width: 40Name: Sir compFirst. Width: 40compLastSir compFirst compLast'

	// ................................ Act ..................................
	$.unlink();

	// ............................... Assert .................................

	ok(before + "|" + after === result && !viewsAndBindings() && !$._data(person1).events && !$._data(settings).events,
	'$.unlink() removes all views and listeners from the page');
	// -----------------------------------------------------------------------

	// ................................ Reset ................................
	person1._firstName = "Jo"; // reset Prop
	person1.lastName = "One"; // reset Prop
	settings.title = "Mr"; // reset Prop
	settings.width = 30; // reset Prop

// TODO ADDITIONAL TESTS:
// 1: link(null, data) to link whole document
});

module("API - PropertyChange");

test("PropertyChange: setProperty()", 3, function() {

	// =============================== Arrange ===============================
	reset();
	$.observable.observe(person1.home.address, "street", myListener);

	// ................................ Act ..................................
	$.observable(person1.home.address).setProperty("street", "newValue");

	// ............................... Assert .................................
	equals(result, "calls: 1, ev.data: prop: street, eventArgs: oldValue: StreetOne value: newValue, eventArgs.path: street|",
	"setProperty triggers 'observer.observe() callbacks with ev and eventArgs correctly populated");
	// -----------------------------------------------------------------------

	// ................................ Reset ................................
	person1.home.address.street = "StreetOne"; // reset Prop
	result1 = result;
	reset();

	// =============================== Arrange ===============================

	// ................................ Act ..................................
	$.observable(person1.home).setProperty("address.street", "newValue");

	// ............................... Assert .................................
	equals(result, result1,
	"setProperty on deep path is equivalent to setProperty on last object before leaf");
	// -----------------------------------------------------------------------

	// ................................ Reset ................................
	person1.home.address.street = "StreetOne"; // reset Prop
	reset();

	// =============================== Arrange ===============================

	// ................................ Act ..................................
	$.observable(person1).setProperty("home.address.street", "newValue");

	// ............................... Assert .................................
	equals(result, result1,
	"setProperty on even deeper path is equivalent to setProperty on last object before leaf");
	// -----------------------------------------------------------------------

	// ................................ Reset ................................
	person1.home.address.street = "StreetOne"; // reset Prop
	reset();

	// =============================== Teardown ===============================
	$.observable.unobserve(person1.home.address, "street", myListener);
});

module("API - ArrayChange");

test("ArrayChange: insert()", function() {
	// =============================== Arrange ===============================
	$.views.tags({
		liTag: function() {
			return "<li>Tag</li>"
		}
	});

	model.things = [{thing: "Orig"}]; // reset Prop

	$.templates('<ul>{^{liTag/}}{{for things}}<li>{{:thing}}</li>{^{liTag/}}{{/for}}<li>|after</li></ul>')
		.link("#result", model);

	// ................................ Act ..................................
	$.observable(model.things).insert(0, {thing: "First"});
	$.observable(model.things).insert(1, {thing: "Last"});
	$.observable(model.things).insert(1, {thing: "Middle"});

	// ............................... Assert .................................
	equal($("#result").text(), "TagFirstTagMiddleTagLastTagOrigTag|after",
	'Within element only content, insertion finds correctly the previous view, prevNode, nextNode, etc and establishes correct element order and binding');
	// -----------------------------------------------------------------------

	// ................................ Reset ................................
	//$.unlink(true, "#result");
	$("#result").empty();
	model.things = []; // reset Prop

	// =============================== Arrange ===============================
	$.views.tags({
		spanTag: function() {
			return "<span>Tag</span>"
		}
	});

	model.things = [{thing: "Orig"}]; // reset Prop

	$.templates('<div>{^{spanTag/}}{{for things}}<span>{{:thing}}</span>{^{spanTag/}}{{/for}}<span>|after</span></div>')
		.link("#result", model);

	// ................................ Act ..................................
	$.observable(model.things).insert(0, {thing: "First"});
	$.observable(model.things).insert(1, {thing: "Last"});
	$.observable(model.things).insert(1, {thing: "Middle"});

	// ............................... Assert .................................
	equal($("#result").text(), "TagFirstTagMiddleTagLastTagOrigTag|after",
	'Within regular content, insertion finds correctly the previous view, prevNode, nextNode, etc and establishes correct element/textNode order and binding');
	// -----------------------------------------------------------------------

	// ................................ Reset ................................
	$.unlink(true, "#result");
	$("#result").empty();
	model.things = []; // reset Prop

// =============================== Arrange ===============================
	$.views.tags({
		txtTag: function() {
			return "Tag"
		}
	});

	model.things = [{thing: "Orig"}]; // reset Prop

	$.templates('{^{txtTag/}}{{for things}}{{:thing}}</span>{^{txtTag/}}{{/for}}|after')
		.link("#result", model);

	// ................................ Act ..................................
	$.observable(model.things).insert(0, {thing: "First"});
	$.observable(model.things).insert(1, {thing: "Last"});
	$.observable(model.things).insert(1, {thing: "Middle"});

	// ............................... Assert .................................
	equal($("#result").text(), "TagFirstTagMiddleTagLastTagOrigTag|after",
	'Within regular content between text nodes, insertion finds correctly the previous view, prevNode, nextNode, etc and establishes correct text node order and binding');
	// -----------------------------------------------------------------------

	// ................................ Reset ................................
	$.unlink(true, "#result");
	$("#result").empty();
	model.things = []; // reset Prop

});

module("API - observe()");

test("observe/unobserve alternative signatures", function() {
	// =============================== Arrange ===============================
	reset();
	// ................................ Act ..................................
	$.observable.observe(person1.home.address, "street", myListener);
	$.observable(person1.home.address).setProperty("street", "newValue");

	// ............................... Assert .................................
	equals(result, "calls: 1, ev.data: prop: street, eventArgs: oldValue: StreetOne value: newValue, eventArgs.path: street|",
	"$.observable.observe(object, path, cb)");
	// -----------------------------------------------------------------------

	// ................................ Reset ................................
	person1.home.address.street = "StreetOne"; // reset Prop
	reset();

	// =============================== Arrange ===============================

	//Act
	$.observable.unobserve(person1.home.address, "street", myListener);
	$.observable(person1.home.address).setProperty("street", "newValue");

	// ............................... Assert .................................
	equals(result, "",
	"$.observable.unobserve(object, path, cb)");
	// -----------------------------------------------------------------------

	// ................................ Reset ................................
	person1.home.address.street = "StreetOne"; // reset Prop
	reset();

	// =============================== Arrange ===============================

	// ................................ Act ..................................
	$.observable(person1.home.address).observe("street", myListener);
	$.observable(person1.home.address).setProperty("street", "newValue");

	// ............................... Assert .................................
	equals(result, "calls: 1, ev.data: prop: street, eventArgs: oldValue: StreetOne value: newValue, eventArgs.path: street|",
	"$.observable(object).observe(path, cb)");
	// -----------------------------------------------------------------------

	// ................................ Reset ................................
	person1.home.address.street = "StreetOne"; // reset Prop
	reset();

	// =============================== Arrange ===============================

	//Act
	$.observable(person1.home.address).unobserve("street", myListener);
	$.observable(person1.home.address).setProperty("street", "newValue"); // We confirm that this will not trigger myListener

	// ............................... Assert .................................
	equals(result, "",
	"$.observable(object).unobserve(path, cb)");
	// -----------------------------------------------------------------------

	// ................................ Reset ................................
	person1.home.address.street = "StreetOne"; // reset Prop
	reset();

	// =============================== Arrange ===============================

	// ................................ Act ..................................
	$.observable.observe(person1.home.address, ["street"], myListener);
	$.observable(person1.home.address).setProperty("street", "newValue");

	// ............................... Assert .................................
	equals(result, "calls: 1, ev.data: prop: street, eventArgs: oldValue: StreetOne value: newValue, eventArgs.path: street|",
	"$.observable.observe(object, [path], cb)");
	// -----------------------------------------------------------------------

	// ................................ Reset ................................
	person1.home.address.street = "StreetOne"; // reset Prop
	reset();

	// =============================== Arrange ===============================

	// ................................ Act ..................................
	$.observable.unobserve(person1.home.address, ["street"], myListener);
	$.observable(person1.home.address).setProperty("street", "newValue"); // We confirm that this will not trigger myListener

	// ............................... Assert .................................
	equals(result, "",
	"$.observable.unobserve(object, [path], cb) removes previous handlers");
	// -----------------------------------------------------------------------

	// ................................ Reset ................................
	person1.home.address.street = "StreetOne"; // reset Prop
	reset();

	// =============================== Arrange ===============================

	// ................................ Act ..................................
	$.observable.observe(person1.home.address, "street", "ZIP", myListener);
	$.observable(person1.home.address).setProperty({street: "newValue", ZIP: "newZip"});

	// ............................... Assert .................................
	equals(result, "calls: 1, ev.data: prop: street, eventArgs: oldValue: StreetOne value: newValue, eventArgs.path: street|"
				+  "calls: 2, ev.data: prop: ZIP, eventArgs: oldValue: 111 value: newZip, eventArgs.path: ZIP|",
	"$.observable.observe(object, path1, path2, cb)");
	// -----------------------------------------------------------------------

	// ................................ Reset ................................
	person1.home.address.street = "StreetOne"; // reset Prop
	person1.home.address.ZIP = "111"; // reset Prop
	reset();

	// =============================== Arrange ===============================

	// ................................ Act ..................................
	$.observable.unobserve(person1.home.address, "street", "ZIP", myListener);
	$.observable(person1.home.address).setProperty({street: "newValue", ZIP: "newZip"});

	// ............................... Assert .................................
	equals(result, "",
	"$.observable.unobserve(object, path1, path2, cb) removes previous handlers");
	// -----------------------------------------------------------------------

	// ................................ Reset ................................
	person1.home.address.street = "StreetOne"; // reset Prop
	person1.home.address.ZIP = "111"; // reset Prop
	reset();

	// =============================== Arrange ===============================

	// ................................ Act ..................................
	$.observable.observe(person1.home.address, ["street", "ZIP"], myListener);
	$.observable(person1.home.address).setProperty({street: "newValue", ZIP: "newZip"});

	// ............................... Assert .................................
	equals(result, "calls: 1, ev.data: prop: street, eventArgs: oldValue: StreetOne value: newValue, eventArgs.path: street|"
				+  "calls: 2, ev.data: prop: ZIP, eventArgs: oldValue: 111 value: newZip, eventArgs.path: ZIP|",
	"$.observable.observe(object, [path1, path2], cb)");
	// -----------------------------------------------------------------------

	// ................................ Reset ................................
	person1.home.address.street = "StreetOne"; // reset Prop
	person1.home.address.ZIP = "111"; // reset Prop
	reset();

	// =============================== Arrange ===============================

	// ................................ Act ..................................
	$.observable.unobserve(person1.home.address, ["street", "ZIP"], myListener);
	$.observable(person1.home.address).setProperty({street: "newValue", ZIP: "newZip"});

	// ............................... Assert .................................
	equals(result, "",
	"$.observable.unobserve(object, [path1, path2], cb) removes previous handlers");
	// -----------------------------------------------------------------------

	// ................................ Reset ................................
	person1.home.address.street = "StreetOne"; // reset Prop
	person1.home.address.ZIP = "111"; // reset Prop
	reset();

	// =============================== Arrange ===============================

	// ................................ Act ..................................
	$.observable.observe([person1.home.address, "street", "ZIP"], myListener);
	$.observable(person1.home.address).setProperty({street: "newValue", ZIP: "newZip"});

	// ............................... Assert .................................
	equals(result, "calls: 1, ev.data: prop: street, eventArgs: oldValue: StreetOne value: newValue, eventArgs.path: street|"
				+  "calls: 2, ev.data: prop: ZIP, eventArgs: oldValue: 111 value: newZip, eventArgs.path: ZIP|",
	"$.observable.observe([object, path1, path2], cb)");
	// -----------------------------------------------------------------------

	// ................................ Reset ................................
	person1.home.address.street = "StreetOne"; // reset Prop
	person1.home.address.ZIP = "111"; // reset Prop
	reset();

	// =============================== Arrange ===============================

	// ................................ Act ..................................
	$.observable.unobserve([person1.home.address, "street", "ZIP"], myListener);
	$.observable(person1.home.address).setProperty({street: "newValue", ZIP: "newZip"});

	// ............................... Assert .................................
	equals(result, "",
	"$.observable.unobserve([object, path1, path2], cb) removes previous handlers");
	// -----------------------------------------------------------------------

	// ................................ Reset ................................
	person1.home.address.street = "StreetOne"; // reset Prop
	person1.home.address.ZIP = "111"; // reset Prop
	reset();

	// =============================== Arrange ===============================

	// ................................ Act ..................................
	$.observable.observe(person1.home.address, "street", settings, "title", ["width", person1.home.address, "ZIP"], myListener);
	$.observable(person1.home.address).setProperty({street: "newValue", ZIP: "newZip"});
	$.observable(settings).setProperty({title: "Sir", width: 40});

	// ............................... Assert .................................
	equals(result,
		"calls: 1, ev.data: prop: street, eventArgs: oldValue: StreetOne value: newValue, eventArgs.path: street|"
		+ "calls: 2, ev.data: prop: ZIP, eventArgs: oldValue: 111 value: newZip, eventArgs.path: ZIP|"
		+ "calls: 3, ev.data: prop: title, eventArgs: oldValue: Mr value: Sir, eventArgs.path: title|"
		+ "calls: 4, ev.data: prop: width, eventArgs: oldValue: 30 value: 40, eventArgs.path: width|",
	"$.observable.observe(object, path1, object2, path2, [path3, object2, path4], cb)");
	// -----------------------------------------------------------------------

	// ................................ Reset ................................
	person1.home.address.street = "StreetOne"; // reset Prop
	person1.home.address.ZIP = "111"; // reset Prop
	settings.title = "Mr"; // reset Prop
	settings.width = 30; // reset Prop
	reset();

	// =============================== Arrange ===============================

	// ................................ Act ..................................
	$.observable.unobserve(person1.home.address, "street", settings, "title", ["width", person1.home.address, "ZIP"], myListener);
	$.observable(person1.home.address).setProperty("street", "newValue"); // We confirm that this will not trigger myListener

	// ............................... Assert .................................
	ok(!result && !$._data(person1.home.address).events && !$._data(settings).events,
	"$.observable.unobserve(object, path1, object2, path2, [path3, object2, path4], cb) removes previous handlers");
	// -----------------------------------------------------------------------

	// ................................ Reset ................................
	person1.home.address.street = "StreetOne"; // reset Prop
	reset();

});

test("paths", function() {

	// =============================== Arrange ===============================

	// ................................ Act ..................................
	$.observable.observe(person1, "home^address.street", person1.home.address, "ZIP", myListener);
	$.observable(person1.home.address).setProperty({street: "newValue", ZIP: "newZip"});

	// ............................... Assert .................................
	ok(result === "calls: 1, ev.data: prop: street, eventArgs: oldValue: StreetOne value: newValue, eventArgs.path: street|"
		+  "calls: 2, ev.data: prop: ZIP, eventArgs: oldValue: 111 value: newZip, eventArgs.path: ZIP|",
	"$.observable.observe(object, some.deep.path, object2, path, cb) is listening to leaf");
	// -----------------------------------------------------------------------

	// ................................ Reset ................................
	reset();

	// ................................ Act ..................................
	$.observable(person1).setProperty({home: home2}); // Swap object higher in path

	// ............................... Assert .................................
	equals("" + (lastEventArgs.oldValue === home1) + (lastEventArgs.value === home2) + result, "truetruecalls: 1, ev.data: prop: home, path: address.street, eventArgs: oldValue: [object Object] value: [object Object], eventArgs.path: home|",
	"$.observable.observe(object, some.deep.path, object2, path, cb) is listening to root");
	// -----------------------------------------------------------------------

	// ................................ Reset ................................
	reset();

	// ................................ Act ..................................
	$.observable(address1).setProperty({street: "newValue2", ZIP: "newZip2"});

	// ............................... Assert .................................
	equals(result, "calls: 1, ev.data: prop: ZIP, eventArgs: oldValue: newZip value: newZip2, eventArgs.path: ZIP|",
	"$.observable.observe(object, 'home.address.street', object2, 'ZIP', cb) after swapping higher up on deep path, is no longer listening to original leaf on that path - 'i.e. 'street', but is listening to other paths as before - 'i.e. 'ZIP'");
	// -----------------------------------------------------------------------

	// ................................ Reset ................................
	address1.street = "StreetOne"; // reset Prop
	address1.ZIP = "111"; // reset Prop
//	person1.home = home1; // reset Prop
	reset();

	// ................................ Act ..................................
	$.observable(address2).setProperty({street: "newValue2", ZIP: "newZip2"});

	// ............................... Assert .................................
	equals(result, "calls: 1, ev.data: prop: street, eventArgs: oldValue: StreetTwo value: newValue2, eventArgs.path: street|",
	"$.observable.observe(object, 'home.address.street', object2, 'ZIP', cb) after swapping higher up on deep path, is now listening to leaf on new descendant objects - 'i.e. 'street' on 'address2'");
	// -----------------------------------------------------------------------

	// ................................ Act ..................................
	$.observable(person1).setProperty("home", null); // Set object higher up on path to null
	$.observable(person1).setProperty("home", home1); // Set object higher up to different object
	reset();

	$.observable(address2).setProperty({street: "newValue2", ZIP: "newZip2"});
	$.observable(address1).setProperty({street: "newValue3", ZIP: "newZip3"});

	// ............................... Assert .................................

	equals(result, "calls: 1, ev.data: prop: street, eventArgs: oldValue: StreetOne value: newValue3, eventArgs.path: street|"
	  + "calls: 2, ev.data: prop: ZIP, eventArgs: oldValue: 111 value: newZip3, eventArgs.path: ZIP|",
	"$.observable.observe(object, 'home.address.street', object2, 'ZIP', cb) after setting object to null, higher up on deep path, then setting to new object, is no longer listening to that path on original descendant objects but is now listening to the path on new descendant objects");
	// -----------------------------------------------------------------------

	// ................................ Reset ................................
	reset();

	// ................................ Act ..................................
	$.observable.unobserve(person1, "home^address.street", person1.home.address, "ZIP", myListener);

	// ............................... Assert .................................
	ok(!$._data(person1).events && !$._data(person1.home.address).events,
	"$.observable.unobserve(object, 'home.address.street', object2, 'ZIP', cb) removes the current listeners from that path");
	// -----------------------------------------------------------------------

	// ................................ Reset ................................
	reset();

	$.observable.observe(person1, "home^address.street", person1.home.address, "ZIP", "ZIP", "foo", myListener);
	$.observable.observe(person1.home.address, "street", function(){});

	// ............................... Assert .................................
	equal("" + $._data(person1.home.address).events.propertyChange.length + " "
	+ $._data(person1.home).events.propertyChange.length + " "
	+ $._data(person1).events.propertyChange.length, "4 1 1",
	"Avoid duplicate handlers");

	// ................................ Act ..................................
	$.observable.unobserve(person1, "home^address.ZIP");

	// ............................... Assert .................................
	equal("" + $._data(person1.home.address).events.propertyChange.length + " "
	+ !$._data(person1.home).events + " "
	+ !$._data(person1).events, "3 true true",
	"unobserve(object, paths) - with no callback specified: Remove handlers only for selected properties");
	// -----------------------------------------------------------------------

	// ................................ Act ..................................
	$.observable.unobserve(person1.home.address, "*", myListener);

	// ............................... Assert .................................
	equal("" + $._data(person1.home.address).events.propertyChange.length, "1",
	'unobserve(object, "*", myListener) removes all handlers on this object for any props, for this callback');
	// -----------------------------------------------------------------------

	// ................................ Act ..................................
	$.observable.unobserve(person1.home.address, "*");

	// ............................... Assert .................................
	ok(!$._data(person1.home.address).events,
	'unobserve(object, "*") removes all handlers on this object for any props, for any callback');
	// -----------------------------------------------------------------------

	// ................................ Reset ................................
	reset();

	// =============================== Arrange ===============================

	// ................................ Act ..................................
	$.observable.observe(person1.home.address, "*", "ZIP", myListener);

	// ............................... Assert .................................
	equal("" + $._data(person1.home.address).events.propertyChange.length, "1",
	'Add a listener for "*" - avoids duplicates');
	// -----------------------------------------------------------------------

	// ................................ Act ..................................
	$.observable(person1.home.address).setProperty({street: "newValue4", ZIP: "newZip4"});

	// ............................... Assert .................................
	equal(result, "calls: 1, ev.data: prop: *, path: *, eventArgs: oldValue: newValue3 value: newValue4, eventArgs.path: street|"
				+ "calls: 2, ev.data: prop: *, path: *, eventArgs: oldValue: newZip3 value: newZip4, eventArgs.path: ZIP|",
	'listen to both "*" and specific prop. Note: Eliminates duplicates for specific props when there is also a "*"');
	// -----------------------------------------------------------------------

	// ................................ Reset ................................
	address1.street = "StreetOne"; // reset Prop
	address1.ZIP = "111"; // reset Prop
	address2.street = "StreetTwo"; // reset Prop
	address1.ZIP = "222"; // reset Prop
	reset();

	// =============================== Arrange ===============================
	// ................................ Act ..................................
	$.observable.observe(person1, "work^address.street", myListener);
	$.observable(person1).setProperty({work: home2});
	$.observable(address2).setProperty({street: "newAddress2"});

	// ............................... Assert .................................
	equals(result, "calls: 1, ev.data: prop: work, path: address.street, eventArgs: oldValue: undefined value: [object Object], eventArgs.path: work|calls: 2, ev.data: prop: street, eventArgs: oldValue: StreetTwo value: newAddress2, eventArgs.path: street|",
	'observing a deep path into missing properties, followed by $.observable(...).setProperty calls which supply the missing object property then modify subobjects deeper down the path lead to the correct callback events');
	// -----------------------------------------------------------------------

	// ................................ Reset ................................
	$.observable.unobserve(person1, "work^address.street");
	address2.street = "StreetTwo"; // reset Prop
	delete person1.work; // reset Prop
	reset();

	// =============================== Arrange ===============================

	// ................................ Act ..................................
	$.observable.unobserve(person1.home.address, "*");

	// ............................... Assert .................................
	ok(!$._data(person1.home.address).events,
	'unobserve(object, "*") removes all handlers on this object for any props, both "*" and specific props, for any callback');
	// -----------------------------------------------------------------------

	// ................................ Act ..................................
	$.observable.observe(person1, "fullName", myListener);

	// ............................... Assert .................................
	equal("" + $._data(person1).events.propertyChange.length, "2",
	'Add a listener for computed property');
	// -----------------------------------------------------------------------

	// ................................ Act ..................................
	$.observable(person1).setProperty({firstName: "newFirst", lastName: "newLast"});
	$.observable(settings).setProperty({title: "Sir"});

	// ............................... Assert .................................
	equal(result, "calls: 1, ev.data: prop: _firstName, eventArgs: oldValue: Jo value: newFirst, eventArgs.path: _firstName|"
				+ "calls: 2, ev.data: prop: lastName, eventArgs: oldValue: One value: newLast, eventArgs.path: lastName|"
				+ "calls: 3, ev.data: prop: title, eventArgs: oldValue: Mr value: Sir, eventArgs.path: title|",
	'listen to changes in dependent props for a computed');
	// -----------------------------------------------------------------------

	// ................................ Reset ................................
	person1._firstName = "Jo";
	person1.lastName = "One";
	settings.title = "Sir";
	reset();

	// =============================== Arrange ===============================
	listeners = "Before: "
	+ $._data(model.person1).events.propertyChange.length;

	// ................................ Act ..................................
	$.observable.unobserve(person1, "fullName", myListener);

	// ............................... Assert .................................
	equal(listeners + ". After: "
		+ !$._data(model.person1).events, "Before: 2. After: true",
	'unobserve(object, "computed", cb) removes handlers');
	// -----------------------------------------------------------------------

	// ................................ Act ..................................
	$.observable.observe(model, "person1^fullName", myListener);

	// ............................... Assert .................................
	equal("" + $._data(person1).events.propertyChange.length, "2",
	'Add a listener for computed property on a deep path');
	// -----------------------------------------------------------------------

	// ................................ Act ..................................
	$.observable(person1).setProperty({firstName: "newFirst", lastName: "newLast"});

	// ............................... Assert .................................
	equal(result, "calls: 1, ev.data: prop: _firstName, eventArgs: oldValue: Jo value: newFirst, eventArgs.path: _firstName|"
				+ "calls: 2, ev.data: prop: lastName, eventArgs: oldValue: One value: newLast, eventArgs.path: lastName|",
	'listen to changes in dependent props for a computed');
	// -----------------------------------------------------------------------

	// ................................ Reset ................................
	person1._firstName = "Jo";
	person1.lastName = "One";
	reset();

	// =============================== Arrange ===============================
	listeners = "Before: "
	+ $._data(model).events.propertyChange.length + " "
	+ $._data(model.person1).events.propertyChange.length;

	// ................................ Act ..................................
	$.observable.unobserve(model, "person1^fullName", myListener);

	// ............................... Assert .................................
	equal(listeners + ". After: "
		+ !$._data(model).events + " "
		+ !$._data(model.person1).events, "Before: 1 2. After: true true",
	'unobserve(object, "computed", cb) removes handlers');
	// -----------------------------------------------------------------------

	// ................................ Act ..................................
	$.observable.observe(model, "person1^fullName", "person1^firstName", "person1^lastName", "person1^firstName", myListener);

	// ............................... Assert .................................
	equal("" + $._data(person1).events.propertyChange.length, "2",
	'Add a listener for computed property on deep path plus redundant computed dependency plus redundant computed prop.');
	// -----------------------------------------------------------------------

	// ................................ Act ..................................
	$.observable(person1).setProperty({firstName: "newFirst", lastName: "newLast"});

	// ............................... Assert .................................
	equal(result, "calls: 1, ev.data: prop: _firstName, eventArgs: oldValue: Jo value: newFirst, eventArgs.path: _firstName|"
		+ "calls: 2, ev.data: prop: lastName, eventArgs: oldValue: One value: newLast, eventArgs.path: lastName|",
	'listen to changes in dependent props for a computed. (Note: We avoid duplicate handlers)');
	// -----------------------------------------------------------------------

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
	$.observable.unobserve(model, "person1^fullName", myListener);

	// ............................... Assert .................................
	equal(listeners + ". After: "
		+ !$._data(settings).events + " "
		+ !$._data(model).events + " "
		+ !$._data(model.person1).events, "Before: 1 3 2. After: true true true",
	'unobserve(object, "computed", cb) removes handlers');
	// -----------------------------------------------------------------------

	// =============================== Arrange ===============================

	// ................................ Act ..................................
	$.observable.observe(model, "person1^fullName", myListener);
	$.observable.unobserve(model);
	handlersCount = $._data(model.person1).events.propertyChange.length;

	$.observable.unobserve(person1);

	// ............................... Assert .................................
	equal("" + handlersCount + " " + !$._data(model).events + " " + !$._data(model.person1).events, "2 true true",
	'unobserve(object) removes all observe handlers from object, but does not remove handlers on paths on descendant objects');
	// -----------------------------------------------------------------------

	// =============================== Arrange ===============================

	// ................................ Act ..................................
	$.observable.observe(person1, "fullName", myListener);
	$.observable.observe(settings, "*", myListener);
	handlersCount = $._data(person1).events.propertyChange.length + $._data(settings).events.propertyChange.length;

	$.observable.unobserve(person1, "*", settings, "*");

	// ............................... Assert .................................
	equal("" + handlersCount + " " + !$._data(person1).events + " " + !$._data(settings).events, "3 true true",
	'unobserve(object1, "*", object2, "*") removes all observe handlers from objects');
	// -----------------------------------------------------------------------

	// =============================== Arrange ===============================

	// ................................ Act ..................................
	$.observable.observe(settings, "onFoo", myListener);
	$.observable(settings).setProperty("onFoo", function onfoonew() { return; });
	$.observable.unobserve(settings);

	// ............................... Assert .................................
	equal(!$._data(settings).events && result, "calls: 1, ev.data: prop: onFoo, eventArgs: oldValue: function onFoo1()  value: function onfoonew() , eventArgs.path: onFoo|",
	'Can observe properties of type function');
	// -----------------------------------------------------------------------


	// ................................ Reset ................................
	settings.onFoo = "Jo";
	person1.lastName = "One";
	reset();

	// =============================== Teardown ===============================

});

test("filter", function() {
	// =============================== Arrange ===============================
	var str = "aa",
		obj =  {
			name: "One"
		},
		arr = [1,2,3];

	function filter(val) {
		if (val) {
			if (val.charAt(0) === "%") {
				return [obj, val.slice(1)];
			}
		}
	}

	// ................................ Act ..................................
	$.observable.observe({}, "%name", myListener, filter);
	$.observable(obj).setProperty({name: "newName"});

	// ............................... Assert .................................
	equals(result, "calls: 1, ev.data: prop: name, eventArgs: oldValue: One value: newName, eventArgs.path: name|",
	"$.observable.observe(object, path, cb, filter) uses filter correctly to substitute objects and paths");
	// -----------------------------------------------------------------------

	// ................................ Act ..................................
	handlersCount = $._data(obj).events.propertyChange.length
	$.observable.unobserve({}, "%name", myListener, filter);

	// ................................ Reset ................................
	obj.name = "One";

	// ............................... Assert .................................
	ok(handlersCount===1 && !$._data(obj).events,
	"$.observable.unobserve(object, path, cb, filter) uses filter correctly to substitute objects and paths and unobserve from mapped <objects,paths>");
	reset();

	// =============================== Arrange ===============================
	// ................................ Act ..................................
	$.observable.observe(str, myListener);
	$.observable(obj).setProperty({name: "newName"});

	// ............................... Assert .................................
	equals(result, "",
	"$.observable.observe(path, cb): Observe with no root object and no filter does nothing");
	// -----------------------------------------------------------------------

	// ................................ Reset ................................
	obj.name = "One";

	// =============================== Arrange ===============================
	// ................................ Act ..................................
	$.observable.observe(str, myListener, filter);
	$.observable(obj).setProperty({name: "newName"});

	// ............................... Assert .................................
	equals(result, "",
	"$.observable.observe(path, cb, filter) observe with no root object can use filter to substitute objects and paths. If no object is mapped by filter, does nothing");
	// -----------------------------------------------------------------------

	// ................................ Reset ................................
	obj.name = "One";

	// =============================== Arrange ===============================
	// ................................ Act ..................................
	$.observable.observe("%name", myListener, filter);
	$.observable(obj).setProperty({name: "newName"});

	// ............................... Assert .................................
	equals(result, "calls: 1, ev.data: prop: name, eventArgs: oldValue: One value: newName, eventArgs.path: name|",
	"$.observable.observe(path, cb, filter) observe with no root object can use filter to substitute objects and paths. Correctly observes object(s) mapped by filter");
	// -----------------------------------------------------------------------

	// ................................ Act ..................................
	handlersCount = $._data(obj).events.propertyChange.length
	$.observable.unobserve("%name", myListener, filter);

	// ............................... Assert .................................
	ok(handlersCount===1 && !$._data(obj).events,
	"$.observable.unobserve(path, cb, filter) uses filter correctly to substitute objects and paths and unobserve from mapped <objects,paths>");
	reset();

	// ................................ Reset ................................
	obj.name = "One";

	// =============================== Arrange ===============================
	// ................................ Act ..................................
	$.observable.observe(null, myListener, filter);
	$.observable.observe(0, myListener, filter);
	$.observable.observe(false, myListener, filter);
	$.observable.observe(true, myListener, filter);
	$.observable.observe(2, myListener, filter);

	$.observable.observe(null, str, myListener, filter);
	$.observable.observe(0, str, myListener, filter);
	$.observable.observe(false, str, myListener, filter);
	$.observable.observe(true, str, myListener, filter);
	$.observable.observe(2, str, myListener, filter);

	$.observable(obj).setProperty({name: "newName"});

	// ............................... Assert .................................
	equals(result, "",
	"$.observable.observe(foo, path, ...): When first parameter foo is not a string or object, it is skipped");

	// ................................ Reset ................................
	obj.name = "One";

	// =============================== Arrange ===============================
	// ................................ Act ..................................
	$.observable.observe(true, "%name", myListener, filter);
	$.observable(obj).setProperty({name: "newName"});

	// ............................... Assert .................................
	equals(result, "calls: 1, ev.data: prop: name, eventArgs: oldValue: One value: newName, eventArgs.path: name|",
	"$.observable.observe(foo, path, ...): When first parameter foo is not a string or object, it is skipped");

	// ................................ Act ..................................
	handlersCount = $._data(obj).events.propertyChange.length
	$.observable.unobserve(true, "%name", myListener, filter);

	// ............................... Assert .................................
	ok(handlersCount===1 && !$._data(obj).events,
	"$.observable.unobserve(foo, path, ...): When first parameter foo is not a string or object, it is skipped");
	reset();

	// ................................ Reset ................................
	obj.name = "One";

	// =============================== Arrange ===============================
	// ................................ Act ..................................
	$.observable.observe(false, "%name", myListener, filter);
	$.observable(obj).setProperty({name: "newName"});

	// ............................... Assert .................................
	equals(result, "calls: 1, ev.data: prop: name, eventArgs: oldValue: One value: newName, eventArgs.path: name|",
	"$.observable.observe(foo, path, ...): When first parameter foo is not a string or object, it is skipped");

	// ................................ Act ..................................
	handlersCount = $._data(obj).events.propertyChange.length
	$.observable.unobserve(false, "%name", myListener, filter);

	// ............................... Assert .................................
	ok(handlersCount===1 && !$._data(obj).events,
	"$.observable.unobserve(foo, path, ...): When first parameter foo is not a string or object, it is skipped");
	reset();

	// ................................ Reset ................................
	obj.name = "One";

	//TODO test cases for observe(object, true, "a.b.c") should bind only to leaf changes
	//TODO test cases for observe(domElement, "a.b.c") should not bind at all
	//TODO test cases for observe(array, "a.b.c") should not bind at all - or should bind only for observe(array, "length") - on collection change - but raise propertyChange event.
	//TODO test cases for observe(object, "a.b.arrayProperty") should bind to collection change on leaaf
});

module("API - Settings");

test("delimiters", 1, function() {
	$.views.settings.delimiters("@%","%@");
	var result = $.templates( "A_@%if true%@yes@%/if%@_B" ).render();
	$.views.settings.delimiters("{{","}}");
	equal( result, "A_yes_B", "Custom delimiters" );
});

module("API - Declarations");

test("template encapsulation", function() {

	// =============================== Arrange ===============================
	$.templates({
		myTmpl6: {
			markup: "{{sort reverse=true people}}{{:lastName}}{{/sort}}",
			tags: {
				sort: sort
			}
		}
	});

	// ................................ Act ..................................
	$.link.myTmpl6("#result", { people: people });

	// ............................... Assert .................................
	equal( $("#result").text(), "TwoOne", "Template with tag resource");

	// =============================== Arrange ===============================
	$.templates({
		myTmpl7: {
			markup: "{{if first}}Yes{{:~foo}}{{sort reverse=true people}}{{:lastName}}{{/sort}}{{else}}No{{:~foo}}{{sort reverse=true people}}{{:lastName}}{{/sort}}{{/if}}",
			tags: {
				sort: sort
			},
			helpers: {
				foo: "isFoo"
			}
		}
	});

	// ................................ Act ..................................
	$.link.myTmpl7("#result", {people: people, first: false});

	// ............................... Assert .................................
	equal( $("#result").text(), "NoisFooTwoOne", "Can access tag and helper resources from a nested context (i.e. inside {{if}} block)");
});

module("API - Views");

test("$.view() in regular content", function() {

	// =============================== Arrange ===============================
	$.link.tmplHierarchy("#result", topData);

	// ................................ Act ..................................
	var view = $.view("#1");

	// ............................... Assert .................................
	ok(view.ctx.val === 1 && view.type === "myWrap", '$.view(elem) gets nearest parent view. Custom tag blocks are of type "tmplName"');

	// ................................ Act ..................................
	view = $.view("#1", "root");

	// ............................... Assert .................................
	ok(view.parent.type === "top", '$.view(elem, "root") gets root view (child of top view)');

	// ................................ Act ..................................
	view = $.view("#1", "item");

	// ............................... Assert .................................
	ok(view.type === "item" && view.data.lastName === "One" && view.index === 0, '$.view(elem, "item") gets nearest item view');

	// ................................ Act ..................................
	view = $.view("#1", "data");

	// ............................... Assert .................................
	ok(view.type === "data" && view.data === topData, '$.view(elem, "data") gets nearest data view');

	// ................................ Act ..................................
	view = $.view("#1", "if");

	// ............................... Assert .................................
	ok(view.type === "if" && view.data === people[0], '$.view(elem, "if") gets nearest "if" view');

	// ................................ Act ..................................
	view = $.view("#1", "array");

	// ............................... Assert .................................
	ok(view.type === "array" && view.data === people, '$.view(elem, "array") gets nearest array view');

	// ................................ Act ..................................
	view = $.view("#sp1", "myWrap");

	// ............................... Assert .................................
	ok(view.type === "myWrap" && view.ctx.tag.tagName === "myWrap", '$.view(elem, "myTagName") gets nearest view for content of that tag');

	view = $.view("#sp1");

	// ............................... Assert .................................
	ok(view.type === "if" && view.ctx.tag.tagName === "myWrap2", 'Within {{if}} block, $.view(elem) gets nearest "if" view, but view.ctx.tag is the nearest non-flow tag, i.e. custom tag that does not have flow set to true');

	// ................................ Act ..................................
	view = $.view("#1", true);

	// ............................... Assert .................................
	ok(view.type === "myWrap2", '$.view(elem, true) gets the first nested view. Custom tag blocks are of type "tmplName"');

	// ................................ Act ..................................
	view = $.view("#result", true, "myFlow");

	// ............................... Assert .................................
	ok(view.type === "myFlow", '$.view(elem, true, viewTypeName) gets the first (depth first) nested view of that type');
});

test("view.get() and view.getIndex() in regular content", function() {

	// =============================== Arrange ===============================
	$.link.tmplHierarchy("#result", topData);

	var view1 = $.view("#1");

	// ................................ Act ..................................
	var view = view1.get();

	// ............................... Assert .................................
	ok(view.parent.type === "top", 'view.get() gets root view (child of top view)');

	// ................................ Act ..................................
	view = view1.get("item");

	// ............................... Assert .................................
	ok(view.type === "item" && view.data.lastName === "One" && view.index === 0, 'view.get("item") gets nearest item view');

	// ................................ Act ..................................
	view = view1.get("myWrap");

	// ............................... Assert .................................
	ok(view.ctx.val === 1 && view.type === "myWrap", 'view.get("viewTypeName") gets nearest viewTypeName view - even if is the nearest view');

	// ............................... Assert .................................
	ok($.view("#1").getIndex() === 0 && $.view("#1", "item").index === 0 && $.view("#2").getIndex() === 1 && $.view("#2", "item").index === 1, '$.view(elem).getIndex() gets index of nearest item view');

});

test("$.view() in element-only content", function() {

	// =============================== Arrange ===============================
	$.link.tmplHierarchyElCnt("#result", topData);

	// ................................ Act ..................................
	var view = $.view("#tr1");

	// ............................... Assert .................................
	ok(view.ctx.val === 1 && view.type === "myWrapElCnt", 'Within element-only content, $.view(elem) gets nearest parent view. Custom tag blocks are of type "tmplName"');

	// ................................ Act ..................................
	view = $.view("#tr1", "root");

	// ............................... Assert .................................
	ok(view.parent.type === "top", '$.view(elem, "root") gets root view (child of top view)');

	// ................................ Act ..................................
	view = $.view("#tr1", "item");

	// ............................... Assert .................................
	ok(view.type === "item" && view.data.lastName === "One" && view.index === 0, 'Within element-only content, $.view(elem, "item") gets nearest item view');

	// ................................ Act ..................................
	view = $.view("#sp1", "item");

	// ............................... Assert .................................
	ok(view.type === "item" && view.data.lastName === "One" && view.index === 0, '$.view(elem, "item") gets nearest item view, up through both elCnt and regular content views');

	// ................................ Act ..................................
	view = $.view("#tr1", "data");

	// ............................... Assert .................................
	ok(view.type === "data" && view.data === topData, 'Within element-only content, $.view(elem, "data") gets nearest data view');

	// ................................ Act ..................................
	view = $.view("#tr1", "if");

	// ............................... Assert .................................
	ok(view.type === "if" && view.data === people[0], 'Within element-only content, $.view(elem, "if") gets nearest "if" view');

	// ................................ Act ..................................
	view = $.view("#tr1", "array");

	// ............................... Assert .................................
	ok(view.type === "array" && view.data === people, 'Within element-only content, $.view(elem, "array") gets nearest array view');

	// ................................ Act ..................................
	view = $.view("#sp1", "myWrapElCnt");

	// ............................... Assert .................................
	ok(view.type === "myWrapElCnt" && view.ctx.tag.tagName === "myWrapElCnt", 'Within element-only content, $.view(elem, "myTagName") gets nearest view for content of that tag');

	// ................................ Act ..................................
	view = $.view("#td1");

	// ............................... Assert .................................
	ok(view.type === "if" && view.ctx.tag.tagName === "myWrapElCnt", 'Within {{if}} block, $.view(elem) gets nearest "if" view, but view.ctx.tag is the nearest non-flow tag, i.e. custom tag that does not have flow set to true');

	// ................................ Act ..................................
	view = $.view("#spInFlow1");

	// ............................... Assert .................................
	ok(view.type === "myFlowElCnt" && view.ctx.tag.tagName === "myWrapElCnt", 'Within {{myFlow}} block, for a flow tag, $.view(elem) gets nearest the "myFlow" view, but view.ctx.tag is the nearest non-flow tag');

	// ................................ Act ..................................
	view = $.view("#tr1", true);

	// ............................... Assert .................................
	ok(view.type === "myWrap2ElCnt", 'Within element-only content, $.view(elem, true) gets the first nested view. Custom tag blocks are of type "tmplName"');

	// ................................ Act ..................................
	view = $.view("#tr1", true, "myFlowElCnt");

	// ............................... Assert .................................
	ok(view.type === "myFlowElCnt", 'Within element-only content, $.view(elem, true, "myTagName") gets the first (depth first) nested view of that type');
});


test("view.get() and view.getIndex() in element-only content", function() {

	// =============================== Arrange ===============================
	$.link.tmplHierarchyElCnt("#result", topData);

	var view1 = $.view("#tr1");

	// ................................ Act ..................................
	var view = view1.get();

	// ............................... Assert .................................
	ok(view.parent.type === "top", 'In element-only content, view.get() gets root view (child of top view)');

	// ................................ Act ..................................
	view = view1.get("item");

	// ............................... Assert .................................
	ok(view.type === "item" && view.data.lastName === "One" && view.index === 0, 'In element-only content, view.get("item") gets nearest item view');

	// ................................ Act ..................................
	view = view1.get("myWrapElCnt");

	// ............................... Assert .................................
	ok(view.ctx.val === 1 && view.type === "myWrapElCnt", 'In element-only content, view.get("viewTypeName") gets nearest viewTypeName view - even if is the nearest view');

	// ............................... Assert .................................
	ok($.view("#tr1").getIndex() === 0 && $.view("#tr1", "item").index === 0 && $.view("#tr2").getIndex() === 1 && $.view("#tr2", "item").index === 1,
		'$.view(elem).getIndex() gets index of nearest item view, up through elCnt views');

	// ............................... Assert .................................
	ok($.view("#sp1").getIndex() === 0 && $.view("#sp1", "item").index === 0 && $.view("#sp2").getIndex() === 1 && $.view("#sp2", "item").index === 1,
		'$.view(elem).getIndex() gets index of nearest item view, up through both elCnt and regular content views');

});

module("API - Tag Controls");

test("view.childTags() and tag.childTags()", function() {

	// =============================== Arrange ===============================
	$.link.boundTmplHierarchy("#result", topData);

	var tags,
		view1 = $.view("#result", true, "item");

	// ................................ Act ..................................

	tags = view1.childTags();

	// ............................... Assert .................................
	ok(tags.length === 2 && tags[0].tagName === "myWrap" && tags[0].tagCtx.props.val === 1 && tags[0].tagCtx.view.getIndex() === 0 && tags[1].tagName === "myWrap" && tags[1].tagCtx.props.val === 2 && tags[1].tagCtx.view.getIndex() === 0,
		'view.childTags() returns top-level bound tags within the view, and skips any unbound tags');

	// ................................ Act ..................................
	tags = view1.childTags(true);

	// ............................... Assert .................................
	ok(tags.length === 5 && tags[0].tagName === "myWrap" && tags[1].tagName === "myWrap2" && tags[2].tagName === "myFlow" && tags[3].tagName === "myFlow" && tags[4].tagName === "myWrap" && tags[0].tagCtx.props.val === 1 && tags[2].tagCtx.props.val === 3 && tags[0].tagCtx.view.getIndex() === 0,
		'view.childTags(true) returns all tags within the view - in document order');

	// ................................ Act ..................................
	tags = view1.childTags("myWrap");

	// ............................... Assert .................................
	ok(tags.length === 2 && tags[0].tagName === "myWrap" && tags[1].tagName === "myWrap" && tags[0].tagCtx.props.val === 1 && tags[0].tagCtx.view.getIndex() === 0,
		'view.childTags("myTagName") returns all top-level tags of the given name within the view - in document order');

	// ................................ Act ..................................
	tags = view1.childTags(true, "myWrap2");

	// ............................... Assert .................................
	ok(tags.length === 1 && tags[0].tagName === "myWrap2" && tags[0].tagCtx.view.getIndex() === 0,
		'view.childTags(true, "myTagName") returns all tags of the given name within the view - in document order');

	// ................................ Act ..................................
	tags = view1.childTags("myWrap2");

	// ............................... Assert .................................
	ok(tags.length === 0, 'view.childTags(true, "myTagName") returns all tags of the given name within the view - in document order');

	// ................................ Act ..................................
	tags = view1.get(true, "myWrap").childTags(); // Get first myWrap view and look for its top-level child tags

	// ............................... Assert .................................
	ok(tags.length === 2 && tags[0].tagName === "myWrap2" && tags[1].tagName === "myFlow" && tags[1].tagCtx.props.val === 4 && tags[1].tagCtx.view.getIndex() === 0,
		'tag.childTags() returns top-level bound child tags, and skips any unbound tags');

	// ................................ Act ..................................
	tags = view1.get(true, "myWrap").childTags(true); // Get first myWrap view and look for descendant tags

	// ............................... Assert .................................
	ok(tags.length === 3 && tags[0].tagName === "myWrap2" && tags[1].tagName === "myFlow" && tags[2].tagName === "myFlow",
		'tag.childTags() returns descendant tags, and skips any unbound tags');

	// ................................ Act ..................................
	tags = view1.childTags("myWrap")[0].childTags(); // Get first myWrap tag and look for its top-level child tags

	// ............................... Assert .................................
	ok(tags.length === 2 && tags[0].tagName === "myWrap2" && tags[1].tagName === "myFlow" && tags[1].tagCtx.props.val === 4 && tags[1].tagCtx.view.getIndex() === 0,
		'tag.childTags() returns top-level bound child tags, and skips any unbound tags');

	// ................................ Act ..................................
	tags = view1.childTags("myWrap")[0].childTags(true); // Get first myWrap tag and look for descendant tags

	// ............................... Assert .................................
	ok(tags.length === 3 && tags[0].tagName === "myWrap2" && tags[1].tagName === "myFlow" && tags[2].tagName === "myFlow",
		'tag.childTags() returns descendant tags, and skips any unbound tags');

});

test("view.childTags() in element-only content", function() {

	// =============================== Arrange ===============================
	$.link.boundTmplHierarchyElCnt("#result", topData);

	var tags,
		view1 = $.view("#result", true, "item");

	// ................................ Act ..................................
	tags = view1.childTags();

	// ............................... Assert .................................
	ok(tags.length === 2 && tags[0].tagName === "myWrapElCnt" && tags[0].tagCtx.props.val === 1 && tags[0].tagCtx.view.getIndex() === 0 && tags[1].tagName === "myWrapElCnt" && tags[1].tagCtx.props.val === 2 && tags[1].tagCtx.view.getIndex() === 0,
		'In element-only content, view.childTags() returns top-level bound tags within the view, and skips any unbound tags');

	// ................................ Act ..................................
	tags = view1.childTags(true);

	// ............................... Assert .................................
	ok(tags.length === 5 && tags[0].tagName === "myWrapElCnt" && tags[1].tagName === "myWrap2ElCnt" && tags[2].tagName === "myFlow" && tags[3].tagName === "myFlowElCnt" && tags[4].tagName === "myWrapElCnt" && tags[0].tagCtx.props.val === 1 && tags[0].tagCtx.view.getIndex() === 0,
		'In element-only content, view.childTags(true) returns all tags within the view - in document order');

	// ................................ Act ..................................
	tags = view1.childTags("myWrapElCnt");

	// ............................... Assert .................................
	ok(tags.length === 2 && tags[0].tagName === "myWrapElCnt" && tags[1].tagName === "myWrapElCnt" && tags[0].tagCtx.props.val === 1 && tags[0].tagCtx.view.getIndex() === 0,
		'In element-only content, view.childTags("myTagName") returns all top-level tags of the given name within the view - in document order');

	// ................................ Act ..................................
	tags = view1.childTags(true, "myWrap2ElCnt");

	// ............................... Assert .................................
	ok(tags.length === 1 && tags[0].tagName === "myWrap2ElCnt" && tags[0].tagCtx.view.getIndex() === 0,
		'In element-only content, view.childTags(true, "myTagName") returns all tags of the given name within the view - in document order');

	// ................................ Act ..................................
	tags = view1.childTags("myWrap2ElCnt");

	// ............................... Assert .................................
	ok(tags.length === 0, 'In element-only content, view.childTags(true, "myTagName") returns all tags of the given name within the view - in document order');

	// ................................ Act ..................................
	tags = view1.get(true, "myWrapElCnt").childTags(); // Get first myWrap view and look for its top-level child tags

	// ............................... Assert .................................
	ok(tags.length === 2 && tags[0].tagName === "myWrap2ElCnt" && tags[1].tagName === "myFlowElCnt" && tags[1].tagCtx.props.val === 4 && tags[1].tagCtx.view.getIndex() === 0,
		'tag.childTags() returns top-level bound child tags, and skips any unbound tags');

	// ................................ Act ..................................
	tags = view1.get(true, "myWrapElCnt").childTags(true); // Get first myWrap view and look for descendant tags

	// ............................... Assert .................................
	ok(tags.length === 3 && tags[0].tagName === "myWrap2ElCnt" && tags[1].tagName === "myFlow" && tags[2].tagName === "myFlowElCnt",
		'tag.childTags() returns descendant tags, and skips any unbound tags');

	// ................................ Act ..................................
	tags = view1.childTags("myWrapElCnt")[0].childTags(); // Get first myWrap tag and look for its top-level child tags

	// ............................... Assert .................................
	ok(tags.length === 2 && tags[0].tagName === "myWrap2ElCnt" && tags[1].tagName === "myFlowElCnt" && tags[1].tagCtx.props.val === 4 && tags[1].tagCtx.view.getIndex() === 0,
		'tag.childTags() returns top-level bound child tags, and skips any unbound tags');

	// ................................ Act ..................................
	tags = view1.childTags("myWrapElCnt")[0].childTags(true); // Get first myWrap tag and look for descendant tags

	// ............................... Assert .................................
	ok(tags.length === 3 && tags[0].tagName === "myWrap2ElCnt" && tags[1].tagName === "myFlow" && tags[2].tagName === "myFlowElCnt",
		'tag.childTags() returns descendant tags, and skips any unbound tags');

});

test("view.childTags() in element-only content, using data-link", function() {

	// =============================== Arrange ===============================
	$.link.boundTmplHierarchyElCntWithDataLink("#result", person1);

	var tags,
		view1 = $.view("#result", true);
	// ................................ Act ..................................
	tags = view1.childTags();

	// ............................... Assert .................................
	ok(tags.length === 1 && tags[0].tagName === "myWrapElCnt" && tags[0].tagCtx.props.val === 1,
		'In element-only content, view.childTags() returns top-level bound tags within the view, and skips any unbound tags');

	// ................................ Act ..................................
	tags = view1.childTags(true);

	// ............................... Assert .................................
	ok(tags.length === 2 && tags[0].tagName === "myWrapElCnt" && tags[1].tagName === "myWrap2ElCnt" && tags[0].tagCtx.props.val === 1,
		'In element-only content, view.childTags(true) returns all tags within the view - in document order');

	// ................................ Act ..................................
	tags = view1.childTags("myWrapElCnt");

	// ............................... Assert .................................
	ok(tags.length === 1 && tags[0].tagName === "myWrapElCnt" && view1.childTags("inexistantTag").length === 0,
		'In element-only content, view.childTags("myTagName") returns all top-level tags of the given name within the view - in document order');

	// ................................ Act ..................................
	tags = view1.childTags(true, "myWrap2ElCnt");

	// ............................... Assert .................................
	ok(tags.length === 1 && tags[0].tagName === "myWrap2ElCnt",
		'In element-only content, view.childTags(true, "myTagName") returns all tags of the given name within the view - in document order');

	// ................................ Act ..................................
	tags = view1.childTags("myWrap2ElCnt");

	// ............................... Assert .................................
	ok(tags.length === 0, 'In element-only content, view.childTags(true, "myTagName") returns all tags of the given name within the view - in document order');
});


test("Modifying content, initializing widgets/tag controls, using data-link", function() {

	// =============================== Arrange ===============================

	// ................................ Act ..................................
	$.templates({
		markup: '<div data-link="{myWidget}"></div>',
		tags: {
			myWidget: {
				init: function(tagCtx, linkCtx) {
				},
				render: function() {
					return " render";
				},
				onBeforeLink: function() {
					$(this.linkCtx.elem).append(" before");
				},
				onAfterLink: function() {
					$(this.linkCtx.elem).append(" after");
				}
			}
		}
	}).link("#result", person1);

	// ............................... Assert .................................
	equals($("#result div").html(), " before render after", 'A data-linked tag control allows setting of content on the data-linked element during render, onBeforeLink and onAfterLink');

	// =============================== Arrange ===============================

	// ................................ Act ..................................
	$.templates({
		markup: '<div data-link="{myInlineWidget inline=true}"></div>',
		tags: {
			myInlineWidget: {
				init: function(tagCtx, linkCtx) {
				},
				render: function() {
					return "<span></span>";
				},
				onBeforeLink: function() {
					$(this.linkCtx.elem).find("span").append(" before");
				},
				onAfterLink: function() {
					this.contents("span").append(" after");
				}
			}
		}
	}).link("#result", person1);

	// ............................... Assert .................................
	equals($("#result div span").html(), " before after", 'A data-linked tag control, with inline=true, allows setting of content on the data-linked element during render, onBeforeLink and onAfterLink');

	// =============================== Arrange ===============================

	// ................................ Act ..................................
	$.templates({
		markup: '<div data-link="{myRenderInLinkEventsWidget}"></div>',
		tags: {
			myRenderInLinkEventsWidget: {
				init: function(tagCtx, linkCtx) {
					$(linkCtx.elem).append(" init");
				},
				onBeforeLink: function() {
					$(this.linkCtx.elem).append(" before");
				},
				onAfterLink: function() {
					$(this.linkCtx.elem).append(" after");
				}
			}
		}
	}).link("#result", person1);

	// ............................... Assert .................................
	equals($("#result div").html(), " init before after", 'A data-linked tag control which does not render allows setting of content on the data-linked element during init, onBeforeLink and onAfterLink');

//TODO: Add tests for attaching jQuery UI widgets or similar to tag controls, using data-link (with or without inline=true) and {^{myTag}} inline data binding.
});

})();
})(jQuery, this, QUnit);
