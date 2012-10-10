define("dijit/layout/AccordionContainer", ["dojo", "dijit", "text!dijit/layout/templates/AccordionButton.html", "dijit/_Container", "dijit/_Templated", "dijit/_CssStateMixin", "dijit/layout/StackContainer", "dijit/layout/ContentPane", "dijit/layout/AccordionPane"], function(dojo, dijit) {

//dojo.require("dijit.layout.AccordionPane ");	// for back compat, remove for 2.0

// Design notes:
//
// An AccordionContainer is a StackContainer, but each child (typically ContentPane)
// is wrapped in a _AccordionInnerContainer.   This is hidden from the caller.
//
// The resulting markup will look like:
//
//	<div class=dijitAccordionContainer>
//		<div class=dijitAccordionInnerContainer>	(one pane)
//				<div class=dijitAccordionTitle>		(title bar) ... </div>
//				<div class=dijtAccordionChildWrapper>   (content pane) </div>
//		</div>
//	</div>
//
// Normally the dijtAccordionChildWrapper is hidden for all but one child (the shown
// child), so the space for the content pane is all the title bars + the one dijtAccordionChildWrapper,
// which on claro has a 1px border plus a 2px bottom margin.
//
// During animation there are two dijtAccordionChildWrapper's shown, so we need
// to compensate for that.

dojo.declare(
	"dijit.layout.AccordionContainer",
	dijit.layout.StackContainer,
	{
		// summary:
		//		Holds a set of panes where every pane's title is visible, but only one pane's content is visible at a time,
		//		and switching between panes is visualized by sliding the other panes up/down.
		// example:
		//	| 	<div dojoType="dijit.layout.AccordionContainer">
		//	|		<div dojoType="dijit.layout.ContentPane" title="pane 1">
		//	|		</div>
		//	|		<div dojoType="dijit.layout.ContentPane" title="pane 2">
		//	|			<p>This is some text</p>
		//	|		</div>
		//	|	</div>

		// duration: Integer
		//		Amount of time (in ms) it takes to slide panes
		duration: dijit.defaultDuration,

		// buttonWidget: [const] String
		//		The name of the widget used to display the title of each pane
		buttonWidget: "dijit.layout._AccordionButton",

/*=====
		// _verticalSpace: Number
		//		Pixels of space available for the open pane
		//		(my content box size minus the cumulative size of all the title bars)
		_verticalSpace: 0,
=====*/
		baseClass: "dijitAccordionContainer",

		buildRendering: function(){
			this.inherited(arguments);
			this.domNode.style.overflow = "hidden";		// TODO: put this in dijit.css
			dijit.setWaiRole(this.domNode, "tablist");	// TODO: put this in template
		},

		startup: function(){
			if(this._started){ return; }
			this.inherited(arguments);
			if(this.selectedChildWidget){
				var style = this.selectedChildWidget.containerNode.style;
				style.display = "";
				style.overflow = "auto";
				this.selectedChildWidget._wrapperWidget.set("selected", true);
			}
		},

		layout: function(){
			// Implement _LayoutWidget.layout() virtual method.
			// Set the height of the open pane based on what room remains.

			var openPane = this.selectedChildWidget;
			
			if(!openPane){ return;}

			// space taken up by title, plus wrapper div (with border/margin) for open pane
			var wrapperDomNode = openPane._wrapperWidget.domNode,
				wrapperDomNodeMargin = dojo._getMarginExtents(wrapperDomNode),
				wrapperDomNodePadBorder = dojo._getPadBorderExtents(wrapperDomNode),
				wrapperContainerNode = openPane._wrapperWidget.containerNode,
				wrapperContainerNodeMargin = dojo._getMarginExtents(wrapperContainerNode),
				wrapperContainerNodePadBorder = dojo._getPadBorderExtents(wrapperContainerNode),
				mySize = this._contentBox;

			// get cumulative height of all the unselected title bars
			var totalCollapsedHeight = 0;
			dojo.forEach(this.getChildren(), function(child){
	            if(child != openPane){
					totalCollapsedHeight += dojo._getMarginSize(child._wrapperWidget.domNode).h;
				}
			});
			this._verticalSpace = mySize.h - totalCollapsedHeight - wrapperDomNodeMargin.h
			 	- wrapperDomNodePadBorder.h - wrapperContainerNodeMargin.h - wrapperContainerNodePadBorder.h
				- openPane._buttonWidget.getTitleHeight();

			// Memo size to make displayed child
			this._containerContentBox = {
				h: this._verticalSpace,
				w: this._contentBox.w - wrapperDomNodeMargin.w - wrapperDomNodePadBorder.w
					- wrapperContainerNodeMargin.w - wrapperContainerNodePadBorder.w
			};

			if(openPane){
				openPane.resize(this._containerContentBox);
			}
		},

		_setupChild: function(child){
			// Overrides _LayoutWidget._setupChild().
			// Put wrapper widget around the child widget, showing title

			child._wrapperWidget = new dijit.layout._AccordionInnerContainer({
				contentWidget: child,
				buttonWidget: this.buttonWidget,
				id: child.id + "_wrapper",
				dir: child.dir,
				lang: child.lang,
				parent: this
			});

			this.inherited(arguments);
		},

		addChild: function(/*dijit._Widget*/ child, /*Integer?*/ insertIndex){
			if(this._started){
				// Adding a child to a started Accordion is complicated because children have
				// wrapper widgets.  Default code path (calling this.inherited()) would add
				// the new child inside another child's wrapper.

				// First add in child as a direct child of this AccordionContainer
				dojo.place(child.domNode, this.containerNode, insertIndex);

				if(!child._started){
					child.startup();
				}
				
				// Then stick the wrapper widget around the child widget
				this._setupChild(child);

				// Code below copied from StackContainer
				dojo.publish(this.id+"-addChild", [child, insertIndex]);
				this.layout();
				if(!this.selectedChildWidget){
					this.selectChild(child);
				}
			}else{
				// We haven't been started yet so just add in the child widget directly,
				// and the wrapper will be created on startup()
				this.inherited(arguments);
			}
		},

		removeChild: function(child){
			// Overrides _LayoutWidget.removeChild().

			// Destroy wrapper widget first, before StackContainer.getChildren() call.
			// Replace wrapper widget with true child widget (ContentPane etc.).
			// This step only happens if the AccordionContainer has been started; otherwise there's no wrapper.
			if(child._wrapperWidget){
				dojo.place(child.domNode, child._wrapperWidget.domNode, "after");
				child._wrapperWidget.destroy();
				delete child._wrapperWidget;
			}

			dojo.removeClass(child.domNode, "dijitHidden");

			this.inherited(arguments);
		},

		getChildren: function(){
			// Overrides _Container.getChildren() to return content panes rather than internal AccordionInnerContainer panes
			return dojo.map(this.inherited(arguments), function(child){
				return child.declaredClass == "dijit.layout._AccordionInnerContainer" ? child.contentWidget : child;
			}, this);
		},

		destroy: function(){
			if(this._animation){
				this._animation.stop();
			}
			dojo.forEach(this.getChildren(), function(child){
				// If AccordionContainer has been started, then each child has a wrapper widget which
				// also needs to be destroyed.
				if(child._wrapperWidget){
					child._wrapperWidget.destroy();
				}else{
					child.destroyRecursive();
				}
			});
			this.inherited(arguments);
		},

		_showChild: function(child){
			// Override StackContainer._showChild() to set visibility of _wrapperWidget.containerNode
			child._wrapperWidget.containerNode.style.display="block";
			return this.inherited(arguments);
		},

		_hideChild: function(child){
			// Override StackContainer._showChild() to set visibility of _wrapperWidget.containerNode
			child._wrapperWidget.containerNode.style.display="none";
			this.inherited(arguments);
		},

		_transition: function(/*dijit._Widget?*/ newWidget, /*dijit._Widget?*/ oldWidget, /*Boolean*/ animate){
			// Overrides StackContainer._transition() to provide sliding of title bars etc.

			if(dojo.isIE < 8){
				// workaround animation bugs by not animating; not worth supporting animation for IE6 & 7
				animate = false;
			}

			if(this._animation){
				// there's an in-progress animation.  speedily end it so we can do the newly requested one
				this._animation.stop(true);
				delete this._animation;
			}

			var self = this;

			if(newWidget){
				newWidget._wrapperWidget.set("selected", true);

				var d = this._showChild(newWidget);	// prepare widget to be slid in

				// Size the new widget, in case this is the first time it's being shown,
				// or I have been resized since the last time it was shown.
				// Note that page must be visible for resizing to work.
				if(this.doLayout && newWidget.resize){
					newWidget.resize(this._containerContentBox);
				}
			}

			if(oldWidget){
				oldWidget._wrapperWidget.set("selected", false);
				if(!animate){
					this._hideChild(oldWidget);
				}
			}

			if(animate){
				var newContents = newWidget._wrapperWidget.containerNode,
					oldContents = oldWidget._wrapperWidget.containerNode;

				// During the animation we will be showing two dijitAccordionChildWrapper nodes at once,
				// which on claro takes up 4px extra space (compared to stable AccordionContainer).
				// Have to compensate for that by immediately shrinking the pane being closed.
				var wrapperContainerNode = newWidget._wrapperWidget.containerNode,
					wrapperContainerNodeMargin = dojo._getMarginExtents(wrapperContainerNode),
					wrapperContainerNodePadBorder = dojo._getPadBorderExtents(wrapperContainerNode),
					animationHeightOverhead = wrapperContainerNodeMargin.h + wrapperContainerNodePadBorder.h;

				oldContents.style.height = (self._verticalSpace - animationHeightOverhead) + "px";

				this._animation = new dojo.Animation({
					node: newContents,
					duration: this.duration,
					curve: [1, this._verticalSpace - animationHeightOverhead - 1],
					onAnimate: function(value){
						value = Math.floor(value);	// avoid fractional values
						newContents.style.height = value + "px";
						oldContents.style.height = (self._verticalSpace - animationHeightOverhead - value) + "px";
					},
					onEnd: function(){
						delete self._animation;
						newContents.style.height = "auto";
						oldWidget._wrapperWidget.containerNode.style.display = "none";
						oldContents.style.height = "auto";
						self._hideChild(oldWidget);
					}
				});
				this._animation.onStop = this._animation.onEnd;
				this._animation.play();
			}

			return d;	// If child has an href, promise that fires when the widget has finished loading
		},

		// note: we are treating the container as controller here
		_onKeyPress: function(/*Event*/ e, /*dijit._Widget*/ fromTitle){
			// summary:
			//		Handle keypress events
			// description:
			//		This is called from a handler on AccordionContainer.domNode
			//		(setup in StackContainer), and is also called directly from
			//		the click handler for accordion labels
			if(this.disabled || e.altKey || !(fromTitle || e.ctrlKey)){
				return;
			}
			var k = dojo.keys,
				c = e.charOrCode;
			if((fromTitle && (c == k.LEFT_ARROW || c == k.UP_ARROW)) ||
					(e.ctrlKey && c == k.PAGE_UP)){
				this._adjacent(false)._buttonWidget._onTitleClick();
				dojo.stopEvent(e);
			}else if((fromTitle && (c == k.RIGHT_ARROW || c == k.DOWN_ARROW)) ||
					(e.ctrlKey && (c == k.PAGE_DOWN || c == k.TAB))){
				this._adjacent(true)._buttonWidget._onTitleClick();
				dojo.stopEvent(e);
			}
		}
	}
);

dojo.declare("dijit.layout._AccordionInnerContainer",
	[dijit._Widget, dijit._CssStateMixin], {
		// summary:
		//		Internal widget placed as direct child of AccordionContainer.containerNode.
		//		When other widgets are added as children to an AccordionContainer they are wrapped in
		//		this widget.
		
/*=====
		// buttonWidget: String
		//		Name of class to use to instantiate title
		//		(Wish we didn't have a separate widget for just the title but maintaining it
		//		for backwards compatibility, is it worth it?)
		 buttonWidget: null,
=====*/

/*=====
		// contentWidget: dijit._Widget
		//		Pointer to the real child widget
	 	contentWidget: null,
=====*/

		baseClass: "dijitAccordionInnerContainer",

		// tell nested layout widget that we will take care of sizing
		isContainer: true,
		isLayoutContainer: true,

		buildRendering: function(){
			// Builds a template like:
			//	<div class=dijitAccordionInnerContainer>
			//		Button
			//		<div class=dijitAccordionChildWrapper>
			//			ContentPane
			//		</div>
			//	</div>

			// Create wrapper div, placed where the child is now
			this.domNode = dojo.place("<div class='" + this.baseClass + "'>", this.contentWidget.domNode, "after");
			
			// wrapper div's first child is the button widget (ie, the title bar)
			var child = this.contentWidget,
				cls = dojo.getObject(this.buttonWidget);
			this.button = child._buttonWidget = (new cls({
				contentWidget: child,
				label: child.title,
				title: child.tooltip,
				dir: child.dir,
				lang: child.lang,
				iconClass: child.iconClass,
				id: child.id + "_button",
				parent: this.parent
			})).placeAt(this.domNode);
			
			// and then the actual content widget (changing it from prior-sibling to last-child),
			// wrapped by a <div class=dijitAccordionChildWrapper>
			this.containerNode = dojo.place("<div class='dijitAccordionChildWrapper' style='display:none'>", this.domNode);
			dojo.place(this.contentWidget.domNode, this.containerNode);
		},

		postCreate: function(){
			this.inherited(arguments);

			// Map changes in content widget's title etc. to changes in the button
			var button = this.button;
			this._contentWidgetWatches = [
				this.contentWidget.watch('title', dojo.hitch(this, function(name, oldValue, newValue){
					button.set("label", newValue);
				})),
				this.contentWidget.watch('tooltip', dojo.hitch(this, function(name, oldValue, newValue){
					button.set("title", newValue);
				})),
				this.contentWidget.watch('iconClass', dojo.hitch(this, function(name, oldValue, newValue){
					button.set("iconClass", newValue);
				}))
			];
		},

		_setSelectedAttr: function(/*Boolean*/ isSelected){
			this._set("selected", isSelected);
			this.button.set("selected", isSelected);
			if(isSelected){
				var cw = this.contentWidget;
				if(cw.onSelected){ cw.onSelected(); }
			}
		},

		startup: function(){
			// Called by _Container.addChild()
			this.contentWidget.startup();
		},

		destroy: function(){
			this.button.destroyRecursive();

			dojo.forEach(this._contentWidgetWatches || [], function(w){ w.unwatch(); });

			delete this.contentWidget._buttonWidget;
			delete this.contentWidget._wrapperWidget;

			this.inherited(arguments);
		},
		
		destroyDescendants: function(){
			// since getChildren isn't working for me, have to code this manually
			this.contentWidget.destroyRecursive();
		}
});

dojo.declare("dijit.layout._AccordionButton",
	[dijit._Widget, dijit._Templated, dijit._CssStateMixin],
	{
	// summary:
	//		The title bar to click to open up an accordion pane.
	//		Internal widget used by AccordionContainer.
	// tags:
	//		private

	templateString: dojo.cache("dijit.layout", "templates/AccordionButton.html"),
	attributeMap: dojo.mixin(dojo.clone(dijit.layout.ContentPane.prototype.attributeMap), {
		label: {node: "titleTextNode", type: "innerHTML" },
		title: {node: "titleTextNode", type: "attribute", attribute: "title"},
		iconClass: { node: "iconNode", type: "class" }
	}),

	baseClass: "dijitAccordionTitle",

	getParent: function(){
		// summary:
		//		Returns the AccordionContainer parent.
		// tags:
		//		private
		return this.parent;
	},

	buildRendering: function(){
		this.inherited(arguments);
		var titleTextNodeId = this.id.replace(' ','_');
		dojo.attr(this.titleTextNode, "id", titleTextNodeId+"_title");
		dijit.setWaiState(this.focusNode, "labelledby", dojo.attr(this.titleTextNode, "id"));
		dojo.setSelectable(this.domNode, false);
	},

	getTitleHeight: function(){
		// summary:
		//		Returns the height of the title dom node.
		return dojo._getMarginSize(this.domNode).h;	// Integer
	},

	// TODO: maybe the parent should set these methods directly rather than forcing the code
	// into the button widget?
	_onTitleClick: function(){
		// summary:
		//		Callback when someone clicks my title.
		var parent = this.getParent();
			parent.selectChild(this.contentWidget, true);
			dijit.focus(this.focusNode);
	},

	_onTitleKeyPress: function(/*Event*/ evt){
		return this.getParent()._onKeyPress(evt, this.contentWidget);
	},

	_setSelectedAttr: function(/*Boolean*/ isSelected){
		this._set("selected", isSelected);
		dijit.setWaiState(this.focusNode, "expanded", isSelected);
		dijit.setWaiState(this.focusNode, "selected", isSelected);
		this.focusNode.setAttribute("tabIndex", isSelected ? "0" : "-1");
	}
});


return dijit.layout.AccordionContainer;
});
