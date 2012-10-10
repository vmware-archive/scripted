define("dijit/_editor/plugins/ToggleDir", ["dojo", "dijit", "dijit/_editor/_Plugin", "dijit/form/ToggleButton"], function(dojo, dijit) {

dojo.experimental("dijit._editor.plugins.ToggleDir");

dojo.require("dijit._editor._Plugin");
dojo.require("dijit.form.ToggleButton");

dojo.declare("dijit._editor.plugins.ToggleDir",
	dijit._editor._Plugin,
	{
		// summary:
		//		This plugin is used to toggle direction of the edited document,
		//		independent of what direction the whole page is.

		// Override _Plugin.useDefaultCommand: processing is done in this plugin
		// rather than by sending commands to the Editor
		useDefaultCommand: false,

		command: "toggleDir",

		// Override _Plugin.buttonClass to use a ToggleButton for this plugin rather than a vanilla Button
		buttonClass: dijit.form.ToggleButton,

		_initButton: function(){
			// Override _Plugin._initButton() to setup handler for button click events.
			this.inherited(arguments);
			this.editor.onLoadDeferred.addCallback(dojo.hitch(this, function(){
				var editDoc = this.editor.editorObject.contentWindow.document.documentElement;
				//IE direction has to toggle on the body, not document itself.
				//If you toggle just the document, things get very strange in the
				//view.  But, the nice thing is this works for all supported browsers.
				editDoc = editDoc.getElementsByTagName("body")[0];
				var isLtr = dojo.getComputedStyle(editDoc).direction == "ltr";
				this.button.set("checked", !isLtr);
				this.connect(this.button, "onChange", "_setRtl");
			}));
		},

		updateState: function(){
			// summary:
			//		Over-ride for button state control for disabled to work.
			this.button.set("disabled", this.get("disabled"));
		},

		_setRtl: function(rtl){
			// summary:
			//		Handler for button click events, to switch the text direction of the editor
			var dir = "ltr";
			if(rtl){
				dir = "rtl";
			}
			var editDoc = this.editor.editorObject.contentWindow.document.documentElement;
			editDoc = editDoc.getElementsByTagName("body")[0];
			editDoc.dir/*html node*/ = dir;
		}
	}
);

// Register this plugin.
dojo.subscribe(dijit._scopeName + ".Editor.getPlugin",null,function(o){
	if(o.plugin){ return; }
	switch(o.args.name){
	case "toggleDir":
		o.plugin = new dijit._editor.plugins.ToggleDir({command: o.args.name});
	}
});


return dijit._editor.plugins.ToggleDir;
});
