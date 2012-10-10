/*******************************************************************************
 * @license
 * Copyright (c) 2010, 2011 IBM Corporation and others.
 * All rights reserved. This program and the accompanying materials are made 
 * available under the terms of the Eclipse Public License v1.0 
 * (http://www.eclipse.org/legal/epl-v10.html), and the Eclipse Distribution 
 * License v1.0 (http://www.eclipse.org/org/documents/edl-v10.html). 
 * 
 * Contributors: IBM Corporation - initial API and implementation
 *               Alex Lakatos - fix for bug#369781
 ******************************************************************************/

/*global document window navigator define */

define("examples/textview/textStyler", ['i18n!orion/textview/nls/messages', 'orion/textview/annotations'], function(messages, mAnnotations) {

	var JS_KEYWORDS =
		["break",
		 "case", "class", "catch", "continue", "const", 
		 "debugger", "default", "delete", "do",
		 "else", "enum", "export", "extends",  
		 "false", "finally", "for", "function",
		 "if", "implements", "import", "in", "instanceof", "interface", 
		 "let",
		 "new", "null",
		 "package", "private", "protected", "public",
		 "return", 
		 "static", "super", "switch",
		 "this", "throw", "true", "try", "typeof",
		 "undefined",
		 "var", "void",
		 "while", "with",
		 "yield"];

	var JAVA_KEYWORDS =
		["abstract",
		 "boolean", "break", "byte",
		 "case", "catch", "char", "class", "continue",
		 "default", "do", "double",
		 "else", "extends",
		 "false", "final", "finally", "float", "for",
		 "if", "implements", "import", "instanceof", "int", "interface",
		 "long",
		 "native", "new", "null",
		 "package", "private", "protected", "public",
		 "return",
		 "short", "static", "super", "switch", "synchronized",
		 "this", "throw", "throws", "transient", "true", "try",
		 "void", "volatile",
		 "while"];

	var CSS_KEYWORDS =
		["alignment-adjust", "alignment-baseline", "animation", "animation-delay", "animation-direction", "animation-duration",
		 "animation-iteration-count", "animation-name", "animation-play-state", "animation-timing-function", "appearance",
		 "azimuth", "backface-visibility", "background", "background-attachment", "background-clip", "background-color",
		 "background-image", "background-origin", "background-position", "background-repeat", "background-size", "baseline-shift",
		 "binding", "bleed", "bookmark-label", "bookmark-level", "bookmark-state", "bookmark-target", "border", "border-bottom",
		 "border-bottom-color", "border-bottom-left-radius", "border-bottom-right-radius", "border-bottom-style", "border-bottom-width",
		 "border-collapse", "border-color", "border-image", "border-image-outset", "border-image-repeat", "border-image-slice",
		 "border-image-source", "border-image-width", "border-left", "border-left-color", "border-left-style", "border-left-width",
		 "border-radius", "border-right", "border-right-color", "border-right-style", "border-right-width", "border-spacing", "border-style",
		 "border-top", "border-top-color", "border-top-left-radius", "border-top-right-radius", "border-top-style", "border-top-width",
		 "border-width", "bottom", "box-align", "box-decoration-break", "box-direction", "box-flex", "box-flex-group", "box-lines",
		 "box-ordinal-group", "box-orient", "box-pack", "box-shadow", "box-sizing", "break-after", "break-before", "break-inside",
		 "caption-side", "clear", "clip", "color", "color-profile", "column-count", "column-fill", "column-gap", "column-rule",
		 "column-rule-color", "column-rule-style", "column-rule-width", "column-span", "column-width", "columns", "content", "counter-increment",
		 "counter-reset", "crop", "cue", "cue-after", "cue-before", "cursor", "direction", "display", "dominant-baseline",
		 "drop-initial-after-adjust", "drop-initial-after-align", "drop-initial-before-adjust", "drop-initial-before-align", "drop-initial-size",
		 "drop-initial-value", "elevation", "empty-cells", "fit", "fit-position", "flex-align", "flex-flow", "flex-inline-pack", "flex-order",
		 "flex-pack", "float", "float-offset", "font", "font-family", "font-size", "font-size-adjust", "font-stretch", "font-style",
		 "font-variant", "font-weight", "grid-columns", "grid-rows", "hanging-punctuation", "height", "hyphenate-after",
		 "hyphenate-before", "hyphenate-character", "hyphenate-lines", "hyphenate-resource", "hyphens", "icon", "image-orientation",
		 "image-rendering", "image-resolution", "inline-box-align", "left", "letter-spacing", "line-height", "line-stacking",
		 "line-stacking-ruby", "line-stacking-shift", "line-stacking-strategy", "list-style", "list-style-image", "list-style-position",
		 "list-style-type", "margin", "margin-bottom", "margin-left", "margin-right", "margin-top", "mark", "mark-after", "mark-before",
		 "marker-offset", "marks", "marquee-direction", "marquee-loop", "marquee-play-count", "marquee-speed", "marquee-style", "max-height",
		 "max-width", "min-height", "min-width", "move-to", "nav-down", "nav-index", "nav-left", "nav-right", "nav-up", "opacity", "orphans",
		 "outline", "outline-color", "outline-offset", "outline-style", "outline-width", "overflow", "overflow-style", "overflow-x",
		 "overflow-y", "padding", "padding-bottom", "padding-left", "padding-right", "padding-top", "page", "page-break-after", "page-break-before",
		 "page-break-inside", "page-policy", "pause", "pause-after", "pause-before", "perspective", "perspective-origin", "phonemes", "pitch",
		 "pitch-range", "play-during", "position", "presentation-level", "punctuation-trim", "quotes", "rendering-intent", "resize",
		 "rest", "rest-after", "rest-before", "richness", "right", "rotation", "rotation-point", "ruby-align", "ruby-overhang", "ruby-position",
		 "ruby-span", "size", "speak", "speak-header", "speak-numeral", "speak-punctuation", "speech-rate", "stress", "string-set", "table-layout",
		 "target", "target-name", "target-new", "target-position", "text-align", "text-align-last", "text-decoration", "text-emphasis",
		 "text-height", "text-indent", "text-justify", "text-outline", "text-shadow", "text-transform", "text-wrap", "top", "transform",
		 "transform-origin", "transform-style", "transition", "transition-delay", "transition-duration", "transition-property",
		 "transition-timing-function", "unicode-bidi", "vertical-align", "visibility", "voice-balance", "voice-duration", "voice-family",
		 "voice-pitch", "voice-pitch-range", "voice-rate", "voice-stress", "voice-volume", "volume", "white-space", "white-space-collapse",
		 "widows", "width", "word-break", "word-spacing", "word-wrap", "z-index"
		];

	// Scanner constants
	var UNKOWN = 1;
	var KEYWORD = 2;
	var STRING = 3;
	var SINGLELINE_COMMENT = 4;
	var MULTILINE_COMMENT = 5;
	var DOC_COMMENT = 6;
	var WHITE = 7;
	var WHITE_TAB = 8;
	var WHITE_SPACE = 9;
	var HTML_MARKUP = 10;
	var DOC_TAG = 11;
	var TASK_TAG = 12;

	// Styles 
	var singleCommentStyle = {styleClass: "token_singleline_comment"};
	var multiCommentStyle = {styleClass: "token_multiline_comment"};
	var docCommentStyle = {styleClass: "token_doc_comment"};
	var htmlMarkupStyle = {styleClass: "token_doc_html_markup"};
	var tasktagStyle = {styleClass: "token_task_tag"};
	var doctagStyle = {styleClass: "token_doc_tag"};
	var stringStyle = {styleClass: "token_string"};
	var keywordStyle = {styleClass: "token_keyword"};
	var spaceStyle = {styleClass: "token_space"};
	var tabStyle = {styleClass: "token_tab"};
	var caretLineStyle = {styleClass: "line_caret"};
	
	function Scanner (keywords, whitespacesVisible) {
		this.keywords = keywords;
		this.whitespacesVisible = whitespacesVisible;
		this.setText("");
	}
	
	Scanner.prototype = {
		getOffset: function() {
			return this.offset;
		},
		getStartOffset: function() {
			return this.startOffset;
		},
		getData: function() {
			return this.text.substring(this.startOffset, this.offset);
		},
		getDataLength: function() {
			return this.offset - this.startOffset;
		},
		_default: function(c) {
			var keywords = this.keywords;
			switch (c) {
				case 32: // SPACE
				case 9: // TAB
					if (this.whitespacesVisible) {
						return c === 32 ? WHITE_SPACE : WHITE_TAB;
					}
					do {
						c = this._read();
					} while(c === 32 || c === 9);
					this._unread(c);
					return WHITE;
				case 123: // {
				case 125: // }
				case 40: // (
				case 41: // )
				case 91: // [
				case 93: // ]
				case 60: // <
				case 62: // >
					// BRACKETS
					return c;
				default:
					var isCSS = this.isCSS;
					if ((97 <= c && c <= 122) || (65 <= c && c <= 90) || c === 95 || (48 <= c && c <= 57) || (0x2d === c && isCSS)) { //LETTER OR UNDERSCORE OR NUMBER
						var off = this.offset - 1;
						do {
							c = this._read();
						} while((97 <= c && c <= 122) || (65 <= c && c <= 90) || c === 95 || (48 <= c && c <= 57) || (0x2d === c && isCSS));  //LETTER OR UNDERSCORE OR NUMBER
						this._unread(c);
						if (keywords.length > 0) {
							var word = this.text.substring(off, this.offset);
							//TODO slow
							for (var i=0; i<keywords.length; i++) {
								if (this.keywords[i] === word) { return KEYWORD; }
							}
						}
					}
					return UNKOWN;
			}
		},
		_read: function() {
			if (this.offset < this.text.length) {
				return this.text.charCodeAt(this.offset++);
			}
			return -1;
		},
		_unread: function(c) {
			if (c !== -1) { this.offset--; }
		},
		nextToken: function() {
			this.startOffset = this.offset;
			while (true) {
				var c = this._read();
				switch (c) {
					case -1: return null;
					case 47:	// SLASH -> comment
						c = this._read();
						if (!this.isCSS) {
							if (c === 47) { // SLASH -> single line
								while (true) {
									c = this._read();
									if ((c === -1) || (c === 10) || (c === 13)) {
										this._unread(c);
										return SINGLELINE_COMMENT;
									}
								}
							}
						}
						if (c === 42) { // STAR -> multi line 
							c = this._read();
							var token = MULTILINE_COMMENT;
							if (c === 42) {
								token = DOC_COMMENT;
							}
							while (true) {
								while (c === 42) {
									c = this._read();
									if (c === 47) {
										return token;
									}
								}
								if (c === -1) {
									this._unread(c);
									return token;
								}
								c = this._read();
							}
						}
						this._unread(c);
						return UNKOWN;
					case 39:	// SINGLE QUOTE -> char const
						while(true) {
							c = this._read();
							switch (c) {
								case 39:
									return STRING;
								case 13:
								case 10:
								case -1:
									this._unread(c);
									return STRING;
								case 92: // BACKSLASH
									c = this._read();
									break;
							}
						}
						break;
					case 34:	// DOUBLE QUOTE -> string
						while(true) {
							c = this._read();
							switch (c) {
								case 34: // DOUBLE QUOTE
									return STRING;
								case 13:
								case 10:
								case -1:
									this._unread(c);
									return STRING;
								case 92: // BACKSLASH
									c = this._read();
									break;
							}
						}
						break;
					default:
						return this._default(c);
				}
			}
		},
		setText: function(text) {
			this.text = text;
			this.offset = 0;
			this.startOffset = 0;
		}
	};
	
	function WhitespaceScanner () {
		Scanner.call(this, null, true);
	}
	WhitespaceScanner.prototype = new Scanner(null);
	WhitespaceScanner.prototype.nextToken = function() {
		this.startOffset = this.offset;
		while (true) {
			var c = this._read();
			switch (c) {
				case -1: return null;
				case 32: // SPACE
					return WHITE_SPACE;
				case 9: // TAB
					return WHITE_TAB;
				default:
					do {
						c = this._read();
					} while(!(c === 32 || c === 9 || c === -1));
					this._unread(c);
					return UNKOWN;
			}
		}
	};
	
	function CommentScanner (whitespacesVisible) {
		Scanner.call(this, null, whitespacesVisible);
	}
	CommentScanner.prototype = new Scanner(null);
	CommentScanner.prototype.setType = function(type) {
		this._type = type;
	};
	CommentScanner.prototype.nextToken = function() {
		this.startOffset = this.offset;
		while (true) {
			var c = this._read();
			switch (c) {
				case -1: return null;
				case 32: // SPACE
				case 9: // TAB
					if (this.whitespacesVisible) {
						return c === 32 ? WHITE_SPACE : WHITE_TAB;
					}
					do {
						c = this._read();
					} while(c === 32 || c === 9);
					this._unread(c);
					return WHITE;
				case 60: // <
					if (this._type === DOC_COMMENT) {
						do {
							c = this._read();
						} while(!(c === 62 || c === -1)); // >
						if (c === 62) {
							return HTML_MARKUP;
						}
					}
					return UNKOWN;
				case 64: // @
					if (this._type === DOC_COMMENT) {
						do {
							c = this._read();
						} while((97 <= c && c <= 122) || (65 <= c && c <= 90) || c === 95 || (48 <= c && c <= 57));  //LETTER OR UNDERSCORE OR NUMBER
						this._unread(c);
						return DOC_TAG;
					}
					return UNKOWN;
				case 84: // T
					if ((c = this._read()) === 79) { // O
						if ((c = this._read()) === 68) { // D
							if ((c = this._read()) === 79) { // O
								c = this._read();
								if (!((97 <= c && c <= 122) || (65 <= c && c <= 90) || c === 95 || (48 <= c && c <= 57))) {
									this._unread(c);
									return TASK_TAG;
								}
								this._unread(c);
							} else {
								this._unread(c);
							}
						} else {
							this._unread(c);
						}
					} else {
						this._unread(c);
					}
					//FALL THROUGH
				default:
					do {
						c = this._read();
					} while(!(c === 32 || c === 9 || c === -1 || c === 60 || c === 64 || c === 84));
					this._unread(c);
					return UNKOWN;
			}
		}
	};
	
	function FirstScanner () {
		Scanner.call(this, null, false);
	}
	FirstScanner.prototype = new Scanner(null);
	FirstScanner.prototype._default = function(c) {
		while(true) {
			c = this._read();
			switch (c) {
				case 47: // SLASH
				case 34: // DOUBLE QUOTE
				case 39: // SINGLE QUOTE
				case -1:
					this._unread(c);
					return UNKOWN;
			}
		}
	};
	
	function TextStyler (view, lang, annotationModel) {
		this.commentStart = "/*";
		this.commentEnd = "*/";
		var keywords = [];
		switch (lang) {
			case "java": keywords = JAVA_KEYWORDS; break;
			case "js": keywords = JS_KEYWORDS; break;
			case "css": keywords = CSS_KEYWORDS; break;
		}
		this.whitespacesVisible = false;
		this.detectHyperlinks = true;
		this.highlightCaretLine = false;
		this.foldingEnabled = true;
		this.detectTasks = true;
		this._scanner = new Scanner(keywords, this.whitespacesVisible);
		this._firstScanner = new FirstScanner();
		this._commentScanner = new CommentScanner(this.whitespacesVisible);
		this._whitespaceScanner = new WhitespaceScanner();
		//TODO these scanners are not the best/correct way to parse CSS
		if (lang === "css") {
			this._scanner.isCSS = true;
			this._firstScanner.isCSS = true;
		}
		this.view = view;
		this.annotationModel = annotationModel;
		this._bracketAnnotations = undefined; 
		
		var self = this;
		this._listener = {
			onChanged: function(e) {
				self._onModelChanged(e);
			},
			onDestroy: function(e) {
				self._onDestroy(e);
			},
			onLineStyle: function(e) {
				self._onLineStyle(e);
			},
			onSelection: function(e) {
				self._onSelection(e);
			}
		};
		var model = view.getModel();
		if (model.getBaseModel) {
			model.getBaseModel().addEventListener("Changed", this._listener.onChanged);
		} else {
			//TODO still needed to keep the event order correct (styler before view)
			view.addEventListener("ModelChanged", this._listener.onChanged);
		}
		view.addEventListener("Selection", this._listener.onSelection);
		view.addEventListener("Destroy", this._listener.onDestroy);
		view.addEventListener("LineStyle", this._listener.onLineStyle);
		this._computeComments ();
		this._computeFolding();
		view.redrawLines();
	}
	
	TextStyler.prototype = {
		getClassNameForToken: function(token) {
			switch (token) {
				case "singleLineComment": return singleCommentStyle.styleClass;
				case "multiLineComment": return multiCommentStyle.styleClass;
				case "docComment": return docCommentStyle.styleClass;
				case "docHtmlComment": return htmlMarkupStyle.styleClass;
				case "tasktag": return tasktagStyle.styleClass;
				case "doctag": return doctagStyle.styleClass;
				case "string": return stringStyle.styleClass;
				case "keyword": return keywordStyle.styleClass;
				case "space": return spaceStyle.styleClass;
				case "tab": return tabStyle.styleClass;
				case "caretLine": return caretLineStyle.styleClass;
			}
			return null;
		},
		destroy: function() {
			var view = this.view;
			if (view) {
				var model = view.getModel();
				if (model.getBaseModel) {
					model.getBaseModel().removeEventListener("Changed", this._listener.onChanged);
				} else {
					view.removeEventListener("ModelChanged", this._listener.onChanged);
				}
				view.removeEventListener("Selection", this._listener.onSelection);
				view.removeEventListener("Destroy", this._listener.onDestroy);
				view.removeEventListener("LineStyle", this._listener.onLineStyle);
				this.view = null;
			}
		},
		setHighlightCaretLine: function(highlight) {
			this.highlightCaretLine = highlight;
		},
		setWhitespacesVisible: function(visible) {
			this.whitespacesVisible = visible;
			this._scanner.whitespacesVisible = visible;
			this._commentScanner.whitespacesVisible = visible;
		},
		setDetectHyperlinks: function(enabled) {
			this.detectHyperlinks = enabled;
		},
		setFoldingEnabled: function(enabled) {
			this.foldingEnabled = enabled;
		},
		setDetectTasks: function(enabled) {
			this.detectTasks = enabled;
		},
		_binarySearch: function (array, offset, inclusive, low, high) {
			var index;
			if (low === undefined) { low = -1; }
			if (high === undefined) { high = array.length; }
			while (high - low > 1) {
				index = Math.floor((high + low) / 2);
				if (offset <= array[index].start) {
					high = index;
				} else if (inclusive && offset < array[index].end) {
					high = index;
					break;
				} else {
					low = index;
				}
			}
			return high;
		},
		_computeComments: function() {
			var model = this.view.getModel();
			if (model.getBaseModel) { model = model.getBaseModel(); }
			this.comments = this._findComments(model.getText());
		},
		_computeFolding: function() {
			if (!this.foldingEnabled) { return; }
			var view = this.view;
			var viewModel = view.getModel();
			if (!viewModel.getBaseModel) { return; }
			var annotationModel = this.annotationModel;
			if (!annotationModel) { return; }
			annotationModel.removeAnnotations(mAnnotations.AnnotationType.ANNOTATION_FOLDING);
			var add = [];
			var baseModel = viewModel.getBaseModel();
			var comments = this.comments;
			for (var i=0; i<comments.length; i++) {
				var comment = comments[i];
				var annotation = this._createFoldingAnnotation(viewModel, baseModel, comment.start, comment.end);
				if (annotation) { 
					add.push(annotation);
				}
			}
			annotationModel.replaceAnnotations(null, add);
		},
		_createFoldingAnnotation: function(viewModel, baseModel, start, end) {
			var startLine = baseModel.getLineAtOffset(start);
			var endLine = baseModel.getLineAtOffset(end);
			if (startLine === endLine) {
				return null;
			}
			return new (mAnnotations.AnnotationType.getType(mAnnotations.AnnotationType.ANNOTATION_FOLDING))(start, end, viewModel);
		},
		_computeTasks: function(type, commentStart, commentEnd) {
			if (!this.detectTasks) { return; }
			var annotationModel = this.annotationModel;
			if (!annotationModel) { return; }
			var view = this.view;
			var viewModel = view.getModel(), baseModel = viewModel;
			if (viewModel.getBaseModel) { baseModel = viewModel.getBaseModel(); }
			var annotations = annotationModel.getAnnotations(commentStart, commentEnd);
			var remove = [];
			var annotationType = mAnnotations.AnnotationType.ANNOTATION_TASK;
			while (annotations.hasNext()) {
				var annotation = annotations.next();
				if (annotation.type === annotationType) {
					remove.push(annotation);
				}
			}
			var add = [];
			var scanner = this._commentScanner;
			scanner.setText(baseModel.getText(commentStart, commentEnd));
			var token;
			while ((token = scanner.nextToken())) {
				var tokenStart = scanner.getStartOffset() + commentStart;
				if (token === TASK_TAG) {
					var end = baseModel.getLineEnd(baseModel.getLineAtOffset(tokenStart));
					if (type !== SINGLELINE_COMMENT) {
						end = Math.min(end, commentEnd - this.commentEnd.length);
					}
					add.push(mAnnotations.AnnotationType.createAnnotation(annotationType, tokenStart, end, baseModel.getText(tokenStart, end)));
				}
			}
			annotationModel.replaceAnnotations(remove, add);
		},
		_getLineStyle: function(lineIndex) {
			if (this.highlightCaretLine) {
				var view = this.view;
				var model = view.getModel();
				var selection = view.getSelection();
				if (selection.start === selection.end && model.getLineAtOffset(selection.start) === lineIndex) {
					return caretLineStyle;
				}
			}
			return null;
		},
		_getStyles: function(model, text, start) {
			if (model.getBaseModel) {
				start = model.mapOffset(start);
			}
			var end = start + text.length;
			
			var styles = [];
			
			// for any sub range that is not a comment, parse code generating tokens (keywords, numbers, brackets, line comments, etc)
			var offset = start, comments = this.comments;
			var startIndex = this._binarySearch(comments, start, true);
			for (var i = startIndex; i < comments.length; i++) {
				if (comments[i].start >= end) { break; }
				var commentStart = comments[i].start;
				var commentEnd = comments[i].end;
				if (offset < commentStart) {
					this._parse(text.substring(offset - start, commentStart - start), offset, styles);
				}
				var style = comments[i].type === DOC_COMMENT ? docCommentStyle : multiCommentStyle;
				if (this.whitespacesVisible || this.detectHyperlinks) {
					var s = Math.max(offset, commentStart);
					var e = Math.min(end, commentEnd);
					this._parseComment(text.substring(s - start, e - start), s, styles, style, comments[i].type);
				} else {
					styles.push({start: commentStart, end: commentEnd, style: style});
				}
				offset = commentEnd;
			}
			if (offset < end) {
				this._parse(text.substring(offset - start, end - start), offset, styles);
			}
			if (model.getBaseModel) {
				for (var j = 0; j < styles.length; j++) {
					var length = styles[j].end - styles[j].start;
					styles[j].start = model.mapOffset(styles[j].start, true);
					styles[j].end = styles[j].start + length;
				}
			}
			return styles;
		},
		_parse: function(text, offset, styles) {
			var scanner = this._scanner;
			scanner.setText(text);
			var token;
			while ((token = scanner.nextToken())) {
				var tokenStart = scanner.getStartOffset() + offset;
				var style = null;
				switch (token) {
					case KEYWORD: style = keywordStyle; break;
					case STRING:
						if (this.whitespacesVisible) {
							this._parseString(scanner.getData(), tokenStart, styles, stringStyle);
							continue;
						} else {
							style = stringStyle;
						}
						break;
					case DOC_COMMENT: 
						this._parseComment(scanner.getData(), tokenStart, styles, docCommentStyle, token);
						continue;
					case SINGLELINE_COMMENT:
						this._parseComment(scanner.getData(), tokenStart, styles, singleCommentStyle, token);
						continue;
					case MULTILINE_COMMENT: 
						this._parseComment(scanner.getData(), tokenStart, styles, multiCommentStyle, token);
						continue;
					case WHITE_TAB:
						if (this.whitespacesVisible) {
							style = tabStyle;
						}
						break;
					case WHITE_SPACE:
						if (this.whitespacesVisible) {
							style = spaceStyle;
						}
						break;
				}
				styles.push({start: tokenStart, end: scanner.getOffset() + offset, style: style});
			}
		},
		_parseComment: function(text, offset, styles, s, type) {
			var scanner = this._commentScanner;
			scanner.setText(text);
			scanner.setType(type);
			var token;
			while ((token = scanner.nextToken())) {
				var tokenStart = scanner.getStartOffset() + offset;
				var style = s;
				switch (token) {
					case WHITE_TAB:
						if (this.whitespacesVisible) {
							style = tabStyle;
						}
						break;
					case WHITE_SPACE:
						if (this.whitespacesVisible) {
							style = spaceStyle;
						}
						break;
					case HTML_MARKUP:
						style = htmlMarkupStyle;
						break;
					case DOC_TAG:
						style = doctagStyle;
						break;
					case TASK_TAG:
						style = tasktagStyle;
						break;
					default:
						if (this.detectHyperlinks) {
							style = this._detectHyperlinks(scanner.getData(), tokenStart, styles, style);
						}
				}
				if (style) {
					styles.push({start: tokenStart, end: scanner.getOffset() + offset, style: style});
				}
			}
		},
		_parseString: function(text, offset, styles, s) {
			var scanner = this._whitespaceScanner;
			scanner.setText(text);
			var token;
			while ((token = scanner.nextToken())) {
				var tokenStart = scanner.getStartOffset() + offset;
				var style = s;
				switch (token) {
					case WHITE_TAB:
						if (this.whitespacesVisible) {
							style = tabStyle;
						}
						break;
					case WHITE_SPACE:
						if (this.whitespacesVisible) {
							style = spaceStyle;
						}
						break;
				}
				if (style) {
					styles.push({start: tokenStart, end: scanner.getOffset() + offset, style: style});
				}
			}
		},
		_detectHyperlinks: function(text, offset, styles, s) {
			var href = null, index, linkStyle;
			if ((index = text.indexOf("://")) > 0) {
				href = text;
				var start = index;
				while (start > 0) {
					var c = href.charCodeAt(start - 1);
					if (!((97 <= c && c <= 122) || (65 <= c && c <= 90) || 0x2d === c || (48 <= c && c <= 57))) { //LETTER OR DASH OR NUMBER
						break;
					}
					start--;
				}
				if (start > 0) {
					var brackets = "\"\"''(){}[]<>";
					index = brackets.indexOf(href.substring(start - 1, start));
					if (index !== -1 && (index & 1) === 0 && (index = href.lastIndexOf(brackets.substring(index + 1, index + 2))) !== -1) {
						var end = index;
						linkStyle = this._clone(s);
						linkStyle.tagName = "A";
						linkStyle.attributes = {href: href.substring(start, end)};
						styles.push({start: offset, end: offset + start, style: s});
						styles.push({start: offset + start, end: offset + end, style: linkStyle});
						styles.push({start: offset + end, end: offset + text.length, style: s});
						return null;
					}
				}
			} else if (text.toLowerCase().indexOf("bug#") === 0) {
				href = "https://bugs.eclipse.org/bugs/show_bug.cgi?id=" + parseInt(text.substring(4), 10);
			}
			if (href) {
				linkStyle = this._clone(s);
				linkStyle.tagName = "A";
				linkStyle.attributes = {href: href};
				return linkStyle;
			}
			return s;
		},
		_clone: function(obj) {
			if (!obj) { return obj; }
			var newObj = {};
			for (var p in obj) {
				if (obj.hasOwnProperty(p)) {
					var value = obj[p];
					newObj[p] = value;
				}
			}
			return newObj;
		},
		_findComments: function(text, offset) {
			offset = offset || 0;
			var scanner = this._firstScanner, token;
			scanner.setText(text);
			var result = [];
			while ((token = scanner.nextToken())) {
				if (token === MULTILINE_COMMENT || token === DOC_COMMENT) {
					var comment = {
						start: scanner.getStartOffset() + offset,
						end: scanner.getOffset() + offset,
						type: token
					};
					result.push(comment);
					//TODO can we avoid this work if edition does not overlap comment?
					this._computeTasks(token, scanner.getStartOffset() + offset, scanner.getOffset() + offset);
				}
				if (token === SINGLELINE_COMMENT) {
					//TODO can we avoid this work if edition does not overlap comment?
					this._computeTasks(token, scanner.getStartOffset() + offset, scanner.getOffset() + offset);
				}
			}
			return result;
		}, 
		_findMatchingBracket: function(model, offset) {
			var brackets = "{}()[]<>";
			var bracket = model.getText(offset, offset + 1);
			var bracketIndex = brackets.indexOf(bracket, 0);
			if (bracketIndex === -1) { return -1; }
			var closingBracket;
			if (bracketIndex & 1) {
				closingBracket = brackets.substring(bracketIndex - 1, bracketIndex);
			} else {
				closingBracket = brackets.substring(bracketIndex + 1, bracketIndex + 2);
			}
			var lineIndex = model.getLineAtOffset(offset);
			var lineText = model.getLine(lineIndex);
			var lineStart = model.getLineStart(lineIndex);
			var lineEnd = model.getLineEnd(lineIndex);
			brackets = this._findBrackets(bracket, closingBracket, lineText, lineStart, lineStart, lineEnd);
			for (var i=0; i<brackets.length; i++) {
				var sign = brackets[i] >= 0 ? 1 : -1;
				if (brackets[i] * sign === offset) {
					var level = 1;
					if (bracketIndex & 1) {
						i--;
						for (; i>=0; i--) {
							sign = brackets[i] >= 0 ? 1 : -1;
							level += sign;
							if (level === 0) {
								return brackets[i] * sign;
							}
						}
						lineIndex -= 1;
						while (lineIndex >= 0) {
							lineText = model.getLine(lineIndex);
							lineStart = model.getLineStart(lineIndex);
							lineEnd = model.getLineEnd(lineIndex);
							brackets = this._findBrackets(bracket, closingBracket, lineText, lineStart, lineStart, lineEnd);
							for (var j=brackets.length - 1; j>=0; j--) {
								sign = brackets[j] >= 0 ? 1 : -1;
								level += sign;
								if (level === 0) {
									return brackets[j] * sign;
								}
							}
							lineIndex--;
						}
					} else {
						i++;
						for (; i<brackets.length; i++) {
							sign = brackets[i] >= 0 ? 1 : -1;
							level += sign;
							if (level === 0) {
								return brackets[i] * sign;
							}
						}
						lineIndex += 1;
						var lineCount = model.getLineCount ();
						while (lineIndex < lineCount) {
							lineText = model.getLine(lineIndex);
							lineStart = model.getLineStart(lineIndex);
							lineEnd = model.getLineEnd(lineIndex);
							brackets = this._findBrackets(bracket, closingBracket, lineText, lineStart, lineStart, lineEnd);
							for (var k=0; k<brackets.length; k++) {
								sign = brackets[k] >= 0 ? 1 : -1;
								level += sign;
								if (level === 0) {
									return brackets[k] * sign;
								}
							}
							lineIndex++;
						}
					}
					break;
				}
			}
			return -1;
		},
		_findBrackets: function(bracket, closingBracket, text, textOffset, start, end) {
			var result = [];
			var bracketToken = bracket.charCodeAt(0);
			var closingBracketToken = closingBracket.charCodeAt(0);
			// for any sub range that is not a comment, parse code generating tokens (keywords, numbers, brackets, line comments, etc)
			var offset = start, scanner = this._scanner, token, comments = this.comments;
			var startIndex = this._binarySearch(comments, start, true);
			for (var i = startIndex; i < comments.length; i++) {
				if (comments[i].start >= end) { break; }
				var commentStart = comments[i].start;
				var commentEnd = comments[i].end;
				if (offset < commentStart) {
					scanner.setText(text.substring(offset - start, commentStart - start));
					while ((token = scanner.nextToken())) {
						if (token === bracketToken) {
							result.push(scanner.getStartOffset() + offset - start + textOffset);
						} else if (token === closingBracketToken) {
							result.push(-(scanner.getStartOffset() + offset - start + textOffset));
						}
					}
				}
				offset = commentEnd;
			}
			if (offset < end) {
				scanner.setText(text.substring(offset - start, end - start));
				while ((token = scanner.nextToken())) {
					if (token === bracketToken) {
						result.push(scanner.getStartOffset() + offset - start + textOffset);
					} else if (token === closingBracketToken) {
						result.push(-(scanner.getStartOffset() + offset - start + textOffset));
					}
				}
			}
			return result;
		},
		_onDestroy: function(e) {
			this.destroy();
		},
		_onLineStyle: function (e) {
			if (e.textView === this.view) {
				e.style = this._getLineStyle(e.lineIndex);
			}
			e.ranges = this._getStyles(e.textView.getModel(), e.lineText, e.lineStart);
		},
		_onSelection: function(e) {
			var oldSelection = e.oldValue;
			var newSelection = e.newValue;
			var view = this.view;
			var model = view.getModel();
			var lineIndex;
			if (this.highlightCaretLine) {
				var oldLineIndex = model.getLineAtOffset(oldSelection.start);
				lineIndex = model.getLineAtOffset(newSelection.start);
				var newEmpty = newSelection.start === newSelection.end;
				var oldEmpty = oldSelection.start === oldSelection.end;
				if (!(oldLineIndex === lineIndex && oldEmpty && newEmpty)) {
					if (oldEmpty) {
						view.redrawLines(oldLineIndex, oldLineIndex + 1);
					}
					if ((oldLineIndex !== lineIndex || !oldEmpty) && newEmpty) {
						view.redrawLines(lineIndex, lineIndex + 1);
					}
				}
			}
			if (!this.annotationModel) { return; }
			var remove = this._bracketAnnotations, add, caret;
			if (newSelection.start === newSelection.end && (caret = view.getCaretOffset()) > 0) {
				var mapCaret = caret - 1;
				if (model.getBaseModel) {
					mapCaret = model.mapOffset(mapCaret);
					model = model.getBaseModel();
				}
				var bracket = this._findMatchingBracket(model, mapCaret);
				if (bracket !== -1) {
					add = [
						mAnnotations.AnnotationType.createAnnotation(mAnnotations.AnnotationType.ANNOTATION_MATCHING_BRACKET, bracket, bracket + 1),
						mAnnotations.AnnotationType.createAnnotation(mAnnotations.AnnotationType.ANNOTATION_CURRENT_BRACKET, mapCaret, mapCaret + 1)
					];
				}
			}
			this._bracketAnnotations = add;
			this.annotationModel.replaceAnnotations(remove, add);
		},
		_onModelChanged: function(e) {
			var start = e.start;
			var removedCharCount = e.removedCharCount;
			var addedCharCount = e.addedCharCount;
			var changeCount = addedCharCount - removedCharCount;
			var view = this.view;
			var viewModel = view.getModel();
			var baseModel = viewModel.getBaseModel ? viewModel.getBaseModel() : viewModel;
			var end = start + removedCharCount;
			var charCount = baseModel.getCharCount();
			var commentCount = this.comments.length;
			var lineStart = baseModel.getLineStart(baseModel.getLineAtOffset(start));
			var commentStart = this._binarySearch(this.comments, lineStart, true);
			var commentEnd = this._binarySearch(this.comments, end, false, commentStart - 1, commentCount);
			
			var ts;
			if (commentStart < commentCount && this.comments[commentStart].start <= lineStart && lineStart < this.comments[commentStart].end) {
				ts = this.comments[commentStart].start;
				if (ts > start) { ts += changeCount; }
			} else {
				if (commentStart === commentCount && commentCount > 0 && charCount - changeCount === this.comments[commentCount - 1].end) {
					ts = this.comments[commentCount - 1].start;
				} else {
					ts = lineStart;
				}
			}
			var te;
			if (commentEnd < commentCount) {
				te = this.comments[commentEnd].end;
				if (te > start) { te += changeCount; }
				commentEnd += 1;
			} else {
				commentEnd = commentCount;
				te = charCount;//TODO could it be smaller?
			}
			var text = baseModel.getText(ts, te), comment;
			var newComments = this._findComments(text, ts), i;
			for (i = commentStart; i < this.comments.length; i++) {
				comment = this.comments[i];
				if (comment.start > start) { comment.start += changeCount; }
				if (comment.start > start) { comment.end += changeCount; }
			}
			var redraw = (commentEnd - commentStart) !== newComments.length;
			if (!redraw) {
				for (i=0; i<newComments.length; i++) {
					comment = this.comments[commentStart + i];
					var newComment = newComments[i];
					if (comment.start !== newComment.start || comment.end !== newComment.end || comment.type !== newComment.type) {
						redraw = true;
						break;
					} 
				}
			}
			var args = [commentStart, commentEnd - commentStart].concat(newComments);
			Array.prototype.splice.apply(this.comments, args);
			if (redraw) {
				var redrawStart = ts;
				var redrawEnd = te;
				if (viewModel !== baseModel) {
					redrawStart = viewModel.mapOffset(redrawStart, true);
					redrawEnd = viewModel.mapOffset(redrawEnd, true);
				}
				view.redrawRange(redrawStart, redrawEnd);
			}

			if (this.foldingEnabled && baseModel !== viewModel && this.annotationModel) {
				var annotationModel = this.annotationModel;
				var iter = annotationModel.getAnnotations(ts, te);
				var remove = [], all = [];
				var annotation;
				while (iter.hasNext()) {
					annotation = iter.next();
					if (annotation.type === mAnnotations.AnnotationType.ANNOTATION_FOLDING) {
						all.push(annotation);
						for (i = 0; i < newComments.length; i++) {
							if (annotation.start === newComments[i].start && annotation.end === newComments[i].end) {
								break;
							}
						}
						if (i === newComments.length) {
							remove.push(annotation);
							annotation.expand();
						} else {
							var annotationStart = annotation.start;
							var annotationEnd = annotation.end;
							if (annotationStart > start) {
								annotationStart -= changeCount;
							}
							if (annotationEnd > start) {
								annotationEnd -= changeCount;
							}
							if (annotationStart <= start && start < annotationEnd && annotationStart <= end && end < annotationEnd) {
								var startLine = baseModel.getLineAtOffset(annotation.start);
								var endLine = baseModel.getLineAtOffset(annotation.end);
								if (startLine !== endLine) {
									if (!annotation.expanded) {
										annotation.expand();
										annotationModel.modifyAnnotation(annotation);
									}
								} else {
									annotationModel.removeAnnotation(annotation);
								}
							}
						}
					}
				}
				var add = [];
				for (i = 0; i < newComments.length; i++) {
					comment = newComments[i];
					for (var j = 0; j < all.length; j++) {
						if (all[j].start === comment.start && all[j].end === comment.end) {
							break;
						}
					}
					if (j === all.length) {
						annotation = this._createFoldingAnnotation(viewModel, baseModel, comment.start, comment.end);
						if (annotation) {
							add.push(annotation);
						}
					}
				}
				annotationModel.replaceAnnotations(remove, add);
			}
		}
	};
	
	return {TextStyler: TextStyler};
});
