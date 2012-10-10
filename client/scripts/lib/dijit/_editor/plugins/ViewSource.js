define("dijit/_editor/plugins/ViewSource", ["dojo", "dijit", "dojo/window", "dojo/i18n", "dijit/_editor/_Plugin", "dijit/form/Button", "i18n!dijit/_editor/nls/commands"], function(dojo, dijit) {

dojo.declare("dijit._editor.plugins.ViewSource",dijit._editor._Plugin,{
	// summary:
	//		This plugin provides a simple view source capability.  When view
	//		source mode is enabled, it disables all other buttons/plugins on the RTE.
	//		It also binds to the hotkey: CTRL-SHIFT-F11 for toggling ViewSource mode.

	// stripScripts: [public] Boolean
	//		Boolean flag used to indicate if script tags should be stripped from the document.
	//		Defaults to true.
	stripScripts: true,

	// stripComments: [public] Boolean
	//		Boolean flag used to indicate if comment tags should be stripped from the document.
	//		Defaults to true.
	stripComments: true,

	// stripComments: [public] Boolean
	//		Boolean flag used to indicate if iframe tags should be stripped from the document.
	//		Defaults to true.
	stripIFrames: true,

	// readOnly: [const] Boolean
	//		Boolean flag used to indicate if the source view should be readonly or not.
	//		Cannot be changed after initialization of the plugin.
	//		Defaults to false.
	readOnly: false,

	// _fsPlugin: [private] Object
	//		Reference to a registered fullscreen plugin so that viewSource knows
	//		how to scale.
	_fsPlugin: null,

	toggle: function(){
		// summary:
		//		Function to allow programmatic toggling of the view.

		// For Webkit, we have to focus a very particular way.
		// when swapping views, otherwise focus doesn't shift right
		// but can't focus this way all the time, only for VS changes.
		// If we did it all the time, buttons like bold, italic, etc
		// break.
		if(dojo.isWebKit){this._vsFocused = true;}
		this.button.set("checked", !this.button.get("checked"));

	},

	_initButton: function(){
		// summary:
		//		Over-ride for creation of the resize button.
		var strings = dojo.i18n.getLocalization("dijit._editor", "commands"),
			editor = this.editor;
		this.button = new dijit.form.ToggleButton({
			label: strings["viewSource"],
			dir: editor.dir,
			lang: editor.lang,
			showLabel: false,
			iconClass: this.iconClassPrefix + " " + this.iconClassPrefix + "ViewSource",
			tabIndex: "-1",
			onChange: dojo.hitch(this, "_showSource")
		});

		// IE 7 has a horrible bug with zoom, so we have to create this node
		// to cross-check later.  Sigh.
		if(dojo.isIE == 7){
			this._ieFixNode = dojo.create("div", {
				style: {
					opacity: "0",
					zIndex: "-1000",
					position: "absolute",
					top: "-1000px"
				}
			}, dojo.body());
		}
		// Make sure readonly mode doesn't make the wrong cursor appear over the button.
		this.button.set("readOnly", false);
	},


	setEditor: function(/*dijit.Editor*/ editor){
		// summary:
		//		Tell the plugin which Editor it is associated with.
		// editor: Object
		//		The editor object to attach the print capability to.
		this.editor = editor;
		this._initButton();

		this.editor.addKeyHandler(dojo.keys.F12, true, true, dojo.hitch(this, function(e){
			// Move the focus before switching
			// It'll focus back.  Hiding a focused
			// node causes issues.
			this.button.focus();
			this.toggle();
			dojo.stopEvent(e);

			// Call the focus shift outside of the handler.
			setTimeout(dojo.hitch(this, function(){
				// We over-ride focus, so we just need to call.
				this.editor.focus();
			}), 100);
		}));
	},

	_showSource: function(source){
		// summary:
		//		Function to toggle between the source and RTE views.
		// source: boolean
		//		Boolean value indicating if it should be in source mode or not.
		// tags:
		//		private
		var ed = this.editor;
		var edPlugins = ed._plugins;
		var html;
		this._sourceShown = source;
		var self = this;
		try{
			if(!this.sourceArea){
				this._createSourceView();
			}
			if(source){
				// Update the QueryCommandEnabled function to disable everything but
				// the source view mode.  Have to over-ride a function, then kick all
				// plugins to check their state.
				ed._sourceQueryCommandEnabled = ed.queryCommandEnabled;
				ed.queryCommandEnabled = function(cmd){
					var lcmd = cmd.toLowerCase();
					if(lcmd === "viewsource"){
						return true;
					}else{
						return false;
					}
				};
				this.editor.onDisplayChanged();
				html = ed.get("value");
				html = this._filter(html);
				ed.set("value", html);
				this._pluginList = [];
				dojo.forEach(edPlugins, function(p){
					// Turn off any plugins not controlled by queryCommandenabled.
					if(!(p instanceof dijit._editor.plugins.ViewSource)){
						p.set("disabled", true)
					}
				});

				// We actually do need to trap this plugin and adjust how we
				// display the textarea.
				if(this._fsPlugin){
					this._fsPlugin._getAltViewNode = function(){
						return self.sourceArea;
					};
				}

				this.sourceArea.value = html;
				var is = dojo._getMarginSize(ed.iframe.parentNode);

				dojo.marginBox(this.sourceArea, {
					w: is.w,
					h: is.h
				});

				dojo.style(ed.iframe, "display", "none");
				dojo.style(this.sourceArea, {
					display: "block"
				});

				var resizer = function(){
					// function to handle resize events.
					// Will check current VP and only resize if
					// different.
					var vp = dojo.window.getBox();

					if("_prevW" in this && "_prevH" in this){
						// No actual size change, ignore.
						if(vp.w === this._prevW && vp.h === this._prevH){
							return;
						}else{
							this._prevW = vp.w;
							this._prevH = vp.h;
						}
					}else{
						this._prevW = vp.w;
						this._prevH = vp.h;
					}
					if(this._resizer){
						clearTimeout(this._resizer);
						delete this._resizer;
					}
					// Timeout it to help avoid spamming resize on IE.
					// Works for all browsers.
					this._resizer = setTimeout(dojo.hitch(this, function(){
						delete this._resizer;
						this._resize();
					}), 10);
				};
				this._resizeHandle = dojo.connect(window, "onresize", this, resizer);

				//Call this on a delay once to deal with IE glitchiness on initial size.
				setTimeout(dojo.hitch(this, this._resize), 100);

				//Trigger a check for command enablement/disablement.
				this.editor.onNormalizedDisplayChanged();

				this.editor.__oldGetValue = this.editor.getValue;
				this.editor.getValue = dojo.hitch(this, function() {
					var txt = this.sourceArea.value;
					txt = this._filter(txt);
					return txt;
				});
			}else{
				// First check that we were in source view before doing anything.
				// corner case for being called with a value of false and we hadn't
				// actually been in source display mode.
				if(!ed._sourceQueryCommandEnabled){
					return;
				}
				dojo.disconnect(this._resizeHandle);
				delete this._resizeHandle;

				if(this.editor.__oldGetValue){
					this.editor.getValue = this.editor.__oldGetValue;
					delete this.editor.__oldGetValue;
				}

				// Restore all the plugin buttons state.
				ed.queryCommandEnabled = ed._sourceQueryCommandEnabled;
				if(!this._readOnly){
					html = this.sourceArea.value;
					html = this._filter(html);
					ed.beginEditing();
					ed.set("value", html);
					ed.endEditing();
				}

				dojo.forEach(edPlugins, function(p){
					// Turn back on any plugins we turned off.
					p.set("disabled", false);
				});

				dojo.style(this.sourceArea, "display", "none");
				dojo.style(ed.iframe, "display", "block");
				delete ed._sourceQueryCommandEnabled;
                
				//Trigger a check for command enablement/disablement.
				this.editor.onDisplayChanged();
			}
			// Call a delayed resize to wait for some things to display in header/footer.
			setTimeout(dojo.hitch(this, function(){
				// Make resize calls.
				var parent = ed.domNode.parentNode;
				if(parent){
					var container = dijit.getEnclosingWidget(parent);
					if(container && container.resize){
						container.resize();
					}
				}
                ed.resize();
			}), 300);
		}catch(e){
			console.log(e);
		}
	},

	updateState: function(){
		// summary:
		//		Over-ride for button state control for disabled to work.
		this.button.set("disabled", this.get("disabled"));
	},

	_resize: function(){
		// summary:
		//		Internal function to resize the source view
		// tags:
		//		private
		var ed = this.editor;
		var tbH = ed.getHeaderHeight();
		var fH = ed.getFooterHeight();
		var eb = dojo.position(ed.domNode);

		// Styles are now applied to the internal source container, so we have
		// to subtract them off.
		var containerPadding = dojo._getPadBorderExtents(ed.iframe.parentNode);
		var containerMargin = dojo._getMarginExtents(ed.iframe.parentNode);

		var extents = dojo._getPadBorderExtents(ed.domNode);
		var mExtents = dojo._getMarginExtents(ed.domNode);
		var edb = {
			w: eb.w - (extents.w + mExtents.w),
			h: eb.h - (tbH + extents.h + mExtents.h + fH)
		};

		// Fullscreen gets odd, so we need to check for the FS plugin and
		// adapt.
		if(this._fsPlugin && this._fsPlugin.isFullscreen){
			//Okay, probably in FS, adjust.
			var vp = dojo.window.getBox();
			edb.w = (vp.w - extents.w);
			edb.h = (vp.h - (tbH + extents.h + fH));
		}

		if(dojo.isIE){
			// IE is always off by 2px, so we have to adjust here
			// Note that IE ZOOM is broken here.  I can't get
			//it to scale right.
			edb.h -= 2;
		}

		// IE has a horrible zoom bug.  So, we have to try and account for
		// it and fix up the scaling.
		if(this._ieFixNode){
			var _ie7zoom = -this._ieFixNode.offsetTop / 1000;
			edb.w = Math.floor((edb.w + 0.9) / _ie7zoom);
			edb.h = Math.floor((edb.h + 0.9) / _ie7zoom);
		}

		dojo.marginBox(this.sourceArea, {
			w: edb.w - (containerPadding.w + containerMargin.w),
			h: edb.h - (containerPadding.h + containerMargin.h)
		});

		// Scale the parent container too in this case.
		dojo.marginBox(ed.iframe.parentNode, {
			h: edb.h
		});
	},

	_createSourceView: function(){
		// summary:
		//		Internal function for creating the source view area.
		// tags:
		//		private
		var ed = this.editor;
		var edPlugins = ed._plugins;
		this.sourceArea = dojo.create("textarea");
		if(this.readOnly){
			dojo.attr(this.sourceArea, "readOnly", true);
			this._readOnly = true;
		}
		dojo.style(this.sourceArea, {
			padding: "0px",
			margin: "0px",
			borderWidth: "0px",
			borderStyle: "none"
		});
		dojo.place(this.sourceArea, ed.iframe, "before");

		if(dojo.isIE && ed.iframe.parentNode.lastChild !== ed.iframe){
			// There's some weirdo div in IE used for focus control
			// But is messed up scaling the textarea if we don't config
			// it some so it doesn't have a varying height.
			dojo.style(ed.iframe.parentNode.lastChild,{
				width: "0px",
				height: "0px",
				padding: "0px",
				margin: "0px",
				borderWidth: "0px",
				borderStyle: "none"
			});
		}

		// We also need to take over editor focus a bit here, so that focus calls to
		// focus the editor will focus to the right node when VS is active.
		ed._viewsource_oldFocus = ed.focus;
		var self = this;
		ed.focus = function(){
			if(self._sourceShown){
				self.setSourceAreaCaret();
			}else{
				try{
					if(this._vsFocused){
						delete this._vsFocused;
						// Must focus edit node in this case (webkit only) or
						// focus doesn't shift right, but in normal
						// cases we focus with the regular function.
						dijit.focus(ed.editNode);
					}else{
						ed._viewsource_oldFocus();
					}
				}catch(e){
					console.log(e);
				}
			}
		};

		var i, p;
		for(i = 0; i < edPlugins.length; i++){
			// We actually do need to trap this plugin and adjust how we
			// display the textarea.
			p = edPlugins[i];
			if(p && (p.declaredClass === "dijit._editor.plugins.FullScreen" ||
					p.declaredClass === (dijit._scopeName +
					"._editor.plugins.FullScreen"))){
				this._fsPlugin = p;
				break;
			}
		}
		if(this._fsPlugin){
			// Found, we need to over-ride the alt-view node function
			// on FullScreen with our own, chain up to parent call when appropriate.
			this._fsPlugin._viewsource_getAltViewNode = this._fsPlugin._getAltViewNode;
			this._fsPlugin._getAltViewNode = function(){
				return self._sourceShown?self.sourceArea:this._viewsource_getAltViewNode();
			};
		}

		// Listen to the source area for key events as well, as we need to be able to hotkey toggle
		// it from there too.
		this.connect(this.sourceArea, "onkeydown", dojo.hitch(this, function(e){
			if(this._sourceShown && e.keyCode == dojo.keys.F12 && e.ctrlKey && e.shiftKey){
				this.button.focus();
				this.button.set("checked", false);
				setTimeout(dojo.hitch(this, function(){ed.focus();}), 100);
				dojo.stopEvent(e);
			}
		}));
	},

	_stripScripts: function(html){
		// summary:
		//		Strips out script tags from the HTML used in editor.
		// html: String
		//		The HTML to filter
		// tags:
		//		private
		if(html){
			// Look for closed and unclosed (malformed) script attacks.
			html = html.replace(/<\s*script[^>]*>((.|\s)*?)<\\?\/\s*script\s*>/ig, "");
			html = html.replace(/<\s*script\b([^<>]|\s)*>?/ig, "");
			html = html.replace(/<[^>]*=(\s|)*[("|')]javascript:[^$1][(\s|.)]*[$1][^>]*>/ig, "");
		}
		return html;
	},

	_stripComments: function(html){
		// summary:
		//		Strips out comments from the HTML used in editor.
		// html: String
		//		The HTML to filter
		// tags:
		//		private
		if(html){
			html = html.replace(/<!--(.|\s){1,}?-->/g, "");
		}
		return html;
	},

	_stripIFrames: function(html){
		// summary:
		//		Strips out iframe tags from the content, to avoid iframe script
		//		style injection attacks.
		// html: String
		//		The HTML to filter
		// tags:
		//		private
		if(html){
			html = html.replace(/<\s*iframe[^>]*>((.|\s)*?)<\\?\/\s*iframe\s*>/ig, "");
		}
		return html;
	},

	_filter: function(html){
		// summary:
		//		Internal function to perform some filtering on the HTML.
		// html: String
		//		The HTML to filter
		// tags:
		//		private
		if(html){
			if(this.stripScripts){
				html = this._stripScripts(html);
			}
			if(this.stripComments){
				html = this._stripComments(html);
			}
			if(this.stripIFrames){
				html = this._stripIFrames(html);
			}
		}
		return html;
	},

	setSourceAreaCaret: function(){
		// summary:
		//		Internal function to set the caret in the sourceArea
		//		to 0x0
		var win = dojo.global;
		var elem = this.sourceArea;
		dijit.focus(elem);
		if(this._sourceShown && !this.readOnly){
			if(dojo.isIE){
				if(this.sourceArea.createTextRange){
					var range = elem.createTextRange();
					range.collapse(true);
					range.moveStart("character", -99999); // move to 0
					range.moveStart("character", 0); // delta from 0 is the correct position
					range.moveEnd("character", 0);
					range.select();
				}
			}else if(win.getSelection){
				if(elem.setSelectionRange){
					elem.setSelectionRange(0,0);
				}
			}
		}
	},

	destroy: function(){
		// summary:
		//		Over-ride to remove the node used to correct for IE's
		//		zoom bug.
		if(this._ieFixNode){
			dojo.body().removeChild(this._ieFixNode);
		}
		if(this._resizer){
			clearTimeout(this._resizer);
			delete this._resizer;
		}
		if(this._resizeHandle){
			dojo.disconnect(this._resizeHandle);
			delete this._resizeHandle;
		}
		this.inherited(arguments);
	}
});

// Register this plugin.
dojo.subscribe(dijit._scopeName + ".Editor.getPlugin",null,function(o){
	if(o.plugin){ return; }
	var name = o.args.name.toLowerCase();
	if(name ===  "viewsource"){
		o.plugin = new dijit._editor.plugins.ViewSource({
			readOnly: ("readOnly" in o.args)?o.args.readOnly:false,
			stripComments: ("stripComments" in o.args)?o.args.stripComments:true,
			stripScripts: ("stripScripts" in o.args)?o.args.stripScripts:true,
			stripIFrames: ("stripIFrames" in o.args)?o.args.stripIFrames:true
		});
	}
});


return dijit._editor.plugins.ViewSource;
});
