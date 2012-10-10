define("dijit/_editor/plugins/FullScreen", ["dojo", "dijit", "dojo/window", "dojo/i18n", "dijit/_editor/_Plugin", "dijit/form/Button", "i18n!dijit/_editor/nls/commands"], function(dojo, dijit) {

dojo.declare("dijit._editor.plugins.FullScreen",dijit._editor._Plugin,{
	// summary:
	//		This plugin provides FullScreen cabability to the editor.  When
	//		toggled on, it will render the editor into the full window and
	//		overlay everything.  It also binds to the hotkey: CTRL-SHIFT-F11
	//		for toggling fullscreen mode.

	// zIndex: [public] Number
	//		zIndex value used for overlaying the full page.
	//		default is 500.
	zIndex: 500,

	// _origState: [private] Object
	//		The original view state of the editor.
	_origState: null,

	// _origiFrameState: [private] Object
	//		The original view state of the iframe of the editor.
	_origiFrameState: null,

	// _resizeHandle: [private] Object
	//		Connection point used for handling resize when window resizes.
	_resizeHandle: null,

	// isFullscreen: [const] boolean
	//		Read-Only variable used to denote of the editor is in fullscreen mode or not.
	isFullscreen: false,

	toggle: function(){
		// summary:
		//		Function to allow programmatic toggling of the view.
		this.button.set("checked", !this.button.get("checked"));
	},

	_initButton: function(){
		// summary:
		//		Over-ride for creation of the resize button.
		var strings = dojo.i18n.getLocalization("dijit._editor", "commands"),
			editor = this.editor;
		this.button = new dijit.form.ToggleButton({
			label: strings["fullScreen"],
			dir: editor.dir,
			lang: editor.lang,
			showLabel: false,
			iconClass: this.iconClassPrefix + " " + this.iconClassPrefix + "FullScreen",
			tabIndex: "-1",
			onChange: dojo.hitch(this, "_setFullScreen")
		});
	},

	setEditor: function(editor){
		// summary:
		//		Over-ride for the setting of the editor.
		// editor: Object
		//		The editor to configure for this plugin to use.
		this.editor = editor;
		this._initButton();

		this.editor.addKeyHandler(dojo.keys.F11, true, true, dojo.hitch(this, function(e){
			// Enable the CTRL-SHIFT-F11 hotkey for fullscreen mode.
			this.toggle();
			dojo.stopEvent(e);
			setTimeout(dojo.hitch(this, function(){this.editor.focus();}), 250);
			return true;
		}));
		this.connect(this.editor.domNode, "onkeydown", "_containFocus");
	},

	_containFocus: function(e){
		// summary:
		//		When in Full Screen mode, it's good to try and retain focus in the editor
		//		so this function is intended to try and constrain the TAB key.
		// e: Event
		//		The key event.
		// tags:
		//		private
		if(this.isFullscreen){
			var ed = this.editor;
			if(!ed.isTabIndent &&
				ed._fullscreen_oldOnKeyDown &&
				e.keyCode === dojo.keys.TAB){
				// If we're in fullscreen mode, we want to take over how tab moves focus a bit.
				// to keep it within the editor since it's hiding the rest of the page.
				// IE hates changing focus IN the event handler, so need to put calls
				// in a timeout.  Gotta love IE.
				// Also need to check for alternate view nodes if present and active.
				var f = dijit.getFocus();
				var avn = this._getAltViewNode();
				if(f.node == ed.iframe ||
					(avn && f.node === avn)){
					setTimeout(dojo.hitch(this, function(){
						ed.toolbar.focus();
					}), 10);
				}else{
					if(avn && dojo.style(ed.iframe, "display") === "none"){
						setTimeout(dojo.hitch(this, function(){
							dijit.focus(avn);
						}), 10);
					}else{
						setTimeout(dojo.hitch(this, function(){
							ed.focus();
						}), 10);
					}
				}
				dojo.stopEvent(e);
			}else if(ed._fullscreen_oldOnKeyDown){
				// Only call up when it's a different function.  Traps corner case event issue
				// on IE which caused stack overflow on handler cleanup.
				ed._fullscreen_oldOnKeyDown(e);
			}
		}
	},

	_resizeEditor: function(){
		// summary:
		//		Function to handle resizing the editor as the viewport
		//		resizes (window scaled)
		// tags:
		//		private
		var vp = dojo.window.getBox();
		dojo.marginBox(this.editor.domNode, {
			w: vp.w,
			h: vp.h
		});

		//Adjust the inernal heights too, as they can be a bit off.
		var hHeight = this.editor.getHeaderHeight();
		var fHeight = this.editor.getFooterHeight();
		var extents = dojo._getPadBorderExtents(this.editor.domNode);
		var fcpExtents = dojo._getPadBorderExtents(this.editor.iframe.parentNode);
		var fcmExtents = dojo._getMarginExtents(this.editor.iframe.parentNode);
		
		var cHeight = vp.h - (hHeight + extents.h + fHeight);
		dojo.marginBox(this.editor.iframe.parentNode, {
			h: cHeight,
			w: vp.w
		});
		dojo.marginBox(this.editor.iframe, {
			h: cHeight - (fcpExtents.h + fcmExtents.h)
		});
	},

	_getAltViewNode: function(){
		// summary:
		//		This function is intended as a hook point for setting an
		//		alternate view node for when in full screen mode and the
		//		editable iframe is hidden.
		// tags:
		//		protected.
	},

	_setFullScreen: function(full){
		// summary:
		//		Function to handle toggling between full screen and
		//		regular view.
		// tags:
		//		private
		var vp = dojo.window.getBox();

		//Alias this for shorter code.
		var ed = this.editor;
		var body = dojo.body();
		var editorParent = ed.domNode.parentNode;

		this.isFullscreen = full;

		if(full){
			//Parent classes can royally screw up this plugin, so we
			//have to set eveything to position static.
			while(editorParent && editorParent !== dojo.body()){
				dojo.addClass(editorParent, "dijitForceStatic");
				editorParent = editorParent.parentNode;
			}

			// Save off the resize function.  We want to kill its behavior.
			this._editorResizeHolder = this.editor.resize;
			ed.resize = function() {} ;

			// Try to constrain focus control.
			ed._fullscreen_oldOnKeyDown = ed.onKeyDown;
			ed.onKeyDown = dojo.hitch(this, this._containFocus);

			this._origState = {};
			this._origiFrameState = {};

			// Store the basic editor state we have to restore later.
			// Not using dojo.style here, had problems, didn't
			// give me stuff like 100%, gave me pixel calculated values.
			// Need the exact original values.
			var domNode = ed.domNode,
				domStyle = domNode && domNode.style || {};
			this._origState = {
				width: domStyle.width || "",
				height: domStyle.height || "",
				top: dojo.style(domNode, "top") || "",
				left: dojo.style(domNode, "left") || "",
				position: dojo.style(domNode, "position") || "static",
				marginBox: dojo.marginBox(ed.domNode)
			};

			// Store the iframe state we have to restore later.
			// Not using dojo.style here, had problems, didn't
			// give me stuff like 100%, gave me pixel calculated values.
			// Need the exact original values.
			var iframe = ed.iframe,
				iframeStyle = iframe && iframe.style || {};

			var bc = dojo.style(ed.iframe, "backgroundColor");
			this._origiFrameState = {
				backgroundColor: bc || "transparent",
				width: iframeStyle.width || "auto",
				height: iframeStyle.height || "auto",
				zIndex: iframeStyle.zIndex || ""
			};

			// Okay, size everything.
			dojo.style(ed.domNode, {
				position: "absolute",
				top: "0px",
				left: "0px",
				zIndex: this.zIndex,
				width: vp.w + "px",
				height: vp.h + "px"
			});

			dojo.style(ed.iframe, {
				height: "100%",
				width: "100%",
				zIndex: this.zIndex,
				backgroundColor: bc !== "transparent" &&
					bc !== "rgba(0, 0, 0, 0)"?bc:"white"
			});

			dojo.style(ed.iframe.parentNode, {
				height: "95%",
				width: "100%"
			});

			// Store the overflow state we have to restore later.
			// IE had issues, so have to check that it's defined.  Ugh.
			if(body.style && body.style.overflow){
				this._oldOverflow = dojo.style(body, "overflow");
			}else{
				this._oldOverflow = "";
			}

			if(dojo.isIE && !dojo.isQuirks){
				// IE will put scrollbars in anyway, html (parent of body)
				// also controls them in standards mode, so we have to
				// remove them, argh.
				if(body.parentNode &&
					body.parentNode.style &&
					body.parentNode.style.overflow){
					this._oldBodyParentOverflow = body.parentNode.style.overflow;
				}else{
					try{
						this._oldBodyParentOverflow = dojo.style(body.parentNode, "overflow");
					}catch(e){
						this._oldBodyParentOverflow = "scroll";
					}
				}
				dojo.style(body.parentNode, "overflow", "hidden");
			}
			dojo.style(body, "overflow", "hidden");

			var resizer = function(){
				// function to handle resize events.
				// Will check current VP and only resize if
				// different.
				var vp = dojo.window.getBox();
				if("_prevW" in this && "_prevH" in this){
					// No actual size change, ignore.
					if(vp.w === this._prevW && vp.h === this._prevH){
						return;
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
					this._resizeEditor();
				}), 10);
			};
			this._resizeHandle = dojo.connect(window, "onresize", this, resizer);

			// Also monitor for direct calls to resize and adapt editor.
			this._resizeHandle2 = dojo.connect(ed, "resize", dojo.hitch(this, function(){
				if(this._resizer){
					clearTimeout(this._resizer);
					delete this._resizer;
				}
				this._resizer = setTimeout(dojo.hitch(this, function(){
					delete this._resizer;
					this._resizeEditor();
				}), 10);
			}));

			// Call it once to work around IE glitchiness.  Safe for other browsers too.
			this._resizeEditor();
			var dn = this.editor.toolbar.domNode;
			setTimeout(function(){dojo.window.scrollIntoView(dn);}, 250);
		}else{
			if(this._resizeHandle){
				// Cleanup resizing listeners
				dojo.disconnect(this._resizeHandle);
				this._resizeHandle = null;
			}
			if(this._resizeHandle2){
				// Cleanup resizing listeners
				dojo.disconnect(this._resizeHandle2);
				this._resizeHandle2 = null;
			}
			if(this._rst){
				clearTimeout(this._rst);
				this._rst = null;
			}
			
			//Remove all position static class assigns.
			while(editorParent && editorParent !== dojo.body()){
				dojo.removeClass(editorParent, "dijitForceStatic");
				editorParent = editorParent.parentNode;
			}
			
			// Restore resize function
			if(this._editorResizeHolder){
				this.editor.resize = this._editorResizeHolder;
			}

			if(!this._origState && !this._origiFrameState){
				// If we actually didn't toggle, then don't do anything.
				return;
			}
			if(ed._fullscreen_oldOnKeyDown){
				ed.onKeyDown = ed._fullscreen_oldOnKeyDown;
				delete ed._fullscreen_oldOnKeyDown;
			}

			// Add a timeout to make sure we don't have a resize firing in the
			// background at the time of minimize.
			var self = this;
			setTimeout(function(){
				// Restore all the editor state.
				var mb = self._origState.marginBox;
				var oh = self._origState.height;
				if(dojo.isIE && !dojo.isQuirks){
					body.parentNode.style.overflow = self._oldBodyParentOverflow;
					delete self._oldBodyParentOverflow;
				}
				dojo.style(body, "overflow", self._oldOverflow);
				delete self._oldOverflow;

				dojo.style(ed.domNode, self._origState);
				dojo.style(ed.iframe.parentNode, {
					height: "",
					width: ""
				});
				dojo.style(ed.iframe, self._origiFrameState);
				delete self._origState;
				delete self._origiFrameState;
				// In case it is contained in a layout and the layout changed size,
				// go ahead and call resize.
				var pWidget = dijit.getEnclosingWidget(ed.domNode.parentNode);
				if(pWidget && pWidget.resize){
					pWidget.resize();
				}else{
					if(!oh || oh.indexOf("%") < 0){
						// Resize if the original size wasn't set
						// or wasn't in percent.  Timeout is to avoid
						// an IE crash in unit testing.
						setTimeout(dojo.hitch(this, function(){ed.resize({h: mb.h});}), 0);
					}
				}
				dojo.window.scrollIntoView(self.editor.toolbar.domNode);
			}, 100);
		}
	},

	updateState: function(){
		// summary:
		//		Over-ride for button state control for disabled to work.
		this.button.set("disabled", this.get("disabled"));
	},

	destroy: function(){
		// summary:
		//		Over-ride to ensure the resize handle gets cleaned up.
		if(this._resizeHandle){
			// Cleanup resizing listeners
			dojo.disconnect(this._resizeHandle);
			this._resizeHandle = null;
		}
		if(this._resizeHandle2){
			// Cleanup resizing listeners
			dojo.disconnect(this._resizeHandle2);
			this._resizeHandle2 = null;
		}
		if(this._resizer){
			clearTimeout(this._resizer);
			this._resizer = null;
		}
		this.inherited(arguments);
	}
});


// Register this plugin.
dojo.subscribe(dijit._scopeName + ".Editor.getPlugin",null,function(o){
	if(o.plugin){ return; }
	var name = o.args.name.toLowerCase();
	if(name === "fullscreen"){
		o.plugin = new dijit._editor.plugins.FullScreen({
			zIndex: ("zIndex" in o.args)?o.args.zIndex:500
		});
	}
});


return dijit._editor.plugins.FullScreen;
});
