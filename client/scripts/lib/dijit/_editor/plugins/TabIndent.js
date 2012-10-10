define("dijit/_editor/plugins/TabIndent", ["dojo", "dijit", "dijit/_editor/_Plugin", "dijit/form/ToggleButton"], function(dojo, dijit) {

dojo.experimental("dijit._editor.plugins.TabIndent");


dojo.declare("dijit._editor.plugins.TabIndent",
	dijit._editor._Plugin,
	{
		// summary:
		//		This plugin is used to allow the use of the tab and shift-tab keys
		//		to indent/outdent list items.  This overrides the default behavior
		//		of moving focus from/to the toolbar

		// Override _Plugin.useDefaultCommand... processing is handled by this plugin, not by dijit.Editor.
		useDefaultCommand: false,

		// Override _Plugin.buttonClass to use a ToggleButton for this plugin rather than a vanilla Button
		buttonClass: dijit.form.ToggleButton,

		command: "tabIndent",

		_initButton: function(){
			// Override _Plugin._initButton() to setup listener on button click
			this.inherited(arguments);

			var e = this.editor;
			this.connect(this.button, "onChange", function(val){
				e.set("isTabIndent", val);
			});

			// Set initial checked state of button based on Editor.isTabIndent
			this.updateState();
		},

		updateState: function(){
			// Overrides _Plugin.updateState().
			// Ctrl-m in the editor will switch tabIndent mode on/off, so we need to react to that.
			var disabled = this.get("disabled");
			this.button.set("disabled", disabled);
			if(disabled){
				return;
			}
			this.button.set('checked', this.editor.isTabIndent, false);
		}
	}
);

// Register this plugin.
dojo.subscribe(dijit._scopeName + ".Editor.getPlugin",null,function(o){
	if(o.plugin){ return; }
	switch(o.args.name){
	case "tabIndent":
		o.plugin = new dijit._editor.plugins.TabIndent({command: o.args.name});
	}
});


return dijit._editor.plugins.TabIndent;
});
