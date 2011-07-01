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
			+ "with($data=$." + EXT_ALL_METHOD_NAME + "("
			// Where EcmaScript 5's Object.create is available, use that to prevent
			// Object.prototype properties from masking globals.
			+ "Object.create?Object.create(null):{},"
			+ "$data||{})){"
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
								: inScope.length
								? ( "[$." + EXT_ALL_METHOD_NAME
										+ "({},$data,{" + inScope + "}),$item]" )
								// If the content specifies neither data nor options, and
								// no loop vars are in scope, use the arguments without the
								// overhead of a call to $.extend.
								: "arguments",
								",$.template((",
								match[ 2 ],
								")).tmpl(", tmpName, "[0],", tmpName, "[1]))" );

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
	javaScriptSource.push( hasValue ? ")}" : "'')}" );

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

if ( !JQUERY_TMPL_PRECOMPILED ) {
	$[ TEMPLATE_PLUGINS_PROP_NAME ].push(
			// Naive auto-escape.
			function autoescape( parseTrees ) {
				$.each(
						parseTrees,
						function autoescapeOne( _, parseTree ) {
							if ( "string" !== typeof parseTree ) {
								if ( parseTree[ 0 ] === "=" ) {
									parseTree[ 1 ] += "=>$.encode";
								} else if ( parseTree[ 0 ] === "html" ) {
									parseTree[ 0 ] = "=";
								} else {
									$.each( parseTree, autoescapeOne );
								}
							}
						} );
				return parseTrees;
			} );
}
 }())
