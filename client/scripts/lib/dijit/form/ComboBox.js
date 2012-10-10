define("dijit/form/ComboBox", ["dojo", "dijit", "text!dijit/form/templates/DropDownBox.html", "dojo/window", "dojo/regexp", "dojo/data/util/simpleFetch", "dojo/data/util/filter", "dijit/_CssStateMixin", "dijit/form/_FormWidget", "dijit/form/ValidationTextBox", "dijit/_HasDropDown", "i18n!dijit/form/nls/ComboBox"], function(dojo, dijit) {

dojo.declare(
	"dijit.form.ComboBoxMixin",
	dijit._HasDropDown,
	{
		// summary:
		//		Implements the base functionality for `dijit.form.ComboBox`/`dijit.form.FilteringSelect`
		// description:
		//		All widgets that mix in dijit.form.ComboBoxMixin must extend `dijit.form._FormValueWidget`.
		// tags:
		//		protected

		// item: Object
		//		This is the item returned by the dojo.data.store implementation that
		//		provides the data for this ComboBox, it's the currently selected item.
		item: null,

		// pageSize: Integer
		//		Argument to data provider.
		//		Specifies number of search results per page (before hitting "next" button)
		pageSize: Infinity,

		// store: [const] Object
		//		Reference to data provider object used by this ComboBox
		store: null,

		// fetchProperties: Object
		//		Mixin to the dojo.data store's fetch.
		//		For example, to set the sort order of the ComboBox menu, pass:
		//	|	{ sort: [{attribute:"name",descending: true}] }
		//		To override the default queryOptions so that deep=false, do:
		//	|	{ queryOptions: {ignoreCase: true, deep: false} }
		fetchProperties:{},

		// query: Object
		//		A query that can be passed to 'store' to initially filter the items,
		//		before doing further filtering based on `searchAttr` and the key.
		//		Any reference to the `searchAttr` is ignored.
		query: {},

		// autoComplete: Boolean
		//		If user types in a partial string, and then tab out of the `<input>` box,
		//		automatically copy the first entry displayed in the drop down list to
		//		the `<input>` field
		autoComplete: true,

		// highlightMatch: String
		// 		One of: "first", "all" or "none".
		//
		//		If the ComboBox/FilteringSelect opens with the search results and the searched
		//		string can be found, it will be highlighted.  If set to "all"
		//		then will probably want to change `queryExpr` parameter to '*${0}*'
		//
		//		Highlighting is only performed when `labelType` is "text", so as to not
		//		interfere with any HTML markup an HTML label might contain.
		highlightMatch: "first",

		// searchDelay: Integer
		//		Delay in milliseconds between when user types something and we start
		//		searching based on that value
		searchDelay: 100,

		// searchAttr: String
		//		Search for items in the data store where this attribute (in the item)
		//		matches what the user typed
		searchAttr: "name",

		// labelAttr: String?
		//		The entries in the drop down list come from this attribute in the
		//		dojo.data items.
		//		If not specified, the searchAttr attribute is used instead.
		labelAttr: "",

		// labelType: String
		//		Specifies how to interpret the labelAttr in the data store items.
		//		Can be "html" or "text".
		labelType: "text",

		// queryExpr: String
		//		This specifies what query ComboBox/FilteringSelect sends to the data store,
		//		based on what the user has typed.  Changing this expression will modify
		//		whether the drop down shows only exact matches, a "starting with" match,
		//		etc.  Use it in conjunction with highlightMatch.
		//		dojo.data query expression pattern.
		//		`${0}` will be substituted for the user text.
		//		`*` is used for wildcards.
		//		`${0}*` means "starts with", `*${0}*` means "contains", `${0}` means "is"
		queryExpr: "${0}*",

		// ignoreCase: Boolean
		//		Set true if the ComboBox/FilteringSelect should ignore case when matching possible items
		ignoreCase: true,

		// hasDownArrow: Boolean
		//		Set this textbox to have a down arrow button, to display the drop down list.
		//		Defaults to true.
		hasDownArrow: true,

		templateString: dojo.cache("dijit.form", "templates/DropDownBox.html"),

		baseClass: "dijitTextBox dijitComboBox",

		// dropDownClass: [protected extension] String
		//		Name of the dropdown widget class used to select a date/time.
		//		Subclasses should specify this.
		dropDownClass: "dijit.form._ComboBoxMenu",

		// Set classes like dijitDownArrowButtonHover depending on
		// mouse action over button node
		cssStateNodes: {
			"_buttonNode": "dijitDownArrowButton"
		},

		// Flags to _HasDropDown to limit height of drop down to make it fit in viewport
		maxHeight: -1,

		// For backwards compatibility let onClick events propagate, even clicks on the down arrow button
		_stopClickEvents: false,

		_getCaretPos: function(/*DomNode*/ element){
			// khtml 3.5.2 has selection* methods as does webkit nightlies from 2005-06-22
			var pos = 0;
			if(typeof(element.selectionStart) == "number"){
				// FIXME: this is totally borked on Moz < 1.3. Any recourse?
				pos = element.selectionStart;
			}else if(dojo.isIE){
				// in the case of a mouse click in a popup being handled,
				// then the dojo.doc.selection is not the textarea, but the popup
				// var r = dojo.doc.selection.createRange();
				// hack to get IE 6 to play nice. What a POS browser.
				var tr = dojo.doc.selection.createRange().duplicate();
				var ntr = element.createTextRange();
				tr.move("character",0);
				ntr.move("character",0);
				try{
					// If control doesn't have focus, you get an exception.
					// Seems to happen on reverse-tab, but can also happen on tab (seems to be a race condition - only happens sometimes).
					// There appears to be no workaround for this - googled for quite a while.
					ntr.setEndPoint("EndToEnd", tr);
					pos = String(ntr.text).replace(/\r/g,"").length;
				}catch(e){
					// If focus has shifted, 0 is fine for caret pos.
				}
			}
			return pos;
		},

		_setCaretPos: function(/*DomNode*/ element, /*Number*/ location){
			location = parseInt(location);
			dijit.selectInputText(element, location, location);
		},

		_setDisabledAttr: function(/*Boolean*/ value){
			// Additional code to set disabled state of ComboBox node.
			// Overrides _FormValueWidget._setDisabledAttr() or ValidationTextBox._setDisabledAttr().
			this.inherited(arguments);
			dijit.setWaiState(this.domNode, "disabled", value);
		},

		_abortQuery: function(){
			// stop in-progress query
			if(this.searchTimer){
				clearTimeout(this.searchTimer);
				this.searchTimer = null;
			}
			if(this._fetchHandle){
				if(this._fetchHandle.abort){ this._fetchHandle.abort(); }
				this._fetchHandle = null;
			}
		},

		_onInput: function(/*Event*/ evt){
			// summary:
			//		Handles paste events
			if(!this.searchTimer && (evt.type == 'paste'/*IE|WebKit*/ || evt.type == 'input'/*Firefox*/) && this._lastInput != this.textbox.value){
				this.searchTimer = setTimeout(dojo.hitch(this, function(){
					this._onKey({charOrCode: 229}); // fake IME key to cause a search
				}), 100); // long delay that will probably be preempted by keyboard input
			}
			this.inherited(arguments);
		},

		_onKey: function(/*Event*/ evt){
			// summary:
			//		Handles keyboard events

			var key = evt.charOrCode;

			// except for cutting/pasting case - ctrl + x/v
			if(evt.altKey || ((evt.ctrlKey || evt.metaKey) && (key != 'x' && key != 'v')) || key == dojo.keys.SHIFT){
				return; // throw out weird key combinations and spurious events
			}
			
			var doSearch = false;
			var pw = this.dropDown;
			var dk = dojo.keys;
			var highlighted = null;
			this._prev_key_backspace = false;
			this._abortQuery();

			// _HasDropDown will do some of the work:
			//		1. when drop down is not yet shown:
			//			- if user presses the down arrow key, call loadDropDown()
			//		2. when drop down is already displayed:
			//			- on ESC key, call closeDropDown()
			//			- otherwise, call dropDown.handleKey() to process the keystroke
			this.inherited(arguments);

			if(this._opened){
				highlighted = pw.getHighlightedOption();
			}
			switch(key){
				case dk.PAGE_DOWN:
				case dk.DOWN_ARROW:
				case dk.PAGE_UP:
				case dk.UP_ARROW:
					// Keystroke caused ComboBox_menu to move to a different item.
					// Copy new item to <input> box.
					if(this._opened){
						this._announceOption(highlighted);
					}
					dojo.stopEvent(evt);
					break;

				case dk.ENTER:
					// prevent submitting form if user presses enter. Also
					// prevent accepting the value if either Next or Previous
					// are selected
					if(highlighted){
						// only stop event on prev/next
						if(highlighted == pw.nextButton){
							this._nextSearch(1);
							dojo.stopEvent(evt);
							break;
						}else if(highlighted == pw.previousButton){
							this._nextSearch(-1);
							dojo.stopEvent(evt);
							break;
						}
					}else{
						// Update 'value' (ex: KY) according to currently displayed text
						this._setBlurValue(); // set value if needed
						this._setCaretPos(this.focusNode, this.focusNode.value.length); // move cursor to end and cancel highlighting
					}
					// default case:
					// if enter pressed while drop down is open, or for FilteringSelect,
					// if we are in the middle of a query to convert a directly typed in value to an item,
					// prevent submit, but allow event to bubble
					if(this._opened || this._fetchHandle){
					evt.preventDefault();
					}
					// fall through

				case dk.TAB:
					var newvalue = this.get('displayedValue');
					//	if the user had More Choices selected fall into the
					//	_onBlur handler
					if(pw && (
						newvalue == pw._messages["previousMessage"] ||
						newvalue == pw._messages["nextMessage"])
					){
						break;
					}
					if(highlighted){
						this._selectOption();
					}
					if(this._opened){
						this._lastQuery = null; // in case results come back later
						this.closeDropDown();
					}
					break;

				case ' ':
					if(highlighted){
						// user is effectively clicking a choice in the drop down menu
						dojo.stopEvent(evt);
						this._selectOption();
						this.closeDropDown();
					}else{
						// user typed a space into the input box, treat as normal character
						doSearch = true;
					}
					break;

				case dk.DELETE:
				case dk.BACKSPACE:
					this._prev_key_backspace = true;
					doSearch = true;
					break;

				default:
					// Non char keys (F1-F12 etc..)  shouldn't open list.
					// Ascii characters and IME input (Chinese, Japanese etc.) should.
					//IME input produces keycode == 229.
					doSearch = typeof key == 'string' || key == 229;
			}
			if(doSearch){
				// need to wait a tad before start search so that the event
				// bubbles through DOM and we have value visible
				this.item = undefined; // undefined means item needs to be set
				this.searchTimer = setTimeout(dojo.hitch(this, "_startSearchFromInput"),1);
			}
		},

		_autoCompleteText: function(/*String*/ text){
			// summary:
			// 		Fill in the textbox with the first item from the drop down
			// 		list, and highlight the characters that were
			// 		auto-completed. For example, if user typed "CA" and the
			// 		drop down list appeared, the textbox would be changed to
			// 		"California" and "ifornia" would be highlighted.

			var fn = this.focusNode;

			// IE7: clear selection so next highlight works all the time
			dijit.selectInputText(fn, fn.value.length);
			// does text autoComplete the value in the textbox?
			var caseFilter = this.ignoreCase? 'toLowerCase' : 'substr';
			if(text[caseFilter](0).indexOf(this.focusNode.value[caseFilter](0)) == 0){
				var cpos = this._getCaretPos(fn);
				// only try to extend if we added the last character at the end of the input
				if((cpos+1) > fn.value.length){
					// only add to input node as we would overwrite Capitalisation of chars
					// actually, that is ok
					fn.value = text;//.substr(cpos);
					// visually highlight the autocompleted characters
					dijit.selectInputText(fn, cpos);
				}
			}else{
				// text does not autoComplete; replace the whole value and highlight
				fn.value = text;
				dijit.selectInputText(fn);
			}
		},

		_openResultList: function(/*Object*/ results, /*Object*/ dataObject){
			// summary:
			//		Callback when a search completes.
			// description:
			//		1. generates drop-down list and calls _showResultList() to display it
			//		2. if this result list is from user pressing "more choices"/"previous choices"
			//			then tell screen reader to announce new option
			this._fetchHandle = null;
			if(	this.disabled ||
				this.readOnly ||
				(dataObject.query[this.searchAttr] != this._lastQuery)
			){
				return;
			}
			var wasSelected = this.dropDown._highlighted_option && dojo.hasClass(this.dropDown._highlighted_option, "dijitMenuItemSelected");
			this.dropDown.clearResultList();
			if(!results.length && !this._maxOptions){ // if no results and not just the previous choices button
				this.closeDropDown();
				return;
			}

			// Fill in the textbox with the first item from the drop down list,
			// and highlight the characters that were auto-completed. For
			// example, if user typed "CA" and the drop down list appeared, the
			// textbox would be changed to "California" and "ifornia" would be
			// highlighted.

			dataObject._maxOptions = this._maxOptions;
			var nodes = this.dropDown.createOptions(
				results,
				dataObject,
				dojo.hitch(this, "_getMenuLabelFromItem")
			);

			// show our list (only if we have content, else nothing)
			this._showResultList();

			// #4091:
			//		tell the screen reader that the paging callback finished by
			//		shouting the next choice
			if(dataObject.direction){
				if(1 == dataObject.direction){
					this.dropDown.highlightFirstOption();
				}else if(-1 == dataObject.direction){
					this.dropDown.highlightLastOption();
				}
				if(wasSelected){
					this._announceOption(this.dropDown.getHighlightedOption());
				}
			}else if(this.autoComplete && !this._prev_key_backspace
				// when the user clicks the arrow button to show the full list,
				// startSearch looks for "*".
				// it does not make sense to autocomplete
				// if they are just previewing the options available.
				&& !/^[*]+$/.test(dataObject.query[this.searchAttr])){
					this._announceOption(nodes[1]); // 1st real item
			}
		},

		_showResultList: function(){
			// summary:
			//		Display the drop down if not already displayed, or if it is displayed, then
			//		reposition it if necessary (reposition may be necessary if drop down's height changed).

			this.closeDropDown(true);

			// hide the tooltip
			this.displayMessage("");

			this.openDropDown();

			dijit.setWaiState(this.domNode, "expanded", "true");
		},

		loadDropDown: function(/*Function*/ callback){
			// Overrides _HasDropDown.loadDropDown().
			// This is called when user has pressed button icon or pressed the down arrow key
			// to open the drop down.
			
			this._startSearchAll();
		},

		isLoaded: function(){
			// signal to _HasDropDown that it needs to call loadDropDown() to load the
			// drop down asynchronously before displaying it
			return false;
		},

		closeDropDown: function(){
			// Overrides _HasDropDown.closeDropDown().  Closes the drop down (assuming that it's open).
			// This method is the callback when the user types ESC or clicking
			// the button icon while the drop down is open.  It's also called by other code.
			this._abortQuery();
			if(this._opened){
				this.inherited(arguments);
				dijit.setWaiState(this.domNode, "expanded", "false");
				dijit.removeWaiState(this.focusNode,"activedescendant");
			}
		},

		_setBlurValue: function(){
			// if the user clicks away from the textbox OR tabs away, set the
			// value to the textbox value
			// #4617:
			//		if value is now more choices or previous choices, revert
			//		the value
			var newvalue = this.get('displayedValue');
			var pw = this.dropDown;
			if(pw && (
				newvalue == pw._messages["previousMessage"] ||
				newvalue == pw._messages["nextMessage"]
				)
			){
				this._setValueAttr(this._lastValueReported, true);
			}else if(typeof this.item == "undefined"){
				// Update 'value' (ex: KY) according to currently displayed text
				this.item = null;
				this.set('displayedValue', newvalue);
			}else{
				if(this.value != this._lastValueReported){
					dijit.form._FormValueWidget.prototype._setValueAttr.call(this, this.value, true);
				}
				this._refreshState();
			}
		},

		_onBlur: function(){
			// summary:
			//		Called magically when focus has shifted away from this widget and it's drop down
			this.closeDropDown();
			this.inherited(arguments);
		},

		_setItemAttr: function(/*item*/ item, /*Boolean?*/ priorityChange, /*String?*/ displayedValue){
			// summary:
			//		Set the displayed valued in the input box, and the hidden value
			//		that gets submitted, based on a dojo.data store item.
			// description:
			//		Users shouldn't call this function; they should be calling
			//		set('item', value)
			// tags:
			//		private
			if(!displayedValue){
				displayedValue = this.store.getValue(item, this.searchAttr);
			}
			var value = this._getValueField() != this.searchAttr? this.store.getIdentity(item) : displayedValue;
			this._set("item", item);
			dijit.form.ComboBox.superclass._setValueAttr.call(this, value, priorityChange, displayedValue);
		},

		_announceOption: function(/*Node*/ node){
			// summary:
			//		a11y code that puts the highlighted option in the textbox.
			//		This way screen readers will know what is happening in the
			//		menu.

			if(!node){
				return;
			}
			// pull the text value from the item attached to the DOM node
			var newValue;
			if(node == this.dropDown.nextButton ||
				node == this.dropDown.previousButton){
				newValue = node.innerHTML;
				this.item = undefined;
				this.value = '';
			}else{
				newValue = this.store.getValue(node.item, this.searchAttr).toString();
				this.set('item', node.item, false, newValue);
			}
			// get the text that the user manually entered (cut off autocompleted text)
			this.focusNode.value = this.focusNode.value.substring(0, this._lastInput.length);
			// set up ARIA activedescendant
			dijit.setWaiState(this.focusNode, "activedescendant", dojo.attr(node, "id"));
			// autocomplete the rest of the option to announce change
			this._autoCompleteText(newValue);
		},

		_selectOption: function(/*Event*/ evt){
			// summary:
			//		Menu callback function, called when an item in the menu is selected.
			if(evt){
				this._announceOption(evt.target);
			}
			this.closeDropDown();
			this._setCaretPos(this.focusNode, this.focusNode.value.length);
			dijit.form._FormValueWidget.prototype._setValueAttr.call(this, this.value, true); // set this.value and fire onChange
		},

		_startSearchAll: function(){
			this._startSearch('');
		},

		_startSearchFromInput: function(){
			this._startSearch(this.focusNode.value.replace(/([\\\*\?])/g, "\\$1"));
		},

		_getQueryString: function(/*String*/ text){
			return dojo.string.substitute(this.queryExpr, [text]);
		},

		_startSearch: function(/*String*/ key){
			// summary:
			//		Starts a search for elements matching key (key=="" means to return all items),
			//		and calls _openResultList() when the search completes, to display the results.
			if(!this.dropDown){
				var popupId = this.id + "_popup",
				dropDownConstructor = dojo.getObject(this.dropDownClass, false);
				this.dropDown = new dropDownConstructor({
					onChange: dojo.hitch(this, this._selectOption),
					id: popupId,
					dir: this.dir
				});
				dijit.removeWaiState(this.focusNode,"activedescendant");
				dijit.setWaiState(this.textbox,"owns",popupId); // associate popup with textbox
			}
			// create a new query to prevent accidentally querying for a hidden
			// value from FilteringSelect's keyField
			var query = dojo.clone(this.query); // #5970
			this._lastInput = key; // Store exactly what was entered by the user.
			this._lastQuery = query[this.searchAttr] = this._getQueryString(key);
			// #5970: set _lastQuery, *then* start the timeout
			// otherwise, if the user types and the last query returns before the timeout,
			// _lastQuery won't be set and their input gets rewritten
			this.searchTimer=setTimeout(dojo.hitch(this, function(query, _this){
				this.searchTimer = null;
				var fetch = {
					queryOptions: {
						ignoreCase: this.ignoreCase,
						deep: true
					},
					query: query,
					onBegin: dojo.hitch(this, "_setMaxOptions"),
					onComplete: dojo.hitch(this, "_openResultList"),
					onError: function(errText){
						_this._fetchHandle = null;
						console.error('dijit.form.ComboBox: ' + errText);
						_this.closeDropDown();
					},
					start: 0,
					count: this.pageSize
				};
				dojo.mixin(fetch, _this.fetchProperties);
				this._fetchHandle = _this.store.fetch(fetch);

				var nextSearch = function(dataObject, direction){
					dataObject.start += dataObject.count*direction;
					// #4091:
					//		tell callback the direction of the paging so the screen
					//		reader knows which menu option to shout
					dataObject.direction = direction;
					this._fetchHandle = this.store.fetch(dataObject);
					this.focus();
				};
				this._nextSearch = this.dropDown.onPage = dojo.hitch(this, nextSearch, this._fetchHandle);
			}, query, this), this.searchDelay);
		},

		_setMaxOptions: function(size, request){
			 this._maxOptions = size;
		},

		_getValueField: function(){
			// summary:
			//		Helper for postMixInProperties() to set this.value based on data inlined into the markup.
			//		Returns the attribute name in the item (in dijit.form._ComboBoxDataStore) to use as the value.
			return this.searchAttr;
		},

		//////////// INITIALIZATION METHODS ///////////////////////////////////////

		constructor: function(){
			this.query={};
			this.fetchProperties={};
		},

		postMixInProperties: function(){
			if(!this.store){
				var srcNodeRef = this.srcNodeRef;

				// if user didn't specify store, then assume there are option tags
				this.store = new dijit.form._ComboBoxDataStore(srcNodeRef);

				// if there is no value set and there is an option list, set
				// the value to the first value to be consistent with native
				// Select

				// Firefox and Safari set value
				// IE6 and Opera set selectedIndex, which is automatically set
				// by the selected attribute of an option tag
				// IE6 does not set value, Opera sets value = selectedIndex
				if(!("value" in this.params)){
					var item = (this.item = this.store.fetchSelectedItem());
					if(item){
						var valueField = this._getValueField();
						this.value = this.store.getValue(item, valueField);
					}
				}
			}

			this.inherited(arguments);
		},

		postCreate: function(){
			// summary:
			//		Subclasses must call this method from their postCreate() methods
			// tags:
			//		protected

			// find any associated label element and add to ComboBox node.
			var label=dojo.query('label[for="'+this.id+'"]');
			if(label.length){
				label[0].id = (this.id+"_label");
				dijit.setWaiState(this.domNode, "labelledby", label[0].id);

			}
			this.inherited(arguments);
		},

		_setHasDownArrowAttr: function(val){
			this.hasDownArrow = val;
			this._buttonNode.style.display = val ? "" : "none";
		},

		_getMenuLabelFromItem: function(/*Item*/ item){
			var label = this.labelFunc(item, this.store),
				labelType = this.labelType;
			// If labelType is not "text" we don't want to screw any markup ot whatever.
			if(this.highlightMatch != "none" && this.labelType == "text" && this._lastInput){
				label = this.doHighlight(label, this._escapeHtml(this._lastInput));
				labelType = "html";
			}
			return {html: labelType == "html", label: label};
		},

		doHighlight: function(/*String*/ label, /*String*/ find){
			// summary:
			//		Highlights the string entered by the user in the menu.  By default this
			//		highlights the first occurrence found. Override this method
			//		to implement your custom highlighting.
			// tags:
			//		protected

			var
				// Add (g)lobal modifier when this.highlightMatch == "all" and (i)gnorecase when this.ignoreCase == true
				modifiers = (this.ignoreCase ? "i" : "") + (this.highlightMatch == "all" ? "g" : ""),
				i = this.queryExpr.indexOf("${0}");
			find = dojo.regexp.escapeString(find); // escape regexp special chars
			return this._escapeHtml(label).replace(
				// prepend ^ when this.queryExpr == "${0}*" and append $ when this.queryExpr == "*${0}"
				new RegExp((i == 0 ? "^" : "") + "("+ find +")" + (i == (this.queryExpr.length - 4) ? "$" : ""), modifiers),
				'<span class="dijitComboBoxHighlightMatch">$1</span>'
			); // returns String, (almost) valid HTML (entities encoded)
		},

		_escapeHtml: function(/*String*/ str){
			// TODO Should become dojo.html.entities(), when exists use instead
			// summary:
			//		Adds escape sequences for special characters in XML: &<>"'
			str = String(str).replace(/&/gm, "&amp;").replace(/</gm, "&lt;")
				.replace(/>/gm, "&gt;").replace(/"/gm, "&quot;");
			return str; // string
		},

		reset: function(){
			// Overrides the _FormWidget.reset().
			// Additionally reset the .item (to clean up).
			this.item = null;
			this.inherited(arguments);
		},

		labelFunc: function(/*item*/ item, /*dojo.data.store*/ store){
			// summary:
			//		Computes the label to display based on the dojo.data store item.
			// returns:
			//		The label that the ComboBox should display
			// tags:
			//		private

			// Use toString() because XMLStore returns an XMLItem whereas this
			// method is expected to return a String (#9354)
			return store.getValue(item, this.labelAttr || this.searchAttr).toString(); // String
		}
	}
);

dojo.declare(
	"dijit.form._ComboBoxMenu",
	[dijit._Widget, dijit._Templated, dijit._CssStateMixin],
	{
		// summary:
		//		Focus-less menu for internal use in `dijit.form.ComboBox`
		// tags:
		//		private

		templateString: "<ul class='dijitReset dijitMenu' dojoAttachEvent='onmousedown:_onMouseDown,onmouseup:_onMouseUp,onmouseover:_onMouseOver,onmouseout:_onMouseOut' style='overflow: \"auto\"; overflow-x: \"hidden\";'>"
				+"<li class='dijitMenuItem dijitMenuPreviousButton' dojoAttachPoint='previousButton' role='option'></li>"
				+"<li class='dijitMenuItem dijitMenuNextButton' dojoAttachPoint='nextButton' role='option'></li>"
			+"</ul>",

		// _messages: Object
		//		Holds "next" and "previous" text for paging buttons on drop down
		_messages: null,
		
		baseClass: "dijitComboBoxMenu",

		postMixInProperties: function(){
			this.inherited(arguments);
			this._messages = dojo.i18n.getLocalization("dijit.form", "ComboBox", this.lang);
		},

		buildRendering: function(){
			this.inherited(arguments);

			// fill in template with i18n messages
			this.previousButton.innerHTML = this._messages["previousMessage"];
			this.nextButton.innerHTML = this._messages["nextMessage"];
		},

		_setValueAttr: function(/*Object*/ value){
			this.value = value;
			this.onChange(value);
		},

		// stubs
		onChange: function(/*Object*/ value){
			// summary:
			//		Notifies ComboBox/FilteringSelect that user clicked an option in the drop down menu.
			//		Probably should be called onSelect.
			// tags:
			//		callback
		},
		onPage: function(/*Number*/ direction){
			// summary:
			//		Notifies ComboBox/FilteringSelect that user clicked to advance to next/previous page.
			// tags:
			//		callback
		},

		onClose: function(){
			// summary:
			//		Callback from dijit.popup code to this widget, notifying it that it closed
			// tags:
			//		private
			this._blurOptionNode();
		},

		_createOption: function(/*Object*/ item, labelFunc){
			// summary:
			//		Creates an option to appear on the popup menu subclassed by
			//		`dijit.form.FilteringSelect`.

			var menuitem = dojo.create("li", {
				"class": "dijitReset dijitMenuItem" +(this.isLeftToRight() ? "" : " dijitMenuItemRtl"),
				role: "option"
			});
			var labelObject = labelFunc(item);
			if(labelObject.html){
				menuitem.innerHTML = labelObject.label;
			}else{
				menuitem.appendChild(
					dojo.doc.createTextNode(labelObject.label)
				);
			}
			// #3250: in blank options, assign a normal height
			if(menuitem.innerHTML == ""){
				menuitem.innerHTML = "&nbsp;";
			}
			menuitem.item=item;
			return menuitem;
		},

		createOptions: function(results, dataObject, labelFunc){
			// summary:
			//		Fills in the items in the drop down list
			// results:
			//		Array of dojo.data items
			// dataObject:
			//		dojo.data store
			// labelFunc:
			//		Function to produce a label in the drop down list from a dojo.data item

			//this._dataObject=dataObject;
			//this._dataObject.onComplete=dojo.hitch(comboBox, comboBox._openResultList);
			// display "Previous . . ." button
			this.previousButton.style.display = (dataObject.start == 0) ? "none" : "";
			dojo.attr(this.previousButton, "id", this.id + "_prev");
			// create options using _createOption function defined by parent
			// ComboBox (or FilteringSelect) class
			// #2309:
			//		iterate over cache nondestructively
			dojo.forEach(results, function(item, i){
				var menuitem = this._createOption(item, labelFunc);
				dojo.attr(menuitem, "id", this.id + i);
				this.domNode.insertBefore(menuitem, this.nextButton);
			}, this);
			// display "Next . . ." button
			var displayMore = false;
			//Try to determine if we should show 'more'...
			if(dataObject._maxOptions && dataObject._maxOptions != -1){
				if((dataObject.start + dataObject.count) < dataObject._maxOptions){
					displayMore = true;
				}else if((dataObject.start + dataObject.count) > dataObject._maxOptions && dataObject.count == results.length){
					//Weird return from a datastore, where a start + count > maxOptions
					// implies maxOptions isn't really valid and we have to go into faking it.
					//And more or less assume more if count == results.length
					displayMore = true;
				}
			}else if(dataObject.count == results.length){
				//Don't know the size, so we do the best we can based off count alone.
				//So, if we have an exact match to count, assume more.
				displayMore = true;
			}

			this.nextButton.style.display = displayMore ? "" : "none";
			dojo.attr(this.nextButton,"id", this.id + "_next");
			return this.domNode.childNodes;
		},

		clearResultList: function(){
			// summary:
			//		Clears the entries in the drop down list, but of course keeps the previous and next buttons.
			while(this.domNode.childNodes.length>2){
				this.domNode.removeChild(this.domNode.childNodes[this.domNode.childNodes.length-2]);
			}
			this._blurOptionNode();
		},

		_onMouseDown: function(/*Event*/ evt){
			dojo.stopEvent(evt);
		},

		_onMouseUp: function(/*Event*/ evt){
			if(evt.target === this.domNode || !this._highlighted_option){
				// !this._highlighted_option check to prevent immediate selection when menu appears on top
				// of <input>, see #9898.  Note that _HasDropDown also has code to prevent this.
				return;
			}else if(evt.target == this.previousButton){
				this._blurOptionNode();
				this.onPage(-1);
			}else if(evt.target == this.nextButton){
				this._blurOptionNode();
				this.onPage(1);
			}else{
				var tgt = evt.target;
				// while the clicked node is inside the div
				while(!tgt.item){
					// recurse to the top
					tgt = tgt.parentNode;
				}
				this._setValueAttr({ target: tgt }, true);
			}
		},

		_onMouseOver: function(/*Event*/ evt){
			if(evt.target === this.domNode){ return; }
			var tgt = evt.target;
			if(!(tgt == this.previousButton || tgt == this.nextButton)){
				// while the clicked node is inside the div
				while(!tgt.item){
					// recurse to the top
					tgt = tgt.parentNode;
				}
			}
			this._focusOptionNode(tgt);
		},

		_onMouseOut: function(/*Event*/ evt){
			if(evt.target === this.domNode){ return; }
			this._blurOptionNode();
		},

		_focusOptionNode: function(/*DomNode*/ node){
			// summary:
			//		Does the actual highlight.
			if(this._highlighted_option != node){
				this._blurOptionNode();
				this._highlighted_option = node;
				dojo.addClass(this._highlighted_option, "dijitMenuItemSelected");
			}
		},

		_blurOptionNode: function(){
			// summary:
			//		Removes highlight on highlighted option.
			if(this._highlighted_option){
				dojo.removeClass(this._highlighted_option, "dijitMenuItemSelected");
				this._highlighted_option = null;
			}
		},

		_highlightNextOption: function(){
			// summary:
			// 		Highlight the item just below the current selection.
			// 		If nothing selected, highlight first option.

			// because each press of a button clears the menu,
			// the highlighted option sometimes becomes detached from the menu!
			// test to see if the option has a parent to see if this is the case.
			if(!this.getHighlightedOption()){
				var fc = this.domNode.firstChild;
				this._focusOptionNode(fc.style.display == "none" ? fc.nextSibling : fc);
			}else{
				var ns = this._highlighted_option.nextSibling;
				if(ns && ns.style.display != "none"){
					this._focusOptionNode(ns);
				}else{
					this.highlightFirstOption();
				}
			}
			// scrollIntoView is called outside of _focusOptionNode because in IE putting it inside causes the menu to scroll up on mouseover
			dojo.window.scrollIntoView(this._highlighted_option);
		},

		highlightFirstOption: function(){
			// summary:
			// 		Highlight the first real item in the list (not Previous Choices).
			var first = this.domNode.firstChild;
			var second = first.nextSibling;
			this._focusOptionNode(second.style.display == "none" ? first : second); // remotely possible that Previous Choices is the only thing in the list
			dojo.window.scrollIntoView(this._highlighted_option);
		},

		highlightLastOption: function(){
			// summary:
			// 		Highlight the last real item in the list (not More Choices).
			this._focusOptionNode(this.domNode.lastChild.previousSibling);
			dojo.window.scrollIntoView(this._highlighted_option);
		},

		_highlightPrevOption: function(){
			// summary:
			// 		Highlight the item just above the current selection.
			// 		If nothing selected, highlight last option (if
			// 		you select Previous and try to keep scrolling up the list).
			if(!this.getHighlightedOption()){
				var lc = this.domNode.lastChild;
				this._focusOptionNode(lc.style.display == "none" ? lc.previousSibling : lc);
			}else{
				var ps = this._highlighted_option.previousSibling;
				if(ps && ps.style.display != "none"){
					this._focusOptionNode(ps);
				}else{
					this.highlightLastOption();
				}
			}
			dojo.window.scrollIntoView(this._highlighted_option);
		},

		_page: function(/*Boolean*/ up){
			// summary:
			//		Handles page-up and page-down keypresses

			var scrollamount = 0;
			var oldscroll = this.domNode.scrollTop;
			var height = dojo.style(this.domNode, "height");
			// if no item is highlighted, highlight the first option
			if(!this.getHighlightedOption()){
				this._highlightNextOption();
			}
			while(scrollamount<height){
				if(up){
					// stop at option 1
					if(!this.getHighlightedOption().previousSibling ||
						this._highlighted_option.previousSibling.style.display == "none"){
						break;
					}
					this._highlightPrevOption();
				}else{
					// stop at last option
					if(!this.getHighlightedOption().nextSibling ||
						this._highlighted_option.nextSibling.style.display == "none"){
						break;
					}
					this._highlightNextOption();
				}
				// going backwards
				var newscroll=this.domNode.scrollTop;
				scrollamount+=(newscroll-oldscroll)*(up ? -1:1);
				oldscroll=newscroll;
			}
		},

		pageUp: function(){
			// summary:
			//		Handles pageup keypress.
			//		TODO: just call _page directly from handleKey().
			// tags:
			//		private
			this._page(true);
		},

		pageDown: function(){
			// summary:
			//		Handles pagedown keypress.
			//		TODO: just call _page directly from handleKey().
			// tags:
			//		private
			this._page(false);
		},

		getHighlightedOption: function(){
			// summary:
			//		Returns the highlighted option.
			var ho = this._highlighted_option;
			return (ho && ho.parentNode) ? ho : null;
		},

		handleKey: function(evt){
			// summary:
			//		Handle keystroke event forwarded from ComboBox, returning false if it's
			//		a keystroke I recognize and process, true otherwise.
			switch(evt.charOrCode){
				case dojo.keys.DOWN_ARROW:
					this._highlightNextOption();
					return false;
				case dojo.keys.PAGE_DOWN:
					this.pageDown();
					return false;
				case dojo.keys.UP_ARROW:
					this._highlightPrevOption();
					return false;
				case dojo.keys.PAGE_UP:
					this.pageUp();
					return false;
				default:
					return true;
			}
		}
	}
);

dojo.declare(
	"dijit.form.ComboBox",
	[dijit.form.ValidationTextBox, dijit.form.ComboBoxMixin],
	{
		// summary:
		//		Auto-completing text box, and base class for dijit.form.FilteringSelect.
		//
		// description:
		//		The drop down box's values are populated from an class called
		//		a data provider, which returns a list of values based on the characters
		//		that the user has typed into the input box.
		//		If OPTION tags are used as the data provider via markup,
		//		then the OPTION tag's child text node is used as the widget value
		//		when selected.  The OPTION tag's value attribute is ignored.
		//		To set the default value when using OPTION tags, specify the selected
		//		attribute on 1 of the child OPTION tags.
		//
		//		Some of the options to the ComboBox are actually arguments to the data
		//		provider.

		_setValueAttr: function(/*String*/ value, /*Boolean?*/ priorityChange, /*String?*/ displayedValue){
			// summary:
			//		Hook so set('value', value) works.
			// description:
			//		Sets the value of the select.
			this._set("item", null); // value not looked up in store
			if(!value){ value = ''; } // null translates to blank
			dijit.form.ValidationTextBox.prototype._setValueAttr.call(this, value, priorityChange, displayedValue);
		}
	}
);

dojo.declare("dijit.form._ComboBoxDataStore", null, {
	// summary:
	//		Inefficient but small data store specialized for inlined `dijit.form.ComboBox` data
	//
	// description:
	//		Provides a store for inlined data like:
	//
	//	|	<select>
	//	|		<option value="AL">Alabama</option>
	//	|		...
	//
	//		Actually. just implements the subset of dojo.data.Read/Notification
	//		needed for ComboBox and FilteringSelect to work.
	//
	//		Note that an item is just a pointer to the <option> DomNode.

	constructor: function( /*DomNode*/ root){
		this.root = root;
		if(root.tagName != "SELECT" && root.firstChild){
			root = dojo.query("select", root);
			if(root.length > 0){ // SELECT is a child of srcNodeRef
				root = root[0];
			}else{ // no select, so create 1 to parent the option tags to define selectedIndex
				this.root.innerHTML = "<SELECT>"+this.root.innerHTML+"</SELECT>";
				root = this.root.firstChild;
			}
			this.root = root;
		}
		dojo.query("> option", root).forEach(function(node){
			//	TODO: this was added in #3858 but unclear why/if it's needed;  doesn't seem to be.
			//	If it is needed then can we just hide the select itself instead?
			//node.style.display="none";
			node.innerHTML = dojo.trim(node.innerHTML);
		});

	},

	getValue: function(	/*item*/ item,
						/*attribute-name-string*/ attribute,
						/*value?*/ defaultValue){
		return (attribute == "value") ? item.value : (item.innerText || item.textContent || '');
	},

	isItemLoaded: function(/*anything*/ something){
		return true;
	},

	getFeatures: function(){
		return {"dojo.data.api.Read": true, "dojo.data.api.Identity": true};
	},

	_fetchItems: function(	/*Object*/ args,
							/*Function*/ findCallback,
							/*Function*/ errorCallback){
		// summary:
		//		See dojo.data.util.simpleFetch.fetch()
		if(!args.query){ args.query = {}; }
		if(!args.query.name){ args.query.name = ""; }
		if(!args.queryOptions){ args.queryOptions = {}; }
		var matcher = dojo.data.util.filter.patternToRegExp(args.query.name, args.queryOptions.ignoreCase),
			items = dojo.query("> option", this.root).filter(function(option){
				return (option.innerText || option.textContent || '').match(matcher);
			} );
		if(args.sort){
			items.sort(dojo.data.util.sorter.createSortFunction(args.sort, this));
		}
		findCallback(items, args);
	},

	close: function(/*dojo.data.api.Request || args || null*/ request){
		return;
	},

	getLabel: function(/*item*/ item){
		return item.innerHTML;
	},

	getIdentity: function(/*item*/ item){
		return dojo.attr(item, "value");
	},

	fetchItemByIdentity: function(/*Object*/ args){
		// summary:
		//		Given the identity of an item, this method returns the item that has
		//		that identity through the onItem callback.
		//		Refer to dojo.data.api.Identity.fetchItemByIdentity() for more details.
		//
		// description:
		//		Given arguments like:
		//
		//	|		{identity: "CA", onItem: function(item){...}
		//
		//		Call `onItem()` with the DOM node `<option value="CA">California</option>`
		var item = dojo.query("> option[value='" + args.identity + "']", this.root)[0];
		args.onItem(item);
	},

	fetchSelectedItem: function(){
		// summary:
		//		Get the option marked as selected, like `<option selected>`.
		//		Not part of dojo.data API.
		var root = this.root,
			si = root.selectedIndex;
		return typeof si == "number"
			? dojo.query("> option:nth-child(" + (si != -1 ? si+1 : 1) + ")", root)[0]
			: null;	// dojo.data.Item
	}
});
//Mix in the simple fetch implementation to this class.
dojo.extend(dijit.form._ComboBoxDataStore,dojo.data.util.simpleFetch);


return dijit.form.ComboBox;
});
