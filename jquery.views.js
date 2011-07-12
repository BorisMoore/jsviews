/*!
 * jQuery Views Plugin v1.0pre
 * Interactive data-driven views, based on integration between jQuery Templates and jQuery Data Link.
 * Requires jquery.render.js (optimized version of jQuery Templates, for rendering to string).
 * See JsRender at http://github.com/BorisMoore/jsrender
 * and JsViews at http://github.com/BorisMoore/jsviews
 */
/// <reference path="http://ajax.aspnetcdn.com/ajax/jQuery/jquery-1.5-vsdoc.js" />
/// <reference path="../jquery-1.5.2.js" />
(function( $, undefined ) {
// var TEST_EVENTS = { total:0, change:0, arrayChange:0, propertyChange:0 };
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
				beforeChange = this.options.beforeChange,
				l = links.length;

			while ( l-- && !cancel ) {
				link = links[ l ];
				if ( !link.from || (link.from && $( source ).is( link.from ))) {
					fromAttr = link.fromAttr;
					if ( !fromAttr ) {
						// Merge in the default attribute bindings for this source element
						fromAttr = settings.merge[ source.nodeName.toLowerCase() ];
						fromAttr = fromAttr ? fromAttr.from.fromAttr : "text";
					}
					setter = fnSetters[ fromAttr ];
					sourceValue = $.isFunction( fromAttr ) ? fromAttr( source ) : setter ? $source[setter]() : $source.attr( fromAttr );
					if ((!beforeChange || !(cancel = beforeChange( ev ) === false )) && sourceValue !== undefined ) {
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
						if ( cnvt ) {
							if ( target[ cnvt ]) {
								// TODO Use getResource( convert ); - using View.defs, or similar, with fallbacks or bubbling...
								sourceValue = target[ cnvt].call( target, sourceValue, source, toPath, target, cnvtParams );
							} else if ( cnvt = window[ cnvt ] ) {
								// TODO Use getResource( convert ); - using View.defs, or similar, with fallbacks or bubbling...
								sourceValue = cnvt( sourceValue, source, toPath, target, cnvtParams );
							}
						}
						if ( target ) {
							$.observable( target ).setProperty( toPath, sourceValue );
						}
						if ( this.options.afterChange ) {
							this.options.afterChange( ev );
						}
					}
					if ( cancel ) {
						ev.stopImmediatePropagation();
					}
				}
			}
		},
		propertyChange: function( ev, eventArgs ) {
			var setter, cancel,
				link = this,
				target = link.target,
				$target = $( target ),
				source = ev.target,
				from = link.inner || link.from || link.getFrom,
				attr = link.toAttr,
				sourceValue = eventArgs ? eventArgs.value : getProperty( source, from ),
				sourcePath = eventArgs && eventArgs.path,
				options = link.options,
				beforeChange = options.beforeChange,
				view = $.view( target ); //TODO check whether we need to use the view here. If so pass it to the convert function too.

			if ((!beforeChange || !(eventArgs && (cancel = beforeChange.call( this, ev, eventArgs ) === false )))
				&& sourceValue !== undefined
				&& (!sourcePath || sourcePath === from )
				&& (!view || view.onDataChanged( eventArgs ) !== false )) {

				var changed,
					convert = link.convert // TODO support for named converters

				// If the eventArgs is specified, then this came from a real property change event (not ApplyLinks trigger)
				// so only modify target elements which have a corresponding target path.
				if ( convert ) {
					if ( $.isFunction( convert )) {
						sourceValue = convert.call( link, sourceValue, source, sourcePath, target );
					} else if ( convert = ( getLeafObject( source, link.convert ) || getLeafObject( window, link.convert ))) {
						sourceValue = convert[0][convert[1]].call( convert[0], sourceValue );
					}
				}
				if ( !attr ) {
					// Merge in the default attribute bindings for this target element
					attr = settings.merge[ target.nodeName.toLowerCase() ];
					attr = attr ? attr.to.toAttr : "text";
				}

				if ( css = attr.indexOf( "css-" ) === 0 && attr.substr( 4 ) ) {
					if ( changed = $target.css( css ) !== sourceValue ) {
						$target.css( css, sourceValue );
					}
				} else {
					setter = fnSetters[ attr ];
					if ( setter ) {
						if ( changed = $target[setter]() !== sourceValue ) {
							$target[setter]( sourceValue );
						}
					} else if ( changed = $target.attr( attr ) !== sourceValue ) {
						$target.attr( attr, sourceValue );
					}
				}
				if ( eventArgs && changed && options.afterChange ) {
					options.afterChange.call( this, ev, eventArgs );
				}
			}
		},
		arrayChange: function( ev, eventArgs ) {
			var cancel, view = this.target,
				beforeChange = this.options.beforeChange,
				sourceValue = eventArgs ? eventArgs.change : settings.linkToAttr;  // linkToAttr used as a marker of trigger events

			if ((!beforeChange || !(cancel = beforeChange( ev, eventArgs ) === false ))
				&& sourceValue !== undefined ) {
				view.onDataChanged( eventArgs );
				if ( this.options.afterChange ) {
					this.options.afterChange( ev, eventArgs );
				}
			}
		}
	};

function View( node, path, template, parentView, parentElViews, options, data ) {
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
		self.options = options || parentView.options;
		views = parentView.views;
		parentElViews.push( self );
		data = data || parentView.data;
		if ( $.isArray( parentView.data ))  {
			self.index = index = path;
			views.splice( index, 0, self );
			viewCount = views.length;
			data = data[ index ];
			while ( index++ < viewCount-1 ) {
				$.observable( views[ index ] ).setProperty( "index", index );
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

function createNestedViews( node, parent, options, nextNode, depth, data, prevNode, index ) {
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
		link( fromObj, node, addedLink, false, options );
	}

	var tokens, tmplName, parentElViews, get, from, view, existing,
		currentView = parent,
		viewDepth = depth;

	options = options || parent.options;
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
			createNestedViews( node, currentView, options, nextNode, viewDepth, data );
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
					currentView = new View( node, index++, undefined, currentView, parentElViews, options );
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
						view = new View( node, tokens[3], tokens[4], currentView, parentElViews, options, data );
					}
					node = existing || createNestedViews( node, view, options, nextNode, 0 );
				}
			}
		} else if ( viewDepth === 0 ) {
			// Add top-level non-element nodes to view.nodes
			currentView.nodes.push( node );
		}
		node = node.nextSibling;
	}
}

function link( from, to, links, prevNode, options ) {
	options = options || {};
	from = wrapObject( from );
	if ( $.isFunction( to )) {
		options.beforeChange = to;
		to = undefined;
	} else {
		to = wrapObject( to );
	}

	var method, link, addedLink, path, isFromHtml,
		targetElems = to,
		self = this,
		addedLinks = [],
		beforeChange = options.beforeChange,
		fromOb = from[0],
		i = arguments.length - 1;

	if ( !beforeChange && options && $.isFunction( options )) {
		beforeChange = options.beforeChange = options;
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
					removeLinkFromNode( this, { target: currentLinkedData, options: options, links: [{from: "input[" + settings.linkToAttr + "]" }]});
				}
				addLinkFromNode( this, { target: to[0], options: options, links: [{from: "input[" + settings.linkToAttr + "]" }]});
			});
			return;
		}
		// Linking object or array to HTML or to another object or array
		to.each( function() {
			createNestedViews( this, $.view( this ), options, undefined, undefined, fromOb );
		});
		return;
	}
	if ( isFromHtml ) {

		// EXPLICIT DATA LINKING FROM HTML

		if ( i || options.beforeChange ) {
			from.each( function () {
				addLinkFromNode( this, { target: to[0], options: options, links: links });
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
				addedLink = $.extend( { source: fromOb, target: this, options: options }, link );
				addedLink.to = undefined;
				addedLinks.push( addedLink );
			});
		}
		i = addedLinks.length;
		while ( i-- ) {
			addedLink = addedLinks[ i ];
			// If 'from' path points to a property of a descendant 'leaf object',
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
	if ( options.beforeChange ) {
		// Case of providing beforeChange but no links or no to
		addLinkToNode( fromOb, { source: fromOb, target: to, options: options });
	}
}

function addLinkToNode( source, context, get ) { // TODO reduce code size by shared code in the add/remove/set link functions
	var target = context.target,
		handler = function() {
			onDataChange.propertyChange.apply( context, arguments );
		};

	// Store handlers for unlinking
	jsViewsData( target, "from", true ).push({ source: source, handler: handler, inner: context.inner });
	$( source ).bind( "propertyChange", handler );
//	$( "#console" ).append( ++TEST_EVENTS.total + " + propertyChange " + ++(TEST_EVENTS.propertyChange) + "<br/>");
	if ( get ) {
		handler({ target: source });
	}
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
			onDataChange.arrayChange.apply( { target: view, options: view.options }, arguments );
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
		$( link.source ).unbind( "propertyChange", link.handler );
//	$( "#console" ).append( --TEST_EVENTS.total + " - propertyChange " + --(TEST_EVENTS.propertyChange) + "<br/>");
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

function getProperty( object, path ) { // Alternative simpler implementation would use eval
	if ( object && path ) {
		var property,
			leaf = getLeafObject( object, path );
		object = leaf && leaf[0];
		if ( object ) {
			property = object[ leaf[1] ]
			return $.isFunction( property ) ? property.call( object ) : property;
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
	}
	return object && object[ path ] && [ object, path ];
}

function inputAttrib( elem ) {
	return elem.type === "checkbox" ? elem.checked : $( elem ).val();
}

// ============================

var oldCleanData = $.cleanData;

$.extend({
	cleanData: function( elems ) {
		$( elems ).each( clean );  // TODO - look at perf optimization on this
		oldCleanData( elems );
	},

	link: function( from, to, links, options ) {
		// Supported signatures:
		//    $.link( from, to, links ); // Explicit data linking
		//    $.link( from[, to, links], beforeChange ); // BeforeChange callback with explicit data linking
		//    $.link( from[, to, links], options ); // options (may include beforeChange callback) with explicit data linking
		options = options || {};
		if ( $.isFunction( to )) {
			options.beforeChange = to;
			to = undefined;
		} else {
			to = wrapObject( to );
		}
		if ( to && to[0].nodeType ) {
			to.each( function() {
				link( from, this, links, false, options );
			});
		}
		else {
			wrapObject( from ).each( function() {
				link( this, to, links, false, options );
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
				if  ( node.nodeType === 8 ) {
					if (  /^\/item|^\/tmpl$/.test( node.nodeValue )) {
						i = parentElViews.length;
						while ( i-- ) {
							view = parentElViews[ i ];
							if ( view.nextNode === node ) {
								node = view.prevNode;
								break;
							}
						}
					} else if ( /^item|^tmpl(\([\w\.]*\))?(\s+[^\s]+)?$/.test( node.nodeValue )) {
						i = parentElViews.length;
						while ( i-- ) {
							view = parentElViews[ i ];
							if ( view.prevNode === node ) {
								ret = view;
								break;
							}
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
			onDataChanged: function( eventArgs ) {
				if ( eventArgs ) {
					// This is an observable action (not a trigger/handler call from pushValues, or similar, for which eventArgs will be null)
					var self = this,
						action =  eventArgs.change,
						index = eventArgs.index,
						oldIndex = eventArgs.oldIndex,
						items = eventArgs.items;
					switch ( action ) {
						case "insert":
							self.addViews( index, items );
						break;
						case "remove":
							self.removeViews( index, items.length );
						break;
						case "move":
							self.render(); // Could optimize this
						break;
						case "refresh":
							self.render();
						// Othercases: (e.g.undefined, for setProperty on observable object) etc. do nothing
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
						$.observable( views[ index ] ).setProperty( "index", index++ );
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
	link: function( data, options ) {
		// Declarative Linking
		// Supported signatures:
		//    link( data );
		//    link( data, options );
		// If options is a function, cb - shorthand for { beforeChange: cb }
		// if options is a string, corresponds to $("#container").html( $.render( options, data )).link( data );
		if ( data ) {
			var tmpl = $.template( options );
			if ( tmpl ) {
				return this.empty().append( $.render(tmpl, data )).link( data );
				// Using append, rather than html, as workaround for issues in IE compat mode. (Using innerHTML leads to initial comments being stripped)
			}
			link( data, this, undefined, true, options );
			link( this, data, undefined, true, options );
		}
		return this;
	},
	linkFrom: function( sourceData, links, options ) {
		// Supported signatures:
		//    linkFrom( sourceData, links );
		//    linkFrom( sourceData, options );
		//    linkFrom( sourceData, links, options );
		// If options is a function, cb - shorthand for { beforeChange: cb }
		link( sourceData, this, links, false, options );
		return this;
	},
	linkTo: function( targetData, links, options ) {
		// Supported signatures:
		//    linkTo( targetData, links );
		//    linkTo( targetData, options );
		//    linkTo( targetData, links, options );
		// If options is a function, cb - shorthand for { beforeChange: cb }
		link( this, targetData, links, false, options );
		return this;
	}
});

settings = $.linkSettings;
View.prototype = settings.view;
decl = settings.decl;

})( jQuery );
