define("dijit/InlineEditBox", ["dojo", "dijit", "text!dijit/templates/InlineEditBox.html", "dojo/i18n", "dijit/_Widget", "dijit/_Container", "dijit/form/Button", "dijit/form/TextBox", "i18n!dijit/nls/common"], function(dojo, dijit) {

dojo.declare("dijit.InlineEditBox",
	dijit._Widget,
	{
	// summary:
	//		An element with in-line edit capabilites
	//
	// description:
	//		Behavior for an existing node (`<p>`, `<div>`, `<span>`, etc.) so that
	// 		when you click it, an editor shows up in place of the original
	//		text.  Optionally, Save and Cancel button are displayed below the edit widget.
	//		When Save is clicked, the text is pulled from the edit
	//		widget and redisplayed and the edit widget is again hidden.
	//		By default a plain Textarea widget is used as the editor (or for
	//		inline values a TextBox), but you can specify an editor such as
	//		dijit.Editor (for editing HTML) or a Slider (for adjusting a number).
	//		An edit widget must support the following API to be used:
	//			- displayedValue or value as initialization parameter,
	//			and available through set('displayedValue') / set('value')
	//			- void focus()
	//			- DOM-node focusNode = node containing editable text

	// editing: [readonly] Boolean
	//		Is the node currently in edit mode?
	editing: false,

	// autoSave: Boolean
	//		Changing the value automatically saves it; don't have to push save button
	//		(and save button isn't even displayed)
	autoSave: true,

	// buttonSave: String
	//		Save button label
	buttonSave: "",

	// buttonCancel: String
	//		Cancel button label
	buttonCancel: "",

	// renderAsHtml: Boolean
	//		Set this to true if the specified Editor's value should be interpreted as HTML
	//		rather than plain text (ex: `dijit.Editor`)
	renderAsHtml: false,

	// editor: String|Function
	//		Class name (or reference to the Class) for Editor widget
	editor: "dijit.form.TextBox",

	// editorWrapper: String|Function
	//		Class name (or reference to the Class) for widget that wraps the editor widget, displaying save/cancel
	//		buttons.
	editorWrapper: "dijit._InlineEditor",

	// editorParams: Object
	//		Set of parameters for editor, like {required: true}
	editorParams: {},

	// disabled: Boolean
	//		If true, clicking the InlineEditBox to edit it will have no effect.
	disabled: false,

	onChange: function(value){
		// summary:
		//		Set this handler to be notified of changes to value.
		// tags:
		//		callback
	},

	onCancel: function(){
		// summary:
		//		Set this handler to be notified when editing is cancelled.
		// tags:
		//		callback
	},

	// width: String
	//		Width of editor.  By default it's width=100% (ie, block mode).
	width: "100%",

	// value: String
	//		The display value of the widget in read-only mode
	value: "",

	// noValueIndicator: [const] String
	//		The text that gets displayed when there is no value (so that the user has a place to click to edit)
	noValueIndicator: dojo.isIE <= 6 ?	// font-family needed on IE6 but it messes up IE8
		"<span style='font-family: wingdings; text-decoration: underline;'>&nbsp;&nbsp;&nbsp;&nbsp;&#x270d;&nbsp;&nbsp;&nbsp;&nbsp;</span>" :
		"<span style='text-decoration: underline;'>&nbsp;&nbsp;&nbsp;&nbsp;&#x270d;&nbsp;&nbsp;&nbsp;&nbsp;</span>",

	constructor: function(){
		// summary:
		//		Sets up private arrays etc.
		// tags:
		//		private
		this.editorParams = {};
	},

	postMixInProperties: function(){
		this.inherited(arguments);

		// save pointer to original source node, since Widget nulls-out srcNodeRef
		this.displayNode = this.srcNodeRef;

		// connect handlers to the display node
		var events = {
			ondijitclick: "_onClick",
			onmouseover: "_onMouseOver",
			onmouseout: "_onMouseOut",
			onfocus: "_onMouseOver",
			onblur: "_onMouseOut"
		};
		for(var name in events){
			this.connect(this.displayNode, name, events[name]);
		}
		dijit.setWaiRole(this.displayNode, "button");
		if(!this.displayNode.getAttribute("tabIndex")){
			this.displayNode.setAttribute("tabIndex", 0);
		}

		if(!this.value && !("value" in this.params)){ // "" is a good value if specified directly so check params){
		   this.value = dojo.trim(this.renderAsHtml ? this.displayNode.innerHTML :
		      (this.displayNode.innerText||this.displayNode.textContent||""));
		}
		if(!this.value){
		    this.displayNode.innerHTML = this.noValueIndicator;
		}

		dojo.addClass(this.displayNode, 'dijitInlineEditBoxDisplayMode');
	},

	setDisabled: function(/*Boolean*/ disabled){
		// summary:
		//		Deprecated.   Use set('disabled', ...) instead.
		// tags:
		//		deprecated
		dojo.deprecated("dijit.InlineEditBox.setDisabled() is deprecated.  Use set('disabled', bool) instead.", "", "2.0");
		this.set('disabled', disabled);
	},

	_setDisabledAttr: function(/*Boolean*/ disabled){
		// summary:
		//		Hook to make set("disabled", ...) work.
		//		Set disabled state of widget.
		dijit.setWaiState(this.domNode, "disabled", disabled);
		if(disabled){
			this.displayNode.removeAttribute("tabIndex");
		}else{
			this.displayNode.setAttribute("tabIndex", 0);
		}
		dojo.toggleClass(this.displayNode, "dijitInlineEditBoxDisplayModeDisabled", disabled);
		this._set("disabled", disabled);
	},

	_onMouseOver: function(){
		// summary:
		//		Handler for onmouseover and onfocus event.
		// tags:
		//		private
		if(!this.disabled){
			dojo.addClass(this.displayNode, "dijitInlineEditBoxDisplayModeHover");
		}
	},

	_onMouseOut: function(){
		// summary:
		//		Handler for onmouseout and onblur event.
		// tags:
		//		private
		dojo.removeClass(this.displayNode, "dijitInlineEditBoxDisplayModeHover");
	},

	_onClick: function(/*Event*/ e){
		// summary:
		//		Handler for onclick event.
		// tags:
		//		private
		if(this.disabled){ return; }
		if(e){ dojo.stopEvent(e); }
		this._onMouseOut();

		// Since FF gets upset if you move a node while in an event handler for that node...
		setTimeout(dojo.hitch(this, "edit"), 0);
	},

	edit: function(){
		// summary:
		//		Display the editor widget in place of the original (read only) markup.
		// tags:
		//		private

		if(this.disabled || this.editing){ return; }
		this.editing = true;

		// save some display node values that can be restored later
		this._savedPosition = dojo.style(this.displayNode, "position") || "static";
		this._savedOpacity = dojo.style(this.displayNode, "opacity") || "1";
		this._savedTabIndex = dojo.attr(this.displayNode, "tabIndex") || "0";

		if(this.wrapperWidget){
			var ew = this.wrapperWidget.editWidget;
			ew.set("displayedValue" in ew ? "displayedValue" : "value", this.value);
		}else{
			// Placeholder for edit widget
			// Put place holder (and eventually editWidget) before the display node so that it's positioned correctly
			// when Calendar dropdown appears, which happens automatically on focus.
			var placeholder = dojo.create("span", null, this.domNode, "before");

			// Create the editor wrapper (the thing that holds the editor widget and the save/cancel buttons)
			var ewc = typeof this.editorWrapper == "string" ? dojo.getObject(this.editorWrapper) : this.editorWrapper;
			this.wrapperWidget = new ewc({
				value: this.value,
				buttonSave: this.buttonSave,
				buttonCancel: this.buttonCancel,
				dir: this.dir,
				lang: this.lang,
				tabIndex: this._savedTabIndex,
				editor: this.editor,
				inlineEditBox: this,
				sourceStyle: dojo.getComputedStyle(this.displayNode),
				save: dojo.hitch(this, "save"),
				cancel: dojo.hitch(this, "cancel")
			}, placeholder);
			if(!this._started){
				this.startup();
			}
		}
		var ww = this.wrapperWidget;

		if(dojo.isIE){
			dijit.focus(dijit.getFocus()); // IE (at least 8) needs help with tab order changes
		}
		// to avoid screen jitter, we first create the editor with position:absolute, visibility:hidden,
		// and then when it's finished rendering, we switch from display mode to editor
		// position:absolute releases screen space allocated to the display node
		// opacity:0 is the same as visibility:hidden but is still focusable
		// visiblity:hidden removes focus outline

		dojo.style(this.displayNode, { position: "absolute", opacity: "0", display: "none" }); // makes display node invisible, display style used for focus-ability
		dojo.style(ww.domNode, { position: this._savedPosition, visibility: "visible", opacity: "1" });
		dojo.attr(this.displayNode, "tabIndex", "-1"); // needed by WebKit for TAB from editor to skip displayNode

		// Replace the display widget with edit widget, leaving them both displayed for a brief time so that
		// focus can be shifted without incident.  (browser may needs some time to render the editor.)
		setTimeout(dojo.hitch(this, function(){
			ww.focus(); // both nodes are showing, so we can switch focus safely
			ww._resetValue = ww.getValue();
		}), 0);
	},

	_onBlur: function(){
		// summary:
		//		Called when focus moves outside the InlineEditBox.
		//		Performs garbage collection.
		// tags:
		//		private

		this.inherited(arguments);
		if(!this.editing){
			/* causes IE focus problems, see TooltipDialog_a11y.html...
			setTimeout(dojo.hitch(this, function(){
				if(this.wrapperWidget){
					this.wrapperWidget.destroy();
					delete this.wrapperWidget;
				}
			}), 0);
			*/
		}
	},

	destroy: function(){
		if(this.wrapperWidget && !this.wrapperWidget._destroyed){
			this.wrapperWidget.destroy();
			delete this.wrapperWidget;
		}
		this.inherited(arguments);
	},

	_showText: function(/*Boolean*/ focus){
		// summary:
		//		Revert to display mode, and optionally focus on display node
		// tags:
		//		private

		var ww = this.wrapperWidget;
		dojo.style(ww.domNode, { position: "absolute", visibility: "hidden", opacity: "0" }); // hide the editor from mouse/keyboard events
		dojo.style(this.displayNode, { position: this._savedPosition, opacity: this._savedOpacity, display: "" }); // make the original text visible
		dojo.attr(this.displayNode, "tabIndex", this._savedTabIndex);
		if(focus){
			dijit.focus(this.displayNode);
		}
	},

	save: function(/*Boolean*/ focus){
		// summary:
		//		Save the contents of the editor and revert to display mode.
		// focus: Boolean
		//		Focus on the display mode text
		// tags:
		//		private

		if(this.disabled || !this.editing){ return; }
		this.editing = false;

		var ww = this.wrapperWidget;
		var value = ww.getValue();
		this.set('value', value); // display changed, formatted value

		this._showText(focus); // set focus as needed
	},

	setValue: function(/*String*/ val){
		// summary:
		//		Deprecated.   Use set('value', ...) instead.
		// tags:
		//		deprecated
		dojo.deprecated("dijit.InlineEditBox.setValue() is deprecated.  Use set('value', ...) instead.", "", "2.0");
		return this.set("value", val);
	},

	_setValueAttr: function(/*String*/ val){
		// summary:
		// 		Hook to make set("value", ...) work.
		//		Inserts specified HTML value into this node, or an "input needed" character if node is blank.

		val = dojo.trim(val);
		var renderVal = this.renderAsHtml ? val : val.replace(/&/gm, "&amp;").replace(/</gm, "&lt;").replace(/>/gm, "&gt;").replace(/"/gm, "&quot;").replace(/\n/g, "<br>");
		this.displayNode.innerHTML = renderVal || this.noValueIndicator;
		this._set("value", val);

		if(this._started){
			// tell the world that we have changed
			setTimeout(dojo.hitch(this, "onChange", val), 0); // setTimeout prevents browser freeze for long-running event handlers
		}
	},

	getValue: function(){
		// summary:
		//		Deprecated.   Use get('value') instead.
		// tags:
		//		deprecated
		dojo.deprecated("dijit.InlineEditBox.getValue() is deprecated.  Use get('value') instead.", "", "2.0");
		return this.get("value");
	},

	cancel: function(/*Boolean*/ focus){
		// summary:
		//		Revert to display mode, discarding any changes made in the editor
		// tags:
		//		private

		if(this.disabled || !this.editing){ return; }
		this.editing = false;

		// tell the world that we have no changes
		setTimeout(dojo.hitch(this, "onCancel"), 0); // setTimeout prevents browser freeze for long-running event handlers

		this._showText(focus);
	}
});

dojo.declare(
	"dijit._InlineEditor",
	 [dijit._Widget, dijit._Templated],
{
	// summary:
	// 		Internal widget used by InlineEditBox, displayed when in editing mode
	//		to display the editor and maybe save/cancel buttons.  Calling code should
	//		connect to save/cancel methods to detect when editing is finished
	//
	//		Has mainly the same parameters as InlineEditBox, plus these values:
	//
	// style: Object
	//		Set of CSS attributes of display node, to replicate in editor
	//
	// value: String
	//		Value as an HTML string or plain text string, depending on renderAsHTML flag

	templateString: dojo.cache("dijit", "templates/InlineEditBox.html"),
	widgetsInTemplate: true,

	postMixInProperties: function(){
		this.inherited(arguments);
		this.messages = dojo.i18n.getLocalization("dijit", "common", this.lang);
		dojo.forEach(["buttonSave", "buttonCancel"], function(prop){
			if(!this[prop]){ this[prop] = this.messages[prop]; }
		}, this);
	},

	buildRendering: function(){
		this.inherited(arguments);

		// Create edit widget in place in the template
		var cls = typeof this.editor == "string" ? dojo.getObject(this.editor) : this.editor;

		// Copy the style from the source
		// Don't copy ALL properties though, just the necessary/applicable ones.
		// wrapperStyle/destStyle code is to workaround IE bug where getComputedStyle().fontSize
		// is a relative value like 200%, rather than an absolute value like 24px, and
		// the 200% can refer *either* to a setting on the node or it's ancestor (see #11175)
		var srcStyle = this.sourceStyle,
			editStyle = "line-height:" + srcStyle.lineHeight + ";",
			destStyle = dojo.getComputedStyle(this.domNode);
		dojo.forEach(["Weight","Family","Size","Style"], function(prop){
			var textStyle = srcStyle["font"+prop],
				wrapperStyle = destStyle["font"+prop];
			if(wrapperStyle != textStyle){
				editStyle += "font-"+prop+":"+srcStyle["font"+prop]+";";
			}
		}, this);
		dojo.forEach(["marginTop","marginBottom","marginLeft", "marginRight"], function(prop){
			this.domNode.style[prop] = srcStyle[prop];
		}, this);
		var width = this.inlineEditBox.width;
		if(width == "100%"){
			// block mode
			editStyle += "width:100%;";
			this.domNode.style.display = "block";
		}else{
			// inline-block mode
			editStyle += "width:" + (width + (Number(width) == width ? "px" : "")) + ";";
		}
		var editorParams = dojo.delegate(this.inlineEditBox.editorParams, {
			style: editStyle,
			dir: this.dir,
			lang: this.lang
		});
		editorParams[ "displayedValue" in cls.prototype ? "displayedValue" : "value"] = this.value;
		this.editWidget = new cls(editorParams, this.editorPlaceholder);

		if(this.inlineEditBox.autoSave){
			// Remove the save/cancel buttons since saving is done by simply tabbing away or
			// selecting a value from the drop down list
			dojo.destroy(this.buttonContainer);
		}
	},

	postCreate: function(){
		this.inherited(arguments);

		var ew = this.editWidget;

		if(this.inlineEditBox.autoSave){
			// Selecting a value from a drop down list causes an onChange event and then we save
			this.connect(ew, "onChange", "_onChange");

			// ESC and TAB should cancel and save.  Note that edit widgets do a stopEvent() on ESC key (to
			// prevent Dialog from closing when the user just wants to revert the value in the edit widget),
			// so this is the only way we can see the key press event.
			this.connect(ew, "onKeyPress", "_onKeyPress");
		}else{
			// If possible, enable/disable save button based on whether the user has changed the value
			if("intermediateChanges" in ew){
				ew.set("intermediateChanges", true);
				this.connect(ew, "onChange", "_onIntermediateChange");
				this.saveButton.set("disabled", true);
			}
		}
	},

	_onIntermediateChange: function(val){
		// summary:
		//		Called for editor widgets that support the intermediateChanges=true flag as a way
		//		to detect when to enable/disabled the save button
		this.saveButton.set("disabled", (this.getValue() == this._resetValue) || !this.enableSave());
	},

	destroy: function(){
		this.editWidget.destroy(true); // let the parent wrapper widget clean up the DOM
		this.inherited(arguments);
	},

	getValue: function(){
		// summary:
		//		Return the [display] value of the edit widget
		var ew = this.editWidget;
		return String(ew.get("displayedValue" in ew ? "displayedValue" : "value"));
	},

	_onKeyPress: function(e){
		// summary:
		//		Handler for keypress in the edit box in autoSave mode.
		// description:
		//		For autoSave widgets, if Esc/Enter, call cancel/save.
		// tags:
		//		private

		if(this.inlineEditBox.autoSave && this.inlineEditBox.editing){
			if(e.altKey || e.ctrlKey){ return; }
			// If Enter/Esc pressed, treat as save/cancel.
			if(e.charOrCode == dojo.keys.ESCAPE){
				dojo.stopEvent(e);
				this.cancel(true); // sets editing=false which short-circuits _onBlur processing
			}else if(e.charOrCode == dojo.keys.ENTER && e.target.tagName == "INPUT"){
				dojo.stopEvent(e);
				this._onChange(); // fire _onBlur and then save
			}

			// _onBlur will handle TAB automatically by allowing
			// the TAB to change focus before we mess with the DOM: #6227
			// Expounding by request:
			// 	The current focus is on the edit widget input field.
			//	save() will hide and destroy this widget.
			//	We want the focus to jump from the currently hidden
			//	displayNode, but since it's hidden, it's impossible to
			//	unhide it, focus it, and then have the browser focus
			//	away from it to the next focusable element since each
			//	of these events is asynchronous and the focus-to-next-element
			//	is already queued.
			//	So we allow the browser time to unqueue the move-focus event
			//	before we do all the hide/show stuff.
		}
	},

	_onBlur: function(){
		// summary:
		//		Called when focus moves outside the editor
		// tags:
		//		private

		this.inherited(arguments);
		if(this.inlineEditBox.autoSave && this.inlineEditBox.editing){
			if(this.getValue() == this._resetValue){
				this.cancel(false);
			}else if(this.enableSave()){
				this.save(false);
			}
		}
	},

	_onChange: function(){
		// summary:
		//		Called when the underlying widget fires an onChange event,
		//		such as when the user selects a value from the drop down list of a ComboBox,
		//		which means that the user has finished entering the value and we should save.
		// tags:
		//		private

		if(this.inlineEditBox.autoSave && this.inlineEditBox.editing && this.enableSave()){
			dojo.style(this.inlineEditBox.displayNode, { display: "" });
			dijit.focus(this.inlineEditBox.displayNode); // fires _onBlur which will save the formatted value
		}
	},

	enableSave: function(){
		// summary:
		//		User overridable function returning a Boolean to indicate
		// 		if the Save button should be enabled or not - usually due to invalid conditions
		// tags:
		//		extension
		return (
			this.editWidget.isValid
			? this.editWidget.isValid()
			: true
		);
	},

	focus: function(){
		// summary:
		//		Focus the edit widget.
		// tags:
		//		protected

		this.editWidget.focus();
		setTimeout(dojo.hitch(this, function(){
			if(this.editWidget.focusNode && this.editWidget.focusNode.tagName == "INPUT"){
				dijit.selectInputText(this.editWidget.focusNode);
			}
		}), 0);
	}
});


return dijit.InlineEditBox;
});
