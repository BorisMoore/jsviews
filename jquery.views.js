/*! JsViews v1.0pre: http://github.com/BorisMoore/jsviews */
/*
 * Interactive data-driven views using templates and data-linking.
 * Requires jQuery, and jsrender.js (next-generation jQuery Templates, optimized for pure string-based rendering)
 *    See JsRender at http://github.com/BorisMoore/jsrender
 *
 * Copyright 2012, Boris Moore
 * Released under the MIT License.
 */

window = window || global;
window.jsviews && jsviews.link || window.jQuery && jQuery.link || (function( window, undefined ) {

//========================== Top-level vars ==========================

var versionNumber = "v1.0pre",

	rTag, delimOpen0, delimOpen1, delimClose0, delimClose1,
	$ = window.jQuery,

	// jsviews object (=== $.views) Note: JsViews requires jQuery is loaded)
	jsv = window.jsviews || $.views,
	sub = jsv.sub,
	FALSE = false, TRUE = true,
	topView = jsv.topView,
	templates = jsv.templates,
	observable = $.observable,
	jsvData = "_jsvData",
	linkStr = "link",
	viewStr = "view",
	propertyChangeStr = "propertyChange",
	arrayChangeStr = "arrayChange",
	fnSetters = {
		value: "val",
		html: "html",
		text: "text"
	},
	oldCleanData = $.cleanData,
	oldJsvDelimiters = jsv.delimiters,
	rTmplOrItemComment = /^(\/?)(?:(item)|(?:(tmpl)(?:\(([^,)]*),([^,)]*)\))?(?:\s+([^\s]+))?))$/,
	rStartTag = /^item|^tmpl(\(\$?[\w.,]*\))?(\s+[^\s]+)?$/;

//====================
// Linked View Methods
//====================

if ( !$.fn ) {
	// jQuery is not loaded.
	throw "requires jQuery"; // for Beta (at least) we require jQuery
}

if( !(jsv )) {
	throw "requires JsRender";
}

//========================== Top-level functions ==========================

//===============
// event handlers
//===============

function elemChangeHandler( ev ) {
	var setter, cancel, fromAttr, to, linkContext, sourceValue, cnvtBack, target,
		source = ev.target,
		$source = $( source ),
		view = $.view( source ),
		context = view.ctx,
		beforeChange = context.beforeChange;

	if ( source.getAttribute( jsv.linkAttr ) && (to = jsViewsData( source, "to" ))) {
		fromAttr = defaultAttr( source );
		setter = fnSetters[ fromAttr ];
		sourceValue = $.isFunction( fromAttr ) ? fromAttr( source ) : setter ? $source[setter]() : $source.attr( fromAttr );

		if ((!beforeChange || !(cancel = beforeChange.call( view, ev ) === FALSE )) && sourceValue !== undefined ) {
			cnvtBack = jsv.converters[ to[ 2 ]];
			target = to[ 0 ];
			to = to[ 1 ];
			linkContext = {
				src: source,
				tgt: target,
				cnvtBack: cnvtBack,
				path: to
			};
			if ( cnvtBack ) {
				sourceValue = cnvtBack( sourceValue );
			}
			if ( sourceValue !== undefined && target ) {
				observable( target ).setProperty( to, sourceValue );
				if ( context.afterChange ) {  //TODO only call this if the target property changed
					context.afterChange.call( linkContext, ev );
				}
			}
			ev.stopPropagation(); // Stop bubbling
		}
		if ( cancel ) {
			ev.stopImmediatePropagation();
		}
	}
}

function propertyChangeHandler( ev, eventArgs, bind ) {
	var setter, changed, sourceValue, css,
		link = this,
		source = link.src,
		target = link.tgt,
		$target = $( target ),
		attr = link.attr || defaultAttr( target, TRUE ),
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


	if ((!beforeChange || !(eventArgs && beforeChange.call( this, ev, eventArgs ) === FALSE ))
		// && (!view || view.onDataChanged( eventArgs ) !== FALSE ) // Not currently supported or needed for property change
	) {
		sourceValue = link.fn( source, link.view, jsv, bind || returnVal );
		if ( $.isFunction( sourceValue )) {
			sourceValue = sourceValue.call( source );
		}
		if ( css = attr.lastIndexOf( "css-", 0 ) === 0 && attr.substr( 4 )) {
			if ( changed = $target.css( css ) !== sourceValue ) {
				$target.css( css, sourceValue );
			}
		} else {
			setter = fnSetters[ attr ];
			if ( setter ) {
				if ( changed = $target[setter]() !== sourceValue ) {
					$target[setter]( sourceValue );
					if ( target.nodeName.toLowerCase() === "input" ) {
						$target.blur(); // Issue with IE. This ensures HTML rendering is updated.
					}
				}
			} else if ( changed = $target.attr( attr ) !== sourceValue ) {
				$target.attr( attr, sourceValue );
			}
		}

		if ( eventArgs && changed && context.afterChange ) {
			context.afterChange.call( link, ev, eventArgs );
		}
	}
}

function arrayChangeHandler( ev, eventArgs ) {
	var context = this.ctx,
		beforeChange = context.beforeChange;

	if ( !beforeChange || beforeChange.call( this, ev, eventArgs ) !== FALSE ) {
		this.onDataChanged( eventArgs );
		if ( context.afterChange ) {
			context.afterChange.call( this, ev, eventArgs );
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
		$([ onArrayChange[ 1 ]]).unbind( arrayChangeStr, onArrayChange[ 0 ]);
	}

	if ( $.isArray( data )) {
		handler = function() {
			arrayChangeHandler.apply( view, arguments );
		};
		$([ data ]).bind( arrayChangeStr, handler );
		view._onArrayChange = [ handler, data ];
	}
}

function defaultAttr( elem, to ) {
	// Merge in the default attribute bindings for this target element
	var attr = jsv.merge[ elem.nodeName.toLowerCase() ];
	return attr
		? (to
			? attr.to.toAttr
			: attr.from.fromAttr)
		: "html";
}

function returnVal( value ) {
	return value;
}

//===============
// view hierarchy
//===============

function linkedView( view ) {
	if ( !view.render ) {
		view.onDataChanged = view_onDataChanged;
		view.render = view_render;
		view.addViews = view_addViews;
		view.removeViews = view_removeViews;
		view.content = view_content;

		var i, views, viewsCount;
		if ( !$.isArray( view.data ))  {
			view.nodes = [];
			view._lnk = 0; // compiled link index.
		}
		views = view.parent.views;
		if ( $.isArray( views ))  {
			i = view.index;
			viewsCount = views.length;
			while ( i++ < viewsCount-1 ) {
				observable( views[ i ] ).setProperty( "index", i );
			}
		}
		setArrayChangeLink( view );
	}
	return view;
}

// Additional methods on view object for linked views (i.e. when JsViews is loaded)

function view_onDataChanged( eventArgs ) {
	if ( eventArgs ) {
		// This is an observable action (not a trigger/handler call from pushValues, or similar, for which eventArgs will be null)
		var self = this,
			action =  eventArgs.change,
			index = eventArgs.index,
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
}

function view_render() {
	var self = this,
		tmpl = self.tmpl = getTemplate( self.tmpl ),
		prevNode = self.prevNode,
		nextNode = self.nextNode,
		parentNode = prevNode.parentNode;

	if ( tmpl ) {
		// Remove HTML nodes
		$( self.nodes ).remove(); // Also triggers cleanData which removes child views.
		// Remove child views
		self.removeViews();
		self.nodes = [];
		$( prevNode ).after( tmpl.render( self.data, self.ctx, self, self.path, true ) );
		// Need to the update the annotation info on the prevNode comment marker
// TODO - Include the following two lines, but modified, to keep <!-- item --> comments, but add template info: <!-- item fooTemplate -->
//			prevNode.nodeValue = prevNode.nextSibling.nodeValue;
//			nextNode.nodeValue = nextNode.previousSibling.nodeValue;
		// Remove the extra comment nodes
		parentNode.removeChild( prevNode.nextSibling );
		parentNode.removeChild( nextNode.previousSibling );
		// Link the new HTML nodes to the data
		linkViews( parentNode, self, nextNode, 0, undefined, undefined, prevNode, 0 ); //this.index
		setArrayChangeLink( self );
	}
	return self;
}

function view_addViews( index, dataItems, tmpl ) {
	var self = this,
		itemsCount = dataItems.length,
		context = self.ctx,
		views = self.views;

	if ( index && !views[index-1] ) {
		return; // If subview for provided index does not exist, do nothing
	}
	if ( itemsCount && (tmpl = getTemplate( tmpl || self.tmpl ))) {
		var	prevNode = index ? views[ index-1 ].nextNode : self.prevNode,
			nextNode = prevNode.nextSibling,
			parentNode = prevNode.parentNode;

		// Use passed-in template if provided, since self added view may use a different template than the original one used to render the array.
		$( prevNode ).after( tmpl.render( dataItems, context, self, undefined, index ) );
		// Need to the update the annotation info on the prevNode comment marker
	//	self.prevNode.nodeValue = prevNode.nextSibling.nodeValue;
		// Remove the extra comment nodes
		parentNode.removeChild( prevNode.nextSibling );
		parentNode.removeChild( nextNode.previousSibling );
		// Link the new HTML nodes to the data
		linkViews( parentNode, self, nextNode, 0, undefined, undefined, prevNode, index );
	}
	return self;
}

function view_removeViews( index, itemsCount ) {
	// view.removeViews() removes all the child views
	// view.removeViews( index ) removes the child view with specified index or key
	// view.removeViews( index, count ) removes the specified nummber of child views, starting with the specified index
	function removeView( index ) {
		var view = views[ index ],
			node = view.prevNode,
			nextNode = view.nextNode,
			nodes = [ node ],
			parentElViews = parentElViews || jsViewsData( view.nextNode.parentNode, viewStr ),
			i = parentElViews.length;

		if ( i ) {
			view.removeViews();
		}

		// Remove this view from the parentElViews collection
		while ( i-- ) {
			if ( parentElViews[ i ] === view ) {
				parentElViews.splice( i, 1 );
				break;
			}
		}
		// Remove the HTML nodes from the DOM
		while ( node !== nextNode ) {
			node = node.nextSibling;
			nodes.push( node );
		}
		$( nodes ).remove();
		view.data = undefined;
		setArrayChangeLink( view );
	}

	var current,
		self = this,
		views = self.views,
		viewsCount = views.length;

	if ( index === undefined ) {
		// Remove all child views
		for ( index in views ) {
			removeView( index );
		}
		self.views = [];
	} else {
		if ( itemsCount === undefined ) {
			if ( viewsCount === undefined ) {
				// Remove child view with key 'index'
				removeView( index );
				delete views[ index ];
			} else {
				// The parentView is data array view.
				// Set itemsCount to 1, to remove this item
				itemsCount = 1;
			}
		}
		if ( itemsCount ) {
			current = index + itemsCount;
			// Remove indexed items (parentView is data array view);
			while ( current-- > index ) {
				removeView( current );
			}
			views.splice( index, itemsCount );
			if ( viewsCount = views.length ) {
				// Fixup index on following view items...
				while ( index < viewsCount ) {
					observable( views[ index ] ).setProperty( "index", index++ );
				}
			}
		}
	}
	return this;
}

function view_content( select ) {
	return select ? $( select, this.nodes ) : $( this.nodes );
}

//===============
// data-linking
//===============

function linkViews( node, parent, nextNode, depth, data, context, prevNode, index ) {

	var tokens, links, link, attr, linkIndex, parentElViews, convertBack, view, existing, parentNode, linkMarkup,
		currentView = parent,
		viewDepth = depth;
	context = context || {};
	node = prevNode || node;

	if ( !prevNode && node.nodeType === 1 ) {
		if ( viewDepth++ === 0 ) {
			// Add top-level element nodes to view.nodes
			currentView.nodes.push( node );
		}
		if ( linkMarkup = node.getAttribute( jsv.linkAttr ) ) {
			linkIndex = currentView._lnk++;
			// Compiled linkFn expressions are stored in the tmpl.links array of the template
			links = currentView.links || currentView.tmpl.links;
			if ( !(link = links[ linkIndex ] )) {
				link = links [ linkIndex ] = {};
				if ( linkMarkup.charAt(linkMarkup.length-1) !== "}" ) {
					// Simplified syntax is used: data-link="expression"
					// Convert to data-link="{:expression}", or for inputs, data-link="{:expression:}" for (default) two-way binding
					linkMarkup = delimOpen1 + ":" + linkMarkup + ($.nodeName( node, "input" ) ? ":" : "") + delimClose0;
				}
				while( tokens = rTag.exec( linkMarkup )) {
					// Iterate over the data-link expressions, for different target attrs, e.g. <input data-link="{:firstName:} title{:~description(firstName, lastName)}"
					// tokens: [all, attr, tag, converter, colon, html, code, linkedParams]
					attr = tokens[ 1 ];
					if ( tokens[ 5 ]) {
						// Only for {:} link"
						if ( !attr && (convertBack = /.*:([\w$]*)$/.exec( tokens[ 8 ] ))) {
							convertBack = convertBack[ 1 ];
						}
						if ( convertBack === null ) {
							convertBack = undefined;
						}
					}
					// Compile the linkFn expression which evaluates and binds a data-link expression
					// TODO - optimize for the case of simple data path with no conversion, helpers, etc.:
					//     i.e. data-link="a.b.c". Avoid creating new instances of Function every time. Can use a default function for all of these...
				//	if ( linkMarkup !== ("{" + tokens[2] + " "  + linkedParams + "}")) debugger;
					link[ attr ] = jsv.tmplFn( delimOpen0 + tokens[2] + delimClose1, undefined, TRUE );
					if ( !attr && convertBack !== undefined ) {
						link[ attr ].to = convertBack;
					}
				}
			}
			for ( attr in link ) {
				bindDataLinkTarget(
					currentView.data|| data, //source
					node,                    //target
					attr,                    //attr
					link[ attr ],            //compiled link markup expression
					currentView              //view
				);
			}
// TODO - Add one-way-to-source support
//			if ( linkMarkup.lastIndexOf( "toSrc{", 0 ) === 0 ) {
//				linkMarkup = "{toSrc " + linkMarkup.slice(6);
//			}
		}
		node = node.firstChild;
	} else {
		node = node.nextSibling;
	}

	while ( node && node !== nextNode ) {
		if ( node.nodeType === 1 ) {
			linkViews( node, currentView, nextNode, viewDepth, data, context );
		} else if ( node.nodeType === 8 && (tokens = rTmplOrItemComment.exec( node.nodeValue ))) {
			// tokens: [ all, slash, 'item', 'tmpl', path, index, tmplParam ]
			parentNode = node.parentNode;
			if ( tokens[ 1 ]) {
				// <!--/item--> or <!--/tmpl-->
				currentView.nextNode = node;
				if ( currentView.ctx.onAfterCreate ) {
					currentView.ctx.onAfterCreate.call( currentView, currentView );
				}
				if ( tokens[ 2 ]) {
					// An item close tag: <!--/item-->
					currentView = parent;
				} else  {
					// A tmpl close tag: <!--/tmpl-->
					return node;
				}
			} else {
				// <!--item--> or <!--tmpl-->
				parentElViews = parentElViews || jsViewsData( parentNode, viewStr, TRUE );
				if ( tokens[ 2 ]) {
					// An item open tag: <!--item-->
					parentElViews.push(
						currentView = linkedView( currentView.views[ index ] )
					);
					index++;
					currentView.prevNode = node;
				} else {
					// A tmpl open tag: <!--tmpl(path) name-->
					parentElViews.push(
						view = linkedView( currentView.views[ tokens[ 5 ]] )
					);
					view.prevNode = node;
					// Jump to the nextNode of the tmpl view
					node = existing || linkViews( node, view, nextNode, 0, undefined, undefined, undefined, 0 );
				}
			}
		} else if ( viewDepth === 0 ) {
			// Add top-level non-element nodes to view.nodes
			currentView.nodes.push( node );
		}
		node = node.nextSibling;
	}
}

function bindDataLinkTarget( source, target, attr, linkFn, view ) {
	//Add data link bindings for a link expression in data-link attribute markup
	var boundParams = [],
		storedLinks = jsViewsData( target, linkStr, TRUE ),
		handler = function() {
			propertyChangeHandler.apply({ tgt: target, src: source, attr: attr, fn: linkFn, view: view }, arguments );
		};

	// Store for unbinding
	storedLinks[ attr ] = { srcs: boundParams, hlr: handler };

	// Call the handler for initialization and parameter binding
	handler( undefined, undefined, function ( object, leafToken ) {
		// Binding callback called on each dependent object (parameter) that the link expression depends on.
		// For each path add a propertyChange binding to the leaf object, to trigger the compiled link expression,
		// and upate the target attribute on the target element
		boundParams.push( object );
		if ( linkFn.to !== undefined ) {
			// If this link is a two-way binding, add the linkTo info to JsViews stored data
			$.data( target, jsvData ).to = [ object, leafToken, linkFn.to ];
			// For two-way binding, there should be only one path. If not, will bind to the last one.
		}
		if ( $.isArray( object )) {
			$([ object ]).bind( arrayChangeStr, function() {
				handler();
			});
		} else {
			$( object ).bind( propertyChangeStr, handler );
		}
		return object;
	});
	// Note that until observable deals with managing listeners on object graphs, we can't support changing objects higher up the chain, so there is no reason
	// to attach listeners to them. Even $.observable( person ).setProperty( "address.city", ... ); is in fact triggering propertyChange on the leaf object (address)
}

//===============
// helpers
//===============

function clean( i, el ) { // TODO optimize for perf
	var link, l, attr, parentView, view, srcs,
		links = jsViewsData( el, linkStr ),
		views = jsViewsData( el, viewStr );
// Not necessary: jQuery does this.
//	if ( jsViewsData( el, "to" ).length ) {
//		$( el ).unbind( "change" );
//	}

	for ( attr in links) {
		link = links[ attr ];
		srcs = link.srcs;
		l = srcs.length;
		while( l-- ) {
			$( srcs[ l ] ).unbind( propertyChangeStr, link.hlr );
		}
	}

	if ( l = views.length ) {
		parentView = $.view( el );
		while( l-- ) {
			view = views[ l ];
			if ( view.parent === parentView ) {
				parentView.removeViews( view.index );  // NO - ONLY remove view if its top-level nodes are all.. (TODO)
			}
		}
	}
}

function jsViewsData( el, type, create ) {
	var jqData = $.data( el, jsvData ) || (create && $.data( el, jsvData, { view: [], link: {} }));
	return jqData ? jqData[ type ] : {};
}

function inputAttrib( elem ) {
	return elem.type === "checkbox" ? elem.checked : $( elem ).val();
}

function getTemplate( tmpl ) {
	// Get nested templates from path
	if ( "" + tmpl === tmpl ) {
		var tokens = tmpl.split("[");
		tmpl = templates[ tokens.shift() ];
		while( tmpl && tokens.length ) {
			tmpl = tmpl.tmpls[ tokens.shift().slice( 0, -1 )];
		}
	}
	return tmpl;
}

//========================== Initialize ==========================

topView._lnk = 0;
topView.links = [];
topView.ctx.link = TRUE; // Set this as the default, when JsViews is loaded

//=======================
// JsRender integration
//=======================

sub.onStoreItem = function( store, name, item, process ) {

	if ( name && item && store === templates ) {
		item.link = function( container, data, context, parentView ) {
			$.link( container, data, context, parentView, item );
		};
		item.unlink = function( container, data, context, parentView ) {
			$.unlink( container, data, context, parentView, item );
		};

		$.link[ name ] = function() {
			return item.link.apply( item, arguments );
		};
		$.unlink[ name ] = function() {
			return item.unlink.apply( item, arguments );
		};
	}
};
sub.onRenderItem = function( value, props ) {
	return "<!--item-->" + value + "<!--/item-->";
};
sub.onRenderItems = function( value, path, index, tmpl, props ) {
	return "<!--tmpl(" + (path||"") + "," + index + ") " + tmpl.name + "-->" + value + "<!--/tmpl-->";
};

//=======================
// Extend $.views namespace
//=======================

$.extend( jsv, {
	linkAttr: "data-link",
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
	delimiters: function( openChars, closeChars ) {
		oldJsvDelimiters( openChars, closeChars );
		rTag = new RegExp( "(?:^|s*)([\\w-]*)("  + jsv.rTag + ")", "g" );
		delimOpen0 = openChars.charAt( 0 );
		delimOpen1 = openChars.charAt( 1 );
		delimClose0 = closeChars.charAt( 0 );
		delimClose1 = closeChars.charAt( 1 );
		return this;
	}
});

//=======================
// Extend jQuery namespace
//=======================

$.extend({

	//=======================
	// jQuery $.view() plugin
	//=======================

	view: function( node, inner ) {
		// $.view() returns top node
		// $.view( node ) returns view that contains node
		// $.view( selector ) returns view that contains first selected element

		node = ("" + node === node ? $( node )[0] : node);
		var returnView, view, parentElViews, i, finish,
			topNode = window.document.body,
			startNode = node;

		if ( inner ) {
			// Treat supplied node as a container element, step through content, and return the first view encountered.
			finish = node.nextSibling || node.parentNode;
			while ( finish !== (node = node.firstChild || node.nextSibling || node.parentNode.nextSibling )) {
				if  ( node.nodeType === 8 && rStartTag.test( node.nodeValue )) {
					view = $.view( node );
					if ( view.prevNode === node ) {
						return view;
					}
				}
			}
			return;
		}

		node = node || topNode;
		if ( $.isEmptyObject( topView.views )) {
			returnView = topView; // Perf optimization for common case
		} else {
			// Step up through parents to find an element which is a views container, or if none found, create the top-level view for the page
			while( !(parentElViews = jsViewsData( finish = node.parentNode || topNode, viewStr )).length ) {
				if ( !finish || node === topNode ) {
					jsViewsData( topNode.parentNode, viewStr, TRUE ).push( returnView = topView );
					break;
				}
				node = finish;
			}
			if ( !returnView && node === topNode ) {
				returnView = topView; //parentElViews[0];
			}
			while ( !returnView && node ) {
				// Step back through the nodes, until we find an item or tmpl open tag - in which case that is the view we want
				if ( node === finish ) {
					returnView = view;
					break;
				}
				if  ( node.nodeType === 8 ) {
					if (  /^\/item|^\/tmpl$/.test( node.nodeValue )) {
						// A tmpl or item close tag: <!--/tmpl--> or <!--/item-->
						i = parentElViews.length;
						while ( i-- ) {
							view = parentElViews[ i ];
							if ( view.nextNode === node ) {
								// If this was the node originally passed in, this is the view we want.
								returnView = (node === startNode && view);
								// If not, jump to the beginning of this item/tmpl and continue from there
								node = view.prevNode;
								break;
							}
						}
					} else if ( rStartTag.test( node.nodeValue )) {
						// A tmpl or item open tag: <!--tmpl--> or <!--item-->
						i = parentElViews.length;
						while ( i-- ) {
							view = parentElViews[ i ];
							if ( view.prevNode === node ) {
								returnView = view;
								break;
							}
						}
					}
				}
				node = node.previousSibling;
			}
			// If not within any of the views in the current parentElViews collection, move up through parent nodes to find next parentElViews collection
			returnView = returnView || $.view( finish );
		}
		return returnView;
	},
	
	link: function( container, data, context, parentView, template ) {
		// Bind elementChange on the root element, for links from elements within the content, to data;
		function dataToElem() {
			elemChangeHandler.apply({
				tgt: data
			}, arguments );
		}

		parentView = parentView || topView;
		template = template && (templates[ template ] || (template.markup ? template : $.templates( template )));
		context = context || parentView.ctx;
		context.link = TRUE;
		container = $( container )
		//	.unbind( "change" )  // TODO complete this, by calling unlink? - TODO/BUG. Consider both top-level and template-driven linking
			.bind( "change", dataToElem );

		if ( template ) {
			// TODO/BUG Currently this will re-render if called a second time, and will leave stale views under the parentView.views.
			// So TODO: make it smart about when to render and when to link on already rendered content
			container.html( template.render( data, context, parentView )); // Supply non-jQuery version of this...
		}
		linkViews( container[0], parentView, undefined, undefined, data, context );
	},

	unlink: function( container ) {
		container = $( container )
			.unbind( "change" );
		container.empty(); // Supply non-jQuery version of this...
	},

	//=======================
	// override cleanData
	//=======================

	cleanData: function( elems ) {
		$( elems ).each( clean );  // TODO - look at perf optimization on this
		oldCleanData.call( $, elems );
	}
});

// Initialize default delimiters
jsv.delimiters( "{{", "}}" );

})( window );
