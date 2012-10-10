/*
	_testCommon.js - a simple module to be included in dijit test pages to allow
	for easy switching between the many many points of the test-matrix.

	in your test browser, provides a way to switch between available themes,
	and optionally enable RTL (right to left) mode, and/or dijit_a11y (high-
	constrast/image off emulation) ... probably not a genuine test for a11y.

	usage: on any dijit test_* page, press ctrl-f9 to popup links.

	there are currently (3 themes * 4 tests) * (10 variations of supported browsers)
	not including testing individual locale-strings

	you should NOT be using this in a production environment. include
	your css and set your classes manually. for test purposes only ...
*/

(function(){
	var d = dojo,
		dir = "",
		theme = false,
		testMode = null,
		defTheme = "claro",
		vars={};

	if(window.location.href.indexOf("?") > -1){
		var str = window.location.href.substr(window.location.href.indexOf("?")+1).split(/#/);
		var ary  = str[0].split(/&/);
		for(var i=0; i<ary.length; i++){
			var split = ary[i].split("="),
				key = split[0],
				value = (split[1]||'').replace(/[^\w]/g, "");	// replace() to prevent XSS attack
			switch(key){
				case "locale":
					// locale string | null
					dojo.locale = dojo.config.locale = locale = value;
					break;
				case "dir":
					// rtl | null
					document.getElementsByTagName("html")[0].dir = value;
					dir = value;
					break;
				case "theme":
					// tundra | soria | nihilo | claro | null
					theme = value;
					break;
				case "a11y":
					if(value){ testMode = "dijit_a11y"; }
			}
			vars[key] = value;
		}
	}
	d._getVar = function(k, def){
		return vars[k] || def;
	}

	// If URL specifies a non-claro theme then pull in those theme CSS files and modify
	// <body> to point to that new theme instead of claro.
	//
	// Also defer parsing and any dojo.addOnLoad() calls that the test file makes
	// until the CSS has finished loading.
	if(theme || testMode || dir){

		if(theme){
			var themeCss = d.moduleUrl("dijit.themes",theme+"/"+theme+".css");
			var themeCssRtl = d.moduleUrl("dijit.themes",theme+"/"+theme+"_rtl.css");
			document.write('<link rel="stylesheet" type="text/css" href="'+themeCss+'"/>');
			document.write('<link rel="stylesheet" type="text/css" href="'+themeCssRtl+'"/>');
		}

		if(dojo.config.parseOnLoad){
			dojo.config.parseOnLoad = false;
			dojo.config._deferParsing = true;
			
			// Capture any dojo.addOnLoad() calls the test makes and defer them until after
			// the new CSS loads.   (TODO: would be more straightforward to just make a
			// testAddOnLoad() function and call that from the test files)
			var originalOnLoad = dojo.addOnLoad,
				loadFuncs = [];
			dojo.addOnLoad = function(f){ loadFuncs.push(f); };
		}

		(originalOnLoad || dojo.addOnLoad)(function(){
			// Reset <body> to point to the specified theme
			var b = dojo.body();
			if(theme){
					dojo.removeClass(b, defTheme);
					if(!d.hasClass(b, theme)){ d.addClass(b, theme); }
					var n = d.byId("themeStyles");
					if(n){ d.destroy(n); }
			}
			if(testMode){ d.addClass(b, testMode); }

			// Claro has it's own reset css but for other themes using dojo/resources/dojo.css
			if(theme){
				dojo.query("style").forEach(function(node){
					if(/claro\/document.css/.test(node.innerHTML)){
						try{
							node.innerHTML = node.innerHTML.replace("themes/claro/document.css",
								"../dojo/resources/dojo.css");
						}catch(e){
							// fails on IE6-8 for some reason, works on IE9 and other browsers
						}
					}
				});
			}
			if(dir == "rtl"){
				// pretend all the labels are in an RTL language, because
				// that affects how they lay out relative to inline form widgets
				dojo.query("label").attr("dir", "rtl");
			}

			// Defer parsing and addOnLoad() execution until the specified CSS loads.
			if(dojo.config._deferParsing){
				setTimeout(function(){
					dojo.addOnLoad = originalOnLoad;
					dojo.parser.parse(b);
					for(var i=0; i<loadFuncs.length; i++){
						loadFuncs[i]();
					}
				}, 320);
			}

		});
	}

})();
