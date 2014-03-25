/*! JsObservable v1.0.0-alpha: http://github.com/BorisMoore/jsviews and http://jsviews.com/jsviews
informal pre V1.0 commit counter: 52 (Beta Candidate) */
/*
 * Subcomponent of JsViews
 * Data change events for data-linking
 *
 * Copyright 2014, Boris Moore
 * Released under the MIT License.
 */

(function(global, $, undefined) {
	// global is the this object, which is window when running in the usual browser environment.
	// $ is the global var jQuery or jsviews
	"use strict";

	if (!$) {
		throw "jsViews/jsObservable require jQuery";
	}
	if ($.observable) { return; } // JsObservable is already loaded

	//========================== Top-level vars ==========================

	var versionNumber = "v1.0.0-alpha",

		$eventSpecial = $.event.special,
		$viewsSub = $.views 
			? $.views.sub // jsrender was loaded before jquery.observable 
			: ($observable.sub = {}), // jsrender not loaded so store sub on $observable, and merge back in to $.views.sub in jsrender if loaded afterwards
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

	$viewsSub.getDeps = function() {
		var args = arguments;
		return function() {
			var arg, dep,
				deps = [],
				l=args.length;
			while (l--) {
				arg = args[l--],
				dep = args[l];
				if (dep) {
					deps = deps.concat($isFunction(dep) ? dep(arg, arg) : dep);
				}
			}
			return deps;
		}
	}

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

		for (cb in cbBindings) {
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
			var allPath, filter, parentObs,
				oldValue = eventArgs.oldValue,
				value = eventArgs.value,
				ctx = ev.data,
				observeAll = ctx.observeAll,
				allowArray = !ctx.cb.noArray,
				paths = ctx.paths;

			if (ev.type === arrayChangeStr) {
				(ctx.cb.array || ctx.cb).call(ctx, ev, eventArgs); // If there is an arrayHandler expando on the regular handler, use it, otherwise use the regular handler for arrayChange events also - for example: $.observe(array, handler)
				// or observeAll() with an array in the graph. Note that on data-link bindings we ensure always to have an array handler - $.noop if none is specified e.g. on the data-linked tag.
			} else if (ctx.prop === eventArgs.path || ctx.prop === "*") {
				oldValue = typeof oldValue === OBJECT && (paths[0] || allowArray && $isArray(oldValue)) && oldValue; // Note: && (paths[0] || $isArray(value)) is for perf optimization
				value = typeof (value = eventArgs.value) === OBJECT && (paths[0] || allowArray && $isArray(value)) && value; 
				if (observeAll) {
					allPath = observeAll._path + "." + eventArgs.path;
					filter = observeAll.filter;
					parentObs = [observeAll.parents().slice(0)];
					if (oldValue) {
						observe_apply(allowArray, [oldValue], paths, ctx.cb, true, filter, parentObs, allPath); // unobserve
					}
					if (value) {
						observe_apply(allowArray, [value], paths, ctx.cb, undefined, filter, parentObs, allPath);
					}
				} else {
					if (oldValue) {
						observe_apply(allowArray, [oldValue], paths, ctx.cb, true); // unobserve
					}
					if (value) {
						observe_apply(allowArray, [value], paths, ctx.cb);
					}
				}
				ctx.cb(ev, eventArgs);
			}
		}
	}

	function $observe() {
		// $.observe(root, [1 or more objects, path or path Array params...], callback[, contextCallback][, unobserveOrOrigRoot)
		function observeOnOff(namespace, pathStr, isArrayBinding, off) {
			var j, evData,
				obIdExpando = $hasData(object),
				boundObOrArr = wrapArray(object);
			if (unobserve || off) {
				if (obIdExpando) {
					$(boundObOrArr).off(namespace, onObservableChange);
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
							}
						}
					}
				}
				evData = isArrayBinding ? {cb: callback}
					: {
						fullPath: path,
						paths: pathStr ? [pathStr] : [],
						prop: prop,
						cb: callback
					};

				if (allPath) {
					evData.observeAll = {
						_path: allPath,
						path: function() { // Step through path and parentObs parent chain, replacing '[]' by '[n]' based on current index of objects in parent arrays.
							j = parentObs.length;
							return allPath.replace(/[[.]/g, function(all) {
								j--;
								return all === "["
									? "[" + $.inArray(parentObs[j - 1], parentObs[j])
									: ".";
							});
						},
						parents: function() {
							return parentObs; // The chain or parents between the modified object and the root object used in the observeAll() call
						},
						filter: filter,
					}
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

		function bindArray(arr, unbind, isArray, relPath) {
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

		var i, p, skip, parts, prop, path, isArray, dep, unobserve, callback, cbId, el, data, events, contextCb, items, cbBindings, depth, innerCb, parentObs, allPath, filter,
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
			if (lastArg + "" === lastArg) { // If last arg is a string then this observe call is part of an observeAll call,
				allPath = lastArg;          // and the last three args are the parentObs array, the filter, and the allPath string.
				parentObs = paths.pop();
				filter = paths.pop();
				lastArg = paths.pop();
				l = l - 3;
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
									observeOnOff(ns, ""); // observe the object for any property change
								}
								for (p in object) {
									// observing "*" listens to any prop change, and also to arraychange on props of type array
									bindArray(object, unobserve, undefined, p);
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
					if (typeof source === OBJECT) {
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
		observeAll(this._data, cb, filter, [], "root");
	}

	function $unobserveAll(cb, filter) {
		observeAll(this._data, cb, filter, [], "root", true);
	}

	function observeAll(object, cb, filter, parentObs, allPath, unobserve) {
		function observeArray(arr, unobs) {
			l = arr.length;
			newAllPath = allPath + "[]";
			while (l--) {
				if (newObject = $observable._fltr(l, arr, newAllPath, filter)) {
					observeAll(newObject, cb, filter || "", parentObs.slice(0), newAllPath, unobs); // If nested array, need to observe the array too - so set filter to ""
				}
			}
		}

		function wrappedCb(ev, eventArgs) {
			// This object is changing.
			allPath = ev.data.observeAll._path;
			var oldParentObs = parentObs;
			if (parentObs[0]!==ev.target) {
				parentObs = parentObs.slice(0);
				parentObs.unshift(ev.target);
			}
			switch (eventArgs.change) { // observeAll/unobserveAll on added or removed objects
				case "insert":
					observeArray(eventArgs.items);
					break;
				case "remove":
					observeArray(eventArgs.items, true); // unobserveAll on removed items
					break;
				case "refresh":
					observeArray(eventArgs.oldItems, true); // unobserveAll on old items
					observeArray(ev.target); // observeAll on new items
					break;
				case "set":
					newAllPath = allPath + "." + eventArgs.path;
					observeAll(eventArgs.oldValue, cb, 0, parentObs.slice(0), newAllPath, true); // unobserveAll on previous value object
					observeAll(eventArgs.value, cb, 0, parentObs.slice(0), newAllPath); // observeAll on new value object
			}
			cb.apply(this, arguments); // Observe this object (invoke the callback)
			parentObs = oldParentObs;
		}

		var l, prop, isObject, newAllPath, newObject;

		if (typeof object === OBJECT) {
			isObject = $isArray(object) ? "" : "*";
			parentObs.unshift(object);
			if (cb) {
				// Observe this object or array - and also listen for changes to object graph, to add or remove observers from the modified object graph
				if (isObject || filter !== 0) {
					// If an object, observe the object. If an array, only add arrayChange binding if (filter !== 0) - which
					// is the case for top-level calls or for nested array (array item of an array - e.g. member of 2-dimensional array).
					// (But not for array properties lower in the tree, since they get arrayChange binding added during regular $.observe(array ...) binding.
					wrappedCb._cId = cb._cId = cb._cId || observeCbKey++; // Identify wrapped callback with unwrapped callback, so unobserveAll will
																		  // remove previous observeAll wrapped callback, if inner callback was the same;
					$observe(object, isObject, wrappedCb, unobserve, filter, parentObs.slice(), allPath);
				}
			} else {
				// No callback. Just unobserve if unobserve === true.
				$observe(object, isObject, undefined, unobserve, filter, parentObs.slice(), allPath);
			}

			if (isObject) {
				// Continue stepping through object graph, observing object and arrays
				// To override filtering, pass in filter function, or replace $.observable._fltr
				for (l in object) {
					if (l.charAt(0) !== "_" && l !== $expando) { // Filter props with keys that start with _ or jquery, and also apply the custom filter function if any.
						newAllPath = allPath + "." + l;
						if (newObject = $observable._fltr(l, object, newAllPath, filter)) {
							observeAll(newObject, cb, filter || 0, parentObs.slice(0), newAllPath, unobserve);
						}
					}
				}
			} else { // Array
				observeArray(object, unobserve);
			}
		}
	}

	$viewsSub.DataMap = DataMap;
	$.observable = $observable;
	$observable._fltr = function(key, object, allPath, filter) {
		var prop = (filter && $isFunction(filter)
				? filter(key, object, allPath)
				: object[key] // TODO Consider supporting filter being a string or strings to do RegEx filtering based on key and/or allPath
			);
		if (prop) {
			prop = $isFunction(prop)
				? prop.set && prop.call(object) // It is a getter/setter
				: prop;
		}
		return typeof prop === OBJECT && prop;
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
		// Register a jQuery special 'remove' event, to access the data associated with handlers being removed by jQuery.off().
		// We get data.cb._cId from the event handleObj and get the corresponding cbBindings hash from the cbBindingsStore,
		// then remove this object from that bindings hash - if the object does not have any other handlers associated with the same callback.
		remove: function (handleObj) {
			var cbBindings, found, events, l, data,
				evData = handleObj.data;
			if ((evData) && (evData.off = 1, evData = evData.cb)) { //Set off=1 as marker for disposed event
				// Get the cb._cId from handleObj.data.cb._cId
				if (cbBindings = cbBindingsStore[evData._cId]) {
					// There were bindings for this callback. If this was the last one, we'll remove it.
					events = $._data(this).events[handleObj.type];
					l = events.length;
					while (l-- && !found) {
						found = (data = events[l].data) && data.cb === evData; // Found another one with same callback
					}
					if (!found) {
						// This was the last handler for this callback and object, so remove the binding entry
						delete cbBindings[$.data(this, "obId")];
						removeCbBindings(cbBindings, evData._cId);
					}
				}
			}
		}
	};

})(this, this.jQuery);
