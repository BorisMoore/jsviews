/// <reference path="../_references.js" />
(function(global, $, undefined) {
"use strict";
(function() {
/* Setup */

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
		this._firstName = val;
	}

	Person.prototype = personProto;

	function updown(val, lower) {
		lower = this.tagCtx.props.lower !== undefined ? this.tagCtx.props.lower : lower;
		val = person1.firstName() + (val||"");
		return (lower === true ? val.toLowerCase() : val.toUpperCase()) + settings.width + this.tagCtx.props.added;
	}

	function sort(array) {
		var ret = "";
		if (this.tagCtx.props.reverse) {
			// Render in reverse order
			var test = this.tagCtx.view.getRsc("helpers", "foo");
			if (arguments.length > 1) {
				for (i = arguments.length; i; i--) {
					ret += sort.call(this, arguments[ i - 1 ]);
				}
			} else for (var i = array.length; i; i--) {
				ret += this.tagCtx.render(array[ i - 1 ]);
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

	personProto.firstName.depends = [settings, "title"];

	updown.depends = function() {
		return [person1, "firstName", "~settings.width"];
	}

// =============== RESOURCES ===============
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
		.tags({
			tmplTag: {
				template: "Name: {{:firstName()}}. Width: {{:~settings.width}}",
				depends: ["firstName", "~settings.width"]
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
		myWrap: {init: function(tc) {
			var test = tc.props.val;
		}
		},
		myWrap2: {},
		myFlow: {
			flow: true
		},
		myWrapElCnt: {
			attr: "html",
			render: function() {
				return "<tbody>" + this.tagCtx.render() + "</tbody>";
			},
			onAfterLink: function() {
				//debugger;
			}
		},
		myWrap2ElCnt: {
			attr: "html",
			render: function() {
				return "<td>" + this.tagCtx.render() + "</td>";
			},
			onAfterLink: function() {
				//debugger;
			}
		},
		myFlowElCnt: {
			attr: "html",
			flow: true,
			render: function() {
				return "<td>" + this.tagCtx.render() + "</td>";
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
								+ '{{myWrap2}}'
									+ '{{if true}}xx<span id="sp{{:#getIndex()}}"></span>{{/if}}'
								+ '{{/myWrap2}}'
							+ '{{/if}}'
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
								+ '{{myWrap2ElCnt}}'
									+ 'xx<span id="sp{{:#getIndex()+1}}"></span>'
								+ '{{/myWrap2ElCnt}}'
							+ '{{/if}}'
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
					+ 'aa{^{myWrap val=1}}inside'
						+ '<span id="{{:~index+1}}">'
							+ '<em>a</em>'
							+ '{^{myWrap2}}'
								+ '{{if true}}xx<span id="sp{{:#getIndex()}}"></span>{{/if}}'
								+ '{^{myFlow val=3}}xyz{{/myFlow}}'
							+ '{{/myWrap2}}'
							+ '{^{if true}}'
								+ '{^{myWrap2}}'
									+ '{{if true}}xx<span id="sp{{:#getIndex()}}"></span>{{/if}}'
									+ '{^{myFlow val=3}}xyz{{/myFlow}}'
								+ '{{/myWrap2}}'
							+ '{{/if}}'
							+ '{{if true}}'
								+ '<td>yy</td>'
							+ '{{/if}}'
							+ '{^{myFlow val=4}}'
								+ '<span>zz</span>'
							+ '{{/myFlow}}'
						+ '</span>'
					+ '{{/myWrap}}'
					+ 'bb{^{myWrap val=2/}}'
					+ 'cc{{myWrap val=3 "this is unbound"/}}'
				+ '{{/if}}'
				+ 'www<span id="b{{:#index+1}}"></span>'
			+ '{{/for}}',

		boundTmplHierarchyElCnt:

			'<table>{{for people ~val=1}}'
				+ '{{if true ~index=#index}}'
					+ '{^{myWrapElCnt val=1}}'
						+ '<tr id="tr{{:~index+1}}">'
							+ '{^{myWrap2ElCnt val=11}}'
								+ 'xx<span id="sp{{:#getIndex()+1}}"></span>'
								+ '{^{myFlow val=3}}xyz{{/myFlow}}'
							+ '{{/myWrap2ElCnt}}'
							+ '{^{if true}}'
								+ '{^{myWrap2ElCnt val=22}}'
									+ 'xx<span id="sp{{:#getIndex()+1}}"></span>'
									+ '{^{myFlow val=3}}xyz{{/myFlow}}'
								+ '{{/myWrap2ElCnt}}'
							+ '{{/if}}'
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

		boundTmplHierarchyElCntWithDataLink: '<table data-link="{myWrapElCnt val=1 tmpl=\'wrapCnt\'} class{:lastName}"></table>',

		wrapCnt: '<tr id="tr{{:~index+1}}" data-link="{myWrap2ElCnt val=2 tmpl=\'innerWrap\'}"></tr>',

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

	switch (eventArgs.change) {
		case "set":
			var oldValue = eventArgs.oldValue,
				value = eventArgs.value;

			oldValue = (typeof oldValue === "function") ? (oldValue = "" + oldValue, oldValue.slice(0, oldValue.indexOf("{"))) : oldValue;
			value = (typeof value === "function") ? (value = "" + value, value.slice(0, value.indexOf("{"))) : value;
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
	return result;
}

// End Setup

//test("TEST", function() {
//});
//return;
module("Template structure");

test("Template validation", function() {

	// =============================== Arrange ===============================
	try {
		$.templates('<table>{{for things}}<tr><td>}{{:thing}}</td></tr>{{/for}}</table>')
		.link("#result", {things: [{thing: "Orig"}]});
	} catch (e) {
		result = e.message;
	}

	// ............................... Assert .................................
	equal(result.indexOf("Parent of <tr> must be <tbody>"), 0, "Validation - missing closing tag");
	result = "";

	// =============================== Arrange ===============================
	try {
		$.templates('<div>{{:Thing}}<span></div>')
		.link("#result", {thing: "Orig"});
	} catch (e) {
		result = e.message;
	}

	// ............................... Assert .................................
	equal(result.indexOf("Syntax error\nMismatch: '</div>'"), 0, "Validation - missing closing tag");
	result = "";

	// =============================== Arrange ===============================
	try {
		$.templates('<div>{{:Thing}}</span></div>')
		.link("#result", {thing: "Orig"});
	} catch (e) {
		result = e.message;
	}

	// ............................... Assert .................................
	equal(result.indexOf("Syntax error\nMismatch: '</span>'"), 0, "Validation - missing opening tag");
	result = "";

	// =============================== Arrange ===============================
	try {
		$.templates('<span>{{:Thing}}</span></span>')
		.link("#result", {thing: "Orig"});
	} catch (e) {
		result = e.message;
	}

	// ............................... Assert .................................
	equal(result.indexOf("Syntax error\nMismatch: '</span>'"), 0, "Validation - extra closing tag");
	result = "";

	// =============================== Arrange ===============================
	try {
		$.templates('<span>{{:Thing}}</span></div>')
		.link("#result", {thing: "Orig"});
	} catch (e) {
		result = e.message;
	}

	// ............................... Assert .................................
	equal(result.indexOf("Syntax error\nMismatch: '</div>'"), 0, "Validation - extra closing tag");
	result = "";

	// =============================== Arrange ===============================
	try {
		$.templates('<div>{{:Thing}}<span/></div>')
		.link("#result", {thing: "Orig"});
	} catch (e) {
		result = e.message;
	}

	// ............................... Assert .................................
	equal(result.indexOf("Syntax error\n'<span.../>'"), 0, "Validation - self-closing tag is not a void element");
	result = "";

	// =============================== Arrange ===============================
	try {
		$.templates('<div>{{:Thing}}')
		.link("#result", {thing: "Orig"});
	} catch (e) {
		result = e.message;
	}

	// ............................... Assert .................................
	equal(result.indexOf("Syntax error\nMismatched '<div...>'"), 0, "Validation - missing closing tag");
	result = "";

	// =============================== Arrange ===============================
	try {
		$.templates('</div>{{:Thing}}')
		.link("#result", {thing: "Orig"});
	} catch (e) {
		result = e.message;
	}

	// ............................... Assert .................................
	equal(result.indexOf("Syntax error\nMismatch: '</div>'"), 0, "Validation - missing opening tag");
	result = "";

	// =============================== Arrange ===============================
	try {
		$.templates('<div/>')
		.link("#result", {thing: "Orig"});
	} catch (e) {
		result = e.message;
	}

	// ............................... Assert .................................
	equal(result.indexOf("Syntax error\n'<div.../>'"), 0, "Validation - self-closing tag is not a void element");
	result = "";

	// =============================== Arrange ===============================
	try {
		$.templates('<div>{{:Thing}}<input></input></div>')
		.link("#result", {thing: "Orig"});
	} catch (e) {
		result = e.message;
	}

	// ............................... Assert .................................
	equal(result.indexOf("Syntax error\n'</input>'"), 0, "Validation - closing tag for a void element");
	result = "";

	// =============================== Arrange ===============================
	$.templates('prop: <input id="last" data-link="lastName"/><br><div><br/>{{if true}}<input id="{{:\'last\'}}" data-link="lastName">{{/if}}<img/></div><img>')
		.link("#result", person1);

	// ................................ Act ..................................
	result = $("#result input")[0].value + $("#result input")[1].value;

	$.observable(person1).setProperty("lastName", "Two");
	result += $("#result input")[0].value + $("#result input")[1].value;
	// ............................... Assert .................................
	equal(result, "OneOneTwoTwo", "Validation - void elements can have self-close slashes, or not...");
	result = "";

	// TODO Later add support for validation error messages in these cases:
	//'<span {{if true}}id="last\"{{/if}}>a</ps'
	//'<input {{if true}}id="last\"{{/if}} data-link="lastName">'
	//'<input {{if true}}id="last\"/> {{else}}... />{{/if}}'

	// ................................ Reset ................................

	person1.lastName = "One";
	// The syntax error exceptions thrown above meant some views were not fully linked. We will 'force remove' them from the viewStore and the top view children
	var v, viewstore = $.view().views;
	for (v in viewstore) {
		delete viewstore[v];
	}
	viewstore = _jsv.views;
	for (v in viewstore) {
		if (v !== "0") {
			delete viewstore[v];
		}
	}
});

module("API - data-link");

test("link(expression, container, data)", function() {

	// =============================== Arrange ===============================
	$("#result").html('<span id="inner"></span>')
	$.link("lastName 44 a=3", "#inner", person1);

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

	var tmpl = $.templates("{^{:lastName}}");
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

	// ................................ Reset ................................
	$("#result").empty();
	person1.lastName = "One"; // reset Prop

	// =============================== Arrange ===============================

	var tmpl = $.templates("{^{for #data}}{^{:lastName}}{{/for}}");
	$.link(tmpl, "#result", person1);

	// ................................ Act ..................................
	before = $("#result").text();
	$.observable(person1).setProperty("lastName", "newLast");
	after = $("#result").text();

	// ............................... Assert .................................
	equal(before + "|" + after,
	'One|newLast',
	'$.link(template, "#container", data) links template to content of container (equivalent to template.link(container, data). Example 2.');
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

module("template.link()");

test("helper overriding", 12, function() {
	// =============================== Arrange ===============================
	$.views.helpers("a", "globalHelper");

	var tmpl = $.templates({
		markup: "{{:~a}} {{:~b}} {{:~c}}",
		helpers: {
			b: "templateHelper"
		}
	});

	tmpl.link("#result", {}, {c:"optionHelper"})

	// ............................... Assert .................................
	equal($("#result").text(), "globalHelper templateHelper optionHelper", 'Passing in helpers - global, template or option');

	// =============================== Arrange ===============================
	var tmpl = $.templates({
		markup: "{{:~a}}",
		helpers: {
			a: "templateHelper"
		}
	});

	tmpl.link("#result", {})

	// ............................... Assert .................................
	equal($("#result").text(), "templateHelper", 'template helper overrides global helper');

	// =============================== Arrange ===============================
	var tmpl = $.templates({
		markup: "{{:~a}}"
	});

	tmpl.link("#result", {}, {a: "optionHelper"})

	// ............................... Assert .................................
	equal($("#result").text(), "optionHelper", 'option helper overrides global helper');

	// =============================== Arrange ===============================
	var tmpl = $.templates({
		markup: "{{:~b}}",
		helpers: {
			b: "templateHelper"
		}
	});

	tmpl.link("#result", {}, {b: "optionHelper"})

	// ............................... Assert .................................
	equal($("#result").text(), "templateHelper", 'template helper overrides option helper');

	// =============================== Arrange ===============================
	$.views.helpers("a", "globalHelper");

	$("#result").html("<div data-link='~a + ~b'></div>")

	$.link(true, "#result", {}, {b:"optionHelper"})

	// ............................... Assert .................................
	equal($("#result").text(), "globalHelperoptionHelper", 'Passing in helpers to top-level linking - global or option');

	// =============================== Arrange ===============================
	$.views.helpers("a", "globalHelper");

	$("#result").html("<div data-link='~a'></div>")

	$.link(true, "#result", {}, {a:"optionHelper"})

	// ............................... Assert .................................
	equal($("#result").text(), "optionHelper", 'Passing in helpers to top-level linking - option overrides global');

	// =============================== Arrange ===============================
	$.views.helpers({
		onBeforeChange: function(ev, eventArgs) {
			result+= "globalBeforeChange|" + eventArgs.change + "|" + (this.tag ? this.tag.tagName : this.elem.tagName) + " ";
		},
		onAfterChange: function(ev, eventArgs) {
			result+= "globalAfterChange|" + eventArgs.change + "|" + (this.tag ? this.tag.tagName : this.elem.tagName) + " ";
		},
		onAfterCreate: function(ev, eventArgs) {
			result+= "globalAfterCreate ";
		}
	});
	result = '';

	var pson = {name: "Jo"},

		tmpl = $.templates({
			markup: "<input data-link='name'/> {^{:name}}"
		});

	tmpl.link("#result", pson);

	$.observable(pson).setProperty("name", "name3");

	// ............................... Assert .................................
	equal(result, "globalAfterCreate globalBeforeChange|set|INPUT globalAfterChange|set|INPUT globalBeforeChange|set|: globalAfterChange|set|: ",
		'Global onAfterCreate, onBeforeChange, onAfterChange - setProperty');

	result = '';

	$("#result input").val("editedName").change();

		// ............................... Assert .................................
	equal(result, "globalBeforeChange|change|INPUT globalBeforeChange|set|INPUT globalBeforeChange|set|: globalAfterChange|set|: globalAfterChange|change|INPUT ",
		'Global onAfterCreate, onBeforeChange, onAfterChange - elemChange');

	result = '';

	// =============================== Arrange ===============================
	tmpl.link("#result", pson, {
			onBeforeChange: function(ev, eventArgs) {
				result+= "optionsBeforeChange|" + eventArgs.change + "|" + (this.tag ? this.tag.tagName : this.elem.tagName) + " ";
			},
			onAfterChange: function(ev, eventArgs) {
				result+= "optionsAfterChange|" + eventArgs.change + "|" + (this.tag ? this.tag.tagName : this.elem.tagName) + " ";
			},
			onAfterCreate: function(ev, eventArgs) {
				result+= "optionsAfterCreate ";
			}
		});

	$.observable(pson).setProperty("name", "name2");

	// ............................... Assert .................................
	equal(result, "optionsAfterCreate optionsBeforeChange|set|INPUT optionsAfterChange|set|INPUT optionsBeforeChange|set|: optionsAfterChange|set|: ",
		'options helper overrides global helper');

	result = '';

	$("#result input").val("editedName").change();

		// ............................... Assert .................................
	equal(result, "optionsBeforeChange|change|INPUT optionsBeforeChange|set|INPUT optionsBeforeChange|set|: optionsAfterChange|set|: optionsAfterChange|change|INPUT ",
		'options helper overrides global helper');

	result = '';

	// =============================== Arrange ===============================
	tmpl = $.templates({
		markup: "<input data-link='name'/> {^{:name}}",
		helpers: {
			onBeforeChange: function(ev, eventArgs) {
				result+= "templateBeforeChange|" + eventArgs.change + "|" + (this.tag ? this.tag.tagName : this.elem.tagName) + " ";
			},
			onAfterChange: function(ev, eventArgs) {
				result+= "templateAfterChange|" + eventArgs.change + "|" + (this.tag ? this.tag.tagName : this.elem.tagName) + " ";
			},
			onAfterCreate: function(ev, eventArgs) {
				result+= "templateAfterCreate ";
			}
		}
	});

	tmpl.link("#result", pson, {
			onBeforeChange: function(ev, eventArgs) {
				result+= "optionsBeforeChange|" + eventArgs.change + "|" + (this.tag ? this.tag.tagName : this.elem.tagName) + " ";
			},
			onAfterChange: function(ev, eventArgs) {
				result+= "optionsAfterChange|" + eventArgs.change + "|" + (this.tag ? this.tag.tagName : this.elem.tagName) + " ";
			},
			onAfterCreate: function(ev, eventArgs) {
				result+= "optionsAfterCreate ";
			}
		});

	$.observable(pson).setProperty("name", "name4");

	// ............................... Assert .................................
	equal(result, "templateAfterCreate templateBeforeChange|set|INPUT templateAfterChange|set|INPUT templateBeforeChange|set|: templateAfterChange|set|: ",
		'template helper overrides options helper');

	result = '';

	$("#result input").val("editedName").change();

		// ............................... Assert .................................
	equal(result, "templateBeforeChange|change|INPUT templateBeforeChange|set|INPUT templateBeforeChange|set|: templateAfterChange|set|: templateAfterChange|change|INPUT ",
		'template helper overrides options helper');

	result = '';

	$.views.helpers({
		onBeforeChange: null,
		onAfterChange: null,
		onAfterCreate: null
	});
	$("#result").empty()
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

	$.templates('<span data-link="foo(\'x\\x\').b"></span>')
		.link("#result",{
			foo: function(val){
				return {b:val};
			}
		});

	// ............................... Assert .................................
	equal($("#result span")[0].outerHTML,
	'<span data-link="foo(\'x\\x\').b">x\\x</span>',
	'Escaping of characters: data-link="foo(\'x\\x\').b"');
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

test('data-link="attr{:expression}"', function() {

	// =============================== Arrange ===============================

	$.templates('prop: <span data-link="class{:lastName}"></span>')
		.link("#result", person1);

	// ................................ Act ..................................
	before = $("#result span")[0].className;
	$.observable(person1).setProperty("lastName", "xxx");
	after = $("#result span")[0].className;

	// ............................... Assert .................................
	equal(before + "|" + after,
	'One|xxx',
	'Data link using: <span data-link="class{:lastName}"></span>, and setting lastName to "xxx" - sets className to "xxx"');
	// -----------------------------------------------------------------------

	// ................................ Reset ................................
	$("#result").empty();
	person1.lastName = "One"; // reset Prop

	// =============================== Arrange ===============================

	$.templates('prop: <span data-link="title{:lastName}"></span>')
		.link("#result", person1);

	// ................................ Act ..................................
	before = $("#result span").attr("title");
	$.observable(person1).setProperty("lastName", "xxx");
	after = $("#result span").attr("title");

	// ............................... Assert .................................
	equal(before + "|" + after,
	'One|xxx',
	'Data link using: <span data-link="title{:lastName}"></span>, and setting lastName to "xxx" - sets title to "xxx"');
	// -----------------------------------------------------------------------

	// ................................ Reset ................................
	$("#result").empty();
	person1.lastName = "One"; // reset Prop

	// =============================== Arrange ===============================

	$.templates('prop: <span data-link="title{:lastName}"></span>')
		.link("#result", person1);

	// ................................ Act ..................................
	before = $("#result span")[0].getAttribute("title");
	$.observable(person1).setProperty("lastName", "");
	after = $("#result span")[0].getAttribute("title");

	// ............................... Assert .................................
	ok(before === 'One' && after === "",
	'Data link using: <span data-link="title{:lastName}"></span>, and setting lastName to "" - sets title to ""');
	// -----------------------------------------------------------------------

	// ................................ Reset ................................
	$("#result").empty();
	person1.lastName = "One"; // reset Prop

	// =============================== Arrange ===============================

	$.templates('prop: <span data-link="title{:lastName}"></span>')
		.link("#result", person1);

	// ................................ Act ..................................
	before = $("#result span")[0].getAttribute("title");
	$.observable(person1).setProperty("lastName", null);
	after = $("#result span")[0].getAttribute("title");

	// ............................... Assert .................................
	ok(before === 'One' && after === null && $("#result span")[0].outerHTML === "<span data-link=\"title{:lastName}\"></span>",
	'Data link using: <span data-link="title{:lastName}"></span>, and setting lastName to null - removes title attribute');
	// -----------------------------------------------------------------------

	// ................................ Reset ................................
	$("#result").empty();
	person1.lastName = "One"; // reset Prop

	// =============================== Arrange ===============================

	$.templates('prop: <span data-link="{:lastName}"></span>')
		.link("#result", person1);

	// ................................ Act ..................................
	before = $("#result span").html();
	$.observable(person1).setProperty("lastName", null);
	after = $("#result span").html();

	// ............................... Assert .................................
	ok(before === 'One' && after === "",
	'Data link using: <span data-link="{:lastName}"></span>, and setting lastName to null - sets content to empty string');
	// -----------------------------------------------------------------------

	// ................................ Reset ................................
	$("#result").empty();
	person1.lastName = "One"; // reset Prop

	// =============================== Arrange ===============================

	$.templates("prop: <span data-link=\"html{:lastName||''}\"></span>")
		.link("#result", person1);

	// ................................ Act ..................................
	before = $("#result span").html();
	$.observable(person1).setProperty("lastName", null);
	after = $("#result span").html();

	// ............................... Assert .................................
	ok(before === 'One' && after === "",
	"Data link using: <span data-link=\"html{:lastName||''}\"></span>, and setting lastName to null - sets content to empty string");
	// -----------------------------------------------------------------------

	// ................................ Reset ................................
	$("#result").empty();
	person1.lastName = "One"; // reset Prop

	// =============================== Arrange ===============================

	$.templates('prop: <span data-link="title{:lastName}"></span>')
		.link("#result", person1);

	// ................................ Act ..................................
	before = $("#result span")[0].getAttribute("title");
	$.observable(person1).setProperty("lastName", undefined);
	after = $("#result span")[0].getAttribute("title");

	// ............................... Assert .................................
	ok(before === 'One' && after === "",
	'Data link using: <span data-link="title{:lastName}"></span>, and setting lastName to undefined - sets title to ""');
	// -----------------------------------------------------------------------

	// ................................ Reset ................................
	$("#result").empty();
	person1.lastName = "One"; // reset Prop

	// =============================== Arrange ===============================

	$.templates('prop: <span data-link="title{:lastName}"></span>')
		.link("#result", person1);

	// ................................ Act ..................................
	before = $("#result span")[0].getAttribute("title");
	$.observable(person1).setProperty("lastName", undefined);
	after = $("#result span")[0].getAttribute("title");

	// ............................... Assert .................................
	ok(before === 'One' && after === "",
	'Data link using: <span data-link="title{:lastName}"></span>, and string lastName to undefined - sets title to ""');
	// -----------------------------------------------------------------------

	// ................................ Reset ................................
	$("#result").empty();
	person1.lastName = "One"; // reset Prop

	// =============================== Arrange ===============================

	$.templates('prop: <span data-link="title{:lastName}"></span>')
		.link("#result", person1);

	// ................................ Act ..................................
	before = $("#result span")[0].getAttribute("title");
	$.observable(person1).setProperty("lastName", false);
	after = $("#result span")[0].getAttribute("title");

	// ............................... Assert .................................
	ok(before === 'One' && after === "false",
	'Data link using: <span data-link="title{:lastName}"></span>, and string lastName to false - sets title to "false"');
	// -----------------------------------------------------------------------

	// ................................ Reset ................................
	$("#result").empty();
	person1.lastName = "One"; // reset Prop

	// =============================== Arrange ===============================

	$.templates('prop: <span data-link="visible{:lastName}"></span>')
		.link("#result", person1);

	// ................................ Act ..................................
	before = $("#result span")[0].style.display;
	$.observable(person1).setProperty("lastName", "");
	after = $("#result span")[0].style.display;

	// ............................... Assert .................................
	ok(before === "inline" && after === "none",
	'Data link using: <span data-link="visible{:lastName}"></span>, and string lastName to "" - sets display to "none"');
	// -----------------------------------------------------------------------

	// ................................ Reset ................................
	$("#result").empty();
	person1.lastName = "One"; // reset Prop

	// =============================== Arrange ===============================

	$.templates('prop: <span data-link="visible{:lastName}"></span>')
		.link("#result", person1);

	// ................................ Act ..................................
	before = $("#result span")[0].style.display;
	$.observable(person1).setProperty("lastName", null);
	after = $("#result span")[0].style.display;

	// ............................... Assert .................................
	ok(before === "inline" && after === "none",
	'Data link using: <span data-link="visible{:lastName}"></span>, and string lastName to null - sets display to "none"');
	// -----------------------------------------------------------------------

	// ................................ Reset ................................
	$("#result").empty();
	person1.lastName = "One"; // reset Prop

	// =============================== Arrange ===============================

	$.templates('prop: <span data-link="visible{:lastName}"></span>')
		.link("#result", person1);

	// ................................ Act ..................................
	before = $("#result span")[0].style.display;
	$.observable(person1).setProperty("lastName", undefined);
	after = $("#result span")[0].style.display;

	// ............................... Assert .................................
	ok(before === "inline" && after === "none",
	'Data link using: <span data-link="visible{:lastName}"></span>, and string lastName to undefined - sets display to "none"');
	// -----------------------------------------------------------------------

	// ................................ Reset ................................
	$("#result").empty();
	person1.lastName = "One"; // reset Prop

	// =============================== Arrange ===============================

	$.templates('prop: <span data-link="visible{:lastName}"></span>')
		.link("#result", person1);

	// ................................ Act ..................................
	before = $("#result span")[0].style.display;
	$.observable(person1).setProperty("lastName", false);
	after = $("#result span")[0].style.display;

	// ............................... Assert .................................
	ok(before === "inline" && after === "none",
	'Data link using: <span data-link="visible{:lastName}"></span>, and string lastName to undefined - sets display to "none"');
	// -----------------------------------------------------------------------

	// ................................ Reset ................................
	$("#result").empty();
	person1.lastName = "One"; // reset Prop

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
	"mr jotwo30Mr Xavier|sir newonefirstnewtwolast40Sir newTwoFirst",
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
			from: function(val) {
				return val + "from" + this.tagCtx.props.frst;
			},
			to: function(val){
				return val + "to" + this.tagCtx.props.frst;
			}
		});

	// =============================== Arrange ===============================

	$.templates('prop: <input id="twoWay" data-link="{:lastName frst=firstName():to}"/>')
		.link("#result", person1);

	// ................................ Act ..................................
	var value = $("#twoWay").val();
	$("#twoWay").val(value + "+").change();

	// ............................... Assert .................................
	equal(person1.lastName,
	"One+toMr Jo",
	'Data link using: <input data-link="{:expr:to}"/> with no convert. - convertBack called with tag as this pointer.');
	// -----------------------------------------------------------------------

	// ................................ Reset ................................
	$("#result").empty();
	person1.lastName = "One"; // reset Prop

	// =============================== Arrange ===============================

	$.templates('prop: <input id="twoWay" data-link="{from:lastName frst=firstName():to}"/>')
		.link("#result", person1);

	// ................................ Act ..................................
	value = $("#twoWay").val();
	$("#twoWay").val(value + "+").change();

	// ............................... Assert .................................
	equal(person1.lastName,
	"OnefromMr Jo+toMr Jo",
	'Data link using: <input data-link="{from:expr:to}"/> - convert and convertBack called with tag as this pointer.');
	// -----------------------------------------------------------------------

	// ................................ Reset ................................
	$("#result").empty();
	person1.lastName = "One"; // reset Prop

	// =============================== Arrange ===============================

	var tmpl = $.templates('prop: <input id="twoWay" data-link="{from:lastName frst=firstName():to}"/>'
								+ '{{for true}}prop: <input id="twoWayInner" data-link="{from:~root.lastName frst=~root.firstName():to}"/>{{/for}}');

	$.views
		.converters({
			from: function(val) {
				return val + "from" + this.tagCtx.props.frst;
			},
			to: function(val){
				return val + "to" + this.tagCtx.props.frst;
			}
		}, tmpl);

	// =============================== Arrange ===============================

	tmpl.link("#result", person1);

	// ................................ Act ..................................
	value = $("#twoWay").val();
	$("#twoWay").val(value + "+").change();

	// ............................... Assert .................................
	equal(person1.lastName,
	"OnefromMr Jo+toMr Jo",
	'Data link using: <input data-link="{from:expr:to}"/> - with converters local to template: convert and convertBack called with tag as this pointer.');
	// -----------------------------------------------------------------------

	// ................................ Act ..................................
	value = $("#twoWayInner").val();
	$("#twoWayInner").val(value + "+").change();

	// ............................... Assert .................................
	equal(person1.lastName,
	"OnefromMr Jo+toMr JofromMr Jo+toMr Jo",
	'Data link using: <input data-link="{from:expr:to}"/> in nested block - with converters local to template: convert and convertBack called with tag as this pointer.');
	// -----------------------------------------------------------------------

	// ................................ Reset ................................
	$("#result").empty();
	person1.lastName = "One"; // reset Prop
});

test('data-link="{for...}"', function() {
	// =============================== Arrange ===============================

	model.things = [{thing: "box"}]; // reset Prop

	// ................................ Arrange ..................................
	var tmpl = $.templates('<span data-link="{for things tmpl=\'inner\'}"></span>');
	$.templates("inner", "{{:thing}}", tmpl);

	tmpl.link("#result", model);

	// ................................ Act ..................................
	before = $("#result").text();
	$.observable(model.things).insert(0, {thing: "tree"});
	after = $("#result").text();

	// ............................... Assert .................................
	equal(before + "|" + after, 'box|treebox',
	'data-link="{for things}" binds to array changes on leaf array');

	// ................................ Act ..................................
	$.observable(model).setProperty({things:[{thing: "triangle"}, {thing: "circle"}]});
	after = $("#result").text();

	// ............................... Assert .................................
	equal(after, 'trianglecircle',
	'data-link="{for things} binds to property change on path');

	// ................................ Act ..................................
	$.observable(model).setProperty({things:{thing: "square"}});
	after = $("#result").text();

	// ............................... Assert .................................
	equal(after, 'square',
	'data-link="{for things} binds to property change on path - swapping from array to singleton object');
	// -----------------------------------------------------------------------

	// =============================== Arrange ===============================

	model.things = [{thing: "box"}]; // reset Prop

	// ................................ Arrange ..................................
	var countItems = 0;
	tmpl = $.templates('<span data-link="{for things tmpl=\'inner\'}"></span>');

	$.templates("inner", "{{test:thing}}", tmpl);
	$. views.converters("test", function(val) {
		return val + countItems++;
	}, tmpl);

	tmpl.link("#result", model);

	// ................................ Act ..................................
	before = $("#result").text();
	$.observable(model.things).insert([{thing: "addedA"},{thing: "addedB"}]);
	after = $("#result").text();

	// ............................... Assert .................................
	equal(before + "|" + after, 'box0|box0addedA1addedB2',
	'data-link="{for things}" binds to array changes and the changes are rendered incrementally');

	// ................................ Arrange ..................................
	model.things = [{thing: "box"}]; // reset Prop
	countItems = 0;

	tmpl = $.templates('<ul data-link="{for things tmpl=\'inner\'}"></ul>');

	$.templates("inner", "<li>{{test:thing}}</li>", tmpl);
	$. views.converters("test", function(val) {
		return val + countItems++;
	}, tmpl);

	tmpl.link("#result", model);

	// ................................ Act ..................................
	before = $("#result").text();
	$.observable(model.things).insert([{thing: "addedA"},{thing: "addedB"}]);
	after = $("#result").text();

	// ............................... Assert .................................
	equal(before + "|" + after, 'box0|box0addedA1addedB2',
	'data-link="{for things}" in elCnt binds to array changes and the changes are rendered incrementally');

	// ................................ Reset ................................
	$("#result").empty();
	model.things = []; // reset Prop
});

test('data-link="{tag...}"', function() {

	$.views.tags({
		norendernotemplate: {},
		voidrender: function() {},
		emptyrender: function() {return ""},
		emptytemplate: {
			template: ""
		},
		templatereturnsempty: {
			template: "{{:a}}"
		}
	});

	// ............................... Assert .................................
	$.templates('a<span date-link="{norendernotemplate}"></span>b').link("#result", 1);
	equals($("#result").text(), "ab",
	"non-rendering tag (no template, no render function) renders empty string");

	$.templates('a<span date-link="{voidrender}"></span>b').link("#result", 1);
	equals($("#result").text(), "ab",
	"non-rendering tag (no template, no return from render function) renders empty string");

	$.templates('a<span date-link="{emptyrender}"></span>b').link("#result", 1);
	equals($("#result").text(), "ab",
	"non-rendering tag (no template, empty string returned from render function) renders empty string", 1);

	$.templates('a<span date-link="{emptytemplate}"></span>b').link("#result", 1);
	equals($("#result").text(), "ab",
	"non-rendering tag (template has no content, no render function) renders empty string");

	$.templates('a<span date-link="{templatereturnsempty}"></span>b').link("#result", 1);
	equals($("#result").text(), "ab",
	"non-rendering tag (template returns empty string, no render function) renders empty string");

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

	// =============================== Arrange ===============================
	var refreshCount = 0,
		app = {
			arr: [1,2],
			editable: true
		};
	$.views.tags("tagDependsOnArray", {
		template:"{{:things.length}}, {{:~app.arr.length}}, {{:~app.editable}}",
		onArrayChange: function() {
			refreshCount++;
			this.refresh();
		},
		depends: ["things", "~app.arr", "~app.editable"]
	});

	$.templates('<span data-link="{tagDependsOnArray}"></span>')
		.link("#result", model, {app: app});

	// ................................ Act ..................................
	result = $("#result span").text();
	$.observable(app).setProperty({editable: false});
	result += "|setBoolProp: " + $("#result span").text();
	$.observable(model).setProperty({things: [4,5,6,7]});
	result += "|setArrProp1: " + $("#result span").text();
	$.observable(app).setProperty({arr: [1,2,3]});
	result += "|setArrProp2: " + $("#result span").text();
	$.observable(model.things).insert([8,9]);
	result += "|insertArr1: " + $("#result span").text();
	$.observable(app.arr).insert(8);
	result += "|insertArr2: " + $("#result span").text();

	// ............................... Assert .................................
	equal(result + "|" + refreshCount,
	"0, 2, true|setBoolProp: 0, 2, false|setArrProp1: 4, 2, false|setArrProp2: 4, 3, false|insertArr1: 6, 3, false|insertArr2: 6, 4, false|2",
	'Data link using: <span data-link="{tagDependsOnArray}"></span> with onArrayChange handler: updates correctly when setting dependent props,'
	+  ' and fires onArrayChange once for each array change on dependent arrays');


	// =============================== Arrange ===============================
	app = {
		arr: [1,2],
		editable: true
	};
	model.things = [];

	$.views.tags("tagDependsOnArray", {
		template:"{{:things.length}}, {{:~app.arr.length}}, {{:~app.editable}}",
		depends: ["things", "~app.arr", "~app.editable"]
	});

	$.templates('<span data-link="{tagDependsOnArray}"></span>')
		.link("#result", model, {app: app});

	// ................................ Act ..................................
	result = $("#result span").text();
	$.observable(app).setProperty({editable: false});
	result += "|setBoolProp: " + $("#result span").text();
	$.observable(model).setProperty({things: [4,5,6,7]});
	result += "|setArrProp1: " + $("#result span").text();
	$.observable(app).setProperty({arr: [1,2,3]});
	result += "|setArrProp2: " + $("#result span").text();
	$.observable(model.things).insert([8,9]);
	result += "|insertArr1: " + $("#result span").text();
	$.observable(app.arr).insert(8);
	result += "|insertArr2: " + $("#result span").text();

	// ............................... Assert .................................
	equal(result,
	"0, 2, true|setBoolProp: 0, 2, false|setArrProp1: 4, 2, false|setArrProp2: 4, 3, false|insertArr1: 4, 3, false|insertArr2: 4, 3, false",
	'Data link using: <span data-link="{tagDependsOnArray}"></span> WITHOUT onArrayChange handler: updates correctly when setting dependent props, does NOT update when modifying dependent arrays');

	// =============================== Arrange ===============================
	app = {
		arr: [1,2],
		editable: true
	};
	model.things = [];
	refreshCount = 0;

	$.views.tags("tagDependsOnArray", {
		template:"<li>{{:things.length}}, {{:~app.arr.length}}, {{:~app.editable}}</li>",
		onArrayChange: function() {
			refreshCount++;
			this.refresh();
		},
		depends: ["things", "~app.arr", "~app.editable"]
	});

	$.templates('<ul data-link="{tagDependsOnArray}"></ul>')
		.link("#result", model, {app: app});

	// ................................ Act ..................................
	result = $("#result ul").text();
	$.observable(app).setProperty({editable: false});
	result += "|setBoolProp: " + $("#result ul").text();
	$.observable(model).setProperty({things: [4,5,6,7]});
	result += "|setArrProp1: " + $("#result ul").text();
	$.observable(app).setProperty({arr: [1,2,3]});
	result += "|setArrProp2: " + $("#result ul").text();
	$.observable(model.things).insert([8,9]);
	result += "|insertArr1: " + $("#result ul").text();
	$.observable(app.arr).insert(8);
	result += "|insertArr2: " + $("#result ul").text();

	// ............................... Assert .................................
	equal(result + "|" + refreshCount,
	"0, 2, true|setBoolProp: 0, 2, false|setArrProp1: 4, 2, false|setArrProp2: 4, 3, false|insertArr1: 6, 3, false|insertArr2: 6, 4, false|2",
	'Data link using: <span data-link="{tagDependsOnArray}"></span> with onArrayChange handler: updates correctly when setting dependent props,'
	+  ' and fires onArrayChange once for each array change on dependent arrays');

});

test("computed observables in two-way binding", function() {
(function() {
	// =============================== Arrange ===============================
	var person = {
		firstName: "Jeff",
		lastName: "Smith",
		fullName: fullName
	};
	function fullName(reversed) {
		return reversed
			? this.lastName + " " + this.firstName
			: this.firstName + " " + this.lastName;
	}

	fullName.depends = [person, "*"];

	fullName.set = function(val) {
		val = val.split(" ");
		$.observable(this).setProperty({
			lastName: val.pop(),
			firstName: val.join(" ")
		});
	};

	$.templates('{^{:firstName}} {^{:lastName}} {^{:fullName()}} {^{:fullName(true)}} <input id="full" data-link="fullName()"/>')
		.link("#result", person);

	// ................................ Act ..................................
	var res = $("#result").text() + $("#full").val();

	$.observable(person).setProperty({firstName: "newFirst", lastName: "newLast"});

	res += "|" + $("#result").text() + $("#full").val();

	$.observable(person).setProperty({fullName: "compFirst compLast"});

	res += "|" + $("#result").text() + $("#full").val();

	$("#full").val("2wayFirst 2wayLast").change();

	res += "|" + $("#result").text() + $("#full").val();

	// ............................... Assert .................................
	equal(res,
	"Jeff Smith Jeff Smith Smith Jeff Jeff Smith|newFirst newLast newFirst newLast newLast newFirst newFirst newLast|compFirst compLast compFirst compLast compLast compFirst compFirst compLast|2wayFirst 2wayLast 2wayFirst 2wayLast 2wayLast 2wayFirst 2wayFirst 2wayLast",
	'Two-way binding to a computed observable data property correctly calls the setter');

	// ................................ Reset ................................
	$("#result").empty();
})();

(function() {
	// =============================== Arrange ===============================
	// Constructor
	var Person = function(first, last) {
			this._firstName = first;
			this.lastName = last;
		},

		// Prototype
		personProto = {
			// Computed firstName
			firstName: function() {
				return this._firstName;
			},
			// Computed fullName
			fullName: fullName
		};

		personProto.firstName.set = function(val) {
			this._firstName = val;
		}

	Person.prototype = personProto;

	var person = new Person("Jeff", "Smith");

	function fullName(reversed) {
		return reversed
			? this.lastName + " " + this.firstName()
			: this.firstName() + " " + this.lastName;
	}

	fullName.depends = ["firstName", "lastName"];

	fullName.set = function(val) {
		val = val.split(" ");
		$.observable(this).setProperty({
			lastName: val.pop(),
			firstName: val.join(" ")
		});
	};

	$.templates('{^{:firstName()}} {^{:lastName}} {^{:fullName()}} {^{:fullName(true)}} <input id="full" data-link="fullName()"/>')
		.link("#result", person);

	// ................................ Act ..................................
	var res = $("#result").text() + $("#full").val();

	$.observable(person).setProperty({firstName: "newFirst", lastName: "newLast"});

	res += "|" + $("#result").text() + $("#full").val();

	$.observable(person).setProperty({fullName: "compFirst compLast"});

	res += "|" + $("#result").text() + $("#full").val();

	$("#full").val("2wayFirst 2wayLast").change();

	res += "|" + $("#result").text() + $("#full").val();

	// ............................... Assert .................................
	equal(res,
	"Jeff Smith Jeff Smith Smith Jeff Jeff Smith|newFirst newLast newFirst newLast newLast newFirst newFirst newLast|compFirst compLast compFirst compLast compLast compFirst compFirst compLast|2wayFirst 2wayLast 2wayFirst 2wayLast 2wayLast 2wayFirst 2wayFirst 2wayLast",
	'Two-way binding to a computed observable data property defined on the prototype correctly calls the setter');

	// ................................ Reset ................................
	$("#result").empty();
})();

(function() {
	// =============================== Arrange ===============================
	var person = {
		firstName: "Jeff",
		lastName: "Friedman"
	};

	function fullName(reverse) {
		return reverse
			? person.lastName + " " + person.firstName
			: person.firstName + " " + person.lastName;
	}

	fullName.depends = function() {
		return [this, "firstName", "lastName"];
	}

	fullName.set = function(val) {
		val = val.split(" ");
		$.observable(person).setProperty({
			lastName: val.pop(),
			firstName: val.join(" ")
		});
	};

	$.templates('{^{:firstName}} {^{:lastName}} {^{:~fullName()}} {^{:~fullName(true)}} <input id="full" data-link="~fullName()"/>')
		.link("#result", person, {fullName: fullName});

	// ................................ Act ..................................
	var res = $("#result").text() + $("#full").val();

	$.observable(person).setProperty({firstName: "newFirst", lastName: "newLast"});

	res += "|" + $("#result").text() + $("#full").val();

	$("#full").val("2wayFirst 2wayLast").change();

	res += "|" + $("#result").text() + $("#full").val();

	// ............................... Assert .................................
	equal(res,
	"Jeff Friedman Jeff Friedman Friedman Jeff Jeff Friedman|newFirst newLast newFirst newLast newLast newFirst newFirst newLast|2wayFirst 2wayLast 2wayFirst 2wayLast 2wayLast 2wayFirst 2wayFirst 2wayLast",
	'Two-way binding to a computed observable data property defined on the prototype correctly calls the setter');

	// ................................ Reset ................................
	$("#result").empty();
})();
});


module("API - data-bound tags");

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

	$.templates('prop:{^{:wasUndefined}}')
		.link("#result", person1);

	// ................................ Act ..................................
	before = $("#result").text();
	$.observable(person1).setProperty("wasUndefined", "newLast");
	after = $("#result").text();

	// ............................... Assert .................................
	equal(before + "|" + after,
	'prop:|prop:newLast',
	'Data link using: {^{:wasUndefined}} - renders to empty string when undefined, and still binds correctly for subsequent modifications');
	// -----------------------------------------------------------------------

	// ................................ Reset ................................
	$("#result").empty();
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

test("{^{>expression}}", function() {

	// =============================== Arrange ===============================

	$.templates('prop:{^{>lastName + "<br/>"}}')
		.link("#result", person1);

	// ................................ Act ..................................
	before = $("#result").text();
	$.observable(person1).setProperty("lastName", "newLast");
	after = $("#result").text();

	// ............................... Assert .................................
	equal(before + "|" + after,
	'prop:One<br/>|prop:newLast<br/>',
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

	var tmpl = $.templates("{^{>#data.person1.home.address.street}}{^{>person1.home^address.street}}")
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
	$.views.tags({
		norendernotemplate: {},
		voidrender: function() {},
		emptyrender: function() {return ""},
		emptytemplate: {
			template: ""
		},
		templatereturnsempty: {
			template: "{{:a}}"
		}
	});

	// ............................... Assert .................................
	$.templates("a{{norendernotemplate/}}b{^{norendernotemplate/}}c{{norendernotemplate}}{{/norendernotemplate}}d{^{norendernotemplate}}{{/norendernotemplate}}e").link("#result", 1);
	equals($("#result").text(), "abcde",
	"non-rendering tag (no template, no render function) renders empty string");

	$.templates("a{{voidrender/}}b{^{voidrender/}}c{{voidrender}}{{/voidrender}}d{^{voidrender}}{{/voidrender}}e").link("#result", 1);
	equals($("#result").text(), "abcde",
	"non-rendering tag (no template, no return from render function) renders empty string");

	$.templates("a{{emptyrender/}}b{^{emptyrender/}}c{{emptyrender}}{{/emptyrender}}d{^{emptyrender}}{{/emptyrender}}e").link("#result", 1);
	equals($("#result").text(), "abcde",
	"non-rendering tag (no template, empty string returned from render function) renders empty string", 1);

	$.templates("a{{emptytemplate/}}b{^{emptytemplate/}}c{{emptytemplate}}{{/emptytemplate}}d{^{emptytemplate}}{{/emptytemplate}}e").link("#result", 1);
	equals($("#result").text(), "abcde",
	"non-rendering tag (template has no content, no render function) renders empty string");

	$.templates("a{{templatereturnsempty/}}b{^{templatereturnsempty/}}c{{templatereturnsempty}}{{/templatereturnsempty}}d{^{templatereturnsempty}}{{/templatereturnsempty}}e").link("#result", 1);
	equals($("#result").text(), "abcde",
	"non-rendering tag (template returns empty string, no render function) renders empty string");

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

	// =============================== Arrange ===============================
	var refreshCount = 0,
		app = {
			arr: [1,2],
			editable: true
		};
	model.things = [];

	$.views.tags("tagDependsOnArray", {
		template:"{{:things.length}}, {{:~app.arr.length}}, {{:~app.editable}}",
		onArrayChange: function() {
			refreshCount++;
			this.refresh();
		},
		depends: ["things", "~app.arr", "~app.editable"]
	});

	$.templates('{^{tagDependsOnArray/}}')
		.link("#result", model, {app: app});

	// ................................ Act ..................................
	result = $("#result").text();
	$.observable(app).setProperty({editable: false});
	result += "|setBoolProp: " + $("#result").text();
	$.observable(model).setProperty({things: [4,5,6,7]});
	result += "|setArrProp1: " + $("#result").text();
	$.observable(app).setProperty({arr: [1,2,3]});
	result += "|setArrProp2: " + $("#result").text();
	$.observable(model.things).insert([8,9]);
	result += "|insertArr1: " + $("#result").text();
	$.observable(app.arr).insert(8);
	result += "|insertArr2: " + $("#result").text();

	// ............................... Assert .................................
	equal(result + "|" + refreshCount,
	"0, 2, true|setBoolProp: 0, 2, false|setArrProp1: 4, 2, false|setArrProp2: 4, 3, false|insertArr1: 6, 3, false|insertArr2: 6, 4, false|2",
	'Data link using: {^{tagDependsOnArray/}} with onArrayChange handler: updates correctly when setting dependent props,'
	+ ' and fires onArrayChange once for each array change on dependent arrays');

	// =============================== Arrange ===============================
	app = {
		arr: [1,2],
		editable: true
	};
	model.things = [];

	$.views.tags("tagDependsOnArray", {
		template:"{{:things.length}}, {{:~app.arr.length}}, {{:~app.editable}}",
		depends: ["things", "~app.arr", "~app.editable"]
	});

	$.templates('{^{tagDependsOnArray/}}')
		.link("#result", model, {app: app});

	// ................................ Act ..................................
	result = $("#result").text();
	$.observable(app).setProperty({editable: false});
	result += "|setBoolProp: " + $("#result").text();
	$.observable(model).setProperty({things: [4,5,6,7]});
	result += "|setArrProp1: " + $("#result").text();
	$.observable(app).setProperty({arr: [1,2,3]});
	result += "|setArrProp2: " + $("#result").text();
	$.observable(model.things).insert([8,9]);
	result += "|insertArr1: " + $("#result").text();
	$.observable(app.arr).insert(8);
	result += "|insertArr2: " + $("#result").text();

	// ............................... Assert .................................
	equal(result,
	"0, 2, true|setBoolProp: 0, 2, false|setArrProp1: 4, 2, false|setArrProp2: 4, 3, false|insertArr1: 4, 3, false|insertArr2: 4, 3, false",
	'Data link using: {^{tagDependsOnArray/}} WITHOUT onArrayChange handler: updates correctly when setting dependent props, does NOT update when modifying dependent arrays');

	// ................................ Reset ................................
	$("#result").empty();
	person1._firstName = "Jo"; // reset Prop
	person1.lastName = "One"; // reset Prop
	settings.title = "Mr"; // reset Prop
	settings.width = 30; // reset Prop
	settings.reverse = true; // reset Prop
	address1.street = "StreetOne"; // reset Prop

	// =============================== Arrange ===============================
	$.views.tags({
		myTag: {
			template: "<span>{{:~tag.tagCtx.args[0]}}</span>",
			attr: "html"
		}
	});

	$.templates("{^{myTag foo(\"w\\x\'y\").b/}} <div data-link=\"{myTag foo('w\\x').b}\" ></div>")
		.link("#result", {
			foo: function(val) {
				return {b: val};
			}
		});

	// ............................... Assert .................................
	equal($("#result span")[0].outerHTML, "<span>w\\x\'y</span>",
	"{^{myTag foo(\"w\\x\'y\").b/}} - correct compilation and output of quotes and backslash, with object returned in path (so nested compilation)");
	equal($("#result span")[1].outerHTML, "<span>w\\x</span>",
	"<div data-link=\"{myTag foo('w\\x').b}\" > - correct compilation and output of quotes and backslash, with object returned in path (so nested compilation)");
});

test("{^{for}}", function() {

	// =============================== Arrange ===============================

	model.things = [{thing: "box"}]; // reset Prop
	$.templates('{^{for things}}{{:thing}}{{/for}}')
		.link("#result", model);

	// ................................ Act ..................................
	before = $("#result").text();
	$.observable(model.things).insert(0, {thing: "tree"});
	after = $("#result").text();

	// ............................... Assert .................................
	equal(before + "|" + after, 'box|treebox',
	'{^{for things}} binds to array changes on leaf array');

	// ................................ Act ..................................
	$.observable(model).setProperty({things:[{thing: "triangle"}, {thing: "circle"}]});
	after = $("#result").text();

	// ............................... Assert .................................
	equal(after, 'trianglecircle',
	'{^{for things}} binds to property change on path');

	// ................................ Act ..................................
	$.observable(model).setProperty({things:{thing: "square"}});
	after = $("#result").text();

	// ............................... Assert .................................
	equal(after, 'square',
	'{^{for things}} binds to property change on path - swapping from array to singleton object');
	// -----------------------------------------------------------------------

	// ................................ Reset ................................
	$("#result").empty();
	model.things = []; // reset Prop

		// =============================== Arrange ===============================

	model.things = [{thing: "box"}]; // reset Prop

	$.templates('{^{for #data}}{{:thing}}{{/for}}')
		.link("#result", model.things);

	// ................................ Act ..................................
	before = $("#result").text();
	$.observable(model.things).insert(0, {thing: "tree"});
	after = $("#result").text();

	// ............................... Assert .................................
	equal(before + "|" + after, 'box|treebox',
	'{{for #data}} when #data is an array binds to array changes on #data');

	// ................................ Reset ................................
	$("#result").empty();
	model.things = []; // reset Prop

	// =============================== Arrange ===============================

	// ................................ Act ..................................
	$.templates("testTmpl", '{{if ~things.length}}<tbody>{{for ~things}}<tr><td>{{:thing}}</td></tr>{{/for}}</tbody>{{/if}}')
	$.templates('<table><thead><tr><td>top</td></tr></thead>{^{for things ~things=things tmpl="testTmpl"/}}</table>')
		.link("#result", model);

	before = $("#result td").text();
	$.observable(model.things).insert(0, {thing: "tree"});
	after = $("#result").text();

	// ............................... Assert .................................
	equal(before + "|" + after, 'top|toptree',
	'Complex template, with empty placeholder for tbody after thead, and subsequent data-linked insertion of tbody');
	// -----------------------------------------------------------------------

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

	// ................................ Act ..................................
	$.templates("testTmpl", '{{if ~things.length}}<div>{{for ~things}}<span>{{:thing}}</span>{{/for}}</div>{{/if}}')
	$.templates('<div><span>top</span>{^{for things ~things=things tmpl="testTmpl"/}}</div>')
		.link("#result", model);

	before = $("#result div").text();
	$.observable(model.things).insert(0, {thing: "tree"});
	after = $("#result").text();

	// ............................... Assert .................................
	equal(before + "|" + after, 'top|toptree',
	'Complex template, with empty placeholder for span, and subsequent data-linked insertion of in div');
	// -----------------------------------------------------------------------

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

	// ................................ Act ..................................
	$.templates('<table><tbody>{^{for things}}{^{if expanded}}<tr><td>{{:thing}}</td></tr>{{/if}}{{/for}}</tbody></table>')
		.link("#result", model);

	$.observable(model.things).insert(0, [{thing: "tree", expanded: false}]);
	result = $._data(model.things[0]).events.propertyChange.length;
	$.view("#result", true).views._1.views[0].refresh();
	result += "|" + $._data(model.things[0]).events.propertyChange.length;
	$("#result").empty();
	result += "|" + $._data(model.things[0]).events;

	// ............................... Assert .................................
	equal(result, '1|1|undefined',
	'Refreshing a view containing a tag which is bound to dependant data, and has no _prv node, removes the original binding and replaces it with a new one');

	// ................................ Reset ................................
	$("#result").empty();
	model.things = []; // reset Prop

	// =============================== Arrange ===============================

	// ................................ Act ..................................
	$.templates('<div>{^{for things}}{^{if expanded}}{{:thing}}{{/if}}{{/for}}</div>')
		.link("#result", model);

	$.observable(model.things).insert(0, [{thing: "tree", expanded: false}]);
	result = $._data(model.things[0]).events.propertyChange.length;
	$.view("#result", true).views._1.views[0].refresh();
	result += "|" + $._data(model.things[0]).events.propertyChange.length;
	$("#result").empty();
	result += "|" + $._data(model.things[0]).events;

	// ............................... Assert .................................
	equal(result, '1|1|undefined',
	'Refreshing a view containing a tag which is bound to dependant data, and has no _prv node, removes the original binding and replaces it with a new one');

	// ................................ Reset ................................
	$("#result").empty();
	model.things = []; // reset Prop

	// =============================== Arrange ===============================

	// ................................ Act ..................................
	$.templates('<div>{{if true}}{^{:things.length||""}}{{/if}}</div>')
		.link("#result", model);

	before = $("#result div *").length;
	$.view("#result div", true).refresh();
	after = $("#result div *").length
	// ............................... Assert .................................
	equal(after, before,
	'Refreshing a view containing non-elOnly content, with a data-bound tag with no rendered content removes the original script node markers for the tag and replace with the new ones');

	// ................................ Reset ................................
	$("#result").empty();
	model.things = []; // reset Prop

	// =============================== Arrange ===============================

	// ................................ Act ..................................
	$.templates("testTmpl", '{^{if expanded}}<tr><td>{{:thing}}</td></tr>{{/if}}')
	$.templates('<table><tbody>{^{for things tmpl="testTmpl"/}}</tbody></table>')
		.link("#result", model);

	result = $("#result td").text();
	$.observable(model.things).insert(0, [{thing: "tree", expanded: false}, {thing: "bush", expanded: true}]);
	result += "|" + $("#result td").text();
	$.observable(model.things[0]).setProperty("expanded", true);
	$.observable(model.things[1]).setProperty("expanded", false);
	result += "|" + $("#result td").text();

	// ............................... Assert .................................
	equal(result, '|bush|tree',
	'Changing dependant data on bindings with deferred correctly triggers refreshTag and refreshes content with updated data binding');

	// ................................ Act ..................................
	$.view("#result tr").parent.refresh();
	result = $("#result td").text();
	$.view("#result tr").parent.parent.views[1].refresh();
	result += "|" + $("#result td").text();

	// ............................... Assert .................................
	equal(result, 'tree|tree',
	'view refresh with deferred correctly refreshes content');

	// ................................ Act ..................................
	$.observable(model.things[1]).setProperty("expanded", true);
	result = $("#result td").text();

	$.observable(model.things[0]).setProperty("expanded", false);
	result += "|" + $("#result td").text();

	// ............................... Assert .................................
	equal(result, 'treebush|bush',
	'Changing dependant data on bindings with deferred, after view refresh correctly triggers refreshTag and refreshes content with updated data binding');
	// -----------------------------------------------------------------------

	// ................................ Reset ................................
	$("#result").empty();
	model.things = []; // reset Prop

	// =============================== Arrange ===============================

	// ................................ Act ..................................
	$.templates("testTmpl", '<tr>{^{if expanded}}<td>{{:thing}}</td>{{/if}}</tr>')
	$.templates('<table><tbody>{^{for things tmpl="testTmpl"/}}</tbody></table>')
		.link("#result", model);

	result = $("#result td").text();
	$.observable(model.things).insert(0, [{thing: "tree", expanded: false}, {thing: "bush", expanded: true}]);
	result += "|" + $("#result").text();
	$.observable(model.things[0]).setProperty("expanded", true);
	$.observable(model.things[1]).setProperty("expanded", false);
	result += "|" + $("#result").text();

	// ............................... Assert .................................
	equal(result, '|bush|tree',
	'Changing dependant data on bindings with deferred correctly triggers refreshTag and refreshes content with updated data binding');

	// ................................ Act ..................................
	$.view("#result tr").refresh();
	result = $("#result").text();
	$.view("#result tr").parent.views[1].refresh();
	result += "|" + $("#result").text();

	// ............................... Assert .................................
	equal(result, 'tree|tree',
	'view refresh with deferred correctly refreshes content');

	// ................................ Act ..................................
	$.observable(model.things[1]).setProperty("expanded", true);
	result = $("#result").text();
	$.observable(model.things[0]).setProperty("expanded", false);
	result += "|" + $("#result").text();

	// ............................... Assert .................................
	equal(result, 'treebush|bush',
	'Changing dependant data on bindings with deferred, after view refresh correctly triggers refreshTag and refreshes content with updated data binding');
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
	'Calling view("li").refresh() for a view in element-only content (elCnt true) updates correctly: "<ul>{{for}}<li>...</li>{{/for}}</ul>"');
	// -----------------------------------------------------------------------

	// ................................ Reset ................................
	$("#result").empty();
	person1._firstName = "Jo"; // reset Prop
	person1.lastName = "One"; // reset Prop
	settings.title = "Mr"; // reset Prop
	settings.width = 30; // reset Prop

	// =============================== Arrange ===============================

	$.templates('{^{for things}}<div>#index:<b data-link="#index"></b> #view.index:<b data-link="#view.index"></b> {{:thing}} Nested:{{for true}}{{for true}} #get(\'item\').index:<em data-link="#get(\'item\').index"></em> #parent.parent.index:<em data-link="#parent.parent.index"></em>|{{/for}}{{/for}}</div>{{/for}}')
		.link("#result", model);

	// ................................ Act ..................................
	$.observable(model.things).insert(0, {thing: "tree"});
	$.observable(model.things).insert(0, {thing: "bush"});

	// ............................... Assert .................................
	equal($("#result").text(), "#index:0 #view.index:0 bush Nested: #get('item').index:0 #parent.parent.index:0|#index:1 #view.index:1 tree Nested: #get('item').index:1 #parent.parent.index:1|",
	'Data-link to "#index" and "#get(\'item\').index" work correctly');
	// -----------------------------------------------------------------------

	// ................................ Reset ................................
	$("#result").empty();
	model.things = []; // reset Prop

	// =============================== Arrange ===============================
	$.templates('<div><ul>{^{for things}}xxx{{/for}}</ul></div>')
		.link("#result", model);

	// ................................ Act ..................................
	$("#result div").empty();

	// ............................... Assert .................................

	ok(viewsAndBindings().split(" ").length === 3 // We removed view inside div, but still have the view for the outer template.
		&& !$._data(model.things).events,
		'$(container).empty removes listeners for empty tags in element-only content (_dfr="#n_/n_")');
	// -----------------------------------------------------------------------
});

test("{^{if}}...{{else}}...{{/if}}", function() {

	// =============================== Arrange ===============================
	var data = {one: true, two: false, three: true},
		boundIfElseTmpl = $.templates(
		'{^{if one pane=0}}'
			+ '{^{if two pane=0}}'
				+ '{^{if three pane=0}}ONE TWO THREE {{else}}ONE TWO notThree {{/if}}'
			+ '{{else}}ONE notTwo {^{if three}}THREE {{/if}}{^{if !three}}notThree {{/if}}{{/if}}'
		+ '{{else three pane=1}}'
			+ '{^{if two pane=0}}notOne TWO THREE{{else}}notOne notTwo THREE {{/if}}'
		+ '{{else}}'
			+ '{^{if two pane=0}}notOne TWO notThree {{else}}notOne TWO notThree {{/if}}'
		+ '{{/if}}');

	// ................................ Act ..................................
	boundIfElseTmpl.link("#result", data);

	// ............................... Assert .................................
	after = $("#result").text();
	equal(after, boundIfElseTmpl.render(data),
	'Bound if and else with link render the same as unbound, when using the JsRender render() method');

	// ............................... Assert .................................
	equal(after, "ONE notTwo THREE ",
	'Bound if and else render correct blocks based on boolean expressions');

	// ................................ Act ..................................
	$.observable(data).setProperty({one: false, two: false, three: true});
	after = $("#result").text();

	// ............................... Assert .................................
	equal(after, "notOne notTwo THREE ",
	'Bound if and else render correct blocks based on boolean expressions');

	// ................................ Act ..................................
	$.observable(data).setProperty({one: false, two: true, three: false});
	after = $("#result").text();

	// ............................... Assert .................................
	equal(after, "notOne TWO notThree ",
	'Bound if and else render correct blocks based on boolean expressions');

	// ................................ Reset ................................
	$("#result").empty();

	// =============================== Arrange ===============================
	var data = {expanded: true},
		deepIfTmpl = $.templates(
			'<table><tbody>'
			+ '<tr>{^{if expanded}}'
				+ '<td>DeepContent</td>'
			+ '{{/if}}</tr>'
			+ '<tr><td>afterDeep</td></tr>'
		+ '</tbody></table>');

	// ................................ Act ..................................
	deepIfTmpl.link("#result", data);

	$.observable(data).setProperty("expanded", false);
	$.observable(data).setProperty("expanded", true);

	// ............................... Assert .................................
	after = $("#result").text();
	var deferredString = $("#result tr")[0]._dfr; // "/226_/322^"
	// With deep version, the tokens for the {^{if}} binding had to be deferred - we test the format:
	deferredString = /\/\d+\_\/\d+\^/.test(deferredString);

	equal(deferredString && after, 'DeepContentafterDeep',
	'With deep bound {^{if}} tag, there is deferred binding and binding behaves correctly after removing and inserting');

	// ................................ Act ..................................
	$.observable(data).setProperty("expanded", false);

	// ............................... Assert .................................
	after = $("#result").text();
	var deferredString = $("#result tr")[0]._dfr; // "#322^/322^"
	// With deep version, the tokens for the {^{if}} binding had to be deferred - we test the format:
	deferredString = /#(\d+\^)\/\1/.test(deferredString);

	equal(deferredString && after, 'afterDeep',
	'With deep bound {^{if}} tag, there is deferred binding and binding behaves correctly after further remove');

 // =============================== Arrange ===============================
	var shallowIfTmpl = $.templates(
			'<table><tbody>'
			+ '{^{if expanded}}'
				+ '<tr><td>ShallowContent</td></tr>'
			+ '{{/if}}'
			+ '<tr><td>afterShallow</td></tr>'
		+ '</tbody></table>');

 // ................................ Act ..................................
	shallowIfTmpl.link("#result", data);

	$.observable(data).setProperty("expanded", false);
	$.observable(data).setProperty("expanded", true);

	// ............................... Assert .................................
	after = $("#result").text();
	var deferredString = $("#result tr")[0]._dfr; // ""
	// With shallow version, no deferred binding
	equal(!deferredString && after, 'ShallowContentafterShallow',
	'With shallow bound {^{if}} tag, there is no deferred binding, and binding behaves correctly after removing and inserting');

	// ................................ Act ..................................
	$.observable(data).setProperty("expanded", false);

	// ............................... Assert .................................
	after = $("#result").text();
	var deferredString = $("#result tr")[0]._dfr; // ""
	// With shallow version, no deferred binding

	equal(!deferredString && after, 'afterShallow',
	'With shallow bound {^{if}} tag, there is no deferred binding and binding behaves correctly after further remove');

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

	// ................................ Act ..................................
	$("#full").val("newFirst newLast").change();

	after = $("#result").text() + $("#last").val() + $("#full").val();

	// ............................... Assert .................................
	equal(after,
	"prop:newLastnewLast computed:Sir newFirst newLastSir newFirst newLast Tag:Name: Sir newFirst. Width: 40Name: Sir newFirst. Width: 40newLastSir newFirst newLast",
	'Two-way binding to a computed observable correctly calls the setter');

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
	$("#result").unlink(true);

	// ............................... Assert .................................

	ok(!viewsAndBindings() && !$._data(person1).events && !$._data(settings).events,
	"$(container).unlink(true) removes the views and current listeners from that content");
	// -----------------------------------------------------------------------


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

	$.unobserve(person1, "*", settings, "*");

	// ............................... Assert .................................

	ok(before + "|" + after === result && viewContent === viewsAndBindings() && !$._data(person1).events && !$._data(settings).events,
	'$.unobserve(person1, "*", settings, "*") removes the current listeners from that content, but leaves the views');
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

test("PropertyChange: setProperty()", 4, function() {

	// =============================== Arrange ===============================
	reset();
	$.observable(undefined).setProperty("street", "abc");

	// ............................... Assert .................................
	equals(result, "",
	"$.observable(undefined).setProperty(...) does nothing");
	// -----------------------------------------------------------------------

	// =============================== Arrange ===============================
	reset();
	$.observe(person1.home.address, "street", myListener);

	// ................................ Act ..................................
	$.observable(person1.home.address).setProperty("street", "newValue");

	// ............................... Assert .................................
	equals(result, "calls: 1, ev.data: prop: street, eventArgs: oldValue: StreetOne value: newValue, eventArgs.path: street|",
	"setProperty triggers 'observable.observe() callbacks with ev and eventArgs correctly populated");
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
	$.unobserve(person1.home.address, "street", myListener);
});

module("API - ArrayChange");

test("JsObservable: insert()", function() {
	// =============================== Arrange ===============================
	var things = ["1", "2"];

	// ................................ Act ..................................
	$.observable(things).insert(0, "a");

	// ............................... Assert .................................
	equal(things.join(" "), "a 1 2",
	'insert(0, "a") inserts at 0');
	// -----------------------------------------------------------------------

	// =============================== Arrange ===============================
	things = ["1", "2"];

	// ................................ Act ..................................
	$.observable(things).insert(1, "a");

	// ............................... Assert .................................
	equal(things.join(" "), "1 a 2",
	'insert(1, "a") inserts at 1');
	// -----------------------------------------------------------------------

	// =============================== Arrange ===============================
	things = ["1", "2"];

	// ................................ Act ..................................
	$.observable(things).insert(2, "a");

	// ............................... Assert .................................
	equal(things.join(" "), "1 2 a",
	'insert(2, "a") inserts at 2');
	// -----------------------------------------------------------------------

	// =============================== Arrange ===============================
	things = ["1", "2"];

	// ................................ Act ..................................
	$.observable(things).insert("a");

	// ............................... Assert .................................
	equal(things.join(" "), "1 2 a" ,
	'insert("a") appends');
	// -----------------------------------------------------------------------

	// =============================== Arrange ===============================
	things = ["1", "2"];

	// ................................ Act ..................................
	$.observable(things).insert(1, ["a", "b"]);

	// ............................... Assert .................................
	equal(things.join(" "), "1 a b 2",
	'insert(1, ["a", "b"]) inserts multiple elements at 1');
	// -----------------------------------------------------------------------

	// =============================== Arrange ===============================
	things = ["1", "2"];

	// ................................ Act ..................................
	$.observable(things).insert(["a", "b", "c"]);

	// ............................... Assert .................................
	equal(things.join(" "), "1 2 a b c",
	'insert(["a", "b", "c"]) appends multiple elements');
	// -----------------------------------------------------------------------

	// =============================== Arrange ===============================
	things = ["1", "2"];

	// ................................ Act ..................................
	$.observable(things).insert("1", "b");

	// ............................... Assert .................................
	equal(things.join(" "), "1 b 2",
	'insert("1", "b") treats first param as index and inserts at 1');
	// -----------------------------------------------------------------------

	// =============================== Arrange ===============================
	things = ["1", "2"];

	// ................................ Act ..................................
	$.observable(things).insert("0", "b");

	// ............................... Assert .................................
	equal(things.join(" "), "b 1 2",
	'insert("0", "b") treats first param as index and inserts at 0');
	// -----------------------------------------------------------------------

	// =============================== Arrange ===============================
	things = ["1", "2"];

	// ................................ Act ..................................
	$.observable(things).insert("a", "b");

	// ............................... Assert .................................
	equal(things.join(" "), "1 2",
	'insert("a", "b") does nothing - since parseInt("a") is NaN');
	// -----------------------------------------------------------------------

	// =============================== Arrange ===============================
	things = ["1", "2"];

	// ................................ Act ..................................
	$.observable(things).insert("1a", "b");

	// ............................... Assert .................................
	equal(things.join(" "), "1 b 2",
	'insert("1a", "b") inserts "b" at 1 - since parseInt("1a") is 1');
	// -----------------------------------------------------------------------

	// =============================== Arrange ===============================
	things = [];

	// ................................ Act ..................................
	$.observable(things).insert("a");

	// ............................... Assert .................................
	equal(things.join(" "), "a",
	'insert("a") still appends "a", correctly if array is empty at first');
	// -----------------------------------------------------------------------

	// =============================== Arrange ===============================
	things = ["1", "2"];

	// ................................ Act ..................................
	$.observable(things).insert(1);

	// ............................... Assert .................................
	equal(things.join(" ") + (things[2] === 1), "1 2 1true",
	'insert(1) appends 1');
	// -----------------------------------------------------------------------

	// =============================== Arrange ===============================
	things = ["1", "2"];

	// ................................ Act ..................................
	$.observable(things).insert(0);

	// ............................... Assert .................................
	equal(things.join(" ") + (things[2] === 0), "1 2 0true",
	'insert(0) appends 0');
	// -----------------------------------------------------------------------

	// =============================== Arrange ===============================
	things = ["1", "2"];

	// ................................ Act ..................................
	$.observable(things).insert(undefined);

	// ............................... Assert .................................
	equal(things.join(" "), "1 2 ",
	'insert(undefined) appends undefined');
	// -----------------------------------------------------------------------

	// =============================== Arrange ===============================
	things = ["1", "2"];

	// ................................ Act ..................................
	$.observable(things).insert(1, undefined);

	// ............................... Assert .................................
	equal(things.join(" "), "1  2",
	'insert(1, undefined) inserts undefined');
	// -----------------------------------------------------------------------

	// =============================== Arrange ===============================
	things = ["1", "2"];

	// ................................ Act ..................................
	$.observable(things).insert(0, undefined);

	// ............................... Assert .................................
	equal(things.join(" "), " 1 2",
	'insert(0, undefined) inserts undefined');
	// -----------------------------------------------------------------------

	// =============================== Arrange ===============================
	things = ["1", "2"];

	// ................................ Act ..................................
	$.observable(things).insert([undefined, null, 0, 1, "2"]);

	// ............................... Assert .................................
	equal(things.join(" "), "1 2   0 1 2",
	'insert(1, [undefined, null, 0, 1, "2"]) inserts correctly');
	// -----------------------------------------------------------------------

	// =============================== Arrange ===============================
	things = ["1", "2"];

	// ................................ Act ..................................
	$.observable(things).insert("a", "b");

	// ............................... Assert .................................
	equal(things.join(" "), "1 2",
	'insert("a", "b") does nothing - since parseInt("a") is NaN');
	// -----------------------------------------------------------------------

	// =============================== Arrange ===============================
	things = ["1", "2"];

	// ................................ Act ..................................
	$.observable(things).insert(-1, "a");

	// ............................... Assert .................................
	equal(things.join(" "), "1 2",
	'insert(-1, "a") does nothing');
	// -----------------------------------------------------------------------

	// =============================== Arrange ===============================
	things = ["1", "2"];

	// ................................ Act ..................................
	$.observable(things).insert(10, "a");

	// ............................... Assert .................................
	equal(things.join(" "), "1 2",
	'insert(10, "a") (out of range) does nothing');
	// -----------------------------------------------------------------------

});

test("JsObservable: remove()", function() {
	// =============================== Arrange ===============================
	var things = ["1", "2"];

	// ................................ Act ..................................
	$.observable(things).remove(0);

	// ............................... Assert .................................
	equal(things.join(" "), "2",
	'remove(0) removes 1 item at 0');
	// -----------------------------------------------------------------------

	// =============================== Arrange ===============================
	things = ["1", "2"];

	// ................................ Act ..................................
	$.observable(things).remove(1);

	// ............................... Assert .................................
	equal(things.join(" "), "1",
	'remove(1) removes 1 item at 1');
	// -----------------------------------------------------------------------

	// =============================== Arrange ===============================
	things = ["1", "2"];

	// ................................ Act ..................................
	$.observable(things).remove(2);

	// ............................... Assert .................................
	equal(things.join(" "), "1 2",
	'remove(2) does nothing (out of range');
	// -----------------------------------------------------------------------

	// =============================== Arrange ===============================
	things = ["1", "2"];

	// ................................ Act ..................................
	$.observable(things).remove();

	// ............................... Assert .................................
	equal(things.join(" "), "1" ,
	'remove() removes from end');
	// -----------------------------------------------------------------------

	// =============================== Arrange ===============================
	things = ["1", "2", "3", "4"];

	// ................................ Act ..................................
	$.observable(things).remove(1, 2);

	// ............................... Assert .................................
	equal(things.join(" "), "1 4",
	'remove(1, 2) removes multiple items at 1');
	// -----------------------------------------------------------------------

	// =============================== Arrange ===============================
	things = ["1", "2", "3", "4"];

	// ................................ Act ..................................
	$.observable(things).remove(1, 10);

	// ............................... Assert .................................
	equal(things.join(" "), "1",
	'remove(1, 10) removes all relevant items');
	// -----------------------------------------------------------------------

	// =============================== Arrange ===============================
	things = ["1", "2", "3", "4"];

	// ................................ Act ..................................
	$.observable(things).remove("1c", "2.001 euros");

	// ............................... Assert .................................
	equal(things.join(" "), "1 4",
	'remove("1c", "2.001 euros") does parseInt and removes 2 items at 1');
	// -----------------------------------------------------------------------

	// =============================== Arrange ===============================
	things = ["1", "2"];

	// ................................ Act ..................................
	$.observable(things).remove("a");

	// ............................... Assert .................................
	equal(things.join(" "), "1 2",
	'remove("a") does nothing - since parseInt("a") is NaN');
	// -----------------------------------------------------------------------

	// =============================== Arrange ===============================
	things = ["1", "2"];

	// ................................ Act ..................................
	$.observable(things).remove("a", "b");

	// ............................... Assert .................................
	equal(things.join(" "), "1 2",
	'remove(1, "b") does nothing - since parseInt("b") is NaN');
	// -----------------------------------------------------------------------

	// =============================== Arrange ===============================
	things = [];

	// ................................ Act ..................................
	$.observable(things).remove();

	// ............................... Assert .................................
	equal(things.join(" "), "",
	'remove() does nothing if array is empty at first');
	// -----------------------------------------------------------------------

	// =============================== Arrange ===============================
	things = ["1", "2"];

	// ................................ Act ..................................
	$.observable(things).remove(-1);

	// ............................... Assert .................................
	equal(things.join(" "), "1 2",
	'remove(-1) does nothing');
	// -----------------------------------------------------------------------

	// =============================== Arrange ===============================
	things = ["1", "2"];

	// ................................ Act ..................................
	$.observable(things).remove(10);

	// ............................... Assert .................................
	equal(things.join(" "), "1 2",
	'remove(10, "a") (out of range) does nothing');
	// -----------------------------------------------------------------------

	// =============================== Arrange ===============================
	things = ["1", "2"];

	// ................................ Act ..................................
	$.observable(things).remove(10);

	// ............................... Assert .................................
	equal(things.join(" "), "1 2",
	'remove(10) (out of range) does nothing');
	// -----------------------------------------------------------------------

});

test("JsObservable: move()", function() {
	// =============================== Arrange ===============================
	var things = ["1", "2", "3", "4"];

	// ................................ Act ..................................
	$.observable(things).move(1, 2);

	// ............................... Assert .................................
	equal(things.join(" "), "1 3 2 4",
	'move(1, 2) moves 1 item from 1 to 2 - so swaps them');
	// -----------------------------------------------------------------------

	// =============================== Arrange ===============================
	var things = ["1", "2", "3", "4"];

	// ................................ Act ..................................
	$.observable(things).move(2, 1);

	// ............................... Assert .................................
	equal(things.join(" "), "1 3 2 4",
	'move(1, 2) moves 1 item from 2 to 1 - so swaps them');
	// -----------------------------------------------------------------------

	// =============================== Arrange ===============================
	var things = ["1", "2", "3", "4"];

	// ................................ Act ..................................
	$.observable(things).move(1, 3);

	// ............................... Assert .................................
	equal(things.join(" "), "1 3 4 2",
	'move(1, 2) moves 1 item at from 1 to 3');
	// -----------------------------------------------------------------------

	// =============================== Arrange ===============================
	var things = ["1", "2", "3", "4"];

	// ................................ Act ..................................
	$.observable(things).move(1, 2, 2);

	// ............................... Assert .................................
	equal(things.join(" "), "1 4 2 3",
	'move(1, 2, 2) moves 2 items at from 1 to 2');
	// -----------------------------------------------------------------------

	// =============================== Arrange ===============================
	var things = ["1", "2", "3", "4"];

	// ................................ Act ..................................
	$.observable(things).move(1, 3, 2);

	// ............................... Assert .................................
	equal(things.join(" "), "1 4 2 3",
	'move(1, 3, 2) moves 2 items from 1 to 2 - same as if moving to 2, since hits the end of the array');
	// -----------------------------------------------------------------------

	// =============================== Arrange ===============================
	var things = ["1", "2", "3", "4"];

	// ................................ Act ..................................
	$.observable(things).move(1, 2, 3);

	// ............................... Assert .................................
	equal(things.join(" "), "1 2 3 4",
	'move(1, 2, 3) moves 3 items from 1 to 2 - which does nothing since hits the end of the array');
	// -----------------------------------------------------------------------

	// =============================== Arrange ===============================
	var things = ["1", "2", "3", "4"];

	// ................................ Act ..................................
	$.observable(things).move(1, 6, 2);

	// ............................... Assert .................................
	equal(things.join(" "), "1 4 2 3",
	'move(1, 6, 2) moves 2 items from 1 to 6 - same as if moving to 2, since hits the end of the array');
	// -----------------------------------------------------------------------

	// =============================== Arrange ===============================
	var things = ["1", "2", "3", "4"];

	// ................................ Act ..................................
	$.observable(things).move(1, 1);

	// ............................... Assert .................................
	equal(things.join(" "), "1 2 3 4",
	'move(1, 1) does nothing');
	// -----------------------------------------------------------------------

	// =============================== Arrange ===============================
	var things = ["1", "2", "3", "4"];

	// ................................ Act ..................................
	$.observable(things).move(1, 1, 3);

	// ............................... Assert .................................
	equal(things.join(" "), "1 2 3 4",
	'move(1, 1, 3) does nothing');
	// -----------------------------------------------------------------------

	// =============================== Arrange ===============================
	var things = ["1", "2", "3", "4"];

	// ................................ Act ..................................
	$.observable(things).move(1);

	// ............................... Assert .................................
	equal(things.join(" "), "1 2 3 4",
	'move(1) does nothing');
	// -----------------------------------------------------------------------

	// =============================== Arrange ===============================
	var things = ["1", "2", "3", "4"];

	// ................................ Act ..................................
	$.observable(things).move();

	// ............................... Assert .................................
	equal(things.join(" "), "1 2 3 4",
	'move() does nothing');
	// -----------------------------------------------------------------------

	// =============================== Arrange ===============================
	var things = ["1", "2", "3", "4"];

	// ................................ Act ..................................
	$.observable(things).move(10, 0);

	// ............................... Assert .................................
	equal(things.join(" "), "1 2 3 4",
	'move(10, 0) does nothing (out of range)');
	// -----------------------------------------------------------------------

	// =============================== Arrange ===============================
	var things = ["1", "2", "3", "4"];

	// ................................ Act ..................................
	$.observable(things).move(0, 10);

	// ............................... Assert .................................
	equal(things.join(" "), "2 3 4 1",
	'move(0, 10) moves item 0 to the end (out of range)');
	// -----------------------------------------------------------------------

	// =============================== Arrange ===============================
	var things = ["1", "2", "3", "4"];

	// ................................ Act ..................................
	$.observable(things).move(3, 0, 6);

	// ............................... Assert .................................
	equal(things.join(" "), "4 1 2 3",
	'move(3, 0, 6) moves any items that are not out of range');
	// -----------------------------------------------------------------------

	// =============================== Arrange ===============================
	var things = ["1", "2", "3", "4"];

	// ................................ Act ..................................
	$.observable(things).move(-1, 2);

	// ............................... Assert .................................
	equal(things.join(" "), "1 2 3 4",
	'move(-1, 2) does nothing');
	// -----------------------------------------------------------------------

	// =============================== Arrange ===============================
	var things = ["1", "2", "3", "4"];

	// ................................ Act ..................................
	$.observable(things).move(-1, 2);

	// ............................... Assert .................................
	equal(things.join(" "), "1 2 3 4",
	'move(-1, 2) does nothing');
	// -----------------------------------------------------------------------

	// =============================== Arrange ===============================
	var things = ["1", "2", "3", "4"];

	// ................................ Act ..................................
	$.observable(things).move(1, -1);

	// ............................... Assert .................................
	equal(things.join(" "), "1 2 3 4",
	'move(1, -1) does nothing');
	// -----------------------------------------------------------------------

	// =============================== Arrange ===============================
	var things = ["1", "2", "3", "4"];

	// ................................ Act ..................................
	$.observable(things).move(1, 2, -1);

	// ............................... Assert .................................
	equal(things.join(" "), "1 2 3 4",
	'move(1, 2, -1) does nothing');
	// -----------------------------------------------------------------------

	// =============================== Arrange ===============================
	var things = ["1", "2", "3", "4"];

	// ................................ Act ..................................
	$.observable(things).move("a", 2);

	// ............................... Assert .................................
	equal(things.join(" "), "1 2 3 4",
	'move("a", 2) does nothing');
	// -----------------------------------------------------------------------

	// =============================== Arrange ===============================
	things = ["1", "2", "3", "4"];

	// ................................ Act ..................................
	$.observable(things).move("1c", "2.001 euros", "2px");

	// ............................... Assert .................................
	equal(things.join(" "), "1 4 2 3",
	'move("1c", "2.001 euros, "2px") does parseInt and moves 2 items from 1 to 2');
	// -----------------------------------------------------------------------

	// =============================== Arrange ===============================
	things = ["1", "2", "3", "4"];

	// ................................ Act ..................................
	$.observable(things).move("c", "2.001 euros", "2px");

	// ............................... Assert .................................
	equal(things.join(" "), "1 2 3 4",
	'move("c", "2.001 euros, "2px") does nothing since parseInt("c") is NaN');
	// -----------------------------------------------------------------------

	// =============================== Arrange ===============================
	things = ["1", "2", "3", "4"];

	// ................................ Act ..................................
	$.observable(things).move("1c", "euros", "2px");

	// ............................... Assert .................................
	equal(things.join(" "), "1 2 3 4",
	'move("1c", "euros, "2px") does nothing since parseInt("euros") is NaN');
	// -----------------------------------------------------------------------

	// =============================== Arrange ===============================
	things = ["1", "2", "3", "4"];

	// ................................ Act ..................................
	$.observable(things).move("1c", "2.001 euros", "px");

	// ............................... Assert .................................
	equal(things.join(" "), "1 2 3 4",
	'move("1c", "2.001 euros, "px") does nothing since parseInt("px") is NaN');
	// -----------------------------------------------------------------------

	// =============================== Arrange ===============================
	things = ["1", "2", "3", "4"];

	// ................................ Act ..................................
	$.observable(things).move("1c", "2.001 euros", undefined);

	// ............................... Assert .................................
	equal(things.join(" "), "1 3 2 4",
	'move("1c", "2.001 euros, undefined) moves 1');
	// -----------------------------------------------------------------------

	// =============================== Arrange ===============================
	things = ["1", "2", "3", "4"];

	// ................................ Act ..................................
	$.observable(things).move("1c", "2.001 euros", null);

	// ............................... Assert .................................
	equal(things.join(" "), "1 3 2 4",
	'move("1c", "2.001 euros, null) moves 1');
	// -----------------------------------------------------------------------

	// =============================== Arrange ===============================
	things = ["1", "2", "3", "4"];

	// ................................ Act ..................................
	$.observable(things).move("1c", undefined);

	// ............................... Assert .................................
	equal(things.join(" "), "1 2 3 4",
	'move("1c", undefined) does does nothing since parseInt(undefined) is NaN');
	// -----------------------------------------------------------------------

	// =============================== Arrange ===============================
	things = ["1", "2", "3", "4"];

	// ................................ Act ..................................
	$.observable(things).move("1c", null);

	// ............................... Assert .................................
	equal(things.join(" "), "1 2 3 4",
	'move("1c", null) does does nothing since parseInt(null) is NaN');
	// -----------------------------------------------------------------------

	// =============================== Arrange ===============================
	things = [];

	// ................................ Act ..................................
	$.observable(things).move(1, 2);

	// ............................... Assert .................................
	equal(things.join(" "), "",
	'move(1, 2) does nothing if array is empty');
	// -----------------------------------------------------------------------

});

test("JsViews ArrayChange: insert()", function() {
	// =============================== Arrange ===============================
	$.views.tags({
		liTag: function() {
			return "<li>Tag</li>"
		}
	});

	model.things = [{thing: "Orig"}]; // reset Prop

	$.templates('<ul>{^{liTag/}}{^{for things}}<li>{{:thing}}</li>{^{liTag/}}{{/for}}<li>|after</li></ul>')
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
	$("#result").empty();
	model.things = []; // reset Prop

	// =============================== Arrange ===============================
	$.views.tags({
		spanTag: function() {
			return "<span>Tag</span>"
		}
	});

	model.things = [{thing: "Orig"}]; // reset Prop

	$.templates('<div>{^{spanTag/}}{^{for things}}<span>{{:thing}}</span>{^{spanTag/}}{{/for}}<span>|after</span></div>')
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
	$("#result").empty();
	model.things = [{thing: "Orig"}]; // reset Prop

	// =============================== Arrange ===============================
	$.templates('<table><tbody>{^{for things}}<tr><td>{{:thing}}</td></tr>{{/for}}</tbody></table>')
		.link("#result", model);
	// ................................ Act ..................................
	$.observable(model.things).insert(0, {thing: "First"});
	$.observable(model.things).remove(0);

	// ............................... Assert .................................
	equal($("#result").text(), "Orig",
	'Within element only content, insertion finds correctly the previous view, prevNode, nextNode, etc and establishes correct element order and binding');
	// -----------------------------------------------------------------------

	// ................................ Reset ................................
	$("#result").empty();
	model.things = []; // reset Prop
});

test("JsViews ArrayChange: remove()", function() {
	// If one remove triggers another remove ensure one oldLength var is not affected by other one.
	// TODO
});

test("JsViews ArrayChange: move()", function() {
	// TODO
});

test("JsViews ArrayChange: refresh()", function() {
	// TODO
});

module("API - $.observe()");

test("observe/unobserve alternative signatures", function() {
	reset();
	// =============================== Arrange ===============================
	// ................................ Act ..................................
	$.observe(person1.home.address, "street", myListener);
	$.observable(person1.home.address).setProperty("street", "newValue");

	// ............................... Assert .................................
	equals(result, "calls: 1, ev.data: prop: street, eventArgs: oldValue: StreetOne value: newValue, eventArgs.path: street|",
	"$.observe(object, path, cb)");
	// -----------------------------------------------------------------------

	// ................................ Reset ................................
	person1.home.address.street = "StreetOne"; // reset Prop
	reset();

	// =============================== Arrange ===============================

	//Act
	$.unobserve(person1.home.address, "street", myListener);
	$.observable(person1.home.address).setProperty("street", "newValue");

	// ............................... Assert .................................
	equals(result, "",
	"$.unobserve(object, path, cb)");
	// -----------------------------------------------------------------------

	// ................................ Reset ................................
	person1.home.address.street = "StreetOne"; // reset Prop
	reset();

	// =============================== Arrange ===============================

	//Act
	$.unobserve(person1.home.address, myListener);
	$.observable(person1.home.address).setProperty("street", "newValue");

	// ............................... Assert .................................
	equals(result, "",
	"$.unobserve(object, path, cb)");
	// -----------------------------------------------------------------------

	// ................................ Reset ................................
	person1.home.address.street = "StreetOne"; // reset Prop
	reset();

	// =============================== Arrange ===============================

	// ................................ Act ..................................
	$.observe(person1.home.address, "street", "ZIP", myListener);
	$.observable(person1.home.address).setProperty({street: "newValue", ZIP: "newZip"});

	// ............................... Assert .................................
	equals(result, "calls: 1, ev.data: prop: street, eventArgs: oldValue: StreetOne value: newValue, eventArgs.path: street|"
				+ "calls: 2, ev.data: prop: ZIP, eventArgs: oldValue: 111 value: newZip, eventArgs.path: ZIP|",
	"$.observe(object, path1, path2, cb)");
	// -----------------------------------------------------------------------

	// ................................ Reset ................................
	person1.home.address.street = "StreetOne"; // reset Prop
	person1.home.address.ZIP = "111"; // reset Prop
	reset();

	// =============================== Arrange ===============================

	// ................................ Act ..................................
	$.unobserve(person1.home.address, "street", "ZIP", myListener);
	$.observable(person1.home.address).setProperty({street: "newValue", ZIP: "newZip"});

	// ............................... Assert .................................
	equals(result, "",
	"$.unobserve(object, path1, path2, cb) removes previous handlers");
	// -----------------------------------------------------------------------

	// ................................ Reset ................................
	person1.home.address.street = "StreetOne"; // reset Prop
	person1.home.address.ZIP = "111"; // reset Prop
	reset();

});

test("paths", function() {

	// =============================== Arrange ===============================

	// ................................ Act ..................................
	$.observe(person1, "home^address.street", person1.home.address, "ZIP", myListener);
	$.observable(person1.home.address).setProperty({street: "newValue", ZIP: "newZip"});

	// ............................... Assert .................................
	ok(result === "calls: 1, ev.data: prop: street, eventArgs: oldValue: StreetOne value: newValue, eventArgs.path: street|"
		+ "calls: 2, ev.data: prop: ZIP, eventArgs: oldValue: 111 value: newZip, eventArgs.path: ZIP|",
	"$.observe(object, some.deep.path, object2, path, cb) is listening to leaf");
	// -----------------------------------------------------------------------

	// ................................ Reset ................................
	reset();

	// ................................ Act ..................................
	$.observable(person1).setProperty({home: home2}); // Swap object higher in path

	// ............................... Assert .................................
	equals("" + (lastEventArgs.oldValue === home1) + (lastEventArgs.value === home2) + result, "truetruecalls: 1, ev.data: prop: home, path: address.street, eventArgs: oldValue: [object Object] value: [object Object], eventArgs.path: home|",
	"$.observe(object, some.deep.path, object2, path, cb) is listening to root");
	// -----------------------------------------------------------------------

	// ................................ Reset ................................
	reset();

	// ................................ Act ..................................
	$.observable(address1).setProperty({street: "newValue2", ZIP: "newZip2"});

	// ............................... Assert .................................
	equals(result, "calls: 1, ev.data: prop: ZIP, eventArgs: oldValue: newZip value: newZip2, eventArgs.path: ZIP|",
	"$.observe(object, 'home.address.street', object2, 'ZIP', cb) after swapping higher up on deep path, is no longer listening to original leaf on that path - 'i.e. 'street', but is listening to other paths as before - 'i.e. 'ZIP'");
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
	"$.observe(object, 'home.address.street', object2, 'ZIP', cb) after swapping higher up on deep path, is now listening to leaf on new descendant objects - 'i.e. 'street' on 'address2'");
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
	"$.observe(object, 'home.address.street', object2, 'ZIP', cb) after setting object to null, higher up on deep path, then setting to new object, is no longer listening to that path on original descendant objects but is now listening to the path on new descendant objects");
	// -----------------------------------------------------------------------

	// ................................ Reset ................................
	reset();

	// ................................ Act ..................................
	$.unobserve(person1, "home^address.street", person1.home.address, "ZIP", myListener);

	// ............................... Assert .................................
	ok(!$._data(person1).events && !$._data(person1.home.address).events,
	"$.unobserve(object, 'home.address.street', object2, 'ZIP', cb) removes the current listeners from that path");
	// -----------------------------------------------------------------------

	// ................................ Reset ................................
	reset();

	$.observe(person1, "home^address.street", person1.home.address, "ZIP", "ZIP", "foo", myListener);
	$.observe(person1.home.address, "street", function(){});

	// ............................... Assert .................................
	equal("" + $._data(person1.home.address).events.propertyChange.length + " "
	+ $._data(person1.home).events.propertyChange.length + " "
	+ $._data(person1).events.propertyChange.length, "4 1 1",
	"Avoid duplicate handlers");

	// ................................ Act ..................................
	$.unobserve(person1, "home^address.ZIP");

	// ............................... Assert .................................
	equal("" + $._data(person1.home.address).events.propertyChange.length + " "
	+ !$._data(person1.home).events + " "
	+ !$._data(person1).events, "3 true true",
	"unobserve(object, paths) - with no callback specified: Remove handlers only for selected properties");
	// -----------------------------------------------------------------------

	// ................................ Act ..................................
	$.unobserve(person1.home.address, "*", myListener);

	// ............................... Assert .................................
	equal("" + $._data(person1.home.address).events.propertyChange.length, "1",
	'unobserve(object, "*", myListener) removes all handlers on this object for any props, for this callback');
	// -----------------------------------------------------------------------

	// ................................ Act ..................................
	$.unobserve(person1.home.address, "*");

	// ............................... Assert .................................
	ok(!$._data(person1.home.address).events,
	'unobserve(object, "*") removes all handlers on this object for any props, for any callback');
	// -----------------------------------------------------------------------

	// ................................ Reset ................................
	reset();

	// =============================== Arrange ===============================

	// ................................ Act ..................................
	$.observe(person1.home.address, "*", "ZIP", myListener);

	// ............................... Assert .................................
	equal("" + $._data(person1.home.address).events.propertyChange.length, "1",
	'Add a listener for "*" - avoids duplicates');
	// -----------------------------------------------------------------------

	// ................................ Act ..................................
	$.observable(person1.home.address).setProperty({street: "newValue4", ZIP: "newZip4"});

	// ............................... Assert .................................

	equal(result, "calls: 1, ev.data: prop: *, eventArgs: oldValue: newValue3 value: newValue4, eventArgs.path: street|"
							+ "calls: 2, ev.data: prop: *, eventArgs: oldValue: newZip3 value: newZip4, eventArgs.path: ZIP|",
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
	$.observe(person1, "work^address.street", myListener);
	$.observable(person1).setProperty({work: home2});
	$.observable(address2).setProperty({street: "newAddress2"});

	// ............................... Assert .................................
	equals(result, "calls: 1, ev.data: prop: work, path: address.street, eventArgs: oldValue: undefined value: [object Object], eventArgs.path: work|calls: 2, ev.data: prop: street, eventArgs: oldValue: StreetTwo value: newAddress2, eventArgs.path: street|",
	'observing a deep path into missing properties, followed by $.observable(...).setProperty calls which supply the missing object property then modify subobjects deeper down the path lead to the correct callback events');
	// -----------------------------------------------------------------------

	// ................................ Reset ................................
	$.unobserve(person1, "work^address.street");
	address2.street = "StreetTwo"; // reset Prop
	delete person1.work; // reset Prop
	reset();

	// =============================== Arrange ===============================

	// ................................ Act ..................................
	$.unobserve(person1.home.address, "*");

	// ............................... Assert .................................
	ok(!$._data(person1.home.address).events,
	'unobserve(object, "*") removes all handlers on this object for any props, both "*" and specific props, for any callback');
	// -----------------------------------------------------------------------

	// ................................ Act ..................................
	$.observe(person1, "fullName", myListener);

	// ............................... Assert .................................
	equal("" + $._data(person1).events.propertyChange.length, "3",
	'Add a listener for computed property');
	// -----------------------------------------------------------------------

	// ................................ Act ..................................
	$.observable(person1).setProperty({firstName: "newFirst", lastName: "newLast"});
	$.observable(settings).setProperty({title: "Sir"});

	// ............................... Assert .................................
	equal(result, "calls: 1, ev.data: prop: firstName, eventArgs: oldValue: Mr Jo value: Mr newFirst, eventArgs.path: firstName|"
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
	$.unobserve(person1, "fullName", myListener);

	// ............................... Assert .................................
	equal(listeners + ". After: "
		+ !$._data(model.person1).events, "Before: 3. After: true",
	'unobserve(object, "computed", cb) removes handlers');
	// -----------------------------------------------------------------------

	// ................................ Act ..................................
	$.observe(model, "person1^fullName", myListener);

	// ............................... Assert .................................
	equal("" + $._data(person1).events.propertyChange.length, "3",
	'Add a listener for computed property on a deep path');
	// -----------------------------------------------------------------------

	// ................................ Act ..................................
	$.observable(person1).setProperty({firstName: "newFirst", lastName: "newLast"});

	// ............................... Assert .................................

	equal(result, "calls: 1, ev.data: prop: firstName, eventArgs: oldValue: Sir Jo value: Sir newFirst, eventArgs.path: firstName|"
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
	$.unobserve(model, "person1^fullName", myListener);

	// ............................... Assert .................................
	equal(listeners + ". After: "
		+ !$._data(model).events + " "
		+ !$._data(model.person1).events, "Before: 1 3. After: true true",
	'unobserve(object, "computed", cb) removes handlers');
	// -----------------------------------------------------------------------

	// ................................ Act ..................................
	$.observe(model, "person1^fullName", "person1^firstName", "person1^lastName", "person1^firstName", myListener);

	// ............................... Assert .................................
	equal("" + $._data(person1).events.propertyChange.length, "3",
	'Add a listener for computed property on deep path plus redundant computed dependency plus redundant computed prop.');
	// -----------------------------------------------------------------------

	// ................................ Act ..................................
	$.observable(person1).setProperty({firstName: "newFirst", lastName: "newLast"});

	// ............................... Assert .................................
	equal(result, "calls: 1, ev.data: prop: firstName, eventArgs: oldValue: Sir Jo value: Sir newFirst, eventArgs.path: firstName|"
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
	$.unobserve(model, "person1^fullName", myListener);

	// ............................... Assert .................................
	equal(listeners + ". After: "
		+ !$._data(settings).events + " "
		+ !$._data(model).events + " "
		+ !$._data(model.person1).events, "Before: 1 1 3. After: true true true",
	'unobserve(object, "computed", cb) removes handlers');
	// -----------------------------------------------------------------------

	// =============================== Arrange ===============================
	$.observe(model, "person1", "person2", "person1.*", "person1.home.address^street", "person1^home.address.ZIP", "person1.home^address.*", myListener);

	listeners = $._data(model).events.propertyChange.length + " "
	+ $._data(model.person1).events.propertyChange.length + " "
	+ $._data(model.person1.home).events.propertyChange.length + " "
	+ $._data(model.person1.home.address).events.propertyChange.length;

	equal(listeners, "2 1 1 1", 'No duplicate handlers for $.observe(model, "person1", "person2", "person1.*", "person1.home.address^street", "person1^home.address.ZIP", "person1.home^address.*", cb)');

	// ................................ Act ..................................
	$.unobserve(model, "person1", "person2", "person1.*", "person1.home.address^street", "person1^home.address.ZIP", "person1.home^address.*", myListener);

	// ............................... Assert .................................
	equal(!$._data(model).events + " "
		+ !$._data(model.person1).events + " "
		+ !$._data(model.person1.home).events + " "
		+ !$._data(model.person1.home.address).events, "true true true true",
	'$.unobserve(model, "person1", "person2", "person1.*", "person1.home.address^street", "person1^home.address.ZIP", "person1.home^address.*", cb) removes all handlers');
	// -----------------------------------------------------------------------

	// =============================== Arrange ===============================

	// ................................ Act ..................................
	$.observe(model, "person1^fullName", "person1.home.address.*", myListener);

	$.unobserve(model);

	handlersCount = !$._data(model).events + " " + $._data(model.person1).events.propertyChange.length + " " + $._data(model.person1.home.address).events.propertyChange.length;

	$.unobserve(person1);

	// ............................... Assert .................................
	equal(handlersCount + "|" + !$._data(model).events + " " + !$._data(model.person1).events + " " + $._data(model.person1.home.address).events.propertyChange.length,
		"true 3 1|true true 1",
	'unobserve(object) removes all observe handlers from object, but does not remove handlers on paths on descendant objects');
	// -----------------------------------------------------------------------

	// =============================== Arrange ===============================

	// ................................ Act ..................................
	$.observe(model, "person1^fullName", "person1.address.*", myListener);

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
	equal("" + handlersCount + " " + !$._data(model).events + " " + !$._data(model.person1).events + " " + !$._data(model.person1.home.address).events, "1 4 1|2 7 1|1 7 1|1 3 1 true true true",
	'unobserve(object) removes all observe handlers from object, but does not remove handlers on paths on descendant objects');
	// -----------------------------------------------------------------------

	// =============================== Arrange ===============================

	// ................................ Act ..................................
	$.observe(person1, "fullName", myListener);
	$.observe(settings, "*", myListener);
	handlersCount = $._data(person1).events.propertyChange.length + $._data(settings).events.propertyChange.length;

	$.unobserve(person1, "*", settings, "*");

	// ............................... Assert .................................
	equal("" + handlersCount + " " + !$._data(person1).events + " " + !$._data(settings).events, "4 true true",
	'unobserve(object1, "*", object2, "*") removes all observe handlers from objects');
	// -----------------------------------------------------------------------

	// =============================== Arrange ===============================

	// ................................ Act ..................................
	$.observe(settings, "onFoo", myListener);
	$.observable(settings).setProperty("onFoo", function onfoonew() { return; });
	$.unobserve(settings);

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

test("observe context helper", function() {
	// =============================== Arrange ===============================
	var str = "aa",
		main = {
			title: "foo"
		},
		obj = {
			name: "One"
		},
		arr = [1,2,3];

	function observeCtxHelper(val, currentRoot) {
		if (val) {
			if (val.charAt(0) === "%") {
				return [obj, val.slice(1), currentRoot||{}];
			}
		}
	}

	// ................................ Act ..................................
	$.observe(main, "title", "%name", myListener, observeCtxHelper);
	$.observable(main).setProperty({title: "newTitle"});
	$.observable(obj).setProperty({name: "newName"});

	// ............................... Assert .................................
	equals(result, "calls: 1, ev.data: prop: title, eventArgs: oldValue: foo value: newTitle, eventArgs.path: title|"
							 + "calls: 2, ev.data: prop: name, eventArgs: oldValue: One value: newName, eventArgs.path: name|",
	"$.observe(object, path, cb, observeCtxHelper) uses observeCtxHelper correctly to substitute objects and paths");
	// -----------------------------------------------------------------------

	// ................................ Act ..................................
	handlersCount = $._data(obj).events.propertyChange.length;
	$.unobserve({}, "%name", myListener, observeCtxHelper);

	// ................................ Reset ................................
	obj.name = "One";

	// ............................... Assert .................................
	ok(handlersCount===1 && !$._data(obj).events,
	"$.unobserve(object, path, cb, observeCtxHelper) uses observeCtxHelper correctly to substitute objects and paths and unobserve from mapped <objects,paths>");
	reset();

	// =============================== Arrange ===============================
	// ................................ Act ..................................
	$.observe(str, myListener);
	$.observable(obj).setProperty({name: "newName"});

	// ............................... Assert .................................
	equals(result, "",
	"$.observe(path, cb): Observe with no root object and no observeCtxHelper does nothing");
	// -----------------------------------------------------------------------

	// ................................ Reset ................................
	obj.name = "One";

	// =============================== Arrange ===============================
	// ................................ Act ..................................
	$.observe(str, myListener, observeCtxHelper);
	$.observable(obj).setProperty({name: "newName"});

	// ............................... Assert .................................
	equals(result, "",
	"$.observe(path, cb): Observe with no root object and with observeCtxHelper does nothing");
	// -----------------------------------------------------------------------

	// ................................ Reset ................................
	obj.name = "One";

	// =============================== Arrange ===============================
	// ................................ Act ..................................
	$.observe(null, "%name", myListener, observeCtxHelper);
	$.observable(obj).setProperty({name: "newName"});

	// ............................... Assert .................................
	equals(result, "calls: 1, ev.data: prop: name, eventArgs: oldValue: One value: newName, eventArgs.path: name|",
	"$.observe(null, path, cb, observeCtxHelper) observe with null as root object can use observeCtxHelper to substitute objects and paths. Correctly observes object(s) mapped by observeCtxHelper");
	// -----------------------------------------------------------------------

	// ................................ Act ..................................
	handlersCount = $._data(obj).events.propertyChange.length;
	$.unobserve(null, "%name", myListener, observeCtxHelper);

	// ............................... Assert .................................
	ok(handlersCount===1 && !$._data(obj).events,
	"$.unobserve(null, path, cb, observeCtxHelper) uses observeCtxHelper correctly to substitute objects and paths and unobserve from mapped <objects,paths>");
	reset();

	// ................................ Reset ................................
	obj.name = "One";

	// =============================== Arrange ===============================
	// ................................ Act ..................................
	$.observe(undefined, "%name", myListener, observeCtxHelper);
	$.observable(obj).setProperty({name: "newName"});

	// ............................... Assert .................................
	equals(result, "calls: 1, ev.data: prop: name, eventArgs: oldValue: One value: newName, eventArgs.path: name|",
	"$.observe(undefined, path, cb, observeCtxHelper) observe with undefined root object can use observeCtxHelper to substitute objects and paths. Correctly observes object(s) mapped by observeCtxHelper");
	// -----------------------------------------------------------------------

	// ................................ Act ..................................
	handlersCount = $._data(obj).events.propertyChange.length;
	$.unobserve(undefined, "%name", myListener, observeCtxHelper);

	// ............................... Assert .................................
	ok(handlersCount===1 && !$._data(obj).events,
	"$.unobserve(undefined, path, cb, observeCtxHelper) uses observeCtxHelper correctly to substitute objects and paths and unobserve from mapped <objects,paths>");
	reset();

	// ................................ Reset ................................
	obj.name = "One";

	// =============================== Arrange ===============================
	// ................................ Act ..................................
	$.observe(undefined, str, myListener, observeCtxHelper);
	$.observable(obj).setProperty({name: "newName"});

	// ............................... Assert .................................
	equals(result, "",
	"$.observe(path, cb, observeCtxHelper) observe with no root object can use observeCtxHelper to substitute objects and paths. If no object is mapped by observeCtxHelper, does nothing");
	// -----------------------------------------------------------------------

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
	equals(result, "",
	"$.observe(foo, path, ...): When first parameter foo is not a string or object, it is skipped");

	// ................................ Reset ................................
	obj.name = "One";

	// =============================== Arrange ===============================
	// ................................ Act ..................................
	$.observe(true, "%name", myListener, observeCtxHelper);
	$.observable(obj).setProperty({name: "newName"});

	// ............................... Assert .................................
	equals(result, "calls: 1, ev.data: prop: name, eventArgs: oldValue: One value: newName, eventArgs.path: name|",
	"$.observe(foo, path, ...): When first parameter foo is not a string or object, it is skipped");

	// ................................ Act ..................................
	handlersCount = $._data(obj).events.propertyChange.length;
	$.unobserve(true, "%name", myListener, observeCtxHelper);

	// ............................... Assert .................................
	ok(handlersCount===1 && !$._data(obj).events,
	"$.unobserve(foo, path, ...): When first parameter foo is not a string or object, it is skipped");
	reset();

	// ................................ Reset ................................
	obj.name = "One";

	// =============================== Arrange ===============================
	// ................................ Act ..................................
	$.observe(false, "%name", myListener, observeCtxHelper);
	$.observable(obj).setProperty({name: "newName"});

	// ............................... Assert .................................
	equals(result, "calls: 1, ev.data: prop: name, eventArgs: oldValue: One value: newName, eventArgs.path: name|",
	"$.observe(foo, path, ...): When first parameter foo is not a string or object, it is skipped");

	// ................................ Act ..................................
	handlersCount = $._data(obj).events.propertyChange.length;
	$.unobserve(false, "%name", myListener, observeCtxHelper);

	// ............................... Assert .................................
	ok(handlersCount===1 && !$._data(obj).events,
	"$.unobserve(foo, path, ...): When first parameter foo is not a string or object, it is skipped");
	reset();

	// ................................ Reset ................................
	obj.name = "One";

	//TODO test case for observe(domElement, "a.b.c", callback) should not bind at all
});

test("array", function() {
// For V1 >>>>> $.observe(person, "**", changeHandler);  // all props and arraychange on all array-type props - over complete object graph of person.
// For V1 >>>>> $.observe(person.phones, "**", changeHandler);  // all props and arraychange on all array-type props over complete object graph of each phone
// =============================== Arrange ===============================
	// Using an the same event handler for arrayChange and propertyChange

	var myArray = [1,2];

	// ................................ Act ..................................
	$.observe(myArray, myListener);

	$.observable(myArray).insert(10);

	// ............................... Assert .................................
	equal(result + $._data(myArray).events.arrayChange.length + " " + !$._data(myArray).events.propertyChange,
		"regularCallbackCalls: 1, eventArgs: change: insert|1 true",
		"$.observe(myArray, myListener) listens just to array change on the array");

	// ................................ Act ..................................
	reset();
	$.unobserve(myArray, myListener);

	$.observable(myArray).insert(11);

	// ............................... Assert .................................
	equal(result + !$._data(myArray).events + " " + !$._data(myArray).events, "true true",
		"$.unobserve(myArray, cbWithoutArrayCallback) removes the arraychange handler");

	// ................................ Act ..................................
	reset();
	$.observe(myArray, "length", myListener);

	$.observable(myArray).insert(14);

	// ............................... Assert .................................
	equal(result + $._data(myArray).events.arrayChange.length + " " + $._data(myArray).events.propertyChange.length,
		"regularCallbackCalls: 1, eventArgs: change: insert|"
		+ "calls: 2, ev.data: prop: length, eventArgs: oldValue: 4 value: 5, eventArgs.path: length|1 1",
		'$.observe(myArray, "length", myListener) listens to array change on the array and to length propertyChange on the array');

	// ................................ Act ..................................
	reset();
	$.unobserve(myArray, "length", myListener);

	$.observable(myArray).insert(15);

	// ............................... Assert .................................
	equal(result + !$._data(myArray).events + " " + !$._data(myArray).events, "true true",
		'$.unobserve(myArray, "length", cbWithoutArrayCallback) removes the arraychange handler and the propertychange handler');

	// =============================== Arrange ===============================
		reset();

var initialArray = [1,2],
		altArray = [4,3,2,1],
		obj = {name:{first:"n", arr: initialArray}};

	$.observe(obj, "name.arr", myListener);

	// ................................ Act ..................................
	$.observable(initialArray).insert(10);

	// ............................... Assert .................................
	equal(result + $._data(initialArray).events.arrayChange.length + " " + !$._data(initialArray).events.propertyChange,
		"regularCallbackCalls: 1, eventArgs: change: insert|1 true",
		'$.observe(object, "a.b.myArray", cbWithoutArrayCallback) listens just to array change on the array');

	// ................................ Act ..................................
	reset();
	$.observable(obj).setProperty("name.arr", altArray);

	// ............................... Assert .................................
	equals(result, "calls: 1, ev.data: prop: arr, eventArgs: oldValue: 1,2,10 value: 4,3,2,1, eventArgs.path: arr|",
	'$.observe(object, "a.b.myArray", cbWithoutArrayCallback) listens to property change for swapping the array property');

	// ............................... Assert .................................
	reset();
	equals(!$._data(initialArray).events + " " + $._data(altArray).events.arrayChange.length, "true 1",
	'$.observable(obj).setProperty("name.arr", newArray) removes the arrayChange handler on previous array, and adds arrayChange to new array');

	// ................................ Act ..................................
	$.observable(obj.name.arr).insert(11);

	// ............................... Assert .................................
	equals(result, "regularCallbackCalls: 1, eventArgs: change: insert|",
	'$.observe(object, "a.b.myArray", cbWithoutArrayCallback) listens to array changes on leaf array property (regular callback)');

	// ................................ Act ..................................
	handlersCount = $._data(obj.name).events.propertyChange.length + $._data(obj.name.arr).events.arrayChange.length;
	$.unobserve(obj, "name.arr", myListener);

	// ............................... Assert .................................
	ok(handlersCount === 2 && !$._data(obj.name).events && !$._data(obj.name.arr).events,
	'$.unobserve(object, "a.b.myArray") removes both arrayChange and propertyChange event handlers');
	// -----------------------------------------------------------------------
	reset();
	$.observe(obj, "name.arr", "name.arr.length", myListener);

	$.observable(obj.name.arr).insert(16);

	// ............................... Assert .................................
	equal(result + $._data(obj.name.arr).events.arrayChange.length + " " + $._data(obj.name.arr).events.propertyChange.length,
		"regularCallbackCalls: 1, eventArgs: change: insert|"
		+ "calls: 2, ev.data: prop: length, eventArgs: oldValue: 5 value: 6, eventArgs.path: length|1 1",
		'$.observe(object, "a.b.array", "a.b.array.length", myListener) listens to array change on the array and to length propertyChange on the array');

	// ................................ Act ..................................
	reset();
	$.unobserve(obj, "name.arr", "name.arr.length", myListener);

	$.observable(obj.name.arr).insert(17);

	// ............................... Assert .................................
	equal(result + !$._data(obj.name.arr).events, "true",
		'$.unobserve(object, "a.b.array", "a.b.array.length", cbWithoutArrayCallback) removes the arraychange handler and the propertychange handler');

	// ................................ Act ..................................
	reset();
	$.observe(obj, "name.*", myListener);

	$.observable(obj.name.arr).insert(18);

	$.observable(obj.name).setProperty({
		first: "1st",
		notThereBefore: "2nd",
		arr: initialArray
	});
	$.observable(obj.name.arr).insert(19);

	// ............................... Assert .................................
	equal(result + $._data(obj.name.arr).events.arrayChange.length + " " + $._data(obj.name).events.propertyChange.length + " " + !$._data(altArray).events,
		"regularCallbackCalls: 1, eventArgs: change: insert|"
		+ "calls: 2, ev.data: prop: *, eventArgs: oldValue: n value: 1st, eventArgs.path: first|"
		+ "calls: 3, ev.data: prop: *, eventArgs: oldValue: undefined value: 2nd, eventArgs.path: notThereBefore|"
		+ "calls: 4, ev.data: prop: *, eventArgs: oldValue: 4,3,2,1,11,16,17,18 value: 1,2,10, eventArgs.path: arr|"
		+ "regularCallbackCalls: 5, eventArgs: change: insert|1 1 true",
		'$.observe(object, "a.b.*", myListener) listens to all propertyChange events on object.a.b and to array change on any array properties of object.a.b');

	// ................................ Act ..................................
	reset();
	$.unobserve(obj, "name.*", myListener);

	$.observable(obj.name.arr).insert(17);

	// ............................... Assert .................................
	equal(result + !$._data(obj.name.arr).events, "true",
		'$.unobserve(object, "a.b.*", cbWithoutArrayCallback) removes the propertychange handler and any arraychange handlers');

	// =============================== Arrange ===============================
	// Using an array event handler
	obj = {name:{first:"n", arr: initialArray}};
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
	equal(result + !$._data(initialArray).events + " " + $._data(obj.name).events.propertyChange.length + " "
		+ $._data(newArray1).events.arrayChange.length + " " + $._data(newArray2).events.arrayChange.length + " " + $._data(newArray3).events.arrayChange.length,
		"regularCallbackCalls: 1, eventArgs: change: insert|"
		+ "calls: 2, ev.data: prop: *, eventArgs: oldValue: n value: 1,1, eventArgs.path: first|"
		+ "calls: 3, ev.data: prop: *, eventArgs: oldValue: undefined value: 2,2, eventArgs.path: arrayNotThereBefore|"
		+ "calls: 4, ev.data: prop: *, eventArgs: oldValue: 1,2,10,19,17,18 value: 3,3, eventArgs.path: arr|"
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
	equal(result + !$._data(obj.name.arr).events + " " + !$._data(newArray1).events + " " + !$._data(newArray1).events + " " + !$._data(newArray1).events, "true true true true",
		'$.unobserve(object, "a.b.*", cbWithoutArrayCallback) removes the propertychange handler and any arraychange handlers');

	// =============================== Arrange ===============================
	// Using an array event handler
	obj = {name:{first:"n", arr: [1,2]}};

	myListener.array = function(ev,eventArgs) {
		result += "arrayListenerCalls: " + calls
		+ ", eventArgs: change: " + eventArgs.change + "|";
	}

	$.observe(obj, "name.arr", myListener);

	// ................................ Act ..................................
	reset();
	$.observable(obj).setProperty("name.arr", [4,3,2,1]);

	// ............................... Assert .................................
	equals(result, "calls: 1, ev.data: prop: arr, eventArgs: oldValue: 1,2 value: 4,3,2,1, eventArgs.path: arr|",
	'$.observe(object, "a.b.myArray", cbWithArrayCallback) listens to property change for swapping the array property');

	// ................................ Act ..................................
	reset();
	$.observable(obj.name.arr).insert(12);

	// ............................... Assert .................................
	equals(result, "arrayListenerCalls: 0, eventArgs: change: insert|",
	'$.observe(object, "a.b.myArray", cbWithArrayCallback) listens to array changes on leaf array property (array callback handler)');

	// ................................ Act ..................................
	handlersCount = $._data(obj.name.arr).events.arrayChange.length;
	$.unobserve(obj, "name.arr", myListener);

	// ............................... Assert .................................
	ok(handlersCount === 1 && !$._data(obj.name.arr).events,
	'$.unobserve(object, "a.b.myArray") removes arrayChange event handler');
	// -----------------------------------------------------------------------

	// =============================== Arrange ===============================
		$.observe(obj.name.arr, myListener);

	// ................................ Act ..................................
	reset();
	$.observable(obj.name.arr).insert(13);

	// ............................... Assert .................................
	equals(result, "arrayListenerCalls: 0, eventArgs: change: insert|",
	'$.observe(myArray, cbWithArrayCallback) listens to array changes (array callback handler)');
	// ................................ Act ..................................
	handlersCount = $._data(obj.name.arr).events.arrayChange.length;
	$.unobserve(obj.name.arr, myListener);

	// ............................... Assert .................................
	ok(handlersCount === 1 && !$._data(obj.name.arr).events,
	'$.unobserve(myArray) removes arrayChange event handler');
	// -----------------------------------------------------------------------

});

test("computed observables in paths", function() {
	// =============================== Arrange ===============================
	var app = { items: [
		{
			name: "one",
			row: "1",
			expanded: false
		},
		{
			name: "two",
			row: "2",
			expanded: false
		},
		{
			name: "three",
			row: "3",
			expanded: false
		}
	]};

function testTemplate(message, template) {
	$.templates(template)
	.link("#result", app, {
		getItems: function(exp) {
			return exp ? ["a","b"]: [];
		}
	});

	// ................................ Act ..................................
	var ret = $("#result").text() + "|";
		$.view("#result .groupdata").refresh();

	$.observable(app.items[0]).setProperty("expanded", true);
	ret += $("#result").text() + "|";

	$.observable(app.items[0]).setProperty("expanded", false);
	ret += $("#result").text() + "|";

	$.observable(app.items[1]).setProperty("expanded", true);
	ret += $("#result").text() + "|";

	$.observable(app.items[1]).setProperty("expanded", false);
	ret += $("#result").text() + "|";

	$.observable(app.items).insert(0, {
		name: "added",
		row: "+",
		expanded: false
	});
	ret += $("#result").text() + "|";
	$.observable(app.items).remove(0);
	ret += $("#result").text() + "|";
	$("#result").empty();

	// ............................... Assert .................................
	equal(ret, "onetwothree|one1a1btwothree|onetwothree|onetwo2a2bthree|onetwothree|addedonetwothree|onetwothree|"
	, "Interplay of view and tag refresh in deep content: " + message);
}

	// ............................... Assert .................................
	testTemplate("div",
	"{^{for items}}"
		+ "{{:name}}"
		+ "{^{for ~getItems(expanded) ~row=row}}"
			+ "<div class='groupdata'>{{:~row}}{{:#data}}</div>"
		+ "{{/for}}"
	+ "{{/for}}");

	// ............................... Assert .................................
	testTemplate("deep div",
	"{^{for items}}"
		+ "<span>{{:name}}</span>"
		+ "<div><div>{^{for ~getItems(expanded) ~row=row}}"
			+ "<span></span>"
			+ "<span class='groupdata'>{{:~row}}{{:#data}}</span>"
		+ "{{/for}}</div></div>"
	+ "{{/for}}");

	// ............................... Assert .................................
	testTemplate("deep div2",
	"{^{for items}}"
		+ "<span>{{:name}}</span>"
		+ "<div><div>{^{for ~getItems(expanded) ~row=row}}"
			+ "<span></span>"
			+ "<span class='groupdata'>{{:~row}}{{:#data}}</span>"
		+ "{{/for}}<div></div></div></div>"
	+ "{{/for}}");

	// ............................... Assert .................................
	testTemplate("li",
	"<ul>{^{for items}}"
		+ "<li>{{:name}}</li>"
		+ "<li><ul>{^{for ~getItems(expanded) ~row=row}}"
			+ "<li></li>"
			+ "<li class='groupdata'>{{:~row}}{{:#data}}</li>"
		+ "{{/for}}</ul></li>"
	+ "{{/for}}</ul>");

	// ............................... Assert .................................
	testTemplate("table",
	"<table>{^{for items}}"
		+ "<tbody><tr><td>{{:name}}</td></tr></tbody>"
		+ "{^{for ~getItems(expanded) ~row=row}}"
			+ "<tbody class='groupdata'><tr>"
				+ "<td>{{:~row}}{{:#data}}</td>"
			+ "</tr></tbody>"
		+ "{{/for}}"
	+ " {{/for}}</table>");

	// ............................... Assert .................................
	testTemplate("deep table",
	"<table>{^{for items}}"
		+ "<tbody><tr><td>{{:name}}</td></tr></tbody>"
		+ "<tbody class='groupdata'>"
			+ "{^{for ~getItems(expanded) ~row=row}}"
				+ "<tr>"
					+ "<td>{{:~row}}{{:#data}}</td>"
				+ "</tr>"
			+ "{{/for}}"
		+ "</tbody>"
	+ " {{/for}}</table>");

	// =============================== Arrange ===============================
	var ret = "",
		people1 = [{address:{street: "1 first street"}}],
		people2 = [{address:{street: "1 second street"}},{address:{street: "2 second street"}}],
		data1 = {value: "data1", people:people1},
		data2 = {value: "data2", people:people2},
		app = {
			alt:false,
			index: 1,
			getPeople: getPeople,
			getData: getData,
			options: {
				getWidth: function() {
					return "33";
				}
			}
		};

	function getPeople(type) {
		return this.alt ? people2 : people1;
	}

	getPeople.depends = function() {
		return [app, "alt"];
	}

	function getData(type) {
		return this.alt ? data2 : data1;
	}

	getData.depends = function() {
		return [app, "alt"];
	}

	// ................................ Act ..................................
	$.templates("{^{for (getPeople()[index]||{}).address}}{^{:street}}{{/for}}").link("#result", app);

	ret = "|" + $("#result").text();

	// ................................ Act ..................................
	$.observable(app).setProperty("index", 0);
	ret += "|" + $("#result").text();

	// ................................ Act ..................................
	$.observable(people1[0].address).setProperty("street", "1 first streetB");
	ret += "|" + $("#result").text();

	// ................................ Act ..................................
	$.observable(people1[0]).setProperty("address", {street: "1 first swappedstreet"});
	ret += "|" + $("#result").text();

	// ................................ Act ..................................
	$.observable(app).setProperty("alt", true);
	ret += "|" + $("#result").text();

	// ................................ Act ..................................
	$.observable(app).setProperty("index", 1);
	ret += "|" + $("#result").text();

	// ................................ Act ..................................
	$.observable(people2[1]).setProperty("address", {street: "2 second swappedstreet"});
	ret += "|" + $("#result").text();

	// ................................ Act ..................................
	$.observable(people2[1].address).setProperty("street", "2 second swappedstreetB");
	ret += "|" + $("#result").text();

	// ................................ Assert ..................................
	equal(ret, "||1 first street|1 first streetB|1 first swappedstreet|1 second street|2 second street|2 second swappedstreet|2 second swappedstreetB",
		"deep paths with computed observables bind correctly to rest of path after computed returns new array");
	$("#result").empty();

	app.alt = false;
	app.index = 0;
	people1 = [{address:{street: "1 first street"}}];
	people2 = [{address:{street: "1 second street"}},{address:{street: "2 second street"}}];
	data1 = {value: "data1", people:people1};
	data2 = {value: "data2", people:people2};

	// ................................ Act ..................................
	$.templates("{^{:(getData().people[index]).address^street}}").link("#result", app);

	ret = $("#result").text();

	// ................................ Act ..................................
	$.observable(people1[0].address).setProperty("street", "1 first streetB");
	ret += "|" + $("#result").text();

	// ................................ Act ..................................
	$.observable(people1[0]).setProperty("address", {street: "1 first swappedstreet"});
	ret += "|" + $("#result").text();

	// ................................ Act ..................................
	$.observable(app).setProperty("alt", true);
	ret += "|" + $("#result").text();

	// ................................ Assert ..................................
	equal(ret, "1 first street|1 first streetB|1 first swappedstreet|1 second street",
		"deep paths with computed observables bind correctly to rest of path after computed returns new object");
	$("#result").empty();

	//TODO add support for binding to [expression] accessors in deep paths, including [index] accessors for arrays, as above
	//$.observable(app).setProperty("index", 1);
	//ret += "|" + $("#result").text();

	//$.observable(people2[1]).setProperty("address", {street: "2 second swappedstreet"});
	//ret += "|" + $("#result").text();

	//$.observable(people2[1].address).setProperty("street", "2 second swappedstreetB");
	//ret += "|" + $("#result").text();


	// TODO allow the following to work by declaring getPeople as depending on collection change of app.alt ? people2 : people;
	//$.observable(people2).insert(1, {address:{street: "99 new street"}})
	//ret += "|" + $("#result").text();

	// =============================== Arrange ===============================
	function getValue(a) {
		return this.value + a;
	}
	function switchAlt() {
		$.observable(app).setProperty("alt", !app.alt);
	}

	app.alt = false;
	app.index = 0;
	people1 = [{address:{street: "1 first street"}}];
	people2 = [{address:{street: "1 second street"}},{address:{street: "2 second street"}}];
	data1 = {value: "val1", people:people1, getValue:getValue},
	data2 = {value: "val2", people:people2, getValue:getValue},

	// ................................ Act ..................................
	$.templates("{^{:getData().getValue(22)}}").link("#result", app);

	// ................................ Act ..................................
	$.observable(app).setProperty("alt", true);
	ret = "|" + $("#result").text();
	switchAlt();
	ret += "--" + $("#result").text();
	$("#result").empty();

	// ................................ Act ..................................
	$.templates("{^{for (getPeople())}}{^{:address.street}}{{/for}}").link("#result", app);
	ret += "|" + $("#result").text();
	switchAlt();
	ret += "--" + $("#result").text();
	$("#result").empty();

	// ................................ Act ..................................
	$.templates("{^{for getPeople()}}{^{:address.street}}{{/for}}").link("#result", app);
	ret += "|" + $("#result").text();
	switchAlt();
	ret += "--" + $("#result").text();
	$("#result").empty();

	// ................................ Act ..................................
	$.templates("{^{:(getData().getValue(22))}}").link("#result", app);
	ret += "|" + $("#result").text();
	switchAlt();
	ret += "--" + $("#result").text();
	$("#result").empty();

	// ................................ Act ..................................
	$.templates("{^{:getData().getValue((getData().getValue(22)))}}").link("#result", app);
	ret += "|" + $("#result").text();
	switchAlt();
	ret += "--" + $("#result").text();
	$("#result").empty();

	// ................................ Act ..................................
	$.templates("{^{:getData(getPeople(getData(alt || 2).getValue()).length).value}}").link("#result", app);
	ret += "|" + $("#result").text();
	switchAlt();
	ret += "--" + $("#result").text();
	$("#result").empty();

	// ................................ Act ..................................
	$.templates("{^{for (getPeople()[index]||{}).address}}{^{:street}}{{/for}}").link("#result", app);
	ret += "|" + $("#result").text();
	switchAlt();
	ret += "--" + $("#result").text();
	$("#result").empty();

	// ................................ Act ..................................
	$.templates("{^{:(((getData()).people[0]).address^street)}}").link("#result", app);
	ret += "|" + $("#result").text();
	switchAlt();
	ret += "--" + $("#result").text();
	$("#result").empty();

	// ................................ Act ..................................
	$.templates("{^{:'b'+((getData().value) + ('a'+getData().value)) + getData().getValue(55)}}").link("#result", app);
	ret += "|" + $("#result").text();
	switchAlt();
	ret += "--" + $("#result").text();
	$("#result").empty();

	// ................................ Act ..................................
	$.templates("{^{:'a' + getData().value}}").link("#result", app);
	ret += "|" + $("#result").text();
	switchAlt();
	ret += "--" + $("#result").text();
	$("#result").empty();

	// ................................ Assert ..................................
	equal(ret, "|val222--val122|1 first street--1 second street2 second street|1 second street2 second street--1 first street"
		+ "|val122--val222|val2val222--val1val122|val1--val2|1 second street--1 first street"
		+ "|1 first street--1 second street|bval2aval2val255--bval1aval1val155|aval1--aval2",
		"deep paths with computed observables bind correctly to rest of path after computed returns new object or array, including complex expressions, wrapped in parens etc.");
	});

test("MVVM", function() {
	reset();
	// =============================== Arrange ===============================
	function Person(name, address, phones) {
		this._name = name;
		this._address = address;
		this._phones = phones;
	}

	var personProto = {
		name: function() {
			return this._name;
		},
		address: function() {
			return this._address;
		},
		phones: function() {
			return this._phones;
		}
	};

	personProto.name.set = function(val) {
		this._name = val;
	};

	personProto.address.set = function(val) {
		this._address = val;
	};

	personProto.phones.set = function(val) {
		this._phones = val;
	};

	Person.prototype = personProto;

	function Address(street) {
		this._street = street;
	}

	var addressProto = {
		street: function() {
			return this._street;
		}
	};

	addressProto.street.set = function(val) {
		this._street = val;
	};

	Address.prototype = addressProto;

	function Phone(phone) {
		this._number = phone.number;
	}

	var phoneProto = {
		number: function() {
			return this._number;
		}
	};

	phoneProto.number.set = function(val) {
		this._number = val;
	};

	Phone.prototype = phoneProto;

	var person = new Person("pete", new Address("1st Ave"), []),
		message = '',
		ret = '',
		input,
		getResult = function(sep) {ret += (sep || "|") + input.val() + "/" + $("#result").text();};

	// ................................ Act ..................................
	$.templates('<input data-link="address()^street()" />{^{:address()^street()}}').link("#result", person);

	input = $("#result input");
	getResult();
	$("#result input").val("InputStreet").change();
	getResult("--");
	$.observable(person.address()).setProperty("street", "oldAddressChgStreet");
	getResult("--");
	$.observable(person).setProperty("address", new Address("newAddressStreet"));
	getResult("--");
	$.observable(person.address()).setProperty("street", "newAddressChgStreet");
	getResult("--");

	$("#result").empty();

	// ............................... Assert .................................
	equal(ret, "|1st Ave/1st Ave--InputStreet/InputStreet--oldAddressChgStreet/oldAddressChgStreet--newAddressStreet/newAddressStreet--newAddressChgStreet/newAddressChgStreet",
		"Paths with computed/getters: address()^street() - Swapping object higher in path then updating leaf getter, works correctly");

	// =============================== Arrange ===============================

	person = new Person("pete", new Address("1st Ave"), []);

	// ................................ Act ..................................
	ret = "";
	$.templates('<input data-link="address().street()" />{^{:address()^street()}}').link("#result", person);

	input = $("#result input");
	getResult();
	input.val("InputStreet").change();
	getResult("--");
	$.observable(person.address()).setProperty("street", "oldAddressChgStreet");
	getResult("--");
	$.observable(person).setProperty("address", new Address("newAddressStreet"));
	getResult("--");
	$.observable(person.address()).setProperty("street", "newAddressChgStreet");
	getResult("--");

	$("#result").empty();

	// ............................... Assert .................................
	equal(ret, "|1st Ave/1st Ave--InputStreet/InputStreet--oldAddressChgStreet/oldAddressChgStreet--newAddressStreet/newAddressStreet--newAddressChgStreet/newAddressChgStreet",
		"Paths with computed/getters: address().street() - Paths with computed/getter followed by '.' still update preceding getter"
		+ "- same as if there was a '^' separator");
	// =============================== Arrange ===============================

	person = new Person("pete", new Address("1st Ave"), [new Phone({number: "phone1"}), new Phone({number:"phone2"})]);

	// ................................ Act ..................................
	ret = "";
	$.templates('<input data-link="address().street()" />{^{:address()^street()}}').link("#result", person);

	var observeAllHandler = function(ev, eventArgs) {
		message += JSON.stringify(eventArgs) + "\n"
	};

	var eventsCountBefore = $._data(person).events.propertyChange.length
		+ " " + $._data(person.address()).events.propertyChange.length + "|";

	$.observable(person).observeAll(observeAllHandler);

	var eventsCountAfterObserveAll = $._data(person).events.propertyChange.length
		+ " " + $._data(person.address()).events.propertyChange.length + "|";

	input = $("#result input");
	input.val("InputStreet").change();
	$.observable(person.address()).setProperty("street", "oldAddressChgStreet");
	$.observable(person).setProperty("address", new Address("newAddressStreet"));
	$.observable(person.address()).setProperty("street", "newAddressChgStreet");

	var eventsCountAfterChanges = $._data(person).events.propertyChange.length
		+ " " + $._data(person.address()).events.propertyChange.length + "|";

	// ............................... Assert .................................
	equal(message, '{\"change\":\"set\",\"path\":\"street\",\"value\":\"InputStreet\",\"oldValue\":\"1st Ave\"}\n\
{\"change\":\"set\",\"path\":\"street\",\"value\":\"oldAddressChgStreet\",\"oldValue\":\"InputStreet\"}\n\
{\"change\":\"set\",\"path\":\"address\",\"value\":{\"_street\":\"newAddressStreet\"},\"oldValue\":{\"_street\":\"oldAddressChgStreet\"}}\n\
{\"change\":\"set\",\"path\":\"street\",\"value\":\"newAddressChgStreet\",\"oldValue\":\"newAddressStreet\"}\n',
		"Paths with computed/getters: address().street() - observeAll correctly tracks all changes on all objects, even as object graph changes");

	// ................................ Act ..................................
	ret = "";
	message = "";

	$.observable(person).unobserveAll(observeAllHandler);

	var eventsCountAfterUnobserveAll = $._data(person).events.propertyChange.length
		+ " " + $._data(person.address()).events.propertyChange.length + "|";

	$.unobserve(person.address());

	var eventsAfterUnobserveAddress = $._data(person).events.propertyChange.length + " " + !$._data(person.address()).events;

	input.val("InputStreetAfterUnobserve").change();
	$.observable(person.address()).setProperty("street", "oldAddressChgStreetAfterUnobserve");
	$.observable(person).setProperty("address", new Address("newAddressStreetAfterUnobserve"));
	$.observable(person.address()).setProperty("street", "newAddressChgStreetAfterUnobserve");

	getResult("--");

	$("#result").empty();

 var eventsAfterEmptyTemplateContainer = !$._data(person).events
		+ " " + !$._data(person.address()).events + "|";

	// ............................... Assert .................................
	equal(message + ret
		+ eventsCountBefore
		+ eventsCountAfterObserveAll
		+ eventsCountAfterChanges
		+ eventsCountAfterUnobserveAll
		+ eventsAfterUnobserveAddress
		+ eventsAfterEmptyTemplateContainer,
		"--newAddressChgStreetAfterUnobserve/newAddressChgStreetAfterUnobserve2 2|3 3|3 3|2 2|2 truetrue false|",
		"Paths with computed/getters: address().street() - unobserveAll is successful");

	// =============================== Arrange ===============================

	getResult = function(sep){ret += (sep || "|") + $("#result").text();};

	person = new Person("pete", new Address("1st Ave"), [new Phone({number: "phone1"}), new Phone({number:"phone2"})]);

	// ................................ Act ..................................
	ret = "";
	$.templates('{^{for phones()}}{^{:number()}},{{/for}}').link("#result", person);

	getResult("\nInit>>");
	$.observable(person.phones()).insert(new Phone({number: "insertedPhone"}));
	getResult("insert:");
	$.observable(person.phones()).remove(0);
	getResult("remove:");
	$.observable(person.phones()).refresh([new Phone({number: "replacedPhone1"}), new Phone({number: "replacedPhone2"})]);
	getResult("refresh:");
	$.observable(person.phones()).insert(1, [new Phone({number: "insertedPhone3a"}), new Phone({number: "insertedPhone3b"})]);
	getResult("insert:");
	$.observable(person.phones()).move(1,3,2);
	getResult(" move:");
	$.observable(person).setProperty("phones", [new Phone({number: "replacedPhone1"})]);
	getResult("\nSet>>");
	$.observable(person.phones()).insert(new Phone({number: "insertedPhoneX"}));
	getResult("insert:");
	$.observable(person.phones()).remove(0);
	getResult("remove:");
	$.observable(person.phones()).refresh([new Phone({number: "replacedPhoneX1"}), new Phone({number: "replacedPhoneX2"})]);
	getResult("refresh:");
	$.observable(person.phones()).insert(1, [new Phone({number: "insertedPhoneX3a"}), new Phone({number: "insertedPhoneX3b"})]);
	getResult("insert:");
	$.observable(person.phones()).move(1,3,2);
	getResult("move:");
	$.observable(person).setProperty("phones", []);
	getResult("\nsetEmpty>>");
	$.observable(person.phones()).insert(new Phone({number: "insertedPhoneY"}));
	getResult("insert:");

	$("#result").empty();

	// ............................... Assert .................................
	equal(ret, "\nInit>>phone1,phone2,insert:phone1,phone2,insertedPhone,remove:phone2,insertedPhone,refresh:replacedPhone1,replacedPhone2,insert:replacedPhone1,insertedPhone3a,insertedPhone3b,replacedPhone2, move:replacedPhone1,replacedPhone2,insertedPhone3a,insertedPhone3b,\
\nSet>>replacedPhone1,insert:replacedPhone1,insertedPhoneX,remove:insertedPhoneX,refresh:replacedPhoneX1,replacedPhoneX2,insert:replacedPhoneX1,insertedPhoneX3a,insertedPhoneX3b,replacedPhoneX2,move:replacedPhoneX1,replacedPhoneX2,insertedPhoneX3a,insertedPhoneX3b,\
\nsetEmpty>>insert:insertedPhoneY,",
		"Array operations with getters allow complete functionality, and track the modified tree at all times");
	// =============================== Arrange ===============================

	person = new Person("pete", new Address("1st Ave"), [new Phone({number: "phone1"}), new Phone({number:"phone2"})]);

	// ................................ Act ..................................
	ret = "";
	$.templates('{^{for phones()}}{^{:number()}},{{/for}}').link("#result", person);

	eventsCountBefore = $._data(person).events.propertyChange.length
		+ " " + $._data(person.phones()).events.arrayChange.length
		+ " " + $._data(person.phones()[0]).events.propertyChange.length + "|";

	$.observable(person).observeAll(observeAllHandler);

	eventsCountAfterObserveAll = $._data(person).events.propertyChange.length
		+ " " + $._data(person.phones()).events.arrayChange.length
		+ " " + $._data(person.phones()[0]).events.propertyChange.length + "|";

	$.observable(person.phones()).insert(new Phone({number: "insertedPhone"}));
	$.observable(person.phones()).remove(0);
	$.observable(person.phones()).refresh([new Phone({number: "replacedPhone1"}), new Phone({number: "replacedPhone2"})]);
	$.observable(person.phones()).insert(1, [new Phone({number: "insertedPhone3a"}), new Phone({number: "insertedPhone3b"})]);
	$.observable(person.phones()).move(1,3,2);
	$.observable(person).setProperty("phones", [new Phone({number: "replacedPhone1"})]);
	$.observable(person.phones()).insert(new Phone({number: "insertedPhoneX"}));
	$.observable(person.phones()).remove(0);
	$.observable(person.phones()).refresh([new Phone({number: "replacedPhoneX1"}), new Phone({number: "replacedPhoneX2"})]);
	$.observable(person.phones()).insert(1, [new Phone({number: "insertedPhoneX3a"}), new Phone({number: "insertedPhoneX3b"})]);
	$.observable(person.phones()).move(1,3,2);
	$.observable(person).setProperty("phones", []);
	$.observable(person.phones()).insert(new Phone({number: "insertedPhoneY"}));
	$.observable(person.phones()[0]).setProperty("number", "newNumber");

	eventsCountAfterChanges = $._data(person).events.propertyChange.length
		+ " " + $._data(person.phones()).events.arrayChange.length
		+ " " + $._data(person.phones()[0]).events.propertyChange.length + "|";

	// ............................... Assert .................................
	equal(message, '{\"change\":\"insert\",\"index\":2,\"items\":[{\"_number\":\"insertedPhone\"}]}\n\
{\"change\":\"remove\",\"index\":0,\"items\":[{\"_number\":\"phone1\"}]}\n\
{\"change\":\"refresh\",\"oldItems\":[{\"_number\":\"phone2\"},{\"_number\":\"insertedPhone\"}]}\n\
{\"change\":\"insert\",\"index\":1,\"items\":[{\"_number\":\"insertedPhone3a\"},{\"_number\":\"insertedPhone3b\"}]}\n\
{\"change\":\"move\",\"oldIndex\":1,\"index\":3,\"items\":[{\"_number\":\"insertedPhone3a\"},{\"_number\":\"insertedPhone3b\"}]}\n\
{\"change\":\"set\",\"path\":\"phones\",\"value\":[{\"_number\":\"replacedPhone1\"}],\"oldValue\":[{\"_number\":\"replacedPhone1\"},{\"_number\":\"replacedPhone2\"},{\"_number\":\"insertedPhone3a\"},{\"_number\":\"insertedPhone3b\"}]}\n\
{\"change\":\"insert\",\"index\":1,\"items\":[{\"_number\":\"insertedPhoneX\"}]}\n\
{\"change\":\"remove\",\"index\":0,\"items\":[{\"_number\":\"replacedPhone1\"}]}\n\
{\"change\":\"refresh\",\"oldItems\":[{\"_number\":\"insertedPhoneX\"}]}\n\
{\"change\":\"insert\",\"index\":1,\"items\":[{\"_number\":\"insertedPhoneX3a\"},{\"_number\":\"insertedPhoneX3b\"}]}\n\
{\"change\":\"move\",\"oldIndex\":1,\"index\":3,\"items\":[{\"_number\":\"insertedPhoneX3a\"},{\"_number\":\"insertedPhoneX3b\"}]}\n\
{\"change\":\"set\",\"path\":\"phones\",\"value\":[],\"oldValue\":[{\"_number\":\"replacedPhoneX1\"},{\"_number\":\"replacedPhoneX2\"},{\"_number\":\"insertedPhoneX3a\"},{\"_number\":\"insertedPhoneX3b\"}]}\n\
{\"change\":\"insert\",\"index\":0,\"items\":[{\"_number\":\"insertedPhoneY\"}]}\n\
{\"change\":\"set\",\"path\":\"number\",\"value\":\"newNumber\",\"oldValue\":\"insertedPhoneY\"}\n',
		"Paths with computed/getters: address().street() - observeAll correctly tracks all changes on all objects, even as object graph changes");

	// ................................ Act ..................................
	ret = "";
	message = "";

	$.observable(person).unobserveAll(observeAllHandler);

	eventsCountAfterUnobserveAll = $._data(person).events.propertyChange.length
		+ " " + $._data(person.phones()).events.arrayChange.length
		+ " " + $._data(person.phones()[0]).events.propertyChange.length + "|";

	$.unobserve(person.phones());

	var eventsAfterUnobservePhones = $._data(person).events.propertyChange.length
		+ " " + !$._data(person.phones()).events
		+ " " + $._data(person.phones()[0]).events.propertyChange.length + "|";

	$.observable(person.phones()).insert(new Phone({number: "insertedPhoneZ"}));
	$.observable(person.phones()[0]).setProperty("number", "newNumberZ");

	$("#result").empty();

	eventsAfterEmptyTemplateContainer = !$._data(person).events
		+ " " + !$._data(person.phones()).events
		+ " " + !$._data(person.phones()[0]).events + "|";

	// ............................... Assert .................................
	equal(message + ret
		+ eventsCountBefore
		+ eventsCountAfterObserveAll
		+ eventsCountAfterChanges
		+ eventsCountAfterUnobserveAll
		+ eventsAfterUnobservePhones
		+ eventsAfterEmptyTemplateContainer,
		"1 1 1|2 2 2|2 2 2|1 1 1|1 true 1|true true true|",
		"Paths with computed/getters: address().street() - unobserveAll is successful");

});

test("observeAll", function() {
	reset();

	// =============================== Arrange ===============================
	function changeHandler(ev, eventArgs) {
		for (var key in eventArgs) {
			result += key + ": " + eventArgs[key] + "|";
		}
	}

	$.observable(model).observeAll(changeHandler);

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
	$.observable(model.things).refresh([model.things[1],model.things[0],model.things[1]]);
	$.observable(model.things[2]).setProperty("thing", model.things[2].thing + "+");
var test = result;
	// ............................... Assert .................................
	equal(result, "change: set|path: address|value: [object Object]|oldValue: [object Object]|change: set|path: street|value: upper St|oldValue: 1st|change: set|path: ZIP|value: 33333|oldValue: 00000|change: set|path: things|value: [object Object]|oldValue: |change: insert|index: 1|items: [object Object]|change: refresh|oldItems: [object Object],[object Object]|change: set|path: thing|value: bush+|oldValue: bush|",
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
	$.observable(model).observeAll(changeHandler);

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
	function cb2(ev, eventArgs) {}

	$.observable(model).observeAll(cb2);

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
	$.observable(model).unobserveAll(changeHandler);

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
	$.observable(model).observeAll(changeHandler);

	$.observable(model.things).unobserveAll(changeHandler);

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
	$.observable(model.things).observeAll(changeHandler);

	// ............................... Assert .................................
		listeners = $._data(model.things).events.arrayChange.length + " "
	+ $._data(model.things[0]).events.propertyChange.length + " "
	+ $._data(model.things[1]).events.propertyChange.length;

	equal(listeners, "1 1 1", '$.observable(someArray).observeAll(changeHandler) works correctly');

	$.observable(model.things).unobserveAll(changeHandler);

});

module("API - Settings");

test("delimiters", 1, function() {
	$.views.settings.delimiters("@%","%@");
	var result = $.templates("A_@%if true%@yes@%/if%@_B").render();
	$.views.settings.delimiters("{{","}}");
	equal(result, "A_yes_B", "Custom delimiters");
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
	equal($("#result").text(), "TwoOne", "Template with tag resource");

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
	equal($("#result").text(), "NoisFooTwoOne", "Can access tag and helper resources from a nested context (i.e. inside {{if}} block)");
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
	ok(view.type === "myFlowElCnt" && view.ctx.tag.tagName === "myWrapElCnt", 'Within {{myFlow}} block, for a flow tag, $.view(elem) gets nearest "myFlow" view, but view.ctx.tag is the nearest non-flow tag');

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
	ok(tags.length === 4 && tags[0].tagName === "myWrap" && tags[1].tagName === "myWrap2" && tags[2].tagName === "myWrap2"  && tags[3].tagName === "myWrap" && tags[0].tagCtx.props.val === 1 && tags[0].tagCtx.view.getIndex() === 0,
		'view.childTags(true) returns all tags within the view - in document order');

	// ................................ Act ..................................
	tags = view1.childTags("myWrap");

	// ............................... Assert .................................
	ok(tags.length === 2 && tags[0].tagName === "myWrap" && tags[1].tagName === "myWrap" && tags[0].tagCtx.props.val === 1 && tags[0].tagCtx.view.getIndex() === 0,
		'view.childTags("myTagName") returns all top-level tags of the given name within the view - in document order');

	// ................................ Act ..................................
	tags = view1.childTags(true, "myWrap2");

	// ............................... Assert .................................
	ok(tags.length === 2 && tags[0].tagName === "myWrap2" && tags[1].tagName === "myWrap2" && tags[0].tagCtx.view.getIndex() === 0,
		'view.childTags(true, "myTagName") returns all tags of the given name within the view - in document order');

	// ................................ Act ..................................
	tags = view1.childTags("myWrap2");

	// ............................... Assert .................................
	ok(tags.length === 0, 'view.childTags(true, "myTagName") returns all tags of the given name within the view - in document order');

	// ................................ Act ..................................
	tags = view1.get(true, "myWrap").childTags(); // Get first myWrap view and look for its top-level child tags

	// ............................... Assert .................................
	ok(tags.length === 2 && tags[0].tagName === "myWrap2" && tags[1].tagName === "myWrap2" && tags[1].tagCtx.view.getIndex() === 0,
		'tag.childTags() returns top-level bound child tags, and skips any unbound tags');

	// ................................ Act ..................................
	tags = view1.get(true, "myWrap").childTags(true); // Get first myWrap view and look for descendant tags

	// ............................... Assert .................................
	ok(tags.length === 2 && tags[0].tagName === "myWrap2" && tags[1].tagName === "myWrap2",
		'tag.childTags(true) returns descendant tags, and skips any unbound tags');

	// ................................ Act ..................................
	tags = view1.childTags("myWrap")[0].childTags(); // Get first myWrap tag and look for its top-level child tags

	// ............................... Assert .................................
	ok(tags.length === 2 && tags[0].tagName === "myWrap2" && tags[1].tagName === "myWrap2" && tags[1].tagCtx.view.getIndex() === 0,
		'tag.childTags() returns top-level bound child tags, and skips any unbound tags');

	// ................................ Act ..................................
	tags = view1.childTags("myWrap")[0].childTags(true); // Get first myWrap tag and look for descendant tags

	// ............................... Assert .................................
	ok(tags.length === 2 && tags[0].tagName === "myWrap2" && tags[1].tagName === "myWrap2",
		'tag.childTags(true) returns descendant tags, and skips any unbound tags');

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
	ok(tags.length === 4 && tags[0].tagName === "myWrapElCnt" && tags[1].tagName === "myWrap2ElCnt" && tags[2].tagName === "myWrap2ElCnt" && tags[3].tagName === "myWrapElCnt" && tags[0].tagCtx.props.val === 1 && tags[0].tagCtx.view.getIndex() === 0,
		'In element-only content, view.childTags(true) returns all tags within the view - in document order');

	// ................................ Act ..................................
	tags = view1.childTags("myWrapElCnt");

	// ............................... Assert .................................
	ok(tags.length === 2 && tags[0].tagName === "myWrapElCnt" && tags[1].tagName === "myWrapElCnt" && tags[0].tagCtx.props.val === 1 && tags[0].tagCtx.view.getIndex() === 0,
		'In element-only content, view.childTags("myTagName") returns all top-level tags of the given name within the view - in document order');

	// ................................ Act ..................................
	tags = view1.childTags(true, "myWrap2ElCnt");

	// ............................... Assert .................................
	ok(tags.length === 2 && tags[0].tagName === "myWrap2ElCnt" && tags[1].tagName === "myWrap2ElCnt" && tags[0].tagCtx.view.getIndex() === 0,
		'In element-only content, view.childTags(true, "myTagName") returns all tags of the given name within the view - in document order');

	// ................................ Act ..................................
	tags = view1.childTags("myWrap2ElCnt");

	// ............................... Assert .................................
	ok(tags.length === 0, 'In element-only content, view.childTags(true, "myTagName") returns all tags of the given name within the view - in document order');

	// ................................ Act ..................................
	tags = view1.get(true, "myWrapElCnt").childTags(); // Get first myWrap view and look for its top-level child tags

	// ............................... Assert .................................
	ok(tags.length === 2 && tags[0].tagName === "myWrap2ElCnt" && tags[1].tagName === "myWrap2ElCnt" && tags[1].tagCtx.view.getIndex() === 0,
		'tag.childTags() returns top-level bound child tags, and skips any unbound tags');

	// ................................ Act ..................................
	tags = view1.get(true, "myWrapElCnt").childTags(true); // Get first myWrap view and look for descendant tags

	// ............................... Assert .................................
	ok(tags.length === 2 && tags[0].tagName === "myWrap2ElCnt" && tags[1].tagName === "myWrap2ElCnt",
		'tag.childTags() returns descendant tags, and skips any unbound tags');

	// ................................ Act ..................................
	tags = view1.childTags("myWrapElCnt")[0].childTags(); // Get first myWrap tag and look for its top-level child tags

	// ............................... Assert .................................
	ok(tags.length === 2 && tags[0].tagName === "myWrap2ElCnt" && tags[1].tagName === "myWrap2ElCnt" && tags[1].tagCtx.view.getIndex() === 0,
		'tag.childTags() returns top-level bound child tags, and skips any unbound tags');

	// ................................ Act ..................................
	tags = view1.childTags("myWrapElCnt")[0].childTags(true); // Get first myWrap tag and look for descendant tags

	// ............................... Assert .................................
	ok(tags.length === 2 && tags[0].tagName === "myWrap2ElCnt" && tags[1].tagName === "myWrap2ElCnt",
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

//TODO add tests for tag.refresh()

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

//TODO: Add tests for attaching jQuery UI widgets or similar to tag controls, using data-link and {^{myTag}} inline data binding.
});

test('two-way bound tag controls', function() {
	// =============================== Arrange ===============================
	var person = {name: "Jo"},
		cancelChange = false,
		noRenderOnUpdate = true,
		renders = false,
		eventData = "";

	$.views.tags({ twoWayTag: {
		init: function(tagCtx, linkCtx) {
			eventData += "init ";
			if (this._.inline && !tagCtx.content) {
				this.template = tagCtx.tmpl = "<input/>";
			}
		},
		render: function(val) {
			eventData += "render ";
			return renders ? (val + ' <input id="linkedEl"/> rendered') : undefined;
		},
		onBeforeLink: function(tagCtx, linkCtx) {
			eventData += "onBeforeLink ";
			//return false;
		},
		onAfterLink: function(tagCtx, linkCtx) {
			eventData += "onAfterLink ";
			this.value = tagCtx.args[0];
			linkCtx.convert = tagCtx.props.convert;
			linkCtx.convertBack = tagCtx.props.convertBack;

			this.linkedElem = this.linkedElem || (this._.inline ? this.contents("input,div") : $(linkCtx.elem));
		},
		onUpdate: function(ev, eventArgs, tagCtxs) {
			eventData += "onUpdate ";
			return !noRenderOnUpdate;
		},
		onBeforeChange: function(ev, eventArgs) {
			eventData += "onBeforeChange ";
			return !cancelChange;
		},
		onDispose: function() {
			eventData += "onDispose ";
		}
	} });

	// ELEMENT-BASED DATA-LINKED TAGS ON INPUT
	// ................................ Act ..................................
	$.templates('<input id="linkedEl" data-link="{twoWayTag name}"/>')
		.link("#result", person);

	var tag = $("#result").view(true).childTags("twoWayTag")[0],
		linkedEl = $("#linkedEl")[0];

	// ............................... Assert .................................
	equal(eventData, "init render onAfterLink ",
	'Data link using: <input data-link="{twoWayTag name}"/> - event order for init, render, link');
	eventData = "";

	// ................................ Act ..................................
	before = tag.value + linkedEl.value;

	$.observable(person).setProperty({name: "newName"});
	after = tag.value + linkedEl.value;

	// ............................... Assert .................................
	equal(eventData, "onUpdate onAfterLink ",
	'Data link using: <input data-link="{twoWayTag name}"/> - event order for onUpdate (returning false) - render not called');
	eventData = "";

	// ............................... Assert .................................
	equal(before + "|" + after,
	"JoJo|newNamenewName",
	'Data link using: <input data-link="{twoWayTag name}"/> - binds data to linkedElem');

	// ................................ Act ..................................
	noRenderOnUpdate = false;
	before = tag.value + linkedEl.value;

	$.observable(person).setProperty({name: "newName2"});
	after = tag.value + linkedEl.value;

	// ............................... Assert .................................
	equal(eventData, "onUpdate render onAfterLink ",
	'Data link using: <input data-link="{twoWayTag name}"/> - event order for onUpdate (returning true) - render is called');
	eventData = "";

	// ............................... Assert .................................
	equal(before + "|" + after,
	"newNamenewName|newName2newName2",
	'Data link using: <input data-link="{twoWayTag name}"/> - binds data to linkedElem');

	// ................................ Act ..................................
	noRenderOnUpdate = false;
	renders = true;
	before = tag.value + linkedEl.value;

	$.observable(person).setProperty({name: "newName3"});
	after = tag.value + linkedEl.value;

	// ............................... Assert .................................
	equal(eventData, "onUpdate render onAfterLink ",
	'Data link using: <input data-link="{twoWayTag name}"/> - event order for onUpdate (returning true) - render is called');
	eventData = "";

	// ............................... Assert .................................
	equal(before + "|" + after,
	"newName2newName2|newName3newName3",
	'Data link using: <input data-link="{twoWayTag name}"/> - binds data to linkedElem - (replacing any value set during rendering)');

	// ................................ Reset ..................................
	noRenderOnUpdate = true;
	renders = false;

	// ................................ Act ..................................
	before = tag.value + person.name;
	linkedEl.value = "newVal";
	$(linkedEl).change();
	after = tag.value + person.name;

	// ............................... Assert .................................
	equal(eventData, "onBeforeChange onUpdate onAfterLink ",
	'Data link using: <input data-link="{twoWayTag name}"/> - event order for onChange');
	eventData = "";

	// ............................... Assert .................................
	equal(before + "|" + after,
	"newName3newName3|newValnewVal",
	'Data link using: <input data-link="{twoWayTag name}"/> - binds linkedElem back to data');

	// ................................ Act ..................................
	before = tag.value + person.name;
	cancelChange = true;
	linkedEl.value = "2ndNewVal";
	$(linkedEl).change();
	after = tag.value + person.name;

	// ............................... Assert .................................
	equal(eventData, "onBeforeChange ",
	'Data link using: <input data-link="{twoWayTag name}"/> - event order for cancelled onBeforeChange');
	eventData = "";

	// ............................... Assert .................................
	equal(before + "|" + after,
	"newValnewVal|newValnewVal",
	'Data link using: <input data-link="{twoWayTag name}"/> - if onBeforeChange returns false -> no change to data');

	// ................................ Reset ..................................
	cancelChange = false;
	noRenderOnUpdate = true;
	renders = false;

	// ................................ Act ..................................
	person.name = "updatedName";
	linkedEl.value = "updatedVal";
	before = tag.value + linkedEl.value;
	tag.refresh();
	after = tag.value + linkedEl.value;

	// ............................... Assert .................................
	equal(eventData, "render onAfterLink ",
	'Data link using: <input data-link="{twoWayTag name}"/> - event order for tag.refresh');
	eventData = "";

	// ............................... Assert .................................
	equal(before + "|" + after,
	"newValupdatedVal|updatedNameupdatedName",
	'Data link using: <input data-link="{twoWayTag name}"/> - tag.refresh() calls render and onAfterLink - reset to current data, and updates target (input value)');

	// ................................ Act ..................................
	$("#result").empty();

	// ............................... Assert .................................
	equal(eventData, "onDispose ",
	'Data link using: <input data-link="{twoWayTag name}"/> - event order for onDispose');
	eventData = "";

	// ................................ Reset ..................................
	person.name = "Jo";

	// =============================== Arrange ===============================

	// ................................ Act ..................................
	$.templates({
		markup: '<input id="linkedEl" data-link="{twoWayTag name convert=\'myupper\' convertBack=~lower}"/>',
		converters: {
			myupper: function(val) {
				return val.toUpperCase();
			}
		}
	}).link("#result", person, {
		lower: function(val) {
			return val.toLowerCase();
		}
	});

	tag = $("#result").view(true).childTags("twoWayTag")[0];
	linkedEl = $("#linkedEl")[0];

	// ............................... Assert .................................
	equal(linkedEl.value + "|" + tag.value,
	"JO|Jo",
	'Data link using: <input data-link="{twoWayTag name convert=\'myupper\'}"/> - (linkCtx.convert setting) - initial linking: converts the value on the target input');

	// ................................ Act ..................................
	$.observable(person).setProperty({name: "ANewName"});

	// ............................... Assert .................................
	equal(linkedEl.value + "|" + tag.value,
	"ANEWNAME|ANewName",
	'Data link using: <input data-link="{twoWayTag name convert=\'myupper\'}"/> - (linkCtx.convert setting) - on data change: converts the value on the target input');

	// ................................ Act ..................................
	linkedEl.value = "ChangeTheName";
	$(linkedEl).change();

	// ............................... Assert .................................
	equal(person.name + "|" + tag.value,
	"changethename|changethename",
	'Data link using: <input data-link="{twoWayTag name convertBack=~lower}"/> - (linkCtx.convertBack setting) on element change: converts the data, and sets on data');

	// ................................ Reset ..................................
	$("#result").empty();
	person.name = "Jo";
	cancelChange = false;
	noRenderOnUpdate = true;
	renders = false;
	eventData = "";

	// =============================== Arrange ===============================
	//INLINE DATA-LINKED TAGS ON INPUT
	// ................................ Act ..................................
	$.templates('{^{twoWayTag name}}<input id="linkedEl"/>{{/twoWayTag}}')
		.link("#result", person);

	tag = $("#result").view(true).childTags("twoWayTag")[0];
	linkedEl = $("#linkedEl")[0];

	// ............................... Assert .................................
	equal(eventData, "init render onBeforeLink onAfterLink ",
	'Data link using: {^{twoWayTag name}} - event order for init, render, link');
	eventData = "";

	// ................................ Act ..................................
	before = tag.value + linkedEl.value;

	$.observable(person).setProperty({name: "newName"});
	after = tag.value + linkedEl.value;

	// ............................... Assert .................................
	equal(eventData + !!linkedEl.parentNode, "onUpdate onBeforeLink onAfterLink true",
	'Data link using: {^{twoWayTag name}} - event order for onUpdate (returning false) - render not called; linkedElem not replaced');
	eventData = "";

	// ............................... Assert .................................
	equal(before + "|" + after,
	"JoJo|newNamenewName",
	'Data link using: {^{twoWayTag name}} - binds data to linkedElem');

	// ................................ Act ..................................
	noRenderOnUpdate = false;
	before = tag.value + linkedEl.value;

	$.observable(person).setProperty({name: "newName2"});

	// ............................... Assert .................................
	equal(eventData + !!linkedEl.parentNode, "onUpdate render onBeforeLink onAfterLink false",
	'Data link using: {^{twoWayTag name}} - event order for onUpdate (returning true) - render is called; linkedElem is replaced');
	eventData = "";

	linkedEl = $("#linkedEl")[0];
	after = tag.value + linkedEl.value;
	// ............................... Assert .................................
	equal(before + "|" + after,
	"newNamenewName|newName2newName2",
	'Data link using: {^{twoWayTag name}} - binds data to linkedElem');

	// ................................ Act ..................................
	noRenderOnUpdate = false;
	renders = true;
	before = tag.value + linkedEl.value;

	$.observable(person).setProperty({name: "newName3"});
	after = tag.value + linkedEl.value;

	// ............................... Assert .................................
	equal(eventData + !!linkedEl.parentNode, "onUpdate render onBeforeLink onAfterLink false",
	'Data link using: {^{twoWayTag name}} - event order for onUpdate (returning true) - render is called; linkedElem is replaced');
	eventData = "";

	linkedEl = $("#linkedEl")[0];
	after = tag.value + linkedEl.value;

	// ............................... Assert .................................
	equal(before + "|" + after,
	"newName2newName2|newName3newName3",
	'Data link using: {^{twoWayTag name}} - binds data to newly rendered linkedElem');

	// ................................ Reset ..................................
	noRenderOnUpdate = true;
	renders = false;

	// ................................ Act ..................................
	before = tag.value + person.name;
	linkedEl.value = "newVal";
	$(linkedEl).change();
	after = tag.value + person.name;

	// ............................... Assert .................................
	equal(eventData, "onBeforeChange onUpdate onBeforeLink onAfterLink ",
	'Data link using: {^{twoWayTag name}} - event order for onChange');
	eventData = "";

	// ............................... Assert .................................
	equal(before + "|" + after,
	"newName3newName3|newValnewVal",
	'Data link using: {^{twoWayTag name}} - binds linkedElem back to data');

	// ................................ Act ..................................
	before = tag.value + person.name;
	cancelChange = true;
	linkedEl.value = "2ndNewVal";
	$(linkedEl).change();
	after = tag.value + person.name;

	// ............................... Assert .................................
	equal(eventData, "onBeforeChange ",
	'Data link using: {^{twoWayTag name}} - event order for cancelled onBeforeChange');
	eventData = "";

	// ............................... Assert .................................
	equal(before + "|" + after,
	"newValnewVal|newValnewVal",
	'Data link using: {^{twoWayTag name}} - if onBeforeChange returns false -> no change to data');

	// ................................ Reset ..................................
	cancelChange = false;
	noRenderOnUpdate = true;
	renders = false;

	// ................................ Act ..................................
	person.name = "updatedName";
	linkedEl.value = "updatedVal";
	before = tag.value + linkedEl.value;
	tag.refresh();
	linkedEl = $("#linkedEl")[0];
	after = tag.value + linkedEl.value;

	// ............................... Assert .................................
	equal(eventData, "render onBeforeLink onAfterLink ",
	'Data link using: {^{twoWayTag name}} - event order for tag.refresh');
	eventData = "";

	// ............................... Assert .................................
	equal(before + "|" + after,
	"newValupdatedVal|updatedNameupdatedName",
	'Data link using: {^{twoWayTag name}} - tag.refresh() calls render and onAfterLink - reset to current data, and updates target (input value)');

	// ................................ Act ..................................
	$("#result").empty();

	// ............................... Assert .................................
	equal(eventData, "onDispose ",
	'Data link using: {^{twoWayTag name}} - event order for onDispose');
	eventData = "";

	// ................................ Reset ..................................
	person.name = "Jo";

	// =============================== Arrange ===============================
	$.templates({
		markup: '{^{twoWayTag name convert="myupper" convertBack=~lower}}<input id="linkedEl"/>{{/twoWayTag}}',
		converters: {
			myupper: function(val) {
				return val.toUpperCase();
			}
		}
	}).link("#result", person, {
		lower: function(val) {
			return val.toLowerCase();
		}
	});

	tag = $("#result").view(true).childTags("twoWayTag")[0];
	linkedEl = $("#linkedEl")[0];

	// ............................... Assert .................................
	equal(linkedEl.value + "|" + tag.value,
	"JO|Jo",
	'Data link using: {^{twoWayTag name convert=\'myupper\'}} - (linkCtx.convert setting) - initial linking: converts the value on the target input');

	// ................................ Act ..................................
	$.observable(person).setProperty({name: "ANewName"});

	// ............................... Assert .................................
	equal(linkedEl.value + "|" + tag.value,
	"ANEWNAME|ANewName",
	'Data link using: {^{twoWayTag name convert=\'myupper\'}} - (linkCtx.convert setting) - on data change: converts the value on the target input');

	// ................................ Act ..................................
	linkedEl = $("#linkedEl")[0];
	linkedEl.value = "ChangeTheName";
	$(linkedEl).change();

	// ............................... Assert .................................
	equal(person.name + "|" + tag.value,
	"changethename|changethename",
	'Data link using: {^{twoWayTag name convertBack=~lower}} - (linkCtx.convertBack setting) on element change: converts the data, and sets on data');

	// ................................ Reset ..................................
	$("#result").empty();
	person.name = "Jo";
	cancelChange = false;
	noRenderOnUpdate = true;
	renders = false;
	eventData = "";

	// =============================== Arrange ===============================
	//INLINE DATA-LINKED SELF-CLOSED TAG rendering INPUT

	// ................................ Act ..................................
	$.templates('{^{twoWayTag name/}}')
		.link("#result", person);

	tag = $("#result").view(true).childTags("twoWayTag")[0];

	// ............................... Assert .................................
	equal(eventData, "init render onBeforeLink onAfterLink ",
	'Data link using: {^{twoWayTag name/}} - event order for init, render, link');
	eventData = "";

	// ................................ Act ..................................
	linkedEl = tag.linkedElem[0];
	before = tag.value + linkedEl.value;

	$.observable(person).setProperty({name: "newName"});
	after = tag.value + tag.linkedElem[0].value;

	// ............................... Assert .................................
	equal(eventData + !!linkedEl.parentNode, "onUpdate onBeforeLink onAfterLink true",
	'Data link using: {^{twoWayTag name/}} - event order for onUpdate (returning false) - render not called; linkedElem not replaced');
	eventData = "";

	// ............................... Assert .................................
	equal(before + "|" + after,
	"JoJo|newNamenewName",
	'Data link using: {^{twoWayTag name/}} - binds data to linkedElem');

	// ................................ Act ..................................
	noRenderOnUpdate = false;
	linkedEl = tag.linkedElem[0];
	before = tag.value + linkedEl.value;

	$.observable(person).setProperty({name: "newName2"});
	after = tag.value + tag.linkedElem[0].value;

	// ............................... Assert .................................
	equal(eventData + !!linkedEl.parentNode, "onUpdate render onBeforeLink onAfterLink false",
	'Data link using: {^{twoWayTag name/}} - event order for onUpdate (returning true) - render is called; linkedElem is replaced');
	eventData = "";

	// ............................... Assert .................................
	equal(before + "|" + after,
	"newNamenewName|newName2newName2",
	'Data link using: {^{twoWayTag name/}} - binds data to linkedElem');

	// ................................ Act ..................................
	noRenderOnUpdate = false;
	renders = true;
	linkedEl = tag.linkedElem[0];
	before = tag.value + linkedEl.value;

	$.observable(person).setProperty({name: "newName3"});
	after = tag.value + tag.linkedElem[0].value;

	// ............................... Assert .................................
	equal(eventData + !!linkedEl.parentNode, "onUpdate render onBeforeLink onAfterLink false",
	'Data link using: {^{twoWayTag name/}} - event order for onUpdate (returning true) - render is called; linkedElem is replaced');
	eventData = "";

	// ............................... Assert .................................
	equal(before + "|" + after,
	"newName2newName2|newName3newName3",
	'Data link using: {^{twoWayTag name/}} - binds data to newly rendered linkedElem');

	// ................................ Reset ..................................
	noRenderOnUpdate = true;
	renders = false;

	// ................................ Act ..................................
	before = tag.value + person.name;
	tag.linkedElem[0].value = "newVal";
	tag.linkedElem.change();
	after = tag.value + person.name;

	// ............................... Assert .................................
	equal(eventData, "onBeforeChange onUpdate onBeforeLink onAfterLink ",
	'Data link using: {^{twoWayTag name/}} - event order for onChange');
	eventData = "";

	// ............................... Assert .................................
	equal(before + "|" + after,
	"newName3newName3|newValnewVal",
	'Data link using: {^{twoWayTag name/}} - binds linkedElem back to dataonChange');

	// ................................ Act ..................................
	before = tag.value + person.name;
	cancelChange = true;
	tag.linkedElem[0].value = "2ndNewVal";
	tag.linkedElem.change();
	after = tag.value + person.name;

	// ............................... Assert .................................
	equal(eventData, "onBeforeChange ",
	'Data link using: {^{twoWayTag name/}} - event order for cancelled onBeforeChange');
	eventData = "";

	// ............................... Assert .................................
	equal(before + "|" + after,
	"newValnewVal|newValnewVal",
	'Data link using: {^{twoWayTag name/}} - if onBeforeChange returns false -> no change to data');

	// ................................ Reset ..................................
	cancelChange = false;
	noRenderOnUpdate = true;
	renders = false;

	// ................................ Act ..................................
	person.name = "updatedName";
	tag.linkedElem[0].value = "updatedVal";
	before = tag.value + tag.linkedElem[0].value;
	tag.refresh();
	after = tag.value + tag.linkedElem[0].value;

	// ............................... Assert .................................
	equal(eventData, "render onBeforeLink onAfterLink ",
	'Data link using: {^{twoWayTag name/}} - event order for tag.refresh');
	eventData = "";

	// ............................... Assert .................................
	equal(before + "|" + after,
	"newValupdatedVal|updatedNameupdatedName",
	'Data link using: {^{twoWayTag name/}} - tag.refresh() calls render and onAfterLink - reset to current data, and updates target (input value)');

	// ................................ Act ..................................
	$("#result").empty();

	// ............................... Assert .................................
	equal(eventData, "onDispose ",
	'Data link using: {^{twoWayTag name/}} - event order for onDispose');
	eventData = "";

	// ................................ Reset ..................................
	person.name = "Jo";

	// =============================== Arrange ===============================
	$.templates({
		markup: '{^{twoWayTag name convert="myupper" convertBack=~lower/}}',
		converters: {
			myupper: function(val) {
				return val.toUpperCase();
			}
		}
	}).link("#result", person, {
		lower: function(val) {
			return val.toLowerCase();
		}
	});

	tag = $("#result").view(true).childTags("twoWayTag")[0];

	// ............................... Assert .................................
	equal(tag.linkedElem[0].value + "|" + tag.value,
	"JO|Jo",
	'Data link using: {^{twoWayTag name convert="myupper"/}} - (linkCtx.convert setting) - initial linking: converts the value on the target input');

	// ................................ Act ..................................
	$.observable(person).setProperty({name: "ANewName"});

	// ............................... Assert .................................
	equal(tag.linkedElem[0].value + "|" + tag.value,
	"ANEWNAME|ANewName",
	'Data link using: {^{twoWayTag name convert="myupper"/}} - (linkCtx.convert setting) - on data change: converts the value on the target input');

	// ................................ Act ..................................
	tag.linkedElem[0].value = "ChangeTheName";
	tag.linkedElem.change();

	// ............................... Assert .................................
	equal(person.name + "|" + tag.value,
	"changethename|changethename",
	'Data link using: {^{twoWayTag name convertBack=~lower/}} - (linkCtx.convertBack setting) on element change: converts the data, and sets on data');
});

test('linkTo for {:source linkTo=target:} or {twoWayBoundTag source linkTo=target}', function() {
	// =============================== Arrange ===============================
	var before, after, person = {name: "Jo", name2: "Jo2"},
		cancelChange = false,
		eventData = "";

	$.views.tags({ twoWayTag: {
		init: function(tagCtx, linkCtx) {
			eventData += "init ";
			if (this._.inline && !tagCtx.content) {
				this.template = tagCtx.tmpl = "<input/>";
			}
		},
		render: function(val) {
			eventData += "render ";
		},
		onBeforeLink: function(tagCtx, linkCtx) {
			eventData += "onBeforeLink ";
		},
		onAfterLink: function(tagCtx, linkCtx) {
			eventData += "onAfterLink ";
			this.value = tagCtx.args[0];
			linkCtx.convert = tagCtx.props.convert;
			linkCtx.convertBack = tagCtx.props.convertBack;

			this.linkedElem = this.linkedElem || (this._.inline ? this.contents("input,div") : $(linkCtx.elem));
		},
		onUpdate: function(ev, eventArgs, tagCtxs) {
			eventData += "onUpdate ";
			return false;
		},
		onBeforeChange: function(ev, eventArgs) {
			eventData += "onBeforeChange ";
			if (!cancelChange) {
				this.value = eventArgs.value;
			}
			return !cancelChange;
		},
		onDispose: function() {
			eventData += "onDispose ";
		}
	} });

	// ELEMENT-BASED DATA-LINKED TAGS ON INPUT - WITH linkTo EXPRESSION
	$.templates('<input id="linkedEl" data-link="{:name linkTo=name2:}"/>')
		.link("#result", person);

	var linkedEl = $("#linkedEl")[0];

	// ................................ Act ..................................
	before = linkedEl.value;

	$.observable(person).setProperty({name: "newName"});
	after = linkedEl.value;

	// ............................... Assert .................................
	equal(before + "|" + after,
	"Jo|newName",
	'Data link using: <input data-link="{:name linkTo=name2:}"/> - binds data to linkedElem');

	// ................................ Act ..................................
	before = "name:" + person.name + " name2:" + person.name2;
	linkedEl.value = "newVal";
	$(linkedEl).change();
	after = "name:" + person.name + " name2:" + person.name2;

	// ............................... Assert .................................
	equal(before + "|" + after,
	"name:newName name2:Jo2|name:newName name2:newVal",
	'Data link using: <input data-link="{:name linkTo=name2:}"/> - binds linkedElem back to "linkTo" target data - using return value of onChange');

	// ................................ Act ..................................
	before = "name:" + person.name + " name2:" + person.name2;
	cancelChange = true;
	linkedEl.value = "2ndNewVal";
	$(linkedEl).change();
	after = "name:" + person.name + " name2:" + person.name2;

	person.name = "Jo";

	// =============================== Arrange ===============================

	// ................................ Act ..................................
	$.templates({
		markup: '<input id="linkedEl" data-link="{myupper:name linkTo=name2:mylower}"/>',
		converters: {
			myupper: function(val) {
				return val.toUpperCase();
			},
			mylower: function(val) {
				return val.toLowerCase();
			}
		}
	}).link("#result", person);

	linkedEl = $("#linkedEl")[0];

	// ............................... Assert .................................
	equal(linkedEl.value, "JO",
	'Data link using: <input data-link="{myupper:name linkTo=name2:mylower} - (linkCtx.convert setting) - initial linking: converts the value on the target input');

	// ................................ Act ..................................
	$.observable(person).setProperty({name: "ANewName"});

	// ............................... Assert .................................
	equal(linkedEl.value,
	"ANEWNAME",
	'Data link using: <input data-link="{myupper:name linkTo=name2:mylower}"/> - (linkCtx.convert setting) - on data change: converts the value on the target input');

	// ................................ Act ..................................
	linkedEl.value = "ChangeTheName";
	$(linkedEl).change();

	// ............................... Assert .................................
	equal("name:" + person.name + " name2:" + person.name2,
	"name:ANewName name2:changethename",
	'Data link using: <input data-link="{myupper:name linkTo=name2:mylower}/> - (linkCtx.convertBack setting) on element change: converts the data, and sets on "linkTo" target data');

	// ................................ Reset ..................................
	$("#result").empty();
	person.name = "Jo";
	person.name2 = "Jo2";
	cancelChange = false;
	eventData = "";

	// ELEMENT-BASED DATA-LINKED TAGS ON INPUT - WITH linkTo EXPRESSION
	// ................................ Act ..................................
	$.templates('<input id="linkedEl" data-link="{twoWayTag name linkTo=name2}"/>')
		.link("#result", person);

	var tag = $("#result").view(true).childTags("twoWayTag")[0],
		linkedEl = $("#linkedEl")[0];

	// ............................... Assert .................................
	equal(eventData, "init render onAfterLink ",
	'Data link using: <input data-link="{twoWayTag name linkTo=name2}"/> - event order for init, render, link');
	eventData = "";

	// ................................ Act ..................................
	before = tag.value + linkedEl.value;

	$.observable(person).setProperty({name: "newName"});
	after = tag.value + linkedEl.value;

	// ............................... Assert .................................
	equal(eventData, "onUpdate onAfterLink ",
	'Data link using: <input data-link="{twoWayTag name linkTo=name2}"/> - event order for onUpdate');
	eventData = "";

	// ............................... Assert .................................
	equal(before + "|" + after,
	"JoJo|newNamenewName",
	'Data link using: <input data-link="{twoWayTag name linkTo=name2}"/> - binds data to linkedElem');

	// ................................ Act ..................................
	before = "value:" + tag.value + " name:" + person.name + " name2:" + person.name2;
	linkedEl.value = "newVal";
	$(linkedEl).change();
	after = "value:" + tag.value + " name:" + person.name + " name2:" + person.name2;

	// ............................... Assert .................................
	equal(eventData, "onBeforeChange ",
	'Data link using: <input data-link="{twoWayTag name linkTo=name2}"/> - event order for onChange');
	eventData = "";

	// ............................... Assert .................................
	equal(before + "|" + after,
	"value:newName name:newName name2:Jo2|value:newVal name:newName name2:newVal",
	'Data link using: <input data-link="{twoWayTag name linkTo=name2}"/> - binds linkedElem back to "linkTo" target dataonChange');

	// ................................ Act ..................................
	before = "value:" + tag.value + " name:" + person.name + " name2:" + person.name2;
	cancelChange = true;
	linkedEl.value = "2ndNewVal";
	$(linkedEl).change();
	after = "value:" + tag.value + " name:" + person.name + " name2:" + person.name2;

	// ............................... Assert .................................
	equal(eventData, "onBeforeChange ",
	'Data link using: <input data-link="{twoWayTag name linkTo=name2}"/> - event order for cancelled onBeforeChange');
	eventData = "";

	// ............................... Assert .................................
	equal(before + "|" + after,
	"value:newVal name:newName name2:newVal|value:newVal name:newName name2:newVal",
	'Data link using: <input data-link="{twoWayTag name linkTo=name2}"/> - if onBeforeChange returns false -> no change to data');

	// ................................ Reset ..................................
	cancelChange = false;
	person.name = "Jo";

	// =============================== Arrange ===============================

	// ................................ Act ..................................
	$.templates({
		markup: '<input id="linkedEl" data-link="{twoWayTag name linkTo=name2 convert=\'myupper\' convertBack=~lower}"/>',
		converters: {
			myupper: function(val) {
				return val.toUpperCase();
			}
		}
	}).link("#result", person, {
		lower: function(val) {
			return val.toLowerCase();
		}
	});

	tag = $("#result").view(true).childTags("twoWayTag")[0];
	linkedEl = $("#linkedEl")[0];

	// ............................... Assert .................................
	equal(linkedEl.value + "|" + tag.value,
	"JO|Jo",
	'Data link using: <input data-link="{twoWayTag name linkTo=name2 convert=\'myupper\'}"/> - (linkCtx.convert setting) - initial linking: converts the value on the target input');

	// ................................ Act ..................................
	$.observable(person).setProperty({name: "ANewName"});

	// ............................... Assert .................................
	equal(linkedEl.value + "|" + tag.value,
	"ANEWNAME|ANewName",
	'Data link using: <input data-link="{twoWayTag name linkTo=name2 convert=\'myupper\'}"/> - (linkCtx.convert setting) - on data change: converts the value on the target input');

	// ................................ Act ..................................
	linkedEl.value = "ChangeTheName";
	$(linkedEl).change();

	// ............................... Assert .................................
	equal("name:" + person.name + " name2:" + person.name2 + " value:" + tag.value,
	"name:ANewName name2:changethename value:changethename",
	'Data link using: <input data-link="{twoWayTag name linkTo=name2 convertBack=~lower}"/> - (linkCtx.convertBack setting) on element change: converts the data, and sets on "linkTo" target data');

	// ................................ Reset ..................................
	$("#result").empty();
	person.name = "Jo";
	person.name2 = "Jo2";
	cancelChange = false;
	eventData = "";

	// =============================== Arrange ===============================
	//INLINE DATA-LINKED TAGS ON INPUT - WITH linkTo EXPRESSION
	// ................................ Act ..................................
	$.templates('{^{twoWayTag name linkTo=name2}}<input id="linkedEl"/>{{/twoWayTag}}')
		.link("#result", person);

	tag = $("#result").view(true).childTags("twoWayTag")[0];
	linkedEl = $("#linkedEl")[0];

	// ............................... Assert .................................
	equal(eventData, "init render onBeforeLink onAfterLink ",
	'Data link using: {^{twoWayTag name linkTo=name2}} - event order for init, render, link');
	eventData = "";

	// ................................ Act ..................................
	before = tag.value + linkedEl.value;

	$.observable(person).setProperty({name: "newName"});
	after = tag.value + linkedEl.value;

	// ............................... Assert .................................
	equal(eventData, "onUpdate onBeforeLink onAfterLink ",
	'Data link using: {^{twoWayTag name linkTo=name2}} - event order for onUpdate');
	eventData = "";

	// ............................... Assert .................................
	equal(before + "|" + after,
	"JoJo|newNamenewName",
	'Data link using: {^{twoWayTag name linkTo=name2}} - binds data to linkedElem');

	// ................................ Act ..................................
	before = "value:" + tag.value + " name:" + person.name + " name2:" + person.name2;
	linkedEl.value = "newVal";
	$(linkedEl).change();
	after = "value:" + tag.value + " name:" + person.name + " name2:" + person.name2;

	// ............................... Assert .................................
	equal(eventData, "onBeforeChange ",
	'Data link using: {^{twoWayTag name linkTo=name2}} - event order for onChange');
	eventData = "";

	// ............................... Assert .................................
	equal(before + "|" + after,
	"value:newName name:newName name2:Jo2|value:newVal name:newName name2:newVal",
	'Data link using: {^{twoWayTag name linkTo=name2}} - binds linkedElem back to "linkTo" target data');

	// ................................ Act ..................................
	before = "value:" + tag.value + " name:" + person.name + " name2:" + person.name2;
	cancelChange = true;
	linkedEl.value = "2ndNewVal";
	$(linkedEl).change();
	after = "value:" + tag.value + " name:" + person.name + " name2:" + person.name2;

	// ............................... Assert .................................
	equal(eventData, "onBeforeChange ",
	'Data link using: {^{twoWayTag name linkTo=name2}} - event order for cancelled onBeforeChange');
	eventData = "";

	// ............................... Assert .................................
	equal(before + "|" + after,
	"value:newVal name:newName name2:newVal|value:newVal name:newName name2:newVal",
	'Data link using: {^{twoWayTag name linkTo=name2}} - if onBeforeChange returns false -> no change to data');

	// ................................ Reset ..................................
	cancelChange = false;
	person.name = "Jo";
	person.name2 = "Jo2";

	// =============================== Arrange ===============================
	$.templates({
		markup: '{^{twoWayTag name linkTo=name2 convert="myupper" convertBack=~lower}}<input id="linkedEl"/>{{/twoWayTag}}',
		converters: {
			myupper: function(val) {
				return val.toUpperCase();
			}
		}
	}).link("#result", person, {
		lower: function(val) {
			return val.toLowerCase();
		}
	});

	tag = $("#result").view(true).childTags("twoWayTag")[0];
	linkedEl = $("#linkedEl")[0];

	// ............................... Assert .................................
	equal(linkedEl.value + "|" + tag.value,
	"JO|Jo",
	'Data link using: {^{twoWayTag name linkTo=name2 convert="myupper"}} - (linkCtx.convert setting) - initial linking: converts the value on the target input');

	// ................................ Act ..................................
	$.observable(person).setProperty({name: "ANewName"});

	// ............................... Assert .................................
	equal(linkedEl.value + "|" + tag.value,
	"ANEWNAME|ANewName",
	'Data link using: {^{twoWayTag name linkTo=name2 convert="myupper"} - (linkCtx.convert setting) - on data change: converts the value on the target input');

	// ................................ Act ..................................
	linkedEl = $("#linkedEl")[0];
	linkedEl.value = "ChangeTheName";
	$(linkedEl).change();

	// ............................... Assert .................................
	equal("name:" + person.name + " name2:" + person.name2 + " value:" + tag.value,
	"name:ANewName name2:changethename value:changethename",
	'Data link using: {^{twoWayTag name linkTo=name2 convertBack=~lower}} - (linkCtx.convertBack setting) on element change: converts the data, and sets on "linkTo" target data');
});

test("tag control events", function() {

	// =============================== Arrange ===============================
	var eventData = "";
	model.things = [{thing: "box"}]; // reset Prop

	// ................................ Act ..................................
	$.templates({
		markup: '<div>{^{myWidget person1.lastName things/}}</div>',
		tags: {
			myWidget: {
				init: function(tagCtx, linkCtx) {
					eventData += " init";
				},
				render: function(name, things) {
					eventData += " render";
					return "<span>" + name + "</span> <span>" + things.length + "</span> <span>" + this.getType() + "</span>";
				},
				onUpdate: function(ev, eventArgs, tagCtxs) {
					eventData += " update";
				},
				onBeforeLink: function() {
					eventData += " before";
				},
				onAfterLink: function() {
					eventData += " after";
				},
				onArrayChange: function(ev, eventArgs) {
					eventData += " onArrayChange";
				},
				onDispose: function() {
					eventData += " dispose";
				},
				getType: function() {
					eventData += " getType";
					return this.type;
				},
				type: "special"
			}
		}
	}).link("#result", model);

	// ............................... Assert .................................
	equals($("#result").text() + "|" + eventData, "One 1 special| init render getType before after", '{^{myWidget/}} - Events fire in order during rendering: render, onBeforeLink and onAfterLink');

	// ................................ Act ..................................
	$.observable(person1).setProperty("lastName", "Two");

	// ............................... Assert .................................
	equals($("#result").text() + "|" + eventData, "Two 1 special| init render getType before after update render getType before after", '{^{myWidget/}} - Events fire in order during update: update, render, onBeforeLink and onAfterLink');

	// ................................ Act ..................................
	$.observable(model.things).insert(0, {thing: "tree"});

	// ............................... Assert .................................
	equals($("#result").text() + "|" + eventData, "Two 1 special| init render getType before after update render getType before after onArrayChange", '{^{myWidget/}} - Events fire in order during update: update, render, onBeforeLink and onAfterLink');

	// ................................ Act ..................................
	$("#result").empty();

	// ............................... Assert .................................
	equals($("#result").text() + "|" + eventData, "| init render getType before after update render getType before after onArrayChange dispose", '{^{myWidget/}} - onDispose fires when container element is emptied or removed');

	// ................................ Reset ................................
	person1.lastName = "One";
	model.things = [];
	eventData = "";

	// =============================== Arrange ===============================

	// ................................ Act ..................................
	$.templates({
		markup: '<div>{^{myNoRenderWidget/}}</div>',
		tags: {
			myNoRenderWidget: {
				init: function(tagCtx, linkCtx) {
					eventData += " init";
				},
				onBeforeLink: function() {
					eventData += " before";
				},
				onAfterLink: function() {
					eventData += " after";
				}
			}
		}
	}).link("#result", person1);

	// ............................... Assert .................................
	equals($("#result").text() + "|" + eventData, "| init before after", '{^{myNoRenderWidget/}} - A data-linked tag control which does not render fires init, onBeforeLink and onAfterLink');

//TODO: Add tests for attaching jQuery UI widgets or similar to tag controls, using data-link and {^{myTag}} inline data binding.
});

})();
})(this, this.jQuery);
