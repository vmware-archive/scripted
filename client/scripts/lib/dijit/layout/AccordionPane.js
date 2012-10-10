define("dijit/layout/AccordionPane", ["dojo", "dijit", "dijit/layout/ContentPane"], function(dojo, dijit) {

dojo.declare("dijit.layout.AccordionPane", dijit.layout.ContentPane, {
	// summary:
	//		Deprecated widget.   Use `dijit.layout.ContentPane` instead.
	// tags:
	//		deprecated

	constructor: function(){
		dojo.deprecated("dijit.layout.AccordionPane deprecated, use ContentPane instead", "", "2.0");
	},

	onSelected: function(){
		// summary:
		//		called when this pane is selected
	}
});


return dijit.layout.AccordionPane;
});
