define("dijit/form/FilteringSelect", ["dojo", "dijit", "dijit/form/ComboBox"], function(dojo, dijit) {

dojo.declare(
	"dijit.form.FilteringSelect",
	[dijit.form.MappedTextBox, dijit.form.ComboBoxMixin],
	{
		// summary:
		//		An enhanced version of the HTML SELECT tag, populated dynamically
		//
		// description:
		//		An enhanced version of the HTML SELECT tag, populated dynamically. It works
		//		very nicely with very large data sets because it can load and page data as needed.
		//		It also resembles ComboBox, but does not allow values outside of the provided ones.
		//		If OPTION tags are used as the data provider via markup, then the
		//		OPTION tag's child text node is used as the displayed value when selected
		//		while the OPTION tag's value attribute is used as the widget value on form submit.
		//		To set the default value when using OPTION tags, specify the selected
		//		attribute on 1 of the child OPTION tags.
		//
		//		Similar features:
		//			- There is a drop down list of possible values.
		//			- You can only enter a value from the drop down list.  (You can't
		//				enter an arbitrary value.)
		//			- The value submitted with the form is the hidden value (ex: CA),
		//				not the displayed value a.k.a. label (ex: California)
		//
		//		Enhancements over plain HTML version:
		//			- If you type in some text then it will filter down the list of
		//				possible values in the drop down list.
		//			- List can be specified either as a static list or via a javascript
		//				function (that can get the list from a server)

		// required: Boolean
		//		True (default) if user is required to enter a value into this field.
		required: true,

		_lastDisplayedValue: "",

		_isValidSubset: function(){
			return this._opened;
		},

		isValid: function(){
			// Overrides ValidationTextBox.isValid()
			return this.item || (!this.required && this.get('displayedValue') == ""); // #5974
		},

		_refreshState: function(){
			if(!this.searchTimer){ // state will be refreshed after results are returned
				this.inherited(arguments);
			}
		},

		_callbackSetLabel: function(
						/*Array*/ result,
						/*Object*/ dataObject,
						/*Boolean?*/ priorityChange){
			// summary:
			//		Callback from dojo.data after lookup of user entered value finishes

			// setValue does a synchronous lookup,
			// so it calls _callbackSetLabel directly,
			// and so does not pass dataObject
			// still need to test against _lastQuery in case it came too late
			if((dataObject && dataObject.query[this.searchAttr] != this._lastQuery) || (!dataObject && result.length && this.store.getIdentity(result[0]) != this._lastQuery)){
				return;
			}
			if(!result.length){
				//#3268: don't modify display value on bad input
				//#3285: change CSS to indicate error
				this.valueNode.value = "";
				dijit.form.TextBox.superclass._setValueAttr.call(this, "", priorityChange || (priorityChange === undefined && !this._focused));
				this._set("item", null);
				this.validate(this._focused);
			}else{
				this.set('item', result[0], priorityChange);
			}
		},

		_openResultList: function(/*Object*/ results, /*Object*/ dataObject){
			// Callback when a data store query completes.
			// Overrides ComboBox._openResultList()

			// #3285: tap into search callback to see if user's query resembles a match
			if(dataObject.query[this.searchAttr] != this._lastQuery){
				return;
			}
			dijit.form.ComboBoxMixin.prototype._openResultList.apply(this, arguments);

			if(this.item === undefined){ // item == undefined for keyboard search
				// If the search returned no items that means that the user typed
				// in something invalid (and they can't make it valid by typing more characters),
				// so flag the FilteringSelect as being in an invalid state
				this.validate(true);
			}
		},

		_getValueAttr: function(){
			// summary:
			//		Hook for get('value') to work.

			// don't get the textbox value but rather the previously set hidden value.
			// Use this.valueNode.value which isn't always set for other MappedTextBox widgets until blur
			return this.valueNode.value;
		},

		_getValueField: function(){
			// Overrides ComboBox._getValueField()
			return "value";
		},

		_setValueAttr: function(/*String*/ value, /*Boolean?*/ priorityChange){
			// summary:
			//		Hook so set('value', value) works.
			// description:
			//		Sets the value of the select.
			//		Also sets the label to the corresponding value by reverse lookup.
			if(!this._onChangeActive){ priorityChange = null; }
			this._lastQuery = value;

			if(value === null || value === ''){
				this._setDisplayedValueAttr('', priorityChange);
				return;
			}

			//#3347: fetchItemByIdentity if no keyAttr specified
			var self = this;
			this.store.fetchItemByIdentity({
				identity: value,
				onItem: function(item){
					self._callbackSetLabel(item? [item] : [], undefined, priorityChange);
				}
			});
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
			this.inherited(arguments);
			this.valueNode.value = this.value;
			this._lastDisplayedValue = this.textbox.value;
		},

		_getDisplayQueryString: function(/*String*/ text){
			return text.replace(/([\\\*\?])/g, "\\$1");
		},

		_setDisplayedValueAttr: function(/*String*/ label, /*Boolean?*/ priorityChange){
			// summary:
			//		Hook so set('displayedValue', label) works.
			// description:
			//		Sets textbox to display label. Also performs reverse lookup
			//		to set the hidden value.  label should corresponding to item.searchAttr.

			if(label == null){ label = ''; }

			// This is called at initialization along with every custom setter.
			// Usually (or always?) the call can be ignored.   If it needs to be
			// processed then at least make sure that the XHR request doesn't trigger an onChange()
			// event, even if it returns after creation has finished
			if(!this._created){
				if(!("displayedValue" in this.params)){
					return;
				}
				priorityChange = false;
			}

			// Do a reverse lookup to map the specified displayedValue to the hidden value.
			// Note that if there's a custom labelFunc() this code
			if(this.store){
				this.closeDropDown();
				var query = dojo.clone(this.query); // #6196: populate query with user-specifics
				// escape meta characters of dojo.data.util.filter.patternToRegExp().
				this._lastQuery = query[this.searchAttr] = this._getDisplayQueryString(label);
				// If the label is not valid, the callback will never set it,
				// so the last valid value will get the warning textbox.   Set the
				// textbox value now so that the impending warning will make
				// sense to the user
				this.textbox.value = label;
				this._lastDisplayedValue = label;
				this._set("displayedValue", label);	// for watch("displayedValue") notification
				var _this = this;
				var fetch = {
					query: query,
					queryOptions: {
						ignoreCase: this.ignoreCase,
						deep: true
					},
					onComplete: function(result, dataObject){
						_this._fetchHandle = null;
						dojo.hitch(_this, "_callbackSetLabel")(result, dataObject, priorityChange);
					},
					onError: function(errText){
						_this._fetchHandle = null;
						console.error('dijit.form.FilteringSelect: ' + errText);
						dojo.hitch(_this, "_callbackSetLabel")([], undefined, false);
					}
				};
				dojo.mixin(fetch, this.fetchProperties);
				this._fetchHandle = this.store.fetch(fetch);
			}
		},

		undo: function(){
			this.set('displayedValue', this._lastDisplayedValue);
		}
	}
);


return dijit.form.FilteringSelect;
});
