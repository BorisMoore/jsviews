(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
/*! JsRender v0.9.82 (Beta): http://jsviews.com/#jsrender */
/*! **VERSION FOR WEB** (For NODE.JS see http://jsviews.com/download/jsrender-node.js) */
/*
 * Best-of-breed templating in browser or on Node.js.
 * Does not require jQuery, or HTML DOM
 * Integrates with JsViews (http://jsviews.com/#jsviews)
 *
 * Copyright 2016, Boris Moore
 * Released under the MIT License.
 */

//jshint -W018, -W041

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

var versionNumber = "v0.9.82",
	jsvStoreName, rTag, rTmplString, topView, $views,	$expando,

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
			onStore: {},
			addSetting: addSetting,
			settings: {
				allowCode: false
			},
			advSet: noop, // Update advanced settings
			_ths: tagHandlersFromProps,
			_tg: function() {}, // Constructor for tagDef
			_cnvt: convertVal,
			_tag: renderTag,
			_er: error,
			_err: onRenderError,
			_html: htmlEncode,
			_cp: retVal, // Get compiled contextual parameters (or properties) ~foo=expr. In JsRender, simply returns val.
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
		getCtx: retVal, // Get ctx.foo value. In JsRender, simply returns val.
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
						? baseMethod // baseMethod is a derived method, so us it
						: getDerivedMethod(noop, baseMethod), // baseMethod is not derived so make its base method be the noop method
				method
			);
		method._d = 1; // Add flag that this is a derived method
	}
	return method;
}

function tagHandlersFromProps(tag, tagCtx) {
	for (var prop in tagCtx.props) {
		if (rHasHandlers.test(prop)) {
			tag[prop] = getMethod(tag[prop], tagCtx.props[prop]);
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
	for (var name in source) {
		target[name] = source[name];
	}
	return target;
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

	$sub.rTmpl = new RegExp("<.*>|([^\\\\]|^)[{}]|" + openChars + ".*" + closeChars);
	// $sub.rTmpl looks for html tags or { or } char not preceded by \\, or JsRender tags {{xxx}}. Each of these strings are considered
	// NOT to be jQuery selectors
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
		while (view.parent) {
			found = view;
			view = view.parent;
		}
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

function getHelper(helper, isContextCb) {
	// Helper method called as view.hlp(key) from compiled template, for helpers or template parameters ~foo
	var wrapped, deps,
	view = this,
	res = view.ctx;

	if (res) {
		res = res[helper];
	}
	if (res === undefined) {
		res = $helpers[helper];
	}
	if (res && res._cp) { // If this helper resource is a contextual parameter, ~foo=expr
		if (isContextCb) { // In a context callback for a contextual param, return the [currentData, dependencies...] array - needed for observe call
			deps = $sub._ceo(res[1].deps);  // fn deps, with any exprObs cloned
			deps.unshift(res[0].data);      // view.data
			deps._cp = true;
			return deps;
		}
		res = $views.getCtx(res); // If a contextual param, but not a context callback, return evaluated param - fn(data, view, j)
	}

	if (res) {
		if ($isFunction(res) && !res._wrp) {
			// If it is of type function, and not already wrapped, we will wrap it, so if called with no this pointer it will be called with the
			// view as 'this' context. If the helper ~foo() was in a data-link expression, the view will have a 'temporary' linkCtx property too.
			// Note that helper functions on deeper paths will have specific this pointers, from the preceding path.
			// For example, ~util.foo() will have the ~util object as 'this' pointer
			wrapped = function() {
				return res.apply((!this || this === global) ? view : this, arguments);
			};
			wrapped._wrp = view;
			$extend(wrapped, res); // Attach same expandos (if any) to the wrapped function
		}
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
		// if tagCtx is an integer, then it is the key for the compiled function to return the boundTag tagCtx
		boundTag = typeof tagCtx === "number" && view.tmpl.bnds[tagCtx-1],
		linkCtx = view.linkCtx; // For data-link="{cvt:...}"...

	if (onError !== undefined) {
		tagCtx = onError = {props: {}, args: [onError]};
	} else if (boundTag) {
		tagCtx = boundTag(view.data, view, $sub);
	}

	value = tagCtx.args[0];
	if (converter || boundTag) {
		tag = linkCtx && linkCtx.tag;
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
		}
		tag._er = onError && value;
		tagHandlersFromProps(tag, tagCtx);

		tagCtx.view = view;

		tag.ctx = tagCtx.ctx || tag.ctx || {};
		tagCtx.ctx = undefined;

		value = tag.cvtArgs(converter !== "true" && converter)[0]; // If there is a convertBack but no convert, converter will be "true"

		// Call onRender (used by JsViews if present, to add binding annotations around rendered content)
		value = boundTag && view._.onRender
			? view._.onRender(value, view, tag)
			: value;
	}
	return value != undefined ? value : "";
}

function convertArgs(converter) {
	var tag = this,
		tagCtx = tag.tagCtx,
		view = tagCtx.view,
		args = tagCtx.args;

	converter = converter || tag.convert;
	converter = converter && ("" + converter === converter
		? (view.getRsc("converters", converter) || error("Unknown converter: '" + converter + "'"))
		: converter);

	args = !args.length && !tagCtx.index // On the opening tag with no args, bind to the current data context
		? [view.data]
		: converter
			? args.slice() // If there is a converter, use a copy of the tagCtx.args array for rendering, and replace the args[0] in
			// the copied array with the converted value. But we do not modify the value of tag.tagCtx.args[0] (the original args array)
			: args; // If no converter, get the original tagCtx.args

	if (converter) {
		if (converter.depends) {
			tag.depends = $sub.getDeps(tag.depends, tag, converter.depends, converter);
		}
		args[0] = converter.apply(tag, args);
	}
	return args;
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
	var tag, tag_, tagDef, template, tags, attr, parentTag, i, l, itemRet, tagCtx, tagCtxCtx,
		content, callInit, mapDef, thisMap, args, props, initialTmpl, tagDataMap, contentCtx,
		ret = "",
		linkCtx = parentView.linkCtx || 0,
		ctx = parentView.ctx,
		parentTmpl = tmpl || parentView.tmpl,
		// if tagCtx is an integer, then it is the key for the compiled function to return the boundTag tagCtxs
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

	if (onError !== undefined) {
		ret += onError;
		tagCtxs = onError = [{props: {}, args: []}];
	} else if (boundTag) {
		tagCtxs = boundTag(parentView.data, parentView, $sub);
	}

	l = tagCtxs.length;
	for (i = 0; i < l; i++) {
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
			// Instantiate tag if it does not yet exist
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
				error("{^{" + tagName + "}} tag must be data-bound");
			}
			//TODO better perf for childTags() - keep child tag.tags array, (and remove child, when disposed)
			// tag.tags = [];
		}
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
		for (i = 0; i < l; i++) {
			tagCtx = tag.tagCtx = tagCtxs[i];
			props = tagCtx.props;
			args = tag.cvtArgs();

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
			tag.ctx = tagCtx.ctx;

			if (!i) {
				if (callInit) {
					initialTmpl = tag.template;
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

			itemRet = undefined;
			if (tag.render) {
				itemRet = tag.render.apply(tag, args);
				if (parentView.linked && itemRet && tag.linkedElem && !rWrappedInViewMarker.test(itemRet)) {
					// When a tag renders content from the render method, with data linking, and has a linkedElem binding, then we need to wrap with
					// view markers, if absent, so the content is a view associated with the tag, which will correctly dispose bindings if deleted.
					itemRet = renderWithViews($.templates(itemRet), args[0], undefined, undefined, parentView, undefined, undefined, tag);
				}
			}
			if (!args.length) {
				args = [parentView]; // no arguments - (e.g. {{else}}) get data context from view.
			}
			if (itemRet === undefined) {
				contentCtx = args[0]; // Default data context for wrapped block content is the first argument. Defined tag.contentCtx function to override this.
				if (tag.contentCtx) {
					contentCtx = tag.contentCtx(contentCtx) || contentCtx;
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
		self.ctx = context;
	}
}

View.prototype = {
	get: getView,
	getIndex: getIndex,
	getRsc: getResource,
	getTmpl: getTemplate,
	hlp: getHelper,
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
	var tmpl, baseTag, prop,
		compiledDef = new $sub._tg();

	function Tag() {
		var tag = this;
		tag._ = {
			inline: true,
			unlinked: true
		};

		tag.tagName = name;
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
	if (compiledDef.init !== false) {
		// Set init: false on tagDef if you want to provide just a render method, or render and template, but no constructor or prototype.
		// so equivalent to setting tag to render function, except you can also provide a template.
		(Tag.prototype = compiledDef).constructor = compiledDef._ctr = Tag;
	}

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
						elem = $(document).find(value)[0]; // if jQuery is loaded, test for selector returning elements, and get first element
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
							value = $.data(elem)[jsvTmpl];
						}
					} else {
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
		if (name && !parentTmpl && name !== jsvTmpl) {
			$render[name] = compiledTmpl;
		}
		return compiledTmpl;
	}
}

//==== /end of function compileTmpl ====

//=================
// compileViewModel
//=================

function getDefaultVal(defaultVal, data) {
	return $.isFunction(defaultVal)
		? defaultVal.call(data)
		: defaultVal;
}

function unmapArray(modelArr) {
		var i, arr = [],
			l = modelArr.length;
		for (i=0; i<l; i++) {
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
		l = getters ? getters.length : 0,
		$observable = $.observable,
		getterNames = {};

	function GetNew(args) {
		constructor.apply(this, args);
	}

	function vm() {
		return new GetNew(arguments);
	}

	function iterate(data, action) {
		var j, getterType, defaultVal, prop, ob,
			m = getters.length;
		for (j=0; j<m; j++) {
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
		var i, j,  l, m, prop,
			ob = data,
			arr = [];

		if ($isArray(data)) {
			data = data || [];
			l = data.length;
			for (i=0; i<l; i++) {
				arr.push(this.map(data[i]));
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
				if (prop !== $expando  && !getterNames[prop]) {
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
		var i, j, l, m, prop, mod, found, assigned, ob, newModArr,
			model = this;

		if ($isArray(model)) {
			assigned = {};
			newModArr = [];
			l = data.length;
			m = model.length;
			for (i=0; i<l; i++) {
				ob = data[i];
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
		var ob, prop, i, l, getterType, arr, value,
			model = this;

		if ($isArray(model)) {
			return unmapArray(model);
		}
		ob = {};
		l = getters.length;
		for (i=0; i<l; i++) {
			prop = getters[i];
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
			if (prop !== "_is" && !getterNames[prop] && prop !== $expando  && (prop.charAt(0) !== "_" || !getterNames[prop.slice(1)]) && !$.isFunction(model[prop])) {
				ob[prop] = model[prop];
			}
		}
		return ob;
	}

	GetNew.prototype = proto;

	for (i=0; i<l; i++) {
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

		var onStore, compile, itemName, thisStore;
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
			item = compile ? compile.call(thisStore, name, item, parentTmpl, 0) : item;
			if (name) {
				thisStore[name] = item;
			}
		}
		if (compile && item) {
			item._is = storeName; // Only do this for compiled objects (tags, templates...)
		}
		if (item && (onStore = $sub.onStore[storeName])) {
			// e.g. JsViews integration
			onStore(name, item, compile);
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
		if (itemVar) {
			newView.it = itemVar;
		}
		itemVar = newView.it;
		for (i = 0, l = data.length; i < l; i++) {
			// Create a view for each data item.
			if (itemVar) {
				setItemVar(data[i]); // use modified ctx with user-named ~item
			}
			childView = new View(newCtx, "item", newView, data[i], tmpl, (key || 0) + i, onRender, newView.content);

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
		if (tag && !tag.flow) {
			newView.tag = tag;
			tag.view = newView;
		}
		result += tmpl.fn(data, newView, $sub);
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
		: "{Error: " + e.message + "}";

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

		var pathBindings = (bind || isLinkExpr) && [[]],
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
				pathBindings = current[7] && [[]];
				current[8] = markup.substring(current[8], index); // contentMarkup for block tag
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
							props += key + keyValue + ",";
							paramsProps += key + "'" + param + "',";
							hasHandlers = hasHandlers || rHasHandlers.test(keyToken);
						}
						return "";
					}).slice(0, -1);
			}

			if (pathBindings && pathBindings[0]) {
				pathBindings.pop(); // Remove the bindings that was prepared for next arg. (There is always an extra one ready).
			}

			newNode = [
					tagName,
					converter || !!convertBack || hasHandlers || "",
					block && [],
					parsedParam(paramsArgs || (tagName === ":" ? "'#data'," : ""), paramsProps, paramsCtxProps), // {{:}} equivalent to {{:#data}}
					parsedParam(args || (tagName === ":" ? "data," : ""), props, ctxProps),
					onError,
					useTrigger,
					pathBindings || 0
				];
			content.push(newNode);
			if (block) {
				stack.push(current);
				current = newNode;
				current[8] = loc; // Store current location of open tag, to be able to add contentMarkup when we reach closing tag
			}
		} else if (closeBlock) {
			blockTagCheck(closeBlock !== current[0] && current[0] !== "else" && closeBlock, current[0]);
			current[8] = markup.substring(current[8], index); // contentMarkup for block tag
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
		blockTagCheck("" + loc !== loc && (+loc[8] === loc[8]) && loc[0]);
	}
//			result = tmplFnsCache[markup] = buildCode(astTop, tmpl);
//		}

	if (isLinkExpr) {
		result = buildCode(astTop, markup, isLinkExpr);
		bindings = [];
		i = astTop.length;
		while (i--) {
			bindings.unshift(astTop[i][7]);  // With data-link expressions, pathBindings array for tagCtx[i] is astTop[i][7]
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
	for (; i < l; i++) {
		paths = pathsArr[i];
		for (key in paths) {
			if (key !== "_jsvto" && paths.hasOwnProperty(key) && paths[key].length) {
				fn.deps = fn.deps.concat(paths[key]); // deps is the concatenation of the paths arrays for the different bindings
			}
		}
	}
	fn.paths = paths; // The array of paths arrays for the different bindings
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
							? 'view.hlp("' + helper + '")'
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
						if (theOb._jsv) {
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
			prn  ="[j._sq(";
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
							newOb._jsv = exprFn;
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
							? (parenDepth && syntaxError(params), bindings && pathBindings.pop(), named = path, boundName = bound, paramIndex = index + all.length, bound && (bindings = bndCtx.bd = pathBindings[named] = []), path + ':')
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
	var i, node, tagName, converter, tagCtx, hasTag, hasEncoder, getsVal, hasCnvt, useCnvt, tmplBindings, pathBindings, params, boundOnErrStart, boundOnErrEnd,
		tagRender, nestedTmpls, tmplName, nestedTmpl, tagAndElses, content, markup, nextIsElse, oldCode, isElse, isGetVal, tagCtxFn, onError, tagStart, trigger,
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
				markup = node[8] && node[8].replace(rUnescapeQuotes, "$1");
				if (isElse = tagName === "else") {
					if (pathBindings) {
						pathBindings.push(node[7]);
					}
				} else {
					tmplBindingKey = 0;
					if (tmplBindings && (pathBindings = node[7])) { // Array of paths, or false if not data-bound
						pathBindings = [pathBindings];
						tmplBindingKey = tmplBindings.push(1); // Add placeholder in tmplBindings for compiled function
					}
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

				if (isGetVal && (pathBindings || trigger || converter && converter !== HTML)) {
					// For convertVal we need a compiled function to return the new tagCtx(s)
					tagCtxFn = new Function("data,view,j,u", " // " + tmplName + " " + tmplBindingKey + " " + tagName
										+ "\nreturn {" + tagCtx + "};");
					tagCtxFn._er = onError;
					tagCtxFn._tag = tagName;

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
						? (useCnvt = undefined, useViews = hasCnvt = true, tagRender + (pathBindings
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
						if (isLinkExpr) {
							return code; // For a data-link expression we return the compiled tagCtxs function
						}
						boundOnErrStart = tagRender + tmplBindingKey + ",undefined,";
						boundOnErrEnd = ")";
					}

					// This is the last {{else}} for an inline tag.
					// For a bound tag, pass the tagCtxs fn lookup key to renderTag.
					// For an unbound tag, include the code directly for evaluating tagCtxs array
					code = oldCode + tagStart + tagRender + (tmplBindingKey || code) + ")";
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
		syntaxError("Compiled template code:\n\n" + code + '\n: "' + e.message + '"');
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
	var tmplElem = this.jquery && (this[0] || error('Unknown template: "' + this.selector + '"')),
		tmpl = tmplElem.getAttribute(tmplAttr);

	return renderContent.call(tmpl ? $.data(tmplElem)[jsvTmpl] : $templates(tmplElem), data, context, noIteration);
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
		cvtArgs: convertArgs
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
					? new Function("", "return '" + debugMode + "';" )
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
//# sourceMappingURL=data:application/json;charset:utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJub2RlX21vZHVsZXMvanNyZW5kZXIvanNyZW5kZXIuanMiLCJ0ZXN0L2Jyb3dzZXJpZnkvMTItbmVzdGVkLXVuaXQtdGVzdHMuanMiLCJ0ZXN0L3RlbXBsYXRlcy9pbm5lci5odG1sIiwidGVzdC90ZW1wbGF0ZXMvb3V0ZXIuaHRtbCJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTtBQ0FBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOzs7QUM3eUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOzs7OztBQ3ZDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7Ozs7QUNaQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBIiwiZmlsZSI6ImdlbmVyYXRlZC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzQ29udGVudCI6WyIoZnVuY3Rpb24gZSh0LG4scil7ZnVuY3Rpb24gcyhvLHUpe2lmKCFuW29dKXtpZighdFtvXSl7dmFyIGE9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtpZighdSYmYSlyZXR1cm4gYShvLCEwKTtpZihpKXJldHVybiBpKG8sITApO3ZhciBmPW5ldyBFcnJvcihcIkNhbm5vdCBmaW5kIG1vZHVsZSAnXCIrbytcIidcIik7dGhyb3cgZi5jb2RlPVwiTU9EVUxFX05PVF9GT1VORFwiLGZ9dmFyIGw9bltvXT17ZXhwb3J0czp7fX07dFtvXVswXS5jYWxsKGwuZXhwb3J0cyxmdW5jdGlvbihlKXt2YXIgbj10W29dWzFdW2VdO3JldHVybiBzKG4/bjplKX0sbCxsLmV4cG9ydHMsZSx0LG4scil9cmV0dXJuIG5bb10uZXhwb3J0c312YXIgaT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2Zvcih2YXIgbz0wO288ci5sZW5ndGg7bysrKXMocltvXSk7cmV0dXJuIHN9KSIsIi8qISBKc1JlbmRlciB2MC45LjgyIChCZXRhKTogaHR0cDovL2pzdmlld3MuY29tLyNqc3JlbmRlciAqL1xuLyohICoqVkVSU0lPTiBGT1IgV0VCKiogKEZvciBOT0RFLkpTIHNlZSBodHRwOi8vanN2aWV3cy5jb20vZG93bmxvYWQvanNyZW5kZXItbm9kZS5qcykgKi9cbi8qXG4gKiBCZXN0LW9mLWJyZWVkIHRlbXBsYXRpbmcgaW4gYnJvd3NlciBvciBvbiBOb2RlLmpzLlxuICogRG9lcyBub3QgcmVxdWlyZSBqUXVlcnksIG9yIEhUTUwgRE9NXG4gKiBJbnRlZ3JhdGVzIHdpdGggSnNWaWV3cyAoaHR0cDovL2pzdmlld3MuY29tLyNqc3ZpZXdzKVxuICpcbiAqIENvcHlyaWdodCAyMDE2LCBCb3JpcyBNb29yZVxuICogUmVsZWFzZWQgdW5kZXIgdGhlIE1JVCBMaWNlbnNlLlxuICovXG5cbi8vanNoaW50IC1XMDE4LCAtVzA0MVxuXG4oZnVuY3Rpb24oZmFjdG9yeSwgZ2xvYmFsKSB7XG5cdC8vIGdsb2JhbCB2YXIgaXMgdGhlIHRoaXMgb2JqZWN0LCB3aGljaCBpcyB3aW5kb3cgd2hlbiBydW5uaW5nIGluIHRoZSB1c3VhbCBicm93c2VyIGVudmlyb25tZW50XG5cdHZhciAkID0gZ2xvYmFsLmpRdWVyeTtcblxuXHRpZiAodHlwZW9mIGV4cG9ydHMgPT09IFwib2JqZWN0XCIpIHsgLy8gQ29tbW9uSlMgZS5nLiBCcm93c2VyaWZ5XG5cdFx0bW9kdWxlLmV4cG9ydHMgPSAkXG5cdFx0XHQ/IGZhY3RvcnkoZ2xvYmFsLCAkKVxuXHRcdFx0OiBmdW5jdGlvbigkKSB7IC8vIElmIG5vIGdsb2JhbCBqUXVlcnksIHRha2Ugb3B0aW9uYWwgalF1ZXJ5IHBhc3NlZCBhcyBwYXJhbWV0ZXI6IHJlcXVpcmUoJ2pzcmVuZGVyJykoalF1ZXJ5KVxuXHRcdFx0XHRpZiAoJCAmJiAhJC5mbikge1xuXHRcdFx0XHRcdHRocm93IFwiUHJvdmlkZSBqUXVlcnkgb3IgbnVsbFwiO1xuXHRcdFx0XHR9XG5cdFx0XHRcdHJldHVybiBmYWN0b3J5KGdsb2JhbCwgJCk7XG5cdFx0XHR9O1xuXHR9IGVsc2UgaWYgKHR5cGVvZiBkZWZpbmUgPT09IFwiZnVuY3Rpb25cIiAmJiBkZWZpbmUuYW1kKSB7IC8vIEFNRCBzY3JpcHQgbG9hZGVyLCBlLmcuIFJlcXVpcmVKU1xuXHRcdGRlZmluZShmdW5jdGlvbigpIHtcblx0XHRcdHJldHVybiBmYWN0b3J5KGdsb2JhbCk7XG5cdFx0fSk7XG5cdH0gZWxzZSB7IC8vIEJyb3dzZXIgdXNpbmcgcGxhaW4gPHNjcmlwdD4gdGFnXG5cdFx0ZmFjdG9yeShnbG9iYWwsIGZhbHNlKTtcblx0fVxufSAoXG5cbi8vIGZhY3RvcnkgKGZvciBqc3JlbmRlci5qcylcbmZ1bmN0aW9uKGdsb2JhbCwgJCkge1xuXCJ1c2Ugc3RyaWN0XCI7XG5cbi8vPT09PT09PT09PT09PT09PT09PT09PT09PT0gVG9wLWxldmVsIHZhcnMgPT09PT09PT09PT09PT09PT09PT09PT09PT1cblxuLy8gZ2xvYmFsIHZhciBpcyB0aGUgdGhpcyBvYmplY3QsIHdoaWNoIGlzIHdpbmRvdyB3aGVuIHJ1bm5pbmcgaW4gdGhlIHVzdWFsIGJyb3dzZXIgZW52aXJvbm1lbnRcbnZhciBzZXRHbG9iYWxzID0gJCA9PT0gZmFsc2U7IC8vIE9ubHkgc2V0IGdsb2JhbHMgaWYgc2NyaXB0IGJsb2NrIGluIGJyb3dzZXIgKG5vdCBBTUQgYW5kIG5vdCBDb21tb25KUylcblxuJCA9ICQgJiYgJC5mbiA/ICQgOiBnbG9iYWwualF1ZXJ5OyAvLyAkIGlzIGpRdWVyeSBwYXNzZWQgaW4gYnkgQ29tbW9uSlMgbG9hZGVyIChCcm93c2VyaWZ5KSwgb3IgZ2xvYmFsIGpRdWVyeS5cblxudmFyIHZlcnNpb25OdW1iZXIgPSBcInYwLjkuODJcIixcblx0anN2U3RvcmVOYW1lLCByVGFnLCByVG1wbFN0cmluZywgdG9wVmlldywgJHZpZXdzLFx0JGV4cGFuZG8sXG5cbi8vVE9ET1x0dG1wbEZuc0NhY2hlID0ge30sXG5cdCRpc0Z1bmN0aW9uLCAkaXNBcnJheSwgJHRlbXBsYXRlcywgJGNvbnZlcnRlcnMsICRoZWxwZXJzLCAkdGFncywgJHN1YiwgJHN1YlNldHRpbmdzLCAkc3ViU2V0dGluZ3NBZHZhbmNlZCwgJHZpZXdzU2V0dGluZ3MsIGRlbGltT3BlbkNoYXIwLCBkZWxpbU9wZW5DaGFyMSwgZGVsaW1DbG9zZUNoYXIwLCBkZWxpbUNsb3NlQ2hhcjEsIGxpbmtDaGFyLCBzZXR0aW5nLCBiYXNlT25FcnJvcixcblxuXHRyUGF0aCA9IC9eKCEqPykoPzpudWxsfHRydWV8ZmFsc2V8XFxkW1xcZC5dKnwoW1xcdyRdK3xcXC58fihbXFx3JF0rKXwjKHZpZXd8KFtcXHckXSspKT8pKFtcXHckLl5dKj8pKD86Wy5bXl0oW1xcdyRdKylcXF0/KT8pJC9nLFxuXHQvLyAgICAgICAgbm90ICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIG9iamVjdCAgICAgaGVscGVyICAgIHZpZXcgIHZpZXdQcm9wZXJ0eSBwYXRoVG9rZW5zICAgICAgbGVhZlRva2VuXG5cblx0clBhcmFtcyA9IC8oXFwoKSg/PVxccypcXCgpfCg/OihbKFtdKVxccyopPyg/OihcXF4/KSghKj9bI35dP1tcXHckLl5dKyk/XFxzKigoXFwrXFwrfC0tKXxcXCt8LXwmJnxcXHxcXHx8PT09fCE9PXw9PXwhPXw8PXw+PXxbPD4lKjo/XFwvXXwoPSkpXFxzKnwoISo/WyN+XT9bXFx3JC5eXSspKFsoW10pPyl8KCxcXHMqKXwoXFwoPylcXFxcPyg/OignKXwoXCIpKXwoPzpcXHMqKChbKVxcXV0pKD89XFxzKlsuXl18XFxzKiR8W14oW10pfFspXFxdXSkoWyhbXT8pKXwoXFxzKykvZyxcblx0Ly8gICAgICAgICAgbGZ0UHJuMCAgICAgICAgbGZ0UHJuICAgICAgICBib3VuZCAgICAgICAgICAgIHBhdGggICAgb3BlcmF0b3IgZXJyICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZXEgICAgICAgICAgICAgcGF0aDIgICAgICAgcHJuICAgIGNvbW1hICAgbGZ0UHJuMiAgIGFwb3MgcXVvdCAgICAgIHJ0UHJuIHJ0UHJuRG90ICAgICAgICAgICAgICAgICAgICAgICAgICAgcHJuMiAgc3BhY2Vcblx0Ly8gKGxlZnQgcGFyZW4/IGZvbGxvd2VkIGJ5IChwYXRoPyBmb2xsb3dlZCBieSBvcGVyYXRvcikgb3IgKHBhdGggZm9sbG93ZWQgYnkgbGVmdCBwYXJlbj8pKSBvciBjb21tYSBvciBhcG9zIG9yIHF1b3Qgb3IgcmlnaHQgcGFyZW4gb3Igc3BhY2VcblxuXHRpc1JlbmRlckNhbGwsXG5cdHJOZXdMaW5lID0gL1sgXFx0XSooXFxyXFxufFxcbnxcXHIpL2csXG5cdHJVbmVzY2FwZVF1b3RlcyA9IC9cXFxcKFsnXCJdKS9nLFxuXHRyRXNjYXBlUXVvdGVzID0gL1snXCJcXFxcXS9nLCAvLyBFc2NhcGUgcXVvdGVzIGFuZCBcXCBjaGFyYWN0ZXJcblx0ckJ1aWxkSGFzaCA9IC8oPzpcXHgwOHxeKShvbmVycm9yOik/KD86KH4/KSgoW1xcdyRfXFwuXSspOik/KFteXFx4MDhdKykpXFx4MDgoLCk/KFteXFx4MDhdKykvZ2ksXG5cdHJUZXN0RWxzZUlmID0gL15pZlxccy8sXG5cdHJGaXJzdEVsZW0gPSAvPChcXHcrKVs+XFxzXS8sXG5cdHJBdHRyRW5jb2RlID0gL1tcXHgwMGA+PFwiJyY9XS9nLCAvLyBJbmNsdWRlcyA+IGVuY29kaW5nIHNpbmNlIHJDb252ZXJ0TWFya2VycyBpbiBKc1ZpZXdzIGRvZXMgbm90IHNraXAgPiBjaGFyYWN0ZXJzIGluIGF0dHJpYnV0ZSBzdHJpbmdzXG5cdHJJc0h0bWwgPSAvW1xceDAwYD48XFxcIicmPV0vLFxuXHRySGFzSGFuZGxlcnMgPSAvXm9uW0EtWl18XmNvbnZlcnQoQmFjayk/JC8sXG5cdHJXcmFwcGVkSW5WaWV3TWFya2VyID0gL15cXCNcXGQrX2BbXFxzXFxTXSpcXC9cXGQrX2AkLyxcblx0ckh0bWxFbmNvZGUgPSByQXR0ckVuY29kZSxcblx0dmlld0lkID0gMCxcblx0Y2hhckVudGl0aWVzID0ge1xuXHRcdFwiJlwiOiBcIiZhbXA7XCIsXG5cdFx0XCI8XCI6IFwiJmx0O1wiLFxuXHRcdFwiPlwiOiBcIiZndDtcIixcblx0XHRcIlxceDAwXCI6IFwiJiMwO1wiLFxuXHRcdFwiJ1wiOiBcIiYjMzk7XCIsXG5cdFx0J1wiJzogXCImIzM0O1wiLFxuXHRcdFwiYFwiOiBcIiYjOTY7XCIsXG5cdFx0XCI9XCI6IFwiJiM2MTtcIlxuXHR9LFxuXHRIVE1MID0gXCJodG1sXCIsXG5cdE9CSkVDVCA9IFwib2JqZWN0XCIsXG5cdHRtcGxBdHRyID0gXCJkYXRhLWpzdi10bXBsXCIsXG5cdGpzdlRtcGwgPSBcImpzdlRtcGxcIixcblx0aW5kZXhTdHIgPSBcIkZvciAjaW5kZXggaW4gbmVzdGVkIGJsb2NrIHVzZSAjZ2V0SW5kZXgoKS5cIixcblx0JHJlbmRlciA9IHt9LFxuXG5cdGpzciA9IGdsb2JhbC5qc3JlbmRlcixcblx0anNyVG9KcSA9IGpzciAmJiAkICYmICEkLnJlbmRlciwgLy8gSnNSZW5kZXIgYWxyZWFkeSBsb2FkZWQsIHdpdGhvdXQgalF1ZXJ5LiBidXQgd2Ugd2lsbCByZS1sb2FkIGl0IG5vdyB0byBhdHRhY2ggdG8galF1ZXJ5XG5cblx0anN2U3RvcmVzID0ge1xuXHRcdHRlbXBsYXRlOiB7XG5cdFx0XHRjb21waWxlOiBjb21waWxlVG1wbFxuXHRcdH0sXG5cdFx0dGFnOiB7XG5cdFx0XHRjb21waWxlOiBjb21waWxlVGFnXG5cdFx0fSxcblx0XHR2aWV3TW9kZWw6IHtcblx0XHRcdGNvbXBpbGU6IGNvbXBpbGVWaWV3TW9kZWxcblx0XHR9LFxuXHRcdGhlbHBlcjoge30sXG5cdFx0Y29udmVydGVyOiB7fVxuXHR9O1xuXG5cdC8vIHZpZXdzIG9iamVjdCAoJC52aWV3cyBpZiBqUXVlcnkgaXMgbG9hZGVkLCBqc3JlbmRlci52aWV3cyBpZiBubyBqUXVlcnksIGUuZy4gaW4gTm9kZS5qcylcblx0JHZpZXdzID0ge1xuXHRcdGpzdmlld3M6IHZlcnNpb25OdW1iZXIsXG5cdFx0c3ViOiB7XG5cdFx0XHQvLyBzdWJzY3JpcHRpb24sIGUuZy4gSnNWaWV3cyBpbnRlZ3JhdGlvblxuXHRcdFx0VmlldzogVmlldyxcblx0XHRcdEVycjogSnNWaWV3c0Vycm9yLFxuXHRcdFx0dG1wbEZuOiB0bXBsRm4sXG5cdFx0XHRwYXJzZTogcGFyc2VQYXJhbXMsXG5cdFx0XHRleHRlbmQ6ICRleHRlbmQsXG5cdFx0XHRleHRlbmRDdHg6IGV4dGVuZEN0eCxcblx0XHRcdHN5bnRheEVycjogc3ludGF4RXJyb3IsXG5cdFx0XHRvblN0b3JlOiB7fSxcblx0XHRcdGFkZFNldHRpbmc6IGFkZFNldHRpbmcsXG5cdFx0XHRzZXR0aW5nczoge1xuXHRcdFx0XHRhbGxvd0NvZGU6IGZhbHNlXG5cdFx0XHR9LFxuXHRcdFx0YWR2U2V0OiBub29wLCAvLyBVcGRhdGUgYWR2YW5jZWQgc2V0dGluZ3Ncblx0XHRcdF90aHM6IHRhZ0hhbmRsZXJzRnJvbVByb3BzLFxuXHRcdFx0X3RnOiBmdW5jdGlvbigpIHt9LCAvLyBDb25zdHJ1Y3RvciBmb3IgdGFnRGVmXG5cdFx0XHRfY252dDogY29udmVydFZhbCxcblx0XHRcdF90YWc6IHJlbmRlclRhZyxcblx0XHRcdF9lcjogZXJyb3IsXG5cdFx0XHRfZXJyOiBvblJlbmRlckVycm9yLFxuXHRcdFx0X2h0bWw6IGh0bWxFbmNvZGUsXG5cdFx0XHRfY3A6IHJldFZhbCwgLy8gR2V0IGNvbXBpbGVkIGNvbnRleHR1YWwgcGFyYW1ldGVycyAob3IgcHJvcGVydGllcykgfmZvbz1leHByLiBJbiBKc1JlbmRlciwgc2ltcGx5IHJldHVybnMgdmFsLlxuXHRcdFx0X3NxOiBmdW5jdGlvbih0b2tlbikge1xuXHRcdFx0XHRpZiAodG9rZW4gPT09IFwiY29uc3RydWN0b3JcIikge1xuXHRcdFx0XHRcdHN5bnRheEVycm9yKFwiXCIpO1xuXHRcdFx0XHR9XG5cdFx0XHRcdHJldHVybiB0b2tlbjtcblx0XHRcdH1cblx0XHR9LFxuXHRcdHNldHRpbmdzOiB7XG5cdFx0XHRkZWxpbWl0ZXJzOiAkdmlld3NEZWxpbWl0ZXJzLFxuXHRcdFx0YWR2YW5jZWQ6IGZ1bmN0aW9uKHZhbHVlKSB7XG5cdFx0XHRcdHJldHVybiB2YWx1ZVxuXHRcdFx0XHRcdD8gKFxuXHRcdFx0XHRcdFx0XHQkZXh0ZW5kKCRzdWJTZXR0aW5nc0FkdmFuY2VkLCB2YWx1ZSksXG5cdFx0XHRcdFx0XHRcdCRzdWIuYWR2U2V0KCksXG5cdFx0XHRcdFx0XHRcdCR2aWV3c1NldHRpbmdzXG5cdFx0XHRcdFx0XHQpXG5cdFx0XHRcdFx0XHQ6ICRzdWJTZXR0aW5nc0FkdmFuY2VkO1xuXHRcdFx0XHR9XG5cdFx0fSxcblx0XHRnZXRDdHg6IHJldFZhbCwgLy8gR2V0IGN0eC5mb28gdmFsdWUuIEluIEpzUmVuZGVyLCBzaW1wbHkgcmV0dXJucyB2YWwuXG5cdFx0bWFwOiBkYXRhTWFwICAgIC8vIElmIGpzT2JzZXJ2YWJsZSBsb2FkZWQgZmlyc3QsIHVzZSB0aGF0IGRlZmluaXRpb24gb2YgZGF0YU1hcFxuXHR9O1xuXG5mdW5jdGlvbiBnZXREZXJpdmVkTWV0aG9kKGJhc2VNZXRob2QsIG1ldGhvZCkge1xuXHRyZXR1cm4gZnVuY3Rpb24oKSB7XG5cdFx0dmFyIHJldCxcblx0XHRcdHRhZyA9IHRoaXMsXG5cdFx0XHRwcmV2QmFzZSA9IHRhZy5iYXNlO1xuXG5cdFx0dGFnLmJhc2UgPSBiYXNlTWV0aG9kOyAvLyBXaXRoaW4gbWV0aG9kIGNhbGwsIGNhbGxpbmcgdGhpcy5iYXNlIHdpbGwgY2FsbCB0aGUgYmFzZSBtZXRob2Rcblx0XHRyZXQgPSBtZXRob2QuYXBwbHkodGFnLCBhcmd1bWVudHMpOyAvLyBDYWxsIHRoZSBtZXRob2Rcblx0XHR0YWcuYmFzZSA9IHByZXZCYXNlOyAvLyBSZXBsYWNlIHRoaXMuYmFzZSB0byBiZSB0aGUgYmFzZSBtZXRob2Qgb2YgdGhlIHByZXZpb3VzIGNhbGwsIGZvciBjaGFpbmVkIGNhbGxzXG5cdFx0cmV0dXJuIHJldDtcblx0fTtcbn1cblxuZnVuY3Rpb24gZ2V0TWV0aG9kKGJhc2VNZXRob2QsIG1ldGhvZCkge1xuXHQvLyBGb3IgZGVyaXZlZCBtZXRob2RzIChvciBoYW5kbGVycyBkZWNsYXJlZCBkZWNsYXJhdGl2ZWx5IGFzIGluIHt7OmZvbyBvbkNoYW5nZT1+Zm9vQ2hhbmdlZH19IHJlcGxhY2UgYnkgYSBkZXJpdmVkIG1ldGhvZCwgdG8gYWxsb3cgdXNpbmcgdGhpcy5iYXNlKC4uLilcblx0Ly8gb3IgdGhpcy5iYXNlQXBwbHkoYXJndW1lbnRzKSB0byBjYWxsIHRoZSBiYXNlIGltcGxlbWVudGF0aW9uLiAoRXF1aXZhbGVudCB0byB0aGlzLl9zdXBlciguLi4pIGFuZCB0aGlzLl9zdXBlckFwcGx5KGFyZ3VtZW50cykgaW4galF1ZXJ5IFVJKVxuXHRpZiAoJGlzRnVuY3Rpb24obWV0aG9kKSkge1xuXHRcdG1ldGhvZCA9IGdldERlcml2ZWRNZXRob2QoXG5cdFx0XHRcdCFiYXNlTWV0aG9kXG5cdFx0XHRcdFx0PyBub29wIC8vIG5vIGJhc2UgbWV0aG9kIGltcGxlbWVudGF0aW9uLCBzbyB1c2Ugbm9vcCBhcyBiYXNlIG1ldGhvZFxuXHRcdFx0XHRcdDogYmFzZU1ldGhvZC5fZFxuXHRcdFx0XHRcdFx0PyBiYXNlTWV0aG9kIC8vIGJhc2VNZXRob2QgaXMgYSBkZXJpdmVkIG1ldGhvZCwgc28gdXMgaXRcblx0XHRcdFx0XHRcdDogZ2V0RGVyaXZlZE1ldGhvZChub29wLCBiYXNlTWV0aG9kKSwgLy8gYmFzZU1ldGhvZCBpcyBub3QgZGVyaXZlZCBzbyBtYWtlIGl0cyBiYXNlIG1ldGhvZCBiZSB0aGUgbm9vcCBtZXRob2Rcblx0XHRcdFx0bWV0aG9kXG5cdFx0XHQpO1xuXHRcdG1ldGhvZC5fZCA9IDE7IC8vIEFkZCBmbGFnIHRoYXQgdGhpcyBpcyBhIGRlcml2ZWQgbWV0aG9kXG5cdH1cblx0cmV0dXJuIG1ldGhvZDtcbn1cblxuZnVuY3Rpb24gdGFnSGFuZGxlcnNGcm9tUHJvcHModGFnLCB0YWdDdHgpIHtcblx0Zm9yICh2YXIgcHJvcCBpbiB0YWdDdHgucHJvcHMpIHtcblx0XHRpZiAockhhc0hhbmRsZXJzLnRlc3QocHJvcCkpIHtcblx0XHRcdHRhZ1twcm9wXSA9IGdldE1ldGhvZCh0YWdbcHJvcF0sIHRhZ0N0eC5wcm9wc1twcm9wXSk7XG5cdFx0XHQvLyBDb3B5IG92ZXIgdGhlIG9uRm9vIHByb3BzLCBjb252ZXJ0IGFuZCBjb252ZXJ0QmFjayBmcm9tIHRhZ0N0eC5wcm9wcyB0byB0YWcgKG92ZXJyaWRlcyB2YWx1ZXMgaW4gdGFnRGVmKS5cblx0XHRcdC8vIE5vdGU6IHVuc3VwcG9ydGVkIHNjZW5hcmlvOiBpZiBoYW5kbGVycyBhcmUgZHluYW1pY2FsbHkgYWRkZWQgXm9uRm9vPWV4cHJlc3Npb24gdGhpcyB3aWxsIHdvcmssIGJ1dCBkeW5hbWljYWxseSByZW1vdmluZyB3aWxsIG5vdCB3b3JrLlxuXHRcdH1cblx0fVxufVxuXG5mdW5jdGlvbiByZXRWYWwodmFsKSB7XG5cdHJldHVybiB2YWw7XG59XG5cbmZ1bmN0aW9uIG5vb3AoKSB7XG5cdHJldHVybiBcIlwiO1xufVxuXG5mdW5jdGlvbiBkYmdCcmVhayh2YWwpIHtcblx0Ly8gVXNhZ2UgZXhhbXBsZXM6IHt7ZGJnOi4uLn19LCB7ezp+ZGJnKC4uLil9fSwge3tkYmcgLi4uL319LCB7Xntmb3IgLi4uIG9uQWZ0ZXJMaW5rPX5kYmd9fSBldGMuXG5cdHRyeSB7XG5cdFx0Y29uc29sZS5sb2coXCJKc1JlbmRlciBkYmcgYnJlYWtwb2ludDogXCIgKyB2YWwpO1xuXHRcdHRocm93IFwiZGJnIGJyZWFrcG9pbnRcIjsgLy8gVG8gYnJlYWsgaGVyZSwgc3RvcCBvbiBjYXVnaHQgZXhjZXB0aW9ucy5cblx0fVxuXHRjYXRjaCAoZSkge31cblx0cmV0dXJuIHRoaXMuYmFzZSA/IHRoaXMuYmFzZUFwcGx5KGFyZ3VtZW50cykgOiB2YWw7XG59XG5cbmZ1bmN0aW9uIEpzVmlld3NFcnJvcihtZXNzYWdlKSB7XG5cdC8vIEVycm9yIGV4Y2VwdGlvbiB0eXBlIGZvciBKc1ZpZXdzL0pzUmVuZGVyXG5cdC8vIE92ZXJyaWRlIG9mICQudmlld3Muc3ViLkVycm9yIGlzIHBvc3NpYmxlXG5cdHRoaXMubmFtZSA9ICgkLmxpbmsgPyBcIkpzVmlld3NcIiA6IFwiSnNSZW5kZXJcIikgKyBcIiBFcnJvclwiO1xuXHR0aGlzLm1lc3NhZ2UgPSBtZXNzYWdlIHx8IHRoaXMubmFtZTtcbn1cblxuZnVuY3Rpb24gJGV4dGVuZCh0YXJnZXQsIHNvdXJjZSkge1xuXHRmb3IgKHZhciBuYW1lIGluIHNvdXJjZSkge1xuXHRcdHRhcmdldFtuYW1lXSA9IHNvdXJjZVtuYW1lXTtcblx0fVxuXHRyZXR1cm4gdGFyZ2V0O1xufVxuXG4oSnNWaWV3c0Vycm9yLnByb3RvdHlwZSA9IG5ldyBFcnJvcigpKS5jb25zdHJ1Y3RvciA9IEpzVmlld3NFcnJvcjtcblxuLy89PT09PT09PT09PT09PT09PT09PT09PT09PSBUb3AtbGV2ZWwgZnVuY3Rpb25zID09PT09PT09PT09PT09PT09PT09PT09PT09XG5cbi8vPT09PT09PT09PT09PT09PT09PVxuLy8gdmlld3MuZGVsaW1pdGVyc1xuLy89PT09PT09PT09PT09PT09PT09XG5cbmZ1bmN0aW9uICR2aWV3c0RlbGltaXRlcnMob3BlbkNoYXJzLCBjbG9zZUNoYXJzLCBsaW5rKSB7XG5cdC8vIFNldCB0aGUgdGFnIG9wZW5pbmcgYW5kIGNsb3NpbmcgZGVsaW1pdGVycyBhbmQgJ2xpbmsnIGNoYXJhY3Rlci4gRGVmYXVsdCBpcyBcInt7XCIsIFwifX1cIiBhbmQgXCJeXCJcblx0Ly8gb3BlbkNoYXJzLCBjbG9zZUNoYXJzOiBvcGVuaW5nIGFuZCBjbG9zaW5nIHN0cmluZ3MsIGVhY2ggd2l0aCB0d28gY2hhcmFjdGVyc1xuXHRpZiAoIW9wZW5DaGFycykge1xuXHRcdHJldHVybiAkc3ViU2V0dGluZ3MuZGVsaW1pdGVycztcblx0fVxuXHRpZiAoJGlzQXJyYXkob3BlbkNoYXJzKSkge1xuXHRcdHJldHVybiAkdmlld3NEZWxpbWl0ZXJzLmFwcGx5KCR2aWV3cywgb3BlbkNoYXJzKTtcblx0fVxuXG5cdCRzdWJTZXR0aW5ncy5kZWxpbWl0ZXJzID0gW29wZW5DaGFycywgY2xvc2VDaGFycywgbGlua0NoYXIgPSBsaW5rID8gbGluay5jaGFyQXQoMCkgOiBsaW5rQ2hhcl07XG5cblx0ZGVsaW1PcGVuQ2hhcjAgPSBvcGVuQ2hhcnMuY2hhckF0KDApOyAvLyBFc2NhcGUgdGhlIGNoYXJhY3RlcnMgLSBzaW5jZSB0aGV5IGNvdWxkIGJlIHJlZ2V4IHNwZWNpYWwgY2hhcmFjdGVyc1xuXHRkZWxpbU9wZW5DaGFyMSA9IG9wZW5DaGFycy5jaGFyQXQoMSk7XG5cdGRlbGltQ2xvc2VDaGFyMCA9IGNsb3NlQ2hhcnMuY2hhckF0KDApO1xuXHRkZWxpbUNsb3NlQ2hhcjEgPSBjbG9zZUNoYXJzLmNoYXJBdCgxKTtcblx0b3BlbkNoYXJzID0gXCJcXFxcXCIgKyBkZWxpbU9wZW5DaGFyMCArIFwiKFxcXFxcIiArIGxpbmtDaGFyICsgXCIpP1xcXFxcIiArIGRlbGltT3BlbkNoYXIxOyAvLyBEZWZhdWx0IGlzIFwie157XCJcblx0Y2xvc2VDaGFycyA9IFwiXFxcXFwiICsgZGVsaW1DbG9zZUNoYXIwICsgXCJcXFxcXCIgKyBkZWxpbUNsb3NlQ2hhcjE7ICAgICAgICAgICAgICAgICAgIC8vIERlZmF1bHQgaXMgXCJ9fVwiXG5cdC8vIEJ1aWxkIHJlZ2V4IHdpdGggbmV3IGRlbGltaXRlcnNcblx0Ly8gICAgICAgICAgW3RhZyAgICAoZm9sbG93ZWQgYnkgLyBzcGFjZSBvciB9KSAgb3IgY3Z0citjb2xvbiBvciBodG1sIG9yIGNvZGVdIGZvbGxvd2VkIGJ5IHNwYWNlK3BhcmFtcyB0aGVuIGNvbnZlcnRCYWNrP1xuXHRyVGFnID0gXCIoPzooXFxcXHcrKD89W1xcXFwvXFxcXHNcXFxcXCIgKyBkZWxpbUNsb3NlQ2hhcjAgKyBcIl0pKXwoXFxcXHcrKT8oOil8KD4pfChcXFxcKikpXFxcXHMqKCg/OlteXFxcXFwiXG5cdFx0KyBkZWxpbUNsb3NlQ2hhcjAgKyBcIl18XFxcXFwiICsgZGVsaW1DbG9zZUNoYXIwICsgXCIoPyFcXFxcXCIgKyBkZWxpbUNsb3NlQ2hhcjEgKyBcIikpKj8pXCI7XG5cblx0Ly8gTWFrZSByVGFnIGF2YWlsYWJsZSB0byBKc1ZpZXdzIChvciBvdGhlciBjb21wb25lbnRzKSBmb3IgcGFyc2luZyBiaW5kaW5nIGV4cHJlc3Npb25zXG5cdCRzdWIuclRhZyA9IFwiKD86XCIgKyByVGFnICsgXCIpXCI7XG5cdC8vICAgICAgICAgICAgICAgICAgICAgICAgeyBePyB7ICAgdGFnK3BhcmFtcyBzbGFzaD8gIG9yIGNsb3NpbmdUYWcgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBvciBjb21tZW50XG5cdHJUYWcgPSBuZXcgUmVnRXhwKFwiKD86XCIgKyBvcGVuQ2hhcnMgKyByVGFnICsgXCIoXFxcXC8pP3xcXFxcXCIgKyBkZWxpbU9wZW5DaGFyMCArIFwiKFxcXFxcIiArIGxpbmtDaGFyICsgXCIpP1xcXFxcIiArIGRlbGltT3BlbkNoYXIxICsgXCIoPzooPzpcXFxcLyhcXFxcdyspKVxcXFxzKnwhLS1bXFxcXHNcXFxcU10qPy0tKSlcIiArIGNsb3NlQ2hhcnMsIFwiZ1wiKTtcblxuXHQvLyBEZWZhdWx0OiAgYmluZCAgICAgdGFnTmFtZSAgICAgICAgIGN2dCAgIGNsbiBodG1sIGNvZGUgICAgcGFyYW1zICAgICAgICAgICAgc2xhc2ggICBiaW5kMiAgICAgICAgIGNsb3NlQmxrICBjb21tZW50XG5cdC8vICAgICAgLyg/OnsoXFxeKT97KD86KFxcdysoPz1bXFwvXFxzfV0pKXwoXFx3Kyk/KDopfCg+KXwoXFwqKSlcXHMqKCg/OltefV18fSg/IX0pKSo/KShcXC8pP3x7KFxcXik/eyg/Oig/OlxcLyhcXHcrKSlcXHMqfCEtLVtcXHNcXFNdKj8tLSkpfX1cblxuXHQkc3ViLnJUbXBsID0gbmV3IFJlZ0V4cChcIjwuKj58KFteXFxcXFxcXFxdfF4pW3t9XXxcIiArIG9wZW5DaGFycyArIFwiLipcIiArIGNsb3NlQ2hhcnMpO1xuXHQvLyAkc3ViLnJUbXBsIGxvb2tzIGZvciBodG1sIHRhZ3Mgb3IgeyBvciB9IGNoYXIgbm90IHByZWNlZGVkIGJ5IFxcXFwsIG9yIEpzUmVuZGVyIHRhZ3Mge3t4eHh9fS4gRWFjaCBvZiB0aGVzZSBzdHJpbmdzIGFyZSBjb25zaWRlcmVkXG5cdC8vIE5PVCB0byBiZSBqUXVlcnkgc2VsZWN0b3JzXG5cdHJldHVybiAkdmlld3NTZXR0aW5ncztcbn1cblxuLy89PT09PT09PT1cbi8vIFZpZXcuZ2V0XG4vLz09PT09PT09PVxuXG5mdW5jdGlvbiBnZXRWaWV3KGlubmVyLCB0eXBlKSB7IC8vdmlldy5nZXQoaW5uZXIsIHR5cGUpXG5cdGlmICghdHlwZSAmJiBpbm5lciAhPT0gdHJ1ZSkge1xuXHRcdC8vIHZpZXcuZ2V0KHR5cGUpXG5cdFx0dHlwZSA9IGlubmVyO1xuXHRcdGlubmVyID0gdW5kZWZpbmVkO1xuXHR9XG5cblx0dmFyIHZpZXdzLCBpLCBsLCBmb3VuZCxcblx0XHR2aWV3ID0gdGhpcyxcblx0XHRyb290ID0gIXR5cGUgfHwgdHlwZSA9PT0gXCJyb290XCI7XG5cdFx0Ly8gSWYgdHlwZSBpcyB1bmRlZmluZWQsIHJldHVybnMgcm9vdCB2aWV3ICh2aWV3IHVuZGVyIHRvcCB2aWV3KS5cblxuXHRpZiAoaW5uZXIpIHtcblx0XHQvLyBHbyB0aHJvdWdoIHZpZXdzIC0gdGhpcyBvbmUsIGFuZCBhbGwgbmVzdGVkIG9uZXMsIGRlcHRoLWZpcnN0IC0gYW5kIHJldHVybiBmaXJzdCBvbmUgd2l0aCBnaXZlbiB0eXBlLlxuXHRcdC8vIElmIHR5cGUgaXMgdW5kZWZpbmVkLCBpLmUuIHZpZXcuZ2V0KHRydWUpLCByZXR1cm4gZmlyc3QgY2hpbGQgdmlldy5cblx0XHRmb3VuZCA9IHR5cGUgJiYgdmlldy50eXBlID09PSB0eXBlICYmIHZpZXc7XG5cdFx0aWYgKCFmb3VuZCkge1xuXHRcdFx0dmlld3MgPSB2aWV3LnZpZXdzO1xuXHRcdFx0aWYgKHZpZXcuXy51c2VLZXkpIHtcblx0XHRcdFx0Zm9yIChpIGluIHZpZXdzKSB7XG5cdFx0XHRcdFx0aWYgKGZvdW5kID0gdHlwZSA/IHZpZXdzW2ldLmdldChpbm5lciwgdHlwZSkgOiB2aWV3c1tpXSkge1xuXHRcdFx0XHRcdFx0YnJlYWs7XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHR9XG5cdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRmb3IgKGkgPSAwLCBsID0gdmlld3MubGVuZ3RoOyAhZm91bmQgJiYgaSA8IGw7IGkrKykge1xuXHRcdFx0XHRcdGZvdW5kID0gdHlwZSA/IHZpZXdzW2ldLmdldChpbm5lciwgdHlwZSkgOiB2aWV3c1tpXTtcblx0XHRcdFx0fVxuXHRcdFx0fVxuXHRcdH1cblx0fSBlbHNlIGlmIChyb290KSB7XG5cdFx0Ly8gRmluZCByb290IHZpZXcuICh2aWV3IHdob3NlIHBhcmVudCBpcyB0b3Agdmlldylcblx0XHR3aGlsZSAodmlldy5wYXJlbnQpIHtcblx0XHRcdGZvdW5kID0gdmlldztcblx0XHRcdHZpZXcgPSB2aWV3LnBhcmVudDtcblx0XHR9XG5cdH0gZWxzZSB7XG5cdFx0d2hpbGUgKHZpZXcgJiYgIWZvdW5kKSB7XG5cdFx0XHQvLyBHbyB0aHJvdWdoIHZpZXdzIC0gdGhpcyBvbmUsIGFuZCBhbGwgcGFyZW50IG9uZXMgLSBhbmQgcmV0dXJuIGZpcnN0IG9uZSB3aXRoIGdpdmVuIHR5cGUuXG5cdFx0XHRmb3VuZCA9IHZpZXcudHlwZSA9PT0gdHlwZSA/IHZpZXcgOiB1bmRlZmluZWQ7XG5cdFx0XHR2aWV3ID0gdmlldy5wYXJlbnQ7XG5cdFx0fVxuXHR9XG5cdHJldHVybiBmb3VuZDtcbn1cblxuZnVuY3Rpb24gZ2V0TmVzdGVkSW5kZXgoKSB7XG5cdHZhciB2aWV3ID0gdGhpcy5nZXQoXCJpdGVtXCIpO1xuXHRyZXR1cm4gdmlldyA/IHZpZXcuaW5kZXggOiB1bmRlZmluZWQ7XG59XG5cbmdldE5lc3RlZEluZGV4LmRlcGVuZHMgPSBmdW5jdGlvbigpIHtcblx0cmV0dXJuIFt0aGlzLmdldChcIml0ZW1cIiksIFwiaW5kZXhcIl07XG59O1xuXG5mdW5jdGlvbiBnZXRJbmRleCgpIHtcblx0cmV0dXJuIHRoaXMuaW5kZXg7XG59XG5cbmdldEluZGV4LmRlcGVuZHMgPSBcImluZGV4XCI7XG5cbi8vPT09PT09PT09PVxuLy8gVmlldy5obHBcbi8vPT09PT09PT09PVxuXG5mdW5jdGlvbiBnZXRIZWxwZXIoaGVscGVyLCBpc0NvbnRleHRDYikge1xuXHQvLyBIZWxwZXIgbWV0aG9kIGNhbGxlZCBhcyB2aWV3LmhscChrZXkpIGZyb20gY29tcGlsZWQgdGVtcGxhdGUsIGZvciBoZWxwZXJzIG9yIHRlbXBsYXRlIHBhcmFtZXRlcnMgfmZvb1xuXHR2YXIgd3JhcHBlZCwgZGVwcyxcblx0dmlldyA9IHRoaXMsXG5cdHJlcyA9IHZpZXcuY3R4O1xuXG5cdGlmIChyZXMpIHtcblx0XHRyZXMgPSByZXNbaGVscGVyXTtcblx0fVxuXHRpZiAocmVzID09PSB1bmRlZmluZWQpIHtcblx0XHRyZXMgPSAkaGVscGVyc1toZWxwZXJdO1xuXHR9XG5cdGlmIChyZXMgJiYgcmVzLl9jcCkgeyAvLyBJZiB0aGlzIGhlbHBlciByZXNvdXJjZSBpcyBhIGNvbnRleHR1YWwgcGFyYW1ldGVyLCB+Zm9vPWV4cHJcblx0XHRpZiAoaXNDb250ZXh0Q2IpIHsgLy8gSW4gYSBjb250ZXh0IGNhbGxiYWNrIGZvciBhIGNvbnRleHR1YWwgcGFyYW0sIHJldHVybiB0aGUgW2N1cnJlbnREYXRhLCBkZXBlbmRlbmNpZXMuLi5dIGFycmF5IC0gbmVlZGVkIGZvciBvYnNlcnZlIGNhbGxcblx0XHRcdGRlcHMgPSAkc3ViLl9jZW8ocmVzWzFdLmRlcHMpOyAgLy8gZm4gZGVwcywgd2l0aCBhbnkgZXhwck9icyBjbG9uZWRcblx0XHRcdGRlcHMudW5zaGlmdChyZXNbMF0uZGF0YSk7ICAgICAgLy8gdmlldy5kYXRhXG5cdFx0XHRkZXBzLl9jcCA9IHRydWU7XG5cdFx0XHRyZXR1cm4gZGVwcztcblx0XHR9XG5cdFx0cmVzID0gJHZpZXdzLmdldEN0eChyZXMpOyAvLyBJZiBhIGNvbnRleHR1YWwgcGFyYW0sIGJ1dCBub3QgYSBjb250ZXh0IGNhbGxiYWNrLCByZXR1cm4gZXZhbHVhdGVkIHBhcmFtIC0gZm4oZGF0YSwgdmlldywgailcblx0fVxuXG5cdGlmIChyZXMpIHtcblx0XHRpZiAoJGlzRnVuY3Rpb24ocmVzKSAmJiAhcmVzLl93cnApIHtcblx0XHRcdC8vIElmIGl0IGlzIG9mIHR5cGUgZnVuY3Rpb24sIGFuZCBub3QgYWxyZWFkeSB3cmFwcGVkLCB3ZSB3aWxsIHdyYXAgaXQsIHNvIGlmIGNhbGxlZCB3aXRoIG5vIHRoaXMgcG9pbnRlciBpdCB3aWxsIGJlIGNhbGxlZCB3aXRoIHRoZVxuXHRcdFx0Ly8gdmlldyBhcyAndGhpcycgY29udGV4dC4gSWYgdGhlIGhlbHBlciB+Zm9vKCkgd2FzIGluIGEgZGF0YS1saW5rIGV4cHJlc3Npb24sIHRoZSB2aWV3IHdpbGwgaGF2ZSBhICd0ZW1wb3JhcnknIGxpbmtDdHggcHJvcGVydHkgdG9vLlxuXHRcdFx0Ly8gTm90ZSB0aGF0IGhlbHBlciBmdW5jdGlvbnMgb24gZGVlcGVyIHBhdGhzIHdpbGwgaGF2ZSBzcGVjaWZpYyB0aGlzIHBvaW50ZXJzLCBmcm9tIHRoZSBwcmVjZWRpbmcgcGF0aC5cblx0XHRcdC8vIEZvciBleGFtcGxlLCB+dXRpbC5mb28oKSB3aWxsIGhhdmUgdGhlIH51dGlsIG9iamVjdCBhcyAndGhpcycgcG9pbnRlclxuXHRcdFx0d3JhcHBlZCA9IGZ1bmN0aW9uKCkge1xuXHRcdFx0XHRyZXR1cm4gcmVzLmFwcGx5KCghdGhpcyB8fCB0aGlzID09PSBnbG9iYWwpID8gdmlldyA6IHRoaXMsIGFyZ3VtZW50cyk7XG5cdFx0XHR9O1xuXHRcdFx0d3JhcHBlZC5fd3JwID0gdmlldztcblx0XHRcdCRleHRlbmQod3JhcHBlZCwgcmVzKTsgLy8gQXR0YWNoIHNhbWUgZXhwYW5kb3MgKGlmIGFueSkgdG8gdGhlIHdyYXBwZWQgZnVuY3Rpb25cblx0XHR9XG5cdH1cblx0cmV0dXJuIHdyYXBwZWQgfHwgcmVzO1xufVxuXG5mdW5jdGlvbiBnZXRUZW1wbGF0ZSh0bXBsKSB7XG5cdHJldHVybiB0bXBsICYmICh0bXBsLmZuXG5cdFx0PyB0bXBsXG5cdFx0OiB0aGlzLmdldFJzYyhcInRlbXBsYXRlc1wiLCB0bXBsKSB8fCAkdGVtcGxhdGVzKHRtcGwpKTsgLy8gbm90IHlldCBjb21waWxlZFxufVxuXG4vLz09PT09PT09PT09PT09XG4vLyB2aWV3cy5fY252dFxuLy89PT09PT09PT09PT09PVxuXG5mdW5jdGlvbiBjb252ZXJ0VmFsKGNvbnZlcnRlciwgdmlldywgdGFnQ3R4LCBvbkVycm9yKSB7XG5cdC8vIHNlbGYgaXMgdGVtcGxhdGUgb2JqZWN0IG9yIGxpbmtDdHggb2JqZWN0XG5cdHZhciB0YWcsIHZhbHVlLFxuXHRcdC8vIGlmIHRhZ0N0eCBpcyBhbiBpbnRlZ2VyLCB0aGVuIGl0IGlzIHRoZSBrZXkgZm9yIHRoZSBjb21waWxlZCBmdW5jdGlvbiB0byByZXR1cm4gdGhlIGJvdW5kVGFnIHRhZ0N0eFxuXHRcdGJvdW5kVGFnID0gdHlwZW9mIHRhZ0N0eCA9PT0gXCJudW1iZXJcIiAmJiB2aWV3LnRtcGwuYm5kc1t0YWdDdHgtMV0sXG5cdFx0bGlua0N0eCA9IHZpZXcubGlua0N0eDsgLy8gRm9yIGRhdGEtbGluaz1cIntjdnQ6Li4ufVwiLi4uXG5cblx0aWYgKG9uRXJyb3IgIT09IHVuZGVmaW5lZCkge1xuXHRcdHRhZ0N0eCA9IG9uRXJyb3IgPSB7cHJvcHM6IHt9LCBhcmdzOiBbb25FcnJvcl19O1xuXHR9IGVsc2UgaWYgKGJvdW5kVGFnKSB7XG5cdFx0dGFnQ3R4ID0gYm91bmRUYWcodmlldy5kYXRhLCB2aWV3LCAkc3ViKTtcblx0fVxuXG5cdHZhbHVlID0gdGFnQ3R4LmFyZ3NbMF07XG5cdGlmIChjb252ZXJ0ZXIgfHwgYm91bmRUYWcpIHtcblx0XHR0YWcgPSBsaW5rQ3R4ICYmIGxpbmtDdHgudGFnO1xuXHRcdGlmICghdGFnKSB7XG5cdFx0XHR0YWcgPSAkZXh0ZW5kKG5ldyAkc3ViLl90ZygpLCB7XG5cdFx0XHRcdF86IHtcblx0XHRcdFx0XHRpbmxpbmU6ICFsaW5rQ3R4LFxuXHRcdFx0XHRcdGJuZDogYm91bmRUYWcsXG5cdFx0XHRcdFx0dW5saW5rZWQ6IHRydWVcblx0XHRcdFx0fSxcblx0XHRcdFx0dGFnTmFtZTogXCI6XCIsXG5cdFx0XHRcdGN2dDogY29udmVydGVyLFxuXHRcdFx0XHRmbG93OiB0cnVlLFxuXHRcdFx0XHR0YWdDdHg6IHRhZ0N0eFxuXHRcdFx0fSk7XG5cdFx0XHRpZiAobGlua0N0eCkge1xuXHRcdFx0XHRsaW5rQ3R4LnRhZyA9IHRhZztcblx0XHRcdFx0dGFnLmxpbmtDdHggPSBsaW5rQ3R4O1xuXHRcdFx0fVxuXHRcdFx0dGFnQ3R4LmN0eCA9IGV4dGVuZEN0eCh0YWdDdHguY3R4LCAobGlua0N0eCA/IGxpbmtDdHgudmlldyA6IHZpZXcpLmN0eCk7XG5cdFx0fVxuXHRcdHRhZy5fZXIgPSBvbkVycm9yICYmIHZhbHVlO1xuXHRcdHRhZ0hhbmRsZXJzRnJvbVByb3BzKHRhZywgdGFnQ3R4KTtcblxuXHRcdHRhZ0N0eC52aWV3ID0gdmlldztcblxuXHRcdHRhZy5jdHggPSB0YWdDdHguY3R4IHx8IHRhZy5jdHggfHwge307XG5cdFx0dGFnQ3R4LmN0eCA9IHVuZGVmaW5lZDtcblxuXHRcdHZhbHVlID0gdGFnLmN2dEFyZ3MoY29udmVydGVyICE9PSBcInRydWVcIiAmJiBjb252ZXJ0ZXIpWzBdOyAvLyBJZiB0aGVyZSBpcyBhIGNvbnZlcnRCYWNrIGJ1dCBubyBjb252ZXJ0LCBjb252ZXJ0ZXIgd2lsbCBiZSBcInRydWVcIlxuXG5cdFx0Ly8gQ2FsbCBvblJlbmRlciAodXNlZCBieSBKc1ZpZXdzIGlmIHByZXNlbnQsIHRvIGFkZCBiaW5kaW5nIGFubm90YXRpb25zIGFyb3VuZCByZW5kZXJlZCBjb250ZW50KVxuXHRcdHZhbHVlID0gYm91bmRUYWcgJiYgdmlldy5fLm9uUmVuZGVyXG5cdFx0XHQ/IHZpZXcuXy5vblJlbmRlcih2YWx1ZSwgdmlldywgdGFnKVxuXHRcdFx0OiB2YWx1ZTtcblx0fVxuXHRyZXR1cm4gdmFsdWUgIT0gdW5kZWZpbmVkID8gdmFsdWUgOiBcIlwiO1xufVxuXG5mdW5jdGlvbiBjb252ZXJ0QXJncyhjb252ZXJ0ZXIpIHtcblx0dmFyIHRhZyA9IHRoaXMsXG5cdFx0dGFnQ3R4ID0gdGFnLnRhZ0N0eCxcblx0XHR2aWV3ID0gdGFnQ3R4LnZpZXcsXG5cdFx0YXJncyA9IHRhZ0N0eC5hcmdzO1xuXG5cdGNvbnZlcnRlciA9IGNvbnZlcnRlciB8fCB0YWcuY29udmVydDtcblx0Y29udmVydGVyID0gY29udmVydGVyICYmIChcIlwiICsgY29udmVydGVyID09PSBjb252ZXJ0ZXJcblx0XHQ/ICh2aWV3LmdldFJzYyhcImNvbnZlcnRlcnNcIiwgY29udmVydGVyKSB8fCBlcnJvcihcIlVua25vd24gY29udmVydGVyOiAnXCIgKyBjb252ZXJ0ZXIgKyBcIidcIikpXG5cdFx0OiBjb252ZXJ0ZXIpO1xuXG5cdGFyZ3MgPSAhYXJncy5sZW5ndGggJiYgIXRhZ0N0eC5pbmRleCAvLyBPbiB0aGUgb3BlbmluZyB0YWcgd2l0aCBubyBhcmdzLCBiaW5kIHRvIHRoZSBjdXJyZW50IGRhdGEgY29udGV4dFxuXHRcdD8gW3ZpZXcuZGF0YV1cblx0XHQ6IGNvbnZlcnRlclxuXHRcdFx0PyBhcmdzLnNsaWNlKCkgLy8gSWYgdGhlcmUgaXMgYSBjb252ZXJ0ZXIsIHVzZSBhIGNvcHkgb2YgdGhlIHRhZ0N0eC5hcmdzIGFycmF5IGZvciByZW5kZXJpbmcsIGFuZCByZXBsYWNlIHRoZSBhcmdzWzBdIGluXG5cdFx0XHQvLyB0aGUgY29waWVkIGFycmF5IHdpdGggdGhlIGNvbnZlcnRlZCB2YWx1ZS4gQnV0IHdlIGRvIG5vdCBtb2RpZnkgdGhlIHZhbHVlIG9mIHRhZy50YWdDdHguYXJnc1swXSAodGhlIG9yaWdpbmFsIGFyZ3MgYXJyYXkpXG5cdFx0XHQ6IGFyZ3M7IC8vIElmIG5vIGNvbnZlcnRlciwgZ2V0IHRoZSBvcmlnaW5hbCB0YWdDdHguYXJnc1xuXG5cdGlmIChjb252ZXJ0ZXIpIHtcblx0XHRpZiAoY29udmVydGVyLmRlcGVuZHMpIHtcblx0XHRcdHRhZy5kZXBlbmRzID0gJHN1Yi5nZXREZXBzKHRhZy5kZXBlbmRzLCB0YWcsIGNvbnZlcnRlci5kZXBlbmRzLCBjb252ZXJ0ZXIpO1xuXHRcdH1cblx0XHRhcmdzWzBdID0gY29udmVydGVyLmFwcGx5KHRhZywgYXJncyk7XG5cdH1cblx0cmV0dXJuIGFyZ3M7XG59XG5cbi8vPT09PT09PT09PT09PVxuLy8gdmlld3MuX3RhZ1xuLy89PT09PT09PT09PT09XG5cbmZ1bmN0aW9uIGdldFJlc291cmNlKHJlc291cmNlVHlwZSwgaXRlbU5hbWUpIHtcblx0dmFyIHJlcywgc3RvcmUsXG5cdFx0dmlldyA9IHRoaXM7XG5cdHdoaWxlICgocmVzID09PSB1bmRlZmluZWQpICYmIHZpZXcpIHtcblx0XHRzdG9yZSA9IHZpZXcudG1wbCAmJiB2aWV3LnRtcGxbcmVzb3VyY2VUeXBlXTtcblx0XHRyZXMgPSBzdG9yZSAmJiBzdG9yZVtpdGVtTmFtZV07XG5cdFx0dmlldyA9IHZpZXcucGFyZW50O1xuXHR9XG5cdHJldHVybiByZXMgfHwgJHZpZXdzW3Jlc291cmNlVHlwZV1baXRlbU5hbWVdO1xufVxuXG5mdW5jdGlvbiByZW5kZXJUYWcodGFnTmFtZSwgcGFyZW50VmlldywgdG1wbCwgdGFnQ3R4cywgaXNVcGRhdGUsIG9uRXJyb3IpIHtcblx0cGFyZW50VmlldyA9IHBhcmVudFZpZXcgfHwgdG9wVmlldztcblx0dmFyIHRhZywgdGFnXywgdGFnRGVmLCB0ZW1wbGF0ZSwgdGFncywgYXR0ciwgcGFyZW50VGFnLCBpLCBsLCBpdGVtUmV0LCB0YWdDdHgsIHRhZ0N0eEN0eCxcblx0XHRjb250ZW50LCBjYWxsSW5pdCwgbWFwRGVmLCB0aGlzTWFwLCBhcmdzLCBwcm9wcywgaW5pdGlhbFRtcGwsIHRhZ0RhdGFNYXAsIGNvbnRlbnRDdHgsXG5cdFx0cmV0ID0gXCJcIixcblx0XHRsaW5rQ3R4ID0gcGFyZW50Vmlldy5saW5rQ3R4IHx8IDAsXG5cdFx0Y3R4ID0gcGFyZW50Vmlldy5jdHgsXG5cdFx0cGFyZW50VG1wbCA9IHRtcGwgfHwgcGFyZW50Vmlldy50bXBsLFxuXHRcdC8vIGlmIHRhZ0N0eCBpcyBhbiBpbnRlZ2VyLCB0aGVuIGl0IGlzIHRoZSBrZXkgZm9yIHRoZSBjb21waWxlZCBmdW5jdGlvbiB0byByZXR1cm4gdGhlIGJvdW5kVGFnIHRhZ0N0eHNcblx0XHRib3VuZFRhZyA9IHR5cGVvZiB0YWdDdHhzID09PSBcIm51bWJlclwiICYmIHBhcmVudFZpZXcudG1wbC5ibmRzW3RhZ0N0eHMtMV07XG5cblx0aWYgKHRhZ05hbWUuX2lzID09PSBcInRhZ1wiKSB7XG5cdFx0dGFnID0gdGFnTmFtZTtcblx0XHR0YWdOYW1lID0gdGFnLnRhZ05hbWU7XG5cdFx0dGFnQ3R4cyA9IHRhZy50YWdDdHhzO1xuXHRcdHRlbXBsYXRlID0gdGFnLnRlbXBsYXRlO1xuXHR9IGVsc2Uge1xuXHRcdHRhZ0RlZiA9IHBhcmVudFZpZXcuZ2V0UnNjKFwidGFnc1wiLCB0YWdOYW1lKSB8fCBlcnJvcihcIlVua25vd24gdGFnOiB7e1wiICsgdGFnTmFtZSArIFwifX0gXCIpO1xuXHRcdHRlbXBsYXRlID0gdGFnRGVmLnRlbXBsYXRlO1xuXHR9XG5cblx0aWYgKG9uRXJyb3IgIT09IHVuZGVmaW5lZCkge1xuXHRcdHJldCArPSBvbkVycm9yO1xuXHRcdHRhZ0N0eHMgPSBvbkVycm9yID0gW3twcm9wczoge30sIGFyZ3M6IFtdfV07XG5cdH0gZWxzZSBpZiAoYm91bmRUYWcpIHtcblx0XHR0YWdDdHhzID0gYm91bmRUYWcocGFyZW50Vmlldy5kYXRhLCBwYXJlbnRWaWV3LCAkc3ViKTtcblx0fVxuXG5cdGwgPSB0YWdDdHhzLmxlbmd0aDtcblx0Zm9yIChpID0gMDsgaSA8IGw7IGkrKykge1xuXHRcdHRhZ0N0eCA9IHRhZ0N0eHNbaV07XG5cdFx0aWYgKCFsaW5rQ3R4IHx8ICFsaW5rQ3R4LnRhZyB8fCBpICYmICFsaW5rQ3R4LnRhZy5fLmlubGluZSB8fCB0YWcuX2VyKSB7XG5cdFx0XHQvLyBJbml0aWFsaXplIHRhZ0N0eFxuXHRcdFx0Ly8gRm9yIGJsb2NrIHRhZ3MsIHRhZ0N0eC50bXBsIGlzIGFuIGludGVnZXIgPiAwXG5cdFx0XHRpZiAoY29udGVudCA9IHBhcmVudFRtcGwudG1wbHMgJiYgdGFnQ3R4LnRtcGwpIHtcblx0XHRcdFx0Y29udGVudCA9IHRhZ0N0eC5jb250ZW50ID0gcGFyZW50VG1wbC50bXBsc1tjb250ZW50IC0gMV07XG5cdFx0XHR9XG5cdFx0XHR0YWdDdHguaW5kZXggPSBpO1xuXHRcdFx0dGFnQ3R4LnRtcGwgPSBjb250ZW50OyAvLyBTZXQgdGhlIHRtcGwgcHJvcGVydHkgdG8gdGhlIGNvbnRlbnQgb2YgdGhlIGJsb2NrIHRhZ1xuXHRcdFx0dGFnQ3R4LnJlbmRlciA9IHJlbmRlckNvbnRlbnQ7XG5cdFx0XHR0YWdDdHgudmlldyA9IHBhcmVudFZpZXc7XG5cdFx0XHR0YWdDdHguY3R4ID0gZXh0ZW5kQ3R4KHRhZ0N0eC5jdHgsIGN0eCk7IC8vIENsb25lIGFuZCBleHRlbmQgcGFyZW50Vmlldy5jdHhcblx0XHR9XG5cdFx0aWYgKHRtcGwgPSB0YWdDdHgucHJvcHMudG1wbCkge1xuXHRcdFx0Ly8gSWYgdGhlIHRtcGwgcHJvcGVydHkgaXMgb3ZlcnJpZGRlbiwgc2V0IHRoZSB2YWx1ZSAod2hlbiBpbml0aWFsaXppbmcsIG9yLCBpbiBjYXNlIG9mIGJpbmRpbmc6IF50bXBsPS4uLiwgd2hlbiB1cGRhdGluZylcblx0XHRcdHRhZ0N0eC50bXBsID0gcGFyZW50Vmlldy5nZXRUbXBsKHRtcGwpO1xuXHRcdH1cblxuXHRcdGlmICghdGFnKSB7XG5cdFx0XHQvLyBUaGlzIHdpbGwgb25seSBiZSBoaXQgZm9yIGluaXRpYWwgdGFnQ3R4IChub3QgZm9yIHt7ZWxzZX19KSAtIGlmIHRoZSB0YWcgaW5zdGFuY2UgZG9lcyBub3QgZXhpc3QgeWV0XG5cdFx0XHQvLyBJbnN0YW50aWF0ZSB0YWcgaWYgaXQgZG9lcyBub3QgeWV0IGV4aXN0XG5cdFx0XHQvLyBJZiB0aGUgdGFnIGhhcyBub3QgYWxyZWFkeSBiZWVuIGluc3RhbnRpYXRlZCwgd2Ugd2lsbCBjcmVhdGUgYSBuZXcgaW5zdGFuY2UuXG5cdFx0XHQvLyB+dGFnIHdpbGwgYWNjZXNzIHRoZSB0YWcsIGV2ZW4gd2l0aGluIHRoZSByZW5kZXJpbmcgb2YgdGhlIHRlbXBsYXRlIGNvbnRlbnQgb2YgdGhpcyB0YWcuXG5cdFx0XHQvLyBGcm9tIGNoaWxkL2Rlc2NlbmRhbnQgdGFncywgY2FuIGFjY2VzcyB1c2luZyB+dGFnLnBhcmVudCwgb3IgfnBhcmVudFRhZ3MudGFnTmFtZVxuXHRcdFx0dGFnID0gbmV3IHRhZ0RlZi5fY3RyKCk7XG5cdFx0XHRjYWxsSW5pdCA9ICEhdGFnLmluaXQ7XG5cblx0XHRcdHRhZy5wYXJlbnQgPSBwYXJlbnRUYWcgPSBjdHggJiYgY3R4LnRhZztcblx0XHRcdHRhZy50YWdDdHhzID0gdGFnQ3R4cztcblx0XHRcdHRhZ0RhdGFNYXAgPSB0YWcuZGF0YU1hcDtcblxuXHRcdFx0aWYgKGxpbmtDdHgpIHtcblx0XHRcdFx0dGFnLl8uaW5saW5lID0gZmFsc2U7XG5cdFx0XHRcdGxpbmtDdHgudGFnID0gdGFnO1xuXHRcdFx0XHR0YWcubGlua0N0eCA9IGxpbmtDdHg7XG5cdFx0XHR9XG5cdFx0XHRpZiAodGFnLl8uYm5kID0gYm91bmRUYWcgfHwgbGlua0N0eC5mbikge1xuXHRcdFx0XHQvLyBCb3VuZCBpZiB7Xnt0YWcuLi59fSBvciBkYXRhLWxpbms9XCJ7dGFnLi4ufVwiXG5cdFx0XHRcdHRhZy5fLmFyclZ3cyA9IHt9O1xuXHRcdFx0fSBlbHNlIGlmICh0YWcuZGF0YUJvdW5kT25seSkge1xuXHRcdFx0XHRlcnJvcihcIntee1wiICsgdGFnTmFtZSArIFwifX0gdGFnIG11c3QgYmUgZGF0YS1ib3VuZFwiKTtcblx0XHRcdH1cblx0XHRcdC8vVE9ETyBiZXR0ZXIgcGVyZiBmb3IgY2hpbGRUYWdzKCkgLSBrZWVwIGNoaWxkIHRhZy50YWdzIGFycmF5LCAoYW5kIHJlbW92ZSBjaGlsZCwgd2hlbiBkaXNwb3NlZClcblx0XHRcdC8vIHRhZy50YWdzID0gW107XG5cdFx0fVxuXHRcdHRhZ0N0eHMgPSB0YWcudGFnQ3R4cztcblx0XHR0YWdEYXRhTWFwID0gdGFnLmRhdGFNYXA7XG5cblx0XHR0YWdDdHgudGFnID0gdGFnO1xuXHRcdGlmICh0YWdEYXRhTWFwICYmIHRhZ0N0eHMpIHtcblx0XHRcdHRhZ0N0eC5tYXAgPSB0YWdDdHhzW2ldLm1hcDsgLy8gQ29weSBvdmVyIHRoZSBjb21waWxlZCBtYXAgaW5zdGFuY2UgZnJvbSB0aGUgcHJldmlvdXMgdGFnQ3R4cyB0byB0aGUgcmVmcmVzaGVkIG9uZXNcblx0XHR9XG5cdFx0aWYgKCF0YWcuZmxvdykge1xuXHRcdFx0dGFnQ3R4Q3R4ID0gdGFnQ3R4LmN0eCA9IHRhZ0N0eC5jdHggfHwge307XG5cblx0XHRcdC8vIHRhZ3MgaGFzaDogdGFnLmN0eC50YWdzLCBtZXJnZWQgd2l0aCBwYXJlbnRWaWV3LmN0eC50YWdzLFxuXHRcdFx0dGFncyA9IHRhZy5wYXJlbnRzID0gdGFnQ3R4Q3R4LnBhcmVudFRhZ3MgPSBjdHggJiYgZXh0ZW5kQ3R4KHRhZ0N0eEN0eC5wYXJlbnRUYWdzLCBjdHgucGFyZW50VGFncykgfHwge307XG5cdFx0XHRpZiAocGFyZW50VGFnKSB7XG5cdFx0XHRcdHRhZ3NbcGFyZW50VGFnLnRhZ05hbWVdID0gcGFyZW50VGFnO1xuXHRcdFx0XHQvL1RPRE8gYmV0dGVyIHBlcmYgZm9yIGNoaWxkVGFnczogcGFyZW50VGFnLnRhZ3MucHVzaCh0YWcpO1xuXHRcdFx0fVxuXHRcdFx0dGFnc1t0YWcudGFnTmFtZV0gPSB0YWdDdHhDdHgudGFnID0gdGFnO1xuXHRcdH1cblx0fVxuXHRpZiAoISh0YWcuX2VyID0gb25FcnJvcikpIHtcblx0XHR0YWdIYW5kbGVyc0Zyb21Qcm9wcyh0YWcsIHRhZ0N0eHNbMF0pO1xuXHRcdHRhZy5yZW5kZXJpbmcgPSB7fTsgLy8gUHJvdmlkZSBvYmplY3QgZm9yIHN0YXRlIGR1cmluZyByZW5kZXIgY2FsbHMgdG8gdGFnIGFuZCBlbHNlcy4gKFVzZWQgYnkge3tpZn19IGFuZCB7e2Zvcn19Li4uKVxuXHRcdGZvciAoaSA9IDA7IGkgPCBsOyBpKyspIHtcblx0XHRcdHRhZ0N0eCA9IHRhZy50YWdDdHggPSB0YWdDdHhzW2ldO1xuXHRcdFx0cHJvcHMgPSB0YWdDdHgucHJvcHM7XG5cdFx0XHRhcmdzID0gdGFnLmN2dEFyZ3MoKTtcblxuXHRcdFx0aWYgKG1hcERlZiA9IHByb3BzLmRhdGFNYXAgfHwgdGFnRGF0YU1hcCkge1xuXHRcdFx0XHRpZiAoYXJncy5sZW5ndGggfHwgcHJvcHMuZGF0YU1hcCkge1xuXHRcdFx0XHRcdHRoaXNNYXAgPSB0YWdDdHgubWFwO1xuXHRcdFx0XHRcdGlmICghdGhpc01hcCB8fCB0aGlzTWFwLnNyYyAhPT0gYXJnc1swXSB8fCBpc1VwZGF0ZSkge1xuXHRcdFx0XHRcdFx0aWYgKHRoaXNNYXAgJiYgdGhpc01hcC5zcmMpIHtcblx0XHRcdFx0XHRcdFx0dGhpc01hcC51bm1hcCgpOyAvLyBvbmx5IGNhbGxlZCBpZiBvYnNlcnZhYmxlIG1hcCAtIG5vdCB3aGVuIG9ubHkgdXNlZCBpbiBKc1JlbmRlciwgZS5nLiBieSB7e3Byb3BzfX1cblx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHRcdHRoaXNNYXAgPSB0YWdDdHgubWFwID0gbWFwRGVmLm1hcChhcmdzWzBdLCBwcm9wcywgdW5kZWZpbmVkLCAhdGFnLl8uYm5kKTtcblx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0YXJncyA9IFt0aGlzTWFwLnRndF07XG5cdFx0XHRcdH1cblx0XHRcdH1cblx0XHRcdHRhZy5jdHggPSB0YWdDdHguY3R4O1xuXG5cdFx0XHRpZiAoIWkpIHtcblx0XHRcdFx0aWYgKGNhbGxJbml0KSB7XG5cdFx0XHRcdFx0aW5pdGlhbFRtcGwgPSB0YWcudGVtcGxhdGU7XG5cdFx0XHRcdFx0dGFnLmluaXQodGFnQ3R4LCBsaW5rQ3R4LCB0YWcuY3R4KTtcblx0XHRcdFx0XHRjYWxsSW5pdCA9IHVuZGVmaW5lZDtcblx0XHRcdFx0fVxuXHRcdFx0XHRpZiAobGlua0N0eCkge1xuXHRcdFx0XHRcdC8vIFNldCBhdHRyIG9uIGxpbmtDdHggdG8gZW5zdXJlIG91dHB1dHRpbmcgdG8gdGhlIGNvcnJlY3QgdGFyZ2V0IGF0dHJpYnV0ZS5cblx0XHRcdFx0XHQvLyBTZXR0aW5nIGVpdGhlciBsaW5rQ3R4LmF0dHIgb3IgdGhpcy5hdHRyIGluIHRoZSBpbml0KCkgYWxsb3dzIHBlci1pbnN0YW5jZSBjaG9pY2Ugb2YgdGFyZ2V0IGF0dHJpYi5cblx0XHRcdFx0XHRsaW5rQ3R4LmF0dHIgPSB0YWcuYXR0ciA9IGxpbmtDdHguYXR0ciB8fCB0YWcuYXR0cjtcblx0XHRcdFx0fVxuXHRcdFx0XHRhdHRyID0gdGFnLmF0dHI7XG5cdFx0XHRcdHRhZy5fLm5vVndzID0gYXR0ciAmJiBhdHRyICE9PSBIVE1MO1xuXHRcdFx0fVxuXG5cdFx0XHRpdGVtUmV0ID0gdW5kZWZpbmVkO1xuXHRcdFx0aWYgKHRhZy5yZW5kZXIpIHtcblx0XHRcdFx0aXRlbVJldCA9IHRhZy5yZW5kZXIuYXBwbHkodGFnLCBhcmdzKTtcblx0XHRcdFx0aWYgKHBhcmVudFZpZXcubGlua2VkICYmIGl0ZW1SZXQgJiYgdGFnLmxpbmtlZEVsZW0gJiYgIXJXcmFwcGVkSW5WaWV3TWFya2VyLnRlc3QoaXRlbVJldCkpIHtcblx0XHRcdFx0XHQvLyBXaGVuIGEgdGFnIHJlbmRlcnMgY29udGVudCBmcm9tIHRoZSByZW5kZXIgbWV0aG9kLCB3aXRoIGRhdGEgbGlua2luZywgYW5kIGhhcyBhIGxpbmtlZEVsZW0gYmluZGluZywgdGhlbiB3ZSBuZWVkIHRvIHdyYXAgd2l0aFxuXHRcdFx0XHRcdC8vIHZpZXcgbWFya2VycywgaWYgYWJzZW50LCBzbyB0aGUgY29udGVudCBpcyBhIHZpZXcgYXNzb2NpYXRlZCB3aXRoIHRoZSB0YWcsIHdoaWNoIHdpbGwgY29ycmVjdGx5IGRpc3Bvc2UgYmluZGluZ3MgaWYgZGVsZXRlZC5cblx0XHRcdFx0XHRpdGVtUmV0ID0gcmVuZGVyV2l0aFZpZXdzKCQudGVtcGxhdGVzKGl0ZW1SZXQpLCBhcmdzWzBdLCB1bmRlZmluZWQsIHVuZGVmaW5lZCwgcGFyZW50VmlldywgdW5kZWZpbmVkLCB1bmRlZmluZWQsIHRhZyk7XG5cdFx0XHRcdH1cblx0XHRcdH1cblx0XHRcdGlmICghYXJncy5sZW5ndGgpIHtcblx0XHRcdFx0YXJncyA9IFtwYXJlbnRWaWV3XTsgLy8gbm8gYXJndW1lbnRzIC0gKGUuZy4ge3tlbHNlfX0pIGdldCBkYXRhIGNvbnRleHQgZnJvbSB2aWV3LlxuXHRcdFx0fVxuXHRcdFx0aWYgKGl0ZW1SZXQgPT09IHVuZGVmaW5lZCkge1xuXHRcdFx0XHRjb250ZW50Q3R4ID0gYXJnc1swXTsgLy8gRGVmYXVsdCBkYXRhIGNvbnRleHQgZm9yIHdyYXBwZWQgYmxvY2sgY29udGVudCBpcyB0aGUgZmlyc3QgYXJndW1lbnQuIERlZmluZWQgdGFnLmNvbnRlbnRDdHggZnVuY3Rpb24gdG8gb3ZlcnJpZGUgdGhpcy5cblx0XHRcdFx0aWYgKHRhZy5jb250ZW50Q3R4KSB7XG5cdFx0XHRcdFx0Y29udGVudEN0eCA9IHRhZy5jb250ZW50Q3R4KGNvbnRlbnRDdHgpIHx8IGNvbnRlbnRDdHg7XG5cdFx0XHRcdH1cblx0XHRcdFx0aXRlbVJldCA9IHRhZ0N0eC5yZW5kZXIoY29udGVudEN0eCwgdHJ1ZSkgfHwgKGlzVXBkYXRlID8gdW5kZWZpbmVkIDogXCJcIik7XG5cdFx0XHR9XG5cdFx0XHQvLyBObyByZXR1cm4gdmFsdWUgZnJvbSByZW5kZXIsIGFuZCBubyB0ZW1wbGF0ZS9jb250ZW50IHRhZ0N0eC5yZW5kZXIoLi4uKSwgc28gcmV0dXJuIHVuZGVmaW5lZFxuXHRcdFx0cmV0ID0gcmV0ID8gcmV0ICsgKGl0ZW1SZXQgfHwgXCJcIikgOiBpdGVtUmV0OyAvLyBJZiBubyByZW5kZXJlZCBjb250ZW50LCB0aGlzIHdpbGwgYmUgdW5kZWZpbmVkXG5cdFx0fVxuXHRcdHRhZy5yZW5kZXJpbmcgPSB1bmRlZmluZWQ7XG5cdH1cblx0dGFnLnRhZ0N0eCA9IHRhZ0N0eHNbMF07XG5cdHRhZy5jdHggPSB0YWcudGFnQ3R4LmN0eDtcblxuXHRpZiAodGFnLl8ubm9Wd3MpIHtcblx0XHRcdGlmICh0YWcuXy5pbmxpbmUpIHtcblx0XHRcdC8vIGlubGluZSB0YWcgd2l0aCBhdHRyIHNldCB0byBcInRleHRcIiB3aWxsIGluc2VydCBIVE1MLWVuY29kZWQgY29udGVudCAtIGFzIGlmIGl0IHdhcyBlbGVtZW50LWJhc2VkIGlubmVyVGV4dFxuXHRcdFx0cmV0ID0gYXR0ciA9PT0gXCJ0ZXh0XCJcblx0XHRcdFx0PyAkY29udmVydGVycy5odG1sKHJldClcblx0XHRcdFx0OiBcIlwiO1xuXHRcdH1cblx0fVxuXHRyZXR1cm4gYm91bmRUYWcgJiYgcGFyZW50Vmlldy5fLm9uUmVuZGVyXG5cdFx0Ly8gQ2FsbCBvblJlbmRlciAodXNlZCBieSBKc1ZpZXdzIGlmIHByZXNlbnQsIHRvIGFkZCBiaW5kaW5nIGFubm90YXRpb25zIGFyb3VuZCByZW5kZXJlZCBjb250ZW50KVxuXHRcdD8gcGFyZW50Vmlldy5fLm9uUmVuZGVyKHJldCwgcGFyZW50VmlldywgdGFnKVxuXHRcdDogcmV0O1xufVxuXG4vLz09PT09PT09PT09PT09PT09XG4vLyBWaWV3IGNvbnN0cnVjdG9yXG4vLz09PT09PT09PT09PT09PT09XG5cbmZ1bmN0aW9uIFZpZXcoY29udGV4dCwgdHlwZSwgcGFyZW50VmlldywgZGF0YSwgdGVtcGxhdGUsIGtleSwgb25SZW5kZXIsIGNvbnRlbnRUbXBsKSB7XG5cdC8vIENvbnN0cnVjdG9yIGZvciB2aWV3IG9iamVjdCBpbiB2aWV3IGhpZXJhcmNoeS4gKEF1Z21lbnRlZCBieSBKc1ZpZXdzIGlmIEpzVmlld3MgaXMgbG9hZGVkKVxuXHR2YXIgdmlld3MsIHBhcmVudFZpZXdfLCB0YWcsIHNlbGZfLFxuXHRcdHNlbGYgPSB0aGlzLFxuXHRcdGlzQXJyYXkgPSB0eXBlID09PSBcImFycmF5XCI7XG5cblx0c2VsZi5jb250ZW50ID0gY29udGVudFRtcGw7XG5cdHNlbGYudmlld3MgPSBpc0FycmF5ID8gW10gOiB7fTtcblx0c2VsZi5wYXJlbnQgPSBwYXJlbnRWaWV3O1xuXHRzZWxmLnR5cGUgPSB0eXBlIHx8IFwidG9wXCI7XG5cdHNlbGYuZGF0YSA9IGRhdGE7XG5cdHNlbGYudG1wbCA9IHRlbXBsYXRlO1xuXHQvLyBJZiB0aGUgZGF0YSBpcyBhbiBhcnJheSwgdGhpcyBpcyBhbiAnYXJyYXkgdmlldycgd2l0aCBhIHZpZXdzIGFycmF5IGZvciBlYWNoIGNoaWxkICdpdGVtIHZpZXcnXG5cdC8vIElmIHRoZSBkYXRhIGlzIG5vdCBhbiBhcnJheSwgdGhpcyBpcyBhbiAnaXRlbSB2aWV3JyB3aXRoIGEgdmlld3MgJ2hhc2gnIG9iamVjdCBmb3IgYW55IGNoaWxkIG5lc3RlZCB2aWV3c1xuXHQvLyAuXy51c2VLZXkgaXMgbm9uIHplcm8gaWYgaXMgbm90IGFuICdhcnJheSB2aWV3JyAob3duaW5nIGEgZGF0YSBhcnJheSkuIFVzZSB0aGlzIGFzIG5leHQga2V5IGZvciBhZGRpbmcgdG8gY2hpbGQgdmlld3MgaGFzaFxuXHRzZWxmXyA9IHNlbGYuXyA9IHtcblx0XHRrZXk6IDAsXG5cdFx0dXNlS2V5OiBpc0FycmF5ID8gMCA6IDEsXG5cdFx0aWQ6IFwiXCIgKyB2aWV3SWQrKyxcblx0XHRvblJlbmRlcjogb25SZW5kZXIsXG5cdFx0Ym5kczoge31cblx0fTtcblx0c2VsZi5saW5rZWQgPSAhIW9uUmVuZGVyO1xuXHRpZiAocGFyZW50Vmlldykge1xuXHRcdHZpZXdzID0gcGFyZW50Vmlldy52aWV3cztcblx0XHRwYXJlbnRWaWV3XyA9IHBhcmVudFZpZXcuXztcblx0XHRpZiAocGFyZW50Vmlld18udXNlS2V5KSB7XG5cdFx0XHQvLyBQYXJlbnQgaXMgbm90IGFuICdhcnJheSB2aWV3Jy4gQWRkIHRoaXMgdmlldyB0byBpdHMgdmlld3Mgb2JqZWN0XG5cdFx0XHQvLyBzZWxmLl9rZXkgPSBpcyB0aGUga2V5IGluIHRoZSBwYXJlbnQgdmlldyBoYXNoXG5cdFx0XHR2aWV3c1tzZWxmXy5rZXkgPSBcIl9cIiArIHBhcmVudFZpZXdfLnVzZUtleSsrXSA9IHNlbGY7XG5cdFx0XHRzZWxmLmluZGV4ID0gaW5kZXhTdHI7XG5cdFx0XHRzZWxmLmdldEluZGV4ID0gZ2V0TmVzdGVkSW5kZXg7XG5cdFx0fSBlbHNlIGlmICh2aWV3cy5sZW5ndGggPT09IChzZWxmXy5rZXkgPSBzZWxmLmluZGV4ID0ga2V5KSkgeyAvLyBQYXJlbnQgaXMgYW4gJ2FycmF5IHZpZXcnLiBBZGQgdGhpcyB2aWV3IHRvIGl0cyB2aWV3cyBhcnJheVxuXHRcdFx0dmlld3MucHVzaChzZWxmKTsgLy8gQWRkaW5nIHRvIGVuZCBvZiB2aWV3cyBhcnJheS4gKFVzaW5nIHB1c2ggd2hlbiBwb3NzaWJsZSAtIGJldHRlciBwZXJmIHRoYW4gc3BsaWNlKVxuXHRcdH0gZWxzZSB7XG5cdFx0XHR2aWV3cy5zcGxpY2Uoa2V5LCAwLCBzZWxmKTsgLy8gSW5zZXJ0aW5nIGluIHZpZXdzIGFycmF5XG5cdFx0fVxuXHRcdC8vIElmIG5vIGNvbnRleHQgd2FzIHBhc3NlZCBpbiwgdXNlIHBhcmVudCBjb250ZXh0XG5cdFx0Ly8gSWYgY29udGV4dCB3YXMgcGFzc2VkIGluLCBpdCBzaG91bGQgaGF2ZSBiZWVuIG1lcmdlZCBhbHJlYWR5IHdpdGggcGFyZW50IGNvbnRleHRcblx0XHRzZWxmLmN0eCA9IGNvbnRleHQgfHwgcGFyZW50Vmlldy5jdHg7XG5cdH0gZWxzZSB7XG5cdFx0c2VsZi5jdHggPSBjb250ZXh0O1xuXHR9XG59XG5cblZpZXcucHJvdG90eXBlID0ge1xuXHRnZXQ6IGdldFZpZXcsXG5cdGdldEluZGV4OiBnZXRJbmRleCxcblx0Z2V0UnNjOiBnZXRSZXNvdXJjZSxcblx0Z2V0VG1wbDogZ2V0VGVtcGxhdGUsXG5cdGhscDogZ2V0SGVscGVyLFxuXHRfaXM6IFwidmlld1wiXG59O1xuXG4vLz09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cbi8vIFJlZ2lzdHJhdGlvblxuLy89PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG5cbmZ1bmN0aW9uIGNvbXBpbGVDaGlsZFJlc291cmNlcyhwYXJlbnRUbXBsKSB7XG5cdHZhciBzdG9yZU5hbWUsIHN0b3JlTmFtZXMsIHJlc291cmNlcztcblx0Zm9yIChzdG9yZU5hbWUgaW4ganN2U3RvcmVzKSB7XG5cdFx0c3RvcmVOYW1lcyA9IHN0b3JlTmFtZSArIFwic1wiO1xuXHRcdGlmIChwYXJlbnRUbXBsW3N0b3JlTmFtZXNdKSB7XG5cdFx0XHRyZXNvdXJjZXMgPSBwYXJlbnRUbXBsW3N0b3JlTmFtZXNdOyAgICAvLyBSZXNvdXJjZXMgbm90IHlldCBjb21waWxlZFxuXHRcdFx0cGFyZW50VG1wbFtzdG9yZU5hbWVzXSA9IHt9OyAgICAgICAgICAgICAgIC8vIFJlbW92ZSB1bmNvbXBpbGVkIHJlc291cmNlc1xuXHRcdFx0JHZpZXdzW3N0b3JlTmFtZXNdKHJlc291cmNlcywgcGFyZW50VG1wbCk7IC8vIEFkZCBiYWNrIGluIHRoZSBjb21waWxlZCByZXNvdXJjZXNcblx0XHR9XG5cdH1cbn1cblxuLy89PT09PT09PT09PT09PT1cbi8vIGNvbXBpbGVUYWdcbi8vPT09PT09PT09PT09PT09XG5cbmZ1bmN0aW9uIGNvbXBpbGVUYWcobmFtZSwgdGFnRGVmLCBwYXJlbnRUbXBsKSB7XG5cdHZhciB0bXBsLCBiYXNlVGFnLCBwcm9wLFxuXHRcdGNvbXBpbGVkRGVmID0gbmV3ICRzdWIuX3RnKCk7XG5cblx0ZnVuY3Rpb24gVGFnKCkge1xuXHRcdHZhciB0YWcgPSB0aGlzO1xuXHRcdHRhZy5fID0ge1xuXHRcdFx0aW5saW5lOiB0cnVlLFxuXHRcdFx0dW5saW5rZWQ6IHRydWVcblx0XHR9O1xuXG5cdFx0dGFnLnRhZ05hbWUgPSBuYW1lO1xuXHR9XG5cblx0aWYgKCRpc0Z1bmN0aW9uKHRhZ0RlZikpIHtcblx0XHQvLyBTaW1wbGUgdGFnIGRlY2xhcmVkIGFzIGZ1bmN0aW9uLiBObyBwcmVzZW50ZXIgaW5zdGFudGF0aW9uLlxuXHRcdHRhZ0RlZiA9IHtcblx0XHRcdGRlcGVuZHM6IHRhZ0RlZi5kZXBlbmRzLFxuXHRcdFx0cmVuZGVyOiB0YWdEZWZcblx0XHR9O1xuXHR9IGVsc2UgaWYgKFwiXCIgKyB0YWdEZWYgPT09IHRhZ0RlZikge1xuXHRcdHRhZ0RlZiA9IHt0ZW1wbGF0ZTogdGFnRGVmfTtcblx0fVxuXHRpZiAoYmFzZVRhZyA9IHRhZ0RlZi5iYXNlVGFnKSB7XG5cdFx0dGFnRGVmLmZsb3cgPSAhIXRhZ0RlZi5mbG93OyAvLyBTZXQgZmxvdyBwcm9wZXJ0eSwgc28gZGVmYXVsdHMgdG8gZmFsc2UgZXZlbiBpZiBiYXNlVGFnIGhhcyBmbG93PXRydWVcblx0XHR0YWdEZWYuYmFzZVRhZyA9IGJhc2VUYWcgPSBcIlwiICsgYmFzZVRhZyA9PT0gYmFzZVRhZ1xuXHRcdFx0PyAocGFyZW50VG1wbCAmJiBwYXJlbnRUbXBsLnRhZ3NbYmFzZVRhZ10gfHwgJHRhZ3NbYmFzZVRhZ10pXG5cdFx0XHQ6IGJhc2VUYWc7XG5cblx0XHRjb21waWxlZERlZiA9ICRleHRlbmQoY29tcGlsZWREZWYsIGJhc2VUYWcpO1xuXG5cdFx0Zm9yIChwcm9wIGluIHRhZ0RlZikge1xuXHRcdFx0Y29tcGlsZWREZWZbcHJvcF0gPSBnZXRNZXRob2QoYmFzZVRhZ1twcm9wXSwgdGFnRGVmW3Byb3BdKTtcblx0XHR9XG5cdH0gZWxzZSB7XG5cdFx0Y29tcGlsZWREZWYgPSAkZXh0ZW5kKGNvbXBpbGVkRGVmLCB0YWdEZWYpO1xuXHR9XG5cblx0Ly8gVGFnIGRlY2xhcmVkIGFzIG9iamVjdCwgdXNlZCBhcyB0aGUgcHJvdG90eXBlIGZvciB0YWcgaW5zdGFudGlhdGlvbiAoY29udHJvbC9wcmVzZW50ZXIpXG5cdGlmICgodG1wbCA9IGNvbXBpbGVkRGVmLnRlbXBsYXRlKSAhPT0gdW5kZWZpbmVkKSB7XG5cdFx0Y29tcGlsZWREZWYudGVtcGxhdGUgPSBcIlwiICsgdG1wbCA9PT0gdG1wbCA/ICgkdGVtcGxhdGVzW3RtcGxdIHx8ICR0ZW1wbGF0ZXModG1wbCkpIDogdG1wbDtcblx0fVxuXHRpZiAoY29tcGlsZWREZWYuaW5pdCAhPT0gZmFsc2UpIHtcblx0XHQvLyBTZXQgaW5pdDogZmFsc2Ugb24gdGFnRGVmIGlmIHlvdSB3YW50IHRvIHByb3ZpZGUganVzdCBhIHJlbmRlciBtZXRob2QsIG9yIHJlbmRlciBhbmQgdGVtcGxhdGUsIGJ1dCBubyBjb25zdHJ1Y3RvciBvciBwcm90b3R5cGUuXG5cdFx0Ly8gc28gZXF1aXZhbGVudCB0byBzZXR0aW5nIHRhZyB0byByZW5kZXIgZnVuY3Rpb24sIGV4Y2VwdCB5b3UgY2FuIGFsc28gcHJvdmlkZSBhIHRlbXBsYXRlLlxuXHRcdChUYWcucHJvdG90eXBlID0gY29tcGlsZWREZWYpLmNvbnN0cnVjdG9yID0gY29tcGlsZWREZWYuX2N0ciA9IFRhZztcblx0fVxuXG5cdGlmIChwYXJlbnRUbXBsKSB7XG5cdFx0Y29tcGlsZWREZWYuX3BhcmVudFRtcGwgPSBwYXJlbnRUbXBsO1xuXHR9XG5cdHJldHVybiBjb21waWxlZERlZjtcbn1cblxuZnVuY3Rpb24gYmFzZUFwcGx5KGFyZ3MpIHtcblx0Ly8gSW4gZGVyaXZlZCBtZXRob2QgKG9yIGhhbmRsZXIgZGVjbGFyZWQgZGVjbGFyYXRpdmVseSBhcyBpbiB7ezpmb28gb25DaGFuZ2U9fmZvb0NoYW5nZWR9fSBjYW4gY2FsbCBiYXNlIG1ldGhvZCxcblx0Ly8gdXNpbmcgdGhpcy5iYXNlQXBwbHkoYXJndW1lbnRzKSAoRXF1aXZhbGVudCB0byB0aGlzLl9zdXBlckFwcGx5KGFyZ3VtZW50cykgaW4galF1ZXJ5IFVJKVxuXHRyZXR1cm4gdGhpcy5iYXNlLmFwcGx5KHRoaXMsIGFyZ3MpO1xufVxuXG4vLz09PT09PT09PT09PT09PVxuLy8gY29tcGlsZVRtcGxcbi8vPT09PT09PT09PT09PT09XG5cbmZ1bmN0aW9uIGNvbXBpbGVUbXBsKG5hbWUsIHRtcGwsIHBhcmVudFRtcGwsIG9wdGlvbnMpIHtcblx0Ly8gdG1wbCBpcyBlaXRoZXIgYSB0ZW1wbGF0ZSBvYmplY3QsIGEgc2VsZWN0b3IgZm9yIGEgdGVtcGxhdGUgc2NyaXB0IGJsb2NrLCB0aGUgbmFtZSBvZiBhIGNvbXBpbGVkIHRlbXBsYXRlLCBvciBhIHRlbXBsYXRlIG9iamVjdFxuXG5cdC8vPT09PSBuZXN0ZWQgZnVuY3Rpb25zID09PT1cblx0ZnVuY3Rpb24gbG9va3VwVGVtcGxhdGUodmFsdWUpIHtcblx0XHQvLyBJZiB2YWx1ZSBpcyBvZiB0eXBlIHN0cmluZyAtIHRyZWF0IGFzIHNlbGVjdG9yLCBvciBuYW1lIG9mIGNvbXBpbGVkIHRlbXBsYXRlXG5cdFx0Ly8gUmV0dXJuIHRoZSB0ZW1wbGF0ZSBvYmplY3QsIGlmIGFscmVhZHkgY29tcGlsZWQsIG9yIHRoZSBtYXJrdXAgc3RyaW5nXG5cdFx0dmFyIGN1cnJlbnROYW1lLCB0bXBsO1xuXHRcdGlmICgoXCJcIiArIHZhbHVlID09PSB2YWx1ZSkgfHwgdmFsdWUubm9kZVR5cGUgPiAwICYmIChlbGVtID0gdmFsdWUpKSB7XG5cdFx0XHRpZiAoIWVsZW0pIHtcblx0XHRcdFx0aWYgKC9eXFwuXFwvW15cXFxcOio/XCI8Pl0qJC8udGVzdCh2YWx1ZSkpIHtcblx0XHRcdFx0XHQvLyB0bXBsPVwiLi9zb21lL2ZpbGUuaHRtbFwiXG5cdFx0XHRcdFx0Ly8gSWYgdGhlIHRlbXBsYXRlIGlzIG5vdCBuYW1lZCwgdXNlIFwiLi9zb21lL2ZpbGUuaHRtbFwiIGFzIG5hbWUuXG5cdFx0XHRcdFx0aWYgKHRtcGwgPSAkdGVtcGxhdGVzW25hbWUgPSBuYW1lIHx8IHZhbHVlXSkge1xuXHRcdFx0XHRcdFx0dmFsdWUgPSB0bXBsO1xuXHRcdFx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdFx0XHQvLyBCUk9XU0VSLVNQRUNJRklDIENPREUgKG5vdCBvbiBOb2RlLmpzKTpcblx0XHRcdFx0XHRcdC8vIExvb2sgZm9yIHNlcnZlci1nZW5lcmF0ZWQgc2NyaXB0IGJsb2NrIHdpdGggaWQgXCIuL3NvbWUvZmlsZS5odG1sXCJcblx0XHRcdFx0XHRcdGVsZW0gPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCh2YWx1ZSk7XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHR9IGVsc2UgaWYgKCQuZm4gJiYgISRzdWIuclRtcGwudGVzdCh2YWx1ZSkpIHtcblx0XHRcdFx0XHR0cnkge1xuXHRcdFx0XHRcdFx0ZWxlbSA9ICQoZG9jdW1lbnQpLmZpbmQodmFsdWUpWzBdOyAvLyBpZiBqUXVlcnkgaXMgbG9hZGVkLCB0ZXN0IGZvciBzZWxlY3RvciByZXR1cm5pbmcgZWxlbWVudHMsIGFuZCBnZXQgZmlyc3QgZWxlbWVudFxuXHRcdFx0XHRcdH0gY2F0Y2ggKGUpIHt9XG5cdFx0XHRcdH0vLyBFTkQgQlJPV1NFUi1TUEVDSUZJQyBDT0RFXG5cdFx0XHR9IC8vQlJPV1NFUi1TUEVDSUZJQyBDT0RFXG5cdFx0XHRpZiAoZWxlbSkge1xuXHRcdFx0XHQvLyBHZW5lcmFsbHkgdGhpcyBpcyBhIHNjcmlwdCBlbGVtZW50LlxuXHRcdFx0XHQvLyBIb3dldmVyIHdlIGFsbG93IGl0IHRvIGJlIGFueSBlbGVtZW50LCBzbyB5b3UgY2FuIGZvciBleGFtcGxlIHRha2UgdGhlIGNvbnRlbnQgb2YgYSBkaXYsXG5cdFx0XHRcdC8vIHVzZSBpdCBhcyBhIHRlbXBsYXRlLCBhbmQgcmVwbGFjZSBpdCBieSB0aGUgc2FtZSBjb250ZW50IHJlbmRlcmVkIGFnYWluc3QgZGF0YS5cblx0XHRcdFx0Ly8gZS5nLiBmb3IgbGlua2luZyB0aGUgY29udGVudCBvZiBhIGRpdiB0byBhIGNvbnRhaW5lciwgYW5kIHVzaW5nIHRoZSBpbml0aWFsIGNvbnRlbnQgYXMgdGVtcGxhdGU6XG5cdFx0XHRcdC8vICQubGluayhcIiNjb250ZW50XCIsIG1vZGVsLCB7dG1wbDogXCIjY29udGVudFwifSk7XG5cdFx0XHRcdGlmIChvcHRpb25zKSB7XG5cdFx0XHRcdFx0Ly8gV2Ugd2lsbCBjb21waWxlIGEgbmV3IHRlbXBsYXRlIHVzaW5nIHRoZSBtYXJrdXAgaW4gdGhlIHNjcmlwdCBlbGVtZW50XG5cdFx0XHRcdFx0dmFsdWUgPSBlbGVtLmlubmVySFRNTDtcblx0XHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0XHQvLyBXZSB3aWxsIGNhY2hlIGEgc2luZ2xlIGNvcHkgb2YgdGhlIGNvbXBpbGVkIHRlbXBsYXRlLCBhbmQgYXNzb2NpYXRlIGl0IHdpdGggdGhlIG5hbWVcblx0XHRcdFx0XHQvLyAocmVuYW1pbmcgZnJvbSBhIHByZXZpb3VzIG5hbWUgaWYgdGhlcmUgd2FzIG9uZSkuXG5cdFx0XHRcdFx0Y3VycmVudE5hbWUgPSBlbGVtLmdldEF0dHJpYnV0ZSh0bXBsQXR0cik7XG5cdFx0XHRcdFx0aWYgKGN1cnJlbnROYW1lKSB7XG5cdFx0XHRcdFx0XHRpZiAoY3VycmVudE5hbWUgIT09IGpzdlRtcGwpIHtcblx0XHRcdFx0XHRcdFx0dmFsdWUgPSAkdGVtcGxhdGVzW2N1cnJlbnROYW1lXTtcblx0XHRcdFx0XHRcdFx0ZGVsZXRlICR0ZW1wbGF0ZXNbY3VycmVudE5hbWVdO1xuXHRcdFx0XHRcdFx0fSBlbHNlIGlmICgkLmZuKSB7XG5cdFx0XHRcdFx0XHRcdHZhbHVlID0gJC5kYXRhKGVsZW0pW2pzdlRtcGxdO1xuXHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdFx0XHRuYW1lID0gbmFtZSB8fCAoJC5mbiA/IGpzdlRtcGwgOiB2YWx1ZSk7XG5cdFx0XHRcdFx0XHR2YWx1ZSA9IGNvbXBpbGVUbXBsKG5hbWUsIGVsZW0uaW5uZXJIVE1MLCBwYXJlbnRUbXBsLCBvcHRpb25zKTtcblx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0dmFsdWUudG1wbE5hbWUgPSBuYW1lID0gbmFtZSB8fCBjdXJyZW50TmFtZTtcblx0XHRcdFx0XHRpZiAobmFtZSAhPT0ganN2VG1wbCkge1xuXHRcdFx0XHRcdFx0JHRlbXBsYXRlc1tuYW1lXSA9IHZhbHVlO1xuXHRcdFx0XHRcdH1cblx0XHRcdFx0XHRlbGVtLnNldEF0dHJpYnV0ZSh0bXBsQXR0ciwgbmFtZSk7XG5cdFx0XHRcdFx0aWYgKCQuZm4pIHtcblx0XHRcdFx0XHRcdCQuZGF0YShlbGVtLCBqc3ZUbXBsLCB2YWx1ZSk7XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHR9XG5cdFx0XHR9IC8vIEVORCBCUk9XU0VSLVNQRUNJRklDIENPREVcblx0XHRcdGVsZW0gPSB1bmRlZmluZWQ7XG5cdFx0fSBlbHNlIGlmICghdmFsdWUuZm4pIHtcblx0XHRcdHZhbHVlID0gdW5kZWZpbmVkO1xuXHRcdFx0Ly8gSWYgdmFsdWUgaXMgbm90IGEgc3RyaW5nLiBIVE1MIGVsZW1lbnQsIG9yIGNvbXBpbGVkIHRlbXBsYXRlLCByZXR1cm4gdW5kZWZpbmVkXG5cdFx0fVxuXHRcdHJldHVybiB2YWx1ZTtcblx0fVxuXG5cdHZhciBlbGVtLCBjb21waWxlZFRtcGwsXG5cdFx0dG1wbE9yTWFya3VwID0gdG1wbCA9IHRtcGwgfHwgXCJcIjtcblxuXHQvLz09PT0gQ29tcGlsZSB0aGUgdGVtcGxhdGUgPT09PVxuXHRpZiAob3B0aW9ucyA9PT0gMCkge1xuXHRcdG9wdGlvbnMgPSB1bmRlZmluZWQ7XG5cdFx0dG1wbE9yTWFya3VwID0gbG9va3VwVGVtcGxhdGUodG1wbE9yTWFya3VwKTsgLy8gVG9wLWxldmVsIGNvbXBpbGUgc28gZG8gYSB0ZW1wbGF0ZSBsb29rdXBcblx0fVxuXG5cdC8vIElmIG9wdGlvbnMsIHRoZW4gdGhpcyB3YXMgYWxyZWFkeSBjb21waWxlZCBmcm9tIGEgKHNjcmlwdCkgZWxlbWVudCB0ZW1wbGF0ZSBkZWNsYXJhdGlvbi5cblx0Ly8gSWYgbm90LCB0aGVuIGlmIHRtcGwgaXMgYSB0ZW1wbGF0ZSBvYmplY3QsIHVzZSBpdCBmb3Igb3B0aW9uc1xuXHRvcHRpb25zID0gb3B0aW9ucyB8fCAodG1wbC5tYXJrdXAgPyB0bXBsIDoge30pO1xuXHRvcHRpb25zLnRtcGxOYW1lID0gbmFtZTtcblx0aWYgKHBhcmVudFRtcGwpIHtcblx0XHRvcHRpb25zLl9wYXJlbnRUbXBsID0gcGFyZW50VG1wbDtcblx0fVxuXHQvLyBJZiB0bXBsIGlzIG5vdCBhIG1hcmt1cCBzdHJpbmcgb3IgYSBzZWxlY3RvciBzdHJpbmcsIHRoZW4gaXQgbXVzdCBiZSBhIHRlbXBsYXRlIG9iamVjdFxuXHQvLyBJbiB0aGF0IGNhc2UsIGdldCBpdCBmcm9tIHRoZSBtYXJrdXAgcHJvcGVydHkgb2YgdGhlIG9iamVjdFxuXHRpZiAoIXRtcGxPck1hcmt1cCAmJiB0bXBsLm1hcmt1cCAmJiAodG1wbE9yTWFya3VwID0gbG9va3VwVGVtcGxhdGUodG1wbC5tYXJrdXApKSkge1xuXHRcdGlmICh0bXBsT3JNYXJrdXAuZm4pIHtcblx0XHRcdC8vIElmIHRoZSBzdHJpbmcgcmVmZXJlbmNlcyBhIGNvbXBpbGVkIHRlbXBsYXRlIG9iamVjdCwgbmVlZCB0byByZWNvbXBpbGUgdG8gbWVyZ2UgYW55IG1vZGlmaWVkIG9wdGlvbnNcblx0XHRcdHRtcGxPck1hcmt1cCA9IHRtcGxPck1hcmt1cC5tYXJrdXA7XG5cdFx0fVxuXHR9XG5cdGlmICh0bXBsT3JNYXJrdXAgIT09IHVuZGVmaW5lZCkge1xuXHRcdGlmICh0bXBsT3JNYXJrdXAuZm4gfHwgdG1wbC5mbikge1xuXHRcdFx0Ly8gdG1wbCBpcyBhbHJlYWR5IGNvbXBpbGVkLCBzbyB1c2UgaXRcblx0XHRcdGlmICh0bXBsT3JNYXJrdXAuZm4pIHtcblx0XHRcdFx0Y29tcGlsZWRUbXBsID0gdG1wbE9yTWFya3VwO1xuXHRcdFx0fVxuXHRcdH0gZWxzZSB7XG5cdFx0XHQvLyB0bXBsT3JNYXJrdXAgaXMgYSBtYXJrdXAgc3RyaW5nLCBub3QgYSBjb21waWxlZCB0ZW1wbGF0ZVxuXHRcdFx0Ly8gQ3JlYXRlIHRlbXBsYXRlIG9iamVjdFxuXHRcdFx0dG1wbCA9IHRtcGxPYmplY3QodG1wbE9yTWFya3VwLCBvcHRpb25zKTtcblx0XHRcdC8vIENvbXBpbGUgdG8gQVNUIGFuZCB0aGVuIHRvIGNvbXBpbGVkIGZ1bmN0aW9uXG5cdFx0XHR0bXBsRm4odG1wbE9yTWFya3VwLnJlcGxhY2UockVzY2FwZVF1b3RlcywgXCJcXFxcJCZcIiksIHRtcGwpO1xuXHRcdH1cblx0XHRpZiAoIWNvbXBpbGVkVG1wbCkge1xuXHRcdFx0Y29tcGlsZWRUbXBsID0gJGV4dGVuZChmdW5jdGlvbigpIHtcblx0XHRcdFx0cmV0dXJuIGNvbXBpbGVkVG1wbC5yZW5kZXIuYXBwbHkoY29tcGlsZWRUbXBsLCBhcmd1bWVudHMpO1xuXHRcdFx0fSwgdG1wbCk7XG5cblx0XHRcdGNvbXBpbGVDaGlsZFJlc291cmNlcyhjb21waWxlZFRtcGwpO1xuXHRcdH1cblx0XHRpZiAobmFtZSAmJiAhcGFyZW50VG1wbCAmJiBuYW1lICE9PSBqc3ZUbXBsKSB7XG5cdFx0XHQkcmVuZGVyW25hbWVdID0gY29tcGlsZWRUbXBsO1xuXHRcdH1cblx0XHRyZXR1cm4gY29tcGlsZWRUbXBsO1xuXHR9XG59XG5cbi8vPT09PSAvZW5kIG9mIGZ1bmN0aW9uIGNvbXBpbGVUbXBsID09PT1cblxuLy89PT09PT09PT09PT09PT09PVxuLy8gY29tcGlsZVZpZXdNb2RlbFxuLy89PT09PT09PT09PT09PT09PVxuXG5mdW5jdGlvbiBnZXREZWZhdWx0VmFsKGRlZmF1bHRWYWwsIGRhdGEpIHtcblx0cmV0dXJuICQuaXNGdW5jdGlvbihkZWZhdWx0VmFsKVxuXHRcdD8gZGVmYXVsdFZhbC5jYWxsKGRhdGEpXG5cdFx0OiBkZWZhdWx0VmFsO1xufVxuXG5mdW5jdGlvbiB1bm1hcEFycmF5KG1vZGVsQXJyKSB7XG5cdFx0dmFyIGksIGFyciA9IFtdLFxuXHRcdFx0bCA9IG1vZGVsQXJyLmxlbmd0aDtcblx0XHRmb3IgKGk9MDsgaTxsOyBpKyspIHtcblx0XHRcdGFyci5wdXNoKG1vZGVsQXJyW2ldLnVubWFwKCkpO1xuXHRcdH1cblx0XHRyZXR1cm4gYXJyO1xufVxuXG5mdW5jdGlvbiBjb21waWxlVmlld01vZGVsKG5hbWUsIHR5cGUpIHtcblx0dmFyIGksIGNvbnN0cnVjdG9yLFxuXHRcdHZpZXdNb2RlbHMgPSB0aGlzLFxuXHRcdGdldHRlcnMgPSB0eXBlLmdldHRlcnMsXG5cdFx0ZXh0ZW5kID0gdHlwZS5leHRlbmQsXG5cdFx0aWQgPSB0eXBlLmlkLFxuXHRcdHByb3RvID0gJC5leHRlbmQoe1xuXHRcdFx0X2lzOiBuYW1lIHx8IFwidW5uYW1lZFwiLFxuXHRcdFx0dW5tYXA6IHVubWFwLFxuXHRcdFx0bWVyZ2U6IG1lcmdlXG5cdFx0fSwgZXh0ZW5kKSxcblx0XHRhcmdzID0gXCJcIixcblx0XHRib2R5ID0gXCJcIixcblx0XHRsID0gZ2V0dGVycyA/IGdldHRlcnMubGVuZ3RoIDogMCxcblx0XHQkb2JzZXJ2YWJsZSA9ICQub2JzZXJ2YWJsZSxcblx0XHRnZXR0ZXJOYW1lcyA9IHt9O1xuXG5cdGZ1bmN0aW9uIEdldE5ldyhhcmdzKSB7XG5cdFx0Y29uc3RydWN0b3IuYXBwbHkodGhpcywgYXJncyk7XG5cdH1cblxuXHRmdW5jdGlvbiB2bSgpIHtcblx0XHRyZXR1cm4gbmV3IEdldE5ldyhhcmd1bWVudHMpO1xuXHR9XG5cblx0ZnVuY3Rpb24gaXRlcmF0ZShkYXRhLCBhY3Rpb24pIHtcblx0XHR2YXIgaiwgZ2V0dGVyVHlwZSwgZGVmYXVsdFZhbCwgcHJvcCwgb2IsXG5cdFx0XHRtID0gZ2V0dGVycy5sZW5ndGg7XG5cdFx0Zm9yIChqPTA7IGo8bTsgaisrKSB7XG5cdFx0XHRwcm9wID0gZ2V0dGVyc1tqXTtcblx0XHRcdGdldHRlclR5cGUgPSB1bmRlZmluZWQ7XG5cdFx0XHRpZiAocHJvcCArIFwiXCIgIT09IHByb3ApIHtcblx0XHRcdFx0Z2V0dGVyVHlwZSA9IHByb3A7XG5cdFx0XHRcdHByb3AgPSBnZXR0ZXJUeXBlLmdldHRlcjtcblx0XHRcdH1cblx0XHRcdGlmICgob2IgPSBkYXRhW3Byb3BdKSA9PT0gdW5kZWZpbmVkICYmIGdldHRlclR5cGUgJiYgKGRlZmF1bHRWYWwgPSBnZXR0ZXJUeXBlLmRlZmF1bHRWYWwpICE9PSB1bmRlZmluZWQpIHtcblx0XHRcdFx0b2IgPSBnZXREZWZhdWx0VmFsKGRlZmF1bHRWYWwsIGRhdGEpO1xuXHRcdFx0fVxuXHRcdFx0YWN0aW9uKG9iLCBnZXR0ZXJUeXBlICYmIHZpZXdNb2RlbHNbZ2V0dGVyVHlwZS50eXBlXSwgcHJvcCk7XG5cdFx0fVxuXHR9XG5cblx0ZnVuY3Rpb24gbWFwKGRhdGEpIHtcblx0XHRkYXRhID0gZGF0YSArIFwiXCIgPT09IGRhdGFcblx0XHRcdD8gSlNPTi5wYXJzZShkYXRhKSAvLyBBY2NlcHQgSlNPTiBzdHJpbmdcblx0XHRcdDogZGF0YTsgICAgICAgICAgICAvLyBvciBvYmplY3QvYXJyYXlcblx0XHR2YXIgaSwgaiwgIGwsIG0sIHByb3AsXG5cdFx0XHRvYiA9IGRhdGEsXG5cdFx0XHRhcnIgPSBbXTtcblxuXHRcdGlmICgkaXNBcnJheShkYXRhKSkge1xuXHRcdFx0ZGF0YSA9IGRhdGEgfHwgW107XG5cdFx0XHRsID0gZGF0YS5sZW5ndGg7XG5cdFx0XHRmb3IgKGk9MDsgaTxsOyBpKyspIHtcblx0XHRcdFx0YXJyLnB1c2godGhpcy5tYXAoZGF0YVtpXSkpO1xuXHRcdFx0fVxuXHRcdFx0YXJyLl9pcyA9IG5hbWU7XG5cdFx0XHRhcnIudW5tYXAgPSB1bm1hcDtcblx0XHRcdGFyci5tZXJnZSA9IG1lcmdlO1xuXHRcdFx0cmV0dXJuIGFycjtcblx0XHR9XG5cblx0XHRpZiAoZGF0YSkge1xuXHRcdFx0aXRlcmF0ZShkYXRhLCBmdW5jdGlvbihvYiwgdmlld01vZGVsKSB7XG5cdFx0XHRcdGlmICh2aWV3TW9kZWwpIHsgLy8gSXRlcmF0ZSB0byBidWlsZCBnZXR0ZXJzIGFyZyBhcnJheSAodmFsdWUsIG9yIG1hcHBlZCB2YWx1ZSlcblx0XHRcdFx0XHRvYiA9IHZpZXdNb2RlbC5tYXAob2IpO1xuXHRcdFx0XHR9XG5cdFx0XHRcdGFyci5wdXNoKG9iKTtcblx0XHRcdH0pO1xuXG5cdFx0XHRvYiA9IHRoaXMuYXBwbHkodGhpcywgYXJyKTsgLy8gSW5zYW50aWF0ZSB0aGlzIFZpZXcgTW9kZWwsIHBhc3NpbmcgZ2V0dGVycyBhcmdzIGFycmF5IHRvIGNvbnN0cnVjdG9yXG5cdFx0XHRmb3IgKHByb3AgaW4gZGF0YSkgeyAvLyBDb3B5IG92ZXIgYW55IG90aGVyIHByb3BlcnRpZXMuIHRoYXQgYXJlIG5vdCBnZXQvc2V0IHByb3BlcnRpZXNcblx0XHRcdFx0aWYgKHByb3AgIT09ICRleHBhbmRvICAmJiAhZ2V0dGVyTmFtZXNbcHJvcF0pIHtcblx0XHRcdFx0XHRvYltwcm9wXSA9IGRhdGFbcHJvcF07XG5cdFx0XHRcdH1cblx0XHRcdH1cblx0XHR9XG5cdFx0cmV0dXJuIG9iO1xuXHR9XG5cblx0ZnVuY3Rpb24gbWVyZ2UoZGF0YSkge1xuXHRcdGRhdGEgPSBkYXRhICsgXCJcIiA9PT0gZGF0YVxuXHRcdFx0PyBKU09OLnBhcnNlKGRhdGEpIC8vIEFjY2VwdCBKU09OIHN0cmluZ1xuXHRcdFx0OiBkYXRhOyAgICAgICAgICAgIC8vIG9yIG9iamVjdC9hcnJheVxuXHRcdHZhciBpLCBqLCBsLCBtLCBwcm9wLCBtb2QsIGZvdW5kLCBhc3NpZ25lZCwgb2IsIG5ld01vZEFycixcblx0XHRcdG1vZGVsID0gdGhpcztcblxuXHRcdGlmICgkaXNBcnJheShtb2RlbCkpIHtcblx0XHRcdGFzc2lnbmVkID0ge307XG5cdFx0XHRuZXdNb2RBcnIgPSBbXTtcblx0XHRcdGwgPSBkYXRhLmxlbmd0aDtcblx0XHRcdG0gPSBtb2RlbC5sZW5ndGg7XG5cdFx0XHRmb3IgKGk9MDsgaTxsOyBpKyspIHtcblx0XHRcdFx0b2IgPSBkYXRhW2ldO1xuXHRcdFx0XHRmb3VuZCA9IGZhbHNlO1xuXHRcdFx0XHRmb3IgKGo9MDsgajxtICYmICFmb3VuZDsgaisrKSB7XG5cdFx0XHRcdFx0aWYgKGFzc2lnbmVkW2pdKSB7XG5cdFx0XHRcdFx0XHRjb250aW51ZTtcblx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0bW9kID0gbW9kZWxbal07XG5cblx0XHRcdFx0XHRpZiAoaWQpIHtcblx0XHRcdFx0XHRcdGFzc2lnbmVkW2pdID0gZm91bmQgPSBpZCArIFwiXCIgPT09IGlkXG5cdFx0XHRcdFx0XHQ/IChvYltpZF0gJiYgKGdldHRlck5hbWVzW2lkXSA/IG1vZFtpZF0oKSA6IG1vZFtpZF0pID09PSBvYltpZF0pXG5cdFx0XHRcdFx0XHQ6IGlkKG1vZCwgb2IpO1xuXHRcdFx0XHRcdH1cblx0XHRcdFx0fVxuXHRcdFx0XHRpZiAoZm91bmQpIHtcblx0XHRcdFx0XHRtb2QubWVyZ2Uob2IpO1xuXHRcdFx0XHRcdG5ld01vZEFyci5wdXNoKG1vZCk7XG5cdFx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdFx0bmV3TW9kQXJyLnB1c2godm0ubWFwKG9iKSk7XG5cdFx0XHRcdH1cblx0XHRcdH1cblx0XHRcdGlmICgkb2JzZXJ2YWJsZSkge1xuXHRcdFx0XHQkb2JzZXJ2YWJsZShtb2RlbCkucmVmcmVzaChuZXdNb2RBcnIsIHRydWUpO1xuXHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0bW9kZWwuc3BsaWNlLmFwcGx5KG1vZGVsLCBbMCwgbW9kZWwubGVuZ3RoXS5jb25jYXQobmV3TW9kQXJyKSk7XG5cdFx0XHR9XG5cdFx0XHRyZXR1cm47XG5cdFx0fVxuXHRcdGl0ZXJhdGUoZGF0YSwgZnVuY3Rpb24ob2IsIHZpZXdNb2RlbCwgZ2V0dGVyKSB7XG5cdFx0XHRpZiAodmlld01vZGVsKSB7XG5cdFx0XHRcdG1vZGVsW2dldHRlcl0oKS5tZXJnZShvYik7IC8vIFVwZGF0ZSB0eXBlZCBwcm9wZXJ0eVxuXHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0bW9kZWxbZ2V0dGVyXShvYik7IC8vIFVwZGF0ZSBub24tdHlwZWQgcHJvcGVydHlcblx0XHRcdH1cblx0XHR9KTtcblx0XHRmb3IgKHByb3AgaW4gZGF0YSkge1xuXHRcdFx0aWYgKHByb3AgIT09ICRleHBhbmRvICYmICFnZXR0ZXJOYW1lc1twcm9wXSkge1xuXHRcdFx0XHRtb2RlbFtwcm9wXSA9IGRhdGFbcHJvcF07XG5cdFx0XHR9XG5cdFx0fVxuXHR9XG5cblx0ZnVuY3Rpb24gdW5tYXAoKSB7XG5cdFx0dmFyIG9iLCBwcm9wLCBpLCBsLCBnZXR0ZXJUeXBlLCBhcnIsIHZhbHVlLFxuXHRcdFx0bW9kZWwgPSB0aGlzO1xuXG5cdFx0aWYgKCRpc0FycmF5KG1vZGVsKSkge1xuXHRcdFx0cmV0dXJuIHVubWFwQXJyYXkobW9kZWwpO1xuXHRcdH1cblx0XHRvYiA9IHt9O1xuXHRcdGwgPSBnZXR0ZXJzLmxlbmd0aDtcblx0XHRmb3IgKGk9MDsgaTxsOyBpKyspIHtcblx0XHRcdHByb3AgPSBnZXR0ZXJzW2ldO1xuXHRcdFx0Z2V0dGVyVHlwZSA9IHVuZGVmaW5lZDtcblx0XHRcdGlmIChwcm9wICsgXCJcIiAhPT0gcHJvcCkge1xuXHRcdFx0XHRnZXR0ZXJUeXBlID0gcHJvcDtcblx0XHRcdFx0cHJvcCA9IGdldHRlclR5cGUuZ2V0dGVyO1xuXHRcdFx0fVxuXHRcdFx0dmFsdWUgPSBtb2RlbFtwcm9wXSgpO1xuXHRcdFx0b2JbcHJvcF0gPSBnZXR0ZXJUeXBlICYmIHZhbHVlICYmIHZpZXdNb2RlbHNbZ2V0dGVyVHlwZS50eXBlXVxuXHRcdFx0XHQ/ICRpc0FycmF5KHZhbHVlKVxuXHRcdFx0XHRcdD8gdW5tYXBBcnJheSh2YWx1ZSlcblx0XHRcdFx0XHQ6IHZhbHVlLnVubWFwKClcblx0XHRcdFx0OiB2YWx1ZTtcblx0XHR9XG5cdFx0Zm9yIChwcm9wIGluIG1vZGVsKSB7XG5cdFx0XHRpZiAocHJvcCAhPT0gXCJfaXNcIiAmJiAhZ2V0dGVyTmFtZXNbcHJvcF0gJiYgcHJvcCAhPT0gJGV4cGFuZG8gICYmIChwcm9wLmNoYXJBdCgwKSAhPT0gXCJfXCIgfHwgIWdldHRlck5hbWVzW3Byb3Auc2xpY2UoMSldKSAmJiAhJC5pc0Z1bmN0aW9uKG1vZGVsW3Byb3BdKSkge1xuXHRcdFx0XHRvYltwcm9wXSA9IG1vZGVsW3Byb3BdO1xuXHRcdFx0fVxuXHRcdH1cblx0XHRyZXR1cm4gb2I7XG5cdH1cblxuXHRHZXROZXcucHJvdG90eXBlID0gcHJvdG87XG5cblx0Zm9yIChpPTA7IGk8bDsgaSsrKSB7XG5cdFx0KGZ1bmN0aW9uKGdldHRlcikge1xuXHRcdFx0Z2V0dGVyID0gZ2V0dGVyLmdldHRlciB8fCBnZXR0ZXI7XG5cdFx0XHRnZXR0ZXJOYW1lc1tnZXR0ZXJdID0gaSsxO1xuXHRcdFx0dmFyIHByaXZGaWVsZCA9IFwiX1wiICsgZ2V0dGVyO1xuXG5cdFx0XHRhcmdzICs9IChhcmdzID8gXCIsXCIgOiBcIlwiKSArIGdldHRlcjtcblx0XHRcdGJvZHkgKz0gXCJ0aGlzLlwiICsgcHJpdkZpZWxkICsgXCIgPSBcIiArIGdldHRlciArIFwiO1xcblwiO1xuXHRcdFx0cHJvdG9bZ2V0dGVyXSA9IHByb3RvW2dldHRlcl0gfHwgZnVuY3Rpb24odmFsKSB7XG5cdFx0XHRcdGlmICghYXJndW1lbnRzLmxlbmd0aCkge1xuXHRcdFx0XHRcdHJldHVybiB0aGlzW3ByaXZGaWVsZF07IC8vIElmIHRoZXJlIGlzIG5vIGFyZ3VtZW50LCB1c2UgYXMgYSBnZXR0ZXJcblx0XHRcdFx0fVxuXHRcdFx0XHRpZiAoJG9ic2VydmFibGUpIHtcblx0XHRcdFx0XHQkb2JzZXJ2YWJsZSh0aGlzKS5zZXRQcm9wZXJ0eShnZXR0ZXIsIHZhbCk7XG5cdFx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdFx0dGhpc1twcml2RmllbGRdID0gdmFsO1xuXHRcdFx0XHR9XG5cdFx0XHR9O1xuXG5cdFx0XHRpZiAoJG9ic2VydmFibGUpIHtcblx0XHRcdFx0cHJvdG9bZ2V0dGVyXS5zZXQgPSBwcm90b1tnZXR0ZXJdLnNldCB8fCBmdW5jdGlvbih2YWwpIHtcblx0XHRcdFx0XHR0aGlzW3ByaXZGaWVsZF0gPSB2YWw7IC8vIFNldHRlciBjYWxsZWQgYnkgb2JzZXJ2YWJsZSBwcm9wZXJ0eSBjaGFuZ2Vcblx0XHRcdFx0fTtcblx0XHRcdH1cblx0XHR9KShnZXR0ZXJzW2ldKTtcblx0fVxuXG5cdGNvbnN0cnVjdG9yID0gbmV3IEZ1bmN0aW9uKGFyZ3MsIGJvZHkuc2xpY2UoMCwgLTEpKTtcblx0Y29uc3RydWN0b3IucHJvdG90eXBlID0gcHJvdG87XG5cdHByb3RvLmNvbnN0cnVjdG9yID0gY29uc3RydWN0b3I7XG5cblx0dm0ubWFwID0gbWFwO1xuXHR2bS5nZXR0ZXJzID0gZ2V0dGVycztcblx0dm0uZXh0ZW5kID0gZXh0ZW5kO1xuXHR2bS5pZCA9IGlkO1xuXHRyZXR1cm4gdm07XG59XG5cbmZ1bmN0aW9uIHRtcGxPYmplY3QobWFya3VwLCBvcHRpb25zKSB7XG5cdC8vIFRlbXBsYXRlIG9iamVjdCBjb25zdHJ1Y3RvclxuXHR2YXIgaHRtbFRhZyxcblx0XHR3cmFwTWFwID0gJHN1YlNldHRpbmdzQWR2YW5jZWQuX3dtIHx8IHt9LCAvLyBPbmx5IHVzZWQgaW4gSnNWaWV3cy4gT3RoZXJ3aXNlIGVtcHR5OiB7fVxuXHRcdHRtcGwgPSAkZXh0ZW5kKFxuXHRcdFx0e1xuXHRcdFx0XHR0bXBsczogW10sXG5cdFx0XHRcdGxpbmtzOiB7fSwgLy8gQ29tcGlsZWQgZnVuY3Rpb25zIGZvciBsaW5rIGV4cHJlc3Npb25zXG5cdFx0XHRcdGJuZHM6IFtdLFxuXHRcdFx0XHRfaXM6IFwidGVtcGxhdGVcIixcblx0XHRcdFx0cmVuZGVyOiByZW5kZXJDb250ZW50XG5cdFx0XHR9LFxuXHRcdFx0b3B0aW9uc1xuXHRcdCk7XG5cblx0dG1wbC5tYXJrdXAgPSBtYXJrdXA7XG5cdGlmICghb3B0aW9ucy5odG1sVGFnKSB7XG5cdFx0Ly8gU2V0IHRtcGwudGFnIHRvIHRoZSB0b3AtbGV2ZWwgSFRNTCB0YWcgdXNlZCBpbiB0aGUgdGVtcGxhdGUsIGlmIGFueS4uLlxuXHRcdGh0bWxUYWcgPSByRmlyc3RFbGVtLmV4ZWMobWFya3VwKTtcblx0XHR0bXBsLmh0bWxUYWcgPSBodG1sVGFnID8gaHRtbFRhZ1sxXS50b0xvd2VyQ2FzZSgpIDogXCJcIjtcblx0fVxuXHRodG1sVGFnID0gd3JhcE1hcFt0bXBsLmh0bWxUYWddO1xuXHRpZiAoaHRtbFRhZyAmJiBodG1sVGFnICE9PSB3cmFwTWFwLmRpdikge1xuXHRcdC8vIFdoZW4gdXNpbmcgSnNWaWV3cywgd2UgdHJpbSB0ZW1wbGF0ZXMgd2hpY2ggYXJlIGluc2VydGVkIGludG8gSFRNTCBjb250ZXh0cyB3aGVyZSB0ZXh0IG5vZGVzIGFyZSBub3QgcmVuZGVyZWQgKGkuZS4gbm90ICdQaHJhc2luZyBDb250ZW50JykuXG5cdFx0Ly8gQ3VycmVudGx5IG5vdCB0cmltbWVkIGZvciA8bGk+IHRhZy4gKE5vdCB3b3J0aCBhZGRpbmcgcGVyZiBjb3N0KVxuXHRcdHRtcGwubWFya3VwID0gJC50cmltKHRtcGwubWFya3VwKTtcblx0fVxuXG5cdHJldHVybiB0bXBsO1xufVxuXG4vLz09PT09PT09PT09PT09XG4vLyByZWdpc3RlclN0b3JlXG4vLz09PT09PT09PT09PT09XG5cbmZ1bmN0aW9uIHJlZ2lzdGVyU3RvcmUoc3RvcmVOYW1lLCBzdG9yZVNldHRpbmdzKSB7XG5cblx0ZnVuY3Rpb24gdGhlU3RvcmUobmFtZSwgaXRlbSwgcGFyZW50VG1wbCkge1xuXHRcdC8vIFRoZSBzdG9yZSBpcyBhbHNvIHRoZSBmdW5jdGlvbiB1c2VkIHRvIGFkZCBpdGVtcyB0byB0aGUgc3RvcmUuIGUuZy4gJC50ZW1wbGF0ZXMsIG9yICQudmlld3MudGFnc1xuXG5cdFx0Ly8gRm9yIHN0b3JlIG9mIG5hbWUgJ3RoaW5nJywgQ2FsbCBhczpcblx0XHQvLyAgICAkLnZpZXdzLnRoaW5ncyhpdGVtc1ssIHBhcmVudFRtcGxdKSxcblx0XHQvLyBvciAkLnZpZXdzLnRoaW5ncyhuYW1lLCBpdGVtWywgcGFyZW50VG1wbF0pXG5cblx0XHR2YXIgb25TdG9yZSwgY29tcGlsZSwgaXRlbU5hbWUsIHRoaXNTdG9yZTtcblx0XHRpZiAobmFtZSAmJiB0eXBlb2YgbmFtZSA9PT0gT0JKRUNUICYmICFuYW1lLm5vZGVUeXBlICYmICFuYW1lLm1hcmt1cCAmJiAhbmFtZS5nZXRUZ3QgJiYgIShzdG9yZU5hbWUgPT09IFwidmlld01vZGVsXCIgJiYgbmFtZS5nZXR0ZXJzIHx8IG5hbWUuZXh0ZW5kKSkge1xuXHRcdFx0Ly8gQ2FsbCB0byAkLnZpZXdzLnRoaW5ncyhpdGVtc1ssIHBhcmVudFRtcGxdKSxcblxuXHRcdFx0Ly8gQWRkaW5nIGl0ZW1zIHRvIHRoZSBzdG9yZVxuXHRcdFx0Ly8gSWYgbmFtZSBpcyBhIGhhc2gsIHRoZW4gaXRlbSBpcyBwYXJlbnRUbXBsLiBJdGVyYXRlIG92ZXIgaGFzaCBhbmQgY2FsbCBzdG9yZSBmb3Iga2V5LlxuXHRcdFx0Zm9yIChpdGVtTmFtZSBpbiBuYW1lKSB7XG5cdFx0XHRcdHRoZVN0b3JlKGl0ZW1OYW1lLCBuYW1lW2l0ZW1OYW1lXSwgaXRlbSk7XG5cdFx0XHR9XG5cdFx0XHRyZXR1cm4gaXRlbSB8fCAkdmlld3M7XG5cdFx0fVxuXHRcdC8vIEFkZGluZyBhIHNpbmdsZSB1bm5hbWVkIGl0ZW0gdG8gdGhlIHN0b3JlXG5cdFx0aWYgKGl0ZW0gPT09IHVuZGVmaW5lZCkge1xuXHRcdFx0aXRlbSA9IG5hbWU7XG5cdFx0XHRuYW1lID0gdW5kZWZpbmVkO1xuXHRcdH1cblx0XHRpZiAobmFtZSAmJiBcIlwiICsgbmFtZSAhPT0gbmFtZSkgeyAvLyBuYW1lIG11c3QgYmUgYSBzdHJpbmdcblx0XHRcdHBhcmVudFRtcGwgPSBpdGVtO1xuXHRcdFx0aXRlbSA9IG5hbWU7XG5cdFx0XHRuYW1lID0gdW5kZWZpbmVkO1xuXHRcdH1cblx0XHR0aGlzU3RvcmUgPSBwYXJlbnRUbXBsXG5cdFx0XHQ/IHN0b3JlTmFtZSA9PT0gXCJ2aWV3TW9kZWxcIlxuXHRcdFx0XHQ/IHBhcmVudFRtcGxcblx0XHRcdFx0OiAocGFyZW50VG1wbFtzdG9yZU5hbWVzXSA9IHBhcmVudFRtcGxbc3RvcmVOYW1lc10gfHwge30pXG5cdFx0XHQ6IHRoZVN0b3JlO1xuXHRcdGNvbXBpbGUgPSBzdG9yZVNldHRpbmdzLmNvbXBpbGU7XG5cdFx0aWYgKGl0ZW0gPT09IG51bGwpIHtcblx0XHRcdC8vIElmIGl0ZW0gaXMgbnVsbCwgZGVsZXRlIHRoaXMgZW50cnlcblx0XHRcdGlmIChuYW1lKSB7XG5cdFx0XHRcdGRlbGV0ZSB0aGlzU3RvcmVbbmFtZV07XG5cdFx0XHR9XG5cdFx0fSBlbHNlIHtcblx0XHRcdGl0ZW0gPSBjb21waWxlID8gY29tcGlsZS5jYWxsKHRoaXNTdG9yZSwgbmFtZSwgaXRlbSwgcGFyZW50VG1wbCwgMCkgOiBpdGVtO1xuXHRcdFx0aWYgKG5hbWUpIHtcblx0XHRcdFx0dGhpc1N0b3JlW25hbWVdID0gaXRlbTtcblx0XHRcdH1cblx0XHR9XG5cdFx0aWYgKGNvbXBpbGUgJiYgaXRlbSkge1xuXHRcdFx0aXRlbS5faXMgPSBzdG9yZU5hbWU7IC8vIE9ubHkgZG8gdGhpcyBmb3IgY29tcGlsZWQgb2JqZWN0cyAodGFncywgdGVtcGxhdGVzLi4uKVxuXHRcdH1cblx0XHRpZiAoaXRlbSAmJiAob25TdG9yZSA9ICRzdWIub25TdG9yZVtzdG9yZU5hbWVdKSkge1xuXHRcdFx0Ly8gZS5nLiBKc1ZpZXdzIGludGVncmF0aW9uXG5cdFx0XHRvblN0b3JlKG5hbWUsIGl0ZW0sIGNvbXBpbGUpO1xuXHRcdH1cblx0XHRyZXR1cm4gaXRlbTtcblx0fVxuXG5cdHZhciBzdG9yZU5hbWVzID0gc3RvcmVOYW1lICsgXCJzXCI7XG5cblx0JHZpZXdzW3N0b3JlTmFtZXNdID0gdGhlU3RvcmU7XG59XG5cbmZ1bmN0aW9uIGFkZFNldHRpbmcoc3QpIHtcblx0JHZpZXdzU2V0dGluZ3Nbc3RdID0gZnVuY3Rpb24odmFsdWUpIHtcblx0XHRyZXR1cm4gYXJndW1lbnRzLmxlbmd0aFxuXHRcdFx0PyAoJHN1YlNldHRpbmdzW3N0XSA9IHZhbHVlLCAkdmlld3NTZXR0aW5ncylcblx0XHRcdDogJHN1YlNldHRpbmdzW3N0XTtcblx0fTtcbn1cblxuLy89PT09PT09PT1cbi8vIGRhdGFNYXBcbi8vPT09PT09PT09XG5cbmZ1bmN0aW9uIGRhdGFNYXAobWFwRGVmKSB7XG5cdGZ1bmN0aW9uIE1hcChzb3VyY2UsIG9wdGlvbnMpIHtcblx0XHR0aGlzLnRndCA9IG1hcERlZi5nZXRUZ3Qoc291cmNlLCBvcHRpb25zKTtcblx0fVxuXG5cdGlmICgkaXNGdW5jdGlvbihtYXBEZWYpKSB7XG5cdFx0Ly8gU2ltcGxlIG1hcCBkZWNsYXJlZCBhcyBmdW5jdGlvblxuXHRcdG1hcERlZiA9IHtcblx0XHRcdGdldFRndDogbWFwRGVmXG5cdFx0fTtcblx0fVxuXG5cdGlmIChtYXBEZWYuYmFzZU1hcCkge1xuXHRcdG1hcERlZiA9ICRleHRlbmQoJGV4dGVuZCh7fSwgbWFwRGVmLmJhc2VNYXApLCBtYXBEZWYpO1xuXHR9XG5cblx0bWFwRGVmLm1hcCA9IGZ1bmN0aW9uKHNvdXJjZSwgb3B0aW9ucykge1xuXHRcdHJldHVybiBuZXcgTWFwKHNvdXJjZSwgb3B0aW9ucyk7XG5cdH07XG5cdHJldHVybiBtYXBEZWY7XG59XG5cbi8vPT09PT09PT09PT09PT1cbi8vIHJlbmRlckNvbnRlbnRcbi8vPT09PT09PT09PT09PT1cblxuZnVuY3Rpb24gcmVuZGVyQ29udGVudChkYXRhLCBjb250ZXh0LCBub0l0ZXJhdGlvbiwgcGFyZW50Vmlldywga2V5LCBvblJlbmRlcikge1xuXHR2YXIgaSwgbCwgdGFnLCB0bXBsLCB0YWdDdHgsIGlzVG9wUmVuZGVyQ2FsbCwgcHJldkRhdGEsIHByZXZJbmRleCxcblx0XHR2aWV3ID0gcGFyZW50Vmlldyxcblx0XHRyZXN1bHQgPSBcIlwiO1xuXG5cdGlmIChjb250ZXh0ID09PSB0cnVlKSB7XG5cdFx0bm9JdGVyYXRpb24gPSBjb250ZXh0OyAvLyBwYXNzaW5nIGJvb2xlYW4gYXMgc2Vjb25kIHBhcmFtIC0gbm9JdGVyYXRpb25cblx0XHRjb250ZXh0ID0gdW5kZWZpbmVkO1xuXHR9IGVsc2UgaWYgKHR5cGVvZiBjb250ZXh0ICE9PSBPQkpFQ1QpIHtcblx0XHRjb250ZXh0ID0gdW5kZWZpbmVkOyAvLyBjb250ZXh0IG11c3QgYmUgYSBib29sZWFuIChub0l0ZXJhdGlvbikgb3IgYSBwbGFpbiBvYmplY3Rcblx0fVxuXG5cdGlmICh0YWcgPSB0aGlzLnRhZykge1xuXHRcdC8vIFRoaXMgaXMgYSBjYWxsIGZyb20gcmVuZGVyVGFnIG9yIHRhZ0N0eC5yZW5kZXIoLi4uKVxuXHRcdHRhZ0N0eCA9IHRoaXM7XG5cdFx0dmlldyA9IHZpZXcgfHwgdGFnQ3R4LnZpZXc7XG5cdFx0dG1wbCA9IHZpZXcuZ2V0VG1wbCh0YWcudGVtcGxhdGUgfHwgdGFnQ3R4LnRtcGwpO1xuXHRcdGlmICghYXJndW1lbnRzLmxlbmd0aCkge1xuXHRcdFx0ZGF0YSA9IHZpZXc7XG5cdFx0fVxuXHR9IGVsc2Uge1xuXHRcdC8vIFRoaXMgaXMgYSB0ZW1wbGF0ZS5yZW5kZXIoLi4uKSBjYWxsXG5cdFx0dG1wbCA9IHRoaXM7XG5cdH1cblxuXHRpZiAodG1wbCkge1xuXHRcdGlmICghcGFyZW50VmlldyAmJiBkYXRhICYmIGRhdGEuX2lzID09PSBcInZpZXdcIikge1xuXHRcdFx0dmlldyA9IGRhdGE7IC8vIFdoZW4gcGFzc2luZyBpbiBhIHZpZXcgdG8gcmVuZGVyIG9yIGxpbmsgKGFuZCBub3QgcGFzc2luZyBpbiBhIHBhcmVudCB2aWV3KSB1c2UgdGhlIHBhc3NlZC1pbiB2aWV3IGFzIHBhcmVudFZpZXdcblx0XHR9XG5cblx0XHRpZiAodmlldykge1xuXHRcdFx0aWYgKGRhdGEgPT09IHZpZXcpIHtcblx0XHRcdFx0Ly8gSW5oZXJpdCB0aGUgZGF0YSBmcm9tIHRoZSBwYXJlbnQgdmlldy5cblx0XHRcdFx0Ly8gVGhpcyBtYXkgYmUgdGhlIGNvbnRlbnRzIG9mIGFuIHt7aWZ9fSBibG9ja1xuXHRcdFx0XHRkYXRhID0gdmlldy5kYXRhO1xuXHRcdFx0fVxuXHRcdH1cblxuXHRcdGlzVG9wUmVuZGVyQ2FsbCA9ICF2aWV3O1xuXHRcdGlzUmVuZGVyQ2FsbCA9IGlzUmVuZGVyQ2FsbCB8fCBpc1RvcFJlbmRlckNhbGw7XG5cdFx0aWYgKCF2aWV3KSB7XG5cdFx0XHQoY29udGV4dCA9IGNvbnRleHQgfHwge30pLnJvb3QgPSBkYXRhOyAvLyBQcm92aWRlIH5yb290IGFzIHNob3J0Y3V0IHRvIHRvcC1sZXZlbCBkYXRhLlxuXHRcdH1cblx0XHRpZiAoIWlzUmVuZGVyQ2FsbCB8fCAkc3ViU2V0dGluZ3NBZHZhbmNlZC51c2VWaWV3cyB8fCB0bXBsLnVzZVZpZXdzIHx8IHZpZXcgJiYgdmlldyAhPT0gdG9wVmlldykge1xuXHRcdFx0cmVzdWx0ID0gcmVuZGVyV2l0aFZpZXdzKHRtcGwsIGRhdGEsIGNvbnRleHQsIG5vSXRlcmF0aW9uLCB2aWV3LCBrZXksIG9uUmVuZGVyLCB0YWcpO1xuXHRcdH0gZWxzZSB7XG5cdFx0XHRpZiAodmlldykgeyAvLyBJbiBhIGJsb2NrXG5cdFx0XHRcdHByZXZEYXRhID0gdmlldy5kYXRhO1xuXHRcdFx0XHRwcmV2SW5kZXggPSB2aWV3LmluZGV4O1xuXHRcdFx0XHR2aWV3LmluZGV4ID0gaW5kZXhTdHI7XG5cdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHR2aWV3ID0gdG9wVmlldztcblx0XHRcdFx0dmlldy5kYXRhID0gZGF0YTtcblx0XHRcdFx0dmlldy5jdHggPSBjb250ZXh0O1xuXHRcdFx0fVxuXHRcdFx0aWYgKCRpc0FycmF5KGRhdGEpICYmICFub0l0ZXJhdGlvbikge1xuXHRcdFx0XHQvLyBDcmVhdGUgYSB2aWV3IGZvciB0aGUgYXJyYXksIHdob3NlIGNoaWxkIHZpZXdzIGNvcnJlc3BvbmQgdG8gZWFjaCBkYXRhIGl0ZW0uIChOb3RlOiBpZiBrZXkgYW5kIHBhcmVudFZpZXcgYXJlIHBhc3NlZCBpblxuXHRcdFx0XHQvLyBhbG9uZyB3aXRoIHBhcmVudCB2aWV3LCB0cmVhdCBhcyBpbnNlcnQgLWUuZy4gZnJvbSB2aWV3LmFkZFZpZXdzIC0gc28gcGFyZW50VmlldyBpcyBhbHJlYWR5IHRoZSB2aWV3IGl0ZW0gZm9yIGFycmF5KVxuXHRcdFx0XHRmb3IgKGkgPSAwLCBsID0gZGF0YS5sZW5ndGg7IGkgPCBsOyBpKyspIHtcblx0XHRcdFx0XHR2aWV3LmluZGV4ID0gaTtcblx0XHRcdFx0XHR2aWV3LmRhdGEgPSBkYXRhW2ldO1xuXHRcdFx0XHRcdHJlc3VsdCArPSB0bXBsLmZuKGRhdGFbaV0sIHZpZXcsICRzdWIpO1xuXHRcdFx0XHR9XG5cdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHR2aWV3LmRhdGEgPSBkYXRhO1xuXHRcdFx0XHRyZXN1bHQgKz0gdG1wbC5mbihkYXRhLCB2aWV3LCAkc3ViKTtcblx0XHRcdH1cblx0XHRcdHZpZXcuZGF0YSA9IHByZXZEYXRhO1xuXHRcdFx0dmlldy5pbmRleCA9IHByZXZJbmRleDtcblx0XHR9XG5cdFx0aWYgKGlzVG9wUmVuZGVyQ2FsbCkge1xuXHRcdFx0aXNSZW5kZXJDYWxsID0gdW5kZWZpbmVkO1xuXHRcdH1cblx0fVxuXHRyZXR1cm4gcmVzdWx0O1xufVxuXG5mdW5jdGlvbiByZW5kZXJXaXRoVmlld3ModG1wbCwgZGF0YSwgY29udGV4dCwgbm9JdGVyYXRpb24sIHZpZXcsIGtleSwgb25SZW5kZXIsIHRhZykge1xuXHRmdW5jdGlvbiBzZXRJdGVtVmFyKGl0ZW0pIHtcblx0XHQvLyBXaGVuIGl0ZW1WYXIgaXMgc3BlY2lmaWVkLCBzZXQgbW9kaWZpZWQgY3R4IHdpdGggdXNlci1uYW1lZCB+aXRlbVxuXHRcdG5ld0N0eCA9ICRleHRlbmQoe30sIGNvbnRleHQpO1xuXHRcdG5ld0N0eFtpdGVtVmFyXSA9IGl0ZW07XG5cdH1cblxuXHQvLyBSZW5kZXIgdGVtcGxhdGUgYWdhaW5zdCBkYXRhIGFzIGEgdHJlZSBvZiBzdWJ2aWV3cyAobmVzdGVkIHJlbmRlcmVkIHRlbXBsYXRlIGluc3RhbmNlcyksIG9yIGFzIGEgc3RyaW5nICh0b3AtbGV2ZWwgdGVtcGxhdGUpLlxuXHQvLyBJZiB0aGUgZGF0YSBpcyB0aGUgcGFyZW50IHZpZXcsIHRyZWF0IGFzIG5vSXRlcmF0aW9uLCByZS1yZW5kZXIgd2l0aCB0aGUgc2FtZSBkYXRhIGNvbnRleHQuXG5cdHZhciBpLCBsLCBuZXdWaWV3LCBjaGlsZFZpZXcsIGl0ZW1SZXN1bHQsIHN3YXBDb250ZW50LCBjb250ZW50VG1wbCwgb3V0ZXJPblJlbmRlciwgdG1wbE5hbWUsIGl0ZW1WYXIsIG5ld0N0eCwgdGFnQ3R4LFxuXHRcdHJlc3VsdCA9IFwiXCI7XG5cblx0aWYgKHRhZykge1xuXHRcdC8vIFRoaXMgaXMgYSBjYWxsIGZyb20gcmVuZGVyVGFnIG9yIHRhZ0N0eC5yZW5kZXIoLi4uKVxuXHRcdHRtcGxOYW1lID0gdGFnLnRhZ05hbWU7XG5cdFx0dGFnQ3R4ID0gdGFnLnRhZ0N0eDtcblx0XHRjb250ZXh0ID0gY29udGV4dCA/IGV4dGVuZEN0eChjb250ZXh0LCB0YWcuY3R4KSA6IHRhZy5jdHg7XG5cblx0XHRpZiAodG1wbCA9PT0gdmlldy5jb250ZW50KSB7IC8vIHt7eHh4IHRtcGw9I2NvbnRlbnR9fVxuXHRcdFx0Y29udGVudFRtcGwgPSB0bXBsICE9PSB2aWV3LmN0eC5fd3JwIC8vIFdlIGFyZSByZW5kZXJpbmcgdGhlICNjb250ZW50XG5cdFx0XHRcdD8gdmlldy5jdHguX3dycCAvLyAjY29udGVudCB3YXMgdGhlIHRhZ0N0eC5wcm9wcy50bXBsIHdyYXBwZXIgb2YgdGhlIGJsb2NrIGNvbnRlbnQgLSBzbyB3aXRoaW4gdGhpcyB2aWV3LCAjY29udGVudCB3aWxsIG5vdyBiZSB0aGUgdmlldy5jdHguX3dycCBibG9jayBjb250ZW50XG5cdFx0XHRcdDogdW5kZWZpbmVkOyAvLyAjY29udGVudCB3YXMgdGhlIHZpZXcuY3R4Ll93cnAgYmxvY2sgY29udGVudCAtIHNvIHdpdGhpbiB0aGlzIHZpZXcsIHRoZXJlIGlzIG5vIGxvbmdlciBhbnkgI2NvbnRlbnQgdG8gd3JhcC5cblx0XHR9IGVsc2UgaWYgKHRtcGwgIT09IHRhZ0N0eC5jb250ZW50KSB7XG5cdFx0XHRpZiAodG1wbCA9PT0gdGFnLnRlbXBsYXRlKSB7IC8vIFJlbmRlcmluZyB7e3RhZ319IHRhZy50ZW1wbGF0ZSwgcmVwbGFjaW5nIGJsb2NrIGNvbnRlbnQuXG5cdFx0XHRcdGNvbnRlbnRUbXBsID0gdGFnQ3R4LnRtcGw7IC8vIFNldCAjY29udGVudCB0byBibG9jayBjb250ZW50IChvciB3cmFwcGVkIGJsb2NrIGNvbnRlbnQgaWYgdGFnQ3R4LnByb3BzLnRtcGwgaXMgc2V0KVxuXHRcdFx0XHRjb250ZXh0Ll93cnAgPSB0YWdDdHguY29udGVudDsgLy8gUGFzcyB3cmFwcGVkIGJsb2NrIGNvbnRlbnQgdG8gbmVzdGVkIHZpZXdzXG5cdFx0XHR9IGVsc2UgeyAvLyBSZW5kZXJpbmcgdGFnQ3R4LnByb3BzLnRtcGwgd3JhcHBlclxuXHRcdFx0XHRjb250ZW50VG1wbCA9IHRhZ0N0eC5jb250ZW50IHx8IHZpZXcuY29udGVudDsgLy8gU2V0ICNjb250ZW50IHRvIHdyYXBwZWQgYmxvY2sgY29udGVudFxuXHRcdFx0fVxuXHRcdH0gZWxzZSB7XG5cdFx0XHRjb250ZW50VG1wbCA9IHZpZXcuY29udGVudDsgLy8gTmVzdGVkIHZpZXdzIGluaGVyaXQgc2FtZSB3cmFwcGVkICNjb250ZW50IHByb3BlcnR5XG5cdFx0fVxuXG5cdFx0aWYgKHRhZ0N0eC5wcm9wcy5saW5rID09PSBmYWxzZSkge1xuXHRcdFx0Ly8gbGluaz1mYWxzZSBzZXR0aW5nIG9uIGJsb2NrIHRhZ1xuXHRcdFx0Ly8gV2Ugd2lsbCBvdmVycmlkZSBpbmhlcml0ZWQgdmFsdWUgb2YgbGluayBieSB0aGUgZXhwbGljaXQgc2V0dGluZyBsaW5rPWZhbHNlIHRha2VuIGZyb20gcHJvcHNcblx0XHRcdC8vIFRoZSBjaGlsZCB2aWV3cyBvZiBhbiB1bmxpbmtlZCB2aWV3IGFyZSBhbHNvIHVubGlua2VkLiBTbyBzZXR0aW5nIGNoaWxkIGJhY2sgdG8gdHJ1ZSB3aWxsIG5vdCBoYXZlIGFueSBlZmZlY3QuXG5cdFx0XHRjb250ZXh0ID0gY29udGV4dCB8fCB7fTtcblx0XHRcdGNvbnRleHQubGluayA9IGZhbHNlO1xuXHRcdH1cblxuXHRcdGlmIChpdGVtVmFyID0gdGFnQ3R4LnByb3BzLml0ZW1WYXIpIHtcblx0XHRcdGlmIChpdGVtVmFyLmNoYXJBdCgwKSAhPT0gXCJ+XCIpIHtcblx0XHRcdFx0c3ludGF4RXJyb3IoXCJVc2UgaXRlbVZhcj0nfm15SXRlbSdcIik7XG5cdFx0XHR9XG5cdFx0XHRpdGVtVmFyID0gaXRlbVZhci5zbGljZSgxKTtcblx0XHR9XG5cdH1cblxuXHRpZiAodmlldykge1xuXHRcdG9uUmVuZGVyID0gb25SZW5kZXIgfHwgdmlldy5fLm9uUmVuZGVyO1xuXHRcdGNvbnRleHQgPSBleHRlbmRDdHgoY29udGV4dCwgdmlldy5jdHgpO1xuXHR9XG5cblx0aWYgKGtleSA9PT0gdHJ1ZSkge1xuXHRcdHN3YXBDb250ZW50ID0gdHJ1ZTtcblx0XHRrZXkgPSAwO1xuXHR9XG5cblx0Ly8gSWYgbGluaz09PWZhbHNlLCBkbyBub3QgY2FsbCBvblJlbmRlciwgc28gbm8gZGF0YS1saW5raW5nIG1hcmtlciBub2Rlc1xuXHRpZiAob25SZW5kZXIgJiYgKGNvbnRleHQgJiYgY29udGV4dC5saW5rID09PSBmYWxzZSB8fCB0YWcgJiYgdGFnLl8ubm9Wd3MpKSB7XG5cdFx0b25SZW5kZXIgPSB1bmRlZmluZWQ7XG5cdH1cblx0b3V0ZXJPblJlbmRlciA9IG9uUmVuZGVyO1xuXHRpZiAob25SZW5kZXIgPT09IHRydWUpIHtcblx0XHQvLyBVc2VkIGJ5IHZpZXcucmVmcmVzaCgpLiBEb24ndCBjcmVhdGUgYSBuZXcgd3JhcHBlciB2aWV3LlxuXHRcdG91dGVyT25SZW5kZXIgPSB1bmRlZmluZWQ7XG5cdFx0b25SZW5kZXIgPSB2aWV3Ll8ub25SZW5kZXI7XG5cdH1cblx0Ly8gU2V0IGFkZGl0aW9uYWwgY29udGV4dCBvbiB2aWV3cyBjcmVhdGVkIGhlcmUsIChhcyBtb2RpZmllZCBjb250ZXh0IGluaGVyaXRlZCBmcm9tIHRoZSBwYXJlbnQsIGFuZCB0byBiZSBpbmhlcml0ZWQgYnkgY2hpbGQgdmlld3MpXG5cdGNvbnRleHQgPSB0bXBsLmhlbHBlcnNcblx0XHQ/IGV4dGVuZEN0eCh0bXBsLmhlbHBlcnMsIGNvbnRleHQpXG5cdFx0OiBjb250ZXh0O1xuXG5cdG5ld0N0eCA9IGNvbnRleHQ7XG5cdGlmICgkaXNBcnJheShkYXRhKSAmJiAhbm9JdGVyYXRpb24pIHtcblx0XHQvLyBDcmVhdGUgYSB2aWV3IGZvciB0aGUgYXJyYXksIHdob3NlIGNoaWxkIHZpZXdzIGNvcnJlc3BvbmQgdG8gZWFjaCBkYXRhIGl0ZW0uIChOb3RlOiBpZiBrZXkgYW5kIHZpZXcgYXJlIHBhc3NlZCBpblxuXHRcdC8vIGFsb25nIHdpdGggcGFyZW50IHZpZXcsIHRyZWF0IGFzIGluc2VydCAtZS5nLiBmcm9tIHZpZXcuYWRkVmlld3MgLSBzbyB2aWV3IGlzIGFscmVhZHkgdGhlIHZpZXcgaXRlbSBmb3IgYXJyYXkpXG5cdFx0bmV3VmlldyA9IHN3YXBDb250ZW50XG5cdFx0XHQ/IHZpZXdcblx0XHRcdDogKGtleSAhPT0gdW5kZWZpbmVkICYmIHZpZXcpXG5cdFx0XHRcdHx8IG5ldyBWaWV3KGNvbnRleHQsIFwiYXJyYXlcIiwgdmlldywgZGF0YSwgdG1wbCwga2V5LCBvblJlbmRlciwgY29udGVudFRtcGwpO1xuXHRcdGlmICh2aWV3ICYmIHZpZXcuXy51c2VLZXkpIHtcblx0XHRcdC8vIFBhcmVudCBpcyBub3QgYW4gJ2FycmF5IHZpZXcnXG5cdFx0XHRuZXdWaWV3Ll8uYm5kID0gIXRhZyB8fCB0YWcuXy5ibmQgJiYgdGFnOyAvLyBGb3IgYXJyYXkgdmlld3MgdGhhdCBhcmUgZGF0YSBib3VuZCBmb3IgY29sbGVjdGlvbiBjaGFuZ2UgZXZlbnRzLCBzZXQgdGhlXG5cdFx0XHQvLyB2aWV3Ll8uYm5kIHByb3BlcnR5IHRvIHRydWUgZm9yIHRvcC1sZXZlbCBsaW5rKCkgb3IgZGF0YS1saW5rPVwie2Zvcn1cIiwgb3IgdG8gdGhlIHRhZyBpbnN0YW5jZSBmb3IgYSBkYXRhLWJvdW5kIHRhZywgZS5nLiB7Xntmb3IgLi4ufX1cblx0XHR9XG5cdFx0aWYgKGl0ZW1WYXIpIHtcblx0XHRcdG5ld1ZpZXcuaXQgPSBpdGVtVmFyO1xuXHRcdH1cblx0XHRpdGVtVmFyID0gbmV3Vmlldy5pdDtcblx0XHRmb3IgKGkgPSAwLCBsID0gZGF0YS5sZW5ndGg7IGkgPCBsOyBpKyspIHtcblx0XHRcdC8vIENyZWF0ZSBhIHZpZXcgZm9yIGVhY2ggZGF0YSBpdGVtLlxuXHRcdFx0aWYgKGl0ZW1WYXIpIHtcblx0XHRcdFx0c2V0SXRlbVZhcihkYXRhW2ldKTsgLy8gdXNlIG1vZGlmaWVkIGN0eCB3aXRoIHVzZXItbmFtZWQgfml0ZW1cblx0XHRcdH1cblx0XHRcdGNoaWxkVmlldyA9IG5ldyBWaWV3KG5ld0N0eCwgXCJpdGVtXCIsIG5ld1ZpZXcsIGRhdGFbaV0sIHRtcGwsIChrZXkgfHwgMCkgKyBpLCBvblJlbmRlciwgbmV3Vmlldy5jb250ZW50KTtcblxuXHRcdFx0aXRlbVJlc3VsdCA9IHRtcGwuZm4oZGF0YVtpXSwgY2hpbGRWaWV3LCAkc3ViKTtcblx0XHRcdHJlc3VsdCArPSBuZXdWaWV3Ll8ub25SZW5kZXIgPyBuZXdWaWV3Ll8ub25SZW5kZXIoaXRlbVJlc3VsdCwgY2hpbGRWaWV3KSA6IGl0ZW1SZXN1bHQ7XG5cdFx0fVxuXHR9IGVsc2Uge1xuXHRcdC8vIENyZWF0ZSBhIHZpZXcgZm9yIHNpbmdsZXRvbiBkYXRhIG9iamVjdC4gVGhlIHR5cGUgb2YgdGhlIHZpZXcgd2lsbCBiZSB0aGUgdGFnIG5hbWUsIGUuZy4gXCJpZlwiIG9yIFwibXlUYWdcIiBleGNlcHQgZm9yXG5cdFx0Ly8gXCJpdGVtXCIsIFwiYXJyYXlcIiBhbmQgXCJkYXRhXCIgdmlld3MuIEEgXCJkYXRhXCIgdmlldyBpcyBmcm9tIHByb2dyYW1tYXRpYyByZW5kZXIob2JqZWN0KSBhZ2FpbnN0IGEgJ3NpbmdsZXRvbicuXG5cdFx0aWYgKGl0ZW1WYXIpIHtcblx0XHRcdHNldEl0ZW1WYXIoZGF0YSk7XG5cdFx0fVxuXHRcdG5ld1ZpZXcgPSBzd2FwQ29udGVudCA/IHZpZXcgOiBuZXcgVmlldyhuZXdDdHgsIHRtcGxOYW1lIHx8IFwiZGF0YVwiLCB2aWV3LCBkYXRhLCB0bXBsLCBrZXksIG9uUmVuZGVyLCBjb250ZW50VG1wbCk7XG5cdFx0aWYgKHRhZyAmJiAhdGFnLmZsb3cpIHtcblx0XHRcdG5ld1ZpZXcudGFnID0gdGFnO1xuXHRcdFx0dGFnLnZpZXcgPSBuZXdWaWV3O1xuXHRcdH1cblx0XHRyZXN1bHQgKz0gdG1wbC5mbihkYXRhLCBuZXdWaWV3LCAkc3ViKTtcblx0fVxuXHRyZXR1cm4gb3V0ZXJPblJlbmRlciA/IG91dGVyT25SZW5kZXIocmVzdWx0LCBuZXdWaWV3KSA6IHJlc3VsdDtcbn1cblxuLy89PT09PT09PT09PT09PT09PT09PT09PT09PT1cbi8vIEJ1aWxkIGFuZCBjb21waWxlIHRlbXBsYXRlXG4vLz09PT09PT09PT09PT09PT09PT09PT09PT09PVxuXG4vLyBHZW5lcmF0ZSBhIHJldXNhYmxlIGZ1bmN0aW9uIHRoYXQgd2lsbCBzZXJ2ZSB0byByZW5kZXIgYSB0ZW1wbGF0ZSBhZ2FpbnN0IGRhdGFcbi8vIChDb21waWxlIEFTVCB0aGVuIGJ1aWxkIHRlbXBsYXRlIGZ1bmN0aW9uKVxuXG5mdW5jdGlvbiBvblJlbmRlckVycm9yKGUsIHZpZXcsIGZhbGxiYWNrKSB7XG5cdHZhciBtZXNzYWdlID0gZmFsbGJhY2sgIT09IHVuZGVmaW5lZFxuXHRcdD8gJGlzRnVuY3Rpb24oZmFsbGJhY2spXG5cdFx0XHQ/IGZhbGxiYWNrLmNhbGwodmlldy5kYXRhLCBlLCB2aWV3KVxuXHRcdFx0OiBmYWxsYmFjayB8fCBcIlwiXG5cdFx0OiBcIntFcnJvcjogXCIgKyBlLm1lc3NhZ2UgKyBcIn1cIjtcblxuXHRpZiAoJHN1YlNldHRpbmdzLm9uRXJyb3IgJiYgKGZhbGxiYWNrID0gJHN1YlNldHRpbmdzLm9uRXJyb3IuY2FsbCh2aWV3LmRhdGEsIGUsIGZhbGxiYWNrICYmIG1lc3NhZ2UsIHZpZXcpKSAhPT0gdW5kZWZpbmVkKSB7XG5cdFx0bWVzc2FnZSA9IGZhbGxiYWNrOyAvLyBUaGVyZSBpcyBhIHNldHRpbmdzLmRlYnVnTW9kZShoYW5kbGVyKSBvbkVycm9yIG92ZXJyaWRlLiBDYWxsIGl0LCBhbmQgdXNlIHJldHVybiB2YWx1ZSAoaWYgYW55KSB0byByZXBsYWNlIG1lc3NhZ2Vcblx0fVxuXG5cdHJldHVybiB2aWV3ICYmICF2aWV3LmxpbmtDdHggPyAkY29udmVydGVycy5odG1sKG1lc3NhZ2UpIDogbWVzc2FnZTtcbn1cblxuZnVuY3Rpb24gZXJyb3IobWVzc2FnZSkge1xuXHR0aHJvdyBuZXcgJHN1Yi5FcnIobWVzc2FnZSk7XG59XG5cbmZ1bmN0aW9uIHN5bnRheEVycm9yKG1lc3NhZ2UpIHtcblx0ZXJyb3IoXCJTeW50YXggZXJyb3JcXG5cIiArIG1lc3NhZ2UpO1xufVxuXG5mdW5jdGlvbiB0bXBsRm4obWFya3VwLCB0bXBsLCBpc0xpbmtFeHByLCBjb252ZXJ0QmFjaywgaGFzRWxzZSkge1xuXHQvLyBDb21waWxlIG1hcmt1cCB0byBBU1QgKGFidHJhY3Qgc3ludGF4IHRyZWUpIHRoZW4gYnVpbGQgdGhlIHRlbXBsYXRlIGZ1bmN0aW9uIGNvZGUgZnJvbSB0aGUgQVNUIG5vZGVzXG5cdC8vIFVzZWQgZm9yIGNvbXBpbGluZyB0ZW1wbGF0ZXMsIGFuZCBhbHNvIGJ5IEpzVmlld3MgdG8gYnVpbGQgZnVuY3Rpb25zIGZvciBkYXRhIGxpbmsgZXhwcmVzc2lvbnNcblxuXHQvLz09PT0gbmVzdGVkIGZ1bmN0aW9ucyA9PT09XG5cdGZ1bmN0aW9uIHB1c2hwcmVjZWRpbmdDb250ZW50KHNoaWZ0KSB7XG5cdFx0c2hpZnQgLT0gbG9jO1xuXHRcdGlmIChzaGlmdCkge1xuXHRcdFx0Y29udGVudC5wdXNoKG1hcmt1cC5zdWJzdHIobG9jLCBzaGlmdCkucmVwbGFjZShyTmV3TGluZSwgXCJcXFxcblwiKSk7XG5cdFx0fVxuXHR9XG5cblx0ZnVuY3Rpb24gYmxvY2tUYWdDaGVjayh0YWdOYW1lLCBibG9jaykge1xuXHRcdGlmICh0YWdOYW1lKSB7XG5cdFx0XHR0YWdOYW1lICs9ICd9fSc7XG5cdFx0XHQvL1x0XHRcdCd7e2luY2x1ZGV9fSBibG9jayBoYXMge3svZm9yfX0gd2l0aCBubyBvcGVuIHt7Zm9yfX0nXG5cdFx0XHRzeW50YXhFcnJvcigoXG5cdFx0XHRcdGJsb2NrXG5cdFx0XHRcdFx0PyAne3snICsgYmxvY2sgKyAnfX0gYmxvY2sgaGFzIHt7LycgKyB0YWdOYW1lICsgJyB3aXRob3V0IHt7JyArIHRhZ05hbWVcblx0XHRcdFx0XHQ6ICdVbm1hdGNoZWQgb3IgbWlzc2luZyB7ey8nICsgdGFnTmFtZSkgKyAnLCBpbiB0ZW1wbGF0ZTpcXG4nICsgbWFya3VwKTtcblx0XHR9XG5cdH1cblxuXHRmdW5jdGlvbiBwYXJzZVRhZyhhbGwsIGJpbmQsIHRhZ05hbWUsIGNvbnZlcnRlciwgY29sb24sIGh0bWwsIGNvZGVUYWcsIHBhcmFtcywgc2xhc2gsIGJpbmQyLCBjbG9zZUJsb2NrLCBpbmRleCkge1xuLypcblxuICAgICBiaW5kICAgICB0YWdOYW1lICAgICAgICAgY3Z0ICAgY2xuIGh0bWwgY29kZSAgICBwYXJhbXMgICAgICAgICAgICBzbGFzaCAgIGJpbmQyICAgICAgICAgY2xvc2VCbGsgIGNvbW1lbnRcbi8oPzp7KFxcXik/eyg/OihcXHcrKD89W1xcL1xcc31dKSl8KFxcdyspPyg6KXwoPil8KFxcKikpXFxzKigoPzpbXn1dfH0oPyF9KSkqPykoXFwvKT98eyhcXF4pP3soPzooPzpcXC8oXFx3KykpXFxzKnwhLS1bXFxzXFxTXSo/LS0pKX19L2dcblxuKD86XG4gIHsoXFxeKT97ICAgICAgICAgICAgYmluZFxuICAoPzpcbiAgICAoXFx3KyAgICAgICAgICAgICB0YWdOYW1lXG4gICAgICAoPz1bXFwvXFxzfV0pXG4gICAgKVxuICAgIHxcbiAgICAoXFx3Kyk/KDopICAgICAgICBjb252ZXJ0ZXIgY29sb25cbiAgICB8XG4gICAgKD4pICAgICAgICAgICAgICBodG1sXG4gICAgfFxuICAgIChcXCopICAgICAgICAgICAgIGNvZGVUYWdcbiAgKVxuICBcXHMqXG4gICggICAgICAgICAgICAgICAgICBwYXJhbXNcbiAgICAoPzpbXn1dfH0oPyF9KSkqP1xuICApXG4gIChcXC8pPyAgICAgICAgICAgICAgc2xhc2hcbiAgfFxuICB7KFxcXik/eyAgICAgICAgICAgIGJpbmQyXG4gICg/OlxuICAgICg/OlxcLyhcXHcrKSlcXHMqICAgY2xvc2VCbG9ja1xuICAgIHxcbiAgICAhLS1bXFxzXFxTXSo/LS0gICAgY29tbWVudFxuICApXG4pXG59fS9nXG5cbiovXG5cdFx0aWYgKGNvZGVUYWcgJiYgYmluZCB8fCBzbGFzaCAmJiAhdGFnTmFtZSB8fCBwYXJhbXMgJiYgcGFyYW1zLnNsaWNlKC0xKSA9PT0gXCI6XCIgfHwgYmluZDIpIHtcblx0XHRcdHN5bnRheEVycm9yKGFsbCk7XG5cdFx0fVxuXG5cdFx0Ly8gQnVpbGQgYWJzdHJhY3Qgc3ludGF4IHRyZWUgKEFTVCk6IFt0YWdOYW1lLCBjb252ZXJ0ZXIsIHBhcmFtcywgY29udGVudCwgaGFzaCwgYmluZGluZ3MsIGNvbnRlbnRNYXJrdXBdXG5cdFx0aWYgKGh0bWwpIHtcblx0XHRcdGNvbG9uID0gXCI6XCI7XG5cdFx0XHRjb252ZXJ0ZXIgPSBIVE1MO1xuXHRcdH1cblx0XHRzbGFzaCA9IHNsYXNoIHx8IGlzTGlua0V4cHIgJiYgIWhhc0Vsc2U7XG5cblx0XHR2YXIgcGF0aEJpbmRpbmdzID0gKGJpbmQgfHwgaXNMaW5rRXhwcikgJiYgW1tdXSxcblx0XHRcdHByb3BzID0gXCJcIixcblx0XHRcdGFyZ3MgPSBcIlwiLFxuXHRcdFx0Y3R4UHJvcHMgPSBcIlwiLFxuXHRcdFx0cGFyYW1zQXJncyA9IFwiXCIsXG5cdFx0XHRwYXJhbXNQcm9wcyA9IFwiXCIsXG5cdFx0XHRwYXJhbXNDdHhQcm9wcyA9IFwiXCIsXG5cdFx0XHRvbkVycm9yID0gXCJcIixcblx0XHRcdHVzZVRyaWdnZXIgPSBcIlwiLFxuXHRcdFx0Ly8gQmxvY2sgdGFnIGlmIG5vdCBzZWxmLWNsb3NpbmcgYW5kIG5vdCB7ezp9fSBvciB7ez59fSAoc3BlY2lhbCBjYXNlKSBhbmQgbm90IGEgZGF0YS1saW5rIGV4cHJlc3Npb25cblx0XHRcdGJsb2NrID0gIXNsYXNoICYmICFjb2xvbjtcblxuXHRcdC8vPT09PSBuZXN0ZWQgaGVscGVyIGZ1bmN0aW9uID09PT1cblx0XHR0YWdOYW1lID0gdGFnTmFtZSB8fCAocGFyYW1zID0gcGFyYW1zIHx8IFwiI2RhdGFcIiwgY29sb24pOyAvLyB7ezp9fSBpcyBlcXVpdmFsZW50IHRvIHt7OiNkYXRhfX1cblx0XHRwdXNocHJlY2VkaW5nQ29udGVudChpbmRleCk7XG5cdFx0bG9jID0gaW5kZXggKyBhbGwubGVuZ3RoOyAvLyBsb2NhdGlvbiBtYXJrZXIgLSBwYXJzZWQgdXAgdG8gaGVyZVxuXHRcdGlmIChjb2RlVGFnKSB7XG5cdFx0XHRpZiAoYWxsb3dDb2RlKSB7XG5cdFx0XHRcdGNvbnRlbnQucHVzaChbXCIqXCIsIFwiXFxuXCIgKyBwYXJhbXMucmVwbGFjZSgvXjovLCBcInJldCs9IFwiKS5yZXBsYWNlKHJVbmVzY2FwZVF1b3RlcywgXCIkMVwiKSArIFwiO1xcblwiXSk7XG5cdFx0XHR9XG5cdFx0fSBlbHNlIGlmICh0YWdOYW1lKSB7XG5cdFx0XHRpZiAodGFnTmFtZSA9PT0gXCJlbHNlXCIpIHtcblx0XHRcdFx0aWYgKHJUZXN0RWxzZUlmLnRlc3QocGFyYW1zKSkge1xuXHRcdFx0XHRcdHN5bnRheEVycm9yKCdmb3IgXCJ7e2Vsc2UgaWYgZXhwcn19XCIgdXNlIFwie3tlbHNlIGV4cHJ9fVwiJyk7XG5cdFx0XHRcdH1cblx0XHRcdFx0cGF0aEJpbmRpbmdzID0gY3VycmVudFs3XSAmJiBbW11dO1xuXHRcdFx0XHRjdXJyZW50WzhdID0gbWFya3VwLnN1YnN0cmluZyhjdXJyZW50WzhdLCBpbmRleCk7IC8vIGNvbnRlbnRNYXJrdXAgZm9yIGJsb2NrIHRhZ1xuXHRcdFx0XHRjdXJyZW50ID0gc3RhY2sucG9wKCk7XG5cdFx0XHRcdGNvbnRlbnQgPSBjdXJyZW50WzJdO1xuXHRcdFx0XHRibG9jayA9IHRydWU7XG5cdFx0XHR9XG5cdFx0XHRpZiAocGFyYW1zKSB7XG5cdFx0XHRcdC8vIHJlbW92ZSBuZXdsaW5lcyBmcm9tIHRoZSBwYXJhbXMgc3RyaW5nLCB0byBhdm9pZCBjb21waWxlZCBjb2RlIGVycm9ycyBmb3IgdW50ZXJtaW5hdGVkIHN0cmluZ3Ncblx0XHRcdFx0cGFyc2VQYXJhbXMocGFyYW1zLnJlcGxhY2Uock5ld0xpbmUsIFwiIFwiKSwgcGF0aEJpbmRpbmdzLCB0bXBsKVxuXHRcdFx0XHRcdC5yZXBsYWNlKHJCdWlsZEhhc2gsIGZ1bmN0aW9uKGFsbCwgb25lcnJvciwgaXNDdHgsIGtleSwga2V5VG9rZW4sIGtleVZhbHVlLCBhcmcsIHBhcmFtKSB7XG5cdFx0XHRcdFx0XHRrZXkgPSBcIidcIiArIGtleVRva2VuICsgXCInOlwiO1xuXHRcdFx0XHRcdFx0aWYgKGFyZykge1xuXHRcdFx0XHRcdFx0XHRhcmdzICs9IGtleVZhbHVlICsgXCIsXCI7XG5cdFx0XHRcdFx0XHRcdHBhcmFtc0FyZ3MgKz0gXCInXCIgKyBwYXJhbSArIFwiJyxcIjtcblx0XHRcdFx0XHRcdH0gZWxzZSBpZiAoaXNDdHgpIHtcblx0XHRcdFx0XHRcdFx0Y3R4UHJvcHMgKz0ga2V5ICsgJ2ouX2NwKCcgKyBrZXlWYWx1ZSArICcsXCInICsgcGFyYW0gKyAnXCIsdmlldyksJztcblx0XHRcdFx0XHRcdFx0Ly8gQ29tcGlsZWQgY29kZSBmb3IgZXZhbHVhdGluZyB0YWdDdHggb24gYSB0YWcgd2lsbCBoYXZlOiBjdHg6eydmb28nOmouX2NwKGNvbXBpbGVkRXhwciwgXCJleHByXCIsIHZpZXcpfVxuXHRcdFx0XHRcdFx0XHRwYXJhbXNDdHhQcm9wcyArPSBrZXkgKyBcIidcIiArIHBhcmFtICsgXCInLFwiO1xuXHRcdFx0XHRcdFx0fSBlbHNlIGlmIChvbmVycm9yKSB7XG5cdFx0XHRcdFx0XHRcdG9uRXJyb3IgKz0ga2V5VmFsdWU7XG5cdFx0XHRcdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRcdFx0XHRpZiAoa2V5VG9rZW4gPT09IFwidHJpZ2dlclwiKSB7XG5cdFx0XHRcdFx0XHRcdFx0dXNlVHJpZ2dlciArPSBrZXlWYWx1ZTtcblx0XHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdFx0XHRwcm9wcyArPSBrZXkgKyBrZXlWYWx1ZSArIFwiLFwiO1xuXHRcdFx0XHRcdFx0XHRwYXJhbXNQcm9wcyArPSBrZXkgKyBcIidcIiArIHBhcmFtICsgXCInLFwiO1xuXHRcdFx0XHRcdFx0XHRoYXNIYW5kbGVycyA9IGhhc0hhbmRsZXJzIHx8IHJIYXNIYW5kbGVycy50ZXN0KGtleVRva2VuKTtcblx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHRcdHJldHVybiBcIlwiO1xuXHRcdFx0XHRcdH0pLnNsaWNlKDAsIC0xKTtcblx0XHRcdH1cblxuXHRcdFx0aWYgKHBhdGhCaW5kaW5ncyAmJiBwYXRoQmluZGluZ3NbMF0pIHtcblx0XHRcdFx0cGF0aEJpbmRpbmdzLnBvcCgpOyAvLyBSZW1vdmUgdGhlIGJpbmRpbmdzIHRoYXQgd2FzIHByZXBhcmVkIGZvciBuZXh0IGFyZy4gKFRoZXJlIGlzIGFsd2F5cyBhbiBleHRyYSBvbmUgcmVhZHkpLlxuXHRcdFx0fVxuXG5cdFx0XHRuZXdOb2RlID0gW1xuXHRcdFx0XHRcdHRhZ05hbWUsXG5cdFx0XHRcdFx0Y29udmVydGVyIHx8ICEhY29udmVydEJhY2sgfHwgaGFzSGFuZGxlcnMgfHwgXCJcIixcblx0XHRcdFx0XHRibG9jayAmJiBbXSxcblx0XHRcdFx0XHRwYXJzZWRQYXJhbShwYXJhbXNBcmdzIHx8ICh0YWdOYW1lID09PSBcIjpcIiA/IFwiJyNkYXRhJyxcIiA6IFwiXCIpLCBwYXJhbXNQcm9wcywgcGFyYW1zQ3R4UHJvcHMpLCAvLyB7ezp9fSBlcXVpdmFsZW50IHRvIHt7OiNkYXRhfX1cblx0XHRcdFx0XHRwYXJzZWRQYXJhbShhcmdzIHx8ICh0YWdOYW1lID09PSBcIjpcIiA/IFwiZGF0YSxcIiA6IFwiXCIpLCBwcm9wcywgY3R4UHJvcHMpLFxuXHRcdFx0XHRcdG9uRXJyb3IsXG5cdFx0XHRcdFx0dXNlVHJpZ2dlcixcblx0XHRcdFx0XHRwYXRoQmluZGluZ3MgfHwgMFxuXHRcdFx0XHRdO1xuXHRcdFx0Y29udGVudC5wdXNoKG5ld05vZGUpO1xuXHRcdFx0aWYgKGJsb2NrKSB7XG5cdFx0XHRcdHN0YWNrLnB1c2goY3VycmVudCk7XG5cdFx0XHRcdGN1cnJlbnQgPSBuZXdOb2RlO1xuXHRcdFx0XHRjdXJyZW50WzhdID0gbG9jOyAvLyBTdG9yZSBjdXJyZW50IGxvY2F0aW9uIG9mIG9wZW4gdGFnLCB0byBiZSBhYmxlIHRvIGFkZCBjb250ZW50TWFya3VwIHdoZW4gd2UgcmVhY2ggY2xvc2luZyB0YWdcblx0XHRcdH1cblx0XHR9IGVsc2UgaWYgKGNsb3NlQmxvY2spIHtcblx0XHRcdGJsb2NrVGFnQ2hlY2soY2xvc2VCbG9jayAhPT0gY3VycmVudFswXSAmJiBjdXJyZW50WzBdICE9PSBcImVsc2VcIiAmJiBjbG9zZUJsb2NrLCBjdXJyZW50WzBdKTtcblx0XHRcdGN1cnJlbnRbOF0gPSBtYXJrdXAuc3Vic3RyaW5nKGN1cnJlbnRbOF0sIGluZGV4KTsgLy8gY29udGVudE1hcmt1cCBmb3IgYmxvY2sgdGFnXG5cdFx0XHRjdXJyZW50ID0gc3RhY2sucG9wKCk7XG5cdFx0fVxuXHRcdGJsb2NrVGFnQ2hlY2soIWN1cnJlbnQgJiYgY2xvc2VCbG9jayk7XG5cdFx0Y29udGVudCA9IGN1cnJlbnRbMl07XG5cdH1cblx0Ly89PT09IC9lbmQgb2YgbmVzdGVkIGZ1bmN0aW9ucyA9PT09XG5cblx0dmFyIGksIHJlc3VsdCwgbmV3Tm9kZSwgaGFzSGFuZGxlcnMsIGJpbmRpbmdzLFxuXHRcdGFsbG93Q29kZSA9ICRzdWJTZXR0aW5ncy5hbGxvd0NvZGUgfHwgdG1wbCAmJiB0bXBsLmFsbG93Q29kZVxuXHRcdFx0fHwgJHZpZXdzU2V0dGluZ3MuYWxsb3dDb2RlID09PSB0cnVlLCAvLyBpbmNsdWRlIGRpcmVjdCBzZXR0aW5nIG9mIHNldHRpbmdzLmFsbG93Q29kZSB0cnVlIGZvciBiYWNrd2FyZCBjb21wYXQgb25seVxuXHRcdGFzdFRvcCA9IFtdLFxuXHRcdGxvYyA9IDAsXG5cdFx0c3RhY2sgPSBbXSxcblx0XHRjb250ZW50ID0gYXN0VG9wLFxuXHRcdGN1cnJlbnQgPSBbLCxhc3RUb3BdO1xuXG5cdGlmIChhbGxvd0NvZGUgJiYgdG1wbC5faXMpIHtcblx0XHR0bXBsLmFsbG93Q29kZSA9IGFsbG93Q29kZTtcblx0fVxuXG4vL1RPRE9cdHJlc3VsdCA9IHRtcGxGbnNDYWNoZVttYXJrdXBdOyAvLyBPbmx5IGNhY2hlIGlmIHRlbXBsYXRlIGlzIG5vdCBuYW1lZCBhbmQgbWFya3VwIGxlbmd0aCA8IC4uLixcbi8vYW5kIHRoZXJlIGFyZSBubyBiaW5kaW5ncyBvciBzdWJ0ZW1wbGF0ZXM/PyBDb25zaWRlciBzdGFuZGFyZCBvcHRpbWl6YXRpb24gZm9yIGRhdGEtbGluaz1cImEuYi5jXCJcbi8vXHRcdGlmIChyZXN1bHQpIHtcbi8vXHRcdFx0dG1wbC5mbiA9IHJlc3VsdDtcbi8vXHRcdH0gZWxzZSB7XG5cbi8vXHRcdHJlc3VsdCA9IG1hcmt1cDtcblx0aWYgKGlzTGlua0V4cHIpIHtcblx0XHRpZiAoY29udmVydEJhY2sgIT09IHVuZGVmaW5lZCkge1xuXHRcdFx0bWFya3VwID0gbWFya3VwLnNsaWNlKDAsIC1jb252ZXJ0QmFjay5sZW5ndGggLSAyKSArIGRlbGltQ2xvc2VDaGFyMDtcblx0XHR9XG5cdFx0bWFya3VwID0gZGVsaW1PcGVuQ2hhcjAgKyBtYXJrdXAgKyBkZWxpbUNsb3NlQ2hhcjE7XG5cdH1cblxuXHRibG9ja1RhZ0NoZWNrKHN0YWNrWzBdICYmIHN0YWNrWzBdWzJdLnBvcCgpWzBdKTtcblx0Ly8gQnVpbGQgdGhlIEFTVCAoYWJzdHJhY3Qgc3ludGF4IHRyZWUpIHVuZGVyIGFzdFRvcFxuXHRtYXJrdXAucmVwbGFjZShyVGFnLCBwYXJzZVRhZyk7XG5cblx0cHVzaHByZWNlZGluZ0NvbnRlbnQobWFya3VwLmxlbmd0aCk7XG5cblx0aWYgKGxvYyA9IGFzdFRvcFthc3RUb3AubGVuZ3RoIC0gMV0pIHtcblx0XHRibG9ja1RhZ0NoZWNrKFwiXCIgKyBsb2MgIT09IGxvYyAmJiAoK2xvY1s4XSA9PT0gbG9jWzhdKSAmJiBsb2NbMF0pO1xuXHR9XG4vL1x0XHRcdHJlc3VsdCA9IHRtcGxGbnNDYWNoZVttYXJrdXBdID0gYnVpbGRDb2RlKGFzdFRvcCwgdG1wbCk7XG4vL1x0XHR9XG5cblx0aWYgKGlzTGlua0V4cHIpIHtcblx0XHRyZXN1bHQgPSBidWlsZENvZGUoYXN0VG9wLCBtYXJrdXAsIGlzTGlua0V4cHIpO1xuXHRcdGJpbmRpbmdzID0gW107XG5cdFx0aSA9IGFzdFRvcC5sZW5ndGg7XG5cdFx0d2hpbGUgKGktLSkge1xuXHRcdFx0YmluZGluZ3MudW5zaGlmdChhc3RUb3BbaV1bN10pOyAgLy8gV2l0aCBkYXRhLWxpbmsgZXhwcmVzc2lvbnMsIHBhdGhCaW5kaW5ncyBhcnJheSBmb3IgdGFnQ3R4W2ldIGlzIGFzdFRvcFtpXVs3XVxuXHRcdH1cblx0XHRzZXRQYXRocyhyZXN1bHQsIGJpbmRpbmdzKTtcblx0fSBlbHNlIHtcblx0XHRyZXN1bHQgPSBidWlsZENvZGUoYXN0VG9wLCB0bXBsKTtcblx0fVxuXHRyZXR1cm4gcmVzdWx0O1xufVxuXG5mdW5jdGlvbiBzZXRQYXRocyhmbiwgcGF0aHNBcnIpIHtcblx0dmFyIGtleSwgcGF0aHMsXG5cdFx0aSA9IDAsXG5cdFx0bCA9IHBhdGhzQXJyLmxlbmd0aDtcblx0Zm4uZGVwcyA9IFtdO1xuXHRmb3IgKDsgaSA8IGw7IGkrKykge1xuXHRcdHBhdGhzID0gcGF0aHNBcnJbaV07XG5cdFx0Zm9yIChrZXkgaW4gcGF0aHMpIHtcblx0XHRcdGlmIChrZXkgIT09IFwiX2pzdnRvXCIgJiYgcGF0aHMuaGFzT3duUHJvcGVydHkoa2V5KSAmJiBwYXRoc1trZXldLmxlbmd0aCkge1xuXHRcdFx0XHRmbi5kZXBzID0gZm4uZGVwcy5jb25jYXQocGF0aHNba2V5XSk7IC8vIGRlcHMgaXMgdGhlIGNvbmNhdGVuYXRpb24gb2YgdGhlIHBhdGhzIGFycmF5cyBmb3IgdGhlIGRpZmZlcmVudCBiaW5kaW5nc1xuXHRcdFx0fVxuXHRcdH1cblx0fVxuXHRmbi5wYXRocyA9IHBhdGhzOyAvLyBUaGUgYXJyYXkgb2YgcGF0aHMgYXJyYXlzIGZvciB0aGUgZGlmZmVyZW50IGJpbmRpbmdzXG59XG5cbmZ1bmN0aW9uIHBhcnNlZFBhcmFtKGFyZ3MsIHByb3BzLCBjdHgpIHtcblx0cmV0dXJuIFthcmdzLnNsaWNlKDAsIC0xKSwgcHJvcHMuc2xpY2UoMCwgLTEpLCBjdHguc2xpY2UoMCwgLTEpXTtcbn1cblxuZnVuY3Rpb24gcGFyYW1TdHJ1Y3R1cmUocGFydHMsIHR5cGUpIHtcblx0cmV0dXJuICdcXG5cXHQnXG5cdFx0KyAodHlwZVxuXHRcdFx0PyB0eXBlICsgJzp7J1xuXHRcdFx0OiAnJylcblx0XHQrICdhcmdzOlsnICsgcGFydHNbMF0gKyAnXSdcblx0XHQrIChwYXJ0c1sxXSB8fCAhdHlwZVxuXHRcdFx0PyAnLFxcblxcdHByb3BzOnsnICsgcGFydHNbMV0gKyAnfSdcblx0XHRcdDogXCJcIilcblx0XHQrIChwYXJ0c1syXSA/ICcsXFxuXFx0Y3R4OnsnICsgcGFydHNbMl0gKyAnfScgOiBcIlwiKTtcbn1cblxuZnVuY3Rpb24gcGFyc2VQYXJhbXMocGFyYW1zLCBwYXRoQmluZGluZ3MsIHRtcGwpIHtcblxuXHRmdW5jdGlvbiBwYXJzZVRva2VucyhhbGwsIGxmdFBybjAsIGxmdFBybiwgYm91bmQsIHBhdGgsIG9wZXJhdG9yLCBlcnIsIGVxLCBwYXRoMiwgcHJuLCBjb21tYSwgbGZ0UHJuMiwgYXBvcywgcXVvdCwgcnRQcm4sIHJ0UHJuRG90LCBwcm4yLCBzcGFjZSwgaW5kZXgsIGZ1bGwpIHtcblx0Ly8gLyhcXCgpKD89XFxzKlxcKCl8KD86KFsoW10pXFxzKik/KD86KFxcXj8pKCEqP1sjfl0/W1xcdyQuXl0rKT9cXHMqKChcXCtcXCt8LS0pfFxcK3wtfCYmfFxcfFxcfHw9PT18IT09fD09fCE9fDw9fD49fFs8PiUqOj9cXC9dfCg9KSlcXHMqfCghKj9bI35dP1tcXHckLl5dKykoWyhbXSk/KXwoLFxccyopfChcXCg/KVxcXFw/KD86KCcpfChcIikpfCg/OlxccyooKFspXFxdXSkoPz1cXHMqWy5eXXxcXHMqJHxbXihbXSl8WylcXF1dKShbKFtdPykpfChcXHMrKS9nLFxuXHQvLyAgIGxmdFBybjAgICAgICAgIGxmdFBybiAgICAgICAgYm91bmQgICAgICAgICAgICBwYXRoICAgIG9wZXJhdG9yIGVyciAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGVxICAgICAgICAgICAgIHBhdGgyICAgICAgIHBybiAgICBjb21tYSAgIGxmdFBybjIgICBhcG9zIHF1b3QgICAgICBydFBybiBydFBybkRvdCAgICAgICAgICAgICAgICAgICAgICAgIHBybjIgIHNwYWNlXG5cdFx0Ly8gKGxlZnQgcGFyZW4/IGZvbGxvd2VkIGJ5IChwYXRoPyBmb2xsb3dlZCBieSBvcGVyYXRvcikgb3IgKHBhdGggZm9sbG93ZWQgYnkgcGFyZW4/KSkgb3IgY29tbWEgb3IgYXBvcyBvciBxdW90IG9yIHJpZ2h0IHBhcmVuIG9yIHNwYWNlXG5cdFx0ZnVuY3Rpb24gcGFyc2VQYXRoKGFsbFBhdGgsIG5vdCwgb2JqZWN0LCBoZWxwZXIsIHZpZXcsIHZpZXdQcm9wZXJ0eSwgcGF0aFRva2VucywgbGVhZlRva2VuKSB7XG5cdFx0XHQvL3JQYXRoID0gL14oISo/KSg/Om51bGx8dHJ1ZXxmYWxzZXxcXGRbXFxkLl0qfChbXFx3JF0rfFxcLnx+KFtcXHckXSspfCModmlld3woW1xcdyRdKykpPykoW1xcdyQuXl0qPykoPzpbLlteXShbXFx3JF0rKVxcXT8pPykkL2csXG5cdFx0XHQvLyAgICAgICAgICBub3QgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgb2JqZWN0ICAgICBoZWxwZXIgICAgdmlldyAgdmlld1Byb3BlcnR5IHBhdGhUb2tlbnMgICAgICBsZWFmVG9rZW5cblx0XHRcdHZhciBzdWJQYXRoID0gb2JqZWN0ID09PSBcIi5cIjtcblx0XHRcdGlmIChvYmplY3QpIHtcblx0XHRcdFx0cGF0aCA9IHBhdGguc2xpY2Uobm90Lmxlbmd0aCk7XG5cdFx0XHRcdGlmICgvXlxcLj9jb25zdHJ1Y3RvciQvLnRlc3QobGVhZlRva2VufHxwYXRoKSkge1xuXHRcdFx0XHRcdHN5bnRheEVycm9yKGFsbFBhdGgpO1xuXHRcdFx0XHR9XG5cdFx0XHRcdGlmICghc3ViUGF0aCkge1xuXHRcdFx0XHRcdGFsbFBhdGggPSAoaGVscGVyXG5cdFx0XHRcdFx0XHRcdD8gJ3ZpZXcuaGxwKFwiJyArIGhlbHBlciArICdcIiknXG5cdFx0XHRcdFx0XHRcdDogdmlld1xuXHRcdFx0XHRcdFx0XHRcdD8gXCJ2aWV3XCJcblx0XHRcdFx0XHRcdFx0XHQ6IFwiZGF0YVwiKVxuXHRcdFx0XHRcdFx0KyAobGVhZlRva2VuXG5cdFx0XHRcdFx0XHRcdD8gKHZpZXdQcm9wZXJ0eVxuXHRcdFx0XHRcdFx0XHRcdD8gXCIuXCIgKyB2aWV3UHJvcGVydHlcblx0XHRcdFx0XHRcdFx0XHQ6IGhlbHBlclxuXHRcdFx0XHRcdFx0XHRcdFx0PyBcIlwiXG5cdFx0XHRcdFx0XHRcdFx0XHQ6ICh2aWV3ID8gXCJcIiA6IFwiLlwiICsgb2JqZWN0KVxuXHRcdFx0XHRcdFx0XHRcdCkgKyAocGF0aFRva2VucyB8fCBcIlwiKVxuXHRcdFx0XHRcdFx0XHQ6IChsZWFmVG9rZW4gPSBoZWxwZXIgPyBcIlwiIDogdmlldyA/IHZpZXdQcm9wZXJ0eSB8fCBcIlwiIDogb2JqZWN0LCBcIlwiKSk7XG5cblx0XHRcdFx0XHRhbGxQYXRoID0gYWxsUGF0aCArIChsZWFmVG9rZW4gPyBcIi5cIiArIGxlYWZUb2tlbiA6IFwiXCIpO1xuXG5cdFx0XHRcdFx0YWxsUGF0aCA9IG5vdCArIChhbGxQYXRoLnNsaWNlKDAsIDkpID09PSBcInZpZXcuZGF0YVwiXG5cdFx0XHRcdFx0XHQ/IGFsbFBhdGguc2xpY2UoNSkgLy8gY29udmVydCAjdmlldy5kYXRhLi4uIHRvIGRhdGEuLi5cblx0XHRcdFx0XHRcdDogYWxsUGF0aCk7XG5cdFx0XHRcdH1cblx0XHRcdFx0aWYgKGJpbmRpbmdzKSB7XG5cdFx0XHRcdFx0YmluZHMgPSBuYW1lZCA9PT0gXCJsaW5rVG9cIiA/IChiaW5kdG8gPSBwYXRoQmluZGluZ3MuX2pzdnRvID0gcGF0aEJpbmRpbmdzLl9qc3Z0byB8fCBbXSkgOiBibmRDdHguYmQ7XG5cdFx0XHRcdFx0aWYgKHRoZU9iID0gc3ViUGF0aCAmJiBiaW5kc1tiaW5kcy5sZW5ndGgtMV0pIHtcblx0XHRcdFx0XHRcdGlmICh0aGVPYi5fanN2KSB7XG5cdFx0XHRcdFx0XHRcdHdoaWxlICh0aGVPYi5zYikge1xuXHRcdFx0XHRcdFx0XHRcdHRoZU9iID0gdGhlT2Iuc2I7XG5cdFx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHRcdFx0aWYgKHRoZU9iLmJuZCkge1xuXHRcdFx0XHRcdFx0XHRcdHBhdGggPSBcIl5cIiArIHBhdGguc2xpY2UoMSk7XG5cdFx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHRcdFx0dGhlT2Iuc2IgPSBwYXRoO1xuXHRcdFx0XHRcdFx0XHR0aGVPYi5ibmQgPSB0aGVPYi5ibmQgfHwgcGF0aC5jaGFyQXQoMCkgPT09IFwiXlwiO1xuXHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdFx0XHRiaW5kcy5wdXNoKHBhdGgpO1xuXHRcdFx0XHRcdH1cblx0XHRcdFx0XHRwYXRoU3RhcnRbcGFyZW5EZXB0aF0gPSBpbmRleCArIChzdWJQYXRoID8gMSA6IDApO1xuXHRcdFx0XHR9XG5cdFx0XHR9XG5cdFx0XHRyZXR1cm4gYWxsUGF0aDtcblx0XHR9XG5cblx0XHQvL2JvdW5kID0gYmluZGluZ3MgJiYgYm91bmQ7XG5cdFx0aWYgKGJvdW5kICYmICFlcSkge1xuXHRcdFx0cGF0aCA9IGJvdW5kICsgcGF0aDsgLy8gZS5nLiBzb21lLmZuKC4uLilec29tZS5wYXRoIC0gc28gaGVyZSBwYXRoIGlzIFwiXnNvbWUucGF0aFwiXG5cdFx0fVxuXHRcdG9wZXJhdG9yID0gb3BlcmF0b3IgfHwgXCJcIjtcblx0XHRsZnRQcm4gPSBsZnRQcm4gfHwgbGZ0UHJuMCB8fCBsZnRQcm4yO1xuXHRcdHBhdGggPSBwYXRoIHx8IHBhdGgyO1xuXHRcdC8vIENvdWxkIGRvIHRoaXMgLSBidXQgbm90IHdvcnRoIHBlcmYgY29zdD8/IDotXG5cdFx0Ly8gaWYgKCFwYXRoLmxhc3RJbmRleE9mKFwiI2RhdGEuXCIsIDApKSB7IHBhdGggPSBwYXRoLnNsaWNlKDYpOyB9IC8vIElmIHBhdGggc3RhcnRzIHdpdGggXCIjZGF0YS5cIiwgcmVtb3ZlIHRoYXQuXG5cdFx0cHJuID0gcHJuIHx8IHBybjIgfHwgXCJcIjtcblxuXHRcdHZhciBleHByLCBleHByRm4sIGJpbmRzLCB0aGVPYiwgbmV3T2IsXG5cdFx0XHRydFNxID0gXCIpXCI7XG5cblx0XHRpZiAocHJuID09PSBcIltcIikge1xuXHRcdFx0cHJuICA9XCJbai5fc3EoXCI7XG5cdFx0XHRydFNxID0gXCIpXVwiO1xuXHRcdH1cblxuXHRcdGlmIChlcnIgJiYgIWFwb3NlZCAmJiAhcXVvdGVkKSB7XG5cdFx0XHRzeW50YXhFcnJvcihwYXJhbXMpO1xuXHRcdH0gZWxzZSB7XG5cdFx0XHRpZiAoYmluZGluZ3MgJiYgcnRQcm5Eb3QgJiYgIWFwb3NlZCAmJiAhcXVvdGVkKSB7XG5cdFx0XHRcdC8vIFRoaXMgaXMgYSBiaW5kaW5nIHRvIGEgcGF0aCBpbiB3aGljaCBhbiBvYmplY3QgaXMgcmV0dXJuZWQgYnkgYSBoZWxwZXIvZGF0YSBmdW5jdGlvbi9leHByZXNzaW9uLCBlLmcuIGZvbygpXngueSBvciAoYT9iOmMpXngueVxuXHRcdFx0XHQvLyBXZSBjcmVhdGUgYSBjb21waWxlZCBmdW5jdGlvbiB0byBnZXQgdGhlIG9iamVjdCBpbnN0YW5jZSAod2hpY2ggd2lsbCBiZSBjYWxsZWQgd2hlbiB0aGUgZGVwZW5kZW50IGRhdGEgb2YgdGhlIHN1YmV4cHJlc3Npb24gY2hhbmdlcywgdG8gcmV0dXJuIHRoZSBuZXcgb2JqZWN0LCBhbmQgdHJpZ2dlciByZS1iaW5kaW5nIG9mIHRoZSBzdWJzZXF1ZW50IHBhdGgpXG5cdFx0XHRcdGlmICghbmFtZWQgfHwgYm91bmROYW1lIHx8IGJpbmR0bykge1xuXHRcdFx0XHRcdGV4cHIgPSBwYXRoU3RhcnRbcGFyZW5EZXB0aCAtIDFdO1xuXHRcdFx0XHRcdGlmIChmdWxsLmxlbmd0aCAtIDEgPiBpbmRleCAtIChleHByIHx8IDApKSB7IC8vIFdlIG5lZWQgdG8gY29tcGlsZSBhIHN1YmV4cHJlc3Npb25cblx0XHRcdFx0XHRcdGV4cHIgPSBmdWxsLnNsaWNlKGV4cHIsIGluZGV4ICsgYWxsLmxlbmd0aCk7XG5cdFx0XHRcdFx0XHRpZiAoZXhwckZuICE9PSB0cnVlKSB7IC8vIElmIG5vdCByZWVudHJhbnQgY2FsbCBkdXJpbmcgY29tcGlsYXRpb25cblx0XHRcdFx0XHRcdFx0YmluZHMgPSBiaW5kdG8gfHwgYm5kU3RhY2tbcGFyZW5EZXB0aC0xXS5iZDtcblx0XHRcdFx0XHRcdFx0Ly8gSW5zZXJ0IGV4cHJPYiBvYmplY3QsIHRvIGJlIHVzZWQgZHVyaW5nIGJpbmRpbmcgdG8gcmV0dXJuIHRoZSBjb21wdXRlZCBvYmplY3Rcblx0XHRcdFx0XHRcdFx0dGhlT2IgPSBiaW5kc1tiaW5kcy5sZW5ndGgtMV07XG5cdFx0XHRcdFx0XHRcdGlmICh0aGVPYiAmJiB0aGVPYi5wcm0pIHtcblx0XHRcdFx0XHRcdFx0XHR3aGlsZSAodGhlT2Iuc2IgJiYgdGhlT2Iuc2IucHJtKSB7XG5cdFx0XHRcdFx0XHRcdFx0XHR0aGVPYiA9IHRoZU9iLnNiO1xuXHRcdFx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHRcdFx0XHRuZXdPYiA9IHRoZU9iLnNiID0ge3BhdGg6IHRoZU9iLnNiLCBibmQ6IHRoZU9iLmJuZH07XG5cdFx0XHRcdFx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdFx0XHRcdFx0YmluZHMucHVzaChuZXdPYiA9IHtwYXRoOiBiaW5kcy5wb3AoKX0pOyAvLyBJbnNlcnQgZXhwck9iIG9iamVjdCwgdG8gYmUgdXNlZCBkdXJpbmcgYmluZGluZyB0byByZXR1cm4gdGhlIGNvbXB1dGVkIG9iamVjdFxuXHRcdFx0XHRcdFx0XHR9XHRcdFx0XHRcdFx0XHRcdFx0XHRcdCAvLyAoZS5nLiBcInNvbWUub2JqZWN0KClcIiBpbiBcInNvbWUub2JqZWN0KCkuYS5iXCIgLSB0byBiZSB1c2VkIGFzIGNvbnRleHQgZm9yIGJpbmRpbmcgdGhlIGZvbGxvd2luZyB0b2tlbnMgXCJhLmJcIilcblx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHRcdHJ0UHJuRG90ID0gZGVsaW1PcGVuQ2hhcjEgKyBcIjpcIiArIGV4cHIgLy8gVGhlIHBhcmFtZXRlciBvciBmdW5jdGlvbiBzdWJleHByZXNzaW9uXG5cdFx0XHRcdFx0XHRcdCsgXCIgb25lcnJvcj0nJ1wiIC8vIHNldCBvbmVycm9yPScnIGluIG9yZGVyIHRvIHdyYXAgZ2VuZXJhdGVkIGNvZGUgd2l0aCBhIHRyeSBjYXRjaCAtIHJldHVybmluZyAnJyBhcyBvYmplY3QgaW5zdGFuY2UgaWYgdGhlcmUgaXMgYW4gZXJyb3IvbWlzc2luZyBwYXJlbnRcblx0XHRcdFx0XHRcdFx0KyBkZWxpbUNsb3NlQ2hhcjA7XG5cdFx0XHRcdFx0XHRleHByRm4gPSB0bXBsTGlua3NbcnRQcm5Eb3RdO1xuXHRcdFx0XHRcdFx0aWYgKCFleHByRm4pIHtcblx0XHRcdFx0XHRcdFx0dG1wbExpbmtzW3J0UHJuRG90XSA9IHRydWU7IC8vIEZsYWcgdGhhdCB0aGlzIGV4cHJGbiAoZm9yIHJ0UHJuRG90KSBpcyBiZWluZyBjb21waWxlZFxuXHRcdFx0XHRcdFx0XHR0bXBsTGlua3NbcnRQcm5Eb3RdID0gZXhwckZuID0gdG1wbEZuKHJ0UHJuRG90LCB0bXBsLCB0cnVlKTsgLy8gQ29tcGlsZSB0aGUgZXhwcmVzc2lvbiAob3IgdXNlIGNhY2hlZCBjb3B5IGFscmVhZHkgaW4gdG1wbC5saW5rcylcblx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHRcdGlmIChleHByRm4gIT09IHRydWUgJiYgbmV3T2IpIHtcblx0XHRcdFx0XHRcdFx0Ly8gSWYgbm90IHJlZW50cmFudCBjYWxsIGR1cmluZyBjb21waWxhdGlvblxuXHRcdFx0XHRcdFx0XHRuZXdPYi5fanN2ID0gZXhwckZuO1xuXHRcdFx0XHRcdFx0XHRuZXdPYi5wcm0gPSBibmRDdHguYmQ7XG5cdFx0XHRcdFx0XHRcdG5ld09iLmJuZCA9IG5ld09iLmJuZCB8fCBuZXdPYi5wYXRoICYmIG5ld09iLnBhdGguaW5kZXhPZihcIl5cIikgPj0gMDtcblx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHR9XG5cdFx0XHRcdH1cblx0XHRcdH1cblx0XHRcdHJldHVybiAoYXBvc2VkXG5cdFx0XHRcdC8vIHdpdGhpbiBzaW5nbGUtcXVvdGVkIHN0cmluZ1xuXHRcdFx0XHQ/IChhcG9zZWQgPSAhYXBvcywgKGFwb3NlZCA/IGFsbCA6IGxmdFBybjIgKyAnXCInKSlcblx0XHRcdFx0OiBxdW90ZWRcblx0XHRcdFx0Ly8gd2l0aGluIGRvdWJsZS1xdW90ZWQgc3RyaW5nXG5cdFx0XHRcdFx0PyAocXVvdGVkID0gIXF1b3QsIChxdW90ZWQgPyBhbGwgOiBsZnRQcm4yICsgJ1wiJykpXG5cdFx0XHRcdFx0OlxuXHRcdFx0XHQoXG5cdFx0XHRcdFx0KGxmdFByblxuXHRcdFx0XHRcdFx0PyAocGF0aFN0YXJ0W3BhcmVuRGVwdGhdID0gaW5kZXgrKywgYm5kQ3R4ID0gYm5kU3RhY2tbKytwYXJlbkRlcHRoXSA9IHtiZDogW119LCBsZnRQcm4pXG5cdFx0XHRcdFx0XHQ6IFwiXCIpXG5cdFx0XHRcdFx0KyAoc3BhY2Vcblx0XHRcdFx0XHRcdD8gKHBhcmVuRGVwdGhcblx0XHRcdFx0XHRcdFx0PyBcIlwiXG5cdFx0XHRcdC8vIE5ldyBhcmcgb3IgcHJvcCAtIHNvIGluc2VydCBiYWNrc3BhY2UgXFxiIChcXHgwOCkgYXMgc2VwYXJhdG9yIGZvciBuYW1lZCBwYXJhbXMsIHVzZWQgc3Vic2VxdWVudGx5IGJ5IHJCdWlsZEhhc2gsIGFuZCBwcmVwYXJlIG5ldyBiaW5kaW5ncyBhcnJheVxuXHRcdFx0XHRcdFx0XHQ6IChwYXJhbUluZGV4ID0gZnVsbC5zbGljZShwYXJhbUluZGV4LCBpbmRleCksIG5hbWVkXG5cdFx0XHRcdFx0XHRcdFx0PyAobmFtZWQgPSBib3VuZE5hbWUgPSBiaW5kdG8gPSBmYWxzZSwgXCJcXGJcIilcblx0XHRcdFx0XHRcdFx0XHQ6IFwiXFxiLFwiKSArIHBhcmFtSW5kZXggKyAocGFyYW1JbmRleCA9IGluZGV4ICsgYWxsLmxlbmd0aCwgYmluZGluZ3MgJiYgcGF0aEJpbmRpbmdzLnB1c2goYm5kQ3R4LmJkID0gW10pLCBcIlxcYlwiKVxuXHRcdFx0XHRcdFx0KVxuXHRcdFx0XHRcdFx0OiBlcVxuXHRcdFx0XHQvLyBuYW1lZCBwYXJhbS4gUmVtb3ZlIGJpbmRpbmdzIGZvciBhcmcgYW5kIGNyZWF0ZSBpbnN0ZWFkIGJpbmRpbmdzIGFycmF5IGZvciBwcm9wXG5cdFx0XHRcdFx0XHRcdD8gKHBhcmVuRGVwdGggJiYgc3ludGF4RXJyb3IocGFyYW1zKSwgYmluZGluZ3MgJiYgcGF0aEJpbmRpbmdzLnBvcCgpLCBuYW1lZCA9IHBhdGgsIGJvdW5kTmFtZSA9IGJvdW5kLCBwYXJhbUluZGV4ID0gaW5kZXggKyBhbGwubGVuZ3RoLCBib3VuZCAmJiAoYmluZGluZ3MgPSBibmRDdHguYmQgPSBwYXRoQmluZGluZ3NbbmFtZWRdID0gW10pLCBwYXRoICsgJzonKVxuXHRcdFx0XHRcdFx0XHQ6IHBhdGhcblx0XHRcdFx0Ly8gcGF0aFxuXHRcdFx0XHRcdFx0XHRcdD8gKHBhdGguc3BsaXQoXCJeXCIpLmpvaW4oXCIuXCIpLnJlcGxhY2UoclBhdGgsIHBhcnNlUGF0aClcblx0XHRcdFx0XHRcdFx0XHRcdCsgKHByblxuXHRcdFx0XHQvLyBzb21lLmZuY2FsbChcblx0XHRcdFx0XHRcdFx0XHRcdFx0PyAoYm5kQ3R4ID0gYm5kU3RhY2tbKytwYXJlbkRlcHRoXSA9IHtiZDogW119LCBmbkNhbGxbcGFyZW5EZXB0aF0gPSBydFNxLCBwcm4pXG5cdFx0XHRcdFx0XHRcdFx0XHRcdDogb3BlcmF0b3IpXG5cdFx0XHRcdFx0XHRcdFx0KVxuXHRcdFx0XHRcdFx0XHRcdDogb3BlcmF0b3Jcblx0XHRcdFx0Ly8gb3BlcmF0b3Jcblx0XHRcdFx0XHRcdFx0XHRcdD8gb3BlcmF0b3Jcblx0XHRcdFx0XHRcdFx0XHRcdDogcnRQcm5cblx0XHRcdFx0Ly8gZnVuY3Rpb25cblx0XHRcdFx0XHRcdFx0XHRcdFx0PyAoKHJ0UHJuID0gZm5DYWxsW3BhcmVuRGVwdGhdIHx8IHJ0UHJuLCBmbkNhbGxbcGFyZW5EZXB0aF0gPSBmYWxzZSwgYm5kQ3R4ID0gYm5kU3RhY2tbLS1wYXJlbkRlcHRoXSwgcnRQcm4pXG5cdFx0XHRcdFx0XHRcdFx0XHRcdFx0KyAocHJuIC8vIHJ0UHJuIGFuZCBwcm4sIGUuZyApKCBpbiAoYSkoKSBvciBhKCkoKSwgb3IgKVsgaW4gYSgpW11cblx0XHRcdFx0XHRcdFx0XHRcdFx0XHRcdD8gKGJuZEN0eCA9IGJuZFN0YWNrWysrcGFyZW5EZXB0aF0sIGZuQ2FsbFtwYXJlbkRlcHRoXSA9IHJ0U3EsIHBybilcblx0XHRcdFx0XHRcdFx0XHRcdFx0XHRcdDogXCJcIilcblx0XHRcdFx0XHRcdFx0XHRcdFx0KVxuXHRcdFx0XHRcdFx0XHRcdFx0XHQ6IGNvbW1hXG5cdFx0XHRcdFx0XHRcdFx0XHRcdFx0PyAoZm5DYWxsW3BhcmVuRGVwdGhdIHx8IHN5bnRheEVycm9yKHBhcmFtcyksIFwiLFwiKSAvLyBXZSBkb24ndCBhbGxvdyB0b3AtbGV2ZWwgbGl0ZXJhbCBhcnJheXMgb3Igb2JqZWN0c1xuXHRcdFx0XHRcdFx0XHRcdFx0XHRcdDogbGZ0UHJuMFxuXHRcdFx0XHRcdFx0XHRcdFx0XHRcdFx0PyBcIlwiXG5cdFx0XHRcdFx0XHRcdFx0XHRcdFx0XHQ6IChhcG9zZWQgPSBhcG9zLCBxdW90ZWQgPSBxdW90LCAnXCInKVxuXHRcdFx0XHQpKVxuXHRcdFx0KTtcblx0XHR9XG5cdH1cblxuXHR2YXIgbmFtZWQsIGJpbmR0bywgYm91bmROYW1lLFxuXHRcdHF1b3RlZCwgLy8gYm9vbGVhbiBmb3Igc3RyaW5nIGNvbnRlbnQgaW4gZG91YmxlIHF1b3Rlc1xuXHRcdGFwb3NlZCwgLy8gb3IgaW4gc2luZ2xlIHF1b3Rlc1xuXHRcdGJpbmRpbmdzID0gcGF0aEJpbmRpbmdzICYmIHBhdGhCaW5kaW5nc1swXSwgLy8gYmluZGluZ3MgYXJyYXkgZm9yIHRoZSBmaXJzdCBhcmdcblx0XHRibmRDdHggPSB7YmQ6IGJpbmRpbmdzfSxcblx0XHRibmRTdGFjayA9IHswOiBibmRDdHh9LFxuXHRcdHBhcmFtSW5kZXggPSAwLCAvLyBsaXN0LFxuXHRcdHRtcGxMaW5rcyA9ICh0bXBsID8gdG1wbC5saW5rcyA6IGJpbmRpbmdzICYmIChiaW5kaW5ncy5saW5rcyA9IGJpbmRpbmdzLmxpbmtzIHx8IHt9KSkgfHwgdG9wVmlldy50bXBsLmxpbmtzLFxuXHRcdC8vIFRoZSBmb2xsb3dpbmcgYXJlIHVzZWQgZm9yIHRyYWNraW5nIHBhdGggcGFyc2luZyBpbmNsdWRpbmcgbmVzdGVkIHBhdGhzLCBzdWNoIGFzIFwiYS5iKGNeZCArIChlKSleZlwiLCBhbmQgY2hhaW5lZCBjb21wdXRlZCBwYXRocyBzdWNoIGFzXG5cdFx0Ly8gXCJhLmIoKS5jXmQoKS5lLmYoKS5nXCIgLSB3aGljaCBoYXMgZm91ciBjaGFpbmVkIHBhdGhzLCBcImEuYigpXCIsIFwiXmMuZCgpXCIsIFwiLmUuZigpXCIgYW5kIFwiLmdcIlxuXHRcdHBhcmVuRGVwdGggPSAwLFxuXHRcdGZuQ2FsbCA9IHt9LCAvLyBXZSBhcmUgaW4gYSBmdW5jdGlvbiBjYWxsXG5cdFx0cGF0aFN0YXJ0ID0ge30sIC8vIHRyYWNrcyB0aGUgc3RhcnQgb2YgdGhlIGN1cnJlbnQgcGF0aCBzdWNoIGFzIGNeZCgpIGluIHRoZSBhYm92ZSBleGFtcGxlXG5cdFx0cmVzdWx0ID0gKHBhcmFtcyArICh0bXBsID8gXCIgXCIgOiBcIlwiKSkucmVwbGFjZShyUGFyYW1zLCBwYXJzZVRva2Vucyk7XG5cblx0cmV0dXJuICFwYXJlbkRlcHRoICYmIHJlc3VsdCB8fCBzeW50YXhFcnJvcihwYXJhbXMpOyAvLyBTeW50YXggZXJyb3IgaWYgdW5iYWxhbmNlZCBwYXJlbnMgaW4gcGFyYW1zIGV4cHJlc3Npb25cbn1cblxuZnVuY3Rpb24gYnVpbGRDb2RlKGFzdCwgdG1wbCwgaXNMaW5rRXhwcikge1xuXHQvLyBCdWlsZCB0aGUgdGVtcGxhdGUgZnVuY3Rpb24gY29kZSBmcm9tIHRoZSBBU1Qgbm9kZXMsIGFuZCBzZXQgYXMgcHJvcGVydHkgb24gdGhlIHBhc3NlZC1pbiB0ZW1wbGF0ZSBvYmplY3Rcblx0Ly8gVXNlZCBmb3IgY29tcGlsaW5nIHRlbXBsYXRlcywgYW5kIGFsc28gYnkgSnNWaWV3cyB0byBidWlsZCBmdW5jdGlvbnMgZm9yIGRhdGEgbGluayBleHByZXNzaW9uc1xuXHR2YXIgaSwgbm9kZSwgdGFnTmFtZSwgY29udmVydGVyLCB0YWdDdHgsIGhhc1RhZywgaGFzRW5jb2RlciwgZ2V0c1ZhbCwgaGFzQ252dCwgdXNlQ252dCwgdG1wbEJpbmRpbmdzLCBwYXRoQmluZGluZ3MsIHBhcmFtcywgYm91bmRPbkVyclN0YXJ0LCBib3VuZE9uRXJyRW5kLFxuXHRcdHRhZ1JlbmRlciwgbmVzdGVkVG1wbHMsIHRtcGxOYW1lLCBuZXN0ZWRUbXBsLCB0YWdBbmRFbHNlcywgY29udGVudCwgbWFya3VwLCBuZXh0SXNFbHNlLCBvbGRDb2RlLCBpc0Vsc2UsIGlzR2V0VmFsLCB0YWdDdHhGbiwgb25FcnJvciwgdGFnU3RhcnQsIHRyaWdnZXIsXG5cdFx0dG1wbEJpbmRpbmdLZXkgPSAwLFxuXHRcdHVzZVZpZXdzID0gJHN1YlNldHRpbmdzQWR2YW5jZWQudXNlVmlld3MgfHwgdG1wbC51c2VWaWV3cyB8fCB0bXBsLnRhZ3MgfHwgdG1wbC50ZW1wbGF0ZXMgfHwgdG1wbC5oZWxwZXJzIHx8IHRtcGwuY29udmVydGVycyxcblx0XHRjb2RlID0gXCJcIixcblx0XHR0bXBsT3B0aW9ucyA9IHt9LFxuXHRcdGwgPSBhc3QubGVuZ3RoO1xuXG5cdGlmIChcIlwiICsgdG1wbCA9PT0gdG1wbCkge1xuXHRcdHRtcGxOYW1lID0gaXNMaW5rRXhwciA/ICdkYXRhLWxpbms9XCInICsgdG1wbC5yZXBsYWNlKHJOZXdMaW5lLCBcIiBcIikuc2xpY2UoMSwgLTEpICsgJ1wiJyA6IHRtcGw7XG5cdFx0dG1wbCA9IDA7XG5cdH0gZWxzZSB7XG5cdFx0dG1wbE5hbWUgPSB0bXBsLnRtcGxOYW1lIHx8IFwidW5uYW1lZFwiO1xuXHRcdGlmICh0bXBsLmFsbG93Q29kZSkge1xuXHRcdFx0dG1wbE9wdGlvbnMuYWxsb3dDb2RlID0gdHJ1ZTtcblx0XHR9XG5cdFx0aWYgKHRtcGwuZGVidWcpIHtcblx0XHRcdHRtcGxPcHRpb25zLmRlYnVnID0gdHJ1ZTtcblx0XHR9XG5cdFx0dG1wbEJpbmRpbmdzID0gdG1wbC5ibmRzO1xuXHRcdG5lc3RlZFRtcGxzID0gdG1wbC50bXBscztcblx0fVxuXHRmb3IgKGkgPSAwOyBpIDwgbDsgaSsrKSB7XG5cdFx0Ly8gQVNUIG5vZGVzOiBbMDogdGFnTmFtZSwgMTogY29udmVydGVyLCAyOiBjb250ZW50LCAzOiBwYXJhbXMsIDQ6IGNvZGUsIDU6IG9uRXJyb3IsIDY6IHRyaWdnZXIsIDc6cGF0aEJpbmRpbmdzLCA4OiBjb250ZW50TWFya3VwXVxuXHRcdG5vZGUgPSBhc3RbaV07XG5cblx0XHQvLyBBZGQgbmV3bGluZSBmb3IgZWFjaCBjYWxsb3V0IHRvIHQoKSBjKCkgZXRjLiBhbmQgZWFjaCBtYXJrdXAgc3RyaW5nXG5cdFx0aWYgKFwiXCIgKyBub2RlID09PSBub2RlKSB7XG5cdFx0XHQvLyBhIG1hcmt1cCBzdHJpbmcgdG8gYmUgaW5zZXJ0ZWRcblx0XHRcdGNvZGUgKz0gJ1xcbitcIicgKyBub2RlICsgJ1wiJztcblx0XHR9IGVsc2Uge1xuXHRcdFx0Ly8gYSBjb21waWxlZCB0YWcgZXhwcmVzc2lvbiB0byBiZSBpbnNlcnRlZFxuXHRcdFx0dGFnTmFtZSA9IG5vZGVbMF07XG5cdFx0XHRpZiAodGFnTmFtZSA9PT0gXCIqXCIpIHtcblx0XHRcdFx0Ly8gQ29kZSB0YWc6IHt7KiB9fVxuXHRcdFx0XHRjb2RlICs9IFwiO1xcblwiICsgbm9kZVsxXSArIFwiXFxucmV0PXJldFwiO1xuXHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0Y29udmVydGVyID0gbm9kZVsxXTtcblx0XHRcdFx0Y29udGVudCA9ICFpc0xpbmtFeHByICYmIG5vZGVbMl07XG5cdFx0XHRcdHRhZ0N0eCA9IHBhcmFtU3RydWN0dXJlKG5vZGVbM10sICdwYXJhbXMnKSArICd9LCcgKyBwYXJhbVN0cnVjdHVyZShwYXJhbXMgPSBub2RlWzRdKTtcblx0XHRcdFx0b25FcnJvciA9IG5vZGVbNV07XG5cdFx0XHRcdHRyaWdnZXIgPSBub2RlWzZdO1xuXHRcdFx0XHRtYXJrdXAgPSBub2RlWzhdICYmIG5vZGVbOF0ucmVwbGFjZShyVW5lc2NhcGVRdW90ZXMsIFwiJDFcIik7XG5cdFx0XHRcdGlmIChpc0Vsc2UgPSB0YWdOYW1lID09PSBcImVsc2VcIikge1xuXHRcdFx0XHRcdGlmIChwYXRoQmluZGluZ3MpIHtcblx0XHRcdFx0XHRcdHBhdGhCaW5kaW5ncy5wdXNoKG5vZGVbN10pO1xuXHRcdFx0XHRcdH1cblx0XHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0XHR0bXBsQmluZGluZ0tleSA9IDA7XG5cdFx0XHRcdFx0aWYgKHRtcGxCaW5kaW5ncyAmJiAocGF0aEJpbmRpbmdzID0gbm9kZVs3XSkpIHsgLy8gQXJyYXkgb2YgcGF0aHMsIG9yIGZhbHNlIGlmIG5vdCBkYXRhLWJvdW5kXG5cdFx0XHRcdFx0XHRwYXRoQmluZGluZ3MgPSBbcGF0aEJpbmRpbmdzXTtcblx0XHRcdFx0XHRcdHRtcGxCaW5kaW5nS2V5ID0gdG1wbEJpbmRpbmdzLnB1c2goMSk7IC8vIEFkZCBwbGFjZWhvbGRlciBpbiB0bXBsQmluZGluZ3MgZm9yIGNvbXBpbGVkIGZ1bmN0aW9uXG5cdFx0XHRcdFx0fVxuXHRcdFx0XHR9XG5cdFx0XHRcdHVzZVZpZXdzID0gdXNlVmlld3MgfHwgcGFyYW1zWzFdIHx8IHBhcmFtc1syXSB8fCBwYXRoQmluZGluZ3MgfHwgL3ZpZXcuKD8haW5kZXgpLy50ZXN0KHBhcmFtc1swXSk7XG5cdFx0XHRcdC8vIHVzZVZpZXdzIGlzIGZvciBwZXJmIG9wdGltaXphdGlvbi4gRm9yIHJlbmRlcigpIHdlIG9ubHkgdXNlIHZpZXdzIGlmIG5lY2Vzc2FyeSAtIGZvciB0aGUgbW9yZSBhZHZhbmNlZCBzY2VuYXJpb3MuXG5cdFx0XHRcdC8vIFdlIHVzZSB2aWV3cyBpZiB0aGVyZSBhcmUgcHJvcHMsIGNvbnRleHR1YWwgcHJvcGVydGllcyBvciBhcmdzIHdpdGggIy4uLiAob3RoZXIgdGhhbiAjaW5kZXgpIC0gYnV0IHlvdSBjYW4gZm9yY2Vcblx0XHRcdFx0Ly8gdXNpbmcgdGhlIGZ1bGwgdmlldyBpbmZyYXN0cnVjdHVyZSwgKGFuZCBwYXkgYSBwZXJmIHByaWNlKSBieSBvcHRpbmcgaW46IFNldCB1c2VWaWV3czogdHJ1ZSBvbiB0aGUgdGVtcGxhdGUsIG1hbnVhbGx5Li4uXG5cdFx0XHRcdGlmIChpc0dldFZhbCA9IHRhZ05hbWUgPT09IFwiOlwiKSB7XG5cdFx0XHRcdFx0aWYgKGNvbnZlcnRlcikge1xuXHRcdFx0XHRcdFx0dGFnTmFtZSA9IGNvbnZlcnRlciA9PT0gSFRNTCA/IFwiPlwiIDogY29udmVydGVyICsgdGFnTmFtZTtcblx0XHRcdFx0XHR9XG5cdFx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdFx0aWYgKGNvbnRlbnQpIHsgLy8gVE9ETyBvcHRpbWl6ZSAtIGlmIGNvbnRlbnQubGVuZ3RoID09PSAwIG9yIGlmIHRoZXJlIGlzIGEgdG1wbD1cIi4uLlwiIHNwZWNpZmllZCAtIHNldCBjb250ZW50IHRvIG51bGwgLyBkb24ndCBydW4gdGhpcyBjb21waWxhdGlvbiBjb2RlIC0gc2luY2UgY29udGVudCB3b24ndCBnZXQgdXNlZCEhXG5cdFx0XHRcdFx0XHQvLyBDcmVhdGUgdGVtcGxhdGUgb2JqZWN0IGZvciBuZXN0ZWQgdGVtcGxhdGVcblx0XHRcdFx0XHRcdG5lc3RlZFRtcGwgPSB0bXBsT2JqZWN0KG1hcmt1cCwgdG1wbE9wdGlvbnMpO1xuXHRcdFx0XHRcdFx0bmVzdGVkVG1wbC50bXBsTmFtZSA9IHRtcGxOYW1lICsgXCIvXCIgKyB0YWdOYW1lO1xuXHRcdFx0XHRcdFx0Ly8gQ29tcGlsZSB0byBBU1QgYW5kIHRoZW4gdG8gY29tcGlsZWQgZnVuY3Rpb25cblx0XHRcdFx0XHRcdG5lc3RlZFRtcGwudXNlVmlld3MgPSBuZXN0ZWRUbXBsLnVzZVZpZXdzIHx8IHVzZVZpZXdzO1xuXHRcdFx0XHRcdFx0YnVpbGRDb2RlKGNvbnRlbnQsIG5lc3RlZFRtcGwpO1xuXHRcdFx0XHRcdFx0dXNlVmlld3MgPSBuZXN0ZWRUbXBsLnVzZVZpZXdzO1xuXHRcdFx0XHRcdFx0bmVzdGVkVG1wbHMucHVzaChuZXN0ZWRUbXBsKTtcblx0XHRcdFx0XHR9XG5cblx0XHRcdFx0XHRpZiAoIWlzRWxzZSkge1xuXHRcdFx0XHRcdFx0Ly8gVGhpcyBpcyBub3QgYW4gZWxzZSB0YWcuXG5cdFx0XHRcdFx0XHR0YWdBbmRFbHNlcyA9IHRhZ05hbWU7XG5cdFx0XHRcdFx0XHR1c2VWaWV3cyA9IHVzZVZpZXdzIHx8IHRhZ05hbWUgJiYgKCEkdGFnc1t0YWdOYW1lXSB8fCAhJHRhZ3NbdGFnTmFtZV0uZmxvdyk7XG5cdFx0XHRcdFx0XHQvLyBTd2l0Y2ggdG8gYSBuZXcgY29kZSBzdHJpbmcgZm9yIHRoaXMgYm91bmQgdGFnIChhbmQgaXRzIGVsc2VzLCBpZiBpdCBoYXMgYW55KSAtIGZvciByZXR1cm5pbmcgdGhlIHRhZ0N0eHMgYXJyYXlcblx0XHRcdFx0XHRcdG9sZENvZGUgPSBjb2RlO1xuXHRcdFx0XHRcdFx0Y29kZSA9IFwiXCI7XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHRcdG5leHRJc0Vsc2UgPSBhc3RbaSArIDFdO1xuXHRcdFx0XHRcdG5leHRJc0Vsc2UgPSBuZXh0SXNFbHNlICYmIG5leHRJc0Vsc2VbMF0gPT09IFwiZWxzZVwiO1xuXHRcdFx0XHR9XG5cdFx0XHRcdHRhZ1N0YXJ0ID0gb25FcnJvciA/IFwiO1xcbnRyeXtcXG5yZXQrPVwiIDogXCJcXG4rXCI7XG5cdFx0XHRcdGJvdW5kT25FcnJTdGFydCA9IFwiXCI7XG5cdFx0XHRcdGJvdW5kT25FcnJFbmQgPSBcIlwiO1xuXG5cdFx0XHRcdGlmIChpc0dldFZhbCAmJiAocGF0aEJpbmRpbmdzIHx8IHRyaWdnZXIgfHwgY29udmVydGVyICYmIGNvbnZlcnRlciAhPT0gSFRNTCkpIHtcblx0XHRcdFx0XHQvLyBGb3IgY29udmVydFZhbCB3ZSBuZWVkIGEgY29tcGlsZWQgZnVuY3Rpb24gdG8gcmV0dXJuIHRoZSBuZXcgdGFnQ3R4KHMpXG5cdFx0XHRcdFx0dGFnQ3R4Rm4gPSBuZXcgRnVuY3Rpb24oXCJkYXRhLHZpZXcsaix1XCIsIFwiIC8vIFwiICsgdG1wbE5hbWUgKyBcIiBcIiArIHRtcGxCaW5kaW5nS2V5ICsgXCIgXCIgKyB0YWdOYW1lXG5cdFx0XHRcdFx0XHRcdFx0XHRcdCsgXCJcXG5yZXR1cm4ge1wiICsgdGFnQ3R4ICsgXCJ9O1wiKTtcblx0XHRcdFx0XHR0YWdDdHhGbi5fZXIgPSBvbkVycm9yO1xuXHRcdFx0XHRcdHRhZ0N0eEZuLl90YWcgPSB0YWdOYW1lO1xuXG5cdFx0XHRcdFx0aWYgKGlzTGlua0V4cHIpIHtcblx0XHRcdFx0XHRcdHJldHVybiB0YWdDdHhGbjtcblx0XHRcdFx0XHR9XG5cblx0XHRcdFx0XHRzZXRQYXRocyh0YWdDdHhGbiwgcGF0aEJpbmRpbmdzKTtcblx0XHRcdFx0XHR0YWdSZW5kZXIgPSAnYyhcIicgKyBjb252ZXJ0ZXIgKyAnXCIsdmlldywnO1xuXHRcdFx0XHRcdHVzZUNudnQgPSB0cnVlO1xuXHRcdFx0XHRcdGJvdW5kT25FcnJTdGFydCA9IHRhZ1JlbmRlciArIHRtcGxCaW5kaW5nS2V5ICsgXCIsXCI7XG5cdFx0XHRcdFx0Ym91bmRPbkVyckVuZCA9IFwiKVwiO1xuXHRcdFx0XHR9XG5cdFx0XHRcdGNvZGUgKz0gKGlzR2V0VmFsXG5cdFx0XHRcdFx0PyAoaXNMaW5rRXhwciA/IChvbkVycm9yID8gXCJ0cnl7XFxuXCIgOiBcIlwiKSArIFwicmV0dXJuIFwiIDogdGFnU3RhcnQpICsgKHVzZUNudnQgLy8gQ2FsbCBfY252dCBpZiB0aGVyZSBpcyBhIGNvbnZlcnRlcjoge3tjbnZ0OiAuLi4gfX0gb3Ige157Y252dDogLi4uIH19XG5cdFx0XHRcdFx0XHQ/ICh1c2VDbnZ0ID0gdW5kZWZpbmVkLCB1c2VWaWV3cyA9IGhhc0NudnQgPSB0cnVlLCB0YWdSZW5kZXIgKyAocGF0aEJpbmRpbmdzXG5cdFx0XHRcdFx0XHRcdD8gKCh0bXBsQmluZGluZ3NbdG1wbEJpbmRpbmdLZXkgLSAxXSA9IHRhZ0N0eEZuKSwgdG1wbEJpbmRpbmdLZXkpIC8vIFN0b3JlIHRoZSBjb21waWxlZCB0YWdDdHhGbiBpbiB0bXBsLmJuZHMsIGFuZCBwYXNzIHRoZSBrZXkgdG8gY29udmVydFZhbCgpXG5cdFx0XHRcdFx0XHRcdDogXCJ7XCIgKyB0YWdDdHggKyBcIn1cIikgKyBcIilcIilcblx0XHRcdFx0XHRcdDogdGFnTmFtZSA9PT0gXCI+XCJcblx0XHRcdFx0XHRcdFx0PyAoaGFzRW5jb2RlciA9IHRydWUsIFwiaChcIiArIHBhcmFtc1swXSArIFwiKVwiKVxuXHRcdFx0XHRcdFx0XHQ6IChnZXRzVmFsID0gdHJ1ZSwgXCIoKHY9XCIgKyBwYXJhbXNbMF0gKyAnKSE9bnVsbD92OicgKyAoaXNMaW5rRXhwciA/ICdudWxsKScgOiAnXCJcIiknKSlcblx0XHRcdFx0XHRcdFx0Ly8gTm9uIHN0cmljdCBlcXVhbGl0eSBzbyBkYXRhLWxpbms9XCJ0aXRsZXs6ZXhwcn1cIiB3aXRoIGV4cHI9bnVsbC91bmRlZmluZWQgcmVtb3ZlcyB0aXRsZSBhdHRyaWJ1dGVcblx0XHRcdFx0XHQpXG5cdFx0XHRcdFx0OiAoaGFzVGFnID0gdHJ1ZSwgXCJcXG57dmlldzp2aWV3LHRtcGw6XCIgLy8gQWRkIHRoaXMgdGFnQ3R4IHRvIHRoZSBjb21waWxlZCBjb2RlIGZvciB0aGUgdGFnQ3R4cyB0byBiZSBwYXNzZWQgdG8gcmVuZGVyVGFnKClcblx0XHRcdFx0XHRcdCsgKGNvbnRlbnQgPyBuZXN0ZWRUbXBscy5sZW5ndGggOiBcIjBcIikgKyBcIixcIiAvLyBGb3IgYmxvY2sgdGFncywgcGFzcyBpbiB0aGUga2V5IChuZXN0ZWRUbXBscy5sZW5ndGgpIHRvIHRoZSBuZXN0ZWQgY29udGVudCB0ZW1wbGF0ZVxuXHRcdFx0XHRcdFx0KyB0YWdDdHggKyBcIn0sXCIpKTtcblxuXHRcdFx0XHRpZiAodGFnQW5kRWxzZXMgJiYgIW5leHRJc0Vsc2UpIHtcblx0XHRcdFx0XHQvLyBUaGlzIGlzIGEgZGF0YS1saW5rIGV4cHJlc3Npb24gb3IgYW4gaW5saW5lIHRhZyB3aXRob3V0IGFueSBlbHNlcywgb3IgdGhlIGxhc3Qge3tlbHNlfX0gb2YgYW4gaW5saW5lIHRhZ1xuXHRcdFx0XHRcdC8vIFdlIGNvbXBsZXRlIHRoZSBjb2RlIGZvciByZXR1cm5pbmcgdGhlIHRhZ0N0eHMgYXJyYXlcblx0XHRcdFx0XHRjb2RlID0gXCJbXCIgKyBjb2RlLnNsaWNlKDAsIC0xKSArIFwiXVwiO1xuXHRcdFx0XHRcdHRhZ1JlbmRlciA9ICd0KFwiJyArIHRhZ0FuZEVsc2VzICsgJ1wiLHZpZXcsdGhpcywnO1xuXHRcdFx0XHRcdGlmIChpc0xpbmtFeHByIHx8IHBhdGhCaW5kaW5ncykge1xuXHRcdFx0XHRcdFx0Ly8gVGhpcyBpcyBhIGJvdW5kIHRhZyAoZGF0YS1saW5rIGV4cHJlc3Npb24gb3IgaW5saW5lIGJvdW5kIHRhZyB7Xnt0YWcgLi4ufX0pIHNvIHdlIHN0b3JlIGEgY29tcGlsZWQgdGFnQ3R4cyBmdW5jdGlvbiBpbiB0bXAuYm5kc1xuXHRcdFx0XHRcdFx0Y29kZSA9IG5ldyBGdW5jdGlvbihcImRhdGEsdmlldyxqLHVcIiwgXCIgLy8gXCIgKyB0bXBsTmFtZSArIFwiIFwiICsgdG1wbEJpbmRpbmdLZXkgKyBcIiBcIiArIHRhZ0FuZEVsc2VzICsgXCJcXG5yZXR1cm4gXCIgKyBjb2RlICsgXCI7XCIpO1xuXHRcdFx0XHRcdFx0Y29kZS5fZXIgPSBvbkVycm9yO1xuXHRcdFx0XHRcdFx0Y29kZS5fdGFnID0gdGFnQW5kRWxzZXM7XG5cdFx0XHRcdFx0XHRpZiAocGF0aEJpbmRpbmdzKSB7XG5cdFx0XHRcdFx0XHRcdHNldFBhdGhzKHRtcGxCaW5kaW5nc1t0bXBsQmluZGluZ0tleSAtIDFdID0gY29kZSwgcGF0aEJpbmRpbmdzKTtcblx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHRcdGlmIChpc0xpbmtFeHByKSB7XG5cdFx0XHRcdFx0XHRcdHJldHVybiBjb2RlOyAvLyBGb3IgYSBkYXRhLWxpbmsgZXhwcmVzc2lvbiB3ZSByZXR1cm4gdGhlIGNvbXBpbGVkIHRhZ0N0eHMgZnVuY3Rpb25cblx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHRcdGJvdW5kT25FcnJTdGFydCA9IHRhZ1JlbmRlciArIHRtcGxCaW5kaW5nS2V5ICsgXCIsdW5kZWZpbmVkLFwiO1xuXHRcdFx0XHRcdFx0Ym91bmRPbkVyckVuZCA9IFwiKVwiO1xuXHRcdFx0XHRcdH1cblxuXHRcdFx0XHRcdC8vIFRoaXMgaXMgdGhlIGxhc3Qge3tlbHNlfX0gZm9yIGFuIGlubGluZSB0YWcuXG5cdFx0XHRcdFx0Ly8gRm9yIGEgYm91bmQgdGFnLCBwYXNzIHRoZSB0YWdDdHhzIGZuIGxvb2t1cCBrZXkgdG8gcmVuZGVyVGFnLlxuXHRcdFx0XHRcdC8vIEZvciBhbiB1bmJvdW5kIHRhZywgaW5jbHVkZSB0aGUgY29kZSBkaXJlY3RseSBmb3IgZXZhbHVhdGluZyB0YWdDdHhzIGFycmF5XG5cdFx0XHRcdFx0Y29kZSA9IG9sZENvZGUgKyB0YWdTdGFydCArIHRhZ1JlbmRlciArICh0bXBsQmluZGluZ0tleSB8fCBjb2RlKSArIFwiKVwiO1xuXHRcdFx0XHRcdHBhdGhCaW5kaW5ncyA9IDA7XG5cdFx0XHRcdFx0dGFnQW5kRWxzZXMgPSAwO1xuXHRcdFx0XHR9XG5cdFx0XHRcdGlmIChvbkVycm9yKSB7XG5cdFx0XHRcdFx0dXNlVmlld3MgPSB0cnVlO1xuXHRcdFx0XHRcdGNvZGUgKz0gJztcXG59Y2F0Y2goZSl7cmV0JyArIChpc0xpbmtFeHByID8gXCJ1cm4gXCIgOiBcIis9XCIpICsgYm91bmRPbkVyclN0YXJ0ICsgJ2ouX2VycihlLHZpZXcsJyArIG9uRXJyb3IgKyAnKScgKyBib3VuZE9uRXJyRW5kICsgJzt9JyArIChpc0xpbmtFeHByID8gXCJcIiA6ICdyZXQ9cmV0Jyk7XG5cdFx0XHRcdH1cblx0XHRcdH1cblx0XHR9XG5cdH1cblx0Ly8gSW5jbHVkZSBvbmx5IHRoZSB2YXIgcmVmZXJlbmNlcyB0aGF0IGFyZSBuZWVkZWQgaW4gdGhlIGNvZGVcblx0Y29kZSA9IFwiLy8gXCIgKyB0bXBsTmFtZVxuXG5cdFx0KyBcIlxcbnZhciB2XCJcblx0XHQrIChoYXNUYWcgPyBcIix0PWouX3RhZ1wiIDogXCJcIikgICAgICAgICAgICAgICAgLy8gaGFzIHRhZ1xuXHRcdCsgKGhhc0NudnQgPyBcIixjPWouX2NudnRcIiA6IFwiXCIpICAgICAgICAgICAgICAvLyBjb252ZXJ0ZXJcblx0XHQrIChoYXNFbmNvZGVyID8gXCIsaD1qLl9odG1sXCIgOiBcIlwiKSAgICAgICAgICAgLy8gaHRtbCBjb252ZXJ0ZXJcblx0XHQrIChpc0xpbmtFeHByID8gXCI7XFxuXCIgOiAnLHJldD1cIlwiXFxuJylcblx0XHQrICh0bXBsT3B0aW9ucy5kZWJ1ZyA/IFwiZGVidWdnZXI7XCIgOiBcIlwiKVxuXHRcdCsgY29kZVxuXHRcdCsgKGlzTGlua0V4cHIgPyBcIlxcblwiIDogXCI7XFxucmV0dXJuIHJldDtcIik7XG5cblx0aWYgKCRzdWJTZXR0aW5ncy5kZWJ1Z01vZGUgIT09IGZhbHNlKSB7XG5cdFx0Y29kZSA9IFwidHJ5IHtcXG5cIiArIGNvZGUgKyBcIlxcbn1jYXRjaChlKXtcXG5yZXR1cm4gai5fZXJyKGUsIHZpZXcpO1xcbn1cIjtcblx0fVxuXG5cdHRyeSB7XG5cdFx0Y29kZSA9IG5ldyBGdW5jdGlvbihcImRhdGEsdmlldyxqLHVcIiwgY29kZSk7XG5cdH0gY2F0Y2ggKGUpIHtcblx0XHRzeW50YXhFcnJvcihcIkNvbXBpbGVkIHRlbXBsYXRlIGNvZGU6XFxuXFxuXCIgKyBjb2RlICsgJ1xcbjogXCInICsgZS5tZXNzYWdlICsgJ1wiJyk7XG5cdH1cblx0aWYgKHRtcGwpIHtcblx0XHR0bXBsLmZuID0gY29kZTtcblx0XHR0bXBsLnVzZVZpZXdzID0gISF1c2VWaWV3cztcblx0fVxuXHRyZXR1cm4gY29kZTtcbn1cblxuLy89PT09PT09PT09XG4vLyBVdGlsaXRpZXNcbi8vPT09PT09PT09PVxuXG4vLyBNZXJnZSBvYmplY3RzLCBpbiBwYXJ0aWN1bGFyIGNvbnRleHRzIHdoaWNoIGluaGVyaXQgZnJvbSBwYXJlbnQgY29udGV4dHNcbmZ1bmN0aW9uIGV4dGVuZEN0eChjb250ZXh0LCBwYXJlbnRDb250ZXh0KSB7XG5cdC8vIFJldHVybiBjb3B5IG9mIHBhcmVudENvbnRleHQsIHVubGVzcyBjb250ZXh0IGlzIGRlZmluZWQgYW5kIGlzIGRpZmZlcmVudCwgaW4gd2hpY2ggY2FzZSByZXR1cm4gYSBuZXcgbWVyZ2VkIGNvbnRleHRcblx0Ly8gSWYgbmVpdGhlciBjb250ZXh0IG5vciBwYXJlbnRDb250ZXh0IGFyZSBkZWZpbmVkLCByZXR1cm4gdW5kZWZpbmVkXG5cdHJldHVybiBjb250ZXh0ICYmIGNvbnRleHQgIT09IHBhcmVudENvbnRleHRcblx0XHQ/IChwYXJlbnRDb250ZXh0XG5cdFx0XHQ/ICRleHRlbmQoJGV4dGVuZCh7fSwgcGFyZW50Q29udGV4dCksIGNvbnRleHQpXG5cdFx0XHQ6IGNvbnRleHQpXG5cdFx0OiBwYXJlbnRDb250ZXh0ICYmICRleHRlbmQoe30sIHBhcmVudENvbnRleHQpO1xufVxuXG4vLyBHZXQgY2hhcmFjdGVyIGVudGl0eSBmb3IgSFRNTCBhbmQgQXR0cmlidXRlIGVuY29kaW5nXG5mdW5jdGlvbiBnZXRDaGFyRW50aXR5KGNoKSB7XG5cdHJldHVybiBjaGFyRW50aXRpZXNbY2hdIHx8IChjaGFyRW50aXRpZXNbY2hdID0gXCImI1wiICsgY2guY2hhckNvZGVBdCgwKSArIFwiO1wiKTtcbn1cblxuZnVuY3Rpb24gZ2V0VGFyZ2V0UHJvcHMoc291cmNlKSB7XG5cdC8vIHRoaXMgcG9pbnRlciBpcyB0aGVNYXAgLSB3aGljaCBoYXMgdGFnQ3R4LnByb3BzIHRvb1xuXHQvLyBhcmd1bWVudHM6IHRhZ0N0eC5hcmdzLlxuXHR2YXIga2V5LCBwcm9wLFxuXHRcdHByb3BzID0gW107XG5cblx0aWYgKHR5cGVvZiBzb3VyY2UgPT09IE9CSkVDVCkge1xuXHRcdGZvciAoa2V5IGluIHNvdXJjZSkge1xuXHRcdFx0cHJvcCA9IHNvdXJjZVtrZXldO1xuXHRcdFx0aWYgKGtleSAhPT0gJGV4cGFuZG8gJiYgc291cmNlLmhhc093blByb3BlcnR5KGtleSkgJiYgISRpc0Z1bmN0aW9uKHByb3ApKSB7XG5cdFx0XHRcdHByb3BzLnB1c2goe2tleToga2V5LCBwcm9wOiBwcm9wfSk7XG5cdFx0XHR9XG5cdFx0fVxuXHR9XG5cdHJldHVybiBwcm9wcztcbn1cblxuZnVuY3Rpb24gJGZuUmVuZGVyKGRhdGEsIGNvbnRleHQsIG5vSXRlcmF0aW9uKSB7XG5cdHZhciB0bXBsRWxlbSA9IHRoaXMuanF1ZXJ5ICYmICh0aGlzWzBdIHx8IGVycm9yKCdVbmtub3duIHRlbXBsYXRlOiBcIicgKyB0aGlzLnNlbGVjdG9yICsgJ1wiJykpLFxuXHRcdHRtcGwgPSB0bXBsRWxlbS5nZXRBdHRyaWJ1dGUodG1wbEF0dHIpO1xuXG5cdHJldHVybiByZW5kZXJDb250ZW50LmNhbGwodG1wbCA/ICQuZGF0YSh0bXBsRWxlbSlbanN2VG1wbF0gOiAkdGVtcGxhdGVzKHRtcGxFbGVtKSwgZGF0YSwgY29udGV4dCwgbm9JdGVyYXRpb24pO1xufVxuXG4vLz09PT09PT09PT09PT09PT09PT09PT09PT09IFJlZ2lzdGVyIGNvbnZlcnRlcnMgPT09PT09PT09PT09PT09PT09PT09PT09PT1cblxuZnVuY3Rpb24gaHRtbEVuY29kZSh0ZXh0KSB7XG5cdC8vIEhUTUwgZW5jb2RlOiBSZXBsYWNlIDwgPiAmICcgYW5kIFwiIGJ5IGNvcnJlc3BvbmRpbmcgZW50aXRpZXMuXG5cdHJldHVybiB0ZXh0ICE9IHVuZGVmaW5lZCA/IHJJc0h0bWwudGVzdCh0ZXh0KSAmJiAoXCJcIiArIHRleHQpLnJlcGxhY2Uockh0bWxFbmNvZGUsIGdldENoYXJFbnRpdHkpIHx8IHRleHQgOiBcIlwiO1xufVxuXG4vLz09PT09PT09PT09PT09PT09PT09PT09PT09IEluaXRpYWxpemUgPT09PT09PT09PT09PT09PT09PT09PT09PT1cblxuJHN1YiA9ICR2aWV3cy5zdWI7XG4kdmlld3NTZXR0aW5ncyA9ICR2aWV3cy5zZXR0aW5ncztcblxuaWYgKCEoanNyIHx8ICQgJiYgJC5yZW5kZXIpKSB7XG5cdC8vIEpzUmVuZGVyIG5vdCBhbHJlYWR5IGxvYWRlZCwgb3IgbG9hZGVkIHdpdGhvdXQgalF1ZXJ5LCBhbmQgd2UgYXJlIG5vdyBtb3ZpbmcgZnJvbSBqc3JlbmRlciBuYW1lc3BhY2UgdG8galF1ZXJ5IG5hbWVwYWNlXG5cdGZvciAoanN2U3RvcmVOYW1lIGluIGpzdlN0b3Jlcykge1xuXHRcdHJlZ2lzdGVyU3RvcmUoanN2U3RvcmVOYW1lLCBqc3ZTdG9yZXNbanN2U3RvcmVOYW1lXSk7XG5cdH1cblxuXHQkY29udmVydGVycyA9ICR2aWV3cy5jb252ZXJ0ZXJzO1xuXHQkaGVscGVycyA9ICR2aWV3cy5oZWxwZXJzO1xuXHQkdGFncyA9ICR2aWV3cy50YWdzO1xuXG5cdCRzdWIuX3RnLnByb3RvdHlwZSA9IHtcblx0XHRiYXNlQXBwbHk6IGJhc2VBcHBseSxcblx0XHRjdnRBcmdzOiBjb252ZXJ0QXJnc1xuXHR9O1xuXG5cdHRvcFZpZXcgPSAkc3ViLnRvcFZpZXcgPSBuZXcgVmlldygpO1xuXG5cdC8vQlJPV1NFUi1TUEVDSUZJQyBDT0RFXG5cdGlmICgkKSB7XG5cblx0XHQvLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy9cblx0XHQvLyBqUXVlcnkgKD0gJCkgaXMgbG9hZGVkXG5cblx0XHQkLmZuLnJlbmRlciA9ICRmblJlbmRlcjtcblx0XHQkZXhwYW5kbyA9ICQuZXhwYW5kbztcblx0XHRpZiAoJC5vYnNlcnZhYmxlKSB7XG5cdFx0XHQkZXh0ZW5kKCRzdWIsICQudmlld3Muc3ViKTsgLy8ganF1ZXJ5Lm9ic2VydmFibGUuanMgd2FzIGxvYWRlZCBiZWZvcmUganNyZW5kZXIuanNcblx0XHRcdCR2aWV3cy5tYXAgPSAkLnZpZXdzLm1hcDtcblx0XHR9XG5cblx0fSBlbHNlIHtcblx0XHQvLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy9cblx0XHQvLyBqUXVlcnkgaXMgbm90IGxvYWRlZC5cblxuXHRcdCQgPSB7fTtcblxuXHRcdGlmIChzZXRHbG9iYWxzKSB7XG5cdFx0XHRnbG9iYWwuanNyZW5kZXIgPSAkOyAvLyBXZSBhcmUgbG9hZGluZyBqc3JlbmRlci5qcyBmcm9tIGEgc2NyaXB0IGVsZW1lbnQsIG5vdCBBTUQgb3IgQ29tbW9uSlMsIHNvIHNldCBnbG9iYWxcblx0XHR9XG5cblx0XHQvLyBFcnJvciB3YXJuaW5nIGlmIGpzcmVuZGVyLmpzIGlzIHVzZWQgYXMgdGVtcGxhdGUgZW5naW5lIG9uIE5vZGUuanMgKGUuZy4gRXhwcmVzcyBvciBIYXBpLi4uKVxuXHRcdC8vIFVzZSBqc3JlbmRlci1ub2RlLmpzIGluc3RlYWQuLi5cblx0XHQkLnJlbmRlckZpbGUgPSAkLl9fZXhwcmVzcyA9ICQuY29tcGlsZSA9IGZ1bmN0aW9uKCkgeyB0aHJvdyBcIk5vZGUuanM6IHVzZSBucG0ganNyZW5kZXIsIG9yIGpzcmVuZGVyLW5vZGUuanNcIjsgfTtcblxuXHRcdC8vRU5EIEJST1dTRVItU1BFQ0lGSUMgQ09ERVxuXHRcdCQuaXNGdW5jdGlvbiA9IGZ1bmN0aW9uKG9iKSB7XG5cdFx0XHRyZXR1cm4gdHlwZW9mIG9iID09PSBcImZ1bmN0aW9uXCI7XG5cdFx0fTtcblxuXHRcdCQuaXNBcnJheSA9IEFycmF5LmlzQXJyYXkgfHwgZnVuY3Rpb24ob2JqKSB7XG5cdFx0XHRyZXR1cm4gKHt9LnRvU3RyaW5nKS5jYWxsKG9iaikgPT09IFwiW29iamVjdCBBcnJheV1cIjtcblx0XHR9O1xuXG5cdFx0JHN1Yi5fanEgPSBmdW5jdGlvbihqcSkgeyAvLyBwcml2YXRlIG1ldGhvZCB0byBtb3ZlIGZyb20gSnNSZW5kZXIgQVBJcyBmcm9tIGpzcmVuZGVyIG5hbWVzcGFjZSB0byBqUXVlcnkgbmFtZXNwYWNlXG5cdFx0XHRpZiAoanEgIT09ICQpIHtcblx0XHRcdFx0JGV4dGVuZChqcSwgJCk7IC8vIG1hcCBvdmVyIGZyb20ganNyZW5kZXIgbmFtZXNwYWNlIHRvIGpRdWVyeSBuYW1lc3BhY2Vcblx0XHRcdFx0JCA9IGpxO1xuXHRcdFx0XHQkLmZuLnJlbmRlciA9ICRmblJlbmRlcjtcblx0XHRcdFx0ZGVsZXRlICQuanNyZW5kZXI7XG5cdFx0XHRcdCRleHBhbmRvID0gJC5leHBhbmRvO1xuXHRcdFx0fVxuXHRcdH07XG5cblx0XHQkLmpzcmVuZGVyID0gdmVyc2lvbk51bWJlcjtcblx0fVxuXHQkc3ViU2V0dGluZ3MgPSAkc3ViLnNldHRpbmdzO1xuXHQkc3ViU2V0dGluZ3MuYWxsb3dDb2RlID0gZmFsc2U7XG5cdCRpc0Z1bmN0aW9uID0gJC5pc0Z1bmN0aW9uO1xuXHQkLnJlbmRlciA9ICRyZW5kZXI7XG5cdCQudmlld3MgPSAkdmlld3M7XG5cdCQudGVtcGxhdGVzID0gJHRlbXBsYXRlcyA9ICR2aWV3cy50ZW1wbGF0ZXM7XG5cblx0Zm9yIChzZXR0aW5nIGluICRzdWJTZXR0aW5ncykge1xuXHRcdGFkZFNldHRpbmcoc2V0dGluZyk7XG5cdH1cblxuXHQoJHZpZXdzU2V0dGluZ3MuZGVidWdNb2RlID0gZnVuY3Rpb24oZGVidWdNb2RlKSB7XG5cdFx0cmV0dXJuIGRlYnVnTW9kZSA9PT0gdW5kZWZpbmVkXG5cdFx0XHQ/ICRzdWJTZXR0aW5ncy5kZWJ1Z01vZGVcblx0XHRcdDogKFxuXHRcdFx0XHQkc3ViU2V0dGluZ3MuZGVidWdNb2RlID0gZGVidWdNb2RlLFxuXHRcdFx0XHQkc3ViU2V0dGluZ3Mub25FcnJvciA9IGRlYnVnTW9kZSArIFwiXCIgPT09IGRlYnVnTW9kZVxuXHRcdFx0XHRcdD8gbmV3IEZ1bmN0aW9uKFwiXCIsIFwicmV0dXJuICdcIiArIGRlYnVnTW9kZSArIFwiJztcIiApXG5cdFx0XHRcdFx0OiAkaXNGdW5jdGlvbihkZWJ1Z01vZGUpXG5cdFx0XHRcdFx0XHQ/IGRlYnVnTW9kZVxuXHRcdFx0XHRcdFx0OiB1bmRlZmluZWQsXG5cdFx0XHRcdCR2aWV3c1NldHRpbmdzKTtcblx0fSkoZmFsc2UpOyAvLyBqc2hpbnQgaWdub3JlOmxpbmVcblxuXHQkc3ViU2V0dGluZ3NBZHZhbmNlZCA9ICRzdWJTZXR0aW5ncy5hZHZhbmNlZCA9IHtcblx0XHR1c2VWaWV3czogZmFsc2UsXG5cdFx0X2pzdjogZmFsc2UgLy8gRm9yIGdsb2JhbCBhY2Nlc3MgdG8gSnNWaWV3cyBzdG9yZVxuXHR9O1xuXG5cdC8vPT09PT09PT09PT09PT09PT09PT09PT09PT0gUmVnaXN0ZXIgdGFncyA9PT09PT09PT09PT09PT09PT09PT09PT09PVxuXG5cdCR0YWdzKHtcblx0XHRcImlmXCI6IHtcblx0XHRcdHJlbmRlcjogZnVuY3Rpb24odmFsKSB7XG5cdFx0XHRcdC8vIFRoaXMgZnVuY3Rpb24gaXMgY2FsbGVkIG9uY2UgZm9yIHt7aWZ9fSBhbmQgb25jZSBmb3IgZWFjaCB7e2Vsc2V9fS5cblx0XHRcdFx0Ly8gV2Ugd2lsbCB1c2UgdGhlIHRhZy5yZW5kZXJpbmcgb2JqZWN0IGZvciBjYXJyeWluZyByZW5kZXJpbmcgc3RhdGUgYWNyb3NzIHRoZSBjYWxscy5cblx0XHRcdFx0Ly8gSWYgbm90IGRvbmUgKGEgcHJldmlvdXMgYmxvY2sgaGFzIG5vdCBiZWVuIHJlbmRlcmVkKSwgbG9vayBhdCBleHByZXNzaW9uIGZvciB0aGlzIGJsb2NrIGFuZCByZW5kZXIgdGhlIGJsb2NrIGlmIGV4cHJlc3Npb24gaXMgdHJ1dGh5XG5cdFx0XHRcdC8vIE90aGVyd2lzZSByZXR1cm4gXCJcIlxuXHRcdFx0XHR2YXIgc2VsZiA9IHRoaXMsXG5cdFx0XHRcdFx0dGFnQ3R4ID0gc2VsZi50YWdDdHgsXG5cdFx0XHRcdFx0cmV0ID0gKHNlbGYucmVuZGVyaW5nLmRvbmUgfHwgIXZhbCAmJiAoYXJndW1lbnRzLmxlbmd0aCB8fCAhdGFnQ3R4LmluZGV4KSlcblx0XHRcdFx0XHRcdD8gXCJcIlxuXHRcdFx0XHRcdFx0OiAoc2VsZi5yZW5kZXJpbmcuZG9uZSA9IHRydWUsIHNlbGYuc2VsZWN0ZWQgPSB0YWdDdHguaW5kZXgsXG5cdFx0XHRcdFx0XHRcdC8vIFRlc3QgaXMgc2F0aXNmaWVkLCBzbyByZW5kZXIgY29udGVudCBvbiBjdXJyZW50IGNvbnRleHQuIFdlIGNhbGwgdGFnQ3R4LnJlbmRlcigpIHJhdGhlciB0aGFuIHJldHVybiB1bmRlZmluZWRcblx0XHRcdFx0XHRcdFx0Ly8gKHdoaWNoIHdvdWxkIGFsc28gcmVuZGVyIHRoZSB0bXBsL2NvbnRlbnQgb24gdGhlIGN1cnJlbnQgY29udGV4dCBidXQgd291bGQgaXRlcmF0ZSBpZiBpdCBpcyBhbiBhcnJheSlcblx0XHRcdFx0XHRcdFx0dGFnQ3R4LnJlbmRlcih0YWdDdHgudmlldywgdHJ1ZSkpOyAvLyBubyBhcmcsIHNvIHJlbmRlcnMgYWdhaW5zdCBwYXJlbnRWaWV3LmRhdGFcblx0XHRcdFx0cmV0dXJuIHJldDtcblx0XHRcdH0sXG5cdFx0XHRmbG93OiB0cnVlXG5cdFx0fSxcblx0XHRcImZvclwiOiB7XG5cdFx0XHRyZW5kZXI6IGZ1bmN0aW9uKHZhbCkge1xuXHRcdFx0XHQvLyBUaGlzIGZ1bmN0aW9uIGlzIGNhbGxlZCBvbmNlIGZvciB7e2Zvcn19IGFuZCBvbmNlIGZvciBlYWNoIHt7ZWxzZX19LlxuXHRcdFx0XHQvLyBXZSB3aWxsIHVzZSB0aGUgdGFnLnJlbmRlcmluZyBvYmplY3QgZm9yIGNhcnJ5aW5nIHJlbmRlcmluZyBzdGF0ZSBhY3Jvc3MgdGhlIGNhbGxzLlxuXHRcdFx0XHR2YXIgZmluYWxFbHNlID0gIWFyZ3VtZW50cy5sZW5ndGgsXG5cdFx0XHRcdFx0dmFsdWUsXG5cdFx0XHRcdFx0c2VsZiA9IHRoaXMsXG5cdFx0XHRcdFx0dGFnQ3R4ID0gc2VsZi50YWdDdHgsXG5cdFx0XHRcdFx0cmVzdWx0ID0gXCJcIixcblx0XHRcdFx0XHRkb25lID0gMDtcblxuXHRcdFx0XHRpZiAoIXNlbGYucmVuZGVyaW5nLmRvbmUpIHtcblx0XHRcdFx0XHR2YWx1ZSA9IGZpbmFsRWxzZSA/IHRhZ0N0eC52aWV3LmRhdGEgOiB2YWw7IC8vIEZvciB0aGUgZmluYWwgZWxzZSwgZGVmYXVsdHMgdG8gY3VycmVudCBkYXRhIHdpdGhvdXQgaXRlcmF0aW9uLlxuXHRcdFx0XHRcdGlmICh2YWx1ZSAhPT0gdW5kZWZpbmVkKSB7XG5cdFx0XHRcdFx0XHRyZXN1bHQgKz0gdGFnQ3R4LnJlbmRlcih2YWx1ZSwgZmluYWxFbHNlKTsgLy8gSXRlcmF0ZXMgZXhjZXB0IG9uIGZpbmFsIGVsc2UsIGlmIGRhdGEgaXMgYW4gYXJyYXkuIChVc2Uge3tpbmNsdWRlfX0gdG8gY29tcG9zZSB0ZW1wbGF0ZXMgd2l0aG91dCBhcnJheSBpdGVyYXRpb24pXG5cdFx0XHRcdFx0XHRkb25lICs9ICRpc0FycmF5KHZhbHVlKSA/IHZhbHVlLmxlbmd0aCA6IDE7XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHRcdGlmIChzZWxmLnJlbmRlcmluZy5kb25lID0gZG9uZSkge1xuXHRcdFx0XHRcdFx0c2VsZi5zZWxlY3RlZCA9IHRhZ0N0eC5pbmRleDtcblx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0Ly8gSWYgbm90aGluZyB3YXMgcmVuZGVyZWQgd2Ugd2lsbCBsb29rIGF0IHRoZSBuZXh0IHt7ZWxzZX19LiBPdGhlcndpc2UsIHdlIGFyZSBkb25lLlxuXHRcdFx0XHR9XG5cdFx0XHRcdHJldHVybiByZXN1bHQ7XG5cdFx0XHR9LFxuXHRcdFx0ZmxvdzogdHJ1ZVxuXHRcdH0sXG5cdFx0cHJvcHM6IHtcblx0XHRcdGJhc2VUYWc6IFwiZm9yXCIsXG5cdFx0XHRkYXRhTWFwOiBkYXRhTWFwKGdldFRhcmdldFByb3BzKSxcblx0XHRcdGZsb3c6IHRydWVcblx0XHR9LFxuXHRcdGluY2x1ZGU6IHtcblx0XHRcdGZsb3c6IHRydWVcblx0XHR9LFxuXHRcdFwiKlwiOiB7XG5cdFx0XHQvLyB7eyogY29kZS4uLiB9fSAtIElnbm9yZWQgaWYgdGVtcGxhdGUuYWxsb3dDb2RlIGFuZCAkLnZpZXdzLnNldHRpbmdzLmFsbG93Q29kZSBhcmUgZmFsc2UuIE90aGVyd2lzZSBpbmNsdWRlIGNvZGUgaW4gY29tcGlsZWQgdGVtcGxhdGVcblx0XHRcdHJlbmRlcjogcmV0VmFsLFxuXHRcdFx0ZmxvdzogdHJ1ZVxuXHRcdH0sXG5cdFx0XCI6KlwiOiB7XG5cdFx0XHQvLyB7ezoqIHJldHVybmVkRXhwcmVzc2lvbiB9fSAtIElnbm9yZWQgaWYgdGVtcGxhdGUuYWxsb3dDb2RlIGFuZCAkLnZpZXdzLnNldHRpbmdzLmFsbG93Q29kZSBhcmUgZmFsc2UuIE90aGVyd2lzZSBpbmNsdWRlIGNvZGUgaW4gY29tcGlsZWQgdGVtcGxhdGVcblx0XHRcdHJlbmRlcjogcmV0VmFsLFxuXHRcdFx0ZmxvdzogdHJ1ZVxuXHRcdH0sXG5cdFx0ZGJnOiAkaGVscGVycy5kYmcgPSAkY29udmVydGVycy5kYmcgPSBkYmdCcmVhayAvLyBSZWdpc3RlciB7e2RiZy99fSwge3tkYmc6Li4ufX0gYW5kIH5kYmcoKSB0byB0aHJvdyBhbmQgY2F0Y2gsIGFzIGJyZWFrcG9pbnRzIGZvciBkZWJ1Z2dpbmcuXG5cdH0pO1xuXG5cdCRjb252ZXJ0ZXJzKHtcblx0XHRodG1sOiBodG1sRW5jb2RlLFxuXHRcdGF0dHI6IGh0bWxFbmNvZGUsIC8vIEluY2x1ZGVzID4gZW5jb2Rpbmcgc2luY2UgckNvbnZlcnRNYXJrZXJzIGluIEpzVmlld3MgZG9lcyBub3Qgc2tpcCA+IGNoYXJhY3RlcnMgaW4gYXR0cmlidXRlIHN0cmluZ3Ncblx0XHR1cmw6IGZ1bmN0aW9uKHRleHQpIHtcblx0XHRcdC8vIFVSTCBlbmNvZGluZyBoZWxwZXIuXG5cdFx0XHRyZXR1cm4gdGV4dCAhPSB1bmRlZmluZWQgPyBlbmNvZGVVUkkoXCJcIiArIHRleHQpIDogdGV4dCA9PT0gbnVsbCA/IHRleHQgOiBcIlwiOyAvLyBudWxsIHJldHVybnMgbnVsbCwgZS5nLiB0byByZW1vdmUgYXR0cmlidXRlLiB1bmRlZmluZWQgcmV0dXJucyBcIlwiXG5cdFx0fVxuXHR9KTtcbn1cbi8vPT09PT09PT09PT09PT09PT09PT09PT09PT0gRGVmaW5lIGRlZmF1bHQgZGVsaW1pdGVycyA9PT09PT09PT09PT09PT09PT09PT09PT09PVxuJHN1YlNldHRpbmdzID0gJHN1Yi5zZXR0aW5ncztcbiRpc0FycmF5ID0gKCR8fGpzcikuaXNBcnJheTtcbiR2aWV3c1NldHRpbmdzLmRlbGltaXRlcnMoXCJ7e1wiLCBcIn19XCIsIFwiXlwiKTtcblxuaWYgKGpzclRvSnEpIHsgLy8gTW92aW5nIGZyb20ganNyZW5kZXIgbmFtZXNwYWNlIHRvIGpRdWVyeSBuYW1lcGFjZSAtIGNvcHkgb3ZlciB0aGUgc3RvcmVkIGl0ZW1zICh0ZW1wbGF0ZXMsIGNvbnZlcnRlcnMsIGhlbHBlcnMuLi4pXG5cdGpzci52aWV3cy5zdWIuX2pxKCQpO1xufVxucmV0dXJuICQgfHwganNyO1xufSwgd2luZG93KSk7XG4iLCIvKmdsb2JhbCBRVW5pdCwgdGVzdCwgZXF1YWwsIG9rKi9cbihmdW5jdGlvbih1bmRlZmluZWQpIHtcblwidXNlIHN0cmljdFwiO1xuXG5icm93c2VyaWZ5LmRvbmUudHdlbHZlID0gdHJ1ZTtcblxuUVVuaXQubW9kdWxlKFwiQnJvd3NlcmlmeSAtIGNsaWVudCBjb2RlXCIpO1xuXG52YXIgaXNJRTggPSB3aW5kb3cuYXR0YWNoRXZlbnQgJiYgIXdpbmRvdy5hZGRFdmVudExpc3RlbmVyO1xuXG5pZiAoIWlzSUU4KSB7XG5cbnRlc3QoXCJObyBqUXVlcnkgZ2xvYmFsOiByZXF1aXJlKCdqc3JlbmRlcicpKCkgbmVzdGVkIHRlbXBsYXRlXCIsIGZ1bmN0aW9uKCkge1xuXHQvLyAuLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uIEhpZGUgUVVuaXQgZ2xvYmFsIGpRdWVyeSBhbmQgYW55IHByZXZpb3VzIGdsb2JhbCBqc3JlbmRlci4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLlxuXHR2YXIgalF1ZXJ5ID0gZ2xvYmFsLmpRdWVyeSwganNyID0gZ2xvYmFsLmpzcmVuZGVyO1xuXHRnbG9iYWwualF1ZXJ5ID0gZ2xvYmFsLmpzcmVuZGVyID0gdW5kZWZpbmVkO1xuXG5cdC8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT0gQXJyYW5nZSA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG5cdHZhciBkYXRhID0ge25hbWU6IFwiSm9cIn07XG5cblx0Ly8gLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4gQWN0IC4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi5cblx0dmFyIGpzcmVuZGVyID0gcmVxdWlyZSgnanNyZW5kZXInKSgpOyAvLyBOb3QgcGFzc2luZyBpbiBqUXVlcnksIHNvIHJldHVybnMgdGhlIGpzcmVuZGVyIG5hbWVzcGFjZVxuXG5cdC8vIFVzZSByZXF1aXJlIHRvIGdldCBzZXJ2ZXIgdGVtcGxhdGUsIHRoYW5rcyB0byBCcm93c2VyaWZ5IGJ1bmRsZSB0aGF0IHVzZWQganNyZW5kZXIvdG1wbGlmeSB0cmFuc2Zvcm1cblx0dmFyIHRtcGwgPSByZXF1aXJlKCcuLi90ZW1wbGF0ZXMvb3V0ZXIuaHRtbCcpKGpzcmVuZGVyKTsgLy8gUHJvdmlkZSBqc3JlbmRlclxuXG5cdHZhciByZXN1bHQgPSB0bXBsKGRhdGEpO1xuXG5cdHJlc3VsdCArPSBcIiBcIiArIChqc3JlbmRlciAhPT0galF1ZXJ5KTtcblxuXHQvLyAuLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uIEFzc2VydCAuLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi5cblx0ZXF1YWwocmVzdWx0LCBcIk5hbWU6IEpvIChvdXRlci5odG1sKSBOYW1lOiBKbyAoaW5uZXIuaHRtbCkgdHJ1ZVwiLCBcInJlc3VsdDogTm8galF1ZXJ5IGdsb2JhbDogcmVxdWlyZSgnanNyZW5kZXInKSgpLCBuZXN0ZWQgdGVtcGxhdGVzXCIpO1xuXG5cdC8vIC4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4gUmVzZXQgLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uXG5cdGdsb2JhbC5qUXVlcnkgPSBqUXVlcnk7IC8vIFJlcGxhY2UgUVVuaXQgZ2xvYmFsIGpRdWVyeVxuXHRnbG9iYWwuanNyZW5kZXIgPSBqc3I7IC8vIFJlcGxhY2UgYW55IHByZXZpb3VzIGdsb2JhbCBqc3JlbmRlclxufSk7XG59XG59KSgpO1xuIiwidmFyIHRtcGxSZWZzID0gW10sXG4gIG1rdXAgPSAnTmFtZToge3s6bmFtZX19IChpbm5lci5odG1sKScsXG4gICQgPSBnbG9iYWwuanNyZW5kZXIgfHwgZ2xvYmFsLmpRdWVyeTtcblxubW9kdWxlLmV4cG9ydHMgPSAkID8gJC50ZW1wbGF0ZXMoXCIuL3Rlc3QvdGVtcGxhdGVzL2lubmVyLmh0bWxcIiwgbWt1cCkgOlxuICBmdW5jdGlvbigkKSB7XG4gICAgaWYgKCEkIHx8ICEkLnZpZXdzKSB7dGhyb3cgXCJSZXF1aXJlcyBqc3JlbmRlci9qUXVlcnlcIjt9XG4gICAgd2hpbGUgKHRtcGxSZWZzLmxlbmd0aCkge1xuICAgICAgdG1wbFJlZnMucG9wKCkoJCk7IC8vIGNvbXBpbGUgbmVzdGVkIHRlbXBsYXRlXG4gICAgfVxuXG4gICAgcmV0dXJuICQudGVtcGxhdGVzKFwiLi90ZXN0L3RlbXBsYXRlcy9pbm5lci5odG1sXCIsIG1rdXApXG4gIH07IiwidmFyIHRtcGxSZWZzID0gW10sXG4gIG1rdXAgPSAnTmFtZToge3s6bmFtZX19IChvdXRlci5odG1sKSB7e2luY2x1ZGUgdG1wbD1cXFwiLi90ZXN0L3RlbXBsYXRlcy9pbm5lci5odG1sXFxcIi99fScsXG4gICQgPSBnbG9iYWwuanNyZW5kZXIgfHwgZ2xvYmFsLmpRdWVyeTtcblxudG1wbFJlZnMucHVzaChyZXF1aXJlKFwiLi9pbm5lci5odG1sXCIpKTtcbm1vZHVsZS5leHBvcnRzID0gJCA/ICQudGVtcGxhdGVzKFwiLi90ZXN0L3RlbXBsYXRlcy9vdXRlci5odG1sXCIsIG1rdXApIDpcbiAgZnVuY3Rpb24oJCkge1xuICAgIGlmICghJCB8fCAhJC52aWV3cykge3Rocm93IFwiUmVxdWlyZXMganNyZW5kZXIvalF1ZXJ5XCI7fVxuICAgIHdoaWxlICh0bXBsUmVmcy5sZW5ndGgpIHtcbiAgICAgIHRtcGxSZWZzLnBvcCgpKCQpOyAvLyBjb21waWxlIG5lc3RlZCB0ZW1wbGF0ZVxuICAgIH1cblxuICAgIHJldHVybiAkLnRlbXBsYXRlcyhcIi4vdGVzdC90ZW1wbGF0ZXMvb3V0ZXIuaHRtbFwiLCBta3VwKVxuICB9OyJdfQ==
