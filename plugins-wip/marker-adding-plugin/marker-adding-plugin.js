/*
Notes on plugin development:
- really could do with content assist in require block "require('scri<Ctrl+Space>
- need that jsdoc box next to content assist to tell me about the APIs
- after type 'editorApi.addSaveTransform(<Ctrl+Space> I wanted help on the required parameters? Is this a parser recovery issue?
- help hover for addSaveTransform is horrendous, really not obvious what it wants from me.
- can't see a breadcrumb in sidepanel, annoying!
- docs for addSaveTransform, what does it mean if function doesn't return anything? blank text or unchanged text?
- is 'getCurrentEditor()' always going to reliably return the current editor in a save transform, the one that matches the text?
- how would I load an image resource for my styling?
- how do I also get called on load? (without unnecessary duplication)
*/

/**
 * Plugin sample: marker-adding-plugin
 * This plugin shows how to add new annotations to the text when a save occurs.
 *
 * Notes:
 * - annotations have a type name, expressed via a dotted notation.
 * - there is currently a simplistic lifecycle, the plugin is expected to be
 *   responsible for annotations of a type and when it calls to add new ones
 *   these will be replacing the existing ones.
 * - the styling is done via a few lines of css. For the case here the css is as follows, see styling.css:

	 // The styling for the text in the editor:
     .annotationRange.message {
	   background-image: url("data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAQAAAADCAYAAAC09K7GAAAAAXNSR0IArs4c6QAAAAZiS0dEAP8A/wD/oL2nkwAAAAlwSFlzAAALEwAACxMBAJqcGAAAAAd0SU1FB9sJFhQXEbhTg7YAAAAZdEVYdENvbW1lbnQAQ3JlYXRlZCB3aXRoIEdJTVBXgQ4XAAAAMklEQVQI12NkgIIvJ3QXMjAwdDN+OaEbysDA4MPAwNDNwMCwiOHLCd1zX07o6kBVGQEAKBANtobskNMAAAAASUVORK5CYII=");
	   background-color: blue;
     }
     // The styling for the right hand ruler 'blob'
     .annotationOverview.message {
       background-color: blue;
       border: 1px solid #000080;
     }
     // The styling for the left hand ruler
     .annotationHTML.message {
	   background-image: url("data:image/gif;base64,R0lGODlhEAAQANUAALClrLu1ubOpsKqdp6eapKufqMTAw7attLSrsrGnr62jq8C7v765vaebpb22vLmyuMbCxsnGycfEx8G+wcrIysTBxUltof//yf///v70jergpPvws+nWc/npqvrpqvrpq/raffffnvXVkfTVkvXUkd+9f+SiOemvV+uyXa2OX7mYZqeIXKuNX/ClO7KQYqiIXJ59Vp19VpFvTo9uTZBvTpNyUJNyUf///////wAAAAAAAAAAAAAAAAAAAAAAAAAAACH5BAEAADgALAAAAAAQABAAAAZ4QJxwSCwajS2aS1U6DlunzcagcuKgG4sn5HJiLZ2QiHbEbj6hEapVTKVYr3OItG5TIhVGLF0npigUEAsPAjV9Q24pEhMBCAoybEUmGRcrDgcAAzNGkxcYNzAJBQSbRJ0YqBc2DaVEHJ6pGTStRBqfGBcZILRWvThBADs=");
     }
 *
 */
define(function (require) {

	var editorApi = require('scripted/api/editor-extensions');
	
	var pathExp = new RegExp('.*\\.js$');
	
	// Register the new annotation type
	editorApi.registerAnnotationType('example.message');
	
	// Load the styling for our annotation
	editorApi.loadCss(require('text!./styling.css'));

	// Register a save transformer.
	// This will locate the names of fruits in the text and
	// mark them by adding annotations to the editor.
	editorApi.addSaveTransform(function (text, path, config) {
		// Only interested in .js files
		if (!pathExp.test(path)) {
			return;
		}
		var fruits = ['apple', 'banana', 'kiwi', 'orange'];
		var annotations=[];
		for (var f=0; f<fruits.length; f++) {
			var fruit = fruits[f];
			var index = text.indexOf(fruit);
			while (index!=-1) {
				annotations.push({
					type:'example.message',
					start:index,
					end:index+fruit.length,
					text:'Found '+fruit
				});
				index = text.indexOf(fruit,index+1);
			}
		}

		// This call replace remove any existing annotations of the types included
		// in the array and then add these new ones
		editorApi.replaceAnnotations(['example.message'],annotations);
	});

	console.log('Annotation adding sample plugin');

});
