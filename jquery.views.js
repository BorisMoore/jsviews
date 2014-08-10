/*! JsViews v1.0.0-alpha: http://github.com/BorisMoore/jsviews and http://jsviews.com/jsviews
informal pre V1.0 commit counter: 55 (Beta Candidate) */
/*
 * Interactive data-driven views using templates and data-linking.
 * Requires jQuery and jsrender.js (next-generation jQuery Templates, optimized for pure string-based rendering)
 *    See JsRender at http://github.com/BorisMoore/jsrender and http://jsviews.com/jsrender
 * Also requires jquery.observable.js
 *    See JsObservable at http://github.com/BorisMoore/jsviews and http://jsviews.com/jsviews

 * Copyright 2014, Boris Moore
 * Released under the MIT License.
 */

(function(global, $, undefined) {
	// global is the this object, which is window when running in the usual browser environment.
	// $ is the global var jQuery
	"use strict";

	//========================== Top-level vars ==========================

	var versionNumber = "v1.0.0-alpha",
		requiresStr = "JsViews requires ",
		activeBody, $view, rTag, delimOpenChar0, delimOpenChar1, delimCloseChar0, delimCloseChar1, linkChar, noDomLevel0, error,
		$viewsLinkAttr, linkMethods, linkViewsSel, wrapMap, topView, viewStore,

		document = global.document,
		$views = $.views,
		$sub = $views.sub,
		$viewsSettings = $views.settings,
		$extend = $sub.extend,
		$isFunction = $.isFunction,
		$converters = $views.converters,
		$tags = $views.tags,
		$observable = $.observable,
		$observe = $observable.observe,
		jsvAttrStr = "data-jsv",

		// These two settings can be overridden on settings after loading jsRender, and prior to loading jquery.observable.js and/or JsViews
		propertyChangeStr = $sub.propChng = $sub.propChng || "propertyChange",
		arrayChangeStr = $sub.arrChng = $sub.arrChng || "arrayChange",

		elementChangeStr = "change.jsv",
		onBeforeChangeStr = "onBeforeChange",
		onAfterChangeStr = "onAfterChange",
		onAfterCreateStr = "onAfterCreate",
		CHECKED = "checked",
		CHECKBOX = "checkbox",
		RADIO = "radio",
		closeScript = '"></script>',
		openScript = '<script type="jsv',
		bindElsSel = "script,[" + jsvAttrStr + "]",
		htmlStr = "html",
		fnSetters = {
			value: "val",
			input: "val",
			html: htmlStr,
			text: "text"
		},
		valueBinding = { from: "value", to: "value"},
		isCleanCall = 0,
		oldCleanData = $.cleanData,
		oldJsvDelimiters = $viewsSettings.delimiters,
		syntaxError = $sub.syntaxErr,
		rFirstElem = /<(?!script)(\w+)(?:[^>]*(on\w+)\s*=)?[^>]*>/,
		rEscapeQuotes = /['"\\]/g, // Escape quotes and \ character
		safeFragment = document.createDocumentFragment(),
		qsa = document.querySelector,

		// elContent maps tagNames which have only element content, so may not support script nodes.
		elContent = {ol: 1, ul: 1, table: 1, tbody: 1, thead: 1, tfoot: 1, tr: 1, colgroup: 1, dl: 1, select: 1, optgroup: 1, svg: 1, svg_ns: 1},
		badParent = {tr: "table"},
		// wrapMap provide appropriate wrappers for inserting innerHTML, used in insertBefore
		// We have to close these tags to support XHTML (#13200)
		// TODO investigate whether more recent jQuery implementation using wrapMap in domManip/$().html() etc. is better optimized now...
		voidElems = {br: 1, img: 1, input: 1, hr: 1, area: 1, base: 1, col: 1, link: 1, meta: 1,
			command: 1, embed: 1, keygen: 1, param: 1, source: 1, track: 1, wbr: 1},
		displayStyles = {},
		bindingStore = {},
		bindingKey = 1,
		rViewPath = /^#(view\.?)?/,
		rConvertMarkers = /(^|(\/>)|<\/(\w+)>|)(\s*)([#\/]\d+[_^])`(\s*)(<\w+(?=[\s\/>]))?|\s*(?:(<\w+(?=[\s\/>]))|<\/(\w+)>(\s*)|(\/>)\s*|(>))/g,
		rOpenViewMarkers = /(#)()(\d+)(_)/g,
		rOpenMarkers = /(#)()(\d+)([_^])/g,
		rViewMarkers = /(?:(#)|(\/))(\d+)(_)/g,
		rOpenTagMarkers = /(#)()(\d+)(\^)/g,
		rMarkerTokens = /(?:(#)|(\/))(\d+)([_^])([-+@\d]+)?/g;

	if (!$) {
		// jQuery is not loaded.
		throw requiresStr + "jQuery"; // We require jQuery
	}

	if (!$.views) {
		// JsRender is not loaded.
		throw requiresStr + "JsRender"; // JsRender must be loaded before JsViews
	}

	if (!$.observable) {
		// JsRender is not loaded.
		throw requiresStr + "jquery.observable"; // jquery.observable.js must be loaded before JsViews
	}

	if ($.link) { return; } // JsViews is already loaded

	//========================== Top-level functions ==========================

	//===============
	// Event handlers
	//===============

	function elemChangeHandler(ev, params, sourceValue) {
		var setter, cancel, fromAttr, linkCtx, cvtBack, cnvtName, target, $source, view, binding, oldLinkCtx, onBeforeChange, onAfterChange, tag, to, eventArgs,
			source = ev.target,
			bindings = source._jsvBnd,
			splitBindings = /&(\d+)\+?/g;

		// _jsvBnd is a string with the syntax: "&bindingId1&bindingId2"
		if (bindings) {
			while (binding = splitBindings.exec(bindings)) {
				if (binding = bindingStore[binding[1]]) {
					if (to = binding.to) {
						// The binding has a 'to' field, which is of the form [[targetObject, toPath], cvtBack]
						linkCtx = binding.linkCtx;
						view = linkCtx.view;
						tag = linkCtx.tag;
						$source = $(source);
						onBeforeChange = view.hlp(onBeforeChangeStr); // TODO Can we optimize this and other instances of same?
						onAfterChange = view.hlp(onAfterChangeStr); // TODO Can we optimize this and other instances of same
						fromAttr = defaultAttr(source);
						setter = fnSetters[fromAttr];
						if (sourceValue === undefined) {
							sourceValue = $isFunction(fromAttr)
								? fromAttr(source)
								: setter
									? $source[setter]()
									: $source.attr(fromAttr);
						}
						cnvtName = to[1];
						to = to[0]; // [object, path]
						if (cnvtName) {
							if ($isFunction(cnvtName)) {
								cvtBack = cnvtName;
							} else {
								cvtBack = view.getRsc("converters", cnvtName);
							}
						}
						if (cvtBack) {
							sourceValue = cvtBack.call(tag, sourceValue);
						}

						// Set linkCtx on view, dynamically, just during this handler call
						oldLinkCtx = view.linkCtx;
						view.linkCtx = linkCtx;
						eventArgs = {
							change: "change",
							oldValue: linkCtx._val,
							value: sourceValue
						};
						if ((!onBeforeChange || !(cancel = onBeforeChange.call(linkCtx, ev, eventArgs) === false)) &&
								(!tag || !tag.onBeforeChange || !(cancel = tag.onBeforeChange(ev, eventArgs) === false)) &&
								sourceValue !== undefined) {
							target = to[0]; // [object, path]
							if (sourceValue !== undefined && target) {
								target = target._jsvOb ? target._ob : target;
								if (tag) {
									tag._.chging = true; // marker to prevent tag change event triggering its own refresh
								}
								$observable(target).setProperty(to[2] || to[1], sourceValue);
								if (onAfterChange) {
									onAfterChange.call(linkCtx, ev, eventArgs);
								}
								if (tag) {
									if (tag.onAfterChange) {
										tag.onAfterChange(ev, eventArgs);
									}
									delete tag._.chging; // clear the marker
								}
								linkCtx._val = sourceValue;
							}
						}
						view.linkCtx = oldLinkCtx;
					}
				}
			}
		}
		return false;
	}

	function elemChangeNoValidateHandler(ev) {
		var noVal = $viewsSettings.noValidate;
		$viewsSettings.noValidate = true;
		elemChangeHandler(ev);
		$viewsSettings.noValidate = noVal;
	}

	function propertyChangeHandler(ev, eventArgs, linkFn) {
		var attr, sourceValue, tag, noUpdate,
			linkCtx = this,
			source = linkCtx.data,
			target = linkCtx.elem,
			cvt = linkCtx.convert,
			parentElem = target.parentNode,
			view = linkCtx.view,
			oldLinkCtx = view.linkCtx,
			onEvent = view.hlp(onBeforeChangeStr);

		// Set linkCtx on view, dynamically, just during this handler call
		view.linkCtx = linkCtx;

		if (parentElem && (!onEvent || !(eventArgs && onEvent.call(linkCtx, ev, eventArgs) === false))
				// If data changed, the ev.data is set to be the path. Use that to filter the handler action...
				&& !(eventArgs && ev.data.prop !== "*" && ev.data.prop !== eventArgs.path)) {

			if (eventArgs) {
				linkCtx.eventArgs = eventArgs;
			}
			if (eventArgs || linkCtx._initVal) {
				delete linkCtx._initVal;
				sourceValue = linkFn.call(view.tmpl, source, view, $views);
				// Compiled link expression for linkTag: return value for data-link="{:xxx}" with no cvt or cvtBk, otherwise tagCtx or tagCtxs

				attr = getTargetVal(sourceValue, linkCtx, tag = linkCtx.tag,
						linkCtx.attr || defaultAttr(target, true, cvt !== undefined)
					);
				if (sourceValue && sourceValue.error !== undefined) {
					// tagCtxs for tag with onError=... and error was thrown. We will update with the fallback value from onError
					sourceValue = sourceValue.error;
				} else if (tag) {
					// Existing tag instance
					sourceValue = sourceValue[0] ? sourceValue : [sourceValue];
					noUpdate = eventArgs && tag.onUpdate && tag.onUpdate(ev, eventArgs, sourceValue) === false;

					mergeCtxs(tag, sourceValue);

					if (noUpdate || attr === "none") {
						// onUpdate returned false, or attr === "none", or this is an update coming from the tag's own change event
						// - so don't refresh the tag: we just use the new tagCtxs merged from the sourceValue,
						// (which may optionally have been modifed in onUpdate()...) and then bind, and we are done
						if (attr === htmlStr) {
							tag.onBeforeLink && tag.onBeforeLink();
						}
						callAfterLink(tag, tag.tagCtx);
						observeAndBind(linkCtx, source, target);
						view.linkCtx = oldLinkCtx;
						return;
					}
					if (tag._.chging) {
						return;
					}

					sourceValue = tag.tagName === ":" // Call convertVal if it is a {{cvt:...}} - otherwise call renderTag
						? $views._cnvt(tag.cvt, view, sourceValue[0])
						: $views._tag(tag, view, view.tmpl, sourceValue, true);
				} else if (linkFn._tag) {
					// For {{: ...}} without a convert or convertBack, we already have the sourceValue, and we are done
					// For {{: ...}} with either cvt or cvtBack we call convertVal to get the sourceValue and instantiate the tag
					// If cvt is undefined then this is a tag, and we call renderTag to get the rendered content and instantiate the tag
					cvt = cvt === "" ? "true" : cvt; // If there is a cvtBack but no cvt, set cvt to "true"
					sourceValue = cvt // Call convertVal if it is a {{cvt:...}} - otherwise call renderTag
						? $views._cnvt(cvt, view, sourceValue) // convertVal
						: $views._tag(linkFn._tag, view, view.tmpl, sourceValue, true); // renderTag

					tag = linkCtx.tag; // In both convertVal and renderTag we have instantiated a tag
					attr = linkCtx.attr || attr; // linkCtx.attr may have been set to tag.attr during tag instantiation in renderTag
				}

				if (updateContent(sourceValue, linkCtx, attr, tag)
						&& eventArgs
						&& (onEvent = view.hlp(onAfterChangeStr))) {
					onEvent.call(linkCtx, ev, eventArgs);
				}

				if (tag) {
					callAfterLink(tag, tag.tagCtx);
				}
			}

			observeAndBind(linkCtx, source, target);

			// Remove dynamically added linkCtx from view
			view.linkCtx = oldLinkCtx;
		}
	}

	function getTargetVal(sourceValue, linkCtx, tag, attr) {
		var currentValue, setter, css, $target,
			target = tag && tag.parentElem || linkCtx.elem;

		if (sourceValue !== undefined) {
			$target = $(target);
			attr = tag && tag.attr || attr;
			if ($isFunction(sourceValue)) {
				error(linkCtx.expr + ": missing parens");
			}

			if (attr === "visible") {
				attr = "css-display";
			}
			if (css = /^css-/.test(attr) && attr.slice(4)) {
				currentValue = $.style(target, css);
				if (+sourceValue === sourceValue) {
					// Optimization for perf on integer values - e.g. css-width{:width+'px'}
					currentValue = parseInt(currentValue);
				}
			} else if (attr !== "link") { // attr === "link" is for tag controls which do data binding but have no rendered output or target
				if (attr === "value") {
					if (target.type === CHECKBOX) {
						currentValue = $target.prop(attr = CHECKED);
					}
				} else if (attr === RADIO) {
					if (target.value === ("" + sourceValue)) {
						currentValue = $target.prop(CHECKED);
					} else {
						return attr;
					}
				}

				if (currentValue === undefined) {
					setter = fnSetters[attr];
					currentValue = setter ? $target[setter]() : $target.attr(attr);
				}
			}
			linkCtx._val = currentValue;
		}
		return attr;
	}

	function updateContent(sourceValue, linkCtx, attr, tag) {
		// When called for a tag, either in tag.refresh() or propertyChangeHandler(), returns a promise (and supports async)
		// When called (in propertyChangeHandler) for target HTML returns true
		// When called (in propertyChangeHandler) for other targets returns boolean for "changed"
		var setter, prevNode, nextNode, promise, nodesToRemove, useProp, tokens, id, openIndex, closeIndex,
			renders = sourceValue !== undefined,
			source = linkCtx.data,
			target = tag && tag.parentElem || linkCtx.elem,
			$target = $(target),
			view = linkCtx.view,
			targetVal = linkCtx._val,
			oldCtx = view.ctx,
			oldLinkCtx = view.linkCtx,
			// If not a tag and not targeting HTML, we can use the ._val obtained from getTargetVal()
			// and only update when the new value (sourceValue) has changed from the previous one
			change = tag || attr === htmlStr;
		if (tag) {
			// Initialize the tag with element references
			tag.parentElem = tag.parentElem || (linkCtx.expr || tag._elCnt) ? target : target.parentNode;
			prevNode = tag._prv;
			nextNode = tag._nxt;
		}
		if (!renders) {
			if (attr === htmlStr && tag && tag.onBeforeLink) {
				tag.onBeforeLink();
			}
			return;
		}

		if (/^css-/.test(attr)) {
			if (linkCtx.attr === "visible") {
				sourceValue = sourceValue
				// Make sure we set the correct display style for showing this particular element ("block", "inline" etc.)
					? getElementDefaultDisplay(target)
					: "none";
			}
			if (change = change || targetVal !== sourceValue) {
				$.style(target, attr.slice(4), sourceValue);
			}
		} else if (attr !== "link") { // attr === "link" is for tag controls which do data binding but have no rendered output or target
			if (attr === CHECKED) {
				useProp = 1;
				sourceValue = sourceValue && sourceValue !== "false";
					// The string value "false" can occur with data-link="checked{attr:expr}" - as a result of attr, and hence using convertVal()
					// We will set the "checked" property
					// We will compare this with the current value
			} else if (attr === RADIO) {
				// This is a special binding attribute for radio buttons, which corresponds to the default 'to' binding.
				// This allows binding both to value (for each input) and to the default checked radio button (for each input in named group,
				// e.g. binding to parent data).
				// Place value binding first: <input type="radio" data-link="value{:name} {:#get('data').data.currency:} " .../>
				// or (allowing any order for the binding expressions):
				// <input type="radio" value="{{:name}}" data-link="{:#get('data').data.currency:} value^{:name}" .../>

				if (target.value === ("" + sourceValue)) {
					// If the data value corresponds to the value attribute of this radio button input, set the checked property to true
					sourceValue = true;
					useProp = 1;
					attr = CHECKED;
				} else {
					// Otherwise, go straight to observeAndBind, without updating.
					// (The browser will remove the 'checked' attribute, when another radio button in the group is checked).
					observeAndBind(linkCtx, source, target);
					return;
				}
			} else if (attr === "selected" || attr === "disabled" || attr === "multiple" || attr === "readonly") {
				sourceValue = (sourceValue && sourceValue !== "false") ? attr : null;
				// Use attr, not prop, so when the options (for example) are changed dynamically, but include the previously selected value,
				// they will still be selected after the change
			}

			if (setter = fnSetters[attr]) {
				if (attr === htmlStr) {
					// Set linkCtx and ctx on view, dynamically, just during this handler call
					view.linkCtx = linkCtx;
					view.ctx = linkCtx.ctx;
					if (tag && tag._.inline) {
						nodesToRemove = tag.nodes(true);
						if (tag._elCnt) {
							if (prevNode && prevNode !== nextNode) {
								// This prevNode will be removed from the DOM, so transfer the view tokens on prevNode to nextNode of this 'viewToRefresh'
								transferViewTokens(prevNode, nextNode, target, tag._tgId, "^", true);
							} else if (tokens = target._dfr) { // This occurs when there is no nextNode, and so the target._dfr may include tokens referencing
								// view and tag bindings contained within the open an close tokens of the updated tag control. They need to be processed (disposed)
								id = tag._tgId + "^";
								openIndex = tokens.indexOf("#" + id) + 1;
								closeIndex = tokens.indexOf("/" + id);

								if (openIndex && closeIndex > 0) {
									openIndex += id.length;
									if (closeIndex > openIndex) {
										target._dfr = tokens.slice(0, openIndex) + tokens.slice(closeIndex);
										disposeTokens(tokens.slice(openIndex, closeIndex));
									}
								}
							}
							prevNode = prevNode
								? prevNode.previousSibling
								: nextNode
									? nextNode.previousSibling
									: target.lastChild;
						}
						// Remove HTML nodes
						$(nodesToRemove).remove(); // Note if !tag._elCnt removing the nodesToRemove will process and dispose view and tag bindings contained within the updated tag control

						if (tag && tag.onBeforeLink) {
							tag.onBeforeLink();
						}
						// Insert and link new content
						promise = view.link(view.data, target, prevNode, nextNode, sourceValue, tag && {tag: tag._tgId, lazyLink: tag.tagCtx.props.lazyLink});
					} else {
						// data-linked value targeting innerHTML: data-link="html{:expr}"
						if (renders) {
							$target.empty();
						}
						if (tag && tag.onBeforeLink) {
							tag.onBeforeLink();
						}
						if (renders) {
							promise = view.link(source, target, prevNode, nextNode, sourceValue, tag && {tag: tag._tgId});
						}
					}
					// Remove dynamically added linkCtx and ctx from view
					view.linkCtx = oldLinkCtx;
					view.ctx = oldCtx;
				} else if (change = change || targetVal !== sourceValue) {
					if (attr === "text" && target.children && !target.children[0]) {
						// This code is faster then $target.text()
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
							// Data link the new contents of the target node
				}
			} else if (change = change || targetVal !== sourceValue) {
				// Setting an attribute to undefined should remove the attribute
				$target[useProp ? "prop" : "attr"](attr, sourceValue === undefined && !useProp ? null : sourceValue);
			}
			linkCtx._val = sourceValue;
		}
		return promise || change;
	}

	function arrayChangeHandler(ev, eventArgs) {
		var self = this,
			onBeforeChange = self.hlp(onBeforeChangeStr),
			onAfterChange = self.hlp(onAfterChangeStr);

		if (!onBeforeChange || onBeforeChange.call(this, ev, eventArgs) !== false) {
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
			if (bound !== !!bound && bound._.inline) {
				// bound is not a boolean, so it is the data-linked tag that 'owns' this array binding - e.g. {^{for...}}
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
			attr = $viewsSettings.merge[nodeName] || elem.contentEditable === "true" && {to: htmlStr, from: htmlStr};
		return attr
			? (to
				? ((nodeName === "input" && elem.type === RADIO) // For radio buttons, bind from value, but bind to 'radio' - special value.
					? RADIO
					: attr.to)
				: attr.from)
			: to
				? linkGetVal ? "text" : htmlStr // Default innerText for data-link="a.b.c" or data-link="{:a.b.c}" (with or without converters)- otherwise innerHTML
				: ""; // Default is not to bind from
	}

	//==============================
	// Rendering and DOM insertion
	//==============================

	function renderAndLink(view, index, tmpl, views, data, context, refresh) {
		var html, linkToNode, prevView, nodesToRemove, bindId,
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
		html = tmpl.render(data, context, view._.useKey && refresh, view, refresh || index, true);
		// Pass in view._.useKey as test for noIteration (which corresponds to when self._.useKey > 0 and self.data is an array)

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
		// Added view markers: #m_...VIEW.../m_
		// Added tag markers: #m^...TAG..../m^
		var id, tag, end;
		if (tmplBindingKey) {
			// This is a binding marker for a data-linked tag {^{...}}
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
		// Example: "#23^TheValue/23^"
		return "#" + id + end
			+ (value != undefined ? value : "") // For {^{:name}} this gives the equivalent semantics to compiled
												 // (v=data.name)!=u?v:""; used in {{:name}} or data-link="name"
			+ "/" + id + end;
	}

	//==============================
	// Data-linking and data binding
	//==============================

	//---------------
	// observeAndBind
	//---------------

	function observeAndBind(linkCtx, source, target) { //TODO? linkFnArgs) {;
		var binding, l, linkedElem,
			tag = linkCtx.tag,
			cvtBk = linkCtx.convertBack,
			depends = [],
			bindId = linkCtx._bndId || "" + bindingKey++,
			handler = linkCtx._hdlr;

		delete linkCtx._bndId;

		if (tag) {
			// Use the 'depends' paths set on linkCtx.tag - which may have been set on declaration
			// or in events: init, render, onBeforeLink, onAfterLink etc.
			depends = tag.depends || depends;
			depends = $isFunction(depends) ? tag.depends(tag) : depends;
			linkedElem = tag.linkedElem;
		}
		if (!linkCtx._depends || ("" + linkCtx._depends !== "" + depends)) {
			// Only bind the first time, or if the new depends (toString) has changed from when last bound
			if (linkCtx._depends) {
				// Unobserve previous binding
				$observable._apply(false, [source], linkCtx._depends, handler, true);
			}
			binding = $observable._apply(false, [source], linkCtx.fn.paths, depends, handler, linkCtx._ctxCb);
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
			bindingStore[bindId] = binding; // Note: If this corresponds to a data-linked tag, we are replacing the
			// temporarily stored tag by the stored binding. The tag will now be at binding.linkCtx.tag

			if (linkedElem) {
				binding.to = [[], cvtBk];
			}
			if (linkedElem || cvtBk !== undefined) {
				bindTo(binding, tag && tag.convertBack || cvtBk);
			}
			if (tag) {
				if (tag.onAfterBind) {
					tag.onAfterBind(binding);
				}
				if (!tag.flow && !tag._.inline) {
					target.setAttribute(jsvAttrStr, (target.getAttribute(jsvAttrStr)||"") + "#" + bindId + "^/" + bindId + "^");
					tag._tgId = "" + bindId;
				}
			}
		}
		if (linkedElem && linkedElem[0]) {
			if (tag._.radio) {
				linkedElem = linkedElem.children("input[type=radio]");
			}

			l = linkedElem.length;
			while (l--) {
				linkedElem[l]._jsvBnd = linkedElem[l]._jsvBnd || (target._jsvBnd + "+");
				// Add a "+" for cloned binding - so removing elems with cloned bindings will not remove the 'parent' binding from the bindingStore.
				linkedElem[l]._jsvLnkdEl = tag;
			}
		}
	}

	//-------
	// $.link
	//-------

	function tmplLink(to, from, context, noIteration, parentView, prevNode, nextNode) {
		return $link(this, to, from, context, noIteration, parentView, prevNode, nextNode);
	}

	function $link(tmplOrLinkTag, to, from, context, noIteration, parentView, prevNode, nextNode) {
		// Consider supporting this: $.link(true, data) - (top-level activation) target defaults to body.
		// But with templates, defaulting to body makes less sense, so not support for now...
			//if (to + "" !== to) {
			// nextNode = prevNode;
			// prevNode = parentView;
			// parentView = context;
			// context = from;
			// from = to;
			// to = "body";
			//}

		if (tmplOrLinkTag && to) {
			to = to.jquery ? to : $(to); // to is a jquery object or an element or selector

			if (!activeBody) {
				activeBody = document.body;
				$(activeBody)
					.on(elementChangeStr, elemChangeHandler)
					.on('blur', '[contenteditable]', elemChangeNoValidateHandler);
			}

			var i, k, html, vwInfos, view, placeholderParent, targetEl, oldCtx,
				onRender = addBindingMarkers,
				replaceMode = context && context.target === "replace",
				l = to.length;

			while (l--) {
				targetEl = to[l];

				if ("" + tmplOrLinkTag === tmplOrLinkTag) {
					// tmplOrLinkTag is a string: treat as data-link expression.

					view = $view(targetEl);
					oldCtx = view.ctx;
					view.ctx = context;
					addDataBinding(tmplOrLinkTag, targetEl, view, from);
					view.ctx = oldCtx;
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

						html = tmplOrLinkTag.render(from, context, noIteration, parentView, undefined, onRender);
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
						vwInfos = viewInfos(targetEl._dfr, 1, rOpenViewMarkers);

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
					parentView.link(from, targetEl, prevNode, nextNode, html, undefined, context);
//}, 0);
				}
			}
		}
		return to; // Allow chaining, to attach event handlers, etc.
	}

	//----------
	// view.link
	//----------

	function viewLink(outerData, parentNode, prevNode, nextNode, html, refresh, context, validateOnly) {
		// Optionally insert HTML into DOM using documentFragments (and wrapping HTML appropriately).
		// Data-link existing contents of parentNode, or the inserted HTML, if provided

		// Depending on the content model for the HTML elements, the standard data-linking markers inserted in the HTML by addBindingMarkers during
		// template rendering will be converted either to script marker nodes or, for element-only content sections, by data-jsv element annotations.

		// Data-linking will then add _prv and _nxt to views, where:
		//     _prv: References the previous node (script element of type "jsv123"), or (for elCnt=true), the first element node in the view
		//     _nxt: References the last node (script element of type "jsv/123"), or (for elCnt=true), the next element node after the view.

		//==== nested functions ====
		function convertMarkers(all, preceding, selfClose, closeTag, spaceBefore, id, spaceAfter, tag1, tag2, closeTag2, spaceAfterClose, selfClose2, endOpenTag) {
			// rConvertMarkers = /(^|(\/>)|<\/(\w+)>|)(\s*)([#\/]\d+[_^])`(\s*)(<\w+(?=[\s\/>]))?|\s*(?:(<\w+(?=[\s\/>]))|<\/(\w+)>(\s*)|(\/>)\s*|(>))/g,
			//                 prec, slfCl, clsTag,  spBefore, id,	     spAfter,tag1,                   tag2,               clTag2,sac  slfCl2, endOpenTag
			// Convert the markers that were included by addBindingMarkers in template output, to appropriate DOM annotations:
			// data-jsv attributes (for element-only content) or script marker nodes (within phrasing or flow content).

// TODO consider detecting 'quoted' contexts (attribute strings) so that attribute encoding does not need to encode >
// Currently rAttrEncode = /[><"'&]/g includes '>' encoding in order to avoid erroneous parsing of <span title="&lt;a/>"><span title="&lt;a/>">
			var errorMsg,
				endOfElCnt = "";
			if (endOpenTag) {
				inTag = 0;
				return all;
			}
			tag = tag1 || tag2 || "";
			closeTag = closeTag || closeTag2;
			selfClose = selfClose || selfClose2;
			if (isVoid && !selfClose && (closeTag || tag || id)) {
				isVoid = undefined;
				parentTag = tagStack.shift(); // preceding tag was a void element, with no closing slash, such as <br>.
			}
			closeTag = closeTag || selfClose;
			if (closeTag) {
				inTag = 0,
				isVoid = undefined;
				// TODO: smart insertion of <tbody> - to be completed for robust insertion of deferred bindings etc.
				//if (closeTag === "table" && parentTag === "tbody") {
				//	preceding = "</tbody>" + preceding;
				//	parentTag = "table";
				//	tagStack.shift();
				//}
				if (!$viewsSettings.noValidate) {
					if (selfClose || selfClose2) {
						if (!voidElems[parentTag] && !/;svg;|;math;/.test(";" + tagStack.join(";")+ ";")) {
							// Only self-closing elements must be legitimate void elements, such as <br/>, per HTML schema,
							// or under svg or math foreign namespace elements.
							errorMsg = "'<" + parentTag + ".../";
						}
					} else if (voidElems[closeTag]) {
						errorMsg = "'</" + closeTag; // closing tag such as </input>
					} else if (!tagStack.length || closeTag !== parentTag) {
						errorMsg = "Mismatch: '</" + closeTag;
					}
					if (errorMsg) {
						syntaxError(errorMsg + ">' in:\n" + html);
					}
				}
				prevElCnt = elCnt;
				parentTag = tagStack.shift();
				elCnt = elContent[parentTag];
				closeTag2 = closeTag2 ? ("</" + closeTag2 + ">") : "";
				if (prevElCnt) {
					// If there are ids (markers since the last tag), move them to the defer string
					defer += ids;
					ids = "";
					if (!elCnt) {
						endOfElCnt = closeTag2 + openScript + "@" + defer + closeScript + (spaceAfterClose || "");
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
					// TODO: smart insertion of <tbody> - to be completed for robust insertion of deferred bindings etc.
					//if (tag === "<tr" && parentTag === "table") {
					//	tagStack.unshift(parentTag);
					//	parentTag = "tbody";
					//	preceding += "<" + parentTag + ">";
					//	if (defer) {
					//		defer += "+"; // Will be used for stepping back through deferred tokens
					//	}
					//	// TODO: move this to design-time validation check
					//	//	error('"' + parentTag + '" has incorrect parent tag');
					//}
					preceding += tag;
					if (ids) {
						preceding += ' ' + jsvAttrStr + '="' + ids + '"';
						ids = "";
					}
				}
			} else {
				// We are in phrasing or flow content, so use script marker nodes
				// Example: <script type="jsv3/"></script> - data-linked tag, close marker
				// TODO add validation to track whether we are in attribute context (not yet hit preceding ending with a >) or element content of current 'parentTag'
				// and according disallow inserting script markers in attribute context. Similar for elCnt too, so no "<table {{if ...}}...{{/if}}... >" or "<table {{if ...}}...> ...{{/if}}..."
				preceding = id
					? (preceding + endOfElCnt + spaceBefore + openScript + id + closeScript + spaceAfter + tag)
					: endOfElCnt || all;
			}

			if (inTag && id) {
				// JsViews data-linking tags are not allowed within element markup. See https://github.com/BorisMoore/jsviews/issues/213
				syntaxError(' No {^{ tags within elem markup (' + inTag + ' ). Use data-link="..."');
			}
			if (tag) {
				inTag = tag;
				// If there are ids (markers since the last tag), move them to the defer string
				tagStack.unshift(parentTag);
				parentTag = tag.slice(1);
				if (tagStack[0] && tagStack[0] === badParent[parentTag]) {
					// Missing <tbody>
					// TODO: replace this by smart insertion of <tbody> tags
					error('Parent of <tr> must be <tbody>');
				}
				isVoid = voidElems[parentTag];
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
				if (vwInfos._tkns.charAt(0) === "@") {
					// We are processing newly inserted content. This is a special script element that was created in convertMarkers() to process deferred bindings,
					// and inserted following the target parent element - because no element tags (outside elCnt) were encountered to carry those binding tokens.
					// We will step back from the preceding sibling of this element, looking at targetParent elements until we find the one that the current binding
					// token belongs to. Set elem to null (the special script element), and remove it from the DOM.
					targetParent = elem.previousSibling;
					elem.parentNode.removeChild(elem);
					elem = undefined;
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
								deep = targetParent && (!elem || elem.parentNode !== targetParent); // We are stepping back looking for the right targetParent,
								// or we are linking existing content and this element is in elCnt, not an immediate child of the targetParent.
								if (!elem || deep) {
									tag.parentElem = targetParent;
								}
								if (vwInfo.elCnt && deep) {
									// With element only content, if there is no following element, or if the binding is deeper than the following element
									// then we need to set the open or close token as a deferred binding annotation on the parent
									targetParent._dfr = (vwInfo.open ? "#" : "/") + id + bindChar + (targetParent._dfr || "");
								}
								// This is an open or close marker for a data-linked tag {^{...}}. Add it to bindEls.
								addedBindEls.push([deep ? null : elem, vwInfo]);
							}
						} else if (view = viewStore[id = vwInfo.id]) {
							// The view may have been deleted, for example in a different handler to an array collectionChange event
							if (!view.parentElem) {
								// If view is not already extended for JsViews, extend and initialize the view object created in JsRender, as a JsViews view
								view.parentElem = targetParent || elem && elem.parentNode || parentNode;
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
								if (onAftCr = view.ctx && view.ctx.onAfterCreate || onAfterCreate) {
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
			// Similar to processViewInfos in how it steps through bindings to find tags. Only finds data-linked tags.
			var level, parentTag;

			if (vwInfos) {
				len = vwInfos.length;
				for (j = 0; j < len; j++) {
					vwInfo = vwInfos[j];
					if (get.id) {
						get.id = get.id !== vwInfo.id && get.id;
					} else {
						// This is an open marker for a data-linked tag {^{...}}, within the content of the tag whose id is get.id. Add it to bindEls.
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
			if (prevNode && prevNode.innerHTML) {
				// Find the last contained node of prevNode, to use as the prevNode - so we only link subsequent elems in the query
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
						// If a childTags() call, getViewInfos returns array of tag bindings.
							&& !get && elem.getAttribute($viewsLinkAttr)) {
								bindEls.push([elem]); // A data-linked element so add to bindEls too
							}
			}
			if (self === topView && html === undefined && parentNode.getAttribute($viewsLinkAttr)) {
				bindEls.push([parentNode]); // Support data-linking top-level element directly (not within a data-linked container)
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
						processViewInfos(viewInfos(defer + "+", 1), nextNode);
					} else {
						processViewInfos(viewInfos(defer, 1), parentNode);
					}
				}
				processViewInfos(viewInfos(ids, 1), parentNode);
				// If there were any tokens on nextNode which have now been associated with inserted HTML tags, remove them from nextNode
				if (nextNode) {
					tokens = nextNode.getAttribute(jsvAttrStr);
					if (l = tokens.indexOf(prevIds) + 1) {
						tokens = tokens.slice(l + prevIds.length - 1);
					}
					nextNode.setAttribute(jsvAttrStr, ids + tokens);
				}
			}

			//================ Bind the data-linked elements and tags ================
			l = bindEls.length;
			for (i = 0; i < l; i++) {
				elem = bindEls[i];
				linkInfo = elem[1];
				elem = elem[0];
				if (linkInfo) {
					if (tag = bindingStore[linkInfo.id]) {
						if (linkCtx = tag.linkCtx) {
							// The tag may have been stored temporarily on the bindingStore - or may have already been replaced by the actual binding
							tag = linkCtx.tag;
							tag.linkCtx = linkCtx;
						}
						if (linkInfo.open) {
							// This is an 'open linked tag' binding annotation for a data-linked tag {^{...}}
							if (elem) {
								tag.parentElem = elem.parentNode;
								tag._prv = elem;
							}
							tag._elCnt = linkInfo.elCnt;
							if (tag && (!tag.onBeforeLink || tag.onBeforeLink() !== false) && !tag._.bound) {
								// By default we data-link depth-last ("on the way in"), which is better for perf. But if a tag needs nested tags to be linked (refreshed)
								// first, before linking its content, then make onBeforeLink() return false. In that case we data-link depth-first ("on the way out"), so nested tags will have already refreshed.
								tag._.bound = true;
								view = tag.tagCtx.view;
								addDataBinding(undefined, tag._prv, view, outerData, linkInfo.id);
							}

							tag._.linking = true;
						} else {
							tag._nxt = elem;
							if (tag._.linking) {
								// This is a 'close linked tag' binding annotation
								// Add data binding
								tagCtx = tag.tagCtx;
								view = tagCtx.view;
								delete tag._.linking;
								if (!tag._.bound) {
									tag._.bound = true;
									addDataBinding(undefined, tag._prv, view, outerData, linkInfo.id);
								}
								callAfterLink(tag, tagCtx);
							}
						}
					}
				} else {
					view = $view(elem);
					// Add data binding for a data-linked element (with data-link attribute)
					addDataBinding(elem.getAttribute($viewsLinkAttr), elem, view, outerData, undefined, context);
				}
			}
			lazyLink && lazyLink.resolve();
		}
		//==== /end of nested functions ====

		var inTag, linkCtx, tag, i, l, j, len, elems, elem, view, vwInfo, linkInfo, prevNodes, token, prevView, nextView, node, tags, deep, tagName, tagCtx,
			tagDepth, get, depth, fragment, copiedNode, firstTag, parentTag, isVoid, wrapper, div, tokens, elCnt, prevElCnt, htmlTag, ids, prevIds, found, lazyLink,
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

		if (html != undefined) {
			//================ Insert html into DOM using documentFragments (and wrapping HTML appropriately). ================
			// Also convert markers to DOM annotations, based on content model.
			// Corresponds to nextNode ? $(nextNode).before(html) : $(parentNode).html(html);
			// but allows insertion to wrap correctly even with inserted script nodes. jQuery version will fail e.g. under tbody or select.
			// This version should also be slightly faster
			div = document.createElement("div");
			wrapper = div;
			prevIds = ids = "";
			htmlTag = parentNode.namespaceURI === "http://www.w3.org/2000/svg" ? "svg_ns" : (firstTag = rFirstElem.exec(html)) && firstTag[1] || "";
			if (noDomLevel0 && firstTag && firstTag[2]) {
				error("Unsupported: " + firstTag[2]); // For security reasons, don't allow insertion of elements with onFoo attributes.
			}
			if (elCnt) {
				// Now look for following view, and find its tokens, or if not found, get the parentNode._dfr tokens
				node = nextNode;
				while (node && !(nextView = viewInfos(node))) {
					node = node.nextSibling;
				}
				if (tokens = nextView ? nextView._tkns : parentNode._dfr) {
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
			isVoid = undefined;
			html = ("" + html).replace(rConvertMarkers, convertMarkers);
//			if (!!oldElCnt !== !!elCnt) {
//				error("Parse: " + html); // Parse error. Content not well-formed?
//			}
			if (!$viewsSettings.noValidate && tagStack.length) {
				syntaxError("Mismatched '<" + parentTag + "...>' in:\n" + html); // Unmatched tag
			}
			if (validateOnly) {
				return;
			}
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

	function addDataBinding(linkMarkup, node, currentView, data, boundTagId, context) {
		// Add data binding for data-linked elements or {^{...}} data-linked tags
		var tmpl, tokens, attr, convertBack, params, trimLen, tagExpr, linkFn, linkCtx, tag, rTagIndex;

		data = currentView.data === undefined ? data || {} : currentView.data;
		if (boundTagId) {
			// {^{...}} data-linked tag. So only one linkTag in linkMarkup
			tag = bindingStore[boundTagId];
			tag = tag.linkCtx ? tag.linkCtx.tag : tag;

			linkCtx = tag.linkCtx || {
				data: data,             // source
				elem: tag._elCnt ? tag.parentElem : node,             // target
				view: currentView,
				ctx: currentView.ctx,
				attr: htmlStr, // Script marker nodes are associated with {^{ and always target HTML.
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

				linkMarkup = normalizeLinkTag(linkMarkup, defaultAttr(node));
				rTag.lastIndex = 0;
				while (tokens = rTag.exec(linkMarkup)) { // TODO require } to be followed by whitespace or $, and remove the \}(!\}) option.
					// Iterate over the data-link expressions, for different target attrs,
					// (only one if there is a boundTagId - the case of data-linked tag {^{...}})
					// e.g. <input data-link="{:firstName:} title{>~description(firstName, lastName)}"
					// tokens: [all, attr, bindOnly, tagExpr, tagName, converter, colon, html, comment, code, params]
					rTagIndex = rTag.lastIndex;
					attr = boundTagId ? htmlStr : tokens[1]; // Script marker nodes are associated with {^{ and always target HTML.
					tagExpr = tokens[3];
					params = tokens[10];
					convertBack = undefined;

					linkCtx = {
						data: data, // source
						elem: node, // target
						view: currentView,
						ctx: context || currentView.ctx,
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
							}
						}
						if (convertBack === null) {
							convertBack = undefined;
						}
						linkCtx.convert = tokens[5] || "";
					}
					// Compile the linkFn expression which evaluates and binds a data-link expression
					// TODO - optimize for the case of simple data path with no conversion, helpers, etc.:
					//     i.e. data-link="a.b.c". Avoid creating new instances of Function every time. Can use a default function for all of these...

					linkCtx.expr = attr + tagExpr;
					linkFn = tmpl.links[tagExpr];
					if (!linkFn) {
						tmpl.links[tagExpr] = linkFn = $sub.tmplFn(tagExpr, tmpl, true, convertBack);
					}
					linkCtx.fn = linkFn;
					if (!attr && convertBack !== undefined) {
						// Default target, so allow 2 way binding
						linkCtx.convertBack = convertBack;
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
		handler.noArray = true;
		linkCtx._ctxCb = getContextCb(linkCtx.view); // _ctxCb is for filtering/appending to dependency paths: function(path, object) { return [(object|path)*]}
		linkCtx._hdlr = handler;
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
		// Test whether node is a script marker node, and if so, return metadata
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
			infos._tkns = tokens;
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

	function normalizeLinkTag(linkMarkup, twoway) {
		linkMarkup = $.trim(linkMarkup).replace(rEscapeQuotes, "\\$&");
		return linkMarkup.slice(-1) !== delimCloseChar0
		// If simplified syntax is used: data-link="expression", convert to data-link="{:expression}",
		// or for inputs, data-link="{:expression:}" for (default) two-way binding
			? linkMarkup = delimOpenChar1 + ":" + linkMarkup + (twoway ? ":" : "") + delimCloseChar0
			: linkMarkup;
	}

	//===========================
	// Methods for views and tags
	//===========================

	linkMethods = {
		contents: function(deep, select) {
			// For a view or a tag, return jQuery object with the content nodes,
			if (deep !== !!deep) {
					// deep not boolean, so this is getContents(selector)
					select = deep;
					deep = undefined;
				}
			var filtered,
				nodes = $(this.nodes());
			if (nodes[0]) {
				filtered = select ? nodes.filter(select) : nodes;
				nodes = deep && select ? filtered.add(nodes.find(select)) : filtered;
			}
			return nodes;
		},

		nodes: function(withMarkers, prevNode, nextNode) {
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
				if (withMarkers || elCnt || node.tagName !== "SCRIPT") {
					// All the top-level nodes in the view
					// (except script marker nodes, unless withMarkers = true)
					// (Note: If a script marker node, viewInfo.elCnt undefined)
					nodes.push(node);
				}
				node = node.nextSibling;
			}
			return nodes;
		},

		childTags: function(deep, tagName) {
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
		},

		refresh: function(sourceValue) {
			var promise, attr,
				tag = this,
				linkCtx = tag.linkCtx,
				view = tag.tagCtx.view;

			if (tag.disposed) { error("Removed tag"); }
			if (sourceValue === undefined) {
				sourceValue = $views._tag(tag, view, view.tmpl, mergeCtxs(tag), true); // Get rendered HTML for tag, based on refreshed tagCtxs
			}
			if (sourceValue + "" === sourceValue) {
				// If no rendered content, sourceValue will not be a string (can be 0 or undefined)
				attr = tag._.inline ? htmlStr : (linkCtx.attr || defaultAttr(tag.parentElem, true));
				promise = updateContent(sourceValue, linkCtx, attr, tag);
			}

			callAfterLink(tag, tag.tagCtx);
			return promise || tag;
		},

		update: function(value) {
			var linkedElem = this.linkedElem;
			if (linkedElem) {
				elemChangeHandler({
					target: linkedElem[0]
				}, undefined, value);
			}
		}
	};

	function callAfterLink(tag, tagCtx) {
		var linkedElem, elem, radioButtons, val, bindings, i, l, linkedTag, oldTrig, newTrig,
			view = tagCtx.view,
			linkCtx = tag.linkCtx = tag.linkCtx || {
				tag: tag,
				data: view.data,
				view: view,
				ctx: view.ctx
			};

		if (tag.onAfterLink) {
			tag.onAfterLink(tagCtx, linkCtx);
		}
		linkedElem = tag.targetTag ? tag.targetTag.linkedElem : tag.linkedElem;
		if (elem = linkedElem && linkedElem[0]) {
			if (radioButtons = tag._.radio) {
				linkedElem = linkedElem.children("input[type=radio]");
			}
			if (radioButtons || !tag._.chging) {
				val = $sub.cvt(tag, tag.convert)[0];

				if (radioButtons || elem !== linkCtx.elem) {
					l = linkedElem.length;
					while (l--) {
						elem = linkedElem[l];
						linkedTag = elem._jsvLnkdEl;
						if (tag._.inline && (!linkedTag || linkedTag !== tag && linkedTag.targetTag !== tag)) {
							elem._jsvLnkdEl = tag;
							// For data-linked tags, identify the linkedElem with the tag, for "to" binding
							// (For data-linked elements, if not yet bound, we identify later when the linkCtx.elem is bound)
							bindings = linkCtx.elem ? linkCtx.elem._jsvBnd : tag._prv._jsvBnd;
							elem._jsvBnd = bindings + "+";
							// Add a "+" for cloned binding - so removing elems with cloned bindings will not remove the 'parent' binding from the bindingStore.

							bindings = bindings.slice(1).split("&");
							i = bindings.length;
							while (i--) {
								bindTo(bindingStore[bindings[i]], tag.convertBack);
							}
						}
						if (radioButtons) {
							// For radio button, set to if val === value. For others set val() to val, below
							elem[CHECKED] = val === elem.value;
						}
					}
					linkCtx._val = val;
				}
				if (!radioButtons && elem.value !== undefined && val !== undefined) {
					if (elem.type === CHECKBOX) {
						elem[CHECKED] = val && val !== "false";
					} else {
						linkedElem.val(val);
					}
				}
			}
		}
		if (elem = elem || tag.tagName === ":" && linkCtx.elem) {
			oldTrig = elem._jsvTr;
			newTrig = tagCtx.props.trigger;
			newTrig = newTrig === true ? 'keyup' : newTrig;
			if (oldTrig !== newTrig) {
				elem._jsvTr = newTrig
				elem = $(elem);

				oldTrig && elem.off(oldTrig, elemChangeHandler);
				newTrig && elem.on(newTrig, elemChangeHandler);
			}
		}
	}

	function bindTo(binding, cvtBk) {
		// Two-way binding.
		// We set the binding.to[1] to be the cvtBack, and binding.to[0] to be either the path to the target, or [object, path] where the target is the path on the provided object.
		// So for a path with an object call: a.b.getObject().d.e, then we set to[0] to be [returnedObject, "d.e"], and we bind to the path on the returned object as target
		// Otherwise our target is the first path, paths[0], which we will convert with contextCb() for paths like ~a.b.c or #x.y.z
//TODO add support for two-way binding with bound named props and no bindto expression. <input data-link="{:a ^foo=b:}"
//- currently will not bind to the correct target - but bindto does gives workaround
		var bindto, pathIndex, firstPath, lastPath, bindtoOb,
			lct = binding.linkCtx,
			source = lct.data,
			paths = lct.fn.paths;
		if (binding) {
			if (bindto = paths._jsvto) {
				paths = bindto;
			}
			pathIndex = paths.length;
			while (pathIndex && "" + (lastPath = paths[--pathIndex]) !== lastPath) {} // If the lastPath is an object (e.g. with _jsvOb property), take preceding one
			if (lastPath && (!lct.tag || lct.tag.tagCtx.args.length)) {
				lastPath = lastPath.split("^").join("."); // We don't need the "^" since binding has happened. For to binding, require just "."s
				binding.to = lastPath.charAt(0) === "."
					? [[bindtoOb = paths[pathIndex-1], lastPath.slice(1)], cvtBk] // someexpr().lastpath - so need to get the bindtoOb object returned from the expression
					: [lct._ctxCb(firstPath = pathIndex ? paths[0].split("^").join(".") : lastPath) || [source, firstPath], cvtBk];

				if (bindto && bindtoOb) {
					// This is a bindto binding {:expr bindto=someob().some.path:}
					// If it returned an object, we need to call the callback to get the object instance, so we bind to the final path (.some.path) starting from that object
					// TODO add unit tests for this scenario
					binding.to[0][0] = lct._ctxCb(bindtoOb, source);
				}
			} else {
				binding.to = [[], cvtBk];
			}
		}
	}

	function mergeCtxs(tag, newCtxs) { // Merge updated tagCtxs into tag.tagCtxs
		var tagCtx, newTagCtx,
			view = tag.tagCtx.view,
			tagCtxs = tag.tagCtxs || [tag.tagCtx],
			l = tagCtxs.length,
			refresh = !newCtxs;

		newCtxs = newCtxs || tag._.bnd.call(view.tmpl, (tag.linkCtx || view).data, view, $views);

		while (l--) {
			tagCtx = tagCtxs[l];
			newTagCtx = newCtxs[l];
			$.observable(tagCtx.props).setProperty(newTagCtx.props);
			$extend(tagCtx.ctx, newTagCtx.ctx); // We don't support propagating ctx variables, ~foo, observably, to nested views. So extend, not setProperty...
			tagCtx.args = newTagCtx.args;
			if (refresh) {
				tagCtx.tmpl = newTagCtx.tmpl;
			}
		}
		return tagCtxs;
	}

	//=========
	// Disposal
	//=========

	function clean(elems) {
		// Remove data-link bindings, or contained views
		var l, elem, bindings,
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
					// This may be an element with data-link, or the opening script marker node for a data-linked tag {^{...}}
					// bindings is a string with the syntax: "(&bindingId)*"
					bindings = bindings.slice(1).split("&");
					elem._jsvBnd = "";
					l = bindings.length;
					while (l--) {
						// Remove associated bindings
						removeViewBinding(bindings[l], elem._jsvLnkdEl, elem); // unbind bindings with this bindingId on this view
					}
				}
				disposeTokens(markerNodeInfo(elem) + (elem._dfr || ""));
			}
		}
	}

	function removeViewBinding(bindId, linkedElemTag, elem) {
		// Unbind
		var objId, linkCtx, tag, object, obsId, tagCtxs, l, map, linkedElem, trigger,
			binding = bindingStore[bindId];

		if (linkedElemTag) {
			if (elem === linkedElemTag.linkedElem[0]) {
				delete elem._jsvLnkdEl;
				delete linkedElemTag.linkedElem;
			}
		} else if (binding) {
			delete bindingStore[bindId]; // Delete already, so call to onDispose handler below cannot trigger recursive deletion (through recursive call to jQuery cleanData)
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

			if (linkCtx = binding.linkCtx) {
				if (tag = linkCtx.tag) {
					if (tagCtxs = tag.tagCtxs) {
						l = tagCtxs.length;
						while (l--) {
							if (map = tagCtxs[l].map) {
								map.unmap(); //unobserve
							}
						}
					}
					linkedElem = tag.linkedElem;
					linkedElem = linkedElem && linkedElem[0] || linkCtx.elem;

					if (trigger = linkedElem && linkedElem._jsvTr) {
						$(linkedElem).off(trigger, elemChangeHandler);
						linkedElem._jsvTr = undefined;
					}

					if (tag.onDispose) {
						tag.onDispose();
					}

					if (!tag._elCnt) {
						tag._prv && tag._prv.parentNode.removeChild(tag._prv);
						tag._nxt && tag._nxt.parentNode.removeChild(tag._nxt);
					}
				}
				delete linkCtx.view._.bnds[bindId];
			}
			delete $sub._cbBnds[binding.cbId];
		}
	}

	function $unlink(tmplOrLinkTag, to) {
		if (tmplOrLinkTag === undefined) {
			// Call to $.unlink() is equivalent to $.unlink(true, "body")
			if (activeBody) {
				$(activeBody)
					.off(elementChangeStr, elemChangeHandler)
					.off('blur', '[contenteditable]', elemChangeNoValidateHandler);
				activeBody = undefined;
			}
			tmplOrLinkTag = true;
			topView.removeViews();
			clean(document.body.getElementsByTagName("*"));
		} else if (to && tmplOrLinkTag === true) {
			to = to.jquery ? to : $(to); // to is a jquery object or an element or selector
			to.each(function() {
				var innerView;
				while ((innerView = $view(this, true)) && innerView.parent) {
					innerView.parent.removeViews(innerView._.key, undefined, true);
				}
				clean(this.getElementsByTagName("*"));
				clean([this]);
			});
		}
		return to; // Allow chaining, to attach event handlers, etc.

//} else if (to) {
//	to = to.jquery ? to : $(to); // to is a jquery object or an element or selector
//	if (tmplOrLinkTag === true) {
//		// Call to $(el).unlink(true) - unlink content of element, but don't remove bindings on element itself
//		to.each(function() {
//			var innerView;
////TODO fix this for better perf. Rather that calling inner view multiple times which does querySelectorAll each time, consider a single querySelectorAll
//// or simply call view.removeViews() on the top-level views under the target 'to' node, then clean(...)
//			while ((innerView = $view(this, true)) && innerView.parent) {
//				innerView.parent.removeViews(innerView._.key, undefined, true);
//			}
//			clean(this.getElementsByTagName("*"));
//			clean([this]);
//		});
//	} else if (tmplOrLinkTag === undefined) {
//		// Call to $(el).unlink() // Not currently supported
//		clean(to);
////TODO provide this unlink API
//	} else if ("" + tmplOrLinkTag === tmplOrLinkTag) {
//		// Call to $(el).unlink(tmplOrLinkTag ...)
//		$.each(to, function() {
//			//...
//		});
//	}
//TODO - unlink the content and the arrayChange, but not any other bindings on the element (if container rather than "replace")
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
			// the individual tokens, 'a', 'b', 'c'... Currently it is called multiple times
			var tokens, tag,
				items = [object];
			if (view && path) {
				if (path._jsvOb) {
					return path._jsvOb.call(view.tmpl, object, view, $views);
				}
				if (path.charAt(0) === "~") {
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
					return object ? items : [];
				}
				if (path.charAt(0) === "#") {
					// We return new items to insert into the sequence, replacing the "#a.b.c" string: [view, "a.b.c" currentDataItem]
					// so currentDataItem becomes the object for subsequent paths. The 'true' flag makes the paths bind only to leaf changes.
					return path === "#data" ? [] : [view, path.replace(rViewPath, ""), object];
				}
			}
		};
	}

	function inputAttrib(elem) {
		return elem.type === CHECKBOX ? elem[CHECKED] : elem.value;
	}

	//========================== Initialize ==========================

	//=====================
	// JsRender integration
	//=====================

	$extend($sub, {
		onStoreItem: function(storeName, name, item) {
			if (item) {
				if (storeName === "template") {
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
				} else if (storeName === "tag") {
					$sub._lnk(item);
				}
			}
		},

		_lnk: function(item) {
			return $extend(item, linkMethods);
		},

		viewInfos: viewInfos // Expose viewInfos() as public helper method
	});

	// Initialize default delimiters
	($viewsSettings.delimiters = function() {
		var delimChars = oldJsvDelimiters.apply($views, arguments);
		delimOpenChar0 = delimChars[0];
		delimOpenChar1 = delimChars[1];
		delimCloseChar0 = delimChars[2];
		delimCloseChar1 = delimChars[3];
		linkChar = delimChars[4];
		rTag = new RegExp("(?:^|\\s*)([\\w-]*)(\\" + linkChar + ")?(\\" + delimOpenChar1 + $sub.rTag + "\\" + delimCloseChar0 + ")", "g");

		// Default rTag:      attr  bind tagExpr   tag         converter colon html     comment            code      params
		//          (?:^|\s*)([\w-]*)(\^)?({(?:(?:(\w+(?=[\/\s}]))|(?:(\w+)?(:)|(>)|!--((?:[^-]|-(?!-))*)--|(\*)))\s*((?:[^}]|}(?!}))*?))})
		return this;
	})();

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
				tokens = vwInfos._tkns.slice(0, precedingLength) + tokens.slice(l + (refresh ? -1 : id.length + 1));
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

	function disposeTokens(tokens) {
		var i, l, vwItem, vwInfos;
		if (vwInfos = viewInfos(tokens, 1, rOpenMarkers)) {
			for (i = 0, l = vwInfos.length; i < l; i++) {
				vwItem = vwInfos[i];
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

	//====================================
	// Add linked view methods to view prototype
	//====================================

	$extend(
		$sub._lnk($sub.View.prototype),
		{
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
							// This is fixing up index, but not key, and not index on child views. From child views, use view.getIndex()
						}
					}
				}
				return self;
			},

			removeViews: function(index, itemsCount, keepNodes) {
				// view.removeViews() removes all the child views
				// view.removeViews(index) removes the child view with specified index or key
				// view.removeViews(index, count) removes the specified nummber of child views, starting with the specified index
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
							try {
								prevNode.parentNode.removeChild(prevNode); // (prevNode.parentNode is parentElem, except if jQuery Mobile or similar has inserted an intermediate wrapper)
								nextNode.parentNode.removeChild(nextNode);
							} catch (e) {}
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

			link: viewLink
		}
	);

	viewStore = { 0: topView = new $sub.View(undefined, "top") }; // Top-level view

	//========================
	// JsViews-specific converters
	//========================

	$converters.merge = function(val) {
		// Special converter used in data-linking to space-separated lists, such as className:
		// Currently only supports toggle semantics - and has no effect if toggle string is not specified
		// data-link="class{merge:boolExpr toggle=className}"
		var regularExpression,
			currentValue = this.linkCtx._val || "",
			toggle = this.tagCtx.props.toggle;

		if (toggle) {
			// We are toggling the class specified by the toggle property,
			// and the boolean val binding is driving the insert/remove toggle

			regularExpression = toggle.replace(/[\\^$.|?*+()[{]/g, "\\$&");
			// Escape any regular expression special characters (metacharacters) within the toggle string
			regularExpression = "(\\s(?=" + regularExpression + "$)|(\\s)|^)(" + regularExpression + "(\\s|$))";
			// Example: /(\s(?=myclass$)|(\s)|^)?(myclass(\s|$))/ - so matches (" myclass" or " " or ^ ) followed by ("myclass " or "myclass$") where ^/$ are beginning/end of string
			currentValue = currentValue.replace(new RegExp(regularExpression), "$2");
			val = currentValue + (val ? (currentValue && " ") + toggle : "");
		}
		return val;
	};

	//========================
	// JsViews-specific tags
	//========================

	$tags("on", {
		attr: "none",
		onAfterLink: function(tagCtx, linkCtx) {
			var self = this,
				args = tagCtx.args, // [events,] [selector,] handler
				data = tagCtx.props.data,
				view = tagCtx.view,
				handler = args.pop(),
				contextOb = tagCtx.props.context; // Context ('this' pointer) for attached handler

			if (!contextOb) {
				// Get the path for the preceding object (context object) of handler (which is the last arg), compile function
				// to return that context object, and run compiled function against data
				contextOb = /^(.*)[\.^][\w$]+$/.exec(tagCtx.params.args.slice(-1)[0]);
				contextOb = contextOb && $sub.tmplFn("{:" + contextOb[1] + "}", view.tmpl, true)(linkCtx.data, view);
			}
			if (handler && handler.call) {
				if (self._evs) {
					self.onDispose();
				}
				$(linkCtx.elem).on(
					self._evs = args[0] || "click", // events defaults to "click"
					self._sel = args[1],
					data == undefined ? null : data,
					self._hlr = function(ev) {
						handler.call(contextOb || linkCtx.data, ev, {change: ev.type, view: view, linkCtx: linkCtx});
						return false;
					}
				);
			}
		},
		onDispose: function() {
			$(this.parentElem).off(this._evs, this._sel, this._hlr);
		},
		flow: true
	});

	$extend($tags['for'], {
		//onUpdate: function(ev, eventArgs, tagCtxs) {
			//Consider adding filtering for perf optimization. However the below prevents update on some scenarios which _should_ update - namely when there is another array on which for also depends.
			//var i, l, tci, prevArg;
			//for (tci = 0; (prevArg = this.tagCtxs[tci]) && prevArg.args.length; tci++) {
			//	if (prevArg.args[0] !== tagCtxs[tci].args[0]) {
			//		return true;
			//	}
			//}
			//return false;
		//},
		onArrayChange: function(ev, eventArgs) {
			var arrayView,
				self = this,
				change = eventArgs.change;
			if (self.tagCtxs[1] && ( // There is an {{else}}
					change === "insert" && ev.target.length === eventArgs.items.length // inserting, and new length is same as inserted length, so going from 0 to n
					|| change === "remove" && !ev.target.length // removing , and new length 0, so going from n to 0
					|| change === "refresh" && !eventArgs.oldItems.length !== !ev.target.length // refreshing, and length is going from 0 to n or from n to 0
				)) {
				self.refresh();
			} else {
				for (arrayView in self._.arrVws) {
					arrayView = self._.arrVws[arrayView];
					if (arrayView.data === ev.target) {
						arrayView._.onArrayChange.apply(arrayView, arguments);
					}
				}
			}
			ev.done = true;
		},
		onAfterLink: function() {
			var i, tagCtx, arrHandler, arrBinding, data,
				self = this,
				arrayBindings = self._ars || {},
				tagCtxs = self.tagCtxs,
				l = tagCtxs.length,
				selected = self.selected || 0;

			for (i = 0; i <= selected; i++) {
				tagCtx = tagCtxs[i];        // loop through tagCtxs up to selected
				data = tagCtx.map
					? tagCtx.map.tgt        // 'data' is mapped data
					: tagCtx.args.length
						? tagCtx.args[0]    // or args[0]
						: tagCtx.view.data; // or defaults to current data.

				if ((arrBinding = arrayBindings[i]) && data !== arrBinding[0]) { // Is there previous array data on this tagCtx, different from new data
					$observe(arrBinding[0], arrBinding[1], true); //unobserve previous array
					delete arrayBindings[i];
				}
				if (!arrayBindings[i] && $.isArray(data)) {
					$observe(data, arrHandler = function(ev, eventArgs) { // Store array data as self._ar, and arrayChangeHandler as self._arCh
						self.onArrayChange(ev, eventArgs);
					});
					arrayBindings[i] = [data, arrHandler];
				}
			}
			for (i = selected + 1; i < l; i++) { // If there were previous bindings on later tagCtxs, remove them
				if (arrBinding = arrayBindings[i]) {
					$observe(arrBinding[0], arrBinding[1], true); //unobserve previous binding
					delete arrayBindings[i];
				}
			}
			self._ars = arrayBindings;
		},
		onDispose: function() {
			var l, self = this;
			for (l in self._ars) {
				$observe(self._ars[l][0], self._ars[l][1], true); //unobserve
			}
		}
	});

	$extend($tags['for'], linkMethods);
	$extend($tags['if'], linkMethods);
	$extend($tags.include, linkMethods);

	function observeProps(source, target, ev, eventArgs) {
		switch (eventArgs.change) {
			case "set":
				var l = target.length;
				while (l--) {
					if (target[l].key === eventArgs.path) {
						break;
					}
				}
				if (l === -1) {
					if (eventArgs.path) {
						$.observable(target).insert({ key: eventArgs.path, prop: eventArgs.value });
					}
				} else if (eventArgs.remove) {
					$.observable(target).remove(l);
				} else {
					$.observable(target[l]).setProperty("prop", eventArgs.value);
				}
		}
	}

	function observeMappedProps(source, target, ev, eventArgs) {
		var item;
		switch (eventArgs.change) {
			case "set":
				if (eventArgs.path === "prop") {
					$.observable(source).setProperty(ev.target.key, eventArgs.value);
				} else { // path === "key"
					$.observable(source).setProperty(eventArgs.oldValue, null);
					delete source[eventArgs.oldValue];
					$.observable(source).setProperty(eventArgs.value, ev.target.prop);
				}
				break;
			case "remove":
				item = eventArgs.items[0];
				$.observable(source).removeProperty(item.key);
				delete source[item.key];
				break;
			case "insert":
				item = eventArgs.items[0];
				if (item.key) {
					$.observable(source).setProperty(item.key, item.prop);
				}
				break;
		}
	}

	function shallowArrayFilter(key, object, allPath) { // Filter used by {{props}} for the mappedProps target array
		return (allPath.indexOf(".") < 0) && object[key];
	}

	$tags({
		props: $.extend({}, $tags['for'], $sub.DataMap($tags.props.getTgt, observeProps, observeMappedProps, undefined, shallowArrayFilter))
	});

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
			if (elems.length && isCleanCall) {
				// Remove JsViews bindings. Also, remove from the DOM any corresponding script marker nodes
				clean(elems);
			}
			oldCleanData.apply($, arguments);
		}
	});

	$views.utility = {
		validate: function(html) {
			try {
				topView.link(undefined, document.createElement("div"), undefined, undefined, html, undefined, undefined, 1);
			}
			catch (e) {
				return e.message;
			}
		}
	};

	//===============================
	// Extend jQuery instance plugins
	//===============================

	$extend($.fn, {
		link: function(expr, from, context, noIteration, parentView, prevNode, nextNode) {
			return $link(expr, this, from, context, noIteration, parentView, prevNode, nextNode);
		},
		unlink: function(expr) {
			return $unlink(expr, this);
		},
		view: function(type) {
			return $view(this[0], type);
		}
	});

	//==============================================================================
	// Override jQuery methods that call our overridden cleanData, for disposal etc.
	//==============================================================================

	$.each([htmlStr, "replaceWith", "empty", "remove"], function(i, name) {
		var oldFn = $.fn[name];
		$.fn[name] = function() {
			var result;
			isCleanCall = 1; // Make sure cleanData does disposal only when coming from these calls.
			try {
				result = oldFn.apply(this, arguments);
			}
			finally {
				isCleanCall = 0;
			}
			return result;
		};
	});

	//===============
	// Extend topView
	//===============

	$extend(topView, {tmpl: {links: {}, tags: {}}});
	topView._.onRender = addBindingMarkers;
	//=========================
	// Extend $.views.settings
	//=========================

	$viewsSettings({
		wrapMap: wrapMap = {
			option: [1, "<select multiple='multiple'>", "</select>"],
			legend: [1, "<fieldset>", "</fieldset>"],
			area: [1, "<map>", "</map>"],
			param: [1, "<object>", "</object>"],
			thead: [1, "<table>", "</table>"],
			tr: [2, "<table><tbody>", "</tbody></table>"],
			td: [3, "<table><tbody><tr>", "</tr></tbody></table>"],
			col: [2, "<table><tbody></tbody><colgroup>", "</colgroup></table>"],
			svg_ns: [1, "<svg>", "</svg>"],

			// IE6-8 can't serialize link, script, style, or any html5 (NoScope) tags,
			// unless wrapped in a div with non-breaking characters in front of it.
			div: jQuery.support.htmlSerialize ? [0, "", ""] : [1, "X<div>", "</div>"]
		},
		linkAttr: $viewsLinkAttr = "data-link",
		merge: {
			input: {
				from: inputAttrib, to: "value"
			},
			textarea: valueBinding,
			select: valueBinding,
			optgroup: {
				to: "label"
			}
		},
		jsrDbgMode: $viewsSettings.debugMode, // debugMode for JsRender
		debugMode: function(debugMode) { // debugMode for JsViews
			$viewsSettings.jsrDbgMode(debugMode);
			if (debugMode) {
				global._jsv = { // In debug mode create global _jsv, for accessing views, etc
					views: viewStore,
					bindings: bindingStore
				};
			} else {
				delete global._jsv;
			}
		},
		jsv: function() {
			$viewsSettings.debugMode($viewsSettings._dbgMode);
			$viewsLinkAttr = $viewsSettings.linkAttr;
			error = $views._err;
			linkViewsSel = bindElsSel + ",[" + $viewsLinkAttr + "]";
			noDomLevel0 = $viewsSettings.noDomLevel0;
			wrapMap.optgroup = wrapMap.option;
			wrapMap.tbody = wrapMap.tfoot = wrapMap.colgroup = wrapMap.caption = wrapMap.thead;
			wrapMap.th = wrapMap.td;
		}
	});

//TODO
// Tests for different attr settings on tags
	// tests of onAfterBind extensibility
	// tests for DataMap
	// tests for map=...
	// Allow for registering DataMaps
	// tests for programmatic DataMap scenarios
	// tests for sorted table, using map=sort or {{sort}} with props for setting sort parameters
	// tests for setting()
	// tests for settings.debugMode()
	// tests for {on data=...}
	// tests for {on } binding when doing top-level data-linking
// tests for debug mode, noDomLevel0, noValidate
// linkTo docs and tests.
// Additional tests and examples for structured params - tagCtx.params
// Using jsobservable without jsviews - settings??
// Examples for:
	// overriding error messages
	// Binding to tag properties and contextual properties
	// Fallback strings or onError handlers for any tag instance
	// $.observable(object).removeProperty(path)
	// data-link="{on ... myHandler}" (See unit tests. Examples to follow)
})(this, this.jQuery);
