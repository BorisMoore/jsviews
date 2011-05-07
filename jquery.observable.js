/*!
 * jQuery Observable Plugin v1.0pre
 * Observable changes on arrays and objects
 * http://github.com/BorisMoore/jsviews
 */
(function ($) {
	$.observable = function( data ) {
		return $.isArray( data )
			? new ObservableArray( data )
			: new ObservableObject( data );
	};

	$.observer = function( data ) {
		var observer = $.observable( data );
		observer.changes = [],
		observer.observe = function () {
			if ( this.changes.length ) {
				$([ this._data ]).triggerHandler( "arrayChange", this.changes );
			}
			this.changes = [];
		}
	};

	var extend = $.observable.extend = jQuery.extend;

	ObservableArray = function( data ) {
		this._data = data;
		return this;
	}

	$.observable.array = ObservableArray.prototype = {
		constructor: $.observable,
		data: function() {
			return this._data;
		},
		extend: extend
	}

	ObservableObject = function( data ) {
		this._data = data;
		return this;
	}

	$.observable.object = ObservableObject.prototype = {
		constructor: $.observable,
		data: function() {
			return this._data;
		},
		extend: extend
	}

})( jQuery );

// Observable Array extensions
(function ($) {
	var getEventArgs = {
		pop: function() {
			var length = this.length;
			if ( length ) {
				return { change: "remove", oldIndex: length - 1, oldItems: [ this[length - 1 ]]};
			}
		},
		push: function() {
			return { change: "add", newIndex: this.length, newItems: [ arguments[ 0 ]]};
		},
		reverse: function() {
			if ( this.length ) {
				return { change: "reset" };
			}
		},
		shift: function() {
			if ( this.length ) {
				return { change: "remove", oldIndex: 0, oldItems: [ this[ 0 ]]};
			}
		},
		sort: function() {
			if ( this.length ) {
				return { change: "reset" };
			}
		},
		splice: function() {
			var args = $.makeArray( arguments ),
				index = args[ 0 ],
				numToRemove = args[ 1 ],
				elementsToRemove,
				elementsToAdd = args.slice( 2 );
			if ( numToRemove <= 0 ) {
				if ( elementsToAdd.length ) {
					return { change: "add", newIndex: index, newItems: elementsToAdd };
				}
			} else {
				elementsToRemove = this.slice( index, index + numToRemove );
				if ( elementsToAdd.length ) {
					return { change: "move", oldIndex: index, oldItems: elementsToRemove, newIndex: index, newItems: elementsToAdd };
				} else {
					return { change: "remove", oldIndex: index, oldItems: elementsToRemove };
				}
			}
		},
		unshift: function() {
			return { change: "add", newIndex: 0, newItems: [ arguments[ 0 ]]};
		},
		move: function() {
			var fromIndex,
				numToMove = arguments[ 1 ];
			if ( numToMove > 0 ) {
				fromIndex = arguments[ 0 ];
				return { change: "move", oldIndex: fromIndex, oldItems: this.splice( fromIndex, numToMove ), newIndex: arguments[ 2 ]};
			}
		}
	};

	function changeArray( array, eventArgs, changes ) {
		if ( eventArgs ) {
			switch ( eventArgs.change ) {
				case "add":
					[].splice.apply( array, [].concat( eventArgs.newIndex, 0, eventArgs.newItems ));
				break;

				case "remove":
					array.splice( eventArgs.oldIndex, eventArgs.oldItems.length );
				break;

				case "reset":
				break;

				case "move":
			//		array.splice( eventArgs.newIndex, 0, array.splice( eventArgs.oldIndex, eventArgs.number ));
					array.splice( eventArgs.oldIndex, eventArgs.oldItems.length );
					[].splice.apply( array, [].concat( eventArgs.newIndex, 0, eventArgs.newItems ));
				break;
			}
			if ( changes ) {
				changes.push( eventArgs );
			} else {
				$([ array ]).triggerHandler( "arrayChange", eventArgs );
			}
		}
	}

	$.each([ "pop", "push", "reverse", "shift", "unshift", "sort", "splice", "move" ], function ( index, operation ) {
		$.observable.array[ operation ] = function() {
			var array = this._data;
			changeArray( array, getEventArgs[ operation ].apply( array, arguments ), this.changes );
			return this;
		}
	});

	$.observable.array.extend({
		replace: function( newItems ) {
			this.splice.apply( this, [].concat( 0, this._data.length, newItems ));
			return this;
		}
	});
})(jQuery);

// Observable Object extensions
(function ($) {
	$.observable.object.extend({
		setField: function( path, value ) {
			var object = this._data;
			if ( path ) {
				var args = [{ path: path, value: value }],
					leaf = getLeafObject( object, path );

				object = leaf[0], path = leaf[1];
				if ( object && (object[ path ] !== value )) {
					object[ path ] = value;
					if ( this.changes ) {
						this.changes.push( args );
					} else {
						$( object ).triggerHandler( "objectChange", args );
					}
				}
			}
		}
	});

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

})(jQuery);

// Consider these possible APIs:
//		$.observable( developersGrid ).source( developers )
//		$.observable( developersGrid ).set( "source", developers )
//		$.setField( developersGrid, "source", developers );

