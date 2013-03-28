/*! jsObservable: http://github.com/BorisMoore/jsviews */
/*
 * Subcomponent of JsViews
 * Data change events for data-linking
 *
 * Copyright 2013, Boris Moore and Brad Olenick
 * Released under the MIT License.
 */
// informal pre beta commit counter: 34 (Beta Candidate)

// TODO, Array change on leaf. Caching compiled templates.
// TODO later support paths with arrays ~x.y[2].foo, paths with functions on non-leaf tokens: address().street

(function(global, $, undefined) {
	// global is the this object, which is window when running in the usual browser environment.
	// $ is the global var jQuery or jsviews
	"use strict";

	if (!$) {
		throw "requires jQuery or JsRender";
	}
	if ($.observable) { return; } // JsObservable is already loaded

	//========================== Top-level vars ==========================

	var versionNumber = "v1.0pre",

		cbBindings, cbBindingsId, oldLength, _data,
		$eventSpecial = $.event.special,
		$viewsSub = $.views ? $.views.sub: {},
		cbBindingKey = 1,
		splice = [].splice,
		concat = [].concat,
		$isArray = $.isArray,
		$expando = $.expando,
		OBJECT = "object",
		propertyChangeStr = $viewsSub.propChng = $viewsSub.propChng || "propertyChange",// These two settings can be overridden on settings after loading
		arrayChangeStr = $viewsSub.arrChng = $viewsSub.arrChng || "arrayChange",        // jsRender, and prior to loading jquery.observable.js and/or JsViews
		cbBindingsStore = $viewsSub._cbBnds = $viewsSub._cbBnds || {},
		observeStr = propertyChangeStr + ".observe",
		$isFunction = $.isFunction,
		observeObjKey = 1,
		observeCbKey = 1,
		$hasData = $.hasData,
		getPropNames = Object.getOwnPropertyNames,
		test = {};

	$hasData(test);

	if (getPropNames && getPropNames(test).length) {
		// If we are not in IE8, and $hasData() has side effects (issue with jquery-2.0.0b2.js - which does not support IE8 anyway), we use a side-effect-free replacement:
		$hasData = function (object) {
			var keys = getPropNames(object),
				l = keys.length;

			while (l--) {
				if (keys[l].indexOf($expando) + 1) {
					return true
				}
			}
			return false;
		}
	}

	//========================== Top-level functions ==========================

	function $observable(data) {
		return $isArray(data)
			? new ArrayObservable(data)
			: new ObjectObservable(data);
	}

	function ObjectObservable(data) {
		this._data = data;
		return this;
	}

	function ArrayObservable(data) {
		this._data = data;
		return this;
	}

	function wrapArray(data) {
		return $isArray(data)
			? [data]
			: data;
	}

	function getObjectOnPath(object, path, offset) {
		// Returns leaf property unless offset > 0, in which case returns [objectAtOffsetFromLeaf, remainingPath]
		if (object && path) {
			var parts = path.split(".");
			while (object && parts.length > offset) {
				object = object[parts.shift()];
			}
			return offset ? [object, parts.join(".")] : object;
		}
		return offset ? [object, ""] : object;
	}

	function validateIndex(index) {
		if (typeof index !== "number") {
			throw "Invalid index.";
		}
	}

	function resolvePathObjects(paths, root) {
		paths = $isArray(paths) ? paths : [paths];

		var i, path,
			object = root,
			nextObj = object,
			l = paths.length,
			out = [];

		for (i = 0; i < l; i++) {
			path = paths[i];
			if ($isFunction(path)) {
// TODO add support for _parameterized_ calls to depends() on computed observables. Consider getting args by a
// compiled version of linkFn that just returns the current args. args = linkFnArgs.call(linkCtx, target, view, $views);
				splice.apply(out, [out.length,1].concat(resolvePathObjects(path.call(root, root), root)));
				continue;
			} else if ("" + path !== path) {
				root = nextObj = path;
				if (nextObj !== object) {
					out.push(object = nextObj);
				}
				continue;
			}
			if (nextObj !== object) {
				out.push(object = nextObj);
			}
			out.push(path);
		}
		return out;
	}

	function removeCbBindings(cbBindings, cbBindingsId) {
		// If the cbBindings collection is empty we will remove it from the cbBindingsStore
		var cb, found;

		for(cb in cbBindings) {
			found = true;
			break;
		}
		if (!found) {
			delete cbBindingsStore[cbBindingsId];
		}
	}

	function onObservableChange(ev, eventArgs) {
		if (!(ev.data && ev.data.off)) {
			// Skip if !!ev.data.off: - a handler that has already been removed (maybe was on handler collection at call time - then removed by another handler)
			var value = eventArgs.oldValue,
				ctx = ev.data;
			if (ev.type === arrayChangeStr) {
				ctx.cb.array(ev, eventArgs);
			} else if (ctx.prop === "*" || ctx.prop === eventArgs.path) {
				if (typeof value === OBJECT) {
					$unobserve(wrapArray(value), ctx.path, ctx.cb);
				}
				if (typeof (value = eventArgs.value) === OBJECT) {
					$observe(wrapArray(value), ctx.path, ctx.cb, wrapArray(ctx.root)); // If value is an array, observe wrapped array, so that observe() doesn't flatten out this argument
				}
				ctx.cb.call(ctx.root, ev, eventArgs);
			}
		}
	}

	function $observe() {
		// $.observable.observe(root, [1 or more objects, path or path Array params...], callback[, resolveDependenciesCallback][, unobserveOrOrigRoot)
		function observeOnOff(namespace, pathStr, isArrayBinding) {
			var obIdExpando = $hasData(object),
				boundObOrArr = wrapArray(object);
			cbBindings = 0;
			if (unobserve) {
				if (obIdExpando) {
					$(boundObOrArr).off(namespace, onObservableChange);
					// We remove this object from that cb._bnd collection (see above).

					// jQuery off event does not provide the event data, with the callback and we need to remove this object from the cb._bnd collection.
					// So we have registered a jQuery special 'remove' event, which stored the cb._bnd in the cbBindings var,
					// so we can immediately remove this object from that cb._bnd collection.
					if (cbBindings) {
						delete cbBindings[$.data(object, "obId")];
					}
				}
			} else {
				if (events = obIdExpando && $._data(object)) {
					events = events && events.events;
					events = events && events[isArrayBinding ? arrayChangeStr : propertyChangeStr];
					el = events && events.length;

					while (el--) {
						if ((data = events[el].data) && data.cb === callback) {
							if (isArrayBinding) {
								// Duplicate exists, so skip. (This can happen e.g. with {^{for people ~foo=people}})
								return;
							} else if (pathStr === "*" && data.prop !== pathStr) {
								$(object).off(namespace + "." + data.prop, onObservableChange);
									// We remove this object from that cb._bnd collection (see above).
								if (cbBindings) {
									delete cbBindings[$.data(object, "obId")];
								}
							}
						}
					}
				}
				$(boundObOrArr).on(namespace, null, isArrayBinding ? { cb: callback } : { path: pathStr, prop: prop, cb: callback }, onObservableChange);
				if (bindings) {
					// Add object to bindings, and add the counter to the jQuery data on the object
					bindings[$.data(object, "obId") || $.data(object, "obId", observeObjKey++)] = object;
				}
			}
		}

		function bindArray() {
			if (callback && callback.array && $isArray(object)) {
				// This is a data-bound tag which has an onArrayChange handler, e.g. {^{for}}, and the leaf object is an array
				// - so we add the arrayChange binding
				observeOnOff(arrayChangeStr + ".observe.obs" + callback._bnd, undefined, true);
			}
		}

		var i, parts, prop, path, dep, object, unobserve, callback, cbId, el, data, events, filter, items, bindings, depth,
			topLevel = 1,
			ns = observeStr,
			paths = concat.apply([], arguments),	// flatten the arguments
			lastArg = paths.pop(),
			origRoot = paths[0],
			root = "" + origRoot !== origRoot ? paths.shift() : undefined,	// First parameter is the root object, unless a string
			l = paths.length;

		origRoot = root;

		if ($isFunction(lastArg)) {
			callback = lastArg;
		} else {
			if (lastArg === true) {
				unobserve = lastArg;
			} else if (lastArg) {
				origRoot = lastArg;
				topLevel = 0;
			}
			lastArg = paths[l-1];
			if (l && lastArg === undefined || $isFunction(lastArg)) {
				callback = paths.pop(); // If preceding is callback this will be filter param - which may be undefined
				l--;
			}
		}
		if ($isFunction(paths[l-1])) {
			filter = callback;
			callback = paths.pop();
			l--;
		}

		// Use a unique namespace (e.g. obs7) associated with each observe() callback to allow unobserve to
		// remove onObservableChange handlers that wrap that callback
		ns += unobserve
			? (callback ? ".obs" + callback._bnd: "")
			: ".obs" + (cbId = callback._bnd = callback._bnd || observeCbKey++);

		if (unobserve && l === 0 && root) {
			// unobserve(object) TODO: What if there is a callback specified?
			$(root).off(observeStr, onObservableChange);
		}
		if (!unobserve) {
			bindings = cbBindingsStore[cbId] = cbBindingsStore[cbId] || {};
		}
		depth = 0;
		for (i = 0; i < l; i++) {
			path = paths[i];
			bindArray();
			object = root;
			if ("" + path === path) {
				//path = path || "*"; // This ensures that foo(person) will depend on any changes in foo
				// - equivalent to foo(person.*) - were it legal, or to adding foo.depends = []
				parts = path.split("^");
				if (parts[1]) {
					// We bind the leaf, plus additional nodes based on depth.
					// "a.b.c^d.e" is depth 2, so listens to changes of e, plus changes of d and of c
					depth = parts[0].split(".").length;
					path = parts.join(".");
					depth = path.split(".").length - depth;
						// if more than one ^ in the path, the first one determines depth
				}
				if (filter && (items = filter(path, root))) {
					// If filter returns an array of objects and paths, we will insert them
					// into the sequence, replacing the current item (path)
					l += items.length - 1;
					splice.apply(paths, [i--, 1].concat(items));
					continue;
				}
				parts = path.split(".");
			} else {
				if (topLevel && !$isFunction(path)) {
					object = origRoot = path; // For top-level calls, objects in the paths array become the origRoot for subsequent paths.
				}
				root = path;
				parts = [root];
			}
			while (object && typeof object === "object" && (prop = parts.shift()) !== undefined) {
				if ("" + prop === prop) {
					if (prop === "") {
						continue;
					}
					if ((parts.length < depth + 1) && !object.nodeType) {
						// Add observer for each token in path starting at depth, and on to the leaf
						if (!unobserve && (events = $hasData(object) && $._data(object))) {
							events = events.events;
							events = events && events.propertyChange;
							el = events && events.length;
							while (el--) { // Skip duplicates
								data = events[el].data;
								if (data && data.cb === callback && ((data.prop === prop && data.path === parts.join(".")) || data.prop === "*")) {
									break;
								}
							}
							if (el > -1) {
								// Duplicate binding found, so move on
								object = object[prop];
								continue;
							}
						}
						if (prop === "*") {
							if ($isFunction(object)) {
								if (dep = object.depends) {
									$observe(dep, callback, unobserve||origRoot);
								}
							} else {
								observeOnOff(ns, prop);
							}
							break;
						} else if (prop && !($isFunction(dep = object[prop]) && dep.depends)) {
							// If leaf is a computed observable (function with declared dependencies) we do not
							// currently observe 'swapping' of the observable - only changes in its dependencies.
							observeOnOff(ns + "." + prop, parts.join("."));
						}
					}
					prop = prop ? object[prop] : object;
				}
				if ($isFunction(prop)) {
					if (dep = prop.depends) {
						// This is a computed observable. We will observe any declared dependencies
						$observe(object, resolvePathObjects(dep, object), callback, filter, unobserve||wrapArray(origRoot));
					}
					break;
				}
				object = prop;
			}
		}
		bindArray();
		if (cbId) {
			removeCbBindings(bindings, cbId);
		}

		// Return the bindings to the top-level caller, along with the cbId
		return { cbId: cbId, bnd: bindings, leaf: object };
	}

	function $unobserve() {
		[].push.call(arguments, true); // Add true as additional final argument
		return $observe.apply(this, arguments);
	}

	//========================== Initialize ==========================

	$.observable = $observable;
	$observable.Object = ObjectObservable;
	$observable.Array = ArrayObservable;
	$observable.observe = $observe;
	$observable.unobserve = $unobserve;

	ObjectObservable.prototype = {
		_data: null,

		data: function() {
			return this._data;
		},

		observe: function(paths, callback) {
			return $observe(this._data, paths, callback);
		},

		unobserve: function(paths, callback) {
			return $unobserve(this._data, paths, callback);
		},

		setProperty: function(path, value, nonStrict) { // TODO in the case of multiple changes (object): raise single propertyChanges event
			// (which may span different objects, via paths) with set of changes.
			var leaf, key, pair,
				self = this;

			if (self._data) {
				if ($isArray(path)) {
					// This is the array format generated by serializeArray. However, this has the problem that it coerces types to string,
					// and does not provide simple support of convertTo and convertFrom functions.
					// TODO: We've discussed an "objectchange" event to capture all N property updates here. See TODO note above about propertyChanges.
					key = path.length;
					while (key--) {
						pair = path[key];
						self.setProperty(pair.name, pair.value, nonStrict === undefined || nonStrict) //If nonStrict not specified, default to true;
					}
				} else if (path && "" + path !== path) {
					// Object representation where property name is path and property value is value.
					// TODO: We've discussed an "objectchange" event to capture all N property updates here. See TODO note above about propertyChanges.
					for (key in path) {
						self.setProperty(key, path[key], value);
					}
				} else if ((leaf = getObjectOnPath(self._data, path, 1)) && !path || path.indexOf($expando) < 0) {
					// Simple single property case.
					self._setProperty(leaf[0], leaf[1], value, nonStrict);
				}
			}
			return self;
		},

		_setProperty: function(leaf, path, value, nonStrict) {
			var setter, getter,
				property = path ? leaf[path] : leaf;

			if ($isFunction(property)) {
				if (property.set) {
					// Case of property setter/getter - with convention that property is getter and property.set is setter
					getter = property;
					setter = property.set === true ? property : property.set;
					property = property.call(leaf); //get
				}
			}

			if (property !== value || nonStrict && property != value) { // Optional non-strict equality, since serializeArray, and form-based editors can map numbers to strings, etc.
				// Date objects don't support != comparison. Treat as special case.
				if (!(property instanceof Date) || property > value || property < value) {
					if (setter) {
						setter.call(leaf, value);	//set
						value = getter.call(leaf);	//get updated value
					} else {
						leaf[path] = value;
					}
					this._trigger(leaf, {path: path, value: value, oldValue: property});
				}
			}
		},

		_trigger: function(target, eventArgs) {
			$(target).triggerHandler(propertyChangeStr, eventArgs);
		}
	};

	ArrayObservable.prototype = {
		_data: null,

		data: function() {
			return this._data;
		},

		insert: function(index, data) {
			validateIndex(index);

			if (arguments.length > 1) {
				data = $isArray(data) ? data : [data]; // TODO: Clone array here?
				// data can be a single item (including a null/undefined value) or an array of items.

				if (data.length) {
					this._insert(index, data);
				}
			}
			return this;
		},

		_insert: function(index, data) {
			_data = this._data;
			oldLength = _data.length;
			splice.apply(_data, [index, 0].concat(data));
			this._trigger({change: "insert", index: index, items: data});
		},

		remove: function(index, numToRemove) {
			validateIndex(index);

			numToRemove = (numToRemove === undefined || numToRemove === null) ? 1 : numToRemove;
			if (numToRemove && index > -1) {
				var items = this._data.slice(index, index + numToRemove);
				numToRemove = items.length;
				if (numToRemove) {
					this._remove(index, numToRemove, items);
				}
			}
			return this;
		},

		_remove: function(index, numToRemove, items) {
			_data = this._data;
			oldLength = _data.length;
			_data.splice(index, numToRemove);
			this._trigger({change: "remove", index: index, items: items});
		},

		move: function(oldIndex, newIndex, numToMove) {
			validateIndex(oldIndex);
			validateIndex(newIndex);

			numToMove = (numToMove === undefined || numToMove === null) ? 1 : numToMove;
			if (numToMove) {
				var items = this._data.slice(oldIndex, oldIndex + numToMove);
				this._move(oldIndex, newIndex, numToMove, items);
			}
			return this;
		},

		_move: function(oldIndex, newIndex, numToMove, items) {
			_data = this._data;
			oldLength = _data.length;
			_data.splice( oldIndex, numToMove );
			_data.splice.apply( _data, [ newIndex, 0 ].concat( items ) );
			this._trigger( { change: "move", oldIndex: oldIndex, index: newIndex, items: items } );
		},

		refresh: function(newItems) {
			var oldItems = this._data.slice(0);
			this._refresh(oldItems, newItems);
			return this;
		},

		_refresh: function(oldItems, newItems) {
			_data = this._data;
			oldLength = _data.length;
			splice.apply(_data, [0, _data.length].concat(newItems));
			this._trigger({change: "refresh", oldItems: oldItems});
		},

		_trigger: function(eventArgs) {
			var $data = $([_data]);
			$data.triggerHandler(arrayChangeStr, eventArgs);
			$data.triggerHandler(propertyChangeStr, {path: "length", value: _data.length, oldValue: oldLength});
		}
	};

	$eventSpecial[propertyChangeStr] = $eventSpecial[arrayChangeStr] = {
		// The jQuery 'off' method does not provide the event data from the event(s) that are being unbound, so we register
		// a jQuery special 'remove' event, and get the data.cb._bnd from the event here and provide it in the
		// cbBindings var to the unobserve handler, so we can immediately remove this object from that cb._bnd collection, after 'unobserving'.
		remove: function(evData) {
			if ((evData = evData.data) && (evData.off = 1, evData = evData.cb)) { //Set off=1 as marker for disposed event
				// Get the cb._bnd from the ev.data object
				cbBindings = cbBindingsStore[cbBindingsId = evData._bnd];
			}
		},
		teardown: function(namespaces) {
			if (cbBindings) {
				delete cbBindings[$.data(this, "obId")];
				removeCbBindings(cbBindings, cbBindingsId);
			}
		}
	};
})(this, this.jQuery || this.jsviews);
