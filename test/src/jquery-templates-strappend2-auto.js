(function () {
//-*- mode: js2-mode; indent-tabs-mode: t; tab-width: 2; -*-
/*jslint evil: true, unparam: true, maxerr: 50 */

/**
 * @fileoverview
 * Common definitions for jQuery templates and plugin passes
 * based on http://wiki.jqueryui.com/w/page/37898666/Template
 *
 * @author Mike Samuel <mikesamuel@gmail.com>
 */


/**
 * @define {boolean}
 * True if malformed templates should result in informative error messages.
 * May be turned off in production to reduce minified size.
 * When false, most of the error reporting is turned off during parsing and
 * compilation, so the production bundle should be used with templates that
 * have already passed basic sanity checks.
 */
var DEBUG = true;

/**
 * A boolean-esque value that minifies better than true.
 * @const
 */
var TRUTHY = 1;

/**
 * A boolean-esque value that minifies better than false.
 * @const
 */
var FALSEY = 0;


// JQuery Lexical Grammar.

/**
 * Regular expression text for a substitution.  ${...}.
 * @const
 */
var SUBSTITUTION_RE = (
		"\\$\\{"
		+ "[^}]*"               // ${...} cannot contain curlies but {{=...}} can.
		+ "\\}" );

/**
 * Regular expression text for a directive name.
 * @const
 */
var NAME_RE = "[=a-z][a-z0-9]*";

/**
 * Regular expression text for a directive start|end marker.
 * @const
 */
var MARKER_RE = (
		"\\{\\{"
		+ "(?:"
		+ NAME_RE + "[\\s\\S]*?" // A start marker.
		+ "|/" + NAME_RE + "\\s*" // An end marker.
		+ ")"
		+ "\\}\\}" );

/**
 * Global regular expression that matches a single template token.
 * @const
 */
var TOKEN = new RegExp(
		"(?=" + SUBSTITUTION_RE
		+ "|" + MARKER_RE + ")",
		"gi" );

/**
 * Global regular expression that can be used to decompose a marker.
 * @const
 */
var MARKER = new RegExp(
		"^\\{\\{"
		+ "(/?)"  // Iff a close marker, group 1 is truthy.
		+ "(=|[a-z][a-z0-9]*)"  // Marker name in group 2.
		+ "([\\s\\S]*)"  // Marker content in group 3.
		+ "\\}\\}",
		"i" );

/**
 * Regular expression text for a variable name.
 * @const
 */
// We may need to exclude keywords if these are used outside a param decl.
var VAR_NAME_RE = "[a-z_$]\\w*";

/** Matches the content of an <code>{{each}}</code> directive. @const */
var EACH_DIRECTIVE_CONTENT = new RegExp(
		"^"  // Start at the beginning,
		+ "\\s*"
		+ "(?:"  // Optional parenthetical group with var names.
			+ "\\(\\s*"
			+ "(" + VAR_NAME_RE + ")"  // Key variable name in group 1.
			+ "\\s*"
			+ "(?:"
				+ ",\\s*"
				+ "(" + VAR_NAME_RE + ")"  // Value variable name in group 2.
				+ "\\s*"
			+ ")?"
			+ "\\)\\s*"
		+ ")?"
		+ "("  // Container expression in group 3.
			+ "\\S"  // A non-space character followed by any run of non-space chars.
			+ "(?:[\\s\\S]*\\S)?"
		+ ")"
		+ "\\s*"
		+ "$",  // Finish at the end.
		"i" );

/** Matches the content of a <code>{{tmpl}}</code> directive. @const */
var TMPL_DIRECTIVE_CONTENT = new RegExp(
		"^"
		+ "\\s*"
		+ "(?:"  // Optional parenthetical group with data and option exprs.
			+ "\\("
			+ "([\\s\\S]*)"  // Data and option maps go in group 1.
			+ "\\)"
			+ "\\s*"
		+ ")?"
		+ "([^\\s()](?:[^()]*[^\\s()])?)"  // Template name/selector in group 2.
		+ "\\s*"
		+ "$"
		);

/**
 * The default variable name for the key used when none is specified in an
 * <code>{{each}}</code> directive.
 * @const
 */
var DEFAULT_EACH_KEY_VARIABLE_NAME = "$index";

/**
 * The default variable name used for the value when none is specified in an
 * <code>{{each}}</code> directive.
 * @const
 */
var DEFAULT_EACH_VALUE_VARIABLE_NAME = "$value";


// API name constants
// These constants help us write code that is JSLint friendly, and compresses
// well with closure compiler.
/**
 * Extern property name for the member of $ that contains plugins to run.
 * @const
 */
var TEMPLATE_PLUGINS_PROP_NAME = "templatePlugins";

/**
 * Name of the map from template names to compiled/parsed template.
 * @const
 */
var TEMPLATES_PROP_NAME = "templates";

/**
 * Name of the extern method used to define/lookup templates.
 * @const
 */
var TEMPLATE_METHOD_NAME = "template";

/**
 * Method of a template object that renders the template.
 * @const
 */
var TMPL_METHOD_NAME = "tmpl";

/**
 * The default set of block directives.
 * @const
 */
var DEFAULT_BLOCK_DIRECTIVES = { "each": TRUTHY, "if": TRUTHY, "wrap": TRUTHY };
//-*- mode: js2-mode; indent-tabs-mode: t; tab-width: 2; -*-

/**
 * @fileoverview
 * The frontend of the JQuery template compiler
 * based on http://wiki.jqueryui.com/w/page/37898666/Template
 *
 * @author Mike Samuel <mikesamuel@gmail.com>
 */

/**
 * Guess, conservatively for well-formed templates, the set of
 * directives that require an end-marker.
 *
 * @param {!string} templateText
 * @return {!Object.<string, number>}
 */
function guessBlockDirectives( templateText ) {
	/**
	 * @type !Object.<string, number>
	 */
	var blockDirectives = {};
	// For each token like {{/foo}} put "foo" into the block directives map.
	$.each(
			templateText.split( TOKEN ),
			function ( _, tok ) {
				var match;
				if ( ( match = tok.match( /^\{\{\/([a-z][a-z0-9]*)[\s\S]*\}\}/i ) ) ) {
					blockDirectives[ match[ 1 ] ] = TRUTHY;
				}
			} );
	return blockDirectives;
}

/**
 * Parse a template to a parse tree.
 * Parse trees come in two forms:
 * <ul>
 *   <li>{@code "string"} : a snippet of HTML text.</li>
 *   <li>{@code ["name", "content", ...]} where {@code "name"}
 *      is a directive name like {@code "if"} or the string {@code "="} for
 *      substitutions.  The content is the string after the name in the open
 *      marker, so for <code>{{if foo==bar}}Yes{{/if}}</code>, the content is
 *      {@code " foo==bar"}.  The "..." above is filled with child parse trees
 *      of the form described here.</li>
 * </ul>
 * <p>
 * For example, the parse tree for
 * <pre>
 * &lt;b&gt;{{if sayHello}}Hello{{else}}Goodbye{{/if}}&lt;/b&gt;, ${world}!
 * </pre>
 * is
 * <pre>
 * [
 *  "",               // Name of root is blank.
 *  "",               // Content of root is blank.
 *  "&lt;b&gt;",      // Zero-th child is a snippet of HTML.
 *  [                 // An embedded directive is an array.
 *   "if",            // Name comes first
 *   " sayHello",     // Content of {{if}}
 *   "Hello",         // A snippet of HTML.
 *   ["else", ""],    // {{else}} is an inline directive inside {{if}}.
 *   "Goodbye"
 *  ],                // End of the {{if ...}}...{{/if}}.
 *  "&lt;/b&gt;, ",   // Another snippet of HTML.
 *  ["=", "world"],   // A substitution.  ${x} is an abbreviation for {{=x}}.
 *  "!"
 * ]
 * </pre>
 *
 * @param {!string} templateText The text to parse.
 * @param {!Object.<string, number>} blockDirectives Maps directive names such
 *     as {@code "if"} to {link #TRUTHY} if they require/allow an end marker.
 *     {@link #DEFAULT_BLOCK_DIRECTIVES} and the output of
 *     {@link #guessBlockDirectives} both obey this contract.
 * @return {!Array.<string|Array>|string} A parse tree node.
 */
function parseTemplate( templateText, blockDirectives ) {
	// The root of the parse tree.
	var root = [ "", "" ],
			// A stack of nodes which have been entered but not yet exited.
			stack = [ root ],
			// The topmost element of the stack
			top = root,
			// Count of "}}" sequences that need to be seen to end the {{!...}}.
			commentDepth = 0;
	$.each(
			templateText
					// Handle {#...#} style non-nesting comments.
					.replace( /\{#[\s\S]*?#\}/g, "" )
					// Handle {{! ... }} style comments which can contain arbitrary nested
					// {{...}} sections.
					.replace( /\{\{!?|\}\}|(?:[^{}]|\{(?!\{)|\}(?!\}))+/g,
										function ( token ) {
											if ( token === "{{!" ) {
												++commentDepth;
												return "";
											} else if ( commentDepth ) {  // Inside a {{!...}}.
												if ( token === "}}" ) {
													--commentDepth;
												} else if ( token === "{{" ) {
													++commentDepth;
												}
												return "";
											} else {  // Actually emit the token.
												return token;
											}
										} )
					// Split against a global regexp to find all token boundaries.
					.split( TOKEN ),
			function ( _, token ) {
				var m = token.match( MARKER );
				if ( m ) {  // A marker.
					// "/" in group 1 if an end marker.
					// Name in group 2.  Content in group 3.
					if ( m[ 1 ] ) {  // An end marker
						if ( DEBUG && top[ 0 ] !== m[ 2 ] ) {
							throw new Error( "Misplaced " + token + " in " + templateText );
						}
						top = stack[ --stack.length - 1 ];
					} else {  // A start marker.
						var node = [ m[ 2 ], m[ 3 ] ];
						if ( DEBUG ) {
							if ( m[ 2 ] === "=" ) {
								try {
									// For some reason, on Safari,
									//     Function("(i + (j)")
									// fails with a SyntaxError as expected, but
									//     Function("return (i + (j)")
									// does not.
									// Filed as https://bugs.webkit.org/show_bug.cgi?id=59795
									Function( "(" + m[ 3 ] + ")" );
								} catch ( e1 ) {
									throw new Error( "Invalid template substitution: " + m[ 3 ] );
								}
							} else if ( m[ 2 ] === "tmpl" ) {
								var tmplContent = m[ 3 ].match( TMPL_DIRECTIVE_CONTENT );
								try {
									Function( "([" + tmplContent[ 1 ] + "])" );
									Function( "(" + tmplContent[ 2 ] + ")" );
								} catch ( e2 ) {
									throw new Error(
											"Invalid {{" + m[ 2 ] + "}} content: " + m[ 3 ] );
								}
							}
						}
						top.push( node );  // Make node a child of top.
						if ( blockDirectives[ m[ 2 ] ] === TRUTHY ) {
							// If it is a block directive, make sure the stack and top are
							// set up so that the next directive or text span parsed will be
							// a child of node.
							stack.push( top = node );
						}
					}
					// TOKEN only breaks on the starts of markers, not the end.
					// Consume marker so tail can be treated as HTML snippet text.
					token = token.substring( m[ 0 ].length );
				} else if ( token.substring( 0, 2 ) === "${" ) {  // A substitution.
					// Since TOKEN above splits on only the starts of tokens, we need to
					// find the end and allow any remainder to fall-through to the HTML
					// HTML snippet case below.
					var end = token.indexOf( "}" );
					top.push( [ "=", token.substring( 2, end ) ] );
					if ( DEBUG ) {
						var content = top[ top.length - 1 ][ 1 ];
						try {
							// See notes on {{=...}} sanity check above.
							Function( "(" + content + ")" );
						} catch ( e3 ) {
							throw new Error( "Invalid template substitution: " + content );
						}
					}
					// Consume marker so tail can be treated as an HTML snippet below.
					token = token.substring( end + 1 );
				}
				if ( token ) {  // An HTML snippet.
					top.push( token );
				}
			} );
	if ( DEBUG && stack.length > 1 ) {
		throw new Error(
				"Unclosed block directives "
				+ stack.slice( 1 ).map( function ( x ) { return x[ 0 ]; } ) + " in "
				+ templateText );
	}
	return root;
}


// Utilities for debugging parser plugins.

/**
 * Given a template parse tree, returns source text that would parse to that
 * parse tree.  This can be useful for debugging but not required.
 *
 * @param {Array.<string|Array>|string} parseTree as produced by
 *     {@link #parseTemplate}.
 * @param {Object.<string, number>} opt_blockDirectives.
 */
function renderParseTree( parseTree, opt_blockDirectives ) {
	var buffer = [];
	( function render( _, parseTree ) {
		if ( "string" !== typeof parseTree ) {
			var name = parseTree[ 0 ], n = parseTree.length;
			if ( name === "=" && !/\}/.test( parseTree[ 1 ] ) ) {
				buffer.push( "${", parseTree[ 1 ], "}" );
			} else {
				if ( name ) { buffer.push( "{{", name, parseTree[ 1 ], "}}" ); }
				$.each( parseTree.slice( 2 ), render );
				if ( name && ( n !== 2 || !opt_blockDirectives
						 || opt_blockDirectives[ name ] === TRUTHY ) ) {
					buffer.push( "{{/", name, "}}" );
				}
			}
		} else {
			buffer.push( parseTree.replace( /\{([\{#])/, "{{##}$1" ) );
		}
	}( 2, parseTree ) );
	return buffer.join( "" );
}
//-*- mode: js2-mode; indent-tabs-mode: t; tab-width: 2; -*-

/**
 * @fileoverview
 * An efficient backend for the JQuery template compiler
 * based on http://wiki.jqueryui.com/w/page/37898666/Template
 *
 * @author Mike Samuel <mikesamuel@gmail.com>
 */

/**
 * Name of a method of $ that can be used to merge data objects.
 * This is needed because <code>$.extend({}, { x: undefined })</code>
 * will not contain a property named "x" leading <code>${x}</code>
 * to fail with an undefined property error.
 *
 * @const
 */
var EXT_ALL_METHOD_NAME = "extAll";

/**
 * Like $.extend but copies properties whose values are undefined.
 *
 * @param {Object} target
 * @param {...Object} var_args containers of properties to copy into target.
 * @return {Object} target
 */
$[ EXT_ALL_METHOD_NAME ] = function ( target, var_args ) {
	var args = arguments, i, source, k;
	for ( i = 1; i < args.length; ++i ) {
		for ( k in ( source = args[ i ] ) ) {
			target[ k ] = source[ k ];
		}
	}
	return target;
};

/**
 * Compiles the given template parse tree to a function that implements that
 * produces the result of applying that template to data and options passed
 * as parameters to the function.
 *
 * @param { Array.<string|Array> } parseTree
 * @return { function ( Object.<string, *>=, Object.<string, *>= ): !string }
 *     A function that takes an optional a data object and options object and
 *     produces a string output that is the template output.
 */
function compileToFunction( parseTree ) {
	/**
	 * The compilation uses variable names to prevent re-evaluation of expressions
	 * when de-thunking, and to collect the results of loops.
	 * When loops are nested, multiple variables are needed, so this prefix is
	 * used for all variable names.  If it appears in template code, behavior
	 * is undefined.
	 * @const
	 */
	var TEMP_NAME_PREFIX = "$$tmplVar";
	/**
	 * The level of nesting.  Used with TEMP_NAME_PREFIX to generate a variable
	 * name.
	 * @type !number
	 */
	var nestLevel = 0;
	/**
	 * An array to which pieces of the JavaScript function body are pushed.
	 * @type Array.<string>
	 */
	var javaScriptSource = [
			"var " + TEMP_NAME_PREFIX + "0;"
			// Make the options object available
			+ "$item=$item||{};"
			// Make available on the stack, the enumerable properties of the data
			// object, and the enumerable properties of the options object.
			// Data properties should trump options.
			+ "return $.map($.isArray($data)?$data:[$data],function($data){with($data){"

//			=$." + EXT_ALL_METHOD_NAME + "("
//			// Where EcmaScript 5's Object.create is available, use that to prevent
//			// Object.prototype properties from masking globals.
//			+ "Object.create?Object.create(null):{},"
//			+ "$data||{})){"
			// The below compiles the parse tree to an expression that returns a
			// string.
			+ "return(" ];
	/**
	 * An array of all the loop variable and index names in scope
	 * used to propagate variables in scope through {{tmpl}}.
	 * The variable names are stored as "foo:foo" so that the result can be
	 * joined on "," to produce an object literal to extend with the current
	 * data as in <code>$.extend( {}, $data, { <<inScope.join("")>> } )</code>.
	 * @type Array.<string>
	 */
	var inScope = [];
	// True iff the innermost parenthetical group in javaScriptSource's return
	// statement contains a string expression.  If it does not, then sticking
	// "+ foo" at the end would be interpreted as converting "foo" to a number
	// instead of appending foo to whatever is there.
	var hasValue;

	// Walk each parse tree node and append the translation to javaScriptSource.
	$.each(
			parseTree.slice( 2 ),
			function walk( _, parseTree ) {
				// If there was a value before this one, append them.
				if ( hasValue ) {
					javaScriptSource.push( "+" );
				}
				var match;
				if ( "string" === typeof parseTree ) {  // HTML snippet
					// 'foo' -> "\'foo\'"
					javaScriptSource.push( escapeJsValue( parseTree ) );
				} else {
					var kind = parseTree[ 0 ],
							content = parseTree[ 1 ],
							len = parseTree.length,
							tmpName = TEMP_NAME_PREFIX + nestLevel;
					if ( kind === "=" ) {  // ${...} substitution.
						// Make sure that + is string-wise.
						// Specifically, ${1}${2} should not compile to (1 + 2).
						if ( !hasValue ) {
							javaScriptSource.push( "''+" );
						}
						// ${x} -> (tmp0 = (x), 'function' !== typeof tmp0 ? tmp0 : tmp0())
						// The above is often the same as
						// ${x} -> (x)
						// but the real story is more complicated since we have to
						// de-thunkify the expression; if it is a function, we need to
						// call it.
						// By using the temporary value, we are guaranteed to only
						// evaluate the expression once.  This avoids problems with
						// expressions like (arr[i++]) which might return a function
						// the first time but not the second.
						var wrapperStart = "", wrapperEnd = "";
						content = content.replace(
								/(=>[\w.$\[\]]+)+$/, function ( postDethunk ) {
									postDethunk = postDethunk.split( "=>" );
									wrapperEnd = new Array( postDethunk.length ).join( ")" );
									wrapperStart = postDethunk.reverse().join( "(" );
									return "";
								} );
						// To make it easy for passes to rewrite expressions without
						// preventing thunking we convert syntax like
						// "x=>a=>b" into "a(b(x))"
						javaScriptSource.push(
								"(", tmpName, "=(", content, "),",
								wrapperStart,
								"'function'!==typeof ",
								tmpName, "?", tmpName, ":", tmpName, ".call(null,arguments))",
								wrapperEnd );
					} else if ( kind === "if" ) {  // {{if condition}}...{{/if}}
						// {{if a}}b{{else}}c{{/if}} -> (a ? "b" : "c")
						var pos = 2, elseIndex, i, continues = ( hasValue = TRUTHY );
						for ( ; continues; pos = elseIndex + 1 ) {
							elseIndex = len;
							for ( i = pos; i < elseIndex; ++i ) {
								if ( parseTree[ i ][ 0 ] === "else" ) {
									elseIndex = i;
								}
							}
							var cond = pos < len
									? ( pos === 2 ? parseTree : parseTree[ pos - 1 ] )[ 1 ] : "";
							continues = /\S/.test( cond );
							if ( DEBUG && !continues ) {
								if ( pos === 2 ) {
									throw new Error(
											"{{if}} missing condition:"
											+ renderParseTree( parseTree, {} ) );
								} else if ( elseIndex !== len ) {
									throw new Error(
											"{{else}} without condition must be last:"
											+ renderParseTree( parseTree, {} ) );
								}
							}
							// The below handles several cases (assuming we wouldn't have
							// thrown an exception above if DEBUG were true):
							//   pos === 2 && continues  ; {{if cond}}
							//      => ((cond)?(<code-up-to-else-or-end>)
							//   pos > 2 && continues    ; {{else cond}}
							//      => ):((cond)?(<code-up-to-else-or-end)
							//   pos > 2 && !continues   ; {{else}} implicit or othersise
							//      => ):((<code-up-to-else-or-end)
							javaScriptSource.push(
									hasValue ? "" : "''",
									pos === 2 ? "((" : "):(",
									cond, continues ? ")?(" : "" );
							hasValue = FALSEY;
							$.each( parseTree.slice( pos, elseIndex ), walk );
						}
						javaScriptSource.push( hasValue ? "))" : "''))" );
					// {{each (key, value) obj}}...{{/each}}
					} else if ( kind === "each" ) {
						// {{each (k, v) ["one", "two"]}}<li value=${k + 1}>${v}{{/each}}
						// -> (tmp0 = [],
						//     $.each(["one", "two"],
						//     function (k, v) {
						//       tmp0.push("<li value=" + (k + 1) + ">" + v + "</li>");
						//     }),
						//     tmp0.join(""))
						// The first part of the comma operator creates a buffer.
						// Then $.each is called to properly iterate over the container.
						// Each iteration puts a string onto the array.
						// Then after iteration is complete, the last element of the comma
						// operator joins the array.  That joined array is the result of
						// the compiled each operator.
						match = content.match( EACH_DIRECTIVE_CONTENT );
						if ( DEBUG && !match ) {
							throw new Error( "Malformed {{each}} content: " + content );
						}
						var keyVar = match[ 1 ] || DEFAULT_EACH_KEY_VARIABLE_NAME,
								valueVar = match[ 2 ] || DEFAULT_EACH_VALUE_VARIABLE_NAME;
						var containerExpr = match[ 3 ];
						++nestLevel;
						javaScriptSource.push(
								"(", tmpName, "=[],$.each((", containerExpr,
								"),function(", keyVar, ",", valueVar, "){var ",
								TEMP_NAME_PREFIX, nestLevel, ";", tmpName, ".push(" );
						hasValue = FALSEY;
						inScope.push( keyVar + ":" + keyVar, valueVar + ":" + valueVar );
						$.each( parseTree.slice( 2 ), walk );
						inScope.length -= 2;
						if ( !hasValue ) {
							javaScriptSource.push( "''" );
						}
						javaScriptSource.push( ")}),", tmpName, ".join(''))" );
						--nestLevel;
					} else if ( kind === "tmpl" ) {
						// {{tmpl name}}
						//    -> $.template("name").tmpl(arguments[0], arguments[1])
						// {{tmpl #id}}
						//    -> $.template($("#id")).tmpl(arguments[0], arguments[1])
						// {{tmpl({x: y}) foo}}
						//    -> $.template("foo").tmpl({ x: y }, arguments[1])
						// {{tmpl({x: y}, { z: w }) foo}}
						//    -> $.template("foo").tmpl({ x: y }, { z: w })
						// The above is correct in spirit if not literally.  See below.

						match = content.match( TMPL_DIRECTIVE_CONTENT );
						if ( DEBUG && !match ) {
							throw new Error( "Malformed {{tmpl}} content: " + content );
						}
						// The data and options come separated by a comma.
						// Parsing JavaScript expressions to figure out where a comma
						// separates two things is hard, so we use a trick.
						// We create an array that we can index into.  The comma that
						// separates the data from the options then simply becomes a
						// comma in an array constructor.

//This is one way which works, but does on pass in the loop variables or arguments
//var dataAndOptions = match[ 1 ].split(",");
//javaScriptSource.push(
//	"$.template((",
//	match[ 2 ],
//")).tmpl(", dataAndOptions[0], ",", "$.extend({},{parent:$item}," + dataAndOptions[1], "||{}))" );



						var dataAndOptions = match[ 1 ];

						javaScriptSource.push(
								"(", tmpName, "=",
								dataAndOptions
								// The below uses arguments[0], the data passed to the compiled
								// function if dataAndOptions is ", { a: b }".
								// It also uses arguments[1], the options passed to the
								// compiled function if dataAndOptions has no options:
								// "{ a: b }".
								// Note also that dataAndOptions is evaluated before any
								// template selector is resolved as expected from the ordering
								// of those in the content.
								? "$.extend([],arguments,[" + dataAndOptions + "])"
								// Propagate any loop variables in scope when all data is
								// passed.
								: "[,]",
								",$.template(",
								match[ 2 ],
								").tmpl(",
								inScope.length
								? ( "$." + EXT_ALL_METHOD_NAME + "({}," + tmpName + "[0],{" + inScope + "})")
								: tmpName + "[0],",
								"$.extend({},{parent:$item},",tmpName,"[1]||{})))" );


//						javaScriptSource.push(
//								"(", tmpName, "=",
//								dataAndOptions
//								// The below uses arguments[0], the data passed to the compiled
//								// function if dataAndOptions is ", { a: b }".
//								// It also uses arguments[1], the options passed to the
//								// compiled function if dataAndOptions has no options:
//								// "{ a: b }".
//								// Note also that dataAndOptions is evaluated before any
//								// template selector is resolved as expected from the ordering
//								// of those in the content.
//								? "$.extend([],arguments,[" + dataAndOptions + "])"
//								// Propagate any loop variables in scope when all data is
//								// passed.
//								: inScope.length
//								? ( "[$." + EXT_ALL_METHOD_NAME
//										+ "({},$data,{" + inScope + "}),$item]" )
//								// If the content specifies neither data nor options, and
//								// no loop vars are in scope, use the arguments without the
//								// overhead of a call to $.extend.
//								: "arguments",
//								",$.template((",
//								match[ 2 ],
//								")).tmpl(", tmpName, "[0],", tmpName, "[1]))" );

					// {html} and {wrap} are handled by translation to ${...} and ${tmpl}
					// respectively.
					} else {
						if ( DEBUG ) {
							throw new Error(
									"I do not know how to compile "
									+ renderParseTree( parseTree, DEFAULT_BLOCK_DIRECTIVES ) );
						}
					}
				}
				hasValue = TRUTHY;
			} );
	javaScriptSource.push( hasValue ? ")}}).join('');" : "'')})};" );

	if ( DEBUG ) {
		try {
			return Function( "$data", "$item", javaScriptSource.join( "" ) );
		} catch ( ex ) {
			throw new Error( javaScriptSource.join( "" ) );
		}
	} else {
		return Function( "$data", "$item", javaScriptSource.join( "" ) );
	}
}
//-*- mode: js2-mode; indent-tabs-mode: t; tab-width: 2; -*-

/**
 * @fileoverview
 * API methods and builtin compiler passes for JQuery templates
 * based on http://wiki.jqueryui.com/w/page/37898666/Template
 *
 * @author Mike Samuel <mikesamuel@gmail.com>
 */

/**
 * @define {boolean}
 * Can be set to compile a version that does not include the parser
 * usable in environments where all templates have been precompiled.
 */
var JQUERY_TMPL_PRECOMPILED = false;


/**
 * An array of plugin passed, functions that take a parse tree and return
 * a parse tree, to run beore compilation.
 */
$[ TEMPLATE_PLUGINS_PROP_NAME ] = [];

function needsCompile( name ) {
	var tmpl = $[ TEMPLATES_PROP_NAME ][ name ];
	return tmpl && "function" !== typeof tmpl[ TMPL_METHOD_NAME ];
}

/**
 * Compiles the given bundle of parse trees together and stores the compiled
 * results in $.templates.
 *
 * @param parseTrees Mapping of template names to parse trees.
 * @param opt_exclusion Optional name of a template not to store in $.templates.
 */
function compileBundle( parseTrees, opt_exclusion ) {
	var processedNames = {};
	$.each( parseTrees, function process( name, parseTree ) {
		if ( processedNames[ name ] !== TRUTHY ) {
			processedNames[ name ] = TRUTHY;
			// Look at {{tmpl}} calls to produce the minimal set of templates that
			// need to be compiled together.
			$.each( parseTree, function findDeps( _, node ) {
				if ( node[ 0 ] === "tmpl" || node[ 0 ] === "wrap" ) {
					var match = node[ 1 ].match( TMPL_DIRECTIVE_CONTENT );
					if ( match ) {
						// Unpack the template name, e.g. "foo" in {{tmpl "foo"}}.
						var depName = Function( "return " + match[ 2 ] )();
						if ( needsCompile( depName )
								 && processedNames[ depName ] !== TRUTHY ) {
							process(
									depName,
									parseTrees[ depName ] = $[ TEMPLATES_PROP_NAME ][ depName ] );
						}
					}
				}
			} );
		}
	} );
	// Produces a function that will apply all the passes already run to new
	// dependencies so that if a pass pulls in imports, it can bring them
	// up to date.
	function makePrepassCaller( pluginIndex ) {
		return function ( parseTrees ) {
			var i;
			for ( i = 0; i < pluginIndex; ++i ) {
				parseTrees = $[ TEMPLATE_PLUGINS_PROP_NAME ][ i ](
						parseTrees, makePrepassCaller( i ) );
			}
			return parseTrees;
		};
	}
	var result;
	// Apply the passes to parseTrees.
	$.each( makePrepassCaller(
						$[ TEMPLATE_PLUGINS_PROP_NAME ].length )( parseTrees ),
					function ( templateName, parseTree ) {
						var tmplObj = { "tmpl": compileToFunction( parseTree ) };
						if ( templateName !== opt_exclusion ) {
							$[ TEMPLATES_PROP_NAME ][ templateName ] = tmplObj;
						} else {
							result = tmplObj;
						}
					} );
	return result;
}

$[ TEMPLATES_PROP_NAME ] = {};

$[ TEMPLATE_METHOD_NAME ] = function self( name, templateSource ) {
	if ( JQUERY_TMPL_PRECOMPILED ) {
		return $[ TEMPLATES_PROP_NAME ][ name ];
	}
	var templates = $[ TEMPLATES_PROP_NAME ];
	var parseTrees;
	if ( arguments.length === 1 ) {
		if ( name.indexOf( "<" ) + 1 ) {
			return self( null, name );
		}
		if ( needsCompile( name ) ) {
			parseTrees = {};
			parseTrees[ name ] = templates[ name ];
			compileBundle( parseTrees );
		}
		return templates[ name ];
	}
	// We delay compiling until we've got a bunch of definitions together.
	// This allows plugins to process entire template graphs.
	var parseTree = parseTemplate(
			templateSource,
			$.extend( guessBlockDirectives( templateSource ),
								DEFAULT_BLOCK_DIRECTIVES ) );
	if ( name === null ) {
		return compileBundle( parseTrees = { "_": parseTree }, "_" );
	}
	templates[ name ] = parseTree;
};
//-*- mode: js2-mode; indent-tabs-mode: t; tab-width: 2; -*-

/**
 * Maps charcters to the escaped versions for the named escape directives.
 * @type {Object.<string, string>}
 * @private
 */
var escapeMapForHtml = {
	"&": "&amp;",
	"<": "&lt;",
	">": "&gt;"
};

/**
 * A function that can be used with String.replace..
 * @param {string} ch A single character matched by a compatible matcher.
 * @return {string} A token in the output language.
 * @private
 */
function replacerForHtml( ch ) {
	return escapeMapForHtml[ ch ]
			// Intentional assignment that caches the result of encoding ch.
			|| ( escapeMapForHtml[ ch ] = "&#" + ch.charCodeAt( 0 ) + ";" );
}

/**
 * Maps charcters to the escaped versions for the named escape directives.
 * @type {Object.<string, string>}
 * @private
 */
var escapeMapForJs = {
	// We do not escape "\x08" to "\\b" since that means word-break in RegExps.
	"\x09": "\\t",
	"\x0a": "\\n",
	"\x0c": "\\f",
	"\x0d": "\\r",
	"\/": "\\\/",
	"\\": "\\\\"
};

/**
 * A function that can be used with {@code String.replace}.
 * @param {string} ch A single character matched by a compatible matcher.
 * @return {string} A token in the output language.
 * @private
 */
function replacerForJs( ch ) {
	var hex;
	return escapeMapForJs[ ch ]
			|| (
					hex = ch.charCodeAt( 0 ).toString( 16 ),
					// "\u2028" -> "\\u2028" and is cached in escapeMapForJs.
					escapeMapForJs[ ch ] = "\\u0000".substring( 0, 6 - hex.length ) + hex
					);
}

/**
 * Matches characters that need to be escaped for the named directives.
 * @type RegExp
 * @private
 * @const
 */
var htmlSpecialChar = /[\x00"&'<>]/g;

/**
 * Matches characters that need to be escaped for the named directives.
 * @type RegExp
 * @private
 * @const
 */
var jsSpecialChar = /[\x00\x08-\x0d"&'\/<->\\\x85\u2028\u2029]/g;

/**
 * A helper for the Soy directive |escapeHtml
 * @param {*} value Can be of any type but will be coerced to a string.
 * @return {string} The escaped text.
 */
function escapeHtml( value ) {
	return value === undefined
			? "" : String( value ).replace( htmlSpecialChar, replacerForHtml );
}

/**
 * Encodes a value as a JavaScript literal.
 *
 * @param {*} value The value to escape.  May not be a string, but the value
 *     will be coerced to a string.
 * @return {string} A JavaScript code representation of the input.
 */
function escapeJsValue( value ) {
	return "'" + String( value ).replace( jsSpecialChar, replacerForJs ) + "'";
}

/**
 * @const
 * @private
 */
var ENCODE_METHOD_NAME = "encode";
$[ ENCODE_METHOD_NAME ] = escapeHtml;
//-*- mode: js2-mode; indent-tabs-mode: t; tab-width: 2; -*-

/**
 * Simple autoescape mode.
 *
 * @author Mike Samuel <mikesamuel@gmail.com>
 */
 //-*- mode: js2-mode; indent-tabs-mode: t; tab-width: 2; -*-


/**
 * @fileoverview
 * Defines a series of enums which allow us to represent a context in an HTML
 * document as a JavaScript number.
 *
 * @author Mike Samuel <mikesamuel@gmail.com>
 */


/**
 * Outside an HTML tag, directive, or comment.  (Parsed character data).
 * @const
 */
var STATE_HTML_PCDATA = 0;

/**
 * Inside an element whose content is RCDATA where text and entities
 * can appear but where nested elements cannot.
 * The content of {@code <title>} and {@code <textarea>} fall into
 * this category since they cannot contain nested elements in HTML.
 * @const
 */
var STATE_HTML_RCDATA = 1;

/** Just before a tag name.  @const */
var STATE_HTML_BEFORE_TAG_NAME = 2;

/** Inside a tag name.  @const */
var STATE_HTML_TAG_NAME = 3;

/** Before an HTML attribute or the end of a tag.  @const */
var STATE_HTML_TAG = 4;

/** Inside an HTML attribute name.  @const */
var STATE_HTML_ATTRIBUTE_NAME = 5;

/**
 * Following an equals sign (<tt>=</tt>) after an attribute name in an HTML tag.
 * @const
 */
var STATE_HTML_BEFORE_ATTRIBUTE_VALUE = 6;

/** Inside an HTML comment.  @const */
var STATE_HTML_COMMENT = 7;

/** Inside a normal (non-CSS, JS, or URI) HTML attribute value.  @const */
var STATE_HTML_NORMAL_ATTR_VALUE = 8;

/** In CSS content outside a comment, string, or URI.  @const */
var STATE_CSS = 9;

/** In CSS inside a comment.  @const */
var STATE_CSS_COMMENT = 10;

/** In CSS inside a double quoted string.  @const */
var STATE_CSS_DQ_STRING = 11;

/** In CSS inside a single quoted string.  @const */
var STATE_CSS_SQ_STRING = 12;

/** In CSS in a URI terminated by the first close parenthesis.  @const */
var STATE_CSS_URI = 13;

/** In CSS in a URI terminated by the first double quote.  @const */
var STATE_CSS_DQ_URI = 14;

/** In CSS in a URI terminated by the first single quote.  @const */
var STATE_CSS_SQ_URI = 15;

/** In JavaScript, outside a comment, string, or Regexp literal.  @const */
var STATE_JS = 16;

/** In JavaScript inside a line comment.  @const */
var STATE_JS_LINE_COMMENT = 17;

/** In JavaScript inside a block comment.  @const */
var STATE_JS_BLOCK_COMMENT = 18;

/** In JavaScript inside a double quoted string.  @const */
var STATE_JS_DQ_STRING = 19;

/** In JavaScript inside a single quoted string.  @const */
var STATE_JS_SQ_STRING = 20;

/** In JavaScript inside a regular expression literal.  @const */
var STATE_JS_REGEX = 21;

/** In an HTML attribute whose content is a URI.  @const */
var STATE_URI = 22;

/** Not inside any valid HTML/CSS/JS construct.  @const */
var STATE_ERROR = 23;

/** All of the state bits set.  @const */
var STATE_ALL = 31;
function stateOf( context ) { return context & STATE_ALL; }

function isErrorContext( context ) {
	return stateOf( context ) === STATE_ERROR;
}


/** A type of HTML element. */

/** No element.  @const */
var ELEMENT_TYPE_NONE = 0;

/** A script element whose content is raw JavaScript.  @const */
var ELEMENT_TYPE_SCRIPT = 1 << 5;

/** A style element whose content is raw CSS.  @const */
var ELEMENT_TYPE_STYLE = 2 << 5;

/**
 * A textarea element whose content is encoded HTML but which cannot contain
 * elements.
 * @const
 */
var ELEMENT_TYPE_TEXTAREA = 3 << 5;

/**
 * A title element whose content is encoded HTML but which cannot contain
 * elements.
 * @const
 */
var ELEMENT_TYPE_TITLE = 4 << 5;

/** A listing element whose content is raw CDATA.  @const */
var ELEMENT_TYPE_LISTING = 5 << 5;

/** An XMP element whose content is raw CDATA.  @const */
var ELEMENT_TYPE_XMP = 6 << 5;

/**
 * An element whose content is normal mixed PCDATA and child elements.
 * @const
 */
var ELEMENT_TYPE_NORMAL = 7 << 5;

/** All of the element bits set.  @const */
var ELEMENT_TYPE_ALL = 7 << 5;
function elementTypeOf( context ) { return context & ELEMENT_TYPE_ALL; }


/** Describes the content of an HTML attribute. */

/** No attribute.  @const */
var ATTR_TYPE_NONE = 0;

/** Mime-type text/javascript.  @const */
var ATTR_TYPE_SCRIPT = 1 << 8;

/** Mime-type text/css.  @const */
var ATTR_TYPE_STYLE = 2 << 8;

/** A URI or URI reference.  @const */
var ATTR_TYPE_URI = 3 << 8;

/**
 * Other content.  Human readable or other non-structured plain text or keyword
 * values.
 * @const
 */
var ATTR_TYPE_PLAIN_TEXT = 4 << 8;

/** All of the attribute type bits set.  @const */
var ATTR_TYPE_ALL = 7 << 8;
function attrTypeOf( context ) { return context & ATTR_TYPE_ALL; }


/**
 * Describes the content that will end the current HTML attribute.
 */

/** Not in an attribute.  @const */
var DELIM_TYPE_NONE = 0;

/** {@code "}  @const */
var DELIM_TYPE_DOUBLE_QUOTE = 1 << 11;

/** {@code '}  @const */
var DELIM_TYPE_SINGLE_QUOTE = 2 << 11;

/** A space or {@code >} symbol.  @const */
var DELIM_TYPE_SPACE_OR_TAG_END = 3 << 11;

/** All of the delimiter type bits set.  @const */
var DELIM_TYPE_ALL = 3 << 11;
function delimTypeOf( context ) { return context & DELIM_TYPE_ALL; }


/**
 * Describes what a slash ({@code /}) means when parsing JavaScript
 * source code.  A slash that is not followed by another slash or an
 * asterisk (<tt>*</tt>) can either start a regular expression literal
 * or start a division operator.
 * This determination is made based on the full grammar, but Waldemar
 * defined a very close to accurate grammar for a JavaScript 1.9 draft
 * based purely on a regular lexical grammar which is what we use in
 * the autoescaper.
 *
 * @see #isRegexPreceder
 */

/** Not in JavaScript.  @const */
var JS_FOLLOWING_SLASH_NONE = 0;

/**
 * A slash as the next token would start a regular expression literal.
 * @const
 */
var JS_FOLLOWING_SLASH_REGEX = 1 << 13;

/** A slash as the next token would start a division operator.  @const */
var JS_FOLLOWING_SLASH_DIV_OP = 2 << 13;

/**
 * We do not know what a slash as the next token would start so it is
 * an error for the next token to be a slash.
 * @const
 */
var JS_FOLLOWING_SLASH_UNKNOWN = 3 << 13;

/** All of the JS following slash bits set.  @const */
var JS_FOLLOWING_SLASH_ALL = 3 << 13;
function jsFollowingSlashOf( context ) {
	return context & JS_FOLLOWING_SLASH_ALL;
}


/**
 * Describes the part of a URI reference that the context point is in.
 *
 * <p>
 * We need to distinguish these so that we can<ul>
 *   <li>normalize well-formed URIs that appear before the query,</li>
 *   <li>encode raw values interpolated as query parameters or keys,</li>
 *   <li>filter out values that specify a scheme like {@code javascript:}.
 * </ul>
 */

/** Not in a URI.  @const */
var URI_PART_NONE = 0;

/**
 * Where a scheme might be seen.  At ^ in {@code ^http://host/path?k=v#frag}.
 * @const
 */
var URI_PART_START = 1 << 15;

/**
 * In the scheme, authority, or path.
 * Between ^s in {@code h^ttp://host/path^?k=v#frag}.
 * @const
 */
var URI_PART_PRE_QUERY = 2 << 15;

/**
 * In the query portion.  Between ^s in {@code http://host/path?^k=v^#frag}.
 * @const
 */
var URI_PART_QUERY = 3 << 15;

/** In the fragment.  After ^ in {@code http://host/path?k=v#^frag}.  @const */
var URI_PART_FRAGMENT = 4 << 15;

/**
 * Not {@link #NONE} or {@link #FRAGMENT}, but unknown.  Used to join different
 * contexts.
 * @const
 */
var URI_PART_UNKNOWN_PRE_FRAGMENT = 5 << 15;

/** Not {@link #NONE}, but unknown.  Used to join different contexts.  @const */
var URI_PART_UNKNOWN = 6 << 15;

/** All of the URI part bits set.  @const */
var URI_PART_ALL = 7 << 15;
function uriPartOf( context ) { return context & URI_PART_ALL; }


var DELIM_TEXT = {};
DELIM_TEXT[ DELIM_TYPE_DOUBLE_QUOTE ] = "\"";
DELIM_TEXT[ DELIM_TYPE_SINGLE_QUOTE ] = "'";
DELIM_TEXT[ DELIM_TYPE_SPACE_OR_TAG_END ] = "";

/** Encodes HTML special characters.  @const */
var ESC_MODE_ESCAPE_HTML = 0;

/**
 * Like {@link #ESCAPE_HTML} but normalizes known safe HTML since RCDATA can't
 * contain tags.
 * @const
 */
var ESC_MODE_ESCAPE_HTML_RCDATA = 1;

/**
 * Encodes HTML special characters, including quotes, so that the
 * value can appear as part of a quoted attribute value.  This differs
 * from {@link #ESCAPE_HTML} in that it strips tags from known safe
 * HTML.
 * @const
 */
var ESC_MODE_ESCAPE_HTML_ATTRIBUTE = 2;

/**
 * Encodes HTML special characters and spaces so that the value can
 * appear as part of an unquoted attribute.
 * @const
 */
var ESC_MODE_ESCAPE_HTML_ATTRIBUTE_NOSPACE = 3;

/**
 * Only allow a valid identifier - letters, numbers, dashes, and underscores.
 * Throws an exception otherwise.
 * @const
 */
var ESC_MODE_FILTER_HTML_ELEMENT_NAME = 4;

/**
 * Only allow a valid identifier - letters, numbers, dashes, and underscores.
 * Throws an exception otherwise.
 * @const
 */
var ESC_MODE_FILTER_HTML_ATTRIBUTE = 5;

/**
 * Encode all HTML special characters and quotes, and JS newlines as
 * if to allow them to appear literally in a JS string.
 * @const
 */
var ESC_MODE_ESCAPE_JS_STRING = 6;

/**
 * If a number or boolean, output as a JS literal.  Otherwise surround
 * in quotes and escape.  Make sure all HTML and space characters are
 * quoted.
 * @const
 */
var ESC_MODE_ESCAPE_JS_VALUE = 7;

/**
 * Like {@link #ESCAPE_JS_STRING} but additionally escapes RegExp specials like
 * <code>.+*?$^[](){}</code>.
 * @const
 */
var ESC_MODE_ESCAPE_JS_REGEX = 8;

/**
 * Must escape all quotes, newlines, and the close parenthesis using
 * {@code \} followed by hex followed by a space.
 * @const
 */
var ESC_MODE_ESCAPE_CSS_STRING = 9;

/**
 * If the value is numeric, renders it as a numeric value so that
 * <code>{$n}px</code> works as expected, otherwise if it is a valid
 * CSS identifier, outputs it without escaping, otherwise surrounds in
 * quotes and escapes like {@link #ESCAPE_CSS_STRING}.
 * @const
 */
var ESC_MODE_FILTER_CSS_VALUE = 10;

/**
 * Percent encode all URI special characters and characters that
 * cannot appear unescaped in a URI such as spaces.  Make sure to
 * encode pluses and parentheses.
 * This corresponds to the JavaScript function {@code encodeURIComponent}.
 * @const
 */
var ESC_MODE_ESCAPE_URI = 11;

/**
 * Percent encode non-URI characters that cannot appear unescaped in a
 * URI such as spaces, and encode characters that are not special in
 * URIs that are special in languages that URIs are embedded in such
 * as parentheses and quotes.  This corresponds to the JavaScript
 * function {@code encodeURI} but additionally encodes quotes
 * parentheses, and percent signs that are not followed by two hex
 * digits.
 * @const
 */
var ESC_MODE_NORMALIZE_URI = 12;

/**
 * Like {@link #NORMALIZE_URI}, but filters out schemes like {@code javascript:}
 * that load code.
 * @const
 */
var ESC_MODE_FILTER_NORMALIZE_URI = 13;

/**
 * The explicit rejection of escaping.
 * @const
 */
var ESC_MODE_NO_AUTOESCAPE = 14;

var IS_ESC_MODE_HTML_EMBEDDABLE = [];
IS_ESC_MODE_HTML_EMBEDDABLE[ ESC_MODE_ESCAPE_HTML ] = TRUTHY;
IS_ESC_MODE_HTML_EMBEDDABLE[ ESC_MODE_ESCAPE_HTML_RCDATA ] = TRUTHY;
IS_ESC_MODE_HTML_EMBEDDABLE[ ESC_MODE_ESCAPE_HTML_ATTRIBUTE ] = TRUTHY;
IS_ESC_MODE_HTML_EMBEDDABLE[ ESC_MODE_ESCAPE_HTML_ATTRIBUTE_NOSPACE ] = TRUTHY;
IS_ESC_MODE_HTML_EMBEDDABLE[ ESC_MODE_FILTER_HTML_ELEMENT_NAME ] = TRUTHY;
IS_ESC_MODE_HTML_EMBEDDABLE[ ESC_MODE_FILTER_HTML_ATTRIBUTE ] = TRUTHY;
//IS_ESC_MODE_HTML_EMBEDDABLE[ESC_MODE_ESCAPE_JS_STRING] = FALSEY;
//IS_ESC_MODE_HTML_EMBEDDABLE[ESC_MODE_ESCAPE_JS_VALUE] = FALSEY;
//IS_ESC_MODE_HTML_EMBEDDABLE[ESC_MODE_ESCAPE_JS_REGEX] = FALSEY;
IS_ESC_MODE_HTML_EMBEDDABLE[ ESC_MODE_ESCAPE_CSS_STRING ] = TRUTHY;
//IS_ESC_MODE_HTML_EMBEDDABLE[ESC_MODE_FILTER_CSS_VALUE] = FALSEY;
IS_ESC_MODE_HTML_EMBEDDABLE[ ESC_MODE_ESCAPE_URI ] = TRUTHY;
//IS_ESC_MODE_HTML_EMBEDDABLE[ESC_MODE_NORMALIZE_URI] = FALSEY;
//IS_ESC_MODE_HTML_EMBEDDABLE[ESC_MODE_FILTER_NORMALIZE_URI] = FALSEY;
//IS_ESC_MODE_HTML_EMBEDDABLE[ESC_MODE_NO_AUTOESCAPE] = FALSEY;

/**
 * A snippet of HTML that does not start or end inside a tag, comment, entity,
 * or DOCTYPE; and that does not contain any executable code
 * (JS, {@code <object>}s, etc.) from a different trust domain.
 * @const
 */
var CONTENT_KIND_HTML = 0;

/**
 * A sequence of code units that can appear between quotes (either kind) in a
 * JS program without causing a parse error, and without causing any side
 * effects.
 * <p>
 * The content should not contain unescaped quotes, newlines, or anything else
 * that would cause parsing to fail or to cause a JS parser to finish the
 * string it's parsing inside the content.
 * <p>
 * The content must also not end inside an escape sequence ; no partial octal
 * escape sequences or odd number of '{@code \}'s at the end.
 * @const
 */
var CONTENT_KIND_JS_STR_CHARS = 1;

/** A properly encoded portion of a URI.  @const */
var CONTENT_KIND_URI = 2;


var CONTENT_KIND_FOR_ESC_MODE = [];
CONTENT_KIND_FOR_ESC_MODE[ ESC_MODE_ESCAPE_HTML ] = CONTENT_KIND_HTML;
//CONTENT_KIND_FOR_ESC_MODE[ESC_MODE_ESCAPE_HTML_RCDATA] = null;
//CONTENT_KIND_FOR_ESC_MODE[ESC_MODE_ESCAPE_HTML_ATTRIBUTE] = null;
//CONTENT_KIND_FOR_ESC_MODE[ESC_MODE_ESCAPE_HTML_ATTRIBUTE_NOSPACE] = null;
//CONTENT_KIND_FOR_ESC_MODE[ESC_MODE_FILTER_HTML_ELEMENT_NAME] = null;
//CONTENT_KIND_FOR_ESC_MODE[ESC_MODE_FILTER_HTML_ATTRIBUTE_NAME] = null;
CONTENT_KIND_FOR_ESC_MODE[ ESC_MODE_ESCAPE_JS_STRING ]
		= CONTENT_KIND_JS_STR_CHARS;
CONTENT_KIND_FOR_ESC_MODE[ ESC_MODE_NORMALIZE_URI ] = CONTENT_KIND_URI;
CONTENT_KIND_FOR_ESC_MODE[ ESC_MODE_ESCAPE_URI ] = CONTENT_KIND_URI;
//CONTENT_KIND_FOR_ESC_MODE[ESC_MODE_ESCAPE_JS_VALUE] = null;
//CONTENT_KIND_FOR_ESC_MODE[ESC_MODE_ESCAPE_JS_REGEX] = null;
//CONTENT_KIND_FOR_ESC_MODE[ESC_MODE_ESCAPE_CSS_STRING] = null;
//CONTENT_KIND_FOR_ESC_MODE[ESC_MODE_FILTER_CSS_VALUE] = null;
CONTENT_KIND_FOR_ESC_MODE[ ESC_MODE_FILTER_NORMALIZE_URI ] = CONTENT_KIND_URI;
//CONTENT_KIND_FOR_ESC_MODE[ESC_MODE_NO_AUTOESCAPE] = null;

var ESC_MODE_FOR_STATE = [];
ESC_MODE_FOR_STATE[ STATE_HTML_PCDATA ] = ESC_MODE_ESCAPE_HTML;
ESC_MODE_FOR_STATE[ STATE_HTML_RCDATA ] = ESC_MODE_ESCAPE_HTML_RCDATA;
ESC_MODE_FOR_STATE[ STATE_HTML_BEFORE_TAG_NAME ]
		= ESC_MODE_FILTER_HTML_ELEMENT_NAME;
ESC_MODE_FOR_STATE[ STATE_HTML_TAG_NAME ] = ESC_MODE_FILTER_HTML_ELEMENT_NAME;
ESC_MODE_FOR_STATE[ STATE_HTML_TAG ] = ESC_MODE_FILTER_HTML_ATTRIBUTE;
ESC_MODE_FOR_STATE[ STATE_HTML_ATTRIBUTE_NAME ] = ESC_MODE_FILTER_HTML_ATTRIBUTE;
//ESC_MODE_FOR_STATE[STATE_HTML_BEFORE_ATTRIBUTE_VALUE] = void 0;
ESC_MODE_FOR_STATE[ STATE_HTML_COMMENT ] = ESC_MODE_ESCAPE_HTML_RCDATA;
ESC_MODE_FOR_STATE[ STATE_HTML_NORMAL_ATTR_VALUE ]
		= ESC_MODE_ESCAPE_HTML_ATTRIBUTE;
ESC_MODE_FOR_STATE[ STATE_CSS ] = ESC_MODE_FILTER_CSS_VALUE;
//ESC_MODE_FOR_STATE[STATE_CSS_COMMENT] = void 0;
ESC_MODE_FOR_STATE[ STATE_CSS_DQ_STRING ] = ESC_MODE_ESCAPE_CSS_STRING;
ESC_MODE_FOR_STATE[ STATE_CSS_SQ_STRING ] = ESC_MODE_ESCAPE_CSS_STRING;
ESC_MODE_FOR_STATE[ STATE_CSS_URI ] = ESC_MODE_NORMALIZE_URI;
ESC_MODE_FOR_STATE[ STATE_CSS_DQ_URI ] = ESC_MODE_NORMALIZE_URI;
ESC_MODE_FOR_STATE[ STATE_CSS_SQ_URI ] = ESC_MODE_NORMALIZE_URI;
ESC_MODE_FOR_STATE[ STATE_JS ] = ESC_MODE_ESCAPE_JS_VALUE;
//ESC_MODE_FOR_STATE[STATE_JS_LINE_COMMENT] = void 0;
//ESC_MODE_FOR_STATE[STATE_JS_BLOCK_COMMENT] = void 0;
ESC_MODE_FOR_STATE[ STATE_JS_DQ_STRING ] = ESC_MODE_ESCAPE_JS_STRING;
ESC_MODE_FOR_STATE[ STATE_JS_SQ_STRING ] = ESC_MODE_ESCAPE_JS_STRING;
ESC_MODE_FOR_STATE[ STATE_JS_REGEX ] = ESC_MODE_ESCAPE_JS_REGEX;
ESC_MODE_FOR_STATE[ STATE_URI ] = ESC_MODE_ESCAPE_HTML_ATTRIBUTE;


//-*- mode: js2-mode; indent-tabs-mode: t; tab-width: 2; -*-

/**
 * @fileoverview
 * Definitions of sanitization functions and sanitized content wrappers.
 * See http://js-quasis-libraries-and-repl.googlecode.com/svn/trunk/safetemplate.html#sanitization_functions
 * for definitions of sanitization functions and sanitized content wrappers.
 *
 * <p>
 * These sanitization functions correspond to values of the ESC_MODE_* enum
 * defined in "context-defs.js".
 * <p>
 * Sanitization functions need to be reachable by compiled functions.
 * In production mode, they can be accessed by their ESC_MODE_* value as
 * {@code $.encode[escMode]}.
 * In debug mode, they can be accessed by function name:
 * {@code $.encode.escapeJsValue}.
 */


/**
 * The name of the property that contains sanitized content in a sanitized
 * content wrapper.
 * This is a string stored in a constant so that it can be used in JSON
 * revivers.
 * @const
 */
var CONTENT_PROPNAME = "content";

/**
 * The name of the property that contains a CONTENT_KIND_* enum value.
 * This is a string stored in a constant so that it can be used in JSON
 * revivers.
 * @const
 */
var CONTENT_KIND_PROPNAME = "contentKind";

/**
 * A string-like object that carries a content-type.
 * @constructor
 * @private
 */
function SanitizedContent() {}

/**
 * @return {string}
 * @override
 */
SanitizedContent.prototype.toString = function() {
	return this[ CONTENT_PROPNAME ];
};

/**
 * @param {number!} contentKind
 */
function defineSanitizedContentSubclass( contentKind ) {
	/**
	 * @param {string!} content
	 * @constructor
	 */
	function SanitizedContentCtor( content ) {
		this[ CONTENT_PROPNAME ] = content;
	}

	/** @type {SanitizedContent} */
	var proto = ( SanitizedContentCtor.prototype = new SanitizedContent() );
	proto.constructor = SanitizedContentCtor;

	/** @override */
	proto[ CONTENT_KIND_PROPNAME ] = CONTENT_KIND_HTML;

	return SanitizedContentCtor;
}


/**
 * Content of type {@link CONTENT_KIND_HTML}.
 * @constructor
 * @extends SanitizedContent
 * @param {string!} content A string of HTML that can safely be embedded in
 *     a PCDATA context in your app.  If you would be surprised to find that an
 *     HTML sanitizer produced {@code s} (e.g. it runs code or fetches bad URLs)
 *     and you wouldn't write a template that produces {@code s} on security or
 *     privacy grounds, then don't pass {@code s} here.
 */
var SanitizedHtml = defineSanitizedContentSubclass( CONTENT_KIND_HTML );


/**
 * Content of type {@link CONTENT_KIND_JS_STR_CHARS}.
 * @constructor
 * @extends SanitizedContent
 * @param {string!} content A string of JS that when evaled, produces a
 *     value that does not depend on any sensitive data and has no side effects
 *     <b>OR</b> a string of JS that does not reference any variables or have
 *     any side effects not known statically to the app authors.
 */
var SanitizedJsStrChars
		= defineSanitizedContentSubclass( CONTENT_KIND_JS_STR_CHARS );


/**
 * Content of type {@link CONTENT_KIND_URI}.
 * @constructor
 * @extends SanitizedContent
 * @param {string!} content A chunk of URI that the caller knows is safe to
 *     emit in a template.
 */
var SanitizedUri = defineSanitizedContentSubclass( CONTENT_KIND_URI );


// exports
window[ "SanitizedHtml" ] = SanitizedHtml;
window[ "SanitizedJsStrChars" ] = SanitizedJsStrChars;
window[ "SanitizedUri" ] = SanitizedUri;


/**
 * Escapes HTML special characters in a string.  Escapes double quote '"' in
 * addition to '&', '<', and '>' so that a string can be included in an HTML
 * tag attribute value within double quotes.
 * Will emit known safe HTML as-is.
 *
 * @param {*} value The string-like value to be escaped.  May not be a string,
 *     but the value will be coerced to a string.
 * @return {string|SanitizedHtml} An escaped version of value.
 */
function escapeHtml( value ) {
	if ( value && value[ CONTENT_KIND_PROPNAME ] === CONTENT_KIND_HTML ) {
		return /** @type {SanitizedHtml} */ ( value );
	} else if ( value instanceof Array ) {
		return value.map( escapeHtml ).join( "" );
	} else if ( value === void 0 ) {
		return "";
	} else {
		return escapeHtmlHelper( value );
	}
}


/**
 * Escapes HTML special characters in a string so that it can be embedded in
 * RCDATA.
 * <p>
 * Escapes HTML special characters so that the value will not prematurely end
 * the body of a tag like {@code <textarea>} or {@code <title>}.  RCDATA tags
 * cannot contain other HTML entities, so it is not strictly necessary to escape
 * HTML special characters except when part of that text looks like an HTML
 * entity or like a close tag : {@code </textarea>}.
 * <p>
 * Will normalize known safe HTML to make sure that sanitized HTML (which could
 * contain an innocuous {@code </textarea>} don't prematurely end an RCDATA
 * element.
 *
 * @param {*} value The string-like value to be escaped.  May not be a string,
 *     but the value will be coerced to a string.
 * @return {string} An escaped version of value.
 */
function escapeHtmlRcdata( value ) {
	if ( value && value[ CONTENT_KIND_PROPNAME ] === CONTENT_KIND_HTML ) {
		return normalizeHtmlHelper( value[ CONTENT_PROPNAME ] );
	}
	return escapeHtmlHelper( value );
}


/**
 * Removes HTML tags from a string of known safe HTML so it can be used as an
 * attribute value.
 *
 * @param {*} value The HTML to be escaped.  May not be a string, but the
 *     value will be coerced to a string.
 * @return {string} A representation of value without tags, HTML comments, or
 *     other content.
 */
function stripHtmlTags( value ) {
	return String( value ).replace( HTML_TAG_REGEX_, "" );
}


/**
 * Escapes HTML special characters in an HTML attribute value.
 *
 * @param {*} value The HTML to be escaped.  May not be a string, but the
 *     value will be coerced to a string.
 * @return {string} An escaped version of value.
 */
function escapeHtmlAttribute( value ) {
	if ( value && value[ CONTENT_KIND_PROPNAME ] === CONTENT_KIND_HTML ) {
		return normalizeHtmlHelper( stripHtmlTags( value[ CONTENT_PROPNAME ] ) );
	}
	return escapeHtmlHelper( value );
}


/**
 * Escapes HTML special characters in a string including space and other
 * characters that can end an unquoted HTML attribute value.
 *
 * @param {*} value The HTML to be escaped.  May not be a string, but the
 *     value will be coerced to a string.
 * @return {string} An escaped version of value.
 */
function escapeHtmlAttributeNospace( value ) {
	if ( value && value[ CONTENT_KIND_PROPNAME ] === CONTENT_KIND_HTML ) {
		return normalizeHtmlNospaceHelper(
				stripHtmlTags( value[ CONTENT_PROPNAME ] ) );
	}
	return escapeHtmlNospaceHelper( value );
}


/**
 * Filters out strings that cannot be a substring of a valid HTML attribute.
 *
 * @param {*} value The value to escape.  May not be a string, but the value
 *     will be coerced to a string.
 * @return {string} A valid HTML attribute name part or name/value pair.
 *     {@code "zSafehtmlz"} if the input is invalid.
 */
function filterHtmlAttribute( value ) {
	var str = filterHtmlAttributeHelper( value );
	var ch, eq = str.indexOf( "=" );
	return eq >= 0 && ( ch = str.charAt( str.length - 1 ) ) != "\"" && ch != "'"
			// Quote any attribute values so that a contextually autoescaped whole
			// attribute does not end up having a following value associated with
			// it.
			// The contextual autoescaper, since it propagates context left to
			// right, is unable to distinguish
			//     <div {$x}>
			// from
			//     <div {$x}={$y}>.
			// If {$x} is "dir=ltr", and y is "foo" make sure the parser does not
			// see the attribute "dir=ltr=foo".
			? str.substring( 0, eq + 1 ) + "\"" + str.substring( eq + 1 ) + "\""
			: str;
}


/**
 * Filters out strings that cannot be a substring of a valid HTML element name.
 *
 * @param {*} value The value to escape.  May not be a string, but the value
 *     will be coerced to a string.
 * @return {string} A valid HTML element name part.
 *     {@code "zSafehtmlz"} if the input is invalid.
 */
function filterHtmlElementName( value ) {
	return filterHtmlElementNameHelper( value );
}


/**
 * Escapes characters in the value to make it valid content for a JS string
 * literal.
 *
 * @param {*} value The value to escape.  May not be a string, but the value
 *     will be coerced to a string.
 * @return {string} An escaped version of value.
 */
function escapeJsString( value ) {
	if ( value && value[ CONTENT_KIND_PROPNAME ] === CONTENT_KIND_JS_STR_CHARS ) {
		return value[ CONTENT_PROPNAME ];
	}
	return escapeJsStringHelper( value );
}


/**
 * Encodes a value as a JavaScript literal.
 *
 * @param {*} value The value to escape.  May not be a string, but the value
 *     will be coerced to a string.
 * @return {string} A JavaScript code representation of the input.
 */
function escapeJsValue( value ) {
	// We surround values with spaces so that they can't be interpolated into
	// identifiers by accident.
	// We could use parentheses but those might be interpreted as a function call.
	var type;
	return value == null  // Intentionally matches undefined.
			// We always output null for compatibility with Java/python server side
			// frameworks which do not have a distinct undefined value.
			? " null "
			: ( type = typeof value ) == "boolean" || type == "number"
				? " " + value + " "
				: "'" + escapeJsString( value ) + "'";
}


/**
 * Escapes characters in the string to make it valid content for a JS regular
 * expression literal.
 *
 * @param {*} value The value to escape.  May not be a string, but the value
 *     will be coerced to a string.
 * @return {string} An escaped version of value.
 */
function escapeJsRegex( value ) {
	return escapeJsRegexHelper( value );
}


/**
 * Matches all URI mark characters that conflict with HTML attribute delimiters
 * or that cannot appear in a CSS uri.
 * From <a href="http://www.w3.org/TR/CSS2/grammar.html">G.2: CSS grammar</a>
 * <pre>
 *     url        ([!#$%&*-~]|{nonascii}|{escape})*
 * </pre>
 *
 * @type {RegExp}
 * @private
 */
var problematicUriMarks_ = /['()]/g;

/**
 * @param {string} ch A single character in {@link problematicUriMarks_}.
 * @return {string}
 * @private
 */
function pctEncode_( ch ) {
	return "%" + ch.charCodeAt( 0 ).toString( 16 );
}

/**
 * Escapes a string so that it can be safely included in a URI.
 *
 * @param {*} value The value to escape.  May not be a string, but the value
 *     will be coerced to a string.
 * @return {string} An escaped version of value.
 */
function escapeUri( value ) {
	if ( value && value[ CONTENT_KIND_PROPNAME ] === CONTENT_KIND_URI ) {
		return normalizeUri( value );
	}
	// Apostophes and parentheses are not matched by encodeURIComponent.
	// They are technically special in URIs, but only appear in the obsolete mark
	// production in Appendix D.2 of RFC 3986, so can be encoded without changing
	// semantics.
	var encoded = encodeURIComponent( /** @type {string} */ ( value ) );
	return encoded.replace( problematicUriMarks_, pctEncode_ );
}


/**
 * Removes rough edges from a URI by escaping any raw HTML/JS string delimiters.
 *
 * @param {*} value The value to escape.  May not be a string, but the value
 *     will be coerced to a string.
 * @return {string} An escaped version of value.
 */
function normalizeUri( value ) {
	value = String( value );
	if ( /[\0- "<>\\{}\x7f\x85\xa0\u2028\u2029\uff00-\uffff]|%(?![a-f0-9]{2})/i
			.test( value ) ) {
		var parts = value.split( /(%[a-f0-9]{2}|[#$&+,/:;=?@\[\]])/i );
		for ( var i = parts.length - 1; i >= 0; i -= 2 ) {
			parts[ i ] = encodeURIComponent( parts[ i ] );
		}
		value = parts.join( "" );
	}
	return value.replace( problematicUriMarks_, pctEncode_ );
}


/**
 * Vets a URI's protocol and removes rough edges from a URI by escaping
 * any raw HTML/JS string delimiters.
 *
 * @param {*} value The value to escape.  May not be a string, but the value
 *     will be coerced to a string.
 * @return {string} An escaped version of value.
 */
function filterNormalizeUri( value ) {
	var str = String( value );
	if ( !FILTER_FOR_FILTER_NORMALIZE_URI_.test( str ) ) {
		return "#zSafehtmlz";
	} else {
		return normalizeUri( str );
	}
}


/**
 * Escapes a string so it can safely be included inside a quoted CSS string.
 *
 * @param {*} value The value to escape.  May not be a string, but the value
 *     will be coerced to a string.
 * @return {string} An escaped version of value.
 */
function escapeCssString( value ) {
	return escapeCssStringHelper( value );
}


/**
 * Encodes a value as a CSS identifier part, keyword, or quantity.
 *
 * @param {*} value The value to escape.  May not be a string, but the value
 *     will be coerced to a string.
 * @return {string} A safe CSS identifier part, keyword, or quanitity.
 */
function filterCssValue( value ) {
	// Uses == to intentionally match null and undefined for Java compatibility.
	if ( value == null ) {
		return "";
	}
	return filterCssValueHelper( value );
}



// -----------------------------------------------------------------------------
// Generated code.


// START GENERATED CODE FOR ESCAPERS.

/**
 * Maps charcters to the escaped versions for the named escape directives.
 * @type {Object.<string, string>}
 * @private
 */
var ESCAPE_MAP_FOR_ESCAPE_HTML__AND__NORMALIZE_HTML__AND__ESCAPE_HTML_NOSPACE__AND__NORMALIZE_HTML_NOSPACE_ = {
	"&": "&amp;",
	"<": "&lt;",
	">": "&gt;"
};

/**
 * A function that can be used with String.replace..
 * @param {string} ch A single character matched by a compatible matcher.
 * @return {string} A token in the output language.
 * @private
 */
function REPLACER_FOR_ESCAPE_HTML__AND__NORMALIZE_HTML__AND__ESCAPE_HTML_NOSPACE__AND__NORMALIZE_HTML_NOSPACE_( ch ) {
	return ESCAPE_MAP_FOR_ESCAPE_HTML__AND__NORMALIZE_HTML__AND__ESCAPE_HTML_NOSPACE__AND__NORMALIZE_HTML_NOSPACE_[ ch ]
			|| ( ESCAPE_MAP_FOR_ESCAPE_HTML__AND__NORMALIZE_HTML__AND__ESCAPE_HTML_NOSPACE__AND__NORMALIZE_HTML_NOSPACE_[ ch ] = "&#" + ch.charCodeAt( 0 ) + ";" );
}

/**
 * Maps charcters to the escaped versions for the named escape directives.
 * @type {Object.<string, string>}
 * @private
 */
var ESCAPE_MAP_FOR_ESCAPE_JS_STRING__AND__ESCAPE_JS_REGEX_ = {
	// We do not escape "\x08" to "\\b" since that means word-break in RegExps.
	"\x09": "\\t",
	"\x0a": "\\n",
	"\x0c": "\\f",
	"\x0d": "\\r",
	"\/": "\\\/",
	"\\": "\\\\"
};

/**
 * A function that can be used with String.replace..
 * @param {string} ch A single character matched by a compatible matcher.
 * @return {string} A token in the output language.
 * @private
 */
function REPLACER_FOR_ESCAPE_JS_STRING__AND__ESCAPE_JS_REGEX_( ch ) {
	var hex;
	return ESCAPE_MAP_FOR_ESCAPE_JS_STRING__AND__ESCAPE_JS_REGEX_[ ch ]
			|| (
					hex = ch.charCodeAt( 0 ).toString( 16 ),
					// "\u2028" -> "\\u2028" and is cached in escapeMapForJs.
					ESCAPE_MAP_FOR_ESCAPE_JS_STRING__AND__ESCAPE_JS_REGEX_[ ch ]
							= "\\u0000".substring( 0, 6 - hex.length ) + hex
					);
}

/**
 * Maps charcters to the escaped versions for the named escape directives.
 * @type {Object.<string, string>}
 * @private
 */
var ESCAPE_MAP_FOR_ESCAPE_CSS_STRING_ = {};

/**
 * A function that can be used with String.replace..
 * @param {string} ch A single character matched by a compatible matcher.
 * @return {string} A token in the output language.
 * @private
 */
function REPLACER_FOR_ESCAPE_CSS_STRING_( ch ) {
	return ESCAPE_MAP_FOR_ESCAPE_CSS_STRING_[ ch ] || (
		 ESCAPE_MAP_FOR_ESCAPE_CSS_STRING_[ ch ]
				 = "\\" + ch.charCodeAt( 0 ).toString( 16 ) + " " );
}

/**
 * Matches characters that need to be escaped for the named directives.
 * @type RegExp
 * @private
 * @const
 */
var MATCHER_FOR_ESCAPE_HTML_ = /[\x00"&'<>]/g;

/**
 * Matches characters that need to be escaped for the named directives.
 * @type RegExp
 * @private
 * @const
 */
var MATCHER_FOR_NORMALIZE_HTML_ = /[\x00"'<>]/g;

/**
 * Matches characters that need to be escaped for the named directives.
 * @type RegExp
 * @private
 * @const
 */
var MATCHER_FOR_ESCAPE_HTML_NOSPACE_
		= /[\x00\x09-\x0d "&'\-\/<->`\x85\xa0\u2028\u2029]/g;

/**
 * Matches characters that need to be escaped for the named directives.
 * @type RegExp
 * @private
 * @const
 */
var MATCHER_FOR_NORMALIZE_HTML_NOSPACE_
		= /[\x00\x09-\x0d "'\-\/<->`\x85\xa0\u2028\u2029]/g;

/**
 * Matches characters that need to be escaped for the named directives.
 * @type RegExp
 * @private
 * @const
 */
var MATCHER_FOR_ESCAPE_JS_STRING_
		= /[\x00\x08-\x0d"&'\/<->\\\x85\u2028\u2029]/g;

/**
 * Matches characters that need to be escaped for the named directives.
 * @type RegExp
 * @private
 * @const
 */
var MATCHER_FOR_ESCAPE_JS_REGEX_ = /[\x00\x08-\x0d"$&-\/:<-?\[-^\x7b-\x7d\x85\u2028\u2029]/g;

/**
 * Matches characters that need to be escaped for the named directives.
 * @type RegExp
 * @private
 * @const
 */
var MATCHER_FOR_ESCAPE_CSS_STRING_ = /[\x00\x08-\x0d"&-*\/:->@\\\x7b\x7d\x85\xa0\u2028\u2029]/g;

/**
 * A pattern that vets values produced by the named directives.
 * @type RegExp
 * @private
 * @const
 */
var FILTER_FOR_FILTER_CSS_VALUE_ = /^(?!-*(?:expression|(?:moz-)?binding))(?:[.#]?-?(?:[_a-z0-9][_a-z0-9-]*)(?:-[_a-z][_a-z0-9-]*)*-?|-?(?:[0-9]+(?:\.[0-9]*)?|\.[0-9])(?:[a-z]{1,2}|%)?|!important|)$/i;

/**
 * A pattern that vets values produced by the named directives.
 * @type RegExp
 * @private
 * @const
 */
var FILTER_FOR_FILTER_NORMALIZE_URI_
		= /^(?:(?:https?|mailto):|[^&:\/?#]*(?:[\/?#]|$))/i;

/**
 * A pattern that vets values produced by the named directives.
 * @type RegExp
 * @private
 * @const
 */
var FILTER_FOR_FILTER_HTML_ATTRIBUTE_ = /^(?!style|on|action|archive|background|cite|classid|codebase|data|dsync|href|longdesc|src|usemap)(?:[a-z0-9_$:-]*|dir=(?:ltr|rtl))$/i;

/**
 * A pattern that vets values produced by the named directives.
 * @type RegExp
 * @private
 * @const
 */
var FILTER_FOR_FILTER_HTML_ELEMENT_NAME_
		= /^(?!script|style|title|textarea|xmp|no)[a-z0-9_$:-]*$/i;

/**
 * A helper for the Soy directive |escapeHtml
 * @param {*} value Can be of any type but will be coerced to a string.
 * @return {string} The escaped text.
 */
function escapeHtmlHelper( value ) {
	var str = String( value );
	return str.replace(
			MATCHER_FOR_ESCAPE_HTML_,
			REPLACER_FOR_ESCAPE_HTML__AND__NORMALIZE_HTML__AND__ESCAPE_HTML_NOSPACE__AND__NORMALIZE_HTML_NOSPACE_ );
}

/**
 * A helper for the Soy directive |normalizeHtml
 * @param {*} value Can be of any type but will be coerced to a string.
 * @return {string} The escaped text.
 */
function normalizeHtmlHelper( value ) {
	var str = String( value );
	return str.replace(
			MATCHER_FOR_NORMALIZE_HTML_,
			REPLACER_FOR_ESCAPE_HTML__AND__NORMALIZE_HTML__AND__ESCAPE_HTML_NOSPACE__AND__NORMALIZE_HTML_NOSPACE_ );
}

/**
 * A helper for the Soy directive |escapeHtmlNospace
 * @param {*} value Can be of any type but will be coerced to a string.
 * @return {string} The escaped text.
 */
function escapeHtmlNospaceHelper( value ) {
	var str = String( value );
	return str.replace(
			MATCHER_FOR_ESCAPE_HTML_NOSPACE_,
			REPLACER_FOR_ESCAPE_HTML__AND__NORMALIZE_HTML__AND__ESCAPE_HTML_NOSPACE__AND__NORMALIZE_HTML_NOSPACE_ );
}

/**
 * A helper for the Soy directive |normalizeHtmlNospace
 * @param {*} value Can be of any type but will be coerced to a string.
 * @return {string} The escaped text.
 */
function normalizeHtmlNospaceHelper( value ) {
	var str = String( value );
	return str.replace(
			MATCHER_FOR_NORMALIZE_HTML_NOSPACE_,
			REPLACER_FOR_ESCAPE_HTML__AND__NORMALIZE_HTML__AND__ESCAPE_HTML_NOSPACE__AND__NORMALIZE_HTML_NOSPACE_ );
}

/**
 * A helper for the Soy directive |escapeJsString
 * @param {*} value Can be of any type but will be coerced to a string.
 * @return {string} The escaped text.
 */
function escapeJsStringHelper( value ) {
	var str = String( value );
	return str.replace(
			MATCHER_FOR_ESCAPE_JS_STRING_,
			REPLACER_FOR_ESCAPE_JS_STRING__AND__ESCAPE_JS_REGEX_ );
}

/**
 * A helper for the Soy directive |escapeJsRegex
 * @param {*} value Can be of any type but will be coerced to a string.
 * @return {string} The escaped text.
 */
function escapeJsRegexHelper( value ) {
	var str = String( value );
	return str.replace(
			MATCHER_FOR_ESCAPE_JS_REGEX_,
			REPLACER_FOR_ESCAPE_JS_STRING__AND__ESCAPE_JS_REGEX_ );
}

/**
 * A helper for the Soy directive |escapeCssString
 * @param {*} value Can be of any type but will be coerced to a string.
 * @return {string} The escaped text.
 */
function escapeCssStringHelper( value ) {
	var str = String( value );
	return str.replace(
			MATCHER_FOR_ESCAPE_CSS_STRING_,
			REPLACER_FOR_ESCAPE_CSS_STRING_ );
}

/**
 * A helper for the Soy directive |filterCssValue
 * @param {*} value Can be of any type but will be coerced to a string.
 * @return {string} The escaped text.
 */
function filterCssValueHelper( value ) {
	var str = String( value );
	if ( !FILTER_FOR_FILTER_CSS_VALUE_.test( str ) ) {
		return "zSafehtmlz";
	}
	return str;
}

/**
 * A helper for the Soy directive |filterHtmlAttribute
 * @param {*} value Can be of any type but will be coerced to a string.
 * @return {string} The escaped text.
 */
function filterHtmlAttributeHelper( value ) {
	var str = String( value );
	if ( !FILTER_FOR_FILTER_HTML_ATTRIBUTE_.test( str ) ) {
		return "zSafehtmlz";
	}
	return str;
}

/**
 * A helper for the Soy directive |filterHtmlElementName
 * @param {*} value Can be of any type but will be coerced to a string.
 * @return {string} The escaped text.
 */
function filterHtmlElementNameHelper( value ) {
	var str = String( value );
	if ( !FILTER_FOR_FILTER_HTML_ELEMENT_NAME_.test( str ) ) {
		return "zSafehtmlz";
	}
	return str;
}

/**
 * Matches all tags, HTML comments, and DOCTYPEs in tag soup HTML.
 *
 * @type {RegExp}
 * @private
 * @const
 */
var HTML_TAG_REGEX_ = /<(?:!|\/?[a-z])(?:[^>'"]|"[^"]*"|'[^']*')*>/gi;

// END GENERATED CODE

var SANITIZER_FOR_ESC_MODE = [];
SANITIZER_FOR_ESC_MODE[ ESC_MODE_ESCAPE_HTML ] = escapeHtml;
SANITIZER_FOR_ESC_MODE[ ESC_MODE_ESCAPE_HTML_RCDATA ] = escapeHtmlRcdata;
SANITIZER_FOR_ESC_MODE[ ESC_MODE_ESCAPE_HTML_ATTRIBUTE ] = escapeHtmlAttribute;
SANITIZER_FOR_ESC_MODE[ ESC_MODE_ESCAPE_HTML_ATTRIBUTE_NOSPACE ]
		= escapeHtmlAttributeNospace;
SANITIZER_FOR_ESC_MODE[ ESC_MODE_FILTER_HTML_ELEMENT_NAME ]
		= filterHtmlElementName;
SANITIZER_FOR_ESC_MODE[ ESC_MODE_FILTER_HTML_ATTRIBUTE ] = filterHtmlAttribute;
SANITIZER_FOR_ESC_MODE[ ESC_MODE_ESCAPE_JS_STRING ] = escapeJsString;
SANITIZER_FOR_ESC_MODE[ ESC_MODE_ESCAPE_JS_VALUE ] = escapeJsValue;
SANITIZER_FOR_ESC_MODE[ ESC_MODE_ESCAPE_JS_REGEX ] = escapeJsRegex;
SANITIZER_FOR_ESC_MODE[ ESC_MODE_ESCAPE_CSS_STRING ] = escapeCssString;
SANITIZER_FOR_ESC_MODE[ ESC_MODE_FILTER_CSS_VALUE ] = filterCssValue;
SANITIZER_FOR_ESC_MODE[ ESC_MODE_ESCAPE_URI ] = escapeUri;
SANITIZER_FOR_ESC_MODE[ ESC_MODE_NORMALIZE_URI ] = normalizeUri;
SANITIZER_FOR_ESC_MODE[ ESC_MODE_FILTER_NORMALIZE_URI ] = filterNormalizeUri;

// Make the escapers available as members of $.encode.
// The contextual escaper introduces calls like $.encode[0]
// which compress well.
escapeHtml[ ESC_MODE_ESCAPE_HTML ] = $[ "encode" ]
		= $.extend( escapeHtml, SANITIZER_FOR_ESC_MODE );

if ( DEBUG ) {
	// In debug mode use the human readable version of the name.
	$.each( SANITIZER_FOR_ESC_MODE,
				 function ( i, sanitizer ) {
					 if ( sanitizer ) {
						 var name = sanitizer[ "name" ];
						 if ( !name ) {
							 name = sanitizer[ "name" ] = ( "" + sanitizer )
									 .match( /^function\s+(\w+)/ )[ 0 ];
						 }
						 $[ "encode" ][ name ] = sanitizer;
					 }
				 } );
}

//-*- mode: js2-mode; indent-tabs-mode: t; tab-width: 2; -*-

/**
 * Defines the rules for propagating context across snippets of static template
 * content.
 *
 * Requires context-defs.js
 *
 * @author Mike Samuel <mikesamuel@gmail.com>
 */

/**
 * Used in debug mode to convert a context represented as an integer to a
 * diagnostic string.
 */
function contextToString( context ) {
	var parts = [];
	switch ( stateOf( context ) ) {
		case STATE_HTML_PCDATA: parts.push( "HTML_PCDATA" ); break;
		case STATE_HTML_RCDATA: parts.push( "HTML_RCDATA" ); break;
		case STATE_HTML_BEFORE_TAG_NAME:
			parts.push( "HTML_BEFORE_TAG_NAME" ); break;
		case STATE_HTML_TAG_NAME: parts.push( "HTML_TAG_NAME" ); break;
		case STATE_HTML_TAG: parts.push( "HTML_TAG" ); break;
		case STATE_HTML_ATTRIBUTE_NAME: parts.push( "HTML_ATTRIBUTE_NAME" ); break;
		case STATE_HTML_BEFORE_ATTRIBUTE_VALUE:
			parts.push( "HTML_BEFORE_ATTRIBUTE_VALUE" ); break;
		case STATE_HTML_COMMENT: parts.push( "HTML_COMMENT" ); break;
		case STATE_HTML_NORMAL_ATTR_VALUE:
			parts.push( "HTML_NORMAL_ATTR_VALUE" ); break;
		case STATE_CSS: parts.push( "CSS" ); break;
		case STATE_CSS_COMMENT: parts.push( "CSS_COMMENT" ); break;
		case STATE_CSS_DQ_STRING: parts.push( "CSS_DQ_STRING" ); break;
		case STATE_CSS_SQ_STRING: parts.push( "CSS_SQ_STRING" ); break;
		case STATE_CSS_URI: parts.push( "CSS_URI" ); break;
		case STATE_CSS_DQ_URI: parts.push( "CSS_DQ_URI" ); break;
		case STATE_CSS_SQ_URI: parts.push( "CSS_SQ_URI" ); break;
		case STATE_JS: parts.push( "JS" ); break;
		case STATE_JS_LINE_COMMENT: parts.push( "JS_LINE_COMMENT" ); break;
		case STATE_JS_BLOCK_COMMENT: parts.push( "JS_BLOCK_COMMENT" ); break;
		case STATE_JS_DQ_STRING: parts.push( "JS_DQ_STRING" ); break;
		case STATE_JS_SQ_STRING: parts.push( "JS_SQ_STRING" ); break;
		case STATE_JS_REGEX: parts.push( "JS_REGEX" ); break;
		case STATE_URI: parts.push( "URI" ); break;
		case STATE_ERROR: parts.push( "ERROR" ); break;
	}
	switch ( elementTypeOf( context ) ) {
		case ELEMENT_TYPE_SCRIPT: parts.push( "SCRIPT" ); break;
		case ELEMENT_TYPE_STYLE: parts.push( "STYLE" ); break;
		case ELEMENT_TYPE_TEXTAREA: parts.push( "TEXTAREA" ); break;
		case ELEMENT_TYPE_TITLE: parts.push( "TITLE" ); break;
		case ELEMENT_TYPE_LISTING: parts.push( "LISTING" ); break;
		case ELEMENT_TYPE_XMP: parts.push( "XMP" ); break;
		case ELEMENT_TYPE_NORMAL: parts.push( "NORMAL" ); break;
	}
	switch ( attrTypeOf( context ) ) {
		case ATTR_TYPE_SCRIPT: parts.push( "SCRIPT" ); break;
		case ATTR_TYPE_STYLE: parts.push( "STYLE" ); break;
		case ATTR_TYPE_URI: parts.push( "URI" ); break;
		case ATTR_TYPE_PLAIN_TEXT: parts.push( "PLAIN_TEXT" ); break;
	}
	switch ( delimTypeOf( context ) ) {
		case DELIM_TYPE_DOUBLE_QUOTE: parts.push( "DOUBLE_QUOTE" ); break;
		case DELIM_TYPE_SINGLE_QUOTE: parts.push( "SINGLE_QUOTE" ); break;
		case DELIM_TYPE_SPACE_OR_TAG_END: parts.push( "SPACE_OR_TAG_END" ); break;
	}
	switch ( jsFollowingSlashOf( context ) ) {
		case JS_FOLLOWING_SLASH_REGEX: parts.push( "REGEX" ); break;
		case JS_FOLLOWING_SLASH_DIV_OP: parts.push( "DIV_OP" ); break;
		case JS_FOLLOWING_SLASH_UNKNOWN: parts.push( "UNKNOWN" ); break;
	}
	switch ( uriPartOf( context ) ) {
		case URI_PART_START: parts.push( "START" ); break;
		case URI_PART_PRE_QUERY: parts.push( "PRE_QUERY" ); break;
		case URI_PART_QUERY: parts.push( "QUERY" ); break;
		case URI_PART_FRAGMENT: parts.push( "FRAGMENT" ); break;
		case URI_PART_UNKNOWN_PRE_FRAGMENT:
			parts.push( "UNKNOWN_PRE_FRAGMENT" ); break;
		case URI_PART_UNKNOWN: parts.push( "UNKNOWN" ); break;
	}
	return "[Context " + parts.join( " " ) + "]";
}

var REGEX_PRECEDER_KEYWORDS = {
	"break" : TRUTHY,
	"case" : TRUTHY,
	"continue" : TRUTHY,
	"delete" : TRUTHY,
	"do" : TRUTHY,
	"else" : TRUTHY,
	"finally" : TRUTHY,
	"instanceof" : TRUTHY,
	"return" : TRUTHY,
	"throw" : TRUTHY,
	"try" : TRUTHY,
	"typeof": TRUTHY
};

/**
 * True iff a slash after the given run of non-whitespace tokens
 * starts a regular expression instead of a div operator : (/ or /=).
 * <p>
 * This fails on some valid but nonsensical JavaScript programs like
 * {@code x = ++/foo/i} which is quite different than
 * {@code x++/foo/i}, but is not known to fail on any known useful
 * programs.  It is based on the draft
 * <a href="http://www.mozilla.org/js/language/js20-2000-07/rationale/syntax.html">JavaScript 2.0
 * lexical grammar</a> and requires one token of lookbehind.
 *
 * @param {string} jsTokens A run of non-whitespace, non-comment, non string
 *     tokens not including the '/' character.  Non-empty.
 */
function isRegexPreceder( jsTokens ) {
	// Tokens that precede a regular expression in JavaScript.
	// "!", "!=", "!==", "#", "%", "%=", "&", "&&",
	// "&&=", "&=", "(", "*", "*=", "+", "+=", ",",
	// "-", "-=", "->", ".", "..", "...", "/", "/=",
	// ":", "::", ";", "<", "<<", "<<=", "<=", "=",
	// "==", "===", ">", ">=", ">>", ">>=", ">>>",
	// ">>>=", "?", "@", "[", "^", "^=", "^^", "^^=",
	// "{", "|", "|=", "||", "||=", "~",
	// "break", "case", "continue", "delete", "do",
	// "else", "finally", "instanceof", "return",
	// "throw", "try", "typeof"

	var jsTokensLen = jsTokens.length;
	var lastChar = jsTokens.charAt( jsTokensLen - 1 );
	switch ( lastChar ) {
	case "+":
	case "-":
		// ++ and -- are not
		var signStart = jsTokensLen - 1;
		// Count the number of adjacent dashes or pluses.
		while ( signStart > 0 && jsTokens.charAt( signStart - 1 ) === lastChar ) {
			--signStart;
		}
		var numAdjacent = jsTokensLen - signStart;
		// True for odd numbers since "---" is the same as "-- -".
		// False for even numbers since "----" is the same as "-- --" which ends
		// with a decrement, not a minus sign.
		return ( numAdjacent & 1 ) === 1;
	case ".":
		if ( jsTokensLen === 1 ) {
			return TRUTHY;
		}
		// There is likely to be a .. or ... operator in next version of EcmaScript.
		var ch = jsTokens.charAt( jsTokensLen - 2 );
		return !( "0" <= ch && ch <= "9" );
	case "/":  // Match a div op, but not a regexp.
		return jsTokensLen === 1;
	default:
		// [:-?] matches ':', ';', '<', '=', '>', '?'
		// [{-~] matches '{', '|', '}', '~'
		if ( /[#%&(*,:-?\[^{-~]/.test( lastChar ) ) { return TRUTHY; }
		// Look for one of the keywords above.
		var word = jsTokens.match( /[\w$]+$/ );
		return word && REGEX_PRECEDER_KEYWORDS[ word[ 0 ] ] === TRUTHY;
	}
}

/**
 * A context which is consistent with both contexts.  This should be
 * used when multiple execution paths join, such as the path through
 * the then-clause of an <code>{if}</code> command and the path
 * through the else-clause.
 * @return STATE_ERROR when there is no such context consistent with both.
 */
function contextUnion( a, b ) {
	if ( a === b ) {
		return a;
	}

	if ( a === ( ( b & ~JS_FOLLOWING_SLASH_ALL ) | jsFollowingSlashOf( a ) ) ) {
		return ( a & ~JS_FOLLOWING_SLASH_ALL ) | JS_FOLLOWING_SLASH_UNKNOWN;
	}

	var aUriPart = uriPartOf( a );
	if ( a === ( ( b & ~URI_PART_ALL ) | aUriPart ) ) {
		var bUriPart = uriPartOf( b );
		return ( a & ~URI_PART_ALL ) | (
				// If the parts differ but neither could be in the fragment then a
				// ? will conclusively transition into the query state, so use
				// UKNNOWN_PRE_FRAGMENT to allow ${...}s after '?'.
				// With unknown, ${...}s are only allowed after a '#'.
				aUriPart !== URI_PART_FRAGMENT && bUriPart !== URI_PART_FRAGMENT &&
				aUriPart !== URI_PART_UNKNOWN && bUriPart !== URI_PART_UNKNOWN ?
				URI_PART_UNKNOWN_PRE_FRAGMENT : URI_PART_UNKNOWN );
	}

	// Order by state so that we don't have to duplicate tests below.
	var aState = stateOf( a ), bState = stateOf( b );
	if ( aState > bState ) {
		var swap = a;
		a = b;
		b = swap;
		swap = aState;
		aState = bState;
		bState = swap;
	}

	// If we start in a tag name and end between attributes, then treat us as
	// between attributes.
	// This handles <b{if $bool} attrName="value"{/if}>.
	if ( aState == STATE_HTML_TAG_NAME && bState == STATE_HTML_TAG ) {
		// We do not need to compare elementTypeOf(a) and elementTypeof(b) since in
		// HTML_TAG_NAME, there is no tag name, so no loss of information.
		return b;
	}

	if ( aState === STATE_HTML_TAG
			 && elementTypeOf( a ) === elementTypeOf( b ) ) {
		// If one branch is waiting for an attribute name and the other is waiting
		// for an equal sign before an attribute value, then commit to the view that
		// the attribute name was a valueless attribute and transition to a state
		// waiting for another attribute name or the end of a tag.
		if ( bState === STATE_HTML_ATTRIBUTE_NAME ||
				// In an attribute value ended by a delimiter.
				delimTypeOf( b ) === DELIM_TYPE_SPACE_OR_TAG_END ) {
			// TODO: do we need to require a space before any new attribute name?
			return a;
		}
	}

	return STATE_ERROR;
}

/**
 * Some epsilon transitions need to be delayed until we get into a branch.
 * For example, we do not transition into an unquoted attribute value
 * context just because the raw text node that contained the "=" did
 * not contain a quote character because the quote character may appear
 * inside branches as in
 *     {@code <a href={{if ...}}"..."{{else}}"..."{{/if}}>}
 * which was derived from production code.
 * <p>
 * But we need to force epsilon transitions to happen consistentky before
 * a dynamic value is considered as in
 *    {@code <a href=${x}>}
 * where we consider $x as happening in an unquoted attribute value context,
 * not as occuring before an attribute value.
 */
function contextBeforeDynamicValue( context ) {
	var state = stateOf( context );
	if ( state === STATE_HTML_BEFORE_ATTRIBUTE_VALUE ) {
		context = computeContextAfterAttributeDelimiter(
				elementTypeOf( context ), attrTypeOf( context ),
				DELIM_TYPE_SPACE_OR_TAG_END );
	}
	return context;
}

function computeContextAfterAttributeDelimiter( elType, attrType, delim ) {
	var state;
	var slash = JS_FOLLOWING_SLASH_NONE;
	var uriPart = URI_PART_NONE;
	switch ( attrType ) {
	case ATTR_TYPE_PLAIN_TEXT:
		state = STATE_HTML_NORMAL_ATTR_VALUE;
		break;
	case ATTR_TYPE_SCRIPT:
		state = STATE_JS;
		// Start a JS block in a regex state since
		//   /foo/.test(str) && doSideEffect();
		// which starts with a regular expression literal is a valid and possibly
		// useful program, but there is no valid program which starts with a
		// division operator.
		slash = JS_FOLLOWING_SLASH_REGEX;
		break;
	case ATTR_TYPE_STYLE:
		state = STATE_CSS;
		break;
	case ATTR_TYPE_URI:
		state = STATE_URI;
		uriPart = URI_PART_START;
		break;
	// NONE is not a valid AttributeType inside an attribute value.
	default: throw new Error( attrType );
	}
	return state | elType | attrType | delim | slash | uriPart;
}

var processRawText = ( function () {
	var global = this;

	var HTML_ENTITY_NAME_TO_TEXT = {
		lt: "<",
		gt: ">",
		amp: "&",
		quot: "\"",
		apos: "'"
	};

	function unescapeHtml( html ) {
		// Fast path for common case.
		if ( html.indexOf( "&" ) < 0 ) { return html; }
		return html.replace(
			/&(?:#(?:(x[0-9a-f]+)|([0-9]+))|(lt|gt|amp|quot|apos));/gi,
			function ( entity, hex, decimal, entityName ) {
				if ( hex || decimal ) {
					return String.fromCharCode(  // String.fromCharCode coerces its arg.
							/** @type {number} */
							( 0 + ( hex || decimal ) ) );
				}
				// We don't need to escape all entities, just the ones that could be
				// token boundaries.
				return HTML_ENTITY_NAME_TO_TEXT[ entityName.toLowerCase() ];
			}
		);
	}


	/**
	 * @return The end of the attribute value of -1 if delim indicates we are not
	 *     in an attribute.
	 *     {@code rawText.length} if we are in an attribute but the end does not
	 *     appear in rawText.
	 */
	function findEndOfAttributeValue( rawText, delim ) {
		var rawTextLen = rawText.length;
		if ( delim === DELIM_TYPE_NONE ) { return -1; }
		if ( delim === DELIM_TYPE_SPACE_OR_TAG_END ) {
			var match = rawText.match( /[\s>]/ );
			return match ? match.index : rawTextLen;
		}
		var quote = rawText.indexOf( DELIM_TEXT[ delim ] );
		return quote >= 0 ? quote : rawTextLen;
	}


	/**
	 * Encapsulates a grammar production and the context after that production is
	 * seen in a chunk of HTML/CSS/JS input.
	 * @param {RegExp} pattern
	 * @constructor
	 */
	function Transition( pattern ) {
		/** Matches a token. */
		this.pattern = pattern;
	}

	/**
	 * True iff this transition can produce a context after the text in
	 * {@code rawText[0:match.index + match[0].length]}.
	 * This should not destructively modify the match.
	 * Specifically, it should not call {@code find()} again.
	 * @param {number} prior The context prior to the token in match.
	 * @param {Array.<String>} match The token matched by {@code this.pattern}.
	 */
	Transition.prototype.isApplicableTo = function ( prior, match ) {
		return TRUTHY;
	};

	/**
	 * Computes the context that this production transitions to after
	 * {@code rawText[0:match.index + match[].length]}.
	 * @param {number} prior The context prior to the token in match.
	 * @param {Array.<String>} match The token matched by {@code this.pattern}.
	 * @return The context after the given token.
	 */
	Transition.prototype.computeNextContext;


	function TransitionSubclass( ctor, computeNextContext, opt_isApplicableTo ) {
		var proto = ctor.prototype = new Transition( /(?!)/ );
		proto.constructor = ctor;
		/**
		 * @override
		 */
		proto.computeNextContext = computeNextContext;
		if ( opt_isApplicableTo ) { proto.isApplicableTo = opt_isApplicableTo; }
	}


	/**
	 * A transition to a given context.
	 * @param {RegExp} regex
	 * @param {number} dest a context.
	 * @constructor
	 * @extends Transition
	 */
	function ToTransition( regex, dest ) {
		Transition.call( this, regex );
		this.dest = dest;
	}
	TransitionSubclass(
			ToTransition,
			function ( prior, match ) { return this.dest; } );


	/**
	 * A transition to a context in the body of an open tag for the given element.
	 * @param {RegExp} regex
	 * @constructor
	 * @extends Transition
	 */
	function ToTagTransition( regex, el ) {
		Transition.call( this, regex );
		this.el = el;
	}
	TransitionSubclass(
			ToTagTransition,
			function ( prior, match ) { return STATE_HTML_TAG | this.el; } );


	var TAG_DONE_ELEMENT_TYPE_TO_PARTIAL_CONTEXT = {};
	TAG_DONE_ELEMENT_TYPE_TO_PARTIAL_CONTEXT[ ELEMENT_TYPE_SCRIPT ]
			= STATE_JS | JS_FOLLOWING_SLASH_REGEX;
	TAG_DONE_ELEMENT_TYPE_TO_PARTIAL_CONTEXT[ ELEMENT_TYPE_STYLE ] = STATE_CSS;
	TAG_DONE_ELEMENT_TYPE_TO_PARTIAL_CONTEXT[ ELEMENT_TYPE_NORMAL ]
			= STATE_HTML_PCDATA;
	TAG_DONE_ELEMENT_TYPE_TO_PARTIAL_CONTEXT[ ELEMENT_TYPE_LISTING ]
			= STATE_HTML_RCDATA;
	TAG_DONE_ELEMENT_TYPE_TO_PARTIAL_CONTEXT[ ELEMENT_TYPE_TEXTAREA ]
			= STATE_HTML_RCDATA;
	TAG_DONE_ELEMENT_TYPE_TO_PARTIAL_CONTEXT[ ELEMENT_TYPE_TITLE ]
			= STATE_HTML_RCDATA;
	TAG_DONE_ELEMENT_TYPE_TO_PARTIAL_CONTEXT[ ELEMENT_TYPE_XMP ]
			= STATE_HTML_RCDATA;

	/**
	 * @param {RegExp} regex
	 * @constructor
	 * @extends Transition
	 */
	function TagDoneTransition( regex ) {
		Transition.call( this, regex );
	}
	TransitionSubclass(
			TagDoneTransition,
			function ( prior, match ) {
				var elType = elementTypeOf( prior );
				var partialContext = TAG_DONE_ELEMENT_TYPE_TO_PARTIAL_CONTEXT[ elType ];
				if ( typeof partialContext !== "number" ) { throw new Error( elType ); }
				return partialContext === STATE_HTML_RCDATA
						? partialContext | elType : partialContext;
			} );


	/**
	 * A transition back to a context in the body of an open tag.
	 * @param {RegExp} regex
	 * @constructor
	 * @extends Transition
	 */
	function TransitionBackToTag( regex ) {
		Transition.call( this, regex );
	}
	TransitionSubclass(
			 TransitionBackToTag,
			 function ( prior, match ) {
				 return STATE_HTML_TAG | elementTypeOf( prior );
			 } );


	/**
	 * Lower case names of attributes whose value is a URI.
	 * This does not identify attributes like {@code <meta content>} which is
	 * conditionally a URI
	 * depending on the value of other attributes.
	 * @see <a href="http://www.w3.org/TR/html4/index/attributes.html">HTML4 attrs with type %URI</a>
	 */
	var URI_ATTR_NAMES = {
			"action" : TRUTHY,
			"archive" : TRUTHY,
			"background" : TRUTHY,
			"cite" : TRUTHY,
			"classid" : TRUTHY,
			"codebase" : TRUTHY,
			"data" : TRUTHY,
			"dsync" : TRUTHY,
			"href" : TRUTHY,
			"longdesc" : TRUTHY,
			"src" : TRUTHY,
			"usemap" : TRUTHY
		};

	/**
	 * A transition to a context in the name of an attribute whose attribute type
	 * is determined by its name seen thus far.
	 * @param {RegExp} regex A regular expression whose group 1 is a prefix of an
	 *     attribute name.
	 * @constructor
	 * @extends Transition
	 */
	function TransitionToAttrName( regex ) {
		Transition.call( this, regex );
	}
	TransitionSubclass(
			TransitionToAttrName,
			function ( prior, match ) {
				var attrName = match[ 1 ].toLowerCase();
				var attr;
				if ( "on" === attrName.substring( 0, 2 ) ) {
					attr = ATTR_TYPE_SCRIPT;
				} else if ( "style" === attrName ) {
					attr = ATTR_TYPE_STYLE;
				} else if ( URI_ATTR_NAMES[ attrName ] === TRUTHY ) {
					attr = ATTR_TYPE_URI;
				} else {
					attr = ATTR_TYPE_PLAIN_TEXT;
				}
				return STATE_HTML_ATTRIBUTE_NAME | elementTypeOf( prior ) | attr;
			} );

	/**
	 * A transition to a context in the name of an attribute of the given type.
	 * @param {RegExp} regex
	 * @constructor
	 * @extends Transition
	 */
	function TransitionToAttrValue( regex, delim ) {
		Transition.call( this, regex );
		this.delim = delim;
	}
	TransitionSubclass(
			TransitionToAttrValue,
			function ( prior, match ) {
				return computeContextAfterAttributeDelimiter(
						elementTypeOf( prior ), attrTypeOf( prior ), this.delim );
			} );


	/**
	 * A transition to the given state.
	 * @param {RegExp} regex
	 * @constructor
	 * @extends Transition
	 */
	function TransitionToState( regex, state ) {
		Transition.call( this, regex );
		this.state = state;
	}
	TransitionSubclass(
			TransitionToState,
			function ( prior, match ) {
				return ( prior & ~( URI_PART_ALL | STATE_ALL ) ) | this.state;
			} );

	/**
	 * A transition to the given state.
	 * @param {RegExp} regex
	 * @constructor
	 * @extends Transition
	 */
	function TransitionToJsString( regex, state ) {
		Transition.call( this, regex );
		this.state = state;
	}
	TransitionSubclass(
			TransitionToJsString,
			function ( prior, match ) {
				return ( prior & ( ELEMENT_TYPE_ALL | ATTR_TYPE_ALL | DELIM_TYPE_ALL ) )
						| this.state;
			} );

	/**
	 * @param {RegExp} regex
	 * @constructor
	 * @extends Transition
	 */
	function SlashTransition( regex ) {
		Transition.call( this, regex );
	}
	TransitionSubclass(
			SlashTransition,
			function ( prior, match ) {
				switch ( jsFollowingSlashOf( prior ) ) {
				case JS_FOLLOWING_SLASH_DIV_OP:
					return ( prior & ~( STATE_ALL | JS_FOLLOWING_SLASH_ALL ) )
							| STATE_JS | JS_FOLLOWING_SLASH_REGEX;
				case JS_FOLLOWING_SLASH_REGEX:
					return ( prior & ~( STATE_ALL | JS_FOLLOWING_SLASH_ALL ) )
							| STATE_JS_REGEX | JS_FOLLOWING_SLASH_NONE;
				default:
					throw new Error(
							"Ambiguous / could be a RegExp or division.  " +
							"Please add parentheses before `" + match[ 0 ] + "`"
					);
				}
			} );

	/**
	 * @param {RegExp} regex
	 * @constructor
	 * @extends Transition
	 */
	function JsPuncTransition( regex ) {
		Transition.call( this, regex );
	}
	TransitionSubclass(
			JsPuncTransition,
			function ( prior, match ) {
				return ( prior & ~JS_FOLLOWING_SLASH_ALL )
						| ( isRegexPreceder( match[ 0 ] )
								? JS_FOLLOWING_SLASH_REGEX : JS_FOLLOWING_SLASH_DIV_OP );
			} );

	/**
	 * A transition that consumes some content without changing state.
	 * @param {RegExp} regex
	 * @constructor
	 * @extends Transition
	 */
	function TransitionToSelf( regex ) {
		Transition.call( this, regex );
	}
	TransitionSubclass(
			TransitionToSelf,
			function ( prior, match ) { return prior; } );


	/** Consumes the entire content without change if nothing else matched. */
	var TRANSITION_TO_SELF = new TransitionToSelf( /$/ );
	// Matching at the end is lowest possible precedence.

	var URI_PART_TRANSITION = new Transition( /[?#]|$/ );
	/**
	 * @override
	 */
	URI_PART_TRANSITION.computeNextContext = function ( prior, match ) {
		var uriPart = uriPartOf( prior );
		if ( uriPart === URI_PART_START ) {
			uriPart = URI_PART_PRE_QUERY;
		}
		if ( uriPart !== URI_PART_FRAGMENT ) {
			var m0 = match[ 0 ];
			if ( "?" === m0 && uriPart !== URI_PART_UNKNOWN ) {
				uriPart = URI_PART_QUERY;
			} else if ( "#" === m0 ) {
				uriPart = URI_PART_FRAGMENT;
			}
		}
		return ( prior & ~URI_PART_ALL ) | uriPart;
	};

	/**
	 * Matches the end of a special tag like {@code script}.
	 * @param {RegExp} pattern
	 * @constructor
	 * @extends Transition
	 */
	function EndTagTransition( pattern ) {
		Transition.call( this, pattern );
	}
	TransitionSubclass(
			EndTagTransition,
			// TODO: This transitions to an HTML_TAG state which accepts attributes.
			// So we allow nonsensical constructs like </br foo="bar">.
			// Add another HTML_END_TAG state that just accepts space and >.
			function ( prior, match ) {
				return STATE_HTML_TAG | ELEMENT_TYPE_NORMAL;
			},
			function ( prior, match ) {
				return attrTypeOf( prior ) === ATTR_TYPE_NONE;
			} );
	var SCRIPT_TAG_END = new EndTagTransition( /<\/script\b/i );
	var STYLE_TAG_END = new EndTagTransition( /<\/style\b/i );


	var ELEMENT_TYPE_TO_TAG_NAME = {};
	ELEMENT_TYPE_TO_TAG_NAME[ ELEMENT_TYPE_TEXTAREA ] = "textarea";
	ELEMENT_TYPE_TO_TAG_NAME[ ELEMENT_TYPE_TITLE ] = "title";
	ELEMENT_TYPE_TO_TAG_NAME[ ELEMENT_TYPE_LISTING ] = "listing";
	ELEMENT_TYPE_TO_TAG_NAME[ ELEMENT_TYPE_XMP ] = "xmp";

	/**
	 * @param {RegExp} regex
	 * @constructor
	 * @extends Transition
	 */
	function RcdataEndTagTransition( regex ) {
		Transition.call( this, regex );
	}
	TransitionSubclass(
			RcdataEndTagTransition,
			function ( prior, match ) {
				return STATE_HTML_TAG | ELEMENT_TYPE_NORMAL;
			},
			function ( prior, match ) {
				return match[ 1 ].toLowerCase()
						=== ELEMENT_TYPE_TO_TAG_NAME[ elementTypeOf( prior ) ];
			} );

	/**
	 * Matches the beginning of a CSS URI with the delimiter, if any, in group 1.
	 * @param {RegExp} regex
	 * @constructor
	 * @extends Transition
	 */
	function CssUriTransition( regex ) {
		Transition.call( this, regex );
	}
	TransitionSubclass(
			CssUriTransition,
			function ( prior, match ) {
				var delim = match[ 1 ];
				var state;
				if ( "\"" === delim ) {
					state = STATE_CSS_DQ_URI;
				} else if ( "'" === delim ) {
					state = STATE_CSS_SQ_URI;
				} else {
					state = STATE_CSS_URI;
				}
				return ( prior & ~( STATE_ALL | URI_PART_ALL ) )
						| state | URI_PART_START;
			} );

	/**
	 * Matches a portion of JavaScript that can precede a division operator.
	 * @param {RegExp} regex
	 * @constructor
	 * @extends Transition
	 */
	function DivPreceder( regex ) {
		Transition.call( this, regex );
	}
	TransitionSubclass(
			DivPreceder,
			function ( prior, match ) {
				return ( prior & ~( STATE_ALL | JS_FOLLOWING_SLASH_ALL ) )
						| STATE_JS | JS_FOLLOWING_SLASH_DIV_OP;
			} );

	/**
	 * Characters that break a line in JavaScript source suitable for use in a
	 * regex charset.
	 */
	var NLS = "\r\n\u2028\u2029";

	/**
	 * For each state, a group of rules for consuming raw text and how that
	 * affects the document
	 * context.
	 * The rules each have an associated pattern, and the rule whose pattern
	 * matches earliest in the
	 * text wins.
	 */
	var TRANSITIONS = [];
	TRANSITIONS[ STATE_HTML_PCDATA ] = [
		new TransitionToSelf( /^[^<]+/ ),
		new ToTransition( /<!--/, STATE_HTML_COMMENT ),
		new ToTagTransition( /<script(?=[\s>\/]|$)/i, ELEMENT_TYPE_SCRIPT ),
		new ToTagTransition( /<style(?=[\s>\/]|$)/i, ELEMENT_TYPE_STYLE ),
		new ToTagTransition( /<textarea(?=[\s>\/]|$)/i, ELEMENT_TYPE_TEXTAREA ),
		new ToTagTransition( /<title(?=[\s>\/]|$)/i, ELEMENT_TYPE_TITLE ),
		new ToTagTransition( /<xmp(?=[\s>\/]|$)/i, ELEMENT_TYPE_XMP ),
		new ToTransition( /<\/?/, STATE_HTML_BEFORE_TAG_NAME ) ];
	TRANSITIONS[ STATE_HTML_RCDATA ] = [
		new RcdataEndTagTransition( /<\/(\w+)\b/ ),
		TRANSITION_TO_SELF ];
	TRANSITIONS[ STATE_HTML_BEFORE_TAG_NAME ] = [
		new ToTransition( /^[a-z]+/i, STATE_HTML_TAG_NAME ),
		new ToTransition( /^(?=[^a-z])/i, STATE_HTML_PCDATA ) ];
	TRANSITIONS[ STATE_HTML_TAG_NAME ] = [
		new TransitionToSelf( /^[a-z0-9:-]*(?:[a-z0-9]|$)/i ),
		new ToTagTransition( /^(?=[\/\s>])/, ELEMENT_TYPE_NORMAL ) ];
	TRANSITIONS[ STATE_HTML_TAG ] = [
		// Allows {@code data-foo} and other dashed attribute names, but
		// intentionally disallows "--" as an attribute name so that a tag ending
		// after a value-less attribute named "--" cannot be confused with a HTML
		// comment end ("-->").
		new TransitionToAttrName( /^\s*([a-z][\w-]*)/i ),
		new TagDoneTransition( /^\s*\/?>/ ),
		new TransitionToSelf( /^\s+$/ ) ];
	TRANSITIONS[ STATE_HTML_ATTRIBUTE_NAME ] = [
		new TransitionToState( /^\s*=/, STATE_HTML_BEFORE_ATTRIBUTE_VALUE ),
		// For a value-less attribute, make an epsilon transition back to the tag
		// body context to look for a tag end or another attribute name.
		new TransitionBackToTag( /^/ ) ];
	TRANSITIONS[ STATE_HTML_BEFORE_ATTRIBUTE_VALUE ] = [
		new TransitionToAttrValue( /^\s*"/, DELIM_TYPE_DOUBLE_QUOTE ),
		new TransitionToAttrValue( /^\s*'/, DELIM_TYPE_SINGLE_QUOTE ),
		new TransitionToAttrValue( /^(?=[^"'\s>])/,  // Start of unquoted value.
															DELIM_TYPE_SPACE_OR_TAG_END ),
		// Epsilon transition back if there is an empty value followed by an obvious
		// attribute name or a tag end.
		// The first branch handles the blank value in:
		//    <input value=>
		// and the second handles the blank value in:
		//    <input value= name=foo>
		new TransitionBackToTag( /^(?=>|\s+[\w-]+\s*=)/ ),
		new TransitionToSelf( /^\s+/ ) ];
	TRANSITIONS[ STATE_HTML_COMMENT ] = [
		new ToTransition( /-->/, STATE_HTML_PCDATA ),
		TRANSITION_TO_SELF ];
	TRANSITIONS[ STATE_HTML_NORMAL_ATTR_VALUE ] = [
		TRANSITION_TO_SELF ];
	// The CSS transitions below are based on
	// http://www.w3.org/TR/css3-syntax/#lexical
	TRANSITIONS[ STATE_CSS ] = [
		new TransitionToState( /\/\*/, STATE_CSS_COMMENT ),
		// TODO: Do we need to support non-standard but widely supported C++ style
		// comments?
		new TransitionToState( /"/, STATE_CSS_DQ_STRING ),
		new TransitionToState( /'/, STATE_CSS_SQ_STRING ),
		new CssUriTransition( /\burl\s*\(\s*(["']?)/i ),
		STYLE_TAG_END,
		TRANSITION_TO_SELF ];
	TRANSITIONS[ STATE_CSS_COMMENT ] = [
		new TransitionToState( /\*\//, STATE_CSS ),
		STYLE_TAG_END,
		TRANSITION_TO_SELF ];
	TRANSITIONS[ STATE_CSS_DQ_STRING ] = [
		new TransitionToState( /"/, STATE_CSS ),
		// Line continuation or escape.
		new TransitionToSelf( /\\(?:\r\n?|[\n\f"])/ ),
		new ToTransition( /[\n\r\f]/, STATE_ERROR ),
		STYLE_TAG_END,  // TODO: Make this an error transition?
		TRANSITION_TO_SELF ];
	TRANSITIONS[ STATE_CSS_SQ_STRING ] = [
		new TransitionToState( /'/, STATE_CSS ),
		// Line continuation or escape.
		new TransitionToSelf( /\\(?:\r\n?|[\n\f'])/ ),
		new ToTransition( /[\n\r\f]/, STATE_ERROR ),
		STYLE_TAG_END,  // TODO: Make this an error transition?
		TRANSITION_TO_SELF ];
	TRANSITIONS[ STATE_CSS_URI ] = [
		new TransitionToState( /[\\)\s]/, STATE_CSS ),
		URI_PART_TRANSITION,
		new TransitionToState( /["']/, STATE_ERROR ),
		STYLE_TAG_END ];
	TRANSITIONS[ STATE_CSS_SQ_URI ] = [
		new TransitionToState( /'/, STATE_CSS ),
		URI_PART_TRANSITION,
		// Line continuation or escape.
		new TransitionToSelf( /\\(?:\r\n?|[\n\f'])/ ),
		new ToTransition( /[\n\r\f]/, STATE_ERROR ),
		STYLE_TAG_END ];
	TRANSITIONS[ STATE_CSS_DQ_URI ] = [
		new TransitionToState( /"/, STATE_CSS ),
		URI_PART_TRANSITION,
		// Line continuation or escape.
		new TransitionToSelf( /\\(?:\r\n?|[\n\f"])/ ),
		new ToTransition( /[\n\r\f]/, STATE_ERROR ),
		STYLE_TAG_END ];
	TRANSITIONS[ STATE_JS ] = [
		new TransitionToState( /\/\*/, STATE_JS_BLOCK_COMMENT ),
		new TransitionToState( /\/\//, STATE_JS_LINE_COMMENT ),
		new TransitionToJsString( /"/, STATE_JS_DQ_STRING ),
		new TransitionToJsString( /'/, STATE_JS_SQ_STRING ),
		new SlashTransition( /\// ),
		// Shuffle words, punctuation (besides /), and numbers off to an
		// analyzer which does a quick and dirty check to update isRegexPreceder.
		new JsPuncTransition( /(?:[^<\/"'\s\\]|<(?!\/script))+/i ),
		new TransitionToSelf( /\s+/ ),  // Space
		SCRIPT_TAG_END ];
	TRANSITIONS[ STATE_JS_BLOCK_COMMENT ] = [
		new TransitionToState( /\*\//, STATE_JS ),
		SCRIPT_TAG_END,
		TRANSITION_TO_SELF ];
	// Line continuations are not allowed in line comments.
	TRANSITIONS[ STATE_JS_LINE_COMMENT ] = [
		new TransitionToState( new RegExp( "[" + NLS + "]" ), STATE_JS ),
		SCRIPT_TAG_END,
		TRANSITION_TO_SELF ];
	TRANSITIONS[ STATE_JS_DQ_STRING ] = [
		new DivPreceder( /"/ ),
		SCRIPT_TAG_END,
		new TransitionToSelf( new RegExp(
							"^(?:" +                    // Case-insensitively, from start
								"[^\"\\\\" + NLS + "<]" + // match chars - newlines, quotes, \s;
								"|\\\\(?:" +              // or backslash followed by a
									"\\r\\n?" +             // line continuation
									"|[^\\r<]" +            // or an escape
									"|<(?!/script)" +       // or non-closing less-than.
								")" +
								"|<(?!/script)" +
							")+", "i" ) ) ];
	TRANSITIONS[ STATE_JS_SQ_STRING ] = [
		new DivPreceder( /'/ ),
		SCRIPT_TAG_END,
		new TransitionToSelf( new RegExp(
							"^(?:" +                    // Case-insensitively, from start
								"[^'\\\\" + NLS + "<]" +  // match chars - newlines, quotes, \s;
								"|\\\\(?:" +              // or a backslash followed by a
									"\\r\\n?" +             // line continuation
									"|[^\\r<]" +            // or an escape;
									"|<(?!/script)" +       // or non-closing less-than.
								")" +
								"|<(?!/script)" +
							")+", "i" ) ) ];
	TRANSITIONS[ STATE_JS_REGEX ] = [
		new DivPreceder( /\// ),
		SCRIPT_TAG_END,
		new TransitionToSelf( new RegExp(
							"^(?:" +
								// We have to handle [...] style character sets specially since
								// in /[/]/, the second solidus doesn't end the RegExp.
								"[^\\[\\\\/<" + NLS + "]" + // A non-charset, non-escape token;
								"|\\\\[^" + NLS + "]" +   // an escape;
								"|\\\\?<(?!/script)" +
								"|\\[" +                  // or a character set containing
									"(?:[^\\]\\\\<" + NLS + "]" +  // normal characters,
									"|\\\\(?:[^" + NLS + "]))*" +  // and escapes;
									"|\\\\?<(?!/script)" +  // or non-closing angle less-than.
								"\\]" +
							")+", "i" ) ) ];
		// TODO: Do we need to recognize URI attributes that start with javascript:,
		// data:text/html, etc. and transition to JS instead with a second layer of
		// percent decoding triggered by a protocol in (DATA, JAVASCRIPT, NONE)
		// added to Context?
	TRANSITIONS[ STATE_URI ] = [ URI_PART_TRANSITION ];


	/** @constructor */
	function RawTextContextUpdater() {
		/** The amount of rawText consumed. */
		this.numCharsConsumed = 0;
		/** The context to which we transition. */
		this.next = 0;
	}

	/**
	 * Consume a portion of text and compute the next context.
	 * Output is stored in member variables.
	 * @param {string} text Non empty.
	 */
	RawTextContextUpdater.prototype.processNextToken
			= function ( text, context ) {
		if ( isErrorContext( context ) ) {  // The ERROR state is infectious.
			this.numCharsConsumed = text.length;
			this.next = context;
			return;
		}

		// Find the transition whose pattern matches earliest in the raw text.
		var earliestStart = Infinity;
		var earliestEnd = -1;
		var earliestTransition;
		var earliestMatch;
		var stateTransitions = TRANSITIONS[ stateOf( context ) ];
		var transition, match, start, end;
		var i, n = stateTransitions.length;
		for ( i = 0; i < n; ++i ) {
			transition = stateTransitions[ i ];
			match = text.match( transition.pattern );
			if ( match ) {
				start = match.index;
				if ( start < earliestStart ) {
					end = start + match[ 0 ].length;
					if ( transition.isApplicableTo( context, match ) ) {
						earliestStart = start;
						earliestEnd = end;
						earliestTransition = transition;
						earliestMatch = match;
					}
				}
			}
		}

		if ( earliestTransition ) {
			this.next = earliestTransition.computeNextContext(
					context, earliestMatch );
			this.numCharsConsumed = earliestEnd;
		} else {
			this.next = STATE_ERROR;
			this.numCharsConsumed = text.length;
		}
		if ( !this.numCharsConsumed
				&& stateOf( this.next ) === stateOf( context ) ) {
			throw new Error(  // Infinite loop.
					// Avoid an explicit dependency on contentToString.  If we're
					// debugging uncompiled, then we get the benefit of it, but the
					// compiler can treat it as dead code.
					( DEBUG ? contextToString( context ) : context ) );
		}
	};


	/**
	 * @param {string} rawText A chunk of HTML/CSS/JS.
	 * @param {number} context The context before rawText.
	 * @return The context after rawText.
	 */
	function processRawText( rawText, context ) {
		while ( rawText ) {

			// If we are in an attribute value, then decode rawText (except
			// for the delimiter) up to the next occurrence of delimiter.

			// The end of the section to decode.  Either before a delimiter
			// or > symbol that closes an attribute, at the end of the rawText,
			// or -1 if no decoding needs to happen.

			var attrValueEnd = findEndOfAttributeValue(
					rawText, delimTypeOf( context ) );
			if ( attrValueEnd === -1 ) {
				// Outside an attribute value.  No need to decode.
				var cu = new RawTextContextUpdater();
				cu.processNextToken( rawText, context );
				rawText = rawText.substring( cu.numCharsConsumed );
				context = cu.next;

			} else {
				// Inside an attribute value.  Find the end and decode up to it.

				// All of the languages we deal with (HTML, CSS, and JS) use
				// quotes as delimiters.
				// When one language is embedded in the other, we need to
				// decode delimiters before trying to parse the content in the
				// embedded language.
				//
				// For example, in
				//       <a onclick="alert(&quot;Hello {$world}&quot;)">
				// the decoded value of the event handler is
				//       alert("Hello {$world}")
				// so to determine the appropriate escaping convention we
				// decode the attribute value before delegating to processNextToken.
				//

				// We could take the cross-product of two languages to avoid
				// decoding but that leads to either an explosion in the
				// number of states, or the amount of lookahead required.
				var rawTextLen = rawText.length;

				// The end of the attribute value.  At attrValueEnd, or
				// attrValueend + 1 if a delimiter needs to be consumed.
				var attrEnd = attrValueEnd < rawTextLen ?
						attrValueEnd + DELIM_TEXT[ delimTypeOf( context ) ].length : -1;

				// Decode so that the JavaScript rules work on attribute values like
				//     <a onclick='alert(&quot;{$msg}!&quot;)'>

				// If we've already processed the tokens "<a", " onclick='" to
				// get into the single quoted JS attribute context, then we do
				// three things:
				//   (1) This class will decode "&quot;" to "\"" and work below to
				//       go from STATE_JS to STATE_JS_DQ_STRING.
				//   (2) Then the caller checks {$msg} and realizes that $msg is
				//       part of a JS string.
				//   (3) Then, the above will identify the "'" as the end, and so we
				//       reach here with:
				//       r a w T e x t = " ! & q u o t ; ) ' > "
				//                                         ^ ^
				//                              attrValueEnd attrEnd

				// We use this example more in the comments below.

				var attrValueTail = unescapeHtml(
						rawText.substring( 0, attrValueEnd ) );
				// attrValueTail is "!\")" in the example above.

				// Recurse on the decoded value.
				var attrCu = new RawTextContextUpdater();
				while ( attrValueTail.length ) {
					attrCu.processNextToken( attrValueTail, context );
					attrValueTail = attrValueTail.substring( attrCu.numCharsConsumed );
					context = attrCu.next;
				}

				// TODO: Maybe check that context is legal to leave an attribute in.
				// Throw if the attribute ends inside a quoted string.

				if ( attrEnd !== -1 ) {
					rawText = rawText.substring( attrEnd );
					// rawText is now ">" from the example above.

					// When an attribute ends, we're back in the tag.
					context = STATE_HTML_TAG | elementTypeOf( context );
				} else {
					// Whole tail is part of an unterminated attribute.
					if ( attrValueEnd !== rawText.length ) {
						throw new Error();  // Illegal State
					}
					rawText = "";
				}
			}
		}
		return context;
	}


	// TODO: If we need to deal with untrusted templates, then we need to make
	// sure that tokens like <!--, </script>, etc. are never split with empty
	// strings.
	// We could do this by walking all possible paths through each template
	// (both branches for ifs, each case for switches, and the 0,1, and 2+
	// iteration case for loops).
	// For each template, tokenize the original's rawText nodes using
	// RawTextContextUpdater and then tokenize one single rawText node made by
	// concatenating all rawText.
	// If one contains a sensitive token, e.g. <!--/ and the other doesn't, then
	// we have a potential splitting attack.
	// That and disallow unquoted attributes, and be paranoid about prints
	// especially in the TAG_NAME productions.

	return processRawText;
}() );

/**
 * @param contextBefore the input context before the substitution.
 * @param out receives firstEscMode and secondEscMode properties with values
 *     from the ESC_MODE_* enum.
 */
function computeEscapingModeForSubst( contextBefore, out ) {
	var context = contextBeforeDynamicValue( contextBefore );
	var firstEscMode = ESC_MODE_FOR_STATE[ stateOf( context ) ];
	switch ( uriPartOf( context ) ) {
		case URI_PART_START:
			firstEscMode = ESC_MODE_FILTER_NORMALIZE_URI;
			context = ( context & ~URI_PART_ALL ) | URI_PART_PRE_QUERY;
			break;
		case URI_PART_QUERY:
			firstEscMode = ESC_MODE_ESCAPE_URI;
			break;
		case URI_PART_NONE: break;
		case URI_PART_FRAGMENT: case URI_PART_PRE_QUERY:
			// TODO: Check this in Soy.
			if ( attrTypeOf( context ) !== ATTR_TYPE_URI ) {
				firstEscMode = ESC_MODE_NORMALIZE_URI;
			}
			break;
		default: return STATE_ERROR;  // Unknown URI part.
	}
	if ( firstEscMode === void 0 ) {
		return STATE_ERROR;
	}
	var secondEscMode = null;
	var delimType = delimTypeOf( context );
	if ( delimType !== DELIM_TYPE_NONE ) {
		switch ( firstEscMode ) {
			case ESC_MODE_ESCAPE_HTML: break;
			case ESC_MODE_ESCAPE_HTML_ATTRIBUTE:
				if ( delimType === DELIM_TYPE_SPACE_OR_TAG_END ) {
					firstEscMode = ESC_MODE_ESCAPE_HTML_ATTRIBUTE_NOSPACE;
				}
				break;
			case ESC_MODE_ESCAPE_HTML_ATTRIBUTE_NOSPACE: break;
			default:
				if ( !IS_ESC_MODE_HTML_EMBEDDABLE[ firstEscMode ] ) {
					secondEscMode = delimType === DELIM_TYPE_SPACE_OR_TAG_END
							? ESC_MODE_ESCAPE_HTML_ATTRIBUTE_NOSPACE
							: ESC_MODE_ESCAPE_HTML_ATTRIBUTE;
				}
				break;
		}
	}
	out.firstEscMode = firstEscMode;
	out.secondEscMode = secondEscMode;
	return context;
}


function autoescape( jqueryTemplatesByName ) {
	if ( DEBUG && typeof jqueryTemplatesByName !== "object" ) {
		throw new Error;
	}

	var hop = Object.hasOwnProperty;
	var parsedTemplates = {};

	// Assigns IDs to nodes that can be used as keys in the inferences maps.
	var idCounter = 0;
	function assignIds( node ) {
		if ( typeof node === "object" ) {
			node.parseTreeNodeId = ++idCounter;
			for ( var i = 2, n = node.length; i < n; ++i ) {
				assignIds( node[ i ] );
			}
		}
	}

	// Make sure all templates are parsed.
	for ( var templateName in jqueryTemplatesByName ) {
		if ( hop.call( jqueryTemplatesByName, templateName ) ) {
			var template = jqueryTemplatesByName[ templateName ];
			template.jqueryTemplateName = templateName;
			assignIds( parsedTemplates[ templateName ] = template );
		}
	}

	// Looks up a template by name.
	function getTemplateParseTree( name, context ) {
		var qname = context ? name + "__C" + context : name;
		if ( hop.call( parsedTemplates, qname ) ) {
			return parsedTemplates[ qname ];
		} else if ( hop.call( parsedTemplates, name ) ) {
			// Clone one in the given context if none is found.
			var base = parsedTemplates[ name ];
			var clone = cloneParseTree( base );
			clone.jqueryTemplateName = qname;
			assignIds( clone );
			return parsedTemplates[ qname ] = clone;
		}
		return void 0;
	}

	var inferences = {
		// Maps IDs of ${...} nodes to lists of escaping modes.
		escapingModes: {},
		// For {{tmpl}}&{{wrap}} calls, the context in which the template is called.
		calleeName: {},
		// Maps template names to output contexts.
		outputContext: {}
	};

	function makeChildInferences( parent ) {
		function derive( a ) {
			/** @constructor */
			function ctor() {}
			ctor.prototype = a;
			return new ctor;
		}
		var inferences = {};
		for ( var k in parent ) {
			if ( hop.call( parent, k ) ) {
				inferences[ k ] = derive( parent[ k ] );
			}
		}
		return inferences;
	}

	function commitInferencesIntoParent( child, parent ) {
		for ( var k in parent ) {
			if ( hop.call( parent, k ) ) {
				var parentMap = parent[ k ];
				var childMap = child[ k ];
				for ( var j in childMap ) {
					if ( hop.call( childMap, j ) ) {
						parentMap[ j ] = childMap[ j ];
					}
				}
			}
		}
	}

	// Propagates context across a template body to compute its output context.
	function getTemplateOutputContext(
			templateBody, inputContext, parentInferences ) {
		var templateId = templateBody.parseTreeNodeId;

		// Stop if we have already computed the output context for this template.
		if ( templateId in parentInferences.outputContext ) {
			return parentInferences.outputContext[ templateId ];
		}

		// Construct an inferences object that inherits from the parent.
		var inferences = makeChildInferences( parentInferences );

		// We need to optimistically commit to an output context to avoid
		// infinite recursion for recursive templates.

		// This is true for almost all templates people actually write.
		inferences.outputContext[ templateId ] = inputContext;

		var outputContext = processTemplate(
				templateBody, inputContext, inferences );

		if ( outputContext === inputContext ) {
			// Our optimistic assumption was correct.
		} else {

			// Optimistically assume that we have a steady state.
			inferences.outputContext[ templateId ] = outputContext;

			inferences = makeChildInferences( parentInferences );
			var outputContext2 = processTemplate(
					templateBody, inputContext, inferences );
			if ( outputContext2 === outputContext ) {
				// Our second optimistic assumption was correct.
			} else {
				var name = templateBody.jqueryTemplateName;
				if ( DEBUG ) {
					throw new Error(
							"Cannot determine an output context for " + name );
				} else {
					throw new Error;
				}
			}
		}

		commitInferencesIntoParent( inferences, parentInferences );
		return outputContext;
	}

	function processTemplate( templateBody, inputContext, inferences ) {
		var name = templateBody.jqueryTemplateName;

		// Generate a debugging string for a template node.
		// Only used when DEBUG is true.
		function errorLocation( parseTree ) {
			var lineNum = 1;
			function walk( node ) {
				if ( ( typeof node ) === "string" ) {
					var m = node.match( /\r\n?|\n/g );
					if ( m ) { lineNum += m.length; }
				} else {
					if ( node === parseTree ) {
						var sourceAbbreviated = renderParseTree( parseTree )
								.replace( /\s+/g, " " );
						var len = sourceAbbreviated.length;
						if ( len > 35 ) {
							sourceAbbreviated = sourceAbbreviated.substring( 0, 16 ) + "..."
									+ sourceAbbreviated.substring( len - 16 );
						}
						return name + ":" + lineNum + ":`" + sourceAbbreviated + "`";
					}
					for ( var i = 1, n = node.length; i < n; ++i ) {
						var out = walk( node[ i ] );
						if ( out ) { return out; }
					}
				}
				return void 0;
			}
			return walk( templateBody );
		}

		function process( parseTree, context, opt_parent ) {
			if ( typeof parseTree === "string" ) {
				if ( DEBUG ) {
					try {
						return processRawText( parseTree, context );
					} catch ( ex ) {
						ex.message = ex.description = errorLocation( opt_parent ) + ": " +
								( ex.message || ex.description || "" );
						throw ex;
					}
				} else {
					return processRawText( parseTree, context );
				}
			}
			var i = 2, n = parseTree.length;
			var startContext = context;
			var type = parseTree[ 0 ];
			if ( type === "html" ) {
				// {{html xyz}} --> ${new SanitizedHtml(xyz)}
				parseTree[ 0 ] = "=";
				parseTree[ 1 ] = "new SanitizedHtml(" + parseTree[ 1 ] + ")";
				parseTree.length = 2;
				// Re-process as a substitution.
				context = process( parseTree, context, opt_parent );
			} else if ( type === "if" ) {
				// The output context is the union of the context across each branch.
				var outputContext = context;
				// If there is an else branch then we don't need to union the start
				// context with the output context of each branch.
				for ( var j = n; --j >= 2; ) {
					var child = parseTree[ j ];
					if ( "else" === child[ 0 ] ) {
						if ( "" === child[ 1 ] ) {
							outputContext = null;
						}
						break;
					}
				}
				for ( ; i <= n; ++i ) {
					var child = parseTree[ i ];
					if ( i === n || "else" === child[ 0 ] ) {
						if ( outputContext === null ) {
							outputContext = context;
						} else {
							// Union the context from preceding branches with
							// the context from this branch.
							var combined = contextUnion( outputContext, context );
							if ( isErrorContext( combined ) ) {
								if ( DEBUG ) {
									throw new Error(
											errorLocation( parseTree )
											+ ": Branch ends in irreconcilable contexts "
											+ contextToString( context ) + " and "
											+ contextToString( outputContext ) );
								} else {
									throw new Error;
								}
							}
							outputContext = combined;
						}
						context = startContext;
					} else {
						context = process( child, context, parseTree );
					}
				}
				context = outputContext;
			} else if ( type === "each" ) {
				// Blank out the type tag so we can recurse over the body.
				for ( var timeThroughLoop = 2; --timeThroughLoop >= 0; ) {
					var contextBefore = context, contextAfter;
					parseTree[ 0 ] = "";
					try {
						// Union with context in case the loop body is never entered.
						contextAfter = process( parseTree, context, opt_parent );
						context = contextUnion( contextBefore, contextAfter );
					} finally {
						parseTree[ 0 ] = "each";
					}
					if ( isErrorContext( context ) ) {
						if ( DEBUG ) {
							throw new Error(
									errorLocation( parseTree )
									+ ": Loop ends in irreconcilable contexts "
									+ contextToString( contextBefore ) + " and "
									+ contextToString( contextAfter ) );
						} else {
							throw new Error;
						}
					}
				}
			} else if ( type === "tmpl" || type === "wrap" ) {
				// Expect content with a templateName in double quotes.
				var calleeBaseName = getCalleeName( parseTree );
				if ( calleeBaseName ) {
					if ( !/__C\d+$/.test( calleeBaseName ) ) {
						var callee = getTemplateParseTree( calleeBaseName, context );
						if ( callee ) {
							inferences.calleeName[ parseTree.parseTreeNodeId ]
									= callee.jqueryTemplateName;
							context = getTemplateOutputContext( callee, context, inferences );
						} else if ( DEBUG ) {
							if ( typeof console !== "undefined" ) {
								console.warn(
										"Template unavailable to autoescaper %s", calleeBaseName );
							}
						}
					}
				} else {
					if ( DEBUG ) {
						throw new Error(
								errorLocation( parseTree ) + ": Malformed call" );
					} else {
						throw new Error;
					}
				}
				if ( "wrap" === parseTree[ 0 ] ) {
					var childContext = STATE_HTML_PCDATA;
					for ( ; i < n; ++i ) {
						childContext = process( parseTree[ i ], childContext, parseTree );
					}
					if ( childContext !== STATE_HTML_PCDATA ) {
						if ( DEBUG ) {
							throw new Error(
									errorLocation( parseTree )
									+ ": {{wrap}} does not end in HTML PCDATA context" );
						} else {
							throw new Error;
						}
					}
				}
			} else if ( type === "=" ) {
				// ${xyz}} -> ${escapingDirective(xyz)}
				context = contextBeforeDynamicValue( context );
				var escapingModes = {};
				var afterEscaping = computeEscapingModeForSubst(
						context, escapingModes );
				if ( isErrorContext( afterEscaping ) ) {
					if ( DEBUG ) {
						var uriPart = uriPartOf( context );
						if ( uriPart === URI_PART_UNKNOWN ||
								 uriPart === URI_PART_UNKNOWN_PRE_FRAGMENT ) {
							throw new Error(
									errorLocation( parseTree )
									+ ": Cannot determine which part of the URL ${...} is in" );
						} else {
							throw new Error(
									errorLocation( parseTree )
									+ ": Don't put ${...} inside comments" );
						}
					} else {
						throw new Error;
					}
				}
				var EXISTING_ESCAPING_DIRECTIVE_RE
						= /^\s*(?:\$\.encode|noAutoescape)\b/;
				// Do not add escaping directives if there is an existing one.
				if ( !EXISTING_ESCAPING_DIRECTIVE_RE.test( parseTree[ 1 ] ) ) {
					if ( typeof escapingModes.firstEscMode === "number" ) {
						var modes = [];
						modes[ 0 ] = escapingModes.firstEscMode;
						if ( typeof escapingModes.secondEscMode === "number" ) {
							modes[ 1 ] = escapingModes.secondEscMode;
						}
						inferences.escapingModes[ parseTree.parseTreeNodeId ] = modes;
					}
				}
				context = afterEscaping;
			} else {
				while ( i < n ) {
					context = process( parseTree[ i++ ], context, parseTree );
				}
			}
			return context;
		}

		return process( templateBody, inputContext );
	}

	function getCalleeName( parseTree ) {
		var m = parseTree[ 1 ].match( /(?:^|\))\s*("[^)\s]+")\s*$/ );
		return m && Function( "return " + m[ 1 ] )();
	}

	function callsTypable( parseTree ) {
		var typeTag = parseTree[ 0 ];
		if ( typeTag === "tmpl" || typeTag === "wrap" ) {
			var calleeName = getCalleeName( parseTree );
			if ( calleeName && checkWhetherToType( calleeName ) ) {
				return TRUTHY;
			}
		}
		for ( var i = parseTree.length; --i >= 2; ) {
			if ( callsTypable( parseTree[ i ] ) ) { return TRUTHY; }
		}
		return FALSEY;
	}

	var shouldTypeByName = {};
	function checkWhetherToType( templateName ) {
		if ( hop.call( shouldTypeByName, templateName ) ) {
			return shouldTypeByName[ templateName ];
		}
		var template = parsedTemplates[ templateName ];
		if ( template ) {
			for ( var i = template.length; --i >= 0; ) {
				if ( "noAutoescape" === template[ i ][ 0 ] ) {
					shouldTypeByName[ templateName ] = FALSEY;
					return shouldTypeByName[ templateName ] = callsTypable( template );
				}
			}
			return shouldTypeByName[ templateName ] = TRUTHY;
		}
		return void 0;
	}

	for ( var templateName in parsedTemplates ) {
		if ( hop.call( parsedTemplates, templateName ) ) {
			checkWhetherToType( templateName );
		}
	}

	// Type each template.
	for ( var templateName in shouldTypeByName ) {
		if ( TRUTHY === shouldTypeByName[ templateName ] ) {
			getTemplateOutputContext(
					parsedTemplates[ templateName ], STATE_HTML_PCDATA, inferences );
		}
	}

	var shouldSanitize;

	// Apply the changes suggested in inferences.
	function mutate( parseTreeNode ) {
		var id = parseTreeNode.parseTreeNodeId;
		switch ( parseTreeNode[ 0 ] ) {
			case "noAutoescape":
				shouldSanitize = FALSEY;
				return "";
			case "=":  // Add escaping directives.
				if ( shouldSanitize ) {
					var escapingModes = inferences.escapingModes[ id ];
					if ( escapingModes ) {
						var expr = parseTreeNode[ 1 ];
						for ( var i = 0; i < escapingModes.length; ++i ) {
							expr += "=>$.encode" + (
									DEBUG
									? "." + SANITIZER_FOR_ESC_MODE[ escapingModes[ i ] ].name
									: "[" + escapingModes[ i ] + "]" );
						}
						parseTreeNode[ 1 ] = expr;
					}
				}
				break;
			case "tmpl": case "wrap":  // Rewrite calls in context.
				var calleeName = inferences.calleeName[ id ];
				if ( calleeName ) {
					// The form of a {{tmpl}}'s content is
					//    ['(' [<data>[, <options>]] ')'] '"#'<name>'"'
					parseTreeNode[ 1 ] = parseTreeNode[ 1 ].replace(
							/"[^)\s]*"\s*$/, JSON.stringify( calleeName ) );
				}
				break;
		}
		for ( var i = 2, n = parseTreeNode.length; i < n; ++i ) {
			var child = parseTreeNode[ i ];
			if ( typeof child !== "string" ) {
				parseTreeNode[ i ] = mutate( child );
			}
		}
		return parseTreeNode;
	}

	// This loop includes any cloned templates.
	for ( var templateName in parsedTemplates ) {
		if ( hop.call( parsedTemplates, templateName ) ) {
			shouldSanitize = TRUTHY;
			mutate( parsedTemplates[ templateName ] );
		}
	}

	return parsedTemplates;
}

function cloneParseTree( ptree ) {
	// Once JSON is supported on all interpreters, this can be replaced with
	// return JSON.parse(JSON.stringify(ptree));
	var clone = ptree.slice();
	for ( var i = clone.length; --i >= 0; ) {
		if ( clone[ i ].push ) {  // Recurse if it is an array.
			clone[ i ] = cloneParseTree( clone[ i ] );
		}
	}
	return clone;
}


if ( !JQUERY_TMPL_PRECOMPILED ) {
	$[ TEMPLATE_PLUGINS_PROP_NAME ].push( autoescape
//			// Naive auto-escape.
//			function autoescape( parseTrees ) {
//				$.each(
//						parseTrees,
//						function autoescapeOne( _, parseTree ) {
//							if ( "string" !== typeof parseTree ) {
//								if ( parseTree[ 0 ] === "=" ) {
//									parseTree[ 1 ] += "=>$.encode";
//								} else if ( parseTree[ 0 ] === "html" ) {
//									parseTree[ 0 ] = "=";
//								} else {
//									$.each( parseTree, autoescapeOne );
//								}
//							}
//						} );
//				return parseTrees;
//			}
);
}
 }());

/*!
 * jQuery Render Plugin v1.0pre
 * Optimized version of jQuery Templates, for rendering to string
 * http://github.com/BorisMoore/jsrender
 */

(function( $, undefined ) {
	var topView = { parent: null }; // FALSEY?

	$.fn.extend({
		// Use first wrapped element as template markup.
		// Return string obtained by rendering the template against data.
		render: function( data, options, parentView ) {
			return $.render( this[0], data, options, parentView );
		}
	});

	$.extend({
		// Return string obtained by rendering template against data.
		render: function( tmpl, data, options, parentView ) {
			if ( !tmpl.tmpl || !$.isFunction( tmpl.tmpl ) ) {
				tmpl = tmpl.nodeType ? $.template( null, tmpl.innerHTML) : $.template(tmpl) || $.template( null, tmpl );
			}
			return tmpl.tmpl( data, $.extend( {}, topView, options ));
		}
	});
})( jQuery );
