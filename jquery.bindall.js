/*! jQuery BindAll see: http://github.com/BorisMoore/jsviews */
/*
 * jQuery BindAll proposal, used in https://github.com/BorisMoore/jquery-ui/blob/grid/grid-spf-observable/grid-edit-tracker.html
 */
(function ( $, undefined ) {
	$.fn.bindAll = function bindAll( type, fn ) {
		// Bind a handler for multiple events on different objects,
		// or on multiple calls to single event such as grouped propertyChange events.
		// type is a single type, or, for case of different event types on each object, an array
		// Example: $([ grid, dataview ]).bindAll( "afterChange", function( gridEventData, dataviewEventData ) { ... })
		var timeout,
			argArray = [],
			typeArray = $.isArray( type );
		function callHandler() {
			fn.apply( this, argArray );
			argArray = [];
			timeout = undefined
		}
		this.each( function( index ) {
			$( this ).bind( typeArray ? type[index] : type, function(){
				timeout = timeout || setTimeout( callHandler, 0 );
				( argArray[ index ] = argArray[ index ] || [] ).push( arguments );
			});
		});
	};
})(jQuery);