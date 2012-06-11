/*! JsViews v1.0pre: http://github.com/BorisMoore/jsviews */
/*
* Interactive data-driven views using templates and data-linking.
* Requires jQuery, and jsrender.js (next-generation jQuery Templates, optimized for pure string-based rendering)
*    See JsRender at http://github.com/BorisMoore/jsrender
*
* Copyright 2012, Boris Moore
* Released under the MIT License.
*/
// informal pre beta commit counter: 17

this.jQuery && jQuery.link || (function(global, undefined) {
	// global is the this object, which is window when running in the usual browser environment.

	//========================== Top-level vars ==========================

	var versionNumber = "v1.0pre",

		LinkedView, rTag, delimOpenChar0, delimOpenChar1, delimCloseChar0, delimCloseChar1,
		$ = global.jQuery,

		// jsviews object (=== $.views) Note: JsViews requires jQuery is loaded)
		jsv = $.views,
		extend = $.extend,
		sub = jsv.sub,
		FALSE = false, TRUE = true, NULL = null,
		topView = new jsv.View(jsv.helpers),
		templates = jsv.templates,
		observable = $.observable,
		jsvData = "_jsvData",
		linkStr = "link",
		viewStr = "view",
		propertyChangeStr = "propertyChange",
		arrayChangeStr = "arrayChange",
		elementChangeStr = "change.jsv",
		fnSetters = {
			value: "val",
			input: "val",
			html: "html",
			text: "text"
		},
		valueBinding = { from: { fromAttr: "value" }, to: { toAttr: "value"} },
		oldCleanData = $.cleanData,
		oldJsvDelimiters = jsv.delimiters,

		rStartTag = /^jsvi|^jsv:/,
		rFirstElem = /^\s*<(\w+)[>\s]/;

	if (!$) {
		// jQuery is not loaded.
		throw "requires jQuery"; // for Beta (at least) we require jQuery
	}

	if (!(jsv)) {
		throw "requires JsRender";
	}

	//========================== Top-level functions ==========================

	//===============
	// event handlers
	//===============

	function elemChangeHandler(ev) {
		var setter, cancel, fromAttr, to, linkContext, sourceValue, cnvtBack, target,
			source = ev.target,
			$source = $(source),
			view = $.view(source),
			context = view.ctx,
			beforeChange = context.beforeChange;

		if (source.getAttribute(jsv.linkAttr) && (to = jsViewsData(source, "to"))) {
			fromAttr = defaultAttr(source);
			setter = fnSetters[fromAttr];
			sourceValue = $.isFunction(fromAttr) ? fromAttr(source) : setter ? $source[setter]() : $source.attr(fromAttr);

			if ((!beforeChange || !(cancel = beforeChange.call(view, ev) === FALSE)) && sourceValue !== undefined) {
				cnvtBack = jsv.converters[to[2]];
				target = to[0];
				to = to[1];
				linkContext = {
					src: source,
					tgt: target,
					cnvtBack: cnvtBack,
					path: to
				};
				if (cnvtBack) {
					sourceValue = cnvtBack.call(linkContext, sourceValue);
				}
				if (sourceValue !== undefined && target) {
					observable(target).setProperty(to, sourceValue);
					if (context.afterChange) {  //TODO only call this if the target property changed
						context.afterChange.call(linkContext, ev);
					}
				}
				ev.stopPropagation(); // Stop bubbling
			}
			if (cancel) {
				ev.stopImmediatePropagation();
			}
		}
	}

	function propertyChangeHandler(ev, eventArgs, bind) {
		var setter, changed, sourceValue, css, prev,
			link = this,
			source = link.src,
			target = link.tgt,
			$target = $(target),
			attr = link.attr || defaultAttr(target, TRUE), // attr for binding data value to the element
			view = link.view,
			context = view.ctx,
			beforeChange = context.beforeChange;

		// TODO for <input data-link="a.b" />
		//Currently the following scenarios do work:
		//$.observable(model).setProperty("a.b", "bar");
		//$.observable(model.a).setProperty("b", "bar");
		// TODO Add support for $.observable(model).setProperty("a", { b: "bar" });
		//	var testsourceValue = ev.expr( source, view, jsv, ev.bind );

		//	TODO call beforeChange on data-link initialization.
		//			if ( changed && context.afterChange ) {
		//				context.afterChange.call( link, ev, eventArgs );
		//			}

		if ((!beforeChange || !(eventArgs && beforeChange.call(this, ev, eventArgs) === FALSE))
		// If data changed, the ev.data is set to be the path. Use that to filter the handler action...
		&& !(eventArgs && ev.data !== eventArgs.path))
		// && (!view || view._onDataChanged( eventArgs ) !== FALSE ) // Not currently supported or needed for property change
		{
			sourceValue = link.fn(source, link.view, jsv, bind || returnVal);
			if ($.isFunction(sourceValue)) {
				sourceValue = sourceValue.call(source);
			}
			if (attr === "visible") {
				attr = "css-display";
				sourceValue = sourceValue ? "block" : "none";
			}
			if (css = attr.lastIndexOf("css-", 0) === 0 && attr.substr(4)) {
				if (changed = $target.css(css) !== sourceValue) {
					$target.css(css, sourceValue);
				}
			} else {
				if (attr === "value") {
					if (target.type === "radio") {
						if (target.value === sourceValue) {
							sourceValue = TRUE;
							attr = "checked";
						} else {
							return;
						}
					}
				}
				setter = fnSetters[attr];

				if (setter) {
					if (changed = $target[setter]() !== sourceValue) {
						if (attr === "html") {
							$target[setter](sourceValue);
							if (eventArgs) {
								view.link(source, target, undefined, NULL);
								// This is a data-link=html{...} update, so need to link new content
							}
						} else {
							$target[setter](sourceValue);
						}
						if (target.nodeName.toLowerCase() === "input") {
							$target.blur(); // Issue with IE. This ensures HTML rendering is updated.
						}
					}
				} else if (changed = $target.attr(attr) != sourceValue) {
					// Setting an attribute to the empty string should remove the attribute
					sourceValue = sourceValue === "" ? null : sourceValue; 
					$target.attr(attr, sourceValue);
				}
			}

			if (eventArgs && changed && context.afterChange) {
				context.afterChange.call(link, ev, eventArgs);
			}
		}
	}

	function arrayChangeHandler(ev, eventArgs) {
		var context = this.ctx,
			beforeChange = context.beforeChange;

		if (!beforeChange || beforeChange.call(this, ev, eventArgs) !== FALSE) {
			this._onDataChanged(eventArgs);
			if (context.afterChange) {
				context.afterChange.call(this, ev, eventArgs);
			}
		}
	}

	function setArrayChangeLink(view) {
		if (!view._useKey) {
			var handler,
				data = view.data,
				onArrayChange = view._onArrayChange;

			if (onArrayChange) {
				// First remove the current handler if there is one
				$([onArrayChange[1]]).off(arrayChangeStr, onArrayChange[0]);
				view.onArrayChange = undefined;
			}

			if (data) {
				// If this view is not being removed, but the data array has been replaced, then bind to the new data array
				handler = function() {
					arrayChangeHandler.apply(view, arguments);
				};
				$([data]).on(arrayChangeStr, handler);
				view._onArrayChange = [handler, data];
			}
		}
	}

	function defaultAttr(elem, to) {
		// to: true - default attribute for setting data value on HTML element; false: default attribute for getting value from HTML element
		// Merge in the default attribute bindings for this target element
		var attr = jsv.merge[elem.nodeName.toLowerCase()];
		return attr
		? (to
			? attr.to.toAttr
			: attr.from.fromAttr)
		: to
			? "text" // Default is to bind to innerText. Use html{:...} to bind to innerHTML
			: ""; // Default is not to bind from
	}

	function returnVal(value) {
		return value;
	}

	function unlink(container) {
		container = $(container); // container was an element or selector
		container.off(elementChangeStr);
		clean(container[0]);
	}

	function link(data, container, context, prevNode, nextNode, index, parentView) {
		// Bind elementChange on the root element, for links from elements within the content, to data;
		function dataToElem() {
			elemChangeHandler.apply({
				tgt: data
			}, arguments);
		}
		container = $(container); // container was an element or selector

		var html, target,
			self = this,
			containerEl = container[0],
			onRender = addLinkAnnotations,
			tmpl = self.markup && self || self.jquery && $.templates(self[0]);
			// if this is a tmpl, or a jQuery object containing an element with template content, get the compiled template


		if (containerEl) {
			parentView = parentView || $.view(containerEl);

			unlink(containerEl);
			container.on(elementChangeStr, dataToElem);

			if (context) {
				if (parentView.link === FALSE) {
					context.link = FALSE; // If link=false, don't allow nested context to switch on linking
				}
				// Set link=false, explicitly, to disable linking within a template nested within a linked template
				onRender = context.link !== FALSE && onRender;
				if (target = context.target === "replace") {
					context.target = undefined; // Don't pass on as inherited context
				}
			}

			if (tmpl) {
				// Remove previous jsvData on the container elem - e.g. the previous views

				html = tmpl.render(data, context, undefined, undefined, parentView, onRender);

				if (target === "replace") {
					prevNode = containerEl.previousSibling;
					nextNode = containerEl.nextSibling;
					containerEl = containerEl.parentNode;
					container.replaceWith(html);
				} else {
					// TODO/BUG Currently this will re-render if called a second time, and will leave stale views under the parentView.views.
					// So TODO: make it smart about when to render and when to link on already rendered content
					prevNode = nextNode = undefined; // When linking from a template, prevNode and nextNode parameters are ignored
					container.empty().append(html); // Supply non-jQuery version of this...
					// Using append, rather than html, as workaround for issues in IE compat mode. (Using innerHTML leads to initial comments being stripped)
				}
			}
			parentView.link(data, containerEl, context, prevNode, nextNode, index);
		}
		return container; // Allow chaining, to attach event handlers, etc.
	}

	function bindDataLinkAttributes(node, currentView, data) {
		var links, attr, linkIndex, convertBack, cbLength, expression, viewData, prev,
			linkMarkup = node.getAttribute(jsv.linkAttr);

		if (linkMarkup) {
			linkIndex = currentView._lnk++;
			// Compiled linkFn expressions are stored in the tmpl.links array of the template
			links = currentView.links || currentView.tmpl.links;
			if (!(link = links[linkIndex])) {
				link = links[linkIndex] = {};
				if (linkMarkup.charAt(linkMarkup.length - 1) !== "}") {
					// Simplified syntax is used: data-link="expression"
					// Convert to data-link="{:expression}", or for inputs, data-link="{:expression:}" for (default) two-way binding
					linkMarkup = delimOpenChar1 + ":" + linkMarkup + (defaultAttr(node) ? ":" : "") + delimCloseChar0;
				}
				while (tokens = rTag.exec(linkMarkup)) { // TODO require } to be followed by whitespace or $, and remove the \}(!\}) option.
					// Iterate over the data-link expressions, for different target attrs, e.g. <input data-link="{:firstName:} title{>~description(firstName, lastName)}"
					// tokens: [all, attr, tag, converter, colon, html, code, linkedParams]
					attr = tokens[1];
					expression = tokens[2];
					if (tokens[5]) {
						// Only for {:} link"
						if (!attr && (convertBack = /^.*:([\w$]*)$/.exec(tokens[8]))) {
							// two-way binding
							convertBack = convertBack[1];
							if (cbLength = convertBack.length) {
								// There is a convertBack function
								expression = tokens[2].slice(0, -cbLength - 1) + delimCloseChar0; // Remove the convertBack string from expression.
							}
						}
						if (convertBack === NULL) {
							convertBack = undefined;
						}
					}
					// Compile the linkFn expression which evaluates and binds a data-link expression
					// TODO - optimize for the case of simple data path with no conversion, helpers, etc.:
					//     i.e. data-link="a.b.c". Avoid creating new instances of Function every time. Can use a default function for all of these...
					link[attr] = jsv._tmplFn(delimOpenChar0 + expression + delimCloseChar1, undefined, TRUE);
					if (!attr && convertBack !== undefined) {
						link[attr].to = convertBack;
					}
				}
			}
			viewData = currentView.data;
			currentView.data = viewData || data;
			for (attr in link) {
				bindDataLinkTarget(
					currentView.data || data, //source
					node,                     //target
					attr,                     //attr
					link[attr],               //compiled link markup expression
					currentView               //view
				);
			}
//			currentView.data = viewData;
		}
	}

	function bindDataLinkTarget(source, target, attr, linkFn, view) {
		//Add data link bindings for a link expression in data-link attribute markup
		var boundParams = [],
			storedLinks = jsViewsData(target, linkStr, TRUE),
			handler = function() {
				propertyChangeHandler.apply({ tgt: target, src: source, attr: attr, fn: linkFn, view: view }, arguments);
			};

		// Store for unbinding
		storedLinks[attr] = { srcs: boundParams, hlr: handler };

		// Call the handler for initialization and parameter binding
		handler(undefined, undefined, function(object, leafToken) {
			// Binding callback called on each dependent object (parameter) that the link expression depends on.
			// For each path add a propertyChange binding to the leaf object, to trigger the compiled link expression,
			// and upate the target attribute on the target element
			boundParams.push(object);
			if (linkFn.to !== undefined) {
				// If this link is a two-way binding, add the linkTo info to JsViews stored data
				$.data(target, jsvData).to = [object, leafToken, linkFn.to];
				// For two-way binding, there should be only one path. If not, will bind to the last one.
			}
			if ($.isArray(object)) {
				$([object]).on(arrayChangeStr, function() {
					handler();
				});
			} else {
				$(object).on(propertyChangeStr, NULL, leafToken, handler);
			}
			return object;
		});
		// Note that until observable deals with managing listeners on object graphs, we can't support changing objects higher up the chain, so there is no reason
		// to attach listeners to them. Even $.observable( person ).setProperty( "address.city", ... ); is in fact triggering propertyChange on the leaf object (address)
	}

	//===============
	// helpers
	//===============

	function jsViewsData(el, type, create) {
		var jqData = $.data(el, jsvData) || (create && $.data(el, jsvData, { view: [], link: {} }));
		return jqData ? jqData[type] : {};
	}

	function inputAttrib(elem) {
		return elem.type === "checkbox" ? elem.checked : $(elem).val();
	}

	function getTemplate(tmpl) {
		// Get nested templates from path
		if ("" + tmpl === tmpl) {
			var tokens = tmpl.split("[");
			tmpl = templates[tokens.shift()];
			while (tmpl && tokens.length) {
				tmpl = tmpl.tmpls[tokens.shift().slice(0, -1)];
			}
		}
		return tmpl;
	}

	function clean(elem) {
		// Remove data-link bindings, or contained views

		// Note that if we remove an element from the DOM which is a top-level node of a view, this code
		// will NOT remove it from the view.nodes collection. Consider whether we want to support that scenario...

		var l, link, attr, parentView, view, srcs, collData, linksAndViews,
			jQueryDataOnElement = $.cache[elem[$.expando]];

		// Get jQueryDataOnElement = $.data(elem, jsvData)
		// (Using a faster but more verbose way of accessing the data - for perf optimization, especially on elements not linked by JsViews)
		jQueryDataOnElement = jQueryDataOnElement && jQueryDataOnElement.data;
		linksAndViews = jQueryDataOnElement && jQueryDataOnElement[jsvData];

		if (linksAndViews) {
			// Get links (propertyChange bindings) on this element and unbind
			collData = linksAndViews.link;
			for (attr in collData) {
				link = collData[attr];
				srcs = link.srcs;
				l = srcs.length;
				while (l--) {
					$(srcs[l]).off(propertyChangeStr, link.hlr);
				}
			}

			// Get views for which this element is the parentElement, and remove from parent view
			collData = linksAndViews.view;
			if (l = collData.length) {
				parentView = $.view(elem);
				while (l--) {
					view = collData[l];
					if (view.parent === parentView) {
						parentView.removeViews(view.key);
					}
				}
			}
		}
	}

	//========================== Initialize ==========================

	//=======================
	// JsRender integration
	//=======================

	sub.onStoreItem = function(store, name, item, process) {
		if (item && store === templates) {
			item.link = function() {
				return $.link.apply(item, arguments);
			};
			if (name) {
				$.link[name] = item.link;
			}
		}
	};

	function addLinkAnnotations(value, tmpl, props, key, path) {
		var elemAnnotation,
			tag = tmpl.tag,
			linkInfo = "i",
			closeToken = "/i";

		if (!tag) {
			tag = rFirstElem.exec(tmpl.markup);
			tag = tmpl.tag = (tag || (tag = rFirstElem.exec(value))) && tag[1];
		}

		if (key) {
			linkInfo = ":" + key;
			closeToken = "/t";
		}
		if (/^(option|optgroup|li|tr|td)$/.test(tag)) {
			elemAnnotation = "<" + tag + ' jsvtmpl="';
			return elemAnnotation + linkInfo + '"/>' + $.trim(value) + elemAnnotation + closeToken + '"/>';
		}
		return "<!--jsv" + linkInfo + "-->" + value + "<!--jsv" + closeToken + "-->";
	};

	function renderAndLink(view, index, views, data, html, context, addingViewToParent) {
		var prevView, prevNode, linkToNode, linkFromNode,
			elLinked = !view._prevNode;
			parentNode = view.parentElem;

		if (index && ("" + index !== index)) {
			if (!views[index]) {
				return; // If subview for provided index does not exist, do nothing
			}
			prevView = views[index - 1];
			prevNode = elLinked ? prevView._after : addingViewToParent ? prevView._nextNode : view._prevNode;
		} else {
			prevNode = elLinked ? view._preceding : view._prevNode;
		}

		if (prevNode) {
			linkToNode = prevNode.nextSibling;
			$(prevNode).after(html);
			prevNode = prevNode.nextSibling;
		} else {
			linkToNode = parentNode.firstChild;
			$(parentNode).prepend(html);
			prevNode = parentNode.firstChild;
		}
		linkFromNode = prevNode && prevNode.previousSibling;

		// Remove the extra tmpl annotation nodes which wrap the inserted items
		parentNode.removeChild(prevNode);
		parentNode.removeChild(linkToNode ? linkToNode.previousSibling : parentNode.lastChild);

		// Link the new HTML nodes to the data
		view.link(data, parentNode, context, linkFromNode, linkToNode, index);
	}

	//====================================
	// Additional members for linked views
	//====================================

	LinkedView = {
		_onDataChanged: function(eventArgs) {
			if (eventArgs) {
				// This is an observable action (not a trigger/handler call from pushValues, or similar, for which eventArgs will be null)
				var self = this,
					action = eventArgs.change,
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
						// Othercases: (e.g.undefined, for setProperty on observable object) etc. do nothing
				}
			}
			return TRUE;
		},

		refresh: function(context) {
			var self = this,
				parent = self.parent,
				index = !parent._useKey && self.index,
				tmpl = self.tmpl = getTemplate(self.tmpl);

			if (parent) {
				// Remove HTML nodes
				$(self.nodes).remove(); // Also triggers cleanData which removes child views.
				// Remove child views
				self.removeViews();
				self.nodes = [];

				renderAndLink(self, index, parent.views, self.data, tmpl.render(self.data, context, undefined, TRUE, self), context);
				setArrayChangeLink(self);
			}
			return self;
		},

		addViews: function(index, dataItems, tmpl) {
			// if view is not an Array View, do nothing
			var viewsCount,
				self = this,
				views = self.views;

			if ( !self._useKey && dataItems.length && (tmpl = getTemplate(tmpl || self.tmpl))) {
				// Use passed-in template if provided, since self added view may use a different template than the original one used to render the array.
				viewsCount = views.length + dataItems.length;
				renderAndLink(self, index, views, dataItems, tmpl.render(dataItems, self.ctx, undefined, index, self), self.ctx, TRUE);
				while (++index < viewsCount) {
					observable(views[index]).setProperty("index", index);
					// TODO - this is fixing up index, but not key, and not index on child views. Consider changing index to be a getter index(),
					// so we only have to change it on the immediate child view of the Array view, but also so that it notifies all subscriber to #index().
					// Also have a #context() which can be parameterized to give #parents[#parents.length-1].data or #roots[0]
					// to get root data, or other similar context getters. Only create an the index on the child view of Arrays, (whether in JsRender or JsViews)
					// [Otherwise, here, would need to iterate on views[] to set index on children, right down to ArrayViews, which might be too expensive on perf].
				}
			}
			return self;
		},

		removeViews: function(index, itemsCount) {
			// view.removeViews() removes all the child views
			// view.removeViews( index ) removes the child view with specified index or key
			// view.removeViews( index, count ) removes the specified nummber of child views, starting with the specified index
			function removeView(index, parElVws) {
				var i,
					viewToRemove = views[index],
					node = viewToRemove._prevNode,
					nextNode = viewToRemove._nextNode,
					nodesToRemove = node
						? [node]
						// viewToRemove._prevNode is null: this is a view using element annotations, so we will remove the top-level nodes
						: viewToRemove.nodes;

				if (nodesToRemove) {
					// If nodesToRemove is not undefined, so this a linked view. We remove HTML nodes and hanlder for arrayChange data binding

					// If parElVws is passed in, this is an 'Array View', so all child views have same parent element
					// Otherwise, the views are by key, and there may be intervening parent elements, to get parentElViews for each child view that is being removed
					parElVws = parElVws || jsViewsData(viewToRemove.parentElem, viewStr);

					i = parElVws.length;

					if (i) {
						// remove child views of the view being removed
						viewToRemove.removeViews();
					}

					// Remove this view from the parentElViews collection
					while (i--) {
						if (parElVws[i] === viewToRemove) {
							parElVws.splice(i, 1);
							break;
						}
					}
					// Remove the HTML nodes from the DOM, unless they have already been removed
					while (node && node.parentNode && node !== nextNode) {
						node = node.nextSibling;
						nodesToRemove.push(node);
					}
					if (viewToRemove._after) {
						nodesToRemove.push(viewToRemove._after);
					}
					$(nodesToRemove).remove();
					viewToRemove.data = undefined;
					setArrayChangeLink(viewToRemove);
				}
			}

			var current, viewsCount, parentElViews,
				self = this,
				isArray = !self._useKey,
				views = self.views;

			if (isArray) {
				viewsCount = views.length;
				parentElViews = jsViewsData(self.parentElem, viewStr);
			}
			if (index === undefined) {
				// Remove all child views
				if (isArray) {
					// views and data are arrays
					current = viewsCount;
					while (current--) {
						removeView(current, parentElViews);
					}
					self.views = [];
				} else {
					// views and data are objects
					for (index in views) {
						// Remove by key
						removeView(index);
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
						removeView(current, parentElViews);
					}
					views.splice(index, itemsCount);
					if (viewsCount = views.length) {
						// Fixup index on following view items...
						while (index < viewsCount) {
							observable(views[index]).setProperty("index", index++);
						}
					}
				}
			}
			return this;
		},

		content: function(select) {
			return select ? $(select, this.nodes) : $(this.nodes);
		},

		//===============
		// data-linking
		//===============

		link: function(data, parentNode, context, prevNode, nextNode, index) {
			var self = this,
				views = self.views;

			index = index || 0;

			parentNode = ("" + parentNode === parentNode ? $(parentNode)[0] : parentNode);

			function linkSiblings(parentElem, prev, next, top) {
				var view, isElem, type, key, parentElViews, nextSibling, onAfterCreate, open;

				// If we are linking the parentElem itself (not just content from first onwards) then bind also the data-link attributes
				if (prev === undefined) {
					bindDataLinkAttributes(parentElem, self, data);
				}

				node = (prev && prev.nextSibling) || parentElem.firstChild;
				while (node && node !== next) {
					type = node.nodeType;
					isElem = type === 1;
					nextSibling = node.nextSibling;
					if (isElem && (linkInfo = node.getAttribute("jsvtmpl")) || type === 8 && (linkInfo = node.nodeValue.split("jsv")[1])) {
						open = linkInfo.charAt(0) !== "/" && linkInfo;
						if (isElem) {
							isElem = node.tagName;
							parentElem.removeChild(node);
							node = NULL;
						}
						if (open) {
							// open view
							open = open.slice(1);
							// If this is a template open, use the key. It it is an item open, use the index, and increment
							key = open || index++;
							parentElViews = parentElViews || jsViewsData(parentElem, viewStr, TRUE);

							// Extend and initialize the view object created in JsRender, as a JsViews view
							view = self.views[key];
							if (!view.link) {
								extend(view, LinkedView);

								view.parentElem = parentElem;
								view._prevNode = node;

								parentElViews && parentElViews.push(view);

								var i, views, viewsCount, parent;
								if (parent = view.parent) {
									if (view._useKey) {
										view.nodes = [];
										view._lnk = 0; // compiled link index.
									}
									setArrayChangeLink(view);
								}
								if (view.tmpl.presenter) {
									view.presenter = new view.tmpl.presenter(view.ctx, view);
								}
							}
							if (isElem && open) {
								// open tmpl
								view._preceding = nextSibling.previousSibling;
								parentElViews.elLinked = isElem;
							}
							nextSibling = view.link(undefined, parentElem, undefined, nextSibling.previousSibling);  // TODO DATA AND CONTEXT??
						} else {
							// close view
							self._nextNode = node;
							if (isElem && linkInfo === "/i") {
								// This is the case where there is no white space between items.
								// Add a text node to act as marker around template insertion point.
								// (Needed as placeholder when inserting new items following this one).
								parentNode.insertBefore(self._after = document.createTextNode(""), nextSibling);
							}
							if (isElem && linkInfo === "/t" && nextSibling && nextSibling.tagName && nextSibling.getAttribute("jsvtmpl")) {
								// This is the case where there is no white space between items.
								// Add a text node to act as marker around template insertion point.
								// (Needed as placeholder when the data array is empty).
								parentNode.insertBefore(document.createTextNode(""), nextSibling);
							}
							if (onAfterCreate = self.ctx.onAfterCreate) { // TODO DATA AND CONTEXT??
								onAfterCreate.call(self, self);
							}
							return nextSibling;
						}
					} else {
						if (top && self.parent && self.nodes) {
							// Add top-level nodes to view.nodes
							self.nodes.push(node);
						}
						if (isElem) {
							linkSiblings(node);
						}
					}
					node = nextSibling;
				}
			}
			return linkSiblings(parentNode, prevNode, nextNode, TRUE);
		}
	};

	//=======================
	// Extend $.views namespace
	//=======================

	extend(jsv, {
		linkAttr: "data-link",
		merge: {
			input: {
				from: { fromAttr: inputAttrib }, to: { toAttr: "value" }
			},
			textarea: valueBinding,
			select: valueBinding,
			optgroup: {
				from: { fromAttr: "label" }, to: { toAttr: "label" }
			}
		},
		delimiters: function(openChars, closeChars) {
			var delimChars = oldJsvDelimiters.apply(oldJsvDelimiters, arguments);
			delimOpenChar0 = delimChars[0];
			delimOpenChar1 = delimChars[1];
			delimCloseChar0 = delimChars[2];
			delimCloseChar1 = delimChars[3];
			rTag = new RegExp("(?:^|\\s*)([\\w-]*)(" + delimOpenChar1 + jsv.rTag + ")" + delimCloseChar0 + ")", "g");
			return this;
		}
	});

	//=======================
	// Extend jQuery namespace
	//=======================

	extend($, {

		//=======================
		// jQuery $.view() plugin
		//=======================

		view: function(node, inner) {
			// $.view() returns top node
			// $.view( node ) returns view that contains node
			// $.view( selector ) returns view that contains first selected element
			node = node && $(node)[0];

			var returnView, view, parentElViews, i, j, finish, elementLinked,
				topNode = global.document.body,
				startNode = node;

			if (inner) {
				// Treat supplied node as a container element, step through content, and return the first view encountered.
				finish = node.nextSibling || node.parentNode;
				while (finish !== (node = node.firstChild || node.nextSibling || node.parentNode.nextSibling)) {
					if (node.nodeType === 8 && rStartTag.test(node.nodeValue)) {
						view = $.view(node);
						if (view._prevNode === node) {
							return view;
						}
					}
				}
				return;
			}

			node = node || topNode;
			if ($.isEmptyObject(topView.views)) {
				return topView; // Perf optimization for common case
			} else {
				// Step up through parents to find an element which is a views container, or if none found, create the top-level view for the page
				while (!(parentElViews = jsViewsData(finish = node.parentNode || topNode, viewStr)).length) {
					if (!finish || node === topNode) {
						jsViewsData(topNode.parentNode, viewStr, TRUE).push(returnView = topView);
						break;
					}
					node = finish;
				}
				if (node === topNode) {
					return topView; //parentElViews[0];
				}
				if (parentElViews.elLinked) {
					i = parentElViews.length;
					while (i--) {
						view = parentElViews[i];
						j = view.nodes && view.nodes.length;
						while (j--) {
							if (view.nodes[j] === node) {
								return view;
							}
						}
					}
				} else while (node) {
					// Step back through the nodes, until we find an item or tmpl open tag - in which case that is the view we want
					if (node === finish) {
						return view;
					}
					if (node.nodeType === 8) {
						if (/^jsv\/[it]$/.test(node.nodeValue)) {
							// A tmpl or item close tag: <!--/tmpl--> or <!--/item-->
							i = parentElViews.length;
							while (i--) {
								view = parentElViews[i];
								if (view._nextNode === node) {
									// If this was the node originally passed in, this is the view we want.
									if (node === startNode) {
										return view;
									}
									// If not, jump to the beginning of this item/tmpl and continue from there
									node = view._prevNode;
									break;
								}
							}
						} else if (rStartTag.test(node.nodeValue)) {
							// A tmpl or item open tag: <!--tmpl--> or <!--item-->
							i = parentElViews.length;
							while (i--) {
								view = parentElViews[i];
								if (view._prevNode === node) {
									return view;
								}
							}
						}
					}
					node = node.previousSibling;
				}
				// If not within any of the views in the current parentElViews collection, move up through parent nodes to find next parentElViews collection
				returnView = returnView || $.view(finish);
			}
			return returnView;
		},

		link: link,
		unlink: unlink,

		//=======================
		// override $.cleanData
		//=======================
		cleanData: function(elems) {
			var i = elems.length;

			while (i--) {
				clean(elems[i]);
			}
			oldCleanData.call($, elems);
		}
	});

	$.fn.link = link;

	$.fn.view = function(node){
		return $.view(this[0]);
	}
	// Initialize default delimiters
	jsv.delimiters();

	extend(topView, { tmpl: {}, _lnk: 0, links: [] });
	extend(topView, LinkedView);

})(this);
