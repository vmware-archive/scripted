define("dijit/MenuBarItem", ["dojo", "dijit", "text!dijit/templates/MenuBarItem.html", "dijit/MenuItem"], function(dojo, dijit) {

dojo.declare("dijit._MenuBarItemMixin", null, {
	templateString: dojo.cache("dijit", "templates/MenuBarItem.html"),

	// overriding attributeMap because we don't have icon
	attributeMap: dojo.delegate(dijit._Widget.prototype.attributeMap, {
		label: { node: "containerNode", type: "innerHTML" }
	})
});

dojo.declare("dijit.MenuBarItem", [dijit.MenuItem, dijit._MenuBarItemMixin], {
	// summary:
	//		Item in a MenuBar that's clickable, and doesn't spawn a submenu when pressed (or hovered)

});


return dijit.MenuBarItem;
});
