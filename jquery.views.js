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
// var TEST_EVENTS = { total:0, change:0, arrayChange:0, objectChange:0 };
var topView, settings, decl,
	fnSetters = {
		value: "val",
		html: "html",
		text: "text"
	},

	jsvData = "_jsvData",

	onDataChange = {
		change: function( ev ) {
			var setter, cancel, fromAttr, toPath, sourceValue, link, cnvt, cnvtParams, view, reg,
				target = this.target,
				source = ev.target,
				$source = $( source ),
				links = this.links,
				l = links.length;

			while ( l-- && !cancel ) {
				link = links[ l ];
				if ( link.from && $( source ).is( link.from )) {
					fromAttr = link.fromAttr;
					if ( !fromAttr ) {
						// Merge in the default attribute bindings for this source element
						fromAttr = settings.merge[ source.nodeName.toLowerCase() ];
						fromAttr = fromAttr ? fromAttr.from.fromAttr : "text";
					}
					setter = fnSetters[ fromAttr ];
					sourceValue = $.isFunction( fromAttr ) ? fromAttr( source ) : setter ? $source[setter]() : $source.attr( fromAttr );

					if ((!this.cb || !(cancel = this.cb( ev ) === false )) && sourceValue !== undefined ) {
						// Find toPath using link.to, or if not specified, use declarative specification
						// provided by decl.applyLinkToInfo, applied to source element
						toPath = link.to;

						if (!toPath ) {
							var linkToInfo = source.getAttribute( settings.linkToAttr );
							if ( linkToInfo ) {
									//   object         obParams:      path               convert   cnvtParams
								reg = /([\$\w\.]+)?(?:\((.*?)\))?(?:\[([\w\.]*)\])(?:\:\s*(\w+)\((.*?)\))?\s*$/;
								// linkTo does not support multiple targets - use imperative linking for that scenario...

								linkToInfo.replace( reg, function( all, object, objectParams, path, convert, convertParams ) {
									if ( object ) {
										target = window[ object ]; // TODO Use getResource( object, objectParams );
									} else {
										view = $.view( source ); //TODO check whether we need to use the view here
										target = view && view.data || target;
									}
									toPath = path;
									cnvt =  convert || link.convert;
									cnvtParams = convertParams; 
								});
							}
						}
						if ( target[ cnvt ]) {
							// TODO Use getResource( convert ); - using View.defs, or similar, with fallbacks or bubbling...
							sourceValue = target[ cnvt].call( target, sourceValue, source, toPath, target, cnvtParams );
						} else if ( cnvt = window[ cnvt ] ) {
							// TODO Use getResource( convert ); - using View.defs, or similar, with fallbacks or bubbling...
							sourceValue = cnvt( sourceValue, source, toPath, target, cnvtParams );
						}
						if ( target ) {
							$.observable( target ).setField( toPath, sourceValue );
						}
					}
					if ( cancel ) {
						ev.stopImmediatePropagation();
					}
				}
			}
		},
		objectChange: function( ev, eventArgs ) {
			var setter, cancel,
				link = this,
				target = link.target,
				$target = $( target ),
				source = ev.target,
				from = link.inner || link.from || link.getFrom,
				attr = link.toAttr,
				convert = link.convert, // TODO support for named converters
				sourceValue = eventArgs ? eventArgs.value : getField( source, from ),
				sourcePath = eventArgs && eventArgs.path,
				view = $.view( target ); //TODO check whether we need to use the view here. If so pass it to the convert function too.

			if ((!link.cb || !(cancel = link.cb( ev, eventArgs ) === false ))
				&& sourceValue !== undefined
				&& (!sourcePath || sourcePath === from )
				&& (!view || view.onDataChanged( eventArgs ) !== false )) {

				// If the eventArgs is specified, then this came from a real field change event (not ApplyLinks trigger)
				// so only modify target elements which have a corresponding target path.
					if ( convert && ($.isFunction( convert ) || (convert = (source[ link.convert ] || window[ link.convert ])))) {
					if ( convert === source[ link.convert ] ) {
						sourceValue = convert.call( source );
					} else {
						sourceValue = convert.call( link, sourceValue, source, sourcePath, target );
					}
				}
				if ( !attr ) {
					// Merge in the default attribute bindings for this target element
					attr = settings.merge[ target.nodeName.toLowerCase() ];
					attr = attr? attr.to.toAttr : "text";
				}

				if ( css = attr.indexOf( "css-" ) === 0 && attr.substr( 4 ) ) {
					if ( $target.css( css ) !== sourceValue ) {
						$target.css( css, sourceValue );
					}
				} else {
					setter = fnSetters[ attr ];
					if ( setter && $target[setter]() !== sourceValue ) {
						$target[setter]( sourceValue );
					} else if ( $target.attr( attr ) !== sourceValue ) {
						$target.attr( attr, sourceValue );
					}
				}
			}
			if ( cancel ) {
				ev.stopImmediatePropagation();
			}
		},
		arrayChange: function( ev, eventArgs ) {
			var cancel, view = this.target,
				sourceValue = eventArgs ? eventArgs.action : settings.linkToAttr;  // linkToAttr used as a marker of trigger events

			if ((!this.cb || !(cancel = this.cb( ev, eventArgs ) === false ))
				&& sourceValue !== undefined ) {
				view.onDataChanged( eventArgs );
			}
			if ( cancel ) {
				ev.stopImmediatePropagation();
			}
		}
	};

function View( node, path, template, parentView, parentElViews, callback, data ) {
	var views, index, self = this;

	$.extend( self, {
		views: [],
		nodes: node ? [] : [ document.body ],
		tmpl: template || (parentView && parentView.tmpl),
		path: path,
		parent: parentView,
		prevNode: node
	});
	if ( parentView ) {
		self.callback = callback || parentView.callback;
		views = parentView.views;
		parentElViews.push( self );
		data = data || parentView.data;
		if ( $.isArray( parentView.data ))  {
			self.index = index = path;
			views.splice( index, 0, self );
			viewCount = views.length;
			data = data[ index ];
			while ( index++ < viewCount-1 ) {
				$.observable( views[ index ] ).setField( "index", index );
			}
		} else {
			if ( path ) {
				data = new Function( "$" ,"$view" ,"$data", "with($data){ return " + path  + ";}")( $, parentView, data );
			}
			self.index = views.length;
			views.push( self );
		}
	}
	self.data = data;
	setArrayChangeLink( self );
}

function createNestedViews( node, parent, callback, nextNode, depth, data, prevNode, index ) {
	function addFromLink( path, params ) {
		var attr, convert,
			fromObj = data || parent.data;

		path = path.split(/\:\s*/);
		if ( path[ 1 ] ) {
			attr = path[ 0 ];
			path[ 0 ] = path[ 1 ];
		}
		path = path[ 0 ];
		if ( params ) {
			convert = path;
			path = params;
		}
		var addedLink = {
			target: node,
			toAttr: attr,
			convert: convert
		};
		path = path.split(/\[|\]/);
		if ( path[ 1 ]) {
			fromObj = path[ 0 ] === "$view" ? currentView : window[ path[ 0 ]] || fromObj;
			path[ 0 ] = path[ 1 ];
		}
		addedLink[ this ] = path[ 0 ];
		link( fromObj, node, callback, addedLink );
	}

	var tokens, tmplName, parentElViews, get, from, view, existing,
		unlink = callback === false,
		currentView = parent,
		viewDepth = depth;

	callback = callback || parent.callback;
	index = index || 0;
	node = prevNode || node;

	if ( !prevNode && node.nodeType === 1 ) {
		if ( viewDepth++ === 0 ) {
			// Add top-level element nodes to view.nodes
			currentView.nodes.push( node );
		}
		eachParam( node.getAttribute( settings.getFromAttr ), "getFrom", addFromLink );
		eachParam( node.getAttribute( settings.linkFromAttr ), "from", addFromLink );
		node = node.firstChild;
	} else {
		node = node.nextSibling;
	}

	while ( node && node !== nextNode ) {
		if ( node.nodeType === 1 ) {
			createNestedViews( node, currentView, callback, nextNode, viewDepth, data );
		} else if ( node.nodeType === 8 && (tokens = /^(\/?)(?:(item)|(?:tmpl(?:\((.*)\))?(?:\s+([^\s]+))?))$/.exec( node.nodeValue ))) {
			if ( tokens[1]) {
				if ( tokens[2] ) {
					// An item close tag: <!--/item-->
					currentView.nextNode = node;
					currentView.onCreated( currentView );
					currentView = parent;

				} else {
					// A tmpl close tag: <!--/tmpl-->
					currentView.nextNode = node;
					currentView.onCreated( currentView );
					return node;
				}
			} else {
				parentElViews = parentElViews || jsViewsData( node.parentNode, "view", true );
				if ( tokens[2] ) {
					// An item open tag: <!--item-->
//					view = $.view( node );
//					if ( view && view.prevNode === node ) {
//						if ( view.index < currentView.data.length ) {
//							existing = view;
//							view.data = currentView.data[ view.index ];
//						} else {
//							debugger;
//						}
//					}
//					currentView = existing || new View( node, index++, undefined, currentView, parentElViews, callback );
					currentView = new View( node, index++, undefined, currentView, parentElViews, callback );
				} else {
					// A tmpl open tag: <!--tmpl(path) name-->

					view = $.view( node );
					if ( view && view.prevNode === node ) {
						if ( view.data === data ) {
							existing = view.nextNode;
						} else {
							view.data = data;
							view.render();
							return view.nextNode;
						}
					} else {
						view = new View( node, tokens[3], tokens[4], currentView, parentElViews, callback, data );
					}
					node = existing || createNestedViews( node, view, callback, nextNode, 0 );
				}
			}
		} else if ( viewDepth === 0 ) {
			// Add top-level non-element nodes to view.nodes
			currentView.nodes.push( node );
		}
			node = node.nextSibling;
	}
}

function link( from, to, callback, links, prevNode ) {
	from = wrapObject( from );
	if ( $.isFunction( to )) {
			callback = to;
			to = undefined;
	} else {
		to = wrapObject( to );
	}

	var method, link, addedLink, path, isFromHtml,
		targetElems = to,
		self = this,
		addedLinks = [],
		fromOb = from[0],
		i = arguments.length - 1;

	if ( !callback && i > 2 && $.isFunction( arguments[i] )) {
		callback = arguments[i];
		arguments[i] = undefined;
	}

	if ( !fromOb ) {
		return;
	}
	isFromHtml = fromOb.nodeType;
	links = (links ? ($.isArray( links ) ? links : [ links ]) : []);
	i = links.length;

	if ( prevNode ) {

		// DECLARATIVE DATA LINKING

		if ( isFromHtml ) {
			// Linking HTML to object or array
			from.each( function () {
				var currentLinkedData = jsViewsData( this, "to" );
				if ( currentLinkedData.length ) {
					currentLinkedData = currentLinkedData[0];
					if ( currentLinkedData === to[0]) {
						return;
					}
					removeLinkFromNode( this, { target: currentLinkedData, cb: callback, links: [{from: "input[" + settings.linkToAttr + "]" }]});
				}
				addLinkFromNode( this, { target: to[0], cb: callback, links: [{from: "input[" + settings.linkToAttr + "]" }]});
			});
			return;
		}
		// Linking object or array to HTML or to another object or array
		to.each( function() {
			createNestedViews( this, $.view( this ), callback, undefined, undefined, fromOb );
		});
		return;
	}
	if ( isFromHtml ) {

		// EXPLICIT DATA LINKING FROM HTML

		if ( i || callback ) {
			from.each( function () {
				addLinkFromNode( this, { target: to[0], cb: callback, links: links });
			});
		}
		return;
	}
	if ( i ) {

		// EXPLICIT DATA LINKING TO HTML

		while ( i-- ) {
			link = links[ i ];
			path = link.to;
			if ( path ) {
				targetElems = to.find( path ).add( $( this ).filter( path )); // Use future findFilter method in jQuery 1.7?
			}
			targetElems.each( function() {
				addedLink = $.extend( { source: fromOb, target: this, cb: callback }, link );
				addedLink.to = undefined;
				addedLinks.push( addedLink );
			});
		}
		method = onDataChange.objectChange;
		i = addedLinks.length;
		while ( i-- ) {
			addedLink = addedLinks[ i ];
			// If 'from' path points to a field of a descendant 'leaf object',
			// link not only from leaf object, but also from intermediate objects

			var innerOb = fromOb,
				get = addedLink.getFrom
				innerPath = (get||addedLink.from).split("."),
				innerLinks = [];

			while ( innerPath.length > 1 ) {
				innerOb = innerOb[ innerPath.shift() ];
				if ( innerOb ) {
					addLinkToNode( innerOb, $.extend({ inner: innerPath.join(".") }, addedLink ));
				}
			}
			addLinkToNode( fromOb, addedLink, get );
		}
		return;
	}
	if ( callback ) {
		// Case of providing callback but no links or no to
		addLinkToNode( fromOb, { source: fromOb, target: to, cb: callback });
	}
}

function addLinkToNode( source, context, get ) { // TODO reduce code size by shared code in the add/remove/set link functions
	var target = context.target,
		handler = function() {
			onDataChange.objectChange.apply( context, arguments );
		};

	// Store handlers for unlinking
	jsViewsData( target, "from", true ).push({ source: source, handler: handler, inner: context.inner });
	$( source ).bind( "objectChange", handler );
//	$( "#console" ).append( ++TEST_EVENTS.total + " + objectChange " + ++(TEST_EVENTS.objectChange) + "<br/>");
	if ( get ) {
		handler({ target: source });
	}
	return handler;
}

function addLinkFromNode( source, context ) {
	var target = context.target,
		handler = function() {
			onDataChange.change.apply( context, arguments );
		};

	// Store handlers for unlinking
	jsViewsData( source, "to", true ).push( target ); // Store for unlinking
	$( source ).bind( "change", handler );
//	$( "#console" ).append( ++TEST_EVENTS.total + " + change " + ++(TEST_EVENTS.change) + "<br/>");
	return handler;
}

function removeLinkFromNode( source, context ) {
	var links = jsViewsData( source, "to" ),
		l = links.length;
	while( l-- ) {
		if ( links[ l ] === context.target ) {
			$( source ).unbind( "change" );
//	$( "#console" ).append( --TEST_EVENTS.total + " - change " + --(TEST_EVENTS.change) + "<br/>");
			links.splice( l, 1 );
		}
	}
}

function setArrayChangeLink( view ) {
	var handler,
		data = view.data,
		onArrayChange = view._onArrayChange;

	if ( onArrayChange ) {
		if ( onArrayChange[ 1 ] === data ) {
			return;
		}
		$([ onArrayChange[ 1 ]]).unbind( "arrayChange", onArrayChange[ 0 ]);
//	$( "#console" ).append( --TEST_EVENTS.total + " - arrayChange " + --(TEST_EVENTS.arrayChange) + "<br/>");
	}

	if ( $.isArray( data )) {
		handler = function() {
			onDataChange.arrayChange.apply( { target: view, cb: view.callback }, arguments );
		};
		$([ data ]).bind( "arrayChange", handler );
		view._onArrayChange = [ handler, data ];
//	$( "#console" ).append( ++TEST_EVENTS.total + " + arrayChange " + ++(TEST_EVENTS.arrayChange) + "<br/>");
	}
}

function clean( i, el ) { // TODO optimize for perf
	var link, links, l, views, parentView, view;

	if ( jsViewsData( el, "to" ).length ) {
		$( el ).unbind( "change" );
//	$( "#console" ).append( --TEST_EVENTS.total + " - change " + --(TEST_EVENTS.change) + "<br/>");
	}

	links = jsViewsData( el, "from" ),
	l = links.length;

	while( l-- ) {
		link = links[ l ];
		$( link.source ).unbind( "objectChange", link.handler );
//	$( "#console" ).append( --TEST_EVENTS.total + " - objectChange " + --(TEST_EVENTS.objectChange) + "<br/>");
	}

	views = jsViewsData( el, "view" );
	if ( l = views.length ) {
		parentView = $.view( el );
		while( l-- ) {
			view = views[ l ];
			if ( view.parent === parentView ) {
				parentView.removeViews( view.index, 1 );  // NO - ONLY remove view if its top-level nodes are all
			}
		}
	}
}

function jsViewsData( el, type, create ) {
	var jqData = $.data( el, jsvData ) || create && $.data( el, jsvData, { "view": [], "from": [], "to": [] });
	return jqData ? jqData[ type ] : [];
}

function eachParam( paramString, context, cb ) {
	if ( paramString ) {
		var param, args, i, fn,
			parenDepth = 0,
			params = paramString //.replace( /[\r\t\n]/g, "" )
			.replace( /(\s*\,\s*)|(\(\s*)|(\s*\))/g, function( all, comma, leftParen, rightParen, index ) {
				if ( comma ) {
					return parenDepth ? all : "\r";
				}
				if ( leftParen ) {
					return parenDepth++ ? all : "\t";
				}
				return --parenDepth ? all : "\t";
			}).split( "\r" );

		i = params.length;
		while ( i-- ) {
			cb.apply( context, params[ i ].split( "\t" ));
		}
	}
}

function wrapObject( object ) {
	return object instanceof $ ? object : $.isArray( object ) ? $( [object] ) : $( object ); // Ensure that an array is wrapped as a single array object
}

function getField( object, path ) { // Alternative simpler implementation would use eval
	if ( object && path ) {
		var field,
			leaf = getLeafObject( object, path );
		object = leaf[0];
		if ( object ) {
			field = object[ leaf[1] ]
			return $.isFunction( field ) ? field.call( object ) : field;
		}
	}
	return object;
}

function getLeafObject( object, path ) {
	if ( object && path ) {
		var parts = path.split(".");

		path = parts.pop();
		while ( object && parts.length ) {
			object = object[ parts.shift() ];
		}
		return [ object, path ];rray
	}
	return [];
}

function inputAttrib( elem ) { 
	return elem.type === "checkbox" ? elem.checked : $( elem ).val;
}

// ============================

var oldCleanData = $.cleanData;

$.extend({
	cleanData: function( elems ) {
		$( elems ).each( clean );  // TODO - look at perf optimization on this
		oldCleanData( elems );
	},

	link: function( from, to, links, callback ) {
		// Supported signatures:
		//    $.link( from, to, links ); // Explicit data linking
		//    $.link( from[, to, links], callback ); // Callback with explicit data linking
		if ( $.isFunction( to )) {
			callback = to;
			to = undefined;
		} else {
			to = wrapObject( to );
		}
		if ( to && to[0].nodeType ) {
			to.each( function() {
				link( from, this, callback, links );
			//	$.view( this ).linkFrom( from, links, callback ); //TODO add links
			});
		}
		else {
			wrapObject( from ).each( function() {
				link( this, to, callback, links );
			//	$.view( this ).linkTo( to, links, callback );//TODO add links
			});
		}
	},

	view: function( node, options ) {
		// $.view() returns top node
		// $.view( node ) returns view that contains node
		// In addition, can provide option map to each of the above. e.g. $.view( option ) returns top view after setting options on it.

		var ret, view, parentElViews, i, parentNode,
			topNode = document.body;

		node = node || topNode;
		if ( !node.nodeType && !options && $.isPlainObject( node )) {
			// $.view( options ) - to set options on top view
			options = node;
			node = topNode;
		}
		if ( topView && !topView.views.length ) {
			ret = topView; // Perf optimization for common case
		} else {
			// Step up through parents to find an element which is a views container, or if none found, create the top-level view for the page
			while( !(parentElViews = jsViewsData( parentNode = node.parentNode || topNode, "view" )).length ) {
				if ( !parentNode || node === topNode ) {
					jsViewsData( topNode.parentNode, "view", true ).push( ret = topView = new View());
					break;
				}
				node = parentNode;
			}
			if ( !ret && node === topNode ) {
				ret = parentElViews[0];
			}
			while ( !ret && node ) {
				if  ( node.nodeType === 8 && /^item|tmpl(\([\w\.]*\))?(\s+[^\s]+)?$/.test( node.nodeValue )) {
					i = parentElViews.length;
					while ( i-- ) {
						view = parentElViews[ i ];
						if ( view.prevNode === node ) {
							ret = view;
							break;
						}
					}
				}
				node = node.previousSibling;
			}
			// Not within any of the views in the current parentElViews collection, so move up through parent nodes to find next parentElViews collection
			ret = ret || $.view( parentNode );
		}
		return options ? $.extend( ret, options ) : ret;
	},

	linkSettings: {
		linkToAttr: "data-to",
		linkFromAttr: "data-from",
		getFromAttr: "data-getfrom",
		merge: {
			input: {
				from: {
					fromAttr: inputAttrib
				},
				to: {
					toAttr: "value"
				}
			}
		},
		view: {
//			link: function( data, prevNode, nextNode, callback ) {
//				// Declarative Linking
//				// Supported signatures:
//				//    link( data[, prevNode, nextNode] );
//				//    link( data[, prevNode, nextNode], callback );
//				var $this = $( this.nodes );
//				link( data, $this, callback, undefined, prevNode||true, nextNode );
//				link( $this, data, callback, undefined, true );
//				return this;
//			},
//			linkFrom: function( sourceData, links, callback ) {
//				// Supported signatures:
//				//    linkFrom( sourceData, links );						Explicit
//				//    linkFrom( sourceData, callback );						Explicit
//				//    linkFrom( sourceData, links, callback );				Explicit
//				link( sourceData, $( this.nodes ), callback, links );
//				return this;
//			},
//			linkTo: function( targetData, links, callback ) {
//				// Supported signatures:
//				//    linkTo( targetData, links );
//				//    linkTo( callback );
//				//    linkTo( targetData, callback );
//				//    linkTo( targetData, links, callback );
//				link( $( this.nodes ), targetData, callback, links );
//				return this;
//			},
//			unlink: function() {
//				return linkUnlinkView( this, arguments );
//			},
			onDataChanged: function( eventArgs ) {
				if ( eventArgs ) {
					// This is an observable action (not a trigger/handler call from pushValues, or similar, for which eventArgs will be null)
					var self = this,
						action =  eventArgs.action,
						newIndex = eventArgs.newIndex,
						oldIndex = eventArgs.oldIndex,
						newItems = eventArgs.newItems,
						oldItems = eventArgs.oldItems;
					switch ( action ) {
						case "add":
							self.addViews( newIndex, newItems );
						break;
						case "remove":
							self.removeViews( oldIndex, oldItems.length );
						break;
						case "move":
							self.refresh(); // Could optimize this
						break;
						case "reset":
							self.refresh();
						// Othercases: (e.g.undefined, for setField on observable object) etc. do nothing
					}
				}
				return true;
			},
			onCreated: function( view ) {
				if ( this.parent ) {
					this.parent.onCreated( view );
				}
			},
			render: function() {
				var arrayChange, html = $.render( this.tmpl, this.data ),
					prevNode = this.prevNode,
					nextNode = this.nextNode,
					parentNode = prevNode.parentNode;

				$( this.nodes ).remove();
				this.removeViews( 0, this.views.length );
				this.nodes = [];
				$( prevNode ).after( html );
				parentNode.removeChild( prevNode.nextSibling );
				parentNode.removeChild( nextNode.previousSibling );
				createNestedViews( parentNode, this, undefined, nextNode, 0, undefined, prevNode, 0); //this.index
				setArrayChangeLink( this );
				return this;
			},
			addViews: function( index, dataItems, tmpl ) {
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
					createNestedViews( parentNode, this, undefined, nextNode, 0, undefined, prevNode, index );
				}
				return this;
			},
			removeViews: function( index, itemsCount, keepHtml ) {
				if ( itemsCount ) {
					var parentElViews, parentViewsIndex,
						views = this.views,
						current = index + itemsCount;

					while ( current-- > index ) {
						var view = views[ current ],
							i = view.views.length,
							node = view.prevNode,
							nextNode = view.nextNode,
							nodes = [ node ];

						if ( i ) {
							view.removeViews( 0, i, keepHtml );
						}

						// Remove this view from the parentElViews collection
						parentElViews = parentElViews || jsViewsData( view.nextNode.parentNode, "view" );
						i = parentElViews.length;
						while ( i-- && parentViewsIndex === undefined ) {
							if ( parentElViews[ i ] === view ) {
								parentViewsIndex = i;
							}
						}
						parentElViews.splice( parentViewsIndex, 1 );

						if ( !keepHtml ) {
							while ( node !== nextNode ) {
								node = node.nextSibling
								nodes.push( node );
							}
							$( nodes ).remove();
						}
						view.data = undefined;
						setArrayChangeLink( view );
					}
					views.splice( index, itemsCount );
					viewCount = views.length;

					while ( index < viewCount ) {
						$.observable( views[ index ] ).setField( "index", index++ );
					}
				}
				return this;
			},
			each: function( callback ) {
				callback( this );
				var l = this.views.length;
				while ( l-- ) {
					this.views[ l ].each( callback );
				}
				return this;
			},
			view: function( options ) {
				// Sets options on this view.
				return $.extend( view, options );
			},
			content: function( select ) {
				return select ? $( select, this.nodes ) : $( this.nodes );
			}
		}
	}
});

$.fn.extend({
	view: function( options ) {
		return $.view( this[0], options );
	},
	link: function( data, callback ) {
		// Declarative Linking
		// Supported signatures:
		//    link( data );
		//    link( data, callback );
		if ( data ) {
			link( data, this, callback, undefined, true );
			link( this, data, callback, undefined, true );
		}
		return this;
	},
//	unlink: function( data ) {  // TODO provide unlink methods
//		if ( data ) {
//			link( data, this, false, undefined, true );
//			link( this, data, false, undefined, true );
//		} else {
//			this.each( clean );
//		}
//		return this;

//		// TODO - clean up the unlinking code, and consider unlinkFrom and unlinkTo
//	},
	linkFrom: function( sourceData, links, callback ) {
		// Supported signatures:
		//    linkFrom( sourceData, links );
		//    linkFrom( sourceData, callback );
		//    linkFrom( sourceData, links, callback );
		link( sourceData, this, callback, links );
		return this;
	},
	linkTo: function( targetData, links, callback ) {
		// Supported signatures:
		//    linkTo( targetData, links );
		//    linkTo( targetData, callback );
		//    linkTo( targetData, links, callback );
		link( this, targetData, callback, links );
		return this;
	}
});

settings = $.linkSettings;
View.prototype = settings.view;
decl = settings.decl;

})( jQuery );
