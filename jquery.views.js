/*!
 * JsViews v1.0pre
 * jQuery plugin providing interactive data-driven views, based on integration between jQuery Templates and jQuery Data Link.
 * Requires jquery.render.js (optimized version of jQuery Templates, for rendering to string)
 *    See JsRender at http://github.com/BorisMoore/jsrender
 * and jquery.observable.js.
 *    See JsViews at http://github.com/BorisMoore/jsviews
 */
(function( $, undefined ) {

//===============
// event handlers
//===============

// var TEST_EVENTS = { total:0, change:0, arrayChange:0, propertyChange:0 };
var FALSE = false, TRUE = true,
	topView, settings, decl,
	fnSetters = {
		value: "val",
		html: "html",
		text: "text"
	},

	jsvData = "_jsvData";

function elemChangeHandler( ev ) {
	var setter, cancel, fromAttr, toPath, linkToInfo, sourceValue, link, cnvt, view, reg, target,
		data = this.target,
		source = ev.target,
		$source = $( source ),
		links = this.links,
		beforeChange = this.options.beforeChange,
		l = links.length;

	while ( l-- && !cancel ) {
		link = links[ l ];
		if ( !link.filter || (link.filter && $source.is( link.filter ))) {
			fromAttr = link.fromAttr;
			if ( !fromAttr ) {
				// Merge in the default attribute bindings for this source element
				fromAttr = settings.merge[ source.nodeName.toLowerCase() ];
				fromAttr = fromAttr ? fromAttr.from.fromAttr : "text";
			}
			setter = fnSetters[ fromAttr ];
			sourceValue = $.isFunction( fromAttr ) ? fromAttr( source ) : setter ? $source[setter]() : $source.attr( fromAttr );
			if ((!beforeChange || !(cancel = beforeChange( ev ) === FALSE )) && sourceValue !== undefined ) {
				// Find linkToInfo using link.to, or if not specified, use declarative specification
				// provided by decl.applyLinkToInfo, applied to source element
				linkToInfo = link.to || $.trim( source.getAttribute( settings.linkToAttr ));
				// linkTo does not support multiple targets - use imperative linking for that scenario...
				if ( linkToInfo ) {
					cnvt = link.convert;
					linkToInfo = splitParams( linkToInfo );
					target = linkToInfo[ 0 ].slice( 0, -1 );
					view = $.view( source );
					data = view && view.data || data;
					// data is the current view data, or the top-level target of linkTo.
//TODO make sure we are not missing intermediate levels.
					// get the target object
					target = target
						? target = Function( "$", "$data", "$view", "with($data){return " + target  + ";}")( $, data, view )
						: data;
					toPath = $.trim( linkToInfo[ 1 ].slice( 0, -1 ));
					cnvt = linkToInfo[ 3 ];
					if ( cnvt ) {
						try {
							// get the converted value
							sourceValue = Function( "$", "$data", "$view", "$value",
								"with($.linkSettings.converters){return " + cnvt + ";}")
									.call({ source: source, target: target, convert: cnvt,
										path: toPath, options: this.options },
										$, data, view, sourceValue );
						} catch(e) {
							// in debug mode, throw 'bad syntax error';
							throw e.message;
						}
					}
					if ( target ) {
						$.observable( target ).setProperty( toPath, sourceValue );
						if ( this.options.afterChange ) {
							this.options.afterChange( ev );
						}
					}
					ev.stopPropagation(); // Stop bubbling
				}
			}
			if ( cancel ) {
				ev.stopImmediatePropagation();
			}
		}
	}
}

function propertyChangeHandler( ev, eventArgs ) {
	var pathInfo, setter, cancel, changed, attr, cnvt,
		link = this,
		target = link.target,
		$target = $( target ),
		source = ev.target,
		sourcePath = eventArgs && eventArgs.path || ev.path,
		options = link.options || {},
		beforeChange = options.beforeChange,
		view = $.view( target )
		pathInfos = getLinkFromDataInfo( target, source ).paths[ sourcePath ],
		l = pathInfos && pathInfos.length;

	while ( l-- ) {
		pathInfo = pathInfos[ l ];
		if ((!beforeChange || !(eventArgs && (cancel = beforeChange.call( this, ev, eventArgs ) === FALSE )))
		&& (!view || view.onDataChanged( eventArgs ) !== FALSE )) {

			attr = pathInfo.attr,
			cnvt = pathInfo.convert;

			// If the eventArgs is specified, then this came from a real property change event (not ApplyLinks trigger)
			// so only modify target elements which have a corresponding target path.
			if ( cnvt ) {
				try {
					// get the converted value
					sourceValue = Function( "$", "$data", "$view",
						"with($.linkSettings.converters){with($data){return " + cnvt + ";}}")
							.call( link, $, link.source, view );
				} catch(e) {
					// in debug mode, throw 'bad syntax error';
					throw e.message;
				}
				if ( $.isFunction( sourceValue )) {
					sourceValue = sourceValue.call( source );
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
				options.afterChange.call( link, ev, eventArgs );
			}
		}
	}
}

function arrayChangeHandler( ev, eventArgs ) {
	var cancel,
		view = this.target,
		options = this.options || {},
		beforeChange = options.beforeChange,
		sourceValue = eventArgs ? eventArgs.change : settings.linkToAttr;  // linkToAttr used as a marker of trigger events

	if ((!beforeChange || !(cancel = beforeChange( ev, eventArgs ) === FALSE ))
		&& sourceValue !== undefined ) {
		view.onDataChanged( eventArgs );
		if ( options.afterChange ) {
			options.afterChange( ev, eventArgs );
		}
	}
}

function setArrayChangeLink( view, options ) {
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
			arrayChangeHandler.apply( { target: view, options: options }, arguments );
		};
		$([ data ]).bind( "arrayChange", handler );
		view._onArrayChange = [ handler, data ];
//	$( "#console" ).append( ++TEST_EVENTS.total + " + arrayChange " + ++(TEST_EVENTS.arrayChange) + "<br/>");
	}
}

//===============
// view hierarchy
//===============

function View( options, node, path, template, parentView, parentElViews, data ) {
	var views, index,
		self = this;

	$.extend( self, {
		views: [],
		nodes: node ? [] : [ document.body ],
		tmpl: template || (parentView && parentView.tmpl),
		path: path,
		parent: parentView,
		prevNode: node
	});
	if ( parentView ) {
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
				data = Function( "$", "$data", "$view", "with($data){ return " + path  + ";}")( $, data, parentView );
			}
			self.index = views.length;
			views.push( self );
		}
	}
	self.data = data;
	setArrayChangeLink( self, options );
}

function createNestedViews( node, parent, options, nextNode, depth, data, prevNode, index ) {
	var tokens, tmplName, parentElViews, get, from, view, existing, parentNode,
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
		var linkFromInfo = node.getAttribute( settings.linkFromAttr ),
			getFromInfo = node.getAttribute( settings.getFromAttr );

		if ( linkFromInfo || getFromInfo ) {
			addLinksFromData( data || parent.data, node, getFromInfo, linkFromInfo, options, TRUE );
		}
		node = node.firstChild;
	} else {
		node = node.nextSibling;
	}

	while ( node && node !== nextNode ) {
		if ( node.nodeType === 1 ) {
			createNestedViews( node, currentView, options, nextNode, viewDepth, data );
		} else if ( node.nodeType === 8 && (tokens = /^(\/?)(?:(item)|(?:tmpl(?:\((.*)\))?(?:\s+([^\s]+))?))$/.exec( node.nodeValue ))) {
			parentNode = node.parentNode;
			if ( tokens[1]) {
				if ( parentNode !== currentView.prevNode.parentNode ) {
					// special case for LIs in IE compat mode. Item annotation is content of preceding LI.
					if ( tokens[2] ) {
						// move following <!--item--> or <!--/tmpl--> to after LI element
						parentNode.parentNode.insertBefore( node.nextSibling, parentNode.nextSibling );
					}
					// move <!--/item--> or <!--/tmpl--> to after LI element
					parentNode.parentNode.insertBefore( node, parentNode.nextSibling );
					return;
				}
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
				parentElViews = parentElViews || jsViewsData( parentNode, "view", TRUE );
				if ( tokens[2] ) {
					// An item open tag: <!--item-->
					currentView = new View( options, node, index++, undefined, currentView, parentElViews );
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
						view = new View( options, node, tokens[3], tokens[4], currentView, parentElViews, data );
					}
					// Jump to the nextNode of the tmpl view
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

//===============
// data linking
//===============

function link( from, to, links, options ) {
	options = $.isFunction( options )
		? { beforeChange: options }
		: options || {};

	if ( links ) {

		links = $.isArray( links ) ? links : [ links ];

		var link, filter, targetElems,
			toLinks = [],
			fromLinks = []
			i = links.length;

		while ( i-- ) {
			link = links[ i ];
			if ( link.to ) {
				toLinks.push({ to: link.to, filter: link.filter });
			}
			if ( link.from || link.getFrom ) {
				fromLinks.push( link );
			}
		}
		i = fromLinks.length;
		while ( i-- ) {
			link = fromLinks[ i ];
			filter = link.filter;
			targetElems = filter ? from.find( filter ).add( $( this ).filter( filter )) : from; // Use future findFilter method in jQuery 1.7?

			targetElems.each( function() {
				// If 'from' path points to a property of a descendant 'leaf object',
				// link not only from leaf object, but also from intermediate objects
				addLinksFromData( to, this, link.getFrom, link.from, options );
			});
		}
	}
	if ( !links || toLinks.length ) {
		from.each( function () {
			if ( !links ) {
				// DECLARATIVE DATA LINKING

				// Linking HTML to object or array
				var linksToData = jsViewsData( this, "to" );
				i = linksToData.length;
				while ( i-- ) {
					link = linksToData[ i ];
					if ( link.links === declLinkTo ) {
						if ( link.target === to ) {
							// Already declaratively linked to the same object
							return;
						}
						// Already linked to a different object, so unlink from previous object
						removeLinksToData( this, link.target, declLinkTo );
						linksToData.splice( i, 1 );
					}
				}
				toLinks = declLinkTo; // For declarative case

				// Linking object or array to HTML
				from.each( function() {
					createNestedViews( this, $.view( this, options ), options, undefined, undefined, to );
				});
			}
			addLinksToData( this, to, toLinks, options );
		});
	}
	return from;
}

//function unlink( from, to, links ) { // TODO
//}

function addLinksFromData( source, target, getFrom, linkFrom, options ) {
	var param, i, l, lastChar, attr, cnvt, openParenIndex, get, object, cnvtParams, view,
		triggers = [];

	linkFrom = splitParams( (linkFrom ? linkFrom + "," : "") + (getFrom ? "|," + getFrom + ",": ""), TRUE );
	while ( param = linkFrom.shift() ) {
		l = param.length;
		lastChar = param.charAt( l - 1 );
		param = param.slice( 0, -1 );
		switch ( lastChar ) {
		case ':':
			attr = $.trim( param );
			break;
		case '[':
			cnvt = $.trim( param );
			break;
		case ')':
			cnvt = cnvt || param
			break;
		case ']':
			triggers = [[ cnvt, param ]];
			cnvt = cnvt ? (cnvt + "." + param) : param;
			break;
		case '\r':
			openParenIndex = ++param; // Convert to integer and increment
			break;
		case ',':
			if ( param === '|') {
				get = TRUE;
				continue;
			}
			// Apply binding
			if ( openParenIndex ) {
				cnvtParams = cnvt.slice( openParenIndex );
				cnvtParams = splitParams( cnvtParams );
				for ( i = 0, l = cnvtParams.length; i < l; i++ ) {
					param = $.trim(cnvtParams[ i ]);
					lastChar = param.charAt( param.length - 1 );
					param = param.slice( 0, -1 );
					if ( lastChar === '[') {
						cnvtParams[ i ] = object = param;
					} else if ( lastChar === ']') {
						triggers.push([ object, param ]);
						cnvtParams[ i ] = object ? ("." + param) : param;
						object = "";
					}
				}
				cnvt = cnvt.slice( 0, openParenIndex ) + cnvtParams.join("") + ")";
			}

			view = $.view( target );
			l = triggers.length;
			while ( l-- ) {
				var trigger = triggers[ l ],
					path = trigger[ 1 ],
					fromOb = trigger[ 0 ] ? Function( "$", "$data", "$view", "with($data){return " + trigger[ 0 ]  + ";}")( $, source, view ) : source,
					link = { source: source, target: target, options: options },
					innerPath = path.split("."),
					innerOb = fromOb;

				// If 'from' path points to a property of a descendant 'leaf object',
				// link not only from leaf object, but also from intermediate objects
				while ( innerPath.length > 1 ) {
					innerOb = innerOb[ innerPath.shift() ];
					if ( innerOb ) {
						addLinkFromData( innerOb, link, innerPath.join( "." ), cnvt, attr );
					}
				}
				// The last trigger of get bindings will be called on adding the link (to get/initialize the value)
				addLinkFromData( fromOb, link, path, cnvt, attr, !l && get );
			}
			openParenIndex = 0;
			triggers = [];
			attr = cnvt = "";
		}
	}
}

function addLinkFromData( source, link, path, convert, attr, get ) {
	var paths, pathInfos,
		target = link.target,
		linkInfo = getLinkFromDataInfo( target, source ),
		pathInfo = { attr: attr, convert: convert };

	if ( linkInfo ) {
		// Set path info for this path
		pathInfos = linkInfo.paths[ path ] = linkInfo.paths[ path ] || [];
		pathInfos.push( pathInfo );
		// get handler
		handler = linkInfo.handler;
	} else {
		handler = function() {
			propertyChangeHandler.apply( link, arguments );
		};

		// Store handler for unlinking
		if ( target ) {
			paths = {};
			paths[ path ] = [ pathInfo ];
			jsViewsData( target, "from", TRUE ).push({ source: source, paths: paths, handler: handler });
		}
		$( source ).bind( "propertyChange", handler );
	}
//	$( "#console" ).append( ++TEST_EVENTS.total + " + propertyChange " + ++(TEST_EVENTS.propertyChange) + "<br/>");
	if ( get ) {
		handler({ target: source, path: path });
	}
}

function addLinksToData( source, target, links, options ) {
	var handler = function() {
			elemChangeHandler.apply( { target: target, links: links, options: options }, arguments );
		};

	// Store handler for unlinking
	jsViewsData( source, "to", TRUE ).push({ target: target, links: links, handler: handler });
	$( source ).bind( "change", handler );
}

function removeLinksToData( source, target, links ) {
	var prevLinkInfo,
		prevLinkInfos = jsViewsData( source, "to" ),
		l = prevLinkInfos.length;
	while( l-- ) {
		prevLinkInfo = prevLinkInfos[ l ];
		if ( prevLinkInfo.target === target && prevLinkInfo.links === links ) {
			$( source ).unbind( "change", prevLinkInfo.handler);
//	$( "#console" ).append( --TEST_EVENTS.total + " - change " + --(TEST_EVENTS.change) + "<br/>");
		}
	}
}

function getLinkFromDataInfo( target, source ) {
	var link, ret,
		links = jsViewsData( target, "from" );
		l = links.length;
	while( l-- ) {
		link = links[ l ];
		if ( link.source === source ) {
			// Set path info for this path
			ret = link;
		}
	}
	return ret;
}

//===============
// helpers
//===============

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

function splitParams( paramString, markParen ) {
	// Split into params (or values in an array literal, or keys and values in an object literal)
	// (Achieved by splitting before top-level ':' or ',' chars)
	var openParenIndex,
		startIndex = 0,
		parenDepth = 0,
		quoted = FALSE, // boolean for string content in double qoutes
		aposed = FALSE; // boolean for string content in single qoutes

	paramString = paramString.replace( /\s+/g, " " );

	return paramString
		.replace( /(\))|([\:\,])|(\')|(\")|([\(\[\{])|([\}\]])/g, function( all, cnvt, colon, apos, quot, leftParen, rightParen, index ) {
			if ( aposed ) {
				// within single-quoted string
				aposed = !apos;
				return all;
			}
			if ( quoted ) {
				// within double-quoted string
				quoted = !quot;
				return all;
			}
			if ( cnvt ) {
				// follow top-level ':' or ',' with '\t'
				return --parenDepth
					? all
					: (markParen && paramString.charAt( index + 1 ) === ',' )
						? (openParenIndex -= startIndex,
							startIndex = index,
							all + "\t" + openParenIndex + "\r\t")
						:all;
			}
			if ( colon ) {
				// follow top-level ':' or ',' with '\t'
				return parenDepth
					? all
					: (startIndex = index+1, all + "\t");
			}
			if ( leftParen ) {
				if ( parenDepth++ ) {
					return all;
				}
				if ( all === '(' ) {
					openParenIndex = index;
				}
				// follow top-level '[' by '\t'
				return all !== '[' ? all : "[\t";
			}
			if ( rightParen ) {
				// follow top-level ']' by '\t'
				return ( --parenDepth || all !== ']' ) ? all : "]\t";
			}
			aposed = apos;
			quoted = quot;
			return all;
		})
		.split( "\t" );
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

function myGetValue( value ) {
	return value;
}

var oldCleanData = $.cleanData;

$.extend({

	//=======================
	// jQuery $.view() plugin
	//=======================

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
					jsViewsData( topNode.parentNode, "view", TRUE ).push( ret = topView = new View( options ));
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

	//=======================
	// $.linkSettings
	//=======================

	linkSettings: {
		getProperty: function( data, value ) {
			// support for property getter on data
			return $.isFunction( value ) ? value.call(data) : value;
		},
		converters: {},
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

		//=======================
		// view prototype
		//=======================

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
				return TRUE;
			},
			onCreated: function( view ) {
				if ( this.parent ) {
					this.parent.onCreated( view );
				}
			},
			render: function( options ) {
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
				createNestedViews( parentNode, this, options, nextNode, 0, undefined, prevNode, 0); //this.index
				setArrayChangeLink( this, options );
				return this;
			},
			addViews: function( index, dataItems, tmpl, options ) {
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
					createNestedViews( parentNode, this, options, nextNode, 0, undefined, prevNode, index );
				}
				return this;
			},
			removeViews: function( index, itemsCount, keepHtml, options ) {
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
						setArrayChangeLink( view, options );
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
	},

	//=======================
	// override cleanData
	//=======================

	cleanData: function( elems ) {
		$( elems ).each( clean );  // TODO - look at perf optimization on this
		oldCleanData( elems );
	}
});

//=======================
// jQuery plugins
//=======================

$.fn.extend({
	view: function( options ) {
		return $.view( this[0], options );
	},
	addLinks: function( data, links, options ) {
		// Explicit Linking
		// if links is a string, corresponds to $("#container").html( $.render( options, data )).activateLinks( data );
		// If options is a function, cb - shorthand for { beforeChange: cb }
		return link( this, data, links, options );
	},
	removeLinks: function( data, links, options ) { //TODO
	//	return unlink( this, data, links, options );
	},
	link: function( data, tmpl, options ) {
		// Declarative Linking
		// If options is a function, cb - shorthand for { beforeChange: cb }
		if ( $.isPlainObject( tmpl )) {
			options = tmpl;
		} else {
			tmpl = $.template( tmpl );
			if ( tmpl ) {
				this.empty().append( $.render( tmpl, data ));
				// Using append, rather than html, as workaround for issues in IE compat mode. (Using innerHTML leads to initial comments being stripped)
			}
		}
		return link( this, data, undefined, options );
	}
});

settings = $.linkSettings;
View.prototype = settings.view;
decl = settings.decl;
declLinkTo = [{ filter: "input[" + settings.linkToAttr + "]" }];
})( jQuery );
