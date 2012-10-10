// AMD module id = dijit
//
// This is a package main module for the dijit package. The dijit package is somewhat unusual
// in that is it currently constructed to just provide an empty object.
//

// for now, we publish dijit into the global namespace because so many tests and apps expect it.
define(["dojo"], function(dojo) {
	// the current dojo bootstrap defines dijit; this may change and this module provides a little
	// future-proof with the disjunction.
	dijit= dojo._dijit || {};
	return dijit;
});
 