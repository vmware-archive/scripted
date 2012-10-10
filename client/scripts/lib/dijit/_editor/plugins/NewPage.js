define("dijit/_editor/plugins/NewPage", ["dojo", "dijit", "dijit/_editor/_Plugin", "dijit/form/Button", "dojo/i18n", "i18n!dijit/_editor/nls/commands"], function(dojo, dijit) {

dojo.declare("dijit._editor.plugins.NewPage",dijit._editor._Plugin,{
	// summary:
	//		This plugin provides a simple 'new page' calability.  In other
	//		words, set content to some default user defined string.

	// content: [public] String
	//		The default content to insert into the editor as the new page.
	//		The default is the <br> tag, a single blank line.
	content: "<br>",

	_initButton: function(){
		// summary:
		//		Over-ride for creation of the Print button.
		var strings = dojo.i18n.getLocalization("dijit._editor", "commands"),
			editor = this.editor;
		this.button = new dijit.form.Button({
			label: strings["newPage"],
			dir: editor.dir,
			lang: editor.lang,
			showLabel: false,
			iconClass: this.iconClassPrefix + " " + this.iconClassPrefix + "NewPage",
			tabIndex: "-1",
			onClick: dojo.hitch(this, "_newPage")
		});
	},

	setEditor: function(/*dijit.Editor*/ editor){
		// summary:
		//		Tell the plugin which Editor it is associated with.
		// editor: Object
		//		The editor object to attach the newPage capability to.
		this.editor = editor;
		this._initButton();
	},

	updateState: function(){
		// summary:
		//		Over-ride for button state control for disabled to work.
		this.button.set("disabled", this.get("disabled"));
	},

	_newPage: function(){
		// summary:
		//		Function to set the content to blank.
		// tags:
		//		private
		this.editor.beginEditing();
		this.editor.set("value", this.content);
		this.editor.endEditing();
		this.editor.focus();
	}
});

// Register this plugin.
dojo.subscribe(dijit._scopeName + ".Editor.getPlugin",null,function(o){
	if(o.plugin){ return; }
	var name = o.args.name.toLowerCase();
	if(name === "newpage"){
		o.plugin = new dijit._editor.plugins.NewPage({
			content: ("content" in o.args)?o.args.content:"<br>"
		});
	}
});


return dijit._editor.plugins.NewPage;
});
