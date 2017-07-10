(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
/*! JsRender v0.9.87 (Beta): http://jsviews.com/#jsrender */
/*! **VERSION FOR WEB** (For NODE.JS see http://jsviews.com/download/jsrender-node.js) */
/*
 * Best-of-breed templating in browser or on Node.js.
 * Does not require jQuery, or HTML DOM
 * Integrates with JsViews (http://jsviews.com/#jsviews)
 *
 * Copyright 2017, Boris Moore
 * Released under the MIT License.
 */

//jshint -W018, -W041, -W120

(function(factory, global) {
	// global var is the this object, which is window when running in the usual browser environment
	var $ = global.jQuery;

	if (typeof exports === "object") { // CommonJS e.g. Browserify
		module.exports = $
			? factory(global, $)
			: function($) { // If no global jQuery, take optional jQuery passed as parameter: require('jsrender')(jQuery)
				if ($ && !$.fn) {
					throw "Provide jQuery or null";
				}
				return factory(global, $);
			};
	} else if (typeof define === "function" && define.amd) { // AMD script loader, e.g. RequireJS
		define(function() {
			return factory(global);
		});
	} else { // Browser using plain <script> tag
		factory(global, false);
	}
} (

// factory (for jsrender.js)
function(global, $) {
"use strict";

//========================== Top-level vars ==========================

// global var is the this object, which is window when running in the usual browser environment
var setGlobals = $ === false; // Only set globals if script block in browser (not AMD and not CommonJS)

$ = $ && $.fn ? $ : global.jQuery; // $ is jQuery passed in by CommonJS loader (Browserify), or global jQuery.

var versionNumber = "v0.9.87",
	jsvStoreName, rTag, rTmplString, topView, $views,	$expando,
	_ocp = "_ocp", // Observable contextual parameter

//TODO	tmplFnsCache = {},
	$isFunction, $isArray, $templates, $converters, $helpers, $tags, $sub, $subSettings, $subSettingsAdvanced, $viewsSettings, delimOpenChar0, delimOpenChar1, delimCloseChar0, delimCloseChar1, linkChar, setting, baseOnError,

	rPath = /^(!*?)(?:null|true|false|\d[\d.]*|([\w$]+|\.|~([\w$]+)|#(view|([\w$]+))?)([\w$.^]*?)(?:[.[^]([\w$]+)\]?)?)$/g,
	//        not                               object     helper    view  viewProperty pathTokens      leafToken

	rParams = /(\()(?=\s*\()|(?:([([])\s*)?(?:(\^?)(!*?[#~]?[\w$.^]+)?\s*((\+\+|--)|\+|-|&&|\|\||===|!==|==|!=|<=|>=|[<>%*:?\/]|(=))\s*|(!*?[#~]?[\w$.^]+)([([])?)|(,\s*)|(\(?)\\?(?:(')|("))|(?:\s*(([)\]])(?=\s*[.^]|\s*$|[^([])|[)\]])([([]?))|(\s+)/g,
	//          lftPrn0        lftPrn        bound            path    operator err                                                eq             path2       prn    comma   lftPrn2   apos quot      rtPrn rtPrnDot                           prn2  space
	// (left paren? followed by (path? followed by operator) or (path followed by left paren?)) or comma or apos or quot or right paren or space

	isRenderCall,
	rNewLine = /[ \t]*(\r\n|\n|\r)/g,
	rUnescapeQuotes = /\\(['"])/g,
	rEscapeQuotes = /['"\\]/g, // Escape quotes and \ character
	rBuildHash = /(?:\x08|^)(onerror:)?(?:(~?)(([\w$_\.]+):)?([^\x08]+))\x08(,)?([^\x08]+)/gi,
	rTestElseIf = /^if\s/,
	rFirstElem = /<(\w+)[>\s]/,
	rAttrEncode = /[\x00`><"'&=]/g, // Includes > encoding since rConvertMarkers in JsViews does not skip > characters in attribute strings
	rIsHtml = /[\x00`><\"'&=]/,
	rHasHandlers = /^on[A-Z]|^convert(Back)?$/,
	rWrappedInViewMarker = /^\#\d+_`[\s\S]*\/\d+_`$/,
	rHtmlEncode = rAttrEncode,
	viewId = 0,
	charEntities = {
		"&": "&amp;",
		"<": "&lt;",
		">": "&gt;",
		"\x00": "&#0;",
		"'": "&#39;",
		'"': "&#34;",
		"`": "&#96;",
		"=": "&#61;"
	},
	HTML = "html",
	OBJECT = "object",
	tmplAttr = "data-jsv-tmpl",
	jsvTmpl = "jsvTmpl",
	indexStr = "For #index in nested block use #getIndex().",
	$render = {},

	jsr = global.jsrender,
	jsrToJq = jsr && $ && !$.render, // JsRender already loaded, without jQuery. but we will re-load it now to attach to jQuery

	jsvStores = {
		template: {
			compile: compileTmpl
		},
		tag: {
			compile: compileTag
		},
		viewModel: {
			compile: compileViewModel
		},
		helper: {},
		converter: {}
	};

	// views object ($.views if jQuery is loaded, jsrender.views if no jQuery, e.g. in Node.js)
	$views = {
		jsviews: versionNumber,
		sub: {
			// subscription, e.g. JsViews integration
			View: View,
			Err: JsViewsError,
			tmplFn: tmplFn,
			parse: parseParams,
			extend: $extend,
			extendCtx: extendCtx,
			syntaxErr: syntaxError,
			onStore: {
				template: function(name, item) {
					if (item === null) {
						delete $render[name];
					} else {
						$render[name] = item;
					}
				}
			},
			addSetting: addSetting,
			settings: {
				allowCode: false
			},
			advSet: noop, // Update advanced settings
			_ths: tagHandlersFromProps,
			_gm: getMethod,
			_tg: function() {}, // Constructor for tagDef
			_cnvt: convertVal,
			_tag: renderTag,
			_er: error,
			_err: onRenderError,
			_html: htmlEncode,
			_cp: retVal, // Get observable contextual parameters (or properties) ~foo=expr. In JsRender, simply returns val.
			_sq: function(token) {
				if (token === "constructor") {
					syntaxError("");
				}
				return token;
			}
		},
		settings: {
			delimiters: $viewsDelimiters,
			advanced: function(value) {
				return value
					? (
							$extend($subSettingsAdvanced, value),
							$sub.advSet(),
							$viewsSettings
						)
						: $subSettingsAdvanced;
				}
		},
		map: dataMap    // If jsObservable loaded first, use that definition of dataMap
	};

function getDerivedMethod(baseMethod, method) {
	return function() {
		var ret,
			tag = this,
			prevBase = tag.base;

		tag.base = baseMethod; // Within method call, calling this.base will call the base method
		ret = method.apply(tag, arguments); // Call the method
		tag.base = prevBase; // Replace this.base to be the base method of the previous call, for chained calls
		return ret;
	};
}

function getMethod(baseMethod, method) {
	// For derived methods (or handlers declared declaratively as in {{:foo onChange=~fooChanged}} replace by a derived method, to allow using this.base(...)
	// or this.baseApply(arguments) to call the base implementation. (Equivalent to this._super(...) and this._superApply(arguments) in jQuery UI)
	if ($isFunction(method)) {
		method = getDerivedMethod(
				!baseMethod
					? noop // no base method implementation, so use noop as base method
					: baseMethod._d
						? baseMethod // baseMethod is a derived method, so use it
						: getDerivedMethod(noop, baseMethod), // baseMethod is not derived so make its base method be the noop method
				method
			);
		method._d = 1; // Add flag that this is a derived method
	}
	return method;
}

function tagHandlersFromProps(tag, tagCtx) {
	for (var prop in tagCtx.props) {
		if (rHasHandlers.test(prop) && !(tag[prop] && tag[prop].fix)) { // Don't override handlers with fix expando (used in datepicker and spinner)
			tag[prop] = getMethod(tag.constructor.prototype[prop], tagCtx.props[prop]);
			// Copy over the onFoo props, convert and convertBack from tagCtx.props to tag (overrides values in tagDef).
			// Note: unsupported scenario: if handlers are dynamically added ^onFoo=expression this will work, but dynamically removing will not work.
		}
	}
}

function retVal(val) {
	return val;
}

function noop() {
	return "";
}

function dbgBreak(val) {
	// Usage examples: {{dbg:...}}, {{:~dbg(...)}}, {{dbg .../}}, {^{for ... onAfterLink=~dbg}} etc.
	try {
		console.log("JsRender dbg breakpoint: " + val);
		throw "dbg breakpoint"; // To break here, stop on caught exceptions.
	}
	catch (e) {}
	return this.base ? this.baseApply(arguments) : val;
}

function JsViewsError(message) {
	// Error exception type for JsViews/JsRender
	// Override of $.views.sub.Error is possible
	this.name = ($.link ? "JsViews" : "JsRender") + " Error";
	this.message = message || this.name;
}

function $extend(target, source) {
	if (target) {
		for (var name in source) {
			target[name] = source[name];
		}
		return target;
	}
}

(JsViewsError.prototype = new Error()).constructor = JsViewsError;

//========================== Top-level functions ==========================

//===================
// views.delimiters
//===================

function $viewsDelimiters(openChars, closeChars, link) {
	// Set the tag opening and closing delimiters and 'link' character. Default is "{{", "}}" and "^"
	// openChars, closeChars: opening and closing strings, each with two characters
	if (!openChars) {
		return $subSettings.delimiters;
	}
	if ($isArray(openChars)) {
		return $viewsDelimiters.apply($views, openChars);
	}

	$subSettings.delimiters = [openChars, closeChars, linkChar = link ? link.charAt(0) : linkChar];

	delimOpenChar0 = openChars.charAt(0); // Escape the characters - since they could be regex special characters
	delimOpenChar1 = openChars.charAt(1);
	delimCloseChar0 = closeChars.charAt(0);
	delimCloseChar1 = closeChars.charAt(1);
	openChars = "\\" + delimOpenChar0 + "(\\" + linkChar + ")?\\" + delimOpenChar1; // Default is "{^{"
	closeChars = "\\" + delimCloseChar0 + "\\" + delimCloseChar1;                   // Default is "}}"
	// Build regex with new delimiters
	//          [tag    (followed by / space or })  or cvtr+colon or html or code] followed by space+params then convertBack?
	rTag = "(?:(\\w+(?=[\\/\\s\\" + delimCloseChar0 + "]))|(\\w+)?(:)|(>)|(\\*))\\s*((?:[^\\"
		+ delimCloseChar0 + "]|\\" + delimCloseChar0 + "(?!\\" + delimCloseChar1 + "))*?)";

	// Make rTag available to JsViews (or other components) for parsing binding expressions
	$sub.rTag = "(?:" + rTag + ")";
	//                        { ^? {   tag+params slash?  or closingTag                                                   or comment
	rTag = new RegExp("(?:" + openChars + rTag + "(\\/)?|\\" + delimOpenChar0 + "(\\" + linkChar + ")?\\" + delimOpenChar1 + "(?:(?:\\/(\\w+))\\s*|!--[\\s\\S]*?--))" + closeChars, "g");

	// Default:  bind     tagName         cvt   cln html code    params            slash   bind2         closeBlk  comment
	//      /(?:{(\^)?{(?:(\w+(?=[\/\s}]))|(\w+)?(:)|(>)|(\*))\s*((?:[^}]|}(?!}))*?)(\/)?|{(\^)?{(?:(?:\/(\w+))\s*|!--[\s\S]*?--))}}

	$sub.rTmpl = new RegExp("^\\s|\\s$|<.*>|([^\\\\]|^)[{}]|" + openChars + ".*" + closeChars);
	// $sub.rTmpl looks for initial or final white space, html tags or { or } char not preceded by \\, or JsRender tags {{xxx}}.
	// Each of these strings are considered NOT to be jQuery selectors
	return $viewsSettings;
}

//=========
// View.get
//=========

function getView(inner, type) { //view.get(inner, type)
	if (!type && inner !== true) {
		// view.get(type)
		type = inner;
		inner = undefined;
	}

	var views, i, l, found,
		view = this,
		root = !type || type === "root";
		// If type is undefined, returns root view (view under top view).

	if (inner) {
		// Go through views - this one, and all nested ones, depth-first - and return first one with given type.
		// If type is undefined, i.e. view.get(true), return first child view.
		found = type && view.type === type && view;
		if (!found) {
			views = view.views;
			if (view._.useKey) {
				for (i in views) {
					if (found = type ? views[i].get(inner, type) : views[i]) {
						break;
					}
				}
			} else {
				for (i = 0, l = views.length; !found && i < l; i++) {
					found = type ? views[i].get(inner, type) : views[i];
				}
			}
		}
	} else if (root) {
		// Find root view. (view whose parent is top view)
		found = view.root;
	} else {
		while (view && !found) {
			// Go through views - this one, and all parent ones - and return first one with given type.
			found = view.type === type ? view : undefined;
			view = view.parent;
		}
	}
	return found;
}

function getNestedIndex() {
	var view = this.get("item");
	return view ? view.index : undefined;
}

getNestedIndex.depends = function() {
	return [this.get("item"), "index"];
};

function getIndex() {
	return this.index;
}

getIndex.depends = "index";

//==========
// View.hlp
//==========

function contextParameter(key, value, isContextCb) {
	// Helper method called as view.ctxPrm(key) for helpers or template parameters ~foo - from compiled template or from context callback
	var wrapped, deps, res, obsCtxPrm,
		storeView = this,
		isUpdate = !isRenderCall && value !== undefined,
		store = storeView.ctx;

	if (key in store || key in (store = $helpers)) {
		res = store && store[key];
		if (key === "tag" || key === "root" || key === "parentTags" || storeView._.it === key ) {
			return res;
		}
	} else {
		store = undefined;
	}
	if (!res || !$isFunction(res) && storeView.linked || storeView.tagCtx) { // Data-linked view, or tag instance
		if (!res || !res._cxp) {
			// Not a contextual parameter
			if (store !== $helpers) {
				// Set storeView to tag (if this is a tag.ctxPrm() call) or to root view (view under top view)
				storeView = storeView.ctx && storeView.ctx.tag || storeView.root;
				store = storeView._ocps;
				res = store && store[key] || res;
			}
			if (!(res && res._cxp) && (isContextCb || isUpdate)) {
				res = $sub._crcp(key, res, storeView, store); // Create observable contextual parameter
			}
		}
		if (obsCtxPrm = res && res._cxp) {
			if (isUpdate) {
				return $sub._ucp(key, value, storeView, obsCtxPrm); // Update observable contextual parameter
			}
			if (isContextCb) { // If this helper resource is an observable contextual parameter
				// In a context callback for a contextual param, return the [view, dependencies...] array - needed for observe call
				deps = res[1] ? $sub._ceo(res[1].deps) : [_ocp]; // fn deps (with any exprObs cloned using $sub._ceo)
				deps.unshift(res[0]); // view
				deps._cxp = obsCtxPrm;
				return deps;
			}
			res = res[1] // linkFn for compiled expression
				? obsCtxPrm.tag && obsCtxPrm.tag.cvtArgs
					? obsCtxPrm.tag.cvtArgs(undefined, 1, obsCtxPrm.tagElse)[obsCtxPrm.ind] // = tag.bndArgs() - for tag contextual parameter
					: res[1](res[0].data, res[0], $sub)    // = fn(data, view, $sub) for compiled binding expression
				: res[0]._ocp; // Observable contextual parameter (uninitialized, or initialized as static expression, so no path dependencies)
		}
	}
	if (res && $isFunction(res)) {
		// If a helper is of type function, and not already wrapped, we will wrap it, so if called with no this pointer it will be called with the
		// view as 'this' context. If the helper ~foo() was in a data-link expression, the view will have a 'temporary' linkCtx property too.
		// Note that helper functions on deeper paths will have specific this pointers, from the preceding path.
		// For example, ~util.foo() will have the ~util object as 'this' pointer
		wrapped = function() {
			return res.apply((!this || this === global) ? storeView : this, arguments);
		};
		$extend(wrapped, res); // Attach same expandos (if any) to the wrapped function
		wrapped._vw = storeView;
	}
	return wrapped || res;
}

function getTemplate(tmpl) {
	return tmpl && (tmpl.fn
		? tmpl
		: this.getRsc("templates", tmpl) || $templates(tmpl)); // not yet compiled
}

//==============
// views._cnvt
//==============

function convertVal(converter, view, tagCtx, onError) {
	// self is template object or linkCtx object
	var tag, value,
		// If tagCtx is an integer, then it is the key for the compiled function to return the boundTag tagCtx
		boundTag = typeof tagCtx === "number" && view.tmpl.bnds[tagCtx-1],
		linkCtx = view.linkCtx; // For data-link="{cvt:...}"...

	if (onError === undefined && boundTag && boundTag._lr) { // lateRender
		onError = "";
	}
	if (onError !== undefined) {
		tagCtx = onError = {props: {}, args: [onError]};
	} else if (boundTag) {
		tagCtx = boundTag(view.data, view, $sub);
	}
	boundTag = boundTag._bd && boundTag;
	value = tagCtx.args[0];
	if (converter || boundTag) {
		tag = linkCtx && linkCtx.tag;
		tagCtx.view = view;
		if (!tag) {
			tag = $extend(new $sub._tg(), {
				_: {
					inline: !linkCtx,
					bnd: boundTag,
					unlinked: true
				},
				tagName: ":",
				cvt: converter,
				flow: true,
				tagCtx: tagCtx
			});
			if (linkCtx) {
				linkCtx.tag = tag;
				tag.linkCtx = linkCtx;
			}
			tagCtx.ctx = extendCtx(tagCtx.ctx, (linkCtx ? linkCtx.view : view).ctx);
			tagHandlersFromProps(tag, tagCtx);
		}
		tag._er = onError && value;
		tag.ctx = tagCtx.ctx || tag.ctx || {};
		tagCtx.ctx = undefined;

		value = tag.cvtArgs(converter !== "true" && converter)[0]; // If there is a convertBack but no convert, converter will be "true"
	}

	// Call onRender (used by JsViews if present, to add binding annotations around rendered content)
	value = boundTag && view._.onRender
		? view._.onRender(value, view, tag)
		: value;
	return value != undefined ? value : "";
}

function convertArgs(converter, bound, tagElse) { // tag.cvtArgs()
	var l, key, boundArgs, args, bindTo, tag,
		tagCtx = this;

	if (tagCtx.tagName) {
		tag = tagCtx;
		tagCtx = tag.tagCtxs ? tag.tagCtxs[tagElse || 0] : tag.tagCtx;
	} else {
		tag = tagCtx.tag;
		tagElse = tagCtx.index;
	}

	bindTo = tag.bindTo;
	args = tagCtx.args;

	converter = converter || tag.convert;
	if ("" + converter === converter) {
		converter = tagCtx.view.getRsc("converters", converter) || error("Unknown converter: '" + converter + "'");
	}

	if (!args.length && tag.argDefault !== false && !tagCtx.index) {
		args = [tagCtx.view.data]; // Missing first arg defaults to the current data context
	} else if (converter && !bound) { // If there is a converter, use a copy of the tagCtx.args array for rendering, and replace the args[0] in
		args = args.slice(); // the copied array with the converted value. But we do not modify the value of tag.tagCtx.args[0] (the original args array)
	}

	if (bindTo) { // Get the values of the boundArgs
		boundArgs = [];
		l = bindTo.length;
		while (l--) {
			key = bindTo[l];
			boundArgs.unshift(argOrProp(tagCtx, key));
		}
		if (bound) {
			args = boundArgs; // Call to convertBoundArgs() - returns the boundArgs
		}
	}

	if (converter) {
		bindTo = bindTo || [0];
		converter = converter.apply(tag, boundArgs || args);
		l = bindTo.length;
		converter = l < 2 ? [converter] : converter || [];
		if (bound) {        // Call to bndArgs convertBoundArgs() - so apply converter to all boundArgs
			args = converter; // The array of values returned from the converter
		} else {            // Call to cvtArgs()
			while (l--) {
				key = bindTo[l];
				if (+key === key) {
					args[key] = converter ? converter[l] : undefined;
				}
			}
		}
	}
	return args;
}

function argOrProp(context, key) {
	context = context[+key === key ? "args" : "props"];
	return context && context[key];
}

function convertBoundArgs(tagElse) { // tag.bndArgs()
	return this.cvtArgs(undefined, true, tagElse);
}

//=============
// views._tag
//=============

function getResource(resourceType, itemName) {
	var res, store,
		view = this;
	while ((res === undefined) && view) {
		store = view.tmpl && view.tmpl[resourceType];
		res = store && store[itemName];
		view = view.parent;
	}
	return res || $views[resourceType][itemName];
}

function renderTag(tagName, parentView, tmpl, tagCtxs, isUpdate, onError) {
	parentView = parentView || topView;
	var tag, tag_, tagDef, template, tags, attr, parentTag, l, m, n, itemRet, tagCtx, tagCtxCtx, ctxPrm, bindTo,
		content, callInit, mapDef, thisMap, args, props, tagDataMap, contentCtx, key,
		i = 0,
		ret = "",
		linkCtx = parentView.linkCtx || 0,
		ctx = parentView.ctx,
		parentTmpl = tmpl || parentView.tmpl,
		// If tagCtxs is an integer, then it is the key for the compiled function to return the boundTag tagCtxs
		boundTag = typeof tagCtxs === "number" && parentView.tmpl.bnds[tagCtxs-1];

	if (tagName._is === "tag") {
		tag = tagName;
		tagName = tag.tagName;
		tagCtxs = tag.tagCtxs;
		template = tag.template;
	} else {
		tagDef = parentView.getRsc("tags", tagName) || error("Unknown tag: {{" + tagName + "}} ");
		template = tagDef.template;
	}

	if (onError === undefined && boundTag && boundTag._lr) {
		onError = "";
	}
	if (onError !== undefined) {
		ret += onError;
		tagCtxs = onError = [{props: {}, args: []}];
	} else if (boundTag) {
		tagCtxs = boundTag(parentView.data, parentView, $sub);
	}

	l = tagCtxs.length;
	for (; i < l; i++) {
		tagCtx = tagCtxs[i];
		if (!linkCtx || !linkCtx.tag || i && !linkCtx.tag._.inline || tag._er) {
			// Initialize tagCtx
			// For block tags, tagCtx.tmpl is an integer > 0
			if (content = parentTmpl.tmpls && tagCtx.tmpl) {
				content = tagCtx.content = parentTmpl.tmpls[content - 1];
			}
			tagCtx.index = i;
			tagCtx.tmpl = content; // Set the tmpl property to the content of the block tag
			tagCtx.render = renderContent;
			tagCtx.view = parentView;
			tagCtx.ctx = extendCtx(tagCtx.ctx, ctx); // Clone and extend parentView.ctx
		}
		if (tmpl = tagCtx.props.tmpl) {
			// If the tmpl property is overridden, set the value (when initializing, or, in case of binding: ^tmpl=..., when updating)
			tagCtx.tmpl = parentView.getTmpl(tmpl);
		}

		if (!tag) {
			// This will only be hit for initial tagCtx (not for {{else}}) - if the tag instance does not exist yet
			// If the tag has not already been instantiated, we will create a new instance.
			// ~tag will access the tag, even within the rendering of the template content of this tag.
			// From child/descendant tags, can access using ~tag.parent, or ~parentTags.tagName
			tag = new tagDef._ctr();
			callInit = !!tag.init;

			tag.parent = parentTag = ctx && ctx.tag;
			tag.tagCtxs = tagCtxs;
			tagDataMap = tag.dataMap;

			if (linkCtx) {
				tag._.inline = false;
				linkCtx.tag = tag;
				tag.linkCtx = linkCtx;
			}
			if (tag._.bnd = boundTag || linkCtx.fn) {
				// Bound if {^{tag...}} or data-link="{tag...}"
				tag._.arrVws = {};
			} else if (tag.dataBoundOnly) {
				error(tagName + " must be data-bound:\n{^{" + tagName + "}}");
			}
			//TODO better perf for childTags() - keep child tag.tags array, (and remove child, when disposed)
			// tag.tags = [];
		}
		bindTo = tag.bindTo || [0];
		tagCtxs = tag.tagCtxs;
		tagDataMap = tag.dataMap;

		tagCtx.tag = tag;
		if (tagDataMap && tagCtxs) {
			tagCtx.map = tagCtxs[i].map; // Copy over the compiled map instance from the previous tagCtxs to the refreshed ones
		}
		if (!tag.flow) {
			tagCtxCtx = tagCtx.ctx = tagCtx.ctx || {};

			// tags hash: tag.ctx.tags, merged with parentView.ctx.tags,
			tags = tag.parents = tagCtxCtx.parentTags = ctx && extendCtx(tagCtxCtx.parentTags, ctx.parentTags) || {};
			if (parentTag) {
				tags[parentTag.tagName] = parentTag;
				//TODO better perf for childTags: parentTag.tags.push(tag);
			}
			tags[tag.tagName] = tagCtxCtx.tag = tag;
		}
	}
	if (!(tag._er = onError)) {
		tagHandlersFromProps(tag, tagCtxs[0]);
		tag.rendering = {}; // Provide object for state during render calls to tag and elses. (Used by {{if}} and {{for}}...)
		for (i = 0; i < l; i++) { // Iterate tagCtx for each {{else}} block
			tagCtx = tag.tagCtx = tagCtxs[i];
			props = tagCtx.props;
			tag.ctx = tagCtx.ctx;

			if (!i) {
				if (callInit) {
					tag.init(tagCtx, linkCtx, tag.ctx);
					callInit = undefined;
				}
				if (linkCtx) {
					// Set attr on linkCtx to ensure outputting to the correct target attribute.
					// Setting either linkCtx.attr or this.attr in the init() allows per-instance choice of target attrib.
					linkCtx.attr = tag.attr = linkCtx.attr || tag.attr;
				}
				attr = tag.attr;
				tag._.noVws = attr && attr !== HTML;
			}
			args = tag.cvtArgs(undefined, undefined, i);
			if (tag.linkedCtxParam) {
				m = bindTo.length;
				while (m--) {
					if (ctxPrm = tag.linkedCtxParam[m]) {
						key = bindTo[m];
						// Create tag contextual parameter
						tagCtx.ctx[ctxPrm] = $sub._cp(argOrProp(tagCtx, key), argOrProp(tagCtx.params, key), tagCtx.view, tag._.bnd && {tag: tag, ind: m, tagElse: i});
					}
				}
			}
			if (mapDef = props.dataMap || tagDataMap) {
				if (args.length || props.dataMap) {
					thisMap = tagCtx.map;
					if (!thisMap || thisMap.src !== args[0] || isUpdate) {
						if (thisMap && thisMap.src) {
							thisMap.unmap(); // only called if observable map - not when only used in JsRender, e.g. by {{props}}
						}
						thisMap = tagCtx.map = mapDef.map(args[0], props, undefined, !tag._.bnd);
					}
					args = [thisMap.tgt];
				}
			}

			itemRet = undefined;
			if (tag.render) {
				itemRet = tag.render.apply(tag, args);
				if (parentView.linked && itemRet && !rWrappedInViewMarker.test(itemRet)) {
					// When a tag renders content from the render method, with data linking then we need to wrap with view markers, if absent,
					// to provide a contentView for the tag, which will correctly dispose bindings if deleted. The 'tmpl' for this view will
					// be a dumbed down template which will always return the  itemRet string (no matter what the data is). The itemRet string
					// is not compiled as template markup, so can include "{{" or "}}" without triggering syntax errors
					tmpl = { // 'Dumbed down' template which always renders 'static' itemRet string
						links: []
					};
					tmpl.render = tmpl.fn = function() {
						return itemRet;
					};
					itemRet = renderWithViews(tmpl, parentView.data, undefined, true, parentView, undefined, undefined, tag);
				}
			}
			if (!args.length) {
				args = [parentView]; // no arguments - (e.g. {{else}}) get data context from view.
			}
			if (itemRet === undefined) {
				contentCtx = args[0]; // Default data context for wrapped block content is the first argument
				if (tag.contentCtx) { // Set tag.contentCtx to true, to inherit parent context, or to a function to provide alternate context.
					contentCtx = tag.contentCtx === true ? parentView : tag.contentCtx(contentCtx);
				}
				itemRet = tagCtx.render(contentCtx, true) || (isUpdate ? undefined : "");
			}
			// No return value from render, and no template/content tagCtx.render(...), so return undefined
			ret = ret ? ret + (itemRet || "") : itemRet; // If no rendered content, this will be undefined
		}
		tag.rendering = undefined;
	}
	tag.tagCtx = tagCtxs[0];
	tag.ctx = tag.tagCtx.ctx;

	if (tag._.noVws) {
			if (tag._.inline) {
			// inline tag with attr set to "text" will insert HTML-encoded content - as if it was element-based innerText
			ret = attr === "text"
				? $converters.html(ret)
				: "";
		}
	}
	return boundTag && parentView._.onRender
		// Call onRender (used by JsViews if present, to add binding annotations around rendered content)
		? parentView._.onRender(ret, parentView, tag)
		: ret;
}

//=================
// View constructor
//=================

function View(context, type, parentView, data, template, key, onRender, contentTmpl) {
	// Constructor for view object in view hierarchy. (Augmented by JsViews if JsViews is loaded)
	var views, parentView_, tag, self_,
		self = this,
		isArray = type === "array";

	self.content = contentTmpl;
	self.views = isArray ? [] : {};
	self.parent = parentView;
	self.type = type || "top";
	self.root = parentView && parentView.root || type && self; // view whose parent is top view
	self.data = data;
	self.tmpl = template;
	// If the data is an array, this is an 'array view' with a views array for each child 'item view'
	// If the data is not an array, this is an 'item view' with a views 'hash' object for any child nested views
	// ._.useKey is non zero if is not an 'array view' (owning a data array). Use this as next key for adding to child views hash
	self_ = self._ = {
		key: 0,
		useKey: isArray ? 0 : 1,
		id: "" + viewId++,
		onRender: onRender,
		bnds: {}
	};
	self.linked = !!onRender;
	if (parentView) {
		views = parentView.views;
		parentView_ = parentView._;
		if (parentView_.useKey) {
			// Parent is not an 'array view'. Add this view to its views object
			// self._key = is the key in the parent view hash
			views[self_.key = "_" + parentView_.useKey++] = self;
			self.index = indexStr;
			self.getIndex = getNestedIndex;
		} else if (views.length === (self_.key = self.index = key)) { // Parent is an 'array view'. Add this view to its views array
			views.push(self); // Adding to end of views array. (Using push when possible - better perf than splice)
		} else {
			views.splice(key, 0, self); // Inserting in views array
		}
		// If no context was passed in, use parent context
		// If context was passed in, it should have been merged already with parent context
		self.ctx = context || parentView.ctx;
	} else {
		self.ctx = context || {};
	}
}

View.prototype = {
	get: getView,
	getIndex: getIndex,
	getRsc: getResource,
	getTmpl: getTemplate,
	ctxPrm: contextParameter,
	_is: "view"
};

//====================================================
// Registration
//====================================================

function compileChildResources(parentTmpl) {
	var storeName, storeNames, resources;
	for (storeName in jsvStores) {
		storeNames = storeName + "s";
		if (parentTmpl[storeNames]) {
			resources = parentTmpl[storeNames];    // Resources not yet compiled
			parentTmpl[storeNames] = {};               // Remove uncompiled resources
			$views[storeNames](resources, parentTmpl); // Add back in the compiled resources
		}
	}
}

//===============
// compileTag
//===============

function compileTag(name, tagDef, parentTmpl) {
	var tmpl, baseTag, prop, l, key, bindToLength,
		bindTo = tagDef.bindTo,
		compiledDef = new $sub._tg();

	function Tag() {
		var tag = this;
		tag._ = {
			inline: true,
			unlinked: true
		};

		tag.tagName = name;
	}

	function makeArray(type) {
		var linkedElement;
		if (linkedElement = tagDef[type]) {
			tagDef[type] = linkedElement = $isArray(linkedElement) ? linkedElement: [linkedElement];
			if ((bindToLength || 1) !== linkedElement.length) {
				error(type + " length not same as bindTo ");
			}
		}
	}

	if ($isFunction(tagDef)) {
		// Simple tag declared as function. No presenter instantation.
		tagDef = {
			depends: tagDef.depends,
			render: tagDef
		};
	} else if ("" + tagDef === tagDef) {
		tagDef = {template: tagDef};
	}

	if (bindTo !== undefined) {
		bindTo = tagDef.bindTo = $isArray(bindTo) ? bindTo : [bindTo];
		l = bindToLength = bindTo.length;
		while (l--) {
			key = bindTo[l];
			if (!isNaN(parseInt(key))) {
				key = parseInt(key); // Convert "0" to 0,  etc.
			}
			bindTo[l] = key;
		}
	}

	makeArray("linkedElement");
	makeArray("linkedCtxParam");

	if (baseTag = tagDef.baseTag) {
		tagDef.flow = !!tagDef.flow; // Set flow property, so defaults to false even if baseTag has flow=true
		tagDef.baseTag = baseTag = "" + baseTag === baseTag
			? (parentTmpl && parentTmpl.tags[baseTag] || $tags[baseTag])
			: baseTag;

		compiledDef = $extend(compiledDef, baseTag);

		for (prop in tagDef) {
			compiledDef[prop] = getMethod(baseTag[prop], tagDef[prop]);
		}
	} else {
		compiledDef = $extend(compiledDef, tagDef);
	}

	// Tag declared as object, used as the prototype for tag instantiation (control/presenter)
	if ((tmpl = compiledDef.template) !== undefined) {
		compiledDef.template = "" + tmpl === tmpl ? ($templates[tmpl] || $templates(tmpl)) : tmpl;
	}
	(Tag.prototype = compiledDef).constructor = compiledDef._ctr = Tag;

	if (parentTmpl) {
		compiledDef._parentTmpl = parentTmpl;
	}
	return compiledDef;
}

function baseApply(args) {
	// In derived method (or handler declared declaratively as in {{:foo onChange=~fooChanged}} can call base method,
	// using this.baseApply(arguments) (Equivalent to this._superApply(arguments) in jQuery UI)
	return this.base.apply(this, args);
}

//===============
// compileTmpl
//===============

function compileTmpl(name, tmpl, parentTmpl, options) {
	// tmpl is either a template object, a selector for a template script block, the name of a compiled template, or a template object

	//==== nested functions ====
	function lookupTemplate(value) {
		// If value is of type string - treat as selector, or name of compiled template
		// Return the template object, if already compiled, or the markup string
		var currentName, tmpl;
		if (("" + value === value) || value.nodeType > 0 && (elem = value)) {
			if (!elem) {
				if (/^\.\/[^\\:*?"<>]*$/.test(value)) {
					// tmpl="./some/file.html"
					// If the template is not named, use "./some/file.html" as name.
					if (tmpl = $templates[name = name || value]) {
						value = tmpl;
					} else {
						// BROWSER-SPECIFIC CODE (not on Node.js):
						// Look for server-generated script block with id "./some/file.html"
						elem = document.getElementById(value);
					}
				} else if ($.fn && !$sub.rTmpl.test(value)) {
					try {
						elem = $ (value, document)[0]; // if jQuery is loaded, test for selector returning elements, and get first element
					} catch (e) {}
				}// END BROWSER-SPECIFIC CODE
			} //BROWSER-SPECIFIC CODE
			if (elem) {
				// Generally this is a script element.
				// However we allow it to be any element, so you can for example take the content of a div,
				// use it as a template, and replace it by the same content rendered against data.
				// e.g. for linking the content of a div to a container, and using the initial content as template:
				// $.link("#content", model, {tmpl: "#content"});
				if (options) {
					// We will compile a new template using the markup in the script element
					value = elem.innerHTML;
				} else {
					// We will cache a single copy of the compiled template, and associate it with the name
					// (renaming from a previous name if there was one).
					currentName = elem.getAttribute(tmplAttr);
					if (currentName) {
						if (currentName !== jsvTmpl) {
							value = $templates[currentName];
							delete $templates[currentName];
						} else if ($.fn) {
							value = $.data(elem)[jsvTmpl]; // Get cached compiled template
						}
					}
					if (!currentName || !value) { // Not yet compiled, or cached version lost
						name = name || ($.fn ? jsvTmpl : value);
						value = compileTmpl(name, elem.innerHTML, parentTmpl, options);
					}
					value.tmplName = name = name || currentName;
					if (name !== jsvTmpl) {
						$templates[name] = value;
					}
					elem.setAttribute(tmplAttr, name);
					if ($.fn) {
						$.data(elem, jsvTmpl, value);
					}
				}
			} // END BROWSER-SPECIFIC CODE
			elem = undefined;
		} else if (!value.fn) {
			value = undefined;
			// If value is not a string. HTML element, or compiled template, return undefined
		}
		return value;
	}

	var elem, compiledTmpl,
		tmplOrMarkup = tmpl = tmpl || "";

	//==== Compile the template ====
	if (options === 0) {
		options = undefined;
		tmplOrMarkup = lookupTemplate(tmplOrMarkup); // Top-level compile so do a template lookup
	}

	// If options, then this was already compiled from a (script) element template declaration.
	// If not, then if tmpl is a template object, use it for options
	options = options || (tmpl.markup ? tmpl : {});
	options.tmplName = name;
	if (parentTmpl) {
		options._parentTmpl = parentTmpl;
	}
	// If tmpl is not a markup string or a selector string, then it must be a template object
	// In that case, get it from the markup property of the object
	if (!tmplOrMarkup && tmpl.markup && (tmplOrMarkup = lookupTemplate(tmpl.markup))) {
		if (tmplOrMarkup.fn) {
			// If the string references a compiled template object, need to recompile to merge any modified options
			tmplOrMarkup = tmplOrMarkup.markup;
		}
	}
	if (tmplOrMarkup !== undefined) {
		if (tmplOrMarkup.fn || tmpl.fn) {
			// tmpl is already compiled, so use it
			if (tmplOrMarkup.fn) {
				compiledTmpl = tmplOrMarkup;
			}
		} else {
			// tmplOrMarkup is a markup string, not a compiled template
			// Create template object
			tmpl = tmplObject(tmplOrMarkup, options);
			// Compile to AST and then to compiled function
			tmplFn(tmplOrMarkup.replace(rEscapeQuotes, "\\$&"), tmpl);
		}
		if (!compiledTmpl) {
			compiledTmpl = $extend(function() {
				return compiledTmpl.render.apply(compiledTmpl, arguments);
			}, tmpl);

			compileChildResources(compiledTmpl);
		}
		return compiledTmpl;
	}
}

//==== /end of function compileTmpl ====

//=================
// compileViewModel
//=================

function getDefaultVal(defaultVal, data) {
	return $isFunction(defaultVal)
		? defaultVal.call(data)
		: defaultVal;
}

function unmapArray(modelArr) {
		var arr = [],
			i = 0,
			l = modelArr.length;
		for (; i<l; i++) {
			arr.push(modelArr[i].unmap());
		}
		return arr;
}

function compileViewModel(name, type) {
	var i, constructor,
		viewModels = this,
		getters = type.getters,
		extend = type.extend,
		id = type.id,
		proto = $.extend({
			_is: name || "unnamed",
			unmap: unmap,
			merge: merge
		}, extend),
		args = "",
		body = "",
		g = getters ? getters.length : 0,
		$observable = $.observable,
		getterNames = {};

	function GetNew(args) {
		constructor.apply(this, args);
	}

	function vm() {
		return new GetNew(arguments);
	}

	function iterate(data, action) {
		var getterType, defaultVal, prop, ob,
			j = 0;
		for (; j<g; j++) {
			prop = getters[j];
			getterType = undefined;
			if (prop + "" !== prop) {
				getterType = prop;
				prop = getterType.getter;
			}
			if ((ob = data[prop]) === undefined && getterType && (defaultVal = getterType.defaultVal) !== undefined) {
				ob = getDefaultVal(defaultVal, data);
			}
			action(ob, getterType && viewModels[getterType.type], prop);
		}
	}

	function map(data) {
		data = data + "" === data
			? JSON.parse(data) // Accept JSON string
			: data;            // or object/array
		var l, prop,
			j = 0,
			ob = data,
			arr = [];

		if ($isArray(data)) {
			data = data || [];
			l = data.length;
			for (; j<l; j++) {
				arr.push(this.map(data[j]));
			}
			arr._is = name;
			arr.unmap = unmap;
			arr.merge = merge;
			return arr;
		}

		if (data) {
			iterate(data, function(ob, viewModel) {
				if (viewModel) { // Iterate to build getters arg array (value, or mapped value)
					ob = viewModel.map(ob);
				}
				arr.push(ob);
			});

			ob = this.apply(this, arr); // Insantiate this View Model, passing getters args array to constructor
			for (prop in data) { // Copy over any other properties. that are not get/set properties
				if (prop !== $expando && !getterNames[prop]) {
					ob[prop] = data[prop];
				}
			}
		}
		return ob;
	}

	function merge(data) {
		data = data + "" === data
			? JSON.parse(data) // Accept JSON string
			: data;            // or object/array
		var j, l, m, prop, mod, found, assigned, ob, newModArr,
			k = 0,
			model = this;

		if ($isArray(model)) {
			assigned = {};
			newModArr = [];
			l = data.length;
			m = model.length;
			for (; k<l; k++) {
				ob = data[k];
				found = false;
				for (j=0; j<m && !found; j++) {
					if (assigned[j]) {
						continue;
					}
					mod = model[j];

					if (id) {
						assigned[j] = found = id + "" === id
						? (ob[id] && (getterNames[id] ? mod[id]() : mod[id]) === ob[id])
						: id(mod, ob);
					}
				}
				if (found) {
					mod.merge(ob);
					newModArr.push(mod);
				} else {
					newModArr.push(vm.map(ob));
				}
			}
			if ($observable) {
				$observable(model).refresh(newModArr, true);
			} else {
				model.splice.apply(model, [0, model.length].concat(newModArr));
			}
			return;
		}
		iterate(data, function(ob, viewModel, getter) {
			if (viewModel) {
				model[getter]().merge(ob); // Update typed property
			} else {
				model[getter](ob); // Update non-typed property
			}
		});
		for (prop in data) {
			if (prop !== $expando && !getterNames[prop]) {
				model[prop] = data[prop];
			}
		}
	}

	function unmap() {
		var ob, prop, getterType, arr, value,
			k = 0,
			model = this;

		if ($isArray(model)) {
			return unmapArray(model);
		}
		ob = {};
		for (; k<g; k++) {
			prop = getters[k];
			getterType = undefined;
			if (prop + "" !== prop) {
				getterType = prop;
				prop = getterType.getter;
			}
			value = model[prop]();
			ob[prop] = getterType && value && viewModels[getterType.type]
				? $isArray(value)
					? unmapArray(value)
					: value.unmap()
				: value;
		}
		for (prop in model) {
			if (prop !== "_is" && !getterNames[prop] && prop !== $expando  && (prop.charAt(0) !== "_" || !getterNames[prop.slice(1)]) && !$isFunction(model[prop])) {
				ob[prop] = model[prop];
			}
		}
		return ob;
	}

	GetNew.prototype = proto;

	for (i=0; i<g; i++) {
		(function(getter) {
			getter = getter.getter || getter;
			getterNames[getter] = i+1;
			var privField = "_" + getter;

			args += (args ? "," : "") + getter;
			body += "this." + privField + " = " + getter + ";\n";
			proto[getter] = proto[getter] || function(val) {
				if (!arguments.length) {
					return this[privField]; // If there is no argument, use as a getter
				}
				if ($observable) {
					$observable(this).setProperty(getter, val);
				} else {
					this[privField] = val;
				}
			};

			if ($observable) {
				proto[getter].set = proto[getter].set || function(val) {
					this[privField] = val; // Setter called by observable property change
				};
			}
		})(getters[i]);
	}

	constructor = new Function(args, body.slice(0, -1));
	constructor.prototype = proto;
	proto.constructor = constructor;

	vm.map = map;
	vm.getters = getters;
	vm.extend = extend;
	vm.id = id;
	return vm;
}

function tmplObject(markup, options) {
	// Template object constructor
	var htmlTag,
		wrapMap = $subSettingsAdvanced._wm || {}, // Only used in JsViews. Otherwise empty: {}
		tmpl = $extend(
			{
				tmpls: [],
				links: {}, // Compiled functions for link expressions
				bnds: [],
				_is: "template",
				render: renderContent
			},
			options
		);

	tmpl.markup = markup;
	if (!options.htmlTag) {
		// Set tmpl.tag to the top-level HTML tag used in the template, if any...
		htmlTag = rFirstElem.exec(markup);
		tmpl.htmlTag = htmlTag ? htmlTag[1].toLowerCase() : "";
	}
	htmlTag = wrapMap[tmpl.htmlTag];
	if (htmlTag && htmlTag !== wrapMap.div) {
		// When using JsViews, we trim templates which are inserted into HTML contexts where text nodes are not rendered (i.e. not 'Phrasing Content').
		// Currently not trimmed for <li> tag. (Not worth adding perf cost)
		tmpl.markup = $.trim(tmpl.markup);
	}

	return tmpl;
}

//==============
// registerStore
//==============

function registerStore(storeName, storeSettings) {

	function theStore(name, item, parentTmpl) {
		// The store is also the function used to add items to the store. e.g. $.templates, or $.views.tags

		// For store of name 'thing', Call as:
		//    $.views.things(items[, parentTmpl]),
		// or $.views.things(name, item[, parentTmpl])

		var compile, itemName, thisStore, cnt,
			onStore = $sub.onStore[storeName];

		if (name && typeof name === OBJECT && !name.nodeType && !name.markup && !name.getTgt && !(storeName === "viewModel" && name.getters || name.extend)) {
			// Call to $.views.things(items[, parentTmpl]),

			// Adding items to the store
			// If name is a hash, then item is parentTmpl. Iterate over hash and call store for key.
			for (itemName in name) {
				theStore(itemName, name[itemName], item);
			}
			return item || $views;
		}
		// Adding a single unnamed item to the store
		if (item === undefined) {
			item = name;
			name = undefined;
		}
		if (name && "" + name !== name) { // name must be a string
			parentTmpl = item;
			item = name;
			name = undefined;
		}
		thisStore = parentTmpl
			? storeName === "viewModel"
				? parentTmpl
				: (parentTmpl[storeNames] = parentTmpl[storeNames] || {})
			: theStore;
		compile = storeSettings.compile;

		if (item === null) {
			// If item is null, delete this entry
			if (name) {
				delete thisStore[name];
			}
		} else {
			if (compile) {
				item = compile.call(thisStore, name, item, parentTmpl, 0);
				item._is = storeName; // Only do this for compiled objects (tags, templates...)
			}
			// e.g. JsViews integration

			if (name) {
				thisStore[name] = item;
			}
		}
		if (onStore) {
			onStore(name, item, parentTmpl, compile);
		}
		return item;
	}

	var storeNames = storeName + "s";
	$views[storeNames] = theStore;
}

function addSetting(st) {
	$viewsSettings[st] = function(value) {
		return arguments.length
			? ($subSettings[st] = value, $viewsSettings)
			: $subSettings[st];
	};
}

//=========
// dataMap
//=========

function dataMap(mapDef) {
	function Map(source, options) {
		this.tgt = mapDef.getTgt(source, options);
	}

	if ($isFunction(mapDef)) {
		// Simple map declared as function
		mapDef = {
			getTgt: mapDef
		};
	}

	if (mapDef.baseMap) {
		mapDef = $extend($extend({}, mapDef.baseMap), mapDef);
	}

	mapDef.map = function(source, options) {
		return new Map(source, options);
	};
	return mapDef;
}

//==============
// renderContent
//==============

function renderContent(data, context, noIteration, parentView, key, onRender) {
	var i, l, tag, tmpl, tagCtx, isTopRenderCall, prevData, prevIndex,
		view = parentView,
		result = "";

	if (context === true) {
		noIteration = context; // passing boolean as second param - noIteration
		context = undefined;
	} else if (typeof context !== OBJECT) {
		context = undefined; // context must be a boolean (noIteration) or a plain object
	}

	if (tag = this.tag) {
		// This is a call from renderTag or tagCtx.render(...)
		tagCtx = this;
		view = view || tagCtx.view;
		tmpl = view.getTmpl(tag.template || tagCtx.tmpl);
		if (!arguments.length) {
			data = view;
		}
	} else {
		// This is a template.render(...) call
		tmpl = this;
	}

	if (tmpl) {
		if (!parentView && data && data._is === "view") {
			view = data; // When passing in a view to render or link (and not passing in a parent view) use the passed-in view as parentView
		}

		if (view) {
			if (data === view) {
				// Inherit the data from the parent view.
				// This may be the contents of an {{if}} block
				data = view.data;
			}
		}

		isTopRenderCall = !view;
		isRenderCall = isRenderCall || isTopRenderCall;
		if (!view) {
			(context = context || {}).root = data; // Provide ~root as shortcut to top-level data.
		}
		if (!isRenderCall || $subSettingsAdvanced.useViews || tmpl.useViews || view && view !== topView) {
			result = renderWithViews(tmpl, data, context, noIteration, view, key, onRender, tag);
		} else {
			if (view) { // In a block
				prevData = view.data;
				prevIndex = view.index;
				view.index = indexStr;
			} else {
				view = topView;
				view.data = data;
				view.ctx = context;
			}
			if ($isArray(data) && !noIteration) {
				// Create a view for the array, whose child views correspond to each data item. (Note: if key and parentView are passed in
				// along with parent view, treat as insert -e.g. from view.addViews - so parentView is already the view item for array)
				for (i = 0, l = data.length; i < l; i++) {
					view.index = i;
					view.data = data[i];
					result += tmpl.fn(data[i], view, $sub);
				}
			} else {
				view.data = data;
				result += tmpl.fn(data, view, $sub);
			}
			view.data = prevData;
			view.index = prevIndex;
		}
		if (isTopRenderCall) {
			isRenderCall = undefined;
		}
	}
	return result;
}

function renderWithViews(tmpl, data, context, noIteration, view, key, onRender, tag) {
	function setItemVar(item) {
		// When itemVar is specified, set modified ctx with user-named ~item
		newCtx = $extend({}, context);
		newCtx[itemVar] = item;
	}

	// Render template against data as a tree of subviews (nested rendered template instances), or as a string (top-level template).
	// If the data is the parent view, treat as noIteration, re-render with the same data context.
	// tmpl can be a string (e.g. rendered by a tag.render() method), or a compiled template.
	var i, l, newView, childView, itemResult, swapContent, contentTmpl, outerOnRender, tmplName, itemVar, newCtx, tagCtx,
		result = "";

	if (tag) {
		// This is a call from renderTag or tagCtx.render(...)
		tmplName = tag.tagName;
		tagCtx = tag.tagCtx;
		context = context ? extendCtx(context, tag.ctx) : tag.ctx;

		if (tmpl === view.content) { // {{xxx tmpl=#content}}
			contentTmpl = tmpl !== view.ctx._wrp // We are rendering the #content
				? view.ctx._wrp // #content was the tagCtx.props.tmpl wrapper of the block content - so within this view, #content will now be the view.ctx._wrp block content
				: undefined; // #content was the view.ctx._wrp block content - so within this view, there is no longer any #content to wrap.
		} else if (tmpl !== tagCtx.content) {
			if (tmpl === tag.template) { // Rendering {{tag}} tag.template, replacing block content.
				contentTmpl = tagCtx.tmpl; // Set #content to block content (or wrapped block content if tagCtx.props.tmpl is set)
				context._wrp = tagCtx.content; // Pass wrapped block content to nested views
			} else { // Rendering tagCtx.props.tmpl wrapper
				contentTmpl = tagCtx.content || view.content; // Set #content to wrapped block content
			}
		} else {
			contentTmpl = view.content; // Nested views inherit same wrapped #content property
		}

		if (tagCtx.props.link === false) {
			// link=false setting on block tag
			// We will override inherited value of link by the explicit setting link=false taken from props
			// The child views of an unlinked view are also unlinked. So setting child back to true will not have any effect.
			context = context || {};
			context.link = false;
		}

		if (itemVar = tagCtx.props.itemVar) {
			if (itemVar.charAt(0) !== "~") {
				syntaxError("Use itemVar='~myItem'");
			}
			itemVar = itemVar.slice(1);
		}
	}

	if (view) {
		onRender = onRender || view._.onRender;
		context = extendCtx(context, view.ctx);
	}

	if (key === true) {
		swapContent = true;
		key = 0;
	}

	// If link===false, do not call onRender, so no data-linking marker nodes
	if (onRender && (context && context.link === false || tag && tag._.noVws)) {
		onRender = undefined;
	}
	outerOnRender = onRender;
	if (onRender === true) {
		// Used by view.refresh(). Don't create a new wrapper view.
		outerOnRender = undefined;
		onRender = view._.onRender;
	}
	// Set additional context on views created here, (as modified context inherited from the parent, and to be inherited by child views)
	context = tmpl.helpers
		? extendCtx(tmpl.helpers, context)
		: context;

	newCtx = context;
	if ($isArray(data) && !noIteration) {
		// Create a view for the array, whose child views correspond to each data item. (Note: if key and view are passed in
		// along with parent view, treat as insert -e.g. from view.addViews - so view is already the view item for array)
		newView = swapContent
			? view
			: (key !== undefined && view)
				|| new View(context, "array", view, data, tmpl, key, onRender, contentTmpl);
		if (view && view._.useKey) {
			// Parent is not an 'array view'
			newView._.bnd = !tag || tag._.bnd && tag; // For array views that are data bound for collection change events, set the
			// view._.bnd property to true for top-level link() or data-link="{for}", or to the tag instance for a data-bound tag, e.g. {^{for ...}}
		}
		for (i = 0, l = data.length; i < l; i++) {
			// Create a view for each data item.
			if (itemVar) {
				setItemVar(data[i]); // use modified ctx with user-named ~item
			}
			childView = new View(newCtx, "item", newView, data[i], tmpl, (key || 0) + i, onRender, newView.content);
			childView._.it = itemVar;

			itemResult = tmpl.fn(data[i], childView, $sub);
			result += newView._.onRender ? newView._.onRender(itemResult, childView) : itemResult;
		}
	} else {
		// Create a view for singleton data object. The type of the view will be the tag name, e.g. "if" or "myTag" except for
		// "item", "array" and "data" views. A "data" view is from programmatic render(object) against a 'singleton'.
		if (itemVar) {
			setItemVar(data);
		}
		newView = swapContent ? view : new View(newCtx, tmplName || "data", view, data, tmpl, key, onRender, contentTmpl);
		newView._.it = itemVar;
		result += tmpl.fn(data, newView, $sub);
	}
	if (tag) {
		newView.tag = tag;
		newView.tagElse = tagCtx.index;
		tagCtx.contentView = newView;
	}
	return outerOnRender ? outerOnRender(result, newView) : result;
}

//===========================
// Build and compile template
//===========================

// Generate a reusable function that will serve to render a template against data
// (Compile AST then build template function)

function onRenderError(e, view, fallback) {
	var message = fallback !== undefined
		? $isFunction(fallback)
			? fallback.call(view.data, e, view)
			: fallback || ""
		: "{Error: " + (e.message||e) + "}";

	if ($subSettings.onError && (fallback = $subSettings.onError.call(view.data, e, fallback && message, view)) !== undefined) {
		message = fallback; // There is a settings.debugMode(handler) onError override. Call it, and use return value (if any) to replace message
	}

	return view && !view.linkCtx ? $converters.html(message) : message;
}

function error(message) {
	throw new $sub.Err(message);
}

function syntaxError(message) {
	error("Syntax error\n" + message);
}

function tmplFn(markup, tmpl, isLinkExpr, convertBack, hasElse) {
	// Compile markup to AST (abtract syntax tree) then build the template function code from the AST nodes
	// Used for compiling templates, and also by JsViews to build functions for data link expressions

	//==== nested functions ====
	function pushprecedingContent(shift) {
		shift -= loc;
		if (shift) {
			content.push(markup.substr(loc, shift).replace(rNewLine, "\\n"));
		}
	}

	function blockTagCheck(tagName, block) {
		if (tagName) {
			tagName += '}}';
			//			'{{include}} block has {{/for}} with no open {{for}}'
			syntaxError((
				block
					? '{{' + block + '}} block has {{/' + tagName + ' without {{' + tagName
					: 'Unmatched or missing {{/' + tagName) + ', in template:\n' + markup);
		}
	}

	function parseTag(all, bind, tagName, converter, colon, html, codeTag, params, slash, bind2, closeBlock, index) {
/*

     bind     tagName         cvt   cln html code    params            slash   bind2         closeBlk  comment
/(?:{(\^)?{(?:(\w+(?=[\/\s}]))|(\w+)?(:)|(>)|(\*))\s*((?:[^}]|}(?!}))*?)(\/)?|{(\^)?{(?:(?:\/(\w+))\s*|!--[\s\S]*?--))}}/g

(?:
  {(\^)?{            bind
  (?:
    (\w+             tagName
      (?=[\/\s}])
    )
    |
    (\w+)?(:)        converter colon
    |
    (>)              html
    |
    (\*)             codeTag
  )
  \s*
  (                  params
    (?:[^}]|}(?!}))*?
  )
  (\/)?              slash
  |
  {(\^)?{            bind2
  (?:
    (?:\/(\w+))\s*   closeBlock
    |
    !--[\s\S]*?--    comment
  )
)
}}/g

*/
		if (codeTag && bind || slash && !tagName || params && params.slice(-1) === ":" || bind2) {
			syntaxError(all);
		}

		// Build abstract syntax tree (AST): [tagName, converter, params, content, hash, bindings, contentMarkup]
		if (html) {
			colon = ":";
			converter = HTML;
		}
		slash = slash || isLinkExpr && !hasElse;

		var late,
			pathBindings = (bind || isLinkExpr) && [[]], // pathBindings is an array of arrays for arg bindings and a hash of arrays for prop bindings
			props = "",
			args = "",
			ctxProps = "",
			paramsArgs = "",
			paramsProps = "",
			paramsCtxProps = "",
			onError = "",
			useTrigger = "",
			// Block tag if not self-closing and not {{:}} or {{>}} (special case) and not a data-link expression
			block = !slash && !colon;

		//==== nested helper function ====
		tagName = tagName || (params = params || "#data", colon); // {{:}} is equivalent to {{:#data}}
		pushprecedingContent(index);
		loc = index + all.length; // location marker - parsed up to here
		if (codeTag) {
			if (allowCode) {
				content.push(["*", "\n" + params.replace(/^:/, "ret+= ").replace(rUnescapeQuotes, "$1") + ";\n"]);
			}
		} else if (tagName) {
			if (tagName === "else") {
				if (rTestElseIf.test(params)) {
					syntaxError('for "{{else if expr}}" use "{{else expr}}"');
				}
				pathBindings = current[8] && [[]];
				current[9] = markup.substring(current[9], index); // contentMarkup for block tag
				current = stack.pop();
				content = current[2];
				block = true;
			}
			if (params) {
				// remove newlines from the params string, to avoid compiled code errors for unterminated strings
				parseParams(params.replace(rNewLine, " "), pathBindings, tmpl)
					.replace(rBuildHash, function(all, onerror, isCtx, key, keyToken, keyValue, arg, param) {
						key = "'" + keyToken + "':";
						if (arg) {
							args += keyValue + ",";
							paramsArgs += "'" + param + "',";
						} else if (isCtx) {
							ctxProps += key + 'j._cp(' + keyValue + ',"' + param + '",view),';
							// Compiled code for evaluating tagCtx on a tag will have: ctx:{'foo':j._cp(compiledExpr, "expr", view)}
							paramsCtxProps += key + "'" + param + "',";
						} else if (onerror) {
							onError += keyValue;
						} else {
							if (keyToken === "trigger") {
								useTrigger += keyValue;
							}
							if (keyToken === "lateRender") {
								late = 1; // Render after first pass
							}
							props += key + keyValue + ",";
							paramsProps += key + "'" + param + "',";
							hasHandlers = hasHandlers || rHasHandlers.test(keyToken);
						}
						return "";
					}).slice(0, -1);
			}

			if (pathBindings && pathBindings[0]) {
				pathBindings.pop(); // Remove the binding that was prepared for next arg. (There is always an extra one ready).
			}

			newNode = [
					tagName,
					converter || !!convertBack || hasHandlers || "",
					block && [],
					parsedParam(paramsArgs || (tagName === ":" ? "'#data'," : ""), paramsProps, paramsCtxProps), // {{:}} equivalent to {{:#data}}
					parsedParam(args || (tagName === ":" ? "data," : ""), props, ctxProps),
					onError,
					useTrigger,
					late,
					pathBindings || 0
				];
			content.push(newNode);
			if (block) {
				stack.push(current);
				current = newNode;
				current[9] = loc; // Store current location of open tag, to be able to add contentMarkup when we reach closing tag
			}
		} else if (closeBlock) {
			blockTagCheck(closeBlock !== current[0] && current[0] !== "else" && closeBlock, current[0]);
			current[9] = markup.substring(current[9], index); // contentMarkup for block tag
			current = stack.pop();
		}
		blockTagCheck(!current && closeBlock);
		content = current[2];
	}
	//==== /end of nested functions ====

	var i, result, newNode, hasHandlers, bindings,
		allowCode = $subSettings.allowCode || tmpl && tmpl.allowCode
			|| $viewsSettings.allowCode === true, // include direct setting of settings.allowCode true for backward compat only
		astTop = [],
		loc = 0,
		stack = [],
		content = astTop,
		current = [,,astTop];

	if (allowCode && tmpl._is) {
		tmpl.allowCode = allowCode;
	}

//TODO	result = tmplFnsCache[markup]; // Only cache if template is not named and markup length < ...,
//and there are no bindings or subtemplates?? Consider standard optimization for data-link="a.b.c"
//		if (result) {
//			tmpl.fn = result;
//		} else {

//		result = markup;
	if (isLinkExpr) {
		if (convertBack !== undefined) {
			markup = markup.slice(0, -convertBack.length - 2) + delimCloseChar0;
		}
		markup = delimOpenChar0 + markup + delimCloseChar1;
	}

	blockTagCheck(stack[0] && stack[0][2].pop()[0]);
	// Build the AST (abstract syntax tree) under astTop
	markup.replace(rTag, parseTag);

	pushprecedingContent(markup.length);

	if (loc = astTop[astTop.length - 1]) {
		blockTagCheck("" + loc !== loc && (+loc[9] === loc[9]) && loc[0]);
	}
//			result = tmplFnsCache[markup] = buildCode(astTop, tmpl);
//		}

	if (isLinkExpr) {
		result = buildCode(astTop, markup, isLinkExpr);
		bindings = [];
		i = astTop.length;
		while (i--) {
			bindings.unshift(astTop[i][8]); // With data-link expressions, pathBindings array for tagCtx[i] is astTop[i][8]
		}
		setPaths(result, bindings);
	} else {
		result = buildCode(astTop, tmpl);
	}
	return result;
}

function setPaths(fn, pathsArr) {
	var key, paths,
		i = 0,
		l = pathsArr.length;
	fn.deps = [];
	fn.paths = []; // The array of path binding (array/dictionary)s for each tag/else block's args and props
	for (; i < l; i++) {
		fn.paths.push(paths = pathsArr[i]);
		for (key in paths) {
			if (key !== "_jsvto" && paths.hasOwnProperty(key) && paths[key].length && !paths[key].skp) {
				fn.deps = fn.deps.concat(paths[key]); // deps is the concatenation of the paths arrays for the different bindings
			}
		}
	}
}

function parsedParam(args, props, ctx) {
	return [args.slice(0, -1), props.slice(0, -1), ctx.slice(0, -1)];
}

function paramStructure(parts, type) {
	return '\n\t'
		+ (type
			? type + ':{'
			: '')
		+ 'args:[' + parts[0] + ']'
		+ (parts[1] || !type
			? ',\n\tprops:{' + parts[1] + '}'
			: "")
		+ (parts[2] ? ',\n\tctx:{' + parts[2] + '}' : "");
}

function parseParams(params, pathBindings, tmpl) {

	function parseTokens(all, lftPrn0, lftPrn, bound, path, operator, err, eq, path2, prn, comma, lftPrn2, apos, quot, rtPrn, rtPrnDot, prn2, space, index, full) {
	// /(\()(?=\s*\()|(?:([([])\s*)?(?:(\^?)(!*?[#~]?[\w$.^]+)?\s*((\+\+|--)|\+|-|&&|\|\||===|!==|==|!=|<=|>=|[<>%*:?\/]|(=))\s*|(!*?[#~]?[\w$.^]+)([([])?)|(,\s*)|(\(?)\\?(?:(')|("))|(?:\s*(([)\]])(?=\s*[.^]|\s*$|[^([])|[)\]])([([]?))|(\s+)/g,
	//   lftPrn0        lftPrn        bound            path    operator err                                                eq             path2       prn    comma   lftPrn2   apos quot      rtPrn rtPrnDot                        prn2  space
		// (left paren? followed by (path? followed by operator) or (path followed by paren?)) or comma or apos or quot or right paren or space
		function parsePath(allPath, not, object, helper, view, viewProperty, pathTokens, leafToken) {
			//rPath = /^(!*?)(?:null|true|false|\d[\d.]*|([\w$]+|\.|~([\w$]+)|#(view|([\w$]+))?)([\w$.^]*?)(?:[.[^]([\w$]+)\]?)?)$/g,
			//          not                               object     helper    view  viewProperty pathTokens      leafToken
			var subPath = object === ".";
			if (object) {
				path = path.slice(not.length);
				if (/^\.?constructor$/.test(leafToken||path)) {
					syntaxError(allPath);
				}
				if (!subPath) {
					allPath = (helper
							? 'view.ctxPrm("' + helper + '")'
							: view
								? "view"
								: "data")
						+ (leafToken
							? (viewProperty
								? "." + viewProperty
								: helper
									? ""
									: (view ? "" : "." + object)
								) + (pathTokens || "")
							: (leafToken = helper ? "" : view ? viewProperty || "" : object, ""));

					allPath = allPath + (leafToken ? "." + leafToken : "");

					allPath = not + (allPath.slice(0, 9) === "view.data"
						? allPath.slice(5) // convert #view.data... to data...
						: allPath);
				}
				if (bindings) {
					binds = named === "linkTo" ? (bindto = pathBindings._jsvto = pathBindings._jsvto || []) : bndCtx.bd;
					if (theOb = subPath && binds[binds.length-1]) {
						if (theOb._cpfn) { // Computed property exprOb
							while (theOb.sb) {
								theOb = theOb.sb;
							}
							if (theOb.bnd) {
								path = "^" + path.slice(1);
							}
							theOb.sb = path;
							theOb.bnd = theOb.bnd || path.charAt(0) === "^";
						}
					} else {
						binds.push(path);
					}
					pathStart[parenDepth] = index + (subPath ? 1 : 0);
				}
			}
			return allPath;
		}

		//bound = bindings && bound;
		if (bound && !eq) {
			path = bound + path; // e.g. some.fn(...)^some.path - so here path is "^some.path"
		}
		operator = operator || "";
		lftPrn = lftPrn || lftPrn0 || lftPrn2;
		path = path || path2;
		// Could do this - but not worth perf cost?? :-
		// if (!path.lastIndexOf("#data.", 0)) { path = path.slice(6); } // If path starts with "#data.", remove that.
		prn = prn || prn2 || "";

		var expr, exprFn, binds, theOb, newOb,
			rtSq = ")";

		if (prn === "[") {
			prn ="[j._sq(";
			rtSq = ")]";
		}

		if (err && !aposed && !quoted) {
			syntaxError(params);
		} else {
			if (bindings && rtPrnDot && !aposed && !quoted) {
				// This is a binding to a path in which an object is returned by a helper/data function/expression, e.g. foo()^x.y or (a?b:c)^x.y
				// We create a compiled function to get the object instance (which will be called when the dependent data of the subexpression changes, to return the new object, and trigger re-binding of the subsequent path)
				if (!named || boundName || bindto) {
					expr = pathStart[parenDepth - 1];
					if (full.length - 1 > index - (expr || 0)) { // We need to compile a subexpression
						expr = full.slice(expr, index + all.length);
						if (exprFn !== true) { // If not reentrant call during compilation
							binds = bindto || bndStack[parenDepth-1].bd;
							// Insert exprOb object, to be used during binding to return the computed object
							theOb = binds[binds.length-1];
							if (theOb && theOb.prm) {
								while (theOb.sb && theOb.sb.prm) {
									theOb = theOb.sb;
								}
								newOb = theOb.sb = {path: theOb.sb, bnd: theOb.bnd};
							} else {
								binds.push(newOb = {path: binds.pop()}); // Insert exprOb object, to be used during binding to return the computed object
							}											 // (e.g. "some.object()" in "some.object().a.b" - to be used as context for binding the following tokens "a.b")
						}
						rtPrnDot = delimOpenChar1 + ":" + expr // The parameter or function subexpression
							+ " onerror=''" // set onerror='' in order to wrap generated code with a try catch - returning '' as object instance if there is an error/missing parent
							+ delimCloseChar0;
						exprFn = tmplLinks[rtPrnDot];
						if (!exprFn) {
							tmplLinks[rtPrnDot] = true; // Flag that this exprFn (for rtPrnDot) is being compiled
							tmplLinks[rtPrnDot] = exprFn = tmplFn(rtPrnDot, tmpl, true); // Compile the expression (or use cached copy already in tmpl.links)
						}
						if (exprFn !== true && newOb) {
							// If not reentrant call during compilation
							newOb._cpfn = exprFn;
							newOb.prm = bndCtx.bd;
							newOb.bnd = newOb.bnd || newOb.path && newOb.path.indexOf("^") >= 0;
						}
					}
				}
			}
			return (aposed
				// within single-quoted string
				? (aposed = !apos, (aposed ? all : lftPrn2 + '"'))
				: quoted
				// within double-quoted string
					? (quoted = !quot, (quoted ? all : lftPrn2 + '"'))
					:
				(
					(lftPrn
						? (pathStart[parenDepth] = index++, bndCtx = bndStack[++parenDepth] = {bd: []}, lftPrn)
						: "")
					+ (space
						? (parenDepth
							? ""
				// New arg or prop - so insert backspace \b (\x08) as separator for named params, used subsequently by rBuildHash, and prepare new bindings array
							: (paramIndex = full.slice(paramIndex, index), named
								? (named = boundName = bindto = false, "\b")
								: "\b,") + paramIndex + (paramIndex = index + all.length, bindings && pathBindings.push(bndCtx.bd = []), "\b")
						)
						: eq
				// named param. Remove bindings for arg and create instead bindings array for prop
							? (parenDepth && syntaxError(params), bindings && pathBindings.pop(), named = path, boundName = bound, paramIndex = index + all.length,
									bindings && ((bindings = bndCtx.bd = pathBindings[named] = []), bindings.skp = !bound), path + ':')
							: path
				// path
								? (path.split("^").join(".").replace(rPath, parsePath)
									+ (prn
				// some.fncall(
										? (bndCtx = bndStack[++parenDepth] = {bd: []}, fnCall[parenDepth] = rtSq, prn)
										: operator)
								)
								: operator
				// operator
									? operator
									: rtPrn
				// function
										? ((rtPrn = fnCall[parenDepth] || rtPrn, fnCall[parenDepth] = false, bndCtx = bndStack[--parenDepth], rtPrn)
											+ (prn // rtPrn and prn, e.g )( in (a)() or a()(), or )[ in a()[]
												? (bndCtx = bndStack[++parenDepth], fnCall[parenDepth] = rtSq, prn)
												: "")
										)
										: comma
											? (fnCall[parenDepth] || syntaxError(params), ",") // We don't allow top-level literal arrays or objects
											: lftPrn0
												? ""
												: (aposed = apos, quoted = quot, '"')
				))
			);
		}
	}

	var named, bindto, boundName,
		quoted, // boolean for string content in double quotes
		aposed, // or in single quotes
		bindings = pathBindings && pathBindings[0], // bindings array for the first arg
		bndCtx = {bd: bindings},
		bndStack = {0: bndCtx},
		paramIndex = 0, // list,
		tmplLinks = (tmpl ? tmpl.links : bindings && (bindings.links = bindings.links || {})) || topView.tmpl.links,
		// The following are used for tracking path parsing including nested paths, such as "a.b(c^d + (e))^f", and chained computed paths such as
		// "a.b().c^d().e.f().g" - which has four chained paths, "a.b()", "^c.d()", ".e.f()" and ".g"
		parenDepth = 0,
		fnCall = {}, // We are in a function call
		pathStart = {}, // tracks the start of the current path such as c^d() in the above example
		result = (params + (tmpl ? " " : "")).replace(rParams, parseTokens);

	return !parenDepth && result || syntaxError(params); // Syntax error if unbalanced parens in params expression
}

function buildCode(ast, tmpl, isLinkExpr) {
	// Build the template function code from the AST nodes, and set as property on the passed-in template object
	// Used for compiling templates, and also by JsViews to build functions for data link expressions
	var i, node, tagName, converter, tagCtx, hasTag, hasEncoder, getsVal, hasCnvt, useCnvt, tmplBindings, pathBindings, params, boundOnErrStart,
		boundOnErrEnd, tagRender, nestedTmpls, tmplName, nestedTmpl, tagAndElses, content, markup, nextIsElse, oldCode, isElse, isGetVal, tagCtxFn,
		onError, tagStart, trigger, lateRender,
		tmplBindingKey = 0,
		useViews = $subSettingsAdvanced.useViews || tmpl.useViews || tmpl.tags || tmpl.templates || tmpl.helpers || tmpl.converters,
		code = "",
		tmplOptions = {},
		l = ast.length;

	if ("" + tmpl === tmpl) {
		tmplName = isLinkExpr ? 'data-link="' + tmpl.replace(rNewLine, " ").slice(1, -1) + '"' : tmpl;
		tmpl = 0;
	} else {
		tmplName = tmpl.tmplName || "unnamed";
		if (tmpl.allowCode) {
			tmplOptions.allowCode = true;
		}
		if (tmpl.debug) {
			tmplOptions.debug = true;
		}
		tmplBindings = tmpl.bnds;
		nestedTmpls = tmpl.tmpls;
	}
	for (i = 0; i < l; i++) {
		// AST nodes: [0: tagName, 1: converter, 2: content, 3: params, 4: code, 5: onError, 6: trigger, 7:pathBindings, 8: contentMarkup]
		node = ast[i];

		// Add newline for each callout to t() c() etc. and each markup string
		if ("" + node === node) {
			// a markup string to be inserted
			code += '\n+"' + node + '"';
		} else {
			// a compiled tag expression to be inserted
			tagName = node[0];
			if (tagName === "*") {
				// Code tag: {{* }}
				code += ";\n" + node[1] + "\nret=ret";
			} else {
				converter = node[1];
				content = !isLinkExpr && node[2];
				tagCtx = paramStructure(node[3], 'params') + '},' + paramStructure(params = node[4]);
				onError = node[5];
				trigger = node[6];
				lateRender = node[7];
				markup = node[9] && node[9].replace(rUnescapeQuotes, "$1");
				if (isElse = tagName === "else") {
					if (pathBindings) {
						pathBindings.push(node[8]);
					}
				} else if (tmplBindings && (pathBindings = node[8])) { // Array of paths, or false if not data-bound
					pathBindings = [pathBindings];
					tmplBindingKey = tmplBindings.push(1); // Add placeholder in tmplBindings for compiled function
				}
				useViews = useViews || params[1] || params[2] || pathBindings || /view.(?!index)/.test(params[0]);
				// useViews is for perf optimization. For render() we only use views if necessary - for the more advanced scenarios.
				// We use views if there are props, contextual properties or args with #... (other than #index) - but you can force
				// using the full view infrastructure, (and pay a perf price) by opting in: Set useViews: true on the template, manually...
				if (isGetVal = tagName === ":") {
					if (converter) {
						tagName = converter === HTML ? ">" : converter + tagName;
					}
				} else {
					if (content) { // TODO optimize - if content.length === 0 or if there is a tmpl="..." specified - set content to null / don't run this compilation code - since content won't get used!!
						// Create template object for nested template
						nestedTmpl = tmplObject(markup, tmplOptions);
						nestedTmpl.tmplName = tmplName + "/" + tagName;
						// Compile to AST and then to compiled function
						nestedTmpl.useViews = nestedTmpl.useViews || useViews;
						buildCode(content, nestedTmpl);
						useViews = nestedTmpl.useViews;
						nestedTmpls.push(nestedTmpl);
					}

					if (!isElse) {
						// This is not an else tag.
						tagAndElses = tagName;
						useViews = useViews || tagName && (!$tags[tagName] || !$tags[tagName].flow);
						// Switch to a new code string for this bound tag (and its elses, if it has any) - for returning the tagCtxs array
						oldCode = code;
						code = "";
					}
					nextIsElse = ast[i + 1];
					nextIsElse = nextIsElse && nextIsElse[0] === "else";
				}
				tagStart = onError ? ";\ntry{\nret+=" : "\n+";
				boundOnErrStart = "";
				boundOnErrEnd = "";

				if (isGetVal && (pathBindings || trigger || converter && converter !== HTML || lateRender)) {
					// For convertVal we need a compiled function to return the new tagCtx(s)
					tagCtxFn = new Function("data,view,j,u", "// " + tmplName + " " + (++tmplBindingKey) + " " + tagName
										+ "\nreturn {" + tagCtx + "};");
					tagCtxFn._er = onError;
					tagCtxFn._tag = tagName;
					tagCtxFn._bd = !!pathBindings; // data-linked tag {^{.../}}
					tagCtxFn._lr = lateRender;

					if (isLinkExpr) {
						return tagCtxFn;
					}

					setPaths(tagCtxFn, pathBindings);
					tagRender = 'c("' + converter + '",view,';
					useCnvt = true;
					boundOnErrStart = tagRender + tmplBindingKey + ",";
					boundOnErrEnd = ")";
				}
				code += (isGetVal
					? (isLinkExpr ? (onError ? "try{\n" : "") + "return " : tagStart) + (useCnvt // Call _cnvt if there is a converter: {{cnvt: ... }} or {^{cnvt: ... }}
						? (useCnvt = undefined, useViews = hasCnvt = true, tagRender + (tagCtxFn
							? ((tmplBindings[tmplBindingKey - 1] = tagCtxFn), tmplBindingKey) // Store the compiled tagCtxFn in tmpl.bnds, and pass the key to convertVal()
							: "{" + tagCtx + "}") + ")")
						: tagName === ">"
							? (hasEncoder = true, "h(" + params[0] + ")")
							: (getsVal = true, "((v=" + params[0] + ')!=null?v:' + (isLinkExpr ? 'null)' : '"")'))
							// Non strict equality so data-link="title{:expr}" with expr=null/undefined removes title attribute
					)
					: (hasTag = true, "\n{view:view,tmpl:" // Add this tagCtx to the compiled code for the tagCtxs to be passed to renderTag()
						+ (content ? nestedTmpls.length : "0") + "," // For block tags, pass in the key (nestedTmpls.length) to the nested content template
						+ tagCtx + "},"));

				if (tagAndElses && !nextIsElse) {
					// This is a data-link expression or an inline tag without any elses, or the last {{else}} of an inline tag
					// We complete the code for returning the tagCtxs array
					code = "[" + code.slice(0, -1) + "]";
					tagRender = 't("' + tagAndElses + '",view,this,';
					if (isLinkExpr || pathBindings) {
						// This is a bound tag (data-link expression or inline bound tag {^{tag ...}}) so we store a compiled tagCtxs function in tmp.bnds
						code = new Function("data,view,j,u", " // " + tmplName + " " + tmplBindingKey + " " + tagAndElses + "\nreturn " + code + ";");
						code._er = onError;
						code._tag = tagAndElses;
						if (pathBindings) {
							setPaths(tmplBindings[tmplBindingKey - 1] = code, pathBindings);
						}
						code._lr = lateRender;
						if (isLinkExpr) {
							return code; // For a data-link expression we return the compiled tagCtxs function
						}
						boundOnErrStart = tagRender + tmplBindingKey + ",undefined,";
						boundOnErrEnd = ")";
					}

					// This is the last {{else}} for an inline tag.
					// For a bound tag, pass the tagCtxs fn lookup key to renderTag.
					// For an unbound tag, include the code directly for evaluating tagCtxs array
					code = oldCode + tagStart + tagRender + (code.deps && tmplBindingKey || code) + ")";
					pathBindings = 0;
					tagAndElses = 0;
				}
				if (onError) {
					useViews = true;
					code += ';\n}catch(e){ret' + (isLinkExpr ? "urn " : "+=") + boundOnErrStart + 'j._err(e,view,' + onError + ')' + boundOnErrEnd + ';}' + (isLinkExpr ? "" : 'ret=ret');
				}
			}
		}
	}
	// Include only the var references that are needed in the code
	code = "// " + tmplName

		+ "\nvar v"
		+ (hasTag ? ",t=j._tag" : "")                // has tag
		+ (hasCnvt ? ",c=j._cnvt" : "")              // converter
		+ (hasEncoder ? ",h=j._html" : "")           // html converter
		+ (isLinkExpr ? ";\n" : ',ret=""\n')
		+ (tmplOptions.debug ? "debugger;" : "")
		+ code
		+ (isLinkExpr ? "\n" : ";\nreturn ret;");

	if ($subSettings.debugMode !== false) {
		code = "try {\n" + code + "\n}catch(e){\nreturn j._err(e, view);\n}";
	}

	try {
		code = new Function("data,view,j,u", code);
	} catch (e) {
		syntaxError("Compiled template code:\n\n" + code + '\n: "' + (e.message||e) + '"');
	}
	if (tmpl) {
		tmpl.fn = code;
		tmpl.useViews = !!useViews;
	}
	return code;
}

//==========
// Utilities
//==========

// Merge objects, in particular contexts which inherit from parent contexts
function extendCtx(context, parentContext) {
	// Return copy of parentContext, unless context is defined and is different, in which case return a new merged context
	// If neither context nor parentContext are defined, return undefined
	return context && context !== parentContext
		? (parentContext
			? $extend($extend({}, parentContext), context)
			: context)
		: parentContext && $extend({}, parentContext);
}

// Get character entity for HTML and Attribute encoding
function getCharEntity(ch) {
	return charEntities[ch] || (charEntities[ch] = "&#" + ch.charCodeAt(0) + ";");
}

function getTargetProps(source) {
	// this pointer is theMap - which has tagCtx.props too
	// arguments: tagCtx.args.
	var key, prop,
		props = [];

	if (typeof source === OBJECT) {
		for (key in source) {
			prop = source[key];
			if (key !== $expando && source.hasOwnProperty(key) && !$isFunction(prop)) {
				props.push({key: key, prop: prop});
			}
		}
	}
	return props;
}

function $fnRender(data, context, noIteration) {
	var tmplElem = this.jquery && (this[0] || error('Unknown template')), // Targeted element not found for jQuery template selector such as "#myTmpl"
		tmpl = tmplElem.getAttribute(tmplAttr);

	return renderContent.call(tmpl && $.data(tmplElem)[jsvTmpl] || $templates(tmplElem),
		data, context, noIteration);
}

//========================== Register converters ==========================

function htmlEncode(text) {
	// HTML encode: Replace < > & ' and " by corresponding entities.
	return text != undefined ? rIsHtml.test(text) && ("" + text).replace(rHtmlEncode, getCharEntity) || text : "";
}

//========================== Initialize ==========================

$sub = $views.sub;
$viewsSettings = $views.settings;

if (!(jsr || $ && $.render)) {
	// JsRender not already loaded, or loaded without jQuery, and we are now moving from jsrender namespace to jQuery namepace
	for (jsvStoreName in jsvStores) {
		registerStore(jsvStoreName, jsvStores[jsvStoreName]);
	}

	$converters = $views.converters;
	$helpers = $views.helpers;
	$tags = $views.tags;

	$sub._tg.prototype = {
		baseApply: baseApply,
		cvtArgs: convertArgs,
		bndArgs: convertBoundArgs,
		ctxPrm: contextParameter
	};

	topView = $sub.topView = new View();

	//BROWSER-SPECIFIC CODE
	if ($) {

		////////////////////////////////////////////////////////////////////////////////////////////////
		// jQuery (= $) is loaded

		$.fn.render = $fnRender;
		$expando = $.expando;
		if ($.observable) {
			$extend($sub, $.views.sub); // jquery.observable.js was loaded before jsrender.js
			$views.map = $.views.map;
		}

	} else {
		////////////////////////////////////////////////////////////////////////////////////////////////
		// jQuery is not loaded.

		$ = {};

		if (setGlobals) {
			global.jsrender = $; // We are loading jsrender.js from a script element, not AMD or CommonJS, so set global
		}

		// Error warning if jsrender.js is used as template engine on Node.js (e.g. Express or Hapi...)
		// Use jsrender-node.js instead...
		$.renderFile = $.__express = $.compile = function() { throw "Node.js: use npm jsrender, or jsrender-node.js"; };

		//END BROWSER-SPECIFIC CODE
		$.isFunction = function(ob) {
			return typeof ob === "function";
		};

		$.isArray = Array.isArray || function(obj) {
			return ({}.toString).call(obj) === "[object Array]";
		};

		$sub._jq = function(jq) { // private method to move from JsRender APIs from jsrender namespace to jQuery namespace
			if (jq !== $) {
				$extend(jq, $); // map over from jsrender namespace to jQuery namespace
				$ = jq;
				$.fn.render = $fnRender;
				delete $.jsrender;
				$expando = $.expando;
			}
		};

		$.jsrender = versionNumber;
	}
	$subSettings = $sub.settings;
	$subSettings.allowCode = false;
	$isFunction = $.isFunction;
	$.render = $render;
	$.views = $views;
	$.templates = $templates = $views.templates;

	for (setting in $subSettings) {
		addSetting(setting);
	}

	($viewsSettings.debugMode = function(debugMode) {
		return debugMode === undefined
			? $subSettings.debugMode
			: (
				$subSettings.debugMode = debugMode,
				$subSettings.onError = debugMode + "" === debugMode
					? new Function("", "return '" + debugMode + "';")
					: $isFunction(debugMode)
						? debugMode
						: undefined,
				$viewsSettings);
	})(false); // jshint ignore:line

	$subSettingsAdvanced = $subSettings.advanced = {
		useViews: false,
		_jsv: false // For global access to JsViews store
	};

	//========================== Register tags ==========================

	$tags({
		"if": {
			render: function(val) {
				// This function is called once for {{if}} and once for each {{else}}.
				// We will use the tag.rendering object for carrying rendering state across the calls.
				// If not done (a previous block has not been rendered), look at expression for this block and render the block if expression is truthy
				// Otherwise return ""
				var self = this,
					tagCtx = self.tagCtx,
					ret = (self.rendering.done || !val && (arguments.length || !tagCtx.index))
						? ""
						: (self.rendering.done = true, self.selected = tagCtx.index,
							// Test is satisfied, so render content on current context. We call tagCtx.render() rather than return undefined
							// (which would also render the tmpl/content on the current context but would iterate if it is an array)
							tagCtx.render(tagCtx.view, true)); // no arg, so renders against parentView.data
				return ret;
			},
			flow: true
		},
		"for": {
			render: function(val) {
				// This function is called once for {{for}} and once for each {{else}}.
				// We will use the tag.rendering object for carrying rendering state across the calls.
				var finalElse = !arguments.length,
					value,
					self = this,
					tagCtx = self.tagCtx,
					result = "",
					done = 0;

				if (!self.rendering.done) {
					value = finalElse ? tagCtx.view.data : val; // For the final else, defaults to current data without iteration.
					if (value !== undefined) {
						result += tagCtx.render(value, finalElse); // Iterates except on final else, if data is an array. (Use {{include}} to compose templates without array iteration)
						done += $isArray(value) ? value.length : 1;
					}
					if (self.rendering.done = done) {
						self.selected = tagCtx.index;
					}
					// If nothing was rendered we will look at the next {{else}}. Otherwise, we are done.
				}
				return result;
			},
			flow: true
		},
		props: {
			baseTag: "for",
			dataMap: dataMap(getTargetProps),
			flow: true
		},
		include: {
			flow: true
		},
		"*": {
			// {{* code... }} - Ignored if template.allowCode and $.views.settings.allowCode are false. Otherwise include code in compiled template
			render: retVal,
			flow: true
		},
		":*": {
			// {{:* returnedExpression }} - Ignored if template.allowCode and $.views.settings.allowCode are false. Otherwise include code in compiled template
			render: retVal,
			flow: true
		},
		dbg: $helpers.dbg = $converters.dbg = dbgBreak // Register {{dbg/}}, {{dbg:...}} and ~dbg() to throw and catch, as breakpoints for debugging.
	});

	$converters({
		html: htmlEncode,
		attr: htmlEncode, // Includes > encoding since rConvertMarkers in JsViews does not skip > characters in attribute strings
		url: function(text) {
			// URL encoding helper.
			return text != undefined ? encodeURI("" + text) : text === null ? text : ""; // null returns null, e.g. to remove attribute. undefined returns ""
		}
	});
}
//========================== Define default delimiters ==========================
$subSettings = $sub.settings;
$isArray = ($||jsr).isArray;
$viewsSettings.delimiters("{{", "}}", "^");


if (jsrToJq) { // Moving from jsrender namespace to jQuery namepace - copy over the stored items (templates, converters, helpers...)
	jsr.views.sub._jq($);
}
return $ || jsr;
}, window));

},{}],2:[function(require,module,exports){
(function (global){
/*global QUnit, test, equal, ok*/
(function(undefined) {
"use strict";

browserify.done.twelve = true;

QUnit.module("Browserify - client code");

var isIE8 = window.attachEvent && !window.addEventListener;

if (!isIE8) {

test("No jQuery global: require('jsrender')() nested template", function() {
	// ............................... Hide QUnit global jQuery and any previous global jsrender.................................
	var jQuery = global.jQuery, jsr = global.jsrender;
	global.jQuery = global.jsrender = undefined;

	// =============================== Arrange ===============================
	var data = {name: "Jo"};

	// ................................ Act ..................................
	var jsrender = require('jsrender')(); // Not passing in jQuery, so returns the jsrender namespace

	// Use require to get server template, thanks to Browserify bundle that used jsrender/tmplify transform
	var tmpl = require('../templates/outer.html')(jsrender); // Provide jsrender

	var result = tmpl(data);

	result += " " + (jsrender !== jQuery);

	// ............................... Assert .................................
	equal(result, "Name: Jo (outer.html) Name: Jo (inner.html) true", "result: No jQuery global: require('jsrender')(), nested templates");

	// ............................... Reset .................................
	global.jQuery = jQuery; // Replace QUnit global jQuery
	global.jsrender = jsr; // Replace any previous global jsrender
});
}
})();

}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})

},{"../templates/outer.html":4,"jsrender":1}],3:[function(require,module,exports){
(function (global){
var tmplRefs = [],
  mkup = 'Name: {{:name}} (inner.html)',
  $ = global.jsrender || global.jQuery;

module.exports = $ ? $.templates("./test/templates/inner.html", mkup) :
  function($) {
    if (!$ || !$.views) {throw "Requires jsrender/jQuery";}
    while (tmplRefs.length) {
      tmplRefs.pop()($); // compile nested template
    }

    return $.templates("./test/templates/inner.html", mkup)
  };
}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})

},{}],4:[function(require,module,exports){
(function (global){
var tmplRefs = [],
  mkup = 'Name: {{:name}} (outer.html) {{include tmpl=\"./test/templates/inner.html\"/}}',
  $ = global.jsrender || global.jQuery;

tmplRefs.push(require("./inner.html"));
module.exports = $ ? $.templates("./test/templates/outer.html", mkup) :
  function($) {
    if (!$ || !$.views) {throw "Requires jsrender/jQuery";}
    while (tmplRefs.length) {
      tmplRefs.pop()($); // compile nested template
    }

    return $.templates("./test/templates/outer.html", mkup)
  };
}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})

},{"./inner.html":3}]},{},[2])
//# sourceMappingURL=data:application/json;charset:utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJub2RlX21vZHVsZXMvanNyZW5kZXIvanNyZW5kZXIuanMiLCJ0ZXN0L2Jyb3dzZXJpZnkvMTItbmVzdGVkLXVuaXQtdGVzdHMuanMiLCJ0ZXN0L3RlbXBsYXRlcy9pbm5lci5odG1sIiwidGVzdC90ZW1wbGF0ZXMvb3V0ZXIuaHRtbCJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTtBQ0FBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7OztBQy82RUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7Ozs7O0FDdkNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOzs7OztBQ1pBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EiLCJmaWxlIjoiZ2VuZXJhdGVkLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXNDb250ZW50IjpbIihmdW5jdGlvbiBlKHQsbixyKXtmdW5jdGlvbiBzKG8sdSl7aWYoIW5bb10pe2lmKCF0W29dKXt2YXIgYT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2lmKCF1JiZhKXJldHVybiBhKG8sITApO2lmKGkpcmV0dXJuIGkobywhMCk7dmFyIGY9bmV3IEVycm9yKFwiQ2Fubm90IGZpbmQgbW9kdWxlICdcIitvK1wiJ1wiKTt0aHJvdyBmLmNvZGU9XCJNT0RVTEVfTk9UX0ZPVU5EXCIsZn12YXIgbD1uW29dPXtleHBvcnRzOnt9fTt0W29dWzBdLmNhbGwobC5leHBvcnRzLGZ1bmN0aW9uKGUpe3ZhciBuPXRbb11bMV1bZV07cmV0dXJuIHMobj9uOmUpfSxsLGwuZXhwb3J0cyxlLHQsbixyKX1yZXR1cm4gbltvXS5leHBvcnRzfXZhciBpPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7Zm9yKHZhciBvPTA7bzxyLmxlbmd0aDtvKyspcyhyW29dKTtyZXR1cm4gc30pIiwiLyohIEpzUmVuZGVyIHYwLjkuODcgKEJldGEpOiBodHRwOi8vanN2aWV3cy5jb20vI2pzcmVuZGVyICovXG4vKiEgKipWRVJTSU9OIEZPUiBXRUIqKiAoRm9yIE5PREUuSlMgc2VlIGh0dHA6Ly9qc3ZpZXdzLmNvbS9kb3dubG9hZC9qc3JlbmRlci1ub2RlLmpzKSAqL1xuLypcbiAqIEJlc3Qtb2YtYnJlZWQgdGVtcGxhdGluZyBpbiBicm93c2VyIG9yIG9uIE5vZGUuanMuXG4gKiBEb2VzIG5vdCByZXF1aXJlIGpRdWVyeSwgb3IgSFRNTCBET01cbiAqIEludGVncmF0ZXMgd2l0aCBKc1ZpZXdzIChodHRwOi8vanN2aWV3cy5jb20vI2pzdmlld3MpXG4gKlxuICogQ29weXJpZ2h0IDIwMTcsIEJvcmlzIE1vb3JlXG4gKiBSZWxlYXNlZCB1bmRlciB0aGUgTUlUIExpY2Vuc2UuXG4gKi9cblxuLy9qc2hpbnQgLVcwMTgsIC1XMDQxLCAtVzEyMFxuXG4oZnVuY3Rpb24oZmFjdG9yeSwgZ2xvYmFsKSB7XG5cdC8vIGdsb2JhbCB2YXIgaXMgdGhlIHRoaXMgb2JqZWN0LCB3aGljaCBpcyB3aW5kb3cgd2hlbiBydW5uaW5nIGluIHRoZSB1c3VhbCBicm93c2VyIGVudmlyb25tZW50XG5cdHZhciAkID0gZ2xvYmFsLmpRdWVyeTtcblxuXHRpZiAodHlwZW9mIGV4cG9ydHMgPT09IFwib2JqZWN0XCIpIHsgLy8gQ29tbW9uSlMgZS5nLiBCcm93c2VyaWZ5XG5cdFx0bW9kdWxlLmV4cG9ydHMgPSAkXG5cdFx0XHQ/IGZhY3RvcnkoZ2xvYmFsLCAkKVxuXHRcdFx0OiBmdW5jdGlvbigkKSB7IC8vIElmIG5vIGdsb2JhbCBqUXVlcnksIHRha2Ugb3B0aW9uYWwgalF1ZXJ5IHBhc3NlZCBhcyBwYXJhbWV0ZXI6IHJlcXVpcmUoJ2pzcmVuZGVyJykoalF1ZXJ5KVxuXHRcdFx0XHRpZiAoJCAmJiAhJC5mbikge1xuXHRcdFx0XHRcdHRocm93IFwiUHJvdmlkZSBqUXVlcnkgb3IgbnVsbFwiO1xuXHRcdFx0XHR9XG5cdFx0XHRcdHJldHVybiBmYWN0b3J5KGdsb2JhbCwgJCk7XG5cdFx0XHR9O1xuXHR9IGVsc2UgaWYgKHR5cGVvZiBkZWZpbmUgPT09IFwiZnVuY3Rpb25cIiAmJiBkZWZpbmUuYW1kKSB7IC8vIEFNRCBzY3JpcHQgbG9hZGVyLCBlLmcuIFJlcXVpcmVKU1xuXHRcdGRlZmluZShmdW5jdGlvbigpIHtcblx0XHRcdHJldHVybiBmYWN0b3J5KGdsb2JhbCk7XG5cdFx0fSk7XG5cdH0gZWxzZSB7IC8vIEJyb3dzZXIgdXNpbmcgcGxhaW4gPHNjcmlwdD4gdGFnXG5cdFx0ZmFjdG9yeShnbG9iYWwsIGZhbHNlKTtcblx0fVxufSAoXG5cbi8vIGZhY3RvcnkgKGZvciBqc3JlbmRlci5qcylcbmZ1bmN0aW9uKGdsb2JhbCwgJCkge1xuXCJ1c2Ugc3RyaWN0XCI7XG5cbi8vPT09PT09PT09PT09PT09PT09PT09PT09PT0gVG9wLWxldmVsIHZhcnMgPT09PT09PT09PT09PT09PT09PT09PT09PT1cblxuLy8gZ2xvYmFsIHZhciBpcyB0aGUgdGhpcyBvYmplY3QsIHdoaWNoIGlzIHdpbmRvdyB3aGVuIHJ1bm5pbmcgaW4gdGhlIHVzdWFsIGJyb3dzZXIgZW52aXJvbm1lbnRcbnZhciBzZXRHbG9iYWxzID0gJCA9PT0gZmFsc2U7IC8vIE9ubHkgc2V0IGdsb2JhbHMgaWYgc2NyaXB0IGJsb2NrIGluIGJyb3dzZXIgKG5vdCBBTUQgYW5kIG5vdCBDb21tb25KUylcblxuJCA9ICQgJiYgJC5mbiA/ICQgOiBnbG9iYWwualF1ZXJ5OyAvLyAkIGlzIGpRdWVyeSBwYXNzZWQgaW4gYnkgQ29tbW9uSlMgbG9hZGVyIChCcm93c2VyaWZ5KSwgb3IgZ2xvYmFsIGpRdWVyeS5cblxudmFyIHZlcnNpb25OdW1iZXIgPSBcInYwLjkuODdcIixcblx0anN2U3RvcmVOYW1lLCByVGFnLCByVG1wbFN0cmluZywgdG9wVmlldywgJHZpZXdzLFx0JGV4cGFuZG8sXG5cdF9vY3AgPSBcIl9vY3BcIiwgLy8gT2JzZXJ2YWJsZSBjb250ZXh0dWFsIHBhcmFtZXRlclxuXG4vL1RPRE9cdHRtcGxGbnNDYWNoZSA9IHt9LFxuXHQkaXNGdW5jdGlvbiwgJGlzQXJyYXksICR0ZW1wbGF0ZXMsICRjb252ZXJ0ZXJzLCAkaGVscGVycywgJHRhZ3MsICRzdWIsICRzdWJTZXR0aW5ncywgJHN1YlNldHRpbmdzQWR2YW5jZWQsICR2aWV3c1NldHRpbmdzLCBkZWxpbU9wZW5DaGFyMCwgZGVsaW1PcGVuQ2hhcjEsIGRlbGltQ2xvc2VDaGFyMCwgZGVsaW1DbG9zZUNoYXIxLCBsaW5rQ2hhciwgc2V0dGluZywgYmFzZU9uRXJyb3IsXG5cblx0clBhdGggPSAvXighKj8pKD86bnVsbHx0cnVlfGZhbHNlfFxcZFtcXGQuXSp8KFtcXHckXSt8XFwufH4oW1xcdyRdKyl8Iyh2aWV3fChbXFx3JF0rKSk/KShbXFx3JC5eXSo/KSg/OlsuW15dKFtcXHckXSspXFxdPyk/KSQvZyxcblx0Ly8gICAgICAgIG5vdCAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBvYmplY3QgICAgIGhlbHBlciAgICB2aWV3ICB2aWV3UHJvcGVydHkgcGF0aFRva2VucyAgICAgIGxlYWZUb2tlblxuXG5cdHJQYXJhbXMgPSAvKFxcKCkoPz1cXHMqXFwoKXwoPzooWyhbXSlcXHMqKT8oPzooXFxePykoISo/WyN+XT9bXFx3JC5eXSspP1xccyooKFxcK1xcK3wtLSl8XFwrfC18JiZ8XFx8XFx8fD09PXwhPT18PT18IT18PD18Pj18Wzw+JSo6P1xcL118KD0pKVxccyp8KCEqP1sjfl0/W1xcdyQuXl0rKShbKFtdKT8pfCgsXFxzKil8KFxcKD8pXFxcXD8oPzooJyl8KFwiKSl8KD86XFxzKigoWylcXF1dKSg/PVxccypbLl5dfFxccyokfFteKFtdKXxbKVxcXV0pKFsoW10/KSl8KFxccyspL2csXG5cdC8vICAgICAgICAgIGxmdFBybjAgICAgICAgIGxmdFBybiAgICAgICAgYm91bmQgICAgICAgICAgICBwYXRoICAgIG9wZXJhdG9yIGVyciAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGVxICAgICAgICAgICAgIHBhdGgyICAgICAgIHBybiAgICBjb21tYSAgIGxmdFBybjIgICBhcG9zIHF1b3QgICAgICBydFBybiBydFBybkRvdCAgICAgICAgICAgICAgICAgICAgICAgICAgIHBybjIgIHNwYWNlXG5cdC8vIChsZWZ0IHBhcmVuPyBmb2xsb3dlZCBieSAocGF0aD8gZm9sbG93ZWQgYnkgb3BlcmF0b3IpIG9yIChwYXRoIGZvbGxvd2VkIGJ5IGxlZnQgcGFyZW4/KSkgb3IgY29tbWEgb3IgYXBvcyBvciBxdW90IG9yIHJpZ2h0IHBhcmVuIG9yIHNwYWNlXG5cblx0aXNSZW5kZXJDYWxsLFxuXHRyTmV3TGluZSA9IC9bIFxcdF0qKFxcclxcbnxcXG58XFxyKS9nLFxuXHRyVW5lc2NhcGVRdW90ZXMgPSAvXFxcXChbJ1wiXSkvZyxcblx0ckVzY2FwZVF1b3RlcyA9IC9bJ1wiXFxcXF0vZywgLy8gRXNjYXBlIHF1b3RlcyBhbmQgXFwgY2hhcmFjdGVyXG5cdHJCdWlsZEhhc2ggPSAvKD86XFx4MDh8Xikob25lcnJvcjopPyg/Oih+PykoKFtcXHckX1xcLl0rKTopPyhbXlxceDA4XSspKVxceDA4KCwpPyhbXlxceDA4XSspL2dpLFxuXHRyVGVzdEVsc2VJZiA9IC9eaWZcXHMvLFxuXHRyRmlyc3RFbGVtID0gLzwoXFx3KylbPlxcc10vLFxuXHRyQXR0ckVuY29kZSA9IC9bXFx4MDBgPjxcIicmPV0vZywgLy8gSW5jbHVkZXMgPiBlbmNvZGluZyBzaW5jZSByQ29udmVydE1hcmtlcnMgaW4gSnNWaWV3cyBkb2VzIG5vdCBza2lwID4gY2hhcmFjdGVycyBpbiBhdHRyaWJ1dGUgc3RyaW5nc1xuXHRySXNIdG1sID0gL1tcXHgwMGA+PFxcXCInJj1dLyxcblx0ckhhc0hhbmRsZXJzID0gL15vbltBLVpdfF5jb252ZXJ0KEJhY2spPyQvLFxuXHRyV3JhcHBlZEluVmlld01hcmtlciA9IC9eXFwjXFxkK19gW1xcc1xcU10qXFwvXFxkK19gJC8sXG5cdHJIdG1sRW5jb2RlID0gckF0dHJFbmNvZGUsXG5cdHZpZXdJZCA9IDAsXG5cdGNoYXJFbnRpdGllcyA9IHtcblx0XHRcIiZcIjogXCImYW1wO1wiLFxuXHRcdFwiPFwiOiBcIiZsdDtcIixcblx0XHRcIj5cIjogXCImZ3Q7XCIsXG5cdFx0XCJcXHgwMFwiOiBcIiYjMDtcIixcblx0XHRcIidcIjogXCImIzM5O1wiLFxuXHRcdCdcIic6IFwiJiMzNDtcIixcblx0XHRcImBcIjogXCImIzk2O1wiLFxuXHRcdFwiPVwiOiBcIiYjNjE7XCJcblx0fSxcblx0SFRNTCA9IFwiaHRtbFwiLFxuXHRPQkpFQ1QgPSBcIm9iamVjdFwiLFxuXHR0bXBsQXR0ciA9IFwiZGF0YS1qc3YtdG1wbFwiLFxuXHRqc3ZUbXBsID0gXCJqc3ZUbXBsXCIsXG5cdGluZGV4U3RyID0gXCJGb3IgI2luZGV4IGluIG5lc3RlZCBibG9jayB1c2UgI2dldEluZGV4KCkuXCIsXG5cdCRyZW5kZXIgPSB7fSxcblxuXHRqc3IgPSBnbG9iYWwuanNyZW5kZXIsXG5cdGpzclRvSnEgPSBqc3IgJiYgJCAmJiAhJC5yZW5kZXIsIC8vIEpzUmVuZGVyIGFscmVhZHkgbG9hZGVkLCB3aXRob3V0IGpRdWVyeS4gYnV0IHdlIHdpbGwgcmUtbG9hZCBpdCBub3cgdG8gYXR0YWNoIHRvIGpRdWVyeVxuXG5cdGpzdlN0b3JlcyA9IHtcblx0XHR0ZW1wbGF0ZToge1xuXHRcdFx0Y29tcGlsZTogY29tcGlsZVRtcGxcblx0XHR9LFxuXHRcdHRhZzoge1xuXHRcdFx0Y29tcGlsZTogY29tcGlsZVRhZ1xuXHRcdH0sXG5cdFx0dmlld01vZGVsOiB7XG5cdFx0XHRjb21waWxlOiBjb21waWxlVmlld01vZGVsXG5cdFx0fSxcblx0XHRoZWxwZXI6IHt9LFxuXHRcdGNvbnZlcnRlcjoge31cblx0fTtcblxuXHQvLyB2aWV3cyBvYmplY3QgKCQudmlld3MgaWYgalF1ZXJ5IGlzIGxvYWRlZCwganNyZW5kZXIudmlld3MgaWYgbm8galF1ZXJ5LCBlLmcuIGluIE5vZGUuanMpXG5cdCR2aWV3cyA9IHtcblx0XHRqc3ZpZXdzOiB2ZXJzaW9uTnVtYmVyLFxuXHRcdHN1Yjoge1xuXHRcdFx0Ly8gc3Vic2NyaXB0aW9uLCBlLmcuIEpzVmlld3MgaW50ZWdyYXRpb25cblx0XHRcdFZpZXc6IFZpZXcsXG5cdFx0XHRFcnI6IEpzVmlld3NFcnJvcixcblx0XHRcdHRtcGxGbjogdG1wbEZuLFxuXHRcdFx0cGFyc2U6IHBhcnNlUGFyYW1zLFxuXHRcdFx0ZXh0ZW5kOiAkZXh0ZW5kLFxuXHRcdFx0ZXh0ZW5kQ3R4OiBleHRlbmRDdHgsXG5cdFx0XHRzeW50YXhFcnI6IHN5bnRheEVycm9yLFxuXHRcdFx0b25TdG9yZToge1xuXHRcdFx0XHR0ZW1wbGF0ZTogZnVuY3Rpb24obmFtZSwgaXRlbSkge1xuXHRcdFx0XHRcdGlmIChpdGVtID09PSBudWxsKSB7XG5cdFx0XHRcdFx0XHRkZWxldGUgJHJlbmRlcltuYW1lXTtcblx0XHRcdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRcdFx0JHJlbmRlcltuYW1lXSA9IGl0ZW07XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHR9XG5cdFx0XHR9LFxuXHRcdFx0YWRkU2V0dGluZzogYWRkU2V0dGluZyxcblx0XHRcdHNldHRpbmdzOiB7XG5cdFx0XHRcdGFsbG93Q29kZTogZmFsc2Vcblx0XHRcdH0sXG5cdFx0XHRhZHZTZXQ6IG5vb3AsIC8vIFVwZGF0ZSBhZHZhbmNlZCBzZXR0aW5nc1xuXHRcdFx0X3RoczogdGFnSGFuZGxlcnNGcm9tUHJvcHMsXG5cdFx0XHRfZ206IGdldE1ldGhvZCxcblx0XHRcdF90ZzogZnVuY3Rpb24oKSB7fSwgLy8gQ29uc3RydWN0b3IgZm9yIHRhZ0RlZlxuXHRcdFx0X2NudnQ6IGNvbnZlcnRWYWwsXG5cdFx0XHRfdGFnOiByZW5kZXJUYWcsXG5cdFx0XHRfZXI6IGVycm9yLFxuXHRcdFx0X2Vycjogb25SZW5kZXJFcnJvcixcblx0XHRcdF9odG1sOiBodG1sRW5jb2RlLFxuXHRcdFx0X2NwOiByZXRWYWwsIC8vIEdldCBvYnNlcnZhYmxlIGNvbnRleHR1YWwgcGFyYW1ldGVycyAob3IgcHJvcGVydGllcykgfmZvbz1leHByLiBJbiBKc1JlbmRlciwgc2ltcGx5IHJldHVybnMgdmFsLlxuXHRcdFx0X3NxOiBmdW5jdGlvbih0b2tlbikge1xuXHRcdFx0XHRpZiAodG9rZW4gPT09IFwiY29uc3RydWN0b3JcIikge1xuXHRcdFx0XHRcdHN5bnRheEVycm9yKFwiXCIpO1xuXHRcdFx0XHR9XG5cdFx0XHRcdHJldHVybiB0b2tlbjtcblx0XHRcdH1cblx0XHR9LFxuXHRcdHNldHRpbmdzOiB7XG5cdFx0XHRkZWxpbWl0ZXJzOiAkdmlld3NEZWxpbWl0ZXJzLFxuXHRcdFx0YWR2YW5jZWQ6IGZ1bmN0aW9uKHZhbHVlKSB7XG5cdFx0XHRcdHJldHVybiB2YWx1ZVxuXHRcdFx0XHRcdD8gKFxuXHRcdFx0XHRcdFx0XHQkZXh0ZW5kKCRzdWJTZXR0aW5nc0FkdmFuY2VkLCB2YWx1ZSksXG5cdFx0XHRcdFx0XHRcdCRzdWIuYWR2U2V0KCksXG5cdFx0XHRcdFx0XHRcdCR2aWV3c1NldHRpbmdzXG5cdFx0XHRcdFx0XHQpXG5cdFx0XHRcdFx0XHQ6ICRzdWJTZXR0aW5nc0FkdmFuY2VkO1xuXHRcdFx0XHR9XG5cdFx0fSxcblx0XHRtYXA6IGRhdGFNYXAgICAgLy8gSWYganNPYnNlcnZhYmxlIGxvYWRlZCBmaXJzdCwgdXNlIHRoYXQgZGVmaW5pdGlvbiBvZiBkYXRhTWFwXG5cdH07XG5cbmZ1bmN0aW9uIGdldERlcml2ZWRNZXRob2QoYmFzZU1ldGhvZCwgbWV0aG9kKSB7XG5cdHJldHVybiBmdW5jdGlvbigpIHtcblx0XHR2YXIgcmV0LFxuXHRcdFx0dGFnID0gdGhpcyxcblx0XHRcdHByZXZCYXNlID0gdGFnLmJhc2U7XG5cblx0XHR0YWcuYmFzZSA9IGJhc2VNZXRob2Q7IC8vIFdpdGhpbiBtZXRob2QgY2FsbCwgY2FsbGluZyB0aGlzLmJhc2Ugd2lsbCBjYWxsIHRoZSBiYXNlIG1ldGhvZFxuXHRcdHJldCA9IG1ldGhvZC5hcHBseSh0YWcsIGFyZ3VtZW50cyk7IC8vIENhbGwgdGhlIG1ldGhvZFxuXHRcdHRhZy5iYXNlID0gcHJldkJhc2U7IC8vIFJlcGxhY2UgdGhpcy5iYXNlIHRvIGJlIHRoZSBiYXNlIG1ldGhvZCBvZiB0aGUgcHJldmlvdXMgY2FsbCwgZm9yIGNoYWluZWQgY2FsbHNcblx0XHRyZXR1cm4gcmV0O1xuXHR9O1xufVxuXG5mdW5jdGlvbiBnZXRNZXRob2QoYmFzZU1ldGhvZCwgbWV0aG9kKSB7XG5cdC8vIEZvciBkZXJpdmVkIG1ldGhvZHMgKG9yIGhhbmRsZXJzIGRlY2xhcmVkIGRlY2xhcmF0aXZlbHkgYXMgaW4ge3s6Zm9vIG9uQ2hhbmdlPX5mb29DaGFuZ2VkfX0gcmVwbGFjZSBieSBhIGRlcml2ZWQgbWV0aG9kLCB0byBhbGxvdyB1c2luZyB0aGlzLmJhc2UoLi4uKVxuXHQvLyBvciB0aGlzLmJhc2VBcHBseShhcmd1bWVudHMpIHRvIGNhbGwgdGhlIGJhc2UgaW1wbGVtZW50YXRpb24uIChFcXVpdmFsZW50IHRvIHRoaXMuX3N1cGVyKC4uLikgYW5kIHRoaXMuX3N1cGVyQXBwbHkoYXJndW1lbnRzKSBpbiBqUXVlcnkgVUkpXG5cdGlmICgkaXNGdW5jdGlvbihtZXRob2QpKSB7XG5cdFx0bWV0aG9kID0gZ2V0RGVyaXZlZE1ldGhvZChcblx0XHRcdFx0IWJhc2VNZXRob2Rcblx0XHRcdFx0XHQ/IG5vb3AgLy8gbm8gYmFzZSBtZXRob2QgaW1wbGVtZW50YXRpb24sIHNvIHVzZSBub29wIGFzIGJhc2UgbWV0aG9kXG5cdFx0XHRcdFx0OiBiYXNlTWV0aG9kLl9kXG5cdFx0XHRcdFx0XHQ/IGJhc2VNZXRob2QgLy8gYmFzZU1ldGhvZCBpcyBhIGRlcml2ZWQgbWV0aG9kLCBzbyB1c2UgaXRcblx0XHRcdFx0XHRcdDogZ2V0RGVyaXZlZE1ldGhvZChub29wLCBiYXNlTWV0aG9kKSwgLy8gYmFzZU1ldGhvZCBpcyBub3QgZGVyaXZlZCBzbyBtYWtlIGl0cyBiYXNlIG1ldGhvZCBiZSB0aGUgbm9vcCBtZXRob2Rcblx0XHRcdFx0bWV0aG9kXG5cdFx0XHQpO1xuXHRcdG1ldGhvZC5fZCA9IDE7IC8vIEFkZCBmbGFnIHRoYXQgdGhpcyBpcyBhIGRlcml2ZWQgbWV0aG9kXG5cdH1cblx0cmV0dXJuIG1ldGhvZDtcbn1cblxuZnVuY3Rpb24gdGFnSGFuZGxlcnNGcm9tUHJvcHModGFnLCB0YWdDdHgpIHtcblx0Zm9yICh2YXIgcHJvcCBpbiB0YWdDdHgucHJvcHMpIHtcblx0XHRpZiAockhhc0hhbmRsZXJzLnRlc3QocHJvcCkgJiYgISh0YWdbcHJvcF0gJiYgdGFnW3Byb3BdLmZpeCkpIHsgLy8gRG9uJ3Qgb3ZlcnJpZGUgaGFuZGxlcnMgd2l0aCBmaXggZXhwYW5kbyAodXNlZCBpbiBkYXRlcGlja2VyIGFuZCBzcGlubmVyKVxuXHRcdFx0dGFnW3Byb3BdID0gZ2V0TWV0aG9kKHRhZy5jb25zdHJ1Y3Rvci5wcm90b3R5cGVbcHJvcF0sIHRhZ0N0eC5wcm9wc1twcm9wXSk7XG5cdFx0XHQvLyBDb3B5IG92ZXIgdGhlIG9uRm9vIHByb3BzLCBjb252ZXJ0IGFuZCBjb252ZXJ0QmFjayBmcm9tIHRhZ0N0eC5wcm9wcyB0byB0YWcgKG92ZXJyaWRlcyB2YWx1ZXMgaW4gdGFnRGVmKS5cblx0XHRcdC8vIE5vdGU6IHVuc3VwcG9ydGVkIHNjZW5hcmlvOiBpZiBoYW5kbGVycyBhcmUgZHluYW1pY2FsbHkgYWRkZWQgXm9uRm9vPWV4cHJlc3Npb24gdGhpcyB3aWxsIHdvcmssIGJ1dCBkeW5hbWljYWxseSByZW1vdmluZyB3aWxsIG5vdCB3b3JrLlxuXHRcdH1cblx0fVxufVxuXG5mdW5jdGlvbiByZXRWYWwodmFsKSB7XG5cdHJldHVybiB2YWw7XG59XG5cbmZ1bmN0aW9uIG5vb3AoKSB7XG5cdHJldHVybiBcIlwiO1xufVxuXG5mdW5jdGlvbiBkYmdCcmVhayh2YWwpIHtcblx0Ly8gVXNhZ2UgZXhhbXBsZXM6IHt7ZGJnOi4uLn19LCB7ezp+ZGJnKC4uLil9fSwge3tkYmcgLi4uL319LCB7Xntmb3IgLi4uIG9uQWZ0ZXJMaW5rPX5kYmd9fSBldGMuXG5cdHRyeSB7XG5cdFx0Y29uc29sZS5sb2coXCJKc1JlbmRlciBkYmcgYnJlYWtwb2ludDogXCIgKyB2YWwpO1xuXHRcdHRocm93IFwiZGJnIGJyZWFrcG9pbnRcIjsgLy8gVG8gYnJlYWsgaGVyZSwgc3RvcCBvbiBjYXVnaHQgZXhjZXB0aW9ucy5cblx0fVxuXHRjYXRjaCAoZSkge31cblx0cmV0dXJuIHRoaXMuYmFzZSA/IHRoaXMuYmFzZUFwcGx5KGFyZ3VtZW50cykgOiB2YWw7XG59XG5cbmZ1bmN0aW9uIEpzVmlld3NFcnJvcihtZXNzYWdlKSB7XG5cdC8vIEVycm9yIGV4Y2VwdGlvbiB0eXBlIGZvciBKc1ZpZXdzL0pzUmVuZGVyXG5cdC8vIE92ZXJyaWRlIG9mICQudmlld3Muc3ViLkVycm9yIGlzIHBvc3NpYmxlXG5cdHRoaXMubmFtZSA9ICgkLmxpbmsgPyBcIkpzVmlld3NcIiA6IFwiSnNSZW5kZXJcIikgKyBcIiBFcnJvclwiO1xuXHR0aGlzLm1lc3NhZ2UgPSBtZXNzYWdlIHx8IHRoaXMubmFtZTtcbn1cblxuZnVuY3Rpb24gJGV4dGVuZCh0YXJnZXQsIHNvdXJjZSkge1xuXHRpZiAodGFyZ2V0KSB7XG5cdFx0Zm9yICh2YXIgbmFtZSBpbiBzb3VyY2UpIHtcblx0XHRcdHRhcmdldFtuYW1lXSA9IHNvdXJjZVtuYW1lXTtcblx0XHR9XG5cdFx0cmV0dXJuIHRhcmdldDtcblx0fVxufVxuXG4oSnNWaWV3c0Vycm9yLnByb3RvdHlwZSA9IG5ldyBFcnJvcigpKS5jb25zdHJ1Y3RvciA9IEpzVmlld3NFcnJvcjtcblxuLy89PT09PT09PT09PT09PT09PT09PT09PT09PSBUb3AtbGV2ZWwgZnVuY3Rpb25zID09PT09PT09PT09PT09PT09PT09PT09PT09XG5cbi8vPT09PT09PT09PT09PT09PT09PVxuLy8gdmlld3MuZGVsaW1pdGVyc1xuLy89PT09PT09PT09PT09PT09PT09XG5cbmZ1bmN0aW9uICR2aWV3c0RlbGltaXRlcnMob3BlbkNoYXJzLCBjbG9zZUNoYXJzLCBsaW5rKSB7XG5cdC8vIFNldCB0aGUgdGFnIG9wZW5pbmcgYW5kIGNsb3NpbmcgZGVsaW1pdGVycyBhbmQgJ2xpbmsnIGNoYXJhY3Rlci4gRGVmYXVsdCBpcyBcInt7XCIsIFwifX1cIiBhbmQgXCJeXCJcblx0Ly8gb3BlbkNoYXJzLCBjbG9zZUNoYXJzOiBvcGVuaW5nIGFuZCBjbG9zaW5nIHN0cmluZ3MsIGVhY2ggd2l0aCB0d28gY2hhcmFjdGVyc1xuXHRpZiAoIW9wZW5DaGFycykge1xuXHRcdHJldHVybiAkc3ViU2V0dGluZ3MuZGVsaW1pdGVycztcblx0fVxuXHRpZiAoJGlzQXJyYXkob3BlbkNoYXJzKSkge1xuXHRcdHJldHVybiAkdmlld3NEZWxpbWl0ZXJzLmFwcGx5KCR2aWV3cywgb3BlbkNoYXJzKTtcblx0fVxuXG5cdCRzdWJTZXR0aW5ncy5kZWxpbWl0ZXJzID0gW29wZW5DaGFycywgY2xvc2VDaGFycywgbGlua0NoYXIgPSBsaW5rID8gbGluay5jaGFyQXQoMCkgOiBsaW5rQ2hhcl07XG5cblx0ZGVsaW1PcGVuQ2hhcjAgPSBvcGVuQ2hhcnMuY2hhckF0KDApOyAvLyBFc2NhcGUgdGhlIGNoYXJhY3RlcnMgLSBzaW5jZSB0aGV5IGNvdWxkIGJlIHJlZ2V4IHNwZWNpYWwgY2hhcmFjdGVyc1xuXHRkZWxpbU9wZW5DaGFyMSA9IG9wZW5DaGFycy5jaGFyQXQoMSk7XG5cdGRlbGltQ2xvc2VDaGFyMCA9IGNsb3NlQ2hhcnMuY2hhckF0KDApO1xuXHRkZWxpbUNsb3NlQ2hhcjEgPSBjbG9zZUNoYXJzLmNoYXJBdCgxKTtcblx0b3BlbkNoYXJzID0gXCJcXFxcXCIgKyBkZWxpbU9wZW5DaGFyMCArIFwiKFxcXFxcIiArIGxpbmtDaGFyICsgXCIpP1xcXFxcIiArIGRlbGltT3BlbkNoYXIxOyAvLyBEZWZhdWx0IGlzIFwie157XCJcblx0Y2xvc2VDaGFycyA9IFwiXFxcXFwiICsgZGVsaW1DbG9zZUNoYXIwICsgXCJcXFxcXCIgKyBkZWxpbUNsb3NlQ2hhcjE7ICAgICAgICAgICAgICAgICAgIC8vIERlZmF1bHQgaXMgXCJ9fVwiXG5cdC8vIEJ1aWxkIHJlZ2V4IHdpdGggbmV3IGRlbGltaXRlcnNcblx0Ly8gICAgICAgICAgW3RhZyAgICAoZm9sbG93ZWQgYnkgLyBzcGFjZSBvciB9KSAgb3IgY3Z0citjb2xvbiBvciBodG1sIG9yIGNvZGVdIGZvbGxvd2VkIGJ5IHNwYWNlK3BhcmFtcyB0aGVuIGNvbnZlcnRCYWNrP1xuXHRyVGFnID0gXCIoPzooXFxcXHcrKD89W1xcXFwvXFxcXHNcXFxcXCIgKyBkZWxpbUNsb3NlQ2hhcjAgKyBcIl0pKXwoXFxcXHcrKT8oOil8KD4pfChcXFxcKikpXFxcXHMqKCg/OlteXFxcXFwiXG5cdFx0KyBkZWxpbUNsb3NlQ2hhcjAgKyBcIl18XFxcXFwiICsgZGVsaW1DbG9zZUNoYXIwICsgXCIoPyFcXFxcXCIgKyBkZWxpbUNsb3NlQ2hhcjEgKyBcIikpKj8pXCI7XG5cblx0Ly8gTWFrZSByVGFnIGF2YWlsYWJsZSB0byBKc1ZpZXdzIChvciBvdGhlciBjb21wb25lbnRzKSBmb3IgcGFyc2luZyBiaW5kaW5nIGV4cHJlc3Npb25zXG5cdCRzdWIuclRhZyA9IFwiKD86XCIgKyByVGFnICsgXCIpXCI7XG5cdC8vICAgICAgICAgICAgICAgICAgICAgICAgeyBePyB7ICAgdGFnK3BhcmFtcyBzbGFzaD8gIG9yIGNsb3NpbmdUYWcgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBvciBjb21tZW50XG5cdHJUYWcgPSBuZXcgUmVnRXhwKFwiKD86XCIgKyBvcGVuQ2hhcnMgKyByVGFnICsgXCIoXFxcXC8pP3xcXFxcXCIgKyBkZWxpbU9wZW5DaGFyMCArIFwiKFxcXFxcIiArIGxpbmtDaGFyICsgXCIpP1xcXFxcIiArIGRlbGltT3BlbkNoYXIxICsgXCIoPzooPzpcXFxcLyhcXFxcdyspKVxcXFxzKnwhLS1bXFxcXHNcXFxcU10qPy0tKSlcIiArIGNsb3NlQ2hhcnMsIFwiZ1wiKTtcblxuXHQvLyBEZWZhdWx0OiAgYmluZCAgICAgdGFnTmFtZSAgICAgICAgIGN2dCAgIGNsbiBodG1sIGNvZGUgICAgcGFyYW1zICAgICAgICAgICAgc2xhc2ggICBiaW5kMiAgICAgICAgIGNsb3NlQmxrICBjb21tZW50XG5cdC8vICAgICAgLyg/OnsoXFxeKT97KD86KFxcdysoPz1bXFwvXFxzfV0pKXwoXFx3Kyk/KDopfCg+KXwoXFwqKSlcXHMqKCg/OltefV18fSg/IX0pKSo/KShcXC8pP3x7KFxcXik/eyg/Oig/OlxcLyhcXHcrKSlcXHMqfCEtLVtcXHNcXFNdKj8tLSkpfX1cblxuXHQkc3ViLnJUbXBsID0gbmV3IFJlZ0V4cChcIl5cXFxcc3xcXFxccyR8PC4qPnwoW15cXFxcXFxcXF18Xilbe31dfFwiICsgb3BlbkNoYXJzICsgXCIuKlwiICsgY2xvc2VDaGFycyk7XG5cdC8vICRzdWIuclRtcGwgbG9va3MgZm9yIGluaXRpYWwgb3IgZmluYWwgd2hpdGUgc3BhY2UsIGh0bWwgdGFncyBvciB7IG9yIH0gY2hhciBub3QgcHJlY2VkZWQgYnkgXFxcXCwgb3IgSnNSZW5kZXIgdGFncyB7e3h4eH19LlxuXHQvLyBFYWNoIG9mIHRoZXNlIHN0cmluZ3MgYXJlIGNvbnNpZGVyZWQgTk9UIHRvIGJlIGpRdWVyeSBzZWxlY3RvcnNcblx0cmV0dXJuICR2aWV3c1NldHRpbmdzO1xufVxuXG4vLz09PT09PT09PVxuLy8gVmlldy5nZXRcbi8vPT09PT09PT09XG5cbmZ1bmN0aW9uIGdldFZpZXcoaW5uZXIsIHR5cGUpIHsgLy92aWV3LmdldChpbm5lciwgdHlwZSlcblx0aWYgKCF0eXBlICYmIGlubmVyICE9PSB0cnVlKSB7XG5cdFx0Ly8gdmlldy5nZXQodHlwZSlcblx0XHR0eXBlID0gaW5uZXI7XG5cdFx0aW5uZXIgPSB1bmRlZmluZWQ7XG5cdH1cblxuXHR2YXIgdmlld3MsIGksIGwsIGZvdW5kLFxuXHRcdHZpZXcgPSB0aGlzLFxuXHRcdHJvb3QgPSAhdHlwZSB8fCB0eXBlID09PSBcInJvb3RcIjtcblx0XHQvLyBJZiB0eXBlIGlzIHVuZGVmaW5lZCwgcmV0dXJucyByb290IHZpZXcgKHZpZXcgdW5kZXIgdG9wIHZpZXcpLlxuXG5cdGlmIChpbm5lcikge1xuXHRcdC8vIEdvIHRocm91Z2ggdmlld3MgLSB0aGlzIG9uZSwgYW5kIGFsbCBuZXN0ZWQgb25lcywgZGVwdGgtZmlyc3QgLSBhbmQgcmV0dXJuIGZpcnN0IG9uZSB3aXRoIGdpdmVuIHR5cGUuXG5cdFx0Ly8gSWYgdHlwZSBpcyB1bmRlZmluZWQsIGkuZS4gdmlldy5nZXQodHJ1ZSksIHJldHVybiBmaXJzdCBjaGlsZCB2aWV3LlxuXHRcdGZvdW5kID0gdHlwZSAmJiB2aWV3LnR5cGUgPT09IHR5cGUgJiYgdmlldztcblx0XHRpZiAoIWZvdW5kKSB7XG5cdFx0XHR2aWV3cyA9IHZpZXcudmlld3M7XG5cdFx0XHRpZiAodmlldy5fLnVzZUtleSkge1xuXHRcdFx0XHRmb3IgKGkgaW4gdmlld3MpIHtcblx0XHRcdFx0XHRpZiAoZm91bmQgPSB0eXBlID8gdmlld3NbaV0uZ2V0KGlubmVyLCB0eXBlKSA6IHZpZXdzW2ldKSB7XG5cdFx0XHRcdFx0XHRicmVhaztcblx0XHRcdFx0XHR9XG5cdFx0XHRcdH1cblx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdGZvciAoaSA9IDAsIGwgPSB2aWV3cy5sZW5ndGg7ICFmb3VuZCAmJiBpIDwgbDsgaSsrKSB7XG5cdFx0XHRcdFx0Zm91bmQgPSB0eXBlID8gdmlld3NbaV0uZ2V0KGlubmVyLCB0eXBlKSA6IHZpZXdzW2ldO1xuXHRcdFx0XHR9XG5cdFx0XHR9XG5cdFx0fVxuXHR9IGVsc2UgaWYgKHJvb3QpIHtcblx0XHQvLyBGaW5kIHJvb3Qgdmlldy4gKHZpZXcgd2hvc2UgcGFyZW50IGlzIHRvcCB2aWV3KVxuXHRcdGZvdW5kID0gdmlldy5yb290O1xuXHR9IGVsc2Uge1xuXHRcdHdoaWxlICh2aWV3ICYmICFmb3VuZCkge1xuXHRcdFx0Ly8gR28gdGhyb3VnaCB2aWV3cyAtIHRoaXMgb25lLCBhbmQgYWxsIHBhcmVudCBvbmVzIC0gYW5kIHJldHVybiBmaXJzdCBvbmUgd2l0aCBnaXZlbiB0eXBlLlxuXHRcdFx0Zm91bmQgPSB2aWV3LnR5cGUgPT09IHR5cGUgPyB2aWV3IDogdW5kZWZpbmVkO1xuXHRcdFx0dmlldyA9IHZpZXcucGFyZW50O1xuXHRcdH1cblx0fVxuXHRyZXR1cm4gZm91bmQ7XG59XG5cbmZ1bmN0aW9uIGdldE5lc3RlZEluZGV4KCkge1xuXHR2YXIgdmlldyA9IHRoaXMuZ2V0KFwiaXRlbVwiKTtcblx0cmV0dXJuIHZpZXcgPyB2aWV3LmluZGV4IDogdW5kZWZpbmVkO1xufVxuXG5nZXROZXN0ZWRJbmRleC5kZXBlbmRzID0gZnVuY3Rpb24oKSB7XG5cdHJldHVybiBbdGhpcy5nZXQoXCJpdGVtXCIpLCBcImluZGV4XCJdO1xufTtcblxuZnVuY3Rpb24gZ2V0SW5kZXgoKSB7XG5cdHJldHVybiB0aGlzLmluZGV4O1xufVxuXG5nZXRJbmRleC5kZXBlbmRzID0gXCJpbmRleFwiO1xuXG4vLz09PT09PT09PT1cbi8vIFZpZXcuaGxwXG4vLz09PT09PT09PT1cblxuZnVuY3Rpb24gY29udGV4dFBhcmFtZXRlcihrZXksIHZhbHVlLCBpc0NvbnRleHRDYikge1xuXHQvLyBIZWxwZXIgbWV0aG9kIGNhbGxlZCBhcyB2aWV3LmN0eFBybShrZXkpIGZvciBoZWxwZXJzIG9yIHRlbXBsYXRlIHBhcmFtZXRlcnMgfmZvbyAtIGZyb20gY29tcGlsZWQgdGVtcGxhdGUgb3IgZnJvbSBjb250ZXh0IGNhbGxiYWNrXG5cdHZhciB3cmFwcGVkLCBkZXBzLCByZXMsIG9ic0N0eFBybSxcblx0XHRzdG9yZVZpZXcgPSB0aGlzLFxuXHRcdGlzVXBkYXRlID0gIWlzUmVuZGVyQ2FsbCAmJiB2YWx1ZSAhPT0gdW5kZWZpbmVkLFxuXHRcdHN0b3JlID0gc3RvcmVWaWV3LmN0eDtcblxuXHRpZiAoa2V5IGluIHN0b3JlIHx8IGtleSBpbiAoc3RvcmUgPSAkaGVscGVycykpIHtcblx0XHRyZXMgPSBzdG9yZSAmJiBzdG9yZVtrZXldO1xuXHRcdGlmIChrZXkgPT09IFwidGFnXCIgfHwga2V5ID09PSBcInJvb3RcIiB8fCBrZXkgPT09IFwicGFyZW50VGFnc1wiIHx8IHN0b3JlVmlldy5fLml0ID09PSBrZXkgKSB7XG5cdFx0XHRyZXR1cm4gcmVzO1xuXHRcdH1cblx0fSBlbHNlIHtcblx0XHRzdG9yZSA9IHVuZGVmaW5lZDtcblx0fVxuXHRpZiAoIXJlcyB8fCAhJGlzRnVuY3Rpb24ocmVzKSAmJiBzdG9yZVZpZXcubGlua2VkIHx8IHN0b3JlVmlldy50YWdDdHgpIHsgLy8gRGF0YS1saW5rZWQgdmlldywgb3IgdGFnIGluc3RhbmNlXG5cdFx0aWYgKCFyZXMgfHwgIXJlcy5fY3hwKSB7XG5cdFx0XHQvLyBOb3QgYSBjb250ZXh0dWFsIHBhcmFtZXRlclxuXHRcdFx0aWYgKHN0b3JlICE9PSAkaGVscGVycykge1xuXHRcdFx0XHQvLyBTZXQgc3RvcmVWaWV3IHRvIHRhZyAoaWYgdGhpcyBpcyBhIHRhZy5jdHhQcm0oKSBjYWxsKSBvciB0byByb290IHZpZXcgKHZpZXcgdW5kZXIgdG9wIHZpZXcpXG5cdFx0XHRcdHN0b3JlVmlldyA9IHN0b3JlVmlldy5jdHggJiYgc3RvcmVWaWV3LmN0eC50YWcgfHwgc3RvcmVWaWV3LnJvb3Q7XG5cdFx0XHRcdHN0b3JlID0gc3RvcmVWaWV3Ll9vY3BzO1xuXHRcdFx0XHRyZXMgPSBzdG9yZSAmJiBzdG9yZVtrZXldIHx8IHJlcztcblx0XHRcdH1cblx0XHRcdGlmICghKHJlcyAmJiByZXMuX2N4cCkgJiYgKGlzQ29udGV4dENiIHx8IGlzVXBkYXRlKSkge1xuXHRcdFx0XHRyZXMgPSAkc3ViLl9jcmNwKGtleSwgcmVzLCBzdG9yZVZpZXcsIHN0b3JlKTsgLy8gQ3JlYXRlIG9ic2VydmFibGUgY29udGV4dHVhbCBwYXJhbWV0ZXJcblx0XHRcdH1cblx0XHR9XG5cdFx0aWYgKG9ic0N0eFBybSA9IHJlcyAmJiByZXMuX2N4cCkge1xuXHRcdFx0aWYgKGlzVXBkYXRlKSB7XG5cdFx0XHRcdHJldHVybiAkc3ViLl91Y3Aoa2V5LCB2YWx1ZSwgc3RvcmVWaWV3LCBvYnNDdHhQcm0pOyAvLyBVcGRhdGUgb2JzZXJ2YWJsZSBjb250ZXh0dWFsIHBhcmFtZXRlclxuXHRcdFx0fVxuXHRcdFx0aWYgKGlzQ29udGV4dENiKSB7IC8vIElmIHRoaXMgaGVscGVyIHJlc291cmNlIGlzIGFuIG9ic2VydmFibGUgY29udGV4dHVhbCBwYXJhbWV0ZXJcblx0XHRcdFx0Ly8gSW4gYSBjb250ZXh0IGNhbGxiYWNrIGZvciBhIGNvbnRleHR1YWwgcGFyYW0sIHJldHVybiB0aGUgW3ZpZXcsIGRlcGVuZGVuY2llcy4uLl0gYXJyYXkgLSBuZWVkZWQgZm9yIG9ic2VydmUgY2FsbFxuXHRcdFx0XHRkZXBzID0gcmVzWzFdID8gJHN1Yi5fY2VvKHJlc1sxXS5kZXBzKSA6IFtfb2NwXTsgLy8gZm4gZGVwcyAod2l0aCBhbnkgZXhwck9icyBjbG9uZWQgdXNpbmcgJHN1Yi5fY2VvKVxuXHRcdFx0XHRkZXBzLnVuc2hpZnQocmVzWzBdKTsgLy8gdmlld1xuXHRcdFx0XHRkZXBzLl9jeHAgPSBvYnNDdHhQcm07XG5cdFx0XHRcdHJldHVybiBkZXBzO1xuXHRcdFx0fVxuXHRcdFx0cmVzID0gcmVzWzFdIC8vIGxpbmtGbiBmb3IgY29tcGlsZWQgZXhwcmVzc2lvblxuXHRcdFx0XHQ/IG9ic0N0eFBybS50YWcgJiYgb2JzQ3R4UHJtLnRhZy5jdnRBcmdzXG5cdFx0XHRcdFx0PyBvYnNDdHhQcm0udGFnLmN2dEFyZ3ModW5kZWZpbmVkLCAxLCBvYnNDdHhQcm0udGFnRWxzZSlbb2JzQ3R4UHJtLmluZF0gLy8gPSB0YWcuYm5kQXJncygpIC0gZm9yIHRhZyBjb250ZXh0dWFsIHBhcmFtZXRlclxuXHRcdFx0XHRcdDogcmVzWzFdKHJlc1swXS5kYXRhLCByZXNbMF0sICRzdWIpICAgIC8vID0gZm4oZGF0YSwgdmlldywgJHN1YikgZm9yIGNvbXBpbGVkIGJpbmRpbmcgZXhwcmVzc2lvblxuXHRcdFx0XHQ6IHJlc1swXS5fb2NwOyAvLyBPYnNlcnZhYmxlIGNvbnRleHR1YWwgcGFyYW1ldGVyICh1bmluaXRpYWxpemVkLCBvciBpbml0aWFsaXplZCBhcyBzdGF0aWMgZXhwcmVzc2lvbiwgc28gbm8gcGF0aCBkZXBlbmRlbmNpZXMpXG5cdFx0fVxuXHR9XG5cdGlmIChyZXMgJiYgJGlzRnVuY3Rpb24ocmVzKSkge1xuXHRcdC8vIElmIGEgaGVscGVyIGlzIG9mIHR5cGUgZnVuY3Rpb24sIGFuZCBub3QgYWxyZWFkeSB3cmFwcGVkLCB3ZSB3aWxsIHdyYXAgaXQsIHNvIGlmIGNhbGxlZCB3aXRoIG5vIHRoaXMgcG9pbnRlciBpdCB3aWxsIGJlIGNhbGxlZCB3aXRoIHRoZVxuXHRcdC8vIHZpZXcgYXMgJ3RoaXMnIGNvbnRleHQuIElmIHRoZSBoZWxwZXIgfmZvbygpIHdhcyBpbiBhIGRhdGEtbGluayBleHByZXNzaW9uLCB0aGUgdmlldyB3aWxsIGhhdmUgYSAndGVtcG9yYXJ5JyBsaW5rQ3R4IHByb3BlcnR5IHRvby5cblx0XHQvLyBOb3RlIHRoYXQgaGVscGVyIGZ1bmN0aW9ucyBvbiBkZWVwZXIgcGF0aHMgd2lsbCBoYXZlIHNwZWNpZmljIHRoaXMgcG9pbnRlcnMsIGZyb20gdGhlIHByZWNlZGluZyBwYXRoLlxuXHRcdC8vIEZvciBleGFtcGxlLCB+dXRpbC5mb28oKSB3aWxsIGhhdmUgdGhlIH51dGlsIG9iamVjdCBhcyAndGhpcycgcG9pbnRlclxuXHRcdHdyYXBwZWQgPSBmdW5jdGlvbigpIHtcblx0XHRcdHJldHVybiByZXMuYXBwbHkoKCF0aGlzIHx8IHRoaXMgPT09IGdsb2JhbCkgPyBzdG9yZVZpZXcgOiB0aGlzLCBhcmd1bWVudHMpO1xuXHRcdH07XG5cdFx0JGV4dGVuZCh3cmFwcGVkLCByZXMpOyAvLyBBdHRhY2ggc2FtZSBleHBhbmRvcyAoaWYgYW55KSB0byB0aGUgd3JhcHBlZCBmdW5jdGlvblxuXHRcdHdyYXBwZWQuX3Z3ID0gc3RvcmVWaWV3O1xuXHR9XG5cdHJldHVybiB3cmFwcGVkIHx8IHJlcztcbn1cblxuZnVuY3Rpb24gZ2V0VGVtcGxhdGUodG1wbCkge1xuXHRyZXR1cm4gdG1wbCAmJiAodG1wbC5mblxuXHRcdD8gdG1wbFxuXHRcdDogdGhpcy5nZXRSc2MoXCJ0ZW1wbGF0ZXNcIiwgdG1wbCkgfHwgJHRlbXBsYXRlcyh0bXBsKSk7IC8vIG5vdCB5ZXQgY29tcGlsZWRcbn1cblxuLy89PT09PT09PT09PT09PVxuLy8gdmlld3MuX2NudnRcbi8vPT09PT09PT09PT09PT1cblxuZnVuY3Rpb24gY29udmVydFZhbChjb252ZXJ0ZXIsIHZpZXcsIHRhZ0N0eCwgb25FcnJvcikge1xuXHQvLyBzZWxmIGlzIHRlbXBsYXRlIG9iamVjdCBvciBsaW5rQ3R4IG9iamVjdFxuXHR2YXIgdGFnLCB2YWx1ZSxcblx0XHQvLyBJZiB0YWdDdHggaXMgYW4gaW50ZWdlciwgdGhlbiBpdCBpcyB0aGUga2V5IGZvciB0aGUgY29tcGlsZWQgZnVuY3Rpb24gdG8gcmV0dXJuIHRoZSBib3VuZFRhZyB0YWdDdHhcblx0XHRib3VuZFRhZyA9IHR5cGVvZiB0YWdDdHggPT09IFwibnVtYmVyXCIgJiYgdmlldy50bXBsLmJuZHNbdGFnQ3R4LTFdLFxuXHRcdGxpbmtDdHggPSB2aWV3LmxpbmtDdHg7IC8vIEZvciBkYXRhLWxpbms9XCJ7Y3Z0Oi4uLn1cIi4uLlxuXG5cdGlmIChvbkVycm9yID09PSB1bmRlZmluZWQgJiYgYm91bmRUYWcgJiYgYm91bmRUYWcuX2xyKSB7IC8vIGxhdGVSZW5kZXJcblx0XHRvbkVycm9yID0gXCJcIjtcblx0fVxuXHRpZiAob25FcnJvciAhPT0gdW5kZWZpbmVkKSB7XG5cdFx0dGFnQ3R4ID0gb25FcnJvciA9IHtwcm9wczoge30sIGFyZ3M6IFtvbkVycm9yXX07XG5cdH0gZWxzZSBpZiAoYm91bmRUYWcpIHtcblx0XHR0YWdDdHggPSBib3VuZFRhZyh2aWV3LmRhdGEsIHZpZXcsICRzdWIpO1xuXHR9XG5cdGJvdW5kVGFnID0gYm91bmRUYWcuX2JkICYmIGJvdW5kVGFnO1xuXHR2YWx1ZSA9IHRhZ0N0eC5hcmdzWzBdO1xuXHRpZiAoY29udmVydGVyIHx8IGJvdW5kVGFnKSB7XG5cdFx0dGFnID0gbGlua0N0eCAmJiBsaW5rQ3R4LnRhZztcblx0XHR0YWdDdHgudmlldyA9IHZpZXc7XG5cdFx0aWYgKCF0YWcpIHtcblx0XHRcdHRhZyA9ICRleHRlbmQobmV3ICRzdWIuX3RnKCksIHtcblx0XHRcdFx0Xzoge1xuXHRcdFx0XHRcdGlubGluZTogIWxpbmtDdHgsXG5cdFx0XHRcdFx0Ym5kOiBib3VuZFRhZyxcblx0XHRcdFx0XHR1bmxpbmtlZDogdHJ1ZVxuXHRcdFx0XHR9LFxuXHRcdFx0XHR0YWdOYW1lOiBcIjpcIixcblx0XHRcdFx0Y3Z0OiBjb252ZXJ0ZXIsXG5cdFx0XHRcdGZsb3c6IHRydWUsXG5cdFx0XHRcdHRhZ0N0eDogdGFnQ3R4XG5cdFx0XHR9KTtcblx0XHRcdGlmIChsaW5rQ3R4KSB7XG5cdFx0XHRcdGxpbmtDdHgudGFnID0gdGFnO1xuXHRcdFx0XHR0YWcubGlua0N0eCA9IGxpbmtDdHg7XG5cdFx0XHR9XG5cdFx0XHR0YWdDdHguY3R4ID0gZXh0ZW5kQ3R4KHRhZ0N0eC5jdHgsIChsaW5rQ3R4ID8gbGlua0N0eC52aWV3IDogdmlldykuY3R4KTtcblx0XHRcdHRhZ0hhbmRsZXJzRnJvbVByb3BzKHRhZywgdGFnQ3R4KTtcblx0XHR9XG5cdFx0dGFnLl9lciA9IG9uRXJyb3IgJiYgdmFsdWU7XG5cdFx0dGFnLmN0eCA9IHRhZ0N0eC5jdHggfHwgdGFnLmN0eCB8fCB7fTtcblx0XHR0YWdDdHguY3R4ID0gdW5kZWZpbmVkO1xuXG5cdFx0dmFsdWUgPSB0YWcuY3Z0QXJncyhjb252ZXJ0ZXIgIT09IFwidHJ1ZVwiICYmIGNvbnZlcnRlcilbMF07IC8vIElmIHRoZXJlIGlzIGEgY29udmVydEJhY2sgYnV0IG5vIGNvbnZlcnQsIGNvbnZlcnRlciB3aWxsIGJlIFwidHJ1ZVwiXG5cdH1cblxuXHQvLyBDYWxsIG9uUmVuZGVyICh1c2VkIGJ5IEpzVmlld3MgaWYgcHJlc2VudCwgdG8gYWRkIGJpbmRpbmcgYW5ub3RhdGlvbnMgYXJvdW5kIHJlbmRlcmVkIGNvbnRlbnQpXG5cdHZhbHVlID0gYm91bmRUYWcgJiYgdmlldy5fLm9uUmVuZGVyXG5cdFx0PyB2aWV3Ll8ub25SZW5kZXIodmFsdWUsIHZpZXcsIHRhZylcblx0XHQ6IHZhbHVlO1xuXHRyZXR1cm4gdmFsdWUgIT0gdW5kZWZpbmVkID8gdmFsdWUgOiBcIlwiO1xufVxuXG5mdW5jdGlvbiBjb252ZXJ0QXJncyhjb252ZXJ0ZXIsIGJvdW5kLCB0YWdFbHNlKSB7IC8vIHRhZy5jdnRBcmdzKClcblx0dmFyIGwsIGtleSwgYm91bmRBcmdzLCBhcmdzLCBiaW5kVG8sIHRhZyxcblx0XHR0YWdDdHggPSB0aGlzO1xuXG5cdGlmICh0YWdDdHgudGFnTmFtZSkge1xuXHRcdHRhZyA9IHRhZ0N0eDtcblx0XHR0YWdDdHggPSB0YWcudGFnQ3R4cyA/IHRhZy50YWdDdHhzW3RhZ0Vsc2UgfHwgMF0gOiB0YWcudGFnQ3R4O1xuXHR9IGVsc2Uge1xuXHRcdHRhZyA9IHRhZ0N0eC50YWc7XG5cdFx0dGFnRWxzZSA9IHRhZ0N0eC5pbmRleDtcblx0fVxuXG5cdGJpbmRUbyA9IHRhZy5iaW5kVG87XG5cdGFyZ3MgPSB0YWdDdHguYXJncztcblxuXHRjb252ZXJ0ZXIgPSBjb252ZXJ0ZXIgfHwgdGFnLmNvbnZlcnQ7XG5cdGlmIChcIlwiICsgY29udmVydGVyID09PSBjb252ZXJ0ZXIpIHtcblx0XHRjb252ZXJ0ZXIgPSB0YWdDdHgudmlldy5nZXRSc2MoXCJjb252ZXJ0ZXJzXCIsIGNvbnZlcnRlcikgfHwgZXJyb3IoXCJVbmtub3duIGNvbnZlcnRlcjogJ1wiICsgY29udmVydGVyICsgXCInXCIpO1xuXHR9XG5cblx0aWYgKCFhcmdzLmxlbmd0aCAmJiB0YWcuYXJnRGVmYXVsdCAhPT0gZmFsc2UgJiYgIXRhZ0N0eC5pbmRleCkge1xuXHRcdGFyZ3MgPSBbdGFnQ3R4LnZpZXcuZGF0YV07IC8vIE1pc3NpbmcgZmlyc3QgYXJnIGRlZmF1bHRzIHRvIHRoZSBjdXJyZW50IGRhdGEgY29udGV4dFxuXHR9IGVsc2UgaWYgKGNvbnZlcnRlciAmJiAhYm91bmQpIHsgLy8gSWYgdGhlcmUgaXMgYSBjb252ZXJ0ZXIsIHVzZSBhIGNvcHkgb2YgdGhlIHRhZ0N0eC5hcmdzIGFycmF5IGZvciByZW5kZXJpbmcsIGFuZCByZXBsYWNlIHRoZSBhcmdzWzBdIGluXG5cdFx0YXJncyA9IGFyZ3Muc2xpY2UoKTsgLy8gdGhlIGNvcGllZCBhcnJheSB3aXRoIHRoZSBjb252ZXJ0ZWQgdmFsdWUuIEJ1dCB3ZSBkbyBub3QgbW9kaWZ5IHRoZSB2YWx1ZSBvZiB0YWcudGFnQ3R4LmFyZ3NbMF0gKHRoZSBvcmlnaW5hbCBhcmdzIGFycmF5KVxuXHR9XG5cblx0aWYgKGJpbmRUbykgeyAvLyBHZXQgdGhlIHZhbHVlcyBvZiB0aGUgYm91bmRBcmdzXG5cdFx0Ym91bmRBcmdzID0gW107XG5cdFx0bCA9IGJpbmRUby5sZW5ndGg7XG5cdFx0d2hpbGUgKGwtLSkge1xuXHRcdFx0a2V5ID0gYmluZFRvW2xdO1xuXHRcdFx0Ym91bmRBcmdzLnVuc2hpZnQoYXJnT3JQcm9wKHRhZ0N0eCwga2V5KSk7XG5cdFx0fVxuXHRcdGlmIChib3VuZCkge1xuXHRcdFx0YXJncyA9IGJvdW5kQXJnczsgLy8gQ2FsbCB0byBjb252ZXJ0Qm91bmRBcmdzKCkgLSByZXR1cm5zIHRoZSBib3VuZEFyZ3Ncblx0XHR9XG5cdH1cblxuXHRpZiAoY29udmVydGVyKSB7XG5cdFx0YmluZFRvID0gYmluZFRvIHx8IFswXTtcblx0XHRjb252ZXJ0ZXIgPSBjb252ZXJ0ZXIuYXBwbHkodGFnLCBib3VuZEFyZ3MgfHwgYXJncyk7XG5cdFx0bCA9IGJpbmRUby5sZW5ndGg7XG5cdFx0Y29udmVydGVyID0gbCA8IDIgPyBbY29udmVydGVyXSA6IGNvbnZlcnRlciB8fCBbXTtcblx0XHRpZiAoYm91bmQpIHsgICAgICAgIC8vIENhbGwgdG8gYm5kQXJncyBjb252ZXJ0Qm91bmRBcmdzKCkgLSBzbyBhcHBseSBjb252ZXJ0ZXIgdG8gYWxsIGJvdW5kQXJnc1xuXHRcdFx0YXJncyA9IGNvbnZlcnRlcjsgLy8gVGhlIGFycmF5IG9mIHZhbHVlcyByZXR1cm5lZCBmcm9tIHRoZSBjb252ZXJ0ZXJcblx0XHR9IGVsc2UgeyAgICAgICAgICAgIC8vIENhbGwgdG8gY3Z0QXJncygpXG5cdFx0XHR3aGlsZSAobC0tKSB7XG5cdFx0XHRcdGtleSA9IGJpbmRUb1tsXTtcblx0XHRcdFx0aWYgKCtrZXkgPT09IGtleSkge1xuXHRcdFx0XHRcdGFyZ3Nba2V5XSA9IGNvbnZlcnRlciA/IGNvbnZlcnRlcltsXSA6IHVuZGVmaW5lZDtcblx0XHRcdFx0fVxuXHRcdFx0fVxuXHRcdH1cblx0fVxuXHRyZXR1cm4gYXJncztcbn1cblxuZnVuY3Rpb24gYXJnT3JQcm9wKGNvbnRleHQsIGtleSkge1xuXHRjb250ZXh0ID0gY29udGV4dFsra2V5ID09PSBrZXkgPyBcImFyZ3NcIiA6IFwicHJvcHNcIl07XG5cdHJldHVybiBjb250ZXh0ICYmIGNvbnRleHRba2V5XTtcbn1cblxuZnVuY3Rpb24gY29udmVydEJvdW5kQXJncyh0YWdFbHNlKSB7IC8vIHRhZy5ibmRBcmdzKClcblx0cmV0dXJuIHRoaXMuY3Z0QXJncyh1bmRlZmluZWQsIHRydWUsIHRhZ0Vsc2UpO1xufVxuXG4vLz09PT09PT09PT09PT1cbi8vIHZpZXdzLl90YWdcbi8vPT09PT09PT09PT09PVxuXG5mdW5jdGlvbiBnZXRSZXNvdXJjZShyZXNvdXJjZVR5cGUsIGl0ZW1OYW1lKSB7XG5cdHZhciByZXMsIHN0b3JlLFxuXHRcdHZpZXcgPSB0aGlzO1xuXHR3aGlsZSAoKHJlcyA9PT0gdW5kZWZpbmVkKSAmJiB2aWV3KSB7XG5cdFx0c3RvcmUgPSB2aWV3LnRtcGwgJiYgdmlldy50bXBsW3Jlc291cmNlVHlwZV07XG5cdFx0cmVzID0gc3RvcmUgJiYgc3RvcmVbaXRlbU5hbWVdO1xuXHRcdHZpZXcgPSB2aWV3LnBhcmVudDtcblx0fVxuXHRyZXR1cm4gcmVzIHx8ICR2aWV3c1tyZXNvdXJjZVR5cGVdW2l0ZW1OYW1lXTtcbn1cblxuZnVuY3Rpb24gcmVuZGVyVGFnKHRhZ05hbWUsIHBhcmVudFZpZXcsIHRtcGwsIHRhZ0N0eHMsIGlzVXBkYXRlLCBvbkVycm9yKSB7XG5cdHBhcmVudFZpZXcgPSBwYXJlbnRWaWV3IHx8IHRvcFZpZXc7XG5cdHZhciB0YWcsIHRhZ18sIHRhZ0RlZiwgdGVtcGxhdGUsIHRhZ3MsIGF0dHIsIHBhcmVudFRhZywgbCwgbSwgbiwgaXRlbVJldCwgdGFnQ3R4LCB0YWdDdHhDdHgsIGN0eFBybSwgYmluZFRvLFxuXHRcdGNvbnRlbnQsIGNhbGxJbml0LCBtYXBEZWYsIHRoaXNNYXAsIGFyZ3MsIHByb3BzLCB0YWdEYXRhTWFwLCBjb250ZW50Q3R4LCBrZXksXG5cdFx0aSA9IDAsXG5cdFx0cmV0ID0gXCJcIixcblx0XHRsaW5rQ3R4ID0gcGFyZW50Vmlldy5saW5rQ3R4IHx8IDAsXG5cdFx0Y3R4ID0gcGFyZW50Vmlldy5jdHgsXG5cdFx0cGFyZW50VG1wbCA9IHRtcGwgfHwgcGFyZW50Vmlldy50bXBsLFxuXHRcdC8vIElmIHRhZ0N0eHMgaXMgYW4gaW50ZWdlciwgdGhlbiBpdCBpcyB0aGUga2V5IGZvciB0aGUgY29tcGlsZWQgZnVuY3Rpb24gdG8gcmV0dXJuIHRoZSBib3VuZFRhZyB0YWdDdHhzXG5cdFx0Ym91bmRUYWcgPSB0eXBlb2YgdGFnQ3R4cyA9PT0gXCJudW1iZXJcIiAmJiBwYXJlbnRWaWV3LnRtcGwuYm5kc1t0YWdDdHhzLTFdO1xuXG5cdGlmICh0YWdOYW1lLl9pcyA9PT0gXCJ0YWdcIikge1xuXHRcdHRhZyA9IHRhZ05hbWU7XG5cdFx0dGFnTmFtZSA9IHRhZy50YWdOYW1lO1xuXHRcdHRhZ0N0eHMgPSB0YWcudGFnQ3R4cztcblx0XHR0ZW1wbGF0ZSA9IHRhZy50ZW1wbGF0ZTtcblx0fSBlbHNlIHtcblx0XHR0YWdEZWYgPSBwYXJlbnRWaWV3LmdldFJzYyhcInRhZ3NcIiwgdGFnTmFtZSkgfHwgZXJyb3IoXCJVbmtub3duIHRhZzoge3tcIiArIHRhZ05hbWUgKyBcIn19IFwiKTtcblx0XHR0ZW1wbGF0ZSA9IHRhZ0RlZi50ZW1wbGF0ZTtcblx0fVxuXG5cdGlmIChvbkVycm9yID09PSB1bmRlZmluZWQgJiYgYm91bmRUYWcgJiYgYm91bmRUYWcuX2xyKSB7XG5cdFx0b25FcnJvciA9IFwiXCI7XG5cdH1cblx0aWYgKG9uRXJyb3IgIT09IHVuZGVmaW5lZCkge1xuXHRcdHJldCArPSBvbkVycm9yO1xuXHRcdHRhZ0N0eHMgPSBvbkVycm9yID0gW3twcm9wczoge30sIGFyZ3M6IFtdfV07XG5cdH0gZWxzZSBpZiAoYm91bmRUYWcpIHtcblx0XHR0YWdDdHhzID0gYm91bmRUYWcocGFyZW50Vmlldy5kYXRhLCBwYXJlbnRWaWV3LCAkc3ViKTtcblx0fVxuXG5cdGwgPSB0YWdDdHhzLmxlbmd0aDtcblx0Zm9yICg7IGkgPCBsOyBpKyspIHtcblx0XHR0YWdDdHggPSB0YWdDdHhzW2ldO1xuXHRcdGlmICghbGlua0N0eCB8fCAhbGlua0N0eC50YWcgfHwgaSAmJiAhbGlua0N0eC50YWcuXy5pbmxpbmUgfHwgdGFnLl9lcikge1xuXHRcdFx0Ly8gSW5pdGlhbGl6ZSB0YWdDdHhcblx0XHRcdC8vIEZvciBibG9jayB0YWdzLCB0YWdDdHgudG1wbCBpcyBhbiBpbnRlZ2VyID4gMFxuXHRcdFx0aWYgKGNvbnRlbnQgPSBwYXJlbnRUbXBsLnRtcGxzICYmIHRhZ0N0eC50bXBsKSB7XG5cdFx0XHRcdGNvbnRlbnQgPSB0YWdDdHguY29udGVudCA9IHBhcmVudFRtcGwudG1wbHNbY29udGVudCAtIDFdO1xuXHRcdFx0fVxuXHRcdFx0dGFnQ3R4LmluZGV4ID0gaTtcblx0XHRcdHRhZ0N0eC50bXBsID0gY29udGVudDsgLy8gU2V0IHRoZSB0bXBsIHByb3BlcnR5IHRvIHRoZSBjb250ZW50IG9mIHRoZSBibG9jayB0YWdcblx0XHRcdHRhZ0N0eC5yZW5kZXIgPSByZW5kZXJDb250ZW50O1xuXHRcdFx0dGFnQ3R4LnZpZXcgPSBwYXJlbnRWaWV3O1xuXHRcdFx0dGFnQ3R4LmN0eCA9IGV4dGVuZEN0eCh0YWdDdHguY3R4LCBjdHgpOyAvLyBDbG9uZSBhbmQgZXh0ZW5kIHBhcmVudFZpZXcuY3R4XG5cdFx0fVxuXHRcdGlmICh0bXBsID0gdGFnQ3R4LnByb3BzLnRtcGwpIHtcblx0XHRcdC8vIElmIHRoZSB0bXBsIHByb3BlcnR5IGlzIG92ZXJyaWRkZW4sIHNldCB0aGUgdmFsdWUgKHdoZW4gaW5pdGlhbGl6aW5nLCBvciwgaW4gY2FzZSBvZiBiaW5kaW5nOiBedG1wbD0uLi4sIHdoZW4gdXBkYXRpbmcpXG5cdFx0XHR0YWdDdHgudG1wbCA9IHBhcmVudFZpZXcuZ2V0VG1wbCh0bXBsKTtcblx0XHR9XG5cblx0XHRpZiAoIXRhZykge1xuXHRcdFx0Ly8gVGhpcyB3aWxsIG9ubHkgYmUgaGl0IGZvciBpbml0aWFsIHRhZ0N0eCAobm90IGZvciB7e2Vsc2V9fSkgLSBpZiB0aGUgdGFnIGluc3RhbmNlIGRvZXMgbm90IGV4aXN0IHlldFxuXHRcdFx0Ly8gSWYgdGhlIHRhZyBoYXMgbm90IGFscmVhZHkgYmVlbiBpbnN0YW50aWF0ZWQsIHdlIHdpbGwgY3JlYXRlIGEgbmV3IGluc3RhbmNlLlxuXHRcdFx0Ly8gfnRhZyB3aWxsIGFjY2VzcyB0aGUgdGFnLCBldmVuIHdpdGhpbiB0aGUgcmVuZGVyaW5nIG9mIHRoZSB0ZW1wbGF0ZSBjb250ZW50IG9mIHRoaXMgdGFnLlxuXHRcdFx0Ly8gRnJvbSBjaGlsZC9kZXNjZW5kYW50IHRhZ3MsIGNhbiBhY2Nlc3MgdXNpbmcgfnRhZy5wYXJlbnQsIG9yIH5wYXJlbnRUYWdzLnRhZ05hbWVcblx0XHRcdHRhZyA9IG5ldyB0YWdEZWYuX2N0cigpO1xuXHRcdFx0Y2FsbEluaXQgPSAhIXRhZy5pbml0O1xuXG5cdFx0XHR0YWcucGFyZW50ID0gcGFyZW50VGFnID0gY3R4ICYmIGN0eC50YWc7XG5cdFx0XHR0YWcudGFnQ3R4cyA9IHRhZ0N0eHM7XG5cdFx0XHR0YWdEYXRhTWFwID0gdGFnLmRhdGFNYXA7XG5cblx0XHRcdGlmIChsaW5rQ3R4KSB7XG5cdFx0XHRcdHRhZy5fLmlubGluZSA9IGZhbHNlO1xuXHRcdFx0XHRsaW5rQ3R4LnRhZyA9IHRhZztcblx0XHRcdFx0dGFnLmxpbmtDdHggPSBsaW5rQ3R4O1xuXHRcdFx0fVxuXHRcdFx0aWYgKHRhZy5fLmJuZCA9IGJvdW5kVGFnIHx8IGxpbmtDdHguZm4pIHtcblx0XHRcdFx0Ly8gQm91bmQgaWYge157dGFnLi4ufX0gb3IgZGF0YS1saW5rPVwie3RhZy4uLn1cIlxuXHRcdFx0XHR0YWcuXy5hcnJWd3MgPSB7fTtcblx0XHRcdH0gZWxzZSBpZiAodGFnLmRhdGFCb3VuZE9ubHkpIHtcblx0XHRcdFx0ZXJyb3IodGFnTmFtZSArIFwiIG11c3QgYmUgZGF0YS1ib3VuZDpcXG57XntcIiArIHRhZ05hbWUgKyBcIn19XCIpO1xuXHRcdFx0fVxuXHRcdFx0Ly9UT0RPIGJldHRlciBwZXJmIGZvciBjaGlsZFRhZ3MoKSAtIGtlZXAgY2hpbGQgdGFnLnRhZ3MgYXJyYXksIChhbmQgcmVtb3ZlIGNoaWxkLCB3aGVuIGRpc3Bvc2VkKVxuXHRcdFx0Ly8gdGFnLnRhZ3MgPSBbXTtcblx0XHR9XG5cdFx0YmluZFRvID0gdGFnLmJpbmRUbyB8fCBbMF07XG5cdFx0dGFnQ3R4cyA9IHRhZy50YWdDdHhzO1xuXHRcdHRhZ0RhdGFNYXAgPSB0YWcuZGF0YU1hcDtcblxuXHRcdHRhZ0N0eC50YWcgPSB0YWc7XG5cdFx0aWYgKHRhZ0RhdGFNYXAgJiYgdGFnQ3R4cykge1xuXHRcdFx0dGFnQ3R4Lm1hcCA9IHRhZ0N0eHNbaV0ubWFwOyAvLyBDb3B5IG92ZXIgdGhlIGNvbXBpbGVkIG1hcCBpbnN0YW5jZSBmcm9tIHRoZSBwcmV2aW91cyB0YWdDdHhzIHRvIHRoZSByZWZyZXNoZWQgb25lc1xuXHRcdH1cblx0XHRpZiAoIXRhZy5mbG93KSB7XG5cdFx0XHR0YWdDdHhDdHggPSB0YWdDdHguY3R4ID0gdGFnQ3R4LmN0eCB8fCB7fTtcblxuXHRcdFx0Ly8gdGFncyBoYXNoOiB0YWcuY3R4LnRhZ3MsIG1lcmdlZCB3aXRoIHBhcmVudFZpZXcuY3R4LnRhZ3MsXG5cdFx0XHR0YWdzID0gdGFnLnBhcmVudHMgPSB0YWdDdHhDdHgucGFyZW50VGFncyA9IGN0eCAmJiBleHRlbmRDdHgodGFnQ3R4Q3R4LnBhcmVudFRhZ3MsIGN0eC5wYXJlbnRUYWdzKSB8fCB7fTtcblx0XHRcdGlmIChwYXJlbnRUYWcpIHtcblx0XHRcdFx0dGFnc1twYXJlbnRUYWcudGFnTmFtZV0gPSBwYXJlbnRUYWc7XG5cdFx0XHRcdC8vVE9ETyBiZXR0ZXIgcGVyZiBmb3IgY2hpbGRUYWdzOiBwYXJlbnRUYWcudGFncy5wdXNoKHRhZyk7XG5cdFx0XHR9XG5cdFx0XHR0YWdzW3RhZy50YWdOYW1lXSA9IHRhZ0N0eEN0eC50YWcgPSB0YWc7XG5cdFx0fVxuXHR9XG5cdGlmICghKHRhZy5fZXIgPSBvbkVycm9yKSkge1xuXHRcdHRhZ0hhbmRsZXJzRnJvbVByb3BzKHRhZywgdGFnQ3R4c1swXSk7XG5cdFx0dGFnLnJlbmRlcmluZyA9IHt9OyAvLyBQcm92aWRlIG9iamVjdCBmb3Igc3RhdGUgZHVyaW5nIHJlbmRlciBjYWxscyB0byB0YWcgYW5kIGVsc2VzLiAoVXNlZCBieSB7e2lmfX0gYW5kIHt7Zm9yfX0uLi4pXG5cdFx0Zm9yIChpID0gMDsgaSA8IGw7IGkrKykgeyAvLyBJdGVyYXRlIHRhZ0N0eCBmb3IgZWFjaCB7e2Vsc2V9fSBibG9ja1xuXHRcdFx0dGFnQ3R4ID0gdGFnLnRhZ0N0eCA9IHRhZ0N0eHNbaV07XG5cdFx0XHRwcm9wcyA9IHRhZ0N0eC5wcm9wcztcblx0XHRcdHRhZy5jdHggPSB0YWdDdHguY3R4O1xuXG5cdFx0XHRpZiAoIWkpIHtcblx0XHRcdFx0aWYgKGNhbGxJbml0KSB7XG5cdFx0XHRcdFx0dGFnLmluaXQodGFnQ3R4LCBsaW5rQ3R4LCB0YWcuY3R4KTtcblx0XHRcdFx0XHRjYWxsSW5pdCA9IHVuZGVmaW5lZDtcblx0XHRcdFx0fVxuXHRcdFx0XHRpZiAobGlua0N0eCkge1xuXHRcdFx0XHRcdC8vIFNldCBhdHRyIG9uIGxpbmtDdHggdG8gZW5zdXJlIG91dHB1dHRpbmcgdG8gdGhlIGNvcnJlY3QgdGFyZ2V0IGF0dHJpYnV0ZS5cblx0XHRcdFx0XHQvLyBTZXR0aW5nIGVpdGhlciBsaW5rQ3R4LmF0dHIgb3IgdGhpcy5hdHRyIGluIHRoZSBpbml0KCkgYWxsb3dzIHBlci1pbnN0YW5jZSBjaG9pY2Ugb2YgdGFyZ2V0IGF0dHJpYi5cblx0XHRcdFx0XHRsaW5rQ3R4LmF0dHIgPSB0YWcuYXR0ciA9IGxpbmtDdHguYXR0ciB8fCB0YWcuYXR0cjtcblx0XHRcdFx0fVxuXHRcdFx0XHRhdHRyID0gdGFnLmF0dHI7XG5cdFx0XHRcdHRhZy5fLm5vVndzID0gYXR0ciAmJiBhdHRyICE9PSBIVE1MO1xuXHRcdFx0fVxuXHRcdFx0YXJncyA9IHRhZy5jdnRBcmdzKHVuZGVmaW5lZCwgdW5kZWZpbmVkLCBpKTtcblx0XHRcdGlmICh0YWcubGlua2VkQ3R4UGFyYW0pIHtcblx0XHRcdFx0bSA9IGJpbmRUby5sZW5ndGg7XG5cdFx0XHRcdHdoaWxlIChtLS0pIHtcblx0XHRcdFx0XHRpZiAoY3R4UHJtID0gdGFnLmxpbmtlZEN0eFBhcmFtW21dKSB7XG5cdFx0XHRcdFx0XHRrZXkgPSBiaW5kVG9bbV07XG5cdFx0XHRcdFx0XHQvLyBDcmVhdGUgdGFnIGNvbnRleHR1YWwgcGFyYW1ldGVyXG5cdFx0XHRcdFx0XHR0YWdDdHguY3R4W2N0eFBybV0gPSAkc3ViLl9jcChhcmdPclByb3AodGFnQ3R4LCBrZXkpLCBhcmdPclByb3AodGFnQ3R4LnBhcmFtcywga2V5KSwgdGFnQ3R4LnZpZXcsIHRhZy5fLmJuZCAmJiB7dGFnOiB0YWcsIGluZDogbSwgdGFnRWxzZTogaX0pO1xuXHRcdFx0XHRcdH1cblx0XHRcdFx0fVxuXHRcdFx0fVxuXHRcdFx0aWYgKG1hcERlZiA9IHByb3BzLmRhdGFNYXAgfHwgdGFnRGF0YU1hcCkge1xuXHRcdFx0XHRpZiAoYXJncy5sZW5ndGggfHwgcHJvcHMuZGF0YU1hcCkge1xuXHRcdFx0XHRcdHRoaXNNYXAgPSB0YWdDdHgubWFwO1xuXHRcdFx0XHRcdGlmICghdGhpc01hcCB8fCB0aGlzTWFwLnNyYyAhPT0gYXJnc1swXSB8fCBpc1VwZGF0ZSkge1xuXHRcdFx0XHRcdFx0aWYgKHRoaXNNYXAgJiYgdGhpc01hcC5zcmMpIHtcblx0XHRcdFx0XHRcdFx0dGhpc01hcC51bm1hcCgpOyAvLyBvbmx5IGNhbGxlZCBpZiBvYnNlcnZhYmxlIG1hcCAtIG5vdCB3aGVuIG9ubHkgdXNlZCBpbiBKc1JlbmRlciwgZS5nLiBieSB7e3Byb3BzfX1cblx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHRcdHRoaXNNYXAgPSB0YWdDdHgubWFwID0gbWFwRGVmLm1hcChhcmdzWzBdLCBwcm9wcywgdW5kZWZpbmVkLCAhdGFnLl8uYm5kKTtcblx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0YXJncyA9IFt0aGlzTWFwLnRndF07XG5cdFx0XHRcdH1cblx0XHRcdH1cblxuXHRcdFx0aXRlbVJldCA9IHVuZGVmaW5lZDtcblx0XHRcdGlmICh0YWcucmVuZGVyKSB7XG5cdFx0XHRcdGl0ZW1SZXQgPSB0YWcucmVuZGVyLmFwcGx5KHRhZywgYXJncyk7XG5cdFx0XHRcdGlmIChwYXJlbnRWaWV3LmxpbmtlZCAmJiBpdGVtUmV0ICYmICFyV3JhcHBlZEluVmlld01hcmtlci50ZXN0KGl0ZW1SZXQpKSB7XG5cdFx0XHRcdFx0Ly8gV2hlbiBhIHRhZyByZW5kZXJzIGNvbnRlbnQgZnJvbSB0aGUgcmVuZGVyIG1ldGhvZCwgd2l0aCBkYXRhIGxpbmtpbmcgdGhlbiB3ZSBuZWVkIHRvIHdyYXAgd2l0aCB2aWV3IG1hcmtlcnMsIGlmIGFic2VudCxcblx0XHRcdFx0XHQvLyB0byBwcm92aWRlIGEgY29udGVudFZpZXcgZm9yIHRoZSB0YWcsIHdoaWNoIHdpbGwgY29ycmVjdGx5IGRpc3Bvc2UgYmluZGluZ3MgaWYgZGVsZXRlZC4gVGhlICd0bXBsJyBmb3IgdGhpcyB2aWV3IHdpbGxcblx0XHRcdFx0XHQvLyBiZSBhIGR1bWJlZCBkb3duIHRlbXBsYXRlIHdoaWNoIHdpbGwgYWx3YXlzIHJldHVybiB0aGUgIGl0ZW1SZXQgc3RyaW5nIChubyBtYXR0ZXIgd2hhdCB0aGUgZGF0YSBpcykuIFRoZSBpdGVtUmV0IHN0cmluZ1xuXHRcdFx0XHRcdC8vIGlzIG5vdCBjb21waWxlZCBhcyB0ZW1wbGF0ZSBtYXJrdXAsIHNvIGNhbiBpbmNsdWRlIFwie3tcIiBvciBcIn19XCIgd2l0aG91dCB0cmlnZ2VyaW5nIHN5bnRheCBlcnJvcnNcblx0XHRcdFx0XHR0bXBsID0geyAvLyAnRHVtYmVkIGRvd24nIHRlbXBsYXRlIHdoaWNoIGFsd2F5cyByZW5kZXJzICdzdGF0aWMnIGl0ZW1SZXQgc3RyaW5nXG5cdFx0XHRcdFx0XHRsaW5rczogW11cblx0XHRcdFx0XHR9O1xuXHRcdFx0XHRcdHRtcGwucmVuZGVyID0gdG1wbC5mbiA9IGZ1bmN0aW9uKCkge1xuXHRcdFx0XHRcdFx0cmV0dXJuIGl0ZW1SZXQ7XG5cdFx0XHRcdFx0fTtcblx0XHRcdFx0XHRpdGVtUmV0ID0gcmVuZGVyV2l0aFZpZXdzKHRtcGwsIHBhcmVudFZpZXcuZGF0YSwgdW5kZWZpbmVkLCB0cnVlLCBwYXJlbnRWaWV3LCB1bmRlZmluZWQsIHVuZGVmaW5lZCwgdGFnKTtcblx0XHRcdFx0fVxuXHRcdFx0fVxuXHRcdFx0aWYgKCFhcmdzLmxlbmd0aCkge1xuXHRcdFx0XHRhcmdzID0gW3BhcmVudFZpZXddOyAvLyBubyBhcmd1bWVudHMgLSAoZS5nLiB7e2Vsc2V9fSkgZ2V0IGRhdGEgY29udGV4dCBmcm9tIHZpZXcuXG5cdFx0XHR9XG5cdFx0XHRpZiAoaXRlbVJldCA9PT0gdW5kZWZpbmVkKSB7XG5cdFx0XHRcdGNvbnRlbnRDdHggPSBhcmdzWzBdOyAvLyBEZWZhdWx0IGRhdGEgY29udGV4dCBmb3Igd3JhcHBlZCBibG9jayBjb250ZW50IGlzIHRoZSBmaXJzdCBhcmd1bWVudFxuXHRcdFx0XHRpZiAodGFnLmNvbnRlbnRDdHgpIHsgLy8gU2V0IHRhZy5jb250ZW50Q3R4IHRvIHRydWUsIHRvIGluaGVyaXQgcGFyZW50IGNvbnRleHQsIG9yIHRvIGEgZnVuY3Rpb24gdG8gcHJvdmlkZSBhbHRlcm5hdGUgY29udGV4dC5cblx0XHRcdFx0XHRjb250ZW50Q3R4ID0gdGFnLmNvbnRlbnRDdHggPT09IHRydWUgPyBwYXJlbnRWaWV3IDogdGFnLmNvbnRlbnRDdHgoY29udGVudEN0eCk7XG5cdFx0XHRcdH1cblx0XHRcdFx0aXRlbVJldCA9IHRhZ0N0eC5yZW5kZXIoY29udGVudEN0eCwgdHJ1ZSkgfHwgKGlzVXBkYXRlID8gdW5kZWZpbmVkIDogXCJcIik7XG5cdFx0XHR9XG5cdFx0XHQvLyBObyByZXR1cm4gdmFsdWUgZnJvbSByZW5kZXIsIGFuZCBubyB0ZW1wbGF0ZS9jb250ZW50IHRhZ0N0eC5yZW5kZXIoLi4uKSwgc28gcmV0dXJuIHVuZGVmaW5lZFxuXHRcdFx0cmV0ID0gcmV0ID8gcmV0ICsgKGl0ZW1SZXQgfHwgXCJcIikgOiBpdGVtUmV0OyAvLyBJZiBubyByZW5kZXJlZCBjb250ZW50LCB0aGlzIHdpbGwgYmUgdW5kZWZpbmVkXG5cdFx0fVxuXHRcdHRhZy5yZW5kZXJpbmcgPSB1bmRlZmluZWQ7XG5cdH1cblx0dGFnLnRhZ0N0eCA9IHRhZ0N0eHNbMF07XG5cdHRhZy5jdHggPSB0YWcudGFnQ3R4LmN0eDtcblxuXHRpZiAodGFnLl8ubm9Wd3MpIHtcblx0XHRcdGlmICh0YWcuXy5pbmxpbmUpIHtcblx0XHRcdC8vIGlubGluZSB0YWcgd2l0aCBhdHRyIHNldCB0byBcInRleHRcIiB3aWxsIGluc2VydCBIVE1MLWVuY29kZWQgY29udGVudCAtIGFzIGlmIGl0IHdhcyBlbGVtZW50LWJhc2VkIGlubmVyVGV4dFxuXHRcdFx0cmV0ID0gYXR0ciA9PT0gXCJ0ZXh0XCJcblx0XHRcdFx0PyAkY29udmVydGVycy5odG1sKHJldClcblx0XHRcdFx0OiBcIlwiO1xuXHRcdH1cblx0fVxuXHRyZXR1cm4gYm91bmRUYWcgJiYgcGFyZW50Vmlldy5fLm9uUmVuZGVyXG5cdFx0Ly8gQ2FsbCBvblJlbmRlciAodXNlZCBieSBKc1ZpZXdzIGlmIHByZXNlbnQsIHRvIGFkZCBiaW5kaW5nIGFubm90YXRpb25zIGFyb3VuZCByZW5kZXJlZCBjb250ZW50KVxuXHRcdD8gcGFyZW50Vmlldy5fLm9uUmVuZGVyKHJldCwgcGFyZW50VmlldywgdGFnKVxuXHRcdDogcmV0O1xufVxuXG4vLz09PT09PT09PT09PT09PT09XG4vLyBWaWV3IGNvbnN0cnVjdG9yXG4vLz09PT09PT09PT09PT09PT09XG5cbmZ1bmN0aW9uIFZpZXcoY29udGV4dCwgdHlwZSwgcGFyZW50VmlldywgZGF0YSwgdGVtcGxhdGUsIGtleSwgb25SZW5kZXIsIGNvbnRlbnRUbXBsKSB7XG5cdC8vIENvbnN0cnVjdG9yIGZvciB2aWV3IG9iamVjdCBpbiB2aWV3IGhpZXJhcmNoeS4gKEF1Z21lbnRlZCBieSBKc1ZpZXdzIGlmIEpzVmlld3MgaXMgbG9hZGVkKVxuXHR2YXIgdmlld3MsIHBhcmVudFZpZXdfLCB0YWcsIHNlbGZfLFxuXHRcdHNlbGYgPSB0aGlzLFxuXHRcdGlzQXJyYXkgPSB0eXBlID09PSBcImFycmF5XCI7XG5cblx0c2VsZi5jb250ZW50ID0gY29udGVudFRtcGw7XG5cdHNlbGYudmlld3MgPSBpc0FycmF5ID8gW10gOiB7fTtcblx0c2VsZi5wYXJlbnQgPSBwYXJlbnRWaWV3O1xuXHRzZWxmLnR5cGUgPSB0eXBlIHx8IFwidG9wXCI7XG5cdHNlbGYucm9vdCA9IHBhcmVudFZpZXcgJiYgcGFyZW50Vmlldy5yb290IHx8IHR5cGUgJiYgc2VsZjsgLy8gdmlldyB3aG9zZSBwYXJlbnQgaXMgdG9wIHZpZXdcblx0c2VsZi5kYXRhID0gZGF0YTtcblx0c2VsZi50bXBsID0gdGVtcGxhdGU7XG5cdC8vIElmIHRoZSBkYXRhIGlzIGFuIGFycmF5LCB0aGlzIGlzIGFuICdhcnJheSB2aWV3JyB3aXRoIGEgdmlld3MgYXJyYXkgZm9yIGVhY2ggY2hpbGQgJ2l0ZW0gdmlldydcblx0Ly8gSWYgdGhlIGRhdGEgaXMgbm90IGFuIGFycmF5LCB0aGlzIGlzIGFuICdpdGVtIHZpZXcnIHdpdGggYSB2aWV3cyAnaGFzaCcgb2JqZWN0IGZvciBhbnkgY2hpbGQgbmVzdGVkIHZpZXdzXG5cdC8vIC5fLnVzZUtleSBpcyBub24gemVybyBpZiBpcyBub3QgYW4gJ2FycmF5IHZpZXcnIChvd25pbmcgYSBkYXRhIGFycmF5KS4gVXNlIHRoaXMgYXMgbmV4dCBrZXkgZm9yIGFkZGluZyB0byBjaGlsZCB2aWV3cyBoYXNoXG5cdHNlbGZfID0gc2VsZi5fID0ge1xuXHRcdGtleTogMCxcblx0XHR1c2VLZXk6IGlzQXJyYXkgPyAwIDogMSxcblx0XHRpZDogXCJcIiArIHZpZXdJZCsrLFxuXHRcdG9uUmVuZGVyOiBvblJlbmRlcixcblx0XHRibmRzOiB7fVxuXHR9O1xuXHRzZWxmLmxpbmtlZCA9ICEhb25SZW5kZXI7XG5cdGlmIChwYXJlbnRWaWV3KSB7XG5cdFx0dmlld3MgPSBwYXJlbnRWaWV3LnZpZXdzO1xuXHRcdHBhcmVudFZpZXdfID0gcGFyZW50Vmlldy5fO1xuXHRcdGlmIChwYXJlbnRWaWV3Xy51c2VLZXkpIHtcblx0XHRcdC8vIFBhcmVudCBpcyBub3QgYW4gJ2FycmF5IHZpZXcnLiBBZGQgdGhpcyB2aWV3IHRvIGl0cyB2aWV3cyBvYmplY3Rcblx0XHRcdC8vIHNlbGYuX2tleSA9IGlzIHRoZSBrZXkgaW4gdGhlIHBhcmVudCB2aWV3IGhhc2hcblx0XHRcdHZpZXdzW3NlbGZfLmtleSA9IFwiX1wiICsgcGFyZW50Vmlld18udXNlS2V5KytdID0gc2VsZjtcblx0XHRcdHNlbGYuaW5kZXggPSBpbmRleFN0cjtcblx0XHRcdHNlbGYuZ2V0SW5kZXggPSBnZXROZXN0ZWRJbmRleDtcblx0XHR9IGVsc2UgaWYgKHZpZXdzLmxlbmd0aCA9PT0gKHNlbGZfLmtleSA9IHNlbGYuaW5kZXggPSBrZXkpKSB7IC8vIFBhcmVudCBpcyBhbiAnYXJyYXkgdmlldycuIEFkZCB0aGlzIHZpZXcgdG8gaXRzIHZpZXdzIGFycmF5XG5cdFx0XHR2aWV3cy5wdXNoKHNlbGYpOyAvLyBBZGRpbmcgdG8gZW5kIG9mIHZpZXdzIGFycmF5LiAoVXNpbmcgcHVzaCB3aGVuIHBvc3NpYmxlIC0gYmV0dGVyIHBlcmYgdGhhbiBzcGxpY2UpXG5cdFx0fSBlbHNlIHtcblx0XHRcdHZpZXdzLnNwbGljZShrZXksIDAsIHNlbGYpOyAvLyBJbnNlcnRpbmcgaW4gdmlld3MgYXJyYXlcblx0XHR9XG5cdFx0Ly8gSWYgbm8gY29udGV4dCB3YXMgcGFzc2VkIGluLCB1c2UgcGFyZW50IGNvbnRleHRcblx0XHQvLyBJZiBjb250ZXh0IHdhcyBwYXNzZWQgaW4sIGl0IHNob3VsZCBoYXZlIGJlZW4gbWVyZ2VkIGFscmVhZHkgd2l0aCBwYXJlbnQgY29udGV4dFxuXHRcdHNlbGYuY3R4ID0gY29udGV4dCB8fCBwYXJlbnRWaWV3LmN0eDtcblx0fSBlbHNlIHtcblx0XHRzZWxmLmN0eCA9IGNvbnRleHQgfHwge307XG5cdH1cbn1cblxuVmlldy5wcm90b3R5cGUgPSB7XG5cdGdldDogZ2V0Vmlldyxcblx0Z2V0SW5kZXg6IGdldEluZGV4LFxuXHRnZXRSc2M6IGdldFJlc291cmNlLFxuXHRnZXRUbXBsOiBnZXRUZW1wbGF0ZSxcblx0Y3R4UHJtOiBjb250ZXh0UGFyYW1ldGVyLFxuXHRfaXM6IFwidmlld1wiXG59O1xuXG4vLz09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cbi8vIFJlZ2lzdHJhdGlvblxuLy89PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG5cbmZ1bmN0aW9uIGNvbXBpbGVDaGlsZFJlc291cmNlcyhwYXJlbnRUbXBsKSB7XG5cdHZhciBzdG9yZU5hbWUsIHN0b3JlTmFtZXMsIHJlc291cmNlcztcblx0Zm9yIChzdG9yZU5hbWUgaW4ganN2U3RvcmVzKSB7XG5cdFx0c3RvcmVOYW1lcyA9IHN0b3JlTmFtZSArIFwic1wiO1xuXHRcdGlmIChwYXJlbnRUbXBsW3N0b3JlTmFtZXNdKSB7XG5cdFx0XHRyZXNvdXJjZXMgPSBwYXJlbnRUbXBsW3N0b3JlTmFtZXNdOyAgICAvLyBSZXNvdXJjZXMgbm90IHlldCBjb21waWxlZFxuXHRcdFx0cGFyZW50VG1wbFtzdG9yZU5hbWVzXSA9IHt9OyAgICAgICAgICAgICAgIC8vIFJlbW92ZSB1bmNvbXBpbGVkIHJlc291cmNlc1xuXHRcdFx0JHZpZXdzW3N0b3JlTmFtZXNdKHJlc291cmNlcywgcGFyZW50VG1wbCk7IC8vIEFkZCBiYWNrIGluIHRoZSBjb21waWxlZCByZXNvdXJjZXNcblx0XHR9XG5cdH1cbn1cblxuLy89PT09PT09PT09PT09PT1cbi8vIGNvbXBpbGVUYWdcbi8vPT09PT09PT09PT09PT09XG5cbmZ1bmN0aW9uIGNvbXBpbGVUYWcobmFtZSwgdGFnRGVmLCBwYXJlbnRUbXBsKSB7XG5cdHZhciB0bXBsLCBiYXNlVGFnLCBwcm9wLCBsLCBrZXksIGJpbmRUb0xlbmd0aCxcblx0XHRiaW5kVG8gPSB0YWdEZWYuYmluZFRvLFxuXHRcdGNvbXBpbGVkRGVmID0gbmV3ICRzdWIuX3RnKCk7XG5cblx0ZnVuY3Rpb24gVGFnKCkge1xuXHRcdHZhciB0YWcgPSB0aGlzO1xuXHRcdHRhZy5fID0ge1xuXHRcdFx0aW5saW5lOiB0cnVlLFxuXHRcdFx0dW5saW5rZWQ6IHRydWVcblx0XHR9O1xuXG5cdFx0dGFnLnRhZ05hbWUgPSBuYW1lO1xuXHR9XG5cblx0ZnVuY3Rpb24gbWFrZUFycmF5KHR5cGUpIHtcblx0XHR2YXIgbGlua2VkRWxlbWVudDtcblx0XHRpZiAobGlua2VkRWxlbWVudCA9IHRhZ0RlZlt0eXBlXSkge1xuXHRcdFx0dGFnRGVmW3R5cGVdID0gbGlua2VkRWxlbWVudCA9ICRpc0FycmF5KGxpbmtlZEVsZW1lbnQpID8gbGlua2VkRWxlbWVudDogW2xpbmtlZEVsZW1lbnRdO1xuXHRcdFx0aWYgKChiaW5kVG9MZW5ndGggfHwgMSkgIT09IGxpbmtlZEVsZW1lbnQubGVuZ3RoKSB7XG5cdFx0XHRcdGVycm9yKHR5cGUgKyBcIiBsZW5ndGggbm90IHNhbWUgYXMgYmluZFRvIFwiKTtcblx0XHRcdH1cblx0XHR9XG5cdH1cblxuXHRpZiAoJGlzRnVuY3Rpb24odGFnRGVmKSkge1xuXHRcdC8vIFNpbXBsZSB0YWcgZGVjbGFyZWQgYXMgZnVuY3Rpb24uIE5vIHByZXNlbnRlciBpbnN0YW50YXRpb24uXG5cdFx0dGFnRGVmID0ge1xuXHRcdFx0ZGVwZW5kczogdGFnRGVmLmRlcGVuZHMsXG5cdFx0XHRyZW5kZXI6IHRhZ0RlZlxuXHRcdH07XG5cdH0gZWxzZSBpZiAoXCJcIiArIHRhZ0RlZiA9PT0gdGFnRGVmKSB7XG5cdFx0dGFnRGVmID0ge3RlbXBsYXRlOiB0YWdEZWZ9O1xuXHR9XG5cblx0aWYgKGJpbmRUbyAhPT0gdW5kZWZpbmVkKSB7XG5cdFx0YmluZFRvID0gdGFnRGVmLmJpbmRUbyA9ICRpc0FycmF5KGJpbmRUbykgPyBiaW5kVG8gOiBbYmluZFRvXTtcblx0XHRsID0gYmluZFRvTGVuZ3RoID0gYmluZFRvLmxlbmd0aDtcblx0XHR3aGlsZSAobC0tKSB7XG5cdFx0XHRrZXkgPSBiaW5kVG9bbF07XG5cdFx0XHRpZiAoIWlzTmFOKHBhcnNlSW50KGtleSkpKSB7XG5cdFx0XHRcdGtleSA9IHBhcnNlSW50KGtleSk7IC8vIENvbnZlcnQgXCIwXCIgdG8gMCwgIGV0Yy5cblx0XHRcdH1cblx0XHRcdGJpbmRUb1tsXSA9IGtleTtcblx0XHR9XG5cdH1cblxuXHRtYWtlQXJyYXkoXCJsaW5rZWRFbGVtZW50XCIpO1xuXHRtYWtlQXJyYXkoXCJsaW5rZWRDdHhQYXJhbVwiKTtcblxuXHRpZiAoYmFzZVRhZyA9IHRhZ0RlZi5iYXNlVGFnKSB7XG5cdFx0dGFnRGVmLmZsb3cgPSAhIXRhZ0RlZi5mbG93OyAvLyBTZXQgZmxvdyBwcm9wZXJ0eSwgc28gZGVmYXVsdHMgdG8gZmFsc2UgZXZlbiBpZiBiYXNlVGFnIGhhcyBmbG93PXRydWVcblx0XHR0YWdEZWYuYmFzZVRhZyA9IGJhc2VUYWcgPSBcIlwiICsgYmFzZVRhZyA9PT0gYmFzZVRhZ1xuXHRcdFx0PyAocGFyZW50VG1wbCAmJiBwYXJlbnRUbXBsLnRhZ3NbYmFzZVRhZ10gfHwgJHRhZ3NbYmFzZVRhZ10pXG5cdFx0XHQ6IGJhc2VUYWc7XG5cblx0XHRjb21waWxlZERlZiA9ICRleHRlbmQoY29tcGlsZWREZWYsIGJhc2VUYWcpO1xuXG5cdFx0Zm9yIChwcm9wIGluIHRhZ0RlZikge1xuXHRcdFx0Y29tcGlsZWREZWZbcHJvcF0gPSBnZXRNZXRob2QoYmFzZVRhZ1twcm9wXSwgdGFnRGVmW3Byb3BdKTtcblx0XHR9XG5cdH0gZWxzZSB7XG5cdFx0Y29tcGlsZWREZWYgPSAkZXh0ZW5kKGNvbXBpbGVkRGVmLCB0YWdEZWYpO1xuXHR9XG5cblx0Ly8gVGFnIGRlY2xhcmVkIGFzIG9iamVjdCwgdXNlZCBhcyB0aGUgcHJvdG90eXBlIGZvciB0YWcgaW5zdGFudGlhdGlvbiAoY29udHJvbC9wcmVzZW50ZXIpXG5cdGlmICgodG1wbCA9IGNvbXBpbGVkRGVmLnRlbXBsYXRlKSAhPT0gdW5kZWZpbmVkKSB7XG5cdFx0Y29tcGlsZWREZWYudGVtcGxhdGUgPSBcIlwiICsgdG1wbCA9PT0gdG1wbCA/ICgkdGVtcGxhdGVzW3RtcGxdIHx8ICR0ZW1wbGF0ZXModG1wbCkpIDogdG1wbDtcblx0fVxuXHQoVGFnLnByb3RvdHlwZSA9IGNvbXBpbGVkRGVmKS5jb25zdHJ1Y3RvciA9IGNvbXBpbGVkRGVmLl9jdHIgPSBUYWc7XG5cblx0aWYgKHBhcmVudFRtcGwpIHtcblx0XHRjb21waWxlZERlZi5fcGFyZW50VG1wbCA9IHBhcmVudFRtcGw7XG5cdH1cblx0cmV0dXJuIGNvbXBpbGVkRGVmO1xufVxuXG5mdW5jdGlvbiBiYXNlQXBwbHkoYXJncykge1xuXHQvLyBJbiBkZXJpdmVkIG1ldGhvZCAob3IgaGFuZGxlciBkZWNsYXJlZCBkZWNsYXJhdGl2ZWx5IGFzIGluIHt7OmZvbyBvbkNoYW5nZT1+Zm9vQ2hhbmdlZH19IGNhbiBjYWxsIGJhc2UgbWV0aG9kLFxuXHQvLyB1c2luZyB0aGlzLmJhc2VBcHBseShhcmd1bWVudHMpIChFcXVpdmFsZW50IHRvIHRoaXMuX3N1cGVyQXBwbHkoYXJndW1lbnRzKSBpbiBqUXVlcnkgVUkpXG5cdHJldHVybiB0aGlzLmJhc2UuYXBwbHkodGhpcywgYXJncyk7XG59XG5cbi8vPT09PT09PT09PT09PT09XG4vLyBjb21waWxlVG1wbFxuLy89PT09PT09PT09PT09PT1cblxuZnVuY3Rpb24gY29tcGlsZVRtcGwobmFtZSwgdG1wbCwgcGFyZW50VG1wbCwgb3B0aW9ucykge1xuXHQvLyB0bXBsIGlzIGVpdGhlciBhIHRlbXBsYXRlIG9iamVjdCwgYSBzZWxlY3RvciBmb3IgYSB0ZW1wbGF0ZSBzY3JpcHQgYmxvY2ssIHRoZSBuYW1lIG9mIGEgY29tcGlsZWQgdGVtcGxhdGUsIG9yIGEgdGVtcGxhdGUgb2JqZWN0XG5cblx0Ly89PT09IG5lc3RlZCBmdW5jdGlvbnMgPT09PVxuXHRmdW5jdGlvbiBsb29rdXBUZW1wbGF0ZSh2YWx1ZSkge1xuXHRcdC8vIElmIHZhbHVlIGlzIG9mIHR5cGUgc3RyaW5nIC0gdHJlYXQgYXMgc2VsZWN0b3IsIG9yIG5hbWUgb2YgY29tcGlsZWQgdGVtcGxhdGVcblx0XHQvLyBSZXR1cm4gdGhlIHRlbXBsYXRlIG9iamVjdCwgaWYgYWxyZWFkeSBjb21waWxlZCwgb3IgdGhlIG1hcmt1cCBzdHJpbmdcblx0XHR2YXIgY3VycmVudE5hbWUsIHRtcGw7XG5cdFx0aWYgKChcIlwiICsgdmFsdWUgPT09IHZhbHVlKSB8fCB2YWx1ZS5ub2RlVHlwZSA+IDAgJiYgKGVsZW0gPSB2YWx1ZSkpIHtcblx0XHRcdGlmICghZWxlbSkge1xuXHRcdFx0XHRpZiAoL15cXC5cXC9bXlxcXFw6Kj9cIjw+XSokLy50ZXN0KHZhbHVlKSkge1xuXHRcdFx0XHRcdC8vIHRtcGw9XCIuL3NvbWUvZmlsZS5odG1sXCJcblx0XHRcdFx0XHQvLyBJZiB0aGUgdGVtcGxhdGUgaXMgbm90IG5hbWVkLCB1c2UgXCIuL3NvbWUvZmlsZS5odG1sXCIgYXMgbmFtZS5cblx0XHRcdFx0XHRpZiAodG1wbCA9ICR0ZW1wbGF0ZXNbbmFtZSA9IG5hbWUgfHwgdmFsdWVdKSB7XG5cdFx0XHRcdFx0XHR2YWx1ZSA9IHRtcGw7XG5cdFx0XHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0XHRcdC8vIEJST1dTRVItU1BFQ0lGSUMgQ09ERSAobm90IG9uIE5vZGUuanMpOlxuXHRcdFx0XHRcdFx0Ly8gTG9vayBmb3Igc2VydmVyLWdlbmVyYXRlZCBzY3JpcHQgYmxvY2sgd2l0aCBpZCBcIi4vc29tZS9maWxlLmh0bWxcIlxuXHRcdFx0XHRcdFx0ZWxlbSA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKHZhbHVlKTtcblx0XHRcdFx0XHR9XG5cdFx0XHRcdH0gZWxzZSBpZiAoJC5mbiAmJiAhJHN1Yi5yVG1wbC50ZXN0KHZhbHVlKSkge1xuXHRcdFx0XHRcdHRyeSB7XG5cdFx0XHRcdFx0XHRlbGVtID0gJCAodmFsdWUsIGRvY3VtZW50KVswXTsgLy8gaWYgalF1ZXJ5IGlzIGxvYWRlZCwgdGVzdCBmb3Igc2VsZWN0b3IgcmV0dXJuaW5nIGVsZW1lbnRzLCBhbmQgZ2V0IGZpcnN0IGVsZW1lbnRcblx0XHRcdFx0XHR9IGNhdGNoIChlKSB7fVxuXHRcdFx0XHR9Ly8gRU5EIEJST1dTRVItU1BFQ0lGSUMgQ09ERVxuXHRcdFx0fSAvL0JST1dTRVItU1BFQ0lGSUMgQ09ERVxuXHRcdFx0aWYgKGVsZW0pIHtcblx0XHRcdFx0Ly8gR2VuZXJhbGx5IHRoaXMgaXMgYSBzY3JpcHQgZWxlbWVudC5cblx0XHRcdFx0Ly8gSG93ZXZlciB3ZSBhbGxvdyBpdCB0byBiZSBhbnkgZWxlbWVudCwgc28geW91IGNhbiBmb3IgZXhhbXBsZSB0YWtlIHRoZSBjb250ZW50IG9mIGEgZGl2LFxuXHRcdFx0XHQvLyB1c2UgaXQgYXMgYSB0ZW1wbGF0ZSwgYW5kIHJlcGxhY2UgaXQgYnkgdGhlIHNhbWUgY29udGVudCByZW5kZXJlZCBhZ2FpbnN0IGRhdGEuXG5cdFx0XHRcdC8vIGUuZy4gZm9yIGxpbmtpbmcgdGhlIGNvbnRlbnQgb2YgYSBkaXYgdG8gYSBjb250YWluZXIsIGFuZCB1c2luZyB0aGUgaW5pdGlhbCBjb250ZW50IGFzIHRlbXBsYXRlOlxuXHRcdFx0XHQvLyAkLmxpbmsoXCIjY29udGVudFwiLCBtb2RlbCwge3RtcGw6IFwiI2NvbnRlbnRcIn0pO1xuXHRcdFx0XHRpZiAob3B0aW9ucykge1xuXHRcdFx0XHRcdC8vIFdlIHdpbGwgY29tcGlsZSBhIG5ldyB0ZW1wbGF0ZSB1c2luZyB0aGUgbWFya3VwIGluIHRoZSBzY3JpcHQgZWxlbWVudFxuXHRcdFx0XHRcdHZhbHVlID0gZWxlbS5pbm5lckhUTUw7XG5cdFx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdFx0Ly8gV2Ugd2lsbCBjYWNoZSBhIHNpbmdsZSBjb3B5IG9mIHRoZSBjb21waWxlZCB0ZW1wbGF0ZSwgYW5kIGFzc29jaWF0ZSBpdCB3aXRoIHRoZSBuYW1lXG5cdFx0XHRcdFx0Ly8gKHJlbmFtaW5nIGZyb20gYSBwcmV2aW91cyBuYW1lIGlmIHRoZXJlIHdhcyBvbmUpLlxuXHRcdFx0XHRcdGN1cnJlbnROYW1lID0gZWxlbS5nZXRBdHRyaWJ1dGUodG1wbEF0dHIpO1xuXHRcdFx0XHRcdGlmIChjdXJyZW50TmFtZSkge1xuXHRcdFx0XHRcdFx0aWYgKGN1cnJlbnROYW1lICE9PSBqc3ZUbXBsKSB7XG5cdFx0XHRcdFx0XHRcdHZhbHVlID0gJHRlbXBsYXRlc1tjdXJyZW50TmFtZV07XG5cdFx0XHRcdFx0XHRcdGRlbGV0ZSAkdGVtcGxhdGVzW2N1cnJlbnROYW1lXTtcblx0XHRcdFx0XHRcdH0gZWxzZSBpZiAoJC5mbikge1xuXHRcdFx0XHRcdFx0XHR2YWx1ZSA9ICQuZGF0YShlbGVtKVtqc3ZUbXBsXTsgLy8gR2V0IGNhY2hlZCBjb21waWxlZCB0ZW1wbGF0ZVxuXHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdH1cblx0XHRcdFx0XHRpZiAoIWN1cnJlbnROYW1lIHx8ICF2YWx1ZSkgeyAvLyBOb3QgeWV0IGNvbXBpbGVkLCBvciBjYWNoZWQgdmVyc2lvbiBsb3N0XG5cdFx0XHRcdFx0XHRuYW1lID0gbmFtZSB8fCAoJC5mbiA/IGpzdlRtcGwgOiB2YWx1ZSk7XG5cdFx0XHRcdFx0XHR2YWx1ZSA9IGNvbXBpbGVUbXBsKG5hbWUsIGVsZW0uaW5uZXJIVE1MLCBwYXJlbnRUbXBsLCBvcHRpb25zKTtcblx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0dmFsdWUudG1wbE5hbWUgPSBuYW1lID0gbmFtZSB8fCBjdXJyZW50TmFtZTtcblx0XHRcdFx0XHRpZiAobmFtZSAhPT0ganN2VG1wbCkge1xuXHRcdFx0XHRcdFx0JHRlbXBsYXRlc1tuYW1lXSA9IHZhbHVlO1xuXHRcdFx0XHRcdH1cblx0XHRcdFx0XHRlbGVtLnNldEF0dHJpYnV0ZSh0bXBsQXR0ciwgbmFtZSk7XG5cdFx0XHRcdFx0aWYgKCQuZm4pIHtcblx0XHRcdFx0XHRcdCQuZGF0YShlbGVtLCBqc3ZUbXBsLCB2YWx1ZSk7XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHR9XG5cdFx0XHR9IC8vIEVORCBCUk9XU0VSLVNQRUNJRklDIENPREVcblx0XHRcdGVsZW0gPSB1bmRlZmluZWQ7XG5cdFx0fSBlbHNlIGlmICghdmFsdWUuZm4pIHtcblx0XHRcdHZhbHVlID0gdW5kZWZpbmVkO1xuXHRcdFx0Ly8gSWYgdmFsdWUgaXMgbm90IGEgc3RyaW5nLiBIVE1MIGVsZW1lbnQsIG9yIGNvbXBpbGVkIHRlbXBsYXRlLCByZXR1cm4gdW5kZWZpbmVkXG5cdFx0fVxuXHRcdHJldHVybiB2YWx1ZTtcblx0fVxuXG5cdHZhciBlbGVtLCBjb21waWxlZFRtcGwsXG5cdFx0dG1wbE9yTWFya3VwID0gdG1wbCA9IHRtcGwgfHwgXCJcIjtcblxuXHQvLz09PT0gQ29tcGlsZSB0aGUgdGVtcGxhdGUgPT09PVxuXHRpZiAob3B0aW9ucyA9PT0gMCkge1xuXHRcdG9wdGlvbnMgPSB1bmRlZmluZWQ7XG5cdFx0dG1wbE9yTWFya3VwID0gbG9va3VwVGVtcGxhdGUodG1wbE9yTWFya3VwKTsgLy8gVG9wLWxldmVsIGNvbXBpbGUgc28gZG8gYSB0ZW1wbGF0ZSBsb29rdXBcblx0fVxuXG5cdC8vIElmIG9wdGlvbnMsIHRoZW4gdGhpcyB3YXMgYWxyZWFkeSBjb21waWxlZCBmcm9tIGEgKHNjcmlwdCkgZWxlbWVudCB0ZW1wbGF0ZSBkZWNsYXJhdGlvbi5cblx0Ly8gSWYgbm90LCB0aGVuIGlmIHRtcGwgaXMgYSB0ZW1wbGF0ZSBvYmplY3QsIHVzZSBpdCBmb3Igb3B0aW9uc1xuXHRvcHRpb25zID0gb3B0aW9ucyB8fCAodG1wbC5tYXJrdXAgPyB0bXBsIDoge30pO1xuXHRvcHRpb25zLnRtcGxOYW1lID0gbmFtZTtcblx0aWYgKHBhcmVudFRtcGwpIHtcblx0XHRvcHRpb25zLl9wYXJlbnRUbXBsID0gcGFyZW50VG1wbDtcblx0fVxuXHQvLyBJZiB0bXBsIGlzIG5vdCBhIG1hcmt1cCBzdHJpbmcgb3IgYSBzZWxlY3RvciBzdHJpbmcsIHRoZW4gaXQgbXVzdCBiZSBhIHRlbXBsYXRlIG9iamVjdFxuXHQvLyBJbiB0aGF0IGNhc2UsIGdldCBpdCBmcm9tIHRoZSBtYXJrdXAgcHJvcGVydHkgb2YgdGhlIG9iamVjdFxuXHRpZiAoIXRtcGxPck1hcmt1cCAmJiB0bXBsLm1hcmt1cCAmJiAodG1wbE9yTWFya3VwID0gbG9va3VwVGVtcGxhdGUodG1wbC5tYXJrdXApKSkge1xuXHRcdGlmICh0bXBsT3JNYXJrdXAuZm4pIHtcblx0XHRcdC8vIElmIHRoZSBzdHJpbmcgcmVmZXJlbmNlcyBhIGNvbXBpbGVkIHRlbXBsYXRlIG9iamVjdCwgbmVlZCB0byByZWNvbXBpbGUgdG8gbWVyZ2UgYW55IG1vZGlmaWVkIG9wdGlvbnNcblx0XHRcdHRtcGxPck1hcmt1cCA9IHRtcGxPck1hcmt1cC5tYXJrdXA7XG5cdFx0fVxuXHR9XG5cdGlmICh0bXBsT3JNYXJrdXAgIT09IHVuZGVmaW5lZCkge1xuXHRcdGlmICh0bXBsT3JNYXJrdXAuZm4gfHwgdG1wbC5mbikge1xuXHRcdFx0Ly8gdG1wbCBpcyBhbHJlYWR5IGNvbXBpbGVkLCBzbyB1c2UgaXRcblx0XHRcdGlmICh0bXBsT3JNYXJrdXAuZm4pIHtcblx0XHRcdFx0Y29tcGlsZWRUbXBsID0gdG1wbE9yTWFya3VwO1xuXHRcdFx0fVxuXHRcdH0gZWxzZSB7XG5cdFx0XHQvLyB0bXBsT3JNYXJrdXAgaXMgYSBtYXJrdXAgc3RyaW5nLCBub3QgYSBjb21waWxlZCB0ZW1wbGF0ZVxuXHRcdFx0Ly8gQ3JlYXRlIHRlbXBsYXRlIG9iamVjdFxuXHRcdFx0dG1wbCA9IHRtcGxPYmplY3QodG1wbE9yTWFya3VwLCBvcHRpb25zKTtcblx0XHRcdC8vIENvbXBpbGUgdG8gQVNUIGFuZCB0aGVuIHRvIGNvbXBpbGVkIGZ1bmN0aW9uXG5cdFx0XHR0bXBsRm4odG1wbE9yTWFya3VwLnJlcGxhY2UockVzY2FwZVF1b3RlcywgXCJcXFxcJCZcIiksIHRtcGwpO1xuXHRcdH1cblx0XHRpZiAoIWNvbXBpbGVkVG1wbCkge1xuXHRcdFx0Y29tcGlsZWRUbXBsID0gJGV4dGVuZChmdW5jdGlvbigpIHtcblx0XHRcdFx0cmV0dXJuIGNvbXBpbGVkVG1wbC5yZW5kZXIuYXBwbHkoY29tcGlsZWRUbXBsLCBhcmd1bWVudHMpO1xuXHRcdFx0fSwgdG1wbCk7XG5cblx0XHRcdGNvbXBpbGVDaGlsZFJlc291cmNlcyhjb21waWxlZFRtcGwpO1xuXHRcdH1cblx0XHRyZXR1cm4gY29tcGlsZWRUbXBsO1xuXHR9XG59XG5cbi8vPT09PSAvZW5kIG9mIGZ1bmN0aW9uIGNvbXBpbGVUbXBsID09PT1cblxuLy89PT09PT09PT09PT09PT09PVxuLy8gY29tcGlsZVZpZXdNb2RlbFxuLy89PT09PT09PT09PT09PT09PVxuXG5mdW5jdGlvbiBnZXREZWZhdWx0VmFsKGRlZmF1bHRWYWwsIGRhdGEpIHtcblx0cmV0dXJuICRpc0Z1bmN0aW9uKGRlZmF1bHRWYWwpXG5cdFx0PyBkZWZhdWx0VmFsLmNhbGwoZGF0YSlcblx0XHQ6IGRlZmF1bHRWYWw7XG59XG5cbmZ1bmN0aW9uIHVubWFwQXJyYXkobW9kZWxBcnIpIHtcblx0XHR2YXIgYXJyID0gW10sXG5cdFx0XHRpID0gMCxcblx0XHRcdGwgPSBtb2RlbEFyci5sZW5ndGg7XG5cdFx0Zm9yICg7IGk8bDsgaSsrKSB7XG5cdFx0XHRhcnIucHVzaChtb2RlbEFycltpXS51bm1hcCgpKTtcblx0XHR9XG5cdFx0cmV0dXJuIGFycjtcbn1cblxuZnVuY3Rpb24gY29tcGlsZVZpZXdNb2RlbChuYW1lLCB0eXBlKSB7XG5cdHZhciBpLCBjb25zdHJ1Y3Rvcixcblx0XHR2aWV3TW9kZWxzID0gdGhpcyxcblx0XHRnZXR0ZXJzID0gdHlwZS5nZXR0ZXJzLFxuXHRcdGV4dGVuZCA9IHR5cGUuZXh0ZW5kLFxuXHRcdGlkID0gdHlwZS5pZCxcblx0XHRwcm90byA9ICQuZXh0ZW5kKHtcblx0XHRcdF9pczogbmFtZSB8fCBcInVubmFtZWRcIixcblx0XHRcdHVubWFwOiB1bm1hcCxcblx0XHRcdG1lcmdlOiBtZXJnZVxuXHRcdH0sIGV4dGVuZCksXG5cdFx0YXJncyA9IFwiXCIsXG5cdFx0Ym9keSA9IFwiXCIsXG5cdFx0ZyA9IGdldHRlcnMgPyBnZXR0ZXJzLmxlbmd0aCA6IDAsXG5cdFx0JG9ic2VydmFibGUgPSAkLm9ic2VydmFibGUsXG5cdFx0Z2V0dGVyTmFtZXMgPSB7fTtcblxuXHRmdW5jdGlvbiBHZXROZXcoYXJncykge1xuXHRcdGNvbnN0cnVjdG9yLmFwcGx5KHRoaXMsIGFyZ3MpO1xuXHR9XG5cblx0ZnVuY3Rpb24gdm0oKSB7XG5cdFx0cmV0dXJuIG5ldyBHZXROZXcoYXJndW1lbnRzKTtcblx0fVxuXG5cdGZ1bmN0aW9uIGl0ZXJhdGUoZGF0YSwgYWN0aW9uKSB7XG5cdFx0dmFyIGdldHRlclR5cGUsIGRlZmF1bHRWYWwsIHByb3AsIG9iLFxuXHRcdFx0aiA9IDA7XG5cdFx0Zm9yICg7IGo8ZzsgaisrKSB7XG5cdFx0XHRwcm9wID0gZ2V0dGVyc1tqXTtcblx0XHRcdGdldHRlclR5cGUgPSB1bmRlZmluZWQ7XG5cdFx0XHRpZiAocHJvcCArIFwiXCIgIT09IHByb3ApIHtcblx0XHRcdFx0Z2V0dGVyVHlwZSA9IHByb3A7XG5cdFx0XHRcdHByb3AgPSBnZXR0ZXJUeXBlLmdldHRlcjtcblx0XHRcdH1cblx0XHRcdGlmICgob2IgPSBkYXRhW3Byb3BdKSA9PT0gdW5kZWZpbmVkICYmIGdldHRlclR5cGUgJiYgKGRlZmF1bHRWYWwgPSBnZXR0ZXJUeXBlLmRlZmF1bHRWYWwpICE9PSB1bmRlZmluZWQpIHtcblx0XHRcdFx0b2IgPSBnZXREZWZhdWx0VmFsKGRlZmF1bHRWYWwsIGRhdGEpO1xuXHRcdFx0fVxuXHRcdFx0YWN0aW9uKG9iLCBnZXR0ZXJUeXBlICYmIHZpZXdNb2RlbHNbZ2V0dGVyVHlwZS50eXBlXSwgcHJvcCk7XG5cdFx0fVxuXHR9XG5cblx0ZnVuY3Rpb24gbWFwKGRhdGEpIHtcblx0XHRkYXRhID0gZGF0YSArIFwiXCIgPT09IGRhdGFcblx0XHRcdD8gSlNPTi5wYXJzZShkYXRhKSAvLyBBY2NlcHQgSlNPTiBzdHJpbmdcblx0XHRcdDogZGF0YTsgICAgICAgICAgICAvLyBvciBvYmplY3QvYXJyYXlcblx0XHR2YXIgbCwgcHJvcCxcblx0XHRcdGogPSAwLFxuXHRcdFx0b2IgPSBkYXRhLFxuXHRcdFx0YXJyID0gW107XG5cblx0XHRpZiAoJGlzQXJyYXkoZGF0YSkpIHtcblx0XHRcdGRhdGEgPSBkYXRhIHx8IFtdO1xuXHRcdFx0bCA9IGRhdGEubGVuZ3RoO1xuXHRcdFx0Zm9yICg7IGo8bDsgaisrKSB7XG5cdFx0XHRcdGFyci5wdXNoKHRoaXMubWFwKGRhdGFbal0pKTtcblx0XHRcdH1cblx0XHRcdGFyci5faXMgPSBuYW1lO1xuXHRcdFx0YXJyLnVubWFwID0gdW5tYXA7XG5cdFx0XHRhcnIubWVyZ2UgPSBtZXJnZTtcblx0XHRcdHJldHVybiBhcnI7XG5cdFx0fVxuXG5cdFx0aWYgKGRhdGEpIHtcblx0XHRcdGl0ZXJhdGUoZGF0YSwgZnVuY3Rpb24ob2IsIHZpZXdNb2RlbCkge1xuXHRcdFx0XHRpZiAodmlld01vZGVsKSB7IC8vIEl0ZXJhdGUgdG8gYnVpbGQgZ2V0dGVycyBhcmcgYXJyYXkgKHZhbHVlLCBvciBtYXBwZWQgdmFsdWUpXG5cdFx0XHRcdFx0b2IgPSB2aWV3TW9kZWwubWFwKG9iKTtcblx0XHRcdFx0fVxuXHRcdFx0XHRhcnIucHVzaChvYik7XG5cdFx0XHR9KTtcblxuXHRcdFx0b2IgPSB0aGlzLmFwcGx5KHRoaXMsIGFycik7IC8vIEluc2FudGlhdGUgdGhpcyBWaWV3IE1vZGVsLCBwYXNzaW5nIGdldHRlcnMgYXJncyBhcnJheSB0byBjb25zdHJ1Y3RvclxuXHRcdFx0Zm9yIChwcm9wIGluIGRhdGEpIHsgLy8gQ29weSBvdmVyIGFueSBvdGhlciBwcm9wZXJ0aWVzLiB0aGF0IGFyZSBub3QgZ2V0L3NldCBwcm9wZXJ0aWVzXG5cdFx0XHRcdGlmIChwcm9wICE9PSAkZXhwYW5kbyAmJiAhZ2V0dGVyTmFtZXNbcHJvcF0pIHtcblx0XHRcdFx0XHRvYltwcm9wXSA9IGRhdGFbcHJvcF07XG5cdFx0XHRcdH1cblx0XHRcdH1cblx0XHR9XG5cdFx0cmV0dXJuIG9iO1xuXHR9XG5cblx0ZnVuY3Rpb24gbWVyZ2UoZGF0YSkge1xuXHRcdGRhdGEgPSBkYXRhICsgXCJcIiA9PT0gZGF0YVxuXHRcdFx0PyBKU09OLnBhcnNlKGRhdGEpIC8vIEFjY2VwdCBKU09OIHN0cmluZ1xuXHRcdFx0OiBkYXRhOyAgICAgICAgICAgIC8vIG9yIG9iamVjdC9hcnJheVxuXHRcdHZhciBqLCBsLCBtLCBwcm9wLCBtb2QsIGZvdW5kLCBhc3NpZ25lZCwgb2IsIG5ld01vZEFycixcblx0XHRcdGsgPSAwLFxuXHRcdFx0bW9kZWwgPSB0aGlzO1xuXG5cdFx0aWYgKCRpc0FycmF5KG1vZGVsKSkge1xuXHRcdFx0YXNzaWduZWQgPSB7fTtcblx0XHRcdG5ld01vZEFyciA9IFtdO1xuXHRcdFx0bCA9IGRhdGEubGVuZ3RoO1xuXHRcdFx0bSA9IG1vZGVsLmxlbmd0aDtcblx0XHRcdGZvciAoOyBrPGw7IGsrKykge1xuXHRcdFx0XHRvYiA9IGRhdGFba107XG5cdFx0XHRcdGZvdW5kID0gZmFsc2U7XG5cdFx0XHRcdGZvciAoaj0wOyBqPG0gJiYgIWZvdW5kOyBqKyspIHtcblx0XHRcdFx0XHRpZiAoYXNzaWduZWRbal0pIHtcblx0XHRcdFx0XHRcdGNvbnRpbnVlO1xuXHRcdFx0XHRcdH1cblx0XHRcdFx0XHRtb2QgPSBtb2RlbFtqXTtcblxuXHRcdFx0XHRcdGlmIChpZCkge1xuXHRcdFx0XHRcdFx0YXNzaWduZWRbal0gPSBmb3VuZCA9IGlkICsgXCJcIiA9PT0gaWRcblx0XHRcdFx0XHRcdD8gKG9iW2lkXSAmJiAoZ2V0dGVyTmFtZXNbaWRdID8gbW9kW2lkXSgpIDogbW9kW2lkXSkgPT09IG9iW2lkXSlcblx0XHRcdFx0XHRcdDogaWQobW9kLCBvYik7XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHR9XG5cdFx0XHRcdGlmIChmb3VuZCkge1xuXHRcdFx0XHRcdG1vZC5tZXJnZShvYik7XG5cdFx0XHRcdFx0bmV3TW9kQXJyLnB1c2gobW9kKTtcblx0XHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0XHRuZXdNb2RBcnIucHVzaCh2bS5tYXAob2IpKTtcblx0XHRcdFx0fVxuXHRcdFx0fVxuXHRcdFx0aWYgKCRvYnNlcnZhYmxlKSB7XG5cdFx0XHRcdCRvYnNlcnZhYmxlKG1vZGVsKS5yZWZyZXNoKG5ld01vZEFyciwgdHJ1ZSk7XG5cdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRtb2RlbC5zcGxpY2UuYXBwbHkobW9kZWwsIFswLCBtb2RlbC5sZW5ndGhdLmNvbmNhdChuZXdNb2RBcnIpKTtcblx0XHRcdH1cblx0XHRcdHJldHVybjtcblx0XHR9XG5cdFx0aXRlcmF0ZShkYXRhLCBmdW5jdGlvbihvYiwgdmlld01vZGVsLCBnZXR0ZXIpIHtcblx0XHRcdGlmICh2aWV3TW9kZWwpIHtcblx0XHRcdFx0bW9kZWxbZ2V0dGVyXSgpLm1lcmdlKG9iKTsgLy8gVXBkYXRlIHR5cGVkIHByb3BlcnR5XG5cdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRtb2RlbFtnZXR0ZXJdKG9iKTsgLy8gVXBkYXRlIG5vbi10eXBlZCBwcm9wZXJ0eVxuXHRcdFx0fVxuXHRcdH0pO1xuXHRcdGZvciAocHJvcCBpbiBkYXRhKSB7XG5cdFx0XHRpZiAocHJvcCAhPT0gJGV4cGFuZG8gJiYgIWdldHRlck5hbWVzW3Byb3BdKSB7XG5cdFx0XHRcdG1vZGVsW3Byb3BdID0gZGF0YVtwcm9wXTtcblx0XHRcdH1cblx0XHR9XG5cdH1cblxuXHRmdW5jdGlvbiB1bm1hcCgpIHtcblx0XHR2YXIgb2IsIHByb3AsIGdldHRlclR5cGUsIGFyciwgdmFsdWUsXG5cdFx0XHRrID0gMCxcblx0XHRcdG1vZGVsID0gdGhpcztcblxuXHRcdGlmICgkaXNBcnJheShtb2RlbCkpIHtcblx0XHRcdHJldHVybiB1bm1hcEFycmF5KG1vZGVsKTtcblx0XHR9XG5cdFx0b2IgPSB7fTtcblx0XHRmb3IgKDsgazxnOyBrKyspIHtcblx0XHRcdHByb3AgPSBnZXR0ZXJzW2tdO1xuXHRcdFx0Z2V0dGVyVHlwZSA9IHVuZGVmaW5lZDtcblx0XHRcdGlmIChwcm9wICsgXCJcIiAhPT0gcHJvcCkge1xuXHRcdFx0XHRnZXR0ZXJUeXBlID0gcHJvcDtcblx0XHRcdFx0cHJvcCA9IGdldHRlclR5cGUuZ2V0dGVyO1xuXHRcdFx0fVxuXHRcdFx0dmFsdWUgPSBtb2RlbFtwcm9wXSgpO1xuXHRcdFx0b2JbcHJvcF0gPSBnZXR0ZXJUeXBlICYmIHZhbHVlICYmIHZpZXdNb2RlbHNbZ2V0dGVyVHlwZS50eXBlXVxuXHRcdFx0XHQ/ICRpc0FycmF5KHZhbHVlKVxuXHRcdFx0XHRcdD8gdW5tYXBBcnJheSh2YWx1ZSlcblx0XHRcdFx0XHQ6IHZhbHVlLnVubWFwKClcblx0XHRcdFx0OiB2YWx1ZTtcblx0XHR9XG5cdFx0Zm9yIChwcm9wIGluIG1vZGVsKSB7XG5cdFx0XHRpZiAocHJvcCAhPT0gXCJfaXNcIiAmJiAhZ2V0dGVyTmFtZXNbcHJvcF0gJiYgcHJvcCAhPT0gJGV4cGFuZG8gICYmIChwcm9wLmNoYXJBdCgwKSAhPT0gXCJfXCIgfHwgIWdldHRlck5hbWVzW3Byb3Auc2xpY2UoMSldKSAmJiAhJGlzRnVuY3Rpb24obW9kZWxbcHJvcF0pKSB7XG5cdFx0XHRcdG9iW3Byb3BdID0gbW9kZWxbcHJvcF07XG5cdFx0XHR9XG5cdFx0fVxuXHRcdHJldHVybiBvYjtcblx0fVxuXG5cdEdldE5ldy5wcm90b3R5cGUgPSBwcm90bztcblxuXHRmb3IgKGk9MDsgaTxnOyBpKyspIHtcblx0XHQoZnVuY3Rpb24oZ2V0dGVyKSB7XG5cdFx0XHRnZXR0ZXIgPSBnZXR0ZXIuZ2V0dGVyIHx8IGdldHRlcjtcblx0XHRcdGdldHRlck5hbWVzW2dldHRlcl0gPSBpKzE7XG5cdFx0XHR2YXIgcHJpdkZpZWxkID0gXCJfXCIgKyBnZXR0ZXI7XG5cblx0XHRcdGFyZ3MgKz0gKGFyZ3MgPyBcIixcIiA6IFwiXCIpICsgZ2V0dGVyO1xuXHRcdFx0Ym9keSArPSBcInRoaXMuXCIgKyBwcml2RmllbGQgKyBcIiA9IFwiICsgZ2V0dGVyICsgXCI7XFxuXCI7XG5cdFx0XHRwcm90b1tnZXR0ZXJdID0gcHJvdG9bZ2V0dGVyXSB8fCBmdW5jdGlvbih2YWwpIHtcblx0XHRcdFx0aWYgKCFhcmd1bWVudHMubGVuZ3RoKSB7XG5cdFx0XHRcdFx0cmV0dXJuIHRoaXNbcHJpdkZpZWxkXTsgLy8gSWYgdGhlcmUgaXMgbm8gYXJndW1lbnQsIHVzZSBhcyBhIGdldHRlclxuXHRcdFx0XHR9XG5cdFx0XHRcdGlmICgkb2JzZXJ2YWJsZSkge1xuXHRcdFx0XHRcdCRvYnNlcnZhYmxlKHRoaXMpLnNldFByb3BlcnR5KGdldHRlciwgdmFsKTtcblx0XHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0XHR0aGlzW3ByaXZGaWVsZF0gPSB2YWw7XG5cdFx0XHRcdH1cblx0XHRcdH07XG5cblx0XHRcdGlmICgkb2JzZXJ2YWJsZSkge1xuXHRcdFx0XHRwcm90b1tnZXR0ZXJdLnNldCA9IHByb3RvW2dldHRlcl0uc2V0IHx8IGZ1bmN0aW9uKHZhbCkge1xuXHRcdFx0XHRcdHRoaXNbcHJpdkZpZWxkXSA9IHZhbDsgLy8gU2V0dGVyIGNhbGxlZCBieSBvYnNlcnZhYmxlIHByb3BlcnR5IGNoYW5nZVxuXHRcdFx0XHR9O1xuXHRcdFx0fVxuXHRcdH0pKGdldHRlcnNbaV0pO1xuXHR9XG5cblx0Y29uc3RydWN0b3IgPSBuZXcgRnVuY3Rpb24oYXJncywgYm9keS5zbGljZSgwLCAtMSkpO1xuXHRjb25zdHJ1Y3Rvci5wcm90b3R5cGUgPSBwcm90bztcblx0cHJvdG8uY29uc3RydWN0b3IgPSBjb25zdHJ1Y3RvcjtcblxuXHR2bS5tYXAgPSBtYXA7XG5cdHZtLmdldHRlcnMgPSBnZXR0ZXJzO1xuXHR2bS5leHRlbmQgPSBleHRlbmQ7XG5cdHZtLmlkID0gaWQ7XG5cdHJldHVybiB2bTtcbn1cblxuZnVuY3Rpb24gdG1wbE9iamVjdChtYXJrdXAsIG9wdGlvbnMpIHtcblx0Ly8gVGVtcGxhdGUgb2JqZWN0IGNvbnN0cnVjdG9yXG5cdHZhciBodG1sVGFnLFxuXHRcdHdyYXBNYXAgPSAkc3ViU2V0dGluZ3NBZHZhbmNlZC5fd20gfHwge30sIC8vIE9ubHkgdXNlZCBpbiBKc1ZpZXdzLiBPdGhlcndpc2UgZW1wdHk6IHt9XG5cdFx0dG1wbCA9ICRleHRlbmQoXG5cdFx0XHR7XG5cdFx0XHRcdHRtcGxzOiBbXSxcblx0XHRcdFx0bGlua3M6IHt9LCAvLyBDb21waWxlZCBmdW5jdGlvbnMgZm9yIGxpbmsgZXhwcmVzc2lvbnNcblx0XHRcdFx0Ym5kczogW10sXG5cdFx0XHRcdF9pczogXCJ0ZW1wbGF0ZVwiLFxuXHRcdFx0XHRyZW5kZXI6IHJlbmRlckNvbnRlbnRcblx0XHRcdH0sXG5cdFx0XHRvcHRpb25zXG5cdFx0KTtcblxuXHR0bXBsLm1hcmt1cCA9IG1hcmt1cDtcblx0aWYgKCFvcHRpb25zLmh0bWxUYWcpIHtcblx0XHQvLyBTZXQgdG1wbC50YWcgdG8gdGhlIHRvcC1sZXZlbCBIVE1MIHRhZyB1c2VkIGluIHRoZSB0ZW1wbGF0ZSwgaWYgYW55Li4uXG5cdFx0aHRtbFRhZyA9IHJGaXJzdEVsZW0uZXhlYyhtYXJrdXApO1xuXHRcdHRtcGwuaHRtbFRhZyA9IGh0bWxUYWcgPyBodG1sVGFnWzFdLnRvTG93ZXJDYXNlKCkgOiBcIlwiO1xuXHR9XG5cdGh0bWxUYWcgPSB3cmFwTWFwW3RtcGwuaHRtbFRhZ107XG5cdGlmIChodG1sVGFnICYmIGh0bWxUYWcgIT09IHdyYXBNYXAuZGl2KSB7XG5cdFx0Ly8gV2hlbiB1c2luZyBKc1ZpZXdzLCB3ZSB0cmltIHRlbXBsYXRlcyB3aGljaCBhcmUgaW5zZXJ0ZWQgaW50byBIVE1MIGNvbnRleHRzIHdoZXJlIHRleHQgbm9kZXMgYXJlIG5vdCByZW5kZXJlZCAoaS5lLiBub3QgJ1BocmFzaW5nIENvbnRlbnQnKS5cblx0XHQvLyBDdXJyZW50bHkgbm90IHRyaW1tZWQgZm9yIDxsaT4gdGFnLiAoTm90IHdvcnRoIGFkZGluZyBwZXJmIGNvc3QpXG5cdFx0dG1wbC5tYXJrdXAgPSAkLnRyaW0odG1wbC5tYXJrdXApO1xuXHR9XG5cblx0cmV0dXJuIHRtcGw7XG59XG5cbi8vPT09PT09PT09PT09PT1cbi8vIHJlZ2lzdGVyU3RvcmVcbi8vPT09PT09PT09PT09PT1cblxuZnVuY3Rpb24gcmVnaXN0ZXJTdG9yZShzdG9yZU5hbWUsIHN0b3JlU2V0dGluZ3MpIHtcblxuXHRmdW5jdGlvbiB0aGVTdG9yZShuYW1lLCBpdGVtLCBwYXJlbnRUbXBsKSB7XG5cdFx0Ly8gVGhlIHN0b3JlIGlzIGFsc28gdGhlIGZ1bmN0aW9uIHVzZWQgdG8gYWRkIGl0ZW1zIHRvIHRoZSBzdG9yZS4gZS5nLiAkLnRlbXBsYXRlcywgb3IgJC52aWV3cy50YWdzXG5cblx0XHQvLyBGb3Igc3RvcmUgb2YgbmFtZSAndGhpbmcnLCBDYWxsIGFzOlxuXHRcdC8vICAgICQudmlld3MudGhpbmdzKGl0ZW1zWywgcGFyZW50VG1wbF0pLFxuXHRcdC8vIG9yICQudmlld3MudGhpbmdzKG5hbWUsIGl0ZW1bLCBwYXJlbnRUbXBsXSlcblxuXHRcdHZhciBjb21waWxlLCBpdGVtTmFtZSwgdGhpc1N0b3JlLCBjbnQsXG5cdFx0XHRvblN0b3JlID0gJHN1Yi5vblN0b3JlW3N0b3JlTmFtZV07XG5cblx0XHRpZiAobmFtZSAmJiB0eXBlb2YgbmFtZSA9PT0gT0JKRUNUICYmICFuYW1lLm5vZGVUeXBlICYmICFuYW1lLm1hcmt1cCAmJiAhbmFtZS5nZXRUZ3QgJiYgIShzdG9yZU5hbWUgPT09IFwidmlld01vZGVsXCIgJiYgbmFtZS5nZXR0ZXJzIHx8IG5hbWUuZXh0ZW5kKSkge1xuXHRcdFx0Ly8gQ2FsbCB0byAkLnZpZXdzLnRoaW5ncyhpdGVtc1ssIHBhcmVudFRtcGxdKSxcblxuXHRcdFx0Ly8gQWRkaW5nIGl0ZW1zIHRvIHRoZSBzdG9yZVxuXHRcdFx0Ly8gSWYgbmFtZSBpcyBhIGhhc2gsIHRoZW4gaXRlbSBpcyBwYXJlbnRUbXBsLiBJdGVyYXRlIG92ZXIgaGFzaCBhbmQgY2FsbCBzdG9yZSBmb3Iga2V5LlxuXHRcdFx0Zm9yIChpdGVtTmFtZSBpbiBuYW1lKSB7XG5cdFx0XHRcdHRoZVN0b3JlKGl0ZW1OYW1lLCBuYW1lW2l0ZW1OYW1lXSwgaXRlbSk7XG5cdFx0XHR9XG5cdFx0XHRyZXR1cm4gaXRlbSB8fCAkdmlld3M7XG5cdFx0fVxuXHRcdC8vIEFkZGluZyBhIHNpbmdsZSB1bm5hbWVkIGl0ZW0gdG8gdGhlIHN0b3JlXG5cdFx0aWYgKGl0ZW0gPT09IHVuZGVmaW5lZCkge1xuXHRcdFx0aXRlbSA9IG5hbWU7XG5cdFx0XHRuYW1lID0gdW5kZWZpbmVkO1xuXHRcdH1cblx0XHRpZiAobmFtZSAmJiBcIlwiICsgbmFtZSAhPT0gbmFtZSkgeyAvLyBuYW1lIG11c3QgYmUgYSBzdHJpbmdcblx0XHRcdHBhcmVudFRtcGwgPSBpdGVtO1xuXHRcdFx0aXRlbSA9IG5hbWU7XG5cdFx0XHRuYW1lID0gdW5kZWZpbmVkO1xuXHRcdH1cblx0XHR0aGlzU3RvcmUgPSBwYXJlbnRUbXBsXG5cdFx0XHQ/IHN0b3JlTmFtZSA9PT0gXCJ2aWV3TW9kZWxcIlxuXHRcdFx0XHQ/IHBhcmVudFRtcGxcblx0XHRcdFx0OiAocGFyZW50VG1wbFtzdG9yZU5hbWVzXSA9IHBhcmVudFRtcGxbc3RvcmVOYW1lc10gfHwge30pXG5cdFx0XHQ6IHRoZVN0b3JlO1xuXHRcdGNvbXBpbGUgPSBzdG9yZVNldHRpbmdzLmNvbXBpbGU7XG5cblx0XHRpZiAoaXRlbSA9PT0gbnVsbCkge1xuXHRcdFx0Ly8gSWYgaXRlbSBpcyBudWxsLCBkZWxldGUgdGhpcyBlbnRyeVxuXHRcdFx0aWYgKG5hbWUpIHtcblx0XHRcdFx0ZGVsZXRlIHRoaXNTdG9yZVtuYW1lXTtcblx0XHRcdH1cblx0XHR9IGVsc2Uge1xuXHRcdFx0aWYgKGNvbXBpbGUpIHtcblx0XHRcdFx0aXRlbSA9IGNvbXBpbGUuY2FsbCh0aGlzU3RvcmUsIG5hbWUsIGl0ZW0sIHBhcmVudFRtcGwsIDApO1xuXHRcdFx0XHRpdGVtLl9pcyA9IHN0b3JlTmFtZTsgLy8gT25seSBkbyB0aGlzIGZvciBjb21waWxlZCBvYmplY3RzICh0YWdzLCB0ZW1wbGF0ZXMuLi4pXG5cdFx0XHR9XG5cdFx0XHQvLyBlLmcuIEpzVmlld3MgaW50ZWdyYXRpb25cblxuXHRcdFx0aWYgKG5hbWUpIHtcblx0XHRcdFx0dGhpc1N0b3JlW25hbWVdID0gaXRlbTtcblx0XHRcdH1cblx0XHR9XG5cdFx0aWYgKG9uU3RvcmUpIHtcblx0XHRcdG9uU3RvcmUobmFtZSwgaXRlbSwgcGFyZW50VG1wbCwgY29tcGlsZSk7XG5cdFx0fVxuXHRcdHJldHVybiBpdGVtO1xuXHR9XG5cblx0dmFyIHN0b3JlTmFtZXMgPSBzdG9yZU5hbWUgKyBcInNcIjtcblx0JHZpZXdzW3N0b3JlTmFtZXNdID0gdGhlU3RvcmU7XG59XG5cbmZ1bmN0aW9uIGFkZFNldHRpbmcoc3QpIHtcblx0JHZpZXdzU2V0dGluZ3Nbc3RdID0gZnVuY3Rpb24odmFsdWUpIHtcblx0XHRyZXR1cm4gYXJndW1lbnRzLmxlbmd0aFxuXHRcdFx0PyAoJHN1YlNldHRpbmdzW3N0XSA9IHZhbHVlLCAkdmlld3NTZXR0aW5ncylcblx0XHRcdDogJHN1YlNldHRpbmdzW3N0XTtcblx0fTtcbn1cblxuLy89PT09PT09PT1cbi8vIGRhdGFNYXBcbi8vPT09PT09PT09XG5cbmZ1bmN0aW9uIGRhdGFNYXAobWFwRGVmKSB7XG5cdGZ1bmN0aW9uIE1hcChzb3VyY2UsIG9wdGlvbnMpIHtcblx0XHR0aGlzLnRndCA9IG1hcERlZi5nZXRUZ3Qoc291cmNlLCBvcHRpb25zKTtcblx0fVxuXG5cdGlmICgkaXNGdW5jdGlvbihtYXBEZWYpKSB7XG5cdFx0Ly8gU2ltcGxlIG1hcCBkZWNsYXJlZCBhcyBmdW5jdGlvblxuXHRcdG1hcERlZiA9IHtcblx0XHRcdGdldFRndDogbWFwRGVmXG5cdFx0fTtcblx0fVxuXG5cdGlmIChtYXBEZWYuYmFzZU1hcCkge1xuXHRcdG1hcERlZiA9ICRleHRlbmQoJGV4dGVuZCh7fSwgbWFwRGVmLmJhc2VNYXApLCBtYXBEZWYpO1xuXHR9XG5cblx0bWFwRGVmLm1hcCA9IGZ1bmN0aW9uKHNvdXJjZSwgb3B0aW9ucykge1xuXHRcdHJldHVybiBuZXcgTWFwKHNvdXJjZSwgb3B0aW9ucyk7XG5cdH07XG5cdHJldHVybiBtYXBEZWY7XG59XG5cbi8vPT09PT09PT09PT09PT1cbi8vIHJlbmRlckNvbnRlbnRcbi8vPT09PT09PT09PT09PT1cblxuZnVuY3Rpb24gcmVuZGVyQ29udGVudChkYXRhLCBjb250ZXh0LCBub0l0ZXJhdGlvbiwgcGFyZW50Vmlldywga2V5LCBvblJlbmRlcikge1xuXHR2YXIgaSwgbCwgdGFnLCB0bXBsLCB0YWdDdHgsIGlzVG9wUmVuZGVyQ2FsbCwgcHJldkRhdGEsIHByZXZJbmRleCxcblx0XHR2aWV3ID0gcGFyZW50Vmlldyxcblx0XHRyZXN1bHQgPSBcIlwiO1xuXG5cdGlmIChjb250ZXh0ID09PSB0cnVlKSB7XG5cdFx0bm9JdGVyYXRpb24gPSBjb250ZXh0OyAvLyBwYXNzaW5nIGJvb2xlYW4gYXMgc2Vjb25kIHBhcmFtIC0gbm9JdGVyYXRpb25cblx0XHRjb250ZXh0ID0gdW5kZWZpbmVkO1xuXHR9IGVsc2UgaWYgKHR5cGVvZiBjb250ZXh0ICE9PSBPQkpFQ1QpIHtcblx0XHRjb250ZXh0ID0gdW5kZWZpbmVkOyAvLyBjb250ZXh0IG11c3QgYmUgYSBib29sZWFuIChub0l0ZXJhdGlvbikgb3IgYSBwbGFpbiBvYmplY3Rcblx0fVxuXG5cdGlmICh0YWcgPSB0aGlzLnRhZykge1xuXHRcdC8vIFRoaXMgaXMgYSBjYWxsIGZyb20gcmVuZGVyVGFnIG9yIHRhZ0N0eC5yZW5kZXIoLi4uKVxuXHRcdHRhZ0N0eCA9IHRoaXM7XG5cdFx0dmlldyA9IHZpZXcgfHwgdGFnQ3R4LnZpZXc7XG5cdFx0dG1wbCA9IHZpZXcuZ2V0VG1wbCh0YWcudGVtcGxhdGUgfHwgdGFnQ3R4LnRtcGwpO1xuXHRcdGlmICghYXJndW1lbnRzLmxlbmd0aCkge1xuXHRcdFx0ZGF0YSA9IHZpZXc7XG5cdFx0fVxuXHR9IGVsc2Uge1xuXHRcdC8vIFRoaXMgaXMgYSB0ZW1wbGF0ZS5yZW5kZXIoLi4uKSBjYWxsXG5cdFx0dG1wbCA9IHRoaXM7XG5cdH1cblxuXHRpZiAodG1wbCkge1xuXHRcdGlmICghcGFyZW50VmlldyAmJiBkYXRhICYmIGRhdGEuX2lzID09PSBcInZpZXdcIikge1xuXHRcdFx0dmlldyA9IGRhdGE7IC8vIFdoZW4gcGFzc2luZyBpbiBhIHZpZXcgdG8gcmVuZGVyIG9yIGxpbmsgKGFuZCBub3QgcGFzc2luZyBpbiBhIHBhcmVudCB2aWV3KSB1c2UgdGhlIHBhc3NlZC1pbiB2aWV3IGFzIHBhcmVudFZpZXdcblx0XHR9XG5cblx0XHRpZiAodmlldykge1xuXHRcdFx0aWYgKGRhdGEgPT09IHZpZXcpIHtcblx0XHRcdFx0Ly8gSW5oZXJpdCB0aGUgZGF0YSBmcm9tIHRoZSBwYXJlbnQgdmlldy5cblx0XHRcdFx0Ly8gVGhpcyBtYXkgYmUgdGhlIGNvbnRlbnRzIG9mIGFuIHt7aWZ9fSBibG9ja1xuXHRcdFx0XHRkYXRhID0gdmlldy5kYXRhO1xuXHRcdFx0fVxuXHRcdH1cblxuXHRcdGlzVG9wUmVuZGVyQ2FsbCA9ICF2aWV3O1xuXHRcdGlzUmVuZGVyQ2FsbCA9IGlzUmVuZGVyQ2FsbCB8fCBpc1RvcFJlbmRlckNhbGw7XG5cdFx0aWYgKCF2aWV3KSB7XG5cdFx0XHQoY29udGV4dCA9IGNvbnRleHQgfHwge30pLnJvb3QgPSBkYXRhOyAvLyBQcm92aWRlIH5yb290IGFzIHNob3J0Y3V0IHRvIHRvcC1sZXZlbCBkYXRhLlxuXHRcdH1cblx0XHRpZiAoIWlzUmVuZGVyQ2FsbCB8fCAkc3ViU2V0dGluZ3NBZHZhbmNlZC51c2VWaWV3cyB8fCB0bXBsLnVzZVZpZXdzIHx8IHZpZXcgJiYgdmlldyAhPT0gdG9wVmlldykge1xuXHRcdFx0cmVzdWx0ID0gcmVuZGVyV2l0aFZpZXdzKHRtcGwsIGRhdGEsIGNvbnRleHQsIG5vSXRlcmF0aW9uLCB2aWV3LCBrZXksIG9uUmVuZGVyLCB0YWcpO1xuXHRcdH0gZWxzZSB7XG5cdFx0XHRpZiAodmlldykgeyAvLyBJbiBhIGJsb2NrXG5cdFx0XHRcdHByZXZEYXRhID0gdmlldy5kYXRhO1xuXHRcdFx0XHRwcmV2SW5kZXggPSB2aWV3LmluZGV4O1xuXHRcdFx0XHR2aWV3LmluZGV4ID0gaW5kZXhTdHI7XG5cdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHR2aWV3ID0gdG9wVmlldztcblx0XHRcdFx0dmlldy5kYXRhID0gZGF0YTtcblx0XHRcdFx0dmlldy5jdHggPSBjb250ZXh0O1xuXHRcdFx0fVxuXHRcdFx0aWYgKCRpc0FycmF5KGRhdGEpICYmICFub0l0ZXJhdGlvbikge1xuXHRcdFx0XHQvLyBDcmVhdGUgYSB2aWV3IGZvciB0aGUgYXJyYXksIHdob3NlIGNoaWxkIHZpZXdzIGNvcnJlc3BvbmQgdG8gZWFjaCBkYXRhIGl0ZW0uIChOb3RlOiBpZiBrZXkgYW5kIHBhcmVudFZpZXcgYXJlIHBhc3NlZCBpblxuXHRcdFx0XHQvLyBhbG9uZyB3aXRoIHBhcmVudCB2aWV3LCB0cmVhdCBhcyBpbnNlcnQgLWUuZy4gZnJvbSB2aWV3LmFkZFZpZXdzIC0gc28gcGFyZW50VmlldyBpcyBhbHJlYWR5IHRoZSB2aWV3IGl0ZW0gZm9yIGFycmF5KVxuXHRcdFx0XHRmb3IgKGkgPSAwLCBsID0gZGF0YS5sZW5ndGg7IGkgPCBsOyBpKyspIHtcblx0XHRcdFx0XHR2aWV3LmluZGV4ID0gaTtcblx0XHRcdFx0XHR2aWV3LmRhdGEgPSBkYXRhW2ldO1xuXHRcdFx0XHRcdHJlc3VsdCArPSB0bXBsLmZuKGRhdGFbaV0sIHZpZXcsICRzdWIpO1xuXHRcdFx0XHR9XG5cdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHR2aWV3LmRhdGEgPSBkYXRhO1xuXHRcdFx0XHRyZXN1bHQgKz0gdG1wbC5mbihkYXRhLCB2aWV3LCAkc3ViKTtcblx0XHRcdH1cblx0XHRcdHZpZXcuZGF0YSA9IHByZXZEYXRhO1xuXHRcdFx0dmlldy5pbmRleCA9IHByZXZJbmRleDtcblx0XHR9XG5cdFx0aWYgKGlzVG9wUmVuZGVyQ2FsbCkge1xuXHRcdFx0aXNSZW5kZXJDYWxsID0gdW5kZWZpbmVkO1xuXHRcdH1cblx0fVxuXHRyZXR1cm4gcmVzdWx0O1xufVxuXG5mdW5jdGlvbiByZW5kZXJXaXRoVmlld3ModG1wbCwgZGF0YSwgY29udGV4dCwgbm9JdGVyYXRpb24sIHZpZXcsIGtleSwgb25SZW5kZXIsIHRhZykge1xuXHRmdW5jdGlvbiBzZXRJdGVtVmFyKGl0ZW0pIHtcblx0XHQvLyBXaGVuIGl0ZW1WYXIgaXMgc3BlY2lmaWVkLCBzZXQgbW9kaWZpZWQgY3R4IHdpdGggdXNlci1uYW1lZCB+aXRlbVxuXHRcdG5ld0N0eCA9ICRleHRlbmQoe30sIGNvbnRleHQpO1xuXHRcdG5ld0N0eFtpdGVtVmFyXSA9IGl0ZW07XG5cdH1cblxuXHQvLyBSZW5kZXIgdGVtcGxhdGUgYWdhaW5zdCBkYXRhIGFzIGEgdHJlZSBvZiBzdWJ2aWV3cyAobmVzdGVkIHJlbmRlcmVkIHRlbXBsYXRlIGluc3RhbmNlcyksIG9yIGFzIGEgc3RyaW5nICh0b3AtbGV2ZWwgdGVtcGxhdGUpLlxuXHQvLyBJZiB0aGUgZGF0YSBpcyB0aGUgcGFyZW50IHZpZXcsIHRyZWF0IGFzIG5vSXRlcmF0aW9uLCByZS1yZW5kZXIgd2l0aCB0aGUgc2FtZSBkYXRhIGNvbnRleHQuXG5cdC8vIHRtcGwgY2FuIGJlIGEgc3RyaW5nIChlLmcuIHJlbmRlcmVkIGJ5IGEgdGFnLnJlbmRlcigpIG1ldGhvZCksIG9yIGEgY29tcGlsZWQgdGVtcGxhdGUuXG5cdHZhciBpLCBsLCBuZXdWaWV3LCBjaGlsZFZpZXcsIGl0ZW1SZXN1bHQsIHN3YXBDb250ZW50LCBjb250ZW50VG1wbCwgb3V0ZXJPblJlbmRlciwgdG1wbE5hbWUsIGl0ZW1WYXIsIG5ld0N0eCwgdGFnQ3R4LFxuXHRcdHJlc3VsdCA9IFwiXCI7XG5cblx0aWYgKHRhZykge1xuXHRcdC8vIFRoaXMgaXMgYSBjYWxsIGZyb20gcmVuZGVyVGFnIG9yIHRhZ0N0eC5yZW5kZXIoLi4uKVxuXHRcdHRtcGxOYW1lID0gdGFnLnRhZ05hbWU7XG5cdFx0dGFnQ3R4ID0gdGFnLnRhZ0N0eDtcblx0XHRjb250ZXh0ID0gY29udGV4dCA/IGV4dGVuZEN0eChjb250ZXh0LCB0YWcuY3R4KSA6IHRhZy5jdHg7XG5cblx0XHRpZiAodG1wbCA9PT0gdmlldy5jb250ZW50KSB7IC8vIHt7eHh4IHRtcGw9I2NvbnRlbnR9fVxuXHRcdFx0Y29udGVudFRtcGwgPSB0bXBsICE9PSB2aWV3LmN0eC5fd3JwIC8vIFdlIGFyZSByZW5kZXJpbmcgdGhlICNjb250ZW50XG5cdFx0XHRcdD8gdmlldy5jdHguX3dycCAvLyAjY29udGVudCB3YXMgdGhlIHRhZ0N0eC5wcm9wcy50bXBsIHdyYXBwZXIgb2YgdGhlIGJsb2NrIGNvbnRlbnQgLSBzbyB3aXRoaW4gdGhpcyB2aWV3LCAjY29udGVudCB3aWxsIG5vdyBiZSB0aGUgdmlldy5jdHguX3dycCBibG9jayBjb250ZW50XG5cdFx0XHRcdDogdW5kZWZpbmVkOyAvLyAjY29udGVudCB3YXMgdGhlIHZpZXcuY3R4Ll93cnAgYmxvY2sgY29udGVudCAtIHNvIHdpdGhpbiB0aGlzIHZpZXcsIHRoZXJlIGlzIG5vIGxvbmdlciBhbnkgI2NvbnRlbnQgdG8gd3JhcC5cblx0XHR9IGVsc2UgaWYgKHRtcGwgIT09IHRhZ0N0eC5jb250ZW50KSB7XG5cdFx0XHRpZiAodG1wbCA9PT0gdGFnLnRlbXBsYXRlKSB7IC8vIFJlbmRlcmluZyB7e3RhZ319IHRhZy50ZW1wbGF0ZSwgcmVwbGFjaW5nIGJsb2NrIGNvbnRlbnQuXG5cdFx0XHRcdGNvbnRlbnRUbXBsID0gdGFnQ3R4LnRtcGw7IC8vIFNldCAjY29udGVudCB0byBibG9jayBjb250ZW50IChvciB3cmFwcGVkIGJsb2NrIGNvbnRlbnQgaWYgdGFnQ3R4LnByb3BzLnRtcGwgaXMgc2V0KVxuXHRcdFx0XHRjb250ZXh0Ll93cnAgPSB0YWdDdHguY29udGVudDsgLy8gUGFzcyB3cmFwcGVkIGJsb2NrIGNvbnRlbnQgdG8gbmVzdGVkIHZpZXdzXG5cdFx0XHR9IGVsc2UgeyAvLyBSZW5kZXJpbmcgdGFnQ3R4LnByb3BzLnRtcGwgd3JhcHBlclxuXHRcdFx0XHRjb250ZW50VG1wbCA9IHRhZ0N0eC5jb250ZW50IHx8IHZpZXcuY29udGVudDsgLy8gU2V0ICNjb250ZW50IHRvIHdyYXBwZWQgYmxvY2sgY29udGVudFxuXHRcdFx0fVxuXHRcdH0gZWxzZSB7XG5cdFx0XHRjb250ZW50VG1wbCA9IHZpZXcuY29udGVudDsgLy8gTmVzdGVkIHZpZXdzIGluaGVyaXQgc2FtZSB3cmFwcGVkICNjb250ZW50IHByb3BlcnR5XG5cdFx0fVxuXG5cdFx0aWYgKHRhZ0N0eC5wcm9wcy5saW5rID09PSBmYWxzZSkge1xuXHRcdFx0Ly8gbGluaz1mYWxzZSBzZXR0aW5nIG9uIGJsb2NrIHRhZ1xuXHRcdFx0Ly8gV2Ugd2lsbCBvdmVycmlkZSBpbmhlcml0ZWQgdmFsdWUgb2YgbGluayBieSB0aGUgZXhwbGljaXQgc2V0dGluZyBsaW5rPWZhbHNlIHRha2VuIGZyb20gcHJvcHNcblx0XHRcdC8vIFRoZSBjaGlsZCB2aWV3cyBvZiBhbiB1bmxpbmtlZCB2aWV3IGFyZSBhbHNvIHVubGlua2VkLiBTbyBzZXR0aW5nIGNoaWxkIGJhY2sgdG8gdHJ1ZSB3aWxsIG5vdCBoYXZlIGFueSBlZmZlY3QuXG5cdFx0XHRjb250ZXh0ID0gY29udGV4dCB8fCB7fTtcblx0XHRcdGNvbnRleHQubGluayA9IGZhbHNlO1xuXHRcdH1cblxuXHRcdGlmIChpdGVtVmFyID0gdGFnQ3R4LnByb3BzLml0ZW1WYXIpIHtcblx0XHRcdGlmIChpdGVtVmFyLmNoYXJBdCgwKSAhPT0gXCJ+XCIpIHtcblx0XHRcdFx0c3ludGF4RXJyb3IoXCJVc2UgaXRlbVZhcj0nfm15SXRlbSdcIik7XG5cdFx0XHR9XG5cdFx0XHRpdGVtVmFyID0gaXRlbVZhci5zbGljZSgxKTtcblx0XHR9XG5cdH1cblxuXHRpZiAodmlldykge1xuXHRcdG9uUmVuZGVyID0gb25SZW5kZXIgfHwgdmlldy5fLm9uUmVuZGVyO1xuXHRcdGNvbnRleHQgPSBleHRlbmRDdHgoY29udGV4dCwgdmlldy5jdHgpO1xuXHR9XG5cblx0aWYgKGtleSA9PT0gdHJ1ZSkge1xuXHRcdHN3YXBDb250ZW50ID0gdHJ1ZTtcblx0XHRrZXkgPSAwO1xuXHR9XG5cblx0Ly8gSWYgbGluaz09PWZhbHNlLCBkbyBub3QgY2FsbCBvblJlbmRlciwgc28gbm8gZGF0YS1saW5raW5nIG1hcmtlciBub2Rlc1xuXHRpZiAob25SZW5kZXIgJiYgKGNvbnRleHQgJiYgY29udGV4dC5saW5rID09PSBmYWxzZSB8fCB0YWcgJiYgdGFnLl8ubm9Wd3MpKSB7XG5cdFx0b25SZW5kZXIgPSB1bmRlZmluZWQ7XG5cdH1cblx0b3V0ZXJPblJlbmRlciA9IG9uUmVuZGVyO1xuXHRpZiAob25SZW5kZXIgPT09IHRydWUpIHtcblx0XHQvLyBVc2VkIGJ5IHZpZXcucmVmcmVzaCgpLiBEb24ndCBjcmVhdGUgYSBuZXcgd3JhcHBlciB2aWV3LlxuXHRcdG91dGVyT25SZW5kZXIgPSB1bmRlZmluZWQ7XG5cdFx0b25SZW5kZXIgPSB2aWV3Ll8ub25SZW5kZXI7XG5cdH1cblx0Ly8gU2V0IGFkZGl0aW9uYWwgY29udGV4dCBvbiB2aWV3cyBjcmVhdGVkIGhlcmUsIChhcyBtb2RpZmllZCBjb250ZXh0IGluaGVyaXRlZCBmcm9tIHRoZSBwYXJlbnQsIGFuZCB0byBiZSBpbmhlcml0ZWQgYnkgY2hpbGQgdmlld3MpXG5cdGNvbnRleHQgPSB0bXBsLmhlbHBlcnNcblx0XHQ/IGV4dGVuZEN0eCh0bXBsLmhlbHBlcnMsIGNvbnRleHQpXG5cdFx0OiBjb250ZXh0O1xuXG5cdG5ld0N0eCA9IGNvbnRleHQ7XG5cdGlmICgkaXNBcnJheShkYXRhKSAmJiAhbm9JdGVyYXRpb24pIHtcblx0XHQvLyBDcmVhdGUgYSB2aWV3IGZvciB0aGUgYXJyYXksIHdob3NlIGNoaWxkIHZpZXdzIGNvcnJlc3BvbmQgdG8gZWFjaCBkYXRhIGl0ZW0uIChOb3RlOiBpZiBrZXkgYW5kIHZpZXcgYXJlIHBhc3NlZCBpblxuXHRcdC8vIGFsb25nIHdpdGggcGFyZW50IHZpZXcsIHRyZWF0IGFzIGluc2VydCAtZS5nLiBmcm9tIHZpZXcuYWRkVmlld3MgLSBzbyB2aWV3IGlzIGFscmVhZHkgdGhlIHZpZXcgaXRlbSBmb3IgYXJyYXkpXG5cdFx0bmV3VmlldyA9IHN3YXBDb250ZW50XG5cdFx0XHQ/IHZpZXdcblx0XHRcdDogKGtleSAhPT0gdW5kZWZpbmVkICYmIHZpZXcpXG5cdFx0XHRcdHx8IG5ldyBWaWV3KGNvbnRleHQsIFwiYXJyYXlcIiwgdmlldywgZGF0YSwgdG1wbCwga2V5LCBvblJlbmRlciwgY29udGVudFRtcGwpO1xuXHRcdGlmICh2aWV3ICYmIHZpZXcuXy51c2VLZXkpIHtcblx0XHRcdC8vIFBhcmVudCBpcyBub3QgYW4gJ2FycmF5IHZpZXcnXG5cdFx0XHRuZXdWaWV3Ll8uYm5kID0gIXRhZyB8fCB0YWcuXy5ibmQgJiYgdGFnOyAvLyBGb3IgYXJyYXkgdmlld3MgdGhhdCBhcmUgZGF0YSBib3VuZCBmb3IgY29sbGVjdGlvbiBjaGFuZ2UgZXZlbnRzLCBzZXQgdGhlXG5cdFx0XHQvLyB2aWV3Ll8uYm5kIHByb3BlcnR5IHRvIHRydWUgZm9yIHRvcC1sZXZlbCBsaW5rKCkgb3IgZGF0YS1saW5rPVwie2Zvcn1cIiwgb3IgdG8gdGhlIHRhZyBpbnN0YW5jZSBmb3IgYSBkYXRhLWJvdW5kIHRhZywgZS5nLiB7Xntmb3IgLi4ufX1cblx0XHR9XG5cdFx0Zm9yIChpID0gMCwgbCA9IGRhdGEubGVuZ3RoOyBpIDwgbDsgaSsrKSB7XG5cdFx0XHQvLyBDcmVhdGUgYSB2aWV3IGZvciBlYWNoIGRhdGEgaXRlbS5cblx0XHRcdGlmIChpdGVtVmFyKSB7XG5cdFx0XHRcdHNldEl0ZW1WYXIoZGF0YVtpXSk7IC8vIHVzZSBtb2RpZmllZCBjdHggd2l0aCB1c2VyLW5hbWVkIH5pdGVtXG5cdFx0XHR9XG5cdFx0XHRjaGlsZFZpZXcgPSBuZXcgVmlldyhuZXdDdHgsIFwiaXRlbVwiLCBuZXdWaWV3LCBkYXRhW2ldLCB0bXBsLCAoa2V5IHx8IDApICsgaSwgb25SZW5kZXIsIG5ld1ZpZXcuY29udGVudCk7XG5cdFx0XHRjaGlsZFZpZXcuXy5pdCA9IGl0ZW1WYXI7XG5cblx0XHRcdGl0ZW1SZXN1bHQgPSB0bXBsLmZuKGRhdGFbaV0sIGNoaWxkVmlldywgJHN1Yik7XG5cdFx0XHRyZXN1bHQgKz0gbmV3Vmlldy5fLm9uUmVuZGVyID8gbmV3Vmlldy5fLm9uUmVuZGVyKGl0ZW1SZXN1bHQsIGNoaWxkVmlldykgOiBpdGVtUmVzdWx0O1xuXHRcdH1cblx0fSBlbHNlIHtcblx0XHQvLyBDcmVhdGUgYSB2aWV3IGZvciBzaW5nbGV0b24gZGF0YSBvYmplY3QuIFRoZSB0eXBlIG9mIHRoZSB2aWV3IHdpbGwgYmUgdGhlIHRhZyBuYW1lLCBlLmcuIFwiaWZcIiBvciBcIm15VGFnXCIgZXhjZXB0IGZvclxuXHRcdC8vIFwiaXRlbVwiLCBcImFycmF5XCIgYW5kIFwiZGF0YVwiIHZpZXdzLiBBIFwiZGF0YVwiIHZpZXcgaXMgZnJvbSBwcm9ncmFtbWF0aWMgcmVuZGVyKG9iamVjdCkgYWdhaW5zdCBhICdzaW5nbGV0b24nLlxuXHRcdGlmIChpdGVtVmFyKSB7XG5cdFx0XHRzZXRJdGVtVmFyKGRhdGEpO1xuXHRcdH1cblx0XHRuZXdWaWV3ID0gc3dhcENvbnRlbnQgPyB2aWV3IDogbmV3IFZpZXcobmV3Q3R4LCB0bXBsTmFtZSB8fCBcImRhdGFcIiwgdmlldywgZGF0YSwgdG1wbCwga2V5LCBvblJlbmRlciwgY29udGVudFRtcGwpO1xuXHRcdG5ld1ZpZXcuXy5pdCA9IGl0ZW1WYXI7XG5cdFx0cmVzdWx0ICs9IHRtcGwuZm4oZGF0YSwgbmV3VmlldywgJHN1Yik7XG5cdH1cblx0aWYgKHRhZykge1xuXHRcdG5ld1ZpZXcudGFnID0gdGFnO1xuXHRcdG5ld1ZpZXcudGFnRWxzZSA9IHRhZ0N0eC5pbmRleDtcblx0XHR0YWdDdHguY29udGVudFZpZXcgPSBuZXdWaWV3O1xuXHR9XG5cdHJldHVybiBvdXRlck9uUmVuZGVyID8gb3V0ZXJPblJlbmRlcihyZXN1bHQsIG5ld1ZpZXcpIDogcmVzdWx0O1xufVxuXG4vLz09PT09PT09PT09PT09PT09PT09PT09PT09PVxuLy8gQnVpbGQgYW5kIGNvbXBpbGUgdGVtcGxhdGVcbi8vPT09PT09PT09PT09PT09PT09PT09PT09PT09XG5cbi8vIEdlbmVyYXRlIGEgcmV1c2FibGUgZnVuY3Rpb24gdGhhdCB3aWxsIHNlcnZlIHRvIHJlbmRlciBhIHRlbXBsYXRlIGFnYWluc3QgZGF0YVxuLy8gKENvbXBpbGUgQVNUIHRoZW4gYnVpbGQgdGVtcGxhdGUgZnVuY3Rpb24pXG5cbmZ1bmN0aW9uIG9uUmVuZGVyRXJyb3IoZSwgdmlldywgZmFsbGJhY2spIHtcblx0dmFyIG1lc3NhZ2UgPSBmYWxsYmFjayAhPT0gdW5kZWZpbmVkXG5cdFx0PyAkaXNGdW5jdGlvbihmYWxsYmFjaylcblx0XHRcdD8gZmFsbGJhY2suY2FsbCh2aWV3LmRhdGEsIGUsIHZpZXcpXG5cdFx0XHQ6IGZhbGxiYWNrIHx8IFwiXCJcblx0XHQ6IFwie0Vycm9yOiBcIiArIChlLm1lc3NhZ2V8fGUpICsgXCJ9XCI7XG5cblx0aWYgKCRzdWJTZXR0aW5ncy5vbkVycm9yICYmIChmYWxsYmFjayA9ICRzdWJTZXR0aW5ncy5vbkVycm9yLmNhbGwodmlldy5kYXRhLCBlLCBmYWxsYmFjayAmJiBtZXNzYWdlLCB2aWV3KSkgIT09IHVuZGVmaW5lZCkge1xuXHRcdG1lc3NhZ2UgPSBmYWxsYmFjazsgLy8gVGhlcmUgaXMgYSBzZXR0aW5ncy5kZWJ1Z01vZGUoaGFuZGxlcikgb25FcnJvciBvdmVycmlkZS4gQ2FsbCBpdCwgYW5kIHVzZSByZXR1cm4gdmFsdWUgKGlmIGFueSkgdG8gcmVwbGFjZSBtZXNzYWdlXG5cdH1cblxuXHRyZXR1cm4gdmlldyAmJiAhdmlldy5saW5rQ3R4ID8gJGNvbnZlcnRlcnMuaHRtbChtZXNzYWdlKSA6IG1lc3NhZ2U7XG59XG5cbmZ1bmN0aW9uIGVycm9yKG1lc3NhZ2UpIHtcblx0dGhyb3cgbmV3ICRzdWIuRXJyKG1lc3NhZ2UpO1xufVxuXG5mdW5jdGlvbiBzeW50YXhFcnJvcihtZXNzYWdlKSB7XG5cdGVycm9yKFwiU3ludGF4IGVycm9yXFxuXCIgKyBtZXNzYWdlKTtcbn1cblxuZnVuY3Rpb24gdG1wbEZuKG1hcmt1cCwgdG1wbCwgaXNMaW5rRXhwciwgY29udmVydEJhY2ssIGhhc0Vsc2UpIHtcblx0Ly8gQ29tcGlsZSBtYXJrdXAgdG8gQVNUIChhYnRyYWN0IHN5bnRheCB0cmVlKSB0aGVuIGJ1aWxkIHRoZSB0ZW1wbGF0ZSBmdW5jdGlvbiBjb2RlIGZyb20gdGhlIEFTVCBub2Rlc1xuXHQvLyBVc2VkIGZvciBjb21waWxpbmcgdGVtcGxhdGVzLCBhbmQgYWxzbyBieSBKc1ZpZXdzIHRvIGJ1aWxkIGZ1bmN0aW9ucyBmb3IgZGF0YSBsaW5rIGV4cHJlc3Npb25zXG5cblx0Ly89PT09IG5lc3RlZCBmdW5jdGlvbnMgPT09PVxuXHRmdW5jdGlvbiBwdXNocHJlY2VkaW5nQ29udGVudChzaGlmdCkge1xuXHRcdHNoaWZ0IC09IGxvYztcblx0XHRpZiAoc2hpZnQpIHtcblx0XHRcdGNvbnRlbnQucHVzaChtYXJrdXAuc3Vic3RyKGxvYywgc2hpZnQpLnJlcGxhY2Uock5ld0xpbmUsIFwiXFxcXG5cIikpO1xuXHRcdH1cblx0fVxuXG5cdGZ1bmN0aW9uIGJsb2NrVGFnQ2hlY2sodGFnTmFtZSwgYmxvY2spIHtcblx0XHRpZiAodGFnTmFtZSkge1xuXHRcdFx0dGFnTmFtZSArPSAnfX0nO1xuXHRcdFx0Ly9cdFx0XHQne3tpbmNsdWRlfX0gYmxvY2sgaGFzIHt7L2Zvcn19IHdpdGggbm8gb3BlbiB7e2Zvcn19J1xuXHRcdFx0c3ludGF4RXJyb3IoKFxuXHRcdFx0XHRibG9ja1xuXHRcdFx0XHRcdD8gJ3t7JyArIGJsb2NrICsgJ319IGJsb2NrIGhhcyB7ey8nICsgdGFnTmFtZSArICcgd2l0aG91dCB7eycgKyB0YWdOYW1lXG5cdFx0XHRcdFx0OiAnVW5tYXRjaGVkIG9yIG1pc3Npbmcge3svJyArIHRhZ05hbWUpICsgJywgaW4gdGVtcGxhdGU6XFxuJyArIG1hcmt1cCk7XG5cdFx0fVxuXHR9XG5cblx0ZnVuY3Rpb24gcGFyc2VUYWcoYWxsLCBiaW5kLCB0YWdOYW1lLCBjb252ZXJ0ZXIsIGNvbG9uLCBodG1sLCBjb2RlVGFnLCBwYXJhbXMsIHNsYXNoLCBiaW5kMiwgY2xvc2VCbG9jaywgaW5kZXgpIHtcbi8qXG5cbiAgICAgYmluZCAgICAgdGFnTmFtZSAgICAgICAgIGN2dCAgIGNsbiBodG1sIGNvZGUgICAgcGFyYW1zICAgICAgICAgICAgc2xhc2ggICBiaW5kMiAgICAgICAgIGNsb3NlQmxrICBjb21tZW50XG4vKD86eyhcXF4pP3soPzooXFx3Kyg/PVtcXC9cXHN9XSkpfChcXHcrKT8oOil8KD4pfChcXCopKVxccyooKD86W159XXx9KD8hfSkpKj8pKFxcLyk/fHsoXFxeKT97KD86KD86XFwvKFxcdyspKVxccyp8IS0tW1xcc1xcU10qPy0tKSl9fS9nXG5cbig/OlxuICB7KFxcXik/eyAgICAgICAgICAgIGJpbmRcbiAgKD86XG4gICAgKFxcdysgICAgICAgICAgICAgdGFnTmFtZVxuICAgICAgKD89W1xcL1xcc31dKVxuICAgIClcbiAgICB8XG4gICAgKFxcdyspPyg6KSAgICAgICAgY29udmVydGVyIGNvbG9uXG4gICAgfFxuICAgICg+KSAgICAgICAgICAgICAgaHRtbFxuICAgIHxcbiAgICAoXFwqKSAgICAgICAgICAgICBjb2RlVGFnXG4gIClcbiAgXFxzKlxuICAoICAgICAgICAgICAgICAgICAgcGFyYW1zXG4gICAgKD86W159XXx9KD8hfSkpKj9cbiAgKVxuICAoXFwvKT8gICAgICAgICAgICAgIHNsYXNoXG4gIHxcbiAgeyhcXF4pP3sgICAgICAgICAgICBiaW5kMlxuICAoPzpcbiAgICAoPzpcXC8oXFx3KykpXFxzKiAgIGNsb3NlQmxvY2tcbiAgICB8XG4gICAgIS0tW1xcc1xcU10qPy0tICAgIGNvbW1lbnRcbiAgKVxuKVxufX0vZ1xuXG4qL1xuXHRcdGlmIChjb2RlVGFnICYmIGJpbmQgfHwgc2xhc2ggJiYgIXRhZ05hbWUgfHwgcGFyYW1zICYmIHBhcmFtcy5zbGljZSgtMSkgPT09IFwiOlwiIHx8IGJpbmQyKSB7XG5cdFx0XHRzeW50YXhFcnJvcihhbGwpO1xuXHRcdH1cblxuXHRcdC8vIEJ1aWxkIGFic3RyYWN0IHN5bnRheCB0cmVlIChBU1QpOiBbdGFnTmFtZSwgY29udmVydGVyLCBwYXJhbXMsIGNvbnRlbnQsIGhhc2gsIGJpbmRpbmdzLCBjb250ZW50TWFya3VwXVxuXHRcdGlmIChodG1sKSB7XG5cdFx0XHRjb2xvbiA9IFwiOlwiO1xuXHRcdFx0Y29udmVydGVyID0gSFRNTDtcblx0XHR9XG5cdFx0c2xhc2ggPSBzbGFzaCB8fCBpc0xpbmtFeHByICYmICFoYXNFbHNlO1xuXG5cdFx0dmFyIGxhdGUsXG5cdFx0XHRwYXRoQmluZGluZ3MgPSAoYmluZCB8fCBpc0xpbmtFeHByKSAmJiBbW11dLCAvLyBwYXRoQmluZGluZ3MgaXMgYW4gYXJyYXkgb2YgYXJyYXlzIGZvciBhcmcgYmluZGluZ3MgYW5kIGEgaGFzaCBvZiBhcnJheXMgZm9yIHByb3AgYmluZGluZ3Ncblx0XHRcdHByb3BzID0gXCJcIixcblx0XHRcdGFyZ3MgPSBcIlwiLFxuXHRcdFx0Y3R4UHJvcHMgPSBcIlwiLFxuXHRcdFx0cGFyYW1zQXJncyA9IFwiXCIsXG5cdFx0XHRwYXJhbXNQcm9wcyA9IFwiXCIsXG5cdFx0XHRwYXJhbXNDdHhQcm9wcyA9IFwiXCIsXG5cdFx0XHRvbkVycm9yID0gXCJcIixcblx0XHRcdHVzZVRyaWdnZXIgPSBcIlwiLFxuXHRcdFx0Ly8gQmxvY2sgdGFnIGlmIG5vdCBzZWxmLWNsb3NpbmcgYW5kIG5vdCB7ezp9fSBvciB7ez59fSAoc3BlY2lhbCBjYXNlKSBhbmQgbm90IGEgZGF0YS1saW5rIGV4cHJlc3Npb25cblx0XHRcdGJsb2NrID0gIXNsYXNoICYmICFjb2xvbjtcblxuXHRcdC8vPT09PSBuZXN0ZWQgaGVscGVyIGZ1bmN0aW9uID09PT1cblx0XHR0YWdOYW1lID0gdGFnTmFtZSB8fCAocGFyYW1zID0gcGFyYW1zIHx8IFwiI2RhdGFcIiwgY29sb24pOyAvLyB7ezp9fSBpcyBlcXVpdmFsZW50IHRvIHt7OiNkYXRhfX1cblx0XHRwdXNocHJlY2VkaW5nQ29udGVudChpbmRleCk7XG5cdFx0bG9jID0gaW5kZXggKyBhbGwubGVuZ3RoOyAvLyBsb2NhdGlvbiBtYXJrZXIgLSBwYXJzZWQgdXAgdG8gaGVyZVxuXHRcdGlmIChjb2RlVGFnKSB7XG5cdFx0XHRpZiAoYWxsb3dDb2RlKSB7XG5cdFx0XHRcdGNvbnRlbnQucHVzaChbXCIqXCIsIFwiXFxuXCIgKyBwYXJhbXMucmVwbGFjZSgvXjovLCBcInJldCs9IFwiKS5yZXBsYWNlKHJVbmVzY2FwZVF1b3RlcywgXCIkMVwiKSArIFwiO1xcblwiXSk7XG5cdFx0XHR9XG5cdFx0fSBlbHNlIGlmICh0YWdOYW1lKSB7XG5cdFx0XHRpZiAodGFnTmFtZSA9PT0gXCJlbHNlXCIpIHtcblx0XHRcdFx0aWYgKHJUZXN0RWxzZUlmLnRlc3QocGFyYW1zKSkge1xuXHRcdFx0XHRcdHN5bnRheEVycm9yKCdmb3IgXCJ7e2Vsc2UgaWYgZXhwcn19XCIgdXNlIFwie3tlbHNlIGV4cHJ9fVwiJyk7XG5cdFx0XHRcdH1cblx0XHRcdFx0cGF0aEJpbmRpbmdzID0gY3VycmVudFs4XSAmJiBbW11dO1xuXHRcdFx0XHRjdXJyZW50WzldID0gbWFya3VwLnN1YnN0cmluZyhjdXJyZW50WzldLCBpbmRleCk7IC8vIGNvbnRlbnRNYXJrdXAgZm9yIGJsb2NrIHRhZ1xuXHRcdFx0XHRjdXJyZW50ID0gc3RhY2sucG9wKCk7XG5cdFx0XHRcdGNvbnRlbnQgPSBjdXJyZW50WzJdO1xuXHRcdFx0XHRibG9jayA9IHRydWU7XG5cdFx0XHR9XG5cdFx0XHRpZiAocGFyYW1zKSB7XG5cdFx0XHRcdC8vIHJlbW92ZSBuZXdsaW5lcyBmcm9tIHRoZSBwYXJhbXMgc3RyaW5nLCB0byBhdm9pZCBjb21waWxlZCBjb2RlIGVycm9ycyBmb3IgdW50ZXJtaW5hdGVkIHN0cmluZ3Ncblx0XHRcdFx0cGFyc2VQYXJhbXMocGFyYW1zLnJlcGxhY2Uock5ld0xpbmUsIFwiIFwiKSwgcGF0aEJpbmRpbmdzLCB0bXBsKVxuXHRcdFx0XHRcdC5yZXBsYWNlKHJCdWlsZEhhc2gsIGZ1bmN0aW9uKGFsbCwgb25lcnJvciwgaXNDdHgsIGtleSwga2V5VG9rZW4sIGtleVZhbHVlLCBhcmcsIHBhcmFtKSB7XG5cdFx0XHRcdFx0XHRrZXkgPSBcIidcIiArIGtleVRva2VuICsgXCInOlwiO1xuXHRcdFx0XHRcdFx0aWYgKGFyZykge1xuXHRcdFx0XHRcdFx0XHRhcmdzICs9IGtleVZhbHVlICsgXCIsXCI7XG5cdFx0XHRcdFx0XHRcdHBhcmFtc0FyZ3MgKz0gXCInXCIgKyBwYXJhbSArIFwiJyxcIjtcblx0XHRcdFx0XHRcdH0gZWxzZSBpZiAoaXNDdHgpIHtcblx0XHRcdFx0XHRcdFx0Y3R4UHJvcHMgKz0ga2V5ICsgJ2ouX2NwKCcgKyBrZXlWYWx1ZSArICcsXCInICsgcGFyYW0gKyAnXCIsdmlldyksJztcblx0XHRcdFx0XHRcdFx0Ly8gQ29tcGlsZWQgY29kZSBmb3IgZXZhbHVhdGluZyB0YWdDdHggb24gYSB0YWcgd2lsbCBoYXZlOiBjdHg6eydmb28nOmouX2NwKGNvbXBpbGVkRXhwciwgXCJleHByXCIsIHZpZXcpfVxuXHRcdFx0XHRcdFx0XHRwYXJhbXNDdHhQcm9wcyArPSBrZXkgKyBcIidcIiArIHBhcmFtICsgXCInLFwiO1xuXHRcdFx0XHRcdFx0fSBlbHNlIGlmIChvbmVycm9yKSB7XG5cdFx0XHRcdFx0XHRcdG9uRXJyb3IgKz0ga2V5VmFsdWU7XG5cdFx0XHRcdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRcdFx0XHRpZiAoa2V5VG9rZW4gPT09IFwidHJpZ2dlclwiKSB7XG5cdFx0XHRcdFx0XHRcdFx0dXNlVHJpZ2dlciArPSBrZXlWYWx1ZTtcblx0XHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdFx0XHRpZiAoa2V5VG9rZW4gPT09IFwibGF0ZVJlbmRlclwiKSB7XG5cdFx0XHRcdFx0XHRcdFx0bGF0ZSA9IDE7IC8vIFJlbmRlciBhZnRlciBmaXJzdCBwYXNzXG5cdFx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHRcdFx0cHJvcHMgKz0ga2V5ICsga2V5VmFsdWUgKyBcIixcIjtcblx0XHRcdFx0XHRcdFx0cGFyYW1zUHJvcHMgKz0ga2V5ICsgXCInXCIgKyBwYXJhbSArIFwiJyxcIjtcblx0XHRcdFx0XHRcdFx0aGFzSGFuZGxlcnMgPSBoYXNIYW5kbGVycyB8fCBySGFzSGFuZGxlcnMudGVzdChrZXlUb2tlbik7XG5cdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0XHRyZXR1cm4gXCJcIjtcblx0XHRcdFx0XHR9KS5zbGljZSgwLCAtMSk7XG5cdFx0XHR9XG5cblx0XHRcdGlmIChwYXRoQmluZGluZ3MgJiYgcGF0aEJpbmRpbmdzWzBdKSB7XG5cdFx0XHRcdHBhdGhCaW5kaW5ncy5wb3AoKTsgLy8gUmVtb3ZlIHRoZSBiaW5kaW5nIHRoYXQgd2FzIHByZXBhcmVkIGZvciBuZXh0IGFyZy4gKFRoZXJlIGlzIGFsd2F5cyBhbiBleHRyYSBvbmUgcmVhZHkpLlxuXHRcdFx0fVxuXG5cdFx0XHRuZXdOb2RlID0gW1xuXHRcdFx0XHRcdHRhZ05hbWUsXG5cdFx0XHRcdFx0Y29udmVydGVyIHx8ICEhY29udmVydEJhY2sgfHwgaGFzSGFuZGxlcnMgfHwgXCJcIixcblx0XHRcdFx0XHRibG9jayAmJiBbXSxcblx0XHRcdFx0XHRwYXJzZWRQYXJhbShwYXJhbXNBcmdzIHx8ICh0YWdOYW1lID09PSBcIjpcIiA/IFwiJyNkYXRhJyxcIiA6IFwiXCIpLCBwYXJhbXNQcm9wcywgcGFyYW1zQ3R4UHJvcHMpLCAvLyB7ezp9fSBlcXVpdmFsZW50IHRvIHt7OiNkYXRhfX1cblx0XHRcdFx0XHRwYXJzZWRQYXJhbShhcmdzIHx8ICh0YWdOYW1lID09PSBcIjpcIiA/IFwiZGF0YSxcIiA6IFwiXCIpLCBwcm9wcywgY3R4UHJvcHMpLFxuXHRcdFx0XHRcdG9uRXJyb3IsXG5cdFx0XHRcdFx0dXNlVHJpZ2dlcixcblx0XHRcdFx0XHRsYXRlLFxuXHRcdFx0XHRcdHBhdGhCaW5kaW5ncyB8fCAwXG5cdFx0XHRcdF07XG5cdFx0XHRjb250ZW50LnB1c2gobmV3Tm9kZSk7XG5cdFx0XHRpZiAoYmxvY2spIHtcblx0XHRcdFx0c3RhY2sucHVzaChjdXJyZW50KTtcblx0XHRcdFx0Y3VycmVudCA9IG5ld05vZGU7XG5cdFx0XHRcdGN1cnJlbnRbOV0gPSBsb2M7IC8vIFN0b3JlIGN1cnJlbnQgbG9jYXRpb24gb2Ygb3BlbiB0YWcsIHRvIGJlIGFibGUgdG8gYWRkIGNvbnRlbnRNYXJrdXAgd2hlbiB3ZSByZWFjaCBjbG9zaW5nIHRhZ1xuXHRcdFx0fVxuXHRcdH0gZWxzZSBpZiAoY2xvc2VCbG9jaykge1xuXHRcdFx0YmxvY2tUYWdDaGVjayhjbG9zZUJsb2NrICE9PSBjdXJyZW50WzBdICYmIGN1cnJlbnRbMF0gIT09IFwiZWxzZVwiICYmIGNsb3NlQmxvY2ssIGN1cnJlbnRbMF0pO1xuXHRcdFx0Y3VycmVudFs5XSA9IG1hcmt1cC5zdWJzdHJpbmcoY3VycmVudFs5XSwgaW5kZXgpOyAvLyBjb250ZW50TWFya3VwIGZvciBibG9jayB0YWdcblx0XHRcdGN1cnJlbnQgPSBzdGFjay5wb3AoKTtcblx0XHR9XG5cdFx0YmxvY2tUYWdDaGVjayghY3VycmVudCAmJiBjbG9zZUJsb2NrKTtcblx0XHRjb250ZW50ID0gY3VycmVudFsyXTtcblx0fVxuXHQvLz09PT0gL2VuZCBvZiBuZXN0ZWQgZnVuY3Rpb25zID09PT1cblxuXHR2YXIgaSwgcmVzdWx0LCBuZXdOb2RlLCBoYXNIYW5kbGVycywgYmluZGluZ3MsXG5cdFx0YWxsb3dDb2RlID0gJHN1YlNldHRpbmdzLmFsbG93Q29kZSB8fCB0bXBsICYmIHRtcGwuYWxsb3dDb2RlXG5cdFx0XHR8fCAkdmlld3NTZXR0aW5ncy5hbGxvd0NvZGUgPT09IHRydWUsIC8vIGluY2x1ZGUgZGlyZWN0IHNldHRpbmcgb2Ygc2V0dGluZ3MuYWxsb3dDb2RlIHRydWUgZm9yIGJhY2t3YXJkIGNvbXBhdCBvbmx5XG5cdFx0YXN0VG9wID0gW10sXG5cdFx0bG9jID0gMCxcblx0XHRzdGFjayA9IFtdLFxuXHRcdGNvbnRlbnQgPSBhc3RUb3AsXG5cdFx0Y3VycmVudCA9IFssLGFzdFRvcF07XG5cblx0aWYgKGFsbG93Q29kZSAmJiB0bXBsLl9pcykge1xuXHRcdHRtcGwuYWxsb3dDb2RlID0gYWxsb3dDb2RlO1xuXHR9XG5cbi8vVE9ET1x0cmVzdWx0ID0gdG1wbEZuc0NhY2hlW21hcmt1cF07IC8vIE9ubHkgY2FjaGUgaWYgdGVtcGxhdGUgaXMgbm90IG5hbWVkIGFuZCBtYXJrdXAgbGVuZ3RoIDwgLi4uLFxuLy9hbmQgdGhlcmUgYXJlIG5vIGJpbmRpbmdzIG9yIHN1YnRlbXBsYXRlcz8/IENvbnNpZGVyIHN0YW5kYXJkIG9wdGltaXphdGlvbiBmb3IgZGF0YS1saW5rPVwiYS5iLmNcIlxuLy9cdFx0aWYgKHJlc3VsdCkge1xuLy9cdFx0XHR0bXBsLmZuID0gcmVzdWx0O1xuLy9cdFx0fSBlbHNlIHtcblxuLy9cdFx0cmVzdWx0ID0gbWFya3VwO1xuXHRpZiAoaXNMaW5rRXhwcikge1xuXHRcdGlmIChjb252ZXJ0QmFjayAhPT0gdW5kZWZpbmVkKSB7XG5cdFx0XHRtYXJrdXAgPSBtYXJrdXAuc2xpY2UoMCwgLWNvbnZlcnRCYWNrLmxlbmd0aCAtIDIpICsgZGVsaW1DbG9zZUNoYXIwO1xuXHRcdH1cblx0XHRtYXJrdXAgPSBkZWxpbU9wZW5DaGFyMCArIG1hcmt1cCArIGRlbGltQ2xvc2VDaGFyMTtcblx0fVxuXG5cdGJsb2NrVGFnQ2hlY2soc3RhY2tbMF0gJiYgc3RhY2tbMF1bMl0ucG9wKClbMF0pO1xuXHQvLyBCdWlsZCB0aGUgQVNUIChhYnN0cmFjdCBzeW50YXggdHJlZSkgdW5kZXIgYXN0VG9wXG5cdG1hcmt1cC5yZXBsYWNlKHJUYWcsIHBhcnNlVGFnKTtcblxuXHRwdXNocHJlY2VkaW5nQ29udGVudChtYXJrdXAubGVuZ3RoKTtcblxuXHRpZiAobG9jID0gYXN0VG9wW2FzdFRvcC5sZW5ndGggLSAxXSkge1xuXHRcdGJsb2NrVGFnQ2hlY2soXCJcIiArIGxvYyAhPT0gbG9jICYmICgrbG9jWzldID09PSBsb2NbOV0pICYmIGxvY1swXSk7XG5cdH1cbi8vXHRcdFx0cmVzdWx0ID0gdG1wbEZuc0NhY2hlW21hcmt1cF0gPSBidWlsZENvZGUoYXN0VG9wLCB0bXBsKTtcbi8vXHRcdH1cblxuXHRpZiAoaXNMaW5rRXhwcikge1xuXHRcdHJlc3VsdCA9IGJ1aWxkQ29kZShhc3RUb3AsIG1hcmt1cCwgaXNMaW5rRXhwcik7XG5cdFx0YmluZGluZ3MgPSBbXTtcblx0XHRpID0gYXN0VG9wLmxlbmd0aDtcblx0XHR3aGlsZSAoaS0tKSB7XG5cdFx0XHRiaW5kaW5ncy51bnNoaWZ0KGFzdFRvcFtpXVs4XSk7IC8vIFdpdGggZGF0YS1saW5rIGV4cHJlc3Npb25zLCBwYXRoQmluZGluZ3MgYXJyYXkgZm9yIHRhZ0N0eFtpXSBpcyBhc3RUb3BbaV1bOF1cblx0XHR9XG5cdFx0c2V0UGF0aHMocmVzdWx0LCBiaW5kaW5ncyk7XG5cdH0gZWxzZSB7XG5cdFx0cmVzdWx0ID0gYnVpbGRDb2RlKGFzdFRvcCwgdG1wbCk7XG5cdH1cblx0cmV0dXJuIHJlc3VsdDtcbn1cblxuZnVuY3Rpb24gc2V0UGF0aHMoZm4sIHBhdGhzQXJyKSB7XG5cdHZhciBrZXksIHBhdGhzLFxuXHRcdGkgPSAwLFxuXHRcdGwgPSBwYXRoc0Fyci5sZW5ndGg7XG5cdGZuLmRlcHMgPSBbXTtcblx0Zm4ucGF0aHMgPSBbXTsgLy8gVGhlIGFycmF5IG9mIHBhdGggYmluZGluZyAoYXJyYXkvZGljdGlvbmFyeSlzIGZvciBlYWNoIHRhZy9lbHNlIGJsb2NrJ3MgYXJncyBhbmQgcHJvcHNcblx0Zm9yICg7IGkgPCBsOyBpKyspIHtcblx0XHRmbi5wYXRocy5wdXNoKHBhdGhzID0gcGF0aHNBcnJbaV0pO1xuXHRcdGZvciAoa2V5IGluIHBhdGhzKSB7XG5cdFx0XHRpZiAoa2V5ICE9PSBcIl9qc3Z0b1wiICYmIHBhdGhzLmhhc093blByb3BlcnR5KGtleSkgJiYgcGF0aHNba2V5XS5sZW5ndGggJiYgIXBhdGhzW2tleV0uc2twKSB7XG5cdFx0XHRcdGZuLmRlcHMgPSBmbi5kZXBzLmNvbmNhdChwYXRoc1trZXldKTsgLy8gZGVwcyBpcyB0aGUgY29uY2F0ZW5hdGlvbiBvZiB0aGUgcGF0aHMgYXJyYXlzIGZvciB0aGUgZGlmZmVyZW50IGJpbmRpbmdzXG5cdFx0XHR9XG5cdFx0fVxuXHR9XG59XG5cbmZ1bmN0aW9uIHBhcnNlZFBhcmFtKGFyZ3MsIHByb3BzLCBjdHgpIHtcblx0cmV0dXJuIFthcmdzLnNsaWNlKDAsIC0xKSwgcHJvcHMuc2xpY2UoMCwgLTEpLCBjdHguc2xpY2UoMCwgLTEpXTtcbn1cblxuZnVuY3Rpb24gcGFyYW1TdHJ1Y3R1cmUocGFydHMsIHR5cGUpIHtcblx0cmV0dXJuICdcXG5cXHQnXG5cdFx0KyAodHlwZVxuXHRcdFx0PyB0eXBlICsgJzp7J1xuXHRcdFx0OiAnJylcblx0XHQrICdhcmdzOlsnICsgcGFydHNbMF0gKyAnXSdcblx0XHQrIChwYXJ0c1sxXSB8fCAhdHlwZVxuXHRcdFx0PyAnLFxcblxcdHByb3BzOnsnICsgcGFydHNbMV0gKyAnfSdcblx0XHRcdDogXCJcIilcblx0XHQrIChwYXJ0c1syXSA/ICcsXFxuXFx0Y3R4OnsnICsgcGFydHNbMl0gKyAnfScgOiBcIlwiKTtcbn1cblxuZnVuY3Rpb24gcGFyc2VQYXJhbXMocGFyYW1zLCBwYXRoQmluZGluZ3MsIHRtcGwpIHtcblxuXHRmdW5jdGlvbiBwYXJzZVRva2VucyhhbGwsIGxmdFBybjAsIGxmdFBybiwgYm91bmQsIHBhdGgsIG9wZXJhdG9yLCBlcnIsIGVxLCBwYXRoMiwgcHJuLCBjb21tYSwgbGZ0UHJuMiwgYXBvcywgcXVvdCwgcnRQcm4sIHJ0UHJuRG90LCBwcm4yLCBzcGFjZSwgaW5kZXgsIGZ1bGwpIHtcblx0Ly8gLyhcXCgpKD89XFxzKlxcKCl8KD86KFsoW10pXFxzKik/KD86KFxcXj8pKCEqP1sjfl0/W1xcdyQuXl0rKT9cXHMqKChcXCtcXCt8LS0pfFxcK3wtfCYmfFxcfFxcfHw9PT18IT09fD09fCE9fDw9fD49fFs8PiUqOj9cXC9dfCg9KSlcXHMqfCghKj9bI35dP1tcXHckLl5dKykoWyhbXSk/KXwoLFxccyopfChcXCg/KVxcXFw/KD86KCcpfChcIikpfCg/OlxccyooKFspXFxdXSkoPz1cXHMqWy5eXXxcXHMqJHxbXihbXSl8WylcXF1dKShbKFtdPykpfChcXHMrKS9nLFxuXHQvLyAgIGxmdFBybjAgICAgICAgIGxmdFBybiAgICAgICAgYm91bmQgICAgICAgICAgICBwYXRoICAgIG9wZXJhdG9yIGVyciAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGVxICAgICAgICAgICAgIHBhdGgyICAgICAgIHBybiAgICBjb21tYSAgIGxmdFBybjIgICBhcG9zIHF1b3QgICAgICBydFBybiBydFBybkRvdCAgICAgICAgICAgICAgICAgICAgICAgIHBybjIgIHNwYWNlXG5cdFx0Ly8gKGxlZnQgcGFyZW4/IGZvbGxvd2VkIGJ5IChwYXRoPyBmb2xsb3dlZCBieSBvcGVyYXRvcikgb3IgKHBhdGggZm9sbG93ZWQgYnkgcGFyZW4/KSkgb3IgY29tbWEgb3IgYXBvcyBvciBxdW90IG9yIHJpZ2h0IHBhcmVuIG9yIHNwYWNlXG5cdFx0ZnVuY3Rpb24gcGFyc2VQYXRoKGFsbFBhdGgsIG5vdCwgb2JqZWN0LCBoZWxwZXIsIHZpZXcsIHZpZXdQcm9wZXJ0eSwgcGF0aFRva2VucywgbGVhZlRva2VuKSB7XG5cdFx0XHQvL3JQYXRoID0gL14oISo/KSg/Om51bGx8dHJ1ZXxmYWxzZXxcXGRbXFxkLl0qfChbXFx3JF0rfFxcLnx+KFtcXHckXSspfCModmlld3woW1xcdyRdKykpPykoW1xcdyQuXl0qPykoPzpbLlteXShbXFx3JF0rKVxcXT8pPykkL2csXG5cdFx0XHQvLyAgICAgICAgICBub3QgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgb2JqZWN0ICAgICBoZWxwZXIgICAgdmlldyAgdmlld1Byb3BlcnR5IHBhdGhUb2tlbnMgICAgICBsZWFmVG9rZW5cblx0XHRcdHZhciBzdWJQYXRoID0gb2JqZWN0ID09PSBcIi5cIjtcblx0XHRcdGlmIChvYmplY3QpIHtcblx0XHRcdFx0cGF0aCA9IHBhdGguc2xpY2Uobm90Lmxlbmd0aCk7XG5cdFx0XHRcdGlmICgvXlxcLj9jb25zdHJ1Y3RvciQvLnRlc3QobGVhZlRva2VufHxwYXRoKSkge1xuXHRcdFx0XHRcdHN5bnRheEVycm9yKGFsbFBhdGgpO1xuXHRcdFx0XHR9XG5cdFx0XHRcdGlmICghc3ViUGF0aCkge1xuXHRcdFx0XHRcdGFsbFBhdGggPSAoaGVscGVyXG5cdFx0XHRcdFx0XHRcdD8gJ3ZpZXcuY3R4UHJtKFwiJyArIGhlbHBlciArICdcIiknXG5cdFx0XHRcdFx0XHRcdDogdmlld1xuXHRcdFx0XHRcdFx0XHRcdD8gXCJ2aWV3XCJcblx0XHRcdFx0XHRcdFx0XHQ6IFwiZGF0YVwiKVxuXHRcdFx0XHRcdFx0KyAobGVhZlRva2VuXG5cdFx0XHRcdFx0XHRcdD8gKHZpZXdQcm9wZXJ0eVxuXHRcdFx0XHRcdFx0XHRcdD8gXCIuXCIgKyB2aWV3UHJvcGVydHlcblx0XHRcdFx0XHRcdFx0XHQ6IGhlbHBlclxuXHRcdFx0XHRcdFx0XHRcdFx0PyBcIlwiXG5cdFx0XHRcdFx0XHRcdFx0XHQ6ICh2aWV3ID8gXCJcIiA6IFwiLlwiICsgb2JqZWN0KVxuXHRcdFx0XHRcdFx0XHRcdCkgKyAocGF0aFRva2VucyB8fCBcIlwiKVxuXHRcdFx0XHRcdFx0XHQ6IChsZWFmVG9rZW4gPSBoZWxwZXIgPyBcIlwiIDogdmlldyA/IHZpZXdQcm9wZXJ0eSB8fCBcIlwiIDogb2JqZWN0LCBcIlwiKSk7XG5cblx0XHRcdFx0XHRhbGxQYXRoID0gYWxsUGF0aCArIChsZWFmVG9rZW4gPyBcIi5cIiArIGxlYWZUb2tlbiA6IFwiXCIpO1xuXG5cdFx0XHRcdFx0YWxsUGF0aCA9IG5vdCArIChhbGxQYXRoLnNsaWNlKDAsIDkpID09PSBcInZpZXcuZGF0YVwiXG5cdFx0XHRcdFx0XHQ/IGFsbFBhdGguc2xpY2UoNSkgLy8gY29udmVydCAjdmlldy5kYXRhLi4uIHRvIGRhdGEuLi5cblx0XHRcdFx0XHRcdDogYWxsUGF0aCk7XG5cdFx0XHRcdH1cblx0XHRcdFx0aWYgKGJpbmRpbmdzKSB7XG5cdFx0XHRcdFx0YmluZHMgPSBuYW1lZCA9PT0gXCJsaW5rVG9cIiA/IChiaW5kdG8gPSBwYXRoQmluZGluZ3MuX2pzdnRvID0gcGF0aEJpbmRpbmdzLl9qc3Z0byB8fCBbXSkgOiBibmRDdHguYmQ7XG5cdFx0XHRcdFx0aWYgKHRoZU9iID0gc3ViUGF0aCAmJiBiaW5kc1tiaW5kcy5sZW5ndGgtMV0pIHtcblx0XHRcdFx0XHRcdGlmICh0aGVPYi5fY3BmbikgeyAvLyBDb21wdXRlZCBwcm9wZXJ0eSBleHByT2Jcblx0XHRcdFx0XHRcdFx0d2hpbGUgKHRoZU9iLnNiKSB7XG5cdFx0XHRcdFx0XHRcdFx0dGhlT2IgPSB0aGVPYi5zYjtcblx0XHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdFx0XHRpZiAodGhlT2IuYm5kKSB7XG5cdFx0XHRcdFx0XHRcdFx0cGF0aCA9IFwiXlwiICsgcGF0aC5zbGljZSgxKTtcblx0XHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdFx0XHR0aGVPYi5zYiA9IHBhdGg7XG5cdFx0XHRcdFx0XHRcdHRoZU9iLmJuZCA9IHRoZU9iLmJuZCB8fCBwYXRoLmNoYXJBdCgwKSA9PT0gXCJeXCI7XG5cdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0XHRcdGJpbmRzLnB1c2gocGF0aCk7XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHRcdHBhdGhTdGFydFtwYXJlbkRlcHRoXSA9IGluZGV4ICsgKHN1YlBhdGggPyAxIDogMCk7XG5cdFx0XHRcdH1cblx0XHRcdH1cblx0XHRcdHJldHVybiBhbGxQYXRoO1xuXHRcdH1cblxuXHRcdC8vYm91bmQgPSBiaW5kaW5ncyAmJiBib3VuZDtcblx0XHRpZiAoYm91bmQgJiYgIWVxKSB7XG5cdFx0XHRwYXRoID0gYm91bmQgKyBwYXRoOyAvLyBlLmcuIHNvbWUuZm4oLi4uKV5zb21lLnBhdGggLSBzbyBoZXJlIHBhdGggaXMgXCJec29tZS5wYXRoXCJcblx0XHR9XG5cdFx0b3BlcmF0b3IgPSBvcGVyYXRvciB8fCBcIlwiO1xuXHRcdGxmdFBybiA9IGxmdFBybiB8fCBsZnRQcm4wIHx8IGxmdFBybjI7XG5cdFx0cGF0aCA9IHBhdGggfHwgcGF0aDI7XG5cdFx0Ly8gQ291bGQgZG8gdGhpcyAtIGJ1dCBub3Qgd29ydGggcGVyZiBjb3N0Pz8gOi1cblx0XHQvLyBpZiAoIXBhdGgubGFzdEluZGV4T2YoXCIjZGF0YS5cIiwgMCkpIHsgcGF0aCA9IHBhdGguc2xpY2UoNik7IH0gLy8gSWYgcGF0aCBzdGFydHMgd2l0aCBcIiNkYXRhLlwiLCByZW1vdmUgdGhhdC5cblx0XHRwcm4gPSBwcm4gfHwgcHJuMiB8fCBcIlwiO1xuXG5cdFx0dmFyIGV4cHIsIGV4cHJGbiwgYmluZHMsIHRoZU9iLCBuZXdPYixcblx0XHRcdHJ0U3EgPSBcIilcIjtcblxuXHRcdGlmIChwcm4gPT09IFwiW1wiKSB7XG5cdFx0XHRwcm4gPVwiW2ouX3NxKFwiO1xuXHRcdFx0cnRTcSA9IFwiKV1cIjtcblx0XHR9XG5cblx0XHRpZiAoZXJyICYmICFhcG9zZWQgJiYgIXF1b3RlZCkge1xuXHRcdFx0c3ludGF4RXJyb3IocGFyYW1zKTtcblx0XHR9IGVsc2Uge1xuXHRcdFx0aWYgKGJpbmRpbmdzICYmIHJ0UHJuRG90ICYmICFhcG9zZWQgJiYgIXF1b3RlZCkge1xuXHRcdFx0XHQvLyBUaGlzIGlzIGEgYmluZGluZyB0byBhIHBhdGggaW4gd2hpY2ggYW4gb2JqZWN0IGlzIHJldHVybmVkIGJ5IGEgaGVscGVyL2RhdGEgZnVuY3Rpb24vZXhwcmVzc2lvbiwgZS5nLiBmb28oKV54Lnkgb3IgKGE/YjpjKV54Lnlcblx0XHRcdFx0Ly8gV2UgY3JlYXRlIGEgY29tcGlsZWQgZnVuY3Rpb24gdG8gZ2V0IHRoZSBvYmplY3QgaW5zdGFuY2UgKHdoaWNoIHdpbGwgYmUgY2FsbGVkIHdoZW4gdGhlIGRlcGVuZGVudCBkYXRhIG9mIHRoZSBzdWJleHByZXNzaW9uIGNoYW5nZXMsIHRvIHJldHVybiB0aGUgbmV3IG9iamVjdCwgYW5kIHRyaWdnZXIgcmUtYmluZGluZyBvZiB0aGUgc3Vic2VxdWVudCBwYXRoKVxuXHRcdFx0XHRpZiAoIW5hbWVkIHx8IGJvdW5kTmFtZSB8fCBiaW5kdG8pIHtcblx0XHRcdFx0XHRleHByID0gcGF0aFN0YXJ0W3BhcmVuRGVwdGggLSAxXTtcblx0XHRcdFx0XHRpZiAoZnVsbC5sZW5ndGggLSAxID4gaW5kZXggLSAoZXhwciB8fCAwKSkgeyAvLyBXZSBuZWVkIHRvIGNvbXBpbGUgYSBzdWJleHByZXNzaW9uXG5cdFx0XHRcdFx0XHRleHByID0gZnVsbC5zbGljZShleHByLCBpbmRleCArIGFsbC5sZW5ndGgpO1xuXHRcdFx0XHRcdFx0aWYgKGV4cHJGbiAhPT0gdHJ1ZSkgeyAvLyBJZiBub3QgcmVlbnRyYW50IGNhbGwgZHVyaW5nIGNvbXBpbGF0aW9uXG5cdFx0XHRcdFx0XHRcdGJpbmRzID0gYmluZHRvIHx8IGJuZFN0YWNrW3BhcmVuRGVwdGgtMV0uYmQ7XG5cdFx0XHRcdFx0XHRcdC8vIEluc2VydCBleHByT2Igb2JqZWN0LCB0byBiZSB1c2VkIGR1cmluZyBiaW5kaW5nIHRvIHJldHVybiB0aGUgY29tcHV0ZWQgb2JqZWN0XG5cdFx0XHRcdFx0XHRcdHRoZU9iID0gYmluZHNbYmluZHMubGVuZ3RoLTFdO1xuXHRcdFx0XHRcdFx0XHRpZiAodGhlT2IgJiYgdGhlT2IucHJtKSB7XG5cdFx0XHRcdFx0XHRcdFx0d2hpbGUgKHRoZU9iLnNiICYmIHRoZU9iLnNiLnBybSkge1xuXHRcdFx0XHRcdFx0XHRcdFx0dGhlT2IgPSB0aGVPYi5zYjtcblx0XHRcdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0XHRcdFx0bmV3T2IgPSB0aGVPYi5zYiA9IHtwYXRoOiB0aGVPYi5zYiwgYm5kOiB0aGVPYi5ibmR9O1xuXHRcdFx0XHRcdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRcdFx0XHRcdGJpbmRzLnB1c2gobmV3T2IgPSB7cGF0aDogYmluZHMucG9wKCl9KTsgLy8gSW5zZXJ0IGV4cHJPYiBvYmplY3QsIHRvIGJlIHVzZWQgZHVyaW5nIGJpbmRpbmcgdG8gcmV0dXJuIHRoZSBjb21wdXRlZCBvYmplY3Rcblx0XHRcdFx0XHRcdFx0fVx0XHRcdFx0XHRcdFx0XHRcdFx0XHQgLy8gKGUuZy4gXCJzb21lLm9iamVjdCgpXCIgaW4gXCJzb21lLm9iamVjdCgpLmEuYlwiIC0gdG8gYmUgdXNlZCBhcyBjb250ZXh0IGZvciBiaW5kaW5nIHRoZSBmb2xsb3dpbmcgdG9rZW5zIFwiYS5iXCIpXG5cdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0XHRydFBybkRvdCA9IGRlbGltT3BlbkNoYXIxICsgXCI6XCIgKyBleHByIC8vIFRoZSBwYXJhbWV0ZXIgb3IgZnVuY3Rpb24gc3ViZXhwcmVzc2lvblxuXHRcdFx0XHRcdFx0XHQrIFwiIG9uZXJyb3I9JydcIiAvLyBzZXQgb25lcnJvcj0nJyBpbiBvcmRlciB0byB3cmFwIGdlbmVyYXRlZCBjb2RlIHdpdGggYSB0cnkgY2F0Y2ggLSByZXR1cm5pbmcgJycgYXMgb2JqZWN0IGluc3RhbmNlIGlmIHRoZXJlIGlzIGFuIGVycm9yL21pc3NpbmcgcGFyZW50XG5cdFx0XHRcdFx0XHRcdCsgZGVsaW1DbG9zZUNoYXIwO1xuXHRcdFx0XHRcdFx0ZXhwckZuID0gdG1wbExpbmtzW3J0UHJuRG90XTtcblx0XHRcdFx0XHRcdGlmICghZXhwckZuKSB7XG5cdFx0XHRcdFx0XHRcdHRtcGxMaW5rc1tydFBybkRvdF0gPSB0cnVlOyAvLyBGbGFnIHRoYXQgdGhpcyBleHByRm4gKGZvciBydFBybkRvdCkgaXMgYmVpbmcgY29tcGlsZWRcblx0XHRcdFx0XHRcdFx0dG1wbExpbmtzW3J0UHJuRG90XSA9IGV4cHJGbiA9IHRtcGxGbihydFBybkRvdCwgdG1wbCwgdHJ1ZSk7IC8vIENvbXBpbGUgdGhlIGV4cHJlc3Npb24gKG9yIHVzZSBjYWNoZWQgY29weSBhbHJlYWR5IGluIHRtcGwubGlua3MpXG5cdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0XHRpZiAoZXhwckZuICE9PSB0cnVlICYmIG5ld09iKSB7XG5cdFx0XHRcdFx0XHRcdC8vIElmIG5vdCByZWVudHJhbnQgY2FsbCBkdXJpbmcgY29tcGlsYXRpb25cblx0XHRcdFx0XHRcdFx0bmV3T2IuX2NwZm4gPSBleHByRm47XG5cdFx0XHRcdFx0XHRcdG5ld09iLnBybSA9IGJuZEN0eC5iZDtcblx0XHRcdFx0XHRcdFx0bmV3T2IuYm5kID0gbmV3T2IuYm5kIHx8IG5ld09iLnBhdGggJiYgbmV3T2IucGF0aC5pbmRleE9mKFwiXlwiKSA+PSAwO1xuXHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdH1cblx0XHRcdFx0fVxuXHRcdFx0fVxuXHRcdFx0cmV0dXJuIChhcG9zZWRcblx0XHRcdFx0Ly8gd2l0aGluIHNpbmdsZS1xdW90ZWQgc3RyaW5nXG5cdFx0XHRcdD8gKGFwb3NlZCA9ICFhcG9zLCAoYXBvc2VkID8gYWxsIDogbGZ0UHJuMiArICdcIicpKVxuXHRcdFx0XHQ6IHF1b3RlZFxuXHRcdFx0XHQvLyB3aXRoaW4gZG91YmxlLXF1b3RlZCBzdHJpbmdcblx0XHRcdFx0XHQ/IChxdW90ZWQgPSAhcXVvdCwgKHF1b3RlZCA/IGFsbCA6IGxmdFBybjIgKyAnXCInKSlcblx0XHRcdFx0XHQ6XG5cdFx0XHRcdChcblx0XHRcdFx0XHQobGZ0UHJuXG5cdFx0XHRcdFx0XHQ/IChwYXRoU3RhcnRbcGFyZW5EZXB0aF0gPSBpbmRleCsrLCBibmRDdHggPSBibmRTdGFja1srK3BhcmVuRGVwdGhdID0ge2JkOiBbXX0sIGxmdFBybilcblx0XHRcdFx0XHRcdDogXCJcIilcblx0XHRcdFx0XHQrIChzcGFjZVxuXHRcdFx0XHRcdFx0PyAocGFyZW5EZXB0aFxuXHRcdFx0XHRcdFx0XHQ/IFwiXCJcblx0XHRcdFx0Ly8gTmV3IGFyZyBvciBwcm9wIC0gc28gaW5zZXJ0IGJhY2tzcGFjZSBcXGIgKFxceDA4KSBhcyBzZXBhcmF0b3IgZm9yIG5hbWVkIHBhcmFtcywgdXNlZCBzdWJzZXF1ZW50bHkgYnkgckJ1aWxkSGFzaCwgYW5kIHByZXBhcmUgbmV3IGJpbmRpbmdzIGFycmF5XG5cdFx0XHRcdFx0XHRcdDogKHBhcmFtSW5kZXggPSBmdWxsLnNsaWNlKHBhcmFtSW5kZXgsIGluZGV4KSwgbmFtZWRcblx0XHRcdFx0XHRcdFx0XHQ/IChuYW1lZCA9IGJvdW5kTmFtZSA9IGJpbmR0byA9IGZhbHNlLCBcIlxcYlwiKVxuXHRcdFx0XHRcdFx0XHRcdDogXCJcXGIsXCIpICsgcGFyYW1JbmRleCArIChwYXJhbUluZGV4ID0gaW5kZXggKyBhbGwubGVuZ3RoLCBiaW5kaW5ncyAmJiBwYXRoQmluZGluZ3MucHVzaChibmRDdHguYmQgPSBbXSksIFwiXFxiXCIpXG5cdFx0XHRcdFx0XHQpXG5cdFx0XHRcdFx0XHQ6IGVxXG5cdFx0XHRcdC8vIG5hbWVkIHBhcmFtLiBSZW1vdmUgYmluZGluZ3MgZm9yIGFyZyBhbmQgY3JlYXRlIGluc3RlYWQgYmluZGluZ3MgYXJyYXkgZm9yIHByb3Bcblx0XHRcdFx0XHRcdFx0PyAocGFyZW5EZXB0aCAmJiBzeW50YXhFcnJvcihwYXJhbXMpLCBiaW5kaW5ncyAmJiBwYXRoQmluZGluZ3MucG9wKCksIG5hbWVkID0gcGF0aCwgYm91bmROYW1lID0gYm91bmQsIHBhcmFtSW5kZXggPSBpbmRleCArIGFsbC5sZW5ndGgsXG5cdFx0XHRcdFx0XHRcdFx0XHRiaW5kaW5ncyAmJiAoKGJpbmRpbmdzID0gYm5kQ3R4LmJkID0gcGF0aEJpbmRpbmdzW25hbWVkXSA9IFtdKSwgYmluZGluZ3Muc2twID0gIWJvdW5kKSwgcGF0aCArICc6Jylcblx0XHRcdFx0XHRcdFx0OiBwYXRoXG5cdFx0XHRcdC8vIHBhdGhcblx0XHRcdFx0XHRcdFx0XHQ/IChwYXRoLnNwbGl0KFwiXlwiKS5qb2luKFwiLlwiKS5yZXBsYWNlKHJQYXRoLCBwYXJzZVBhdGgpXG5cdFx0XHRcdFx0XHRcdFx0XHQrIChwcm5cblx0XHRcdFx0Ly8gc29tZS5mbmNhbGwoXG5cdFx0XHRcdFx0XHRcdFx0XHRcdD8gKGJuZEN0eCA9IGJuZFN0YWNrWysrcGFyZW5EZXB0aF0gPSB7YmQ6IFtdfSwgZm5DYWxsW3BhcmVuRGVwdGhdID0gcnRTcSwgcHJuKVxuXHRcdFx0XHRcdFx0XHRcdFx0XHQ6IG9wZXJhdG9yKVxuXHRcdFx0XHRcdFx0XHRcdClcblx0XHRcdFx0XHRcdFx0XHQ6IG9wZXJhdG9yXG5cdFx0XHRcdC8vIG9wZXJhdG9yXG5cdFx0XHRcdFx0XHRcdFx0XHQ/IG9wZXJhdG9yXG5cdFx0XHRcdFx0XHRcdFx0XHQ6IHJ0UHJuXG5cdFx0XHRcdC8vIGZ1bmN0aW9uXG5cdFx0XHRcdFx0XHRcdFx0XHRcdD8gKChydFBybiA9IGZuQ2FsbFtwYXJlbkRlcHRoXSB8fCBydFBybiwgZm5DYWxsW3BhcmVuRGVwdGhdID0gZmFsc2UsIGJuZEN0eCA9IGJuZFN0YWNrWy0tcGFyZW5EZXB0aF0sIHJ0UHJuKVxuXHRcdFx0XHRcdFx0XHRcdFx0XHRcdCsgKHBybiAvLyBydFBybiBhbmQgcHJuLCBlLmcgKSggaW4gKGEpKCkgb3IgYSgpKCksIG9yIClbIGluIGEoKVtdXG5cdFx0XHRcdFx0XHRcdFx0XHRcdFx0XHQ/IChibmRDdHggPSBibmRTdGFja1srK3BhcmVuRGVwdGhdLCBmbkNhbGxbcGFyZW5EZXB0aF0gPSBydFNxLCBwcm4pXG5cdFx0XHRcdFx0XHRcdFx0XHRcdFx0XHQ6IFwiXCIpXG5cdFx0XHRcdFx0XHRcdFx0XHRcdClcblx0XHRcdFx0XHRcdFx0XHRcdFx0OiBjb21tYVxuXHRcdFx0XHRcdFx0XHRcdFx0XHRcdD8gKGZuQ2FsbFtwYXJlbkRlcHRoXSB8fCBzeW50YXhFcnJvcihwYXJhbXMpLCBcIixcIikgLy8gV2UgZG9uJ3QgYWxsb3cgdG9wLWxldmVsIGxpdGVyYWwgYXJyYXlzIG9yIG9iamVjdHNcblx0XHRcdFx0XHRcdFx0XHRcdFx0XHQ6IGxmdFBybjBcblx0XHRcdFx0XHRcdFx0XHRcdFx0XHRcdD8gXCJcIlxuXHRcdFx0XHRcdFx0XHRcdFx0XHRcdFx0OiAoYXBvc2VkID0gYXBvcywgcXVvdGVkID0gcXVvdCwgJ1wiJylcblx0XHRcdFx0KSlcblx0XHRcdCk7XG5cdFx0fVxuXHR9XG5cblx0dmFyIG5hbWVkLCBiaW5kdG8sIGJvdW5kTmFtZSxcblx0XHRxdW90ZWQsIC8vIGJvb2xlYW4gZm9yIHN0cmluZyBjb250ZW50IGluIGRvdWJsZSBxdW90ZXNcblx0XHRhcG9zZWQsIC8vIG9yIGluIHNpbmdsZSBxdW90ZXNcblx0XHRiaW5kaW5ncyA9IHBhdGhCaW5kaW5ncyAmJiBwYXRoQmluZGluZ3NbMF0sIC8vIGJpbmRpbmdzIGFycmF5IGZvciB0aGUgZmlyc3QgYXJnXG5cdFx0Ym5kQ3R4ID0ge2JkOiBiaW5kaW5nc30sXG5cdFx0Ym5kU3RhY2sgPSB7MDogYm5kQ3R4fSxcblx0XHRwYXJhbUluZGV4ID0gMCwgLy8gbGlzdCxcblx0XHR0bXBsTGlua3MgPSAodG1wbCA/IHRtcGwubGlua3MgOiBiaW5kaW5ncyAmJiAoYmluZGluZ3MubGlua3MgPSBiaW5kaW5ncy5saW5rcyB8fCB7fSkpIHx8IHRvcFZpZXcudG1wbC5saW5rcyxcblx0XHQvLyBUaGUgZm9sbG93aW5nIGFyZSB1c2VkIGZvciB0cmFja2luZyBwYXRoIHBhcnNpbmcgaW5jbHVkaW5nIG5lc3RlZCBwYXRocywgc3VjaCBhcyBcImEuYihjXmQgKyAoZSkpXmZcIiwgYW5kIGNoYWluZWQgY29tcHV0ZWQgcGF0aHMgc3VjaCBhc1xuXHRcdC8vIFwiYS5iKCkuY15kKCkuZS5mKCkuZ1wiIC0gd2hpY2ggaGFzIGZvdXIgY2hhaW5lZCBwYXRocywgXCJhLmIoKVwiLCBcIl5jLmQoKVwiLCBcIi5lLmYoKVwiIGFuZCBcIi5nXCJcblx0XHRwYXJlbkRlcHRoID0gMCxcblx0XHRmbkNhbGwgPSB7fSwgLy8gV2UgYXJlIGluIGEgZnVuY3Rpb24gY2FsbFxuXHRcdHBhdGhTdGFydCA9IHt9LCAvLyB0cmFja3MgdGhlIHN0YXJ0IG9mIHRoZSBjdXJyZW50IHBhdGggc3VjaCBhcyBjXmQoKSBpbiB0aGUgYWJvdmUgZXhhbXBsZVxuXHRcdHJlc3VsdCA9IChwYXJhbXMgKyAodG1wbCA/IFwiIFwiIDogXCJcIikpLnJlcGxhY2UoclBhcmFtcywgcGFyc2VUb2tlbnMpO1xuXG5cdHJldHVybiAhcGFyZW5EZXB0aCAmJiByZXN1bHQgfHwgc3ludGF4RXJyb3IocGFyYW1zKTsgLy8gU3ludGF4IGVycm9yIGlmIHVuYmFsYW5jZWQgcGFyZW5zIGluIHBhcmFtcyBleHByZXNzaW9uXG59XG5cbmZ1bmN0aW9uIGJ1aWxkQ29kZShhc3QsIHRtcGwsIGlzTGlua0V4cHIpIHtcblx0Ly8gQnVpbGQgdGhlIHRlbXBsYXRlIGZ1bmN0aW9uIGNvZGUgZnJvbSB0aGUgQVNUIG5vZGVzLCBhbmQgc2V0IGFzIHByb3BlcnR5IG9uIHRoZSBwYXNzZWQtaW4gdGVtcGxhdGUgb2JqZWN0XG5cdC8vIFVzZWQgZm9yIGNvbXBpbGluZyB0ZW1wbGF0ZXMsIGFuZCBhbHNvIGJ5IEpzVmlld3MgdG8gYnVpbGQgZnVuY3Rpb25zIGZvciBkYXRhIGxpbmsgZXhwcmVzc2lvbnNcblx0dmFyIGksIG5vZGUsIHRhZ05hbWUsIGNvbnZlcnRlciwgdGFnQ3R4LCBoYXNUYWcsIGhhc0VuY29kZXIsIGdldHNWYWwsIGhhc0NudnQsIHVzZUNudnQsIHRtcGxCaW5kaW5ncywgcGF0aEJpbmRpbmdzLCBwYXJhbXMsIGJvdW5kT25FcnJTdGFydCxcblx0XHRib3VuZE9uRXJyRW5kLCB0YWdSZW5kZXIsIG5lc3RlZFRtcGxzLCB0bXBsTmFtZSwgbmVzdGVkVG1wbCwgdGFnQW5kRWxzZXMsIGNvbnRlbnQsIG1hcmt1cCwgbmV4dElzRWxzZSwgb2xkQ29kZSwgaXNFbHNlLCBpc0dldFZhbCwgdGFnQ3R4Rm4sXG5cdFx0b25FcnJvciwgdGFnU3RhcnQsIHRyaWdnZXIsIGxhdGVSZW5kZXIsXG5cdFx0dG1wbEJpbmRpbmdLZXkgPSAwLFxuXHRcdHVzZVZpZXdzID0gJHN1YlNldHRpbmdzQWR2YW5jZWQudXNlVmlld3MgfHwgdG1wbC51c2VWaWV3cyB8fCB0bXBsLnRhZ3MgfHwgdG1wbC50ZW1wbGF0ZXMgfHwgdG1wbC5oZWxwZXJzIHx8IHRtcGwuY29udmVydGVycyxcblx0XHRjb2RlID0gXCJcIixcblx0XHR0bXBsT3B0aW9ucyA9IHt9LFxuXHRcdGwgPSBhc3QubGVuZ3RoO1xuXG5cdGlmIChcIlwiICsgdG1wbCA9PT0gdG1wbCkge1xuXHRcdHRtcGxOYW1lID0gaXNMaW5rRXhwciA/ICdkYXRhLWxpbms9XCInICsgdG1wbC5yZXBsYWNlKHJOZXdMaW5lLCBcIiBcIikuc2xpY2UoMSwgLTEpICsgJ1wiJyA6IHRtcGw7XG5cdFx0dG1wbCA9IDA7XG5cdH0gZWxzZSB7XG5cdFx0dG1wbE5hbWUgPSB0bXBsLnRtcGxOYW1lIHx8IFwidW5uYW1lZFwiO1xuXHRcdGlmICh0bXBsLmFsbG93Q29kZSkge1xuXHRcdFx0dG1wbE9wdGlvbnMuYWxsb3dDb2RlID0gdHJ1ZTtcblx0XHR9XG5cdFx0aWYgKHRtcGwuZGVidWcpIHtcblx0XHRcdHRtcGxPcHRpb25zLmRlYnVnID0gdHJ1ZTtcblx0XHR9XG5cdFx0dG1wbEJpbmRpbmdzID0gdG1wbC5ibmRzO1xuXHRcdG5lc3RlZFRtcGxzID0gdG1wbC50bXBscztcblx0fVxuXHRmb3IgKGkgPSAwOyBpIDwgbDsgaSsrKSB7XG5cdFx0Ly8gQVNUIG5vZGVzOiBbMDogdGFnTmFtZSwgMTogY29udmVydGVyLCAyOiBjb250ZW50LCAzOiBwYXJhbXMsIDQ6IGNvZGUsIDU6IG9uRXJyb3IsIDY6IHRyaWdnZXIsIDc6cGF0aEJpbmRpbmdzLCA4OiBjb250ZW50TWFya3VwXVxuXHRcdG5vZGUgPSBhc3RbaV07XG5cblx0XHQvLyBBZGQgbmV3bGluZSBmb3IgZWFjaCBjYWxsb3V0IHRvIHQoKSBjKCkgZXRjLiBhbmQgZWFjaCBtYXJrdXAgc3RyaW5nXG5cdFx0aWYgKFwiXCIgKyBub2RlID09PSBub2RlKSB7XG5cdFx0XHQvLyBhIG1hcmt1cCBzdHJpbmcgdG8gYmUgaW5zZXJ0ZWRcblx0XHRcdGNvZGUgKz0gJ1xcbitcIicgKyBub2RlICsgJ1wiJztcblx0XHR9IGVsc2Uge1xuXHRcdFx0Ly8gYSBjb21waWxlZCB0YWcgZXhwcmVzc2lvbiB0byBiZSBpbnNlcnRlZFxuXHRcdFx0dGFnTmFtZSA9IG5vZGVbMF07XG5cdFx0XHRpZiAodGFnTmFtZSA9PT0gXCIqXCIpIHtcblx0XHRcdFx0Ly8gQ29kZSB0YWc6IHt7KiB9fVxuXHRcdFx0XHRjb2RlICs9IFwiO1xcblwiICsgbm9kZVsxXSArIFwiXFxucmV0PXJldFwiO1xuXHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0Y29udmVydGVyID0gbm9kZVsxXTtcblx0XHRcdFx0Y29udGVudCA9ICFpc0xpbmtFeHByICYmIG5vZGVbMl07XG5cdFx0XHRcdHRhZ0N0eCA9IHBhcmFtU3RydWN0dXJlKG5vZGVbM10sICdwYXJhbXMnKSArICd9LCcgKyBwYXJhbVN0cnVjdHVyZShwYXJhbXMgPSBub2RlWzRdKTtcblx0XHRcdFx0b25FcnJvciA9IG5vZGVbNV07XG5cdFx0XHRcdHRyaWdnZXIgPSBub2RlWzZdO1xuXHRcdFx0XHRsYXRlUmVuZGVyID0gbm9kZVs3XTtcblx0XHRcdFx0bWFya3VwID0gbm9kZVs5XSAmJiBub2RlWzldLnJlcGxhY2UoclVuZXNjYXBlUXVvdGVzLCBcIiQxXCIpO1xuXHRcdFx0XHRpZiAoaXNFbHNlID0gdGFnTmFtZSA9PT0gXCJlbHNlXCIpIHtcblx0XHRcdFx0XHRpZiAocGF0aEJpbmRpbmdzKSB7XG5cdFx0XHRcdFx0XHRwYXRoQmluZGluZ3MucHVzaChub2RlWzhdKTtcblx0XHRcdFx0XHR9XG5cdFx0XHRcdH0gZWxzZSBpZiAodG1wbEJpbmRpbmdzICYmIChwYXRoQmluZGluZ3MgPSBub2RlWzhdKSkgeyAvLyBBcnJheSBvZiBwYXRocywgb3IgZmFsc2UgaWYgbm90IGRhdGEtYm91bmRcblx0XHRcdFx0XHRwYXRoQmluZGluZ3MgPSBbcGF0aEJpbmRpbmdzXTtcblx0XHRcdFx0XHR0bXBsQmluZGluZ0tleSA9IHRtcGxCaW5kaW5ncy5wdXNoKDEpOyAvLyBBZGQgcGxhY2Vob2xkZXIgaW4gdG1wbEJpbmRpbmdzIGZvciBjb21waWxlZCBmdW5jdGlvblxuXHRcdFx0XHR9XG5cdFx0XHRcdHVzZVZpZXdzID0gdXNlVmlld3MgfHwgcGFyYW1zWzFdIHx8IHBhcmFtc1syXSB8fCBwYXRoQmluZGluZ3MgfHwgL3ZpZXcuKD8haW5kZXgpLy50ZXN0KHBhcmFtc1swXSk7XG5cdFx0XHRcdC8vIHVzZVZpZXdzIGlzIGZvciBwZXJmIG9wdGltaXphdGlvbi4gRm9yIHJlbmRlcigpIHdlIG9ubHkgdXNlIHZpZXdzIGlmIG5lY2Vzc2FyeSAtIGZvciB0aGUgbW9yZSBhZHZhbmNlZCBzY2VuYXJpb3MuXG5cdFx0XHRcdC8vIFdlIHVzZSB2aWV3cyBpZiB0aGVyZSBhcmUgcHJvcHMsIGNvbnRleHR1YWwgcHJvcGVydGllcyBvciBhcmdzIHdpdGggIy4uLiAob3RoZXIgdGhhbiAjaW5kZXgpIC0gYnV0IHlvdSBjYW4gZm9yY2Vcblx0XHRcdFx0Ly8gdXNpbmcgdGhlIGZ1bGwgdmlldyBpbmZyYXN0cnVjdHVyZSwgKGFuZCBwYXkgYSBwZXJmIHByaWNlKSBieSBvcHRpbmcgaW46IFNldCB1c2VWaWV3czogdHJ1ZSBvbiB0aGUgdGVtcGxhdGUsIG1hbnVhbGx5Li4uXG5cdFx0XHRcdGlmIChpc0dldFZhbCA9IHRhZ05hbWUgPT09IFwiOlwiKSB7XG5cdFx0XHRcdFx0aWYgKGNvbnZlcnRlcikge1xuXHRcdFx0XHRcdFx0dGFnTmFtZSA9IGNvbnZlcnRlciA9PT0gSFRNTCA/IFwiPlwiIDogY29udmVydGVyICsgdGFnTmFtZTtcblx0XHRcdFx0XHR9XG5cdFx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdFx0aWYgKGNvbnRlbnQpIHsgLy8gVE9ETyBvcHRpbWl6ZSAtIGlmIGNvbnRlbnQubGVuZ3RoID09PSAwIG9yIGlmIHRoZXJlIGlzIGEgdG1wbD1cIi4uLlwiIHNwZWNpZmllZCAtIHNldCBjb250ZW50IHRvIG51bGwgLyBkb24ndCBydW4gdGhpcyBjb21waWxhdGlvbiBjb2RlIC0gc2luY2UgY29udGVudCB3b24ndCBnZXQgdXNlZCEhXG5cdFx0XHRcdFx0XHQvLyBDcmVhdGUgdGVtcGxhdGUgb2JqZWN0IGZvciBuZXN0ZWQgdGVtcGxhdGVcblx0XHRcdFx0XHRcdG5lc3RlZFRtcGwgPSB0bXBsT2JqZWN0KG1hcmt1cCwgdG1wbE9wdGlvbnMpO1xuXHRcdFx0XHRcdFx0bmVzdGVkVG1wbC50bXBsTmFtZSA9IHRtcGxOYW1lICsgXCIvXCIgKyB0YWdOYW1lO1xuXHRcdFx0XHRcdFx0Ly8gQ29tcGlsZSB0byBBU1QgYW5kIHRoZW4gdG8gY29tcGlsZWQgZnVuY3Rpb25cblx0XHRcdFx0XHRcdG5lc3RlZFRtcGwudXNlVmlld3MgPSBuZXN0ZWRUbXBsLnVzZVZpZXdzIHx8IHVzZVZpZXdzO1xuXHRcdFx0XHRcdFx0YnVpbGRDb2RlKGNvbnRlbnQsIG5lc3RlZFRtcGwpO1xuXHRcdFx0XHRcdFx0dXNlVmlld3MgPSBuZXN0ZWRUbXBsLnVzZVZpZXdzO1xuXHRcdFx0XHRcdFx0bmVzdGVkVG1wbHMucHVzaChuZXN0ZWRUbXBsKTtcblx0XHRcdFx0XHR9XG5cblx0XHRcdFx0XHRpZiAoIWlzRWxzZSkge1xuXHRcdFx0XHRcdFx0Ly8gVGhpcyBpcyBub3QgYW4gZWxzZSB0YWcuXG5cdFx0XHRcdFx0XHR0YWdBbmRFbHNlcyA9IHRhZ05hbWU7XG5cdFx0XHRcdFx0XHR1c2VWaWV3cyA9IHVzZVZpZXdzIHx8IHRhZ05hbWUgJiYgKCEkdGFnc1t0YWdOYW1lXSB8fCAhJHRhZ3NbdGFnTmFtZV0uZmxvdyk7XG5cdFx0XHRcdFx0XHQvLyBTd2l0Y2ggdG8gYSBuZXcgY29kZSBzdHJpbmcgZm9yIHRoaXMgYm91bmQgdGFnIChhbmQgaXRzIGVsc2VzLCBpZiBpdCBoYXMgYW55KSAtIGZvciByZXR1cm5pbmcgdGhlIHRhZ0N0eHMgYXJyYXlcblx0XHRcdFx0XHRcdG9sZENvZGUgPSBjb2RlO1xuXHRcdFx0XHRcdFx0Y29kZSA9IFwiXCI7XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHRcdG5leHRJc0Vsc2UgPSBhc3RbaSArIDFdO1xuXHRcdFx0XHRcdG5leHRJc0Vsc2UgPSBuZXh0SXNFbHNlICYmIG5leHRJc0Vsc2VbMF0gPT09IFwiZWxzZVwiO1xuXHRcdFx0XHR9XG5cdFx0XHRcdHRhZ1N0YXJ0ID0gb25FcnJvciA/IFwiO1xcbnRyeXtcXG5yZXQrPVwiIDogXCJcXG4rXCI7XG5cdFx0XHRcdGJvdW5kT25FcnJTdGFydCA9IFwiXCI7XG5cdFx0XHRcdGJvdW5kT25FcnJFbmQgPSBcIlwiO1xuXG5cdFx0XHRcdGlmIChpc0dldFZhbCAmJiAocGF0aEJpbmRpbmdzIHx8IHRyaWdnZXIgfHwgY29udmVydGVyICYmIGNvbnZlcnRlciAhPT0gSFRNTCB8fCBsYXRlUmVuZGVyKSkge1xuXHRcdFx0XHRcdC8vIEZvciBjb252ZXJ0VmFsIHdlIG5lZWQgYSBjb21waWxlZCBmdW5jdGlvbiB0byByZXR1cm4gdGhlIG5ldyB0YWdDdHgocylcblx0XHRcdFx0XHR0YWdDdHhGbiA9IG5ldyBGdW5jdGlvbihcImRhdGEsdmlldyxqLHVcIiwgXCIvLyBcIiArIHRtcGxOYW1lICsgXCIgXCIgKyAoKyt0bXBsQmluZGluZ0tleSkgKyBcIiBcIiArIHRhZ05hbWVcblx0XHRcdFx0XHRcdFx0XHRcdFx0KyBcIlxcbnJldHVybiB7XCIgKyB0YWdDdHggKyBcIn07XCIpO1xuXHRcdFx0XHRcdHRhZ0N0eEZuLl9lciA9IG9uRXJyb3I7XG5cdFx0XHRcdFx0dGFnQ3R4Rm4uX3RhZyA9IHRhZ05hbWU7XG5cdFx0XHRcdFx0dGFnQ3R4Rm4uX2JkID0gISFwYXRoQmluZGluZ3M7IC8vIGRhdGEtbGlua2VkIHRhZyB7XnsuLi4vfX1cblx0XHRcdFx0XHR0YWdDdHhGbi5fbHIgPSBsYXRlUmVuZGVyO1xuXG5cdFx0XHRcdFx0aWYgKGlzTGlua0V4cHIpIHtcblx0XHRcdFx0XHRcdHJldHVybiB0YWdDdHhGbjtcblx0XHRcdFx0XHR9XG5cblx0XHRcdFx0XHRzZXRQYXRocyh0YWdDdHhGbiwgcGF0aEJpbmRpbmdzKTtcblx0XHRcdFx0XHR0YWdSZW5kZXIgPSAnYyhcIicgKyBjb252ZXJ0ZXIgKyAnXCIsdmlldywnO1xuXHRcdFx0XHRcdHVzZUNudnQgPSB0cnVlO1xuXHRcdFx0XHRcdGJvdW5kT25FcnJTdGFydCA9IHRhZ1JlbmRlciArIHRtcGxCaW5kaW5nS2V5ICsgXCIsXCI7XG5cdFx0XHRcdFx0Ym91bmRPbkVyckVuZCA9IFwiKVwiO1xuXHRcdFx0XHR9XG5cdFx0XHRcdGNvZGUgKz0gKGlzR2V0VmFsXG5cdFx0XHRcdFx0PyAoaXNMaW5rRXhwciA/IChvbkVycm9yID8gXCJ0cnl7XFxuXCIgOiBcIlwiKSArIFwicmV0dXJuIFwiIDogdGFnU3RhcnQpICsgKHVzZUNudnQgLy8gQ2FsbCBfY252dCBpZiB0aGVyZSBpcyBhIGNvbnZlcnRlcjoge3tjbnZ0OiAuLi4gfX0gb3Ige157Y252dDogLi4uIH19XG5cdFx0XHRcdFx0XHQ/ICh1c2VDbnZ0ID0gdW5kZWZpbmVkLCB1c2VWaWV3cyA9IGhhc0NudnQgPSB0cnVlLCB0YWdSZW5kZXIgKyAodGFnQ3R4Rm5cblx0XHRcdFx0XHRcdFx0PyAoKHRtcGxCaW5kaW5nc1t0bXBsQmluZGluZ0tleSAtIDFdID0gdGFnQ3R4Rm4pLCB0bXBsQmluZGluZ0tleSkgLy8gU3RvcmUgdGhlIGNvbXBpbGVkIHRhZ0N0eEZuIGluIHRtcGwuYm5kcywgYW5kIHBhc3MgdGhlIGtleSB0byBjb252ZXJ0VmFsKClcblx0XHRcdFx0XHRcdFx0OiBcIntcIiArIHRhZ0N0eCArIFwifVwiKSArIFwiKVwiKVxuXHRcdFx0XHRcdFx0OiB0YWdOYW1lID09PSBcIj5cIlxuXHRcdFx0XHRcdFx0XHQ/IChoYXNFbmNvZGVyID0gdHJ1ZSwgXCJoKFwiICsgcGFyYW1zWzBdICsgXCIpXCIpXG5cdFx0XHRcdFx0XHRcdDogKGdldHNWYWwgPSB0cnVlLCBcIigodj1cIiArIHBhcmFtc1swXSArICcpIT1udWxsP3Y6JyArIChpc0xpbmtFeHByID8gJ251bGwpJyA6ICdcIlwiKScpKVxuXHRcdFx0XHRcdFx0XHQvLyBOb24gc3RyaWN0IGVxdWFsaXR5IHNvIGRhdGEtbGluaz1cInRpdGxlezpleHByfVwiIHdpdGggZXhwcj1udWxsL3VuZGVmaW5lZCByZW1vdmVzIHRpdGxlIGF0dHJpYnV0ZVxuXHRcdFx0XHRcdClcblx0XHRcdFx0XHQ6IChoYXNUYWcgPSB0cnVlLCBcIlxcbnt2aWV3OnZpZXcsdG1wbDpcIiAvLyBBZGQgdGhpcyB0YWdDdHggdG8gdGhlIGNvbXBpbGVkIGNvZGUgZm9yIHRoZSB0YWdDdHhzIHRvIGJlIHBhc3NlZCB0byByZW5kZXJUYWcoKVxuXHRcdFx0XHRcdFx0KyAoY29udGVudCA/IG5lc3RlZFRtcGxzLmxlbmd0aCA6IFwiMFwiKSArIFwiLFwiIC8vIEZvciBibG9jayB0YWdzLCBwYXNzIGluIHRoZSBrZXkgKG5lc3RlZFRtcGxzLmxlbmd0aCkgdG8gdGhlIG5lc3RlZCBjb250ZW50IHRlbXBsYXRlXG5cdFx0XHRcdFx0XHQrIHRhZ0N0eCArIFwifSxcIikpO1xuXG5cdFx0XHRcdGlmICh0YWdBbmRFbHNlcyAmJiAhbmV4dElzRWxzZSkge1xuXHRcdFx0XHRcdC8vIFRoaXMgaXMgYSBkYXRhLWxpbmsgZXhwcmVzc2lvbiBvciBhbiBpbmxpbmUgdGFnIHdpdGhvdXQgYW55IGVsc2VzLCBvciB0aGUgbGFzdCB7e2Vsc2V9fSBvZiBhbiBpbmxpbmUgdGFnXG5cdFx0XHRcdFx0Ly8gV2UgY29tcGxldGUgdGhlIGNvZGUgZm9yIHJldHVybmluZyB0aGUgdGFnQ3R4cyBhcnJheVxuXHRcdFx0XHRcdGNvZGUgPSBcIltcIiArIGNvZGUuc2xpY2UoMCwgLTEpICsgXCJdXCI7XG5cdFx0XHRcdFx0dGFnUmVuZGVyID0gJ3QoXCInICsgdGFnQW5kRWxzZXMgKyAnXCIsdmlldyx0aGlzLCc7XG5cdFx0XHRcdFx0aWYgKGlzTGlua0V4cHIgfHwgcGF0aEJpbmRpbmdzKSB7XG5cdFx0XHRcdFx0XHQvLyBUaGlzIGlzIGEgYm91bmQgdGFnIChkYXRhLWxpbmsgZXhwcmVzc2lvbiBvciBpbmxpbmUgYm91bmQgdGFnIHtee3RhZyAuLi59fSkgc28gd2Ugc3RvcmUgYSBjb21waWxlZCB0YWdDdHhzIGZ1bmN0aW9uIGluIHRtcC5ibmRzXG5cdFx0XHRcdFx0XHRjb2RlID0gbmV3IEZ1bmN0aW9uKFwiZGF0YSx2aWV3LGosdVwiLCBcIiAvLyBcIiArIHRtcGxOYW1lICsgXCIgXCIgKyB0bXBsQmluZGluZ0tleSArIFwiIFwiICsgdGFnQW5kRWxzZXMgKyBcIlxcbnJldHVybiBcIiArIGNvZGUgKyBcIjtcIik7XG5cdFx0XHRcdFx0XHRjb2RlLl9lciA9IG9uRXJyb3I7XG5cdFx0XHRcdFx0XHRjb2RlLl90YWcgPSB0YWdBbmRFbHNlcztcblx0XHRcdFx0XHRcdGlmIChwYXRoQmluZGluZ3MpIHtcblx0XHRcdFx0XHRcdFx0c2V0UGF0aHModG1wbEJpbmRpbmdzW3RtcGxCaW5kaW5nS2V5IC0gMV0gPSBjb2RlLCBwYXRoQmluZGluZ3MpO1xuXHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdFx0Y29kZS5fbHIgPSBsYXRlUmVuZGVyO1xuXHRcdFx0XHRcdFx0aWYgKGlzTGlua0V4cHIpIHtcblx0XHRcdFx0XHRcdFx0cmV0dXJuIGNvZGU7IC8vIEZvciBhIGRhdGEtbGluayBleHByZXNzaW9uIHdlIHJldHVybiB0aGUgY29tcGlsZWQgdGFnQ3R4cyBmdW5jdGlvblxuXHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdFx0Ym91bmRPbkVyclN0YXJ0ID0gdGFnUmVuZGVyICsgdG1wbEJpbmRpbmdLZXkgKyBcIix1bmRlZmluZWQsXCI7XG5cdFx0XHRcdFx0XHRib3VuZE9uRXJyRW5kID0gXCIpXCI7XG5cdFx0XHRcdFx0fVxuXG5cdFx0XHRcdFx0Ly8gVGhpcyBpcyB0aGUgbGFzdCB7e2Vsc2V9fSBmb3IgYW4gaW5saW5lIHRhZy5cblx0XHRcdFx0XHQvLyBGb3IgYSBib3VuZCB0YWcsIHBhc3MgdGhlIHRhZ0N0eHMgZm4gbG9va3VwIGtleSB0byByZW5kZXJUYWcuXG5cdFx0XHRcdFx0Ly8gRm9yIGFuIHVuYm91bmQgdGFnLCBpbmNsdWRlIHRoZSBjb2RlIGRpcmVjdGx5IGZvciBldmFsdWF0aW5nIHRhZ0N0eHMgYXJyYXlcblx0XHRcdFx0XHRjb2RlID0gb2xkQ29kZSArIHRhZ1N0YXJ0ICsgdGFnUmVuZGVyICsgKGNvZGUuZGVwcyAmJiB0bXBsQmluZGluZ0tleSB8fCBjb2RlKSArIFwiKVwiO1xuXHRcdFx0XHRcdHBhdGhCaW5kaW5ncyA9IDA7XG5cdFx0XHRcdFx0dGFnQW5kRWxzZXMgPSAwO1xuXHRcdFx0XHR9XG5cdFx0XHRcdGlmIChvbkVycm9yKSB7XG5cdFx0XHRcdFx0dXNlVmlld3MgPSB0cnVlO1xuXHRcdFx0XHRcdGNvZGUgKz0gJztcXG59Y2F0Y2goZSl7cmV0JyArIChpc0xpbmtFeHByID8gXCJ1cm4gXCIgOiBcIis9XCIpICsgYm91bmRPbkVyclN0YXJ0ICsgJ2ouX2VycihlLHZpZXcsJyArIG9uRXJyb3IgKyAnKScgKyBib3VuZE9uRXJyRW5kICsgJzt9JyArIChpc0xpbmtFeHByID8gXCJcIiA6ICdyZXQ9cmV0Jyk7XG5cdFx0XHRcdH1cblx0XHRcdH1cblx0XHR9XG5cdH1cblx0Ly8gSW5jbHVkZSBvbmx5IHRoZSB2YXIgcmVmZXJlbmNlcyB0aGF0IGFyZSBuZWVkZWQgaW4gdGhlIGNvZGVcblx0Y29kZSA9IFwiLy8gXCIgKyB0bXBsTmFtZVxuXG5cdFx0KyBcIlxcbnZhciB2XCJcblx0XHQrIChoYXNUYWcgPyBcIix0PWouX3RhZ1wiIDogXCJcIikgICAgICAgICAgICAgICAgLy8gaGFzIHRhZ1xuXHRcdCsgKGhhc0NudnQgPyBcIixjPWouX2NudnRcIiA6IFwiXCIpICAgICAgICAgICAgICAvLyBjb252ZXJ0ZXJcblx0XHQrIChoYXNFbmNvZGVyID8gXCIsaD1qLl9odG1sXCIgOiBcIlwiKSAgICAgICAgICAgLy8gaHRtbCBjb252ZXJ0ZXJcblx0XHQrIChpc0xpbmtFeHByID8gXCI7XFxuXCIgOiAnLHJldD1cIlwiXFxuJylcblx0XHQrICh0bXBsT3B0aW9ucy5kZWJ1ZyA/IFwiZGVidWdnZXI7XCIgOiBcIlwiKVxuXHRcdCsgY29kZVxuXHRcdCsgKGlzTGlua0V4cHIgPyBcIlxcblwiIDogXCI7XFxucmV0dXJuIHJldDtcIik7XG5cblx0aWYgKCRzdWJTZXR0aW5ncy5kZWJ1Z01vZGUgIT09IGZhbHNlKSB7XG5cdFx0Y29kZSA9IFwidHJ5IHtcXG5cIiArIGNvZGUgKyBcIlxcbn1jYXRjaChlKXtcXG5yZXR1cm4gai5fZXJyKGUsIHZpZXcpO1xcbn1cIjtcblx0fVxuXG5cdHRyeSB7XG5cdFx0Y29kZSA9IG5ldyBGdW5jdGlvbihcImRhdGEsdmlldyxqLHVcIiwgY29kZSk7XG5cdH0gY2F0Y2ggKGUpIHtcblx0XHRzeW50YXhFcnJvcihcIkNvbXBpbGVkIHRlbXBsYXRlIGNvZGU6XFxuXFxuXCIgKyBjb2RlICsgJ1xcbjogXCInICsgKGUubWVzc2FnZXx8ZSkgKyAnXCInKTtcblx0fVxuXHRpZiAodG1wbCkge1xuXHRcdHRtcGwuZm4gPSBjb2RlO1xuXHRcdHRtcGwudXNlVmlld3MgPSAhIXVzZVZpZXdzO1xuXHR9XG5cdHJldHVybiBjb2RlO1xufVxuXG4vLz09PT09PT09PT1cbi8vIFV0aWxpdGllc1xuLy89PT09PT09PT09XG5cbi8vIE1lcmdlIG9iamVjdHMsIGluIHBhcnRpY3VsYXIgY29udGV4dHMgd2hpY2ggaW5oZXJpdCBmcm9tIHBhcmVudCBjb250ZXh0c1xuZnVuY3Rpb24gZXh0ZW5kQ3R4KGNvbnRleHQsIHBhcmVudENvbnRleHQpIHtcblx0Ly8gUmV0dXJuIGNvcHkgb2YgcGFyZW50Q29udGV4dCwgdW5sZXNzIGNvbnRleHQgaXMgZGVmaW5lZCBhbmQgaXMgZGlmZmVyZW50LCBpbiB3aGljaCBjYXNlIHJldHVybiBhIG5ldyBtZXJnZWQgY29udGV4dFxuXHQvLyBJZiBuZWl0aGVyIGNvbnRleHQgbm9yIHBhcmVudENvbnRleHQgYXJlIGRlZmluZWQsIHJldHVybiB1bmRlZmluZWRcblx0cmV0dXJuIGNvbnRleHQgJiYgY29udGV4dCAhPT0gcGFyZW50Q29udGV4dFxuXHRcdD8gKHBhcmVudENvbnRleHRcblx0XHRcdD8gJGV4dGVuZCgkZXh0ZW5kKHt9LCBwYXJlbnRDb250ZXh0KSwgY29udGV4dClcblx0XHRcdDogY29udGV4dClcblx0XHQ6IHBhcmVudENvbnRleHQgJiYgJGV4dGVuZCh7fSwgcGFyZW50Q29udGV4dCk7XG59XG5cbi8vIEdldCBjaGFyYWN0ZXIgZW50aXR5IGZvciBIVE1MIGFuZCBBdHRyaWJ1dGUgZW5jb2RpbmdcbmZ1bmN0aW9uIGdldENoYXJFbnRpdHkoY2gpIHtcblx0cmV0dXJuIGNoYXJFbnRpdGllc1tjaF0gfHwgKGNoYXJFbnRpdGllc1tjaF0gPSBcIiYjXCIgKyBjaC5jaGFyQ29kZUF0KDApICsgXCI7XCIpO1xufVxuXG5mdW5jdGlvbiBnZXRUYXJnZXRQcm9wcyhzb3VyY2UpIHtcblx0Ly8gdGhpcyBwb2ludGVyIGlzIHRoZU1hcCAtIHdoaWNoIGhhcyB0YWdDdHgucHJvcHMgdG9vXG5cdC8vIGFyZ3VtZW50czogdGFnQ3R4LmFyZ3MuXG5cdHZhciBrZXksIHByb3AsXG5cdFx0cHJvcHMgPSBbXTtcblxuXHRpZiAodHlwZW9mIHNvdXJjZSA9PT0gT0JKRUNUKSB7XG5cdFx0Zm9yIChrZXkgaW4gc291cmNlKSB7XG5cdFx0XHRwcm9wID0gc291cmNlW2tleV07XG5cdFx0XHRpZiAoa2V5ICE9PSAkZXhwYW5kbyAmJiBzb3VyY2UuaGFzT3duUHJvcGVydHkoa2V5KSAmJiAhJGlzRnVuY3Rpb24ocHJvcCkpIHtcblx0XHRcdFx0cHJvcHMucHVzaCh7a2V5OiBrZXksIHByb3A6IHByb3B9KTtcblx0XHRcdH1cblx0XHR9XG5cdH1cblx0cmV0dXJuIHByb3BzO1xufVxuXG5mdW5jdGlvbiAkZm5SZW5kZXIoZGF0YSwgY29udGV4dCwgbm9JdGVyYXRpb24pIHtcblx0dmFyIHRtcGxFbGVtID0gdGhpcy5qcXVlcnkgJiYgKHRoaXNbMF0gfHwgZXJyb3IoJ1Vua25vd24gdGVtcGxhdGUnKSksIC8vIFRhcmdldGVkIGVsZW1lbnQgbm90IGZvdW5kIGZvciBqUXVlcnkgdGVtcGxhdGUgc2VsZWN0b3Igc3VjaCBhcyBcIiNteVRtcGxcIlxuXHRcdHRtcGwgPSB0bXBsRWxlbS5nZXRBdHRyaWJ1dGUodG1wbEF0dHIpO1xuXG5cdHJldHVybiByZW5kZXJDb250ZW50LmNhbGwodG1wbCAmJiAkLmRhdGEodG1wbEVsZW0pW2pzdlRtcGxdIHx8ICR0ZW1wbGF0ZXModG1wbEVsZW0pLFxuXHRcdGRhdGEsIGNvbnRleHQsIG5vSXRlcmF0aW9uKTtcbn1cblxuLy89PT09PT09PT09PT09PT09PT09PT09PT09PSBSZWdpc3RlciBjb252ZXJ0ZXJzID09PT09PT09PT09PT09PT09PT09PT09PT09XG5cbmZ1bmN0aW9uIGh0bWxFbmNvZGUodGV4dCkge1xuXHQvLyBIVE1MIGVuY29kZTogUmVwbGFjZSA8ID4gJiAnIGFuZCBcIiBieSBjb3JyZXNwb25kaW5nIGVudGl0aWVzLlxuXHRyZXR1cm4gdGV4dCAhPSB1bmRlZmluZWQgPyBySXNIdG1sLnRlc3QodGV4dCkgJiYgKFwiXCIgKyB0ZXh0KS5yZXBsYWNlKHJIdG1sRW5jb2RlLCBnZXRDaGFyRW50aXR5KSB8fCB0ZXh0IDogXCJcIjtcbn1cblxuLy89PT09PT09PT09PT09PT09PT09PT09PT09PSBJbml0aWFsaXplID09PT09PT09PT09PT09PT09PT09PT09PT09XG5cbiRzdWIgPSAkdmlld3Muc3ViO1xuJHZpZXdzU2V0dGluZ3MgPSAkdmlld3Muc2V0dGluZ3M7XG5cbmlmICghKGpzciB8fCAkICYmICQucmVuZGVyKSkge1xuXHQvLyBKc1JlbmRlciBub3QgYWxyZWFkeSBsb2FkZWQsIG9yIGxvYWRlZCB3aXRob3V0IGpRdWVyeSwgYW5kIHdlIGFyZSBub3cgbW92aW5nIGZyb20ganNyZW5kZXIgbmFtZXNwYWNlIHRvIGpRdWVyeSBuYW1lcGFjZVxuXHRmb3IgKGpzdlN0b3JlTmFtZSBpbiBqc3ZTdG9yZXMpIHtcblx0XHRyZWdpc3RlclN0b3JlKGpzdlN0b3JlTmFtZSwganN2U3RvcmVzW2pzdlN0b3JlTmFtZV0pO1xuXHR9XG5cblx0JGNvbnZlcnRlcnMgPSAkdmlld3MuY29udmVydGVycztcblx0JGhlbHBlcnMgPSAkdmlld3MuaGVscGVycztcblx0JHRhZ3MgPSAkdmlld3MudGFncztcblxuXHQkc3ViLl90Zy5wcm90b3R5cGUgPSB7XG5cdFx0YmFzZUFwcGx5OiBiYXNlQXBwbHksXG5cdFx0Y3Z0QXJnczogY29udmVydEFyZ3MsXG5cdFx0Ym5kQXJnczogY29udmVydEJvdW5kQXJncyxcblx0XHRjdHhQcm06IGNvbnRleHRQYXJhbWV0ZXJcblx0fTtcblxuXHR0b3BWaWV3ID0gJHN1Yi50b3BWaWV3ID0gbmV3IFZpZXcoKTtcblxuXHQvL0JST1dTRVItU1BFQ0lGSUMgQ09ERVxuXHRpZiAoJCkge1xuXG5cdFx0Ly8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vXG5cdFx0Ly8galF1ZXJ5ICg9ICQpIGlzIGxvYWRlZFxuXG5cdFx0JC5mbi5yZW5kZXIgPSAkZm5SZW5kZXI7XG5cdFx0JGV4cGFuZG8gPSAkLmV4cGFuZG87XG5cdFx0aWYgKCQub2JzZXJ2YWJsZSkge1xuXHRcdFx0JGV4dGVuZCgkc3ViLCAkLnZpZXdzLnN1Yik7IC8vIGpxdWVyeS5vYnNlcnZhYmxlLmpzIHdhcyBsb2FkZWQgYmVmb3JlIGpzcmVuZGVyLmpzXG5cdFx0XHQkdmlld3MubWFwID0gJC52aWV3cy5tYXA7XG5cdFx0fVxuXG5cdH0gZWxzZSB7XG5cdFx0Ly8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vXG5cdFx0Ly8galF1ZXJ5IGlzIG5vdCBsb2FkZWQuXG5cblx0XHQkID0ge307XG5cblx0XHRpZiAoc2V0R2xvYmFscykge1xuXHRcdFx0Z2xvYmFsLmpzcmVuZGVyID0gJDsgLy8gV2UgYXJlIGxvYWRpbmcganNyZW5kZXIuanMgZnJvbSBhIHNjcmlwdCBlbGVtZW50LCBub3QgQU1EIG9yIENvbW1vbkpTLCBzbyBzZXQgZ2xvYmFsXG5cdFx0fVxuXG5cdFx0Ly8gRXJyb3Igd2FybmluZyBpZiBqc3JlbmRlci5qcyBpcyB1c2VkIGFzIHRlbXBsYXRlIGVuZ2luZSBvbiBOb2RlLmpzIChlLmcuIEV4cHJlc3Mgb3IgSGFwaS4uLilcblx0XHQvLyBVc2UganNyZW5kZXItbm9kZS5qcyBpbnN0ZWFkLi4uXG5cdFx0JC5yZW5kZXJGaWxlID0gJC5fX2V4cHJlc3MgPSAkLmNvbXBpbGUgPSBmdW5jdGlvbigpIHsgdGhyb3cgXCJOb2RlLmpzOiB1c2UgbnBtIGpzcmVuZGVyLCBvciBqc3JlbmRlci1ub2RlLmpzXCI7IH07XG5cblx0XHQvL0VORCBCUk9XU0VSLVNQRUNJRklDIENPREVcblx0XHQkLmlzRnVuY3Rpb24gPSBmdW5jdGlvbihvYikge1xuXHRcdFx0cmV0dXJuIHR5cGVvZiBvYiA9PT0gXCJmdW5jdGlvblwiO1xuXHRcdH07XG5cblx0XHQkLmlzQXJyYXkgPSBBcnJheS5pc0FycmF5IHx8IGZ1bmN0aW9uKG9iaikge1xuXHRcdFx0cmV0dXJuICh7fS50b1N0cmluZykuY2FsbChvYmopID09PSBcIltvYmplY3QgQXJyYXldXCI7XG5cdFx0fTtcblxuXHRcdCRzdWIuX2pxID0gZnVuY3Rpb24oanEpIHsgLy8gcHJpdmF0ZSBtZXRob2QgdG8gbW92ZSBmcm9tIEpzUmVuZGVyIEFQSXMgZnJvbSBqc3JlbmRlciBuYW1lc3BhY2UgdG8galF1ZXJ5IG5hbWVzcGFjZVxuXHRcdFx0aWYgKGpxICE9PSAkKSB7XG5cdFx0XHRcdCRleHRlbmQoanEsICQpOyAvLyBtYXAgb3ZlciBmcm9tIGpzcmVuZGVyIG5hbWVzcGFjZSB0byBqUXVlcnkgbmFtZXNwYWNlXG5cdFx0XHRcdCQgPSBqcTtcblx0XHRcdFx0JC5mbi5yZW5kZXIgPSAkZm5SZW5kZXI7XG5cdFx0XHRcdGRlbGV0ZSAkLmpzcmVuZGVyO1xuXHRcdFx0XHQkZXhwYW5kbyA9ICQuZXhwYW5kbztcblx0XHRcdH1cblx0XHR9O1xuXG5cdFx0JC5qc3JlbmRlciA9IHZlcnNpb25OdW1iZXI7XG5cdH1cblx0JHN1YlNldHRpbmdzID0gJHN1Yi5zZXR0aW5ncztcblx0JHN1YlNldHRpbmdzLmFsbG93Q29kZSA9IGZhbHNlO1xuXHQkaXNGdW5jdGlvbiA9ICQuaXNGdW5jdGlvbjtcblx0JC5yZW5kZXIgPSAkcmVuZGVyO1xuXHQkLnZpZXdzID0gJHZpZXdzO1xuXHQkLnRlbXBsYXRlcyA9ICR0ZW1wbGF0ZXMgPSAkdmlld3MudGVtcGxhdGVzO1xuXG5cdGZvciAoc2V0dGluZyBpbiAkc3ViU2V0dGluZ3MpIHtcblx0XHRhZGRTZXR0aW5nKHNldHRpbmcpO1xuXHR9XG5cblx0KCR2aWV3c1NldHRpbmdzLmRlYnVnTW9kZSA9IGZ1bmN0aW9uKGRlYnVnTW9kZSkge1xuXHRcdHJldHVybiBkZWJ1Z01vZGUgPT09IHVuZGVmaW5lZFxuXHRcdFx0PyAkc3ViU2V0dGluZ3MuZGVidWdNb2RlXG5cdFx0XHQ6IChcblx0XHRcdFx0JHN1YlNldHRpbmdzLmRlYnVnTW9kZSA9IGRlYnVnTW9kZSxcblx0XHRcdFx0JHN1YlNldHRpbmdzLm9uRXJyb3IgPSBkZWJ1Z01vZGUgKyBcIlwiID09PSBkZWJ1Z01vZGVcblx0XHRcdFx0XHQ/IG5ldyBGdW5jdGlvbihcIlwiLCBcInJldHVybiAnXCIgKyBkZWJ1Z01vZGUgKyBcIic7XCIpXG5cdFx0XHRcdFx0OiAkaXNGdW5jdGlvbihkZWJ1Z01vZGUpXG5cdFx0XHRcdFx0XHQ/IGRlYnVnTW9kZVxuXHRcdFx0XHRcdFx0OiB1bmRlZmluZWQsXG5cdFx0XHRcdCR2aWV3c1NldHRpbmdzKTtcblx0fSkoZmFsc2UpOyAvLyBqc2hpbnQgaWdub3JlOmxpbmVcblxuXHQkc3ViU2V0dGluZ3NBZHZhbmNlZCA9ICRzdWJTZXR0aW5ncy5hZHZhbmNlZCA9IHtcblx0XHR1c2VWaWV3czogZmFsc2UsXG5cdFx0X2pzdjogZmFsc2UgLy8gRm9yIGdsb2JhbCBhY2Nlc3MgdG8gSnNWaWV3cyBzdG9yZVxuXHR9O1xuXG5cdC8vPT09PT09PT09PT09PT09PT09PT09PT09PT0gUmVnaXN0ZXIgdGFncyA9PT09PT09PT09PT09PT09PT09PT09PT09PVxuXG5cdCR0YWdzKHtcblx0XHRcImlmXCI6IHtcblx0XHRcdHJlbmRlcjogZnVuY3Rpb24odmFsKSB7XG5cdFx0XHRcdC8vIFRoaXMgZnVuY3Rpb24gaXMgY2FsbGVkIG9uY2UgZm9yIHt7aWZ9fSBhbmQgb25jZSBmb3IgZWFjaCB7e2Vsc2V9fS5cblx0XHRcdFx0Ly8gV2Ugd2lsbCB1c2UgdGhlIHRhZy5yZW5kZXJpbmcgb2JqZWN0IGZvciBjYXJyeWluZyByZW5kZXJpbmcgc3RhdGUgYWNyb3NzIHRoZSBjYWxscy5cblx0XHRcdFx0Ly8gSWYgbm90IGRvbmUgKGEgcHJldmlvdXMgYmxvY2sgaGFzIG5vdCBiZWVuIHJlbmRlcmVkKSwgbG9vayBhdCBleHByZXNzaW9uIGZvciB0aGlzIGJsb2NrIGFuZCByZW5kZXIgdGhlIGJsb2NrIGlmIGV4cHJlc3Npb24gaXMgdHJ1dGh5XG5cdFx0XHRcdC8vIE90aGVyd2lzZSByZXR1cm4gXCJcIlxuXHRcdFx0XHR2YXIgc2VsZiA9IHRoaXMsXG5cdFx0XHRcdFx0dGFnQ3R4ID0gc2VsZi50YWdDdHgsXG5cdFx0XHRcdFx0cmV0ID0gKHNlbGYucmVuZGVyaW5nLmRvbmUgfHwgIXZhbCAmJiAoYXJndW1lbnRzLmxlbmd0aCB8fCAhdGFnQ3R4LmluZGV4KSlcblx0XHRcdFx0XHRcdD8gXCJcIlxuXHRcdFx0XHRcdFx0OiAoc2VsZi5yZW5kZXJpbmcuZG9uZSA9IHRydWUsIHNlbGYuc2VsZWN0ZWQgPSB0YWdDdHguaW5kZXgsXG5cdFx0XHRcdFx0XHRcdC8vIFRlc3QgaXMgc2F0aXNmaWVkLCBzbyByZW5kZXIgY29udGVudCBvbiBjdXJyZW50IGNvbnRleHQuIFdlIGNhbGwgdGFnQ3R4LnJlbmRlcigpIHJhdGhlciB0aGFuIHJldHVybiB1bmRlZmluZWRcblx0XHRcdFx0XHRcdFx0Ly8gKHdoaWNoIHdvdWxkIGFsc28gcmVuZGVyIHRoZSB0bXBsL2NvbnRlbnQgb24gdGhlIGN1cnJlbnQgY29udGV4dCBidXQgd291bGQgaXRlcmF0ZSBpZiBpdCBpcyBhbiBhcnJheSlcblx0XHRcdFx0XHRcdFx0dGFnQ3R4LnJlbmRlcih0YWdDdHgudmlldywgdHJ1ZSkpOyAvLyBubyBhcmcsIHNvIHJlbmRlcnMgYWdhaW5zdCBwYXJlbnRWaWV3LmRhdGFcblx0XHRcdFx0cmV0dXJuIHJldDtcblx0XHRcdH0sXG5cdFx0XHRmbG93OiB0cnVlXG5cdFx0fSxcblx0XHRcImZvclwiOiB7XG5cdFx0XHRyZW5kZXI6IGZ1bmN0aW9uKHZhbCkge1xuXHRcdFx0XHQvLyBUaGlzIGZ1bmN0aW9uIGlzIGNhbGxlZCBvbmNlIGZvciB7e2Zvcn19IGFuZCBvbmNlIGZvciBlYWNoIHt7ZWxzZX19LlxuXHRcdFx0XHQvLyBXZSB3aWxsIHVzZSB0aGUgdGFnLnJlbmRlcmluZyBvYmplY3QgZm9yIGNhcnJ5aW5nIHJlbmRlcmluZyBzdGF0ZSBhY3Jvc3MgdGhlIGNhbGxzLlxuXHRcdFx0XHR2YXIgZmluYWxFbHNlID0gIWFyZ3VtZW50cy5sZW5ndGgsXG5cdFx0XHRcdFx0dmFsdWUsXG5cdFx0XHRcdFx0c2VsZiA9IHRoaXMsXG5cdFx0XHRcdFx0dGFnQ3R4ID0gc2VsZi50YWdDdHgsXG5cdFx0XHRcdFx0cmVzdWx0ID0gXCJcIixcblx0XHRcdFx0XHRkb25lID0gMDtcblxuXHRcdFx0XHRpZiAoIXNlbGYucmVuZGVyaW5nLmRvbmUpIHtcblx0XHRcdFx0XHR2YWx1ZSA9IGZpbmFsRWxzZSA/IHRhZ0N0eC52aWV3LmRhdGEgOiB2YWw7IC8vIEZvciB0aGUgZmluYWwgZWxzZSwgZGVmYXVsdHMgdG8gY3VycmVudCBkYXRhIHdpdGhvdXQgaXRlcmF0aW9uLlxuXHRcdFx0XHRcdGlmICh2YWx1ZSAhPT0gdW5kZWZpbmVkKSB7XG5cdFx0XHRcdFx0XHRyZXN1bHQgKz0gdGFnQ3R4LnJlbmRlcih2YWx1ZSwgZmluYWxFbHNlKTsgLy8gSXRlcmF0ZXMgZXhjZXB0IG9uIGZpbmFsIGVsc2UsIGlmIGRhdGEgaXMgYW4gYXJyYXkuIChVc2Uge3tpbmNsdWRlfX0gdG8gY29tcG9zZSB0ZW1wbGF0ZXMgd2l0aG91dCBhcnJheSBpdGVyYXRpb24pXG5cdFx0XHRcdFx0XHRkb25lICs9ICRpc0FycmF5KHZhbHVlKSA/IHZhbHVlLmxlbmd0aCA6IDE7XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHRcdGlmIChzZWxmLnJlbmRlcmluZy5kb25lID0gZG9uZSkge1xuXHRcdFx0XHRcdFx0c2VsZi5zZWxlY3RlZCA9IHRhZ0N0eC5pbmRleDtcblx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0Ly8gSWYgbm90aGluZyB3YXMgcmVuZGVyZWQgd2Ugd2lsbCBsb29rIGF0IHRoZSBuZXh0IHt7ZWxzZX19LiBPdGhlcndpc2UsIHdlIGFyZSBkb25lLlxuXHRcdFx0XHR9XG5cdFx0XHRcdHJldHVybiByZXN1bHQ7XG5cdFx0XHR9LFxuXHRcdFx0ZmxvdzogdHJ1ZVxuXHRcdH0sXG5cdFx0cHJvcHM6IHtcblx0XHRcdGJhc2VUYWc6IFwiZm9yXCIsXG5cdFx0XHRkYXRhTWFwOiBkYXRhTWFwKGdldFRhcmdldFByb3BzKSxcblx0XHRcdGZsb3c6IHRydWVcblx0XHR9LFxuXHRcdGluY2x1ZGU6IHtcblx0XHRcdGZsb3c6IHRydWVcblx0XHR9LFxuXHRcdFwiKlwiOiB7XG5cdFx0XHQvLyB7eyogY29kZS4uLiB9fSAtIElnbm9yZWQgaWYgdGVtcGxhdGUuYWxsb3dDb2RlIGFuZCAkLnZpZXdzLnNldHRpbmdzLmFsbG93Q29kZSBhcmUgZmFsc2UuIE90aGVyd2lzZSBpbmNsdWRlIGNvZGUgaW4gY29tcGlsZWQgdGVtcGxhdGVcblx0XHRcdHJlbmRlcjogcmV0VmFsLFxuXHRcdFx0ZmxvdzogdHJ1ZVxuXHRcdH0sXG5cdFx0XCI6KlwiOiB7XG5cdFx0XHQvLyB7ezoqIHJldHVybmVkRXhwcmVzc2lvbiB9fSAtIElnbm9yZWQgaWYgdGVtcGxhdGUuYWxsb3dDb2RlIGFuZCAkLnZpZXdzLnNldHRpbmdzLmFsbG93Q29kZSBhcmUgZmFsc2UuIE90aGVyd2lzZSBpbmNsdWRlIGNvZGUgaW4gY29tcGlsZWQgdGVtcGxhdGVcblx0XHRcdHJlbmRlcjogcmV0VmFsLFxuXHRcdFx0ZmxvdzogdHJ1ZVxuXHRcdH0sXG5cdFx0ZGJnOiAkaGVscGVycy5kYmcgPSAkY29udmVydGVycy5kYmcgPSBkYmdCcmVhayAvLyBSZWdpc3RlciB7e2RiZy99fSwge3tkYmc6Li4ufX0gYW5kIH5kYmcoKSB0byB0aHJvdyBhbmQgY2F0Y2gsIGFzIGJyZWFrcG9pbnRzIGZvciBkZWJ1Z2dpbmcuXG5cdH0pO1xuXG5cdCRjb252ZXJ0ZXJzKHtcblx0XHRodG1sOiBodG1sRW5jb2RlLFxuXHRcdGF0dHI6IGh0bWxFbmNvZGUsIC8vIEluY2x1ZGVzID4gZW5jb2Rpbmcgc2luY2UgckNvbnZlcnRNYXJrZXJzIGluIEpzVmlld3MgZG9lcyBub3Qgc2tpcCA+IGNoYXJhY3RlcnMgaW4gYXR0cmlidXRlIHN0cmluZ3Ncblx0XHR1cmw6IGZ1bmN0aW9uKHRleHQpIHtcblx0XHRcdC8vIFVSTCBlbmNvZGluZyBoZWxwZXIuXG5cdFx0XHRyZXR1cm4gdGV4dCAhPSB1bmRlZmluZWQgPyBlbmNvZGVVUkkoXCJcIiArIHRleHQpIDogdGV4dCA9PT0gbnVsbCA/IHRleHQgOiBcIlwiOyAvLyBudWxsIHJldHVybnMgbnVsbCwgZS5nLiB0byByZW1vdmUgYXR0cmlidXRlLiB1bmRlZmluZWQgcmV0dXJucyBcIlwiXG5cdFx0fVxuXHR9KTtcbn1cbi8vPT09PT09PT09PT09PT09PT09PT09PT09PT0gRGVmaW5lIGRlZmF1bHQgZGVsaW1pdGVycyA9PT09PT09PT09PT09PT09PT09PT09PT09PVxuJHN1YlNldHRpbmdzID0gJHN1Yi5zZXR0aW5ncztcbiRpc0FycmF5ID0gKCR8fGpzcikuaXNBcnJheTtcbiR2aWV3c1NldHRpbmdzLmRlbGltaXRlcnMoXCJ7e1wiLCBcIn19XCIsIFwiXlwiKTtcblxuXG5pZiAoanNyVG9KcSkgeyAvLyBNb3ZpbmcgZnJvbSBqc3JlbmRlciBuYW1lc3BhY2UgdG8galF1ZXJ5IG5hbWVwYWNlIC0gY29weSBvdmVyIHRoZSBzdG9yZWQgaXRlbXMgKHRlbXBsYXRlcywgY29udmVydGVycywgaGVscGVycy4uLilcblx0anNyLnZpZXdzLnN1Yi5fanEoJCk7XG59XG5yZXR1cm4gJCB8fCBqc3I7XG59LCB3aW5kb3cpKTtcbiIsIi8qZ2xvYmFsIFFVbml0LCB0ZXN0LCBlcXVhbCwgb2sqL1xuKGZ1bmN0aW9uKHVuZGVmaW5lZCkge1xuXCJ1c2Ugc3RyaWN0XCI7XG5cbmJyb3dzZXJpZnkuZG9uZS50d2VsdmUgPSB0cnVlO1xuXG5RVW5pdC5tb2R1bGUoXCJCcm93c2VyaWZ5IC0gY2xpZW50IGNvZGVcIik7XG5cbnZhciBpc0lFOCA9IHdpbmRvdy5hdHRhY2hFdmVudCAmJiAhd2luZG93LmFkZEV2ZW50TGlzdGVuZXI7XG5cbmlmICghaXNJRTgpIHtcblxudGVzdChcIk5vIGpRdWVyeSBnbG9iYWw6IHJlcXVpcmUoJ2pzcmVuZGVyJykoKSBuZXN0ZWQgdGVtcGxhdGVcIiwgZnVuY3Rpb24oKSB7XG5cdC8vIC4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4gSGlkZSBRVW5pdCBnbG9iYWwgalF1ZXJ5IGFuZCBhbnkgcHJldmlvdXMgZ2xvYmFsIGpzcmVuZGVyLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uXG5cdHZhciBqUXVlcnkgPSBnbG9iYWwualF1ZXJ5LCBqc3IgPSBnbG9iYWwuanNyZW5kZXI7XG5cdGdsb2JhbC5qUXVlcnkgPSBnbG9iYWwuanNyZW5kZXIgPSB1bmRlZmluZWQ7XG5cblx0Ly8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PSBBcnJhbmdlID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cblx0dmFyIGRhdGEgPSB7bmFtZTogXCJKb1wifTtcblxuXHQvLyAuLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLiBBY3QgLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLlxuXHR2YXIganNyZW5kZXIgPSByZXF1aXJlKCdqc3JlbmRlcicpKCk7IC8vIE5vdCBwYXNzaW5nIGluIGpRdWVyeSwgc28gcmV0dXJucyB0aGUganNyZW5kZXIgbmFtZXNwYWNlXG5cblx0Ly8gVXNlIHJlcXVpcmUgdG8gZ2V0IHNlcnZlciB0ZW1wbGF0ZSwgdGhhbmtzIHRvIEJyb3dzZXJpZnkgYnVuZGxlIHRoYXQgdXNlZCBqc3JlbmRlci90bXBsaWZ5IHRyYW5zZm9ybVxuXHR2YXIgdG1wbCA9IHJlcXVpcmUoJy4uL3RlbXBsYXRlcy9vdXRlci5odG1sJykoanNyZW5kZXIpOyAvLyBQcm92aWRlIGpzcmVuZGVyXG5cblx0dmFyIHJlc3VsdCA9IHRtcGwoZGF0YSk7XG5cblx0cmVzdWx0ICs9IFwiIFwiICsgKGpzcmVuZGVyICE9PSBqUXVlcnkpO1xuXG5cdC8vIC4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4gQXNzZXJ0IC4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLlxuXHRlcXVhbChyZXN1bHQsIFwiTmFtZTogSm8gKG91dGVyLmh0bWwpIE5hbWU6IEpvIChpbm5lci5odG1sKSB0cnVlXCIsIFwicmVzdWx0OiBObyBqUXVlcnkgZ2xvYmFsOiByZXF1aXJlKCdqc3JlbmRlcicpKCksIG5lc3RlZCB0ZW1wbGF0ZXNcIik7XG5cblx0Ly8gLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLiBSZXNldCAuLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi5cblx0Z2xvYmFsLmpRdWVyeSA9IGpRdWVyeTsgLy8gUmVwbGFjZSBRVW5pdCBnbG9iYWwgalF1ZXJ5XG5cdGdsb2JhbC5qc3JlbmRlciA9IGpzcjsgLy8gUmVwbGFjZSBhbnkgcHJldmlvdXMgZ2xvYmFsIGpzcmVuZGVyXG59KTtcbn1cbn0pKCk7XG4iLCJ2YXIgdG1wbFJlZnMgPSBbXSxcbiAgbWt1cCA9ICdOYW1lOiB7ezpuYW1lfX0gKGlubmVyLmh0bWwpJyxcbiAgJCA9IGdsb2JhbC5qc3JlbmRlciB8fCBnbG9iYWwualF1ZXJ5O1xuXG5tb2R1bGUuZXhwb3J0cyA9ICQgPyAkLnRlbXBsYXRlcyhcIi4vdGVzdC90ZW1wbGF0ZXMvaW5uZXIuaHRtbFwiLCBta3VwKSA6XG4gIGZ1bmN0aW9uKCQpIHtcbiAgICBpZiAoISQgfHwgISQudmlld3MpIHt0aHJvdyBcIlJlcXVpcmVzIGpzcmVuZGVyL2pRdWVyeVwiO31cbiAgICB3aGlsZSAodG1wbFJlZnMubGVuZ3RoKSB7XG4gICAgICB0bXBsUmVmcy5wb3AoKSgkKTsgLy8gY29tcGlsZSBuZXN0ZWQgdGVtcGxhdGVcbiAgICB9XG5cbiAgICByZXR1cm4gJC50ZW1wbGF0ZXMoXCIuL3Rlc3QvdGVtcGxhdGVzL2lubmVyLmh0bWxcIiwgbWt1cClcbiAgfTsiLCJ2YXIgdG1wbFJlZnMgPSBbXSxcbiAgbWt1cCA9ICdOYW1lOiB7ezpuYW1lfX0gKG91dGVyLmh0bWwpIHt7aW5jbHVkZSB0bXBsPVxcXCIuL3Rlc3QvdGVtcGxhdGVzL2lubmVyLmh0bWxcXFwiL319JyxcbiAgJCA9IGdsb2JhbC5qc3JlbmRlciB8fCBnbG9iYWwualF1ZXJ5O1xuXG50bXBsUmVmcy5wdXNoKHJlcXVpcmUoXCIuL2lubmVyLmh0bWxcIikpO1xubW9kdWxlLmV4cG9ydHMgPSAkID8gJC50ZW1wbGF0ZXMoXCIuL3Rlc3QvdGVtcGxhdGVzL291dGVyLmh0bWxcIiwgbWt1cCkgOlxuICBmdW5jdGlvbigkKSB7XG4gICAgaWYgKCEkIHx8ICEkLnZpZXdzKSB7dGhyb3cgXCJSZXF1aXJlcyBqc3JlbmRlci9qUXVlcnlcIjt9XG4gICAgd2hpbGUgKHRtcGxSZWZzLmxlbmd0aCkge1xuICAgICAgdG1wbFJlZnMucG9wKCkoJCk7IC8vIGNvbXBpbGUgbmVzdGVkIHRlbXBsYXRlXG4gICAgfVxuXG4gICAgcmV0dXJuICQudGVtcGxhdGVzKFwiLi90ZXN0L3RlbXBsYXRlcy9vdXRlci5odG1sXCIsIG1rdXApXG4gIH07Il19
