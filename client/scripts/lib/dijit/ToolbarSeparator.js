define("dijit/ToolbarSeparator", ["dojo", "dijit", "dijit/_Widget", "dijit/_Templated"], function(dojo, dijit) {

dojo.declare("dijit.ToolbarSeparator",
		[ dijit._Widget, dijit._Templated ],
		{
		// summary:
		//		A spacer between two `dijit.Toolbar` items
		templateString: '<div class="dijitToolbarSeparator dijitInline" role="presentation"></div>',
		buildRendering: function(){
			this.inherited(arguments);
			dojo.setSelectable(this.domNode, false);
		},
		isFocusable: function(){
			// summary:
			//		This widget isn't focusable, so pass along that fact.
			// tags:
			//		protected
			return false;
		}

	});


return dijit.ToolbarSeparator;
});
