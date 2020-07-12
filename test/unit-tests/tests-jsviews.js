/*global test, equal, module, ok, _jsv, viewsAndBindings*/
(function(global, $, undefined) {
"use strict";

/* Setup */
var inputOrKeydownContentEditable,
	useInput = "oninput" in document,
	inputOrKeydown = useInput ? "input" : "keydown";
	inputOrKeydownContentEditable = "input";

function keydown(elem) {
	if (useInput) {
		elem.trigger("input");
	} else {
		elem.keydown();
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
		title: "Mr"
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
	cancelUpdate = false,
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
				return "Name: " + this.tagCtx.view.data.firstName() + ". Width: " + this.ctxPrm("settings").width;
			},
			depends: ["firstName", "~settings.width"]
		},
		fnTagElNoInit: function() {
			return "<span>Name: " + this.tagCtx.view.data.firstName() + ". Width: " + this.ctxPrm("settings").width + "</span>";
		},
		tmplTagEl: {
			template: "<span>Name: {{:firstName()}}. Width: {{:~settings.width}}</span>",
			depends: ["firstName", "~settings.width"]
		},
		fnTagEl: {
			render: function() {
				return "<span>Name: " + this.tagCtx.view.data.firstName() + ". Width: " + this.ctxPrm("settings").width + "</span>";
			},
			depends: ["firstName", "~settings.width"]
		},
		fnTagElCnt: {
			render: function() {
				return "<li>Name: " + this.tagCtx.view.data.firstName() + ". Width: " + this.ctxPrm("settings").width + "</li>";
			},
			depends: ["firstName", "~settings.width"]
		},
		fnTagElCntNoInit: function() {
			return "<li>Name: " + this.tagCtx.view.data.firstName() + ". Width: " + this.ctxPrm("settings").width + "</li>";
		},
		fnTagWithProps: {
			render: function(data, val) {
				return "Name: " + this.tagCtx.view.data.firstName() + ". Width: " + this.ctxPrm("settings").width + ". Value: " + val
					+ ". Prop theTitle: " + this.tagCtx.props.theTitle + ". Prop ~street: " + this.ctxPrm("street");
			},
			depends: ["firstName", "~settings.width"]
		},
		tmplTagWithProps: {
			render: function(val) {
				this.ctxPrm("theTitle", this.tagCtx.props.theTitle);
			},
			template: "Name: {{:firstName()}}. Width: {{:~settings.width}}. Value: {{:~settings.reverse}}. "
				+ "Prop theTitle: {{dbg:~theTitle}}. Prop ~street: {{:~street}}",
			depends: ["firstName", "~settings.width"]
		},
		twoWayTag: {
			init: function(tagCtx, linkCtx, ctx) {
				eventData += "init ";
				if (this.inline && !tagCtx.content) {
					this.template = "<input/>";
				}
			},
			render: function(val) {
				eventData += "render ";
				return renders ? (val + ' <input id="linkedElm"/> rendered') : undefined;
			},
			onAfterLink: function(tagCtx, linkCtx, ctx, ev, eventArgs) {
				eventData += "onAfterLink ";
				this.value = tagCtx.args[0];
			},
			onBeforeUpdateVal: function(ev, eventArgs) {
				eventData += "onBeforeUpdateVal ";
				return !cancelUpdate;
			},
			onUpdate: function(ev, eventArgs, newTagCtxs) {
				eventData += "onUpdate ";
				return !noRenderOnUpdate;
			},
			onBind: function(tagCtx, linkCtx, ctx, ev, eventArgs) {
				eventData += "onBind ";
				this.linkedElem = this.linkedElem || (this.inline ? this.contents("input,div") : $(linkCtx.elem));
			},
			onUnbind: function(tagCtx, linkCtx, ctx, ev, eventArgs) {
				this.linkedElem = undefined; // remove, so newly rendered linkedElem gets created in onBind
				eventData += "onUnbind ";
			},
			onBeforeChange: function(ev, eventArgs) {
				eventData += "onBeforeChange ";
				return !cancelChange;
			},
			setValue: function() {
				eventData += "setValue ";
			},
			onAfterChange: function(ev, eventArgs) {
				eventData += "onAfterChange ";
			},
			onDispose: function() {
				eventData += "onDispose ";
			}
		}
	});

var topData = {people: people};
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
	myFlow2: {
		flow: true,
		template: "flow2"
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
							+ '{{if true}}'
								+ '{{myFlow2/}}'
							+ '{{/if}}'
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
							+ '{{if true}}'
								+ '{{myFlow2/}}'
							+ '{{/if}}'
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

var viewContent, before, after, lastEvData, lastEventArgs, listeners, handlersCount, elems,
	res = "",
	calls = 0;

function reset() {
	res = "";
	calls = 0;
}

// End Setup

QUnit.module("Template structure");

QUnit.test("Template validation", function(assert) {

	$.views.settings.advanced({_jsv: true}); // For using window._jsv

	// =============================== Arrange ===============================
		$.templates('<div {{if 1}}title="{{:a}}"{{/if}}>{{if 1}}X{{:a}}{{/if}}</div>')
		.link("#result", {a: "yes"});

	// ............................... Assert .................................
	assert.ok($("#result div").text() === "Xyes" && $("#result div").prop("title") === "yes", "Tag markup works within element content, or within element markup, for non element-only elements (<div>)");

	// =============================== Arrange ===============================
		$.templates('<ul {{if 1}}title="{{:a}}"{{/if}}><li>{{if 1}}X{{:a}}{{/if}}</li></ul>')
		.link("#result", {a: "yes"});

	// ............................... Assert .................................
	assert.ok($("#result ul").text() === "Xyes" && $("#result ul").prop("title") === "yes", "Tag markup works within element content, or within element markup, for element-only elements (<ul>)");

	// =============================== Arrange ===============================
	try {
		$.templates('<svg height="210" width="400"><path data-link="d{:path}" /></svg>'
			+ '<math><mi>x</mi><mspace data-link="width{:width}"/><mi>y</mi></math>'
			+ '<div><span><svg><path d="M150 0 L75 200 L225 200 Z" /></svg><math><mi>x</mi><mspace width="3em"/><mi>y</mi></math></span>{{:thing}}</div>')
		.link("#result", {width: "3em", path: "M250 0 L75 200 L225 200 Z", thing: "egg"});
		res = $("#result").text();
	} catch (e) {
		res = e.message;
	}

	// ............................... Assert .................................
	assert.equal(res, "xyxyegg", "Validation - self-closing tags are allowed within svg or math content (foreign elements)");
	res = "";

	// =============================== Arrange ===============================
	try {
		var tmpl = $.templates('<table>{{for things}}<tr><td>}{{:thing}}</td></tr>{{/for}}</table>'); // throws syntax error
		tmpl.link("#result", {things: [{thing: "Orig"}]});
	} catch (e) {
		res = e.message;
	}

	// ............................... Assert .................................
	assert.equal(res.indexOf("Parent of <tr> must be <tbody>"), 0, "Validation - missing closing tag");
	res = "";

	// =============================== Arrange ===============================
	try {
		$.templates('<div>{{:thing}}<span></div>') // throws syntax error
		.link("#result", {thing: "Orig"});
	} catch (e) {
		res = e.message;
	}

	// ............................... Assert .................................
	assert.equal(res.indexOf("Syntax error\nMismatch: '</div>'"), 0, "Validation - missing closing tag");
	res = "";

	// =============================== Arrange ===============================
	try {
		$.templates('<div>{{:Thing}}</span></div>') // throws syntax error
		.link("#result", {thing: "Orig"});
	} catch (e) {
		res = e.message;
	}

	// ............................... Assert .................................
	assert.equal(res.indexOf("Syntax error\nMismatch: '</span>'"), 0, "Validation - missing opening tag");
	res = "";

	// =============================== Arrange ===============================
	try {
		$.templates('<span>{{:Thing}}</span></span>') // throws syntax error
		.link("#result", {thing: "Orig"});
	} catch (e) {
		res = e.message;
	}

	// ............................... Assert .................................
	assert.equal(res.indexOf("Syntax error\nMismatch: '</span>'"), 0, "Validation - extra closing tag");
	res = "";

	// =============================== Arrange ===============================
	try {
		$.templates('<span>{{:Thing}}</span></div>')
		.link("#result", {thing: "Orig"});
	} catch (e) {
		res = e.message;
	}

	// ............................... Assert .................................
	assert.equal(res.indexOf("Syntax error\nMismatch: '</div>'"), 0, "Validation - extra closing tag");
	res = "";

	// =============================== Arrange ===============================
	try {
		$.templates('<div>{{:Thing}}<span/></div>') // throws syntax error
		.link("#result", {thing: "Orig"});
	} catch (e) {
		res = e.message;
	}

	// ............................... Assert .................................
	assert.equal(res.indexOf("Syntax error\n'<span.../>'"), 0, "Validation - self-closing tag is not a void element");
	res = "";

	// =============================== Arrange ===============================
	try {
		$.templates('<div>{{:Thing}}') // throws syntax error
		.link("#result", {thing: "Orig"});
	} catch (e) {
		res = e.message;
	}

	// ............................... Assert .................................
	assert.equal(res.indexOf("Syntax error\nMismatched '<div...>'"), 0, "Validation - missing closing tag");
	res = "";

	// =============================== Arrange ===============================
	try {
		$.templates('</div>{{:Thing}}') // throws syntax error
		.link("#result", {thing: "Orig"});
	} catch (e) {
		res = e.message;
	}

	// ............................... Assert .................................
	assert.equal(res.indexOf("Syntax error\nMismatch: '</div>'"), 0, "Validation - missing opening tag");
	res = "";

	// =============================== Arrange ===============================
	try {
		$.templates('<div/>') // throws syntax error
		.link("#result", {thing: "Orig"});
	} catch (e) {
		res = e.message;
	}

	// ............................... Assert .................................
	assert.equal(res.indexOf("Syntax error\n'<div.../>'"), 0, "Validation - self-closing tag is not a void element");
	res = "";

	// =============================== Arrange ===============================
	try {
		$.templates('<div>{{:Thing}}<input></input></div>') // throws syntax error
		.link("#result", {thing: "Orig"});
	} catch (e) {
		res = e.message;
	}

	// ............................... Assert .................................
	assert.equal(res.indexOf("Syntax error\n'</input>'"), 0, "Validation - closing tag for a void element");
	res = "";

	// =============================== Arrange ===============================
	$.templates('prop: <input id="last" data-link="lastName"/><br><div><br/>'
		+ '{{if true}}<input id="{{:\'last\'}}" data-link="lastName">{{/if}}<img/></div><img>')
		.link("#result", person1);
	// ................................ Act ..................................
	res = $("#result input")[0].value + $("#result input")[1].value;

	$.observable(person1).setProperty("lastName", "Two");
	res += $("#result input")[0].value + $("#result input")[1].value;

	// ............................... Assert .................................
	assert.equal(res, "OneOneTwoTwo", "Validation - void elements can have self-close slashes, or not...");
	res = "";

	// =============================== Arrange ===============================
	var markupData = {markup: "<img/><img>"};
	$.templates('{^{:markup}}')
		.link("#result", markupData);

	// ................................ Act ..................................
	res = "" + ($("#result").html().indexOf("<img><img>")>60);

	$.observable(markupData).setProperty("markup", "<br/><br>");
	res += "|" + ($("#result").html().indexOf("<br><br>")>60);

	// ............................... Assert .................................
	assert.equal(res, "true|true", "Validation - void elements inserted from data can have self-close slashes, or not...");
	res = "";

	// =============================== Arrange ===============================
	$.templates('<input {{if true}}id="last"{{/if}} {{if false}}id="first"{{/if}} data-link="lastName"/>')
		.link("#result", {lastName: "Blow"});

	// ............................... Assert .................................
	assert.equal($("#result #last").val(), "Blow",
		"{{if}} is supported within <input/> markup even when data-linking");
	res = "";

	// =============================== Arrange ===============================
	$.templates('<input data-link="lastName" {{if true}}id="last"/> {{else}}/>{{/if}}')
		.link("#result", {lastName: "Blow"});

	// ............................... Assert .................................
	assert.equal($("#result #last").val(), "Blow",
		"{{if}} wrapping closing delimiter of <input/> markup is supported even when data-linking");
	res = "";

	// =============================== Arrange ===============================
	try {
		$.templates('<input {^{if true}}id="last"{{/if}} data-link="lastName">') // throws syntax error
		.link("#result", {lastName: "Blow"});
	} catch (e) {
		res = e.message;
	}

	// ............................... Assert .................................
	assert.equal(res, "Syntax error\n{^{ within elem markup (<input ). Use data-link=\"...\"",
		"Validation - {^{if}} within <input markup");
	res = "";

	// =============================== Arrange ===============================
	try {
		$.templates('<input data-link="lastName" {^{if true}}id="last"/> {{else}}/>{{/if}}') // throws syntax error
		.link("#result", {lastName: "Blow"});
	} catch (e) {
		res = e.message;
	}

	// ............................... Assert .................................
	assert.equal(res, "Syntax error\n{^{ within elem markup (<input ). Use data-link=\"...\"",
		"Validation - {^{if}} wrapping closing delimiter of <input/> markup");

	// =============================== Arrange ===============================
	try {
		$.templates('<span {^{if true}}id="last"{{/if}}>a</span>')
		.link("#result", {thing: "Orig"});
	} catch (e) {
		res = e.message;
	}

	// ............................... Assert .................................
	assert.equal(res, "Syntax error\n{^{ within elem markup (<span ). Use data-link=\"...\"",
		"Validation - {^{if}} within <span> markup");
	res = "";

	// =============================== Arrange ===============================
	try {
		$.templates('<div {^{:true}}>a</div>') // throws syntax error
		.link("#result", {thing: "Orig"});
	} catch (e) {
		res = e.message;
	}

	// ............................... Assert .................................
	assert.equal(res, "Syntax error\n{^{ within elem markup (<div ). Use data-link=\"...\"",
		"Validation - {^{:...}} within element markup");
	res = "";

	// =============================== Arrange ===============================
	try {
		$.templates('<div {{:true}}>a</div>') // does not throw syntax error
		.link("#result", {thing: "Orig"});
	} catch (e) {
		res = e.message;
	}

	// ............................... Assert .................................
	assert.equal(res, "",
		"Validation - {{:...}} within element markup is OK");
	res = "";

	// =============================== Arrange ===============================
	try {
		$.templates('<div class="{{attr:\'myClass\'}}">a</div>') // does not throw syntax error
		.link("#result", {thing: "Orig"});
	} catch (e) {
		res = e.message;
	}

	// ............................... Assert .................................
	assert.equal(res, "",
		"Validation - {{attr:...}} within element markup is OK");
	res = "";

	// =============================== Arrange ===============================
	try {
		$.templates('<input data-link="value{:foo:}"/>') // throws syntax error
		.link("#result", {thing: "Orig"});
	} catch (e) {
		res = e.message;
	}

	// ............................... Assert .................................
	assert.equal(res, "Syntax error\n{:foo:}- Remove target: value",
		"Validation - value{:foo:}");
	res = "";

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

	$.views.settings.advanced({_jsv: false});
});

QUnit.module("data-link scenarios");

QUnit.test("jQuery cleanData integration", function(assert) {

	// ................................ Reset ................................
	person1.lastName = "One"; // reset Prop

	// =============================== Arrange ===============================
	$("#result").html('<span id="inner"></span>');
	$.link("lastName", "#inner", person1);
	$("#inner").on("click", function() {});

	// ................................ Act ..................................
	res = $("#inner").html();
	$.observable(person1).setProperty("lastName", "last2");
	res += "|" + $("#inner").html();
	$("#inner").off("click");
	$.observable(person1).setProperty("lastName", "last3");
	res += "|" + $("#inner").html();

	// ............................... Assert .................................
	assert.equal(res,
	'One|last2|last3',
	'Removing jQuery handlers does not remove views. (Issue https://github.com/BorisMoore/jsviews/issues/249)');

	// ................................ Reset ................................
	person1.lastName = "One"; // reset Prop
	$("#result").empty();

	// =============================== Arrange ===============================
	$("#result").html('<span id="inner"></span>');
	$.link("lastName", "#inner", person1);

	// ................................ Act ..................................
	res = $("#inner").html();
	$.observable(person1).setProperty("lastName", "last2");
	res += "|" + $("#inner").html();
	$("#inner").data('foo', 'bar').removeData('foo');
	$.observable(person1).setProperty("lastName", "last3");
	res += "|" + $("#inner").html();

	// ............................... Assert .................................
	assert.equal(res,
	'One|last2|last3',
	'Adding and removing jQuery data does not remove views. (Issue https://github.com/BorisMoore/jsviews/issues/249)');

	// ................................ Reset ................................
	person1.lastName = "One"; // reset Prop
	$("#result").empty();

	// =============================== Arrange ===============================
	$("#result").html('<span id="inner"></span>');
	$.link("lastName", "#inner", person1);

	// ................................ Act ..................................
	res = $("#inner").html();
	$.observable(person1).setProperty("lastName", "last2");
	res += "|" + $("#inner").html();
	$.observable(person1).setProperty("lastName", "last3");
	res += "|" + $("#inner").html();

	// ............................... Assert .................................
	assert.equal(res,
	'One|last2|last3',
	'Calling dequeue does not remove views. (Issue https://github.com/BorisMoore/jsviews/issues/249)');

	// =============================== Arrange ===============================
$.views.settings.trigger(false);

var tmpl1 = $.templates(
	'<button data-link="{on ~clicked} {:name}">click me</button>'
	+ '<ul><li class="clickLi" data-link="{on ~clicked} {:name}">click me</li></ul>'
	+ '<input data-link="name" />'
	+ '<div><ul>{^{for things}}<li>inserted</li>{{/for}}</ul></div>'
);

var tmpl2 = $.templates(
	'<li><button data-link="{on ~clicked 1} {:name}">click me</button></li>'
	+ '<li class="clickLi" data-link="{on ~clicked 1} {:name}">click me</li>'
	+ '<li><input data-link="name" /></li>'
	+ '{^{for things}}<li>inserted</li>{{/for}}'
),

data = {name:"Jo", things:[]},
clicked = 0,
helpers = {
	clicked: function(val) {
		clicked += 1;
	}
};

$("#result").html(
	'<div id="toclone">'
	+ '<button class="toplevel" data-link="{on ~clicked} {:name}">click me</button>'
	+ '<ul class="toplevel"><li class="clickLi" data-link="{on ~clicked} {:name}">click me</li></ul>'
	+ '<input class="toplevel" data-link="name" />'
	+ '<div class="toplevel"><ul data-link="{for things tmpl=\'<li>inserted</li>\'}"></ul></div>'

	+'<div class = "result"></div>'
	+ '<ul class = "result2"></ul>'
+ '</div>'
);

$.link(true, "#toclone .toplevel", data, helpers);

tmpl1.link("#toclone .result", data, helpers);
tmpl2.link("#toclone .result2", data, helpers);

var inputs = $("#result input"),
	buttons = $("#result button"),
	lis = $("#result .clickLi");

	// ................................ Act ..................................
var cloned = $("#toclone").clone().removeAttr( 'id' );
cloned.empty();

var res = $("#result").text();

$.observable(data.things).insert(1);

res += "|" + $("#result").text();

$.observable(data).setProperty("name", "Bob");

res += "|" + $("#result").text();

$(inputs[0]).val("n0").change();

res += "|" + $("#result").text();

$(inputs[1]).val("n1").change();

res += "|" + $("#result").text();

$(inputs[2]).val("n2").change();

res += "|" + $("#result").text();

	// ............................... Assert .................................
	assert.equal(res,
	'JoJoJoJoJoJo|'
	+ 'JoJoinsertedJoJoinsertedJoJoinserted|'
	+ 'BobBobinsertedBobBobinsertedBobBobinserted|'
	+ 'n0n0insertedn0n0insertedn0n0inserted|'
	+ 'n1n1insertedn1n1insertedn1n1inserted|'
	+ 'n2n2insertedn2n2insertedn2n2inserted',
	'Cloning data-linked content then emptying clone does not remove original data bindings. (Issue https://github.com/BorisMoore/jsviews/issues/369)');

	// ................................ Act ..................................

res = "" + clicked;

$(buttons[0]).click();
$(buttons[1]).click();
$(buttons[2]).click();
$(lis[0]).click();
$(lis[1]).click();
$(lis[2]).click();

	// ............................... Assert .................................
res += "|" + clicked;

	assert.equal(res,
	'0|6',
	'Cloning data-linked content then emptying clone does not remove click handlers. (Issue https://github.com/BorisMoore/jsviews/issues/369)');

$.views.settings.trigger(true);

	// ................................ Reset ................................
	person1.lastName = "One"; // reset Prop
	$.unlink();
});

QUnit.module("API - data-link");

QUnit.test("Basic $.link(expression, container, data) and $.link(tmpl, container, data)", function(assert) {

	// ................................ Reset ................................
	person1.lastName = "One"; // reset Prop
	home1.address = address1; // reset Prop
	$.views.settings.advanced({_jsv: true}); // For using viewsAndBindings()

	// =============================== Arrange ===============================
	$("#result").html('<span id="inner"></span>');
	$.link("lastName 44 a=3", "#inner", person1);

	// ................................ Act ..................................
	before = $("#inner").html();
	$.observable(person1).setProperty("lastName", "newLast");
	after = $("#inner").html();

	// ............................... Assert .................................
	assert.equal(before + "|" + after,
	'One|newLast',
	'$.link("fieldName", "#target", data) links field to content of target element (equivalent to data-link="fieldName")');

	// =============================== Arrange ===============================

	// ................................ Act ..................................
	$("#result").empty();

	// ............................... Assert .................................

	assert.ok(!viewsAndBindings() && !$._data(person1).events,
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
	assert.equal(before + "|" + after,
	'One StreetOne|newLast StreetTwo',
	'$.link(expression, "#target", data) links expression to target element (equivalent to data-link="expression")');

	// =============================== Arrange ===============================

	// ................................ Act ..................................
	$("#result").empty();

	// ............................... Assert .................................

	assert.ok(!viewsAndBindings() && !$._data(person1).events && !$._data(person1.home).events,
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
	assert.equal(before + "|" + after,
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
	assert.equal(before + "|" + after,
	'One|newLast',
	'$.link(template, "#container", data) links template to content of container (equivalent to template.link(container, data). Example 2.');

	// =============================== Arrange ===============================

	// ................................ Act ..................................
	$("#result").empty();

	// ............................... Assert .................................

	assert.ok(!viewsAndBindings() && !$._data(person1).events,
	"$(container).empty removes both views and current listeners from that content");

	// ................................ Reset ................................
	person1.lastName = "One"; // reset Prop
	$.unlink();

	$.views.settings.advanced({_jsv: false});
});

QUnit.test("Top-level linking", function(assert) {
	$.views.settings.advanced({_jsv: true}); // For using cbBindings store
	$.view().ctx.root = $.view().data = undefined; // In some scenarios with nested templates, tmpl.render()
	// can leave topView.data and topView.ctx.root referencing data, causing tests below such as
	// tmpl.link(expression, container1, data1) works without setting data or root on top view to fail. So we 'start clean' here...

	// =============================== Arrange ===============================

	$.views.helpers("a", " A");
	$("#result").html("<div data-link='name + ~a + ~b'></div>");

	// ............................... Act .................................
	$.link(true, "#result", {name: "Jo"}, {b: " B"});

	// ............................... Assert .................................
	assert.equal($("#result").text(), "Jo A B", 'Passing in data to top-level linking');

	// ............................... Act .................................
	$.link(true, "#result div", {name: "Jo2"}, {b: " newB"});

	// ............................... Assert .................................
	assert.equal($("#result").text(), "Jo2 A newB", 'Top-level linking directly to the linked element');

	// ................................ Reset ................................
	$("#result").empty();

	// ............................... Assert .................................
	assert.equal(JSON.stringify(_jsv.cbBindings), "{}",
		"Top level bindings all removed when content removed from DOM");

	// =============================== Arrange ===============================

	$.views.helpers("a", " A");
	$.templates("inner", "{^{:name + ~a + ~b}}");
	$("#result").html("<div data-link='{include tmpl=\"inner\"}'></div>");

	// ............................... Act .................................
	var data = {name: "Jo"};
	$.link(true, "#result", data, {b: " B"});

	// ............................... Assert .................................
	assert.equal($("#result").text(), "Jo A B", 'Top-level data-link="{include tmpl=...}" passes in model and context');

	// ............................... Act .................................
	$.observable(data).setProperty("name", "JoChanged");

	// ............................... Assert .................................
	assert.equal($("#result").text(), "JoChanged A B", 'Top-level data-link="{include tmpl=...}" binds correctly within {{include}} template');

	// ............................... Act .................................
	data = {name: "Jo2"};
	$.link(true, "#result", data, {b: " newB"});

	// ............................... Assert .................................
	assert.equal($("#result div").text(), "Jo2 A newB", 'Top-level linking directly to the linked element with data-link="{include... ');

	// ............................... Act .................................
	$.observable(data).setProperty("name", "Jo2Changed");

	// ............................... Assert .................................
	assert.equal($("#result").text(), "Jo2Changed A newB", 'Top-level linking directly to the linked element with data-link="{include... binds correctly within {{include}} template');

	// ................................ Reset ................................
	$("#result").empty();

	// ............................... Assert .................................
	assert.equal(JSON.stringify(_jsv.cbBindings), "{}",
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
				{name: "Bob"},
				{name: "Jim"}
			]
		};

	// ............................... Act .................................
	$("#result").link(true, model);

	res = $("#result select option:selected").text() + "-" + $("#result ul").text();

	var newName = "new" + count++;

	$.observable(model.people).insert({
		name: newName
	});

	$.observable(model).setProperty("selected", newName);

	res += "|" + $("#result select option:selected").text() + "-" + $("#result ul").text();

	$("#result").link(true, model);
	// ............................... Assert .................................
	assert.equal(res, "Jim-BobJim|new0-BobJimnew0",
		"Top level bindings with multiple targets on the same element work correctly: html{for people tmpl='selectTmpl'} {:selected:}");

	// ................................ Reset ................................
	$("#result").empty();

	// ............................... Assert .................................
	assert.equal(JSON.stringify(_jsv.cbBindings), "{}",
		"Top level bindings all removed when content removed from DOM");

	// =============================== Arrange ===============================

	$.templates({
		myTmpl: "{{>name}} lead:{^{>~team.lead}} - "
	});

	$("#result").html("<div data-link=\"{for people ~team=#data tmpl='myTmpl'}\"></div>");

	model = {
		lead: "Jim",
		people: [
			{name: "Bob"},
			{name: "Jim"}
		]
	};

	// ............................... Act .................................
	$("#result").link(true, model);

	res = $("#result").text();

	$.observable(model.people).insert({
		name: "newName"
	});

	$.observable(model).setProperty("lead", "newName");

	res += "|" + $("#result").text();

	// ............................... Assert .................................
	assert.equal(res, ("Bob lead:Jim - Jim lead:Jim - |Bob lead:newName - Jim lead:newName - newName lead:newName - "),
		"Top level bindings allow passing in new contextual parameters to template: data-link=\"{for people ~team=#data tmpl=...");

	// ................................ Reset ................................
	$("#result").empty();

	// ............................... Assert .................................
	assert.equal(JSON.stringify(_jsv.cbBindings), "{}",
		"Top level bindings all removed when content removed from DOM");

	// =============================== Arrange ===============================
	$("#result").html('<div id="container1"></div><div id="container2"></div><div id="container3" data-link="name + \' \' + ~root.name + \' \' + #parent.type"></div>');

	var tmpl = $.templates("<span></span>{^{:name}} {{:~root.name}} {{:#parent && #parent.type}}"),
		person1 = {name: "Jo"},
		person2 = {name: "Bob"};

	// ............................... Act .................................
	var html = tmpl.render(person1);

	// ............................... Assert .................................
	assert.equal(html + JSON.stringify($.view().views), "<span></span>Jo Jo {}",
		"Render does not persist any view hierarchy");

	// =============================== Arrange ===============================
		$.link("name + ' ' + ~root.name + ' ' + #parent.type", "#container1", person1);

	// ............................... Assert .................................
	assert.ok(
		$("#container1").text() === "Jo Jo top" &&
		$.view().get(true, "link").ctxPrm("root").name === "Jo" &&
		$.view().get(true, "link").root === $.view().get(true, "link") &&
		$.view().data === undefined &&
		$.view().ctx.root === undefined,
	"tmpl.link(expression, container1, data1) works without setting data or root on top view");

	// ................................ Reset ................................
	$.unlink("#container1");

	// =============================== Arrange ===============================
	$.link(true, "#container3", person1);

	// ............................... Assert .................................
	assert.ok(
		$("#container3").text() === "Jo Jo top" &&
		$.view().get(true, "link").ctxPrm("root").name === "Jo" &&
		$.view().get(true, "link").root === $.view().get(true, "link") &&
		$.view().data === undefined &&
		$.view().ctx.root === undefined,
	"tmpl.link(true, container1, data1) works without setting data or root on top view");

	// ................................ Reset ................................
	$.unlink("#container3");

	// =============================== Arrange ===============================
	tmpl.link("#container1", person1);
	tmpl.link("#container2", person2);

	var spans = $("#result span");

	// ............................... Assert .................................
	assert.ok(
		$("#container1").text() === "Jo Jo top" &&
		$("#container2").text() === "Bob Bob top" &&
		$.view(spans[0]).ctxPrm("root").name === "Jo" &&
		$.view(spans[0]).root === $.view(spans[0]) &&
		$.view(spans[1]).ctxPrm("root").name === "Bob" &&
		$.view(spans[1]).root === $.view(spans[1]) &&
		$.view().data === undefined &&
		$.view().ctx.root === undefined,
	"tmpl.link(container1, data1) tmpl.link(container2, data2) - to different containers, works without setting data or root on top view");

	// ............................... Act .................................
	$("#container2").empty();
	spans = $("#result span");

	// ............................... Assert .................................
	assert.ok(
		$("#container1").text() === "Jo Jo top" &&
		$("#container2").text() === "" &&
		$.view(spans[0]).ctxPrm("root").name === "Jo" &&
		$.view(spans[0]).root === $.view(spans[0]) &&
		spans[1] === undefined &&
		$.view().data === undefined &&
		$.view().ctx.root === undefined,
	"$(container2).empty() removes view hierarchy for that container, and leaves other container hierarchy intact");

	// ............................... Act .................................
	$("#container1").empty();
	spans = $("#result span");

	// ............................... Assert .................................
	assert.ok(
		$("#container1").text() === "" &&
		$("#container2").text() === "" &&
		spans[0] === undefined &&
		spans[0] === undefined &&
		$.view().data === undefined &&
		$.view().ctx.root === undefined,
	"$(container1).empty() removes other view hierarchy too");

	// ................................ Reset ................................
	$("#result").empty();
	$.views.settings.advanced({_jsv: false});
});

QUnit.test("$.link() and $().link() variants", function(assert) {
	var done = assert.async();

	// ................................ Reset ................................
	person1.lastName = "One"; // reset Prop
	home1.address = address1; // reset Prop
	$.views.settings.advanced({_jsv: true}); // For using viewsAndBindings()

	// =============================== Arrange ===============================

	$("#result").html('<span id="inner"></span>');
	var help = {
		options: {bar: "BarA"}
	};

	$.link("~root.person1.lastName + ' ' + person1.home.address^street + ' ' + ~options.bar", "#inner", model, help);

	// ................................ Act ..................................
	before = $("#inner").html();
	$.observable(person1).setProperty("lastName", "newLast");
	$.observable(person1.home).setProperty("address", address2); // Using deep observability
	$.observable(help.options).setProperty("bar", "BarB"); // Modify helper
	after = $("#inner").html();

	// ............................... Assert .................................
	assert.equal(before + "|" + after,
	'One StreetOne BarA|newLast StreetTwo BarB',
	'$.link(expression, "#target", data, helpers) links expression to target element (equivalent to data-link="expression")');

	// =============================== Arrange ===============================

	// ................................ Act ..................................
	$("#result").empty();

	// ............................... Assert .................................
	assert.ok(!viewsAndBindings() && !$._data(person1).events && !$._data(person1.home).events && !$._data(help.options).events,
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
	assert.equal(before + "|" + after,
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
	keydown($("#result input").val("modLast"));

setTimeout(function() {
	after += "|" + $("#result").text() + $("#result input").val();

	// ............................... Assert .................................
	assert.equal(before + "|" + after, 'One One One|newLast newLast newLast|modLast modLast modLast',
	'$.link(expression, ".target", data, helpers) links expression to multiple target elements, including two-way bindings (equivalent to data-link="expression" on each element)');

	// ................................ Act ..................................
	$("#result").empty();

	// ............................... Assert .................................

	assert.ok(!viewsAndBindings() && !$._data(person1).events,
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
	keydown($("#result input").val("modLast"));

setTimeout(function() {
	after += "|" + $("#result").text() + $("#result input").val();

	// ............................... Assert .................................
	assert.equal(before + "|" + after, 'One One One|newLast newLast newLast|modLast modLast modLast',
	'$(".target").link(expression, data, helpers) links expression to multiple target elements, including two-way bindings (equivalent to data-link="expression" on each element)');

	// ................................ Act ..................................
	$("#result").empty();

	// ............................... Assert .................................

	assert.ok(!viewsAndBindings() && !$._data(person1).events,
	"$(container).empty removes current listeners and two-way bindings from that content");

	// ................................ Reset ................................
	person1.lastName = "One"; // reset Prop

	// =============================== Arrange ===============================

	$("#result").html('<span class="inner"> </span> <div class="inner"></div> <input class="inner"/>'); // multiple targets, same class

	help.options.tmpl = $.templates(" NAME: {^{:lastName}}");
	$.link("title{:person1.lastName} {include person1 tmpl=~options.tmpl}", "div.inner, span.inner", model, help);
	$.link("{:person1.lastName:} title{:person1.lastName}", "input.inner", model, help);

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
	keydown($("#result input").val("modLast"));

setTimeout(function() {
	after += "|" + $("#result").text() + $("#result input").val() + getTitles(".inner");

	// ............................... Assert .................................
	assert.equal(before + "|" + after,
	' NAME: One  NAME: One One One One One|'
	+ ' NAME: newLast  NAME: newLast newLast newLast newLast newLast|'
	+ ' NAME: modLast  NAME: modLast modLast modLast modLast modLast',
	'$.link(expression, selector, data, helpers) links expression to multiple targets on multiple target elements, including two-way bindings');

	// ................................ Act ..................................
	$("#result").empty();

	// ............................... Assert .................................

	assert.ok(!viewsAndBindings() && !$._data(person1).events,
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
	keydown($("#result input").val("modLast"));

setTimeout(function() {
	after += "|" + $("#result").text() + $("#result input").val() + getTitles(".inner");
	$.observable(help.options).setProperty("tmpl", $.templates(" NEWTMPLNAME: {^{:lastName}}")); // We dynamically change the template of {include ^tmpl=~tmpl} too
	after += "|" + $("#result").text() + $("#result input").val() + getTitles(".inner");

	// ............................... Assert .................................
	assert.equal(before + "|" + after,
	' NAME: One  NAME: One One One One One|'
	+ ' NAME: newLast  NAME: newLast newLast newLast newLast newLast|'
	+ ' NAME: modLast  NAME: modLast modLast modLast modLast modLast|'
	+ ' NEWTMPLNAME: modLast  NEWTMPLNAME: modLast modLast modLast modLast modLast',
	'$(selector).link(expression, data, helpers) links expression to multiple targets on multiple target elements, including binding to passed in templates');

	// ................................ Act ..................................
	$("#result").empty();

	// ............................... Assert .................................

	assert.ok(!viewsAndBindings() && !$._data(person1).events,
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
	keydown($("#result input").val("modLast"));

setTimeout(function() {
	after += "|" + $("#result").text() + $("#result input").val() + getTitles(".inner");

	// ............................... Assert .................................
	assert.equal(before + "|" + after,
	' NAME: One  NAME: One One One One One|'
		+ ' NAME: newLast  NAME: newLast newLast newLast newLast newLast|'
		+ ' NAME: modLast  NAME: modLast modLast modLast modLast modLast',
	'$.link(true, ".inner", data, helpers) links multiple targets on multiple target elements, including two-way bindings');

	// ................................ Act ..................................
	$("#result").empty();

	// ............................... Assert .................................

	assert.ok(!viewsAndBindings() && !$._data(person1).events,
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
	keydown($("#result input").val("modLast"));

setTimeout(function() {
	after += "|" + $("#result").text() + $("#result input").val() + getTitles(".inner");

	// ............................... Assert .................................
	assert.equal(before + "|" + after,
	' NAME: One  NAME: One One One One One|'
	+ ' NAME: newLast  NAME: newLast newLast newLast newLast newLast|'
	+ ' NAME: modLast  NAME: modLast modLast modLast modLast modLast',
	'$(".inner").link(true, data, helpers) links multiple targets on multiple target elements, including two-way bindings');

	// ................................ Act ..................................
	$("#result").empty();

	// ............................... Assert .................................

	assert.ok(!viewsAndBindings() && !$._data(person1).events,
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
	keydown($("#result input").val("modLast"));

setTimeout(function() {
	after += "|" + $("#result").text() + $("#result input").val() + getTitles("#result div, #result span, #result input");

	// ............................... Assert .................................
	assert.equal(before + "|" + after,
	' NAME: One  NAME: One One One One One|'
	+ ' NAME: newLast  NAME: newLast newLast newLast newLast newLast|'
	+ ' NAME: modLast  NAME: modLast modLast modLast modLast modLast',
	'$(container).link(true, data, helpers) links multiple targets on multiple target elements, including two-way bindings');

	// ................................ Act ..................................
	$("#result").empty();

	// ............................... Assert .................................

	assert.ok(!viewsAndBindings() && !$._data(person1).events,
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
	keydown($("#result input").val("modLast"));

setTimeout(function() {
	after += "|" + $("#result").text() + $("#result input").val() + getTitles("#result div, #result span, #result input");

	// ............................... Assert .................................
	assert.equal(before + "|" + after,
	' NAME: One  NAME: One One One One One|'
	+ ' NAME: newLast  NAME: newLast newLast newLast newLast newLast|'
	+ ' NAME: modLast  NAME: modLast modLast modLast modLast modLast',
	'$(container).link(true, data, helpers) links multiple targets on multiple target elements, including two-way bindings');

	// ................................ Act ..................................
	$("#result").empty();

	// ............................... Assert .................................

	assert.ok(!viewsAndBindings() && !$._data(person1).events,
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
	keydown($("#result input").val("modLast"));

setTimeout(function() {
	after += "|" + $("#result").text() + $("#result input").val() + getTitles(".inner");

	// ............................... Assert .................................
	assert.equal(before + "|" + after,
	' NAME: One  NAME: One One One One One|'
	+ ' NAME: newLast  NAME: newLast newLast newLast newLast newLast|'
	+ ' NAME: modLast  NAME: modLast modLast modLast modLast modLast',
	'$.link(expression, selector, data, helpers) links correctly to multiple targets on multiple target elements within a linked rendered template');

	// ................................ Act ..................................
	$("#result").empty();

	// ............................... Assert .................................

	assert.ok(!viewsAndBindings() && !$._data(person1).events,
	"$(container).empty removes current listeners and two-way bindings from that content");

	// ................................ Reset ................................
	person1.lastName = "One"; // reset Prop

	// =============================== Arrange ===============================
	var data = {color: "green"},
		outerHelp = {
			ob: {
				val: "outerVal",
				tmpl: $.templates("Inside {^{:~root.color}} {^{:~ob.val}} {^{:~foo}} NAME: {^{:lastName}}")
			}
		};
	help.foo = "Foo";

	$.templates('{^{:~root.color}} {^{:~ob.val}} <span class="inner"></span>').link("#result", data, outerHelp);
	before = $("#result").text();

	$.link("{include person1 tmpl=~ob.tmpl}", "span.inner", model, help);

	// ................................ Act ..................................
	before += "|" + $("#result").text();
	$.observable(person1).setProperty("lastName", "newLast");
	after = $("#result").text();
	$.observable(data).setProperty("color", "red");
	after += "|" + $("#result").text();

	// ............................... Assert .................................
	assert.equal(before + "|" + after,
	'green outerVal |'
		+ 'green outerVal Inside green outerVal Foo NAME: One|'
		+ 'green outerVal Inside green outerVal Foo NAME: newLast|'
		+ 'red outerVal Inside red outerVal Foo NAME: newLast',
	'$.link(expression, selector, data, helpers) links correctly to target elements within a linked rendered template - and extends the context of the target view');

	// ................................ Act ..................................
	$("#result").empty();

	// ............................... Assert .................................

	assert.ok(!viewsAndBindings() && !$._data(person1).events,
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
	keydown($("#result input").val("modLast"));

setTimeout(function() {
	after += "|" + $("#result").text() + $("#result input").val() + getTitles("#result div, #result span, #result input");

	// ............................... Assert .................................
	assert.equal(before + "|" + after + " - Model1: " + model.person1.lastName + "- Model2: " + model2.person1.lastName,
	' NAME: One  NAME: One One One One One|'
		+ ' NAME: newLast  NAME: newLast newLast newLast newLast newLast|'
		+ ' NAME: modLast  NAME: modLast modLast modLast modLast modLast'
		+ ' - Model1: modLast- Model2: lastModel2Name',
	'$.link(true, selector, data, helpers) is a no-op when targeting  within a previously linked rendered template');

	// ................................ Act ..................................
	$.observable(model2.person1).setProperty("lastName", "newModel2Last");
	before = $("#result").text() + $("#result input").val() + getTitles("#result div, #result span, #result input");
	$.observable(model.person1).setProperty("lastName", "new_ORIGMOD_Last");
	after = $("#result").text() + $("#result input").val() + getTitles("#result div, #result span, #result input");
	$.observable(help.options).setProperty("tmpl", $.templates(" NAME_ORIGMOD_NewTmpl: {^{:lastName}}"));
	after += "|" + $("#result").text() + $("#result input").val() + getTitles("#result div, #result span, #result input");

	// ............................... Assert .................................
	assert.equal(before + "|" + after,
' NAME: modLast  NAME: modLast modLast modLast modLast modLast|'
		+ ' NAME: new_ORIGMOD_Last  NAME: new_ORIGMOD_Last new_ORIGMOD_Last new_ORIGMOD_Last new_ORIGMOD_Last new_ORIGMOD_Last|'
		+ ' NAME: new_ORIGMOD_Last  NAME_ORIGMOD_NewTmpl: new_ORIGMOD_Last new_ORIGMOD_Last new_ORIGMOD_Last new_ORIGMOD_Last new_ORIGMOD_Last',
	'Continue: $.link(true, selector, data, helpers) is a no-op when targeting  within a previously linked rendered template');

	// ................................ Act ..................................
	$("#result").empty();

	// ............................... Assert .................................

	assert.ok(!viewsAndBindings() && !$._data(person1).events,
	"$(container).empty removes current listeners and two-way bindings from that content");

	// ................................ Reset ................................
	person1.lastName = "One"; // reset Prop
	model2.person1.lastName = "lastModel2Name"; // reset Prop
	help2.options.tmpl = $.templates("Model2Tmpl: {^{:lastName}}");

	// =============================== Arrange ===============================

	$.templates('<div id="inner" data-link="{:person1.lastName} title{:\'title:\' + person1.lastName}"></div><input data-link="person1.lastName"/>').link("#result", model, help);

	// ................................ Act ..................................
	before = $("#result").text();
	$.link(true, "#inner", model2, help2); //NO-OP
	after = $("#result").text();
	$.observable(model2.person1).setProperty("lastName", "newLast2");
	after += "|" + $("#result").text();
	keydown($("#result input").val("modLast"));

setTimeout(function() {
	after += "|" + $("#result").text();

	// ............................... Assert .................................
	assert.equal(before + "|" + after + getTitles("#inner") + " - Model1: " + model.person1.lastName + "- Model2: " + model2.person1.lastName,
	"One|One|One|modLast title:modLast - Model1: modLast- Model2: newLast2",
	'$.link(true, selector, data, helpers) is a no-op when targeting within a previously linked rendered template');

	// ................................ Act ..................................
	before = $("#result").text() + getTitles("#inner");
	$.link("{include person1 ^tmpl=~options.tmpl} title{:\'title2:\' + person1.lastName}", "#inner", model2, help2);
	after = $("#result").text() + getTitles("#inner");
	$.observable(model2.person1).setProperty("lastName", "last2B");
	after += "|" + $("#result").text() + getTitles("#inner");
	$.observable(model.person1).setProperty("lastName", "last1A");
	after += "|" + $("#result").text() + getTitles("#inner");
	keydown($("#result input").val("modMoreLast"));

setTimeout(function() {
	after += "|" + $("#result").text() + getTitles("#inner");
	$.observable(help2.options).setProperty("tmpl", $.templates("Model2NEWTmpl: {^{:lastName}}"));
	after += "|" + $("#result").text() + getTitles("#inner");

	// ............................... Assert .................................
	assert.equal(before + "|" + after + " - Model1: " + model.person1.lastName + "- Model2: " + model2.person1.lastName,
	"modLast title:modLast|"
		+ "Model2Tmpl: newLast2 title2:newLast2|"
		+ "Model2Tmpl: last2B title2:last2B|"
		+ "last1A title:last1A|"
		+ "modMoreLast title:modMoreLast|"
		+ "Model2NEWTmpl: last2B title:modMoreLast"
		+ " - Model1: modMoreLast- Model2: last2B",
	'$.link(expression, selector, data, helpers) links content correctly, including within a previously linked rendered template - leading to dual two-way binding to both models and contexts');

	// ................................ Act ..................................
	$("#result").empty();

	// ............................... Assert .................................

	assert.ok(!viewsAndBindings() && !$._data(person1).events,
	"$(container).empty removes current listeners and two-way bindings from that content");

	// ................................ Reset ................................
	person1.lastName = "One"; // reset Prop
	model2.person1.lastName = "lastModel2Name"; // reset Prop
	help2.options.tmpl = $.templates("Model2Tmpl: {^{:lastName}}");

	// =============================== Arrange ===============================

	$.templates('<div id="inner" data-link="{:person1.lastName} title{:\'title:\' + person1.lastName}"></div><input data-link="person1.lastName"/>').link("#result", model, help);

	// ................................ Act ..................................
	before = $("#result").text() + getTitles("#inner") + " val:" + $("#result input").val();

	$.observable(model.person1).setProperty("lastName", "newLast3");

	after = $("#result").text() + getTitles("#inner") + " val:" + $("#result input").val();

	keydown($("#result input").val("modLast4"));

setTimeout(function() {
	after += "|" + $("#result").text() + getTitles("#inner") + " val:" + $("#result input").val() + " data:" + model.person1.lastName;

	$("#inner").unlink();

	$.observable(model.person1).setProperty("lastName", "newLast5");

	after += "|" + $("#result").text() + getTitles("#inner") + " val:" + $("#result input").val();

	keydown($("#result input").val("modLast6"));

setTimeout(function() {
	after += "|" + $("#result").text() + getTitles("#inner") + " val:" + $("#result input").val() + " data:" + model.person1.lastName;

	$("#result input").unlink();

	$.observable(model.person1).setProperty("lastName", "newLast7");

	after += "|" + $("#result").text() + getTitles("#inner") + " val:" + $("#result input").val();

setTimeout(function() {
	keydown($("#result input").val("modLast8"));

	after += "|" + $("#result").text() + getTitles("#inner") + " val:" + $("#result input").val() + " data:" + model.person1.lastName;

	// ............................... Assert .................................
	assert.equal(before + "|" + after,
	"One title:One val:One|"
	+ "newLast3 title:newLast3 val:newLast3|"
	+ "modLast4 title:modLast4 val:modLast4 data:modLast4|"
	+ "modLast4 title:modLast4 val:newLast5|"
	+ "modLast4 title:modLast4 val:modLast6 data:modLast6|"
	+ "modLast4 title:modLast4 val:modLast6|"
	+ "modLast4 title:modLast4 val:modLast8 data:newLast7",
	'$(selector).unlink() removes data binding on target element, including both directions of binding on two-way data-linking');

	// ............................... Assert .................................
	assert.ok(viewsAndBindings().split(" ").length === 7 && !$._data(model.person1).events,
	'$(selector).unlink() removes data binding, and the "link" views, for target elements');

	// ................................ Act ..................................
	$("#result").empty();

	// ............................... Assert .................................

	assert.ok(!viewsAndBindings() && !$._data(person1).events,
	"$(container).empty removes current listeners and two-way bindings from that content");

	// ................................ Reset ................................
	person1.lastName = "One"; // reset Prop
	model2.person1.lastName = "lastModel2Name"; // reset Prop
	help2.options.tmpl = $.templates("Model2Tmpl: {^{:lastName}}");

	// =============================== Arrange ===============================

	$.templates('<div id="inner" data-link="{:person1.lastName} title{:\'title:\' + person1.lastName}"></div><input data-link="person1.lastName"/>').link("#result", model, help);

	// ................................ Act ..................................
	before = $("#result").text() + getTitles("#inner") + " val:" + $("#result input").val();

	$.observable(model.person1).setProperty("lastName", "newLast3");

	after = $("#result").text() + getTitles("#inner") + " val:" + $("#result input").val();

	keydown($("#result input").val("modLast4"));

setTimeout(function() {
	after += "|" + $("#result").text() + getTitles("#inner") + " val:" + $("#result input").val() + " data:" + model.person1.lastName;

	$.unlink("#inner");

	$.observable(model.person1).setProperty("lastName", "newLast5");

	after += "|" + $("#result").text() + getTitles("#inner") + " val:" + $("#result input").val();

	keydown($("#result input").val("modLast6"));

setTimeout(function() {
	after += "|" + $("#result").text() + getTitles("#inner") + " val:" + $("#result input").val() + " data:" + model.person1.lastName;

	$.unlink("#result input");

	$.observable(model.person1).setProperty("lastName", "newLast7");

	after += "|" + $("#result").text() + getTitles("#inner") + " val:" + $("#result input").val();

	keydown($("#result input").val("modLast8"));

setTimeout(function() {
	after += "|" + $("#result").text() + getTitles("#inner") + " val:" + $("#result input").val() + " data:" + model.person1.lastName;

	// ............................... Assert .................................
	assert.equal(before + "|" + after,
	"One title:One val:One|"
	+ "newLast3 title:newLast3 val:newLast3|"
	+ "modLast4 title:modLast4 val:modLast4 data:modLast4|"
	+ "modLast4 title:modLast4 val:newLast5|"
	+ "modLast4 title:modLast4 val:modLast6 data:modLast6|"
	+ "modLast4 title:modLast4 val:modLast6|"
	+ "modLast4 title:modLast4 val:modLast8 data:newLast7",
	'$.unlink(selector) removes data binding on target element, including both directions of binding on two-way data-linking');

	// ............................... Assert .................................
	assert.ok(viewsAndBindings().split(" ").length === 7 && !$._data(model.person1).events,
	'$.unlink(selector) removes data binding, and the "link" views, for target elements');

	// ................................ Act ..................................
	$("#result").empty();

	// ............................... Assert .................................

	assert.ok(!viewsAndBindings() && !$._data(person1).events,
	"$(container).empty removes current listeners and two-way bindings from that content");

	// ................................ Reset ................................
	$.views.settings.advanced({_jsv: false});

done();
}, 0);
}, 0);
}, 0);
}, 0);
}, 0);
}, 0);
}, 0);
}, 0);
}, 0);
}, 0);
}, 0);
}, 0);
}, 0);
}, 0);
}, 0);
}, 0);
}, 0);
}, 0);
});

QUnit.module("template.link()");

QUnit.test("Helper overriding", function(assert) {
var done = assert.async();

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

	tmpl.link("#result", {}, {c: "optionHelper"});
	$.views.helpers("a", null);

	// ............................... Assert .................................
	assert.equal($("#result").text(), "globalHelper templateHelper optionHelper", 'Passing in helpers - global, template or option');

	// =============================== Arrange ===============================
	tmpl = $.templates({
		markup: "{{:~a}}",
		helpers: {
			a: "templateHelper"
		}
	});

	tmpl.link("#result", {});

	// ............................... Assert .................................
	assert.equal($("#result").text(), "templateHelper", 'template helper overrides global helper');

	// =============================== Arrange ===============================
	tmpl = $.templates({
		markup: "{{:~a}}"
	});

	tmpl.link("#result", {}, {a: "optionHelper"});

	// ............................... Assert .................................
	assert.equal($("#result").text(), "optionHelper", 'option helper overrides global helper');

	// =============================== Arrange ===============================
	tmpl = $.templates({
		markup: "{{:~b}}",
		helpers: {
			b: "templateHelper"
		}
	});

	tmpl.link("#result", {}, {b: "optionHelper"});

	// ............................... Assert .................................
	assert.equal($("#result").text(), "templateHelper", 'template helper overrides option helper');

	// =============================== Arrange ===============================
	$.views.helpers("a", "globalHelper");

	$("#result").html("<div data-link='~a + ~b'></div>");

	$.link(true, "#result", {}, {b: "optionHelper"});
	$.views.helpers("a", null);

	// ............................... Assert .................................
	assert.equal($("#result").text(), "globalHelperoptionHelper", 'Passing in helpers to top-level linking - global or option');

	// =============================== Arrange ===============================
	$.views.helpers("a", "globalHelper");

	$("#result").html("<div data-link='~a'></div>");

	$.link(true, "#result", {}, {a: "optionHelper"});
	$.views.helpers("a", null);

	// ............................... Assert .................................
	assert.equal($("#result").text(), "optionHelper", 'Passing in helpers to top-level linking - option overrides global');

	// =============================== Arrange ===============================
	$.views.helpers({
		onBeforeChange: function(ev, eventArgs) {
			res += "globalBeforeChange|" + eventArgs.change + "|" + (this.tagName || this.elem.tagName) + " ";
		},
		onAfterChange: function(ev, eventArgs) {
			res += "globalAfterChange|" + eventArgs.change + "|" + (this.tagName || this.elem.tagName) + " ";
		},
		onAfterCreate: function(view) {
			res += "globalAfterCreate ";
		}
	});
	res = '';

	var pson = {name: "Jo"};

	tmpl = $.templates({
		markup: "<input data-link='name'/> {^{:name}}"
	});

	tmpl.link("#result", pson);

	$.observable(pson).setProperty("name", "name3");

	// ............................... Assert .................................
	assert.equal(res, "globalAfterCreate globalBeforeChange|set|INPUT globalAfterChange|set|INPUT globalBeforeChange|set|: globalAfterChange|set|: ",
		'Global onAfterCreate, onBeforeChange, onAfterChange - setProperty');

	res = '';

	keydown($("#result input").val("editedName"));

setTimeout(function() {
	// ............................... Assert .................................
	assert.equal(res, "globalBeforeChange|set|INPUT globalAfterChange|set|INPUT globalBeforeChange|set|: globalAfterChange|set|: ",
		'Global onAfterCreate, onBeforeChange, onAfterChange - elemChange');

	res = '';

	// =============================== Arrange ===============================
	tmpl.link("#result", pson, {
		onBeforeChange: function(ev, eventArgs) {
			res += "optionsBeforeChange|" + eventArgs.change + "|" + (this.tagName || this.elem.tagName) + " ";
		},
		onAfterChange: function(ev, eventArgs) {
			res += "optionsAfterChange|" + eventArgs.change + "|" + (this.tagName || this.elem.tagName) + " ";
		},
		onAfterCreate: function(view) {
			res += "optionsAfterCreate ";
		}
	});

	$.observable(pson).setProperty("name", "name2");

	// ............................... Assert .................................
	assert.equal(res, "optionsAfterCreate optionsBeforeChange|set|INPUT optionsAfterChange|set|INPUT optionsBeforeChange|set|: optionsAfterChange|set|: ",
		'options helper overrides global helper');

	res = '';

	keydown($("#result input").val("editedName"));

setTimeout(function() {
	// ............................... Assert .................................
	assert.equal(res, "optionsBeforeChange|set|INPUT optionsAfterChange|set|INPUT optionsBeforeChange|set|: optionsAfterChange|set|: ",
		'options helper overrides global helper');

	res = '';

	// =============================== Arrange ===============================
	tmpl = $.templates({
		markup: "<input data-link='name'/> {^{:name}}",
		helpers: {
			onBeforeChange: function(ev, eventArgs) {
				res += "templateBeforeChange|" + eventArgs.change + "|" + (this.tagName || this.elem.tagName) + " ";
			},
			onAfterChange: function(ev, eventArgs) {
				res += "templateAfterChange|" + eventArgs.change + "|" + (this.tagName || this.elem.tagName) + " ";
			},
			onAfterCreate: function(view) {
				res += "templateAfterCreate ";
			}
		}
	});

	tmpl.link("#result", pson, {
		onBeforeChange: function(ev, eventArgs) {
			res += "optionsBeforeChange|" + eventArgs.change + "|" + (this.tagName || this.elem.tagName) + " ";
		},
		onAfterChange: function(ev, eventArgs) {
			res += "optionsAfterChange|" + eventArgs.change + "|" + (this.tagName || this.elem.tagName) + " ";
		},
		onAfterCreate: function(view) {
			res += "optionsAfterCreate ";
		}
	});

	$.observable(pson).setProperty("name", "name4");

	// ............................... Assert .................................
	assert.equal(res, "templateAfterCreate templateBeforeChange|set|INPUT templateAfterChange|set|INPUT templateBeforeChange|set|: templateAfterChange|set|: ",
		'template helper overrides options helper');

	res = '';

	keydown($("#result input").val("editedName"));

setTimeout(function() {
	// ............................... Assert .................................
 assert.equal(res, "templateBeforeChange|set|INPUT templateAfterChange|set|INPUT"
		+ " templateBeforeChange|set|: templateAfterChange|set|: ",
		'template helper overrides options helper');

	res = '';

	$.views.helpers({
		onBeforeChange: null,
		onAfterChange: null,
		onAfterCreate: null
	});
	$("#result").empty();

done();
}, 0);
}, 0);
}, 0);
});

QUnit.test('data-link="expression"', function(assert) {
var done = assert.async();

// ................................ Reset ................................
	home1.address = address1; // reset Prop
	person1._firstName = "Jo"; // reset Prop
	person1.lastName = "One"; // reset Prop
	settings.title = "Mr"; // reset Prop
	$.views.settings.advanced({_jsv: true}); // For using viewsAndBindings()

	// =============================== Arrange ===============================

	$.templates('prop: <span data-link="lastName"></span>')
		.link("#result", person1);

	// ................................ Act ..................................
	before = $("#result span").html();
	$.observable(person1).setProperty("lastName", "newLast");
	after = $("#result span").html();

	// ............................... Assert .................................
	assert.equal(before + "|" + after,
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
	assert.equal(before + "|" + after,
	'One|newLast',
	'Data link using: <input data-link="lastName"/> binds from data');

	// ................................ Act ..................................
	keydown($("#result input").val("editedName"));

setTimeout(function() {
	after = $("#result").html() + $("#last").val();

	// ............................... Assert .................................
	assert.equal(person1.lastName, "editedName",
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
	assert.equal(before + "|" + after,
	'One StreetOne|newLast StreetTwo',
	'Data link using: <span data-link="expression"></span>');

	// ................................ Act ..................................
	$("#result").empty();
	before = $("#result").html();

	// ............................... Assert .................................
	assert.ok(!viewsAndBindings() && !$._data(person1).events && !$._data(home1).events && !$._data(address2).events,
	"$(container).empty removes both views and current listeners from that content - including after swapping data on deep paths");

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
	assert.equal(before + "|" + after,
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
				return {b: val};
			}
		});

	// ............................... Assert .................................
	var html = $("#result span")[0].outerHTML;
	assert.equal(html,
	'<span data-link="foo(\'x\\x\').b">x\\x</span>',
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
	assert.equal(before + "|" + after,
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
	assert.equal(before + "|" + after,
	'StreetOne|StreetTwo+',
	'~a.b^c does deep binding');

	// ................................ Reset ................................
	$("#result").empty();
	address1.street = "StreetOne";
	person1.home = home1;
	address2.street = "StreetTwo";

	// =============================== Arrange ===============================

	var util1 = {getVal: function(val) { return "getVal1 = " + val; }};
	var util2 = {getVal: function(val) { return "getVal2 = " + val; }};
	var appHelpers = {util: util1};

	$.templates('<span data-link="~app.util^getVal(#data)"></span>')
		.link("#result", 22, {app: appHelpers});

	// ................................ Act ..................................
	before = $("#result span").html();
	$.observable(appHelpers).setProperty("util", util2);
	after = $("#result span").html();
	$.observable(util2).setProperty("getVal", function(val) { return "getNewVal = " + val; });
	after += "|" + $("#result span").html();

	// ............................... Assert .................................
	assert.equal(before + "|" + after,
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
	$.observable(foobar).setProperty("foo", {bar: "new "});
	res = $("#result").text();
	$("input.linked").each(function(i, el) { res += el.value; });

	// ............................... Assert .................................
	assert.equal(res,
	"1 new  2 new  3 new  4 new  5 new  6 new  INPUTS new new new new new new new new ",
	'Duplicate paths bind correctly (https://github.com/BorisMoore/jsviews/issues/250)');

	// ................................ Reset ................................
	$("#result").empty();

	// =============================== Arrange ===============================
	var data = {name: "Jo"};
	res = "";

	// ................................ Act ..................................
	res =
		$.templates('{{:#data}}')
		.render(["aa", 22, 0, false, "", true]);

	// ............................... Assert .................................
	assert.equal(res,
	"aa220falsetrue",
	'{{:#data}} renders correctly for different data types');

	// ................................ Act ..................................
	res =
		$.templates('{{for items}}{{:#index}} {{:#data}} {{/for}}')
		.render({items: ["aa", 22, 0, false, "", true]});

	// ............................... Assert .................................
	assert.equal(res,
	"0 aa 1 22 2 0 3 false 4  5 true ",
	'{{:#data}} within {{for}} is correct for different data types');

	// ................................ Act ..................................

	res =
		$.templates('{{:#data}}')
		.link("#result", ["aa", 22, 0, false, "", true]).text();

	// ............................... Assert .................................
	assert.equal(res,
	"aa220falsetrue",
	'With link, {{:#data}} renders correctly for different data types');

	// ................................ Act ..................................
	res =
		$.templates('{{for items}}{{:#index}} {{:#data}} {{/for}}')
		.link("#result", {items: ["aa", 22, 0, false, "", true]}).text();

	// ............................... Assert .................................
	assert.equal(res,
	"0 aa 1 22 2 0 3 false 4  5 true ",
	'with link, {{:#data}} within {{for}} is correct for different data types');

	// ................................ Act ..................................
	res =
		$.templates('{^{:#data}}')
		.link("#result", ["aa", 22, 0, false, "", true]).text();

	// ............................... Assert .................................
	assert.equal(res,
	"aa220falsetrue",
	'With link, {^{:#data}} renders correctly for different data types');

	// ................................ Act ..................................
	res =
		$.templates('{^{for items}}{{:#index}} {^{:#data}} {{/for}}')
		.link("#result", {items: ["aa", 22, 0, false, "", true]}).text();

	// ............................... Assert .................................
	assert.equal(res,
	"0 aa 1 22 2 0 3 false 4  5 true ",
	'with link, {^{:#data}} within {^{for}} is correct for different data types');

	// ................................ Act ..................................
	data = {name: "Jo"};
	res = "";

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
		res += el.value + " | ";
	});

	$.observable(data).setProperty("name", "new");

	$("#result input").each(function(i, el) {
		res += el.value + " | ";
	});

	// ............................... Assert .................................
	assert.equal(res,
	"Josome string | Jo22 | Jo0 | Jofalse | Jo | Jotrue | newsome string | new22 | new0 | newfalse | new | newtrue | ",
	'data-linking inside {{for sometype}} works correctly even when #data is not an object');

	// ................................ Reset ................................
	$("#result").empty();

	// ................................ Act ..................................
	data = {name: "Jo"};
	res = "";

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
		res += el.value + " | ";
	});

	$.observable(data).setProperty("name", "new");

	$("#result input").each(function(i, el) {
		res += el.value + " | ";
	});

	// ............................... Assert .................................
	assert.equal(res,
	"Josome string | Jo22 | Jo0 | Jofalse | Jo | Jotrue | newsome string | new22 | new0 | newfalse | new | newtrue | ",
	'data-linking inside {^{for sometype}} works correctly even when #data is not an object');

	// ................................ Reset ................................
	$("#result").empty();
	res = "";

	$.views.settings.advanced({_jsv: false});

done();
}, 0);
});

QUnit.test('data-link="attr{:expression}"', function(assert) {

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
	assert.equal(before + "|" + after,
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
	assert.equal(before + "|" + after,
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
	assert.ok(before === 'One' && after === "",
	'Data link using: <span data-link="title{:lastName}"></span>, and setting lastName to "" - sets title to ""');

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
	var html = $("#result span")[0].outerHTML;

	// ............................... Assert .................................
	assert.ok(before === 'One' && after === null && html === "<span data-link=\"title{:lastName}\"></span>",
	'Data link using: <span data-link="title{:lastName}"></span>, and setting lastName to null - removes title attribute');

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
	var html = $("#result span")[0].outerHTML;

	// ............................... Assert .................................
	assert.ok(before === 'One' && after === null && html === "<span data-link=\"title{:lastName}\"></span>",
	'Data link using: <span data-link="title{:lastName}"></span>, and setting lastName to undefined - removes title attribute');

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
	assert.ok(before === 'One' && after === "",
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
	assert.ok(before === 'One' && after === "",
	"Data link using: <span data-link=\"html{:lastName||''}\"></span>, and setting lastName to null - sets content to empty string");

	// ................................ Reset ................................
	$("#result").empty();
	person1.lastName = "One"; // reset Prop

	// =============================== Arrange ===============================

	$.templates('prop: <span data-link="title{:lastName}"></span>')
		.link("#result", person1);

	// ................................ Act ..................................
	before = $("#result span")[0].getAttribute("title");
	$.observable(person1).removeProperty("lastName");
	after = $("#result span")[0].getAttribute("title");
	var html = $("#result span")[0].outerHTML;

	// ............................... Assert .................................
	assert.ok(before === 'One' && after === null && html === "<span data-link=\"title{:lastName}\"></span>",
	'Data link using: <span data-link="title{:lastName}"></span>, and removing lastName - removes title attribute');

	// ................................ Reset ................................
	$("#result").empty();
	person1.lastName = "One"; // reset Prop

	// =============================== Arrange ===============================

	$.templates('prop: <span data-link="{:lastName}"></span>')
		.link("#result", person1);

	// ................................ Act ..................................
	before = $("#result span").html();
	$.observable(person1).removeProperty("lastName");
	after = $("#result span").html();

	// ............................... Assert .................................
	assert.ok(before === 'One' && after === "",
	'Data link using: <span data-link="{:lastName}"></span>, and removing lastName - sets content to empty string');

	// ................................ Reset ................................
	$("#result").empty();
	person1.lastName = "One"; // reset Prop

	// =============================== Arrange ===============================

	$.templates("prop: <span data-link=\"html{:lastName||''}\"></span>")
		.link("#result", person1);

	// ................................ Act ..................................
	before = $("#result span").html();
	$.observable(person1).removeProperty("lastName");
	after = $("#result span").html();

	// ............................... Assert .................................
	assert.ok(before === 'One' && after === "",
	"Data link using: <span data-link=\"html{:lastName||''}\"></span>, and removing lastName - sets content to empty string");

	// ................................ Reset ................................
	$("#result").empty();
	person1.lastName = "One"; // reset Prop

	// =============================== Arrange ===============================

	person1.lastName = ""; // initialize

	$.templates('prop: <span data-link="title{:lastName}"></span>')
		.link("#result", person1);

	// ................................ Act ..................................
	before = $("#result span")[0].getAttribute("title");

	// ............................... Assert .................................
	assert.ok(before === "",
	'Data link using: <span data-link="title{:lastName}"></span>, with lastName "" - initializes with title attribute set to ""');

	// ................................ Reset ................................
	$("#result").empty();
	person1.lastName = "One"; // reset Prop

	// =============================== Arrange ===============================

	person1.lastName = undefined; // initialize

	$.templates('prop: <span data-link="title{:lastName}"></span>')
		.link("#result", person1);

	// ................................ Act ..................................
	before = $("#result span")[0].getAttribute("title");

	// ............................... Assert .................................
	assert.ok(before === null,
	'Data link using: <span data-link="title{:lastName}"></span>, with lastName undefined - initializes with title attribute null');

	// ................................ Reset ................................
	$("#result").empty();
	person1.lastName = "One"; // reset Prop

	// =============================== Arrange ===============================

	person1.lastName = null; // initialize

	$.templates('prop: <span data-link="title{:lastName}"></span>')
		.link("#result", person1);

	// ................................ Act ..................................
	before = $("#result span")[0].getAttribute("title");

	// ............................... Assert .................................
	assert.ok(before === null,
	'Data link using: <span data-link="title{:lastName}"></span>, with lastName null - initializes with title attribute null');

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
	assert.ok(before === 'One' && after === "false",
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
	assert.ok(before === 'One' && before === beforeVal && after === "Two" && after === afterVal,
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
	beforeVal = $("#result span").data("foo");
	var crazyAddress = [1,2];
	$.observable(person1.home).setProperty("address", crazyAddress);
	after = $("#result span")[0].getAttribute("data-foo");
	afterVal = $("#result span").data("foo");

	// ............................... Assert .................................
	assert.ok(before === originalAddress.toString() && beforeVal === originalAddress && after === crazyAddress.toString() && afterVal === crazyAddress,
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
	assert.ok(before === 'OneOneOneOne' && after === "TwoTwoTwoTwo",
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
	assert.ok(before === 'One' && after === "Two",
	'Data link using: <span data-link="a-b_foo{:lastName}"></span> sets a-b_foo attribute to lastName value');

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
	assert.ok(before === "inline" && after === "none",
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
	assert.ok(before === "inline" && after === "none",
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
	assert.ok(before === "inline" && after === "none",
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
	assert.ok(before === "inline" && after === "none",
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
	assert.equal(before + "|" + after + "|" + reset, "inline|none|inline",
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
	assert.equal(before + "|" + after + "|" + reset, "inline-block|none|inline-block",
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
	assert.equal(before + "|" + after + "|" + reset, "inline|none|inline",
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
	assert.equal(before + "|" + after + "|" + reset, "none|block|none",
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
	assert.equal(before + "|" + after + "|" + reset, "block|none|block",
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
	assert.equal(before + "|" + after + "|" + reset, "none|block|none",
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
	assert.equal(before + "|" + after + "|" + reset, "none|inline|none",
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

	var thing = {name: "box"};

	function divProps() {
		var div = $("#result div")[0];
		return "title: " + div.title + " - innerHTML: " + div.innerHTML.replace(/<script.*?><\/script>/g, "") + " - display: " + div.style.display;
	}

	// ................................ Act ..................................
	$.templates('<div data-link="{chooseAttr}">xx</div>')
		.link("#result", thing);

	// ............................... Assert .................................
	assert.equal(divProps(), "title:  - innerHTML: box&lt;br/&gt; - display: ",
		"{chooseAttr} has target 'text'");

	// ................................ Act ..................................
	$.templates('<div data-link="{chooseAttr tagAttr=\'title\'}">xx</div>')
		.link("#result", thing);

	// ............................... Assert .................................
	assert.equal(divProps(), "title: box<br/> - innerHTML: xx - display: ",
		"{chooseAttr tagAttr=\'title\'} overrides tag.attr, and has target 'title'");

	// ................................ Act ..................................
	$.templates('<div data-link="{chooseAttr tagAttr=\'html\'}">xx</div>')
		.link("#result", thing);

	// ............................... Assert .................................
	assert.equal(divProps(), "title:  - innerHTML: " + "box<br>" + " - display: ",
		"{chooseAttr tagAttr=\'html\'} overrides tag.attr, and has target 'html'");

	// ................................ Act ..................................
	$.templates('<div data-link="{chooseAttr linkCtxAttr=\'title\' tagAttr=\'html\'}">xx</div>')
		.link("#result", thing);

	// ............................... Assert .................................
	assert.equal(divProps(), "title: box<br/> - innerHTML: xx - display: ",
		"{chooseAttr linkCtxAttr=\'title\' tagAttr=\'html\'} overrides linkCtx.attr, and has target 'title'");

	// ................................ Act ..................................
	$.templates('<div data-link="html{chooseAttr}">xx</div>')
		.link("#result", thing);

	// ............................... Assert .................................
	assert.equal(divProps(), "title:  - innerHTML: " + "box<br>" + " - display: ",
		"html{chooseAttr} has target 'html'");

	// ................................ Act ..................................
	$.templates('<div data-link="html{chooseAttr tagAttr=\'title\'}">xx</div>')
		.link("#result", thing);

	// ............................... Assert .................................
	assert.equal(divProps(), "title:  - innerHTML: " + "box<br>" + " - display: ",
		"html{chooseAttr tagAttr =\'title\'} overrides tag.attr, but still has target 'html'");

	// ................................ Act ..................................
	$.templates('<div data-link="html{chooseAttr tagAttr=\'html\' linkCtxAttr=\'title\'}">xx</div>')
		.link("#result", thing);

	// ............................... Assert .................................
	assert.equal(divProps(), "title: box<br/> - innerHTML: xx - display: ",
		"html{chooseAttr tagAttr =\'html\' linkCtxAttr=\'title\'} overrides tag.attr and linkCtx.attr, and has target 'title'");

	// ................................ Act ..................................
	$.templates('<div data-link="visible{chooseAttr}">xx</div>')
		.link("#result", thing);

	// ............................... Assert .................................
	assert.equal(divProps(), "title:  - innerHTML: xx - display: block",
		"visible{chooseAttr} has display 'block'");

	// ................................ Act ..................................
	$.observable(thing).removeProperty("name");

	// ............................... Assert .................................
	assert.equal(divProps(), "title:  - innerHTML: xx - display: none",
		"visible{chooseAttr} has display 'none' if {chooseAttr} returns ''");

	// ................................ Act ..................................
	thing.name = "box";
	$.templates('<div data-link="visible{chooseAttr tagAttr=\'title\'}">xx</div>')
		.link("#result", thing);

	// ............................... Assert .................................
	assert.equal(divProps(), "title:  - innerHTML: xx - display: block",
		"visible{chooseAttr tagAttr=\'title\'} overrides tag.attr, but still has target 'visible' and has display 'block'");

	// ................................ Act ..................................
	$.templates('<div data-link="visible{chooseAttr tagAttr=\'title\' linkCtxAttr=\'html\'}">xx</div>')
		.link("#result", thing);

	// ............................... Assert .................................
	assert.equal(divProps(), "title:  - innerHTML: " + "box<br>" + " - display: ",
		"visible{chooseAttr tagAttr=\'title\' linkCtxAttr=\'html\'} overrides tag.attr and linkCtx.attr, and has target 'html'");

	// ................................ Act ..................................
	$.templates('<div data-link="visible{chooseAttr tagAttr=\'html\' linkCtxAttr=\'title\'}">xx</div>')
		.link("#result", thing);

	// ............................... Assert .................................
	assert.equal(divProps(), "title: box<br/> - innerHTML: xx - display: ",
		"visible{chooseAttr tagAttr=\'html\' linkCtxAttr=\'title\'} overrides tag.attr and linkCtx.attr, and has target 'title'");

	// ................................ Reset ................................
	$("#result").empty();
	res = "";
});

QUnit.test('data-link="{cvt:expression:cvtBack}"', function(assert) {

var done = assert.async();
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
	$.observable(person1).setProperty({firstName: "newOneFirst", lastName: "newOneLast"});
	$.observable(person2).setProperty({firstName: "newTwoFirst", lastName: "newTwoLast"});
	$.observable(settings).setProperty({title: "Sir", width: 40});
	after = $("#result span").html();

	// ............................... Assert .................................
	assert.equal(before + "|" + after,
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
	keydown($("#twoWay").val(value + "+"));

setTimeout(function() {
	// ............................... Assert .................................
	assert.equal(person1.lastName,
	"One+toMr Jo",
	'Data link using: <input data-link="{:expr:to}"/> with no convert. - convertBack called with tag as this pointer.');

	// ................................ Reset ................................
	$("#result").empty();
	person1.lastName = "One"; // reset Prop

	// =============================== Arrange ===============================

	$.templates('prop: <input id="twoWay" data-link="{:lastName:} data-foo{>23}"/>')
		.link("#result", person1);

	// ................................ Act ..................................
	value = $("#twoWay").val();
	keydown($("#twoWay").val(value + "+"));

setTimeout(function() {
	// ............................... Assert .................................
	assert.equal(person1.lastName + $("#twoWay").data().foo,
	"One+23",
	'Data link using: <input data-link="{:expr:to}"/> with no convert. - convertBack called with tag as this pointer.');

	// ................................ Reset ................................
	$("#result").empty();
	person1.lastName = "One"; // reset Prop

	// =============================== Arrange ===============================

	$.templates('prop: <input id="twoWay" data-link="{from:lastName frst=firstName():to}"/>')
		.link("#result", person1);

	// ................................ Act ..................................
	value = $("#twoWay").val();
	keydown($("#twoWay").val(value + "+"));

setTimeout(function() {
	// ............................... Assert .................................
	assert.equal(person1.lastName,
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
	keydown($("#twoWay").val(value + "+"));

setTimeout(function() {
	// ............................... Assert .................................
	assert.equal(person1.lastName,
	"OnefromMr Jo+toMr Jo",
	'Data link using: <input data-link="{from:expr:to}"/> - with converters local to template: convert and convertBack called with tag as this pointer.');

	// ................................ Act ..................................
	value = $("#twoWayInner").val();
	keydown($("#twoWayInner").val(value + "+"));

setTimeout(function() {
	// ............................... Assert .................................
	assert.equal(person1.lastName,
	"OnefromMr Jo+toMr JofromMr Jo+toMr Jo",
	'Data link using: <input data-link="{from:expr:to}"/> in nested block - with converters local to template: convert and convertBack called with tag as this pointer.');

	// ................................ Reset ................................
	$("#result").empty();
	person1.lastName = "One"; // reset Prop

done();

}, 0);
}, 0);
}, 0);
}, 0);
}, 0);
});

QUnit.test('Two-way binding', function(assert) {

var done = assert.async();
	// =============================== Arrange ===============================
	var tmpl = $.templates('<input data-link="address.street"/><div data-link="address.street"></div>');

	var model = {
			address: {street: "First St"}
		};

	// ............................... Act .................................
	tmpl.link("#result", model);

	res = $("#result").text() + " | ";

	keydown($("#result input").val('1st Ave'));

setTimeout(function() {
	res += $("#result").text() + " | " + model.address.street;

	// ............................... Assert .................................
	assert.equal(res, "First St | 1st Ave | 1st Ave",
		'<input data-link="address.street"/>');

	// ................................ Reset ................................
	$("#result").empty();

	// =============================== Arrange ===============================
	function getSelection() {
		return model.selected + ":" + ($("#result select option:selected").text()||"-") + "(" + $("#result select")[0].selectedIndex + ")|";
	}

	tmpl = $.templates('<select data-link="selected">{^{for people}}<option data-link="name"></option>{{/for}}</select>');

	model = {
			selected: "Jim",
			people: [
				{name: "Bob"},
				{name: "Jim"}
			]
		}
	var newName = "new";

	// ............................... Act .................................
	tmpl.link("#result", model);

	res = getSelection();

	$.observable(model.people).insert({
		name: newName
	});

	$.observable(model).setProperty("selected", newName);

	res += getSelection();

	$.observable(model.people).remove(2);

	res += getSelection();

	$("#result select").val('Jim').change();

	res += getSelection();

	// ............................... Assert .................................
	assert.equal(res, "Jim:Jim(1)|new:new(2)|new:-(-1)|Jim:Jim(1)|",
		'<select data-link="selected">...<option data-link="name">');

	// ................................ Reset ................................
	$("#result").empty();

	// =============================== Arrange ===============================
	tmpl = $.templates('<select data-link="selected">{^{for people}}<option value="{{:name}}">{{:name.toUpperCase()}}</option>{{/for}}</select>');

	model = {
		selected: "Jim",
		people: [
			{name: "Bob"},
			{name: "Jim"}
		]
	};

	// ............................... Act .................................
	tmpl.link("#result", model);

	res = getSelection();

	$.observable(model.people).insert({
		name: newName
	});

	$.observable(model).setProperty("selected", newName);

	res += getSelection();

	$.observable(model.people).remove(2);

	res += getSelection();

	$("#result select").val('Jim').change();

	res += getSelection();

	// ............................... Assert .................................
	assert.equal(res, "Jim:JIM(1)|new:NEW(2)|new:-(-1)|Jim:JIM(1)|",
		'<select data-link="selected">...<option value="{{:name}}">{{:name.toUpperCase()}}');

	// ................................ Reset ................................
	$("#result").empty();

	// =============================== Arrange ===============================
	tmpl = $.templates('<select data-link="selected">{^{for people}}<option>{{:name}}</option>{{/for}}</select>');

	model = {
		selected: "Jim",
		people: [
			{name: "Bob"},
			{name: "Jim"}
		]
	};

	// ............................... Act .................................
	tmpl.link("#result", model);

	res = getSelection();

	$.observable(model.people).insert({
		name: newName
	});

	$.observable(model).setProperty("selected", newName);

	res += getSelection();

	$.observable(model.people).remove(2);

	res += getSelection();

	$("#result select").val('Jim').change();

	res += getSelection();

	// ............................... Assert .................................
	assert.equal(res, "Jim:Jim(1)|new:new(2)|new:-(-1)|Jim:Jim(1)|",
		'<select data-link="selected">...<option>{{:name}}');

	// ................................ Reset ................................
	$("#result").empty();

	// =============================== Arrange ===============================
	tmpl = $.templates('<select data-link="selected">{^{for people}}<option data-link="value{:name} {:name.toUpperCase()}"></option>{{/for}}</select>');

	model = {
		selected: "Jim",
		people: [
			{name: "Bob"},
			{name: "Jim"}
		]
	};

	// ............................... Act .................................
	tmpl.link("#result", model);

	res = getSelection();

	$.observable(model.people).insert({
		name: newName
	});

	$.observable(model).setProperty("selected", newName);

	res += getSelection();

	$.observable(model.people).remove(2);

	res += getSelection();

	$("#result select").val('Jim').change();

	res += getSelection();

	// ............................... Assert .................................
	assert.equal(res, "Jim:JIM(1)|new:NEW(2)|new:-(-1)|Jim:JIM(1)|",
		'<select data-link="selected">...<option data-link="value{:name} {:name.toUpperCase()}">');

	// ................................ Reset ................................
	$("#result").empty();

	// =============================== Arrange ===============================
	tmpl = $.templates('<select data-link="selected">{^{for people}}<option data-link="{:name.toUpperCase()} value{:name}"></option>{{/for}}</select>');

	model = {
		selected: "Jim",
		people: [
			{name: "Bob"},
			{name: "Jim"}
		]
	};

	// ............................... Act .................................
	tmpl.link("#result", model);

	res = getSelection();

	$.observable(model.people).insert({
		name: newName
	});

	$.observable(model).setProperty("selected", newName);

	res += getSelection();

	$.observable(model.people).remove(2);

	res += getSelection();

	$("#result select").val('Jim').change();

	res += getSelection();

	// ............................... Assert .................................
	assert.equal(res, "Jim:JIM(1)|new:NEW(2)|new:-(-1)|Jim:JIM(1)|",
		'<select data-link="selected">...<option data-link="{:name.toUpperCase()} value{:name}">');

	// ................................ Reset ................................
	$("#result").empty();

	// =============================== Arrange ===============================
	tmpl = $.templates({
		markup: '<select data-link="selected">{^{for items}}<option>{^{>#data}}</option>{{/for}}</select>',
		converters: {
			cvt: function (value) {
				return value
			}
		}
	});

	model = {
			selected: 4,
			items: []
		};

	// ............................... Act .................................
	tmpl.link("#result", model);

	res = getSelection();

	$.observable(model.items).insert(0, [4,5,6]);

	res += getSelection();

	// ............................... Assert .................................
	assert.equal(res, "4:-(-1)|4:4(0)|",
		'<select data-link="{cvt:selected:cvt}">{^{for items}}... Dynamic subsequent insertion of selected option');

	// =============================== Arrange ===============================
	tmpl = $.templates({
		markup: '<select data-link="{cvt:selected:cvt}">{^{for items}}<option>{^{>#data}}</option>{{/for}}</select>',
		converters: {
			cvt: function (value) {
				return value
			}
		}
	});

	model = {
			selected: 4,
			items: []
		};

	// ............................... Act .................................
	tmpl.link("#result", model);

	res = getSelection();

	$.observable(model.items).insert(0, [4,5,6]);

	res += getSelection();

	// ............................... Assert .................................
	assert.equal(res, "4:-(-1)|4:4(0)|",
		'<select data-link="{cvt:selected:cvt}">{^{for items}}... Dynamic subsequent insertion of selected option, with converters');

	// =============================== Arrange ===============================
	tmpl = $.templates({
		markup: '<select data-link="{:selected:cvt}">{^{for items}}<option>{^{>#data}}</option>{{/for}}</select>',
		converters: {
			cvt: function (value) {
				return value
			}
		}
	});

	model = {
			selected: 4,
			items: []
		};

	// ............................... Act .................................
	tmpl.link("#result", model);

	res = getSelection();

	$.observable(model.items).insert(0, [4,5,6]);

	res += getSelection();

	// ............................... Assert .................................
	assert.equal(res, "4:-(-1)|4:4(0)|",
		'<select data-link="{cvt:selected:cvt}">{^{for items}}... Dynamic subsequent insertion of selected option, with converterBack only');

	// ................................ Reset ................................
	$("#result").empty();

	// =============================== Arrange ===============================
	tmpl = $.templates({
		markup: '<select data-link="{cvt:selected:}">{^{for items}}<option>{^{>#data}}</option>{{/for}}</select>',
		converters: {
			cvt: function (value) {
				return value
			}
		}
	});

	model = {
			selected: 4,
			items: []
		};

	// ............................... Act .................................
	tmpl.link("#result", model);

	res = getSelection();

	$.observable(model.items).insert(0, [4,5,6]);

	res += getSelection();

	// ............................... Assert .................................
	assert.equal(res, "4:-(-1)|4:4(0)|",
		'<select data-link="{cvt:selected:cvt}">{^{for items}}... Dynamic subsequent insertion of selected option, with converter only');

	// ................................ Reset ................................
	$("#result").empty();

	// =============================== Arrange ===============================
	tmpl = $.templates('<select data-link="selected">{^{for items}}<option>{^{>#data}}</option>{{/for}}</select>');

	model = {
		selected: 4,
		items: [1,2,3],
		items2: [4,5,6]
};

	// ............................... Act .................................
	tmpl.link("#result", model);

	res = getSelection();

	$.observable(model).setProperty('items', model.items2);

	res += getSelection();

	// ............................... Assert .................................
	assert.equal(res, "4:-(-1)|4:4(0)|",
		'<select data-link="{cvt:selected:cvt}">{^{for items}}... Dynamic subsequent setting of data array with selected option');

	// ................................ Reset ................................
	$("#result").empty();

	// =============================== Arrange ===============================
	tmpl = $.templates('<select data-link="selected" multiple="multiple">{^{for people}}<option data-link="{:name.toUpperCase()} value{:name}"></option>{{/for}}</select>');

	model = {
		selected: ["Jim","Bob"],
		people: [
			{name: "Bob"},
			{name: "Jim"}
		]
	};

	// ............................... Act .................................
	tmpl.link("#result", model);

	res = $("#result select")[0].multiple + getSelection();

	$.observable(model.people).insert({
		name: newName
	});

	$.observable(model).setProperty("selected", [newName, "Bob"]);

	res += getSelection();

	$.observable(model.people).remove(2);

	res += getSelection();

	$.observable(model.people).insert([
		{
			name: "Pete"
		},
		{
			name: "Jo"
		}
	]);

	$("#result select").val(['Jo']).change();

	res += getSelection();

	$("#result select").val([]).change();

	res += getSelection();

	$("#result select").val(["Bob", "Pete", "Jim"]).change();

	res += getSelection();

	$.observable(model).setProperty("selected", "Bob");

	res += getSelection();

	// ............................... Assert .................................
	assert.equal(res, "trueJim,Bob:BOBJIM(0)|new,Bob:BOBNEW(0)|new,Bob:BOB(0)|Jo:JO(3)|:-(-1)|Bob,Jim,Pete:BOBJIMPETE(0)|Bob:BOB(0)|",
		'Multiselect with <select data-link="selected">...<option data-link="{:name.toUpperCase()} value{:name}">');

	// =============================== Arrange ===============================
	tmpl = $.templates('<select data-link="selected" multiple="multiple">{^{for people}}<option data-link="{:name} value{:id}"></option>{{/for}}</select>');

	model = {
		selected: "J",
		people: [
			{name: "Bob", id: "B"},
			{name: "Noone", id: ""},
			{name: "Jim", id: "J"}
		]
	};

	// ............................... Act .................................
	tmpl.link("#result", model);

	res = $("#result select")[0].multiple + $("#result select option:selected").text() + ":" + $("#result select")[0].selectedIndex + "|";

	$.observable(model).setProperty("selected", ["", "J"]);

	res += $("#result select option:selected").text() + ":" + $("#result select")[0].selectedIndex + "|";

	$.observable(model).setProperty("selected", "B");

	res += $("#result select option:selected").text() + ":" + $("#result select")[0].selectedIndex + "|";

	$.observable(model).setProperty("selected", []);

	res += $("#result select option:selected").text() + ":" + $("#result select")[0].selectedIndex + "|";

	$.observable(model).setProperty("selected", "");

	res += $("#result select option:selected").text() + ":" + $("#result select")[0].selectedIndex + "|";

	$.observable(model).setProperty("selected", ["J"]);

	res += $("#result select option:selected").text() + ":" + $("#result select")[0].selectedIndex + "|";

	$.observable(model).setProperty("selected", null);

	res += $("#result select")[0].multiple + $("#result select option:selected").text() + ":" + $("#result select")[0].selectedIndex + "|";

	// ............................... Assert .................................
	assert.equal(res, "trueJim:2|NooneJim:1|Bob:0|:-1|Noone:1|Jim:2|trueNoone:1|",
		'Multiselect with <select data-link="selected">...<option data-link="{:name.toUpperCase()} value{:name}">');

	// ................................ Reset ................................
	$("#result").empty();

	// =============================== Arrange ===============================
	function getContent() {
		$("#result input").each(function() {
			res += this.value;
		});
		res += $("#result").text() + "|";
	}

	tmpl = $.templates(
'<input data-link="foo"/>\
<input data-link="#data.foo"/>\
<input data-link="#view.data.foo"/>\
\
{^{:foo}}\
{^{:#data.foo}}\
{^{:#view.data.foo}}');

	// ............................... Act .................................
	tmpl.link("#result", {foo:"F"});

	var cnt = 0;
	res = "";
	getContent();

	$("#result input").each(function() {
		keydown($("#result input").val(cnt++));
	});

setTimeout(function() {
	getContent();

	assert.equal(res, "FFFFFF|222222|",
		'Two-way binding to foo, #data.foo #view.data.foo');

	// ................................ Reset ................................
	$("#result").empty();

done();
}, 0);
}, 0);

});

QUnit.test('data-link="{radiogroup}"', function(assert) {

	// =============================== Arrange ===============================

	var top =
	'<div data-link="{radiogroup selected}">'
		+ '<label><input type="radio" value="Bob"/>:Bob</label>'
		+ '<label><input type="radio" value="Jim"/>:Jim</label>'
	+ '</div>'
+ '<div data-link="{radiogroup selected}">'
		+ '<label><input type="radio" value="Bob"/>:Bob</label>'
		+ '<label><input type="radio" value="Jim"/>:Jim</label>'
	+ '</div>';

	$("#result").html(top);

	// ............................... Act .................................

	var model = {
			selected: "Jim"
		};

	$.link(true, "#result", model);

	res = $("#result input:checked").parent().text() + "|";

	$.observable(model).setProperty("selected", "Bob");

	res += $("#result input:checked").parent().text() + "|";

	$("#result input").eq(1).prop("checked", true).change(); // Check second radio button

	res += $("#result input:checked").parent().text() + "|" + model.selected;

	// ............................... Assert .................................
	assert.equal(res, ":Jim:Jim|:Bob:Bob|:Jim:Jim|Jim",
		'data-link="{radiogroup selected}" top-level');

	// ................................ Reset ................................
	$("#result").empty();

	// =============================== Arrange ===============================

	var top =
		'<div data-link="{for people tmpl=~itemTmpl} {radiogroup selected}"></div>'
	+ '<div data-link="{for people tmpl=~itemTmpl} {radiogroup selected}"></div>',

	tmpl = $.templates('<label><input type="radio" value="{{:name}}"/>:{{:name}}</label>'),

	model = {
			selected: "Jim",
			people: [
				{name: "Bob"},
				{name: "Jim"}
			]
		},

	newName = "new";

	$("#result").html(top);

	// ............................... Act .................................
	$.link(true, "#result", model, {itemTmpl: tmpl});

	res = $("#result input:checked").parent().text() + "|";

	$.observable(model.people).insert({
		name: newName
	});

	$.observable(model).setProperty("selected", newName);

	res += $("#result input:checked").parent().text() + "|";

	$.observable(model.people).remove(2);

	res += $("#result input:checked").parent().text() + "|";

	$("#result input").eq(1).prop("checked", true).change(); // Check first radio button

	res += model.selected + "-" + $("#result input:checked").parent().text() + "|";

	// ............................... Assert .................................
	assert.equal(res, ":Jim:Jim|:new:new||Jim-:Jim:Jim|",
		'data-link="{radiogroup selected}" ... {^{for ...}}...<input ... value="{{:name}}">');

	// =============================== Arrange ===============================
	tmpl = $.templates(
		'<div data-link="{radiogroup selected}">'
		+ '{^{for people}}'
			+ '<label><input type="radio" value="{{:name}}"/>:{{:name}}</label>'
		+ '{{/for}}'
	+ '</div>'
	);

	model = {
			selected: "Jim",
			people: [
				{name: "Bob"},
				{name: "Jim"}
			]
		},
		newName = "new";

	// ............................... Act .................................
	tmpl.link("#result", model);

	res = $("#result input:checked").parent().text() + "|";

	$.observable(model.people).insert({
		name: newName
	});

	$.observable(model).setProperty("selected", newName);

	res += $("#result input:checked").parent().text() + "|";

	$.observable(model.people).remove(2);

	res += $("#result input:checked").parent().text() + "|";

	$("#result input").first().prop("checked", true).change(); // Check first radio button

	res += model.selected + "-" + $("#result input:checked").parent().text() + "|";

	// ............................... Assert .................................
	assert.equal(res, ":Jim|:new||Bob-:Bob|",
		'data-link="{radiogroup selected}" ... {^{for ...}}...<input ... value="{{:name}}">');

	// ................................ Reset ................................
	$("#result").empty();

	// =============================== Arrange ===============================
	tmpl = $.templates(
		'<div data-link="{radiogroup selected}">'
		+ '<label><input type="radio" value="None"/>:NONE</label>'
		+ '{^{for people}}'
			+ '<label><input type="radio" value="{{:name}}" data-link="value^{:name}"/>:{^{:name^toUpperCase()}}</label>'
		+ '{{/for}}'
	+ '</div>'
	);

	model = {
		selected: "Jim",
		people: [
			{name: "Bob"},
			{name: "Jim"}
		]
	};

	// ............................... Act .................................
	tmpl.link("#result", model);

	res = $("#result input:checked").parent().text() + "|";

	$.observable(model.people).insert({
		name: newName
	});

	$.observable(model).setProperty("selected", newName);

	res += $("#result input:checked").parent().text() + "|";

	$.observable(model.people).remove(2);

	res += $("#result input:checked").parent().text() + "|";

	$("#result input").first().prop("checked", true).change(); // Check first radio button

	res += model.selected + "-" + $("#result input:checked").parent().text() + "|";

	// ............................... Assert .................................
	assert.equal(res, ":JIM|:NEW||None-:NONE|",
		'data-link="{radiogroup selected}" ... <input.../>...{^{for ...}}...<input ... data-link="name">');

	// ............................... Act .................................
	$.observable(model.people[1]).setProperty("name", "jimUpdated");

	res = $("#result").text() + "|";

	$("#result input").eq(2).prop("checked", true).change(); // Check third radio button

	res += model.selected + "-" + $("#result input:checked").parent().text() + "|";

	assert.equal(res, ":NONE:BOB:JIMUPDATED|jimUpdated-:JIMUPDATED|",
		'data-link="{radiogroup selected}" ... {^{for ...}}...<input ... data-link="name"> - updated label and value');

	// ................................ Reset ................................
	$("#result").empty();

	// =============================== Arrange ===============================
	tmpl = $.templates({markup:
		'<div data-link="{radiogroup selected convert=~lower convertBack=\'upper\' linkTo=selectedOut}">'
		+ '<label><input type="radio" value="none"/>:none</label>'
		+ '{^{for people}}'
			+ '<label><input type="radio" value="{{:name}}" data-link="value^{:name}"/>:{^{:name}}</label>'
		+ '{{/for}}'
	+ '</div>',
		converters: {
			upper: function(val) {
				return val.toUpperCase();
			}
		}
	});

	model = {
		selected: "JIM",
		people: [
			{name: "bob"},
			{name: "jim"}
		]
	};

	// ............................... Act .................................
	tmpl.link("#result", model, {
		lower: function(val) {
			return val.toLowerCase();
		}
	});

	res = $("#result input:checked").parent().text() + "|";

	$.observable(model.people).insert({
		name: newName
	});

	$.observable(model).setProperty("selected", newName);

	res += $("#result input:checked").parent().text() + "|";

	$.observable(model.people).remove(2);

	res += $("#result input:checked").parent().text() + "|";

	$("#result input").first().prop("checked", true).change(); // Check first radio button

	res += model.selected + "-" + model.selectedOut + "-" + $("#result input:checked").parent().text() + "|";

	// ............................... Assert .................................
	assert.equal(res, ":jim|:new||new-NONE-:none|",
		'data-link="{radiogroup selected convert=... convertBack=... linkTo=...}"');

	// ............................... Act .................................
	$.observable(model.people[1]).setProperty("name", "jimUpdated");

	res = $("#result").text() + "|";

	$("#result input").eq(2).prop("checked", true).change(); // Check third radio button

	res += model.selected + "-" + model.selectedOut + "-" + $("#result input:checked").parent().text() + "|";

	assert.equal(res, ":none:bob:jimUpdated|new-JIMUPDATED-:jimUpdated|",
		'data-link="{radiogroup selected convert=... convertBack=... linkTo=...}" - updated label and value');

	// ................................ Reset ................................
	$("#result").empty();

	// =============================== Arrange ===============================
	tmpl = $.templates(
		'<div data-link="{radiogroup selected}">'
		+ '<input type="radio" value="None" id="noneId"/>:<label for "noneId" id="noneIdLbl">NONE</label>'
		+ '{^{for people}}'
			+ '<input type="radio" value="{{:name}}" data-link="value^{:name} id{:name + \'Id\'}"/>:<label data-link="for{:name + \'Id\'} id{:name + \'IdLbl\'}{:name^toUpperCase()}"></label>'
		+ '{{/for}}'
	+ '</div>'
	);

	model = {
		selected: "Jim",
		people: [
			{name: "Bob"},
			{name: "Jim"}
		]
	};

	// ............................... Act .................................
	tmpl.link("#result", model);

	res = $("#" + $("#result input:checked").prop("id") + "Lbl").text() + "|";

	$.observable(model.people).insert({
		name: newName
	});

	$.observable(model).setProperty("selected", newName);

	res += $("#" + $("#result input:checked").prop("id") + "Lbl").text() + "|";

	$.observable(model.people).remove(2);

	res += $("#" + $("#result input:checked").prop("id") + "Lbl").text() + "|";

	$("#result input").first().prop("checked", true).change(); // Check first radio button

	res += model.selected + "-" + $("#" + $("#result input:checked").prop("id") + "Lbl").text() + "|";

	// ............................... Assert .................................
	assert.equal(res, "JIM|NEW||None-NONE|",
		'data-link="{radiogroup selected}" with labels by for/id');

	// ............................... Act .................................
	$.observable(model.people[1]).setProperty("name", "jimUpdated");

	res = $("#result").text() + "|";

	$("#result input").eq(2).prop("checked", true).change(); // Check third radio button

	res += model.selected + "-" + $("#" + $("#result input:checked").prop("id") + "Lbl").text() + "|";

	assert.equal(res, ":NONE:BOB:JIMUPDATED|jimUpdated-JIMUPDATED|",
		'data-link="{radiogroup selected}" with labels by for/id - updated label and value');

	// ................................ Reset ................................
	$("#result").empty();

	// =============================== Arrange ===============================
	tmpl = $.templates(
		'<div data-link="{radiogroup selected}">'
		+ '<label><input type="radio" value="None"/>:NONE</label>'
		+ '{^{for people}}'
			+ '<label><input type="radio" value="{{:name}}" data-link="value^{:name}"/>:{^{:name^toUpperCase()}}</label>'
		+ '{{/for}}'
	+ '</div>'
	+ '<div data-link="{radiogroup selected}">'
		+ '<label><input type="radio" value="None"/>:NONE</label>'
		+ '{^{for people}}'
			+ '<label><input type="radio" value="{{:name}}" data-link="value^{:name}"/>:{^{:name^toUpperCase()}}</label>'
		+ '{{/for}}'
	+ '</div>'
	);

	model = {
		selected: "Jim",
		people: [
			{name: "Bob"},
			{name: "Jim"}
		]
	};

	// ............................... Act .................................
	tmpl.link("#result", model);

	res = $("#result input:checked").parent().text() + "|";

	$.observable(model.people).insert({
		name: newName
	});

	$.observable(model).setProperty("selected", newName);

	res += $("#result input:checked").parent().text() + "|";

	$.observable(model.people).remove(2);

	res += $("#result input:checked").parent().text() + "|";

	$("#result input").first().prop("checked", true).change(); // Check first radio button

	res += model.selected + "-" + $("#result input:checked").parent().text() + "|";

	// ............................... Assert .................................
	assert.equal(res, ":JIM:JIM|:NEW:NEW||None-:NONE:NONE|",
		'data-link="{radiogroup selected}" - two radiogroups with same selected bindings');

	// ............................... Act .................................
	$.observable(model.people[1]).setProperty("name", "jimUpdated");

	res = $("#result").text() + "|";

	$("#result input").eq(2).prop("checked", true).change(); // Check third radio button

	res += model.selected + "-" + $("#result input:checked").parent().text() + "|";

	assert.equal(res, ":NONE:BOB:JIMUPDATED:NONE:BOB:JIMUPDATED|jimUpdated-:JIMUPDATED:JIMUPDATED|",
		'data-link="{radiogroup selected}" - two radiogroups with same selected bindings - updated label and value');

	// ................................ Reset ................................
	$("#result").empty();

	// =============================== Arrange ===============================
	tmpl = $.templates(
		'<div data-link="{radiogroup selected}">'
		+ '{^{for people}}'
			+ '<label><input type="radio" value="{{:name}}" data-link="value^{:name}"/>:{^{:name^toUpperCase()}}</label>'
		+ '{{/for}}'
	+ '</div>'
	+ '<div data-link="{radiogroup selected}">'
		+ '<label><input type="radio" value="None"/>:NONE</label>'
		+ '{^{for people}}'
			+ '<label><input type="radio" value="{{:name}}" data-link="value^{:name}"/>:{^{:name^toUpperCase()}}</label>'
		+ '{{/for}}'
	+ '</div>'
	);

	model = {
		selected: "Jim",
		people: []
	};

	// ............................... Act .................................
	tmpl.link("#result", model);

	res = $("#result").text() + "|" + $("#result input:checked").parent().text() + "|";

	$.observable(model.people).insert([{name: "Bob"},{name: "Jim"},{name: "newName"}]);

	res += $("#result").text() + "|" + $("#result input:checked").parent().text() + "|";

	$.observable(model).setProperty("selected", newName);

	res += $("#result input:checked").parent().text() + "|";

	$.observable(model.people).remove(2);

	res += $("#result input:checked").parent().text() + "|";

	$("#result input").first().prop("checked", true).change(); // Check first radio button

	res += model.selected + "-" + $("#result input:checked").parent().text() + "|";

	// ............................... Assert .................................
	assert.equal(res, ":NONE||:BOB:JIM:NEWNAME:NONE:BOB:JIM:NEWNAME|:JIM:JIM|||Bob-:BOB:BOB|",
		'data-link="{radiogroup selected}" - two radiogroups with same selected bindings - starting out with no items, so no radio buttons');

	// ................................ Reset ................................
	$("#result").empty();

	// =============================== Arrange ===============================
	tmpl = $.templates(
		'<div data-link="{radiogroup selected name=\'rad1\'}">'
		+ '{^{for people}}'
			+ '<label><input type="radio" value="{{:name}}" data-link="value^{:name}"/>:{^{:name^toUpperCase()}}</label>'
		+ '{{/for}}'
	+ '</div>'
	+ '<div data-link="{radiogroup selected name=\'rad1\'}">'
		+ '<label><input type="radio" value="None" name="rad2"/>:NONE</label>'
		+ '{^{for people}}'
			+ '<label><input type="radio" value="{{:name}}" data-link="value^{:name}" name="rad2"/>:{^{:name^toUpperCase()}}</label>'
		+ '{{/for}}'
	+ '</div>'
	);

	model = {
		selected: "Jim",
		people: []
	};

	// ............................... Act .................................
	tmpl.link("#result", model);

	res = $("#result").text() + "|" + $("#result input:checked").parent().text() + "|";

	$.observable(model.people).insert([{name: "Bob"},{name: "Jim"},{name: "newName"}]);

	res += $("#result").text() + "|" + $("#result input:checked").parent().text() + "|";

	$.observable(model).setProperty("selected", newName);

	res += $("#result input:checked").parent().text() + "|";

	$.observable(model.people).remove(2);

	res += $("#result input:checked").parent().text() + "|";

	$("#result input").first().prop("checked", true).change(); // Check first radio button

	res += model.selected + "-" + $("#result input:checked").parent().text() + "|" + $("#result input:checked")[0].name + "|" + $("#result input:checked")[1].name;

	// ............................... Assert .................................
	assert.equal(res, ":NONE||:BOB:JIM:NEWNAME:NONE:BOB:JIM:NEWNAME|:JIM:JIM|||Bob-:BOB:BOB|rad1|rad2",
		'data-link="{radiogroup selected}" - name for group can be specified rather than auto-generated - on item or on radiogroup tag');

	// ................................ Reset ................................
	$("#result").empty();

});

QUnit.test('data-link="{tag...}"', function(assert) {

	// ................................ Reset ................................
	$("#result").empty();
	person1._firstName = "Jo"; // reset Prop
	person1.lastName = "One"; // reset Prop
	settings.title = "Mr"; // reset Prop
	settings.width = 30; // reset Prop

	// =============================== Arrange ===============================
	$.views.tags({
		norendernotemplate: {},
		voidrender: function() {},
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
	assert.equal($("#result").text(), "ab",
	"non-rendering tag (no template, no render function) renders empty string");

	$.templates('a<span date-link="{voidrender}"></span>b').link("#result", 1);
	assert.equal($("#result").text(), "ab",
	"non-rendering tag (no template, no return from render function) renders empty string");

	$.templates('a<span date-link="{emptyrender}"></span>b').link("#result", 1);
	assert.equal($("#result").text(), "ab",
	"non-rendering tag (no template, empty string returned from render function) renders empty string");

	$.templates('a<span date-link="{emptytemplate}"></span>b').link("#result", 1);
	assert.equal($("#result").text(), "ab",
	"non-rendering tag (template has no content, no render function) renders empty string");

	$.templates('a<span date-link="{templatereturnsempty}"></span>b').link("#result", 1);
	assert.equal($("#result").text(), "ab",
	"non-rendering tag (template returns empty string, no render function) renders empty string");

	// =============================== Arrange ===============================

	$.templates('<span data-link="{tmplTag}"></span>')
		.link("#result", person1, {settings: settings});

	// ................................ Act ..................................
	before = $("#result span").text();
	$.observable(person1).setProperty({firstName: "newFirst", lastName: "newLast"});
	$.observable(settings).setProperty({title: "Sir", width: 40});
	$.observable(person1).setProperty({fullName: "compFirst compLast"});
	after = $("#result span").text();

	// ............................... Assert .................................
	assert.equal(before + "|" + after,
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
		.link("#result", person1, {settings: settings});

	// ................................ Act ..................................
	before = $("#result span").text();
	$.observable(person1).setProperty({firstName: "newFirst", lastName: "newLast"});
	$.observable(settings).setProperty({title: "Sir", width: 40});
	$.observable(person1).setProperty({fullName: "compFirst compLast"});
	after = $("#result span").text();

	// ............................... Assert .................................
	assert.equal(before + "|" + after,
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
		.link("#result", person1, {settings: settings});

	// ................................ Act ..................................
	before = $("#result div").html();
	$.observable(person1).setProperty({firstName: "newFirst", lastName: "newLast"});
	$.observable(settings).setProperty({title: "Sir", width: 40});
	$.observable(person1).setProperty({fullName: "compFirst compLast"});
	after = $("#result div").html();

	// ............................... Assert .................................
	assert.equal((before + "|" + after).replace(/<script.*?><\/script>/g, ""),
	'<span>Name: Mr Jo. Width: 30</span>|<span>Name: Sir compFirst. Width: 40</span>',
	'Data link fnTagEl rendering <span>, using: <div data-link="{fnTagEl}"></div>');

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
	$.observable(settings).setProperty({title: "Sir", width: 40});
	$.observable(person1).setProperty({fullName: "compFirst compLast"});
	after = $("#result ul li").html();

	// ............................... Assert .................................
	assert.equal(before + "|" + after,
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
		.link("#result", person1, {settings: settings});

	// ................................ Act ..................................
	before = $("#result ul li").html(); // The innerHTML will be "<li data-jsv=\"#25_\">Name: Mr Jo. Width: 30</li>"
	$.observable(person1).setProperty({firstName: "newFirst", lastName: "newLast"});
	$.observable(settings).setProperty({title: "Sir", width: 40});
	$.observable(person1).setProperty({fullName: "compFirst compLast"});
	after = $("#result ul li").html();

	// ............................... Assert .................................
	assert.equal(before + "|" + after,
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
		.link("#result", person1, {settings: settings});

	// ................................ Act ..................................
	before = $("#result span").text();
	$.observable(person1).setProperty({firstName: "newFirst", lastName: "newLast", "home.address.street": "newStreet"});
	$.observable(settings).setProperty({title: "Sir", width: 40, reverse: false});
	$.observable(person1).setProperty({fullName: "compFirst compLast"});
	after = $("#result span").text();

	// ............................... Assert .................................
	assert.equal(before + "|" + after,
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
		.link("#result", person1, {settings: settings});

	// ................................ Act ..................................
	before = $("#result span").text();
	$.observable(person1).setProperty({firstName: "newFirst", lastName: "newLast", "home.address.street": "newStreet"});
	$.observable(settings).setProperty({title: "Sir", width: 40, reverse: false});
	$.observable(person1).setProperty({fullName: "compFirst compLast"});
	after = $("#result span").text();

	// ............................... Assert .................................
	assert.equal(before + "|" + after,
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

QUnit.test("Computed observables in paths", function(assert) {
	$.views.settings.advanced({_jsv: true}); // For using cbBindings store

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
		assert.equal(ret, "onetwothree|one1a1btwothree|onetwothree|onetwo2a2bthree|onetwothree|addedonetwothree|onetwothree|",
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
		people1 = [{address: {street: "1 first street"}}],
		people2 = [{address: {street: "1 second street"}}, {address: {street: "2 second street"}}],
		data1 = {value: "data1", people: people1},
		data2 = {value: "data2", people: people2};
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
		return [this, "alt"]; // this is app
	};

	function getData(type) {
		return this.alt ? data2 : data1;
	}

	getData.depends = function(data) {
		return [data, "alt"]; // data === this === app
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
	assert.equal(ret, "||1 first street|1 first streetB|1 first swappedstreet|1 second street|2 second street|2 second swappedstreet|2 second swappedstreetB",
		"deep paths with computed observables bind correctly to rest of path after computed returns new array");
	$("#result").empty();

	app.alt = false;
	app.index = 0;
	people1 = [{address: {street: "1 first street"}}, {address: {street: "2 first street"}}];
	people2 = [{address: {street: "1 second street"}}, {address: {street: "2 second street"}}];
	data1 = {value: "data1", people: people1};
	data2 = {value: "data2", people: people2};

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
	$.observable(people1[0]).setProperty("address", {street: "1 first swappedstreet"});
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
	assert.equal(ret, "1 first street|2 first street|1 first street|1 first streetB|1 first swappedstreet|1 second street|2 second street|2 second swappedstreet|2 second swappedstreetB",
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
	people1 = [{address: {street: "1 first street"}}];
	people2 = [{address: {street: "1 second street"}}, {address: {street: "2 second street"}}];
	data1 = {value: "val1", people: people1, getValue: getValue};
	data2 = {value: "val2", people: people2, getValue: getValue};

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
	ret += "|L: " + !!$._data(data1).events + " " + !!$._data(data1).events + " " + (JSON.stringify(_jsv.cbBindings) === "{}");
	// |L: false false true
	// ................................ Assert ..................................
	assert.equal(ret,
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

	// =============================== Arrange ===============================

	ret = "";
	var model = {
		enabled: function(val) {
			if (!arguments.length) {
				return this._enabled + this._selected + this._colored;
			}
			this._enabled = val;
		},
		selected: function(val) {
			if (!arguments.length) {
				return this._selected;
			}
			this._selected = val;
		},
		colored: function(val) {
			if (!arguments.length) {
				return this._colored;
			}
			this._colored = val;
		},
		_colored: "C",
		_enabled: "E",
		_selected: "S"
	};

	model.selected.set = model.colored.set = model.enabled.set = true;

	model.enabled.depends = [,"selected"];

	$.templates('<div data-link="enabled()"></div>').link("#result", model);

	// ................................ Act ..................................

	ret = $._data(model).events.propertyChange.length + "_";

	$.observable(model).setProperty("selected", "s2");

	ret += $("#result").text();

	assert.equal(ret, "1_ESC", 'Computed function with depends = [undefined,"selected"] - no listener added');

	// ................................ Reset ................................
	model.selected("S");
	$("#result").empty();

	// =============================== Arrange ===============================

	model.enabled.depends = [,"selected", model, "colored"];

	$.templates('<div data-link="enabled()"></div>').link("#result", model);

	// ................................ Act ..................................

	ret = $._data(model).events.propertyChange.length + "_";

	$.observable(model).setProperty("selected", "s2");

	ret += $("#result").text() + "_";

	$.observable(model).setProperty("colored", "c3");

	ret += $("#result").text();

	assert.equal(ret, "2_ESC_Es2c3", 'Computed function with depends = [undefined,"selected", model, "colored"] - has listener for "colored" only');

	// ................................ Reset ................................
	model.selected("S");
	model.colored("C");
	$("#result").empty();

	// =============================== Arrange ===============================

	model.enabled.depends = ["enabled"];

	$.templates('<div data-link="enabled()"></div>').link("#result", model);

	// ................................ Act ..................................

	ret = $._data(model).events.propertyChange.length + "_";

	$.observable(model).setProperty("enabled", "e2");

	ret += $("#result").text();

	assert.equal(ret, "1_e2SC", "Computed function with circular depends - no stack overflow - handler skipped");

	// ................................ Reset ................................
	$("#result").empty();

	$.views.settings.advanced({_jsv: false});
});

QUnit.test("Computed observables in $.link() expressions", function(assert) {

	(function() {
		// =============================== Arrange ===============================
		var res = "";

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

		var helpers = {alt: false};

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
			}
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
			res += " |" + label + ": " + $("#inner").text();
		}

		function changeObtype(label) {
			$.observable(person.ob()).setProperty("obtype", person.ob().obtype + "@");
			res += " |" + label + ": " + $("#inner").text();
		}

		function changeAddress(label) {
			$.observable(person.ob().home).setProperty("address", {street: person.ob().home.address().street + "+"});
			res += " |" + label + ": " + $("#inner").text();
		}

		function changeStreet(label) {
			$.observable(person.ob().home.address()).setProperty("street", person.ob().home.address().street + ">");
			res += " |" + label + ": " + $("#inner").text();
		}

		$.link("ob()^obtype", "#inner", person, {helpers: helpers});

		// ................................ Act ..................................

		changeAlt(1);
		changeObtype(2);
		changeAlt(3);
		changeObtype(4);
		changeAlt(5);

		// ............................... Assert .................................
		assert.equal(res, " |1: b |2: b@ |3: a |4: a@ |5: b@", "complex");

		// ................................ Reset ................................
		$("#result").empty();
	})();

	(function() {
		// =============================== Arrange ===============================
		var res = "";

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

		var helpers = {alt: false};

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
			}
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
			res += " |" + label + ": " + $("#inner").text();
		}

		function changeObtype(label) {
			$.observable(person.ob(helpers.alt)).setProperty("obtype", person.ob(helpers.alt).obtype + "@");
			res += " |" + label + ": " + $("#inner").text();
		}

		function changeAddress(label) {
			$.observable(person.ob(helpers.alt).home).setProperty("address", {street: person.ob(helpers.alt).home.address().street + "+"});
			res += " |" + label + ": " + $("#inner").text();
		}

		function changeStreet(label) {
			$.observable(person.ob(helpers.alt).home.address()).setProperty("street", person.ob(helpers.alt).home.address().street + ">");
			res += " |" + label + ": " + $("#inner").text();
		}

		$.link("ob(~helpers.alt)^home.address().street", "#inner", person, {helpers: helpers});

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
		assert.equal(res, " |1: A+ |2: A+> |3: A+>+ |4: A+>+> |5: B |6: B+ |7: B+> |8: B+>+ |9: B+>+> |10: A+>+> |11: A+>+>> |12: A+>+>>+ |13: A+>+>>+> |14: A+>+>>+>+ |15: B+>+>", "complex");

		// ................................ Reset ................................
		$("#result").empty();
	})();

	(function() {
		// =============================== Arrange ===============================
		var res = "";

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

		var helpers = {alt: false};

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
			}
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
			res += " |" + label + ": " + $("#inner").text();
		}

		function changeObtype(label) {
			$.observable(person.ob()).setProperty("obtype", person.ob().obtype + "@");
			res += " |" + label + ": " + $("#inner").text();
		}

		function changeAddress(label) {
			$.observable(person.ob().home).setProperty("address", {street: person.ob().home.address().street + "+"});
			res += " |" + label + ": " + $("#inner").text();
		}

		function changeStreet(label) {
			$.observable(person.ob().home.address()).setProperty("street", person.ob().home.address().street + ">");
			res += " |" + label + ": " + $("#inner").text();
		}

		$.link("ob()^home.address().street", "#inner", person, {helpers: helpers});

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
		assert.equal(res, " |1: A+ |2: A+> |3: A+>+ |4: A+>+> |5: B2 |6: B2+ |7: B2+> |8: B2+>+ |9: B2+>+> |10: A+>+> |11: A+>+>> |12: A+>+>>+ |13: A+>+>>+> |14: A+>+>>+>+ |15: B2+>+>", "complex");

		// ................................ Reset ................................
		$("#result").empty();
	})();

});

QUnit.test("Computed observables in two-way binding", function(assert) {
var done = assert.async();

	// =============================== Arrange ===============================
	var fullName = function(reversed) {
		return reversed
			? this.lastName + " " + this.firstName
			: this.firstName + " " + this.lastName;
	};

	var person = {
		firstName: "Jeff",
		lastName: "Smith",
		fullName: fullName
	};

	fullName.depends = "*";

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

	keydown($("#full").val("2wayFirst 2wayLast"));

setTimeout(function() {
	res += "|" + $("#result").text() + $("#full").val();

	// ............................... Assert .................................
	assert.equal(res,
	"Jeff Smith Jeff Smith Smith Jeff Jeff Smith|newFirst newLast newFirst newLast newLast newFirst newFirst newLast|compFirst compLast compFirst"
		+ " compLast compLast compFirst compFirst compLast|2wayFirst 2wayLast 2wayFirst 2wayLast 2wayLast 2wayFirst 2wayFirst 2wayLast",
	'Two-way binding to a computed observable data property correctly calls the setter');

	// ................................ Reset ................................
	$("#result").empty();

	// =============================== Arrange ===============================
	fullName = function(reversed) {
			return reversed
				? this.lastName + " " + this.firstName()
				: this.firstName() + " " + this.lastName;
		};

	fullName.depends = ["firstName", "lastName"];

	fullName.set = function(val) {
		val = val.split(" ");
		$.observable(this).setProperty({
			lastName: val.pop(),
			firstName: val.join(" ")
		});
	};

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

	$.templates('{^{:firstName()}} {^{:lastName}} {^{:fullName()}} {^{:fullName(true)}} <input id="full" data-link="fullName()"/>')
		.link("#result", person);

	// ................................ Act ..................................
	res = $("#result").text() + $("#full").val();

	$.observable(person).setProperty({firstName: "newFirst", lastName: "newLast"});

	res += "|" + $("#result").text() + $("#full").val();

	$.observable(person).setProperty({fullName: "compFirst compLast"});

	res += "|" + $("#result").text() + $("#full").val();

	keydown($("#full").val("2wayFirst 2wayLast"));

setTimeout(function() {
	res += "|" + $("#result").text() + $("#full").val();

	// ............................... Assert .................................
	assert.equal(res,
	"Jeff Smith Jeff Smith Smith Jeff Jeff Smith|newFirst newLast newFirst newLast newLast newFirst newFirst newLast|compFirst compLast compFirst"
		+ " compLast compLast compFirst compFirst compLast|2wayFirst 2wayLast 2wayFirst 2wayLast 2wayLast 2wayFirst 2wayFirst 2wayLast",
	'Two-way binding to a computed observable data property defined on the prototype correctly calls the setter');

	// ................................ Reset ................................
	$("#result").empty();

	// =============================== Arrange ===============================
	fullName = function(reverse) {
		var person = this.data; // this pointer is the view
		return reverse
			? person.lastName + " " + person.firstName
			: person.firstName + " " + person.lastName;
	}

	fullName.depends = function(data) {
		return [this, "firstName", data, "lastName"]; // this and data are both contextual data object
	};

	fullName.set = function(val) {
		val = val.split(" ");
		var person = this.data; // this pointer is the view
		$.observable(person).setProperty({
			lastName: val.pop(),
			firstName: val.join(" ")
		});
	};

	var people = [
	{
		firstName: "Jeff",
		lastName: "Friedman"
	},
	{
		firstName: "Rose",
		lastName: "Lee"
	}
	];

	$.templates('{^{:firstName}} {^{:lastName}} {^{:~fullName()}} {^{:~fullName(true)}} <input id="full{{:#index}}" data-link="~fullName()"/>')
		.link("#result", people, {fullName: fullName});

	// ................................ Act ..................................
	res = $("#result").text() + ":" + $("#full0").val();

	$.observable(people[0]).setProperty({firstName: "newFirst", lastName: "newLast"});

	res += "|" + $("#result").text() + ":" + $("#full0").val();

	keydown($("#full0").val("2wayFirst 2wayLast"));

setTimeout(function() {
	res += "|" + $("#result").text() + ":" + $("#full0").val();

	// ............................... Assert .................................
	assert.equal(res,
	"Jeff Friedman Jeff Friedman Friedman Jeff Rose Lee Rose Lee Lee Rose :Jeff Friedman|"
	+ "newFirst newLast newFirst newLast newLast newFirst Rose Lee Rose Lee Lee Rose :newFirst newLast|"
	+ "2wayFirst 2wayLast 2wayFirst 2wayLast 2wayLast 2wayFirst Rose Lee Rose Lee Lee Rose :2wayFirst 2wayLast",
	'Two-way binding to a computed observable data property passed in as helper calls the setter');

	// ................................ Reset ................................
	$("#result").empty();

	// =============================== Arrange ===============================
	// See https://github.com/BorisMoore/jsviews/issues/287
	// From Paul Martin pull request: https://github.com/Paul-Martin/jsviews.com/commit/10d716ccd0d6478dea042faeeca64bf44e4642ed

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
	res = "";
	var input1 = $("#one input"),
		input2 = $("#two input"),
		span1 = $("#one span"),
		span2 = $("#two span"),

		getResult = function() {
			res += input1.val() + " " + span1.text() + " " + input2.val() + " " + span2.text() + "|";
		};

	getResult();

	keydown(input1.val('onechange'));

setTimeout(function() {
	getResult();

	keydown(input2.val('twochange'));

setTimeout(function() {
	getResult();

	$.observable(o1.a()).setProperty('b', 'oneupdate');

	getResult();

	$.observable(o2.a()).setProperty('b', 'twoupdate');

	getResult();

	// ............................... Assert .................................
	assert.equal(res,
		"one one two two|"
	+ "onechange onechange two two|"
	+ "onechange onechange twochange twochange|"
	+ "oneupdate oneupdate twochange twochange|"
	+ "oneupdate oneupdate twoupdate twoupdate|",
	'Two-way bindings with chained computed observables remain independent when same template links to multiple target elements');

	// ................................ Reset ................................
	$("#result").empty();

	// =============================== Arrange ===============================
	people = [
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

	tmpl = $.templates(
		"<div class='person{{:#index}}'>"
			+ "<input class='name' data-link='ob().name' /> <span class='name'>{^{:ob().name}}</span>"
			+ "<input class='street' data-link='ob().address().street'/> <span class='street'>{^{:ob().address().street}}</span>"
		+ "</div>");

	tmpl.link("#result", people);

	// ................................ Act ..................................
	res = "";
	var nameInput0 = $("#result .person0 input.name"),
		nameSpan0 = $("#result .person0 span.name"),
		streetInput0 = $("#result .person0 input.street"),
		streetSpan0 = $("#result .person0 span.street"),
		nameInput1 = $("#result .person1 input.name"),
		nameSpan1 = $("#result .person1 span.name"),
		streetInput1 = $("#result .person1 input.street"),
		streetSpan1 = $("#result .person1 span.street");

	getResult = function() {
		res += nameInput0.val() + " " + nameSpan0.text() + " " + streetInput0.val() + " " + streetSpan0.text() + " " + nameInput1.val() + " " + nameSpan1.text() + " " + streetInput1.val() + " " + streetSpan1.text() + "|";
	}

	getResult();

	keydown(nameInput0.val('n0new'));

setTimeout(function() {
	getResult();

	keydown(nameInput1.val('n1new'));

setTimeout(function() {
	getResult();

	keydown(streetInput0.val('s0new'));

setTimeout(function() {
	getResult();

	keydown(streetInput1.val('s1new'));

setTimeout(function() {
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
	assert.equal(res,
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

	// =============================== Arrange ===============================
	people = [
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

	tmpl = $.templates(
		"{^{for people}}<div class='person{{:#index}}'>"
			+ "<input class='name' data-link='ob().name' /> <span class='name'>{^{:ob().name}}</span>"
			+ "<input class='street' data-link='ob().address().street'/> <span class='street'>{^{:ob().address().street}}</span>"
		+ "</div>{{/for}}");

	tmpl.link("#result", {people: people});

	// ................................ Act ..................................
	res = "";
	nameInput0 = $("#result .person0 input.name");
	nameSpan0 = $("#result .person0 span.name");
	streetInput0 = $("#result .person0 input.street");
	streetSpan0 = $("#result .person0 span.street");
	nameInput1 = $("#result .person1 input.name");
	nameSpan1 = $("#result .person1 span.name");
	streetInput1 = $("#result .person1 input.street");
	streetSpan1 = $("#result .person1 span.street");

	getResult = function() {
		res += nameInput0.val() + " " + nameSpan0.text() + " " + streetInput0.val() + " " + streetSpan0.text() + " " + nameInput1.val() + " " + nameSpan1.text() + " " + streetInput1.val() + " " + streetSpan1.text() + "|";
	};

	getResult();

	keydown(nameInput0.val('n0new'));

setTimeout(function() {
	getResult();

	keydown(nameInput1.val('n1new'));

setTimeout(function() {
	getResult();

	keydown(streetInput0.val('s0new'));

setTimeout(function() {
	getResult();

	keydown(streetInput1.val('s1new'));

setTimeout(function() {
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
		ob: function() {return this; },
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
	assert.equal(res,
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

	// =============================== Arrange ===============================
	people = [
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

	tmpl = $.templates(
		"<div class='person{{:#index}}'>"
			+ "<input class='name' data-link='ob().name linkTo=ob().address().street' /> <span class='name'>{^{:ob().name}}</span>"
			+ "<input class='street' data-link='ob().address().street linkTo=ob().name'/> <span class='street'>{^{:ob().address().street}}</span>"
		+ "</div>");

	tmpl.link("#result", people);

	// ................................ Act ..................................
	res = "";
	nameInput0 = $("#result .person0 input.name");
	nameSpan0 = $("#result .person0 span.name");
	streetInput0 = $("#result .person0 input.street");
	streetSpan0 = $("#result .person0 span.street");
	nameInput1 = $("#result .person1 input.name");
	nameSpan1 = $("#result .person1 span.name");
	streetInput1 = $("#result .person1 input.street");
	streetSpan1 = $("#result .person1 span.street");

	getResult = function() {
		res += nameInput0.val() + " " + nameSpan0.text() + " " + streetInput0.val() + " " + streetSpan0.text() + " " + nameInput1.val() + " " + nameSpan1.text() + " " + streetInput1.val() + " " + streetSpan1.text() + "|";
	};

	getResult();

	keydown(nameInput0.val('n0new'));

setTimeout(function() {
	getResult();

	keydown(nameInput1.val('n1new'));

setTimeout(function() {
	getResult();

	keydown(streetInput0.val('s0new'));

setTimeout(function() {
	getResult();

	keydown(streetInput1.val('s1new'));

setTimeout(function() {
	getResult();

	// ............................... Assert .................................
	assert.equal(res,
	"n0 n0 s0 s0 n1 n1 s1 s1|"
	+ "n0new n0 n0new n0new n1 n1 s1 s1|"
	+ "n0new n0 n0new n0new n1new n1 n1new n1new|"
	+ "s0new s0new s0new n0new n1new n1 n1new n1new|"
	+ "s0new s0new s0new n0new s1new s1new s1new n1new|",
	'Two-way bindings with chained computed observables using linkTo remain independent when same template links different elements of an array');

	// ................................ Reset ................................
	$("#result").empty();

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

	people = [
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

	tmpl = $.templates(
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
	res = "";
	var toStreet1_0 = $("#result .person0 input.toStreet1"),
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

	getResult = function(name) {
		res += name + ":" + spanStreet1_0.text() + " " + spanStreet2_0.text() + " " + street1_0.val() + " " + street2_0.val() + " " + streetA_0.val() + " " + streetB_0.val()
		+ " " + spanStreet1_1.text() + " " + spanStreet2_1.text() + " " + street1_1.val() + " " + street2_1.val() + " " + streetA_1.val() + " " + streetB_1.val() + "|";
	};

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

	keydown(toStreet1_0.val("new1"));

setTimeout(function() {
	getResult(9);

	keydown(toStreet2_0.val("new2"));

setTimeout(function() {
	getResult(10);

	keydown(toStreetA_0.val("new3"));

setTimeout(function() {
	getResult(11);

	keydown(toStreetB_0.val("new4"));

setTimeout(function() {
	getResult(12);

	keydown(toStreet1_1.val("new5"));

setTimeout(function() {
	getResult(13);

	keydown(toStreet2_1.val("new6"));

setTimeout(function() {
	getResult(14);

	keydown(toStreetA_1.val("new7"));

setTimeout(function() {
	getResult(15);

	keydown(toStreetB_1.val("new8"));

setTimeout(function() {
	getResult(16);

	// ............................... Assert .................................
	assert.equal(res,
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

done();
}, 0);
}, 0);
}, 0);
}, 0);
}, 0);
}, 0);
}, 0);
}, 0);
}, 0);
}, 0);
}, 0);
}, 0);
}, 0);
}, 0);
}, 0);
}, 0);
}, 0);
}, 0);
}, 0);
}, 0);
}, 0);
}, 0);
}, 0);
}, 0);
}, 0);
});

QUnit.test("Chained computed observables in template expressions", function(assert) {

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
		assert.equal(res, "None: A |Street: A> |Address: A>+ |Home: A>+$ |Ob: A>+$0 |Alt: B |Home: B$ |Address: B$+ |Street: B$+> |Person: xB |"
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
		assert.equal(res, "None: A |Street: A> |Address: A>+ |Home: A>+$ |Ob: A>+$0 |Alt: B |Home: B$ |Address: B$+ |Street: B$+> |Person: B$+> |Street: B$+> |Address: B$+> |Home: B$+> |Ob: B$+> |Alt: xA |",
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
		assert.equal(res, "None: A |Street: A> |Address: A>+ |Home: A>+$ |Ob: A>+$ |Street: A>+$ |Address: A>+$ |Home: A>+$ |Alt: A>+$ |",
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
		assert.equal(res, "None: A |Street: A> |Address: A>+ |Home: A>+ |Street: A>+ |Address: A>+ |Alt: A>+ |",
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
		assert.equal(res, "None: A |Street: A> |Address: A> |Street: A> |Alt: A> |",
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
		assert.equal(res, "None: TA |Street: TA> |Type: T$A> |Person: T2A2 |Type: T2$A2 |Street: T2$A2> |",
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

		var res, person, data;

		function setData() {
			res = "";

			person = {
				ob: ob,
				_ob: {
					street: "A",
					type: "T"
				}
			};
			data = {person: person};
		}

		function changeOb() {
			$.observable(data.person).setProperty("ob", {
				street: data.person._ob.street + "+",
				type: data.person._ob.type + "+"
			});
		}

		function changeStreet() {
			$.observable(data.person.ob()).setProperty("street", data.person.ob().street + ">");
		}

		function changeType() {
			$.observable(data.person.ob()).setProperty("type", data.person.ob().type + "$");
		}

		function getResult(name) {
			res += name + ": " + $("#result").text() + " |";
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
		assert.equal(res, "None: AT |Street: A>T |Type: A>T$ |Ob: A>+T$+ |Type: A>+T$+$ |Street: A>+>T$+$ |",
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
		assert.equal(res, "None: 46A |Street: 46A> |Address: 46A>+ |Home: 46A>+$ |D: 52A>+$ |Index3: 58A>+$ |A: 60A>+$ |Index2: 50A>+$ |Ob: 50A>+$0 |Alt: 50B |Home: 50B$ |Address: 50B$+ |Street: 50B$+> |Person: 50xB |Home: 50xB$ |Street: 50xB$> |Address: 50xB$>+ |Ob: 50xB$>+1 |Home: 50xB$>+1$ |Index1: 54xB$>+1$ |A: 56xB$>+1$ |D: 62xB$>+1$ |Street: 62xB$>+1$> |Address: 62xB$>+1$>+ |",
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
						return setting + mode + this.ctxPrm("sectionTypes")[0];
					}
				}
			});

		// ................................ Act ..................................
		tmpl.link("#result", data, helpers);

		getResult("None");

		$.observable(data).setProperty("type", "n");

		getResult("type");

		// ............................... Assert .................................
		assert.equal(res, "None: Am22 |type: Am22 |",
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
						return setting + mode + this.ctxPrm("sectionTypes")[0];
					}
				}
			});

		// ................................ Act ..................................
		tmpl.link("#result", data, helpers);

		getResult("None");

		$.observable(data).setProperty("type", "n");

		getResult("type");

		// ............................... Assert .................................
		assert.equal(res, "None: Am22 |type: Am66 |",
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
		assert.equal(res, "None: 46A |Street: 46A> |Address: 46A>+ |Home: 46A>+$ |D: 52A>+$ |Index3: 58A>+$ |A: 60A>+$ |Index2: 50A>+$ |Ob: 50A>+$0 |Alt: 50B |Home: 50B$ |Address: 50B$+ |Street: 50B$+> |Person: 50xB |Home: 50xB$ |Street: 50xB$> |Address: 50xB$>+ |Ob: 50xB$>+1 |Home: 50xB$>+1$ |Index1: 54xB$>+1$ |A: 56xB$>+1$ |D: 62xB$>+1$ |Street: 62xB$>+1$> |Address: 62xB$>+1$>+ |",
		"Complex expression on bound tag property, with multiple adjacent paths, with nested () and [] paren expressions, chained observables, arithmetic expressions etc.");

		// ................................ Reset ................................
		$("#result").empty();

	})();

	(function() {
		// =============================== Arrange ===============================
		function setData() {
			res = "";

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
			tmpl = $.templates('{^{:f.e().d().c().b().a}} {^{:f.e().d().c().b()^a}} {^{:f.e().d().c()^b().a}} {^{:f.e().d()^c().b().a}} {^{:f.e()^d().c().b().a}} {^{:f^e().d().c().b().a}}');

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
		assert.equal(res, "None: a a a a a a |Change a: A A A A A A |Change b: A B B B B B |Change c: A B C C C C |Change d: A B C D D D |Change e: A B C D E E |",
		"{{: ...}} expressions with deeply chained computed observables");
		// =============================== Arrange ===============================

		function setData2() {
			res = "";

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
		assert.equal(res, "None: a a a a a a a a a a |Change a: A A A A A A A A A A |Change a1: A A1 A1 A1 A1 A1 A1 A1 A1 A1 |Change b: A A1 B B B B B B B B |Change b1: A A1 B B1 B1 B1 B1 B1 B1 B1 |Change c: A A1 B B1 C C C C C C |Change c1: A A1 B B1 C C1 C1 C1 C1 C1 |Change d: A A1 B B1 C C1 D D D D |Change d1: A A1 B B1 C C1 D D1 D1 D1 |Change e: A A1 B B1 C C1 D D1 E E |Change e1: A A1 B B1 C C1 D D1 E E1 |",
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
		assert.equal(res, "None: a a a a a |Change a: A A A A A |Change b: B B B B B |Change c: B C C C C |Change d: B C D D D |Change e: B C D E E |",
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
		assert.equal(res, "None: a a a a a | a a a a a |Change a: A A A A A | A A A A A |Change b: A A A A A | B B B B A |Change c: A A A A A | C C C B A |Change d: A A A A A | D D C B A |Change e: A A A A A | E D C B A |",
		"Sibling {{: ...}} expressions with deeply chained computed observables");

		// ................................ Reset ................................
		$("#result").empty();

	})();
});

QUnit.test("replace mode and link=false mode", function(assert) {

	(function() {
		$.views.settings.advanced({_jsv: true}); // For using viewsAndBindings()

		// =============================== Arrange ===============================
		$("#result").html("<div class='content'></div>");

		var tmpl = $.templates('{^{include}}{^{for people}}{^{:name}}{{/for}}{{/include}}'),
			data = {people: [
				{name: "Jo"},
				{name: "Pete"}
			]},
			result = "";

		// ................................ Act ..................................

		tmpl.link("#result .content", data);

		res = $("#result").text() + "(" + $("#result .content script").length + ") ";

		$.observable(data.people[0]).setProperty("name", "Bob");
		$.observable(data.people).insert({name: "Jane"});

		res += $("#result").text();

		// ............................... Assert .................................
		assert.equal(res, "JoPete(18) BobPeteJane",
		'tmpl.link(container, data) renders and data-links');

		// ................................ Act ..................................
		$("#result .content").empty();

		// ............................... Assert .................................
		assert.ok(!viewsAndBindings() && JSON.stringify(_jsv.cbBindings) === "{}",
		"$(container).empty removes both views and current listeners from that content");

		// ................................ Act ..................................
		data = {people: [
			{name: "Jo"},
			{name: "Pete"}
		]};

		tmpl.link("#result .content", data, {link: false});

		res = $("#result").text() + "(" + $("#result .content script").length + ") ";

		$.observable(data.people[0]).setProperty("name", "Bob");
		$.observable(data.people).insert({name: "Jane"});

		res += $("#result").text();

		// ............................... Assert .................................
		assert.equal(res, "JoPete(4) JoPete",
		'tmpl.link(container, data, {link: false}) renders but does not data-link, and does not insert script node markers');

		// ................................ Act ..................................
		$("#result .content").empty();

		// ............................... Assert .................................
		assert.ok(!viewsAndBindings() && JSON.stringify(_jsv.cbBindings) === "{}",
		"$(container).empty removes both views and current listeners from that content");

		// ................................ Act ..................................
		data = {people: [
			{name: "Jo"},
			{name: "Pete"}
		]};

		tmpl.link("#result .content", data, {target: "replace"});

		res = $("#result .content").length + " - " + $("#result").text() + "(" + $("#result script").length + ") ";

		$.observable(data.people[0]).setProperty("name", "Bob");
		$.observable(data.people).insert({name: "Jane"});

		res += $("#result").text();

		// ............................... Assert .................................
		assert.equal(res, "0 - JoPete(18) BobPeteJane",
		'tmpl.link(container, data, {target: "replace"}) replaces the target "container" by rendered content, and data-links');

		// ................................ Act ..................................
		$("#result").empty();

		// ............................... Assert .................................
		assert.ok(!viewsAndBindings() && JSON.stringify(_jsv.cbBindings) === "{}",
		"$(container).empty removes both views and current listeners from that content");

		// =============================== Arrange ===============================
		$("#result").html("<div class='content'></div>");

		// ................................ Act ..................................
		data = {people: [
			{name: "Jo"},
			{name: "Pete"}
		]};

		tmpl.link("#result .content", data, {target: "replace", link: false});

		res = $("#result .content").length + " - " + $("#result").text() + "(" + $("#result script").length + ") ";

		$.observable(data.people[0]).setProperty("name", "Bob");
		$.observable(data.people).insert({name: "Jane"});

		res += $("#result").text();

		// ............................... Assert .................................
		assert.equal(res, "0 - JoPete(4) JoPete",
		'tmpl.link(container, data, {target: "replace", link: false}) replaces the target "container" by rendered content, and does not data-link');

		// ................................ Act ..................................
		$("#result").empty();

		// ............................... Assert .................................
		assert.ok(!viewsAndBindings() && JSON.stringify(_jsv.cbBindings) === "{}",
		"$(container).empty removes both views and current listeners from that content");

		// =============================== Arrange ===============================
		$("#result").html("<div class='content'></div>");

		tmpl = $.templates('{^{include link=false}}{^{for people}}{^{:name}}{{/for}}{{/include}}');

		// ................................ Act ..................................
		data = {people: [
			{name: "Jo"},
			{name: "Pete"}
		]};

		tmpl.link("#result .content", data);

		res = $("#result").text() + "(" + $("#result .content script").length + ") ";

		$.observable(data.people[0]).setProperty("name", "Bob");
		$.observable(data.people).insert({name: "Jane"});

		res += $("#result").text();

		// ............................... Assert .................................
		assert.equal(res, "JoPete(8) JoPete",
		'link=false on a block tag (e.g. {^{include link=false}}...) renders, but does not data-link, the content');

		// ................................ Act ..................................
		$("#result .content").empty();

		// ............................... Assert .................................
		assert.ok(!viewsAndBindings() && JSON.stringify(_jsv.cbBindings) === "{}",
		"$(container).empty removes both views and current listeners from that content");

		$.views.settings.advanced({_jsv: false}); // For using viewsAndBindings()
	})();
});


QUnit.module("API - data-bound tags");

QUnit.test("{^{:expression}}", function(assert) {

	// ................................ Reset ................................
	person1.lastName = "One"; // reset Prop
	$.views.settings.advanced({_jsv: true}); // For using viewsAndBindings()

	// =============================== Arrange ===============================

	$.templates('prop:{^{:lastName}}')
		.link("#result", person1);

	// ................................ Act ..................................
	before = $("#result").text();
	$.observable(person1).setProperty("lastName", "newLast");
	after = $("#result").text();

	// ............................... Assert .................................
	assert.equal(before + "|" + after,
	'prop:One|prop:newLast',
	'Data link using: {^{:lastName}}');

	// =============================== Arrange ===============================

	// ................................ Act ..................................

	$("#result").empty();

	// ............................... Assert .................................

	assert.ok(!viewsAndBindings() && !$._data(person1).events,
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
	assert.equal(before + "|" + after,
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
	assert.equal(before + "|" + after,
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
			onUpdate: false,
			template: "<b>{^{:~tagCtx.props.label}}</b><input/><br/>"
		}
	});

	tmpl = $.templates(
	'<input data-link="a().other last convert=~upper convertBack=~lower" />'
	+ '<input data-link=" convert=~upper convertBack=~lower last a().other" />'

	+ '<input data-link="other" />'
	+ '<input id="x" data-link="last" />'

	+ '{^{:convert=~upper last a().other}}'
	+ '{^{:a().other last convert=~upper}}'

	+ '{^{textbox a().other last convert=~upper convertBack=~lower/}}'
	+ '{^{textbox convert=~upper convertBack=~lower last a().other/}}');

$.views.settings.trigger(false);
	$.link(tmpl, "#result", data, {
		upper: function(val) {
			return val.toUpperCase();
		},
		lower: function(val) {
			return val.toLowerCase();
		}
	});

	// ................................ Act ..................................
	before = $("#result").text();
	$("#result input").each(function() {
		before += this.value;
	});
	$.observable(data).setProperty("last", "newLast");
	$.observable(data).setProperty("other", "newOther");
	$("#result input").each(function() {
		var last = data.last;
		this.value += count++;
		$(this).change();
	});
	after = $("#result").text();
	$("#result input").each(function() {
		after += this.value;
	});

$.views.settings.trigger(true);

	// ............................... Assert .................................
	assert.equal(before + "|" + after,
	"SMITHOTHEROTHERSMITHOtherSmithOTHERSMITH|NEWLAST135NEWOTHER024NEWOTHER024NEWLAST135newother024newlast135NEWOTHER024NEWLAST135",
	'Binding correctly to and from first argument, even with multiple args and props and with objects in paths, and with converters');

	// ................................ Reset ................................
	$("#result").empty();

	// =============================== Arrange ===============================

	var ob = {text: "aBc"};
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
	assert.equal(before + "|" + after,
	"ABCabc|DEFdef",
	'$.link(expression, selector, undefined, helpers) - without passing data, data-links correctly to helpers');

	// ................................ Reset ................................
	$("#result").empty();
	$.unlink("#result");

	// =============================== Arrange ===============================

	ob = {text: "aBc"};
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
	assert.equal(before + "|" + after,
	"ABCabc|DEFdef",
	'$.link(expression, selector) - without passing data, data-links correctly to helpers');

	// ................................ Reset ................................
	$.unlink("#result");
	$("#result").empty();

	// =============================== Arrange ===============================

	tmpl = $.templates("{^{:~upper(~ob.text)}}{^{:~lower(~ob.text)}}");
	$.views.helpers.ob = ob = {text: "aBc"};
	$.link(tmpl, "#result");

	// ................................ Act ..................................
	before = $("#result").text();
	$.observable(ob).setProperty("text", "DeF");
	after = $("#result").text();

	// ............................... Assert .................................
	assert.equal(before + "|" + after,
	"ABCabc|DEFdef",
	'$.link(template, selector) - without passing data, data-links correctly to helpers');

	// ................................ Reset ................................
	$("#result").empty();

	// =============================== Arrange ===============================

	$.views.helpers.ob = ob = {text: "aBc"};
	tmpl.link("#result");

	// ................................ Act ..................................
	before = $("#result").text();
	$.observable(ob).setProperty("text", "DeF");
	after = $("#result").text();

	// ............................... Assert .................................
	assert.equal(before + "|" + after,
	"ABCabc|DEFdef",
	'template.link(selector) - without passing data, data-links correctly to helpers');

	// ................................ Reset ................................
	$("#result").empty();

	// =============================== Arrange ===============================

	$.views.helpers.ob = ob = {text: "aBc"};
	$("#result").link(tmpl);

	// ................................ Act ..................................
	before = $("#result").text();
	$.observable(ob).setProperty("text", "DeF");
	after = $("#result").text();

	// ............................... Assert .................................
	assert.equal(before + "|" + after,
	"ABCabc|DEFdef",
	'$(selector).link(template) - without passing data, data-links correctly to helpers');

	// ................................ Reset ................................
	$("#result").empty();

	// =============================== Arrange ===============================

	$.views.helpers.ob = ob = {text: "aBc"};
	$("#result").link("~upper(~ob.text) + ~lower(~ob.text)");

	// ................................ Act ..................................
	before = $("#result").text();
	$.observable(ob).setProperty("text", "DeF");
	after = $("#result").text();

	// ............................... Assert .................................
	assert.equal(before + "|" + after,
	"ABCabc|DEFdef",
	'$(selector).link(expression) - without passing data, data-links correctly to helpers');

	// ................................ Reset ................................
	$.unlink("#result");
	$("#result").empty();

	$.views.settings.advanced({_jsv: false});
});

QUnit.test("{^{>expression}}", function(assert) {

	$.views.settings.advanced({_jsv: true}); // For using viewsAndBindings()

	// =============================== Arrange ===============================

	$.templates('prop:{^{>lastName + "<br/>"}}')
		.link("#result", person1);

	// ................................ Act ..................................
	before = $("#result").text();
	$.observable(person1).setProperty("lastName", "newLast");
	after = $("#result").text();

	// ............................... Assert .................................
	assert.equal(before + "|" + after,
	'prop:One<br/>|prop:newLast<br/>',
	'Data link using: {^{:lastName}}');

	// =============================== Arrange ===============================

	// ................................ Act ..................................

	$("#result").empty();

	// ............................... Assert .................................

	assert.ok(!viewsAndBindings() && !$._data(person1).events,
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
	assert.equal(before + "|" + after,
	"StreetOneStreetOne|newStreetOneStreetTwo",
	'#data.person1.home.address.street binds only to the leaf, but person1.home^address.street does deep binding');

	// ................................ Reset ................................
	$("#result").empty();
	address1.street = "StreetOne";
	person1.home = home1;

	$.views.settings.advanced({_jsv: false});
});

QUnit.test("{^{tag}}", function(assert) {

	// ................................ Reset ................................
	person1._firstName = "Jo"; // reset Prop
	person1.lastName = "One"; // reset Prop
	settings.title = "Mr"; // reset Prop
	settings.width = 30; // reset Prop

	// =============================== Arrange ===============================
	$.views.tags({
		norendernotemplate: {},
		voidrender: function() {},
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
	assert.equal($("#result").text(), "abcde",
	"non-rendering tag (no template, no render function) renders empty string");

	$.templates("a{{voidrender/}}b{^{voidrender/}}c{{voidrender}}{{/voidrender}}d{^{voidrender}}{{/voidrender}}e").link("#result", 1);
	assert.equal($("#result").text(), "abcde",
	"non-rendering tag (no template, no return from render function) renders empty string");

	$.templates("a{{emptyrender/}}b{^{emptyrender/}}c{{emptyrender}}{{/emptyrender}}d{^{emptyrender}}{{/emptyrender}}e").link("#result", 1);
	assert.equal($("#result").text(), "abcde",
	"non-rendering tag (no template, empty string returned from render function) renders empty string");

	$.templates("a{{emptytemplate/}}b{^{emptytemplate/}}c{{emptytemplate}}{{/emptytemplate}}d{^{emptytemplate}}{{/emptytemplate}}e").link("#result", 1);
	assert.equal($("#result").text(), "abcde",
	"non-rendering tag (template has no content, no render function) renders empty string");

	$.templates("a{{templatereturnsempty/}}b{^{templatereturnsempty/}}c{{templatereturnsempty}}{{/templatereturnsempty}}d{^{templatereturnsempty}}{{/templatereturnsempty}}e").link("#result", 1);
	assert.equal($("#result").text(), "abcde",
	"non-rendering tag (template returns empty string, no render function) renders empty string");

	// =============================== Arrange ===============================

	$.templates('{^{tmplTag/}}')
		.link("#result", person1, {settings: settings});

	// ................................ Act ..................................
	before = $("#result").text();
	$.observable(person1).setProperty({firstName: "newFirst", lastName: "newLast"});
	$.observable(settings).setProperty({title: "Sir", width: 40});
	$.observable(person1).setProperty({fullName: "compFirst compLast"});
	after = $("#result").text();

	// ............................... Assert .................................
	assert.equal(before + "|" + after, 'Name: Mr Jo. Width: 30|Name: Sir compFirst. Width: 40',
	'Data link with: {^{tmplTag/}} updates when dependant object paths change');

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
	$.observable(settings).setProperty({title: "Sir", width: 40});
	$.observable(person1).setProperty({fullName: "compFirst compLast"});
	after = $("#result").text();

	// ............................... Assert .................................
	assert.ok(before === 'Name: Mr Jo. Width: 30' && before === after && !$._data(person1).events && !$._data(settings).events,
	'Data link with: {{tmplTag/}} does nothing');

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
	$.observable(settings).setProperty({title: "Sir", width: 40});
	$.observable(person1).setProperty({fullName: "compFirst compLast"});
	after = $("#result").text();

	// ............................... Assert .................................
	assert.equal(before + "|" + after, 'Name: Mr Jo. Width: 30|Name: Sir compFirst. Width: 40',
	'Data link with: {^{fnTag/}} updates when dependant object paths change');

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
	$.observable(settings).setProperty({title: "Sir", width: 40});
	$.observable(person1).setProperty({fullName: "compFirst compLast"});
	after = $("#result").text();

	// ............................... Assert .................................
	assert.ok(before === 'Name: Mr Jo. Width: 30' && before === after && !$._data(person1).events && !$._data(settings).events,
	'Data link with: {{fnTag/}} does nothing');

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
	before = $("#result div span")[0].outerHTML; // The innerHTML will be <script type="jsv#^6_"></script>Name: Sir compFirst. Width: 40<script type="jsv/^6_"></script>
	$.observable(person1).setProperty({firstName: "newFirst", lastName: "newLast"});
	$.observable(settings).setProperty({title: "Sir", width: 40});
	$.observable(person1).setProperty({fullName: "compFirst compLast"});
	after = $("#result div span")[0].outerHTML;
	// ............................... Assert .................................
	assert.equal(before + "|" + after,
	'<span>Name: Mr Jo. Width: 30</span>|<span>Name: Sir compFirst. Width: 40</span>',
	'Data link with: {^{fnTagEl/}} rendering <span>, updates when dependant object paths change');

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
	$.observable(settings).setProperty({title: "Sir", width: 40});
	$.observable(person1).setProperty({fullName: "compFirst compLast"});
	after = $("#result div span").html();

	// ............................... Assert .................................
	assert.equal(before + "|" + after,
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
		.link("#result", person1, {settings: settings});

	// ................................ Act ..................................
	before = $("#result ul li").html(); // The innerHTML will be ""<li data-jsv=\"#37_\">Name: Mr Jo. Width: 30</li>"
	$.observable(person1).setProperty({firstName: "newFirst", lastName: "newLast"});
	$.observable(settings).setProperty({title: "Sir", width: 40});
	$.observable(person1).setProperty({fullName: "compFirst compLast"});
	after = $("#result ul li").html();

	// ............................... Assert .................................
	assert.equal(before + "|" + after,
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
		.link("#result", person1, {settings: settings});

	// ................................ Act ..................................
	before = $("#result ul li").html(); // The innerHTML will be ""<li data-jsv=\"#37_\">Name: Mr Jo. Width: 30</li>"
	$.observable(person1).setProperty({firstName: "newFirst", lastName: "newLast"});
	$.observable(settings).setProperty({title: "Sir", width: 40});
	$.observable(person1).setProperty({fullName: "compFirst compLast"});
	after = $("#result ul li").html();

	// ............................... Assert .................................
	assert.equal(before + "|" + after,
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
		.link("#result", person1, {settings: settings});

	// ................................ Act ..................................
	before = $("#result").text();
	$.observable(person1).setProperty({firstName: "newFirst", lastName: "newLast", "home.address.street": "newStreet"});
	$.observable(settings).setProperty({title: "Sir", width: 40, reverse: false});
	$.observable(person1).setProperty({fullName: "compFirst compLast"});
	after = $("#result").text();

	// ............................... Assert .................................
	assert.equal(before + "|" + after, 'Name: Mr Jo. Width: 30. Value: true. Prop theTitle: Mr. Prop ~street: StreetOne|Name: Sir compFirst. Width: 40. Value: false. Prop theTitle: Sir. Prop ~street: newStreet',
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
		.link("#result", person1, {settings: settings});

	// ................................ Act ..................................
	before = $("#result").text();
	$.observable(person1).setProperty({firstName: "newFirst", lastName: "newLast", "home.address.street": "newStreet"});
	$.observable(settings).setProperty({title: "Sir", width: 40, reverse: false});
	$.observable(person1).setProperty({fullName: "compFirst compLast"});
	after = $("#result").text();

	// ............................... Assert .................................
	assert.ok(before === 'Name: Mr Jo. Width: 30. Value: true. Prop theTitle: Mr. Prop ~street: StreetOne' && before === after && !$._data(person1).events && !$._data(settings).events,
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
		.link("#result", person1, {settings: settings});

	// ................................ Act ..................................
	before = $("#result").text();
	$.observable(person1).setProperty({firstName: "newFirst", lastName: "newLast", "home.address.street": "newStreet"});
	$.observable(settings).setProperty({title: "Sir", width: 40, reverse: false});
	$.observable(person1).setProperty({fullName: "compFirst compLast"});
	after = $("#result").text();

	// ............................... Assert .................................
	assert.equal(before + "|" + after, 'Name: Mr Jo. Width: 30. Value: true. Prop theTitle: Mr. Prop ~street: StreetOne|Name: Sir compFirst. Width: 40. Value: false. Prop theTitle: Sir. Prop ~street: newStreet',
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
		.link("#result", person1, {settings: settings});

	// ................................ Act ..................................
	before = $("#result").text();
	$.observable(person1).setProperty({firstName: "newFirst", lastName: "newLast", "home.address.street": "newStreet"});
	$.observable(settings).setProperty({title: "Sir", width: 40, reverse: false});
	$.observable(person1).setProperty({fullName: "compFirst compLast"});
	after = $("#result").text();

	// ............................... Assert .................................
	assert.ok(before === 'Name: Mr Jo. Width: 30. Value: true. Prop theTitle: Mr. Prop ~street: StreetOne' && before === after && !$._data(person1).events && !$._data(settings).events,
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
		mytag: {
			template: "<span>{{:~tagCtx.args[0]}}</span>",
			attr: "html"
		}
	});

	$.templates("{^{mytag foo(\"w\\x\'y\").b/}} <div data-link=\"{mytag foo('w\\x').b}\" ></div>")
		.link("#result", {
			foo: function(val) {
				return { b: val};
			}
		});

	// ............................... Assert .................................
	assert.equal($("#result span")[0].outerHTML, "<span>w\\x\'y</span>",
	"{^{mytag foo(\"w\\x\'y\").b/}} - correct compilation and output of quotes and backslash, with object returned in path (so nested compilation)");
	assert.equal($("#result span")[1].outerHTML, "<span>w\\x</span>",
	"<div data-link=\"{mytag foo('w\\x').b}\" > - correct compilation and output of quotes and backslash, with object returned in path (so nested compilation)");

	// ................................ Reset ................................
	$("#result").empty();
	res = "";
});

QUnit.test("{^{for}}", function(assert) {

	// ................................ Reset ................................
	person1._firstName = "Jo"; // reset Prop
	person1.lastName = "One"; // reset Prop
	settings.title = "Mr"; // reset Prop
	settings.width = 30; // reset Prop
	model.things = []; // reset Prop
	$.views.settings.advanced({_jsv: true}); // For using viewsAndBindings()

	// =============================== Arrange ===============================

	model.things = [{thing: "box"}]; // reset Prop
	$.templates('{^{for things}}{{:thing}}{{/for}}')
		.link("#result", model);

	// ................................ Act ..................................
	before = $("#result").text();
	$.observable(model.things).insert(0, {thing: "tree"});
	after = $("#result").text();

	// ............................... Assert .................................
	assert.equal(before + "|" + after, 'box|treebox',
	'{^{for things}} binds to array changes on leaf array');

	// ................................ Act ..................................
	$.observable(model).setProperty({things: [{thing: "triangle"}, {thing: "circle"}]});
	after = $("#result").text();

	// ............................... Assert .................................
	assert.equal(after, 'trianglecircle',
	'{^{for things}} binds to property change on path');

	// ................................ Act ..................................
	$.observable(model).setProperty({things: {thing: "square"}});
	after = $("#result").text();

	// ............................... Assert .................................
	assert.equal(after, 'square',
	'{^{for things}} binds to property change on path - swapping from array to singleton object');

	// ................................ Act ..................................
	$.observable(model).setProperty({things: [{thing: "triangle2"}, {thing: "circle2"}]});
	after = $("#result").text();

	// ............................... Assert .................................
	assert.equal(after, 'triangle2circle2',
	'{^{for things}} binds to property change on path - swapping from singleton back to array');

	// ................................ Act ..................................
	$.observable(model.things).insert([{thing: "oblong"}, {thing: "pentagon"}]);
	after = $("#result").text();

	// ............................... Assert .................................
	assert.equal(after, 'triangle2circle2oblongpentagon',
	'{^{for things}} binds to array change on array after swapping from singleton back to array');

	// ................................ Reset ................................
	$("#result").empty();
	model.things = []; // reset Prop

	assert.equal(JSON.stringify(_jsv.cbBindings), "{}",
	"Bindings all removed when content removed from DOM");

	// =============================== Arrange ===============================

	var things1 = [{thing: "box"}],
		things2 = [{thing: "triangle"}, {thing: "circle"}],
		square = {thing: "square"};

	model.things = things1; // reset Prop

	$.templates('{^{for things}}{{:thing}}{{/for}}')
		.link("#result", model);

	// ................................ Act ..................................
	before = $("#result").text();
	$.observable(things1).insert(0, {thing: "tree"});
	after = $("#result").text();

	// ............................... Assert .................................
	assert.equal(before + "|" + after, 'box|treebox',
	'{^{for things}} binds to array changes on leaf array');

	// ................................ Act ..................................
	$.observable(model).setProperty({things: things2});
	after = $("#result").text();

	// ............................... Assert .................................
	assert.equal(after, 'trianglecircle',
	'{^{for things}} binds to property change on path');

	// ................................ Act ..................................
	$.observable(model).setProperty({things: square});
	after = $("#result").text();

	// ............................... Assert .................................
	assert.equal(after, 'square',
	'{^{for things}} binds to property change on path - swapping from array to singleton object');

	// ................................ Act ..................................
	$.observable(model).setProperty({things: things2});
	after = $("#result").text();

	// ............................... Assert .................................
	assert.equal(after, 'trianglecircle',
	'{^{for things}} binds to property change on path - swapping from singleton back to previous array');

	// ................................ Act ..................................
	$.observable(things2).insert([{thing: "oblong"}, {thing: "pentagon"}]);
	after = $("#result").text();

	// ............................... Assert .................................
	assert.equal(after, 'trianglecircleoblongpentagon',
	'{^{for things}} binds to array change on array after swapping from singleton back to array');

	// ................................ Reset ................................
	$("#result").empty();
	model.things = []; // reset Prop

	// =============================== Arrange ===============================

	things1 = [{thing: "box"}];
	things2 = [{thing: "triangle"}, {thing: "circle"}];
	square = {thing: "square"};

	model.things = things1; // reset Prop

	$.templates('<ul>{^{for things}}<li>{{:thing}}</li>{{/for}}</ul>')
		.link("#result", model);

	// ................................ Act ..................................
	before = $("#result").text();
	$.observable(things1).insert(0, {thing: "tree"});
	after = $("#result").text();

	// ............................... Assert .................................
	assert.equal(before + "|" + after, 'box|treebox',
	'{^{for things}} in element content binds to array changes on leaf array');

	// ................................ Act ..................................
	$.observable(model).setProperty({things: things2});
	after = $("#result").text();

	// ............................... Assert .................................
	assert.equal(after, 'trianglecircle',
	'{^{for things}} binds to property change on path');

	// ................................ Act ..................................
	$.observable(model).setProperty({things: square});
	after = $("#result").text();

	// ............................... Assert .................................
	assert.equal(after, 'square',
	'{^{for things}} binds to property change on path - swapping from array to singleton object');

	// ................................ Act ..................................
	$.observable(model).setProperty({things: things2});
	after = $("#result").text();

	// ............................... Assert .................................
	assert.equal(after, 'trianglecircle',
	'{^{for things}} binds to property change on path - swapping from singleton back to previous array');

	// ................................ Act ..................................
	$.observable(things2).insert([{thing: "oblong"}, {thing: "pentagon"}]);
	after = $("#result").text();

	// ............................... Assert .................................
	assert.equal(after, 'trianglecircleoblongpentagon',
	'{^{for things}} binds to array change on array after swapping from singleton back to array');

	// ................................ Reset ................................
	$("#result").empty();
	model.things = []; // reset Prop

	// =============================== Arrange ===============================

	model.things = [{thing: "box"}, {thing: "table"}]; // reset Prop

	$.templates('{^{:length}} {^{for #data}}{{:thing}}{{/for}}')
		.link("#result", model.things, null, true);

	// ................................ Act ..................................
	before = $("#result").text();
	$.observable(model.things).insert(0, {thing: "tree"});
	after = $("#result").text();

	// ............................... Assert .................................
	assert.equal(before + "|" + after, "2 boxtable|3 treeboxtable",
	'{^{for #data}} when #data is an array binds to array changes on #data');

	// ................................ Reset ................................
	$("#result").empty();
	model.things = []; // reset Prop

	// =============================== Arrange ===============================

	model.things = [{thing: "box"}, {thing: "table"}]; // reset Prop

	$.templates('{^{:length}} {^{for}}{{:thing}}{{/for}}')
		.link("#result", model.things, null, true);

	// ................................ Act ..................................
	before = $("#result").text();
	$.observable(model.things).insert(0, {thing: "tree"});
	after = $("#result").text();

	// ............................... Assert .................................
	assert.equal(before + "|" + after, "2 boxtable|3 treeboxtable",
	'{^{for}} when #data is an array binds to array changes on #data');

	// ................................ Reset ................................
	$("#result").empty();
	model.things = []; // reset Prop

	assert.equal(JSON.stringify(_jsv.cbBindings), "{}",
	"Bindings all removed when content removed from DOM");

	// =============================== Arrange ===============================

var ret = "";

var listData = {nodes: {list: ["A "]}};

$.templates('Plain: {^{for nodes^list}}{{:}}{{/for}}\
|SpanWithNext: {^{for nodes^list}}<span>{{:}}</span>{{/for}}<span>nextElem</span>\
|UlWithNext: <ul>{^{for nodes^list}}<li>{{:}}</li>{{/for}}<li>nextElem</li></ul>\
|Ul: <ul>{^{for nodes^list}}<li>{{:}}</li>{{/for}}</ul>')
	.link('#result', listData); //"Plain: A |SpanWithNext: A nextElem|UlWithNext: A nextElem|Ul: A "

	// ................................ Act ..................................
ret += "|1 " + $("#result").text() + " " + $._data(listData.nodes.list).events.arrayChange.length;

$.observable(listData).setProperty("nodes", {list: []});

ret += "|2 " + $("#result").text() + " " + $._data(listData.nodes.list).events.arrayChange.length;

$.observable(listData.nodes.list).insert("C ");

ret += "|3 " + $("#result").text() + " " + $._data(listData.nodes.list).events.arrayChange.length;

$.observable(listData.nodes).setProperty("list", []);
ret += "|4 " + $("#result").text() + " " + $._data(listData.nodes.list).events.arrayChange.length;

$.observable(listData.nodes.list).insert("C2 ");

ret += "|5 " + $("#result").text() + " " + $._data(listData.nodes.list).events.arrayChange.length;

	// ............................... Assert .................................
	assert.equal(ret, "|1 Plain: A |SpanWithNext: A nextElem|UlWithNext: AnextElem|Ul: A 4"
	+ "|2 Plain: |SpanWithNext: nextElem|UlWithNext: nextElem|Ul:  4"
	+ "|3 Plain: C |SpanWithNext: C nextElem|UlWithNext: CnextElem|Ul: C 4"
	+ "|4 Plain: |SpanWithNext: nextElem|UlWithNext: nextElem|Ul:  4"
	+ "|5 Plain: C2 |SpanWithNext: C2 nextElem|UlWithNext: C2nextElem|Ul: C2 4",
	"Deep observable updates of array path on {^{for}} does not create additional array bindings");
	// =============================== Arrange ===============================

	model.things = []; // reset Prop

	$.templates('{^{if things.length}}X {^{for things}}{{:thing}}{{/for}}{{/if}}')
		.link("#result", model);

	// ................................ Act ..................................
	after = $("#result").text();
	$.observable(model.things).insert({thing: "box "});
	after += "|" + $("#result").text();
	$.observable(model.things).insert({thing: "table "});
	after += "|" + $("#result").text();
	$.observable(model.things).insert(0, {thing: "tree "});
	after += "|" + $("#result").text();
	$.observable(model.things).remove();
	after += "|" + $("#result").text();
	$.observable(model.things).remove(0);
	after += "|" + $("#result").text();
	$.observable(model.things).remove();
	after += "|" + $("#result").text();
	$.observable(model.things).refresh([{thing: "pen "},{thing: "lamp "}]);
	after += "|" + $("#result").text();
	$.observable(model.things).move(0, 1);
	after += "|" + $("#result").text();
	$.observable(model.things).refresh([]);
	after += "|" + $("#result").text();

	// ............................... Assert .................................
	assert.equal(after, "|X box |X box table |X tree box table |X tree box |X box ||X pen lamp |X lamp pen |",
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
	$.observable(model.things).insert({thing: "box "});
	after += "|" + $("#result").text();
	$.observable(model.things).insert({thing: "table "});
	after += "|" + $("#result").text();
	$.observable(model.things).insert(0, {thing: "tree "});
	after += "|" + $("#result").text();
	$.observable(model.things).remove();
	after += "|" + $("#result").text();
	$.observable(model.things).remove(0);
	after += "|" + $("#result").text();
	$.observable(model.things).remove();
	after += "|" + $("#result").text();
	$.observable(model.things).refresh([{thing: "pen "},{thing: "lamp "}]);
	after += "|" + $("#result").text();
	$.observable(model.things).move(0, 1);
	after += "|" + $("#result").text();
	$.observable(model.things).refresh([]);
	after += "|" + $("#result").text();

	// ............................... Assert .................................
	assert.equal(after, "|box |box table |tree box table |tree box |box ||pen lamp |lamp pen |",
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
	$.observable(model.things).insert({thing: "box "});
	after += "|" + $("#result").text();
	$.observable(model.things).insert({thing: "table "});
	after += "|" + $("#result").text();
	$.observable(model.things).insert(0, {thing: "tree "});
	after += "|" + $("#result").text();
	$.observable(model.things).remove();
	after += "|" + $("#result").text();
	$.observable(model.things).remove(0);
	after += "|" + $("#result").text();
	$.observable(model.things).remove();
	after += "|" + $("#result").text();
	$.observable(model.things).refresh([{thing: "pen "},{thing: "lamp "}]);
	after += "|" + $("#result").text();
	$.observable(model.things).move(0, 1);
	after += "|" + $("#result").text();
	$.observable(model.things).refresh([]);
	after += "|" + $("#result").text();

	// ............................... Assert .................................
	assert.equal(after, "|box |box table |tree box table |tree box |box ||pen lamp |lamp pen |",
	'{^{for things.length}}{^{for ~root.things}} content bound to both array and array.length responds correctly to observable array changes');

	// ................................ Reset ................................
	$("#result").empty();
	model.things = []; // reset Prop

	// =============================== Arrange ===============================

	model.things = [{thing: "box"}, {thing: "table"}]; // reset Prop

	$.templates('{{include things}}{^{:length}} {^{for}}{{:thing}}{{/for}}{{/include}}')
		.link("#result", model);

	// ................................ Act ..................................
	before = $("#result").text();
	$.observable(model.things).insert(0, {thing: "tree"});
	after = $("#result").text();

	// ............................... Assert .................................
	assert.equal(before + "|" + after, "2 boxtable|3 treeboxtable",
	'{{include things}} moves context to things array, and {^{for}} then iterates and binds to array');

	// ................................ Reset ................................
	$("#result").empty();
	model.things = []; // reset Prop

	// =============================== Arrange ===============================

	model.things = [{thing: "box"}];
	$.templates('{^{for things}}{{:thing}}{{else}}None{{/for}}')
		.link("#result", model);

	// ................................ Act ..................................
	before = $("#result").text();
	$.observable(model.things).insert(0, {thing: "tree"});
	after = $("#result").text();

	// ............................... Assert .................................
	assert.equal(before + "|" + after, 'box|treebox',
	'{^{for things}}{{else}}{{/for}} binds to array changes on leaf array');

	// ................................ Act ..................................
	before = $("#result").text();
	$.observable(model.things).remove(0, 2);
	after = $("#result").text();

	// ............................... Assert .................................
	assert.equal(before + "|" + after, 'treebox|None',
	'{^{for things}}{{else}}{{/for}} renders {{else}} block when array is emptied');

	// ................................ Act ..................................
	$.observable(model.things).insert(0, {thing: "tree"});
	after = $("#result").text();

	// ............................... Assert .................................
	assert.equal(after, 'tree',
	'{^{for things}}{{else}}{{/for}} removes {{else}} block when item is added again');

	// ................................ Act ..................................
	$.observable(model).setProperty({things: [{thing: "triangle"}, {thing: "circle"}]});
	after = $("#result").text();

	// ............................... Assert .................................
	assert.equal(after, 'trianglecircle',
	'{^{for things}}{{else}}{{/for}} binds to property change on path');

	// ................................ Act ..................................
	$.observable(model).setProperty({things: {thing: "square"}});
	after = $("#result").text();

	// ............................... Assert .................................
	assert.equal(after, 'square',
	'{^{for things}}{{else}}{{/for}} binds to property change on path - swapping from array to singleton object');

	// ................................ Act ..................................
	$.observable(model).removeProperty("things");
	after = $("#result").text();

	// ............................... Assert .................................
	assert.equal(after, 'None',
	'{^{for things}}{{else}}{{/for}} binds to removeProperty change on path - and renders {{else}} block');

	// ................................ Reset ................................
	$("#result").empty();
	model.things = []; // reset Prop

	// =============================== Arrange ===============================

	model.things = [{thing: "box"}];
	$.templates('<ul>{^{for things}}<li>{{:thing}}</li>{{else}}<li>None</li>{{/for}}</ul>')
		.link("#result", model);

	// ................................ Act ..................................
	before = $("#result").text();
	$.observable(model.things).insert(0, {thing: "tree"});
	after = $("#result").text();

	// ............................... Assert .................................
	assert.equal(before + "|" + after, 'box|treebox',
	'{^{for things}}{{else}}{{/for}} binds to array changes on leaf array');

	// ................................ Act ..................................
	before = $("#result").text();
	$.observable(model.things).remove(0, 2);
	after = $("#result").text();

	// ............................... Assert .................................
	assert.equal(before + "|" + after, 'treebox|None',
	'{^{for things}}{{else}}{{/for}} renders {{else}} block when array is emptied');

	// ................................ Act ..................................
	$.observable(model.things).insert(0, {thing: "tree"});
	after = $("#result").text();

	// ............................... Assert .................................
	assert.equal(after, 'tree',
	'{^{for things}}{{else}}{{/for}} removes {{else}} block when item is added again');

	// ................................ Act ..................................
	$.observable(model).setProperty({things: [{thing: "triangle"}, {thing: "circle"}]});
	after = $("#result").text();

	// ............................... Assert .................................
	assert.equal(after, 'trianglecircle',
	'{^{for things}}{{else}}{{/for}} binds to property change on path');

	// ................................ Act ..................................
	$.observable(model).setProperty({things: {thing: "square"}});
	after = $("#result").text();

	// ............................... Assert .................................
	assert.equal(after, 'square',
	'{^{for things}}{{else}}{{/for}} binds to property change on path - swapping from array to singleton object');

	// ................................ Act ..................................
	$.observable(model).removeProperty("things");
	after = $("#result").text();

	// ............................... Assert .................................
	assert.equal(after, 'None',
	'{^{for things}}{{else}}{{/for}} binds to removeProperty change on path - and renders {{else}} block');

	// ................................ Reset ................................
	$("#result").empty();
	model.things = []; // reset Prop

	// =============================== Arrange ===============================

	$.templates('{^{for things}}{{:thing}}{{else}}None{{/for}}{^{if true}}_yes{{/if}}')
		.link("#result", model);

	// ................................ Act ..................................
	before = $("#result").text();
	$.observable(model.things).insert(0, {thing: "tree"});
	$.observable(model.things).insert(0, {thing: "box"});
	after = $("#result").text();

	// ............................... Assert .................................
	assert.equal(before + "|" + after, 'None_yes|boxtree_yes',
	'{^{for things}}{{else}}{{/for}}{^{if ...}} starting with empty array binds to array inserts');
	// See https://github.com/BorisMoore/jsviews/issues/326

	// ................................ Reset ................................
	$("#result").empty();
	model.things = []; // reset Prop

	// =============================== Arrange ===============================

	// ................................ Act ..................................
	$.templates("testTmpl", '{{if ~things.length}}<tbody>{{for ~things}}<tr><td>{{:thing}}</td></tr>{{/for}}</tbody>{{/if}}');
	$.templates('<table><thead><tr><td>top</td></tr></thead>{^{for things ~things=things tmpl="testTmpl"/}}</table>')
		.link("#result", model);

	before = $("#result td").text();
	$.observable(model.things).insert(0, {thing: "tree"});
	after = $("#result").text();

	// ............................... Assert .................................
	assert.equal(before + "|" + after, 'top|toptree',
	'Complex template, with empty placeholder for tbody after thead, and subsequent data-linked insertion of tbody');

	// ................................ Act ..................................
	$.view("#result", true).refresh();
	res = "" + (after === $("#result").text());
	$.view("#result", true).views._2.refresh();
	res += " " + (after === $("#result").text());
	$.view("#result", true).views._2.views[0].refresh();
	res += " " + (after === $("#result").text());
	$.view("#result", true).views._2.views[0].views._2.refresh();
	res += " " + (after === $("#result").text());
	$.view("#result", true).views._2.views[0].views._2.views._2.refresh();
	res += " " + (after === $("#result").text());
	$.view("#result", true).views._2.views[0].views._2.views._2.views[0].refresh();
	res += " " + (after === $("#result").text());

	// ............................... Assert .................................
	assert.equal(res, 'true true true true true true',
	'view refresh at all levels correctly maintains content');

	// ................................ Reset ................................
	$("#result").empty();
	model.things = []; // reset Prop

	assert.equal(JSON.stringify(_jsv.cbBindings), "{}",
	"Bindings all removed when content removed from DOM");

	// =============================== Arrange ===============================

	// ................................ Act ..................................
	$.templates("testTmpl", '{{if ~things.length}}<div>{{for ~things}}<span>{{:thing}}</span>{{/for}}</div>{{/if}}');
	$.templates('<div><span>top</span>{^{for things ~things=things tmpl="testTmpl"/}}</div>')
		.link("#result", model);

	before = $("#result div").text();
	$.observable(model.things).insert(0, {thing: "tree"});
	after = $("#result").text();

	// ............................... Assert .................................
	assert.equal(before + "|" + after, 'top|toptree',
	'Complex template, with empty placeholder for span, and subsequent data-linked insertion of in div');

	// ................................ Act ..................................
	$.view("#result", true).refresh();
	res = "" + (after === $("#result").text());
	$.view("#result", true).views._2.refresh();
	res += " " + (after === $("#result").text());
	$.view("#result", true).views._2.views[0].refresh();
	res += " " + (after === $("#result").text());
	$.view("#result", true).views._2.views[0].views._2.refresh();
	res += " " + (after === $("#result").text());
	$.view("#result", true).views._2.views[0].views._2.views._2.refresh();
	res += " " + (after === $("#result").text());
	$.view("#result", true).views._2.views[0].views._2.views._2.views[0].refresh();
	res += " " + (after === $("#result").text());

	// ............................... Assert .................................
	assert.equal(res, 'true true true true true true',
	'view refresh at all levels correctly maintains content');

	// ................................ Reset ................................
	$("#result").empty();
	model.things = []; // reset Prop

	assert.equal(JSON.stringify(_jsv.cbBindings), "{}",
	"Bindings all removed when content removed from DOM");

	// =============================== Arrange ===============================
	// ................................ Act ..................................
	$.templates('<table><tbody>{^{for things}}{^{if expanded}}<tr><td>{{:thing}}</td></tr>{{/if}}{{/for}}</tbody></table>')
		.link("#result", model);

	$.observable(model.things).insert(0, [{thing: "tree", expanded: false}]);
	res = $._data(model.things[0]).events.propertyChange.length;
	$.view("#result", true).views._1.views[0].refresh();
	res += "|" + $._data(model.things[0]).events.propertyChange.length;
	$("#result").empty();
	res += "|" + $._data(model.things[0]).events;

	// ............................... Assert .................................
	assert.equal(res, '1|1|undefined',
	'Refreshing a view containing a tag which is bound to dependant data, and has no _prv node, removes the original binding and replaces it with a new one');

	// ................................ Reset ................................
	$("#result").empty();
	model.things = []; // reset Prop

	assert.equal(JSON.stringify(_jsv.cbBindings), "{}",
	"Bindings all removed when content removed from DOM");

	// =============================== Arrange ===============================

	// ................................ Act ..................................
	$.templates('<div>{^{for things}}{^{if expanded}}{{:thing}}{{/if}}{{/for}}</div>')
		.link("#result", model);

	$.observable(model.things).insert(0, [{thing: "tree", expanded: false}]);
	res = $._data(model.things[0]).events.propertyChange.length;
	$.view("#result", true).views._1.views[0].refresh();
	res += "|" + $._data(model.things[0]).events.propertyChange.length;
	$("#result").empty();
	res += "|" + $._data(model.things[0]).events;

	// ............................... Assert .................................
	assert.equal(res, '1|1|undefined',
	'Refreshing a view containing a tag which is bound to dependant data, and has no _prv node, removes the original binding and replaces it with a new one');

	// ................................ Reset ................................
	$("#result").empty();
	model.things = []; // reset Prop

	assert.equal(JSON.stringify(_jsv.cbBindings), "{}",
	"Bindings all removed when content removed from DOM");

	// =============================== Arrange ===============================

	// ................................ Act ..................................
	$.templates('<div>{{if true}}{^{:things.length||""}}{{/if}}</div>')
		.link("#result", model);

	before = $("#result div *").length;
	$.view("#result div", true).refresh();
	after = $("#result div *").length;
	// ............................... Assert .................................
	assert.equal(after, before,
	'Refreshing a view containing non-elOnly content, with a data-bound tag with no rendered content removes the original script node markers for the tag and replace with the new ones');

	// ................................ Reset ................................
	$("#result").empty();
	model.things = []; // reset Prop

	assert.equal(JSON.stringify(_jsv.cbBindings), "{}",
	"Bindings all removed when content removed from DOM");

	// =============================== Arrange ===============================

	// ................................ Act ..................................
	$.templates("testTmpl", '{^{if expanded}}<tr><td>{{:thing}}</td></tr>{{/if}}');
	$.templates('<table><tbody>{^{for things tmpl="testTmpl"/}}</tbody></table>')
		.link("#result", model);

	res = $("#result td").text();
	$.observable(model.things).insert(0, [{thing: "tree", expanded: false}, {thing: "bush", expanded: true}]);
	res += "|" + $("#result td").text();
	$.observable(model.things[0]).setProperty("expanded", true);
	$.observable(model.things[1]).setProperty("expanded", false);
	res += "|" + $("#result td").text();

	// ............................... Assert .................................
	assert.equal(res, '|bush|tree',
	'Changing dependant data on bindings with deferred correctly triggers refreshTag and refreshes content with updated data binding');

	// ................................ Act ..................................
	$.view("#result tr").parent.refresh();
	res = $("#result td").text();
	$.view("#result tr").parent.parent.views[1].refresh();
	res += "|" + $("#result td").text();

	// ............................... Assert .................................
	assert.equal(res, 'tree|tree',
	'view refresh with deferred correctly refreshes content');

	// ................................ Act ..................................
	$.observable(model.things[1]).setProperty("expanded", true);
	res = $("#result td").text();

	$.observable(model.things[0]).setProperty("expanded", false);
	res += "|" + $("#result td").text();

	// ............................... Assert .................................
	assert.equal(res, 'treebush|bush',
	'Changing dependant data on bindings with deferred, after view refresh correctly triggers refreshTag and refreshes content with updated data binding');

	// ................................ Reset ................................
	$("#result").empty();
	model.things = []; // reset Prop

	assert.equal(JSON.stringify(_jsv.cbBindings), "{}",
	"Bindings all removed when content removed from DOM");

	// =============================== Arrange ===============================

	// ................................ Act ..................................
	$.templates("testTmpl", '<tr>{^{if expanded}}<td>{{:thing}}</td>{{/if}}</tr>');
	$.templates('<table><tbody>{^{for things tmpl="testTmpl"/}}</tbody></table>')
		.link("#result", model);

	res = $("#result td").text();
	$.observable(model.things).insert(0, [{thing: "tree", expanded: false}, {thing: "bush", expanded: true}]);
	res += "|" + $("#result").text();
	$.observable(model.things[0]).setProperty("expanded", true);
	$.observable(model.things[1]).setProperty("expanded", false);
	res += "|" + $("#result").text();

	// ............................... Assert .................................
	assert.equal(res, '|bush|tree',
	'Changing dependant data on bindings with deferred correctly triggers refreshTag and refreshes content with updated data binding');

	// ................................ Act ..................................
	$.view("#result tr").refresh();
	res = $("#result").text();
	$.view("#result tr").parent.views[1].refresh();
	res += "|" + $("#result").text();

	// ............................... Assert .................................
	assert.equal(res, 'tree|tree',
	'view refresh with deferred correctly refreshes content');

	// ................................ Act ..................................
	$.observable(model.things[1]).setProperty("expanded", true);
	res = $("#result").text();
	$.observable(model.things[0]).setProperty("expanded", false);
	res += "|" + $("#result").text();

	// ............................... Assert .................................
	assert.equal(res, 'treebush|bush',
	'Changing dependant data on bindings with deferred, after view refresh correctly triggers refreshTag and refreshes content with updated data binding');

	// ................................ Reset ................................
	$("#result").empty();
	model.things = []; // reset Prop

	assert.equal(JSON.stringify(_jsv.cbBindings), "{}",
	"Bindings all removed when content removed from DOM");

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
	assert.equal(before + "|" + after,
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
	assert.equal(before + "|" + deferredString + "|" + after,
	(' next||insertBefore next'),
	'Inserting content before a next sibling element in element-only context does not set ._df, and subsequent insertion is correctly placed before the next sibling.');

	// ................................ Reset ................................
	$("#result").empty();

	// =============================== Arrange ===============================

	$.templates('{^{for things}}<div>#index:<b data-link="#index"></b> #view.index:<b data-link="#view.index"></b> {{:thing}} Nested:{{for true}}{{for true}} #get(\'item\').index:<em data-link="#get(\'item\').index"></em> #parent.parent.index:<em data-link="#parent.parent.index"></em>|{{/for}}{{/for}}</div>{{/for}}')
		.link("#result", model);

	// ................................ Act ..................................
	$.observable(model.things).insert(0, {thing: "tree"});
	$.observable(model.things).insert(0, {thing: "bush"});

	// ............................... Assert .................................
	assert.equal($("#result").text(), "#index:0 #view.index:0 bush Nested: #get('item').index:0 #parent.parent.index:0|#index:1 #view.index:1 tree Nested: #get('item').index:1 #parent.parent.index:1|",
	'Data-link to "#index" and "#get(\'item\').index" work correctly');

	// ................................ Reset ................................
	$("#result").empty();
	model.things = []; // reset Prop

	// =============================== Arrange ===============================

	$.templates('{^{for things}}<div>{{:thing}} Nested:{{for}}{{for}}<em data-link="#getIndex()"></em>{{/for}}{{/for}}</div>|{{/for}}')
		.link("#result", model);

	// ................................ Act ..................................
	$.observable(model.things).insert(0, {thing: "tree"});
	$.observable(model.things).insert(0, {thing: "bush"});

	// ............................... Assert .................................
	assert.equal($("#result").text(), "bush Nested:0|tree Nested:1|",
	'Data-link to "#getIndex()" works correctly');

	// ................................ Reset ................................
	$("#result").empty();
	model.things = []; // reset Prop

	// =============================== Arrange ===============================
	$.templates('<div><ul>{^{for things}}<li>xxx</li>{{/for}}</ul></div>')
		.link("#result", model);

	// ................................ Act ..................................
	$("#result div").empty();

	// ............................... Assert .................................

	assert.ok(viewsAndBindings().split(" ").length === 7 // We removed view inside div, but still have the view for the outer template.
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
	assert.ok(viewsAndBindings().split(" ").length === 13 // We removed view inside div, but still have the view for the outer template.
		&& $._data(data.list).events.arrayChange.length === 1
		&& $("#result ul").text() === "added",
		'In element-only content, updateContent calls disposeTokens on _df inner bindings');

	// ................................ Reset ................................
	$("#result").empty();

	assert.equal(JSON.stringify(_jsv.cbBindings), "{}",
	"Bindings all removed when content removed from DOM");

	$.views.settings.advanced({_jsv: false});

});

QUnit.test("{^{for start end sort filter reverse}}", function(assert) {
	$.views.settings.advanced({_jsv: true}); // For using cbBindings store

	assert.equal($.templates("{{for start=0 end=10}}{{:}} {{/for}}").render(), "0 1 2 3 4 5 6 7 8 9 ", "{{for start=0 end=10}}: Auto-create array");
	assert.equal($.templates("{{for start=5 end=9 reverse=1}}{{:}} {{/for}}").render(), "8 7 6 5 ", "{{for start=5 end=9 reverse=1}}: Auto-create array");
	assert.equal($.templates("{{for start=8 end=4 step=-1}}{{:}} {{/for}}").render(), "8 7 6 5 ", "{{for start=8 end=4 step=-1}}: Auto-create array");
	assert.equal($.templates("{{for start=8 end=4  step=-1 reverse=true}}{{:}} {{/for}}").render(), "5 6 7 8 ", "{{for start=8 end=4 step=-1 reverse=true}}: Auto-create array");
	assert.equal($.templates("{{for start=20 end='10' step=-2}}{{:}} {{/for}}").render(), "20 18 16 14 12 ", "{{for start=20 end='10' step=-2}}: Auto-create array");
	assert.equal($.templates("{{for start=20 end='10' step=2}}{{:}} {{/for}}").render(), "", "{{for start=20 end='10' step=2}}: Auto-create array (outputs nothing)");
	assert.equal($.templates("{{for start=2 end=-1.5 step=-.5}}{{:}} {{/for}}").render(), "2 1.5 1 0.5 0 -0.5 -1 ", "{{for start=0 end='10' step=-1}}: Auto-create array");
	assert.equal($.templates("{{for start=2}}{{:}} {{/for}}").render(), "", "{{for start=2}}: (outputs nothing)");
	assert.equal($.templates("{{for end=4}}{{:}} {{/for}}").render(), "0 1 2 3 ", "{{for end=4}}: (start defaults to 0)");

	var myarray = [1, 9, 2, 8, 3, 7, 4, 6, 5, -100, 20, 100, -1];
	var mypeople = [
		{name: "Jo", details: {age: 22}},
		{name: "Bob", details: {age: 2}},
		{name: "Emma", details: {age: 12}},
		{name: "Jeff", details: {age: 13.5}},
		{name: "Julia", details: {age: 0.6}},
		{name: "Xavier", details: {age: 0}}
	];
	var oddValue = function(item, index, items) { return item%2; };
	var oddIndex = function(item, index, items) { return index%2; };
	var under20 = function(item, index, items) {
		return item.details.age < 20;
	};

	assert.equal($.templates("{{for #data}}{{:}} {{/for}}").render(myarray, true), "1 9 2 8 3 7 4 6 5 -100 20 100 -1 ", "{{for #data}}");
	assert.equal($.templates("{{for #data sort=true}}{{:}} {{/for}}").render(myarray, true), "-100 -1 1 2 3 4 5 6 7 8 9 20 100 ", "{{for #data sort=true}}");
	assert.equal($.templates("{{for myarray reverse=true}}{{:}} {{/for}}").render({myarray: myarray}), "-1 100 20 -100 5 6 4 7 3 8 2 9 1 ", "{{for myarray reverse=true}}");
	assert.equal($.templates("{{for myarray start=1 end=-1}}{{:}} {{/for}}").render({myarray: myarray}, {oddIndex: oddIndex}), "9 2 8 3 7 4 6 5 -100 20 100 ", "{{for myarray start=1 end=-1}}");
	assert.equal($.templates("{{for myarray start=1}}{{:}} {{/for}}").render({myarray: myarray}, {oddIndex: oddIndex}), "9 2 8 3 7 4 6 5 -100 20 100 -1 ", "{{for myarray start=1}}");
	assert.equal($.templates("{{for myarray end=-1}}{{:}} {{/for}}").render({myarray: myarray}, {oddIndex: oddIndex}), "1 9 2 8 3 7 4 6 5 -100 20 100 ", "{{for myarray end=-1}}");
	assert.equal($.templates("{{for myarray}}{{:}} {{/for}}").render({myarray: myarray}), "1 9 2 8 3 7 4 6 5 -100 20 100 -1 ", "{{for myarray}}");
	assert.equal($.templates("{{for myarray reverse=true}}{{:}} {{/for}}").render({myarray: myarray}), "-1 100 20 -100 5 6 4 7 3 8 2 9 1 ", "{{for myarray reverse=true}}");
	assert.equal($.templates("{{for myarray sort=true}}{{:}} {{/for}}").render({myarray: myarray}), "-100 -1 1 2 3 4 5 6 7 8 9 20 100 ", "{{for myarray sort=true}}");
	assert.equal($.templates("{{for myarray sort=true reverse=true}}{{:}} {{/for}}").render({myarray: myarray}), "100 20 9 8 7 6 5 4 3 2 1 -1 -100 ", "{{for myarray sort=true reverse=true}}");

	assert.equal($.templates("{{for myarray filter=~oddValue}}{{:}} {{/for}}").render({myarray: myarray}, {oddValue: oddValue}), "1 9 3 7 5 -1 ", "{{for myarray filter=~oddValue}}!!!");
	assert.equal($.templates("{{for myarray filter=~oddIndex}}{{:}} {{/for}}").render({myarray: myarray}, {oddIndex: oddIndex}), "9 8 7 6 -100 100 ", "{{for myarray filter=~oddIndex}}");
	assert.equal($.templates("{{for myarray filter=~oddValue}}{{:}} {{/for}}").render({myarray: myarray}, {oddValue: oddValue}), "1 9 3 7 5 -1 ", "{{for myarray filter=~oddValue}}");
	assert.equal($.templates("{{for myarray sort=true filter=~oddValue}}{{:}} {{/for}}").render({myarray: myarray}, {oddValue: oddValue}), "-1 1 3 5 7 9 ", "{{for myarray sort=true filter=~oddValue}}");
	assert.equal($.templates("{{for myarray sort=true filter=~oddIndex}}{{:}} {{/for}}").render({myarray: myarray}, {oddIndex: oddIndex}), "-1 2 4 6 8 20 ", "{{for myarray sort=true filter=~oddIndex}}");
	assert.equal($.templates("{{for myarray sort=true filter=~oddIndex start=1 end=3}}{{:}} {{/for}}").render({myarray: myarray}, {oddIndex: oddIndex}), "2 4 ", "{{for myarray sort=true filter=~oddIndex start=1 end=3}}");
	assert.equal($.templates("{{for myarray sort=true filter=~oddIndex start=-3 end=-1}}{{:}} {{/for}}").render({myarray: myarray}, {oddIndex: oddIndex}), "6 8 ", "{{for myarray sort=true filter=~oddIndex start=-3 end=-1}} Negative start or end count from the end");
	assert.equal($.templates("{{for myarray sort=true filter=~oddIndex start=3 end=3}}{{:}} {{/for}}").render({myarray: myarray}, {oddIndex: oddIndex}), "", "{{for myarray sort=true filter=~oddIndex start=3 end=3}} (outputs nothing)");

	assert.equal($.templates("{{for mypeople sort='name'}}{{:name}}: age {{:details.age}} - {{/for}}").render({mypeople: mypeople}), "Bob: age 2 - Emma: age 12 - Jeff: age 13.5 - Jo: age 22 - Julia: age 0.6 - Xavier: age 0 - ", "{{for mypeople  sort='name'}}");
	assert.equal($.templates("{{for mypeople sort='details.age'}}{{:name}}: age {{:details.age}} - {{/for}}").render({mypeople: mypeople}), "Xavier: age 0 - Julia: age 0.6 - Bob: age 2 - Emma: age 12 - Jeff: age 13.5 - Jo: age 22 - ", "{{for mypeople  sort='details.age'}}");

	assert.equal($.templates("{{for mypeople sort='details.age' reverse=true filter=~under20}}{{:name}}: age {{:details.age}} - {{/for}}").render({mypeople: mypeople}, {under20: under20}), "Jeff: age 13.5 - Emma: age 12 - Bob: age 2 - Julia: age 0.6 - Xavier: age 0 - ", "{{for mypeople  sort='details.age' reverse=true filter=~under20}}");
	assert.equal($.templates("{{for mypeople sort='details.age' reverse=true filter=~under20 start=1 end=-1}}{{:name}}: age {{:details.age}} - {{/for}}").render({mypeople: mypeople}, {under20: under20}), "Emma: age 12 - Bob: age 2 - Julia: age 0.6 - ", "{{for mypeople  sort='details.age' reverse=true filter=~under20 start=1 end=-1}}");

	// =============================== Arrange ===============================
	model.things = [{ob: {thing: "box"}}];
	var ctx = {};
	$.templates('|All: {^{for things}}{{:ob.thing}} {{else}}None{{/for}}<br/>\
|Sort: {^{for this=~ctx.sorted things sort="ob.thing"}}{{:ob.thing}} {{else}}None{{/for}}<br/>\
|NotTreeReverse: {^{for things filter=~notTree reverse=true}}{{:ob.thing}} {{else}}None{{/for}}<br/>\
|Start1: {^{for things start=1}}{{:ob.thing}} {{else}}None{{/for}}')
		.link("#result", model, {
			ctx: ctx,
			notTree: function(item) {
				return item.ob.thing !== "tree";
			}
		});

	var after = $("#result").text();

	// ............................... Assert .................................
	assert.equal(after, "|All: box |Sort: box |NotTreeReverse: box |Start1: None",
	'{^{for things}}{{else}}{{/for}} plus sorting and filtering');

	// ................................ Act ..................................
	$.observable(model.things).insert(0, {ob: {thing: "tree"}});
	$.observable(model.things).insert([{ob: {thing: "apple"}}, {ob: {thing: "tree"}}]);
	after = $("#result").text();

	// ............................... Assert .................................
	assert.equal(after, "|All: tree box apple tree |Sort: apple box tree tree |NotTreeReverse: apple box |Start1: box apple tree ",
	'{^{for things}}{{else}}{{/for}} plus sorting and filtering binds to array changes on leaf array');

	// ................................ Act ..................................
	$.observable(model.things).remove(0, 3);
	after = $("#result").text();

	// ............................... Assert .................................6
	assert.equal(after, "|All: tree |Sort: tree |NotTreeReverse: None|Start1: None",
	'{^{for things}}{{else}}{{/for}} plus sorting and filtering renders {{else}} block when array is emptied');

	// ................................ Act ..................................
	$.observable(model.things).insert(0, {ob: {thing: "tree"}});
	after = $("#result").text();

	// ............................... Assert .................................
	assert.equal(after, "|All: tree tree |Sort: tree tree |NotTreeReverse: None|Start1: tree ",
	'{^{for things}}{{else}}{{/for}} plus sorting and filtering removes {{else}} block when item is added again');

	// ................................ Act ..................................
	$.observable(model).setProperty({things: [{ob: {thing: "triangle"}}, {ob: {thing: "circle"}}]});
	after = $("#result").text();

	// ............................... Assert .................................
	assert.equal(after, "|All: triangle circle |Sort: circle triangle |NotTreeReverse: circle triangle |Start1: circle ",
	'{^{for things}}{{else}}{{/for}} plus sorting and filtering binds to property change on path');

	// ................................ Act ..................................
	$.observable(model.things).insert([{ob: {thing: "square"}}, {ob: {thing: "tree"}}]);
	after = $("#result").text();

	// ............................... Assert .................................
	assert.equal(after, "|All: triangle circle square tree |Sort: circle square tree triangle |NotTreeReverse: square circle triangle |Start1: circle square tree ",
	'{^{for things}}{{else}}{{/for}} plus sorting and filtering inserts new items with sorting/filtering');

	// ................................ Act ..................................
	$.observable(model).setProperty({things: {ob: {thing: "tree"}}});
	after = $("#result").text();

	// ............................... Assert .................................
	assert.equal(after, "|All: tree |Sort: tree |NotTreeReverse: tree |Start1: tree ",
	'{^{for things}}{{else}}{{/for}} plus sorting and filtering binds to property change on path - swapping from array to singleton object');

	// ................................ Act ..................................
	$.observable(model).setProperty({things: [{ob: {thing: "square"}}, {ob: {thing: "apple"}}, {ob: {thing: "tree"}}]});
	after = $("#result").text();

	// ............................... Assert .................................
	assert.equal(after, "|All: square apple tree |Sort: apple square tree |NotTreeReverse: apple square |Start1: apple tree ",
	'{^{for things}}{{else}}{{/for}} plus sorting and filtering binds to property change on path - swapping from singleton object back to array');

	// ................................ Act ..................................
	$.observable(model).removeProperty("things");
	after = $("#result").text();

	// ............................... Assert .................................
	assert.equal(after, "|All: None|Sort: None|NotTreeReverse: None|Start1: None",
	'{^{for things}}{{else}}{{/for}} plus sorting and filtering binds to removeProperty change on path - and renders {{else}} block');

	// ................................ Act ..................................
	$.observable(model).setProperty("things", [{ob: {thing: "circle"}}, {ob: {thing: "tree"}}, {ob: {thing: "square"}}]);
	after = $("#result").text();

	// ............................... Assert .................................
	assert.equal(after, "|All: circle tree square |Sort: circle square tree |NotTreeReverse: square circle |Start1: tree square ",
	'{^{for things}}{{else}}{{/for}} plus sorting and filtering binds to setProperty change on path - and renders {{for}} block again');

	// =============================== Arrange ===============================
	var tgt = ctx.sorted.tagCtx.map.tgt;

	// ................................ Act ..................................
	$.observable(tgt).insert([{ob: {thing: "red"}}, {ob: {thing: "green"}}, {ob: {thing: "blue"}}]);
	after = $("#result").text();

	// ............................... Assert .................................
	assert.equal(after, "|All: circle tree square red green blue |Sort: circle square tree red green blue |NotTreeReverse: blue green red square circle |Start1: tree square red green blue ",
	'{^{for things}} plus sorting and filtering support observable changes to target array tagCtx.map.tgt');

	// ................................ Reset ................................
	$("#result").empty();
	model.things = []; // reset Prop

	assert.equal(JSON.stringify(_jsv.cbBindings), "{}",
	"Bindings all removed when content removed from DOM");

	// =============================== Arrange ===============================
	var movies = [{title: "a0"}, {title: "x0"}, {title: "b0"}, {title: "y0"}, {title: "c0"}, {title: "z0"}];
	ctx = {};
	var cnt = 0;

	$.templates(
'|All:--- {^{for movies}}{{:title}} {{/for}}<br/>\
|Sort:-- {^{for movies sort="title" reverse=true}}{{:title}} {{/for}}<br/>\
|Filter: {^{for movies sort="title" reverse=true filter=~odd}}{{:title}} {{/for}}<br/>\
|Slice:- {^{for movies sort="title" reverse=true filter=~odd start=1 end=-1 this=~ctx.target}}{{:title}} {{/for}}')
		.link("#result", {movies: movies}, {
			ctx: ctx,
			odd: function(item, index, items) {
				return index%2;
			}
		});

	tgt = ctx.target.tagCtx.map.tgt; // This is the target array for the fourth (and last) {^{for}} tag above - Slice: {^{for ...}}

	// ................................ Act ..................................
	after = $("#result").text();

	// ............................... Assert .................................
		assert.equal(after, "|All:--- a0 x0 b0 y0 c0 z0 |Sort:-- z0 y0 x0 c0 b0 a0 |Filter: y0 c0 a0 |Slice:- c0 ",
	'{{for}} with sorting, filtering, reverse, start and end settings');

	// ................................ Act ..................................
	$.observable(tgt).insert({title: "t" + cnt++}); // Append item to fourth {^{for}} tag instance above
	after = $("#result").text();

	// ............................... Assert .................................
	assert.equal(after, "|All:--- a0 x0 b0 y0 c0 z0 t0 |Sort:-- z0 y0 x0 t0 c0 b0 a0 |Filter: y0 t0 b0 |Slice:- c0 t0 ",
	'Appending of item in target array (sorted, filtered etc) - item is rendered without refreshing sort, filter etc.');
	// But note that in our scenario above this will append an item to the source array movies, which will trigger refreshed
	// rendering of the first three {^{for}} instance above

	ctx.target.refresh();
	after = $("#result").text();

	// ............................... Assert .................................
	assert.equal(after, "|All:--- a0 x0 b0 y0 c0 z0 t0 |Sort:-- z0 y0 x0 t0 c0 b0 a0 |Filter: y0 t0 b0 |Slice:- t0 ",
	'To refresh sort etc with new item included, call tag.refresh() ');

	// ................................ Act ..................................
	$.observable(tgt).insert(0, {title: "t" + cnt++});
	after = $("#result").text();

	// ............................... Assert .................................
	assert.equal(after, "|All:--- a0 x0 b0 y0 c0 z0 t0 t1 |Sort:-- z0 y0 x0 t1 t0 c0 b0 a0 |Filter: y0 t1 c0 a0 |Slice:- t1 t0 ",
	'Insertion of item in target array (sorted, filtered etc) - item is rendered without refreshing sort, filter etc.');

	// ................................ Act ..................................
	$.observable(movies).insert(1, {title: "m" + cnt++});
	after = $("#result").text();

	// ............................... Assert .................................
	assert.equal(after, "|All:--- a0 m2 x0 b0 y0 c0 z0 t0 t1 |Sort:-- z0 y0 x0 t1 t0 m2 c0 b0 a0 |Filter: y0 t1 m2 b0 |Slice:- t1 m2 ",
	'Insertion of item in source array will also refresh sort, filter etc.');

	// ................................ Act ..................................
	$.observable(tgt).insert(1, [{title: "t" + cnt++}, {title: "t" + cnt++}]);
	after = $("#result").text();

	// ............................... Assert .................................
	assert.equal(after, "|All:--- a0 m2 x0 b0 y0 c0 z0 t0 t1 t3 t4 |Sort:-- z0 y0 x0 t4 t3 t1 t0 m2 c0 b0 a0 |Filter: y0 t4 t1 m2 b0 |Slice:- t1 t3 t4 m2 ",
	'Insertion of multiple items in target array (sorted, filtered etc) - items are rendered without refreshing sort, filter etc.');

	// ................................ Act ..................................
	$.observable(tgt).refresh([tgt[1], {title: "t" + cnt++}, tgt[0]]);
	after = $("#result").text();

	// ............................... Assert .................................
	assert.equal(after, "|All:--- a0 x0 b0 y0 c0 z0 t0 t1 t3 t5 |Sort:-- z0 y0 x0 t5 t3 t1 t0 c0 b0 a0 |Filter: y0 t5 t1 c0 a0 |Slice:- t3 t5 t1 ",
	'Calling refresh() on target array will insert and remove items appropriately from source array and target array (and move items in target array) without refreshing sort, filter etc.');

	// ................................ Act ..................................
	$.observable(tgt).remove();
	after = $("#result").text();

	// ............................... Assert .................................
	assert.equal(after, "|All:--- a0 x0 b0 y0 c0 z0 t0 t3 t5 |Sort:-- z0 y0 x0 t5 t3 t0 c0 b0 a0 |Filter: y0 t5 t0 b0 |Slice:- t3 t5 ",
	'Removing item in target array (sorted, filtered etc) - items are rendered without refreshing sort, filter etc.');

	// ................................ Act ..................................
	$.observable(movies).remove(0);
	after = $("#result").text();

	// ............................... Assert .................................
	assert.equal(after, "|All:--- x0 b0 y0 c0 z0 t0 t3 t5 |Sort:-- z0 y0 x0 t5 t3 t0 c0 b0 |Filter: y0 t5 t0 b0 |Slice:- t5 t0 ",
	'Removal of item in source array will also refresh sort, filter etc.');

	// ................................ Act ..................................
	$.observable(tgt).move(0, 1);
	after = $("#result").text();

	// ............................... Assert .................................
	assert.equal(after, "|All:--- x0 b0 y0 c0 z0 t0 t3 t5 |Sort:-- z0 y0 x0 t5 t3 t0 c0 b0 |Filter: y0 t5 t0 b0 |Slice:- t0 t5 ",
	'Moving items in target array (sorted, filtered etc) - items are moved in target but not in source, and this is without refreshing sort, filter etc.');

	// ................................ Act ..................................
	$.observable(tgt).refresh([{title: "t" + cnt++}]);
	after = $("#result").text();

	// ............................... Assert .................................
	assert.equal(after, "|All:--- x0 b0 y0 c0 z0 t3 t6 |Sort:-- z0 y0 x0 t6 t3 c0 b0 |Filter: y0 t6 c0 |Slice:- t6 ",
	'Calling refresh() on target array will insert and remove items appropriately from source array and target array (and move items in target array) without refreshing sort, filter etc.');

	// ................................ Act ..................................
	$.observable(movies).insert(1, {title: "m" + cnt++});
	after = $("#result").text();

	// ............................... Assert .................................
	assert.equal(after, "|All:--- x0 m7 b0 y0 c0 z0 t3 t6 |Sort:-- z0 y0 x0 t6 t3 m7 c0 b0 |Filter: y0 t6 m7 b0 |Slice:- t6 m7 ",
	'Insertion of item in source array will also refresh sort, filter etc.');

	// ................................ Act ..................................
	$.observable(tgt).insert(1, [{title: "t" + cnt++}, {title: "t" + cnt++}]);
	after = $("#result").text();

	// ............................... Assert .................................
	assert.equal(after, "|All:--- x0 m7 b0 y0 c0 z0 t3 t6 t8 t9 |Sort:-- z0 y0 x0 t9 t8 t6 t3 m7 c0 b0 |Filter: y0 t9 t6 m7 b0 |Slice:- t6 t8 t9 m7 ",
	'Insertion of multiple items in target array (sorted, filtered etc) - items are rendered without refreshing sort, filter etc.');

	// ................................ Act ..................................
	$.observable(movies).move(1, 3, 2);
	after = $("#result").text();

	// ............................... Assert .................................
	assert.equal(after, "|All:--- x0 y0 c0 m7 b0 z0 t3 t6 t8 t9 |Sort:-- z0 y0 x0 t9 t8 t6 t3 m7 c0 b0 |Filter: y0 t9 t6 m7 b0 |Slice:- t9 t6 m7 ",
	'Moving of items in source array will also refresh sort, filter etc.');

	// ................................ Reset ................................
	$("#result").empty();

	assert.equal(JSON.stringify(_jsv.cbBindings), "{}",
	"Bindings all removed when content removed from DOM");

	// =============================== Arrange ===============================
	movies = [{title: "a0"}, {title: "x0"}, {title: "b0"}, {title: "y0"}, {title: "c0"}, {title: "z0"}];
	ctx = {};
	cnt = 0;

	$.templates(
'|All:--- {^{for movies}}{{:title}} {{/for}}<br/>\
|Slice:- {^{for movies start=1 end=-1 this=~ctx.target}}{{:title}} {{/for}}')
		.link("#result", {movies: movies}, {
			ctx: ctx,
			odd: function(item, index, items) {
				return index%2;
			}
		});

	tgt = ctx.target.tagCtx.map.tgt;

	// ................................ Act ..................................
	after = $("#result").text();

	// ............................... Assert .................................
		assert.equal(after, "|All:--- a0 x0 b0 y0 c0 z0 |Slice:- x0 b0 y0 c0 ",
	'{{for}} with start and end settings ("sliced")');

	// ................................ Act ..................................
	$.observable(tgt).insert({title: "t" + cnt++});
	after = $("#result").text();

	// ............................... Assert .................................
	assert.equal(after, "|All:--- a0 x0 b0 y0 c0 z0 t0 |Slice:- x0 b0 y0 c0 t0 ",
	'Appending of item in target array ("sliced") - item is rendered without refreshing sort, filter etc.');

	ctx.target.refresh();
	after = $("#result").text();

	// ............................... Assert .................................
	assert.equal(after, "|All:--- a0 x0 b0 y0 c0 z0 t0 |Slice:- x0 b0 y0 c0 z0 ",
	'To refresh correct start and end with new item included, call tag.refresh() ');

	// ................................ Act ..................................
	$.observable(tgt).insert(0, {title: "t" + cnt++});
	after = $("#result").text();

	// ............................... Assert .................................
	assert.equal(after, "|All:--- a0 x0 b0 y0 c0 z0 t0 t1 |Slice:- t1 x0 b0 y0 c0 z0 ",
	'Insertion of item at specific position in target array ("sliced") - item is rendered at insert location, but item is simply appended to source array');

	// ................................ Act ..................................
	$.observable(movies).insert(1, {title: "m" + cnt++});
	after = $("#result").text();

	// ............................... Assert .................................
	assert.equal(after, "|All:--- a0 m2 x0 b0 y0 c0 z0 t0 t1 |Slice:- m2 x0 b0 y0 c0 z0 t0 ",
	'Insertion of item in source array will also refresh "slicing"');

	// ................................ Act ..................................
	$.observable(tgt).insert(1, [{title: "t" + cnt++}, {title: "t" + cnt++}]);
	after = $("#result").text();

	// ............................... Assert .................................
	assert.equal(after, "|All:--- a0 m2 x0 b0 y0 c0 z0 t0 t1 t3 t4 |Slice:- m2 t3 t4 x0 b0 y0 c0 z0 t0 ",
	'Insertion of items at specific position in target array ("sliced") - items are rendered at insert location, but simply appended to source array');

	// ................................ Act ..................................
	$.observable(tgt).refresh([tgt[1], {title: "t" + cnt++}, tgt[0], tgt[2]]);
	after = $("#result").text();

	// ............................... Assert .................................
	assert.equal(after, "|All:--- a0 m2 t1 t3 t4 t5 |Slice:- t3 t5 m2 t4 ",
	'Calling refresh() on target array will append and remove items appropriately from source array and target array (and move items in target array)');

	// ................................ Act ..................................
	$.observable(tgt).remove();
	after = $("#result").text();

	// ............................... Assert .................................
	assert.equal(after, "|All:--- a0 m2 t1 t3 t5 |Slice:- t3 t5 m2 ",
	'Removing item in target array ("sliced") - items are rendered without refreshing "slicing".');

	// ................................ Act ..................................
	$.observable(movies).remove(0);
	after = $("#result").text();

	// ............................... Assert .................................
	assert.equal(after, "|All:--- m2 t1 t3 t5 |Slice:- t1 t3 ",
	'Removal of item in source array will also refresh "slicing".');

	// ................................ Act ..................................
	$.observable(tgt).move(0, 1);
	after = $("#result").text();

	// ............................... Assert .................................
	assert.equal(after, "|All:--- m2 t1 t3 t5 |Slice:- t3 t1 ",
	'Moving items in target array ("slice") - items are moved in target but not in source, and this is without refreshing "slicing".');

	// ................................ Act ..................................
	$.observable(movies).move(1, 3, 2);
	after = $("#result").text();

	// ............................... Assert .................................
	assert.equal(after, "|All:--- m2 t5 t1 t3 |Slice:- t5 t1 ",
	'Moving of items in source array will also refresh "slicing".');

	// ................................ Reset ................................
	$("#result").empty();

	assert.equal(JSON.stringify(_jsv.cbBindings), "{}",
	"Bindings all removed when content removed from DOM");

	// =============================== Arrange ===============================
var team = {
	members: [
		{name: "one", phones:[]},
		{name: "two", phones:[21, 22]}
	]
};

	$.templates(
'<ul>{^{for start=0 members}}{^{for start=0 phones}}<li>|{{:}}</li>{{else}}<li>|NoPhones</li>{{/for}}<li>|{{:name}}</li>{{else}}<li>|NoMembers</li>{{/for}}</ul>')
		.link("#result", team);

var firstLi = $("li")[0];

	// ............................... Assert .................................
	assert.equal(
		$.view("ul").views._1._prv === firstLi
		&& $.view("ul").views._1.tag._prv === firstLi
		&& $.view("ul").views._1.views["0"].views._1._prv === firstLi
		&& $.view("ul").views._1.views["0"].views._1.tag._prv === firstLi
		&& $("#result").text(), "|NoPhones|one|21|22|two",
		"First li is _prv for {{for}} tags");

	// ................................ Act ..................................
	$.observable(team.members).move(1, 0);

	// ............................... Assert .................................
firstLi = $("li")[0];

	assert.equal(
		$.view("ul").views._1._prv === firstLi
		&& $.view("ul").views._1.tag._prv === firstLi
		&& $.view("ul").views._1.views["0"].views._1._prv === firstLi
		&& $.view("ul").views._1.views["0"].views._1.tag._prv === firstLi
		&& $("#result").text(), "|21|22|two|NoPhones|one",
		"After observable move, first li is _prv for {{for}} tags");

	// ................................ Act ..................................
		$.observable(team.members).remove(0);

	// ............................... Assert .................................
firstLi = $("li")[0];

	assert.equal(
		$.view("ul").views._1._prv === firstLi
		&& $.view("ul").views._1.tag._prv === firstLi
		&& $.view("ul").views._1.views["0"].views._1._prv === firstLi
		&& $.view("ul").views._1.views["0"].views._1.tag._prv === firstLi
		&& $("#result").text(), "|NoPhones|one",
		"After remove, first li is _prv for {{for}} tags");

	// ................................ Act ..................................
	$.observable(team.members).remove(0);

	// ............................... Assert .................................
firstLi = $("li")[0];

	assert.equal(
		$.view("ul").views._2._prv === firstLi
		&& $.view("ul").views._2.tag._prv === firstLi
		&& $.view("ul").views._3._prv === firstLi
		&& $.view("ul").views._3.tag._prv === firstLi
		&& $("#result").text(), "|NoMembers",
		"After removing all, first li is _prv for {{for}} tags");

	//................................ Reset ................................
	$("#result").empty();

	// ............................... Assert .................................
	assert.equal(JSON.stringify(_jsv.cbBindings), "{}",
	"dataMap bindings all removed when tag disposed (content removed from DOM)");

	$.views.settings.advanced({_jsv: false});
});

QUnit.test("{^{for}} with start end sort filter reverse: Incremental rendering", function(assert) {
	var data = {
		p_st: 2,
		p_en: 4,
		p_rev: false,
		t_st: 0,
		t_en: 4,
		t_stp: undefined,
		t_mapdeps: "flt",
		flt: "l",
		people: [
			"Jo",
			"Bob",
			"Jane",
			"Jeff",
			"May",
			"Alice"
		],
		things: [
			{is: "table"},
			{is: "porcelain"},
			{is: "lamp"},
			{is: "hat"}
		]
	},
	out = "",
	content = "",
	people = data.people;

	$.templates(
		'{^{for skip}}{{:~rndr(#data)}}'
	+ '{{else people ~foo="test" start=p_st end=p_en reverse=p_rev}}|{{:~rndr(#data)}}'
	+ '{{else things sort=t_srt filter=t_flt start=t_st end=t_en step=t_stp mapDepends=t_mapdeps}}|{{:~rndr(is)}}'
	+ '{{else}}None{{/for}}'
	)
		.link("#result", data, {
			rndr: function(value) {
				out += "|" + value;
				return value;
			}
		});

	// ............................... Assert .................................
	assert.equal($("#result").text() + "::" + out, "|Jane|Jeff::|Jane|Jeff", 'initial render, first {{else}} block');

	// ................................ Act ..................................
	out = "";
	$.observable(data).setProperty("skip", "SkipTheList");

	// ............................... Assert .................................
	assert.equal($("#result").text() + "::" + out, "SkipTheList::|SkipTheList", 'move to initial block (no mapped list');

	// ................................ Act ..................................
	out = "";
	$.observable(data).setProperty("skip", undefined);

	// ............................... Assert .................................
	assert.equal($("#result").text() + "::" + out, "|Jane|Jeff::|Jane|Jeff", 'move back to {{else people}} block');

	// ................................ Act ..................................
	out = "";
	$.observable(data).setProperty("p_st", 1);

	// ............................... Assert .................................
	assert.equal($("#result").text() + "::" + out, "|Bob|Jane|Jeff::|Bob", 'incremental, on reducing start');

	// ................................ Act ..................................
	out = "";
	$.observable(data).setProperty("p_en", 5);

	// ............................... Assert .................................
	assert.equal($("#result").text() + "::" + out, "|Bob|Jane|Jeff|May::|May", 'incremental, on increasing end');

	// ................................ Act ..................................
	out = "";
	$.observable(data).setProperty("p_en", 3);

	// ............................... Assert .................................
	assert.equal($("#result").text() + "::" + out, "|Bob|Jane::", 'incremental, on reducing end');

	// ................................ Act ..................................
	out = "";
	$.observable(data).setProperty("p_st", 4);

	// ............................... Assert .................................
	assert.equal($("#result").text() + "::" + out, "|table|porcelain|lamp|hat::|table|porcelain|lamp|hat", 'incremental, on increasing start, no items, moves to {{else}} block');

	// ................................ Act ..................................
	out = "";
	$.observable(data).setProperty("t_st", -1);

	// ............................... Assert .................................
	assert.equal($("#result").text() + "::" + out, "|hat::", 'incremental, on changing start - integer from end');

	// ................................ Act ..................................
	out = "";
	$.observable(data).setProperty("t_en", -2);

	// ............................... Assert .................................
	assert.equal($("#result").text() + "::" + out, "None::", 'incremental, on changing end - integer from end, no items, moves to final {{else}}');

		// ................................ Act ..................................
	out = "";
	$.observable(data).setProperty({p_st: 1, p_en:40});

	// ............................... Assert .................................
	assert.equal($("#result").text() + "::" + out, "|Bob|Jane|Jeff|May|Alice::|Bob|Jane|Jeff|May|Alice", 'incremental, on changing start/end - moves to first block');

	// ................................ Act ..................................
	out = "";
	$.observable(data).setProperty("p_rev", true);

	// ............................... Assert .................................
	assert.equal($("#result").text() + "::" + out, "|May|Jeff|Jane|Bob|Jo::|Jo", 'incremental, set reverse=true');

	// ................................ Act ..................................
	out = "";
	$.observable(data).setProperty({p_en: 0, t_st: 0, t_en: 10});

	// ............................... Assert .................................
	assert.equal($("#result").text() + "::" + out, "|table|porcelain|lamp|hat::|table|porcelain|lamp|hat", 'incremental, moves to second block');

	// ................................ Act ..................................
	out = "";
	$.observable(data).setProperty("t_srt", "is");

	// ............................... Assert .................................
	assert.equal($("#result").text() + "::" + out, "|hat|lamp|porcelain|table::", 'incremental, on changing start');

	// ................................ Act ..................................
	out = "";
	$.observable(data).setProperty("t_flt", function(item, index, items) {
		return index%2 === 1; // Include only odd index items
	});

	// ............................... Assert .................................
	assert.equal($("#result").text() + "::" + out, "|lamp|table::", 'incremental, on setting filter');

	// ................................ Act ..................................
	out = "";
	$.observable(data).setProperty({t_st: 0, t_en: 10, t_flt: false, t_srt: function(a, b) {
		return a.is.length> b.is.length? 1 : a.is.length< b.is.length? -1 : 0; // Sort by string length of items
	}});

	// ............................... Assert .................................
	assert.equal($("#result").text() + "::" + out, "|hat|lamp|table|porcelain::|hat|porcelain", 'incremental, on setting sort function');

	// ................................ Act ..................................
	out = "";
	$.observable(data).setProperty("t_flt", function(item, index, items) {
		var flt = this.view.data.flt;
		return flt ? item.is.toLowerCase().indexOf(flt.toLowerCase()) !== -1 : true;
	});

	// ............................... Assert .................................
	assert.equal($("#result").text() + "::" + out, "|lamp|table|porcelain::", 'incremental, on setting filter, with flt="l"');

	// ................................ Act ..................................
	out = "";
	$.observable(data).setProperty("flt", "t");

	// ............................... Assert .................................
	assert.equal($("#result").text() + "::" + out, "|hat|table::|hat", 'incremental, on setting flt to "t"');

	// ................................ Act ..................................
	out = "";
	$.observable(data).setProperty("flt", "e");

	// ............................... Assert .................................
	assert.equal($("#result").text() + "::" + out, "|table|porcelain::|porcelain", 'incremental, on setting flt to "e"');

	// ................................ Act ..................................
	out = "";
	$.observable(data.things).insert(2, [{is: "cupboard"}, {is: "window"}]);

	// ............................... Assert .................................
	assert.equal($("#result").text() + "::" + out, "|table|porcelain::", 'incremental, on inserting items');

	// ................................ Act ..................................
	out = "";
	$.observable(data).setProperty("flt", "");

	// ............................... Assert .................................
	assert.equal($("#result").text() + "::" + out, "|hat|lamp|table|window|cupboard|porcelain::|hat|lamp|window|cupboard", 'incremental, on setting flt to ""');

	// ................................ Act ..................................
	out = "";
	$.observable(data).setProperty("t_srt", false);

	// ............................... Assert .................................
	assert.equal($("#result").text() + "::" + out, "|table|porcelain|cupboard|window|lamp|hat::", 'incremental, on setting sort to false');

	// ................................ Act ..................................
	out = "";
	$.observable(data).setProperty("t_stp", 3);

	// ............................... Assert .................................
	assert.equal($("#result").text() + "::" + out, "|table|window::", 'incremental, on setting step to 3');

	// ................................ Act ..................................
	out = "";
	$.observable(data).setProperty("t_stp", 2);

	// ............................... Assert .................................
	assert.equal($("#result").text() + "::" + out, "|table|cupboard|lamp::|cupboard|lamp", 'incremental, on setting step to 2');

	// ................................ Act ..................................
	out = "";
	$.observable(data.things).move(1, 4, 2);

	// ............................... Assert .................................
	assert.equal($("#result").text() + "::" + out, "|table|lamp|porcelain::|porcelain", 'incremental, on using move(1, 4, 2)');

	// ................................ Act ..................................
	out = "";
	$.observable(data).setProperty("t_stp", false);

	// ............................... Assert .................................
	assert.equal($("#result").text() + "::" + out, "|table|window|lamp|hat|porcelain|cupboard::|window|hat|cupboard", 'incremental, on setting step to false');

	// ................................ Act ..................................
	out = "";
	$.observable(data.things).refresh([data.things[4], data.things[2], data.things[0], data.things[3]]);

	// ............................... Assert .................................
	assert.equal($("#result").text() + "::" + out, "|porcelain|lamp|table|hat::", 'incremental, on using refresh(...)');

	// ................................ Act ..................................
	out = "";
	$.observable(data).setProperty("t_st", 10);

	// ............................... Assert .................................
	assert.equal($("#result").text() + "::" + out, "None::", 'incremental, move to final {{else}} block');

	// ................................ Reset ................................
	$("#result").empty();

	// =============================== Arrange ===============================
	var data = {
		p_rev: false,
		people: [
			"Jo",
			"Bob",
			"Jane"
		]
	},
	out = "",
	content = "",
	people = data.people;

	$.templates(
		'{^{for people sort=p_srt reverse=p_rev}}|{{:~rndr(#data)}}{{/for}}'
	)
		.link("#result", data, {
			rndr: function(value) {
				out += "|" + value;
				return value;
			}
		});

	// ............................... Assert .................................
	assert.equal($("#result").text() + "::" + out, "|Jo|Bob|Jane::|Jo|Bob|Jane", 'initial render, (no initial DataMap use)');

	// ................................ Act ..................................
	out = "";
	$.observable(data).setProperty("p_rev", true);

	// ............................... Assert .................................
	assert.equal($("#result").text() + "::" + out, "|Jane|Bob|Jo::", 'reverse order (DataMap used - incremental re-order)');

	// ................................ Act ..................................
	out = "";
	$.observable(data).setProperty("p_srt", true);

	// ............................... Assert .................................
	assert.equal($("#result").text() + "::" + out, "|Jo|Jane|Bob::", 'reverse sort (DataMap used - incremental re-order)');

	// ................................ Reset ................................
	$("#result").empty();
});

QUnit.test("{^{props}} with start end sort filter reverse: Incremental rendering", function(assert) {
	var data = {
		p_st: 2,
		p_en: 4,
		p_rev: false,
		t_st: 0,
		t_en: 4,
		t_stp: undefined,
		t_mapdeps: "flt",
		flt: "l",
		people: {
			one: "Jo",
			b: "Bob",
			x: "Jane",
			two: "Jeff",
			m: "May",
			last: "Alice"
		},
		things: {
			a: {is: "table"},
			b: {is: "porcelain"},
			c: {is: "lamp"},
			d: {is: "hat"}
		}
	},
	out = "",
	content = "",
	people = data.people;

	$.templates(
		'{^{props skip}}{{:~rndr(prop)}}'
	+ '{{else people start=p_st end=p_en reverse=p_rev}}|{{:~rndr(prop)}}'
	+ '{{else things sort=t_srt filter=t_flt start=t_st end=t_en step=t_stp mapDepends=t_mapdeps}}|{{:~rndr(prop.is)}}'
	+ '{{else}}None{{/props}}'
	)
		.link("#result", data, {
			rndr: function(value) {
				out += "|" + value;
				return value;
			}
		});

	// ............................... Assert .................................
	assert.equal($("#result").text() + "::" + out, "|Jane|Jeff::|Jane|Jeff", 'initial render, first {{else}} block');

	// ................................ Act ..................................
	out = "";
	$.observable(data).setProperty("skip", {is: "SkipTheList"});

	// ............................... Assert .................................
	assert.equal($("#result").text() + "::" + out, "SkipTheList::|SkipTheList", 'move to initial block (no mapped list');

	// ................................ Act ..................................
	out = "";
	$.observable(data).setProperty("skip", undefined);

	// ............................... Assert .................................
	assert.equal($("#result").text() + "::" + out, "|Jane|Jeff::|Jane|Jeff", 'move back to {{else people}} block');

	// ................................ Act ..................................
	out = "";
	$.observable(data).setProperty("p_st", 1);

	// ............................... Assert .................................
	assert.equal($("#result").text() + "::" + out, "|Bob|Jane|Jeff::|Bob", 'incremental, on reducing start');

	// ................................ Act ..................................
	out = "";
	$.observable(data).setProperty("p_en", 5);

	// ............................... Assert .................................
	assert.equal($("#result").text() + "::" + out, "|Bob|Jane|Jeff|May::|May", 'incremental, on increasing end');

	// ................................ Act ..................................
	out = "";
	$.observable(data).setProperty("p_en", 3);

	// ............................... Assert .................................
	assert.equal($("#result").text() + "::" + out, "|Bob|Jane::", 'incremental, on reducing end');

	// ................................ Act ..................................
	out = "";
	$.observable(data).setProperty("p_st", 4);

	// ............................... Assert .................................
	assert.equal($("#result").text() + "::" + out, "|table|porcelain|lamp|hat::|table|porcelain|lamp|hat", 'incremental, on increasing start, no items, moves to {{else}} block');

	// ................................ Act ..................................
	out = "";
	$.observable(data).setProperty("t_st", -1);

	// ............................... Assert .................................
	assert.equal($("#result").text() + "::" + out, "|hat::", 'incremental, on changing start - integer from end');

	// ................................ Act ..................................
	out = "";
	$.observable(data).setProperty("t_en", -2);

	// ............................... Assert .................................
	assert.equal($("#result").text() + "::" + out, "None::", 'incremental, on changing end - integer from end, no items, moves to final {{else}}');

	// ................................ Act ..................................
	out = "";
	$.observable(data).setProperty({p_st: 1, p_en:40});

	// ............................... Assert .................................
	assert.equal($("#result").text() + "::" + out, "|Bob|Jane|Jeff|May|Alice::|Bob|Jane|Jeff|May|Alice", 'incremental, on changing start/end - moves to first block');

	// ................................ Act ..................................
	out = "";
	$.observable(data).setProperty("p_rev", true);

	// ............................... Assert .................................
	assert.equal($("#result").text() + "::" + out, "|May|Jeff|Jane|Bob|Jo::|Jo", 'incremental, set reverse=true');

	// ................................ Act ..................................
	out = "";
	$.observable(data).setProperty({p_en: 0, t_st: 0, t_en: 10});

	// ............................... Assert .................................
	assert.equal($("#result").text() + "::" + out, "|table|porcelain|lamp|hat::|table|porcelain|lamp|hat", 'incremental, moves to second block');

	// ................................ Act ..................................
	out = "";
	$.observable(data).setProperty("t_srt", "prop.is");

	// ............................... Assert .................................
	assert.equal($("#result").text() + "::" + out, "|hat|lamp|porcelain|table::", 'incremental, on changing start');

	// ................................ Act ..................................
	out = "";
	$.observable(data).setProperty("t_flt", function(item, index, items) {
		return index%2 === 1; // Include only odd index items
	});

	// ............................... Assert .................................
	assert.equal($("#result").text() + "::" + out, "|lamp|table::", 'incremental, on setting filter');

	// ................................ Act ..................................
	out = "";
	$.observable(data).setProperty({t_st: 0, t_en: 10, t_flt: false, t_srt: function(a, b) {
		return a.prop.is.length> b.prop.is.length? 1 : a.prop.is.length< b.prop.is.length? -1 : 0; // Sort by string length of items
	}});

	// ............................... Assert .................................
	assert.equal($("#result").text() + "::" + out, "|hat|lamp|table|porcelain::|hat|porcelain", 'incremental, on setting sort function');

	// ................................ Act ..................................
	out = "";
	$.observable(data).setProperty("t_flt", function(item, index, items) {
		var flt = this.view.data.flt;
		return flt ? item.prop.is.toLowerCase().indexOf(flt.toLowerCase()) !== -1 : true;
	});

	// ............................... Assert .................................
	assert.equal($("#result").text() + "::" + out, "|lamp|table|porcelain::", 'incremental, on setting filter, with flt="l"');

	// ................................ Act ..................................
	out = "";
	$.observable(data).setProperty("flt", "t");

	// ............................... Assert .................................
	assert.equal($("#result").text() + "::" + out, "|hat|table::|hat", 'incremental, on setting flt to "t"');

	// ................................ Act ..................................
	out = "";
	$.observable(data).setProperty("flt", "e");

	// ............................... Assert .................................
	assert.equal($("#result").text() + "::" + out, "|table|porcelain::|porcelain", 'incremental, on setting flt to "e"');

	// ................................ Act ..................................
	out = "";
	$.observable(data.things).setProperty({e: {is: "cupboard"}, f: {is: "window"}});

	// ............................... Assert .................................
	assert.equal($("#result").text() + "::" + out, "|table|porcelain::", 'incremental, on inserting items');

	// ................................ Act ..................................
	out = "";
	$.observable(data).setProperty("flt", "");

	// ............................... Assert .................................
	assert.equal($("#result").text() + "::" + out, "|hat|lamp|table|window|cupboard|porcelain::|hat|lamp|window|cupboard", 'incremental, on setting flt to ""');

	// ................................ Act ..................................
	out = "";
	$.observable(data).setProperty("t_srt", "prop.is");

	// ............................... Assert .................................
	assert.equal($("#result").text() + "::" + out, "|cupboard|hat|lamp|porcelain|table|window::", 'incremental, on setting sort to "prop.is"');

	// ................................ Act ..................................
	out = "";
	$.observable(data).setProperty("t_srt", false);

	// ............................... Assert .................................
	assert.equal($("#result").text() + "::" + out, "|hat|lamp|table|window|cupboard|porcelain::", 'incremental, on setting sort to false');

	// ................................ Act ..................................
	out = "";
	$.observable(data).setProperty("t_stp", 3);

	// ............................... Assert .................................
	assert.equal($("#result").text() + "::" + out, "|hat|window::", 'incremental, on setting step to 3');

	// ................................ Act ..................................
	out = "";
	$.observable(data).setProperty("t_stp", 2);

	// ............................... Assert .................................
	assert.equal($("#result").text() + "::" + out, "|hat|table|cupboard::|table|cupboard", 'incremental, on setting step to 2');

	// ................................ Act ..................................
	out = "";
	$.observable(data).setProperty("t_stp", false);

	// ............................... Assert .................................
	assert.equal($("#result").text() + "::" + out, "|hat|lamp|table|window|cupboard|porcelain::|lamp|window|porcelain", 'incremental, on setting step to false');

	// ................................ Act ..................................
	out = "";
	$.observable(data).setProperty("t_st", 10);

	// ............................... Assert .................................
	assert.equal($("#result").text() + "::" + out, "None::", 'incremental, move to final {{else}} block');

	// ................................ Reset ................................
	$("#result").empty();
});

QUnit.test("{^{if}}...{{else}}...{{/if}}", function(assert) {
	$.views.settings.advanced({_jsv: true}); // For using cbBindings store

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
	assert.equal(after, boundIfElseTmpl.render(data),
	'Bound if and else with link render the same as unbound, when using the JsRender render() method');

	// ............................... Assert .................................
	assert.equal(after, "ONE notTwo THREE ",
	'Bound if and else render correct blocks based on boolean expressions');

	// ................................ Act ..................................
	$.observable(data).setProperty({one: false, two: false, three: true});
	after = $("#result").text();

	// ............................... Assert .................................
	assert.equal(after, "notOne notTwo THREE ",
	'Bound if and else render correct blocks based on boolean expressions');

	// ................................ Act ..................................
	$.observable(data).setProperty({one: false, two: true, three: false});
	after = $("#result").text();

	// ............................... Assert .................................
	assert.equal(after, "notOne TWO notThree ",
	'Bound if and else render correct blocks based on boolean expressions');

	// ................................ Reset ................................
	$("#result").empty();

	// =============================== Arrange ===============================
	data = {expanded: true};
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

	assert.equal(deferredString && after, 'DeepContentafterDeep',
	'With deep bound {^{if}} tag, there is deferred binding and binding behaves correctly after removing and inserting');

	// ................................ Act ..................................
	$.observable(data).setProperty("expanded", false);

	// ............................... Assert .................................
	after = $("#result").text();
	deferredString = $("#result tr")[0]._df; // "#322^/322^"
	// With deep version, the tokens for the {^{if}} binding had to be deferred - we test the format:
	deferredString = /#(\d+\^)\/\1/.test(deferredString);

	assert.equal(deferredString && after, 'afterDeep',
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
	assert.equal(!deferredString && after, 'ShallowContentafterShallow',
	'With shallow bound {^{if}} tag, there is no deferred binding, and binding behaves correctly after removing and inserting');

	// ................................ Act ..................................
	$.observable(data).setProperty("expanded", false);

	// ............................... Assert .................................
	after = $("#result").text();
	deferredString = $("#result tr")[0]._df; // ""
	// With shallow version, no deferred binding

	assert.equal(!deferredString && after, 'afterShallow',
	'With shallow bound {^{if}} tag, there is no deferred binding and binding behaves correctly after further remove');

	// ................................ Reset ................................
	$("#result").empty();
	res = "";

	$.views.settings.advanced({_jsv: false});
});

QUnit.test("{^{props}} basic", function(assert) {
	$.views.settings.advanced({_jsv: true}); // For using cbBindings store

	// =============================== Arrange ===============================
	var root = {
		objA: {propA1: "valA1a"},
		objB: {propB1: "valB1a"}
	};

	$.templates('{^{props objA}}{^{:key}}:{^{:prop}},{{/props}}')
		.link("#result", root);

	// ................................ Act ..................................
	before = $("#result").text();
	$.observable(root.objA).setProperty({propA1: "valA1b"});
	after = $("#result").text();

	// ............................... Assert .................................
	assert.equal(before + "|" + after, 'propA1:valA1a,|propA1:valA1b,',
	'{^{props}} - set existing property');

	// ................................ Act ..................................
	before = $("#result").text();
	$.observable(root.objA).setProperty({propA1: "valA1c", propA2: "valA2a"});
	after = $("#result").text();

	// ............................... Assert .................................
	assert.equal(before + "|" + after, 'propA1:valA1b,|propA1:valA1c,propA2:valA2a,',
	'{^{props}} - set new property');

	// ................................ Act ..................................
	before = $("#result").text();
	$.observable(root.objA).setProperty({propA1: "", propA2: null});
	after = $("#result").text();

	// ............................... Assert .................................
	assert.equal(before + "|" + after, 'propA1:valA1c,propA2:valA2a,|propA1:,propA2:,',
	'{^{props}} - set property to empty string or null');

	// ................................ Act ..................................
	before = $("#result").text();
	$.observable(root.objA).setProperty({propA1: null});
	after = $("#result").text();

	// ............................... Assert .................................
	assert.equal(before + "|" + after, 'propA1:,propA2:,|propA1:,propA2:,',
	'{^{props}} - all properties null');

	// ................................ Act ..................................
	before = $("#result").text();
	$.observable(root.objA).removeProperty("propA1").removeProperty("propA2");
	after = $("#result").text();

	// ............................... Assert .................................
	assert.equal(before + "|" + after, 'propA1:,propA2:,|',
	'{^{props}} - all properties removed');

	// ................................ Act ..................................
	before = $("#result").text();
	$.observable(root.objA).setProperty({propA1: "valA1b"});
	after = $("#result").text();

	// ............................... Assert .................................
	assert.equal(before + "|" + after, "|propA1:valA1b,",
	'{^{props}} - set property where there were none');

	// ................................ Act ..................................
	before = $("#result").text();
	$.observable(root).setProperty({objA: {}});
	after = $("#result").text();

	// ............................... Assert .................................
	assert.equal(before + "|" + after, "propA1:valA1b,|",
	'{^{props}} - set whole object to empty object');

	// ................................ Act ..................................
	before = $("#result").text();
	$.observable(root).setProperty({objA: {propX: "XX"}});
	after = $("#result").text();

	// ............................... Assert .................................
	assert.equal(before + "|" + after, "|propX:XX,",
	'{^{props}} - set whole object to different object');

	//................................ Reset ................................
	$("#result").empty();

	// ............................... Assert .................................
	assert.equal(JSON.stringify(_jsv.cbBindings), "{}",
		"{^{props}} dataMap bindings all removed when tag disposed (content removed from DOM)");

	$.views.settings.advanced({_jsv: false});
});

QUnit.test("{^{props}} modifying content, through arrayChange/propertyChange on target array", function(assert) {
var done = assert.async();

	$.views.settings.advanced({_jsv: true}); // For using cbBindings store

	// =============================== Arrange ===============================

	var root = {
		objA: {propA1: "valA1a"}
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
				$.observable(arr).insert({key: "addkey", prop: "addprop"});
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
				$.observable(item).setProperty({key: "changed", prop: "changedValue"});
			}
		});

	// ................................ Act ..................................
	before = $("#result").text();
	$(".addProp").click();
	after = $("#result").text();

	// ............................... Assert .................................
	assert.equal(before + "|" + after, "propA1:valA1a,removeadd,change,|propA1:valA1a,removeadd,change,addkey:addprop,removeadd,change,",
	'{^{props}} - add properties to props target array');

	// ................................ Act ..................................
	before = $("#result").text();
	$(".removeProp:first()").click();
	after = $("#result").text();

	// ............................... Assert .................................
	assert.equal(before + "|" + after, "propA1:valA1a,removeadd,change,addkey:addprop,removeadd,change,|addkey:addprop,removeadd,change,",
	'{^{props}} - remove properties from props target array');

	// ................................ Act ..................................
	before = $("#result").text();
	$(".changeProp").click();
	after = $("#result").text();

	// ............................... Assert .................................
	assert.equal(before + "|" + after, "addkey:addprop,removeadd,change,|changed:changedValue,removeadd,change,",
	'{^{props}} - change value of key and prop in props target array');

	// ................................ Act ..................................
	before = $("#result").text();
	keydown($(".changePropInput").val("newValue"));

setTimeout(function() {
	after = $("#result").text();

	// ............................... Assert .................................
	assert.equal(before + "|" + after + "|" + JSON.stringify(root.objA), "changed:changedValue,removeadd,change,|changed:newValue,removeadd,change,|{\"changed\":\"newValue\"}",
	'{^{props}} - change value of input bound to prop in props target array');

	// ................................ Act ..................................
	before = $("#result").text();
	keydown($(".changeKeyInput").val("newKey"));

setTimeout(function() {
	after = $("#result").text();

	// ............................... Assert .................................
	assert.equal(before + "|" + after + "|" + JSON.stringify(root.objA), "changed:newValue,removeadd,change,|newKey:newValue,removeadd,change,|{\"newKey\":\"newValue\"}",
	'{^{props}} - change value of input bound to key in props target array');

	// ................................ Reset ................................

	before = "" + $._data(root).events.propertyChange.length + "-" + $._data(root.objA).events.propertyChange.length;
	$("#result").empty();
	after = "" + ($._data(root).events === undefined) + "-" + ($._data(root.objA).events === undefined) + " -" + JSON.stringify(_jsv.cbBindings);

	// ............................... Assert .................................
	assert.equal(before + "|" + after, "1-1|true-true -{}",
	'{^{props}} dataMap bindings all removed when tag disposed (content removed from DOM)');

	$.views.settings.advanced({_jsv: false});

done();
}, 0);
}, 0);
});

QUnit.test("{^{props}}...{{else}} ...", function(assert) {
	$.views.settings.advanced({_jsv: true}); // For using cbBindings store

	// =============================== Arrange ===============================

	var root = {
		objA: {propA1: "valA1"},
		objB: {propB1: "valb1", propB2: "valb2"}
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
	assert.equal(before + "|" + after, "propA1:valA1,|propA1:valA1,propA2:valA2,",
	'{^{props}} - set new property on objA - shows additional property');

	// ................................ Act ..................................
	before = $("#result").text();
	$.observable(root.objA).removeProperty("propA1").removeProperty("propA2");
	after = $("#result").text();

	// ............................... Assert .................................
	assert.equal(before + "|" + after, "propA1:valA1,propA2:valA2,|propB1:valb1,propB2:valb2,",
	'{^{props}} - remove properties from objA - switches to {{else objB}}');

	// ................................ Act ..................................
	before = $("#result").text();
	$.observable(root.objB).removeProperty("propB1").removeProperty("propB2");
	after = $("#result").text();

	// ............................... Assert .................................
	assert.equal(before + "|" + after, "propB1:valb1,propB2:valb2,|NONE",
	'{^{props}} - remove properties from objB - switches to {{else}}');

	// ................................ Act ..................................
	before = $("#result").text();
	$.observable(root.objB).removeProperty("NotAProperty");
	after = $("#result").text();

	// ............................... Assert .................................
	assert.equal(before + "|" + after, "NONE|NONE",
	'{^{props}} - remove inexistant property from objB - remains on {{else}}');

	// ................................ Act ..................................
	before = $("#result").text();
	$.observable(root.objB).setProperty("newProp", "");
	after = $("#result").text();

	// ............................... Assert .................................
	assert.equal(before + "|" + after, "NONE|newProp:,",
	'{^{props}} - set property on objB to undefined - render {{else objB}}');

	// ................................ Reset ................................
	$("#result").empty();

	// ............................... Assert .................................
	assert.equal(JSON.stringify(_jsv.cbBindings), "{}",
		"{^{props}} dataMap bindings all removed when tag disposed (content removed from DOM)");

	// =============================== Arrange ===============================

	root = {
		objA: {propA1: "valA1"},
		objB: {propB1: "valb1", propB2: "valb2"}
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
	assert.equal(before + "|" + after, "propA1:valA1,remove,|propB1:valb1,remove,propB2:valb2,remove,",
	'{^{props}} - remove properties from objA target array - switches to {{else objB}}');

	// ................................ Act ..................................
	before = $("#result").text();
	$(".removePropB").click();
	after = $("#result").text();

	// ............................... Assert .................................
	assert.equal(before + "|" + after, "propB1:valb1,remove,propB2:valb2,remove,|NONE",
	'{^{props}} - remove properties from objB target array - switches to {{else}}');

	// ................................ Reset ................................
	$("#result").empty();

	// ............................... Assert .................................
	assert.equal(JSON.stringify(_jsv.cbBindings), "{}",
		"{^{props}} dataMap bindings all removed when tag disposed (content removed from DOM)");

	$.views.settings.advanced({_jsv: false});
});

QUnit.test("{^{props start end sort filter reverse}}...{{else}} ...", function(assert) {
	$.views.settings.advanced({_jsv: true}); // For using _jsv

	// =============================== Arrange ===============================
	var movies = {keyf: {title: "a0"}, keye: {title: "x0"}, keyd: {title: "b0"}, keyc: {title: "y0"}, keyb: {title: "c0"}, keya: {title: "z0"}},
		ctx = {},
		cnt = 0;

$.templates(
'|All:--- {^{props movies}}{{:key}}:{{:prop.title}}  {{/props}}<br/>\
|Sort:-- {^{props movies sort="prop.title" reverse=true}}{{:prop.title}} {{/props}}<br/>\
|Filter: {^{props movies sort="prop.title" reverse=true filter=~odd}}{{:prop.title}} {{/props}}<br/>\
|Slice:- {^{props movies sort="prop.title" reverse=true filter=~odd start=1 end=-1 this=~ctx.target}}{{:prop.title}} {{/props}}')
		.link("#result", {movies: movies}, {
			ctx: ctx,
			odd: function(item, index, items) {
				return index%2;
			}
		});

	var tgt = ctx.target.tagCtx.contentView.data
	function newProp(title) {
		return {key: "key"+cnt++, prop: {title: title}}
	}

	// ................................ Act ..................................
	after = $("#result").text();

	// ............................... Assert .................................
		assert.equal(after, "|All:--- keyf:a0  keye:x0  keyd:b0  keyc:y0  keyb:c0  keya:z0  |Sort:-- z0 y0 x0 c0 b0 a0 |Filter: y0 c0 a0 |Slice:- c0 ",
	'{{props}} with Sorting, filtering, reverse, start and end settings');

	// ................................ Act ..................................
	$.observable(tgt).insert(newProp("t" + cnt));
	after = $("#result").text();

	// ............................... Assert .................................
	assert.equal(after, "|All:--- keyf:a0  keye:x0  keyd:b0  keyc:y0  keyb:c0  keya:z0  key0:t0  |Sort:-- z0 y0 x0 t0 c0 b0 a0 |Filter: y0 t0 b0 |Slice:- c0 t0 ",
	'Appending of item in target array (sorted, filtered etc) - item is rendered without refreshing sort, filter etc.');

	ctx.target.refresh();
	after = $("#result").text();

	// ............................... Assert .................................
	assert.equal(after, "|All:--- keyf:a0  keye:x0  keyd:b0  keyc:y0  keyb:c0  keya:z0  key0:t0  |Sort:-- z0 y0 x0 t0 c0 b0 a0 |Filter: y0 t0 b0 |Slice:- t0 ",
	'To refresh, sort, slice etc with new item included, call tag.refresh() ');

	// ................................ Act ..................................
	$.observable(tgt).insert(0, newProp("t" + cnt));
	after = $("#result").text();

	// ............................... Assert .................................
	assert.equal(after, "|All:--- keyf:a0  keye:x0  keyd:b0  keyc:y0  keyb:c0  keya:z0  key0:t0  key1:t1  |Sort:-- z0 y0 x0 t1 t0 c0 b0 a0 |Filter: y0 t1 c0 a0 |Slice:- t1 t0 ",
	'Insertion of item in target array (sorted, filtered etc) - item is rendered without refreshing sort, filter etc.');

	// ................................ Act ..................................
	$.observable(movies).setProperty("key" + cnt++, {title: "m" + cnt});
	after = $("#result").text();

	// ............................... Assert .................................
	assert.equal(after,
"|All:--- keyf:a0  keye:x0  keyd:b0  keyc:y0  keyb:c0  keya:z0  key0:t0  key1:t1  key2:m3  |Sort:-- z0 y0 x0 t1 t0 m3 c0 b0 a0 |Filter: y0 t1 m3 b0 |Slice:- t1 m3 ",
	'Insertion of item in source array will also refresh sort, filter etc.');

	// ................................ Act ..................................
	$.observable(tgt).insert(1, [newProp("t" + cnt), newProp("t" + cnt)]);
	after = $("#result").text();

	// ............................... Assert .................................
	assert.equal(after, "|All:--- keyf:a0  keye:x0  keyd:b0  keyc:y0  keyb:c0  keya:z0  key0:t0  key1:t1  key2:m3  key4:t4  key3:t3  |Sort:-- z0 y0 x0 t4 t3 t1 t0 m3 c0 b0 a0 |Filter: y0 t4 t1 m3 b0 |Slice:- t1 t3 t4 m3 ",
	'Insertion of multiple items in target array (sorted, filtered etc) - items are rendered without refreshing sort, filter etc.');

	// ................................ Act ..................................
	$.observable(tgt).refresh([tgt[1], newProp("t" + cnt), tgt[0]]);
	after = $("#result").text();

	// ............................... Assert .................................
	assert.equal(after, "|All:--- keyf:a0  keye:x0  keyd:b0  keyc:y0  keyb:c0  keya:z0  key0:t0  key1:t1  key3:t3  key5:t5  |Sort:-- z0 y0 x0 t5 t3 t1 t0 c0 b0 a0 |Filter: y0 t5 t1 c0 a0 |Slice:- t3 t5 t1 ",
	'Calling refresh() on target array will insert and remove items appropriately from source array and target array (and move items in target array) without refreshing sort, filter etc.');

	// ................................ Act ..................................
	$.observable(tgt).remove();
	after = $("#result").text();

	// ............................... Assert .................................
	assert.equal(after, "|All:--- keyf:a0  keye:x0  keyd:b0  keyc:y0  keyb:c0  keya:z0  key0:t0  key3:t3  key5:t5  |Sort:-- z0 y0 x0 t5 t3 t0 c0 b0 a0 |Filter: y0 t5 t0 b0 |Slice:- t3 t5 ",
	'Removing item in target array (sorted, filtered etc) - items are rendered without refreshing sort, filter etc.');

	// ................................ Act ..................................
	$.observable(movies).removeProperty("keyf");
	after = $("#result").text();

	// ............................... Assert .................................
	assert.equal(after, "|All:--- keye:x0  keyd:b0  keyc:y0  keyb:c0  keya:z0  key0:t0  key3:t3  key5:t5  |Sort:-- z0 y0 x0 t5 t3 t0 c0 b0 |Filter: y0 t5 t0 b0 |Slice:- t5 t0 ",
	'Removal of item in source array will also refresh sort, filter etc.');

	// ................................ Act ..................................
	$.observable(tgt).move(0, 1);
	after = $("#result").text();

	// ............................... Assert .................................
	assert.equal(after, "|All:--- keye:x0  keyd:b0  keyc:y0  keyb:c0  keya:z0  key0:t0  key3:t3  key5:t5  |Sort:-- z0 y0 x0 t5 t3 t0 c0 b0 |Filter: y0 t5 t0 b0 |Slice:- t0 t5 ",
	'Moving items in target array (sorted, filtered etc) - items are moved in target but not in source, and this is without refreshing sort, filter etc.');

	// ................................ Act ..................................
	$.observable(tgt).refresh([newProp("t" + cnt)]);
	after = $("#result").text();

	// ............................... Assert .................................
	assert.equal(after, "|All:--- keye:x0  keyd:b0  keyc:y0  keyb:c0  keya:z0  key3:t3  key6:t6  |Sort:-- z0 y0 x0 t6 t3 c0 b0 |Filter: y0 t6 c0 |Slice:- t6 ",
	'Calling refresh() on target array will insert and remove items appropriately from source array and target array (and move items in target array) without refreshing sort, filter etc.');

	// ................................ Act ..................................
	$.observable(movies).setProperty("key" + cnt++, {title: "m" + cnt});
	after = $("#result").text();

	// ............................... Assert .................................
	assert.equal(after, "|All:--- keye:x0  keyd:b0  keyc:y0  keyb:c0  keya:z0  key3:t3  key6:t6  key7:m8  |Sort:-- z0 y0 x0 t6 t3 m8 c0 b0 |Filter: y0 t6 m8 b0 |Slice:- t6 m8 ",
	'Insertion of item in source array will also refresh sort, filter etc.');

	// ................................ Act ..................................
	$.observable(tgt).insert(1, [newProp("t" + cnt), newProp("t" + cnt)]);
	after = $("#result").text();

	// ............................... Assert .................................
	assert.equal(after, "|All:--- keye:x0  keyd:b0  keyc:y0  keyb:c0  keya:z0  key3:t3  key6:t6  key7:m8  key9:t9  key8:t8  |Sort:-- z0 y0 x0 t9 t8 t6 t3 m8 c0 b0 |Filter: y0 t9 t6 m8 b0 |Slice:- t6 t8 t9 m8 ",
	'Insertion of multiple items in target array (sorted, filtered etc) - items are rendered without refreshing sort, filter etc.');

	// ................................ Reset ................................
	$("#result").empty();

	assert.equal(JSON.stringify(_jsv.cbBindings), "{}",
	"Bindings all removed when content removed from DOM");

	$.views.settings.advanced({_jsv: false});
});

QUnit.test('data-link="{on ...', function(assert) {

	$.views.settings.advanced({_jsv: true}); // For using _jsv

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
	assert.equal(before + "|" + after,
	"shape|line",
	'{on swap} calls swap method on click, with "this" pointer context on data object');

	// ................................ Reset ................................
	$("#result").empty();
	thing.type = "shape";

	// =============================== Arrange ===============================

	$.templates('<div data-link="{on ~swap}">{^{:type}}</div>')
		.link("#result", thing, {swap: swap});

	// ................................ Act ..................................
	before = $("#result").text();
	$("#result div").click();
	after = $("#result").text();

	// ............................... Assert .................................
	assert.equal(before + "|" + after,
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
	assert.equal(before + "|" + after,
	"shape |line true",
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
	assert.equal(before + "|" + after,
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
	assert.equal(before + "|" + after,
	"shape |line true",
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
	assert.equal(before + "|" + after,
	"shape |line true",
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
	assert.equal(before + "|" + after,
	"shape|lineshapeline",
	"{on 'mouseup mousedown blur' swap} calls util method on mouseup, mousedown and blur");

	// ................................ Reset ................................
	$("#result").empty();
	thing.type = "shape";
	delete thing.check;



	// =============================== Arrange ===============================

	$.templates('<div data-link="{on ~util[0].swap context=~util[0].data}">{^{:type}} </div>')
		.link("#result", thing, {
			util:
				[{
					swap: swap,
					data: thing
				}]
		});

	// ................................ Act ..................................
	before = $("#result").text();
	$("#result div").click();
	after = $("#result").text();

	// ............................... Assert .................................
	assert.equal(before + "|" + after,
	"shape |line ",
	'{on ~util[0].swap} calls util[0].swap helper method on click');

	// ................................ Reset ................................
	$("#result").empty();
	thing.type = "shape";



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
				eventArgs.linkCtx.tag.onUnbind();
			},
			refresh: function(ev, eventArgs) {
				res += "refresh ";
				eventArgs.linkCtx.tag.refresh();
			},
			test: function()
			{
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
	assert.equal(res,
	"1: test 2: test 3: unbind 4: 5: unbind 6: 7: test 8: refresh ",
	"multiple {on events selector method} bindings on container attach events on delegated elements. Also, tag.onDispose on tag instances removes specific handlers for corresponding elements/selectors");

	// ............................... Assert .................................
	assert.equal(eventBindings,
	"before: 1211 | after: undefinedundefined11",
	"onDispose removes specific delegated events");

	// ................................ Act ..................................
	res = "1: ";
	$("#divForOn").html("<input id='newlyAdded' />");

	$("#divForOn #newlyAdded").mouseup();

	res += "2: ";
	$("#divForOn #newlyAdded").keyup();

	// ............................... Assert .................................
	assert.equal(res,
	"1: test 2: ",
	"delegated {on events selector method} binding allows additional elements added to content to bind correctly");

	// ................................ Act ..................................
	$("#result").empty();
	eventBindings = "" + events.keydown + events.keyup + events.mouseup + JSON.stringify([_jsv.cbBindings, _jsv.bindings]);

	// ............................... Assert .................................
	assert.equal(eventBindings,
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
	assert.equal(data.res, "Advisorheytrue33 allow:true extraParam: 754|Followerheytrue33 allow:false extraParam: 754|",
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
			eventArgs.linkCtx.tag.onUnbind();
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
	assert.equal(res,
	"1: test 2: test 3: unbind 4: 5: unbind 6: 7: test 8: refresh ",
	"Top-level {on }: multiple {on events selector method} top-level bindings on container attach events on delegated elements. Also, tag.onDispose on tag instances removes specific handlers for corresponding elements/selectors");

	// ............................... Assert .................................
	assert.equal(eventBindings,
	"before: 1211 | after: undefinedundefined11",
	"Top-level {on }: onDispose removes specific delegated events");

	// ................................ Act ..................................
	res = "1: ";
	$("#divForOn").html("<input id='newlyAdded' />");

	$("#divForOn #newlyAdded").mouseup();

	res += "2: ";
	$("#divForOn #newlyAdded").keyup();

	// ............................... Assert .................................
	assert.equal(res,
	"1: test 2: ",
	"Top-level {on }: delegated {on events selector method} binding allows additional elements added to content to bind correctly");

	// ................................ Act ..................................
	$("#result").empty();
	eventBindings = "" + events.keydown + events.keyup + events.mouseup + JSON.stringify([_jsv.cbBindings, _jsv.bindings]);

	// ............................... Assert .................................
	assert.equal(eventBindings,
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
	assert.equal(data.res, "Advisorheytrue33 allow:true extraParam: 754|Followerheytrue33 allow:false extraParam: 754|",
	"Top-level {on 'click' selector method params...} : supports passing params to method, of any type, as well as setting data and context for the function call");

	// =============================== Arrange ===============================
	res = "1: ";
	data = {
		unbind: function(ev, eventArgs) {
			res += "unbind ";
			eventArgs.linkCtx.tag.onUnbind();
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

	events = $._data($("#linkTgt")[0]).events;

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
	assert.equal(res,
	"1: test 2: test 3: refresh 4: test 5: test 6: refresh ",
	'$.link(true, "#linkTgt", data): top-level linking to element (not container) links correctly, including \'{on }\' bindings');

	// ............................... Assert .................................
	eventBindings = "" + events.mouseup.length + events.mousedown.length + events.click.length;

	assert.equal(eventBindings,
	"111",
	'$.link(true, "#linkTgt", data): top-level linking to element (not container) adds {on } binding handlers correctly - including calling refresh() on {on } tag');

	// ................................ Act ..................................
	$.unlink("#linkTgt");

	// ............................... Assert .................................
	eventBindings = "" + events.mouseup + events.mousedown + events.click + JSON.stringify([_jsv.cbBindings, _jsv.bindings]);

	assert.equal(eventBindings,
	"undefinedundefinedundefined[{},{}]",
	'$.unlink("#linkTgt"): directly on top-level data-linked element (not through container) removes all \'{on }\' handlers');

	$.views.settings.advanced({_jsv: false});
});

QUnit.test('{^{radiogroup}}', function(assert) {

	// =============================== Arrange ===============================
	var tmpl = $.templates(
		'{^{radiogroup selected}}'
		+ '{^{for people}}'
			+ '<label><input type="radio" value="{{:name}}"/>:{{:name}}</label>'
		+ '{{/for}}'
	+'{{/radiogroup}}'
	);

	var model = {
			selected: "Jim",
			people: [
				{name: "Bob"},
				{name: "Jim"}
			]
		},
		newName = "new";

	// ............................... Act .................................
	tmpl.link("#result", model);

	res = $("#result input:checked").parent().text() + "|";

	$.observable(model.people).insert({
		name: newName
	});

	$.observable(model).setProperty("selected", newName);

	res += $("#result input:checked").parent().text() + "|";

	$.observable(model.people).remove(2);

	res += $("#result input:checked").parent().text() + "|";

	$("#result input").first().prop("checked", true).change(); // Check first radio button

	res += model.selected + "-" + $("#result input:checked").parent().text() + "|";

	// ............................... Assert .................................
	assert.equal(res, ":Jim|:new||Bob-:Bob|",
		'{^{radiogroup selected}}{^{for ...}}...<input ... value="{{:name}}">');

	// ................................ Reset ................................
	$("#result").empty();

	// =============================== Arrange ===============================
	var tmpl = $.templates(
		'{^{radiogroup selected}}'
		+ '<label><input type="radio" value="None"/>:NONE</label>'
		+ '{^{for people}}'
			+ '<label><input type="radio" data-link="value{:name}"/>:{^{:name^toUpperCase()}}</label>'
		+ '{{/for}}'
	+'{{/radiogroup}}'
	);

	model = {
		selected: "Jim",
		people: [
			{name: "Bob"},
			{name: "Jim"}
		]
	};

	// ............................... Act .................................
	tmpl.link("#result", model);

	res = $("#result input:checked").parent().text() + "|";

	$.observable(model.people).insert({
		name: newName
	});

	$.observable(model).setProperty("selected", newName);

	res += $("#result input:checked").parent().text() + "|";

	$.observable(model.people).remove(2);

	res += $("#result input:checked").parent().text() + "|";

	$("#result input").first().prop("checked", true).change(); // Check first radio button

	res += model.selected + "-" + $("#result input:checked").parent().text() + "|";

	// ............................... Assert .................................
	assert.equal(res, ":JIM|:NEW||None-:NONE|",
		'{^{radiogroup selected}}...<input.../>...{^{for ...}}...<input ... data-link="name">');

	// ............................... Act .................................
	$.observable(model.people[1]).setProperty("name", "jimUpdated");

	res = $("#result").text() + "|";

	$("#result input").eq(2).prop("checked", true).change(); // Check third radio button

	res += model.selected + "-" + $("#result input:checked").parent().text() + "|";

	assert.equal(res, ":NONE:BOB:JIMUPDATED|jimUpdated-:JIMUPDATED|",
		'{^{radiogroup selected}}...{^{for ...}}...<input ... data-link="name"> - updated label and value');

	// ................................ Reset ................................
	$("#result").empty();

	// =============================== Arrange ===============================
	tmpl = $.templates({markup:
		'{^{radiogroup selected convert=~lower convertBack="upper" linkTo=selectedOut}}'
		+ '<label><input type="radio" value="none"/>:none</label>'
		+ '{^{for people}}'
			+ '<label><input type="radio" data-link="value{:name}"/>:{^{:name}}</label>'
		+ '{{/for}}'
	+'{{/radiogroup}}',
		converters: {
			upper: function(val) {
				return val.toUpperCase();
			}
		}
	});

	model = {
		selected: "JIM",
		people: [
			{name: "bob"},
			{name: "jim"}
		]
	};

	// ............................... Act .................................
	tmpl.link("#result", model, {
		lower: function(val) {
			return val.toLowerCase();
		}
	});

	res = $("#result input:checked").parent().text() + "|";

	$.observable(model.people).insert({
		name: newName
	});

	$.observable(model).setProperty("selected", newName);

	res += $("#result input:checked").parent().text() + "|";

	$.observable(model.people).remove(2);

	res += $("#result input:checked").parent().text() + "|";

	$("#result input").first().prop("checked", true).change(); // Check first radio button

	res += model.selected + "-" + model.selectedOut + "-" + $("#result input:checked").parent().text() + "|";

	// ............................... Assert .................................
	assert.equal(res, ":jim|:new||new-NONE-:none|",
		'{^{radiogroup selected convert=... convertBack=... linkTo=...}}');

	// ............................... Act .................................
	$.observable(model.people[1]).setProperty("name", "jimUpdated");

	res = $("#result").text() + "|";

	$("#result input").eq(2).prop("checked", true).change(); // Check third radio button

	res += model.selected + "-" + model.selectedOut + "-" + $("#result input:checked").parent().text() + "|";

	assert.equal(res, ":none:bob:jimUpdated|new-JIMUPDATED-:jimUpdated|",
		'{^{radiogroup selected convert=... convertBack=... linkTo=...}} - updated label and value');

	// ................................ Reset ................................
	$("#result").empty();

	// =============================== Arrange ===============================
	tmpl = $.templates(
		'{^{radiogroup selected}}'
		+ '<input type="radio" value="None" id="noneId"/>:<label for "noneId" id="noneIdLbl">NONE</label>'
		+ '{^{for people}}'
			+ '<input type="radio" data-link="value{:name} id{:name + \'Id\'}"/>:<label data-link="for{:name + \'Id\'} id{:name + \'IdLbl\'}{:name^toUpperCase()}"></label>'
		+ '{{/for}}'
	+'{{/radiogroup}}'
	);

	model = {
		selected: "Jim",
		people: [
			{name: "Bob"},
			{name: "Jim"}
		]
	};

	// ............................... Act .................................
	tmpl.link("#result", model);

	res = $("#" + $("#result input:checked").prop("id") + "Lbl").text() + "|";

	$.observable(model.people).insert({
		name: newName
	});

	$.observable(model).setProperty("selected", newName);

	res += $("#" + $("#result input:checked").prop("id") + "Lbl").text() + "|";

	$.observable(model.people).remove(2);

	res += $("#" + $("#result input:checked").prop("id") + "Lbl").text() + "|";

	$("#result input").first().prop("checked", true).change(); // Check first radio button

	res += model.selected + "-" + $("#" + $("#result input:checked").prop("id") + "Lbl").text() + "|";

	// ............................... Assert .................................
	assert.equal(res, "JIM|NEW||None-NONE|",
		'{^{radiogroup selected}} with labels by for/id');

	// ............................... Act .................................
	$.observable(model.people[1]).setProperty("name", "jimUpdated");

	res = $("#result").text() + "|";

	$("#result input").eq(2).prop("checked", true).change(); // Check third radio button

	res += model.selected + "-" + $("#" + $("#result input:checked").prop("id") + "Lbl").text() + "|";

	assert.equal(res, ":NONE:BOB:JIMUPDATED|jimUpdated-JIMUPDATED|",
		'{^{radiogroup selected}} with labels by for/id - updated label and value');

	// ................................ Reset ................................
	$("#result").empty();

	// =============================== Arrange ===============================
	tmpl = $.templates(
		'{^{radiogroup selected}}'
		+ '<label><input type="radio" value="None"/>:NONE</label>'
		+ '{^{for people}}'
			+ '<label><input type="radio" data-link="value{:name}"/>:{^{:name^toUpperCase()}}</label>'
		+ '{{/for}}'
	+'{{/radiogroup}}'
	+ '{^{radiogroup selected}}'
		+ '<label><input type="radio" value="None"/>:NONE</label>'
		+ '{^{for people}}'
			+ '<label><input type="radio" data-link="value{:name}"/>:{^{:name^toUpperCase()}}</label>'
		+ '{{/for}}'
	+'{{/radiogroup}}'
	);

	model = {
		selected: "Jim",
		people: [
			{name: "Bob"},
			{name: "Jim"}
		]
	};

	// ............................... Act .................................
	tmpl.link("#result", model);

	res = $("#result input:checked").parent().text() + "|";

	$.observable(model.people).insert({
		name: newName
	});

	$.observable(model).setProperty("selected", newName);

	res += $("#result input:checked").parent().text() + "|";

	$.observable(model.people).remove(2);

	res += $("#result input:checked").parent().text() + "|";

	$("#result input").first().prop("checked", true).change(); // Check first radio button

	res += model.selected + "-" + $("#result input:checked").parent().text() + "|";

	// ............................... Assert .................................
	assert.equal(res, ":JIM:JIM|:NEW:NEW||None-:NONE:NONE|",
		'{^{radiogroup selected}} - two radiogroups with same selected bindings');

	// ............................... Act .................................
	$.observable(model.people[1]).setProperty("name", "jimUpdated");

	res = $("#result").text() + "|";

	$("#result input").eq(2).prop("checked", true).change(); // Check third radio button

	res += model.selected + "-" + $("#result input:checked").parent().text() + "|";

	assert.equal(res, ":NONE:BOB:JIMUPDATED:NONE:BOB:JIMUPDATED|jimUpdated-:JIMUPDATED:JIMUPDATED|",
		'{^{radiogroup selected}} - two radiogroups with same selected bindings - updated label and value');

	// ................................ Reset ................................
	$("#result").empty();

	// =============================== Arrange ===============================
	tmpl = $.templates(
		'{^{radiogroup selected}}'
		+ '{^{for people}}'
			+ '<label><input type="radio" data-link="value{:name}"/>:{^{:name^toUpperCase()}}</label>'
		+ '{{/for}}'
	+'{{/radiogroup}}'
	+ '{^{radiogroup selected}}'
		+ '<label><input type="radio" value="None"/>:NONE</label>'
		+ '{^{for people}}'
			+ '<label><input type="radio" data-link="value{:name}"/>:{^{:name^toUpperCase()}}</label>'
		+ '{{/for}}'
	+'{{/radiogroup}}'
	);

	model = {
		selected: "Jim",
		people: []
	};

	// ............................... Act .................................
	tmpl.link("#result", model);

	res = $("#result").text() + "|" + $("#result input:checked").parent().text() + "|";

	$.observable(model.people).insert([{name: "Bob"},{name: "Jim"},{name: "newName"}]);

	res += $("#result").text() + "|" + $("#result input:checked").parent().text() + "|";

	$.observable(model).setProperty("selected", newName);

	res += $("#result input:checked").parent().text() + "|";

	$.observable(model.people).remove(2);

	res += $("#result input:checked").parent().text() + "|";

	$("#result input").first().prop("checked", true).change(); // Check first radio button

	res += model.selected + "-" + $("#result input:checked").parent().text() + "|";

	// ............................... Assert .................................
	assert.equal(res, ":NONE||:BOB:JIM:NEWNAME:NONE:BOB:JIM:NEWNAME|:JIM:JIM|||Bob-:BOB:BOB|",
		'{^{radiogroup selected}} - two radiogroups with same selected bindings - starting out with no items, so no radio buttons');

	// ................................ Reset ................................
	$("#result").empty();

	// =============================== Arrange ===============================
	tmpl = $.templates(
		'{^{radiogroup selected name="rad1"}}'
		+ '{^{for people}}'
			+ '<label><input type="radio" data-link="value{:name}"/>:{^{:name^toUpperCase()}}</label>'
		+ '{{/for}}'
	+'{{/radiogroup}}'
	+ '{^{radiogroup selected name="rad1"}}'
		+ '<label><input type="radio" value="None" name="rad2"/>:NONE</label>'
		+ '{^{for people}}'
			+ '<label><input type="radio" data-link="value{:name}" name="rad2"/>:{^{:name^toUpperCase()}}</label>'
		+ '{{/for}}'
	+'{{/radiogroup}}'
	);

	model = {
		selected: "Jim",
		people: []
	};

	// ............................... Act .................................
	tmpl.link("#result", model);

	res = $("#result").text() + "|" + $("#result input:checked").parent().text() + "|";

	$.observable(model.people).insert([{name: "Bob"},{name: "Jim"},{name: "newName"}]);

	res += $("#result").text() + "|" + $("#result input:checked").parent().text() + "|";

	$.observable(model).setProperty("selected", newName);

	res += $("#result input:checked").parent().text() + "|";

	$.observable(model.people).remove(2);

	res += $("#result input:checked").parent().text() + "|";

	$("#result input").first().prop("checked", true).change(); // Check first radio button

	res += model.selected + "-" + $("#result input:checked").parent().text() + "|" + $("#result input:checked")[0].name + "|" + $("#result input:checked")[1].name;

	// ............................... Assert .................................
	assert.equal(res, ":NONE||:BOB:JIM:NEWNAME:NONE:BOB:JIM:NEWNAME|:JIM:JIM|||Bob-:BOB:BOB|rad1|rad2",
		'{^{radiogroup selected}} - name for group can be specified rather than auto-generated - on item or on radiogroup tag');

	// ................................ Reset ................................
	$("#result").empty();

});

QUnit.test('radio buttons without {{radiogroup}}', function(assert) {

	// =============================== Arrange ===============================
	var tmpl = $.templates(
		'{^{for people}}'
		+ '<label><input type="radio" value="{{:name}}" name="rad1" data-link="~root.selected" />:{{:name}}</label>'
	+ '{{/for}}'
	);

	var model = {
			selected: "Jim",
			people: [
				{name: "Bob"},
				{name: "Jim"}
			]
		},
		newName = "new";

	// ............................... Act .................................
	tmpl.link("#result", model);

	res = $("#result input:checked").parent().text() + "|";

	$.observable(model.people).insert({
		name: newName
	});

	$.observable(model).setProperty("selected", newName);

	res += $("#result input:checked").parent().text() + "|";

	$.observable(model.people).remove(2);

	res += $("#result input:checked").parent().text() + "|";

	$("#result input").first().prop("checked", true).change(); // Check first radio button

	res += model.selected + "-" + $("#result input:checked").parent().text() + "|";

	// ............................... Assert .................................
	assert.equal(res, ":Jim|:new||Bob-:Bob|",
		'{^{for ...}}...<input ... value="{{:name}}">');

	// ................................ Reset ................................
	$("#result").empty();

	// =============================== Arrange ===============================
	tmpl = $.templates(
			'<label><input type="radio" name="rad1" value="None" data-link="selected"/>:NONE</label>'
		+ '{^{for people}}'
			+ '<label><input type="radio" name="rad1" data-link="value{:name} {:~root.selected:}"/>:{^{:name^toUpperCase()}}</label>'
		+ '{{/for}}'
	);

	model = {
		selected: "Jim",
		people: [
			{name: "Bob"},
			{name: "Jim"}
		]
	};

	// ............................... Act .................................
	tmpl.link("#result", model);

	res = $("#result input:checked").parent().text() + "|";

	$.observable(model.people).insert({
		name: newName
	});

	$.observable(model).setProperty("selected", newName);

	res += $("#result input:checked").parent().text() + "|";

	$.observable(model.people).remove(2);

	res += $("#result input:checked").parent().text() + "|";

	$("#result input").first().prop("checked", true).change(); // Check first radio button

	res += model.selected + "-" + $("#result input:checked").parent().text() + "|";

	// ............................... Assert .................................
	assert.equal(res, ":JIM|:NEW||None-:NONE|",
		'<input.../>...{^{for ...}}...<input ... data-link="name">');

	// ............................... Act .................................
	$.observable(model.people[1]).setProperty("name", "jimUpdated");

	res = $("#result").text() + "|";

	$("#result input").eq(2).prop("checked", true).change(); // Check third radio button

	res += model.selected + "-" + $("#result input:checked").parent().text() + "|";

	assert.equal(res, ":NONE:BOB:JIMUPDATED|jimUpdated-:JIMUPDATED|",
		'{^{for ...}}...<input ... data-link="name"> - updated label and value');

	// ................................ Reset ................................
	$("#result").empty();

	// =============================== Arrange ===============================
	tmpl = $.templates({markup:
		'<label><input type="radio" name="rad1" value="none" data-link="selected convert=~lower convertBack=\'upper\' linkTo=selectedOut"/>:none</label>'
		+ '{^{for people}}'
			+ '<label><input type="radio" name="rad1" data-link="value{:name} {:~root.selected convert=~lower convertBack=\'upper\' linkTo=~root.selectedOut:}"/>:{^{:name}}</label>'
		+ '{{/for}}',
		converters: {
			upper: function(val) {
				return val.toUpperCase();
			}
		}
	});

	model = {
		selected: "JIM",
		people: [
			{name: "bob"},
			{name: "jim"}
		]
	};

	// ............................... Act .................................
	tmpl.link("#result", model, {
		lower: function(val) {
			return val.toLowerCase();
		}
	});

	res = $("#result input:checked").parent().text() + "|";

	$.observable(model.people).insert({
		name: newName
	});

	$.observable(model).setProperty("selected", newName);

	res += $("#result input:checked").parent().text() + "|";

	$.observable(model.people).remove(2);

	res += $("#result input:checked").parent().text() + "|";

	$("#result input").first().prop("checked", true).change(); // Check first radio button

	res += model.selected + "-" + model.selectedOut + "-" + $("#result input:checked").parent().text() + "|";

	// ............................... Assert .................................
	assert.equal(res, ":jim|:new||new-NONE-:none|",
		'data-link="{:select convert=... convertBack=... linkTo=...:}"');

	// ............................... Act .................................
	$.observable(model.people[1]).setProperty("name", "jimUpdated");

	res = $("#result").text() + "|";

	$("#result input").eq(2).prop("checked", true).change(); // Check third radio button

	res += model.selected + "-" + model.selectedOut + "-" + $("#result input:checked").parent().text() + "|";

	assert.equal(res, ":none:bob:jimUpdated|new-JIMUPDATED-:jimUpdated|",
		'data-link="{:select convert=... convertBack=... linkTo=...:}" - updated label and value');

	// ................................ Reset ................................
	$("#result").empty();

	// =============================== Arrange ===============================
	tmpl = $.templates(
		'<input type="radio" name="rad1" value="None" id="noneId" data-link="selected"/>:<label for "noneId" id="noneIdLbl">NONE</label>'
		+ '{^{for people}}'
			+ '<input type="radio" name="rad1" data-link="value{:name} id{:name + \'Id\'} {:~root.selected:}"/>:<label data-link="for{:name + \'Id\'} id{:name + \'IdLbl\'}{:name^toUpperCase()}"></label>'
		+ '{{/for}}'
	);

	model = {
		selected: "Jim",
		people: [
			{name: "Bob"},
			{name: "Jim"}
		]
	};

	// ............................... Act .................................
	tmpl.link("#result", model);

	res = $("#" + $("#result input:checked").prop("id") + "Lbl").text() + "|";

	$.observable(model.people).insert({
		name: newName
	});

	$.observable(model).setProperty("selected", newName);

	res += $("#" + $("#result input:checked").prop("id") + "Lbl").text() + "|";

	$.observable(model.people).remove(2);

	res += $("#" + $("#result input:checked").prop("id") + "Lbl").text() + "|";

	$("#result input").first().prop("checked", true).change(); // Check first radio button

	res += model.selected + "-" + $("#" + $("#result input:checked").prop("id") + "Lbl").text() + "|";

	// ............................... Assert .................................
	assert.equal(res, "JIM|NEW||None-NONE|",
		'data-link="selected" with labels by for/id');

	// ............................... Act .................................
	$.observable(model.people[1]).setProperty("name", "jimUpdated");

	res = $("#result").text() + "|";

	$("#result input").eq(2).prop("checked", true).change(); // Check third radio button

	res += model.selected + "-" + $("#" + $("#result input:checked").prop("id") + "Lbl").text() + "|";

	assert.equal(res, ":NONE:BOB:JIMUPDATED|jimUpdated-JIMUPDATED|",
		'data-link="selected" with labels by for/id - updated label and value');

	// ................................ Reset ................................
	$("#result").empty();

	// =============================== Arrange ===============================
	tmpl = $.templates(
		'<label><input type="radio" name="rad1" value="None" data-link="selected"/>:NONE</label>'
		+ '{^{for people}}'
			+ '<label><input type="radio" name="rad1" data-link="value{:name} {:~root.selected:}"/>:{^{:name^toUpperCase()}}</label>'
		+ '{{/for}}'
		+ '<label><input type="radio" name="rad2" value="None" data-link="selected"/>:NONE</label>'
		+ '{^{for people}}'
			+ '<label><input type="radio" name="rad2" data-link="value{:name} {:~root.selected:}"/>:{^{:name^toUpperCase()}}</label>'
		+ '{{/for}}'
	);

	model = {
		selected: "Jim",
		people: [
			{name: "Bob"},
			{name: "Jim"}
		]
	};

	// ............................... Act .................................
	tmpl.link("#result", model);

	res = $("#result input:checked").parent().text() + "|";

	$.observable(model.people).insert({
		name: newName
	});

	$.observable(model).setProperty("selected", newName);

	res += $("#result input:checked").parent().text() + "|";

	$.observable(model.people).remove(2);

	res += $("#result input:checked").parent().text() + "|";

	$("#result input").first().prop("checked", true).change(); // Check first radio button

	res += model.selected + "-" + $("#result input:checked").parent().text() + "|";

	// ............................... Assert .................................
	assert.equal(res, ":JIM:JIM|:NEW:NEW||None-:NONE:NONE|",
		'data-link="selected" - two radiogroups with same selected bindings');

	// ............................... Act .................................
	$.observable(model.people[1]).setProperty("name", "jimUpdated");

	res = $("#result").text() + "|";

	$("#result input").eq(2).prop("checked", true).change(); // Check third radio button

	res += model.selected + "-" + $("#result input:checked").parent().text() + "|";

	assert.equal(res, ":NONE:BOB:JIMUPDATED:NONE:BOB:JIMUPDATED|jimUpdated-:JIMUPDATED:JIMUPDATED|",
		'data-link="selected" - two radiogroups with same selected bindings - updated label and value');

	// ................................ Reset ................................
	$("#result").empty();

	// =============================== Arrange ===============================
	tmpl = $.templates(
		'{^{for people}}'
			+ '<label><input type="radio" name="rad1" data-link="value{:name} {:~root.selected:}"/>:{^{:name^toUpperCase()}}</label>'
		+ '{{/for}}'
		+ '<label><input type="radio" name="rad2" value="None" data-link="selected"/>:NONE</label>'
		+ '{^{for people}}'
			+ '<label><input type="radio" name="rad2" data-link="value{:name} {:~root.selected:}"/>:{^{:name^toUpperCase()}}</label>'
		+ '{{/for}}'
	);

	model = {
		selected: "Jim",
		people: []
	};

	// ............................... Act .................................
	tmpl.link("#result", model);

	res = $("#result").text() + "|" + $("#result input:checked").parent().text() + "|";

	$.observable(model.people).insert([{name: "Bob"},{name: "Jim"},{name: "newName"}]);

	res += $("#result").text() + "|" + $("#result input:checked").parent().text() + "|";

	$.observable(model).setProperty("selected", newName);

	res += $("#result input:checked").parent().text() + "|";

	$.observable(model.people).remove(2);

	res += $("#result input:checked").parent().text() + "|";

	$("#result input").first().prop("checked", true).change(); // Check first radio button

	res += model.selected + "-" + $("#result input:checked").parent().text() + "|";

	// ............................... Assert .................................
	assert.equal(res, ":NONE||:BOB:JIM:NEWNAME:NONE:BOB:JIM:NEWNAME|:JIM:JIM|||Bob-:BOB:BOB|",
		'data-link="selected" - two radiogroups with same selected bindings - starting out with no items, so no radio buttons');

	// ................................ Reset ................................
	$("#result").empty();

});

QUnit.test('{^{on}}', function(assert) {

	$.views.settings.advanced({_jsv: true}); // For using _jsv

	// =============================== Arrange ===============================

	function swap(ev, eventArgs) {
		$.observable(this).setProperty("type", this.type === "shape" ? "line" : "shape");
	}
	var thing = {
		type: "shape",
		swap: swap
	};

	$.templates('{^{on swap/}} {^{:type}}')
		.link("#result", thing);

	// ................................ Act ..................................
	before = $("#result").text();
	$("#result button").click();
	after = $("#result").text();

	// ............................... Assert .................................
	assert.equal(before + "|" + after,
	"swap shape|swap line",
	'{^{on swap/}} renders as button with label "swap", and calls swap method on click, with "this" pointer context on data object');

	// ................................ Reset ................................
	$("#result").empty();
	thing.type = "shape";

	// =============================== Arrange ===============================

	$.templates('{^{on missingMethod/}} {^{:type}}')
		.link("#result", thing);

	// ................................ Act ..................................
	before = $("#result").text();
	$("#result button").click();
	after = $("#result").text();

	// ............................... Assert .................................
	assert.equal(before + "|" + after,
	"noop shape|noop shape",
	'{^{on missingMethod/}} renders as button with label "noop", and is noop on click');

	// ................................ Reset ................................
	$("#result").empty();
	thing.type = "shape";

	// =============================== Arrange ===============================

	var tmpla = $.templates('{^{on swap}} clickme {{/on}} {^{:type}}');

	tmpla.link("#result", thing);

	// ................................ Act ..................................
	before = $("#result").text();
	$("#result button").click();
	after = $("#result").text();

	// ............................... Assert .................................
	assert.equal(before + "|" + after,
	"clickme shape|clickme line",
	'{^{on swap}} clickme {{/on}} renders as button with label "clickme", and calls swap method on click');

	// ................................ Reset ................................
	$("#result").empty();
	thing.type = "shape";

	// =============================== Arrange ===============================

	$.templates('{^{on swap tmpl=~label}} clickme {{/on}} {^{:type}}')
		.link("#result", thing, {label: "clickagain"});

	// ................................ Act ..................................
	before = $("#result").text();
	$("#result button").click();
	after = $("#result").text();

	// ............................... Assert .................................
	assert.equal(before + "|" + after,
	"clickagain shape|clickagain line",
	'{^{on swap tmpl=stringValue renders as button with label stringValue, and calls swap method on click');

	// ................................ Reset ................................
	$("#result").empty();
	thing.type = "shape";

	// =============================== Arrange ===============================

	$.templates('{^{on swap}}<span>clickme</span>{{/on}} {^{:type}}')
		.link("#result", thing);

	// ................................ Act ..................................
	before = $("#result").text();
	$("#result span").click();
	after = $("#result").text();

	// ............................... Assert .................................
	assert.equal(before + "|" + after,
	"clickme shape|clickme line",
	'{^{on swap}}<span>clickme</span>{{/on}} renders as span with label clickme, and calls swap method on click');

	// ................................ Reset ................................
	$("#result").empty();
	thing.type = "shape";

	// =============================== Arrange ===============================

	$.templates('{^{on ~swap/}} {^{:type}}')
		.link("#result", thing, {swap: swap});

	// ................................ Act ..................................
	before = $("#result").text();
	$("#result button").click();
	after = $("#result").text();

	// ............................... Assert .................................
	assert.equal(before + "|" + after,
	"~swap shape|~swap line",
	'{^{on ~swap/}} calls swap helper method on click, with "this" pointer context defaulting to current data object');

	// ................................ Reset ................................
	$("#result").empty();
	thing.type = "shape";

	// =============================== Arrange ===============================

	$.templates('{^{on ~util.swap/}} {^{:type}} {^{:check}}')
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
	$("#result button").click();
	after = $("#result").text();

	// ............................... Assert .................................
	assert.equal(before + "|" + after,
	"~util.swap shape |~util.swap line true",
	'{^{on ~util.swap/}} calls util.swap helper method on click, with ~util as this pointer');

	// ................................ Reset ................................
	$("#result").empty();
	thing.type = "shape";
	delete thing.check;

	// =============================== Arrange ===============================

	$.templates('{^{on ~util.swap context=#data/}} {^{:type}}')
		.link("#result", thing, {
			util:
				{
					swap: swap
				}
		});

	// ................................ Act ..................................
	before = $("#result").text();
	$("#result button").click();
	after = $("#result").text();

	// ............................... Assert .................................
	assert.equal(before + "|" + after,
	"~util.swap shape|~util.swap line",
	'{^{on ~util.swap context=#data/}} calls util.swap helper method on click, with current data object as this pointer');

	// ................................ Reset ................................
	$("#result").empty();
	thing.type = "shape";

	// =============================== Arrange ===============================

	$.templates('{^{on ~util.swap context=~util.swapCtx/}} {^{:type}} {^{:check}}')
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
	$("#result button").click();
	after = $("#result").text();

	// ............................... Assert .................................
	assert.equal(before + "|" + after,
	"~util.swap shape |~util.swap line true",
	'{^{on ~util.swap context=~util.swapCtx/}} calls util.swap helper method on click, with util.swapCtx as this pointer');

	// ................................ Reset ................................
	$("#result").empty();
	thing.type = "shape";
	delete thing.check;

	// =============================== Arrange ===============================

	$.templates('{^{on ~util.swap data=#data/}} {^{:type}} {^{:check}}')
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
	$("#result button").click();
	after = $("#result").text();

	// ............................... Assert .................................
	assert.equal(before + "|" + after,
	"~util.swap shape |~util.swap line true",
	'{^{on ~util.swap data=#data/}} calls util.swap helper method on click, and passes current data #data as ev.data');

	// ................................ Reset ................................
	$("#result").empty();
	thing.type = "shape";
	delete thing.check;

	// =============================== Arrange ===============================

	$.templates('{^{on \'mouseup mousedown blur\' swap/}} {^{:type}}')
		.link("#result", thing);

	// ................................ Act ..................................
	before = $("#result").text();
	$("#result button").mouseup();
	after = $("#result").text();
	$("#result button").mousedown();
	after += $("#result").text();
	$("#result button").blur();
	after += $("#result").text();

	// ............................... Assert .................................
	assert.equal(before + "|" + after,
	"swap shape|swap lineswap shapeswap line",
	"{^{on 'mouseup mousedown blur' swap/}} calls util method on mouseup, mousedown and blur");

	// ................................ Reset ................................
	$("#result").empty();
	thing.type = "shape";
	delete thing.check;

	// =============================== Arrange ===============================
	var res = "1: ";
	$.templates(
		"<div id=\"divForOn\">{^{on 'keyup keydown' '.inputA' unbind}}{^{on 'keyup' '#inputB' unbind}}{^{on 'mouseup' 'input' test}}{^{on 'mousedown' '#inputB' refresh}}\">"
			+ "<input class='inputA'/>"
			+ "<input id='inputB' />"
		+ "{{/on}}{{/on}}{{/on}}{{/on}}</div>")
		.link("#result", {
			unbind: function(ev, eventArgs) {
				res += "unbind ";
				eventArgs.linkCtx.tag.onUnbind();
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
	assert.equal(res,
	"1: test 2: test 3: unbind 4: 5: unbind 6: 7: test 8: refresh ",
	"multiple {^{on events selector method}} bindings on container attach events on delegated elements. Also, tag.onDispose on tag instances removes specific handlers for corresponding elements/selectors");

	// ............................... Assert .................................
	assert.equal(eventBindings,
	"before: 1211 | after: undefinedundefined11",
	"onDispose removes specific delegated events");

	// ................................ Act ..................................
	res = "1: ";
	$("#divForOn #inputB").after("<input id='newlyAdded' />");

	$("#divForOn #newlyAdded").mouseup();

	res += "2: ";
	$("#divForOn #newlyAdded").keyup();

	// ............................... Assert .................................
	assert.equal(res,
	"1: test 2: ",
	"delegated {^{on events selector method}} binding allows additional elements added to content to bind correctly");

	// ................................ Act ..................................
	$("#result").empty();
	eventBindings = "" + events.keydown + events.keyup + events.mouseup + JSON.stringify([_jsv.cbBindings, _jsv.bindings]);

	// ............................... Assert .................................
	assert.equal(eventBindings,
	"undefinedundefinedundefined[{},{}]",
	"Removing the element removes all associated attached {on } handlers");

	// =============================== Arrange ===============================
	var tmpl = $.templates("{^{on 'click' '#doIt' 754 thisIsTheMethod role 'hey' true process data=option 33 #data context=option}}\
	<button id='doIt'>Do it</button>\
	<span data-link='res'></span>\
{{/on}}"),

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
	assert.equal(data.res, "Advisorheytrue33 allow:true extraParam: 754|Followerheytrue33 allow:false extraParam: 754|",
	"{^{on 'click' selector otherParams... method params...}} : supports passing params to method, of any type, as well as setting data and context for the function call");

	// ................................ Act ..................................
	$("#result").empty();

	// =============================== Arrange ===============================

	var tmpl = $.templates("{^{on doit id='doIt' class='red' width='100' height='100'/}}"),
		res = "",
		data = {
			name: "Jo",
			doit: function() {
				var button = $("button");
				res = (Math.round(10*button.width())/10) + "|" + (Math.round(10*button.height())/10) + "|" + button[0].id + "|" + button[0].className;
			}
		};

	tmpl.link("#result", data);

	// ................................ Act ..................................
	$("#doIt").click();

	// ............................... Assert .................................
	assert.equal(res, "100|100|doIt|red",
	"{^{on ... id=... class=... width=... height=...}} : supports setting id, class, height and width");

	// ................................ Act ..................................
	$("#result").empty();

	$.views.settings.advanced({_jsv: false});
});

QUnit.test('data-link="{tag...} and {^{tag}} in same template"', function(assert) {
var done = assert.async();

	// ................................ Reset ................................
	person1._firstName = "Jo"; // reset Prop
	person1.lastName = "One"; // reset Prop
	settings.title = "Mr"; // reset Prop
	settings.width = 30; // reset Prop
	$.views.settings.advanced({_jsv: true}); // For using viewsAndBindings()

	// =============================== Arrange ===============================

	$.templates('{^{tmplTag/}}-{^{:lastName}} <span data-link="{tmplTag}"></span>-<span data-link="lastName"></span><input data-link="lastName"/>')
		.link("#result", person1);

	// ................................ Act ..................................
	before = $("#result").text() + $("#result input").val();
	$.observable(person1).setProperty({firstName: "newFirst", lastName: "newLast"});
	$.observable(settings).setProperty({title: "Sir", width: 40});
	after = $("#result").text() + $("#result input").val();

	// ............................... Assert .................................
	assert.equal(before + "|" + after,
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
	$.observable(person1).setProperty({firstName: "newFirst", lastName: "newLast"});
	$.observable(settings).setProperty({title: "Sir", width: 40});
	$.observable(person1).setProperty({fullName: "compFirst compLast"});
	after = $("#result").text() + $("#last").val() + $("#full").val();

	// ............................... Assert .................................
	assert.equal(before + "|" + after,
	'prop:OneOne computed:Mr Jo OneMr Jo One Tag:Name: Mr Jo. Width: 30Name: Mr Jo. Width: 30OneMr Jo One|prop:compLastcompLast computed:Sir compFirst compLastSir compFirst compLast Tag:Name: Sir compFirst. Width: 40Name: Sir compFirst. Width: 40compLastSir compFirst compLast',
	'Data link using: {^{:lastName}} <span data-link="lastName"></span> <input id="last" data-link="lastName"/> {^{:fullName()}}<span data-link="fullName()"></span> <input data-link="fullName()"/> {^{tmplTag/}} <span data-link="{tmplTag}"></span>');

	// ................................ Act ..................................
	keydown($("#full").val("newFirst newLast"));

setTimeout(function() {
	after = $("#result").text() + $("#last").val() + $("#full").val();

	// ............................... Assert .................................
	assert.equal(after,
	"prop:newLastnewLast computed:Sir newFirst newLastSir newFirst newLast Tag:Name: Sir newFirst. Width: 40Name: Sir newFirst. Width: 40newLastnewFirst newLast",
	'Two-way binding to a computed observable correctly calls the setter');

	// =============================== Arrange ===============================

	// ................................ Act ..................................
	$("#result").empty();

	// ............................... Assert .................................

	assert.ok(!viewsAndBindings() && !$._data(person1).events && !$._data(settings).events,
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
	$.observable(person1).setProperty({firstName: "newFirst", lastName: "newLast"});
	$.observable(settings).setProperty({title: "Sir", width: 40});
	$.observable(person1).setProperty({fullName: "compFirst compLast"});
	after = $("#result").text() + $("#last").val() + $("#full").val();

	// ............................... Assert .................................
	res = 'prop:OneOne computed:Mr Jo OneMr Jo One Tag:Name: Mr Jo. Width: 30Name: Mr Jo. Width: 30OneMr Jo One|prop:compLastcompLast computed:Sir compFirst compLastSir compFirst compLast Tag:Name: Sir compFirst. Width: 40Name: Sir compFirst. Width: 40compLastSir compFirst compLast';

	// ................................ Act ..................................
	$.unlink("#result");

	// ............................... Assert .................................

	assert.ok(before + "|" + after === res && !viewsAndBindings() && !$._data(person1).events && !$._data(settings).events,
	"$.unlink(container) removes the views and current listeners from that content");

	// ................................ Reset ................................
	person1._firstName = "Jo"; // reset Prop
	person1.lastName = "One"; // reset Prop
	settings.title = "Mr"; // reset Prop
	settings.width = 30; // reset Prop

	// =============================== Arrange ===============================

	$.templates('prop:{^{:lastName}}<span data-link="lastName"></span><input id="last" data-link="lastName"/> computed:{^{:fullName()}}<span data-link="fullName()"></span><input id="full" data-link="fullName()"/> Tag:{^{tmplTag/}}<span data-link="{tmplTag}"></span>')
		.link("#result", person1);

	// ................................ Act ..................................
	$("#result").unlink();

	// ............................... Assert .................................

	assert.ok(!viewsAndBindings() && !$._data(person1).events && !$._data(settings).events,
	"$(container).unlink() removes the views and current listeners from that content");

	// =============================== Arrange ===============================

	$.templates('prop:{^{:lastName}}<span data-link="lastName"></span><input id="last" data-link="lastName"/> computed:{^{:fullName()}}<span data-link="fullName()"></span><input id="full" data-link="fullName()"/> Tag:{^{tmplTag/}}<span data-link="{tmplTag}"></span>')
		.link("#result", person1);

	// ................................ Act ..................................
	before = $("#result").text() + $("#last").val() + $("#full").val();
	$.observable(person1).setProperty({firstName: "newFirst", lastName: "newLast"});
	$.observable(settings).setProperty({title: "Sir", width: 40});
	$.observable(person1).setProperty({fullName: "compFirst compLast"});
	after = $("#result").text() + $("#last").val() + $("#full").val();

	// ............................... Assert .................................
	res = 'prop:OneOne computed:Mr Jo OneMr Jo One Tag:Name: Mr Jo. Width: 30Name: Mr Jo. Width: 30OneMr Jo One|prop:compLastcompLast computed:Sir compFirst compLastSir compFirst compLast Tag:Name: Sir compFirst. Width: 40Name: Sir compFirst. Width: 40compLastSir compFirst compLast';

	// ................................ Act ..................................
	viewContent = viewsAndBindings();

	$.unobserve(person1, "*", settings, "*");

	// ............................... Assert .................................

	assert.ok(before + "|" + after === res && viewContent === viewsAndBindings() && !$._data(person1).events && !$._data(settings).events,
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
	$.observable(person1).setProperty({firstName: "newFirst", lastName: "newLast"});
	$.observable(settings).setProperty({title: "Sir", width: 40});
	$.observable(person1).setProperty({fullName: "compFirst compLast"});
	after = $("#result").text() + $("#last").val() + $("#full").val();

	// ............................... Assert .................................
	res = 'prop:OneOne computed:Mr Jo OneMr Jo One Tag:Name: Mr Jo. Width: 30Name: Mr Jo. Width: 30OneMr Jo One|prop:compLastcompLast computed:Sir compFirst compLastSir compFirst compLast Tag:Name: Sir compFirst. Width: 40Name: Sir compFirst. Width: 40compLastSir compFirst compLast';

	// ................................ Act ..................................
	$.unlink();

	// ............................... Assert .................................

	assert.ok(before + "|" + after === res && !viewsAndBindings() && !$._data(person1).events && !$._data(settings).events,
	'$.unlink() removes all views and listeners from the page');

	// ................................ Reset ................................
	person1._firstName = "Jo"; // reset Prop
	person1.lastName = "One"; // reset Prop
	settings.title = "Mr"; // reset Prop
	settings.width = 30; // reset Prop
	$.views.settings.advanced({_jsv: false});
	// TODO ADDITIONAL TESTS:
	// 1: link(null, data) to link whole document

done();
}, 0);
});

QUnit.test("Fallbacks for missing or undefined paths: using {^{:some.path onError = 'fallback'}}, etc.", function(assert) {

	$.views.settings.advanced({_jsv: true}); // For using viewsAndBindings()

	// =============================== Arrange ===============================

	$.views.tags({
		mytag1: function(val) {return val + " from my tag1"; },
		mytag2: {
			template: "{{:}} from my tag2"
		}
	}).converters({
		upper: function(val) {
			return val.toUpperCase();
		}
	});

	var initial = {a: {b: null}},
		updated = {c: {val: 'leaf'}};

	$.templates(
		"{^{:a.b^c.val onError=~error + 'A '}} "
		+ "{^{upper:a.b^c.val onError=~error + 'B '}} "
		+ "{^{>a.b^c.val onError=~error + 'C '}} "
		+ "{^{if a.b^c onError=~error + 'D '}}<i>{{:a.b.c.val}}</i>{{/if}} "
		+ "{^{for a.b^c onError=~error + 'E ' ~foo='foo'}}<b>{{:val + ~foo}}</b>{{/for}} "
		+ "{^{mytag1 a.b^c.val onError=~error + 'F '/}} "
		+ "{^{mytag2 a.b^c.val onError=~error + 'G '/}} "
		+ "<span data-link=\"a.b^c.val onError=~error + 'H '\"></span> "
		+ "<span data-link=\"{mytag1 a.b^c.val onError=~error + 'I '}\"></span> "
		+ "<span data-link=\"{upper:a.b^c.val onError=~error + 'J '}\"></span> "
		+ "<span data-link=\"{:a.b^c.val convert='upper' onError=~error + 'K '}\"></span> ")
			.link("#result", initial, {error: "err:"});
	// ................................ Act ..................................

	before = "" + $._data(initial.a).events.propertyChange.length + " " + !$._data(updated).events + " " + !$._data(updated.c).events + "|"
		+ $("#result").text() + "|";
	$.observable(initial.a).setProperty('b', updated);
	after = $("#result").text() + "|";
	$.observable(initial.a.b.c).setProperty('val', "leaf2");
	after += $("#result").text() + "|";
	$.observable(initial.a.b).setProperty('c', {val: "leaf3"});
	after += $("#result").text() + "|";
	$.observable(initial.a).setProperty('b', {c: {val: "leaf4"}});
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

	assert.equal(before + after,
		"11 true true|"
			+ "err:A  ERR:B  err:C  err:D  err:E  err:F  err:G  err:H  err:I  ERR:J  err:K  |"
			+ "leaf LEAF leaf leaf leaffoo leaf from my tag1 leaf from my tag2 leaf leaf from my tag1 LEAF LEAF |"
			+ "leaf2 LEAF2 leaf2 leaf leaffoo leaf2 from my tag1 leaf2 from my tag2 leaf2 leaf2 from my tag1 LEAF2 LEAF2 |"
			+ "leaf3 LEAF3 leaf3 leaf leaf3foo leaf3 from my tag1 leaf3 from my tag2 leaf3 leaf3 from my tag1 LEAF3 LEAF3 |"
			+ "leaf4 LEAF4 leaf4 leaf leaf4foo leaf4 from my tag1 leaf4 from my tag2 leaf4 leaf4 from my tag1 LEAF4 LEAF4 |"
			+ "11 11 9 true true|"
			+ "leaf4 LEAF4 leaf4 leaf leaf4foo leaf4 from my tag1 leaf4 from my tag2 leaf4 leaf4 from my tag1 LEAF4 LEAF4 |"
			+ "11 true true|"
			+ "err:A  ERR:B  err:C  err:D  err:E  err:F  err:G  err:H  err:I  ERR:J  ERR:K  |"
			+ "leaf3 LEAF3 leaf3 leaf3 leaf3foo leaf3 from my tag1 leaf3 from my tag2 leaf3 leaf3 from my tag1 LEAF3 LEAF3 |",

	"deep linking in templates, using onError - correctly re-link to data when missing objects are dynamically replaced");

	// ................................ Act ..................................
	$.unlink();

	// ............................... Assert .................................

	assert.ok(!viewsAndBindings() && !$._data(initial.a).events && !$._data(initial.a.b).events,
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

	assert.equal(before + after,
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

	assert.ok(!viewsAndBindings() && !$._data(initial.value()).events && !$._data(initial.value().value()).events,
	'$.unlink() removes all views and listeners from the page');

	$.views.settings.advanced({_jsv: false});
});

QUnit.test('Bound tag properties and contextual parameters', function(assert) {
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
	$.observable(things[0]).setProperty({type: "line", thickness: 5});
	$.observable(things[1]).setProperty({type: "shape"});
	$.observable(things[1]).removeProperty("thickness");
	after = $("#result").text();

	// ............................... Assert .................................
	assert.equal(before + "|" + after,
	"Tag: Shape: circle\n Elem: Shape: circle\n Tag: Line: square 1\n Elem: Line: square 1\n |Tag: Line: circle 5\n Elem: Line: circle 5\n Tag: Shape: square\n Elem: Shape: square\n ",
	'binding to ^tmpl=... :{^{include ^tmpl=~typeTemplates[type]... and data-link="{include ^tmpl=~typeTemplates[type]...');

	// ................................ Reset ................................
	$("#result").empty();

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
	$.templates('Tag: {^{if true ^tmpl=~typeTemplates[type]/}} Elem: <div data-link="{if true ^tmpl=~typeTemplates[type]}"></div> ')
		.link("#result", things, {
			typeTemplates: {
				shape: "Shape: {^{:form}}\n",
				line: "Line: {^{:form}} {^{:thickness}}\n"
			}
		}
		);

	// ................................ Act ..................................
	before = $("#result").text();
	$.observable(things[0]).setProperty({type: "line", thickness: 5});
	$.observable(things[1]).setProperty({type: "shape"});
	$.observable(things[1]).removeProperty("thickness");
	after = $("#result").text();

	// ............................... Assert .................................
	assert.equal(before + "|" + after,
	"Tag: Shape: circle\n Elem: Shape: circle\n Tag: Line: square 1\n Elem: Line: square 1\n |Tag: Line: circle 5\n Elem: Line: circle 5\n Tag: Shape: square\n Elem: Shape: square\n ",
	'binding to ^tmpl=... :{^{if true ^tmpl=~typeTemplates[type]... and data-link="{if true ^tmpl=~typeTemplates[type]...');

	// ................................ Reset ................................
	$("#result").empty();

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
	$.templates('Tag: {^{if false}}{{else ^tmpl=~typeTemplates[type]}}{{/if}} Elem: <div data-link="{if false}{else ^tmpl=~typeTemplates[type]}"></div> ')
		.link("#result", things, {
			typeTemplates: {
				shape: "Shape: {^{:form}}\n",
				line: "Line: {^{:form}} {^{:thickness}}\n"
			}
		}
		);

	// ................................ Act ..................................
	before = $("#result").text();
	$.observable(things[0]).setProperty({type: "line", thickness: 5});
	$.observable(things[1]).setProperty({type: "shape"});
	$.observable(things[1]).removeProperty("thickness");
	after = $("#result").text();

	// ............................... Assert .................................
	assert.equal(before + "|" + after,
	"Tag: Shape: circle\n Elem: Shape: circle\n Tag: Line: square 1\n Elem: Line: square 1\n |Tag: Line: circle 5\n Elem: Line: circle 5\n Tag: Shape: square\n Elem: Shape: square\n ",
	'binding to ^tmpl=... :{^{if false}}{{else ^tmpl=~typeTemplates[type]... and data-link="{if false}{else ^tmpl=~typeTemplates[type]...');

	// ................................ Reset ................................
	$("#result").empty();

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
	$.templates('Tag: {^{for undefined}}{{else ^tmpl=~typeTemplates[type]}}{{/for}} Elem: <div data-link="{for undefined}{else ^tmpl=~typeTemplates[type]}"></div> ')
		.link("#result", things, {
			typeTemplates: {
				shape: "Shape: {^{:form}}\n",
				line: "Line: {^{:form}} {^{:thickness}}\n"
			}
		}
		);

	// ................................ Act ..................................
	before = $("#result").text();
	$.observable(things[0]).setProperty({type: "line", thickness: 5});
	$.observable(things[1]).setProperty({type: "shape"});
	$.observable(things[1]).removeProperty("thickness");
	after = $("#result").text();

	// ............................... Assert .................................
	assert.equal(before + "|" + after,
	"Tag: Shape: circle\n Elem: Shape: circle\n Tag: Line: square 1\n Elem: Line: square 1\n |Tag: Line: circle 5\n Elem: Line: circle 5\n Tag: Shape: square\n Elem: Shape: square\n ",
	'binding to ^tmpl=... :{^{for undefined}}{{else ^tmpl=~typeTemplates[type]... and data-link="{for undefined}{else ^tmpl=~typeTemplates[type]...');

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
	$.observable(things[0]).setProperty({type: "line", thickness: 5});
	$.observable(things[1]).setProperty({type: "shape"});
	$.observable(things[1]).removeProperty("thickness");
	after = $("#result").text();

	// ............................... Assert .................................
	assert.equal(before + "|" + after,
	"Bound condition: shape true Unbound condition: shape true Bound condition: line false Unbound condition: line false |Bound condition: line false Unbound condition: shape true Bound condition: shape true Unbound condition: line false ",
	'Binding to contextual parameter {^{include ^~condition=... triggers update. Unbound contextual parameter {^{include ~condition=... does not trigger updated content');

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
	$.templates('Updating: {^{updatingTag ^condition=type==="shape"}}{{:type}} {^{:~tagCtx.props.condition}} {{/updatingTag}} '
		+ 'Non updating: {^{nonUpdatingTag ^condition=type==="shape"}}{{:type}} {^{:~tagCtx.props.condition}} {{/nonUpdatingTag}}')
		.link("#result", things);

	// ................................ Act ..................................
	before = $("#result").text();
	$.observable(things[0]).setProperty({type: "line", thickness: 5});
	$.observable(things[1]).setProperty({type: "shape"});
	$.observable(things[1]).removeProperty("thickness");
	after = $("#result").text();

	// ............................... Assert .................................
	assert.equal(before + "|" + after,
	"Updating: shape true  Non updating: shape true Updating: line false  Non updating: line false |Updating: line false  Non updating: shape false Updating: shape true  Non updating: line true ",
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
			{name: "Bob"},
			{name: "Jim"}
		]
	};

	// ............................... Act .................................
	$.templates("<div data-link=\"{for people ~team=#data tmpl='myTmpl'}\"></div>").link("#result", model);

	res = $("#result").text();

	$.observable(model.people).insert({
		name: "newName"
	});

	$.observable(model).setProperty("lead", "newName");

	res += "|" + $("#result").text();

	// ............................... Assert .................................
	assert.equal(res, ("Bob lead:Jim - Jim lead:Jim - |Bob lead:newName - Jim lead:newName - newName lead:newName - "),
		"data-link allows passing in new contextual parameters to template: data-link=\"{for people ~team=#data tmpl=...");

	// ................................ Reset ................................
	$("#result").empty();

	// =============================== Arrange ===============================

	model = {
		sortby: "role",
		cols: ["name", "role"]
	};

	// ............................... Act .................................
	$.templates('{^{for cols itemVar="~col"}}{^{:~root.sortby === ~col}} {^{:~col}} {{/for}}').link("#result", model);

	res = $("#result").text();

	$.observable(model).setProperty("sortby", model.sortby === "role" ? "name" : "role");

	res += "|" + $("#result").text();

	$.observable(model).setProperty("sortby", model.sortby === "role" ? "name" : "role");

	res += "|" + $("#result").text();

	$.observable(model.cols).insert("other");

	res += "|" + $("#result").text();

	// ............................... Assert .................................
	assert.equal(res, "false name true role |true name false role |false name true role |false name true role false other ",
		"itemVar variables in item list are distinct variables");

	// ................................ Reset ................................
	$("#result").empty();

	// =============================== Arrange ===============================

	var data = {items1: [], items: [{name: "Jo"}, {name: "Bob"}]};

	// ............................... Act .................................
	$.templates(
	'{^{for items1}}{{else items itemVar="~currentItem"}}' +
		'{^{:name}} <input data-link="name"/>' +
		'{^{:~currentItem.name}} <input data-link="~currentItem.name"/>' +
		'{^{include}}' +
			'{^{:~currentItem.name}} <input data-link="~currentItem.name"/>' +
		'{{/include}}' +
		'{^{for itemVar="~currentItem2"}}' +
			'{^{:name}} <input data-link="name"/>' +
			'{^{:~currentItem2.name}} <input data-link="~currentItem2.name"/>' +
			'{^{if true}}' +
				'{^{:~currentItem2.name}} <input data-link="~currentItem2.name"/>' +
			'{{/if}}' +
		'{{/for}}' +
		'{^{for ~currentItem itemVar="~currentItem2"}}' +
			'{^{:name}} <input data-link="name"/>' +
			'{^{:~currentItem2.name}} <input data-link="~currentItem2.name"/>' +
			'{^{include}}' +
				'{^{:~currentItem2.name}} <input data-link="~currentItem2.name"/>' +
			'{{/include}}' +
		'{{/for}}' +
	'{{/for}}').link("#result", data);

	$.observable(data.items).insert({name: "Jeff"});

	var inputs = $("#result input");

	res = "|" + $("#result").text() + inputs[0].value;

	keydown($(inputs[0]).val("Jo0"));

	res += "|" + $("#result").text() + inputs[1].value;

	// ............................... Assert .................................
	assert.equal(res, "|Jo Jo Jo Jo Jo Jo Jo Jo Jo Bob Bob Bob Bob Bob Bob Bob Bob Bob Jeff Jeff Jeff Jeff Jeff Jeff Jeff Jeff Jeff Jo|Jo0 Jo0 Jo0 Jo0 Jo0 Jo0 Jo0 Jo0 Jo0 Bob Bob Bob Bob Bob Bob Bob Bob Bob Jeff Jeff Jeff Jeff Jeff Jeff Jeff Jeff Jeff Jo0",
		"itemVar in nested contexts, on else blocks, etc. with two-way binding, works correctly");

	// ................................ Reset ................................
	$("#result").empty();

});

QUnit.test('Data-linking helpers and contextual parameters', function(assert) {
$.views.settings.trigger(false);

	// =============================== Arrange ===============================

	var data = {name: "Jo", address: {}};
	res = "";

	$.templates(
	'{{for address ~nm=name}}'
		+ '<div data-link="~nm"></div>'
		+ '<input id="input1" data-link="~nm"/>'
	+ '{{/for}}'
	)
	.link("#result", data);

	// ................................ Act ..................................

	res += $("#result").text() + " | ";

	$.observable(data).setProperty("name", "new");

	res += $("#result").text() + " | ";

	$("#input1").val('changed').change();

	res += $("#result").text() + " | ";

	// ............................... Assert .................................
	assert.equal(res,
	"Jo | new | changed | ",
	'contextual parameter two-way binding');

	// ................................ Reset ................................
	$("#result").empty();

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
	$.templates('{^{include ~condition=type==="shape"}}{{:type}} {^{:type}} {^{:~condition}} {{/include}}')
		.link("#result", things);

	// ................................ Act ..................................
	before = $("#result").text();
	$.observable(things[0]).setProperty({type: "line", thickness: 5});
	$.observable(things[1]).setProperty({type: "shape"});
	after = $("#result").text();

	// ............................... Assert .................................
	assert.equal(before + "|" + after,
	"shape shape true line line false |shape line false line shape true ",
	'contextual parameter {^{include ~condition=... does not trigger update but references are bound');

	// ................................ Reset ................................
	$("#result").empty();

	// =============================== Arrange ===============================

	var getContent = function() {
		$("#result input").each(function() {
			res += this.value;
		});
		res += $("#result").text() + "|";
	}

	var tmpl = $.templates(
'<input data-link="foo"/>\
<input data-link="#data.foo"/>\
<input data-link="#view.data.foo"/>\
\
{^{include ~f1 = foo}}\
<input data-link="~f1"/>\
{^{include ~f2 = #data.foo}}\
<input data-link="~f1"/>\
<input data-link="~f2"/>\
{^{include ~f3 = #view.data.foo}}\
{^{:~f1}}\
{^{:~f2}}\
{^{:~f3}}\
<input data-link="~f1"/>\
<input data-link="~f2"/>\
<input data-link="~f2"/>\
{{/include}}\
{{/include}}\
{{/include}}\
');

	// ............................... Act .................................
	tmpl.link("#result", {foo: "F"});

	var cnt = 0;
	res = "";
	getContent();

	$("#result input").each(function() {
		$("#result input").val(cnt++).change();
		getContent();
	});

	assert.equal(res, "FFFFFFFFFFFF|000000000000|111111111111|222222222222|333333333333|444444444444|"
		+ "555555555555|666666666666|777777777777|888888888888|",
		'Two-way binding to contextual parameters');

	// ................................ Reset ................................
	$("#result").empty();

	// =============================== Arrange ===============================

	getContent = function getContent() {
		return $("#outerInput").val() + ":" + $("#innerInput").val() + ":" + $("#innerDiv").text();
	}

	var tmpl = $.templates(
'{^{if true ~street=address(name)}}\
	<input id="outerInput" data-link="~street^street"/>\
	{^{for address ~street=~street^street}}\
		<div id="innerDiv" data-link="~street"></div>\
		<input id="innerInput" data-link="~street"/>\
	{{/for}}\
{{/if}}');

	// ............................... Act .................................

	var address = {street: "add"};
	var altAddress = {street: "alt"};

	function getAddress(name) {
		return (name.length > 2 || data.alt) ? altAddress : address;
	}

	getAddress.depends = "alt";

	var data = {name: "Jo", address: getAddress, alt: false};

	tmpl.link("#result", data);

	before = getContent();

	$("#outerInput").val("addOuter").change();

	after = before + "|" + getContent();

	$("#innerInput").val("addInner").change();

	after += "|" + getContent();

	$.observable(data).setProperty("name", "John");

	after += "|" + getContent();

	$("#outerInput").val("altOuter").change();

	after += "|" + getContent();

	$("#innerInput").val("altInner").change();

	after += "|" + getContent();

	$.observable(data).setProperty("name", "Me");

	after += "|" + getContent();

	$.observable(data).setProperty("alt", true);

	after += "|" + getContent();

	assert.equal(after, "add:add:add|addOuter:addOuter:addOuter|addInner:addInner:addInner"
		+ "|alt:alt:alt|altOuter:altOuter:altOuter|altInner:altInner:altInner"
		+ "|addInner:addInner:addInner|altInner:altInner:altInner",
		'Two-way binding to contextual parameters with computed values');

	// ................................ Reset ................................
	$("#result").empty();

	// =============================== Arrange ===============================

	var tmpl = $.templates(
'{^{for items}}\
{{for 22 ~ind=#index}}\
{{for 33 ~ind=~ind+1}}\
{{for 33 ~ind=~ind*2}}\
{{if true}}\
{^{:~ind}}\
{{/if}}\
{{/for}}\
{{/for}}\
{{/for}}\
{{/for}}'
);

	// ............................... Act .................................

	var data = {items: [1,2,3]};

	tmpl.link("#result", data);

	before = $("#result").text();

	$.observable(data.items).remove();

	after = before + "|" + $("#result").text();

	$.observable(data.items).remove();

	after += "|" + $("#result").text();

	$.observable(data.items).insert(4);

	after += "|" + $("#result").text();

	$.observable(data.items).insert(5);

	after += "|" + $("#result").text();

	$.observable(data.items).insert(6);

	after += "|" + $("#result").text();

	assert.equal(after, "246|24|2|24|246|2468",
		'Contextual parameter for index with array change');

	// ................................ Reset ................................
	$("#result").empty();

$.views.settings.trigger(true);
});

QUnit.test("JsViews ArrayChange: insert()", function(assert) {

	// =============================== Arrange ===============================
	$.views.tags({
		liTag: function() {
			return "<li>Tag</li>";
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
	assert.equal($("#result").text(), "TagFirstTagMiddleTagLastTagOrigTag|after",
	'Within element only content, insertion maintains correctly prevNode, nextNode, element order and binding on views and tags');

	// ................................ Reset ................................
	$("#result").empty();
	model.things = []; // reset Prop

	// =============================== Arrange ===============================
	$.views.tags({
		spanTag: function() {
			return "<span>Tag</span>";
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
	assert.equal($("#result").text(), "TagFirstTagMiddleTagLastTagOrigTag|after",
	'Within regular content, insertion finds correctly the previous view, prevNode, nextNode, etc and establishes correct element/textNode order and binding');

	// ................................ Reset ................................
	$("#result").empty();
	model.things = [{thing: "Orig"}]; // reset Prop

	// =============================== Arrange ===============================
	$.templates('<table><tbody>{^{for things}}<tr><td>{{:thing}}</td></tr>{{/for}}</tbody></table>')
		.link("#result", model);
	// ................................ Act ..................................
	$.observable(model.things).insert(0, {thing: "First"});

	// ............................... Assert .................................
	assert.equal($("#result").text(), "FirstOrig",
	'Within element only content, insertion maintains correctly prevNode, nextNode, element order and binding on views and tags');

	// ................................ Reset ................................
	$("#result").empty();
	model.things = []; // reset Prop
});

QUnit.test("JsViews ArrayChange: remove()", function(assert) {
	// =============================== Arrange ===============================
	$.views.tags({
		liTag: function() {
			return "<li>Tag</li>";
		}
	});

	model.things = [{thing: "Orig"}, {thing: "First"}, {thing: "Middle"}, {thing: "Last"}]; // reset Prop

	$.templates('<ul>{^{liTag/}}{^{for things}}<li>{{:thing}}</li>{^{liTag/}}{{/for}}<li>|after</li></ul>')
		.link("#result", model); // -> TagOrigTagFirstTagMiddleTagLastTag|after

	// ................................ Act ..................................
	$.observable(model.things).remove(1);

	// ............................... Assert .................................
	assert.equal($("#result").text(), "TagOrigTagMiddleTagLastTag|after",
	'Within element only content, remove(1) maintains correctly prevNode, nextNode, element order and binding on views and tags');

	// ................................ Act ..................................
	$.observable(model.things).remove();

	// ............................... Assert .................................
	assert.equal($("#result").text(), "TagOrigTagMiddleTag|after",
	'Within element only content, remove maintains correctly prevNode, nextNode, element order and binding on views and tags');

	// ................................ Reset ................................
	$("#result").empty();

	// =============================== Arrange ===============================
	model.things = [{thing: "Orig"}, {thing: "First"}, {thing: "Middle"}, {thing: "Last"}]; // reset Prop

	$.templates('<ul>{^{for things start=0}}<li data-link="{on foo}">{{:thing}}</li>{^{liTag/}}{{/for}}<li>|after</li></ul>')
		.link("#result", model); // -> OrigTagFirstTagMiddleTagLastTag|after
	// See https://github.com/BorisMoore/jsviews/issues/442

	// ................................ Act ..................................
	$.observable(model.things).remove(1);

	// ............................... Assert .................................
	assert.equal($("#result").text(), "OrigTagMiddleTagLastTag|after",
	'Within element only content, remove(1) maintains correctly prevNode etc. on views and tags, even when using start=0, and with linked {on} tag');

	// ................................ Act ..................................
	$.observable(model.things).remove();

	// ............................... Assert .................................
	assert.equal($("#result").text(), "OrigTagMiddleTag|after",
	'Within element only content, remove maintains correctly prevNode etc. on views and tags, even when using start=0, and with linked {on} tag');

	// ................................ Reset ................................
	$("#result").empty();

	// =============================== Arrange ===============================
	model.things = [{thing: "Orig"}, {thing: "First"}, {thing: "Middle"}, {thing: "Last"}]; // reset Prop

	$.templates("liTmpl", "<li data-link='{on foo}'>{{:thing}}</li>{^{liTag/}}");

	$.templates('<ul data-link="{for things start=0 tmpl=\'liTmpl\'}"></ul>')
		.link("#result", model); // -> OrigTagFirstTagMiddleTagLastTag
	// See https://github.com/BorisMoore/jsviews/issues/442

	// ................................ Act ..................................
	$.observable(model.things).remove(1);

	// ............................... Assert .................................
	assert.equal($("#result").text(), "OrigTagMiddleTagLastTag",
	'Within element only content, using data-linked element {for}, remove(1) maintains correctly even when using start=0, and with linked {on} tag');

	// ................................ Act ..................................
	$.observable(model.things).remove();

	// ............................... Assert .................................
	assert.equal($("#result").text(), "OrigTagMiddleTag",
	'Within element only content, using data-linked element {for}, remove maintains correctly even when using start=0, and with linked {on} tag');

	// ................................ Reset ................................
	$("#result").empty();

	// =============================== Arrange ===============================
	$.views.tags({
		spanTag: function() {
			return "<span>Tag</span>";
		}
	});

	model.things = [{thing: "Orig"}, {thing: "First"}, {thing: "Middle"}, {thing: "Last"}]; // reset Prop

	$.templates('<div>{^{spanTag/}}{^{for things}}<span>{{:thing}}</span>{^{spanTag/}}{{/for}}<span>|after</span></div>')
		.link("#result", model);

	// ................................ Act ..................................
	$.observable(model.things).remove(1);

	// ............................... Assert .................................
	assert.equal($("#result").text(), "TagOrigTagMiddleTagLastTag|after",
	'Within regular content, remove(1) finds correctly the previous view, prevNode, nextNode, etc and establishes correct element/textNode order and binding');

	// ................................ Act ..................................
	$.observable(model.things).remove();

	// ............................... Assert .................................
	assert.equal($("#result").text(), "TagOrigTagMiddleTag|after",
	'Within regular content, remove() finds correctly the previous view, prevNode, nextNode, etc and establishes correct element/textNode order and binding');

	// ................................ Reset ................................
	$("#result").empty();
	model.things = []; // reset Prop

});

QUnit.test("JsViews ArrayChange: move()", function(assert) {
	// =============================== Arrange ===============================
	$.views.tags({
		liTag: function() {
			return "<li>Tag</li>";
		}
	});

	model.things = [{thing: "Orig"}, {thing: "First"}, {thing: "Middle"}, {thing: "Last"}]; // reset Prop

	$.templates('<ul>{^{liTag/}}{^{for things}}<li>{{:thing}}</li>{^{liTag/}}{{/for}}<li>|after</li></ul>')
		.link("#result", model); // -> TagOrigTagFirstTagMiddleTagLastTag|after

	// ................................ Act ..................................
	$.observable(model.things).move(2, 0, 2);

	// ............................... Assert .................................
	assert.equal($("#result").text(), "TagMiddleTagLastTagOrigTagFirstTag|after",
	'Within element only content, move(2, 0, 2) maintains correctly prevNode, nextNode, element order and binding on views and tags');

	// ................................ Reset ................................
	$("#result").empty();

	// =============================== Arrange ===============================
	function addResult() {
		result += "|" + $("#result").text();
	}

	var result = "";
	model.things = [{thing: "Orig"}, {thing: "First"}, {thing: "Middle"}, {thing: "Last"}];
	model.one = false;
	model.two = false;

	$.templates('<ul>	{^{if one}}<li>One</li>{{/if}}{^{if two}}<li>Two</li>{{/if}}{^{for things}}<li>{{:thing}}</li>{{/for}}</ul>')
		.link("#result", model);

	// ................................ Act ..................................
	$.observable(model.things).move(2, 0, 2);
	addResult();
	$.observable(model).setProperty("one", true);
	addResult();
	$.observable(model).setProperty("one", false);
	addResult();
	$.observable(model).setProperty("one", true);
	addResult();
	$.observable(model).setProperty("two", true);
	addResult();
	$.observable(model).setProperty("two", false);
	addResult();
	$.observable(model).setProperty("two", true);
	addResult();
	$.observable(model).setProperty("one", false);
	addResult();
	$.observable(model).setProperty("two", false);
	addResult();

	// ............................... Assert .................................
	assert.equal(result, "|MiddleLastOrigFirst|OneMiddleLastOrigFirst|MiddleLastOrigFirst|OneMiddleLastOrigFirst|OneTwoMiddleLastOrigFirst|OneMiddleLastOrigFirst|OneTwoMiddleLastOrigFirst|TwoMiddleLastOrigFirst|MiddleLastOrigFirst",
	'In element only content with preceding collapsible {{if}} blocks, move(2, 0, 2) maintains correctly prevNode, nextNode, element order and binding on views and tags');

	// ................................ Act ..................................
	result = ""

	$.observable(model.things).refresh([{thing: "Orig"}, {thing: "First"}, {thing: "Middle"}, {thing: "Last"}]);
	addResult();
	$.observable(model).setProperty("one", true);
	addResult();
	$.observable(model).setProperty("one", false);
	addResult();
	$.observable(model).setProperty("one", true);
	addResult();
	$.observable(model).setProperty("two", true);
	addResult();
	$.observable(model).setProperty("two", false);
	addResult();
	$.observable(model).setProperty("two", true);
	addResult();
	$.observable(model).setProperty("one", false);
	addResult();
	$.observable(model).setProperty("two", false);
	addResult();

	// ............................... Assert .................................
	assert.equal(result, "|OrigFirstMiddleLast|OneOrigFirstMiddleLast|OrigFirstMiddleLast|OneOrigFirstMiddleLast|OneTwoOrigFirstMiddleLast|OneOrigFirstMiddleLast|OneTwoOrigFirstMiddleLast|TwoOrigFirstMiddleLast|OrigFirstMiddleLast",
	'In element only content with preceding collapsible {{if}} blocks, refresh(...) maintains correctly prevNode, nextNode, element order and binding on views and tags');

	// ................................ Reset ................................
	$("#result").empty();

	// =============================== Arrange ===============================
	result = "";
	model.things = [{thing: "Orig"}, {thing: "First"}, {thing: "Middle"}, {thing: "Last"}]; // reset Prop
	model.one = [];
	model.two = [];

	$.templates('<ul>	{^{for one}}<li>{{:}}</li>{{/for}}{^{for two}}<li>{{:}}</li>{{/for}}{^{for things}}<li>{{:thing}}</li>{{/for}}</ul>')
		.link("#result", model);

	// ................................ Act ..................................
	$.observable(model.things).move(2, 0, 2);
	addResult();
	$.observable(model.one).insert("one");
	addResult();
	$.observable(model.one).remove();
	addResult();
	$.observable(model.one).insert("one");
	addResult();
	$.observable(model.two).insert("two");
	addResult();
	$.observable(model.two).remove();
	addResult();
	$.observable(model.two).insert("two");
	addResult();
	$.observable(model.one).remove();
	addResult();
	$.observable(model.two).remove();
	addResult();

	// ............................... Assert .................................
	assert.equal(result, "|MiddleLastOrigFirst|oneMiddleLastOrigFirst|MiddleLastOrigFirst|oneMiddleLastOrigFirst|onetwoMiddleLastOrigFirst|oneMiddleLastOrigFirst|onetwoMiddleLastOrigFirst|twoMiddleLastOrigFirst|MiddleLastOrigFirst",
	'In element only content with preceding collapsible {{for}} blocks, move(2, 0, 2) maintains correctly prevNode, nextNode, element order and binding on views and tags');

	// ................................ Act ..................................
	result = ""
	$.observable(model.things).refresh([{thing: "Orig"}, {thing: "First"}, {thing: "Middle"}, {thing: "Last"}]);
	addResult();
	$.observable(model.one).insert("one");
	addResult();
	$.observable(model.one).remove();
	addResult();
	$.observable(model.one).insert("one");
	addResult();
	$.observable(model.two).insert("two");
	addResult();
	$.observable(model.two).remove();
	addResult();
	$.observable(model.two).insert("two");
	addResult();
	$.observable(model.one).remove();
	addResult();
	$.observable(model.two).remove();
	addResult();

	// ............................... Assert .................................
	assert.equal(result, "|OrigFirstMiddleLast|oneOrigFirstMiddleLast|OrigFirstMiddleLast|oneOrigFirstMiddleLast|onetwoOrigFirstMiddleLast|oneOrigFirstMiddleLast|onetwoOrigFirstMiddleLast|twoOrigFirstMiddleLast|OrigFirstMiddleLast",
	'In element only content with preceding collapsible {{for}} blocks, refresh(...) maintains correctly prevNode, nextNode, element order and binding on views and tags');

	// ................................ Reset ................................
	$("#result").empty();

	// =============================== Arrange ===============================
	$.views.tags({
		spanTag: function() {
			return "<span>Tag</span>";
		}
	});

	model.things = [{thing: "Orig"}, {thing: "First"}, {thing: "Middle"}, {thing: "Last"}]; // reset Prop

	$.templates('<div>{^{spanTag/}}{^{for things}}<span>{{:thing}}</span>{^{spanTag/}}{{/for}}<span>|after</span></div>')
		.link("#result", model);

	// ................................ Act ..................................
	$.observable(model.things).move(2, 0, 2);

	// ............................... Assert .................................
	assert.equal($("#result").text(), "TagMiddleTagLastTagOrigTagFirstTag|after",
	'Within regular content, move(2, 0, 2) finds correctly the previous view, prevNode, nextNode, etc and establishes correct element/textNode order and binding');

	// ................................ Reset ................................
	$("#result").empty();
	model.things = []; // reset Prop

	// =============================== Arrange ===============================
	function move(from, to, number) {
		$.observable(model.items).move(from, to, number);
	}
	function remove(index, number) {
		$.observable(model.items).remove(index, number);
	}

	function insert(index, item) {
		$.observable(model.items).insert(index, item);
	}

	function findRed() {
		return " at: "
			+ $(".wrap").find("span[style]").view().index + "/" +
			+ $(".wrap2").find("li[style]").view().index + "/" +
			+ $(".wrap3").find("li[style]").view().index;
	}

	function current() {
		var seq = "",
			redItemAt;
		for (var i=0; i<arguments.length; i++) {
			if (arguments[i] === 0) {
				redItemAt = i;
			}
			seq += i + " " + arguments[i] + "|";
		}
		seq += "End";
		return "Start " + seq + "Start " + seq + "Start " + seq + "Start" + seq + " at: " + redItemAt + "/" + redItemAt + "/" + redItemAt
	}

	model.items = [0,1,2,3,4];

	var cnt = 5;

	$.templates(
		'<div>Start <span>' +
			'{^{for items}}' +
				'{^{:#index}} {{:}}|' +
			'{{/for}}' +
		'</span>End</div>' +

		'<div class="wrap">Start ' +
			'{^{for items}}' +
			'<b data-link="#index"></b> <span>{{:}}</span>|' +
			'{{/for}}' +
		'End</div>' +

		'Start <ul class="wrap2">' +
			'{^{for items}}' +
				'<li>{^{:#index}} <span data-link="#data"></span>|</li>' +
			'{{/for}}' +
		'</ul>End' +

		'<ul class="wrap3">' +
			'<li>Start</li>' +
			'{^{for items}}' +
				'<li data-link="#index + \' \' + #data + \'|\'"></li>' +
			'{{/for}}' +
			'<li>End</li>' +
		'</ul>'
	)
	.link("#result", model);

	$(".wrap").find("span:first").css("color", "red");
	$(".wrap2").find("li:first").css("color", "red");
	$(".wrap3").find("li:nth-of-type(2)").css("color", "red");

// ................................ Act ..................................
	move(0, 1);

	// ............................... Assert .................................

	assert.equal($("#result").text() + findRed(),
		current(1,0,2,3,4),
		'moved one item from 0 to 1');

// ................................ Act ..................................
	move(0, 1);

	// ............................... Assert .................................

	assert.equal($("#result").text() + findRed(),
		current(0,1,2,3,4),
		'moved one item from 0  to 1 again (actually swaps back to orginal positions');

// ................................ Act ..................................
	move(1, 0);

	// ............................... Assert .................................

	assert.equal($("#result").text() + findRed(),
		current(1,0,2,3,4),
		'moved one item back from 1 to 0');

// ................................ Act ..................................
	move(1, 0); // Return to original position
	move(1, 0, 0);

	// ............................... Assert .................................

	assert.equal($("#result").text() + findRed(),
		current(0,1,2,3,4),
		'move(1, 0, 0) does nothing');

// ................................ Act ..................................
	move(1, 1);

	// ............................... Assert .................................

	assert.equal($("#result").text() + findRed(),
		current(0,1,2,3,4),
		'move(1, 1) does nothing');

// ................................ Act ..................................
	move(0, 1, 2);

	// ............................... Assert .................................

	assert.equal($("#result").text() + findRed(),
		current(2,0,1,3,4),
		'move(0, 1, 2) moves 2 items');

// ................................ Act ..................................
	move(0, 1, 4);

	// ............................... Assert .................................

	assert.equal($("#result").text() + findRed(),
		current(4,2,0,1,3),
		'move(0, 1, 4) moves 4 items');

// ................................ Act ..................................
	move(1, 0, 4);

	// ............................... Assert .................................

	assert.equal($("#result").text() + findRed(),
		current(2,0,1,3,4),
		'move(1, 0, 4) moves back 4 items');

// ................................ Act ..................................
	move(0, 1, 5);

	// ............................... Assert .................................

	assert.equal($("#result").text() + findRed(),
		current(2,0,1,3,4),
		'move(0, 1, 5): moving more than total items does nothing');

// ................................ Act ..................................
	move(1, 2, 4);

	// ............................... Assert .................................

	assert.equal($("#result").text() + findRed(),
		current(2,0,1,3,4),
		'move(1, 2, 4): moving up items beyond last item does nothing');

// ................................ Act ..................................
	move(2, 1, 8);

	// ............................... Assert .................................

	assert.equal($("#result").text() + findRed(),
		current(2,1,3,4,0),
		'move(2, 1, 8): moving back items from beyond last item will move just the existing ones');

// ................................ Act ..................................
	remove(1,1);

	// ............................... Assert .................................

	assert.equal($("#result").text() + findRed(),
		current(2,3,4,0),
		'remove(1,1): works correctly');

// ................................ Act ..................................
	remove(0);

	// ............................... Assert .................................

	assert.equal($("#result").text() + findRed(),
		current(3,4,0),
		'remove(0): works correctly');

// ................................ Act ..................................
	move(2, 0);

	// ............................... Assert .................................

	assert.equal($("#result").text() + findRed(),
		current(0,3,4),
		'move(2, 0): works correctly');

// ................................ Act ..................................
	remove(2);
	move(0,1,2);
	insert(0, 2);
	move(2, 0);

	// ............................... Assert .................................

	assert.equal($("#result").text() + findRed(),
		current(3,2,0),
		'multiple operations: works correctly - with the original item with style set to red still there');

	// ................................ Reset ................................
	$("#result").empty();

	// =============================== Arrange ===============================
	function findRed2() {
		return " at: "
			+ $(".wrap").find("span[style]").view().getIndex() + "/" +
			+ $(".wrap2").find("li[style]").view().getIndex() + "/" +
			+ $(".wrap3").find("li[style]").view().getIndex();
	}

	model.items = [0,1,2,3,4];

	var cnt = 5;

	$.templates({
		tags: {
			tag: function() {return this.tagCtx.render();}
		},
		markup:
			'<div>Start <span>' +
				'{^{for items}}' +
					'{^{if true}}' +
						'{^{if true}}' +
							'{^{if false}}{{else}}' +
								'{^{tag}}' +
									'{^{:#getIndex()}} {{:}}|' +
								'{{/tag}}' +
							'{{/if}}' +
						'{{/if}}' +
					'{{/if}}' +
				'{{/for}}' +
			'</span>End</div>' +

			'<div class="wrap">Start ' +
				'{^{for items}}' +
					'{^{if true}}' +
						'{^{if true}}' +
							'{^{if false}}{{else}}' +
								'{^{tag}}' +
									'<b data-link="#getIndex()"></b> <span>{{:}}</span>|' +
								'{{/tag}}' +
							'{{/if}}' +
						'{{/if}}' +
					'{{/if}}' +
				'{{/for}}' +
			'End</div>' +

			'Start <ul class="wrap2">' +
				'{^{for items}}' +
					'{^{if true}}' +
						'{^{if true}}' +
							'{^{if false}}{{else}}' +
								'{^{tag}}' +
									'<li>{^{:#getIndex()}} <span data-link="#data"></span>|</li>' +
								'{{/tag}}' +
							'{{/if}}' +
						'{{/if}}' +
					'{{/if}}' +
				'{{/for}}' +
			'</ul>End' +

			'<ul class="wrap3">' +
				'<li>Start</li>' +
				'{^{for items}}' +
					'{^{if true}}' +
						'{^{if true}}' +
							'{^{if false}}{{else}}' +
								'{^{tag}}' +
									'<li data-link="#getIndex() + \' \' + #data + \'|\'"></li>' +
								'{{/tag}}' +
							'{{/if}}' +
						'{{/if}}' +
					'{{/if}}' +
				'{{/for}}' +
				'<li>End</li>' +
			'</ul>'
		}
	).link("#result", model);

	$(".wrap").find("span:first").css("color", "red");
	$(".wrap2").find("li:first").css("color", "red");
	$(".wrap3").find("li:nth-of-type(2)").css("color", "red");

// ................................ Act ..................................
	move(0, 1);

	// ............................... Assert .................................

	assert.equal($("#result").text() + findRed2(),
		current(1,0,2,3,4),
		'Complex template: moved one item from 0 to 1');

// ................................ Act ..................................
	move(0, 1);

	// ............................... Assert .................................

	assert.equal($("#result").text() + findRed2(),
		current(0,1,2,3,4),
		'Complex template: moved one item from 0  to 1 again (actually swaps back to orginal positions');

// ................................ Act ..................................
	move(1, 0);

	// ............................... Assert .................................

	assert.equal($("#result").text() + findRed2(),
		current(1,0,2,3,4),
		'Complex template: moved one item back from 1 to 0');

// ................................ Act ..................................
	move(1, 0); // Return to original position
	move(1, 0, 0);

	// ............................... Assert .................................

	assert.equal($("#result").text() + findRed2(),
		current(0,1,2,3,4),
		'Complex template: move(1, 0, 0) does nothing');

// ................................ Act ..................................
	move(1, 1);

	// ............................... Assert .................................

	assert.equal($("#result").text() + findRed2(),
		current(0,1,2,3,4),
		'Complex template: move(1, 1) does nothing');

// ................................ Act ..................................
	move(0, 1, 2);

	// ............................... Assert .................................

	assert.equal($("#result").text() + findRed2(),
		current(2,0,1,3,4),
		'Complex template: move(0, 1, 2) moves 2 items');

// ................................ Act ..................................
	move(0, 1, 4);

	// ............................... Assert .................................

	assert.equal($("#result").text() + findRed2(),
		current(4,2,0,1,3),
		'Complex template: move(0, 1, 4) moves 4 items');

// ................................ Act ..................................
	move(1, 0, 4);

	// ............................... Assert .................................

	assert.equal($("#result").text() + findRed2(),
		current(2,0,1,3,4),
		'Complex template: move(1, 0, 4) moves back 4 items');

// ................................ Act ..................................
	move(0, 1, 5);

	// ............................... Assert .................................

	assert.equal($("#result").text() + findRed2(),
		current(2,0,1,3,4),
		'Complex template: move(0, 1, 5): moving more than total items does nothing');

// ................................ Act ..................................
	move(1, 2, 4);

	// ............................... Assert .................................

	assert.equal($("#result").text() + findRed2(),
		current(2,0,1,3,4),
		'Complex template: move(1, 2, 4): moving up items beyond last item does nothing');

// ................................ Act ..................................
	move(2, 1, 8);

	// ............................... Assert .................................

	assert.equal($("#result").text() + findRed2(),
		current(2,1,3,4,0),
		'Complex template: move(2, 1, 8): moving back items from beyond last item will move just the existing ones');

// ................................ Act ..................................
	remove(1,1);

	// ............................... Assert .................................

	assert.equal($("#result").text() + findRed2(),
		current(2,3,4,0),
		'Complex template: remove(1,1): works correctly');

// ................................ Act ..................................
	remove(0);

	// ............................... Assert .................................

	assert.equal($("#result").text() + findRed2(),
		current(3,4,0),
		'Complex template: remove(0): works correctly');

// ................................ Act ..................................
	move(2, 0);

	// ............................... Assert .................................

	assert.equal($("#result").text() + findRed2(),
		current(0,3,4),
		'Complex template: move(2, 0): works correctly');

// ................................ Act ..................................
	remove(2);
	move(0,1,2);
	insert(0, 2);
	move(2, 0);

	// ............................... Assert .................................

	assert.equal($("#result").text() + findRed2(),
		current(3,2,0),
		'Complex template: multiple operations: works correctly - with the original item with style set to red still there');

	// ................................ Reset ................................
	$("#result").empty();

});

QUnit.test("JsViews ArrayChange: refresh()", function(assert) {
	// =============================== Arrange ===============================
	$.views.tags({
		liTag: function() {
			return "<li>Tag</li>";
		}
	});

	model.things = [{thing: "Orig"}, {thing: "First"}, {thing: "Middle"}, {thing: "Last"}]; // reset Prop

	$.templates('<ul>{^{liTag/}}{^{for things}}<li>{{:thing}}</li>{^{liTag/}}{{/for}}<li>|after</li></ul>')
		.link("#result", model); // -> TagOrigTagFirstTagMiddleTagLastTag|after

	// ................................ Act ..................................
	$.observable(model.things).refresh([{thing: "A"}, {thing: "B"}, {thing: "C"}]);

	// ............................... Assert .................................
	assert.equal($("#result").text(), "TagATagBTagCTag|after",
	'Within element only content, refresh() maintains correctly prevNode, nextNode, element order and binding on views and tags');

	// ................................ Reset ................................
	$("#result").empty();

	// =============================== Arrange ===============================
	$.views.tags({
		spanTag: function() {
			return "<span>Tag</span>";
		}
	});

	model.things = [{thing: "Orig"}, {thing: "First"}, {thing: "Middle"}, {thing: "Last"}]; // reset Prop

	$.templates('<div>{^{spanTag/}}{^{for things}}<span>{{:thing}}</span>{^{spanTag/}}{{/for}}<span>|after</span></div>')
		.link("#result", model);

	// ................................ Act ..................................
	$.observable(model.things).refresh([{thing: "A"}, {thing: "B"}, {thing: "C"}]);

	// ............................... Assert .................................
	assert.equal($("#result").text(), "TagATagBTagCTag|after",
	'Within regular content, refresh() finds correctly the previous view, prevNode, nextNode, etc and establishes correct element/textNode order and binding');

	// ................................ Reset ................................
	$("#result").empty();
	model.things = []; // reset Prop
});

QUnit.test("JsViews jsv-domchange", function(assert) {

	// =============================== Arrange ===============================
	res = "";

	function domchangeHandler(ev, tagCtx, linkCtx, eventArgs) {
		res += ev.type + " " + ev.target.tagName + " " + tagCtx.params.args[0] + " " + (linkCtx.tag === tagCtx.tag) + " " + eventArgs.change + " | " ;
	}

	$.views.tags({
		spanTag: function() {
			return "<span>Tag</span>";
		}
	});

	model.things = [{thing: "Orig"}, {thing: "First"}, {thing: "Middle"}, {thing: "Last"}]; // reset Prop

	$.templates('<div>{^{spanTag/}}{^{for things}}<span>{{:thing}}</span>{^{spanTag/}}{{/for}}<span>|after</span></div>')
		.link("#result", model);

	$("#result div").on("jsv-domchange", domchangeHandler);

	// ................................ Act ..................................
	$.observable(model.things).insert({thing: "New"});
	$.observable(model.things).move(2, 0, 2);
	$.observable(model.things).remove(1, 2);
	$.observable(model.things).refresh([{thing: "A"}, {thing: "B"}, {thing: "C"}]);

	// ............................... Assert .................................
	assert.equal(res,
		"jsv-domchange DIV things true insert | "
		+ "jsv-domchange DIV things true move | "
		+ "jsv-domchange DIV things true remove | "
		+ "jsv-domchange DIV things true insert | "
		+ "jsv-domchange DIV things true remove | "
		+ "jsv-domchange DIV things true refresh | ",
	'Correct behavior of $(...).on("jsv-domchange", domchangeHandler)');

	// ................................ Reset ................................
	$("#result").empty();
	reset();

	// =============================== Arrange ===============================
	model.things = [{thing: "Orig"}, {thing: "First"}, {thing: "Middle"}, {thing: "Last"}]; // reset Prop

	$.templates(
		'<div data-link=\'{on "jsv-domchange" ~domchange 333 444}\'>'
			+ '{^{spanTag/}}{^{for things}}<span>{{:thing}}</span>{^{spanTag/}}{{/for}}<span>|after</span>'
	+ '</div>')
		.link("#result", model, {
			domchange: function(param1, param2, ev, domchangeEventArgs, tagCtx, linkCtx, observableEventArgs) {
				res += "Params: " + param1 + ", " + param2 + " | ";
				domchangeHandler(ev, tagCtx, linkCtx, observableEventArgs);
			}
		});

	// ................................ Act ..................................
	$.observable(model.things).insert({thing: "New"});
	$.observable(model.things).move(2, 0, 2);
	$.observable(model.things).remove(1, 2);
	$.observable(model.things).refresh([{thing: "A"}, {thing: "B"}, {thing: "C"}]);

	assert.equal(res,
		"Params: 333, 444 | jsv-domchange DIV things true insert | "
		+ "Params: 333, 444 | jsv-domchange DIV things true move | "
		+ "Params: 333, 444 | jsv-domchange DIV things true remove | "
		+ "Params: 333, 444 | jsv-domchange DIV things true insert | "
		+ "Params: 333, 444 | jsv-domchange DIV things true remove | "
		+ "Params: 333, 444 | jsv-domchange DIV things true refresh | ",
	'Correct behavior of data-link=\'{on "jsv-domchange" ~domchange param1 param2}\'');

	// ................................ Reset ................................
	model.things = []; // reset Prop
	$("#result").empty();
	reset();
});

QUnit.module("API - $.observe() (jsv)");

QUnit.test("observe/unobserve alternative signatures", function(assert) {

	$.views.settings.advanced({_jsv: true});

	// =============================== Arrange ===============================

	var person = {last: " L"};
	function onch(ev, eventArgs) {
	}

	// ................................ Act ..................................
	$.observe(person, "last", onch);
	$.templates("{^{:last}}").link("#result", person);
	$.unobserve(person, "last", onch);
	$("#result").empty();

	// ............................... Assert .................................
	assert.equal(JSON.stringify([_jsv.cbBindings, _jsv.bindings, $._data(person).events]), "[{},{},null]",
		"observe/unobserve API calls combined with template binding: all bindings removed when content removed from DOM and unobserve called");

	// ................................ Reset ................................
	reset();

	// =============================== Arrange ===============================
	function onch2(ev, eventArgs) {}
	person = {first: "F", last: " L"};

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
	assert.equal(JSON.stringify([_jsv.cbBindings, _jsv.bindings, $._data(person).events]), "[{},{},null]",
		"Observe API calls combined with template binding (version 2): all bindings removed when content removed from DOM and unobserve called");

	// ................................ Reset ................................
	reset();

	$.views.settings.advanced({_jsv: false});
});

QUnit.test("Array", function(assert) {

	$.views.settings.advanced({_jsv: true}); // For using _jsv

	// =============================== Arrange ===============================
	var people = [1, 2];
	function onch() {}
	function onch2() {}

	// ................................ Act ..................................
	$.observe(people, "length", onch);
	$.observe(people, "length", onch2);
	$.observe(people, "length2", onch);
	$.templates("{^{for people}}{{/for}} {^{:people}}").link("#result", {people: people});
	$.observe(people, "length2", onch2);
	$.unobserve(people, "length2", onch);
	$.unobserve(people, "length2", onch2);
	$("#result").empty();
	$.unobserve(people, "length", onch);
	$.unobserve(people, "length", onch2);

	// ............................... Assert .................................
	assert.equal(JSON.stringify([_jsv.cbBindings, _jsv.bindings, $._data(people).events]), "[{},{},null]",
		"observe/unobserve array - API calls in different orders: all bindings removed when content removed from DOM and unobserve called");

	$.views.settings.advanced({_jsv: false});
});

QUnit.test("MVVM", function(assert) {
$.views.settings.trigger(false);

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
	assert.equal(ret, "|1st Ave/1st Ave--InputStreet/InputStreet--oldAddressChgStreet/oldAddressChgStreet--newAddressStreet/newAddressStreet--newAddressChgStreet/newAddressChgStreet",
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
	assert.equal(ret, "|1st Ave/1st Ave--InputStreet/InputStreet--oldAddressChgStreet/oldAddressChgStreet--newAddressStreet/newAddressStreet--newAddressChgStreet/newAddressChgStreet",
		"Paths with computed/getters: address().street() - Paths with computed/getter followed by '.' still update preceding getter"
		+ "- same as if there was a '^' separator");
	// =============================== Arrange ===============================

	person = new Person("pete", new Address("1st Ave"), [new Phone({number: "phone1"}), new Phone({number: "phone2"})]);

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
	assert.equal(message, '{\"change\":\"set\",\"path\":\"street\",\"value\":\"InputStreet\",\"oldValue\":\"1st Ave\"}\n\
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
	assert.equal(message + ret
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

	person = new Person("pete", new Address("1st Ave"), [new Phone({number: "phone1"}), new Phone({number: "phone2"})]);

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
	$.observable(person.phones()).move(1, 3, 2);
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
	$.observable(person.phones()).move(1, 3, 2);
	getResult("move:");
	$.observable(person).setProperty("phones", []);
	getResult("\nsetEmpty>>");
	$.observable(person.phones()).insert(new Phone({number: "insertedPhoneY"}));
	getResult("insert:");

	$("#result").empty();

	// ............................... Assert .................................
	assert.equal(ret, "\nInit>>phone1,phone2,insert:phone1,phone2,insertedPhone,remove:phone2,insertedPhone,refresh:replacedPhone1,replacedPhone2,insert:replacedPhone1,insertedPhone3a,insertedPhone3b,replacedPhone2, move:replacedPhone1,replacedPhone2,insertedPhone3a,insertedPhone3b,\
\nSet>>replacedPhone1,insert:replacedPhone1,insertedPhoneX,remove:insertedPhoneX,refresh:replacedPhoneX1,replacedPhoneX2,insert:replacedPhoneX1,insertedPhoneX3a,insertedPhoneX3b,replacedPhoneX2,move:replacedPhoneX1,replacedPhoneX2,insertedPhoneX3a,insertedPhoneX3b,\
\nsetEmpty>>insert:insertedPhoneY,",
		"Array operations with getters allow complete functionality, and track the modified tree at all times");
	// =============================== Arrange ===============================

	person = new Person("pete", new Address("1st Ave"), [new Phone({number: "phone1"}), new Phone({number: "phone2"})]);

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

	$.observable(person.phones()).move(1, 3, 2);
	$.observable(person).setProperty("phones", [new Phone({number: "replacedPhone1"})]);

	$.observable(person.phones()).insert(new Phone({number: "insertedPhoneX"}));

	$.observable(person.phones()).remove(0);

	$.observable(person.phones()).refresh([new Phone({number: "replacedPhoneX1"}), new Phone({number: "replacedPhoneX2"})]);
	$.observable(person.phones()).insert(1, [new Phone({number: "insertedPhoneX3a"}), new Phone({number: "insertedPhoneX3b"})]);

	$.observable(person.phones()).move(1, 3, 2);
	$.observable(person).setProperty("phones", []);
	$.observable(person.phones()).insert(new Phone({number: "insertedPhoneY"}));
	$.observable(person.phones()[0]).setProperty("number", "newNumber");

	eventsCountAfterChanges = $._data(person).events.propertyChange.length
		+ " " + $._data(person.phones()).events.arrayChange.length
		+ " " + $._data(person.phones()[0]).events.propertyChange.length + "|";

	// ............................... Assert .................................
	assert.equal(message, '{\"change\":\"insert\",\"index\":2,\"items\":[{\"_number\":\"insertedPhone\"}]}\n\
{\"change\":\"remove\",\"index\":0,\"items\":[{\"_number\":\"phone1\"}]}\n\
{\"change\":\"insert\",\"index\":0,\"items\":[{\"_number\":\"replacedPhone1\"},{\"_number\":\"replacedPhone2\"}],\"refresh\":true}\n\
{\"change\":\"remove\",\"index\":2,\"items\":[{\"_number\":\"phone2\"},{\"_number\":\"insertedPhone\"}],\"refresh\":true}\n\
{\"change\":\"refresh\",\"oldItems\":[{\"_number\":\"phone2\"},{\"_number\":\"insertedPhone\"}]}\n\
{\"change\":\"insert\",\"index\":1,\"items\":[{\"_number\":\"insertedPhone3a\"},{\"_number\":\"insertedPhone3b\"}]}\n\
{\"change\":\"move\",\"oldIndex\":1,\"index\":2,\"items\":[{\"_number\":\"insertedPhone3a\"},{\"_number\":\"insertedPhone3b\"}]}\n\
{\"change\":\"set\",\"path\":\"phones\",\"value\":[{\"_number\":\"replacedPhone1\"}],\"oldValue\":[{\"_number\":\"replacedPhone1\"},{\"_number\":\"replacedPhone2\"},{\"_number\":\"insertedPhone3a\"},{\"_number\":\"insertedPhone3b\"}]}\n\
\
{\"change\":\"insert\",\"index\":1,\"items\":[{\"_number\":\"insertedPhoneX\"}]}\n\
{\"change\":\"remove\",\"index\":0,\"items\":[{\"_number\":\"replacedPhone1\"}]}\n\
{\"change\":\"insert\",\"index\":0,\"items\":[{\"_number\":\"replacedPhoneX1\"},{\"_number\":\"replacedPhoneX2\"}],\"refresh\":true}\n\
{\"change\":\"remove\",\"index\":2,\"items\":[{\"_number\":\"insertedPhoneX\"}],\"refresh\":true}\n\
{\"change\":\"refresh\",\"oldItems\":[{\"_number\":\"insertedPhoneX\"}]}\n\
{\"change\":\"insert\",\"index\":1,\"items\":[{\"_number\":\"insertedPhoneX3a\"},{\"_number\":\"insertedPhoneX3b\"}]}\n\
{\"change\":\"move\",\"oldIndex\":1,\"index\":2,\"items\":[{\"_number\":\"insertedPhoneX3a\"},{\"_number\":\"insertedPhoneX3b\"}]}\n\
\
{\"change\":\"set\",\"path\":\"phones\",\"value\":[],\"oldValue\":[{\"_number\":\"replacedPhoneX1\"},{\"_number\":\"replacedPhoneX2\"},{\"_number\":\"insertedPhoneX3a\"},{\"_number\":\"insertedPhoneX3b\"}]}\n\
\
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
	assert.equal(message + ret
		+ eventsCountBefore
		+ eventsCountAfterObserveAll
		+ eventsCountAfterChanges
		+ eventsCountAfterUnobserveAll
		+ eventsAfterUnobservePhones
		+ eventsAfterEmptyTemplateContainer,
		"1 1 1|2 2 2|2 2 2|1 1 1|1 true 1|true true true|",
		"Paths with computed/getters: address().street() - unobserveAll is successful");

$.views.settings.trigger(true);
});

QUnit.test("$.views.viewModels", function(assert) {
	// =============================== Arrange ===============================
	var Constr = $.views.viewModels({getters: ["a", "b"]});
	// ................................ Act ..................................
	var vm = Constr("a1 ", "b1 ");
	var res = vm.a() + vm.b();
	vm.a("a2 ");
	vm.b("b2 ");
	res += vm.a() + vm.b();
	// ............................... Assert .................................
	assert.equal(res, "a1 b1 a2 b2 ", "viewModels, two getters, no methods");

	// =============================== Arrange ===============================
	Constr = $.views.viewModels({getters: ["a", "b", "c"], extend: {add: function(val) {
		this.c(val + this.a() + this.b() + this.c());
	}}});
	// ................................ Act ..................................
	vm = Constr("a1 ", "b1 ", "c1 ");
	vm.add("before ");
	res = vm.c();
	// ............................... Assert .................................
	assert.equal(res, "before a1 b1 c1 ", "viewModels, two getters, one method");

	// =============================== Arrange ===============================
	Constr = $.views.viewModels({extend: {add: function(val) {
		this.foo = val;
	}}});
	// ................................ Act ..................................
	vm = Constr();
	vm.add("before");
	res = vm.foo;
	// ............................... Assert .................................
	assert.equal(res, "before", "viewModels, no getters, one method");

	// =============================== Arrange ===============================
	Constr = $.views.viewModels({getters: []});
	// ................................ Act ..................................
	vm = Constr();
	res = JSON.stringify(vm);
	// ............................... Assert .................................
	assert.equal(res, "{}", "viewModels, no getters, no methods");

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

	res = vm.a() + vm.b();
	vm.a("a2 ");
	vm.b("b2 ");
	res += vm.a() + vm.b();

	// ............................... Assert .................................
	assert.equal(res + "|" + changes, "a1 b1 a2 b2 |a2 b2 ", "viewModels, two getters, no methods");
	changes = "";

	// ................................ Act ..................................
	vm.merge({a: "a3 ", b: "b3 "});

	res = vm.a() + vm.b();

	// ............................... Assert .................................
	assert.equal(res + "|" + changes, "a3 b3 |a3 b3 ", "viewModels merge, two getters, no methods");
	changes = "";

	// ................................ Act ..................................
	res = vm.unmap();
	res = JSON.stringify(res);

	// ............................... Assert .................................
	assert.equal(res, '{"a":"a3 ","b":"b3 "}', "viewModels unmap, two getters, no methods");

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

	res = vm.a() + vm.b() + vm.c() + vm.d() + vm.e() + vm.f() + vm.g() + vm.h();
	vm.a("a2 ");
	vm.b("b2 ");
	res += vm.a() + vm.b();
	// ............................... Assert .................................
	assert.equal(res + "|" + changes, "a1 b1 c1 d1 e1 f1 g1 h1 a2 b2 |a2 b2 ",
		"viewModels, multiple unmapped getters, no methods");
	changes = "";

	// ................................ Act ..................................
	vm.merge({a: "a3 ", b: "b3 ", c: "c3 ", d: "d3 ", e: "e3 ", f: "f3 ", g: "g3 ", h: "h3 "});

	res = vm.a() + vm.b() + vm.c() + vm.d() + vm.e() + vm.f() + vm.g() + vm.h();

	// ............................... Assert .................................
	assert.equal(res + "|" + changes, "a3 b3 c3 d3 e3 f3 g3 h3 |a3 b3 c3 d3 e3 f3 g3 h3 ",
		"viewModels merge, multiple unmapped getters, no methods");
	changes = "";

	// ................................ Act ..................................
	res = vm.unmap();
	res = JSON.stringify(res);

	// ............................... Assert .................................
	assert.equal(res, '{"a":"a3 ","b":"b3 ","c":"c3 ","d":"d3 ","e":"e3 ","f":"f3 ","g":"g3 ","h":"h3 "}',
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
	res = vm.c();

	// ............................... Assert .................................
	assert.equal(res + "|" + changes, "before a1 b1 c1 |before a1 b1 c1 ", "viewModels, getters and one method");
	changes = "";

	// ................................ Act ..................................
	vm.merge({a: "a3 ", b: "b3 ", c: "c3 "});
	vm.add("updated ");
	res = vm.c();

	// ............................... Assert .................................
	assert.equal(res + "|" + changes, "updated a3 b3 c3 |a3 b3 c3 updated a3 b3 c3 ", "viewModels merge, getters and one method");
	changes = "";

	// ................................ Act ..................................
	res = vm.unmap();
	res = JSON.stringify(res);

	// ............................... Assert .................................
	assert.equal(res, '{"a":"a3 ","b":"b3 ","c":"updated a3 b3 c3 "}', "viewModels unmap, getters and one method");
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

	res = JSON.stringify(t2.unmap());

	// ............................... Assert .................................
	assert.equal(res, '{"t1":{"a":"a3 ","b":"b3 "},"t1Arr":[{"a":"a1 ","b":"b1 "},{"a":"a2 ","b":"b2 "}],"t1OrNull":null}',
		"viewModels, hierarchy");

	// ................................ Act ..................................
	t2.t1Arr()[0].merge({a: "a1x ", b: "b1x "}); // merge not the root, but a VM instance within hierarchy: vm2.t1Arr()[0] - leaving rest unchanged
	res = JSON.stringify(t2.unmap());

	// ............................... Assert .................................
	assert.equal(res + "|" + changes, '{"t1":{"a":"a3 ","b":"b3 "},"t1Arr":[{"a":"a1x ","b":"b1x "},{"a":"a2 ","b":"b2 "}],"t1OrNull":null}|a1x b1x ',
		"viewModels, merge deep node");
	changes = "";

	// ............................... Reset .................................
	$.unobserve(observeAllHandler);

	// ................................ Act ..................................
	var t1Arr = viewModels.T1.map([{a: "a1 ", b: "b1 "}, {a: "a2 ", b: "b2 "}]); // Create a T1 array
	var t2FromArr =  viewModels.T2.map({t1: {a: "a3 ", b: "b3 "}, t1Arr: t1Arr.unmap()}); // Create a T2 (using unmap to scrape values the T1: vm)
	res = JSON.stringify(t2FromArr.unmap());

	// ............................... Assert .................................
	assert.equal(res, '{"t1":{"a":"a3 ","b":"b3 "},"t1Arr":[{"a":"a1 ","b":"b1 "},{"a":"a2 ","b":"b2 "}],"t1OrNull":null}',
		"viewModels, hierarchy");

	// ................................ Act ..................................
	t1Arr = viewModels.T1.map([{a: "a1 ", b: "b1 "}, {a: "a2 ", b: "b2 "}]); // Create a T1 array
	t1Arr.push(viewModels.T1("a3 ", "b3 "));
	t2FromArr = viewModels.T2.map({t1: {a: "a4 ", b: "b4 "}, t1Arr: t1Arr.unmap()}); // Create a T2 (using unmap to scrape values the T1: vm)
	res = JSON.stringify(t2FromArr.unmap());

	// ............................... Assert .................................
	assert.equal(res, '{"t1":{"a":"a4 ","b":"b4 "},"t1Arr":[{"a":"a1 ","b":"b1 "},{"a":"a2 ","b":"b2 "},{"a":"a3 ","b":"b3 "}],"t1OrNull":null}',
		"viewModels, hierarchy");

	// ................................ Act ..................................
	var t2new = viewModels.T2(viewModels.T1("a3 ", "b3 "), [viewModels.T1("a1 ", "b1 "), viewModels.T1("a2 ", "b2 ")], viewModels.T1("a4 ", "b4 ") );
	res = JSON.stringify(t2new.unmap());

	// ............................... Assert .................................
	assert.equal(res, '{"t1":{"a":"a3 ","b":"b3 "},"t1Arr":[{"a":"a1 ","b":"b1 "},{"a":"a2 ","b":"b2 "}],"t1OrNull":{"a":"a4 ","b":"b4 "}}',
		"viewModels, hierarchy");
});

QUnit.module("API - depends");

QUnit.test("Computed observables, converters and tags with depends", function(assert) {
	// =============================== Arrange ===============================

function testDepends(template) {
	// =============================== Arrange ===============================
	var ret = "",
		items = ["first"],
		items2 = ["new0", "new1"],
		app = {
			show: true,
			name: "Jo",
			itemsProp: items,
			summary: summary
		};

	$.templates(template).link("#result", app, {summary: summary});

	ret += "|1:" + $("#result").text();

	// ................................ Act ..................................
	$.observable(app).setProperty("name", "Bob");
	ret += "|2:" + $("#result").text();

	$.observable(app.itemsProp).insert(0, "previous");
	ret += "|3:" + $("#result").text();

	$.observable(app).setProperty("name", "Jim");
	ret += "|4:" + $("#result").text();

	$.observable(app).setProperty("itemsProp", items2);
	ret += "|5:" + $("#result").text();

	$.observable(app.itemsProp).move(0, 1);
	ret += "|6:" + $("#result").text();

	$.observable(app.itemsProp).insert(0, "newPrev");
	ret += "|7:" + $("#result").text();

	$.observable(app).setProperty("name", "Jeff");
	ret += "|8:" + $("#result").text() + "/" + !$._data(items).events + "/" + $._data(items2).events.arrayChange.length;

	$.observable(app).setProperty("show", false);
	ret += "|9:" + $("#result").text() + "/" + !$._data(items).events + "/" + !$._data(items2).events;

	$.observable(app).setProperty("show", true);
	ret += "|10:" + $("#result").text() + "/" + !$._data(items).events + "/" + $._data(items2).events.arrayChange.length;

	$.observable(app.itemsProp).insert(0, "extraPrev");
	ret += "|11:" + $("#result").text() + "/" + !$._data(items).events + "/" + $._data(items2).events.arrayChange.length;

	// ................................ Reset ................................
	$("#result").empty();
	$.unobserve(app);

	return ret ===
		"|1:first-1-Jo" +
		"|2:first-1-Bob" +
		"|3:previous-2-Bob" +
		"|4:previous-2-Jim" +
		"|5:new0-2-Jim" +
		"|6:new1-2-Jim" +
		"|7:newPrev-3-Jim" +
		"|8:newPrev-3-Jeff" + "/true/1" +
		"|9:/true/true" +
		"|10:newPrev-3-Jeff" + "/true/1" +
		"|11:extraPrev-4-Jeff" + "/true/1";
}

	// =============================== Arrange ===============================
	var summary = function() {
		return this.itemsProp[0] + "-" + this.itemsProp.length + "-" + this.name;
	};

	summary.depends = ["itemsProp", "name"];

	// ................................ Assert ..................................
	assert.ok(testDepends("{^{if show}}{^{:summary()}}{{/if}}"),
		'Computed observable with depends = ["itemsProp", ...] updates for both array change and property change');

	// =============================== Arrange ===============================

	summary.depends = function(object, callback) {
		$.observe(object, "itemsProp", callback);
		return "name";
	};

	// ................................ Assert ..................................
	assert.ok(testDepends("{^{if show}}{^{:summary()}}{{/if}}"),
		'Computed observable with depends function programmatically observing array, with the callback provided as parameter. Works equivalently to the declarative depends for an array');

	// =============================== Arrange ===============================
	var test;
	summary.depends = function(data1) {
		var this1 = this;
		return function (data2) {
			var this2 = this;
			return [function (data3) {
				var this3 = this;
				test = this1 === data1 && this1 === data2 && this1 === data3 && this1 === this2 && this1 === this3;
				return "itemsProp";
			}, "name"];
		};
	};

	// ................................ Assert ..................................
	assert.ok(testDepends("{^{if show}}{^{:summary()}}{{/if}}") && test,
		'Computed observable with depends including several nested function calls returning (finally) "itemsProp" updates for both array change and property change, and has correct this pointers and data arguments');

	// =============================== Arrange ===============================
	summary.depends = function() {
		return function (object, callback) {
			$.observe(object, "itemsProp", callback);
			return [function () {
				$.observe(object, "name", callback);
			}];
		};
	};

	// ................................ Assert ..................................
	assert.ok(testDepends("{^{if show}}{^{:summary()}}{{/if}}"),
		'Computed observable with depends including several nested function calls (finally) programmatically observing both array and property. Works equivalently to declarative version');

	// =============================== Arrange ===============================
	function listenToArray(object, callback) {
		$.observe(object, "itemsProp", callback);
	}
	function listenToName(object, callback) {
		$.observe(object, "name", callback);
	}
	summary.depends = [listenToArray, listenToName];

	// ................................ Assert ..................................
	assert.ok(testDepends("{^{if show}}{^{:summary()}}{{/if}}"),
		'Computed observable with depends using independently declared functions to programmatically observe any fields. Works equivalently to declarative version');

	// =============================== Arrange ===============================
	function listenTo(field) {
		return function(object, callback) {
			$.observe(object, field, callback);
		}
	}

	summary.depends = [listenTo("itemsProp"), listenTo("name")];

	// ................................ Assert ..................................
	assert.ok(testDepends("{^{if show}}{^{:summary()}}{{/if}}"),
		'Computed observable with depends using generated function to programmatically observe any fields. Works equivalently to declarative version');

	// =============================== Arrange ===============================
	var summary = function() {
		var data = this.data; // 'this' is the view
		return data.itemsProp[0] + "-" + data.itemsProp.length + "-" + data.name;
	}
	summary.depends = ["itemsProp", "name"];

	// ................................ Assert ..................................
	assert.ok(testDepends("{^{if show}}{^{:~summary()}}{{/if}}"),
		'Computed observable helper depends = ["itemsProp", ...] updates for both array change and property change');

	// =============================== Arrange ===============================

	var summary = function() {
		var data = this.tagCtx.view.data; // 'this' is the tag instance
		return data.itemsProp[0] + "-" + data.itemsProp.length + "-" + data.name;
	}

	summary.depends = ["itemsProp", "name"];
	// ................................ Assert ..................................
	assert.ok(testDepends("{^{if show}}{^{:'foo' convert=~summary}}{{/if}}"),
		'Converter (passed as helper) with depends = ["itemsProp", ...] updates for both array change and property change');

	// =============================== Arrange ===============================

	$.views.converters("sumry", summary);

	// ................................ Assert ..................................
	assert.ok(testDepends("{^{if show}}{^{sumry:'foo'}}{{/if}}"),
		'Registered converter with depends = ["itemsProp", ...] updates for both array change and property change');

	$.views.converters("sumry", null);

	// =============================== Arrange ===============================
	summary.depends = null;

	$.views.tags("sumry", {
		render: summary,
		depends: ["itemsProp", "name"]
	});

	// ................................ Assert ..................................
	assert.ok(testDepends("{^{if show}}{^{sumry/}}{{/if}}"),
		'Registered tag with depends = ["itemsProp", ...] updates for both array change and property change');

	$.views.tags("sumry", null);

	// =============================== Arrange ===============================
	var ret = "",
		items = ["first"],
		items2 = ["new0", "new1"],
		app = {
			show: true,
			name: "Jo",
			itemsProp: items,
			summary: summary
		};

	$.templates("{^{for").link("#result", app, {summary: summary});

	ret += "|1:" + $("#result").text();

	// ................................ Act ..................................
	$.observable(app).setProperty("name", "Bob");
	ret += "|2:" + $("#result").text();

	$.observable(app.itemsProp).insert(0, "previous");
	ret += "|3:" + $("#result").text();

	$.observable(app).setProperty("name", "Jim");

	// =============================== Arrange ===============================
$.views.settings.trigger(false);

	function fullName() {
		var person = this.ctxPrm ? this.ctxPrm("prson") : this;
		return person.title + " " + person.name + " " + person.address.street;
	}

	fullName.depends = function(data) {
		return [this, "title", "name", "address^street"];
	};

	fullName.set = function(val) {
		var parts = val.split(" ");
		$.observable(this).setProperty({
			title: parts.shift(),
			name: parts.shift(),
			address: {street: parts.join(" ")}
		});
	};

	var prson = {
		title: "Sir",
		name: "Jo",
		address: {street: "1st Ave"},
		fullName: fullName,
	};

	$.views.templates({
		markup: '{^{:~prson.title}} <input data-link="~prson.title" />'
	+ '{^{:~prson.name}} <input data-link="~prson.name" />'
	+ '{^{:~prson.address^street}} <input data-link="~prson.address^street" /> '
	+ 'Full: {^{:~prson.fullName()}} <input data-link="~prson.fullName()" />'
	+ '{^{mytag ~prson.fullName}}'
		+ ' CTP: {^{:~ctp()}}'
		+ '<input data-link="~ctp()" />'
	+ '{{/mytag}}'
	+ ' FULLNAMETAG: {^{fullName ~prson/}}',
		tags: {
			mytag: {
				linkedCtxParam: "ctp",
				onUpdate: false // Could also be true
			},
			fullName: {
				linkedCtxParam: ["prsn"],
				render: function(person) {
					return person.title + " " + person.name + " " + person.address.street + " <input id='intag' data-link='~prsn.fullName()'/>";
				},
				depends: function(data) {
					return [this.tagCtx.args[0], "title", "name", "address^street"];
				}
			}
		}
	}).link("#result", 1, {
		prson: prson
	});
	var input,
		result = $("#result").text();

	// ................................ Act ..................................
	$.observable(prson).setProperty("address", {street: "2nd St"});
	result += "\nADDRESS: " + $("#result").text();

	input = $("#result input")[0];
	$(input).val(input.value + "+").change();
	result += "\nTITLE: " + $("#result").text();

	input = $("#result input")[1];
	$(input).val(input.value + "+").change();
	result += "\nNAME: " + $("#result").text();

	input = $("#result input")[2];
	$(input).val(input.value + "+").change();
	result += "\nSTREET: " + $("#result").text();

	input = $("#result input")[3];
	$(input).val("Mr Bob FullSt").change();
	result += "\nFULL: " + $("#result").text();

	input = $("#result input")[4];
	$(input).val("Lady Jane CtpSt").change();
	result += "\nCTP: " + $("#result").text();

	input = $("#result input")[5];
	$(input).val("Ms Anne TagSt").change();
	result += "\nTAG: " + $("#result").text();

	// ............................... Assert .................................

	var expected = "Sir Jo 1st Ave  Full: Sir Jo 1st Ave  CTP: Sir Jo 1st Ave FULLNAMETAG: Sir Jo 1st Ave \n"
		+ "ADDRESS: Sir Jo 2nd St  Full: Sir Jo 2nd St  CTP: Sir Jo 2nd St FULLNAMETAG: Sir Jo 2nd St \n"
		+ "TITLE: Sir+ Jo 2nd St  Full: Sir+ Jo 2nd St  CTP: Sir+ Jo 2nd St FULLNAMETAG: Sir+ Jo 2nd St \n"
		+ "NAME: Sir+ Jo+ 2nd St  Full: Sir+ Jo+ 2nd St  CTP: Sir+ Jo+ 2nd St FULLNAMETAG: Sir+ Jo+ 2nd St \n"
		+ "STREET: Sir+ Jo+ 2nd St+  Full: Sir+ Jo+ 2nd St+  CTP: Sir+ Jo+ 2nd St+ FULLNAMETAG: Sir+ Jo+ 2nd St+ \n"
		+ "FULL: Mr Bob FullSt  Full: Mr Bob FullSt  CTP: Mr Bob FullSt FULLNAMETAG: Mr Bob FullSt \n"
		+ "CTP: Lady Jane CtpSt  Full: Lady Jane CtpSt  CTP: Lady Jane CtpSt FULLNAMETAG: Lady Jane CtpSt \n"
		+ "TAG: Ms Anne TagSt  Full: Ms Anne TagSt  CTP: Ms Anne TagSt FULLNAMETAG: Ms Anne TagSt ";

	assert.equal(result, expected,
	"Custom tag control {{fullName ...}} using render, with linkedCtxParam, depends, onUpdate not false");

	// =============================== Arrange ===============================
	prson = {
		title: "Sir",
		name: "Jo",
		fullName: fullName,
		address: {street: "1st Ave"}
	};

	$.views.templates({
		markup: '{^{:~prson.title}} <input data-link="~prson.title" />'
	+ '{^{:~prson.name}} <input data-link="~prson.name" />'
	+ '{^{:~prson.address^street}} <input data-link="~prson.address^street" /> '
	+ 'Full: {^{:~prson.fullName()}} <input data-link="~prson.fullName()" />'
	+ '{^{mytag ~prson.fullName}}'
		+ ' CTP: {^{:~ctp()}}'
		+ '<input data-link="~ctp()" />'
	+ '{{/mytag}}'
	+ ' FULLNAMETAG: {^{fullName ~prson/}}',
		tags: {
			mytag: {
				linkedCtxParam: "ctp",
				onUpdate: false
			},
			fullName: {
				linkedCtxParam: ["prsn"],
				template: "{{:~prsn.title}} {{:~prsn.name}} {{:~prsn.address.street}} <input id='intag' data-link='~prsn.fullName()'/>",
				depends: function(data) {
					return [this.tagCtx.args[0], "title", "name", "address^street"];
				}
			}
		}
	}).link("#result", 1, {
		prson: prson
	});
	var input,
		result = $("#result").text();

	// ................................ Act ..................................
	$.observable(prson).setProperty("address", {street: "2nd St"});
	result += "\nADDRESS: " + $("#result").text();

	input = $("#result input")[0];
	$(input).val(input.value + "+").change();
	result += "\nTITLE: " + $("#result").text();

	input = $("#result input")[1];
	$(input).val(input.value + "+").change();
	result += "\nNAME: " + $("#result").text();

	input = $("#result input")[2];
	$(input).val(input.value + "+").change();
	result += "\nSTREET: " + $("#result").text();

	input = $("#result input")[3];
	$(input).val("Mr Bob FullSt").change();
	result += "\nFULL: " + $("#result").text();

	input = $("#result input")[4];
	$(input).val("Lady Jane CtpSt").change();
	result += "\nCTP: " + $("#result").text();

	input = $("#result input")[5];
	$(input).val("Ms Anne TagSt").change();
	result += "\nTAG: " + $("#result").text();

	// ............................... Assert .................................
	assert.equal(result, expected,
	"Custom tag control {{fullName ...}} using template, with linkedCtxParam, depends, onUpdate not false - works correctly");

	// =============================== Arrange ===============================
	prson = {
		title: "Sir",
		name: "Jo",
		fullName: fullName,
		address: {street: "1st Ave"}
	};

	$.views.templates({
		markup: 'Title: {^{:person.title}} '
	+ 'Name: {^{:person.name}} '
	+ 'Street: {^{:person^address.street}} '
	+ 'Full: {^{:person.fullName()}} '
	+ 'TAG: {^{mytag person.fullName ~prson=person}}' // Bind to function itself
		+ '{^{:~ctp()}}'
		+ ' <input data-link="~ctp()" />'
	+ '{{/mytag}}'
	+ 'TAG2: {^{mytag person.fullName() ~prson=person}}' // Bind to evaluated function
		+ '{^{:~ctp}}'
		+ ' <input data-link="~ctp" />'
	+ '{{/mytag}}',
		tags: {
			mytag: {
				linkedCtxParam: "ctp",
				onUpdate: false
			}
		}
	}).link("#result", {
		person: prson
	});
	var input,
		result = $("#result").text();

	// ................................ Act ..................................
	$.observable(prson).setProperty("title","Sir2");
	result += "\nTITLE: " + $("#result").text();

	$.observable(prson).setProperty("name","Jo2");
	result += "\nNAME: " + $("#result").text();

	$.observable(prson).setProperty("address", {street: "2nd St"});
	result += "\nADDRESS: " + $("#result").text();

	input = $("#result input")[0];
	$(input).val("Mr Bob FullSt").change();
	result += "\nCTP FUNCTION: " + $("#result").text();

	input = $("#result input")[1];
	$(input).val("Mr Bob FullSt").change();
	result += "\nCTP EVALUATED FUNCTION: " + $("#result").text();

	// ............................... Assert .................................
	assert.equal(result, "Title: Sir Name: Jo Street: 1st Ave Full: Sir Jo 1st Ave TAG: Sir Jo 1st Ave TAG2: Sir Jo 1st Ave \n"
	+ "TITLE: Title: Sir2 Name: Jo Street: 1st Ave Full: Sir2 Jo 1st Ave TAG: Sir2 Jo 1st Ave TAG2: Sir2 Jo 1st Ave \n"
	+ "NAME: Title: Sir2 Name: Jo2 Street: 1st Ave Full: Sir2 Jo2 1st Ave TAG: Sir2 Jo2 1st Ave TAG2: Sir2 Jo2 1st Ave \n"
	+ "ADDRESS: Title: Sir2 Name: Jo2 Street: 2nd St Full: Sir2 Jo2 2nd St TAG: Sir2 Jo2 2nd St TAG2: Sir2 Jo2 2nd St \n"
	+ "CTP FUNCTION: Title: Mr Name: Bob Street: FullSt Full: Mr Bob FullSt TAG: Mr Bob FullSt TAG2: Mr Bob FullSt \n"
	+ "CTP EVALUATED FUNCTION: Title: Mr Name: Bob Street: FullSt Full: Mr Bob FullSt TAG: Mr Bob FullSt TAG2: Mr Bob FullSt ",
		"Custom tag control {{fullName ...}} with linkedCtxParam 2-way binding to computed property - either the function itself, or the evaluated function result");

	// =============================== Arrange ===============================
	$.views.templates({
		markup:
			'{^{personname person ~psn2=person/}}' // binding to person
		+ '{{for person}}'
			+ '{^{personname #data ~psn2=#data/}}' // binding to #data as default argument
			+ '{^{personname ~psn2=#data/}}' // binding to #data as default argument
		+ '{{/for}}',
		tags: {
			personname: {
				template: "<input data-link='~psn.name'/><input data-link='~psn2.name'/>",
				linkedCtxParam: "psn"
			}
		}
	}).link("#result", {person:{name: "Jo"}});

	// ................................ Act ..................................
	var getValues = function() {
		result += inputs[0].value + " " + inputs[1].value + " " + inputs[2].value + " " + inputs[3].value + " " + inputs[4].value + " " + inputs[5].value + "\n";
	}
	result = "";
	var inputs = $("#result input");

	getValues();

	$(inputs[0]).val("Jo2").change();

	getValues();

	$(inputs[1]).val("Jo3").change();

	getValues();

	$(inputs[2]).val("Jo4").change();

	getValues();

	$(inputs[3]).val("Jo5").change();

	getValues();

	$(inputs[4]).val("Jo6").change();

	getValues();

	$(inputs[5]).val("Jo7").change();

	getValues();

	// ............................... Assert .................................
	assert.equal(result, "Jo Jo Jo Jo Jo Jo\n"
+ "Jo2 Jo2 Jo2 Jo2 Jo2 Jo2\n"
+ "Jo3 Jo3 Jo3 Jo3 Jo3 Jo3\n"
+ "Jo4 Jo4 Jo4 Jo4 Jo4 Jo4\n"
+ "Jo5 Jo5 Jo5 Jo5 Jo5 Jo5\n"
+ "Jo6 Jo6 Jo6 Jo6 Jo6 Jo6\n"
+ "Jo7 Jo7 Jo7 Jo7 Jo7 Jo7\n",
	"Custom tag control {{personname ...}} using template, with linkedCtxParam and tag contextual parameter, binding to #data, and with 2-way binding to person.name - works correctly");

	// =============================== Arrange ===============================
	$.views.templates({
		markup:
			'{^{textbox path=person/}}'
		+ '<div data-link="{textbox path=person}"></div><br/>'

		+ '{^{textbox2 path=person.name/}}'
		+ '<div data-link="{textbox2 path=person.name}"></div><br/>'

		+ '{^{textbox3 path=person.name/}}'
		+ '<div data-link="{textbox3 path=person.name}"></div>'
		+ '<input data-link="{textbox3 path=person.name}"/><br/>'
		+ '<input data-link="person.name"/><br/>',
		tags: {
			textbox: {
				bindTo: "path",
				linkedCtxParam: "psn",
				template:"<input data-link='~psn.name'/>",
				onUpdate: false
			},
			textbox2: {
				bindTo: "path",
				linkedCtxParam: "nm",
				template:"<input data-link='~nm'/>",
				onUpdate: false
			},
			textbox3: {
				bindTo: "path",
				linkedElement: "input",
				template:"<input/>",
				onUpdate: false
			}
		}
	}).link("#result", {person:{name: "Jo"}});

	// ................................ Act ..................................
	var getValues = function() {
		result += inputs[0].value + " " + inputs[1].value + " " + inputs[2].value + " " + inputs[3].value + " " + inputs[4].value + " " + inputs[5].value + " " + inputs[6].value + " " + inputs[7].value + "\n";
	}
	result = "";
	var inputs = $("#result input");

	getValues();

	$(inputs[0]).val("Jo0").change();

	getValues();

	$(inputs[1]).val("Jo1").change();

	getValues();

	$(inputs[2]).val("Jo2").change();

	getValues();

	$(inputs[3]).val("Jo3").change();

	getValues();

	$(inputs[4]).val("Jo4").change();

	getValues();

	$(inputs[5]).val("Jo5").change();

	getValues();

	$(inputs[6]).val("Jo6").change();

	getValues();

	$(inputs[7]).val("Jo7").change();

	getValues();

	// ............................... Assert .................................
	assert.equal(result, "Jo Jo Jo Jo Jo Jo Jo Jo\n"
+ "Jo0 Jo0 Jo0 Jo0 Jo0 Jo0 Jo0 Jo0\n"
+ "Jo1 Jo1 Jo1 Jo1 Jo1 Jo1 Jo1 Jo1\n"
+ "Jo2 Jo2 Jo2 Jo2 Jo2 Jo2 Jo2 Jo2\n"
+ "Jo3 Jo3 Jo3 Jo3 Jo3 Jo3 Jo3 Jo3\n"
+ "Jo4 Jo4 Jo4 Jo4 Jo4 Jo4 Jo4 Jo4\n"
+ "Jo5 Jo5 Jo5 Jo5 Jo5 Jo5 Jo5 Jo5\n"
+ "Jo6 Jo6 Jo6 Jo6 Jo6 Jo6 Jo6 Jo6\n"
+ "Jo7 Jo7 Jo7 Jo7 Jo7 Jo7 Jo7 Jo7\n",
	"Custom tag control {{texbox ...}} with linkedCtxParam or linkedElement, data-linked as (1) inline tag, (2) data-linked input or (3) data-linked div");

	// =============================== Arrange ===============================
	$.views.templates({
		markup: '{^{textbox path=name edit=editable/}}'
		+ '<div data-link="{textbox path=name edit=editable}"></div>',
		tags: {
			textbox: {
				bindTo: "path",
				linkedCtxParam: "val",
				init: function() {
					this.edit = this.tagCtx.props.edit; // Initialize textbox state
				},
				template:"<input data-link='~tag.edit' type='checkbox'/>"
				+ "{^{if ~tag.edit}}" // observable textbox state
					+ "<input class='edit' data-link='~val'/>"
				+ "{{else}}"
					+ "<span data-link='~val'></span>"
				+ "{{/if}}",
				onUpdate: false
			}
		}
	}).link("#result", {name: "Jo", editable: true});

	// ................................ Act ..................................
	var container = $("#result")[0];
	result = $("input:text", container)[0].value + " " + $("input:text", container)[1].value;

	$("input:text").eq(0).val("Fred").change(); // Modify text

	result += "|" + $("input:text", container)[0].value + " " + $("input:text", container)[1].value;

	var textBoxes = $.view().childTags("textbox"); // Find all the {{textbox}} tags in the view

	for (var i=0; i<textBoxes.length; i++) {
		$.observable(textBoxes[i]).setProperty("edit", !textBoxes[i].edit); // Observably change all textboxes state
	}

	result += "|" + $("span", container).eq(0).text() + " " + $("span", container).eq(1).text();

	$("input:checkbox", container).eq(0).prop("checked", true).change(); // User clicks on checkbox and flips state of this textbox

	result += "|" + $("input:text", container)[0].value + " " + $("span", container).eq(0).text();

	// ............................... Assert .................................
	assert.equal(result, "Jo Jo|Fred Fred|Fred Fred|Fred Fred",
	"Custom editable textbox control {{texbox ...}} with linkedCtxParam. Template linking to observable state, \"~tag.edit\"");

	// =============================== Arrange ===============================
	$.views.templates({
		markup: '{^{textbox path=name edit=editable/}}'
		+ '<div data-link="{textbox path=name edit=editable}"></div>',
		tags: {
			textbox: {
				bindTo: "path",
				linkedCtxParam: "val",
				init: function() {
					this.edit = this.tagCtx.props.edit; // Initialize textbox state
				},
				render: function() {
					this.template = "<input data-link='~tag.edit' type='checkbox'/>"   // Checkbox to toggle edit
					+ (this.edit // not bound, so driven by 'depends'
						? "<input class='edit' data-link='~val'/>"// <input> for editing
						: "<span data-link='~val'></span>");      // <span> for rendering
				},
				depends: function(data) {
					return [this, "edit"]; // depends on textbox state
				}
			}
		}
	}).link("#result", {name: "Jo", editable: true});

	// ................................ Act ..................................
	var container = $("#result")[0];
	result = $("input:text", container)[0].value + " " + $("input:text", container)[1].value;

	$("input:text").eq(0).val("Fred").change(); // Modify text

	result += "|" + $("input:text", container)[0].value + " " + $("input:text", container)[1].value;

	var textBoxes = $.view().childTags("textbox"); // Find all the {{textbox}} tags in the view

	for (var i=0; i<textBoxes.length; i++) {
		$.observable(textBoxes[i]).setProperty("edit", !textBoxes[i].edit); // Observably change all textboxes state
	}

	result += "|" + $("span", container).eq(0).text() + " " + $("span", container).eq(0).text();

	$("input:checkbox", container).eq(0).prop("checked", true).change(); // User clicks on checkbox and flips state of this textbox

	result += "|" + $("input:text", container)[0].value + " " + $("span", container).eq(0).text();

	// ............................... Assert .................................
	assert.equal(result, "Jo Jo|Fred Fred|Fred Fred|Fred Fred",
	"Custom editable textbox control {{texbox ...}} with linkedCtxParam. Render method, and depends to bind to observable state, this.edit");

	// =============================== Arrange ===============================
	var data = {name: "Jo", editable: true};

	$.views.templates({
		markup: '{^{textbox path=name ^edit=editable/}}'
		+ '<div data-link="{textbox path=name ^edit=editable}"></div>',
		tags: {
			textbox: {
				bindTo: "path",
				linkedCtxParam: "val",
				init: function() {
					this.edit = this.tagCtx.props.edit; ; // Initialize textbox state through edit property
				},
				render: function() {
					this.template = "<input data-link='~tag.edit' type='checkbox'/>"   // Checkbox to toggle edit
					+ (this.edit
						? "<input class='edit' data-link='~val'/>" // <input> for editing
						: "<span data-link='~val'></span>");       // <span> for rendering
				},
				onUpdate: function(ev, eventArgs, tagCtxs) {
					this.edit = tagCtxs[0].props.edit; // Respond to changed data-linked edit property.
				},
				onBind: function() {
					$.observe(this, "edit", $.proxy(this.refresh, this));
				},
				onUnbind: function() {
					$.unobserve(this, "edit");
				}
			}
		}
	}).link("#result", data);

	// ................................ Act ..................................
	var container = $("#result")[0];
	result = $("input:text", container)[0].value + " " + $("input:text", container)[1].value;

	$("input:text").eq(0).val("Fred").change(); // Modify text

	result += "|" + $("input:text", container)[0].value + " " + $("input:text", container)[1].value;

	var textBoxes = $.view().childTags("textbox"); // Find all the {{textbox}} tags in the view

	for (var i=0; i<textBoxes.length; i++) {
		$.observable(textBoxes[i]).setProperty("edit", !textBoxes[i].edit); // Observably change all textboxes state
	}

	result += "|" + $("span", container).eq(0).text() + " " + $("span", container).eq(0).text();

	$("input:checkbox", container).eq(0).prop("checked", true).change(); // User clicks on checkbox and flips state of this textbox

	result += "|" + $("input:text", container)[0].value + " " + $("span", container).eq(0).text();

	$.observable(data).setProperty("editable", false); // User clicks on checkbox and flips state of this textbox

	result += "|" + $("span", container).eq(0).text() + " " + $("span", container).eq(1).text();

	// ............................... Assert .................................
	assert.equal(result, "Jo Jo|Fred Fred|Fred Fred|Fred Fred|Fred Fred",
	"Custom editable textbox control {{texbox ...}} with linkedCtxParam. Render method, and programmatic observe state, this.edit");

	// =============================== Arrange ===============================
	var data = 	data = { name: "3.545" };

	$.views.templates({
		markup: '{^{:(+name).toFixed(2)}} {^{dec:name length=5}}',
		converters: {
			dec: function(val) {
				return (+val).toFixed(this.tagCtx.props.length || 2);
			}
		}
	}).link("#result", data);

	// ................................ Act ..................................
	$.observable(data).setProperty("name", "3.745")

	// ............................... Assert .................................
	assert.equal($("#result").text(), "3.75 3.74500",
	"Converter with prop 'length' data-links correctly (no collision with array.length on pathBindings array).");

	// ................................ Reset ..................................
	$("#result").empty();
$.views.settings.trigger(true);
});

QUnit.module("API - Settings");

QUnit.test("Settings, error handlers, onError", function(assert) {
$.views.settings.trigger(false);

	// ................................ Act ..................................
	// Delimiters

	var current = $.views.settings.delimiters();
	$.views.settings.delimiters("@%","%@");
	var res = $.templates("A_@%if true%@yes@%/if%@_B").render()
		+ "|" + $.views.settings.delimiters() + "|" + $.views.sub.settings.delimiters;

	$.views.settings.delimiters("<<",">>", "*");

	res += "|" + $.views.settings.delimiters() + "|" + $.views.sub.settings.delimiters;

	$.views.settings.delimiters(current);

	res += "|" + $.templates("A_{{if true}}YES{{/if}}_B").render()
		+ "|" + $.views.settings.delimiters() + "|" + $.views.sub.settings.delimiters;

	// ............................... Assert .................................
	assert.equal(res, "A_yes_B|@%,%@,^|@%,%@,^|<<,>>,*|<<,>>,*|A_YES_B|{{,}},^|{{,}},^", "Custom delimiters with render()");

	// ................................ Act ..................................
	current = $.views.settings.delimiters();
	var app = {choose: true, name: "Jo"};
	$.views.settings.delimiters("_^", "!@", "(");
	$.templates('_(^if choose!@<div data-link="name"></div>_^else!@no<div data-link="name+2"></div><div data-link="^:name+3!"></div><input data-link="^:name:!"/>_^/if!@').link("#result", app);
	res = $("#result").text();
	$.observable(app).setProperty({choose: false, name: "other"});
	res += "|" + $("#result").text()
		+ "|" + $.views.settings.delimiters() + "|" + $.views.sub.settings.delimiters;

$("#result input").val("new").change();

	res += "|" + $("#result").text();

	$.views.settings.delimiters(current);

	$.templates('{^{if choose}}<div data-link="name"></div>{{else}}NO<div data-link="name+2"></div><div data-link="{:name+3}"></div><input data-link="{:name:}"/>{{/if}}').link("#result", app);
	res += "|" + $("#result").text()
+ "|" + $.views.settings.delimiters() + "|" + $.views.sub.settings.delimiters;

$("#result input").val("NEW").change();

	res += "|" + $("#result").text();

	// ............................... Assert .................................
	assert.equal(res, "Jo|noother2other3|_^,!@,(|_^,!@,(|nonew2new3|NOnew2new3|{{,}},^|{{,}},^|NONEW2NEW3", "Custom delimiters with link()");

	// =============================== Arrange ===============================
		// Debug mode false

	var oldDebugMode = $.views.settings.debugMode();

	app = {choose: true, name: "Jo", onerr: "invalid'Jo'"};
	$.views.settings.debugMode(false);

	// ................................ Act ..................................
	res = $.views.settings.debugMode();
	$("#result").empty();

	try {
		$.templates('{{:missing.willThrow}}X').link("#result", app);
	}
	catch (e) {
		res += " " + !!e.message;
	}

	res += " " + $("#result").text();

	// ............................... Assert .................................
	assert.equal(res, 'false true ',
		'Debug mode false: {{:missing.willThrow}} throws error - with link()');

	// ................................ Act ..................................
	res = $.views.settings.debugMode();

	try {
		$.templates('<div data-link="missing.willThrow">X</div>').link("#result", app);
	}
	catch (e) {
		res += " " + !!e.message;
	}

	res += " " + $("#result").text();

	// ............................... Assert .................................
	assert.equal(res, 'false true X',
		'Debug mode false: - data-link="missing.willThrow" - throws error');

	// ................................ Act ..................................
	// Debug mode true

	$.views.settings.debugMode(true);

	res = $.views.settings.debugMode();

	$.templates('{{:missing.willThrow}}').link("#result", app);

	res += " " + $("#result").text();

	// ............................... Assert .................................
	assert.equal(res.slice(0, 13), 'true {Error: ',
		'Debug mode true: {{:missing.willThrow}} renders error - with link()');

	// ................................ Act ..................................

	res = $.views.settings.debugMode();

	$.templates('<div data-link="missing.willThrow">X</div>').link("#result", app);

	res += " " + $("#result").text();

	// ............................... Assert .................................
	assert.equal(res.slice(0, 13), 'true {Error: ',
		'Debug mode true: - data-link="missing.willThrow" - renders error');

	app = {choose: true, name: "Jo", onerr: "invalid'Jo'"};
	res = "";

	// ................................ Act ..................................
	// Debug mode 'onError' handler function with return value

	$.views.settings.debugMode(function(e, fallback, view) {
			// Can override using $.views.settings({onError: function(...) {...}});
			var data = this;
			return "Override error - " + (fallback||"") + "_" + data.name + " " + (e.message.indexOf("undefined")>-1); // For syntax errors e is a string, and view is undefined
		});

	// ................................ Act ..................................
	$.templates('{{:missing.willThrow}}').link("#result", app);
	res = $("#result").text();

	// ............................... Assert .................................
	assert.equal(res, "Override error - _Jo true",
		"Debug mode 'onError' handler override - with link()");

	// ................................ Act ..................................
	$.templates('{{:missing.willThrow onError=onerr}} {^{if missing.willThrow onError=onerr + \' (in if tag)\'}}inside{{/if}}<span data-link="missing.willThrow onError=onerr + \' (in data-link)\'"></span>').link("#result", app);
	res = $("#result").text();

	// ............................... Assert .................................
	assert.equal(res, "Override error - invalid'Jo'_Jo true Override error - invalid'Jo' (in if tag)_Jo trueOverride error - invalid'Jo' (in data-link)_Jo true",
		"onError fallback in tags and in data-link expression, with debug mode 'onError' handler override");

	// ................................ Act ..................................
	$.templates('{{:missing.willThrow onError=~myErrFn}} {^{if missing.willThrow onError=~myErrFn}}inside{{/if}}<span data-link="missing.willThrow onError=~myErrFn"></span>').link("#result", app, {
		myErrFn: function(e, view) {
			return "myErrFn for <" + this.name + ">";
		}
	});
	res = $("#result").text();

	// ............................... Assert .................................
	assert.equal(res, "Override error - myErrFn for <Jo>_Jo true Override error - myErrFn for <Jo>_Jo trueOverride error - myErrFn for <Jo>_Jo true",
		"onError handler in tags and in data-link expression, with debug mode 'onError' handler override ");

	// ................................ Reset ..................................
	$("#result").empty();
	$.unlink(); // Need to unlink since when throwing above, view registration was incomplete, so calling $("#result").empty() is not sufficient to clean up child views on topView
	$.views.settings.debugMode(oldDebugMode);

$.views.settings.trigger(true);
});

QUnit.module("API - Declarations");

QUnit.test("Template encapsulation", function(assert) {

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
	$.link.myTmpl6("#result", {people: people});

	// ............................... Assert .................................
	assert.equal($("#result").text(), "TwoOne", "Template with tag resource");

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
	assert.equal($("#result").text(), "NoisFooTwoOne", "Can access tag and helper resources from a nested context (i.e. inside {{if}} block)");

	// ............................... Reset .................................
	$("#result").empty();
});

QUnit.module("API - Views");

QUnit.test("$.view() in regular content", function(assert) {

	// =============================== Arrange ===============================
	$.link.tmplHierarchy("#result", topData);

	// ................................ Act ..................................
	var view = $.view("#1");

	// ............................... Assert .................................
	assert.ok(view.ctxPrm("val") === 1 && view.type === "myWrap", '$.view(elem) gets nearest parent view. Custom tag blocks are of type "tmplName"');

	// ................................ Act ..................................
	view = $.view("#1", "root");

	// ............................... Assert .................................
	assert.ok(view.parent.type === "top", '$.view(elem, "root") gets root view (child of top view)');

	// ................................ Act ..................................
	view = $.view("#1", "item");

	// ............................... Assert .................................
	assert.ok(view.type === "item" && view.data.lastName === "One" && view.index === 0, '$.view(elem, "item") gets nearest item view');

	// ................................ Act ..................................
	view = $.view("#1", "data");

	// ............................... Assert .................................
	assert.ok(view.type === "data" && view.data === topData, '$.view(elem, "data") gets nearest data view');

	// ................................ Act ..................................
	view = $.view("#1", "if");

	// ............................... Assert .................................
	assert.ok(view.type === "if" && view.data === people[0], '$.view(elem, "if") gets nearest "if" view');

	// ................................ Act ..................................
	view = $.view("#1", "array");

	// ............................... Assert .................................
	assert.ok(view.type === "array" && view.data === people, '$.view(elem, "array") gets nearest array view');

	// ................................ Act ..................................
	view = $.view("#sp1", "myWrap");

	// ............................... Assert .................................
	assert.ok(view.type === "myWrap" && view.ctx.tag.tagName === "myWrap", '$.view(elem, "mytagName") gets nearest view for content of that tag');

	view = $.view("#sp1");

	// ............................... Assert .................................
	assert.ok(view.type === "if" && view.ctx.tag.tagName === "myWrap2", 'Within {{if}} block, $.view(elem) gets nearest "if" view, but view.ctx.tag is the nearest non-flow tag, i.e. custom tag that does not have flow set to true');

	// ................................ Act ..................................
	view = $.view("#1", true);

	// ............................... Assert .................................
	assert.ok(view.type === "myWrap2", '$.view(elem, true) gets the first nested view. Custom tag blocks are of type "tmplName"');

	// ................................ Act ..................................
	view = $.view("#result", true, "myFlow");

	// ............................... Assert .................................
	assert.ok(view.type === "myFlow", '$.view(elem, true, viewTypeName) gets the first (depth first) nested view of that type');

	// =============================== Arrange ===============================

	var data = [];

	$.templates("").link("#result", data);

	// ................................ Act ..................................
	view = $.view("#result", true);

		var view2 = $.view("#result").get(true);
	// ............................... Assert .................................
	assert.ok(view.data === data && view.type === "array",
		'If elem is a container for a rendered array, and the array is empty, $.view(elem, true) returns the array view (even though the element is empty)');

	// ................................ Act ..................................
	var itemView = $.view("#result", true, "item");

	// ............................... Assert .................................
	assert.ok(!itemView,
		'If elem is a container for a rendered array, and the array is empty, $.view(elem, true, "item") returns nothing');

	// =============================== Arrange ===============================

	data = [1];

	$.templates("").link("#result", data);

	// ................................ Act ..................................
	view = $.view("#result", true);

	// ............................... Assert .................................
	assert.ok(view.data === data && view.type === "array",
		'If elem is a container for a rendered array rendering nothing, and the array is not empty, $.view(elem, true) returns the array view (even though the container element is empty)');

	// ................................ Act ..................................
	itemView = $.view("#result", true, "item");

	// ............................... Assert .................................
	assert.ok(itemView.index === 0,
		'If elem is a container for a rendered array rendering nothing, and the array is not empty, $.view(elem, true, "item") returns the item view (even though the container element is empty)');

	// =============================== Arrange ===============================

	data = {people: []};

	$.templates("<div>{{for people}}{{/for}}</div>").link("#result", data);

	// ................................ Act ..................................
	view = $.view("#result div", true);

	// ............................... Assert .................................
	assert.ok(view.data === data.people && view.type === "array",
		'If elem is a container for a rendered array, and the array is empty, $.view(elem, true) returns the array view (even though the element is empty)');

	// ................................ Act ..................................
	itemView = $.view("#result div", true, "item");

	// ............................... Assert .................................
	assert.ok(!itemView,
		'If elem is a container for a rendered array, and the array is empty, $.view(elem, true, "item") returns nothing');

	// =============================== Arrange ===============================

	data = {people: [1]};

	$.templates("<div>{{for people}}{{/for}}</div>").link("#result", data);

	// ................................ Act ..................................
	view = $.view("#result div", true);

	// ............................... Assert .................................
	assert.ok(view.data === data.people && view.type === "array",
		'If elem is a container for a rendered array rendering nothing, and the array is not empty, $.view(elem, true) returns the array view (even though the container element is empty)');

	// ................................ Act ..................................
	itemView = $.view("#result div", true, "item");

	// ............................... Assert .................................
	assert.ok(itemView.index === 0,
		'If elem is a container for a rendered array rendering nothing, and the array is not empty, $.view(elem, true, "item") returns the item view (even though the container element is empty)');

	// ............................... Reset .................................
	$("#result").empty();
});

QUnit.test("view.get() and view.getIndex() in regular content", function(assert) {

	// =============================== Arrange ===============================
	$.link.tmplHierarchy("#result", topData);

	var view1 = $.view("#1");

	// ................................ Act ..................................
	var view = view1.get();

	// ............................... Assert .................................
	assert.ok(view===view1.parent, 'view.get() gets parent view');

	// ................................ Act ..................................
	view = view1.get("item");

	// ............................... Assert .................................
	assert.ok(view.type === "item" && view.data.lastName === "One" && view.index === 0, 'view.get("item") gets nearest item view');

	// ................................ Act ..................................
	view = view1.get("myWrap");

	// ............................... Assert .................................
	assert.ok(view === view1, 'view.get("viewTypeName") gets nearest viewTypeName view looking at ancestors starting from the view itself');

	// ................................ Act ..................................
	view = view1.get(true, "myWrap");

	// ............................... Assert .................................
	assert.ok(view === view1, 'view.get(true, "viewTypeName") gets nearest viewTypeName view looking at descendants starting from the view itself');

	// ................................ Act ..................................
	view = view1.get(true, "myFlow");

	// ............................... Assert .................................
	assert.ok(view.tmpl.markup === "<span>zz</span>{{if true}}{{myFlow2/}}{{/if}}", 'view.get(true, "viewTypeName") gets nearest viewTypeName view looking at descendants starting from the view itself');

	// ................................ Act ..................................
	view = view1.get(true, "myFlow2");

	// ............................... Assert .................................
	assert.ok(view.tmpl.markup === "flow2", 'view.get(true, "viewTypeName") gets nearest viewTypeName view looking at descendants starting from the view itself');

	// ................................ Act ..................................
	view = view1.get(true);

	// ............................... Assert .................................
	assert.ok(view.type === "myWrap2" && view === view1.get(true, "myWrap2") && view === $.view("#sp0").parent, 'view.get(true) gets nearest child view of any type');

	// ............................... Assert .................................
	assert.ok(view1.get(true, "nonexistent") === undefined, 'view.get(true, "viewTypeName") returns undefined if no descendant of that type, starting from the view itself');

	// ............................... Assert .................................
	assert.ok($.view("#1").getIndex() === 0 && $.view("#1", "item").index === 0 && $.view("#2").getIndex() === 1 && $.view("#2", "item").index === 1, '$.view(elem).getIndex() gets index of nearest item view');

	// ............................... Reset .................................
	$("#result").empty();
});

QUnit.test("view.ctxPrm() tag.ctxPrm()", function(assert) {

	$.views.settings.trigger(false);

	// =============================== Arrange ===============================
	$.views.tags("mytag", {
		bindTo: ["height", "width"],
		linkedElement: [".ht", ".wd"],
		linkedCtxParam: ["ht", "wd"],
		mainElement: "div",
		template: "<div class='mytag'>{{include tmpl=#content/}}</div><br/>",
		setValue: function(val, index, tagElse, ev, eventArgs) {
			if (val === undefined) {
				val = this.getValue(tagElse)[index];
				this.tagCtxs[tagElse].ctxPrm(this.linkedCtxParam[index], val);
			} else {
				this.vals[tagElse][index] = val;
			}
//			return val;
		},
		getValue: function(tagElse) {
			return this.vals[tagElse];
		},
		onUpdate: false,
		setSize: true,
		vals: [[38, 48], [33, 44]]
	});

	// =============================== Arrange ===============================
	var tmpl = $.templates('<input id="1" data-link="~foo" /> {^{:~foo}}');

	tmpl.link("#result", {}, {});

	// ............................... Assert .................................
	assert.ok($.view().ctxPrm("toString") === undefined,
		"ctxPrm() for built-in non-enumerables such as 'toString' returns undefined");

	// ................................ Act ..................................
	var input = $("#1"),
		view1 = input.view(),
		content = $("#result"),
		res = "1: " + (view1.ctxPrm("foo")||"") + "-" + input.val() + ": {" + content.text() + "} ";

	// ................................ Act ..................................
	view1.ctxPrm("foo", "set1");

	res += "|2: " + view1.ctxPrm("foo") + "-" + input.val() + ": {" + content.text() + "} ";

	// ................................ Act ..................................
	input.val("new1");
	input.change();

	res += "|3: " + view1.ctxPrm("foo") + "-" + input.val() + ": {" + content.text() + "} ";

	// ............................... Assert .................................
	assert.equal(res, "1: -: { } |2: set1-set1: { set1} |3: new1-new1: { new1} ",
		"Uninitialized context param can be changed observably by two-way binding or by view.ctxPrm(foo, value) call");

	// ................................ Act ..................................
	tmpl.link("#result", {}, {foo: "instance"});

	input = $("#1");
	view1 = input.view();
	content = $("#result");
	res = "1: " + (view1.ctxPrm("foo")||"") + "-" + input.val() + ": {" + content.text() + "} ";

	// ................................ Act ..................................
	view1.ctxPrm("foo", "set1");

	res += "|2: " + view1.ctxPrm("foo") + "-" + input.val() + ": {" + content.text() + "} ";

	// ................................ Act ..................................
	input.val("new1");
	input.change();

	res += "|3: " + view1.ctxPrm("foo") + "-" + input.val() + ": {" + content.text() + "} ";

	// ............................... Assert .................................
	assert.equal(res, "1: instance-instance: { instance} |2: set1-set1: { set1} |3: new1-new1: { new1} ",
		"Initialized instance context param can be changed observably by two-way binding or by view.ctxPrm(foo, value) call");

	// ................................ Act ..................................
	$.views.helpers("foo", "registered", tmpl);

	tmpl.link("#result", {});

	input = $("#1");
	view1 = input.view();
	content = $("#result");
	res = "1: " + (view1.ctxPrm("foo")||"") + "-" + input.val() + ": {" + content.text() + "} ";

	// ................................ Act ..................................
	view1.ctxPrm("foo", "set1");

	res += "|2: " + view1.ctxPrm("foo") + "-" + input.val() + ": {" + content.text() + "} ";

	// ................................ Act ..................................
	input.val("new1");
	input.change();

	res += "|3: " + view1.ctxPrm("foo") + "-" + input.val() + ": {" + content.text() + "} ";

	// ............................... Assert .................................
	assert.equal(res, "1: registered-registered: { registered} |2: set1-set1: { set1} |3: new1-new1: { new1} ",
		"Initialized registered helper param can be changed observably by two-way binding or by view.ctxPrm(foo, value) call");

	// =============================== Arrange ===============================
	tmpl = $.templates(
			'<input id="1" data-link="~foo"/> Outer: {^{:~foo}}'
		+ '{{if true}}, Inner: {^{:~foo}}'
			+ '{{if true}}, Nested inner: {^{:~foo}}'
			+ '{{/if}}'
		+ '{{/if}}');

	tmpl.link("#result", {});

	input = $("#1");
	view1 = input.view();
	content = $("#result");
	res = "1: " + (view1.ctxPrm("foo")||"") + "-" + input.val() + ": {" + content.text() + "} ";

	// ................................ Act ..................................
	view1.ctxPrm("foo", "set1");

	res += "|2: " + view1.ctxPrm("foo") + "-" + input.val() + ": {" + content.text() + "} ";

	// ................................ Act ..................................
	input.val("new1");
	input.change();

	res += "|3: " + view1.ctxPrm("foo") + "-" + input.val() + ": {" + content.text() + "} ";

	// ............................... Assert .................................
	assert.equal(res, "1: -: { Outer: , Inner: , Nested inner: }"
		+ " |2: set1-set1: { Outer: set1, Inner: set1, Nested inner: set1}"
		+ " |3: new1-new1: { Outer: new1, Inner: new1, Nested inner: new1} ",
		"Observable contextual parameter is scoped to root view (view below top view)");

	// =============================== Arrange ===============================
	tmpl = $.templates(
			'Property: <input class="prp" data-link="~prp"/> {^{:~prp}} | <br/>'
		+ 'Function: <input class="fn" data-link="~fn()"/>{^{:is}} | <br/>'
		+ '{{for items}}'
			+ 'Inner Property: <input class="prpb" data-link="~prp"/> {^{:~prp}} | <br/>'
			+ 'Inner Function: <input class="fnb" data-link="~fn()"/>{^{:is}} | <br/>'
		+ '{{/for}}'
);

	var fn = function() {
		return this.data.is;
	};

	fn.set = function(val) {
		$.observable(this.data).setProperty("is", val);
	}

	tmpl.link("#result", [
			{is:"outer1", items: [{is: "inner11"}, {is:  "inner12"}]},
			{is:"outer2", items: [{is: "inner21"}, {is:  "inner22"}]}
		],
		{prp: "PRP", fn: fn}
	);

	var propInput1 = $(".prp").eq(0);
	var fnInput1 = $(".fn").eq(0);
	var innerPropInput1 = $(".prpb").eq(0);
	var innerFnInput1 = $(".fnb").eq(0);
	var innerFnInput3 = $(".fnb").eq(3);
	content = $("#result");
	res = "1: " + content.text();

	// ................................ Act ..................................
	propInput1.val("prp1"); // first outer propInput
	propInput1.change();
	innerPropInput1.val("prp2"); // first inner propInput
	innerPropInput1.change();
	fnInput1.val("fn1"); // first outer fnInput
	fnInput1.change();
	innerFnInput1.val("fn2"); // first inner fnInput
	innerFnInput1.change();
	innerFnInput3.val("fn3"); // first inner fnInput
	innerFnInput3.change();

	res += "2: " + content.text();

	// ............................... Assert .................................
	assert.equal(res,
	"1: Property:  PRP | Function: outer1 | "
+ "Inner Property:  PRP | Inner Function: inner11 | Inner Property:  PRP | Inner Function: inner12 | "
+ "Property:  PRP | Function: outer2 | "
+ "Inner Property:  PRP | Inner Function: inner21 | Inner Property:  PRP | Inner Function: inner22 | "
+ "2: Property:  prp2 | Function: fn1 | "
+ "Inner Property:  prp2 | Inner Function: fn2 | Inner Property:  prp2 | Inner Function: inner12 | "
+ "Property:  prp2 | Function: outer2 | "
+ "Inner Property:  prp2 | Inner Function: inner21 | Inner Property:  prp2 | Inner Function: fn3 | ",
	"Observable contextual parameter are scoped: for computed function, to calling view, for properties, not functions, to root view (view below top view)");

	// =============================== Arrange ===============================
	tmpl = $.templates('<input class="inp" data-link="~foo"/> {^{:~foo}}');

	tmpl.link("#result", [0, 1]);

	var input1 = $(".inp")[0],
		input2 = $(".inp")[1],
		view2 = $.view(input2);
	view1 = $.view(input1);

	content = $("#result");
	res = "1: View1:" + (view1.ctxPrm("foo")||"") + "-" + input1.value + " View2:" + (view2.ctxPrm("foo")||"") + "-" + input2.value + ": {" + content.text() + "} ";

	// ................................ Act ..................................
	view1.ctxPrm("foo", "set1");
	view2.ctxPrm("foo", "set2");

	res += "|2: View1:" + (view1.ctxPrm("foo")||"") + "-" + input1.value + " View2:" + (view2.ctxPrm("foo")||"") + "-" + input2.value + ": {" + content.text() + "} ";

	// ................................ Act ..................................
	input1.value = "new1";
	$(input1).change();
	input2.value = "new2";
	$(input2).change();

	res += "|3: View1:" + (view1.ctxPrm("foo")||"") + "-" + input1.value + " View2:" + (view2.ctxPrm("foo")||"") + "-" + input2.value + ": {" + content.text() + "} ";

	// ............................... Assert .................................
	assert.equal(res, "1: View1:- View2:-: {  }"
		+ " |2: View1:set2-set2 View2:set2-set2: { set2 set2}"
		+ " |3: View1:new2-new2 View2:new2-new2: { new2 new2} ",
		"Observable contextual parameter is scoped to root view (view below top view) - which is array view, when rendering/linking an array");

	// =============================== Arrange ===============================
	tmpl = $.templates('<input id="1" data-link="~foo"/> Outer: {^{:~foo}}'
		+ '{^{mytag width=cx}}<input id="2" data-link="~foo"/>, Inner: {^{:~foo}}'
			+ '{^{mytag}}<input id="3" data-link="~foo"/>, Nested inner: {^{:~foo}}'
			+ '{{else width=cx}}<input id="4" data-link="~foo"/>, Nested inner: {^{:~foo}}'
			+ '{{/mytag}}'
		+ '{{/mytag}}');

	tmpl.link("#result", {cx: 22});

	var input1 = $("#1"),
		view1 = input1.view(),
		input2 = $("#2"),
		view2 = input2.view(),
		input3 = $("#3"),
		view3 = input3.view(),
		input4 = $("#4"),
		view4 = input4.view();
	content = $("#result");
	res = "1: " + (view1.ctxPrm("foo")||"") + "/" + (view2.ctxPrm("foo")||"") + "/" + (view3.ctxPrm("foo")||"") + "/" + (view4.ctxPrm("foo")||"")
		+ "-" + input1.val() + "/" + input2.val() + "/" + input3.val() + "/" + input4.val() + ": {" + content.text() + "} ";

	// ................................ Act ..................................
	view1.ctxPrm("foo", "set1");
	view2.ctxPrm("foo", "set2");
	view3.ctxPrm("foo", "set3");
	view4.ctxPrm("foo", "set4");

	res += "|2: " + (view1.ctxPrm("foo")||"") + "/" + (view2.ctxPrm("foo")||"") + "/" + (view3.ctxPrm("foo")||"") + "/" + (view4.ctxPrm("foo")||"")
		+ "-" + input1.val() + "/" + input2.val() + "/" + input3.val() + "/" + input4.val() + ": {" + content.text() + "} ";

	// ................................ Act ..................................
	input1.val("new1");
	input1.change();
	input2.val("new2");
	input2.change();
	input3.val("new3");
	input3.change();
	input4.val("new4");
	input4.change();

	res += "|3: " + (view1.ctxPrm("foo")||"") + "/" + (view2.ctxPrm("foo")||"") + "/" + (view3.ctxPrm("foo")||"") + "/" + (view4.ctxPrm("foo")||"")
		+ "-" + input1.val() + "/" + input2.val() + "/" + input3.val() + "/" + input4.val() + ": {" + content.text() + "} ";

	// ............................... Assert .................................
	assert.equal(res, "1: ///-///: { Outer: , Inner: , Nested inner: , Nested inner: }"
		+ " |2: set1/set2/set4/set4-set1/set2/set4/set4: { Outer: set1, Inner: set2, Nested inner: set4, Nested inner: set4}"
		+ " |3: new1/new2/new4/new4-new1/new2/new4/new4: { Outer: new1, Inner: new2, Nested inner: new4, Nested inner: new4} ",
		"Observable contextual parameter within linked tag is scoped to tag view, - closest non flow tag ancestor, shared across else blocks");
	// ................................ Act ..................................

	var innerTag = $.view().childTags(true, "mytag")[1];

	res = "|1: " + (innerTag.ctxPrm("foo")||"");

	innerTag.ctxPrm("foo", "tagFoo");
	innerTag.ctxPrm("newPrm", "tagNewPrm");

	res += " |2: " + (innerTag.ctxPrm("foo")||"") + "-" + (innerTag.ctxPrm("newPrm")||"")
		+ "-" + (view1.ctxPrm("newPrm")||"") + "/" + (view2.ctxPrm("newPrm")||"") + "/" + (view3.ctxPrm("newPrm")||"") + "/" + (view4.ctxPrm("newPrm")||"")
		+ "-" + (view1.ctxPrm("foo")||"") + "/" + (view2.ctxPrm("foo")||"") + "/" + (view3.ctxPrm("foo")||"") + "/" + (view4.ctxPrm("foo")||"")
		+ "-" + input1.val() + "/" + input2.val() + "/" + input3.val() + "/" + input4.val() + ": {" + content.text() + "} ";

	// ............................... Assert .................................
	assert.equal(res, "|1: new4"
		+ " |2: tagFoo-tagNewPrm-//tagNewPrm/tagNewPrm-new1/new2/tagFoo/tagFoo-new1/new2/tagFoo/tagFoo: { Outer: new1, Inner: new2, Nested inner: tagFoo, Nested inner: tagFoo} ",
		"tag.ctxPrm() gets/sets parameter scoped to tag view, shared across else blocks");

	// ............................... Assert .................................

	assert.equal(innerTag.tagCtxs[0].nodes().length + "|" + innerTag.tagCtxs[1].nodes().length + "|" + innerTag.nodes().length
		+ "-" + innerTag.tagCtxs[0].contents(true, "input").length + "|" + innerTag.tagCtxs[1].contents(true, "input").length + "|" + innerTag.contents(true, "input").length,
		"2|2|4-1|1|2",
		"Multiple else blocks: tag.nodes() and tag.content() return content from all else blocks");

	// =============================== Arrange ===============================
	tmpl = $.templates('<input id="1" data-link="~foo"/> Outer: {^{:~foo}}'
		+ '{{mytag width=cx}}<input id="2" data-link="~foo"/>, Inner: {^{:~foo}}'
			+ '{{mytag}}<input id="3" data-link="~foo"/>, Nested inner: {^{:~foo}}'
			+ '{{else width=cx}}<input id="4" data-link="~foo"/>, Nested inner: {^{:~foo}}'
			+ '{{/mytag}}'
		+ '{{/mytag}}');

	tmpl.link("#result", {cx: 22});

	var input1 = $("#1"),
		view1 = input1.view(),
		input2 = $("#2"),
		view2 = input2.view(),
		input3 = $("#3"),
		view3 = input3.view(),
		input4 = $("#4"),
		view4 = input4.view();
	content = $("#result");
	res = "1: " + (view1.ctxPrm("foo")||"") + "/" + (view2.ctxPrm("foo")||"") + "/" + (view3.ctxPrm("foo")||"") + "/" + (view4.ctxPrm("foo")||"")
		+ "-" + input1.val() + "/" + input2.val() + "/" + input3.val() + "/" + input4.val() + ": {" + content.text() + "} ";

	// ................................ Act ..................................
	view1.ctxPrm("foo", "set1");
	view2.ctxPrm("foo", "set2");
	view3.ctxPrm("foo", "set3");
	view4.ctxPrm("foo", "set4");

	res += "|2: " + (view1.ctxPrm("foo")||"") + "/" + (view2.ctxPrm("foo")||"") + "/" + (view3.ctxPrm("foo")||"") + "/" + (view4.ctxPrm("foo")||"")
		+ "-" + input1.val() + "/" + input2.val() + "/" + input3.val() + "/" + input4.val() + ": {" + content.text() + "} ";

	// ................................ Act ..................................
	input1.val("new1");
	input1.change();
	input2.val("new2");
	input2.change();
	input3.val("new3");
	input3.change();
	input4.val("new4");
	input4.change();

	res += "|3: " + (view1.ctxPrm("foo")||"") + "/" + (view2.ctxPrm("foo")||"") + "/" + (view3.ctxPrm("foo")||"") + "/" + (view4.ctxPrm("foo")||"")
		+ "-" + input1.val() + "/" + input2.val() + "/" + input3.val() + "/" + input4.val() + ": {" + content.text() + "} ";

	// ............................... Assert .................................
	assert.equal(res, "1: ///-///: { Outer: , Inner: , Nested inner: , Nested inner: }"
		+ " |2: set1/set2/set4/set4-set1/set2/set4/set4: { Outer: set1, Inner: set2, Nested inner: set4, Nested inner: set4}"
		+ " |3: new1/new2/new4/new4-new1/new2/new4/new4: { Outer: new1, Inner: new2, Nested inner: new4, Nested inner: new4} ",
		"Observable contextual parameter within unlinked tag is scoped to tag view, - closest non flow tag ancestor, shared across else blocks");

	// =============================== Arrange ===============================
	$.views.tags.mytag.vals = [[38, 48], [33, 44]];

	tmpl = $.templates('<input id="1" data-link="~wd"/> Outer: {^{:~wd}}'
		+ '{^{mytag width=11}}<input id="2" data-link="~wd"/>, Inner: {^{:~wd}}'
			+ '{^{mytag}}<input id="3" data-link="~wd"/>, Nested inner: {^{:~wd}}'
			+ '{{else width=cx}}<input id="4" data-link="~wd"/>, Nested inner: {^{:~wd}}'
			+ '{{/mytag}}'
		+ '{{/mytag}}');

	tmpl.link("#result", {cx: 22});

	var input1 = $("#1"),
		view1 = input1.view(),
		input2 = $("#2"),
		view2 = input2.view(),
		input3 = $("#3"),
		view3 = input3.view(),
		input4 = $("#4"),
		view4 = input4.view();
	content = $("#result");
	res = "1: " + (view1.ctxPrm("wd")||"") + "/" + (view2.ctxPrm("wd")||"") + "/" + (view3.ctxPrm("wd")||"") + "/" + (view4.ctxPrm("wd")||"")
		+ "-" + input1.val() + "/" + input2.val() + "/" + input3.val() + "/" + input4.val() + ": {" + content.text() + "} ";

	// ................................ Act ..................................
	view1.ctxPrm("wd", "set1");
	view2.ctxPrm("wd", "set2");
	view3.ctxPrm("wd", "set3");
	view4.ctxPrm("wd", "set4");

	res += "|2: " + (view1.ctxPrm("wd")||"") + "/" + (view2.ctxPrm("wd")||"") + "/" + (view3.ctxPrm("wd")||"") + "/" + (view4.ctxPrm("wd")||"")
		+ "-" + input1.val() + "/" + input2.val() + "/" + input3.val() + "/" + input4.val() + ": {" + content.text() + "} ";

	// ................................ Act ..................................
	input1.val("new1");
	input1.change();
	input2.val("new2");
	input2.change();
	input3.val("new3");
	input3.change();
	input4.val("new4");
	input4.change();

	res += "|3: " + (view1.ctxPrm("wd")||"") + "/" + (view2.ctxPrm("wd")||"") + "/" + (view3.ctxPrm("wd")||"") + "/" + (view4.ctxPrm("wd")||"")
		+ "-" + input1.val() + "/" + input2.val() + "/" + input3.val() + "/" + input4.val() + ": {" + content.text() + "} ";

	// ............................... Assert .................................

	assert.equal(res, "1: /11/48/22-/11/48/22: { Outer: , Inner: 11, Nested inner: 48, Nested inner: 22}"
		+ " |2: set1/set2/set3/set4-set1/set2/set3/set4: { Outer: set1, Inner: set2, Nested inner: set3, Nested inner: set4}"
		+ " |3: new1/new2/new3/new4-new1/new2/new3/new4: { Outer: new1, Inner: new2, Nested inner: new3, Nested inner: new4} ",
		"Observable tag contextual parameter within linked tag is scoped to tag view, - closest non flow tag ancestor, not shared across else blocks");

	// =============================== Arrange ===============================
	tmpl = $.templates('<input id="1" data-link="~wd"/> Outer: {^{:~wd}}'
		+ '{{mytag width=11}}<input id="2" data-link="~wd"/>, Inner: {^{:~wd}}'
			+ '{{mytag}}<input id="3" data-link="~wd"/>, Nested inner: {^{:~wd}}'
			+ '{{else width=cx}}<input id="4" data-link="~wd"/>, Nested inner: {^{:~wd}}'
			+ '{{/mytag}}'
		+ '{{/mytag}}');

	tmpl.link("#result", {cx: 22});

	var input1 = $("#1"),
		view1 = input1.view(),
		input2 = $("#2"),
		view2 = input2.view(),
		input3 = $("#3"),
		view3 = input3.view(),
		input4 = $("#4"),
		view4 = input4.view();
	content = $("#result");
	res = "1: " + (view1.ctxPrm("wd")||"") + "/" + (view2.ctxPrm("wd")||"") + "/" + (view3.ctxPrm("wd")||"") + "/" + (view4.ctxPrm("wd")||"")
		+ "-" + input1.val() + "/" + input2.val() + "/" + input3.val() + "/" + input4.val() + ": {" + content.text() + "} ";

	// ................................ Act ..................................
	view1.ctxPrm("wd", "set1");
	view2.ctxPrm("wd", "set2");
	view3.ctxPrm("wd", "set3");
	view4.ctxPrm("wd", "set4");

	res += "\n|2: " + (view1.ctxPrm("wd")||"") + "/" + (view2.ctxPrm("wd")||"") + "/" + (view3.ctxPrm("wd")||"") + "/" + (view4.ctxPrm("wd")||"")
		+ "-" + input1.val() + "/" + input2.val() + "/" + input3.val() + "/" + input4.val() + ": {" + content.text() + "} ";

	// ................................ Act ..................................
	input1.val("new1");
	input1.change();
	input2.val("new2");
	input2.change();
	input3.val("new3");
	input3.change();
	input4.val("new4");
	input4.change();

	res += "\n|3: " + (view1.ctxPrm("wd")||"") + "/" + (view2.ctxPrm("wd")||"") + "/" + (view3.ctxPrm("wd")||"") + "/" + (view4.ctxPrm("wd")||"")
		+ "-" + input1.val() + "/" + input2.val() + "/" + input3.val() + "/" + input4.val() + ": {" + content.text() + "} ";

	// ............................... Assert .................................
	assert.equal(res, "1: /11//22-/11//22: { Outer: , Inner: 11, Nested inner: , Nested inner: 22}"
		+ " \n|2: set1/set2/set3/set4-set1/set2/set3/set4: { Outer: set1, Inner: set2, Nested inner: set3, Nested inner: set4}"
		+ " \n|3: new1/new2/new3/new4-new1/new2/new3/new4: { Outer: new1, Inner: new2, Nested inner: new3, Nested inner: new4} ",
		"Observable tag contextual parameter within unlinked tag is scoped to tag view, - closest non flow tag ancestor, not shared across else blocks");

	// =============================== Arrange ===============================
	tmpl = $.templates({
		markup: 'OUTER<input id="outer{{:#index}}" data-link="~foo"/>{^{:~foo}}{^{namebox/}}',
		tags: {
			namebox: {
				template: 'INNER<input id="inner{{:#getIndex()}}" data-link="~foo"/>{^{:~foo}}'
			}
		}
	});

	tmpl.link("#result", [1,2]);

	var inputOuter0 = $("#outer0"),
		inputOuter1 = $("#outer1"),
		inputInner0 = $("#inner0"),
		inputInner1 = $("#inner1");

	// ................................ Act ..................................
	inputInner0.val("inner0!");
	inputInner0.change();
	inputOuter1.val("outer1!");
	inputOuter1.change();

	var res = $("#result").text() + "%" +  inputOuter0.val() + "|" +  inputOuter1.val() + "|" +  inputInner0.val() + "|" +  inputInner1.val();

	// ............................... Assert .................................
	assert.equal(res, "OUTERouter1!INNERinner0!OUTERouter1!INNER%outer1!|outer1!|inner0!|",
		"When contextual parameter not initialized at higher level, it is scoped to nearest tag container, or to root view (view below top view)");

	// =============================== Arrange ===============================
	tmpl = $.templates({
		markup: 'OUTERMOST{^{:~foo}} {^{include ~foo="wrapper!"}}OUTER<input id="outer{{:#getIndex()}}" data-link="~foo"/>{^{:~foo}}{^{namebox/}}{{/include}}',
		// With {{include ~foo=...}} wrapper
		tags: {
			namebox: {
				template: 'INNER<input id="inner{{:#getIndex()}}" data-link="~foo"/>{^{:~foo}}'
			}
		}
	});

	tmpl.link("#result", [1,2]);

	inputOuter0 = $("#outer0");
	inputOuter1 = $("#outer1");
	inputInner0 = $("#inner0");
	inputInner1 = $("#inner1");

	res = $("#result").text() + "--" +  inputOuter0.val() + "|" +  inputOuter1.val() + "|" +  inputInner0.val() + "|" +  inputInner1.val();

	// ............................... Assert .................................
	assert.equal(res, "OUTERMOST OUTERwrapper!INNERwrapper!OUTERMOST OUTERwrapper!INNERwrapper!--wrapper!|wrapper!|wrapper!|wrapper!",
		"When contextual parameter is initialized at higher level, it is initialized to that level");

	// ................................ Act ..................................
	inputInner0.val("inner0!");
	inputInner0.change();
	inputOuter1.val("outer1!");
	inputOuter1.change();

	res = $("#result").text() + "%" +  inputOuter0.val() + "|" +  inputOuter1.val() + "|" +  inputInner0.val() + "|" +  inputInner1.val();

	// ............................... Assert .................................
	assert.equal(res, "OUTERMOST OUTERinner0!INNERinner0!OUTERMOST OUTERouter1!INNERouter1!%inner0!|outer1!|inner0!|outer1!",
		"When contextual parameter is initialized at higher level, it is scoped to that level");

	// =============================== Arrange ===============================
	tmpl = $.templates({
		markup: 'OUTER<input id="outer{{:#index}}" data-link="~foo"/>{^{:~foo}}{^{namebox/}}',
		tags: {
			namebox: {
				template: 'INNER<input id="inner{{:#getIndex()}}" data-link="~foo"/>{^{:~foo}}',
			}
		},
		helpers: {foo: "helperInit!"} // Global helper
	});

	tmpl.link("#result", [1,2]);

	inputOuter0 = $("#outer0");
	inputOuter1 = $("#outer1");
	inputInner0 = $("#inner0");
	inputInner1 = $("#inner1");

	// ................................ Act ..................................
	inputInner0.val("inner0!");
	inputInner0.change();
	inputOuter1.val("outer1!");
	inputOuter1.change();

	res = $("#result").text() + "%" +  inputOuter0.val() + "|" +  inputOuter1.val() + "|" +  inputInner0.val() + "|" +  inputInner1.val();

	// ............................... Assert .................................
	assert.equal(res, "OUTERouter1!INNERouter1!OUTERouter1!INNERouter1!%outer1!|outer1!|outer1!|outer1!",
		"When contextual parameter is initialized as global helper, it is scoped to root view (view below top view)");

	// =============================== Arrange ===============================
	tmpl = $.templates({
		markup: 'OUTER<input id="outer{{:#index}}" data-link="~foo"/>{^{:~foo}}{^{namebox/}}',
		tags: {
			namebox: {
				template: 'INNER<input id="inner{{:#getIndex()}}" data-link="~foo"/>{^{:~foo}}'
			}
		}
	});

	tmpl.link("#result", [1,2], {foo: "instanceHelperInit!"}); // Instance helper

	inputOuter0 = $("#outer0");
	inputOuter1 = $("#outer1");
	inputInner0 = $("#inner0");
	inputInner1 = $("#inner1");

	// ................................ Act ..................................
	inputInner0.val("inner0!");
	inputInner0.change();
	inputOuter1.val("outer1!");
	inputOuter1.change();

	res = $("#result").text() + "%" +  inputOuter0.val() + "|" +  inputOuter1.val() + "|" +  inputInner0.val() + "|" +  inputInner1.val();

	// ............................... Assert .................................
	assert.equal(res, "OUTERouter1!INNERouter1!OUTERouter1!INNERouter1!%outer1!|outer1!|outer1!|outer1!",
		"When contextual parameter is initialized as instance helper, it is scoped to root view (view below top view)");

	// =============================== Arrange ===============================
	tmpl = $.templates({
		markup: 'OUTER<input id="outer{{:#index}}" data-link="~foo"/>{^{:~foo}}{^{namebox/}}',
		tags: {
			namebox: {
				template: 'INNER{{:~foo}}' // Needs refreshing to show ~foo updates, since {{:~foo}} rather than data-linked {^{:~foo}}
			}
		},
		helpers: {foo: "helperInit!"} // Global helper
	});

	tmpl.link("#result", [1,2]);

	inputOuter0 = $("#outer0");
	inputOuter1 = $("#outer1");

	// ................................ Act ..................................
	inputOuter1.val("inner1!");
	inputOuter1.change();

	res = $("#result").text() + "%" +  inputOuter0.val() + "|" +  inputOuter1.val();

	// ............................... Assert .................................
	assert.equal(res, "OUTERinner1!INNERhelperInit!OUTERinner1!INNERhelperInit!%inner1!|inner1!",
		"When tag needs to be refreshed, if no depends on tag, will not refresh values of ~foo ");

	// =============================== Arrange ===============================
	tmpl = $.templates({
		markup: 'OUTER<input id="outer{{:#index}}" data-link="~foo"/>{^{:~foo}}{^{namebox/}}',
		tags: {
			namebox: {
				template: 'INNER{{:~foo}}', // Needs refreshing to show ~foo updates, since {{:~foo}} rather than data-linked {^{:~foo}}
				depends: "~foo" // Depends path to ~foo will force refresh when ~foo changes
			}
		},
		helpers: {foo: "helperInit!"} // Global helper
	});

	tmpl.link("#result", [1,2]);

	inputOuter0 = $("#outer0");
	inputOuter1 = $("#outer1");

	// ................................ Act ..................................
	inputOuter1.val("inner1!");
	inputOuter1.change();

	res = $("#result").text() + "%" +  inputOuter0.val() + "|" +  inputOuter1.val();

	// ............................... Assert .................................
	assert.equal(res, "OUTERinner1!INNERinner1!OUTERinner1!INNERinner1!%inner1!|inner1!",
		"When tag needs to be refreshed, if depends='~foo' on tag, will refresh values of ~foo ");

// =============================== Arrange ===============================
	tmpl = $.templates('<input id="a{{:#index+1}}" data-link="~foo"/> {^{:~foo}}');

	tmpl.link("#result", [1,2], {foo: "val1"});

	input1 = $("#a1");
	view1 = input1.view();
	input2 = $("#a2");
	view2 = input2.view();
	content = $("#result");

	res = "1: " + (view1.ctxPrm("foo")||"") + "/" + (view2.ctxPrm("foo")||"")
	+ "-" + input1.val() + "/" + input2.val() + ": {" + content.text() + "} ";

	// ................................ Act ..................................
	input1.val("new1");
	input1.change();

	res += "\n2: " + (view1.ctxPrm("foo")||"") + "/" + (view2.ctxPrm("foo")||"")
	+ "-" + input1.val() + "/" + input2.val() + ": {" + content.text() + "} ";

	// ................................ Act ..................................
	view2.ctxPrm("foo", "set2");

	res += "\n3: " + (view1.ctxPrm("foo")||"") + "/" + (view2.ctxPrm("foo")||"")
	+ "-" + input1.val() + "/" + input2.val() + ": {" + content.text() + "} ";

	// ................................ Act ..................................
	// Replace and verify context params are scoped within "#result", so re-initialized
	tmpl.link("#result", [1,2], {foo: "val2"});

	input1 = $("#a1");
	view1 = input1.view();
	input2 = $("#a2");
	view2 = input2.view();

	res += "\n4: " + (view1.ctxPrm("foo")||"") + "/" + (view2.ctxPrm("foo")||"")
	+ "-" + input1.val() + "/" + input2.val() + ": {" + content.text() + "} ";

	// ................................ Act ..................................
	view1.ctxPrm("foo", "set3");

	res += "\n5: " + (view1.ctxPrm("foo")||"") + "/" + (view2.ctxPrm("foo")||"")
	+ "-" + input1.val() + "/" + input2.val() + ": {" + content.text() + "} ";

	// ................................ Act ..................................
	input2.val("new3");
	input2.change();

	res += "\n6: " + (view1.ctxPrm("foo")||"") + "/" + (view2.ctxPrm("foo")||"")
	+ "-" + input1.val() + "/" + input2.val() + ": {" + content.text() + "} ";

	// ............................... Assert .................................
	assert.equal(res, "1: val1/val1-val1/val1: { val1 val1}"
		+ " \n2: new1/new1-new1/new1: { new1 new1}"
		+ " \n3: set2/set2-set2/set2: { set2 set2}"
		+ " \n4: val2/val2-val2/val2: { val2 val2}"
		+ " \n5: set3/set3-set3/set3: { set3 set3}"
		+ " \n6: new3/new3-new3/new3: { new3 new3} ",
		"link() will initialize contextual parameters, which are scoped to the newly linked view - so re-initialize on relinking");

	// =============================== Arrange ===============================
	var outerTmpl = $.templates('<input id="outer" data-link="~foo"/> {^{:~foo}} <div id="main"></div>');

	outerTmpl.link("#result", {}, {foo: "outer"});
	content = $("#result");

	var inputOuter = $("#outer");
	var viewOuter = inputOuter.view();

	res = "1: " + (viewOuter.ctxPrm("foo")||"")
	+ "-" + inputOuter.val() + ": {" + content.text() + "} ";

	// ................................ Act ..................................
	// Link to "#main" within linked templated content, and ensure context params are scoped within "#main", independent
	// of context params in outer views under "#result"
	tmpl = $.templates('<input id="a{{:#index+1}}" data-link="~foo"/> {^{:~foo}}');
	tmpl.link("#main", [1,2], {foo: "val1"});

	input1 = $("#a1");
	view1 = input1.view();
	input2 = $("#a2");
	view2 = input2.view();

	res += "\n2: " + (viewOuter.ctxPrm("foo")||"") + "/" + (view1.ctxPrm("foo")||"") + "/" + (view2.ctxPrm("foo")||"")
	+ "-" + inputOuter.val() + "/" + input1.val() + "/" + input2.val() + ": {" + content.text() + "} ";

	// ................................ Act ..................................
	viewOuter.ctxPrm("foo", "newouter");
	view1.ctxPrm("foo", "new1");
	input2.val("new2");
	input2.change();

	res += "\n3: " + (viewOuter.ctxPrm("foo")||"") + "/" + (view1.ctxPrm("foo")||"") + "/" + (view2.ctxPrm("foo")||"")
	+ "-" + inputOuter.val() + "/" + input1.val() + "/" + input2.val() + ": {" + content.text() + "} ";

	// ................................ Act ..................................
	// Link to "#main" within linked templated content, and ensure context params are scoped within "#main", independent
	// of context params in outer views under "#result"
	tmpl.link("#main", [1,2], {foo: "val2"});

	input1 = $("#a1");
	view1 = input1.view();
	input2 = $("#a2");
	view2 = input2.view();

	res += "\n4: " + (viewOuter.ctxPrm("foo")||"") + "/" + (view1.ctxPrm("foo")||"") + "/" + (view2.ctxPrm("foo")||"")
	+ "-" + inputOuter.val() + "/" + input1.val() + "/" + input2.val() + ": {" + content.text() + "} ";

	// ............................... Assert .................................
	assert.equal(res, "1: outer-outer: { outer }"
		+ " \n2: outer/val1/val1-outer/val1/val1: { outer  val1 val1}"
		+ " \n3: newouter/new2/new2-newouter/new2/new2: { newouter  new2 new2}"
		+ " \n4: newouter/val2/val2-newouter/val2/val2: { newouter  val2 val2} ",
		"link() will initialize contextual parameters, scoped to the newly linked view (within target container), even when the target container is within data-linked content");

	// =============================== Arrange ===============================
	tmpl = $.templates('{^{:~nm}} {^{:nm}} {^{:~fnprop()}} {^{:fnprop()}} {^{:~fullName()}} {^{:fullName()}} <span id="it"></span>');

	function fn1() {return "FN1"}
	function fn2() {return "FN2"}

	function fullNameVM() {
		return this.nm + $.view("#it").ctxPrm("nm") + "Last";
	}

	fullNameVM.depends = ["nm", "~nm"];

	fullNameVM.set = function(val) {
		$.observable(this).setProperty("nm", val.slice(0, -4));
	};

	function fullNameCtx() {
		return this.data.nm + this.ctxPrm("nm") + "Last";
	}

	fullNameCtx.depends = ["nm", "~nm"];

	fullNameCtx.set = function(val) {
		this.ctxPrm("nm", val.slice(0, -4));
	};

	var data = {
		nm: "Jo",
		fullName: fullNameVM,
		fnprop: fn1
	},
	ctx = {
		nm: "Bob",
		fullName: fullNameCtx,
		fnprop: fn1
	};

	tmpl.link("#result", data, ctx);

	// ................................ Act ..................................
	var message = "";

	function changeHandler(ev, eventArgs) {
		message += eventArgs.path + "(" + (eventArgs.ctxPrm||"") + "):" + eventArgs.value;
	}

	$.observe(data, "nm", changeHandler);
	$.observe(data, "fullName", changeHandler);
	$.observe($.view("#it"), "~nm", changeHandler);
	$.observe($.view("#it"), "~fullName", changeHandler);

	$.view("#it").ctxPrm("nm", "NewCtxProp"); // Get this to work for triggering computed function helper change
	$.observable(data).setProperty("nm", "NewVmProp");
	$.view("#it").ctxPrm("fnprop", fn2); // Get this to work for triggering computed function helper change
	$.observable(data).setProperty("fnprop", fn2);
	$.view("#it").ctxPrm("fullName", "NewCtxFullname"); // Get this to work for triggering computed function helper change
	$.observable(data).setProperty("fullName", "NewVmFullname");

	// ............................... Assert .................................
	assert.equal($("#result").text(), "NewCtxFull NewVmFull FN2 FN2 NewVmFullNewCtxFullLast NewVmFullNewCtxFullLast ",
		"Observe computed with both data and contextual parameters as depends paths");

	// ............................... Assert .................................
	assert.equal(message, "_ocp(nm):NewCtxPropnm():NewVmProp_ocp(nm):NewCtxFull_ocp(fullName):NewVmPropNewCtxFullLastnm():NewVmFullfullName():NewVmFullNewCtxFullLast",
		"Observe listener registered for props and computed props, and ctxPrm listener registered for contextual parameters and computed contextual parameters. Trigger correctly.");

	// =============================== Arrange ===============================
	tmpl = $.templates('{^{:~nm}} {^{:nm}} {^{:~fnprop()}} {^{:fnprop()}} {^{:~fullName()}} {^{:fullName()}} <span id="it"></span>');

	function fullNameHlp() {
		return this.data.nm + this.ctxPrm("nm") + "Last";
	}

	fullNameHlp.depends = ["nm", "~nm"];

	fullNameHlp.set = function(val) {
		this.ctxPrm("nm", val.slice(0, -4));
	};

	$.views.helpers({
		nm: "Jim",
		fnprop: fn1,
		fullName: fullNameHlp
	});

	data = {
		nm: "Jo",
		fullName: fullNameVM,
		fnprop: fn1
	};

	tmpl.link("#result", data);

	// ................................ Act ..................................
	var message = "";

	$.observe(data, "nm", changeHandler);
	$.observe(data, "fullName", changeHandler);
	$.observe($.view("#it"), "~nm", changeHandler);
	$.observe($.view("#it"), "~fullName", changeHandler);

	$.view("#it").ctxPrm("nm", "NewCtxProp"); // Get this to work for triggering computed function helper change
	$.observable(data).setProperty("nm", "NewVmProp");
	$.view("#it").ctxPrm("fnprop", fn2); // Get this to work for triggering computed function helper change
	$.observable(data).setProperty("fnprop", fn2);
	$.view("#it").ctxPrm("fullName", "NewCtxFullname"); // Get this to work for triggering computed function helper change
	$.observable(data).setProperty("fullName", "NewVmFullname");

	// ............................... Assert .................................
	var fnctions = fullNameHlp === $.views.helpers.fullName && fn1 === $.views.helpers.fnprop; // Make sure helper function have not been replaced by ctxPrm() call
	assert.equal(fnctions + $("#result").text(), "trueNewCtxFull NewVmFull FN2 FN2 NewVmFullNewCtxFullLast NewVmFullNewCtxFullLast ",
		"Observe registered computed helper with both data and contextual parameters as depends paths");

	// ............................... Assert .................................
	assert.equal(message, "_ocp(nm):NewCtxPropnm():NewVmProp_ocp(nm):NewCtxFull_ocp(fullName):NewVmPropNewCtxFullLastnm():NewVmFullfullName():NewVmFullNewCtxFullLast",
		"Observe listener registered for props and computed props, and ctxPrm listener registered for contextual parameters and computed contextual parameters. Trigger  correctly.");
	// ................................ Act ..................................

	// =============================== Arrange ===============================

	$("#result").empty();

	$.views.helpers({
		nm: null,
		fnprop: null,
		fullName: null
	});

	tmpl = $.templates('{^{:~nm}} {^{:nm}} {^{:~fnprop()}} {^{:fnprop()}} {^{:~fullName()}} {^{:fullName()}} <span id="it"></span>');

	$.views.helpers({
		nm: "Jim",
		fnprop: fn1,
		fullName: fullNameHlp
	}, tmpl); // local to tmpl

	data = {
		nm: "Jo",
		fullName: fullNameVM,
		fnprop: fn1
	};

	tmpl.link("#result", data);

	// ................................ Act ..................................
	var message = "";

	$.observe(data, "nm", changeHandler);
	$.observe(data, "fullName", changeHandler);
	$.observe($.view("#it"), "~nm", changeHandler);
	$.observe($.view("#it"), "~fullName", changeHandler);

	$.view("#it").ctxPrm("nm", "NewCtxProp"); // Get this to work for triggering computed function helper change
	$.observable(data).setProperty("nm", "NewVmProp");
	$.view("#it").ctxPrm("fnprop", fn2); // Get this to work for triggering computed function helper change
	$.observable(data).setProperty("fnprop", fn2);
	$.view("#it").ctxPrm("fullName", "NewCtxFullname"); // Get this to work for triggering computed function helper change
	$.observable(data).setProperty("fullName", "NewVmFullname");

	// ............................... Assert .................................
	fnctions = fullNameHlp === tmpl.helpers.fullName && fn1 === tmpl.helpers.fnprop; // Make sure helper function have not been replaced by ctxPrm() call
	assert.equal(fnctions + $("#result").text(), "trueNewCtxFull NewVmFull FN2 FN2 NewVmFullNewCtxFullLast NewVmFullNewCtxFullLast ",
		"Observe registered computed helper, local to template, with both data and registered helper contextual parameters as depends paths");

	// ............................... Assert .................................
	assert.equal(message, "_ocp(nm):NewCtxPropnm():NewVmProp_ocp(nm):NewCtxFull_ocp(fullName):NewVmPropNewCtxFullLastnm():NewVmFullfullName():NewVmFullNewCtxFullLast",
		"Observe listener registered for props and computed props, and ctxPrm listener registered for contextual parameters and computed contextual parameters. Trigger  correctly.");
	// ................................ Act ..................................

	message = "";
	res = "";

	function listeners() {
		res += $._data(data).events.propertyChange.length
			+ $._data($.view("#it")._ocps.nm[0]).events.propertyChange.length
			+ $._data($.view("#it")._ocps.fullName[0]).events.propertyChange.length + "|";
	}

	listeners();
	$.unobserve(data, "nm", changeHandler);
	listeners();
	$.unobserve(data, "fullName", changeHandler);
	listeners();
	$.unobserve($.view("#it"), "~nm", changeHandler);
	listeners();
	$.unobserve($.view("#it"), "~fullName", changeHandler);
	listeners();

	$.view("#it").ctxPrm("nm", "AddCtxProp"); // Get this to work for triggering computed function helper change
	$.observable(data).setProperty("nm", "AddVmProp");
	$.view("#it").ctxPrm("fnprop", fn1); // Get this to work for triggering computed function helper change
	$.observable(data).setProperty("fnprop", fn1);
	$.view("#it").ctxPrm("fullName", "AddCtxFullname"); // Get this to work for triggering computed function helper change
	$.observable(data).setProperty("fullName", "AddVmFullname");

	// ............................... Assert .................................
	assert.equal(message === "" && res, "14|13|11|10|9|",
		"Unobserve programmatic APIs for data and for contextual parameters works correctly. Event handlers removed, and no longer triggered");

	// ............................... Assert .................................
	assert.equal($("#result").text(), "AddCtxFull AddVmFull FN1 FN1 AddVmFullAddCtxFullLast AddVmFullAddCtxFullLast ",
		"After removing programmatically attached handlers for data and for contextual parameters, declarative UI handlers work correctly");

	// ............................... Reset .................................
	$("#result").empty();
});

QUnit.test("$.view() in element-only content", function(assert) {

	// =============================== Arrange ===============================
	$.link.tmplHierarchyElCnt("#result", topData);

	// ................................ Act ..................................
	var view = $.view("#tr1");

	// ............................... Assert .................................
	assert.ok(view.ctxPrm("val") === 1 && view.type === "myWrapElCnt", 'Within element-only content, $.view(elem) gets nearest parent view. Custom tag blocks are of type "tmplName"');

	// ................................ Act ..................................
	view = $.view("#tr1", "root");

	// ............................... Assert .................................
	assert.ok(view.parent.type === "top", '$.view(elem, "root") gets root view (child of top view)');

	// ................................ Act ..................................
	view = $.view("#tr1", "item");

	// ............................... Assert .................................
	assert.ok(view.type === "item" && view.data.lastName === "One" && view.index === 0, 'Within element-only content, $.view(elem, "item") gets nearest item view');

	// ................................ Act ..................................
	view = $.view("#sp1", "item");

	// ............................... Assert .................................
	assert.ok(view.type === "item" && view.data.lastName === "One" && view.index === 0, '$.view(elem, "item") gets nearest item view, up through both elCnt and regular content views');

	// ................................ Act ..................................
	view = $.view("#tr1", "data");

	// ............................... Assert .................................
	assert.ok(view.type === "data" && view.data === topData, 'Within element-only content, $.view(elem, "data") gets nearest data view');

	// ................................ Act ..................................
	view = $.view("#tr1", "if");

	// ............................... Assert .................................
	assert.ok(view.type === "if" && view.data === people[0], 'Within element-only content, $.view(elem, "if") gets nearest "if" view');

	// ................................ Act ..................................
	view = $.view("#tr1", "array");

	// ............................... Assert .................................
	assert.ok(view.type === "array" && view.data === people, 'Within element-only content, $.view(elem, "array") gets nearest array view');

	// ................................ Act ..................................
	view = $.view("#sp1", "myWrapElCnt");

	// ............................... Assert .................................
	assert.ok(view.type === "myWrapElCnt" && view.ctx.tag.tagName === "myWrapElCnt", 'Within element-only content, $.view(elem, "mytagName") gets nearest view for content of that tag');

	// ................................ Act ..................................
	view = $.view("#td1");

	// ............................... Assert .................................
	assert.ok(view.type === "if" && view.ctx.tag.tagName === "myWrapElCnt", 'Within {{if}} block, $.view(elem) gets nearest "if" view, but view.ctx.tag is the nearest non-flow tag, i.e. custom tag that does not have flow set to true');

	// ................................ Act ..................................
	view = $.view("#spInFlow1");

	// ............................... Assert .................................
	assert.ok(view.type === "myFlowElCnt" && view.ctx.tag.tagName === "myWrapElCnt", 'Within {{myFlow}} block, for a flow tag, $.view(elem) gets nearest "myFlow" view, but view.ctx.tag is the nearest non-flow tag');

	// ................................ Act ..................................
	view = $.view("#tr1", true);

	// ............................... Assert .................................
	assert.ok(view.type === "myWrap2ElCnt", 'Within element-only content, $.view(elem, true) gets the first nested view. Custom tag blocks are of type "tmplName"');

	// ................................ Act ..................................
	view = $.view("#tr1", true, "myFlowElCnt");

	// ............................... Assert .................................
	assert.ok(view.type === "myFlowElCnt", 'Within element-only content, $.view(elem, true, "mytagName") gets the first (depth first) nested view of that type');

	// ................................ Act ..................................
	view = $.view("#tr1").get(true);

	// ............................... Assert .................................
	assert.ok(view.type === "myWrap2ElCnt", 'Within element-only content, view.get(true) gets the first nested view. Custom tag blocks are of type "tmplName"');

	// ................................ Act ..................................
	view = $.view("#tr1").get(true, "myFlowElCnt");

	// ............................... Assert .................................
	assert.ok(view.type === "myFlowElCnt", 'Within element-only content, view.get(true, "mytagName") gets the first (depth first) nested view of that type');

	// ................................ Act ..................................
	view = $.view("#tr1");

	// ............................... Assert .................................
	assert.ok(view.type === "myWrapElCnt" && view === view.get("myWrapElCnt"), 'view.get("viewTypeName") gets nearest viewTypeName view looking at ancestors starting from the view itself');

	// ............................... Assert .................................
	assert.ok(view === view.get(true, "myWrapElCnt"), 'view.get(true, "viewTypeName") gets nearest viewTypeName view looking at descendants starting from the view itself');

	// ................................ Act ..................................
	view = $.view("#tr1").get(true, "myFlowElCnt");

	// ............................... Assert .................................
	assert.ok(view.tmpl.markup === "xx<span id=\"spInFlow{{:#getIndex()+1}}\"></span>{{if true}}{{myFlow2/}}{{/if}}", 'view.get(true, "viewTypeName") gets nearest viewTypeName view looking at descendants starting from the view itself');

	// ................................ Act ..................................
	view = $.view("#tr1").get(true, "myFlow2");

	// ............................... Assert .................................
	assert.ok(view.tmpl.markup === "flow2", 'view.get(true, "viewTypeName") gets nearest viewTypeName view looking at descendants starting from the view itself');

	// ............................... Assert .................................
	assert.ok($.view("#tr1").get(true, "nonexistent") === undefined, 'view.get(true, "viewTypeName") returns undefined if no descendant of that type, starting from the view itself');

	// =============================== Arrange ===============================

	var data = [];

	$("#result").html("<ul></ul>");

	$.templates("").link("#result ul", data);

	// ................................ Act ..................................
	view = $.view("#result ul", true);

	// ............................... Assert .................................
	assert.ok(view.data === data && view.type === "array",
		'If elem is a container for a rendered array, and the array is empty, $.view(elem, true) returns the array view (even though the element is empty)');

	// ................................ Act ..................................
	var itemView = $.view("#result ul", true, "item");

	// ............................... Assert .................................
	assert.ok(!itemView,
		'If elem is a container for a rendered array, and the array is empty, $.view(elem, true, "item") returns nothing');

	// =============================== Arrange ===============================

	data = [1];

	$("#result").html("<ul></ul>");

	$.templates("").link("#result ul", data);

	// ................................ Act ..................................
	view = $.view("#result ul", true);

	// ............................... Assert .................................
	assert.ok(view.data === data && view.type === "array",
		'If elem is a container for a rendered array rendering nothing, and the array is not empty, $.view(elem, true) returns the array view (even though the container element is empty)');

	// ................................ Act ..................................
	itemView = $.view("#result ul", true, "item");

	// ............................... Assert .................................
	assert.ok(itemView.index === 0,
		'If elem is a container for a rendered array rendering nothing, and the array is not empty, $.view(elem, true, "item") returns the item view (even though the container element is empty)');

	// =============================== Arrange ===============================

	data = {people: []};

	$.templates("<ul>{{for people}}{{/for}}</ul>").link("#result", data);

	// ................................ Act ..................................
	view = $.view("#result ul", true);

	// ............................... Assert .................................
	assert.ok(view.data === data.people && view.type === "array",
		'If elem is a container for a rendered array, and the array is empty, $.view(elem, true) returns the array view (even though the element is empty)');

	// ................................ Act ..................................
	itemView = $.view("#result ul", true, "item");

	// ............................... Assert .................................
	assert.ok(!itemView,
		'If elem is a container for a rendered array, and the array is empty, $.view(elem, true, "item") returns nothing');

	// =============================== Arrange ===============================

	data = {people: [1]};

	$.templates("<ul>{{for people}}{{/for}}</ul>").link("#result", data);

	// ................................ Act ..................................
	view = $.view("#result ul", true);

	// ............................... Assert .................................
	assert.ok(view.data === data.people && view.type === "array",
		'If elem is a container for a rendered array rendering nothing, and the array is not empty, $.view(elem, true) returns the array view (even though the container element is empty)');

	// ................................ Act ..................................
	itemView = $.view("#result ul", true, "item");

	// ............................... Assert .................................
	assert.ok(itemView.index === 0,
		'If elem is a container for a rendered array rendering nothing, and the array is not empty, $.view(elem, true, "item") returns the item view (even though the container element is empty)');

	// ............................... Reset .................................
	$("#result").empty();
});

QUnit.test("view.get() and view.getIndex() in element-only content", function(assert) {

	// =============================== Arrange ===============================
	$.link.tmplHierarchyElCnt("#result", topData);

	var view1 = $.view("#tr1");

	// ................................ Act ..................................
	var view = view1.get();

	// ............................... Assert .................................
	assert.ok(view === view1.parent, 'In element-only content, view.get() gets parent view');

	// ................................ Act ..................................
	view = view1.get("item");

	// ............................... Assert .................................
	assert.ok(view.type === "item" && view.data.lastName === "One" && view.index === 0, 'In element-only content, view.get("item") gets nearest item view');

	// ................................ Act ..................................
	view = view1.get("myWrapElCnt");

	// ............................... Assert .................................
	assert.ok(view.ctxPrm("val") === 1 && view.type === "myWrapElCnt", 'In element-only content, view.get("viewTypeName") gets nearest viewTypeName view - even if is the nearest view');

	// ............................... Assert .................................
	assert.ok($.view("#tr1").getIndex() === 0 && $.view("#tr1", "item").index === 0 && $.view("#tr2").getIndex() === 1 && $.view("#tr2", "item").index === 1,
		'$.view(elem).getIndex() gets index of nearest item view, up through elCnt views');

	// ............................... Assert .................................
	assert.ok($.view("#sp1").getIndex() === 0 && $.view("#sp1", "item").index === 0 && $.view("#sp2").getIndex() === 1 && $.view("#sp2", "item").index === 1,
		'$.view(elem).getIndex() gets index of nearest item view, up through both elCnt and regular content views');

	// ............................... Reset .................................
	$("#result").empty();
});

QUnit.module("API - Tag Controls");

QUnit.test("Wrapping", function(assert) {
	// =============================== Arrange ===============================
	$.templates({
			markup: '{{mytag}}{{:name}}{{/mytag}}'
		+ '<div data-link="{mytag tmpl=\'{{:name}}\'}"></div>',
			tags: {
				mytag: {
					render: function(val) {
						return "DefaultArg:" + this.tagCtx.args[0].name + "TMPL:" + this.tagCtx.render(val) + "CNT:" + this.tagCtx.content.render(val);
					}
				}
			}
		}).link("#result", {name: "Jo"});

	// ............................... Assert .................................
	assert.equal($("#result").text(),
			"DefaultArg:JoTMPL:JoCNT:Jo"
		+ "DefaultArg:JoTMPL:JoCNT:Jo",
		"If tag has no template, tagCtx.render() and tagCtx.content.render() both render content. arg[0] defaults to current data context.");

	// =============================== Arrange ===============================
	$.templates({
			markup: '{{mytag}}{{:name}}{{/mytag}}'
		+ '<div data-link="{mytag tmpl=\'{{:name}}\'}"></div>',
			tags: {
				mytag: {
					render: function(val) {
						return "TMPL:" + this.tagCtx.render(val) + "CNT:" + this.tagCtx.content.render(val);
					},
					template: "1{{include tmpl=#content/}} 2{{include tmpl=~tagCtx.content/}} 3{{:~tagCtx.args[0].name}} "
				}
			}
		}).link("#result", {name: "Jo"});

	// ............................... Assert .................................
	assert.equal($("#result").text(),
			"TMPL:1Jo 2Jo 3Jo CNT:Jo"
		+ "TMPL:1Jo 2Jo 3Jo CNT:Jo",
		"If tag has a template, tagCtx.render() renders template and tagCtx.content.render() renders content");

	// =============================== Arrange ===============================
	$.templates({
			markup: '{{mytag}}a{{:name}}{{else #data}}b{{:name}}{{/mytag}}'
		+ '<div data-link="{mytag tmpl=\'a{{:name}}\'}{else #data tmpl=\'b{{:name}}\'}"></div>',
			tags: {
				mytag: {
					render: function(val) {
						return "TMPL:" + this.tagCtx.render(val) + "CNT:" + this.tagCtx.content.render(val);
					},
					template: "1{{include tmpl=#content/}} 2{{include tmpl=~tagCtx.content/}} 3{{:~tagCtx.args[0].name}}{{:~tagCtx.index}} "
				}
			}
		}).link("#result", {name: "Jo"});

	// ............................... Assert .................................
	assert.equal($("#result").text(),

			"TMPL:1aJo 2aJo 3Jo0 CNT:aJo"
		+ "TMPL:1bJo 2bJo 3Jo1 CNT:bJo"
		+ "TMPL:1aJo 2aJo 3Jo0 CNT:aJo"
		+ "TMPL:1bJo 2bJo 3Jo1 CNT:bJo",
		"If tag has a template, tagCtx.render() renders template and tagCtx.content.render() renders content - also for else blocks");

	// =============================== Arrange ===============================
	$.templates({
			markup: '{{mytag}}{{:name}}{{/mytag}}'
				+ '<div data-link="{mytag tmpl=\'{{:name}}\'}"></div>',
			tags: {
				mytag: {
					render: function(val) {
						var val = this.tagCtx.view.data;
						return "DefaultArg:" + !!this.tagCtx.args[0] + "TMPL:" + this.tagCtx.render(val) + "CNT:" + this.tagCtx.content.render(val);
					},
					init: function() {
						this.argDefault = false;
					}
				}
			}
		}).link("#result", {name: "Jo"});

	// ............................... Assert .................................
	assert.equal($("#result").text(),
			"DefaultArg:falseTMPL:JoCNT:Jo"
		+ "DefaultArg:falseTMPL:JoCNT:Jo",
		"If argDefault is false, arg[0] does not default to current data context. But can programmatically pass in data to tagCtx.render() or tagCtx.content.render()");

	// ............................... Reset .................................
	$("#result").empty();
});

QUnit.test("view.childTags() and tag.childTags()", function(assert) {

	// =============================== Arrange ===============================
	$.link.boundTmplHierarchy("#result", topData);

	var tags,
		view1 = $.view("#result", true, "item");

	// ................................ Act ..................................

	tags = view1.childTags();

	// ............................... Assert .................................
	assert.ok(tags.length === 4
		&& tags[0].tagName === "myWrap" && tags[0].tagCtx.props.val === 1 && tags[0].tagCtx.view.getIndex() === 0 &&
		tags[1].tagName === "myWrap" && tags[1].tagCtx.props.val === 2 && tags[1].tagCtx.view.getIndex() === 0 &&
		tags[2].tagName === "mySimpleWrap" &&
		tags[3].tagName === "myWrap2",
		'view.childTags() returns top-level bound tags within the view, and skips any unbound tags');

	// ................................ Act ..................................
	tags = view1.childTags(true);

	// ............................... Assert .................................
	assert.ok(tags.length === 8
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
	assert.ok(tags.length === 2 && tags[0].tagName === "myWrap" && tags[1].tagName === "myWrap" && tags[0].tagCtx.props.val === 1 && tags[0].tagCtx.view.getIndex() === 0,
		'view.childTags("mytagName") returns all top-level tags of the given name within the view - in document order');

	// ................................ Act ..................................
	tags = view1.childTags(true, "myWrap2");

	// ............................... Assert .................................
	assert.ok(tags.length === 4
		&& tags[0].tagName === "myWrap2"
		&& tags[1].tagName === "myWrap2"
		&& tags[2].tagName === "myWrap2"
		&& tags[3].tagName === "myWrap2"
		&& tags[0].tagCtx.view.getIndex() === 0,
		'view.childTags(true, "mytagName") returns all tags of the given name within the view - in document order');

	// ................................ Act ..................................
	tags = view1.childTags("myWrap2");

	// ............................... Assert .................................
	assert.ok(tags.length === 1
		&& tags[0].tagName === "myWrap2",
		'view.childTags(true, "mytagName") returns all tags of the given name within the view - in document order');

	// ................................ Act ..................................
	tags = view1.get(true, "myWrap").childTags(); // Get first myWrap view and look for its top-level child tags

	// ............................... Assert .................................
	assert.ok(tags.length === 2 && tags[0].tagName === "myWrap2" && tags[1].tagName === "myWrap2" && tags[1].tagCtx.view.getIndex() === 0,
		'tag.childTags() returns top-level bound child tags, and skips any unbound tags');

	// ................................ Act ..................................
	tags = view1.get(true, "myWrap").childTags(true); // Get first myWrap view and look for descendant tags

	// ............................... Assert .................................
	assert.ok(tags.length === 2 && tags[0].tagName === "myWrap2" && tags[1].tagName === "myWrap2",
		'tag.childTags(true) returns descendant tags, and skips any unbound tags');

	// ................................ Act ..................................
	tags = view1.childTags("myWrap")[0].childTags(); // Get first myWrap tag and look for its top-level child tags

	// ............................... Assert .................................
	assert.ok(tags.length === 2 && tags[0].tagName === "myWrap2" && tags[1].tagName === "myWrap2" && tags[1].tagCtx.view.getIndex() === 0,
		'tag.childTags() returns top-level bound child tags, and skips any unbound tags');

	// ................................ Act ..................................
	tags = view1.childTags("myWrap")[0].childTags(true); // Get first myWrap tag and look for descendant tags

	// ............................... Assert .................................
	assert.ok(tags.length === 2 && tags[0].tagName === "myWrap2" && tags[1].tagName === "myWrap2",
		'tag.childTags(true) returns descendant tags, and skips any unbound tags');

	// ............................... Reset .................................
	$("#result").empty();
});

QUnit.test("view.childTags() in element-only content", function(assert) {

	// =============================== Arrange ===============================
	$.link.boundTmplHierarchyElCnt("#result", topData);

	var tags,
		view1 = $.view("#result", true, "item");

	// ................................ Act ..................................
	tags = view1.childTags();

	// ............................... Assert .................................
	assert.ok(tags.length === 4 && tags[0].tagName === "myWrapElCnt" && tags[0].tagCtx.props.val === 1 && tags[0].tagCtx.view.getIndex() === 0
		&& tags[1].tagName === "myWrapElCnt" && tags[1].tagCtx.props.val === 2 && tags[1].tagCtx.view.getIndex() === 0
		&& tags[2].tagName === "mySimpleWrap" && tags[2].tagCtx.props.val === 5 && tags[2].tagCtx.view.getIndex() === 0,
		'In element-only content, view.childTags() returns top-level bound non-flow tags within the view, and skips any unbound tags');

	// ................................ Act ..................................
	tags = view1.childTags(true);

	// ............................... Assert .................................
	assert.ok(tags.length === 9
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
	assert.ok(tags.length === 2 && tags[0].tagName === "myWrapElCnt" && tags[1].tagName === "myWrapElCnt" && tags[0].tagCtx.props.val === 1 && tags[0].tagCtx.view.getIndex() === 0,
		'In element-only content, view.childTags("mytagName") returns all top-level bound tags of the given name within the view - in document order');

	// ................................ Act ..................................
	tags = view1.childTags(true, "myWrap2ElCnt");

	// ............................... Assert .................................
	assert.ok(tags.length === 3
		&& tags[0].tagName === "myWrap2ElCnt"
		&& tags[1].tagName === "myWrap2ElCnt"
		&& tags[1].tagName === "myWrap2ElCnt"
		&& tags[0].tagCtx.view.getIndex() === 0,
		'In element-only content, view.childTags(true, "mytagName") returns all bound tags of the given name within the view - in document order');

	// ................................ Act ..................................
	tags = view1.childTags(true, "myFlow");

	// ............................... Assert .................................
	assert.ok(tags.length === 2
		&& tags[0].tagName === "myFlow"
		&& tags[1].tagName === "myFlow"
		&& tags[1].tagCtx.view.getIndex() === 0,
		'In element-only content, view.childTags(true, "myFlow") for a flow tag returns all bound tags of the given name within the view - in document order');

	// ................................ Act ..................................
	tags = view1.childTags(true, "if");

	// ............................... Assert .................................
	assert.ok(tags.length === 1
		&& tags[0].tagName === "if"
		&& tags[0].tagCtx.view.getIndex() === 0,
		'In element-only content, view.childTags(true, "if") for a flow tag ("if" in this case) returns all bound tags of the given name within the view - in document order');

	// ................................ Act ..................................
	tags = view1.childTags("myWrap2ElCnt");

	// ............................... Assert .................................
	assert.ok(tags.length === 1, 'In element-only content, view.childTags("mytagName") returns all top-level tags of the given name within the view - in document order');

	// ................................ Act ..................................
	tags = view1.get(true, "myWrapElCnt").childTags(); // Get first myWrapElCnt view and look for its top-level child tags

	// ............................... Assert .................................
	assert.ok(tags.length === 2 && tags[0].tagName === "myWrap2ElCnt" && tags[1].tagName === "myWrap2ElCnt" && tags[1].tagCtx.view.getIndex() === 0,
		'view.childTags() returns top-level bound child tags, and skips any unbound tags');

	// ................................ Act ..................................
	tags = view1.get(true, "myWrapElCnt").childTags(true); // Get first myWrapElCnt view and look for descendant tags

	// ............................... Assert .................................
	assert.ok(tags.length === 3 && tags[0].tagName === "myWrap2ElCnt" && tags[1].tagName === "mySimpleWrap" && tags[2].tagName === "myWrap2ElCnt",
		'view.childTags(true) returns descendant tags, and skips any unbound tags');

	// ................................ Act ..................................
	tags = view1.childTags("myWrapElCnt")[0].childTags(); // Get first myWrapElCnt tag and look for its top-level child tags

	// ............................... Assert .................................
	assert.ok(tags.length === 2 && tags[0].tagName === "myWrap2ElCnt" && tags[1].tagName === "myWrap2ElCnt" && tags[1].tagCtx.view.getIndex() === 0,
		'tag.childTags() returns top-level bound child tags, and skips any unbound tags');

	// ................................ Act ..................................
	tags = view1.childTags("myWrapElCnt")[0].childTags(true); // Get first myWrapElCnt tag and look for descendant tags

	// ............................... Assert .................................
	assert.ok(tags.length === 3 && tags[0].tagName === "myWrap2ElCnt" && tags[1].tagName === "mySimpleWrap" && tags[2].tagName === "myWrap2ElCnt",
		'tag.childTags(true) returns descendant tags, and skips any unbound tags');

	// ................................ Act ..................................
	tags = view1.childTags("mySimpleWrap")[0].childTags(); // Get first mySimpleWrap tag and look for its top-level child tags

	// ............................... Assert .................................
	assert.ok(tags.length === 1 && tags[0].tagName === "mySimpleWrap",
		'tag.childTags() returns top-level bound child tags, and skips any unbound tags');

	// ................................ Act ..................................
	tags = view1.childTags("mySimpleWrap")[0].childTags(true); // Get first mySimpleWrap tag and look for descendant tags

	// ............................... Assert .................................
	assert.ok(tags.length === 2 && tags[0].tagName === "mySimpleWrap" && tags[1].tagName === "myWrap2",
		'tag.childTags(true) returns descendant tags, and skips any unbound tags');

	// ................................ Act ..................................
	tags = view1.childTags("mySimpleWrap")[0].childTags(true, "myWrap2"); // Get first mySimpleWrap tag and look for descendant tags of type "myWrap2"

	// ............................... Assert .................................
	assert.ok(tags.length === 1 && tags[0].tagName === "myWrap2",
		'tag.childTags(true, "mytagName") returns descendant tags of chosen name, and skips any unbound tags');

	// =============================== Arrange ===============================
	$.templates("<table><tbody>{^{for row}}<tr>{^{mySimpleWrap/}}</tr>{{/for}}</tbody></table>").link("#result", {row: {}});

	// ................................ Act ..................................
	var tag = $("#result tr").view().childTags()[0];

	// ............................... Assert .................................
	assert.ok(tag.tagName === "mySimpleWrap",
		'childTags() correctly finds tag which has no output and renders within element contet, inside another tag also in element content');

	// ............................... Reset .................................
	$("#result").empty();
});

QUnit.test("view.childTags() in element-only content, using data-link", function(assert) {

	// =============================== Arrange ===============================
	$.link.boundTmplHierarchyElCntWithDataLink("#result", person1);

	var tags,
		view1 = $.view("#result", true);
	// ................................ Act ..................................
	tags = view1.childTags();

	// ............................... Assert .................................
	assert.ok(tags.length === 1 && tags[0].tagName === "myWrapElCnt" && tags[0].tagCtx.props.val === 1,
		'In element-only content, view.childTags() returns top-level bound tags within the view, and skips any unbound tags');

	// ................................ Act ..................................
	tags = view1.childTags(true);

	// ............................... Assert .................................
	assert.ok(tags.length === 2 && tags[0].tagName === "myWrapElCnt" && tags[1].tagName === "myWrap2ElCnt" && tags[0].tagCtx.props.val === 1,
		'In element-only content, view.childTags(true) returns all tags within the view - in document order');

	// ................................ Act ..................................
	tags = view1.childTags("myWrapElCnt");

	// ............................... Assert .................................
	assert.ok(tags.length === 1 && tags[0].tagName === "myWrapElCnt" && view1.childTags("inexistantTag").length === 0,
		'In element-only content, view.childTags("mytagName") returns all top-level tags of the given name within the view - in document order');

	// ................................ Act ..................................
	tags = view1.childTags(true, "myWrap2ElCnt");

	// ............................... Assert .................................
	assert.ok(tags.length === 1 && tags[0].tagName === "myWrap2ElCnt",
		'In element-only content, view.childTags(true, "mytagName") returns all tags of the given name within the view - in document order');

	// ................................ Act ..................................
	tags = view1.childTags("myWrap2ElCnt");

	// ............................... Assert .................................
	assert.ok(tags.length === 0, 'In element-only content, view.childTags(true, "mytagName") returns all tags of the given name within the view - in document order');

	// ............................... Reset .................................
	$("#result").empty();
});

QUnit.test("lateRender - for deferred API calls", function(assert) {

	// =============================== Arrange ===============================

	// ................................ Act ..................................
	$.templates({
		markup:
// These calls are before the targeted instance, so need lateRender=true (or any other value than false)
'<div data-link="{for #get(true, \'mytag\').tag.value tmpl=\'showVal\' lateRender=true}"></div>' +
'<div data-link="{for #childTags(\'mytag\')[0].value tmpl=\'showVal\' lateRender=true}"></div>' +
'/<div data-link="#childTags(\'mytag\')[0].value lateRender=true"></div>' +
'{^{for #get(true, \'mytag\').tag.value tmpl=\'showVal\' lateRender=true/}}' +
'{^{for #childTags(\'mytag\')[0].value tmpl=\'showVal\' lateRender=true/}}' +
'/{^{:#childTags(\'mytag\')[0].value lateRender=true}}' +

// This is the targeted instance
'=<div data-link="{mytag}"></div>' +

// These calls are after the targeted instance, so don't need lateRender=true
'<div data-link="{for #get(true, \'mytag\').tag.value tmpl=\'showVal\'}"></div>' +
'<div data-link="{for #childTags(\'mytag\')[0].value tmpl=\'showVal\'}"></div>' +
'/<div data-link="#childTags(\'mytag\')[0].value"></div>' +
// But these following tags still need lateRender=true, so the rendering is also deferred to after linking has been completed
'{^{for #get(true, \'mytag\').tag.value tmpl=\'showVal\' lateRender=true/}}' +
'{^{for #childTags(\'mytag\')[0].value tmpl=\'showVal\' lateRender=true/}}' +
'/{^{:#childTags(\'mytag\')[0].value lateRender=true}}' +
'/{^{mylaterendertag \'mytag\'/}}' +
'/{^{mylaterendertag \'mytag\' lateRender=false/}}',
		tags: {
			mytag: {
					template: 'MyTag',
					value: 'tagVal'
			},
			mylaterendertag: {
				render: function() {
					return this.tagCtx.view.childTags(this.tagCtx.args[0]) .length;
				},
				lateRender: 1 // This will render late, unless lateRender=false on the instance markup
			}
		},
		templates: {
			showVal: '-{{:}}'
		}
	}).link("#result", {});

	// ............................... Assert .................................
	assert.equal($("#result").text(), "-tagVal-tagVal/tagVal-tagVal-tagVal/tagVal=MyTag-tagVal-tagVal/tagVal-tagVal-tagVal/tagVal/1/0",
	"When using APIs such as #childTags() and #get() within binding expressions, to return tag instances, use lateRender=true to defer the API call until linking is complete" );

	// ................................ Act ..................................
	$.templates({
		markup:
// These calls are before the targeted instance, so need lateRender=true
'<div data-link="{for #childTags(\'mytag\')[0].value tmpl=\'showVal\' lateRender=0}"></div>' +
'/<div data-link="#childTags(\'mytag\')[0].value lateRender=\'\'"></div>' +
'{^{for #get(true, \'mytag\').tag.value tmpl=\'showVal\' lateRender=undefined/}}' +
'{^{for #childTags(\'mytag\')[0].value tmpl=\'showVal\' lateRender=null/}}' +

// This is the targeted instance
'={^{mytag/}}',
		tags: {
			mytag: {
					template: 'MyTag',
					value: 'tagVal'
			}
		},
		templates: {
			showVal: '-{{:}}'
		}
	}).link("#result", {});

	// ............................... Assert .................................
	assert.equal($("#result").text(), "-tagVal/tagVal-tagVal-tagVal=MyTag",
	"When using APIs such as #childTags() and #get() within binding expressions, to return tag instances, use lateRender=xxx (any value xxx other than false or undefined) to defer the API call until linking is complete" );

	// ................................ Act ..................................
var myTmpl = $.templates({
		markup:
// These calls are before the targeted instance, so need lateRender=true
'<div data-link="{for #childTags(\'mytag\')[0].value tmpl=\'showVal\' lateRender=false}"></div>' +

// This is the targeted instance
'={^{mytag/}}',
		tags: {
			mytag: {
					template: 'MyTag',
					value: 'tagVal'
			}
		},
		templates: {
			showVal: '-{{:}}'
		}
	});

var haserror;
try {
	myTmpl.link("#result", {});
} catch(e) {
	haserror = !!e;
}
	// ............................... Assert .................................
	assert.ok(haserror,
	"When using APIs such as #childTags() within binding expressions, using lateRender=false does not defer the API call" );

	// ................................ Reset ................................
	$("#result").empty();

});

QUnit.test("this= and @some.path", function(assert) {
	$.views.settings.trigger(false);

	// =============================== Arrange ===============================

	// ................................ Act ..................................
	$.templates({
		markup:
'<input id="inp1" data-link="@~o1.tagCtx.props.p" />' +
'BEFORE:{^{:@~o1.tagCtx.props.p}}' +
'<span data-link="@~o1.tagCtx.props.p"></span>' +

'TAGS:<span data-link="{if this=~o1 ^p=@~o2.tagCtx.props.n n=\'one \' tmpl=\'D\'}"></span>' +
'{^{if this=~o2 ^p=@~o3.tagCtx.props.n n="two "}}B{{/if}}' +
'{^{if this=~o3 ^p=@~o1.tagCtx.props.n n="three "}}C{{/if}}' +

'AFTER:{^{:@~o1.tagCtx.props.p}}' +
'<span data-link="@~o1.tagCtx.props.p"></span>' +
'<input id="inp2" data-link="@~o1.tagCtx.props.p" />',
		tags: {
			out: {
				template: "OUT:{^{:~tagCtx.props.p}}",
				onUpdate: false,
			}
		}
	}).link("#result", {});

	// ............................... Assert .................................
	assert.equal($("#result").text(),
"BEFORE:two two TAGS:DBCAFTER:two two ",
	"Declarative this=ref binding on built-in flow tag and late path @ref... works correctly");

	// ................................ Act ..................................
	$.templates({
		markup:
'<input id="inp1" data-link="@~o1.tagCtx.props.p" />' +
'BEFORE:{^{:@~o1.tagCtx.props.p}}' +
'<span data-link="@~o1.tagCtx.props.p"></span>' +

'TAGS:<span data-link="{out this=~o1 ^p=@~o2.tagCtx.props.n n=\'one \'}"></span>' +
'{^{out this=~o2 ^p=@~o3.tagCtx.props.n n="two "/}}' +
'{^{out this=~o3 ^p=@~o1.tagCtx.props.n n="three "/}}' +

'AFTER:{^{:@~o1.tagCtx.props.p}}' +
'<span data-link="@~o1.tagCtx.props.p"></span>' +
'<input id="inp2" data-link="@~o1.tagCtx.props.p" />',
		tags: {
			out: {
				template: "OUT:{^{:~tagCtx.props.p}}",
				onUpdate: false,
			}
		}
	}).link("#result", {});

	// ............................... Assert .................................
	assert.equal($("#result").text(), "BEFORE:two two TAGS:OUT:two OUT:three OUT:one AFTER:two two ",
	"Declarative this=ref binding on custom tag and late path @ref... works correctly");

	// ................................ Act ..................................
	var input1 = $("#inp1"),
		input2 = $("#inp1"),
		result = "";

	input1.val("newp ");
	input1.change();

	result += $("#result").text();

	input2.val("newp2 ");
	input2.change();
	result += "|" + $("#result").text();

	assert.equal(result, "BEFORE:newp newp TAGS:OUT:newp OUT:three OUT:one AFTER:newp newp |BEFORE:newp2 newp2 TAGS:OUT:newp2 OUT:three OUT:one AFTER:newp2 newp2 ",
	"Declarative this=ref binding on custom tag and late path @ref... works correctly even for two-way binding");

	// ................................ Reset ................................
	$("#result").empty();

	$.views.settings.trigger(true);
});

//TODO add tests for tag.refresh()

QUnit.test("Modifying content, initializing widgets/tag controls, using data-link", function(assert) {

	// =============================== Arrange ===============================

	// ................................ Act ..................................
	$.templates({
		markup: '<div data-link="{myWidget}"></div>',
		tags: {
			myWidget: {
				init: function(tagCtx, linkCtx, ctx) {
				},
				render: function() {
					return " render";
				},
				onAfterLink: function() {
					$(this.linkCtx.elem).append(" after");
				}
			}
		}
	}).link("#result", person1);

	// ............................... Assert .................................
	assert.equal($("#result div").html().replace(/<script.*?><\/script>/g, ""), " render after", 'A data-linked tag control allows setting of content on the data-linked element during render and onAfterLink');

	// =============================== Arrange ===============================

	// ................................ Act ..................................
	$.templates({
		markup: '<div data-link="{myRenderInLinkEventsWidget}"></div>',
		tags: {
			myRenderInLinkEventsWidget: {
				init: function(tagCtx, linkCtx, ctx) {
					$(linkCtx.elem).append(" init");
				},
				onAfterLink: function() {
					$(this.linkCtx.elem).append(" after");
				}
			}
		}
	}).link("#result", person1);

	// ............................... Assert .................................
	assert.equal($("#result div").html(), " init after", 'A data-linked tag control which does not render allows setting of content on the data-linked element during init and onAfterLink');

	// ............................... Reset .................................
	$("#result").empty();
	//TODO: Add tests for attaching jQuery UI widgets or similar to tag controls, using data-link and {^{mytag}} inline data binding.
});

QUnit.test('two-way bound tag controls', function(assert) {
var done = assert.async();

$.views.settings.trigger(false);

	// =============================== Arrange ===============================
	var person = {name: "Jo"};

	cancelChange = false;
	noRenderOnUpdate = true;
	renders = false;
	eventData = "";

	//TODO add tests for convert and convertBack declared on tag def or on tag instance and declared dependencies on tag and/or convert - either arrays or functions.
	// ELEMENT-BASED DATA-LINKED TAGS ON INPUT
	// ................................ Act ..................................
	$.templates('<input id="linkedElm" data-link="{twoWayTag name}"/>')
		.link("#result", person);

	var tag = $("#result").view(true).childTags("twoWayTag")[0],
		linkedEl = $("#linkedElm")[0];

	// ............................... Assert .................................
	assert.equal(eventData, "init render onBind onAfterLink setValue ",
	'Data link using: <input data-link="{twoWayTag name}"/> - event order for init, render, link');
	eventData = "";

	// ................................ Act ..................................
	before = tag.value + linkedEl.value;

	$.observable(person).setProperty({name: "newName"});
	after = tag.value + linkedEl.value;

	// ............................... Assert .................................
	assert.equal(eventData, "onBeforeChange onUpdate onAfterLink setValue onAfterChange ",
	'Data link using: <input data-link="{twoWayTag name}"/> - event order for onUpdate (returning false) - render not called');
	eventData = "";

	// ............................... Assert .................................
	assert.equal(before + "|" + after,
	"JoJo|newNamenewName",
	'Data link using: <input data-link="{twoWayTag name}"/> - binds data to linkedElem');

	// ................................ Act ..................................
	noRenderOnUpdate = false;
	before = tag.value + linkedEl.value;

	$.observable(person).setProperty({name: "newName2"});
	after = tag.value + linkedEl.value;

	// ............................... Assert .................................
	assert.equal(eventData, "onBeforeChange onUpdate onUnbind render onBind onAfterLink setValue onAfterChange ",
	'Data link using: <input data-link="{twoWayTag name}"/> - event order for onUpdate (returning true) - render is called, but no render');
	eventData = "";

	// ............................... Assert .................................
	assert.equal(before + "|" + after,
	"newNamenewName|newName2newName2",
	'Data link using: <input data-link="{twoWayTag name}"/> - binds data to linkedElem');

	// ................................ Act ..................................
	noRenderOnUpdate = false;
	renders = true;
	before = tag.value + linkedEl.value;

	$.observable(person).setProperty({name: "newName3"});
	after = tag.value + linkedEl.value;

	// ............................... Assert .................................
	assert.equal(eventData, "onBeforeChange onUpdate onUnbind render onBind onAfterLink setValue onAfterChange ",
	'Data link using: <input data-link="{twoWayTag name}"/> - event order for onUpdate (returning true) - render is called');
	eventData = "";

	// ............................... Assert .................................
	assert.equal(before + "|" + after,
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
	assert.equal(eventData, "onBeforeUpdateVal setValue onBeforeChange onUpdate onAfterLink onAfterChange ",
	'Data link using: <input data-link="{twoWayTag name}"/> - event order for onChange');
	eventData = "";

	// ............................... Assert .................................
	assert.equal(before + "|" + after,
	"newName3newName3|newValnewVal",
	'Data link using: <input data-link="{twoWayTag name}"/> - binds linkedElem back to data');

	// ................................ Act ..................................
	before = tag.value + person.name;
	cancelChange = true;
	linkedEl.value = "2ndNewVal";
	$(linkedEl).change();
	after = tag.value + person.name;

	// ............................... Assert .................................
	assert.equal(eventData, "onBeforeUpdateVal setValue onBeforeChange ",
	'Data link using: <input data-link="{twoWayTag name}"/> - event order for cancelled onBeforeChange');
	eventData = "";

	// ............................... Assert .................................
	assert.equal(before + "|" + after,
	"newValnewVal|newVal2ndNewVal",
	'Data link using: <input data-link="{twoWayTag name}"/> - if onBeforeChange returns false -> data changes but no relinking of tag');

	// ................................ Reset ..................................
	cancelChange = false;
	cancelUpdate = true;

	// ................................ Act ..................................
	before = tag.value + person.name;
	linkedEl.value = "3rdNewVal";
	$(linkedEl).change();
	after = tag.value + person.name;

	// ............................... Assert .................................
	assert.equal(eventData, "onBeforeUpdateVal ",
	'Data link using: <input data-link="{twoWayTag name}"/> - event order for cancelled onBeforeUpdateVal');
	eventData = "";

	// ............................... Assert .................................
	assert.equal(before + "|" + after,
	"newVal2ndNewVal|newVal2ndNewVal",
	'Data link using: <input data-link="{twoWayTag name}"/> - if onBeforeUpdateVal returns false -> data does not change, and no relinking of tag');

	// ................................ Reset ..................................
	cancelUpdate = false;
	noRenderOnUpdate = true;
	renders = false;

	// ................................ Act ..................................
	person.name = "updatedName";
	linkedEl.value = "updatedVal";
	before = tag.value + linkedEl.value;
	tag.refresh();
	linkedEl = $("#linkedElm")[0];
	after = tag.value + linkedEl.value + tag.linkedElem[0].value;

	// ............................... Assert .................................
	assert.equal(eventData, "onUnbind render onBind onAfterLink setValue ",
	'Data link using: <input data-link="{twoWayTag name}"/> - event order for tag.refresh');
	eventData = "";

	// ............................... Assert .................................
	assert.equal(before + "|" + after,
	"newValupdatedVal|updatedNameupdatedNameupdatedName",
	'Data link using: <input data-link="{twoWayTag name}"/> - tag.refresh() calls render and onAfterLink - reset to current data, and updates target (input value)');

	// ................................ Act ..................................
	$("#result").empty();

	// ............................... Assert .................................
	assert.equal(eventData, "onUnbind onDispose ",
	'Data link using: <input data-link="{twoWayTag name}"/> - event order for onDispose');
	eventData = "";

	// ................................ Reset ..................................
	person.name = "Jo";

	// =============================== Arrange ===============================

	// ................................ Act ..................................
	$.templates({
		markup: '<input id="linkedElm" data-link="{twoWayTag name convert=\'myupper\' convertBack=~lower}"/>',
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
	linkedEl = $("#linkedElm")[0];

	// ............................... Assert .................................
	assert.equal(linkedEl.value + "|" + tag.value,
	"JO|Jo",
	'Data link using: <input data-link="{twoWayTag name convert=\'myupper\'}"/> - (tag.convert setting) - initial linking: converts the value on the target input');

	// ................................ Act ..................................
	$.observable(person).setProperty({name: "ANewName"});

	// ............................... Assert .................................
	assert.equal(linkedEl.value + "|" + tag.value,
	"ANEWNAME|ANewName",
	'Data link using: <input data-link="{twoWayTag name convert=\'myupper\'}"/> - (tag.convert setting) - on data change: converts the value on the target input');

	// ................................ Act ..................................
	linkedEl.value = "ChangeTheName";
	$(linkedEl).change();

	// ............................... Assert .................................
	assert.equal(person.name + "|" + tag.value,
	"changethename|changethename",
	'Data link using: <input data-link="{twoWayTag name convertBack=~lower}"/> - (tag.convertBack setting) on element change: converts the data, and sets on data');

	// ................................ Reset ..................................
	$("#result").empty();
	person.name = "Jo";
	cancelChange = false;
	cancelUpdate = false;
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
		options = {cvt: upper};

	// ................................ Act ..................................
	$.templates({
		markup: '<input id="linkedElm" data-link="{twoWayTag name ^convert=~options.cvt}"/>',
		converters: {
			myupper: function(val) {
				return val.toUpperCase();
			}
		}
	}).link("#result", person, {options: options});

	tag = $("#result").view(true).childTags("twoWayTag")[0];
	linkedEl = $("#linkedElm")[0];

	// ............................... Assert .................................
	assert.equal(linkedEl.value + "|" + tag.value,
	"JO|Jo",
	'Data link using: <input data-link="{twoWayTag name ^convert=~options.cvt}"/> - converter specified by data-linked convert property');

	// ................................ Act ..................................
	$.observable(options).setProperty({cvt: lower});
	$.observable(person).setProperty({name: "ANewName"});

	// ............................... Assert .................................
	assert.equal(linkedEl.value + "|" + tag.value,
	"anewname|ANewName",
	'Data link using: <input data-link="{twoWayTag name ^convert=~options.cvt}"/> - data-linked swapping of converter from one function to another');

	// ................................ Act ..................................
	$.observable(options).setProperty({cvt: "myupper"});

	// ............................... Assert .................................
	assert.equal(linkedEl.value + "|" + tag.value,
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
	$.templates('{^{twoWayTag name}}<input id="linkedElm"/>{{/twoWayTag}}')
		.link("#result", person);

	tag = $("#result").view(true).childTags("twoWayTag")[0];
	linkedEl = $("#linkedElm")[0];

	// ............................... Assert .................................
	assert.equal(eventData, "init render onBind onAfterLink setValue ",
	'Data link using: {^{twoWayTag name}} - event order for init, render, link');
	eventData = "";

	// ................................ Act ..................................
	before = tag.value + linkedEl.value;

	$.observable(person).setProperty({name: "newName"});
	after = tag.value + linkedEl.value;

	// ............................... Assert .................................
	assert.equal(eventData + !!linkedEl.parentNode, "onBeforeChange onUpdate onAfterLink setValue onAfterChange true",
	'Data link using: {^{twoWayTag name}} - event order for onUpdate (returning false) - render not called; linkedElem not replaced');
	eventData = "";

	// ............................... Assert .................................
	assert.equal(before + "|" + after,
	"JoJo|newNamenewName",
	'Data link using: {^{twoWayTag name}} - binds data to linkedElem');

	// ................................ Act ..................................
	noRenderOnUpdate = false;
	before = tag.value + linkedEl.value;
	$.observable(person).setProperty({name: "newName2"});

	// ............................... Assert .................................
	assert.equal(eventData + !!linkedEl.parentNode, "onBeforeChange onUpdate onUnbind render onBind onAfterLink setValue onAfterChange false",
	'Data link using: {^{twoWayTag name}} - event order for onUpdate (returning true) - render is called; linkedElem is replaced');
	eventData = "";

	linkedEl = $("#linkedElm")[0];
	after = tag.value + linkedEl.value;
	// ............................... Assert .................................
	assert.equal(before + "|" + after,
	"newNamenewName|newName2newName2",
	'Data link using: {^{twoWayTag name}} - binds data to linkedElem');

	// ................................ Act ..................................
	noRenderOnUpdate = false;
	renders = true;
	before = tag.value + linkedEl.value;

	$.observable(person).setProperty({name: "newName3"});
	after = tag.value + linkedEl.value;

	// ............................... Assert .................................
	assert.equal(eventData + !!linkedEl.parentNode, "onBeforeChange onUpdate onUnbind render onBind onAfterLink setValue onAfterChange false",
	'Data link using: {^{twoWayTag name}} - event order for onUpdate (returning true) - render is called; linkedElem is replaced');
	eventData = "";

	linkedEl = $("#linkedElm")[0];
	after = tag.value + linkedEl.value;

	// ............................... Assert .................................
	assert.equal(before + "|" + after,
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
	assert.equal(eventData, "onBeforeUpdateVal setValue onBeforeChange onUpdate onAfterLink onAfterChange ",
	'Data link using: {^{twoWayTag name}} - event order for onChange');
	eventData = "";

	// ............................... Assert .................................
	assert.equal(before + "|" + after,
	"newName3newName3|newValnewVal",
	'Data link using: {^{twoWayTag name}} - binds linkedElem back to data');

	// ................................ Act ..................................
	before = tag.value + person.name;
	cancelChange = true;
	linkedEl.value = "2ndNewVal";
	$(linkedEl).change();
	after = tag.value + person.name;

	// ............................... Assert .................................
	assert.equal(eventData, "onBeforeUpdateVal setValue onBeforeChange ",
	'Data link using: {^{twoWayTag name}} - event order for cancelled onBeforeChange');
	eventData = "";

	// ............................... Assert .................................
	assert.equal(before + "|" + after,
	"newValnewVal|newVal2ndNewVal",
	'Data link using: {^{twoWayTag name}} - if onBeforeChange returns false -> data changes but no relinking of tag');

	// ................................ Reset ..................................
	cancelChange = false;
	noRenderOnUpdate = true;
	renders = false;

	// ................................ Act ..................................
	person.name = "updatedName";
	linkedEl.value = "updatedVal";
	before = tag.value + linkedEl.value;
	tag.refresh();
	linkedEl = $("#linkedElm")[0];
	after = tag.value + linkedEl.value + tag.linkedElem[0].value;

	// ............................... Assert .................................
	assert.equal(eventData, "onUnbind render onBind onAfterLink setValue ",
	'Data link using: {^{twoWayTag name}} - event order for tag.refresh');
	eventData = "";

	// ............................... Assert .................................
	assert.equal(before + "|" + after,
	"newValupdatedVal|updatedNameupdatedNameupdatedName",
	'Data link using: {^{twoWayTag name}} - tag.refresh() calls onUnbind, render, onBind and onAfterLink - reset to current data, and updates target (input value)');

	// ................................ Act ..................................
	$("#result").empty();

	// ............................... Assert .................................
	assert.equal(eventData, "onUnbind onDispose ",
	'Data link using: {^{twoWayTag name}} - event order for onDispose');
	eventData = "";

	// ................................ Reset ..................................
	person.name = "Jo";

	// =============================== Arrange ===============================
	$.templates({
		markup: '{^{twoWayTag name convert="myupper" convertBack=~lower}}<input id="linkedElm"/>{{/twoWayTag}}',
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
	linkedEl = $("#linkedElm")[0];

	// ............................... Assert .................................
	assert.equal(linkedEl.value + "|" + tag.value,
	"JO|Jo",
	'Data link using: {^{twoWayTag name convert=\'myupper\'}} - (tag.convert setting) - initial linking: converts the value on the target input');

	// ................................ Act ..................................
	$.observable(person).setProperty({name: "ANewName"});

	// ............................... Assert .................................
	assert.equal(linkedEl.value + "|" + tag.value,
	"ANEWNAME|ANewName",
	'Data link using: {^{twoWayTag name convert=\'myupper\'}} - (tag.convert setting) - on data change: converts the value on the target input');

	// ................................ Act ..................................
	linkedEl = $("#linkedElm")[0];
	linkedEl.value = "ChangeTheName";
	$(linkedEl).change();

	// ............................... Assert .................................
	assert.equal(person.name + "|" + tag.value,
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
	assert.equal(eventData, "init render onBind onAfterLink setValue ",
	'Data link using: {^{twoWayTag name/}} - event order for init, render, link');
	eventData = "";

	// ................................ Act ..................................
	linkedEl = tag.linkedElem[0];
	before = tag.value + linkedEl.value;

	$.observable(person).setProperty({name: "newName"});
	after = tag.value + tag.linkedElem[0].value;

	// ............................... Assert .................................
	assert.equal(eventData + !!linkedEl.parentNode, "onBeforeChange onUpdate onAfterLink setValue onAfterChange true",
	'Data link using: {^{twoWayTag name/}} - event order for onUpdate (returning false) - render not called; linkedElem not replaced');
	eventData = "";

	// ............................... Assert .................................
	assert.equal(before + "|" + after,
	"JoJo|newNamenewName",
	'Data link using: {^{twoWayTag name/}} - binds data to linkedElem');

	// ................................ Act ..................................
	noRenderOnUpdate = false;
	linkedEl = tag.linkedElem[0];
	before = tag.value + linkedEl.value;

	$.observable(person).setProperty({name: "newName2"});
	after = tag.value + tag.linkedElem[0].value;

	// ............................... Assert .................................
	assert.equal(eventData + !!linkedEl.parentNode, "onBeforeChange onUpdate onUnbind render onBind onAfterLink setValue onAfterChange false",
	'Data link using: {^{twoWayTag name/}} - event order for onUpdate (returning true) - render is called; linkedElem is replaced');
	eventData = "";

	// ............................... Assert .................................
	assert.equal(before + "|" + after,
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
	assert.equal(eventData + !!linkedEl.parentNode, "onBeforeChange onUpdate onUnbind render onBind onAfterLink setValue onAfterChange false",
	'Data link using: {^{twoWayTag name/}} - event order for onUpdate (returning true) - render is called; linkedElem is replaced');
	eventData = "";

	// ............................... Assert .................................
	assert.equal(before + "|" + after,
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
	assert.equal(eventData, "onBeforeUpdateVal setValue onBeforeChange onUpdate onAfterLink onAfterChange ",
	'Data link using: {^{twoWayTag name/}} - event order for onChange');
	eventData = "";

	// ............................... Assert .................................
	assert.equal(before + "|" + after,
	"newName3newName3|newValnewVal",
	'Data link using: {^{twoWayTag name/}} - binds linkedElem back to dataonChange');

	// ................................ Act ..................................
	before = tag.value + person.name;
	cancelChange = true;
	tag.linkedElem[0].value = "2ndNewVal";
	tag.linkedElem.change();
	after = tag.value + person.name;

	// ............................... Assert .................................
	assert.equal(eventData, "onBeforeUpdateVal setValue onBeforeChange ",
	'Data link using: {^{twoWayTag name/}} - event order for cancelled onBeforeChange');
	eventData = "";

	// ............................... Assert .................................
	assert.equal(before + "|" + after,
	"newValnewVal|newVal2ndNewVal",
	'Data link using: {^{twoWayTag name/}} - if onBeforeChange returns false -> data changes but no relinking of tag');

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
	assert.equal(eventData, "onUnbind render onBind onAfterLink setValue ",
	'Data link using: {^{twoWayTag name/}} - event order for tag.refresh');
	eventData = "";

	// ............................... Assert .................................
	assert.equal(before + "|" + after,
	"newValupdatedVal|updatedNameupdatedName",
	'Data link using: {^{twoWayTag name/}} - tag.refresh() calls render and onAfterLink - reset to current data, and updates target (input value)');

	// ................................ Act ..................................
	$("#result").empty();

	// ............................... Assert .................................
	assert.equal(eventData, "onUnbind onDispose ",
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
	assert.equal(tag.linkedElem[0].value + "|" + tag.value,
	"JO|Jo",
	'Data link using: {^{twoWayTag name convert="myupper"/}} - (tag.convert setting) - initial linking: converts the value on the target input');

	// ................................ Act ..................................
	$.observable(person).setProperty({name: "ANewName"});

	// ............................... Assert .................................
	assert.equal(tag.linkedElem[0].value + "|" + tag.value,
	"ANEWNAME|ANewName",
	'Data link using: {^{twoWayTag name convert="myupper"/}} - (tag.convert setting) - on data change: converts the value on the target input');

	// ................................ Act ..................................
	tag.linkedElem[0].value = "ChangeTheName";
	tag.linkedElem.change();

	// ............................... Assert .................................
	assert.equal(person.name + "|" + tag.value,
	"changethename|changethename",
	'Data link using: {^{twoWayTag name convertBack=~lower/}} - (tag.convertBack setting) on element change: converts the data, and sets on data');

	// ................................ Reset ..................................
	person.name = "Jo";
	person.name2 = "Jo";

	// =============================== Arrange ===============================
	$.templates({
		markup: '{^{textbox name /}} {^{textbox name2 convert="cvt" convertBack=~cvtBk/}}',
		tags: {
			textbox: {
				linkedElement: "input",
				template: "<input/>",
				onUpdate: false, // No need to re-render whole tag, when content updates.
				dataBoundOnly: true,
				onAfterLink: function(tagCtx) {
					this.value = tagCtx.args[0];
				},
				convert: function(val) {
					return val.toUpperCase();
				},
				convertBack: function(val) {
					return val.toLowerCase();
				}
			}
		},
		converters: {
			cvt: function(val) {
				return val + "cvt";
			}
		}
	}).link("#result", person, {
		cvtBk: function(val) {
			return val + "cvtBk";
		}
	});

	var tagWithDefaultConverters = $("#result").view(true).childTags("textbox")[0];
	var tagWithOverrideConverters = $("#result").view(true).childTags("textbox")[1];

	// ............................... Assert .................................
	assert.equal(tagWithDefaultConverters.linkedElem[0].value + "|" + tagWithDefaultConverters.value + " % " + tagWithOverrideConverters.linkedElem[0].value + "|" + tagWithOverrideConverters.value,
	"JO|Jo % Jocvt|Jo",
	'Data linked tag with default convert and convertBack, on initial linking: {^{textbox/}} uses default convert and {^{textbox convert=.../}} uses overridden convert');

	// ................................ Act ..................................
	$.observable(person).setProperty({name: "ANewName", name2: "ANewName2"});

	// ............................... Assert .................................
	assert.equal(tagWithDefaultConverters.linkedElem[0].value + "|" + tagWithDefaultConverters.value + " % " + tagWithOverrideConverters.linkedElem[0].value + "|" + tagWithOverrideConverters.value,
	"ANEWNAME|ANewName % ANewName2cvt|ANewName2",
	'Data linked tag with default convert and convertBack, on data change: {^{textbox/}} uses default convert and {^{textbox convert=.../}} uses overridden convert');

	// ................................ Act ..................................
	tagWithDefaultConverters.linkedElem[0].value = "ChangeTheName";
	tagWithOverrideConverters.linkedElem[0].value = "ChangeTheName2";
	tagWithDefaultConverters.linkedElem.change();
	tagWithOverrideConverters.linkedElem.change();

	// ............................... Assert .................................
	assert.equal(person.name + "|" + tagWithDefaultConverters.value + " % " + person.name2 + "|" + tagWithOverrideConverters.value,
	"changethename|changethename % ChangeTheName2cvtBk|ChangeTheName2cvtBk",
	'Data linked tag with default convert and convertBack, on element change: {^{textbox/}}uses default convertBAck and {^{textbox convertBack=.../}} uses overridden convertBack');

	// =============================== Arrange ===============================
	function conv1(val) {
		return "ONE(" + val + " " + this.tagCtx.props.type + ")";
	}
	conv1.depends = function(data) {
		return [data, "foo"];
	}

	function conv2(val) {
		return "TWO(" + val + " " + this.tagCtx.props.type + ")";
	}
	conv2.depends = function(data) {
		return [data, "foo"];
	}

	function conv3(val) {
		return "THREE(" + val + " " + this.tagCtx.props.type + ")";
	}
	conv3.depends = function(data) {
		return [data, "foo"];
	}
	var person = {name: "Jo", foo: "foo1", bar: "bar1"};

	$.templates({
		markup: '{^{:name type=foo convert=~cvt}} {^{:name type=foo convert="cvt"}} {^{cvt:name type=foo }}',
		converters: {
			cvt: conv1
		}
	}).link("#result", person, {
		cvt: conv2
	});

	// ................................ Act ..................................
	var result = $("#result").text();
	$.observable(person).setProperty({name: "Jo2"});
	result += "\nChangeData-name: " + $("#result").text();

	$.observable(person).setProperty({foo: "foo2"});
	result += "\nChangeConverterDepends-foo: " + $("#result").text();

	// ............................... Assert .................................
	assert.equal(result, "TWO(Jo foo1) ONE(Jo foo1) ONE(Jo foo1)\n" +
		"ChangeData-name: TWO(Jo2 foo1) ONE(Jo2 foo1) ONE(Jo2 foo1)\n" +
		"ChangeConverterDepends-foo: TWO(Jo2 foo2) ONE(Jo2 foo2) ONE(Jo2 foo2)",
		'{^{:...}} tag with converters with depends - updates correctly in response to dependent observable change');

	// =============================== Arrange ===============================
	var person = {name: "Jo", foo: "foo1", bar: "bar1"};

	$.templates({
		markup: '{^{textbox name type=foo convert=~cvt/}} {^{textbox name type=foo convert="cvt"/}} {^{textbox name type=foo /}}',
		tags: {
			textbox: {
				state: "state1",
				template: "{{:}} {{:#parent.data.bar}} {{:~tag.state}} {{:~tagCtx.props.type}}",
				convert: conv3,
				depends: function(data) {
					return [data, "bar", this, "state" ];
				}
			}
		},
		converters: {
			cvt: conv1
		}
	}).link("#result", person, {
		cvt: conv2
	});

	var textbox2 = $("#result").view().childTags("textbox")[1];

	// ................................ Act ..................................
	result = $("#result").text();

	result = $("#result").text();
	$.observable(person).setProperty({name: "Jo2"});
	result += "\nChangeData-name: " + $("#result").text();

	$.observable(person).setProperty({foo: "foo2"});
	result += "\nChangeConverterDepends-foo: " + $("#result").text();

	$.observable(person).setProperty({bar: "bar2"});
	result += "\nChangeTagDependsData-bar: " + $("#result").text();

	$.observable(textbox2).setProperty({state: "state2"});
	result += "\nChangeTagDependsState-state: " + $("#result").text();

	// ............................... Assert .................................
	assert.equal(result, "TWO(Jo foo1) bar1 state1 foo1 ONE(Jo foo1) bar1 state1 foo1 THREE(Jo foo1) bar1 state1 foo1\n" +
		"ChangeData-name: TWO(Jo2 foo1) bar1 state1 foo1 ONE(Jo2 foo1) bar1 state1 foo1 THREE(Jo2 foo1) bar1 state1 foo1\n" +
		"ChangeConverterDepends-foo: TWO(Jo2 foo2) bar1 state1 foo2 ONE(Jo2 foo2) bar1 state1 foo2 THREE(Jo2 foo2) bar1 state1 foo2\n" +
		"ChangeTagDependsData-bar: TWO(Jo2 foo2) bar2 state1 foo2 ONE(Jo2 foo2) bar2 state1 foo2 THREE(Jo2 foo2) bar2 state1 foo2\n" +
		"ChangeTagDependsState-state: TWO(Jo2 foo2) bar2 state1 foo2 ONE(Jo2 foo2) bar2 state2 foo2 THREE(Jo2 foo2) bar2 state1 foo2",
		'{^{textbox}} tag with depends, and with converters with depends - updates correctly in response to dependent observable changes');

	// =============================== Arrange ===============================
	var res = "";

	$.templates('{^{twoWayTag name trigger="keydown mouseup"/}}').link("#result", person);

	var linkedElem = $("#result input")[0],
		events = $._data(linkedElem).events,
		handlers = "|" + events.mouseup.length + events.keydown.length;

	tag = $("#result").view(true).childTags("twoWayTag")[0];

	$.observable(person).setProperty({name: "FirstName"});

	handlers += "|" + events.mouseup.length + events.keydown.length;

	// ................................ Act ..................................
	res += " 1: " + person.name + "|" + tag.value;

	tag.linkedElem[0].value = "SecondName";

	tag.linkedElem.keydown();

setTimeout(function() {
	res += " 2: " + person.name + "|" + tag.value;

	tag.linkedElem[0].value = "ThirdName";

	tag.linkedElem.mouseup();

setTimeout(function() {
	res += " 3: " + person.name + "|" + tag.value;

	tag.linkedElem[0].value = "FourthName";

	tag.linkedElem.keydown();

setTimeout(function() {
	res += " 4: " + person.name + "|" + tag.value;

	handlers += "|" + events.mouseup.length + events.keydown.length;

	// ............................... Assert .................................
	assert.equal(res,
	" 1: FirstName|FirstName 2: SecondName|SecondName 3: ThirdName|ThirdName 4: FourthName|FourthName",
	'Data link, global trigger false, using: {^{twoWayTag name trigger="event1 event2"/}} triggers on specified events');

	// ............................... Assert .................................
	assert.equal(handlers,
	"|11|11|11",
	'Data link, global trigger false, using: {^{twoWayTag name trigger="event1 event2"/}} has no duplicate handlers after relinking');

	// ................................ Act ..................................
	$.unlink("#result");

	// ............................... Assert .................................
	assert.ok($._data(linkedElem).events === undefined,
	'Data link, global trigger false, using: {^{twoWayTag name trigger="event1 event2"/}}: handlers are removed by $.unlink(container)');

	// =============================== Arrange ===============================
	res = "";

	$.templates('<input data-link=\'name trigger="keydown mouseup"\' />').link("#result", person);

	linkedElem = $("#result input")[0];

	events = $._data(linkedElem).events;
	handlers = "|" + events.mouseup.length + events.keydown.length;

	$.observable(person).setProperty({name: "FirstName"});

	handlers += "|" + events.mouseup.length + events.keydown.length;

	// ................................ Act ..................................
	res += " 1: " + person.name;

	linkedElem.value = "SecondName";

	$(linkedElem).keydown();

setTimeout(function() {
	res += " 2: " + person.name;

	linkedElem.value = "ThirdName";

	$(linkedElem).mouseup();

setTimeout(function() {
	res += " 3: " + person.name;

	linkedElem.value = "FourthName";

	$(linkedElem).keydown();

setTimeout(function() {
	res += " 4: " + person.name;

	handlers += "|" + events.mouseup.length + events.keydown.length;

	// ............................... Assert .................................
	assert.equal(res,
	" 1: FirstName 2: SecondName 3: ThirdName 4: FourthName",
	'Data link, global trigger false, using: <input data-link=\'name trigger="event1 event2"\' /> triggers on specified events');

	// ............................... Assert .................................
	assert.equal(handlers,
	"|11|11|11",
	'Data link, global trigger false, using: <input data-link=\'name trigger="event1 event2"\' /> has no duplicate handlers after relinking');

	// ................................ Act ..................................
	$.unlink("#result");

	// ............................... Assert .................................
	assert.ok($._data(linkedElem).events === undefined,
	'Data link, global trigger false, using: <input data-link=\'name trigger="event1 event2"\' />: handlers are removed by $.unlink(container)');

	// =============================== Arrange ===============================
	res = "";

	$.templates('<div contenteditable="true" data-link=\'name trigger="keydown mouseup"\'>some content</div>').link("#result", person);

	linkedElem = $("#result div")[0];

	events = $._data(linkedElem).events;
	handlers = "|" + events.mouseup.length + events.keydown.length;

	$.observable(person).setProperty({name: "First <b>Name</b>"});

	handlers += "|" + events.mouseup.length + events.keydown.length;

	// ................................ Act ..................................
	res += " 1: " + person.name;

	linkedElem.innerHTML = "Second <b>Name2</b>";

	$(linkedElem).keydown();

setTimeout(function() {
	res += " 2: " + person.name;

	linkedElem.innerHTML = "Third <b>Name3</b>";

	$(linkedElem).mouseup();

setTimeout(function() {
	res += " 3: " + person.name;

	linkedElem.innerHTML = "Fourth <b>Name4</b>";

	$(linkedElem).keydown();

setTimeout(function() {
	res += " 4: " + person.name;

	handlers += "|" + events.mouseup.length + events.keydown.length;

	// ............................... Assert .................................
	assert.equal(res,
	" 1: First <b>Name</b> 2: Second <b>Name2</b> 3: Third <b>Name3</b> 4: Fourth <b>Name4</b>",
	'Data link, global trigger false, using: <div contenteditable=true data-link=\'name trigger="event1 event2"\'> triggers on specified events');

	// ............................... Assert .................................
	assert.equal(handlers,
	"|11|11|11",
	'Data link, global trigger false, using: <div contenteditable=true data-link=\'name trigger="event1 event2"\'> has no duplicate handlers after relinking');

	// ................................ Act ..................................
	$.unlink("#result");

	// ............................... Assert .................................
	assert.ok($._data(linkedElem).events === undefined,
	'Data link, global trigger false, using: <div contenteditable=true data-link=\'name trigger="event1 event2"\'>: handlers are removed by $.unlink(container)');

	// =============================== Arrange ===============================
	res = "";
	$("#result").html('<input data-link=\'name trigger="keydown mouseup"\' />');

	linkedElem = $("#result input")[0];

	$.link(true, "#result", person);

	events = $._data(linkedElem).events;
	handlers = "|" + events.mouseup.length + events.keydown.length;

	$.observable(person).setProperty({name: "FirstName"});

	handlers += "|" + events.mouseup.length + events.keydown.length;

	// ................................ Act ..................................
	res += " 1: " + person.name;

	linkedElem.value = "SecondName";

	$(linkedElem).keydown();

setTimeout(function() {
	res += " 2: " + person.name;

	linkedElem.value = "ThirdName";

	$(linkedElem).mouseup();

setTimeout(function() {
	res += " 3: " + person.name;

	linkedElem.value = "FourthName";

	$(linkedElem).keydown();

setTimeout(function() {
	res += " 4: " + person.name;

	handlers += "|" + events.mouseup.length + events.keydown.length;

	// ............................... Assert .................................
	assert.equal(res,
	" 1: FirstName 2: SecondName 3: ThirdName 4: FourthName",
	'Top-level data link, global trigger false, using: <input data-link=\'name trigger="event1 event2"\' /> triggers on specified events');

	// ............................... Assert .................................
	assert.equal(handlers,
	"|11|11|11",
	'Top-level data link, global trigger false, using: <input data-link=\'name trigger="event1 event2"\' /> has no duplicate handlers after relinking');

	// ................................ Act ..................................
	$.unlink("#result");

	// ............................... Assert .................................
	assert.ok($._data(linkedElem).events === undefined,
	'Top-level data link using: <input data-link=\'name trigger="event1 event2"\' />: handlers are removed by $.unlink(container)');

	$("#result").empty();

	$.views.settings.trigger(true);

done();
}, 0);
}, 0);
}, 0);
}, 0);
}, 0);
}, 0);
}, 0);
}, 0);
}, 0);
}, 0);
}, 0);
}, 0);
});

QUnit.test("Tag options versus setting in init()", function(assert) {
	$.views.settings.trigger(false);

	// =============================== Arrange ===============================
	var getValues = function() {
		result += "{{mytag}}: " + inputs[0].value + " " + inputs[1].value + " " + inputs[2].value + " " + inputs[3].value
		+ " {{else}}: " + inputs[4].value + " " + inputs[5].value + " " + inputs[6].value + " " + inputs[7].value
		+ " |data: " + inputs[8].value + " " + inputs[9].value + " " + inputs[10].value + " |text: " + $("#result").text() + "\n";
	}

	var person = {first: "Jo", last: "Blow", title: "Sir"};
	$.views.templates({
		markup: '{^{mytag 0 prop=first last title=title}}{{else 0 prop=last first title=title}}{{/mytag}}'
		+ '<input data-link="first"/><input data-link="last"/><input data-link="title"/>',
		tags: {
			mytag: {
				init: function(tagCtx) {
					this.bindTo = ["prop", 1];
					this.linkedElement = [".a", ".b"];
					this.linkedCtxParam = ["a", "b"];
					this.template = '<input class="a"/><input class="b"/><input data-link="~a"/><input data-link="~b"/>{^{:~tagCtx.props.title}}';
					this.boundProps = ["title"];
					//this.depends = "title";
				},
				onUpdate: false
			}
		}
	}).link("#result", person);

		// ................................ Act ..................................
	var container = $("#result")[0],
		inputs = $("input:text", container),
		result = "";

	getValues();

	$(inputs[0]).val("Jo0").change();
	getValues();

	$(inputs[1]).val("Blow1").change();
	getValues();

	$(inputs[2]).val("Jo2").change();
	getValues();

	$(inputs[3]).val("Blow3").change();
	getValues();

	$(inputs[4]).val("Blow4").change();
	getValues();

	$(inputs[5]).val("Jo5").change();
	getValues();

	$(inputs[8]).val("Jo8").change();
	getValues();

	$(inputs[9]).val("Blow9").change();
	getValues();

	$(inputs[10]).val("Sir10").change();
	getValues();

	// ............................... Assert .................................
	assert.equal(result, "{{mytag}}: Jo Blow Jo Blow {{else}}: Blow Jo Blow Jo |data: Jo Blow Sir |text: SirSir\n"
	+ "{{mytag}}: Jo0 Blow Jo0 Blow {{else}}: Blow Jo Blow Jo0 |data: Jo0 Blow Sir |text: SirSir\n"
	+ "{{mytag}}: Jo0 Blow1 Jo0 Blow1 {{else}}: Blow Jo Blow1 Jo0 |data: Jo0 Blow1 Sir |text: SirSir\n"
	+ "{{mytag}}: Jo2 Blow1 Jo2 Blow1 {{else}}: Blow Jo Blow1 Jo2 |data: Jo2 Blow1 Sir |text: SirSir\n"
	+ "{{mytag}}: Jo2 Blow3 Jo2 Blow3 {{else}}: Blow Jo Blow3 Jo2 |data: Jo2 Blow3 Sir |text: SirSir\n"
	+ "{{mytag}}: Jo2 Blow3 Jo2 Blow4 {{else}}: Blow4 Jo Blow4 Jo2 |data: Jo2 Blow4 Sir |text: SirSir\n"
	+ "{{mytag}}: Jo2 Blow3 Jo5 Blow4 {{else}}: Blow4 Jo5 Blow4 Jo5 |data: Jo5 Blow4 Sir |text: SirSir\n"
	+ "{{mytag}}: Jo8 Blow4 Jo8 Blow4 {{else}}: Blow4 Jo8 Blow4 Jo8 |data: Jo8 Blow4 Sir |text: SirSir\n"
	+ "{{mytag}}: Jo8 Blow9 Jo8 Blow9 {{else}}: Blow9 Jo8 Blow9 Jo8 |data: Jo8 Blow9 Sir |text: SirSir\n"
	+ "{{mytag}}: Jo8 Blow9 Jo8 Blow9 {{else}}: Blow9 Jo8 Blow9 Jo8 |data: Jo8 Blow9 Sir10 |text: Sir10Sir10\n",
	"Setting bindTo, linkedElement, linkedCtxParam, template and boundProps in init(), and using two-way binding"
	+ " including on {{else}}, works correctly (onUpdate set to false)");

	// =============================== Arrange ===============================
	person = {first: "Jo", last: "Blow", title: "Sir"};
	$.views.templates({
		markup: '{^{mytag 0 prop=first last title=title}}{{else 0 prop=last first title=title}}{{/mytag}}'
		+ '<input data-link="first"/><input data-link="last"/><input data-link="title"/>',
		tags: {
			mytag: {
				init: function(tagCtx) {
					this.bindTo = ["prop", 1];
					this.linkedElement = [".a", ".b"];
					this.linkedCtxParam = ["a", "b"];
					this.template = '<input class="a"/><input class="b"/><input data-link="~a"/><input data-link="~b"/>{{:~tagCtx.props.title}}';
					//this.boundProps = ["title"];
					this.depends = "title";
				}
				//onUpdate: false
			}
		}
	}).link("#result", person);

		// ................................ Act ..................................
	container = $("#result")[0];
	inputs = $("input:text", container);
	result = "";

	getValues();

	$(inputs[0]).val("Jo0").change();
	inputs = $("input:text", container); // Refresh inputs array, since onUpdate is true, so input will have been rerendered
	getValues();

	$(inputs[1]).val("Blow1").change();
	inputs = $("input:text", container);
	getValues();

	$(inputs[2]).val("Jo2").change();
	inputs = $("input:text", container);
	getValues();

	$(inputs[3]).val("Blow3").change();
	inputs = $("input:text", container);
	getValues();
	inputs = $("input:text", container);

	$(inputs[4]).val("Blow4").change();
	inputs = $("input:text", container);
	getValues();

	$(inputs[5]).val("Jo5").change();
	inputs = $("input:text", container);
	getValues();

	$(inputs[8]).val("Jo8").change();
	inputs = $("input:text", container);
	getValues();

	$(inputs[9]).val("Blow9").change();
	inputs = $("input:text", container);
	getValues();

	$(inputs[10]).val("Sir10").change();
	inputs = $("input:text", container);
	getValues();

	// ............................... Assert .................................
	assert.equal(result, "{{mytag}}: Jo Blow Jo Blow {{else}}: Blow Jo Blow Jo |data: Jo Blow Sir |text: SirSir\n"
	+ "{{mytag}}: Jo0 Blow Jo0 Blow {{else}}: Blow Jo Blow Jo0 |data: Jo0 Blow Sir |text: SirSir\n"
	+ "{{mytag}}: Jo0 Blow1 Jo0 Blow1 {{else}}: Blow Jo Blow1 Jo0 |data: Jo0 Blow1 Sir |text: SirSir\n"
	+ "{{mytag}}: Jo2 Blow1 Jo2 Blow1 {{else}}: Blow Jo Blow1 Jo2 |data: Jo2 Blow1 Sir |text: SirSir\n"
	+ "{{mytag}}: Jo2 Blow3 Jo2 Blow3 {{else}}: Blow Jo Blow3 Jo2 |data: Jo2 Blow3 Sir |text: SirSir\n"
	+ "{{mytag}}: Jo2 Blow3 Jo2 Blow4 {{else}}: Blow4 Jo Blow4 Jo2 |data: Jo2 Blow4 Sir |text: SirSir\n"
	+ "{{mytag}}: Jo2 Blow3 Jo5 Blow4 {{else}}: Blow4 Jo5 Blow4 Jo5 |data: Jo5 Blow4 Sir |text: SirSir\n"
	+ "{{mytag}}: Jo8 Blow4 Jo8 Blow4 {{else}}: Blow4 Jo8 Blow4 Jo8 |data: Jo8 Blow4 Sir |text: SirSir\n"
	+ "{{mytag}}: Jo8 Blow9 Jo8 Blow9 {{else}}: Blow9 Jo8 Blow9 Jo8 |data: Jo8 Blow9 Sir |text: SirSir\n"
	+ "{{mytag}}: Jo8 Blow9 Jo8 Blow9 {{else}}: Blow9 Jo8 Blow9 Jo8 |data: Jo8 Blow9 Sir10 |text: Sir10Sir10\n",
	"Setting bindTo, linkedElement, linkedCtxParam, template and depends in init(), and using two-way binding including on {{else}},"
	+ " works correctly (onUpdate set to true)");

	// =============================== Arrange ===============================
	person = {heading: "HEAD"};

	$.views.templates({
		markup: '<div data-link=\'prop-foo{mytag attr="title"}\'>One</div>'
					+ '<div data-link=\'{mytag attr="title"}\'>Two</div>'
					+ '<div data-link=\'{mytag attr="prop-bar"}\'>Two</div>'
					+ '<div data-link=\'{mytag}\'>Three</div>',
		tags: {
			mytag: {
				init: function(tagCtx, linkCtx) {
					this.template = (linkCtx.attr||tagCtx.props.attr||this.attr) + ': {{:heading}}';
					if (tagCtx.props.attr) {
						this.attr = tagCtx.props.attr;
					}
				},
				onUpdate: false,
				attr: "data-foo" // Default
			}
		},
	}).link("#result", person);

	// ............................... Assert .................................
	assert.equal(
		$("#result div").eq(0).prop("foo") + " "
	+ $("#result div").eq(1).attr("title") + " "
	+ $("#result div").eq(2).prop("bar") + " "
	+ $("#result div").eq(3).attr("data-foo"),
	"prop-foo: HEAD title: HEAD prop-bar: HEAD data-foo: HEAD",
	"Setting attr in init() works correctly - including specifying prop - to set a property as target");

	// =============================== Arrange ===============================
	person = {first: "Jo", width: 32};

	$.views.templates({
		markup: '{^{mytag first width=width height=66 class="box" id="a"}}'
			+ '{{else first id="b"}}'
			+ '{{else first width=width-10 height=46 id="c"}}{{/mytag}}',
		tags: {
			mytag: {
				init: function(tagCtx) {
					this.boundProps = ["width"];
					this.linkedElement = "input";
					this.displayElement = ".foot";
					this.mainElement = ".head"; //
					this.template = '<div class="top"><div class="head">head</div><input/><div class="foot">foot</div></div>';
//					this.width = 55; // We set this in onBind instead - either will work
//					this.className = "myclass"; // We set this in onBind instead - either will work
					this.setSize = true;
				},
				onBind: function(tagCtx) {
					this.tagCtxs[2].mainElem = this.tagCtxs[2].contents(true, ".foot");
					this.tagCtxs[0].props.width = 102;
					this.width = 300;
					this.className = "myclass";
				},
				width: "155px",
				height: "10em",
				onUpdate: true,
			}
		}
	}).link("#result", person);

	// ............................... Assert .................................
	var result = "";

	$("#result div").each(function(i, elem) {
		result += " |" + i + ": "
			+ (elem.id ? " id: " + elem.id : "")
			+ (elem.className ? " class: " + elem.className : "")
			+ (elem.style.width ? " width: " + elem.style.width : "")
			+ (elem.style.height ? " height: " + elem.style.height : "");
	})
	assert.equal(result,
	 " |0:  class: top |1:  id: a class: head width: 102px height: 66px |2:  class: foot box"
+ " |3:  class: top |4:  id: b class: head width: 300px height: 10em |5:  class: foot myclass"
+ " |6:  class: top |7:  class: head |8:  id: c class: foot myclass width: 22px height: 46px",
	"Setting width, height, class, setSize, as tag options or in init()/onBind(),"
	+ " or setting width height or class as props, or setting displayElement or mainElemet as tag option or in init() all work correctly");

	// =============================== Arrange ===============================
	person = {first: "Jo", width: 32};

	$.views.templates({
		markup: '<div data-link=\'{mytag first width=width height=66 class="box" id="a"}'
				+ '{else first id="b"}'
			+ '{else first width=width-10 height=46 id="c"}\'></div>',
		tags: {
			mytag: {
				init: function(tagCtx) {
					this.boundProps = ["width"];
					this.linkedElement = "input";
					this.displayElement = ".foot";
					this.mainElement = ".head"; //
					this.template = '<div class="top"><div class="head">head</div><input/><div class="foot">foot</div></div>';
//					this.width = 55; // We set this in onBind instead - either will work
//					this.className = "myclass"; // We set this in onBind instead - either will work
					this.setSize = true;
				},
				onBind: function(tagCtx) {
					this.tagCtxs[2].mainElem = this.tagCtxs[2].contents(true, ".foot");
					this.tagCtxs[0].props.width = 102;
					this.width = 300;
					this.className = "myclass";
				},
				width: "155px",
				height: "10em",
				onUpdate: true,
			}
		}
	}).link("#result", person);

	// ............................... Assert .................................
	result = "";

	$("#result div div").each(function(i, elem) {
		result += " |" + i + ": "
			+ (elem.id ? " id: " + elem.id : "")
			+ (elem.className ? " class: " + elem.className : "")
			+ (elem.style.width ? " width: " + elem.style.width : "")
			+ (elem.style.height ? " height: " + elem.style.height : "");
	})
	assert.equal(result,
	 " |0:  class: top |1:  id: a class: head width: 102px height: 66px |2:  class: foot box"
+ " |3:  class: top |4:  id: b class: head width: 300px height: 10em |5:  class: foot myclass"
+ " |6:  class: top |7:  class: head |8:  id: c class: foot myclass width: 22px height: 46px",
	"Setting width, height, class, setSize, as tag options or in init()/onBind(),"
	+ " or setting width height or class as props, or setting displayElement as tag option or in init() all work correctly. (With data-linked div)");

// =============================== Arrange ===============================
	person = {first: "Jo"};

	$.views.templates({
		markup: '1 <div data-link="{mytag useData=false}"></div>{^{mytag useData=false/}}'
		+ '2 <div data-link="{mytag useData=true}"></div>{^{mytag useData=true/}}'
		+ '3 <div data-link="{mytag ~person2 useOuterCtx=false}{else ~person2 useOuterCtx=false}"></div>{^{mytag ~person2 useOuterCtx=false}}{{else ~person2 useOuterCtx=false}}{{/mytag}}'
		+ '4 <div data-link="{mytag ~person2 useOuterCtx=true}{else ~person2 useOuterCtx=true}"></div>{^{mytag ~person2 useOuterCtx=true}}{{else ~person2 useOuterCtx=true}}{{/mytag}}',
		tags: {
			mytag: {
				init: function(tagCtx) {
					this.argDefault = tagCtx.props.useData;
					this.contentCtx = tagCtx.props.useOuterCtx;
				},
				onUpdate: false,
				template: '{{:!!~tagCtx.args[0] && ~tagCtx.args[0].first}} {{:first}} '
			}
		}
	}).link("#result", {first: "Jo"}, {person2: {first: "Fred"}});

	// ............................... Assert .................................
	result = "";

	assert.equal($("#result").text(),
		"1 false Jo false Jo "
	+ "2 Jo Jo Jo Jo "
	+ "3 Fred Fred Fred Fred Fred Fred Fred Fred "
	+ "4 Fred Jo Fred Jo Fred Jo Fred Jo ",
	"Setting argDefault or contentCtx in init() work correctly.");

// =============================== Arrange ===============================
	person = {first: "Jo"};

	$.views.templates({
		markup: "1: {{mytag person=~person2/}} "
		+ "2: {{mytag person=~person2}}inner block: {{:first}}{{/mytag}} "
		+ "3: {{myrendertag person=~person2}}inner block: {{:first}}{{/myrendertag}}",
		tags: {
			mytag: {
				contentCtx: function() {
					return this.tagCtx.props.person;
				},
				onUpdate: false,
				template: 'In template: {{:first}} {{include tmpl=#content/}}'
			},
			myrendertag: {
				contentCtx: function() {
					return this.tagCtx.props.person;
				},
				onUpdate: false,
				render: function() {
					return this.tagCtx.render();
				}
			}
		}
	}).link("#result", {first: "Jo"}, {person2: {first: "Fred"}});

	// ............................... Assert .................................
	result = "";

	assert.equal($("#result").text(),
		"1: In template: Fred " + (" ")
		+ "2: In template: Fred inner block: Fred "
		+ "3: inner block: Fred",
	"contentCtx as a function returns the data context both for the template and for block content.");

	$.views.settings.trigger(true);
});

QUnit.test("Global trigger=false local trigger=true - triggers after keydown: <input/>", function(assert) {
	// =============================== Arrange ===============================
	$.views.settings.trigger(false);
	var done = assert.async(),
		res = "",
		person = {name: "Jo"};

	$.templates('<input data-link="name trigger=true" />').link("#result", person);

	var linkedElem = $("#result input")[0];

	var events = $._data(linkedElem).events,
		handlers = "|" + events[inputOrKeydown].length;

	$.observable(person).setProperty({name: "FirstName"});

	events = $._data(linkedElem).events;
	handlers += "|" + events[inputOrKeydown].length;

	// ................................ Act ..................................
	res += " 1: " + person.name;

	linkedElem.value = "SecondName";

	keydown($(linkedElem));
	$.views.settings.trigger(true);

	setTimeout(function() {
		res += " 2: " + person.name;

		handlers += "|" + events[inputOrKeydown].length;

		// ............................... Assert .................................
		assert.equal(res,
		" 1: FirstName 2: SecondName",
		'Data link using: <input data-link="name trigger=true" /> triggers after keydown');

		// ............................... Assert .................................
		assert.equal(handlers,
		"|1|1|1",
		'Data link using: <input data-link=\'name trigger=true\' /> has no duplicate handlers after relinking');

		// ................................ Act ..................................
		$.unlink("#result");

		// ............................... Assert .................................
		assert.ok($._data(linkedElem).events === undefined,
		'Data link using: <input data-link="name trigger=true" />: handlers are removed by $.unlink(container)');

		done();
	}, 0);
});

QUnit.test("Global trigger=true local trigger=false - does not trigger after keydown: <input/>", function(assert) {
	// =============================== Arrange ===============================
	var done = assert.async(),
		res = "",
		person = {name: "Jo"};

	$.templates('<input data-link="name trigger=false" />').link("#result", person);

	var linkedElem = $("#result input")[0];

	var events = $._data(linkedElem).events;

	$.observable(person).setProperty({name: "FirstName"});

	// ................................ Act ..................................
	res += " 1: " + person.name;

	linkedElem.value = "SecondName";

	keydown($(linkedElem));

	setTimeout(function() {
		res += " 2: " + person.name;

		// ............................... Assert .................................
		assert.equal(res,
		" 1: FirstName 2: FirstName",
		'Data link using: <input data-link="name trigger=false" /> does not trigger after keydown');

		// ............................... Assert .................................
		assert.equal(!events && !$._data(linkedElem).events,
		true,
		'Data link using: <input data-link=\'name trigger=false\' /> has no handlers after relinking');

		// ................................ Act ..................................
		$.unlink("#result");

		// ............................... Assert .................................
		assert.ok($._data(linkedElem).events === undefined,
		'Data link using: <input data-link="name trigger=false" />: No handlers after $.unlink(container)');

		done();
	}, 0);
});

QUnit.test("Global trigger=true - triggers after keydown: <input/>", function(assert) {
	// =============================== Arrange ===============================
	var done = assert.async(),
		res = "",
		person = {name: "Jo"};

	$.templates('<input data-link="name" />').link("#result", person);

	var linkedElem = $("#result input")[0];

	var events = $._data(linkedElem).events,
		handlers = "|" + events[inputOrKeydown].length;

	$.observable(person).setProperty({name: "FirstName"});

	events = $._data(linkedElem).events;
	handlers += "|" + events[inputOrKeydown].length;

	// ................................ Act ..................................
	res += " 1: " + person.name;

	linkedElem.value = "SecondName";

	keydown($(linkedElem));

	setTimeout(function() {
		res += " 2: " + person.name;

		handlers += "|" + events[inputOrKeydown].length;

		// ............................... Assert .................................
		assert.equal(res,
		" 1: FirstName 2: SecondName",
		'Data link using: <input data-link="name" /> triggers after keydown');

		// ............................... Assert .................................
		assert.equal(handlers,
		"|1|1|1",
		'Data link using: <input data-link=\'name\' /> has no duplicate handlers after relinking');

		// ................................ Act ..................................
		$.unlink("#result");

		// ............................... Assert .................................
		assert.ok($._data(linkedElem).events === undefined,
		'Data link using: <input data-link="name" />: handlers are removed by $.unlink(container)');

		done();
	}, 0);
});

QUnit.test("Global trigger=true - <input type='checkbox'/>", function(assert) {
	// =============================== Arrange ===============================
	var done = assert.async(),
		res = "",
		person = {member: true};

	$.templates('<input type="checkbox" data-link="member" />').link("#result", person);
	var linkedElem = $("#result input")[0];

	var events = $._data(linkedElem).events;

	$.observable(person).setProperty({member: false});

	events = $._data(linkedElem).events;

	// ................................ Act ..................................
	res += " 1: " + person.member;

	linkedElem.checked = true;

	$(linkedElem).change();

	setTimeout(function() {
		res += " 2: " + person.member;

		// ............................... Assert .................................
		assert.equal(res,
		" 1: false 2: true",
		'Data link using: <input type="checkbox" data-link="member" /> triggers after change');

		// ............................... Assert .................................
		assert.equal(events,
		undefined,
		'Data link using: <input type="checkbox" data-link="member" /> has no events');

		// ................................ Act ..................................
		$.unlink("#result");

		done();
	}, 0);
});

QUnit.test("trigger=\'keydown\' - triggers after keydown: <input/>", function(assert) {
	// =============================== Arrange ===============================

	var done = assert.async(),
		res = "",
		person = {name: "Jo"};

	$.templates('<input data-link="name trigger=\'keydown\'" />').link("#result", person);

	var linkedElem = $("#result input")[0];

	var events = $._data(linkedElem).events,
		handlers = "|" + events.keydown.length;

	$.observable(person).setProperty({name: "FirstName"});

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
		assert.equal(res,
		" 1: FirstName 2: SecondName",
		'Data link using: <input data-link="name trigger=\'keydown\'" /> triggers after keydown');

		// ............................... Assert .................................
		assert.equal(handlers,
		"|1|1|1",
		'Data link using: <input data-link=\'name trigger=\'keydown\'\' /> has no duplicate handlers after relinking');

		// ................................ Act ..................................
		$.unlink("#result");

		// ............................... Assert .................................
		assert.ok($._data(linkedElem).events === undefined,
		'Data link using: <input data-link="name trigger=\'keydown\'" />: handlers are removed by $.unlink(container)');

		done();
	}, 0);
});

QUnit.test("Global trigger=true - triggers after keydown: {^{twoWayTag}}", function(assert) {
	// =============================== Arrange ===============================

	var done = assert.async(),
		before = "",
		person = {name: "Jo"};

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

	var tag = $("#result").view(true).childTags("twoWayTag")[0],

		linkedElem = tag.linkedElem[0],
		events = $._data(linkedElem).events,
		handlers = "|" + events[inputOrKeydown].length;

	// ................................ Act ..................................
	before = linkedElem.value;
	linkedElem.value = "ChangeTheName";

	keydown(tag.linkedElem);

	setTimeout(function() {
		// ............................... Assert .................................
		assert.equal(before + "|" + person.name,
		"JO|changethename",
		'Data link using: {^{twoWayTag name convertBack=~lower/}} - triggers after keydown, converts the data, and sets on data');

		handlers += "|" + events[inputOrKeydown].length;

		// ............................... Assert .................................
		assert.equal(handlers,
		"|1|1",
		'Top-level data link using: {^{twoWayTag name convertBack=~lower/}} has no duplicate handlers after relinking');

		// ................................ Act ..................................
		$.unlink("#result");

		// ............................... Assert .................................
		assert.ok($._data(linkedElem).events === undefined,
		'Top-level data link using: {^{twoWayTag name convertBack=~lower/}}: handlers are removed by $.unlink(container)');

		done();
	}, 0);
});

QUnit.test("Global trigger=true - triggers - after keydown: {^{textbox}}", function(assert) {
	// =============================== Arrange ===============================

	var done = assert.async(),
		before = "",
		person = {name: "Jo"};

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
		markup: '{^{textbox name convert="myupper" convertBack=~lower/}}',
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
		handlers = "|" + events[inputOrKeydown].length;

	// ................................ Act ..................................
	before = linkedElem.value;
	linkedElem.value = "ChangeTheName";

	keydown(tag.linkedElem);

	setTimeout(function() {
		// ............................... Assert .................................
		assert.equal(before + "|" + person.name,
		"JO|changethename",
		'Data link using: {^{textbox name convertBack=~lower/}} - triggers after keydown, converts the data, and sets on data');

		handlers += "|" + events[inputOrKeydown].length;

		// ............................... Assert .................................
		assert.equal(handlers,
		"|1|1",
		'Top-level data link using: {^{textbox name convertBack=~lower/}} has no duplicate handlers after relinking');

		// ................................ Act ..................................
		$.unlink("#result");

		// ............................... Assert .................................
		assert.ok($._data(linkedElem).events === undefined,
		'Top-level data link using: {^{textbox name convertBack=~lower/}}: handlers are removed by $.unlink(container)');

		done();
	}, 0);

});

QUnit.test("Custom tag trigger:... option", function(assert) {
	// =============================== Arrange ===============================

	var done = assert.async(),
		before = "",
		person = {name: "Jo", trig:true};

	$.views.tags({
		textbox: {
			linkedElement: "input",
			onUpdate: false,
			template: "<input/>",
			trigger: false,
		}
	});

	$.templates({
		markup: '{^{textbox name/}} {^{textbox name trigger=true/}}',
	}).link("#result", person);

	var tags = $("#result").view(true).childTags("textbox");

	var linkedElem1 = $("#result input")[0];
	var linkedElem2 = $("#result input")[1];

	// ................................ Act ..................................
	before = person.name;

	linkedElem1.value = "NewName1";
	keydown($(linkedElem1));

	setTimeout(function() {

	before += "|" + person.name;

	linkedElem2.value = "NewName2";
	keydown($(linkedElem2));

	setTimeout(function() {

	before += "|" + person.name;

	linkedElem1.value = "AnotherNewName1";
	$(linkedElem1).change();

	before += "|" + person.name;

		// ............................... Assert .................................
		assert.equal(before,
		"Jo|Jo|NewName2|AnotherNewName1",
		'{^{textbox/}} with option trigger:false - triggers after change, not after keydown. But {^{textbox trigger=true/}} overrides option and triggers on keydown');

		done();
	}, 0);
	}, 0);

});

QUnit.test("Global trigger=true - triggers after keydown: {^{contentEditable}}", function(assert) {
	// =============================== Arrange ===============================
$.views.settings.trigger(true);

	var done = assert.async(),
		before = "",
		person = {name: "Jo <b>Smith</b>"};

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
		markup: '{^{contentEditable name convert="myupper" convertBack=~lower/}}',
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
		handlers = "|" + events[inputOrKeydownContentEditable].length;

	// ................................ Act ..................................
	before = linkedElem.innerHTML;
	linkedElem.innerHTML = "New <em>Name</em>";

	tag.linkedElem.trigger(inputOrKeydownContentEditable);

setTimeout(function() {
	before += "|" + person.name;
	linkedElem.innerHTML = "New2 <p>Name2</p>";

	tag.linkedElem.trigger(inputOrKeydownContentEditable);

setTimeout(function() {
	before += "|" + person.name;
	linkedElem.innerHTML = "New3 <div>Name3</div>";

	tag.linkedElem.trigger(inputOrKeydownContentEditable);

setTimeout(function() {
		// ............................... Assert .................................
		assert.equal(before + "|" + person.name,
		"JO <b>SMITH</b>|new <em>name</em>|new2 <p>name2</p>|new3 <div>name3</div>",
		'Data link using: {^{contentEditable name convertBack=~lower/}} - triggers after keydown, converts the data, and sets on data');

		handlers += "|" + events[inputOrKeydownContentEditable].length;

		// ............................... Assert .................................
		assert.equal(handlers,
		"|1|1",
		'Top-level data link using: {^{contentEditable name convertBack=~lower/}} has no duplicate handlers after relinking');

		// ................................ Act ..................................
		$.unlink("#result");

		// ............................... Assert .................................
		assert.ok($._data(linkedElem).events === undefined,
		'Top-level data link using: {^{contentEditable name convertBack=~lower/}}: handlers are removed by $.unlink(container)');

$.views.settings.trigger(true);

		done();
	}, 0);
	}, 0);
	}, 0);

});

QUnit.test('linkTo for {:source linkTo=target:} or {twoWayTag source linkTo=target}', function(assert) {
$.views.settings.trigger(false);

	// =============================== Arrange ===============================
	var before, after, person = {name: "Jo", name2: "Jo2"},
		cancelChange = false,
		eventData = "";

	$.views.tags({
		twoWayTag: {
			init: function(tagCtx, linkCtx, ctx) {
				eventData += "init ";
				if (this.inline && !tagCtx.content) {
					this.template = "<input/>";
				}
			},
			render: function(val) {
				eventData += "render ";
			},
			onAfterLink: function(tagCtx, linkCtx, ctx, ev, eventArgs) {
				eventData += "onAfterLink ";
				this.value = tagCtx.args[0];
				this.linkedElem = this.linkedElem || (this.inline ? this.contents("input,div") : $(linkCtx.elem));
			},
			onBeforeUpdateVal: function(ev, eventArgs) {
				eventData += "onBeforeUpdateVal ";
			},
			onUpdate: function(ev, eventArgs, newTagCtxs) {
				eventData += "onUpdate ";
				return false;
			},
			onBind: function(tagCtx, linkCtx, ctx, ev, eventArgs) {
				eventData += "onBind ";
			},
			onUnbind: function(tagCtx, linkCtx, ctx, ev, eventArgs) {
				eventData += "onUnbind ";
			},
			onBeforeChange: function(ev, eventArgs) {
				eventData += "onBeforeChange ";
				return !cancelChange;
			},
			setValue: function() {
				eventData += "setValue ";
			},
			onAfterChange: function(ev, eventArgs) {
				eventData += "onAfterChange ";
				return !cancelChange;
			},
			onDispose: function() {
				eventData += "onDispose ";
			}
		}
	});

	// ELEMENT-BASED DATA-LINKED TAGS ON INPUT - WITH linkTo EXPRESSION
	$.templates('<input id="linkedElm" data-link="{:name linkTo=name2:}"/>')
		.link("#result", person);

	var linkedEl = $("#linkedElm")[0];

	// ................................ Act ..................................
	before = linkedEl.value;

	$.observable(person).setProperty({name: "newName"});
	after = linkedEl.value;

	// ............................... Assert .................................
	assert.equal(before + "|" + after,
	"Jo|newName",
	'Data link using: <input data-link="{:name linkTo=name2:}"/> - binds data to linkedElem');

	// ................................ Act ..................................
	before = "name:" + person.name + " name2:" + person.name2;
	linkedEl.value = "newVal";
	$(linkedEl).change();
	after = "name:" + person.name + " name2:" + person.name2;

	// ............................... Assert .................................
	assert.equal(before + "|" + after,
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

	$.templates('<input id="linkedElm" data-link="\'initialValue\' linkTo=name2"/>')
		.link("#result", person);

	linkedEl = $("#linkedElm")[0];

	// ................................ Act ..................................
	before = "value: " + linkedEl.value + " name:" + person.name + " name2:" + person.name2;
	linkedEl.value = "3rdNewVal";
	$(linkedEl).change();
	after = "name:" + person.name + " name2:" + person.name2;

	// ............................... Assert .................................
	assert.equal(before + "|" + after,
	"value: initialValue name:Jo name2:Jo2|name:Jo name2:3rdNewVal",
	'Data link using: <input data-link="\'initialValue\' linkTo=name2"/> - Initializes to provided string, and binds updated value of linkedElem back to "linkTo" target');

	// =============================== Arrange ===============================

	person.name = "Jo";
	person.name2 = "Jo2";

	$.templates('<input id="linkedElm" data-link="linkTo=name2"/>')
		.link("#result", person);

	linkedEl = $("#linkedElm")[0];

	// ................................ Act ..................................
	before = "value: " + linkedEl.value + " name:" + person.name + " name2:" + person.name2;
	linkedEl.value = "4thNewVal";
	$(linkedEl).change();
	after = "name:" + person.name + " name2:" + person.name2;

	// ............................... Assert .................................
	assert.equal(before + "|" + after,
	"value: [object Object] name:Jo name2:Jo2|name:Jo name2:4thNewVal",
	'Data link using: <input data-link="linkTo=name2"/> - Initializes to current data item, and binds updated value of linkedElem back to "linkTo" target');

	// =============================== Arrange ===============================

	// ................................ Act ..................................
	$.templates({
		markup: '<input id="linkedElm" data-link="{myupper:name linkTo=name2:mylower}"/>',
		converters: {
			myupper: function(val) {
				return val.toUpperCase();
			},
			mylower: function(val) {
				return val.toLowerCase();
			}
		}
	}).link("#result", person);

	linkedEl = $("#linkedElm")[0];

	// ............................... Assert .................................
	assert.equal(linkedEl.value, "JO",
	'Data link using: <input data-link="{myupper:name linkTo=name2:mylower} - (tag.convert setting) - initial linking: converts the value on the target input');

	// ................................ Act ..................................
	$.observable(person).setProperty({name: "ANewName"});

	// ............................... Assert .................................
	assert.equal(linkedEl.value,
	"ANEWNAME",
	'Data link using: <input data-link="{myupper:name linkTo=name2:mylower}"/> - (tag.convert setting) - on data change: converts the value on the target input');

	// ................................ Act ..................................
	linkedEl.value = "ChangeTheName";
	$(linkedEl).change();

	// ............................... Assert .................................
	assert.equal("name:" + person.name + " name2:" + person.name2,
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
	$.templates('<input id="linkedElm" data-link="{twoWayTag name linkTo=name2}"/>')
		.link("#result", person);

	var tag = $("#result").view(true).childTags("twoWayTag")[0];
	linkedEl = $("#linkedElm")[0];

	// ............................... Assert .................................
	assert.equal(eventData, "init render onBind onAfterLink setValue ",
	'Data link using: <input data-link="{twoWayTag name linkTo=name2}"/> - event order for init, render, link');
	eventData = "";

	// ................................ Act ..................................
	before = tag.value + linkedEl.value;

	$.observable(person).setProperty({name: "newName"});
	after = tag.value + linkedEl.value;

	// ............................... Assert .................................
	assert.equal(eventData, "onBeforeChange onUpdate onAfterLink setValue onAfterChange ",
	'Data link using: <input data-link="{twoWayTag name linkTo=name2}"/> - event order for onUpdate');
	eventData = "";

	// ............................... Assert .................................
	assert.equal(before + "|" + after,
	"JoJo|newNamenewName",
	'Data link using: <input data-link="{twoWayTag name linkTo=name2}"/> - binds data to linkedElem');

	// ................................ Act ..................................
	before = "value:" + tag.value + " name:" + person.name + " name2:" + person.name2;
	linkedEl.value = "newVal";
	$(linkedEl).change();
	after = "value:" + tag.value + " name:" + person.name + " name2:" + person.name2;

	// ............................... Assert .................................
	assert.equal(eventData, "onBeforeUpdateVal setValue ",
	'Data link using: <input data-link="{twoWayTag name linkTo=name2}"/> - event order for onChange');
	eventData = "";

	// ............................... Assert .................................
	assert.equal(before + "|" + after,
	"value:newName name:newName name2:Jo2|value:newName name:newName name2:newVal",
	'Data link using: <input data-link="{twoWayTag name linkTo=name2}"/> - binds linkedElem back to "linkTo" target dataonChange');
	eventData = "";

	// ................................ Reset ..................................
	cancelChange = false;
	person.name = "Jo";

	// =============================== Arrange ===============================

	// ................................ Act ..................................
	$.templates({
		markup: '<input id="linkedElm" data-link="{twoWayTag name linkTo=name2 convert=\'myupper\' convertBack=~lower}"/>',
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
	linkedEl = $("#linkedElm")[0];

	// ............................... Assert .................................
	assert.equal(linkedEl.value + "|" + tag.value,
	"JO|Jo",
	'Data link using: <input data-link="{twoWayTag name linkTo=name2 convert=\'myupper\'}"/> - (tag.convert setting) - initial linking: converts the value on the target input');

	// ................................ Act ..................................
	$.observable(person).setProperty({name: "ANewName"});

	// ............................... Assert .................................
	assert.equal(linkedEl.value + "|" + tag.value,
	"ANEWNAME|ANewName",
	'Data link using: <input data-link="{twoWayTag name linkTo=name2 convert=\'myupper\'}"/> - (tag.convert setting) - on data change: converts the value on the target input');

	// ................................ Act ..................................
	linkedEl.value = "ChangeTheName";
	$(linkedEl).change();

	// ............................... Assert .................................
	assert.equal("name:" + person.name + " name2:" + person.name2 + " value:" + tag.value,
	"name:ANewName name2:changethename value:ANewName",
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
	$.templates('{^{twoWayTag name linkTo=name2}}<input id="linkedElm"/>{{/twoWayTag}}')
		.link("#result", person);

	tag = $("#result").view(true).childTags("twoWayTag")[0];
	linkedEl = $("#linkedElm")[0];

	// ............................... Assert .................................
	assert.equal(eventData, "init render onBind onAfterLink setValue ",
	'Data link using: {^{twoWayTag name linkTo=name2}} - event order for init, render, link');
	eventData = "";

	// ................................ Act ..................................
	before = tag.value + linkedEl.value;

	$.observable(person).setProperty({name: "newName"});
	after = tag.value + linkedEl.value;

	// ............................... Assert .................................
	assert.equal(eventData, "onBeforeChange onUpdate onAfterLink setValue onAfterChange ",
	'Data link using: {^{twoWayTag name linkTo=name2}} - event order for onUpdate');
	eventData = "";

	// ............................... Assert .................................
	assert.equal(before + "|" + after,
	"JoJo|newNamenewName",
	'Data link using: {^{twoWayTag name linkTo=name2}} - binds data to linkedElem');

	// ................................ Act ..................................
	before = "value:" + tag.value + " name:" + person.name + " name2:" + person.name2;
	linkedEl.value = "newVal";
	$(linkedEl).change();
	after = "value:" + tag.value + " name:" + person.name + " name2:" + person.name2;

	// ............................... Assert .................................
	assert.equal(eventData, "onBeforeUpdateVal setValue ",
	'Data link using: {^{twoWayTag name linkTo=name2}} - event order for onChange');
	eventData = "";

	// ............................... Assert .................................
	assert.equal(before + "|" + after,
	"value:newName name:newName name2:Jo2|value:newName name:newName name2:newVal",
	'Data link using: {^{twoWayTag name linkTo=name2}} - binds linkedElem back to "linkTo" target data');

	// ................................ Reset ..................................
	person.name = "Jo";
	person.name2 = "Jo2";

	// =============================== Arrange ===============================
	$.templates({
		markup: '{^{twoWayTag name linkTo=name2 convert="myupper" convertBack=~lower}}<input id="linkedElm"/>{{/twoWayTag}}',
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
	linkedEl = $("#linkedElm")[0];

	// ............................... Assert .................................
	assert.equal(linkedEl.value + "|" + tag.value,
	"JO|Jo",
	'Data link using: {^{twoWayTag name linkTo=name2 convert="myupper"}} - (tag.convert setting) - initial linking: converts the value on the target input');

	// ................................ Act ..................................
	$.observable(person).setProperty({name: "ANewName"});

	// ............................... Assert .................................
	assert.equal(linkedEl.value + "|" + tag.value,
	"ANEWNAME|ANewName",
	'Data link using: {^{twoWayTag name linkTo=name2 convert="myupper"} - (tag.convert setting) - on data change: converts the value on the target input');

	// ................................ Act ..................................
	linkedEl = $("#linkedElm")[0];
	linkedEl.value = "ChangeTheName";
	$(linkedEl).change();

	// ............................... Assert .................................
	assert.equal("name:" + person.name + " name2:" + person.name2 + " value:" + tag.value,
	"name:ANewName name2:changethename value:ANewName",
	'Data link using: {^{twoWayTag name linkTo=name2 convertBack=~lower}} - (tag.convertBack setting) on element change: converts the data, and sets on "linkTo" target data');

	// ............................... Reset .................................
	$("#result").empty();
	$.views.settings.trigger(true);
});

QUnit.test('Custom Tag Controls - two-way binding (multiple targets)', function(assert) {
	$.views.settings.trigger(false);

	// =============================== Arrange ===============================
	var person = {first: "Jo", last: "Blow"};

	$.templates({
		markup: '{^{mytag first/}}',
		tags: {
			mytag: {
				template: '<input id="linkedElm"/><span class="nm"></span> {^{on ~tag.doupdate id="updateBtn"}}Update{{/on}}',
				onBind: function() {
					this.linkedElem = this.contents("input").first(); // Programmatically set linkedElem
				},
				onAfterLink: function() {
					this.contents(".nm").text(this.bndArgs()[0]); // Programmatically update span content
				},
				doupdate: function() {
					var val = this.bndArgs()[0] + this.cnt++
					this.updateValue(val).setValue(val); // Programmatically call update() from within tag
				},
				onUpdate: false,
				cnt: 0 // Counter for programmatically updated content
			}
		}
	}).link("#result", person);

	var mytag = $.view().childTags("mytag")[0];
	var linkedEl = $("#linkedElm")[0];

	var result = mytag.bndArgs() + "|" + linkedEl.value;

	// ................................ Act ..................................
	$.observable(person).setProperty({first: "Bob"});

	result += "--" + mytag.bndArgs() + "|" + linkedEl.value;

	linkedEl.value = "newName"

	$(linkedEl).change();

	result += "--" + mytag.bndArgs() + "|" + person.first;

	// ............................... Assert .................................
	assert.equal(result, "Jo|Jo--Bob|Bob--newName|newName",
	"linkedElem set in onBind");

	// ................................ Act ..................................
	result = "" + mytag.bndArgs();

	mytag.updateValue("updatedFirst").setValue("updatedFirst");

	result += "--" + mytag.bndArgs() + "|" + linkedEl.value + "|" + person.first + "|" + $("#result").text();

	// ................................ Act ..................................

	$("#updateBtn").click();

	result += "--" + mytag.bndArgs() + "|" + linkedEl.value + "|" + person.first + "|" + $("#result").text();

	assert.equal(result,
		"newName--updatedFirst|updatedFirst|updatedFirst|updatedFirst Update"
		+ "--updatedFirst0|updatedFirst0|updatedFirst0|updatedFirst0 Update",
	"With linkedElem set in onBind, mytag.bndArgs() and mytag.updateValue().setValue() correctly access/update two-way bound values");

	// =============================== Arrange ===============================
	person = {first: "Jo", last: "Blow"};

	$.templates({
		markup: '{^{mytag first last/}}',
		tags: {
			mytag: {
				bindTo: [0, 1],
				template: '<input id="linkedElm1"/><input id="linkedElm2"/> <span class="nm"></span>',
				onBind: function(tagCtx) {
					var inputs = tagCtx.contentView.contents("input");
					tagCtx.linkedElems = [$(inputs[0]), $(inputs[1])]; // Programmatically set linkedElems
				},
				onAfterLink: function() {
					this.contents(".nm").text(this.bndArgs()[0] + " " + this.bndArgs()[1]); // Programmatically update span content
				},
				onUpdate: false
			}
		}
	}).link("#result", person);

	mytag = $.view().childTags("mytag")[0];
	var linkedEl1 = $("#linkedElm1")[0];
	var linkedEl2 = $("#linkedElm2")[0];

	result = mytag.bndArgs() + "|" + linkedEl1.value + "|" + linkedEl2.value;

	// ................................ Act ..................................
	$.observable(person).setProperty({first: "Bob", last: "Puff"});

	result += "--" + mytag.bndArgs() + "|" + linkedEl1.value + "|" + linkedEl2.value + "|" + $("#result").text();

	linkedEl1.value = "newFirst"
	linkedEl2.value = "newLast"

	$(linkedEl1).change();
	$(linkedEl2).change();

	result += "--" + mytag.bndArgs() + "|" + person.first + "|" + person.last + "|" + $("#result").text();

	// ............................... Assert .................................
	assert.equal(result, "Jo,Blow|Jo|Blow--Bob,Puff|Bob|Puff| Bob Puff--newFirst,newLast|newFirst|newLast| newFirst newLast",
	'With bindTo: [0, 1], and 2 linkedElems set in onBind, mytag.bndArgs() and mytag.updateValue() '
	+ 'correctly access/update two-way bound values');

	// =============================== Arrange ===============================
	person = {first: "Jo", last: "Blow"};

	$.templates({
		markup: '{^{mytag 1 first/}}',
		tags: {
			mytag: {
				bindTo: 1,
				template: '<input id="linkedElm1"/> <span class="nm"></span>',
				onBind: function() {
					var inputs = this.contents("input");
					this.linkedElem = $(inputs[0]); // Programmatically set linkedElems
				},
				onAfterLink: function() {
					this.contents(".nm").text(this.bndArgs()[0]); // Programmatically update span content
				},
				onUpdate: false
			}
		}
	}).link("#result", person);

	mytag = $.view().childTags("mytag")[0];
	linkedEl1 = $("#linkedElm1")[0];

	result = mytag.bndArgs() + "|" + linkedEl1.value ;

	// ................................ Act ..................................
	$.observable(person).setProperty({first: "Bob"});

	result += "--" + mytag.bndArgs() + "|" + linkedEl1.value + "|" + $("#result").text();

	linkedEl1.value = "newFirst"

	$(linkedEl1).change();

	result += "--" + mytag.bndArgs() + "|" + person.first + "|" + $("#result").text();

	// ............................... Assert .................................
	assert.equal(result, "Jo|Jo--Bob|Bob| Bob--newFirst|newFirst| newFirst",
	'With bindTo: 1, and linkedElem set in onBind, mytag.bndArgs() and mytag.updateValue()'
	+ 'correctly access/update two-way bound values');

	// =============================== Arrange ===============================
	person = {first: "Jo", last: "Blow"};

	$.templates({
		markup: '{^{mytag name1=first name2=last/}}',
		tags: {
			mytag: {
				bindTo: ["name1", "name2"],
				template: '<input id="linkedElm1"/><input id="linkedElm2"/> <span class="nm"></span>',
				onBind: function(tagCtx) {
					var inputs = tagCtx.contentView.contents("input");
					tagCtx.linkedElems = [$(inputs[0]), $(inputs[1])]; // Programmatically set linkedElems
				},
				onAfterLink: function() {
					this.contents(".nm").text(this.bndArgs()[0] + " " + this.bndArgs()[1]); // Programmatically update span content
				},
				onUpdate: false
			}
		}
	}).link("#result", person);

	mytag = $.view().childTags("mytag")[0];
	linkedEl1 = $("#linkedElm1")[0];
	linkedEl2 = $("#linkedElm2")[0];

	result = mytag.bndArgs() + "|" + linkedEl1.value + "|" + linkedEl2.value;

	// ................................ Act ..................................
	$.observable(person).setProperty({first: "Bob", last: "Puff"});

	result += "--" + mytag.bndArgs() + "|" + linkedEl1.value + "|" + linkedEl2.value + "|" + $("#result").text();

	linkedEl1.value = "newFirst"
	linkedEl2.value = "newLast"

	$(linkedEl1).change();
	$(linkedEl2).change();

	result += "--" + mytag.bndArgs() + "|" + person.first + "|" + person.last + "|" + $("#result").text();

	// ............................... Assert .................................
	assert.equal(result, "Jo,Blow|Jo|Blow--Bob,Puff|Bob|Puff| Bob Puff--newFirst,newLast|newFirst|newLast| newFirst newLast",
	'With bindTo: ["name1", "name2"], and 2 linkedElems set in onBind, mytag.bndArgs() and mytag.updateValue())'
	+ 'correctly access/update two-way bound values');

	// =============================== Arrange ===============================
	person = {first: "Jo", last: "Blow"};

	$.templates({
		markup: '{^{mytag first/}}',
		tags: {
			mytag: {
				linkedElement: "input",
				template: '<input id="linkedElm"/>',
				onUpdate: false
			}
		}
	}).link("#result", person);

	mytag = $.view().childTags("mytag")[0];
	linkedEl = $("#linkedElm")[0];

	result = linkedEl.value;

	// ................................ Act ..................................
	$.observable(person).setProperty({first: "Bob"});

	result += "--" + linkedEl.value;

	linkedEl.value = "newName"

	$(linkedEl).change();

	result += "--" + person.first;

	mytag.updateValue("updatedFirst").setValue("updatedFirst");

	result += "--" + person.first + "|" + linkedEl.value;

	// ............................... Assert .................................
	assert.equal(result, "Jo--Bob--newName--updatedFirst|updatedFirst",
	"linkedElem set using linkedElement declaration");

	// =============================== Arrange ===============================
	person = {first: "Jo", last: "Blow"};

	$.templates({
		markup: '{^{mytag first/}}',
		tags: {
			mytag: {
				linkedCtxParam: "frst",
				template: '<input id="linkedElm" data-link="~frst"/>{^{:~frst}}',
				onUpdate: false
			}
		}
	}).link("#result", person);

	mytag = $.view().childTags("mytag")[0];
	linkedEl = $("#linkedElm")[0];

	result = linkedEl.value + "|" + $("#result").text();

	// ................................ Act ..................................
	$.observable(person).setProperty({first: "Bob"});

	result += "--" + linkedEl.value + "|" + $("#result").text();

	linkedEl.value = "newName"

	$(linkedEl).change();

	result += "--" + person.first + "|" + $("#result").text();

	mytag.updateValue("updatedFirst").setValue("updatedFirst");

	result += "--" + person.first + "|" + linkedEl.value + "|" + $("#result").text();

	// ............................... Assert .................................
	assert.equal(result, "Jo|Jo--Bob|Bob--newName|newName--updatedFirst|updatedFirst|updatedFirst",
	"linkedCtxParam declaring a tag contextual parameter");

	// =============================== Arrange ===============================
	person = {first: "Jo", last: "Blow"};

	$.templates({
		markup: '{^{mytag first/}}',
		tags: {
			mytag: {
				bindTo: [0],
				linkedCtxParam: ["frst"],
				template: '<input id="linkedElm" data-link="~frst"/>{^{:~frst}}',
				onUpdate: false
			}
		}
	}).link("#result", person);

	mytag = $.view().childTags("mytag")[0];
	linkedEl = $("#linkedElm")[0];

	result = linkedEl.value + "|" + $("#result").text();

	// ................................ Act ..................................
	$.observable(person).setProperty({first: "Bob"});

	result += "--" + linkedEl.value + "|" + $("#result").text();

	linkedEl.value = "newName"

	$(linkedEl).change();

	result += "--" + person.first + "|" + $("#result").text();

	mytag.updateValue("updatedFirst");

	result += "--" + person.first + "|" + linkedEl.value + "|" + $("#result").text();

	// ............................... Assert .................................
	assert.equal(result, "Jo|Jo--Bob|Bob--newName|newName--updatedFirst|updatedFirst|updatedFirst",
	"bindTo and linkedCtxParam as arrays, declaring a tag contextual parameter");

	// =============================== Arrange ===============================
	person = {first: "Jo", last: "Blow"};

	$.templates({
		markup: '{^{mytag first last/}}',
		tags: {
			mytag: {
				bindTo: [1, 0],
				linkedCtxParam: ["lst", "frst"],
				template: '<input id="linkedElm1" data-link="~frst"/>{^{:~frst}} <input id="linkedElm2" data-link="~lst"/>{^{:~lst}}',
				onUpdate: false
			}
		}
	}).link("#result", person);

	mytag = $.view().childTags("mytag")[0];
	linkedEl1 = $("#linkedElm1")[0];
	linkedEl2 = $("#linkedElm2")[0];

	result = linkedEl1.value + "|" + linkedEl2.value + "|" + $("#result").text();

	// ................................ Act ..................................
	$.observable(person).setProperty({first: "Bob", last: "Puff"});

	result += "--" + linkedEl1.value + "|" + linkedEl2.value + "|" + $("#result").text();

	linkedEl1.value = "newFirst"
	linkedEl2.value = "newLast"

	$(linkedEl1).change();
	$(linkedEl2).change();

	result += "--" + person.first + "|" + person.last + "|" + $("#result").text();

	// ............................... Assert .................................
	assert.equal(result, "Jo|Blow|Jo Blow--Bob|Puff|Bob Puff--newFirst|newLast|newFirst newLast",
	"bindTo and linkedCtxParam as arrays, declaring tag contextual parameters");

	// ................................ Act ..................................
	result = "" + mytag.bndArgs();

	mytag.updateValues("updatedFirst", "updatedLast").setValues("updatedFirst", "updatedLast");

	result += "--" + mytag.bndArgs() + "|" + linkedEl1.value + "|" + linkedEl2.value + "|" + person.first + "|" + person.last + "|" + $("#result").text();

	assert.equal(result, "newLast,newFirst--updatedFirst,updatedLast|updatedLast|updatedFirst|updatedLast|updatedFirst|updatedLast updatedFirst",
	"mytag.bndArgs() and mytag.updateValues().setValues() work correctly for accessing/updating two-way bound tag contextual parameters");

	// =============================== Arrange ===============================
	person = {first: "Jo", last: "Blow"};

	$.templates({
		markup: '{^{mytag name1=first 1 last/}}',
		tags: {
			mytag: {
				bindTo: ["name1", "1"],
				linkedElement: ["input", "#linkedElm2"],
				template: '<input id="linkedElm1"/> <span id="linkedElm2"></span>',
				onAfterLink: function() {
					this.linkedElems[1].text(this.bndArgs()[1]);
				}
			}
		}
	}).link("#result", person);

	mytag = $.view().childTags("mytag")[0];
	linkedEl1 = $("#linkedElm1")[0];
	linkedEl2 = $("#linkedElm2")[0];

	result = linkedEl1.value + "|" + linkedEl2.innerText + "|" + $("#result").text();

	// ................................ Act ..................................
	mytag.updateValues("updatedFirst", "updatedLast").setValues("updatedFirst", "updatedLast");

	result += "--" + mytag.bndArgs() + "|" + linkedEl1.value + "|" + person.first + "|" + person.last + "|" + $("#result").text();

	// ............................... Assert .................................
	assert.equal(result, "Jo|Blow| Blow--updatedFirst,updatedLast|updatedFirst|updatedFirst|updatedLast| updatedLast",
	"mytag.bndArgs() and mytag.updateValues().setValues() work correctly for accessing/updating two-way bound linkedElems");

	// =============================== Arrange ===============================
	person = {first: "Jo", last: "Blow"};

	$.templates({
		markup: '{^{mytag name1=first 1 last/}}',
		tags: {
			mytag: {
				bindTo: ["name1", "1"],
				linkedElement: [undefined, "#linkedElm2"],
				template: '<input id="linkedElm1"/> <span id="linkedElm2"></span>',
				onBind: function() {
					var inputs = this.contents("input");
					this.linkedElems[0] = $(inputs[0]); // Programmatically set linkedElems
				//},
				//onAfterLink: function() {
				//	this.linkedElems[1].text(this.bndArgs()[1]);
				}
			}
		}
	}).link("#result", person);

	mytag = $.view().childTags("mytag")[0];
	linkedEl1 = $("#linkedElm1")[0];
	linkedEl2 = $("#linkedElm2")[0];

	result = ""
		+ (linkedEl1 === mytag.linkedElems[0][0])
		+ (linkedEl2 === mytag.linkedElems[1][0])
		+ (linkedEl1 === mytag.linkedElem[0])
		+ linkedEl1.value + "|" + linkedEl2.innerText + "|" + $("#result").text();

	// ................................ Act ..................................
	mytag.updateValues("updatedFirst", "updatedLast").setValues("updatedFirst", "updatedLast");

	result += "--" + mytag.bndArgs() + "|" + linkedEl1.value + "|" + person.first + "|" + person.last + "|" + $("#result").text();

	// ............................... Assert .................................
	assert.equal(result, "truetruetrueJo|Blow| Blow--updatedFirst,updatedLast|updatedFirst|updatedFirst|updatedLast| updatedLast",
	"Mixed declarative linkedElement and programmatic onBind approaches for defining linkedElems");

	// =============================== Arrange ===============================
	person = {first: "Jo", last: "Blow"};

	$.templates({
		markup: '{^{mytag name1=first 1 last/}}',
		tags: {
			mytag: {
				bindTo: ["name1", "1"],
				linkedElement: [undefined, "#linkedElm2"],
				template: '<input id="linkedElm1"/> <span id="linkedElm2"></span>',
				onBind: function() {
					var inputs = this.contents("input");
					this.linkedElems[0] = $(inputs[0]); // Programmatically set linkedElems
				//},
				//onAfterLink: function() {
				//	this.linkedElems[1].text(this.bndArgs()[0]);
				}
			}
		}
	}).link("#result", person);

	mytag = $.view().childTags("mytag")[0];
	linkedEl1 = $("#linkedElm1")[0];
	linkedEl2 = $("#linkedElm2")[0];

	result = linkedEl1.value + "|" + linkedEl2.innerText + "|" + $("#result").text();

	// ................................ Act ..................................
	mytag.updateValues("updatedFirst", "updatedLast").setValues("updatedFirst", "updatedLast");

	result += "--" + mytag.bndArgs() + "|" + linkedEl1.value + "|" + person.first + "|" + person.last + "|" + $("#result").text();

	// ............................... Assert .................................
	assert.equal(result, "Jo|Blow| Blow--updatedFirst,updatedLast|updatedFirst|updatedFirst|updatedLast| updatedLast",
	"Mixed declarative linkedElement and programmatic onBind approaches for defining linkedElems");

	// =============================== Arrange ===============================
	person = {first: "Jo", last: "Blow"};

	$.templates({
		markup: '{^{mytag name1=first 1 last/}}',
		tags: {
			mytag: {
				bindTo: ["name1", "1"],
				linkedElement: [undefined, "input"],
				linkedCtxParam: ["foo", undefined],
				template: '<input id="linkedElm1"/> <span id="linkedElm2" data-link="~foo"></span>'
			}
		}
	}).link("#result", person);

	mytag = $.view().childTags("mytag")[0];
	linkedEl1 = $("#linkedElm1")[0];
	linkedEl2 = $("#linkedElm2")[0];

	result = linkedEl1.value + "|" + linkedEl2.innerText + "|" + $("#result").text();

	// ................................ Act ..................................
	mytag.updateValues("updatedFirst", "updatedLast").setValues("updatedFirst", "updatedLast");

	result += "--" + mytag.bndArgs() + "|" + linkedEl1.value + "|" + person.first + "|" + person.last + "|" + $("#result").text();

	// ............................... Assert .................................
	assert.equal(result, "Blow|Jo| Jo--updatedFirst,updatedLast|updatedLast|updatedFirst|updatedLast| updatedFirst",
	"linkedCtxParam and linkedElem");

	// =============================== Arrange ===============================
	person = {first: "Jo", last: "Blow"};

	$.templates({
		markup: '{^{mytag first last/}}',
		tags: {
			mytag: {
				bindTo: [0, 1],
				linkedCtxParam: ["foo", undefined],
				template: '<input id="linkedElm1"/> <span id="linkedElm2" data-link="~foo"></span>',
				onBind: function(tagCtx) {
					var inputs = tagCtx.contentView.contents("input");
					tagCtx.linkedElems = [undefined, $(inputs[0])]; // Programmatically set linkedElems
				},
			}
		}
	}).link("#result", person);

	mytag = $.view().childTags("mytag")[0];
	linkedEl1 = $("#linkedElm1")[0];
	linkedEl2 = $("#linkedElm2")[0];

	result = linkedEl1.value + "|" + linkedEl2.innerText + "|" + $("#result").text();

	// ................................ Act ..................................
	mytag.updateValues("updatedFirst", "updatedLast").setValues("updatedFirst", "updatedLast");

	result += "--" + mytag.bndArgs() + "|" + linkedEl1.value + "|" + person.first + "|" + person.last + "|" + $("#result").text();

	// ............................... Assert .................................
	assert.equal(result, "Blow|Jo| Jo--updatedFirst,updatedLast|updatedLast|updatedFirst|updatedLast| updatedFirst",
	"linkedCtxParam plus programmatic setting of linkedElem");

	// =============================== Arrange ===============================
	person = {first: "Jo", last: "Blow",
		cvt: function(first) {
			return first.toUpperCase(); // bindTo: 1 (or [1]) so only one parameter
		},
		cvtbk: function(first) {
			return first.toLowerCase();
		}
	};

	$.templates({
		markup: '{^{mytag 1 first convert=cvt convertBack=cvtbk/}}',
		tags: {
			mytag: {
				bindTo: 1,
				linkedElement: ["input"],
				template: '<input id="linkedElm"/>',
			}
		}
	}).link("#result", person);

	mytag = $.view().childTags("mytag")[0];
	linkedEl = mytag.linkedElem[0];

	result = linkedEl.value;

	linkedEl.value += "+";
	mytag.linkedElem.change();

	result = person.first + "|" + person.last;

	// ................................ Act ..................................
	mytag.updateValue("updatedFirst").setValue(mytag.bndArgs()[0]);

	result += "--" + mytag.bndArgs() + "|" + linkedEl.value + "|" + person.first + "|" + person.last;

	// ............................... Assert .................................
	assert.equal(result, "jo+|Blow--UPDATEDFIRST|UPDATEDFIRST|updatedfirst|Blow",
	"bindTo:1 with converters, using linkedElement with selector");

	// =============================== Arrange ===============================
	person = {first: "Jo", last: "Blow",
		cvt: function(arg1, arg2) {
			return arg1.toUpperCase(); // No bindTo specified, so parameters are all the args
		},
		cvtbk: function(first) {
			return first.toLowerCase(); // No bindTo specified, so parameter is the linkedElem value
		}
	};

	$.templates({
		markup: '{^{mytag first last convert=cvt convertBack=cvtbk/}}',
		tags: {
			mytag: {
				linkedElement: ["input"],
				template: '<input id="linkedElm"/>',
			}
		}
	}).link("#result", person);

	mytag = $.view().childTags("mytag")[0];
	linkedEl = mytag.linkedElem[0];

	linkedEl.value += "+";
	mytag.linkedElem.change();

	result = person.first + "|" + person.last;

	// ................................ Act ..................................
	mytag.updateValues("updatedFirst", "updatedLast").setValues(mytag.bndArgs()[0], mytag.bndArgs()[1]);

	result += "--" + mytag.bndArgs() + "|" + linkedEl.value + "|" + person.first + "|" + person.last;

	// ............................... Assert .................................
	assert.equal(result, "jo+|Blow--UPDATEDFIRST|UPDATEDFIRST|updatedfirst|Blow",
	"linkedEl with converters (no bindTo), using linkedElement with selector");

	// =============================== Arrange ===============================
	person = {first: "Jo", last: "Blow",
		cvt: function(first, last) {
			return [first + "*", last.toUpperCase()]; // bindTo: ["name1", 1] so two parameters - the bound args (as returned by tag.bndArgs())
		},
		cvtbk: function(first, last) {
			return [first, last.toLowerCase()];
		}
	};

	$.templates({
		markup: '{^{mytag name1=first 1 last convert=cvt convertBack=cvtbk/}}',
		tags: {
			mytag: {
				bindTo: ["name1", "1"],
				linkedElement: [undefined, "input"],
				linkedCtxParam: ["foo", undefined],
				template: '<input id="linkedElm2"/> <span id="linkedElm1" data-link="~foo"></span>'
			}
		}
	}).link("#result", person);

	mytag = $.view().childTags("mytag")[0];
	linkedEl1 = mytag.contents("#linkedElm1")[0]; // first - param
	linkedEl2 = mytag.linkedElems[1][0]; // last - el

	result = linkedEl1.innerText + "," + linkedEl2.value; // Jo*, BLOW

	linkedEl2.value += "+"; // BLOW+
	mytag.linkedElems[1].change();

	result += "|" + person.first + "," + person.last;

	// ................................ Act ..................................
	mytag.updateValues("updatedFirst", "updatedLast");
	mytag.setValues(mytag.bndArgs()[0], mytag.bndArgs()[1]);

	result += "|" + mytag.bndArgs() + "|" + linkedEl1.innerText + "," + linkedEl2.value + "|" + person.first + "," + person.last;

	// ............................... Assert .................................
	assert.equal(result, "Jo*,BLOW|Jo,blow+|updatedFirst*,UPDATEDLAST|updatedFirst*,UPDATEDLAST|updatedFirst,updatedlast",
	"bindTo with converters, using linkedElement and linkedCtxParam");

	// =============================== Arrange ===============================
	$.views.tags("mytag", {
		bindTo: ["height", "width"],
		linkedElement: [".ht", ".wd"],
		linkedCtxParam: ["ht", "wd"],
		mainElement: "div",
		template: "<div class='mytag'>{{include tmpl=#content/}}</div>",
		onBind: function() {
			var tag = this;
			tag.mainElem.mousedown(function(ev) {
				var mainElem = tag.mainElem[0],
					addedWidth = tag.mainElem.width() - ev.clientX,
					addedHeight = tag.mainElem.height() - ev.clientY;
				if (document.elementFromPoint(ev.clientX, ev.clientY) === mainElem) {
					$(document.body).mousemove(function(ev2) {
						var moveToX  = ev2.clientX + addedWidth;
						var moveToY  = ev2.clientY + addedHeight;
						tag.updateValues(moveToY, moveToX);
					});
				}
			});
			$(document.body).mouseup(function() {
				$(document.body).off("mousemove");
			});
		},
		setValue: function(val, index, tagElse, ev, eventArgs) {
			if (val === undefined) {
				val = this.getValue(tagElse)[index];
			} else {
				this.mainElem[index ? "width" : "height"](val || 0);
			}
			this.tagCtxs[tagElse].ctxPrm(this.linkedCtxParam[index], val);
			return val;
		},
		getValue: function() {
			var mainElem = this.mainElem;
			return [mainElem.height(), mainElem.width()];
		},
		onUpdate: false,
		setSize: true
	});

	var tmpl = $.templates('{^{mytag}}'
			+ '<input class="ht" /> <input class="htc" data-link="~ht" /> <input class="htc" data-link="~ht" />'
			+ '<input class="wd" /> <input class="wdc" data-link="~wd" /> <input class="wdc" data-link="~wd" />'
		+ '{{/mytag}}');

	// ................................ Act ..................................
	tmpl.link("#result");

	mytag = $.view().childTags("mytag")[0];
	var linkedElHt = mytag.contents(true, ".ht")[0];
	var linkedElHt2 = mytag.linkedElems[0][0];
	var linkedElWd = mytag.contents(true, ".wd")[0];
	var linkedElWd2 = mytag.linkedElems[1][0];
	var linkedCtxPrmHts = mytag.contents(true, ".htc");
	var linkedCtxPrmWds = mytag.contents(true, ".wdc");

	result = linkedElHt === linkedElHt2 && linkedElWd === linkedElWd2
		&& linkedElHt.value === linkedCtxPrmHts[0].value && linkedElHt.value === linkedCtxPrmHts[1].value
		&& linkedElWd.value === linkedCtxPrmWds[0].value && linkedElWd.value === linkedCtxPrmWds[1].value;

	// ............................... Assert .................................
	assert.ok(result,
	"linkedElement and linkedCtxParam for unset params are initialized by getValue");

	// ................................ Act ..................................
	linkedElHt.value = 40;
	$(linkedElHt).change();
	linkedCtxPrmWds[1].value = 60;
	$(linkedCtxPrmWds[1]).change();

	result = linkedElHt.value === "40" && linkedCtxPrmHts[0].value === "40" && linkedCtxPrmHts[1].value === "40"
		&& linkedElWd.value === "60" && linkedCtxPrmWds[0].value === "60" && linkedCtxPrmWds[1].value === "60";

	result += "|" + mytag.getValue();

	assert.equal(result, "true|40,60",
	"linkedElement and linkedCtxParam for unset params continue to 2way-bind to shared value which is the tag.setValue/getValue");

	// ................................ Act ..................................
	tmpl = $.templates('{^{mytag height=30 width=40}}'
			+ '<input class="ht" /> <input class="htc" data-link="~ht" /> <input class="htc" data-link="~ht" />'
			+ '<input class="wd" /> <input class="wdc" data-link="~wd" /> <input class="wdc" data-link="~wd" />'
		+ '{{/mytag}}');

	tmpl.link("#result");

	mytag = $.view().childTags("mytag")[0];
	linkedElHt = mytag.contents(true, ".ht")[0];
	linkedElWd = mytag.contents(true, ".wd")[0];
	linkedCtxPrmHts = mytag.contents(true, ".htc");
	linkedCtxPrmWds = mytag.contents(true, ".wdc");

	result = linkedElHt.value === "30" && linkedCtxPrmHts[0].value === "30" && linkedCtxPrmHts[1].value === "30"
		&& linkedElWd.value === "40" && linkedCtxPrmWds[0].value === "40" && linkedCtxPrmWds[1].value === "40";

	result += "|" + mytag.getValue();

	// ............................... Assert .................................
	assert.equal(result, "true|30,40",
	"linkedElement and linkedCtxParam and tag.getValue() for static initial values initialize correctly");

	// ................................ Act ..................................
	linkedElHt.value = 40;
	$(linkedElHt).change();
	linkedCtxPrmWds[1].value = 60;
	$(linkedCtxPrmWds[1]).change();

	result = linkedElHt.value === "40" && linkedCtxPrmHts[0].value === "40" && linkedCtxPrmHts[1].value === "40"
		&& linkedElWd.value === "60" && linkedCtxPrmWds[0].value === "60" && linkedCtxPrmWds[1].value === "60";

	result += "|" + mytag.getValue();

	// ............................... Assert .................................
	assert.equal(result, "true|40,60",
	"linkedElement and linkedCtxParam for static initial values continue to 2way-bind to shared value which is the tag.setValue/getValue value");

	// ................................ Act ..................................
	mytag.setValues(140, 160);
	mytag.updateValues(140, 160);

	result = linkedElHt.value === "140" && linkedCtxPrmHts[0].value === "140" && linkedCtxPrmHts[1].value === "140"
		&& linkedElWd.value === "160" && linkedCtxPrmWds[0].value === "160" && linkedCtxPrmWds[1].value === "160";

	result += "|" + mytag.getValue();

	// ............................... Assert .................................
	assert.equal(result, "true|140,160",
	"linkedElement and linkedCtxParam for static initial values continue to 2way-bind to shared value set by tag.setValues(), mytag.updateValues()");

	// ................................ Act ..................................
	tmpl = $.templates('<input class="cx" data-link="cx" /> <input class="cy" data-link="cy" />'
	+ '{^{mytag height=cy width=cx}}'
			+ '<input class="ht" /> <input class="htc" data-link="~ht" /> <input class="htc" data-link="~ht" />'
			+ '<input class="wd" /> <input class="wdc" data-link="~wd" /> <input class="wdc" data-link="~wd" />'
		+ '{{/mytag}}');

	tmpl.link("#result", {cx: 40, cy: 30});

	mytag = $.view().childTags("mytag")[0];
	linkedElHt = mytag.contents(true, ".ht")[0];
	linkedElWd = mytag.contents(true, ".wd")[0];
	linkedCtxPrmHts = mytag.contents(true, ".htc");
	linkedCtxPrmWds = mytag.contents(true, ".wdc");
	var linkedElCx = $(".cx")[0],
		linkedElCy = $(".cy")[0];

	result = linkedElCy.value === "30" && linkedElHt.value === "30" && linkedCtxPrmHts[0].value === "30" && linkedCtxPrmHts[1].value === "30"
		 && linkedElCx.value === "40" && linkedElWd.value === "40" && linkedCtxPrmWds[0].value === "40" && linkedCtxPrmWds[1].value === "40";

	result += "|" + mytag.getValue();

	// ............................... Assert .................................
	assert.equal(result, "true|30,40",
	"linkedElement and linkedCtxParam and tag.getValue() initialize correctly");

	// ................................ Act ..................................
	linkedElHt.value = 40;
	$(linkedElHt).change();
	linkedCtxPrmWds[1].value = 60;
	$(linkedCtxPrmWds[1]).change();

	result = linkedElCy.value === "40" && linkedElHt.value === "40" && linkedCtxPrmHts[0].value === "40" && linkedCtxPrmHts[1].value === "40"
		&& linkedElCx.value === "60" && linkedElWd.value === "60" && linkedCtxPrmWds[0].value === "60" && linkedCtxPrmWds[1].value === "60";

	result += "|" + mytag.getValue();

	// ............................... Assert .................................
	assert.equal(result, "true|40,60",
	"linkedElement and linkedCtxParam continue to 2way-bind to shared value which is the tag.setValue/getValue value");

	// ................................ Act ..................................
	linkedElCy.value = 50;
	$(linkedElCy).change();
	linkedElCx.value = 70;
	$(linkedElCx).change();

	result = linkedElCy.value === "50" && linkedElHt.value === "50" && linkedCtxPrmHts[0].value === "50" && linkedCtxPrmHts[1].value === "50"
		&& linkedElCx.value === "70" && linkedElWd.value === "70" && linkedCtxPrmWds[0].value === "70" && linkedCtxPrmWds[1].value === "70";

	result += "|" + mytag.getValue();

	// ............................... Assert .................................
	assert.equal(result, "true|50,70",
	"linkedElement and linkedCtxParam continue to 2way-bind to shared value when external bindTo target value changes");

	// ................................ Act ..................................
	mytag.setValues(140, 160);
	mytag.updateValues(140, 160);

	result = linkedElCy.value === "140" && linkedElHt.value === "140" && linkedCtxPrmHts[0].value === "140" && linkedCtxPrmHts[1].value === "140"
		&& linkedElCx.value === "160" && linkedElWd.value === "160" && linkedCtxPrmWds[0].value === "160" && linkedCtxPrmWds[1].value === "160";

	result += "|" + mytag.getValue();

	// ............................... Assert .................................
	assert.equal(result, "true|140,160",
	"linkedElement and linkedCtxParam continue to 2way-bind to shared value set by tag.setValues() - tag.updateValues()");

	// ................................ Act ..................................
	tmpl = $.templates('{^{mytag convert=~plus convertBack=~minus}}'
			+ '<input class="ht" /> <input class="htc" data-link="~ht" /> <input class="htc" data-link="~ht" />'
			+ '<input class="wd" /> <input class="wdc" data-link="~wd" /> <input class="wdc" data-link="~wd" />'
		+ '{{/mytag}}');
	var data = {cx: 100, cy: 200};
	tmpl.link("#result", data, {
	plus: function(height, width) {
		return [height !== undefined ? parseInt(height)+5 : height, width !== undefined ? parseInt(width)+10 : width];
	},
	minus: function(height, width) {
		return [height !== undefined ? parseInt(height)-5 : height, width !== undefined ? parseInt(width)-10 : width];
		}
	});

	mytag = $.view().childTags("mytag")[0];
	var linkedElHt = mytag.contents(true, ".ht")[0];
	var linkedElHt2 = mytag.linkedElems[0][0];
	var linkedElWd = mytag.contents(true, ".wd")[0];
	var linkedElWd2 = mytag.linkedElems[1][0];
	var linkedCtxPrmHts = mytag.contents(true, ".htc");
	var linkedCtxPrmWds = mytag.contents(true, ".wdc");

	result = linkedElHt === linkedElHt2 && linkedElWd === linkedElWd2
		&& linkedElHt.value === linkedCtxPrmHts[0].value && linkedElHt.value === linkedCtxPrmHts[1].value
		&& linkedElWd.value === linkedCtxPrmWds[0].value && linkedElWd.value === linkedCtxPrmWds[1].value
		&& linkedElWd.value === "" + mytag.getValue()[1] && linkedElHt.value === "" + mytag.getValue()[0];

	// ............................... Assert .................................
	assert.ok(result,
	"linkedElement and linkedCtxParam for unset params are initialized by getValue (with converters)");

	// ................................ Act ..................................
	linkedElHt.value = 40;
	$(linkedElHt).change();
	linkedCtxPrmWds[1].value = 60;
	$(linkedCtxPrmWds[1]).change();

	result = linkedElHt.value === "40" && linkedCtxPrmHts[0].value === "40" && linkedCtxPrmHts[1].value === "40"
		&& linkedElWd.value === "60" && linkedCtxPrmWds[0].value === "60" && linkedCtxPrmWds[1].value === "60";

	result += "|" + mytag.getValue();

	// ............................... Assert .................................
	assert.equal(result, "true|40,60",
	"linkedElement and linkedCtxParam for unset params continue to 2way-bind to shared value which is the tag.setValue/getValue (with converters)");

	// ................................ Act ..................................
	tmpl = $.templates('{^{mytag height=30 width=40 convert=~plus convertBack=~minus}}'
			+ '<input class="ht" /> <input class="htc" data-link="~ht" /> <input class="htc" data-link="~ht" />'
			+ '<input class="wd" /> <input class="wdc" data-link="~wd" /> <input class="wdc" data-link="~wd" />'
		+ '{{/mytag}}');

	tmpl.link("#result", {}, {
	plus: function(height, width) {
		return [height !== undefined ? parseInt(height)+5 : height, width !== undefined ? parseInt(width)+10 : width];
	},
	minus: function(height, width) {
		return [height !== undefined ? parseInt(height)-5 : height, width !== undefined ? parseInt(width)-10 : width];
		}
	});

	mytag = $.view().childTags("mytag")[0];
	linkedElHt = mytag.contents(true, ".ht")[0];
	linkedElWd = mytag.contents(true, ".wd")[0];
	linkedCtxPrmHts = mytag.contents(true, ".htc");
	linkedCtxPrmWds = mytag.contents(true, ".wdc");

	result = linkedElHt.value === "35" && linkedCtxPrmHts[0].value === "35" && linkedCtxPrmHts[1].value === "35"
		&& linkedElWd.value === "50" && linkedCtxPrmWds[0].value === "50" && linkedCtxPrmWds[1].value === "50";

	result += "|" + mytag.getValue();

	// ............................... Assert .................................
	assert.equal(result, "true|35,50",
	"linkedElement and linkedCtxParam and tag.getValue() for static initial values initialize correctly (with converters)");

	// ................................ Act ..................................
	linkedElHt.value = 40;
	$(linkedElHt).change();
	linkedCtxPrmWds[1].value = 60;
	$(linkedCtxPrmWds[1]).change();

	result = linkedElHt.value === "40" && linkedCtxPrmHts[0].value === "40" && linkedCtxPrmHts[1].value === "40"
		&& linkedElWd.value === "60" && linkedCtxPrmWds[0].value === "60" && linkedCtxPrmWds[1].value === "60";

	result += "|" + mytag.getValue();

	// ............................... Assert .................................
	assert.equal(result, "true|40,60",
	"linkedElement and linkedCtxParam for static initial values continue to 2way-bind to shared value which is the tag.setValue/getValue value (with converters)");

	// ................................ Act ..................................
	mytag.setValue(140, 0);
	mytag.setValue(160, 1);
	mytag.updateValues(140, 160);

	result = linkedElHt.value === "140" && linkedCtxPrmHts[0].value === "140" && linkedCtxPrmHts[1].value === "140"
		&& linkedElWd.value === "160" && linkedCtxPrmWds[0].value === "160" && linkedCtxPrmWds[1].value === "160";

	result += "|" + mytag.getValue();

	// ............................... Assert .................................
	assert.equal(result, "true|140,160",
	"linkedElement and linkedCtxParam for static initial values continue to 2way-bind to shared value set by tag.setValue(), mytag.updateValues() (with converters)");

	// ................................ Act ..................................
	tmpl = $.templates('<input class="cx" data-link="cx" /> <input class="cy" data-link="cy" />'
	+ '{^{mytag height=cy width=cx convert=~plus convertBack=~minus}}'
			+ '<input class="ht" /> <input class="htc" data-link="~ht" /> <input class="htc" data-link="~ht" />'
			+ '<input class="wd" /> <input class="wdc" data-link="~wd" /> <input class="wdc" data-link="~wd" />'
		+ '{{/mytag}}');

	tmpl.link("#result", {cx: 40, cy: 30}, {
	plus: function(height, width) {
		return [height !== undefined ? parseInt(height)+5 : height, width !== undefined ? parseInt(width)+10 : width];
	},
	minus: function(height, width) {
		return [height !== undefined ? parseInt(height)-5 : height, width !== undefined ? parseInt(width)-10 : width];
		}
	});

	mytag = $.view().childTags("mytag")[0];
	linkedElHt = mytag.contents(true, ".ht")[0];
	linkedElWd = mytag.contents(true, ".wd")[0];
	linkedCtxPrmHts = mytag.contents(true, ".htc");
	linkedCtxPrmWds = mytag.contents(true, ".wdc");
	linkedElCx = $(".cx")[0];
	linkedElCy = $(".cy")[0];

	result = linkedElCy.value === "30" && linkedElHt.value === "35" && linkedCtxPrmHts[0].value === "35" && linkedCtxPrmHts[1].value === "35"
		 && linkedElCx.value === "40" && linkedElWd.value === "50" && linkedCtxPrmWds[0].value === "50" && linkedCtxPrmWds[1].value === "50";

	result += "|" + mytag.getValue();

	// ............................... Assert .................................
	assert.equal(result, "true|35,50",
	"linkedElement and linkedCtxParam and tag.getValue() initialize correctly (with converters)");

	// ................................ Act ..................................
	linkedElHt.value = 40;
	$(linkedElHt).change();
	linkedCtxPrmWds[1].value = 60;
	$(linkedCtxPrmWds[1]).change();

	result = linkedElCy.value === "35" && linkedElHt.value === "40" && linkedCtxPrmHts[0].value === "40" && linkedCtxPrmHts[1].value === "40"
		&& linkedElCx.value === "50" && linkedElWd.value === "60" && linkedCtxPrmWds[0].value === "60" && linkedCtxPrmWds[1].value === "60";

	result += "|" + mytag.getValue();

	// ............................... Assert .................................
	assert.equal(result, "true|40,60",
	"linkedElement and linkedCtxParam continue to 2way-bind to shared value which is the tag.setValue/getValue value (with converters)");

	// ................................ Act ..................................
	linkedElCy.value = 50;
	$(linkedElCy).change();
	linkedElCx.value = 70;
	$(linkedElCx).change();

	result = linkedElCy.value === "50" && linkedElHt.value === "55" && linkedCtxPrmHts[0].value === "55" && linkedCtxPrmHts[1].value === "55"
		&& linkedElCx.value === "70" && linkedElWd.value === "80" && linkedCtxPrmWds[0].value === "80" && linkedCtxPrmWds[1].value === "80";

	result += "|" + mytag.getValue();

	// ............................... Assert .................................
	assert.equal(result, "true|55,80",
	"linkedElement and linkedCtxParam continue to 2way-bind to shared value when external bindTo target value changes (with converters)");

	// ................................ Act ..................................
	mytag.setValue(140, 0);
	mytag.setValue(160, 1);
	mytag.updateValues(140, 160);

	result = linkedElCy.value === "135" && linkedElHt.value === "140" && linkedCtxPrmHts[0].value === "140" && linkedCtxPrmHts[1].value === "140"
		&& linkedElCx.value === "150" && linkedElWd.value === "160" && linkedCtxPrmWds[0].value === "160" && linkedCtxPrmWds[1].value === "160";

	result += "|" + mytag.getValue();

	// ............................... Assert .................................
	assert.equal(result, "true|140,160",
	"linkedElement and linkedCtxParam continue to 2way-bind to shared value set by tag.setValue() - tag.updateValues() (with converters)");

	// ................................ Act ..................................
	tmpl = $.templates('<input class="cx" data-link="cx" /> <input class="cy" data-link="cy" />'
	+ '{^{mytag width=cx convert=~plus convertBack=~minus}}'
			+ '<input class="ht" /> <input class="htc" data-link="~ht" /> <input class="htc" data-link="~ht" />'
			+ '<input class="wd" /> <input class="wdc" data-link="~wd" /> <input class="wdc" data-link="~wd" />'
		+ '{{/mytag}}');

	tmpl.link("#result", {cx: 40, cy: 30}, {
	plus: function(height, width) {
		return [height !== undefined ? parseInt(height)+5 : height, width !== undefined ? parseInt(width)+10 : width];
	},
	minus: function(height, width) {
		return [height !== undefined ? parseInt(height)-5 : height, width !== undefined ? parseInt(width)-10 : width];
		}
	});

	mytag = $.view().childTags("mytag")[0];
	linkedElHt = mytag.contents(true, ".ht")[0];
	linkedElWd = mytag.contents(true, ".wd")[0];
	linkedCtxPrmHts = mytag.contents(true, ".htc");
	linkedCtxPrmWds = mytag.contents(true, ".wdc");
	linkedElCx = $(".cx")[0];
	linkedElCy = $(".cy")[0];

	result = linkedElHt.value === linkedCtxPrmHts[0].value && linkedElHt.value === linkedCtxPrmHts[1].value && Math.round(10*linkedElHt.value) === Math.round(10*mytag.getValue()[0])
		 && linkedElCx.value === "40" && linkedElWd.value === "50" && linkedCtxPrmWds[0].value === "50" && linkedCtxPrmWds[1].value === "50";

	result += "|" + mytag.getValue()[1];

	// ............................... Assert .................................
	assert.equal(result, "true|50",
	"linkedElement and linkedCtxParam and tag.getValue() initialize correctly (One bindTo param bound, other uninitialized. With converters)");

	// ................................ Act ..................................
	linkedElHt.value = 40;
	$(linkedElHt).change();
	linkedCtxPrmWds[1].value = 60;
	$(linkedCtxPrmWds[1]).change();

	result = linkedElCy.value === "30" && linkedElHt.value === "40" && linkedCtxPrmHts[0].value === "40" && linkedCtxPrmHts[1].value === "40"
		&& linkedElCx.value === "50" && linkedElWd.value === "60" && linkedCtxPrmWds[0].value === "60" && linkedCtxPrmWds[1].value === "60";

	result += "|" + mytag.getValue();

	// ............................... Assert .................................
	assert.equal(result, "true|40,60",
	"linkedElement and linkedCtxParam continue to 2way-bind to shared value which is the tag.setValue/getValue value (One bindTo param bound, other uninitialized. With converters)");

	// ................................ Act ..................................
	linkedElCy.value = 50;
	$(linkedElCy).change();
	linkedElCx.value = 70;
	$(linkedElCx).change();

	result = linkedElCy.value === "50" && linkedElHt.value === "40" && linkedCtxPrmHts[0].value === "40" && linkedCtxPrmHts[1].value === "40"
		&& linkedElCx.value === "70" && linkedElWd.value === "80" && linkedCtxPrmWds[0].value === "80" && linkedCtxPrmWds[1].value === "80";

	result += "|" + mytag.getValue();

	// ............................... Assert .................................
	assert.equal(result, "true|40,80",
	"linkedElement and linkedCtxParam continue to 2way-bind to shared value when external bindTo target value changes (One bindTo param bound, other uninitialized. With converters)");

	// ................................ Act ..................................
	mytag.setValues(140, 160);
	mytag.updateValues(140, 160);

	result = linkedElCy.value === "50" && linkedElHt.value === "140" && linkedCtxPrmHts[0].value === "140" && linkedCtxPrmHts[1].value === "140"
		&& linkedElCx.value === "150" && linkedElWd.value === "160" && linkedCtxPrmWds[0].value === "160" && linkedCtxPrmWds[1].value === "160";

	result += "|" + mytag.getValue();

	// ............................... Assert .................................
	assert.equal(result, "true|140,160",
	"linkedElement and linkedCtxParam continue to 2way-bind to shared value set by tag.setValues() - tag.updateValues() (One bindTo param bound, other uninitialized. With converters)");

	// =============================== Arrange ===============================
	person = {first: "Jo", middle: "Herbert", last: "Blow"};

	$.templates({
		markup:
			'{^{textbox first label="First"}} {^{child ~nm/}}'
			+ '{{else middle label="Middle"}} {^{child ~nm/}}'
			+ '{{else last label="Last"}} {^{child ~nm/}}'
		+ '{{/textbox}}'
		+ '<input data-link="first" class="block"/>'
		+ '<input data-link="middle" class="block"/>'
		+ '<input data-link="last" class="block"/>: '
		+ '{^{:first}} {^{:middle}} {^{:last}}',
		tags: {
			textbox: {
				linkedCtxParam: "nm",
				onBind: function() {
					// Find input in contents
					var l = this.tagCtxs.length;
					while (l--) {
						var tagCtx = this.tagCtxs[l];
						tagCtx.linkedElems = [tagCtx.contents("input")];
					}
				},
				template: "<em> {{:~tagCtx.props.label}}</em><input id='{{:~tagCtx.props.label}}' />{^{include tmpl=#content/}}",
				onUpdate: false, // No need to re-render whole tag, when content updates.
			},
			child: function(val) {
				return val;
			}
		}
	}).link("#result", person);

	var linkedElFirst = $("#First")[0],
	linkedElMiddle = $("#Middle")[0],
	linkedElLast = $("#Last")[0],
	mytag = $.view(linkedElFirst).tag;

	function getResult() {
		return "Data: " + person.first + "-" + person.middle + "-" + person.last
			+ " Inputs: " + linkedElFirst.value + "-" + linkedElMiddle.value + "-" + linkedElLast.value
			+ " Text:" + $("#result").text() + "|";
	}

	// ............................... Assert .................................
	assert.equal(getResult(), "Data: Jo-Herbert-Blow Inputs: Jo-Herbert-Blow Text: First Jo Middle Herbert Last Blow: Jo Herbert Blow|",
	"Two-way bound tag with multiple else blocks - initial render");

	// ................................ Act ..................................
	$.observable(person).setProperty({first: "Bob", middle: "Xavier", last: "Smith"});

	// ............................... Assert .................................
	assert.equal(getResult(), "Data: Bob-Xavier-Smith Inputs: Bob-Xavier-Smith Text: First Bob Middle Xavier Last Smith: Bob Xavier Smith|",
	"Two-way bound tag with multiple else blocks - observable update");

	// ................................ Act ..................................
	linkedElFirst.value = "newJo"
	linkedElMiddle.value = "newHerbert"
	linkedElLast.value = "newBlow"
	$(linkedElFirst).change();
	$(linkedElMiddle).change();
	$(linkedElLast).change();

	// ............................... Assert .................................
	assert.equal(getResult(), "Data: newJo-newHerbert-newBlow Inputs: newJo-newHerbert-newBlow"
		+ " Text: First newJo Middle newHerbert Last newBlow: newJo newHerbert newBlow|",
	"Two-way bound tag with multiple else blocks - updated inputs");

	// ................................ Act ..................................
	mytag.updateValue("updatedFirst", 0, 0);
	mytag.updateValue("updatedMiddle", 0, 1);
	mytag.updateValue("updatedLast", 0, 2);

	// ............................... Assert .................................
	assert.equal(getResult(), "Data: updatedFirst-updatedMiddle-updatedLast Inputs: newJo-newHerbert-newBlow"
		+ " Text: First updatedFirst Middle updatedMiddle Last updatedLast: updatedFirst updatedMiddle updatedLast|",
	"Two-way bound tag with multiple else blocks - tag.updateValue() updates outer bindings and linkedCtxPrm, but not linkedElems");

	// ................................ Act ..................................
	mytag.updateValues("updatedFirst2");

	// ............................... Assert .................................
	assert.equal(getResult(), "Data: updatedFirst2-updatedMiddle-updatedLast Inputs: newJo-newHerbert-newBlow"
		+ " Text: First updatedFirst2 Middle updatedMiddle Last updatedLast: updatedFirst2 updatedMiddle updatedLast|",
	"Two-way bound tag with multiple else blocks - tag.updateValues() updates outer bindings and linkedCtxPrm, but not linkedElems");

	// ................................ Act ..................................
	mytag.setValue("changedFirst", 0, 0);
	mytag.setValue("changedMiddle", 0, 1);
	mytag.setValue("changedLast", 0, 2);

	// ............................... Assert .................................
	assert.equal(getResult(), "Data: changedFirst-changedMiddle-changedLast Inputs: changedFirst-changedMiddle-changedLast"
		+ " Text: First changedFirst Middle changedMiddle Last changedLast: changedFirst changedMiddle changedLast|",
	"Two-way bound tag with multiple else blocks - tag.setValue() updates linkedElems and linkedCtxPrms");

	// ................................ Act ..................................
	mytag.setValues("changedFirst2");

	// ............................... Assert .................................
	assert.equal(getResult(), "Data: changedFirst2-changedMiddle-changedLast Inputs: changedFirst2-changedMiddle-changedLast"
		+ " Text: First changedFirst2 Middle changedMiddle Last changedLast: changedFirst2 changedMiddle changedLast|",
	"Two-way bound tag with multiple else blocks - tag.setValues() updates linkedElems and linkedCtxPrms");

	// ............................... Assert .................................
	assert.ok(mytag.contents("input")[1] === mytag.tagCtxs[1].contents("input")[0]
		&& mytag.nodes()[5] === mytag.tagCtxs[1].nodes()[1]
		&& mytag.nodes()[5] === mytag.tagCtxs[1].contentView.nodes()[1]
		&& mytag.childTags("child")[1] === mytag.tagCtxs[1].childTags("child")[0]
		&& mytag.childTags("child").length === mytag.tagCtxs[0].childTags("child").length + mytag.tagCtxs[1].childTags("child").length +  mytag.tagCtxs[2].childTags("child").length,
	"Two-way bound tag, multiple else blocks: calls tagCtx.contents() tagCtx.nodes() tagCtx.childTags() return from one else block."
	+ " (Whereas tag.contents() etc returns from all else blocks)");

	// =============================== Arrange ===============================
	person = {first: "Jo", middle: "Herbert", last: "Blow"};

	$.templates({
		markup:
			'{^{textbox first label="First"}} {^{child ~nm/}}'
			+ '{{else middle label="Middle"}} {^{child ~nm/}}'
			+ '{{else last label="Last"}} {^{child ~nm/}}'
		+ '{{/textbox}}'
		+ '<input data-link="first" class="block"/>'
		+ '<input data-link="middle" class="block"/>'
		+ '<input data-link="last" class="block"/>: '
		+ '{^{:first}} {^{:middle}} {^{:last}}',
		tags: {
			textbox: {
				render: function() {
					return "<em> " + this.tagCtx.props.label + "</em><input id='" + this.tagCtx.props.label + "' />" + this.tagCtx.render();
				},
				linkedCtxParam: "nm",
				onBind: function() {
					// Find input in contents
					var l = this.tagCtxs.length;
					while (l--) {
						var tagCtx = this.tagCtxs[l];
						tagCtx.linkedElems = [tagCtx.contents("input")];
					}
				},
				onUpdate: false, // No need to re-render whole tag, when content updates.
			},
			child: function(val) {
				return val;
			}
		}
	}).link("#result", person);

	linkedElFirst = $("#First")[0];
	linkedElMiddle = $("#Middle")[0];
	linkedElLast = $("#Last")[0];
	mytag = $.view(linkedElFirst).tag;

	// ............................... Assert .................................
	assert.equal(getResult(), "Data: Jo-Herbert-Blow Inputs: Jo-Herbert-Blow Text: First Jo Middle Herbert Last Blow: Jo Herbert Blow|",
	"Two-way bound tag (using render method) with multiple else blocks - initial render");

	// ................................ Act ..................................
	$.observable(person).setProperty({first: "Bob", middle: "Xavier", last: "Smith"});

	// ............................... Assert .................................
	assert.equal(getResult(), "Data: Bob-Xavier-Smith Inputs: Bob-Xavier-Smith Text: First Bob Middle Xavier Last Smith: Bob Xavier Smith|",
	"Two-way bound tag (using render method) with multiple else blocks - observable update");

	// ................................ Act ..................................
	linkedElFirst.value = "newJo"
	linkedElMiddle.value = "newHerbert"
	linkedElLast.value = "newBlow"
	$(linkedElFirst).change();
	$(linkedElMiddle).change();
	$(linkedElLast).change();

	// ............................... Assert .................................
	assert.equal(getResult(), "Data: newJo-newHerbert-newBlow Inputs: newJo-newHerbert-newBlow"
		+ " Text: First newJo Middle newHerbert Last newBlow: newJo newHerbert newBlow|",
	"Two-way bound tag (using render method) with multiple else blocks - updated inputs");

	// ................................ Act ..................................
	mytag.updateValue("updatedFirst", 0, 0);
	mytag.updateValue("updatedMiddle", 0, 1);
	mytag.updateValue("updatedLast", 0, 2);

	// ............................... Assert .................................
	assert.equal(getResult(), "Data: updatedFirst-updatedMiddle-updatedLast Inputs: newJo-newHerbert-newBlow"
		+ " Text: First updatedFirst Middle updatedMiddle Last updatedLast: updatedFirst updatedMiddle updatedLast|",
	"Two-way bound tag (using render method) with multiple else blocks - tag.updateValue() updates outer bindings and linkedCtxPrm, but not linkedElems");

	// ................................ Act ..................................
	mytag.updateValues("updatedFirst2");

	// ............................... Assert .................................
	assert.equal(getResult(), "Data: updatedFirst2-updatedMiddle-updatedLast Inputs: newJo-newHerbert-newBlow"
		+ " Text: First updatedFirst2 Middle updatedMiddle Last updatedLast: updatedFirst2 updatedMiddle updatedLast|",
	"Two-way bound tag (using render method) with multiple else blocks - tag.updateValues() updates outer bindings and linkedCtxPrm, but not linkedElems");

	// ................................ Act ..................................
	mytag.setValue("changedFirst", 0, 0);
	mytag.setValue("changedMiddle", 0, 1);
	mytag.setValue("changedLast", 0, 2);

	// ............................... Assert .................................
	assert.equal(getResult(), "Data: changedFirst-changedMiddle-changedLast Inputs: changedFirst-changedMiddle-changedLast"
		+ " Text: First changedFirst Middle changedMiddle Last changedLast: changedFirst changedMiddle changedLast|",
	"Two-way bound tag (using render method) with multiple else blocks - tag.setValue() updates linkedElems and linkedCtxPrms");

	// ................................ Act ..................................
	mytag.setValues("changedFirst2");

	// ............................... Assert .................................
	assert.equal(getResult(), "Data: changedFirst2-changedMiddle-changedLast Inputs: changedFirst2-changedMiddle-changedLast"
		+ " Text: First changedFirst2 Middle changedMiddle Last changedLast: changedFirst2 changedMiddle changedLast|",
	"Two-way bound tag (using render method) with multiple else blocks - tag.setValues() updates linkedElems and linkedCtxPrms");

	// ............................... Assert .................................
	assert.ok(mytag.contents("input")[1] === mytag.tagCtxs[1].contents("input")[0]
		&& mytag.nodes()[5] === mytag.tagCtxs[1].nodes()[1]
		&& mytag.childTags("child")[1] === mytag.tagCtxs[1].childTags("child")[0],
	"Two-way bound tag (using render method) with multiple else blocks - calls to tagCtx.contents() tagCtx.nodes() tagCtx.childTags() work correctly");

	// =============================== Arrange ===============================
	var person = {first: "Jo", last: "Blow"};

	$.templates({
		markup: '{^{mytag 0 prop=first last}}{{else 0 prop=last first}}{{/mytag}} {^{:first}} {^{:last}}',
		tags: {
			mytag: {
				bindTo: ["prop", 1],
				template: '<input/><input/> <span class="nm"></span><br/>',
				onBind: function() {
					var tagCtx0 = this.tagCtxs[0];
					var tagCtx1 = this.tagCtxs[1];
					var inputs0 = tagCtx0.contents("input");
					var inputs1 = tagCtx1.contents("input");
					tagCtx0.linkedElems = [$(inputs0[0]), $(inputs0[1])]; // Programmatically set linkedElems
					tagCtx1.linkedElems = [$(inputs1[0]), $(inputs1[1])]; // Programmatically set linkedElems
				},
				onAfterLink: function() {
					var tagCtx0 = this.tagCtxs[0];
					var tagCtx1 = this.tagCtxs[1];
					var span0 = tagCtx0.contents(".nm");
					var span1 = tagCtx1.contents(".nm");
					span0.text(tagCtx0.bndArgs()[0] + " " + tagCtx0.bndArgs()[1]); // Programmatically update span content
					span1.text(tagCtx1.bndArgs()[0] + " " + tagCtx1.bndArgs()[1]); // Programmatically update span content
				},
				onUpdate: false
			}
		}
	}).link("#result", person);

	mytag = $.view().childTags()[0];
	var linkedElems0 = mytag.tagCtx.contents("input");
	var linkedElems1 = mytag.tagCtxs[1].contents("input");

	function getResult2() {
		return "Data: " + person.first + "-" + person.last
			+ " Inputs: " + linkedElems0[0].value + "-" + linkedElems0[1].value + "-" + linkedElems1[0].value + "-" + linkedElems1[1].value
			+ " Text:" + $("#result").text() + "|";
	}

	// ............................... Assert .................................
	assert.equal(getResult2(), "Data: Jo-Blow Inputs: Jo-Blow-Blow-Jo Text: Jo Blow Blow Jo Jo Blow|",
	"Two-way tag with multiple bindings and multiple else blocks - initial render");

	// ................................ Act ..................................
	$.observable(person).setProperty({first: "Bob", last: "Smith"});

	// ............................... Assert .................................
	assert.equal(getResult2(), "Data: Bob-Smith Inputs: Bob-Smith-Smith-Bob Text: Bob Smith Smith Bob Bob Smith|",
	"Two-way tag with multiple bindings and multiple else blocks - observable update");

	// ................................ Act ..................................
 // Change inputs of {{else}} block
	linkedElems1[0].value = "newBlow"
	linkedElems1[1].value = "newJo"
	$(linkedElems1[0]).change();
	$(linkedElems1[1]).change();

	// ............................... Assert .................................
	assert.equal(getResult2(), "Data: newJo-newBlow Inputs: Bob-Smith-newBlow-newJo Text: newJo newBlow newBlow newJo newJo newBlow|",
	"Two-way tag with multiple bindings and multiple else blocks - updated inputs");

	// ................................ Act ..................................
 // Update each value for {{else}} block
	mytag.updateValue("updatedLast", 0, 1);
	mytag.updateValue("updatedFirst", 1, 1);

	// ............................... Assert .................................
	assert.equal(getResult2(), "Data: updatedFirst-updatedLast Inputs: Bob-Smith-newBlow-newJo"
		+ " Text: updatedFirst updatedLast updatedLast updatedFirst updatedFirst updatedLast|",
	"Two-way tag with multiple bindings and multiple else blocks - tag.updateValue() updates outer bindings but not linkedElems");

	// ................................ Act ..................................
 // Update values for tag (main block)
	mytag.updateValues("updatedFirst2", "updatedLast2");

	// ............................... Assert .................................
	assert.equal(getResult2(), "Data: updatedFirst2-updatedLast2 Inputs: Bob-Smith-newBlow-newJo"
		+ " Text: updatedFirst2 updatedLast2 updatedLast2 updatedFirst2 updatedFirst2 updatedLast2|",
	"Two-way tag with multiple bindings and multiple else blocks - tag.updateValues() updates outer bindings but not linkedElems");

	// ................................ Act ..................................
 // Set each value for {{else}} block
	mytag.setValue("changedLast", 0, 1);
	mytag.setValue("changedFirst", 1, 1);

	// ............................... Assert .................................
	assert.equal(getResult2(), "Data: updatedFirst2-updatedLast2 Inputs: Bob-Smith-changedLast-changedFirst"
		+ " Text: updatedFirst2 updatedLast2 updatedLast2 updatedFirst2 updatedFirst2 updatedLast2|",
	"Two-way tag with multiple bindings and multiple else blocks - tag.setValue() updates linkedElems only");

	// ................................ Act ..................................
 // Set values for {{else}} block
	mytag.tagCtxs[1].setValues("changedLast2", "changedFirst2");

	// ............................... Assert .................................
	assert.equal(getResult2(), "Data: updatedFirst2-updatedLast2 Inputs: Bob-Smith-changedLast2-changedFirst2"
		+ " Text: updatedFirst2 updatedLast2 updatedLast2 updatedFirst2 updatedFirst2 updatedLast2|",
	"Two-way tag with multiple bindings and multiple else blocks - tagCtx.setValues() updates linkedElems only");

	// ................................ Act ..................................
 // Set values for tag (main block)
	mytag.setValues("changedFirst3", "changedLast3");

	// ............................... Assert .................................
	assert.equal(getResult2(), "Data: updatedFirst2-updatedLast2 Inputs: changedFirst3-changedLast3-changedLast2-changedFirst2"
		+ " Text: updatedFirst2 updatedLast2 updatedLast2 updatedFirst2 updatedFirst2 updatedLast2|",
	"Two-way tag with multiple bindings and multiple else blocks - tag.setValues() updates linkedElems only");

	// ............................... Assert .................................
	assert.ok(mytag.contents("input")[3] === mytag.tagCtxs[1].contents("input")[1]
		&& mytag.nodes()[6] === mytag.tagCtxs[1].nodes()[1],
	"Two-way tag with multiple bindings and multiple else blocks - calls to tagCtx.contents() tagCtx.nodes() work correctly");

	// ............................... Assert .................................
	assert.equal("" + mytag.cvtArgs() + "|" + mytag.tagCtxs[0].cvtArgs() + "|" + mytag.tagCtxs[1].cvtArgs()
		+ "--" + mytag.bndArgs() + "|" + mytag.tagCtxs[0].bndArgs() + "|" + mytag.tagCtxs[1].bndArgs(),
		"0,updatedLast2|0,updatedLast2|0,updatedFirst2--updatedFirst2,updatedLast2|updatedFirst2,updatedLast2|updatedLast2,updatedFirst2",
	"Two-way tag with multiple bindings and multiple else blocks - calls to tag.cvtArgs(), tagCtx.cvtArgs() tag.bndArgs() tagCtx.bndArgs() work correctly");

// ............................... Reset .................................

	$("#result").empty();

	// =============================== Arrange ===============================

	$("#result").html(
	'<div id="page"></div>'
	+ '<div class="top" data-link=\'{namebox first class="nm1" id="id5" width=66}{else last width=24 class="nm2" id="id6"}\'></div>'
	);

	$.views.tags("namebox", {
		setSize: true,
		template: '<div><span>X</span> <input/></div>',
		linkedElement: "input",
		displayElement: "span",
		mainElement: "div",
		onBind: function(tagCtx) {
			var tagCtx1 = this.tagCtxs[1];
			logElems && logElems(this.linkedElems, this.linkedElem, this.mainElem, this.displayElem,
				tagCtx.linkedElems, tagCtx.mainElem, tagCtx.displayElem,
				tagCtx1.linkedElems, tagCtx1.mainElem, tagCtx1.displayElem);
		}
	});

	ret = "";
	data = {
			first: "Jo",
			last: "Blow"
		};

	// ................................ Act ..................................
	var logElems = function(linkedElems, linkedElem, mainElem, displayElem,
		linkedElems0, mainElem0, displayElem0,
		linkedElems1, mainElem1, displayElem1 ) {
		ret += "|" + (linkedElems === linkedElems0)
		+ " " + (linkedElem === linkedElems[0])
		+ " " + (mainElem === mainElem0)
		+ " " + (displayElem === displayElem0)
		+ " " + linkedElem[0].tagName + mainElem[0].tagName + displayElem[0].tagName
	};

	$.templates('<input data-link="first"/><input data-link="last"/>'
	+ '{^{namebox first class="nm1" id="id1" width=66}}{{else last width=24 class="nm2" id="id2" }}{{/namebox}}'
	+ '<p data-link=\'{namebox first class="nm1" id="id3" width=66}{else last width=24 class="nm2" id="id4"}\'></p>')
		.link("#page", data);

	$.link(true, ".top", data);

	logElems = undefined;

	// ............................... Assert .................................
	assert.equal(ret, "|true true true true INPUTDIVSPAN|true true true true INPUTDIVSPAN|true true true true INPUTDIVSPAN",
	"Two-way tag: linkedElements|displayElement|mainElement settings lead to appropriate linkedElems|linkedElem|displayElem|mainElem values on tag and on tagCtx, in onBind()");

	assert.ok($(".nm1").length === 3 && $(".nm2").length === 3 && $("#id1")[0].tagName === "DIV" && $("#id2")[0].tagName === "DIV" && $("#id3")[0].tagName === "DIV" && $("#id4")[0].tagName === "DIV" && $("#id6")[0].tagName === "DIV" && !$("#id5")[0],
	"Two-way tag: displayElement and mainElement settings lead to class and id assignment as expected on displayElem and mainElem");

	// ................................ Act ..................................
	var inputs = $("#result input");
	ret = inputs[0].value + inputs[1].value + inputs[2].value + inputs[3].value + inputs[4].value + inputs[5].value + inputs[6].value + inputs[7].value;
	$.observable(data).setProperty({first: "Jeff", last: "Blye"});
	inputs = $("#result input");
	ret += "|" + inputs[0].value + inputs[1].value + inputs[2].value + inputs[3].value + inputs[4].value + inputs[5].value + inputs[6].value + inputs[7].value;
	$(inputs[0]).val("Pete").change();
	inputs = $("#result input");
	ret += "|" + inputs[0].value + inputs[1].value + inputs[2].value + inputs[3].value + inputs[4].value + inputs[5].value + inputs[6].value + inputs[7].value;
	$(inputs[3]).val("Bains").change();
	inputs = $("#result input");
	ret += "|" + inputs[0].value + inputs[1].value + inputs[2].value + inputs[3].value + inputs[4].value + inputs[5].value + inputs[6].value + inputs[7].value;
	$(inputs[4]).val("Bill").change();
	inputs = $("#result input");
	ret += "|" + inputs[0].value + inputs[1].value + inputs[2].value + inputs[3].value + inputs[4].value + inputs[5].value + inputs[6].value + inputs[7].value;

	$(inputs[7]).val("Banks").change();
	inputs = $("#result input");
	ret += "|" + inputs[0].value + inputs[1].value + inputs[2].value + inputs[3].value + inputs[4].value + inputs[5].value + inputs[6].value + inputs[7].value;

	// ............................... Assert .................................
	assert.equal(ret, "JoBlowJoBlowJoBlowJoBlow|JeffBlyeJeffBlyeJeffBlyeJeffBlye|PeteBlyePeteBlyePeteBlyePeteBlye|PeteBainsPeteBainsPeteBainsPeteBains|BillBainsBillBainsBillBainsBillBains|BillBanksBillBanksBillBanksBillBanks",
	"Two-way tag: linkedElems 2-way binding is correct whether inline, data-linked, or top-level data-linked tag");

	// =============================== Arrange ===============================

	$("#result").html(
	'<div id="page"></div>'
	+ '<div class="top" data-link=\'{namebox first class="nm1" id="id5" width=66}{else last width=24 class="nm2" id="id6"}\'></div>'
	);

	$.views.tags("namebox", {
		onUpdate: false,
		setSize: true,
		template: '<div><span>X</span> <input/></div>',
		linkedElement: "input",
		displayElement: "span",
		mainElement: "div",
		onBind: function(tagCtx) {
			var tagCtx1 = this.tagCtxs[1];
			logElems && logElems(this.linkedElems, this.linkedElem, this.mainElem, this.displayElem,
				tagCtx.linkedElems, tagCtx.mainElem, tagCtx.displayElem,
				tagCtx1.linkedElems, tagCtx1.mainElem, tagCtx1.displayElem);
		}
	});

	ret = "";
	data = {
			first: "Jo",
			last: "Blow"
		};

	logElems = function(linkedElems, linkedElem, mainElem, displayElem,
		linkedElems0, mainElem0, displayElem0,
		linkedElems1, mainElem1, displayElem1 ) {
		ret += "|" + (linkedElems === linkedElems0)
		+ " " + (linkedElem === linkedElems[0])
		+ " " + (mainElem === mainElem0)
		+ " " + (displayElem === displayElem0)
		+ " " + linkedElem[0].tagName + mainElem[0].tagName + displayElem[0].tagName
	};

	$.templates('<input data-link="first"/><input data-link="last"/>'
	+ '{^{namebox first class="nm1" id="id1" width=66}}{{else last width=24 class="nm2" id="id2" }}{{/namebox}}'
	+ '<p data-link=\'{namebox first class="nm1" id="id3" width=66}{else last width=24 class="nm2" id="id4"}\'></p>')
		.link("#page", data);

	$.link(true, ".top", data);

	logElems = undefined;

	// ............................... Assert .................................
	assert.equal(ret, "|true true true true INPUTDIVSPAN|true true true true INPUTDIVSPAN|true true true true INPUTDIVSPAN",
	"Two-way tag (onUpdate false): linkedElements|displayElement|mainElement settings lead to appropriate linkedElems|linkedElem|displayElem|mainElem values on tag and on tagCtx, in onBind()");

	assert.ok($(".nm1").length === 3 && $(".nm2").length === 3 && $("#id1")[0].tagName === "DIV" && $("#id2")[0].tagName === "DIV" && $("#id3")[0].tagName === "DIV" && $("#id4")[0].tagName === "DIV" && $("#id6")[0].tagName === "DIV" && !$("#id5")[0],
	"Two-way tag (onUpdate false): displayElement and mainElement settings lead to class and id assignment as expected on displayElem and mainElem");

	// ................................ Act ..................................
	inputs = $("#result input");
	ret = inputs[0].value + inputs[1].value + inputs[2].value + inputs[3].value + inputs[4].value + inputs[5].value + inputs[6].value + inputs[7].value;
	$.observable(data).setProperty({first: "Jeff", last: "Blye"});
	ret += "|" + inputs[0].value + inputs[1].value + inputs[2].value + inputs[3].value + inputs[4].value + inputs[5].value + inputs[6].value + inputs[7].value;
	$(inputs[0]).val("Pete").change();
	ret += "|" + inputs[0].value + inputs[1].value + inputs[2].value + inputs[3].value + inputs[4].value + inputs[5].value + inputs[6].value + inputs[7].value;
	$(inputs[3]).val("Bains").change();
	ret += "|" + inputs[0].value + inputs[1].value + inputs[2].value + inputs[3].value + inputs[4].value + inputs[5].value + inputs[6].value + inputs[7].value;
	$(inputs[4]).val("Bill").change();
	ret += "|" + inputs[0].value + inputs[1].value + inputs[2].value + inputs[3].value + inputs[4].value + inputs[5].value + inputs[6].value + inputs[7].value;
	$(inputs[7]).val("Banks").change();
	ret += "|" + inputs[0].value + inputs[1].value + inputs[2].value + inputs[3].value + inputs[4].value + inputs[5].value + inputs[6].value + inputs[7].value;

	// ............................... Assert .................................
	assert.equal(ret, "JoBlowJoBlowJoBlowJoBlow|JeffBlyeJeffBlyeJeffBlyeJeffBlye|PeteBlyePeteBlyePeteBlyePeteBlye|PeteBainsPeteBainsPeteBainsPeteBains|BillBainsBillBainsBillBainsBillBains|BillBanksBillBanksBillBanksBillBanks",
	"Two-way tag (onUpdate false): linkedElems 2-way binding is correct whether inline, data-linked, or top-level data-linked tag");

	// =============================== Arrange ===============================

	$("#result").html(
	'<div id="page"></div>'
	+ '<div class="top" data-link=\'{namebox first class="nm1" id="id5" width=66}{else last width=24 class="nm2" id="id6"}\'></div>'
	);

	$.views.tags("namebox", {
		setSize: true,
		template: '<div><span>X</span> <input/></div>',
		onBind: function(tagCtx) {
			this.tagCtxs[0].linkedElems=[this.tagCtxs[0].contents(true, "input")];
			this.tagCtxs[0].displayElem=this.tagCtxs[0].contents(true, "span");
			this.tagCtxs[0].mainElem=this.tagCtxs[0].contents(true, "div");
			this.tagCtxs[1].linkedElems=[this.tagCtxs[1].contents(true, "input")];
			this.tagCtxs[1].displayElem=this.tagCtxs[1].contents(true, "div");
			this.tagCtxs[1].mainElem=this.tagCtxs[1].contents(true, "span");
		}
	});

	ret = "";
	data = {
			first: "Jo",
			last: "Blow"
		};

	$.templates('<input data-link="first"/><input data-link="last"/>'
	+ '{^{namebox first class="nm1" id="id1" width=66}}{{else last width=24 class="nm2" id="id2" }}{{/namebox}}'
	+ '<p data-link=\'{namebox first class="nm1" id="id3" width=66}{else last width=24 class="nm2" id="id4"}\'></p>')
		.link("#page", data);

	$.link(true, ".top", data);

	// ............................... Assert .................................
	assert.ok(	$(".nm1").length === 3 && $(".nm2").length === 3 && $("#id1")[0].tagName === "DIV" && $("#id2")[0].tagName === "SPAN" && $("#id3")[0].tagName === "DIV" && $("#id4")[0].tagName === "SPAN" && $("#id5")[0].tagName === "DIV" && $("#id6")[0].tagName === "SPAN",
	"Two-way tag: setting tagCtx.linkedElems|displayElem|mainElem in onBind lead to class and id assignment as expected on displayElem and mainElem");

	// ................................ Act ..................................
	inputs = $("#result input");
	ret = inputs[0].value + inputs[1].value + inputs[2].value + inputs[3].value + inputs[4].value + inputs[5].value + inputs[6].value + inputs[7].value;
	$.observable(data).setProperty({first: "Jeff", last: "Blye"});
	inputs = $("#result input");
	ret += "|" + inputs[0].value + inputs[1].value + inputs[2].value + inputs[3].value + inputs[4].value + inputs[5].value + inputs[6].value + inputs[7].value;
	$(inputs[0]).val("Pete").change();
	inputs = $("#result input");
	ret += "|" + inputs[0].value + inputs[1].value + inputs[2].value + inputs[3].value + inputs[4].value + inputs[5].value + inputs[6].value + inputs[7].value;
	$(inputs[3]).val("Bains").change();
	inputs = $("#result input");
	ret += "|" + inputs[0].value + inputs[1].value + inputs[2].value + inputs[3].value + inputs[4].value + inputs[5].value + inputs[6].value + inputs[7].value;
	$(inputs[4]).val("Bill").change();
	inputs = $("#result input");
	ret += "|" + inputs[0].value + inputs[1].value + inputs[2].value + inputs[3].value + inputs[4].value + inputs[5].value + inputs[6].value + inputs[7].value;
	$(inputs[7]).val("Banks").change();
	inputs = $("#result input");
	ret += "|" + inputs[0].value + inputs[1].value + inputs[2].value + inputs[3].value + inputs[4].value + inputs[5].value + inputs[6].value + inputs[7].value;

	// ............................... Assert .................................
	assert.equal(ret, "JoBlowJoBlowJoBlowJoBlow|JeffBlyeJeffBlyeJeffBlyeJeffBlye|PeteBlyePeteBlyePeteBlyePeteBlye|PeteBainsPeteBainsPeteBainsPeteBains|BillBainsBillBainsBillBainsBillBains|BillBanksBillBanksBillBanksBillBanks",
	"Two-way tag: setting tagCtx.linkedElems|displayElem|mainElem in onBind lead to correct 2-way binding, whether inline, data-linked, or top-level data-linked tag");

	// =============================== Arrange ===============================

	$("#result").html(
	'<div id="page"></div>'
	+ '<div class="top" data-link=\'{namebox first class="nm1" id="id5" width=66}{else last width=24 class="nm2" id="id6"}\'></div>'
	);

	$.views.tags("namebox", {
		onUpdate: false,
		setSize: true,
		template: '<div><span>X</span> <input/></div>',
		onBind: function(tagCtx) {
			this.linkedElems=[this.tagCtxs[0].contents(true, "input")];
	//  this.linkedElem=this.tagCtxs[0].contents(true, "input"); // also works
			this.displayElem=this.tagCtxs[0].contents(true, "span");
			this.mainElem=this.tagCtxs[0].contents(true, "div");

			this.tagCtxs[1].linkedElems=[this.tagCtxs[1].contents(true, "input")];
			this.tagCtxs[1].displayElem=this.tagCtxs[1].contents(true, "div");
			this.tagCtxs[1].mainElem=this.tagCtxs[1].contents(true, "span");
		}
	});

	ret = "";
	data = {
			first: "Jo",
			last: "Blow"
		};

	$.templates('<input data-link="first"/><input data-link="last"/>'
	+ '{^{namebox first class="nm1" id="id1" width=66}}{{else last width=24 class="nm2" id="id2" }}{{/namebox}}'
	+ '<p data-link=\'{namebox first class="nm1" id="id3" width=66}{else last width=24 class="nm2" id="id4"}\'></p>')
		.link("#page", data);

	$.link(true, ".top", data);

	// ............................... Assert .................................
	assert.ok(	$(".nm1").length === 3 && $(".nm2").length === 3 && $("#id1")[0].tagName === "DIV" && $("#id2")[0].tagName === "SPAN" && $("#id3")[0].tagName === "DIV" && $("#id4")[0].tagName === "SPAN" && $("#id5")[0].tagName === "DIV" && $("#id6")[0].tagName === "SPAN",
	"Two-way tag: setting tag.linkedElem(s) and tagCtx|displayElem|mainElem in onBind lead to class and id assignment as expected on displayElem and mainElem");

	// ................................ Act ..................................
	inputs = $("#result input");
	ret = inputs[0].value + inputs[1].value + inputs[2].value + inputs[3].value + inputs[4].value + inputs[5].value + inputs[6].value + inputs[7].value;
	$.observable(data).setProperty({first: "Jeff", last: "Blye"});
	ret += "|" + inputs[0].value + inputs[1].value + inputs[2].value + inputs[3].value + inputs[4].value + inputs[5].value + inputs[6].value + inputs[7].value;
	$(inputs[0]).val("Pete").change();
	ret += "|" + inputs[0].value + inputs[1].value + inputs[2].value + inputs[3].value + inputs[4].value + inputs[5].value + inputs[6].value + inputs[7].value;
	$(inputs[3]).val("Bains").change();
	ret += "|" + inputs[0].value + inputs[1].value + inputs[2].value + inputs[3].value + inputs[4].value + inputs[5].value + inputs[6].value + inputs[7].value;
	$(inputs[4]).val("Bill").change();
	ret += "|" + inputs[0].value + inputs[1].value + inputs[2].value + inputs[3].value + inputs[4].value + inputs[5].value + inputs[6].value + inputs[7].value;
	$(inputs[7]).val("Banks").change();
	ret += "|" + inputs[0].value + inputs[1].value + inputs[2].value + inputs[3].value + inputs[4].value + inputs[5].value + inputs[6].value + inputs[7].value;

	// ............................... Assert .................................
	assert.equal(ret, "JoBlowJoBlowJoBlowJoBlow|JeffBlyeJeffBlyeJeffBlyeJeffBlye|PeteBlyePeteBlyePeteBlyePeteBlye|PeteBainsPeteBainsPeteBainsPeteBains|BillBainsBillBainsBillBainsBillBains|BillBanksBillBanksBillBanksBillBanks",
	"Two-way tag: setting tag.linkedElem(s) and tagCtx|displayElem|mainElem in onBind lead to correct 2-way binding, whether inline, data-linked, or top-level data-linked tag");

	// =============================== Arrange ===============================

	$.views.tags("namebox", {
		onUpdate: false,
		setSize: true,
		onBind: function(tagCtx) {
			this.linkedElems=[this.tagCtxs[0].contents(true, "input")];
	//  this.linkedElem=this.tagCtxs[0].contents(true, "input"); // also works
			this.displayElem=this.tagCtxs[0].contents(true, "span");
			this.mainElem=this.tagCtxs[0].contents(true, "div");

			this.tagCtxs[1].linkedElems=[this.tagCtxs[1].contents(true, "input")];
			this.tagCtxs[1].displayElem=this.tagCtxs[1].contents(true, "div");
			this.tagCtxs[1].mainElem=this.tagCtxs[1].contents(true, "span");
		}
	});

	ret = "";
	data = {
			first: "Jo",
			last: "Blow"
		};

	$.templates('<input data-link="first"/><input data-link="last"/>'
	+ '{^{namebox first class="nm1" id="id1" width=66}}<div><span>X</span> <input/></div>{{else last width=24 class="nm2" id="id2" }}<div><span>X</span> <input/></div>{{/namebox}}')
		.link("#result", data);

	// ............................... Assert .................................
	assert.ok(	$(".nm1").length === 1 && $(".nm2").length === 1 && $("#id1")[0].tagName === "DIV" && $("#id2")[0].tagName === "SPAN",
	"Two-way tag, no template: setting tag.linkedElem(s) and tagCtx|displayElem|mainElem in onBind lead to class and id assignment as expected on displayElem and mainElem, within wrapped content");

	// ................................ Act ..................................
	inputs = $("#result input");
	ret = inputs[0].value + inputs[1].value + inputs[2].value + inputs[3].value;
	$.observable(data).setProperty({first: "Jeff", last: "Blye"});
	ret += "|" + inputs[0].value + inputs[1].value + inputs[2].value + inputs[3].value;
	$(inputs[0]).val("Pete").change();
	ret += "|" + inputs[0].value + inputs[1].value + inputs[2].value + inputs[3].value;
	$(inputs[1]).val("Bains").change();
	ret += "|" + inputs[0].value + inputs[1].value + inputs[2].value + inputs[3].value;
	$(inputs[2]).val("Jim").change();
	ret += "|" + inputs[0].value + inputs[1].value + inputs[2].value + inputs[3].value;
	$(inputs[3]).val("Banks").change();
	ret += "|" + inputs[0].value + inputs[1].value + inputs[2].value + inputs[3].value;

	// ............................... Assert .................................
	assert.equal(ret, "JoBlowJoBlow|JeffBlyeJeffBlye|PeteBlyePeteBlye|PeteBainsPeteBains|JimBainsJimBains|JimBanksJimBanks",
	"Two-way tag, no template: setting tag.linkedElem(s) and tagCtx|displayElem|mainElem in onBind lead to correct 2-way binding, on inputs in wrapped content");

// ............................... Reset .................................

	$("#result").empty();

	// =============================== Arrange ===============================
	var ret,
		data = {current: "cur", modified: "mod"};

	$.templates({
		markup: '{^{mytag current modified/}}',
		tags: {
			mytag: {
				onUpdate: false,
				bindTo: 1,
				bindFrom: 0,
				linkedElement: "input",
				linkedCtxParam: "fm",
				template: "<input data-link='~fm'/>",
				update: function(val) {
					this.updateValue(val); // Update external data, through two-way binding
				}
			}
		}
	}).link("#result", data);

	mytag = $.view().childTags()[0];
	var linkedElem = mytag.tagCtx.contents("input")[0];

	ret = data.current + "-" + data.modified + ":" + linkedElem.value;

	// ............................... Assert .................................
	assert.equal(ret, "cur-mod:cur",
	"Two-way tag with bindTo and bindFrom to different paths (1, 0): initial render");

	// ................................ Act ..................................
	$.observable(data).setProperty({current: "cur2"});
	ret = data.current + "-" + data.modified + ":" + linkedElem.value;

	// ............................... Assert .................................
	assert.equal(ret, "cur2-mod:cur2",
	"Two-way tag with bindTo and bindFrom to different paths (1, 0): bindFrom binding updates from data");

	// ................................ Act ..................................
	$.observable(data).setProperty({modified: "mod2"});
	ret = data.current + "-" + data.modified + ":" + linkedElem.value;

	// ............................... Assert .................................
	assert.equal(ret, "cur2-mod2:cur2",
	"Two-way tag with bindTo and bindFrom to different paths (1, 0):  bindTo binding does not update from data");

	// ................................ Act ..................................
	linkedElem.value = "set1";
	$(linkedElem).change();
	ret = data.current + "-" + data.modified + ":" + linkedElem.value;

	// ............................... Assert .................................
	assert.equal(ret, "cur2-set1:set1",
	"Two-way tag with bindTo and bindFrom to different paths (1, 0):  bindTo binding updates to data -  bindFrom binding does not");

	// ................................ Act ..................................
	mytag.setValue("setval", 0, 0);
	ret = data.current + "-" + data.modified + ":" + linkedElem.value;

	// ............................... Assert .................................
	assert.equal(ret, "cur2-set1:setval",
	"Two-way tag with bindTo and bindFrom to different paths (1, 0): setValue works");

	// ................................ Act ..................................
	mytag.setValues("setval2");
	ret = data.current + "-" + data.modified + ":" + linkedElem.value;

	// ............................... Assert .................................
	assert.equal(ret, "cur2-set1:setval2",
	"Two-way tag with bindTo and bindFrom to different paths (1, 0): setValues works");

	// ................................ Act ..................................
	mytag.update("updated1");
	ret = data.current + "-" + data.modified + ":" + linkedElem.value;

	// ............................... Assert .................................
	assert.equal(ret, "cur2-updated1:setval2",
	"Two-way tag with bindTo and bindFrom to different paths (1, 0): update() updates bindTo target");

	// ................................ Act ..................................
	mytag.updateValue("updated2");
	ret = data.current + "-" + data.modified + ":" + linkedElem.value;

	// ............................... Assert .................................
	assert.equal(ret, "cur2-updated2:setval2",
	"Two-way tag with bindTo and bindFrom to different paths (1, 0): update() updates bindTo target (variant)");

// ............................... Reset .................................

	$("#result").empty();

	// =============================== Arrange ===============================

	data = {current: "cur", modified: "mod"};

	$.templates({
		markup: '{^{mytag modified current/}}',
		tags: {
			mytag: {
				onUpdate: false,
				bindTo: 0,
				bindFrom: 1,
				linkedElement: "input",
				linkedCtxParam: "fm",
				template: "<input data-link='~fm'/>",
				update: function(val) {
					this.updateValue(val); // Update external data, through two-way binding
				}
			}
		}
	}).link("#result", data);

	mytag = $.view().childTags()[0];
	var linkedElem = mytag.tagCtx.contents("input")[0];

	ret = data.current + "-" + data.modified + ":" + linkedElem.value;

	// ............................... Assert .................................
	assert.equal(ret, "cur-mod:cur",
	"Two-way tag with bindTo and bindFrom to different paths (0, 1): initial render");

	// ................................ Act ..................................
	$.observable(data).setProperty({current: "cur2"});
	ret = data.current + "-" + data.modified + ":" + linkedElem.value;

	// ............................... Assert .................................
	assert.equal(ret, "cur2-mod:cur2",
	"Two-way tag with bindTo and bindFrom to different paths (0, 1): bindFrom binding updates from data");

	// ................................ Act ..................................
	$.observable(data).setProperty({modified: "mod2"});
	ret = data.current + "-" + data.modified + ":" + linkedElem.value;

	// ............................... Assert .................................
	assert.equal(ret, "cur2-mod2:cur2",
	"Two-way tag with bindTo and bindFrom to different paths (0, 1):  bindTo binding does not update from data");

	// ................................ Act ..................................
	linkedElem.value = "set1";
	$(linkedElem).change();
	ret = data.current + "-" + data.modified + ":" + linkedElem.value;

	// ............................... Assert .................................
	assert.equal(ret, "cur2-set1:set1",
	"Two-way tag with bindTo and bindFrom to different paths (0, 1):  bindTo binding updates to data -  bindFrom binding does not");

	// ................................ Act ..................................
	mytag.setValue("setval", 0, 0);
	ret = data.current + "-" + data.modified + ":" + linkedElem.value;

	// ............................... Assert .................................
	assert.equal(ret, "cur2-set1:setval",
	"Two-way tag with bindTo and bindFrom to different paths (0, 1): setValue works");

	// ................................ Act ..................................
	mytag.setValues("setval2");
	ret = data.current + "-" + data.modified + ":" + linkedElem.value;

	// ............................... Assert .................................
	assert.equal(ret, "cur2-set1:setval2",
	"Two-way tag with bindTo and bindFrom to different paths (0, 1): setValues works");

	// ................................ Act ..................................
	mytag.update("updated1");
	ret = data.current + "-" + data.modified + ":" + linkedElem.value;

	// ............................... Assert .................................
	assert.equal(ret, "cur2-updated1:setval2",
	"Two-way tag with bindTo and bindFrom to different paths (0, 1): update() updates bindTo target");

	// ................................ Act ..................................
	mytag.updateValue("updated2");
	ret = data.current + "-" + data.modified + ":" + linkedElem.value;

	// ............................... Assert .................................
	assert.equal(ret, "cur2-updated2:setval2",
	"Two-way tag with bindTo and bindFrom to different paths (0, 1): update() updates bindTo target (variant)");

// ............................... Reset .................................

	$("#result").empty();

	// =============================== Arrange ===============================

	data = {current: "cur", modified: "mod"};

	$.templates({
		markup: '{^{mytag modified current convert=~cvt convertBack=~cvb/}}',
		tags: {
			mytag: {
				onUpdate: false,
				bindTo: 0,
				bindFrom: 1,
				linkedElement: "input",
				linkedCtxParam: "fm",
				template: "<input data-link='~fm'/>",
				update: function(val) {
					this.updateValue(val); // Update external data, through two-way binding
				}
			}
		}
	}).link("#result", data, {
				cvt: function(val) {
					return val;
				},
				cvb: function(val) {
					return val;
				}
});

	mytag = $.view().childTags()[0];
	var linkedElem = mytag.tagCtx.contents("input")[0];

	ret = data.current + "-" + data.modified + ":" + linkedElem.value;

	// ............................... Assert .................................
	assert.equal(ret, "cur-mod:cur",
	"Two-way tag plus cvt/cvtback with bindTo and bindFrom to different paths (0, 1): initial render");

	// ................................ Act ..................................
	$.observable(data).setProperty({current: "cur2"});
	ret = data.current + "-" + data.modified + ":" + linkedElem.value;

	// ............................... Assert .................................
	assert.equal(ret, "cur2-mod:cur2",
	"Two-way tag plus cvt/cvtback with bindTo and bindFrom to different paths (0, 1): bindFrom binding updates from data");

	// ................................ Act ..................................
	$.observable(data).setProperty({modified: "mod2"});
	ret = data.current + "-" + data.modified + ":" + linkedElem.value;

	// ............................... Assert .................................
	assert.equal(ret, "cur2-mod2:cur2",
	"Two-way tag plus cvt/cvtback with bindTo and bindFrom to different paths (0, 1):  bindTo binding does not update from data");

	// ................................ Act ..................................
	linkedElem.value = "set1";
	$(linkedElem).change();
	ret = data.current + "-" + data.modified + ":" + linkedElem.value;

	// ............................... Assert .................................
	assert.equal(ret, "cur2-set1:set1",
	"Two-way tag plus cvt/cvtback with bindTo and bindFrom to different paths (0, 1):  bindTo binding updates to data -  bindFrom binding does not");

	// ................................ Act ..................................
	mytag.setValue("setval", 0, 0);
	ret = data.current + "-" + data.modified + ":" + linkedElem.value;

	// ............................... Assert .................................
	assert.equal(ret, "cur2-set1:setval",
	"Two-way tag plus cvt/cvtback with bindTo and bindFrom to different paths (0, 1): setValue works");

	// ................................ Act ..................................
	mytag.setValues("setval2");
	ret = data.current + "-" + data.modified + ":" + linkedElem.value;

	// ............................... Assert .................................
	assert.equal(ret, "cur2-set1:setval2",
	"Two-way tag plus cvt/cvtback with bindTo and bindFrom to different paths (0, 1): setValues works");

	// ................................ Act ..................................
	mytag.update("updated1");
	ret = data.current + "-" + data.modified + ":" + linkedElem.value;

	// ............................... Assert .................................
	assert.equal(ret, "cur2-updated1:setval2",
	"Two-way tag plus cvt/cvtback with bindTo and bindFrom to different paths (0, 1): update() updates bindTo target");

	// ................................ Act ..................................
	mytag.updateValue("updated2");
	ret = data.current + "-" + data.modified + ":" + linkedElem.value;

	// ............................... Assert .................................
	assert.equal(ret, "cur2-updated2:setval2",
	"Two-way tag plus cvt/cvtback with bindTo and bindFrom to different paths (0, 1): update() updates bindTo target (variant)");

// ............................... Reset .................................

	$("#result").empty();

	// =============================== Arrange ===============================

	data = {current: "cur", modified: "mod"};

	$.templates({
		markup: '{^{mytag modified fm=current/}}',
		tags: {
			mytag: {
				onUpdate: false,
				bindTo: 0,
				bindFrom: "fm",
				linkedElement: "input",
				linkedCtxParam: "fm",
				template: "<input/><span data-link='~fm'></span>",
				update: function(val) {
					this.updateValue(val); // Update external data, through two-way binding
				}
			}
		}
	}).link("#result", data);

	mytag = $.view().childTags()[0];
	var linkedElem = mytag.tagCtx.contents("input")[0];

	ret = data.current + "-" + data.modified + ":" + linkedElem.value + "-" + $("#result").text();

	// ............................... Assert .................................
	assert.equal(ret, "cur-mod:-cur",
	"Two-way tag with bindTo and bindFrom to different paths ('fm', 0): initial render");

	// ................................ Act ..................................
	$.observable(data).setProperty({current: "cur2"});
	ret = data.current + "-" + data.modified + ":" + linkedElem.value + "-" + $("#result").text();

	// ............................... Assert .................................
	assert.equal(ret, "cur2-mod:-cur2",
	"Two-way tag with bindTo and bindFrom to different paths ('fm', 0): bindFrom binding updates from data");

	// ................................ Act ..................................
	$.observable(data).setProperty({modified: "mod2"});
	ret = data.current + "-" + data.modified + ":" + linkedElem.value + "-" + $("#result").text();

	// ............................... Assert .................................
	assert.equal(ret, "cur2-mod2:-cur2",
	"Two-way tag with bindTo and bindFrom to different paths ('fm', 0):  bindTo binding does not update from data");

	// ................................ Act ..................................
	linkedElem.value = "set1";
	$(linkedElem).change();
	ret = data.current + "-" + data.modified + ":" + linkedElem.value + "-" + $("#result").text();

	// ............................... Assert .................................
	assert.equal(ret, "cur2-set1:set1-cur2",
	"Two-way tag with bindTo and bindFrom to different paths ('fm', 0):  bindTo binding updates to data -  bindFrom binding does not");

	// ................................ Act ..................................
	mytag.setValue("setval", 0, 0);
	ret = data.current + "-" + data.modified + ":" + linkedElem.value + "-" + $("#result").text();

	// ............................... Assert .................................
	assert.equal(ret, "cur2-set1:set1-setval",
	"Two-way tag with bindTo and bindFrom to different paths ('fm', 0): setValue sets the bindFrom linkedPrm but not the bindTo linkedElem");

	// ................................ Act ..................................
	mytag.setValues("setval2");
	ret = data.current + "-" + data.modified + ":" + linkedElem.value + "-" + $("#result").text();

	// ............................... Assert .................................
	assert.equal(ret, "cur2-set1:set1-setval2",
	"Two-way tag with bindTo and bindFrom to different paths ('fm', 0): setValues sets the bindFrom linkedPrm but not the bindTo linkedElem");

	// ................................ Act ..................................
	mytag.update("updated1");
	ret = data.current + "-" + data.modified + ":" + linkedElem.value + "-" + $("#result").text();

	// ............................... Assert .................................
	assert.equal(ret, "cur2-updated1:set1-setval2",
	"Two-way tag with bindTo and bindFrom to different paths ('fm', 0): update() updates bindTo target");

	// ................................ Act ..................................
	mytag.updateValue("updated2");
	ret = data.current + "-" + data.modified + ":" + linkedElem.value + "-" + $("#result").text();

	// ............................... Assert .................................
	assert.equal(ret, "cur2-updated2:set1-setval2",
	"Two-way tag with bindTo and bindFrom to different paths ('fm', 0): update() updates bindTo target (variant)");

// ............................... Reset .................................

	$("#result").empty();

	// =============================== Arrange ===============================

	data = {current: "cur", modified: "mod", two: 2, title: "Title"};

	$.templates({
		markup: '{^{mytag modified 1 two fm=current title=title/}}',
		tags: {
			mytag: {
				onUpdate: false,
				bindTo: [0, "title"],
				bindFrom: ["fm", 1, 2],
				linkedElement: ["input", ".title"],
				linkedCtxParam: ["fm", undefined, "arg2"],
				template: "<input  data-link='~fm'/><input class='title'/>{^{:~arg2}}",
				convert: function(from, one, two) {
					return [from + "F", one + "O", two + "T"];
				},
				setValue: function(val, ind, tagElse, ev, eventArgs) {
					return val + "V" + ind;
				},
				convertBack: function(val, one) {
					return [
						val ? val + "V" : undefined,
						one ? one + "O" : undefined
					];
				}
			}
		}
	}).link("#result", data);

	mytag = $.view().childTags()[0];
	var linkedElem = mytag.tagCtx.contents("input")[0];

	ret = data.current + "-" + data.modified + ":" + linkedElem.value + "-" + $("#result").text();

	// ............................... Assert .................................
	assert.equal(ret, "cur-mod:curFV0-2TV2",
	"Two-way tag with bindTo and bindFrom to different paths ('fm', 0) and convert/convertBack: initial render");

	// ................................ Act ..................................
	$.observable(data).setProperty({current: "cur2", two: "two2"});
	ret = data.current + "-" + data.modified + ":" + linkedElem.value + "-" + $("#result").text();

	// ............................... Assert .................................
	assert.equal(ret, "cur2-mod:cur2FV0-two2TV2",
	"Two-way tag with bindTo and bindFrom to different paths ('fm', 0) and convert/convertBack: bindFrom binding updates from data");

	// ................................ Act ..................................
	$.observable(data).setProperty({modified: "mod2"});
	ret = data.current + "-" + data.modified + ":" + linkedElem.value + "-" + $("#result").text();

	// ............................... Assert .................................
	assert.equal(ret, "cur2-mod2:cur2FV0-two2TV2",
	"Two-way tag with bindTo and bindFrom to different paths ('fm', 0) and convert/convertBack:  bindTo binding does not update from data");

	// ................................ Act ..................................
	linkedElem.value = "set1";
	$(linkedElem).change();
	ret = data.current + "-" + data.modified + ":" + linkedElem.value + "-" + $("#result").text();

	// ............................... Assert .................................
	assert.equal(ret, "cur2-set1V:set1-two2TV2",
	"Two-way tag with bindTo and bindFrom to different paths ('fm', 0) and convert/convertBack:  bindTo binding updates to data -  bindFrom binding does not");

	// ................................ Act ..................................
	mytag.setValue("setval", 0, 0);
	mytag.setValue("setval2", 2, 0);
	ret = data.current + "-" + data.modified + ":" + linkedElem.value + "-" + $("#result").text();

	// ............................... Assert .................................
	assert.equal(ret, "cur2-set1V:setvalV0-setval2V2",
	"Two-way tag with bindTo and bindFrom to different paths ('fm', 0) and convert/convertBack: setValue sets the bindFrom linkedPrm but not the bindTo linkedElem");

	// ................................ Act ..................................
	mytag.setValues("setval3", "setval4", "setval5");
	ret = data.current + "-" + data.modified + ":" + linkedElem.value + "-" + $("#result").text();

	// ............................... Assert .................................
	assert.equal(ret, "cur2-set1V:setval3V0-setval2V2",
	"Two-way tag with bindTo and bindFrom to different paths ('fm', 0) and convert/convertBack: setValues sets the bindFrom linkedPrm but not the bindTo linkedElem");

	// ................................ Act ..................................
	mytag.updateValue("updatedMod2",  0);
	mytag.updateValue("updatedTitle2", 1);
	ret = data.current + "-" + data.modified + "-" + data.title + ":" + linkedElem.value + "-" + $("#result").text();

	// ............................... Assert .................................
	assert.equal(ret, "cur2-updatedMod2V-updatedTitle2O:setval3V0-setval2V2",
	"Two-way tag with bindTo and bindFrom to different paths ('fm', 0) and convert/convertBack: update() updates bindTo target (variant)");

	// ................................ Act ..................................
	mytag.updateValues("updateMod3", "updateTitle3");
	ret = data.current + "-" + data.modified + "-" + data.title + ":" + linkedElem.value + "-" + $("#result").text();

	// ............................... Assert .................................
	assert.equal(ret, "cur2-updateMod3V-updateTitle3O:setval3V0-setval2V2",
	"Two-way tag with bindTo and bindFrom to different paths ('fm', 0) and convert/convertBack: update() updates bindTo target (variant)");

// ............................... Reset .................................
	$("#result").empty();

	// =============================== Arrange ===============================

	data = {current1: "cur1", modified1: "mod1", current2: "cur2", modified2: "mod2"};
	$.templates({
		markup: "<input data-link='current1' class='fromCur1'/> <input data-link='modified1' class='toMod1'/><br/>"
		+ "<input data-link='current2' class='fromCur2'/> <input data-link='modified2' class='toMod2'/><br/>"
		+ "{^{mytag current1 modified1}}"
		+ "{{else  current2 modified2 }}"
		+ "{{/mytag}}",
		tags: {
			mytag: {
				onUpdate: false,
				bindTo: 1,
				bindFrom: 0,
				linkedElement: "input",
				linkedCtxParam: "fm",
				template: "<input class='linkedEl'/><input data-link='~fm' class='linkedPrm'/><br/>",
				update: function(index, val) {
					this.updateValue(val, 0, index);
				},
				set: function(index, val) {
					this.tagCtxs[index].setValues(val);
				},
				convert: function(val) {
					return val + "C";
				},
				convertBack: function(val) {
					return val + "B";
				}
			}
		}
	}).link("#result", data);

	mytag = $.view().childTags()[0];
	var fromCur1 = $("#result .fromCur1")[0],
		toMod1 = $("#result .toMod1")[0],
		fromCur2 = $("#result .fromCur2")[0],
		toMod2 = $("#result .toMod2")[0],
		linkedEl1 = mytag.tagCtx.contents(".linkedEl")[0],
		linkedPrm1 = mytag.tagCtx.contents(".linkedPrm")[0],
		linkedEl2 = mytag.tagCtxs[1].contents(".linkedEl")[0],
		linkedPrm2 = mytag.tagCtxs[1].contents(".linkedPrm")[0],
		getRet = function() {
			return fromCur1.value + "|" + toMod1.value + "|" + fromCur2.value + "|" + toMod2.value + "|"
			+ linkedEl1.value + "|" + linkedPrm1.value + "|" + linkedEl2.value + "|" + linkedPrm2.value;
		};

	// ............................... Assert .................................
	assert.equal(getRet(), "cur1|mod1|cur2|mod2||cur1C||cur2C",
	"Two-way tag with bindTo and bindFrom to different paths (1, 0): initial render");

	// ................................ Act ..................................
	fromCur1.value = "from1";
	$(fromCur1).change();

	// ............................... Assert .................................
	assert.equal(getRet(), "from1|mod1|cur2|mod2||from1C||cur2C",
	"Two-way tag with bindTo and bindFrom to different paths (1, 0): change from");

	// ................................ Act ..................................
	toMod1.value = "to1";
	$(toMod1).change();

	// ............................... Assert .................................
	assert.equal(getRet(), "from1|to1|cur2|mod2||from1C||cur2C",
	"Two-way tag with bindTo and bindFrom to different paths (1, 0): change to");

	// ................................ Act ..................................
	fromCur2.value = "from2";
	$(fromCur2).change();

	// ............................... Assert .................................
	assert.equal(getRet(), "from1|to1|from2|mod2||from1C||from2C",
	"Two-way tag with bindTo and bindFrom to different paths (1, 0): change from {{else}}");

	// ................................ Act ..................................
	toMod2.value = "to2";
	$(toMod2).change();

	// ............................... Assert .................................
	assert.equal(getRet(), "from1|to1|from2|to2||from1C||from2C",
	"Two-way tag with bindTo and bindFrom to different paths (1, 0): change to {{else}}");

	// ................................ Act ..................................
	linkedEl1.value = "el1";
	$(linkedEl1).change();

	// ............................... Assert .................................
	assert.equal(getRet(), "from1|el1B|from2|to2|el1|from1C||from2C",
	"Two-way tag with bindTo and bindFrom to different paths (1, 0): change linked");

	// ................................ Act ..................................
	linkedPrm1.value = "prm1";
	$(linkedPrm1).change();

	// ............................... Assert .................................
	assert.equal(getRet(), "from1|el1B|from2|to2|el1|prm1||from2C",
	"Two-way tag with bindTo and bindFrom to different paths (1, 0): change ctx prm");

	// ................................ Act ..................................
	linkedEl2.value = "el2";
	$(linkedEl2).change();

	// ............................... Assert .................................
	assert.equal(getRet(), "from1|el1B|from2|el2B|el1|prm1|el2|from2C",
	"Two-way tag with bindTo and bindFrom to different paths (1, 0): change linked {{else}}");

	// ................................ Act ..................................
	linkedPrm2.value = "prm2";
	$(linkedPrm2).change();

	// ............................... Assert .................................
	assert.equal(getRet(), "from1|el1B|from2|el2B|el1|prm1|el2|prm2",
	"Two-way tag with bindTo and bindFrom to different paths (1, 0): change ctx prm {{else}}");

	// ................................ Act ..................................
	mytag.update(0, "upd1");

	// ............................... Assert .................................
	assert.equal(getRet(), "from1|upd1B|from2|el2B|el1|prm1|el2|prm2",
	"Two-way tag with bindTo and bindFrom to different paths (1, 0): updateValue");

	// ................................ Act ..................................
	mytag.update(1, "upd2");

	// ............................... Assert .................................
	assert.equal(getRet(), "from1|upd1B|from2|upd2B|el1|prm1|el2|prm2",
	"Two-way tag with bindTo and bindFrom to different paths (1, 0): updateValue {{else}}");

	// ................................ Act ..................................
	mytag.set(0, "set1");

	// ............................... Assert .................................
	assert.equal(getRet(), "from1|upd1B|from2|upd2B|el1|set1|el2|prm2",
	"Two-way tag with bindTo and bindFrom to different paths (1, 0): setValues");

	// ................................ Act ..................................
	mytag.set(1, "set2");

	// ............................... Assert .................................
	assert.equal(getRet(), "from1|upd1B|from2|upd2B|el1|set1|el2|set2",
	"Two-way tag with bindTo and bindFrom to different paths (1, 0): setValues {{else}}");

// ............................... Reset .................................

	$("#result").empty();

	// =============================== Arrange ===============================

	data = {
		arrA:[{val:'value 1'}],
		objA2:{0: {val:'value 2'}},
		objA3:{x: {val:'value 3'}},
		objA4:{x: {val:'value 4'}},
		arrB:[{val:'value 1'}],
		objB2:{0: {val:'value 2'}},
		objB3:{x: {val:'value 3'}},
		objB4:{x: {val:'value 4'}},
		arrC:[{val:'value 1'}],
		objC2:{0: {val:'value 2'}},
		objC3:{x: {val:'value 3'}},
		objC4:{x: {val:'value 4'}},
		arrD:[{val:'value 1'}],
		objD2:{0: {val:'value 2'}},
		objD3:{x: {val:'value 3'}},
		objD4:{x: {val:'value 4'}}
	};

	$.templates({
		markup: 
		"{^{mytag arrA[0].val objA2['0'].val objA3['x'].val objA4.x.val p1=arrB[0].val p2=objB2['0'].val p3=objB3['x'].val p4=objB4.x.val}}"
		+ "{{else  arrC[0].val objC2['0'].val objC3['x'].val objC4.x.val p1=arrD[0].val p2=objD2['0'].val p3=objD3['x'].val p4=objD4.x.val}}"
		+ "{{/mytag}}",
		tags: {
			mytag: {
				onUpdate: false,
				bindTo: [0 ,1, 2, 3, 'p1', 'p2', 'p3', 'p4'],
				template: ""
			}
		}
	}).link("#result", data);

	mytag = $.view().childTags()[0];

	// ................................ Act ..................................
	mytag.updateValue("new1").updateValue("new2", 1).updateValue("new3", 2).updateValue("new4", 3)
		.updateValue("new5", 4).updateValue("new6", 5).updateValue("new7", 6).updateValue("new8", 7)
		.updateValue("new9", 0, 1).updateValue("new10", 1, 1).updateValue("new11", 2, 1).updateValue("new12", 3, 1)
		.updateValue("new13", 4, 1).updateValue("new14", 5, 1).updateValue("new15", 6, 1).updateValue("new16", 7, 1);

	// ............................... Assert .................................
	assert.equal(data.arrA[0].val + data.objA2['0'].val + data.objA3.x.val + data.objA4.x.val + data.arrB[0].val + data.objB2['0'].val + data.objB3.x.val + data.objB4.x.val + data.arrC[0].val + data.objC2['0'].val + data.objC3.x.val + data.objC4.x.val + data.arrD[0].val + data.objD2['0'].val + data.objD3.x.val + data.objD4.x.val,
		"new1new2new3new4new5new6new7new8new9new10new11new12new13new14new15new16", "updateValue() binds to paths with [...].val accessors");

	// ................................ Act ..................................

	mytag.updateValues("more1", "more2", "more3", "more4", "more5", "more6", "more7", "more8");

	// ............................... Assert .................................
	assert.equal(data.arrA[0].val + data.objA2['0'].val + data.objA3.x.val + data.objA4.x.val + data.arrB[0].val + data.objB2['0'].val + data.objB3.x.val + data.objB4.x.val + data.arrC[0].val + data.objC2['0'].val + data.objC3.x.val + data.objC4.x.val + data.arrD[0].val + data.objD2['0'].val + data.objD3.x.val + data.objD4.x.val,
		"more1more2more3more4more5more6more7more8new9new10new11new12new13new14new15new16", "updateValues() binds to paths with [...].val accessors");

// ............................... Reset .................................

	$("#result").empty();

	// =============================== Arrange ===============================
	var store = {
		arrA: {val:'value 1'},
		objA2: {val:'value 2'},
		objA3: {val:'value 3'},
		objA4: {val:'value 4'},
		arrB: {val:'value 1'},
		objB2: {val:'value 2'},
		objB3: {val:'value 3'},
		objB4: {val:'value 4'},
		arrC: {val:'value 1'},
		objC2: {val:'value 2'},
		objC3: {val:'value 3'},
		objC4: {val:'value 4'},
		arrD: {val:'value 1'},
		objD2: {val:'value 2'},
		objD3: {val:'value 3'},
		objD4: {val:'value 4'}
	};

	data = {
		arrA: function() { return store.arrA },
		objA2: function() { return store.objA2 },
		objA3: function() { return store.objA3 },
		objA4: function() { return store.objA4 },
		arrB: function() { return store.arrB },
		objB2: function() { return store.objB2 },
		objB3: function() { return store.objB3 },
		objB4: function() { return store.objB4 },
		arrC: function() { return store.arrC },
		objC2: function() { return store.objC2 },
		objC3: function() { return store.objC3 },
		objC4: function() { return store.objC4 },
		arrD: function() { return store.arrD },
		objD2: function() { return store.objD2 },
		objD3: function() { return store.objD3 },
		objD4: function() { return store.objD4 },
	};

	$.templates({
		markup: 
		"{^{mytag arrA().val objA2().val objA3().val objA4().val p1=arrB().val p2=objB2().val p3=objB3().val p4=objB4().val}}"
		+ "{{else  arrC().val objC2().val objC3().val objC4().val p1=arrD().val p2=objD2().val p3=objD3().val p4=objD4().val}}"
		+ "{{/mytag}}",
		tags: {
			mytag: {
				onUpdate: false,
				bindTo: [0 ,1, 2, 3, 'p1', 'p2', 'p3', 'p4'],
				template: ""
			}
		}
	}).link("#result", data);

	mytag = $.view().childTags()[0];

	// ................................ Act ..................................
	mytag.updateValue("new1").updateValue("new2", 1).updateValue("new3", 2).updateValue("new4", 3)
		.updateValue("new5", 4).updateValue("new6", 5).updateValue("new7", 6).updateValue("new8", 7)
		.updateValue("new9", 0, 1).updateValue("new10", 1, 1).updateValue("new11", 2, 1).updateValue("new12", 3, 1)
		.updateValue("new13", 4, 1).updateValue("new14", 5, 1).updateValue("new15", 6, 1).updateValue("new16", 7, 1);

	// ............................... Assert .................................
	assert.equal(store.arrA.val + store.objA2.val + store.objA3.val + store.objA4.val + store.arrB.val + store.objB2.val + store.objB3.val + store.objB4.val + store.arrC.val + store.objC2.val + store.objC3.val + store.objC4.val + store.arrD.val + store.objD2.val + store.objD3.val + store.objD4.val,
		"new1new2new3new4new5new6new7new8new9new10new11new12new13new14new15new16", "updateValue() binds to paths with computed().val paths");

	// ................................ Act ..................................

	mytag.updateValues("more1", "more2", "more3", "more4", "more5", "more6", "more7", "more8");

	// ............................... Assert .................................
	assert.equal(store.arrA.val + store.objA2.val + store.objA3.val + store.objA4.val + store.arrB.val + store.objB2.val + store.objB3.val + store.objB4.val + store.arrC.val + store.objC2.val + store.objC3.val + store.objC4.val + store.arrD.val + store.objD2.val + store.objD3.val + store.objD4.val,
		"more1more2more3more4more5more6more7more8new9new10new11new12new13new14new15new16", "updateValues() binds to paths computed().val paths");

	// =============================== Arrange ===============================

	$.templates({
		markup: 
		"{^{mytag arg prop=prop/}}",
		tags: {
			mytag: {
				bindTo: [0, 'prop'],
				template: '',
				init: function() {
					this.onPropChange = this.onPropChange.bind(this);
					$.observe(this.tagCtx.props,'prop',this.onPropChange);
				},
				onPropChange: function() {
					this.updateValue("newArg", 0);
				}
			}
		}
	}).link("#result", {arg: "theArg", prop: "theProp"});

	mytag = $.view().childTags()[0];
	mytag.updateValue("newProp", 1);

	// ............................... Assert .................................
	assert.equal(mytag.tagCtx.props.prop + "|" + mytag.tagCtx.args[0],
		"newProp|newArg", "Changing prop triggers changing arg - works as expected");

	// =============================== Arrange ===============================

	$.templates({
		markup: 
		"{^{mytag prop=prop prop2=prop2 /}}",
		tags: {
			mytag: {
				bindTo: ['prop', 'prop2'],
				template: '',
				init: function() {
					this.onPropChange = this.onPropChange.bind(this);
					$.observe(this.tagCtx.props, 'prop2', this.onPropChange);
				},
				onPropChange: function() {
					this.updateValue("newProp", 0);
				}
			}
		}
	}).link("#result", {prop2: "theProp2", prop: "theProp"});

	mytag = $.view().childTags()[0];
	mytag.updateValue("newProp2", 1);

	// ............................... Assert .................................
	assert.equal(mytag.tagCtx.props.prop + "|" + mytag.tagCtx.props.prop2,
		"newProp|newProp2", "Changing prop triggers changing other prop - works as expected");

// ............................... Reset .................................

	$("#result").empty();
	$.views.settings.trigger(true);
});

QUnit.test("Tag control events", function(assert) {

	// =============================== Arrange ===============================
	var eventData = "";
	model.things = [{thing: "box"}]; // reset Prop

	// ................................ Act ..................................
	$.templates({
		markup: '<div>{^{myWidget person1.lastName things/}}</div>',
		tags: {
			myWidget: {
				init: function(tagCtx, linkCtx, ctx) {
					eventData += "init ";
				},
				render: function(name, things) {
					eventData += "render ";
					return "<span>" + name + "</span> <span>" + things.length + "</span> <span>" + this.getType() + "</span>";
				},
				onBeforeUpdateVal: function(ev, eventArgs) {
					eventData += "onBeforeUpdateVal ";
				},
				onUpdate: function(ev, eventArgs, newTagCtxs) {
					eventData += "update ";
				},
				onAfterLink: function(tagCtx, linkCtx, ctx, ev, eventArgs) {
					eventData += "after ";
				},
				onBind: function(tagCtx, linkCtx, ctx, ev, eventArgs) {
					eventData += "onBind ";
				},
				onUnbind: function(tagCtx, linkCtx, ctx, ev, eventArgs) {
					eventData += "onUnbind ";
				},
				onBeforeChange: function(ev, eventArgs) {
					eventData += "onBeforeChange ";
				},
				setValue: function(val, index, tagElse, ev, eventArgs) {
					eventData += "setValue (arg index: " + index + "-" + (this.tagCtx.args[index]===val) + ") ";
				},
				onAfterChange: function(ev, eventArgs) {
					eventData += "onAfterChange ";
				},
				onDispose: function() {
					eventData += "dispose ";
				},
				getType: function() {
					eventData += "getType ";
					return this.type;
				},
				type: "special"
			}
		}
	}).link("#result", model);

	// ............................... Assert .................................
	assert.equal($("#result").text() + "|" + eventData,
		"One 1 special|init render getType onBind after setValue (arg index: 1-true) setValue (arg index: 0-true) ",
		'{^{myWidget/}} - Events fire in order during rendering');
	eventData = "";

	// ................................ Act ..................................
	$.observable(person1).setProperty("lastName", "Two");

	// ............................... Assert .................................
	assert.equal($("#result").text() + "|" + eventData,
		"Two 1 special|onBeforeChange update onUnbind render getType onBind after setValue (arg index: 0-true) onAfterChange ",
		'{^{myWidget/}} - Events fire in order during update (setProperty)');
	eventData = "";

	// ................................ Act ..................................
	$.observable(model.things).insert(0, {thing: "tree"});

	// ............................... Assert .................................
	assert.equal($("#result").text() + "|" + eventData,
		"Two 2 special|onBeforeChange update onUnbind render getType onBind after onAfterChange ",
		'{^{myWidget/}} - Events fire in order during update (insert)');
	eventData = "";

	// ................................ Act ..................................
	$.observable(model.things).refresh([{thing: "bush"}, {thing: "flower"}]);

	// ............................... Assert .................................
	assert.equal($("#result").text() + "|" + eventData,
		"Two 2 special|onBeforeChange update onUnbind render getType onBind after onAfterChange ",
		'{^{myWidget/}} - Events fire in order during update (refresh)');
	eventData = "";

	// ................................ Act ..................................
	$("#result").empty();

	// ............................... Assert .................................
	assert.equal($("#result").text() + "|" + eventData, "|onUnbind dispose ",
		'{^{myWidget/}} - onDispose fires when container element is emptied or removed');

	// ................................ Reset ................................
	person1.lastName = "One";
	model.things = [];
	eventData = "";

// =============================== Arrange ===============================
	eventData = "";
	model.things = [{thing: "box"}]; // reset Prop

	// ................................ Act ..................................
	$.templates({
		markup: '<div>{^{myCustomArrayChangeWidget person1.lastName things/}}</div>',
		tags: {
			myCustomArrayChangeWidget: {
				init: function(tagCtx, linkCtx, ctx) {
					eventData += "init ";
				},
				render: function(name, things) {
					eventData += "render ";
					return "<span>" + name + "</span> <span>" + things.length + "</span> <span>" + this.getType() + "</span>";
				},
				onBeforeUpdateVal: function(ev, eventArgs) {
					eventData += "onBeforeUpdateVal ";
				},
				onUpdate: function(ev, eventArgs, newTagCtxs) {
					eventData += "update ";
				},
				onArrayChange: function(ev, eventArgs) {
					eventData += "onArrayChange" + (eventArgs.refresh ? "(refresh) " : " ");
				},
				onAfterLink: function(tagCtx, linkCtx, ctx, ev, eventArgs) {
					var tag = this,
						data = tagCtx.args[1];
					if (tag._boundArray && data !== tag._boundArray) {
						$.unobserve(tag._boundArray, tag._arCh); // Different array, so remove handler from previous array
						tag._boundArray = undefined;
					}
					if (!tag._boundArray && $.isArray(data)) {
						$.observe(tag._boundArray = data, tag._arCh = function(ev, eventArgs) { // Store array data as tag._boundArray, and arrayChangeHandler as tag._arCh
							tag.onArrayChange(ev, eventArgs);
						});
					}
					eventData += "after ";
				},
				onBind: function(tagCtx, linkCtx, ctx, ev, eventArgs) {
					eventData += "onBind ";
				},
				onUnbind: function(tagCtx, linkCtx, ctx, ev, eventArgs) {
					eventData += "onUnbind ";
				},
				onBeforeChange: function(ev, eventArgs) {
					eventData += "onBeforeChange ";
				},
				setValue: function(val, index, tagElse, ev, eventArgs) {
					eventData += "setValue (arg index: " + index + "-" + (this.tagCtx.args[index]===val) + ") ";
				},
				onAfterChange: function(ev, eventArgs) {
					eventData += "onAfterChange ";
				},
				onDispose: function() {
					var tag = this;
					if (tag._boundArray) {
						$.unobserve(tag._boundArray, tag._arCh); // Remove arrayChange handler from bound array
					}
					eventData += "dispose ";
				},
				getType: function() {
					eventData += "getType ";
					return this.type;
				},
				type: "special"
			}
		}
	}).link("#result", model);

	// ............................... Assert .................................
	assert.equal($("#result").text() + "|" + eventData,
		"One 1 special|init render getType onBind after setValue (arg index: 1-true) setValue (arg index: 0-true) ",
		'{^{myCustomArrayChangeWidget/}} - Events fire in order during rendering');
	eventData = "";

	// ................................ Act ..................................
	$.observable(person1).setProperty("lastName", "Two");

	// ............................... Assert .................................
	assert.equal($("#result").text() + "|" + eventData,
		"Two 1 special|onBeforeChange update onUnbind render getType onBind after setValue (arg index: 0-true) onAfterChange ",
		'{^{myCustomArrayChangeWidget/}} - Events fire in order during update (setProperty)');
	eventData = "";

	// ................................ Act ..................................
	$.observable(model.things).insert(0, {thing: "tree"});

	// ............................... Assert .................................
	assert.equal($("#result").text() + "|" + eventData, "Two 1 special|onArrayChange ",
		'{^{myCustomArrayChangeWidget/}} - No update during insert - instead, custom onArrayChange handler called');
	eventData = "";

	// ................................ Act ..................................
	$.observable(model.things).refresh([{thing: "bush"}, {thing: "flower"}]);

	// ............................... Assert .................................
	assert.equal($("#result").text() + "|" + eventData, "Two 1 special|onArrayChange(refresh) onArrayChange(refresh) onArrayChange ",
		'{^{myCustomArrayChangeWidget/}} - No update during refresh - instead, custom onArrayChange handler called for each event');
	eventData = "";

	// ................................ Act ..................................
	$("#result").empty();

	// ............................... Assert .................................
	assert.equal($("#result").text() + "|" + eventData, "|onUnbind dispose ",
		'{^{myCustomArrayChangeWidget/}} - onDispose fires when container element is emptied or removed');

	// ................................ Reset ................................
	person1.lastName = "One";
	model.things = [];
	eventData = "";

	// =============================== Arrange ===============================

var i=0,
vm = {
	a: "A",
	p1: "P1",
	p2: "P2",
	elsea: "elseA",
	elsep1: "elseP1",
	elsep2: "elseP2",
	other: "O"
};

	// ................................ Act ..................................
$.views.templates({
	markup: "{^{mytag prop1=p1 prop2=p2 a ^other=other}}{{else prop1=elsep1 prop2=elsep2 elsea}}{{/mytag}}",
	tags: {
		mytag: {
			bindTo:["prop1", "prop2", 0],
			linkedElement: ["input", ".two", ".zero"],
			template: "<span></span> <input/> <input class='two'/> <input class='zero'/>",
			setValue: function(value, index, elseBlock, ev, eventArgs) {
				this.contents("span").text(i);
				return value + "(index:" + index + " else:" + elseBlock + " iteration:" + i++ + (ev ? " propChange: " + eventArgs.value : "") + ") ";
			},
			onUpdate: false
		}
	}
}).link("#result", vm);

var inputs = $("#result input"),
	spans = $("#result span");

	// ............................... Assert .................................
	assert.equal("myTag: " + spans[0].innerText + " inputs: " + inputs[0].value + inputs[1].value + inputs[2].value + 
		"myTagElse: " + spans[1].innerText + " inputs: " + inputs[3].value + inputs[4].value + inputs[5].value,
			"myTag: 5 inputs: P1(index:0 else:0 iteration:5) P2(index:1 else:0 iteration:4) A(index:2 else:0 iteration:3) " +
			"myTagElse: 5 inputs: elseP1(index:0 else:1 iteration:2) elseP2(index:1 else:1 iteration:1) elseA(index:2 else:1 iteration:0) ",
		'SetValue used correctly during rendering');

	// ................................ Act ..................................
	$.observable(vm).setProperty("a", "AX")
		.setProperty("p1", "p1X")
		.setProperty("p2", "p2X")
		.setProperty("elsea", "elseAX")
		.setProperty("elsep1", "elseP1X")
		.setProperty("elsep2", "elseP2X")
		.setProperty("other", "OX");

	// ............................... Assert .................................
	assert.equal("myTag: " + spans[0].innerText + " inputs: " + inputs[0].value + inputs[1].value + inputs[2].value + 
		"myTagElse: " + spans[1].innerText + " inputs: " + inputs[3].value + inputs[4].value + inputs[5].value,
			"myTag: 11 inputs: p1X(index:0 else:0 iteration:7 propChange: p1X) p2X(index:1 else:0 iteration:8 propChange: p2X) AX(index:2 else:0 iteration:6 propChange: AX) " +
			"myTagElse: 11 inputs: elseP1X(index:0 else:1 iteration:10 propChange: elseP1X) elseP2X(index:1 else:1 iteration:11 propChange: elseP2X) elseAX(index:2 else:1 iteration:9 propChange: elseAX) ",
		'SetValue used correctly during updating');

	// ................................ Act ..................................
	$("#result").empty();

	// =============================== Arrange ===============================

var i=0,
vm = {
	a: undefined,
	p1: undefined,
	p2: undefined,
	elsea: undefined,
	elsep1: undefined,
	elsep2: undefined,
	other: undefined
};

	// ................................ Act ..................................
$.views.templates({
	markup: "{^{mytag prop1=p1 prop2=p2 a ^other=other}}{{else prop1=elsep1 prop2=elsep2 elsea}}{{/mytag}}",
	tags: {
		mytag: {
			bindTo:["prop1", "prop2", 0],
			linkedElement: ["input", ".two", ".zero"],
			template: "<span></span> <input/> <input class='two'/> <input class='zero'/>",
			setValue: function(value, index, elseBlock, ev, eventArgs) {
				this.contents("span").text(i);
				return value + "(index:" + index + " else:" + elseBlock + " iteration:" + i++ + (ev ? " propChange: " + eventArgs.value : "") + ") ";
			},
			onUpdate: false
		}
	}
}).link("#result", vm);

var inputs = $("#result input"),
	spans = $("#result span");

	// ............................... Assert .................................
	assert.equal("myTag: " + spans[0].innerText + " inputs: " + inputs[0].value + inputs[1].value + inputs[2].value + 
		"myTagElse: " + spans[1].innerText + " inputs: " + inputs[3].value + inputs[4].value + inputs[5].value,
			"myTag: 5 inputs: undefined(index:0 else:0 iteration:5) undefined(index:1 else:0 iteration:4) undefined(index:2 else:0 iteration:3) " +
			"myTagElse: 5 inputs: undefined(index:0 else:1 iteration:2) undefined(index:1 else:1 iteration:1) undefined(index:2 else:1 iteration:0) ",
		'With undefined initial values for bound args/props SetValue is used correctly during rendering');

	// ................................ Act ..................................
	$.observable(vm).setProperty("a", "AX")
		.setProperty("p1", "p1X")
		.setProperty("p2", "p2X")
		.setProperty("elsea", "elseAX")
		.setProperty("elsep1", "elseP1X")
		.setProperty("elsep2", "elseP2X")
		.setProperty("other", "OX");

	// ............................... Assert .................................
	assert.equal("myTag: " + spans[0].innerText + " inputs: " + inputs[0].value + inputs[1].value + inputs[2].value + 
		"myTagElse: " + spans[1].innerText + " inputs: " + inputs[3].value + inputs[4].value + inputs[5].value,
			"myTag: 11 inputs: p1X(index:0 else:0 iteration:7 propChange: p1X) p2X(index:1 else:0 iteration:8 propChange: p2X) AX(index:2 else:0 iteration:6 propChange: AX) " +
			"myTagElse: 11 inputs: elseP1X(index:0 else:1 iteration:10 propChange: elseP1X) elseP2X(index:1 else:1 iteration:11 propChange: elseP2X) elseAX(index:2 else:1 iteration:9 propChange: elseAX) ",
		'With undefined initial values for bound args/props SetValue is used correctly during updating');

	// ................................ Act ..................................
	$("#result").empty();

	// =============================== Arrange ===============================

	// ................................ Act ..................................
	$.templates({
		markup: '<div>{^{myNoRenderWidget/}}</div>',
		tags: {
			myNoRenderWidget: {
				init: function(tagCtx, linkCtx, ctx) {
					eventData += "init ";
				},
				onAfterLink: function() {
					eventData += "after ";
				},
				onBind: function(tagCtx, linkCtx, ctx, ev, eventArgs) {
					eventData += "onBind ";
				},
				onUnbind: function(tagCtx, linkCtx, ctx, ev, eventArgs) {
					eventData += "onUnbind ";
				},
				onBeforeChange: function(ev, eventArgs) {
					eventData += "onBeforeChange ";
				},
				setValue: function(val, index, tagElse, ev, eventArgs) {
					eventData += "setValue (arg index: " + index + "-" + (this.tagCtx.args[index]===val) + ") ";
				},
				onAfterChange: function(ev, eventArgs) {
					eventData += "onAfterChange ";
				}
			}
		}
	}).link("#result", person1);

	// ............................... Assert .................................
	assert.equal($("#result").text() + "|" + eventData, 
"|init onBind after setValue (arg index: 0-true) ",
"Event sequence for a non-rendering custom tag control is correct");

	// ................................ Reset ................................
	person1.lastName = "One";
	model.things = [];
	$("#result").empty();

	// =============================== Arrange ===============================

	// ................................ Act ..................................
eventData = "Init| ";

	$.templates({
		markup: '<div>{^{mytag lastName/}}</div>',
		tags: {
			mytag: {
				setValue: function(val, index, tagElse, ev, eventArgs) {
					eventData += "setValue(arg:" + val + " index: " + index + "-" + (this.tagCtx.args[index]===val) + ") ";
				},
				test1: function(ev, eventArgs) {
					this.updateValue("One");
				},
				test2: function(ev, eventArgs) {
					this.updateValue()
				}
			}
		}
	}).link("#result", person1);

	var mytag = $.view().childTags("mytag")[0];

eventData += "\nUpdate to One| ";
mytag.updateValue("One"); // Same value so no-op
$.observable(person1).setProperty("lastName", "One"); // Same value so no-op

eventData += "\nUpdate to Two| ";
mytag.updateValue("Two"); // Change value
$.observable(person1).setProperty("lastName", "One"); // Change back to value previously passed in setValue() call

eventData += "\nUpdate to Two and setValue to Three, twice| ";
mytag.updateValue("Two");
mytag.setValue("Three");
$.observable(person1).setProperty("lastName", "Three");

	// ............................... Assert .................................
	assert.equal(eventData, 
"Init| setValue(arg:One index: 0-true) \nUpdate to One| \nUpdate to Two| setValue(arg:One index: 0-true) \nUpdate to Two and setValue to Three, twice| setValue(arg:Three index: 0-false) setValue(arg:Three index: 0-true) ",
"SetValue correctly called twice in a row for the same value - in response to bindFrom data value being returned to previous value, following call to tag.updateValue()");

	// ................................ Act ..................................
	$("#result").empty();
});

QUnit.test("tag onArrayChange options", function(assert) {

	// =============================== Arrange ===============================
	var data = {
		items: ["aa", "AA"],
		items2: ["bb", "BB"]
	};

	// ................................ Act ..................................
	var template = "First: {{:#data[0]}} Last: {{:#data[length-1]}} First2: {{:~tagCtx.args[1][0]}} Last2: {{:~tagCtx.args[1][~tagCtx.args[1].length-1]}}";

	$.templates({
		markup:
'1 {^{mytag items items2/}} ' +
'2 {^{arrChFn items items2/}} ' +
'2b {^{arrChFalse items items2/}} ' +
'3 <span data-link="{mytag items items2}"></span> ' +
'4 <span data-link="{arrChFn items items2}"></span> ' +
'4b <span data-link="{arrChFalse items items2}"></span> ' +
'5 {^{> items[0]+\'-\'+items2[0]}} ' +
'6 <span data-link="items[0]+\'-\'+items2[0]"></span> ' +
'7 <span data-link="items[0]+\'-\'+items2[0]"></span> ' +
'8 <span data-link="items[0]+\'-\'+items2[0] lateRender=true"></span> ' +
'9 {^{if items[0] ==="aa"}}not a{{/if}} ' +
'10 {^{for items2[0]==="bb" && items}} {{:}}{{/for}} ' +

'1 {^{mytag items items2 onArrayChange=false/}} ' +
'2 {^{arrChFn items items2 onArrayChange=true/}} ' +
'2b {^{arrChFalse items items2 onArrayChange=true/}} ' +
'3 <span data-link="{mytag items items2 onArrayChange=false}"></span> ' +
'4 <span data-link="{arrChFn items items2 onArrayChange=true}"></span> ' +
'4b <span data-link="{arrChFalse items items2 onArrayChange=true}"></span> ' +
'5 {^{> items[0]+\'-\'+items2[0] onArrayChange=false}} ' +
'6 <span data-link="items[0]+\'-\'+items2[0] onArrayChange=false"></span> ' +
'7 <span data-link="items[0]+\'-\'+items2[0] onArrayChange=false"></span> ' +
'8 <span data-link="items[0]+\'-\'+items2[0] onArrayChange=false lateRender=true"></span> ' +
'9 {^{if items[0] ==="aa" onArrayChange=false}}not a{{/if}} ' +
'10 {^{for items2[0]==="bb" && items onArrayChange=true}} {{:}}{{/for}}',
		tags: {
			mytag: template,
			arrChFn: {
				template: template,
				onArrayChange: function() {}
			},
			arrChFalse: {
				template: template,
				onArrayChange: function() {}
			}
		}
	}).link("#result", data);

	// ............................... Assert .................................
	assert.equal($("#result").text(),
		"1 First: aa Last: AA First2: bb Last2: BB 2 First: aa Last: AA First2: bb Last2: BB 2b First: aa Last: AA First2: bb Last2: BB 3 First: aa Last: AA First2: bb Last2: BB 4 First: aa Last: AA First2: bb Last2: BB 4b First: aa Last: AA First2: bb Last2: BB 5 aa-bb 6 aa-bb 7 aa-bb 8 aa-bb 9 not a 10  aa AA 1 First: aa Last: AA First2: bb Last2: BB 2 First: aa Last: AA First2: bb Last2: BB 2b First: aa Last: AA First2: bb Last2: BB 3 First: aa Last: AA First2: bb Last2: BB 4 First: aa Last: AA First2: bb Last2: BB 4b First: aa Last: AA First2: bb Last2: BB 5 aa-bb 6 aa-bb 7 aa-bb 8 aa-bb 9 not a 10  aa AA",
		'Initial rendering');

	// ................................ Act ..................................
	$.observable(data.items).move(0, data.items.length-1);
	$.observable(data.items2).move(0, data.items2.length-1);

	// ............................... Assert .................................
	assert.equal($("#result").text(),
		"1 First: AA Last: aa First2: BB Last2: bb 2 First: aa Last: AA First2: bb Last2: BB 2b First: aa Last: AA First2: bb Last2: BB 3 First: AA Last: aa First2: BB Last2: bb 4 First: aa Last: AA First2: bb Last2: BB 4b First: aa Last: AA First2: bb Last2: BB 5 AA-BB 6 AA-BB 7 AA-BB 8 AA-BB 9  10  AA aa 1 First: aa Last: AA First2: bb Last2: BB 2 First: AA Last: aa First2: BB Last2: bb 2b First: AA Last: aa First2: BB Last2: bb 3 First: aa Last: AA First2: bb Last2: BB 4 First: AA Last: aa First2: BB Last2: bb 4b First: AA Last: aa First2: BB Last2: bb 5 aa-bb 6 aa-bb 7 aa-bb 8 aa-bb 9 not a 10  false",
		'After array change "move"');

	// ................................ Act ..................................
	$.observable(data).setProperty({items: ["xx", "XX"], items2: ["yy", "YY"]});

	// ............................... Assert .................................
	assert.equal($("#result").text(),
		"1 First: xx Last: XX First2: yy Last2: YY 2 First: xx Last: XX First2: yy Last2: YY 2b First: xx Last: XX First2: yy Last2: YY 3 First: xx Last: XX First2: yy Last2: YY 4 First: xx Last: XX First2: yy Last2: YY 4b First: xx Last: XX First2: yy Last2: YY 5 xx-yy 6 xx-yy 7 xx-yy 8 xx-yy 9  10  false 1 First: xx Last: XX First2: yy Last2: YY 2 First: xx Last: XX First2: yy Last2: YY 2b First: xx Last: XX First2: yy Last2: YY 3 First: xx Last: XX First2: yy Last2: YY 4 First: xx Last: XX First2: yy Last2: YY 4b First: xx Last: XX First2: yy Last2: YY 5 xx-yy 6 xx-yy 7 xx-yy 8 xx-yy 9  10  false",
		'After property change "setProperty"');

	// ................................ Act ..................................
	$.observable(data.items).refresh(["aa", "AA"]);

	// ............................... Assert .................................
	assert.equal($("#result").text(),
		"1 First: aa Last: AA First2: yy Last2: YY 2 First: xx Last: XX First2: yy Last2: YY 2b First: xx Last: XX First2: yy Last2: YY 3 First: aa Last: AA First2: yy Last2: YY 4 First: xx Last: XX First2: yy Last2: YY 4b First: xx Last: XX First2: yy Last2: YY 5 aa-yy 6 aa-yy 7 aa-yy 8 aa-yy 9 not a 10  false 1 First: xx Last: XX First2: yy Last2: YY 2 First: aa Last: AA First2: yy Last2: YY 2b First: aa Last: AA First2: yy Last2: YY 3 First: xx Last: XX First2: yy Last2: YY 4 First: aa Last: AA First2: yy Last2: YY 4b First: aa Last: AA First2: yy Last2: YY 5 xx-yy 6 xx-yy 7 xx-yy 8 xx-yy 9  10  false",
		'After array change "refresh"');

	// ................................ Reset ................................
	$("#result").empty();
});
})(this, this.jQuery);