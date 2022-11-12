// Type definitions for JsViews 1.0
// Version: "v1.0.12"
// Project: http://www.jsviews.com/#jsviews
// Definitions by: Boris Moore <https://github.com/borismoore>
// Definitions: https://www.jsviews.com/download/typescript/jsviews/index.d.ts
// TypeScript Version: 2.3

/// <reference types="jquery" />

declare module 'jsviews' {
  export = jsviews;
}

declare const jsviews: ((jquery?: JQueryStatic) => JQueryStatic) & JQueryStatic;

// ********************************** JsRender **********************************

interface JQueryStatic {
	/* var htmlString = $.render.templateName(data, myHelpersObject); // Render named template */
	render: {
		[tmplName: string]: JsViews.TemplateRender;
	};

	/* $.views.xxx ... // JsRender/JsViews APIs */
	views: JsViews.Views;

	/* $.templates(...) or $.templates.templateName: Compile/get template */
	templates: JsViews.Templates;
}

interface JQuery {
	/* var htmlString = $("#template").render(data, myHelpersObject); // Render template, and pass in helpers or context */
	render: JsViews.TemplateRender;
}

declare namespace JsViews {

/* Generic hash of objects of type T */
interface Hash<T> {
	[option: string]: T;
}

/* $.views*/
interface Views {
	/* $.views.templates() */
	templates: Templates;

	/* $.views.converters() */
	converters: Store<Converter, Converter>;

	/* $.views.tags() */
	tags: Store<Tag, TagSetter>;

	/* $.views.helpers() */
	helpers: Store<any, any>;

	/* $.views.viewModels() */
	viewModels: ViewModels;

	/* $.views.settings */
	settings: Settings;

	/* $.views.sub.xxx */
	sub: Hash<any>;

	/* $.views.map() */
	map(any: any): any;
}

/* $.views.settings*/
interface Settings {
	/**
	 * Set delimiters
	 * $.views.settings.delimiters(...)
	 *
	 * @param {string}   openChars
	 * @param {string}   [closeChars]
	 * @param {string}   [link]
	 * @returns {Settings}
	 */
	delimiters(openChars: string, closeChars?: string, link?: string): Settings;
	delimiters(chars: string[]): Settings;
	/**
	 * Get delimiters
	 * delimsArray = $.views.settings.delimiters()
	 *
	 * @returns {string[]}
	 */
	delimiters(): string[];

	/**
	 * Set debug mode
	 * $.views.settings.debugMode(true)
	 *
	 * @param {boolean}  debugMode
	 * @returns {Settings}
	 */
	debugMode(debugMode: boolean | ((e?: any, fallback?: string, view?: View) => any)): Settings;
/**
 * Get debug mode setting
 * debugMode = $.views.settings.debugMode()
 *
 * @returns {boolean}
 */
debugMode(): boolean;

/**
 * Set allowCode mode
 * $.views.settings.allowCode(true)
 *
 * @param {boolean}  allowCode
 * @returns {Settings}
 */
allowCode(allowCode: boolean): Settings;
/**
 * Get allowCode mode setting
 * allowCode = $.views.settings.allowCode()
 *
 * @returns {boolean}
 */
allowCode(): boolean;

/**
 * Set advanced settings (useViews, _jsv ...)
 * $.views.settings.advanced({useViews: true})
 *
 * @param {object}  settings
 * @returns {Settings}
 */
advanced(settings: Hash < any>): Settings;
/**
 * Get advanced settings
 * advancedSettings = $.views.settings.advanced()
 *
 * @returns {object}
 */
advanced(): Hash < any>;
}

interface Store<T, TO> {
	/**
	 * Generic store() function to register item, named item, or hash of items
	 * Also used as hash to store the registered items
	 * Used as implementation of $.templates(), $.views.templates(), $.views.tags(), $.views.helpers() and $.views.converters()
	 *
	 * @param {string|hash}   name         name - or selector, in case of $.templates(). Or hash of items
	 * @param {any}           [item]       (e.g. markup for named template)
	 * @param {Template}      [parentTmpl] For item being registered as private resource of template
	 * @returns {any|Views}              e.g. compiled template - or $.views in case of registering hash of items
	 */
	(name: string, item?: TO, parentTmpl?: Template): T; // named item
	(namedItems: Hash<TO>, parentTmpl?: Template): Views; // Multiple named items

	/**
	 * var template = $.templates.templateName; // Get compiled named template - or similar for named tags, converters, helpers, viewModels
	 */
	[itemName: string]: T;
}

// Templates

interface Templates extends Store<Template, TemplateSetter> {
	/**
	 * Additional $.templates() signature for compiling unnamed template
	 *
	 * @param {string|TemplateOptions}   markup or selector
	 * @param {Template}                 [parentTmpl] For compling template as private resource of parent template
	 * @returns {Template}               compiled template
	 */
	(markupOrSelectorOrOptions: string | TemplateOptions, parentTmpl?: Template): Template; // Unnamed template
}

interface TemplateOptions {
	/* Template options hash */
	tags?: Hash<TagSetter>;
	templates?: Hash<TemplateSetter>;

	markup: any;
	converters?: Hash<Converter>;
	helpers?: Hash<any>;
	useViews?: boolean;
}

type TemplateSetter = TemplateOptions | string;

interface Template extends TemplateRender {
	/* Compiled template object */
	tmplName: string;
	tags?: Hash<Tag>;
	templates?: Hash<Template>;
	render: TemplateRender;
	fn?: (...args: any[]) => string;
	_is: string;

	markup: string;
	converters?: Hash<Converter>;
	helpers?: Hash<any>;
	useViews?: boolean;
}

interface TemplateRender {
	/**
	 * Template render method: render the template as a string, using the specified data and helpers/context
	 * var htmlString = template(data, myHelpersObject);
	 * var htmlString = template.render(data, myHelpersObject);
	 *
	 * $("#tmpl").render(), tmpl.render(), tagCtx.render(), $.render.namedTmpl()
	 *
	 * @param {any}        data
	 * @param {hash}       [helpersOrContext]
	 * @param {boolean}    [noIteration]
	 * @returns {string}   rendered template
	 */
	(data?: any, helpersOrContext?: Hash<any>, noIteration?: boolean): string;
	(data?: any, noIteration?: boolean): string;
}

// ViewModels

interface ViewModelOptions {
	/* ViewModel options hash */
	// getters?: string[] | ;
	getters?: any[];
	extend?: Hash<any>;
	id?: string | ((a: any, b: any) => boolean);
}

interface ViewModel {
	/* ViewModel options hash */
	getters: string[];
	extend: Hash<any>;
	map(data: any): any;
	(...args: any[]): any;
	[prop: string]: any;
}

interface ViewModels extends Hash<ViewModel> {
	/* $.views.viewModels() */
	(viewModel: ViewModelOptions): ViewModel;
	(name: string, viewModel: ViewModelOptions, viewModels?: Hash<ViewModel>): ViewModel;
	(namedItems: Hash<ViewModelOptions>, viewModels?: Hash<ViewModel>): Hash<ViewModel>;
}

// Converters

interface Converter {
	/* Converter function */
	(value: any, ...restArgs: any[]): any;
}

// Tags

interface TagOptionProps {
	/* Properties that can be set as tag options, and retrieved as Tag properties */
	init?: (this: TagInst, tagCtx?: TagCtx, linkCtx?: LinkCtx, ctx?: Context) => void ;
  render?: (this: TagInst, ...args: any[]) => string |void ;
  baseTag?: string | Tag;
  contentCtx?: boolean | ((this: TagInst, arg0: any) => any);
  convert?: string | Converter;
  argDefault?: boolean;
  bindTo?: number | string | Array < number |string>;
  bindFrom?: number | string | Array < number |string>;
  flow?: boolean;
  ctx?: Hash < any>;
  [prop: string]: any;
}

interface TagOptions extends TagOptionProps {
	/* Tag options hash */
	template?: TemplateSetter;
}

type TagSetter = TagOptions | string | ((...args: any[]) => any);

interface Tag extends TagOptionProps {
	/* Tag object */
	tagCtx: TagCtx;
	tagCtxs: TagCtx[];
	tagName: string;
	parent?: Tag;
	parents?: Hash<Tag>;
	rendering?: Hash<any>;
	ctxPrm(name: string, value?: any): any; // get/set in JsViews but get only in JsRender
	cvtArgs(elseBlock?: number): any[] | void ;
bndArgs(elseBlock?: number): any[] | void ;
  base?: (...args: any[]) => any;
  baseApply?: (args: any[]|IArguments) => any;
}

interface TagInst extends Tag {
	template?: TemplateSetter;
}

interface Context {
	/* ctx object */
	/* Root data object or array */
	root: any;

	/* This tag */
	tag?: Tag;

	/* Ancestor tags */
	parentTags?: Hash<Tag>;

	/* tagCtx object */
	tagCtx?: any;

	[prop: string]: any;
}

interface TagCtxParams {
	/* tagCtx.params object */
	args: string[];
	props: Hash<string>;
	ctx: Hash<string>;
}

interface TagCtx {
	/* tagCtx object */
	/* Arguments passed declaratively */
	args: any[];

	/* Properties passed declaratively */
	props: Hash<any>;

	/* Declarative tag params object */
	params: TagCtxParams;

	/* External tmpl, or else template for wrapped content. Otherwise, false */
	tmpl: Template;

	/* Template for wrapped content, or else external template. Otherwise, false */
	content: Template;

	/* Tag instance index (if siblings rendered against array data) */
	index: number;

	/* JsViews view containing this tag instance */
	view: View;

	/* View context for tag */
	ctx: Context;

	/* This tag instance */
	tag: Tag;

	/* Tag render method */
	render: TagRenderMethod;

	/* tagCtx.ctxPrm() method */
	ctxPrm(name: string, value?: any): any; // get/set in JsViews but get only in JsRender

	/* tagCtx.cvtArgs() method */
	cvtArgs(): any[]| void ;

/* tagCtx.bndArgs() method */
bndArgs(): any[] | void;
}

interface LinkCtx {
	/* linkCtx object, null in JsRender */
}

interface TagRenderMethod {
	/* tag render method */
	(...arguments: any[]): string;
}

interface View {
	/* Template rendered by view */
	tmpl: Template;

	/* Block content template (for block tags) */
	content?: Template;

	/* Child views */
	views: View[] & Hash<View>;

	/* Parent view */
	parent: View;

	/* View context (helpers and parameters from parent views) */
	ctx: Context;

	/* View type */
	type: string;

	/* view.get() method: find parent or child views */
	get(type?: string): View;
	get(inner: boolean, type?: string): View;

	/* view.getIndex() method: get index of parent "item" view */
	getIndex(): number;

	/* view.ctxPrm() method: get/set contextual parameter or helper */
	ctxPrm(name: string, value?: any): any; // get/set in JsViews but get only in JsRender

	/* Find contextual template resource */
	getRsc(namedCollection: string, itemName: string): any;

	/* Index of this view in parent views collection */
	index: number;

	/* tag (for tag views) */
	tag: Tag;

	/* contextual data */
	data: any;

	/* root View (top-level) */
	root: View;

	scope: View;
}

} // end namespace

// ********************************** JsObservable **********************************

interface JQueryStatic {
	/* $.observable() */
	observable: JsViews.Observable;

	/* $.observe() */
	observe: JsViews.Observe;

	/* $.unobserve() */
	unobserve: JsViews.Unobserve;
}

declare namespace JsViews {

interface Observable {
	/* $.observable(array) */
	(data: any[]): ArrayObservable;
	(ns: string, data: any[]): ArrayObservable;

	/* $.observable(object) */
	(data: any): ObjectObservable;
	(ns: string, data: any): ObjectObservable;
}

interface Observe {
	/* $.observe(...) */
	(object: any[], handler: ChangeHandler<ArrayEvtArgs>): any;
	(object: object, path: string, handler: ChangeHandler<EvtArgs>): any;
	(object: object, path: string, path2: string, handler: ChangeHandler<EvtArgs>): any;
	(object: object, path: string, path2: string, path3: string, handler: ChangeHandler<EvtArgs>): any;
	(object: object, path: string, path2: string, path3: string, path4: string, handler: ChangeHandler<EvtArgs>): any;
	(object: object, ...restOf: any[]): any;

	(ns: string, object: any[], handler: ChangeHandler<ArrayEvtArgs>): any;
	(ns: string, object: object, path: string, handler: ChangeHandler<EvtArgs>): any;
	(ns: string, object: object, ...restOf: any[]): any;
}

interface Unobserve {
	/* $.unobserve(...) */
	(object: any[], handler?: ChangeHandler<ArrayEvtArgs>): any;
	(object: object, path?: string, handler?: ChangeHandler<EvtArgs>): any;
	(object: object, handler: ChangeHandler<EvtArgs>): any;
	(object: object, ...restOf: any[]): any;
	(handler?: ChangeHandler<EvtArgs>): any;

	(ns: string, object: any[], handler?: ChangeHandler<ArrayEvtArgs>): any;
	(ns: string, object: object, path?: string, handler?: ChangeHandler<EvtArgs>): any;
	(ns: string, object: object, handler: ChangeHandler<EvtArgs>): any;
	(ns: string, object: object, ...restOf: any[]): any;
	(ns: string, handler?: ChangeHandler<EvtArgs>): any;
}

interface ObjectObservable {
	/* Observable object, returned by $.observable(object) */
	setProperty(path: string, value: any): ObjectObservable;
	setProperty(values: Hash<any>): ObjectObservable;
	observeAll(handler: ChangeHandler<EvtArgs>, filter?: FilterHandler): void;
	unobserveAll(handler?: ChangeHandler<EvtArgs>, filter?: FilterHandler): void;
	removeProperty(path: string): ObjectObservable;
}

interface ArrayObservable {
	/* Observable array, returned by $.observable(array) */
	insert(index: number, data: any): ArrayObservable;
	insert(data: any): ArrayObservable;
	refresh(newItems: any[]): ArrayObservable;
	remove(index?: number, numToRemove?: number): ArrayObservable;
	move(oldIndex: number, newIndex: number, numToRemove?: number): ArrayObservable;
	observeAll(handler: ChangeHandler<EvtArgs>, filter?: FilterHandler): void;
	unobserveAll(handler?: ChangeHandler<EvtArgs>, filter?: FilterHandler): void;
}

interface FilterHandler {
	/* Filter function (callback handler) passed to observeAll(...) */
	(path: string, ob: any, parentObs: Array<{ [prop: string]: any }>): void;
}

interface ChangeHandler<T> {
	/* Change handler function passed to $.observe() or $.observable.observeAll() */
	(ev: EventObject, eventArgs: T): void;
}

interface EventObject {
	/* jQuery event object, ev, passed to observable change handler */
	target: any;
	data: EventMetaData;
	type: string;
	[propName: string]: any;
}

interface PropEvtArgs {
	/* JsViews event object, eventArgs, passed to observable change handler for property change */
	change: string;
	path?: string;
	value?: any;
	oldValue?: any;
	remove?: boolean;
}
interface ArrayEvtArgs {
	/* JsViews event object, eventArgs, passed to observable change handler for array change */
	change: string;
	index?: number;
	oldIndex?: number;
	items?: any[];
	numToRemove?: number;
	oldItems?: any[];
	refresh?: boolean;
}

interface EvtArgs extends PropEvtArgs, ArrayEvtArgs {
	/* JsViews event object, eventArgs, passed to observable change handler for either object or array change */
}

interface EventMetaData {
	/* JsViews metadata on jQuery event object, ev.data, passed to change handler for $.observe() */
	ns: string;
	fullPath: string;
	prop: string;
	paths: string[];
	observeAll?: ObserveAllMeta;
	[propName: string]: any;
}

interface ObserveAllMeta {
	/* JsViews metadata on jQuery event object, ev.data, passed to change handler  for $.observable().observeAll() */
	path: () => string;
	parents: () => any[];
	[propName: string]: any;
}

} // end namespace

// ********************************** JsViews **********************************

interface JQueryStatic {
	/* var view = $.view(elemOrSelector); // Get view object from DOM node */
	view: JsViews.GetView;

	/* $.link(template, container, data) // Render and link contents */
	link: JsViews.Link;

	/* $.unlink(container) // Unlink contents */
	unlink(container?: any): void;
}

interface JQuery {
	/* var view = $(elemOrSelector).view(); // Get view object from DOM node */
	/* $(elemOrSelector).view("array"); // Get parent view object of chosen type, from DOM node */
	view(type?: string): JsViews.View;

	/* $(elemOrSelector).view(true, "array"); // Get inner view object of chosen type, from DOM node */
	view(inner: boolean, type?: string): JsViews.View;

	/* $(elemOrSelector).link(template, data ...) // Render and link contents - Undocumented */
	link(tmpl: JsViews.Template, data?: any, helpersOrContext?: JsViews.Hash<any>, noIteration?: boolean): JQuery;
	link(tmpl: JsViews.Template, data: any, noIteration: boolean): JQuery; // Undocumented

	/* $(elemOrSelector).link(true, data ...) // Render and link contents */
	/* $(elemOrSelector).link(true, data ...) // Render and link contents */
	link(expression: boolean|string, data?: any, helpersOrContext?: JsViews.Hash<any>): JQuery;

	/* $(elemOrSelector).unlink() // Unlink contents */
	unlink(): void;
}

declare namespace JsViews {

/* $.views.settings*/
interface Settings {
	/**
	 * Set trigger mode
	 * $.views.settings.trigger(true)
	 *
	 * @param {boolean}  trigger
	 * @returns {Settings}
	 */
	trigger(trigger: boolean): Settings;

	/**
	 * Get trigger setting
	 * trigger = $.views.settings.trigger()
	 *
	 * @returns {boolean}
	 */
	trigger(): boolean;
}

interface dependsFunction {
	/* tag depends option, handler function */
	(data: any, callback: ChangeHandler<EvtArgs>): string | any[] | void;
}

interface TagOptions {
	/* Tag options hash */
	dataBoundOnly?: boolean;
	boundProps?: string[];
	depends?: string | any[] | dependsFunction;
	mapProps?: string[];
	mapDepends?: string | any[] | dependsFunction;
	setSize?: boolean;

	height?: string | number;
	width?: string | number;
	className?: string;

	linkedElement?: string | string[];
	linkedCtxParam?: string | string[];
	mainElement?: string;
	displayElement?: string;
	trigger?: boolean | string;
	attr?: string;

	dataMap?: any;
	lateRender?: boolean;

	onBind?: (this: TagInst, tagCtx: TagCtx, linkCtx: LinkCtx, ctx: Context, ev: EventObject, eventArgs: EvtArgs) => void ;
  onAfterLink?: (this: TagInst, tagCtx: TagCtx, linkCtx: LinkCtx, ctx: Context, ev: EventObject, eventArgs: EvtArgs) => void ;
  onUpdate?: boolean | ((this: TagInst, ev: EventObject, eventArgs: EvtArgs, tagCtxs: TagCtx[]) => any);

  onDispose?: (this: TagInst) => void ;

  convertBack?: string | Converter;
  onUnbind?: (this: TagInst, tagCtx: TagCtx, linkCtx: LinkCtx, ctx: Context, ev: EventObject, eventArgs: EvtArgs) => void ;
  onBeforeUpdateVal?: (this: TagInst, ev: EventObject, eventArgs: EvtArgs) => boolean | void ;
  onBeforeChange?: (this: TagInst, ev: EventObject, eventArgs: EvtArgs) => boolean | void ;
  onAfterChange?: (this: TagInst, ev: EventObject, eventArgs: EvtArgs) => void ;
  onArrayChange?: (this: TagInst, ev: EventObject, eventArgs: EvtArgs) => void ;
  setValue?: (this: TagInst, value: any, index?: number, elseBlock?: number, ev?: EventObject, eventArgs?: EvtArgs) => void ;
  domChange?: (this: TagInst, ...args: any[]) => void;
}

interface Tag {
	/* Tag object */
	init?: (this: Tag, tagCtx?: TagCtx, linkCtx?: LinkCtx, ctx?: Context) => void ;
  linkCtx?: LinkCtx;
parentElem: HTMLElement;
linkedElems: JQuery[];
linkedElem: JQuery;
mainElem: JQuery;
displayElem: JQuery;
inline: boolean;

refresh(): Tag;
nodes(): any[];
contents(deep?: boolean, selectorOrNode?: string | Node | JQuery): JQuery;
contents(selectorOrNode?: string | Node | JQuery): JQuery;
childTags(deep?: boolean, tagName?: string): Tag[];
childTags(tagName?: string): Tag[];
setValue(newValue: any, index?: number, elseBlock?: number): Tag;
setValues(...args: any[]): Tag;
updateValue(newValue: any, index?: number, elseBlock?: number): Tag;
updateValues(...args: any[]): Tag;
}

interface TagCtx {
	/* tagCtx object */

	linkedElems: JQuery[];
	mainElem: JQuery;
	displayElem: JQuery;
	contentView: View;
	nodes(): any[];
	contents(deep?: boolean, selectorOrNode?: string|Node|JQuery): JQuery;
	contents(selectorOrNode?: string|Node|JQuery): JQuery;
	childTags(deep?: boolean, tagName?: string): Tag[];
	childTags(tagName?: string): Tag[];
	setValues(...args: any[]): void;
}

interface LinkCtx {
	/* linkCtx object */

	/* Current data item */
	data: any;

	/* Data-linked element */
	elem: HTMLElement;

	/* Current view (containing this data-linked element) */
	view: View;

	/* Target attribute or property on HTML element */
	attr: string;

	/* Data-link expression */
	expr?: string;

	/* Tag instance (for data-link tag expressions) */
	tag?: Tag;

	/* Tag instance (for data-link tag expressions) */
	ctx: Context;

	/* "inline" "link" "top" "expr" */
	type: string;
}

interface View {
	/* view object */
	addViews(index: number, dataItems: any[], tmpl?: Template): View;
	removeViews(index?: number, itemsCount?: number, keepNodes?: boolean): View;
	refresh(): View;
	nodes(): any[];
	contents(deep?: boolean, selectorOrNode?: string|Node|JQuery): JQuery;
	contents(selectorOrNode?: string|Node|JQuery): JQuery;
	childTags(deep?: boolean, tagName?: string): Tag[];
	childTags(tagName?: string): Tag[];
	// link(data: any, parentNode: any, prevNode: any, nextNode: any, html: string, refresh?: boolean): any[]; // Undocumented...
}

interface GetView {
	// $.view() returns top view
	// $.view(node) returns view that contains node
	// $.view(selector) returns view that contains first selected element
	// $.view(nodeOrSelector, type) returns nearest containing view of given type
	// $.view(nodeOrSelector, "root") returns root containing view (child of top view)
	// $.view(nodeOrSelector, true, type) returns nearest inner (contained) view of given type

	(selectorOrNode?: string|Node|JQuery, type?: string): View;
	(selectorOrNode: string|Node|JQuery, inner: boolean, type?: string): View;
}

interface Link {
	/* $.link(template, container, data ...) // Render and link contents - Undocumented */
	(tmpl: Template, container: string|Node|JQuery, data?: any, helpersOrContext?: Hash<any>, noIteration?: boolean): JQuery;
	(tmpl: Template, container: string|Node|JQuery, data: any, noIteration: boolean): JQuery;

	/* $.link(true, container, data) // Link existing contents */
	/* $.link(expression, container, data) // Link existing contents */
	(expression: boolean|string, container: string|Node|JQuery, data?: any, helpersOrContext?: Hash<any>): JQuery;

	/* $.link.templateName("#container", data); // Link named template */
	[tmplName: string]: TemplateLink;
}

interface TemplateLink {
	/* $.link.templateName("#container", data); // Link named template */
	(container: string|Node|JQuery, data?: any, helpersOrContext?: Hash<any>, noIteration?: boolean): JQuery;
	(container: string|Node|JQuery, data: any, noIteration: boolean): JQuery;
}

interface Template {
	/* template.link(container, data); // Render and link contents */
	link: TemplateLink;
}

interface GetSet {
	/* Interface for casting a function to a JsViews get/set computed function, as in:
	 *
	 * var fullName = function() { ... } as JsViews.GetSet;
	 * fullName.depends = ...;
	 * fullName.set = ...;
	 */
	(...args: any[]): any;
	set: any;
	depends: any;
}

} // end namespace
