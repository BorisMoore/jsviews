/*! JsObservable v1.0.0-alpha: http://github.com/BorisMoore/jsviews and http://jsviews.com/jsviews
informal pre V1.0 commit counter: 49 (Beta Candidate) */
/*
 * Subcomponent of JsViews
 * Data change events for data-linking
 *
 * Copyright 2013, Boris Moore
 * Released under the MIT License.
 */

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

		currentCbBindings, currentCbBindingsId,
		$eventSpecial = $.event.special,
		$viewsSub = $.views ? $.views.sub: {},
		cbBindingKey = 1,
		splice = [].splice,
		$isArray = $.isArray,
		$expando = $.expando,
		OBJECT = "object",
		PARSEINT = parseInt,
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
				out = out.concat(resolvePathObjects(path.call(root, root), root));
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
				ctx = ev.data,
				allowArray = !ctx.cb.noArray,
				paths = ctx.paths;

			if (ev.type === arrayChangeStr) {
				(ctx.cb.array || ctx.cb).call(ctx, ev, eventArgs); // If there is an arrayHandler expando on the regular handler, use it, otherwise use the regular handler for arrayChange events also - for example: $.observe(array, handler)
				// or observeAll() with an array in the graph. Note that on data-link bindings we ensure always to have an array handler - $.noop if none is specified e.g. on the data-linked tag.
			} else if (ctx.prop === eventArgs.path || ctx.prop === "*") {
				if (typeof value === OBJECT && (paths[0] || allowArray && $isArray(value))) { // Note: && (paths[0] || $isArray(value)) is for perf optimization
					//- (unobserve ongoing path, if not a leaf object, or arrayChange if array)
					observe_apply(allowArray, [value], paths, ctx.cb, true); // unobserve
				}
				if (typeof (value = eventArgs.value) === OBJECT && (paths[0] || allowArray && $isArray(value))) { // Note: && (paths[0] || $isArray(value)) is for perf optimization
					observe_apply(allowArray, [value], paths, ctx.cb);
				}
				ctx.cb(ev, eventArgs);
			}
		}
	}

	function $observe() {
		// $.observe(root, [1 or more objects, path or path Array params...], callback[, contextCallback][, unobserveOrOrigRoot)
		function observeOnOff(namespace, pathStr, isArrayBinding, off) {
			var evData,
				obIdExpando = $hasData(object),
				boundObOrArr = wrapArray(object);
			currentCbBindings = 0;
			if (unobserve || off) {
				if (obIdExpando) {
					$(boundObOrArr).off(namespace, onObservableChange);
					// jQuery off event does not provide the event data, with the callback and we need to remove this object from the corresponding cbBindings hash, cbBindingsStore[cb._cId].
					// So we have registered a jQuery special 'remove' event, which stored the cbBindingsStore[cb._cId] cbBindings hash in the currentCbBindings var,
					// so we can immediately remove this object from that cbBindings hash.
					if (currentCbBindings) {
						delete currentCbBindings[$.data(object, "obId")];
					}
				}
			} else {
				if (events = obIdExpando && $._data(object)) {
					events = events && events.events;
					events = events && events[isArrayBinding ? arrayChangeStr : propertyChangeStr];
					el = events && events.length;

					while (el--) {
						if ((data = events[el].data) && data.cb._cId === callback._cId) {
							if (isArrayBinding) {
								// Duplicate exists, so skip. (This can happen e.g. with {^{for people ~foo=people}})
								return;
							} else if (pathStr === "*" && data.prop !== pathStr || data.prop === prop) {
								$(object).off(namespace, onObservableChange);
								// We remove this object from cbBindings hash (see above).
								if (currentCbBindings) {
									delete currentCbBindings[$.data(object, "obId")];
								}
							}
						}
					}
				}
				evData = isArrayBinding ? {cb: callback}
					: {fullPath: path,
						paths: pathStr ? [pathStr] : [],
						prop: prop,
						cb: callback};
				if (allPath) {
					evData.allPath = allPath;
				}
				$(boundObOrArr).on(namespace, null, evData, onObservableChange);
				if (cbBindings) {
					// Add object to cbBindings, and add the counter to the jQuery data on the object
					cbBindings[$.data(object, "obId") || $.data(object, "obId", observeObjKey++)] = object;
				}
			}
		}

		function onUpdatedExpression(exprOb, paths) {
			// Use the contextCb callback to execute the compiled exprOb template in the context of the view/data etc. to get the returned value, typically an object or array.
			// If it is an array, register array binding
			exprOb._ob = contextCb(exprOb, origRoot);
			var origRt = origRoot;
			return function(ev, eventArgs) {
				var obj = exprOb._ob,
					len = paths.length;
				if (typeof obj === OBJECT) {
					bindArray(obj, true);
					if (len || allowArray && $isArray(obj)) {
						observe_apply(allowArray, [obj], paths, callback, contextCb, true); // unobserve
					}
				}
				obj = exprOb._ob = contextCb(exprOb, origRt);
				// Put the updated object instance onto the exprOb in the paths array, so subsequent string paths are relative to this object
				if (typeof obj === OBJECT) {
					bindArray(obj);
					if (len || allowArray && $isArray(obj)) {
						observe_apply(allowArray, [obj], paths, callback, contextCb, [origRt]);
					}
				}
				callback(ev, eventArgs);
			}
		}

		function bindArray(arr, unbind, isArray, relPath, filter) {
			if (allowArray) {
				// This is a call to observe that does not come from observeAndBind (tag binding), so we allow arrayChange binding
				var prevObj = object,
					prevAllPath = allPath;

				object = arr;
				if (relPath) {
					object = arr[relPath];
					allPath += "." + relPath;
					if (filter) {
						object = $observable._fltr(relPath, arr, allPath, filter);
					}
				}
				if (object && (isArray || $isArray(object))) {
					observeOnOff(arrayChangeStr + ".observe" + (callback ? ".obs" + (cbId = callback._cId = callback._cId || observeCbKey++) : ""), undefined, true, unbind);
				}
				object = prevObj;
				allPath = prevAllPath;
			}
		}

		var i, p, skip, parts, prop, path, isArray, dep, unobserve, callback, cbId, el, data, events, contextCb, items, cbBindings, depth, innerCb, allPath, filter,
			allowArray = this != false, // If this === false, this is a call from observeAndBind - doing binding of datalink expressions. We don't bind
			// arrayChange events in this scenario. Instead, {^{for}} and similar do specific arrayChange binding to the tagCtx.args[0] value, in onAfterLink.
			// Note deliberately using this != false, rather than this !== false because of IE<10 bug- see https://github.com/BorisMoore/jsviews/issues/237
			topLevel = 1,
			ns = observeStr,
			paths = Array.apply(0, arguments),
			lastArg = paths.pop(),
			origRoot = paths.shift(),
			root =origRoot,
			object = root,
			l = paths.length;

		if ($isFunction(lastArg)) {
			callback = lastArg;
		} else {
			if (lastArg + "" === lastArg) {
				allPath = lastArg;
				filter = paths.pop();
				lastArg = paths.pop();
				l = l - 2;
			}
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
		if (l && $isFunction(paths[l-1])) {
			contextCb = callback;
			callback = paths.pop();
			l--;
		}

		// Use a unique namespace (e.g. obs7) associated with each observe() callback to allow unobserve to remove handlers
		ns += unobserve
			? (callback ? ".obs" + callback._cId: "")
			: ".obs" + (cbId = callback._cId = callback._cId || observeCbKey++);

		if (!unobserve) {
			cbBindings = cbBindingsStore[cbId] = cbBindingsStore[cbId] || {};
		}
		if ($isArray(root)) {
			bindArray(root, unobserve, true);
		} else {
			// remove onObservableChange handlers that wrap that callback
			if (unobserve && l === 0 && root) {
				observeOnOff(ns, "");
			}
		}
		depth = 0;
		for (i = 0; i < l; i++) {
			path = paths[i];
			if (path === "") {
				continue;
			}
			object = root;
			if ("" + path === path) {
				//path = path || "*"; // This ensures that foo(person) will depend on any changes in person
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
							innerCb.noArray = allowArray === false;
							path._rt = origRoot;
							innerCb._cId = callback._cId; // Set the same cbBindingsStore key as for callback, so when callback is disposed, disposal of innerCb happens too.
						}
						observe_apply(allowArray, [path._rt], paths.slice(0, i), path._cb, contextCb, unobserve);
						path = path._ob;
					}
					object = path; // For top-level calls, objects in the paths array become the origRoot for subsequent paths.
				}
				root = path;
				parts = [root];
			}
			while (object && (prop = parts.shift()) !== undefined) {
				if (typeof object === OBJECT) {
					if ("" + prop === prop) {
						if (prop === "") {
							continue;
						}
						if ((parts.length < depth + 1) && !object.nodeType) {
							// Add observer for each token in path starting at depth, and on to the leaf
							if (!unobserve && (events = $hasData(object) && $._data(object))) {
								events = events.events;
								events = events && events[propertyChangeStr];
								el = events && events.length;
								skip = 0;
								while (el--) { // Skip duplicates
									data = events[el].data;
									if (data && data.cb === callback) {
										if (data.prop === prop || data.prop === "*") {
											if (p = parts.join(".")) {
												data.paths.push(p); // We will skip this binding, but if it is not a leaf binding,
												// need to keep bindings rest of path, ready for if the object gets swapped.
											}
											skip++;
										}
									}
								}
								if (skip) {
									// Duplicate binding(s) found, so move on
									object = object[prop];
									continue;
								}
							}
							if (prop === "*") {
								if (!unobserve && events && events.length) {
									// Remove existing bindings, since they will be duplicates with "*"
									observeOnOff(ns, "", false, true);
								}
								if ($isFunction(object)) {
									if (dep = object.depends) {
										observe_apply(allowArray, [dep], callback, unobserve || origRoot);
									}
								} else {
									observeOnOff(ns, "");
								}
								for (p in object) {
									// observing "*" listens to any prop change, and also to arraychange on props of type array
									bindArray(object, unobserve, undefined, p, filter);
								}
								break;
							} else if (prop) {
								observeOnOff(ns + "." + prop, parts.join("."));
							}
						}
						if (allPath) {
							allPath += "." + prop;
						}
						prop = object[prop];
					}
					if ($isFunction(prop)) {
						if (dep = prop.depends) {
							// This is a computed observable. We will observe any declared dependencies
							observe_apply(allowArray, [object], resolvePathObjects(dep, object), callback, contextCb, unobserve || [origRoot]);
						}
						break;
					}
					object = prop;
				}
			}
			bindArray(object, unobserve);
		}
		if (cbId) {
			removeCbBindings(cbBindings, cbId);
		}

		// Return the cbBindings to the top-level caller, along with the cbId
		return { cbId: cbId, bnd: cbBindings, leaf: object };
	}

	function $unobserve() {
		[].push.call(arguments, true); // Add true as additional final argument
		return $observe.apply(this, arguments);
	}

	function observe_apply() {
		// $.observe(), but allowing you to include arrays within the arguments - which you want flattened.
		var args = [].concat.apply([], arguments); // Flatten the arguments
		return $observe.apply(args.shift(), args);
	}

	function shallowFilter(key, object, allPath) {
		return (allPath.indexOf(".") < 0) && (allPath.indexOf("[") < 0) && object[key];
	}

	function DataMap(getTarget, observeSource, observeTarget, srcPathFilter, tgtPathFilter) {
		srcPathFilter = srcPathFilter || shallowFilter; // default to shallowFilter
		tgtPathFilter = tgtPathFilter || shallowFilter;
		return {
			getTgt: getTarget,
			obsSrc: observeSource,
			obsTgt: observeTarget,
			map: function(source) {
				var theMap = this; // Instance of DataMap
				if (theMap.src !== source) {
					if (theMap.src) {
						theMap.unmap();
					}
					if (typeof source === "object") {
						var changing,
						target = getTarget.apply(theMap, arguments);

						if ($.observable) { // If JsObservable is loaded
							$.observable(source).observeAll(theMap.obs = function(ev, eventArgs) {
								if (!changing && observeSource) {
									changing = true;
									observeSource.call(theMap, source, target, ev, eventArgs);
									changing = false;
								}
							}, srcPathFilter);
							$.observable(target).observeAll(theMap.obt = function(ev, eventArgs) {
								if (!changing && observeTarget) {
									changing = true;
									observeTarget.call(theMap, source, target, ev, eventArgs);
									changing = false;
								}
							}, tgtPathFilter);
						}
						theMap.src = source;
						theMap.tgt = target;
					}
				}
				return theMap;
			},
			unmap: function() {
				if ($.observable) { // If JsObservable is loaded
					var theMap = this;
					if (theMap.src) {
						$.observable(theMap.src).unobserveAll(theMap.obs, srcPathFilter);
						$.observable(theMap.tgt).unobserveAll(theMap.obt, tgtPathFilter);
						theMap.src = theMap.tgt = undefined;
					}
				}
			}
		}
	}

	//========================== Initialize ==========================

	function $observeAll(cb, filter) {
		observeAll(this._data, cb, filter, "root");
	}

	function $unobserveAll(cb, filter) {
		observeAll(this._data, cb, filter, "root", true);
	}

	function observeAll(object, cb, filter, allPath, unobserve) {
		function wrappedCb(ev, eventArgs) {
			// This object is changing.
			allPath = ev.data.allPath;
			switch (eventArgs.change) { // observeAll/unobserveAll on added or removed objects
				case "insert":
					observeAll(eventArgs.items, cb, 0, allPath); // observeAll on added items
					break;
				case "remove":
					observeAll(eventArgs.items, cb, 0, allPath, true); // unobserveAll on removed items
					break;
				case "refresh":
					observeAll(eventArgs.oldItems, cb, 0, allPath, true); // unobserveAll on old items
					observeAll(ev.target, cb, 0, allPath); // observeAll on new items
					break;
				case "set":
					observeAll(eventArgs.oldValue, cb, 0, allPath, true); // unobserveAll on previous value object
					observeAll(eventArgs.value, cb, 0, allPath); // observeAll on new value object
			}
			cb.apply(this, arguments); // Observe this object (invoked the callback)
		}

		var l, prop, isObject, newAllPath, newObject;

		if (typeof object === OBJECT) {
			isObject = $isArray(object) ? "" : "*"; // The path string for binding all properties of an object
			if (cb) {
				// Observe this object or array - and also listen for changes to object graph, to add or remove observers from the modified object graph
				if (isObject || filter !== 0) {
					// If an object, observe the object. If an array, only add arrayChange binding if (filter !== 0) - which
					// is the case for top-level calls or for nested array (array item of an array - e.g. member of 2-dimensional array).
					// (But not for array properties lower in the tree, since they get arrayChange binding added during regular $.observe(array ...) binding.
					wrappedCb._cId = cb._cId = cb._cId || observeCbKey++; // Identify wrapped callback with unwrapped callback, so unobserveAll will
					// remove previous observeAll wrapped callback, if inner callback was the same;
					$observe(object, isObject, wrappedCb, unobserve, filter, allPath); //FILTER for arrays too, here...??
				}
			} else {
				// No callback. Just unobserve if unobserve === true.
				$observe(object, isObject, undefined, unobserve, filter, allPath);
			}

			if (isObject) {
				// Continue stepping through object graph, observing object and arrays
				// To override filtering, pass in filter function, or replace $.observable._fltr
				for (l in object) {
					if (l.charAt(0) !== "_" && l !== $expando) { // Filter props with keys that start with _ or jquery, and also apply the custom filter function if any.
						newAllPath = allPath + "." + l;
						if (newObject = $observable._fltr(l, object, newAllPath, filter)) {
							observeAll(newObject, cb, filter || 0, newAllPath, unobserve);
						}
					}
				}
			} else { // Array
				l = object.length;
				newAllPath = allPath + "[]";
				while (l--) {
					if (newObject = $observable._fltr(l, object, newAllPath, filter)) {
						observeAll(newObject, cb, filter || "", newAllPath, unobserve); // If nested array, need to observe the array too - so set filter to ""
					}
				}
			}
		}
	}

	$.views.sub.DataMap = DataMap;
	$.observable = $observable;
	$observable._fltr = function(key, object, allPath, filter) {
		var prop = (filter && $isFunction(filter)
				? filter(key, object, allPath)
				: object[key] // TODO Consider supporting filter being a string or strings to do RegEx filtering based on key and/or allPath
			);
		return prop && ($isFunction(prop)
			? prop.set && prop.call(object) // It is a getter/setter
			: prop)
	}

	$observable.Object = ObjectObservable;
	$observable.Array = ArrayObservable;
	$.observe = $observable.observe = $observe;
	$.unobserve = $observable.unobserve = $unobserve;
	$observable._apply = observe_apply;

	ObjectObservable.prototype = {
		_data: null,

		observeAll: $observeAll,
		unobserveAll: $unobserveAll,

		data: function() {
			return this._data;
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
				} else if (path !== $expando) {
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
					property = property.call(leaf); // get - only treated as getter if also a setter. Otherwise it is simply a property of type function. See unit tests 'Can observe properties of type function'.
				}
			}

			if (property !== value || nonStrict && property != value) { // Optional non-strict equality, since serializeArray, and form-based editors can map numbers to strings, etc.
				// Date objects don't support != comparison. Treat as special case.
				if (!(property instanceof Date) || property > value || property < value) {
					if (setter) {
						setter.call(leaf, value);	//set
						value = getter.call(leaf);	//get updated value
					} else if (path) {
						leaf[path] = value;
					}
					this._trigger(leaf, {change: "set", path: path, value: value, oldValue: property});
				}
			}
		},

		_trigger: function(target, eventArgs) {
			$(target).triggerHandler(propertyChangeStr, eventArgs);
		}
	};

	ArrayObservable.prototype = {
		_data: null,

		observeAll: $observeAll,
		unobserveAll: $unobserveAll,

		data: function() {
			return this._data;
		},

		insert: function(index, data) {
			var _data = this._data;
			if (arguments.length === 1) {
				data = index;
				index = _data.length;
			}
			index = PARSEINT(index);
			if (index > -1 && index <= _data.length) {
				data = $isArray(data) ? data : [data];
				// data can be a single item (including a null/undefined value) or an array of items.
				// Note the provided items are inserted without being cloned, as direct references to the provided objects

				if (data.length) {
					this._insert(index, data);
				}
			}
			return this;
		},

		_insert: function(index, data) {
			var _data = this._data,
				oldLength = _data.length;
			splice.apply(_data, [index, 0].concat(data));
			this._trigger({change: "insert", index: index, items: data}, oldLength);
		},

		remove: function(index, numToRemove) {
			var items,
				_data = this._data;

			if (index === undefined) {
				index = _data.length - 1;
			}

			index = PARSEINT(index);
			numToRemove = numToRemove ? PARSEINT(numToRemove) : numToRemove === 0 ? 0 : 1; // if null or undefined: remove 1
			if (numToRemove > -1 && index > -1) {
				items = _data.slice(index, index + numToRemove);
				numToRemove = items.length;
				if (numToRemove) {
					this._remove(index, numToRemove, items);
				}
			}
			return this;
		},

		_remove: function(index, numToRemove, items) {
			var _data = this._data,
				oldLength = _data.length;

			_data.splice(index, numToRemove);
			this._trigger({change: "remove", index: index, items: items}, oldLength);
		},

		move: function(oldIndex, newIndex, numToMove) {
			numToMove = numToMove ? PARSEINT(numToMove) : numToMove === 0 ? 0 : 1; // if null or undefined: move 1
			oldIndex = PARSEINT(oldIndex);
			newIndex = PARSEINT(newIndex);

			if (numToMove > 0 && oldIndex > -1 && newIndex > -1 && oldIndex !== newIndex) {
				var items = this._data.slice(oldIndex, oldIndex + numToMove);
				numToMove = items.length;
				if (numToMove) {
					this._move(oldIndex, newIndex, numToMove, items);
				}
			}
			return this;
		},

		_move: function(oldIndex, newIndex, numToMove, items) {
			var _data = this._data,
				oldLength = _data.length;
			_data.splice(oldIndex, numToMove);
			_data.splice.apply(_data, [newIndex, 0].concat(items));
			this._trigger({change: "move", oldIndex: oldIndex, index: newIndex, items: items}, oldLength);
		},

		refresh: function(newItems) {
			var oldItems = this._data.slice(0);
			this._refresh(oldItems, newItems);
			return this;
		},

		_refresh: function(oldItems, newItems) {
			var _data = this._data,
				oldLength = _data.length;

			splice.apply(_data, [0, _data.length].concat(newItems));
			this._trigger({change: "refresh", oldItems: oldItems}, oldLength);
		},

		_trigger: function(eventArgs, oldLength) {
			var _data = this._data,
				length = _data.length,
				$data = $([_data]);

			$data.triggerHandler(arrayChangeStr, eventArgs);
			if (length !== oldLength) {
				$data.triggerHandler(propertyChangeStr, {change: "set", path: "length", value: length, oldValue: oldLength});
			}
		}
	};

	$eventSpecial[propertyChangeStr] = $eventSpecial[arrayChangeStr] = {
		// The jQuery 'off' method does not provide the event data from the event(s) that are being unbound, so we register
		// a jQuery special 'remove' event, and get the data.cb._cId from the event here and provide the corresponding currentCbBindings hash via the
		// currentCbBindings var to the unobserve handler, so we can immediately remove this object from that bindings hash, after 'unobserving'.
		remove: function(evData) {
			if ((evData = evData.data) && (evData.off = 1, evData = evData.cb)) { //Set off=1 as marker for disposed event
				// Get the cb._cId from ev.data.cb._cId
				currentCbBindings = cbBindingsStore[currentCbBindingsId = evData._cId];
			}
		},
		teardown: function(namespaces) {
			if (currentCbBindings) {
				delete currentCbBindings[$.data(this, "obId")];
				removeCbBindings(currentCbBindings, currentCbBindingsId);
			}
		}
	};
})(this, this.jQuery || this.jsviews);
