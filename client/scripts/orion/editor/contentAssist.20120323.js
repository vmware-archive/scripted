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
/*global define */
/*jslint maxerr:150 browser:true devel:true */

define("orion/editor/contentAssist", ['i18n!orion/editor/nls/messages', 'orion/textview/keyBinding', 'orion/textview/eventTarget'], function(messages, mKeyBinding, mEventTarget) {

	/**
	 * @name orion.editor.ContentAssist
	 * @class A key mode for {@link orion.editor.Editor} that displays content assist suggestions.
	 * @description Creates a <code>ContentAssist</code>. A ContentAssist displays suggestions from registered content assist providers
	 * to the user. Content assist providers are registered by calling {@link #setProviders}.</p>
	 * <p>A ContentAssist emits events, for which listeners may be registered using {@link #addEventListener}. Supported event types are:</p>
	 * <dl>
	 * <dt><code>show</code></dt> <dd>Dispatched when this ContentAssist is activated.</dd>
	 * <dt><code>hide</code></dt> <dd>Dispatched when this ContentAssist is dismissed.</dd>
	 * <dt><code>accept</code></dt> <dd>Dispatched when a proposal has been accepted by the user. The event's <code>data</code> field
	 * contains information about the accepted proposal.</dd>
	 * </dl>
	 * @param {orion.editor.Editor} editor The Editor to provide content assist for.
	 * @param {String|DomNode} contentAssistId The ID or DOMNode to use as the parent for content assist.
	 *
	 * @borrows orion.textview.EventTarget#addEventListener as #addEventListener
	 * @borrows orion.textview.EventTarget#removeEventListener as #removeEventListener
	 * @borrows orion.textview.EventTarget#dispatchEvent as #dispatchEvent
	 */
	function ContentAssist(editor, contentAssistId) {
		this.editor = editor;
		this.textView = editor.getTextView();
		this.contentAssistPanel = document.getElementById(contentAssistId);
		this.active = false;
		this.prefix = "";
		
		this.filteredProviders = [];
		
		this.proposals = [];
		var self = this;
		this.contentAssistListener = {
			onModelChanging: function(event) {
				self.ignoreNextChange = self.isIgnorable(event);
			},
			onModelChanged: function(event) {
				if (self.ignoreNextChange) {
					self.cancel();
				} else {
					self.showContentAssist(true, event);
				}
				self.ignoreNextChange = false;
			},
			onScroll: function(event) {
				self.cancel();
			},
			onMouseUp: function(event) {
				// ignore the event if this is a click inside of the contentAssistPanel
				// the click is handled by the accept function
				if (event.event.target.parentElement !== self.contentAssistPanel) {
					self.cancel();
				}
			}
		};
		this.init();
	}
	ContentAssist.prototype = /** @lends orion.editor.ContentAssist.prototype */ {
		/** @private */
		init: function() {
			var isMac = navigator.platform.indexOf("Mac") !== -1;
			this.textView.setKeyBinding(isMac ? new mKeyBinding.KeyBinding(' ', false, false, false, true) : new mKeyBinding.KeyBinding(' ', true), messages.contentAssist);
			this.textView.setAction(messages.contentAssist, function() {
				this.showContentAssist(true);
				return true;
			}.bind(this));
		},
		/** @private */
		cancel: function() {
			this.showContentAssist(false);
		},
		/** @private */
		isActive: function() {
			return this.active;
		},
		/** @private */
		isIgnorable: function(/**orion.textview.ModelChangingEvent*/ event) {
			var deletion = event.removedCharCount > 0 && event.addedCharCount === 0,
			    view = this.textView,
			    overWhitespace = (event.start+1 <= view.getModel().getCharCount()) && /^\s*$/.test(view.getText(event.start, event.start+1));
			return (event.removedLineCount > 0) || (deletion && overWhitespace);
		},
		/** @private */
		lineUp: function() {
			if (this.contentAssistPanel) {
				var selected = this.getSelectedNode();
				if (selected === this.contentAssistPanel.firstChild) {
					this.setSelected(this.contentAssistPanel.lastChild);
				} else {
					this.setSelected(selected.previousSibling);
				}
				return true;
			}
		},
		/** @private */
		lineDown: function() {
			if (this.contentAssistPanel) {
				var selected = this.getSelectedNode();
				if (selected === this.contentAssistPanel.lastChild) {
					this.setSelected(this.contentAssistPanel.firstChild);
				} else {
					this.setSelected(selected.nextSibling);
				}
				return true;
			}
		},
		/** @private */
		enter: function() {
			if (this.contentAssistPanel) {
				return this.accept();
			} else {
				return false;
			}
		},
		/**
		 * Accepts the currently selected proposal, if any.
		 * @returns {Boolean} <code>true</code> if a proposal could be accepted; <code>false</code> if none was selected or available.
		 */
		accept: function() {
			var proposal = this.getSelectedProposal();
			if (proposal === null) {
				return false;
			}
			this.ignoreNextChange = true;
			this.cancel();
			var data = {
				proposal: proposal,
				start: this.textView.getCaretOffset() - this.prefix.length,
				end: this.textView.getCaretOffset()
			};
			this.dispatchEvent({type: "accept", data: data });
			return true;
		},
		/** @private */
		setSelected: function(/** DOMNode */ node) {
			var nodes = this.contentAssistPanel.childNodes;
			for (var i=0; i < nodes.length; i++) {
				var child = nodes[i];
				if (child.className === "selected") {
					child.className = "";
				}
				if (child === node) {
					child.className = "selected";
					child.focus();
					if (child.offsetTop < this.contentAssistPanel.scrollTop) {
						child.scrollIntoView(true);
					} else if ((child.offsetTop + child.offsetHeight) > (this.contentAssistPanel.scrollTop + this.contentAssistPanel.clientHeight)) {
						child.scrollIntoView(false);
					}
				}
			}
		},
		/** @returns {DOMNode} The DOM node of the currently selected proposal. */
		getSelectedNode: function() {
			var index = this.getSelectedIndex();
			return index === -1 ? null : this.contentAssistPanel.childNodes[index];
		},
		/**
		 * @private
		 * @returns {Number} The index of the currently selected proposal.
		 */
		getSelectedIndex: function() {
			var nodes = this.contentAssistPanel.childNodes;
			for (var i=0; i < nodes.length; i++) {
				if (nodes[i].className === "selected") {
					return i;
				}
			}
			return -1;
		},
		/** @returns {Object} The currently selected proposal. */
		getSelectedProposal: function() {
			var index = this.getSelectedIndex();
			return index === -1 ? null : this.proposals[index];
		},
		/** @private */
		click: function(e) {
			this.setSelected(e.target);
			this.accept();
			this.editor.getTextView().focus();
		},
		/**
		 * @param {Boolean} enable
		 * @param {orion.textview.ModelChangedEvent} [event]
		 */
		showContentAssist: function(enable, event) {
			if (!this.contentAssistPanel) {
				return;
			}
			var eventType = enable ? "show" : "hide";
			this.dispatchEvent({type: eventType, data: null});
			
			if (!enable) {
				if (this.listenerAdded) {
					this.textView.removeEventListener("ModelChanging", this.contentAssistListener.onModelChanging);
					this.textView.removeEventListener("ModelChanged", this.contentAssistListener.onModelChanged);
					this.textView.removeEventListener("Scroll", this.contentAssistListener.onScroll);
					this.textView.removeEventListener("MouseUp", this.contentAssistListener.onMouseUp);
					this.listenerAdded = false;
				}
				this.active = false;
				this.contentAssistPanel.style.display = "none";
				this.contentAssistPanel.onclick = null;
			} else {
				var offset = event ? (event.start + event.addedCharCount) : this.textView.getCaretOffset();
				var index = offset;
				var c;
				while (index > 0 && ((97 <= (c = this.textView.getText(index - 1, index).charCodeAt(0)) && c <= 122) || (65 <= c && c <= 90) || c === 95 || (48 <= c && c <= 57))) { //LETTER OR UNDERSCORE OR NUMBER
					index--;
				}
				
				// Show all proposals
//				if (index === offset) {
//					return;
//				}
				this.prefix = this.textView.getText(index, offset);
				
				var buffer = this.textView.getText(),
				    selection = this.textView.getSelection();

				/**
				 * Bug/feature: The selection returned by the textView doesn't seem to be updated before notifying the listeners
				 * of onModelChanged. If content assist is triggered by Ctrl+Space, the start/end position of the selection
				 * (i.e. the caret position) is correct. But if the user then starts to type some text (in order to filter the
				 * the completion proposals list by a prefix) - i.e. onModelChanged listeners are notified and, in turn,
				 * this method - the selection is not up-to-date. Because of that, I just did a simple hack of adding the offset
				 * field for selection, which is computed above and is always correct. The selection is passed to the content
				 * assist providers.
				 */
				selection.offset = offset;

				/**
				 * Each element of the keywords array returned by content assist providers may be either:
				 * - String: a simple string proposal
				 * - Object: must have a property "proposal" giving the proposal string. May also have other fields, which 
				 * can trigger linked mode behavior in the editor.
				 */
				this.getKeywords(this.prefix, buffer, selection).then(
					function(keywords) {
						this.proposals = [];
						for (var i = 0; i < keywords.length; i++) {
							var proposal = keywords[i];
							if (proposal === null || proposal === undefined) {
								continue;
							}
							if (this.matchesPrefix(proposal) || this.matchesPrefix(proposal.proposal)) {
								this.proposals.push(proposal);
							}
						}
						if (this.proposals.length === 0) {
							this.cancel();
							return;
						}
						
						var caretLocation = this.textView.getLocationAtOffset(offset);
						caretLocation.y += this.textView.getLineHeight();
						this.contentAssistPanel.innerHTML = "";
						for (i = 0; i < this.proposals.length; i++) {
							this.createDiv(this.getDisplayString(this.proposals[i]), i===0, this.contentAssistPanel);
						}
						this.textView.convert(caretLocation, "document", "page");
						this.contentAssistPanel.style.position = "absolute";
						this.contentAssistPanel.style.left = caretLocation.x + "px";
						this.contentAssistPanel.style.top = caretLocation.y + "px";
						this.contentAssistPanel.style.display = "block";
						this.contentAssistPanel.scrollTop = 0;

						// Make sure that the panel is never outside the viewport
						var viewportWidth = document.documentElement.clientWidth,
						    viewportHeight =  document.documentElement.clientHeight;
						if (caretLocation.y + this.contentAssistPanel.offsetHeight > viewportHeight) {
							this.contentAssistPanel.style.top = (caretLocation.y - this.contentAssistPanel.offsetHeight - this.textView.getLineHeight()) + "px";
						}
						if (caretLocation.x + this.contentAssistPanel.offsetWidth > viewportWidth) {
							this.contentAssistPanel.style.left = (viewportWidth - this.contentAssistPanel.offsetWidth) + "px";
						}

						if (!this.listenerAdded) {
							this.textView.addEventListener("ModelChanging", this.contentAssistListener.onModelChanging);
							this.textView.addEventListener("ModelChanged", this.contentAssistListener.onModelChanged);
							this.textView.addEventListener("Scroll", this.contentAssistListener.onScroll);
							this.textView.addEventListener("MouseUp", this.contentAssistListener.onMouseUp);
						}
						this.listenerAdded = true;
						this.contentAssistPanel.onclick = this.click.bind(this);
						this.active = true;
					}.bind(this));
			}
		},
		/** @private */
		createDiv: function(proposal, isSelected, parent) {
			var div = document.createElement("div");
			if (isSelected) {
				div.className = "selected";
			}
			var textNode = document.createTextNode(proposal);
			div.appendChild(textNode, div);
			parent.appendChild(div);
		},
		/** @private */
		getDisplayString: function(proposal) {
			//for simple string content assist, the display string is just the proposal
			if (typeof proposal === "string") {
				return proposal;
			}
			//return the description if applicable
			if (proposal.description && typeof proposal.description === "string") {
				return proposal.description;
			}
			//by default return the straight proposal text
			return proposal.proposal;
		},
		/** @private */
		matchesPrefix: function(str) {
			return typeof str === "string" && str.substr(0, this.prefix.length) === this.prefix;
		},
		/**
		 * @param {String} prefix A prefix against which content assist proposals should be evaluated.
		 * @param {String} buffer The entire buffer being edited.
		 * @param {orion.textview.Selection} selection The current selection from the Editor.
		 * @returns {Object} A promise that will provide the keywords.
		 */
		getKeywords: function(prefix, buffer, selection) {
			var keywords = [],
			    numComplete = 0,
			    promise = new this.Promise(),
			    filteredProviders = this.filteredProviders;
			function collectKeywords(result) {
				if (result) {
					keywords = keywords.concat(result);
				}
				if (++numComplete === filteredProviders.length) {
					promise.done(keywords);
				}
			}
			function errback() {
				if (++numComplete === filteredProviders.length) {
					promise.done(keywords);
				}
			}
			
			for (var i=0; i < filteredProviders.length; i++) {
				var provider = filteredProviders[i];
				//prefer computeProposals but support getKeywords for backwards compatibility
				var proposalsFunc = provider.getKeywords;
				if (typeof provider.computeProposals === "function") {
					proposalsFunc = provider.computeProposals;
				}
				var keywordsPromise = proposalsFunc.apply(provider, [prefix, buffer, selection]);
				if (keywordsPromise && keywordsPromise.then) {
					keywordsPromise.then(collectKeywords, errback);
				} else {
					collectKeywords(keywordsPromise);
				}
			}
			return promise;
		},
		/** @private */
		Promise: (function() {
			function Promise() {
			}
			Promise.prototype.then = function(callback) {
				this.callback = callback;
				if (this.result) {
					var promise = this;
					setTimeout(function() { promise.callback(promise.result); }, 0);
				}
			};
			Promise.prototype.done = function(result) {
				this.result = result;
				if (this.callback) {
					this.callback(this.result);
				}
			};
			return Promise;
		}()),
		/**
		 * Sets the content assist providers that we will consult to obtain proposals.
		 * @param {Object[]} providers The providers. See {@link orion.contentAssist.CssContentAssistProvider} for an example.
		 */
		setProviders: function(providers) {
			this.filteredProviders = providers;
		}
	};
	mEventTarget.EventTarget.addMixin(ContentAssist.prototype);
	
	return {ContentAssist: ContentAssist};
});

