/*******************************************************************************
 * @license
 * Copyright (c) 2012 VMware, Inc. All Rights Reserved.
 * THIS FILE IS PROVIDED UNDER THE TERMS OF THE ECLIPSE PUBLIC LICENSE
 * ("AGREEMENT"). ANY USE, REPRODUCTION OR DISTRIBUTION OF THIS FILE
 * CONSTITUTES RECIPIENTS ACCEPTANCE OF THE AGREEMENT.
 * You can obtain a current copy of the Eclipse Public License from
 * http://www.opensource.org/licenses/eclipse-1.0.php
 *
 * Contributors:
 *     Andrew Eisenberg (VMware) - initial API and implementation
 ******************************************************************************/

/*
This module defines the built in types for the scripted JS inferencer.
It also contains functions for manipulating internal type signatures.
*/

/*jslint es5:true browser:true*/
/*global define doctrine console */
define(["plugins/esprima/proposalUtils", "scriptedLogger", "doctrine/doctrine"],
function(proposalUtils, scriptedLogger/*, doctrine*/) {

	/**
	 * Doctrine closure compiler style type objects
	 */
	function ensureTypeObject(signature) {
		if (!signature) {
			return signature;
		}
		if (signature.type) {
			return signature;
		}
		try {
			return doctrine.parseParamType(signature);
		} catch(e) {
			console.error("doctrine failure to parse: " + signature);
			return {};
		}
	}


	function createNameType(name) {
	    if (typeof name !== 'string') {
	        throw new Error('Expected string, but found: ' + JSON.parse(name));
	    }
		return { type: 'NameExpression', name: name };
	}

	var THE_UNKNOWN_TYPE = createNameType("Object");

	var JUST_DOTS = '$$__JUST_DOTS__$$';
	var JUST_DOTS_REGEX = /\$\$__JUST_DOTS__\$\$/g;
	var UNDEFINED_OR_EMPTY_OBJ = /:undefined|:\{\}/g;


	/**
	 * The Definition class refers to the declaration of an identifier.
	 * The start and end are locations in the source code.
	 * Path is a URL corresponding to the document where the definition occurs.
	 * If range is undefined, then the definition refers to the entire document
	 * Range is a two element array with the start and end values
	 * (Exactly the same range field as is used in Esprima)
	 * If the document is undefined, then the definition is in the current document.
	 *
	 * @param String typeName
	 * @param {[Number]} range
	 * @param String path
	 */
	var Definition = function(typeObj, range, path) {
		this._typeObj = ensureTypeObject(typeObj);
		this.range = range;
		this.path = path;
	};

	Definition.prototype = {
		set typeObj(val) {
			var maybeObj = val;
			if (typeof maybeObj === 'string') {
				maybeObj = ensureTypeObject(maybeObj);
			}
			this._typeObj = maybeObj;
		},

		get typeObj() {
			return this._typeObj;
		}
	};

	/**
	 * Revivies a Definition object from a regular object
	 */
	Definition.revive = function(obj) {
		var defn = new Definition();
		for (var prop in obj) {
			if (obj.hasOwnProperty(prop)) {
				if (prop === 'typeSig') {
					defn.typeObj = obj[prop];
				} else {
					defn[prop] = obj[prop];
				}
			}
		}
		return defn;
	};

	// From ecma script manual 262 section 15
	// the global object when not in browser or node
	var Global = function() {};
	Global.prototype = {
		$$proto : new Definition("Object"),

		decodeURI : new Definition("function(uri:String):String"),
		encodeURI : new Definition("function(uri:String):String"),
		'eval' : new Definition("function(toEval:String):Object"),
		parseInt : new Definition("function(str:String,radix:Number=):Number"),
		parseFloat : new Definition("function(str:String,radix:Number=):Number"),
		Math: new Definition("Math"),
		JSON: new Definition("JSON"),
		Object: new Definition("function(new:Object,val:Object=):Object"),
		Function: new Definition("function(new:Function):Function"),
		Array: new Definition("function(new:Array,val:Array=):Array"),
		Boolean: new Definition("function(new:Boolean,val:Boolean=):Boolean"),
		Number: new Definition("function(new:Number,val:Number=):Number"),
		Date: new Definition("function(new:Date,val:Date=):Date"),
		RegExp: new Definition("function(new:RegExp,val:RegExp=):RegExp"),
		Error: new Definition("function(new:Error,err:Error=):Error"),
		'undefined' : new Definition("undefined"),
		isNaN : new Definition("function(num:Number):Boolean"),
		isFinite : new Definition("function(num:Number):Boolean"),
		"NaN" : new Definition("Number"),
		"Infinity" : new Definition("Number"),
		decodeURIComponent : new Definition("function(encodedURIString:String):String"),
		encodeURIComponent : new Definition("function(decodedURIString:String):String"),

		"this": new Definition("Global")
		// not included since not meant to be referenced directly
		// EvalError, RangeError, ReferenceError, SyntaxError, TypeError, URIError
	};

	// Node module
	var Module = function() {};
	Module.prototype = {

		// From Global
		decodeURI : new Definition("function(uri:String):String"),
		encodeURI : new Definition("function(uri:String):String"),
		'eval' : new Definition("function(toEval:String):Object"),
		parseInt : new Definition("function(str:String,radix:Number=):Number"),
		parseFloat : new Definition("function(str:String,radix:Number=):Number"),
		Math: new Definition("Math"),
		JSON: new Definition("JSON"),
		Object: new Definition("function(new:Object,val:Object=):Object"),
		Function: new Definition("function(new:Function):Function"),
		Array: new Definition("function(new:Array,val:Array=):Array"),
		Boolean: new Definition("function(new:Boolean,val:Boolean=):Boolean"),
		Number: new Definition("function(new:Number,val:Number=):Number"),
		Date: new Definition("function(new:Date,val:Date=):Date"),
		RegExp: new Definition("function(new:RegExp,val:RegExp=):RegExp"),
		Error: new Definition("function(new:Error,err:Error=):Error"),
		'undefined' : new Definition("undefined"),
		isNaN : new Definition("function(num:Number):Boolean"),
		isFinite : new Definition("function(num:Number):Boolean"),
		"NaN" : new Definition("Number"),
		"Infinity" : new Definition("Number"),
		decodeURIComponent : new Definition("function(encodedURIString:String):String"),
		encodeURIComponent : new Definition("function(decodedURIString:String):String"),

		"this": new Definition("Module"),
		Buffer: new Definition("Object"),
		console: new Definition("Object"),
		module: new Definition("Module"),
		process: new Definition("Process"),

		require: new Definition("function(module:String):Object"),
//		exports: new Definition("Object"),
		clearInterval: new Definition("function(t:Number)"),
		clearTimeout: new Definition("function(t:Number)"),
		setInterval: new Definition("function(callback:Function,ms:Number):Number"),
		setTimeout : new Definition("function(callback:Function,ms:Number):Number"),
		global: new Definition("Module"),
		querystring: new Definition("String"),
		__filename: new Definition("String"),
		__dirname: new Definition("String")
	};

	var Window = function() {};
	Window.prototype = {
		// copied from Global
		$$proto : new Definition("Object"),

		decodeURI : new Definition("function(uri:String):String"),
		encodeURI : new Definition("function(uri:String):String"),
		'eval' : new Definition("function(toEval:String):Object"),
		parseInt : new Definition("function(str:String,radix:Number=):Number"),
		parseFloat : new Definition("function(str:String,radix:Number=):Number"),
		Math: new Definition("Math"),
		JSON: new Definition("JSON"),
		Object: new Definition("function(new:Object,val:Object=):Object"),
		Function: new Definition("function(new:Function):Function"),
		Array: new Definition("function(new:Array,val:Array=):Array"),
		Boolean: new Definition("function(new:Boolean,val:Boolean=):Boolean"),
		Number: new Definition("function(new:Number,val:Number=):Number"),
		Date: new Definition("function(new:Date,val:Date=):Date"),
		RegExp: new Definition("function(new:RegExp,val:RegExp=):RegExp"),
		Error: new Definition("function(new:Error,err:Error=):Error"),
		'undefined' : new Definition("undefined"),
		isNaN : new Definition("function(num:Number):Boolean"),
		isFinite : new Definition("function(num:Number):Boolean"),
		"NaN" : new Definition("Number"),
		"Infinity" : new Definition("Number"),
		decodeURIComponent : new Definition("function(encodedURIString:String):String"),
		encodeURIComponent : new Definition("function(decodedURIString:String):String"),

		"this": new Definition("Window"),
		// see https://developer.mozilla.org/en/DOM/window
			// Properties
		applicationCache : new Definition("DOMApplicationCache"),
		closed : new Definition("Boolean"),
		console : new Definition("Console"),
		defaultStatus : new Definition("String"),
		document : new Definition("Document"),
		frameElement : new Definition("Element"),
		frames : new Definition("Array"),
		history : new Definition("History"),
		innerHeight : new Definition("Number"),
		innerWidth : new Definition("Number"),
		length : new Definition("Number"),
		location : new Definition("Location"),
		locationbar : new Definition("BarInfo"),
		localStorage : new Definition("Storage"),
		menubar : new Definition("BarInfo"),
		name : new Definition("String"),
		navigator : new Definition("Navigator"),
		opener : new Definition("Window"),
		outerHeight : new Definition("Number"),
		outerWidth : new Definition("Number"),
		pageXOffset : new Definition("Number"),
		pageYOffset : new Definition("Number"),
		parent : new Definition("Window"),
		performance : new Definition("Performance"),
		personalbar : new Definition("BarInfo"),
		screen : new Definition("Screen"),
		screenX : new Definition("Number"),
		screenY : new Definition("Number"),
		scrollbars : new Definition("BarInfo"),
		scrollMaxX : new Definition("Number"),
		scrollMaxY : new Definition("Number"),
		scrollX : new Definition("Number"),
		scrollY : new Definition("Number"),
		self : new Definition("Window"),
		sessionStorage : new Definition("Storage"),
		sidebar : new Definition("BarInfo"),
		status : new Definition("String"),
		statusbar : new Definition("BarInfo"),
		toolbar : new Definition("BarInfo"),
		top : new Definition("Window"),
		window : new Definition("Window"),

			// Methods
			// commented methods are mozilla-specific
		addEventListener : new Definition("function()"),
		alert : new Definition("function(msg:String)"),
		atob : new Definition("function(val:Object):String"),
		back : new Definition("function()"),
		blur : new Definition("function()"),
		btoa : new Definition("function(val:Object):String"),
		clearInterval: new Definition("function(t:Number)"),
		clearTimeout: new Definition("function(t:Number)"),
		close : new Definition("function()"),
		confirm : new Definition("function(msg:String):Boolean"),
		dispatchEvent : new Definition("function(domnode:Node)"),
		dump : new Definition("function(msg:String)"),
		escape : new Definition("function(str:String):String"),
		find : new Definition("function(str:String):Boolean"),
		focus : new Definition("function()"),
		forward : new Definition("function()"),
		getAttention : new Definition("function()"),
		getComputedStyle : new Definition("function(domnode:Node):CSSStyleDeclaration"),
		getSelection : new Definition("function():Selection"),
		home : new Definition("function()"),
		matchMedia : new Definition("function(query:Object):MediaQueryList"),
		moveBy : new Definition("function(deltaX:Number,deltaY:Number)"),
		moveTo : new Definition("function(x:Number,y:Number)"),
		open : new Definition("function(strUrl:String,strWindowName:String,strWindowFeatures:String=):Window"),
		openDialog : new Definition("function(strUrl:String,strWindowName:String,strWindowFeatures:String,args:String=):Window"),
		postMessage : new Definition("function(message:String,targetOrigin:String)"),
		print : new Definition("function()"),
		prompt : new Definition("function(message:String):String"),
		removeEventListener : new Definition("function(type:String,listener:Object,useCapture:Boolean=)"),
		resizeBy : new Definition("function(deltaX:Number,deltaY:Number)"),
		resizeTo : new Definition("function(x:Number,y:Number)"),
		scroll : new Definition("function(x:Number,y:Number)"),
		scrollBy : new Definition("function(deltaX:Number,deltaY:Number)"),
		scrollByLines : new Definition("function(lines:Number)"),
		scrollByPages : new Definition("function(pages:Number)"),
		scrollTo : new Definition("function(x:Number,y:Number)"),
		setCursor : new Definition("function(cursor)"),
		setInterval: new Definition("function(callback:Function,ms:Number):Number"),
		setTimeout : new Definition("function(callback:Function,ms:Number):Number"),
		sizeToContent : new Definition("function()"),
		stop : new Definition("function()"),
		unescape : new Definition("function(str:String):String"),
		updateCommands : new Definition("function(cmdName:String)"),

			// Events
		onabort : new Definition("function(event:Event)"),
		onbeforeunload : new Definition("function(event:Event)"),
		onblur : new Definition("function(event:Event)"),
		onchange : new Definition("function(event:Event)"),
		onclick : new Definition("function(event:Event)"),
		onclose : new Definition("function(event:Event)"),
		oncontextmenu : new Definition("function(event:Event)"),
		ondevicemotion : new Definition("function(event:Event)"),
		ondeviceorientation : new Definition("function(event:Event)"),
		ondragdrop : new Definition("function(event:Event)"),
		onerror : new Definition("function(event:Event)"),
		onfocus : new Definition("function(event:Event)"),
		onhashchange : new Definition("function(event:Event)"),
		onkeydown : new Definition("function(event:Event)"),
		onkeypress : new Definition("function(event:Event)"),
		onkeyup : new Definition("function(event:Event)"),
		onload : new Definition("function(event:Event)"),
		onmousedown : new Definition("function(event:Event)"),
		onmousemove : new Definition("function(event:Event)"),
		onmouseout : new Definition("function(event:Event)"),
		onmouseover : new Definition("function(event:Event)"),
		onmouseup : new Definition("function(event:Event)"),
		onpaint : new Definition("function(event:Event)"),
		onpopstate : new Definition("function(event:Event)"),
		onreset : new Definition("function(event:Event)"),
		onresize : new Definition("function(event:Event)"),
		onscroll : new Definition("function(event:Event)"),
		onselect : new Definition("function(event:Event)"),
		onsubmit : new Definition("function(event:Event)"),
		onunload : new Definition("function(event:Event)"),
		onpageshow : new Definition("function(event:Event)"),
		onpagehide : new Definition("function(event:Event)"),

			// Constructors
		Image : new Definition("function(new:HTMLImageElement,width:Number=,height:Number=):HTMLImageElement"),
		Option : new Definition("function(new:HTMLOptionElement,text:String=,value:Object=,defaultSelected:Boolean=,selected:Boolean=):HTMLOptionElement"),
		Worker : new Definition("function(new:Worker,url:String):Worker"),
		XMLHttpRequest : new Definition("function(new:XMLHttpRequest):XMLHttpRequest"),
		WebSocket : new Definition("function(new:WebSocket,url,protocols):WebSocket"),
		Event : new Definition("function(new:Event,type:String):Event"),
		Node : new Definition("function(new:Node):Node")
	};

	var initialGlobalProperties = {};
	Object.keys(Global.prototype).forEach(function(key) {
		initialGlobalProperties[key] = true;
	});
	Object.keys(Window.prototype).forEach(function(key) {
		initialGlobalProperties[key] = true;
	});
	Object.keys(Module.prototype).forEach(function(key) {
		initialGlobalProperties[key] = true;
	});


	/**
	 * A prototype that contains the common built-in types
	 */
	var Types = function(globalObjName) {
		var globObj;
		// this object can be touched by clients
		// and so must not be in the prototype
		// the global 'this'
		if (globalObjName === 'Window') {
			globObj = this.Window = new Window();
		} else if (globalObjName === 'Module') {
			globObj = this.Module = new Module();
		} else {
			globObj = this.Global = new Global();
		}

		this.clearDefaultGlobal = function() {
			Object.keys(initialGlobalProperties).forEach(function(key) {
				delete globObj[key];
			});
		};

	};


	/**
	 * Populate the Types object with built-in types.  These are not meant to be changed through the inferencing process
	 * This uses the built in types as defined in the ECMA script reference manual 262.  Available at
	 * http://www.ecma-international.org/publications/files/ECMA-ST/Ecma-262.pdf section 15.
	 */
	Types.prototype = {

		/**
		 * See 15.2.4 Properties of the Object Prototype Object
		 */
		Object : {
			$$isBuiltin: true,
			// Can't use the real propoerty name here because would override the real methods of that name
			$_$prototype : new Definition("Object"),
			$_$toString: new Definition("function():String"),
			$_$toLocaleString : new Definition("function():String"),
			$_$valueOf: new Definition("function():Object"),
			$_$hasOwnProperty: new Definition("function(property:String):Boolean"),
			$_$isPrototypeOf: new Definition("function(object:Object):Boolean"),
			$_$propertyIsEnumerable: new Definition("function(property:String):Boolean")
		},

		/**
		 * See 15.3.4 Properties of the Function Prototype Object
		 */
		Function : {
			$$isBuiltin: true,
			apply : new Definition("function(func:function(),argArray:Array=):Object"),
			"arguments" : new Definition("Arguments"),
			bind : new Definition("function(func:function(),...args:Object):Object"),
			call : new Definition("function(func:function(),...args:Object):Object"),
			caller : new Definition("Function"),
			length : new Definition("Number"),
			name : new Definition("String"),
			$$proto : new Definition("Object")
		},

		/**
		 * See 15.4.4 Properties of the Array Prototype Object
		 */
		Array : {
			$$isBuiltin: true,

			concat : new Definition("function(first:Array,...rest:Array):Array"),
			join : new Definition("function(separator:Object):String"),
			length : new Definition("Number"),
			pop : new Definition("function():Object"),
			push : new Definition("function(...vals:Object):Object"),
			reverse : new Definition("function():Array"),
			shift : new Definition("function():Object"),
			slice : new Definition("function(start:Number,deleteCount:Number,...items:Object):Array"),
			splice : new Definition("function(start:Number,end:Number):Array"),
			sort : new Definition("function(sorter:Object=):Array"),
			unshift : new Definition("function(...items:Object):Number"),
			indexOf : new Definition("function(searchElement,fromIndex=):Number"),
			lastIndexOf : new Definition("function(searchElement,fromIndex=):Number"),
			every : new Definition("function(callbackFn:function(elt:Object),thisArg:Object=):Boolean"),
			some : new Definition("function(callbackFn:function(elt:Object),thisArg:Object=):Boolean"),
			forEach : new Definition("function(callbackFn:function(elt:Object),thisArg:Object=):Object"),
			map : new Definition("function(callbackFn:function(elt:Object):Object,thisArg:Object=):Array"),
			filter : new Definition("function(callbackFn:function(elt:Object):Boolean,thisArg:Object=):Array"),
			reduce : new Definition("function(callbackFn:function(elt:Object):Object,initialValue:Object=):Array"),
			reduceRight : new Definition("function(callbackFn:function(elt:Object):Object,initialValue:Object=):Array"),
			$$proto : new Definition("Object")
		},

		/**
		 * See 15.5.4 Properties of the String Prototype Object
		 */
		String : {
			$$isBuiltin: true,
			charAt : new Definition("function(index:Number):String"),
			charCodeAt : new Definition("function(index:Number):Number"),
			concat : new Definition("function(str:String):String"),
			indexOf : new Definition("function(searchString:String,start:Number=):Number"),
			lastIndexOf : new Definition("function(searchString:String,start:Number=):Number"),
			length : new Definition("Number"),
			localeCompare : new Definition("function(str:String):Number"),
			match : new Definition("function(regexp:(String|RegExp)):Boolean"),
			replace : new Definition("function(searchValue:(String|RegExp),replaceValue:String):String"),
			search : new Definition("function(regexp:(String|RegExp)):String"),
			slice : new Definition("function(start:Number,end:Number):String"),
			split : new Definition("function(separator:String,limit:Number=):[String]"),  // Array of string
			substring : new Definition("function(start:Number,end:Number=):String"),
			toLocaleUpperCase : new Definition("function():String"),
			toLowerCase : new Definition("function():String"),
			toLocaleLowerCase : new Definition("function():String"),
			toUpperCase : new Definition("function():String"),
			trim : new Definition("function():String"),

			$$proto : new Definition("Object")
		},

		/**
		 * See 15.6.4 Properties of the Boolean Prototype Object
		 */
		Boolean : {
			$$isBuiltin: true,
			$$proto : new Definition("Object")
		},

		/**
		 * See 15.7.4 Properties of the Number Prototype Object
		 */
		Number : {
			$$isBuiltin: true,
			toExponential : new Definition("function(digits:Number):String"),
			toFixed : new Definition("function(digits:Number):String"),
			toPrecision : new Definition("function(digits:Number):String"),
			// do we want to include NaN, MAX_VALUE, etc?

			$$proto : new Definition("Object")
		},

		/**
		 * See 15.8.1 15.8.2 Properties and functions of the Math Object
		 * Note that this object is not used as a prototype to define other objects
		 */
		Math : {
			$$isBuiltin: true,

			// properties
			E : new Definition("Number"),
			LN2 : new Definition("Number"),
			LN10 : new Definition("Number"),
			LOG2E : new Definition("Number"),
			LOG10E : new Definition("Number"),
			PI : new Definition("Number"),
			SQRT1_2 : new Definition("Number"),
			SQRT2 : new Definition("Number"),

			// Methods
			abs : new Definition("function(val:Number):Number"),
			acos : new Definition("function(val:Number):Number"),
			asin : new Definition("function(val:Number):Number"),
			atan : new Definition("function(val:Number):Number"),
			atan2 : new Definition("function(val1:Number,val2:Number):Number1"),
			ceil : new Definition("function(val:Number):Number"),
			cos : new Definition("function(val:Number):Number"),
			exp : new Definition("function(val:Number):Number"),
			floor : new Definition("function(val:Number):Number"),
			log : new Definition("function(val:Number):Number"),
			max : new Definition("function(val1:Number,val2:Number):Number"),
			min : new Definition("function(val1:Number,val2:Number):Number"),
			pow : new Definition("function(x:Number,y:Number):Number"),
			random : new Definition("function():Number"),
			round : new Definition("function(val:Number):Number"),
			sin : new Definition("function(val:Number):Number"),
			sqrt : new Definition("function(val:Number):Number"),
			tan : new Definition("function(val:Number):Number"),
			$$proto : new Definition("Object")
		},


		/**
		 * See 15.9.5 Properties of the Date Prototype Object
		 */
		Date : {
			$$isBuiltin: true,
			toDateString : new Definition("function():String"),
			toTimeString : new Definition("function():String"),
			toUTCString : new Definition("function():String"),
			toISOString : new Definition("function():String"),
			toJSON : new Definition("function(key:String):Object"),
			toLocaleDateString : new Definition("function():String"),
			toLocaleTimeString : new Definition("function():String"),

			getTime : new Definition("function():Number"),
			getTimezoneOffset : new Definition("function():Number"),

			getDay : new Definition("function():Number"),
			getUTCDay : new Definition("function():Number"),
			getFullYear : new Definition("function():Number"),
			getUTCFullYear : new Definition("function():Number"),
			getHours : new Definition("function():Number"),
			getUTCHours : new Definition("function():Number"),
			getMinutes : new Definition("function():Number"),
			getUTCMinutes : new Definition("function():Number"),
			getSeconds : new Definition("function():Number"),
			getUTCSeconds : new Definition("function():Number"),
			getMilliseconds : new Definition("function():Number"),
			getUTCMilliseconds : new Definition("function():Number"),
			getMonth : new Definition("function():Number"),
			getUTCMonth : new Definition("function():Number"),
			getDate : new Definition("function():Number"),
			getUTCDate : new Definition("function():Number"),

			setTime : new Definition("function():Number"),
			setTimezoneOffset : new Definition("function():Number"),

			setDay : new Definition("function(dayOfWeek:Number):Number"),
			setUTCDay : new Definition("function(dayOfWeek:Number):Number"),
			setFullYear : new Definition("function(year:Number,month:Number=,date:Number=):Number"),
			setUTCFullYear : new Definition("function(year:Number,month:Number=,date:Number=):Number"),
			setHours : new Definition("function(hour:Number,min:Number=,sec:Number=,ms:Number=):Number"),
			setUTCHours : new Definition("function(hour:Number,min:Number=,sec:Number=,ms:Number=):Number"),
			setMinutes : new Definition("function(min:Number,sec:Number=,ms:Number=):Number"),
			setUTCMinutes : new Definition("function(min:Number,sec:Number=,ms:Number=):Number"),
			setSeconds : new Definition("function(sec:Number,ms:Number=):Number"),
			setUTCSeconds : new Definition("function(sec:Number,ms:Number=):Number"),
			setMilliseconds : new Definition("function(ms:Number):Number"),
			setUTCMilliseconds : new Definition("function(ms:Number):Number"),
			setMonth : new Definition("function(month:Number,date:Number=):Number"),
			setUTCMonth : new Definition("function(month:Number,date:Number=):Number"),
			setDate : new Definition("function(date:Number):Number"),
			setUTCDate : new Definition("function(date:Number):Number"),

			$$proto : new Definition("Object")
		},

		/**
		 * See 15.10.6 Properties of the RexExp Prototype Object
		 */
		RegExp : {
			$$isBuiltin: true,
//			g : new Definition("Object"),
//			i : new Definition("Object"),
//			gi : new Definition("Object"),
//			m : new Definition("Object"),
			source : new Definition("String"),
			global : new Definition("Boolean"),
			ignoreCase : new Definition("Boolean"),
			multiline : new Definition("Boolean"),
			lastIndex : new Definition("Boolean"),

			exec : new Definition("function(str:String):[String]"),
			test : new Definition("function(str:String):Boolean"),

			$$proto : new Definition("Object")
		},

		"function(new:RegExp):RegExp" : {
			$$isBuiltin: true,
			$$proto : new Definition("Function"),

			$1 : new Definition("String"),
			$2 : new Definition("String"),
			$3 : new Definition("String"),
			$4 : new Definition("String"),
			$5 : new Definition("String"),
			$6 : new Definition("String"),
			$7 : new Definition("String"),
			$8 : new Definition("String"),
			$9 : new Definition("String"),
			$_ : new Definition("String"),
			$input : new Definition("String"),
			input : new Definition("String"),
			name : new Definition("String")
		},


		/**
		 * See 15.11.4 Properties of the Error Prototype Object
		 * We don't distinguish between kinds of errors
		 */
		Error : {
			$$isBuiltin: true,
			name : new Definition("String"),
			message : new Definition("String"),
			stack : new Definition("String"),
			$$proto : new Definition("Object")
		},

		/**
		 * See 10.6 Arguments Object
		 */
		Arguments : {
			$$isBuiltin: true,
			callee : new Definition("Function"),
			length : new Definition("Number"),

			$$proto : new Definition("Object")
		},

		/**
		 * See 15.12.2 and 15.12.3 Properties of the JSON Object
		 */
		JSON : {
			$$isBuiltin: true,

			parse : new Definition("function(str:String):Object"),
			stringify : new Definition("function(json:Object):String"),
			$$proto : new Definition("Object")
		},

		"undefined" : {
			$$isBuiltin: true
		},


		///////////////////////////////////////////////////
		// Node specific types
		///////////////////////////////////////////////////
		// See http://nodejs.org/api/process.html
		Process : {
			$$isBuiltin: true,
			$$proto : new Definition("Object"),

			on: new Definition("function(kind:String,callback:function())"),

			abort: new Definition("function()"),
			stdout: new Definition("Stream"),
			stderr: new Definition("Stream"),
			stdin: new Definition("Stream"),
			argv: new Definition("Array"), // Array.<String>
			execPath: new Definition("String"),
			chdir: new Definition("function(directory:String)"),
			cwd: new Definition("function():String"),
			env: new Definition("Object"),
			getgid: new Definition("function():Number"),
			setgid: new Definition("function(id:Number)"),
			getuid: new Definition("function():Number"),
			setuid: new Definition("function(id:Number)"),
			version: new Definition("String"),
			versions: new Definition("Object"), // TODO create a versions object?
			config: new Definition("Object"),
			kill: new Definition("function(pid:Number,signal:Number=)"),
			pid: new Definition("Number"),
			title: new Definition("String"),
			arch: new Definition("String"),
			platform: new Definition("String"),
			memoryUsage: new Definition("function():Object"),
			nextTick: new Definition("function(callback:function())"),
			umask: new Definition("function(mask:Number=)"),
			uptime: new Definition("function():Number"),
			hrtime: new Definition("function():Array") // Array.<Number>
		},

		// See http://nodejs.org/api/stream.html
		// Stream is a wierd one since it is built into the stream module,
		// but this module isn't always around, so must explicitly define it.
		Stream : {
			$$isBuiltin: true,
			$$proto : new Definition("Object"),
			// combines readable and writable streams

			// readable

			// events
			data: new Definition("function(data:Object)"),
			error: new Definition("function(exception:Object)"),
			close: new Definition("function()"),

			readable: new Definition("Boolean"),

			setEncoding: new Definition("function(encoding:String=)"),
			pause: new Definition("function()"),
			resume: new Definition("function()"),
			pipe: new Definition("function(destination:Object,options:Object=)"),

			// writable
			drain: new Definition("function()"),

			writable: new Definition("Boolean"),

			write: new Definition("function(buffer:Object=)"),
			end: new Definition("function(string:String=,encoding:String=)"),
			destroy: new Definition("function()"),
			destroySoon: new Definition("function()")
		},

		///////////////////////////////////////////////////
		// Browser specific types
		///////////////////////////////////////////////////

		// https://developer.mozilla.org/en/DOM/window.screen
		Screen : {
			$$isBuiltin: true,
			$$proto : new Definition("Object"),

			availTop : new Definition("Number"),
			availLeft : new Definition("Number"),
			availHeight : new Definition("Number"),
			availWidth : new Definition("Number"),
			colorDepth : new Definition("Number"),
			height : new Definition("Number"),
			left : new Definition("Number"),
			pixelDepth : new Definition("Number"),
			top : new Definition("Number"),
			width : new Definition("Number")
		},


		// https://developer.mozilla.org/en-US/docs/DOM/window.locationbar
		BarInfo : {
			$$isBuiltin: true,
			$$proto : new Definition("Object"),

			visible : new Definition("Boolean")
		},

		// http://w3c-test.org/webperf/specs/NavigationTiming/
		// incomplete
		Performance : {
			$$isBuiltin: true,
			$$proto : new Definition("Object")
		},

		// https://developer.mozilla.org/en/DOM/window.navigator
		Navigator : {
			$$isBuiltin: true,
			$$proto : new Definition("Object"),

			// properties
			appName : new Definition("String"),
			appVersion : new Definition("String"),
			connection : new Definition("Connection"),
			cookieEnabled : new Definition("Boolean"),
			language : new Definition("String"),
			mimeTypes : new Definition("MimeTypeArray"),
			onLine : new Definition("Boolean"),
			oscpu : new Definition("String"),
			platform : new Definition("String"),
			plugins : new Definition("String"),
			userAgent : new Definition("String"),

			// methods
			javaEnabled : new Definition("function():Boolean"),
			registerContentHandler : new Definition("function(mimType:String,url:String,title:String)"),
			registerProtocolHandler : new Definition("function(protocol:String,url:String,title:String)")
		},

		// (not in MDN) http://www.coursevector.com/dommanual/dom/objects/MimeTypeArray.html
		MimeTypeArray : {
			$$isBuiltin: true,
			length : new Definition("Number"),
			item : new Definition("function(index:Number):MimeType"),
			namedItem : new Definition("function(name:String):MimeType")
		},

		// (not in MDN) http://www.coursevector.com/dommanual/dom/objects/MimeType.html
		MimeType : {
			$$isBuiltin: true,
			description : new Definition("String"),
			suffixes : new Definition("String"),
			type : new Definition("String"),
			enabledPlugin : new Definition("Plugin")
		},

		// (not in MDN) http://www.coursevector.com/dommanual/dom/objects/Plugin.html
		Plugin : {
			$$isBuiltin: true,
			description : new Definition("String"),
			fileName : new Definition("String"),
			length : new Definition("Number"),
			name : new Definition("String"),
			item : new Definition("function(index:Number):MimeType"),
			namedItem : new Definition("function(name:String):MimeType")
		},

		// http://dvcs.w3.org/hg/dap/raw-file/tip/network-api/Overview.html#the-connection-interface
		Connection : {
			$$isBuiltin: true,
			bandwidth : new Definition("Number"),
			metered : new Definition("Boolean"),

			onchange : new Definition("Function")
		},

		// http://dev.w3.org/html5/webstorage/#storage-0
		Storage : {
			$$isBuiltin: true,
			$$proto : new Definition("Object"),

			length : new Definition("Number"),

			key : new Definition("function(idx:Number):String"),
			getItem : new Definition("function(key:String):String"),
			setItem : new Definition("function(key:String,value:String)"),
			removeItem : new Definition("function(key:String)"),
			clear : new Definition("function()")
		},

		// http://dvcs.w3.org/hg/xhr/raw-file/tip/Overview.html#interface-xmlhttprequest
		XMLHttpRequest : {
			$$isBuiltin: true,
			$$proto : new Definition("Object"),

			onreadystatechange : new Definition("EventHandler"),

			// request
			open : new Definition("function(method:String,url:String,async:Boolean=,user:String=,password:String=)"),
			setRequestHeader : new Definition("function(header,value)"),
			timeout : new Definition("Number"),
			withCredentials : new Definition("Boolean"),
			upload : new Definition("Object"), // not right
			send : new Definition("function(data:String=)"),
			abort : new Definition("function()"),

			// response
			getResponseHeader : new Definition("function(header:String):String"),
			getAllResponseHeaders : new Definition("function():String"),
			overrideMimType : new Definition("Object"),
			responseType : new Definition("Object"),  // not right
			readyState : new Definition("Number"),
			response : new Definition("Object"),
			responseText : new Definition("String"),
			responseXML : new Definition("Document"),
			status : new Definition("Number"),
			statusText : new Definition("String")
		},

		// http://www.w3.org/TR/workers/
		Worker : {
			$$isBuiltin: true,
			$$proto : new Definition("Object"),

			terminate : new Definition("function()"),
			postMessage : new Definition("function(message:String,transfer:Object=)"),
			onmessage : new Definition("function()")
		},

		// http://www.w3.org/TR/workers/#messageport
		MessagePort : {
			$$isBuiltin: true,
			$$proto : new Definition("Object")
		},

		// http://www.whatwg.org/specs/web-apps/current-work/multipage//network.html#websocket
		WebSocket : {
			$$isBuiltin: true,
			$$proto : new Definition("Object"),

			onreadystatechange : new Definition("EventHandler"),
			onopen : new Definition("EventHandler"),
			onerror : new Definition("EventHandler"),
			onclose : new Definition("EventHandler"),

			readyState : new Definition("Number"),
			extensions : new Definition("String"),
			protocol : new Definition("String"),

			close : new Definition("function(reason:Object=)"),
			send :  new Definition("function(data)")
		},

		// https://developer.mozilla.org/en/DOM/Console
		Console : {
			$$isBuiltin: true,
			debug : new Definition("function(msg:String)"),
			dir : new Definition("function(obj)"),
			error : new Definition("function(msg:String)"),
			group : new Definition("function()"),
			groupCollapsed : new Definition("function()"),
			groupEnd : new Definition("function()"),
			info : new Definition("function(msg:String)"),
			log : new Definition("function(msg:String)"),
			time : new Definition("function(timerName:String)"),
			timeEnd : new Definition("function(timerName:String)"),
			trace : new Definition("function()"),
			warn : new Definition("function(msg:String)")
		},

		// TODO FIXADE remove ???
		// http://www.whatwg.org/specs/web-apps/current-work/multipage/webappapis.html#eventhandler
		EventHandler : {
			$$isBuiltin: true,
			$$proto : new Definition("Object")
		},

		// https://developer.mozilla.org/en/DOM/Event
		Event : {
			$$isBuiltin: true,
			$$proto : new Definition("Object"),

			// properties
			bubbles : new Definition("Boolean"),
			cancelable : new Definition("Boolean"),
			currentTarget : new Definition("Object"),
			defaultPrevented : new Definition("Boolean"),
			eventPhase : new Definition("Number"),  // Add constants
			explicitOriginalTarget : new Definition("Object"),
			originalTarget : new Definition("Object"),
			target : new Definition("Object"),
			timeStamp : new Definition("Number"),
			isTrusted : new Definition("Boolean"),

			// methods
			initEvent : new Definition("function(type:String,bubbles:Boolean,cancelable:Boolean)"),
			preventDefault : new Definition("function()"),
			stopImmediatePropagation : new Definition("function()"),
			stopPropagation : new Definition("function()")
		},

		"function(new:Event):Event" : {
			$$isBuiltin: true,
			$$proto : new Definition("Function"),

			CAPTURING_PHASE : new Definition("Number"),
			AT_TARGET : new Definition("Number"),
			BUBBLING_PHASE : new Definition("Number")
		},

		// see http://www.w3.org/TR/dom/#documenttype
		DocumentType : {
			$$isBuiltin: true,
			$$proto : new Definition("Node"),

			name : new Definition("String"),
			publicId : new Definition("String"),
			systemId : new Definition("String"),

			before : new Definition("function(nodeOrString:(Node|String))"),
			after : new Definition("function(nodeOrString:(Node|String))"),
			replace : new Definition("function(nodeOrString:(Node|String))"),
			remove : new Definition("function()")
		},

		// see http://www.whatwg.org/specs/web-apps/current-work/multipage/history.html#the-history-interface
		History : {
			$$isBuiltin: true,
			$$proto : new Definition("Object"),

			length : new Definition("Number"),
			state : new Definition("Object"),

			go : new Definition("function(delta:Number)"),
			back : new Definition("function()"),
			forward : new Definition("function()"),
			pushState : new Definition("function(data:Object,title:String,url:String)"),
			replaceState : new Definition("function(data:Object,title:String,url:String)")
		},

		// see http://www.w3.org/TR/dom/#document (complete)
		// see http://www.w3.org/TR/html5/dom.html#documents-in-the-dom (incomplete)
		Document : {
			$$isBuiltin: true,
			$$proto : new Definition("Node"),

			implementation : new Definition("DOMImplementation"),
			URL : new Definition("String"),
			documentURI : new Definition("String"),
			compatMode : new Definition("String"),
			characterSet : new Definition("String"),
			contentType : new Definition("String"),

			doctype : new Definition("DocumentType"),
			documentElement : new Definition("Element"),

			getElementsByTagName : new Definition("function(localName:String):HTMLCollection"),
			getElementsByTagNameNS : new Definition("function(namespace,localName:String):HTMLCollection"),
			getElementsByClassName : new Definition("function(classNames:String):HTMLCollection"),
			getElementById : new Definition("function(elementId:String):Element"),
			createElement : new Definition("function(elementId:String):Element"),
			createElementNS : new Definition("function(namespace,qualifiedName:String):Element"),
			createDocumentFragment : new Definition("function():DocumentFragment"),
			createTextNode : new Definition("function(data):Text"),
			createComment : new Definition("function(data):Comment"),
			createProcessingInstruction : new Definition("function(target,data):ProcessingInstruction"),
			importNode : new Definition("function(node:Node,deep:Boolean=):Node"),
			adoptNode : new Definition("function(node:Node):Node"),
			createEvent : new Definition("function(eventInterfaceName:String):Event"),
			createRange : new Definition("function():Range"),

			createNodeIterator : new Definition("function(root:Node,whatToShow:Object=,filter:Object=):NodeIterator"),
			createTreeWalker : new Definition("function(root:Node,whatToShow:Object=,filter:Object=):TreeWalker")
		},

		// see http://www.w3.org/TR/dom/#domimplementation
		DOMImplementation : {
			$$isBuiltin: true,
			$$proto : new Definition("Object"),

			createDocumentType : new Definition("function(qualifiedName:String,publicId:String,systemId:String):DocumentType"),
			createDocument : new Definition("function(namespace:String,qualifiedName:String,doctype:String):Document"),
			createHTMLDocument : new Definition("function(title:String):Document"),
			hasFeature : new Definition("function(feature:String):Boolean")
		},

		// see http://www.w3.org/TR/dom/#node
		Node : {
			$$isBuiltin: true,
			$$proto : new Definition("Object"),

			nodeType : new Definition("Number"),
			nodeName : new Definition("String"),
			baseURI : new Definition("String"),
			ownerDocument : new Definition("Document"),
			parentNode : new Definition("Node"),
			parentElement : new Definition("Element"),
			childNodes : new Definition("NodeList"),
			firstChild : new Definition("Node"),
			lastChild : new Definition("Node"),
			previousSibling : new Definition("Node"),
			nextSibling : new Definition("Node"),
			nodeValue : new Definition("String"),
			textContent : new Definition("String"),

			hasChildNodes : new Definition("function():Boolean"),
			compareDocumentPosition : new Definition("function(other:Node):Number"),
			contains : new Definition("function(other:Node):Boolean"),
			insertBefore : new Definition("function(child:Node):Node"),
			appendChild : new Definition("function(node:Node):Node"),
			replaceChild : new Definition("function(child:Node):Node"),
			removeChild : new Definition("function(child:Node):Node"),
			normalize : new Definition("function()"),
			cloneNode : new Definition("function(deep:Boolean=):Node"),
			isEqualNode : new Definition("function(node:Node):Boolean"),
			lookupPrefix : new Definition("function(namespace:String):String"),
			lookupNamespaceURI : new Definition("function(prefix:String):String"),
			isDefaultNamespace : new Definition("function(namespace:String):Boolean")
		},

		// Constants declared on Node
		"function(new:Node):Node" : {
			$$isBuiltin: true,
			$$proto : new Definition("Function"),
			ELEMENT_NODE : new Definition("Number"),
			ATTRIBUTE_NODE : new Definition("Number"),
			TEXT_NODE : new Definition("Number"),
			CDATA_SECTION_NODE : new Definition("Number"),
			ENTITY_REFERENCE_NODE : new Definition("Number"),
			ENTITY_NODE : new Definition("Number"),
			PROCESSING_INSTRUCTION_NODE : new Definition("Number"),
			COMMENT_NODE : new Definition("Number"),
			DOCUMENT_NODE : new Definition("Number"),
			DOCUMENT_TYPE_NODE : new Definition("Number"),
			DOCUMENT_FRAGMENT_NODE : new Definition("Number"),
			NOTATION_NODE : new Definition("Number"),

			DOCUMENT_POSITION_DISCONNECTED : new Definition("Number"),
			DOCUMENT_POSITION_PRECEDING : new Definition("Number"),
			DOCUMENT_POSITION_FOLLOWING : new Definition("Number"),
			DOCUMENT_POSITION_CONTAINS : new Definition("Number"),
			DOCUMENT_POSITION_CONTAINED_BY : new Definition("Number"),
			DOCUMENT_POSITION_IMPLEMENTATION_SPECIFIC : new Definition("Number")
		},

		// see http://www.w3.org/TR/dom/#element
		Element : {
			$$isBuiltin: true,
			$$proto : new Definition("Node"),

			namespaceURI : new Definition("String"),
			prefix : new Definition("String"),
			localName : new Definition("String"),
			tagName : new Definition("String"),

			id : new Definition("String"),
			className : new Definition("String"),

			classList : new Definition("DOMTokenList"),

			attributes : new Definition("Array"), // of attributes

			childElementCount : new Definition("Number"),

			children : new Definition("HTMLCollection"),
			firstElementChild : new Definition("Element"),
			lastElementChild : new Definition("Element"),
			previousElementSibling : new Definition("Element"),
			nextElementSibling : new Definition("Element"),

			getAttribute : new Definition("function(name:String):String"),
			getAttributeNS : new Definition("function(namespace:String,localname:String):String"),
			setAttribute : new Definition("function(name:String,value:Object)"),
			setAttributeNS : new Definition("function(namespace:String,name:String,value:Object)"),
			removeAttribute : new Definition("function(name:String)"),
			removeAttributeNS : new Definition("function(namespace:String,localname:String)"),
			hasAttribute : new Definition("function(name:String):Boolean"),
			hasAttributeNS : new Definition("function(namespace:String,localname:String):Boolean"),

			getElementsByTagName : new Definition("function(localName:String):HTMLCollection"),
			getElementsByTagNameNS : new Definition("function(namespace:String,localName:String):HTMLCollection"),
			getElementsByClassName : new Definition("function(classname:String):HTMLCollection"),

			prepend : new Definition("function(...nodes:Node)"),
			append : new Definition("function(...nodes:Node)"),
			before : new Definition("function(...nodes:Node)"),
			after : new Definition("function(...nodes:Node)"),
			replace : new Definition("function(...nodes:Node)"),
			remove : new Definition("function()")
		},

		// see http://www.w3.org/TR/dom/#attr
		Attr : {
			$$isBuiltin: true,
			$$proto : new Definition("Node"),

			isId : new Definition("Boolean"),
			name : new Definition("String"),
			value : new Definition("String"),
			namespaceURI : new Definition("String"),
			prefix : new Definition("String"),
			localName : new Definition("String")
		},

		// see http://www.w3.org/TR/dom/#interface-nodelist
		NodeList : {
			$$isBuiltin: true,
			$$proto : new Definition("Object"),

			item : new Definition("Node"),
			length : new Definition("Number")
		},

		// incomplete
		DOMApplicationCache : {
			$$isBuiltin: true,
			$$proto : new Definition("Object")
		},

		// incomplete
		CSSStyleDeclaration : {
			$$isBuiltin: true,
			$$proto : new Definition("Object")
		},
		// incomplete
		MediaQueryList : {
			$$isBuiltin: true,
			$$proto : new Definition("Object")
		},
		// see http://www.whatwg.org/specs/web-apps/current-work/multipage/history.html#dom-location
		Location : {
			$$isBuiltin: true,
			$$proto : new Definition("Object"),

			assign : new Definition("function(url:String)"),
			replace : new Definition("function(url:String)"),
			reload : new Definition("function()"),

			href : new Definition("String"),
			protocol : new Definition("String"),
			host : new Definition("String"),
			hostname : new Definition("String"),
			port : new Definition("String"),
			pathname : new Definition("String"),
			search : new Definition("String"),
			hash : new Definition("String")
		},

		// see http://dvcs.w3.org/hg/editing/raw-file/tip/editing.html#selections
		Selection : {
			$$isBuiltin: true,
			$$proto : new Definition("Object"),

			anchorNode : new Definition("Node"),
			anchorOffset : new Definition("Number"),
			focusNode : new Definition("Node"),
			focusOffset : new Definition("Number"),
			rangeCount : new Definition("Number"),

			isCollapsed : new Definition("Boolean"),


			collapse : new Definition("function(node:Node,offset:Number)"),
			collapseToStart : new Definition("function()"),
			collapseToEnd : new Definition("function()"),

			extend : new Definition("function(node:Node,offset:Number)"),

			selectAllChildren : new Definition("function(node:Node)"),
			deleteFromDocument : new Definition("function()"),
			getRangeAt : new Definition("function(index:Number):Range"),
			addRange : new Definition("function(range:Range)"),
			removeRange : new Definition("function(range:Range)"),
			removeAllRanges : new Definition("function()")
		},

		// see http://www.w3.org/TR/html5/the-html-element.html#the-html-element
		// incomplete
		HTMLElement : {
			$$isBuiltin: true,
			$$proto : new Definition("Element"),

			id : new Definition("String"),
			title : new Definition("String"),
			lang : new Definition("String"),
			dir : new Definition("String"),
			className : new Definition("String")
		},

		// see http://www.w3.org/TR/html5/the-img-element.html#htmlimageelement
		// incomplete
		HTMLImageElement : {
			$$isBuiltin: true,
			$$proto : new Definition("HTMLElement")
		},

		// incomplete
		HTMLOptionElement : {
			$$isBuiltin: true,
			$$proto : new Definition("HTMLElement")
		},

		// http://www.w3.org/TR/DOM-Level-2-HTML/html.html#ID-75708506
		HTMLCollection : {
			$$isBuiltin: true,
			$$proto : new Definition("Object"),
			length : new Definition("Number"),
			item : new Definition("function(index:Number):Element"),
			namedItem : new Definition("function(name:String):Element")
		},

		// incomplete
		NodeIterator : {
			$$isBuiltin: true,
			$$proto : new Definition("Object")
		},

		// incomplete
		TreeWalker : {
			$$isBuiltin: true,
			$$proto : new Definition("Object")
		},

		// http://dvcs.w3.org/hg/domcore/raw-file/tip/Overview.html#interface-documentfragment
		DocumentFragment : {
			$$isBuiltin: true,
			$$proto : new Definition("Node"),

			prepend : new Definition("function(...nodes:Node)"),
			append : new Definition("function(...nodes:Node)")
		},

		// incomplete
		Text : {
			$$isBuiltin: true,
			$$proto : new Definition("Node")
		},

		// incomplete
		ProcessingInstruction : {
			$$isBuiltin: true,
			$$proto : new Definition("Node")
		},

		// incomplete
		Comment : {
			$$isBuiltin: true,
			$$proto : new Definition("Node")
		},

		// see http://dvcs.w3.org/hg/domcore/raw-file/tip/Overview.html#ranges
		Range: {
			$$isBuiltin: true,
			$$proto : new Definition("Object"),

			startContainer : new Definition("Node"),
			startOffset : new Definition("Number"),
			endContainer : new Definition("Node"),
			endOffset : new Definition("Number"),
			collapsed : new Definition("Boolean"),
			commonAncestorContainer : new Definition("Node"),

			setStart : new Definition("function(refNode:Node,offset:Number)"),
			setEnd : new Definition("function(refNode:Node,offset:Number)"),
			setStartBefore : new Definition("function(refNode:Node)"),
			setStartAfter : new Definition("function(refNode:Node)"),
			setEndBefore : new Definition("function(refNode:Node)"),
			setEndAfter : new Definition("function(refNode:Node)"),
			collapse : new Definition("function(toStart:Node)"),
			selectNode : new Definition("function(refNode:Node)"),
			selectNodeContents : new Definition("function(refNode:Node)"),

			compareBoundaryPoints : new Definition("function(how:Object,sourceRange:Object):Number"),

			deleteContents : new Definition("function()"),
			extractContents : new Definition("function():DocumentFragment"),
			cloneContents : new Definition("function():DocumentFragment"),
			insertNode : new Definition("function(node:Node)"),
			surroundContents : new Definition("function(nodeParent:Node)"),

			cloneRange : new Definition("function():Range"),
			detach : new Definition("function()"),


			isPointInRange : new Definition("function(node:Node,offset:Number):Boolean"),
			comparePoint : new Definition("function(node:Node,offset:Number):Number"),

			intersectsNode : new Definition("function(node:Node):Boolean")
		},

		"funciton():Range" : {
			$$isBuiltin: true,
			START_TO_START : new Definition("Number"),
			START_TO_END : new Definition("Number"),
			END_TO_END : new Definition("Number"),
			END_TO_START : new Definition("Number")
		},


		// incomplete
		DOMTokenList: {
			$$isBuiltin: true,
			$$proto : new Definition("Object"),

			length : new Definition("Number"),

			item : new Definition("function(index:Number):String"),
			contains : new Definition("function(token:String):Boolean"),
			add : new Definition("function(token:String)"),
			remove : new Definition("function(token:String)"),
			toggle : new Definition("function(token:String):Boolean")
		}
	};

	var protoLength = "~proto".length;
	return {
		Types : Types,
		Definition : Definition,

		// now some functions that handle types signatures, styling, and parsing

		/** constant that defines generated type name prefixes */
		GEN_NAME : "gen~",


		// type parsing
		isArrayType : function(typeObj) {
			return typeObj.type === 'ArrayType' || typeObj.type === 'TypeApplication';
		},

		isFunctionOrConstructor : function(typeObj) {
			return typeObj.type === 'FunctionType';
		},

		isPrototypeName : function(typeName) {
			return typeName.substr( - protoLength, protoLength) === "~proto";
		},

		/**
		 * returns a parameterized array type with the given type parameter
		 */
		parameterizeArray : function(parameterTypeObj) {
			return {
				type: 'ArrayType',
				elements: [parameterTypeObj]
			};
		},

		createFunctionType : function(params, result, isConstructor) {
			var functionTypeObj = {
				type: 'FunctionType',
				params: params,
				result: result
			};
			if (isConstructor) {
				functionTypeObj.params = functionTypeObj.params || [];
			    // TODO should we also do 'this'?
				functionTypeObj.params.push({
					type: 'ParameterType',
					name: 'new',
					expression: result
				});
			}

			return functionTypeObj;
		},

		/**
		 * If this is a parameterized array type, then extracts the type,
		 * Otherwise object
		 */
		extractArrayParameterType : function(arrayObj) {
			var elts;
			if (arrayObj.type === 'TypeApplication') {
				if (arrayObj.expression.name === 'Array') {
					elts = arrayObj.applications;
				} else {
					return arrayObj.expression;
				}
			} else if (arrayObj.type === 'ArrayType') {
				elts = arrayObj.elements;
			} else {
				// not an array type
				return arrayObj;
			}

			if (elts.length > 0) {
				return elts[0];
			} else {
				return THE_UNKNOWN_TYPE;
			}
		},

		extractReturnType : function(fnType) {
			return fnType.result || (fnType.type === 'FunctionType' ? this.UNDEFINED_TYPE: fnType);
		},

		// TODO should we just return a typeObj here???
		parseJSDocComment : function(docComment) {
			var result = { };
			result.params = {};
			if (docComment) {
				var commentText = docComment.value;
				if (!commentText) {
					return result;
				}
				try {
					var rawresult = doctrine.parse("/*" + commentText + "*/", {unwrap : true, tags : ['param', 'type', 'return']});
					// transform result into something more manageable
					var rawtags = rawresult.tags;
					if (rawtags) {
						for (var i = 0; i < rawtags.length; i++) {
							switch (rawtags[i].title) {
								case "typedef":
								case "define":
								case "type":
									result.type = rawtags[i].type;
									break;
								case "return":
									result.rturn = rawtags[i].type;
									break;
								case "param":
									// remove square brackets
									var name = rawtags[i].name;
									if (name.charAt(0) === '[' && name.charAt(name.length -1) === ']') {
										name = name.substring(1, name.length-1);
									}
									result.params[name] = rawtags[i].type;
									break;
							}
						}
					}
				} catch (e) {
					scriptedLogger.error(e.message, "CONTENT_ASSIST");
					scriptedLogger.error(e.stack, "CONTENT_ASSIST");
					scriptedLogger.error("Error parsing doc comment:\n" + (docComment && docComment.value),
							"CONTENT_ASSIST");
				}
			}
			return result;
		},


		/**
		 * takes this jsdoc type and recursively splits out all record types into their own type
		 * also converts unknown name types into Objects
		 * @see https://developers.google.com/closure/compiler/docs/js-for-compiler
		 */
		convertJsDocType : function(jsdocType, env, doCombine, depth) {
		    if (typeof depth !== 'number') {
		        depth = 0;
		    }
			if (!jsdocType) {
				return THE_UNKNOWN_TYPE;
			}

			var self = this;
			var name = jsdocType.name;
			var allTypes = env.getAllTypes();
			switch (jsdocType.type) {
				case 'NullableLiteral':
				case 'AllLiteral':
				case 'NullLiteral':
				case 'UndefinedLiteral':
				case 'VoidLiteral':
					return {
						type: jsdocType.type
					};

				case 'UnionType':
					return {
						type: jsdocType.type,
						elements: jsdocType.elements.map(function(elt) {
							return self.convertJsDocType(elt, env, doCombine, depth);
						})
					};

				case 'RestType':
					return {
						type: jsdocType.type,
						expression: self.convertJsDocType(jsdocType.expression, env, doCombine, depth)
					};

				case 'ArrayType':
					return {
						type: jsdocType.type,
						elements: jsdocType.elements.map(function(elt) {
							return self.convertJsDocType(elt, env, doCombine, depth);
						})
					};

				case 'FunctionType':
					var fnType = {
						type: jsdocType.type,
						params: jsdocType.params.map(function(elt) {
							return self.convertJsDocType(elt, env, doCombine, depth);
						})
					};
					if (jsdocType.result) {
						// prevent recursion on functions that return themselves
						fnType.result = depth > 1 && jsdocType.result.type === 'FunctionType' ?
							{ type : 'NameExpression', name : JUST_DOTS } :
							self.convertJsDocType(jsdocType.result, env, doCombine, depth);
					}

					// TODO should remove?  new and this are folded into params
//					if (jsdocType['new']) {
//						// prevent recursion on functions that return themselves
//						fnType['new'] = depth < 2 && jsdocType['new'].type === 'FunctionType' ?
//							self.convertJsDocType(jsdocType['new'], env, doCombine, depth) :
//							{ type : 'NameExpression', name : JUST_DOTS };
//					}
//
//					if (jsdocType['this']) {
//						// prevent recursion on functions that return themselves
//						fnType['this'] = depth < 2 && jsdocType['this'].type === 'FunctionType' ?
//							self.convertJsDocType(jsdocType['this'], env, doCombine, depth) :
//							{ type : 'NameExpression', name : JUST_DOTS };
//					}

					return fnType;

				case 'TypeApplication':
					var typeApp = {
						type: jsdocType.type,
						expression: self.convertJsDocType(jsdocType.expression, env, doCombine, depth),

					};
					if (jsdocType.applications) {
                        typeApp.applications = jsdocType.applications.map(function(elt) {
							return self.convertJsDocType(elt, env, doCombine, depth);
						});
					}
					return typeApp;

				case 'ParameterType':
					return {
						type: jsdocType.type,
						name: name,
						expression: jsdocType.expression ?
							self.convertJsDocType(jsdocType.expression, env, doCombine, depth) :
							null
					};

				case 'NonNullableType':
				case 'OptionalType':
				case 'NullableType':
					return {
						prefix: true,
						type: jsdocType.type,
						expression: self.convertJsDocType(jsdocType.expression, env, doCombine, depth)
					};

				case 'NameExpression':
					if (doCombine && env.isSyntheticName(name)) {
						// Must mush together all properties for this synthetic type
						var origFields = allTypes[name];
						// must combine a record type
						var newFields = [];
						Object.keys(origFields).forEach(function(key) {
							if (key === '$$proto') {
								// maybe should traverse the prototype
								return;
							}
							var prop = origFields[key];
							var fieldType = depth > 0 && (prop.typeObj.type === 'NameExpression' && env.isSyntheticName(prop.typeObj.name)) ?
							     { type : 'NameExpression', name : JUST_DOTS } :
							     self.convertJsDocType(prop.typeObj, env, doCombine, depth+1);
							newFields.push({
								type: 'FieldType',
								key: key,
								value: fieldType
							});
						});


						return {
							type: 'RecordType',
							fields: newFields
						};
					} else {
						if (allTypes[name]) {
							return { type: 'NameExpression', name: name };
						} else {
							var capType = name[0].toUpperCase() + name.substring(1);
							if (allTypes[capType]) {
								return { type: 'NameExpression', name: capType };
							}
						}
					}
					return THE_UNKNOWN_TYPE;

				case 'FieldType':
					return {
						type: jsdocType.type,
						key: jsdocType.key,
						value: self.convertJsDocType(jsdocType.value, env, doCombine, depth)
					};

				case 'RecordType':
					if (doCombine) {
						// when we are combining, do not do anything special for record types
						return {
							type: jsdocType.type,
							params: jsdocType.fields.map(function(elt) {
								return self.convertJsDocType(elt, env, doCombine, depth+1);
							})
						};
					} else {
						// here's where it gets interesting
						// create a synthetic type in the env and then
						// create a property in the env type for each record property
						var fields = { };
						for (var i = 0; i < jsdocType.fields.length; i++) {
							var field = jsdocType.fields[i];
							var convertedField = self.convertJsDocType(field, env, doCombine, depth+1);
							fields[convertedField.key] = convertedField.value;
						}
						// create a new type to store the record
						var obj = env.newFleetingObject();
						for (var prop in fields) {
							if (fields.hasOwnProperty(prop)) {
								// add the variable to the new object, which happens to be the top-level scope
								env.addVariable(prop, obj.name, fields[prop]);
							}
						}
						return obj;
					}
			}
			return THE_UNKNOWN_TYPE;
		},

		createNameType : createNameType,

		createParamType : function(name, typeObj) {
			return {
				type: 'ParameterType',
				name: name,
				expression: typeObj
			};
		},

		convertToSimpleTypeName : function(typeObj) {
			switch (typeObj.type) {
				case 'NullableLiteral':
				case 'AllLiteral':
				case 'NullLiteral':
					return "Object";

				case 'UndefinedLiteral':
				case 'VoidLiteral':
					return "undefined";

				case 'NameExpression':
					return typeObj.name;

				case 'TypeApplication':
				case 'ArrayType':
					return "Array";

				case 'FunctionType':
					return "Function";

				case 'UnionType':
					return typeObj.expressions && typeObj.expressions.length > 0 ?
						this.convertToSimpleTypeName(typeObj.expressions[0]) :
						"Object";

				case 'RecordType':
					return "Object";

				case 'FieldType':
					return this.convertToSimpleTypeName(typeObj.value);

				case 'NonNullableType':
				case 'OptionalType':
				case 'NullableType':
				case 'ParameterType':
					return this.convertToSimpleTypeName(typeObj.expression);
			}
		},

		// type styling
		styleAsProperty : function(prop, useHtml) {
			return useHtml ? '<span style="color: blue;font-weight:bold;">' + prop + '</span>': prop;
		},
		styleAsType : function(type, useHtml) {
			return useHtml ? '<span style="color: black;">' + type + '</span>': type;
		},
		styleAsOther : function(text, useHtml) {
			return useHtml ? '<span style="font-weight:bold; color:purple;">' + text + '</span>': text;
		},


		/**
		 * creates a human readable type name from the name given
		 */
		createReadableType : function(typeObj, env, useFunctionSig, depth, useHtml) {
			if (useFunctionSig) {
				typeObj = this.convertJsDocType(typeObj, env, true);
				if (useHtml) {
					return this.convertToHtml(typeObj, 0);
				}
				var res = doctrine.type.stringify(typeObj, {compact: true});
				res = res.replace(JUST_DOTS_REGEX, "{...}");
				res = res.replace(UNDEFINED_OR_EMPTY_OBJ, "");
				return res;
			} else {
				typeObj = this.extractReturnType(typeObj);
				return this.createReadableType(typeObj, env, true, depth, useHtml);
			}
		},
		convertToHtml : function(typeObj, depth) {
			// typeObj must already be converted to avoid infinite loops
//			typeObj = this.convertJsDocType(typeObj, env, true);
			var self = this;
			var res;
			var parts = [];
			depth = depth || 0;

			switch(typeObj.type) {
				case 'NullableLiteral':
					return this.styleAsType("?", true);
				case 'AllLiteral':
					return this.styleAsType("*", true);
				case 'NullLiteral':
					return this.styleAsType("null", true);
				case 'UndefinedLiteral':
					return this.styleAsType("undefined", true);
				case 'VoidLiteral':
					return this.styleAsType("void", true);

				case 'NameExpression':
					var name = typeObj.name === JUST_DOTS ? "{...}" : typeObj.name;
					return this.styleAsType(name, true);

				case 'UnionType':
					parts = [];
					if (typeObj.expressions) {
						typeObj.expressions.forEach(function(elt) {
							parts.push(self.convertToHtml(elt, depth+1));
						});
					}
					return "( " + parts.join(", ") + " )";



				case 'TypeApplication':
					if (typeObj.applications) {
						typeObj.applications.forEach(function(elt) {
							parts.push(self.convertToHtml(elt, depth));
						});
					}
					var isArray = typeObj.expression.name === 'Array';
					if (!isArray) {
						res = this.convertToHtml(typeObj.expression, depth) + ".<";
					}
					res += parts.join(",");
					if (isArray) {
						res += '[]';
					} else {
						res += ">";
					}
					return res;
				case 'ArrayType':
					if (typeObj.elements) {
						typeObj.elements.forEach(function(elt) {
							parts.push(self.convertToHtml(elt, depth+1));
						});
					}
					return parts.join(", ") + '[]';

				case 'NonNullableType':
					return "!" +  this.convertToHtml(typeObj.expression, depth);
				case 'OptionalType':
					return this.convertToHtml(typeObj.expression, depth) + "=";
				case 'NullableType':
					return "?" +  this.convertToHtml(typeObj.expression, depth);
				case 'RestType':
					return "..." +  this.convertToHtml(typeObj.expression, depth);

				case 'ParameterType':
					return this.styleAsProperty(typeObj.name, true) +
						(typeObj.expression.name === JUST_DOTS ? "" : (":" + this.convertToHtml(typeObj.expression, depth)));

				case 'FunctionType':
					var isCons = false;
					var resType;
					if (typeObj.params) {
						typeObj.params.forEach(function(elt) {
							if (elt.name === 'this') {
								isCons = true;
								resType = elt.expression;
							} else if (elt.name === 'new') {
								isCons = true;
								resType = elt.expression;
							} else {
								parts.push(self.convertToHtml(elt, depth+1));
							}
						});
					}

					if (!resType && typeObj.result) {
						resType = typeObj.result;
					}

					var resText;
					if (resType && resType.type !== 'UndefinedLiteral' && resType.name !== 'undefined') {
						resText = this.convertToHtml(resType, depth+1);
					} else {
						resText = '';
					}
					res = this.styleAsOther(isCons ? 'new ' : 'function', true);
					if (isCons) {
						res += resText;
					}
					res += '(' + parts.join(",") + ')';
					if (!isCons && resText) {
						res += '&rarr;' + resText;
					}

					return res;

				case 'RecordType':
					if (typeObj.fields && typeObj.fields.length > 0) {
						typeObj.fields.forEach(function(elt) {
							parts.push(proposalUtils.repeatChar('&nbsp;&nbsp;', depth+1) + self.convertToHtml(elt, depth+1));
						});
						return '{<br/>' + parts.join(',<br/>') + '<br/>' + proposalUtils.repeatChar('&nbsp;&nbsp;', depth) + '}';
					} else {
						return '{ }';
					}
					break;

				case 'FieldType':
					return this.styleAsProperty(typeObj.key, true) +
						":" + this.convertToHtml(typeObj.value, depth);
			}

		},
		ensureTypeObject: ensureTypeObject,
		OBJECT_TYPE: THE_UNKNOWN_TYPE,
		UNDEFINED_TYPE: createNameType("undefined"),
		NUMBER_TYPE: createNameType("Number"),
		BOOLEAN_TYPE: createNameType("Boolean"),
		STRING_TYPE: createNameType("String"),
		ARRAY_TYPE: createNameType("Array"),
		FUNCTION_TYPE: createNameType("Function")
	};
});