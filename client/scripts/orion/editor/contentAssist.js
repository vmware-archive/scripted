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
	 * Set of styles available for proposals.  The key corresponds to the value of the 'style' 
	 * property of the proposal.  The value corresponds to a css class for styling that proposal.
	 */
	var STYLES = {
		selected : " selected", // leading space is important
		hr : "proposal-hr",
		emphasis : "proposal-emphasis",
		noemphasis : "proposal-noemphasis",
		dfault : "proposal-default" // also used if no style is specified
	};

	var Promise = (function() {
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
	}());

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
		this.contentAssistPanel = typeof contentAssistId === "string" ? document.getElementById(contentAssistId) : contentAssistId;
		this.active = false;
		this.providers = [];
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
					// Start waiting for selection
					self.expectingSelection = event;
				}
				self.ignoreNextChange = false;
			},
			onScroll: function(event) {
				self.cancel();
			},
			onSelection: function(event) {
				if (self.expectingSelection) {
					self.showContentAssist(true);
				} else {
					self.cancel();
				}
				self.expectingSelection = false;
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
					var prevSibling = selected.previousSibling;
					while (prevSibling.unselectable && prevSibling.previousSibling) {
						prevSibling = prevSibling.previousSibling;
					}
					this.setSelected(prevSibling);
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
					var nextSibling = selected.nextSibling;
					while (nextSibling.unselectable && nextSibling.nextSibling) {
						nextSibling = nextSibling.nextSibling;
					}
					this.setSelected(nextSibling);
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

			var offset = this.textView.getCaretOffset();
			var data = {
				proposal: proposal,
				start: offset,
				end: offset
			};
			this.dispatchEvent({type: "accept", data: data });
			return true;
		},
		/** @private */
		setSelected: function(/** DOMNode */ node) {
			var nodes = this.contentAssistPanel.childNodes;
			for (var i=0; i < nodes.length; i++) {
				var child = nodes[i];
				var selIndex = child.className.indexOf(STYLES.selected);
				if (selIndex >= 0) {
					child.className = child.className.substring(0, selIndex) + 
							child.className.substring(selIndex + STYLES.selected.length);
				}
				if (child === node) {
					child.className = child.className + STYLES.selected;
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
				if (nodes[i].className.indexOf(STYLES.selected) >= 0) {
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
		 */
		showContentAssist: function(enable) {
			if (!this.contentAssistPanel) {
				return;
			}
			var eventType = enable ? "show" : "hide";
			this.dispatchEvent({type: eventType, data: null});
			
			if (!enable) {
				if (this.listenerAdded) {
					this.textView.removeEventListener("ModelChanging", this.contentAssistListener.onModelChanging);
					this.textView.removeEventListener("ModelChanged", this.contentAssistListener.onModelChanged);
					this.textView.removeEventListener("MouseUp", this.contentAssistListener.onMouseUp);
					this.textView.removeEventListener("Selection", this.contentAssistListener.onSelection);
					this.textView.removeEventListener("Scroll", this.contentAssistListener.onScroll);
					this.listenerAdded = false;
				}
				this.active = false;
				this.contentAssistPanel.style.display = "none";
				this.contentAssistPanel.onclick = null;
			} else {
				var offset = this.textView.getCaretOffset();
				this.getProposals(offset).then(
					function(proposals) {
						this.proposals = proposals;
						if (this.proposals.length === 0) {
							this.cancel();
							return;
						}
						var caretLocation = this.textView.getLocationAtOffset(offset);
						caretLocation.y += this.textView.getLineHeight();
						this.contentAssistPanel.innerHTML = "";
						for (var i = 0; i < this.proposals.length; i++) {
							this.createDiv(this.proposals[i], i===0, this.contentAssistPanel);
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
							this.textView.addEventListener("MouseUp", this.contentAssistListener.onMouseUp);
							this.textView.addEventListener("Selection", this.contentAssistListener.onSelection);
							this.textView.addEventListener("Scroll", this.contentAssistListener.onScroll);
						}
						this.listenerAdded = true;
						this.contentAssistPanel.onclick = this.click.bind(this);
						this.active = true;
					}.bind(this));
			}
		},
		/** @private */
		getPrefixStart: function(end) {
			var index = end, c;
			while (index > 0 && ((97 <= (c = this.textView.getText(index - 1, index).charCodeAt(0)) && c <= 122) || (65 <= c && c <= 90) || c === 95 || (48 <= c && c <= 57))) { //LETTER OR UNDERSCORE OR NUMBER
				index--;
			}
			return index;
		},
		/** @private */
		createDiv: function(proposal, isSelected, parent) {
			var div = document.createElement("div");
			var node;
			if (proposal.style === "hr") {
				node = document.createElement("hr");
			} else {
				div.className = this.calculateClasses(proposal.style, isSelected);
				node = document.createTextNode(this.getDisplayString(proposal));
			}
			div.unselectable = proposal.unselectable || proposal.style === "hr";
			div.appendChild(node, div);
			parent.appendChild(div);
		},
		
		/** @private */
		calculateClasses : function(style, isSelected) {
			var cssClass = STYLES[style];
			if (!cssClass) {
				cssClass = STYLES.dfault;
			}
			return isSelected ? cssClass + STYLES.selected : cssClass;
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
		/**
		 * @param {String} offset The caret offset.
		 * @returns {Object} A promise that will provide the proposals.
		 */
		getProposals: function(offset) {
			var proposals = [],
			    numComplete = 0,
			    promise = new Promise(),
			    providers = this.providers;
			function collectProposals(result) {
				if (result) {
					proposals = proposals.concat(result);
				}
				if (++numComplete === providers.length) {
					promise.done(proposals);
				}
			}
			function errback() {
				if (++numComplete === providers.length) {
					promise.done(proposals);
				}
			}
			var textView = this.textView, textModel = textView.getModel();
			var buffer = textView.getText();
			var context = {
				line: textModel.getLine(textModel.getLineAtOffset(offset)),
				prefix: textView.getText(this.getPrefixStart(offset), offset),
				selection: textView.getSelection()
			};
			for (var i=0; i < providers.length; i++) {
				var provider = providers[i];
				//prefer computeProposals but support getProposals for backwards compatibility
				var proposalsFunc = provider.getProposals;
				if (typeof provider.computeProposals === "function") {
					proposalsFunc = provider.computeProposals;
				}
				var proposalsPromise = proposalsFunc.apply(provider, [buffer, offset, context]);
				if (proposalsPromise && proposalsPromise.then) {
					proposalsPromise.then(collectProposals, errback);
				} else {
					collectProposals(proposalsPromise);
				}
			}
			return promise;
		},
		/**
		 * Sets the content assist providers that we will consult to obtain proposals.
		 * @param {Object[]} providers The providers.
		 */
		setProviders: function(providers) {
			this.providers = providers.slice(0);
		}
	};
	mEventTarget.EventTarget.addMixin(ContentAssist.prototype);
	
	return {ContentAssist: ContentAssist};
});
