define("dijit/ProgressBar", ["dojo", "dijit", "text!dijit/templates/ProgressBar.html", "dojo/fx", "dojo/number", "dijit/_Widget", "dijit/_Templated"], function(dojo, dijit) {

dojo.declare("dijit.ProgressBar", [dijit._Widget, dijit._Templated], {
	// summary:
	//		A progress indication widget, showing the amount completed
	//		(often the percentage completed) of a task.
	//
	// example:
	// |	<div dojoType="ProgressBar"
	// |		 places="0"
	// |		 value="..." maximum="...">
	// |	</div>

	// progress: [const] String (Percentage or Number)
	//		Number or percentage indicating amount of task completed.
	// 		Deprecated.   Use "value" instead.
	progress: "0",

	// value: String (Percentage or Number)
	//		Number or percentage indicating amount of task completed.
	// 		With "%": percentage value, 0% <= progress <= 100%, or
	// 		without "%": absolute value, 0 <= progress <= maximum.
	//		Infinity means that the progress bar is indeterminate.
	value: "",

	// maximum: [const] Float
	//		Max sample number
	maximum: 100,

	// places: [const] Number
	//		Number of places to show in values; 0 by default
	places: 0,

	// indeterminate: [const] Boolean
	// 		If false: show progress value (number or percentage).
	// 		If true: show that a process is underway but that the amount completed is unknown.
	// 		Deprecated.   Use "value" instead.
	indeterminate: false,

	// label: String?
	//		Label on progress bar.   Defaults to percentage for determinate progress bar and
	//		blank for indeterminate progress bar.
	label:"",

	// name: String
	//		this is the field name (for a form) if set. This needs to be set if you want to use
	//		this widget in a dijit.form.Form widget (such as dijit.Dialog)
	name: '',

	templateString: dojo.cache("dijit", "templates/ProgressBar.html"),

	// _indeterminateHighContrastImagePath: [private] dojo._URL
	//		URL to image to use for indeterminate progress bar when display is in high contrast mode
	_indeterminateHighContrastImagePath:
		dojo.moduleUrl("dijit", "themes/a11y/indeterminate_progress.gif"),

	postMixInProperties: function(){
		this.inherited(arguments);
		if(!("value" in this.params)){
			this.value = this.indeterminate ? Infinity : this.progress;
		}
	},

	buildRendering: function(){
		this.inherited(arguments);
		this.indeterminateHighContrastImage.setAttribute("src",
			this._indeterminateHighContrastImagePath.toString());
		this.update();
	},

	update: function(/*Object?*/attributes){
		// summary:
		//		Internal method to change attributes of ProgressBar, similar to set(hash).  Users should call
		//		set("value", ...) rather than calling this method directly.
		// attributes:
		//		May provide progress and/or maximum properties on this parameter;
		//		see attribute specs for details.
		// example:
		//	|	myProgressBar.update({'indeterminate': true});
		//	|	myProgressBar.update({'progress': 80});
		//	|	myProgressBar.update({'indeterminate': true, label:"Loading ..." })
		// tags:
		//		private

		// TODO: deprecate this method and use set() instead

		dojo.mixin(this, attributes || {});
		var tip = this.internalProgress, ap = this.domNode;
		var percent = 1;
		if(this.indeterminate){
			dijit.removeWaiState(ap, "valuenow");
			dijit.removeWaiState(ap, "valuemin");
			dijit.removeWaiState(ap, "valuemax");
		}else{
			if(String(this.progress).indexOf("%") != -1){
				percent = Math.min(parseFloat(this.progress)/100, 1);
				this.progress = percent * this.maximum;
			}else{
				this.progress = Math.min(this.progress, this.maximum);
				percent = this.progress / this.maximum;
			}

			dijit.setWaiState(ap, "describedby", this.labelNode.id);
			dijit.setWaiState(ap, "valuenow", this.progress);
			dijit.setWaiState(ap, "valuemin", 0);
			dijit.setWaiState(ap, "valuemax", this.maximum);
		}
		this.labelNode.innerHTML = this.report(percent);

		dojo.toggleClass(this.domNode, "dijitProgressBarIndeterminate", this.indeterminate);
		tip.style.width = (percent * 100) + "%";
		this.onChange();
	},

	_setValueAttr: function(v){
		this._set("value", v);
		if(v == Infinity){
			this.update({indeterminate:true});
		}else{
			this.update({indeterminate:false, progress:v});
		}
	},

	_setLabelAttr: function(label){
		this._set("label", label);
		this.update();
	},

	_setIndeterminateAttr: function(indeterminate){
		// Deprecated, use set("value", ...) instead
		this.indeterminate = indeterminate;
		this.update();
	},

	report: function(/*float*/percent){
		// summary:
		//		Generates message to show inside progress bar (normally indicating amount of task completed).
		//		May be overridden.
		// tags:
		//		extension

		return this.label ? this.label :
				(this.indeterminate ? "&nbsp;" : dojo.number.format(percent, { type: "percent", places: this.places, locale: this.lang }));
	},

	onChange: function(){
		// summary:
		//		Callback fired when progress updates.
		// tags:
		//		extension
	}
});


return dijit.ProgressBar;
});
