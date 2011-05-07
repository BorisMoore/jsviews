/*!
 * jQuery Views Plugin v1.0pre
 * Interactive data-driven views, based on integration between jQuery Templates and jQuery Data Link.
 * Requires jquery.render.js (optimized version of jQuery Templates, for rendering to string).
 * See JsRender at http://github.com/BorisMoore/jsrender
 * and JsViews at http://github.com/BorisMoore/jsviews
 */
/// <reference path="http://ajax.aspnetcdn.com/ajax/jQuery/jquery-1.5-vsdoc.js" />
/// <reference path="../jquery-1.5.2.js" />
(function($, undefined) {

var linkSettings, decl,
	fnSetters = {
		value: "val",
		html: "html",
		text: "text"
	},

	linkAttr = "data-jq-linkto",
	bindAttr = "data-jq-linkfrom",
	pathAttr = "data-jq-path",

	unsupported = {
		"htmlhtml": 1,
		"arrayobject": 1,
		"objectarray": 1
	}

function link( map, from, to, parentView, prevNode, nextNode ) {

	// ============================
	// Helpers for "toObject" links

	function setFields( sourceObj, basePath, cb ) {
		var field, isObject, sourceVal;

		if ( typeof sourceObj === "object" ) {
			for ( field in sourceObj ) {
				sourceVal = sourceObj[ field ];
				if ( sourceObj.hasOwnProperty(field) && !$.isFunction( sourceVal ) && !( typeof sourceVal === "object" && sourceVal.toJSON )) {
					setFields( sourceVal, (basePath ? basePath + "." : basePath) + field, cb );
				}
			}
		} else {
			cb( sourceObj, basePath, thisMap.convert, sourceObj )
		}
	}

	function convertAndSetField( val, path, cnvt, sourceObj ) {
		//path = isFromHtml ? getLinkedPath( sourceObj, path )[0] : path;  // TODO do we need to pass in path?
		$.observable( toObj ).setField( path, cnvt
			? cnvt( val, path, sourceObj, toObj, thisMap )
			: val
		);
	}

	// ============================
	// Helper for --- TODO clean up between different cases....
	var	toObj,
		callback = parentView && ($.isFunction( parentView ) ? parentView : parentView.callback),
		toType = "view";

	if ( to ) {
		toType = objectType( to );
		toObj = to[0];
	}

	var	j, l, innerMap, isArray, path, view, views,
		thisMap = typeof map === "string" ? { to: thisMap } : map && $.extend( {}, map ),
	// Note: "string" corresponds to 'to'. Is this intuitive? It is useful for filtering object copy: $.link( person, otherPerson, ["lastName", "address.city"] );
		fromPath = thisMap.from,
		fromObj = from[0],
		fromType = objectType( from ),
		isFromHtml = (fromType === "html"),
		eventType = isFromHtml ? "change" : fromType + "Change",

		// TODO Verify optimization for memory footprint in closure captured by handlers, and perf optimization for using function declaration rather than statement?
		handler = function( ev, eventArgs ) {
			var cancel, sourceValue, sourcePath,
				source = ev.target,

			fromHandler = {
				"html": function() {
					var setter, fromAttr, $source;

					fromAttr = thisMap.fromAttr;
					if ( !fromAttr ) {
						// Merge in the default attribute bindings for this source element
						fromAttr = linkSettings.merge[ source.nodeName.toLowerCase() ];
						fromAttr = fromAttr ? fromAttr.from.fromAttr : "text";
					}
					setter = fnSetters[ fromAttr ];
					$source = $( source );
					sourceValue = setter ? $source[setter]() : $source.attr( fromAttr );
				},
				"object": function() {
					// For objectChange events, eventArgs provides the path (name), and value of the changed field
					var mapFrom = thisMap.from || (toType !== "html") && thisMap.to;
					if ( eventArgs ) {
						sourceValue = eventArgs.value;
						sourcePath = eventArgs.path;
						if ( mapFrom && sourcePath !== mapFrom ) {
							sourceValue = undefined;
						}
					} else {
						// This is triggered by .trigger(), where source is an object. So no eventArgs passed.
						sourcePath = mapFrom || sourcePath;
	//	TODO - verify for undefined source fields. Do we set target to ""?	sourceValue = sourcePath ? getField( source, sourcePath ) : "";
						sourceValue = sourcePath && getField( source, sourcePath ) || linkAttr;  // linkAttr used as a marker of trigger events
					}
				},
				"array": function() {
					// For objectChange events, eventArgs is a data structure of info on the array change
					sourceValue = eventArgs ? eventArgs.change : linkAttr;  // linkAttr used as a marker of trigger events
				}
			},

			toHandler = {
				"html": function() {
					to.each( function( _, el ) {
						var setter, targetPath , matchLinkAttr,
							targetValue = sourceValue,
							$target = $( el );

						function setTarget( all, attr, toPath, convert, toPathWithConvert ) {
							attr = attr || thisMap.toAttr;
							toPath = toPath || toPathWithConvert;
							convert = window[ convert ] || thisMap.convert; // TODO support for named converters

							matchLinkAttr = (!sourcePath || sourcePath === toPath );
							if ( !eventArgs ) {
								// This is triggered by trigger(), and there is no thisMap.from specified,
								// so use the declarative specification on each target element to determine the sourcePath.
								// So need to get the field value and run converter
								targetValue = getField( source, toPath );
							}
							// If the eventArgs is specified, then this came from a real field change event (not ApplyLinks trigger)
							// so only modify target elements which have a corresponding target path.
							if ( targetValue !== undefined && matchLinkAttr) {
								if ( convert && $.isFunction( convert )) {
									targetValue = convert( targetValue, source, sourcePath, el, thisMap );
								}
								if ( !attr ) {
									// Merge in the default attribute bindings for this target element
									attr = linkSettings.merge[ el.nodeName.toLowerCase() ];
									attr = attr? attr.to.toAttr : "text";
								}

								if ( css = attr.indexOf( "css-" ) === 0 && attr.substr( 4 ) ) {
									if ( $target.css( css ) !== targetValue ) {
										$target.css( css, targetValue );
									}
								} else {
									setter = fnSetters[ attr ];
									if ( setter && $target[setter]() !== targetValue ) {
										$target[setter]( targetValue );
									} else if ( $target.attr( attr ) !== targetValue ){
										$target.attr( attr, targetValue );
									}
								}
							}
						}

						// Find path using thisMap.from, or if not specified, use declarative specification
						// provided by decl.applyBindInfo, applied to target element
						targetPath = thisMap.from;
						if ( targetPath ) {
							setTarget( "", "", targetPath );
						} else {
							view = view || $.view( el ); // Cache view on this link instance
							if ( !view || (view.data === source && view.onDataChanged( ev.type, eventArgs ) !== false )) {
								decl.applyBindInfo( el, setTarget );
							}
						}
					});
				},
				"view": function() {
//					if ( parentView.data === source ) {
						parentView.onDataChanged( ev.type, eventArgs );
//					}
				},
				"object": function() {

					// Find toPath using thisMap.to, or if not specified, use declarative specification
					// provided by decl.applyLinkInfo, applied to source element
					var convert = thisMap.Convert,
						toPath = thisMap.to || !isFromHtml && sourcePath;

					if (toPath ) {
						convertAndSetField( sourceValue, toPath, thisMap.convert, source );
					} else if ( !isFromHtml ) {
						// This is triggered by trigger(), and there is no thisMap.from or thisMap.to specified.
						// This will set fields on existing objects or subobjects on the target, but will not create new subobjects, since
						// such objects are not linked so this would not trigger events on them. For deep copying without triggering events, use $.extend.
						setFields( source, "", convertAndSetField );
					} else { // from html. (Mapping from array to object not supported)
						decl.applyLinkInfo( source, function(all, path, declCnvt){
							// TODO support for named converters
							var cnvt = window[ declCnvt ] || convert;

							view = $.view( source );

							$.observable( view.data ).setField( path, cnvt
								? cnvt( sourceValue, path, source, view.data, thisMap )
								: sourceValue
							);
						});
					}
				},
				"array": function() {
					// For arrayChange events, eventArgs is a data structure of info on the array change
					if ( fromType === "array" ) {
						// TODO
//						if ( !eventArgs ) {
//							var args = $.map( fromObj, function( obj ){
//								return $.extend( true, {}, obj );
//							});
//							args.unshift( toObj.length );
//							args.unshift( 0 );
//							eventArgs = getEventArgs.splice( toObj, args );
//						}
//						changeArray( toObj, eventArgs );
					}
				}
			};

			fromHandler[ fromType ]();

			if ( !callback || !(cancel = callback.call( thisMap, ev, eventArgs, to, thisMap ) === false )) {
				if ( (toObj||callback) && toType !== "none" && sourceValue !== undefined ) {
					toHandler[ toType ]();
				}
			}
			if ( cancel ) {
				ev.stopImmediatePropagation();
			}
		};

	switch ( fromType + toType ) {
		case "htmlarray":
			for ( j=0, l=toObj.length; j<l; j++ ) {
				link( thisMap, from, $( toObj[j] ), parentView );
			}
			return; // Don't add link since not adding binding
		break;

		case "objecthtml":
		case "arrayhtml":

			if ( thisMap.link ) {
				// This is the top-level declarative binding from data to HTML
				// Create View tree
				thisMap.link = false;
				linkViews( thisMap, prevNode || toObj, 0, parentView, nextNode, fromObj );
				return;
				// Don't bind this element. We will bind the <!--tmpl--> node.
			}
			to.each( function( i, el ) {
				viewsJsData( el, "_jsvLinks" ).push( [from, handler] ); // TODO determine whether this can be on the jsViews data instead, for unlinking?
			});
		break;

		case "objectview":
			return;
		case "arrayview":
			toObj = parentView;
			parentView.handler = handler;
	}
// Store binding on html element, and override clean, to unbind from object or array. Also, if possible, remove from return view??
	from.bind( eventType, handler );

	// If from an object and the 'from' path points to a field of a descendant 'leaf object',
	// bind not only from leaf object, but also from intermediate objects
	if ( fromType === "object" && fromPath ) {
		fromPath = fromPath.split(".");
		if ( fromPath.length > 1 ) {
			fromObj = fromObj[ fromPath.shift() ];
			if ( fromObj ) {
				innerMap = $.extend( { inner: 1 }, thisMap ) // 1 is special value for 'inner' maps on intermediate objects, to prevent trigger() calling handler.
				innerMap.from = fromPath.join(".");
				link( innerMap, $( fromObj ), to, parentView);
			}
		}
	}
}

// ============================
// Helpers
function ViewItem( node, path, parentView, parentElViews, index, map ) {
	var view = CreateView( node, path, undefined, parentView, parentElViews, index, map );  // TODO Use apply( arguments ) to reduce code size - and elsewhere too.
	view.index = index;
	view.data = parentView.data[ index ];
	return view;
}

function View( node, path, template, parentView, parentElViews, data, index, map ) {
	var view = CreateView( node, path, template, parentView, parentElViews, index, map );

	if ( data === undefined && path && path !== "~" ) {
		var func = new Function( "jQuery","$item", "var $=jQuery,$data=$item.data; with($data){ return " + path  + "}");
		data = func( $, parentView );
	}
	view.data = data;
	return view;
}


function CreateView( node, path, template, parentView, parentElViews, index, map ) {
	// TODO Consider support for methods added to the public View prototype, and making the viewCreated event public.
	// Also actions called on view will bubble up parent views looking for the an view that implements that named action.

	// Allow instantiation without the 'new' keyword
	if ( !this.refresh ) {
		return new CreateView( node, path, template, parentView, parentElViews, index, map );
	}
	//unbindLinkedElem( node ); // FOR NOW only support creating views on html nodes that have NOT already been 'activated'
//	use $.view( node ).unlink(); ???

	var self = this, views;

	$.extend( self, {
		views: [],
		nodes: [],
		bindings: [],
		tmpl: template || (parentView && parentView.tmpl),
		path: path,
		parent: parentView,
		prevNode: node,
		map: map
	});
	if ( parentView ) {
		self.callback = parentView.callback;
		views = parentView.views;
		parentElViews.push( self );
		if ( index == undefined )  {
			views.push( self );
		} else {
			views.splice( index, 0, self );
			viewCount = views.length;

			while ( index < viewCount ) {
				views[ index++ ].index++;
			}
		}
	}
}

function viewsJsData( el, jqDataName ) {
	jqDataName = jqDataName || "_jsView";
	return $.data( el, jqDataName ) || $.data( el, jqDataName, [] );
}

function linkViews( map, node, depth, parent, nextNode, data, index ) {
	var tokens, tmplName, parentElViews,
		parentView = parent,
		viewDepth = depth;
		index = index || 0;

	function viewCreated( view ){
		if ( view.data ) {
			if ( view.bindings.length ) {
				link( map, $([ view.data ]), $( view.bindings ), view );
			}
			link( map, $([ view.data ]), undefined, view );
		}
	}

	function getParentElViews() {
		return parentElViews || (parentElViews = viewsJsData( node.parentNode ));
	}

	if ( node.nodeType === 1 ) {
		if ( viewDepth++ === 0 ) {
			parentView.nodes.push( node );
		}
		if ( node.getAttribute( bindAttr )) {
			parentView.bindings.push( node );
		}
		node = node.firstChild;
	} else {
		node = node.nextSibling;
	}
	while ( node != nextNode ) {
		if ( node.nodeType === 1 ) {
			linkViews( map, node, viewDepth, parentView );
		} else if (
			node.nodeType === 8
			&& (tokens = /^(\/?)(?:(item)|(?:tmpl(?:\((.+)\))?(?:\s+([^\s]+))?))$/.exec( node.nodeValue ))
//			&& (tokens = /^(\/?)(?:(item)|(?:tmpl(?:\(([\w\.\~]+)\))?(?:\s+([^\s]+))?))$/.exec( node.nodeValue ))
//			/\{\{(\/?)(\w+|.)(?:\(((?:[^\}]|\}(?!\}))*?)?\))?(?:\s+(.*?)?)?(\(((?:[^\}]|\}(?!\}))*)\))?\s*\}\}/g,  // TODO - what do we allow here?
//				function( all, slash, type, fnargs, target, parens, args ) {
		) {
			if ( tokens[1]) {
				if ( tokens[2] ) {
					// An item close tag: <!--/item-->

					parentView.nextNode = node;
					viewCreated( parentView );
					parentView = parent;

				} else {
					// A tmpl close tag: <!--/tmpl-->

					parentView.nextNode = node;
					viewCreated( parentView );
					return node;
				}
			} else if ( tokens[2] ) {
				// An item open tag: <!--item-->
				parentView = ViewItem( node, "*", parentView, getParentElViews(), index++, map );

			} else {
				// A tmpl open tag: <!--tmpl(path) name-->

				node = linkViews( map, node, 0,
					View( node, tokens[3], tokens[4], parentView, getParentElViews(), data, index, map )
				);
			}
		} else if ( viewDepth === 0 ) {
			parentView.nodes.push( node );
		}
		node = node.nextSibling;
	}
}

function objectType( object ) {
	object = object[0];
	return object
		? object.nodeType
			? "html"
			: $.isArray( object )
				? "array"
				: "object"
		: "none";
}

function wrapObject( object ) {
	return object instanceof $ ? object : $.isArray( object ) ? $( [object] ) : $( object ); // Ensure that an array is wrapped as a single array object
}

function getField( object, path ) {
	if ( object && path ) {
		var leaf = getLeafObject( object, path );
		object = leaf[0];
		if ( object ) {
			return object[ leaf[1] ];
		}
	}
}

function getLeafObject( object, path ) {
	if ( object && path ) {
		var parts = path.split(".");

		path = parts.pop();
		while ( object && parts.length ) {
			object = object[ parts.shift() ];
		}
		return [ object, path ];
	}
	return [];
}

function getLeafValue( object, path ) {
	var ret;
	if ( object && path ) {
	//   toPath     convert(  toPath  )        end
		path.replace( /^(?:([\w\.]+)|(\w+)\((.*)\))$/, function( all, path, convert, params ){
			convert = window[ convert ];
			//convert = converters[ convert ] || window[ convert ] // TODO support for named converters
			if ( convert && $.isFunction( convert )) {
				 ret = convert( getLeafValue( object, params ));
			}
		});
		if ( ret ) {
			object = ret;
		} else {
			object = getLeafObject( object, path );
			path = object[ 1 ];
			object = object[ 0 ];
			object = object && object[ path ];
		}
	}
	return object;
}

function unbindLinkedElem( node ) {
	var i, l, links = node && $.data( node, "_jsvLinks" );
	if ( links ) {
		for ( i=0, l=links.length; i<l; i++ ) {
			var link = links[i],
				from = link[0];
			from.unbind( ($.isArray( from[ 0 ]) ? "array" : "object" ) + "Change", link[1] /* handler */ );
			//TODO what if to includes several target elements, and only some are removed? Need to remove from to, not unbind... Probably not possible for this to happen with declarative binding
		}
	}
}

// ============================

var oldcleandata = $.cleanData;

$.extend({
	cleanData: function( elems ) {
		for ( var i = 0, el; (el = elems[i]) != null; i++ ) {
			// remove any links with this element as the target
			unbindLinkedElem( el );
		}
		oldcleandata( elems );
	},

	dataLink: function( from, to, prevNode, nextNode, callback ) {
		var args = $.makeArray( arguments ),
			l = args.length - 1;

		if ( !callback && $.isFunction( args[ l ])) {
			// Last argument is a callback.
			// So make it the fourth parameter (our named callback parameter)
			args[4] = args.pop();
			return $.dataLink.apply( $, args );
		}

		from = wrapObject( from );
		to = wrapObject( to );

		var i, map, maps, topView,
			targetElems = to,
			fromType = objectType( from ),
			toType = objectType( to ),
			toObj = to[0];

		if ( toType === "html" ) {
			topView = $.data( toObj, "_jsTopView" ); // THIS needs to be stored, and unlinked whenever replaced...
			if ( topView ) {
				topView.unlink();
			}

			topView = View();
			topView.callback = callback;

			$.data( toObj, "_jsTopView", topView );
			if ( prevNode && !prevNode.nodeType ) {
				maps = prevNode;
				prevNode = undefined;
			}
		}
		maps = maps
			|| !unsupported[ fromType + toType ]
			&& {
				link: true // Activate declarative linking
			};

		if ( fromType === "html" && maps.link ) {
			maps.from = "input[" + linkAttr + "]";
		}

		maps = $.isArray( maps ) ? maps : [ maps ];

		i = maps.length;

		while ( i-- ) {
			map = maps[ i ];
			if ( toType === "html" ) {
				path = map.to;
				if ( path ) {
					targetElems = to.find( path ).add( to.filter( path ));
					map.to = undefined;
				}
				targetElems.each( function(){
					link( map, from, $( this ), topView, prevNode, nextNode );
				});
			} else {
				link( map, from, to, callback );
			}
		}
		return topView;
	},

	view: function( node ) {
		var view, parentElViews, i;
		while ( node ) {
			if  ( node.nodeType === 8 && /^item|tmpl(\([\w\.\~]+\))?(\s+[^\s]+)?$/.test( node.nodeValue )) {
				parentElViews = $.data( node.parentNode, "_jsView" );
				i = parentElViews && parentElViews.length;
				while ( i-- ) {
					view = parentElViews[ i ];
					if ( view.prevNode === node ) {
						return view;
					}
				}
				return;
			} else if ( node.nodeType === 1 && (view = $.data( node, "_jsTopView" ))) {
				return view;
			}
			node = node.previousSibling || node.parentNode;
		}
	},

	dataLinkSettings: {
		decl: {
			linkAttr: linkAttr,
			bindAttr: bindAttr,
			pathAttr: pathAttr,
			applyLinkInfo: function( el, setTarget ){
				var linkInfo = el.getAttribute( decl.linkAttr );
				if ( linkInfo !== null ) {
									//  toPath:          convert     end
					linkInfo.replace( /([\w\.]*)(?:\:\s*(\w+)\(\)\s*)?$/, setTarget );
				}
//lastName:convert1()
//	Alternative using name attribute:
//	return el.getAttribute( decl.linkAttr ) || (el.name && el.name.replace( /\[(\w+)\]/g, function( all, word ) {
//		return "." + word;
//	}));
			},
			applyBindInfo: function( el, setTarget ){
				var bindInfo = el.nodeType === 1 && el.getAttribute( decl.bindAttr );
				if ( bindInfo ) {
										// toAttr:               toPath    convert(  toPath  )        end
					bindInfo.replace( /(?:([\w\-]+)\:\s*)?(?:(?:([\w\.]+)|(\w+)\(\s*([\w\.]+)\s*\))(?:$|,))/g, setTarget );
				}
			}
		},
		merge: {
			input: {
				from: {
					fromAttr: "value"
				},
				to: {
					toAttr: "value"
				}
			}
		},
		view: {
			pushValues: function() {
				var link, i = 0, l = links.length;
				while ( l-- ) {
					link = links[ l ];
					if ( !link.map.inner ) { // inner: 1 - inner map for intermediate object.
						link.from.each( function(){
							link.handler({
								type: link.type,
								target: this
							});
						});
					}
				}
				return this;
			},
			onDataChanged: function( type, eventArgs ) {
				var self = this,
					change =  eventArgs.change,
					newIndex = eventArgs.newIndex,
					oldIndex = eventArgs.oldIndex,
					newItems = eventArgs.newItems,
					oldItems = eventArgs.oldItems;
				switch ( change ) {
					case "add":
						self.addItems( newIndex, newItems );
					break;
					case "remove":
						self.removeItems( oldIndex, oldItems.length );
					break;
					case "move":
						self.refresh(); // Could optimize this
					break;
					case "reset":
						self.refresh();
					// Othercases: (e.g.undefined, for setField on observable object) etc. do nothing
				}
				return true;
			},
			refresh: function() {
				var html = $.render( this.tmpl, this.data ),
					prevNode = this.prevNode,
					nextNode = this.nextNode,
					parentNode = prevNode.parentNode;

				this.map = { link: true };
				$( this.nodes ).remove();
				this.removeItems( 0, this.views.length );
				this.nodes = [];
				$( prevNode ).after( html );
				this.prevNode = prevNode.nextSibling;
				parentNode.removeChild( prevNode );
				parentNode.removeChild( nextNode.previousSibling );
				linkViews( this.map, this.prevNode, 0, this, this.nextNode, this.data, this.index );
				return this;
				// ToDo look at allowing chained operations on updated view, with a way of getting to the updated nodes through and appropriate return value...
			},
			addItems: function( index, dataItems, tmpl ) {
				var itemsCount = dataItems.length,
					views = this.views;

				if ( itemsCount ) {
					var html = $.render( tmpl || this.tmpl, dataItems ), // Use passed in template if provided, since this added view may use a different template than the original one used to render the array.
						prevNode = index ? views[ index-1 ].nextNode : this.prevNode,
						nextNode = prevNode.nextSibling,
						parentNode = prevNode.parentNode;
					$( prevNode ).after( html );
					parentNode.removeChild( prevNode.nextSibling );
					parentNode.removeChild( nextNode.previousSibling );
					linkViews( this.map, prevNode || this.prevNode, 0, this, nextNode, this.data, index );
				}
				return this;
			},
			removeItems: function( index, itemsCount ) {
				if ( itemsCount ) {
					var views = this.views,
						current = index + itemsCount;

					while ( current-- > index ) {
						var view = views[ current ],
							node = view.prevNode,
							nextNode = view.nextNode,
							nodes = [ node ];

						while ( node !== nextNode ) {
							node = node.nextSibling
							nodes.push( node );
						}
						$( nodes ).remove();
					}
					views.splice( index, itemsCount );
					viewCount = views.length;

					while ( index < viewCount ) {
						views[ index++ ].index -= itemsCount;
					}
				}
				return this;
			},
			unlink: function() {
				var i, l, view, views = this.views;
				if ( this.handler ) {
					$([ this.data ]).unbind( "arrayChange", this.handler );
				}
				for ( i=0, l=views.length; i<l; i++ ) {
					views[i].unlink();
				}
				return this;
			}
		}
	}
});

$.fn.extend({
	dataLink: function( to, prevNode, nextNode, callback ) {  // DO WE NEED prevNode and nextNode? Need parentItem for sure...
		$.dataLink( this, to, prevNode, nextNode, callback );
		$.dataLink( to, this, prevNode, nextNode, callback );
		return this;
	},
	view: function() {
		return $.view( this[0] );
	}
});

linkSettings = $.dataLinkSettings;
View.prototype = linkSettings.view;
CreateView.prototype = linkSettings.view;
decl = linkSettings.decl;

})( jQuery );
