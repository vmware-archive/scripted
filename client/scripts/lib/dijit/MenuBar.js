define("dijit/MenuBar", ["dojo", "dijit", "text!dijit/templates/MenuBar.html", "dijit/Menu"], function(dojo, dijit) {

dojo.declare("dijit.MenuBar", dijit._MenuBase, {
	// summary:
	//		A menu bar, listing menu choices horizontally, like the "File" menu in most desktop applications

	templateString: dojo.cache("dijit", "templates/MenuBar.html"),

	baseClass: "dijitMenuBar",

	// _isMenuBar: [protected] Boolean
	//		This is a MenuBar widget, not a (vertical) Menu widget.
	_isMenuBar: true,

	postCreate: function(){
		var k = dojo.keys, l = this.isLeftToRight();
		this.connectKeyNavHandlers(
			l ? [k.LEFT_ARROW] : [k.RIGHT_ARROW],
			l ? [k.RIGHT_ARROW] : [k.LEFT_ARROW]
		);

		// parameter to dijit.popup.open() about where to put popup (relative to this.domNode)
		this._orient = this.isLeftToRight() ? {BL: 'TL'} : {BR: 'TR'};
	},

	focusChild: function(item){
		// overload focusChild so that whenever the focus is moved to a new item,
		// check the previous focused whether it has its popup open, if so, after
		// focusing the new item, open its submenu immediately
		var prev_item = this.focusedChild,
			showpopup = prev_item && prev_item.popup && prev_item.popup.isShowingNow;
		this.inherited(arguments);
		if(showpopup && item.popup && !item.disabled){
			this._openPopup();		// TODO: on down arrow, _openPopup() is called here and in onItemClick()
		}
	},

	_onKeyPress: function(/*Event*/ evt){
		// summary:
		//		Handle keyboard based menu navigation.
		// tags:
		//		protected

		if(evt.ctrlKey || evt.altKey){ return; }

		switch(evt.charOrCode){
			case dojo.keys.DOWN_ARROW:
				this._moveToPopup(evt);
				dojo.stopEvent(evt);
		}
	},

	onItemClick: function(/*dijit._Widget*/ item, /*Event*/ evt){
		// summary:
		//		Handle clicks on an item. Cancels a dropdown if already open.
		// tags:
		//		private
		if(item.popup && item.popup.isShowingNow){
			item.popup.onCancel();
		}else{
			this.inherited(arguments);
		}
	}
});


return dijit.MenuBar;
});
