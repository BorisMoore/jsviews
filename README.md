## JsViews: next-generation MVVM and MVP framework - bringing templates to life

*The power of MVVM, the flexibility of JavaScript, the speed and ease of JsRender templates and jQuery*<br/>

**JsViews** builds on top of **[JsRender](http://www.jsviews.com/#jsrender)** templates, and adds data-binding and **[observable data](http://www.jsviews.com/#jsobservable)**, to provide a fully-fledged MVVM platform for easily creating interactive data-driven single-page apps and websites.

### Documentation and downloads

**[Documentation](http://www.jsviews.com/#jsviews)**, **[downloads](http://www.jsviews.com/#download)**, **[samples](http://www.jsviews.com/#samples)** and **[API docs and tutorials](http://www.jsviews.com/#jsvapi)** are available on the **[www.jsviews.com website](http://www.jsviews.com/#jsviews)**.

The content of this **_ReadMe_** is available also as a *[JsViews Quickstart](http://www.jsviews.com/#jsv-quickstart)*.

## JsViews installation

jsviews.js is available from [downloads](http://www.jsviews.com/#download) on the jsviews.com site.

CDN delivery is available from the **_[cdnjs](https://cdnjs.com)_** CDN at [cdnjs.com/libraries/jsviews](https://cdnjs.com/libraries/jsviews).

Alternatively:

- It can be installed with **_[Bower](http://bower.io/search/?q=jsviews)_**, using `$ bower install jsviews` 
- It can be loaded using an *AMD script loader*, such as RequireJS
- For installation using *Node.js* (*npm*), and loading using [Browserify](http://browserify.org/) or [webpack](https://webpack.github.io/), see *[JsViews as a Browserify module](http://www.jsviews.com/#node/browserify@jsviews)* and *[JsViews as a webpack module](http://www.jsviews.com/#node/webpack@jsviews)*

(Note that *jsviews.js* includes all of *jsrender.js* code -- so *jsrender.js* does not need to be loaded first.)

### JsRender and JsViews

*JsRender* is used for data-driven rendering of templates to strings, ready for insertion in the DOM. (See *[JsRender Quickstart](http://www.jsviews.com/#jsr-quickstart)* and [JsRender GitHub repository](https://github.com/BorisMoore/jsrender)). 

*JsViews* incorporates *JsRender* templates, together with data-binding, *[observable data](http://www.jsviews.com/#jsoapi)* and MVVM support. It provides a powerful platform for building dynamic interactive websites and single-page apps. 

(Note: *JsRender* and *JsViews* together provide the next-generation implementation of the official jQuery plugins *[JQuery Templates](https://github.com/BorisMoore/jquery-tmpl)*, and *[JQuery Data Link](https://github.com/BorisMoore/jquery-datalink)* -- and supersede those libraries.)

## JsViews usage

### _Data-linked templates_

JsViews provides *data-linking* - so that JsRender templates become data-bound:

- *Data-linked* tags or elements in your templates will update automatically whenever the underlying data changes.
- Some data-linked tags or elements provide *two-way* data-linking, so that user interactions will trigger *"observable"* changes to the underlying data (which may then trigger other updates elsewhere in your templated UI).

**Data-linked template tags:**

Any JsRender tag, `{{...}}` can be *data-linked* by writing `{^{...}}`, as in:

```html
<ul>
  {^{for people}} <!--List will update when people array changes-->
    <li>{^{:name}}</li> <!--Will update when name property changes-->
  {{/for}}
</ul>
```

[Learn more...](http://www.jsviews.com/#linked-tag-syntax)

**Data-linked HTML elements:**

HTML elements within templates can be *data-linked* by adding a `data-link` attribute:

```html
<input data-link="name"/> <!--Two-way data-binding to the name property-->
<span data-link="name"></span> <!--Will update when name property changes-->
```

HTML elements within 'top-level' page content can also be data-linked -- see [below](#jsv-quickstart@toplink).

[Learn more...](http://www.jsviews.com/#linked-elem-syntax)

## _Render and link a template_

With *JsRender*, you call the `render()` method, then insert the resulting HTML in the DOM.

```js
var html = tmpl.render(data, helpersOrContext);
$("#container").html(html);
```

With *JsViews*, you can instead call the `link()` method:

```js
tmpl.link("#container", data, helpersOrContext);
```

which in one line of code will:
- render the template
- insert the resulting HTML as content under the HTML `container` element
- data-link that content to the underlying `data`

Now *observable* changes in the data will automatically trigger updates in the rendered UI.

There are two ways of calling the `link()` method:
- If you have a reference to the <em>template object</em>, call [`template.link(...)`](http://www.jsviews.com/#jsvtmpllink)
- If you have registered the template by name (`"myTmpl"`), call [`link.myTmpl(...)`](http://www.jsviews.com/#jsv.d.link)

**Example**: - Template from string

```js
var tmpl = $.templates("{^{:name}} <input data-link='name' />");
var person = {name: "Jim"};
tmpl.link("#container", person);
```

**Example**: - Template from script block

```html
<script id="myTemplate" type="text/x-jsrender">
{^{:name}} <input data-link="name" />
</script>
```

```js
var tmpl = $.templates("#myTemplate");
var person= {name: "Jim"};
tmpl.link("#container", person);
```

**Example**: - Named template from string

```js
$.templates("myTmpl1", "{^{:name}} <input data-link='name' />");
var person= {name: "Jim"};
$.link.myTmpl1("#container", person);
```

**Example**: - Named template from script block

```html
<script id="myTemplate" type="text/x-jsrender">
{^{:name}} <input data-link="name" />
</script>
```

```js
$.templates("myTmpl2", "#myTemplate");
var data = {name: "Jim"};
$.link.myTmpl2("#container", data);
```

**Result:** After each `link()` example above the `container` element will have the following content:
 
```html
Jim <input value="Jim" />
```

with the `name` property of `person` object data-linked to the `"Jim"` text node and *two-way* data-linked to the `<input />`

See: *[Playing with JsViews](http://www.jsviews.com/#jsvplaying)* for working samples, such as [this one](http://www.jsviews.com/#jsvplaying@twoway)

[Learn more...](http://www.jsviews.com/#jsvlinktmpl)

<h3 id="jsv-quickstart@toplink"><i>Top-level data-linking</i></h3>

You can use data-linking not only for templated content, but also to data-bind to top-level HTML content in your page: 

```js
$.link(true, "#target", data);
```

This will activate any declarative data-binding (`data-link="..."` expressions) on the target element - or on elements within its content.

[Learn more...](http://www.jsviews.com/#toplink)

### _Making "observable" changes to objects and arrays_

In current JavaScript implementations, modifying objects or arrays does not raise any event, so there is no way for the change to be detected elsewhere. JsViews dynamic data-bound UI solves this through <em>data-linking</em>, using the <em>JsObservable observer pattern</em>.

The JsViews `$.observable()` API provides a way for you to change objects or arrays <em>observably</em>. Each change will raise a <a href="http://www.jsviews.com/#onpropchange">property change</a> or <a href="http://www.jsviews.com/#onarrchange">array change</a> event. 

**Modify an object observably**

```js
$.observable(person).setProperty("name", newName);
```

`$.observable(person)` makes the `person` object *"observable"*, by providing a `setProperty(...)` method. Use `setProperty` to change a value, and the change will be *"observed"* by the declarative data-binding in the template.

**Modify an array observably**

```js
$.observable(people).insert(newPerson);
```

`$.observable(people)` makes the `people` array *"observable"*, by providing methods like `insert(...)` and `remove(...)`. Use them to make changes to arrays, and the changes will be *"observed"* by data-bound elements and tags in the template - such as the `{^{for dataArray}}` tag.

[Learn more...](http://www.jsviews.com/#$observable)

### _Responding to data changes_

JsViews uses the *<a href="http://www.jsviews.com/#onpropchange">property change</a>* or *<a href="http://www.jsviews.com/#onarrchange">array change</a>* events to make any <a href="http://www.jsviews.com/#linked-template-syntax">data-linked tags or elements</a> in your templates update automatically in response to each *observable* change in your underlying data. In addition, with two-way data-linking, it ensures that those events are raised when the user interacts with a data-linked template, and causes changes to the underlying data.

**observe() and observeAll()**

The [`$.observe()`](http://www.jsviews.com/#observe) and [`$.observable().observeAll()`](http://www.jsviews.com/#observeAll) APIs make it very easy for you to register event handlers or listeners, so your code can listen to specific observable changes made to your data objects or view models:

```js
$.observe(person, "name", function(...) {
  // The "name" property of person has changed
  ...
});
```

```js
$.observable(person).observeAll(function(...) {
  // A property of person, or a nested object property, has changed
  ...
});
```

[Learn more...](http://www.jsviews.com/#observeobjectsarrays)

### _Accessing the view hierarchy_

Each instance of a rendered template or a template block tag is associated with a JsViews *"view"* object -- so nested tags lead to a hierarchy of view objects. The [view hierarchy](http://www.jsviews.com/#views) shows how the underlying data objects map to the rendered UI.

**From UI back to data:**

Use [`$.view(elem)`](http://www.jsviews.com/#jsv.d.view) to get from a DOM element to the corresponding `view` object for that part of the rendered content. From the `view` you can then get to the underlying `data`, the `index`, etc.

*[Example](http://www.jsviews.com/#jsv.d.view@$view):*

```html
{^{for people}}
  ...
  <button class="changeBtn">Change</button>
  ...
{{/for}}
```

Click-handler code for <em>Change</em> button:

```js
$(".changeBtn").on("click", function() {
  // From the clicked HTML element ('this'), get the view object
  var view = $.view(this);

  // Get the 'person' data object for clicked button
  var person = view.data;

  // Get index of this 'item view'. (Equals index of person in people array)
  var index = view.index;

  // Change the person.name
  $.observable(person).setProperty("name", person.name + " " + index);
});
```

[Learn more...](http://www.jsviews.com/#$view)

### _Data-linked paths_

JsViews data-linked templates (and the `$.observe()` API) use the same [paths and expressions](http://www.jsviews.com/#paths) as JsRender templates, but in addition provide *'leaf'* data-binding -- such as:

```html
{^{:team.manager.name`}}                    <!--updates when name changes-->
<span data-link="team.manager.name"></span> <!--updates when name changes-->
<input data-link="team.manager.name" />     <!--two-way binding to name-->
```

But data-linked paths have additional support, such as linking deeper into paths:

```html
{^{:team^manager.name}}   <!--updates when name, manager, or team changes-->
```

[Learn more...](http://www.jsviews.com/#linked-paths)

### _Computed observables_

JsViews also allows you to data-bind to computed values, such as:

```html
{^{:shoppingCart.totalAmount()}}        <!--updates when totalAmount() changes-->
<input data-link="person.fullName()" /> <!--two-way binding, computed fullName()-->
```

[Learn more...](http://www.jsviews.com/#computed)

### _Documentation and APIs_

See the [www.jsviews.com](http://www.jsviews.com) site, including the *[JsViews Quickstart](http://www.jsviews.com/#jsv-quickstart)*, [JsViews APIs](http://www.jsviews.com/#jsvapi) and [JsObservable APIs](http://www.jsviews.com/#jsoapi) topics.

### _Demos_

Demos and samples can be found at [www.jsviews.com/#samples](http://www.jsviews.com/#samples), and throughout the [API documentation](http://www.jsviews.com/#jsvapi).

(See also the [demos](https://github.com/BorisMoore/jsviews/tree/master/demos) folder of the GitHub repository - available [here](http://borismoore.github.io/jsviews/demos/index.html) as live samples).
