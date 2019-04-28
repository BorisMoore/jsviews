(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
/*! JsRender v1.0.3: http://jsviews.com/#jsrender */
/*! **VERSION FOR WEB** (For NODE.JS see http://jsviews.com/download/jsrender-node.js) */
/*
 * Best-of-breed templating in browser or on Node.js.
 * Does not require jQuery, or HTML DOM
 * Integrates with JsViews (http://jsviews.com/#jsviews)
 *
 * Copyright 2019, Boris Moore
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

var versionNumber = "v1.0.3",
	jsvStoreName, rTag, rTmplString, topView, $views, $expando,
	_ocp = "_ocp", // Observable contextual parameter

//TODO	tmplFnsCache = {},
	$isFunction, $isArray, $templates, $converters, $helpers, $tags, $sub, $subSettings, $subSettingsAdvanced, $viewsSettings,
	delimOpenChar0, delimOpenChar1, delimCloseChar0, delimCloseChar1, linkChar, setting, baseOnError,

	isRenderCall,
	rNewLine = /[ \t]*(\r\n|\n|\r)/g,
	rUnescapeQuotes = /\\(['"])/g,
	rEscapeQuotes = /['"\\]/g, // Escape quotes and \ character
	rBuildHash = /(?:\x08|^)(onerror:)?(?:(~?)(([\w$.]+):)?([^\x08]+))\x08(,)?([^\x08]+)/gi,
	rTestElseIf = /^if\s/,
	rFirstElem = /<(\w+)[>\s]/,
	rAttrEncode = /[\x00`><"'&=]/g, // Includes > encoding since rConvertMarkers in JsViews does not skip > characters in attribute strings
	rIsHtml = /[\x00`><\"'&=]/,
	rHasHandlers = /^on[A-Z]|^convert(Back)?$/,
	rWrappedInViewMarker = /^\#\d+_`[\s\S]*\/\d+_`$/,
	rHtmlEncode = rAttrEncode,
	rDataEncode = /[&<>]/g,
	rDataUnencode = /&(amp|gt|lt);/g,
	rBracketQuote = /\[['"]?|['"]?\]/g,
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
	charsFromEntities  = {
		amp: "&",
		gt: ">",
		lt: "<"
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
			rPath: /^(!*?)(?:null|true|false|\d[\d.]*|([\w$]+|\.|~([\w$]+)|#(view|([\w$]+))?)([\w$.^]*?)(?:[.[^]([\w$]+)\]?)?)$/g,
			//        not                               object     helper    view  viewProperty pathTokens      leafToken

			rPrm: /(\()(?=\s*\()|(?:([([])\s*)?(?:(\^?)(~?[\w$.^]+)?\s*((\+\+|--)|\+|-|~(?![\w$])|&&|\|\||===|!==|==|!=|<=|>=|[<>%*:?\/]|(=))\s*|(!*?(@)?[#~]?[\w$.^]+)([([])?)|(,\s*)|(\(?)\\?(?:(')|("))|(?:\s*(([)\]])(?=[.^]|\s*$|[^([])|[)\]])([([]?))|(\s+)/g,
			//   lftPrn0           lftPrn         bound     path               operator     err                                          eq      path2 late            prn      comma  lftPrn2   apos quot        rtPrn  rtPrnDot                  prn2     space

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
					} else if (name) {
						$render[name] = item;
					}
				}
			},
			addSetting: addSetting,
			settings: {
				allowCode: false
			},
			advSet: noop, // Update advanced settings
			_thp: tagHandlersFromProps,
			_gm: getMethod,
			_tg: function() {}, // Constructor for tagDef
			_cnvt: convertVal,
			_tag: renderTag,
			_er: error,
			_err: onRenderError,
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
		method._d = (baseMethod && baseMethod._d || 0) + 1; // Add flag for derived method (incremented for derived of derived...)
	}
	return method;
}

function tagHandlersFromProps(tag, tagCtx) {
	var prop,
		props = tagCtx.props;
	for (prop in props) {
		if (rHasHandlers.test(prop) && !(tag[prop] && tag[prop].fix)) { // Don't override handlers with fix expando (used in datepicker and spinner)
			tag[prop] = prop !== "convert" ? getMethod(tag.constructor.prototype[prop], props[prop]) : props[prop];
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

	/**
	* Set the tag opening and closing delimiters and 'link' character. Default is "{{", "}}" and "^"
	* openChars, closeChars: opening and closing strings, each with two characters
	* $.views.settings.delimiters(...)
	*
	* @param {string}   openChars
	* @param {string}   [closeChars]
	* @param {string}   [link]
	* @returns {Settings}
	*
	* Get delimiters
	* delimsArray = $.views.settings.delimiters()
	*
	* @returns {string[]}
	*/
function $viewsDelimiters(openChars, closeChars, link) {
	if (!openChars) {
		return $subSettings.delimiters;
	}
	if ($isArray(openChars)) {
		return $viewsDelimiters.apply($views, openChars);
	}
	linkChar = link ? link[0] : linkChar;
	if (!/^(\W|_){5}$/.test(openChars + closeChars + linkChar)) {
		error("Invalid delimiters"); // Must be non-word characters, and openChars and closeChars must each be length 2
	}
	delimOpenChar0 = openChars[0];
	delimOpenChar1 = openChars[1];
	delimCloseChar0 = closeChars[0];
	delimCloseChar1 = closeChars[1];

	$subSettings.delimiters = [delimOpenChar0 + delimOpenChar1, delimCloseChar0 + delimCloseChar1, linkChar];

	// Escape the characters - since they could be regex special characters
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
		root = type === "root";
		// view.get("root") returns view.root, view.get() returns view.parent, view.get(true) returns view.views[0].

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
	} else if (type) {
		while (view && !found) {
			// Go through views - this one, and all parent ones - and return first one with given type.
			found = view.type === type ? view : undefined;
			view = view.parent;
		}
	} else {
		found = view.parent;
	}
	return found || undefined;
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

//==================
// View.ctxPrm, etc.
//==================

/* Internal private: view._getOb() */
function getPathObject(ob, path, ltOb, fn) {
	// Iterate through path to late paths: @a.b.c paths
	// Return "" (or noop if leaf is a function @a.b.c(...) ) if intermediate object not yet available
	var prevOb, tokens, l,
		i = 0;
	if (ltOb === 1) {
		fn = 1;
		ltOb = undefined;
	}
	// Paths like ^a^b^c or ~^a^b^c will not throw if an object in path is undefined.
	if (path) {
		tokens = path.split(".");
		l = tokens.length;

		for (; ob && i < l; i++) {
			prevOb = ob;
			ob = tokens[i] ? ob[tokens[i]] : ob;
		}
	}
	if (ltOb) {
		ltOb.lt = ltOb.lt || i<l; // If i < l there was an object in the path not yet available
	}
	return ob === undefined
		? fn ? noop : ""
		: fn ? function() {
			return ob.apply(prevOb, arguments);
		} : ob;
}

function contextParameter(key, value, get) {
	// Helper method called as view.ctxPrm(key) for helpers or template parameters ~foo - from compiled template or from context callback
	var wrapped, deps, res, obsCtxPrm, tagElse, callView, newRes,
		storeView = this,
		isUpdate = !isRenderCall && arguments.length > 1,
		store = storeView.ctx;
	if (key) {
		if (!storeView._) { // tagCtx.ctxPrm() call
			tagElse = storeView.index;
			storeView = storeView.tag;
		}
		callView = storeView;
		if (store && store.hasOwnProperty(key) || (store = $helpers).hasOwnProperty(key)) {
			res = store[key];
			if (key === "tag" || key === "tagCtx" || key === "root" || key === "parentTags" || storeView._.it === key ) {
				return res;
			}
		} else {
			store = undefined;
		}
		if (!isRenderCall && storeView.tagCtx || storeView.linked) { // Data-linked view, or tag instance
			if (!res || !res._cxp) {
				// Not a contextual parameter
				// Set storeView to tag (if this is a tag.ctxPrm() call) or to root view ("data" view of linked template)
				storeView = storeView.tagCtx || $isFunction(res)
					? storeView // Is a tag, not a view, or is a computed contextual parameter, so scope to the callView, no the 'scope view'
					: (storeView = storeView.scope || storeView,
						!storeView.isTop && storeView.ctx.tag // If this view is in a tag, set storeView to the tag
							|| storeView);
				if (res !== undefined && storeView.tagCtx) {
					// If storeView is a tag, but the contextual parameter has been set at at higher level (e.g. helpers)...
					storeView = storeView.tagCtx.view.scope; //  then move storeView to the outer level (scope of tag container view)
				}
				store = storeView._ocps;
				res = store && store.hasOwnProperty(key) && store[key] || res;
				if (!(res && res._cxp) && (get || isUpdate)) {
					// Create observable contextual parameter
					(store || (storeView._ocps = storeView._ocps || {}))[key]
						= res
						= [{
							_ocp: res, // The observable contextual parameter value
							_vw: callView,
							_key: key
						}];
					res._cxp = {
						path: _ocp,
						ind: 0,
						updateValue: function(val, path) {
							$.observable(res[0]).setProperty(_ocp, val); // Set the value (res[0]._ocp)
							return this;
						}
					};
				}
			}
			if (obsCtxPrm = res && res._cxp) {
				// If this helper resource is an observable contextual parameter
				if (arguments.length > 2) {
					deps = res[1] ? $sub._ceo(res[1].deps) : [_ocp]; // fn deps (with any exprObs cloned using $sub._ceo)
					deps.unshift(res[0]); // view
					deps._cxp = obsCtxPrm;
					// In a context callback for a contextual param, we set get = true, to get ctxPrm  [view, dependencies...] array - needed for observe call
					return deps;
				}
				tagElse = obsCtxPrm.tagElse;
				newRes = res[1] // linkFn for compiled expression
					? obsCtxPrm.tag && obsCtxPrm.tag.cvtArgs
						? obsCtxPrm.tag.cvtArgs(tagElse, 1)[obsCtxPrm.ind] // = tag.bndArgs() - for tag contextual parameter
						: res[1](res[0].data, res[0], $sub)    // = fn(data, view, $sub) for compiled binding expression
					: res[0]._ocp; // Observable contextual parameter (uninitialized, or initialized as static expression, so no path dependencies)
				if (isUpdate) {
					if (res && newRes !== value) {
						$sub._ucp(key, value, storeView, obsCtxPrm); // Update observable contextual parameter
					}
					return storeView;
				}
				res = newRes;
			}
		}
		if (res && $isFunction(res)) {
			// If a helper is of type function we will wrap it, so if called with no this pointer it will be called with the
			// view as 'this' context. If the helper ~foo() was in a data-link expression, the view will have a 'temporary' linkCtx property too.
			// Note that helper functions on deeper paths will have specific this pointers, from the preceding path.
			// For example, ~util.foo() will have the ~util object as 'this' pointer
			wrapped = function() {
				return res.apply((!this || this === global) ? callView : this, arguments);
			};
			$extend(wrapped, res); // Attach same expandos (if any) to the wrapped function
		}
		return wrapped || res;
	}
}

/* Internal private: view._getTmpl() */
function getTemplate(tmpl) {
	return tmpl && (tmpl.fn
		? tmpl
		: this.getRsc("templates", tmpl) || $templates(tmpl)); // not yet compiled
}

//==============
// views._cnvt
//==============

function convertVal(converter, view, tagCtx, onError) {
	// Called from compiled template code for {{:}}
	// self is template object or linkCtx object
	var tag, linkCtx, value, argsLen, bindTo,
		// If tagCtx is an integer, then it is the key for the compiled function to return the boundTag tagCtx
		boundTag = typeof tagCtx === "number" && view.tmpl.bnds[tagCtx-1];

	if (onError === undefined && boundTag && boundTag._lr) { // lateRender
		onError = "";
	}
	if (onError !== undefined) {
		tagCtx = onError = {props: {}, args: [onError]};
	} else if (boundTag) {
		tagCtx = boundTag(view.data, view, $sub);
	}
	boundTag = boundTag._bd && boundTag;
	if (converter || boundTag) {
		linkCtx = view._lc; // For data-link="{cvt:...}"... See onDataLinkedTagChange
		tag = linkCtx && linkCtx.tag;
		tagCtx.view = view;
		if (!tag) {
			tag = $extend(new $sub._tg(), {
				_: {
					bnd: boundTag,
					unlinked: true,
					lt: tagCtx.lt // If a late path @some.path has not returned @some object, mark tag as late
				},
				inline: !linkCtx,
				tagName: ":",
				convert: converter,
				onArrayChange: true,
				flow: true,
				tagCtx: tagCtx,
				tagCtxs: [tagCtx],
				_is: "tag"
			});
			argsLen = tagCtx.args.length;
			if (argsLen>1) {
				bindTo = tag.bindTo = [];
				while (argsLen--) {
					bindTo.unshift(argsLen); // Bind to all the arguments - generate bindTo array: [0,1,2...]
				}
			}
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
		value = tag.cvtArgs()[0]; // If there is a convertBack but no convert, converter will be "true"
		tag._er = onError && value;
	} else {
		value = tagCtx.args[0];
	}

	// Call onRender (used by JsViews if present, to add binding annotations around rendered content)
	value = boundTag && view._.onRender
		? view._.onRender(value, view, tag)
		: value;
	return value != undefined ? value : "";
}

function convertArgs(tagElse, bound) { // tag.cvtArgs() or tag.cvtArgs(tagElse?, true?)
	var l, key, boundArgs, args, bindFrom, tag, converter,
		tagCtx = this;

	if (tagCtx.tagName) {
		tag = tagCtx;
		tagCtx = (tag.tagCtxs || [tagCtx])[tagElse||0];
		if (!tagCtx) {
			return;
		}
	} else {
		tag = tagCtx.tag;
	}

	bindFrom = tag.bindFrom;
	args = tagCtx.args;

	if ((converter = tag.convert) && "" + converter === converter) {
		converter = converter === "true"
			? undefined
			: (tagCtx.view.getRsc("converters", converter) || error("Unknown converter: '" + converter + "'"));
	}

	if (converter && !bound) { // If there is a converter, use a copy of the tagCtx.args array for rendering, and replace the args[0] in
		args = args.slice(); // the copied array with the converted value. But we do not modify the value of tag.tagCtx.args[0] (the original args array)
	}
	if (bindFrom) { // Get the values of the boundArgs
		boundArgs = [];
		l = bindFrom.length;
		while (l--) {
			key = bindFrom[l];
			boundArgs.unshift(argOrProp(tagCtx, key));
		}
		if (bound) {
			args = boundArgs; // Call to bndArgs() - returns the boundArgs
		}
	}
	if (converter) {
		converter = converter.apply(tag, boundArgs || args);
		if (converter === undefined) {
			return args; // Returning undefined from a converter is equivalent to not having a converter.
		}
		bindFrom = bindFrom || [0];
		l = bindFrom.length;
		if (!$isArray(converter) || converter.length !== l) {
			converter = [converter];
			bindFrom = [0];
			l = 1;
		}
		if (bound) {        // Call to bndArgs() - so apply converter to all boundArgs
			args = converter; // The array of values returned from the converter
		} else {            // Call to cvtArgs()
			while (l--) {
				key = bindFrom[l];
				if (+key === key) {
					args[key] = converter[l];
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
	return this.cvtArgs(tagElse, 1);
}

//=============
// views.tag
//=============

/* view.getRsc() */
function getResource(resourceType, itemName) {
	var res, store,
		view = this;
	if ("" + itemName === itemName) {
		while ((res === undefined) && view) {
			store = view.tmpl && view.tmpl[resourceType];
			res = store && store[itemName];
			view = view.parent;
		}
		return res || $views[resourceType][itemName];
	}
}

function renderTag(tagName, parentView, tmpl, tagCtxs, isUpdate, onError) {
	function bindToOrBindFrom(type) {
		var bindArray = tag[type];

		if (bindArray !== undefined) {
			bindArray = $isArray(bindArray) ? bindArray : [bindArray];
			m = bindArray.length;
			while (m--) {
				key = bindArray[m];
				if (!isNaN(parseInt(key))) {
					bindArray[m] = parseInt(key); // Convert "0" to 0,  etc.
				}
			}
		}

		return bindArray || [0];
	}

	parentView = parentView || topView;
	var tag, tagDef, template, tags, attr, parentTag, l, m, n, itemRet, tagCtx, tagCtxCtx, ctxPrm, bindTo, bindFrom, initVal,
		content, callInit, mapDef, thisMap, args, bdArgs, props, tagDataMap, contentCtx, key, bindFromLength, bindToLength, linkedElement, defaultCtx,
		i = 0,
		ret = "",
		linkCtx = parentView._lc || false, // For data-link="{myTag...}"... See onDataLinkedTagChange
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
	if (onError === undefined && boundTag && (boundTag._lr = (tagDef.lateRender && boundTag._lr!== false || boundTag._lr))) {
		onError = ""; // If lateRender, set temporary onError, to skip initial rendering (and render just "")
	}
	if (onError !== undefined) {
		ret += onError;
		tagCtxs = onError = [{props: {}, args: [], params: {props:{}}}];
	} else if (boundTag) {
		tagCtxs = boundTag(parentView.data, parentView, $sub);
	}

	l = tagCtxs.length;
	for (; i < l; i++) {
		tagCtx = tagCtxs[i];
		content = tagCtx.tmpl;
		if (!linkCtx || !linkCtx.tag || i && !linkCtx.tag.inline || tag._er || content && +content===content) {
			// Initialize tagCtx
			// For block tags, tagCtx.tmpl is an integer > 0
			if (content && parentTmpl.tmpls) {
				tagCtx.tmpl = tagCtx.content = parentTmpl.tmpls[content - 1]; // Set the tmpl property to the content of the block tag
			}
			tagCtx.index = i;
			tagCtx.ctxPrm = contextParameter;
			tagCtx.render = renderContent;
			tagCtx.cvtArgs = convertArgs;
			tagCtx.bndArgs = convertBoundArgs;
			tagCtx.view = parentView;
			tagCtx.ctx = extendCtx(extendCtx(tagCtx.ctx, tagDef && tagDef.ctx), ctx); // Clone and extend parentView.ctx
		}
		if (tmpl = tagCtx.props.tmpl) {
			// If the tmpl property is overridden, set the value (when initializing, or, in case of binding: ^tmpl=..., when updating)
			tagCtx.tmpl = parentView._getTmpl(tmpl);
			tagCtx.content = tagCtx.content || tagCtx.tmpl;
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

			if (linkCtx) {
				tag.inline = false;
				linkCtx.tag = tag;
			}
			tag.linkCtx = linkCtx;
			if (tag._.bnd = boundTag || linkCtx.fn) {
				// Bound if {^{tag...}} or data-link="{tag...}"
				tag._.ths = tagCtx.params.props.this; // Tag has a this=expr binding, to get javascript reference to tag instance
				tag._.lt = tagCtxs.lt; // If a late path @some.path has not returned @some object, mark tag as late
				tag._.arrVws = {};
			} else if (tag.dataBoundOnly) {
				error(tagName + " must be data-bound:\n{^{" + tagName + "}}");
			}
			//TODO better perf for childTags() - keep child tag.tags array, (and remove child, when disposed)
			// tag.tags = [];
		} else if (linkCtx && linkCtx.fn._lr) {
			callInit = !!tag.init;
		}
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
			tagCtxCtx.tagCtx = tagCtx;
		}
	}
	if (!(tag._er = onError)) {
		tagHandlersFromProps(tag, tagCtxs[0]);
		tag.rendering = {rndr: tag.rendering}; // Provide object for state during render calls to tag and elses. (Used by {{if}} and {{for}}...)
		for (i = 0; i < l; i++) { // Iterate tagCtx for each {{else}} block
			tagCtx = tag.tagCtx = tagCtxs[i];
			props = tagCtx.props;
			tag.ctx = tagCtx.ctx;

			if (!i) {
				if (callInit) {
					tag.init(tagCtx, linkCtx, tag.ctx);
					callInit = undefined;
				}
				if (!tagCtx.args.length && tagCtx.argDefault !== false && tag.argDefault !== false) {
					tagCtx.args = args = [tagCtx.view.data]; // Missing first arg defaults to the current data context
					tagCtx.params.args = ["#data"];
				}

				bindTo = bindToOrBindFrom("bindTo");

				if (tag.bindTo !== undefined) {
					tag.bindTo = bindTo;
				}

				if (tag.bindFrom !== undefined) {
					tag.bindFrom = bindToOrBindFrom("bindFrom");
				} else if (tag.bindTo) {
					tag.bindFrom = tag.bindTo = bindTo;
				}
				bindFrom = tag.bindFrom || bindTo;

				bindToLength = bindTo.length;
				bindFromLength = bindFrom.length;

				if (tag._.bnd && (linkedElement = tag.linkedElement)) {
					tag.linkedElement = linkedElement = $isArray(linkedElement) ? linkedElement: [linkedElement];

					if (bindToLength !== linkedElement.length) {
						error("linkedElement not same length as bindTo");
					}
				}
				if (linkedElement = tag.linkedCtxParam) {
					tag.linkedCtxParam = linkedElement = $isArray(linkedElement) ? linkedElement: [linkedElement];

					if (bindFromLength !== linkedElement.length) {
						error("linkedCtxParam not same length as bindFrom/bindTo");
					}
				}

				if (bindFrom) {
					tag._.fromIndex = {}; // Hash of bindFrom index which has same path value as bindTo index. fromIndex = tag._.fromIndex[toIndex]
					tag._.toIndex = {}; // Hash of bindFrom index which has same path value as bindTo index. fromIndex = tag._.fromIndex[toIndex]
					n = bindFromLength;
					while (n--) {
						key = bindFrom[n];
						m = bindToLength;
						while (m--) {
							if (key === bindTo[m]) {
								tag._.fromIndex[m] = n;
								tag._.toIndex[n] = m;
							}
						}
					}
				}

				if (linkCtx) {
					// Set attr on linkCtx to ensure outputting to the correct target attribute.
					// Setting either linkCtx.attr or this.attr in the init() allows per-instance choice of target attrib.
					linkCtx.attr = tag.attr = linkCtx.attr || tag.attr || linkCtx._dfAt;
				}
				attr = tag.attr;
				tag._.noVws = attr && attr !== HTML;
			}
			args = tag.cvtArgs(i);
			if (tag.linkedCtxParam) {
				bdArgs = tag.cvtArgs(i, 1);
				m = bindFromLength;
				defaultCtx = tag.constructor.prototype.ctx;
				while (m--) {
					if (ctxPrm = tag.linkedCtxParam[m]) {
						key = bindFrom[m];
						initVal = bdArgs[m];
						// Create tag contextual parameter
						tagCtx.ctx[ctxPrm] = $sub._cp(
							defaultCtx && initVal === undefined ? defaultCtx[ctxPrm]: initVal,
							initVal !== undefined && argOrProp(tagCtx.params, key),
							tagCtx.view,
							tag._.bnd && {tag: tag, cvt: tag.convert, ind: m, tagElse: i}
						);
					}
				}
			}
			if ((mapDef = props.dataMap || tagDataMap) && (args.length || props.dataMap)) {
				thisMap = tagCtx.map;
				if (!thisMap || thisMap.src !== args[0] || isUpdate) {
					if (thisMap && thisMap.src) {
						thisMap.unmap(); // only called if observable map - not when only used in JsRender, e.g. by {{props}}
					}
					mapDef.map(args[0], tagCtx, thisMap, !tag._.bnd);
					thisMap = tagCtx.map;
				}
				args = [thisMap.tgt];
			}

			itemRet = undefined;
			if (tag.render) {
				itemRet = tag.render.apply(tag, args);
				if (parentView.linked && itemRet && !rWrappedInViewMarker.test(itemRet)) {
					// When a tag renders content from the render method, with data linking then we need to wrap with view markers, if absent,
					// to provide a contentView for the tag, which will correctly dispose bindings if deleted. The 'tmpl' for this view will
					// be a dumbed-down template which will always return the  itemRet string (no matter what the data is). The itemRet string
					// is not compiled as template markup, so can include "{{" or "}}" without triggering syntax errors
					tmpl = { // 'Dumbed-down' template which always renders 'static' itemRet string
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
			ret = ret
				? ret + (itemRet || "")
				: itemRet !== undefined
					? "" + itemRet
					: undefined; // If no return value from render, and no template/content tagCtx.render(...), return undefined
		}
		tag.rendering = tag.rendering.rndr; // Remove tag.rendering object (if this is outermost render call. (In case of nested calls)
	}
	tag.tagCtx = tagCtxs[0];
	tag.ctx = tag.tagCtx.ctx;

	if (tag._.noVws && tag.inline) {
		// inline tag with attr set to "text" will insert HTML-encoded content - as if it was element-based innerText
		ret = attr === "text"
			? $converters.html(ret)
			: "";
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
		// If the data is an array, this is an 'array view' with a views array for each child 'item view'
		// If the data is not an array, this is an 'item view' with a views 'hash' object for any child nested views

	self.content = contentTmpl;
	self.views = isArray ? [] : {};
	self.data = data;
	self.tmpl = template;
	self_ = self._ = {
		key: 0,
		// ._.useKey is non zero if is not an 'array view' (owning a data array). Use this as next key for adding to child views hash
		useKey: isArray ? 0 : 1,
		id: "" + viewId++,
		onRender: onRender,
		bnds: {}
	};
	self.linked = !!onRender;
	self.type = type || "top";
	if (self.parent = parentView) {
		self.root = parentView.root || self; // view whose parent is top view
		views = parentView.views;
		parentView_ = parentView._;
		self.isTop = parentView_.scp; // Is top content view of a link("#container", ...) call
		self.scope = (!context.tag || context.tag === parentView.ctx.tag) && !self.isTop && parentView.scope || self;
		// Scope for contextParams - closest non flow tag ancestor or root view
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
		if (type) {
			self.root = self; // view whose parent is top view
		}
	}
}

View.prototype = {
	get: getView,
	getIndex: getIndex,
	ctxPrm: contextParameter,
	getRsc: getResource,
	_getTmpl: getTemplate,
	_getOb: getPathObject,
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
			unlinked: true
		};
		tag.inline = true;
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
		baseTag = "" + baseTag === baseTag
			? (parentTmpl && parentTmpl.tags[baseTag] || $tags[baseTag])
			: baseTag;
		if (!baseTag) {
			error('baseTag: "' + tagDef.baseTag + '" not found');
		}
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
				if (elem.tagName !== "SCRIPT") {
					error(value + ": Use script block, not " + elem.tagName);
				}
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
	$sub._html = $converters.html;

	//==== Compile the template ====
	if (options === 0) {
		options = undefined;
		tmplOrMarkup = lookupTemplate(tmplOrMarkup); // Top-level compile so do a template lookup
	}

	// If options, then this was already compiled from a (script) element template declaration.
	// If not, then if tmpl is a template object, use it for options
	options = options || (tmpl.markup
		? tmpl.bnds
			? $extend({}, tmpl)
			: tmpl
		: {}
	);

	options.tmplName = options.tmplName || name || "unnamed";
	if (parentTmpl) {
		options._parentTmpl = parentTmpl;
	}
	// If tmpl is not a markup string or a selector string, then it must be a template object
	// In that case, get it from the markup property of the object
	if (!tmplOrMarkup && tmpl.markup && (tmplOrMarkup = lookupTemplate(tmpl.markup)) && tmplOrMarkup.fn) {
		// If the string references a compiled template object, need to recompile to merge any modified options
		tmplOrMarkup = tmplOrMarkup.markup;
	}
	if (tmplOrMarkup !== undefined) {
		if (tmplOrMarkup.render || tmpl.render) {
			// tmpl is already compiled, so use it
			if (tmplOrMarkup.tmpls) {
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

function addParentRef(ob, ref, parent) {
	Object.defineProperty(ob, ref, {
		value: parent,
		configurable: true
	});
}

function compileViewModel(name, type) {
	var i, constructor, parent,
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
		cnstr = "",
		getterCount = getters ? getters.length : 0,
		$observable = $.observable,
		getterNames = {};

	function JsvVm(args) {
		constructor.apply(this, args);
	}

	function vm() {
		return new JsvVm(arguments);
	}

	function iterate(data, action) {
		var getterType, defaultVal, prop, ob, parentRef,
			j = 0;
		for (; j < getterCount; j++) {
			prop = getters[j];
			getterType = undefined;
			if (prop + "" !== prop) {
				getterType = prop;
				prop = getterType.getter;
				parentRef = getterType.parentRef;
			}
			if ((ob = data[prop]) === undefined && getterType && (defaultVal = getterType.defaultVal) !== undefined) {
				ob = getDefaultVal(defaultVal, data);
			}
			action(ob, getterType && viewModels[getterType.type], prop, parentRef);
		}
	}

	function map(data) {
		data = data + "" === data
			? JSON.parse(data) // Accept JSON string
			: data;            // or object/array
		var l, prop, childOb, parentRef,
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
			ob = this.apply(this, arr); // Instantiate this View Model, passing getters args array to constructor
			j = getterCount;
			while (j--) {
				childOb = arr[j];
				parentRef = getters[j].parentRef;
				if (parentRef && childOb && childOb.unmap) {
					if ($isArray(childOb)) {
						l = childOb.length;
						while (l--) {
							addParentRef(childOb[l], parentRef, ob);
						}
					} else {
						addParentRef(childOb, parentRef, ob);
					}
				}
			}
			for (prop in data) { // Copy over any other properties. that are not get/set properties
				if (prop !== $expando && !getterNames[prop]) {
					ob[prop] = data[prop];
				}
			}
		}
		return ob;
	}

	function merge(data, parent, parentRef) {
		data = data + "" === data
			? JSON.parse(data) // Accept JSON string
			: data;            // or object/array

		var j, l, m, prop, mod, found, assigned, ob, newModArr, childOb,
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
					newModArr.push(childOb = vm.map(ob));
					if (parentRef) {
						addParentRef(childOb, parentRef, parent);
					}
				}
			}
			if ($observable) {
				$observable(model).refresh(newModArr, true);
			} else {
				model.splice.apply(model, [0, model.length].concat(newModArr));
			}
			return;
		}
		iterate(data, function(ob, viewModel, getter, parentRef) {
			if (viewModel) {
				model[getter]().merge(ob, model, parentRef); // Update typed property
			} else if (model[getter]() !== ob) {
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

		function unmapArray(modelArr) {
			var arr = [],
				i = 0,
				l = modelArr.length;
			for (; i<l; i++) {
				arr.push(modelArr[i].unmap());
			}
			return arr;
		}

		if ($isArray(model)) {
			return unmapArray(model);
		}
		ob = {};
		for (; k < getterCount; k++) {
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
			if (model.hasOwnProperty(prop) && (prop.charAt(0) !== "_" || !getterNames[prop.slice(1)]) && prop !== $expando  && !$isFunction(model[prop])) {
				ob[prop] = model[prop];
			}
		}
		return ob;
	}

	JsvVm.prototype = proto;

	for (i=0; i < getterCount; i++) {
		(function(getter) {
			getter = getter.getter || getter;
			getterNames[getter] = i+1;
			var privField = "_" + getter;

			args += (args ? "," : "") + getter;
			cnstr += "this." + privField + " = " + getter + ";\n";
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

	// Constructor for new viewModel instance.
	cnstr = new Function(args, cnstr);

	constructor = function() {
		cnstr.apply(this, arguments);
		// Pass additional parentRef str and parent obj to have a parentRef pointer on instance
		if (parent = arguments[getterCount + 1]) {
			addParentRef(this, arguments[getterCount], parent);
		}
	};

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
		tmpl = {
			tmpls: [],
			links: {}, // Compiled functions for link expressions
			bnds: [],
			_is: "template",
			render: renderContent
		};

	if (options) {
		tmpl = $extend(tmpl, options);
	}

	tmpl.markup = markup;
	if (!tmpl.htmlTag) {
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

/**
* Internal. Register a store type (used for template, tags, helpers, converters)
*/
function registerStore(storeName, storeSettings) {

/**
* Generic store() function to register item, named item, or hash of items
* Also used as hash to store the registered items
* Used as implementation of $.templates(), $.views.templates(), $.views.tags(), $.views.helpers() and $.views.converters()
*
* @param {string|hash} name         name - or selector, in case of $.templates(). Or hash of items
* @param {any}         [item]       (e.g. markup for named template)
* @param {template}    [parentTmpl] For item being registered as private resource of template
* @returns {any|$.views} item, e.g. compiled template - or $.views in case of registering hash of items
*/
	function theStore(name, item, parentTmpl) {
		// The store is also the function used to add items to the store. e.g. $.templates, or $.views.tags

		// For store of name 'thing', Call as:
		//    $.views.things(items[, parentTmpl]),
		// or $.views.things(name[, item, parentTmpl])

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

		if (item === undefined) {
			item = compile ? name : thisStore[name];
			name = undefined;
		}
		if (item === null) {
			// If item is null, delete this entry
			if (name) {
				delete thisStore[name];
			}
		} else {
			if (compile) {
				item = compile.call(thisStore, name, item, parentTmpl, 0) || {};
				item._is = storeName; // Only do this for compiled objects (tags, templates...)
			}
			if (name) {
				thisStore[name] = item;
			}
		}
		if (onStore) {
			// e.g. JsViews integration
			onStore(name, item, parentTmpl, compile);
		}
		return item;
	}

	var storeNames = storeName + "s";
	$views[storeNames] = theStore;
}

/**
* Add settings such as:
* $.views.settings.allowCode(true)
* @param {boolean}  value
* @returns {Settings}
*
* allowCode = $.views.settings.allowCode()
* @returns {boolean}
*/
function addSetting(st) {
	$viewsSettings[st] = $viewsSettings[st] || function(value) {
		return arguments.length
			? ($subSettings[st] = value, $viewsSettings)
			: $subSettings[st];
	};
}

//========================
// dataMap for render only
//========================

function dataMap(mapDef) {
	function Map(source, options) {
		this.tgt = mapDef.getTgt(source, options);
		options.map = this;
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

/** Render the template as a string, using the specified data and helpers/context
* $("#tmpl").render(), tmpl.render(), tagCtx.render(), $.render.namedTmpl()
*
* @param {any}        data
* @param {hash}       [context]           helpers or context
* @param {boolean}    [noIteration]
* @param {View}       [parentView]        internal
* @param {string}     [key]               internal
* @param {function}   [onRender]          internal
* @returns {string}   rendered template   internal
*/
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
		tmpl = view._getTmpl(tag.template || tagCtx.tmpl);
		if (!arguments.length) {
			data = tag.contentCtx && $isFunction(tag.contentCtx)
				? data = tag.contentCtx(data)
				: view; // Default data context for wrapped block content is the first argument
		}
	} else {
		// This is a template.render(...) call
		tmpl = this;
	}

	if (tmpl) {
		if (!parentView && data && data._is === "view") {
			view = data; // When passing in a view to render or link (and not passing in a parent view) use the passed-in view as parentView
		}

		if (view && data === view) {
			// Inherit the data from the parent view.
			data = view.data;
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
				prevData = view.data;
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
	var i, l, newView, childView, itemResult, swapContent, contentTmpl, outerOnRender, tmplName, itemVar, newCtx, tagCtx, noLinking,
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
			if (itemVar[0] !== "~") {
				syntaxError("Use itemVar='~myItem'");
			}
			itemVar = itemVar.slice(1);
		}
	}

	if (view) {
		onRender = onRender || view._.onRender;
		noLinking = context && context.link === false;

		if (noLinking && view._.nl) {
			onRender = undefined;
		}

		context = extendCtx(context, view.ctx);
	}

	if (key === true) {
		swapContent = true;
		key = 0;
	}

	// If link===false, do not call onRender, so no data-linking marker nodes
	if (onRender && tag && tag._.noVws) {
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
		newView._.nl= noLinking;
		if (view && view._.useKey) {
			// Parent is not an 'array view'
			newView._.bnd = !tag || tag._.bnd && tag; // For array views that are data bound for collection change events, set the
			// view._.bnd property to true for top-level link() or data-link="{for}", or to the tag instance for a data-bound tag, e.g. {^{for ...}}
			newView.tag = tag;
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
		// Create a view for singleton data object. The type of the view will be the tag name, e.g. "if" or "mytag" except for
		// "item", "array" and "data" views. A "data" view is from programmatic render(object) against a 'singleton'.
		if (itemVar) {
			setItemVar(data);
		}
		newView = swapContent ? view : new View(newCtx, tmplName || "data", view, data, tmpl, key, onRender, contentTmpl);
		newView._.it = itemVar;
		newView.tag = tag;
		newView._.nl = noLinking;
		result += tmpl.fn(data, newView, $sub);
	}
	if (tag) {
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
	return view && !view._lc ? $converters.html(message) : message; // For data-link=\"{... onError=...}"... See onDataLinkedTagChange
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

		var late, openTagName, isLateOb,
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
					syntaxError('For "{{else if expr}}" use "{{else expr}}"');
				}
				pathBindings = current[9] && [[]];
				current[10] = markup.substring(current[10], index); // contentMarkup for block tag
				openTagName = current[11] || current[0] || syntaxError("Mismatched: " + all);
				// current[0] is tagName, but for {{else}} nodes, current[11] is tagName of preceding open tag
				current = stack.pop();
				content = current[2];
				block = true;
			}
			if (params) {
				// remove newlines from the params string, to avoid compiled code errors for unterminated strings
				parseParams(params.replace(rNewLine, " "), pathBindings, tmpl, isLinkExpr)
					.replace(rBuildHash, function(all, onerror, isCtxPrm, key, keyToken, keyValue, arg, param) {
						if (key === "this:") {
							keyValue = "undefined"; // this=some.path is always a to parameter (one-way), so don't need to compile/evaluate some.path initialization
						}
						if (param) {
							isLateOb = isLateOb || param[0] === "@";
						}
						key = "'" + keyToken + "':";
						if (arg) {
							args += isCtxPrm + keyValue + ",";
							paramsArgs += "'" + param + "',";
						} else if (isCtxPrm) { // Contextual parameter, ~foo=expr
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
								late = param !== "false"; // Render after first pass
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
					isLateOb,
					pathBindings || 0
				];
			content.push(newNode);
			if (block) {
				stack.push(current);
				current = newNode;
				current[10] = loc; // Store current location of open tag, to be able to add contentMarkup when we reach closing tag
				current[11] = openTagName; // Used for checking syntax (matching close tag)
			}
		} else if (closeBlock) {
			blockTagCheck(closeBlock !== current[0] && closeBlock !== current[11] && closeBlock, current[0]); // Check matching close tag name
			current[10] = markup.substring(current[10], index); // contentMarkup for block tag
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
		blockTagCheck("" + loc !== loc && (+loc[10] === loc[10]) && loc[0]);
	}
//			result = tmplFnsCache[markup] = buildCode(astTop, tmpl);
//		}

	if (isLinkExpr) {
		result = buildCode(astTop, markup, isLinkExpr);
		bindings = [];
		i = astTop.length;
		while (i--) {
			bindings.unshift(astTop[i][9]); // With data-link expressions, pathBindings array for tagCtx[i] is astTop[i][9]
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
		+ 'args:[' + parts[0] + '],\n\tprops:{' + parts[1] + '}'
		+ (parts[2] ? ',\n\tctx:{' + parts[2] + '}' : "");
}

function parseParams(params, pathBindings, tmpl, isLinkExpr) {

	function parseTokens(all, lftPrn0, lftPrn, bound, path, operator, err, eq, path2, late, prn, comma, lftPrn2, apos, quot, rtPrn, rtPrnDot, prn2, space, index, full) {
	// /(\()(?=\s*\()|(?:([([])\s*)?(?:(\^?)(~?[\w$.^]+)?\s*((\+\+|--)|\+|-|~(?![\w$])|&&|\|\||===|!==|==|!=|<=|>=|[<>%*:?\/]|(=))\s*|(!*?(@)?[#~]?[\w$.^]+)([([])?)|(,\s*)|(\(?)\\?(?:(')|("))|(?:\s*(([)\]])(?=[.^]|\s*$|[^([])|[)\]])([([]?))|(\s+)/g,
	//lftPrn0           lftPrn         bound     path               operator     err                                          eq      path2 late            prn      comma  lftPrn2   apos quot        rtPrn  rtPrnDot                  prn2     space
	// (left paren? followed by (path? followed by operator) or (path followed by paren?)) or comma or apos or quot or right paren or space

		function parsePath(allPath, not, object, helper, view, viewProperty, pathTokens, leafToken) {
			// /^(!*?)(?:null|true|false|\d[\d.]*|([\w$]+|\.|~([\w$]+)|#(view|([\w$]+))?)([\w$.^]*?)(?:[.[^]([\w$]+)\]?)?)$/g,
			//    not                               object     helper    view  viewProperty pathTokens      leafToken
			var subPath = object === ".";
			if (object) {
				path = path.slice(not.length);
				if (/^\.?constructor$/.test(leafToken||path)) {
					syntaxError(allPath);
				}
				if (!subPath) {
					allPath = (late // late path @a.b.c: not throw on 'property of undefined' if a undefined, and will use _getOb() after linking to resolve late.
							? (isLinkExpr ? '' : '(ltOb.lt=ltOb.lt||') + '(ob='
							: ""
						)
						+ (helper
							? 'view.ctxPrm("' + helper + '")'
							: view
								? "view"
								: "data")
						+ (late
							? ')===undefined' + (isLinkExpr ? '' : ')') + '?"":view._getOb(ob,"'
							: ""
						)
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
						: allPath)
					+ (late
							? (isLinkExpr ? '"': '",ltOb') + (prn ? ',1)':')')
							: ""
						);
				}
				if (bindings) {
					binds = named === "_linkTo" ? (bindto = pathBindings._jsvto = pathBindings._jsvto || []) : bndCtx.bd;
					if (theOb = subPath && binds[binds.length-1]) {
						if (theOb._cpfn) { // Computed property exprOb
							while (theOb.sb) {
								theOb = theOb.sb;
							}
							if (theOb.bnd) {
								path = "^" + path.slice(1);
							}
							theOb.sb = path;
							theOb.bnd = theOb.bnd || path[0] === "^";
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

		if (late && (late = !/\)|]/.test(full[index-1]))) {
			path = path.slice(1).split(".").join("^"); // Late path @z.b.c. Use "^" rather than "." to ensure that deep binding will be used
		}
		// Could do this - but not worth perf cost?? :-
		// if (!path.lastIndexOf("#data.", 0)) { path = path.slice(6); } // If path starts with "#data.", remove that.
		prn = prn || prn2 || "";

		var expr, exprFn, binds, theOb, newOb,
			rtSq = ")";

		if (prn === "[") {
			prn = "[j._sq(";
			rtSq = ")]";
		}

		if (err && !aposed && !quoted) {
			syntaxError(params);
		} else {
			if (bindings && rtPrnDot && !aposed && !quoted) {
				// This is a binding to a path in which an object is returned by a helper/data function/expression, e.g. foo()^x.y or (a?b:c)^x.y
				// We create a compiled function to get the object instance (which will be called when the dependent data of the subexpression changes, to return the new object, and trigger re-binding of the subsequent path)
				if (parenDepth) {
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
							? (parenDepth && syntaxError(params), bindings && pathBindings.pop(), named = "_" + path, boundName = bound, paramIndex = index + all.length,
									bindings && ((bindings = bndCtx.bd = pathBindings[named] = []), bindings.skp = !bound), path + ':')
							: path
				// path
								? (path.split("^").join(".").replace($sub.rPath, parsePath)
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
		result;

	if (params[0] === "@") {
		params = params.replace(rBracketQuote, ".");
	}
	result = (params + (tmpl ? " " : "")).replace($sub.rPrm, parseTokens);

	return !parenDepth && result || syntaxError(params); // Syntax error if unbalanced parens in params expression
}

function buildCode(ast, tmpl, isLinkExpr) {
	// Build the template function code from the AST nodes, and set as property on the passed-in template object
	// Used for compiling templates, and also by JsViews to build functions for data link expressions
	var i, node, tagName, converter, tagCtx, hasTag, hasEncoder, getsVal, hasCnvt, useCnvt, tmplBindings, pathBindings, params, boundOnErrStart,
		boundOnErrEnd, tagRender, nestedTmpls, tmplName, nestedTmpl, tagAndElses, content, markup, nextIsElse, oldCode, isElse, isGetVal, tagCtxFn,
		onError, tagStart, trigger, lateRender, retStrOpen, retStrClose,
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
				trigger = node[6];
				lateRender = node[7];
				if (node[8]) { // latePath @a.b.c or @~a.b.c
					retStrOpen = "\nvar ob,ltOb={},ctxs=";
					retStrClose = ";\nctxs.lt=ltOb.lt;\nreturn ctxs;";
				} else {
					retStrOpen = "\nreturn ";
					retStrClose = "";
				}
				markup = node[10] && node[10].replace(rUnescapeQuotes, "$1");
				if (isElse = tagName === "else") {
					if (pathBindings) {
						pathBindings.push(node[9]);
					}
				} else {
					onError = node[5] || $subSettings.debugMode !== false && "undefined"; // If debugMode not false, set default onError handler on tag to "undefined" (see onRenderError)
					if (tmplBindings && (pathBindings = node[9])) { // Array of paths, or false if not data-bound
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

				if (isGetVal && (pathBindings || trigger || converter && converter !== HTML || lateRender)) {
					// For convertVal we need a compiled function to return the new tagCtx(s)
					tagCtxFn = new Function("data,view,j,u", "// " + tmplName + " " + (++tmplBindingKey) + " " + tagName
						+ retStrOpen + "{" + tagCtx + "};" + retStrClose);
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
					: (hasTag = true, "\n{view:view,content:false,tmpl:" // Add this tagCtx to the compiled code for the tagCtxs to be passed to renderTag()
						+ (content ? nestedTmpls.length : "false") + "," // For block tags, pass in the key (nestedTmpls.length) to the nested content template
						+ tagCtx + "},"));

				if (tagAndElses && !nextIsElse) {
					// This is a data-link expression or an inline tag without any elses, or the last {{else}} of an inline tag
					// We complete the code for returning the tagCtxs array
					code = "[" + code.slice(0, -1) + "]";
					tagRender = 't("' + tagAndElses + '",view,this,';
					if (isLinkExpr || pathBindings) {
						// This is a bound tag (data-link expression or inline bound tag {^{tag ...}}) so we store a compiled tagCtxs function in tmp.bnds
						code = new Function("data,view,j,u", " // " + tmplName + " " + tmplBindingKey + " " + tagAndElses + retStrOpen + code
							+ retStrClose);
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
					code = oldCode + tagStart + tagRender + (pathBindings && tmplBindingKey || code) + ")";
					pathBindings = 0;
					tagAndElses = 0;
				}
				if (onError && !nextIsElse) {
					useViews = true;
					code += ';\n}catch(e){ret' + (isLinkExpr ? "urn " : "+=") + boundOnErrStart + 'j._err(e,view,' + onError + ')' + boundOnErrEnd + ';}' + (isLinkExpr ? "" : 'ret=ret');
				}
			}
		}
	}
	// Include only the var references that are needed in the code
	code = "// " + tmplName
		+ (tmplOptions.debug ? "\ndebugger;" : "")
		+ "\nvar v"
		+ (hasTag ? ",t=j._tag" : "")                // has tag
		+ (hasCnvt ? ",c=j._cnvt" : "")              // converter
		+ (hasEncoder ? ",h=j._html" : "")           // html converter
		+ (isLinkExpr
				? (node[8]  // late @... path?
						? ", ob"
						: ""
					) + ";\n"
				: ',ret=""')
		+ code
		+ (isLinkExpr ? "\n" : ";\nreturn ret;");

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

function getTargetProps(source, tagCtx) {
	// this pointer is theMap - which has tagCtx.props too
	// arguments: tagCtx.args.
	var key, prop,
		map = tagCtx.map,
		propsArr = map && map.propsArr;

	if (!propsArr) { // map.propsArr is the full array of {key:..., prop:...} objects
		propsArr = [];
		if (typeof source === OBJECT || $isFunction(source)) {
			for (key in source) {
				prop = source[key];
				if (key !== $expando && source.hasOwnProperty(key) && (!tagCtx.props.noFunctions || !$.isFunction(prop))) {
					propsArr.push({key: key, prop: prop});
				}
			}
		}
		if (map) {
			map.propsArr = map.options && propsArr; // If bound {^{props}} and not isRenderCall, store propsArr on map (map.options is defined only for bound, && !isRenderCall)
		}
	}
	return getTargetSorted(propsArr, tagCtx); // Obtains map.tgt, by filtering, sorting and splicing the full propsArr
}

function getTargetSorted(value, tagCtx) {
	// getTgt
	var mapped, start, end,
		tag = tagCtx.tag,
		props = tagCtx.props,
		propParams = tagCtx.params.props,
		filter = props.filter,
		sort = props.sort,
		directSort = sort === true,
		step = parseInt(props.step),
		reverse = props.reverse ? -1 : 1;

	if (!$isArray(value)) {
		return value;
	}
	if (directSort || sort && "" + sort === sort) {
		// Temporary mapped array holds objects with index and sort-value
		mapped = value.map(function(item, i) {
			item = directSort ? item : getPathObject(item, sort);
			return {i: i, v: "" + item === item ? item.toLowerCase() : item};
		});
		// Sort mapped array
		mapped.sort(function(a, b) {
			return a.v > b.v ? reverse : a.v < b.v ? -reverse : 0;
		});
		// Map to new array with resulting order
		value = mapped.map(function(item){
			return value[item.i];
		});
	} else if ((sort || reverse < 0) && !tag.dataMap) {
		value = value.slice(); // Clone array first if not already a new array
	}
	if ($isFunction(sort)) {
		value = value.sort(function() { // Wrap the sort function to provide tagCtx as 'this' pointer
			return sort.apply(tagCtx, arguments);
		});
	}
	if (reverse < 0 && (!sort || $isFunction(sort))) { // Reverse result if not already reversed in sort
		value = value.reverse();
	}

	if (value.filter && filter) { // IE8 does not support filter
		value = value.filter(filter, tagCtx);
		if (tagCtx.tag.onFilter) {
			tagCtx.tag.onFilter(tagCtx);
		}
	}

	if (propParams.sorted) {
		mapped = (sort || reverse < 0) ? value : value.slice();
		if (tag.sorted) {
			$.observable(tag.sorted).refresh(mapped); // Note that this might cause the start and end props to be modified - e.g. by pager tag control
		} else {
			tagCtx.map.sorted = mapped;
		}
	}

	start = props.start; // Get current value - after possible  changes triggered by tag.sorted refresh() above
	end = props.end;
	if (propParams.start && start === undefined || propParams.end && end === undefined) {
		start = end = 0;
	}
	if (!isNaN(start) || !isNaN(end)) { // start or end specified, but not the auto-create Number array scenario of {{for start=xxx end=yyy}}
		start = +start || 0;
		end = end === undefined || end > value.length ? value.length : +end;
		value = value.slice(start, end);
	}
	if (step > 1) {
		start = 0;
		end = value.length;
		mapped = [];
		for (; start<end; start+=step) {
			mapped.push(value[start]);
		}
		value = mapped;
	}
	if (propParams.paged && tag.paged) {
		$observable(tag.paged).refresh(value);
	}

	return value;
}

/** Render the template as a string, using the specified data and helpers/context
* $("#tmpl").render()
*
* @param {any}        data
* @param {hash}       [helpersOrContext]
* @param {boolean}    [noIteration]
* @returns {string}   rendered template
*/
function $fnRender(data, context, noIteration) {
	var tmplElem = this.jquery && (this[0] || error('Unknown template')), // Targeted element not found for jQuery template selector such as "#myTmpl"
		tmpl = tmplElem.getAttribute(tmplAttr);

	return renderContent.call(tmpl && $.data(tmplElem)[jsvTmpl] || $templates(tmplElem),
		data, context, noIteration);
}

//========================== Register converters ==========================

function getCharEntity(ch) {
	// Get character entity for HTML, Attribute and optional data encoding
	return charEntities[ch] || (charEntities[ch] = "&#" + ch.charCodeAt(0) + ";");
}

function getCharFromEntity(match, token) {
	// Get character from HTML entity, for optional data unencoding
	return charsFromEntities[token] || "";
}

function htmlEncode(text) {
	// HTML encode: Replace < > & ' " ` etc. by corresponding entities.
	return text != undefined ? rIsHtml.test(text) && ("" + text).replace(rHtmlEncode, getCharEntity) || text : "";
}

function dataEncode(text) {
	// Encode just < > and & - intended for 'safe data' along with {{:}} rather than {{>}}
  return "" + text === text ? text.replace(rDataEncode, getCharEntity) : text;
}

function dataUnencode(text) {
  // Unencode just < > and & - intended for 'safe data' along with {{:}} rather than {{>}}
  return "" + text === text ? text.replace(rDataUnencode, getCharFromEntity) : text;
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
			if (versionNumber !== (versionNumber = $.views.jsviews)) {
				// Different version of jsRender was loaded
				throw "JsObservable requires JsRender " + versionNumber;
			}
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

	/**
	* $.views.settings.debugMode(true)
	* @param {boolean}  debugMode
	* @returns {Settings}
	*
	* debugMode = $.views.settings.debugMode()
	* @returns {boolean}
	*/
	($viewsSettings.debugMode = function(debugMode) {
		return debugMode === undefined
			? $subSettings.debugMode
			: (
				$subSettings.debugMode = debugMode,
				$subSettings.onError = debugMode + "" === debugMode
					? function() { return debugMode; }
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
					ret = (self.rendering.done || !val && (tagCtx.args.length || !tagCtx.index))
						? ""
						: (self.rendering.done = true,
							self.selected = tagCtx.index,
							undefined); // Test is satisfied, so render content on current context
				return ret;
			},
			contentCtx: true, // Inherit parent view data context
			flow: true
		},
		"for": {
			sortDataMap: dataMap(getTargetSorted),
			init: function(val, cloned) {
				this.setDataMap(this.tagCtxs);
			},
			render: function(val) {
				// This function is called once for {{for}} and once for each {{else}}.
				// We will use the tag.rendering object for carrying rendering state across the calls.
				var value, filter, srtField, isArray, i, sorted, end, step,
					self = this,
					tagCtx = self.tagCtx,
					range = tagCtx.argDefault === false,
					props = tagCtx.props,
					iterate =  range || tagCtx.args.length, // Not final else and not auto-create range
					result = "",
					done = 0;

				if (!self.rendering.done) {
					value = iterate ? val : tagCtx.view.data; // For the final else, defaults to current data without iteration.

					if (range) {
						range = props.reverse ? "unshift" : "push";
						end = +props.end;
						step = +props.step || 1;
						value = []; // auto-create integer array scenario of {{for start=xxx end=yyy}}
						for (i = +props.start || 0; (end - i) * step > 0; i += step) {
							value[range](i);
						}
					}
					if (value !== undefined) {
						isArray = $isArray(value);
						result += tagCtx.render(value, !iterate || props.noIteration);
						// Iterates if data is an array, except on final else - or if noIteration property
						// set to true. (Use {{include}} to compose templates without array iteration)
						done += isArray ? value.length : 1;
					}
					if (self.rendering.done = done) {
						self.selected = tagCtx.index;
					}
					// If nothing was rendered we will look at the next {{else}}. Otherwise, we are done.
				}
				return result;
			},
			setDataMap: function(tagCtxs) {
				var tagCtx, props, paramsProps,
					self = this,
					l = tagCtxs.length;
				while (l--) {
					tagCtx = tagCtxs[l];
					props = tagCtx.props;
					paramsProps = tagCtx.params.props;
					tagCtx.argDefault = props.end === undefined || tagCtx.args.length > 0; // Default to #data except for auto-create range scenario {{for start=xxx end=yyy step=zzz}}
					props.dataMap = (tagCtx.argDefault !== false && $isArray(tagCtx.args[0]) &&
						(paramsProps.sort || paramsProps.start || paramsProps.end || paramsProps.step || paramsProps.filter || paramsProps.reverse
						|| props.sort || props.start || props.end || props.step || props.filter || props.reverse))
						&& self.sortDataMap;
				}
			},
			flow: true
		},
		props: {
			baseTag: "for",
			dataMap: dataMap(getTargetProps),
			init: noop, // Don't execute the base init() of the "for" tag
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
		encode: dataEncode,
		unencode: dataUnencode, // Includes > encoding since rConvertMarkers in JsViews does not skip > characters in attribute strings
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

browserify.done.one = true;

QUnit.module("Browserify - client code");

var isIE8 = window.attachEvent && !window.addEventListener;

if (!isIE8) {

test("No jQuery global: require('jsrender')()", function() {
	// ............................... Hide QUnit global jQuery and any previous global jsrender.................................
	var jQuery = global.jQuery, jsr = global.jsrender;
	global.jQuery = global.jsrender = undefined;

	// =============================== Arrange ===============================
	var data = {name: "Jo"};

	// ................................ Act ..................................
	var jsrender = require('jsrender')(); // Not passing in jQuery, so returns the jsrender namespace

	// Use require to get server template, thanks to Browserify bundle that used jsrender/tmplify transform
	var tmpl = require('../templates/name-template.html')(jsrender); // Provide jsrender

	var result = tmpl(data);

	result += " " + (jsrender !== jQuery);

	// ............................... Assert .................................
	equal(result, "Name: Jo (name-template.html) true", "result: No jQuery global: require('jsrender')()");

	// ............................... Reset .................................
	global.jQuery = jQuery; // Replace QUnit global jQuery
	global.jsrender = jsr; // Replace any previous global jsrender
});
}
})();

}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})

},{"../templates/name-template.html":3,"jsrender":1}],3:[function(require,module,exports){
(function (global){
var tmplRefs = [],
  mkup = 'Name: {{:name}} (name-template.html)',
  $ = global.jsrender || global.jQuery;

module.exports = $ ? $.templates("./test/templates/name-template.html", mkup) :
  function($) {
    if (!$ || !$.views) {throw "Requires jsrender/jQuery";}
    while (tmplRefs.length) {
      tmplRefs.pop()($); // compile nested template
    }

    return $.templates("./test/templates/name-template.html", mkup)
  };
}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})

},{}]},{},[2])
//# sourceMappingURL=data:application/json;charset:utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJub2RlX21vZHVsZXMvanNyZW5kZXIvanNyZW5kZXIuanMiLCJ0ZXN0L2Jyb3dzZXJpZnkvMS11bml0LXRlc3RzLmpzIiwidGVzdC90ZW1wbGF0ZXMvbmFtZS10ZW1wbGF0ZS5odG1sIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBO0FDQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7O0FDdjNGQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7Ozs7QUN2Q0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EiLCJmaWxlIjoiZ2VuZXJhdGVkLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXNDb250ZW50IjpbIihmdW5jdGlvbiBlKHQsbixyKXtmdW5jdGlvbiBzKG8sdSl7aWYoIW5bb10pe2lmKCF0W29dKXt2YXIgYT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2lmKCF1JiZhKXJldHVybiBhKG8sITApO2lmKGkpcmV0dXJuIGkobywhMCk7dmFyIGY9bmV3IEVycm9yKFwiQ2Fubm90IGZpbmQgbW9kdWxlICdcIitvK1wiJ1wiKTt0aHJvdyBmLmNvZGU9XCJNT0RVTEVfTk9UX0ZPVU5EXCIsZn12YXIgbD1uW29dPXtleHBvcnRzOnt9fTt0W29dWzBdLmNhbGwobC5leHBvcnRzLGZ1bmN0aW9uKGUpe3ZhciBuPXRbb11bMV1bZV07cmV0dXJuIHMobj9uOmUpfSxsLGwuZXhwb3J0cyxlLHQsbixyKX1yZXR1cm4gbltvXS5leHBvcnRzfXZhciBpPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7Zm9yKHZhciBvPTA7bzxyLmxlbmd0aDtvKyspcyhyW29dKTtyZXR1cm4gc30pIiwiLyohIEpzUmVuZGVyIHYxLjAuMzogaHR0cDovL2pzdmlld3MuY29tLyNqc3JlbmRlciAqL1xuLyohICoqVkVSU0lPTiBGT1IgV0VCKiogKEZvciBOT0RFLkpTIHNlZSBodHRwOi8vanN2aWV3cy5jb20vZG93bmxvYWQvanNyZW5kZXItbm9kZS5qcykgKi9cbi8qXG4gKiBCZXN0LW9mLWJyZWVkIHRlbXBsYXRpbmcgaW4gYnJvd3NlciBvciBvbiBOb2RlLmpzLlxuICogRG9lcyBub3QgcmVxdWlyZSBqUXVlcnksIG9yIEhUTUwgRE9NXG4gKiBJbnRlZ3JhdGVzIHdpdGggSnNWaWV3cyAoaHR0cDovL2pzdmlld3MuY29tLyNqc3ZpZXdzKVxuICpcbiAqIENvcHlyaWdodCAyMDE5LCBCb3JpcyBNb29yZVxuICogUmVsZWFzZWQgdW5kZXIgdGhlIE1JVCBMaWNlbnNlLlxuICovXG5cbi8vanNoaW50IC1XMDE4LCAtVzA0MSwgLVcxMjBcblxuKGZ1bmN0aW9uKGZhY3RvcnksIGdsb2JhbCkge1xuXHQvLyBnbG9iYWwgdmFyIGlzIHRoZSB0aGlzIG9iamVjdCwgd2hpY2ggaXMgd2luZG93IHdoZW4gcnVubmluZyBpbiB0aGUgdXN1YWwgYnJvd3NlciBlbnZpcm9ubWVudFxuXHR2YXIgJCA9IGdsb2JhbC5qUXVlcnk7XG5cblx0aWYgKHR5cGVvZiBleHBvcnRzID09PSBcIm9iamVjdFwiKSB7IC8vIENvbW1vbkpTIGUuZy4gQnJvd3NlcmlmeVxuXHRcdG1vZHVsZS5leHBvcnRzID0gJFxuXHRcdFx0PyBmYWN0b3J5KGdsb2JhbCwgJClcblx0XHRcdDogZnVuY3Rpb24oJCkgeyAvLyBJZiBubyBnbG9iYWwgalF1ZXJ5LCB0YWtlIG9wdGlvbmFsIGpRdWVyeSBwYXNzZWQgYXMgcGFyYW1ldGVyOiByZXF1aXJlKCdqc3JlbmRlcicpKGpRdWVyeSlcblx0XHRcdFx0aWYgKCQgJiYgISQuZm4pIHtcblx0XHRcdFx0XHR0aHJvdyBcIlByb3ZpZGUgalF1ZXJ5IG9yIG51bGxcIjtcblx0XHRcdFx0fVxuXHRcdFx0XHRyZXR1cm4gZmFjdG9yeShnbG9iYWwsICQpO1xuXHRcdFx0fTtcblx0fSBlbHNlIGlmICh0eXBlb2YgZGVmaW5lID09PSBcImZ1bmN0aW9uXCIgJiYgZGVmaW5lLmFtZCkgeyAvLyBBTUQgc2NyaXB0IGxvYWRlciwgZS5nLiBSZXF1aXJlSlNcblx0XHRkZWZpbmUoZnVuY3Rpb24oKSB7XG5cdFx0XHRyZXR1cm4gZmFjdG9yeShnbG9iYWwpO1xuXHRcdH0pO1xuXHR9IGVsc2UgeyAvLyBCcm93c2VyIHVzaW5nIHBsYWluIDxzY3JpcHQ+IHRhZ1xuXHRcdGZhY3RvcnkoZ2xvYmFsLCBmYWxzZSk7XG5cdH1cbn0gKFxuXG4vLyBmYWN0b3J5IChmb3IganNyZW5kZXIuanMpXG5mdW5jdGlvbihnbG9iYWwsICQpIHtcblwidXNlIHN0cmljdFwiO1xuXG4vLz09PT09PT09PT09PT09PT09PT09PT09PT09IFRvcC1sZXZlbCB2YXJzID09PT09PT09PT09PT09PT09PT09PT09PT09XG5cbi8vIGdsb2JhbCB2YXIgaXMgdGhlIHRoaXMgb2JqZWN0LCB3aGljaCBpcyB3aW5kb3cgd2hlbiBydW5uaW5nIGluIHRoZSB1c3VhbCBicm93c2VyIGVudmlyb25tZW50XG52YXIgc2V0R2xvYmFscyA9ICQgPT09IGZhbHNlOyAvLyBPbmx5IHNldCBnbG9iYWxzIGlmIHNjcmlwdCBibG9jayBpbiBicm93c2VyIChub3QgQU1EIGFuZCBub3QgQ29tbW9uSlMpXG5cbiQgPSAkICYmICQuZm4gPyAkIDogZ2xvYmFsLmpRdWVyeTsgLy8gJCBpcyBqUXVlcnkgcGFzc2VkIGluIGJ5IENvbW1vbkpTIGxvYWRlciAoQnJvd3NlcmlmeSksIG9yIGdsb2JhbCBqUXVlcnkuXG5cbnZhciB2ZXJzaW9uTnVtYmVyID0gXCJ2MS4wLjNcIixcblx0anN2U3RvcmVOYW1lLCByVGFnLCByVG1wbFN0cmluZywgdG9wVmlldywgJHZpZXdzLCAkZXhwYW5kbyxcblx0X29jcCA9IFwiX29jcFwiLCAvLyBPYnNlcnZhYmxlIGNvbnRleHR1YWwgcGFyYW1ldGVyXG5cbi8vVE9ET1x0dG1wbEZuc0NhY2hlID0ge30sXG5cdCRpc0Z1bmN0aW9uLCAkaXNBcnJheSwgJHRlbXBsYXRlcywgJGNvbnZlcnRlcnMsICRoZWxwZXJzLCAkdGFncywgJHN1YiwgJHN1YlNldHRpbmdzLCAkc3ViU2V0dGluZ3NBZHZhbmNlZCwgJHZpZXdzU2V0dGluZ3MsXG5cdGRlbGltT3BlbkNoYXIwLCBkZWxpbU9wZW5DaGFyMSwgZGVsaW1DbG9zZUNoYXIwLCBkZWxpbUNsb3NlQ2hhcjEsIGxpbmtDaGFyLCBzZXR0aW5nLCBiYXNlT25FcnJvcixcblxuXHRpc1JlbmRlckNhbGwsXG5cdHJOZXdMaW5lID0gL1sgXFx0XSooXFxyXFxufFxcbnxcXHIpL2csXG5cdHJVbmVzY2FwZVF1b3RlcyA9IC9cXFxcKFsnXCJdKS9nLFxuXHRyRXNjYXBlUXVvdGVzID0gL1snXCJcXFxcXS9nLCAvLyBFc2NhcGUgcXVvdGVzIGFuZCBcXCBjaGFyYWN0ZXJcblx0ckJ1aWxkSGFzaCA9IC8oPzpcXHgwOHxeKShvbmVycm9yOik/KD86KH4/KSgoW1xcdyQuXSspOik/KFteXFx4MDhdKykpXFx4MDgoLCk/KFteXFx4MDhdKykvZ2ksXG5cdHJUZXN0RWxzZUlmID0gL15pZlxccy8sXG5cdHJGaXJzdEVsZW0gPSAvPChcXHcrKVs+XFxzXS8sXG5cdHJBdHRyRW5jb2RlID0gL1tcXHgwMGA+PFwiJyY9XS9nLCAvLyBJbmNsdWRlcyA+IGVuY29kaW5nIHNpbmNlIHJDb252ZXJ0TWFya2VycyBpbiBKc1ZpZXdzIGRvZXMgbm90IHNraXAgPiBjaGFyYWN0ZXJzIGluIGF0dHJpYnV0ZSBzdHJpbmdzXG5cdHJJc0h0bWwgPSAvW1xceDAwYD48XFxcIicmPV0vLFxuXHRySGFzSGFuZGxlcnMgPSAvXm9uW0EtWl18XmNvbnZlcnQoQmFjayk/JC8sXG5cdHJXcmFwcGVkSW5WaWV3TWFya2VyID0gL15cXCNcXGQrX2BbXFxzXFxTXSpcXC9cXGQrX2AkLyxcblx0ckh0bWxFbmNvZGUgPSByQXR0ckVuY29kZSxcblx0ckRhdGFFbmNvZGUgPSAvWyY8Pl0vZyxcblx0ckRhdGFVbmVuY29kZSA9IC8mKGFtcHxndHxsdCk7L2csXG5cdHJCcmFja2V0UXVvdGUgPSAvXFxbWydcIl0/fFsnXCJdP1xcXS9nLFxuXHR2aWV3SWQgPSAwLFxuXHRjaGFyRW50aXRpZXMgPSB7XG5cdFx0XCImXCI6IFwiJmFtcDtcIixcblx0XHRcIjxcIjogXCImbHQ7XCIsXG5cdFx0XCI+XCI6IFwiJmd0O1wiLFxuXHRcdFwiXFx4MDBcIjogXCImIzA7XCIsXG5cdFx0XCInXCI6IFwiJiMzOTtcIixcblx0XHQnXCInOiBcIiYjMzQ7XCIsXG5cdFx0XCJgXCI6IFwiJiM5NjtcIixcblx0XHRcIj1cIjogXCImIzYxO1wiXG5cdH0sXG5cdGNoYXJzRnJvbUVudGl0aWVzICA9IHtcblx0XHRhbXA6IFwiJlwiLFxuXHRcdGd0OiBcIj5cIixcblx0XHRsdDogXCI8XCJcblx0fSxcblx0SFRNTCA9IFwiaHRtbFwiLFxuXHRPQkpFQ1QgPSBcIm9iamVjdFwiLFxuXHR0bXBsQXR0ciA9IFwiZGF0YS1qc3YtdG1wbFwiLFxuXHRqc3ZUbXBsID0gXCJqc3ZUbXBsXCIsXG5cdGluZGV4U3RyID0gXCJGb3IgI2luZGV4IGluIG5lc3RlZCBibG9jayB1c2UgI2dldEluZGV4KCkuXCIsXG5cdCRyZW5kZXIgPSB7fSxcblxuXHRqc3IgPSBnbG9iYWwuanNyZW5kZXIsXG5cdGpzclRvSnEgPSBqc3IgJiYgJCAmJiAhJC5yZW5kZXIsIC8vIEpzUmVuZGVyIGFscmVhZHkgbG9hZGVkLCB3aXRob3V0IGpRdWVyeS4gYnV0IHdlIHdpbGwgcmUtbG9hZCBpdCBub3cgdG8gYXR0YWNoIHRvIGpRdWVyeVxuXG5cdGpzdlN0b3JlcyA9IHtcblx0XHR0ZW1wbGF0ZToge1xuXHRcdFx0Y29tcGlsZTogY29tcGlsZVRtcGxcblx0XHR9LFxuXHRcdHRhZzoge1xuXHRcdFx0Y29tcGlsZTogY29tcGlsZVRhZ1xuXHRcdH0sXG5cdFx0dmlld01vZGVsOiB7XG5cdFx0XHRjb21waWxlOiBjb21waWxlVmlld01vZGVsXG5cdFx0fSxcblx0XHRoZWxwZXI6IHt9LFxuXHRcdGNvbnZlcnRlcjoge31cblx0fTtcblxuXHQvLyB2aWV3cyBvYmplY3QgKCQudmlld3MgaWYgalF1ZXJ5IGlzIGxvYWRlZCwganNyZW5kZXIudmlld3MgaWYgbm8galF1ZXJ5LCBlLmcuIGluIE5vZGUuanMpXG5cdCR2aWV3cyA9IHtcblx0XHRqc3ZpZXdzOiB2ZXJzaW9uTnVtYmVyLFxuXHRcdHN1Yjoge1xuXHRcdFx0Ly8gc3Vic2NyaXB0aW9uLCBlLmcuIEpzVmlld3MgaW50ZWdyYXRpb25cblx0XHRcdHJQYXRoOiAvXighKj8pKD86bnVsbHx0cnVlfGZhbHNlfFxcZFtcXGQuXSp8KFtcXHckXSt8XFwufH4oW1xcdyRdKyl8Iyh2aWV3fChbXFx3JF0rKSk/KShbXFx3JC5eXSo/KSg/OlsuW15dKFtcXHckXSspXFxdPyk/KSQvZyxcblx0XHRcdC8vICAgICAgICBub3QgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgb2JqZWN0ICAgICBoZWxwZXIgICAgdmlldyAgdmlld1Byb3BlcnR5IHBhdGhUb2tlbnMgICAgICBsZWFmVG9rZW5cblxuXHRcdFx0clBybTogLyhcXCgpKD89XFxzKlxcKCl8KD86KFsoW10pXFxzKik/KD86KFxcXj8pKH4/W1xcdyQuXl0rKT9cXHMqKChcXCtcXCt8LS0pfFxcK3wtfH4oPyFbXFx3JF0pfCYmfFxcfFxcfHw9PT18IT09fD09fCE9fDw9fD49fFs8PiUqOj9cXC9dfCg9KSlcXHMqfCghKj8oQCk/WyN+XT9bXFx3JC5eXSspKFsoW10pPyl8KCxcXHMqKXwoXFwoPylcXFxcPyg/OignKXwoXCIpKXwoPzpcXHMqKChbKVxcXV0pKD89Wy5eXXxcXHMqJHxbXihbXSl8WylcXF1dKShbKFtdPykpfChcXHMrKS9nLFxuXHRcdFx0Ly8gICBsZnRQcm4wICAgICAgICAgICBsZnRQcm4gICAgICAgICBib3VuZCAgICAgcGF0aCAgICAgICAgICAgICAgIG9wZXJhdG9yICAgICBlcnIgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBlcSAgICAgIHBhdGgyIGxhdGUgICAgICAgICAgICBwcm4gICAgICBjb21tYSAgbGZ0UHJuMiAgIGFwb3MgcXVvdCAgICAgICAgcnRQcm4gIHJ0UHJuRG90ICAgICAgICAgICAgICAgICAgcHJuMiAgICAgc3BhY2VcblxuXHRcdFx0VmlldzogVmlldyxcblx0XHRcdEVycjogSnNWaWV3c0Vycm9yLFxuXHRcdFx0dG1wbEZuOiB0bXBsRm4sXG5cdFx0XHRwYXJzZTogcGFyc2VQYXJhbXMsXG5cdFx0XHRleHRlbmQ6ICRleHRlbmQsXG5cdFx0XHRleHRlbmRDdHg6IGV4dGVuZEN0eCxcblx0XHRcdHN5bnRheEVycjogc3ludGF4RXJyb3IsXG5cdFx0XHRvblN0b3JlOiB7XG5cdFx0XHRcdHRlbXBsYXRlOiBmdW5jdGlvbihuYW1lLCBpdGVtKSB7XG5cdFx0XHRcdFx0aWYgKGl0ZW0gPT09IG51bGwpIHtcblx0XHRcdFx0XHRcdGRlbGV0ZSAkcmVuZGVyW25hbWVdO1xuXHRcdFx0XHRcdH0gZWxzZSBpZiAobmFtZSkge1xuXHRcdFx0XHRcdFx0JHJlbmRlcltuYW1lXSA9IGl0ZW07XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHR9XG5cdFx0XHR9LFxuXHRcdFx0YWRkU2V0dGluZzogYWRkU2V0dGluZyxcblx0XHRcdHNldHRpbmdzOiB7XG5cdFx0XHRcdGFsbG93Q29kZTogZmFsc2Vcblx0XHRcdH0sXG5cdFx0XHRhZHZTZXQ6IG5vb3AsIC8vIFVwZGF0ZSBhZHZhbmNlZCBzZXR0aW5nc1xuXHRcdFx0X3RocDogdGFnSGFuZGxlcnNGcm9tUHJvcHMsXG5cdFx0XHRfZ206IGdldE1ldGhvZCxcblx0XHRcdF90ZzogZnVuY3Rpb24oKSB7fSwgLy8gQ29uc3RydWN0b3IgZm9yIHRhZ0RlZlxuXHRcdFx0X2NudnQ6IGNvbnZlcnRWYWwsXG5cdFx0XHRfdGFnOiByZW5kZXJUYWcsXG5cdFx0XHRfZXI6IGVycm9yLFxuXHRcdFx0X2Vycjogb25SZW5kZXJFcnJvcixcblx0XHRcdF9jcDogcmV0VmFsLCAvLyBHZXQgb2JzZXJ2YWJsZSBjb250ZXh0dWFsIHBhcmFtZXRlcnMgKG9yIHByb3BlcnRpZXMpIH5mb289ZXhwci4gSW4gSnNSZW5kZXIsIHNpbXBseSByZXR1cm5zIHZhbC5cblx0XHRcdF9zcTogZnVuY3Rpb24odG9rZW4pIHtcblx0XHRcdFx0aWYgKHRva2VuID09PSBcImNvbnN0cnVjdG9yXCIpIHtcblx0XHRcdFx0XHRzeW50YXhFcnJvcihcIlwiKTtcblx0XHRcdFx0fVxuXHRcdFx0XHRyZXR1cm4gdG9rZW47XG5cdFx0XHR9XG5cdFx0fSxcblx0XHRzZXR0aW5nczoge1xuXHRcdFx0ZGVsaW1pdGVyczogJHZpZXdzRGVsaW1pdGVycyxcblx0XHRcdGFkdmFuY2VkOiBmdW5jdGlvbih2YWx1ZSkge1xuXHRcdFx0XHRyZXR1cm4gdmFsdWVcblx0XHRcdFx0XHQ/IChcblx0XHRcdFx0XHRcdFx0JGV4dGVuZCgkc3ViU2V0dGluZ3NBZHZhbmNlZCwgdmFsdWUpLFxuXHRcdFx0XHRcdFx0XHQkc3ViLmFkdlNldCgpLFxuXHRcdFx0XHRcdFx0XHQkdmlld3NTZXR0aW5nc1xuXHRcdFx0XHRcdFx0KVxuXHRcdFx0XHRcdFx0OiAkc3ViU2V0dGluZ3NBZHZhbmNlZDtcblx0XHRcdFx0fVxuXHRcdH0sXG5cdFx0bWFwOiBkYXRhTWFwICAgIC8vIElmIGpzT2JzZXJ2YWJsZSBsb2FkZWQgZmlyc3QsIHVzZSB0aGF0IGRlZmluaXRpb24gb2YgZGF0YU1hcFxuXHR9O1xuXG5mdW5jdGlvbiBnZXREZXJpdmVkTWV0aG9kKGJhc2VNZXRob2QsIG1ldGhvZCkge1xuXHRyZXR1cm4gZnVuY3Rpb24oKSB7XG5cdFx0dmFyIHJldCxcblx0XHRcdHRhZyA9IHRoaXMsXG5cdFx0XHRwcmV2QmFzZSA9IHRhZy5iYXNlO1xuXG5cdFx0dGFnLmJhc2UgPSBiYXNlTWV0aG9kOyAvLyBXaXRoaW4gbWV0aG9kIGNhbGwsIGNhbGxpbmcgdGhpcy5iYXNlIHdpbGwgY2FsbCB0aGUgYmFzZSBtZXRob2Rcblx0XHRyZXQgPSBtZXRob2QuYXBwbHkodGFnLCBhcmd1bWVudHMpOyAvLyBDYWxsIHRoZSBtZXRob2Rcblx0XHR0YWcuYmFzZSA9IHByZXZCYXNlOyAvLyBSZXBsYWNlIHRoaXMuYmFzZSB0byBiZSB0aGUgYmFzZSBtZXRob2Qgb2YgdGhlIHByZXZpb3VzIGNhbGwsIGZvciBjaGFpbmVkIGNhbGxzXG5cdFx0cmV0dXJuIHJldDtcblx0fTtcbn1cblxuZnVuY3Rpb24gZ2V0TWV0aG9kKGJhc2VNZXRob2QsIG1ldGhvZCkge1xuXHQvLyBGb3IgZGVyaXZlZCBtZXRob2RzIChvciBoYW5kbGVycyBkZWNsYXJlZCBkZWNsYXJhdGl2ZWx5IGFzIGluIHt7OmZvbyBvbkNoYW5nZT1+Zm9vQ2hhbmdlZH19IHJlcGxhY2UgYnkgYSBkZXJpdmVkIG1ldGhvZCwgdG8gYWxsb3cgdXNpbmcgdGhpcy5iYXNlKC4uLilcblx0Ly8gb3IgdGhpcy5iYXNlQXBwbHkoYXJndW1lbnRzKSB0byBjYWxsIHRoZSBiYXNlIGltcGxlbWVudGF0aW9uLiAoRXF1aXZhbGVudCB0byB0aGlzLl9zdXBlciguLi4pIGFuZCB0aGlzLl9zdXBlckFwcGx5KGFyZ3VtZW50cykgaW4galF1ZXJ5IFVJKVxuXHRpZiAoJGlzRnVuY3Rpb24obWV0aG9kKSkge1xuXHRcdG1ldGhvZCA9IGdldERlcml2ZWRNZXRob2QoXG5cdFx0XHRcdCFiYXNlTWV0aG9kXG5cdFx0XHRcdFx0PyBub29wIC8vIG5vIGJhc2UgbWV0aG9kIGltcGxlbWVudGF0aW9uLCBzbyB1c2Ugbm9vcCBhcyBiYXNlIG1ldGhvZFxuXHRcdFx0XHRcdDogYmFzZU1ldGhvZC5fZFxuXHRcdFx0XHRcdFx0PyBiYXNlTWV0aG9kIC8vIGJhc2VNZXRob2QgaXMgYSBkZXJpdmVkIG1ldGhvZCwgc28gdXNlIGl0XG5cdFx0XHRcdFx0XHQ6IGdldERlcml2ZWRNZXRob2Qobm9vcCwgYmFzZU1ldGhvZCksIC8vIGJhc2VNZXRob2QgaXMgbm90IGRlcml2ZWQgc28gbWFrZSBpdHMgYmFzZSBtZXRob2QgYmUgdGhlIG5vb3AgbWV0aG9kXG5cdFx0XHRcdG1ldGhvZFxuXHRcdFx0KTtcblx0XHRtZXRob2QuX2QgPSAoYmFzZU1ldGhvZCAmJiBiYXNlTWV0aG9kLl9kIHx8IDApICsgMTsgLy8gQWRkIGZsYWcgZm9yIGRlcml2ZWQgbWV0aG9kIChpbmNyZW1lbnRlZCBmb3IgZGVyaXZlZCBvZiBkZXJpdmVkLi4uKVxuXHR9XG5cdHJldHVybiBtZXRob2Q7XG59XG5cbmZ1bmN0aW9uIHRhZ0hhbmRsZXJzRnJvbVByb3BzKHRhZywgdGFnQ3R4KSB7XG5cdHZhciBwcm9wLFxuXHRcdHByb3BzID0gdGFnQ3R4LnByb3BzO1xuXHRmb3IgKHByb3AgaW4gcHJvcHMpIHtcblx0XHRpZiAockhhc0hhbmRsZXJzLnRlc3QocHJvcCkgJiYgISh0YWdbcHJvcF0gJiYgdGFnW3Byb3BdLmZpeCkpIHsgLy8gRG9uJ3Qgb3ZlcnJpZGUgaGFuZGxlcnMgd2l0aCBmaXggZXhwYW5kbyAodXNlZCBpbiBkYXRlcGlja2VyIGFuZCBzcGlubmVyKVxuXHRcdFx0dGFnW3Byb3BdID0gcHJvcCAhPT0gXCJjb252ZXJ0XCIgPyBnZXRNZXRob2QodGFnLmNvbnN0cnVjdG9yLnByb3RvdHlwZVtwcm9wXSwgcHJvcHNbcHJvcF0pIDogcHJvcHNbcHJvcF07XG5cdFx0XHQvLyBDb3B5IG92ZXIgdGhlIG9uRm9vIHByb3BzLCBjb252ZXJ0IGFuZCBjb252ZXJ0QmFjayBmcm9tIHRhZ0N0eC5wcm9wcyB0byB0YWcgKG92ZXJyaWRlcyB2YWx1ZXMgaW4gdGFnRGVmKS5cblx0XHRcdC8vIE5vdGU6IHVuc3VwcG9ydGVkIHNjZW5hcmlvOiBpZiBoYW5kbGVycyBhcmUgZHluYW1pY2FsbHkgYWRkZWQgXm9uRm9vPWV4cHJlc3Npb24gdGhpcyB3aWxsIHdvcmssIGJ1dCBkeW5hbWljYWxseSByZW1vdmluZyB3aWxsIG5vdCB3b3JrLlxuXHRcdH1cblx0fVxufVxuXG5mdW5jdGlvbiByZXRWYWwodmFsKSB7XG5cdHJldHVybiB2YWw7XG59XG5cbmZ1bmN0aW9uIG5vb3AoKSB7XG5cdHJldHVybiBcIlwiO1xufVxuXG5mdW5jdGlvbiBkYmdCcmVhayh2YWwpIHtcblx0Ly8gVXNhZ2UgZXhhbXBsZXM6IHt7ZGJnOi4uLn19LCB7ezp+ZGJnKC4uLil9fSwge3tkYmcgLi4uL319LCB7Xntmb3IgLi4uIG9uQWZ0ZXJMaW5rPX5kYmd9fSBldGMuXG5cdHRyeSB7XG5cdFx0Y29uc29sZS5sb2coXCJKc1JlbmRlciBkYmcgYnJlYWtwb2ludDogXCIgKyB2YWwpO1xuXHRcdHRocm93IFwiZGJnIGJyZWFrcG9pbnRcIjsgLy8gVG8gYnJlYWsgaGVyZSwgc3RvcCBvbiBjYXVnaHQgZXhjZXB0aW9ucy5cblx0fVxuXHRjYXRjaCAoZSkge31cblx0cmV0dXJuIHRoaXMuYmFzZSA/IHRoaXMuYmFzZUFwcGx5KGFyZ3VtZW50cykgOiB2YWw7XG59XG5cbmZ1bmN0aW9uIEpzVmlld3NFcnJvcihtZXNzYWdlKSB7XG5cdC8vIEVycm9yIGV4Y2VwdGlvbiB0eXBlIGZvciBKc1ZpZXdzL0pzUmVuZGVyXG5cdC8vIE92ZXJyaWRlIG9mICQudmlld3Muc3ViLkVycm9yIGlzIHBvc3NpYmxlXG5cdHRoaXMubmFtZSA9ICgkLmxpbmsgPyBcIkpzVmlld3NcIiA6IFwiSnNSZW5kZXJcIikgKyBcIiBFcnJvclwiO1xuXHR0aGlzLm1lc3NhZ2UgPSBtZXNzYWdlIHx8IHRoaXMubmFtZTtcbn1cblxuZnVuY3Rpb24gJGV4dGVuZCh0YXJnZXQsIHNvdXJjZSkge1xuXHRpZiAodGFyZ2V0KSB7XG5cdFx0Zm9yICh2YXIgbmFtZSBpbiBzb3VyY2UpIHtcblx0XHRcdHRhcmdldFtuYW1lXSA9IHNvdXJjZVtuYW1lXTtcblx0XHR9XG5cdFx0cmV0dXJuIHRhcmdldDtcblx0fVxufVxuXG4oSnNWaWV3c0Vycm9yLnByb3RvdHlwZSA9IG5ldyBFcnJvcigpKS5jb25zdHJ1Y3RvciA9IEpzVmlld3NFcnJvcjtcblxuLy89PT09PT09PT09PT09PT09PT09PT09PT09PSBUb3AtbGV2ZWwgZnVuY3Rpb25zID09PT09PT09PT09PT09PT09PT09PT09PT09XG5cbi8vPT09PT09PT09PT09PT09PT09PVxuLy8gdmlld3MuZGVsaW1pdGVyc1xuLy89PT09PT09PT09PT09PT09PT09XG5cblx0LyoqXG5cdCogU2V0IHRoZSB0YWcgb3BlbmluZyBhbmQgY2xvc2luZyBkZWxpbWl0ZXJzIGFuZCAnbGluaycgY2hhcmFjdGVyLiBEZWZhdWx0IGlzIFwie3tcIiwgXCJ9fVwiIGFuZCBcIl5cIlxuXHQqIG9wZW5DaGFycywgY2xvc2VDaGFyczogb3BlbmluZyBhbmQgY2xvc2luZyBzdHJpbmdzLCBlYWNoIHdpdGggdHdvIGNoYXJhY3RlcnNcblx0KiAkLnZpZXdzLnNldHRpbmdzLmRlbGltaXRlcnMoLi4uKVxuXHQqXG5cdCogQHBhcmFtIHtzdHJpbmd9ICAgb3BlbkNoYXJzXG5cdCogQHBhcmFtIHtzdHJpbmd9ICAgW2Nsb3NlQ2hhcnNdXG5cdCogQHBhcmFtIHtzdHJpbmd9ICAgW2xpbmtdXG5cdCogQHJldHVybnMge1NldHRpbmdzfVxuXHQqXG5cdCogR2V0IGRlbGltaXRlcnNcblx0KiBkZWxpbXNBcnJheSA9ICQudmlld3Muc2V0dGluZ3MuZGVsaW1pdGVycygpXG5cdCpcblx0KiBAcmV0dXJucyB7c3RyaW5nW119XG5cdCovXG5mdW5jdGlvbiAkdmlld3NEZWxpbWl0ZXJzKG9wZW5DaGFycywgY2xvc2VDaGFycywgbGluaykge1xuXHRpZiAoIW9wZW5DaGFycykge1xuXHRcdHJldHVybiAkc3ViU2V0dGluZ3MuZGVsaW1pdGVycztcblx0fVxuXHRpZiAoJGlzQXJyYXkob3BlbkNoYXJzKSkge1xuXHRcdHJldHVybiAkdmlld3NEZWxpbWl0ZXJzLmFwcGx5KCR2aWV3cywgb3BlbkNoYXJzKTtcblx0fVxuXHRsaW5rQ2hhciA9IGxpbmsgPyBsaW5rWzBdIDogbGlua0NoYXI7XG5cdGlmICghL14oXFxXfF8pezV9JC8udGVzdChvcGVuQ2hhcnMgKyBjbG9zZUNoYXJzICsgbGlua0NoYXIpKSB7XG5cdFx0ZXJyb3IoXCJJbnZhbGlkIGRlbGltaXRlcnNcIik7IC8vIE11c3QgYmUgbm9uLXdvcmQgY2hhcmFjdGVycywgYW5kIG9wZW5DaGFycyBhbmQgY2xvc2VDaGFycyBtdXN0IGVhY2ggYmUgbGVuZ3RoIDJcblx0fVxuXHRkZWxpbU9wZW5DaGFyMCA9IG9wZW5DaGFyc1swXTtcblx0ZGVsaW1PcGVuQ2hhcjEgPSBvcGVuQ2hhcnNbMV07XG5cdGRlbGltQ2xvc2VDaGFyMCA9IGNsb3NlQ2hhcnNbMF07XG5cdGRlbGltQ2xvc2VDaGFyMSA9IGNsb3NlQ2hhcnNbMV07XG5cblx0JHN1YlNldHRpbmdzLmRlbGltaXRlcnMgPSBbZGVsaW1PcGVuQ2hhcjAgKyBkZWxpbU9wZW5DaGFyMSwgZGVsaW1DbG9zZUNoYXIwICsgZGVsaW1DbG9zZUNoYXIxLCBsaW5rQ2hhcl07XG5cblx0Ly8gRXNjYXBlIHRoZSBjaGFyYWN0ZXJzIC0gc2luY2UgdGhleSBjb3VsZCBiZSByZWdleCBzcGVjaWFsIGNoYXJhY3RlcnNcblx0b3BlbkNoYXJzID0gXCJcXFxcXCIgKyBkZWxpbU9wZW5DaGFyMCArIFwiKFxcXFxcIiArIGxpbmtDaGFyICsgXCIpP1xcXFxcIiArIGRlbGltT3BlbkNoYXIxOyAvLyBEZWZhdWx0IGlzIFwie157XCJcblx0Y2xvc2VDaGFycyA9IFwiXFxcXFwiICsgZGVsaW1DbG9zZUNoYXIwICsgXCJcXFxcXCIgKyBkZWxpbUNsb3NlQ2hhcjE7ICAgICAgICAgICAgICAgICAgIC8vIERlZmF1bHQgaXMgXCJ9fVwiXG5cdC8vIEJ1aWxkIHJlZ2V4IHdpdGggbmV3IGRlbGltaXRlcnNcblx0Ly8gICAgICAgICAgW3RhZyAgICAoZm9sbG93ZWQgYnkgLyBzcGFjZSBvciB9KSAgb3IgY3Z0citjb2xvbiBvciBodG1sIG9yIGNvZGVdIGZvbGxvd2VkIGJ5IHNwYWNlK3BhcmFtcyB0aGVuIGNvbnZlcnRCYWNrP1xuXHRyVGFnID0gXCIoPzooXFxcXHcrKD89W1xcXFwvXFxcXHNcXFxcXCIgKyBkZWxpbUNsb3NlQ2hhcjAgKyBcIl0pKXwoXFxcXHcrKT8oOil8KD4pfChcXFxcKikpXFxcXHMqKCg/OlteXFxcXFwiXG5cdFx0KyBkZWxpbUNsb3NlQ2hhcjAgKyBcIl18XFxcXFwiICsgZGVsaW1DbG9zZUNoYXIwICsgXCIoPyFcXFxcXCIgKyBkZWxpbUNsb3NlQ2hhcjEgKyBcIikpKj8pXCI7XG5cblx0Ly8gTWFrZSByVGFnIGF2YWlsYWJsZSB0byBKc1ZpZXdzIChvciBvdGhlciBjb21wb25lbnRzKSBmb3IgcGFyc2luZyBiaW5kaW5nIGV4cHJlc3Npb25zXG5cdCRzdWIuclRhZyA9IFwiKD86XCIgKyByVGFnICsgXCIpXCI7XG5cdC8vICAgICAgICAgICAgICAgICAgICAgICAgeyBePyB7ICAgdGFnK3BhcmFtcyBzbGFzaD8gIG9yIGNsb3NpbmdUYWcgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBvciBjb21tZW50XG5cdHJUYWcgPSBuZXcgUmVnRXhwKFwiKD86XCIgKyBvcGVuQ2hhcnMgKyByVGFnICsgXCIoXFxcXC8pP3xcXFxcXCIgKyBkZWxpbU9wZW5DaGFyMCArIFwiKFxcXFxcIiArIGxpbmtDaGFyICsgXCIpP1xcXFxcIiArIGRlbGltT3BlbkNoYXIxICsgXCIoPzooPzpcXFxcLyhcXFxcdyspKVxcXFxzKnwhLS1bXFxcXHNcXFxcU10qPy0tKSlcIiArIGNsb3NlQ2hhcnMsIFwiZ1wiKTtcblxuXHQvLyBEZWZhdWx0OiAgYmluZCAgICAgdGFnTmFtZSAgICAgICAgIGN2dCAgIGNsbiBodG1sIGNvZGUgICAgcGFyYW1zICAgICAgICAgICAgc2xhc2ggICBiaW5kMiAgICAgICAgIGNsb3NlQmxrICBjb21tZW50XG5cdC8vICAgICAgLyg/OnsoXFxeKT97KD86KFxcdysoPz1bXFwvXFxzfV0pKXwoXFx3Kyk/KDopfCg+KXwoXFwqKSlcXHMqKCg/OltefV18fSg/IX0pKSo/KShcXC8pP3x7KFxcXik/eyg/Oig/OlxcLyhcXHcrKSlcXHMqfCEtLVtcXHNcXFNdKj8tLSkpfX1cblxuXHQkc3ViLnJUbXBsID0gbmV3IFJlZ0V4cChcIl5cXFxcc3xcXFxccyR8PC4qPnwoW15cXFxcXFxcXF18Xilbe31dfFwiICsgb3BlbkNoYXJzICsgXCIuKlwiICsgY2xvc2VDaGFycyk7XG5cdC8vICRzdWIuclRtcGwgbG9va3MgZm9yIGluaXRpYWwgb3IgZmluYWwgd2hpdGUgc3BhY2UsIGh0bWwgdGFncyBvciB7IG9yIH0gY2hhciBub3QgcHJlY2VkZWQgYnkgXFxcXCwgb3IgSnNSZW5kZXIgdGFncyB7e3h4eH19LlxuXHQvLyBFYWNoIG9mIHRoZXNlIHN0cmluZ3MgYXJlIGNvbnNpZGVyZWQgTk9UIHRvIGJlIGpRdWVyeSBzZWxlY3RvcnNcblx0cmV0dXJuICR2aWV3c1NldHRpbmdzO1xufVxuXG4vLz09PT09PT09PVxuLy8gVmlldy5nZXRcbi8vPT09PT09PT09XG5cbmZ1bmN0aW9uIGdldFZpZXcoaW5uZXIsIHR5cGUpIHsgLy92aWV3LmdldChpbm5lciwgdHlwZSlcblx0aWYgKCF0eXBlICYmIGlubmVyICE9PSB0cnVlKSB7XG5cdFx0Ly8gdmlldy5nZXQodHlwZSlcblx0XHR0eXBlID0gaW5uZXI7XG5cdFx0aW5uZXIgPSB1bmRlZmluZWQ7XG5cdH1cblxuXHR2YXIgdmlld3MsIGksIGwsIGZvdW5kLFxuXHRcdHZpZXcgPSB0aGlzLFxuXHRcdHJvb3QgPSB0eXBlID09PSBcInJvb3RcIjtcblx0XHQvLyB2aWV3LmdldChcInJvb3RcIikgcmV0dXJucyB2aWV3LnJvb3QsIHZpZXcuZ2V0KCkgcmV0dXJucyB2aWV3LnBhcmVudCwgdmlldy5nZXQodHJ1ZSkgcmV0dXJucyB2aWV3LnZpZXdzWzBdLlxuXG5cdGlmIChpbm5lcikge1xuXHRcdC8vIEdvIHRocm91Z2ggdmlld3MgLSB0aGlzIG9uZSwgYW5kIGFsbCBuZXN0ZWQgb25lcywgZGVwdGgtZmlyc3QgLSBhbmQgcmV0dXJuIGZpcnN0IG9uZSB3aXRoIGdpdmVuIHR5cGUuXG5cdFx0Ly8gSWYgdHlwZSBpcyB1bmRlZmluZWQsIGkuZS4gdmlldy5nZXQodHJ1ZSksIHJldHVybiBmaXJzdCBjaGlsZCB2aWV3LlxuXHRcdGZvdW5kID0gdHlwZSAmJiB2aWV3LnR5cGUgPT09IHR5cGUgJiYgdmlldztcblx0XHRpZiAoIWZvdW5kKSB7XG5cdFx0XHR2aWV3cyA9IHZpZXcudmlld3M7XG5cdFx0XHRpZiAodmlldy5fLnVzZUtleSkge1xuXHRcdFx0XHRmb3IgKGkgaW4gdmlld3MpIHtcblx0XHRcdFx0XHRpZiAoZm91bmQgPSB0eXBlID8gdmlld3NbaV0uZ2V0KGlubmVyLCB0eXBlKSA6IHZpZXdzW2ldKSB7XG5cdFx0XHRcdFx0XHRicmVhaztcblx0XHRcdFx0XHR9XG5cdFx0XHRcdH1cblx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdGZvciAoaSA9IDAsIGwgPSB2aWV3cy5sZW5ndGg7ICFmb3VuZCAmJiBpIDwgbDsgaSsrKSB7XG5cdFx0XHRcdFx0Zm91bmQgPSB0eXBlID8gdmlld3NbaV0uZ2V0KGlubmVyLCB0eXBlKSA6IHZpZXdzW2ldO1xuXHRcdFx0XHR9XG5cdFx0XHR9XG5cdFx0fVxuXHR9IGVsc2UgaWYgKHJvb3QpIHtcblx0XHQvLyBGaW5kIHJvb3Qgdmlldy4gKHZpZXcgd2hvc2UgcGFyZW50IGlzIHRvcCB2aWV3KVxuXHRcdGZvdW5kID0gdmlldy5yb290O1xuXHR9IGVsc2UgaWYgKHR5cGUpIHtcblx0XHR3aGlsZSAodmlldyAmJiAhZm91bmQpIHtcblx0XHRcdC8vIEdvIHRocm91Z2ggdmlld3MgLSB0aGlzIG9uZSwgYW5kIGFsbCBwYXJlbnQgb25lcyAtIGFuZCByZXR1cm4gZmlyc3Qgb25lIHdpdGggZ2l2ZW4gdHlwZS5cblx0XHRcdGZvdW5kID0gdmlldy50eXBlID09PSB0eXBlID8gdmlldyA6IHVuZGVmaW5lZDtcblx0XHRcdHZpZXcgPSB2aWV3LnBhcmVudDtcblx0XHR9XG5cdH0gZWxzZSB7XG5cdFx0Zm91bmQgPSB2aWV3LnBhcmVudDtcblx0fVxuXHRyZXR1cm4gZm91bmQgfHwgdW5kZWZpbmVkO1xufVxuXG5mdW5jdGlvbiBnZXROZXN0ZWRJbmRleCgpIHtcblx0dmFyIHZpZXcgPSB0aGlzLmdldChcIml0ZW1cIik7XG5cdHJldHVybiB2aWV3ID8gdmlldy5pbmRleCA6IHVuZGVmaW5lZDtcbn1cblxuZ2V0TmVzdGVkSW5kZXguZGVwZW5kcyA9IGZ1bmN0aW9uKCkge1xuXHRyZXR1cm4gW3RoaXMuZ2V0KFwiaXRlbVwiKSwgXCJpbmRleFwiXTtcbn07XG5cbmZ1bmN0aW9uIGdldEluZGV4KCkge1xuXHRyZXR1cm4gdGhpcy5pbmRleDtcbn1cblxuZ2V0SW5kZXguZGVwZW5kcyA9IFwiaW5kZXhcIjtcblxuLy89PT09PT09PT09PT09PT09PT1cbi8vIFZpZXcuY3R4UHJtLCBldGMuXG4vLz09PT09PT09PT09PT09PT09PVxuXG4vKiBJbnRlcm5hbCBwcml2YXRlOiB2aWV3Ll9nZXRPYigpICovXG5mdW5jdGlvbiBnZXRQYXRoT2JqZWN0KG9iLCBwYXRoLCBsdE9iLCBmbikge1xuXHQvLyBJdGVyYXRlIHRocm91Z2ggcGF0aCB0byBsYXRlIHBhdGhzOiBAYS5iLmMgcGF0aHNcblx0Ly8gUmV0dXJuIFwiXCIgKG9yIG5vb3AgaWYgbGVhZiBpcyBhIGZ1bmN0aW9uIEBhLmIuYyguLi4pICkgaWYgaW50ZXJtZWRpYXRlIG9iamVjdCBub3QgeWV0IGF2YWlsYWJsZVxuXHR2YXIgcHJldk9iLCB0b2tlbnMsIGwsXG5cdFx0aSA9IDA7XG5cdGlmIChsdE9iID09PSAxKSB7XG5cdFx0Zm4gPSAxO1xuXHRcdGx0T2IgPSB1bmRlZmluZWQ7XG5cdH1cblx0Ly8gUGF0aHMgbGlrZSBeYV5iXmMgb3Igfl5hXmJeYyB3aWxsIG5vdCB0aHJvdyBpZiBhbiBvYmplY3QgaW4gcGF0aCBpcyB1bmRlZmluZWQuXG5cdGlmIChwYXRoKSB7XG5cdFx0dG9rZW5zID0gcGF0aC5zcGxpdChcIi5cIik7XG5cdFx0bCA9IHRva2Vucy5sZW5ndGg7XG5cblx0XHRmb3IgKDsgb2IgJiYgaSA8IGw7IGkrKykge1xuXHRcdFx0cHJldk9iID0gb2I7XG5cdFx0XHRvYiA9IHRva2Vuc1tpXSA/IG9iW3Rva2Vuc1tpXV0gOiBvYjtcblx0XHR9XG5cdH1cblx0aWYgKGx0T2IpIHtcblx0XHRsdE9iLmx0ID0gbHRPYi5sdCB8fCBpPGw7IC8vIElmIGkgPCBsIHRoZXJlIHdhcyBhbiBvYmplY3QgaW4gdGhlIHBhdGggbm90IHlldCBhdmFpbGFibGVcblx0fVxuXHRyZXR1cm4gb2IgPT09IHVuZGVmaW5lZFxuXHRcdD8gZm4gPyBub29wIDogXCJcIlxuXHRcdDogZm4gPyBmdW5jdGlvbigpIHtcblx0XHRcdHJldHVybiBvYi5hcHBseShwcmV2T2IsIGFyZ3VtZW50cyk7XG5cdFx0fSA6IG9iO1xufVxuXG5mdW5jdGlvbiBjb250ZXh0UGFyYW1ldGVyKGtleSwgdmFsdWUsIGdldCkge1xuXHQvLyBIZWxwZXIgbWV0aG9kIGNhbGxlZCBhcyB2aWV3LmN0eFBybShrZXkpIGZvciBoZWxwZXJzIG9yIHRlbXBsYXRlIHBhcmFtZXRlcnMgfmZvbyAtIGZyb20gY29tcGlsZWQgdGVtcGxhdGUgb3IgZnJvbSBjb250ZXh0IGNhbGxiYWNrXG5cdHZhciB3cmFwcGVkLCBkZXBzLCByZXMsIG9ic0N0eFBybSwgdGFnRWxzZSwgY2FsbFZpZXcsIG5ld1Jlcyxcblx0XHRzdG9yZVZpZXcgPSB0aGlzLFxuXHRcdGlzVXBkYXRlID0gIWlzUmVuZGVyQ2FsbCAmJiBhcmd1bWVudHMubGVuZ3RoID4gMSxcblx0XHRzdG9yZSA9IHN0b3JlVmlldy5jdHg7XG5cdGlmIChrZXkpIHtcblx0XHRpZiAoIXN0b3JlVmlldy5fKSB7IC8vIHRhZ0N0eC5jdHhQcm0oKSBjYWxsXG5cdFx0XHR0YWdFbHNlID0gc3RvcmVWaWV3LmluZGV4O1xuXHRcdFx0c3RvcmVWaWV3ID0gc3RvcmVWaWV3LnRhZztcblx0XHR9XG5cdFx0Y2FsbFZpZXcgPSBzdG9yZVZpZXc7XG5cdFx0aWYgKHN0b3JlICYmIHN0b3JlLmhhc093blByb3BlcnR5KGtleSkgfHwgKHN0b3JlID0gJGhlbHBlcnMpLmhhc093blByb3BlcnR5KGtleSkpIHtcblx0XHRcdHJlcyA9IHN0b3JlW2tleV07XG5cdFx0XHRpZiAoa2V5ID09PSBcInRhZ1wiIHx8IGtleSA9PT0gXCJ0YWdDdHhcIiB8fCBrZXkgPT09IFwicm9vdFwiIHx8IGtleSA9PT0gXCJwYXJlbnRUYWdzXCIgfHwgc3RvcmVWaWV3Ll8uaXQgPT09IGtleSApIHtcblx0XHRcdFx0cmV0dXJuIHJlcztcblx0XHRcdH1cblx0XHR9IGVsc2Uge1xuXHRcdFx0c3RvcmUgPSB1bmRlZmluZWQ7XG5cdFx0fVxuXHRcdGlmICghaXNSZW5kZXJDYWxsICYmIHN0b3JlVmlldy50YWdDdHggfHwgc3RvcmVWaWV3LmxpbmtlZCkgeyAvLyBEYXRhLWxpbmtlZCB2aWV3LCBvciB0YWcgaW5zdGFuY2Vcblx0XHRcdGlmICghcmVzIHx8ICFyZXMuX2N4cCkge1xuXHRcdFx0XHQvLyBOb3QgYSBjb250ZXh0dWFsIHBhcmFtZXRlclxuXHRcdFx0XHQvLyBTZXQgc3RvcmVWaWV3IHRvIHRhZyAoaWYgdGhpcyBpcyBhIHRhZy5jdHhQcm0oKSBjYWxsKSBvciB0byByb290IHZpZXcgKFwiZGF0YVwiIHZpZXcgb2YgbGlua2VkIHRlbXBsYXRlKVxuXHRcdFx0XHRzdG9yZVZpZXcgPSBzdG9yZVZpZXcudGFnQ3R4IHx8ICRpc0Z1bmN0aW9uKHJlcylcblx0XHRcdFx0XHQ/IHN0b3JlVmlldyAvLyBJcyBhIHRhZywgbm90IGEgdmlldywgb3IgaXMgYSBjb21wdXRlZCBjb250ZXh0dWFsIHBhcmFtZXRlciwgc28gc2NvcGUgdG8gdGhlIGNhbGxWaWV3LCBubyB0aGUgJ3Njb3BlIHZpZXcnXG5cdFx0XHRcdFx0OiAoc3RvcmVWaWV3ID0gc3RvcmVWaWV3LnNjb3BlIHx8IHN0b3JlVmlldyxcblx0XHRcdFx0XHRcdCFzdG9yZVZpZXcuaXNUb3AgJiYgc3RvcmVWaWV3LmN0eC50YWcgLy8gSWYgdGhpcyB2aWV3IGlzIGluIGEgdGFnLCBzZXQgc3RvcmVWaWV3IHRvIHRoZSB0YWdcblx0XHRcdFx0XHRcdFx0fHwgc3RvcmVWaWV3KTtcblx0XHRcdFx0aWYgKHJlcyAhPT0gdW5kZWZpbmVkICYmIHN0b3JlVmlldy50YWdDdHgpIHtcblx0XHRcdFx0XHQvLyBJZiBzdG9yZVZpZXcgaXMgYSB0YWcsIGJ1dCB0aGUgY29udGV4dHVhbCBwYXJhbWV0ZXIgaGFzIGJlZW4gc2V0IGF0IGF0IGhpZ2hlciBsZXZlbCAoZS5nLiBoZWxwZXJzKS4uLlxuXHRcdFx0XHRcdHN0b3JlVmlldyA9IHN0b3JlVmlldy50YWdDdHgudmlldy5zY29wZTsgLy8gIHRoZW4gbW92ZSBzdG9yZVZpZXcgdG8gdGhlIG91dGVyIGxldmVsIChzY29wZSBvZiB0YWcgY29udGFpbmVyIHZpZXcpXG5cdFx0XHRcdH1cblx0XHRcdFx0c3RvcmUgPSBzdG9yZVZpZXcuX29jcHM7XG5cdFx0XHRcdHJlcyA9IHN0b3JlICYmIHN0b3JlLmhhc093blByb3BlcnR5KGtleSkgJiYgc3RvcmVba2V5XSB8fCByZXM7XG5cdFx0XHRcdGlmICghKHJlcyAmJiByZXMuX2N4cCkgJiYgKGdldCB8fCBpc1VwZGF0ZSkpIHtcblx0XHRcdFx0XHQvLyBDcmVhdGUgb2JzZXJ2YWJsZSBjb250ZXh0dWFsIHBhcmFtZXRlclxuXHRcdFx0XHRcdChzdG9yZSB8fCAoc3RvcmVWaWV3Ll9vY3BzID0gc3RvcmVWaWV3Ll9vY3BzIHx8IHt9KSlba2V5XVxuXHRcdFx0XHRcdFx0PSByZXNcblx0XHRcdFx0XHRcdD0gW3tcblx0XHRcdFx0XHRcdFx0X29jcDogcmVzLCAvLyBUaGUgb2JzZXJ2YWJsZSBjb250ZXh0dWFsIHBhcmFtZXRlciB2YWx1ZVxuXHRcdFx0XHRcdFx0XHRfdnc6IGNhbGxWaWV3LFxuXHRcdFx0XHRcdFx0XHRfa2V5OiBrZXlcblx0XHRcdFx0XHRcdH1dO1xuXHRcdFx0XHRcdHJlcy5fY3hwID0ge1xuXHRcdFx0XHRcdFx0cGF0aDogX29jcCxcblx0XHRcdFx0XHRcdGluZDogMCxcblx0XHRcdFx0XHRcdHVwZGF0ZVZhbHVlOiBmdW5jdGlvbih2YWwsIHBhdGgpIHtcblx0XHRcdFx0XHRcdFx0JC5vYnNlcnZhYmxlKHJlc1swXSkuc2V0UHJvcGVydHkoX29jcCwgdmFsKTsgLy8gU2V0IHRoZSB2YWx1ZSAocmVzWzBdLl9vY3ApXG5cdFx0XHRcdFx0XHRcdHJldHVybiB0aGlzO1xuXHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdH07XG5cdFx0XHRcdH1cblx0XHRcdH1cblx0XHRcdGlmIChvYnNDdHhQcm0gPSByZXMgJiYgcmVzLl9jeHApIHtcblx0XHRcdFx0Ly8gSWYgdGhpcyBoZWxwZXIgcmVzb3VyY2UgaXMgYW4gb2JzZXJ2YWJsZSBjb250ZXh0dWFsIHBhcmFtZXRlclxuXHRcdFx0XHRpZiAoYXJndW1lbnRzLmxlbmd0aCA+IDIpIHtcblx0XHRcdFx0XHRkZXBzID0gcmVzWzFdID8gJHN1Yi5fY2VvKHJlc1sxXS5kZXBzKSA6IFtfb2NwXTsgLy8gZm4gZGVwcyAod2l0aCBhbnkgZXhwck9icyBjbG9uZWQgdXNpbmcgJHN1Yi5fY2VvKVxuXHRcdFx0XHRcdGRlcHMudW5zaGlmdChyZXNbMF0pOyAvLyB2aWV3XG5cdFx0XHRcdFx0ZGVwcy5fY3hwID0gb2JzQ3R4UHJtO1xuXHRcdFx0XHRcdC8vIEluIGEgY29udGV4dCBjYWxsYmFjayBmb3IgYSBjb250ZXh0dWFsIHBhcmFtLCB3ZSBzZXQgZ2V0ID0gdHJ1ZSwgdG8gZ2V0IGN0eFBybSAgW3ZpZXcsIGRlcGVuZGVuY2llcy4uLl0gYXJyYXkgLSBuZWVkZWQgZm9yIG9ic2VydmUgY2FsbFxuXHRcdFx0XHRcdHJldHVybiBkZXBzO1xuXHRcdFx0XHR9XG5cdFx0XHRcdHRhZ0Vsc2UgPSBvYnNDdHhQcm0udGFnRWxzZTtcblx0XHRcdFx0bmV3UmVzID0gcmVzWzFdIC8vIGxpbmtGbiBmb3IgY29tcGlsZWQgZXhwcmVzc2lvblxuXHRcdFx0XHRcdD8gb2JzQ3R4UHJtLnRhZyAmJiBvYnNDdHhQcm0udGFnLmN2dEFyZ3Ncblx0XHRcdFx0XHRcdD8gb2JzQ3R4UHJtLnRhZy5jdnRBcmdzKHRhZ0Vsc2UsIDEpW29ic0N0eFBybS5pbmRdIC8vID0gdGFnLmJuZEFyZ3MoKSAtIGZvciB0YWcgY29udGV4dHVhbCBwYXJhbWV0ZXJcblx0XHRcdFx0XHRcdDogcmVzWzFdKHJlc1swXS5kYXRhLCByZXNbMF0sICRzdWIpICAgIC8vID0gZm4oZGF0YSwgdmlldywgJHN1YikgZm9yIGNvbXBpbGVkIGJpbmRpbmcgZXhwcmVzc2lvblxuXHRcdFx0XHRcdDogcmVzWzBdLl9vY3A7IC8vIE9ic2VydmFibGUgY29udGV4dHVhbCBwYXJhbWV0ZXIgKHVuaW5pdGlhbGl6ZWQsIG9yIGluaXRpYWxpemVkIGFzIHN0YXRpYyBleHByZXNzaW9uLCBzbyBubyBwYXRoIGRlcGVuZGVuY2llcylcblx0XHRcdFx0aWYgKGlzVXBkYXRlKSB7XG5cdFx0XHRcdFx0aWYgKHJlcyAmJiBuZXdSZXMgIT09IHZhbHVlKSB7XG5cdFx0XHRcdFx0XHQkc3ViLl91Y3Aoa2V5LCB2YWx1ZSwgc3RvcmVWaWV3LCBvYnNDdHhQcm0pOyAvLyBVcGRhdGUgb2JzZXJ2YWJsZSBjb250ZXh0dWFsIHBhcmFtZXRlclxuXHRcdFx0XHRcdH1cblx0XHRcdFx0XHRyZXR1cm4gc3RvcmVWaWV3O1xuXHRcdFx0XHR9XG5cdFx0XHRcdHJlcyA9IG5ld1Jlcztcblx0XHRcdH1cblx0XHR9XG5cdFx0aWYgKHJlcyAmJiAkaXNGdW5jdGlvbihyZXMpKSB7XG5cdFx0XHQvLyBJZiBhIGhlbHBlciBpcyBvZiB0eXBlIGZ1bmN0aW9uIHdlIHdpbGwgd3JhcCBpdCwgc28gaWYgY2FsbGVkIHdpdGggbm8gdGhpcyBwb2ludGVyIGl0IHdpbGwgYmUgY2FsbGVkIHdpdGggdGhlXG5cdFx0XHQvLyB2aWV3IGFzICd0aGlzJyBjb250ZXh0LiBJZiB0aGUgaGVscGVyIH5mb28oKSB3YXMgaW4gYSBkYXRhLWxpbmsgZXhwcmVzc2lvbiwgdGhlIHZpZXcgd2lsbCBoYXZlIGEgJ3RlbXBvcmFyeScgbGlua0N0eCBwcm9wZXJ0eSB0b28uXG5cdFx0XHQvLyBOb3RlIHRoYXQgaGVscGVyIGZ1bmN0aW9ucyBvbiBkZWVwZXIgcGF0aHMgd2lsbCBoYXZlIHNwZWNpZmljIHRoaXMgcG9pbnRlcnMsIGZyb20gdGhlIHByZWNlZGluZyBwYXRoLlxuXHRcdFx0Ly8gRm9yIGV4YW1wbGUsIH51dGlsLmZvbygpIHdpbGwgaGF2ZSB0aGUgfnV0aWwgb2JqZWN0IGFzICd0aGlzJyBwb2ludGVyXG5cdFx0XHR3cmFwcGVkID0gZnVuY3Rpb24oKSB7XG5cdFx0XHRcdHJldHVybiByZXMuYXBwbHkoKCF0aGlzIHx8IHRoaXMgPT09IGdsb2JhbCkgPyBjYWxsVmlldyA6IHRoaXMsIGFyZ3VtZW50cyk7XG5cdFx0XHR9O1xuXHRcdFx0JGV4dGVuZCh3cmFwcGVkLCByZXMpOyAvLyBBdHRhY2ggc2FtZSBleHBhbmRvcyAoaWYgYW55KSB0byB0aGUgd3JhcHBlZCBmdW5jdGlvblxuXHRcdH1cblx0XHRyZXR1cm4gd3JhcHBlZCB8fCByZXM7XG5cdH1cbn1cblxuLyogSW50ZXJuYWwgcHJpdmF0ZTogdmlldy5fZ2V0VG1wbCgpICovXG5mdW5jdGlvbiBnZXRUZW1wbGF0ZSh0bXBsKSB7XG5cdHJldHVybiB0bXBsICYmICh0bXBsLmZuXG5cdFx0PyB0bXBsXG5cdFx0OiB0aGlzLmdldFJzYyhcInRlbXBsYXRlc1wiLCB0bXBsKSB8fCAkdGVtcGxhdGVzKHRtcGwpKTsgLy8gbm90IHlldCBjb21waWxlZFxufVxuXG4vLz09PT09PT09PT09PT09XG4vLyB2aWV3cy5fY252dFxuLy89PT09PT09PT09PT09PVxuXG5mdW5jdGlvbiBjb252ZXJ0VmFsKGNvbnZlcnRlciwgdmlldywgdGFnQ3R4LCBvbkVycm9yKSB7XG5cdC8vIENhbGxlZCBmcm9tIGNvbXBpbGVkIHRlbXBsYXRlIGNvZGUgZm9yIHt7On19XG5cdC8vIHNlbGYgaXMgdGVtcGxhdGUgb2JqZWN0IG9yIGxpbmtDdHggb2JqZWN0XG5cdHZhciB0YWcsIGxpbmtDdHgsIHZhbHVlLCBhcmdzTGVuLCBiaW5kVG8sXG5cdFx0Ly8gSWYgdGFnQ3R4IGlzIGFuIGludGVnZXIsIHRoZW4gaXQgaXMgdGhlIGtleSBmb3IgdGhlIGNvbXBpbGVkIGZ1bmN0aW9uIHRvIHJldHVybiB0aGUgYm91bmRUYWcgdGFnQ3R4XG5cdFx0Ym91bmRUYWcgPSB0eXBlb2YgdGFnQ3R4ID09PSBcIm51bWJlclwiICYmIHZpZXcudG1wbC5ibmRzW3RhZ0N0eC0xXTtcblxuXHRpZiAob25FcnJvciA9PT0gdW5kZWZpbmVkICYmIGJvdW5kVGFnICYmIGJvdW5kVGFnLl9scikgeyAvLyBsYXRlUmVuZGVyXG5cdFx0b25FcnJvciA9IFwiXCI7XG5cdH1cblx0aWYgKG9uRXJyb3IgIT09IHVuZGVmaW5lZCkge1xuXHRcdHRhZ0N0eCA9IG9uRXJyb3IgPSB7cHJvcHM6IHt9LCBhcmdzOiBbb25FcnJvcl19O1xuXHR9IGVsc2UgaWYgKGJvdW5kVGFnKSB7XG5cdFx0dGFnQ3R4ID0gYm91bmRUYWcodmlldy5kYXRhLCB2aWV3LCAkc3ViKTtcblx0fVxuXHRib3VuZFRhZyA9IGJvdW5kVGFnLl9iZCAmJiBib3VuZFRhZztcblx0aWYgKGNvbnZlcnRlciB8fCBib3VuZFRhZykge1xuXHRcdGxpbmtDdHggPSB2aWV3Ll9sYzsgLy8gRm9yIGRhdGEtbGluaz1cIntjdnQ6Li4ufVwiLi4uIFNlZSBvbkRhdGFMaW5rZWRUYWdDaGFuZ2Vcblx0XHR0YWcgPSBsaW5rQ3R4ICYmIGxpbmtDdHgudGFnO1xuXHRcdHRhZ0N0eC52aWV3ID0gdmlldztcblx0XHRpZiAoIXRhZykge1xuXHRcdFx0dGFnID0gJGV4dGVuZChuZXcgJHN1Yi5fdGcoKSwge1xuXHRcdFx0XHRfOiB7XG5cdFx0XHRcdFx0Ym5kOiBib3VuZFRhZyxcblx0XHRcdFx0XHR1bmxpbmtlZDogdHJ1ZSxcblx0XHRcdFx0XHRsdDogdGFnQ3R4Lmx0IC8vIElmIGEgbGF0ZSBwYXRoIEBzb21lLnBhdGggaGFzIG5vdCByZXR1cm5lZCBAc29tZSBvYmplY3QsIG1hcmsgdGFnIGFzIGxhdGVcblx0XHRcdFx0fSxcblx0XHRcdFx0aW5saW5lOiAhbGlua0N0eCxcblx0XHRcdFx0dGFnTmFtZTogXCI6XCIsXG5cdFx0XHRcdGNvbnZlcnQ6IGNvbnZlcnRlcixcblx0XHRcdFx0b25BcnJheUNoYW5nZTogdHJ1ZSxcblx0XHRcdFx0ZmxvdzogdHJ1ZSxcblx0XHRcdFx0dGFnQ3R4OiB0YWdDdHgsXG5cdFx0XHRcdHRhZ0N0eHM6IFt0YWdDdHhdLFxuXHRcdFx0XHRfaXM6IFwidGFnXCJcblx0XHRcdH0pO1xuXHRcdFx0YXJnc0xlbiA9IHRhZ0N0eC5hcmdzLmxlbmd0aDtcblx0XHRcdGlmIChhcmdzTGVuPjEpIHtcblx0XHRcdFx0YmluZFRvID0gdGFnLmJpbmRUbyA9IFtdO1xuXHRcdFx0XHR3aGlsZSAoYXJnc0xlbi0tKSB7XG5cdFx0XHRcdFx0YmluZFRvLnVuc2hpZnQoYXJnc0xlbik7IC8vIEJpbmQgdG8gYWxsIHRoZSBhcmd1bWVudHMgLSBnZW5lcmF0ZSBiaW5kVG8gYXJyYXk6IFswLDEsMi4uLl1cblx0XHRcdFx0fVxuXHRcdFx0fVxuXHRcdFx0aWYgKGxpbmtDdHgpIHtcblx0XHRcdFx0bGlua0N0eC50YWcgPSB0YWc7XG5cdFx0XHRcdHRhZy5saW5rQ3R4ID0gbGlua0N0eDtcblx0XHRcdH1cblx0XHRcdHRhZ0N0eC5jdHggPSBleHRlbmRDdHgodGFnQ3R4LmN0eCwgKGxpbmtDdHggPyBsaW5rQ3R4LnZpZXcgOiB2aWV3KS5jdHgpO1xuXHRcdFx0dGFnSGFuZGxlcnNGcm9tUHJvcHModGFnLCB0YWdDdHgpO1xuXHRcdH1cblx0XHR0YWcuX2VyID0gb25FcnJvciAmJiB2YWx1ZTtcblx0XHR0YWcuY3R4ID0gdGFnQ3R4LmN0eCB8fCB0YWcuY3R4IHx8IHt9O1xuXHRcdHRhZ0N0eC5jdHggPSB1bmRlZmluZWQ7XG5cdFx0dmFsdWUgPSB0YWcuY3Z0QXJncygpWzBdOyAvLyBJZiB0aGVyZSBpcyBhIGNvbnZlcnRCYWNrIGJ1dCBubyBjb252ZXJ0LCBjb252ZXJ0ZXIgd2lsbCBiZSBcInRydWVcIlxuXHRcdHRhZy5fZXIgPSBvbkVycm9yICYmIHZhbHVlO1xuXHR9IGVsc2Uge1xuXHRcdHZhbHVlID0gdGFnQ3R4LmFyZ3NbMF07XG5cdH1cblxuXHQvLyBDYWxsIG9uUmVuZGVyICh1c2VkIGJ5IEpzVmlld3MgaWYgcHJlc2VudCwgdG8gYWRkIGJpbmRpbmcgYW5ub3RhdGlvbnMgYXJvdW5kIHJlbmRlcmVkIGNvbnRlbnQpXG5cdHZhbHVlID0gYm91bmRUYWcgJiYgdmlldy5fLm9uUmVuZGVyXG5cdFx0PyB2aWV3Ll8ub25SZW5kZXIodmFsdWUsIHZpZXcsIHRhZylcblx0XHQ6IHZhbHVlO1xuXHRyZXR1cm4gdmFsdWUgIT0gdW5kZWZpbmVkID8gdmFsdWUgOiBcIlwiO1xufVxuXG5mdW5jdGlvbiBjb252ZXJ0QXJncyh0YWdFbHNlLCBib3VuZCkgeyAvLyB0YWcuY3Z0QXJncygpIG9yIHRhZy5jdnRBcmdzKHRhZ0Vsc2U/LCB0cnVlPylcblx0dmFyIGwsIGtleSwgYm91bmRBcmdzLCBhcmdzLCBiaW5kRnJvbSwgdGFnLCBjb252ZXJ0ZXIsXG5cdFx0dGFnQ3R4ID0gdGhpcztcblxuXHRpZiAodGFnQ3R4LnRhZ05hbWUpIHtcblx0XHR0YWcgPSB0YWdDdHg7XG5cdFx0dGFnQ3R4ID0gKHRhZy50YWdDdHhzIHx8IFt0YWdDdHhdKVt0YWdFbHNlfHwwXTtcblx0XHRpZiAoIXRhZ0N0eCkge1xuXHRcdFx0cmV0dXJuO1xuXHRcdH1cblx0fSBlbHNlIHtcblx0XHR0YWcgPSB0YWdDdHgudGFnO1xuXHR9XG5cblx0YmluZEZyb20gPSB0YWcuYmluZEZyb207XG5cdGFyZ3MgPSB0YWdDdHguYXJncztcblxuXHRpZiAoKGNvbnZlcnRlciA9IHRhZy5jb252ZXJ0KSAmJiBcIlwiICsgY29udmVydGVyID09PSBjb252ZXJ0ZXIpIHtcblx0XHRjb252ZXJ0ZXIgPSBjb252ZXJ0ZXIgPT09IFwidHJ1ZVwiXG5cdFx0XHQ/IHVuZGVmaW5lZFxuXHRcdFx0OiAodGFnQ3R4LnZpZXcuZ2V0UnNjKFwiY29udmVydGVyc1wiLCBjb252ZXJ0ZXIpIHx8IGVycm9yKFwiVW5rbm93biBjb252ZXJ0ZXI6ICdcIiArIGNvbnZlcnRlciArIFwiJ1wiKSk7XG5cdH1cblxuXHRpZiAoY29udmVydGVyICYmICFib3VuZCkgeyAvLyBJZiB0aGVyZSBpcyBhIGNvbnZlcnRlciwgdXNlIGEgY29weSBvZiB0aGUgdGFnQ3R4LmFyZ3MgYXJyYXkgZm9yIHJlbmRlcmluZywgYW5kIHJlcGxhY2UgdGhlIGFyZ3NbMF0gaW5cblx0XHRhcmdzID0gYXJncy5zbGljZSgpOyAvLyB0aGUgY29waWVkIGFycmF5IHdpdGggdGhlIGNvbnZlcnRlZCB2YWx1ZS4gQnV0IHdlIGRvIG5vdCBtb2RpZnkgdGhlIHZhbHVlIG9mIHRhZy50YWdDdHguYXJnc1swXSAodGhlIG9yaWdpbmFsIGFyZ3MgYXJyYXkpXG5cdH1cblx0aWYgKGJpbmRGcm9tKSB7IC8vIEdldCB0aGUgdmFsdWVzIG9mIHRoZSBib3VuZEFyZ3Ncblx0XHRib3VuZEFyZ3MgPSBbXTtcblx0XHRsID0gYmluZEZyb20ubGVuZ3RoO1xuXHRcdHdoaWxlIChsLS0pIHtcblx0XHRcdGtleSA9IGJpbmRGcm9tW2xdO1xuXHRcdFx0Ym91bmRBcmdzLnVuc2hpZnQoYXJnT3JQcm9wKHRhZ0N0eCwga2V5KSk7XG5cdFx0fVxuXHRcdGlmIChib3VuZCkge1xuXHRcdFx0YXJncyA9IGJvdW5kQXJnczsgLy8gQ2FsbCB0byBibmRBcmdzKCkgLSByZXR1cm5zIHRoZSBib3VuZEFyZ3Ncblx0XHR9XG5cdH1cblx0aWYgKGNvbnZlcnRlcikge1xuXHRcdGNvbnZlcnRlciA9IGNvbnZlcnRlci5hcHBseSh0YWcsIGJvdW5kQXJncyB8fCBhcmdzKTtcblx0XHRpZiAoY29udmVydGVyID09PSB1bmRlZmluZWQpIHtcblx0XHRcdHJldHVybiBhcmdzOyAvLyBSZXR1cm5pbmcgdW5kZWZpbmVkIGZyb20gYSBjb252ZXJ0ZXIgaXMgZXF1aXZhbGVudCB0byBub3QgaGF2aW5nIGEgY29udmVydGVyLlxuXHRcdH1cblx0XHRiaW5kRnJvbSA9IGJpbmRGcm9tIHx8IFswXTtcblx0XHRsID0gYmluZEZyb20ubGVuZ3RoO1xuXHRcdGlmICghJGlzQXJyYXkoY29udmVydGVyKSB8fCBjb252ZXJ0ZXIubGVuZ3RoICE9PSBsKSB7XG5cdFx0XHRjb252ZXJ0ZXIgPSBbY29udmVydGVyXTtcblx0XHRcdGJpbmRGcm9tID0gWzBdO1xuXHRcdFx0bCA9IDE7XG5cdFx0fVxuXHRcdGlmIChib3VuZCkgeyAgICAgICAgLy8gQ2FsbCB0byBibmRBcmdzKCkgLSBzbyBhcHBseSBjb252ZXJ0ZXIgdG8gYWxsIGJvdW5kQXJnc1xuXHRcdFx0YXJncyA9IGNvbnZlcnRlcjsgLy8gVGhlIGFycmF5IG9mIHZhbHVlcyByZXR1cm5lZCBmcm9tIHRoZSBjb252ZXJ0ZXJcblx0XHR9IGVsc2UgeyAgICAgICAgICAgIC8vIENhbGwgdG8gY3Z0QXJncygpXG5cdFx0XHR3aGlsZSAobC0tKSB7XG5cdFx0XHRcdGtleSA9IGJpbmRGcm9tW2xdO1xuXHRcdFx0XHRpZiAoK2tleSA9PT0ga2V5KSB7XG5cdFx0XHRcdFx0YXJnc1trZXldID0gY29udmVydGVyW2xdO1xuXHRcdFx0XHR9XG5cdFx0XHR9XG5cdFx0fVxuXHR9XG5cdHJldHVybiBhcmdzO1xufVxuXG5mdW5jdGlvbiBhcmdPclByb3AoY29udGV4dCwga2V5KSB7XG5cdGNvbnRleHQgPSBjb250ZXh0WytrZXkgPT09IGtleSA/IFwiYXJnc1wiIDogXCJwcm9wc1wiXTtcblx0cmV0dXJuIGNvbnRleHQgJiYgY29udGV4dFtrZXldO1xufVxuXG5mdW5jdGlvbiBjb252ZXJ0Qm91bmRBcmdzKHRhZ0Vsc2UpIHsgLy8gdGFnLmJuZEFyZ3MoKVxuXHRyZXR1cm4gdGhpcy5jdnRBcmdzKHRhZ0Vsc2UsIDEpO1xufVxuXG4vLz09PT09PT09PT09PT1cbi8vIHZpZXdzLnRhZ1xuLy89PT09PT09PT09PT09XG5cbi8qIHZpZXcuZ2V0UnNjKCkgKi9cbmZ1bmN0aW9uIGdldFJlc291cmNlKHJlc291cmNlVHlwZSwgaXRlbU5hbWUpIHtcblx0dmFyIHJlcywgc3RvcmUsXG5cdFx0dmlldyA9IHRoaXM7XG5cdGlmIChcIlwiICsgaXRlbU5hbWUgPT09IGl0ZW1OYW1lKSB7XG5cdFx0d2hpbGUgKChyZXMgPT09IHVuZGVmaW5lZCkgJiYgdmlldykge1xuXHRcdFx0c3RvcmUgPSB2aWV3LnRtcGwgJiYgdmlldy50bXBsW3Jlc291cmNlVHlwZV07XG5cdFx0XHRyZXMgPSBzdG9yZSAmJiBzdG9yZVtpdGVtTmFtZV07XG5cdFx0XHR2aWV3ID0gdmlldy5wYXJlbnQ7XG5cdFx0fVxuXHRcdHJldHVybiByZXMgfHwgJHZpZXdzW3Jlc291cmNlVHlwZV1baXRlbU5hbWVdO1xuXHR9XG59XG5cbmZ1bmN0aW9uIHJlbmRlclRhZyh0YWdOYW1lLCBwYXJlbnRWaWV3LCB0bXBsLCB0YWdDdHhzLCBpc1VwZGF0ZSwgb25FcnJvcikge1xuXHRmdW5jdGlvbiBiaW5kVG9PckJpbmRGcm9tKHR5cGUpIHtcblx0XHR2YXIgYmluZEFycmF5ID0gdGFnW3R5cGVdO1xuXG5cdFx0aWYgKGJpbmRBcnJheSAhPT0gdW5kZWZpbmVkKSB7XG5cdFx0XHRiaW5kQXJyYXkgPSAkaXNBcnJheShiaW5kQXJyYXkpID8gYmluZEFycmF5IDogW2JpbmRBcnJheV07XG5cdFx0XHRtID0gYmluZEFycmF5Lmxlbmd0aDtcblx0XHRcdHdoaWxlIChtLS0pIHtcblx0XHRcdFx0a2V5ID0gYmluZEFycmF5W21dO1xuXHRcdFx0XHRpZiAoIWlzTmFOKHBhcnNlSW50KGtleSkpKSB7XG5cdFx0XHRcdFx0YmluZEFycmF5W21dID0gcGFyc2VJbnQoa2V5KTsgLy8gQ29udmVydCBcIjBcIiB0byAwLCAgZXRjLlxuXHRcdFx0XHR9XG5cdFx0XHR9XG5cdFx0fVxuXG5cdFx0cmV0dXJuIGJpbmRBcnJheSB8fCBbMF07XG5cdH1cblxuXHRwYXJlbnRWaWV3ID0gcGFyZW50VmlldyB8fCB0b3BWaWV3O1xuXHR2YXIgdGFnLCB0YWdEZWYsIHRlbXBsYXRlLCB0YWdzLCBhdHRyLCBwYXJlbnRUYWcsIGwsIG0sIG4sIGl0ZW1SZXQsIHRhZ0N0eCwgdGFnQ3R4Q3R4LCBjdHhQcm0sIGJpbmRUbywgYmluZEZyb20sIGluaXRWYWwsXG5cdFx0Y29udGVudCwgY2FsbEluaXQsIG1hcERlZiwgdGhpc01hcCwgYXJncywgYmRBcmdzLCBwcm9wcywgdGFnRGF0YU1hcCwgY29udGVudEN0eCwga2V5LCBiaW5kRnJvbUxlbmd0aCwgYmluZFRvTGVuZ3RoLCBsaW5rZWRFbGVtZW50LCBkZWZhdWx0Q3R4LFxuXHRcdGkgPSAwLFxuXHRcdHJldCA9IFwiXCIsXG5cdFx0bGlua0N0eCA9IHBhcmVudFZpZXcuX2xjIHx8IGZhbHNlLCAvLyBGb3IgZGF0YS1saW5rPVwie215VGFnLi4ufVwiLi4uIFNlZSBvbkRhdGFMaW5rZWRUYWdDaGFuZ2Vcblx0XHRjdHggPSBwYXJlbnRWaWV3LmN0eCxcblx0XHRwYXJlbnRUbXBsID0gdG1wbCB8fCBwYXJlbnRWaWV3LnRtcGwsXG5cdFx0Ly8gSWYgdGFnQ3R4cyBpcyBhbiBpbnRlZ2VyLCB0aGVuIGl0IGlzIHRoZSBrZXkgZm9yIHRoZSBjb21waWxlZCBmdW5jdGlvbiB0byByZXR1cm4gdGhlIGJvdW5kVGFnIHRhZ0N0eHNcblx0XHRib3VuZFRhZyA9IHR5cGVvZiB0YWdDdHhzID09PSBcIm51bWJlclwiICYmIHBhcmVudFZpZXcudG1wbC5ibmRzW3RhZ0N0eHMtMV07XG5cblx0aWYgKHRhZ05hbWUuX2lzID09PSBcInRhZ1wiKSB7XG5cdFx0dGFnID0gdGFnTmFtZTtcblx0XHR0YWdOYW1lID0gdGFnLnRhZ05hbWU7XG5cdFx0dGFnQ3R4cyA9IHRhZy50YWdDdHhzO1xuXHRcdHRlbXBsYXRlID0gdGFnLnRlbXBsYXRlO1xuXHR9IGVsc2Uge1xuXHRcdHRhZ0RlZiA9IHBhcmVudFZpZXcuZ2V0UnNjKFwidGFnc1wiLCB0YWdOYW1lKSB8fCBlcnJvcihcIlVua25vd24gdGFnOiB7e1wiICsgdGFnTmFtZSArIFwifX0gXCIpO1xuXHRcdHRlbXBsYXRlID0gdGFnRGVmLnRlbXBsYXRlO1xuXHR9XG5cdGlmIChvbkVycm9yID09PSB1bmRlZmluZWQgJiYgYm91bmRUYWcgJiYgKGJvdW5kVGFnLl9sciA9ICh0YWdEZWYubGF0ZVJlbmRlciAmJiBib3VuZFRhZy5fbHIhPT0gZmFsc2UgfHwgYm91bmRUYWcuX2xyKSkpIHtcblx0XHRvbkVycm9yID0gXCJcIjsgLy8gSWYgbGF0ZVJlbmRlciwgc2V0IHRlbXBvcmFyeSBvbkVycm9yLCB0byBza2lwIGluaXRpYWwgcmVuZGVyaW5nIChhbmQgcmVuZGVyIGp1c3QgXCJcIilcblx0fVxuXHRpZiAob25FcnJvciAhPT0gdW5kZWZpbmVkKSB7XG5cdFx0cmV0ICs9IG9uRXJyb3I7XG5cdFx0dGFnQ3R4cyA9IG9uRXJyb3IgPSBbe3Byb3BzOiB7fSwgYXJnczogW10sIHBhcmFtczoge3Byb3BzOnt9fX1dO1xuXHR9IGVsc2UgaWYgKGJvdW5kVGFnKSB7XG5cdFx0dGFnQ3R4cyA9IGJvdW5kVGFnKHBhcmVudFZpZXcuZGF0YSwgcGFyZW50VmlldywgJHN1Yik7XG5cdH1cblxuXHRsID0gdGFnQ3R4cy5sZW5ndGg7XG5cdGZvciAoOyBpIDwgbDsgaSsrKSB7XG5cdFx0dGFnQ3R4ID0gdGFnQ3R4c1tpXTtcblx0XHRjb250ZW50ID0gdGFnQ3R4LnRtcGw7XG5cdFx0aWYgKCFsaW5rQ3R4IHx8ICFsaW5rQ3R4LnRhZyB8fCBpICYmICFsaW5rQ3R4LnRhZy5pbmxpbmUgfHwgdGFnLl9lciB8fCBjb250ZW50ICYmICtjb250ZW50PT09Y29udGVudCkge1xuXHRcdFx0Ly8gSW5pdGlhbGl6ZSB0YWdDdHhcblx0XHRcdC8vIEZvciBibG9jayB0YWdzLCB0YWdDdHgudG1wbCBpcyBhbiBpbnRlZ2VyID4gMFxuXHRcdFx0aWYgKGNvbnRlbnQgJiYgcGFyZW50VG1wbC50bXBscykge1xuXHRcdFx0XHR0YWdDdHgudG1wbCA9IHRhZ0N0eC5jb250ZW50ID0gcGFyZW50VG1wbC50bXBsc1tjb250ZW50IC0gMV07IC8vIFNldCB0aGUgdG1wbCBwcm9wZXJ0eSB0byB0aGUgY29udGVudCBvZiB0aGUgYmxvY2sgdGFnXG5cdFx0XHR9XG5cdFx0XHR0YWdDdHguaW5kZXggPSBpO1xuXHRcdFx0dGFnQ3R4LmN0eFBybSA9IGNvbnRleHRQYXJhbWV0ZXI7XG5cdFx0XHR0YWdDdHgucmVuZGVyID0gcmVuZGVyQ29udGVudDtcblx0XHRcdHRhZ0N0eC5jdnRBcmdzID0gY29udmVydEFyZ3M7XG5cdFx0XHR0YWdDdHguYm5kQXJncyA9IGNvbnZlcnRCb3VuZEFyZ3M7XG5cdFx0XHR0YWdDdHgudmlldyA9IHBhcmVudFZpZXc7XG5cdFx0XHR0YWdDdHguY3R4ID0gZXh0ZW5kQ3R4KGV4dGVuZEN0eCh0YWdDdHguY3R4LCB0YWdEZWYgJiYgdGFnRGVmLmN0eCksIGN0eCk7IC8vIENsb25lIGFuZCBleHRlbmQgcGFyZW50Vmlldy5jdHhcblx0XHR9XG5cdFx0aWYgKHRtcGwgPSB0YWdDdHgucHJvcHMudG1wbCkge1xuXHRcdFx0Ly8gSWYgdGhlIHRtcGwgcHJvcGVydHkgaXMgb3ZlcnJpZGRlbiwgc2V0IHRoZSB2YWx1ZSAod2hlbiBpbml0aWFsaXppbmcsIG9yLCBpbiBjYXNlIG9mIGJpbmRpbmc6IF50bXBsPS4uLiwgd2hlbiB1cGRhdGluZylcblx0XHRcdHRhZ0N0eC50bXBsID0gcGFyZW50Vmlldy5fZ2V0VG1wbCh0bXBsKTtcblx0XHRcdHRhZ0N0eC5jb250ZW50ID0gdGFnQ3R4LmNvbnRlbnQgfHwgdGFnQ3R4LnRtcGw7XG5cdFx0fVxuXG5cdFx0aWYgKCF0YWcpIHtcblx0XHRcdC8vIFRoaXMgd2lsbCBvbmx5IGJlIGhpdCBmb3IgaW5pdGlhbCB0YWdDdHggKG5vdCBmb3Ige3tlbHNlfX0pIC0gaWYgdGhlIHRhZyBpbnN0YW5jZSBkb2VzIG5vdCBleGlzdCB5ZXRcblx0XHRcdC8vIElmIHRoZSB0YWcgaGFzIG5vdCBhbHJlYWR5IGJlZW4gaW5zdGFudGlhdGVkLCB3ZSB3aWxsIGNyZWF0ZSBhIG5ldyBpbnN0YW5jZS5cblx0XHRcdC8vIH50YWcgd2lsbCBhY2Nlc3MgdGhlIHRhZywgZXZlbiB3aXRoaW4gdGhlIHJlbmRlcmluZyBvZiB0aGUgdGVtcGxhdGUgY29udGVudCBvZiB0aGlzIHRhZy5cblx0XHRcdC8vIEZyb20gY2hpbGQvZGVzY2VuZGFudCB0YWdzLCBjYW4gYWNjZXNzIHVzaW5nIH50YWcucGFyZW50LCBvciB+cGFyZW50VGFncy50YWdOYW1lXG5cdFx0XHR0YWcgPSBuZXcgdGFnRGVmLl9jdHIoKTtcblx0XHRcdGNhbGxJbml0ID0gISF0YWcuaW5pdDtcblxuXHRcdFx0dGFnLnBhcmVudCA9IHBhcmVudFRhZyA9IGN0eCAmJiBjdHgudGFnO1xuXHRcdFx0dGFnLnRhZ0N0eHMgPSB0YWdDdHhzO1xuXG5cdFx0XHRpZiAobGlua0N0eCkge1xuXHRcdFx0XHR0YWcuaW5saW5lID0gZmFsc2U7XG5cdFx0XHRcdGxpbmtDdHgudGFnID0gdGFnO1xuXHRcdFx0fVxuXHRcdFx0dGFnLmxpbmtDdHggPSBsaW5rQ3R4O1xuXHRcdFx0aWYgKHRhZy5fLmJuZCA9IGJvdW5kVGFnIHx8IGxpbmtDdHguZm4pIHtcblx0XHRcdFx0Ly8gQm91bmQgaWYge157dGFnLi4ufX0gb3IgZGF0YS1saW5rPVwie3RhZy4uLn1cIlxuXHRcdFx0XHR0YWcuXy50aHMgPSB0YWdDdHgucGFyYW1zLnByb3BzLnRoaXM7IC8vIFRhZyBoYXMgYSB0aGlzPWV4cHIgYmluZGluZywgdG8gZ2V0IGphdmFzY3JpcHQgcmVmZXJlbmNlIHRvIHRhZyBpbnN0YW5jZVxuXHRcdFx0XHR0YWcuXy5sdCA9IHRhZ0N0eHMubHQ7IC8vIElmIGEgbGF0ZSBwYXRoIEBzb21lLnBhdGggaGFzIG5vdCByZXR1cm5lZCBAc29tZSBvYmplY3QsIG1hcmsgdGFnIGFzIGxhdGVcblx0XHRcdFx0dGFnLl8uYXJyVndzID0ge307XG5cdFx0XHR9IGVsc2UgaWYgKHRhZy5kYXRhQm91bmRPbmx5KSB7XG5cdFx0XHRcdGVycm9yKHRhZ05hbWUgKyBcIiBtdXN0IGJlIGRhdGEtYm91bmQ6XFxue157XCIgKyB0YWdOYW1lICsgXCJ9fVwiKTtcblx0XHRcdH1cblx0XHRcdC8vVE9ETyBiZXR0ZXIgcGVyZiBmb3IgY2hpbGRUYWdzKCkgLSBrZWVwIGNoaWxkIHRhZy50YWdzIGFycmF5LCAoYW5kIHJlbW92ZSBjaGlsZCwgd2hlbiBkaXNwb3NlZClcblx0XHRcdC8vIHRhZy50YWdzID0gW107XG5cdFx0fSBlbHNlIGlmIChsaW5rQ3R4ICYmIGxpbmtDdHguZm4uX2xyKSB7XG5cdFx0XHRjYWxsSW5pdCA9ICEhdGFnLmluaXQ7XG5cdFx0fVxuXHRcdHRhZ0RhdGFNYXAgPSB0YWcuZGF0YU1hcDtcblxuXHRcdHRhZ0N0eC50YWcgPSB0YWc7XG5cdFx0aWYgKHRhZ0RhdGFNYXAgJiYgdGFnQ3R4cykge1xuXHRcdFx0dGFnQ3R4Lm1hcCA9IHRhZ0N0eHNbaV0ubWFwOyAvLyBDb3B5IG92ZXIgdGhlIGNvbXBpbGVkIG1hcCBpbnN0YW5jZSBmcm9tIHRoZSBwcmV2aW91cyB0YWdDdHhzIHRvIHRoZSByZWZyZXNoZWQgb25lc1xuXHRcdH1cblx0XHRpZiAoIXRhZy5mbG93KSB7XG5cdFx0XHR0YWdDdHhDdHggPSB0YWdDdHguY3R4ID0gdGFnQ3R4LmN0eCB8fCB7fTtcblxuXHRcdFx0Ly8gdGFncyBoYXNoOiB0YWcuY3R4LnRhZ3MsIG1lcmdlZCB3aXRoIHBhcmVudFZpZXcuY3R4LnRhZ3MsXG5cdFx0XHR0YWdzID0gdGFnLnBhcmVudHMgPSB0YWdDdHhDdHgucGFyZW50VGFncyA9IGN0eCAmJiBleHRlbmRDdHgodGFnQ3R4Q3R4LnBhcmVudFRhZ3MsIGN0eC5wYXJlbnRUYWdzKSB8fCB7fTtcblx0XHRcdGlmIChwYXJlbnRUYWcpIHtcblx0XHRcdFx0dGFnc1twYXJlbnRUYWcudGFnTmFtZV0gPSBwYXJlbnRUYWc7XG5cdFx0XHRcdC8vVE9ETyBiZXR0ZXIgcGVyZiBmb3IgY2hpbGRUYWdzOiBwYXJlbnRUYWcudGFncy5wdXNoKHRhZyk7XG5cdFx0XHR9XG5cdFx0XHR0YWdzW3RhZy50YWdOYW1lXSA9IHRhZ0N0eEN0eC50YWcgPSB0YWc7XG5cdFx0XHR0YWdDdHhDdHgudGFnQ3R4ID0gdGFnQ3R4O1xuXHRcdH1cblx0fVxuXHRpZiAoISh0YWcuX2VyID0gb25FcnJvcikpIHtcblx0XHR0YWdIYW5kbGVyc0Zyb21Qcm9wcyh0YWcsIHRhZ0N0eHNbMF0pO1xuXHRcdHRhZy5yZW5kZXJpbmcgPSB7cm5kcjogdGFnLnJlbmRlcmluZ307IC8vIFByb3ZpZGUgb2JqZWN0IGZvciBzdGF0ZSBkdXJpbmcgcmVuZGVyIGNhbGxzIHRvIHRhZyBhbmQgZWxzZXMuIChVc2VkIGJ5IHt7aWZ9fSBhbmQge3tmb3J9fS4uLilcblx0XHRmb3IgKGkgPSAwOyBpIDwgbDsgaSsrKSB7IC8vIEl0ZXJhdGUgdGFnQ3R4IGZvciBlYWNoIHt7ZWxzZX19IGJsb2NrXG5cdFx0XHR0YWdDdHggPSB0YWcudGFnQ3R4ID0gdGFnQ3R4c1tpXTtcblx0XHRcdHByb3BzID0gdGFnQ3R4LnByb3BzO1xuXHRcdFx0dGFnLmN0eCA9IHRhZ0N0eC5jdHg7XG5cblx0XHRcdGlmICghaSkge1xuXHRcdFx0XHRpZiAoY2FsbEluaXQpIHtcblx0XHRcdFx0XHR0YWcuaW5pdCh0YWdDdHgsIGxpbmtDdHgsIHRhZy5jdHgpO1xuXHRcdFx0XHRcdGNhbGxJbml0ID0gdW5kZWZpbmVkO1xuXHRcdFx0XHR9XG5cdFx0XHRcdGlmICghdGFnQ3R4LmFyZ3MubGVuZ3RoICYmIHRhZ0N0eC5hcmdEZWZhdWx0ICE9PSBmYWxzZSAmJiB0YWcuYXJnRGVmYXVsdCAhPT0gZmFsc2UpIHtcblx0XHRcdFx0XHR0YWdDdHguYXJncyA9IGFyZ3MgPSBbdGFnQ3R4LnZpZXcuZGF0YV07IC8vIE1pc3NpbmcgZmlyc3QgYXJnIGRlZmF1bHRzIHRvIHRoZSBjdXJyZW50IGRhdGEgY29udGV4dFxuXHRcdFx0XHRcdHRhZ0N0eC5wYXJhbXMuYXJncyA9IFtcIiNkYXRhXCJdO1xuXHRcdFx0XHR9XG5cblx0XHRcdFx0YmluZFRvID0gYmluZFRvT3JCaW5kRnJvbShcImJpbmRUb1wiKTtcblxuXHRcdFx0XHRpZiAodGFnLmJpbmRUbyAhPT0gdW5kZWZpbmVkKSB7XG5cdFx0XHRcdFx0dGFnLmJpbmRUbyA9IGJpbmRUbztcblx0XHRcdFx0fVxuXG5cdFx0XHRcdGlmICh0YWcuYmluZEZyb20gIT09IHVuZGVmaW5lZCkge1xuXHRcdFx0XHRcdHRhZy5iaW5kRnJvbSA9IGJpbmRUb09yQmluZEZyb20oXCJiaW5kRnJvbVwiKTtcblx0XHRcdFx0fSBlbHNlIGlmICh0YWcuYmluZFRvKSB7XG5cdFx0XHRcdFx0dGFnLmJpbmRGcm9tID0gdGFnLmJpbmRUbyA9IGJpbmRUbztcblx0XHRcdFx0fVxuXHRcdFx0XHRiaW5kRnJvbSA9IHRhZy5iaW5kRnJvbSB8fCBiaW5kVG87XG5cblx0XHRcdFx0YmluZFRvTGVuZ3RoID0gYmluZFRvLmxlbmd0aDtcblx0XHRcdFx0YmluZEZyb21MZW5ndGggPSBiaW5kRnJvbS5sZW5ndGg7XG5cblx0XHRcdFx0aWYgKHRhZy5fLmJuZCAmJiAobGlua2VkRWxlbWVudCA9IHRhZy5saW5rZWRFbGVtZW50KSkge1xuXHRcdFx0XHRcdHRhZy5saW5rZWRFbGVtZW50ID0gbGlua2VkRWxlbWVudCA9ICRpc0FycmF5KGxpbmtlZEVsZW1lbnQpID8gbGlua2VkRWxlbWVudDogW2xpbmtlZEVsZW1lbnRdO1xuXG5cdFx0XHRcdFx0aWYgKGJpbmRUb0xlbmd0aCAhPT0gbGlua2VkRWxlbWVudC5sZW5ndGgpIHtcblx0XHRcdFx0XHRcdGVycm9yKFwibGlua2VkRWxlbWVudCBub3Qgc2FtZSBsZW5ndGggYXMgYmluZFRvXCIpO1xuXHRcdFx0XHRcdH1cblx0XHRcdFx0fVxuXHRcdFx0XHRpZiAobGlua2VkRWxlbWVudCA9IHRhZy5saW5rZWRDdHhQYXJhbSkge1xuXHRcdFx0XHRcdHRhZy5saW5rZWRDdHhQYXJhbSA9IGxpbmtlZEVsZW1lbnQgPSAkaXNBcnJheShsaW5rZWRFbGVtZW50KSA/IGxpbmtlZEVsZW1lbnQ6IFtsaW5rZWRFbGVtZW50XTtcblxuXHRcdFx0XHRcdGlmIChiaW5kRnJvbUxlbmd0aCAhPT0gbGlua2VkRWxlbWVudC5sZW5ndGgpIHtcblx0XHRcdFx0XHRcdGVycm9yKFwibGlua2VkQ3R4UGFyYW0gbm90IHNhbWUgbGVuZ3RoIGFzIGJpbmRGcm9tL2JpbmRUb1wiKTtcblx0XHRcdFx0XHR9XG5cdFx0XHRcdH1cblxuXHRcdFx0XHRpZiAoYmluZEZyb20pIHtcblx0XHRcdFx0XHR0YWcuXy5mcm9tSW5kZXggPSB7fTsgLy8gSGFzaCBvZiBiaW5kRnJvbSBpbmRleCB3aGljaCBoYXMgc2FtZSBwYXRoIHZhbHVlIGFzIGJpbmRUbyBpbmRleC4gZnJvbUluZGV4ID0gdGFnLl8uZnJvbUluZGV4W3RvSW5kZXhdXG5cdFx0XHRcdFx0dGFnLl8udG9JbmRleCA9IHt9OyAvLyBIYXNoIG9mIGJpbmRGcm9tIGluZGV4IHdoaWNoIGhhcyBzYW1lIHBhdGggdmFsdWUgYXMgYmluZFRvIGluZGV4LiBmcm9tSW5kZXggPSB0YWcuXy5mcm9tSW5kZXhbdG9JbmRleF1cblx0XHRcdFx0XHRuID0gYmluZEZyb21MZW5ndGg7XG5cdFx0XHRcdFx0d2hpbGUgKG4tLSkge1xuXHRcdFx0XHRcdFx0a2V5ID0gYmluZEZyb21bbl07XG5cdFx0XHRcdFx0XHRtID0gYmluZFRvTGVuZ3RoO1xuXHRcdFx0XHRcdFx0d2hpbGUgKG0tLSkge1xuXHRcdFx0XHRcdFx0XHRpZiAoa2V5ID09PSBiaW5kVG9bbV0pIHtcblx0XHRcdFx0XHRcdFx0XHR0YWcuXy5mcm9tSW5kZXhbbV0gPSBuO1xuXHRcdFx0XHRcdFx0XHRcdHRhZy5fLnRvSW5kZXhbbl0gPSBtO1xuXHRcdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHR9XG5cblx0XHRcdFx0aWYgKGxpbmtDdHgpIHtcblx0XHRcdFx0XHQvLyBTZXQgYXR0ciBvbiBsaW5rQ3R4IHRvIGVuc3VyZSBvdXRwdXR0aW5nIHRvIHRoZSBjb3JyZWN0IHRhcmdldCBhdHRyaWJ1dGUuXG5cdFx0XHRcdFx0Ly8gU2V0dGluZyBlaXRoZXIgbGlua0N0eC5hdHRyIG9yIHRoaXMuYXR0ciBpbiB0aGUgaW5pdCgpIGFsbG93cyBwZXItaW5zdGFuY2UgY2hvaWNlIG9mIHRhcmdldCBhdHRyaWIuXG5cdFx0XHRcdFx0bGlua0N0eC5hdHRyID0gdGFnLmF0dHIgPSBsaW5rQ3R4LmF0dHIgfHwgdGFnLmF0dHIgfHwgbGlua0N0eC5fZGZBdDtcblx0XHRcdFx0fVxuXHRcdFx0XHRhdHRyID0gdGFnLmF0dHI7XG5cdFx0XHRcdHRhZy5fLm5vVndzID0gYXR0ciAmJiBhdHRyICE9PSBIVE1MO1xuXHRcdFx0fVxuXHRcdFx0YXJncyA9IHRhZy5jdnRBcmdzKGkpO1xuXHRcdFx0aWYgKHRhZy5saW5rZWRDdHhQYXJhbSkge1xuXHRcdFx0XHRiZEFyZ3MgPSB0YWcuY3Z0QXJncyhpLCAxKTtcblx0XHRcdFx0bSA9IGJpbmRGcm9tTGVuZ3RoO1xuXHRcdFx0XHRkZWZhdWx0Q3R4ID0gdGFnLmNvbnN0cnVjdG9yLnByb3RvdHlwZS5jdHg7XG5cdFx0XHRcdHdoaWxlIChtLS0pIHtcblx0XHRcdFx0XHRpZiAoY3R4UHJtID0gdGFnLmxpbmtlZEN0eFBhcmFtW21dKSB7XG5cdFx0XHRcdFx0XHRrZXkgPSBiaW5kRnJvbVttXTtcblx0XHRcdFx0XHRcdGluaXRWYWwgPSBiZEFyZ3NbbV07XG5cdFx0XHRcdFx0XHQvLyBDcmVhdGUgdGFnIGNvbnRleHR1YWwgcGFyYW1ldGVyXG5cdFx0XHRcdFx0XHR0YWdDdHguY3R4W2N0eFBybV0gPSAkc3ViLl9jcChcblx0XHRcdFx0XHRcdFx0ZGVmYXVsdEN0eCAmJiBpbml0VmFsID09PSB1bmRlZmluZWQgPyBkZWZhdWx0Q3R4W2N0eFBybV06IGluaXRWYWwsXG5cdFx0XHRcdFx0XHRcdGluaXRWYWwgIT09IHVuZGVmaW5lZCAmJiBhcmdPclByb3AodGFnQ3R4LnBhcmFtcywga2V5KSxcblx0XHRcdFx0XHRcdFx0dGFnQ3R4LnZpZXcsXG5cdFx0XHRcdFx0XHRcdHRhZy5fLmJuZCAmJiB7dGFnOiB0YWcsIGN2dDogdGFnLmNvbnZlcnQsIGluZDogbSwgdGFnRWxzZTogaX1cblx0XHRcdFx0XHRcdCk7XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHR9XG5cdFx0XHR9XG5cdFx0XHRpZiAoKG1hcERlZiA9IHByb3BzLmRhdGFNYXAgfHwgdGFnRGF0YU1hcCkgJiYgKGFyZ3MubGVuZ3RoIHx8IHByb3BzLmRhdGFNYXApKSB7XG5cdFx0XHRcdHRoaXNNYXAgPSB0YWdDdHgubWFwO1xuXHRcdFx0XHRpZiAoIXRoaXNNYXAgfHwgdGhpc01hcC5zcmMgIT09IGFyZ3NbMF0gfHwgaXNVcGRhdGUpIHtcblx0XHRcdFx0XHRpZiAodGhpc01hcCAmJiB0aGlzTWFwLnNyYykge1xuXHRcdFx0XHRcdFx0dGhpc01hcC51bm1hcCgpOyAvLyBvbmx5IGNhbGxlZCBpZiBvYnNlcnZhYmxlIG1hcCAtIG5vdCB3aGVuIG9ubHkgdXNlZCBpbiBKc1JlbmRlciwgZS5nLiBieSB7e3Byb3BzfX1cblx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0bWFwRGVmLm1hcChhcmdzWzBdLCB0YWdDdHgsIHRoaXNNYXAsICF0YWcuXy5ibmQpO1xuXHRcdFx0XHRcdHRoaXNNYXAgPSB0YWdDdHgubWFwO1xuXHRcdFx0XHR9XG5cdFx0XHRcdGFyZ3MgPSBbdGhpc01hcC50Z3RdO1xuXHRcdFx0fVxuXG5cdFx0XHRpdGVtUmV0ID0gdW5kZWZpbmVkO1xuXHRcdFx0aWYgKHRhZy5yZW5kZXIpIHtcblx0XHRcdFx0aXRlbVJldCA9IHRhZy5yZW5kZXIuYXBwbHkodGFnLCBhcmdzKTtcblx0XHRcdFx0aWYgKHBhcmVudFZpZXcubGlua2VkICYmIGl0ZW1SZXQgJiYgIXJXcmFwcGVkSW5WaWV3TWFya2VyLnRlc3QoaXRlbVJldCkpIHtcblx0XHRcdFx0XHQvLyBXaGVuIGEgdGFnIHJlbmRlcnMgY29udGVudCBmcm9tIHRoZSByZW5kZXIgbWV0aG9kLCB3aXRoIGRhdGEgbGlua2luZyB0aGVuIHdlIG5lZWQgdG8gd3JhcCB3aXRoIHZpZXcgbWFya2VycywgaWYgYWJzZW50LFxuXHRcdFx0XHRcdC8vIHRvIHByb3ZpZGUgYSBjb250ZW50VmlldyBmb3IgdGhlIHRhZywgd2hpY2ggd2lsbCBjb3JyZWN0bHkgZGlzcG9zZSBiaW5kaW5ncyBpZiBkZWxldGVkLiBUaGUgJ3RtcGwnIGZvciB0aGlzIHZpZXcgd2lsbFxuXHRcdFx0XHRcdC8vIGJlIGEgZHVtYmVkLWRvd24gdGVtcGxhdGUgd2hpY2ggd2lsbCBhbHdheXMgcmV0dXJuIHRoZSAgaXRlbVJldCBzdHJpbmcgKG5vIG1hdHRlciB3aGF0IHRoZSBkYXRhIGlzKS4gVGhlIGl0ZW1SZXQgc3RyaW5nXG5cdFx0XHRcdFx0Ly8gaXMgbm90IGNvbXBpbGVkIGFzIHRlbXBsYXRlIG1hcmt1cCwgc28gY2FuIGluY2x1ZGUgXCJ7e1wiIG9yIFwifX1cIiB3aXRob3V0IHRyaWdnZXJpbmcgc3ludGF4IGVycm9yc1xuXHRcdFx0XHRcdHRtcGwgPSB7IC8vICdEdW1iZWQtZG93bicgdGVtcGxhdGUgd2hpY2ggYWx3YXlzIHJlbmRlcnMgJ3N0YXRpYycgaXRlbVJldCBzdHJpbmdcblx0XHRcdFx0XHRcdGxpbmtzOiBbXVxuXHRcdFx0XHRcdH07XG5cdFx0XHRcdFx0dG1wbC5yZW5kZXIgPSB0bXBsLmZuID0gZnVuY3Rpb24oKSB7XG5cdFx0XHRcdFx0XHRyZXR1cm4gaXRlbVJldDtcblx0XHRcdFx0XHR9O1xuXHRcdFx0XHRcdGl0ZW1SZXQgPSByZW5kZXJXaXRoVmlld3ModG1wbCwgcGFyZW50Vmlldy5kYXRhLCB1bmRlZmluZWQsIHRydWUsIHBhcmVudFZpZXcsIHVuZGVmaW5lZCwgdW5kZWZpbmVkLCB0YWcpO1xuXHRcdFx0XHR9XG5cdFx0XHR9XG5cdFx0XHRpZiAoIWFyZ3MubGVuZ3RoKSB7XG5cdFx0XHRcdGFyZ3MgPSBbcGFyZW50Vmlld107IC8vIG5vIGFyZ3VtZW50cyAtIChlLmcuIHt7ZWxzZX19KSBnZXQgZGF0YSBjb250ZXh0IGZyb20gdmlldy5cblx0XHRcdH1cblx0XHRcdGlmIChpdGVtUmV0ID09PSB1bmRlZmluZWQpIHtcblx0XHRcdFx0Y29udGVudEN0eCA9IGFyZ3NbMF07IC8vIERlZmF1bHQgZGF0YSBjb250ZXh0IGZvciB3cmFwcGVkIGJsb2NrIGNvbnRlbnQgaXMgdGhlIGZpcnN0IGFyZ3VtZW50XG5cdFx0XHRcdGlmICh0YWcuY29udGVudEN0eCkgeyAvLyBTZXQgdGFnLmNvbnRlbnRDdHggdG8gdHJ1ZSwgdG8gaW5oZXJpdCBwYXJlbnQgY29udGV4dCwgb3IgdG8gYSBmdW5jdGlvbiB0byBwcm92aWRlIGFsdGVybmF0ZSBjb250ZXh0LlxuXHRcdFx0XHRcdGNvbnRlbnRDdHggPSB0YWcuY29udGVudEN0eCA9PT0gdHJ1ZSA/IHBhcmVudFZpZXcgOiB0YWcuY29udGVudEN0eChjb250ZW50Q3R4KTtcblx0XHRcdFx0fVxuXHRcdFx0XHRpdGVtUmV0ID0gdGFnQ3R4LnJlbmRlcihjb250ZW50Q3R4LCB0cnVlKSB8fCAoaXNVcGRhdGUgPyB1bmRlZmluZWQgOiBcIlwiKTtcblx0XHRcdH1cblx0XHRcdHJldCA9IHJldFxuXHRcdFx0XHQ/IHJldCArIChpdGVtUmV0IHx8IFwiXCIpXG5cdFx0XHRcdDogaXRlbVJldCAhPT0gdW5kZWZpbmVkXG5cdFx0XHRcdFx0PyBcIlwiICsgaXRlbVJldFxuXHRcdFx0XHRcdDogdW5kZWZpbmVkOyAvLyBJZiBubyByZXR1cm4gdmFsdWUgZnJvbSByZW5kZXIsIGFuZCBubyB0ZW1wbGF0ZS9jb250ZW50IHRhZ0N0eC5yZW5kZXIoLi4uKSwgcmV0dXJuIHVuZGVmaW5lZFxuXHRcdH1cblx0XHR0YWcucmVuZGVyaW5nID0gdGFnLnJlbmRlcmluZy5ybmRyOyAvLyBSZW1vdmUgdGFnLnJlbmRlcmluZyBvYmplY3QgKGlmIHRoaXMgaXMgb3V0ZXJtb3N0IHJlbmRlciBjYWxsLiAoSW4gY2FzZSBvZiBuZXN0ZWQgY2FsbHMpXG5cdH1cblx0dGFnLnRhZ0N0eCA9IHRhZ0N0eHNbMF07XG5cdHRhZy5jdHggPSB0YWcudGFnQ3R4LmN0eDtcblxuXHRpZiAodGFnLl8ubm9Wd3MgJiYgdGFnLmlubGluZSkge1xuXHRcdC8vIGlubGluZSB0YWcgd2l0aCBhdHRyIHNldCB0byBcInRleHRcIiB3aWxsIGluc2VydCBIVE1MLWVuY29kZWQgY29udGVudCAtIGFzIGlmIGl0IHdhcyBlbGVtZW50LWJhc2VkIGlubmVyVGV4dFxuXHRcdHJldCA9IGF0dHIgPT09IFwidGV4dFwiXG5cdFx0XHQ/ICRjb252ZXJ0ZXJzLmh0bWwocmV0KVxuXHRcdFx0OiBcIlwiO1xuXHR9XG5cdHJldHVybiBib3VuZFRhZyAmJiBwYXJlbnRWaWV3Ll8ub25SZW5kZXJcblx0XHQvLyBDYWxsIG9uUmVuZGVyICh1c2VkIGJ5IEpzVmlld3MgaWYgcHJlc2VudCwgdG8gYWRkIGJpbmRpbmcgYW5ub3RhdGlvbnMgYXJvdW5kIHJlbmRlcmVkIGNvbnRlbnQpXG5cdFx0PyBwYXJlbnRWaWV3Ll8ub25SZW5kZXIocmV0LCBwYXJlbnRWaWV3LCB0YWcpXG5cdFx0OiByZXQ7XG59XG5cbi8vPT09PT09PT09PT09PT09PT1cbi8vIFZpZXcgY29uc3RydWN0b3Jcbi8vPT09PT09PT09PT09PT09PT1cblxuZnVuY3Rpb24gVmlldyhjb250ZXh0LCB0eXBlLCBwYXJlbnRWaWV3LCBkYXRhLCB0ZW1wbGF0ZSwga2V5LCBvblJlbmRlciwgY29udGVudFRtcGwpIHtcblx0Ly8gQ29uc3RydWN0b3IgZm9yIHZpZXcgb2JqZWN0IGluIHZpZXcgaGllcmFyY2h5LiAoQXVnbWVudGVkIGJ5IEpzVmlld3MgaWYgSnNWaWV3cyBpcyBsb2FkZWQpXG5cdHZhciB2aWV3cywgcGFyZW50Vmlld18sIHRhZywgc2VsZl8sXG5cdFx0c2VsZiA9IHRoaXMsXG5cdFx0aXNBcnJheSA9IHR5cGUgPT09IFwiYXJyYXlcIjtcblx0XHQvLyBJZiB0aGUgZGF0YSBpcyBhbiBhcnJheSwgdGhpcyBpcyBhbiAnYXJyYXkgdmlldycgd2l0aCBhIHZpZXdzIGFycmF5IGZvciBlYWNoIGNoaWxkICdpdGVtIHZpZXcnXG5cdFx0Ly8gSWYgdGhlIGRhdGEgaXMgbm90IGFuIGFycmF5LCB0aGlzIGlzIGFuICdpdGVtIHZpZXcnIHdpdGggYSB2aWV3cyAnaGFzaCcgb2JqZWN0IGZvciBhbnkgY2hpbGQgbmVzdGVkIHZpZXdzXG5cblx0c2VsZi5jb250ZW50ID0gY29udGVudFRtcGw7XG5cdHNlbGYudmlld3MgPSBpc0FycmF5ID8gW10gOiB7fTtcblx0c2VsZi5kYXRhID0gZGF0YTtcblx0c2VsZi50bXBsID0gdGVtcGxhdGU7XG5cdHNlbGZfID0gc2VsZi5fID0ge1xuXHRcdGtleTogMCxcblx0XHQvLyAuXy51c2VLZXkgaXMgbm9uIHplcm8gaWYgaXMgbm90IGFuICdhcnJheSB2aWV3JyAob3duaW5nIGEgZGF0YSBhcnJheSkuIFVzZSB0aGlzIGFzIG5leHQga2V5IGZvciBhZGRpbmcgdG8gY2hpbGQgdmlld3MgaGFzaFxuXHRcdHVzZUtleTogaXNBcnJheSA/IDAgOiAxLFxuXHRcdGlkOiBcIlwiICsgdmlld0lkKyssXG5cdFx0b25SZW5kZXI6IG9uUmVuZGVyLFxuXHRcdGJuZHM6IHt9XG5cdH07XG5cdHNlbGYubGlua2VkID0gISFvblJlbmRlcjtcblx0c2VsZi50eXBlID0gdHlwZSB8fCBcInRvcFwiO1xuXHRpZiAoc2VsZi5wYXJlbnQgPSBwYXJlbnRWaWV3KSB7XG5cdFx0c2VsZi5yb290ID0gcGFyZW50Vmlldy5yb290IHx8IHNlbGY7IC8vIHZpZXcgd2hvc2UgcGFyZW50IGlzIHRvcCB2aWV3XG5cdFx0dmlld3MgPSBwYXJlbnRWaWV3LnZpZXdzO1xuXHRcdHBhcmVudFZpZXdfID0gcGFyZW50Vmlldy5fO1xuXHRcdHNlbGYuaXNUb3AgPSBwYXJlbnRWaWV3Xy5zY3A7IC8vIElzIHRvcCBjb250ZW50IHZpZXcgb2YgYSBsaW5rKFwiI2NvbnRhaW5lclwiLCAuLi4pIGNhbGxcblx0XHRzZWxmLnNjb3BlID0gKCFjb250ZXh0LnRhZyB8fCBjb250ZXh0LnRhZyA9PT0gcGFyZW50Vmlldy5jdHgudGFnKSAmJiAhc2VsZi5pc1RvcCAmJiBwYXJlbnRWaWV3LnNjb3BlIHx8IHNlbGY7XG5cdFx0Ly8gU2NvcGUgZm9yIGNvbnRleHRQYXJhbXMgLSBjbG9zZXN0IG5vbiBmbG93IHRhZyBhbmNlc3RvciBvciByb290IHZpZXdcblx0XHRpZiAocGFyZW50Vmlld18udXNlS2V5KSB7XG5cdFx0XHQvLyBQYXJlbnQgaXMgbm90IGFuICdhcnJheSB2aWV3Jy4gQWRkIHRoaXMgdmlldyB0byBpdHMgdmlld3Mgb2JqZWN0XG5cdFx0XHQvLyBzZWxmLl9rZXkgPSBpcyB0aGUga2V5IGluIHRoZSBwYXJlbnQgdmlldyBoYXNoXG5cdFx0XHR2aWV3c1tzZWxmXy5rZXkgPSBcIl9cIiArIHBhcmVudFZpZXdfLnVzZUtleSsrXSA9IHNlbGY7XG5cdFx0XHRzZWxmLmluZGV4ID0gaW5kZXhTdHI7XG5cdFx0XHRzZWxmLmdldEluZGV4ID0gZ2V0TmVzdGVkSW5kZXg7XG5cdFx0fSBlbHNlIGlmICh2aWV3cy5sZW5ndGggPT09IChzZWxmXy5rZXkgPSBzZWxmLmluZGV4ID0ga2V5KSkgeyAvLyBQYXJlbnQgaXMgYW4gJ2FycmF5IHZpZXcnLiBBZGQgdGhpcyB2aWV3IHRvIGl0cyB2aWV3cyBhcnJheVxuXHRcdFx0dmlld3MucHVzaChzZWxmKTsgLy8gQWRkaW5nIHRvIGVuZCBvZiB2aWV3cyBhcnJheS4gKFVzaW5nIHB1c2ggd2hlbiBwb3NzaWJsZSAtIGJldHRlciBwZXJmIHRoYW4gc3BsaWNlKVxuXHRcdH0gZWxzZSB7XG5cdFx0XHR2aWV3cy5zcGxpY2Uoa2V5LCAwLCBzZWxmKTsgLy8gSW5zZXJ0aW5nIGluIHZpZXdzIGFycmF5XG5cdFx0fVxuXHRcdC8vIElmIG5vIGNvbnRleHQgd2FzIHBhc3NlZCBpbiwgdXNlIHBhcmVudCBjb250ZXh0XG5cdFx0Ly8gSWYgY29udGV4dCB3YXMgcGFzc2VkIGluLCBpdCBzaG91bGQgaGF2ZSBiZWVuIG1lcmdlZCBhbHJlYWR5IHdpdGggcGFyZW50IGNvbnRleHRcblx0XHRzZWxmLmN0eCA9IGNvbnRleHQgfHwgcGFyZW50Vmlldy5jdHg7XG5cdH0gZWxzZSB7XG5cdFx0c2VsZi5jdHggPSBjb250ZXh0IHx8IHt9O1xuXHRcdGlmICh0eXBlKSB7XG5cdFx0XHRzZWxmLnJvb3QgPSBzZWxmOyAvLyB2aWV3IHdob3NlIHBhcmVudCBpcyB0b3Agdmlld1xuXHRcdH1cblx0fVxufVxuXG5WaWV3LnByb3RvdHlwZSA9IHtcblx0Z2V0OiBnZXRWaWV3LFxuXHRnZXRJbmRleDogZ2V0SW5kZXgsXG5cdGN0eFBybTogY29udGV4dFBhcmFtZXRlcixcblx0Z2V0UnNjOiBnZXRSZXNvdXJjZSxcblx0X2dldFRtcGw6IGdldFRlbXBsYXRlLFxuXHRfZ2V0T2I6IGdldFBhdGhPYmplY3QsXG5cdF9pczogXCJ2aWV3XCJcbn07XG5cbi8vPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuLy8gUmVnaXN0cmF0aW9uXG4vLz09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cblxuZnVuY3Rpb24gY29tcGlsZUNoaWxkUmVzb3VyY2VzKHBhcmVudFRtcGwpIHtcblx0dmFyIHN0b3JlTmFtZSwgc3RvcmVOYW1lcywgcmVzb3VyY2VzO1xuXHRmb3IgKHN0b3JlTmFtZSBpbiBqc3ZTdG9yZXMpIHtcblx0XHRzdG9yZU5hbWVzID0gc3RvcmVOYW1lICsgXCJzXCI7XG5cdFx0aWYgKHBhcmVudFRtcGxbc3RvcmVOYW1lc10pIHtcblx0XHRcdHJlc291cmNlcyA9IHBhcmVudFRtcGxbc3RvcmVOYW1lc107ICAgIC8vIFJlc291cmNlcyBub3QgeWV0IGNvbXBpbGVkXG5cdFx0XHRwYXJlbnRUbXBsW3N0b3JlTmFtZXNdID0ge307ICAgICAgICAgICAgICAgLy8gUmVtb3ZlIHVuY29tcGlsZWQgcmVzb3VyY2VzXG5cdFx0XHQkdmlld3Nbc3RvcmVOYW1lc10ocmVzb3VyY2VzLCBwYXJlbnRUbXBsKTsgLy8gQWRkIGJhY2sgaW4gdGhlIGNvbXBpbGVkIHJlc291cmNlc1xuXHRcdH1cblx0fVxufVxuXG4vLz09PT09PT09PT09PT09PVxuLy8gY29tcGlsZVRhZ1xuLy89PT09PT09PT09PT09PT1cblxuZnVuY3Rpb24gY29tcGlsZVRhZyhuYW1lLCB0YWdEZWYsIHBhcmVudFRtcGwpIHtcblx0dmFyIHRtcGwsIGJhc2VUYWcsIHByb3AsXG5cdFx0Y29tcGlsZWREZWYgPSBuZXcgJHN1Yi5fdGcoKTtcblxuXHRmdW5jdGlvbiBUYWcoKSB7XG5cdFx0dmFyIHRhZyA9IHRoaXM7XG5cdFx0dGFnLl8gPSB7XG5cdFx0XHR1bmxpbmtlZDogdHJ1ZVxuXHRcdH07XG5cdFx0dGFnLmlubGluZSA9IHRydWU7XG5cdFx0dGFnLnRhZ05hbWUgPSBuYW1lO1xuXHR9XG5cblx0aWYgKCRpc0Z1bmN0aW9uKHRhZ0RlZikpIHtcblx0XHQvLyBTaW1wbGUgdGFnIGRlY2xhcmVkIGFzIGZ1bmN0aW9uLiBObyBwcmVzZW50ZXIgaW5zdGFudGF0aW9uLlxuXHRcdHRhZ0RlZiA9IHtcblx0XHRcdGRlcGVuZHM6IHRhZ0RlZi5kZXBlbmRzLFxuXHRcdFx0cmVuZGVyOiB0YWdEZWZcblx0XHR9O1xuXHR9IGVsc2UgaWYgKFwiXCIgKyB0YWdEZWYgPT09IHRhZ0RlZikge1xuXHRcdHRhZ0RlZiA9IHt0ZW1wbGF0ZTogdGFnRGVmfTtcblx0fVxuXG5cdGlmIChiYXNlVGFnID0gdGFnRGVmLmJhc2VUYWcpIHtcblx0XHR0YWdEZWYuZmxvdyA9ICEhdGFnRGVmLmZsb3c7IC8vIFNldCBmbG93IHByb3BlcnR5LCBzbyBkZWZhdWx0cyB0byBmYWxzZSBldmVuIGlmIGJhc2VUYWcgaGFzIGZsb3c9dHJ1ZVxuXHRcdGJhc2VUYWcgPSBcIlwiICsgYmFzZVRhZyA9PT0gYmFzZVRhZ1xuXHRcdFx0PyAocGFyZW50VG1wbCAmJiBwYXJlbnRUbXBsLnRhZ3NbYmFzZVRhZ10gfHwgJHRhZ3NbYmFzZVRhZ10pXG5cdFx0XHQ6IGJhc2VUYWc7XG5cdFx0aWYgKCFiYXNlVGFnKSB7XG5cdFx0XHRlcnJvcignYmFzZVRhZzogXCInICsgdGFnRGVmLmJhc2VUYWcgKyAnXCIgbm90IGZvdW5kJyk7XG5cdFx0fVxuXHRcdGNvbXBpbGVkRGVmID0gJGV4dGVuZChjb21waWxlZERlZiwgYmFzZVRhZyk7XG5cblx0XHRmb3IgKHByb3AgaW4gdGFnRGVmKSB7XG5cdFx0XHRjb21waWxlZERlZltwcm9wXSA9IGdldE1ldGhvZChiYXNlVGFnW3Byb3BdLCB0YWdEZWZbcHJvcF0pO1xuXHRcdH1cblx0fSBlbHNlIHtcblx0XHRjb21waWxlZERlZiA9ICRleHRlbmQoY29tcGlsZWREZWYsIHRhZ0RlZik7XG5cdH1cblxuXHQvLyBUYWcgZGVjbGFyZWQgYXMgb2JqZWN0LCB1c2VkIGFzIHRoZSBwcm90b3R5cGUgZm9yIHRhZyBpbnN0YW50aWF0aW9uIChjb250cm9sL3ByZXNlbnRlcilcblx0aWYgKCh0bXBsID0gY29tcGlsZWREZWYudGVtcGxhdGUpICE9PSB1bmRlZmluZWQpIHtcblx0XHRjb21waWxlZERlZi50ZW1wbGF0ZSA9IFwiXCIgKyB0bXBsID09PSB0bXBsID8gKCR0ZW1wbGF0ZXNbdG1wbF0gfHwgJHRlbXBsYXRlcyh0bXBsKSkgOiB0bXBsO1xuXHR9XG5cdChUYWcucHJvdG90eXBlID0gY29tcGlsZWREZWYpLmNvbnN0cnVjdG9yID0gY29tcGlsZWREZWYuX2N0ciA9IFRhZztcblxuXHRpZiAocGFyZW50VG1wbCkge1xuXHRcdGNvbXBpbGVkRGVmLl9wYXJlbnRUbXBsID0gcGFyZW50VG1wbDtcblx0fVxuXHRyZXR1cm4gY29tcGlsZWREZWY7XG59XG5cbmZ1bmN0aW9uIGJhc2VBcHBseShhcmdzKSB7XG5cdC8vIEluIGRlcml2ZWQgbWV0aG9kIChvciBoYW5kbGVyIGRlY2xhcmVkIGRlY2xhcmF0aXZlbHkgYXMgaW4ge3s6Zm9vIG9uQ2hhbmdlPX5mb29DaGFuZ2VkfX0gY2FuIGNhbGwgYmFzZSBtZXRob2QsXG5cdC8vIHVzaW5nIHRoaXMuYmFzZUFwcGx5KGFyZ3VtZW50cykgKEVxdWl2YWxlbnQgdG8gdGhpcy5fc3VwZXJBcHBseShhcmd1bWVudHMpIGluIGpRdWVyeSBVSSlcblx0cmV0dXJuIHRoaXMuYmFzZS5hcHBseSh0aGlzLCBhcmdzKTtcbn1cblxuLy89PT09PT09PT09PT09PT1cbi8vIGNvbXBpbGVUbXBsXG4vLz09PT09PT09PT09PT09PVxuXG5mdW5jdGlvbiBjb21waWxlVG1wbChuYW1lLCB0bXBsLCBwYXJlbnRUbXBsLCBvcHRpb25zKSB7XG5cdC8vIHRtcGwgaXMgZWl0aGVyIGEgdGVtcGxhdGUgb2JqZWN0LCBhIHNlbGVjdG9yIGZvciBhIHRlbXBsYXRlIHNjcmlwdCBibG9jaywgdGhlIG5hbWUgb2YgYSBjb21waWxlZCB0ZW1wbGF0ZSwgb3IgYSB0ZW1wbGF0ZSBvYmplY3RcblxuXHQvLz09PT0gbmVzdGVkIGZ1bmN0aW9ucyA9PT09XG5cdGZ1bmN0aW9uIGxvb2t1cFRlbXBsYXRlKHZhbHVlKSB7XG5cdFx0Ly8gSWYgdmFsdWUgaXMgb2YgdHlwZSBzdHJpbmcgLSB0cmVhdCBhcyBzZWxlY3Rvciwgb3IgbmFtZSBvZiBjb21waWxlZCB0ZW1wbGF0ZVxuXHRcdC8vIFJldHVybiB0aGUgdGVtcGxhdGUgb2JqZWN0LCBpZiBhbHJlYWR5IGNvbXBpbGVkLCBvciB0aGUgbWFya3VwIHN0cmluZ1xuXHRcdHZhciBjdXJyZW50TmFtZSwgdG1wbDtcblx0XHRpZiAoKFwiXCIgKyB2YWx1ZSA9PT0gdmFsdWUpIHx8IHZhbHVlLm5vZGVUeXBlID4gMCAmJiAoZWxlbSA9IHZhbHVlKSkge1xuXHRcdFx0aWYgKCFlbGVtKSB7XG5cdFx0XHRcdGlmICgvXlxcLlxcL1teXFxcXDoqP1wiPD5dKiQvLnRlc3QodmFsdWUpKSB7XG5cdFx0XHRcdFx0Ly8gdG1wbD1cIi4vc29tZS9maWxlLmh0bWxcIlxuXHRcdFx0XHRcdC8vIElmIHRoZSB0ZW1wbGF0ZSBpcyBub3QgbmFtZWQsIHVzZSBcIi4vc29tZS9maWxlLmh0bWxcIiBhcyBuYW1lLlxuXHRcdFx0XHRcdGlmICh0bXBsID0gJHRlbXBsYXRlc1tuYW1lID0gbmFtZSB8fCB2YWx1ZV0pIHtcblx0XHRcdFx0XHRcdHZhbHVlID0gdG1wbDtcblx0XHRcdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRcdFx0Ly8gQlJPV1NFUi1TUEVDSUZJQyBDT0RFIChub3Qgb24gTm9kZS5qcyk6XG5cdFx0XHRcdFx0XHQvLyBMb29rIGZvciBzZXJ2ZXItZ2VuZXJhdGVkIHNjcmlwdCBibG9jayB3aXRoIGlkIFwiLi9zb21lL2ZpbGUuaHRtbFwiXG5cdFx0XHRcdFx0XHRlbGVtID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQodmFsdWUpO1xuXHRcdFx0XHRcdH1cblx0XHRcdFx0fSBlbHNlIGlmICgkLmZuICYmICEkc3ViLnJUbXBsLnRlc3QodmFsdWUpKSB7XG5cdFx0XHRcdFx0dHJ5IHtcblx0XHRcdFx0XHRcdGVsZW0gPSAkICh2YWx1ZSwgZG9jdW1lbnQpWzBdOyAvLyBpZiBqUXVlcnkgaXMgbG9hZGVkLCB0ZXN0IGZvciBzZWxlY3RvciByZXR1cm5pbmcgZWxlbWVudHMsIGFuZCBnZXQgZmlyc3QgZWxlbWVudFxuXHRcdFx0XHRcdH0gY2F0Y2ggKGUpIHt9XG5cdFx0XHRcdH0vLyBFTkQgQlJPV1NFUi1TUEVDSUZJQyBDT0RFXG5cdFx0XHR9IC8vQlJPV1NFUi1TUEVDSUZJQyBDT0RFXG5cdFx0XHRpZiAoZWxlbSkge1xuXHRcdFx0XHRpZiAoZWxlbS50YWdOYW1lICE9PSBcIlNDUklQVFwiKSB7XG5cdFx0XHRcdFx0ZXJyb3IodmFsdWUgKyBcIjogVXNlIHNjcmlwdCBibG9jaywgbm90IFwiICsgZWxlbS50YWdOYW1lKTtcblx0XHRcdFx0fVxuXHRcdFx0XHRpZiAob3B0aW9ucykge1xuXHRcdFx0XHRcdC8vIFdlIHdpbGwgY29tcGlsZSBhIG5ldyB0ZW1wbGF0ZSB1c2luZyB0aGUgbWFya3VwIGluIHRoZSBzY3JpcHQgZWxlbWVudFxuXHRcdFx0XHRcdHZhbHVlID0gZWxlbS5pbm5lckhUTUw7XG5cdFx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdFx0Ly8gV2Ugd2lsbCBjYWNoZSBhIHNpbmdsZSBjb3B5IG9mIHRoZSBjb21waWxlZCB0ZW1wbGF0ZSwgYW5kIGFzc29jaWF0ZSBpdCB3aXRoIHRoZSBuYW1lXG5cdFx0XHRcdFx0Ly8gKHJlbmFtaW5nIGZyb20gYSBwcmV2aW91cyBuYW1lIGlmIHRoZXJlIHdhcyBvbmUpLlxuXHRcdFx0XHRcdGN1cnJlbnROYW1lID0gZWxlbS5nZXRBdHRyaWJ1dGUodG1wbEF0dHIpO1xuXHRcdFx0XHRcdGlmIChjdXJyZW50TmFtZSkge1xuXHRcdFx0XHRcdFx0aWYgKGN1cnJlbnROYW1lICE9PSBqc3ZUbXBsKSB7XG5cdFx0XHRcdFx0XHRcdHZhbHVlID0gJHRlbXBsYXRlc1tjdXJyZW50TmFtZV07XG5cdFx0XHRcdFx0XHRcdGRlbGV0ZSAkdGVtcGxhdGVzW2N1cnJlbnROYW1lXTtcblx0XHRcdFx0XHRcdH0gZWxzZSBpZiAoJC5mbikge1xuXHRcdFx0XHRcdFx0XHR2YWx1ZSA9ICQuZGF0YShlbGVtKVtqc3ZUbXBsXTsgLy8gR2V0IGNhY2hlZCBjb21waWxlZCB0ZW1wbGF0ZVxuXHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdH1cblx0XHRcdFx0XHRpZiAoIWN1cnJlbnROYW1lIHx8ICF2YWx1ZSkgeyAvLyBOb3QgeWV0IGNvbXBpbGVkLCBvciBjYWNoZWQgdmVyc2lvbiBsb3N0XG5cdFx0XHRcdFx0XHRuYW1lID0gbmFtZSB8fCAoJC5mbiA/IGpzdlRtcGwgOiB2YWx1ZSk7XG5cdFx0XHRcdFx0XHR2YWx1ZSA9IGNvbXBpbGVUbXBsKG5hbWUsIGVsZW0uaW5uZXJIVE1MLCBwYXJlbnRUbXBsLCBvcHRpb25zKTtcblx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0dmFsdWUudG1wbE5hbWUgPSBuYW1lID0gbmFtZSB8fCBjdXJyZW50TmFtZTtcblx0XHRcdFx0XHRpZiAobmFtZSAhPT0ganN2VG1wbCkge1xuXHRcdFx0XHRcdFx0JHRlbXBsYXRlc1tuYW1lXSA9IHZhbHVlO1xuXHRcdFx0XHRcdH1cblx0XHRcdFx0XHRlbGVtLnNldEF0dHJpYnV0ZSh0bXBsQXR0ciwgbmFtZSk7XG5cdFx0XHRcdFx0aWYgKCQuZm4pIHtcblx0XHRcdFx0XHRcdCQuZGF0YShlbGVtLCBqc3ZUbXBsLCB2YWx1ZSk7XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHR9XG5cdFx0XHR9IC8vIEVORCBCUk9XU0VSLVNQRUNJRklDIENPREVcblx0XHRcdGVsZW0gPSB1bmRlZmluZWQ7XG5cdFx0fSBlbHNlIGlmICghdmFsdWUuZm4pIHtcblx0XHRcdHZhbHVlID0gdW5kZWZpbmVkO1xuXHRcdFx0Ly8gSWYgdmFsdWUgaXMgbm90IGEgc3RyaW5nLiBIVE1MIGVsZW1lbnQsIG9yIGNvbXBpbGVkIHRlbXBsYXRlLCByZXR1cm4gdW5kZWZpbmVkXG5cdFx0fVxuXHRcdHJldHVybiB2YWx1ZTtcblx0fVxuXG5cdHZhciBlbGVtLCBjb21waWxlZFRtcGwsXG5cdFx0dG1wbE9yTWFya3VwID0gdG1wbCA9IHRtcGwgfHwgXCJcIjtcblx0JHN1Yi5faHRtbCA9ICRjb252ZXJ0ZXJzLmh0bWw7XG5cblx0Ly89PT09IENvbXBpbGUgdGhlIHRlbXBsYXRlID09PT1cblx0aWYgKG9wdGlvbnMgPT09IDApIHtcblx0XHRvcHRpb25zID0gdW5kZWZpbmVkO1xuXHRcdHRtcGxPck1hcmt1cCA9IGxvb2t1cFRlbXBsYXRlKHRtcGxPck1hcmt1cCk7IC8vIFRvcC1sZXZlbCBjb21waWxlIHNvIGRvIGEgdGVtcGxhdGUgbG9va3VwXG5cdH1cblxuXHQvLyBJZiBvcHRpb25zLCB0aGVuIHRoaXMgd2FzIGFscmVhZHkgY29tcGlsZWQgZnJvbSBhIChzY3JpcHQpIGVsZW1lbnQgdGVtcGxhdGUgZGVjbGFyYXRpb24uXG5cdC8vIElmIG5vdCwgdGhlbiBpZiB0bXBsIGlzIGEgdGVtcGxhdGUgb2JqZWN0LCB1c2UgaXQgZm9yIG9wdGlvbnNcblx0b3B0aW9ucyA9IG9wdGlvbnMgfHwgKHRtcGwubWFya3VwXG5cdFx0PyB0bXBsLmJuZHNcblx0XHRcdD8gJGV4dGVuZCh7fSwgdG1wbClcblx0XHRcdDogdG1wbFxuXHRcdDoge31cblx0KTtcblxuXHRvcHRpb25zLnRtcGxOYW1lID0gb3B0aW9ucy50bXBsTmFtZSB8fCBuYW1lIHx8IFwidW5uYW1lZFwiO1xuXHRpZiAocGFyZW50VG1wbCkge1xuXHRcdG9wdGlvbnMuX3BhcmVudFRtcGwgPSBwYXJlbnRUbXBsO1xuXHR9XG5cdC8vIElmIHRtcGwgaXMgbm90IGEgbWFya3VwIHN0cmluZyBvciBhIHNlbGVjdG9yIHN0cmluZywgdGhlbiBpdCBtdXN0IGJlIGEgdGVtcGxhdGUgb2JqZWN0XG5cdC8vIEluIHRoYXQgY2FzZSwgZ2V0IGl0IGZyb20gdGhlIG1hcmt1cCBwcm9wZXJ0eSBvZiB0aGUgb2JqZWN0XG5cdGlmICghdG1wbE9yTWFya3VwICYmIHRtcGwubWFya3VwICYmICh0bXBsT3JNYXJrdXAgPSBsb29rdXBUZW1wbGF0ZSh0bXBsLm1hcmt1cCkpICYmIHRtcGxPck1hcmt1cC5mbikge1xuXHRcdC8vIElmIHRoZSBzdHJpbmcgcmVmZXJlbmNlcyBhIGNvbXBpbGVkIHRlbXBsYXRlIG9iamVjdCwgbmVlZCB0byByZWNvbXBpbGUgdG8gbWVyZ2UgYW55IG1vZGlmaWVkIG9wdGlvbnNcblx0XHR0bXBsT3JNYXJrdXAgPSB0bXBsT3JNYXJrdXAubWFya3VwO1xuXHR9XG5cdGlmICh0bXBsT3JNYXJrdXAgIT09IHVuZGVmaW5lZCkge1xuXHRcdGlmICh0bXBsT3JNYXJrdXAucmVuZGVyIHx8IHRtcGwucmVuZGVyKSB7XG5cdFx0XHQvLyB0bXBsIGlzIGFscmVhZHkgY29tcGlsZWQsIHNvIHVzZSBpdFxuXHRcdFx0aWYgKHRtcGxPck1hcmt1cC50bXBscykge1xuXHRcdFx0XHRjb21waWxlZFRtcGwgPSB0bXBsT3JNYXJrdXA7XG5cdFx0XHR9XG5cdFx0fSBlbHNlIHtcblx0XHRcdC8vIHRtcGxPck1hcmt1cCBpcyBhIG1hcmt1cCBzdHJpbmcsIG5vdCBhIGNvbXBpbGVkIHRlbXBsYXRlXG5cdFx0XHQvLyBDcmVhdGUgdGVtcGxhdGUgb2JqZWN0XG5cdFx0XHR0bXBsID0gdG1wbE9iamVjdCh0bXBsT3JNYXJrdXAsIG9wdGlvbnMpO1xuXHRcdFx0Ly8gQ29tcGlsZSB0byBBU1QgYW5kIHRoZW4gdG8gY29tcGlsZWQgZnVuY3Rpb25cblx0XHRcdHRtcGxGbih0bXBsT3JNYXJrdXAucmVwbGFjZShyRXNjYXBlUXVvdGVzLCBcIlxcXFwkJlwiKSwgdG1wbCk7XG5cdFx0fVxuXHRcdGlmICghY29tcGlsZWRUbXBsKSB7XG5cdFx0XHRjb21waWxlZFRtcGwgPSAkZXh0ZW5kKGZ1bmN0aW9uKCkge1xuXHRcdFx0XHRyZXR1cm4gY29tcGlsZWRUbXBsLnJlbmRlci5hcHBseShjb21waWxlZFRtcGwsIGFyZ3VtZW50cyk7XG5cdFx0XHR9LCB0bXBsKTtcblxuXHRcdFx0Y29tcGlsZUNoaWxkUmVzb3VyY2VzKGNvbXBpbGVkVG1wbCk7XG5cdFx0fVxuXHRcdHJldHVybiBjb21waWxlZFRtcGw7XG5cdH1cbn1cblxuLy89PT09IC9lbmQgb2YgZnVuY3Rpb24gY29tcGlsZVRtcGwgPT09PVxuXG4vLz09PT09PT09PT09PT09PT09XG4vLyBjb21waWxlVmlld01vZGVsXG4vLz09PT09PT09PT09PT09PT09XG5cbmZ1bmN0aW9uIGdldERlZmF1bHRWYWwoZGVmYXVsdFZhbCwgZGF0YSkge1xuXHRyZXR1cm4gJGlzRnVuY3Rpb24oZGVmYXVsdFZhbClcblx0XHQ/IGRlZmF1bHRWYWwuY2FsbChkYXRhKVxuXHRcdDogZGVmYXVsdFZhbDtcbn1cblxuZnVuY3Rpb24gYWRkUGFyZW50UmVmKG9iLCByZWYsIHBhcmVudCkge1xuXHRPYmplY3QuZGVmaW5lUHJvcGVydHkob2IsIHJlZiwge1xuXHRcdHZhbHVlOiBwYXJlbnQsXG5cdFx0Y29uZmlndXJhYmxlOiB0cnVlXG5cdH0pO1xufVxuXG5mdW5jdGlvbiBjb21waWxlVmlld01vZGVsKG5hbWUsIHR5cGUpIHtcblx0dmFyIGksIGNvbnN0cnVjdG9yLCBwYXJlbnQsXG5cdFx0dmlld01vZGVscyA9IHRoaXMsXG5cdFx0Z2V0dGVycyA9IHR5cGUuZ2V0dGVycyxcblx0XHRleHRlbmQgPSB0eXBlLmV4dGVuZCxcblx0XHRpZCA9IHR5cGUuaWQsXG5cdFx0cHJvdG8gPSAkLmV4dGVuZCh7XG5cdFx0XHRfaXM6IG5hbWUgfHwgXCJ1bm5hbWVkXCIsXG5cdFx0XHR1bm1hcDogdW5tYXAsXG5cdFx0XHRtZXJnZTogbWVyZ2Vcblx0XHR9LCBleHRlbmQpLFxuXHRcdGFyZ3MgPSBcIlwiLFxuXHRcdGNuc3RyID0gXCJcIixcblx0XHRnZXR0ZXJDb3VudCA9IGdldHRlcnMgPyBnZXR0ZXJzLmxlbmd0aCA6IDAsXG5cdFx0JG9ic2VydmFibGUgPSAkLm9ic2VydmFibGUsXG5cdFx0Z2V0dGVyTmFtZXMgPSB7fTtcblxuXHRmdW5jdGlvbiBKc3ZWbShhcmdzKSB7XG5cdFx0Y29uc3RydWN0b3IuYXBwbHkodGhpcywgYXJncyk7XG5cdH1cblxuXHRmdW5jdGlvbiB2bSgpIHtcblx0XHRyZXR1cm4gbmV3IEpzdlZtKGFyZ3VtZW50cyk7XG5cdH1cblxuXHRmdW5jdGlvbiBpdGVyYXRlKGRhdGEsIGFjdGlvbikge1xuXHRcdHZhciBnZXR0ZXJUeXBlLCBkZWZhdWx0VmFsLCBwcm9wLCBvYiwgcGFyZW50UmVmLFxuXHRcdFx0aiA9IDA7XG5cdFx0Zm9yICg7IGogPCBnZXR0ZXJDb3VudDsgaisrKSB7XG5cdFx0XHRwcm9wID0gZ2V0dGVyc1tqXTtcblx0XHRcdGdldHRlclR5cGUgPSB1bmRlZmluZWQ7XG5cdFx0XHRpZiAocHJvcCArIFwiXCIgIT09IHByb3ApIHtcblx0XHRcdFx0Z2V0dGVyVHlwZSA9IHByb3A7XG5cdFx0XHRcdHByb3AgPSBnZXR0ZXJUeXBlLmdldHRlcjtcblx0XHRcdFx0cGFyZW50UmVmID0gZ2V0dGVyVHlwZS5wYXJlbnRSZWY7XG5cdFx0XHR9XG5cdFx0XHRpZiAoKG9iID0gZGF0YVtwcm9wXSkgPT09IHVuZGVmaW5lZCAmJiBnZXR0ZXJUeXBlICYmIChkZWZhdWx0VmFsID0gZ2V0dGVyVHlwZS5kZWZhdWx0VmFsKSAhPT0gdW5kZWZpbmVkKSB7XG5cdFx0XHRcdG9iID0gZ2V0RGVmYXVsdFZhbChkZWZhdWx0VmFsLCBkYXRhKTtcblx0XHRcdH1cblx0XHRcdGFjdGlvbihvYiwgZ2V0dGVyVHlwZSAmJiB2aWV3TW9kZWxzW2dldHRlclR5cGUudHlwZV0sIHByb3AsIHBhcmVudFJlZik7XG5cdFx0fVxuXHR9XG5cblx0ZnVuY3Rpb24gbWFwKGRhdGEpIHtcblx0XHRkYXRhID0gZGF0YSArIFwiXCIgPT09IGRhdGFcblx0XHRcdD8gSlNPTi5wYXJzZShkYXRhKSAvLyBBY2NlcHQgSlNPTiBzdHJpbmdcblx0XHRcdDogZGF0YTsgICAgICAgICAgICAvLyBvciBvYmplY3QvYXJyYXlcblx0XHR2YXIgbCwgcHJvcCwgY2hpbGRPYiwgcGFyZW50UmVmLFxuXHRcdFx0aiA9IDAsXG5cdFx0XHRvYiA9IGRhdGEsXG5cdFx0XHRhcnIgPSBbXTtcblxuXHRcdGlmICgkaXNBcnJheShkYXRhKSkge1xuXHRcdFx0ZGF0YSA9IGRhdGEgfHwgW107XG5cdFx0XHRsID0gZGF0YS5sZW5ndGg7XG5cdFx0XHRmb3IgKDsgajxsOyBqKyspIHtcblx0XHRcdFx0YXJyLnB1c2godGhpcy5tYXAoZGF0YVtqXSkpO1xuXHRcdFx0fVxuXHRcdFx0YXJyLl9pcyA9IG5hbWU7XG5cdFx0XHRhcnIudW5tYXAgPSB1bm1hcDtcblx0XHRcdGFyci5tZXJnZSA9IG1lcmdlO1xuXHRcdFx0cmV0dXJuIGFycjtcblx0XHR9XG5cblx0XHRpZiAoZGF0YSkge1xuXHRcdFx0aXRlcmF0ZShkYXRhLCBmdW5jdGlvbihvYiwgdmlld01vZGVsKSB7XG5cdFx0XHRcdGlmICh2aWV3TW9kZWwpIHsgLy8gSXRlcmF0ZSB0byBidWlsZCBnZXR0ZXJzIGFyZyBhcnJheSAodmFsdWUsIG9yIG1hcHBlZCB2YWx1ZSlcblx0XHRcdFx0XHRvYiA9IHZpZXdNb2RlbC5tYXAob2IpO1xuXHRcdFx0XHR9XG5cdFx0XHRcdGFyci5wdXNoKG9iKTtcblx0XHRcdH0pO1xuXHRcdFx0b2IgPSB0aGlzLmFwcGx5KHRoaXMsIGFycik7IC8vIEluc3RhbnRpYXRlIHRoaXMgVmlldyBNb2RlbCwgcGFzc2luZyBnZXR0ZXJzIGFyZ3MgYXJyYXkgdG8gY29uc3RydWN0b3Jcblx0XHRcdGogPSBnZXR0ZXJDb3VudDtcblx0XHRcdHdoaWxlIChqLS0pIHtcblx0XHRcdFx0Y2hpbGRPYiA9IGFycltqXTtcblx0XHRcdFx0cGFyZW50UmVmID0gZ2V0dGVyc1tqXS5wYXJlbnRSZWY7XG5cdFx0XHRcdGlmIChwYXJlbnRSZWYgJiYgY2hpbGRPYiAmJiBjaGlsZE9iLnVubWFwKSB7XG5cdFx0XHRcdFx0aWYgKCRpc0FycmF5KGNoaWxkT2IpKSB7XG5cdFx0XHRcdFx0XHRsID0gY2hpbGRPYi5sZW5ndGg7XG5cdFx0XHRcdFx0XHR3aGlsZSAobC0tKSB7XG5cdFx0XHRcdFx0XHRcdGFkZFBhcmVudFJlZihjaGlsZE9iW2xdLCBwYXJlbnRSZWYsIG9iKTtcblx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRcdFx0YWRkUGFyZW50UmVmKGNoaWxkT2IsIHBhcmVudFJlZiwgb2IpO1xuXHRcdFx0XHRcdH1cblx0XHRcdFx0fVxuXHRcdFx0fVxuXHRcdFx0Zm9yIChwcm9wIGluIGRhdGEpIHsgLy8gQ29weSBvdmVyIGFueSBvdGhlciBwcm9wZXJ0aWVzLiB0aGF0IGFyZSBub3QgZ2V0L3NldCBwcm9wZXJ0aWVzXG5cdFx0XHRcdGlmIChwcm9wICE9PSAkZXhwYW5kbyAmJiAhZ2V0dGVyTmFtZXNbcHJvcF0pIHtcblx0XHRcdFx0XHRvYltwcm9wXSA9IGRhdGFbcHJvcF07XG5cdFx0XHRcdH1cblx0XHRcdH1cblx0XHR9XG5cdFx0cmV0dXJuIG9iO1xuXHR9XG5cblx0ZnVuY3Rpb24gbWVyZ2UoZGF0YSwgcGFyZW50LCBwYXJlbnRSZWYpIHtcblx0XHRkYXRhID0gZGF0YSArIFwiXCIgPT09IGRhdGFcblx0XHRcdD8gSlNPTi5wYXJzZShkYXRhKSAvLyBBY2NlcHQgSlNPTiBzdHJpbmdcblx0XHRcdDogZGF0YTsgICAgICAgICAgICAvLyBvciBvYmplY3QvYXJyYXlcblxuXHRcdHZhciBqLCBsLCBtLCBwcm9wLCBtb2QsIGZvdW5kLCBhc3NpZ25lZCwgb2IsIG5ld01vZEFyciwgY2hpbGRPYixcblx0XHRcdGsgPSAwLFxuXHRcdFx0bW9kZWwgPSB0aGlzO1xuXG5cdFx0aWYgKCRpc0FycmF5KG1vZGVsKSkge1xuXHRcdFx0YXNzaWduZWQgPSB7fTtcblx0XHRcdG5ld01vZEFyciA9IFtdO1xuXHRcdFx0bCA9IGRhdGEubGVuZ3RoO1xuXHRcdFx0bSA9IG1vZGVsLmxlbmd0aDtcblx0XHRcdGZvciAoOyBrPGw7IGsrKykge1xuXHRcdFx0XHRvYiA9IGRhdGFba107XG5cdFx0XHRcdGZvdW5kID0gZmFsc2U7XG5cdFx0XHRcdGZvciAoaj0wOyBqPG0gJiYgIWZvdW5kOyBqKyspIHtcblx0XHRcdFx0XHRpZiAoYXNzaWduZWRbal0pIHtcblx0XHRcdFx0XHRcdGNvbnRpbnVlO1xuXHRcdFx0XHRcdH1cblx0XHRcdFx0XHRtb2QgPSBtb2RlbFtqXTtcblxuXHRcdFx0XHRcdGlmIChpZCkge1xuXHRcdFx0XHRcdFx0YXNzaWduZWRbal0gPSBmb3VuZCA9IGlkICsgXCJcIiA9PT0gaWRcblx0XHRcdFx0XHRcdD8gKG9iW2lkXSAmJiAoZ2V0dGVyTmFtZXNbaWRdID8gbW9kW2lkXSgpIDogbW9kW2lkXSkgPT09IG9iW2lkXSlcblx0XHRcdFx0XHRcdDogaWQobW9kLCBvYik7XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHR9XG5cdFx0XHRcdGlmIChmb3VuZCkge1xuXHRcdFx0XHRcdG1vZC5tZXJnZShvYik7XG5cdFx0XHRcdFx0bmV3TW9kQXJyLnB1c2gobW9kKTtcblx0XHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0XHRuZXdNb2RBcnIucHVzaChjaGlsZE9iID0gdm0ubWFwKG9iKSk7XG5cdFx0XHRcdFx0aWYgKHBhcmVudFJlZikge1xuXHRcdFx0XHRcdFx0YWRkUGFyZW50UmVmKGNoaWxkT2IsIHBhcmVudFJlZiwgcGFyZW50KTtcblx0XHRcdFx0XHR9XG5cdFx0XHRcdH1cblx0XHRcdH1cblx0XHRcdGlmICgkb2JzZXJ2YWJsZSkge1xuXHRcdFx0XHQkb2JzZXJ2YWJsZShtb2RlbCkucmVmcmVzaChuZXdNb2RBcnIsIHRydWUpO1xuXHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0bW9kZWwuc3BsaWNlLmFwcGx5KG1vZGVsLCBbMCwgbW9kZWwubGVuZ3RoXS5jb25jYXQobmV3TW9kQXJyKSk7XG5cdFx0XHR9XG5cdFx0XHRyZXR1cm47XG5cdFx0fVxuXHRcdGl0ZXJhdGUoZGF0YSwgZnVuY3Rpb24ob2IsIHZpZXdNb2RlbCwgZ2V0dGVyLCBwYXJlbnRSZWYpIHtcblx0XHRcdGlmICh2aWV3TW9kZWwpIHtcblx0XHRcdFx0bW9kZWxbZ2V0dGVyXSgpLm1lcmdlKG9iLCBtb2RlbCwgcGFyZW50UmVmKTsgLy8gVXBkYXRlIHR5cGVkIHByb3BlcnR5XG5cdFx0XHR9IGVsc2UgaWYgKG1vZGVsW2dldHRlcl0oKSAhPT0gb2IpIHtcblx0XHRcdFx0bW9kZWxbZ2V0dGVyXShvYik7IC8vIFVwZGF0ZSBub24tdHlwZWQgcHJvcGVydHlcblx0XHRcdH1cblx0XHR9KTtcblx0XHRmb3IgKHByb3AgaW4gZGF0YSkge1xuXHRcdFx0aWYgKHByb3AgIT09ICRleHBhbmRvICYmICFnZXR0ZXJOYW1lc1twcm9wXSkge1xuXHRcdFx0XHRtb2RlbFtwcm9wXSA9IGRhdGFbcHJvcF07XG5cdFx0XHR9XG5cdFx0fVxuXHR9XG5cblx0ZnVuY3Rpb24gdW5tYXAoKSB7XG5cdFx0dmFyIG9iLCBwcm9wLCBnZXR0ZXJUeXBlLCBhcnIsIHZhbHVlLFxuXHRcdFx0ayA9IDAsXG5cdFx0XHRtb2RlbCA9IHRoaXM7XG5cblx0XHRmdW5jdGlvbiB1bm1hcEFycmF5KG1vZGVsQXJyKSB7XG5cdFx0XHR2YXIgYXJyID0gW10sXG5cdFx0XHRcdGkgPSAwLFxuXHRcdFx0XHRsID0gbW9kZWxBcnIubGVuZ3RoO1xuXHRcdFx0Zm9yICg7IGk8bDsgaSsrKSB7XG5cdFx0XHRcdGFyci5wdXNoKG1vZGVsQXJyW2ldLnVubWFwKCkpO1xuXHRcdFx0fVxuXHRcdFx0cmV0dXJuIGFycjtcblx0XHR9XG5cblx0XHRpZiAoJGlzQXJyYXkobW9kZWwpKSB7XG5cdFx0XHRyZXR1cm4gdW5tYXBBcnJheShtb2RlbCk7XG5cdFx0fVxuXHRcdG9iID0ge307XG5cdFx0Zm9yICg7IGsgPCBnZXR0ZXJDb3VudDsgaysrKSB7XG5cdFx0XHRwcm9wID0gZ2V0dGVyc1trXTtcblx0XHRcdGdldHRlclR5cGUgPSB1bmRlZmluZWQ7XG5cdFx0XHRpZiAocHJvcCArIFwiXCIgIT09IHByb3ApIHtcblx0XHRcdFx0Z2V0dGVyVHlwZSA9IHByb3A7XG5cdFx0XHRcdHByb3AgPSBnZXR0ZXJUeXBlLmdldHRlcjtcblx0XHRcdH1cblx0XHRcdHZhbHVlID0gbW9kZWxbcHJvcF0oKTtcblx0XHRcdG9iW3Byb3BdID0gZ2V0dGVyVHlwZSAmJiB2YWx1ZSAmJiB2aWV3TW9kZWxzW2dldHRlclR5cGUudHlwZV1cblx0XHRcdFx0PyAkaXNBcnJheSh2YWx1ZSlcblx0XHRcdFx0XHQ/IHVubWFwQXJyYXkodmFsdWUpXG5cdFx0XHRcdFx0OiB2YWx1ZS51bm1hcCgpXG5cdFx0XHRcdDogdmFsdWU7XG5cdFx0fVxuXHRcdGZvciAocHJvcCBpbiBtb2RlbCkge1xuXHRcdFx0aWYgKG1vZGVsLmhhc093blByb3BlcnR5KHByb3ApICYmIChwcm9wLmNoYXJBdCgwKSAhPT0gXCJfXCIgfHwgIWdldHRlck5hbWVzW3Byb3Auc2xpY2UoMSldKSAmJiBwcm9wICE9PSAkZXhwYW5kbyAgJiYgISRpc0Z1bmN0aW9uKG1vZGVsW3Byb3BdKSkge1xuXHRcdFx0XHRvYltwcm9wXSA9IG1vZGVsW3Byb3BdO1xuXHRcdFx0fVxuXHRcdH1cblx0XHRyZXR1cm4gb2I7XG5cdH1cblxuXHRKc3ZWbS5wcm90b3R5cGUgPSBwcm90bztcblxuXHRmb3IgKGk9MDsgaSA8IGdldHRlckNvdW50OyBpKyspIHtcblx0XHQoZnVuY3Rpb24oZ2V0dGVyKSB7XG5cdFx0XHRnZXR0ZXIgPSBnZXR0ZXIuZ2V0dGVyIHx8IGdldHRlcjtcblx0XHRcdGdldHRlck5hbWVzW2dldHRlcl0gPSBpKzE7XG5cdFx0XHR2YXIgcHJpdkZpZWxkID0gXCJfXCIgKyBnZXR0ZXI7XG5cblx0XHRcdGFyZ3MgKz0gKGFyZ3MgPyBcIixcIiA6IFwiXCIpICsgZ2V0dGVyO1xuXHRcdFx0Y25zdHIgKz0gXCJ0aGlzLlwiICsgcHJpdkZpZWxkICsgXCIgPSBcIiArIGdldHRlciArIFwiO1xcblwiO1xuXHRcdFx0cHJvdG9bZ2V0dGVyXSA9IHByb3RvW2dldHRlcl0gfHwgZnVuY3Rpb24odmFsKSB7XG5cdFx0XHRcdGlmICghYXJndW1lbnRzLmxlbmd0aCkge1xuXHRcdFx0XHRcdHJldHVybiB0aGlzW3ByaXZGaWVsZF07IC8vIElmIHRoZXJlIGlzIG5vIGFyZ3VtZW50LCB1c2UgYXMgYSBnZXR0ZXJcblx0XHRcdFx0fVxuXHRcdFx0XHRpZiAoJG9ic2VydmFibGUpIHtcblx0XHRcdFx0XHQkb2JzZXJ2YWJsZSh0aGlzKS5zZXRQcm9wZXJ0eShnZXR0ZXIsIHZhbCk7XG5cdFx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdFx0dGhpc1twcml2RmllbGRdID0gdmFsO1xuXHRcdFx0XHR9XG5cdFx0XHR9O1xuXG5cdFx0XHRpZiAoJG9ic2VydmFibGUpIHtcblx0XHRcdFx0cHJvdG9bZ2V0dGVyXS5zZXQgPSBwcm90b1tnZXR0ZXJdLnNldCB8fCBmdW5jdGlvbih2YWwpIHtcblx0XHRcdFx0XHR0aGlzW3ByaXZGaWVsZF0gPSB2YWw7IC8vIFNldHRlciBjYWxsZWQgYnkgb2JzZXJ2YWJsZSBwcm9wZXJ0eSBjaGFuZ2Vcblx0XHRcdFx0fTtcblx0XHRcdH1cblx0XHR9KShnZXR0ZXJzW2ldKTtcblx0fVxuXG5cdC8vIENvbnN0cnVjdG9yIGZvciBuZXcgdmlld01vZGVsIGluc3RhbmNlLlxuXHRjbnN0ciA9IG5ldyBGdW5jdGlvbihhcmdzLCBjbnN0cik7XG5cblx0Y29uc3RydWN0b3IgPSBmdW5jdGlvbigpIHtcblx0XHRjbnN0ci5hcHBseSh0aGlzLCBhcmd1bWVudHMpO1xuXHRcdC8vIFBhc3MgYWRkaXRpb25hbCBwYXJlbnRSZWYgc3RyIGFuZCBwYXJlbnQgb2JqIHRvIGhhdmUgYSBwYXJlbnRSZWYgcG9pbnRlciBvbiBpbnN0YW5jZVxuXHRcdGlmIChwYXJlbnQgPSBhcmd1bWVudHNbZ2V0dGVyQ291bnQgKyAxXSkge1xuXHRcdFx0YWRkUGFyZW50UmVmKHRoaXMsIGFyZ3VtZW50c1tnZXR0ZXJDb3VudF0sIHBhcmVudCk7XG5cdFx0fVxuXHR9O1xuXG5cdGNvbnN0cnVjdG9yLnByb3RvdHlwZSA9IHByb3RvO1xuXHRwcm90by5jb25zdHJ1Y3RvciA9IGNvbnN0cnVjdG9yO1xuXG5cdHZtLm1hcCA9IG1hcDtcblx0dm0uZ2V0dGVycyA9IGdldHRlcnM7XG5cdHZtLmV4dGVuZCA9IGV4dGVuZDtcblx0dm0uaWQgPSBpZDtcblx0cmV0dXJuIHZtO1xufVxuXG5mdW5jdGlvbiB0bXBsT2JqZWN0KG1hcmt1cCwgb3B0aW9ucykge1xuXHQvLyBUZW1wbGF0ZSBvYmplY3QgY29uc3RydWN0b3Jcblx0dmFyIGh0bWxUYWcsXG5cdFx0d3JhcE1hcCA9ICRzdWJTZXR0aW5nc0FkdmFuY2VkLl93bSB8fCB7fSwgLy8gT25seSB1c2VkIGluIEpzVmlld3MuIE90aGVyd2lzZSBlbXB0eToge31cblx0XHR0bXBsID0ge1xuXHRcdFx0dG1wbHM6IFtdLFxuXHRcdFx0bGlua3M6IHt9LCAvLyBDb21waWxlZCBmdW5jdGlvbnMgZm9yIGxpbmsgZXhwcmVzc2lvbnNcblx0XHRcdGJuZHM6IFtdLFxuXHRcdFx0X2lzOiBcInRlbXBsYXRlXCIsXG5cdFx0XHRyZW5kZXI6IHJlbmRlckNvbnRlbnRcblx0XHR9O1xuXG5cdGlmIChvcHRpb25zKSB7XG5cdFx0dG1wbCA9ICRleHRlbmQodG1wbCwgb3B0aW9ucyk7XG5cdH1cblxuXHR0bXBsLm1hcmt1cCA9IG1hcmt1cDtcblx0aWYgKCF0bXBsLmh0bWxUYWcpIHtcblx0XHQvLyBTZXQgdG1wbC50YWcgdG8gdGhlIHRvcC1sZXZlbCBIVE1MIHRhZyB1c2VkIGluIHRoZSB0ZW1wbGF0ZSwgaWYgYW55Li4uXG5cdFx0aHRtbFRhZyA9IHJGaXJzdEVsZW0uZXhlYyhtYXJrdXApO1xuXHRcdHRtcGwuaHRtbFRhZyA9IGh0bWxUYWcgPyBodG1sVGFnWzFdLnRvTG93ZXJDYXNlKCkgOiBcIlwiO1xuXHR9XG5cdGh0bWxUYWcgPSB3cmFwTWFwW3RtcGwuaHRtbFRhZ107XG5cdGlmIChodG1sVGFnICYmIGh0bWxUYWcgIT09IHdyYXBNYXAuZGl2KSB7XG5cdFx0Ly8gV2hlbiB1c2luZyBKc1ZpZXdzLCB3ZSB0cmltIHRlbXBsYXRlcyB3aGljaCBhcmUgaW5zZXJ0ZWQgaW50byBIVE1MIGNvbnRleHRzIHdoZXJlIHRleHQgbm9kZXMgYXJlIG5vdCByZW5kZXJlZCAoaS5lLiBub3QgJ1BocmFzaW5nIENvbnRlbnQnKS5cblx0XHQvLyBDdXJyZW50bHkgbm90IHRyaW1tZWQgZm9yIDxsaT4gdGFnLiAoTm90IHdvcnRoIGFkZGluZyBwZXJmIGNvc3QpXG5cdFx0dG1wbC5tYXJrdXAgPSAkLnRyaW0odG1wbC5tYXJrdXApO1xuXHR9XG5cblx0cmV0dXJuIHRtcGw7XG59XG5cbi8vPT09PT09PT09PT09PT1cbi8vIHJlZ2lzdGVyU3RvcmVcbi8vPT09PT09PT09PT09PT1cblxuLyoqXG4qIEludGVybmFsLiBSZWdpc3RlciBhIHN0b3JlIHR5cGUgKHVzZWQgZm9yIHRlbXBsYXRlLCB0YWdzLCBoZWxwZXJzLCBjb252ZXJ0ZXJzKVxuKi9cbmZ1bmN0aW9uIHJlZ2lzdGVyU3RvcmUoc3RvcmVOYW1lLCBzdG9yZVNldHRpbmdzKSB7XG5cbi8qKlxuKiBHZW5lcmljIHN0b3JlKCkgZnVuY3Rpb24gdG8gcmVnaXN0ZXIgaXRlbSwgbmFtZWQgaXRlbSwgb3IgaGFzaCBvZiBpdGVtc1xuKiBBbHNvIHVzZWQgYXMgaGFzaCB0byBzdG9yZSB0aGUgcmVnaXN0ZXJlZCBpdGVtc1xuKiBVc2VkIGFzIGltcGxlbWVudGF0aW9uIG9mICQudGVtcGxhdGVzKCksICQudmlld3MudGVtcGxhdGVzKCksICQudmlld3MudGFncygpLCAkLnZpZXdzLmhlbHBlcnMoKSBhbmQgJC52aWV3cy5jb252ZXJ0ZXJzKClcbipcbiogQHBhcmFtIHtzdHJpbmd8aGFzaH0gbmFtZSAgICAgICAgIG5hbWUgLSBvciBzZWxlY3RvciwgaW4gY2FzZSBvZiAkLnRlbXBsYXRlcygpLiBPciBoYXNoIG9mIGl0ZW1zXG4qIEBwYXJhbSB7YW55fSAgICAgICAgIFtpdGVtXSAgICAgICAoZS5nLiBtYXJrdXAgZm9yIG5hbWVkIHRlbXBsYXRlKVxuKiBAcGFyYW0ge3RlbXBsYXRlfSAgICBbcGFyZW50VG1wbF0gRm9yIGl0ZW0gYmVpbmcgcmVnaXN0ZXJlZCBhcyBwcml2YXRlIHJlc291cmNlIG9mIHRlbXBsYXRlXG4qIEByZXR1cm5zIHthbnl8JC52aWV3c30gaXRlbSwgZS5nLiBjb21waWxlZCB0ZW1wbGF0ZSAtIG9yICQudmlld3MgaW4gY2FzZSBvZiByZWdpc3RlcmluZyBoYXNoIG9mIGl0ZW1zXG4qL1xuXHRmdW5jdGlvbiB0aGVTdG9yZShuYW1lLCBpdGVtLCBwYXJlbnRUbXBsKSB7XG5cdFx0Ly8gVGhlIHN0b3JlIGlzIGFsc28gdGhlIGZ1bmN0aW9uIHVzZWQgdG8gYWRkIGl0ZW1zIHRvIHRoZSBzdG9yZS4gZS5nLiAkLnRlbXBsYXRlcywgb3IgJC52aWV3cy50YWdzXG5cblx0XHQvLyBGb3Igc3RvcmUgb2YgbmFtZSAndGhpbmcnLCBDYWxsIGFzOlxuXHRcdC8vICAgICQudmlld3MudGhpbmdzKGl0ZW1zWywgcGFyZW50VG1wbF0pLFxuXHRcdC8vIG9yICQudmlld3MudGhpbmdzKG5hbWVbLCBpdGVtLCBwYXJlbnRUbXBsXSlcblxuXHRcdHZhciBjb21waWxlLCBpdGVtTmFtZSwgdGhpc1N0b3JlLCBjbnQsXG5cdFx0XHRvblN0b3JlID0gJHN1Yi5vblN0b3JlW3N0b3JlTmFtZV07XG5cblx0XHRpZiAobmFtZSAmJiB0eXBlb2YgbmFtZSA9PT0gT0JKRUNUICYmICFuYW1lLm5vZGVUeXBlICYmICFuYW1lLm1hcmt1cCAmJiAhbmFtZS5nZXRUZ3QgJiYgIShzdG9yZU5hbWUgPT09IFwidmlld01vZGVsXCIgJiYgbmFtZS5nZXR0ZXJzIHx8IG5hbWUuZXh0ZW5kKSkge1xuXHRcdFx0Ly8gQ2FsbCB0byAkLnZpZXdzLnRoaW5ncyhpdGVtc1ssIHBhcmVudFRtcGxdKSxcblxuXHRcdFx0Ly8gQWRkaW5nIGl0ZW1zIHRvIHRoZSBzdG9yZVxuXHRcdFx0Ly8gSWYgbmFtZSBpcyBhIGhhc2gsIHRoZW4gaXRlbSBpcyBwYXJlbnRUbXBsLiBJdGVyYXRlIG92ZXIgaGFzaCBhbmQgY2FsbCBzdG9yZSBmb3Iga2V5LlxuXHRcdFx0Zm9yIChpdGVtTmFtZSBpbiBuYW1lKSB7XG5cdFx0XHRcdHRoZVN0b3JlKGl0ZW1OYW1lLCBuYW1lW2l0ZW1OYW1lXSwgaXRlbSk7XG5cdFx0XHR9XG5cdFx0XHRyZXR1cm4gaXRlbSB8fCAkdmlld3M7XG5cdFx0fVxuXHRcdC8vIEFkZGluZyBhIHNpbmdsZSB1bm5hbWVkIGl0ZW0gdG8gdGhlIHN0b3JlXG5cdFx0aWYgKG5hbWUgJiYgXCJcIiArIG5hbWUgIT09IG5hbWUpIHsgLy8gbmFtZSBtdXN0IGJlIGEgc3RyaW5nXG5cdFx0XHRwYXJlbnRUbXBsID0gaXRlbTtcblx0XHRcdGl0ZW0gPSBuYW1lO1xuXHRcdFx0bmFtZSA9IHVuZGVmaW5lZDtcblx0XHR9XG5cdFx0dGhpc1N0b3JlID0gcGFyZW50VG1wbFxuXHRcdFx0PyBzdG9yZU5hbWUgPT09IFwidmlld01vZGVsXCJcblx0XHRcdFx0PyBwYXJlbnRUbXBsXG5cdFx0XHRcdDogKHBhcmVudFRtcGxbc3RvcmVOYW1lc10gPSBwYXJlbnRUbXBsW3N0b3JlTmFtZXNdIHx8IHt9KVxuXHRcdFx0OiB0aGVTdG9yZTtcblx0XHRjb21waWxlID0gc3RvcmVTZXR0aW5ncy5jb21waWxlO1xuXG5cdFx0aWYgKGl0ZW0gPT09IHVuZGVmaW5lZCkge1xuXHRcdFx0aXRlbSA9IGNvbXBpbGUgPyBuYW1lIDogdGhpc1N0b3JlW25hbWVdO1xuXHRcdFx0bmFtZSA9IHVuZGVmaW5lZDtcblx0XHR9XG5cdFx0aWYgKGl0ZW0gPT09IG51bGwpIHtcblx0XHRcdC8vIElmIGl0ZW0gaXMgbnVsbCwgZGVsZXRlIHRoaXMgZW50cnlcblx0XHRcdGlmIChuYW1lKSB7XG5cdFx0XHRcdGRlbGV0ZSB0aGlzU3RvcmVbbmFtZV07XG5cdFx0XHR9XG5cdFx0fSBlbHNlIHtcblx0XHRcdGlmIChjb21waWxlKSB7XG5cdFx0XHRcdGl0ZW0gPSBjb21waWxlLmNhbGwodGhpc1N0b3JlLCBuYW1lLCBpdGVtLCBwYXJlbnRUbXBsLCAwKSB8fCB7fTtcblx0XHRcdFx0aXRlbS5faXMgPSBzdG9yZU5hbWU7IC8vIE9ubHkgZG8gdGhpcyBmb3IgY29tcGlsZWQgb2JqZWN0cyAodGFncywgdGVtcGxhdGVzLi4uKVxuXHRcdFx0fVxuXHRcdFx0aWYgKG5hbWUpIHtcblx0XHRcdFx0dGhpc1N0b3JlW25hbWVdID0gaXRlbTtcblx0XHRcdH1cblx0XHR9XG5cdFx0aWYgKG9uU3RvcmUpIHtcblx0XHRcdC8vIGUuZy4gSnNWaWV3cyBpbnRlZ3JhdGlvblxuXHRcdFx0b25TdG9yZShuYW1lLCBpdGVtLCBwYXJlbnRUbXBsLCBjb21waWxlKTtcblx0XHR9XG5cdFx0cmV0dXJuIGl0ZW07XG5cdH1cblxuXHR2YXIgc3RvcmVOYW1lcyA9IHN0b3JlTmFtZSArIFwic1wiO1xuXHQkdmlld3Nbc3RvcmVOYW1lc10gPSB0aGVTdG9yZTtcbn1cblxuLyoqXG4qIEFkZCBzZXR0aW5ncyBzdWNoIGFzOlxuKiAkLnZpZXdzLnNldHRpbmdzLmFsbG93Q29kZSh0cnVlKVxuKiBAcGFyYW0ge2Jvb2xlYW59ICB2YWx1ZVxuKiBAcmV0dXJucyB7U2V0dGluZ3N9XG4qXG4qIGFsbG93Q29kZSA9ICQudmlld3Muc2V0dGluZ3MuYWxsb3dDb2RlKClcbiogQHJldHVybnMge2Jvb2xlYW59XG4qL1xuZnVuY3Rpb24gYWRkU2V0dGluZyhzdCkge1xuXHQkdmlld3NTZXR0aW5nc1tzdF0gPSAkdmlld3NTZXR0aW5nc1tzdF0gfHwgZnVuY3Rpb24odmFsdWUpIHtcblx0XHRyZXR1cm4gYXJndW1lbnRzLmxlbmd0aFxuXHRcdFx0PyAoJHN1YlNldHRpbmdzW3N0XSA9IHZhbHVlLCAkdmlld3NTZXR0aW5ncylcblx0XHRcdDogJHN1YlNldHRpbmdzW3N0XTtcblx0fTtcbn1cblxuLy89PT09PT09PT09PT09PT09PT09PT09PT1cbi8vIGRhdGFNYXAgZm9yIHJlbmRlciBvbmx5XG4vLz09PT09PT09PT09PT09PT09PT09PT09PVxuXG5mdW5jdGlvbiBkYXRhTWFwKG1hcERlZikge1xuXHRmdW5jdGlvbiBNYXAoc291cmNlLCBvcHRpb25zKSB7XG5cdFx0dGhpcy50Z3QgPSBtYXBEZWYuZ2V0VGd0KHNvdXJjZSwgb3B0aW9ucyk7XG5cdFx0b3B0aW9ucy5tYXAgPSB0aGlzO1xuXHR9XG5cblx0aWYgKCRpc0Z1bmN0aW9uKG1hcERlZikpIHtcblx0XHQvLyBTaW1wbGUgbWFwIGRlY2xhcmVkIGFzIGZ1bmN0aW9uXG5cdFx0bWFwRGVmID0ge1xuXHRcdFx0Z2V0VGd0OiBtYXBEZWZcblx0XHR9O1xuXHR9XG5cblx0aWYgKG1hcERlZi5iYXNlTWFwKSB7XG5cdFx0bWFwRGVmID0gJGV4dGVuZCgkZXh0ZW5kKHt9LCBtYXBEZWYuYmFzZU1hcCksIG1hcERlZik7XG5cdH1cblxuXHRtYXBEZWYubWFwID0gZnVuY3Rpb24oc291cmNlLCBvcHRpb25zKSB7XG5cdFx0cmV0dXJuIG5ldyBNYXAoc291cmNlLCBvcHRpb25zKTtcblx0fTtcblx0cmV0dXJuIG1hcERlZjtcbn1cblxuLy89PT09PT09PT09PT09PVxuLy8gcmVuZGVyQ29udGVudFxuLy89PT09PT09PT09PT09PVxuXG4vKiogUmVuZGVyIHRoZSB0ZW1wbGF0ZSBhcyBhIHN0cmluZywgdXNpbmcgdGhlIHNwZWNpZmllZCBkYXRhIGFuZCBoZWxwZXJzL2NvbnRleHRcbiogJChcIiN0bXBsXCIpLnJlbmRlcigpLCB0bXBsLnJlbmRlcigpLCB0YWdDdHgucmVuZGVyKCksICQucmVuZGVyLm5hbWVkVG1wbCgpXG4qXG4qIEBwYXJhbSB7YW55fSAgICAgICAgZGF0YVxuKiBAcGFyYW0ge2hhc2h9ICAgICAgIFtjb250ZXh0XSAgICAgICAgICAgaGVscGVycyBvciBjb250ZXh0XG4qIEBwYXJhbSB7Ym9vbGVhbn0gICAgW25vSXRlcmF0aW9uXVxuKiBAcGFyYW0ge1ZpZXd9ICAgICAgIFtwYXJlbnRWaWV3XSAgICAgICAgaW50ZXJuYWxcbiogQHBhcmFtIHtzdHJpbmd9ICAgICBba2V5XSAgICAgICAgICAgICAgIGludGVybmFsXG4qIEBwYXJhbSB7ZnVuY3Rpb259ICAgW29uUmVuZGVyXSAgICAgICAgICBpbnRlcm5hbFxuKiBAcmV0dXJucyB7c3RyaW5nfSAgIHJlbmRlcmVkIHRlbXBsYXRlICAgaW50ZXJuYWxcbiovXG5mdW5jdGlvbiByZW5kZXJDb250ZW50KGRhdGEsIGNvbnRleHQsIG5vSXRlcmF0aW9uLCBwYXJlbnRWaWV3LCBrZXksIG9uUmVuZGVyKSB7XG5cdHZhciBpLCBsLCB0YWcsIHRtcGwsIHRhZ0N0eCwgaXNUb3BSZW5kZXJDYWxsLCBwcmV2RGF0YSwgcHJldkluZGV4LFxuXHRcdHZpZXcgPSBwYXJlbnRWaWV3LFxuXHRcdHJlc3VsdCA9IFwiXCI7XG5cblx0aWYgKGNvbnRleHQgPT09IHRydWUpIHtcblx0XHRub0l0ZXJhdGlvbiA9IGNvbnRleHQ7IC8vIHBhc3NpbmcgYm9vbGVhbiBhcyBzZWNvbmQgcGFyYW0gLSBub0l0ZXJhdGlvblxuXHRcdGNvbnRleHQgPSB1bmRlZmluZWQ7XG5cdH0gZWxzZSBpZiAodHlwZW9mIGNvbnRleHQgIT09IE9CSkVDVCkge1xuXHRcdGNvbnRleHQgPSB1bmRlZmluZWQ7IC8vIGNvbnRleHQgbXVzdCBiZSBhIGJvb2xlYW4gKG5vSXRlcmF0aW9uKSBvciBhIHBsYWluIG9iamVjdFxuXHR9XG5cblx0aWYgKHRhZyA9IHRoaXMudGFnKSB7XG5cdFx0Ly8gVGhpcyBpcyBhIGNhbGwgZnJvbSByZW5kZXJUYWcgb3IgdGFnQ3R4LnJlbmRlciguLi4pXG5cdFx0dGFnQ3R4ID0gdGhpcztcblx0XHR2aWV3ID0gdmlldyB8fCB0YWdDdHgudmlldztcblx0XHR0bXBsID0gdmlldy5fZ2V0VG1wbCh0YWcudGVtcGxhdGUgfHwgdGFnQ3R4LnRtcGwpO1xuXHRcdGlmICghYXJndW1lbnRzLmxlbmd0aCkge1xuXHRcdFx0ZGF0YSA9IHRhZy5jb250ZW50Q3R4ICYmICRpc0Z1bmN0aW9uKHRhZy5jb250ZW50Q3R4KVxuXHRcdFx0XHQ/IGRhdGEgPSB0YWcuY29udGVudEN0eChkYXRhKVxuXHRcdFx0XHQ6IHZpZXc7IC8vIERlZmF1bHQgZGF0YSBjb250ZXh0IGZvciB3cmFwcGVkIGJsb2NrIGNvbnRlbnQgaXMgdGhlIGZpcnN0IGFyZ3VtZW50XG5cdFx0fVxuXHR9IGVsc2Uge1xuXHRcdC8vIFRoaXMgaXMgYSB0ZW1wbGF0ZS5yZW5kZXIoLi4uKSBjYWxsXG5cdFx0dG1wbCA9IHRoaXM7XG5cdH1cblxuXHRpZiAodG1wbCkge1xuXHRcdGlmICghcGFyZW50VmlldyAmJiBkYXRhICYmIGRhdGEuX2lzID09PSBcInZpZXdcIikge1xuXHRcdFx0dmlldyA9IGRhdGE7IC8vIFdoZW4gcGFzc2luZyBpbiBhIHZpZXcgdG8gcmVuZGVyIG9yIGxpbmsgKGFuZCBub3QgcGFzc2luZyBpbiBhIHBhcmVudCB2aWV3KSB1c2UgdGhlIHBhc3NlZC1pbiB2aWV3IGFzIHBhcmVudFZpZXdcblx0XHR9XG5cblx0XHRpZiAodmlldyAmJiBkYXRhID09PSB2aWV3KSB7XG5cdFx0XHQvLyBJbmhlcml0IHRoZSBkYXRhIGZyb20gdGhlIHBhcmVudCB2aWV3LlxuXHRcdFx0ZGF0YSA9IHZpZXcuZGF0YTtcblx0XHR9XG5cblx0XHRpc1RvcFJlbmRlckNhbGwgPSAhdmlldztcblx0XHRpc1JlbmRlckNhbGwgPSBpc1JlbmRlckNhbGwgfHwgaXNUb3BSZW5kZXJDYWxsO1xuXHRcdGlmICghdmlldykge1xuXHRcdFx0KGNvbnRleHQgPSBjb250ZXh0IHx8IHt9KS5yb290ID0gZGF0YTsgLy8gUHJvdmlkZSB+cm9vdCBhcyBzaG9ydGN1dCB0byB0b3AtbGV2ZWwgZGF0YS5cblx0XHR9XG5cdFx0aWYgKCFpc1JlbmRlckNhbGwgfHwgJHN1YlNldHRpbmdzQWR2YW5jZWQudXNlVmlld3MgfHwgdG1wbC51c2VWaWV3cyB8fCB2aWV3ICYmIHZpZXcgIT09IHRvcFZpZXcpIHtcblx0XHRcdHJlc3VsdCA9IHJlbmRlcldpdGhWaWV3cyh0bXBsLCBkYXRhLCBjb250ZXh0LCBub0l0ZXJhdGlvbiwgdmlldywga2V5LCBvblJlbmRlciwgdGFnKTtcblx0XHR9IGVsc2Uge1xuXHRcdFx0aWYgKHZpZXcpIHsgLy8gSW4gYSBibG9ja1xuXHRcdFx0XHRwcmV2RGF0YSA9IHZpZXcuZGF0YTtcblx0XHRcdFx0cHJldkluZGV4ID0gdmlldy5pbmRleDtcblx0XHRcdFx0dmlldy5pbmRleCA9IGluZGV4U3RyO1xuXHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0dmlldyA9IHRvcFZpZXc7XG5cdFx0XHRcdHByZXZEYXRhID0gdmlldy5kYXRhO1xuXHRcdFx0XHR2aWV3LmRhdGEgPSBkYXRhO1xuXHRcdFx0XHR2aWV3LmN0eCA9IGNvbnRleHQ7XG5cdFx0XHR9XG5cdFx0XHRpZiAoJGlzQXJyYXkoZGF0YSkgJiYgIW5vSXRlcmF0aW9uKSB7XG5cdFx0XHRcdC8vIENyZWF0ZSBhIHZpZXcgZm9yIHRoZSBhcnJheSwgd2hvc2UgY2hpbGQgdmlld3MgY29ycmVzcG9uZCB0byBlYWNoIGRhdGEgaXRlbS4gKE5vdGU6IGlmIGtleSBhbmQgcGFyZW50VmlldyBhcmUgcGFzc2VkIGluXG5cdFx0XHRcdC8vIGFsb25nIHdpdGggcGFyZW50IHZpZXcsIHRyZWF0IGFzIGluc2VydCAtZS5nLiBmcm9tIHZpZXcuYWRkVmlld3MgLSBzbyBwYXJlbnRWaWV3IGlzIGFscmVhZHkgdGhlIHZpZXcgaXRlbSBmb3IgYXJyYXkpXG5cdFx0XHRcdGZvciAoaSA9IDAsIGwgPSBkYXRhLmxlbmd0aDsgaSA8IGw7IGkrKykge1xuXHRcdFx0XHRcdHZpZXcuaW5kZXggPSBpO1xuXHRcdFx0XHRcdHZpZXcuZGF0YSA9IGRhdGFbaV07XG5cdFx0XHRcdFx0cmVzdWx0ICs9IHRtcGwuZm4oZGF0YVtpXSwgdmlldywgJHN1Yik7XG5cdFx0XHRcdH1cblx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdHZpZXcuZGF0YSA9IGRhdGE7XG5cdFx0XHRcdHJlc3VsdCArPSB0bXBsLmZuKGRhdGEsIHZpZXcsICRzdWIpO1xuXHRcdFx0fVxuXHRcdFx0dmlldy5kYXRhID0gcHJldkRhdGE7XG5cdFx0XHR2aWV3LmluZGV4ID0gcHJldkluZGV4O1xuXHRcdH1cblx0XHRpZiAoaXNUb3BSZW5kZXJDYWxsKSB7XG5cdFx0XHRpc1JlbmRlckNhbGwgPSB1bmRlZmluZWQ7XG5cdFx0fVxuXHR9XG5cdHJldHVybiByZXN1bHQ7XG59XG5cbmZ1bmN0aW9uIHJlbmRlcldpdGhWaWV3cyh0bXBsLCBkYXRhLCBjb250ZXh0LCBub0l0ZXJhdGlvbiwgdmlldywga2V5LCBvblJlbmRlciwgdGFnKSB7XG5cdGZ1bmN0aW9uIHNldEl0ZW1WYXIoaXRlbSkge1xuXHRcdC8vIFdoZW4gaXRlbVZhciBpcyBzcGVjaWZpZWQsIHNldCBtb2RpZmllZCBjdHggd2l0aCB1c2VyLW5hbWVkIH5pdGVtXG5cdFx0bmV3Q3R4ID0gJGV4dGVuZCh7fSwgY29udGV4dCk7XG5cdFx0bmV3Q3R4W2l0ZW1WYXJdID0gaXRlbTtcblx0fVxuXG5cdC8vIFJlbmRlciB0ZW1wbGF0ZSBhZ2FpbnN0IGRhdGEgYXMgYSB0cmVlIG9mIHN1YnZpZXdzIChuZXN0ZWQgcmVuZGVyZWQgdGVtcGxhdGUgaW5zdGFuY2VzKSwgb3IgYXMgYSBzdHJpbmcgKHRvcC1sZXZlbCB0ZW1wbGF0ZSkuXG5cdC8vIElmIHRoZSBkYXRhIGlzIHRoZSBwYXJlbnQgdmlldywgdHJlYXQgYXMgbm9JdGVyYXRpb24sIHJlLXJlbmRlciB3aXRoIHRoZSBzYW1lIGRhdGEgY29udGV4dC5cblx0Ly8gdG1wbCBjYW4gYmUgYSBzdHJpbmcgKGUuZy4gcmVuZGVyZWQgYnkgYSB0YWcucmVuZGVyKCkgbWV0aG9kKSwgb3IgYSBjb21waWxlZCB0ZW1wbGF0ZS5cblx0dmFyIGksIGwsIG5ld1ZpZXcsIGNoaWxkVmlldywgaXRlbVJlc3VsdCwgc3dhcENvbnRlbnQsIGNvbnRlbnRUbXBsLCBvdXRlck9uUmVuZGVyLCB0bXBsTmFtZSwgaXRlbVZhciwgbmV3Q3R4LCB0YWdDdHgsIG5vTGlua2luZyxcblx0XHRyZXN1bHQgPSBcIlwiO1xuXG5cdGlmICh0YWcpIHtcblx0XHQvLyBUaGlzIGlzIGEgY2FsbCBmcm9tIHJlbmRlclRhZyBvciB0YWdDdHgucmVuZGVyKC4uLilcblx0XHR0bXBsTmFtZSA9IHRhZy50YWdOYW1lO1xuXHRcdHRhZ0N0eCA9IHRhZy50YWdDdHg7XG5cdFx0Y29udGV4dCA9IGNvbnRleHQgPyBleHRlbmRDdHgoY29udGV4dCwgdGFnLmN0eCkgOiB0YWcuY3R4O1xuXG5cdFx0aWYgKHRtcGwgPT09IHZpZXcuY29udGVudCkgeyAvLyB7e3h4eCB0bXBsPSNjb250ZW50fX1cblx0XHRcdGNvbnRlbnRUbXBsID0gdG1wbCAhPT0gdmlldy5jdHguX3dycCAvLyBXZSBhcmUgcmVuZGVyaW5nIHRoZSAjY29udGVudFxuXHRcdFx0XHQ/IHZpZXcuY3R4Ll93cnAgLy8gI2NvbnRlbnQgd2FzIHRoZSB0YWdDdHgucHJvcHMudG1wbCB3cmFwcGVyIG9mIHRoZSBibG9jayBjb250ZW50IC0gc28gd2l0aGluIHRoaXMgdmlldywgI2NvbnRlbnQgd2lsbCBub3cgYmUgdGhlIHZpZXcuY3R4Ll93cnAgYmxvY2sgY29udGVudFxuXHRcdFx0XHQ6IHVuZGVmaW5lZDsgLy8gI2NvbnRlbnQgd2FzIHRoZSB2aWV3LmN0eC5fd3JwIGJsb2NrIGNvbnRlbnQgLSBzbyB3aXRoaW4gdGhpcyB2aWV3LCB0aGVyZSBpcyBubyBsb25nZXIgYW55ICNjb250ZW50IHRvIHdyYXAuXG5cdFx0fSBlbHNlIGlmICh0bXBsICE9PSB0YWdDdHguY29udGVudCkge1xuXHRcdFx0aWYgKHRtcGwgPT09IHRhZy50ZW1wbGF0ZSkgeyAvLyBSZW5kZXJpbmcge3t0YWd9fSB0YWcudGVtcGxhdGUsIHJlcGxhY2luZyBibG9jayBjb250ZW50LlxuXHRcdFx0XHRjb250ZW50VG1wbCA9IHRhZ0N0eC50bXBsOyAvLyBTZXQgI2NvbnRlbnQgdG8gYmxvY2sgY29udGVudCAob3Igd3JhcHBlZCBibG9jayBjb250ZW50IGlmIHRhZ0N0eC5wcm9wcy50bXBsIGlzIHNldClcblx0XHRcdFx0Y29udGV4dC5fd3JwID0gdGFnQ3R4LmNvbnRlbnQ7IC8vIFBhc3Mgd3JhcHBlZCBibG9jayBjb250ZW50IHRvIG5lc3RlZCB2aWV3c1xuXHRcdFx0fSBlbHNlIHsgLy8gUmVuZGVyaW5nIHRhZ0N0eC5wcm9wcy50bXBsIHdyYXBwZXJcblx0XHRcdFx0Y29udGVudFRtcGwgPSB0YWdDdHguY29udGVudCB8fCB2aWV3LmNvbnRlbnQ7IC8vIFNldCAjY29udGVudCB0byB3cmFwcGVkIGJsb2NrIGNvbnRlbnRcblx0XHRcdH1cblx0XHR9IGVsc2Uge1xuXHRcdFx0Y29udGVudFRtcGwgPSB2aWV3LmNvbnRlbnQ7IC8vIE5lc3RlZCB2aWV3cyBpbmhlcml0IHNhbWUgd3JhcHBlZCAjY29udGVudCBwcm9wZXJ0eVxuXHRcdH1cblxuXHRcdGlmICh0YWdDdHgucHJvcHMubGluayA9PT0gZmFsc2UpIHtcblx0XHRcdC8vIGxpbms9ZmFsc2Ugc2V0dGluZyBvbiBibG9jayB0YWdcblx0XHRcdC8vIFdlIHdpbGwgb3ZlcnJpZGUgaW5oZXJpdGVkIHZhbHVlIG9mIGxpbmsgYnkgdGhlIGV4cGxpY2l0IHNldHRpbmcgbGluaz1mYWxzZSB0YWtlbiBmcm9tIHByb3BzXG5cdFx0XHQvLyBUaGUgY2hpbGQgdmlld3Mgb2YgYW4gdW5saW5rZWQgdmlldyBhcmUgYWxzbyB1bmxpbmtlZC4gU28gc2V0dGluZyBjaGlsZCBiYWNrIHRvIHRydWUgd2lsbCBub3QgaGF2ZSBhbnkgZWZmZWN0LlxuXHRcdFx0Y29udGV4dCA9IGNvbnRleHQgfHwge307XG5cdFx0XHRjb250ZXh0LmxpbmsgPSBmYWxzZTtcblx0XHR9XG5cdFx0aWYgKGl0ZW1WYXIgPSB0YWdDdHgucHJvcHMuaXRlbVZhcikge1xuXHRcdFx0aWYgKGl0ZW1WYXJbMF0gIT09IFwiflwiKSB7XG5cdFx0XHRcdHN5bnRheEVycm9yKFwiVXNlIGl0ZW1WYXI9J35teUl0ZW0nXCIpO1xuXHRcdFx0fVxuXHRcdFx0aXRlbVZhciA9IGl0ZW1WYXIuc2xpY2UoMSk7XG5cdFx0fVxuXHR9XG5cblx0aWYgKHZpZXcpIHtcblx0XHRvblJlbmRlciA9IG9uUmVuZGVyIHx8IHZpZXcuXy5vblJlbmRlcjtcblx0XHRub0xpbmtpbmcgPSBjb250ZXh0ICYmIGNvbnRleHQubGluayA9PT0gZmFsc2U7XG5cblx0XHRpZiAobm9MaW5raW5nICYmIHZpZXcuXy5ubCkge1xuXHRcdFx0b25SZW5kZXIgPSB1bmRlZmluZWQ7XG5cdFx0fVxuXG5cdFx0Y29udGV4dCA9IGV4dGVuZEN0eChjb250ZXh0LCB2aWV3LmN0eCk7XG5cdH1cblxuXHRpZiAoa2V5ID09PSB0cnVlKSB7XG5cdFx0c3dhcENvbnRlbnQgPSB0cnVlO1xuXHRcdGtleSA9IDA7XG5cdH1cblxuXHQvLyBJZiBsaW5rPT09ZmFsc2UsIGRvIG5vdCBjYWxsIG9uUmVuZGVyLCBzbyBubyBkYXRhLWxpbmtpbmcgbWFya2VyIG5vZGVzXG5cdGlmIChvblJlbmRlciAmJiB0YWcgJiYgdGFnLl8ubm9Wd3MpIHtcblx0XHRvblJlbmRlciA9IHVuZGVmaW5lZDtcblx0fVxuXHRvdXRlck9uUmVuZGVyID0gb25SZW5kZXI7XG5cdGlmIChvblJlbmRlciA9PT0gdHJ1ZSkge1xuXHRcdC8vIFVzZWQgYnkgdmlldy5yZWZyZXNoKCkuIERvbid0IGNyZWF0ZSBhIG5ldyB3cmFwcGVyIHZpZXcuXG5cdFx0b3V0ZXJPblJlbmRlciA9IHVuZGVmaW5lZDtcblx0XHRvblJlbmRlciA9IHZpZXcuXy5vblJlbmRlcjtcblx0fVxuXHQvLyBTZXQgYWRkaXRpb25hbCBjb250ZXh0IG9uIHZpZXdzIGNyZWF0ZWQgaGVyZSwgKGFzIG1vZGlmaWVkIGNvbnRleHQgaW5oZXJpdGVkIGZyb20gdGhlIHBhcmVudCwgYW5kIHRvIGJlIGluaGVyaXRlZCBieSBjaGlsZCB2aWV3cylcblx0Y29udGV4dCA9IHRtcGwuaGVscGVyc1xuXHRcdD8gZXh0ZW5kQ3R4KHRtcGwuaGVscGVycywgY29udGV4dClcblx0XHQ6IGNvbnRleHQ7XG5cblx0bmV3Q3R4ID0gY29udGV4dDtcblx0aWYgKCRpc0FycmF5KGRhdGEpICYmICFub0l0ZXJhdGlvbikge1xuXHRcdC8vIENyZWF0ZSBhIHZpZXcgZm9yIHRoZSBhcnJheSwgd2hvc2UgY2hpbGQgdmlld3MgY29ycmVzcG9uZCB0byBlYWNoIGRhdGEgaXRlbS4gKE5vdGU6IGlmIGtleSBhbmQgdmlldyBhcmUgcGFzc2VkIGluXG5cdFx0Ly8gYWxvbmcgd2l0aCBwYXJlbnQgdmlldywgdHJlYXQgYXMgaW5zZXJ0IC1lLmcuIGZyb20gdmlldy5hZGRWaWV3cyAtIHNvIHZpZXcgaXMgYWxyZWFkeSB0aGUgdmlldyBpdGVtIGZvciBhcnJheSlcblx0XHRuZXdWaWV3ID0gc3dhcENvbnRlbnRcblx0XHRcdD8gdmlld1xuXHRcdFx0OiAoa2V5ICE9PSB1bmRlZmluZWQgJiYgdmlldylcblx0XHRcdFx0fHwgbmV3IFZpZXcoY29udGV4dCwgXCJhcnJheVwiLCB2aWV3LCBkYXRhLCB0bXBsLCBrZXksIG9uUmVuZGVyLCBjb250ZW50VG1wbCk7XG5cdFx0bmV3Vmlldy5fLm5sPSBub0xpbmtpbmc7XG5cdFx0aWYgKHZpZXcgJiYgdmlldy5fLnVzZUtleSkge1xuXHRcdFx0Ly8gUGFyZW50IGlzIG5vdCBhbiAnYXJyYXkgdmlldydcblx0XHRcdG5ld1ZpZXcuXy5ibmQgPSAhdGFnIHx8IHRhZy5fLmJuZCAmJiB0YWc7IC8vIEZvciBhcnJheSB2aWV3cyB0aGF0IGFyZSBkYXRhIGJvdW5kIGZvciBjb2xsZWN0aW9uIGNoYW5nZSBldmVudHMsIHNldCB0aGVcblx0XHRcdC8vIHZpZXcuXy5ibmQgcHJvcGVydHkgdG8gdHJ1ZSBmb3IgdG9wLWxldmVsIGxpbmsoKSBvciBkYXRhLWxpbms9XCJ7Zm9yfVwiLCBvciB0byB0aGUgdGFnIGluc3RhbmNlIGZvciBhIGRhdGEtYm91bmQgdGFnLCBlLmcuIHtee2ZvciAuLi59fVxuXHRcdFx0bmV3Vmlldy50YWcgPSB0YWc7XG5cdFx0fVxuXHRcdGZvciAoaSA9IDAsIGwgPSBkYXRhLmxlbmd0aDsgaSA8IGw7IGkrKykge1xuXHRcdFx0Ly8gQ3JlYXRlIGEgdmlldyBmb3IgZWFjaCBkYXRhIGl0ZW0uXG5cdFx0XHRpZiAoaXRlbVZhcikge1xuXHRcdFx0XHRzZXRJdGVtVmFyKGRhdGFbaV0pOyAvLyB1c2UgbW9kaWZpZWQgY3R4IHdpdGggdXNlci1uYW1lZCB+aXRlbVxuXHRcdFx0fVxuXHRcdFx0Y2hpbGRWaWV3ID0gbmV3IFZpZXcobmV3Q3R4LCBcIml0ZW1cIiwgbmV3VmlldywgZGF0YVtpXSwgdG1wbCwgKGtleSB8fCAwKSArIGksIG9uUmVuZGVyLCBuZXdWaWV3LmNvbnRlbnQpO1xuXHRcdFx0Y2hpbGRWaWV3Ll8uaXQgPSBpdGVtVmFyO1xuXG5cdFx0XHRpdGVtUmVzdWx0ID0gdG1wbC5mbihkYXRhW2ldLCBjaGlsZFZpZXcsICRzdWIpO1xuXHRcdFx0cmVzdWx0ICs9IG5ld1ZpZXcuXy5vblJlbmRlciA/IG5ld1ZpZXcuXy5vblJlbmRlcihpdGVtUmVzdWx0LCBjaGlsZFZpZXcpIDogaXRlbVJlc3VsdDtcblx0XHR9XG5cdH0gZWxzZSB7XG5cdFx0Ly8gQ3JlYXRlIGEgdmlldyBmb3Igc2luZ2xldG9uIGRhdGEgb2JqZWN0LiBUaGUgdHlwZSBvZiB0aGUgdmlldyB3aWxsIGJlIHRoZSB0YWcgbmFtZSwgZS5nLiBcImlmXCIgb3IgXCJteXRhZ1wiIGV4Y2VwdCBmb3Jcblx0XHQvLyBcIml0ZW1cIiwgXCJhcnJheVwiIGFuZCBcImRhdGFcIiB2aWV3cy4gQSBcImRhdGFcIiB2aWV3IGlzIGZyb20gcHJvZ3JhbW1hdGljIHJlbmRlcihvYmplY3QpIGFnYWluc3QgYSAnc2luZ2xldG9uJy5cblx0XHRpZiAoaXRlbVZhcikge1xuXHRcdFx0c2V0SXRlbVZhcihkYXRhKTtcblx0XHR9XG5cdFx0bmV3VmlldyA9IHN3YXBDb250ZW50ID8gdmlldyA6IG5ldyBWaWV3KG5ld0N0eCwgdG1wbE5hbWUgfHwgXCJkYXRhXCIsIHZpZXcsIGRhdGEsIHRtcGwsIGtleSwgb25SZW5kZXIsIGNvbnRlbnRUbXBsKTtcblx0XHRuZXdWaWV3Ll8uaXQgPSBpdGVtVmFyO1xuXHRcdG5ld1ZpZXcudGFnID0gdGFnO1xuXHRcdG5ld1ZpZXcuXy5ubCA9IG5vTGlua2luZztcblx0XHRyZXN1bHQgKz0gdG1wbC5mbihkYXRhLCBuZXdWaWV3LCAkc3ViKTtcblx0fVxuXHRpZiAodGFnKSB7XG5cdFx0bmV3Vmlldy50YWdFbHNlID0gdGFnQ3R4LmluZGV4O1xuXHRcdHRhZ0N0eC5jb250ZW50VmlldyA9IG5ld1ZpZXc7XG5cdH1cblx0cmV0dXJuIG91dGVyT25SZW5kZXIgPyBvdXRlck9uUmVuZGVyKHJlc3VsdCwgbmV3VmlldykgOiByZXN1bHQ7XG59XG5cbi8vPT09PT09PT09PT09PT09PT09PT09PT09PT09XG4vLyBCdWlsZCBhbmQgY29tcGlsZSB0ZW1wbGF0ZVxuLy89PT09PT09PT09PT09PT09PT09PT09PT09PT1cblxuLy8gR2VuZXJhdGUgYSByZXVzYWJsZSBmdW5jdGlvbiB0aGF0IHdpbGwgc2VydmUgdG8gcmVuZGVyIGEgdGVtcGxhdGUgYWdhaW5zdCBkYXRhXG4vLyAoQ29tcGlsZSBBU1QgdGhlbiBidWlsZCB0ZW1wbGF0ZSBmdW5jdGlvbilcblxuZnVuY3Rpb24gb25SZW5kZXJFcnJvcihlLCB2aWV3LCBmYWxsYmFjaykge1xuXHR2YXIgbWVzc2FnZSA9IGZhbGxiYWNrICE9PSB1bmRlZmluZWRcblx0XHQ/ICRpc0Z1bmN0aW9uKGZhbGxiYWNrKVxuXHRcdFx0PyBmYWxsYmFjay5jYWxsKHZpZXcuZGF0YSwgZSwgdmlldylcblx0XHRcdDogZmFsbGJhY2sgfHwgXCJcIlxuXHRcdDogXCJ7RXJyb3I6IFwiICsgKGUubWVzc2FnZXx8ZSkgKyBcIn1cIjtcblxuXHRpZiAoJHN1YlNldHRpbmdzLm9uRXJyb3IgJiYgKGZhbGxiYWNrID0gJHN1YlNldHRpbmdzLm9uRXJyb3IuY2FsbCh2aWV3LmRhdGEsIGUsIGZhbGxiYWNrICYmIG1lc3NhZ2UsIHZpZXcpKSAhPT0gdW5kZWZpbmVkKSB7XG5cdFx0bWVzc2FnZSA9IGZhbGxiYWNrOyAvLyBUaGVyZSBpcyBhIHNldHRpbmdzLmRlYnVnTW9kZShoYW5kbGVyKSBvbkVycm9yIG92ZXJyaWRlLiBDYWxsIGl0LCBhbmQgdXNlIHJldHVybiB2YWx1ZSAoaWYgYW55KSB0byByZXBsYWNlIG1lc3NhZ2Vcblx0fVxuXHRyZXR1cm4gdmlldyAmJiAhdmlldy5fbGMgPyAkY29udmVydGVycy5odG1sKG1lc3NhZ2UpIDogbWVzc2FnZTsgLy8gRm9yIGRhdGEtbGluaz1cXFwiey4uLiBvbkVycm9yPS4uLn1cIi4uLiBTZWUgb25EYXRhTGlua2VkVGFnQ2hhbmdlXG59XG5cbmZ1bmN0aW9uIGVycm9yKG1lc3NhZ2UpIHtcblx0dGhyb3cgbmV3ICRzdWIuRXJyKG1lc3NhZ2UpO1xufVxuXG5mdW5jdGlvbiBzeW50YXhFcnJvcihtZXNzYWdlKSB7XG5cdGVycm9yKFwiU3ludGF4IGVycm9yXFxuXCIgKyBtZXNzYWdlKTtcbn1cblxuZnVuY3Rpb24gdG1wbEZuKG1hcmt1cCwgdG1wbCwgaXNMaW5rRXhwciwgY29udmVydEJhY2ssIGhhc0Vsc2UpIHtcblx0Ly8gQ29tcGlsZSBtYXJrdXAgdG8gQVNUIChhYnRyYWN0IHN5bnRheCB0cmVlKSB0aGVuIGJ1aWxkIHRoZSB0ZW1wbGF0ZSBmdW5jdGlvbiBjb2RlIGZyb20gdGhlIEFTVCBub2Rlc1xuXHQvLyBVc2VkIGZvciBjb21waWxpbmcgdGVtcGxhdGVzLCBhbmQgYWxzbyBieSBKc1ZpZXdzIHRvIGJ1aWxkIGZ1bmN0aW9ucyBmb3IgZGF0YSBsaW5rIGV4cHJlc3Npb25zXG5cblx0Ly89PT09IG5lc3RlZCBmdW5jdGlvbnMgPT09PVxuXHRmdW5jdGlvbiBwdXNocHJlY2VkaW5nQ29udGVudChzaGlmdCkge1xuXHRcdHNoaWZ0IC09IGxvYztcblx0XHRpZiAoc2hpZnQpIHtcblx0XHRcdGNvbnRlbnQucHVzaChtYXJrdXAuc3Vic3RyKGxvYywgc2hpZnQpLnJlcGxhY2Uock5ld0xpbmUsIFwiXFxcXG5cIikpO1xuXHRcdH1cblx0fVxuXG5cdGZ1bmN0aW9uIGJsb2NrVGFnQ2hlY2sodGFnTmFtZSwgYmxvY2spIHtcblx0XHRpZiAodGFnTmFtZSkge1xuXHRcdFx0dGFnTmFtZSArPSAnfX0nO1xuXHRcdFx0Ly9cdFx0XHQne3tpbmNsdWRlfX0gYmxvY2sgaGFzIHt7L2Zvcn19IHdpdGggbm8gb3BlbiB7e2Zvcn19J1xuXHRcdFx0c3ludGF4RXJyb3IoKFxuXHRcdFx0XHRibG9ja1xuXHRcdFx0XHRcdD8gJ3t7JyArIGJsb2NrICsgJ319IGJsb2NrIGhhcyB7ey8nICsgdGFnTmFtZSArICcgd2l0aG91dCB7eycgKyB0YWdOYW1lXG5cdFx0XHRcdFx0OiAnVW5tYXRjaGVkIG9yIG1pc3Npbmcge3svJyArIHRhZ05hbWUpICsgJywgaW4gdGVtcGxhdGU6XFxuJyArIG1hcmt1cCk7XG5cdFx0fVxuXHR9XG5cblx0ZnVuY3Rpb24gcGFyc2VUYWcoYWxsLCBiaW5kLCB0YWdOYW1lLCBjb252ZXJ0ZXIsIGNvbG9uLCBodG1sLCBjb2RlVGFnLCBwYXJhbXMsIHNsYXNoLCBiaW5kMiwgY2xvc2VCbG9jaywgaW5kZXgpIHtcbi8qXG5cbiAgICAgYmluZCAgICAgdGFnTmFtZSAgICAgICAgIGN2dCAgIGNsbiBodG1sIGNvZGUgICAgcGFyYW1zICAgICAgICAgICAgc2xhc2ggICBiaW5kMiAgICAgICAgIGNsb3NlQmxrICBjb21tZW50XG4vKD86eyhcXF4pP3soPzooXFx3Kyg/PVtcXC9cXHN9XSkpfChcXHcrKT8oOil8KD4pfChcXCopKVxccyooKD86W159XXx9KD8hfSkpKj8pKFxcLyk/fHsoXFxeKT97KD86KD86XFwvKFxcdyspKVxccyp8IS0tW1xcc1xcU10qPy0tKSl9fS9nXG5cbig/OlxuICB7KFxcXik/eyAgICAgICAgICAgIGJpbmRcbiAgKD86XG4gICAgKFxcdysgICAgICAgICAgICAgdGFnTmFtZVxuICAgICAgKD89W1xcL1xcc31dKVxuICAgIClcbiAgICB8XG4gICAgKFxcdyspPyg6KSAgICAgICAgY29udmVydGVyIGNvbG9uXG4gICAgfFxuICAgICg+KSAgICAgICAgICAgICAgaHRtbFxuICAgIHxcbiAgICAoXFwqKSAgICAgICAgICAgICBjb2RlVGFnXG4gIClcbiAgXFxzKlxuICAoICAgICAgICAgICAgICAgICAgcGFyYW1zXG4gICAgKD86W159XXx9KD8hfSkpKj9cbiAgKVxuICAoXFwvKT8gICAgICAgICAgICAgIHNsYXNoXG4gIHxcbiAgeyhcXF4pP3sgICAgICAgICAgICBiaW5kMlxuICAoPzpcbiAgICAoPzpcXC8oXFx3KykpXFxzKiAgIGNsb3NlQmxvY2tcbiAgICB8XG4gICAgIS0tW1xcc1xcU10qPy0tICAgIGNvbW1lbnRcbiAgKVxuKVxufX0vZ1xuXG4qL1xuXHRcdGlmIChjb2RlVGFnICYmIGJpbmQgfHwgc2xhc2ggJiYgIXRhZ05hbWUgfHwgcGFyYW1zICYmIHBhcmFtcy5zbGljZSgtMSkgPT09IFwiOlwiIHx8IGJpbmQyKSB7XG5cdFx0XHRzeW50YXhFcnJvcihhbGwpO1xuXHRcdH1cblxuXHRcdC8vIEJ1aWxkIGFic3RyYWN0IHN5bnRheCB0cmVlIChBU1QpOiBbdGFnTmFtZSwgY29udmVydGVyLCBwYXJhbXMsIGNvbnRlbnQsIGhhc2gsIGJpbmRpbmdzLCBjb250ZW50TWFya3VwXVxuXHRcdGlmIChodG1sKSB7XG5cdFx0XHRjb2xvbiA9IFwiOlwiO1xuXHRcdFx0Y29udmVydGVyID0gSFRNTDtcblx0XHR9XG5cdFx0c2xhc2ggPSBzbGFzaCB8fCBpc0xpbmtFeHByICYmICFoYXNFbHNlO1xuXG5cdFx0dmFyIGxhdGUsIG9wZW5UYWdOYW1lLCBpc0xhdGVPYixcblx0XHRcdHBhdGhCaW5kaW5ncyA9IChiaW5kIHx8IGlzTGlua0V4cHIpICYmIFtbXV0sIC8vIHBhdGhCaW5kaW5ncyBpcyBhbiBhcnJheSBvZiBhcnJheXMgZm9yIGFyZyBiaW5kaW5ncyBhbmQgYSBoYXNoIG9mIGFycmF5cyBmb3IgcHJvcCBiaW5kaW5nc1xuXHRcdFx0cHJvcHMgPSBcIlwiLFxuXHRcdFx0YXJncyA9IFwiXCIsXG5cdFx0XHRjdHhQcm9wcyA9IFwiXCIsXG5cdFx0XHRwYXJhbXNBcmdzID0gXCJcIixcblx0XHRcdHBhcmFtc1Byb3BzID0gXCJcIixcblx0XHRcdHBhcmFtc0N0eFByb3BzID0gXCJcIixcblx0XHRcdG9uRXJyb3IgPSBcIlwiLFxuXHRcdFx0dXNlVHJpZ2dlciA9IFwiXCIsXG5cdFx0XHQvLyBCbG9jayB0YWcgaWYgbm90IHNlbGYtY2xvc2luZyBhbmQgbm90IHt7On19IG9yIHt7Pn19IChzcGVjaWFsIGNhc2UpIGFuZCBub3QgYSBkYXRhLWxpbmsgZXhwcmVzc2lvblxuXHRcdFx0YmxvY2sgPSAhc2xhc2ggJiYgIWNvbG9uO1xuXG5cdFx0Ly89PT09IG5lc3RlZCBoZWxwZXIgZnVuY3Rpb24gPT09PVxuXHRcdHRhZ05hbWUgPSB0YWdOYW1lIHx8IChwYXJhbXMgPSBwYXJhbXMgfHwgXCIjZGF0YVwiLCBjb2xvbik7IC8vIHt7On19IGlzIGVxdWl2YWxlbnQgdG8ge3s6I2RhdGF9fVxuXHRcdHB1c2hwcmVjZWRpbmdDb250ZW50KGluZGV4KTtcblx0XHRsb2MgPSBpbmRleCArIGFsbC5sZW5ndGg7IC8vIGxvY2F0aW9uIG1hcmtlciAtIHBhcnNlZCB1cCB0byBoZXJlXG5cdFx0aWYgKGNvZGVUYWcpIHtcblx0XHRcdGlmIChhbGxvd0NvZGUpIHtcblx0XHRcdFx0Y29udGVudC5wdXNoKFtcIipcIiwgXCJcXG5cIiArIHBhcmFtcy5yZXBsYWNlKC9eOi8sIFwicmV0Kz0gXCIpLnJlcGxhY2UoclVuZXNjYXBlUXVvdGVzLCBcIiQxXCIpICsgXCI7XFxuXCJdKTtcblx0XHRcdH1cblx0XHR9IGVsc2UgaWYgKHRhZ05hbWUpIHtcblx0XHRcdGlmICh0YWdOYW1lID09PSBcImVsc2VcIikge1xuXHRcdFx0XHRpZiAoclRlc3RFbHNlSWYudGVzdChwYXJhbXMpKSB7XG5cdFx0XHRcdFx0c3ludGF4RXJyb3IoJ0ZvciBcInt7ZWxzZSBpZiBleHByfX1cIiB1c2UgXCJ7e2Vsc2UgZXhwcn19XCInKTtcblx0XHRcdFx0fVxuXHRcdFx0XHRwYXRoQmluZGluZ3MgPSBjdXJyZW50WzldICYmIFtbXV07XG5cdFx0XHRcdGN1cnJlbnRbMTBdID0gbWFya3VwLnN1YnN0cmluZyhjdXJyZW50WzEwXSwgaW5kZXgpOyAvLyBjb250ZW50TWFya3VwIGZvciBibG9jayB0YWdcblx0XHRcdFx0b3BlblRhZ05hbWUgPSBjdXJyZW50WzExXSB8fCBjdXJyZW50WzBdIHx8IHN5bnRheEVycm9yKFwiTWlzbWF0Y2hlZDogXCIgKyBhbGwpO1xuXHRcdFx0XHQvLyBjdXJyZW50WzBdIGlzIHRhZ05hbWUsIGJ1dCBmb3Ige3tlbHNlfX0gbm9kZXMsIGN1cnJlbnRbMTFdIGlzIHRhZ05hbWUgb2YgcHJlY2VkaW5nIG9wZW4gdGFnXG5cdFx0XHRcdGN1cnJlbnQgPSBzdGFjay5wb3AoKTtcblx0XHRcdFx0Y29udGVudCA9IGN1cnJlbnRbMl07XG5cdFx0XHRcdGJsb2NrID0gdHJ1ZTtcblx0XHRcdH1cblx0XHRcdGlmIChwYXJhbXMpIHtcblx0XHRcdFx0Ly8gcmVtb3ZlIG5ld2xpbmVzIGZyb20gdGhlIHBhcmFtcyBzdHJpbmcsIHRvIGF2b2lkIGNvbXBpbGVkIGNvZGUgZXJyb3JzIGZvciB1bnRlcm1pbmF0ZWQgc3RyaW5nc1xuXHRcdFx0XHRwYXJzZVBhcmFtcyhwYXJhbXMucmVwbGFjZShyTmV3TGluZSwgXCIgXCIpLCBwYXRoQmluZGluZ3MsIHRtcGwsIGlzTGlua0V4cHIpXG5cdFx0XHRcdFx0LnJlcGxhY2UockJ1aWxkSGFzaCwgZnVuY3Rpb24oYWxsLCBvbmVycm9yLCBpc0N0eFBybSwga2V5LCBrZXlUb2tlbiwga2V5VmFsdWUsIGFyZywgcGFyYW0pIHtcblx0XHRcdFx0XHRcdGlmIChrZXkgPT09IFwidGhpczpcIikge1xuXHRcdFx0XHRcdFx0XHRrZXlWYWx1ZSA9IFwidW5kZWZpbmVkXCI7IC8vIHRoaXM9c29tZS5wYXRoIGlzIGFsd2F5cyBhIHRvIHBhcmFtZXRlciAob25lLXdheSksIHNvIGRvbid0IG5lZWQgdG8gY29tcGlsZS9ldmFsdWF0ZSBzb21lLnBhdGggaW5pdGlhbGl6YXRpb25cblx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHRcdGlmIChwYXJhbSkge1xuXHRcdFx0XHRcdFx0XHRpc0xhdGVPYiA9IGlzTGF0ZU9iIHx8IHBhcmFtWzBdID09PSBcIkBcIjtcblx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHRcdGtleSA9IFwiJ1wiICsga2V5VG9rZW4gKyBcIic6XCI7XG5cdFx0XHRcdFx0XHRpZiAoYXJnKSB7XG5cdFx0XHRcdFx0XHRcdGFyZ3MgKz0gaXNDdHhQcm0gKyBrZXlWYWx1ZSArIFwiLFwiO1xuXHRcdFx0XHRcdFx0XHRwYXJhbXNBcmdzICs9IFwiJ1wiICsgcGFyYW0gKyBcIicsXCI7XG5cdFx0XHRcdFx0XHR9IGVsc2UgaWYgKGlzQ3R4UHJtKSB7IC8vIENvbnRleHR1YWwgcGFyYW1ldGVyLCB+Zm9vPWV4cHJcblx0XHRcdFx0XHRcdFx0Y3R4UHJvcHMgKz0ga2V5ICsgJ2ouX2NwKCcgKyBrZXlWYWx1ZSArICcsXCInICsgcGFyYW0gKyAnXCIsdmlldyksJztcblx0XHRcdFx0XHRcdFx0Ly8gQ29tcGlsZWQgY29kZSBmb3IgZXZhbHVhdGluZyB0YWdDdHggb24gYSB0YWcgd2lsbCBoYXZlOiBjdHg6eydmb28nOmouX2NwKGNvbXBpbGVkRXhwciwgXCJleHByXCIsIHZpZXcpfVxuXHRcdFx0XHRcdFx0XHRwYXJhbXNDdHhQcm9wcyArPSBrZXkgKyBcIidcIiArIHBhcmFtICsgXCInLFwiO1xuXHRcdFx0XHRcdFx0fSBlbHNlIGlmIChvbmVycm9yKSB7XG5cdFx0XHRcdFx0XHRcdG9uRXJyb3IgKz0ga2V5VmFsdWU7XG5cdFx0XHRcdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRcdFx0XHRpZiAoa2V5VG9rZW4gPT09IFwidHJpZ2dlclwiKSB7XG5cdFx0XHRcdFx0XHRcdFx0dXNlVHJpZ2dlciArPSBrZXlWYWx1ZTtcblx0XHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdFx0XHRpZiAoa2V5VG9rZW4gPT09IFwibGF0ZVJlbmRlclwiKSB7XG5cdFx0XHRcdFx0XHRcdFx0bGF0ZSA9IHBhcmFtICE9PSBcImZhbHNlXCI7IC8vIFJlbmRlciBhZnRlciBmaXJzdCBwYXNzXG5cdFx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHRcdFx0cHJvcHMgKz0ga2V5ICsga2V5VmFsdWUgKyBcIixcIjtcblx0XHRcdFx0XHRcdFx0cGFyYW1zUHJvcHMgKz0ga2V5ICsgXCInXCIgKyBwYXJhbSArIFwiJyxcIjtcblx0XHRcdFx0XHRcdFx0aGFzSGFuZGxlcnMgPSBoYXNIYW5kbGVycyB8fCBySGFzSGFuZGxlcnMudGVzdChrZXlUb2tlbik7XG5cdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0XHRyZXR1cm4gXCJcIjtcblx0XHRcdFx0XHR9KS5zbGljZSgwLCAtMSk7XG5cdFx0XHR9XG5cblx0XHRcdGlmIChwYXRoQmluZGluZ3MgJiYgcGF0aEJpbmRpbmdzWzBdKSB7XG5cdFx0XHRcdHBhdGhCaW5kaW5ncy5wb3AoKTsgLy8gUmVtb3ZlIHRoZSBiaW5kaW5nIHRoYXQgd2FzIHByZXBhcmVkIGZvciBuZXh0IGFyZy4gKFRoZXJlIGlzIGFsd2F5cyBhbiBleHRyYSBvbmUgcmVhZHkpLlxuXHRcdFx0fVxuXG5cdFx0XHRuZXdOb2RlID0gW1xuXHRcdFx0XHRcdHRhZ05hbWUsXG5cdFx0XHRcdFx0Y29udmVydGVyIHx8ICEhY29udmVydEJhY2sgfHwgaGFzSGFuZGxlcnMgfHwgXCJcIixcblx0XHRcdFx0XHRibG9jayAmJiBbXSxcblx0XHRcdFx0XHRwYXJzZWRQYXJhbShwYXJhbXNBcmdzIHx8ICh0YWdOYW1lID09PSBcIjpcIiA/IFwiJyNkYXRhJyxcIiA6IFwiXCIpLCBwYXJhbXNQcm9wcywgcGFyYW1zQ3R4UHJvcHMpLCAvLyB7ezp9fSBlcXVpdmFsZW50IHRvIHt7OiNkYXRhfX1cblx0XHRcdFx0XHRwYXJzZWRQYXJhbShhcmdzIHx8ICh0YWdOYW1lID09PSBcIjpcIiA/IFwiZGF0YSxcIiA6IFwiXCIpLCBwcm9wcywgY3R4UHJvcHMpLFxuXHRcdFx0XHRcdG9uRXJyb3IsXG5cdFx0XHRcdFx0dXNlVHJpZ2dlcixcblx0XHRcdFx0XHRsYXRlLFxuXHRcdFx0XHRcdGlzTGF0ZU9iLFxuXHRcdFx0XHRcdHBhdGhCaW5kaW5ncyB8fCAwXG5cdFx0XHRcdF07XG5cdFx0XHRjb250ZW50LnB1c2gobmV3Tm9kZSk7XG5cdFx0XHRpZiAoYmxvY2spIHtcblx0XHRcdFx0c3RhY2sucHVzaChjdXJyZW50KTtcblx0XHRcdFx0Y3VycmVudCA9IG5ld05vZGU7XG5cdFx0XHRcdGN1cnJlbnRbMTBdID0gbG9jOyAvLyBTdG9yZSBjdXJyZW50IGxvY2F0aW9uIG9mIG9wZW4gdGFnLCB0byBiZSBhYmxlIHRvIGFkZCBjb250ZW50TWFya3VwIHdoZW4gd2UgcmVhY2ggY2xvc2luZyB0YWdcblx0XHRcdFx0Y3VycmVudFsxMV0gPSBvcGVuVGFnTmFtZTsgLy8gVXNlZCBmb3IgY2hlY2tpbmcgc3ludGF4IChtYXRjaGluZyBjbG9zZSB0YWcpXG5cdFx0XHR9XG5cdFx0fSBlbHNlIGlmIChjbG9zZUJsb2NrKSB7XG5cdFx0XHRibG9ja1RhZ0NoZWNrKGNsb3NlQmxvY2sgIT09IGN1cnJlbnRbMF0gJiYgY2xvc2VCbG9jayAhPT0gY3VycmVudFsxMV0gJiYgY2xvc2VCbG9jaywgY3VycmVudFswXSk7IC8vIENoZWNrIG1hdGNoaW5nIGNsb3NlIHRhZyBuYW1lXG5cdFx0XHRjdXJyZW50WzEwXSA9IG1hcmt1cC5zdWJzdHJpbmcoY3VycmVudFsxMF0sIGluZGV4KTsgLy8gY29udGVudE1hcmt1cCBmb3IgYmxvY2sgdGFnXG5cdFx0XHRjdXJyZW50ID0gc3RhY2sucG9wKCk7XG5cdFx0fVxuXHRcdGJsb2NrVGFnQ2hlY2soIWN1cnJlbnQgJiYgY2xvc2VCbG9jayk7XG5cdFx0Y29udGVudCA9IGN1cnJlbnRbMl07XG5cdH1cblx0Ly89PT09IC9lbmQgb2YgbmVzdGVkIGZ1bmN0aW9ucyA9PT09XG5cblx0dmFyIGksIHJlc3VsdCwgbmV3Tm9kZSwgaGFzSGFuZGxlcnMsIGJpbmRpbmdzLFxuXHRcdGFsbG93Q29kZSA9ICRzdWJTZXR0aW5ncy5hbGxvd0NvZGUgfHwgdG1wbCAmJiB0bXBsLmFsbG93Q29kZVxuXHRcdFx0fHwgJHZpZXdzU2V0dGluZ3MuYWxsb3dDb2RlID09PSB0cnVlLCAvLyBpbmNsdWRlIGRpcmVjdCBzZXR0aW5nIG9mIHNldHRpbmdzLmFsbG93Q29kZSB0cnVlIGZvciBiYWNrd2FyZCBjb21wYXQgb25seVxuXHRcdGFzdFRvcCA9IFtdLFxuXHRcdGxvYyA9IDAsXG5cdFx0c3RhY2sgPSBbXSxcblx0XHRjb250ZW50ID0gYXN0VG9wLFxuXHRcdGN1cnJlbnQgPSBbLCxhc3RUb3BdO1xuXG5cdGlmIChhbGxvd0NvZGUgJiYgdG1wbC5faXMpIHtcblx0XHR0bXBsLmFsbG93Q29kZSA9IGFsbG93Q29kZTtcblx0fVxuXG4vL1RPRE9cdHJlc3VsdCA9IHRtcGxGbnNDYWNoZVttYXJrdXBdOyAvLyBPbmx5IGNhY2hlIGlmIHRlbXBsYXRlIGlzIG5vdCBuYW1lZCBhbmQgbWFya3VwIGxlbmd0aCA8IC4uLixcbi8vYW5kIHRoZXJlIGFyZSBubyBiaW5kaW5ncyBvciBzdWJ0ZW1wbGF0ZXM/PyBDb25zaWRlciBzdGFuZGFyZCBvcHRpbWl6YXRpb24gZm9yIGRhdGEtbGluaz1cImEuYi5jXCJcbi8vXHRcdGlmIChyZXN1bHQpIHtcbi8vXHRcdFx0dG1wbC5mbiA9IHJlc3VsdDtcbi8vXHRcdH0gZWxzZSB7XG5cbi8vXHRcdHJlc3VsdCA9IG1hcmt1cDtcblx0aWYgKGlzTGlua0V4cHIpIHtcblx0XHRpZiAoY29udmVydEJhY2sgIT09IHVuZGVmaW5lZCkge1xuXHRcdFx0bWFya3VwID0gbWFya3VwLnNsaWNlKDAsIC1jb252ZXJ0QmFjay5sZW5ndGggLSAyKSArIGRlbGltQ2xvc2VDaGFyMDtcblx0XHR9XG5cdFx0bWFya3VwID0gZGVsaW1PcGVuQ2hhcjAgKyBtYXJrdXAgKyBkZWxpbUNsb3NlQ2hhcjE7XG5cdH1cblxuXHRibG9ja1RhZ0NoZWNrKHN0YWNrWzBdICYmIHN0YWNrWzBdWzJdLnBvcCgpWzBdKTtcblx0Ly8gQnVpbGQgdGhlIEFTVCAoYWJzdHJhY3Qgc3ludGF4IHRyZWUpIHVuZGVyIGFzdFRvcFxuXHRtYXJrdXAucmVwbGFjZShyVGFnLCBwYXJzZVRhZyk7XG5cblx0cHVzaHByZWNlZGluZ0NvbnRlbnQobWFya3VwLmxlbmd0aCk7XG5cblx0aWYgKGxvYyA9IGFzdFRvcFthc3RUb3AubGVuZ3RoIC0gMV0pIHtcblx0XHRibG9ja1RhZ0NoZWNrKFwiXCIgKyBsb2MgIT09IGxvYyAmJiAoK2xvY1sxMF0gPT09IGxvY1sxMF0pICYmIGxvY1swXSk7XG5cdH1cbi8vXHRcdFx0cmVzdWx0ID0gdG1wbEZuc0NhY2hlW21hcmt1cF0gPSBidWlsZENvZGUoYXN0VG9wLCB0bXBsKTtcbi8vXHRcdH1cblxuXHRpZiAoaXNMaW5rRXhwcikge1xuXHRcdHJlc3VsdCA9IGJ1aWxkQ29kZShhc3RUb3AsIG1hcmt1cCwgaXNMaW5rRXhwcik7XG5cdFx0YmluZGluZ3MgPSBbXTtcblx0XHRpID0gYXN0VG9wLmxlbmd0aDtcblx0XHR3aGlsZSAoaS0tKSB7XG5cdFx0XHRiaW5kaW5ncy51bnNoaWZ0KGFzdFRvcFtpXVs5XSk7IC8vIFdpdGggZGF0YS1saW5rIGV4cHJlc3Npb25zLCBwYXRoQmluZGluZ3MgYXJyYXkgZm9yIHRhZ0N0eFtpXSBpcyBhc3RUb3BbaV1bOV1cblx0XHR9XG5cdFx0c2V0UGF0aHMocmVzdWx0LCBiaW5kaW5ncyk7XG5cdH0gZWxzZSB7XG5cdFx0cmVzdWx0ID0gYnVpbGRDb2RlKGFzdFRvcCwgdG1wbCk7XG5cdH1cblx0cmV0dXJuIHJlc3VsdDtcbn1cblxuZnVuY3Rpb24gc2V0UGF0aHMoZm4sIHBhdGhzQXJyKSB7XG5cdHZhciBrZXksIHBhdGhzLFxuXHRcdGkgPSAwLFxuXHRcdGwgPSBwYXRoc0Fyci5sZW5ndGg7XG5cdGZuLmRlcHMgPSBbXTtcblx0Zm4ucGF0aHMgPSBbXTsgLy8gVGhlIGFycmF5IG9mIHBhdGggYmluZGluZyAoYXJyYXkvZGljdGlvbmFyeSlzIGZvciBlYWNoIHRhZy9lbHNlIGJsb2NrJ3MgYXJncyBhbmQgcHJvcHNcblx0Zm9yICg7IGkgPCBsOyBpKyspIHtcblx0XHRmbi5wYXRocy5wdXNoKHBhdGhzID0gcGF0aHNBcnJbaV0pO1xuXHRcdGZvciAoa2V5IGluIHBhdGhzKSB7XG5cdFx0XHRpZiAoa2V5ICE9PSBcIl9qc3Z0b1wiICYmIHBhdGhzLmhhc093blByb3BlcnR5KGtleSkgJiYgcGF0aHNba2V5XS5sZW5ndGggJiYgIXBhdGhzW2tleV0uc2twKSB7XG5cdFx0XHRcdGZuLmRlcHMgPSBmbi5kZXBzLmNvbmNhdChwYXRoc1trZXldKTsgLy8gZGVwcyBpcyB0aGUgY29uY2F0ZW5hdGlvbiBvZiB0aGUgcGF0aHMgYXJyYXlzIGZvciB0aGUgZGlmZmVyZW50IGJpbmRpbmdzXG5cdFx0XHR9XG5cdFx0fVxuXHR9XG59XG5cbmZ1bmN0aW9uIHBhcnNlZFBhcmFtKGFyZ3MsIHByb3BzLCBjdHgpIHtcblx0cmV0dXJuIFthcmdzLnNsaWNlKDAsIC0xKSwgcHJvcHMuc2xpY2UoMCwgLTEpLCBjdHguc2xpY2UoMCwgLTEpXTtcbn1cblxuZnVuY3Rpb24gcGFyYW1TdHJ1Y3R1cmUocGFydHMsIHR5cGUpIHtcblx0cmV0dXJuICdcXG5cXHQnXG5cdFx0KyAodHlwZVxuXHRcdFx0PyB0eXBlICsgJzp7J1xuXHRcdFx0OiAnJylcblx0XHQrICdhcmdzOlsnICsgcGFydHNbMF0gKyAnXSxcXG5cXHRwcm9wczp7JyArIHBhcnRzWzFdICsgJ30nXG5cdFx0KyAocGFydHNbMl0gPyAnLFxcblxcdGN0eDp7JyArIHBhcnRzWzJdICsgJ30nIDogXCJcIik7XG59XG5cbmZ1bmN0aW9uIHBhcnNlUGFyYW1zKHBhcmFtcywgcGF0aEJpbmRpbmdzLCB0bXBsLCBpc0xpbmtFeHByKSB7XG5cblx0ZnVuY3Rpb24gcGFyc2VUb2tlbnMoYWxsLCBsZnRQcm4wLCBsZnRQcm4sIGJvdW5kLCBwYXRoLCBvcGVyYXRvciwgZXJyLCBlcSwgcGF0aDIsIGxhdGUsIHBybiwgY29tbWEsIGxmdFBybjIsIGFwb3MsIHF1b3QsIHJ0UHJuLCBydFBybkRvdCwgcHJuMiwgc3BhY2UsIGluZGV4LCBmdWxsKSB7XG5cdC8vIC8oXFwoKSg/PVxccypcXCgpfCg/OihbKFtdKVxccyopPyg/OihcXF4/KSh+P1tcXHckLl5dKyk/XFxzKigoXFwrXFwrfC0tKXxcXCt8LXx+KD8hW1xcdyRdKXwmJnxcXHxcXHx8PT09fCE9PXw9PXwhPXw8PXw+PXxbPD4lKjo/XFwvXXwoPSkpXFxzKnwoISo/KEApP1sjfl0/W1xcdyQuXl0rKShbKFtdKT8pfCgsXFxzKil8KFxcKD8pXFxcXD8oPzooJyl8KFwiKSl8KD86XFxzKigoWylcXF1dKSg/PVsuXl18XFxzKiR8W14oW10pfFspXFxdXSkoWyhbXT8pKXwoXFxzKykvZyxcblx0Ly9sZnRQcm4wICAgICAgICAgICBsZnRQcm4gICAgICAgICBib3VuZCAgICAgcGF0aCAgICAgICAgICAgICAgIG9wZXJhdG9yICAgICBlcnIgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBlcSAgICAgIHBhdGgyIGxhdGUgICAgICAgICAgICBwcm4gICAgICBjb21tYSAgbGZ0UHJuMiAgIGFwb3MgcXVvdCAgICAgICAgcnRQcm4gIHJ0UHJuRG90ICAgICAgICAgICAgICAgICAgcHJuMiAgICAgc3BhY2Vcblx0Ly8gKGxlZnQgcGFyZW4/IGZvbGxvd2VkIGJ5IChwYXRoPyBmb2xsb3dlZCBieSBvcGVyYXRvcikgb3IgKHBhdGggZm9sbG93ZWQgYnkgcGFyZW4/KSkgb3IgY29tbWEgb3IgYXBvcyBvciBxdW90IG9yIHJpZ2h0IHBhcmVuIG9yIHNwYWNlXG5cblx0XHRmdW5jdGlvbiBwYXJzZVBhdGgoYWxsUGF0aCwgbm90LCBvYmplY3QsIGhlbHBlciwgdmlldywgdmlld1Byb3BlcnR5LCBwYXRoVG9rZW5zLCBsZWFmVG9rZW4pIHtcblx0XHRcdC8vIC9eKCEqPykoPzpudWxsfHRydWV8ZmFsc2V8XFxkW1xcZC5dKnwoW1xcdyRdK3xcXC58fihbXFx3JF0rKXwjKHZpZXd8KFtcXHckXSspKT8pKFtcXHckLl5dKj8pKD86Wy5bXl0oW1xcdyRdKylcXF0/KT8pJC9nLFxuXHRcdFx0Ly8gICAgbm90ICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIG9iamVjdCAgICAgaGVscGVyICAgIHZpZXcgIHZpZXdQcm9wZXJ0eSBwYXRoVG9rZW5zICAgICAgbGVhZlRva2VuXG5cdFx0XHR2YXIgc3ViUGF0aCA9IG9iamVjdCA9PT0gXCIuXCI7XG5cdFx0XHRpZiAob2JqZWN0KSB7XG5cdFx0XHRcdHBhdGggPSBwYXRoLnNsaWNlKG5vdC5sZW5ndGgpO1xuXHRcdFx0XHRpZiAoL15cXC4/Y29uc3RydWN0b3IkLy50ZXN0KGxlYWZUb2tlbnx8cGF0aCkpIHtcblx0XHRcdFx0XHRzeW50YXhFcnJvcihhbGxQYXRoKTtcblx0XHRcdFx0fVxuXHRcdFx0XHRpZiAoIXN1YlBhdGgpIHtcblx0XHRcdFx0XHRhbGxQYXRoID0gKGxhdGUgLy8gbGF0ZSBwYXRoIEBhLmIuYzogbm90IHRocm93IG9uICdwcm9wZXJ0eSBvZiB1bmRlZmluZWQnIGlmIGEgdW5kZWZpbmVkLCBhbmQgd2lsbCB1c2UgX2dldE9iKCkgYWZ0ZXIgbGlua2luZyB0byByZXNvbHZlIGxhdGUuXG5cdFx0XHRcdFx0XHRcdD8gKGlzTGlua0V4cHIgPyAnJyA6ICcobHRPYi5sdD1sdE9iLmx0fHwnKSArICcob2I9J1xuXHRcdFx0XHRcdFx0XHQ6IFwiXCJcblx0XHRcdFx0XHRcdClcblx0XHRcdFx0XHRcdCsgKGhlbHBlclxuXHRcdFx0XHRcdFx0XHQ/ICd2aWV3LmN0eFBybShcIicgKyBoZWxwZXIgKyAnXCIpJ1xuXHRcdFx0XHRcdFx0XHQ6IHZpZXdcblx0XHRcdFx0XHRcdFx0XHQ/IFwidmlld1wiXG5cdFx0XHRcdFx0XHRcdFx0OiBcImRhdGFcIilcblx0XHRcdFx0XHRcdCsgKGxhdGVcblx0XHRcdFx0XHRcdFx0PyAnKT09PXVuZGVmaW5lZCcgKyAoaXNMaW5rRXhwciA/ICcnIDogJyknKSArICc/XCJcIjp2aWV3Ll9nZXRPYihvYixcIidcblx0XHRcdFx0XHRcdFx0OiBcIlwiXG5cdFx0XHRcdFx0XHQpXG5cdFx0XHRcdFx0XHQrIChsZWFmVG9rZW5cblx0XHRcdFx0XHRcdFx0PyAodmlld1Byb3BlcnR5XG5cdFx0XHRcdFx0XHRcdFx0PyBcIi5cIiArIHZpZXdQcm9wZXJ0eVxuXHRcdFx0XHRcdFx0XHRcdDogaGVscGVyXG5cdFx0XHRcdFx0XHRcdFx0XHQ/IFwiXCJcblx0XHRcdFx0XHRcdFx0XHRcdDogKHZpZXcgPyBcIlwiIDogXCIuXCIgKyBvYmplY3QpXG5cdFx0XHRcdFx0XHRcdFx0KSArIChwYXRoVG9rZW5zIHx8IFwiXCIpXG5cdFx0XHRcdFx0XHRcdDogKGxlYWZUb2tlbiA9IGhlbHBlciA/IFwiXCIgOiB2aWV3ID8gdmlld1Byb3BlcnR5IHx8IFwiXCIgOiBvYmplY3QsIFwiXCIpKTtcblx0XHRcdFx0XHRhbGxQYXRoID0gYWxsUGF0aCArIChsZWFmVG9rZW4gPyBcIi5cIiArIGxlYWZUb2tlbiA6IFwiXCIpO1xuXG5cdFx0XHRcdFx0YWxsUGF0aCA9IG5vdCArIChhbGxQYXRoLnNsaWNlKDAsIDkpID09PSBcInZpZXcuZGF0YVwiXG5cdFx0XHRcdFx0XHQ/IGFsbFBhdGguc2xpY2UoNSkgLy8gY29udmVydCAjdmlldy5kYXRhLi4uIHRvIGRhdGEuLi5cblx0XHRcdFx0XHRcdDogYWxsUGF0aClcblx0XHRcdFx0XHQrIChsYXRlXG5cdFx0XHRcdFx0XHRcdD8gKGlzTGlua0V4cHIgPyAnXCInOiAnXCIsbHRPYicpICsgKHBybiA/ICcsMSknOicpJylcblx0XHRcdFx0XHRcdFx0OiBcIlwiXG5cdFx0XHRcdFx0XHQpO1xuXHRcdFx0XHR9XG5cdFx0XHRcdGlmIChiaW5kaW5ncykge1xuXHRcdFx0XHRcdGJpbmRzID0gbmFtZWQgPT09IFwiX2xpbmtUb1wiID8gKGJpbmR0byA9IHBhdGhCaW5kaW5ncy5fanN2dG8gPSBwYXRoQmluZGluZ3MuX2pzdnRvIHx8IFtdKSA6IGJuZEN0eC5iZDtcblx0XHRcdFx0XHRpZiAodGhlT2IgPSBzdWJQYXRoICYmIGJpbmRzW2JpbmRzLmxlbmd0aC0xXSkge1xuXHRcdFx0XHRcdFx0aWYgKHRoZU9iLl9jcGZuKSB7IC8vIENvbXB1dGVkIHByb3BlcnR5IGV4cHJPYlxuXHRcdFx0XHRcdFx0XHR3aGlsZSAodGhlT2Iuc2IpIHtcblx0XHRcdFx0XHRcdFx0XHR0aGVPYiA9IHRoZU9iLnNiO1xuXHRcdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0XHRcdGlmICh0aGVPYi5ibmQpIHtcblx0XHRcdFx0XHRcdFx0XHRwYXRoID0gXCJeXCIgKyBwYXRoLnNsaWNlKDEpO1xuXHRcdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0XHRcdHRoZU9iLnNiID0gcGF0aDtcblx0XHRcdFx0XHRcdFx0dGhlT2IuYm5kID0gdGhlT2IuYm5kIHx8IHBhdGhbMF0gPT09IFwiXlwiO1xuXHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdFx0XHRiaW5kcy5wdXNoKHBhdGgpO1xuXHRcdFx0XHRcdH1cblx0XHRcdFx0XHRwYXRoU3RhcnRbcGFyZW5EZXB0aF0gPSBpbmRleCArIChzdWJQYXRoID8gMSA6IDApO1xuXHRcdFx0XHR9XG5cdFx0XHR9XG5cdFx0XHRyZXR1cm4gYWxsUGF0aDtcblx0XHR9XG5cblx0XHQvL2JvdW5kID0gYmluZGluZ3MgJiYgYm91bmQ7XG5cdFx0aWYgKGJvdW5kICYmICFlcSkge1xuXHRcdFx0cGF0aCA9IGJvdW5kICsgcGF0aDsgLy8gZS5nLiBzb21lLmZuKC4uLilec29tZS5wYXRoIC0gc28gaGVyZSBwYXRoIGlzIFwiXnNvbWUucGF0aFwiXG5cdFx0fVxuXHRcdG9wZXJhdG9yID0gb3BlcmF0b3IgfHwgXCJcIjtcblx0XHRsZnRQcm4gPSBsZnRQcm4gfHwgbGZ0UHJuMCB8fCBsZnRQcm4yO1xuXHRcdHBhdGggPSBwYXRoIHx8IHBhdGgyO1xuXG5cdFx0aWYgKGxhdGUgJiYgKGxhdGUgPSAhL1xcKXxdLy50ZXN0KGZ1bGxbaW5kZXgtMV0pKSkge1xuXHRcdFx0cGF0aCA9IHBhdGguc2xpY2UoMSkuc3BsaXQoXCIuXCIpLmpvaW4oXCJeXCIpOyAvLyBMYXRlIHBhdGggQHouYi5jLiBVc2UgXCJeXCIgcmF0aGVyIHRoYW4gXCIuXCIgdG8gZW5zdXJlIHRoYXQgZGVlcCBiaW5kaW5nIHdpbGwgYmUgdXNlZFxuXHRcdH1cblx0XHQvLyBDb3VsZCBkbyB0aGlzIC0gYnV0IG5vdCB3b3J0aCBwZXJmIGNvc3Q/PyA6LVxuXHRcdC8vIGlmICghcGF0aC5sYXN0SW5kZXhPZihcIiNkYXRhLlwiLCAwKSkgeyBwYXRoID0gcGF0aC5zbGljZSg2KTsgfSAvLyBJZiBwYXRoIHN0YXJ0cyB3aXRoIFwiI2RhdGEuXCIsIHJlbW92ZSB0aGF0LlxuXHRcdHBybiA9IHBybiB8fCBwcm4yIHx8IFwiXCI7XG5cblx0XHR2YXIgZXhwciwgZXhwckZuLCBiaW5kcywgdGhlT2IsIG5ld09iLFxuXHRcdFx0cnRTcSA9IFwiKVwiO1xuXG5cdFx0aWYgKHBybiA9PT0gXCJbXCIpIHtcblx0XHRcdHBybiA9IFwiW2ouX3NxKFwiO1xuXHRcdFx0cnRTcSA9IFwiKV1cIjtcblx0XHR9XG5cblx0XHRpZiAoZXJyICYmICFhcG9zZWQgJiYgIXF1b3RlZCkge1xuXHRcdFx0c3ludGF4RXJyb3IocGFyYW1zKTtcblx0XHR9IGVsc2Uge1xuXHRcdFx0aWYgKGJpbmRpbmdzICYmIHJ0UHJuRG90ICYmICFhcG9zZWQgJiYgIXF1b3RlZCkge1xuXHRcdFx0XHQvLyBUaGlzIGlzIGEgYmluZGluZyB0byBhIHBhdGggaW4gd2hpY2ggYW4gb2JqZWN0IGlzIHJldHVybmVkIGJ5IGEgaGVscGVyL2RhdGEgZnVuY3Rpb24vZXhwcmVzc2lvbiwgZS5nLiBmb28oKV54Lnkgb3IgKGE/YjpjKV54Lnlcblx0XHRcdFx0Ly8gV2UgY3JlYXRlIGEgY29tcGlsZWQgZnVuY3Rpb24gdG8gZ2V0IHRoZSBvYmplY3QgaW5zdGFuY2UgKHdoaWNoIHdpbGwgYmUgY2FsbGVkIHdoZW4gdGhlIGRlcGVuZGVudCBkYXRhIG9mIHRoZSBzdWJleHByZXNzaW9uIGNoYW5nZXMsIHRvIHJldHVybiB0aGUgbmV3IG9iamVjdCwgYW5kIHRyaWdnZXIgcmUtYmluZGluZyBvZiB0aGUgc3Vic2VxdWVudCBwYXRoKVxuXHRcdFx0XHRpZiAocGFyZW5EZXB0aCkge1xuXHRcdFx0XHRcdGV4cHIgPSBwYXRoU3RhcnRbcGFyZW5EZXB0aCAtIDFdO1xuXHRcdFx0XHRcdGlmIChmdWxsLmxlbmd0aCAtIDEgPiBpbmRleCAtIChleHByIHx8IDApKSB7IC8vIFdlIG5lZWQgdG8gY29tcGlsZSBhIHN1YmV4cHJlc3Npb25cblx0XHRcdFx0XHRcdGV4cHIgPSBmdWxsLnNsaWNlKGV4cHIsIGluZGV4ICsgYWxsLmxlbmd0aCk7XG5cdFx0XHRcdFx0XHRpZiAoZXhwckZuICE9PSB0cnVlKSB7IC8vIElmIG5vdCByZWVudHJhbnQgY2FsbCBkdXJpbmcgY29tcGlsYXRpb25cblx0XHRcdFx0XHRcdFx0YmluZHMgPSBiaW5kdG8gfHwgYm5kU3RhY2tbcGFyZW5EZXB0aC0xXS5iZDtcblx0XHRcdFx0XHRcdFx0Ly8gSW5zZXJ0IGV4cHJPYiBvYmplY3QsIHRvIGJlIHVzZWQgZHVyaW5nIGJpbmRpbmcgdG8gcmV0dXJuIHRoZSBjb21wdXRlZCBvYmplY3Rcblx0XHRcdFx0XHRcdFx0dGhlT2IgPSBiaW5kc1tiaW5kcy5sZW5ndGgtMV07XG5cdFx0XHRcdFx0XHRcdGlmICh0aGVPYiAmJiB0aGVPYi5wcm0pIHtcblx0XHRcdFx0XHRcdFx0XHR3aGlsZSAodGhlT2Iuc2IgJiYgdGhlT2Iuc2IucHJtKSB7XG5cdFx0XHRcdFx0XHRcdFx0XHR0aGVPYiA9IHRoZU9iLnNiO1xuXHRcdFx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHRcdFx0XHRuZXdPYiA9IHRoZU9iLnNiID0ge3BhdGg6IHRoZU9iLnNiLCBibmQ6IHRoZU9iLmJuZH07XG5cdFx0XHRcdFx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdFx0XHRcdFx0YmluZHMucHVzaChuZXdPYiA9IHtwYXRoOiBiaW5kcy5wb3AoKX0pOyAvLyBJbnNlcnQgZXhwck9iIG9iamVjdCwgdG8gYmUgdXNlZCBkdXJpbmcgYmluZGluZyB0byByZXR1cm4gdGhlIGNvbXB1dGVkIG9iamVjdFxuXHRcdFx0XHRcdFx0XHR9XHRcdFx0XHRcdFx0XHRcdFx0XHRcdCAvLyAoZS5nLiBcInNvbWUub2JqZWN0KClcIiBpbiBcInNvbWUub2JqZWN0KCkuYS5iXCIgLSB0byBiZSB1c2VkIGFzIGNvbnRleHQgZm9yIGJpbmRpbmcgdGhlIGZvbGxvd2luZyB0b2tlbnMgXCJhLmJcIilcblx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHRcdHJ0UHJuRG90ID0gZGVsaW1PcGVuQ2hhcjEgKyBcIjpcIiArIGV4cHIgLy8gVGhlIHBhcmFtZXRlciBvciBmdW5jdGlvbiBzdWJleHByZXNzaW9uXG5cdFx0XHRcdFx0XHRcdCsgXCIgb25lcnJvcj0nJ1wiIC8vIHNldCBvbmVycm9yPScnIGluIG9yZGVyIHRvIHdyYXAgZ2VuZXJhdGVkIGNvZGUgd2l0aCBhIHRyeSBjYXRjaCAtIHJldHVybmluZyAnJyBhcyBvYmplY3QgaW5zdGFuY2UgaWYgdGhlcmUgaXMgYW4gZXJyb3IvbWlzc2luZyBwYXJlbnRcblx0XHRcdFx0XHRcdFx0KyBkZWxpbUNsb3NlQ2hhcjA7XG5cdFx0XHRcdFx0XHRleHByRm4gPSB0bXBsTGlua3NbcnRQcm5Eb3RdO1xuXHRcdFx0XHRcdFx0aWYgKCFleHByRm4pIHtcblx0XHRcdFx0XHRcdFx0dG1wbExpbmtzW3J0UHJuRG90XSA9IHRydWU7IC8vIEZsYWcgdGhhdCB0aGlzIGV4cHJGbiAoZm9yIHJ0UHJuRG90KSBpcyBiZWluZyBjb21waWxlZFxuXHRcdFx0XHRcdFx0XHR0bXBsTGlua3NbcnRQcm5Eb3RdID0gZXhwckZuID0gdG1wbEZuKHJ0UHJuRG90LCB0bXBsLCB0cnVlKTsgLy8gQ29tcGlsZSB0aGUgZXhwcmVzc2lvbiAob3IgdXNlIGNhY2hlZCBjb3B5IGFscmVhZHkgaW4gdG1wbC5saW5rcylcblx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHRcdGlmIChleHByRm4gIT09IHRydWUgJiYgbmV3T2IpIHtcblx0XHRcdFx0XHRcdFx0Ly8gSWYgbm90IHJlZW50cmFudCBjYWxsIGR1cmluZyBjb21waWxhdGlvblxuXHRcdFx0XHRcdFx0XHRuZXdPYi5fY3BmbiA9IGV4cHJGbjtcblx0XHRcdFx0XHRcdFx0bmV3T2IucHJtID0gYm5kQ3R4LmJkO1xuXHRcdFx0XHRcdFx0XHRuZXdPYi5ibmQgPSBuZXdPYi5ibmQgfHwgbmV3T2IucGF0aCAmJiBuZXdPYi5wYXRoLmluZGV4T2YoXCJeXCIpID49IDA7XG5cdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHR9XG5cdFx0XHR9XG5cdFx0XHRyZXR1cm4gKGFwb3NlZFxuXHRcdFx0XHQvLyB3aXRoaW4gc2luZ2xlLXF1b3RlZCBzdHJpbmdcblx0XHRcdFx0PyAoYXBvc2VkID0gIWFwb3MsIChhcG9zZWQgPyBhbGwgOiBsZnRQcm4yICsgJ1wiJykpXG5cdFx0XHRcdDogcXVvdGVkXG5cdFx0XHRcdC8vIHdpdGhpbiBkb3VibGUtcXVvdGVkIHN0cmluZ1xuXHRcdFx0XHRcdD8gKHF1b3RlZCA9ICFxdW90LCAocXVvdGVkID8gYWxsIDogbGZ0UHJuMiArICdcIicpKVxuXHRcdFx0XHRcdDpcblx0XHRcdFx0KFxuXHRcdFx0XHRcdChsZnRQcm5cblx0XHRcdFx0XHRcdD8gKHBhdGhTdGFydFtwYXJlbkRlcHRoXSA9IGluZGV4KyssIGJuZEN0eCA9IGJuZFN0YWNrWysrcGFyZW5EZXB0aF0gPSB7YmQ6IFtdfSwgbGZ0UHJuKVxuXHRcdFx0XHRcdFx0OiBcIlwiKVxuXHRcdFx0XHRcdCsgKHNwYWNlXG5cdFx0XHRcdFx0XHQ/IChwYXJlbkRlcHRoXG5cdFx0XHRcdFx0XHRcdD8gXCJcIlxuXHRcdFx0XHQvLyBOZXcgYXJnIG9yIHByb3AgLSBzbyBpbnNlcnQgYmFja3NwYWNlIFxcYiAoXFx4MDgpIGFzIHNlcGFyYXRvciBmb3IgbmFtZWQgcGFyYW1zLCB1c2VkIHN1YnNlcXVlbnRseSBieSByQnVpbGRIYXNoLCBhbmQgcHJlcGFyZSBuZXcgYmluZGluZ3MgYXJyYXlcblx0XHRcdFx0XHRcdFx0OiAocGFyYW1JbmRleCA9IGZ1bGwuc2xpY2UocGFyYW1JbmRleCwgaW5kZXgpLCBuYW1lZFxuXHRcdFx0XHRcdFx0XHRcdD8gKG5hbWVkID0gYm91bmROYW1lID0gYmluZHRvID0gZmFsc2UsIFwiXFxiXCIpXG5cdFx0XHRcdFx0XHRcdFx0OiBcIlxcYixcIikgKyBwYXJhbUluZGV4ICsgKHBhcmFtSW5kZXggPSBpbmRleCArIGFsbC5sZW5ndGgsIGJpbmRpbmdzICYmIHBhdGhCaW5kaW5ncy5wdXNoKGJuZEN0eC5iZCA9IFtdKSwgXCJcXGJcIilcblx0XHRcdFx0XHRcdClcblx0XHRcdFx0XHRcdDogZXFcblx0XHRcdFx0Ly8gbmFtZWQgcGFyYW0uIFJlbW92ZSBiaW5kaW5ncyBmb3IgYXJnIGFuZCBjcmVhdGUgaW5zdGVhZCBiaW5kaW5ncyBhcnJheSBmb3IgcHJvcFxuXHRcdFx0XHRcdFx0XHQ/IChwYXJlbkRlcHRoICYmIHN5bnRheEVycm9yKHBhcmFtcyksIGJpbmRpbmdzICYmIHBhdGhCaW5kaW5ncy5wb3AoKSwgbmFtZWQgPSBcIl9cIiArIHBhdGgsIGJvdW5kTmFtZSA9IGJvdW5kLCBwYXJhbUluZGV4ID0gaW5kZXggKyBhbGwubGVuZ3RoLFxuXHRcdFx0XHRcdFx0XHRcdFx0YmluZGluZ3MgJiYgKChiaW5kaW5ncyA9IGJuZEN0eC5iZCA9IHBhdGhCaW5kaW5nc1tuYW1lZF0gPSBbXSksIGJpbmRpbmdzLnNrcCA9ICFib3VuZCksIHBhdGggKyAnOicpXG5cdFx0XHRcdFx0XHRcdDogcGF0aFxuXHRcdFx0XHQvLyBwYXRoXG5cdFx0XHRcdFx0XHRcdFx0PyAocGF0aC5zcGxpdChcIl5cIikuam9pbihcIi5cIikucmVwbGFjZSgkc3ViLnJQYXRoLCBwYXJzZVBhdGgpXG5cdFx0XHRcdFx0XHRcdFx0XHQrIChwcm5cblx0XHRcdFx0Ly8gc29tZS5mbmNhbGwoXG5cdFx0XHRcdFx0XHRcdFx0XHRcdD8gKGJuZEN0eCA9IGJuZFN0YWNrWysrcGFyZW5EZXB0aF0gPSB7YmQ6IFtdfSwgZm5DYWxsW3BhcmVuRGVwdGhdID0gcnRTcSwgcHJuKVxuXHRcdFx0XHRcdFx0XHRcdFx0XHQ6IG9wZXJhdG9yKVxuXHRcdFx0XHRcdFx0XHRcdClcblx0XHRcdFx0XHRcdFx0XHQ6IG9wZXJhdG9yXG5cdFx0XHRcdC8vIG9wZXJhdG9yXG5cdFx0XHRcdFx0XHRcdFx0XHQ/IG9wZXJhdG9yXG5cdFx0XHRcdFx0XHRcdFx0XHQ6IHJ0UHJuXG5cdFx0XHRcdC8vIGZ1bmN0aW9uXG5cdFx0XHRcdFx0XHRcdFx0XHRcdD8gKChydFBybiA9IGZuQ2FsbFtwYXJlbkRlcHRoXSB8fCBydFBybiwgZm5DYWxsW3BhcmVuRGVwdGhdID0gZmFsc2UsIGJuZEN0eCA9IGJuZFN0YWNrWy0tcGFyZW5EZXB0aF0sIHJ0UHJuKVxuXHRcdFx0XHRcdFx0XHRcdFx0XHRcdCsgKHBybiAvLyBydFBybiBhbmQgcHJuLCBlLmcgKSggaW4gKGEpKCkgb3IgYSgpKCksIG9yIClbIGluIGEoKVtdXG5cdFx0XHRcdFx0XHRcdFx0XHRcdFx0XHQ/IChibmRDdHggPSBibmRTdGFja1srK3BhcmVuRGVwdGhdLCBmbkNhbGxbcGFyZW5EZXB0aF0gPSBydFNxLCBwcm4pXG5cdFx0XHRcdFx0XHRcdFx0XHRcdFx0XHQ6IFwiXCIpXG5cdFx0XHRcdFx0XHRcdFx0XHRcdClcblx0XHRcdFx0XHRcdFx0XHRcdFx0OiBjb21tYVxuXHRcdFx0XHRcdFx0XHRcdFx0XHRcdD8gKGZuQ2FsbFtwYXJlbkRlcHRoXSB8fCBzeW50YXhFcnJvcihwYXJhbXMpLCBcIixcIikgLy8gV2UgZG9uJ3QgYWxsb3cgdG9wLWxldmVsIGxpdGVyYWwgYXJyYXlzIG9yIG9iamVjdHNcblx0XHRcdFx0XHRcdFx0XHRcdFx0XHQ6IGxmdFBybjBcblx0XHRcdFx0XHRcdFx0XHRcdFx0XHRcdD8gXCJcIlxuXHRcdFx0XHRcdFx0XHRcdFx0XHRcdFx0OiAoYXBvc2VkID0gYXBvcywgcXVvdGVkID0gcXVvdCwgJ1wiJylcblx0XHRcdFx0KSlcblx0XHRcdCk7XG5cdFx0fVxuXHR9XG5cblx0dmFyIG5hbWVkLCBiaW5kdG8sIGJvdW5kTmFtZSxcblx0XHRxdW90ZWQsIC8vIGJvb2xlYW4gZm9yIHN0cmluZyBjb250ZW50IGluIGRvdWJsZSBxdW90ZXNcblx0XHRhcG9zZWQsIC8vIG9yIGluIHNpbmdsZSBxdW90ZXNcblx0XHRiaW5kaW5ncyA9IHBhdGhCaW5kaW5ncyAmJiBwYXRoQmluZGluZ3NbMF0sIC8vIGJpbmRpbmdzIGFycmF5IGZvciB0aGUgZmlyc3QgYXJnXG5cdFx0Ym5kQ3R4ID0ge2JkOiBiaW5kaW5nc30sXG5cdFx0Ym5kU3RhY2sgPSB7MDogYm5kQ3R4fSxcblx0XHRwYXJhbUluZGV4ID0gMCwgLy8gbGlzdCxcblx0XHR0bXBsTGlua3MgPSAodG1wbCA/IHRtcGwubGlua3MgOiBiaW5kaW5ncyAmJiAoYmluZGluZ3MubGlua3MgPSBiaW5kaW5ncy5saW5rcyB8fCB7fSkpIHx8IHRvcFZpZXcudG1wbC5saW5rcyxcblx0XHQvLyBUaGUgZm9sbG93aW5nIGFyZSB1c2VkIGZvciB0cmFja2luZyBwYXRoIHBhcnNpbmcgaW5jbHVkaW5nIG5lc3RlZCBwYXRocywgc3VjaCBhcyBcImEuYihjXmQgKyAoZSkpXmZcIiwgYW5kIGNoYWluZWQgY29tcHV0ZWQgcGF0aHMgc3VjaCBhc1xuXHRcdC8vIFwiYS5iKCkuY15kKCkuZS5mKCkuZ1wiIC0gd2hpY2ggaGFzIGZvdXIgY2hhaW5lZCBwYXRocywgXCJhLmIoKVwiLCBcIl5jLmQoKVwiLCBcIi5lLmYoKVwiIGFuZCBcIi5nXCJcblx0XHRwYXJlbkRlcHRoID0gMCxcblx0XHRmbkNhbGwgPSB7fSwgLy8gV2UgYXJlIGluIGEgZnVuY3Rpb24gY2FsbFxuXHRcdHBhdGhTdGFydCA9IHt9LCAvLyB0cmFja3MgdGhlIHN0YXJ0IG9mIHRoZSBjdXJyZW50IHBhdGggc3VjaCBhcyBjXmQoKSBpbiB0aGUgYWJvdmUgZXhhbXBsZVxuXHRcdHJlc3VsdDtcblxuXHRpZiAocGFyYW1zWzBdID09PSBcIkBcIikge1xuXHRcdHBhcmFtcyA9IHBhcmFtcy5yZXBsYWNlKHJCcmFja2V0UXVvdGUsIFwiLlwiKTtcblx0fVxuXHRyZXN1bHQgPSAocGFyYW1zICsgKHRtcGwgPyBcIiBcIiA6IFwiXCIpKS5yZXBsYWNlKCRzdWIuclBybSwgcGFyc2VUb2tlbnMpO1xuXG5cdHJldHVybiAhcGFyZW5EZXB0aCAmJiByZXN1bHQgfHwgc3ludGF4RXJyb3IocGFyYW1zKTsgLy8gU3ludGF4IGVycm9yIGlmIHVuYmFsYW5jZWQgcGFyZW5zIGluIHBhcmFtcyBleHByZXNzaW9uXG59XG5cbmZ1bmN0aW9uIGJ1aWxkQ29kZShhc3QsIHRtcGwsIGlzTGlua0V4cHIpIHtcblx0Ly8gQnVpbGQgdGhlIHRlbXBsYXRlIGZ1bmN0aW9uIGNvZGUgZnJvbSB0aGUgQVNUIG5vZGVzLCBhbmQgc2V0IGFzIHByb3BlcnR5IG9uIHRoZSBwYXNzZWQtaW4gdGVtcGxhdGUgb2JqZWN0XG5cdC8vIFVzZWQgZm9yIGNvbXBpbGluZyB0ZW1wbGF0ZXMsIGFuZCBhbHNvIGJ5IEpzVmlld3MgdG8gYnVpbGQgZnVuY3Rpb25zIGZvciBkYXRhIGxpbmsgZXhwcmVzc2lvbnNcblx0dmFyIGksIG5vZGUsIHRhZ05hbWUsIGNvbnZlcnRlciwgdGFnQ3R4LCBoYXNUYWcsIGhhc0VuY29kZXIsIGdldHNWYWwsIGhhc0NudnQsIHVzZUNudnQsIHRtcGxCaW5kaW5ncywgcGF0aEJpbmRpbmdzLCBwYXJhbXMsIGJvdW5kT25FcnJTdGFydCxcblx0XHRib3VuZE9uRXJyRW5kLCB0YWdSZW5kZXIsIG5lc3RlZFRtcGxzLCB0bXBsTmFtZSwgbmVzdGVkVG1wbCwgdGFnQW5kRWxzZXMsIGNvbnRlbnQsIG1hcmt1cCwgbmV4dElzRWxzZSwgb2xkQ29kZSwgaXNFbHNlLCBpc0dldFZhbCwgdGFnQ3R4Rm4sXG5cdFx0b25FcnJvciwgdGFnU3RhcnQsIHRyaWdnZXIsIGxhdGVSZW5kZXIsIHJldFN0ck9wZW4sIHJldFN0ckNsb3NlLFxuXHRcdHRtcGxCaW5kaW5nS2V5ID0gMCxcblx0XHR1c2VWaWV3cyA9ICRzdWJTZXR0aW5nc0FkdmFuY2VkLnVzZVZpZXdzIHx8IHRtcGwudXNlVmlld3MgfHwgdG1wbC50YWdzIHx8IHRtcGwudGVtcGxhdGVzIHx8IHRtcGwuaGVscGVycyB8fCB0bXBsLmNvbnZlcnRlcnMsXG5cdFx0Y29kZSA9IFwiXCIsXG5cdFx0dG1wbE9wdGlvbnMgPSB7fSxcblx0XHRsID0gYXN0Lmxlbmd0aDtcblxuXHRpZiAoXCJcIiArIHRtcGwgPT09IHRtcGwpIHtcblx0XHR0bXBsTmFtZSA9IGlzTGlua0V4cHIgPyAnZGF0YS1saW5rPVwiJyArIHRtcGwucmVwbGFjZShyTmV3TGluZSwgXCIgXCIpLnNsaWNlKDEsIC0xKSArICdcIicgOiB0bXBsO1xuXHRcdHRtcGwgPSAwO1xuXHR9IGVsc2Uge1xuXHRcdHRtcGxOYW1lID0gdG1wbC50bXBsTmFtZSB8fCBcInVubmFtZWRcIjtcblx0XHRpZiAodG1wbC5hbGxvd0NvZGUpIHtcblx0XHRcdHRtcGxPcHRpb25zLmFsbG93Q29kZSA9IHRydWU7XG5cdFx0fVxuXHRcdGlmICh0bXBsLmRlYnVnKSB7XG5cdFx0XHR0bXBsT3B0aW9ucy5kZWJ1ZyA9IHRydWU7XG5cdFx0fVxuXHRcdHRtcGxCaW5kaW5ncyA9IHRtcGwuYm5kcztcblx0XHRuZXN0ZWRUbXBscyA9IHRtcGwudG1wbHM7XG5cdH1cblx0Zm9yIChpID0gMDsgaSA8IGw7IGkrKykge1xuXHRcdC8vIEFTVCBub2RlczogWzA6IHRhZ05hbWUsIDE6IGNvbnZlcnRlciwgMjogY29udGVudCwgMzogcGFyYW1zLCA0OiBjb2RlLCA1OiBvbkVycm9yLCA2OiB0cmlnZ2VyLCA3OnBhdGhCaW5kaW5ncywgODogY29udGVudE1hcmt1cF1cblx0XHRub2RlID0gYXN0W2ldO1xuXG5cdFx0Ly8gQWRkIG5ld2xpbmUgZm9yIGVhY2ggY2FsbG91dCB0byB0KCkgYygpIGV0Yy4gYW5kIGVhY2ggbWFya3VwIHN0cmluZ1xuXHRcdGlmIChcIlwiICsgbm9kZSA9PT0gbm9kZSkge1xuXHRcdFx0Ly8gYSBtYXJrdXAgc3RyaW5nIHRvIGJlIGluc2VydGVkXG5cdFx0XHRjb2RlICs9ICdcXG4rXCInICsgbm9kZSArICdcIic7XG5cdFx0fSBlbHNlIHtcblx0XHRcdC8vIGEgY29tcGlsZWQgdGFnIGV4cHJlc3Npb24gdG8gYmUgaW5zZXJ0ZWRcblx0XHRcdHRhZ05hbWUgPSBub2RlWzBdO1xuXHRcdFx0aWYgKHRhZ05hbWUgPT09IFwiKlwiKSB7XG5cdFx0XHRcdC8vIENvZGUgdGFnOiB7eyogfX1cblx0XHRcdFx0Y29kZSArPSBcIjtcXG5cIiArIG5vZGVbMV0gKyBcIlxcbnJldD1yZXRcIjtcblx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdGNvbnZlcnRlciA9IG5vZGVbMV07XG5cdFx0XHRcdGNvbnRlbnQgPSAhaXNMaW5rRXhwciAmJiBub2RlWzJdO1xuXHRcdFx0XHR0YWdDdHggPSBwYXJhbVN0cnVjdHVyZShub2RlWzNdLCAncGFyYW1zJykgKyAnfSwnICsgcGFyYW1TdHJ1Y3R1cmUocGFyYW1zID0gbm9kZVs0XSk7XG5cdFx0XHRcdHRyaWdnZXIgPSBub2RlWzZdO1xuXHRcdFx0XHRsYXRlUmVuZGVyID0gbm9kZVs3XTtcblx0XHRcdFx0aWYgKG5vZGVbOF0pIHsgLy8gbGF0ZVBhdGggQGEuYi5jIG9yIEB+YS5iLmNcblx0XHRcdFx0XHRyZXRTdHJPcGVuID0gXCJcXG52YXIgb2IsbHRPYj17fSxjdHhzPVwiO1xuXHRcdFx0XHRcdHJldFN0ckNsb3NlID0gXCI7XFxuY3R4cy5sdD1sdE9iLmx0O1xcbnJldHVybiBjdHhzO1wiO1xuXHRcdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRcdHJldFN0ck9wZW4gPSBcIlxcbnJldHVybiBcIjtcblx0XHRcdFx0XHRyZXRTdHJDbG9zZSA9IFwiXCI7XG5cdFx0XHRcdH1cblx0XHRcdFx0bWFya3VwID0gbm9kZVsxMF0gJiYgbm9kZVsxMF0ucmVwbGFjZShyVW5lc2NhcGVRdW90ZXMsIFwiJDFcIik7XG5cdFx0XHRcdGlmIChpc0Vsc2UgPSB0YWdOYW1lID09PSBcImVsc2VcIikge1xuXHRcdFx0XHRcdGlmIChwYXRoQmluZGluZ3MpIHtcblx0XHRcdFx0XHRcdHBhdGhCaW5kaW5ncy5wdXNoKG5vZGVbOV0pO1xuXHRcdFx0XHRcdH1cblx0XHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0XHRvbkVycm9yID0gbm9kZVs1XSB8fCAkc3ViU2V0dGluZ3MuZGVidWdNb2RlICE9PSBmYWxzZSAmJiBcInVuZGVmaW5lZFwiOyAvLyBJZiBkZWJ1Z01vZGUgbm90IGZhbHNlLCBzZXQgZGVmYXVsdCBvbkVycm9yIGhhbmRsZXIgb24gdGFnIHRvIFwidW5kZWZpbmVkXCIgKHNlZSBvblJlbmRlckVycm9yKVxuXHRcdFx0XHRcdGlmICh0bXBsQmluZGluZ3MgJiYgKHBhdGhCaW5kaW5ncyA9IG5vZGVbOV0pKSB7IC8vIEFycmF5IG9mIHBhdGhzLCBvciBmYWxzZSBpZiBub3QgZGF0YS1ib3VuZFxuXHRcdFx0XHRcdFx0cGF0aEJpbmRpbmdzID0gW3BhdGhCaW5kaW5nc107XG5cdFx0XHRcdFx0XHR0bXBsQmluZGluZ0tleSA9IHRtcGxCaW5kaW5ncy5wdXNoKDEpOyAvLyBBZGQgcGxhY2Vob2xkZXIgaW4gdG1wbEJpbmRpbmdzIGZvciBjb21waWxlZCBmdW5jdGlvblxuXHRcdFx0XHRcdH1cblx0XHRcdFx0fVxuXHRcdFx0XHR1c2VWaWV3cyA9IHVzZVZpZXdzIHx8IHBhcmFtc1sxXSB8fCBwYXJhbXNbMl0gfHwgcGF0aEJpbmRpbmdzIHx8IC92aWV3Lig/IWluZGV4KS8udGVzdChwYXJhbXNbMF0pO1xuXHRcdFx0XHQvLyB1c2VWaWV3cyBpcyBmb3IgcGVyZiBvcHRpbWl6YXRpb24uIEZvciByZW5kZXIoKSB3ZSBvbmx5IHVzZSB2aWV3cyBpZiBuZWNlc3NhcnkgLSBmb3IgdGhlIG1vcmUgYWR2YW5jZWQgc2NlbmFyaW9zLlxuXHRcdFx0XHQvLyBXZSB1c2Ugdmlld3MgaWYgdGhlcmUgYXJlIHByb3BzLCBjb250ZXh0dWFsIHByb3BlcnRpZXMgb3IgYXJncyB3aXRoICMuLi4gKG90aGVyIHRoYW4gI2luZGV4KSAtIGJ1dCB5b3UgY2FuIGZvcmNlXG5cdFx0XHRcdC8vIHVzaW5nIHRoZSBmdWxsIHZpZXcgaW5mcmFzdHJ1Y3R1cmUsIChhbmQgcGF5IGEgcGVyZiBwcmljZSkgYnkgb3B0aW5nIGluOiBTZXQgdXNlVmlld3M6IHRydWUgb24gdGhlIHRlbXBsYXRlLCBtYW51YWxseS4uLlxuXHRcdFx0XHRpZiAoaXNHZXRWYWwgPSB0YWdOYW1lID09PSBcIjpcIikge1xuXHRcdFx0XHRcdGlmIChjb252ZXJ0ZXIpIHtcblx0XHRcdFx0XHRcdHRhZ05hbWUgPSBjb252ZXJ0ZXIgPT09IEhUTUwgPyBcIj5cIiA6IGNvbnZlcnRlciArIHRhZ05hbWU7XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRcdGlmIChjb250ZW50KSB7IC8vIFRPRE8gb3B0aW1pemUgLSBpZiBjb250ZW50Lmxlbmd0aCA9PT0gMCBvciBpZiB0aGVyZSBpcyBhIHRtcGw9XCIuLi5cIiBzcGVjaWZpZWQgLSBzZXQgY29udGVudCB0byBudWxsIC8gZG9uJ3QgcnVuIHRoaXMgY29tcGlsYXRpb24gY29kZSAtIHNpbmNlIGNvbnRlbnQgd29uJ3QgZ2V0IHVzZWQhIVxuXHRcdFx0XHRcdFx0Ly8gQ3JlYXRlIHRlbXBsYXRlIG9iamVjdCBmb3IgbmVzdGVkIHRlbXBsYXRlXG5cdFx0XHRcdFx0XHRuZXN0ZWRUbXBsID0gdG1wbE9iamVjdChtYXJrdXAsIHRtcGxPcHRpb25zKTtcblx0XHRcdFx0XHRcdG5lc3RlZFRtcGwudG1wbE5hbWUgPSB0bXBsTmFtZSArIFwiL1wiICsgdGFnTmFtZTtcblx0XHRcdFx0XHRcdC8vIENvbXBpbGUgdG8gQVNUIGFuZCB0aGVuIHRvIGNvbXBpbGVkIGZ1bmN0aW9uXG5cdFx0XHRcdFx0XHRuZXN0ZWRUbXBsLnVzZVZpZXdzID0gbmVzdGVkVG1wbC51c2VWaWV3cyB8fCB1c2VWaWV3cztcblx0XHRcdFx0XHRcdGJ1aWxkQ29kZShjb250ZW50LCBuZXN0ZWRUbXBsKTtcblx0XHRcdFx0XHRcdHVzZVZpZXdzID0gbmVzdGVkVG1wbC51c2VWaWV3cztcblx0XHRcdFx0XHRcdG5lc3RlZFRtcGxzLnB1c2gobmVzdGVkVG1wbCk7XG5cdFx0XHRcdFx0fVxuXG5cdFx0XHRcdFx0aWYgKCFpc0Vsc2UpIHtcblx0XHRcdFx0XHRcdC8vIFRoaXMgaXMgbm90IGFuIGVsc2UgdGFnLlxuXHRcdFx0XHRcdFx0dGFnQW5kRWxzZXMgPSB0YWdOYW1lO1xuXHRcdFx0XHRcdFx0dXNlVmlld3MgPSB1c2VWaWV3cyB8fCB0YWdOYW1lICYmICghJHRhZ3NbdGFnTmFtZV0gfHwgISR0YWdzW3RhZ05hbWVdLmZsb3cpO1xuXHRcdFx0XHRcdFx0Ly8gU3dpdGNoIHRvIGEgbmV3IGNvZGUgc3RyaW5nIGZvciB0aGlzIGJvdW5kIHRhZyAoYW5kIGl0cyBlbHNlcywgaWYgaXQgaGFzIGFueSkgLSBmb3IgcmV0dXJuaW5nIHRoZSB0YWdDdHhzIGFycmF5XG5cdFx0XHRcdFx0XHRvbGRDb2RlID0gY29kZTtcblx0XHRcdFx0XHRcdGNvZGUgPSBcIlwiO1xuXHRcdFx0XHRcdH1cblx0XHRcdFx0XHRuZXh0SXNFbHNlID0gYXN0W2kgKyAxXTtcblx0XHRcdFx0XHRuZXh0SXNFbHNlID0gbmV4dElzRWxzZSAmJiBuZXh0SXNFbHNlWzBdID09PSBcImVsc2VcIjtcblx0XHRcdFx0fVxuXHRcdFx0XHR0YWdTdGFydCA9IG9uRXJyb3IgPyBcIjtcXG50cnl7XFxucmV0Kz1cIiA6IFwiXFxuK1wiO1xuXHRcdFx0XHRib3VuZE9uRXJyU3RhcnQgPSBcIlwiO1xuXHRcdFx0XHRib3VuZE9uRXJyRW5kID0gXCJcIjtcblxuXHRcdFx0XHRpZiAoaXNHZXRWYWwgJiYgKHBhdGhCaW5kaW5ncyB8fCB0cmlnZ2VyIHx8IGNvbnZlcnRlciAmJiBjb252ZXJ0ZXIgIT09IEhUTUwgfHwgbGF0ZVJlbmRlcikpIHtcblx0XHRcdFx0XHQvLyBGb3IgY29udmVydFZhbCB3ZSBuZWVkIGEgY29tcGlsZWQgZnVuY3Rpb24gdG8gcmV0dXJuIHRoZSBuZXcgdGFnQ3R4KHMpXG5cdFx0XHRcdFx0dGFnQ3R4Rm4gPSBuZXcgRnVuY3Rpb24oXCJkYXRhLHZpZXcsaix1XCIsIFwiLy8gXCIgKyB0bXBsTmFtZSArIFwiIFwiICsgKCsrdG1wbEJpbmRpbmdLZXkpICsgXCIgXCIgKyB0YWdOYW1lXG5cdFx0XHRcdFx0XHQrIHJldFN0ck9wZW4gKyBcIntcIiArIHRhZ0N0eCArIFwifTtcIiArIHJldFN0ckNsb3NlKTtcblx0XHRcdFx0XHR0YWdDdHhGbi5fZXIgPSBvbkVycm9yO1xuXHRcdFx0XHRcdHRhZ0N0eEZuLl90YWcgPSB0YWdOYW1lO1xuXHRcdFx0XHRcdHRhZ0N0eEZuLl9iZCA9ICEhcGF0aEJpbmRpbmdzOyAvLyBkYXRhLWxpbmtlZCB0YWcge157Li4uL319XG5cdFx0XHRcdFx0dGFnQ3R4Rm4uX2xyID0gbGF0ZVJlbmRlcjtcblxuXHRcdFx0XHRcdGlmIChpc0xpbmtFeHByKSB7XG5cdFx0XHRcdFx0XHRyZXR1cm4gdGFnQ3R4Rm47XG5cdFx0XHRcdFx0fVxuXG5cdFx0XHRcdFx0c2V0UGF0aHModGFnQ3R4Rm4sIHBhdGhCaW5kaW5ncyk7XG5cdFx0XHRcdFx0dGFnUmVuZGVyID0gJ2MoXCInICsgY29udmVydGVyICsgJ1wiLHZpZXcsJztcblx0XHRcdFx0XHR1c2VDbnZ0ID0gdHJ1ZTtcblx0XHRcdFx0XHRib3VuZE9uRXJyU3RhcnQgPSB0YWdSZW5kZXIgKyB0bXBsQmluZGluZ0tleSArIFwiLFwiO1xuXHRcdFx0XHRcdGJvdW5kT25FcnJFbmQgPSBcIilcIjtcblx0XHRcdFx0fVxuXHRcdFx0XHRjb2RlICs9IChpc0dldFZhbFxuXHRcdFx0XHRcdD8gKGlzTGlua0V4cHIgPyAob25FcnJvciA/IFwidHJ5e1xcblwiIDogXCJcIikgKyBcInJldHVybiBcIiA6IHRhZ1N0YXJ0KSArICh1c2VDbnZ0IC8vIENhbGwgX2NudnQgaWYgdGhlcmUgaXMgYSBjb252ZXJ0ZXI6IHt7Y252dDogLi4uIH19IG9yIHtee2NudnQ6IC4uLiB9fVxuXHRcdFx0XHRcdFx0PyAodXNlQ252dCA9IHVuZGVmaW5lZCwgdXNlVmlld3MgPSBoYXNDbnZ0ID0gdHJ1ZSwgdGFnUmVuZGVyICsgKHRhZ0N0eEZuXG5cdFx0XHRcdFx0XHRcdD8gKCh0bXBsQmluZGluZ3NbdG1wbEJpbmRpbmdLZXkgLSAxXSA9IHRhZ0N0eEZuKSwgdG1wbEJpbmRpbmdLZXkpIC8vIFN0b3JlIHRoZSBjb21waWxlZCB0YWdDdHhGbiBpbiB0bXBsLmJuZHMsIGFuZCBwYXNzIHRoZSBrZXkgdG8gY29udmVydFZhbCgpXG5cdFx0XHRcdFx0XHRcdDogXCJ7XCIgKyB0YWdDdHggKyBcIn1cIikgKyBcIilcIilcblx0XHRcdFx0XHRcdDogdGFnTmFtZSA9PT0gXCI+XCJcblx0XHRcdFx0XHRcdFx0PyAoaGFzRW5jb2RlciA9IHRydWUsIFwiaChcIiArIHBhcmFtc1swXSArIFwiKVwiKVxuXHRcdFx0XHRcdFx0XHQ6IChnZXRzVmFsID0gdHJ1ZSwgXCIoKHY9XCIgKyBwYXJhbXNbMF0gKyAnKSE9bnVsbD92OicgKyAoaXNMaW5rRXhwciA/ICdudWxsKScgOiAnXCJcIiknKSlcblx0XHRcdFx0XHRcdFx0Ly8gTm9uIHN0cmljdCBlcXVhbGl0eSBzbyBkYXRhLWxpbms9XCJ0aXRsZXs6ZXhwcn1cIiB3aXRoIGV4cHI9bnVsbC91bmRlZmluZWQgcmVtb3ZlcyB0aXRsZSBhdHRyaWJ1dGVcblx0XHRcdFx0XHQpXG5cdFx0XHRcdFx0OiAoaGFzVGFnID0gdHJ1ZSwgXCJcXG57dmlldzp2aWV3LGNvbnRlbnQ6ZmFsc2UsdG1wbDpcIiAvLyBBZGQgdGhpcyB0YWdDdHggdG8gdGhlIGNvbXBpbGVkIGNvZGUgZm9yIHRoZSB0YWdDdHhzIHRvIGJlIHBhc3NlZCB0byByZW5kZXJUYWcoKVxuXHRcdFx0XHRcdFx0KyAoY29udGVudCA/IG5lc3RlZFRtcGxzLmxlbmd0aCA6IFwiZmFsc2VcIikgKyBcIixcIiAvLyBGb3IgYmxvY2sgdGFncywgcGFzcyBpbiB0aGUga2V5IChuZXN0ZWRUbXBscy5sZW5ndGgpIHRvIHRoZSBuZXN0ZWQgY29udGVudCB0ZW1wbGF0ZVxuXHRcdFx0XHRcdFx0KyB0YWdDdHggKyBcIn0sXCIpKTtcblxuXHRcdFx0XHRpZiAodGFnQW5kRWxzZXMgJiYgIW5leHRJc0Vsc2UpIHtcblx0XHRcdFx0XHQvLyBUaGlzIGlzIGEgZGF0YS1saW5rIGV4cHJlc3Npb24gb3IgYW4gaW5saW5lIHRhZyB3aXRob3V0IGFueSBlbHNlcywgb3IgdGhlIGxhc3Qge3tlbHNlfX0gb2YgYW4gaW5saW5lIHRhZ1xuXHRcdFx0XHRcdC8vIFdlIGNvbXBsZXRlIHRoZSBjb2RlIGZvciByZXR1cm5pbmcgdGhlIHRhZ0N0eHMgYXJyYXlcblx0XHRcdFx0XHRjb2RlID0gXCJbXCIgKyBjb2RlLnNsaWNlKDAsIC0xKSArIFwiXVwiO1xuXHRcdFx0XHRcdHRhZ1JlbmRlciA9ICd0KFwiJyArIHRhZ0FuZEVsc2VzICsgJ1wiLHZpZXcsdGhpcywnO1xuXHRcdFx0XHRcdGlmIChpc0xpbmtFeHByIHx8IHBhdGhCaW5kaW5ncykge1xuXHRcdFx0XHRcdFx0Ly8gVGhpcyBpcyBhIGJvdW5kIHRhZyAoZGF0YS1saW5rIGV4cHJlc3Npb24gb3IgaW5saW5lIGJvdW5kIHRhZyB7Xnt0YWcgLi4ufX0pIHNvIHdlIHN0b3JlIGEgY29tcGlsZWQgdGFnQ3R4cyBmdW5jdGlvbiBpbiB0bXAuYm5kc1xuXHRcdFx0XHRcdFx0Y29kZSA9IG5ldyBGdW5jdGlvbihcImRhdGEsdmlldyxqLHVcIiwgXCIgLy8gXCIgKyB0bXBsTmFtZSArIFwiIFwiICsgdG1wbEJpbmRpbmdLZXkgKyBcIiBcIiArIHRhZ0FuZEVsc2VzICsgcmV0U3RyT3BlbiArIGNvZGVcblx0XHRcdFx0XHRcdFx0KyByZXRTdHJDbG9zZSk7XG5cdFx0XHRcdFx0XHRjb2RlLl9lciA9IG9uRXJyb3I7XG5cdFx0XHRcdFx0XHRjb2RlLl90YWcgPSB0YWdBbmRFbHNlcztcblx0XHRcdFx0XHRcdGlmIChwYXRoQmluZGluZ3MpIHtcblx0XHRcdFx0XHRcdFx0c2V0UGF0aHModG1wbEJpbmRpbmdzW3RtcGxCaW5kaW5nS2V5IC0gMV0gPSBjb2RlLCBwYXRoQmluZGluZ3MpO1xuXHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdFx0Y29kZS5fbHIgPSBsYXRlUmVuZGVyO1xuXHRcdFx0XHRcdFx0aWYgKGlzTGlua0V4cHIpIHtcblx0XHRcdFx0XHRcdFx0cmV0dXJuIGNvZGU7IC8vIEZvciBhIGRhdGEtbGluayBleHByZXNzaW9uIHdlIHJldHVybiB0aGUgY29tcGlsZWQgdGFnQ3R4cyBmdW5jdGlvblxuXHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdFx0Ym91bmRPbkVyclN0YXJ0ID0gdGFnUmVuZGVyICsgdG1wbEJpbmRpbmdLZXkgKyBcIix1bmRlZmluZWQsXCI7XG5cdFx0XHRcdFx0XHRib3VuZE9uRXJyRW5kID0gXCIpXCI7XG5cdFx0XHRcdFx0fVxuXG5cdFx0XHRcdFx0Ly8gVGhpcyBpcyB0aGUgbGFzdCB7e2Vsc2V9fSBmb3IgYW4gaW5saW5lIHRhZy5cblx0XHRcdFx0XHQvLyBGb3IgYSBib3VuZCB0YWcsIHBhc3MgdGhlIHRhZ0N0eHMgZm4gbG9va3VwIGtleSB0byByZW5kZXJUYWcuXG5cdFx0XHRcdFx0Ly8gRm9yIGFuIHVuYm91bmQgdGFnLCBpbmNsdWRlIHRoZSBjb2RlIGRpcmVjdGx5IGZvciBldmFsdWF0aW5nIHRhZ0N0eHMgYXJyYXlcblx0XHRcdFx0XHRjb2RlID0gb2xkQ29kZSArIHRhZ1N0YXJ0ICsgdGFnUmVuZGVyICsgKHBhdGhCaW5kaW5ncyAmJiB0bXBsQmluZGluZ0tleSB8fCBjb2RlKSArIFwiKVwiO1xuXHRcdFx0XHRcdHBhdGhCaW5kaW5ncyA9IDA7XG5cdFx0XHRcdFx0dGFnQW5kRWxzZXMgPSAwO1xuXHRcdFx0XHR9XG5cdFx0XHRcdGlmIChvbkVycm9yICYmICFuZXh0SXNFbHNlKSB7XG5cdFx0XHRcdFx0dXNlVmlld3MgPSB0cnVlO1xuXHRcdFx0XHRcdGNvZGUgKz0gJztcXG59Y2F0Y2goZSl7cmV0JyArIChpc0xpbmtFeHByID8gXCJ1cm4gXCIgOiBcIis9XCIpICsgYm91bmRPbkVyclN0YXJ0ICsgJ2ouX2VycihlLHZpZXcsJyArIG9uRXJyb3IgKyAnKScgKyBib3VuZE9uRXJyRW5kICsgJzt9JyArIChpc0xpbmtFeHByID8gXCJcIiA6ICdyZXQ9cmV0Jyk7XG5cdFx0XHRcdH1cblx0XHRcdH1cblx0XHR9XG5cdH1cblx0Ly8gSW5jbHVkZSBvbmx5IHRoZSB2YXIgcmVmZXJlbmNlcyB0aGF0IGFyZSBuZWVkZWQgaW4gdGhlIGNvZGVcblx0Y29kZSA9IFwiLy8gXCIgKyB0bXBsTmFtZVxuXHRcdCsgKHRtcGxPcHRpb25zLmRlYnVnID8gXCJcXG5kZWJ1Z2dlcjtcIiA6IFwiXCIpXG5cdFx0KyBcIlxcbnZhciB2XCJcblx0XHQrIChoYXNUYWcgPyBcIix0PWouX3RhZ1wiIDogXCJcIikgICAgICAgICAgICAgICAgLy8gaGFzIHRhZ1xuXHRcdCsgKGhhc0NudnQgPyBcIixjPWouX2NudnRcIiA6IFwiXCIpICAgICAgICAgICAgICAvLyBjb252ZXJ0ZXJcblx0XHQrIChoYXNFbmNvZGVyID8gXCIsaD1qLl9odG1sXCIgOiBcIlwiKSAgICAgICAgICAgLy8gaHRtbCBjb252ZXJ0ZXJcblx0XHQrIChpc0xpbmtFeHByXG5cdFx0XHRcdD8gKG5vZGVbOF0gIC8vIGxhdGUgQC4uLiBwYXRoP1xuXHRcdFx0XHRcdFx0PyBcIiwgb2JcIlxuXHRcdFx0XHRcdFx0OiBcIlwiXG5cdFx0XHRcdFx0KSArIFwiO1xcblwiXG5cdFx0XHRcdDogJyxyZXQ9XCJcIicpXG5cdFx0KyBjb2RlXG5cdFx0KyAoaXNMaW5rRXhwciA/IFwiXFxuXCIgOiBcIjtcXG5yZXR1cm4gcmV0O1wiKTtcblxuXHR0cnkge1xuXHRcdGNvZGUgPSBuZXcgRnVuY3Rpb24oXCJkYXRhLHZpZXcsaix1XCIsIGNvZGUpO1xuXHR9IGNhdGNoIChlKSB7XG5cdFx0c3ludGF4RXJyb3IoXCJDb21waWxlZCB0ZW1wbGF0ZSBjb2RlOlxcblxcblwiICsgY29kZSArICdcXG46IFwiJyArIChlLm1lc3NhZ2V8fGUpICsgJ1wiJyk7XG5cdH1cblx0aWYgKHRtcGwpIHtcblx0XHR0bXBsLmZuID0gY29kZTtcblx0XHR0bXBsLnVzZVZpZXdzID0gISF1c2VWaWV3cztcblx0fVxuXHRyZXR1cm4gY29kZTtcbn1cblxuLy89PT09PT09PT09XG4vLyBVdGlsaXRpZXNcbi8vPT09PT09PT09PVxuXG4vLyBNZXJnZSBvYmplY3RzLCBpbiBwYXJ0aWN1bGFyIGNvbnRleHRzIHdoaWNoIGluaGVyaXQgZnJvbSBwYXJlbnQgY29udGV4dHNcbmZ1bmN0aW9uIGV4dGVuZEN0eChjb250ZXh0LCBwYXJlbnRDb250ZXh0KSB7XG5cdC8vIFJldHVybiBjb3B5IG9mIHBhcmVudENvbnRleHQsIHVubGVzcyBjb250ZXh0IGlzIGRlZmluZWQgYW5kIGlzIGRpZmZlcmVudCwgaW4gd2hpY2ggY2FzZSByZXR1cm4gYSBuZXcgbWVyZ2VkIGNvbnRleHRcblx0Ly8gSWYgbmVpdGhlciBjb250ZXh0IG5vciBwYXJlbnRDb250ZXh0IGFyZSBkZWZpbmVkLCByZXR1cm4gdW5kZWZpbmVkXG5cdHJldHVybiBjb250ZXh0ICYmIGNvbnRleHQgIT09IHBhcmVudENvbnRleHRcblx0XHQ/IChwYXJlbnRDb250ZXh0XG5cdFx0XHQ/ICRleHRlbmQoJGV4dGVuZCh7fSwgcGFyZW50Q29udGV4dCksIGNvbnRleHQpXG5cdFx0XHQ6IGNvbnRleHQpXG5cdFx0OiBwYXJlbnRDb250ZXh0ICYmICRleHRlbmQoe30sIHBhcmVudENvbnRleHQpO1xufVxuXG5mdW5jdGlvbiBnZXRUYXJnZXRQcm9wcyhzb3VyY2UsIHRhZ0N0eCkge1xuXHQvLyB0aGlzIHBvaW50ZXIgaXMgdGhlTWFwIC0gd2hpY2ggaGFzIHRhZ0N0eC5wcm9wcyB0b29cblx0Ly8gYXJndW1lbnRzOiB0YWdDdHguYXJncy5cblx0dmFyIGtleSwgcHJvcCxcblx0XHRtYXAgPSB0YWdDdHgubWFwLFxuXHRcdHByb3BzQXJyID0gbWFwICYmIG1hcC5wcm9wc0FycjtcblxuXHRpZiAoIXByb3BzQXJyKSB7IC8vIG1hcC5wcm9wc0FyciBpcyB0aGUgZnVsbCBhcnJheSBvZiB7a2V5Oi4uLiwgcHJvcDouLi59IG9iamVjdHNcblx0XHRwcm9wc0FyciA9IFtdO1xuXHRcdGlmICh0eXBlb2Ygc291cmNlID09PSBPQkpFQ1QgfHwgJGlzRnVuY3Rpb24oc291cmNlKSkge1xuXHRcdFx0Zm9yIChrZXkgaW4gc291cmNlKSB7XG5cdFx0XHRcdHByb3AgPSBzb3VyY2Vba2V5XTtcblx0XHRcdFx0aWYgKGtleSAhPT0gJGV4cGFuZG8gJiYgc291cmNlLmhhc093blByb3BlcnR5KGtleSkgJiYgKCF0YWdDdHgucHJvcHMubm9GdW5jdGlvbnMgfHwgISQuaXNGdW5jdGlvbihwcm9wKSkpIHtcblx0XHRcdFx0XHRwcm9wc0Fyci5wdXNoKHtrZXk6IGtleSwgcHJvcDogcHJvcH0pO1xuXHRcdFx0XHR9XG5cdFx0XHR9XG5cdFx0fVxuXHRcdGlmIChtYXApIHtcblx0XHRcdG1hcC5wcm9wc0FyciA9IG1hcC5vcHRpb25zICYmIHByb3BzQXJyOyAvLyBJZiBib3VuZCB7Xntwcm9wc319IGFuZCBub3QgaXNSZW5kZXJDYWxsLCBzdG9yZSBwcm9wc0FyciBvbiBtYXAgKG1hcC5vcHRpb25zIGlzIGRlZmluZWQgb25seSBmb3IgYm91bmQsICYmICFpc1JlbmRlckNhbGwpXG5cdFx0fVxuXHR9XG5cdHJldHVybiBnZXRUYXJnZXRTb3J0ZWQocHJvcHNBcnIsIHRhZ0N0eCk7IC8vIE9idGFpbnMgbWFwLnRndCwgYnkgZmlsdGVyaW5nLCBzb3J0aW5nIGFuZCBzcGxpY2luZyB0aGUgZnVsbCBwcm9wc0FyclxufVxuXG5mdW5jdGlvbiBnZXRUYXJnZXRTb3J0ZWQodmFsdWUsIHRhZ0N0eCkge1xuXHQvLyBnZXRUZ3Rcblx0dmFyIG1hcHBlZCwgc3RhcnQsIGVuZCxcblx0XHR0YWcgPSB0YWdDdHgudGFnLFxuXHRcdHByb3BzID0gdGFnQ3R4LnByb3BzLFxuXHRcdHByb3BQYXJhbXMgPSB0YWdDdHgucGFyYW1zLnByb3BzLFxuXHRcdGZpbHRlciA9IHByb3BzLmZpbHRlcixcblx0XHRzb3J0ID0gcHJvcHMuc29ydCxcblx0XHRkaXJlY3RTb3J0ID0gc29ydCA9PT0gdHJ1ZSxcblx0XHRzdGVwID0gcGFyc2VJbnQocHJvcHMuc3RlcCksXG5cdFx0cmV2ZXJzZSA9IHByb3BzLnJldmVyc2UgPyAtMSA6IDE7XG5cblx0aWYgKCEkaXNBcnJheSh2YWx1ZSkpIHtcblx0XHRyZXR1cm4gdmFsdWU7XG5cdH1cblx0aWYgKGRpcmVjdFNvcnQgfHwgc29ydCAmJiBcIlwiICsgc29ydCA9PT0gc29ydCkge1xuXHRcdC8vIFRlbXBvcmFyeSBtYXBwZWQgYXJyYXkgaG9sZHMgb2JqZWN0cyB3aXRoIGluZGV4IGFuZCBzb3J0LXZhbHVlXG5cdFx0bWFwcGVkID0gdmFsdWUubWFwKGZ1bmN0aW9uKGl0ZW0sIGkpIHtcblx0XHRcdGl0ZW0gPSBkaXJlY3RTb3J0ID8gaXRlbSA6IGdldFBhdGhPYmplY3QoaXRlbSwgc29ydCk7XG5cdFx0XHRyZXR1cm4ge2k6IGksIHY6IFwiXCIgKyBpdGVtID09PSBpdGVtID8gaXRlbS50b0xvd2VyQ2FzZSgpIDogaXRlbX07XG5cdFx0fSk7XG5cdFx0Ly8gU29ydCBtYXBwZWQgYXJyYXlcblx0XHRtYXBwZWQuc29ydChmdW5jdGlvbihhLCBiKSB7XG5cdFx0XHRyZXR1cm4gYS52ID4gYi52ID8gcmV2ZXJzZSA6IGEudiA8IGIudiA/IC1yZXZlcnNlIDogMDtcblx0XHR9KTtcblx0XHQvLyBNYXAgdG8gbmV3IGFycmF5IHdpdGggcmVzdWx0aW5nIG9yZGVyXG5cdFx0dmFsdWUgPSBtYXBwZWQubWFwKGZ1bmN0aW9uKGl0ZW0pe1xuXHRcdFx0cmV0dXJuIHZhbHVlW2l0ZW0uaV07XG5cdFx0fSk7XG5cdH0gZWxzZSBpZiAoKHNvcnQgfHwgcmV2ZXJzZSA8IDApICYmICF0YWcuZGF0YU1hcCkge1xuXHRcdHZhbHVlID0gdmFsdWUuc2xpY2UoKTsgLy8gQ2xvbmUgYXJyYXkgZmlyc3QgaWYgbm90IGFscmVhZHkgYSBuZXcgYXJyYXlcblx0fVxuXHRpZiAoJGlzRnVuY3Rpb24oc29ydCkpIHtcblx0XHR2YWx1ZSA9IHZhbHVlLnNvcnQoZnVuY3Rpb24oKSB7IC8vIFdyYXAgdGhlIHNvcnQgZnVuY3Rpb24gdG8gcHJvdmlkZSB0YWdDdHggYXMgJ3RoaXMnIHBvaW50ZXJcblx0XHRcdHJldHVybiBzb3J0LmFwcGx5KHRhZ0N0eCwgYXJndW1lbnRzKTtcblx0XHR9KTtcblx0fVxuXHRpZiAocmV2ZXJzZSA8IDAgJiYgKCFzb3J0IHx8ICRpc0Z1bmN0aW9uKHNvcnQpKSkgeyAvLyBSZXZlcnNlIHJlc3VsdCBpZiBub3QgYWxyZWFkeSByZXZlcnNlZCBpbiBzb3J0XG5cdFx0dmFsdWUgPSB2YWx1ZS5yZXZlcnNlKCk7XG5cdH1cblxuXHRpZiAodmFsdWUuZmlsdGVyICYmIGZpbHRlcikgeyAvLyBJRTggZG9lcyBub3Qgc3VwcG9ydCBmaWx0ZXJcblx0XHR2YWx1ZSA9IHZhbHVlLmZpbHRlcihmaWx0ZXIsIHRhZ0N0eCk7XG5cdFx0aWYgKHRhZ0N0eC50YWcub25GaWx0ZXIpIHtcblx0XHRcdHRhZ0N0eC50YWcub25GaWx0ZXIodGFnQ3R4KTtcblx0XHR9XG5cdH1cblxuXHRpZiAocHJvcFBhcmFtcy5zb3J0ZWQpIHtcblx0XHRtYXBwZWQgPSAoc29ydCB8fCByZXZlcnNlIDwgMCkgPyB2YWx1ZSA6IHZhbHVlLnNsaWNlKCk7XG5cdFx0aWYgKHRhZy5zb3J0ZWQpIHtcblx0XHRcdCQub2JzZXJ2YWJsZSh0YWcuc29ydGVkKS5yZWZyZXNoKG1hcHBlZCk7IC8vIE5vdGUgdGhhdCB0aGlzIG1pZ2h0IGNhdXNlIHRoZSBzdGFydCBhbmQgZW5kIHByb3BzIHRvIGJlIG1vZGlmaWVkIC0gZS5nLiBieSBwYWdlciB0YWcgY29udHJvbFxuXHRcdH0gZWxzZSB7XG5cdFx0XHR0YWdDdHgubWFwLnNvcnRlZCA9IG1hcHBlZDtcblx0XHR9XG5cdH1cblxuXHRzdGFydCA9IHByb3BzLnN0YXJ0OyAvLyBHZXQgY3VycmVudCB2YWx1ZSAtIGFmdGVyIHBvc3NpYmxlICBjaGFuZ2VzIHRyaWdnZXJlZCBieSB0YWcuc29ydGVkIHJlZnJlc2goKSBhYm92ZVxuXHRlbmQgPSBwcm9wcy5lbmQ7XG5cdGlmIChwcm9wUGFyYW1zLnN0YXJ0ICYmIHN0YXJ0ID09PSB1bmRlZmluZWQgfHwgcHJvcFBhcmFtcy5lbmQgJiYgZW5kID09PSB1bmRlZmluZWQpIHtcblx0XHRzdGFydCA9IGVuZCA9IDA7XG5cdH1cblx0aWYgKCFpc05hTihzdGFydCkgfHwgIWlzTmFOKGVuZCkpIHsgLy8gc3RhcnQgb3IgZW5kIHNwZWNpZmllZCwgYnV0IG5vdCB0aGUgYXV0by1jcmVhdGUgTnVtYmVyIGFycmF5IHNjZW5hcmlvIG9mIHt7Zm9yIHN0YXJ0PXh4eCBlbmQ9eXl5fX1cblx0XHRzdGFydCA9ICtzdGFydCB8fCAwO1xuXHRcdGVuZCA9IGVuZCA9PT0gdW5kZWZpbmVkIHx8IGVuZCA+IHZhbHVlLmxlbmd0aCA/IHZhbHVlLmxlbmd0aCA6ICtlbmQ7XG5cdFx0dmFsdWUgPSB2YWx1ZS5zbGljZShzdGFydCwgZW5kKTtcblx0fVxuXHRpZiAoc3RlcCA+IDEpIHtcblx0XHRzdGFydCA9IDA7XG5cdFx0ZW5kID0gdmFsdWUubGVuZ3RoO1xuXHRcdG1hcHBlZCA9IFtdO1xuXHRcdGZvciAoOyBzdGFydDxlbmQ7IHN0YXJ0Kz1zdGVwKSB7XG5cdFx0XHRtYXBwZWQucHVzaCh2YWx1ZVtzdGFydF0pO1xuXHRcdH1cblx0XHR2YWx1ZSA9IG1hcHBlZDtcblx0fVxuXHRpZiAocHJvcFBhcmFtcy5wYWdlZCAmJiB0YWcucGFnZWQpIHtcblx0XHQkb2JzZXJ2YWJsZSh0YWcucGFnZWQpLnJlZnJlc2godmFsdWUpO1xuXHR9XG5cblx0cmV0dXJuIHZhbHVlO1xufVxuXG4vKiogUmVuZGVyIHRoZSB0ZW1wbGF0ZSBhcyBhIHN0cmluZywgdXNpbmcgdGhlIHNwZWNpZmllZCBkYXRhIGFuZCBoZWxwZXJzL2NvbnRleHRcbiogJChcIiN0bXBsXCIpLnJlbmRlcigpXG4qXG4qIEBwYXJhbSB7YW55fSAgICAgICAgZGF0YVxuKiBAcGFyYW0ge2hhc2h9ICAgICAgIFtoZWxwZXJzT3JDb250ZXh0XVxuKiBAcGFyYW0ge2Jvb2xlYW59ICAgIFtub0l0ZXJhdGlvbl1cbiogQHJldHVybnMge3N0cmluZ30gICByZW5kZXJlZCB0ZW1wbGF0ZVxuKi9cbmZ1bmN0aW9uICRmblJlbmRlcihkYXRhLCBjb250ZXh0LCBub0l0ZXJhdGlvbikge1xuXHR2YXIgdG1wbEVsZW0gPSB0aGlzLmpxdWVyeSAmJiAodGhpc1swXSB8fCBlcnJvcignVW5rbm93biB0ZW1wbGF0ZScpKSwgLy8gVGFyZ2V0ZWQgZWxlbWVudCBub3QgZm91bmQgZm9yIGpRdWVyeSB0ZW1wbGF0ZSBzZWxlY3RvciBzdWNoIGFzIFwiI215VG1wbFwiXG5cdFx0dG1wbCA9IHRtcGxFbGVtLmdldEF0dHJpYnV0ZSh0bXBsQXR0cik7XG5cblx0cmV0dXJuIHJlbmRlckNvbnRlbnQuY2FsbCh0bXBsICYmICQuZGF0YSh0bXBsRWxlbSlbanN2VG1wbF0gfHwgJHRlbXBsYXRlcyh0bXBsRWxlbSksXG5cdFx0ZGF0YSwgY29udGV4dCwgbm9JdGVyYXRpb24pO1xufVxuXG4vLz09PT09PT09PT09PT09PT09PT09PT09PT09IFJlZ2lzdGVyIGNvbnZlcnRlcnMgPT09PT09PT09PT09PT09PT09PT09PT09PT1cblxuZnVuY3Rpb24gZ2V0Q2hhckVudGl0eShjaCkge1xuXHQvLyBHZXQgY2hhcmFjdGVyIGVudGl0eSBmb3IgSFRNTCwgQXR0cmlidXRlIGFuZCBvcHRpb25hbCBkYXRhIGVuY29kaW5nXG5cdHJldHVybiBjaGFyRW50aXRpZXNbY2hdIHx8IChjaGFyRW50aXRpZXNbY2hdID0gXCImI1wiICsgY2guY2hhckNvZGVBdCgwKSArIFwiO1wiKTtcbn1cblxuZnVuY3Rpb24gZ2V0Q2hhckZyb21FbnRpdHkobWF0Y2gsIHRva2VuKSB7XG5cdC8vIEdldCBjaGFyYWN0ZXIgZnJvbSBIVE1MIGVudGl0eSwgZm9yIG9wdGlvbmFsIGRhdGEgdW5lbmNvZGluZ1xuXHRyZXR1cm4gY2hhcnNGcm9tRW50aXRpZXNbdG9rZW5dIHx8IFwiXCI7XG59XG5cbmZ1bmN0aW9uIGh0bWxFbmNvZGUodGV4dCkge1xuXHQvLyBIVE1MIGVuY29kZTogUmVwbGFjZSA8ID4gJiAnIFwiIGAgZXRjLiBieSBjb3JyZXNwb25kaW5nIGVudGl0aWVzLlxuXHRyZXR1cm4gdGV4dCAhPSB1bmRlZmluZWQgPyBySXNIdG1sLnRlc3QodGV4dCkgJiYgKFwiXCIgKyB0ZXh0KS5yZXBsYWNlKHJIdG1sRW5jb2RlLCBnZXRDaGFyRW50aXR5KSB8fCB0ZXh0IDogXCJcIjtcbn1cblxuZnVuY3Rpb24gZGF0YUVuY29kZSh0ZXh0KSB7XG5cdC8vIEVuY29kZSBqdXN0IDwgPiBhbmQgJiAtIGludGVuZGVkIGZvciAnc2FmZSBkYXRhJyBhbG9uZyB3aXRoIHt7On19IHJhdGhlciB0aGFuIHt7Pn19XG4gIHJldHVybiBcIlwiICsgdGV4dCA9PT0gdGV4dCA/IHRleHQucmVwbGFjZShyRGF0YUVuY29kZSwgZ2V0Q2hhckVudGl0eSkgOiB0ZXh0O1xufVxuXG5mdW5jdGlvbiBkYXRhVW5lbmNvZGUodGV4dCkge1xuICAvLyBVbmVuY29kZSBqdXN0IDwgPiBhbmQgJiAtIGludGVuZGVkIGZvciAnc2FmZSBkYXRhJyBhbG9uZyB3aXRoIHt7On19IHJhdGhlciB0aGFuIHt7Pn19XG4gIHJldHVybiBcIlwiICsgdGV4dCA9PT0gdGV4dCA/IHRleHQucmVwbGFjZShyRGF0YVVuZW5jb2RlLCBnZXRDaGFyRnJvbUVudGl0eSkgOiB0ZXh0O1xufVxuXG4vLz09PT09PT09PT09PT09PT09PT09PT09PT09IEluaXRpYWxpemUgPT09PT09PT09PT09PT09PT09PT09PT09PT1cblxuJHN1YiA9ICR2aWV3cy5zdWI7XG4kdmlld3NTZXR0aW5ncyA9ICR2aWV3cy5zZXR0aW5ncztcblxuaWYgKCEoanNyIHx8ICQgJiYgJC5yZW5kZXIpKSB7XG5cdC8vIEpzUmVuZGVyIG5vdCBhbHJlYWR5IGxvYWRlZCwgb3IgbG9hZGVkIHdpdGhvdXQgalF1ZXJ5LCBhbmQgd2UgYXJlIG5vdyBtb3ZpbmcgZnJvbSBqc3JlbmRlciBuYW1lc3BhY2UgdG8galF1ZXJ5IG5hbWVwYWNlXG5cdGZvciAoanN2U3RvcmVOYW1lIGluIGpzdlN0b3Jlcykge1xuXHRcdHJlZ2lzdGVyU3RvcmUoanN2U3RvcmVOYW1lLCBqc3ZTdG9yZXNbanN2U3RvcmVOYW1lXSk7XG5cdH1cblxuXHQkY29udmVydGVycyA9ICR2aWV3cy5jb252ZXJ0ZXJzO1xuXHQkaGVscGVycyA9ICR2aWV3cy5oZWxwZXJzO1xuXHQkdGFncyA9ICR2aWV3cy50YWdzO1xuXG5cdCRzdWIuX3RnLnByb3RvdHlwZSA9IHtcblx0XHRiYXNlQXBwbHk6IGJhc2VBcHBseSxcblx0XHRjdnRBcmdzOiBjb252ZXJ0QXJncyxcblx0XHRibmRBcmdzOiBjb252ZXJ0Qm91bmRBcmdzLFxuXHRcdGN0eFBybTogY29udGV4dFBhcmFtZXRlclxuXHR9O1xuXG5cdHRvcFZpZXcgPSAkc3ViLnRvcFZpZXcgPSBuZXcgVmlldygpO1xuXG5cdC8vQlJPV1NFUi1TUEVDSUZJQyBDT0RFXG5cdGlmICgkKSB7XG5cblx0XHQvLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy9cblx0XHQvLyBqUXVlcnkgKD0gJCkgaXMgbG9hZGVkXG5cblx0XHQkLmZuLnJlbmRlciA9ICRmblJlbmRlcjtcblx0XHQkZXhwYW5kbyA9ICQuZXhwYW5kbztcblx0XHRpZiAoJC5vYnNlcnZhYmxlKSB7XG5cdFx0XHRpZiAodmVyc2lvbk51bWJlciAhPT0gKHZlcnNpb25OdW1iZXIgPSAkLnZpZXdzLmpzdmlld3MpKSB7XG5cdFx0XHRcdC8vIERpZmZlcmVudCB2ZXJzaW9uIG9mIGpzUmVuZGVyIHdhcyBsb2FkZWRcblx0XHRcdFx0dGhyb3cgXCJKc09ic2VydmFibGUgcmVxdWlyZXMgSnNSZW5kZXIgXCIgKyB2ZXJzaW9uTnVtYmVyO1xuXHRcdFx0fVxuXHRcdFx0JGV4dGVuZCgkc3ViLCAkLnZpZXdzLnN1Yik7IC8vIGpxdWVyeS5vYnNlcnZhYmxlLmpzIHdhcyBsb2FkZWQgYmVmb3JlIGpzcmVuZGVyLmpzXG5cdFx0XHQkdmlld3MubWFwID0gJC52aWV3cy5tYXA7XG5cdFx0fVxuXG5cdH0gZWxzZSB7XG5cdFx0Ly8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vXG5cdFx0Ly8galF1ZXJ5IGlzIG5vdCBsb2FkZWQuXG5cblx0XHQkID0ge307XG5cblx0XHRpZiAoc2V0R2xvYmFscykge1xuXHRcdFx0Z2xvYmFsLmpzcmVuZGVyID0gJDsgLy8gV2UgYXJlIGxvYWRpbmcganNyZW5kZXIuanMgZnJvbSBhIHNjcmlwdCBlbGVtZW50LCBub3QgQU1EIG9yIENvbW1vbkpTLCBzbyBzZXQgZ2xvYmFsXG5cdFx0fVxuXG5cdFx0Ly8gRXJyb3Igd2FybmluZyBpZiBqc3JlbmRlci5qcyBpcyB1c2VkIGFzIHRlbXBsYXRlIGVuZ2luZSBvbiBOb2RlLmpzIChlLmcuIEV4cHJlc3Mgb3IgSGFwaS4uLilcblx0XHQvLyBVc2UganNyZW5kZXItbm9kZS5qcyBpbnN0ZWFkLi4uXG5cdFx0JC5yZW5kZXJGaWxlID0gJC5fX2V4cHJlc3MgPSAkLmNvbXBpbGUgPSBmdW5jdGlvbigpIHsgdGhyb3cgXCJOb2RlLmpzOiB1c2UgbnBtIGpzcmVuZGVyLCBvciBqc3JlbmRlci1ub2RlLmpzXCI7IH07XG5cblx0XHQvL0VORCBCUk9XU0VSLVNQRUNJRklDIENPREVcblx0XHQkLmlzRnVuY3Rpb24gPSBmdW5jdGlvbihvYikge1xuXHRcdFx0cmV0dXJuIHR5cGVvZiBvYiA9PT0gXCJmdW5jdGlvblwiO1xuXHRcdH07XG5cblx0XHQkLmlzQXJyYXkgPSBBcnJheS5pc0FycmF5IHx8IGZ1bmN0aW9uKG9iaikge1xuXHRcdFx0cmV0dXJuICh7fS50b1N0cmluZykuY2FsbChvYmopID09PSBcIltvYmplY3QgQXJyYXldXCI7XG5cdFx0fTtcblxuXHRcdCRzdWIuX2pxID0gZnVuY3Rpb24oanEpIHsgLy8gcHJpdmF0ZSBtZXRob2QgdG8gbW92ZSBmcm9tIEpzUmVuZGVyIEFQSXMgZnJvbSBqc3JlbmRlciBuYW1lc3BhY2UgdG8galF1ZXJ5IG5hbWVzcGFjZVxuXHRcdFx0aWYgKGpxICE9PSAkKSB7XG5cdFx0XHRcdCRleHRlbmQoanEsICQpOyAvLyBtYXAgb3ZlciBmcm9tIGpzcmVuZGVyIG5hbWVzcGFjZSB0byBqUXVlcnkgbmFtZXNwYWNlXG5cdFx0XHRcdCQgPSBqcTtcblx0XHRcdFx0JC5mbi5yZW5kZXIgPSAkZm5SZW5kZXI7XG5cdFx0XHRcdGRlbGV0ZSAkLmpzcmVuZGVyO1xuXHRcdFx0XHQkZXhwYW5kbyA9ICQuZXhwYW5kbztcblx0XHRcdH1cblx0XHR9O1xuXG5cdFx0JC5qc3JlbmRlciA9IHZlcnNpb25OdW1iZXI7XG5cdH1cblx0JHN1YlNldHRpbmdzID0gJHN1Yi5zZXR0aW5ncztcblx0JHN1YlNldHRpbmdzLmFsbG93Q29kZSA9IGZhbHNlO1xuXHQkaXNGdW5jdGlvbiA9ICQuaXNGdW5jdGlvbjtcblx0JC5yZW5kZXIgPSAkcmVuZGVyO1xuXHQkLnZpZXdzID0gJHZpZXdzO1xuXHQkLnRlbXBsYXRlcyA9ICR0ZW1wbGF0ZXMgPSAkdmlld3MudGVtcGxhdGVzO1xuXG5cdGZvciAoc2V0dGluZyBpbiAkc3ViU2V0dGluZ3MpIHtcblx0XHRhZGRTZXR0aW5nKHNldHRpbmcpO1xuXHR9XG5cblx0LyoqXG5cdCogJC52aWV3cy5zZXR0aW5ncy5kZWJ1Z01vZGUodHJ1ZSlcblx0KiBAcGFyYW0ge2Jvb2xlYW59ICBkZWJ1Z01vZGVcblx0KiBAcmV0dXJucyB7U2V0dGluZ3N9XG5cdCpcblx0KiBkZWJ1Z01vZGUgPSAkLnZpZXdzLnNldHRpbmdzLmRlYnVnTW9kZSgpXG5cdCogQHJldHVybnMge2Jvb2xlYW59XG5cdCovXG5cdCgkdmlld3NTZXR0aW5ncy5kZWJ1Z01vZGUgPSBmdW5jdGlvbihkZWJ1Z01vZGUpIHtcblx0XHRyZXR1cm4gZGVidWdNb2RlID09PSB1bmRlZmluZWRcblx0XHRcdD8gJHN1YlNldHRpbmdzLmRlYnVnTW9kZVxuXHRcdFx0OiAoXG5cdFx0XHRcdCRzdWJTZXR0aW5ncy5kZWJ1Z01vZGUgPSBkZWJ1Z01vZGUsXG5cdFx0XHRcdCRzdWJTZXR0aW5ncy5vbkVycm9yID0gZGVidWdNb2RlICsgXCJcIiA9PT0gZGVidWdNb2RlXG5cdFx0XHRcdFx0PyBmdW5jdGlvbigpIHsgcmV0dXJuIGRlYnVnTW9kZTsgfVxuXHRcdFx0XHRcdDogJGlzRnVuY3Rpb24oZGVidWdNb2RlKVxuXHRcdFx0XHRcdFx0PyBkZWJ1Z01vZGVcblx0XHRcdFx0XHRcdDogdW5kZWZpbmVkLFxuXHRcdFx0XHQkdmlld3NTZXR0aW5ncyk7XG5cdH0pKGZhbHNlKTsgLy8ganNoaW50IGlnbm9yZTpsaW5lXG5cblx0JHN1YlNldHRpbmdzQWR2YW5jZWQgPSAkc3ViU2V0dGluZ3MuYWR2YW5jZWQgPSB7XG5cdFx0dXNlVmlld3M6IGZhbHNlLFxuXHRcdF9qc3Y6IGZhbHNlIC8vIEZvciBnbG9iYWwgYWNjZXNzIHRvIEpzVmlld3Mgc3RvcmVcblx0fTtcblxuXHQvLz09PT09PT09PT09PT09PT09PT09PT09PT09IFJlZ2lzdGVyIHRhZ3MgPT09PT09PT09PT09PT09PT09PT09PT09PT1cblxuXHQkdGFncyh7XG5cdFx0XCJpZlwiOiB7XG5cdFx0XHRyZW5kZXI6IGZ1bmN0aW9uKHZhbCkge1xuXHRcdFx0XHQvLyBUaGlzIGZ1bmN0aW9uIGlzIGNhbGxlZCBvbmNlIGZvciB7e2lmfX0gYW5kIG9uY2UgZm9yIGVhY2gge3tlbHNlfX0uXG5cdFx0XHRcdC8vIFdlIHdpbGwgdXNlIHRoZSB0YWcucmVuZGVyaW5nIG9iamVjdCBmb3IgY2FycnlpbmcgcmVuZGVyaW5nIHN0YXRlIGFjcm9zcyB0aGUgY2FsbHMuXG5cdFx0XHRcdC8vIElmIG5vdCBkb25lIChhIHByZXZpb3VzIGJsb2NrIGhhcyBub3QgYmVlbiByZW5kZXJlZCksIGxvb2sgYXQgZXhwcmVzc2lvbiBmb3IgdGhpcyBibG9jayBhbmQgcmVuZGVyIHRoZSBibG9jayBpZiBleHByZXNzaW9uIGlzIHRydXRoeVxuXHRcdFx0XHQvLyBPdGhlcndpc2UgcmV0dXJuIFwiXCJcblx0XHRcdFx0dmFyIHNlbGYgPSB0aGlzLFxuXHRcdFx0XHRcdHRhZ0N0eCA9IHNlbGYudGFnQ3R4LFxuXHRcdFx0XHRcdHJldCA9IChzZWxmLnJlbmRlcmluZy5kb25lIHx8ICF2YWwgJiYgKHRhZ0N0eC5hcmdzLmxlbmd0aCB8fCAhdGFnQ3R4LmluZGV4KSlcblx0XHRcdFx0XHRcdD8gXCJcIlxuXHRcdFx0XHRcdFx0OiAoc2VsZi5yZW5kZXJpbmcuZG9uZSA9IHRydWUsXG5cdFx0XHRcdFx0XHRcdHNlbGYuc2VsZWN0ZWQgPSB0YWdDdHguaW5kZXgsXG5cdFx0XHRcdFx0XHRcdHVuZGVmaW5lZCk7IC8vIFRlc3QgaXMgc2F0aXNmaWVkLCBzbyByZW5kZXIgY29udGVudCBvbiBjdXJyZW50IGNvbnRleHRcblx0XHRcdFx0cmV0dXJuIHJldDtcblx0XHRcdH0sXG5cdFx0XHRjb250ZW50Q3R4OiB0cnVlLCAvLyBJbmhlcml0IHBhcmVudCB2aWV3IGRhdGEgY29udGV4dFxuXHRcdFx0ZmxvdzogdHJ1ZVxuXHRcdH0sXG5cdFx0XCJmb3JcIjoge1xuXHRcdFx0c29ydERhdGFNYXA6IGRhdGFNYXAoZ2V0VGFyZ2V0U29ydGVkKSxcblx0XHRcdGluaXQ6IGZ1bmN0aW9uKHZhbCwgY2xvbmVkKSB7XG5cdFx0XHRcdHRoaXMuc2V0RGF0YU1hcCh0aGlzLnRhZ0N0eHMpO1xuXHRcdFx0fSxcblx0XHRcdHJlbmRlcjogZnVuY3Rpb24odmFsKSB7XG5cdFx0XHRcdC8vIFRoaXMgZnVuY3Rpb24gaXMgY2FsbGVkIG9uY2UgZm9yIHt7Zm9yfX0gYW5kIG9uY2UgZm9yIGVhY2gge3tlbHNlfX0uXG5cdFx0XHRcdC8vIFdlIHdpbGwgdXNlIHRoZSB0YWcucmVuZGVyaW5nIG9iamVjdCBmb3IgY2FycnlpbmcgcmVuZGVyaW5nIHN0YXRlIGFjcm9zcyB0aGUgY2FsbHMuXG5cdFx0XHRcdHZhciB2YWx1ZSwgZmlsdGVyLCBzcnRGaWVsZCwgaXNBcnJheSwgaSwgc29ydGVkLCBlbmQsIHN0ZXAsXG5cdFx0XHRcdFx0c2VsZiA9IHRoaXMsXG5cdFx0XHRcdFx0dGFnQ3R4ID0gc2VsZi50YWdDdHgsXG5cdFx0XHRcdFx0cmFuZ2UgPSB0YWdDdHguYXJnRGVmYXVsdCA9PT0gZmFsc2UsXG5cdFx0XHRcdFx0cHJvcHMgPSB0YWdDdHgucHJvcHMsXG5cdFx0XHRcdFx0aXRlcmF0ZSA9ICByYW5nZSB8fCB0YWdDdHguYXJncy5sZW5ndGgsIC8vIE5vdCBmaW5hbCBlbHNlIGFuZCBub3QgYXV0by1jcmVhdGUgcmFuZ2Vcblx0XHRcdFx0XHRyZXN1bHQgPSBcIlwiLFxuXHRcdFx0XHRcdGRvbmUgPSAwO1xuXG5cdFx0XHRcdGlmICghc2VsZi5yZW5kZXJpbmcuZG9uZSkge1xuXHRcdFx0XHRcdHZhbHVlID0gaXRlcmF0ZSA/IHZhbCA6IHRhZ0N0eC52aWV3LmRhdGE7IC8vIEZvciB0aGUgZmluYWwgZWxzZSwgZGVmYXVsdHMgdG8gY3VycmVudCBkYXRhIHdpdGhvdXQgaXRlcmF0aW9uLlxuXG5cdFx0XHRcdFx0aWYgKHJhbmdlKSB7XG5cdFx0XHRcdFx0XHRyYW5nZSA9IHByb3BzLnJldmVyc2UgPyBcInVuc2hpZnRcIiA6IFwicHVzaFwiO1xuXHRcdFx0XHRcdFx0ZW5kID0gK3Byb3BzLmVuZDtcblx0XHRcdFx0XHRcdHN0ZXAgPSArcHJvcHMuc3RlcCB8fCAxO1xuXHRcdFx0XHRcdFx0dmFsdWUgPSBbXTsgLy8gYXV0by1jcmVhdGUgaW50ZWdlciBhcnJheSBzY2VuYXJpbyBvZiB7e2ZvciBzdGFydD14eHggZW5kPXl5eX19XG5cdFx0XHRcdFx0XHRmb3IgKGkgPSArcHJvcHMuc3RhcnQgfHwgMDsgKGVuZCAtIGkpICogc3RlcCA+IDA7IGkgKz0gc3RlcCkge1xuXHRcdFx0XHRcdFx0XHR2YWx1ZVtyYW5nZV0oaSk7XG5cdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHRcdGlmICh2YWx1ZSAhPT0gdW5kZWZpbmVkKSB7XG5cdFx0XHRcdFx0XHRpc0FycmF5ID0gJGlzQXJyYXkodmFsdWUpO1xuXHRcdFx0XHRcdFx0cmVzdWx0ICs9IHRhZ0N0eC5yZW5kZXIodmFsdWUsICFpdGVyYXRlIHx8IHByb3BzLm5vSXRlcmF0aW9uKTtcblx0XHRcdFx0XHRcdC8vIEl0ZXJhdGVzIGlmIGRhdGEgaXMgYW4gYXJyYXksIGV4Y2VwdCBvbiBmaW5hbCBlbHNlIC0gb3IgaWYgbm9JdGVyYXRpb24gcHJvcGVydHlcblx0XHRcdFx0XHRcdC8vIHNldCB0byB0cnVlLiAoVXNlIHt7aW5jbHVkZX19IHRvIGNvbXBvc2UgdGVtcGxhdGVzIHdpdGhvdXQgYXJyYXkgaXRlcmF0aW9uKVxuXHRcdFx0XHRcdFx0ZG9uZSArPSBpc0FycmF5ID8gdmFsdWUubGVuZ3RoIDogMTtcblx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0aWYgKHNlbGYucmVuZGVyaW5nLmRvbmUgPSBkb25lKSB7XG5cdFx0XHRcdFx0XHRzZWxmLnNlbGVjdGVkID0gdGFnQ3R4LmluZGV4O1xuXHRcdFx0XHRcdH1cblx0XHRcdFx0XHQvLyBJZiBub3RoaW5nIHdhcyByZW5kZXJlZCB3ZSB3aWxsIGxvb2sgYXQgdGhlIG5leHQge3tlbHNlfX0uIE90aGVyd2lzZSwgd2UgYXJlIGRvbmUuXG5cdFx0XHRcdH1cblx0XHRcdFx0cmV0dXJuIHJlc3VsdDtcblx0XHRcdH0sXG5cdFx0XHRzZXREYXRhTWFwOiBmdW5jdGlvbih0YWdDdHhzKSB7XG5cdFx0XHRcdHZhciB0YWdDdHgsIHByb3BzLCBwYXJhbXNQcm9wcyxcblx0XHRcdFx0XHRzZWxmID0gdGhpcyxcblx0XHRcdFx0XHRsID0gdGFnQ3R4cy5sZW5ndGg7XG5cdFx0XHRcdHdoaWxlIChsLS0pIHtcblx0XHRcdFx0XHR0YWdDdHggPSB0YWdDdHhzW2xdO1xuXHRcdFx0XHRcdHByb3BzID0gdGFnQ3R4LnByb3BzO1xuXHRcdFx0XHRcdHBhcmFtc1Byb3BzID0gdGFnQ3R4LnBhcmFtcy5wcm9wcztcblx0XHRcdFx0XHR0YWdDdHguYXJnRGVmYXVsdCA9IHByb3BzLmVuZCA9PT0gdW5kZWZpbmVkIHx8IHRhZ0N0eC5hcmdzLmxlbmd0aCA+IDA7IC8vIERlZmF1bHQgdG8gI2RhdGEgZXhjZXB0IGZvciBhdXRvLWNyZWF0ZSByYW5nZSBzY2VuYXJpbyB7e2ZvciBzdGFydD14eHggZW5kPXl5eSBzdGVwPXp6en19XG5cdFx0XHRcdFx0cHJvcHMuZGF0YU1hcCA9ICh0YWdDdHguYXJnRGVmYXVsdCAhPT0gZmFsc2UgJiYgJGlzQXJyYXkodGFnQ3R4LmFyZ3NbMF0pICYmXG5cdFx0XHRcdFx0XHQocGFyYW1zUHJvcHMuc29ydCB8fCBwYXJhbXNQcm9wcy5zdGFydCB8fCBwYXJhbXNQcm9wcy5lbmQgfHwgcGFyYW1zUHJvcHMuc3RlcCB8fCBwYXJhbXNQcm9wcy5maWx0ZXIgfHwgcGFyYW1zUHJvcHMucmV2ZXJzZVxuXHRcdFx0XHRcdFx0fHwgcHJvcHMuc29ydCB8fCBwcm9wcy5zdGFydCB8fCBwcm9wcy5lbmQgfHwgcHJvcHMuc3RlcCB8fCBwcm9wcy5maWx0ZXIgfHwgcHJvcHMucmV2ZXJzZSkpXG5cdFx0XHRcdFx0XHQmJiBzZWxmLnNvcnREYXRhTWFwO1xuXHRcdFx0XHR9XG5cdFx0XHR9LFxuXHRcdFx0ZmxvdzogdHJ1ZVxuXHRcdH0sXG5cdFx0cHJvcHM6IHtcblx0XHRcdGJhc2VUYWc6IFwiZm9yXCIsXG5cdFx0XHRkYXRhTWFwOiBkYXRhTWFwKGdldFRhcmdldFByb3BzKSxcblx0XHRcdGluaXQ6IG5vb3AsIC8vIERvbid0IGV4ZWN1dGUgdGhlIGJhc2UgaW5pdCgpIG9mIHRoZSBcImZvclwiIHRhZ1xuXHRcdFx0ZmxvdzogdHJ1ZVxuXHRcdH0sXG5cdFx0aW5jbHVkZToge1xuXHRcdFx0ZmxvdzogdHJ1ZVxuXHRcdH0sXG5cdFx0XCIqXCI6IHtcblx0XHRcdC8vIHt7KiBjb2RlLi4uIH19IC0gSWdub3JlZCBpZiB0ZW1wbGF0ZS5hbGxvd0NvZGUgYW5kICQudmlld3Muc2V0dGluZ3MuYWxsb3dDb2RlIGFyZSBmYWxzZS4gT3RoZXJ3aXNlIGluY2x1ZGUgY29kZSBpbiBjb21waWxlZCB0ZW1wbGF0ZVxuXHRcdFx0cmVuZGVyOiByZXRWYWwsXG5cdFx0XHRmbG93OiB0cnVlXG5cdFx0fSxcblx0XHRcIjoqXCI6IHtcblx0XHRcdC8vIHt7OiogcmV0dXJuZWRFeHByZXNzaW9uIH19IC0gSWdub3JlZCBpZiB0ZW1wbGF0ZS5hbGxvd0NvZGUgYW5kICQudmlld3Muc2V0dGluZ3MuYWxsb3dDb2RlIGFyZSBmYWxzZS4gT3RoZXJ3aXNlIGluY2x1ZGUgY29kZSBpbiBjb21waWxlZCB0ZW1wbGF0ZVxuXHRcdFx0cmVuZGVyOiByZXRWYWwsXG5cdFx0XHRmbG93OiB0cnVlXG5cdFx0fSxcblx0XHRkYmc6ICRoZWxwZXJzLmRiZyA9ICRjb252ZXJ0ZXJzLmRiZyA9IGRiZ0JyZWFrIC8vIFJlZ2lzdGVyIHt7ZGJnL319LCB7e2RiZzouLi59fSBhbmQgfmRiZygpIHRvIHRocm93IGFuZCBjYXRjaCwgYXMgYnJlYWtwb2ludHMgZm9yIGRlYnVnZ2luZy5cblx0fSk7XG5cblx0JGNvbnZlcnRlcnMoe1xuXHRcdGh0bWw6IGh0bWxFbmNvZGUsXG5cdFx0YXR0cjogaHRtbEVuY29kZSwgLy8gSW5jbHVkZXMgPiBlbmNvZGluZyBzaW5jZSByQ29udmVydE1hcmtlcnMgaW4gSnNWaWV3cyBkb2VzIG5vdCBza2lwID4gY2hhcmFjdGVycyBpbiBhdHRyaWJ1dGUgc3RyaW5nc1xuXHRcdGVuY29kZTogZGF0YUVuY29kZSxcblx0XHR1bmVuY29kZTogZGF0YVVuZW5jb2RlLCAvLyBJbmNsdWRlcyA+IGVuY29kaW5nIHNpbmNlIHJDb252ZXJ0TWFya2VycyBpbiBKc1ZpZXdzIGRvZXMgbm90IHNraXAgPiBjaGFyYWN0ZXJzIGluIGF0dHJpYnV0ZSBzdHJpbmdzXG5cdFx0dXJsOiBmdW5jdGlvbih0ZXh0KSB7XG5cdFx0XHQvLyBVUkwgZW5jb2RpbmcgaGVscGVyLlxuXHRcdFx0cmV0dXJuIHRleHQgIT0gdW5kZWZpbmVkID8gZW5jb2RlVVJJKFwiXCIgKyB0ZXh0KSA6IHRleHQgPT09IG51bGwgPyB0ZXh0IDogXCJcIjsgLy8gbnVsbCByZXR1cm5zIG51bGwsIGUuZy4gdG8gcmVtb3ZlIGF0dHJpYnV0ZS4gdW5kZWZpbmVkIHJldHVybnMgXCJcIlxuXHRcdH1cblx0fSk7XG59XG4vLz09PT09PT09PT09PT09PT09PT09PT09PT09IERlZmluZSBkZWZhdWx0IGRlbGltaXRlcnMgPT09PT09PT09PT09PT09PT09PT09PT09PT1cbiRzdWJTZXR0aW5ncyA9ICRzdWIuc2V0dGluZ3M7XG4kaXNBcnJheSA9ICgkfHxqc3IpLmlzQXJyYXk7XG4kdmlld3NTZXR0aW5ncy5kZWxpbWl0ZXJzKFwie3tcIiwgXCJ9fVwiLCBcIl5cIik7XG5cbmlmIChqc3JUb0pxKSB7IC8vIE1vdmluZyBmcm9tIGpzcmVuZGVyIG5hbWVzcGFjZSB0byBqUXVlcnkgbmFtZXBhY2UgLSBjb3B5IG92ZXIgdGhlIHN0b3JlZCBpdGVtcyAodGVtcGxhdGVzLCBjb252ZXJ0ZXJzLCBoZWxwZXJzLi4uKVxuXHRqc3Iudmlld3Muc3ViLl9qcSgkKTtcbn1cbnJldHVybiAkIHx8IGpzcjtcbn0sIHdpbmRvdykpO1xuIiwiLypnbG9iYWwgUVVuaXQsIHRlc3QsIGVxdWFsLCBvayovXG4oZnVuY3Rpb24odW5kZWZpbmVkKSB7XG5cInVzZSBzdHJpY3RcIjtcblxuYnJvd3NlcmlmeS5kb25lLm9uZSA9IHRydWU7XG5cblFVbml0Lm1vZHVsZShcIkJyb3dzZXJpZnkgLSBjbGllbnQgY29kZVwiKTtcblxudmFyIGlzSUU4ID0gd2luZG93LmF0dGFjaEV2ZW50ICYmICF3aW5kb3cuYWRkRXZlbnRMaXN0ZW5lcjtcblxuaWYgKCFpc0lFOCkge1xuXG50ZXN0KFwiTm8galF1ZXJ5IGdsb2JhbDogcmVxdWlyZSgnanNyZW5kZXInKSgpXCIsIGZ1bmN0aW9uKCkge1xuXHQvLyAuLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uIEhpZGUgUVVuaXQgZ2xvYmFsIGpRdWVyeSBhbmQgYW55IHByZXZpb3VzIGdsb2JhbCBqc3JlbmRlci4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLlxuXHR2YXIgalF1ZXJ5ID0gZ2xvYmFsLmpRdWVyeSwganNyID0gZ2xvYmFsLmpzcmVuZGVyO1xuXHRnbG9iYWwualF1ZXJ5ID0gZ2xvYmFsLmpzcmVuZGVyID0gdW5kZWZpbmVkO1xuXG5cdC8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT0gQXJyYW5nZSA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG5cdHZhciBkYXRhID0ge25hbWU6IFwiSm9cIn07XG5cblx0Ly8gLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4gQWN0IC4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi5cblx0dmFyIGpzcmVuZGVyID0gcmVxdWlyZSgnanNyZW5kZXInKSgpOyAvLyBOb3QgcGFzc2luZyBpbiBqUXVlcnksIHNvIHJldHVybnMgdGhlIGpzcmVuZGVyIG5hbWVzcGFjZVxuXG5cdC8vIFVzZSByZXF1aXJlIHRvIGdldCBzZXJ2ZXIgdGVtcGxhdGUsIHRoYW5rcyB0byBCcm93c2VyaWZ5IGJ1bmRsZSB0aGF0IHVzZWQganNyZW5kZXIvdG1wbGlmeSB0cmFuc2Zvcm1cblx0dmFyIHRtcGwgPSByZXF1aXJlKCcuLi90ZW1wbGF0ZXMvbmFtZS10ZW1wbGF0ZS5odG1sJykoanNyZW5kZXIpOyAvLyBQcm92aWRlIGpzcmVuZGVyXG5cblx0dmFyIHJlc3VsdCA9IHRtcGwoZGF0YSk7XG5cblx0cmVzdWx0ICs9IFwiIFwiICsgKGpzcmVuZGVyICE9PSBqUXVlcnkpO1xuXG5cdC8vIC4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4gQXNzZXJ0IC4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLlxuXHRlcXVhbChyZXN1bHQsIFwiTmFtZTogSm8gKG5hbWUtdGVtcGxhdGUuaHRtbCkgdHJ1ZVwiLCBcInJlc3VsdDogTm8galF1ZXJ5IGdsb2JhbDogcmVxdWlyZSgnanNyZW5kZXInKSgpXCIpO1xuXG5cdC8vIC4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4gUmVzZXQgLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uXG5cdGdsb2JhbC5qUXVlcnkgPSBqUXVlcnk7IC8vIFJlcGxhY2UgUVVuaXQgZ2xvYmFsIGpRdWVyeVxuXHRnbG9iYWwuanNyZW5kZXIgPSBqc3I7IC8vIFJlcGxhY2UgYW55IHByZXZpb3VzIGdsb2JhbCBqc3JlbmRlclxufSk7XG59XG59KSgpO1xuIiwidmFyIHRtcGxSZWZzID0gW10sXG4gIG1rdXAgPSAnTmFtZToge3s6bmFtZX19IChuYW1lLXRlbXBsYXRlLmh0bWwpJyxcbiAgJCA9IGdsb2JhbC5qc3JlbmRlciB8fCBnbG9iYWwualF1ZXJ5O1xuXG5tb2R1bGUuZXhwb3J0cyA9ICQgPyAkLnRlbXBsYXRlcyhcIi4vdGVzdC90ZW1wbGF0ZXMvbmFtZS10ZW1wbGF0ZS5odG1sXCIsIG1rdXApIDpcbiAgZnVuY3Rpb24oJCkge1xuICAgIGlmICghJCB8fCAhJC52aWV3cykge3Rocm93IFwiUmVxdWlyZXMganNyZW5kZXIvalF1ZXJ5XCI7fVxuICAgIHdoaWxlICh0bXBsUmVmcy5sZW5ndGgpIHtcbiAgICAgIHRtcGxSZWZzLnBvcCgpKCQpOyAvLyBjb21waWxlIG5lc3RlZCB0ZW1wbGF0ZVxuICAgIH1cblxuICAgIHJldHVybiAkLnRlbXBsYXRlcyhcIi4vdGVzdC90ZW1wbGF0ZXMvbmFtZS10ZW1wbGF0ZS5odG1sXCIsIG1rdXApXG4gIH07Il19
