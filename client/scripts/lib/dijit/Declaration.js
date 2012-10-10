define("dijit/Declaration", ["dojo", "dijit", "dijit/_Widget", "dijit/_Templated"], function(dojo, dijit) {

dojo.declare(
	"dijit.Declaration",
	dijit._Widget,
	{
		// summary:
		//		The Declaration widget allows a developer to declare new widget
		//		classes directly from a snippet of markup.

		// _noScript: [private] Boolean
		//		Flag to parser to leave alone the script tags contained inside of me
		_noScript: true,

		// stopParser: [private] Boolean
		//		Flag to parser to not try and parse widgets declared inside of me
		stopParser: true,

		// widgetClass: [const] String
		//		Name of class being declared, ex: "acme.myWidget"
		widgetClass: "",

		// propList: [const] Object
		//		Set of attributes for this widget along with default values, ex:
		//		{delay: 100, title: "hello world"}
		defaults: null,

		// mixins: [const] String[]
		//		List containing the prototype for this widget, and also any mixins,
		//		ex: ["dijit._Widget", "dijit._Container"]
		mixins: [],

		buildRendering: function(){
			var src = this.srcNodeRef.parentNode.removeChild(this.srcNodeRef),
				methods = dojo.query("> script[type^='dojo/method']", src).orphan(),
				connects = dojo.query("> script[type^='dojo/connect']", src).orphan(),
				srcType = src.nodeName;

			var propList = this.defaults || {};

			// For all methods defined like <script type="dojo/method" data-dojo-event="foo">,
			// add that method to prototype.
			// If there's no "event" specified then it's code to run on instantiation,
			// so it becomes a connection to "postscript" (handled below).
			dojo.forEach(methods, function(s){
				var evt = s.getAttribute("event") || s.getAttribute("data-dojo-event"),
					func = dojo.parser._functionFromScript(s);
				if(evt){
					propList[evt] = func;
				}else{
					connects.push(s);
				}
			});

			// map array of strings like [ "dijit.form.Button" ] to array of mixin objects
			// (note that dojo.map(this.mixins, dojo.getObject) doesn't work because it passes
			// a bogus third argument to getObject(), confusing it)
			this.mixins = this.mixins.length ?
				dojo.map(this.mixins, function(name){ return dojo.getObject(name); } ) :
				[ dijit._Widget, dijit._Templated ];

			propList.widgetsInTemplate = true;
			propList._skipNodeCache = true;
			propList.templateString = "<"+srcType+" class='"+src.className+"' dojoAttachPoint='"+(src.getAttribute("dojoAttachPoint") || '')+"' dojoAttachEvent='"+(src.getAttribute("dojoAttachEvent") || '')+"' >"+src.innerHTML.replace(/\%7B/g,"{").replace(/\%7D/g,"}")+"</"+srcType+">";

			// strip things so we don't create stuff under us in the initial setup phase
			dojo.query("[dojoType]", src).forEach(function(node){
				node.removeAttribute("dojoType");
			});

			// create the new widget class
			var wc = dojo.declare(
				this.widgetClass,
				this.mixins,
				propList
			);

			// Handle <script> blocks of form:
			//		<script type="dojo/connect" data-dojo-event="foo">
			// and
			//		<script type="dojo/method">
			// (Note that the second one is just shorthand for a dojo/connect to postscript)
			// Since this is a connect in the declaration, we are actually connection to the method
			// in the _prototype_.
			dojo.forEach(connects, function(s){
				var evt = s.getAttribute("event") || s.getAttribute("data-dojo-event") || "postscript",
					func = dojo.parser._functionFromScript(s);
				dojo.connect(wc.prototype, evt, func);
			});
		}
	}
);


return dijit.Declaration;
});
