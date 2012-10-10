define("dijit/MenuSeparator", ["dojo", "dijit", "text!dijit/templates/MenuSeparator.html", "dijit/_Widget", "dijit/_Templated", "dijit/_Contained"], function(dojo, dijit) {

dojo.declare("dijit.MenuSeparator",
		[dijit._Widget, dijit._Templated, dijit._Contained],
		{
		// summary:
		//		A line between two menu items

		templateString: dojo.cache("dijit", "templates/MenuSeparator.html"),

		buildRendering: function(){
			this.inherited(arguments);
			dojo.setSelectable(this.domNode, false);
		},

		isFocusable: function(){
			// summary:
			//		Override to always return false
			// tags:
			//		protected

			return false; // Boolean
		}
	});


return dijit.MenuSeparator;
});
