/*! jsObservable v1.0.0-alpha: http://github.com/BorisMoore/jsviews and http://jsviews.com/jsviews */
/*
 * Subcomponent of JsViews
 * Data change events for data-linking
 *
 * Copyright 2013, Boris Moore
 * Released under the MIT License.
 */
// informal pre beta commit counter: v1.0.0-alpha (39) (Beta Candidate)

(function(global, $, undefined) {
	// global is the this object, which is window when running in the usual browser environment.
	// $ is the global var jQuery or jsviews
	"use strict";

	if (!$) {
		throw "requires jQuery or JsRender";
	}
	if ($.observable) { return; } // JsObservable is already loaded

	//========================== Top-level vars ==========================

	var versionNumber = "v1.0.0-alpha",

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
		$hasData = $.hasData;

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
					$observe(wrapArray(value), ctx.path, ctx.cb); // If value is an array, observe wrapped array, so that observe() doesn't flatten out this argument
				}
				ctx.cb(ev, eventArgs);
			}
		}
	}

	function $observe() {
		// $.observable.observe(root, [1 or more objects, path or path Array params...], callback[, contextCallback][, unobserveOrOrigRoot)
		function observeOnOff(namespace, pathStr, isArrayBinding, off) {
			var obIdExpando = $hasData(object),
				boundObOrArr = wrapArray(object);
			cbBindings = 0;
			if (unobserve || off) {
				if (obIdExpando) {
					$(boundObOrArr).off(namespace, onObservableChange);
					// jQuery off event does not provide the event data, with the callback and we need to remove this object from the corresponding bindings hash, cbBindingsStore[cb._bnd].
					// So we have registered a jQuery special 'remove' event, which stored the cbBindingsStore[cb._bnd] bindings hash in the cbBindings var,
					// so we can immediately remove this object from that bindings hash.
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
									// We remove this object from bindings hash (see above).
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

		function onUpdatedExpression(exprOb, paths, unobserve) {
			// Use the contextCb callback to execute the compiled exprOb template in the context of the view/data etc. to get the returned value, typically an object or array.
			// If it is an array, register array binding
			exprOb._ob = contextCb(exprOb, origRoot);
			var origRt = origRoot;
			return function() {
				var obj = exprOb._ob,
					len = paths.length;
				if (typeof obj === OBJECT) {
					bindArray(obj, true);
					if (len) {
						$unobserve(wrapArray(obj), paths, callback, contextCb, origRt);
					}
				}
				obj = exprOb._ob = contextCb(exprOb, origRt);
				// Put the updated object instance onto the exprOb in the paths array, so subsequent string paths are relative to this object
				if (typeof obj === OBJECT) {
					bindArray(obj);
					if (len) {
						$observe(wrapArray(obj), paths, callback, contextCb, origRt);
					}
				}
			}
		}

		function bindArray(arr, unbind) {
			if (callback && callback.array && $isArray(arr)) {
				// This is a data-bound tag which has an onArrayChange handler, e.g. {^{for}}, and the leaf object is an array
				// - so we add the arrayChange binding
				var prevObj = object;
				object = arr;
				observeOnOff(arrayChangeStr + ".observe.obs" + callback._bnd, undefined, true, unbind);
				object = prevObj;
			}
		}

		var i, parts, prop, path, dep, object, unobserve, callback, cbId, el, data, events, contextCb, items, bindings, depth, innerCb,
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
				callback = paths.pop(); // If preceding is callback this will be contextCb param - which may be undefined
				l--;
			}
		}
		if ($isFunction(paths[l-1])) {
			contextCb = callback;
			callback = paths.pop();
			l--;
		}

		// Use a unique namespace (e.g. obs7) associated with each observe() callback to allow unobserve to
		// remove onObservableChange handlers that wrap that callback
		ns += unobserve
			? (callback ? ".obs" + callback._bnd: "")
			: ".obs" + (cbId = callback._bnd = callback._bnd || observeCbKey++);

		if (unobserve && l === 0 && root) {
			$(root).off(observeStr, onObservableChange);
		}
		if (!unobserve) {
			bindings = cbBindingsStore[cbId] = cbBindingsStore[cbId] || {};
		}
		depth = 0;
		for (i = 0; i < l; i++) {
			path = paths[i];
			bindArray(object, unobserve);
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
				if (contextCb && (items = contextCb(path, root))) {
					// If contextCb returns an array of objects and paths, we will insert them
					// into the sequence, replacing the current item (path)
					l += items.length - 1;
					splice.apply(paths, [i--, 1].concat(items));
					continue;
				}
				parts = path.split(".");
			} else {
				if (topLevel && !$isFunction(path)) {
					if (path._jsvOb) {
						if (!unobserve) {
							// This is a compiled function for binding to an object returned by a helper/data function.
							path._cb = innerCb = onUpdatedExpression(path, paths.slice(i+1));
							path._rt = origRoot;
							innerCb._bnd = callback._bnd; // Set the same cbBindingsStore key as for callback, so when callback is disposed, disposal of innerCb happens too. 
						}
						$observe(path._rt, paths.slice(0, i), path._cb, contextCb, unobserve);
						path = path._ob;
					}
					object = path; // For top-level calls, objects in the paths array become the origRoot for subsequent paths.
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
						$observe(object, resolvePathObjects(dep, object), callback, contextCb, unobserve||wrapArray(origRoot));
					}
					break;
				}
				object = prop;
			}
		}
		bindArray(object, unobserve);
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

		setProperty: function(path, value, nonStrict) {
			var leaf, key, pair, parts,
				self = this,
				object = self._data;

			path = path || "";
			if (object) {
				if ($isArray(path)) {
					// This is the array format generated by serializeArray. However, this has the problem that it coerces types to string,
					// and does not provide simple support of convertTo and convertFrom functions.
					key = path.length;
					while (key--) {
						pair = path[key];
						self.setProperty(pair.name, pair.value, nonStrict === undefined || nonStrict) //If nonStrict not specified, default to true;
					}
				} else if ("" + path !== path) {
					// Object representation where property name is path and property value is value.
					for (key in path) {
						self.setProperty(key, path[key], value);
					}
				} else if (path.indexOf($expando) < 0) {
					// Simple single property case.
					parts = path.split(".");
					while (object && parts.length > 1) {
						object = object[parts.shift()];
					}
					self._setProperty(object, parts.join("."), value, nonStrict);
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
				data = $isArray(data) ? data : [data];
				// data can be a single item (including a null/undefined value) or an array of items.
				// Note the provided items are inserted without being cloned, as direct feferences to the provided objects

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
			this._trigger({change: "move", oldIndex: oldIndex, index: newIndex, items: items});
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
			var length = _data.length,
				$data = $([_data]);
			$data.triggerHandler(arrayChangeStr, eventArgs);
			if (length !== oldLength) {
				$data.triggerHandler(propertyChangeStr, {path: "length", value: length, oldValue: oldLength});
			}
		}
	};

	$eventSpecial[propertyChangeStr] = $eventSpecial[arrayChangeStr] = {
		// The jQuery 'off' method does not provide the event data from the event(s) that are being unbound, so we register
		// a jQuery special 'remove' event, and get the data.cb._bnd from the event here and provide the corresponding cbBindings hash via the
		// cbBindings var to the unobserve handler, so we can immediately remove this object from that bindings hash, after 'unobserving'.
		remove: function(evData) {
			if ((evData = evData.data) && (evData.off = 1, evData = evData.cb)) { //Set off=1 as marker for disposed event
				// Get the cb._bnd from ev.data.cb._bnd
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
