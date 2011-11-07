/*! JsViews IE7 Server Render compatibity plugin v1.0pre: http://github.com/BorisMoore/jsviews */
/*
 * Adds fixup code to ensure correct behavior for linking server-rendered content
 * (with JsViews comment tags included) when in IE7 or earlier, or equivalent compat mode
 *
 * Copyright 2011, Boris Moore
 * Released under the MIT License.
 */
(function( $, undefined ) {
var oldLink = $.fn.link;

function fixIE7Content( node, parent, depth ) {
	// Special case for older IE compat: promote trailing comment nodes one level up in the hierarchy.
    // Comment nodes such as "tmpl", "/tmpl", "item" and "/item" can be incorrectly demoted to being
    // children of a preceding top-level template node - (e.g for an <li>).
	var tokens, jumpToView, parentNode, next,
		currentView = parent,
		viewDepth = depth;

	function moveNodesForIE7( nodeToMove, containerNode ) {
		// Move comment nodes etc. back from content to following siblings, where they came from before IE7 wrongly demoted them
		var before = containerNode.nextSibling;
		while ( nodeToMove ) {
			next = nodeToMove.nextSibling;
			containerNode.parentNode.insertBefore( nodeToMove, before );
			nodeToMove = next;
		}
	}

	node = node.nodeType === 1 ? node.firstChild : node.nextSibling;

	while ( node ) {
		jumpToView = undefined;
		if ( node.nodeType === 1 ) {
			viewDepth++;
			if ( jumpToView = fixIE7Content( node, currentView, viewDepth )) {
				currentView = jumpToView;
				node = currentView.prevNode;
			}
		} else if ( node.nodeType === 8 && (tokens = /^(\/?)(?:(item)|(?:tmpl(?:\(.*\))?(?:\s+[^\s]+)?))$/.exec( node.nodeValue ))) {
			// tokens: [ commentText, "/", "item" ]

			parentNode = node.parentNode;
			if ( tokens[1]) {
				// <!--/item--> or <!--/tmpl-->
				currentView.nextNode = node;
				if ( currentView.prevNode && parentNode !== currentView.prevNode.parentNode ) {
					// The closing comment is under a different parent element than the opening comment.
					// This can only happen because IE7 moved comment nodes under preceding element
					moveNodesForIE7( node, parentNode );
					return;
				}
				if ( tokens[2] ) {
					// An item close tag: <!--/item-->
					currentView = parent;
				} else {
					// A tmpl close tag: <!--/tmpl-->
					return node;
				}
			} else {
				// <!--item--> or <!--tmpl-->
				if ( tokens[2] ) {
					// An item open tag: <!--item-->
					currentView = { prevNode: node };
				} else {
					// A tmpl open tag: <!--tmpl(path) name-->
					// Jump to the nextNode of the tmpl view
					node = fixIE7Content( node, { prevNode: node }, 0 );
				}
			}
		}
		node = node.nextSibling;
	}
	if ( !node && viewDepth === 0 && !currentView.nextNode ) {
		// Reaching end of parentNode content without encountering closing comment of view.
		// This can only happen because IE7 moved comment nodes under preceding element
		nodeToMove = parentNode.firstChild;
		var startFrom, counter = 0;
		while( nodeToMove ) {
			if ( nodeToMove.nodeType === 8 ) {
				if ( !counter ) {
					startFrom = nodeToMove;
				}
				counter+= nodeToMove.nodeValue.charAt( 0 ) !== "/" ? -1 : 1;
			}
			nodeToMove = nodeToMove.nextSibling;
		}
		if ( startFrom ) {
			moveNodesForIE7( startFrom, parentNode );
			return currentView;
		}
	}
}

if (oldLink && document.all && !window.opera && (!document.documentMode || document.documentMode < 8)) {
	// We are in IE7 or equivalent compat mode
	$.fn.link = function( data, tmpl, context ) {
		if ( !tmpl && /<!--tmpl/.test(this.html())) {
			this.each( function() {
				fixIE7Content( this, {});
			});
		}
		return oldLink.call( this, data, tmpl, context );
	}
}
})( jQuery );
