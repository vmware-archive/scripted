define("dijit/_base/window", ["dojo", "dijit", "dojo/window"], function(dojo, dijit) {

dijit.getDocumentWindow = function(doc){
	return dojo.window.get(doc);
};


return dijit;
});
