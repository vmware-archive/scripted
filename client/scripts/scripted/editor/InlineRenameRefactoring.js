define(['orion/textview/keyBinding','scripted/markoccurrences'],
function(keyBinding,markoccurrences) {

	var State = { INACTIVE: 1, ACTIVE: 2 };

	function InlineRenameRefactoring(editor,undoStack,linkedMode) {
		this._undoStack = undoStack;
		this._linkedMode = linkedMode;
		this._editor = editor;
		this._textView = editor.getTextView();
		this._inlineRenameRefactoringMode = new InlineRenameRefactoringMode(this,undoStack);
		this._state = State.INACTIVE;
		var self = this;

		this._editor.pushKeyMode(this._inlineRenameRefactoringMode);
		this._textView.setKeyBinding(new keyBinding.KeyBinding('r', false, true, false, true), "rename");
		this._textView.setAction("rename", function() {
			self.activate();
			return true;
		}, {name: "rename"});
	}

	InlineRenameRefactoring.prototype = {
		activate: function() {
			var selection = this._editor.getSelection();
			if (selection.start===selection.end) {
				console.log("rename only activates on selection");
				return;
			}
			if (this._state === State.INACTIVE) {
				console.log("activated");
				this._textView.addKeyPressHandler(this._inlineRenameRefactoringMode);
				this._setState(State.ACTIVE);

				// Locate the place where the selected text exists in the file
				var model = this._editor.getModel();
				var selectedText=model.getText(selection.start,selection.end);
				console.log("Selection is >"+selectedText+"<");

				this._undoStack.startCompoundChange();
				var matcher = new markoccurrences.SelectionMatcher();
				var results = matcher.findMatches(selection.start,selection.end,this._editor.getText());
				if (results.matches) {
					console.log("word >"+results.word+"< matchcount=#"+results.matches.length);
					for (var m=0;m<results.matches.length;m++) {
						console.log("Match at position "+results.matches[m]);
						if (results.matches[m]===selection.start) {
							results.matchNumber = m;
							console.log("selection is match "+m);
						}
					}
				}
				this.matches = results.matches;
				this.selectionStart =selection.start;
				this.matchNumber = results.matchNumber;
				this.word = results.word;
				this.typed = '';
			}
		},
		deactivate: function () {
			var removed = this._textView.removeKeyPressHandler(this._inlineRenameRefactoringMode);
			console.log("deactivated (successfully unplugged="+removed+")");
			this._setState(State.INACTIVE);
		},
		isActive: function() {
			return this._state === State.ACTIVE;
		},
		_setState: function(state) {
			var eventType;
//			if (state === State.ACTIVE) {
//				eventType = "Activating";
//			} else if (state === State.INACTIVE) {
//				eventType = "Deactivating";
//			}
//			if (eventType) {
//				this.dispatchEvent({type: eventType});
//			}
			this._state = state;
			this._onStateChange(state);
		},
		_onStateChange: function(state) {
//			if (_state === State.INACTIVE) {
//				if (this.listenerAdded) {
//					this.textView.removeEventListener("ModelChanging", this.contentAssistListener.onModelChanging);
//					this.textView.removeEventListener("Scroll", this.contentAssistListener.onScroll);
//					this.textView.removeEventListener("Selection", this.contentAssistListener.onSelection);
//					this.listenerAdded = false;
//				}
//			} else if (_state === State.ACTIVE) {
//				if (!this.listenerAdded) {
//					this.textView.addEventListener("ModelChanging", this.contentAssistListener.onModelChanging);
//					this.textView.addEventListener("Scroll", this.contentAssistListener.onScroll);
//					this.textView.addEventListener("Selection", this.contentAssistListener.onSelection);
//					this.listenerAdded = true;
//				}
//				this.computeProposals();
//			}
		}
	};

	function InlineRenameRefactoringMode(inlineRenameRefactoring,undoStack) {
		this._inlineRenameRefactoring = inlineRenameRefactoring;
		this._undoStack = undoStack;
	}

	InlineRenameRefactoringMode.prototype = {
		isActive: function() {
			return this._inlineRenameRefactoring.isActive();
		},
		cancel: function() {
			this._undoStack.undo();
			this._inlineRenameRefactoring.deactivate();
			return true;
		},

		handleKeyPress: function(e) {
			var key = (e.charCode !== undefined ? e.charCode : e.keyCode);
			var ch = String.fromCharCode(key);


			var locations = this._inlineRenameRefactoring.matches;
			var word = this._inlineRenameRefactoring.word;
			var tv = this._inlineRenameRefactoring._textView;
			var typed = this._inlineRenameRefactoring.typed;

			console.log("key was >"+key+"<");

			var replacementLength = word.length;
			if (typed.length>0) {
				replacementLength = typed.length;
			}
			typed = typed+ch;
			this._inlineRenameRefactoring.typed = typed;
			var offset = 0;
			for (var m=0;m<locations.length;m++) {
				var loc = locations[m];
				if (typed.length===1) {
					// first char, so replacing full words
					loc = loc - m*(replacementLength-typed.length);
				} else {
					// subsequent char, so replacing what was previously typed
					loc = loc - m*(word.length-1)+ m*(typed.length-1);
				}
//				console.log('replace at '+loc);
				tv._modifyContent({text: typed, start: loc, end: loc+replacementLength, _ignoreDOMSelection: true}, true);
			}
			return true;
//			var selection = editor.getSelection();
//
//				// TODO think about using the styler for bracket searching
////				var styler = editor.getTextStyler();
////				console.log("styler "+styler);
//
//
//				if (selection.start===selection.end) {
//					var model = editor.getModel();
//					var caretPos = editor.getCaretOffset();
//					var lineNum = model.getLineAtOffset(caretPos);
//					if (lineNum>0) {
//						var linetext = model.getLine(lineNum,false);
//						var options = textview.getOptions("tabSize", "expandTab"); //$NON-NLS-1$ //$NON-NLS-0$
//						var tabtext = options.expandTab ? new Array(options.tabSize + 1).join(" ") : "\t"; //$NON-NLS-1$ //$NON-NLS-0$
//						if (this._isAllWhitespace(linetext)) {
//							if (this._endsWith(linetext,tabtext)) {
//								// check the previous line
//								var unindent = false;
//								var previouslinetext=model.getLine(lineNum-1,false);
//								var previouslinelength = previouslinetext.length;
//								// If the line before starts with the same amount of whitespace, probably worth unindenting:
//								if (previouslinelength>linetext.length && previouslinetext.indexOf(linetext)===0 &&
//									!this._isWhitespace(previouslinetext.charAt(linetext.length)) &&
//									previouslinetext.charAt(previouslinetext.length-1)!=='{') {
//									unindent = true;
//								}
//								// if the line before ends with a '{' unindent
//								if (previouslinelength>0 && previouslinetext.charAt(previouslinetext.length-1)==='{' &&
//									linetext.length>this._posOfFirstNonwhitespace(previouslinetext)) {
//									unindent = true;
//									// TODO unindent to same level?
//								}
//
//								if (unindent) {
//									// replace the 'tab' with the '}' and be done.
//									textview._modifyContent({text: '}', start: selection.start-tabtext.length, end: selection.end, _ignoreDOMSelection: true}, true);
//									return true;
//								}
//							}
//						}
//					}
		},
//		lineUp: function() {
//			var newSelected = (this.selectedIndex === 0) ? this.proposals.length - 1 : this.selectedIndex - 1;
//			while (this.proposals[newSelected].unselectable && newSelected > 0) {
//				newSelected--;
//			}
//			this.selectedIndex = newSelected;
//			if (this.widget) {
//				this.widget.setSelectedIndex(this.selectedIndex);
//			}
//			return true;
//		},
//		lineDown: function() {
//			var newSelected = (this.selectedIndex === this.proposals.length - 1) ? 0 : this.selectedIndex + 1;
//			while (this.proposals[newSelected].unselectable && newSelected < this.proposals.length-1) {
//				newSelected++;
//			}
//			this.selectedIndex = newSelected;
//			if (this.widget) {
//				this.widget.setSelectedIndex(this.selectedIndex);
//			}
//			return true;
//		},
		enter: function() {
			this._undoStack.endCompoundChange();
			this._inlineRenameRefactoring.deactivate();
			var locations = this._inlineRenameRefactoring.matches;
			var matchNumber = this._inlineRenameRefactoring.matchNumber;
			var word = this._inlineRenameRefactoring.word;
			var caret = locations[matchNumber] - matchNumber*(word.length-1)+ matchNumber*(this._inlineRenameRefactoring.typed.length-1);
			var tv = this._inlineRenameRefactoring._textView;
			tv.setCaretOffset(caret);
			return true;
		},
		tab: function() {
			this._undoStack.endCompoundChange();
			this._inlineRenameRefactoring.deactivate();
			return true;
		}
	};

	return {
		InlineRenameRefactoring:InlineRenameRefactoring
	};

});
