/*! jsObservable: http://github.com/BorisMoore/jsviews */
/*
 * Subcomponent of JsViews
 * Data change events for data-linking
 *
 * Copyright 2012, Boris Moore and Brad Olenick
 * Released under the MIT License.
 */
// informal pre beta commit counter: 22

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

		splice = [].splice,
		concat = [].concat,
		$isArray = $.isArray,
		$expando = $.expando,
		OBJECT = "object",
		propertyChangeStr = "propertyChange",
		observeStr = propertyChangeStr + ".observe",
		arrayChangeStr = "arrayChange",
		$isFunction = $.isFunction,
		observeObjKey = 1,
		observeCbKey = 1,
		cbBindings;

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

	function getObjectOnPath(object, path, offset) {
		// Returns leaf property unless offset > 0, in which case returns [objectAtOffsetFromLeaf, remainingPath]
		if (object && path) {
			var parts = path.split(".");
			while (object && parts.length > offset) {
				object = object[parts.shift()];
			}
			return offset ? [object, parts.join(".")] : object;
		}
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
				continue;
			}
			if (nextObj !== object) {
				out.push(object = nextObj);
			}
			out.push(path);
		}
		return out;
	}

	function onObservableChange(ev, eventArgs) {
		var ctx = ev.data;
		if (ctx.prop === "*" || ctx.prop === eventArgs.path) {
			if (typeof eventArgs.oldValue === OBJECT) {
				$unobserve(eventArgs.oldValue, ctx.path, ctx.cb);
			}
			if (typeof eventArgs.value === OBJECT) {
				$observe(eventArgs.value, ctx.path, ctx.cb, ctx.root);
			}
			ctx.cb.call(ctx.root, ev, eventArgs);
		}
	}

	$.event.special.propertyChange = {
		// The jQuery 'off' method does not provide the event data from the event(s) that are being unbound, so we register
		// a jQuery special 'remove' event, and get the data.cb._bnd from the event here and provide it in the
		// cbBindings var to the unobserve handler, so we can immediately remove this object from that cb._bnd collection, after 'unobserving'.
		remove: function(handleObj) {
			if ((handleObj = handleObj.data) && (handleObj = handleObj.cb)) {
				cbBindings = handleObj._bnd;
			}
		}
	};

	function $observe() {
		// $.observable.observe(root, [1 or more objects, path or path Array params...], callback[, resolveDependenciesCallback][, unobserveOrOrigRoot)
		function observeOnOff(namespace, pathStr) {
			obIdExpando = object[$expando];
			if (unobserve) {
				if (obIdExpando) {
					$(object).off(namespace, onObservableChange);
					// We remove this object from that cb._bnd collection (see above).

					// jQuery off event does not provide the event data, with the callback and we need to remove this object from the cb._bnd collection.
					// So we have registered a jQuery special 'remove' event, which stored the cb._bnd in the cbBindings var,
					// so we can immediately remove this object from that cb._bnd collection.
					delete cbBindings[obIdExpando.obId];
				}
			} else {
				if (pathStr === "*" && (events = obIdExpando)) {
					events = events && events.events;
					events = events && events.propertyChange;
					el = events && events.length;
					while (el--) {
						data = events[el].data;
						if (data.cb === callback && data.prop !== pathStr) {
							$(object).off(namespace + "." + data.prop, onObservableChange);
							// We remove this object from that cb._bnd collection (see above).
							delete cbBindings[obIdExpando.obId];
						}
					}
				}
				$(object).on(namespace, null, {root: origRoot, path: pathStr, prop: prop, cb: callback}, onObservableChange);
				if (bindings) {
					// Add object to bindings, and add the counter to the jQuery data on the object
					obIdExpando = object[$expando];
					bindings[obIdExpando.obId = obIdExpando.obId || observeObjKey++] = object;
				}
			}
		}

		var i, parts, path, prop, dep, object, unobserve, callback, cbNs, el, data, events, filter, items, bindings, obIdExpando, depth,
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
			if ($isFunction(paths[l-1])) {
				callback = paths.pop();
				l--;
			}
		}
		if ($isFunction(paths[l-1])) {
			filter = callback;
			callback = paths.pop();
			l--;
		}

		// Use a unique namespace, cbNs, (e.g. obs7) associated with each observe() callback to allow unobserve to
		// remove onObservableChange handlers that wrap that callback
		ns += unobserve
			? (callback ? "." + callback.cbNs : "")
			: "." + (callback.cbNs = callback.cbNs || "obs" + observeCbKey++);
		cbNs = callback && callback.cbNs;

		if (unobserve && l === 0 && root) {
			// unobserve(object) TODO what if there is a callback specified
			$(root).off(observeStr, onObservableChange);
		}
		bindings = callback
			? topLevel
				? (callback._bnd = callback._bnd || {})
				: callback._bnd
			: undefined;

		depth = 0;
		for (i=0; i<l; i++) {
			path = paths[i];
			if ("" + path !== path) {
				// This is an object
				root = path;
				if (topLevel) {
					origRoot = root; // For top-level calls, objects in the paths array become the origRoot for subsequent paths.
				}
				continue;
			}
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
				splice.apply(paths, [i--,1].concat(items));
				continue;
			}
			object = root;
			parts = path.split(".");
			while (object && typeof object === "object" && (prop = parts.shift())) {
				if ((parts.length < depth + 1) && !object.nodeType) {
					if (!unobserve && (events = object[$expando])) {
						events = events.events;
						events = events && events.propertyChange;
						el = events && events.length;
						while (el--) { // Skip duplicates
							data = events[el].data;
							if (data && data.cb === callback && (data.prop === prop || data.prop === "*")) {
								break;
							}
						}
						if (el > -1) {
							object = object && object[prop];
							continue;
						}
					}
					dep = object[prop];
					if (prop === "*") {
						if ($isFunction(object)) {
							if (dep = $isFunction(object) && object.depends) {
								$observe(object.depends, callback, unobserve||origRoot);
							}
						} else {
							observeOnOff(ns, prop);
						}
					} else if (dep = $isFunction(dep) && dep.depends) {
						$observe(object, resolvePathObjects(dep, object), callback, unobserve||origRoot);
					} else {
						observeOnOff(ns + "." + prop, parts.join("."));
					}
				}
				object = object && object[prop];
			}
		}
		// Return the bindings to the top-level caller, along with the cbNs
		return { cbNs: cbNs, bnd: bindings };
	}

	function $unobserve() {
		[].push.call(arguments, true);
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

		setProperty: function(path, value) { // TODO in the case of multiple changes (object): raise single propertyChanges event
			// (which may span different objects, via paths) with set of changes.
			var leaf, key, pair,
				self = this;

			if ($isArray(path)) {
				// This is the array format generated by serializeArray. However, this has the problem that it coerces types to string,
				// and does not provide simple support of convertTo and convertFrom functions.
				// TODO: We've discussed an "objectchange" event to capture all N property updates here. See TODO note above about propertyChanges.
				key = path.length;
				while (key--) {
					pair = path[key];
					self.setProperty(pair.name, pair.value);
				}
			} else if ("" + path !== path) {
				// Object representation where property name is path and property value is value.
				// TODO: We've discussed an "objectchange" event to capture all N property updates here. See TODO note above about propertyChanges.
				for (key in path) {
					self.setProperty(key, path[key]);
				}
			} else if ((leaf = getObjectOnPath(self._data, path, 1)) && path !== $expando) {
				// Simple single property case.
				self._setProperty(leaf[0], leaf[1], value);
			}
			return self;
		},

		_setProperty: function(leaf, path, value) {
			var setter, getter,
				property = leaf[path];

			if ($isFunction(property)) {
				if (property.set) {
					// Case of property setter/getter - with convention that property is getter and property.set is setter
					getter = property;
					setter = getter.set;
					property = property.call(leaf); //get
				}
			}

			if (property != value) { // test for non-strict equality, since serializeArray, and form-based editors can map numbers to strings, etc.
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
				data = $isArray(data) ? data : [data];  // TODO: Clone array here?
				// data can be a single item (including a null/undefined value) or an array of items.

				if (data.length) {
					this._insert(index, data);
				}
			}
			return this;
		},

		_insert: function(index, data) {
			splice.apply(this._data, [index, 0].concat(data));
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
			this._data.splice(index, numToRemove);
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
			data.splice(oldIndex, numToMove);
			splice.apply(this._data, [newIndex, 0].concat(items));
			this._trigger({change: "move", oldIndex: oldIndex, index: newIndex, items: items});
		},

		refresh: function(newItems) {
			var oldItems = this._data.slice(0);
			this._refresh(oldItems, newItems);
			return this;
		},

		_refresh: function(oldItems, newItems) {
			splice.apply(this._data, [0, this._data.length].concat(newItems));
			this._trigger({change: "refresh", oldItems: oldItems});
		},

		_trigger: function(eventArgs) {
			$([this._data]).triggerHandler(arrayChangeStr, eventArgs);
		}
	};
})(this, this.jQuery || this.jsviews);
