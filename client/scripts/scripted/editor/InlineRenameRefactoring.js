define(['orion/textview/keyBinding','scripted/markoccurrences','plugins/esprima/refactoringSupport','scripted/editor/annotationManager','orion/textview/annotations'],
function(keyBinding, markoccurrences, refactoringSupport, annotationManager, orionAnnotationModule) {

	var State = { INACTIVE: 1, ACTIVE: 2 };

	annotationManager.registerAnnotationType('scripted.renameRefactoring',false);

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
				console.log("rename refactoring activated");

				// Locate the place where the selected text exists in the file
				var model = this._editor.getModel();
				var selectedText=model.getText(selection.start,selection.end);
				console.log("Selection is >"+selectedText+"<");


				var lexicalRefactoring = false;
				if (lexicalRefactoring) {
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
				} else {
					annotationManager.ensureEditorConfiguredWithAnnotations(this._editor);
					var text = this._editor.getText();
					var refs = refactoringSupport.findVarReferences(text, {start:selection.start,end:selection.end});
					if (refs == null) {
						console.log("No references returned for renaming");
						return;
					}
					this.word = this._editor.getText(selection.start,selection.end);
					this.selectionStart = selection.start;
					this.matches = [];
					var annos=[];
					for (var r=0;r<refs.length;r++) {
						var offset = refs[r].start;
						this.matches.push(offset);
						if (offset==selection.start) {
							this.matchNumber = r;
						}
						var orionAnnot = orionAnnotationModule.AnnotationType.createAnnotation('scripted.renameRefactoring', offset, offset+this.word.length, "renaming");
						annos.push(orionAnnot);
//						annos.push({ type: 'scripted.renameRefactoring', start: offset, end: offset+this.word.length, text: "rename change"});
					}
					var annotationModel = this._editor.getAnnotationModel();
//					console.log("new annotations are "+JSON.stringify(annos));
					this._currentAnnos = annos;
					annotationModel.replaceAnnotations(null,annos);
					console.log("Locs for refactoring are "+JSON.stringify(this.matches));
				}
				this.typed = '';

				this._textView.addKeyPressHandler(this._inlineRenameRefactoringMode);
				this._setState(State.ACTIVE);
				this._undoStack.startCompoundChange();

			}
		},
		deactivate: function () {
			var removed = this._textView.removeKeyPressHandler(this._inlineRenameRefactoringMode);
			console.log("rename refactoring deactivated (successfully unplugged="+removed+")");
			this._setState(State.INACTIVE);
		},
		isActive: function() {
			return this._state === State.ACTIVE;
		},
		_setState: function(state) {
			var eventType;
			this._state = state;
			this._onStateChange(state);
		},
		_onStateChange: function(state) {
			if (state===State.INACTIVE) {
				this._editor.selectionMatcher.activate();
				var annotationModel = this._editor.getAnnotationModel();
				annotationModel.removeAnnotations('scripted.renameRefactoring');
			} else {
				this._editor.selectionMatcher.deactivate();
			}
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

//			console.log("key was >"+key+"<");

			var replacementLength = word.length;
			if (typed.length>0) {
				replacementLength = typed.length;
			}
			typed = typed+ch;
			this._inlineRenameRefactoring.typed = typed;
			var newAnnos = [];
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
				var orionAnnot = orionAnnotationModule.AnnotationType.createAnnotation(
					'scripted.renameRefactoring', loc, loc+typed.length, "renaming");
				newAnnos.push(orionAnnot);
//				console.log('replace at '+loc);
				tv._modifyContent({text: typed, start: loc, end: loc+replacementLength, _ignoreDOMSelection: true}, true);
			}
			var annotationModel = this._inlineRenameRefactoring._editor.getAnnotationModel();
			annotationModel.replaceAnnotations(this._inlineRenameRefactoring._currentAnnos,newAnnos);
			this._inlineRenameRefactoring._currentAnnos = newAnnos;


			return true;
		},
		lineUp: function() {
			this.cancel();
			return false;
		},
		lineDown: function() {
			this.cancel();
			return false;
		},
		_complete: function() {
			this._undoStack.endCompoundChange();
			this._inlineRenameRefactoring.deactivate();
			var locations = this._inlineRenameRefactoring.matches;
			var matchNumber = this._inlineRenameRefactoring.matchNumber;
			var word = this._inlineRenameRefactoring.word;
			var caret = locations[matchNumber] - matchNumber*(word.length-1)+ matchNumber*(this._inlineRenameRefactoring.typed.length-1);
			var tv = this._inlineRenameRefactoring._textView;
			tv.setCaretOffset(caret);
		},
		enter: function() {
			this._complete();
			return true;
		},
		tab: function() {
			this._complete();
			return true;
		}
	};

	return {
		InlineRenameRefactoring:InlineRenameRefactoring
	};

});
