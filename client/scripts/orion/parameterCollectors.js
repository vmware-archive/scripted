/*******************************************************************************
 * @license
 * Copyright (c) 2011 IBM Corporation and others.
 * All rights reserved. This program and the accompanying materials are made 
 * available under the terms of the Eclipse Public License v1.0 
 * (http://www.eclipse.org/legal/epl-v10.html), and the Eclipse Distribution 
 * License v1.0 (http://www.eclipse.org/org/documents/edl-v10.html). 
 *
 * Contributors:
 *     IBM Corporation - initial API and implementation
 *******************************************************************************/
/*global window document define login logout localStorage orion */
/*browser:true*/

define(['require', 'dojo', 'dijit', 'orion/commands', 'orion/util', 'dijit/Menu', 'dijit/MenuItem', 'dijit/form/DropDownButton'], 
        function(require, dojo, dijit, mCommands, mUtil){

	
	/**
	 * Constructs a new command parameter collector
	 * @class CommandParameterCollector can collect parameters in a way that is integrated with the 
	 * common header elements of pages or sections.
	 * @name orion.parameterCollectors.CommandParameterCollector
	 */	
	function CommandParameterCollector () {
		this._activeContainer = null;
	}
	
	CommandParameterCollector.prototype =  {
	
		/**
		 * Closes any active parameter collectors
		 */
		close: function () {
			if (this._activeElements) {
				if (this._activeElements.parameterArea) {
					dojo.empty(this._activeElements.parameterArea);
				}
				if (this._activeElements.parameterContainer) {
					dojo.removeClass(this._activeElements.parameterContainer, "slideActive");
					dojo.removeClass(this._activeElements.slideContainer, "slideContainerActive");
				}
				if (this._activeElements.dismissArea) {
					 dojo.empty(this._activeElements.dismissArea);
				}
				if (this._activeElements.commandNode) {
					dojo.removeClass(this._activeElements.commandNode, "activeCommand");
				}
				mUtil.forceLayout(this._activeElements.parameterContainer);
				if (this._activeElements.onClose) {
					this._activeElements.onClose();
				}
				if (this._oldFocusNode) {
					this._oldFocusNode.focus();
					this._oldFocusNode = null;
				}
			}
			this._activeElements = null;
		},
		
		_findParameterElements: function(commandOrToolbar) {
			var elements = {};
			var toolbarNode = null;
			if (typeof commandOrToolbar === "string") {
				commandOrToolbar = dojo.byId(commandOrToolbar);
			}
			var node = commandOrToolbar;
			// the trickiest part is finding where to start looking (section or main toolbar).
			// We need to walk up until we find a "toolComposite"

			while (node) {
				if (dojo.hasClass(node, "toolComposite")) {
					toolbarNode = node;
					break;
				}
				node = node.parentNode;
			}
			if (dojo.hasClass(commandOrToolbar, "commandMarker")) {
				elements.commandNode = commandOrToolbar;
			}
			if (toolbarNode) {
				elements.slideContainer = dojo.query(".slideParameters", toolbarNode)[0];
				elements.parameterContainer = dojo.query(".slide", toolbarNode)[0];
				elements.parameterArea = dojo.query(".parameters", toolbarNode)[0];
				elements.dismissArea = dojo.query(".parametersDismiss", toolbarNode)[0];
			}
			return elements;
		},
		
		/**
		 * Open a parameter collector and return the dom node where parameter 
		 * information should be inserted
		 *
		 * @param {String|DOMElement} commandNode the node containing the triggering command
		 * @param {Function} fillFunction a function that will fill the parameter area
		 * @param {Function} onClose a function that will be called when the parameter area is closed
		 */
		open: function(commandNode, fillFunction, onClose) {
			if (typeof commandNode === "string") {
				commandNode = dojo.byId(commandNode);
			}
			this.close();
			this._activeElements = null;
			// determine  the closest parameter container to the command.
			this._activeElements = this._findParameterElements(commandNode);
			if (this._activeElements && this._activeElements.parameterArea && this._activeElements.slideContainer && this._activeElements.parameterContainer) {
				this._activeElements.onClose = onClose;
				var focusNode = fillFunction(this._activeElements.parameterArea);
				var close = dojo.query("#closebox", this._activeElements.parameterArea);
				if (close.length === 0) {
					// add the close button if the fill function did not.
					var dismiss = this._activeElements.dismissArea || this._activeElements.parameterArea;
					close = dojo.create("span", {id: "closebox", role: "button", tabindex: "0"}, dismiss, "last");
					dojo.addClass(close, "imageSprite");
					dojo.addClass(close, "core-sprite-close");
					dojo.addClass(close, "dismiss");
					close.title = "Close";
					dojo.connect(close, "onclick", dojo.hitch(this, function(event) {
						this.close();
					}));

					// onClick events do not register for spans when using the keyboard without a screen reader
					dojo.connect(close, "onkeypress", dojo.hitch(this, function (e) {
						if(e.keyCode === dojo.keys.ENTER || e.charCode === dojo.keys.SPACE) {
							this.close();
						}
					}));
				}
				// all parameters have been generated.  Activate the area.
				dojo.addClass(this._activeElements.slideContainer, "slideContainerActive");
				dojo.addClass(this._activeElements.parameterContainer, "slideActive");
				mUtil.forceLayout(this._activeElements.parameterContainer);
				if (focusNode) {
					this._oldFocusNode = window.document.activeElement;
					window.setTimeout(function() {
						focusNode.focus();
						focusNode.select();
					}, 0);
				}
				if (this._activeElements.commandNode) {
					dojo.addClass(this._activeElements.commandNode, "activeCommand");
				}
				return true;
			}
			return false;
		},
		
		_collectAndCall: function(commandInvocation, parent) {
			dojo.query("input", parent).forEach(function(field) {
				if (field.type !== "button") {
					commandInvocation.parameters.setValue(field.parameterName, field.value);
				}
			});
			if (commandInvocation.command.callback) {
				commandInvocation.command.callback.call(commandInvocation.handler, commandInvocation);
			}

		},
		
		/**
		 * Collect parameters for the given command.
		 * 
		 * @param {orion.commands.CommandInvocation} the command invocation
		 * @returns {Boolean} whether or not required parameters were collected.
		 */
		collectParameters: function(commandInvocation) {
			if (commandInvocation.parameters) {
				if (commandInvocation.domNode) {
					dojo.addClass(commandInvocation.domNode, "commandMarker");
				}
				return this.open(commandInvocation.domNode || commandInvocation.domParent, this.getFillFunction(commandInvocation));
			}
			return false;
		},
		
		/**
		 * Returns a function that can be used to fill a specified parent node with parameter information.
		 *
		 * @param {orion.commands.CommandInvocation} the command invocation used when gathering parameters
		 * @param {Function} an optional function called when the area must be closed. 
		 * @returns {Function} a function that can fill the specified dom node with parameter collection behavior
		 */
		 getFillFunction: function(commandInvocation, closeFunction) {
			return dojo.hitch(this, function(parameterArea) {
				var first = null;
				var localClose = dojo.hitch(this, function() {
					if (closeFunction) {
						closeFunction();
					} 
					this.close();
				});
				var keyHandler = dojo.hitch(this, function(event) {
					if (event.keyCode === dojo.keys.ENTER) {
						this._collectAndCall(commandInvocation, parameterArea);
					}
					if (event.keyCode === dojo.keys.ESCAPE || event.keyCode === dojo.keys.ENTER) {
						localClose();
						dojo.stopEvent(event);
					}
				});
				commandInvocation.parameters.forEach(function(parm) {
					if (parm.label) {
						dojo.create("label", {innerHTML: parm.label, "for": parm.name + "parameterCollector"}, parameterArea, "last");
					} 
					var field = dojo.create("input", {type: parm.type, id: parm.name + "parameterCollector"}, parameterArea, "last");
					dojo.addClass(field, "parameterInput");
					// we define special classes for some parameter types
					dojo.addClass(field, "parameterInput"+parm.type);
					field.setAttribute("speech", "speech");
					field.setAttribute("x-webkit-speech", "x-webkit-speech");
					field.parameterName = parm.name;
					if (!first) {
						first = field;
					}
					if (parm.value) {
						field.value = parm.value;
					}
					dojo.connect(field, "onkeypress", keyHandler);
				});
				var parentDismiss = parameterArea;
				var finish = function (collector) {
					collector._collectAndCall(commandInvocation, parameterArea);
					localClose();
				};

				if (commandInvocation.parameters.hasOptionalParameters()) {
					commandInvocation.parameters.optionsRequested = false;
					
					var options = dojo.create("span", {role: "button", tabindex: "0"}, parentDismiss, "last");
					dojo.place(window.document.createTextNode("More"), options, "last");
					dojo.addClass(options, "dismiss");
					dojo.connect(options, "onclick", dojo.hitch(this, function() {
						commandInvocation.parameters.optionsRequested = true;
						finish(this);
					}));
					// onClick events do not register for spans when using the keyboard without a screen reader
					dojo.connect(options, "onkeypress", dojo.hitch(this, function (e) {
						if(e.keyCode === dojo.keys.ENTER  || e.charCode === dojo.keys.SPACE) {			
							commandInvocation.parameters.optionsRequested = true;
							finish(this);
						}
					}));
				}
				// OK and cancel buttons
				var ok = dojo.create("span", {role: "button", tabindex: "0"}, parentDismiss, "last");
				dojo.place(window.document.createTextNode("Submit"), ok, "last");
				dojo.addClass(ok, "dismiss");
				dojo.connect(ok, "onclick", dojo.hitch(this, function() {
					finish(this);
				}));
				// onClick events do not register for spans when using the keyboard without a screen reader
				dojo.connect(ok, "onkeypress", dojo.hitch(this, function (e) {
					if(e.keyCode === dojo.keys.ENTER  || e.charCode === dojo.keys.SPACE) {
						finish(this);
					}
				}));
				
				var close = dojo.create("span", {id: "closebox", role: "button", tabindex: "0"}, parentDismiss, "last");
				dojo.addClass(close, "imageSprite");
				dojo.addClass(close, "core-sprite-close");
				dojo.addClass(close, "dismiss");
				close.title = "Close";
				dojo.connect(close, "onclick", dojo.hitch(this, function(event) {
					localClose();
				}));

				// onClick events do not register for spans when using the keyboard without a screen reader
				dojo.connect(close, "onkeypress", dojo.hitch(this, function (e) {
					if(e.keyCode === dojo.keys.ENTER  || e.charCode === dojo.keys.SPACE) {
						localClose();
					}
				}));
				return first;
			});
		 }
	};
	CommandParameterCollector.prototype.constructor = CommandParameterCollector;
	
	//return the module exports
	return {
		CommandParameterCollector: CommandParameterCollector
	};
});
