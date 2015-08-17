/*global test, equal, module, ok, _jsv, viewsAndBindings*/
(function(global, $, undefined) {
"use strict";
/* Setup */
var isIE8 = window.attachEvent && !window.addEventListener;

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

// =============== RESOURCES ===============

var cancelChange = false,
	noRenderOnUpdate = true,
	renders = false,
	eventData = "";

$.views
	.converters({
		upper_: updown,
		cvtBack: function(val) {
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
				return "Name: " + this.tagCtx.view.data.firstName() + ". Width: " + this.ctx.settings.width + ". Value: " + val
					+ ". Prop theTitle: " + this.tagCtx.props.theTitle + ". Prop ~street: " + this.ctx.street;
			},
			depends: ["firstName", "~settings.width"]
		},
		tmplTagWithProps: {
			render: function(val) {
				this.ctx.theTitle = this.tagCtx.props.theTitle;
			},
			template: "Name: {{:firstName()}}. Width: {{:~settings.width}}. Value: {{:~settings.reverse}}. "
				+ "Prop theTitle: {{:~theTitle}}. Prop ~street: {{:~street}}",
			depends: ["firstName", "~settings.width"]
		},
		twoWayTag: {
			init: function(tagCtx, linkCtx) {
				eventData += "init ";
				if (this._.inline && !tagCtx.content) {
					this.template = "<input/>";
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
		}
	});

var topData = { people: people };
$.views.tags({
	myWrap: {
		init: function(tc) {
			var test = tc.props.val;
		}
	},
	myWrap2: {},
	mySimpleWrap: function(val) {
		return this.tagCtx.render(val);
	},
	myFlow: {
		flow: true
	},
	myWrapElCnt: {
		attr: "html",
		render: function(val) {
			return "<tbody data-wrapelct='" + this.tagCtx.view.getIndex() + "'>" + this.tagCtx.render(val) + "</tbody>";
		},
		onAfterLink: function() {
			//debugger;
		}
	},
	myWrap2ElCnt: {
		attr: "html",
		render: function(val) {
			return "<td>" + this.tagCtx.render(val) + "</td>";
		},
		onAfterLink: function() {
			//debugger;
		}
	},
	myFlowElCnt: {
		attr: "html",
		flow: true,
		render: function(val) {
			return "<td>" + this.tagCtx.render(val) + "</td>";
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
			+ '<div id="b{{:#index+1}}">'
				+ '{^{mySimpleWrap val=5}}'
					+ '{^{mySimpleWrap val=6}}'
						+ '{^{myWrap2 val=7/}}'
					+ '{{/mySimpleWrap}}'
				+ '{{/mySimpleWrap}}'
			+ '<span>'
				+ '{^{myWrap2 val=8/}}'
			+ '</span></div>'
			+ 'www<span id="b{{:#index+1}}"></span>'
		+ '{{/for}}',

	boundTmplHierarchyElCnt:

		'<table>{{for people ~val=1}}'
			+ '{{if true ~index=#index}}'
				+ '{^{myWrapElCnt val=1}}'
					+ '<tr id="tr{{:~index+1}}">'
						+ '{^{myWrap2ElCnt val=11}}'
							+ 'xx<span id="sp{{:#getIndex()+1}}"></span>'
							+ '{^{myFlow val=3}}xyz{{/myFlow}}{^{mySimpleWrap val=5/}}'
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
			+ '<tbody id="b{{:#index+1}}">'
				+ '{^{mySimpleWrap val=5}}'
					+ '{^{mySimpleWrap val=6}}'
						+ '{^{myWrap2 val=7/}}'
					+ '{{/mySimpleWrap}}'
				+ '{{/mySimpleWrap}}'
			+ '<tr></tr><tr>'
				+ '{^{myWrap2ElCnt val=8/}}'
			+ '</tr></tbody>'
		+ '{{/for}}</table>',

	boundTmplHierarchyElCntWithDataLink: '<table data-link="{myWrapElCnt val=1 tmpl=\'wrapCnt\'} class{:lastName}"></table>',

	wrapCnt: '<tr id="tr{{:~index+1}}" data-link="{myWrap2ElCnt val=2 tmpl=\'innerWrap\'}"></tr>',

	innerWrap: 'xx<span id="sp{{:#getIndex()+1}}"></span>'
});

// =============== INIT APP ===============

var viewContent, before, after, lastEvData, lastEventArgs, listeners, result1, handlersCount, elems,
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
	return result;
}

// End Setup

//test("TEST", function() {
//});
//return;
module("Template structure");

test("Template validation", function() {

	$.views.settings.debugMode(); // For using _jsv

	// =============================== Arrange ===============================
	try {
		$.templates('<svg height="210" width="400"><path data-link="d{:path}" /></svg>'
			+ '<math><mi>x</mi><mspace data-link="width{:width}"/><mi>y</mi></math>'
			+ '<div><span><svg><path d="M150 0 L75 200 L225 200 Z" /></svg><math><mi>x</mi><mspace width="3em"/><mi>y</mi></math></span>{{:thing}}</div>')
		.link("#result", { width: "3em", path: "M250 0 L75 200 L225 200 Z", thing: "egg" });
		result = $("#result").text();
	} catch (e) {
		result = e.message;
	}

	// ............................... Assert .................................
	equal(result, "xyxyegg", "Validation - self-closing tags are allowed within svg or math content (foreign elements)");
	result = "";

	// =============================== Arrange ===============================
	try {
		$.templates('<table>{{for things}}<tr><td>}{{:thing}}</td></tr>{{/for}}</table>')
		.link("#result", { things: [{ thing: "Orig" }] });
	} catch (e) {
		result = e.message;
	}

	// ............................... Assert .................................
	equal(result.indexOf("Parent of <tr> must be <tbody>"), 0, "Validation - missing closing tag");
	result = "";

	// =============================== Arrange ===============================
	try {
		$.templates('<div>{{:thing}}<span></div>')
		.link("#result", { thing: "Orig" });
	} catch (e) {
		result = e.message;
	}

	// ............................... Assert .................................
	equal(result.indexOf("Syntax error\nMismatch: '</div>'"), 0, "Validation - missing closing tag");
	result = "";

	// =============================== Arrange ===============================
	try {
		$.templates('<div>{{:Thing}}</span></div>')
		.link("#result", { thing: "Orig" });
	} catch (e) {
		result = e.message;
	}

	// ............................... Assert .................................
	equal(result.indexOf("Syntax error\nMismatch: '</span>'"), 0, "Validation - missing opening tag");
	result = "";

	// =============================== Arrange ===============================
	try {
		$.templates('<span>{{:Thing}}</span></span>')
		.link("#result", { thing: "Orig" });
	} catch (e) {
		result = e.message;
	}

	// ............................... Assert .................................
	equal(result.indexOf("Syntax error\nMismatch: '</span>'"), 0, "Validation - extra closing tag");
	result = "";

	// =============================== Arrange ===============================
	try {
		$.templates('<span>{{:Thing}}</span></div>')
		.link("#result", { thing: "Orig" });
	} catch (e) {
		result = e.message;
	}

	// ............................... Assert .................................
	equal(result.indexOf("Syntax error\nMismatch: '</div>'"), 0, "Validation - extra closing tag");
	result = "";

	// =============================== Arrange ===============================
	try {
		$.templates('<div>{{:Thing}}<span/></div>')
		.link("#result", { thing: "Orig" });
	} catch (e) {
		result = e.message;
	}

	// ............................... Assert .................................
	equal(result.indexOf("Syntax error\n'<span.../>'"), 0, "Validation - self-closing tag is not a void element");
	result = "";

	// =============================== Arrange ===============================
	try {
		$.templates('<div>{{:Thing}}')
		.link("#result", { thing: "Orig" });
	} catch (e) {
		result = e.message;
	}

	// ............................... Assert .................................
	equal(result.indexOf("Syntax error\nMismatched '<div...>'"), 0, "Validation - missing closing tag");
	result = "";

	// =============================== Arrange ===============================
	try {
		$.templates('</div>{{:Thing}}')
		.link("#result", { thing: "Orig" });
	} catch (e) {
		result = e.message;
	}

	// ............................... Assert .................................
	equal(result.indexOf("Syntax error\nMismatch: '</div>'"), 0, "Validation - missing opening tag");
	result = "";

	// =============================== Arrange ===============================
	try {
		$.templates('<div/>')
		.link("#result", { thing: "Orig" });
	} catch (e) {
		result = e.message;
	}

	// ............................... Assert .................................
	equal(result.indexOf("Syntax error\n'<div.../>'"), 0, "Validation - self-closing tag is not a void element");
	result = "";

	// =============================== Arrange ===============================
	try {
		$.templates('<div>{{:Thing}}<input></input></div>')
		.link("#result", { thing: "Orig" });
	} catch (e) {
		result = e.message;
	}

	// ............................... Assert .................................
	equal(result.indexOf("Syntax error\n'</input>'"), 0, "Validation - closing tag for a void element");
	result = "";

	// =============================== Arrange ===============================
	$.templates('prop: <input id="last" data-link="lastName"/><br><div><br/>'
		+ '{{if true}}<input id="{{:\'last\'}}" data-link="lastName">{{/if}}<img/></div><img>')
		.link("#result", person1);
	// ................................ Act ..................................
	result = $("#result input")[0].value + $("#result input")[1].value;

	$.observable(person1).setProperty("lastName", "Two");
	result += $("#result input")[0].value + $("#result input")[1].value;

	// ............................... Assert .................................
	equal(result, "OneOneTwoTwo", "Validation - void elements can have self-close slashes, or not...");
	result = "";

	// =============================== Arrange ===============================
	var markupData = {markup: "<img/><img>"}
	$.templates('{^{:markup}}')
		.link("#result", markupData);

	// ................................ Act ..................................
	result = "" + ($("#result").html().indexOf("<img><img>")>60);

	$.observable(markupData).setProperty("markup", "<br/><br>");
	result += "|" + ($("#result").html().indexOf("<br><br>")>60);

	// ............................... Assert .................................
	equal(result, "true|true", "Validation - void elements inserted from data can have self-close slashes, or not...");
	result = "";

	// =============================== Arrange ===============================
	$.templates('<input {{if true}}id="last"{{/if}} {{if false}}id="first"{{/if}} data-link="lastName"/>')
		.link("#result", { lastName: "Blow" });
	
	// ............................... Assert .................................
	equal($("#result #last").val(), "Blow",
		"{{if}} is supported within <input/> markup even when data-linking");
	result = "";

	// =============================== Arrange ===============================
	$.templates('<input data-link="lastName" {{if true}}id="last"/> {{else}}/>{{/if}}')
		.link("#result", { lastName: "Blow" });

	// ............................... Assert .................................
	equal($("#result #last").val(), "Blow",
		"{{if}} wrapping closing delimiter of <input/> markup is supported even when data-linking");
	result = "";

	// =============================== Arrange ===============================
	try {
		$.templates('<input {^{if true}}id="last"{{/if}} data-link="lastName">')
		.link("#result", { lastName: "Blow" });
	} catch (e) {
		result = e.message;
	}

	// ............................... Assert .................................
	equal(result, "Syntax error\n{^{ within elem markup (<input ). Use data-link=\"...\"",
		"Validation - {^{if}} within <input  markup");
	result = "";

	// =============================== Arrange ===============================
	try {
		$.templates('<input data-link="lastName" {^{if true}}id="last"/> {{else}}/>{{/if}}')
		.link("#result", { lastName: "Blow" });
	} catch (e) {
		result = e.message;
	}

	// ............................... Assert .................................
	equal(result, "Syntax error\n{^{ within elem markup (<input ). Use data-link=\"...\"",
		"Validation - {^{if}} wrapping closing delimiter of <input/> markup");

	// =============================== Arrange ===============================
	try {
		$.templates('<span {^{if true}}id="last"{{/if}}>a</span>')
		.link("#result", { thing: "Orig" });
	} catch (e) {
		result = e.message;
	}

	// ............................... Assert .................................
	equal(result, "Syntax error\n{^{ within elem markup (<span ). Use data-link=\"...\"",
		"Validation - {^{if}} within <span> markup");
	result = "";

	// =============================== Arrange ===============================
	try {
		$.templates('<div {^{:true}}>a</div>')
		.link("#result", { thing: "Orig" });
	} catch (e) {
		result = e.message;
	}

	// ............................... Assert .................................
	equal(result, "Syntax error\n{^{ within elem markup (<div ). Use data-link=\"...\"",
		"Validation - {^{:...}} within element markup");
	result = "";

	// ................................ Reset ................................

	person1.lastName = "One";
	// The syntax error exceptions thrown above meant some views were not fully linked.
	// We will 'force remove' them from the viewStore, the top view children, and the bindingStore.
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
	viewstore = _jsv.bindings;
	for (v in viewstore) {
		delete viewstore[v];
	}

	$.views.settings.debugMode(false);
});

module("data-link scenarios");

test("jQuery cleanData integration", function() {

	// ................................ Reset ................................
	person1.lastName = "One"; // reset Prop

	// =============================== Arrange ===============================
	$("#result").html('<span id="inner"></span>');
	$.link("lastName", "#inner", person1);
	$("#inner").on("click", function() { });

	// ................................ Act ..................................
	result = $("#inner").html();
	$.observable(person1).setProperty("lastName", "last2");
	result += "|" + $("#inner").html();
	$("#inner").off("click");
	$.observable(person1).setProperty("lastName", "last3");
	result += "|" + $("#inner").html();

	// ............................... Assert .................................
	equal(result,
	'One|last2|last3',
	'Removing jQuery handlers does not remove views. (Issue https://github.com/BorisMoore/jsviews/issues/249)');

	// ................................ Reset ................................
	person1.lastName = "One"; // reset Prop
	$("#result").empty();

	// =============================== Arrange ===============================
	$("#result").html('<span id="inner"></span>');
	$.link("lastName", "#inner", person1);

	// ................................ Act ..................................
	result = $("#inner").html();
	$.observable(person1).setProperty("lastName", "last2");
	result += "|" + $("#inner").html();
	$("#inner").data('foo', 'bar').removeData('foo');
	$.observable(person1).setProperty("lastName", "last3");
	result += "|" + $("#inner").html();

	// ............................... Assert .................................
	equal(result,
	'One|last2|last3',
	'Adding and removing jQuery data does not remove views. (Issue https://github.com/BorisMoore/jsviews/issues/249)');

	// ................................ Reset ................................
	person1.lastName = "One"; // reset Prop
	$("#result").empty();

	// =============================== Arrange ===============================
	$("#result").html('<span id="inner"></span>');
	$.link("lastName", "#inner", person1);

	// ................................ Act ..................................
	result = $("#inner").html();
	$.observable(person1).setProperty("lastName", "last2");
	result += "|" + $("#inner").html();
	$("#inner").dequeue("foo", null);
	$.observable(person1).setProperty("lastName", "last3");
	result += "|" + $("#inner").html();

	// ............................... Assert .................................
	equal(result,
	'One|last2|last3',
	'Calling dequeue does not remove views. (Issue https://github.com/BorisMoore/jsviews/issues/249)');

	// ................................ Reset ................................
	person1.lastName = "One"; // reset Prop
	$.unlink();
});

module("API - data-link");

test("Basic $.link(expression, container, data) and $.link(tmpl, container, data)", function() {

	// ................................ Reset ................................
	person1.lastName = "One"; // reset Prop
	home1.address = address1; // reset Prop
	$.views.settings.debugMode(); // For using viewsAndBindings()

	// =============================== Arrange ===============================
	$("#result").html('<span id="inner"></span>');
	$.link("lastName 44 a=3", "#inner", person1);

	// ................................ Act ..................................
	before = $("#inner").html();
	$.observable(person1).setProperty("lastName", "newLast");
	after = $("#inner").html();

	// ............................... Assert .................................
	equal(before + "|" + after,
	'One|newLast',
	'$.link("fieldName", "#target", data) links field to content of target element (equivalent to data-link="fieldName")');

	// =============================== Arrange ===============================

	// ................................ Act ..................................
	$("#result").empty();

	// ............................... Assert .................................

	ok(!viewsAndBindings() && !$._data(person1).events,
	"$(container).empty removes current listeners from that content");

	// ................................ Reset ................................
	person1.lastName = "One"; // reset Prop

	// =============================== Arrange ===============================

	$("#result").html('<span id="inner"></span>');
	$.link("person1.lastName + ' ' + person1.home.address^street", "#inner", model);

	// ................................ Act ..................................
	before = $("#inner").html();
	$.observable(person1).setProperty("lastName", "newLast");
	$.observable(person1.home).setProperty("address", address2); // Using deep observability
	after = $("#inner").html();

	// ............................... Assert .................................
	equal(before + "|" + after,
	'One StreetOne|newLast StreetTwo',
	'$.link(expression, "#target", data) links expression to target element (equivalent to data-link="expression")');

	// =============================== Arrange ===============================

	// ................................ Act ..................................
	$("#result").empty();

	// ............................... Assert .................................

	ok(!viewsAndBindings() && !$._data(person1).events && !$._data(person1.home).events,
	"$(container).empty removes current listeners from that content");

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

	// ................................ Reset ................................
	$("#result").empty();
	person1.lastName = "One"; // reset Prop

	// =============================== Arrange ===============================

	tmpl = $.templates("{^{for #data}}{^{:lastName}}{{/for}}");
	$.link(tmpl, "#result", person1);

	// ................................ Act ..................................
	before = $("#result").text();
	$.observable(person1).setProperty("lastName", "newLast");
	after = $("#result").text();

	// ............................... Assert .................................
	equal(before + "|" + after,
	'One|newLast',
	'$.link(template, "#container", data) links template to content of container (equivalent to template.link(container, data). Example 2.');

	// =============================== Arrange ===============================

	// ................................ Act ..................................
	$("#result").empty();

	// ............................... Assert .................................

	ok(!viewsAndBindings() && !$._data(person1).events,
	"$(container).empty removes both views and current listeners from that content");

	// ................................ Reset ................................
	person1.lastName = "One"; // reset Prop
	$.unlink();

	$.views.settings.debugMode(false);
});

test("Top-level linking", function() {

	// =============================== Arrange ===============================

	$.views.helpers("a", " A");
	$("#result").html("<div data-link='name + ~a + ~b'></div>");

	// ............................... Act .................................
	$.link(true, "#result", { name: "Jo" }, { b: " B" });

	// ............................... Assert .................................
	equal($("#result").text(), "Jo A B", 'Passing in data to top-level linking');

	// ............................... Act .................................
	$.link(true, "#result div", { name: "Jo2" }, { b: " newB" });

	// ............................... Assert .................................
	equal($("#result").text(), "Jo2 A newB", 'Top-level linking directly to the linked element');

	// ................................ Reset ................................
	$("#result").empty();

	// ............................... Assert .................................
	equal(JSON.stringify($.views.sub._cbBnds), "{}",
		"Top level bindings all removed when content removed from DOM");

	// =============================== Arrange ===============================

	$.views.helpers("a", " A");
	$.templates("inner", "{^{:name + ~a + ~b}}");
	$("#result").html("<div data-link='{include tmpl=\"inner\"}'></div>");

	// ............................... Act .................................
	var data = { name: "Jo" };
	$.link(true, "#result", data, { b: " B" });

	// ............................... Assert .................................
	equal($("#result").text(), "Jo A B", 'top-level data-link="{include tmpl=...}" passes in model and context');

	// ............................... Act .................................
	$.observable(data).setProperty("name", "JoChanged");

	// ............................... Assert .................................
	equal($("#result").text(), "JoChanged A B", 'Top-level data-link="{include tmpl=...}" binds correctly within {{include}} template');

	// ............................... Act .................................
	data = { name: "Jo2" };
	$.link(true, "#result", data, { b: " newB" });

	// ............................... Assert .................................
	equal($("#result div").text(), "Jo2 A newB", 'Top-level linking directly to the linked element with data-link="{include... ');

	// ............................... Act .................................
	$.observable(data).setProperty("name", "Jo2Changed");

	// ............................... Assert .................................
	equal($("#result").text(), "Jo2Changed A newB", 'Top-level linking directly to the linked element with data-link="{include... binds correctly within {{include}} template');

	// ................................ Reset ................................
	$("#result").empty();

	// ............................... Assert .................................
	equal(JSON.stringify($.views.sub._cbBnds), "{}",
		"Top level bindings all removed when content removed from DOM");

	// =============================== Arrange ===============================

	$.views.helpers("a", " A");
	$.templates({
		selectTmpl: "<option>{{>name}}</option>",
		listTmpl: "<li>{{>name}}</li>"
	});

	$("#result").html("<select data-link=\"html{for people tmpl='selectTmpl'} {:selected:}\"></select>"
					+ "<ul data-link=\"{for people tmpl='listTmpl'}\"></ul>");

	var count = 0,
		model = {
			selected: "Jim",
			people: [
				{ name: "Bob" },
				{ name: "Jim" }
			]
		};

	// ............................... Act .................................
	$("#result").link(true, model);

	result = $("#result select option:selected").text() + "-" + $("#result ul").text();

	var newName = "new" + count++;

	$.observable(model.people).insert({
		name: newName
	});

	$.observable(model).setProperty("selected", newName);

	result += "|" + $("#result select option:selected").text() + "-" + $("#result ul").text();

	// ............................... Assert .................................
	equal(result, "Jim-BobJim|new0-BobJimnew0",
		"Top level bindings with multiple targets on the same element work correctly: html{for people tmpl='selectTmpl'} {:selected:}");

	// ................................ Reset ................................
	$("#result").empty();

	// ............................... Assert .................................
	equal(JSON.stringify($.views.sub._cbBnds), "{}",
		"Top level bindings all removed when content removed from DOM");

	// =============================== Arrange ===============================

	$.templates({
		myTmpl: "{{>name}} lead:{^{>~team.lead}} - "
	});

	$("#result").html("<div data-link=\"{for people ~team=#data tmpl='myTmpl'}\"></div>");

	model = {
		lead: "Jim",
		people: [
			{ name: "Bob" },
			{ name: "Jim" }
		]
	};

	// ............................... Act .................................
	$("#result").link(true, model);

	result = $("#result").text();

	$.observable(model.people).insert({
		name: "newName"
	});

	$.observable(model).setProperty("lead", "newName");

	result += "|" + $("#result").text();

	// ............................... Assert .................................
	equal(result, (isIE8 ? "Bob lead:Jim - Jim lead:Jim - |Bob lead:newName - Jim lead:newName -newName lead:newName -  "
							: "Bob lead:Jim - Jim lead:Jim - |Bob lead:newName - Jim lead:newName - newName lead:newName - "),
		"Top level bindings allow passing in new contextual variables to template: data-link=\"{for people ~team=#data tmpl=...");

	// ................................ Reset ................................
	$("#result").empty();

	// ............................... Assert .................................
	equal(JSON.stringify($.views.sub._cbBnds), "{}",
		"Top level bindings all removed when content removed from DOM");
});

test("$.link() and $().link() variants", function() {

	// ................................ Reset ................................
	person1.lastName = "One"; // reset Prop
	home1.address = address1; // reset Prop
	$.views.settings.debugMode(); // For using viewsAndBindings()

	// =============================== Arrange ===============================

	$("#result").html('<span id="inner"></span>');
	var help = {
		options: { bar: "BarA" }
	};

	$.link("person1.lastName + ' ' + person1.home.address^street + ' ' + ~options.bar", "#inner", model, help);

	// ................................ Act ..................................
	before = $("#inner").html();
	$.observable(person1).setProperty("lastName", "newLast");
	$.observable(person1.home).setProperty("address", address2); // Using deep observability
	$.observable(help.options).setProperty("bar", "BarB"); // Modify helper
	after = $("#inner").html();

	// ............................... Assert .................................
	equal(before + "|" + after,
	'One StreetOne BarA|newLast StreetTwo BarB',
	'$.link(expression, "#target", data, helpers) links expression to target element (equivalent to data-link="expression")');

	// =============================== Arrange ===============================

	// ................................ Act ..................................
	$("#result").empty();

	// ............................... Assert .................................

	ok(!viewsAndBindings() && !$._data(person1).events && !$._data(person1.home).events && !$._data(help.options).events,
	"$(container).empty removes current listeners from that content");

	// ................................ Reset ................................
	person1.lastName = "One"; // reset Prop
	home1.address = address1; // reset Prop
	help.options.bar = "BarA"; // reset Prop

	// =============================== Arrange ===============================

	$("#result").html('<span id="inner"></span>');

	$("#inner").link("person1.lastName + ' ' + person1.home.address^street + ' ' + ~options.bar", model, help);

	// ................................ Act ..................................
	before = $("#inner").html();
	$.observable(person1).setProperty("lastName", "newLast");
	$.observable(person1.home).setProperty("address", address2); // Using deep observability
	$.observable(help.options).setProperty("bar", "BarB"); // Modify helper
	after = $("#inner").html();

	// ............................... Assert .................................
	equal(before + "|" + after,
	'One StreetOne BarA|newLast StreetTwo BarB',
	'$("#target").link(expression, data, helpers) links expression to target element (equivalent to data-link="expression")');

	// ................................ Reset ................................
	$("#result").empty();
	person1.lastName = "One"; // reset Prop
	home1.address = address1; // reset Prop
	help.options.bar = "BarA"; // reset Prop

	// =============================== Arrange ===============================

	$("#result").html('<span class="inner"> </span> <div class="inner"></div> <input class="inner"/>'); // multiple targets, same class

	$.link("person1.lastName", ".inner", model, help);

	// ................................ Act ..................................
	before = $("#result").text() + $("#result input").val();
	$.observable(person1).setProperty("lastName", "newLast");
	after = $("#result").text() + $("#result input").val();
	$("#result input").val("modLast").change();
	after += "|" + $("#result").text() + $("#result input").val();

	// ............................... Assert .................................
	equal(before + "|" + after,
	(isIE8 ? 'OneOneOne|newLastnewLastnewLast|modLastmodLastmodLast'
	: 'One One One|newLast newLast newLast|modLast modLast modLast'),
	'$.link(expression, ".target", data, helpers) links expression to multiple target elements, including two-way bindings (equivalent to data-link="expression" on each element)');

	// ................................ Act ..................................
	$("#result").empty();

	// ............................... Assert .................................

	ok(!viewsAndBindings() && !$._data(person1).events,
	"$(container).empty removes current listeners and two-way bindings from that content");

	// ................................ Reset ................................
	person1.lastName = "One"; // reset Prop

	// =============================== Arrange ===============================

	$("#result").html('<span class="inner"> </span> <div class="inner"></div> <input class="inner"/>'); // multiple targets, same class

	$(".inner").link("person1.lastName", model, help);

	// ................................ Act ..................................
	before = $("#result").text() + $("#result input").val();
	$.observable(person1).setProperty("lastName", "newLast");
	after = $("#result").text() + $("#result input").val();
	$("#result input").val("modLast").change();
	after += "|" + $("#result").text() + $("#result input").val();

	// ............................... Assert .................................
	equal(before + "|" + after,
	(isIE8 ? 'OneOneOne|newLastnewLastnewLast|modLastmodLastmodLast'
	: 'One One One|newLast newLast newLast|modLast modLast modLast'),
	'$(".target").link(expression, data, helpers) links expression to multiple target elements, including two-way bindings (equivalent to data-link="expression" on each element)');

	// ................................ Act ..................................
	$("#result").empty();

	// ............................... Assert .................................

	ok(!viewsAndBindings() && !$._data(person1).events,
	"$(container).empty removes current listeners and two-way bindings from that content");

	// ................................ Reset ................................
	person1.lastName = "One"; // reset Prop

	// =============================== Arrange ===============================

	$("#result").html('<span class="inner"> </span> <div class="inner"></div> <input class="inner"/>'); // multiple targets, same class

	help.options.tmpl = $.templates(" NAME: {^{:lastName}}");
	$.link("title{:person1.lastName} {include person1 tmpl=~options.tmpl}", "div.inner, span.inner", model, help);
	$.link("title{:person1.lastName} {:person1.lastName:}", "input.inner", model, help);

	// ................................ Act ..................................
	function getTitles(selector) {
		var res = "";
		$(selector).each(function() {
			res += " " + this.title;
		});
		return res;
	}

	before = $("#result").text() + $("#result input").val() + getTitles(".inner");
	$.observable(person1).setProperty("lastName", "newLast");
	after = $("#result").text() + $("#result input").val() + getTitles(".inner");
	$("#result input").val("modLast").change();
	after += "|" + $("#result").text() + $("#result input").val() + getTitles(".inner");

	// ............................... Assert .................................
	equal(before + "|" + after,
	(isIE8 ? 'NAME: OneNAME: OneOne One One One|'
	+ 'NAME:newLastNAME:newLastnewLast newLast newLast newLast|'
	+ 'NAME:modLastNAME:modLastmodLast modLast modLast modLast'
	: ' NAME: One  NAME: One One One One One|'
	+ ' NAME: newLast  NAME: newLast newLast newLast newLast newLast|'
	+ ' NAME: modLast  NAME: modLast modLast modLast modLast modLast'),
	'$.link(expression, selector, data, helpers) links expression to multiple targets on multiple target elements, including two-way bindings');

	// ................................ Act ..................................
	$("#result").empty();

	// ............................... Assert .................................

	ok(!viewsAndBindings() && !$._data(person1).events,
	"$(container).empty removes current listeners and two-way bindings from that content");

	// ................................ Reset ................................
	person1.lastName = "One"; // reset Prop

	// =============================== Arrange ===============================

	$("#result").html('<span class="inner"> </span> <div class="inner"></div> <input class="inner"/>'); // multiple targets, same class

	$("div.inner, span.inner").link("title{:person1.lastName} {include person1 ^tmpl=~options.tmpl}", model, help);
	$("input.inner").link("title{:person1.lastName} {:person1.lastName:}", model, help);

	// ................................ Act ..................................
	before = $("#result").text() + $("#result input").val() + getTitles(".inner");
	$.observable(person1).setProperty("lastName", "newLast");
	after = $("#result").text() + $("#result input").val() + getTitles(".inner");
	$("#result input").val("modLast").change();
	after += "|" + $("#result").text() + $("#result input").val() + getTitles(".inner");
	$.observable(help.options).setProperty("tmpl", $.templates(" NEWTMPLNAME: {^{:lastName}}")); // We dynamically change the template of {include ^tmpl=~tmpl} too
	after += "|" + $("#result").text() + $("#result input").val() + getTitles(".inner");

	// ............................... Assert .................................
	equal(before + "|" + after,
	(isIE8 ? 'NAME: OneNAME: OneOne One One One|'
	+ 'NAME:newLastNAME:newLastnewLast newLast newLast newLast|'
	+ 'NAME:modLastNAME:modLastmodLast modLast modLast modLast|'
	+ 'NEWTMPLNAME: modLastNEWTMPLNAME: modLastmodLast modLast modLast modLast'
	: ' NAME: One  NAME: One One One One One|'
	+ ' NAME: newLast  NAME: newLast newLast newLast newLast newLast|'
	+ ' NAME: modLast  NAME: modLast modLast modLast modLast modLast|'
	+ ' NEWTMPLNAME: modLast  NEWTMPLNAME: modLast modLast modLast modLast modLast'),
	'$(selector).link(expression, data, helpers) links expression to multiple targets on multiple target elements, including binding to passed in templates');

	// ................................ Act ..................................
	$("#result").empty();

	// ............................... Assert .................................

	ok(!viewsAndBindings() && !$._data(person1).events,
	"$(container).empty removes current listeners and two-way bindings from that content");

	// ................................ Reset ................................
	person1.lastName = "One"; // reset Prop
	help.options.tmpl = $.templates(" NAME: {^{:lastName}}");

	// =============================== Arrange ===============================

	$("#result").html('<span class="inner" data-link="title{:person1.lastName} {include person1 tmpl=~options.tmpl}"></span>'
		+ ' <div class="inner" data-link="title{:person1.lastName} {include person1 tmpl=~options.tmpl}"></div>'
		+ ' <input class="inner" data-link="title{:person1.lastName} {:person1.lastName:}" />'); // multiple targets, same class

	$.link(true, ".inner", model, help);

	// ................................ Act ..................................
	before = $("#result").text() + $("#result input").val() + getTitles(".inner");
	$.observable(person1).setProperty("lastName", "newLast");
	after = $("#result").text() + $("#result input").val() + getTitles(".inner");
	$("#result input").val("modLast").change();
	after += "|" + $("#result").text() + $("#result input").val() + getTitles(".inner");

	// ............................... Assert .................................
	equal(before + "|" + after,
	(isIE8 ? 'NAME: One NAME: OneOne One One One|'
		+ 'NAME:newLast NAME:newLastnewLast newLast newLast newLast|'
		+ 'NAME:modLast NAME:modLastmodLast modLast modLast modLast'
	: ' NAME: One  NAME: One One One One One|'
		+ ' NAME: newLast  NAME: newLast newLast newLast newLast newLast|'
		+ ' NAME: modLast  NAME: modLast modLast modLast modLast modLast'),
	'$.link(true, ".inner", data, helpers) links multiple targets on multiple target elements, including two-way bindings');

	// ................................ Act ..................................
	$("#result").empty();

	// ............................... Assert .................................

	ok(!viewsAndBindings() && !$._data(person1).events,
	"$(container).empty removes current listeners and two-way bindings from that content");

	// ................................ Reset ................................
	person1.lastName = "One"; // reset Prop

	// =============================== Arrange ===============================

	$("#result").html('<span class="inner" data-link="title{:person1.lastName} {include person1 tmpl=~options.tmpl}"></span>'
		+ ' <div class="inner" data-link="title{:person1.lastName} {include person1 tmpl=~options.tmpl}"></div>'
		+ ' <input class="inner" data-link="title{:person1.lastName} {:person1.lastName:}" />'); // multiple targets, same class

	$(".inner").link(true, model, help);

	// ................................ Act ..................................
	before = $("#result").text() + $("#result input").val() + getTitles(".inner");
	$.observable(person1).setProperty("lastName", "newLast");
	after = $("#result").text() + $("#result input").val() + getTitles(".inner");
	$("#result input").val("modLast").change();
	after += "|" + $("#result").text() + $("#result input").val() + getTitles(".inner");

	// ............................... Assert .................................
	equal(before + "|" + after,
	(isIE8 ? 'NAME: One NAME: OneOne One One One|'
		+ 'NAME:newLast NAME:newLastnewLast newLast newLast newLast|'
		+ 'NAME:modLast NAME:modLastmodLast modLast modLast modLast'
	: ' NAME: One  NAME: One One One One One|'
	+ ' NAME: newLast  NAME: newLast newLast newLast newLast newLast|'
	+ ' NAME: modLast  NAME: modLast modLast modLast modLast modLast'),
	'$(".inner").link(true, data, helpers) links multiple targets on multiple target elements, including two-way bindings');

	// ................................ Act ..................................
	$("#result").empty();

	// ............................... Assert .................................

	ok(!viewsAndBindings() && !$._data(person1).events,
	"$(container).empty removes current listeners and two-way bindings from that content");

	// ................................ Reset ................................
	person1.lastName = "One"; // reset Prop

	// =============================== Arrange ===============================

	$("#result").html('<span data-link="title{:person1.lastName} {include person1 tmpl=~options.tmpl}"></span>'
		+ ' <div data-link="title{:person1.lastName} {include person1 tmpl=~options.tmpl}"></div>'
		+ ' <input data-link="title{:person1.lastName} {:person1.lastName:}" />'); // multiple targets, same class

	$.link(true, "#result", model, help);

	// ................................ Act ..................................
	before = $("#result").text() + $("#result input").val() + getTitles("#result div, #result span, #result input");
	$.observable(person1).setProperty("lastName", "newLast");
	after = $("#result").text() + $("#result input").val() + getTitles("#result div, #result span, #result input");
	$("#result input").val("modLast").change();
	after += "|" + $("#result").text() + $("#result input").val() + getTitles("#result div, #result span, #result input");

	// ............................... Assert .................................
	equal(before + "|" + after,
	(isIE8 ? 'NAME: One NAME: OneOne One One One|'
		+ 'NAME:newLast NAME:newLastnewLast newLast newLast newLast|'
		+ 'NAME:modLast NAME:modLastmodLast modLast modLast modLast'
	: ' NAME: One  NAME: One One One One One|'
	+ ' NAME: newLast  NAME: newLast newLast newLast newLast newLast|'
	+ ' NAME: modLast  NAME: modLast modLast modLast modLast modLast'),
	'$(container).link(true, data, helpers) links multiple targets on multiple target elements, including two-way bindings');

	// ................................ Act ..................................
	$("#result").empty();

	// ............................... Assert .................................

	ok(!viewsAndBindings() && !$._data(person1).events,
	"$(container).empty removes current listeners and two-way bindings from that content");

	// ................................ Reset ................................
	person1.lastName = "One"; // reset Prop

	// =============================== Arrange ===============================

	$("#result").html('<span data-link="title{:person1.lastName} {include person1 tmpl=~options.tmpl}"></span>'
		+ ' <div data-link="title{:person1.lastName} {include person1 tmpl=~options.tmpl}"></div>'
		+ ' <input data-link="title{:person1.lastName} {:person1.lastName:}" />');

	$("#result").link(true, model, help);

	// ................................ Act ..................................
	before = $("#result").text() + $("#result input").val() + getTitles("#result div, #result span, #result input");
	$.observable(person1).setProperty("lastName", "newLast");
	after = $("#result").text() + $("#result input").val() + getTitles("#result div, #result span, #result input");
	$("#result input").val("modLast").change();
	after += "|" + $("#result").text() + $("#result input").val() + getTitles("#result div, #result span, #result input");

	// ............................... Assert .................................
	equal(before + "|" + after,
	(isIE8 ? 'NAME: One NAME: OneOne One One One|'
		+ 'NAME:newLast NAME:newLastnewLast newLast newLast newLast|'
		+ 'NAME:modLast NAME:modLastmodLast modLast modLast modLast'
	: ' NAME: One  NAME: One One One One One|'
	+ ' NAME: newLast  NAME: newLast newLast newLast newLast newLast|'
	+ ' NAME: modLast  NAME: modLast modLast modLast modLast modLast'),
	'$(container).link(true, data, helpers) links multiple targets on multiple target elements, including two-way bindings');

	// ................................ Act ..................................
	$("#result").empty();

	// ............................... Assert .................................

	ok(!viewsAndBindings() && !$._data(person1).events,
	"$(container).empty removes current listeners and two-way bindings from that content");

	// ................................ Reset ................................
	person1.lastName = "One"; // reset Prop

	// =============================== Arrange ===============================

	$.templates('<span class="inner"> </span> <div class="inner"></div> <input class="inner"/>').link("#result");
	// Rendered by template: multiple targets, same class

	$.link("title{:person1.lastName} {include person1 tmpl=~options.tmpl}", "div.inner, span.inner", model, help);
	$.link("title{:person1.lastName} {:person1.lastName:}", "input.inner", model, help);

	// ................................ Act ..................................
	before = $("#result").text() + $("#result input").val() + getTitles(".inner");
	$.observable(person1).setProperty("lastName", "newLast");
	after = $("#result").text() + $("#result input").val() + getTitles(".inner");
	$("#result input").val("modLast").change();
	after += "|" + $("#result").text() + $("#result input").val() + getTitles(".inner");

	// ............................... Assert .................................
	equal(before + "|" + after,
	(isIE8 ? 'NAME: OneNAME: OneOne One One One|'
		+ 'NAME:newLastNAME:newLastnewLast newLast newLast newLast|'
		+ 'NAME:modLastNAME:modLastmodLast modLast modLast modLast'
	: ' NAME: One  NAME: One One One One One|'
	+ ' NAME: newLast  NAME: newLast newLast newLast newLast newLast|'
	+ ' NAME: modLast  NAME: modLast modLast modLast modLast modLast'),
	'$.link(expression, selector, data, helpers) links correctly to multiple targets on multiple target elements within a linked rendered template');

	// ................................ Act ..................................
	$("#result").empty();

	// ............................... Assert .................................

	ok(!viewsAndBindings() && !$._data(person1).events,
	"$(container).empty removes current listeners and two-way bindings from that content");

	// ................................ Reset ................................
	person1.lastName = "One"; // reset Prop

	// =============================== Arrange ===============================

	$.templates('<span data-link="title{:person1.lastName} {include person1 tmpl=~options.tmpl}"></span>'
		+ ' <div data-link="title{:person1.lastName} {include person1 ^tmpl=~options.tmpl}"></div>'
		+ ' <input data-link="title{:person1.lastName} {:person1.lastName:}" />').link("#result", model, help);
	// Rendered and linked by template: multiple targets

	var model2 = {
		person1: {
			lastName: "lastModel2Name"
		}
	},
		help2 = {
			options: {
				tmpl: $.templates(" NAMEModel2: {^{:lastName}}")
			}
		};

	$.link(true, "#result", model2, help2);

	// ................................ Act ..................................
	before = $("#result").text() + $("#result input").val() + getTitles("#result div, #result span, #result input");
	$.observable(person1).setProperty("lastName", "newLast");
	after = $("#result").text() + $("#result input").val() + getTitles("#result div, #result span, #result input");
	$("#result input").val("modLast").change();
	after += "|" + $("#result").text() + $("#result input").val() + getTitles("#result div, #result span, #result input");

	// ............................... Assert .................................
	equal(before + "|" + after + " - Model1: " + model.person1.lastName + "- Model2: " + model2.person1.lastName,
	(isIE8 ? 'NAME: OneNAME: OneOne One One One|'
	+ 'NAME:newLastNAME:newLastnewLast newLast newLast newLast|'
	+ 'NAME:modLastNAME:modLastmodLast modLast modLast modLast - Model1: modLast- Model2: lastModel2Name'
	: ' NAME: One  NAME: One One One One One|'
	+ ' NAME: newLast  NAME: newLast newLast newLast newLast newLast|'
	+ ' NAME: modLast  NAME: modLast modLast modLast modLast modLast - Model1: modLast- Model2: lastModel2Name'),
	'$.link(true, selector, data, helpers) links correctly to within a linked rendered template - leading to dual two-way binding to both models and contexts');

	// ................................ Act ..................................
	$.observable(model2.person1).setProperty("lastName", "newModel2Last");
	before = $("#result").text() + $("#result input").val() + getTitles("#result div, #result span, #result input");
	$.observable(model.person1).setProperty("lastName", "new_ORIGMOD_Last");
	after = $("#result").text() + $("#result input").val() + getTitles("#result div, #result span, #result input");
	$.observable(help.options).setProperty("tmpl", $.templates(" NAME_ORIGMOD_NewTmpl: {^{:lastName}}"));
	after += "|" + $("#result").text() + $("#result input").val() + getTitles("#result div, #result span, #result input");

	// ............................... Assert .................................
	equal(before + "|" + after,
	(isIE8 ? 'NAME:modLastNAME:modLastmodLast modLast modLast modLast|'
	+ 'NAME:new_ORIGMOD_LastNAME:new_ORIGMOD_Lastnew_ORIGMOD_Last new_ORIGMOD_Last new_ORIGMOD_Last new_ORIGMOD_Last|'
	+ 'NAME:new_ORIGMOD_LastNAME_ORIGMOD_NewTmpl: new_ORIGMOD_Lastnew_ORIGMOD_Last new_ORIGMOD_Last new_ORIGMOD_Last new_ORIGMOD_Last'
	: ' NAME: modLast  NAME: modLast modLast modLast modLast modLast|'
	+ ' NAME: new_ORIGMOD_Last  NAME: new_ORIGMOD_Last new_ORIGMOD_Last new_ORIGMOD_Last new_ORIGMOD_Last new_ORIGMOD_Last|'
	+ ' NAME: new_ORIGMOD_Last  NAME_ORIGMOD_NewTmpl: new_ORIGMOD_Last new_ORIGMOD_Last new_ORIGMOD_Last new_ORIGMOD_Last new_ORIGMOD_Last'),
	'Continue: $.link(true, selector, data, helpers) links correctly to within a linked rendered template - leading to dual two-way binding to both models and contexts');

	// ................................ Act ..................................
	$("#result").empty();

	// ............................... Assert .................................

	ok(!viewsAndBindings() && !$._data(person1).events,
	"$(container).empty removes current listeners and two-way bindings from that content");

	// ................................ Reset ................................
	person1.lastName = "One"; // reset Prop

	$.views.settings.debugMode(false);
});

module("template.link()");

test("Helper overriding", 12, function() {

// ................................ Reset ................................
	home1.address = address1; // reset Prop
	person1._firstName = "Jo"; // reset Prop
	person1.lastName = "One"; // reset Prop
	settings.title = "Mr"; // reset Prop

	// =============================== Arrange ===============================
	$.views.helpers("a", "globalHelper");

	var tmpl = $.templates({
		markup: "{{:~a}} {{:~b}} {{:~c}}",
		helpers: {
			b: "templateHelper"
		}
	});

	tmpl.link("#result", {}, { c: "optionHelper" });

	// ............................... Assert .................................
	equal($("#result").text(), "globalHelper templateHelper optionHelper", 'Passing in helpers - global, template or option');

	// =============================== Arrange ===============================
	tmpl = $.templates({
		markup: "{{:~a}}",
		helpers: {
			a: "templateHelper"
		}
	});

	tmpl.link("#result", {});

	// ............................... Assert .................................
	equal($("#result").text(), "templateHelper", 'template helper overrides global helper');

	// =============================== Arrange ===============================
	tmpl = $.templates({
		markup: "{{:~a}}"
	});

	tmpl.link("#result", {}, { a: "optionHelper" });

	// ............................... Assert .................................
	equal($("#result").text(), "optionHelper", 'option helper overrides global helper');

	// =============================== Arrange ===============================
	tmpl = $.templates({
		markup: "{{:~b}}",
		helpers: {
			b: "templateHelper"
		}
	});

	tmpl.link("#result", {}, { b: "optionHelper" });

	// ............................... Assert .................................
	equal($("#result").text(), "templateHelper", 'template helper overrides option helper');

	// =============================== Arrange ===============================
	$.views.helpers("a", "globalHelper");

	$("#result").html("<div data-link='~a + ~b'></div>");

	$.link(true, "#result", {}, { b: "optionHelper" });

	// ............................... Assert .................................
	equal($("#result").text(), "globalHelperoptionHelper", 'Passing in helpers to top-level linking - global or option');

	// =============================== Arrange ===============================
	$.views.helpers("a", "globalHelper");

	$("#result").html("<div data-link='~a'></div>");

	$.link(true, "#result", {}, { a: "optionHelper" });

	// ............................... Assert .................................
	equal($("#result").text(), "optionHelper", 'Passing in helpers to top-level linking - option overrides global');

	// =============================== Arrange ===============================
	$.views.helpers({
		onBeforeChange: function(ev, eventArgs) {
			result += "globalBeforeChange|" + eventArgs.change + "|" + (this.tag ? this.tag.tagName : this.elem.tagName) + " ";
		},
		onAfterChange: function(ev, eventArgs) {
			result += "globalAfterChange|" + eventArgs.change + "|" + (this.tag ? this.tag.tagName : this.elem.tagName) + " ";
		},
		onAfterCreate: function(ev, eventArgs) {
			result += "globalAfterCreate ";
		}
	});
	result = '';

	var pson = { name: "Jo" };

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
			result += "optionsBeforeChange|" + eventArgs.change + "|" + (this.tag ? this.tag.tagName : this.elem.tagName) + " ";
		},
		onAfterChange: function(ev, eventArgs) {
			result += "optionsAfterChange|" + eventArgs.change + "|" + (this.tag ? this.tag.tagName : this.elem.tagName) + " ";
		},
		onAfterCreate: function(ev, eventArgs) {
			result += "optionsAfterCreate ";
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
				result += "templateBeforeChange|" + eventArgs.change + "|" + (this.tag ? this.tag.tagName : this.elem.tagName) + " ";
			},
			onAfterChange: function(ev, eventArgs) {
				result += "templateAfterChange|" + eventArgs.change + "|" + (this.tag ? this.tag.tagName : this.elem.tagName) + " ";
			},
			onAfterCreate: function(ev, eventArgs) {
				result += "templateAfterCreate ";
			}
		}
	});

	tmpl.link("#result", pson, {
		onBeforeChange: function(ev, eventArgs) {
			result += "optionsBeforeChange|" + eventArgs.change + "|" + (this.tag ? this.tag.tagName : this.elem.tagName) + " ";
		},
		onAfterChange: function(ev, eventArgs) {
			result += "optionsAfterChange|" + eventArgs.change + "|" + (this.tag ? this.tag.tagName : this.elem.tagName) + " ";
		},
		onAfterCreate: function(ev, eventArgs) {
			result += "optionsAfterCreate ";
		}
	});

	$.observable(pson).setProperty("name", "name4");

	// ............................... Assert .................................
	equal(result, "templateAfterCreate templateBeforeChange|set|INPUT templateAfterChange|set|INPUT templateBeforeChange|set|: templateAfterChange|set|: ",
		'template helper overrides options helper');

	result = '';

	$("#result input").val("editedName").change();

	// ............................... Assert .................................
	equal(result, "templateBeforeChange|change|INPUT templateBeforeChange|set|INPUT"
		+ " templateBeforeChange|set|: templateAfterChange|set|: templateAfterChange|change|INPUT ",
		'template helper overrides options helper');

	result = '';

	$.views.helpers({
		onBeforeChange: null,
		onAfterChange: null,
		onAfterCreate: null
	});
	$("#result").empty();
});

test('data-link="expression"', function() {

// ................................ Reset ................................
	home1.address = address1; // reset Prop
	person1._firstName = "Jo"; // reset Prop
	person1.lastName = "One"; // reset Prop
	settings.title = "Mr"; // reset Prop
	$.views.settings.debugMode(); // For using viewsAndBindings()

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

	// ................................ Act ..................................
	$("#result input").val("editedName").change();
	after = $("#result").html() + $("#last").val();

	// ............................... Assert .................................
	equal(person1.lastName, "editedName",
	'Data link using: <input data-link="lastName"/> does two-way binding');

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

	// ................................ Act ..................................
	$("#result").empty();
	before = $("#result").html();

	// ............................... Assert .................................
	ok(!viewsAndBindings() && !$._data(person1).events && !$._data(home1).events && !$._data(address2).events,
	"$(container).empty removes both views and current listeners from that content - including after swapping data on deep paths");

	person1.lastName = "One"; // reset Prop
	home1.address = address1; // reset Prop

	// =============================== Arrange ===============================

	$.templates('<span data-link="fullName()"></span>')
		.link("#result", person1);

	// ................................ Act ..................................
	before = $("#result span").html();
	$.observable(person1).setProperty({ firstName: "newFirst", lastName: "newLast" });
	$.observable(settings).setProperty("title", "Sir");
	after = $("#result span").html();

	// ............................... Assert .................................
	equal(before + "|" + after,
	'Mr Jo One|Sir newFirst newLast',
	'data-link="fullName()"');

	// ................................ Reset ................................
	person1._firstName = "Jo"; // reset Prop
	person1.lastName = "One"; // reset Prop
	settings.title = "Mr"; // reset Prop

	// =============================== Arrange ===============================

	$.templates('<span data-link="foo(\'x\\x\').b"></span>')
		.link("#result", {
			foo: function(val) {
				return { b: val };
			}
		});

	// ............................... Assert .................................
	var html = $("#result span")[0].outerHTML;
	equal(html,
	isIE8
	? "<SPAN data-link=\"foo('x\\x').b\"" + html.slice(30)
	: '<span data-link="foo(\'x\\x\').b">x\\x</span>',
	'Escaping of characters: data-link="foo(\'x\\x\').b"');

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
		.link("#result", 1, { model: model });

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

	var util1 = { getVal: function(val) { return "getVal1 = " + val; } };
	var util2 = { getVal: function(val) { return "getVal2 = " + val; } };
	var appHelpers = { util: util1 };

	$.templates('<span data-link="~app.util^getVal(#data)"></span>')
		.link("#result", 22, { app: appHelpers });

	// ................................ Act ..................................
	before = $("#result span").html();
	$.observable(appHelpers).setProperty("util", util2);
	after = $("#result span").html();
	$.observable(util2).setProperty("getVal", function(val) { return "getNewVal = " + val; });
	after += "|" + $("#result span").html();

	// ............................... Assert .................................
	equal(before + "|" + after,
	'getVal1 = 22|getVal2 = 22|getNewVal = 22',
	'~a.b.helperFunction() does deep binding even for functions');

	// ................................ Reset ................................
	$("#result").empty();

	// =============================== Arrange ===============================
	var foobar = {
		foo: {
			bar: "initial "
		}
	};

	$.views.converters({
		noop: function(val) {
			return val;
		}
	});

	$.templates('1 {^{:foo^bar}} 2 {^{:foo^bar}} 3 <span data-link="{:foo^bar}"></span>'
		+ ' 4 <span data-link="{:foo^bar}"></span> 5 <span data-link="{noop:foo^bar}"></span> 6 <span data-link="{noop:foo^bar}"></span>'
		+ ' INPUTS <input class="linked" data-link="{noop:foo^bar}" /><input class="linked" data-link="{noop:foo^bar}" /><input class="linked" data-link="foo^bar" />'
		+ '<input class="linked" data-link="foo^bar" /><input class="linked" data-link="{:foo^bar:noop}" /><input class="linked" data-link="{:foo^bar:noop}" />'
		+ '<input class="linked" data-link="{noop:foo^bar:noop}" /><input class="linked" data-link="{noop:foo^bar:noop}" />')
		.link("#result", foobar);

	// ................................ Act ..................................
	$.observable(foobar).setProperty("foo", { bar: "new " });
	result = $("#result").text();
	$("input.linked").each(function(i, el) { result += el.value; });

	// ............................... Assert .................................
	equal(result,
	isIE8 ? "1new  2new  3 new 4 new 5 new 6 new INPUTS new new new new new new new new "
		: "1 new  2 new  3 new  4 new  5 new  6 new  INPUTS new new new new new new new new ",
	'Duplicate paths bind correctly (https://github.com/BorisMoore/jsviews/issues/250)');

	// ................................ Reset ................................
	$("#result").empty();

	// =============================== Arrange ===============================
	var data = { name: "Jo" };
	result = "";

	// ................................ Act ..................................
	result =
		$.templates('{{:#data}}')
		.render(["aa", 22, 0, false, "", true]);

	// ............................... Assert .................................
	equal(result,
	"aa220falsetrue",
	'{{:#data}} renders correctly for different data types');

	// ................................ Act ..................................
	result =
		$.templates('{{for items}}{{:#index}} {{:#data}} {{/for}}')
		.render({ items: ["aa", 22, 0, false, "", true] });

	// ............................... Assert .................................
	equal(result,
	"0 aa 1 22 2 0 3 false 4  5 true ",
	'{{:#data}} within {{for}} is correct for different data types');

	// ................................ Act ..................................

	result =
		$.templates('{{:#data}}')
		.link("#result", ["aa", 22, 0, false, "", true]).text();

	// ............................... Assert .................................
	equal(result,
	"aa220falsetrue",
	'With link, {{:#data}} renders correctly for different data types');

	// ................................ Act ..................................
	result =
		$.templates('{{for items}}{{:#index}} {{:#data}} {{/for}}')
		.link("#result", { items: ["aa", 22, 0, false, "", true] }).text();

	// ............................... Assert .................................
	equal(result,
	isIE8 ? "0 aa 1 22 2 0 3 false 4 5 true "
		: "0 aa 1 22 2 0 3 false 4  5 true ",
	'with link, {{:#data}} within {{for}} is correct for different data types');

	// ................................ Act ..................................
	result =
		$.templates('{^{:#data}}')
		.link("#result", ["aa", 22, 0, false, "", true]).text();

	// ............................... Assert .................................
	equal(result,
	"aa220falsetrue",
	'With link, {^{:#data}} renders correctly for different data types');

	// ................................ Act ..................................
	result =
		$.templates('{^{for items}}{{:#index}} {^{:#data}} {{/for}}')
		.link("#result", { items: ["aa", 22, 0, false, "", true] }).text();

	// ............................... Assert .................................
	equal(result,
	isIE8 ? "0 aa 1 22 2 0 3 false 4 5 true "
		: "0 aa 1 22 2 0 3 false 4  5 true ",
	'with link, {^{:#data}} within {^{for}} is correct for different data types');

	// ................................ Act ..................................
	data = { name: "Jo" };
	result = "";

	$.templates(
	'{{for "some string" ~item=#data}}'
		+ '<input data-link="~item.name + #data"/>'
	+ '{{/for}}'
	+ '{{for 22 ~item=#data}}'
		+ '<input data-link="~item.name + #data"/>'
	+ '{{/for}}'
	+ '{{for 0 ~item=#data}}'
		+ '<input data-link="~item.name + #data"/>'
	+ '{{/for}}'
	+ '{{for false ~item=#data}}'
		+ '<input data-link="~item.name + #data"/>'
	+ '{{/for}}'
	+ '{{for "" ~item=#data}}'
		+ '<input data-link="~item.name + #data"/>'
	+ '{{/for}}'
	+ '{{for true ~item=#data}}'
		+ '<input data-link="~item.name + #data"/>'
	+ '{{/for}}'
	)
		.link("#result", data);

	$("#result input").each(function(i, el) {
		result += el.value + " | ";
	});

	$.observable(data).setProperty("name", "new");

	$("#result input").each(function(i, el) {
		result += el.value + " | ";
	});

	// ............................... Assert .................................
	equal(result,
	"Josome string | Jo22 | Jo0 | Jofalse | Jo | Jotrue | newsome string | new22 | new0 | newfalse | new | newtrue | ",
	'data-linking inside {{for sometype}} works correctly even when #data is not an object');

	// ................................ Reset ................................
	$("#result").empty();

	// ................................ Act ..................................
	data = { name: "Jo" };
	result = "";

	$.templates(
	'{^{for "some string" ~item=#data}}'
		+ '<input data-link="~item.name + #data"/>'
	+ '{{/for}}'
	+ '{^{for 22 ~item=#data}}'
		+ '<input data-link="~item.name + #data"/>'
	+ '{{/for}}'
	+ '{^{for 0 ~item=#data}}'
		+ '<input data-link="~item.name + #data"/>'
	+ '{{/for}}'
	+ '{^{for false ~item=#data}}'
		+ '<input data-link="~item.name + #data"/>'
	+ '{{/for}}'
	+ '{^{for "" ~item=#data}}'
		+ '<input data-link="~item.name + #data"/>'
	+ '{{/for}}'
	+ '{^{for true ~item=#data}}'
		+ '<input data-link="~item.name + #data"/>'
	+ '{{/for}}'
	)
		.link("#result", data);

	$("#result input").each(function(i, el) {
		result += el.value + " | ";
	});

	$.observable(data).setProperty("name", "new");

	$("#result input").each(function(i, el) {
		result += el.value + " | ";
	});

	// ............................... Assert .................................
	equal(result,
	"Josome string | Jo22 | Jo0 | Jofalse | Jo | Jotrue | newsome string | new22 | new0 | newfalse | new | newtrue | ",
	'data-linking inside {^{for sometype}} works correctly even when #data is not an object');

	// ................................ Reset ................................
	$("#result").empty();
	result = "";

	$.views.settings.debugMode(false);
});

test('data-link="attr{:expression}"', function() {

	// ................................ Reset ................................
	person1.lastName = "One"; // reset Prop

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

	// ................................ Reset ................................
	$("#result").empty();
	person1.lastName = "One"; // reset Prop

	// =============================== Arrange ===============================

	$.templates('prop: <span data-link="title{:lastName}"></span>')
		.link("#result", person1);

	// ................................ Act ..................................
	var html = $("#result span")[0].outerHTML;
	before = $("#result span")[0].getAttribute("title");
	$.observable(person1).setProperty("lastName", null);
	after = $("#result span")[0].getAttribute("title");

	// ............................... Assert .................................
	ok(before === 'One' && after === null && html === isIE8 ? ("<SPAN data-link=\"title{:lastName}\""
		+ html.slice(34)) : "<span data-link=\"title{:lastName}\"></span>",
	'Data link using: <span data-link="title{:lastName}"></span>, and setting lastName to null - removes title attribute');

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

	// ................................ Reset ................................
	$("#result").empty();
	person1.lastName = "One"; // reset Prop

	// =============================== Arrange ===============================

	$.templates('prop: <span data-link="data-foo{:lastName}"></span>')
		.link("#result", person1);

	// ................................ Act ..................................
	before = $("#result span")[0].getAttribute("data-foo");
	var beforeVal = $("#result span").data("foo");
	$.observable(person1).setProperty("lastName", "Two");
	after = $("#result span")[0].getAttribute("data-foo");
	var afterVal = $("#result span").data("foo");
	
	// ............................... Assert .................................
	ok(before === 'One' && before === beforeVal && after === "Two" && after === afterVal,
	'Data link using: <span data-link="data-foo{:lastName}"></span> sets data-foo attribute to lastName value and sets $(elem).data("foo") to the same value');

	// ................................ Reset ................................
	$("#result").empty();
	person1.lastName = "One"; // reset Prop

	// =============================== Arrange ===============================

	var originalAddress = person1.home.address;
	$.templates('prop: <span data-link="data-foo{:home.address}"></span>')
		.link("#result", person1);

	// ................................ Act ..................................
	before = $("#result span")[0].getAttribute("data-foo");
	var beforeVal = $("#result span").data("foo");
	var crazyAddress = [1,2];
	$.observable(person1.home).setProperty("address", crazyAddress);
	after = $("#result span")[0].getAttribute("data-foo");
	var afterVal = $("#result span").data("foo");
	
	// ............................... Assert .................................
	ok(before === originalAddress.toString() && beforeVal === originalAddress && after === crazyAddress.toString() && afterVal === crazyAddress,
	'Data link using: <span data-link="data-foo{:home.address}"></span> sets data-foo attribute to address.toString() value and sets $(elem).data("foo") to address');

	// ................................ Reset ................................
	$("#result").empty();
	person1.lastName = "One"; // reset Prop
	person1.home.address = originalAddress; // reset Prop

	// =============================== Arrange ===============================

	$.templates('prop: <span data-link="data-foo{:lastName} data-foo-bar{:lastName} a-b-c{:lastName} a_b_c-d-e{:lastName}"></span>')
		.link("#result", person1);

	// ................................ Act ..................................
	var el = $("#result span")[0];
	before = el.getAttribute("data-foo") + el.getAttribute("data-foo-bar") + el.getAttribute("a-b-c") + el.getAttribute("a_b_c-d-e");
	$.observable(person1).setProperty("lastName", "Two");
	after = el.getAttribute("data-foo") + el.getAttribute("data-foo-bar") + el.getAttribute("a-b-c") + el.getAttribute("a_b_c-d-e");

	// ............................... Assert .................................
	ok(before === 'OneOneOneOne' && after === "TwoTwoTwoTwo",
	'Data link using: data-link="data-foo{:lastName} data-foo-bar{:lastName} a-b-c{:lastName} a_b_c-d-e{:lastName}" sets attributes to lastName value');

	// ................................ Reset ................................
	$("#result").empty();
	person1.lastName = "One"; // reset Prop

	// =============================== Arrange ===============================

	$.templates('prop: <span data-link="a-b_foo{:lastName}"></span>')
		.link("#result", person1);

	// ................................ Act ..................................
	before = $("#result span")[0].getAttribute("a-b_foo");
	$.observable(person1).setProperty("lastName", "Two");
	after = $("#result span")[0].getAttribute("a-b_foo");

	// ............................... Assert .................................
	ok(before === 'One' && after === "Two",
	'Data link using: <span data-link="a-foo{:lastName}"></span> sets data-foo attribute to lastName value');

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
	'Data link using: <span data-link="visible{:lastName}"></span>, and string lastName to false - sets display to "none"');

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
	$.observable(person1).setProperty("lastName", "One");
	var reset = $("#result span")[0].style.display;

	// ............................... Assert .................................
	equal(before + "|" + after + "|" + reset, "inline|none|inline",
	'Data link using: <span data-link="visible{:lastName}"></span>, and toggling string lastName to "" and back - sets display to "inline"');

	// =============================== Arrange ===============================

	$.templates('prop: <span style="display:inline-block" data-link="visible{:lastName}"></span>')
		.link("#result", person1);

	// ................................ Act ..................................
	before = $("#result span")[0].style.display;
	$.observable(person1).setProperty("lastName", "");
	after = $("#result span")[0].style.display;
	$.observable(person1).setProperty("lastName", "One");
	reset = $("#result span")[0].style.display;

	// ............................... Assert .................................
	equal(before + "|" + after + "|" + reset, "inline-block|none|inline-block",
	'Data link using: <span style="display:inline-block" data-link="visible{:lastName}"></span>, and toggling lastName - sets display to "inline-block"');

	// =============================== Arrange ===============================

	$.templates('prop: <span style="display:none" data-link="visible{:lastName}"></span>')
		.link("#result", person1);

	// ................................ Act ..................................
	before = $("#result span")[0].style.display;
	$.observable(person1).setProperty("lastName", "");
	after = $("#result span")[0].style.display;
	$.observable(person1).setProperty("lastName", "One");
	reset = $("#result span")[0].style.display;

	// ............................... Assert .................................
	equal(before + "|" + after + "|" + reset, "inline|none|inline",
	'Data link using: <span style="display:none" data-link="visible{:lastName}"></span>, and toggling lastName - sets display to "inline"');

	// =============================== Arrange ===============================

	$.templates('prop: <div style="display:none" data-link="visible{:missing}"></div>')
		.link("#result", person1);

	// ................................ Act ..................................
	before = $("#result div")[0].style.display;
	$.observable(person1).setProperty("missing", "foo");
	after = $("#result div")[0].style.display;
	$.observable(person1).setProperty("missing", "");
	reset = $("#result div")[0].style.display;

	// ............................... Assert .................................
	equal(before + "|" + after + "|" + reset, "none|block|none",
	'Data link using: <div style="display:none" data-link="visible{:missing}"></div>, and toggling lastName - sets display to "block"');

	// ................................ Reset ................................
	delete person1.missing;

	// =============================== Arrange ===============================

	$.templates('prop: <div style="display:none" data-link="visible{:lastName}"></div>')
		.link("#result", person1);

	// ................................ Act ..................................
	before = $("#result div")[0].style.display;
	$.observable(person1).setProperty("lastName", "");
	after = $("#result div")[0].style.display;
	$.observable(person1).setProperty("lastName", "One");
	reset = $("#result div")[0].style.display;

	// ............................... Assert .................................
	equal(before + "|" + after + "|" + reset, "block|none|block",
	'Repeat (block style for div is now cached) data link using:'
	+ ' <div style="display:none" data-link="visible{:missing}"></div>, and toggling lastName - sets display to "block"');

	// =============================== Arrange ===============================

	$.templates('prop: <para style="display:block" data-link="visible{:missing}"></para>')
		.link("#result", person1);

	// ................................ Act ..................................
	before = $("#result [style]")[0].style.display;
	$.observable(person1).setProperty("missing", "foo");
	after = $("#result [style]")[0].style.display;
	$.observable(person1).setProperty("missing", "");
	reset = $("#result [style]")[0].style.display;

	// ............................... Assert .................................
	equal(before + "|" + after + "|" + reset, "none|block|none",
	'Data link using: <para data-link="visible{:missing}"></para>, and toggling lastName - sets display to "block"');

	// ................................ Reset ................................
	$("#result").empty();
	person1.lastName = "One"; // reset Prop

	// =============================== Arrange ===============================

	$.views.converters({
		not: function(val) {
			return !val;
		}
	});

	$.templates('prop: <span data-link="visible{not:lastName}">No name</span>')
		.link("#result", person1);

	// ................................ Act ..................................
	before = $("#result span")[0].style.display;
	$.observable(person1).setProperty("lastName", "");
	after = $("#result span")[0].style.display;
	$.observable(person1).setProperty("lastName", "One");
	reset = $("#result span")[0].style.display;

	// ............................... Assert .................................
	equal(before + "|" + after + "|" + reset, "none|inline|none",
	'Data link using: <span data-link="visible{not:lastName}"></span>, and toggling lastName - sets display to "inline" if lastName is ""');

	// ................................ Reset ................................
	$("#result").empty();
	person1.lastName = "One"; // reset Prop

	// =============================== Arrange ===============================

	$.views.tags({
		chooseAttr: {
			init: function(tagCtx, linkCtx, ctx) {
				if (this.tagCtx.props.tagAttr) {
					this.attr = this.tagCtx.props.tagAttr;
				}
				if (this.tagCtx.props.linkCtxAttr) {
					linkCtx.attr = this.tagCtx.props.linkCtxAttr;
				}
			},
			render: function(val) {
				return val.name ? val.name + "<br/>" : "";
			},
			attr: "text",
			depends: "name"
		}
	});

	var thing = { name: "box" };

	function divProps() {
		var div = $("#result div")[0];
		return "title: " + div.title + " - innerHTML: " + div.innerHTML + " - display: " + div.style.display;
	}

	// ................................ Act ..................................
	$.templates('<div data-link="{chooseAttr}">xx</div>')
		.link("#result", thing);

	// ............................... Assert .................................
	equal(divProps(), "title:  - innerHTML: box&lt;br/&gt; - display: ",
		"{chooseAttr} has target 'text'");

	// ................................ Act ..................................
	$.templates('<div data-link="{chooseAttr tagAttr=\'title\'}">xx</div>')
		.link("#result", thing);

	// ............................... Assert .................................
	equal(divProps(), "title: box<br/> - innerHTML: xx - display: ",
		"{chooseAttr tagAttr=\'title\'} overrides tag.attr, and has target 'title'");

	// ................................ Act ..................................
	$.templates('<div data-link="{chooseAttr tagAttr=\'html\'}">xx</div>')
		.link("#result", thing);

	// ............................... Assert .................................
	equal(divProps(), "title:  - innerHTML: box" + (isIE8 ? "<BR>" : "<br>") + " - display: ",
		"{chooseAttr tagAttr=\'html\'} overrides tag.attr, and has target 'html'");

	// ................................ Act ..................................
	$.templates('<div data-link="{chooseAttr linkCtxAttr=\'title\' tagAttr=\'html\'}">xx</div>')
		.link("#result", thing);

	// ............................... Assert .................................
	equal(divProps(), "title: box<br/> - innerHTML: xx - display: ",
		"{chooseAttr linkCtxAttr=\'title\' tagAttr=\'html\'} overrides linkCtx.attr, and has target 'title'");

	// ................................ Act ..................................
	$.templates('<div data-link="html{chooseAttr}">xx</div>')
		.link("#result", thing);

	// ............................... Assert .................................
	equal(divProps(), "title:  - innerHTML: box" + (isIE8 ? "<BR>" : "<br>") + " - display: ",
		"html{chooseAttr} has target 'html'");

	// ................................ Act ..................................
	$.templates('<div data-link="html{chooseAttr tagAttr=\'title\'}">xx</div>')
		.link("#result", thing);

	// ............................... Assert .................................
	equal(divProps(), "title:  - innerHTML: box" + (isIE8 ? "<BR>" : "<br>") + " - display: ",
		"html{chooseAttr tagAttr =\'title\'} overrides tag.attr, but still has target 'html'");

	// ................................ Act ..................................
	$.templates('<div data-link="html{chooseAttr tagAttr=\'html\' linkCtxAttr=\'title\'}">xx</div>')
		.link("#result", thing);

	// ............................... Assert .................................
	equal(divProps(), "title: box<br/> - innerHTML: xx - display: ",
		"html{chooseAttr tagAttr =\'html\' linkCtxAttr=\'title\'} overrides tag.attr and linkCtx.attr, and has target 'title'");

	// ................................ Act ..................................
	$.templates('<div data-link="visible{chooseAttr}">xx</div>')
		.link("#result", thing);

	// ............................... Assert .................................
	equal(divProps(), "title:  - innerHTML: xx - display: block",
		"visible{chooseAttr} has display 'block'");

	// ................................ Act ..................................
	$.observable(thing).removeProperty("name");

	// ............................... Assert .................................
	equal(divProps(), "title:  - innerHTML: xx - display: none",
		"visible{chooseAttr} has display 'none' if {chooseAttr} returns ''");

	// ................................ Act ..................................
	thing.name = "box";
	$.templates('<div data-link="visible{chooseAttr tagAttr=\'title\'}">xx</div>')
		.link("#result", thing);

	// ............................... Assert .................................
	equal(divProps(), "title:  - innerHTML: xx - display: block",
		"visible{chooseAttr tagAttr=\'title\'} overrides tag.attr, but still has target 'visible' and has display 'block'");

	// ................................ Act ..................................
	$.templates('<div data-link="visible{chooseAttr tagAttr=\'title\' linkCtxAttr=\'html\'}">xx</div>')
		.link("#result", thing);

	// ............................... Assert .................................
	equal(divProps(), "title:  - innerHTML: box" + (isIE8 ? "<BR>" : "<br>") + " - display: ",
		"visible{chooseAttr tagAttr=\'title\' linkCtxAttr=\'html\'} overrides tag.attr and linkCtx.attr, and has target 'html'");

	// ................................ Act ..................................
	$.templates('<div data-link="visible{chooseAttr tagAttr=\'html\' linkCtxAttr=\'title\'}">xx</div>')
		.link("#result", thing);

	// ............................... Assert .................................
	equal(divProps(), "title: box<br/> - innerHTML: xx - display: ",
		"visible{chooseAttr tagAttr=\'html\' linkCtxAttr=\'title\'} overrides tag.attr and linkCtx.attr, and has target 'title'");

	// ................................ Reset ................................
	$("#result").empty();
	result = "";
});

test('data-link="{cvt:expression:cvtBack}"', function() {

	// ................................ Reset ................................
	$("#result").empty();
	person1._firstName = "Jo"; // reset Prop
	person1.lastName = "One"; // reset Prop
	person2._firstName = "Xavier"; // reset Prop
	person2.lastName = "Two"; // reset Prop
	settings.title = "Mr"; // reset Prop
	settings.width = 30; // reset Prop

	// =============================== Arrange ===============================

	$.templates('prop: <span data-link="{upper_:lastName true added=firstName()}"></span>')
		.link("#result", person2);

	// ................................ Act ..................................
	before = $("#result span").html();
	$.observable(person1).setProperty({ firstName: "newOneFirst", lastName: "newOneLast" });
	$.observable(person2).setProperty({ firstName: "newTwoFirst", lastName: "newTwoLast" });
	$.observable(settings).setProperty({ title: "Sir", width: 40 });
	after = $("#result span").html();

	// ............................... Assert .................................
	equal(before + "|" + after,
	"mr jotwo30Mr Xavier|sir newonefirstnewtwolast40Sir newTwoFirst",
	'Data link using: <span data-link="{cvt:expr ...}"></span> - with declared dependencies for converter');

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
			to: function(val) {
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
			to: function(val) {
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

	// ................................ Act ..................................
	value = $("#twoWayInner").val();
	$("#twoWayInner").val(value + "+").change();

	// ............................... Assert .................................
	equal(person1.lastName,
	"OnefromMr Jo+toMr JofromMr Jo+toMr Jo",
	'Data link using: <input data-link="{from:expr:to}"/> in nested block - with converters local to template: convert and convertBack called with tag as this pointer.');

	// ................................ Reset ................................
	$("#result").empty();
	person1.lastName = "One"; // reset Prop
});

test('data-link="{for...}"', function() {

	// =============================== Arrange ===============================

	model.things = [{ thing: "box" }]; // reset Prop

	var tmpl = $.templates('<span data-link="{for things tmpl=\'inner\'}"></span>');
	$.templates("inner", "{^{:thing}}", tmpl);

	tmpl.link("#result", model);

	// ................................ Act ..................................
	before = $("#result").text();
	$.observable(model.things).insert(0, { thing: "tree" });
	after = $("#result").text();

	// ............................... Assert .................................
	equal(before + "|" + after, 'box|treebox',
	'data-link="{for things}" binds to array changes on leaf array.');

	// ................................ Act ..................................
	$.observable(model).setProperty({ things: [{ thing: "triangle" }, { thing: "circle" }] });
	after = $("#result").text();

	// ............................... Assert .................................
	equal(after, 'trianglecircle',
	'data-link="{for things}" binds to property change on path');

	// ................................ Act ..................................
	$.observable(model).setProperty({ things: { thing: "square" } });
	after = $("#result").text();

	// ............................... Assert .................................
	equal(after, 'square',
	'data-link="{for things}" binds to property change on path - swapping from array to singleton object');

	// ................................ Act ..................................
	$.observable(model.things).setProperty("thing", "square2");
	after = $("#result").text();

	// ............................... Assert .................................
	equal(after, 'square2',
	'data-link="{for things tmpl=...}" supports live binding within the template content');

	// =============================== Arrange ===============================

	model.things = [{ thing: "box" }]; // reset Prop
	model.emptyText = "None"; // reset Prop

	tmpl = $.templates('<span data-link="{for things tmpl=\'inner\'}{else tmpl=\'empty\'}"></span>');
	$.templates({
		inner: "{^{:thing}}",
		empty: "{^{:emptyText}}"
	}, tmpl);

	tmpl.link("#result", model);

	// ................................ Act ..................................
	before = $("#result").text();
	$.observable(model.things).insert(0, { thing: "tree" });
	after = $("#result").text();

	// ............................... Assert .................................
	equal(before + "|" + after, 'box|treebox',
	'data-link="{for things}{else ...}" binds to array changes on leaf array.');

	// ................................ Act ..................................
	before = $("#result").text();
	$.observable(model.things).remove(0, 2);
	after = $("#result").text();

	// ............................... Assert .................................
	equal(before + "|" + after, 'treebox|None',
	'data-link="{for things}{else ...}" renders {{else}} block when array is emptied');

	// ................................ Act ..................................
	$.observable(model).setProperty({ things: [{ thing: "triangle" }, { thing: "circle" }] });
	after = $("#result").text();

	// ............................... Assert .................................
	equal(after, 'trianglecircle',
	'data-link="{for things}{else ...}" binds to property change on path');

	// ................................ Act ..................................
	$.observable(model).setProperty({ things: { thing: "square" } });
	after = $("#result").text();

	// ............................... Assert .................................
	equal(after, 'square',
	'data-link="{for things}{else ...}" binds to property change on path - swapping from array to singleton object');

	// ................................ Act ..................................
	$.observable(model.things).setProperty("thing", "square2");
	after = $("#result").text();

	// ............................... Assert .................................
	equal(after, 'square2',
	'data-link="{for things tmpl=...}{else ...}" supports live binding within the {for} template content');

	// ................................ Act ..................................
	$.observable(model).removeProperty("things");
	after = $("#result").text();

	// ............................... Assert .................................
	equal(after, 'None',
	'data-link="{for things tmpl=...}{else tmpl=...}" binds to removeProperty change on path - and renders {{else}} block');

	// ................................ Act ..................................
	$.observable(model).setProperty("emptyText", "No things");
	after = $("#result").text();

	// ............................... Assert .................................
	equal(after, 'No things',
	'data-link="{for things tmpl=...}{else tmpl=...}" supports live binding within the {else} template content');

	// =============================== Arrange ===============================

	model.things = [{ thing: "box" }]; // reset Prop

	tmpl = $.templates('<span data-link="title{for things tmpl=\'inner\'}{else tmpl=\'None\'}"></span>');
	$.templates("inner", "{{:thing}}", tmpl);

	tmpl.link("#result", model);

	// ................................ Act ..................................
	var elem = $("#result span")[0];
	before = elem.title;
	$.observable(model.things).insert(0, { thing: "tree" });
	after = elem.title;

	// ............................... Assert .................................
	equal(before + "|" + after, 'box|treebox',
	'data-link="title{for things}{else ...}" binds to array changes on leaf array.');

	// ................................ Act ..................................
	before = elem.title;
	$.observable(model.things).remove(0, 2);
	after = elem.title;

	// ............................... Assert .................................
	equal(before + "|" + after, 'treebox|None',
	'data-link="title{for things}{else ...} renders {{else}} block when array is emptied');

	// ................................ Act ..................................
	$.observable(model).setProperty({ things: [{ thing: "triangle" }, { thing: "circle" }] });
	after = elem.title;

	// ............................... Assert .................................
	equal(after, 'trianglecircle',
	'data-link="title{for things}{else ...} binds to property change on path');

	// ................................ Act ..................................
	$.observable(model).setProperty({ things: { thing: "square" } });
	after = elem.title;

	// ............................... Assert .................................
	equal(after, 'square',
	'data-link="title{for things}{else ...} binds to property change on path - swapping from array to singleton object');

	// ................................ Act ..................................
	$.observable(model.things).setProperty("thing", "square2");
	after = elem.title;

	// ............................... Assert .................................
	equal(after, 'square',
	'data-link="title{for things tmpl=...}{else ...}" Non html targets (e.g. title) do not support live binding within the {for} template content');

	// ................................ Act ..................................
	$.observable(model).removeProperty("things");
	after = elem.title;

	// ............................... Assert .................................
	equal(after, 'None',
	'data-link="title{for things}{else ...}" binds to removeProperty change on path - and renders {{else}} block');

	// ................................ Act ..................................
	$.observable(model.things).setProperty("emptyText", "No things");
	after = elem.title;

	// ............................... Assert .................................
	equal(after, 'None',
	'data-link="title{for things tmpl=...}{else tmpl=...}" Non html targets (e.g. title) do not support live binding within the {else} template content');

	// =============================== Arrange ===============================

	model.things = [{ thing: "box" }]; // reset Prop

	var countItems = 0;
	tmpl = $.templates('<span data-link="{for things tmpl=\'inner\'}"></span>');

	$.templates("inner", "{{test:thing}}", tmpl);
	$.views.converters("test", function(val) {
		return val + countItems++;
	}, tmpl);

	tmpl.link("#result", model);

	// ................................ Act ..................................
	before = $("#result").text();
	$.observable(model.things).insert([{ thing: "addedA" }, { thing: "addedB" }]);
	after = $("#result").text();

	// ............................... Assert .................................
	equal(before + "|" + after, 'box0|box0addedA1addedB2',
	'data-link="{for things}" binds to array changes and the changes are rendered incrementally');

	// =============================== Arrange ===============================

	model.things = [{ thing: "box" }]; // reset Prop
	countItems = 0;

	tmpl = $.templates('<ul data-link="{for things tmpl=\'inner\'}"></ul>');

	$.templates("inner", "<li>{{test:thing}}</li>", tmpl);
	$.views.converters("test", function(val) {
		return val + countItems++;
	}, tmpl);

	tmpl.link("#result", model);

	// ................................ Act ..................................
	before = $("#result").text();
	$.observable(model.things).insert([{ thing: "addedA" }, { thing: "addedB" }]);
	after = $("#result").text();

	// ............................... Assert .................................
	equal(before + "|" + after, 'box0|box0addedA1addedB2',
	'data-link="{for things}" in elCnt binds to array changes and the changes are rendered incrementally');

	// ................................ Reset ................................
	$("#result").empty();
	model.things = []; // reset Prop
});

test('data-link="{if...}"', function() {

	// =============================== Arrange ===============================

	var data = {
		format: 1,
		first: "Jo",
		last: "Sanders"
	};

	var tmpl = $.templates(
		'<span data-link="{if format===1 tmpl=\'format1\'}{else format===2 tmpl=\'format2\'}{else tmpl=\'format3\'}"></span>'
		+ '<span>{^{if format===1 tmpl=\'format1\'}}{{else format===2 tmpl=\'format2\'}}{{else tmpl=\'format3\'}}{{/if}}</span>');

	$.templates({
		format1: "{^{:first}} {^{:last}}",
		format2: "{^{:last}} {^{:first}}",
		format3: "{^{:last}} ({^{:first}})"
	}, tmpl);

	tmpl.link("#result", data);

	var element1 = $($("#result span")[0]);
	var element2 = $($("#result span")[1]);

	// ................................ Act ..................................
	var res = element1.text() + "/" + element2.text();

	$.observable(data).setProperty("format", 2);
	res += "|" + element1.text() + "/" + element2.text();

	$.observable(data).setProperty("format", 3);
	res += "|" + element1.text() + "/" + element2.text();

	$.observable(data).setProperty("format", 1);
	res += "|" + element1.text() + "/" + element2.text();

	$.observable(data).setProperty("first", "Jo2");
	res += "|" + element1.text() + "/" + element2.text();

	$.observable(data).setProperty("last", "Sanders2");
	res += "|" + element1.text() + "/" + element2.text();

	// ............................... Assert .................................
	equal(res, isIE8
		? "Jo Sanders/Jo Sanders|Sanders Jo/Sanders Jo|Sanders (Jo)/Sanders (Jo)|Jo Sanders/Jo Sanders|Jo2 Sanders/Jo2 Sanders|Jo2Sanders2/Jo2Sanders2"
		: "Jo Sanders/Jo Sanders|Sanders Jo/Sanders Jo|Sanders (Jo)/Sanders (Jo)|Jo Sanders/Jo Sanders|Jo2 Sanders/Jo2 Sanders|Jo2 Sanders2/Jo2 Sanders2",
	'<span data-link="{if expr ...}{else expr2...}{else ...}"></span> is equivalent to <span>{^{if expr ...}}{{else expr2...}}{{else ...}}{{/if}}</span>');

	// =============================== Arrange ===============================
	data = {
		format: 1,
		first: "Jo",
		last: "Sanders"
	};

	tmpl = $.templates(
		'<span data-link="title{if format===1 tmpl=\'format1\'}{else format===2 tmpl=\'format2\'}{else tmpl=\'format3\'}"></span>');

	$.templates({
		format1: "{^{:first}} {^{:last}}",
		format2: "{^{:last}} {^{:first}}",
		format3: "{^{:last}} ({^{:first}})"
	}, tmpl);

	tmpl.link("#result", data);

	element1 = $("#result span")[0];

	// ................................ Act ..................................
	res = element1.title;

	$.observable(data).setProperty("format", 2);
	res += "|" + element1.title;

	$.observable(data).setProperty("format", 3);
	res += "|" + element1.title;

	$.observable(data).setProperty("format", 1);
	res += "|" + element1.title;

	// ............................... Assert .................................
	equal(res, "Jo Sanders|Sanders Jo|Sanders (Jo)|Jo Sanders",
	'<span data-link="title{if expr ...}{else expr2...}{else ...}"></span> binds and updates correctly when expr and expr2 change');

	// ................................ Act ..................................
	res = element1.title;

	$.observable(data).setProperty("first", "Jo2");
	res += "|" + element1.title;

	$.observable(data).setProperty("last", "Sanders2");
	res += "|" + element1.title;

	// ............................... Assert .................................
	equal(res, "Jo Sanders|Jo Sanders|Jo Sanders",
	'data-link="title{if expr tmpl=...}{else expr2 tmpl=...}...": Non html targets (e.g. title) do not support live binding within the {if} and {else} template content');

	// ................................ Reset ................................
	$("#result").empty();
	model.things = []; // reset Prop
});

test('data-link="{tag...}"', function() {

	// ................................ Reset ................................
	$("#result").empty();
	person1._firstName = "Jo"; // reset Prop
	person1.lastName = "One"; // reset Prop
	settings.title = "Mr"; // reset Prop
	settings.width = 30; // reset Prop

	// =============================== Arrange ===============================
	$.views.tags({
		norendernotemplate: {},
		voidrender: function() { },
		emptyrender: function() { return ""; },
		emptytemplate: {
			template: ""
		},
		templatereturnsempty: {
			template: "{{:a}}"
		}
	});

	// ............................... Assert .................................
	$.templates('a<span date-link="{norendernotemplate}"></span>b').link("#result", 1);
	equal($("#result").text(), "ab",
	"non-rendering tag (no template, no render function) renders empty string");

	$.templates('a<span date-link="{voidrender}"></span>b').link("#result", 1);
	equal($("#result").text(), "ab",
	"non-rendering tag (no template, no return from render function) renders empty string");

	$.templates('a<span date-link="{emptyrender}"></span>b').link("#result", 1);
	equal($("#result").text(), "ab",
	"non-rendering tag (no template, empty string returned from render function) renders empty string", 1);

	$.templates('a<span date-link="{emptytemplate}"></span>b').link("#result", 1);
	equal($("#result").text(), "ab",
	"non-rendering tag (template has no content, no render function) renders empty string");

	$.templates('a<span date-link="{templatereturnsempty}"></span>b').link("#result", 1);
	equal($("#result").text(), "ab",
	"non-rendering tag (template returns empty string, no render function) renders empty string");

	// =============================== Arrange ===============================

	$.templates('<span data-link="{tmplTag}"></span>')
		.link("#result", person1, { settings: settings });

	// ................................ Act ..................................
	before = $("#result span").text();
	$.observable(person1).setProperty({ firstName: "newFirst", lastName: "newLast" });
	$.observable(settings).setProperty({ title: "Sir", width: 40 });
	$.observable(person1).setProperty({ fullName: "compFirst compLast" });
	after = $("#result span").text();

	// ............................... Assert .................................
	equal(before + "|" + after,
	'Name: Mr Jo. Width: 30|Name: Sir compFirst. Width: 40',
	'Data link using: <span data-link="{tmplTag}"></span>');

	// ................................ Reset ................................
	$("#result").empty();
	person1._firstName = "Jo"; // reset Prop
	person1.lastName = "One"; // reset Prop
	settings.title = "Mr"; // reset Prop
	settings.width = 30; // reset Prop

	// =============================== Arrange ===============================

	$.templates('<span data-link="{fnTag}"></span>')
		.link("#result", person1, { settings: settings });

	// ................................ Act ..................................
	before = $("#result span").text();
	$.observable(person1).setProperty({ firstName: "newFirst", lastName: "newLast" });
	$.observable(settings).setProperty({ title: "Sir", width: 40 });
	$.observable(person1).setProperty({ fullName: "compFirst compLast" });
	after = $("#result span").text();

	// ............................... Assert .................................
	equal(before + "|" + after,
	'Name: Mr Jo. Width: 30|Name: Sir compFirst. Width: 40',
	'Data link using: <span data-link="{fnTag}"></span>');

	// ................................ Reset ................................
	$("#result").empty();
	person1._firstName = "Jo"; // reset Prop
	person1.lastName = "One"; // reset Prop
	settings.title = "Mr"; // reset Prop
	settings.width = 30; // reset Prop

	// =============================== Arrange ===============================

	$.templates('<div data-link="{fnTagEl}"></div>')
		.link("#result", person1, { settings: settings });

	// ................................ Act ..................................
	before = $("#result div").html();
	$.observable(person1).setProperty({ firstName: "newFirst", lastName: "newLast" });
	$.observable(settings).setProperty({ title: "Sir", width: 40 });
	$.observable(person1).setProperty({ fullName: "compFirst compLast" });
	after = $("#result div").html();

	// ............................... Assert .................................
	equal(before + "|" + after,
	isIE8 ? '<SPAN>Name: Mr Jo. Width: 30</SPAN>|<SPAN>Name: Sir compFirst. Width: 40</SPAN>' : '<span>Name: Mr Jo. Width: 30</span>|<span>Name: Sir compFirst. Width: 40</span>',
	'Data link fnTagEl rendering <span>, using: <div data-link="{fnTagEl}"></div>');

	// ................................ Reset ................................
	$("#result").empty();
	person1._firstName = "Jo"; // reset Prop
	person1.lastName = "One"; // reset Prop
	settings.title = "Mr"; // reset Prop
	settings.width = 30; // reset Prop

	// =============================== Arrange ===============================

	$.templates('<ul data-link="{fnTagElCnt}"></ul>')
		.link("#result", person1, { settings: settings });

	// ................................ Act ..................................
	before = $("#result ul li").html(); // The innerHTML will be "<li data-jsv=\"#25_\">Name: Mr Jo. Width: 30</li>"
	$.observable(person1).setProperty({ firstName: "newFirst", lastName: "newLast" });
	$.observable(settings).setProperty({ title: "Sir", width: 40 });
	$.observable(person1).setProperty({ fullName: "compFirst compLast" });
	after = $("#result ul li").html();

	// ............................... Assert .................................
	equal(before + "|" + after,
	'Name: Mr Jo. Width: 30|Name: Sir compFirst. Width: 40',
	'Data link fnTagElCnt rendering <li>, using: <ul data-link="{fnTagElCnt}"></ul>');

	// ................................ Reset ................................
	$("#result").empty();
	person1._firstName = "Jo"; // reset Prop
	person1.lastName = "One"; // reset Prop
	settings.title = "Mr"; // reset Prop
	settings.width = 30; // reset Prop

	// =============================== Arrange ===============================

	$.templates('<ul data-link="{fnTagElCntNoInit firstName ~settings.width}"></ul>')
		.link("#result", person1, { settings: settings });

	// ................................ Act ..................................
	before = $("#result ul li").html(); // The innerHTML will be "<li data-jsv=\"#25_\">Name: Mr Jo. Width: 30</li>"
	$.observable(person1).setProperty({ firstName: "newFirst", lastName: "newLast" });
	$.observable(settings).setProperty({ title: "Sir", width: 40 });
	$.observable(person1).setProperty({ fullName: "compFirst compLast" });
	after = $("#result ul li").html();

	// ............................... Assert .................................
	equal(before + "|" + after,
	'Name: Mr Jo. Width: 30|Name: Sir compFirst. Width: 40',
	'Data link fnTagElCntNoInit rendering <li>, using: <ul data-link="{fnTagElCnt}"></ul>');

	// ................................ Reset ................................
	$("#result").empty();
	person1._firstName = "Jo"; // reset Prop
	person1.lastName = "One"; // reset Prop
	settings.title = "Mr"; // reset Prop
	settings.width = 30; // reset Prop

	// =============================== Arrange ===============================

	$.templates('<span data-link="{tmplTagWithProps #data ~settings.reverse theTitle=~settings.title ~street=home.address.street}"></span>')
		.link("#result", person1, { settings: settings });

	// ................................ Act ..................................
	before = $("#result span").text();
	$.observable(person1).setProperty({ firstName: "newFirst", lastName: "newLast", "home.address.street": "newStreet" });
	$.observable(settings).setProperty({ title: "Sir", width: 40, reverse: false });
	$.observable(person1).setProperty({ fullName: "compFirst compLast" });
	after = $("#result span").text();

	// ............................... Assert .................................
	equal(before + "|" + after,
	'Name: Mr Jo. Width: 30. Value: true. Prop theTitle: Mr. Prop ~street: StreetOne|Name: Sir compFirst. Width: 40. Value: false.'
	+ ' Prop theTitle: Sir. Prop ~street: newStreet',
	'Data link using: <span data-link="{tmplTagWithProps ~some.path foo=~other.path ~bar=another.path}"></span> updates correctly when data changes');

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
		.link("#result", person1, { settings: settings });

	// ................................ Act ..................................
	before = $("#result span").text();
	$.observable(person1).setProperty({ firstName: "newFirst", lastName: "newLast", "home.address.street": "newStreet" });
	$.observable(settings).setProperty({ title: "Sir", width: 40, reverse: false });
	$.observable(person1).setProperty({ fullName: "compFirst compLast" });
	after = $("#result span").text();

	// ............................... Assert .................................
	equal(before + "|" + after,
	'Name: Mr Jo. Width: 30. Value: true. Prop theTitle: Mr. Prop ~street: StreetOne|Name: Sir compFirst. Width: 40. Value: false.'
	+ ' Prop theTitle: Sir. Prop ~street: newStreet',
	'Data link using: <span data-link="{fnTagWithProps ~some.path foo=~other.path ~bar=another.path}"></span> updates correctly when data changes');

	// ................................ Reset ................................
	$("#result").empty();
	person1._firstName = "Jo"; // reset Prop
	person1.lastName = "One"; // reset Prop
	settings.title = "Mr"; // reset Prop
	settings.width = 30; // reset Prop
	settings.reverse = true; // reset Prop
	address1.street = "StreetOne"; // reset Prop

});

test("Computed observables in paths", function() {

	// =============================== Arrange ===============================
	var app = {
		items: [
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
		]
	};

	function testTemplate(message, template) {
		$.templates(template)
		.link("#result", app, {
			getItems: function(exp) {
				return exp ? ["a", "b"] : [];
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
		equal(ret, "onetwothree|one1a1btwothree|onetwothree|onetwo2a2bthree|onetwothree|addedonetwothree|onetwothree|",
			"Interplay of view and tag refresh in deep content: " + message);
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
		+ "<li><ul>{^{for ~getItems(expanded) ~row=row ~item=#data}}"
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
		people1 = [{ address: { street: "1 first street" } }],
		people2 = [{ address: { street: "1 second street" } }, { address: { street: "2 second street" } }],
		data1 = { value: "data1", people: people1 },
		data2 = { value: "data2", people: people2 };
	app = {
		alt: false,
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
	};

	function getData(type) {
		return this.alt ? data2 : data1;
	}

	getData.depends = function() {
		return [app, "alt"];
	};

	// ................................ Act ..................................
	$.templates("{^{for (getPeople()[index]||{})^address}}{^{:street}}{{/for}}").link("#result", app);

	ret = "|" + $("#result").text();

	// ................................ Act ..................................
	$.observable(app).setProperty("index", 0);
	ret += "|" + $("#result").text();

	// ................................ Act ..................................
	$.observable(people1[0].address).setProperty("street", "1 first streetB");
	ret += "|" + $("#result").text();

	// ................................ Act ..................................
	$.observable(people1[0]).setProperty("address", { street: "1 first swappedstreet" });
	ret += "|" + $("#result").text();

	// ................................ Act ..................................
	$.observable(app).setProperty("alt", true);
	ret += "|" + $("#result").text();

	// ................................ Act ..................................
	$.observable(app).setProperty("index", 1);
	ret += "|" + $("#result").text();

	// ................................ Act ..................................
	$.observable(people2[1]).setProperty("address", { street: "2 second swappedstreet" });
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
	people1 = [{ address: { street: "1 first street" } }, { address: { street: "2 first street" } }];
	people2 = [{ address: { street: "1 second street" } }, { address: { street: "2 second street" } }];
	data1 = { value: "data1", people: people1 };
	data2 = { value: "data2", people: people2 };

	// ................................ Act ..................................
	$.templates("{^{:(getData()^people[index]).address^street}}").link("#result", app);

	ret = $("#result").text();

	$.observable(app).setProperty("index", 1);
	ret += "|" + $("#result").text();

	$.observable(app).setProperty("index", 0);
	ret += "|" + $("#result").text();

	$.observable(people1[0].address).setProperty("street", "1 first streetB");
	ret += "|" + $("#result").text();

	// ................................ Act ..................................
	$.observable(people1[0]).setProperty("address", { street: "1 first swappedstreet" });
	ret += "|" + $("#result").text();

	// ................................ Act ..................................
	$.observable(app).setProperty("alt", true);
	ret += "|" + $("#result").text();

	$.observable(app).setProperty("index", 1);
	ret += "|" + $("#result").text();

	$.observable(people2[1]).setProperty("address", {street: "2 second swappedstreet"});
	ret += "|" + $("#result").text();

	$.observable(people2[1].address).setProperty("street", "2 second swappedstreetB");
	ret += "|" + $("#result").text();

	// ................................ Assert ..................................
	equal(ret, "1 first street|2 first street|1 first street|1 first streetB|1 first swappedstreet|1 second street|2 second street|2 second swappedstreet|2 second swappedstreetB",
		"deep paths with computed observables bind correctly to rest of path after computed returns new object");

	// ................................ Reset ................................
	$("#result").empty();

	//TODO allow the following to work by declaring getPeople as depending on collection change of app.alt ? people2 : people;
	//$.observable(people2).insert(1, {address:{street: "99 new street"}})
	//ret += "|" + $("#result").text();

	// =============================== Arrange ===============================
	function getValue(a) {
		return this.value + "_" + a;
	}
	function switchAlt() {
		$.observable(app).setProperty("alt", !app.alt);
	}

	app.alt = false;
	app.index = 0;
	people1 = [{ address: { street: "1 first street" } }];
	people2 = [{ address: { street: "1 second street" } }, { address: { street: "2 second street" } }];
	data1 = { value: "val1", people: people1, getValue: getValue },
	data2 = { value: "val2", people: people2, getValue: getValue },

	// ................................ Act ..................................
	$.templates("{^{:getData()^getValue(22)}}").link("#result", app);

	// ................................ Act ..................................
	$.observable(app).setProperty("alt", true);
	ret = "|A: " + $("#result").text();
	switchAlt();
	ret += "--" + $("#result").text(); // |A: val2_22--val1_22
	$("#result").empty();

	// ................................ Act ..................................
	$.templates("{^{for (getPeople())}}{^{:address.street}}{{/for}}").link("#result", app);
	ret += "|B: " + $("#result").text();
	switchAlt();
	ret += "--" + $("#result").text(); // |B: 1 first street--1 second street2 second street
	$("#result").empty();

	// ................................ Act ..................................
	$.templates("{^{for getPeople()}}{^{:address.street}}{{/for}}").link("#result", app);
	ret += "|C: " + $("#result").text();
	switchAlt();
	ret += "--" + $("#result").text(); // |C: 1 second street2 second street--1 first street
	$("#result").empty();

	// ................................ Act ..................................
	$.templates("{^{:(getData()^getValue(22))}}").link("#result", app);
	ret += "|D: " + $("#result").text();
	switchAlt();
	ret += "--" + $("#result").text(); // |D: val1_22--val2_22
	$("#result").empty();

	// ................................ Act ..................................
	$.templates("{^{:getData()^getValue((getData()^getValue(33)))}}").link("#result", app);
	ret += "|E: " + $("#result").text();
	switchAlt();
	ret += "--" + $("#result").text(); // E: val2_val2_33--val1_val1_33
	$("#result").empty();

	// ................................ Act ..................................
	$.templates("{^{:getData(getPeople(getData(alt || 2)^getValue())^length)^value}}").link("#result", app);
	ret += "|F: " + $("#result").text();
	switchAlt();
	ret += "--" + $("#result").text(); // |F: val1--val2
	$("#result").empty();

	// ................................ Act ..................................
	$.templates("{^{for (getPeople()[index]||{})^address}}{^{:street}}{{/for}}").link("#result", app);
	ret += "|G: " + $("#result").text();
	switchAlt();
	ret += "--" + $("#result").text(); // |G: 1 second street--1 first street
	$("#result").empty();

	// ................................ Act ..................................
	$.templates("{^{:(((getData())^people[0])^address.street)}}").link("#result", app);
	ret += "|H: " + $("#result").text();
	switchAlt();
	ret += "--" + $("#result").text(); // |H: 1 first street--1 second street
	$("#result").empty();

	// ................................ Act ..................................
	$.templates("{^{:'b'+((getData()^value) + ('a'+getData()^value)) + getData()^getValue(55)}}").link("#result", app);
	ret += "|I: " + $("#result").text();
	switchAlt();
	ret += "--" + $("#result").text(); // |I: bval2aval2val2_55--bval1aval1val1_55
	$("#result").empty();

	// ................................ Act ..................................
	$.templates("{^{:'a' + getData()^value}}").link("#result", app);
	ret += "|J: " + $("#result").text();
	switchAlt();
	ret += "--" + $("#result").text(); // |J: aval1--aval2
	$("#result").empty();

	// =============================== Arrange ===============================
	getValue.depends = "value";

	// ................................ Act ..................................
	$.templates("{^{:getData()^getValue((getData()^getValue(33)))}}").link("#result", app);
	ret += "|K: " + $("#result").text();
	$.observable(data2).setProperty("value", "newVal1");
	ret += "--" + $("#result").text();
	switchAlt();
	ret += "--" + $("#result").text();
	$.observable(data1).setProperty("value", "newVal2");
	ret += "--" + $("#result").text();  // |K: val2_val2_33--newVal1_newVal1_33--val1_val1_33--newVal2_newVal2_33

	// ................................ Act ..................................
	$("#result").empty();
	ret += "|L: " + !!$._data(data1).events + " " + !!$._data(data1).events + " " + (JSON.stringify($.views.sub._cbBnds) === "{}");
	// |L: false false true
	// ................................ Assert ..................................
	equal(ret,
		"|A: val2_22--val1_22|" +
		"B: 1 first street--1 second street2 second street|" +
		"C: 1 second street2 second street--1 first street|" +
		"D: val1_22--val2_22|" +
		"E: val2_val2_33--val1_val1_33|" +
		"F: val1--val2|" +
		"G: 1 second street--1 first street|" +
		"H: 1 first street--1 second street|" +
		"I: bval2aval2val2_55--bval1aval1val1_55|" +
		"J: aval1--aval2|" +
		"K: val2_val2_33--newVal1_newVal1_33--val1_val1_33--newVal2_newVal2_33|" + 
		"L: false false true",
		"deep paths with computed observables bind correctly to rest of path after computed returns new object or array, including complex expressions, wrapped in parens etc.");
});

test("Computed observables in $.link() expressions", function() {

	(function() {
		// =============================== Arrange ===============================
		var result = "";

		$("#result").html('<span id="inner"></span>');

		function ob() {
			return helpers.alt ? this._obB : this._obA;
		}

		ob.depends = "~helpers.alt";

		function address() {
			return this._address;
		}

		function setAddress(val) {
			this._address = val;
		}

		address.set = setAddress;

		var helpers = { alt: false };

		var person = {
			changeAlt: changeAlt,
			changeHome: changeHome,
			changeObtype: changeObtype,
			changeAddress: changeAddress,
			changeStreet: changeStreet,
			ob: ob,
			_obA: {
				home: {
					_address: {
						street: "A"
					},
					address: address
				},
				obtype: "a"
			},
			_obB: {
				home: {
					_address: {
						street: "B"
					},
					address: address
				},
				obtype: "b"
			},
		};

		function changeHome(label) {
			$.observable(person.ob()).setProperty("home", {
				_address: {
					street: person.ob().home.address().street + "$"
				},
				address: address
			});
		}

		function changeAlt(label) {
			$.observable(helpers).setProperty("alt", !helpers.alt);
			result += " |" + label + ": " + $("#inner").text();
		}

		function changeObtype(label) {
			$.observable(person.ob()).setProperty("obtype", person.ob().obtype + "@");
			result += " |" + label + ": " + $("#inner").text();
		}

		function changeAddress(label) {
			$.observable(person.ob().home).setProperty("address", { street: person.ob().home.address().street + "+" });
			result += " |" + label + ": " + $("#inner").text();
		}

		function changeStreet(label) {
			$.observable(person.ob().home.address()).setProperty("street", person.ob().home.address().street + ">");
			result += " |" + label + ": " + $("#inner").text();
		}

		$.link("ob()^obtype", "#inner", person, { helpers: helpers });

		// ................................ Act ..................................

		changeAlt(1);
		changeObtype(2);
		changeAlt(3);
		changeObtype(4);
		changeAlt(5);

		// ............................... Assert .................................
		equal(result, " |1: b |2: b@ |3: a |4: a@ |5: b@", "complex");

		// ................................ Reset ................................
		$("#result").empty();
	})();

	(function() {
		// =============================== Arrange ===============================
		var result = "";

		$("#result").html('<span id="inner"></span>');

		function ob(alt) {
			return alt ? this._obB : this._obA;
		}

		function address() {
			return this._address;
		}

		function setAddress(val) {
			this._address = val;
		}

		address.set = setAddress;

		var helpers = { alt: false };

		var person = {
			changeAlt: changeAlt,
			changeHome: changeHome,
			changeObtype: changeObtype,
			changeAddress: changeAddress,
			changeStreet: changeStreet,
			ob: ob,
			_obA: {
				home: {
					_address: {
						street: "A"
					},
					address: address
				},
				obtype: "a"
			},
			_obB: {
				home: {
					_address: {
						street: "B"
					},
					address: address
				},
				obtype: "b"
			},
		};

		function changeHome(label) {
			$.observable(person.ob(helpers.alt)).setProperty("home", {
				_address: {
					street: person.ob(helpers.alt).home.address().street + "$"
				},
				address: address
			});
		}

		function changeAlt(label) {
			$.observable(helpers).setProperty("alt", !helpers.alt);
			result += " |" + label + ": " + $("#inner").text();
		}

		function changeObtype(label) {
			$.observable(person.ob(helpers.alt)).setProperty("obtype", person.ob(helpers.alt).obtype + "@");
			result += " |" + label + ": " + $("#inner").text();
		}

		function changeAddress(label) {
			$.observable(person.ob(helpers.alt).home).setProperty("address", { street: person.ob(helpers.alt).home.address().street + "+" });
			result += " |" + label + ": " + $("#inner").text();
		}

		function changeStreet(label) {
			$.observable(person.ob(helpers.alt).home.address()).setProperty("street", person.ob(helpers.alt).home.address().street + ">");
			result += " |" + label + ": " + $("#inner").text();
		}

		$.link("ob(~helpers.alt)^home.address().street", "#inner", person, { helpers: helpers });

		// ................................ Act ..................................

		changeAddress(1);
		changeStreet(2);
		changeAddress(3);
		changeStreet(4);
		changeAlt(5);
		changeAddress(6);
		changeStreet(7);
		changeAddress(8);
		changeStreet(9);
		changeAlt(10);
		changeStreet(11);
		changeAddress(12);
		changeStreet(13);
		changeAddress(14);
		changeAlt(15);

		// ............................... Assert .................................
		equal(result, " |1: A+ |2: A+> |3: A+>+ |4: A+>+> |5: B |6: B+ |7: B+> |8: B+>+ |9: B+>+> |10: A+>+> |11: A+>+>> |12: A+>+>>+ |13: A+>+>>+> |14: A+>+>>+>+ |15: B+>+>", "complex");

		// ................................ Reset ................................
		$("#result").empty();
	})();

	(function() {
		// =============================== Arrange ===============================
		var result = "";

		$("#result").html('<span id="inner"></span>');

		function ob() {
			return helpers.alt ? this._obB : this._obA;
		}
		ob.depends = "~helpers.alt";

		function address(val) {
			if (!arguments.length) {
				return helpers.alt ? this._address2 : this._address;
			}
			if (helpers.alt) {
				this._address2 = val;
			} else {
				this._address = val;
			}
		}
		address.set = true;

		address.depends = "~helpers.alt";

		var helpers = { alt: false };

		var person = {
			changeAlt: changeAlt,
			changeHome: changeHome,
			changeObtype: changeObtype,
			changeAddress: changeAddress,
			changeStreet: changeStreet,
			ob: ob,
			_obA: {
				home: {
					_address: {
						street: "A"
					},
					_address2: {
						street: "A2"
					},
					address: address
				},
				obtype: "a"
			},
			_obB: {
				home: {
					_address: {
						street: "B"
					},
					_address2: {
						street: "B2"
					},
					address: address
				},
				obtype: "b"
			},
		};

		function changeHome(label) {
			$.observable(person.ob()).setProperty("home", {
				_address: {
					street: person.ob().home.address().street + "$"
				},
				address: address
			});
		}

		function changeAlt(label) {
			$.observable(helpers).setProperty("alt", !helpers.alt);
			result += " |" + label + ": " + $("#inner").text();
		}

		function changeObtype(label) {
			$.observable(person.ob()).setProperty("obtype", person.ob().obtype + "@");
			result += " |" + label + ": " + $("#inner").text();
		}

		function changeAddress(label) {
			$.observable(person.ob().home).setProperty("address", { street: person.ob().home.address().street + "+" });
			result += " |" + label + ": " + $("#inner").text();
		}

		function changeStreet(label) {
			$.observable(person.ob().home.address()).setProperty("street", person.ob().home.address().street + ">");
			result += " |" + label + ": " + $("#inner").text();
		}

		$.link("ob()^home.address().street", "#inner", person, { helpers: helpers });

		// ................................ Act ..................................

		changeAddress(1);
		changeStreet(2);
		changeAddress(3);
		changeStreet(4);
		changeAlt(5);
		changeAddress(6);
		changeStreet(7);
		changeAddress(8);
		changeStreet(9);
		changeAlt(10);
		changeStreet(11);
		changeAddress(12);
		changeStreet(13);
		changeAddress(14);
		changeAlt(15);

		// ............................... Assert .................................
		equal(result, " |1: A+ |2: A+> |3: A+>+ |4: A+>+> |5: B2 |6: B2+ |7: B2+> |8: B2+>+ |9: B2+>+> |10: A+>+> |11: A+>+>> |12: A+>+>>+ |13: A+>+>>+> |14: A+>+>>+>+ |15: B2+>+>", "complex");

		// ................................ Reset ................................
		$("#result").empty();
	})();

});

test("Computed observables in two-way binding", function() {

	(function() {
		// =============================== Arrange ===============================
		function fullName(reversed) {
			return reversed
				? this.lastName + " " + this.firstName
				: this.firstName + " " + this.lastName;
		}

		var person = {
			firstName: "Jeff",
			lastName: "Smith",
			fullName: fullName
		};

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

		$.observable(person).setProperty({ firstName: "newFirst", lastName: "newLast" });

		res += "|" + $("#result").text() + $("#full").val();

		$.observable(person).setProperty({ fullName: "compFirst compLast" });

		res += "|" + $("#result").text() + $("#full").val();

		$("#full").val("2wayFirst 2wayLast").change();

		res += "|" + $("#result").text() + $("#full").val();

		// ............................... Assert .................................
		equal(res,
		isIE8
		? "Jeff Smith Jeff Smith Smith Jeff Jeff Smith|newFirstnewLastnewFirst newLastnewLast newFirst newFirst newLast|compFirstcompLastcompFirst"
			+ " compLastcompLast compFirst compFirst compLast|2wayFirst2wayLast2wayFirst 2wayLast2wayLast 2wayFirst 2wayFirst 2wayLast"
		: "Jeff Smith Jeff Smith Smith Jeff Jeff Smith|newFirst newLast newFirst newLast newLast newFirst newFirst newLast|compFirst compLast compFirst"
			+ " compLast compLast compFirst compFirst compLast|2wayFirst 2wayLast 2wayFirst 2wayLast 2wayLast 2wayFirst 2wayFirst 2wayLast",
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
		};

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

		$.observable(person).setProperty({ firstName: "newFirst", lastName: "newLast" });

		res += "|" + $("#result").text() + $("#full").val();

		$.observable(person).setProperty({ fullName: "compFirst compLast" });

		res += "|" + $("#result").text() + $("#full").val();

		$("#full").val("2wayFirst 2wayLast").change();

		res += "|" + $("#result").text() + $("#full").val();

		// ............................... Assert .................................
		equal(res,
		isIE8
		? "Jeff Smith Jeff Smith Smith Jeff Jeff Smith|newFirstnewLastnewFirst newLastnewLast newFirst newFirst newLast|compFirstcompLastcompFirst"
			+ " compLastcompLast compFirst compFirst compLast|2wayFirst2wayLast2wayFirst 2wayLast2wayLast 2wayFirst 2wayFirst 2wayLast"
		: "Jeff Smith Jeff Smith Smith Jeff Jeff Smith|newFirst newLast newFirst newLast newLast newFirst newFirst newLast|compFirst compLast compFirst"
			+ " compLast compLast compFirst compFirst compLast|2wayFirst 2wayLast 2wayFirst 2wayLast 2wayLast 2wayFirst 2wayFirst 2wayLast",
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
		};

		fullName.set = function(val) {
			val = val.split(" ");
			$.observable(person).setProperty({
				lastName: val.pop(),
				firstName: val.join(" ")
			});
		};

		$.templates('{^{:firstName}} {^{:lastName}} {^{:~fullName()}} {^{:~fullName(true)}} <input id="full" data-link="~fullName()"/>')
			.link("#result", person, { fullName: fullName });

		// ................................ Act ..................................
		var res = $("#result").text() + $("#full").val();

		$.observable(person).setProperty({ firstName: "newFirst", lastName: "newLast" });

		res += "|" + $("#result").text() + $("#full").val();

		$("#full").val("2wayFirst 2wayLast").change();

		res += "|" + $("#result").text() + $("#full").val();

		// ............................... Assert .................................
		equal(res,
		isIE8
		? "Jeff Friedman Jeff Friedman Friedman Jeff Jeff Friedman|newFirstnewLastnewFirst newLastnewLast newFirst newFirst newLast|"
			+ "2wayFirst2wayLast2wayFirst 2wayLast2wayLast 2wayFirst 2wayFirst 2wayLast"
		: "Jeff Friedman Jeff Friedman Friedman Jeff Jeff Friedman|newFirst newLast newFirst newLast newLast newFirst newFirst newLast|"
			+ "2wayFirst 2wayLast 2wayFirst 2wayLast 2wayLast 2wayFirst 2wayFirst 2wayLast",
		'Two-way binding to a computed observable data property defined on the prototype correctly calls the setter');

		// ................................ Reset ................................
		$("#result").empty();
	})();

	(function() {
		// See https://github.com/BorisMoore/jsviews/issues/287
		// From Paul Martin pull request: https://github.com/Paul-Martin/jsviews.com/commit/10d716ccd0d6478dea042faeeca64bf44e4642ed

		// =============================== Arrange ===============================
		function getsetA(val) {
			if (!arguments.length) {
				return this._a;
			}
			this._a = val;
		}
		getsetA.set = true;

		function getsetB(val) {
			if (!arguments.length) {
				return this._b;
			}
			this._b = val;
		}
		getsetB.set = true;

		function Root(a) {
			this._a = a;
			this.a = getsetA;
		}

		function A(b) {
			this._b = b;
			this.b = getsetB;
		}

		var o1 = new Root(new A('one')),
			o2 = new Root(new A('two')),

			tmpl = $.templates('<input data-link="a().b()"><span data-link="a().b()"></span>');

		$("#result").html("<div id='one'></div><div id='two'><div>");

		tmpl.link('#one', o1);
		tmpl.link('#two', o2);

		// ................................ Act ..................................
		var res = "",
			input1 = $("#one input"),
			input2 = $("#two input"),
			span1 = $("#one span"),
			span2 = $("#two span");

		function getResult() {
			res += input1.val() + " " + span1.text() + " " + input2.val() + " " + span2.text() + "|";
		}

		getResult();

		input1.val('onechange').change();

		getResult();

		input2.val('twochange').change();

		getResult();

		$.observable(o1.a()).setProperty('b', 'oneupdate');

		getResult();

		$.observable(o2.a()).setProperty('b', 'twoupdate');

		getResult();

		// ............................... Assert .................................
		equal(res,
			"one one two two|"
		+ "onechange onechange two two|"
		+ "onechange onechange twochange twochange|"
		+ "oneupdate oneupdate twochange twochange|"
		+ "oneupdate oneupdate twoupdate twoupdate|",
		'Two-way bindings with chained computed observables remain independent when same template links to multiple target elements');

		// ................................ Reset ................................
		$("#result").empty();
	})();

	(function() {
		// =============================== Arrange ===============================
		var people = [
			{
				name: "n0",
				_address: {
					street: "s0"
				},
				ob: function() { return this; },
				address: function() {
					return this._address;
				}
			},
			{
				name: "n1",
				_address: {
					street: "s1"
				},
				ob: function() { return this; },
				address: function() {
					return this._address;
				}
			}
		];

		var tmpl = $.templates(
			"<div class='person{{:#index}}'>"
				+ "<input class='name' data-link='ob().name' /> <span class='name'>{^{:ob().name}}</span>"
				+ "<input class='street' data-link='ob().address().street'/> <span class='street'>{^{:ob().address().street}}</span>"
			+ "</div>");

		tmpl.link("#result", people);

		// ................................ Act ..................................
		var res = "",
			nameInput0 = $("#result .person0 input.name"),
			nameSpan0 = $("#result .person0 span.name"),
			streetInput0 = $("#result .person0 input.street"),
			streetSpan0 = $("#result .person0 span.street"),
			nameInput1 = $("#result .person1 input.name"),
			nameSpan1 = $("#result .person1 span.name"),
			streetInput1 = $("#result .person1 input.street"),
			streetSpan1 = $("#result .person1 span.street");

		function getResult() {
			res += nameInput0.val() + " " + nameSpan0.text() + " " + streetInput0.val() + " " + streetSpan0.text() + " " + nameInput1.val() + " " + nameSpan1.text() + " " + streetInput1.val() + " " + streetSpan1.text() + "|";
		}

		getResult();

		nameInput0.val('n0new').change();

		getResult();

		nameInput1.val('n1new').change();

		getResult();

		streetInput0.val('s0new').change();

		getResult();

		streetInput1.val('s1new').change();

		getResult();

		$.observable(people[0]).setProperty('name', 'n0update');

		getResult();

		$.observable(people[0].address()).setProperty('street', 's0update');

		getResult();

		$.observable(people[1]).setProperty('name', 'n1update');

		getResult();

		$.observable(people[1].address()).setProperty('street', 's1update');

		getResult();

		$.observable(people).remove(1);

		$.observable(people).insert({
			name: "n1inserted",
			_address: {
				street: "s1inserted",
				address: function() {
					return this;
				}
			},
			ob: function() { return this; },
			address: function() {
				return this._address;
			}
		});

		nameInput1 = $("#result .person1 input.name");
		nameSpan1 = $("#result .person1 span.name");
		streetInput1 = $("#result .person1 input.street");
		streetSpan1 = $("#result .person1 span.street");

		getResult();

		// ............................... Assert .................................
		equal(res,
		"n0 n0 s0 s0 n1 n1 s1 s1|"
		+ "n0new n0new s0 s0 n1 n1 s1 s1|"
		+ "n0new n0new s0 s0 n1new n1new s1 s1|"
		+ "n0new n0new s0new s0new n1new n1new s1 s1|"
		+ "n0new n0new s0new s0new n1new n1new s1new s1new|"
		+ "n0update n0update s0new s0new n1new n1new s1new s1new|"
		+ "n0update n0update s0update s0update n1new n1new s1new s1new|"
		+ "n0update n0update s0update s0update n1update n1update s1new s1new|"
		+ "n0update n0update s0update s0update n1update n1update s1update s1update|"
		+ "n0update n0update s0update s0update n1inserted n1inserted s1inserted s1inserted|",
		'Two-way bindings with chained computed observables remain independent when same template links different elements of an array');

		// ................................ Reset ................................
		$("#result").empty();
	})();

	(function() {
		// =============================== Arrange ===============================
		var people = [
			{
				name: "n0",
				_address: {
					street: "s0"
				},
				ob: function() { return this; },
				address: function() {
					return this._address;
				}
			},
			{
				name: "n1",
				_address: {
					street: "s1"
				},
				ob: function() { return this; },
				address: function() {
					return this._address;
				}
			}
		];

		var tmpl = $.templates(
			"{^{for people}}<div class='person{{:#index}}'>"
				+ "<input class='name' data-link='ob().name' /> <span class='name'>{^{:ob().name}}</span>"
				+ "<input class='street' data-link='ob().address().street'/> <span class='street'>{^{:ob().address().street}}</span>"
			+ "</div>{{/for}}");

		tmpl.link("#result", { people: people });

		// ................................ Act ..................................
		var res = "",
			nameInput0 = $("#result .person0 input.name"),
			nameSpan0 = $("#result .person0 span.name"),
			streetInput0 = $("#result .person0 input.street"),
			streetSpan0 = $("#result .person0 span.street"),
			nameInput1 = $("#result .person1 input.name"),
			nameSpan1 = $("#result .person1 span.name"),
			streetInput1 = $("#result .person1 input.street"),
			streetSpan1 = $("#result .person1 span.street");

		function getResult() {
			res += nameInput0.val() + " " + nameSpan0.text() + " " + streetInput0.val() + " " + streetSpan0.text() + " " + nameInput1.val() + " " + nameSpan1.text() + " " + streetInput1.val() + " " + streetSpan1.text() + "|";
		}

		getResult();

		nameInput0.val('n0new').change();

		getResult();

		nameInput1.val('n1new').change();

		getResult();

		streetInput0.val('s0new').change();

		getResult();

		streetInput1.val('s1new').change();

		getResult();

		$.observable(people[0]).setProperty('name', 'n0update');

		getResult();

		$.observable(people[0].address()).setProperty('street', 's0update');

		getResult();

		$.observable(people[1]).setProperty('name', 'n1update');

		getResult();

		$.observable(people[1].address()).setProperty('street', 's1update');

		getResult();

		$.observable(people).remove(1);

		$.observable(people).insert({
			name: "n1inserted",
			_address: {
				street: "s1inserted"
			},
			ob: function() { return this; },
			address: function() {
				return this._address;
			}
		});

		nameInput1 = $("#result .person1 input.name");
		nameSpan1 = $("#result .person1 span.name");
		streetInput1 = $("#result .person1 input.street");
		streetSpan1 = $("#result .person1 span.street");

		getResult();

		// ............................... Assert .................................
		equal(res,
		"n0 n0 s0 s0 n1 n1 s1 s1|"
		+ "n0new n0new s0 s0 n1 n1 s1 s1|"
		+ "n0new n0new s0 s0 n1new n1new s1 s1|"
		+ "n0new n0new s0new s0new n1new n1new s1 s1|"
		+ "n0new n0new s0new s0new n1new n1new s1new s1new|"
		+ "n0update n0update s0new s0new n1new n1new s1new s1new|"
		+ "n0update n0update s0update s0update n1new n1new s1new s1new|"
		+ "n0update n0update s0update s0update n1update n1update s1new s1new|"
		+ "n0update n0update s0update s0update n1update n1update s1update s1update|"
		+ "n0update n0update s0update s0update n1inserted n1inserted s1inserted s1inserted|",
		'Two-way bindings with chained computed observables remain independent when same {{for}} block links different elements of an array');

		// ................................ Reset ................................
		$("#result").empty();
	})();

	(function() {
		// =============================== Arrange ===============================
		var people = [
			{
				name: "n0",
				_address: {
					street: "s0"
				},
				ob: function() { return this; },
				address: function() {
					return this._address;
				}
			},
			{
				name: "n1",
				_address: {
					street: "s1"
				},
				ob: function() { return this; },
				address: function() {
					return this._address;
				}
			}
		];

		var tmpl = $.templates(
			"<div class='person{{:#index}}'>"
				+ "<input class='name' data-link='ob().name linkTo=ob().address().street' /> <span class='name'>{^{:ob().name}}</span>"
				+ "<input class='street' data-link='ob().address().street linkTo=ob().name'/> <span class='street'>{^{:ob().address().street}}</span>"
			+ "</div>");

		tmpl.link("#result", people);

		// ................................ Act ..................................
		var res = "",
			nameInput0 = $("#result .person0 input.name"),
			nameSpan0 = $("#result .person0 span.name"),
			streetInput0 = $("#result .person0 input.street"),
			streetSpan0 = $("#result .person0 span.street"),
			nameInput1 = $("#result .person1 input.name"),
			nameSpan1 = $("#result .person1 span.name"),
			streetInput1 = $("#result .person1 input.street"),
			streetSpan1 = $("#result .person1 span.street");

		function getResult() {
			res += nameInput0.val() + " " + nameSpan0.text() + " " + streetInput0.val() + " " + streetSpan0.text() + " " + nameInput1.val() + " " + nameSpan1.text() + " " + streetInput1.val() + " " + streetSpan1.text() + "|";
		}

		getResult();

		nameInput0.val('n0new').change();

		getResult();

		nameInput1.val('n1new').change();

		getResult();

		streetInput0.val('s0new').change();

		getResult();

		streetInput1.val('s1new').change();

		getResult();

		// ............................... Assert .................................
		equal(res,
		"n0 n0 s0 s0 n1 n1 s1 s1|"
		+ "n0new n0 n0new n0new n1 n1 s1 s1|"
		+ "n0new n0 n0new n0new n1new n1 n1new n1new|"
		+ "s0new s0new s0new n0new n1new n1 n1new n1new|"
		+ "s0new s0new s0new n0new s1new s1new s1new n1new|",
		'Two-way bindings with chained computed observables using linkTo remain independent when same template links different elements of an array');

		// ................................ Reset ................................
		$("#result").empty();
	})();

	(function() {
		// =============================== Arrange ===============================
		function ob() {
			return this.alt ? this._obB : this._obA;
		}
		ob.depends = "alt";

		function change() {
			$.observable(this._address).setProperty("street", this._address.street + "+");
		}

		function switchAlt() {
			$.observable(this).setProperty("alt", !this.alt);
		}

		var people = [
			{
				alt: false,
				ob: ob,
				switchAlt: switchAlt,
				_obA: {
					change: change,
					_address: {
						street: "A0"
					},
					address: function() {
						return this._address;
					}
				},
				_obB: {
					change: change,
					_address: {
						street: "B0"
					},
					address: function() {
						return this._address;
					}
				}
			},
			{
				alt: false,
				ob: ob,
				switchAlt: switchAlt,
				_obA: {
					change: change,
					_address: {
						street: "A1"
					},
					address: function() {
						return this._address;
					}
				},
				_obB: {
					change: change,
					_address: {
						street: "B1"
					},
					address: function() {
						return this._address;
					}
				}
			}
		];

		var tmpl = $.templates(
			"<div class='person{{:#index}}'>"
			+ "<input class='toStreet1' data-link='\"\" linkTo=ob()^address().street'/>"
			+ "<input class='toStreet2' data-link='\"\" linkTo=ob()^address().street'/>"
			+ "<input class='toStreetA' data-link='\"\" linkTo=_obA^address().street'/>"
			+ "<input class='toStreetB' data-link='\"\" linkTo=_obB^address().street'/>"
			+ "<span class='street1' data-link='ob()^address().street'></span> "
			+ "<span class='street2' data-link='ob()^address().street'></span> "
			+ "<input class='street1' data-link='ob()^address().street'/>"
			+ "<input class='street2' data-link='ob()^address().street'/>"
			+ "<input class='streetA' data-link='_obA^address().street'/>"
			+ "<input class='streetB' data-link='_obB^address().street'/></div>");

		tmpl.link("#result", people);

		// ................................ Act ..................................
		var res = "",
			toStreet1_0 = $("#result .person0 input.toStreet1"),
			toStreet2_0 = $("#result .person0 input.toStreet2"),
			toStreetA_0 = $("#result .person0 input.toStreetA"),
			toStreetB_0 = $("#result .person0 input.toStreetB"),
			spanStreet1_0 = $("#result .person0 span.street1"),
			spanStreet2_0 = $("#result .person0 span.street2"),
			street1_0 = $("#result .person0 input.street1"),
			street2_0 = $("#result .person0 input.street2"),
			streetA_0 = $("#result .person0 input.streetA"),
			streetB_0 = $("#result .person0 input.streetB"),

			toStreet1_1 = $("#result .person1 input.toStreet1"),
			toStreet2_1 = $("#result .person1 input.toStreet2"),
			toStreetA_1 = $("#result .person1 input.toStreetA"),
			toStreetB_1 = $("#result .person1 input.toStreetB"),
			spanStreet1_1 = $("#result .person1 span.street1"),
			spanStreet2_1 = $("#result .person1 span.street2"),
			street1_1 = $("#result .person1 input.street1"),
			street2_1 = $("#result .person1 input.street2"),
			streetA_1 = $("#result .person1 input.streetA"),
			streetB_1 = $("#result .person1 input.streetB");

		function getResult(name) {
			res += name + ":" + spanStreet1_0.text() + " " + spanStreet2_0.text() + " " + street1_0.val() + " " + street2_0.val() + " " + streetA_0.val() + " " + streetB_0.val()
			+ " " + spanStreet1_1.text() + " " + spanStreet2_1.text() + " " + street1_1.val() + " " + street2_1.val() + " " + streetA_1.val() + " " + streetB_1.val() + "|";
		}

		getResult(1);

		people[0]._obA.change();
		people[0]._obB.change();
		getResult(2);

		people[0].switchAlt();
		getResult(3);

		people[0]._obA.change();
		people[0]._obB.change();
		getResult(4);

		people[0].switchAlt();
		getResult(5);

		people[1].ob().change();
		getResult(6);

		people[1].switchAlt();
		getResult(7);

		people[1].ob().change();
		getResult(8);

		toStreet1_0.val("new1").change();
		getResult(9);

		toStreet2_0.val("new2").change();
		getResult(10);

		toStreetA_0.val("new3").change();
		getResult(11);

		toStreetB_0.val("new4").change();
		getResult(12);

		toStreet1_1.val("new5").change();
		getResult(13);

		toStreet2_1.val("new6").change();
		getResult(14);

		toStreetA_1.val("new7").change();
		getResult(15);

		toStreetB_1.val("new8").change();
		getResult(16);

		// ............................... Assert .................................
		equal(res,
			"1:A0 A0 A0 A0 A0 B0 A1 A1 A1 A1 A1 B1|"
		+ "2:A0+ A0+ A0+ A0+ A0+ B0+ A1 A1 A1 A1 A1 B1|"
		+ "3:B0+ B0+ B0+ B0+ A0+ B0+ A1 A1 A1 A1 A1 B1|"
		+ "4:B0++ B0++ B0++ B0++ A0++ B0++ A1 A1 A1 A1 A1 B1|"
		+ "5:A0++ A0++ A0++ A0++ A0++ B0++ A1 A1 A1 A1 A1 B1|"
		+ "6:A0++ A0++ A0++ A0++ A0++ B0++ A1+ A1+ A1+ A1+ A1+ B1|"
		+ "7:A0++ A0++ A0++ A0++ A0++ B0++ B1 B1 B1 B1 A1+ B1|"
		+ "8:A0++ A0++ A0++ A0++ A0++ B0++ B1+ B1+ B1+ B1+ A1+ B1+|"
		+ "9:new1 new1 new1 new1 new1 B0++ B1+ B1+ B1+ B1+ A1+ B1+|"
		+ "10:new2 new2 new2 new2 new2 B0++ B1+ B1+ B1+ B1+ A1+ B1+|"
		+ "11:new3 new3 new3 new3 new3 B0++ B1+ B1+ B1+ B1+ A1+ B1+|"
		+ "12:new3 new3 new3 new3 new3 new4 B1+ B1+ B1+ B1+ A1+ B1+|"
		+ "13:new3 new3 new3 new3 new3 new4 new5 new5 new5 new5 A1+ new5|"
		+ "14:new3 new3 new3 new3 new3 new4 new6 new6 new6 new6 A1+ new6|"
		+ "15:new3 new3 new3 new3 new3 new4 new6 new6 new6 new6 new7 new6|"
		+ "16:new3 new3 new3 new3 new3 new4 new8 new8 new8 new8 new7 new8|",
		'Two-way bindings with chained computed observables with or without linkTo remain independent when multiple bindings in same tag block use same path expression');

		// ................................ Reset ................................
		$("#result").empty();
	})();

});

test("Chained computed observables in template expressions", function() {

	(function() {
		// =============================== Arrange ===============================
		function ob() {
			return helpers.alt ? this._obB : this._obA;
		}

		ob.depends = "~helpers.alt";

		ob.set = function(val) {
			if (helpers.alt) {
				this._obB = val;
			} else {
				this._obA = val;
			}
		};

		function address() {
			return this._address;
		}

		function setAddress(val) {
			this._address = val;
		}

		address.set = setAddress;

		var res, resCount, helpers, ch, person, person2, data;

		function setData() {
			res = "";
			resCount = 1;
			ch = 0;

			helpers = {alt: false};

			person = {
				ob: ob,
				_obA: {
					home: {
						_address: {
							street: "A"
						},
						_address2: {
							street: "A2"
						},
						address: address
					}
				},
				_obB: {
					home: {
						_address: {
							street: "B"
						},
						_address2: {
							street: "B2"
						},
						address: address
					}
				}
			};
			person2 = {
				ob: ob,
				_obA: {
					home: {
						_address: {
							street: "xA"
						},
						_address2: {
							street: "xA2"
						},
						address: address
					}
				},
				_obB: {
					home: {
						_address: {
							street: "xB"
						},
						_address2: {
							street: "xB2"
						},
						address: address
					}
				}
			};
			data = {person: person};
		}

		function swapPerson() {
			$.observable(data).setProperty("person", data.person === person ? person2 : person);
		}

		function changeAlt() {
			$.observable(helpers).setProperty("alt", !helpers.alt);
		}

		function changeOb() {
			$.observable(data.person).setProperty("ob", {
				home: {
					_address: {
						street: data.person.ob().home._address.street + ch++
					},
					_address2: {
						street: data.person.ob().home._address2.street + ch
					},
					address: address
				}
			});
		}

		function changeHome() {
			$.observable(data.person.ob()).setProperty("home", {
				_address: {
					street: data.person.ob().home._address.street + "$"
				},
				_address2: {
					street: data.person.ob().home._address2.street + "$"
				},
				address: address
			});
		}

		function changeAddress() {
			$.observable(data.person.ob().home).setProperty("address", {street: data.person.ob().home.address().street + "+"});
		}

		function changeStreet() {
			$.observable(data.person.ob().home.address()).setProperty("street", data.person.ob().home.address().street + ">");
		}

		function getResult(name) {
			res += (name||resCount++) + ": " + $("#result").text() + " |";
		}

		var tmpl = $.templates("<span data-link='person^ob().home.address().street'></span>");

		setData();

		tmpl.link("#result", data, {helpers: helpers});

		// ................................ Act ..................................
		getResult("None");

		changeStreet();
		getResult("Street");

		changeAddress();
		getResult("Address");

		changeHome();
		getResult("Home");

		changeOb();
		getResult("Ob");

		changeAlt();
		getResult("Alt");

		changeHome();
		getResult("Home");

		changeAddress();
		getResult("Address");

		changeStreet();
		getResult("Street");

		swapPerson();
		getResult("Person");

		changeHome();
		getResult("Home");

		changeStreet();
		getResult("Street");

		changeAddress();
		getResult("Address");

		changeOb();
		getResult("Ob");

		changeHome();
		getResult("Home");

		changeStreet();
		getResult("Street");

		changeAddress();
		getResult("Address");

		// ............................... Assert .................................
		equal(res, "None: A |Street: A> |Address: A>+ |Home: A>+$ |Ob: A>+$0 |Alt: B |Home: B$ |Address: B$+ |Street: B$+> |Person: xB |"
			+ "Home: xB$ |Street: xB$> |Address: xB$>+ |Ob: xB$>+1 |Home: xB$>+1$ |Street: xB$>+1$> |Address: xB$>+1$>+ |",
		"Deep path with chained observables, binding to full depth: person^ob().home.address().street");

		// ................................ Reset ................................
		$("#result").empty();
		setData();

		// =============================== Arrange ===============================
		tmpl = $.templates("<span data-link='person.ob()^home.address().street'></span>");

		tmpl.link("#result", data, {helpers: helpers});

		// ................................ Act ..................................

		getResult("None");

		changeStreet();
		getResult("Street");

		changeAddress();
		getResult("Address");

		changeHome();
		getResult("Home");

		changeOb();
		getResult("Ob");

		changeAlt();
		getResult("Alt");

		changeHome();
		getResult("Home");

		changeAddress();
		getResult("Address");

		changeStreet();
		getResult("Street");

		swapPerson();
		getResult("Person");

		changeStreet();
		getResult("Street");

		changeAddress();
		getResult("Address");

		changeHome();
		getResult("Home");

		changeOb();
		getResult("Ob");

		changeAlt();
		getResult("Alt");

		// ............................... Assert .................................
		equal(res, "None: A |Street: A> |Address: A>+ |Home: A>+$ |Ob: A>+$0 |Alt: B |Home: B$ |Address: B$+ |Street: B$+> |Person: B$+> |Street: B$+> |Address: B$+> |Home: B$+> |Ob: B$+> |Alt: xA |",
		"Deep path with chained observables, binding to full depth - 1: person.ob()^home.address().street");

		// ................................ Reset ................................
		$("#result").empty();
		setData();

		// =============================== Arrange ===============================
		tmpl = $.templates("<span data-link='person.ob().home^address().street'></span>");

		tmpl.link("#result", data, {helpers: helpers});

		// ................................ Act ..................................

		getResult("None");

		changeStreet();
		getResult("Street");

		changeAddress();
		getResult("Address");

		changeHome();
		getResult("Home");

		changeOb();
		getResult("Ob");

		changeStreet();
		getResult("Street");

		changeAddress();
		getResult("Address");

		changeHome();
		getResult("Home");

		changeAlt();
		getResult("Alt");

		// ............................... Assert .................................
		equal(res, "None: A |Street: A> |Address: A>+ |Home: A>+$ |Ob: A>+$ |Street: A>+$ |Address: A>+$ |Home: A>+$ |Alt: A>+$ |",
		"Deep path with chained observables, binding to leaf depth + 2: person.ob().home^address().street");

		// ................................ Reset ................................
		$("#result").empty();
		setData();

		// =============================== Arrange ===============================
		tmpl = $.templates("<span data-link='person.ob().home.address()^street'></span>");

		tmpl.link("#result", data, {helpers: helpers});

		// ................................ Act ..................................

		getResult("None");

		changeStreet();
		getResult("Street");

		changeAddress();
		getResult("Address");

		changeHome();
		getResult("Home");

		changeStreet();
		getResult("Street");

		changeAddress();
		getResult("Address");

		changeAlt();
		getResult("Alt");

		// ............................... Assert .................................
		equal(res, "None: A |Street: A> |Address: A>+ |Home: A>+ |Street: A>+ |Address: A>+ |Alt: A>+ |",
		"Deep path with chained observables, binding to leaf depth plus 1: person.ob().home.address()^street");

		// ................................ Reset ................................
		$("#result").empty();
		setData();

		// =============================== Arrange ===============================
		tmpl = $.templates("<span data-link='person.ob().home.address().street'></span>");

		tmpl.link("#result", data, {helpers: helpers});

		// ................................ Act ..................................

		getResult("None");

		changeStreet();
		getResult("Street");

		changeAddress();
		getResult("Address");

		changeStreet();
		getResult("Street");

		changeAlt();
		getResult("Alt");

		// ............................... Assert .................................
		equal(res, "None: A |Street: A> |Address: A> |Street: A> |Alt: A> |",
		"Deep path with chained observables, binding to leaf only: person.ob().home.address().street");

	})();

	(function() {
		// =============================== Arrange ===============================
		function ob() {
			return this._ob;
		}

		ob.set = function(val) {
			this._ob = val;
		};

		var res, resCount, helpers, ch, person, person2, data;

		function setData() {
			res = "";
			resCount = 1;
			ch = 0;

			person = {
				ob: {
					street: "A",
					type: "T"
				}
			};
			person2 = {
				ob: {
					street: "A2",
					type: "T2"
				}
			};
			data = {person: person};
		}

		function swapPerson() {
			$.observable(data).setProperty("person", data.person === person ? person2 : person);
		}

		function changeStreet() {
			$.observable(data.person.ob).setProperty("street", data.person.ob.street + ">");
		}

		function changeType() {
			$.observable(data.person.ob).setProperty("type", data.person.ob.type + "$");
		}

		function getResult(name) {
			res += (name||resCount++) + ": " + $("#result").text() + " |";
		}

		var tmpl = $.templates("<span data-link='person^ob.type + person^ob.street'></span>");

		setData();

		tmpl.link("#result", data);

		// ................................ Act ..................................
		getResult("None");

		changeStreet();
		getResult("Street");

		changeType();
		getResult("Type");

		swapPerson();
		getResult("Person");

		changeType();
		getResult("Type");

		changeStreet();
		getResult("Street");

		// ............................... Assert .................................
		equal(res, "None: TA |Street: TA> |Type: T$A> |Person: T2A2 |Type: T2$A2 |Street: T2$A2> |",
		"Adjacent deep paths in expression: person^ob.type + person^ob.street");

		// ................................ Reset ................................
		$("#result").empty();

	})();

	(function() {
		// =============================== Arrange ===============================
		function ob() {
			return this._ob;
		}

		ob.set = function(val) {
			this._ob = val;
		};

		var res, resCount, helpers, ch, person, person2, data;

		function setData() {
			res = "";
			resCount = 1;
			ch = 0;

			person = {
				ob: ob,
				_ob: {
					street: "A",
					type: "T"
				}
			};
			person2 = {
				ob: ob,
				_ob: {
					street: "A2",
					type: "T2"
				}
			};
			data = {person: person};
		}

		function swapPerson() {
			$.observable(data).setProperty("person", data.person === person ? person2 : person);
		}

		function changeOb() {
			$.observable(data.person).setProperty("ob", {
				street: data.person._ob.street + "+",
				type:  data.person._ob.type + "+"
			});
		}

		function changeStreet() {
			$.observable(data.person.ob()).setProperty("street", data.person.ob().street + ">");
		}

		function changeType() {
			$.observable(data.person.ob()).setProperty("type", data.person.ob().type + "$");
		}

		function getResult(name) {
			res += (name||resCount++) + ": " + $("#result").text() + " |";
		}

		var tmpl = $.templates("<span data-link='person^ob().street + person^ob().type'></span>");

		setData();

		tmpl.link("#result", data);

		// ................................ Act ..................................
		getResult("None");

		changeStreet();
		getResult("Street");

		changeType();
		getResult("Type");

		changeOb();
		getResult("Ob");

		changeType();
		getResult("Type");

		changeStreet();
		getResult("Street");

		// ............................... Assert .................................
		equal(res, "None: AT |Street: A>T |Type: A>T$ |Ob: A>+T$+ |Type: A>+T$+$ |Street: A>+>T$+$ |",
		"Adjacent terms in expression with paths with observables: person^ob().street + person^ob().type");

		// ................................ Reset ................................
		$("#result").empty();

	})();

	(function() {
		// =============================== Arrange ===============================
		function ob(alt, a, b) {
			var _ob = alt ? this._obB : this._obA;
			if (a) {
				_ob.t = [a,b,a+b+2];
			}
			return _ob;
		}

		ob.set = function(val) {
			if (helpers.alt) {
				this._obB = val;
			} else {
				this._obA = val;
			}
		};

		function address(c, d) {
			if (c) {
				this._address.t = c + d;
			}
			return this._address;
		}

		function setAddress(val) {
			this._address = val;
		}

		address.set = setAddress;

		var res, resCount, helpers, ch, person, person2, data;

		function setData() {
			res = "";
			resCount = 1;
			ch = 0;

			helpers = {
				index: 1,
				a: 2,
				b: 1,
				c: 3,
				d: 4,
				alt: false
			};

			person = {
				ob: ob,
				_obA: {
					home: {
						_address: {
							street: "A"
						},
						_address2: {
							street: "A2"
						},
						address: address
					}
				},
				_obB: {
					home: {
						_address: {
							street: "B"
						},
						_address2: {
							street: "B2"
						},
						address: address
					}
				}
			};
			person2 = {
				ob: ob,
				_obA: {
					home: {
						_address: {
							street: "xA"
						},
						_address2: {
							street: "xA2"
						},
						address: address
					}
				},
				_obB: {
					home: {
						_address: {
							street: "xB"
						},
						_address2: {
							street: "xB2"
						},
						address: address
					}
				}
			};
			data = {person: person};
		}

		function swapPerson() {
			$.observable(data).setProperty("person", data.person === person ? person2 : person);
		}

		function changeAlt() {
			$.observable(helpers).setProperty("alt", !helpers.alt);
		}

		function changeA() {
			$.observable(helpers).setProperty("a", helpers.a + 1);
		}

		function changeD() {
			$.observable(helpers).setProperty("d", helpers.d + 1);
		}

		function changeIndex(val) {
			$.observable(helpers).setProperty("index", val);
		}

		function changeOb() {
			$.observable(data.person).setProperty("ob", {
				home: {
					_address: {
						street: data.person.ob(helpers.alt).home._address.street + ch++
					},
					_address2: {
						street: data.person.ob(helpers.alt).home._address2.street + ch
					},
					address: address
				}
			});
		}

		function changeHome() {
			$.observable(data.person.ob(helpers.alt)).setProperty("home", {
				_address: {
					street: data.person.ob(helpers.alt).home._address.street + "$"
				},
				_address2: {
					street: data.person.ob(helpers.alt).home._address2.street + "$"
				},
				address: address
			});
		}

		function changeAddress() {
			$.observable(data.person.ob(helpers.alt).home).setProperty("address", {street: data.person.ob(helpers.alt).home.address().street + "+"});
		}

		function changeStreet() {
			$.observable(data.person.ob(helpers.alt).home.address()).setProperty("street", data.person.ob(helpers.alt).home.address().street + ">");
		}

		function getResult(name) {
			res += (name||resCount++) + ": " + $("#result").text() + " |";
		}

		var tmpl = $.templates("<span data-link='((person^ob(~helpers.alt).home.address(~helpers.c, ~helpers.d).t*3) + person^ob(~helpers.alt, ~helpers.a, ~helpers.b).t[(~helpers.index + 1) - 2])*2 + person^ob(~helpers.alt).home.address().street'></span>");

		setData();

		tmpl.link("#result", data, {helpers: helpers});

		// ................................ Act ..................................
		getResult("None");

		changeStreet();
		getResult("Street");

		changeAddress();
		getResult("Address");

		changeHome();
		getResult("Home");

		changeD();
		getResult("D");

		changeIndex(3);
		getResult("Index3");

		changeA();
		getResult("A");

		changeIndex(2);
		getResult("Index2");

		changeOb();
		getResult("Ob");

		changeAlt();
		getResult("Alt");

		changeHome();
		getResult("Home");

		changeAddress();
		getResult("Address");

		changeStreet();
		getResult("Street");

		swapPerson();
		getResult("Person");

		changeHome();
		getResult("Home");

		changeStreet();
		getResult("Street");

		changeAddress();
		getResult("Address");

		changeOb();
		getResult("Ob");

		changeHome();
		getResult("Home");

		changeIndex(1);
		getResult("Index1");

		changeA();
		getResult("A");

		changeD();
		getResult("D");

		changeStreet();
		getResult("Street");

		changeAddress();
		getResult("Address");

		// ............................... Assert .................................
		equal(res, "None: 46A |Street: 46A> |Address: 46A>+ |Home: 46A>+$ |D: 52A>+$ |Index3: 58A>+$ |A: 60A>+$ |Index2: 50A>+$ |Ob: 50A>+$0 |Alt: 50B |Home: 50B$ |Address: 50B$+ |Street: 50B$+> |Person: 50xB |Home: 50xB$ |Street: 50xB$> |Address: 50xB$>+ |Ob: 50xB$>+1 |Home: 50xB$>+1$ |Index1: 54xB$>+1$ |A: 56xB$>+1$ |D: 62xB$>+1$ |Street: 62xB$>+1$> |Address: 62xB$>+1$>+ |",
		"Complex expression with multiple adjacent paths, with nested () and [] paren expressions, chained observables, arithmetic expressions etc.");

		// ................................ Reset ................................
		$("#result").empty();

	})();

	(function() {
		// =============================== Arrange ===============================
		function getResult(name) {
			res += (name||resCount++) + ": " + $("#result").text() + " |";
		}

		var res = "",
			resCount = 1,
			data = {
				type: 't',
				sectionTypes: {
					t: {
						types: [22, 33]
					},
					n: {
						types: [66, 77]
					}
				}
			},
			helpers = {
				mode: "m"
			},
			tmpl = $.templates({
				markup: "{^{section 'A' ~mode ~sectionTypes=~root.sectionTypes[type].types/}}",
				tags: {
					section: function(setting, mode) {
						return setting + mode + this.tagCtx.ctx.sectionTypes[0];
					}
				}
			});

		// ................................ Act ..................................
		tmpl.link("#result", data, helpers);

		getResult("None");

		$.observable(data).setProperty("type", "n");

		getResult("type");

		// ............................... Assert .................................
		equal(res, "None: Am22 |type: Am22 |",
		"Complex unbound expression with [] paren expressions etc.");

		// ................................ Reset ................................
		$("#result").empty();

	})();

	(function() {
		// =============================== Arrange ===============================
		function getResult(name) {
			res += (name||resCount++) + ": " + $("#result").text() + " |";
		}

		var res = "",
			resCount = 1,
				data = {
				type: 't',
				sectionTypes: {
					t: {
						types: [22, 33]
					},
					n: {
						types: [66, 77]
					}
				}
			},
			helpers = {
				mode: "m"
			},

			tmpl = $.templates({
				markup: "{^{section 'A' ~mode ^~sectionTypes=~root.sectionTypes[type].types/}}",
				tags: {
					section: function(setting, mode) {
						return setting + mode + this.tagCtx.ctx.sectionTypes[0];
					}
				}
			});

		// ................................ Act ..................................
		tmpl.link("#result", data, helpers);

		getResult("None");

		$.observable(data).setProperty("type", "n");

		getResult("type");

		// ............................... Assert .................................
		equal(res, "None: Am22 |type: Am66 |",
		"Complex bound expression with [] paren expressions etc.");

		// ................................ Reset ................................
		$("#result").empty();

	})();

	(function() {
		// =============================== Arrange ===============================
		function ob(alt, a, b) {
			var _ob = alt ? this._obB : this._obA;
			if (a) {
				_ob.t = [a,b,a+b+2];
			}
			return _ob;
		}

		ob.set = function(val) {
			if (helpers.alt) {
				this._obB = val;
			} else {
				this._obA = val;
			}
		};

		function address(c, d) {
			if (c) {
				this._address.t = c + d;
			}
			return this._address;
		}

		function setAddress(val) {
			this._address = val;
		}

		address.set = setAddress;

		var res, resCount, helpers, ch, person, person2, data;

		function setData() {
			res = "";
			resCount = 1;
			ch = 0;

			helpers = {
				index: 1,
				a: 2,
				b: 1,
				c: 3,
				d: 4,
				alt: false
			};

			person = {
				ob: ob,
				_obA: {
					home: {
						_address: {
							street: "A"
						},
						_address2: {
							street: "A2"
						},
						address: address
					}
				},
				_obB: {
					home: {
						_address: {
							street: "B"
						},
						_address2: {
							street: "B2"
						},
						address: address
					}
				}
			};
			person2 = {
				ob: ob,
				_obA: {
					home: {
						_address: {
							street: "xA"
						},
						_address2: {
							street: "xA2"
						},
						address: address
					}
				},
				_obB: {
					home: {
						_address: {
							street: "xB"
						},
						_address2: {
							street: "xB2"
						},
						address: address
					}
				}
			};
			data = {person: person};
		}

		function swapPerson() {
			$.observable(data).setProperty("person", data.person === person ? person2 : person);
		}

		function changeAlt() {
			$.observable(helpers).setProperty("alt", !helpers.alt);
		}

		function changeA() {
			$.observable(helpers).setProperty("a", helpers.a + 1);
		}

		function changeD() {
			$.observable(helpers).setProperty("d", helpers.d + 1);
		}

		function changeIndex(val) {
			$.observable(helpers).setProperty("index", val);
		}

		function changeOb() {
			$.observable(data.person).setProperty("ob", {
				home: {
					_address: {
						street: data.person.ob(helpers.alt).home._address.street + ch++
					},
					_address2: {
						street: data.person.ob(helpers.alt).home._address2.street + ch
					},
					address: address
				}
			});
		}

		function changeHome() {
			$.observable(data.person.ob(helpers.alt)).setProperty("home", {
				_address: {
					street: data.person.ob(helpers.alt).home._address.street + "$"
				},
				_address2: {
					street: data.person.ob(helpers.alt).home._address2.street + "$"
				},
				address: address
			});
		}

		function changeAddress() {
			$.observable(data.person.ob(helpers.alt).home).setProperty("address", {street: data.person.ob(helpers.alt).home.address().street + "+"});
		}

		function changeStreet() {
			$.observable(data.person.ob(helpers.alt).home.address()).setProperty("street", data.person.ob(helpers.alt).home.address().street + ">");
		}

		function getResult(name) {
			res += (name||resCount++) + ": " + $("#result").text() + " |";
		}

		var tmpl = $.templates({
				markup: "{^{mytag ^myprop=((person^ob(~helpers.alt).home.address(~helpers.c, ~helpers.d).t*3) + person^ob(~helpers.alt, ~helpers.a, ~helpers.b).t[(~helpers.index + 1) - 2])*2 + person^ob(~helpers.alt).home.address().street}}{{/mytag}}",
				tags: {
					mytag: function() {
						return this.tagCtx.props.myprop;
					}
				}
			});

		setData();

		tmpl.link("#result", data, {helpers: helpers});

		// ................................ Act ..................................
		getResult("None");

		changeStreet();
		getResult("Street");

		changeAddress();
		getResult("Address");

		changeHome();
		getResult("Home");

		changeD();
		getResult("D");

		changeIndex(3);
		getResult("Index3");

		changeA();
		getResult("A");

		changeIndex(2);
		getResult("Index2");

		changeOb();
		getResult("Ob");

		changeAlt();
		getResult("Alt");

		changeHome();
		getResult("Home");

		changeAddress();
		getResult("Address");

		changeStreet();
		getResult("Street");

		swapPerson();
		getResult("Person");

		changeHome();
		getResult("Home");

		changeStreet();
		getResult("Street");

		changeAddress();
		getResult("Address");

		changeOb();
		getResult("Ob");

		changeHome();
		getResult("Home");

		changeIndex(1);
		getResult("Index1");

		changeA();
		getResult("A");

		changeD();
		getResult("D");

		changeStreet();
		getResult("Street");

		changeAddress();
		getResult("Address");

		// ............................... Assert .................................
		equal(res, "None: 46A |Street: 46A> |Address: 46A>+ |Home: 46A>+$ |D: 52A>+$ |Index3: 58A>+$ |A: 60A>+$ |Index2: 50A>+$ |Ob: 50A>+$0 |Alt: 50B |Home: 50B$ |Address: 50B$+ |Street: 50B$+> |Person: 50xB |Home: 50xB$ |Street: 50xB$> |Address: 50xB$>+ |Ob: 50xB$>+1 |Home: 50xB$>+1$ |Index1: 54xB$>+1$ |A: 56xB$>+1$ |D: 62xB$>+1$ |Street: 62xB$>+1$> |Address: 62xB$>+1$>+ |",
		"Complex expression on bound tag property, with multiple adjacent paths, with nested () and [] paren expressions, chained observables, arithmetic expressions etc.");

		// ................................ Reset ................................
		$("#result").empty();

	})();

	(function() {
		// =============================== Arrange ===============================
		function setData() {
			res = "",

			theB = {
				a: "a"
			};

			theC = {
				_b: theB,
				b: function() {
					return this._b;
				}
			};

			theD = {
				_c: theC,
				c: function() {
					return this._c;
				}
			};

			theE = {
				_d: theD,
				d: function() {
					return this._d;
				}
			};

			theF = {
				_e: theE,
				e: function() {
					return this._e;
				}
			};

			theC.b.set = function(val) {
				this._b = val;
			};

			theD.c.set = function(val) {
				this._c = val;
			};

			theE.d.set = function(val) {
				this._d = val;
			};

			theF.e.set = function(val) {
				this._e = val;
			};

			data = {
				f: theF,
				e: theE,
				d: theD,
				c: theC,
				b: theB
			};
		}

		function getResult(name) {
			res += (name||resCount++) + ": " + $("#result").text() + " |";
		}

		var theB, theC, theD, theE, theF, data, res,
			resCount = 1,
			tmpl = $.templates('{^{:f.e().d().c().b().a /}} {^{:f.e().d().c().b()^a /}} {^{:f.e().d().c()^b().a /}} {^{:f.e().d()^c().b().a /}} {^{:f.e()^d().c().b().a /}} {^{:f^e().d().c().b().a /}}');

		setData();

		tmpl.link("#result", data);

		getResult("None");

		// ................................ Act ..................................
		$.observable(theB).setProperty("a", "A");

		getResult("Change a");

		$.observable(theC).setProperty("b", {a: "B"});

		getResult("Change b");

		$.observable(theD).setProperty("c", {
			_b: {a: "C"},
			b: function() {
				return this._b;
			}
		});

		getResult("Change c");

		$.observable(theE).setProperty("d", {
			_c: {
				_b: {a: "D"},
				b: function() {
					return this._b;
				}
			},
			c: function() {
				return this._c;
			}
		});

		getResult("Change d");

		$.observable(theF).setProperty("e", {
			_d: {
				_c: {
					_b: {a: "E"},
					b: function() {
						return this._b;
					}
				},
				c: function() {
					return this._c;
				}
			},
			d: function() {
				return this._d;
			}
		});

		getResult("Change e");

		// ............................... Assert .................................
		equal(res, isIE8
			? "None: a a a a a a |Change a: AAAAAA |Change b: ABBBBB |Change c: ABCCCC |Change d: ABCDDD |Change e: ABCDEE |"
			: "None: a a a a a a |Change a: A A A A A A |Change b: A B B B B B |Change c: A B C C C C |Change d: A B C D D D |Change e: A B C D E E |",
		"{{: ...}} expressions with deeply chained computed observables");
		// =============================== Arrange ===============================

		function setData2() {
			res = "",

			theB = {
				a1: {
					a: "a"
				}
			};

			theC = {
				b1: {
					_b: theB,
					b: function() {
						return this._b;
					}
				}
			};

			theD = {
				c1: {
					_c: theC,
					c: function() {
						return this._c;
					}
				}
			};

			theE = {
				d1: {
					_d: theD,
					d: function() {
						return this._d;
					}
				}
			};

			theF = {
				e1: {
					_e: theE,
					e: function() {
						return this._e;
					}
				}
			};

			theC.b1.b.set = function(val) {
				this._b = val;
			};

			theD.c1.c.set = function(val) {
				this._c = val;
			};

			theE.d1.d.set = function(val) {
				this._d = val;
			};

			theF.e1.e.set = function(val) {
				this._e = val;
			};
		}

		tmpl = $.templates('{^{:e1.e().d1.d().c1.c().b1.b().a1.a}} {^{:e1.e().d1.d().c1.c().b1.b().a1^a}} {^{:e1.e().d1.d().c1.c().b1.b()^a1.a}} {^{:e1.e().d1.d().c1.c().b1^b().a1.a}} {^{:e1.e().d1.d().c1.c()^b1.b().a1.a}} {^{:e1.e().d1.d().c1^c().b1.b().a1.a}} {^{:e1.e().d1.d()^c1.c().b1.b().a1.a}} {^{:e1.e().d1^d().c1.c().b1.b().a1.a}} {^{:e1.e()^d1.d().c1.c().b1.b().a1.a}} {^{:e1^e().d1.d().c1.c().b1.b().a1.a}}');

		setData2();

		tmpl.link("#result", theF);

		getResult("None");

		// ................................ Act ..................................

		$.observable(theB.a1).setProperty("a", "A");

		getResult("Change a");

		$.observable(theB).setProperty("a1", {
			a: "A1"
		});

		getResult("Change a1");

		$.observable(theC.b1).setProperty("b", {
			a1: {
				a: "B"
			}
		});

		getResult("Change b");

		$.observable(theC).setProperty("b1", {
			_b: {
				a1: {
					a: "B1"
				}
			},
			b: function() {
				return this._b;
			}
		});

		getResult("Change b1");

		$.observable(theD.c1).setProperty("c", {
			b1: {
				_b: {
					a1: {
						a: "C"
					}
				},
				b: function() {
					return this._b;
				}
			}
		});

		getResult("Change c");

		$.observable(theD).setProperty("c1", {
			_c: {
				b1: {
					_b: {
						a1: {
							a: "C1"
						}
					},
					b: function() {
						return this._b;
					}
				}
			},
			c: function() {
				return this._c;
			}
		});

		getResult("Change c1");

		$.observable(theE.d1).setProperty("d", {
			c1: {
				_c: {
					b1: {
						_b: {
							a1: {
								a: "D"
							}
						},
						b: function() {
							return this._b;
						}
					}
				},
				c: function() {
					return this._c;
				}
			}
		});

		getResult("Change d");

		$.observable(theE).setProperty("d1", {
			_d: {
				c1: {
					_c: {
						b1: {
							_b: {
								a1: {
									a: "D1"
								}
							},
							b: function() {
								return this._b;
							}
						}
					},
					c: function() {
						return this._c;
					}
				}
			},
			d: function() {
				return this._d;
			}
		});

		getResult("Change d1");

		$.observable(theF.e1).setProperty("e", {
			d1: {
				_d: {
					c1: {
						_c: {
							b1: {
								_b: {
									a1: {
										a: "E"
									}
								},
								b: function() {
									return this._b;
								}
							}
						},
						c: function() {
							return this._c;
						}
					}
				},
				d: function() {
					return this._d;
				}
			}
		});

		getResult("Change e");

		$.observable(theF).setProperty("e1", {
			_e: {
				d1: {
					_d: {
						c1: {
							_c: {
								b1: {
									_b: {
										a1: {
											a: "E1"
										}
									},
									b: function() {
										return this._b;
									}
								}
							},
							c: function() {
								return this._c;
							}
						}
					},
					d: function() {
						return this._d;
					}
				}
			},
			e: function() {
				return this._e;
			}
		});

		getResult("Change e1");

		// ............................... Assert .................................
		equal(res, isIE8
			? "None: a a a a a a a a a a |Change a: AAAAAAAAAA |Change a1: AA1A1A1A1A1A1A1A1A1 |Change b: AA1BBBBBBBB |Change b1: AA1BB1B1B1B1B1B1B1 |Change c: AA1BB1CCCCCC |Change c1: AA1BB1CC1C1C1C1C1 |Change d: AA1BB1CC1DDDD |Change d1: AA1BB1CC1DD1D1D1 |Change e: AA1BB1CC1DD1EE |Change e1: AA1BB1CC1DD1EE1 |"
			: "None: a a a a a a a a a a |Change a: A A A A A A A A A A |Change a1: A A1 A1 A1 A1 A1 A1 A1 A1 A1 |Change b: A A1 B B B B B B B B |Change b1: A A1 B B1 B1 B1 B1 B1 B1 B1 |Change c: A A1 B B1 C C C C C C |Change c1: A A1 B B1 C C1 C1 C1 C1 C1 |Change d: A A1 B B1 C C1 D D D D |Change d1: A A1 B B1 C C1 D D1 D1 D1 |Change e: A A1 B B1 C C1 D D1 E E |Change e1: A A1 B B1 C C1 D D1 E E1 |",
		"{{: ...}} expressions with deeply chained computed observables (variant)");

		// =============================== Arrange ===============================
		tmpl = $.templates('{^{for f.e().d().c().b()}}{^{:a}}{{/for}} {^{for f.e().d().c()^b()}}{^{:a}}{{/for}} {^{for f.e().d()^c().b()}}{^{:a}}{{/for}} {^{for f.e()^d().c().b()}}{^{:a}}{{/for}} {^{for f^e().d().c().b()}}{^{:a}}{{/for}}');

		setData();

		tmpl.link("#result", data);

		getResult("None");

		// ................................ Act ..................................

		$.observable(theB).setProperty("a", "A");

		getResult("Change a");

		$.observable(theC).setProperty("b", {a: "B"});

		getResult("Change b");

		$.observable(theD).setProperty("c", {
			_b: {a: "C"},
			b: function() {
				return this._b;
			}
		});

		getResult("Change c");

		$.observable(theE).setProperty("d", {
			_c: {
				_b: {a: "D"},
				b: function() {
					return this._b;
				}
			},
			c: function() {
				return this._c;
			}
		});

		getResult("Change d");

		$.observable(theF).setProperty("e", {
			_d: {
				_c: {
					_b: {a: "E"},
					b: function() {
						return this._b;
					}
				},
				c: function() {
					return this._c;
				}
			},
			d: function() {
				return this._d;
			}
		});

		getResult("Change e");

		// ............................... Assert .................................
		equal(res, isIE8
			? "None: a a a a a |Change a: AAAAA |Change b: BBBBB |Change c: BCCCC |Change d: BCDDD |Change e: BCDEE |"
			: "None: a a a a a |Change a: A A A A A |Change b: B B B B B |Change c: B C C C C |Change d: B C D D D |Change e: B C D E E |",
		"{{for ...}} expressions with deeply chained computed observables");

		// =============================== Arrange ===============================
		tmpl = $.templates('{^{:f.e().d().c().b().a + " " + e.d().c().b().a + " " + d.c().b().a + " " + c.b().a + " " + b.a}} | {^{:f.e()^d().c().b().a + " " + e.d()^c().b().a + " " + d.c()^b().a + " " + c.b()^a + " " + b.a}}');

		setData();

		tmpl.link("#result", data);

		getResult("None");

		// ................................ Act ..................................

		$.observable(theB).setProperty("a", "A");

		getResult("Change a");

		$.observable(theC).setProperty("b", {a: "B"});

		getResult("Change b");

		$.observable(theD).setProperty("c", {
			_b: {a: "C"},
			b: function() {
				return this._b;
			}
		});

		getResult("Change c");

		$.observable(theE).setProperty("d", {
			_c: {
				_b: {a: "D"},
				b: function() {
					return this._b;
				}
			},
			c: function() {
				return this._c;
			}
		});

		getResult("Change d");

		$.observable(theF).setProperty("e", {
			_d: {
				_c: {
					_b: {a: "E"},
					b: function() {
						return this._b;
					}
				},
				c: function() {
					return this._c;
				}
			},
			d: function() {
				return this._d;
			}
		});

		getResult("Change e");

		// ............................... Assert .................................
		equal(res, isIE8
			? "None: a a a a a | a a a a a |Change a: A A A A A |A A A A A |Change b: A A A A A |B B B B A |Change c: A A A A A |C C C B A |Change d: A A A A A |D D C B A |Change e: A A A A A |E D C B A |"
			: "None: a a a a a | a a a a a |Change a: A A A A A | A A A A A |Change b: A A A A A | B B B B A |Change c: A A A A A | C C C B A |Change d: A A A A A | D D C B A |Change e: A A A A A | E D C B A |",
		"Sibling {{: ...}} expressions with deeply chained computed observables");

		// ................................ Reset ................................
		$("#result").empty();

	})();
});

module("API - data-bound tags");

test("{^{:expression}}", function() {

	// ................................ Reset ................................
	person1.lastName = "One"; // reset Prop
	$.views.settings.debugMode(); // For using viewsAndBindings()

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

	// =============================== Arrange ===============================

	// ................................ Act ..................................

	$("#result").empty();

	// ............................... Assert .................................

	ok(!viewsAndBindings() && !$._data(person1).events,
	"$(container).empty removes both views and current listeners from that content");

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

	// ................................ Reset ................................
	$("#result").empty();
	person1.lastName = "One"; // reset Prop

	// =============================== Arrange ===============================

	var tmpl = $.templates("{^{:#data.person1.home.address.street}}{^{:person1.home^address.street}}");
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

	// =============================== Arrange ===============================

	var count = 0,
		data = {
			last: "Smith",
			other: "Other",
			a: function() { return this; }
		};

	$.views.tags({
		textbox: {
			onAfterLink: function() {
				// Find input in contents, if not already found
				this.linkedElem = this.linkedElem || this.contents("input");
			},
			onUpdate: function() {
				// No need to re-render whole tag, when content updates.
				return false;
			},
			template: "<b>{^{:~tag.tagCtx.props.label}}</b><input/><br/>"
		}
	});

	tmpl = $.templates(
	'<input data-link="a().other last trigger=true convert=~upper convertBack=~lower" />'
	+ '<input data-link=" convert=~upper convertBack=~lower last a().other trigger=true" />'

	+ '<input data-link="other trigger=true" />'
	+ '<input data-link="last trigger=true" />'

	+ '{^{:convert=~upper last a().other}}'
	+ '{^{:a().other last convert=~upper}}'

	+ '{^{textbox a().other last trigger=true convert=~upper convertBack=~lower/}}'
	+ '{^{textbox convert=~upper convertBack=~lower last a().other trigger=true/}}');

	$.link(tmpl, "#result", data, {
		upper: function(val) { return val.toUpperCase(); },
		lower: function(val) { return val.toLowerCase(); }
	});

	// ................................ Act ..................................
	before = $("#result").text();
	$("#result input").each(function() {
		before += this.value;
	});
	$.observable(data).setProperty("last", "newLast");
	$.observable(data).setProperty("other", "newOther");
	$("#result input").each(function() {
		this.value += count++;
		$(this).change();
	});
	after = $("#result").text();
	$("#result input").each(function() {
		after += this.value;
	});

	// ............................... Assert .................................
	equal(before + "|" + after,
	"SMITHOTHEROTHERSMITHOtherSmithOTHERSMITH|NEWLAST135NEWOTHER024NEWOTHER024NEWLAST135newother024newlast135NEWOTHER024NEWLAST135",
	'Binding correctly to and from first argument, even with multiple args and props and with objects in paths, and with converters');

	// ................................ Reset ................................
	$("#result").empty();

	// =============================== Arrange ===============================

	var ob = { text: "aBc" };
	$.link("~upper(~ob.text) + ~lower(~ob.text)", "#result", undefined, {
		upper: function(val) { return val.toUpperCase(); },
		lower: function(val) { return val.toLowerCase(); },
		ob: ob
	});

	// ................................ Act ..................................
	before = $("#result").text();
	$.observable(ob).setProperty("text", "DeF");
	after = $("#result").text();

	// ............................... Assert .................................
	equal(before + "|" + after,
	"ABCabc|DEFdef",
	'$.link(expression, selector, undefined, helpers) - without passing data, data-links correctly to helpers');

	// ................................ Reset ................................
	$("#result").empty();
	$.unlink(true, "#result");

	// =============================== Arrange ===============================

	ob = { text: "aBc" };
	$.views.helpers({
		upper: function(val) { return val.toUpperCase(); },
		lower: function(val) { return val.toLowerCase(); },
		ob: ob
	});
	$.link("~upper(~ob.text) + ~lower(~ob.text)", "#result");

	// ................................ Act ..................................
	before = $("#result").text();
	$.observable(ob).setProperty("text", "DeF");
	after = $("#result").text();

	// ............................... Assert .................................
	equal(before + "|" + after,
	"ABCabc|DEFdef",
	'$.link(expression, selector) - without passing data, data-links correctly to helpers');

	// ................................ Reset ................................
	$.unlink(true, "#result");
	$("#result").empty();

	// =============================== Arrange ===============================

	tmpl = $.templates("{^{:~upper(~ob.text)}}{^{:~lower(~ob.text)}}");
	$.views.helpers.ob = ob = { text: "aBc" };
	$.link(tmpl, "#result");

	// ................................ Act ..................................
	before = $("#result").text();
	$.observable(ob).setProperty("text", "DeF");
	after = $("#result").text();

	// ............................... Assert .................................
	equal(before + "|" + after,
	"ABCabc|DEFdef",
	'$.link(template, selector) - without passing data, data-links correctly to helpers');

	// ................................ Reset ................................
	$("#result").empty();

	// =============================== Arrange ===============================

	$.views.helpers.ob = ob = { text: "aBc" };
	tmpl.link("#result");

	// ................................ Act ..................................
	before = $("#result").text();
	$.observable(ob).setProperty("text", "DeF");
	after = $("#result").text();

	// ............................... Assert .................................
	equal(before + "|" + after,
	"ABCabc|DEFdef",
	'template.link(selector) - without passing data, data-links correctly to helpers');

	// ................................ Reset ................................
	$("#result").empty();

	// =============================== Arrange ===============================

	$.views.helpers.ob = ob = { text: "aBc" };
	$("#result").link(tmpl);

	// ................................ Act ..................................
	before = $("#result").text();
	$.observable(ob).setProperty("text", "DeF");
	after = $("#result").text();

	// ............................... Assert .................................
	equal(before + "|" + after,
	"ABCabc|DEFdef",
	'$(selector).link(template) - without passing data, data-links correctly to helpers');

	// ................................ Reset ................................
	$("#result").empty();

	// =============================== Arrange ===============================

	$.views.helpers.ob = ob = { text: "aBc" };
	$("#result").link("~upper(~ob.text) + ~lower(~ob.text)");

	// ................................ Act ..................................
	before = $("#result").text();
	$.observable(ob).setProperty("text", "DeF");
	after = $("#result").text();

	// ............................... Assert .................................
	equal(before + "|" + after,
	"ABCabc|DEFdef",
	'$(selector).link(expression) - without passing data, data-links correctly to helpers');

	// ................................ Reset ................................
	$.unlink(true, "#result");
	$("#result").empty();

	$.views.settings.debugMode(false);
});

test("{^{>expression}}", function() {

	$.views.settings.debugMode(); // For using viewsAndBindings()

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

	// =============================== Arrange ===============================

	// ................................ Act ..................................

	$("#result").empty();

	// ............................... Assert .................................

	ok(!viewsAndBindings() && !$._data(person1).events,
	"$(container).empty removes both views and current listeners from that content");

	// ................................ Reset ................................
	person1.lastName = "One"; // reset Prop

	// =============================== Arrange ===============================

	var tmpl = $.templates("{^{>#data.person1.home.address.street}}{^{>person1.home^address.street}}");
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

	$.views.settings.debugMode(false);
});

test("{^{tag}}", function() {

	// ................................ Reset ................................
	person1._firstName = "Jo"; // reset Prop
	person1.lastName = "One"; // reset Prop
	settings.title = "Mr"; // reset Prop
	settings.width = 30; // reset Prop

	// =============================== Arrange ===============================
	$.views.tags({
		norendernotemplate: {},
		voidrender: function() { },
		emptyrender: function() { return ""; },
		emptytemplate: {
			template: ""
		},
		templatereturnsempty: {
			template: "{{:a}}"
		}
	});

	// ............................... Assert .................................
	$.templates("a{{norendernotemplate/}}b{^{norendernotemplate/}}c{{norendernotemplate}}{{/norendernotemplate}}d{^{norendernotemplate}}{{/norendernotemplate}}e").link("#result", 1);
	equal($("#result").text(), "abcde",
	"non-rendering tag (no template, no render function) renders empty string");

	$.templates("a{{voidrender/}}b{^{voidrender/}}c{{voidrender}}{{/voidrender}}d{^{voidrender}}{{/voidrender}}e").link("#result", 1);
	equal($("#result").text(), "abcde",
	"non-rendering tag (no template, no return from render function) renders empty string");

	$.templates("a{{emptyrender/}}b{^{emptyrender/}}c{{emptyrender}}{{/emptyrender}}d{^{emptyrender}}{{/emptyrender}}e").link("#result", 1);
	equal($("#result").text(), "abcde",
	"non-rendering tag (no template, empty string returned from render function) renders empty string", 1);

	$.templates("a{{emptytemplate/}}b{^{emptytemplate/}}c{{emptytemplate}}{{/emptytemplate}}d{^{emptytemplate}}{{/emptytemplate}}e").link("#result", 1);
	equal($("#result").text(), "abcde",
	"non-rendering tag (template has no content, no render function) renders empty string");

	$.templates("a{{templatereturnsempty/}}b{^{templatereturnsempty/}}c{{templatereturnsempty}}{{/templatereturnsempty}}d{^{templatereturnsempty}}{{/templatereturnsempty}}e").link("#result", 1);
	equal($("#result").text(), "abcde",
	"non-rendering tag (template returns empty string, no render function) renders empty string");

	// =============================== Arrange ===============================

	$.templates('{^{tmplTag/}}')
		.link("#result", person1, { settings: settings });

	// ................................ Act ..................................
	before = $("#result").text();
	$.observable(person1).setProperty({ firstName: "newFirst", lastName: "newLast" });
	$.observable(settings).setProperty({ title: "Sir", width: 40 });
	$.observable(person1).setProperty({ fullName: "compFirst compLast" });
	after = $("#result").text();

	// ............................... Assert .................................
	equal(before + "|" + after, 'Name: Mr Jo. Width: 30|Name: Sir compFirst. Width: 40',
	'Data link with: {^{tmplTag/}} updates when dependant object paths change');

	// ................................ Reset ................................
	$("#result").empty();
	person1._firstName = "Jo"; // reset Prop
	person1.lastName = "One"; // reset Prop
	settings.title = "Mr"; // reset Prop
	settings.width = 30; // reset Prop

	// =============================== Arrange ===============================

	$.templates('{{tmplTag/}}')
		.link("#result", person1, { settings: settings });

	// ................................ Act ..................................
	before = $("#result").text();
	$.observable(person1).setProperty({ firstName: "newFirst", lastName: "newLast" });
	$.observable(settings).setProperty({ title: "Sir", width: 40 });
	$.observable(person1).setProperty({ fullName: "compFirst compLast" });
	after = $("#result").text();

	// ............................... Assert .................................
	ok(before === 'Name: Mr Jo. Width: 30' && before === after && !$._data(person1).events && !$._data(settings).events,
	'Data link with: {{tmplTag/}} does nothing');

	// ................................ Reset ................................
	$("#result").empty();
	person1._firstName = "Jo"; // reset Prop
	person1.lastName = "One"; // reset Prop
	settings.title = "Mr"; // reset Prop
	settings.width = 30; // reset Prop

	// =============================== Arrange ===============================

	$.templates('{^{fnTag/}}')
		.link("#result", person1, { settings: settings });

	// ................................ Act ..................................
	before = $("#result").text();
	$.observable(person1).setProperty({ firstName: "newFirst", lastName: "newLast" });
	$.observable(settings).setProperty({ title: "Sir", width: 40 });
	$.observable(person1).setProperty({ fullName: "compFirst compLast" });
	after = $("#result").text();

	// ............................... Assert .................................
	equal(before + "|" + after, 'Name: Mr Jo. Width: 30|Name: Sir compFirst. Width: 40',
	'Data link with: {^{fnTag/}} updates when dependant object paths change');

	// ................................ Reset ................................
	$("#result").empty();
	person1._firstName = "Jo"; // reset Prop
	person1.lastName = "One"; // reset Prop
	settings.title = "Mr"; // reset Prop
	settings.width = 30; // reset Prop

	// =============================== Arrange ===============================

	$.templates('{{fnTag/}}')
		.link("#result", person1, { settings: settings });

	// ................................ Act ..................................
	before = $("#result").text();
	$.observable(person1).setProperty({ firstName: "newFirst", lastName: "newLast" });
	$.observable(settings).setProperty({ title: "Sir", width: 40 });
	$.observable(person1).setProperty({ fullName: "compFirst compLast" });
	after = $("#result").text();

	// ............................... Assert .................................
	ok(before === 'Name: Mr Jo. Width: 30' && before === after && !$._data(person1).events && !$._data(settings).events,
	'Data link with: {{fnTag/}} does nothing');

	// ................................ Reset ................................
	$("#result").empty();
	person1._firstName = "Jo"; // reset Prop
	person1.lastName = "One"; // reset Prop
	settings.title = "Mr"; // reset Prop
	settings.width = 30; // reset Prop

	// =============================== Arrange ===============================

	$.templates('<div>{^{fnTagEl/}}</div>')
		.link("#result", person1, { settings: settings });

	// ................................ Act ..................................
	before = $("#result div *")[1].outerHTML; // The innerHTML will be <script type="jsv#^6_"></script>Name: Sir compFirst. Width: 40<script type="jsv/^6_"></script>
	$.observable(person1).setProperty({ firstName: "newFirst", lastName: "newLast" });
	$.observable(settings).setProperty({ title: "Sir", width: 40 });
	$.observable(person1).setProperty({ fullName: "compFirst compLast" });
	after = $("#result div *")[1].outerHTML;
	// ............................... Assert .................................
	equal(before + "|" + after,
	isIE8 ? '<SPAN>Name: Mr Jo. Width: 30</SPAN>|<SPAN>Name: Sir compFirst. Width: 40</SPAN>' : '<span>Name: Mr Jo. Width: 30</span>|<span>Name: Sir compFirst. Width: 40</span>',
	'Data link with: {^{fnTagEl/}} rendering <span>, updates when dependant object paths change');

	// ................................ Reset ................................
	$("#result").empty();
	person1._firstName = "Jo"; // reset Prop
	person1.lastName = "One"; // reset Prop
	settings.title = "Mr"; // reset Prop
	settings.width = 30; // reset Prop

	// =============================== Arrange ===============================
	$.templates('<div>{^{fnTagElNoInit firstName ~settings.width/}}</div>')
		.link("#result", person1, { settings: settings });

	// ................................ Act ..................................
	before = $("#result div span").html(); // The innerHTML will be ""<li data-jsv=\"#37_\">Name: Mr Jo. Width: 30</li>"
	$.observable(person1).setProperty({ firstName: "newFirst", lastName: "newLast" });
	$.observable(settings).setProperty({ title: "Sir", width: 40 });
	$.observable(person1).setProperty({ fullName: "compFirst compLast" });
	after = $("#result div span").html();

	// ............................... Assert .................................
	equal(before + "|" + after,
	'Name: Mr Jo. Width: 30|Name: Sir compFirst. Width: 40',
	'Data link with {^{fnTagElNoInit}} rendering <span>, updates when dependant object paths change');

	// ................................ Reset ................................
	$("#result").empty();
	person1._firstName = "Jo"; // reset Prop
	person1.lastName = "One"; // reset Prop
	settings.title = "Mr"; // reset Prop
	settings.width = 30; // reset Prop

	// =============================== Arrange ===============================

	$.templates('<ul>{^{fnTagElCnt/}}</ul>')
		.link("#result", person1, { settings: settings });

	// ................................ Act ..................................
	before = $("#result ul li").html(); // The innerHTML will be ""<li data-jsv=\"#37_\">Name: Mr Jo. Width: 30</li>"
	$.observable(person1).setProperty({ firstName: "newFirst", lastName: "newLast" });
	$.observable(settings).setProperty({ title: "Sir", width: 40 });
	$.observable(person1).setProperty({ fullName: "compFirst compLast" });
	after = $("#result ul li").html();

	// ............................... Assert .................................
	equal(before + "|" + after,
	'Name: Mr Jo. Width: 30|Name: Sir compFirst. Width: 40',
	'Data link with {^{fnTagElCnt}} rendering <li>, updates when dependant object paths change');

	// ................................ Reset ................................
	$("#result").empty();
	person1._firstName = "Jo"; // reset Prop
	person1.lastName = "One"; // reset Prop
	settings.title = "Mr"; // reset Prop
	settings.width = 30; // reset Prop

	// =============================== Arrange ===============================

	$.templates('<ul>{^{fnTagElCntNoInit firstName ~settings.width/}}</ul>')
		.link("#result", person1, { settings: settings });

	// ................................ Act ..................................
	before = $("#result ul li").html(); // The innerHTML will be ""<li data-jsv=\"#37_\">Name: Mr Jo. Width: 30</li>"
	$.observable(person1).setProperty({ firstName: "newFirst", lastName: "newLast" });
	$.observable(settings).setProperty({ title: "Sir", width: 40 });
	$.observable(person1).setProperty({ fullName: "compFirst compLast" });
	after = $("#result ul li").html();

	// ............................... Assert .................................
	equal(before + "|" + after,
	'Name: Mr Jo. Width: 30|Name: Sir compFirst. Width: 40',
	'Data link with {^{fnTagElCntNoInit}} rendering <li>, updates when dependant object paths change');

	// ................................ Reset ................................
	$("#result").empty();
	person1._firstName = "Jo"; // reset Prop
	person1.lastName = "One"; // reset Prop
	settings.title = "Mr"; // reset Prop
	settings.width = 30; // reset Prop

	// =============================== Arrange ===============================

	$.templates('{^{tmplTagWithProps #data ~settings.reverse theTitle=~settings.title ~street=home.address.street/}}')
		.link("#result", person1, { settings: settings });

	// ................................ Act ..................................
	before = $("#result").text();
	$.observable(person1).setProperty({ firstName: "newFirst", lastName: "newLast", "home.address.street": "newStreet" });
	$.observable(settings).setProperty({ title: "Sir", width: 40, reverse: false });
	$.observable(person1).setProperty({ fullName: "compFirst compLast" });
	after = $("#result").text();

	// ............................... Assert .................................
	equal(before + "|" + after, 'Name: Mr Jo. Width: 30. Value: true. Prop theTitle: Mr. Prop ~street: StreetOne|Name: Sir compFirst. Width: 40. Value: false. Prop theTitle: Sir. Prop ~street: newStreet',
	'Data link with: {^{tmplTagWithProps ~some.path foo=~other.path ~bar=another.path/}} updates when dependant object paths change');

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
		.link("#result", person1, { settings: settings });

	// ................................ Act ..................................
	before = $("#result").text();
	$.observable(person1).setProperty({ firstName: "newFirst", lastName: "newLast", "home.address.street": "newStreet" });
	$.observable(settings).setProperty({ title: "Sir", width: 40, reverse: false });
	$.observable(person1).setProperty({ fullName: "compFirst compLast" });
	after = $("#result").text();

	// ............................... Assert .................................
	ok(before === 'Name: Mr Jo. Width: 30. Value: true. Prop theTitle: Mr. Prop ~street: StreetOne' && before === after && !$._data(person1).events && !$._data(settings).events,
	'Data link with: {{tmplTagWithProps ~some.path foo=~other.path ~bar=another.path/}} does nothing');

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
		.link("#result", person1, { settings: settings });

	// ................................ Act ..................................
	before = $("#result").text();
	$.observable(person1).setProperty({ firstName: "newFirst", lastName: "newLast", "home.address.street": "newStreet" });
	$.observable(settings).setProperty({ title: "Sir", width: 40, reverse: false });
	$.observable(person1).setProperty({ fullName: "compFirst compLast" });
	after = $("#result").text();

	// ............................... Assert .................................
	equal(before + "|" + after, 'Name: Mr Jo. Width: 30. Value: true. Prop theTitle: Mr. Prop ~street: StreetOne|Name: Sir compFirst. Width: 40. Value: false. Prop theTitle: Sir. Prop ~street: newStreet',
	'Data link with: {^{fnTagWithProps ~some.path foo=~other.path ~bar=another.path/}} updates when dependant object paths change');

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
		.link("#result", person1, { settings: settings });

	// ................................ Act ..................................
	before = $("#result").text();
	$.observable(person1).setProperty({ firstName: "newFirst", lastName: "newLast", "home.address.street": "newStreet" });
	$.observable(settings).setProperty({ title: "Sir", width: 40, reverse: false });
	$.observable(person1).setProperty({ fullName: "compFirst compLast" });
	after = $("#result").text();

	// ............................... Assert .................................
	ok(before === 'Name: Mr Jo. Width: 30. Value: true. Prop theTitle: Mr. Prop ~street: StreetOne' && before === after && !$._data(person1).events && !$._data(settings).events,
	'Data link with: {{fnTagWithProps ~some.path foo=~other.path ~bar=another.path/}} does nothing');

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
				return { b: val };
			}
		});

	// ............................... Assert .................................
	equal($("#result span")[0].outerHTML, isIE8 ? "<SPAN>w\\x\'y</SPAN>" : "<span>w\\x\'y</span>",
	"{^{myTag foo(\"w\\x\'y\").b/}} - correct compilation and output of quotes and backslash, with object returned in path (so nested compilation)");
	equal($("#result span")[1].outerHTML, isIE8 ? "<SPAN>w\\x</SPAN>" : "<span>w\\x</span>",
	"<div data-link=\"{myTag foo('w\\x').b}\" > - correct compilation and output of quotes and backslash, with object returned in path (so nested compilation)");

	// ................................ Reset ................................
	$("#result").empty();
	result = "";
});

test("{^{for}}", function() {

	// ................................ Reset ................................
	person1._firstName = "Jo"; // reset Prop
	person1.lastName = "One"; // reset Prop
	settings.title = "Mr"; // reset Prop
	settings.width = 30; // reset Prop
	model.things = []; // reset Prop
	$.views.settings.debugMode(); // For using viewsAndBindings()

	// =============================== Arrange ===============================

	model.things = [{ thing: "box" }]; // reset Prop
	$.templates('{^{for things}}{{:thing}}{{/for}}')
		.link("#result", model);

	// ................................ Act ..................................
	before = $("#result").text();
	$.observable(model.things).insert(0, { thing: "tree" });
	after = $("#result").text();

	// ............................... Assert .................................
	equal(before + "|" + after, 'box|treebox',
	'{^{for things}} binds to array changes on leaf array');

	// ................................ Act ..................................
	$.observable(model).setProperty({ things: [{ thing: "triangle" }, { thing: "circle" }] });
	after = $("#result").text();

	// ............................... Assert .................................
	equal(after, 'trianglecircle',
	'{^{for things}} binds to property change on path');

	// ................................ Act ..................................
	$.observable(model).setProperty({ things: { thing: "square" } });
	after = $("#result").text();

	// ............................... Assert .................................
	equal(after, 'square',
	'{^{for things}} binds to property change on path - swapping from array to singleton object');

	// ................................ Act ..................................
	$.observable(model).setProperty({ things: [{ thing: "triangle2" }, { thing: "circle2" }] });
	after = $("#result").text();

	// ............................... Assert .................................
	equal(after, 'triangle2circle2',
	'{^{for things}} binds to property change on path - swapping from singleton back to array');

	// ................................ Act ..................................
	$.observable(model.things).insert([{ thing: "oblong" }, { thing: "pentagon" }]);
	after = $("#result").text();

	// ............................... Assert .................................
	equal(after, 'triangle2circle2oblongpentagon',
	'{^{for things}} binds to array change on array after swapping from singleton back to array');

	// ................................ Reset ................................
	$("#result").empty();
	model.things = []; // reset Prop

	// =============================== Arrange ===============================

	var things1 = [{ thing: "box" }],
		things2 = [{ thing: "triangle" }, { thing: "circle" }],
		square = { thing: "square" };

	model.things = things1; // reset Prop

	$.templates('{^{for things}}{{:thing}}{{/for}}')
		.link("#result", model);

	// ................................ Act ..................................
	before = $("#result").text();
	$.observable(things1).insert(0, { thing: "tree" });
	after = $("#result").text();

	// ............................... Assert .................................
	equal(before + "|" + after, 'box|treebox',
	'{^{for things}} binds to array changes on leaf array');

	// ................................ Act ..................................
	$.observable(model).setProperty({ things: things2 });
	after = $("#result").text();

	// ............................... Assert .................................
	equal(after, 'trianglecircle',
	'{^{for things}} binds to property change on path');

	// ................................ Act ..................................
	$.observable(model).setProperty({ things: square });
	after = $("#result").text();

	// ............................... Assert .................................
	equal(after, 'square',
	'{^{for things}} binds to property change on path - swapping from array to singleton object');

	// ................................ Act ..................................
	$.observable(model).setProperty({ things: things2 });
	after = $("#result").text();

	// ............................... Assert .................................
	equal(after, 'trianglecircle',
	'{^{for things}} binds to property change on path - swapping from singleton back to previous array');

	// ................................ Act ..................................
	$.observable(things2).insert([{ thing: "oblong" }, { thing: "pentagon" }]);
	after = $("#result").text();

	// ............................... Assert .................................
	equal(after, 'trianglecircleoblongpentagon',
	'{^{for things}} binds to array change on array after swapping from singleton back to array');

	// ................................ Reset ................................
	$("#result").empty();
	model.things = []; // reset Prop

	// =============================== Arrange ===============================

	things1 = [{ thing: "box" }],
	things2 = [{ thing: "triangle" }, { thing: "circle" }];
	square = { thing: "square" };

	model.things = things1; // reset Prop

	$.templates('<ul>{^{for things}}<li>{{:thing}}</li>{{/for}}</ul>')
		.link("#result", model);

	// ................................ Act ..................................
	before = $("#result").text();
	$.observable(things1).insert(0, { thing: "tree" });
	after = $("#result").text();

	// ............................... Assert .................................
	equal(before + "|" + after, 'box|treebox',
	'{^{for things}} in element content binds to array changes on leaf array');

	// ................................ Act ..................................
	$.observable(model).setProperty({ things: things2 });
	after = $("#result").text();

	// ............................... Assert .................................
	equal(after, 'trianglecircle',
	'{^{for things}} binds to property change on path');

	// ................................ Act ..................................
	$.observable(model).setProperty({ things: square });
	after = $("#result").text();

	// ............................... Assert .................................
	equal(after, 'square',
	'{^{for things}} binds to property change on path - swapping from array to singleton object');

	// ................................ Act ..................................
	$.observable(model).setProperty({ things: things2 });
	after = $("#result").text();

	// ............................... Assert .................................
	equal(after, 'trianglecircle',
	'{^{for things}} binds to property change on path - swapping from singleton back to previous array');

	// ................................ Act ..................................
	$.observable(things2).insert([{ thing: "oblong" }, { thing: "pentagon" }]);
	after = $("#result").text();

	// ............................... Assert .................................
	equal(after, 'trianglecircleoblongpentagon',
	'{^{for things}} binds to array change on array after swapping from singleton back to array');

	// ................................ Reset ................................
	$("#result").empty();
	model.things = []; // reset Prop

	// =============================== Arrange ===============================

	model.things = [{ thing: "box" }, { thing: "table" }]; // reset Prop

	$.templates('{^{:length}} {^{for #data}}{{:thing}}{{/for}}')
		.link("#result", model.things, null, true);

	// ................................ Act ..................................
	before = $("#result").text();
	$.observable(model.things).insert(0, { thing: "tree" });
	after = $("#result").text();

	// ............................... Assert .................................
	equal(before + "|" + after, isIE8 ? "2 boxtable|3tree boxtable" : "2 boxtable|3 treeboxtable",
	'{^{for #data}} when #data is an array binds to array changes on #data');

	// ................................ Reset ................................
	$("#result").empty();
	model.things = []; // reset Prop

	// =============================== Arrange ===============================

	model.things = [{ thing: "box" }, { thing: "table" }]; // reset Prop

	$.templates('{^{:length}} {^{for}}{{:thing}}{{/for}}')
		.link("#result", model.things, null, true);

	// ................................ Act ..................................
	before = $("#result").text();
	$.observable(model.things).insert(0, { thing: "tree" });
	after = $("#result").text();

	// ............................... Assert .................................
	equal(before + "|" + after, isIE8 ? "2 boxtable|3tree boxtable" : "2 boxtable|3 treeboxtable",
	'{^{for}} when #data is an array binds to array changes on #data');

	// ................................ Reset ................................
	$("#result").empty();
	model.things = []; // reset Prop

	// =============================== Arrange ===============================

	model.things = []; // reset Prop

	$.templates('{^{if things.length}}X {^{for things}}{{:thing}}{{/for}}{{/if}}')
		.link("#result", model);

	// ................................ Act ..................................
	after = $("#result").text();
	$.observable(model.things).insert({ thing: "box " });
	after += "|" + $("#result").text();
	$.observable(model.things).insert({ thing: "table " });
	after += "|" + $("#result").text();
	$.observable(model.things).insert(0, { thing: "tree " });
	after += "|" + $("#result").text();
	$.observable(model.things).remove();
	after += "|" + $("#result").text();
	$.observable(model.things).remove(0);
	after += "|" + $("#result").text();
	$.observable(model.things).remove();
	after += "|" + $("#result").text();
	$.observable(model.things).refresh([{ thing: "pen " },{ thing: "lamp " }]);
	after += "|" + $("#result").text();
	$.observable(model.things).move(0, 1);
	after += "|" + $("#result").text();
	$.observable(model.things).refresh([]);
	after += "|" + $("#result").text();

	// ............................... Assert .................................
	equal(after, isIE8
		? "|X box |X boxtable  |Xtree  boxtable  |Xtree  box  |X  box  ||Xpen lamp  |Xlamp pen  |"
		: "|X box |X box table |X tree box table |X tree box |X box ||X pen lamp |X lamp pen |",
	'{^{if things.length}}{^{for things}} content block bound to both array and array.length responds correctly to observable array changes');

	// ................................ Reset ................................
	$("#result").empty();
	model.things = []; // reset Prop

	// =============================== Arrange ===============================

	model.things = []; // reset Prop

	$.templates('{^{for things.length && things}}{{:thing}}{{/for}}')
		.link("#result", model);

	// ................................ Act ..................................
	after = $("#result").text();
	$.observable(model.things).insert({ thing: "box " });
	after += "|" + $("#result").text();
	$.observable(model.things).insert({ thing: "table " });
	after += "|" + $("#result").text();
	$.observable(model.things).insert(0, { thing: "tree " });
	after += "|" + $("#result").text();
	$.observable(model.things).remove();
	after += "|" + $("#result").text();
	$.observable(model.things).remove(0);
	after += "|" + $("#result").text();
	$.observable(model.things).remove();
	after += "|" + $("#result").text();
	$.observable(model.things).refresh([{ thing: "pen " },{ thing: "lamp " }]);
	after += "|" + $("#result").text();
	$.observable(model.things).move(0, 1);
	after += "|" + $("#result").text();
	$.observable(model.things).refresh([]);
	after += "|" + $("#result").text();

	// ............................... Assert .................................
	equal(after, isIE8
		? "|box |box table |tree box table |tree box |box ||pen lamp  |lamp pen  |"
		: "|box |box table |tree box table |tree box |box ||pen lamp |lamp pen |",
	'{^{for things.length && things}} content block bound to both array and array.length responds correctly to observable array changes');

	// ................................ Reset ................................
	$("#result").empty();
	model.things = []; // reset Prop

	// =============================== Arrange ===============================

	model.things = []; // reset Prop

	$.templates('{^{for things.length}}{^{for ~root.things}}{{:thing}}{{/for}}{{/for}}')
		.link("#result", model);

	// ................................ Act ..................................
	after = $("#result").text();
	$.observable(model.things).insert({ thing: "box " });
	after += "|" + $("#result").text();
	$.observable(model.things).insert({ thing: "table " });
	after += "|" + $("#result").text();
	$.observable(model.things).insert(0, { thing: "tree " });
	after += "|" + $("#result").text();
	$.observable(model.things).remove();
	after += "|" + $("#result").text();
	$.observable(model.things).remove(0);
	after += "|" + $("#result").text();
	$.observable(model.things).remove();
	after += "|" + $("#result").text();
	$.observable(model.things).refresh([{ thing: "pen " },{ thing: "lamp " }]);
	after += "|" + $("#result").text();
	$.observable(model.things).move(0, 1);
	after += "|" + $("#result").text();
	$.observable(model.things).refresh([]);
	after += "|" + $("#result").text();

	// ............................... Assert .................................
	equal(after, isIE8
		? "|box |box table |tree box table |tree box |box ||pen lamp  |lamp pen  |"
		: "|box |box table |tree box table |tree box |box ||pen lamp |lamp pen |",
	'{^{for things.length}}{^{for ~root.things}} content bound to both array and array.length responds correctly to observable array changes');

	// ................................ Reset ................................
	$("#result").empty();
	model.things = []; // reset Prop

	// =============================== Arrange ===============================

	model.things = [{ thing: "box" }, { thing: "table" }]; // reset Prop

	$.templates('{{include things}}{^{:length}} {^{for}}{{:thing}}{{/for}}{{/include}}')
		.link("#result", model);

	// ................................ Act ..................................
	before = $("#result").text();
	$.observable(model.things).insert(0, { thing: "tree" });
	after = $("#result").text();

	// ............................... Assert .................................
	equal(before + "|" + after, isIE8 ? "2 boxtable|3tree boxtable" : "2 boxtable|3 treeboxtable",
	'{{include things}} moves context to things array, and {^{for}} then iterates and binds to array');

	// ................................ Reset ................................
	$("#result").empty();
	model.things = []; // reset Prop

	// =============================== Arrange ===============================

	model.things = [{ thing: "box" }]; // reset Prop
	$.templates('{^{for things}}{{:thing}}{{else}}None{{/for}}')
		.link("#result", model);

	// ................................ Act ..................................
	before = $("#result").text();
	$.observable(model.things).insert(0, { thing: "tree" });
	after = $("#result").text();

	// ............................... Assert .................................
	equal(before + "|" + after, 'box|treebox',
	'{^{for things}}{{else}}{{/for}} binds to array changes on leaf array');

	// ................................ Act ..................................
	before = $("#result").text();
	$.observable(model.things).remove(0, 2);
	after = $("#result").text();

	// ............................... Assert .................................
	equal(before + "|" + after, 'treebox|None',
	'{^{for things}}{{else}}{{/for}} renders {{else}} block when array is emptied');

	// ................................ Act ..................................
	$.observable(model).setProperty({ things: [{ thing: "triangle" }, { thing: "circle" }] });
	after = $("#result").text();

	// ............................... Assert .................................
	equal(after, 'trianglecircle',
	'{^{for things}}{{else}}{{/for}} binds to property change on path');

	// ................................ Act ..................................
	$.observable(model).setProperty({ things: { thing: "square" } });
	after = $("#result").text();

	// ............................... Assert .................................
	equal(after, 'square',
	'{^{for things}}{{else}}{{/for}} binds to property change on path - swapping from array to singleton object');

	// ................................ Act ..................................
	$.observable(model).removeProperty("things");
	after = $("#result").text();

	// ............................... Assert .................................
	equal(after, 'None',
	'{^{for things}}{{else}}{{/for}} binds to removeProperty change on path - and renders {{else}} block');

	// ................................ Reset ................................
	$("#result").empty();
	model.things = []; // reset Prop

	// =============================== Arrange ===============================

	// ................................ Act ..................................
	$.templates("testTmpl", '{{if ~things.length}}<tbody>{{for ~things}}<tr><td>{{:thing}}</td></tr>{{/for}}</tbody>{{/if}}');
	$.templates('<table><thead><tr><td>top</td></tr></thead>{^{for things ~things=things tmpl="testTmpl"/}}</table>')
		.link("#result", model);

	before = $("#result td").text();
	$.observable(model.things).insert(0, { thing: "tree" });
	after = $("#result").text();

	// ............................... Assert .................................
	equal(before + "|" + after, 'top|toptree',
	'Complex template, with empty placeholder for tbody after thead, and subsequent data-linked insertion of tbody');

	// ................................ Act ..................................
	$.view("#result", true).refresh();
	result = "" + (after === $("#result").text());
	$.view("#result", true).views._2.refresh();
	result += " " + (after === $("#result").text());
	$.view("#result", true).views._2.views[0].refresh();
	result += " " + (after === $("#result").text());
	$.view("#result", true).views._2.views[0].views._2.refresh();
	result += " " + (after === $("#result").text());
	$.view("#result", true).views._2.views[0].views._2.views._2.refresh();
	result += " " + (after === $("#result").text());
	$.view("#result", true).views._2.views[0].views._2.views._2.views[0].refresh();
	result += " " + (after === $("#result").text());

	// ............................... Assert .................................
	equal(result, 'true true true true true true',
	'view refresh at all levels correctly maintains content');

	// ................................ Reset ................................
	$("#result").empty();
	model.things = []; // reset Prop

	// =============================== Arrange ===============================

	// ................................ Act ..................................
	$.templates("testTmpl", '{{if ~things.length}}<div>{{for ~things}}<span>{{:thing}}</span>{{/for}}</div>{{/if}}');
	$.templates('<div><span>top</span>{^{for things ~things=things tmpl="testTmpl"/}}</div>')
		.link("#result", model);

	before = $("#result div").text();
	$.observable(model.things).insert(0, { thing: "tree" });
	after = $("#result").text();

	// ............................... Assert .................................
	equal(before + "|" + after, 'top|toptree',
	'Complex template, with empty placeholder for span, and subsequent data-linked insertion of in div');

	// ................................ Act ..................................
	$.view("#result", true).refresh();
	result = "" + (after === $("#result").text());
	$.view("#result", true).views._2.refresh();
	result += " " + (after === $("#result").text());
	$.view("#result", true).views._2.views[0].refresh();
	result += " " + (after === $("#result").text());
	$.view("#result", true).views._2.views[0].views._2.refresh();
	result += " " + (after === $("#result").text());
	$.view("#result", true).views._2.views[0].views._2.views._2.refresh();
	result += " " + (after === $("#result").text());
	$.view("#result", true).views._2.views[0].views._2.views._2.views[0].refresh();
	result += " " + (after === $("#result").text());

	// ............................... Assert .................................
	equal(result, 'true true true true true true',
	'view refresh at all levels correctly maintains content');

	// ................................ Reset ................................
	$("#result").empty();
	model.things = []; // reset Prop

	// =============================== Arrange ===============================
	// ................................ Act ..................................
	$.templates('<table><tbody>{^{for things}}{^{if expanded}}<tr><td>{{:thing}}</td></tr>{{/if}}{{/for}}</tbody></table>')
		.link("#result", model);

	$.observable(model.things).insert(0, [{ thing: "tree", expanded: false }]);
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

	$.observable(model.things).insert(0, [{ thing: "tree", expanded: false }]);
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
	after = $("#result div *").length;
	// ............................... Assert .................................
	equal(after, before,
	'Refreshing a view containing non-elOnly content, with a data-bound tag with no rendered content removes the original script node markers for the tag and replace with the new ones');

	// ................................ Reset ................................
	$("#result").empty();
	model.things = []; // reset Prop

	// =============================== Arrange ===============================

	// ................................ Act ..................................
	$.templates("testTmpl", '{^{if expanded}}<tr><td>{{:thing}}</td></tr>{{/if}}');
	$.templates('<table><tbody>{^{for things tmpl="testTmpl"/}}</tbody></table>')
		.link("#result", model);

	result = $("#result td").text();
	$.observable(model.things).insert(0, [{ thing: "tree", expanded: false }, { thing: "bush", expanded: true }]);
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

	// ................................ Reset ................................
	$("#result").empty();
	model.things = []; // reset Prop

	// =============================== Arrange ===============================

	// ................................ Act ..................................
	$.templates("testTmpl", '<tr>{^{if expanded}}<td>{{:thing}}</td>{{/if}}</tr>');
	$.templates('<table><tbody>{^{for things tmpl="testTmpl"/}}</tbody></table>')
		.link("#result", model);

	result = $("#result td").text();
	$.observable(model.things).insert(0, [{ thing: "tree", expanded: false }, { thing: "bush", expanded: true }]);
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

	// ................................ Reset ................................
	$("#result").empty();
	model.things = []; // reset Prop

	// =============================== Arrange ===============================

	$.templates("<ul>{{for}}<li>Name: {{:firstName()}}. Width: {{:~settings.width}}</li>{{/for}}</ul>")
		.link("#result", person1, { settings: settings });

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

	// ................................ Reset ................................
	$("#result").empty();
	person1._firstName = "Jo"; // reset Prop
	person1.lastName = "One"; // reset Prop
	settings.title = "Mr"; // reset Prop
	settings.width = 30; // reset Prop

	// =============================== Arrange ===============================

	var data = {};

	$.templates("<ul>{^{for items}}<li>insertBefore</li>{{/for}}<li> next</li></ul>")
		.link("#result", data);

	// ................................ Act ..................................
	before = $("#result ul").text(); // The innerHTML will be <script type="jsv#^6_"></script>Name: Sir compFirst. Width: 40<script type="jsv/^6_"></script>
	$.observable(data).setProperty("items", []);
	var deferredString = $("#result ul li")[0]._df || "";
	$.observable(data.items).insert("X");
	after = $("#result ul").text();

	// ............................... Assert .................................
	equal(before + "|" + deferredString + "|" + after,
	(isIE8 ? 'next||insertBeforenext'
	: ' next||insertBefore next'),
	'Inserting content before a next sibling element in element-only context does not set ._df, and subsequent insertion is correctly placed before the next sibling.');

	// ................................ Reset ................................
	$("#result").empty();

	// =============================== Arrange ===============================

	$.templates('{^{for things}}<div>#index:<b data-link="#index"></b> #view.index:<b data-link="#view.index"></b> {{:thing}} Nested:{{for true}}{{for true}} #get(\'item\').index:<em data-link="#get(\'item\').index"></em> #parent.parent.index:<em data-link="#parent.parent.index"></em>|{{/for}}{{/for}}</div>{{/for}}')
		.link("#result", model);

	// ................................ Act ..................................
	$.observable(model.things).insert(0, { thing: "tree" });
	$.observable(model.things).insert(0, { thing: "bush" });

	// ............................... Assert .................................
	equal($("#result").text(), "#index:0 #view.index:0 bush Nested: #get('item').index:0 #parent.parent.index:0|#index:1 #view.index:1 tree Nested: #get('item').index:1 #parent.parent.index:1|",
	'Data-link to "#index" and "#get(\'item\').index" work correctly');

	// ................................ Reset ................................
	$("#result").empty();
	model.things = []; // reset Prop

	// =============================== Arrange ===============================

	$.templates('{^{for things}}<div>{{:thing}} Nested:{{for}}{{for}}<em data-link="#getIndex()"></em>{{/for}}{{/for}}</div>|{{/for}}')
		.link("#result", model);

	// ................................ Act ..................................
	$.observable(model.things).insert(0, { thing: "tree" });
	$.observable(model.things).insert(0, { thing: "bush" });

	// ............................... Assert .................................
	equal($("#result").text(), "bush Nested:0|tree Nested:1|",
	'Data-link to "#getIndex()" works correctly');

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
		'$(container).empty removes listeners for empty tags in element-only content (_df="#n_/n_")');

	// =============================== Arrange ===============================
	data = {
		list: [],
		q: true
	};

	$.templates('<ul class="list">{^{if q}}{^{for list}}<li>{{:#data}}</li>{{/for}}{{/if}}</ul>')
		.link("#result", data);

	// ................................ Act ..................................
	$.observable(data).setProperty("q", false);
	$.observable(data).setProperty("q", true);
	$.observable(data.list).insert("added");

	// ............................... Assert .................................
	ok(viewsAndBindings().split(" ").length === 9 // We removed view inside div, but still have the view for the outer template.
		&& $._data(data.list).events.arrayChange.length === 1
		&& $("#result ul").text() === "added",
		'In element-only content, updateContent calls disposeTokens on _df inner bindings');

	// ................................ Reset ................................
	$("#result").empty();
});

test("{^{if}}...{{else}}...{{/if}}", function() {

	// =============================== Arrange ===============================
	var data = { one: true, two: false, three: true },
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
	$.observable(data).setProperty({ one: false, two: false, three: true });
	after = $("#result").text();

	// ............................... Assert .................................
	equal(after, isIE8 ? "notOne notTwo THREE  " : "notOne notTwo THREE ",
	'Bound if and else render correct blocks based on boolean expressions');

	// ................................ Act ..................................
	$.observable(data).setProperty({ one: false, two: true, three: false });
	after = $("#result").text();

	// ............................... Assert .................................
	equal(after, isIE8 ? "notOne TWO notThree  " : "notOne TWO notThree ",
	'Bound if and else render correct blocks based on boolean expressions');

	// ................................ Reset ................................
	$("#result").empty();

	// =============================== Arrange ===============================
	data = { expanded: true };
	var deepIfTmpl = $.templates(
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
	var deferredString = $("#result tr")[0]._df; // "/226_/322^"
	// With deep version, the tokens for the {^{if}} binding had to be deferred - we test the format:
	deferredString = /\/\d+\_\/\d+\^/.test(deferredString);

	equal(deferredString && after, 'DeepContentafterDeep',
	'With deep bound {^{if}} tag, there is deferred binding and binding behaves correctly after removing and inserting');

	// ................................ Act ..................................
	$.observable(data).setProperty("expanded", false);

	// ............................... Assert .................................
	after = $("#result").text();
	deferredString = $("#result tr")[0]._df; // "#322^/322^"
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
	deferredString = $("#result tr")[0]._df; // ""
	// With shallow version, no deferred binding
	equal(!deferredString && after, 'ShallowContentafterShallow',
	'With shallow bound {^{if}} tag, there is no deferred binding, and binding behaves correctly after removing and inserting');

	// ................................ Act ..................................
	$.observable(data).setProperty("expanded", false);

	// ............................... Assert .................................
	after = $("#result").text();
	deferredString = $("#result tr")[0]._df; // ""
	// With shallow version, no deferred binding

	equal(!deferredString && after, 'afterShallow',
	'With shallow bound {^{if}} tag, there is no deferred binding and binding behaves correctly after further remove');

	// ................................ Reset ................................
	$("#result").empty();
	result = "";
});

test("{^{props}} basic", function() {

	// =============================== Arrange ===============================
	var root = {
		objA: { propA1: "valA1a" },
		objB: { propB1: "valB1a" }
	};

	$.templates('{^{props objA}}{^{:key}}:{^{:prop}},{{/props}}')
		.link("#result", root);

	// ................................ Act ..................................
	before = $("#result").text();
	$.observable(root.objA).setProperty({ propA1: "valA1b" });
	after = $("#result").text();

	// ............................... Assert .................................
	equal(before + "|" + after, 'propA1:valA1a,|propA1:valA1b,',
	'{^{props}} - set existing property');

	// ................................ Act ..................................
	before = $("#result").text();
	$.observable(root.objA).setProperty({ propA1: "valA1c", propA2: "valA2a" });
	after = $("#result").text();

	// ............................... Assert .................................
	equal(before + "|" + after, 'propA1:valA1b,|propA1:valA1c,propA2:valA2a,',
	'{^{props}} - set new property');

	// ................................ Act ..................................
	before = $("#result").text();
	$.observable(root.objA).setProperty({ propA1: "", propA2: null });
	after = $("#result").text();

	// ............................... Assert .................................
	equal(before + "|" + after, 'propA1:valA1c,propA2:valA2a,|propA1:,propA2:,',
	'{^{props}} - set property to empty string or null');

	// ................................ Act ..................................
	before = $("#result").text();
	$.observable(root.objA).setProperty({ propA1: null });
	after = $("#result").text();

	// ............................... Assert .................................
	equal(before + "|" + after, 'propA1:,propA2:,|propA1:,propA2:,',
	'{^{props}} - all properties null');

	// ................................ Act ..................................
	before = $("#result").text();
	$.observable(root.objA).removeProperty("propA1").removeProperty("propA2");
	after = $("#result").text();

	// ............................... Assert .................................
	equal(before + "|" + after, 'propA1:,propA2:,|',
	'{^{props}} - all properties removed');

	// ................................ Act ..................................
	before = $("#result").text();
	$.observable(root.objA).setProperty({ propA1: "valA1b" });
	after = $("#result").text();

	// ............................... Assert .................................
	equal(before + "|" + after, "|propA1:valA1b,",
	'{^{props}} - set property where there were none');

	// ................................ Act ..................................
	before = $("#result").text();
	$.observable(root).setProperty({ objA: {} });
	after = $("#result").text();

	// ............................... Assert .................................
	equal(before + "|" + after, "propA1:valA1b,|",
	'{^{props}} - set whole object to empty object');

	// ................................ Act ..................................
	before = $("#result").text();
	$.observable(root).setProperty({ objA: { propX: "XX" } });
	after = $("#result").text();

	// ............................... Assert .................................
	equal(before + "|" + after, "|propX:XX,",
	'{^{props}} - set whole object to different object');

	//................................ Reset ................................
	$("#result").empty();

	// ............................... Assert .................................
	equal(JSON.stringify($.views.sub._cbBnds), "{}",
		"{^{props}} dataMap bindings all removed when tag disposed (content removed from DOM)");

	$.views.settings.debugMode(false);
});

test("{^{props}} modifying content, through arrayChange/propertyChange on target array", function() {

	// =============================== Arrange ===============================

	var root = {
		objA: { propA1: "valA1a" }
	};

	$.templates(
		'{^{props objA}}'
			+ '{^{:key}}:{^{:prop}},'
			+ '<button class="removeProp" data-link="{on ~remove}">remove</button>'
			+ '<button class="addProp" data-link="{on ~add}">add</button>,'
			+ '<button class="changeProp" data-link="{on ~change}">change</button>,'
			+ '<input class="changePropInput" data-link="prop"/>'
			+ '<input class="changeKeyInput" data-link="key"/>'
		+ '{{/props}}')

		.link("#result", root, {
			add: function(ev, eventArgs) {
				var view = eventArgs.view,
					arr = view.get("array").data;
				$.observable(arr).insert({ key: "addkey", prop: "addprop" });
			},
			remove: function(ev, eventArgs) {
				var view = eventArgs.view,
					arr = view.get("array").data,
					index = view.index;
				$.observable(arr).remove(index);
			},
			change: function(ev, eventArgs) {
				var view = eventArgs.view,
					item = view.data;
				$.observable(item).setProperty({ key: "changed", prop: "changedValue" });
			}
		});

	// ................................ Act ..................................
	before = $("#result").text();
	$(".addProp").click();
	after = $("#result").text();

	// ............................... Assert .................................
	equal(before + "|" + after, "propA1:valA1a,removeadd,change,|propA1:valA1a,removeadd,change,addkey:addprop,removeadd,change,",
	'{^{props}} - add properties to props target array');

	// ................................ Act ..................................
	before = $("#result").text();
	$(".removeProp:first()").click();
	after = $("#result").text();

	// ............................... Assert .................................
	equal(before + "|" + after, "propA1:valA1a,removeadd,change,addkey:addprop,removeadd,change,|addkey:addprop,removeadd,change,",
	'{^{props}} - remove properties from props target array');

	// ................................ Act ..................................
	before = $("#result").text();
	$(".changeProp").click();
	after = $("#result").text();

	// ............................... Assert .................................
	equal(before + "|" + after, "addkey:addprop,removeadd,change,|changed:changedValue,removeadd,change,",
	'{^{props}} - change value of key and prop in props target array');

	// ................................ Act ..................................
	before = $("#result").text();
	$(".changePropInput").val("newValue").change();
	after = $("#result").text();

	// ............................... Assert .................................
	equal(before + "|" + after + "|" + JSON.stringify(root.objA), "changed:changedValue,removeadd,change,|changed:newValue,removeadd,change,|{\"changed\":\"newValue\"}",
	'{^{props}} - change value of input bound to prop in props target array');

	// ................................ Act ..................................
	before = $("#result").text();
	$(".changeKeyInput").val("newKey").change();
	after = $("#result").text();

	// ............................... Assert .................................
	equal(before + "|" + after + "|" + JSON.stringify(root.objA), "changed:newValue,removeadd,change,|newKey:newValue,removeadd,change,|{\"newKey\":\"newValue\"}",
	'{^{props}} - change value of input bound to key in props target array');

	// ................................ Reset ................................

	before = "" + $._data(root).events.propertyChange.length + "-" + $._data(root.objA).events.propertyChange.length;
	$("#result").empty();
	after = "" + ($._data(root).events === undefined) + "-" + ($._data(root.objA).events === undefined) + " -" + JSON.stringify($.views.sub._cbBnds);

	// ............................... Assert .................................
	equal(before + "|" + after, "1-1|true-true -{}",
	'{^{props}} dataMap bindings all removed when tag disposed (content removed from DOM)');
});

test("{^{props}}..{{else}} ...", function() {

	// =============================== Arrange ===============================

	var root = {
		objA: { propA1: "valA1" },
		objB: { propB1: "valb1", propB2: "valb2" }
	};

	$.templates('{^{props objA}}{^{:key}}:{^{:prop}},'
		+ '{{else objB}}{^{:key}}:{^{:prop}},'
		+ '{{else}}'
			+ 'NONE'
		+ '{{/props}}')

		.link("#result", root);

	// ................................ Act ..................................
	before = $("#result").text();
	$.observable(root.objA).setProperty("propA2", "valA2");
	after = $("#result").text();

	// ............................... Assert .................................
	equal(before + "|" + after, "propA1:valA1,|propA1:valA1,propA2:valA2,",
	'{^{props}} - set new property on objA - shows additional property');

	// ................................ Act ..................................
	before = $("#result").text();
	$.observable(root.objA).removeProperty("propA1").removeProperty("propA2");
	after = $("#result").text();

	// ............................... Assert .................................
	equal(before + "|" + after, "propA1:valA1,propA2:valA2,|propB1:valb1,propB2:valb2,",
	'{^{props}} - remove properties from objA - switches to {{else objB}}');

	// ................................ Act ..................................
	before = $("#result").text();
	$.observable(root.objB).removeProperty("propB1").removeProperty("propB2");
	after = $("#result").text();

	// ............................... Assert .................................
	equal(before + "|" + after, "propB1:valb1,propB2:valb2,|NONE",
	'{^{props}} - remove properties from objB - switches to {{else}}');

	// ................................ Act ..................................
	before = $("#result").text();
	$.observable(root.objB).removeProperty("NotAProperty");
	after = $("#result").text();

	// ............................... Assert .................................
	equal(before + "|" + after, "NONE|NONE",
	'{^{props}} - remove inexistant property from objB - remains on {{else}}');

	// ................................ Act ..................................
	before = $("#result").text();
	$.observable(root.objB).setProperty("newProp", "");
	after = $("#result").text();

	// ............................... Assert .................................
	equal(before + "|" + after, "NONE|newProp:,",
	'{^{props}} - set property on objB to undefined - render {{else objB}}');


	// ................................ Reset ................................
	$("#result").empty();

	// ............................... Assert .................................
	equal(JSON.stringify($.views.sub._cbBnds), "{}",
		"{^{props}} dataMap bindings all removed when tag disposed (content removed from DOM)");

	// =============================== Arrange ===============================

	root = {
		objA: { propA1: "valA1" },
		objB: { propB1: "valb1", propB2: "valb2" }
	};

	$.templates('{^{props objA}}{^{:key}}:{^{:prop}},'
			+ '<button class="removePropA" data-link="{on ~remove}">remove</button>,'
		+ '{{else objB}}{^{:key}}:{^{:prop}},'
			+ '<button class="removePropB" data-link="{on ~remove}">remove</button>,'
		+ '{{else}}'
			+ 'NONE'
		+ '{{/props}}')

		.link("#result", root, {
			remove: function(ev, eventArgs) {
				var view = eventArgs.view,
					arr = view.get("array").data,
					index = view.index;
				$.observable(arr).remove(index);
			}
		});

	// ................................ Act ..................................
	before = $("#result").text();
	$(".removePropA").click();
	after = $("#result").text();

	// ............................... Assert .................................
	equal(before + "|" + after, "propA1:valA1,remove,|propB1:valb1,remove,propB2:valb2,remove,",
	'{^{props}} - remove properties from objA target array - switches to {{else objB}}');

	// ................................ Act ..................................
	before = $("#result").text();
	$(".removePropB").click();
	after = $("#result").text();

	// ............................... Assert .................................
	equal(before + "|" + after, "propB1:valb1,remove,propB2:valb2,remove,|NONE",
	'{^{props}} - remove properties from objB target array - switches to {{else}}');

	// ................................ Reset ................................
	$("#result").empty();

	// ............................... Assert .................................
	equal(JSON.stringify($.views.sub._cbBnds), "{}",
		"{^{props}} dataMap bindings all removed when tag disposed (content removed from DOM)");
});

test('data-link="{on ...', function() {

	$.views.settings.debugMode(); // For using _jsv

	// =============================== Arrange ===============================

	function swap(ev, eventArgs) {
		$.observable(this).setProperty("type", this.type === "shape" ? "line" : "shape");
	}
	var thing = {
		type: "shape",
		swap: swap
	};

	$.templates('<div data-link="{on swap}">{^{:type}}</div>')
		.link("#result", thing);

	// ................................ Act ..................................
	before = $("#result").text();
	$("#result div").click();
	after = $("#result").text();

	// ............................... Assert .................................
	equal(before + "|" + after,
	"shape|line",
	'{on swap} calls swap method on click, with "this" pointer context on data object');

	// ................................ Reset ................................
	$("#result").empty();
	thing.type = "shape";

	// =============================== Arrange ===============================

	$.templates('<div data-link="{on ~swap}">{^{:type}}</div>')
		.link("#result", thing, { swap: swap });

	// ................................ Act ..................................
	before = $("#result").text();
	$("#result div").click();
	after = $("#result").text();

	// ............................... Assert .................................
	equal(before + "|" + after,
	"shape|line",
	'{on ~swap} calls swap helper method on click, with "this" pointer context defaulting to current data object');

	// ................................ Reset ................................
	$("#result").empty();
	thing.type = "shape";

	// =============================== Arrange ===============================

	$.templates('<div data-link="{on ~util.swap}">{^{:type}} {^{:check}}</div>')
		.link("#result", thing, {
			util:
				{
					swap: function(ev, eventArgs) {
						$.observable(this.data).setProperty({
							type: this.data.type === "shape" ? "line" : "shape",
							check: this.data === eventArgs.view.data
						});
					},
					data: thing
				}
		});

	// ................................ Act ..................................
	before = $("#result").text();
	$("#result div").click();
	after = $("#result").text();

	// ............................... Assert .................................
	equal(before + "|" + after,
	isIE8 ? "shape |linetrue "
		: "shape |line true",
	'{on ~util.swap} calls util.swap helper method on click, with ~util as this pointer');

	// ................................ Reset ................................
	$("#result").empty();
	thing.type = "shape";
	delete thing.check;

	// =============================== Arrange ===============================

	$.templates('<div data-link="{on ~util.swap context=#data}">{^{:type}}</div>')
		.link("#result", thing, {
			util:
				{
					swap: swap
				}
		});

	// ................................ Act ..................................
	before = $("#result").text();
	$("#result div").click();
	after = $("#result").text();

	// ............................... Assert .................................
	equal(before + "|" + after,
	"shape|line",
	'{on ~util.swap context=#data} calls util.swap helper method on click, with current data object as this pointer');

	// ................................ Reset ................................
	$("#result").empty();
	thing.type = "shape";

	// =============================== Arrange ===============================

	$.templates('<div data-link="{on ~util.swap context=~util.swapCtx}">{^{:type}} {^{:check}}</div>')
		.link("#result", thing, {
			util:
				{
					swap: function(ev, eventArgs) {
						$.observable(this.data).setProperty({
							type: this.data.type === "shape" ? "line" : "shape",
							check: this.data === eventArgs.view.data
						});
					},
					data: thing,
					swapCtx: {
						data: thing
					}
				}
		});

	// ................................ Act ..................................
	before = $("#result").text();
	$("#result div").click();
	after = $("#result").text();

	// ............................... Assert .................................
	equal(before + "|" + after,
	isIE8 ? "shape |linetrue "
		: "shape |line true",
	'{on ~util.swap context=~util.swapCtx} calls util.swap helper method on click, with util.swapCtx as this pointer');

	// ................................ Reset ................................
	$("#result").empty();
	thing.type = "shape";
	delete thing.check;

	// =============================== Arrange ===============================

	$.templates('<div data-link="{on ~util.swap data=#data}">{^{:type}} {^{:check}}</div>')
		.link("#result", thing, {
			util:
				{
					swap: function(ev, eventArgs) {
						$.observable(ev.data).setProperty({
							type: ev.data.type === "shape" ? "line" : "shape",
							check: ev.data === eventArgs.view.data
						});
					},
					data: thing,
					swapCtx: {
						data: thing
					}
				}
		});

	// ................................ Act ..................................
	before = $("#result").text();
	$("#result div").click();
	after = $("#result").text();

	// ............................... Assert .................................
	equal(before + "|" + after,
	isIE8 ? "shape |linetrue "
		: "shape |line true",
	'{on ~util.swap data=#data} calls util.swap helper method on click, and passes current data #data as ev.data');

	// ................................ Reset ................................
	$("#result").empty();
	thing.type = "shape";
	delete thing.check;

	// =============================== Arrange ===============================

	$.templates('<div data-link="{on \'mouseup mousedown blur\' swap}">{^{:type}}</div>')
		.link("#result", thing);

	// ................................ Act ..................................
	before = $("#result").text();
	$("#result div").mouseup();
	after = $("#result").text();
	$("#result div").mousedown();
	after += $("#result").text();
	$("#result div").blur();
	after += $("#result").text();

	// ............................... Assert .................................
	equal(before + "|" + after,
	"shape|lineshapeline",
	"{on 'mouseup mousedown blur' swap} calls util method on mouseup, mousedown and blur");

	// ................................ Reset ................................
	$("#result").empty();
	thing.type = "shape";
	delete thing.check;

	// =============================== Arrange ===============================
	var res = "1: ";
	$.templates(
		"<div id=\"divForOn\" data-link=\"{on 'keyup keydown' '.inputA' unbind} {on 'mousedown' '#inputB' refresh} {on 'keyup' '#inputB' unbind} {on 'mouseup' 'input' test}\">"
			+ "<input class='inputA'/>"
			+ "<input id='inputB' />"
		+ "</div>")
		.link("#result", {
			unbind: function(ev, eventArgs) {
				res += "unbind ";
				eventArgs.linkCtx.tag.onDispose();
			},
			refresh: function(ev, eventArgs) {
				res += "refresh ";
				eventArgs.linkCtx.tag.refresh();
			},
			test: function() {
				res += "test ";
			}
		});

	// ................................ Act ..................................
	var events = $._data($("#divForOn")[0]).events,
		eventBindings = "before: " + events.keydown.length + events.keyup.length + events.mouseup.length + events.mousedown.length;

	$("#divForOn #inputB").mouseup();

	res += "2: ";
	$("#divForOn .inputA").mouseup();

	res += "3: ";
	$("#divForOn #inputB").keyup();

	res += "4: ";
	$("#divForOn #inputB").keyup();

	res += "5: ";
	$("#divForOn .inputA").keydown();

	res += "6: ";
	$("#divForOn .inputA").keyup();

	res += "7: ";
	$("#divForOn #inputB").mouseup();

	res += "8: ";
	$("#divForOn #inputB").mousedown();

	eventBindings += " | after: " + events.keydown + events.keyup + events.mouseup.length + events.mousedown.length;
	// ............................... Assert .................................
	equal(res,
	"1: test 2: test 3: unbind 4: 5: unbind 6: 7: test 8: refresh ",
	"multiple {on events selector method} bindings on container attach events on delegated elements. Also, tag.onDispose on tag instances removes specific handlers for corresponding elements/selectors");

	// ............................... Assert .................................
	equal(eventBindings,
	"before: 1211 | after: undefinedundefined11",
	"onDispose removes specific delegated events");

	// ................................ Act ..................................
	res = "1: ";
	$("#divForOn").html("<input id='newlyAdded' />");

	$("#divForOn #newlyAdded").mouseup();

	res += "2: ";
	$("#divForOn #newlyAdded").keyup();

	// ............................... Assert .................................
	equal(res,
	"1: test 2: ",
	"delegated {on events selector method} binding allows additional elements added to content to bind correctly");

	// ................................ Act ..................................
	$("#result").empty();
	eventBindings = "" + events.keydown + events.keyup + events.mouseup + JSON.stringify([$.views.sub._cbBnds, _jsv.bindings]);

	// ............................... Assert .................................
	equal(eventBindings,
	"undefinedundefinedundefined[{},{}]",
	"Removing the element removes all associated attached {on } handlers");

	// =============================== Arrange ===============================
	var tmpl = $.templates("<div id=\"cont\" data-link=\"{on 'click' '#doIt' 754 thisIsTheMethod role 'hey' true process data=option 33 #data context=option}\">\
	<button id='doIt'>Do it</button>\
	<span data-link='res'></span>\
</div>"),

		data = {
			name: "Jo",
			role: "Advisor",
			option: {
				allow: true
			},
			thisIsTheMethod: function(role, text, isFoo, compile, amount, root, ev, eventArgs) {
				if (compile) {
					compile.call(root, role, text, isFoo, amount, ev.data.allow, eventArgs.linkCtx.tag.tagCtx.args[2]);
				}
			},
			process: function(role, text, isFoo, amount, allow, extraParam) {
				$.observable(this).setProperty("res", this.res + role + text + isFoo + amount + " allow:" + allow + " extraParam: " + extraParam + "|");
			},
			res: ""
		};

	tmpl.link("#result", data);

	// ................................ Act ..................................
	$("#doIt").click();
	data.option.allow = false;
	$.observable(data).setProperty("role", "Follower");
	$("#doIt").click();

	// ............................... Assert .................................
	equal(data.res, "Advisorheytrue33 allow:true extraParam: 754|Followerheytrue33 allow:false extraParam: 754|",
	"{on 'click' selector otherParams... method params...} : supports passing params to method, of any type, as well as setting data and context for the function call");

	// =============================== Arrange ===============================
	res = "1: ";
	$("#result").html("<div id=\"divForOn\" data-link=\"{on 'keyup keydown' '.inputA' unbind} {on 'mousedown' '#inputB' refresh} {on 'keyup' '#inputB' unbind} {on 'mouseup' 'input' test}\">"
			+ "<input class='inputA'/>"
			+ "<input id='inputB' />"
		+ "</div>");

	$.link(true, "#result", {
		unbind: function(ev, eventArgs) {
			res += "unbind ";
			eventArgs.linkCtx.tag.onDispose();
		},
		refresh: function(ev, eventArgs) {
			res += "refresh ";
			eventArgs.linkCtx.tag.refresh();
		},
		test: function() {
			res += "test ";
		}
	});

	// ................................ Act ..................................
	events = $._data($("#divForOn")[0]).events;
	eventBindings = "before: " + events.keydown.length + events.keyup.length + events.mouseup.length + events.mousedown.length;

	$("#divForOn #inputB").mouseup();

	res += "2: ";
	$("#divForOn .inputA").mouseup();

	res += "3: ";
	$("#divForOn #inputB").keyup();

	res += "4: ";
	$("#divForOn #inputB").keyup();

	res += "5: ";
	$("#divForOn .inputA").keydown();

	res += "6: ";
	$("#divForOn .inputA").keyup();

	res += "7: ";
	$("#divForOn #inputB").mouseup();

	res += "8: ";
	$("#divForOn #inputB").mousedown();

	eventBindings += " | after: " + events.keydown + events.keyup + events.mouseup.length + events.mousedown.length;
	// ............................... Assert .................................
	equal(res,
	"1: test 2: test 3: unbind 4: 5: unbind 6: 7: test 8: refresh ",
	"Top-level {on }: multiple {on events selector method} top-level bindings on container attach events on delegated elements. Also, tag.onDispose on tag instances removes specific handlers for corresponding elements/selectors");

	// ............................... Assert .................................
	equal(eventBindings,
	"before: 1211 | after: undefinedundefined11",
	"Top-level {on }: onDispose removes specific delegated events");

	// ................................ Act ..................................
	res = "1: ";
	$("#divForOn").html("<input id='newlyAdded' />");

	$("#divForOn #newlyAdded").mouseup();

	res += "2: ";
	$("#divForOn #newlyAdded").keyup();

	// ............................... Assert .................................
	equal(res,
	"1: test 2: ",
	"Top-level {on }: delegated {on events selector method} binding allows additional elements added to content to bind correctly");

	// ................................ Act ..................................
	$("#result").empty();
	eventBindings = "" + events.keydown + events.keyup + events.mouseup + JSON.stringify([$.views.sub._cbBnds, _jsv.bindings]);

	// ............................... Assert .................................
	equal(eventBindings,
	"undefinedundefinedundefined[{},{}]",
	"Top-level {on }: Removing the element removes all associated attached {on } handlers");

	// =============================== Arrange ===============================
	$("#result").html("<div id=\"cont\" data-link=\"{on 'click' '#doIt' 754 thisIsTheMethod role 'hey' true process data=option 33 #data context=option}\">\
	<button id='doIt'>Do it</button>\
	<span data-link='res'></span>\
</div>");

	data = {
		name: "Jo",
		role: "Advisor",
		option: {
			allow: true
		},
		thisIsTheMethod: function(role, text, isFoo, compile, amount, root, ev, eventArgs) {
			if (compile) {
				compile.call(root, role, text, isFoo, amount, ev.data.allow, eventArgs.linkCtx.tag.tagCtx.args[2]);
			}
		},
		process: function(role, text, isFoo, amount, allow, extraParam) {
			$.observable(this).setProperty("res", this.res + role + text + isFoo + amount + " allow:" + allow + " extraParam: " + extraParam + "|");
		},
		res: ""
	};

	$.link(true, "#result", data);

	// ................................ Act ..................................
	$("#doIt").click();
	data.option.allow = false;
	$.observable(data).setProperty("role", "Follower");
	$("#doIt").click();

	// ............................... Assert .................................
	equal(data.res, "Advisorheytrue33 allow:true extraParam: 754|Followerheytrue33 allow:false extraParam: 754|",
	"Top-level {on 'click' selector method params...} : supports passing params to method, of any type, as well as setting data and context for the function call");

	// =============================== Arrange ===============================
	res = "1: ";
	data = {
		unbind: function(ev, eventArgs) {
			res += "unbind ";
			eventArgs.linkCtx.tag.onDispose();
		},
		refresh: function(ev, eventArgs) {
			res += "refresh ";
			eventArgs.linkCtx.tag.refresh();
		},
		test: function() {
			res += "test ";
		}
	};
	$("#result").html("<div id=\"linkTgt\" data-link=\"{:name} {on 'click' refresh} {on 'mousedown mouseup' test}\" >oldcontent</div>");

	$.link(true, "#linkTgt", data);

	events = $._data($("#linkTgt")[0]).events,

	// ................................ Act ..................................
	$("#linkTgt").mousedown();

	res += "2: ";
	$("#linkTgt").mouseup();

	res += "3: ";
	$("#linkTgt").click();

	res += "4: ";
	$("#linkTgt").mousedown();

	res += "5: ";
	$("#linkTgt").mouseup();

	res += "6: ";
	$("#linkTgt").click();

	// ............................... Assert .................................
	equal(res,
	"1: test 2: test 3: refresh 4: test 5: test 6: refresh ",
	'$.link(true, "#linkTgt", data): top-level linking to element (not container) links correctly, including \'{on }\' bindings');

	// ............................... Assert .................................
	eventBindings = "" + events.mouseup.length + events.mousedown.length + events.click.length;

	equal(eventBindings,
	"111",
	'$.link(true, "#linkTgt", data): top-level linking to element (not container) adds {on } binding handlers correctly - including calling refresh() on {on } tag');

	// ................................ Act ..................................
	$.unlink(true, "#linkTgt");

	// ............................... Assert .................................
	eventBindings = "" + events.mouseup + events.mousedown + events.click + JSON.stringify([$.views.sub._cbBnds, _jsv.bindings]);

	equal(eventBindings,
	"undefinedundefinedundefined[{},{}]",
	'$.unlink(true, "#linkTgt"): directly on top-level data-linked element (not through container) removes all \'{on }\' handlers');

	$.views.settings.debugMode(false);
});

test('data-link="{tag...} and {^{tag}} in same template"', function() {

	// ................................ Reset ................................
	person1._firstName = "Jo"; // reset Prop
	person1.lastName = "One"; // reset Prop
	settings.title = "Mr"; // reset Prop
	settings.width = 30; // reset Prop
	$.views.settings.debugMode(); // For using viewsAndBindings()

	// =============================== Arrange ===============================

	$.templates('{^{tmplTag/}}-{^{:lastName}} <span data-link="{tmplTag}"></span>-<span data-link="lastName"></span><input data-link="lastName"/>')
		.link("#result", person1);

	// ................................ Act ..................................
	before = $("#result").text() + $("#result input").val();
	$.observable(person1).setProperty({ firstName: "newFirst", lastName: "newLast" });
	$.observable(settings).setProperty({ title: "Sir", width: 40 });
	after = $("#result").text() + $("#result input").val();

	// ............................... Assert .................................
	equal(before + "|" + after,
	'Name: Mr Jo. Width: 30-One Name: Mr Jo. Width: 30-OneOne|Name: Sir newFirst. Width: 40-newLast Name: Sir newFirst. Width: 40-newLastnewLast',
	'Data link using: {^{tmplTag/}} {^{:lastName}} <span data-link="{tmplTag}"></span><span data-link="lastName"></span><input data-link="lastName"/>');

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
	$.observable(person1).setProperty({ firstName: "newFirst", lastName: "newLast" });
	$.observable(settings).setProperty({ title: "Sir", width: 40 });
	$.observable(person1).setProperty({ fullName: "compFirst compLast" });
	after = $("#result").text() + $("#last").val() + $("#full").val();

	// ............................... Assert .................................
	equal(before + "|" + after,
	'prop:OneOne computed:Mr Jo OneMr Jo One Tag:Name: Mr Jo. Width: 30Name: Mr Jo. Width: 30OneMr Jo One|prop:compLastcompLast computed:Sir compFirst compLastSir compFirst compLast Tag:Name: Sir compFirst. Width: 40Name: Sir compFirst. Width: 40compLastSir compFirst compLast',
	'Data link using: {^{:lastName}} <span data-link="lastName"></span> <input id="last" data-link="lastName"/> {^{:fullName()}}<span data-link="fullName()"></span> <input data-link="fullName()"/> {^{tmplTag/}} <span data-link="{tmplTag}"></span>');

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
	$.observable(person1).setProperty({ firstName: "newFirst", lastName: "newLast" });
	$.observable(settings).setProperty({ title: "Sir", width: 40 });
	$.observable(person1).setProperty({ fullName: "compFirst compLast" });
	after = $("#result").text() + $("#last").val() + $("#full").val();

	// ............................... Assert .................................
	result = 'prop:OneOne computed:Mr Jo OneMr Jo One Tag:Name: Mr Jo. Width: 30Name: Mr Jo. Width: 30OneMr Jo One|prop:compLastcompLast computed:Sir compFirst compLastSir compFirst compLast Tag:Name: Sir compFirst. Width: 40Name: Sir compFirst. Width: 40compLastSir compFirst compLast';

	// ................................ Act ..................................
	$.unlink(true, "#result");

	// ............................... Assert .................................

	ok(before + "|" + after === result && !viewsAndBindings() && !$._data(person1).events && !$._data(settings).events,
	"$.unlink(true, container) removes the views and current listeners from that content");

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

	// =============================== Arrange ===============================

	$.templates('prop:{^{:lastName}}<span data-link="lastName"></span><input id="last" data-link="lastName"/> computed:{^{:fullName()}}<span data-link="fullName()"></span><input id="full" data-link="fullName()"/> Tag:{^{tmplTag/}}<span data-link="{tmplTag}"></span>')
		.link("#result", person1);

	// ................................ Act ..................................
	before = $("#result").text() + $("#last").val() + $("#full").val();
	$.observable(person1).setProperty({ firstName: "newFirst", lastName: "newLast" });
	$.observable(settings).setProperty({ title: "Sir", width: 40 });
	$.observable(person1).setProperty({ fullName: "compFirst compLast" });
	after = $("#result").text() + $("#last").val() + $("#full").val();

	// ............................... Assert .................................
	result = 'prop:OneOne computed:Mr Jo OneMr Jo One Tag:Name: Mr Jo. Width: 30Name: Mr Jo. Width: 30OneMr Jo One|prop:compLastcompLast computed:Sir compFirst compLastSir compFirst compLast Tag:Name: Sir compFirst. Width: 40Name: Sir compFirst. Width: 40compLastSir compFirst compLast';

	// ................................ Act ..................................
	viewContent = viewsAndBindings();

	$.unobserve(person1, "*", settings, "*");

	// ............................... Assert .................................

	ok(before + "|" + after === result && viewContent === viewsAndBindings() && !$._data(person1).events && !$._data(settings).events,
	'$.unobserve(person1, "*", settings, "*") removes the current listeners from that content, but leaves the views');

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
	$.observable(person1).setProperty({ firstName: "newFirst", lastName: "newLast" });
	$.observable(settings).setProperty({ title: "Sir", width: 40 });
	$.observable(person1).setProperty({ fullName: "compFirst compLast" });
	after = $("#result").text() + $("#last").val() + $("#full").val();

	// ............................... Assert .................................
	result = 'prop:OneOne computed:Mr Jo OneMr Jo One Tag:Name: Mr Jo. Width: 30Name: Mr Jo. Width: 30OneMr Jo One|prop:compLastcompLast computed:Sir compFirst compLastSir compFirst compLast Tag:Name: Sir compFirst. Width: 40Name: Sir compFirst. Width: 40compLastSir compFirst compLast';

	// ................................ Act ..................................
	$.unlink();

	// ............................... Assert .................................

	ok(before + "|" + after === result && !viewsAndBindings() && !$._data(person1).events && !$._data(settings).events,
	'$.unlink() removes all views and listeners from the page');

	// ................................ Reset ................................
	person1._firstName = "Jo"; // reset Prop
	person1.lastName = "One"; // reset Prop
	settings.title = "Mr"; // reset Prop
	settings.width = 30; // reset Prop

	// TODO ADDITIONAL TESTS:
	// 1: link(null, data) to link whole document
});

test("Fallbacks for missing or undefined paths: using {^{:some.path onError = 'fallback'}}, etc.", function() {

	$.views.settings.debugMode(); // For using viewsAndBindings()

	// =============================== Arrange ===============================

	$.views.tags({
		myTag1: function(val) { return val + " from my tag1"; },
		myTag2: {
			template: "{{:}} from my tag2"
		}
	}).converters({
		upper: function(val) {
			return val.toUpperCase();
		}
	});

	var initial = { a: { b: null } },
		updated = { c: { val: 'leaf' } };

	$.templates(
		"{^{:a.b^c.val onError=~error + 'A '}} "
		+ "{^{upper:a.b^c.val onError=~error + 'B '}} "
		+ "{^{>a.b^c.val onError=~error + 'C '}} "
		+ "{^{if a.b^c onError=~error + 'D '}}<i>{{:a.b.c.val}}</i>{{/if}} "
		+ "{^{for a.b^c onError=~error + 'E '}}<b>{{:val}}</b>{{/for}} "
		+ "{^{myTag1 a.b^c.val onError=~error + 'F '/}} "
		+ "{^{myTag2 a.b^c.val onError=~error + 'G '/}} "
		+ "<span data-link=\"a.b^c.val onError=~error + 'H '\"></span> "
		+ "<span data-link=\"{myTag1 a.b^c.val onError=~error + 'I '}\"></span> "
		+ "<span data-link=\"{upper:a.b^c.val onError=~error + 'J '}\"></span> "
		+ "<span data-link=\"{:a.b^c.val convert='upper' onError=~error + 'K '}\"></span> ")
			.link("#result", initial, { error: "err:" });
	// ................................ Act ..................................

	before = "" + $._data(initial.a).events.propertyChange.length + " " + !$._data(updated).events + " " + !$._data(updated.c).events + "|"
		+ $("#result").text() + "|";
	$.observable(initial.a).setProperty('b', updated);
	after = $("#result").text() + "|";
	$.observable(initial.a.b.c).setProperty('val', "leaf2");
	after += $("#result").text() + "|";
	$.observable(initial.a.b).setProperty('c', { val: "leaf3" });
	after += $("#result").text() + "|";
	$.observable(initial.a).setProperty('b', { c: { val: "leaf4" } });
	after += $("#result").text() + "|";
	after += "" + $._data(initial.a).events.propertyChange.length + " " + $._data(initial.a.b).events.propertyChange.length + " " + $._data(initial.a.b.c).events.propertyChange.length
		+ " " + !$._data(updated).events + " " + !$._data(updated.c).events + "|"
		+ $("#result").text() + "|";

	var prevB = initial.a.b;

	$.observable(initial.a).setProperty('b', null);
	after += "" + $._data(initial.a).events.propertyChange.length + " " + !$._data(prevB).events + " " + !$._data(prevB.c).events + "|"
		+ $("#result").text() + "|";

	$.observable(initial.a).setProperty('b', updated);

	after += $("#result").text() + "|";

	equal(before + after,
		isIE8
		? "11 true true|"
			+ "err:A ERR:B err:C err:D err:E err:F err:G err:H err:I ERR:J err:K |"
			+ "leafLEAFleafleafleafleaf from my tag1leaf from my tag2 leafleaf from my tag1LEAFLEAF|"
			+ "leaf2LEAF2leaf2leafleafleaf2 from my tag1leaf2 from my tag2 leaf2leaf2 from my tag1LEAF2LEAF2|"
			+ "leaf3LEAF3leaf3leafleaf3leaf3 from my tag1leaf3 from my tag2 leaf3leaf3 from my tag1LEAF3LEAF3|"
			+ "leaf4LEAF4leaf4leafleaf4leaf4 from my tag1leaf4 from my tag2 leaf4leaf4 from my tag1LEAF4LEAF4|"
			+ "11 11 9 true true|"
			+ "leaf4LEAF4leaf4leafleaf4leaf4 from my tag1leaf4 from my tag2 leaf4leaf4 from my tag1LEAF4LEAF4|"
			+ "11 true true|"
			+ "err:A ERR:B err:C err:D err:E err:F err:G  err:H err:I ERR:J ERR:K |"
			+ "leaf3LEAF3leaf3leaf3leaf3leaf3 from my tag1leaf3 from my tag2 leaf3leaf3 from my tag1LEAF3LEAF3|"
		:
		"11 true true|"
			+ "err:A  ERR:B  err:C  err:D  err:E  err:F  err:G  err:H  err:I  ERR:J  err:K  |"
			+ "leaf LEAF leaf leaf leaf leaf from my tag1 leaf from my tag2 leaf leaf from my tag1 LEAF LEAF |"
			+ "leaf2 LEAF2 leaf2 leaf leaf leaf2 from my tag1 leaf2 from my tag2 leaf2 leaf2 from my tag1 LEAF2 LEAF2 |"
			+ "leaf3 LEAF3 leaf3 leaf leaf3 leaf3 from my tag1 leaf3 from my tag2 leaf3 leaf3 from my tag1 LEAF3 LEAF3 |"
			+ "leaf4 LEAF4 leaf4 leaf leaf4 leaf4 from my tag1 leaf4 from my tag2 leaf4 leaf4 from my tag1 LEAF4 LEAF4 |"
			+ "11 11 9 true true|"
			+ "leaf4 LEAF4 leaf4 leaf leaf4 leaf4 from my tag1 leaf4 from my tag2 leaf4 leaf4 from my tag1 LEAF4 LEAF4 |"
			+ "11 true true|"
			+ "err:A  ERR:B  err:C  err:D  err:E  err:F  err:G  err:H  err:I  ERR:J  ERR:K  |"
			+ "leaf3 LEAF3 leaf3 leaf3 leaf3 leaf3 from my tag1 leaf3 from my tag2 leaf3 leaf3 from my tag1 LEAF3 LEAF3 |",

	"deep linking in templates, using onError - correctly re-link to data when missing objects are dynamically replaced");

	// ................................ Act ..................................
	$.unlink();

	// ............................... Assert .................................

	ok(!viewsAndBindings() && !$._data(initial.a).events && !$._data(initial.a.b).events,
	'$.unlink() removes all views and listeners from the page');

	// =============================== Arrange ===============================

	function Item(value, title) {
		this.title = title;
		this._value = value;
		this.value = function(val) {
			if (!arguments.length) {
				return this._value;
			} else {
				this._value = val;
			}
		};
		this.value.set = true;
	}

	initial = new Item("string1", "A");

	$.templates(
		"{^{:value() onError='error1'}} {^{:title}} "
		+ "{^{:value()^value() onError='error2'}} {^{:value()^title onError='error2b'}} "
		+ "{^{:value()^value().value() onError='error3'}} {^{:value()^value().title onError='error3b'}} "
		+ "{^{:value()^value().value().value() onError='error4'}} {^{:value()^value().value().title onError='error4b'}} "
		).link("#result", initial);
	// ................................ Act ..................................
	var B, C, D, a, b, c, d, e;

	before = $("#result").text() + "|";
	$.observable(initial).setProperty('value', B = new Item("string2", "B"));
	after = $("#result").text() + "|";
	$.observable(initial.value()).setProperty('value', C = new Item("string3", "C"));
	after += $("#result").text() + "|";
	$.observable(initial.value().value()).setProperty('value', D = new Item("string4", "D"));
	after += $("#result").text() + "|";
	$.observable(initial).removeProperty('value');
	after += $("#result").text() + "|";
	$.observable(initial).setProperty('value', a = new Item(b = new Item(c = new Item(d = new Item(e = new Item("string4", "e"), "d"), "c"), "b"), "a"));
	after += $("#result").text() + "|";

	equal(before + after,
		isIE8
		? "string1 A error2 error3 error3b error4 error4b |"
			+ "[object Object] Astring2Berror3error4error4b |"
			+ "[object Object] A[object Object]Bstring3Cerror4 |"
			+ "[object Object] A[object Object]B[object Object]Cstring4D |"
			+ "[object Object] Aerror2error3error3berror4error4b |"
			+ "[object Object] A[object Object]a[object Object]b[object Object]c |"
		:
		"string1 A error2  error3 error3b error4 error4b |"
			+ "[object Object] A string2 B error3  error4 error4b |"
			+ "[object Object] A [object Object] B string3 C error4  |"
			+ "[object Object] A [object Object] B [object Object] C string4 D |"
			+ "[object Object] A error2  error3 error3b error4 error4b |"
			+ "[object Object] A [object Object] a [object Object] b [object Object] c |",

	"deep linking in templates, using onError - correctly re-link to data when missing objects are dynamically replaced");

	// ................................ Act ..................................
	$.unlink();

	// ............................... Assert .................................

	ok(!viewsAndBindings() && !$._data(initial.value()).events && !$._data(initial.value().value()).events,
	'$.unlink() removes all views and listeners from the page');
});

test('Bound tag properties and contextual properties', function() {
	// =============================== Arrange ===============================

	var things = [
		{
			type: "shape",
			form: "circle"
		},
		{
			type: "line",
			form: "square",
			thickness: "1"
		}
	];
	$.templates('Tag: {^{include ^tmpl=~typeTemplates[type]/}} Elem: <div data-link="{include ^tmpl=~typeTemplates[type]}"></div> ')
		.link("#result", things, {
			typeTemplates: {
				shape: "Shape: {^{:form}}\n",
				line: "Line: {^{:form}} {^{:thickness}}\n"
			}
		}
		);

	// ................................ Act ..................................
	before = $("#result").text();
	$.observable(things[0]).setProperty({ type: "line", thickness: 5 });
	$.observable(things[1]).setProperty({ type: "shape" });
	$.observable(things[1]).removeProperty("thickness");
	after = $("#result").text();

	// ............................... Assert .................................
	equal(before + "|" + after,
	isIE8 ? "Tag: Shape: circle Elem: Shape: circle Tag: Line: square 1 Elem: Line: square 1 |Tag:Line: circle5  Elem: Line: circle5 Tag:Shape: square  Elem: Shape: square "
		: "Tag: Shape: circle\n Elem: Shape: circle\n Tag: Line: square 1\n Elem: Line: square 1\n |Tag: Line: circle 5\n Elem: Line: circle 5\n Tag: Shape: square\n Elem: Shape: square\n ",
	'binding to ^tmpl=... :{^{include ^tmpl=~typeTemplates[type]... and data-link="{include ^tmpl=~typeTemplates[type]...');

	// ................................ Reset ................................
	$("#result").empty();

	// =============================== Arrange ===============================

	things = [
		{
			type: "shape",
			form: "circle"
		},
		{
			type: "line",
			form: "square",
			thickness: "1"
		}
	];
	$.templates('Bound condition: {^{include ^~condition=type==="shape"}}{{:type}} {{:~condition}} {{/include}}'
		+ 'Unbound condition: {^{include ~condition=type==="shape"}}{{:type}} {{:~condition}} {{/include}}')
		.link("#result", things);

	// ................................ Act ..................................
	before = $("#result").text();
	$.observable(things[0]).setProperty({ type: "line", thickness: 5 });
	$.observable(things[1]).setProperty({ type: "shape" });
	$.observable(things[1]).removeProperty("thickness");
	after = $("#result").text();

	// ............................... Assert .................................
	equal(before + "|" + after,
	isIE8 ? "Bound condition: shape true Unbound condition: shape true Bound condition: line false Unbound condition: line false |Bound condition:line false  Unbound condition: shape true Bound condition:shape true  Unbound condition: line false "
		: "Bound condition: shape true Unbound condition: shape true Bound condition: line false Unbound condition: line false |Bound condition: line false Unbound condition: shape true Bound condition: shape true Unbound condition: line false ",
	'Binding to contextual property {^{include ^~condition=... triggers update. Unbound contextual property {^{include ~condition=... does not trigger updated content');

	// ................................ Reset ................................
	$("#result").empty();

	// =============================== Arrange ===============================

	things = [
		{
			type: "shape",
			form: "circle"
		},
		{
			type: "line",
			form: "square",
			thickness: "1"
		}
	];

	$.views.tags({
		updatingTag: {
		},
		nonUpdatingTag: {
			onUpdate: function() {
				return false;
			}
		}
	});
	$.templates('Updating: {^{updatingTag ^condition=type==="shape"}}{{:type}} {^{:~tag.tagCtx.props.condition}} {{/updatingTag}} '
		+ 'Non updating: {^{nonUpdatingTag ^condition=type==="shape"}}{{:type}} {^{:~tag.tagCtx.props.condition}} {{/nonUpdatingTag}}')
		.link("#result", things);

	// ................................ Act ..................................
	before = $("#result").text();
	$.observable(things[0]).setProperty({ type: "line", thickness: 5 });
	$.observable(things[1]).setProperty({ type: "shape" });
	$.observable(things[1]).removeProperty("thickness");
	after = $("#result").text();

	// ............................... Assert .................................
	equal(before + "|" + after,
	isIE8 ? "Updating: shape true Non updating: shape true Updating: line false Non updating: line false |Updating:line false  Non updating: shapefalse Updating:shape true  Non updating: linetrue "
		: "Updating: shape true  Non updating: shape true Updating: line false  Non updating: line false |Updating: line false  Non updating: shape false Updating: shape true  Non updating: line true ",
	'Binding to property triggers update {^{updatingTag ^condition=... unless tag is non-updating: {^{nonUpdatingTag ^condition=...');

	// ................................ Reset ................................
	$("#result").empty();

	// =============================== Arrange ===============================

	$.templates({
		myTmpl: "{{>name}} lead:{^{>~team.lead}} - "
	});

	var model = {
		lead: "Jim",
		people: [
			{ name: "Bob" },
			{ name: "Jim" }
		]
	};

	// ............................... Act .................................
	$.templates("<div data-link=\"{for people ~team=#data tmpl='myTmpl'}\"></div>").link("#result", model);

	result = $("#result").text();

	$.observable(model.people).insert({
		name: "newName"
	});

	$.observable(model).setProperty("lead", "newName");

	result += "|" + $("#result").text();

	// ............................... Assert .................................
	equal(result, (isIE8 ? "Bob lead:Jim - Jim lead:Jim - |Bob lead:newName - Jim lead:newName -newName lead:newName -  "
	: "Bob lead:Jim - Jim lead:Jim - |Bob lead:newName - Jim lead:newName - newName lead:newName - "),
		"data-link allows passing in new contextual variables to template: data-link=\"{for people ~team=#data tmpl=...");

	// ................................ Reset ................................
	$("#result").empty();

	// =============================== Arrange ===============================

	model = {
		sortby: "role",
		cols: ["name", "role"],
		sort: function(ev, eventArgs) {
			$.observable(data).setProperty({
				sortby: data.sortby === "role" ? "name" : "role"
			});
		}
	};

	// ............................... Act .................................
	$.templates('{^{for cols itemVar="~col"}}{^{:~root.sortby === ~col}}{{/for}}').link("#result", model);

	result = $("#result").text();

	$.observable(model).setProperty("sortby", model.sortby === "role" ? "name" : "role");

	result += "|" + $("#result").text();

	$.observable(model).setProperty("sortby", model.sortby === "role" ? "name" : "role");

	result += "|" + $("#result").text();

	// ............................... Assert .................................
	equal(result, "falsetrue|truefalse|falsetrue",
		"itemVar variables in item list are distinct variables");

	// ................................ Reset ................................
	$("#result").empty();

});

module("API - PropertyChange");

test("PropertyChange: setProperty()", 4, function() {

	// ................................ Reset ................................
	person1.home.address.street = "StreetOne"; // reset Prop

	// =============================== Arrange ===============================
	reset();
	$.observable(undefined).setProperty("street", "abc");

	// ............................... Assert .................................
	equal(result, "",
	"$.observable(undefined).setProperty(...) does nothing");

	// =============================== Arrange ===============================
	reset();
	$.observe(person1.home.address, "street", myListener);

	// ................................ Act ..................................
	$.observable(person1.home.address).setProperty("street", "newValue");

	// ............................... Assert .................................
	equal(result, "calls: 1, ev.data: prop: street, eventArgs: oldValue: StreetOne value: newValue, eventArgs.path: street|",
	"setProperty triggers 'observable.observe() callbacks with ev and eventArgs correctly populated");

	// ................................ Reset ................................
	person1.home.address.street = "StreetOne"; // reset Prop
	result1 = result;
	reset();

	// =============================== Arrange ===============================

	// ................................ Act ..................................
	$.observable(person1.home).setProperty("address.street", "newValue");

	// ............................... Assert .................................
	equal(result, result1,
	"setProperty on deep path is equivalent to setProperty on last object before leaf");

	// ................................ Reset ................................
	person1.home.address.street = "StreetOne"; // reset Prop
	reset();

	// =============================== Arrange ===============================

	// ................................ Act ..................................
	$.observable(person1).setProperty("home.address.street", "newValue");

	// ............................... Assert .................................
	equal(result, result1,
	"setProperty on even deeper path is equivalent to setProperty on last object before leaf");

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

	// =============================== Arrange ===============================
	things = ["1", "2"];

	// ................................ Act ..................................
	$.observable(things).insert(1, "a");

	// ............................... Assert .................................
	equal(things.join(" "), "1 a 2",
	'insert(1, "a") inserts at 1');

	// =============================== Arrange ===============================
	things = ["1", "2"];

	// ................................ Act ..................................
	$.observable(things).insert(2, "a");

	// ............................... Assert .................................
	equal(things.join(" "), "1 2 a",
	'insert(2, "a") inserts at 2');

	// =============================== Arrange ===============================
	things = ["1", "2"];

	// ................................ Act ..................................
	$.observable(things).insert("a");

	// ............................... Assert .................................
	equal(things.join(" "), "1 2 a",
	'insert("a") appends');

	// =============================== Arrange ===============================
	things = ["1", "2"];

	// ................................ Act ..................................
	$.observable(things).insert(1, ["a", "b"]);

	// ............................... Assert .................................
	equal(things.join(" "), "1 a b 2",
	'insert(1, ["a", "b"]) inserts multiple elements at 1');

	// =============================== Arrange ===============================
	things = ["1", "2"];

	// ................................ Act ..................................
	$.observable(things).insert(["a", "b", "c"]);

	// ............................... Assert .................................
	equal(things.join(" "), "1 2 a b c",
	'insert(["a", "b", "c"]) appends multiple elements');

	// =============================== Arrange ===============================
	things = ["1", "2"];

	// ................................ Act ..................................
	$.observable(things).insert("1", "b");

	// ............................... Assert .................................
	equal(things.join(" "), "1 b 2",
	'insert("1", "b") treats first param as index and inserts at 1');

	// =============================== Arrange ===============================
	things = ["1", "2"];

	// ................................ Act ..................................
	$.observable(things).insert("0", "b");

	// ............................... Assert .................................
	equal(things.join(" "), "b 1 2",
	'insert("0", "b") treats first param as index and inserts at 0');

	// =============================== Arrange ===============================
	things = ["1", "2"];

	// ................................ Act ..................................
	$.observable(things).insert("a", "b");

	// ............................... Assert .................................
	equal(things.join(" "), "1 2",
	'insert("a", "b") does nothing - since parseInt("a") is NaN');

	// =============================== Arrange ===============================
	things = ["1", "2"];

	// ................................ Act ..................................
	$.observable(things).insert("1a", "b");

	// ............................... Assert .................................
	equal(things.join(" "), "1 b 2",
	'insert("1a", "b") inserts "b" at 1 - since parseInt("1a") is 1');

	// =============================== Arrange ===============================
	things = [];

	// ................................ Act ..................................
	$.observable(things).insert("a");

	// ............................... Assert .................................
	equal(things.join(" "), "a",
	'insert("a") still appends "a", correctly if array is empty at first');

	// =============================== Arrange ===============================
	things = ["1", "2"];

	// ................................ Act ..................................
	$.observable(things).insert(1);

	// ............................... Assert .................................
	equal(things.join(" ") + (things[2] === 1), "1 2 1true",
	'insert(1) appends 1');

	// =============================== Arrange ===============================
	things = ["1", "2"];

	// ................................ Act ..................................
	$.observable(things).insert(0);

	// ............................... Assert .................................
	equal(things.join(" ") + (things[2] === 0), "1 2 0true",
	'insert(0) appends 0');

	// =============================== Arrange ===============================
	things = ["1", "2"];

	// ................................ Act ..................................
	$.observable(things).insert(undefined);

	// ............................... Assert .................................
	equal(things.join(" "), "1 2 ",
	'insert(undefined) appends undefined');

	// =============================== Arrange ===============================
	things = ["1", "2"];

	// ................................ Act ..................................
	$.observable(things).insert(1, undefined);

	// ............................... Assert .................................
	equal(things.join(" "), "1  2",
	'insert(1, undefined) inserts undefined');

	// =============================== Arrange ===============================
	things = ["1", "2"];

	// ................................ Act ..................................
	$.observable(things).insert(0, undefined);

	// ............................... Assert .................................
	equal(things.join(" "), " 1 2",
	'insert(0, undefined) inserts undefined');

	// =============================== Arrange ===============================
	things = ["1", "2"];

	// ................................ Act ..................................
	$.observable(things).insert([undefined, null, 0, 1, "2"]);

	// ............................... Assert .................................
	equal(things.join(" "), "1 2   0 1 2",
	'insert(1, [undefined, null, 0, 1, "2"]) inserts correctly');

	// =============================== Arrange ===============================
	things = ["1", "2"];

	// ................................ Act ..................................
	$.observable(things).insert("a", "b");

	// ............................... Assert .................................
	equal(things.join(" "), "1 2",
	'insert("a", "b") does nothing - since parseInt("a") is NaN');

	// =============================== Arrange ===============================
	things = ["1", "2"];

	// ................................ Act ..................................
	$.observable(things).insert(-1, "a");

	// ............................... Assert .................................
	equal(things.join(" "), "1 2",
	'insert(-1, "a") does nothing');

	// =============================== Arrange ===============================
	things = ["1", "2"];

	// ................................ Act ..................................
	$.observable(things).insert(10, "a");

	// ............................... Assert .................................
	equal(things.join(" "), "1 2",
	'insert(10, "a") (out of range) does nothing');
});

test("JsObservable: remove()", function() {

	// =============================== Arrange ===============================
	var things = ["1", "2"];

	// ................................ Act ..................................
	$.observable(things).remove(0);

	// ............................... Assert .................................
	equal(things.join(" "), "2",
	'remove(0) removes 1 item at 0');

	// =============================== Arrange ===============================
	things = ["1", "2"];

	// ................................ Act ..................................
	$.observable(things).remove(1);

	// ............................... Assert .................................
	equal(things.join(" "), "1",
	'remove(1) removes 1 item at 1');

	// =============================== Arrange ===============================
	things = ["1", "2"];

	// ................................ Act ..................................
	$.observable(things).remove(2);

	// ............................... Assert .................................
	equal(things.join(" "), "1 2",
	'remove(2) does nothing (out of range');

	// =============================== Arrange ===============================
	things = ["1", "2"];

	// ................................ Act ..................................
	$.observable(things).remove();

	// ............................... Assert .................................
	equal(things.join(" "), "1",
	'remove() removes from end');

	// =============================== Arrange ===============================
	things = ["1", "2", "3", "4"];

	// ................................ Act ..................................
	$.observable(things).remove(1, 2);

	// ............................... Assert .................................
	equal(things.join(" "), "1 4",
	'remove(1, 2) removes multiple items at 1');

	// =============================== Arrange ===============================
	things = ["1", "2", "3", "4"];

	// ................................ Act ..................................
	$.observable(things).remove(1, 10);

	// ............................... Assert .................................
	equal(things.join(" "), "1",
	'remove(1, 10) removes all relevant items');

	// =============================== Arrange ===============================
	things = ["1", "2", "3", "4"];

	// ................................ Act ..................................
	$.observable(things).remove("1c", "2.001 euros");

	// ............................... Assert .................................
	equal(things.join(" "), "1 4",
	'remove("1c", "2.001 euros") does parseInt and removes 2 items at 1');

	// =============================== Arrange ===============================
	things = ["1", "2"];

	// ................................ Act ..................................
	$.observable(things).remove("a");

	// ............................... Assert .................................
	equal(things.join(" "), "1 2",
	'remove("a") does nothing - since parseInt("a") is NaN');

	// =============================== Arrange ===============================
	things = ["1", "2"];

	// ................................ Act ..................................
	$.observable(things).remove("a", "b");

	// ............................... Assert .................................
	equal(things.join(" "), "1 2",
	'remove(1, "b") does nothing - since parseInt("b") is NaN');

	// =============================== Arrange ===============================
	things = [];

	// ................................ Act ..................................
	$.observable(things).remove();

	// ............................... Assert .................................
	equal(things.join(" "), "",
	'remove() does nothing if array is empty at first');

	// =============================== Arrange ===============================
	things = ["1", "2"];

	// ................................ Act ..................................
	$.observable(things).remove(-1);

	// ............................... Assert .................................
	equal(things.join(" "), "1 2",
	'remove(-1) does nothing');

	// =============================== Arrange ===============================
	things = ["1", "2"];

	// ................................ Act ..................................
	$.observable(things).remove(10);

	// ............................... Assert .................................
	equal(things.join(" "), "1 2",
	'remove(10, "a") (out of range) does nothing');

	// =============================== Arrange ===============================
	things = ["1", "2"];

	// ................................ Act ..................................
	$.observable(things).remove(10);

	// ............................... Assert .................................
	equal(things.join(" "), "1 2",
	'remove(10) (out of range) does nothing');
});

test("JsObservable: move()", function() {

	// =============================== Arrange ===============================
	var things = ["1", "2", "3", "4"];

	// ................................ Act ..................................
	$.observable(things).move(1, 2);

	// ............................... Assert .................................
	equal(things.join(" "), "1 3 2 4",
	'move(1, 2) moves 1 item from 1 to 2 - so swaps them');

	// =============================== Arrange ===============================
	things = ["1", "2", "3", "4"];

	// ................................ Act ..................................
	$.observable(things).move(2, 1);

	// ............................... Assert .................................
	equal(things.join(" "), "1 3 2 4",
	'move(1, 2) moves 1 item from 2 to 1 - so swaps them');

	// =============================== Arrange ===============================
	things = ["1", "2", "3", "4"];

	// ................................ Act ..................................
	$.observable(things).move(1, 3);

	// ............................... Assert .................................
	equal(things.join(" "), "1 3 4 2",
	'move(1, 2) moves 1 item at from 1 to 3');

	// =============================== Arrange ===============================
	things = ["1", "2", "3", "4"];

	// ................................ Act ..................................
	$.observable(things).move(1, 2, 2);

	// ............................... Assert .................................
	equal(things.join(" "), "1 4 2 3",
	'move(1, 2, 2) moves 2 items at from 1 to 2');

	// =============================== Arrange ===============================
	things = ["1", "2", "3", "4"];

	// ................................ Act ..................................
	$.observable(things).move(1, 3, 2);

	// ............................... Assert .................................
	equal(things.join(" "), "1 4 2 3",
	'move(1, 3, 2) moves 2 items from 1 to 2 - same as if moving to 2, since hits the end of the array');

	// =============================== Arrange ===============================
	things = ["1", "2", "3", "4"];

	// ................................ Act ..................................
	$.observable(things).move(1, 2, 3);

	// ............................... Assert .................................
	equal(things.join(" "), "1 2 3 4",
	'move(1, 2, 3) moves 3 items from 1 to 2 - which does nothing since hits the end of the array');

	// =============================== Arrange ===============================
	things = ["1", "2", "3", "4"];

	// ................................ Act ..................................
	$.observable(things).move(1, 6, 2);

	// ............................... Assert .................................
	equal(things.join(" "), "1 4 2 3",
	'move(1, 6, 2) moves 2 items from 1 to 6 - same as if moving to 2, since hits the end of the array');

	// =============================== Arrange ===============================
	things = ["1", "2", "3", "4"];

	// ................................ Act ..................................
	$.observable(things).move(1, 1);

	// ............................... Assert .................................
	equal(things.join(" "), "1 2 3 4",
	'move(1, 1) does nothing');

	// =============================== Arrange ===============================
	things = ["1", "2", "3", "4"];

	// ................................ Act ..................................
	$.observable(things).move(1, 1, 3);

	// ............................... Assert .................................
	equal(things.join(" "), "1 2 3 4",
	'move(1, 1, 3) does nothing');

	// =============================== Arrange ===============================
	things = ["1", "2", "3", "4"];

	// ................................ Act ..................................
	$.observable(things).move(1);

	// ............................... Assert .................................
	equal(things.join(" "), "1 2 3 4",
	'move(1) does nothing');

	// =============================== Arrange ===============================
	things = ["1", "2", "3", "4"];

	// ................................ Act ..................................
	$.observable(things).move();

	// ............................... Assert .................................
	equal(things.join(" "), "1 2 3 4",
	'move() does nothing');

	// =============================== Arrange ===============================
	things = ["1", "2", "3", "4"];

	// ................................ Act ..................................
	$.observable(things).move(10, 0);

	// ............................... Assert .................................
	equal(things.join(" "), "1 2 3 4",
	'move(10, 0) does nothing (out of range)');

	// =============================== Arrange ===============================
	things = ["1", "2", "3", "4"];

	// ................................ Act ..................................
	$.observable(things).move(0, 10);

	// ............................... Assert .................................
	equal(things.join(" "), "2 3 4 1",
	'move(0, 10) moves item 0 to the end (out of range)');

	// =============================== Arrange ===============================
	things = ["1", "2", "3", "4"];

	// ................................ Act ..................................
	$.observable(things).move(3, 0, 6);

	// ............................... Assert .................................
	equal(things.join(" "), "4 1 2 3",
	'move(3, 0, 6) moves any items that are not out of range');

	// =============================== Arrange ===============================
	things = ["1", "2", "3", "4"];

	// ................................ Act ..................................
	$.observable(things).move(-1, 2);

	// ............................... Assert .................................
	equal(things.join(" "), "1 2 3 4",
	'move(-1, 2) does nothing');

	// =============================== Arrange ===============================
	things = ["1", "2", "3", "4"];

	// ................................ Act ..................................
	$.observable(things).move(-1, 2);

	// ............................... Assert .................................
	equal(things.join(" "), "1 2 3 4",
	'move(-1, 2) does nothing');

	// =============================== Arrange ===============================
	things = ["1", "2", "3", "4"];

	// ................................ Act ..................................
	$.observable(things).move(1, -1);

	// ............................... Assert .................................
	equal(things.join(" "), "1 2 3 4",
	'move(1, -1) does nothing');

	// =============================== Arrange ===============================
	things = ["1", "2", "3", "4"];

	// ................................ Act ..................................
	$.observable(things).move(1, 2, -1);

	// ............................... Assert .................................
	equal(things.join(" "), "1 2 3 4",
	'move(1, 2, -1) does nothing');

	// =============================== Arrange ===============================
	things = ["1", "2", "3", "4"];

	// ................................ Act ..................................
	$.observable(things).move("a", 2);

	// ............................... Assert .................................
	equal(things.join(" "), "1 2 3 4",
	'move("a", 2) does nothing');

	// =============================== Arrange ===============================
	things = ["1", "2", "3", "4"];

	// ................................ Act ..................................
	$.observable(things).move("1c", "2.001 euros", "2px");

	// ............................... Assert .................................
	equal(things.join(" "), "1 4 2 3",
	'move("1c", "2.001 euros, "2px") does parseInt and moves 2 items from 1 to 2');

	// =============================== Arrange ===============================
	things = ["1", "2", "3", "4"];

	// ................................ Act ..................................
	$.observable(things).move("c", "2.001 euros", "2px");

	// ............................... Assert .................................
	equal(things.join(" "), "1 2 3 4",
	'move("c", "2.001 euros, "2px") does nothing since parseInt("c") is NaN');

	// =============================== Arrange ===============================
	things = ["1", "2", "3", "4"];

	// ................................ Act ..................................
	$.observable(things).move("1c", "euros", "2px");

	// ............................... Assert .................................
	equal(things.join(" "), "1 2 3 4",
	'move("1c", "euros, "2px") does nothing since parseInt("euros") is NaN');

	// =============================== Arrange ===============================
	things = ["1", "2", "3", "4"];

	// ................................ Act ..................................
	$.observable(things).move("1c", "2.001 euros", "px");

	// ............................... Assert .................................
	equal(things.join(" "), "1 2 3 4",
	'move("1c", "2.001 euros, "px") does nothing since parseInt("px") is NaN');

	// =============================== Arrange ===============================
	things = ["1", "2", "3", "4"];

	// ................................ Act ..................................
	$.observable(things).move("1c", "2.001 euros", undefined);

	// ............................... Assert .................................
	equal(things.join(" "), "1 3 2 4",
	'move("1c", "2.001 euros, undefined) moves 1');

	// =============================== Arrange ===============================
	things = ["1", "2", "3", "4"];

	// ................................ Act ..................................
	$.observable(things).move("1c", "2.001 euros", null);

	// ............................... Assert .................................
	equal(things.join(" "), "1 3 2 4",
	'move("1c", "2.001 euros, null) moves 1');

	// =============================== Arrange ===============================
	things = ["1", "2", "3", "4"];

	// ................................ Act ..................................
	$.observable(things).move("1c", undefined);

	// ............................... Assert .................................
	equal(things.join(" "), "1 2 3 4",
	'move("1c", undefined) does does nothing since parseInt(undefined) is NaN');

	// =============================== Arrange ===============================
	things = ["1", "2", "3", "4"];

	// ................................ Act ..................................
	$.observable(things).move("1c", null);

	// ............................... Assert .................................
	equal(things.join(" "), "1 2 3 4",
	'move("1c", null) does does nothing since parseInt(null) is NaN');

	// =============================== Arrange ===============================
	things = [];

	// ................................ Act ..................................
	$.observable(things).move(1, 2);

	// ............................... Assert .................................
	equal(things.join(" "), "",
	'move(1, 2) does nothing if array is empty');

	$.views.settings.debugMode(false);
});

test("JsViews ArrayChange: insert()", function() {

	// =============================== Arrange ===============================
	$.views.tags({
		liTag: function() {
			return "<li>Tag</li>";
		}
	});

	model.things = [{ thing: "Orig" }]; // reset Prop

	$.templates('<ul>{^{liTag/}}{^{for things}}<li>{{:thing}}</li>{^{liTag/}}{{/for}}<li>|after</li></ul>')
		.link("#result", model);

	// ................................ Act ..................................
	$.observable(model.things).insert(0, { thing: "First" });
	$.observable(model.things).insert(1, { thing: "Last" });
	$.observable(model.things).insert(1, { thing: "Middle" });

	// ............................... Assert .................................
	equal($("#result").text(), "TagFirstTagMiddleTagLastTagOrigTag|after",
	'Within element only content, insertion finds correctly the previous view, prevNode, nextNode, etc and establishes correct element order and binding');

	// ................................ Reset ................................
	$("#result").empty();
	model.things = []; // reset Prop

	// =============================== Arrange ===============================
	$.views.tags({
		spanTag: function() {
			return "<span>Tag</span>";
		}
	});

	model.things = [{ thing: "Orig" }]; // reset Prop

	$.templates('<div>{^{spanTag/}}{^{for things}}<span>{{:thing}}</span>{^{spanTag/}}{{/for}}<span>|after</span></div>')
		.link("#result", model);

	// ................................ Act ..................................
	$.observable(model.things).insert(0, { thing: "First" });
	$.observable(model.things).insert(1, { thing: "Last" });
	$.observable(model.things).insert(1, { thing: "Middle" });

	// ............................... Assert .................................
	equal($("#result").text(), "TagFirstTagMiddleTagLastTagOrigTag|after",
	'Within regular content, insertion finds correctly the previous view, prevNode, nextNode, etc and establishes correct element/textNode order and binding');

	// ................................ Reset ................................
	$("#result").empty();
	model.things = [{ thing: "Orig" }]; // reset Prop

	// =============================== Arrange ===============================
	$.templates('<table><tbody>{^{for things}}<tr><td>{{:thing}}</td></tr>{{/for}}</tbody></table>')
		.link("#result", model);
	// ................................ Act ..................................
	$.observable(model.things).insert(0, { thing: "First" });

	// ............................... Assert .................................
	equal($("#result").text(), "FirstOrig",
	'Within element only content, insertion finds correctly the previous view, prevNode, nextNode, etc and establishes correct element order and binding');

	// ................................ Reset ................................
	$("#result").empty();
	model.things = []; // reset Prop
});

test("JsViews ArrayChange: remove()", function() {
	// =============================== Arrange ===============================
	$.views.tags({
		liTag: function() {
			return "<li>Tag</li>";
		}
	});

	model.things = [{ thing: "Orig" }, { thing: "First" }, { thing: "Middle" }, { thing: "Last" }]; // reset Prop

	$.templates('<ul>{^{liTag/}}{^{for things}}<li>{{:thing}}</li>{^{liTag/}}{{/for}}<li>|after</li></ul>')
		.link("#result", model); // -> TagOrigTagFirstTagMiddleTagLastTag|after

	// ................................ Act ..................................
	$.observable(model.things).remove(1);

	// ............................... Assert .................................
	equal($("#result").text(), "TagOrigTagMiddleTagLastTag|after",
	'Within element only content, remove(1) finds correctly the previous view, prevNode, nextNode, etc and establishes correct element order and binding');

	// ................................ Act ..................................
	$.observable(model.things).remove(); //TagOrigTagFirstTagMiddleTagLastTag|after

	// ............................... Assert .................................
	equal($("#result").text(), "TagOrigTagMiddleTag|after",
	'Within element only content, remov finds correctly the previous view, prevNode, nextNode, etc and establishes correct element order and binding');

	// ................................ Reset ................................
	$("#result").empty();

	// =============================== Arrange ===============================
	$.views.tags({
		spanTag: function() {
			return "<span>Tag</span>";
		}
	});

	model.things = [{ thing: "Orig" }, { thing: "First" }, { thing: "Middle" }, { thing: "Last" }]; // reset Prop

	$.templates('<div>{^{spanTag/}}{^{for things}}<span>{{:thing}}</span>{^{spanTag/}}{{/for}}<span>|after</span></div>')
		.link("#result", model);

	// ................................ Act ..................................
	$.observable(model.things).remove(1);

	// ............................... Assert .................................
	equal($("#result").text(), "TagOrigTagMiddleTagLastTag|after",
	'Within regular content, remove(1) finds correctly the previous view, prevNode, nextNode, etc and establishes correct element/textNode order and binding');

	// ................................ Act ..................................
	$.observable(model.things).remove();

	// ............................... Assert .................................
	equal($("#result").text(), "TagOrigTagMiddleTag|after",
	'Within regular content, remove() finds correctly the previous view, prevNode, nextNode, etc and establishes correct element/textNode order and binding');

	// ................................ Reset ................................
	$("#result").empty();
	model.things = []; // reset Prop

});

test("JsViews ArrayChange: move()", function() {
	// =============================== Arrange ===============================
	$.views.tags({
		liTag: function() {
			return "<li>Tag</li>";
		}
	});

	model.things = [{ thing: "Orig" }, { thing: "First" }, { thing: "Middle" }, { thing: "Last" }]; // reset Prop

	$.templates('<ul>{^{liTag/}}{^{for things}}<li>{{:thing}}</li>{^{liTag/}}{{/for}}<li>|after</li></ul>')
		.link("#result", model); // -> TagOrigTagFirstTagMiddleTagLastTag|after

	// ................................ Act ..................................
	$.observable(model.things).move(2, 0, 2);

	// ............................... Assert .................................
	equal($("#result").text(), "TagMiddleTagLastTagOrigTagFirstTag|after",
	'Within element only content, move(2, 0, 2) finds correctly the previous view, prevNode, nextNode, etc and establishes correct element order and binding');

	// ................................ Reset ................................
	$("#result").empty();

	// =============================== Arrange ===============================
	$.views.tags({
		spanTag: function() {
			return "<span>Tag</span>";
		}
	});

	model.things = [{ thing: "Orig" }, { thing: "First" }, { thing: "Middle" }, { thing: "Last" }]; // reset Prop

	$.templates('<div>{^{spanTag/}}{^{for things}}<span>{{:thing}}</span>{^{spanTag/}}{{/for}}<span>|after</span></div>')
		.link("#result", model);

	// ................................ Act ..................................
	$.observable(model.things).move(2, 0, 2);

	// ............................... Assert .................................
	equal($("#result").text(), "TagMiddleTagLastTagOrigTagFirstTag|after",
	'Within regular content, move(2, 0, 2) finds correctly the previous view, prevNode, nextNode, etc and establishes correct element/textNode order and binding');

	// ................................ Reset ................................
	$("#result").empty();
	model.things = []; // reset Prop
});

test("JsViews ArrayChange: refresh()", function() {
	// =============================== Arrange ===============================
	$.views.tags({
		liTag: function() {
			return "<li>Tag</li>";
		}
	});

	model.things = [{ thing: "Orig" }, { thing: "First" }, { thing: "Middle" }, { thing: "Last" }]; // reset Prop

	$.templates('<ul>{^{liTag/}}{^{for things}}<li>{{:thing}}</li>{^{liTag/}}{{/for}}<li>|after</li></ul>')
		.link("#result", model); // -> TagOrigTagFirstTagMiddleTagLastTag|after

	// ................................ Act ..................................
	$.observable(model.things).refresh([{ thing: "A" }, { thing: "B" }, { thing: "C" }]);

	// ............................... Assert .................................
	equal($("#result").text(), "TagATagBTagCTag|after",
	'Within element only content, refresh() finds correctly the previous view, prevNode, nextNode, etc and establishes correct element order and binding');

	// ................................ Reset ................................
	$("#result").empty();

	// =============================== Arrange ===============================
	$.views.tags({
		spanTag: function() {
			return "<span>Tag</span>";
		}
	});

	model.things = [{ thing: "Orig" }, { thing: "First" }, { thing: "Middle" }, { thing: "Last" }]; // reset Prop

	$.templates('<div>{^{spanTag/}}{^{for things}}<span>{{:thing}}</span>{^{spanTag/}}{{/for}}<span>|after</span></div>')
		.link("#result", model);

	// ................................ Act ..................................
	$.observable(model.things).refresh([{ thing: "A" }, { thing: "B" }, { thing: "C" }]);

	// ............................... Assert .................................
	equal($("#result").text(), "TagATagBTagCTag|after",
	'Within regular content, refresh() finds correctly the previous view, prevNode, nextNode, etc and establishes correct element/textNode order and binding');

	// ................................ Reset ................................
	$("#result").empty();
	model.things = []; // reset Prop
});

test("JsViews jsv-domchange", function() {
	// =============================== Arrange ===============================
	function domchangeHandler(ev, tagCtx, linkCtx, eventArgs) {
		result += ev.type + " " + ev.target.tagName + " " + tagCtx.params.args[0] + " " + (linkCtx.tag === tagCtx.tag) + " " + eventArgs.change + " | " ;
	}

	$.views.tags({
		spanTag: function() {
			return "<span>Tag</span>";
		}
	});

	model.things = [{ thing: "Orig" }, { thing: "First" }, { thing: "Middle" }, { thing: "Last" }]; // reset Prop

	$.templates('<div>{^{spanTag/}}{^{for things}}<span>{{:thing}}</span>{^{spanTag/}}{{/for}}<span>|after</span></div>')
		.link("#result", model);

	$("#result div").on("jsv-domchange", domchangeHandler);

	// ................................ Act ..................................
	$.observable(model.things).insert({thing: "New"});
	$.observable(model.things).move(2, 0, 2);
	$.observable(model.things).remove(1, 2);
	$.observable(model.things).refresh([{ thing: "A" }, { thing: "B" }, { thing: "C" }]);

	// ............................... Assert .................................
	equal(result,
		"jsv-domchange DIV things true insert | "
		+ "jsv-domchange DIV things true move | "
		+ "jsv-domchange DIV things true remove | "
		+ "jsv-domchange DIV things true refresh | ",
	'Correct behavior of $(...).on("jsv-domchange", domchangeHandler)');

	// ................................ Reset ................................
	$("#result").empty();
	reset();

	// =============================== Arrange ===============================
	model.things = [{ thing: "Orig" }, { thing: "First" }, { thing: "Middle" }, { thing: "Last" }]; // reset Prop

	$.templates(
		'<div data-link=\'"{on "jsv-domchange" ~domchange 333 444}\'>'
			+ '{^{spanTag/}}{^{for things}}<span>{{:thing}}</span>{^{spanTag/}}{{/for}}<span>|after</span>'
		+'</div>')
		.link("#result", model, {
			domchange: function(param1, param2, ev, domchangeEventArgs, tagCtx, linkCtx, observableEventArgs) {
				result += "Params: " + param1 + ", " + param2 + " | ";
				domchangeHandler(ev, tagCtx, linkCtx, observableEventArgs);
			}
		});

	// ................................ Act ..................................
	$.observable(model.things).insert({thing: "New"});
	$.observable(model.things).move(2, 0, 2);
	$.observable(model.things).remove(1, 2);
	$.observable(model.things).refresh([{ thing: "A" }, { thing: "B" }, { thing: "C" }]);

	equal(result,
		"Params: 333, 444 | jsv-domchange DIV things true insert | "
		+ "Params: 333, 444 | jsv-domchange DIV things true move | "
		+ "Params: 333, 444 | jsv-domchange DIV things true remove | "
		+ "Params: 333, 444 | jsv-domchange DIV things true refresh | ",
	'Correct behavior of data-link=\'{on "jsv-domchange" ~domchange param1 param2}\'');

	// ................................ Reset ................................
	model.things = []; // reset Prop
	$("#result").empty();
	reset();
});

module("API - $.observe()");

test("observe/unobserve alternative signatures", function() {

	// ................................ Reset ................................
	person1.home.address.street = "StreetOne"; // reset Prop
	person1.home.address.ZIP = "111"; // reset Prop
	$.views.settings.debugMode(); // For using _jsv
	reset();

	// =============================== Arrange ===============================
	// ................................ Act ..................................
	$.observe(person1.home.address, "street", myListener);
	$.observable(person1.home.address).setProperty("street", "newValue");

	// ............................... Assert .................................
	equal(result, "calls: 1, ev.data: prop: street, eventArgs: oldValue: StreetOne value: newValue, eventArgs.path: street|",
	"$.observe(object, path, cb)");

	// ................................ Reset ................................
	person1.home.address.street = "StreetOne"; // reset Prop
	reset();

	// =============================== Arrange ===============================

	// ................................ Act ..................................
	$.unobserve(person1.home.address, "street", myListener);
	$.observable(person1.home.address).setProperty("street", "newValue");

	// ............................... Assert .................................
	equal(result, "",
	"$.unobserve(object, path, cb)");

	// ................................ Reset ................................
	person1.home.address.street = "StreetOne"; // reset Prop
	reset();

	// =============================== Arrange ===============================

	// ................................ Act ..................................
	$.observe(person1.home.address, "street", "ZIP", myListener);
	$.observable(person1.home.address).setProperty({ street: "newValue", ZIP: "newZip" });

	// ............................... Assert .................................
	equal(result, "calls: 1, ev.data: prop: street, eventArgs: oldValue: StreetOne value: newValue, eventArgs.path: street|"
				+ "calls: 2, ev.data: prop: ZIP, eventArgs: oldValue: 111 value: newZip, eventArgs.path: ZIP|",
	"$.observe(object, path1, path2, cb)");

	// ................................ Reset ................................
	person1.home.address.street = "StreetOne"; // reset Prop
	person1.home.address.ZIP = "111"; // reset Prop
	reset();

	// =============================== Arrange ===============================

	// ................................ Act ..................................
	$.unobserve(person1.home.address, "street", "ZIP", myListener);
	$.observable(person1.home.address).setProperty({ street: "newValue", ZIP: "newZip" });

	// ............................... Assert .................................
	equal(result, "",
	"$.unobserve(object, path1, path2, cb) removes previous handlers");

	// ................................ Reset ................................
	person1.home.address.street = "StreetOne"; // reset Prop
	person1.home.address.ZIP = "111"; // reset Prop
	reset();

	// =============================== Arrange ===============================
	var person = { last: " L" };
	function onch(ev, eventArgs) {
	}

	// ................................ Act ..................................
	$.observe(person, "last", onch);
	$.templates("{^{:last}}").link("#result", person);
	$.unobserve(person, "last", onch);
	$("#result").empty();

	// ............................... Assert .................................
	equal(JSON.stringify([$.views.sub._cbBnds, _jsv.bindings, $._data(person).events]), "[{},{},null]",
		"observe/unobserve API calls combined with template binding: all bindings removed when content removed from DOM and unobserve called");

	// =============================== Arrange ===============================
	function onch2(ev, eventArgs) {
	}

	// ................................ Act ..................................
	$.observe(person, "last", onch);
	$.observe(person, "last", onch2);
	$.unobserve(person, "last", onch);
	$.unobserve(person, "last", onch2);

	// ............................... Assert .................................
	equal(JSON.stringify([$.views.sub._cbBnds, _jsv.bindings, $._data(person).events]), "[{},{},null]",
		"observe/unobserve API calls in different orders: all bindings removed when unobserve called");

	// =============================== Arrange ===============================
	person = { first: "F", last: " L" };

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
	equal(JSON.stringify([$.views.sub._cbBnds, _jsv.bindings, $._data(person).events]), "[{},{},null]",
		"observe/unobserve API calls in different orders (version 2): all bindings removed when unobserve called");

	// =============================== Arrange ===============================
	person = { first: "F", last: " L" };

	// ................................ Act ..................................
	$.observe(person, "last", onch);
	$.observe(person, "last", onch2);
	$.templates("{^{:last}} <input data-link='last'/>}} {^{:first + last}}").link("#result", person);
	$.observe(person, "first", onch);
	$.observe(person, "first", onch2);
	$.unobserve(person, "last", onch);
	$.unobserve(person, "last", onch2);
	$("#result").empty();
	$.unobserve(person, "first", onch);
	$.unobserve(person, "first", onch2);

	// ............................... Assert .................................
	equal(JSON.stringify([$.views.sub._cbBnds, _jsv.bindings, $._data(person).events]), "[{},{},null]",
		"Observe API calls combined with template binding (version 2): all bindings removed when content removed from DOM and unobserve called");

	// =============================== Arrange ===============================
	person = {
		name: "Pete",
		address: {
			street: "1st Ave"
		},
		phones: [{ number: "111 111 1111" }, { number: "222 222 2222" }]
	};

	// ................................ Act ..................................
	$.observe(person, "name", myListener);
	$.unobserve(person, "name", myListener);

	// ............................... Assert .................................
	equal(JSON.stringify([$.views.sub._cbBnds, $._data(person).events]), "[{},null]",
		"unobserve with path and handler works");

	// ................................ Act ..................................
	$.observe(person, "name", myListener);
	$.unobserve(person);

	// ............................... Assert .................................
	equal(JSON.stringify([$.views.sub._cbBnds, $._data(person).events]), "[{},null]",
		"unobserve without path and handler works");

	// ................................ Act ..................................
	$.observe(person, "name", "address^street", "phones", myListener);
	$.unobserve(person, "name", "address^street", "phones", myListener);

	// ............................... Assert .................................
	equal(JSON.stringify([$.views.sub._cbBnds, $._data(person).events, $._data(person.address).events, $._data(person.phones).events]), "[{},null,null,null]",
		"unobserve with multiple paths and handler works");

	// ................................ Act ..................................
	$.observe(person.phones, myListener);
	$.unobserve(person.phones);

	// ............................... Assert .................................
	equal(JSON.stringify([$.views.sub._cbBnds, $._data(person.phones).events]), "[{},null]",
		"unobserve for array works");

	// ................................ Act ..................................
	$.observe(person, "name", "address^street", "phones", myListener);
	$.unobserve(person, "*", person.address, "*");

	// ............................... Assert .................................
	equal(JSON.stringify([$.views.sub._cbBnds, $._data(person).events]), "[{},null]",
		"unobserve with deep paths using '*' works");

	$.views.settings.debugMode(false);
});

test("observe/unobserve using namespaces", function() {

	$.views.settings.debugMode(); // For using _jsv
	var thing = { val: "initVal" };

	// =============================== Arrange ===============================
	// ................................ Act ..................................
	$.observe("my.nmspace", thing, "val", myListener);
	reset();
	$.observable(thing).setProperty("val", "newVal");

	// ............................... Assert .................................
	equal(result + $._data(thing).events.propertyChange.length,
		"calls: 1, ev.data: prop: val, eventArgs: oldValue: initVal value: newVal, eventArgs.path: val|1",
		"$.observe(namespace, object, path, cb)");

	// =============================== Arrange ===============================
	// ................................ Act ..................................
	$.unobserve("my.nmspace", thing);
	reset();
	$.observable(thing).setProperty("val", "newVal");

	// ............................... Assert .................................
	equal(result + JSON.stringify([$.views.sub._cbBnds, _jsv.bindings, $._data(thing).events]),
		"[{},{},null]",
		"$.observe(namespace, object, path, cb); $.unobserve(namespace, object); removes all events added with the same namespace");

	// ................................ Reset ................................
	$.unobserve(thing);
	thing.val = "initVal"; // reset Prop

	// =============================== Arrange ===============================
	$.observe("my.nmspace", thing, "val", myListener);
	$.unobserve(thing);

	// ................................ Act ..................................
	reset();
	$.observable(thing).setProperty("val", "newVal");

	// ............................... Assert .................................
	equal(result + JSON.stringify([$.views.sub._cbBnds, _jsv.bindings, $._data(thing).events]),
		"[{},{},null]",
		"$.observe(namespace, object, path, cb); $.unobserve(object); removes all events even if added with the namespace");

	// ................................ Reset ................................
	$.unobserve(thing);
	thing.val = "initVal"; // reset Prop

	// =============================== Arrange ===============================
	$.observe("my.nmspace", thing, "val", myListener);
	$.unobserve("my2.nmspace", thing);

	// ................................ Act ..................................
	reset();
	$.observable(thing).setProperty("val", "newVal");

	// ............................... Assert .................................
	equal(result + $._data(thing).events.propertyChange.length,
		"calls: 1, ev.data: prop: val, eventArgs: oldValue: initVal value: newVal, eventArgs.path: val|1",
		"$.observe(namespace, object, path, cb); $.unobserve(otherNamespace, object); does not remove events if added with a different namespace");

	// ................................ Reset ................................
	$.unobserve(thing);
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
	equal(result + $._data(thing).events.propertyChange.length,
		"calls: 1, ev.data: prop: val, eventArgs: oldValue: initVal value: newVal, eventArgs.path: val|"
		+ "calls: 2, ev.data: prop: val, eventArgs: oldValue: initVal value: newVal, eventArgs.path: val|"
		+ "calls: 3, ev.data: prop: val, eventArgs: oldValue: newVal value: newVal2, eventArgs.path: val|1",
		"$.observe(namespace1, object, path, cb); $.observe(namespace2, object, path, cb); $.unobserve(namespace1, object); Add two events with different namespaces, then remove one of the namespaces - leaves the other handlers");

	// ................................ Reset ................................
	$.unobserve(thing);
	thing.val = "initVal"; // reset Prop

	// =============================== Arrange ===============================
	$.observe("my.nmspace your.nmspace", thing, "val", myListener);

	// ................................ Act ..................................
	reset();
	$.observable(thing).setProperty("val", "newVal");
	$.unobserve("my.nmspace", thing);
	$.observable(thing).setProperty("val", "newVal2");

	// ............................... Assert .................................
	equal(result + $._data(thing).events.propertyChange.length,
		"calls: 1, ev.data: prop: val, eventArgs: oldValue: initVal value: newVal, eventArgs.path: val|"
		+ "calls: 2, ev.data: prop: val, eventArgs: oldValue: initVal value: newVal, eventArgs.path: val|"
		+ "calls: 3, ev.data: prop: val, eventArgs: oldValue: newVal value: newVal2, eventArgs.path: val|1",
		'$.observe("my.nmspace your.nmspace", object, path, cb); $.unobserve(my.nmspace, object); Whitepace separated namespaces adds events for each namespace, then remove one of the namespaces - leaves the other handlers - as in previous test');

	// ................................ Reset ................................
	$.unobserve(thing);
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
	equal(result + JSON.stringify([$.views.sub._cbBnds, _jsv.bindings, $._data(thing).events]),
		"calls: 1, ev.data: prop: val, eventArgs: oldValue: initVal value: newVal, eventArgs.path: val|"
		+ "calls: 2, ev.data: prop: val, eventArgs: oldValue: initVal value: newVal, eventArgs.path: val|"
		+ "[{},{},null]",
		'$.unobserve("my.nmspace your.nmspace", object); $.unobserve with whitepace separated namespaces removes handler for each namespace');

	// ................................ Reset ................................
	$.unobserve(thing);
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
	equal(result + JSON.stringify([$.views.sub._cbBnds, _jsv.bindings, $._data(thing).events]),
		"calls: 1, ev.data: prop: val, eventArgs: oldValue: initVal value: newVal, eventArgs.path: val|"
		+ "calls: 2, ev.data: prop: val, eventArgs: oldValue: initVal value: newVal, eventArgs.path: val|"
		+ "[{},{},null]",
		'$.observe("my.nmspace", object, path, cb); $.observe("your.nmspace", object, path, cb); $.unobserve("nmspace", object); removes all handlers for "nmspace" no matter what other namespaces where use ("my", "your", for example');

	// ................................ Reset ................................
	$.unobserve(thing);
	thing.val = "initVal"; // reset Prop
	reset();

	// =============================== Arrange ===============================
	var person = {
		name: "Pete",
		address: {
			street: "1st Ave"
		},
		phones: [{ number: "111 111 1111" }, { number: "222 222 2222" }]
	};

	// ................................ Act ..................................
	$.observe("ns", person, "name", myListener);
	$.unobserve("ns", person, "name", myListener);

	// ............................... Assert .................................
	equal(JSON.stringify([$.views.sub._cbBnds, $._data(person).events]), "[{},null]",
		"unobserve using namespaces, with path and handler works");

	// ................................ Act ..................................
	$.observe("ns", person, "name", myListener);
	$.unobserve("ns", person);

	// ............................... Assert .................................
	equal(JSON.stringify([$.views.sub._cbBnds, $._data(person).events]), "[{},null]",
		"unobserve using namespaces, without path and handler works");

	// ................................ Act ..................................
	$.observe("ns", person, "name", "address^street", "phones", myListener);
	$.unobserve("ns", person, "name", "address^street", "phones", myListener);

	// ............................... Assert .................................
	equal(JSON.stringify([$.views.sub._cbBnds, $._data(person).events, $._data(person.address).events, $._data(person.phones).events]), "[{},null,null,null]",
		"unobserve using namespaces, with multiple paths and handler works");

	// ................................ Act ..................................
	$.observe("ns", person.phones, myListener);
	$.unobserve("ns", person.phones);

	// ............................... Assert .................................
	equal(JSON.stringify([$.views.sub._cbBnds, $._data(person.phones).events]), "[{},null]",
		"unobserve using namespaces, for array works");

	// ................................ Act ..................................
	$.observe("ns", person, "name", "address^street", "phones", myListener);
	$.unobserve("ns", person, "*", person.address, "*");

	// ............................... Assert .................................
	equal(JSON.stringify([$.views.sub._cbBnds, $._data(person).events]), "[{},null]",
		"unobserve using namespaces, with deep paths using '*' works");

	$.views.settings.debugMode(false);
});

test("Paths", function() {

	// ................................ Reset ................................
	person1.home = home1;
	address1.street = "StreetOne"; // reset Prop
	address1.ZIP = "111"; // reset Prop
	address2.street = "StreetTwo"; // reset Prop
	address2.ZIP = "222"; // reset Prop
	home2 = { address: address2 };

	// =============================== Arrange ===============================
	var originalAddress = person1.home.address;

	// ................................ Act ..................................
	$.observe(person1, "home^address.street", person1.home.address, "ZIP", myListener);
	$.observable(person1.home.address).setProperty({ street: "newValue", ZIP: "newZip" });

	// ............................... Assert .................................
	ok(result === "calls: 1, ev.data: prop: street, eventArgs: oldValue: StreetOne value: newValue, eventArgs.path: street|"
		+ "calls: 2, ev.data: prop: ZIP, eventArgs: oldValue: 111 value: newZip, eventArgs.path: ZIP|",
	"$.observe(object, some.deep.path, object2, path, cb) is listening to leaf");

	// ................................ Reset ................................
	reset();

	// ................................ Act ..................................
	$.observable(person1).setProperty({ home: home2 }); // Swap object higher in path

	// ............................... Assert .................................
	equal("" + (lastEventArgs.oldValue === home1) + (lastEventArgs.value === home2) + result, "truetruecalls: 1, ev.data: prop: home, path: address^street,"
		+ " eventArgs: oldValue: {\"address\":{\"street\":\"newValue\",\"ZIP\":\"newZip\"}} value: {\"address\":{\"street\":\"StreetTwo\",\"ZIP\":\"222\"}}, eventArgs.path: home|",
	"$.observe(object, some.deep.path, object2, path, cb) is listening to root");

	// ................................ Reset ................................
	reset();

	// ................................ Act ..................................
	$.observable(address1).setProperty({ street: "newValue2", ZIP: "newZip2" });

	// ............................... Assert .................................
	equal(result, "calls: 1, ev.data: prop: ZIP, eventArgs: oldValue: newZip value: newZip2, eventArgs.path: ZIP|",
	"$.observe(object, 'home.address.street', object2, 'ZIP', cb) after swapping higher up on deep path, is no longer listening to original leaf on that path - 'i.e. 'street', but is listening to other paths as before - 'i.e. 'ZIP'");

	// ................................ Reset ................................
	$.observable(address1).setProperty({ street: "Street1", ZIP: "111" }); // reset Prop
	reset();

	// ................................ Act ..................................
	$.observable(address2).setProperty({ street: "newValue2", ZIP: "newZip2" });

	// ............................... Assert .................................
	equal(result, "calls: 1, ev.data: prop: street, eventArgs: oldValue: StreetTwo value: newValue2, eventArgs.path: street|",
	"$.observe(object, 'home.address.street', object2, 'ZIP', cb) after swapping higher up on deep path, is now listening to leaf on new descendant objects - 'i.e. 'street' on 'address2'");

	// ................................ Act ..................................
	$.observable(person1).setProperty("home", null); // Set object higher up on path to null
	$.observable(person1).setProperty("home", home1); // Set object higher up to different object
	reset();

	$.observable(address2).setProperty({ street: "newValue2", ZIP: "newZip2" });
	$.observable(address1).setProperty({ street: "newValue3", ZIP: "newZip3" });

	// ............................... Assert .................................

	equal(result, "calls: 1, ev.data: prop: street, eventArgs: oldValue: Street1 value: newValue3, eventArgs.path: street|"
		+ "calls: 2, ev.data: prop: ZIP, eventArgs: oldValue: 111 value: newZip3, eventArgs.path: ZIP|",
	"$.observe(object, 'home.address.street', object2, 'ZIP', cb) after setting object to null, higher up on deep path, then setting to new object, is no longer listening to that path on original descendant objects but is now listening to the path on new descendant objects");

	// ................................ Reset ................................
	reset();

	// ................................ Act ..................................
	$.observable(person1).setProperty("home", home2); // Set object higher up to different object
	$.observable(home1).setProperty("address", { street: "ignoreThisStreet", ZIP: "ignoreZip" });
	$.observable(home2).setProperty("address", { street: "address3Street", ZIP: "address3Zip" });

	// ............................... Assert .................................
	equal(result,
			"calls: 1, ev.data: prop: home, path: address^street, eventArgs: oldValue: {\"address\":{\"street\":\"newValue3\",\"ZIP\":\"newZip3\"}} value: {\"address\":{\"street\":\"newValue2\",\"ZIP\":\"newZip2\"}}, eventArgs.path: home|"
		+ "calls: 2, ev.data: prop: address, path: street, eventArgs: oldValue: {\"street\":\"newValue2\",\"ZIP\":\"newZip2\"} value: {\"street\":\"address3Street\",\"ZIP\":\"address3Zip\"}, eventArgs.path: address|",
	"$.observe(object, 'home.address.street', object2, 'ZIP', cb) after swapping higher up on deep path, is listening to intermediate paths on new object - 'i.e. 'address'");

	// ................................ Reset ................................
	reset();

	// ................................ Act ..................................
	$.unobserve(person1, "home^address.street", originalAddress, "ZIP", myListener);

	// ............................... Assert .................................
	ok(!$._data(person1).events && !$._data(person1.home.address).events,
	"$.unobserve(object, 'home.address.street', object2, 'ZIP', cb) removes the current listeners from that path");

	// ................................ Reset ................................
	reset();

	$.observe(person1, "home^address.street", person1.home.address, "ZIP", "ZIP", "foo", myListener);
	$.observe(person1.home.address, "street", function() { });

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

	// ................................ Act ..................................
	$.unobserve(person1.home.address, "*", myListener);

	// ............................... Assert .................................
	equal("" + $._data(person1.home.address).events.propertyChange.length, "1",
	'unobserve(object, "*", myListener) removes all handlers on this object for any props, for this callback');

	// ................................ Act ..................................
	$.unobserve(person1.home.address, "*");

	// ............................... Assert .................................
	ok(!$._data(person1.home.address).events,
	'unobserve(object, "*") removes all handlers on this object for any props, for any callback');

	// ................................ Reset ................................
	reset();

	// =============================== Arrange ===============================

	// ................................ Act ..................................
	$.observe(person1.home.address, "*", "ZIP", myListener);

	// ............................... Assert .................................
	equal("" + $._data(person1.home.address).events.propertyChange.length, "1",
	'Add a listener for "*" - avoids duplicates');

	// ................................ Act ..................................
	$.observable(person1.home.address).setProperty({ street: "newValue4", ZIP: "newZip4" });

	// ............................... Assert .................................

	equal(result, "calls: 1, ev.data: prop: *, eventArgs: oldValue: address3Street value: newValue4, eventArgs.path: street|"
							+ "calls: 2, ev.data: prop: *, eventArgs: oldValue: address3Zip value: newZip4, eventArgs.path: ZIP|",
	'listen to both "*" and specific prop. Note: Eliminates duplicates for specific props when there is also a "*"');

	// ................................ Reset ................................
	$.unobserve(person1.home.address, "*");
	person1.home = home1;
	address1.street = "StreetOne"; // reset Prop
	address1.ZIP = "111"; // reset Prop
	address2.street = "StreetTwo"; // reset Prop
	home2 = { address: address2 };
	reset();

	// =============================== Arrange ===============================
	// ................................ Act ..................................
	$.observe(person1, "work^address.street", myListener);
	$.observable(person1).setProperty({ work: home2 });
	$.observable(address2).setProperty({ street: "newAddress2" });

	// ............................... Assert .................................
	equal(result,
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
	ok(!$._data(person1.home.address).events,
	'unobserve(object, "*") removes all handlers on this object for any props, both "*" and specific props, for any callback');

	// ................................ Act ..................................
	$.observe(person1, "fullName", myListener);

	// ............................... Assert .................................
	equal("" + $._data(person1).events.propertyChange.length, "3",
	'Add a listener for computed property');

	// ................................ Act ..................................
	$.observable(person1).setProperty({ firstName: "newFirst", lastName: "newLast" });
	$.observable(settings).setProperty({ title: "Sir" });

	// ............................... Assert .................................
	equal(result, "calls: 1, ev.data: prop: firstName, eventArgs: oldValue: Mr Jo value: Mr newFirst, eventArgs.path: firstName|"
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
	equal(listeners + ". After: "
		+ !$._data(model.person1).events, "Before: 3. After: true",
	'unobserve(object, "computed", cb) removes handlers');

	// ................................ Act ..................................
	$.observe(model, "person1^fullName", myListener);

	// ............................... Assert .................................
	equal("" + $._data(person1).events.propertyChange.length, "3",
	'Add a listener for computed property on a deep path');

	// ................................ Act ..................................
	$.observable(person1).setProperty({ firstName: "newFirst", lastName: "newLast" });

	// ............................... Assert .................................

	equal(result, "calls: 1, ev.data: prop: firstName, eventArgs: oldValue: Sir Jo value: Sir newFirst, eventArgs.path: firstName|"
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
	equal(listeners + ". After: "
		+ !$._data(model).events + " "
		+ !$._data(model.person1).events, "Before: 1 3. After: true true",
	'unobserve(object, "computed", cb) removes handlers');

	// ................................ Act ..................................
	$.observe(model, "person1^fullName", "person1^firstName", "person1^lastName", "person1^firstName", myListener);

	// ............................... Assert .................................
	equal("" + $._data(person1).events.propertyChange.length, "3",
	'Add a listener for computed property on deep path plus redundant computed dependency plus redundant computed prop.');

	// ................................ Act ..................................
	$.observable(person1).setProperty({ firstName: "newFirst", lastName: "newLast" });

	// ............................... Assert .................................
	equal(result, "calls: 1, ev.data: prop: firstName, eventArgs: oldValue: Sir Jo value: Sir newFirst, eventArgs.path: firstName|"
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
	equal(listeners + ". After: "
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

	equal(listeners, "2 1 1 1", 'No duplicate handlers for $.observe(model, "person1", "person2", "person1.*", "person1.home.address^street", "person1^home.address.ZIP", "person1.home^address.*", cb)');

	// ................................ Act ..................................
	$.unobserve(model, "person1", "person2", "person1.*", "person1.home.address^street", "person1^home.address.ZIP", "person1.home^address.*", myListener);

	// ............................... Assert .................................
	equal(!$._data(model).events + " "
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
	equal(handlersCount + "|" + !$._data(model).events + " " + !$._data(model.person1).events + " " + $._data(model.person1.home.address).events.propertyChange.length,
		"true 3 1|true true 1",
	'unobserve(object) removes all observe handlers from object, but does not remove handlers on paths on descendant objects');

	// =============================== Arrange ===============================

	// ................................ Act ..................................
	$.observe(model, "person1^fullName", "person1.address.*", myListener);

	handlersCount = $._data(model).events.propertyChange.length + " " + $._data(model.person1).events.propertyChange.length + " " + $._data(model.person1.home.address).events.propertyChange.length;

	$.observe(model, "person1^fullName", function() { });

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

	// =============================== Arrange ===============================

	// ................................ Act ..................................
	$.observe(person1, "fullName", myListener);
	$.observe(settings, "*", myListener);
	handlersCount = $._data(person1).events.propertyChange.length + $._data(settings).events.propertyChange.length;

	$.unobserve(person1, "*", settings, "*");

	// ............................... Assert .................................
	equal("" + handlersCount + " " + !$._data(person1).events + " " + !$._data(settings).events, "4 true true",
	'unobserve(object1, "*", object2, "*") removes all observe handlers from objects');

	// =============================== Arrange ===============================

	// ................................ Act ..................................
	$.observe(settings, "onFoo", myListener);
	$.observable(settings).setProperty("onFoo", function onfoonew() { return; });
	$.unobserve(settings);

	// ............................... Assert .................................
	equal(!$._data(settings).events && result, "calls: 1, ev.data: prop: onFoo, eventArgs: oldValue: function onFoo1()  value: function onfoonew() , eventArgs.path: onFoo|",
	'Can observe properties of type function');

	// ................................ Reset ................................
	settings.onFoo = "Jo";
	person1.lastName = "One";
	reset();
	$("#result").empty();
	result = "";

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
		};

	function observeCtxHelper(val, currentRoot) {
		if (val) {
			if (val.charAt(0) === "%") {
				return [obj, val.slice(1), currentRoot || {}];
			}
		}
	}

	// ................................ Act ..................................
	$.observe(main, "title", "%name", myListener, observeCtxHelper);
	$.observable(main).setProperty({ title: "newTitle" });
	$.observable(obj).setProperty({ name: "newName" });

	// ............................... Assert .................................
	equal(result, "calls: 1, ev.data: prop: title, eventArgs: oldValue: foo value: newTitle, eventArgs.path: title|"
							+ "calls: 2, ev.data: prop: name, eventArgs: oldValue: One value: newName, eventArgs.path: name|",
	"$.observe(object, path, cb, observeCtxHelper) uses observeCtxHelper correctly to substitute objects and paths");

	// ................................ Act ..................................
	handlersCount = $._data(obj).events.propertyChange.length;
	$.unobserve({}, "%name", myListener, observeCtxHelper);

	// ................................ Reset ................................
	obj.name = "One";

	// ............................... Assert .................................
	ok(handlersCount === 1 && !$._data(obj).events,
	"$.unobserve(object, path, cb, observeCtxHelper) uses observeCtxHelper correctly to substitute objects and paths and unobserve from mapped <objects,paths>");
	reset();

	$.unobserve(main, "title", "%name", myListener, observeCtxHelper);

	// =============================== Arrange ===============================
	// ................................ Act ..................................
	$.observe(str, myListener);
	$.observable(obj).setProperty({ name: "newName" });

	// ............................... Assert .................................
	equal(result, "",
	"$.observe(path, cb): Observe with no root object and no observeCtxHelper does nothing");

	// ................................ Reset ................................
	obj.name = "One";

	// =============================== Arrange ===============================
	// ................................ Act ..................................
	$.observe(str, myListener, observeCtxHelper);
	$.observable(obj).setProperty({ name: "newName" });

	// ............................... Assert .................................
	equal(result, "",
	"$.observe(path, cb): Observe with no root object and with observeCtxHelper does nothing");

	// ................................ Reset ................................
	obj.name = "One";

	// =============================== Arrange ===============================
	// ................................ Act ..................................
	$.observe(null, "%name", myListener, observeCtxHelper);
	$.observable(obj).setProperty({ name: "newName" });

	// ............................... Assert .................................
	equal(result, "calls: 1, ev.data: prop: name, eventArgs: oldValue: One value: newName, eventArgs.path: name|",
	"$.observe(null, path, cb, observeCtxHelper) observe with null as root object can use observeCtxHelper to substitute objects and paths. Correctly observes object(s) mapped by observeCtxHelper");

	// ................................ Act ..................................
	handlersCount = $._data(obj).events.propertyChange.length;
	$.unobserve(null, "%name", myListener, observeCtxHelper);

	// ............................... Assert .................................
	ok(handlersCount === 1 && !$._data(obj).events,
	"$.unobserve(null, path, cb, observeCtxHelper) uses observeCtxHelper correctly to substitute objects and paths and unobserve from mapped <objects,paths>");
	reset();

	// ................................ Reset ................................
	obj.name = "One";

	// =============================== Arrange ===============================
	// ................................ Act ..................................
	$.observe(undefined, "%name", myListener, observeCtxHelper);
	$.observable(obj).setProperty({ name: "newName" });

	// ............................... Assert .................................
	equal(result, "calls: 1, ev.data: prop: name, eventArgs: oldValue: One value: newName, eventArgs.path: name|",
	"$.observe(undefined, path, cb, observeCtxHelper) observe with undefined root object can use observeCtxHelper to substitute objects and paths. Correctly observes object(s) mapped by observeCtxHelper");

	// ................................ Act ..................................
	handlersCount = $._data(obj).events.propertyChange.length;
	$.unobserve(undefined, "%name", myListener, observeCtxHelper);

	// ............................... Assert .................................
	ok(handlersCount === 1 && !$._data(obj).events,
	"$.unobserve(undefined, path, cb, observeCtxHelper) uses observeCtxHelper correctly to substitute objects and paths and unobserve from mapped <objects,paths>");
	reset();

	// ................................ Reset ................................
	obj.name = "One";

	// =============================== Arrange ===============================
	// ................................ Act ..................................
	$.observe(undefined, str, myListener, observeCtxHelper);
	$.observable(obj).setProperty({ name: "newName" });

	// ............................... Assert .................................
	equal(result, "",
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

	$.observable(obj).setProperty({ name: "newName" });

	// ............................... Assert .................................
	equal(result, "",
	"$.observe(foo, path, ...): When first parameter foo is not a string or object, it is skipped");

	// ................................ Reset ................................
	obj.name = "One";

	// =============================== Arrange ===============================
	// ................................ Act ..................................
	$.observe(true, "%name", myListener, observeCtxHelper);
	$.observable(obj).setProperty({ name: "newName" });

	// ............................... Assert .................................
	equal(result, "calls: 1, ev.data: prop: name, eventArgs: oldValue: One value: newName, eventArgs.path: name|",
	"$.observe(foo, path, ...): When first parameter foo is not a string or object, it is skipped");

	// ................................ Act ..................................
	handlersCount = $._data(obj).events.propertyChange.length;
	$.unobserve(true, "%name", myListener, observeCtxHelper);

	// ............................... Assert .................................
	ok(handlersCount === 1 && !$._data(obj).events,
	"$.unobserve(foo, path, ...): When first parameter foo is not a string or object, it is skipped");
	reset();

	// ................................ Reset ................................
	obj.name = "One";

	// =============================== Arrange ===============================
	// ................................ Act ..................................
	$.observe(false, "%name", myListener, observeCtxHelper);
	$.observable(obj).setProperty({ name: "newName" });

	// ............................... Assert .................................
	equal(result, "calls: 1, ev.data: prop: name, eventArgs: oldValue: One value: newName, eventArgs.path: name|",
	"$.observe(foo, path, ...): When first parameter foo is not a string or object, it is skipped");

	// ................................ Act ..................................
	handlersCount = $._data(obj).events.propertyChange.length;
	$.unobserve(false, "%name", myListener, observeCtxHelper);

	// ............................... Assert .................................
	ok(handlersCount === 1 && !$._data(obj).events,
	"$.unobserve(foo, path, ...): When first parameter foo is not a string or object, it is skipped");
	reset();

	// ................................ Reset ................................
	obj.name = "One";

	//TODO test case for observe(domElement, "a.b.c", callback) should not bind at all
});

test("Array", function() {

	$.views.settings.debugMode(); // For using _jsv

	// TODO for V1 or after? >>>>> $.observe(person, "**", changeHandler); // all props and arraychange on all array-type props - over complete object graph of person.
	// TODO for V1 or after? >>>>> $.observe(person.phones, "**", changeHandler); // all props and arraychange on all array-type props over complete object graph of each phone

	// =============================== Arrange ===============================
	// Using the same event handler for arrayChange and propertyChange

	var myArray = [1, 2];

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
		"calls: 1, ev.data: prop: length, eventArgs: oldValue: 4 value: 5, eventArgs.path: length|"
		+ "regularCallbackCalls: 2, eventArgs: change: insert|1 1",
		'$.observe(myArray, "length", myListener) listens to array change on the array and to length propertyChange on the array');

	// ............................... Assert .................................
	equal(result + $._data(myArray).events.arrayChange.length + " " + $._data(myArray).events.propertyChange.length,
		"calls: 1, ev.data: prop: length, eventArgs: oldValue: 4 value: 5, eventArgs.path: length|"
		+ "regularCallbackCalls: 2, eventArgs: change: insert|1 1",
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

	myArray = [1, 2, 3];

	var done = false;
	function listenAndChangeAgain(ev, eventArgs) {
		myListener(ev, eventArgs);
		if (!done && eventArgs.change === "remove") {
			done = true;
			$.observable(myArray).remove();
		}
	}

	$.observe(myArray, "length", listenAndChangeAgain);

	$.observable(myArray).remove(1);

	// ............................... Assert .................................
	equal(result + $._data(myArray).events.arrayChange.length + " " + !$._data(myArray).events.propertyChange,
			"calls: 1, ev.data: prop: length, eventArgs: oldValue: 3 value: 2, eventArgs.path: length|"
			+ "regularCallbackCalls: 2, eventArgs: change: remove|"
			+ "calls: 3, ev.data: prop: length, eventArgs: oldValue: 2 value: 1, eventArgs.path: length|"
			+ "regularCallbackCalls: 4, eventArgs: change: remove|1 false",
		'$.observe(myArray, "length", listenAndChangeAgain) with cascading changes preserves expected order on callbacks for array and array.length change');

	// ................................ Reset ..................................
	$.unobserve(myArray, "length", listenAndChangeAgain);

	// =============================== Arrange ===============================
	reset();

	var initialArray = [1, 2],
			altArray = [4, 3, 2, 1],
			obj = { name: { first: "n", arr: initialArray } };

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
	equal(result, "calls: 1, ev.data: prop: arr, eventArgs: oldValue: [1,2,10] value: [4,3,2,1], eventArgs.path: arr|",
	'$.observe(object, "a.b.myArray", cbWithoutArrayCallback) listens to property change for swapping the array property');

	// ............................... Assert .................................
	reset();
	equal(!$._data(initialArray).events + " " + $._data(altArray).events.arrayChange.length, "true 1",
	'$.observable(obj).setProperty("name.arr", newArray) removes the arrayChange handler on previous array, and adds arrayChange to new array');

	// ................................ Act ..................................
	$.observable(obj.name.arr).insert(11);

	// ............................... Assert .................................
	equal(result, "regularCallbackCalls: 1, eventArgs: change: insert|",
	'$.observe(object, "a.b.myArray", cbWithoutArrayCallback) listens to array changes on leaf array property (regular callback)');

	// ................................ Act ..................................
	handlersCount = $._data(obj.name).events.propertyChange.length + $._data(obj.name.arr).events.arrayChange.length;
	$.unobserve(obj, "name.arr", myListener);

	// ............................... Assert .................................
	ok(handlersCount === 2 && !$._data(obj.name).events && !$._data(obj.name.arr).events,
	'$.unobserve(object, "a.b.myArray") removes both arrayChange and propertyChange event handlers');
	reset();
	$.observe(obj, "name.arr", "name.arr.length", myListener);

	$.observable(obj.name.arr).insert(16);

	// ............................... Assert .................................
	equal(result + $._data(obj.name.arr).events.arrayChange.length + " " + $._data(obj.name.arr).events.propertyChange.length,
		"calls: 1, ev.data: prop: length, eventArgs: oldValue: 5 value: 6, eventArgs.path: length|"
		+ "regularCallbackCalls: 2, eventArgs: change: insert|1 1",
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
		+ "calls: 4, ev.data: prop: *, eventArgs: oldValue: [4,3,2,1,11,16,17,18] value: [1,2,10], eventArgs.path: arr|"
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
	obj = { name: { first: "n", arr: initialArray } };
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
	equal(result + !$._data(obj.name.arr).events + " " + !$._data(newArray1).events + " " + !$._data(newArray1).events + " " + !$._data(newArray1).events, "true true true true",
		'$.unobserve(object, "a.b.*", cbWithoutArrayCallback) removes the propertychange handler and any arraychange handlers');

	// =============================== Arrange ===============================
	// Using an array event handler
	obj = { name: { first: "n", arr: [1, 2] } };

	myListener.array = function(ev, eventArgs) {
		result += "arrayListenerCalls: " + calls
		+ ", eventArgs: change: " + eventArgs.change + "|";
	};

	$.observe(obj, "name.arr", myListener);

	// ................................ Act ..................................
	reset();
	$.observable(obj).setProperty("name.arr", [4, 3, 2, 1]);

	// ............................... Assert .................................
	equal(result, "calls: 1, ev.data: prop: arr, eventArgs: oldValue: [1,2] value: [4,3,2,1], eventArgs.path: arr|",
	'$.observe(object, "a.b.myArray", cbWithArrayCallback) listens to property change for swapping the array property');

	// ................................ Act ..................................
	reset();
	$.observable(obj.name.arr).insert(12);

	// ............................... Assert .................................
	equal(result, "arrayListenerCalls: 0, eventArgs: change: insert|",
	'$.observe(object, "a.b.myArray", cbWithArrayCallback) listens to array changes on leaf array property (array callback handler)');

	// ................................ Act ..................................
	handlersCount = $._data(obj.name.arr).events.arrayChange.length;
	$.unobserve(obj, "name.arr", myListener);

	// ............................... Assert .................................
	ok(handlersCount === 1 && !$._data(obj.name.arr).events,
	'$.unobserve(object, "a.b.myArray") removes arrayChange event handler');

	// =============================== Arrange ===============================
	$.observe(obj.name.arr, myListener);

	// ................................ Act ..................................
	reset();
	$.observable(obj.name.arr).insert(13);

	// ............................... Assert .................................
	equal(result, "arrayListenerCalls: 0, eventArgs: change: insert|",
	'$.observe(myArray, cbWithArrayCallback) listens to array changes (array callback handler)');
	// ................................ Act ..................................
	handlersCount = $._data(obj.name.arr).events.arrayChange.length;
	$.unobserve(obj.name.arr, myListener);

	// ............................... Assert .................................
	ok(handlersCount === 1 && !$._data(obj.name.arr).events,
	'$.unobserve(myArray) removes arrayChange event handler');
	// -----------------------------------------------------------------------

	// =============================== Arrange ===============================
	var people = [1, 2];
	function onch() { }
	function onch2() { }

	// ................................ Act ..................................
	$.observe(people, "length", onch);
	$.observe(people, "length", onch2);
	$.observe(people, "length2", onch);
	$.templates("{^{for people}}{{/for}} {^{:people}}").link("#result", { people: people });
	$.observe(people, "length2", onch2);
	$.unobserve(people, "length2", onch);
	$.unobserve(people, "length2", onch2);
	$("#result").empty();
	$.unobserve(people, "length", onch);
	$.unobserve(people, "length", onch2);

	// ............................... Assert .................................
	equal(JSON.stringify([$.views.sub._cbBnds, _jsv.bindings, $._data(people).events]), "[{},{},null]",
		"observe/unobserve array - API calls in different orders: all bindings removed when content removed from DOM and unobserve called");

	$.views.settings.debugMode(false);
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
		getResult = function(sep) { ret += (sep || "|") + input.val() + "/" + $("#result").text(); };

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
	$.templates('<input data-link="address()^street()" />{^{:address()^street()}}').link("#result", person);

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

	person = new Person("pete", new Address("1st Ave"), [new Phone({ number: "phone1" }), new Phone({ number: "phone2" })]);

	// ................................ Act ..................................
	ret = "";
	$.templates('<input data-link="address()^street()" />{^{:address()^street()}}').link("#result", person);

	var observeAllHandler = function(ev, eventArgs) {
		message += JSON.stringify(eventArgs) + "\n";
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
		"--newAddressChgStreetAfterUnobserve/newAddressChgStreetAfterUnobserve2 2|3 3|3 3|2 2|2 truetrue true|",
		"Paths with computed/getters: address().street() - unobserveAll is successful");

	// =============================== Arrange ===============================

	getResult = function(sep) { ret += (sep || "|") + $("#result").text(); };

	person = new Person("pete", new Address("1st Ave"), [new Phone({ number: "phone1" }), new Phone({ number: "phone2" })]);

	// ................................ Act ..................................
	ret = "";
	$.templates('{^{for phones()}}{^{:number()}},{{/for}}').link("#result", person);

	getResult("\nInit>>");
	$.observable(person.phones()).insert(new Phone({ number: "insertedPhone" }));
	getResult("insert:");
	$.observable(person.phones()).remove(0);
	getResult("remove:");
	$.observable(person.phones()).refresh([new Phone({ number: "replacedPhone1" }), new Phone({ number: "replacedPhone2" })]);
	getResult("refresh:");
	$.observable(person.phones()).insert(1, [new Phone({ number: "insertedPhone3a" }), new Phone({ number: "insertedPhone3b" })]);
	getResult("insert:");
	$.observable(person.phones()).move(1, 3, 2);
	getResult(" move:");
	$.observable(person).setProperty("phones", [new Phone({ number: "replacedPhone1" })]);
	getResult("\nSet>>");
	$.observable(person.phones()).insert(new Phone({ number: "insertedPhoneX" }));
	getResult("insert:");
	$.observable(person.phones()).remove(0);
	getResult("remove:");
	$.observable(person.phones()).refresh([new Phone({ number: "replacedPhoneX1" }), new Phone({ number: "replacedPhoneX2" })]);
	getResult("refresh:");
	$.observable(person.phones()).insert(1, [new Phone({ number: "insertedPhoneX3a" }), new Phone({ number: "insertedPhoneX3b" })]);
	getResult("insert:");
	$.observable(person.phones()).move(1, 3, 2);
	getResult("move:");
	$.observable(person).setProperty("phones", []);
	getResult("\nsetEmpty>>");
	$.observable(person.phones()).insert(new Phone({ number: "insertedPhoneY" }));
	getResult("insert:");

	$("#result").empty();

	// ............................... Assert .................................
	equal(ret, "\nInit>>phone1,phone2,insert:phone1,phone2,insertedPhone,remove:phone2,insertedPhone,refresh:replacedPhone1,replacedPhone2,insert:replacedPhone1,insertedPhone3a,insertedPhone3b,replacedPhone2, move:replacedPhone1,replacedPhone2,insertedPhone3a,insertedPhone3b,\
\nSet>>replacedPhone1,insert:replacedPhone1,insertedPhoneX,remove:insertedPhoneX,refresh:replacedPhoneX1,replacedPhoneX2,insert:replacedPhoneX1,insertedPhoneX3a,insertedPhoneX3b,replacedPhoneX2,move:replacedPhoneX1,replacedPhoneX2,insertedPhoneX3a,insertedPhoneX3b,\
\nsetEmpty>>insert:insertedPhoneY,",
		"Array operations with getters allow complete functionality, and track the modified tree at all times");
	// =============================== Arrange ===============================

	person = new Person("pete", new Address("1st Ave"), [new Phone({ number: "phone1" }), new Phone({ number: "phone2" })]);

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

	$.observable(person.phones()).insert(new Phone({ number: "insertedPhone" }));
	$.observable(person.phones()).remove(0);
	$.observable(person.phones()).refresh([new Phone({ number: "replacedPhone1" }), new Phone({ number: "replacedPhone2" })]);
	$.observable(person.phones()).insert(1, [new Phone({ number: "insertedPhone3a" }), new Phone({ number: "insertedPhone3b" })]);
	$.observable(person.phones()).move(1, 3, 2);
	$.observable(person).setProperty("phones", [new Phone({ number: "replacedPhone1" })]);
	$.observable(person.phones()).insert(new Phone({ number: "insertedPhoneX" }));
	$.observable(person.phones()).remove(0);
	$.observable(person.phones()).refresh([new Phone({ number: "replacedPhoneX1" }), new Phone({ number: "replacedPhoneX2" })]);
	$.observable(person.phones()).insert(1, [new Phone({ number: "insertedPhoneX3a" }), new Phone({ number: "insertedPhoneX3b" })]);
	$.observable(person.phones()).move(1, 3, 2);
	$.observable(person).setProperty("phones", []);
	$.observable(person.phones()).insert(new Phone({ number: "insertedPhoneY" }));
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

	$.observable(person.phones()).insert(new Phone({ number: "insertedPhoneZ" }));
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

module("API - Settings");

test("Settings, error handlers, onError", function() {
	$.views.settings.debugMode();

	// ................................ Act ..................................
	$.views.settings.delimiters("@%", "%@");
	var result = $.templates("A_@%if true%@yes@%/if%@_B").render();
	$.views.settings.delimiters("{{", "}}");
	result += "|" + $.templates("A_{{if true}}YES{{/if}}_B").render();

	// ............................... Assert .................................
	equal(result, "A_yes_B|A_YES_B", "Custom delimiters with render()");

	// ................................ Act ..................................
	var app = { choose: true, name: "Jo" };
	$.views.settings.delimiters("_^", "^_", "*");
	$.templates('_*^if choose^_<div data-link="name"></div>_^else^_no<div data-link="name+2"></div>_^/if^_').link("#result", app);
	result = $("#result").text();
	$.observable(app).setProperty({ choose: false, name: "other" });
	result += "|" + $("#result").text();
	$.views.settings.delimiters("{{", "}}", "^");
	$.templates('{^{if choose}}<div data-link="name"></div>{{else}}NO<div data-link="name+2"></div>{{/if}}').link("#result", app);
	result += "|" + $("#result").text();

	// ............................... Assert .................................
	equal(result, "Jo|noother2|NOother2", "Custom delimiters with link()");

	// =============================== Arrange ===============================
	app = { choose: true, name: "Jo", onerr: "invalid'Jo'" };
	result = "";
	var oldOnError = $.views.settings.onError;

	$.views.settings({
		onError: function(e, view, fallback) {
			// Can override using $.views.settings({onError: function(...) {...}});
			if (view) { // Render error - can return rendered string or ""
				if (fallback !== undefined) {
					return $.isFunction(fallback) ? fallback(e, view) : 'Fallback: <<' + fallback + '>>';
				}
				return $.views.settings._dbgMode ? "{\n<<MyError>>: '" + e.message + "'\nstack: " + e.stack + "\ntemplate: " + view.tmpl.markup + "\n}" : "";
			}
			// return e; // Thrown error: can leave to be thrown unchanged, or can throw new Error, with modified message, etc.
			throw new Error("<<" + e + ">>: override thrown error");
		}
	});

	// ................................ Act ..................................
	$.templates('{{:missing.willThrow}}').link("#result", app);
	result = $("#result").text();

	// ............................... Assert .................................
	equal(result.slice(0, 14),
		isIE8 ? "{ <<MyError>>:"
			: "{\n<<MyError>>:", "Override onError() - with link()");

	// ................................ Act ..................................
	try {
		$.templates('{{if}}').link("#result", app);
	}
	catch (e) {
		result = e.message;
	}

	// ............................... Assert .................................
	equal(result, '<<Syntax error\nUnmatched or missing {{/if}}, in template:\n{{if}}>>: override thrown error', "Override thrown error - with link()");

	// ................................ Act ..................................
	$.templates('{{:missing.willThrow onError=onerr}} {^{if missing.willThrow onError=onerr + \' (in if tag)\'}}inside{{/if}}<span data-link="missing.willThrow onError=onerr + \' (in data-link)\'"></span>').link("#result", app);
	result = $("#result").text();

	// ............................... Assert .................................
	equal(result, "Fallback: <<invalid'Jo'>> Fallback: <<invalid'Jo' (in if tag)>>Fallback: <<invalid'Jo' (in data-link)>>", "onError fallback in tags and in data-link expression, with override onError()");

	// ................................ Act ..................................
	$.templates('{{:missing.willThrow onError=~myErrFn}} {^{if missing.willThrow onError=~myErrFn}}inside{{/if}}<span data-link="missing.willThrow onError=~myErrFn"></span>').link("#result", app, {
		myErrFn: function(e, view) {
			return "myErrFn for <" + view.data.name + ">";
		}
	});
	result = $("#result").text();

	// ............................... Assert .................................
	equal(result, "myErrFn for <Jo> myErrFn for <Jo>myErrFn for <Jo>", "onError handler in tags and in data-link expression, with override onError()");

	// ................................ Reset ..................................
	$("#result").empty();
	$.views.settings({
		onError: oldOnError
	});

	$.views.settings.debugMode(false);
});

module("API - Declarations");

test("Template encapsulation", function() {

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
	$.link.myTmpl7("#result", { people: people, first: false });

	// ............................... Assert .................................
	equal($("#result").text(), "NoisFooTwoOne", "Can access tag and helper resources from a nested context (i.e. inside {{if}} block)");

	// ............................... Reset .................................
	$("#result").empty();
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

	// =============================== Arrange ===============================

	var data = [];

	$.templates("").link("#result", data);

	// ................................ Act ..................................
	view = $.view("#result", true);

	// ............................... Assert .................................
	ok(view.data === data && view.type === "array",
		'If elem is a container for a rendered array, and the array is empty, $.view(elem, true) returns the array view (even though the element is empty)');

	// ................................ Act ..................................
	var itemView = $.view("#result", true, "item");

	// ............................... Assert .................................
	ok(!itemView,
		'If elem is a container for a rendered array, and the array is empty, $.view(elem, true, "item") returns nothing');

	// =============================== Arrange ===============================

	data = [1];

	$.templates("").link("#result", data);

	// ................................ Act ..................................
	view = $.view("#result", true);

	// ............................... Assert .................................
	ok(view.data === data && view.type === "array",
		'If elem is a container for a rendered array rendering nothing, and the array is not empty, $.view(elem, true) returns the array view (even though the container element is empty)');

	// ................................ Act ..................................
	itemView = $.view("#result", true, "item");

	// ............................... Assert .................................
	ok(itemView.index === 0,
		'If elem is a container for a rendered array rendering nothing, and the array is not empty, $.view(elem, true, "item") returns the item view (even though the container element is empty)');

	// =============================== Arrange ===============================

	data = { people: [] };

	$.templates("<div>{{for people}}{{/for}}</div>").link("#result", data);

	// ................................ Act ..................................
	view = $.view("#result div", true);

	// ............................... Assert .................................
	ok(view.data === data.people && view.type === "array",
		'If elem is a container for a rendered array, and the array is empty, $.view(elem, true) returns the array view (even though the element is empty)');

	// ................................ Act ..................................
	itemView = $.view("#result div", true, "item");

	// ............................... Assert .................................
	ok(!itemView,
		'If elem is a container for a rendered array, and the array is empty, $.view(elem, true, "item") returns nothing');

	// =============================== Arrange ===============================

	data = { people: [1] };

	$.templates("<div>{{for people}}{{/for}}</div>").link("#result", data);

	// ................................ Act ..................................
	view = $.view("#result div", true);

	// ............................... Assert .................................
	ok(view.data === data.people && view.type === "array",
		'If elem is a container for a rendered array rendering nothing, and the array is not empty, $.view(elem, true) returns the array view (even though the container element is empty)');

	// ................................ Act ..................................
	itemView = $.view("#result div", true, "item");

	// ............................... Assert .................................
	ok(itemView.index === 0,
		'If elem is a container for a rendered array rendering nothing, and the array is not empty, $.view(elem, true, "item") returns the item view (even though the container element is empty)');

	// ............................... Reset .................................
	$("#result").empty();
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

	// ............................... Reset .................................
	$("#result").empty();
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

	// =============================== Arrange ===============================

	var data = [];

	$("#result").html("<ul></ul>");

	$.templates("").link("#result ul", data);

	// ................................ Act ..................................
	view = $.view("#result ul", true);

	// ............................... Assert .................................
	ok(view.data === data && view.type === "array",
		'If elem is a container for a rendered array, and the array is empty, $.view(elem, true) returns the array view (even though the element is empty)');

	// ................................ Act ..................................
	var itemView = $.view("#result ul", true, "item");

	// ............................... Assert .................................
	ok(!itemView,
		'If elem is a container for a rendered array, and the array is empty, $.view(elem, true, "item") returns nothing');

	// =============================== Arrange ===============================

	data = [1];

	$("#result").html("<ul></ul>");

	$.templates("").link("#result ul", data);

	// ................................ Act ..................................
	view = $.view("#result ul", true);

	// ............................... Assert .................................
	ok(view.data === data && view.type === "array",
		'If elem is a container for a rendered array rendering nothing, and the array is not empty, $.view(elem, true) returns the array view (even though the container element is empty)');

	// ................................ Act ..................................
	itemView = $.view("#result ul", true, "item");

	// ............................... Assert .................................
	ok(itemView.index === 0,
		'If elem is a container for a rendered array rendering nothing, and the array is not empty, $.view(elem, true, "item") returns the item view (even though the container element is empty)');

	// =============================== Arrange ===============================

	data = { people: [] };

	$.templates("<ul>{{for people}}{{/for}}</ul>").link("#result", data);

	// ................................ Act ..................................
	view = $.view("#result ul", true);

	// ............................... Assert .................................
	ok(view.data === data.people && view.type === "array",
		'If elem is a container for a rendered array, and the array is empty, $.view(elem, true) returns the array view (even though the element is empty)');

	// ................................ Act ..................................
	itemView = $.view("#result ul", true, "item");

	// ............................... Assert .................................
	ok(!itemView,
		'If elem is a container for a rendered array, and the array is empty, $.view(elem, true, "item") returns nothing');

	// =============================== Arrange ===============================

	data = { people: [1] };

	$.templates("<ul>{{for people}}{{/for}}</ul>").link("#result", data);

	// ................................ Act ..................................
	view = $.view("#result ul", true);

	// ............................... Assert .................................
	ok(view.data === data.people && view.type === "array",
		'If elem is a container for a rendered array rendering nothing, and the array is not empty, $.view(elem, true) returns the array view (even though the container element is empty)');

	// ................................ Act ..................................
	itemView = $.view("#result ul", true, "item");

	// ............................... Assert .................................
	ok(itemView.index === 0,
		'If elem is a container for a rendered array rendering nothing, and the array is not empty, $.view(elem, true, "item") returns the item view (even though the container element is empty)');

	// ............................... Reset .................................
	$("#result").empty();
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

	// ............................... Reset .................................
	$("#result").empty();
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
	ok(tags.length === 4
		&& tags[0].tagName === "myWrap" && tags[0].tagCtx.props.val === 1 && tags[0].tagCtx.view.getIndex() === 0 &&
		tags[1].tagName === "myWrap" && tags[1].tagCtx.props.val === 2 && tags[1].tagCtx.view.getIndex() === 0,
		tags[2].tagName === "mySimpleWrap",
		tags[3].tagName === "myWrap2",
		'view.childTags() returns top-level bound tags within the view, and skips any unbound tags');

	// ................................ Act ..................................
	tags = view1.childTags(true);

	// ............................... Assert .................................
	ok(tags.length === 8
		&& tags[0].tagName === "myWrap"
		&& tags[1].tagName === "myWrap2"
		&& tags[2].tagName === "myWrap2"
		&& tags[3].tagName === "myWrap"
		&& tags[4].tagName === "mySimpleWrap"
		&& tags[5].tagName === "mySimpleWrap"
		&& tags[6].tagName === "myWrap2"
		&& tags[7].tagName === "myWrap2"
		&& tags[0].tagCtx.props.val === 1 && tags[0].tagCtx.view.getIndex() === 0,
		'view.childTags(true) returns all tags within the view - in document order');

	// ................................ Act ..................................
	tags = view1.childTags("myWrap");

	// ............................... Assert .................................
	ok(tags.length === 2 && tags[0].tagName === "myWrap" && tags[1].tagName === "myWrap" && tags[0].tagCtx.props.val === 1 && tags[0].tagCtx.view.getIndex() === 0,
		'view.childTags("myTagName") returns all top-level tags of the given name within the view - in document order');

	// ................................ Act ..................................
	tags = view1.childTags(true, "myWrap2");

	// ............................... Assert .................................
	ok(tags.length === 4
		&& tags[0].tagName === "myWrap2"
		&& tags[1].tagName === "myWrap2"
		&& tags[2].tagName === "myWrap2"
		&& tags[3].tagName === "myWrap2"
		&& tags[0].tagCtx.view.getIndex() === 0,
		'view.childTags(true, "myTagName") returns all tags of the given name within the view - in document order');

	// ................................ Act ..................................
	tags = view1.childTags("myWrap2");

	// ............................... Assert .................................
	ok(tags.length === 1
		&& tags[0].tagName === "myWrap2",
		'view.childTags(true, "myTagName") returns all tags of the given name within the view - in document order');

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

	// ............................... Reset .................................
	$("#result").empty();
});

test("view.childTags() in element-only content", function() {

	// =============================== Arrange ===============================
	$.link.boundTmplHierarchyElCnt("#result", topData);

	var tags,
		view1 = $.view("#result", true, "item");

	// ................................ Act ..................................
	tags = view1.childTags();

	// ............................... Assert .................................
	ok(tags.length === 4 && tags[0].tagName === "myWrapElCnt" && tags[0].tagCtx.props.val === 1 && tags[0].tagCtx.view.getIndex() === 0
		&& tags[1].tagName === "myWrapElCnt" && tags[1].tagCtx.props.val === 2 && tags[1].tagCtx.view.getIndex() === 0
		&& tags[2].tagName === "mySimpleWrap" && tags[2].tagCtx.props.val === 5 && tags[2].tagCtx.view.getIndex() === 0,
		'In element-only content, view.childTags() returns top-level bound non-flow tags within the view, and skips any unbound tags');

	// ................................ Act ..................................
	tags = view1.childTags(true);

	// ............................... Assert .................................
	ok(tags.length === 9
		&& tags[0].tagName === "myWrapElCnt"
		&& tags[1].tagName === "myWrap2ElCnt"
		&& tags[2].tagName === "mySimpleWrap"
		&& tags[3].tagName === "myWrap2ElCnt"
		&& tags[4].tagName === "myWrapElCnt"
		&& tags[5].tagName === "mySimpleWrap"
		&& tags[6].tagName === "mySimpleWrap"
		&& tags[7].tagName === "myWrap2"
		&& tags[8].tagName === "myWrap2ElCnt"
		&& tags[0].tagCtx.props.val === 1 && tags[0].tagCtx.view.getIndex() === 0,
		'In element-only content, view.childTags(true) returns all bound non-flow tags within the view - in document order');

	// ................................ Act ..................................
	tags = view1.childTags("myWrapElCnt");

	// ............................... Assert .................................
	ok(tags.length === 2 && tags[0].tagName === "myWrapElCnt" && tags[1].tagName === "myWrapElCnt" && tags[0].tagCtx.props.val === 1 && tags[0].tagCtx.view.getIndex() === 0,
		'In element-only content, view.childTags("myTagName") returns all top-level bound tags of the given name within the view - in document order');

	// ................................ Act ..................................
	tags = view1.childTags(true, "myWrap2ElCnt");

	// ............................... Assert .................................
	ok(tags.length === 3
		&& tags[0].tagName === "myWrap2ElCnt"
		&& tags[1].tagName === "myWrap2ElCnt"
		&& tags[1].tagName === "myWrap2ElCnt"
		&& tags[0].tagCtx.view.getIndex() === 0,
		'In element-only content, view.childTags(true, "myTagName") returns all bound tags of the given name within the view - in document order');

	// ................................ Act ..................................
	tags = view1.childTags(true, "myFlow");

	// ............................... Assert .................................
	ok(tags.length === 2
		&& tags[0].tagName === "myFlow"
		&& tags[1].tagName === "myFlow"
		&& tags[1].tagCtx.view.getIndex() === 0,
		'In element-only content, view.childTags(true, "myFlow") for a flow tag returns all bound tags of the given name within the view - in document order');

	// ................................ Act ..................................
	tags = view1.childTags(true, "if");

	// ............................... Assert .................................
	ok(tags.length === 1
		&& tags[0].tagName === "if"
		&& tags[0].tagCtx.view.getIndex() === 0,
		'In element-only content, view.childTags(true, "if") for a flow tag ("if" in this case) returns all bound tags of the given name within the view - in document order');

	// ................................ Act ..................................
	tags = view1.childTags("myWrap2ElCnt");

	// ............................... Assert .................................
	ok(tags.length === 1, 'In element-only content, view.childTags("myTagName") returns all top-level tags of the given name within the view - in document order');

	// ................................ Act ..................................
	tags = view1.get(true, "myWrapElCnt").childTags(); // Get first myWrapElCnt view and look for its top-level child tags

	// ............................... Assert .................................
	ok(tags.length === 2 && tags[0].tagName === "myWrap2ElCnt" && tags[1].tagName === "myWrap2ElCnt" && tags[1].tagCtx.view.getIndex() === 0,
		'view.childTags() returns top-level bound child tags, and skips any unbound tags');

	// ................................ Act ..................................
	tags = view1.get(true, "myWrapElCnt").childTags(true); // Get first myWrapElCnt view and look for descendant tags

	// ............................... Assert .................................
	ok(tags.length === 3 && tags[0].tagName === "myWrap2ElCnt" && tags[1].tagName === "mySimpleWrap" && tags[2].tagName === "myWrap2ElCnt",
		'view.childTags(true) returns descendant tags, and skips any unbound tags');

	// ................................ Act ..................................
	tags = view1.childTags("myWrapElCnt")[0].childTags(); // Get first myWrapElCnt tag and look for its top-level child tags

	// ............................... Assert .................................
	ok(tags.length === 2 && tags[0].tagName === "myWrap2ElCnt" && tags[1].tagName === "myWrap2ElCnt" && tags[1].tagCtx.view.getIndex() === 0,
		'tag.childTags() returns top-level bound child tags, and skips any unbound tags');

	// ................................ Act ..................................
	tags = view1.childTags("myWrapElCnt")[0].childTags(true); // Get first myWrapElCnt tag and look for descendant tags

	// ............................... Assert .................................
	ok(tags.length === 3 && tags[0].tagName === "myWrap2ElCnt" && tags[1].tagName === "mySimpleWrap" && tags[2].tagName === "myWrap2ElCnt",
		'tag.childTags(true) returns descendant tags, and skips any unbound tags');

	// ................................ Act ..................................
	tags = view1.childTags("mySimpleWrap")[0].childTags(); // Get first mySimpleWrap tag and look for its top-level child tags

	// ............................... Assert .................................
	ok(tags.length === 1 && tags[0].tagName === "mySimpleWrap",
		'tag.childTags() returns top-level bound child tags, and skips any unbound tags');

	// ................................ Act ..................................
	tags = view1.childTags("mySimpleWrap")[0].childTags(true); // Get first mySimpleWrap tag and look for descendant tags

	// ............................... Assert .................................
	ok(tags.length === 2 && tags[0].tagName === "mySimpleWrap" && tags[1].tagName === "myWrap2",
		'tag.childTags(true) returns descendant tags, and skips any unbound tags');

	// ................................ Act ..................................
	tags = view1.childTags("mySimpleWrap")[0].childTags(true, "myWrap2"); // Get first mySimpleWrap tag and look for descendant tags of type "myWrap2"

	// ............................... Assert .................................
	ok(tags.length === 1 && tags[0].tagName === "myWrap2",
		'tag.childTags(true, "myTagName") returns descendant tags of chosen name, and skips any unbound tags');

	// =============================== Arrange ===============================
	$.templates("<table><tbody>{^{for row}}<tr>{^{mySimpleWrap/}}</tr>{{/for}}</tbody></table>").link("#result", { row: {} });

	// ................................ Act ..................................
	var tag = $("#result tr").view().childTags()[0];

	// ............................... Assert .................................
	ok(tag.tagName === "mySimpleWrap",
		'childTags() correctly finds tag which has no output and renders within element contet, inside another tag also in element content');

	// ............................... Reset .................................
	$("#result").empty();
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

	// ............................... Reset .................................
	$("#result").empty();
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
	equal($("#result div").html(), isIE8 ? " beforerender after" : " before render after", 'A data-linked tag control allows setting of content on the data-linked element during render, onBeforeLink and onAfterLink');

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
	equal($("#result div").html(), " init before after", 'A data-linked tag control which does not render allows setting of content on the data-linked element during init, onBeforeLink and onAfterLink');

	// ............................... Reset .................................
	$("#result").empty();
	//TODO: Add tests for attaching jQuery UI widgets or similar to tag controls, using data-link and {^{myTag}} inline data binding.
});

test('two-way bound tag controls', function() {
	// =============================== Arrange ===============================
	var person = { name: "Jo" };

	cancelChange = false;
	noRenderOnUpdate = true;
	renders = false;
	eventData = "";

	//TODO add tests for convert and convertBack declared on tag def or on tag instance and declared dependencies on tag and/or convert - either arrays or functions.
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

	$.observable(person).setProperty({ name: "newName" });
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

	$.observable(person).setProperty({ name: "newName2" });
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

	$.observable(person).setProperty({ name: "newName3" });
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
	'Data link using: <input data-link="{twoWayTag name convert=\'myupper\'}"/> - (tag.convert setting) - initial linking: converts the value on the target input');

	// ................................ Act ..................................
	$.observable(person).setProperty({ name: "ANewName" });

	// ............................... Assert .................................
	equal(linkedEl.value + "|" + tag.value,
	"ANEWNAME|ANewName",
	'Data link using: <input data-link="{twoWayTag name convert=\'myupper\'}"/> - (tag.convert setting) - on data change: converts the value on the target input');

	// ................................ Act ..................................
	linkedEl.value = "ChangeTheName";
	$(linkedEl).change();

	// ............................... Assert .................................
	equal(person.name + "|" + tag.value,
	"changethename|changethename",
	'Data link using: <input data-link="{twoWayTag name convertBack=~lower}"/> - (tag.convertBack setting) on element change: converts the data, and sets on data');

	// ................................ Reset ..................................
	$("#result").empty();
	person.name = "Jo";
	cancelChange = false;
	noRenderOnUpdate = true;
	renders = false;
	eventData = "";

	// =============================== Arrange ===============================

	var lower = function(val) {
		return val.toLowerCase();
	},
		upper = function(val) {
			return val.toUpperCase();
		},
		options = { cvt: upper };

	// ................................ Act ..................................
	$.templates({
		markup: '<input id="linkedEl" data-link="{twoWayTag name ^convert=~options.cvt}"/>',
		converters: {
			myupper: function(val) {
				return val.toUpperCase();
			}
		}
	}).link("#result", person, { options: options });

	tag = $("#result").view(true).childTags("twoWayTag")[0];
	linkedEl = $("#linkedEl")[0];

	// ............................... Assert .................................
	equal(linkedEl.value + "|" + tag.value,
	"JO|Jo",
	'Data link using: <input data-link="{twoWayTag name ^convert=~options.cvt}"/> - converter specified by data-linked convert property');

	// ................................ Act ..................................
	$.observable(options).setProperty({ cvt: lower });
	$.observable(person).setProperty({ name: "ANewName" });

	// ............................... Assert .................................
	equal(linkedEl.value + "|" + tag.value,
	"anewname|ANewName",
	'Data link using: <input data-link="{twoWayTag name ^convert=~options.cvt}"/> - data-linked swapping of converter from one function to another');

	// ................................ Act ..................................
	$.observable(options).setProperty({ cvt: "myupper" });

	// ............................... Assert .................................
	equal(linkedEl.value + "|" + tag.value,
	"ANEWNAME|ANewName",
	'Data link using: <input data-link="{twoWayTag name ^convert=~options.cvt}"/> - data-linked swapping of converter from function to named converter');

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

	$.observable(person).setProperty({ name: "newName" });
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

	$.observable(person).setProperty({ name: "newName2" });

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

	$.observable(person).setProperty({ name: "newName3" });
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
	'Data link using: {^{twoWayTag name convert=\'myupper\'}} - (tag.convert setting) - initial linking: converts the value on the target input');

	// ................................ Act ..................................
	$.observable(person).setProperty({ name: "ANewName" });

	// ............................... Assert .................................
	equal(linkedEl.value + "|" + tag.value,
	"ANEWNAME|ANewName",
	'Data link using: {^{twoWayTag name convert=\'myupper\'}} - (tag.convert setting) - on data change: converts the value on the target input');

	// ................................ Act ..................................
	linkedEl = $("#linkedEl")[0];
	linkedEl.value = "ChangeTheName";
	$(linkedEl).change();

	// ............................... Assert .................................
	equal(person.name + "|" + tag.value,
	"changethename|changethename",
	'Data link using: {^{twoWayTag name convertBack=~lower}} - (tag.convertBack setting) on element change: converts the data, and sets on data');

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

	$.observable(person).setProperty({ name: "newName" });
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

	$.observable(person).setProperty({ name: "newName2" });
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

	$.observable(person).setProperty({ name: "newName3" });
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
	'Data link using: {^{twoWayTag name convert="myupper"/}} - (tag.convert setting) - initial linking: converts the value on the target input');

	// ................................ Act ..................................
	$.observable(person).setProperty({ name: "ANewName" });

	// ............................... Assert .................................
	equal(tag.linkedElem[0].value + "|" + tag.value,
	"ANEWNAME|ANewName",
	'Data link using: {^{twoWayTag name convert="myupper"/}} - (tag.convert setting) - on data change: converts the value on the target input');

	// ................................ Act ..................................
	tag.linkedElem[0].value = "ChangeTheName";
	tag.linkedElem.change();

	// ............................... Assert .................................
	equal(person.name + "|" + tag.value,
	"changethename|changethename",
	'Data link using: {^{twoWayTag name convertBack=~lower/}} - (tag.convertBack setting) on element change: converts the data, and sets on data');

	// =============================== Arrange ===============================
	var res = "";

	$.templates('{^{twoWayTag name trigger="keydown mouseup"/}}').link("#result", person);

	var linkedElem = $("#result input")[0],
		events = $._data(linkedElem).events,
		handlers = "|" + events.mouseup.length + events.keydown.length;

	tag = $("#result").view(true).childTags("twoWayTag")[0];

	$.observable(person).setProperty({ name: "FirstName" });

	handlers += "|" + events.mouseup.length + events.keydown.length;

	// ................................ Act ..................................
	res += " 1: " + person.name + "|" + tag.value;

	tag.linkedElem[0].value = "SecondName";

	tag.linkedElem.keydown();

	res += " 2: " + person.name + "|" + tag.value;

	tag.linkedElem[0].value = "ThirdName";

	tag.linkedElem.mouseup();

	res += " 3: " + person.name + "|" + tag.value;

	tag.linkedElem[0].value = "FourthName";

	tag.linkedElem.change();

	res += " 4: " + person.name + "|" + tag.value;

	handlers += "|" + events.mouseup.length + events.keydown.length;

	// ............................... Assert .................................
	equal(res,
	" 1: FirstName|FirstName 2: SecondName|SecondName 3: ThirdName|ThirdName 4: FourthName|FourthName",
	'Data link using: {^{twoWayTag name trigger="event1 event2"/}} triggers on specified events');

	// ............................... Assert .................................
	equal(handlers,
	"|11|11|11",
	'Data link using: {^{twoWayTag name trigger="event1 event2"/}} has no duplicate handlers after relinking');

	// ................................ Act ..................................
	$.unlink(true, "#result");

	// ............................... Assert .................................
	ok($._data(linkedElem).events === undefined,
	'Data link using: {^{twoWayTag name trigger="event1 event2"/}}: handlers are removed by $.unlink(true, container)');

	// =============================== Arrange ===============================
	res = "";

	$.templates('<input data-link=\'name trigger="keydown mouseup"\' />').link("#result", person);

	linkedElem = $("#result input")[0];

	events = $._data(linkedElem).events;
	handlers = "|" + events.mouseup.length + events.keydown.length;

	$.observable(person).setProperty({ name: "FirstName" });

	handlers += "|" + events.mouseup.length + events.keydown.length;

	// ................................ Act ..................................
	res += " 1: " + person.name;

	linkedElem.value = "SecondName";

	$(linkedElem).keydown();

	res += " 2: " + person.name;

	linkedElem.value = "ThirdName";

	$(linkedElem).mouseup();

	res += " 3: " + person.name;

	linkedElem.value = "FourthName";

	$(linkedElem).change();

	res += " 4: " + person.name;

	handlers += "|" + events.mouseup.length + events.keydown.length;

	// ............................... Assert .................................
	equal(res,
	" 1: FirstName 2: SecondName 3: ThirdName 4: FourthName",
	'Data link using: <input data-link=\'name trigger="event1 event2"\' /> triggers on specified events');

	// ............................... Assert .................................
	equal(handlers,
	"|11|11|11",
	'Data link using: <input data-link=\'name trigger="event1 event2"\' /> has no duplicate handlers after relinking');

	// ................................ Act ..................................
	$.unlink(true, "#result");

	// ............................... Assert .................................
	ok($._data(linkedElem).events === undefined,
	'Data link using: <input data-link=\'name trigger="event1 event2"\' />: handlers are removed by $.unlink(true, container)');

	// =============================== Arrange ===============================
	res = "";

	$.templates('<div contenteditable="true" data-link=\'name trigger="keydown mouseup"\'>some content</div>').link("#result", person);

	linkedElem = $("#result div")[0];

	events = $._data(linkedElem).events;
	handlers = "|" + events.mouseup.length + events.keydown.length;

	$.observable(person).setProperty({ name: "First <b>Name</b>" });

	handlers += "|" + events.mouseup.length + events.keydown.length;

	// ................................ Act ..................................
	res += " 1: " + person.name;

	linkedElem.innerHTML = "Second <b>Name2</b>";

	$(linkedElem).keydown();

	res += " 2: " + person.name;

	linkedElem.innerHTML = "Third <b>Name3</b>";

	$(linkedElem).mouseup();

	res += " 3: " + person.name;

	linkedElem.innerHTML = "Fourth <b>Name4</b>";

	$(linkedElem).change();

	res += " 4: " + person.name;

	handlers += "|" + events.mouseup.length + events.keydown.length;

	// ............................... Assert .................................
	equal(res,
	isIE8 ? " 1: First <b>Name</b> 2: Second <B>Name2</B> 3: Third <B>Name3</B> 4: Fourth <B>Name4</B>"
		: " 1: First <b>Name</b> 2: Second <b>Name2</b> 3: Third <b>Name3</b> 4: Fourth <b>Name4</b>",
	'Data link using: <div contenteditable=true data-link=\'name trigger="event1 event2"\'> triggers on specified events');

	// ............................... Assert .................................
	equal(handlers,
	"|11|11|11",
	'Data link using: <div contenteditable=true data-link=\'name trigger="event1 event2"\'> has no duplicate handlers after relinking');

	// ................................ Act ..................................
	$.unlink(true, "#result");

	// ............................... Assert .................................
	ok($._data(linkedElem).events === undefined,
	'Data link using: <div contenteditable=true data-link=\'name trigger="event1 event2"\'>: handlers are removed by $.unlink(true, container)');

	// =============================== Arrange ===============================
	res = "";
	$("#result").html('<input data-link=\'name trigger="keydown mouseup"\' />');

	linkedElem = $("#result input")[0];

	$.link(true, "#result", person);

	events = $._data(linkedElem).events;
	handlers = "|" + events.mouseup.length + events.keydown.length;

	$.observable(person).setProperty({ name: "FirstName" });

	handlers += "|" + events.mouseup.length + events.keydown.length;

	// ................................ Act ..................................
	res += " 1: " + person.name;

	linkedElem.value = "SecondName";

	$(linkedElem).keydown();

	res += " 2: " + person.name;

	linkedElem.value = "ThirdName";

	$(linkedElem).mouseup();

	res += " 3: " + person.name;

	linkedElem.value = "FourthName";

	$(linkedElem).change();

	res += " 4: " + person.name;

	handlers += "|" + events.mouseup.length + events.keydown.length;

	// ............................... Assert .................................
	equal(res,
	" 1: FirstName 2: SecondName 3: ThirdName 4: FourthName",
	'Top-level data link using: <input data-link=\'name trigger="event1 event2"\' /> triggers on specified events');

	// ............................... Assert .................................
	equal(handlers,
	"|11|11|11",
	'Top-level data link using: <input data-link=\'name trigger="event1 event2"\' /> has no duplicate handlers after relinking');

	// ................................ Act ..................................
	$.unlink(true, "#result");

	// ............................... Assert .................................
	ok($._data(linkedElem).events === undefined,
	'Top-level data link using: <input data-link=\'name trigger="event1 event2"\' />: handlers are removed by $.unlink(true, container)');
});

test("trigger=true - after keydown: <input/>", function(assert) {
	// =============================== Arrange ===============================

	var done = assert.async(),
		res = "",
		person = { name: "Jo" };

	$.templates('<input data-link="name trigger=true" />').link("#result", person);

	var linkedElem = $("#result input")[0];

	var events = $._data(linkedElem).events,
		handlers = "|" + events.keydown.length;

	$.observable(person).setProperty({ name: "FirstName" });

	events = $._data(linkedElem).events;
	handlers += "|" + events.keydown.length;

	// ................................ Act ..................................
	res += " 1: " + person.name;

	linkedElem.value = "SecondName";

	$(linkedElem).keydown();

	setTimeout(function() {
		res += " 2: " + person.name;

		handlers += "|" + events.keydown.length;

		// ............................... Assert .................................
		equal(res,
		" 1: FirstName 2: SecondName",
		'Data link using: <input data-link="name trigger=true" /> triggers after keydown');

		// ............................... Assert .................................
		equal(handlers,
		"|1|1|1",
		'Data link using: <input data-link=\'name trigger=true\' /> has no duplicate handlers after relinking');

		// ................................ Act ..................................
		$.unlink(true, "#result");

		// ............................... Assert .................................
		ok($._data(linkedElem).events === undefined,
		'Data link using: <input data-link="name trigger=true" />: handlers are removed by $.unlink(true, container)');

		done();
	}, 0);
});

test("trigger=true - after keydown: {^{twoWayTag}}", function(assert) {
	// =============================== Arrange ===============================

	var done = assert.async(),
		before = "",
		person = { name: "Jo" };

	$.templates({
		markup: '{^{twoWayTag name convert="myupper" convertBack=~lower trigger=true/}}',
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

	var tag = $("#result").view(true).childTags("twoWayTag")[0],

		linkedElem = tag.linkedElem[0],
		events = $._data(linkedElem).events,
		handlers = "|" + events.keydown.length;

	// ................................ Act ..................................
	before = linkedElem.value;
	linkedElem.value = "ChangeTheName";

	tag.linkedElem.keydown();

	setTimeout(function() {
		// ............................... Assert .................................
		equal(before + "|" + person.name,
		"JO|changethename",
		'Data link using: {^{twoWayTag name convertBack=~lower trigger=true/}} - triggers after keydown, converts the data, and sets on data');

		handlers += "|" + events.keydown.length;

		// ............................... Assert .................................
		equal(handlers,
		"|1|1",
		'Top-level data link using: {^{twoWayTag name convertBack=~lower trigger=true/}} has no duplicate handlers after relinking');

		// ................................ Act ..................................
		$.unlink(true, "#result");

		// ............................... Assert .................................
		ok($._data(linkedElem).events === undefined,
		'Top-level data link using: {^{twoWayTag name convertBack=~lower trigger=true/}}: handlers are removed by $.unlink(true, container)');

		done();
	}, 0);
});

test("trigger=true - after keydown: {^{textbox}}", function(assert) {
	// =============================== Arrange ===============================

	var done = assert.async(),
		before = "",
		person = { name: "Jo" };

	$.views.tags({
		textbox: {
			onAfterLink: function() {
				// Find input in contents, if not already found
				this.linkedElem = this.linkedElem || this.contents("input");
			},
			onUpdate: function() {
				// No need to re-render whole tag, when content updates.
				return false; //
			},
			template: "<input/>"
		}
	});

	$.templates({
		markup: '{^{textbox name convert="myupper" convertBack=~lower trigger=true/}}',
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

	var tag = $("#result").view(true).childTags("textbox")[0];

	var linkedElem = tag.linkedElem[0],
		events = $._data(linkedElem).events,
		handlers = "|" + events.keydown.length;

	// ................................ Act ..................................
	before = linkedElem.value;
	linkedElem.value = "ChangeTheName";

	tag.linkedElem.keydown();

	setTimeout(function() {
		// ............................... Assert .................................
		equal(before + "|" + person.name,
		"JO|changethename",
		'Data link using: {^{textbox name convertBack=~lower trigger=true/}} - triggers after keydown, converts the data, and sets on data');

		handlers += "|" + events.keydown.length;

		// ............................... Assert .................................
		equal(handlers,
		"|1|1",
		'Top-level data link using: {^{textbox name convertBack=~lower trigger=true/}} has no duplicate handlers after relinking');

		// ................................ Act ..................................
		$.unlink(true, "#result");

		// ............................... Assert .................................
		ok($._data(linkedElem).events === undefined,
		'Top-level data link using: {^{textbox name convertBack=~lower trigger=true/}}: handlers are removed by $.unlink(true, container)');

		done();
	}, 0);
});

test("trigger=true - after keydown: {^{contentEditable}}", function(assert) {
	// =============================== Arrange ===============================

	var done = assert.async(),
		before = "",
		person = { name: "Jo <b>Smith</b>" };

	$.views.tags({
		contentEditable: {
			onAfterLink: function() {
				// Find contentEditable div in contents, if not already found
				this.linkedElem = this.linkedElem || this.contents("[contentEditable]");
			},
			onUpdate: function() {
				// No need to re-render whole tag, when content updates.
				return false;
			},
			template: "<div contenteditable='true'></div>"
		}
	});

	$.templates({
		markup: '{^{contentEditable name convert="myupper" convertBack=~lower trigger=true/}}',
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

	var tag = $("#result").view(true).childTags("contentEditable")[0],

		linkedElem = tag.linkedElem[0],
		events = $._data(linkedElem).events,
		handlers = "|" + events.keydown.length;

	// ................................ Act ..................................
	before = linkedElem.innerHTML;
	linkedElem.innerHTML = "New <em>Name</em>";

	tag.linkedElem.change();

	before += "|" + person.name;
	linkedElem.innerHTML = "New2 <p>Name2</p>";

	tag.linkedElem.blur();

	before += "|" + person.name;
	linkedElem.innerHTML = "New3 <div>Name3</div>";

	tag.linkedElem.keydown();

	setTimeout(function() {
		// ............................... Assert .................................
		equal(before + "|" + person.name,
		isIE8 ? "JO <B>SMITH</B>|new <em>name</em>|new2 \r\n<p>name2</p>|new3 \r\n<div>name3</div>"
			: "JO <b>SMITH</b>|new <em>name</em>|new2 <p>name2</p>|new3 <div>name3</div>",
		'Data link using: {^{contentEditable name convertBack=~lower trigger=true/}} - triggers after keydown, converts the data, and sets on data');

		handlers += "|" + events.keydown.length;

		// ............................... Assert .................................
		equal(handlers,
		"|1|1",
		'Top-level data link using: {^{contentEditable name convertBack=~lower trigger=true/}} has no duplicate handlers after relinking');

		// ................................ Act ..................................
		$.unlink(true, "#result");

		// ............................... Assert .................................
		ok($._data(linkedElem).events === undefined,
		'Top-level data link using: {^{contentEditable name convertBack=~lower trigger=true/}}: handlers are removed by $.unlink(true, container)');

		done();
	}, 0);

});

test('linkTo for {:source linkTo=target:} or {twoWayTag source linkTo=target}', function() {
	// =============================== Arrange ===============================
	var before, after, person = { name: "Jo", name2: "Jo2" },
		cancelChange = false,
		eventData = "";

	$.views.tags({
		twoWayTag: {
			init: function(tagCtx, linkCtx) {
				eventData += "init ";
				if (this._.inline && !tagCtx.content) {
					this.template = "<input/>";
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
		}
	});

	// ELEMENT-BASED DATA-LINKED TAGS ON INPUT - WITH linkTo EXPRESSION
	$.templates('<input id="linkedEl" data-link="{:name linkTo=name2:}"/>')
		.link("#result", person);

	var linkedEl = $("#linkedEl")[0];

	// ................................ Act ..................................
	before = linkedEl.value;

	$.observable(person).setProperty({ name: "newName" });
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

	// =============================== Arrange ===============================

	person.name = "Jo";
	person.name2 = "Jo2";

	$.templates('<input id="linkedEl" data-link="\'initialValue\' linkTo=name2"/>')
		.link("#result", person);

	linkedEl = $("#linkedEl")[0];

	// ................................ Act ..................................
	before = "value: " + linkedEl.value + " name:" + person.name + " name2:" + person.name2;
	linkedEl.value = "3rdNewVal";
	$(linkedEl).change();
	after = "name:" + person.name + " name2:" + person.name2;

	// ............................... Assert .................................
	equal(before + "|" + after,
	"value: initialValue name:Jo name2:Jo2|name:Jo name2:3rdNewVal",
	'Data link using: <input data-link="\'initialValue\' linkTo=name2"/> - Initializes to provided string, and binds updated value of linkedElem back to "linkTo" target');

	// =============================== Arrange ===============================

	person.name = "Jo";
	person.name2 = "Jo2";

	$.templates('<input id="linkedEl" data-link="linkTo=name2"/>')
		.link("#result", person);

	linkedEl = $("#linkedEl")[0];

	// ................................ Act ..................................
	before = "value: " + linkedEl.value + " name:" + person.name + " name2:" + person.name2;
	linkedEl.value = "4thNewVal";
	$(linkedEl).change();
	after = "name:" + person.name + " name2:" + person.name2;

	// ............................... Assert .................................
	equal(before + "|" + after,
	"value: [object Object] name:Jo name2:Jo2|name:Jo name2:4thNewVal",
	'Data link using: <input data-link="linkTo=name2"/> - Initializes to current data item, and binds updated value of linkedElem back to "linkTo" target');

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
	'Data link using: <input data-link="{myupper:name linkTo=name2:mylower} - (tag.convert setting) - initial linking: converts the value on the target input');

	// ................................ Act ..................................
	$.observable(person).setProperty({ name: "ANewName" });

	// ............................... Assert .................................
	equal(linkedEl.value,
	"ANEWNAME",
	'Data link using: <input data-link="{myupper:name linkTo=name2:mylower}"/> - (tag.convert setting) - on data change: converts the value on the target input');

	// ................................ Act ..................................
	linkedEl.value = "ChangeTheName";
	$(linkedEl).change();

	// ............................... Assert .................................
	equal("name:" + person.name + " name2:" + person.name2,
	"name:ANewName name2:changethename",
	'Data link using: <input data-link="{myupper:name linkTo=name2:mylower}/> - (tag.convertBack setting) on element change: converts the data, and sets on "linkTo" target data');

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

	var tag = $("#result").view(true).childTags("twoWayTag")[0];
	linkedEl = $("#linkedEl")[0];

	// ............................... Assert .................................
	equal(eventData, "init render onAfterLink ",
	'Data link using: <input data-link="{twoWayTag name linkTo=name2}"/> - event order for init, render, link');
	eventData = "";

	// ................................ Act ..................................
	before = tag.value + linkedEl.value;

	$.observable(person).setProperty({ name: "newName" });
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
	'Data link using: <input data-link="{twoWayTag name linkTo=name2 convert=\'myupper\'}"/> - (tag.convert setting) - initial linking: converts the value on the target input');

	// ................................ Act ..................................
	$.observable(person).setProperty({ name: "ANewName" });

	// ............................... Assert .................................
	equal(linkedEl.value + "|" + tag.value,
	"ANEWNAME|ANewName",
	'Data link using: <input data-link="{twoWayTag name linkTo=name2 convert=\'myupper\'}"/> - (tag.convert setting) - on data change: converts the value on the target input');

	// ................................ Act ..................................
	linkedEl.value = "ChangeTheName";
	$(linkedEl).change();

	// ............................... Assert .................................
	equal("name:" + person.name + " name2:" + person.name2 + " value:" + tag.value,
	"name:ANewName name2:changethename value:changethename",
	'Data link using: <input data-link="{twoWayTag name linkTo=name2 convertBack=~lower}"/> - (tag.convertBack setting) on element change: converts the data, and sets on "linkTo" target data');

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

	$.observable(person).setProperty({ name: "newName" });
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
	'Data link using: {^{twoWayTag name linkTo=name2 convert="myupper"}} - (tag.convert setting) - initial linking: converts the value on the target input');

	// ................................ Act ..................................
	$.observable(person).setProperty({ name: "ANewName" });

	// ............................... Assert .................................
	equal(linkedEl.value + "|" + tag.value,
	"ANEWNAME|ANewName",
	'Data link using: {^{twoWayTag name linkTo=name2 convert="myupper"} - (tag.convert setting) - on data change: converts the value on the target input');

	// ................................ Act ..................................
	linkedEl = $("#linkedEl")[0];
	linkedEl.value = "ChangeTheName";
	$(linkedEl).change();

	// ............................... Assert .................................
	equal("name:" + person.name + " name2:" + person.name2 + " value:" + tag.value,
	"name:ANewName name2:changethename value:changethename",
	'Data link using: {^{twoWayTag name linkTo=name2 convertBack=~lower}} - (tag.convertBack setting) on element change: converts the data, and sets on "linkTo" target data');

	// ............................... Reset .................................
	$("#result").empty();
});

test("Tag control events", function() {

	// =============================== Arrange ===============================
	var eventData = "";
	model.things = [{ thing: "box" }]; // reset Prop

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
				onArrayChange: function(ev, eventArgs) {
					eventData += " onArrayChange";
				},
				onAfterLink: function(ev, eventArgs) {
					var tag = this,
						data = tag.tagCtx.args[1];
					if (tag._boundArray && data !== tag._boundArray) {
						$.unobserve(tag._boundArray, tag._arCh); // Different array, so remove handler from previous array
						tag._boundArray = undefined;
					}
					if (!tag._boundArray && $.isArray(data)) {
						$.observe(tag._boundArray = data, tag._arCh = function(ev, eventArgs) { // Store array data as tag._boundArray, and arrayChangeHandler as tag._arCh
							tag.onArrayChange(ev, eventArgs);
						});
					}
					eventData += " after";
				},
				onDispose: function() {
					var tag = this;
					if (tag._boundArray) {
						$.unobserve(tag._boundArray, tag._arCh); // Remove arrayChange handler from bound array
					}
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
	equal($("#result").text() + "|" + eventData, "One 1 special| init render getType before after", '{^{myWidget/}} - Events fire in order during rendering: render, onBeforeLink and onAfterLink');

	// ................................ Act ..................................
	$.observable(person1).setProperty("lastName", "Two");

	// ............................... Assert .................................
	equal($("#result").text() + "|" + eventData, "Two 1 special| init render getType before after update render getType before after", '{^{myWidget/}} - Events fire in order during update: update, render, onBeforeLink and onAfterLink');

	// ................................ Act ..................................
	$.observable(model.things).insert(0, { thing: "tree" });

	// ............................... Assert .................................
	equal($("#result").text() + "|" + eventData, "Two 1 special| init render getType before after update render getType before after onArrayChange", '{^{myWidget/}} - Events fire in order during update: update, render, onBeforeLink and onAfterLink');

	// ................................ Act ..................................
	$("#result").empty();

	// ............................... Assert .................................
	equal($("#result").text() + "|" + eventData, "| init render getType before after update render getType before after onArrayChange dispose", '{^{myWidget/}} - onDispose fires when container element is emptied or removed');

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
	equal($("#result").text() + "|" + eventData, "| init before after", '{^{myNoRenderWidget/}} - A data-linked tag control which does not render fires init, onBeforeLink and onAfterLink');

	//TODO: Add tests for attaching jQuery UI widgets or similar to tag controls, using data-link and {^{myTag}} inline data binding.

$.views.settings.debugMode(false); // For using viewsAndBindings()

});
})(this, this.jQuery);
