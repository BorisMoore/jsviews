/*! JsViews v1.0pre: http://github.com/BorisMoore/jsviews */
/*
* Interactive data-driven views using templates and data-linking.
* Requires jQuery, and jsrender.js (next-generation jQuery Templates, optimized for pure string-based rendering)
*    See JsRender at http://github.com/BorisMoore/jsrender
*
* Copyright 2012, Boris Moore
* Released under the MIT License.
*/
// informal pre beta commit counter: 24

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

		LinkedView, activeBody, $view, rTag, delimOpenChar0, delimOpenChar1, delimCloseChar0, delimCloseChar1, linkChar,
		document = global.document,
		$views = $.views,
		$viewsSub = $views.sub,
		$viewsSettings = $views.settings,
		$extend = $viewsSub.extend,
		FALSE = false, TRUE = true, NULL = null, CHECKBOX = "checkbox",
		topView = $views.View(undefined, "top"), // Top-level view
		$isArray = $.isArray,
		$isFunction = $.isFunction,
		$templates = $views.templates,
		$observable = $.observable,
		$observe = $observable.observe,
		jsvAttrStr = "data-jsv",
		$viewsLinkAttr = $viewsSettings.linkAttr || "data-link",        // Allows override on settings prior to loading jquery.views.js
		propertyChangeStr = $viewsSettings.propChng = $viewsSettings.propChng || "propertyChange",// These two settings can be overridden on settings after loading
		arrayChangeStr = $viewsSettings.arrChng = $viewsSettings.arrChng || "arrayChange",        // jsRender, and prior to loading jquery.observable.js and/or JsViews 
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
		rFirstElem = /<(?!script)(\w+)[>\s]/,
		safeFragment = document.createDocumentFragment(),
		qsa = document.querySelector,

		// elContent maps tagNames which have only element content, so may not support script nodes.
		elContent = { ol: 1, ul: 1, table: 1, tbody: 1, thead: 1, tfoot: 1, tr: 1, colgroup: 1, dl: 1, select: 1, optgroup: 1 },

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
		displayStyles = {},
		bindingKey = 1,
		viewStore = { 0: topView },
		bindingStore = {},
		rViewPath = /^#(view\.?)?/,
		rConvertMarkers = /(^|(\/>)|(<\/\w+>)|>|)(\s*)_([#\/]\^?\d+)_`(\s*)(<\w+(?=[\s\/>]))?|\s*(?:(<\w+(?=[\s\/>]))|(<\/\w+>)(\s*)|(\/>)\s*)/g,
		rJsvNodeMarker = /(jsv)?(?:(#)|(\/)|(#\^)|(\/\^)|(\|))(\d+)([-+@\d]+)?/g;

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
				binding = bindingStore[bindings[l]];
				linkCtx = binding.linkCtx;
				view = linkCtx.view;
				if (to = binding.to) {
					// The binding has a 'to' field, which is of the form [[targetObject, toPath], cvtBack]
					$source = $(source);
					onBeforeChange = view._hlp(onBeforeChangeStr);
					onAfterChange = view._hlp(onAfterChangeStr);
					fromAttr = defaultAttr(source);
					setter = fnSetters[fromAttr];
					sourceValue = $isFunction(fromAttr) ? fromAttr(source) : setter ? $source[setter]() : $source.attr(fromAttr);

					if ((!onBeforeChange || !(cancel = onBeforeChange.call(view, ev) === FALSE)) && sourceValue !== undefined) {
						cnvtName = to[1];
						to = to[0]; // [object, path] or [object, true, path]
						target = to[0];
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
							try {
// TODO add support for _parameterized_ set() and depends() on computed observables //$observable(target).setProperty(to, sourceValue, args);
// Consider getting args by a compiled version of linkFn that just returns the current args. args = linkFnArgs.call(linkCtx, target, view, $views);
								if ($isFunction(target)) {
									target = target.set;
									if ($isFunction(target)) {
										target.call(linkCtx, sourceValue);
									}
								} else {
									$observable(target).setProperty(to, sourceValue);
								}
							} catch(e) {
								error(e);
							}
							if (onAfterChange) {  // TODO only call this if the target property changed
								onAfterChange.call(linkCtx, ev);
							}
						}
						//ev.stopPropagation(); // Stop bubbling
					}
					if (cancel) {
						ev.stopImmediatePropagation();
					}
				}
			}
		}
	}

	function propertyChangeHandler(ev, eventArgs, linkFn) {
		var attr, setter, changed, sourceValue, css, tag, ctx, prevNode, nextNode, oldLinkCtx,

			linkCtx = this,
			oldTag = linkCtx.tag || {},
			source = linkCtx.data,
			target = linkCtx.elem,
			parentElem = target.parentNode,
			containerElem = parentElem,
			$target = $(target),
			view = linkCtx.view,
			onEvent = view._hlp(onBeforeChangeStr);

		if (parentElem && (!onEvent || !(eventArgs && onEvent.call(linkCtx, ev, eventArgs) === FALSE))
				// If data changed, the ev.data is set to be the path. Use that to filter the handler action...
				&& !(eventArgs && ev.data.prop !== "*" && ev.data.prop !== eventArgs.path)) {

			// Set linkCtx on view, dynamically, just during this handler call
			oldLinkCtx = view.linkCtx;
			view.linkCtx = linkCtx;
			if (eventArgs) {
				linkCtx.eventArgs = eventArgs;
			}
			if (eventArgs || linkCtx._initVal) {
				delete linkCtx._initVal;
				sourceValue = linkFn.call(linkCtx, source, view, $views);
				// Compiled link expression for linkTag - call renderTag, etc.

				attr = linkCtx.attr || defaultAttr(target, TRUE); // May have been modified by render
				if (tag = linkCtx.tag) {
					tag.parentElem = parentElem;
				}
				tag = tag || {};
				ctx = tag.ctx;
				if ($isFunction(sourceValue)) {
					error(linkCtx.expr + ": missing parens");
				}

// TODO			var  cancel = attr === "none";
//				var tagCtx = linkCtx.tagCtx;
//				if (eventArgs && tagCtx && tagCtx.tag.onUpdate) {
//					cancel = tagCtx.tag.onUpdate.call(tagCtx, ev, eventArgs, linkCtx) === FALSE || cancel;
//				}
//				if (cancel) {
//					return;
//				}
				if (attr === "none") {
					return;
				}
				if (attr === "visible") {
					attr = "css-display";
					sourceValue = sourceValue && sourceValue !== "false"
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
				} else {
					if (attr === "value") {
						if (target.type === CHECKBOX) {
							attr = "checked";
							// We will set the "checked" attribute
							sourceValue = (sourceValue && sourceValue !== "false") ? attr : undefined;
							// We will compare this ("checked"/undefined) with the current value
						}
					} else if (attr === "radio") {
						// This is a special binding attribute for radio buttons, which corresponds to the default 'to' binding.
						// This allows binding both to value (for each input) and to the default checked radio button (for each input in named group, e.g. binding to parent data).
						// Place value binding first: <input type="radio" data-link="value{:name} {:#get('data').data.currency:} " .../>
						// or (allowing any order for the binding expressions): <input type="radio" value="{{:name}}" data-link="{:#get('data').data.currency:} value^{:name}" .../>

						if (target.value === ("" + sourceValue)) {
							// If the data value corresponds to the value attribute of this radio button input, set the checked attribute to "checked"
							sourceValue = attr = "checked";
						} else {
							// Otherwise, go straight to observeAndBind, without updating.
							// (The browser will remove the 'checked' attribute, when another radio button in the group is checked).
							observeAndBind(linkCtx, linkCtx.data, linkCtx.elem); //TODO ? linkFnArgs);
							return;
						}
					}

					setter = fnSetters[attr];

					if (setter) {
						if (tag || (changed = $target[setter]() !== sourceValue)) {
// TODO support for testing whether {^{: or {^{tag have changed or not
// Make {^{ default to 'innerText', and let {^html{ target html. This will be consistent with data-link="html{:...}"

							if (attr === "html") {
								if (viewInfos(target, TRUE)) {
									// data-bound tag: {^{tagname ...}}
									// If tag.nodes is defined, remove previously rendered content;
									oldTag.nodes && $(oldTag.nodes(TRUE)).remove();
									prevNode = target;
									nextNode = target.nextSibling;
								} else {
									// data-linked tag: data-link="{tagname ...}"
									$target.empty();
									containerElem = target;
								}
								// This is a data-link="html{tagname ...}" or {^{tagname ...}} update, so need to link new content
//TODO							// Provide expando on target element, to get to tag instances,
//								// which can be accessed using $.views.findTags(nodeOrSelector)
//								if (ctx) {
//									target._tags = target._tags ? $extend(target._tags, ctx.tags) : ctx.tags; // Merge, and replace old versions with updated versions.
//								}

								// Data link the new contents of the target node
								if (tag.onBeforeLink) {
									tag.onBeforeLink();
								}

								view.link(source, containerElem, prevNode, nextNode, sourceValue);

								tagOnAfterLink(tag);

							} else if (attr === "text" && !target.children[0]) {
								// This code is faster then $target,text()
								if (target.textContent !== undefined) {
									target.textContent = sourceValue;
								} else {
									target.innerText = sourceValue;
								}
							} else {
								$target[setter](sourceValue);
							}
							if (target.nodeName.toLowerCase() === "input") {
								$target.blur(); // Issue with IE. This ensures HTML rendering is updated.
							}
						}
					} else if (changed = $target.attr(attr) != sourceValue) {
						// Setting an attribute to the empty string or undefined should remove the attribute
						$target.attr(attr, (sourceValue === undefined || sourceValue === "") ? NULL : sourceValue);
					}
				}

				if (eventArgs && changed && (onEvent = view._hlp(onAfterChangeStr))) {
					onEvent.call(linkCtx, ev, eventArgs);
				}
			}
// TODO add support for _parameterized_ set() and depends() on computed observables //$observable(target).setProperty(to, sourceValue, args);
// Consider getting args by a compiled version of linkFn that just returns the current args. args = linkFnArgs.call(linkCtx, target, view, $views);
			observeAndBind(linkCtx, source, target);

			// Remove dynamically added linkCtx from view
			if (oldLinkCtx) {
				view.linkCtx = oldLinkCtx;
			} else {
				delete view.linkCtx;
			}
		}
	}

	function arrayChangeHandler(ev, eventArgs) {
		var self = this,
			onBeforeChange = self._hlp(onBeforeChangeStr),
			onAfterChange = self._hlp(onAfterChangeStr);

		if (!onBeforeChange || onBeforeChange.call(this, ev, eventArgs) !== FALSE) {
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
		var handler,
			data = view.data,
			onArrayChange = view._onArrayChange;

		if (!view._.useKey) {
			// This is an array view. (view._.useKey not defined => data is array)

			if (onArrayChange) {
				// First remove the current handler if there is one
				$([onArrayChange[1]]).off(arrayChangeStr, onArrayChange[0]);
				view._onArrayChange = undefined;
			}

			if (data) {
				// If this view is not being removed, but the data array has been replaced, then bind to the new data array
				handler = function() {
					if (view.data !== undefined) {
						// If view.data is undefined, do nothing. (Corresponds to case where there is another handler on the same data whose
						// effect was to remove this view, and which happened to precede this event in the trigger sequence. So although this
						// event has been removed now, it is still called since already on the trigger sequence)
						arrayChangeHandler.apply(view, arguments);
					}
				};
				$([data]).on(arrayChangeStr, handler);
				view._onArrayChange = [handler, data];
			}
		}
	}

	function defaultAttr(elem, to) {
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
				? "html" // Default is to bind to innerText. Use html{:...} to bind to innerHTML
				: ""; // Default is not to bind from
	}

	//==============================
	// Rendering and DOM insertion
	//==============================

	function renderAndLink(view, index, tmpl, views, data, context, refresh) {
		var l, html, linkToNode, prevView, tag, vw, vwInfos, nodesToRemove,
			parentNode = view.parentElem,
			prevNode = view._prv,
			nextNode = view._nxt,
			elCnt = view._elCnt;

		if (prevNode && prevNode.parentNode !== parentNode) {
			return FALSE;
			// Abandon, since node or view has already been removed, or wrapper element has been inserted between prevNode and parentNode
		}

		if (refresh) {
			nodesToRemove = view.nodes();
			if (elCnt && prevNode && prevNode !== nextNode) {
				vwInfos = viewInfos(prevNode);
				// This node will be removed from the DOM so remove data-jsv attribute to avoid re-triggering removal of the view
				prevNode.removeAttribute(jsvAttrStr);
				l = vwInfos.length;
				while (l--) {
					vw = vwInfos[l];
					if (vw.open) {
						viewStore[vw.id]._prv = vwInfos.tokens;
					}
				}
			}

			// Remove child views
			view.removeViews(undefined, undefined, TRUE);

			linkToNode = nextNode;
			prevNode = elCnt ? prevNode && prevNode.previousSibling : prevNode;

			// Remove HTML nodes
			$(nodesToRemove).remove();
		} else { // addViews. Only called if view is of type "array"
			if (index) {
				// index is a number, so indexed view in view array
				prevView = views[index - 1];
				if (!prevView) {
					return FALSE; // If subview for provided index does not exist, do nothing
				}
				prevNode = prevView._nxt;
			}
			if (elCnt) {
				linkToNode = prevNode;
				prevNode = linkToNode
					? linkToNode.previousSibling         // There is a linkToNode, so insert after previousSibling, or at the beginning
					: prevView && parentNode.lastChild;  // If no prevView and no prevNode, index is 0 and there are the container is empty,
					// so prevNode = linkToNode = null. But if prevNode._nxt is null then we set prevNode to parentNode.lastChild
					// (which must be before the prevView) so we insert after that node - and only link the inserted nodes
			} else {
				linkToNode = prevNode.nextSibling;
			}
		}
		html = tmpl.render(data, context, view, refresh || index, view._.useKey && refresh, TRUE);
		// Pass in self._.useKey as test for layout template (which corresponds to when self._.useKey > 0 and self.data is an array)

		tag = view.tag || {};

		// Link the new HTML nodes to the data
		if (tag.onBeforeLink) {
			tag.onBeforeLink();
		}

		view.link(data, parentNode, prevNode, linkToNode, html, refresh);

		tagOnAfterLink(tag);
//}, 0);
	}

	//=====================
	// addBindingMarkers
	//=====================

	function addBindingMarkers(value, view, linked) {
		// Insert binding markers into the rendered template output, which will get converted to appropriate
		// data-jsv attributes (element-only content) or script marker nodes (phrasing or flow content), in convertMarkers,
		// within view.link, prior to inserting into the DOM. Linking will then bind based on these markers in the DOM.
		var id,
			open = "_#",
			close = "_/",
			end = "_`";
		if (linked) {
			// This is a binding marker for a data-bound tag {^{...}}
			bindingStore[id = bindingKey++] = view._.tag; // Store the tag temporarily ready for databinding.
			// During linking, in addDataBinding, the tag will be attached to the linkCtx,
			// and then in observeAndBind, bindingStore[bindId] will be replaced by binding info.
			id = '^' + id;
		} else {
			// This is a binding marker for a view
			// Add the view to the store of current linked views
			viewStore[id = view._.id] = view;
		}
		// Example: "_#^23_`TheValue_/^23_`"
		return open + id + end + value + close + id + end;
	}

	//==============================
	// Data-linking and data binding
	//==============================

	//---------------
	// observeAndBind
	//---------------

	function observeAndBind(linkCtx, source, target) { //TODO ? linkFnArgs) {;
		var tag, binding, cvtBack, toPath,
			depends = [],
			bindId = linkCtx._bndId || "" + bindingKey++;
			delete linkCtx._bndId;

		if (tag = linkCtx.tag) {
			// Use the 'depends' paths set on linkCtx.tag, either on declaration or events: init, render, onBeforeLink, onAfterLink etc.
			depends = tag.depends;
			depends = $isFunction(depends) ? tag.depends() : depends;
			cvtBack = tag.onChange;
		}
		cvtBack = cvtBack || linkCtx._cvtBk;
		if (!linkCtx._depends || "" + linkCtx._depends !== "" + depends) {
			// Only bind the first time, or if the new depends has changed from when last bound
			if (linkCtx._depends) {
				// Unobserve previous binding
				$observe(source, linkCtx._depends, linkCtx._handler, TRUE);
			}
			binding = $observe.call(linkCtx, source, linkCtx.paths, depends, linkCtx._handler, linkCtx._filter);
			// The binding returned by $observe has a bnd array with the source objects of the individual bindings.
			binding.tgt = target; // The target of all the individual bindings
			binding.linkCtx = linkCtx;
			// Add to the _jsvBnd on the target the view id and bindingKey - for unbinding when the target element is removed
			target._jsvBnd = target._jsvBnd || "";
			target._jsvBnd += "&" + bindId;
			linkCtx._depends = depends;
			// Store the binding key on the view, for disposal when the view is removed
			linkCtx.view._.bnd[bindId] = bindId;
			// Store the binding.
			bindingStore[bindId] = binding; // Note: If this corresponds to a bound tag, replace the
			// stored tag by the stored binding. The tag is then at binding.linkCtx.tag

			if (cvtBack !== undefined) {
				toPath = linkCtx.paths[0].split("^").join("."); // For binding back, bind to the first path in the parsed parameters
				binding.to = [linkCtx._filter(toPath) || [linkCtx.data, toPath], cvtBack];
// TODO binding.to.linkFnArgs = linkFnArgs; - need to compile this to provide args for setters on computed observables?
			}
		}
	}

	//-------
	// $.link
	//-------

	function tmplLink(to, from, context, parentView, prevNode, nextNode, index) {
		return $link(this, to, from, context, parentView, prevNode, nextNode, index);
	}

	function $link(tmplOrLinkTag, to, from, context, parentView, prevNode, nextNode, index) {
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
						if (parentView.link === FALSE) {
							context = context || {};
							context.link = onRender = FALSE; // If link=false, don't allow nested context to switch on linking
						}
						// Set link=false, explicitly, to disable linking within a template nested within a linked template
						if (replaceMode) {
							placeholderParent = targetEl.parentNode;
						}

						html = tmplOrLinkTag.render(from, context, parentView, undefined, undefined, onRender);
						// TODO Consider finding a way to bind data (link) within template without html being different for each view, the HTML can
						// be evaluated once  outside the while (l--), and pushed into a document fragment, then cloned and inserted at each target.

						if (placeholderParent) {
							// This is target="replace" mode
							prevNode = targetEl.previousSibling;
							nextNode = targetEl.nextSibling;
							$.cleanData([targetEl], TRUE);
							placeholderParent.removeChild(targetEl);

							targetEl = placeholderParent;
						} else {
							prevNode = nextNode = undefined; // When linking from a template, prevNode and nextNode parameters are ignored
							$(targetEl).empty();
						}
					} else if (tmplOrLinkTag !== TRUE) {
						break;
					}

// TODO Consider deferred linking API feature on per-template basis - {@{ instead of {^{  which allows the user to see the rendered content
// before that content is linked, with better perceived perf. Have view.link return a deferred, and pass that to onAfterLink... or something along those lines.
// setTimeout(function() {

					if (targetEl._dfr && !nextNode) {
						// We are inserting new content and the
						vwInfos = viewInfos(targetEl._dfr);

						for (i = 0, k = vwInfos.length; i < k; i++) {
							view = vwInfos[i];
							if ((view.open || view.prnt) && (view = viewStore[view.id]) && view.data !== undefined) {
								// If this is the _prevNode for a view, or the parentElem of an empty view, remove the view
								// - unless view.data is undefined, in which case it is already being removed
								view.parent.removeViews(view._.key, undefined, TRUE);
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

		// Data-linking will then add _prevNode and _nextNode to views, where:
		//     _prevNode: References the previous node (script element of type "jsv123"), or (for elCnt=true), the first element node in the view
		//     _nextNode: References the last node (script element of type "jsv/123"), or (for elCnt=true), the next element node after the view.

		//==== nested functions ====
		function convertMarkers(all, preceding, selfClose, closeTag, spaceBefore, id, spaceAfter, tag, tag2, closeTag2, spaceAfterClose, selfClose2) {
			//rConvertMarkers = /(^|(\/>)|(<\/\w+>)|>|)(\s*)_([#\/]\^?\d+)_`(\s*)(<\w+(?=[\s\/>]))?|\s*(?:(<\w+(?=[\s\/>]))|(<\/\w+>)(\s*)|(\/>)\s*)/g,
			//                 prec, slfCl, clTag,  spaceBefore, id,    spaceAfter, tag,                   tag2,             clTag2,  sac   slfCl2,
			// Convert the markers that were included by addBindingMarkers in template output, to appropriate DOM annotations:
			// data-jsv attributes (for element-only content) or script marker nodes (within phrasing or flow content).
			var endOfElCnt = "";
			tag = tag || tag2 || "";
			closeTag = closeTag || selfClose || closeTag2 || selfClose2;
			if (closeTag) {
				prevElCnt = elCnt;
				parentTag = tagStack.shift();
				elCnt = elContent[parentTag];
				if (prevElCnt && (defer || ids)) {
					// If there are ids (markers since the last tag), move them to the defer string
					defer += ids;
					ids = "";
					if (!elCnt) {
						endOfElCnt = (closeTag2 || "") + openScript + "@" + defer + closeScript + (spaceAfterClose || "");
					}
					defer = elCnt ? defer + "-" : ""; // Will be used for stepping back through deferred tokens
				}
			}
			if (elCnt) {
				// elContent maps tagNames which have only element content, so may not support script nodes.
				// We are in element-only content, can remove white space, and use data-jsv attributes on elements as markers
				// Example: <tr data-jsv="/2#6"> - close marker for view 2 and open marker for view 6
				if (id) {
					// append marker for this id, to ids string
					ids += id;
					if (tag) {
						// We have reached an HTML tag, so add data-jsv attribute for the markers encountered since the previous HTML tag
						preceding += tag + ' ' + jsvAttrStr + '="' + ids + '"';
						ids = "";
					}
				} else {
					preceding = (closeTag2 || selfClose2 || "") + tag;
				}
			} else {
				// We are in phrasing or flow content, so use script marker nodes
				// Example: <script type="jsv3^/"></script> - data-bound tag, close marker
				preceding = id
					? (preceding + endOfElCnt + spaceBefore + openScript + id + closeScript + spaceAfter + tag)
					: endOfElCnt || all;
			}
			if (tag) {
				// If there are ids (markers since the last tag), move them to the defer string
				tagStack.unshift(parentTag);
				parentTag = tag.slice(1);
				prevElCnt = elCnt = elContent[parentTag];
				if (defer && elCnt) {
					defer += "+"; // Will be used for stepping back through deferred tokens
				}
			}
			return preceding;
		}

		function processViewInfos(vwInfos, targetElem, targetParent) {
			// targetParent is only passed in if there is no elem
			var defer, char, parentElem, id;

			// In elCnt, prevNode is the first node after the open, nextNode is the first node after the close. If both are null/undefined, then open and close are
			// at end of parent content, so the view is empty, and its placeholder is the 'lastChild' of the parentNode. If there is a prevNode, then it is either
			// the first node in the view, or the view is empty and its placeholder is the 'previousSibling' of the prevNode, which is also the nextNode.
			if (vwInfos) {
				targetParent = targetParent || targetElem && targetElem.previousSibling;
				len = vwInfos.length;
				if (vwInfos.tokens.charAt(3) === "@") {
					// This is a special script element that was created in convertMarkers() to process deferred bindings, and inserted following the
					// target parent element - because no element tags were encountered to carry those binding tokens.
					targetParent = elem.previousSibling;
					elem.parentNode.removeChild(elem);
				}
				while (len--) {
					vwInfo = vwInfos[len];
					if (vwInfo.opBnd || vwInfo.clBnd) {
						// This is an open or close marker for a data-bound tag {^{...}}. Add it to bindEls.
						bindEls.push([elem||targetParent, vwInfo]);
					} else if (view = viewStore[id = vwInfo.id]) {
						// The view may have been deleted, for example in a different handler to an array collectionChange event
						if (defer = vwInfo.path) {
							// We have a 'deferred path'
							j = defer.length - 1;
							while (char = defer.charAt(j--)) {
								// Use the "+" and"-" characters to navigate the path back to the original parent node where the deferred bindings ocurred
								if (char === "+") {
									if (defer.charAt(j) === "-") {
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
						if (!view.link) {
							// If view is not already extended for JsViews, extend and initialize the view object created in JsRender, as a JsViews view
							view.parentElem = targetParent || elem && elem.parentNode || parentNode;
							if (targetParent) {
								// These are deferred bindings
								token = "|" + id;
								tokens = targetParent.getAttribute(jsvAttrStr) || "";
								if (tokens.indexOf(token) < 0) {
									// Add to parentElem tokens, if not already there
									targetParent.setAttribute(jsvAttrStr, token + tokens);
								}
								view._prv = 0;
								// Set _prv to 0 as an indicator that this is a 'parentElem' view: -i.e. an empty view with no prevNode or nextNode (so the binding was deferred, 
								// and is 'owned' by the parent element, with an associated "|n" token on the data-jsv attribute or on the _dfr expando, where n is the vwInfo.id
							}
							$extend(view, LinkedView);
							view._.onRender = addBindingMarkers;
							setArrayChangeLink(view);
						}
						parentElem = view.parentElem;
						if (vwInfo.open) {
							// This is an 'open view' node (preceding script marker node, or if elCnt, the first element in the view, with a data-jsv annotation) for binding
							if (view.parent === self) {
								lastAddedTopView = view;
							}
							view._elCnt = vwInfo.elCnt;
							if (targetParent) {
								targetParent._dfr = "#" + id + (targetParent._dfr || "");
							} else {
								if (!view._prv) {
									parentElem = view.parentElem;
									if (view._prv === 0) {
										// This was a 'parentElem' view, so remove the "|n" token
										token = parentElem.getAttribute(jsvAttrStr);
										if (token = removeSubStr(token, "|" + id)) {
											parentElem.setAttribute(jsvAttrStr, token);
										} else {
											parentElem.removeAttribute(jsvAttrStr);
										}
									}
									parentElem._dfr = removeSubStr(parentElem._dfr, "#" + id);
								}
								view._prv = elem;

							}
						} else {
							// This is a 'close view' marker node for binding
							if (targetParent) {
								targetParent._dfr = "/" + id + (targetParent._dfr || "");
							} else {
								if (!view._nxt) {
									parentElem._dfr = removeSubStr(parentElem._dfr, "/" + id);
								}
								view._nxt = elem;
							}
							linkCtx = view.linkCtx;
					//		tag = linkCtx && linkCtx.tag;
							// TODO verify linkCtx
							//if (view.link)
							if (onAfterCreate) {
								onAfterCreate.call(linkCtx, view);
							}
						}
					}
				}
			}
		}
		//==== /end of nested functions ====

		var linkCtx, tag, i, l, j, len, elems, elem, view, vwInfos, vwInfo, linkInfo, prevNodes, token, lastAddedTopView, firstInsertedElem, prevView, nextView, node,
			depth, fragment, copiedNode, firstTag, parentTag, wrapper, div, jsvAttr, tokens, elCnt, prevElCnt, htmlTag, ids, prevIds, found, parentView, //oldElCnt,
			self = this,
			defer = "",
			// The marker ids for which no tag was encountered (empty views or final closing markers) which we carry over to container tag
			bindEls = [],
			tagStack = [],
			onAfterCreate = self._hlp(onAfterCreateStr);

		parentNode = "" + parentNode === parentNode
			? $(parentNode)[0]  // It is a string, so treat as selector
			: parentNode.jquery
				? parentNode[0]   // A jQuery object - take first element.
				: (parentNode
					|| self.parentElem // view.link()
					|| document.body); // link(null, data) to link the whole document

		parentTag = parentNode.tagName.toLowerCase();
		elCnt = !!elContent[parentTag];

		prevNode = prevNode && markPrevOrNextNode(prevNode, elCnt);
		nextNode = nextNode && markPrevOrNextNode(nextNode, elCnt) || NULL;

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

			if (elCnt) {
				// Need to find the nextNode or parentNode._dfr tokens, and transfer the initial tokens to the inserted nodes
				// Find the previous view, by looking for preceding elems with tokens
				node = nextNode ? nextNode.previousSibling : parentNode.lastChild;
				while (node && !(vwInfos = viewInfos(node))) {
					node = node.previousSibling;
				}

				if (node && (view = viewStore[vwInfos[vwInfos.length - 1].id])) {
					// Get the associated view that is child of self, so sibling to newly inserted view(s)
					// Look for preceding sibling view under parent view - which is self, or self.parent if this an item being refreshed.
					parentView = refresh && self.type === "item" ? self.parent : self;
					while (view.parentElem === parentNode) {
						if (view.parent === parentView) {
							prevView = view._.id;
							break;
						}
						view = view.parent;
					}
				}
				// Now look for following view, and find its tokens, or if not found, get the parentNode._dfr tokens
				node = nextNode;
				while (node && !(nextView = viewInfos(node))) {
					node = node.nextSibling;
				}
				if (tokens = nextView ? nextView.tokens : parentNode._dfr) {
					token = prevView ? "/" + prevView : "#" + self._.id;
					j = tokens.indexOf(token);
					if (j + 1) {
						j = j + token.length;
						// Transfer the initial tokens to inserted nodes, by setting them as the ids variable, picked up in convertMarkers
						if (!nextView) {
							parentNode._dfr = tokens.slice(j);
						}
						prevIds = ids = tokens.slice(0, j);
					}
				}
			}

			//================ Convert the markers to DOM annotations, based on content model. ================
//			oldElCnt = elCnt;
			html = html.replace(rConvertMarkers, convertMarkers);
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
				if (!firstInsertedElem && copiedNode.nodeType === 1) {
					firstInsertedElem = copiedNode;
				}
				fragment.appendChild(copiedNode);
			}
			// Insert into the DOM
			parentNode.insertBefore(fragment, nextNode);
		}

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
		for (i = 0; i < l; i++) {
			elem = elems[i];
			if (prevNode && !found) {
				// If prevNode is set, not false, skip linking. If this element is the prevNode, set to false so subsequent elements will link.
				found = (elem === prevNode);
			} else if (nextNode && elem === nextNode) {
				// If nextNode is set then break when we get to nextNode
				break;
			} else if (elem.parentNode) {
				// Not already removed from DOM
				processViewInfos(viewInfos(elem));
				if (elem.getAttribute($viewsLinkAttr)) {
					bindEls.push([elem]);
				}
			}
		}

		// Remove temporary marker script nodes they were added by markPrevOrNextNode
		if (nextNode && nextNode.type === "jsv") {
			nextNode.parentNode.removeChild(nextNode);
		}
		if (prevNode && prevNode.type === "jsv") {
			prevNode.parentNode.removeChild(prevNode);
		}

		if (elCnt && defer + ids) {
			// There are some views with elCnt, for which the open or close did not precede any HTML tag - so they have not been processed yet
			elem = nextNode;
			processViewInfos(viewInfos(defer + ids), elem, parentNode);

			if (nextNode) {
				// If there were any tokens on nextNode which have now been associated with inserted HTML tags, remove them from nextNode
				tokens = nextNode.getAttribute(jsvAttrStr);
				nextNode.setAttribute(jsvAttrStr, ids + tokens.slice(tokens.indexOf(prevIds) + prevIds.length));

				if (lastAddedTopView) {
					// lastAddedTopView is the last view (child of self) that was linked in the added content. Point it to the nextNode
					lastAddedTopView._nxt = nextNode;
				}
			}
		}

		if (lastAddedTopView && lastAddedTopView._elCnt && lastAddedTopView.parentElem === parentNode) {
			lastAddedTopView._nxt = nextNode; // lastAddedTopView is the last item view that was linked in the added content
		}

		if (elCnt && self._prv && !self._prv.parentNode) {
			// _prevNode of this view (in elCnt) is no longer in the DOM, so was part of removed content
			// (replaced by the above html insertion). Need to find the new prevNode, and transfer the data-jsv attribute
			vwInfos = viewInfos(self._prv);
			l = vwInfos.length;
			if (firstInsertedElem) {
				// Transfer data-jsv attribute (TODO ensure this is always valid. Could the original annotations need to be merged with annotations
				firstInsertedElem.setAttribute(jsvAttrStr, vwInfos.tokens);
			} else {
				// If no prevNode, prepend data-jsv attribute to nextNode attribute
				nextNode.setAttribute(jsvAttrStr, jsvAttr + nextNode.getAttribute(jsvAttrStr));
			}
			// Go through the views that were referencing the removed prevNode, and point them to the newly inserted element, as appropriate
			while (l--) {
				vwInfo = vwInfos[l];
				if (view = viewStore[vwInfo.id]) {
					if (vwInfo.open) {
						view._prv = firstInsertedElem;
					} else if (vwInfo.close) {
						view._nxt = firstInsertedElem || self._nxt;
					}
				}
			}
		}

		//================ Bind the data-link elements, and the data-bound tags ================
		l = bindEls.length;
		for (i = 0; i < l; i++) {
			elem = bindEls[i];
			linkInfo = elem[1];
			elem = elem[0];
			if (linkInfo) {
				if (linkInfo.opBnd) {
					// This is an 'open bound tag' script marker node for a data-bound tag {^{...}}
					tag = bindingStore[linkInfo.id]; // The tag was stored temporarily on the bindingStore
					// Add data binding
					tag.parentElem = elem.parentNode;
					tag._prv = elem;
					tag._elCnt = linkInfo.elCnt;
					if (tag && tag.onBeforeLink) {
						tag.onBeforeLink();
					}
				} else {
					// This is an 'close bound tag' script marker node
					tag = bindingStore[linkInfo.id];
					view = tag.tagCtx.view;
					tag._nxt = elem;
					tagOnAfterLink(tag);
					addDataBinding(undefined, tag._prv, view, view.data||outerData, linkInfo.id);
				}
			} else {
				view = $view(elem);
				// Add data binding for a data-linked element (with data-link attribute)
				addDataBinding(elem.getAttribute($viewsLinkAttr), elem, view, view.data||outerData);
			}
		}
	}

	function addDataBinding(linkMarkup, node, currentView, data, boundTagId) {
		// Add data binding for data-linked elements or {^{...}} data-bound tags
		var tmplLinks, tokens, attr, convertBack, params, trimLen, tagExpr, linkFn, linkCtx, tag, rTagIndex;

		if (boundTagId) {
			// {^{...}} bound tag. So only one linkTag in linkMarkup
			tag = bindingStore[boundTagId]; // The tag was stored temporarily on the bindingStore
			linkMarkup = delimOpenChar1 + tag.tagName + " " + tag.tagCtx.params + delimCloseChar0;
		}
		if (linkMarkup && node) {
			// Compiled linkFn expressions are stored in the tmpl.links array of the template
			// TODO - consider also caching globally so that if {{:foo}} or data-link="foo" occurs in different places,
			// the compiled template for this is cached and only compiled once...
			//links = currentView.links || currentView.tmpl.links;

			tmplLinks = currentView.tmpl.links;

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
// Make {^{ default to 'innerText', and let {^html{ target html. This will be consistent with data-link="html{:...}"
					tagExpr = tokens[3];
					params = tokens[10];
					convertBack = undefined;

					linkCtx = {
						data: data,             // source
						elem: node,             // target
						view: currentView,
						attr: attr,
						_initVal: !boundTagId && !tokens[2]
					};

					if (tokens[6]) {
						// TODO include this in the original rTag regex
						// Only for {:} link"

						if (!attr && (convertBack = /^.*:([\w$]*)$/.exec(params))) {
							// two-way binding
							convertBack = convertBack[1];
							if (convertBack !== undefined) {
								// There is a convertBack function
								trimLen = - convertBack.length -1;
								tagExpr = tagExpr.slice(0, trimLen - 1) + delimCloseChar0; // Remove the convertBack string from expression.
								params = params.slice(0, trimLen);
							}
						}
						if (convertBack === NULL) {
							convertBack = undefined;
						}
					}
					// Compile the linkFn expression which evaluates and binds a data-link expression
					// TODO - optimize for the case of simple data path with no conversion, helpers, etc.:
					//     i.e. data-link="a.b.c". Avoid creating new instances of Function every time. Can use a default function for all of these...

					if (boundTagId) {
						linkCtx.tag = tag; // Add tag to linkCtx.
						// Pass the boundTagId in the linkCtx, so that
						linkCtx._bndId = boundTagId;
						// In observeAndBind the bound tag temporarily stored in the bindingStore will be replaced with
						// the full binding information, and the bindingId will be added to view._.bnd
					}
					linkCtx.expr = attr + tagExpr;
					linkFn = tmplLinks[tagExpr]
						= tmplLinks[tagExpr] || $views.sub.tmplFn(delimOpenChar0 + tagExpr + delimCloseChar1, undefined, TRUE);

					$viewsSub.parse(params, linkFn.paths = linkCtx.paths = []);

					if (!attr && convertBack !== undefined) {
						// Default target, so allow 2 way binding
						linkCtx._cvtBk = convertBack;
					}

					bindDataLinkTarget(linkCtx, linkFn);
					// We store rTagIndex in local scope, since this addDataBinding method can sometimes be called recursively, and each is using the same rTag instance.
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

		linkCtx._filter = filterHelperStrings(linkCtx); // _filter is for filtering dependency paths: function(path, object) { return [(object|path)*]}
		linkCtx._handler = handler;
		handler();
	}

	//=====================
	// Data-linking helpers
	//=====================

	function removeSubStr(str, substr) {
		str = str || "";
		var k = str.indexOf(substr);
		return k + 1 ? str.slice(0, k) + str.slice(k + substr.length) : str;
	}

	function viewInfos(node, tagBinding) {
		// Test whether node is a script marker nodes, and if so, return metadata
		// If tagBinding, return true if last info is an open tag binding: "#^nnn"
		function getViewInfos(all, scriptNode, open, close, openBind, closeBind, parent, id, elPath) {
			ids.push({
				elCnt: !scriptNode,
				id: id,
				open: open,
				close: close,
				opBnd: openBind,
				clBnd: closeBind,
				prnt: parent,
				path: elPath
			});
		}

		var ids = [],
			tokens = "" + node === node ? node : node.tagName === "SCRIPT"
				? node.type
				: node.nodeType === 1 && node.getAttribute(jsvAttrStr);

		if (tokens) {
			ids.tokens = tokens;

			// rJsvNodeMarker = /(jsv)?(?:(#)|(\/)|(#\^)|(\/\^)|(\|))(\d+)([-+]*)?/g;
			tokens.replace(rJsvNodeMarker, getViewInfos);
			return tagBinding ? ids.pop().opBnd : ids;
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
			} else if (!viewInfos(marker) && !marker.getAttribute($viewsLinkAttr)) {
				// For element nodes, we will add a data-link attribute (unless there is already one) so that this node gets included in the node linking process.
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
			? linkMarkup = delimOpenChar1 + /*linkChar +*/ ":" + linkMarkup + (defaultAttr(node) ? ":" : "") + delimCloseChar0
			: linkMarkup;
	}

	function tagOnAfterLink(tag) {
		// Add nodes() and contents() methods, and call onAfterLink() if defined.
		if (tag) {
			tag.contents = getContents;
			tag.nodes = getNodes;
			if (tag.onAfterLink) {
				tag.onAfterLink();
			}
		}
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
			elCnt = this._elCnt,
			prevIsFirstNode = !prevNode && elCnt,
			nodes = [];

		prevNode = prevNode || this._prv;
		nextNode = nextNode || this._nxt;

		node = prevIsFirstNode
			? (prevNode === this._nxt
				? this.parentElem.lastSibling
				: prevNode)
			: prevNode.nextSibling;

		while (node && (!nextNode || node !== nextNode)) {
			if (withMarkers || elCnt || !viewInfos(node)) {
				// All the top-level nodes in the view
				// (except script marker nodes, unless withMarkers = true)
				// (Note: If a script marker node, viewInfo.elCnt undefined)
				nodes.push(node);
			}
			node = node.nextSibling;
		}
		return nodes;
	}

	//=========
	// Disposal
	//=========

	function clean(elems) {
		// Remove data-link bindings, or contained views
		var i, elem, view, target, bindings, l, views,
			elemArray = [];
		for (i = 0; elem = elems[i]; i++) {
			// Copy into an array, so that deletion of nodes from DOM will not cause our 'i' counter to get shifted
			// (Note: This seems as fast or faster than elemArray = [].slice.call(elems); ...)
			elemArray.push(elem);
		}
		for (i = 0; elem = elemArray[i]; i++) {
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
				if ((view = viewInfos(elem)) && view.length) {
					view = view[view.length-1];
					if (view.opBnd || view.clBnd) {
						// This is a script marker node for a binding. Remove from the DOM
						elem.parentNode.removeChild(elem);
					} else if ((view.open || view.prnt) && (view = viewStore[view.id]) && view.data !== undefined) {
						// If this is the _prevNode for a view, or the parentElem of an empty view, remove the view
						// - unless view.data is undefined, in which case it is already being removed
						view.parent.removeViews(view._.key, undefined, TRUE);
					}
				} else if (views = elem._jsvVws) {
					// Get propertyChange bindings for which this element is the parentElement, and remove associated views
					// bindings is a string with the syntax: "(.viewId|bindingId)*"
					views = views.slice(1).split("&");
					l = views.length;
					while (l--) {
						if (target = viewStore[views[l]]) {
							target.parent.removeViews(target._.key, undefined, TRUE);
						}
					}
				}
			}
		}
	}

	function removeLinkTarget(bindings, from, path) {
		var binding,
		removed = 0,
		l = bindings.length;
		while (l-- > 0) {
			binding = bindings[l]; // [sourceObject, path, handler]
			if (!(from && from !== binding[0] || path && path !== binding[1])) {
				if ($isArray(binding[0])) {
					$([binding[0]]).off(arrayChangeStr, binding[2]);
				} else {
					$unobserve(binding[0], binding[2]);
				}
				bindings.splice(l, 1);
				removed++;
			}
		}
		return removed;
	}

	function removeViewBinding(bindId) {
		// Unbind
		var objId, linkCtx, tag,
			binding = bindingStore[bindId];
		if (binding) {
			for (objId in binding.bnd) {
				$(binding.bnd[objId]).off(propertyChangeStr + "." + binding.cbNs);
				delete binding.bnd[objId];
			}

			linkCtx = binding.linkCtx;
			tag = linkCtx.tag || {};
			if (tag.onDispose) {
				tag.onDispose();
			}
			delete linkCtx.view._.bnd[bindId];
			delete bindingStore[bindId];
		}
	}

	function $unlink(tmplOrLinkTag, to) {
		if (!arguments.length) {
			// Call to $.unlink() is equivalent to $.unlink(TRUE, "body")
			if (activeBody) {
				$(activeBody).off(elementChangeStr, elemChangeHandler);
				activeBody = undefined;
			}
			tmplOrLinkTag = TRUE;
			topView.removeViews();
			clean(document.body.getElementsByTagName("*"));
		} else if (to) {
			to = to.jquery ? to : $(to); // to is a jquery object or an element or selector
			if (tmplOrLinkTag === TRUE) {
				// Call to $(el).unlink(TRUE) - unlink content of element, but don't remove bindings on element itself
				$.each(to, function() {
					var innerView;
					// TODO fix this for better perf. Rather that calling inner view multiple times which does querySelect each time, consider a single querySelectAll
					// or simply call view.removeViews() on the top-level views under the target 'to' node, then clean(...)
					while ((innerView = $view(this, TRUE)) && innerView.parent) {
						innerView.parent.removeViews(innerView._.key, undefined, TRUE);
					}
					clean(this.getElementsByTagName("*"));
				});
			} else if (tmplOrLinkTag === undefined) {
				// Call to $(el).unlink()
				clean(to);
// TODO provide this unlink API
//			} else if ("" + tmplOrLinkTag === tmplOrLinkTag) {
//				// Call to $(el).unlink(tmplOrLinkTag ...)
//				$.each(to, function() {
//					...
//				});
			}
// TODO - unlink the content and the arrayChange, but not any other bindings on the element (if container rather than "replace")
		}
		return to; // Allow chaining, to attach event handlers, etc.
	}

	function tmplUnlink(to, from) {
		return $unlink(this, to, from);
	}

	//========
	// Helpers
	//========

	function filterHelperStrings(linkCtx) {
		// TODO Consider exposing or allowing override, as public API
		return function (path, object) {
			// TODO consider only calling the filter on the initial token in path '~a.b.c' and not calling again on
			// the individual tokens, 'a', 'b', 'c'...  Currently it is called multiple times
			var tokens,
				tag = linkCtx.view.ctx;
			if (path) {
				if (path.charAt(0) === "~") {
					// We return new items to insert into the sequence, replacing the "~a.b.c" string: [helperObject 'a', "a.b.c" currentDataItem] so currentDataItem becomes the object for subsequent paths.
					if (path.slice(0, 4) === "~tag") {
						if (path.charAt(4) === ".") {
							// "~tag.xxx"
							tokens = path.slice(5).split(".");
							tag = tag.tag;
						} else if (path.slice(4, 6) === "s.") {
							// "~tags.xxx"
							tokens = path.slice(6).split(".");
							tag = tag.tags[tokens.shift()];
						}
						if (tokens) {
							return tag ? [tag, tokens.join("."), object] : [];
						}
					}
					path = path.slice(1).split(".");
					return [linkCtx.view._hlp(path.shift()), path.join("."), object];
				}
				if (path.charAt(0) === "#") {
					// We return new items to insert into the sequence, replacing the "#a.b.c" string: [view, "a.b.c" currentDataItem]
					// so currentDataItem becomes the object for subsequent paths. The 'true' flag makes the paths bind only to leaf changes.
					return path === "#data" ? [] :[linkCtx.view, path.replace(rViewPath, ""), object];
				}
			}
		};
	}

	function inputAttrib(elem) {
		return elem.type === CHECKBOX ? elem.checked : elem.value;
	}

	function getTemplate(tmpl) {
		// Get nested templates from path
		if ("" + tmpl === tmpl) {
			var tokens = tmpl.split("[");
			tmpl = $templates[tokens.shift()];
			while (tmpl && tokens.length) {
				tmpl = tmpl.tmpls[tokens.shift().slice(0, -1)];
			}
		}
		return tmpl;
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

	//====================================
	// Additional members for linked views
	//====================================

	LinkedView = {
		// Note: a linked view will also, after linking have nodes[], _prevNode, _nextNode ...
		refresh: function(context) {
			var self = this,
				parent = self.parent;

			self.tmpl = getTemplate(self.tmpl);

			if (parent) {
				renderAndLink(self, self.index, self.tmpl, parent.views, self.data, context, TRUE);
				setArrayChangeLink(self);
			}
			return self;
		},

		addViews: function(index, dataItems, tmpl) {
			// if view is not an array view, do nothing
			var i, viewsCount,
				self = this,
				itemsCount = dataItems.length,
				views = self.views;

			if (!self._.useKey && itemsCount && (tmpl = getTemplate(tmpl || self.tmpl))) {
				// view is of type "array"
				// Use passed-in template if provided, since self added view may use a different template than the original one used to render the array.
				viewsCount = views.length + itemsCount;

				if (renderAndLink(self, index, tmpl, views, dataItems, self.ctx) !== FALSE) {
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
				var id, bindId, parentElem, prevNode, nextNode, emptyView, tokens, vwInfos, found, nodesToRemove, vwInfo, i, l, k,
					precedingLength = 0,
					viewToRemove = views[index];

				if (viewToRemove) {
					if (!keepNodes) {
						// Remove the HTML nodes from the DOM, unless they have already been removed, including nodes of child views
						nodesToRemove = viewToRemove.nodes();
					}

					// Remove child views, without removing nodes
					viewToRemove.removeViews(undefined, undefined, TRUE);

					viewToRemove.data = undefined;
					id = viewToRemove._.id;
					prevNode = viewToRemove._prv;
					nextNode = viewToRemove._nxt;
					parentElem = viewToRemove.parentElem;
					// If prevNode and nextNode are the same, the view is empty
					emptyView = prevNode === nextNode;
					if (!keepNodes) {
						// Remove the HTML nodes from the DOM, unless they have already been removed, including nodes of child views
						$(nodesToRemove).remove();
					}
					if (viewToRemove._elCnt) {
						if (prevNode) {
							vwInfos = viewInfos(prevNode);
							// vwInfos tokens are of the form "/a/b#c#d/d...". Look for the one that corresponds to #n for the viewToRemove
							// and take the preceding tokens, and concatenate them with the tokens following /n on the nextNode data-jsv attribute.
							// Step through the views corresponding to those preceding tokens, and point their _prv (for #m tokens, which correspond
							// to parent views) or _nxt (for /n tokens, which correspond to previous views) to the nexNode.

							tokens = "";
							for (i = 0, l = vwInfos.length; i < l; i++) {
								// Step through views on the prevNode
								vwInfo = vwInfos[i];
								if (vwInfo.id === id) {
									// This is viewToRemove, so we are done...
									break;
								}
								if (!emptyView && (view = viewStore[vwInfo.id])) {
									if (vwInfo.open) {
										// A "#m" token
										if (!i && !nextNode) {
											// The first token, and it is an open view token: "#m", so this is a top level view. It is becoming empty, with
											// no nextNode, so it is becoming a 'parentElem' view, and we must set a "|n" token on the parentElem
											parentElem.setAttribute(jsvAttrStr, "|" + vwInfo.id + (parentElem.getAttribute(jsvAttrStr) || ""));
											nextNode = 0; // so _prv will be set to 0
										}
										if (view._prv && !nextNode) {
											// This view no longer has a nextNode, so add to parentElem tokens
											tokens += "#" + view._.id;
										}
										view._prv = nextNode;
									} else if (vwInfo.close) {
										// A "/m" token
										if (view._nxt && !nextNode) {
											// This view no longer has a nextNode, so add to parentElem tokens
											tokens += "/" + view._.id;
										}
										view._nxt = nextNode;
									}
								}
								precedingLength += vwInfo.id.length + 1;
							}
							parentElem._dfr = tokens + (parentElem._dfr || "");

							if (nextNode) {
								// If viewToRemove was an empty view, we will remove both #n and /n (and any intervening tokens) from the nextNode (=== prevNode)
								// If viewToRemove was not empty, we will take tokens preceding #n from prevNode, and concatenate with tokens following /n on nextNode
								if (tokens = nextNode && nextNode.getAttribute(jsvAttrStr)) {
									nextNode.setAttribute(jsvAttrStr, vwInfos.tokens.slice(0, precedingLength) + tokens.slice(tokens.indexOf("/" + id) + id.length + 1));
								}
							} else if (viewToRemove._prev === 0) {
								// viewToRemove was a 'parentElem' view, so remove |n from the parentElem tokens
								tokens = parentElem.getAttribute(jsvAttrStr);
								if (token = removeSubStr(tokens, "|" + id)) {
									parentElem.setAttribute(jsvAttrStr, token);
								} else {
									parentElem.removeAttribute(jsvAttrStr);
								}
							}
						} else {
							// !prevNode, so there may be a deferred nodes token on the parentElem. Remove it.
							parentElem._dfr = removeSubStr(parentElem._dfr, "#" + id);
						}
						if (!nextNode) {
							// Remove deferred nodes token
							parentElem._dfr = removeSubStr(parentElem._dfr, "/" + id);
						}
					} else {
						parentElem.removeChild(prevNode);
						parentElem.removeChild(nextNode);
					}
					setArrayChangeLink(viewToRemove);
					for (bindId in viewToRemove._.bnd) {
						removeViewBinding(bindId, keepNodes);
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

		nodes: getNodes,
		contents: getContents,
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

// TODO complete/test/provide samples for this
// - verify design as related to $.view(elem, type) and view.get(type) and tag.get(type)? Support tag.parent, tag.find() for descendatns, and tag.get() for ancestors
//	$.views.findTags = function(node) {
//			node = "" + node === node
//				? $(node)[0]
//				: node.jquery
//					? node[0]
//					: node;
//			while (node && (node = node.parentNode) && !node._tags) {}
//			return node ? node._tags : {};
//		}
//	});

	if ($viewsSettings.debugMode) {
		// In debug mode create global for accessing views, etc
		window._jsv = {
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

		view: $view = function(node, type) {
			// $.view() returns top node
			// $.view(node) returns view that contains node
			// $.view(selector) returns view that contains first selected element
			var view, vwInfos, l,
				level = 0,
				body = document.body,
				inner = type === TRUE;

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
						return (view =
							// Use native querySelector if available
							(qsa ? node.querySelector(bindElsSel) : $(bindElsSel, node)[0]))
							&& (view = viewInfos(view))
							&& viewStore[view[0].id]
							|| undefined;
					}
					while (node) {
						// Move back through siblings and up through parents to find preceding node  which is a _prevNode
						// script marker node for a non-element-content view, or a _prevNode (first node) for an elCnt view
						if (vwInfos = viewInfos(node)) {
							l = vwInfos.length;
							while (l--) {
								view = vwInfos[l];

								if (level <= 0 && view.open) {
									view = viewStore[view.id];
									return (view && type) ? view.get(type) : view;
								}

								// level starts at zero. If we hit a view.close, then we move level to 1, and we don't return a view until
								// we are back at level zero (or a parent view with level < 0)
								level += view.close
									? 1
									: view.open
										? -1
										: 0;
							}
						}
						node = node.previousSibling || node.parentNode;
					}
				}
			}
			return inner ? undefined : topView;
		},

		link: $link,
		unlink: $unlink,

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
		link: function(expr, from, context, parentView, prevNode, nextNode, index) {
			return $link(expr, this, from, context, parentView, prevNode, nextNode, index);
		},
		unlink: function(expr, from) {
			return $unlink(expr, this, from);
		},
		view: function(type) {
			return $view(this[0], type);
		}
	});

	//===============
	// Extend topView
	//===============

	$extend(topView, { tmpl: { links: {} }});
	$extend(topView, LinkedView);
	topView._.onRender = addBindingMarkers;

})(this, this.jQuery);
