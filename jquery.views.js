/*! JsViews v1.0pre: http://github.com/BorisMoore/jsviews */
/*
* Interactive data-driven views using templates and data-linking.
* Requires jQuery, and jsrender.js (next-generation jQuery Templates, optimized for pure string-based rendering)
*    See JsRender at http://github.com/BorisMoore/jsrender
*
* Copyright 2013, Boris Moore
* Released under the MIT License.
*/
// informal pre beta commit counter: 38 (Beta Candidate)

(function(global, $, undefined) {
	// global is the this object, which is window when running in the usual browser environment.
	// $ is the global var jQuery
	"use strict";

	if (!$) {
		// jQuery is not loaded.
		throw "requires jQuery"; // for Beta (at least) we require jQuery
	}

	if (!$.views) {
		// JsRender is not loaded.
		throw "requires JsRender"; // JsRender must be loaded before JsViews
	}

	if (!$.observable) {
		// JsRender is not loaded.
		throw "requires jquery.observable"; // jquery.observable.js must be loaded before JsViews
	}

	if ($.link) { return; } // JsViews is already loaded

	//========================== Top-level vars ==========================

	var versionNumber = "v1.0pre",

		LinkedView, activeBody, $view, rTag, delimOpenChar0, delimOpenChar1, delimCloseChar0, delimCloseChar1, linkChar, validate,
		document = global.document,
		$views = $.views,
		$viewsSub = $views.sub,
		$viewsSettings = $views.settings,
		$extend = $viewsSub.extend,
		topView = $viewsSub.View(undefined, "top"), // Top-level view
		$isFunction = $.isFunction,
		$templates = $views.templates,
		$observable = $.observable,
		$observe = $observable.observe,
		jsvAttrStr = "data-jsv",
		$viewsLinkAttr = $viewsSettings.linkAttr || "data-link",  // Allows override on settings prior to loading jquery.views.js

		// These two settings can be overridden on settings after loading jsRender, and prior to loading jquery.observable.js and/or JsViews
		propertyChangeStr = $viewsSettings.propChng = $viewsSettings.propChng || "propertyChange",
		arrayChangeStr = $viewsSub.arrChng = $viewsSub.arrChng || "arrayChange",

		cbBindingsStore = $viewsSub._cbBnds = $viewsSub._cbBnds || {},
		elementChangeStr = "change.jsv",
		onBeforeChangeStr = "onBeforeChange",
		onAfterChangeStr = "onAfterChange",
		onAfterCreateStr = "onAfterCreate",
		closeScript = '"></script>',
		openScript = '<script type="jsv',
		bindElsSel = "script,[" + jsvAttrStr + "]",
		linkViewsSel = bindElsSel + ",[" + $viewsLinkAttr + "]",
		fnSetters = {
			value: "val",
			input: "val",
			html: "html",
			text: "text"
		},
		valueBinding = { from: { fromAttr: "value" }, to: { toAttr: "value"} },
		oldCleanData = $.cleanData,
		oldJsvDelimiters = $viewsSettings.delimiters,
		error = $viewsSub.error,
		syntaxError = $viewsSub.syntaxError,
		// rFirstElem = /<(?!script)(\w+)([>]*\s+on\w+\s*=)?[>\s]/, // This was without the DomLevel0 test.
		rFirstElem = /<(?!script)(\w+)(?:[^>]*(on\w+)\s*=)?[^>]*>/,
		safeFragment = document.createDocumentFragment(),
		qsa = document.querySelector,

		// elContent maps tagNames which have only element content, so may not support script nodes.
		elContent = { ol: 1, ul: 1, table: 1, tbody: 1, thead: 1, tfoot: 1, tr: 1, colgroup: 1, dl: 1, select: 1, optgroup: 1 },
		badParent = {tr: "table"},
		// wrapMap provide appropriate wrappers for inserting innerHTML, used in insertBefore
		wrapMap = $viewsSettings.wrapMap = {
			option: [ 1, "<select multiple='multiple'>", "</select>" ],
			legend: [ 1, "<fieldset>", "</fieldset>" ],
			thead: [ 1, "<table>", "</table>" ],
			tr: [ 2, "<table><tbody>", "</tbody></table>" ],
			td: [ 3, "<table><tbody><tr>", "</tr></tbody></table>" ],
			col: [ 2, "<table><tbody></tbody><colgroup>", "</colgroup></table>" ],
			area: [ 1, "<map>", "</map>" ],
			svg: [1, "<svg>", "</svg>"],
			div: [1, "x<div>", "</div>"] // Needed in IE7 to serialize link tags correctly, insert comments correctly, etc.
		},
		voidElems = {br: 1, img: 1, input: 1, hr: 1, area: 1, base: 1, col: 1, link: 1, meta: 1,
			command: 1, embed: 1, keygen: 1, param: 1, source: 1, track: 1, wbr: 1},
		displayStyles = {},
		viewStore = { 0: topView },
		bindingStore = {},
		bindingKey = 1,
		rViewPath = /^#(view\.?)?/,
		rConvertMarkers = /(^|(\/>)|(<\/\w+>)|>|)(\s*)([#\/]\d+[_^])`(\s*)(<\w+(?=[\s\/>]))?|\s*(?:(<\w+(?=[\s\/>]))|(<\/\w+>)(\s*)|(\/>)\s*)/g,
		rOpenViewMarkers = /(#)()(\d+)(_)/g,
		rOpenMarkers = /(#)()(\d+)([_^])/g,
		rViewMarkers = /(?:(#)|(\/))(\d+)(_)/g,
		rOpenTagMarkers = /(#)()(\d+)(\^)/g,
		rMarkerTokens = /(?:(#)|(\/))(\d+)([_^])([-+@\d]+)?/g;

	wrapMap.optgroup = wrapMap.option;
	wrapMap.tbody = wrapMap.tfoot = wrapMap.colgroup = wrapMap.caption = wrapMap.thead;
	wrapMap.th = wrapMap.td;

	//========================== Top-level functions ==========================

	//===============
	// Event handlers
	//===============

	function elemChangeHandler(ev) {
		var setter, cancel, fromAttr, linkCtx, sourceValue, cvtBack, cnvtName, target, $source, view, binding, bindings, l,
			source = ev.target, onBeforeChange, onAfterChange,
			to = source._jsvBnd;

		// _jsvBnd is a string with the syntax: "&bindingId1&bindingId2"
		if (to) {
			bindings = to.slice(1).split("&");
			l = bindings.length;
			while (l--) {
				if (binding = bindingStore[bindings[l]]) {
					linkCtx = binding.linkCtx;
					view = linkCtx.view;
					if (to = binding.to) {
						// The binding has a 'to' field, which is of the form [[targetObject, toPath], cvtBack]
						$source = $(source);
						onBeforeChange = view.hlp(onBeforeChangeStr);
						onAfterChange = view.hlp(onAfterChangeStr);
						fromAttr = defaultAttr(source);
						setter = fnSetters[fromAttr];
						sourceValue = $isFunction(fromAttr) ? fromAttr(source) : setter ? $source[setter]() : $source.attr(fromAttr);

						if ((!onBeforeChange || !(cancel = onBeforeChange.call(view, ev) === false)) && sourceValue !== undefined) {
							cnvtName = to[1];
							to = to[0]; // [object, path]
							target = to[0];
							target = target._jsvOb ? target._ob : target;
							to = to[2] || to[1];
							if ($isFunction(cnvtName)) {
								cvtBack = cnvtName;
							} else {
								cvtBack = view.tmpl.converters;
								cvtBack = cvtBack && cvtBack[cnvtName] || $views.converters[cnvtName];
							}
							if (cvtBack) {
								sourceValue = cvtBack.call(linkCtx.tag, sourceValue);
							}
							if (sourceValue !== undefined && target) {
								$observable(target).setProperty(to, sourceValue);
								if (onAfterChange) {
									onAfterChange.call(linkCtx, ev);
								}
							}
						}
						if (cancel) {
							ev.stopImmediatePropagation();
						}
					}
				}
			}
		}
	}

	function propertyChangeHandler(ev, eventArgs, linkFn) {
		var attr, setter, changed, sourceValue, css, tag, ctx, prevNode, nextNode, oldLinkCtx, cancel, inlineTag, elCnt, nodesToRemove,
			linkCtx = this,
			source = linkCtx.data,
			target = linkCtx.elem,
			cvt = linkCtx.cvt,
			attrOrProp = "attr",
			parentElem = target.parentNode,
			targetElem = parentElem,
			$target = $(target),
			view = linkCtx.view,
			onEvent = view.hlp(onBeforeChangeStr);

		if (parentElem && (!onEvent || !(eventArgs && onEvent.call(linkCtx, ev, eventArgs) === false))
				// If data changed, the ev.data is set to be the path. Use that to filter the handler action...
				&& !(eventArgs && ev.data.prop !== "*" && ev.data.prop !== eventArgs.path)) {

			// Set linkCtx on view, dynamically, just during this handler call
			oldLinkCtx = view.linkCtx;
			view.linkCtx = linkCtx;
			if (eventArgs) {
				linkCtx.eventArgs = eventArgs;
			}
			if (!ev || eventArgs || linkCtx._initVal) {
				delete linkCtx._initVal;
				sourceValue = linkFn.call(view.tmpl, source, view, $views);
				// Compiled link expression for linkTag: return tagCtx or tagCtxs

				attr = linkCtx.attr || defaultAttr(target, true, cvt !== undefined);
				if (tag = linkCtx.tag) {
					// Existing tag instance
					if (eventArgs && tag.onUpdate && tag.onUpdate(ev, eventArgs, sourceValue) === false || attr === "none") {
						// onUpdate returned false, or attr === "none", so we just need to bind, and we are done
						observeAndBind(linkCtx, source, target, linkFn);
						view.linkCtx = oldLinkCtx;
						return;
					}
					sourceValue = tag.tagName.slice(-1) === ":" // Call convertVal if it is a {{cvt:...}} - otherwise call renderTag
						? $views._cnvt(tag.tagName.slice(0, -1), view, sourceValue)
						: $views._tag(tag.tagName, view, view.tmpl, sourceValue);
				} else if (linkFn._ctxs) {
					// For {{: ...}} without a convert or convertBack, we already have the sourceValue, and we are done
					// For {{: ...}} with either cvt or cvtBack we call convertVal to get the sourceValue and instantiate the tag
					// If cvt is undefined then this is a tag, and we call renderTag to get the rendered content and instantiate the tag
					cvt = cvt === "" ? "true" : cvt; // If there is a cvtBack but no cvt, set cvt to "true"
					sourceValue = cvt // Call convertVal if it is a {{cvt:...}} - otherwise call renderTag
						? $views._cnvt(cvt, view, sourceValue) // convertVal
						: $views._tag(linkFn._ctxs, view, view.tmpl, sourceValue); // renderTag
					tag = view._.tag; // In both convertVal and renderTag we have instantiated a tag
					attr = linkCtx.attr || attr; // linkCtx.attr may have been set to tag.attr during tag instantiation in renderTag
				}
				if (tag) {
					// Initialize the tag with element references
					tag.parentElem = (linkCtx.expr || tag._elCnt) ? target : target.parentNode;
					prevNode = tag._prv;
					nextNode = tag._nxt;
					tag.refresh = refreshTag;
				}

				if ($isFunction(sourceValue)) {
					error(linkCtx.expr + ": missing parens");
				}

				if (attr === "visible") {
					attr = "css-display";
					sourceValue = sourceValue
					// Make sure we set the correct display style for showing this particular element ("block", "inline" etc.)
						? getElementDefaultDisplay(target)
						: "none";
				}
				if (css = attr.lastIndexOf("css-", 0) === 0 && attr.substr(4)) {
// Possible optimization for perf on integer values
//					prev = $.style(target, css);
//					if (+sourceValue === sourceValue) {
//						// support using integer data values, e.g. 100 for width:"100px"
//						prev = parseInt(prev);
//					}
//					if (changed = prev !== sourceValue) {
//						$.style(target, css, sourceValue);
//					}
					if (changed = $.style(target, css) !== sourceValue) {
						$.style(target, css, sourceValue);
					}
				} else if (attr !== "link") { // attr === "link" is for tag controls which do data binding but have no rendered output or target
					if (attr === "value") {
						if (target.type === "checkbox") {
							sourceValue = sourceValue && sourceValue !== "false";
							// The string value "false" can occur with data-link="checked{attr:expr}" - as a result of attr, and hence using convertVal()
							attrOrProp = "prop";
							attr = "checked";
							// We will set the "checked" property
							// We will compare this with the current value
						}
					} else if (attr === "radio") {
						// This is a special binding attribute for radio buttons, which corresponds to the default 'to' binding.
						// This allows binding both to value (for each input) and to the default checked radio button (for each input in named group,
						// e.g. binding to parent data).
						// Place value binding first: <input type="radio" data-link="value{:name} {:#get('data').data.currency:} " .../>
						// or (allowing any order for the binding expressions):
						// <input type="radio" value="{{:name}}" data-link="{:#get('data').data.currency:} value^{:name}" .../>

						if (target.value === ("" + sourceValue)) {
							// If the data value corresponds to the value attribute of this radio button input, set the checked property to true
							sourceValue = true;
							attrOrProp = "prop";
							attr = "checked";
						} else {
							// Otherwise, go straight to observeAndBind, without updating.
							// (The browser will remove the 'checked' attribute, when another radio button in the group is checked).
							observeAndBind(linkCtx, source, target, linkFn);
							view.linkCtx = oldLinkCtx;
							return;
						}
					} else if (attr === "selected" || attr === "disabled" || attr === "multiple" || attr === "readlonly") {
						sourceValue = (sourceValue && sourceValue !== "false") ? attr : null;
						// Use attr, not prop, so when the options (for example) are changed dynamically, but include the previously selected value,
						// they will still be selected after the change
					}

					setter = fnSetters[attr];

					if (setter) {
						if (changed = tag || $target[setter]() !== sourceValue) {
							if (attr === "html") {
								if (tag) {
									inlineTag = tag._.inline;
									tag.refresh(sourceValue);
									if (!inlineTag && tag._.inline) {
										// data-linked tag: data-link="{tagname ...}" has been converted to inline
										// We will skip the observeAndBind call below, since the inserted tag binding above replaces that binding
										view.linkCtx = oldLinkCtx;
										return;
									}
								} else {
									// data-linked value: data-link="expr" or data-link="{:expr}" or data-link="{:expr:}" (with no convert or convertBack)
									$target.empty();
									targetElem = target;
									view.link(source, targetElem, prevNode, nextNode, sourceValue, tag && {tag: tag._tgId});
								}
							} else if (attr === "text" && !target.children[0]) {
								// This code is faster then $target,text()
								if (target.textContent !== undefined) {
									target.textContent = sourceValue;
								} else {
									target.innerText = sourceValue === null ? "" : sourceValue;
								}
							} else {
								$target[setter](sourceValue);
							}
// Removing this for now, to avoid side-effects when you programmatically set the value, and want the focus to stay on the text box
//							if (target.nodeName.toLowerCase() === "input") {
//								$target.blur(); // Issue with IE. This ensures HTML rendering is updated.
//							}
						}
					} else if (changed = $target[attrOrProp](attr) != sourceValue) {
						// Setting an attribute to undefined should remove the attribute
						$target[attrOrProp](attr, sourceValue === undefined && attrOrProp === "attr" ? null : sourceValue);
					}
				}

				if (eventArgs && changed && (onEvent = view.hlp(onAfterChangeStr))) {
					onEvent.call(linkCtx, ev, eventArgs);
				}
			}
			observeAndBind(linkCtx, source, target, linkFn);

			// Remove dynamically added linkCtx from view
			view.linkCtx = oldLinkCtx;
		}
	}

	function arrayChangeHandler(ev, eventArgs) {
		var self = this,
			onBeforeChange = self.hlp(onBeforeChangeStr),
			onAfterChange = self.hlp(onAfterChangeStr);

		if (!onBeforeChange || onBeforeChange.call(ev, eventArgs) !== false) {
			if (eventArgs) {
				// This is an observable action (not a trigger/handler call from pushValues, or similar, for which eventArgs will be null)
				var action = eventArgs.change,
					index = eventArgs.index,
					items = eventArgs.items;

				switch (action) {
					case "insert":
						self.addViews(index, items);
						break;
					case "remove":
						self.removeViews(index, items.length);
						break;
					case "move":
						self.refresh(); // Could optimize this
						break;
					case "refresh":
						self.refresh();
						break;
						// Othercases: (e.g.undefined, for setProperty on observable object) etc. do nothing
				}
			}
			if (onAfterChange) {
				onAfterChange.call(this, ev, eventArgs);
			}
		}
	}

	//=============================
	// Utilities for event handlers
	//=============================

	function getElementDefaultDisplay(elem) {
		// Get the 'visible' display style for the element
		var testElem, nodeName,
			getComputedStyle = global.getComputedStyle,
			cStyle = (elem.currentStyle || getComputedStyle.call(global, elem, "")).display;

		if (cStyle === "none" && !(cStyle = displayStyles[nodeName = elem.nodeName])) {
			// Currently display: none, and the 'visible' style has not been cached.
			// We create an element to find the correct visible display style for this nodeName
			testElem = document.createElement(nodeName);
			document.body.appendChild(testElem);
			cStyle = (getComputedStyle ? getComputedStyle.call(global, testElem, "") : testElem.currentStyle).display;
			// Cache the result as a hash against nodeName
			displayStyles[nodeName] = cStyle;
			document.body.removeChild(testElem);
		}
		return cStyle;
	}

	function setArrayChangeLink(view) {
		// Add/remove arrayChange handler on view
		var handler, arrayBinding,
			data = view.data, // undefined if view is being removed
			bound = view._.bnd; // true for top-level link() or data-link="{for}", or the for tag instance for {^{for}} (or for any custom tag that has an onArrayChange handler)

		if (!view._.useKey && bound) {
			// This is an array view. (view._.useKey not defined => data is array), and is data-bound to collection change events

			if (arrayBinding = view._.bndArr) {
				// First remove the current handler if there is one
				$([arrayBinding[1]]).off(arrayChangeStr, arrayBinding[0]);
				view._.bndArr = undefined;
			}
			if (bound !== !!bound && !bound.linkCtx) {
				// bound is not a boolean, so it is the bound tag that 'owns' this array binding - e.g. {^{for...}}
				if (data) {
					bound._.arrVws[view._.id] = view;
				} else {
					delete bound._.arrVws[view._.id]; // if view.data is undefined, view is being removed
				}
			} else if (data) {
				// If this view is not being removed, but the data array has been replaced, then bind to the new data array
				handler = function(ev) {
					if (!(ev.data && ev.data.off)) {
						// Skip if !!ev.data.off: - a handler that has already been removed (maybe was on handler collection at call time - then removed by another handler)
						// If view.data is undefined, do nothing. (Corresponds to case where there is another handler on the same data whose
						// effect was to remove this view, and which happened to precede this event in the trigger sequence. So although this
						// event has been removed now, it is still called since already on the trigger sequence)
						arrayChangeHandler.apply(view, arguments);
					}
				};
				$([data]).on(arrayChangeStr, handler);
				view._.bndArr = [handler, data];
			}
		}
	}

	function defaultAttr(elem, to, linkGetVal) {
		// to: true - default attribute for setting data value on HTML element; false: default attribute for getting value from HTML element
		// Merge in the default attribute bindings for this target element
		var nodeName = elem.nodeName.toLowerCase(),
			attr = $viewsSettings.merge[nodeName];
		return attr
			? (to
				? ((nodeName === "input" && elem.type === "radio") // For radio buttons, bind from value, but bind to 'radio' - special value.
					? "radio"
					: attr.to.toAttr)
				: attr.from.fromAttr)
			: to
				? linkGetVal ? "text" : "html" // Default innerText for data-link="a.b.c" or data-link="{:a.b.c}" - otherwise innerHTML
				: ""; // Default is not to bind from
	}

	//==============================
	// Rendering and DOM insertion
	//==============================

	function renderAndLink(view, index, tmpl, views, data, context, refresh) {
		var html, linkToNode, prevView, tag, nodesToRemove, bindId,
			parentNode = view.parentElem,
			prevNode = view._prv,
			nextNode = view._nxt,
			elCnt = view._elCnt;

		if (prevNode && prevNode.parentNode !== parentNode) {
			error("Missing parentNode");
			// Abandon, since node has already been removed, or wrapper element has been inserted between prevNode and parentNode
		}

		if (refresh) {
			nodesToRemove = view.nodes();
			if (elCnt && prevNode && prevNode !== nextNode) {
				// This prevNode will be removed from the DOM, so transfer the view tokens on prevNode to nextNode of this 'viewToRefresh'
				transferViewTokens(prevNode, nextNode, parentNode, view._.id, "_", true);
			}

			// Remove child views
			view.removeViews(undefined, undefined, true);
			linkToNode = nextNode;

			if (elCnt) {
				prevNode = prevNode
					? prevNode.previousSibling
					: nextNode
						? nextNode.previousSibling
						: parentNode.lastChild;
			}

			// Remove HTML nodes
			$(nodesToRemove).remove();

			for (bindId in view._.bnds) {
				// The view bindings may have already been removed above in: $(nodesToRemove).remove();
				// If not, remove them here:
				removeViewBinding(bindId);
			}
		} else {
			// addViews. Only called if view is of type "array"
			if (index) {
				// index is a number, so indexed view in view array
				prevView = views[index - 1];
				if (!prevView) {
					return false; // If subview for provided index does not exist, do nothing
				}
				prevNode = prevView._nxt;
			}
			if (elCnt) {
				linkToNode = prevNode;
				prevNode = linkToNode
					? linkToNode.previousSibling         // There is a linkToNode, so insert after previousSibling, or at the beginning
					: parentNode.lastChild;              // If no prevView and no prevNode, index is 0 and there are the container is empty,
					// so prevNode = linkToNode = null. But if prevNode._nxt is null then we set prevNode to parentNode.lastChild
					// (which must be before the prevView) so we insert after that node - and only link the inserted nodes
			} else {
				linkToNode = prevNode.nextSibling;
			}
		}
		html = tmpl.render(data, context, view, refresh || index, view._.useKey && refresh, true);
		// Pass in self._.useKey as test for layout template (which corresponds to when self._.useKey > 0 and self.data is an array)

		// Link the new HTML nodes to the data
		view.link(data, parentNode, prevNode, linkToNode, html, prevView);
//}, 0);
	}

	//=====================
	// addBindingMarkers
	//=====================

	function addBindingMarkers(value, view, tmplBindingKey) {
		// Insert binding markers into the rendered template output, which will get converted to appropriate
		// data-jsv attributes (element-only content) or script marker nodes (phrasing or flow content), in convertMarkers,
		// within view.link, prior to inserting into the DOM. Linking will then bind based on these markers in the DOM.
		var id, tag, end;
		if (tmplBindingKey) {
			// This is a binding marker for a data-bound tag {^{...}}
			end = "^`";
			tag = view._.tag // This is {^{>...}} or {^{tag ...}} or {{cvt:...} - so tag was defined in convertVal or renderTag
				|| {         // This is {^{:...}} so tag is not yet defined
					_: {
						inline: true,
						bnd: tmplBindingKey
					},
					tagCtx: {
						view:view
					},
					flow: true
				};
			id = tag._tgId;
			tag.refresh = refreshTag;
			if (!id) {
				bindingStore[id = bindingKey++] = tag; // Store the tag temporarily, ready for databinding.
				// During linking, in addDataBinding, the tag will be attached to the linkCtx,
				// and then in observeAndBind, bindingStore[bindId] will be replaced by binding info.
				tag._tgId = "" + id;
			}
		} else {
			// This is a binding marker for a view
			// Add the view to the store of current linked views
			end = "_`";
			viewStore[id = view._.id] = view;
		}
		// Example: "_#23`TheValue_/23`"
		return "#" + id + end
			+ (value === undefined ? "" : value) // For {^{:name}} this gives the equivalent semantics to compiled (v=data.name)!=u?v:""; used in {{:name}} or data-link="name"
			+ "/" + id + end;
	}

	//==============================
	// Data-linking and data binding
	//==============================

	//---------------
	// observeAndBind
	//---------------

	function observeAndBind(linkCtx, source, target, linkFn) { //TODO? linkFnArgs) {;
		var tag, binding, cvtBack, paths, lastPath, pathIndex,
			depends = [],
			bindId = linkCtx._bndId || "" + bindingKey++,
			handler = linkCtx._hdlr;

		delete linkCtx._bndId;

		if (tag = linkCtx.tag) {
			// Use the 'depends' paths set on linkCtx.tag - which may have been set on declaration
			// or in events: init, render, onBeforeLink, onAfterLink etc.
			depends = tag.depends || depends;
			depends = $isFunction(depends) ? tag.depends(tag) : depends;
			cvtBack = tag.onChange;
		}
		cvtBack = cvtBack || linkCtx._cvtBk;
		if (!linkCtx._depends || ("" + linkCtx._depends !== "" + depends)) {
			// Only bind the first time, or if the new depends (toString) has changed from when last bound
			if (linkCtx._depends) {
				// Unobserve previous binding
				$observe(source, linkCtx._depends, handler, true);
			}
			binding = $observe($.isArray(source) ? [source] : source , paths = linkCtx.fn.paths || linkCtx.fn, depends, handler, linkCtx._ctxCb);
			// The binding returned by $observe has a bnd array with the source objects of the individual bindings.
			binding.elem = target; // The target of all the individual bindings
			binding.linkCtx = linkCtx;
			binding._tgId = bindId;
			// Add to the _jsvBnd on the target the view id and binding id - for unbinding when the target element is removed
			target._jsvBnd = target._jsvBnd || "";
			target._jsvBnd += "&" + bindId;
			linkCtx._depends = depends;
			// Store the binding key on the view, for disposal when the view is removed
			linkCtx.view._.bnds[bindId] = bindId;
			// Store the binding.
			bindingStore[bindId] = binding; // Note: If this corresponds to a bound tag, we are replacing the
			// temporarily stored tag by the stored binding. The tag will now be at binding.linkCtx.tag

			if (cvtBack !== undefined) {
				// Two-way binding.
				// We set the binding.to[1] to be the cvtBack, and  binding.to[0] to be either the path to the target, or [object, path] where the target is the path on the provided object.
				// So for a path with an object call: a.b.getObject().d.e, then we set to[0] to be [returnedObject, "d.e"], and we bind to the path on the returned object as target
				// Otherwise our target is the first path, paths[0], which we will convert with contextCb() for paths like ~a.b.c or #x.y.z
//TODO add support for two-way binding with named props <input data-link="{:a foo=b:}" - currently will not bind to the correct target
				pathIndex = paths.length;
				while ("" + (lastPath = paths[--pathIndex]) !== lastPath) {}; // If the lastPath is an object (e.g. with _jsvOb property), take preceding one
				lastPath = paths[pathIndex] = lastPath.split("^").join("."); // We don't need the "^" since binding has happened. For to binding, require just "."s
				binding.to = lastPath.charAt(0) === "."
					? [[paths[pathIndex-1], lastPath.slice(1)], cvtBack]
					: [linkCtx._ctxCb(paths[0]) || [source, paths[0]], cvtBack];
			}
		}
	}

	//-------
	// $.link
	//-------

	function tmplLink(to, from, context, parentView, prevNode, nextNode) {
		return $link(this, to, from, context, parentView, prevNode, nextNode);
	}

	function $link(tmplOrLinkTag, to, from, context, parentView, prevNode, nextNode) {
		if (tmplOrLinkTag && to) {
			to = to.jquery ? to : $(to); // to is a jquery object or an element or selector

			if (!activeBody) {
				activeBody = document.body;
				$(activeBody).on(elementChangeStr, elemChangeHandler);
			}

			var i, k, html, vwInfos, view, placeholderParent, targetEl,
				onRender = addBindingMarkers,
				replaceMode = context && context.target === "replace",
				l = to.length;

			while (l--) {
				targetEl = to[l];

				if ("" + tmplOrLinkTag === tmplOrLinkTag) {
					// tmplOrLinkTag is a string: treat as data-link expression.
					addDataBinding(tmplOrLinkTag, targetEl, $view(targetEl), from, context);
				} else {
					parentView = parentView || $view(targetEl);

					if (tmplOrLinkTag.markup !== undefined) {
						// This is a call to template.link()
						if (parentView.link === false) {
							context = context || {};
							context.link = onRender = false; // If link=false, don't allow nested context to switch on linking
						}
						// Set link=false, explicitly, to disable linking within a template nested within a linked template
						if (replaceMode) {
							placeholderParent = targetEl.parentNode;
						}

						html = tmplOrLinkTag.render(from, context, parentView, undefined, undefined, onRender);
						// TODO Consider finding a way to bind data (link) within template without html being different for each view, the HTML can
						// be evaluated once outside the while (l--), and pushed into a document fragment, then cloned and inserted at each target.

						if (placeholderParent) {
							// This is target="replace" mode
							prevNode = targetEl.previousSibling;
							nextNode = targetEl.nextSibling;
							$.cleanData([targetEl], true);
							placeholderParent.removeChild(targetEl);

							targetEl = placeholderParent;
						} else {
							prevNode = nextNode = undefined; // When linking from a template, prevNode and nextNode parameters are ignored
							$(targetEl).empty();
						}
					} else if (tmplOrLinkTag !== true) {
						break;
					}

// TODO Consider deferred linking API feature on per-template basis - {@{ instead of {^{ which allows the user to see the rendered content
// before that content is linked, with better perceived perf. Have view.link return a deferred, and pass that to onAfterLink...
// or something along those lines.
// setTimeout(function() {

					if (targetEl._dfr && !nextNode) {
						// We are inserting new content and the target element has some deferred binding annotations,and there is no nextNode.
						// Those views may be stale views (that will be recreated in this new linking action) so we will first remove them
						// (if not already removed).
						vwInfos = viewInfos(targetEl._dfr, true, rOpenViewMarkers);

						for (i = 0, k = vwInfos.length; i < k; i++) {
							view = vwInfos[i];
							if ((view = viewStore[view.id]) && view.data !== undefined) {
								// If this is the _prv (prevNode) for a view, remove the view
								// - unless view.data is undefined, in which case it is already being removed
								view.parent.removeViews(view._.key, undefined, true);
							}
						}
						targetEl._dfr = "";
					}

					// Link the content of the element, since this is a call to template.link(), or to $(el).link(true, ...),
					parentView.link(from, targetEl, prevNode, nextNode, html);
//}, 0);
				}
			}
		}
		return to; // Allow chaining, to attach event handlers, etc.
	}

	//----------
	// view.link
	//----------

	function viewLink(outerData, parentNode, prevNode, nextNode, html, refresh) {
		// Optionally insert HTML into DOM using documentFragments (and wrapping HTML appropriately).
		// Data-link existing contents of parentNode, or the inserted HTML, if provided

		// Depending on the content model for the HTML elements, the standard data-linking markers inserted in the HTML by addBindingMarkers during
		// template rendering will be converted either to script marker nodes or, for element-only content sections, by data-jsv element annotations.

		// Data-linking will then add _prv and _nxt to views, where:
		//     _prv: References the previous node (script element of type "jsv123"), or (for elCnt=true), the first element node in the view
		//     _nxt: References the last node (script element of type "jsv/123"), or (for elCnt=true), the next element node after the view.

		//==== nested functions ====
		function convertMarkers(all, preceding, selfClose, closeTag, spaceBefore, id, spaceAfter, tag1, tag2, closeTag2, spaceAfterClose, selfClose2) {
			//rConvertMarkers = /(^|(\/>)|(<\/\w+>)|>|)(\s*)_([#\/]\d+_)`(\s*)(<\w+(?=[\s\/>]))?|\s*(?:(<\w+(?=[\s\/>]))|(<\/\w+>)(\s*)|(\/>)\s*)/g,
			//                 prec, slfCl, clTag,  spaceBefore, id,    spaceAfter, tag1,                  tag2,             clTag2,  sac   slfCl2,
			// Convert the markers that were included by addBindingMarkers in template output, to appropriate DOM annotations:
			// data-jsv attributes (for element-only content) or script marker nodes (within phrasing or flow content).

// TODO consider detecting 'quoted' contexts (attribute strings) so that attribute encoding does not need to encode >
// Currently rAttrEncode = /[><"'&]/g includes '>' encoding in order to avoid erroneous parsing of <span title="&lt;a/>">

			var endOfElCnt = "";
			tag = tag1 || tag2 || "";
			closeTag = closeTag || selfClose || closeTag2 || selfClose2;
			if (closeTag) {
				if (validate && (selfClose || selfClose2) && !voidElems[parentTag]) {
					syntaxError("'<" + parentTag + "... />' in:\n" + html);
				}
				prevElCnt = elCnt;
				parentTag = tagStack.shift();
				elCnt = elContent[parentTag];
				if (prevElCnt) {
					// If there are ids (markers since the last tag), move them to the defer string
					defer += ids;
					ids = "";
					if (!elCnt) {
						endOfElCnt = (closeTag2 || "") + openScript + "@" + defer + closeScript + (spaceAfterClose || "");
						defer = deferStack.shift();
					} else {
						defer += "-"; // Will be used for stepping back through deferred tokens
					}
				}
			}
			if (elCnt) {
				// elContent maps tagNames which have only element content, so may not support script nodes.
				// We are in element-only content, can remove white space, and use data-jsv attributes on elements as markers
				// Example: <tr data-jsv="/2_#6_"> - close marker for view 2 and open marker for view 6

				if (id) {
					// append marker for this id, to ids string
					ids += id;
				} else {
					preceding = (closeTag2 || selfClose2 || "");
				}
				if (tag) {
					preceding += tag;
					if (ids) {
						preceding += ' ' + jsvAttrStr + '="' + ids + '"';
						ids = "";
					}
				}
			} else {
				// We are in phrasing or flow content, so use script marker nodes
				// Example: <script type="jsv3/"></script> - data-bound tag, close marker
				preceding = id
					? (preceding + endOfElCnt + spaceBefore + openScript + id + closeScript + spaceAfter + tag)
					: endOfElCnt || all;
			}
			if (tag) {
				// If there are ids (markers since the last tag), move them to the defer string
				tagStack.unshift(parentTag);
				parentTag = tag.slice(1);
				if (tagStack[0] === badParent[parentTag]) {
					// TODO: move this to design-time validation check
					error('"' + parentTag + '" has incorrect parent tag');
				}
				if ((elCnt = elContent[parentTag]) && !prevElCnt) {
					deferStack.unshift(defer);
					defer = "";
				}
				prevElCnt = elCnt;
//TODO Consider providing validation which throws if you place <span> as child of <tr>, etc. - since if not caught,
//this can cause errors subsequently which are difficult to debug.
//				if (elContent[tagStack[0]]>2 && !elCnt) {
//					error(parentTag + " in " + tagStack[0]);
//				}
				if (defer && elCnt) {
					defer += "+"; // Will be used for stepping back through deferred tokens
				}
			}
			return preceding;
		}

		function processViewInfos(vwInfos, targetParent) {
			// If targetParent, we are processing viewInfos (which may include navigation through '+-' paths) and hooking up to the right parentElem etc.
			// (and elem may also be defined - the next node)
			// If no targetParent, then we are processing viewInfos on newly inserted content
			var deferPath, deferChar, bindChar, parentElem, id, onAftCr, deep,
				addedBindEls = [];

			// In elCnt context (element-only content model), prevNode is the first node after the open, nextNode is the first node after the close.
			// If both are null/undefined, then open and close are at end of parent content, so the view is empty, and its placeholder is the
			// 'lastChild' of the parentNode. If there is a prevNode, then it is either the first node in the view, or the view is empty and
			// its placeholder is the 'previousSibling' of the prevNode, which is also the nextNode.
			if (vwInfos) {
				//targetParent = targetParent || targetElem && targetElem.previousSibling;
				//targetParent = targetElem ? targetElem.previousSibling : targetParent;
				len = vwInfos.length;
				if (vwInfos.tokens.charAt(0) === "@") {
					// This is a special script element that was created in convertMarkers() to process deferred bindings, and inserted following the
					// target parent element - because no element tags were encountered to carry those binding tokens.
					targetParent = elem.previousSibling;
					elem.parentNode.removeChild(elem);
					elem = null;
				}
				len = vwInfos.length;
				while (len--) {
					vwInfo = vwInfos[len];
					//if (prevIds.indexOf(vwInfo.token) < 0) { // This token is a newly created view or tag binding
						bindChar = vwInfo.ch;
						if (deferPath = vwInfo.path) {
							// We have a 'deferred path'
							j = deferPath.length - 1;
							while (deferChar = deferPath.charAt(j--)) {
								// Use the "+" and"-" characters to navigate the path back to the original parent node where the deferred bindings ocurred
								if (deferChar === "+") {
									if (deferPath.charAt(j) === "-") {
										j--;
										targetParent = targetParent.previousSibling;
									} else {
										targetParent = targetParent.parentNode;
									}
								} else {
									targetParent = targetParent.lastChild;
								}
								// Note: Can use previousSibling and lastChild, not previousElementSibling and lastElementChild,
								// since we have removed white space within elCnt. Hence support IE < 9
							}
						}
						if (bindChar === "^") {
							if (tag = bindingStore[id = vwInfo.id]) {
								// The binding may have been deleted, for example in a different handler to an array collectionChange event
								// This is a tag binding
								deep = targetParent && (!elem || elem.parentNode !== targetParent);
								if (!elem || deep) {
									tag.parentElem = targetParent;
								}
								if (vwInfo.elCnt) {
									if (vwInfo.open) {
										if (targetParent) {
											// This is an 'open view' node (preceding script marker node,
											// or if elCnt, the first element in the view, with a data-jsv annotation) for binding
											targetParent._dfr = "#" + id + bindChar + (targetParent._dfr || "");
										}
									} else if (deep) {
										// There is no ._nxt so add token to _dfr. It is deferred.
										targetParent._dfr = "/" + id + bindChar + (targetParent._dfr || "");
									}
								}
								// This is an open or close marker for a data-bound tag {^{...}}. Add it to bindEls.
								addedBindEls.push([deep ? null : elem, vwInfo]);
							}
						} else if (view = viewStore[id = vwInfo.id]) {
							// The view may have been deleted, for example in a different handler to an array collectionChange event
							if (!view.link) {
								// If view is not already extended for JsViews, extend and initialize the view object created in JsRender, as a JsViews view
								view.parentElem = targetParent || elem && elem.parentNode || parentNode;
								$extend(view, LinkedView);
								view._.onRender = addBindingMarkers;
								view._.onArrayChange = arrayChangeHandler;
								setArrayChangeLink(view);
							}
							parentElem = view.parentElem;
							if (vwInfo.open) {
								// This is an 'open view' node (preceding script marker node,
								// or if elCnt, the first element in the view, with a data-jsv annotation) for binding
								view._elCnt = vwInfo.elCnt;
								if (targetParent) {
									targetParent._dfr = "#" + id + bindChar + (targetParent._dfr || "");
								} else {
									// No targetParent, so there is a ._nxt elem (and this is processing tokens on the elem)
									if (!view._prv) {
										parentElem._dfr = removeSubStr(parentElem._dfr, "#" + id + bindChar);
									}
									view._prv = elem;
								}
							} else {
								// This is a 'close view' marker node for binding
								if (targetParent && (!elem || elem.parentNode !== targetParent)) {
									// There is no ._nxt so add token to _dfr. It is deferred.
									targetParent._dfr = "/" + id + bindChar + (targetParent._dfr || "");
									view._nxt = undefined;
								} else if (elem) {
									// This view did not have a ._nxt, but has one now, so token may be in _dfr, and must be removed. (No longer deferred)
									if (!view._nxt) {
										parentElem._dfr = removeSubStr(parentElem._dfr, "/" + id + bindChar);
									}
									view._nxt = elem;
								}
								linkCtx = view.linkCtx;
								if (onAftCr = onAfterCreate || (view.ctx && view.ctx.onAfterCreate)) {
									onAftCr.call(linkCtx, view);
								}
							}
						//}
					}
				}
				len = addedBindEls.length;
				while (len--) {
					// These were added in reverse order to addedBindEls. We push them in BindEls in the correct order.
					bindEls.push(addedBindEls[len]);
				}
			}
			return !vwInfos || vwInfos.elCnt;
		}

		function getViewInfos(vwInfos) {
			// Used by view.childTags() and tag.childTags()
			// Similar to processViewInfos in how it steps through bindings to find tags. Only finds data-bound tags.
			var level, parentTag;

			if (len = vwInfos && vwInfos.length) {
				for (j = 0; j < len; j++) {
					vwInfo = vwInfos[j];
					if (get.id) {
						get.id = get.id !== vwInfo.id && get.id;
					} else {
						// This is an open marker for a data-bound tag {^{...}}, within the content of the tag whose id is get.id. Add it to bindEls.
						parentTag = tag = bindingStore[vwInfo.id].linkCtx.tag;
						if (!tag.flow) {
							if (!deep) {
								level = 1;
								while (parentTag = parentTag.parent) {
									level++;
								}
								tagDepth = tagDepth || level; // The level of the first tag encountered.
							}
							if ((deep || level === tagDepth) && (!tagName || tag.tagName === tagName)) {
								// Filter on top-level or tagName as appropriate
								tags.push(tag);
							}
						}
					}
				}
			}
		}

		function dataLink() {
			//================ Data-link and fixup of data-jsv annotations ================
			elems = qsa ? parentNode.querySelectorAll(linkViewsSel) : $(linkViewsSel, parentNode).get();
			l = elems.length;

			// The prevNode will be in the returned query, since we called markPrevOrNextNode() on it.
			// But it may have contained nodes that satisfy the selector also.
			if (prevNode) {
				// Find the last contained node one to use as the prevNode - so we only link subsequent elems in the query
				prevNodes = qsa ? prevNode.querySelectorAll(linkViewsSel) : $(linkViewsSel, prevNode).get();
				prevNode = prevNodes.length ? prevNodes[prevNodes.length - 1] : prevNode;
			}
			tagDepth = 0;
			for (i = 0; i < l; i++) {
				elem = elems[i];
				if (prevNode && !found) {
					// If prevNode is set, not false, skip linking. If this element is the prevNode, set to false so subsequent elements will link.
					found = (elem === prevNode);
				} else if (nextNode && elem === nextNode) {
					// If nextNode is set then break when we get to nextNode
					break;
				} else if (elem.parentNode
					// elem has not been removed from DOM
						&& processInfos(viewInfos(elem, undefined, tags && rOpenTagMarkers))
						// If a link() call, processViewInfos() adds bindings to bindEls, and returns true for non-script nodes, for adding data-link bindings
						// If a childTags() call getViewInfos adds tag bindings to tags array.
							&& elem.getAttribute($viewsLinkAttr)) {
								bindEls.push([elem]);
							}
			}

			// Remove temporary marker script nodes they were added by markPrevOrNextNode
			unmarkPrevOrNextNode(prevNode, elCnt);
			unmarkPrevOrNextNode(nextNode, elCnt);

			if (get) {
				lazyLink && lazyLink.resolve();
				return;
			}

			if (elCnt && defer + ids) {
				// There are some views with elCnt, for which the open or close did not precede any HTML tag - so they have not been processed yet
				elem = nextNode;
				if (defer) {
					if (nextNode) {
						processViewInfos(viewInfos(defer + "+", true), nextNode);
					} else {
						processViewInfos(viewInfos(defer, true), parentNode);
					}
				}
				processViewInfos(viewInfos(ids, true), parentNode);
				// If there were any tokens on nextNode which have now been associated with inserted HTML tags, remove them from nextNode
				if (nextNode) {
					tokens = nextNode.getAttribute(jsvAttrStr);
					if (l = tokens.indexOf(prevIds) + 1) {
						tokens = tokens.slice(l + prevIds.length - 1);
					}
					nextNode.setAttribute(jsvAttrStr, ids + tokens);
				}
			}

			//================ Bind the data-link elements, and the data-bound tags ================
			l = bindEls.length;
			for (i = 0; i < l; i++) {
				elem = bindEls[i];
				linkInfo = elem[1];
				elem = elem[0];
				if (linkInfo) {
					tag = bindingStore[linkInfo.id];
					tag = tag.linkCtx ? tag.linkCtx.tag : tag;
					// The tag may have been stored temporarily on the bindingStore - or may have already been replaced by the actual binding
					if (linkInfo.open) {
						// This is an 'open bound tag' binding annotation for a data-bound tag {^{...}}
						if (elem) {
							tag.parentElem = elem.parentNode;
							tag._prv = elem;
						}
						tag._elCnt = linkInfo.elCnt;
						if (tag && (!tag.onBeforeLink || tag.onBeforeLink() !== false) && !tag._.bound) {
							// By default we data-link depth-first ("on the way in"), which is better for perf. But if a tag needs nested tags to be linked (refreshed)
							// first, before linking its content, then make onBeforeLink() return false. In that case we data-link depth-first, so nested tags will have already refreshed.
							tag._.bound = true;
							view = tag.tagCtx.view;
							addDataBinding(undefined, tag._prv, view, view.data||outerData, linkInfo.id);
						}

						tag._.linking = true;
					} else {
						tag._nxt = elem;
						if (tag._.linking) {
							// This is a 'close bound tag' binding annotation
							// Add data binding
							view = tag.tagCtx.view;
							tag.contents = getContents;
							tag.nodes = getNodes;
							tag.childTags = getChildTags;

							delete tag._.linking;
							if (tag && tag.onAfterLink) {
								tag.onAfterLink();
							}
							if (!tag._.bound) {
								tag._.bound = true;
								addDataBinding(undefined, tag._prv, view, view.data||outerData, linkInfo.id);
							}
						}
					}
				} else {
					view = $view(elem);
					// Add data binding for a data-linked element (with data-link attribute)
					addDataBinding(elem.getAttribute($viewsLinkAttr), elem, view, view.data||outerData);
				}
			}
			lazyLink && lazyLink.resolve();
		}
		//==== /end of nested functions ====

		var linkCtx, tag, i, l, j, len, elems, elem, view, vwInfos, vwInfo, linkInfo, prevNodes, token, prevView, nextView, node, tags, deep, tagName,
			tagDepth, get, depth, fragment, copiedNode, firstTag, parentTag, wrapper, div, tokens, elCnt, prevElCnt, htmlTag, ids, prevIds, found, lazyLink,
			noDomLevel0 = $viewsSettings.noDomLevel0,
			self = this,
			thisId = self._.id + "_",
			defer = "",
			// The marker ids for which no tag was encountered (empty views or final closing markers) which we carry over to container tag
			bindEls = [],
			tagStack = [],
			deferStack = [],
			onAfterCreate = self.hlp(onAfterCreateStr),
			processInfos = processViewInfos;

		if (refresh) {
			lazyLink = refresh.lazyLink && $.Deferred();
			if (refresh.tmpl) {
				// refresh is the prevView, passed in from addViews()
				prevView = "/" + refresh._.id + "_";
			} else {
				get = refresh.get;
				if (refresh.tag) {
					thisId = refresh.tag + "^";
					refresh = true;
				}
			}
			refresh = refresh === true;
		}

		if (get) {
			processInfos = getViewInfos;
			tags = get.tags;
			deep = get.deep;
			tagName = get.name;
		}

		parentNode = parentNode
			? ("" + parentNode === parentNode
				? $(parentNode)[0]  // It is a string, so treat as selector
				: parentNode.jquery
					? parentNode[0] // A jQuery object - take first element.
					: parentNode)
			: (self.parentElem      // view.link()
				|| document.body);  // link(null, data) to link the whole document

		parentTag = parentNode.tagName.toLowerCase();
		elCnt = !!elContent[parentTag];

		prevNode = prevNode && markPrevOrNextNode(prevNode, elCnt);
		nextNode = nextNode && markPrevOrNextNode(nextNode, elCnt) || null;

		if (html !== undefined) {
			//================ Insert html into DOM using documentFragments (and wrapping HTML appropriately). ================
			// Also convert markers to DOM annotations, based on content model.
			// Corresponds to nextNode ? $(nextNode).before(html) : $(parentNode).html(html);
			// but allows insertion to wrap correctly even with inserted script nodes. jQuery version will fail e.g. under tbody or select.
			// This version should also be slightly faster
			div = document.createElement("div");
			wrapper = div;
			prevIds = ids = "";
			htmlTag = parentNode.namespaceURI === "http://www.w3.org/2000/svg" ? "svg" : (firstTag = rFirstElem.exec(html)) && firstTag[1] || "";
			if (noDomLevel0 && firstTag && firstTag[2]) {
				error("Unsupported: " + firstTag[2]); // For security reasons, don't allow insertion of elements with onFoo attributes.
			}
			if (elCnt) {
				// Now look for following view, and find its tokens, or if not found, get the parentNode._dfr tokens
				node = nextNode;
				while (node && !(nextView = viewInfos(node))) {
					node = node.nextSibling;
				}
				if (tokens = nextView ? nextView.tokens : parentNode._dfr) {
					token = prevView || "";
					if (refresh || !prevView) {
						token += "#" + thisId;
					}
					j = tokens.indexOf(token);
					if (j + 1) {
						j += token.length;
						// Transfer the initial tokens to inserted nodes, by setting them as the ids variable, picked up in convertMarkers
						prevIds = ids = tokens.slice(0, j);
						tokens = tokens.slice(j);
						if (nextView) {
							node.setAttribute(jsvAttrStr, tokens);
						} else {
							parentNode._dfr = tokens;
						}
					}
				}
			}

			//================ Convert the markers to DOM annotations, based on content model. ================
//			oldElCnt = elCnt;
			html = ("" + html).replace(rConvertMarkers, convertMarkers);
//			if (!!oldElCnt !== !!elCnt) {
//				error("Parse: " + html); // Parse error. Content not well-formed?
//			}
			// Append wrapper element to doc fragment
			safeFragment.appendChild(div);

			// Go to html and back, then peel off extra wrappers
			// Corresponds to jQuery $(nextNode).before(html) or $(parentNode).html(html);
			// but supports svg elements, and other features missing from jQuery version (and this version should also be slightly faster)
			htmlTag = wrapMap[htmlTag] || wrapMap.div;
			depth = htmlTag[0];
			wrapper.innerHTML = htmlTag[1] + html + htmlTag[2];
			while (depth--) {
				wrapper = wrapper.lastChild;
			}
			safeFragment.removeChild(div);
			fragment = document.createDocumentFragment();
			while (copiedNode = wrapper.firstChild) {
				fragment.appendChild(copiedNode);
			}
			// Insert into the DOM
			parentNode.insertBefore(fragment, nextNode);
		}

		if (lazyLink) {
			setTimeout(dataLink, 0);
		} else {
			dataLink();
		}

		return lazyLink && lazyLink.promise();
	}

	function addDataBinding(linkMarkup, node, currentView, data, boundTagId) {
		// Add data binding for data-linked elements or {^{...}} data-bound tags
		var tmpl, tokens, attr, convertBack, params, trimLen, tagExpr, linkFn, linkCtx, tag, rTagIndex;

		if (boundTagId) {
			// {^{...}} bound tag. So only one linkTag in linkMarkup
			tag = bindingStore[boundTagId];
			tag = tag.linkCtx ? tag.linkCtx.tag : tag;

			linkCtx = tag.linkCtx || {
				data: data,             // source
				elem: tag._elCnt ? tag.parentElem : node,             // target
				view: currentView,
				attr: "html", // Script marker nodes are associated with {^{ and always target HTML.
				fn: tag._.bnd,
				tag: tag,
				// Pass the boundTagId in the linkCtx, so that it can be picked up in observeAndBind
				_bndId: boundTagId
			};
			bindDataLinkTarget(linkCtx, linkCtx.fn);
		} else if (linkMarkup && node) {
			// Compiled linkFn expressions could be stored in the tmpl.links array of the template
			// TODO - consider also caching globally so that if {{:foo}} or data-link="foo" occurs in different places,
			// the compiled template for this is cached and only compiled once...
			//links = currentView.links || currentView.tmpl.links;

			tmpl = currentView.tmpl;

//			if (!(linkTags = links[linkMarkup])) {
			// This is the first time this view template has been linked, so we compile the data-link expressions, and store them on the template.

				linkMarkup = normalizeLinkTag(linkMarkup, node);
				rTag.lastIndex = 0;
				while (tokens = rTag.exec(linkMarkup)) { // TODO require } to be followed by whitespace or $, and remove the \}(!\}) option.
					// Iterate over the data-link expressions, for different target attrs,
					// (only one if there is a boundTagId - the case of data-bound tag {^{...}})
					// e.g. <input data-link="{:firstName:} title{>~description(firstName, lastName)}"
					// tokens: [all, attr, bindOnly, tagExpr, tagName, converter, colon, html, comment, code, params]
					rTagIndex = rTag.lastIndex;
					attr = boundTagId ? "html" : tokens[1]; // Script marker nodes are associated with {^{ and always target HTML.
					tagExpr = tokens[3];
					params = tokens[10];
					convertBack = undefined;

					linkCtx = {
						data: data,             // source
						elem: tag && tag._elCnt ? tag.parentElem : node,             // target
						view: currentView,
						attr: attr,
						_initVal: !tokens[2]
					};

					if (tokens[6]) {
						// TODO include this in the original rTag regex
						// Only for {:} link"

						if (!attr && (convertBack = /:([\w$]*)$/.exec(params))) {
							// two-way binding
							convertBack = convertBack[1];
							if (convertBack !== undefined) {
								// There is a convertBack function
								trimLen = - convertBack.length -1;
								tagExpr = tagExpr.slice(0, trimLen - 1) + delimCloseChar0; // Remove the convertBack string from expression.
								params = params.slice(0, trimLen);
							}
						}
						if (convertBack === null) {
							convertBack = undefined;
						}
						linkCtx.cvt = tokens[5] || "";
					}
					// Compile the linkFn expression which evaluates and binds a data-link expression
					// TODO - optimize for the case of simple data path with no conversion, helpers, etc.:
					//     i.e. data-link="a.b.c". Avoid creating new instances of Function every time. Can use a default function for all of these...

					linkCtx.expr = attr + tagExpr;
					linkFn = tmpl.links[tagExpr];
					if (!linkFn) {
						tmpl.links[tagExpr] = linkFn = $viewsSub.tmplFn(delimOpenChar0 + tagExpr + delimCloseChar1, tmpl, true, convertBack);
						$viewsSub.parse(params, linkFn.paths = [], tmpl);
					}
					linkCtx.fn = linkFn
					if (!attr && convertBack !== undefined) {
						// Default target, so allow 2 way binding
						linkCtx._cvtBk = convertBack;
					}

					bindDataLinkTarget(linkCtx, linkFn);
					// We store rTagIndex in local scope, since this addDataBinding method can sometimes be called recursively,
					// and each is using the same rTag instance.
					rTag.lastIndex = rTagIndex;
				}
	//		}
		}
	}

	function bindDataLinkTarget(linkCtx, linkFn) {
		// Add data link bindings for a link expression in data-link attribute markup
		function handler(ev, eventArgs) {
			propertyChangeHandler.call(linkCtx, ev, eventArgs, linkFn);
			// If the link expression uses a custom tag, the propertyChangeHandler call will call renderTag, which will set tagCtx on linkCtx
		}

// Consider for issue https://github.com/BorisMoore/jsviews/issues/158 arrayChange support on data-link etc.
		//handler.array = function() {
		//	...
		//}

		linkCtx._ctxCb = getContextCb(linkCtx.view); // _ctxCb is for filtering/appending to dependency paths: function(path, object) { return [(object|path)*]}
		linkCtx._hdlr = handler;
		if (linkCtx.tag && linkCtx.tag.onArrayChange) {
			handler.array = function(ev, eventArgs) {
				linkCtx.tag.onArrayChange(ev, eventArgs);
			}
		}
		handler(true);
	}

	//=====================
	// Data-linking helpers
	//=====================

	function removeSubStr(str, substr) {
		var k;
		return str
			? (k = str.indexOf(substr),
				(k + 1
					? str.slice(0, k) + str.slice(k + substr.length)
					: str))
			: "";
	}

	function markerNodeInfo(node) {
		return node &&
			("" + node === node
				? node
				: node.tagName === "SCRIPT"
					? node.type.slice(3)
					: node.nodeType === 1 && node.getAttribute(jsvAttrStr) || "");
	}

	function viewInfos(node, isVal, rBinding) {
		// Test whether node is a script marker nodes, and if so, return metadata
		function getInfos(all, open, close, id, ch, elPath) {
			infos.push({
				elCnt: elCnt,
				id: id,
				ch: ch,
				open: open,
				close: close,
				path: elPath,
				token: all
			});
		}
		var elCnt, tokens,
			infos = [];
		if (tokens = isVal ? node : markerNodeInfo(node)) {
			infos.elCnt = !node.type;
			elCnt = tokens.charAt(0) === "@" || !node.type;
			infos.tokens = tokens;
			// rMarkerTokens = /(?:(#)|(\/))(\d+)([_^])([-+@\d]+)?/g;
			tokens.replace(rBinding || rMarkerTokens, getInfos);
			return infos;
		}
	}

	function unmarkPrevOrNextNode(node, elCnt) {
		if (node) {
			if (node.type === "jsv") {
				node.parentNode.removeChild(node);
			} else if (elCnt && node.getAttribute($viewsLinkAttr) === "") {
				node.removeAttribute($viewsLinkAttr);
			}
		}
	}

	function markPrevOrNextNode(node, elCnt) {
		var marker = node;
		while (elCnt && marker && marker.nodeType !== 1) {
			marker = marker.previousSibling;
		}
		if (marker) {
			if (marker.nodeType !== 1) {
				// For text nodes, we will add a script node before
				marker = document.createElement("SCRIPT");
				marker.type = "jsv";
				node.parentNode.insertBefore(marker, node);
			} else if (!markerNodeInfo(marker) && !marker.getAttribute($viewsLinkAttr)) {
				// For element nodes, we will add a data-link attribute (unless there is already one)
				// so that this node gets included in the node linking process.
				marker.setAttribute($viewsLinkAttr, "");
			}
		}
		return marker;
	}

	function normalizeLinkTag(linkMarkup, node) {
		linkMarkup = $.trim(linkMarkup);
		return linkMarkup.slice(-1) !== delimCloseChar0
		// If simplified syntax is used: data-link="expression", convert to data-link="{:expression}",
		// or for inputs, data-link="{:expression:}" for (default) two-way binding
			? linkMarkup = delimOpenChar1 + ":" + linkMarkup + (defaultAttr(node) ? ":" : "") + delimCloseChar0
			: linkMarkup;
	}

	//===========================
	// Methods for views and tags
	//===========================

	function getContents(select, deep) {
		// For a view or a tag, return jQuery object with the content nodes,
		var filtered,
			nodes = $(this.nodes());
		if (nodes[0]) {
			filtered = select ? nodes.filter(select) : nodes;
			nodes = deep && select ? filtered.add(nodes.find(select)) : filtered;
		}
		return nodes;
	}

	function getNodes(withMarkers, prevNode, nextNode) {
		// For a view or a tag, return top-level nodes
		// Do not return any script marker nodes, unless withMarkers is true
		// Optionally limit range, by passing in prevNode or nextNode parameters

		var node,
			self = this,
			elCnt = self._elCnt,
			prevIsFirstNode = !prevNode && elCnt,
			nodes = [];

		prevNode = prevNode || self._prv;
		nextNode = nextNode || self._nxt;

		node = prevIsFirstNode
			? (prevNode === self._nxt
				? self.parentElem.lastSibling
				: prevNode)
			: (self._.inline === false
				? prevNode || self.linkCtx.elem.firstChild
				: prevNode && prevNode.nextSibling);

		while (node && (!nextNode || node !== nextNode)) {
			if (withMarkers || elCnt || !markerNodeInfo(node)) {
				// All the top-level nodes in the view
				// (except script marker nodes, unless withMarkers = true)
				// (Note: If a script marker node, viewInfo.elCnt undefined)
				nodes.push(node);
			}
			node = node.nextSibling;
		}
		return nodes;
	}

	function getChildTags(deep, tagName) {
		// For a view or a tag, return child tags - at any depth, or as immediate children only.
		if (deep !== !!deep) {
			// deep not boolean, so this is childTags(tagName) - which looks for top-level tags of given tagName
			tagName = deep;
			deep = undefined;
		}

		var self = this,
			view = self.link ? self : self.tagCtx.view, // this may be a view or a tag. If a tag, get the view from tag.view.tagCtx
			prevNode = self._prv,
			elCnt = self._elCnt,
			tags = [];

		if (prevNode) {
			view.link(
				undefined,
				self.parentElem,
				elCnt ? prevNode.previousSibling : prevNode,
				self._nxt,
				undefined,
				{get:{tags:tags, deep: deep, name: tagName, id: elCnt && self._tgId}}
			);
		}
		return tags;
	}

	function refreshTag(sourceValue) {
		var skipBinding, nodesToRemove, promise,
			tag = this,
			target = tag.parentElem,
			view = tag.tagCtx.view,
			prevNode = tag._prv,
			nextNode = tag._nxt,
			elCnt = tag._elCnt,
			inline = tag._.inline,
			props = tag.tagCtx.props;

		if (tag.disposed) { error("Removed tag"); }
		if (sourceValue === undefined) {
			sourceValue = tag._.bnd.call(view.tmpl, view.data, view, $views); // get tagCtxs
			if (inline) {
				sourceValue = $views._tag(tag, view, view.tmpl, sourceValue); // get rendered HTML for tag
			}
		}
		if (!tag.flow && !tag.render && !tag.template) {
			// We allow a data-linked tag control which does not render to set content on the data-linked element during init, onBeforeLink and onAfterLink
		} else if (inline) {
			nodesToRemove = tag.nodes(true);

			if (elCnt) {
				if (prevNode && prevNode !== nextNode) {
					// This prevNode will be removed from the DOM, so transfer the view tokens on prevNode to nextNode of this 'viewToRefresh'
					transferViewTokens(prevNode, nextNode, target, tag._tgId, "^", true);
				}
				prevNode = prevNode
					? prevNode.previousSibling
					: nextNode
						? nextNode.previousSibling
						: target.lastChild;
			}
			// Remove HTML nodes
			$(nodesToRemove).remove();
		} else {
			// data-linked value using converter(s): data-link="{cvt: ... :cvtBack}" or tag: data-link="{tagname ...}"
			if (!tag.flow && props.inline) {
				// data-link="{tagname ...}"
				view._.tag = tag;
				sourceValue = addBindingMarkers(sourceValue, view, true);
				view._.tag = undefined;
				skipBinding = tag._.inline = true;
			}

			$(target).empty();
		}
		// Data link the new contents of the target node
		if (!skipBinding && tag.onBeforeLink) {
			tag.onBeforeLink();
		}
		promise = view.link(view.data, target, prevNode, nextNode, sourceValue, tag && {tag: tag._tgId, lazyLink: props.lazyLink});
		if (!skipBinding && tag.onAfterLink) {
			if (promise) {
				promise.then(function () {
					tag.onAfterLink();
				});
			} else {
				tag.onAfterLink();
			}
		}
		return promise || tag;
	}

	//=========
	// Disposal
	//=========

	function clean(elems) {
		// Remove data-link bindings, or contained views
		var j, l, l2, elem, vwInfos, vwItem, bindings,
			elemArray = [],
			len = elems.length,
			i = len;
		while (i--) {
			// Copy into an array, so that deletion of nodes from DOM will not cause our 'i' counter to get shifted
			// (Note: This seems as fast or faster than elemArray = [].slice.call(elems); ...)
			elemArray.push(elems[i]);
		}
		i = len;
		while (i--) {
			elem = elemArray[i];
			if (elem.parentNode) {
				// Has not already been removed from the DOM
				if (bindings = elem._jsvBnd) {
					// Get propertyChange bindings for this element
					// This may be an element with data-link, or the opening script marker node for a data-bound tag {^{...}}
					// bindings is a string with the syntax: "(&bindingId)*"
					bindings = bindings.slice(1).split("&");
					elem._jsvBnd = "";
					l = bindings.length;
					while (l--) {
						// Remove associated bindings
						removeViewBinding(bindings[l]); // unbind bindings with this bindingId on this view
					}
				}
				if (vwInfos = viewInfos(markerNodeInfo(elem) + (elem._dfr || ""), true, rOpenMarkers)) {
					for (j = 0, l2 = vwInfos.length; j < l2; j++) {
						vwItem = vwInfos[j];
						if (vwItem.ch === "_") {
							if ((vwItem = viewStore[vwItem.id]) && vwItem.data !== undefined) {
								// If this is the _prv (prevNode) for a view, remove the view
								// - unless view.data is undefined, in which case it is already being removed
								vwItem.parent.removeViews(vwItem._.key, undefined, true);
							}
						} else {
							removeViewBinding(vwItem.id); // unbind bindings with this bindingId on this view
						}
					}
				}
			}
		}
	}

	function removeViewBinding(bindId) {
		// Unbind
		var objId, linkCtx, tag, object, obsId,
			binding = bindingStore[bindId];
		if (binding) {
			for (objId in binding.bnd) {
				object = binding.bnd[objId];
				obsId = ".obs" + binding.cbId;
				if ($.isArray(object)) {
					$([object]).off(arrayChangeStr + obsId).off(propertyChangeStr + obsId); // There may be either or both of arrayChange and propertyChange
				} else {
					$(object).off(propertyChangeStr + obsId);
				}
				delete binding.bnd[objId];
			}

			linkCtx = binding.linkCtx;
			if (tag = linkCtx.tag) {
				if (tag.onDispose) {
					tag.onDispose();
				}
				if (!tag._elCnt) {
					tag._prv && tag._prv.parentNode.removeChild(tag._prv);
					tag._nxt && tag._nxt.parentNode.removeChild(tag._nxt);
				}
				tag.disposed = true;
			}
			delete linkCtx.view._.bnds[bindId];
			delete bindingStore[bindId];
			delete $viewsSub._cbBnds[binding.cbId];
		}
	}

	function $unlink(tmplOrLinkTag, to) {
		if (!arguments.length) {
			// Call to $.unlink() is equivalent to $.unlink(true, "body")
			if (activeBody) {
				$(activeBody).off(elementChangeStr, elemChangeHandler);
				activeBody = undefined;
			}
			tmplOrLinkTag = true;
			topView.removeViews();
			clean(document.body.getElementsByTagName("*"));
		} else if (to) {
			to = to.jquery ? to : $(to); // to is a jquery object or an element or selector
			if (tmplOrLinkTag === true) {
				// Call to $(el).unlink(true) - unlink content of element, but don't remove bindings on element itself
				$.each(to, function() {
					var innerView;
//TODO fix this for better perf. Rather that calling inner view multiple times which does querySelectorAll each time, consider a single querySelectorAll
// or simply call view.removeViews() on the top-level views under the target 'to' node, then clean(...)
					while ((innerView = $view(this, true)) && innerView.parent) {
						innerView.parent.removeViews(innerView._.key, undefined, true);
					}
					clean(this.getElementsByTagName("*"));
				});
			} else if (tmplOrLinkTag === undefined) {
				// Call to $(el).unlink()
				clean(to);
//TODO provide this unlink API
//			} else if ("" + tmplOrLinkTag === tmplOrLinkTag) {
//				// Call to $(el).unlink(tmplOrLinkTag ...)
//				$.each(to, function() {
//					...
//				});
			}
//TODO - unlink the content and the arrayChange, but not any other bindings on the element (if container rather than "replace")
		}
		return to; // Allow chaining, to attach event handlers, etc.
	}

	function tmplUnlink(to, from) {
		return $unlink(this, to, from);
	}

	//========
	// Helpers
	//========

	function getContextCb(view) {
		// TODO Consider exposing or allowing override, as public API
		view = view || $.view();
		return function(path, object) {
			// TODO consider only calling the contextCb on the initial token in path '~a.b.c' and not calling again on
			// the individual tokens, 'a', 'b', 'c'...  Currently it is called multiple times
			var tokens, tag,
				items = [object];
			if (view && path) {
				if (path._jsvOb){
					return path._jsvOb.call(view.tmpl, object, view, $views);
				} else if (path.charAt(0) === "~") {
					// We return new items to insert into the sequence, replacing the "~a.b.c" string:
					// [helperObject 'a', "a.b.c" currentDataItem] so currentDataItem becomes the object for subsequent paths.
					if (path.slice(0, 4) === "~tag") {
						tag = view.ctx;
						if (path.charAt(4) === ".") {
							// "~tag.xxx"
							tokens = path.slice(5).split(".");
							tag = tag.tag;
						}
						if (tokens) {
							return tag ? [tag, tokens.join("."), object] : [];
						}
					}
					path = path.slice(1).split(".");
					if (object = view.hlp(path.shift())) {
						if (path.length) {
							items.unshift(path.join("."));
						}
						items.unshift(object);
					}
					return object ? items: [];
				}
				if (path.charAt(0) === "#") {
					// We return new items to insert into the sequence, replacing the "#a.b.c" string: [view, "a.b.c" currentDataItem]
					// so currentDataItem becomes the object for subsequent paths. The 'true' flag makes the paths bind only to leaf changes.
					return path === "#data" ? [] :[view, path.replace(rViewPath, ""), object];
				}
			}
		};
	}

	function inputAttrib(elem) {
		return elem.type === "checkbox" ? elem.checked : elem.value;
	}

	//========================== Initialize ==========================

	//=====================
	// JsRender integration
	//=====================

	$viewsSub.onStoreItem = function(store, name, item) {
		if (item && store === $templates) {
			item.link = tmplLink;
			item.unlink = tmplUnlink;
			if (name) {
				$.link[name] = function() {
					return tmplLink.apply(item, arguments);
				};
				$.unlink[name] = function() {
					return tmplUnlink.apply(item, arguments);
				};
			}
		}
	};

	// Initialize default delimiters
	($viewsSettings.delimiters = function() {
		var delimChars = oldJsvDelimiters.apply($views, arguments);
		delimOpenChar0 = delimChars[0];
		delimOpenChar1 = delimChars[1];
		delimCloseChar0 = delimChars[2];
		delimCloseChar1 = delimChars[3];
		linkChar = delimChars[4];
		rTag = new RegExp("(?:^|\\s*)([\\w-]*)(\\" + linkChar + ")?(\\" + delimOpenChar1 + $viewsSub.rTag + "\\" + delimCloseChar0 + ")", "g");

		// Default rTag:      attr  bind tagExpr   tag         converter colon html     comment            code      params
		//          (?:^|\s*)([\w-]*)(\^)?({(?:(?:(\w+(?=[\/\s}]))|(?:(\w+)?(:)|(>)|!--((?:[^-]|-(?!-))*)--|(\*)))\s*((?:[^}]|}(?!}))*?))})
		return this;
	})();

	//===============
	// Public helpers
	//===============

	$viewsSub.viewInfos = viewInfos;
	// Expose viewInfos() as public helper method

	//====================================
	// Additional members for linked views
	//====================================

	function transferViewTokens(prevNode, nextNode, parentElem, id, viewOrTagChar, refresh) {
		// Transfer tokens on prevNode of viewToRemove/viewToRefresh to nextNode or parentElem._dfr
		var i, l, vwInfos, vwInfo, viewOrTag, viewId, tokens,
			precedingLength = 0,
			emptyView = prevNode === nextNode;

		if (prevNode) {
			// prevNode is either the first node in the viewOrTag, or has been replaced by the vwInfos tokens string
			vwInfos = viewInfos(prevNode) || [];
			for (i = 0, l = vwInfos.length; i < l; i++) {
				// Step through views or tags on the prevNode
				vwInfo = vwInfos[i];
				viewId = vwInfo.id;
				if (viewId === id && vwInfo.ch === viewOrTagChar) {
					if (refresh) {
						// This is viewOrTagToRefresh, this is the last viewOrTag to process...
						l = 0;
					} else {
						// This is viewOrTagToRemove, so we are done...
						break;
					}
				}
				if (!emptyView) {
					viewOrTag = vwInfo.ch === "_"
						? viewStore[viewId]
						: bindingStore[viewId].linkCtx.tag;
					if (vwInfo.open) {
						// A "#m" token
						viewOrTag._prv = nextNode;
					} else if (vwInfo.close) {
						// A "/m" token
						viewOrTag._nxt = nextNode;
					}
				}
				precedingLength += viewId.length + 2;
			}

			if (precedingLength) {
				prevNode.setAttribute(jsvAttrStr, prevNode.getAttribute(jsvAttrStr).slice(precedingLength));
			}
			tokens = nextNode ? nextNode.getAttribute(jsvAttrStr) : parentElem._dfr;
			if (l = tokens.indexOf("/" + id + viewOrTagChar) + 1) {
				tokens = vwInfos.tokens.slice(0, precedingLength) + tokens.slice(l + (refresh ? -1 : id.length + 1));
			}
			if (tokens) {
				if (nextNode) {
					// If viewOrTagToRemove was an empty viewOrTag, we will remove both #n and /n
					// (and any intervening tokens) from the nextNode (=== prevNode)
					// If viewOrTagToRemove was not empty, we will take tokens preceding #n from prevNode,
					// and concatenate with tokens following /n on nextNode
					nextNode.setAttribute(jsvAttrStr, tokens);
				} else {
					parentElem._dfr = tokens;
				}
			}
		} else {
			// !prevNode, so there may be a deferred nodes token on the parentElem. Remove it.
			parentElem._dfr = removeSubStr(parentElem._dfr, "#" + id + viewOrTagChar);
			if (!refresh && !nextNode) {
				// If this viewOrTag is being removed, and there was no .nxt, remove closing token from deferred tokens
				parentElem._dfr = removeSubStr(parentElem._dfr, "/" + id + viewOrTagChar);
			}
		}
	}

	LinkedView = {
		// Note: a linked view will also, after linking have nodes[], _prv (prevNode), _nxt (nextNode) ...
		addViews: function(index, dataItems, tmpl) {
			// if view is not an array view, do nothing
			var i, viewsCount,
				self = this,
				itemsCount = dataItems.length,
				views = self.views;

			if (!self._.useKey && itemsCount && (tmpl = self.tmpl)) {
				// view is of type "array"
				// Use passed-in template if provided, since self added view may use a different template than the original one used to render the array.
				viewsCount = views.length + itemsCount;

				if (renderAndLink(self, index, tmpl, views, dataItems, self.ctx) !== false) {
					for (i = index + itemsCount; i < viewsCount; i++) {
						$observable(views[i]).setProperty("index", i);
						//This is fixing up index, but not key, and not index on child views. From child views, use view.get("item").index.
					}
				}
			}
			return self;
		},

		removeViews: function(index, itemsCount, keepNodes) {
			// view.removeViews() removes all the child views
			// view.removeViews( index ) removes the child view with specified index or key
			// view.removeViews( index, count ) removes the specified nummber of child views, starting with the specified index
			function removeView(index) {
				var id, bindId, parentElem, prevNode, nextNode, nodesToRemove,
					viewToRemove = views[index];

				if (viewToRemove && viewToRemove.link) {
					id = viewToRemove._.id;
					if (!keepNodes) {
						// Remove the HTML nodes from the DOM, unless they have already been removed, including nodes of child views
						nodesToRemove = viewToRemove.nodes();
					}

					// Remove child views, without removing nodes
					viewToRemove.removeViews(undefined, undefined, true);

					viewToRemove.data = undefined; // Set data to undefined: used as a flag that this view is being removed
					prevNode = viewToRemove._prv;
					nextNode = viewToRemove._nxt;
					parentElem = viewToRemove.parentElem;
					// If prevNode and nextNode are the same, the view is empty
					if (!keepNodes) {
						// Remove the HTML nodes from the DOM, unless they have already been removed, including nodes of child views
						if (viewToRemove._elCnt) {
							// if keepNodes is false (and transferring of tokens has not already been done at a higher level)
							// then transfer tokens from prevNode which is being removed, to nextNode.
							transferViewTokens(prevNode, nextNode, parentElem, id, "_");
						}
						$(nodesToRemove).remove();
					}
					if (!viewToRemove._elCnt) {
						prevNode.parentNode && parentElem.removeChild(prevNode);
						nextNode.parentNode && parentElem.removeChild(nextNode);
					}
					setArrayChangeLink(viewToRemove);
					for (bindId in viewToRemove._.bnds) {
						removeViewBinding(bindId);
					}
					delete viewStore[id];
				}
			}

			var current, view, viewsCount,
				self = this,
				isArray = !self._.useKey,
				views = self.views;

			if (isArray) {
				viewsCount = views.length;
			}
			if (index === undefined) {
				// Remove all child views
				if (isArray) {
					// views and data are arrays
					current = viewsCount;
					while (current--) {
						removeView(current);
					}
					self.views = [];
				} else {
					// views and data are objects
					for (view in views) {
						// Remove by key
						removeView(view);
					}
					self.views = {};
				}
			} else {
				if (itemsCount === undefined) {
					if (isArray) {
						// The parentView is data array view.
						// Set itemsCount to 1, to remove this item
						itemsCount = 1;
					} else {
						// Remove child view with key 'index'
						removeView(index);
						delete views[index];
					}
				}
				if (isArray && itemsCount) {
					current = index + itemsCount;
					// Remove indexed items (parentView is data array view);
					while (current-- > index) {
						removeView(current);
					}
					views.splice(index, itemsCount);
					if (viewsCount = views.length) {
						// Fixup index on following view items...
						while (index < viewsCount) {
							$observable(views[index]).setProperty("index", index++);
						}
					}
				}
			}
			return this;
		},

		refresh: function(context) {
			var self = this,
				parent = self.parent;

			if (parent) {
				renderAndLink(self, self.index, self.tmpl, parent.views, self.data, context, true);
				setArrayChangeLink(self);
			}
			return self;
		},

		nodes: getNodes,
		contents: getContents,
		childTags: getChildTags,
		link: viewLink
	};

	//=========================
	// Extend $.views.settings
	//=========================

	$viewsSettings.merge = {
		input: {
			from: { fromAttr: inputAttrib }, to: { toAttr: "value" }
		},
		textarea: valueBinding,
		select: valueBinding,
		optgroup: {
			from: { fromAttr: "label" }, to: { toAttr: "label" }
		}
	};

	if ($viewsSettings.debugMode) {
		// In debug mode create global for accessing views, etc
		validate = !$viewsSettings.noValidate;
		global._jsv = {
			views: viewStore,
			bindings: bindingStore
		};
	}

	//========================
	// Extend jQuery namespace
	//========================

	$extend($, {

		//=======================
		// jQuery $.view() plugin
		//=======================

		view: $views.view = $view = function(node, inner, type) {
			// $.view() returns top view
			// $.view(node) returns view that contains node
			// $.view(selector) returns view that contains first selected element
			// $.view(nodeOrSelector, type) returns nearest containing view of given type
			// $.view(nodeOrSelector, "root") returns root containing view (child of top view)
			// $.view(nodeOrSelector, true, type) returns nearest inner (contained) view of given type

			if (inner !== !!inner) {
				// inner not boolean, so this is view(nodeOrSelector, type)
				type = inner;
				inner = undefined;
			}
			var view, vwInfos, i, j, k, l, elem, elems,
				level = 0,
				body = document.body;

			if (node && node !== body && topView._.useKey > 1) {
				// Perf optimization for common cases

				node = "" + node === node
					? $(node)[0]
					: node.jquery
						? node[0]
						: node;

				if (node) {
					if (inner) {
						// Treat supplied node as a container element and return the first view encountered.
						elems = qsa ? node.querySelectorAll(bindElsSel) : $(bindElsSel, node).get();
						l = elems.length;
						for (i = 0; i < l; i++) {
							elem = elems[i];
							vwInfos = viewInfos(elem, undefined, rOpenViewMarkers);

							for (j = 0, k = vwInfos.length; j < k; j++) {
								view = vwInfos[j];
								if (view = viewStore[view.id]) {
									view = view && type ? view.get(true, type) : view;
									if (view) {
										return view;
									}
								}
							}
						}
					} else {
						while (node) {
							// Move back through siblings and up through parents to find preceding node which is a _prv (prevNode)
							// script marker node for a non-element-content view, or a _prv (first node) for an elCnt view
							if (vwInfos = viewInfos(node, undefined, rViewMarkers)) {
								l = vwInfos.length;
								while (l--) {
									view = vwInfos[l];
									if (view.open) {
										if (level < 1) {
											view = viewStore[view.id];
											return view && type ? view.get(type) : view || topView;
										}
										level--;
									} else {
										// level starts at zero. If we hit a view.close, then we move level to 1, and we don't return a view until
										// we are back at level zero (or a parent view with level < 0)
										level++;
									}
								}
							}
							node = node.previousSibling || node.parentNode;
						}
					}
				}
			}
			return inner ? undefined : topView;
		},

		link: $views.link = $link,
		unlink: $views.unlink = $unlink,

		//=====================
		// override $.cleanData
		//=====================
		cleanData: function(elems) {
			if (elems.length) {
				// Remove JsViews bindings. Also, remove from the DOM any corresponding script marker nodes
				clean(elems);
				// (elems HTMLCollection no longer includes removed script marker nodes)
				oldCleanData.call($, elems);
			}
		}
	});

	//===============================
	// Extend jQuery instance plugins
	//===============================

	$extend($.fn, {
		link: function(expr, from, context, parentView, prevNode, nextNode) {
			return $link(expr, this, from, context, parentView, prevNode, nextNode);
		},
		unlink: function(expr) {
			return $unlink(expr, this);
		},
		view: function(type) {
			return $view(this[0], type);
		}
	});

	//===============
	// Extend topView
	//===============

	$extend(topView, { tmpl: { links: {}, tags: {} }});
	$extend(topView, LinkedView);
	topView._.onRender = addBindingMarkers;

})(this, this.jQuery);
