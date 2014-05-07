/*******************************************************************************
 * @license
 * Copyright (c) 2010, 2012 IBM Corporation and others.
 * All rights reserved. This program and the accompanying materials are made
 * available under the terms of the Eclipse Public License v1.0
 * (http://www.eclipse.org/legal/epl-v10.html), and the Eclipse Distribution
 * License v1.0 (http://www.eclipse.org/org/documents/edl-v10.html).
 *
 * Contributors:
 *		Felipe Heidrich (IBM Corporation) - initial API and implementation
 *		Silenio Quarti (IBM Corporation) - initial API and implementation
 *		Mihai Sucan (Mozilla Foundation) - fix for Bug#334583 Bug#348471 Bug#349485 Bug#350595 Bug#360726 Bug#361180 Bug#362835 Bug#362428 Bug#362286 Bug#354270 Bug#361474 Bug#363945 Bug#366312 Bug#370584
 ******************************************************************************/

/*global define*/

define("orion/textview/textView", ['orion/textview/textModel', 'orion/textview/keyBinding', 'orion/textview/eventTarget', 'orion/textview/util'], function(mTextModel, mKeyBinding, mEventTarget, util) { //$NON-NLS-4$ //$NON-NLS-3$ //$NON-NLS-2$ //$NON-NLS-1$ //$NON-NLS-0$

	/** @private */
	function getWindow(document) {
		return document.defaultView || document.parentWindow;
	}
	/** @private */
	function addHandler(node, type, handler, capture) {
		if (typeof node.addEventListener === "function") { //$NON-NLS-0$
			node.addEventListener(type, handler, capture === true);
		} else {
			node.attachEvent("on" + type, handler); //$NON-NLS-0$
		}
	}
	/** @private */
	function removeHandler(node, type, handler, capture) {
		if (typeof node.removeEventListener === "function") { //$NON-NLS-0$
			node.removeEventListener(type, handler, capture === true);
		} else {
			node.detachEvent("on" + type, handler); //$NON-NLS-0$
		}
	}
	/** @private */
	function applyStyle(style, node, reset) {
		if (reset) {
			node.className = "";
			var attrs = node.attributes;
			for (var i= attrs.length; i-->0;) {
				if (!util.isIE || util.isIE >= 9 || (util.isIE < 9 && attrs[i].specified)) {
					node.removeAttribute(attrs[i].name);
				}
			}
		}
		if (!style) {
			return;
		}
		if (style.styleClass) {
			node.className = style.styleClass;
		}
		var properties = style.style;
		if (properties) {
			for (var s in properties) {
				if (properties.hasOwnProperty(s)) {
					node.style[s] = properties[s];
				}
			}
		}
		var attributes = style.attributes;
		if (attributes) {
			for (var a in attributes) {
				if (attributes.hasOwnProperty(a)) {
					node.setAttribute(a, attributes[a]);
				}
			}
		}
	}
	/** @private */
	function clone(obj) {
		/*Note that this code only works because of the limited types used in TextViewOptions */
		if (obj instanceof Array) {
			return obj.slice(0);
		}
		return obj;
	}
	/** @private */
	function compare(s1, s2) {
		if (s1 === s2) { return true; }
		if (s1 && !s2 || !s1 && s2) { return false; }
		if ((s1 && s1.constructor === String) || (s2 && s2.constructor === String)) { return false; }
		if (s1 instanceof Array || s2 instanceof Array) {
			if (!(s1 instanceof Array && s2 instanceof Array)) { return false; }
			if (s1.length !== s2.length) { return false; }
			for (var i = 0; i < s1.length; i++) {
				if (!compare(s1[i], s2[i])) {
					return false;
				}
			}
			return true;
		}
		if (!(s1 instanceof Object) || !(s2 instanceof Object)) { return false; }
		var p;
		for (p in s1) {
			if (s1.hasOwnProperty(p)) {
				if (!s2.hasOwnProperty(p)) { return false; }
				if (!compare(s1[p], s2[p])) {return false; }
			}
		}
		for (p in s2) {
			if (!s1.hasOwnProperty(p)) { return false; }
		}
		return true;
	}
	/** @private */
	function convertDelimiter(text, addTextFunc, addDelimiterFunc) {
		var cr = 0, lf = 0, index = 0, length = text.length;
		while (index < length) {
			if (cr !== -1 && cr <= index) { cr = text.indexOf("\r", index); } //$NON-NLS-0$
			if (lf !== -1 && lf <= index) { lf = text.indexOf("\n", index); } //$NON-NLS-0$
			var start = index, end;
			if (lf === -1 && cr === -1) {
				addTextFunc(text.substring(index));
				break;
			}
			if (cr !== -1 && lf !== -1) {
				if (cr + 1 === lf) {
					end = cr;
					index = lf + 1;
				} else {
					end = cr < lf ? cr : lf;
					index = (cr < lf ? cr : lf) + 1;
				}
			} else if (cr !== -1) {
				end = cr;
				index = cr + 1;
			} else {
				end = lf;
				index = lf + 1;
			}
			addTextFunc(text.substring(start, end));
			addDelimiterFunc();
		}
	}
	/** @private */
	function getBorder(node) {
		var left,top,right,bottom;
		var window = getWindow(node.ownerDocument);
		if (window.getComputedStyle) {
			var style = window.getComputedStyle(node, null);
			left = style.getPropertyValue("border-left-width"); //$NON-NLS-0$
			top = style.getPropertyValue("border-top-width"); //$NON-NLS-0$
			right = style.getPropertyValue("border-right-width"); //$NON-NLS-0$
			bottom = style.getPropertyValue("border-bottom-width"); //$NON-NLS-0$
		} else if (node.currentStyle) {
			left = node.currentStyle.borderLeftWidth;
			top = node.currentStyle.borderTopWidth;
			right = node.currentStyle.borderRightWidth;
			bottom = node.currentStyle.borderBottomWidth;
		}
		return {
			left: parseInt(left, 10) || 0,
			top: parseInt(top, 10) || 0,
			right: parseInt(right, 10) || 0,
			bottom: parseInt(bottom, 10) || 0
		};
	}
	/** @private */
	function getPadding(node) {
		var left,top,right,bottom;
		var window = getWindow(node.ownerDocument);
		if (window.getComputedStyle) {
			var style = window.getComputedStyle(node, null);
			left = style.getPropertyValue("padding-left"); //$NON-NLS-0$
			top = style.getPropertyValue("padding-top"); //$NON-NLS-0$
			right = style.getPropertyValue("padding-right"); //$NON-NLS-0$
			bottom = style.getPropertyValue("padding-bottom"); //$NON-NLS-0$
		} else if (node.currentStyle) {
			left = node.currentStyle.paddingLeft;
			top = node.currentStyle.paddingTop;
			right = node.currentStyle.paddingRight;
			bottom = node.currentStyle.paddingBottom;
		}
		return {
			left: parseInt(left, 10) || 0,
			top: parseInt(top, 10) || 0,
			right: parseInt(right, 10) || 0,
			bottom: parseInt(bottom, 10) || 0
		};
	}
	/** @private */
	function getLineTrim(line) {
		var trim = line._trim;
		if (!trim) {
			trim = getPadding(line);
			var border = getBorder(line);
			trim.left += border.left;
			trim.top += border.top;
			trim.right += border.right;
			trim.bottom += border.bottom;
			line._trim = trim;
		}
		return trim;
	}

	/**
	 * Constructs a new Selection object.
	 *
	 * @class A Selection represents a range of selected text in the view.
	 * @name orion.textview.Selection
	 */
	function Selection (start, end, caret) {
		/**
		 * The selection start offset.
		 *
		 * @name orion.textview.Selection#start
		 */
		this.start = start;
		/**
		 * The selection end offset.
		 *
		 * @name orion.textview.Selection#end
		 */
		this.end = end;
		/** @private */
		this.caret = caret; //true if the start, false if the caret is at end
	}
	Selection.prototype = /** @lends orion.textview.Selection.prototype */ {
		/** @private */
		clone: function() {
			return new Selection(this.start, this.end, this.caret);
		},
		/** @private */
		collapse: function() {
			if (this.caret) {
				this.end = this.start;
			} else {
				this.start = this.end;
			}
		},
		/** @private */
		extend: function (offset) {
			if (this.caret) {
				this.start = offset;
			} else {
				this.end = offset;
			}
			if (this.start > this.end) {
				var tmp = this.start;
				this.start = this.end;
				this.end = tmp;
				this.caret = !this.caret;
			}
		},
		/** @private */
		setCaret: function(offset) {
			this.start = offset;
			this.end = offset;
			this.caret = false;
		},
		/** @private */
		getCaret: function() {
			return this.caret ? this.start : this.end;
		},
		/** @private */
		toString: function() {
			return "start=" + this.start + " end=" + this.end + (this.caret ? " caret is at start" : " caret is at end"); //$NON-NLS-3$ //$NON-NLS-2$ //$NON-NLS-1$ //$NON-NLS-0$
		},
		/** @private */
		isEmpty: function() {
			return this.start === this.end;
		},
		/** @private */
		equals: function(object) {
			return this.caret === object.caret && this.start === object.start && this.end === object.end;
		}
	};
	/** @private */
	function TextRect (rect) {
		// SCRIPTED phantomjs occasionally finds a null bounding rectangle
		if (!rect) {
			this.left = 0;
			this.top = 0;
			this.right = 0;
			this.bottom = 0;
		} else {
		//SCRIPTED end
		this.left = rect.left;
		this.top = rect.top;
		this.right = rect.right;
		this.bottom = rect.bottom;
		// SCRIPTED close if statement
		}
		// SCRIPTED end
	}
	TextRect.prototype = /** @lends orion.textview.TextRect.prototype */ {
		/** @private */
		toString: function() {
			return "{l=" + this.left + ", t=" + this.top + ", r=" + this.right + ", b=" + this.bottom + "}"; //$NON-NLS-4$ //$NON-NLS-3$ //$NON-NLS-2$ //$NON-NLS-1$ //$NON-NLS-0$
		}
	};
	/**
	 * Constructs a new TextLine object.
	 *
	 * @class A TextLine represents a line of text in the view.
	 * @name orion.textview.TextLine
	 * @private
	 */
	function TextLine (view, lineIndex, lineDiv) {
		/**
		 * The view.
		 *
		 * @name orion.textview.TextLine#view
		 * @private
		 */
		this.view = view;
		/**
		 * The line index.
		 *
		 * @name orion.textview.TextLine#lineIndex
		 * @private
		 */
		this.lineIndex = lineIndex;

		this._lineDiv = lineDiv;
	}
	TextLine.prototype = /** @lends orion.textview.TextLine.prototype */ {
		/** @private */
		create: function(parent, div) {
			if (this._lineDiv) { return; }
			var child = this._lineDiv = this._createLine(parent, div, this.lineIndex);
			child._line = this;
			return child;
		},
		_createLine: function(parent, div, lineIndex) {
			var view = this.view;
			var model = view._model;
			var lineText = model.getLine(lineIndex);
			var lineStart = model.getLineStart(lineIndex);
			var e = {type:"LineStyle", textView: view, lineIndex: lineIndex, lineText: lineText, lineStart: lineStart}; //$NON-NLS-0$
			if (lineText.length < 2000) {
				view.onLineStyle(e);
			}
			var lineDiv = div || util.createElement(parent.ownerDocument, "div"); //$NON-NLS-0$
			if (!div || !compare(div.viewStyle, e.style)) {
				applyStyle(e.style, lineDiv, div);
				if (div) { div._trim = null; }
				lineDiv.viewStyle = e.style;
				lineDiv.setAttribute("role", "presentation"); //$NON-NLS-1$ //$NON-NLS-0$
			}
			lineDiv.lineIndex = lineIndex;
			var ranges = [];
			var data = {tabOffset: 0, ranges: ranges};
			this._createRanges(e.ranges, lineText, 0, lineText.length, lineStart, data);

			/*
			* A trailing span with a whitespace is added for three different reasons:
			* 1. Make sure the height of each line is the largest of the default font
			* in normal, italic, bold, and italic-bold.
			* 2. When full selection is off, Firefox, Opera and IE9 do not extend the
			* selection at the end of the line when the line is fully selected.
			* 3. The height of a div with only an empty span is zero.
			*/
			var c = " "; //$NON-NLS-0$
			if (!view._fullSelection && util.isIE < 9) {
				/*
				* IE8 already selects extra space at end of a line fully selected,
				* adding another space at the end of the line causes the selection
				* to look too big. The fix is to use a zero-width space (\uFEFF) instead.
				*/
				c = "\uFEFF"; //$NON-NLS-0$
			}
			if (util.isWebkit) {
				/*
				* Feature in WekKit. Adding a regular white space to the line will
				* cause the longest line in the view to wrap even though "pre" is set.
				* The fix is to use the zero-width non-joiner character (\u200C) instead.
				* Note: To not use \uFEFF because in old version of Chrome this character
				* shows a glyph;
				*/
				c = "\u200C"; //$NON-NLS-0$
			}
			ranges.push({text: c, style: view._metrics.largestFontStyle, ignoreChars: 1});

			var range, span, style, oldSpan, oldStyle, text, oldText, end = 0, oldEnd = 0, next;
			var changeCount, changeStart;
			if (div) {
				var modelChangedEvent = div.modelChangedEvent;
				if (modelChangedEvent) {
					if (modelChangedEvent.removedLineCount === 0 && modelChangedEvent.addedLineCount === 0) {
						changeStart = modelChangedEvent.start - lineStart;
						changeCount = modelChangedEvent.addedCharCount - modelChangedEvent.removedCharCount;
					} else {
						changeStart = -1;
					}
					div.modelChangedEvent = undefined;
				}
				oldSpan = div.firstChild;
			}
			for (var i = 0; i < ranges.length; i++) {
				range = ranges[i];
				text = range.text;
				end += text.length;
				style = range.style;
				if (oldSpan) {
					oldText = oldSpan.firstChild.data;
					oldStyle = oldSpan.viewStyle;
					if (oldText === text && compare(style, oldStyle)) {
						oldEnd += oldText.length;
						oldSpan._rectsCache = undefined;
						span = oldSpan = oldSpan.nextSibling;
						continue;
					} else {
						while (oldSpan) {
							if (changeStart !== -1) {
								var spanEnd = end;
								if (spanEnd >= changeStart) {
									spanEnd -= changeCount;
								}
								var t = oldSpan.firstChild.data;
								var length = t ? t.length : 0;
								if (oldEnd + length > spanEnd) { break; }
								oldEnd += length;
							}
							next = oldSpan.nextSibling;
							lineDiv.removeChild(oldSpan);
							oldSpan = next;
						}
					}
				}
				span = this._createSpan(lineDiv, text, style, range.ignoreChars);
				if (oldSpan) {
					lineDiv.insertBefore(span, oldSpan);
				} else {
					lineDiv.appendChild(span);
				}
				if (div) {
					div.lineWidth = undefined;
				}
			}
			if (div) {
				var tmp = span ? span.nextSibling : null;
				while (tmp) {
					next = tmp.nextSibling;
					div.removeChild(tmp);
					tmp = next;
				}
			} else {
				parent.appendChild(lineDiv);
			}
			return lineDiv;
		},
		_createRanges: function(ranges, text, start, end, lineStart, data) {
			if (start >= end) { return; }
			if (ranges) {
				for (var i = 0; i < ranges.length; i++) {
					var range = ranges[i];
					if (range.end <= lineStart + start) { continue; }
					var styleStart = Math.max(lineStart + start, range.start) - lineStart;
					if (styleStart >= end) { break; }
					var styleEnd = Math.min(lineStart + end, range.end) - lineStart;
					if (styleStart < styleEnd) {
						styleStart = Math.max(start, styleStart);
						styleEnd = Math.min(end, styleEnd);
						if (start < styleStart) {
							this._createRange(text, start, styleStart, null, data);
						}
						while (i + 1 < ranges.length && ranges[i + 1].start - lineStart === styleEnd && compare(range.style, ranges[i + 1].style)) {
							range = ranges[i + 1];
							styleEnd = Math.min(lineStart + end, range.end) - lineStart;
							i++;
						}
						this._createRange(text, styleStart, styleEnd, range.style, data);
						start = styleEnd;
					}
				}
			}
			if (start < end) {
				this._createRange(text, start, end, null, data);
			}
		},
		_createRange: function(text, start, end, style, data) {
			if (start >= end) { return; }
			var tabSize = this.view._customTabSize, range;
			if (tabSize && tabSize !== 8) {
				var tabIndex = text.indexOf("\t", start); //$NON-NLS-0$
				while (tabIndex !== -1 && tabIndex < end) {
					if (start < tabIndex) {
						range = {text: text.substring(start, tabIndex), style: style};
						data.ranges.push(range);
						data.tabOffset += range.text.length;
					}
					var spacesCount = tabSize - (data.tabOffset % tabSize);
					if (spacesCount > 0) {
						//TODO hack to preserve tabs in getDOMText()
						var spaces = "\u00A0"; //$NON-NLS-0$
						for (var i = 1; i < spacesCount; i++) {
							spaces += " "; //$NON-NLS-0$
						}
						range = {text: spaces, style: style, ignoreChars: spacesCount - 1};
						data.ranges.push(range);
						data.tabOffset += range.text.length;
					}
					start = tabIndex + 1;
					tabIndex = text.indexOf("\t", start); //$NON-NLS-0$
				}
			}
			if (start < end) {
				range = {text: text.substring(start, end), style: style};
				data.ranges.push(range);
				data.tabOffset += range.text.length;
			}
		},
		_createSpan: function(parent, text, style, ignoreChars) {
			var isLink = style && style.tagName === "A"; //$NON-NLS-0$
			if (isLink) { parent.hasLink = true; }
			var tagName = isLink && this.view._linksVisible ? "a" : "span"; //$NON-NLS-1$ //$NON-NLS-0$
			var document = parent.ownerDocument;
			var child = util.createElement(parent.ownerDocument, tagName);
			child.appendChild(document.createTextNode(text));
			applyStyle(style, child);
			if (tagName === "A") { //$NON-NLS-0$
				var self = this.view;
				var window = this._getWindow();
				addHandler(child, "click", function(e) { return self._handleLinkClick(e ? e : window.event); }, false); //$NON-NLS-0$
			}
			child.viewStyle = style;
			if (ignoreChars) {
				child.ignoreChars = ignoreChars;
			}
			return child;
		},
		_ensureCreated: function() {
			if (this._lineDiv) { return this._lineDiv; }
			return (this._createdDiv = this.create(this.view._clientDiv, null));
		},
		/** @private */
		getBoundingClientRect: function(offset, absolute) {
			var child = this._ensureCreated();
			var view = this.view;
			if (offset === undefined) {
				return this._getLineBoundingClientRect(child, true);
			}
			var model = view._model;
			var document = child.ownerDocument;
			var lineIndex = this.lineIndex;
			var result = null;
			if (offset < model.getLineEnd(lineIndex)) {
				var lineOffset = model.getLineStart(lineIndex);
				var lineChild = child.firstChild;
				while (lineChild) {
					var textNode = lineChild.firstChild;
					var nodeLength = textNode.length;
					if (lineChild.ignoreChars) {
						nodeLength -= lineChild.ignoreChars;
					}
					if (lineOffset + nodeLength > offset) {
						var index = offset - lineOffset;
						var range;
						if (view._isRangeRects) {
							range = document.createRange();
							if (!range.getBoundingClientRect()) {
								//console.log("document: " + document);
							}
							range.setStart(textNode, index);
							range.setEnd(textNode, index + 1);
							result = new TextRect(range.getBoundingClientRect());
						} else if (util.isIE) {
							range = document.body.createTextRange();
							range.moveToElementText(lineChild);
							range.collapse();
							range.moveEnd("character", index + 1); //$NON-NLS-0$
							range.moveStart("character", index); //$NON-NLS-0$
							if (!range.getBoundingClientRect()) {
								console.log("document: " + document);
							}
							result = new TextRect(range.getBoundingClientRect());
						} else {
							var text = textNode.data;
							lineChild.removeChild(textNode);
							lineChild.appendChild(document.createTextNode(text.substring(0, index)));
							var span = util.createElement(document, "span"); //$NON-NLS-0$
							span.appendChild(document.createTextNode(text.substring(index, index + 1)));
							lineChild.appendChild(span);
							lineChild.appendChild(document.createTextNode(text.substring(index + 1)));
							result = new TextRect(span.getBoundingClientRect());
							lineChild.innerHTML = "";
							lineChild.appendChild(textNode);
							if (!this._createdDiv) {
								/*
								 * Removing the element node that holds the selection start or end
								 * causes the selection to be lost. The fix is to detect this case
								 * and restore the selection.
								 */
								var s = view._getSelection();
								if ((lineOffset <= s.start && s.start < lineOffset + nodeLength) ||  (lineOffset <= s.end && s.end < lineOffset + nodeLength)) {
									view._updateDOMSelection();
								}
							}
						}
						if (util.isIE) {
							var window = getWindow(child.ownerDocument);
							var xFactor = window.screen.logicalXDPI / window.screen.deviceXDPI;
							var yFactor = window.screen.logicalYDPI / window.screen.deviceYDPI;
							result.left = result.left * xFactor;
							result.right = result.right * xFactor;
							result.top = result.top * yFactor;
							result.bottom = result.bottom * yFactor;
						}
						break;
					}
					lineOffset += nodeLength;
					lineChild = lineChild.nextSibling;
				}
			}
			var rect = this.getBoundingClientRect();
			if (!result) {
				if (view._wrapMode) {
					var rects = this.getClientRects();
					result = rects[rects.length - 1];
					result.left = result.right;
					result.left += rect.left;
					result.top += rect.top;
					result.right += rect.left;
					result.bottom += rect.top;
				} else {
					result = new TextRect(rect);
					result.left = result.right;
				}
			}
			if (absolute || absolute === undefined) {
				result.left -= rect.left;
				result.top -= rect.top;
				result.right -= rect.left;
				result.bottom -= rect.top;
			}
			return result;
		},
		/** @private */
		_getClientRects: function(element, parentRect) {
			var rects, newRects, rect, i;
			if (!element._rectsCache) {
				rects = element.getClientRects();
				newRects = new Array(rects.length);
				for (i = 0; i<rects.length; i++) {
					rect = newRects[i] = new TextRect(rects[i]);
					rect.left -= parentRect.left;
					rect.top -= parentRect.top;
					rect.right -= parentRect.left;
					rect.bottom -= parentRect.top;
				}
				element._rectsCache = newRects;
			}
			rects = element._rectsCache;
			newRects = [rects.length];
			for (i = 0; i<rects.length; i++) {
				newRects[i] = new TextRect(rects[i]);
			}
			return newRects;
		},
		/** @private */
		getClientRects: function(lineIndex) {
			if (!this.view._wrapMode) { return [this.getBoundingClientRect()]; }
			var child = this._ensureCreated();
			//TODO [perf] cache rects
			var result = [];
			var lineChild = child.firstChild, i, r, parentRect = child.getBoundingClientRect();
			while (lineChild) {
				var rects = this._getClientRects(lineChild, parentRect);
				for (i = 0; i < rects.length; i++) {
					var rect = rects[i], j;
					if (rect.top === rect.bottom) { continue; }
					var center = rect.top + (rect.bottom - rect.top) / 2;
					for (j = 0; j < result.length; j++) {
						r = result[j];
						if ((r.top <= center && center < r.bottom)) {
							break;
						}
					}
					if (j === result.length) {
						result.push(rect);
					} else {
						if (rect.left < r.left) { r.left = rect.left; }
						if (rect.top < r.top) { r.top = rect.top; }
						if (rect.right > r.right) { r.right = rect.right; }
						if (rect.bottom > r.bottom) { r.bottom = rect.bottom; }
					}
				}
				lineChild = lineChild.nextSibling;
			}
			if (lineIndex !== undefined) {
				return result[lineIndex];
			}
			return result;
		},
		/** @private */
		_getLineBoundingClientRect: function (child, noTrim) {
			var rect = new TextRect(child.getBoundingClientRect());
			if (this.view._wrapMode) {
			} else {
				rect.right = rect.left;
				var lastChild = child.lastChild;
				//Remove any artificial trailing whitespace in the line
				while (lastChild && lastChild.ignoreChars === lastChild.firstChild.length) {
					lastChild = lastChild.previousSibling;
				}
				if (lastChild) {
					var lastRect = lastChild.getBoundingClientRect();
					rect.right = lastRect.right + getLineTrim(child).right;
				}
			}
			if (noTrim) {
				var padding = getLineTrim(child);
				rect.left = rect.left + padding.left;
				rect.right = rect.right - padding.right;
			}
			return rect;
		},
		/** @private */
		getLineCount: function () {
			if (!this.view._wrapMode) { return 1; }
			return this.getClientRects().length;
		},
		/** @private */
		getLineIndex: function(offset) {
			if (!this.view._wrapMode) { return 0; }
			var rects = this.getClientRects();
			var rect = this.getBoundingClientRect(offset);
			var center = rect.top + ((rect.bottom - rect.top) / 2);
			for (var i = 0; i < rects.length; i++) {
				if (rects[i].top <= center && center < rects[i].bottom) {
					return i;
				}
			}
			return rects.length - 1;
		},
		/** @private */
		getLineStart: function (lineIndex) {
			//SCRIPTED: bugfix for https://github.com/scripted-editor/scripted/issues/234
			//if (!this.view._wrapMode || lineIndex === 0) {
			if (!this.view._wrapMode) {
			//SCRIPTED end
				return this.view._model.getLineStart(lineIndex);
			}
			var rects = this.getClientRects();
			return this.getOffset(rects[lineIndex].left + 1, rects[lineIndex].top + 1);
		},
		/** @private */
		getOffset: function(x, y) {
			var view = this.view;
			var model = view._model;
			var lineIndex = this.lineIndex;
			var lineStart = model.getLineStart(lineIndex);
			var lineEnd = model.getLineEnd(lineIndex);
			if (lineStart === lineEnd) {
				return lineStart;
			}
			var child = this._ensureCreated();
			var lineRect = this.getBoundingClientRect(), rects, rect;
			if (view._wrapMode) {
				rects = this.getClientRects();
				if (y < rects[0].top) {
					y = rects[0].top;
				}
				for (var i = 0; i < rects.length; i++) {
					rect = rects[i];
					if (rect.top <= y && y < rect.bottom) {
						break;
					}
				}
				if (x < rect.left) { x = rect.left; }
				if (x > rect.right) { x = rect.right - 1; }
			} else {
				if (x < 0) { x = 0; }
				if (x > (lineRect.right - lineRect.left)) { x = lineRect.right - lineRect.left; }
			}
			var document = child.ownerDocument;
			var window = getWindow(document);
			var xFactor = util.isIE ? window.screen.logicalXDPI / window.screen.deviceXDPI : 1;
			var yFactor = util.isIE ? window.screen.logicalYDPI / window.screen.deviceYDPI : 1;
			var offset = lineStart;
			var lineChild = child.firstChild;
			done:
			while (lineChild) {
				var textNode = lineChild.firstChild;
				var nodeLength = textNode.length;
				if (lineChild.ignoreChars) {
					nodeLength -= lineChild.ignoreChars;
				}
				var rangeLeft, rangeTop, rangeRight, rangeBottom;
				rects = this._getClientRects(lineChild, lineRect);
				for (var j = 0; j < rects.length; j++) {
					rect = rects[j];
					if (rect.left <= x && x < rect.right && (!view._wrapMode || (rect.top <= y && y < rect.bottom))) {
						var range, start, end;
						if (util.isIE || view._isRangeRects) {
							range = view._isRangeRects ? document.createRange() : document.body.createTextRange();
							var high = nodeLength;
							var low = -1;
							while ((high - low) > 1) {
								var mid = Math.floor((high + low) / 2);
								start = low + 1;
								end = mid === nodeLength - 1 && lineChild.ignoreChars ? textNode.length : mid + 1;
								if (view._isRangeRects) {
									range.setStart(textNode, start);
									range.setEnd(textNode, end);
								} else {
									range.moveToElementText(lineChild);
									range.move("character", start); //$NON-NLS-0$
									range.moveEnd("character", end - start); //$NON-NLS-0$
								}
								rects = range.getClientRects();
								var found = false;
								for (var k = 0; k < rects.length; k++) {
									rect = rects[k];
									rangeLeft = rect.left * xFactor - lineRect.left;
									rangeRight = rect.right * xFactor - lineRect.left;
									rangeTop = rect.top * yFactor - lineRect.top;
									rangeBottom = rect.bottom * yFactor - lineRect.top;
									if (rangeLeft <= x && x < rangeRight && (!view._wrapMode || (rangeTop <= y && y < rangeBottom))) {
										found = true;
										break;
									}
								}
								if (found) {
									high = mid;
								} else {
									low = mid;
								}
							}
							offset += high;
							start = high;
							end = high === nodeLength - 1 && lineChild.ignoreChars ? textNode.length : Math.min(high + 1, textNode.length);
							if (view._isRangeRects) {
								range.setStart(textNode, start);
								range.setEnd(textNode, end);
							} else {
								range.moveToElementText(lineChild);
								range.move("character", start); //$NON-NLS-0$
								range.moveEnd("character", end - start); //$NON-NLS-0$
							}
							rect = range.getClientRects()[0];
							rangeLeft = rect.left * xFactor - lineRect.left;
							rangeRight = rect.right * xFactor - lineRect.left;
							//TODO test for character trailing (wrong for bidi)
							if (x > (rangeLeft + (rangeRight - rangeLeft) / 2)) {
								offset++;
							}
						} else {
							var newText = [];
							for (var q = 0; q < nodeLength; q++) {
								newText.push("<span>"); //$NON-NLS-0$
								if (q === nodeLength - 1) {
									newText.push(textNode.data.substring(q));
								} else {
									newText.push(textNode.data.substring(q, q + 1));
								}
								newText.push("</span>"); //$NON-NLS-0$
							}
							lineChild.innerHTML = newText.join("");
							var rangeChild = lineChild.firstChild;
							while (rangeChild) {
								rect = rangeChild.getBoundingClientRect();
								rangeLeft = rect.left - lineRect.left;
								rangeRight = rect.right - lineRect.left;
								if (rangeLeft <= x && x < rangeRight) {
									//TODO test for character trailing (wrong for bidi)
									if (x > rangeLeft + (rangeRight - rangeLeft) / 2) {
										offset++;
									}
									break;
								}
								offset++;
								rangeChild = rangeChild.nextSibling;
							}
							if (!this._createdDiv) {
								lineChild.innerHTML = "";
								lineChild.appendChild(textNode);
								/*
								 * Removing the element node that holds the selection start or end
								 * causes the selection to be lost. The fix is to detect this case
								 * and restore the selection.
								 */
								var s = view._getSelection();
								if ((offset <= s.start && s.start < offset + nodeLength) || (offset <= s.end && s.end < offset + nodeLength)) {
									view._updateDOMSelection();
								}
							}
						}
						break done;
					}
				}
				offset += nodeLength;
				lineChild = lineChild.nextSibling;
			}
			return Math.min(lineEnd, Math.max(lineStart, offset));
		},
		/** @private */
		getNextOffset: function (offset, unit, direction) {
			if (unit === "line") { //$NON-NLS-0$
				var view = this.view;
				var model = view._model;
				var lineIndex = model.getLineAtOffset(offset);
				if (direction > 0) {
					return model.getLineEnd(lineIndex);
				}
				return model.getLineStart(lineIndex);
			}
			if (unit === "wordend") { //$NON-NLS-0$
				return this._getNextOffset_W3C(offset, unit, direction);
			}
			return util.isIE ? this._getNextOffset_IE(offset, unit, direction) : this._getNextOffset_W3C(offset, unit, direction);
		},
		/** @private */
		_getNextOffset_W3C: function (offset, unit, direction) {
			function _isPunctuation(c) {
				return (33 <= c && c <= 47) || (58 <= c && c <= 64) || (91 <= c && c <= 94) || c === 96 || (123 <= c && c <= 126);
			}
			function _isWhitespace(c) {
				return c === 32 || c === 9;
			}
			if (unit === "word" || unit === "wordend") { //$NON-NLS-1$ //$NON-NLS-0$
				var view = this.view;
				var model = view._model;
				var lineIndex = model.getLineAtOffset(offset);
				var lineText = model.getLine(lineIndex);
				var lineStart = model.getLineStart(lineIndex);
				var lineEnd = model.getLineEnd(lineIndex);
				var lineLength = lineText.length;
				var offsetInLine = offset - lineStart;


				var c, previousPunctuation, previousLetterOrDigit, punctuation, letterOrDigit;
				if (direction > 0) {
					if (offsetInLine === lineLength) { return lineEnd; }
					c = lineText.charCodeAt(offsetInLine);
					previousPunctuation = _isPunctuation(c);
					previousLetterOrDigit = !previousPunctuation && !_isWhitespace(c);
					offsetInLine++;
					while (offsetInLine < lineLength) {
						c = lineText.charCodeAt(offsetInLine);
						punctuation = _isPunctuation(c);
						if (unit === "wordend") { //$NON-NLS-0$
							if (!punctuation && previousPunctuation) { break; }
						} else {
							if (punctuation && !previousPunctuation) { break; }
						}
						letterOrDigit  = !punctuation && !_isWhitespace(c);
						if (unit === "wordend") { //$NON-NLS-0$
							if (!letterOrDigit && previousLetterOrDigit) { break; }
						} else {
							if (letterOrDigit && !previousLetterOrDigit) { break; }
						}
						previousLetterOrDigit = letterOrDigit;
						previousPunctuation = punctuation;
						offsetInLine++;
					}
				} else {
					if (offsetInLine === 0) { return lineStart; }
					offsetInLine--;
					c = lineText.charCodeAt(offsetInLine);
					previousPunctuation = _isPunctuation(c);
					previousLetterOrDigit = !previousPunctuation && !_isWhitespace(c);
					while (0 < offsetInLine) {
						c = lineText.charCodeAt(offsetInLine - 1);
						punctuation = _isPunctuation(c);
						if (unit === "wordend") { //$NON-NLS-0$
							if (punctuation && !previousPunctuation) { break; }
						} else {
							if (!punctuation && previousPunctuation) { break; }
						}
						letterOrDigit  = !punctuation && !_isWhitespace(c);
						if (unit === "wordend") { //$NON-NLS-0$
							if (letterOrDigit && !previousLetterOrDigit) { break; }
						} else {
							if (!letterOrDigit && previousLetterOrDigit) { break; }
						}
						previousLetterOrDigit = letterOrDigit;
						previousPunctuation = punctuation;
						offsetInLine--;
					}
				}
				return lineStart + offsetInLine;
			}
			return offset + direction;
		},
		/** @private */
		_getNextOffset_IE: function (offset, unit, direction) {
			var child = this._ensureCreated();
			var view = this.view;
			var model = view._model;
			var lineIndex = this.lineIndex;
			var result = 0, range, length;
			var lineOffset = model.getLineStart(lineIndex);
			var document = child.ownerDocument;
			if (offset === model.getLineEnd(lineIndex)) {
				range = document.body.createTextRange();
				range.moveToElementText(child.lastChild);
				length = range.text.length;
				range.moveEnd(unit, direction);
				result = offset + range.text.length - length;
			} else if (offset === lineOffset && direction < 0) {
				result = lineOffset;
			} else {
				var lineChild = child.firstChild;
				while (lineChild) {
					var textNode = lineChild.firstChild;
					var nodeLength = textNode.length;
					if (lineChild.ignoreChars) {
						nodeLength -= lineChild.ignoreChars;
					}
					if (lineOffset + nodeLength > offset) {
						range = document.body.createTextRange();
						if (offset === lineOffset && direction < 0) {
							range.moveToElementText(lineChild.previousSibling);
						} else {
							range.moveToElementText(lineChild);
							range.collapse();
							range.moveEnd("character", offset - lineOffset); //$NON-NLS-0$
						}
						length = range.text.length;
						range.moveEnd(unit, direction);
						result = offset + range.text.length - length;
						break;
					}
					lineOffset = nodeLength + lineOffset;
					lineChild = lineChild.nextSibling;
				}
			}
			return result;
		},
		/** @private */
		destroy: function() {
			var div = this._createdDiv;
			if (div) {
				div.parentNode.removeChild(div);
				this._createdDiv = null;
			}
		}
	};

	/**
	 * @class This object describes the options for the text view.
	 * <p>
	 * <b>See:</b><br/>
	 * {@link orion.textview.TextView}<br/>
	 * {@link orion.textview.TextView#setOptions}
	 * {@link orion.textview.TextView#getOptions}
	 * </p>
	 * @name orion.textview.TextViewOptions
	 *
	 * @property {String|DOMElement} parent the parent element for the view, it can be either a DOM element or an ID for a DOM element.
	 * @property {orion.textview.TextModel} [model] the text model for the view. If it is not set the view creates an empty {@link orion.textview.TextModel}.
	 * @property {Boolean} [readonly=false] whether or not the view is read-only.
	 * @property {Boolean} [fullSelection=true] whether or not the view is in full selection mode.
	 * @property {Boolean} [tabMode=true] whether or not the tab keypress is consumed by the view or is used for focus traversal.
	 * @property {Boolean} [expandTab=false] whether or not the tab key inserts white spaces.
	 * @property {String} [themeClass] the CSS class for the view theming.
	 * @property {Number} [tabSize=8] The number of spaces in a tab.
	 * @property {Boolean} [wrapMode=false] whether or not the view wraps lines.
	 */
	/**
	 * Constructs a new text view.
	 *
	 * @param {orion.textview.TextViewOptions} options the view options.
	 *
	 * @class A TextView is a user interface for editing text.
	 * @name orion.textview.TextView
	 * @borrows orion.textview.EventTarget#addEventListener as #addEventListener
	 * @borrows orion.textview.EventTarget#removeEventListener as #removeEventListener
	 * @borrows orion.textview.EventTarget#dispatchEvent as #dispatchEvent
	 */
	function TextView (options) {
		this._init(options);
	}

	TextView.prototype = /** @lends orion.textview.TextView.prototype */ {

		addKeyPressHandler: function (keyPressHandler) {
			if (!this._keyPressHandlers) {
				this._keyPressHandlers = [];
			}
			this._keyPressHandlers.splice(0,0,keyPressHandler);
		},
		getKeyPressHandlers: function () {
			return this._keyPressHandlers;
		},
		removeKeyPressHandler: function(keyPressHandler) {
			for (var i=0;i<this._keyPressHandlers.length;i++) {
				if (this._keyPressHandlers[i]==keyPressHandler) {
					this._keyPressHandlers.splice(i,1);
					return true;
				}
			}
			return false;
		},
		clearKeyPressHandlers: function() {
			this._keyPressHandlers = [];
		},
		/**
		 * Adds a ruler to the text view at the specified position.
		 * <p>
		 * The position is relative to the ruler location.
		 * </p>
		 *
		 * @param {orion.textview.Ruler} ruler the ruler.
		 * @param {Number} [index=length] the ruler index.
		 */
		addRuler: function (ruler, index) {
			ruler.setView(this);
			var rulers = this._rulers;
			if (index !== undefined) {
				var i, sideIndex;
				for (i = 0, sideIndex=0; i < rulers.length && sideIndex < index; i++) {
					if (ruler.getLocation() === rulers[i].getLocation()) {
						sideIndex++;
					}
				}
				rulers.splice(sideIndex, 0, ruler);
				index = sideIndex;
			} else {
				rulers.push(ruler);
			}
			this._createRuler(ruler, index);
			this._update();
		},
		computeSize: function() {
			var w = 0, h = 0;
			var model = this._model, clientDiv = this._clientDiv;
			if (!clientDiv) { return {width: w, height: h}; }
			var clientWidth = clientDiv.style.width;
			/*
			* Feature in WekKit. Webkit limits the width of the lines
			* computed below to the width of the client div.  This causes
			* the lines to be wrapped even though "pre" is set.  The fix
			* is to set the width of the client div to a "0x7fffffffpx"
			* before computing the lines width.  Note that this value is
			* reset to the appropriate value further down.
			*/
			if (util.isWebkit) {
				clientDiv.style.width = "0x7fffffffpx"; //$NON-NLS-0$
			}
			var lineCount = model.getLineCount();
			for (var lineIndex=0; lineIndex<lineCount; lineIndex++) {
				var line = this._getLine(lineIndex);
				var rect = line.getBoundingClientRect();
				w = Math.max(w, rect.right - rect.left);
				h += rect.bottom - rect.top;
				line.destroy();
			}
			if (util.isWebkit) {
				clientDiv.style.width = clientWidth;
			}
			var viewPadding = this._getViewPadding();
			w += viewPadding.right + viewPadding.left;
			h += viewPadding.bottom + viewPadding.top;
			return {width: w, height: h};
		},
		/**
		 * Converts the given rectangle from one coordinate spaces to another.
		 * <p>The supported coordinate spaces are:
		 * <ul>
		 *   <li>"document" - relative to document, the origin is the top-left corner of first line</li>
		 *   <li>"page" - relative to html page that contains the text view</li>
		 * </ul>
		 * </p>
		 * <p>All methods in the view that take or return a position are in the document coordinate space.</p>
		 *
		 * @param rect the rectangle to convert.
		 * @param rect.x the x of the rectangle.a
		 * @param rect.y the y of the rectangle.
		 * @param rect.width the width of the rectangle.
		 * @param rect.height the height of the rectangle.
		 * @param {String} from the source coordinate space.
		 * @param {String} to the destination coordinate space.
		 *
		 * @see #getLocationAtOffset
		 * @see #getOffsetAtLocation
		 * @see #getTopPixel
		 * @see #setTopPixel
		 */
		convert: function(rect, from, to) {
			if (!this._clientDiv) { return; }
			var scroll = this._getScroll();
			var viewPad = this._getViewPadding();
			var viewRect = this._viewDiv.getBoundingClientRect();
			if (from === "document") { //$NON-NLS-0$
				if (rect.x !== undefined) {
					rect.x += - scroll.x + viewRect.left + viewPad.left;
				}
				if (rect.y !== undefined) {
					rect.y += - scroll.y + viewRect.top + viewPad.top;
				}
			}
			//At this point rect is in the widget coordinate space
			if (to === "document") { //$NON-NLS-0$
				if (rect.x !== undefined) {
					rect.x += scroll.x - viewRect.left - viewPad.left;
				}
				if (rect.y !== undefined) {
					rect.y += scroll.y - viewRect.top - viewPad.top;
				}
			}
			return rect;
		},
		/**
		 * Destroys the text view.
		 * <p>
		 * Removes the view from the page and frees all resources created by the view.
		 * Calling this function causes the "Destroy" event to be fire so that all components
		 * attached to view can release their references.
		 * </p>
		 *
		 * @see #onDestroy
		 */
		destroy: function() {
			/* Destroy rulers*/
			for (var i=0; i< this._rulers.length; i++) {
				this._rulers[i].setView(null);
			}
			this.rulers = null;

			this._destroyView();

			var e = {type: "Destroy"}; //$NON-NLS-0$
			this.onDestroy(e);

			this._parent = null;
			this._model = null;
			this._selection = null;
			this._doubleClickSelection = null;
			this._keyBindings = null;
			this._actions = null;
		},
		/**
		 * Gives focus to the text view.
		 */
		focus: function() {
			if (!this._clientDiv) { return; }
			/*
			* Feature in Chrome. When focus is called in the clientDiv without
			* setting selection the browser will set the selection to the first dom
			* element, which can be above the client area. When this happen the
			* browser also scrolls the window to show that element.
			* The fix is to call _updateDOMSelection() before calling focus().
			*/
			this._updateDOMSelection();
			if (util.isOpera) { this._clientDiv.blur(); }
			this._clientDiv.focus();
			/*
			* Feature in Safari. When focus is called the browser selects the clientDiv
			* itself. The fix is to call _updateDOMSelection() after calling focus().
			*/
			this._updateDOMSelection();
		},
		/**
		 * Check if the text view has focus.
		 *
		 * @returns {Boolean} <code>true</code> if the text view has focus, otherwise <code>false</code>.
		 */
		hasFocus: function() {
			return this._hasFocus;
		},
		/**
		 * Returns the action description for a given action ID.
		 *
		 * @returns {orion.textview.ActionDescrition} the action description
		 */
		getActionDescription: function(actionID) {
			var action = this._actions[actionID];
			if (action) {
				return action.actionDescription;
			}
			return undefined;
		},
		/**
		 * Returns all action IDs defined in the text view.
		 * <p>
		 * There are two types of actions, the predefined actions of the view
		 * and the actions added by application code.
		 * </p>
		 * <p>
		 * The predefined actions are:
		 * <ul>
		 *   <li>Navigation actions. These actions move the caret collapsing the selection.</li>
		 *     <ul>
		 *       <li>"lineUp" - moves the caret up by one line</li>
		 *       <li>"lineDown" - moves the caret down by one line</li>
		 *       <li>"lineStart" - moves the caret to beginning of the current line</li>
		 *       <li>"lineEnd" - moves the caret to end of the current line </li>
		 *       <li>"charPrevious" - moves the caret to the previous character</li>
		 *       <li>"charNext" - moves the caret to the next character</li>
		 *       <li>"pageUp" - moves the caret up by one page</li>
		 *       <li>"pageDown" - moves the caret down by one page</li>
		 *       <li>"wordPrevious" - moves the caret to the previous word</li>
		 *       <li>"wordNext" - moves the caret to the next word</li>
		 *       <li>"textStart" - moves the caret to the beginning of the document</li>
		 *       <li>"textEnd" - moves the caret to the end of the document</li>
		 *     </ul>
		 *   <li>Selection actions. These actions move the caret extending the selection.</li>
		 *     <ul>
		 *       <li>"selectLineUp" - moves the caret up by one line</li>
		 *       <li>"selectLineDown" - moves the caret down by one line</li>
		 *       <li>"selectLineStart" - moves the caret to beginning of the current line</li>
		 *       <li>"selectLineEnd" - moves the caret to end of the current line </li>
		 *       <li>"selectCharPrevious" - moves the caret to the previous character</li>
		 *       <li>"selectCharNext" - moves the caret to the next character</li>
		 *       <li>"selectPageUp" - moves the caret up by one page</li>
		 *       <li>"selectPageDown" - moves the caret down by one page</li>
		 *       <li>"selectWordPrevious" - moves the caret to the previous word</li>
		 *       <li>"selectWordNext" - moves the caret to the next word</li>
		 *       <li>"selectTextStart" - moves the caret to the beginning of the document</li>
		 *       <li>"selectTextEnd" - moves the caret to the end of the document</li>
		 *       <li>"selectAll" - selects the entire document</li>
		 *     </ul>
		 *   <li>Edit actions. These actions modify the text view text</li>
		 *     <ul>
		 *       <li>"deletePrevious" - deletes the character preceding the caret</li>
		 *       <li>"deleteNext" - deletes the charecter following the caret</li>
		 *       <li>"deleteWordPrevious" - deletes the word preceding the caret</li>
		 *       <li>"deleteWordNext" - deletes the word following the caret</li>
		 *       <li>"tab" - inserts a tab character at the caret</li>
		 *       <li>"shiftTab" - noop</li>
		 *       <li>"toggleTabMode" - toggles tab mode.</li>
		 *       <li>"toggleWrapMode" - toggles wrap mode.</li>
		 *       <li>"enter" - inserts a line delimiter at the caret</li>
		 *     </ul>
		 *   <li>Clipboard actions.</li>
		 *     <ul>
		 *       <li>"copy" - copies the selected text to the clipboard</li>
		 *       <li>"cut" - copies the selected text to the clipboard and deletes the selection</li>
		 *       <li>"paste" - replaces the selected text with the clipboard contents</li>
		 *     </ul>
		 * </ul>
		 * </p>
		 *
		 * @param {Boolean} [defaultAction=false] whether or not the predefined actions are included.
		 * @returns {String[]} an array of action IDs defined in the text view.
		 *
		 * @see #invokeAction
		 * @see #setAction
		 * @see #setKeyBinding
		 * @see #getKeyBindings
		 */
		getActions: function (defaultAction) {
			var result = [];
			var actions = this._actions;
			for (var i in actions) {
				if (actions.hasOwnProperty(i)) {
					if (!defaultAction && actions[i].defaultHandler) { continue; }
					result.push(i);
				}
			}
			return result;
		},
		/**
		 * Returns the bottom index.
		 * <p>
		 * The bottom index is the line that is currently at the bottom of the view.  This
		 * line may be partially visible depending on the vertical scroll of the view. The parameter
		 * <code>fullyVisible</code> determines whether to return only fully visible lines.
		 * </p>
		 *
		 * @param {Boolean} [fullyVisible=false] if <code>true</code>, returns the index of the last fully visible line. This
		 *    parameter is ignored if the view is not big enough to show one line.
		 * @returns {Number} the index of the bottom line.
		 *
		 * @see #getTopIndex
		 * @see #setTopIndex
		 */
		getBottomIndex: function(fullyVisible) {
			if (!this._clientDiv) { return 0; }
			return this._getBottomIndex(fullyVisible);
		},
		/**
		 * Returns the bottom pixel.
		 * <p>
		 * The bottom pixel is the pixel position that is currently at
		 * the bottom edge of the view.  This position is relative to the
		 * beginning of the document.
		 * </p>
		 *
		 * @returns {Number} the bottom pixel.
		 *
		 * @see #getTopPixel
		 * @see #setTopPixel
		 * @see #convert
		 */
		getBottomPixel: function() {
			if (!this._clientDiv) { return 0; }
			return this._getScroll().y + this._getClientHeight();
		},
		/**
		 * Returns the caret offset relative to the start of the document.
		 *
		 * @returns the caret offset relative to the start of the document.
		 *
		 * @see #setCaretOffset
		 * @see #setSelection
		 * @see #getSelection
		 */
		getCaretOffset: function () {
			var s = this._getSelection();
			return s.getCaret();
		},
		/**
		 * Returns the client area.
		 * <p>
		 * The client area is the portion in pixels of the document that is visible. The
		 * client area position is relative to the beginning of the document.
		 * </p>
		 *
		 * @returns the client area rectangle {x, y, width, height}.
		 *
		 * @see #getTopPixel
		 * @see #getBottomPixel
		 * @see #getHorizontalPixel
		 * @see #convert
		 */
		getClientArea: function() {
			if (!this._clientDiv) { return {x: 0, y: 0, width: 0, height: 0}; }
			var scroll = this._getScroll();
			return {x: scroll.x, y: scroll.y, width: this._getClientWidth(), height: this._getClientHeight()};
		},
		/**
		 * Returns the horizontal pixel.
		 * <p>
		 * The horizontal pixel is the pixel position that is currently at
		 * the left edge of the view.  This position is relative to the
		 * beginning of the document.
		 * </p>
		 *
		 * @returns {Number} the horizontal pixel.
		 *
		 * @see #setHorizontalPixel
		 * @see #convert
		 */
		getHorizontalPixel: function() {
			if (!this._clientDiv) { return 0; }
			return this._getScroll().x;
		},
		/**
		 * Returns all the key bindings associated to the given action ID.
		 *
		 * @param {String} actionID the action ID.
		 * @returns {orion.textview.KeyBinding[]} the array of key bindings associated to the given action ID.
		 *
		 * @see #setKeyBinding
		 * @see #setAction
		 */
		getKeyBindings: function (actionID) {
			var result = [];
			var keyBindings = this._keyBindings;
			for (var i = 0; i < keyBindings.length; i++) {
				if (keyBindings[i].actionID === actionID) {
					result.push(keyBindings[i].keyBinding);
				}
			}
			return result;
		},
		/**
		 * Returns the line height for a given line index.  Returns the default line
		 * height if the line index is not specified.
		 *
		 * @param {Number} [lineIndex] the line index.
		 * @returns {Number} the height of the line in pixels.
		 *
		 * @see #getLinePixel
		 */
		getLineHeight: function(lineIndex) {
			if (!this._clientDiv) { return 0; }
			return this._getLineHeight(lineIndex);
		},
		/**
		 * Returns the line index for a given line pixel position relative to the document.
		 *
		 * @param {Number} [y] the line pixel.
		 * @returns {Number} the line index for the specified pixel position.
		 *
		 * @see #getLinePixel
		 */
		getLineIndex: function(y) {
			if (!this._clientDiv) { return 0; }
			return this._getLineIndex(y);
		},
		/**
		 * Returns the top pixel position of a given line index relative to the beginning
		 * of the document.
		 * <p>
		 * Clamps out of range indices.
		 * </p>
		 *
		 * @param {Number} lineIndex the line index.
		 * @returns {Number} the pixel position of the line.
		 *
		 * @see #setTopPixel
		 * @see #getLineIndex
		 * @see #convert
		 */
		getLinePixel: function(lineIndex) {
			if (!this._clientDiv) { return 0; }
			return this._getLinePixel(lineIndex);
		},
		/**
		 * Returns the {x, y} pixel location of the top-left corner of the character
		 * bounding box at the specified offset in the document.  The pixel location
		 * is relative to the document.
		 * <p>
		 * Clamps out of range offsets.
		 * </p>
		 *
		 * @param {Number} offset the character offset
		 * @returns the {x, y} pixel location of the given offset.
		 *
		 * @see #getOffsetAtLocation
		 * @see #convert
		 */
		getLocationAtOffset: function(offset) {
			if (!this._clientDiv) { return {x: 0, y: 0}; }
			var model = this._model;
			offset = Math.min(Math.max(0, offset), model.getCharCount());
			var lineIndex = model.getLineAtOffset(offset);
			var line = this._getLine(lineIndex);
			var rect = line.getBoundingClientRect(offset);
			line.destroy();
			var x = rect.left;
			var y = this._getLinePixel(lineIndex) + rect.top;
			return {x: x, y: y};
		},
		/**
		 * Returns the specified view options.
		 * <p>
		 * The returned value is either a <code>orion.textview.TextViewOptions</code> or an option value. An option value is returned when only one string paremeter
		 * is specified. A <code>orion.textview.TextViewOptions</code> is returned when there are no paremeters, or the parameters are a list of options names or a
		 * <code>orion.textview.TextViewOptions</code>. All view options are returned when there no paremeters.
		 * </p>
		 *
		 * @param {String|orion.textview.TextViewOptions} [options] The options to return.
		 * @return {Object|orion.textview.TextViewOptions} The requested options or an option value.
		 *
		 * @see #setOptions
		 */
		getOptions: function() {
			var options;
			if (arguments.length === 0) {
				options = this._defaultOptions();
			} else if (arguments.length === 1) {
				var arg = arguments[0];
				if (typeof arg === "string") { //$NON-NLS-0$
					return clone(this["_" + arg]); //$NON-NLS-0$
				}
				options = arg;
			} else {
				options = {};
				for (var index in arguments) {
					if (arguments.hasOwnProperty(index)) {
						options[arguments[index]] = undefined;
					}
				}
			}
			for (var option in options) {
				if (options.hasOwnProperty(option)) {
					options[option] = clone(this["_" + option]); //$NON-NLS-0$
				}
			}
			return options;
		},
		/**
		 * Returns the text model of the text view.
		 *
		 * @returns {orion.textview.TextModel} the text model of the view.
		 */
		getModel: function() {
			return this._model;
		},
		/**
		 * Returns the character offset nearest to the given pixel location.  The
		 * pixel location is relative to the document.
		 *
		 * @param x the x of the location
		 * @param y the y of the location
		 * @returns the character offset at the given location.
		 *
		 * @see #getLocationAtOffset
		 */
		getOffsetAtLocation: function(x, y) {
			if (!this._clientDiv) { return 0; }
			var lineIndex = this._getLineIndex(y);
			var line = this._getLine(lineIndex);
			var offset = line.getOffset(x, y - this._getLinePixel(lineIndex));
			line.destroy();
			return offset;
		},
		/**
		 * Get the view rulers.
		 *
		 * @returns the view rulers
		 *
		 * @see #addRuler
		 */
		getRulers: function() {
			return this._rulers.slice(0);
		},
		/**
		 * Returns the text view selection.
		 * <p>
		 * The selection is defined by a start and end character offset relative to the
		 * document. The character at end offset is not included in the selection.
		 * </p>
		 *
		 * @returns {orion.textview.Selection} the view selection
		 *
		 * @see #setSelection
		 */
		getSelection: function () {
			var s = this._getSelection();
			return {start: s.start, end: s.end};
		},
		/**
		 * Returns the text for the given range.
		 * <p>
		 * The text does not include the character at the end offset.
		 * </p>
		 *
		 * @param {Number} [start=0] the start offset of text range.
		 * @param {Number} [end=char count] the end offset of text range.
		 *
		 * @see #setText
		 */
		getText: function(start, end) {
			var model = this._model;
			return model.getText(start, end);
		},
		/**
		 * Returns the top index.
		 * <p>
		 * The top index is the line that is currently at the top of the view.  This
		 * line may be partially visible depending on the vertical scroll of the view. The parameter
		 * <code>fullyVisible</code> determines whether to return only fully visible lines.
		 * </p>
		 *
		 * @param {Boolean} [fullyVisible=false] if <code>true</code>, returns the index of the first fully visible line. This
		 *    parameter is ignored if the view is not big enough to show one line.
		 * @returns {Number} the index of the top line.
		 *
		 * @see #getBottomIndex
		 * @see #setTopIndex
		 */
		getTopIndex: function(fullyVisible) {
			if (!this._clientDiv) { return 0; }
			return this._getTopIndex(fullyVisible);
		},
		/**
		 * Returns the top pixel.
		 * <p>
		 * The top pixel is the pixel position that is currently at
		 * the top edge of the view.  This position is relative to the
		 * beginning of the document.
		 * </p>
		 *
		 * @returns {Number} the top pixel.
		 *
		 * @see #getBottomPixel
		 * @see #setTopPixel
		 * @see #convert
		 */
		getTopPixel: function() {
			if (!this._clientDiv) { return 0; }
			return this._getScroll().y;
		},
		/**
		 * Executes the action handler associated with the given action ID.
		 * <p>
		 * The application defined action takes precedence over predefined actions unless
		 * the <code>defaultAction</code> paramater is <code>true</code>.
		 * </p>
		 * <p>
		 * If the application defined action returns <code>false</code>, the text view predefined
		 * action is executed if present.
		 * </p>
		 *
		 * @param {String} actionID the action ID.
		 * @param {Boolean} [defaultAction] whether to always execute the predefined action.
		 * @returns {Boolean} <code>true</code> if the action was executed.
		 *
		 * @see #setAction
		 * @see #getActions
		 */
		invokeAction: function (actionID, defaultAction) {
			if (!this._clientDiv) { return; }
			var action = this._actions[actionID];
			if (action) {
				if (!defaultAction && action.handler) {
					if (action.handler()) { return; }
				}
				if (action.defaultHandler) { return action.defaultHandler(); }
			}
			return false;
		},
		/**
		* Returns if the view is destroyed.
		* @returns {Boolean} <code>true</code> if the view is destroyed.
		*/
		isDestroyed: function () {
			return !this._clientDiv;
		},
		/**
		 * @class This is the event sent when the user right clicks or otherwise invokes the context menu of the view.
		 * <p>
		 * <b>See:</b><br/>
		 * {@link orion.textview.TextView}<br/>
		 * {@link orion.textview.TextView#event:onContextMenu}
		 * </p>
		 *
		 * @name orion.textview.ContextMenuEvent
		 *
		 * @property {Number} x The pointer location on the x axis, relative to the document the user is editing.
		 * @property {Number} y The pointer location on the y axis, relative to the document the user is editing.
		 * @property {Number} screenX The pointer location on the x axis, relative to the screen. This is copied from the DOM contextmenu event.screenX property.
		 * @property {Number} screenY The pointer location on the y axis, relative to the screen. This is copied from the DOM contextmenu event.screenY property.
		 * @property {Boolean} defaultPrevented Determines whether the user agent context menu should be shown. It is shown by default.
		 * @property {Function} preventDefault If called prevents the user agent context menu from showing.
		 */
		/**
		 * This event is sent when the user invokes the view context menu.
		 *
		 * @event
		 * @param {orion.textview.ContextMenuEvent} contextMenuEvent the event
		 */
		onContextMenu: function(contextMenuEvent) {
			return this.dispatchEvent(contextMenuEvent);
		},
		onDragStart: function(dragEvent) {
			return this.dispatchEvent(dragEvent);
		},
		onDrag: function(dragEvent) {
			return this.dispatchEvent(dragEvent);
		},
		onDragEnd: function(dragEvent) {
			return this.dispatchEvent(dragEvent);
		},
		onDragEnter: function(dragEvent) {
			return this.dispatchEvent(dragEvent);
		},
		onDragOver: function(dragEvent) {
			return this.dispatchEvent(dragEvent);
		},
		onDragLeave: function(dragEvent) {
			return this.dispatchEvent(dragEvent);
		},
		onDrop: function(dragEvent) {
			return this.dispatchEvent(dragEvent);
		},
		/**
		 * @class This is the event sent when the text view is destroyed.
		 * <p>
		 * <b>See:</b><br/>
		 * {@link orion.textview.TextView}<br/>
		 * {@link orion.textview.TextView#event:onDestroy}
		 * </p>
		 * @name orion.textview.DestroyEvent
		 */
		/**
		 * This event is sent when the text view has been destroyed.
		 *
		 * @event
		 * @param {orion.textview.DestroyEvent} destroyEvent the event
		 *
		 * @see #destroy
		 */
		onDestroy: function(destroyEvent) {
			return this.dispatchEvent(destroyEvent);
		},
		/**
		 * @class This object is used to define style information for the text view.
		 * <p>
		 * <b>See:</b><br/>
		 * {@link orion.textview.TextView}<br/>
		 * {@link orion.textview.TextView#event:onLineStyle}
		 * </p>
		 * @name orion.textview.Style
		 *
		 * @property {String} styleClass A CSS class name.
		 * @property {Object} style An object with CSS properties.
		 * @property {String} tagName A DOM tag name.
		 * @property {Object} attributes An object with DOM attributes.
		 */
		/**
		 * @class This object is used to style range.
		 * <p>
		 * <b>See:</b><br/>
		 * {@link orion.textview.TextView}<br/>
		 * {@link orion.textview.TextView#event:onLineStyle}
		 * </p>
		 * @name orion.textview.StyleRange
		 *
		 * @property {Number} start The start character offset, relative to the document, where the style should be applied.
		 * @property {Number} end The end character offset (exclusive), relative to the document, where the style should be applied.
		 * @property {orion.textview.Style} style The style for the range.
		 */
		/**
		 * @class This is the event sent when the text view needs the style information for a line.
		 * <p>
		 * <b>See:</b><br/>
		 * {@link orion.textview.TextView}<br/>
		 * {@link orion.textview.TextView#event:onLineStyle}
		 * </p>
		 * @name orion.textview.LineStyleEvent
		 *
		 * @property {orion.textview.TextView} textView The text view.
		 * @property {Number} lineIndex The line index.
		 * @property {String} lineText The line text.
		 * @property {Number} lineStart The character offset, relative to document, of the first character in the line.
		 * @property {orion.textview.Style} style The style for the entire line (output argument).
		 * @property {orion.textview.StyleRange[]} ranges An array of style ranges for the line (output argument).
		 */
		/**
		 * This event is sent when the text view needs the style information for a line.
		 *
		 * @event
		 * @param {orion.textview.LineStyleEvent} lineStyleEvent the event
		 */
		onLineStyle: function(lineStyleEvent) {
			return this.dispatchEvent(lineStyleEvent);
		},
		/**
		 * @class This is the event sent when the text in the model has changed.
		 * <p>
		 * <b>See:</b><br/>
		 * {@link orion.textview.TextView}<br/>
		 * {@link orion.textview.TextView#event:onModelChanged}<br/>
		 * {@link orion.textview.TextModel#onChanged}
		 * </p>
		 * @name orion.textview.ModelChangedEvent
		 *
		 * @property {Number} start The character offset in the model where the change has occurred.
		 * @property {Number} removedCharCount The number of characters removed from the model.
		 * @property {Number} addedCharCount The number of characters added to the model.
		 * @property {Number} removedLineCount The number of lines removed from the model.
		 * @property {Number} addedLineCount The number of lines added to the model.
		 */
		/**
		 * This event is sent when the text in the model has changed.
		 *
		 * @event
		 * @param {orion.textview.ModelChangedEvent} modelChangedEvent the event
		 */
		onModelChanged: function(modelChangedEvent) {
			return this.dispatchEvent(modelChangedEvent);
		},
		/**
		 * @class This is the event sent when the text in the model is about to change.
		 * <p>
		 * <b>See:</b><br/>
		 * {@link orion.textview.TextView}<br/>
		 * {@link orion.textview.TextView#event:onModelChanging}<br/>
		 * {@link orion.textview.TextModel#onChanging}
		 * </p>
		 * @name orion.textview.ModelChangingEvent
		 *
		 * @property {String} text The text that is about to be inserted in the model.
		 * @property {Number} start The character offset in the model where the change will occur.
		 * @property {Number} removedCharCount The number of characters being removed from the model.
		 * @property {Number} addedCharCount The number of characters being added to the model.
		 * @property {Number} removedLineCount The number of lines being removed from the model.
		 * @property {Number} addedLineCount The number of lines being added to the model.
		 */
		/**
		 * This event is sent when the text in the model is about to change.
		 *
		 * @event
		 * @param {orion.textview.ModelChangingEvent} modelChangingEvent the event
		 */
		onModelChanging: function(modelChangingEvent) {
			return this.dispatchEvent(modelChangingEvent);
		},
		/**
		 * @class This is the event sent when the text is modified by the text view.
		 * <p>
		 * <b>See:</b><br/>
		 * {@link orion.textview.TextView}<br/>
		 * {@link orion.textview.TextView#event:onModify}
		 * </p>
		 * @name orion.textview.ModifyEvent
		 */
		/**
		 * This event is sent when the text view has changed text in the model.
		 * <p>
		 * If the text is changed directly through the model API, this event
		 * is not sent.
		 * </p>
		 *
		 * @event
		 * @param {orion.textview.ModifyEvent} modifyEvent the event
		 */
		onModify: function(modifyEvent) {
			return this.dispatchEvent(modifyEvent);
		},
		onMouseDown: function(mouseEvent) {
			return this.dispatchEvent(mouseEvent);
		},
		onMouseUp: function(mouseEvent) {
			return this.dispatchEvent(mouseEvent);
		},
		onMouseMove: function(mouseEvent) {
			return this.dispatchEvent(mouseEvent);
		},
		onMouseOver: function(mouseEvent) {
			return this.dispatchEvent(mouseEvent);
		},
		onMouseOut: function(mouseEvent) {
			return this.dispatchEvent(mouseEvent);
		},
		/**
		 * @class This is the event sent when the selection changes in the text view.
		 * <p>
		 * <b>See:</b><br/>
		 * {@link orion.textview.TextView}<br/>
		 * {@link orion.textview.TextView#event:onSelection}
		 * </p>
		 * @name orion.textview.SelectionEvent
		 *
		 * @property {orion.textview.Selection} oldValue The old selection.
		 * @property {orion.textview.Selection} newValue The new selection.
		 */
		/**
		 * This event is sent when the text view selection has changed.
		 *
		 * @event
		 * @param {orion.textview.SelectionEvent} selectionEvent the event
		 */
		onSelection: function(selectionEvent) {
			return this.dispatchEvent(selectionEvent);
		},
		/**
		 * @class This is the event sent when the text view scrolls.
		 * <p>
		 * <b>See:</b><br/>
		 * {@link orion.textview.TextView}<br/>
		 * {@link orion.textview.TextView#event:onScroll}
		 * </p>
		 * @name orion.textview.ScrollEvent
		 *
		 * @property oldValue The old scroll {x,y}.
		 * @property newValue The new scroll {x,y}.
		 */
		/**
		 * This event is sent when the text view scrolls vertically or horizontally.
		 *
		 * @event
		 * @param {orion.textview.ScrollEvent} scrollEvent the event
		 */
		onScroll: function(scrollEvent) {
			return this.dispatchEvent(scrollEvent);
		},
		/**
		 * @class This is the event sent when the text is about to be modified by the text view.
		 * <p>
		 * <b>See:</b><br/>
		 * {@link orion.textview.TextView}<br/>
		 * {@link orion.textview.TextView#event:onVerify}
		 * </p>
		 * @name orion.textview.VerifyEvent
		 *
		 * @property {String} text The text being inserted.
		 * @property {Number} start The start offset of the text range to be replaced.
		 * @property {Number} end The end offset (exclusive) of the text range to be replaced.
		 */
		/**
		 * This event is sent when the text view is about to change text in the model.
		 * <p>
		 * If the text is changed directly through the model API, this event
		 * is not sent.
		 * </p>
		 * <p>
		 * Listeners are allowed to change these parameters. Setting text to null
		 * or undefined stops the change.
		 * </p>
		 *
		 * @event
		 * @param {orion.textview.VerifyEvent} verifyEvent the event
		 */
		onVerify: function(verifyEvent) {
			return this.dispatchEvent(verifyEvent);
		},
		/**
		 * @class This is the event sent when the text view is focused.
		 * <p>
		 * <b>See:</b><br/>
		 * {@link orion.textview.TextView}<br/>
		 * {@link orion.textview.TextView#event:onFocus}<br/>
		 * </p>
		 * @name orion.textview.FocusEvent
		 */
		/**
		 * This event is sent when the text view is focused.
		 *
		 * @event
		 * @param {orion.textview.FocusEvent} focusEvent the event
		 */
		onFocus: function(focusEvent) {
			return this.dispatchEvent(focusEvent);
		},
		/**
		 * @class This is the event sent when the text view goes out of focus.
		 * <p>
		 * <b>See:</b><br/>
		 * {@link orion.textview.TextView}<br/>
		 * {@link orion.textview.TextView#event:onBlur}<br/>
		 * </p>
		 * @name orion.textview.BlurEvent
		 */
		/**
		 * This event is sent when the text view goes out of focus.
		 *
		 * @event
		 * @param {orion.textview.BlurEvent} blurEvent the event
		 */
		onBlur: function(blurEvent) {
			return this.dispatchEvent(blurEvent);
		},
		/**
		 * Redraws the entire view, including rulers.
		 *
		 * @see #redrawLines
		 * @see #redrawRange
		 * @see #setRedraw
		 */
		redraw: function() {
			if (this._redrawCount > 0) { return; }
			var lineCount = this._model.getLineCount();
			this.redrawRulers(0, lineCount);
			this.redrawLines(0, lineCount);
		},
		redrawRulers: function(startLine, endLine) {
			if (this._redrawCount > 0) { return; }
			var rulers = this.getRulers();
			for (var i = 0; i < rulers.length; i++) {
				this.redrawLines(startLine, endLine, rulers[i]);
			}
		},
		/**
		 * Redraws the text in the given line range.
		 * <p>
		 * The line at the end index is not redrawn.
		 * </p>
		 *
		 * @param {Number} [startLine=0] the start line
		 * @param {Number} [endLine=line count] the end line
		 *
		 * @see #redraw
		 * @see #redrawRange
		 * @see #setRedraw
		 */
		redrawLines: function(startLine, endLine, ruler) {
			if (this._redrawCount > 0) { return; }
			if (startLine === undefined) { startLine = 0; }
			if (endLine === undefined) { endLine = this._model.getLineCount(); }
			if (startLine === endLine) { return; }
			var div = this._clientDiv;
			if (!div) { return; }
			if (ruler) {
				var location = ruler.getLocation();//"left" or "right"
				var divRuler = location === "left" ? this._leftDiv : this._rightDiv; //$NON-NLS-0$
				var cells = divRuler.firstChild.rows[0].cells;
				for (var i = 0; i < cells.length; i++) {
					if (cells[i].firstChild._ruler === ruler) {
						div = cells[i].firstChild;
						break;
					}
				}
			}
			if (ruler) {
				div.rulerChanged = true;
			} else {
				if (this._lineHeight) {
					this._resetLineHeight(startLine, endLine);
				}
			}
			if (!ruler || ruler.getOverview() === "page") { //$NON-NLS-0$
				var child = div.firstChild;
				while (child) {
					var lineIndex = child.lineIndex;
					if (startLine <= lineIndex && lineIndex < endLine) {
						child.lineChanged = true;
					}
					child = child.nextSibling;
				}
			}
			if (!ruler) {
				if (!this._wrapMode) {
					if (startLine <= this._maxLineIndex && this._maxLineIndex < endLine) {
						this._checkMaxLineIndex = this._maxLineIndex;
						this._maxLineIndex = -1;
						this._maxLineWidth = 0;
					}
				}
			}
			this._queueUpdate();
		},
		/**
		 * Redraws the text in the given range.
		 * <p>
		 * The character at the end offset is not redrawn.
		 * </p>
		 *
		 * @param {Number} [start=0] the start offset of text range
		 * @param {Number} [end=char count] the end offset of text range
		 *
		 * @see #redraw
		 * @see #redrawLines
		 * @see #setRedraw
		 */
		redrawRange: function(start, end) {
			if (this._redrawCount > 0) { return; }
			var model = this._model;
			if (start === undefined) { start = 0; }
			if (end === undefined) { end = model.getCharCount(); }
			var startLine = model.getLineAtOffset(start);
			var endLine = model.getLineAtOffset(Math.max(start, end - 1)) + 1;
			this.redrawLines(startLine, endLine);
		},
		/**
		 * Removes a ruler from the text view.
		 *
		 * @param {orion.textview.Ruler} ruler the ruler.
		 */
		removeRuler: function (ruler) {
			var rulers = this._rulers;
			for (var i=0; i<rulers.length; i++) {
				if (rulers[i] === ruler) {
					rulers.splice(i, 1);
					ruler.setView(null);
					this._destroyRuler(ruler);
					this._update();
					break;
				}
			}
		},
		resize: function() {
			if (!this._clientDiv) { return; }
			this._handleResize(null);
		},
		/**
		 * @class This object describes an action for the text view.
		 * <p>
		 * <b>See:</b><br/>
		 * {@link orion.textview.TextView}<br/>
		 * {@link orion.textview.TextView#setAction}
		 * </p>
		 * @name orion.textview.ActionDescription
		 *
		 * @property {String} [name] the name to be used when showing the action as text.
		 */
		/**
		 * Associates an application defined handler to an action ID.
		 * <p>
		 * If the action ID is a predefined action, the given handler executes before
		 * the default action handler.  If the given handler returns <code>true</code>, the
		 * default action handler is not called.
		 * </p>
		 *
		 * @param {String} actionID the action ID.
		 * @param {Function} handler the action handler.
		 * @param {orion.textview.ActionDescription} [actionDescription=undefined] the action description.
		 *
		 * @see #getActions
		 * @see #invokeAction
		 */
		setAction: function(actionID, handler, actionDescription) {
			if (!actionID) { return; }
			var actions = this._actions;
			var action = actions[actionID];
			if (!action) {
				action = actions[actionID] = {};
			}
			action.handler = handler;
			action.actionDescription = actionDescription;
		},
		/**
		 * Associates a key binding with the given action ID. Any previous
		 * association with the specified key binding is overwriten. If the
		 * action ID is <code>null</code>, the association is removed.
		 *
		 * @param {orion.textview.KeyBinding} keyBinding the key binding
		 * @param {String} actionID the action ID
		 */
		setKeyBinding: function(keyBinding, actionID) {
			var keyBindings = this._keyBindings;
			for (var i = 0; i < keyBindings.length; i++) {
				var kb = keyBindings[i];
				if (kb.keyBinding.equals(keyBinding)) {
					if (actionID) {
						kb.actionID = actionID;
					} else {
						if (kb.predefined) {
							kb.actionID = null;
						} else {
							keyBindings.splice(i, 1);
						}
					}
					return;
				}
			}
			if (actionID) {
				keyBindings.push({keyBinding: keyBinding, actionID: actionID});
			}
		},
		/**
		 * Sets the caret offset relative to the start of the document.
		 *
		 * @param {Number} caret the caret offset relative to the start of the document.
		 * @param {Boolean} [show=true] if <code>true</code>, the view will scroll if needed to show the caret location.
		 *
		 * @see #getCaretOffset
		 * @see #setSelection
		 * @see #getSelection
		 */
		setCaretOffset: function(offset, show) {
			var charCount = this._model.getCharCount();
			offset = Math.max(0, Math.min (offset, charCount));
			var selection = new Selection(offset, offset, false);
			this._setSelection (selection, show === undefined || show);
		},
		/**
		 * Sets the horizontal pixel.
		 * <p>
		 * The horizontal pixel is the pixel position that is currently at
		 * the left edge of the view.  This position is relative to the
		 * beginning of the document.
		 * </p>
		 *
		 * @param {Number} pixel the horizontal pixel.
		 *
		 * @see #getHorizontalPixel
		 * @see #convert
		 */
		setHorizontalPixel: function(pixel) {
			if (!this._clientDiv) { return; }
			pixel = Math.max(0, pixel);
			this._scrollView(pixel - this._getScroll().x, 0);
		},
		/**
		 * Sets whether the view should update the DOM.
		 * <p>
		 * This can be used to improve the performance.
		 * </p><p>
		 * When the flag is set to <code>true</code>,
		 * the entire view is marked as needing to be redrawn.
		 * Nested calls to this method are stacked.
		 * </p>
		 *
		 * @param {Boolean} redraw the new redraw state
		 *
		 * @see #redraw
		 */
		setRedraw: function(redraw) {
			if (redraw) {
				if (--this._redrawCount === 0) {
					this.redraw();
				}
			} else {
				this._redrawCount++;
			}
		},
		/**
		 * Sets the text model of the text view.
		 *
		 * @param {orion.textview.TextModel} model the text model of the view.
		 */
		setModel: function(model) {
			if (!model) { return; }
			if (model === this._model) { return; }
			this._model.removeEventListener("preChanging", this._modelListener.onChanging); //$NON-NLS-0$
			this._model.removeEventListener("postChanged", this._modelListener.onChanged); //$NON-NLS-0$
			var oldLineCount = this._model.getLineCount();
			var oldCharCount = this._model.getCharCount();
			var newLineCount = model.getLineCount();
			var newCharCount = model.getCharCount();
			var newText = model.getText();
			var e = {
				type: "ModelChanging", //$NON-NLS-0$
				text: newText,
				start: 0,
				removedCharCount: oldCharCount,
				addedCharCount: newCharCount,
				removedLineCount: oldLineCount,
				addedLineCount: newLineCount
			};
			this.onModelChanging(e);
			this._model = model;
			e = {
				type: "ModelChanged", //$NON-NLS-0$
				start: 0,
				removedCharCount: oldCharCount,
				addedCharCount: newCharCount,
				removedLineCount: oldLineCount,
				addedLineCount: newLineCount
			};
			this.onModelChanged(e);
			this._model.addEventListener("preChanging", this._modelListener.onChanging); //$NON-NLS-0$
			this._model.addEventListener("postChanged", this._modelListener.onChanged); //$NON-NLS-0$
			this._reset();
			this._update();
		},
		/**
		 * Sets the view options for the view.
		 *
		 * @param {orion.textview.TextViewOptions} options the view options.
		 *
		 * @see #getOptions
		 */
		setOptions: function (options) {
			var defaultOptions = this._defaultOptions();
			for (var option in options) {
				if (options.hasOwnProperty(option)) {
					var newValue = options[option], oldValue = this["_" + option]; //$NON-NLS-0$
					if (compare(oldValue, newValue)) { continue; }
					var update = defaultOptions[option] ? defaultOptions[option].update : null;
					if (update) {
						update.call(this, newValue);
						continue;
					}
					this["_" + option] = clone(newValue); //$NON-NLS-0$
				}
			}
		},
		/**
		 * Sets the text view selection.
		 * <p>
		 * The selection is defined by a start and end character offset relative to the
		 * document. The character at end offset is not included in the selection.
		 * </p>
		 * <p>
		 * The caret is always placed at the end offset. The start offset can be
		 * greater than the end offset to place the caret at the beginning of the
		 * selection.
		 * </p>
		 * <p>
		 * Clamps out of range offsets.
		 * </p>
		 *
		 * @param {Number} start the start offset of the selection
		 * @param {Number} end the end offset of the selection
		 * @param {Boolean} [show=true] if <code>true</code>, the view will scroll if needed to show the caret location.
		 *
		 * @see #getSelection
		 */
		setSelection: function (start, end, show) {
			var caret = start > end;
			if (caret) {
				var tmp = start;
				start = end;
				end = tmp;
			}
			var charCount = this._model.getCharCount();
			start = Math.max(0, Math.min (start, charCount));
			end = Math.max(0, Math.min (end, charCount));
			var selection = new Selection(start, end, caret);
			this._setSelection(selection, show === undefined || show);
		},
		/**
		 * Replaces the text in the given range with the given text.
		 * <p>
		 * The character at the end offset is not replaced.
		 * </p>
		 * <p>
		 * When both <code>start</code> and <code>end</code> parameters
		 * are not specified, the text view places the caret at the beginning
		 * of the document and scrolls to make it visible.
		 * </p>
		 *
		 * @param {String} text the new text.
		 * @param {Number} [start=0] the start offset of text range.
		 * @param {Number} [end=char count] the end offset of text range.
		 *
		 * @see #getText
		 */
		setText: function (text, start, end) {
			var reset = start === undefined && end === undefined;
			if (start === undefined) { start = 0; }
			if (end === undefined) { end = this._model.getCharCount(); }
			this._modifyContent({text: text, start: start, end: end, _code: true}, !reset);
			if (reset) {
				this._columnX = -1;
				this._setSelection(new Selection (0, 0, false), true);

				/*
				* Bug in Firefox.  For some reason, the caret does not show after the
				* view is refreshed.  The fix is to toggle the contentEditable state and
				* force the clientDiv to loose and receive focus if it is focused.
				*/
				if (util.isFirefox) {
					this._fixCaret();
				}
			}
		},
		/**
		 * Sets the top index.
		 * <p>
		 * The top index is the line that is currently at the top of the text view.  This
		 * line may be partially visible depending on the vertical scroll of the view.
		 * </p>
		 *
		 * @param {Number} topIndex the index of the top line.
		 *
		 * @see #getBottomIndex
		 * @see #getTopIndex
		 */
		setTopIndex: function(topIndex) {
			if (!this._clientDiv) { return; }
			this._scrollView(0, this._getLinePixel(Math.max(0, topIndex)) - this._getScroll().y);
		},
		/**
		 * Sets the top pixel.
		 * <p>
		 * The top pixel is the pixel position that is currently at
		 * the top edge of the view.  This position is relative to the
		 * beginning of the document.
		 * </p>
		 *
		 * @param {Number} pixel the top pixel.
		 *
		 * @see #getBottomPixel
		 * @see #getTopPixel
		 * @see #convert
		 */
		setTopPixel: function(pixel) {
			if (!this._clientDiv) { return; }
			this._scrollView(0, Math.max(0, pixel) - this._getScroll().y);
		},
		// SCRIPTED - TODO what is the other way to do this two things?
		setReadonly: function(isReadonly) {
			this._readonly = isReadonly;
		},
		isReadonly: function() {
			return this._readonly;
		},
		/**
		 * Scrolls the selection into view if needed.
		 *
		 * @returns true if the view was scrolled.
		 *
		 * @see #getSelection
		 * @see #setSelection
		 */
		showSelection: function() {
			return this._showCaret(true);
		},
		update: function(styleChanged, sync) {
			if (!this._clientDiv) { return; }
			if (styleChanged) {
				this._updateStyle();
			}
			if (sync === undefined || sync) {
				this._update();
			} else {
				this._queueUpdate();
			}
		},

		/**************************************** Event handlers *********************************/
		_handleRootMouseDown: function (e) {
			if (util.isFirefox && e.which === 1) {
				this._clientDiv.contentEditable = false;
				(this._overlayDiv || this._clientDiv).draggable = true;
				this._ignoreBlur = true;
			}

			/* Prevent clicks outside of the client div from taking focus away. */
			var topNode = this._overlayDiv || this._clientDiv;
			/* Use view div on IE 8 otherwise it is not possible to scroll. */
			if (util.isIE < 9) { topNode = this._viewDiv; }
			var temp = e.target ? e.target : e.srcElement;
			while (temp) {
				if (topNode === temp) {
					return;
				}
				temp = temp.parentNode;
			}
			if (e.preventDefault) { e.preventDefault(); }
			if (e.stopPropagation){ e.stopPropagation(); }
			if (!this._isW3CEvents) {
				/*
				* In IE 8 is not possible to prevent the default handler from running
				* during mouse down event using usual API. The workaround is to give
				* focus back to the client div.
				*/
				var self = this;
				var window = this._getWindow();
				window.setTimeout(function() {
					self._clientDiv.focus();
				}, 0);
			}
		},
		_handleRootMouseUp: function (e) {
			if (util.isFirefox && e.which === 1) {
				this._clientDiv.contentEditable = true;
				(this._overlayDiv || this._clientDiv).draggable = false;

				/*
				* Bug in Firefox.  For some reason, Firefox stops showing the caret
				* in some cases. For example when the user cancels a drag operation
				* by pressing ESC.  The fix is to detect that the drag operation was
				* cancelled,  toggle the contentEditable state and force the clientDiv
				* to loose and receive focus if it is focused.
				*/
				this._fixCaret();
				this._ignoreBlur = false;
			}
		},
		_handleBlur: function (e) {
			if (this._ignoreBlur) { return; }
			this._hasFocus = false;
			/*
			* Bug in IE 8 and earlier. For some reason when text is deselected
			* the overflow selection at the end of some lines does not get redrawn.
			* The fix is to create a DOM element in the body to force a redraw.
			*/
			if (util.isIE < 9) {
				if (!this._getSelection().isEmpty()) {
					var rootDiv = this._rootDiv;
					var child = util.createElement(rootDiv.ownerDocument, "div"); //$NON-NLS-0$
					rootDiv.appendChild(child);
					rootDiv.removeChild(child);
				}
			}
			if (this._selDiv1) {
				var color = "lightgray"; //$NON-NLS-0$
				this._selDiv1.style.background = color;
				this._selDiv2.style.background = color;
				this._selDiv3.style.background = color;
				/* Clear browser selection if selection is within clientDiv */
				var temp;
				var window = this._getWindow();
				var document = this._selDiv1.ownerDocument;
				if (window.getSelection) {
					var sel = window.getSelection();
					temp = sel.anchorNode;
					while (temp) {
						if (temp === this._clientDiv) {
							if (sel.rangeCount > 0) { sel.removeAllRanges(); }
							break;
						}
						temp = temp.parentNode;
					}
				} else if (document.selection) {
					this._ignoreSelect = false;
					temp = document.selection.createRange().parentElement();
					while (temp) {
						if (temp === this._clientDiv) {
							document.selection.empty();
							break;
						}
						temp = temp.parentNode;
					}
					this._ignoreSelect = true;
				}
			}
			if (!this._ignoreFocus) {
				this.onBlur({type: "Blur"}); //$NON-NLS-0$
			}
		},
		_handleContextMenu: function (e) {
			if (util.isIE && this._lastMouseButton === 3) {
				// We need to update the DOM selection, because on
				// right-click the caret moves to the mouse location.
				// See bug 366312 and 376508.
				this._updateDOMSelection();
			}
			var preventDefault = false;
			if (this.isListening("ContextMenu")) { //$NON-NLS-0$
				var evt = this._createMouseEvent("ContextMenu", e); //$NON-NLS-0$
				evt.screenX = e.screenX;
				evt.screenY = e.screenY;
				this.onContextMenu(evt);
				preventDefault = evt.defaultPrevented;
			}
			if (preventDefault) {
				if (e.preventDefault) { e.preventDefault(); }
				return false;
			}
		},
		_handleCopy: function (e) {
			if (this._ignoreCopy) { return; }
			if (this._doCopy(e)) {
				if (e.preventDefault) { e.preventDefault(); }
				return false;
			}
		},
		_handleCut: function (e) {
			if (this._doCut(e)) {
				if (e.preventDefault) { e.preventDefault(); }
				return false;
			}
		},
		_handleDataModified: function(e) {
			this._startIME();
		},
		_handleDblclick: function (e) {
			var time = e.timeStamp ? e.timeStamp : new Date().getTime();
			this._lastMouseTime = time;
			if (this._clickCount !== 2) {
				this._clickCount = 2;
				this._handleMouse(e);
			}
		},
		_handleDragStart: function (e) {
			if (util.isFirefox) {
				var self = this;
				var window = this._getWindow();
				window.setTimeout(function() {
					self._clientDiv.contentEditable = true;
					self._clientDiv.draggable = false;
					self._ignoreBlur = false;
				}, 0);
			}
			if (this.isListening("DragStart") && this._dragOffset !== -1) { //$NON-NLS-0$
				this._isMouseDown = false;
				this.onDragStart(this._createMouseEvent("DragStart", e)); //$NON-NLS-0$
				this._dragOffset = -1;
			} else {
				if (e.preventDefault) { e.preventDefault(); }
				return false;
			}
		},
		_handleDrag: function (e) {
			if (this.isListening("Drag")) { //$NON-NLS-0$
				this.onDrag(this._createMouseEvent("Drag", e)); //$NON-NLS-0$
			}
		},
		_handleDragEnd: function (e) {
			this._dropTarget = false;
			this._dragOffset = -1;
			if (this.isListening("DragEnd")) { //$NON-NLS-0$
				this.onDragEnd(this._createMouseEvent("DragEnd", e)); //$NON-NLS-0$
			}
			if (util.isFirefox) {
				this._fixCaret();
				/*
				* Bug in Firefox.  For some reason, Firefox stops showing the caret when the
				* selection is dropped onto itself. The fix is to detected the case and
				* call fixCaret() a second time.
				*/
				if (e.dataTransfer.dropEffect === "none" && !e.dataTransfer.mozUserCancelled) { //$NON-NLS-0$
					this._fixCaret();
				}
			}
		},
		_handleDragEnter: function (e) {
			var prevent = true;
			this._dropTarget = true;
			if (this.isListening("DragEnter")) { //$NON-NLS-0$
				prevent = false;
				this.onDragEnter(this._createMouseEvent("DragEnter", e)); //$NON-NLS-0$
			}
			/*
			* Webkit will not send drop events if this event is not prevented, as spec in HTML5.
			* Firefox and IE do not follow this spec for contentEditable. Note that preventing this
			* event will result is loss of functionality (insertion mark, etc).
			*/
			if (util.isWebkit || prevent) {
				if (e.preventDefault) { e.preventDefault(); }
				return false;
			}
		},
		_handleDragOver: function (e) {
			var prevent = true;
			if (this.isListening("DragOver")) { //$NON-NLS-0$
				prevent = false;
				this.onDragOver(this._createMouseEvent("DragOver", e)); //$NON-NLS-0$
			}
			/*
			* Webkit will not send drop events if this event is not prevented, as spec in HTML5.
			* Firefox and IE do not follow this spec for contentEditable. Note that preventing this
			* event will result is loss of functionality (insertion mark, etc).
			*/
			if (util.isWebkit || prevent) {
				if (prevent) { e.dataTransfer.dropEffect = "none"; } //$NON-NLS-0$
				if (e.preventDefault) { e.preventDefault(); }
				return false;
			}
		},
		_handleDragLeave: function (e) {
			this._dropTarget = false;
			if (this.isListening("DragLeave")) { //$NON-NLS-0$
				this.onDragLeave(this._createMouseEvent("DragLeave", e)); //$NON-NLS-0$
			}
		},
		_handleDrop: function (e) {
			this._dropTarget = false;
			if (this.isListening("Drop")) { //$NON-NLS-0$
				this.onDrop(this._createMouseEvent("Drop", e)); //$NON-NLS-0$
			}
			/*
			* This event must be prevented otherwise the user agent will modify
			* the DOM. Note that preventing the event on some user agents (i.e. IE)
			* indicates that the operation is cancelled. This causes the dropEffect to
			* be set to none  in the dragend event causing the implementor to not execute
			* the code responsible by the move effect.
			*/
			if (e.preventDefault) { e.preventDefault(); }
			return false;
		},
		_handleFocus: function (e) {
			this._hasFocus = true;
			if (util.isIOS && this._lastTouchOffset !== undefined) {
				this.setCaretOffset(this._lastTouchOffset, true);
				this._lastTouchOffset = undefined;
			} else {
				this._updateDOMSelection();
			}
			if (this._selDiv1) {
				var color = this._highlightRGB;
				this._selDiv1.style.background = color;
				this._selDiv2.style.background = color;
				this._selDiv3.style.background = color;
			}
			if (!this._ignoreFocus) {
				this.onFocus({type: "Focus"}); //$NON-NLS-0$
			}
		},
		_handleKeyDown: function (e) {
			var modifier = false;
			switch (e.keyCode) {
				case 16: /* Shift */
				case 17: /* Control */
				case 18: /* Alt */
				case 91: /* Command */
					modifier = true;
					break;
				default:
					this._setLinksVisible(false);
			}
			if (e.keyCode === 229) {
				if (this._readonly) {
					if (e.preventDefault) { e.preventDefault(); }
					return false;
				}
				var startIME = true;

				/*
				* Bug in Safari. Some Control+key combinations send key events
				* with keyCode equals to 229. This is unexpected and causes the
				* view to start an IME composition. The fix is to ignore these
				* events.
				*/
				if (util.isSafari && util.isMac) {
					if (e.ctrlKey) {
						startIME = false;
					}
				}
				if (startIME) {
					this._startIME();
				}
			} else {
				if (!modifier) {
					this._commitIME();
				}
			}
			/*
			* Feature in Firefox. When a key is held down the browser sends
			* right number of keypress events but only one keydown. This is
			* unexpected and causes the view to only execute an action
			* just one time. The fix is to ignore the keydown event and
			* execute the actions from the keypress handler.
			* Note: This only happens on the Mac and Linux (Firefox 3.6).
			*
			* Feature in Opera.  Opera sends keypress events even for non-printable
			* keys.  The fix is to handle actions in keypress instead of keydown.
			*/
			if (((util.isMac || util.isLinux) && util.isFirefox < 4) || util.isOpera) {
				this._keyDownEvent = e;
				return true;
			}

			if (this._doAction(e)) {
				if (e.preventDefault) {
					e.preventDefault();
					e.stopPropagation();
				} else {
					e.cancelBubble = true;
					e.returnValue = false;
					e.keyCode = 0;
				}
				return false;
			}
		},
		_handleKeyPress: function (e) {
			/*
			* Feature in Embedded WebKit.  Embedded WekKit on Mac runs in compatibility mode and
			* generates key press events for these Unicode values (Function keys).  This does not
			* happen in Safari or Chrome.  The fix is to ignore these key events.
			*/
			if (util.isMac && util.isWebkit) {
				if ((0xF700 <= e.keyCode && e.keyCode <= 0xF7FF) || e.keyCode === 13 || e.keyCode === 8) {
					if (e.preventDefault) { e.preventDefault(); }
					return false;
				}
			}
			if (((util.isMac || util.isLinux) && util.isFirefox < 4) || util.isOpera) {
				if (this._doAction(this._keyDownEvent)) {
					if (e.preventDefault) { e.preventDefault(); }
					return false;
				}
			}
			var ctrlKey = util.isMac ? e.metaKey : e.ctrlKey;
			if (e.charCode !== undefined) {
				if (ctrlKey) {
					switch (e.charCode) {
						/*
						* In Firefox and Safari if ctrl+v, ctrl+c ctrl+x is canceled
						* the clipboard events are not sent. The fix to allow
						* the browser to handles these key events.
						*/
						case 99://c
						case 118://v
						case 120://x
							return true;
					}
				}
			}
			var ignore = false;
			if (util.isMac) {
				if (e.ctrlKey || e.metaKey) { ignore = true; }
			} else {
				if (util.isFirefox) {
					//Firefox clears the state mask when ALT GR generates input
					if (e.ctrlKey || e.altKey) { ignore = true; }
				} else {
					//IE and Chrome only send ALT GR when input is generated
					if (e.ctrlKey ^ e.altKey) { ignore = true; }
				}
			}
			if (!ignore) {
				if (this._keyPressHandlers) {
					for (var kph=0; kph<this._keyPressHandlers.length; kph++) {
						var handled =  this._keyPressHandlers[kph].handleKeyPress(e);
						if (handled) {
							if (e.preventDefault) { e.preventDefault(); }
							return false;
						}
					}
				}
				var key = util.isOpera ? e.which : (e.charCode !== undefined ? e.charCode : e.keyCode);
				if (key > 31) {
					this._doContent(String.fromCharCode (key));
					if (e.preventDefault) { e.preventDefault(); }
					return false;
				}
			}
		},
		_handleKeyUp: function (e) {
			var ctrlKey = util.isMac ? e.metaKey : e.ctrlKey;
			if (!ctrlKey) {
				this._setLinksVisible(false);
			}
			// don't commit for space (it happens during JP composition)
			if (e.keyCode === 13) {
				this._commitIME();
			}
		},
		_handleLinkClick: function (e) {
			var ctrlKey = util.isMac ? e.metaKey : e.ctrlKey;
			if (!ctrlKey) {
				if (e.preventDefault) { e.preventDefault(); }
				return false;
			}
		},
		_handleMouse: function (e) {
			var window = this._getWindow();
			var result = true;
			var target = window;
			if (util.isIE || (util.isFirefox && !this._overlayDiv)) { target = this._clientDiv; }
			if (this._overlayDiv) {
				if (this._hasFocus) {
					this._ignoreFocus = true;
				}
				var self = this;
				window.setTimeout(function () {
					self.focus();
					self._ignoreFocus = false;
				}, 0);
			}
			if (this._clickCount === 1) {
				result = this._setSelectionTo(e.clientX, e.clientY, e.shiftKey, !util.isOpera && this._hasFocus && this.isListening("DragStart")); //$NON-NLS-0$
				if (result) { this._setGrab(target); }
			} else {
				/*
				* Feature in IE8 and older, the sequence of events in the IE8 event model
				* for a doule-click is:
				*
				*	down
				*	up
				*	up
				*	dblclick
				*
				* Given that the mouse down/up events are not balanced, it is not possible to
				* grab on mouse down and ungrab on mouse up.  The fix is to grab on the first
				* mouse down and ungrab on mouse move when the button 1 is not set.
				*/
				if (this._isW3CEvents) { this._setGrab(target); }

				this._doubleClickSelection = null;
				this._setSelectionTo(e.clientX, e.clientY, e.shiftKey);
				this._doubleClickSelection = this._getSelection();
			}
			return result;
		},
		_handleMouseDown: function (e) {
			if (this._linksVisible) {
				var target = e.target || e.srcElement;
				if (target.tagName !== "A") { //$NON-NLS-0$
					this._setLinksVisible(false);
				} else {
					return;
				}
			}
			this._commitIME();

			var button = e.which; // 1 - left, 2 - middle, 3 - right
			if (!button) {
				// if IE 8 or older
				if (e.button === 4) { button = 2; }
				if (e.button === 2) { button = 3; }
				if (e.button === 1) { button = 1; }
			}

			// For middle click we always need getTime(). See _getClipboardText().
			var time = button !== 2 && e.timeStamp ? e.timeStamp : new Date().getTime();
			var timeDiff = time - this._lastMouseTime;
			var deltaX = Math.abs(this._lastMouseX - e.clientX);
			var deltaY = Math.abs(this._lastMouseY - e.clientY);
			var sameButton = this._lastMouseButton === button;
			this._lastMouseX = e.clientX;
			this._lastMouseY = e.clientY;
			this._lastMouseTime = time;
			this._lastMouseButton = button;

			if (button === 1) {
				this._isMouseDown = true;
				if (sameButton && timeDiff <= this._clickTime && deltaX <= this._clickDist && deltaY <= this._clickDist) {
					this._clickCount++;
				} else {
					this._clickCount = 1;
				}
			}
			if (this.isListening("MouseDown")) { //$NON-NLS-0$
				var mouseEvent = this._createMouseEvent("MouseDown", e); //$NON-NLS-0$
				this.onMouseDown(mouseEvent);
				if (mouseEvent.defaultPrevented) {
					e.preventDefault();
					return;
				}
			}
			if (button === 1) {
				if (this._handleMouse(e) && (util.isIE >= 9 || util.isOpera || util.isChrome || util.isSafari || (util.isFirefox && !this._overlayDiv))) {
					if (!this._hasFocus) {
						this.focus();
					}
					e.preventDefault();
				}
			}
			if (util.isFirefox && this._lastMouseButton === 3) {
				// We need to update the DOM selection, because on
				// right-click the caret moves to the mouse location.
				// See bug 366312 and 376508.
				this._updateDOMSelection();
			}
		},
		_handleMouseOver: function (e) {
			if (this.isListening("MouseOver")) { //$NON-NLS-0$
				this.onMouseOver(this._createMouseEvent("MouseOver", e)); //$NON-NLS-0$
			}
		},
		_handleMouseOut: function (e) {
			if (this.isListening("MouseOut")) { //$NON-NLS-0$
				this.onMouseOut(this._createMouseEvent("MouseOut", e)); //$NON-NLS-0$
			}
		},
		_handleMouseMove: function (e) {
			var inClient = this._isClientDiv(e);
			if (this.isListening("MouseMove")) { //$NON-NLS-0$
				if (inClient){
					this.onMouseMove(this._createMouseEvent("MouseMove", e)); //$NON-NLS-0$
				}
			}
			if (this._dropTarget) {
				return;
			}
			/*
			* Bug in IE9. IE sends one mouse event when the user changes the text by
			* pasting or undo.  These operations usually happen with the Ctrl key
			* down which causes the view to enter link mode.  Link mode does not end
			* because there are no further events.  The fix is to only enter link
			* mode when the coordinates of the mouse move event have changed.
			*/
			var changed = this._linksVisible || this._lastMouseMoveX !== e.clientX || this._lastMouseMoveY !== e.clientY;
			this._lastMouseMoveX = e.clientX;
			this._lastMouseMoveY = e.clientY;
			this._setLinksVisible(changed && !this._isMouseDown && (util.isMac ? e.metaKey : e.ctrlKey));

			/*
			* Feature in IE8 and older, the sequence of events in the IE8 event model
			* for a doule-click is:
			*
			*	down
			*	up
			*	up
			*	dblclick
			*
			* Given that the mouse down/up events are not balanced, it is not possible to
			* grab on mouse down and ungrab on mouse up.  The fix is to grab on the first
			* mouse down and ungrab on mouse move when the button 1 is not set.
			*
			* In order to detect double-click and drag gestures, it is necessary to send
			* a mouse down event from mouse move when the button is still down and isMouseDown
			* flag is not set.
			*/
			if (!this._isW3CEvents) {
				if (e.button === 0) {
					this._setGrab(null);
					return true;
				}
				if (!this._isMouseDown && e.button === 1 && (this._clickCount & 1) !== 0 && inClient) {
					this._clickCount = 2;
					return this._handleMouse(e, this._clickCount);
				}
			}
			if (!this._isMouseDown || this._dragOffset !== -1) {
				return;
			}

			var x = e.clientX;
			var y = e.clientY;
			var viewPad = this._getViewPadding();
			var viewRect = this._viewDiv.getBoundingClientRect();
			var width = this._getClientWidth (), height = this._getClientHeight();
			var leftEdge = viewRect.left + viewPad.left;
			var topEdge = viewRect.top + viewPad.top;
			var rightEdge = viewRect.left + viewPad.left + width;
			var bottomEdge = viewRect.top + viewPad.top + height;
			var model = this._model;
			var caretLine = model.getLineAtOffset(this._getSelection().getCaret());
			if (y < topEdge && caretLine !== 0) {
				this._doAutoScroll("up", x, y - topEdge); //$NON-NLS-0$
			} else if (y > bottomEdge && caretLine !== model.getLineCount() - 1) {
				this._doAutoScroll("down", x, y - bottomEdge); //$NON-NLS-0$
			} else if (x < leftEdge && !this._wrapMode) {
				this._doAutoScroll("left", x - leftEdge, y); //$NON-NLS-0$
			} else if (x > rightEdge && !this._wrapMode) {
				this._doAutoScroll("right", x - rightEdge, y); //$NON-NLS-0$
			} else {
				this._endAutoScroll();
				this._setSelectionTo(x, y, true);
			}
		},
		_isClientDiv: function(e) {
			var topNode = this._overlayDiv || this._clientDiv;
			var temp = e.target ? e.target : e.srcElement;
			while (temp) {
				if (topNode === temp) {
					return true;
				}
				temp = temp.parentNode;
			}
			return false;
		},
		_createMouseEvent: function(type, e) {
			var pt = this.convert({x: e.clientX, y: e.clientY}, "page", "document"); //$NON-NLS-1$ //$NON-NLS-0$
			return {
				type: type,
				event: e,
				clickCount: this._clickCount,
				x: pt.x,
				y: pt.y,
				preventDefault: function() {
					this.defaultPrevented = true;
				}
			};
		},
		_handleMouseUp: function (e) {
			var left = e.which ? e.button === 0 : e.button === 1;
			if (this.isListening("MouseUp")) { //$NON-NLS-0$
				if (this._isClientDiv(e) || (left && this._isMouseDown)) {
					this.onMouseUp(this._createMouseEvent("MouseUp", e)); //$NON-NLS-0$
				}
			}
			if (this._linksVisible) {
				return;
			}
			if (left && this._isMouseDown) {
				if (this._dragOffset !== -1) {
					var selection = this._getSelection();
					selection.extend(this._dragOffset);
					selection.collapse();
					this._setSelection(selection, true, true);
					this._dragOffset = -1;
				}
				this._isMouseDown = false;
				this._endAutoScroll();

				/*
				* Feature in IE8 and older, the sequence of events in the IE8 event model
				* for a doule-click is:
				*
				*	down
				*	up
				*	up
				*	dblclick
				*
				* Given that the mouse down/up events are not balanced, it is not possible to
				* grab on mouse down and ungrab on mouse up.  The fix is to grab on the first
				* mouse down and ungrab on mouse move when the button 1 is not set.
				*/
				if (this._isW3CEvents) { this._setGrab(null); }

				/*
				* Note that there cases when Firefox sets the DOM selection in mouse up.
				* This happens for example after a cancelled drag operation.
				*
				* Note that on Chrome and IE, the caret stops blicking if mouse up is
				* prevented.
				*/
				if (util.isFirefox) {
					e.preventDefault();
				}
			}
		},
		_handleMouseWheel: function (e) {
			var lineHeight = this._getLineHeight();
			var pixelX = 0, pixelY = 0;
			// Note: On the Mac the correct behaviour is to scroll by pixel.
			if (util.isIE || util.isOpera) {
				pixelY = (-e.wheelDelta / 40) * lineHeight;
			} else if (util.isFirefox) {
				var pixel;
				if (util.isMac) {
					pixel = e.detail * 3;
				} else {
					var limit = 256;
					pixel = Math.max(-limit, Math.min(limit, e.detail)) * lineHeight;
				}
				if (e.axis === e.HORIZONTAL_AXIS) {
					pixelX = pixel;
				} else {
					pixelY = pixel;
				}
			} else {
				//Webkit
				if (util.isMac) {
					/*
					* In Safari, the wheel delta is a multiple of 120. In order to
					* convert delta to pixel values, it is necessary to divide delta
					* by 40.
					*
					* In Chrome and Safari 5, the wheel delta depends on the type of the
					* mouse. In general, it is the pixel value for Mac mice and track pads,
					* but it is a multiple of 120 for other mice. There is no presise
					* way to determine if it is pixel value or a multiple of 120.
					*
					* Note that the current approach does not calculate the correct
					* pixel value for Mac mice when the delta is a multiple of 120.
					*/
					var denominatorX = 40, denominatorY = 40;
					if (e.wheelDeltaX % 120 !== 0) { denominatorX = 1; }
					if (e.wheelDeltaY % 120 !== 0) { denominatorY = 1; }
					pixelX = -e.wheelDeltaX / denominatorX;
					if (-1 < pixelX && pixelX < 0) { pixelX = -1; }
					if (0 < pixelX && pixelX < 1) { pixelX = 1; }
					pixelY = -e.wheelDeltaY / denominatorY;
					if (-1 < pixelY && pixelY < 0) { pixelY = -1; }
					if (0 < pixelY && pixelY < 1) { pixelY = 1; }
				} else {
					pixelX = -e.wheelDeltaX;
					var linesToScroll = 8;
					pixelY = (-e.wheelDeltaY / 120 * linesToScroll) * lineHeight;
				}
			}
			/*
			* Feature in Safari. If the event target is removed from the DOM
			* safari stops smooth scrolling. The fix is keep the element target
			* in the DOM and remove it on a later time.
			*
			* Note: Using a timer is not a solution, because the timeout needs to
			* be at least as long as the gesture (which is too long).
			*/
			if (util.isSafari) {
				var lineDiv = e.target;
				while (lineDiv && lineDiv.lineIndex === undefined) {
					lineDiv = lineDiv.parentNode;
				}
				this._mouseWheelLine = lineDiv;
			}
			var oldScroll = this._getScroll();
			this._scrollView(pixelX, pixelY);
			var newScroll = this._getScroll();
			if (oldScroll.x !== newScroll.x || oldScroll.y !== newScroll.y) {
				if (e.preventDefault) { e.preventDefault(); }
				return false;
			}

			// SCRIPTED
			// feature on mac-chrome:
			// prevent left scrolling on swipe
			// otherwise history back navigation will happen
			if (util.isMac && util.isChrome) {
				e.preventDefault();
			}
			// SCRIPTED end
		},
		_handlePaste: function (e) {
			if (this._ignorePaste) { return; }
			if (this._doPaste(e)) {
				if (util.isIE) {
					/*
					 * Bug in IE,
					 */
					var self = this;
					this._ignoreFocus = true;
					var window = this._getWindow();
					window.setTimeout(function() {
						self._updateDOMSelection();
						self._ignoreFocus = false;
					}, 0);
				}
				if (e.preventDefault) { e.preventDefault(); }
				return false;
			}
		},
		_handleResize: function (e) {
			var newWidth = this._parent.clientWidth;
			var newHeight = this._parent.clientHeight;
			if (this._parentWidth !== newWidth || this._parentHeight !== newHeight) {
				if (this._parentWidth !== newWidth) {
					this._resetLineHeight();
				}
				this._parentWidth = newWidth;
				this._parentHeight = newHeight;
				/*
				* Feature in IE7. For some reason, sometimes Internet Explorer 7
				* returns incorrect values for element.getBoundingClientRect() when
				* inside a resize handler. The fix is to queue the work.
				*/
				if (util.isIE < 9) {
					this._queueUpdate();
				} else {
					this._update();
				}
			}
		},
		_handleRulerEvent: function (e) {
			var target = e.target ? e.target : e.srcElement;
			var lineIndex = target.lineIndex;
			var element = target;
			while (element && !element._ruler) {
				if (lineIndex === undefined && element.lineIndex !== undefined) {
					lineIndex = element.lineIndex;
				}
				element = element.parentNode;
			}
			var ruler = element ? element._ruler : null;
			if (lineIndex === undefined && ruler && ruler.getOverview() === "document") { //$NON-NLS-0$
				var clientHeight = this._getClientHeight ();
				var lineCount = this._model.getLineCount ();
				var viewPad = this._getViewPadding();
				var viewRect = this._viewDiv.getBoundingClientRect();
				var trackHeight = clientHeight + viewPad.top + viewPad.bottom - 2 * this._metrics.scrollWidth;
				lineIndex = Math.floor(((e.clientY - viewRect.top) - this._metrics.scrollWidth) * lineCount / trackHeight);
				if (!(0 <= lineIndex && lineIndex < lineCount)) {
					lineIndex = undefined;
				}
			}
			if (ruler) {
				switch (e.type) {
					case "click": //$NON-NLS-0$
						if (ruler.onClick) { ruler.onClick(lineIndex, e); }
						break;
					case "dblclick": //$NON-NLS-0$
						if (ruler.onDblClick) { ruler.onDblClick(lineIndex, e); }
						break;
					case "mousemove": //$NON-NLS-0$
						if (ruler.onMouseMove) { ruler.onMouseMove(lineIndex, e); }
						break;
					case "mouseover": //$NON-NLS-0$
						if (ruler.onMouseOver) { ruler.onMouseOver(lineIndex, e); }
						break;
					case "mouseout": //$NON-NLS-0$
						if (ruler.onMouseOut) { ruler.onMouseOut(lineIndex, e); }
						break;
				}
			}
		},
		_handleScroll: function () {
			var scroll = this._getScroll();
			var oldX = this._hScroll;
			var oldY = this._vScroll;
			if (oldX !== scroll.x || oldY !== scroll.y) {
				this._hScroll = scroll.x;
				this._vScroll = scroll.y;
				this._commitIME();
				this._update(oldY === scroll.y);
				var e = {
					type: "Scroll", //$NON-NLS-0$
					oldValue: {x: oldX, y: oldY},
					newValue: scroll
				};
				this.onScroll(e);
			}
		},
		_handleSelectStart: function (e) {
			if (this._ignoreSelect) {
				if (e && e.preventDefault) { e.preventDefault(); }
				return false;
			}
		},
		_getModelOffset: function(node, offset) {
			if (!node) { return; }
			var lineNode;
			if (node.tagName === "DIV") { //$NON-NLS-0$
				lineNode = node;
			} else {
				lineNode = node.parentNode.parentNode;
			}
			var lineOffset = 0;
			var lineIndex = lineNode.lineIndex;
			if (node.tagName !== "DIV") { //$NON-NLS-0$
				var child = lineNode.firstChild;
				while (child) {
					var textNode = child.firstChild;
					if (textNode === node) {
						if (child.ignoreChars) { lineOffset -= child.ignoreChars; }
						lineOffset += offset;
						break;
					}
					if (child.ignoreChars) { lineOffset -= child.ignoreChars; }
					lineOffset += textNode.data.length;
					child = child.nextSibling;
				}
			}
			return Math.max(0, lineOffset) + this._model.getLineStart(lineIndex);
		},
		_updateSelectionFromDOM: function() {
			var window = this._getWindow();
			var selection = window.getSelection();
			var start = this._getModelOffset(selection.anchorNode, selection.anchorOffset);
			var end = this._getModelOffset(selection.focusNode, selection.focusOffset);
			if (start === undefined || end === undefined) {
			    return;
			}
			this._setSelection(new Selection(start, end), false, false);
		},
		_handleSelectionChange: function (e) {
			if (this._imeOffset !== -1) {
				return;
			}
			/*
			 * Feature in Android. The selection handles are hidden when the DOM changes. Sending
			 * selection events to the application while the user is moving the selection handles
			 * may hide the handles unexpectedly.  The fix is to delay updating the selection and
			 * sending the event to the application.
			 */
			if (util.isAndroid) {
				var window = this._getWindow();
				if (this._selTimer) {
					window.clearTimeout(this._selTimer);
				}
				var that = this;
				this._selTimer = window.setTimeout(function() {
					if (!that._clientDiv) { return; }
					that._selTimer = null;
					that._updateSelectionFromDOM();
				}, 250);
			} else {
				this._updateSelectionFromDOM();
			}
		},
		_handleTextInput: function (e) {
			this._imeOffset = -1;
			if (util.isAndroid) {
				var selection = this._getWindow().getSelection();
				var temp = selection.anchorNode;
				while (temp) {
					if (temp.lineIndex !== undefined) {
						break;
					}
					temp = temp.parentNode;
				}
				if (temp) {
					var model = this._model;
					var lineIndex = temp.lineIndex;
					var oldText = model.getLine(lineIndex), text = oldText;
					var offset = 0;
					var lineStart = model.getLineStart(lineIndex);
					if (selection.rangeCount > 0) {
						selection.getRangeAt(0).deleteContents();
						var node = temp.ownerDocument.createTextNode(e.data);
						selection.getRangeAt(0).insertNode(node);
						var nodeText = this._getDOMText(temp, node);
						text = nodeText.text;
						offset = nodeText.offset;
						node.parentNode.removeChild(node);
					}
					temp.lineRemoved = true;

					var start = 0;
					while (oldText.charCodeAt(start) === text.charCodeAt(start) && start < offset) {
						start++;
					}

					var end = oldText.length - 1, delta = text.length - oldText.length;
					while (oldText.charCodeAt(end) === text.charCodeAt(end + delta) && end + delta >= offset + e.data.length) {
						end--;
					}
					end++;

					var deltaText = text.substring(start, end + delta);
					start += lineStart;
					end += lineStart;

					this._modifyContent({text: deltaText, start: start, end: end, _ignoreDOMSelection: true}, true);
				}
			} else {
				console.log("textinput: "+e.data);
				this._doContent(e.data);
			}
			e.preventDefault();
		},
		_handleTouchStart: function (e) {
			this._commitIME();
			var window = this._getWindow();
			if (this._touchScrollTimer) {
				this._vScrollDiv.style.display = "none"; //$NON-NLS-0$
				this._hScrollDiv.style.display = "none"; //$NON-NLS-0$
				window.clearInterval(this._touchScrollTimer);
				this._touchScrollTimer = null;
			}
			var touches = e.touches;
			if (touches.length === 1) {
				var touch = touches[0];
				var x = touch.clientX, y = touch.clientY;
				this._touchStartX = x;
				this._touchStartY = y;
				if (util.isAndroid) {
					/*
					* Bug in Android 4.  The clientX/Y coordinates of the touch events
					* include the page scrolling offsets.
					*/
				    if (y < (touch.pageY - window.pageYOffset) || x < (touch.pageX - window.pageXOffset) ) {
						x = touch.pageX - window.pageXOffset;
						y = touch.pageY - window.pageYOffset;
				    }
				}
				var pt = this.convert({x: x, y: y}, "page", "document"); //$NON-NLS-1$ //$NON-NLS-0$
				this._lastTouchOffset = this.getOffsetAtLocation(pt.x, pt.y);
				this._touchStartTime = e.timeStamp;
				this._touching = true;
			}
		},
		_handleTouchMove: function (e) {
			var touches = e.touches;
			if (touches.length === 1) {
				var touch = touches[0];
				this._touchCurrentX = touch.clientX;
				this._touchCurrentY = touch.clientY;
				var interval = 10;
				if (!this._touchScrollTimer && (e.timeStamp - this._touchStartTime) < (interval*20)) {
					this._vScrollDiv.style.display = "block"; //$NON-NLS-0$
					if (!this._wrapMode) {
						this._hScrollDiv.style.display = "block"; //$NON-NLS-0$
					}
					var self = this;
					var window = this._getWindow();
					this._touchScrollTimer = window.setInterval(function() {
						var deltaX = 0, deltaY = 0;
						if (self._touching) {
							deltaX = self._touchStartX - self._touchCurrentX;
							deltaY = self._touchStartY - self._touchCurrentY;
							self._touchSpeedX = deltaX / interval;
							self._touchSpeedY = deltaY / interval;
							self._touchStartX = self._touchCurrentX;
							self._touchStartY = self._touchCurrentY;
						} else {
							if (Math.abs(self._touchSpeedX) < 0.1 && Math.abs(self._touchSpeedY) < 0.1) {
								self._vScrollDiv.style.display = "none"; //$NON-NLS-0$
								self._hScrollDiv.style.display = "none"; //$NON-NLS-0$
								window.clearInterval(self._touchScrollTimer);
								self._touchScrollTimer = null;
								return;
							} else {
								deltaX = self._touchSpeedX * interval;
								deltaY = self._touchSpeedY * interval;
								self._touchSpeedX *= 0.95;
								self._touchSpeedY *= 0.95;
							}
						}
						self._scrollView(deltaX, deltaY);
					}, interval);
				}
				if (this._touchScrollTimer) {
					e.preventDefault();
				}
			}
		},
		_handleTouchEnd: function (e) {
			var touches = e.touches;
			if (touches.length === 0) {
				this._touching = false;
			}
		},

		/************************************ Actions ******************************************/
		_doAction: function (e) {
			var keyBindings = this._keyBindings;
			for (var i = 0; i < keyBindings.length; i++) {
				var kb = keyBindings[i];
				if (kb.keyBinding.match(e)) {
					if (kb.actionID) {
						var actions = this._actions;
						var action = actions[kb.actionID];
						if (action) {
							if (action.handler) {
								if (!action.handler()) {
									if (action.defaultHandler) {
										return typeof(action.defaultHandler()) === "boolean"; //$NON-NLS-0$
									} else {
										return false;
									}
								} else {
//									Firefox feature...without this empty block, this function will return false when action.handler() returns true
								}
							} else if (action.defaultHandler) {
								return typeof(action.defaultHandler()) === "boolean"; //$NON-NLS-0$
							}
						}
					}
					return true;
				}
			}
			return false;
		},
		_doBackspace: function (args) {
			var selection = this._getSelection();
			if (selection.isEmpty()) {
				var model = this._model;
				var caret = selection.getCaret();
				var lineIndex = model.getLineAtOffset(caret);
				var lineStart = model.getLineStart(lineIndex);
				if (caret === lineStart) {
					if (lineIndex > 0) {
						selection.extend(model.getLineEnd(lineIndex - 1));
					}
				} else {
					var removeTab = false;
					if (this._expandTab && args.unit === "character" && (caret - lineStart) % this._tabSize === 0) { //$NON-NLS-0$
						var lineText = model.getText(lineStart, caret);
						removeTab = !/[^ ]/.test(lineText); // Only spaces between line start and caret.
					}
					if (removeTab) {
						selection.extend(caret - this._tabSize);
					} else {
						var line = this._getLine(lineIndex);
						selection.extend(line.getNextOffset(caret, args.unit, -1));
						line.destroy();
					}
				}
			}
			this._modifyContent({text: "", start: selection.start, end: selection.end}, true);
			return true;
		},
		_doContent: function (text) {
			var selection = this._getSelection();
			this._modifyContent({text: text, start: selection.start, end: selection.end, _ignoreDOMSelection: true}, true);
		},
		_doCopy: function (e) {
			var selection = this._getSelection();
			if (!selection.isEmpty()) {
				var text = this._getBaseText(selection.start, selection.end);
				return this._setClipboardText(text, e);
			}
			return true;
		},
		_doCursorNext: function (args) {
			if (!args.select) {
				if (this._clearSelection("next")) { return true; } //$NON-NLS-0$
			}
			var model = this._model;
			var selection = this._getSelection();
			var caret = selection.getCaret();
			var lineIndex = model.getLineAtOffset(caret);
			if (caret === model.getLineEnd(lineIndex)) {
				if (lineIndex + 1 < model.getLineCount()) {
					selection.extend(model.getLineStart(lineIndex + 1));
				}
			} else {
				var line = this._getLine(lineIndex);
				selection.extend(line.getNextOffset(caret, args.unit, 1));
				line.destroy();
			}
			if (!args.select) { selection.collapse(); }
			this._setSelection(selection, true);
			return true;
		},
		_doCursorPrevious: function (args) {
			if (!args.select) {
				if (this._clearSelection("previous")) { return true; } //$NON-NLS-0$
			}
			var model = this._model;
			var selection = this._getSelection();
			var caret = selection.getCaret();
			var lineIndex = model.getLineAtOffset(caret);
			if (caret === model.getLineStart(lineIndex)) {
				if (lineIndex > 0) {
					selection.extend(model.getLineEnd(lineIndex - 1));
				}
			} else {
				var line = this._getLine(lineIndex);
				selection.extend(line.getNextOffset(caret, args.unit, -1));
				line.destroy();
			}
			if (!args.select) { selection.collapse(); }
			this._setSelection(selection, true);
			return true;
		},
		_doCut: function (e) {
			var selection = this._getSelection();
			if (!selection.isEmpty()) {
				var text = this._getBaseText(selection.start, selection.end);
				this._doContent("");
				return this._setClipboardText(text, e);
			}
			return true;
		},
		_doDelete: function (args) {
			var selection = this._getSelection();
			if (selection.isEmpty()) {
				var model = this._model;
				var caret = selection.getCaret();
				var lineIndex = model.getLineAtOffset(caret);
				if (caret === model.getLineEnd (lineIndex)) {
					if (lineIndex + 1 < model.getLineCount()) {
						selection.extend(model.getLineStart(lineIndex + 1));
					}
				} else {
					var line = this._getLine(lineIndex);
					selection.extend(line.getNextOffset(caret, args.unit, 1));
					line.destroy();
				}
			}
			this._modifyContent({text: "", start: selection.start, end: selection.end}, true);
			return true;
		},
		_doEnd: function (args) {
			var selection = this._getSelection();
			var model = this._model;
			if (args.ctrl) {
				selection.extend(model.getCharCount());
			} else {
				var offset = selection.getCaret();
				var lineIndex = model.getLineAtOffset(offset);
				if (this._wrapMode) {
					var line = this._getLine(lineIndex);
					var visualIndex = line.getLineIndex(offset);
					if (visualIndex === line.getLineCount() - 1) {
						offset = model.getLineEnd(lineIndex);
					} else {
						offset = line.getLineStart(visualIndex + 1) - 1;
					}
					line.destroy();
				} else {
					offset = model.getLineEnd(lineIndex);
				}
				selection.extend(offset);
			}
			if (!args.select) { selection.collapse(); }
			this._setSelection(selection, true);
			return true;
		},
		_doEnter: function (args) {
			var model = this._model;
			var selection = this._getSelection();
			this._doContent(model.getLineDelimiter());
			if (args && args.noCursor) {
				selection.end = selection.start;
				this._setSelection(selection);
			}
			return true;
		},
		_doHome: function (args) {
			var selection = this._getSelection();
			var model = this._model;
			if (args.ctrl) {
				selection.extend(0);
			} else {
				var offset = selection.getCaret();
				var lineIndex = model.getLineAtOffset(offset);
				if (this._wrapMode) {
					var line = this._getLine(lineIndex);
					var visualIndex = line.getLineIndex(offset);
					offset = line.getLineStart(visualIndex);
					line.destroy();
				} else {
					offset = model.getLineStart(lineIndex);
				}
				selection.extend(offset);
			}
			if (!args.select) { selection.collapse(); }
			this._setSelection(selection, true);
			return true;
		},
		_doLineDown: function (args) {
			var model = this._model;
			var selection = this._getSelection();
			var caret = selection.getCaret();
			var lineIndex = model.getLineAtOffset(caret), visualIndex;
			var line = this._getLine(lineIndex);
			var x = this._columnX, y = 1, lastLine = false;
			if (x === -1 || args.wholeLine || (args.select && util.isIE)) {
				var offset = args.wholeLine ? model.getLineEnd(lineIndex + 1) : caret;
				x = line.getBoundingClientRect(offset).left;
			}
			if ((visualIndex = line.getLineIndex(caret)) < line.getLineCount() - 1) {
				y = line.getClientRects(visualIndex + 1).top + 1;
			} else {
				lastLine = lineIndex === model.getLineCount() - 1;
				lineIndex++;
			}
			if (lastLine) {
				if (args.select) {
					selection.extend(model.getCharCount());
					this._setSelection(selection, true, true);
				}
			} else {
				if (line.lineIndex !== lineIndex) {
					line.destroy();
					line = this._getLine(lineIndex);
				}
				selection.extend(line.getOffset(x, y));
				if (!args.select) { selection.collapse(); }
				this._setSelection(selection, true, true);
			}
			this._columnX = x;
			line.destroy();
			return true;
		},
		_doLineUp: function (args) {
			var model = this._model;
			var selection = this._getSelection();
			var caret = selection.getCaret();
			var lineIndex = model.getLineAtOffset(caret), visualIndex;
			var line = this._getLine(lineIndex);
			var x = this._columnX, firstLine = false, y;
			if (x === -1 || args.wholeLine || (args.select && util.isIE)) {
				var offset = args.wholeLine ? model.getLineStart(lineIndex - 1) : caret;
				x = line.getBoundingClientRect(offset).left;
			}
			if ((visualIndex = line.getLineIndex(caret)) > 0) {
				y = line.getClientRects(visualIndex - 1).top + 1;
			} else {
				firstLine = lineIndex === 0;
				if (!firstLine) {
					lineIndex--;
					y = this._getLineHeight(lineIndex) - 1;
				}
			}
			if (firstLine) {
				if (args.select) {
					selection.extend(0);
					this._setSelection(selection, true, true);
				}
			} else {
				if (line.lineIndex !== lineIndex) {
					line.destroy();
					line = this._getLine(lineIndex);
				}
				selection.extend(line.getOffset(x, y));
				if (!args.select) { selection.collapse(); }
				this._setSelection(selection, true, true);
			}
			this._columnX = x;
			line.destroy();
			return true;
		},
		_doPageDown: function (args) {
			var model = this._model;
			var selection = this._getSelection();
			var caret = selection.getCaret();
			var caretLine = model.getLineAtOffset(caret);
			var lineCount = model.getLineCount();
			var scroll = this._getScroll();
			var clientHeight = this._getClientHeight(), x, line;
			if (this._lineHeight) {
				x = this._columnX;
				var caretRect = this._getBoundsAtOffset(caret);
				if (x === -1 || (args.select && util.isIE)) {
					x = caretRect.left;
				}
				var lineIndex = this._getLineIndex(caretRect.top + clientHeight);
				line = this._getLine(lineIndex);
				var linePixel = this._getLinePixel(lineIndex);
				var y = caretRect.top + clientHeight - linePixel;
				caret = line.getOffset(x, y);
				var rect = line.getBoundingClientRect(caret);
				line.destroy();
				selection.extend(caret);
				if (!args.select) { selection.collapse(); }
				this._setSelection(selection, true, true, rect.top + linePixel - caretRect.top);
				this._columnX = x;
				return true;
			}
			if (caretLine < lineCount - 1) {
				var lineHeight = this._getLineHeight();
				var lines = Math.floor(clientHeight / lineHeight);
				var scrollLines = Math.min(lineCount - caretLine - 1, lines);
				scrollLines = Math.max(1, scrollLines);
				x = this._columnX;
				if (x === -1 || (args.select && util.isIE)) {
					line = this._getLine(caretLine);
					x = line.getBoundingClientRect(caret).left;
					line.destroy();
				}
				line = this._getLine(caretLine + scrollLines);
				selection.extend(line.getOffset(x, 0));
				line.destroy();
				if (!args.select) { selection.collapse(); }
				var verticalMaximum = lineCount * lineHeight;
				var scrollOffset = scroll.y + scrollLines * lineHeight;
				if (scrollOffset + clientHeight > verticalMaximum) {
					scrollOffset = verticalMaximum - clientHeight;
				}
				this._setSelection(selection, true, true, scrollOffset - scroll.y);
				this._columnX = x;
			}
			return true;
		},
		_doPageUp: function (args) {
			var model = this._model;
			var selection = this._getSelection();
			var caret = selection.getCaret();
			var caretLine = model.getLineAtOffset(caret);
			var scroll = this._getScroll();
			var clientHeight = this._getClientHeight(), x, line;
			if (this._lineHeight) {
				x = this._columnX;
				var caretRect = this._getBoundsAtOffset(caret);
				if (x === -1 || (args.select && util.isIE)) {
					x = caretRect.left;
				}
				var lineIndex = this._getLineIndex(caretRect.bottom - clientHeight);
				line = this._getLine(lineIndex);
				var linePixel = this._getLinePixel(lineIndex);
				var y = (caretRect.bottom - clientHeight) - linePixel;
				caret = line.getOffset(x, y);
				var rect = line.getBoundingClientRect(caret);
				line.destroy();
				selection.extend(caret);
				if (!args.select) { selection.collapse(); }
				this._setSelection(selection, true, true, rect.top + linePixel - caretRect.top);
				this._columnX = x;
				return true;
			}
			if (caretLine > 0) {
				var lineHeight = this._getLineHeight();
				var lines = Math.floor(clientHeight / lineHeight);
				var scrollLines = Math.max(1, Math.min(caretLine, lines));
				x = this._columnX;
				if (x === -1 || (args.select && util.isIE)) {
					line = this._getLine(caretLine);
					x = line.getBoundingClientRect(caret).left;
					line.destroy();
				}
				line = this._getLine(caretLine - scrollLines);
				selection.extend(line.getOffset(x, this._getLineHeight(caretLine - scrollLines) - 1));
				line.destroy();
				if (!args.select) { selection.collapse(); }
				var scrollOffset = Math.max(0, scroll.y - scrollLines * lineHeight);
				this._setSelection(selection, true, true, scrollOffset - scroll.y);
				this._columnX = x;
			}
			return true;
		},
		_doPaste: function(e) {
			var self = this;
			var result = this._getClipboardText(e, function(text) {
				if (text) {
					if (util.isLinux && self._lastMouseButton === 2) {
						var timeDiff = new Date().getTime() - self._lastMouseTime;
						if (timeDiff <= self._clickTime) {
							self._setSelectionTo(self._lastMouseX, self._lastMouseY);
						}
					}
					self._doContent(text);
				}
			});
			return result !== null;
		},
		_doScroll: function (args) {
			var type = args.type;
			var model = this._model;
			var lineCount = model.getLineCount();
			var clientHeight = this._getClientHeight();
			var lineHeight = this._getLineHeight();
			var verticalMaximum = lineCount * lineHeight;
			var verticalScrollOffset = this._getScroll().y;
			var pixel;
			switch (type) {
				case "textStart": pixel = 0; break; //$NON-NLS-0$
				case "textEnd": pixel = verticalMaximum - clientHeight; break; //$NON-NLS-0$
				case "pageDown": pixel = verticalScrollOffset + clientHeight; break; //$NON-NLS-0$
				case "pageUp": pixel = verticalScrollOffset - clientHeight; break; //$NON-NLS-0$
				case "centerLine": //$NON-NLS-0$
					var selection = this._getSelection();
					var lineStart = model.getLineAtOffset(selection.start);
					var lineEnd = model.getLineAtOffset(selection.end);
					var selectionHeight = (lineEnd - lineStart + 1) * lineHeight;
					pixel = (lineStart * lineHeight) - (clientHeight / 2) + (selectionHeight / 2);
					break;
			}
			if (pixel !== undefined) {
				pixel = Math.min(Math.max(0, pixel), verticalMaximum - clientHeight);
				this._scrollView(0, pixel - verticalScrollOffset);
			}
			return true;
		},
		_doSelectAll: function (args) {
			var model = this._model;
			var selection = this._getSelection();
			selection.setCaret(0);
			selection.extend(model.getCharCount());
			this._setSelection(selection, false);
			return true;
		},
		_doTab: function (args) {
			if(!this._tabMode || this._readonly) { return; }
			var text = "\t"; //$NON-NLS-0$
			if (this._expandTab) {
				var model = this._model;
				var caret = this._getSelection().getCaret();
				var lineIndex = model.getLineAtOffset(caret);
				var lineStart = model.getLineStart(lineIndex);
				var spaces = this._tabSize - ((caret - lineStart) % this._tabSize);
				text = (new Array(spaces + 1)).join(" "); //$NON-NLS-0$
			}
			this._doContent(text);
			return true;
		},
		_doShiftTab: function (args) {
			if(!this._tabMode || this._readonly) { return; }
			return true;
		},
		_doTabMode: function (args) {
			this._tabMode = !this._tabMode;
			return true;
		},
		_doWrapMode: function (args) {
			this.setOptions({wrapMode: !this.getOptions("wrapMode")}); //$NON-NLS-0$
			return true;
		},

		/************************************ Internals ******************************************/
		_autoScroll: function () {
			var selection = this._getSelection();
			var pt = this.convert({x: this._autoScrollX, y: this._autoScrollY}, "page", "document"); //$NON-NLS-1$ //$NON-NLS-0$
			var caret = selection.getCaret();
			var caretLine = this._model.getLineAtOffset(caret), lineIndex, line;
			if (this._autoScrollDir === "up" || this._autoScrollDir === "down") { //$NON-NLS-1$ //$NON-NLS-0$
				var scroll = this._autoScrollY / this._getLineHeight();
				scroll = scroll < 0 ? Math.floor(scroll) : Math.ceil(scroll);
				lineIndex = caretLine;
				lineIndex = Math.max(0, Math.min(this._model.getLineCount() - 1, lineIndex + scroll));
			} else if (this._autoScrollDir === "left" || this._autoScrollDir === "right") { //$NON-NLS-1$ //$NON-NLS-0$
				lineIndex = this._getLineIndex(pt.y);
				line = this._getLine(caretLine);
				pt.x += line.getBoundingClientRect(caret, false).left;
				line.destroy();
			}
			line = this._getLine(lineIndex);
			selection.extend(line.getOffset(pt.x, pt.y - this._getLinePixel(lineIndex)));
			line.destroy();
			this._setSelection(selection, true);
		},
		_autoScrollTimer: function () {
			this._autoScroll();
			var self = this;
			var window = this._getWindow();
			this._autoScrollTimerID = window.setTimeout(function () {self._autoScrollTimer();}, this._AUTO_SCROLL_RATE);
		},
		_calculateLineHeightTimer: function(calculate) {
			if (!this._lineHeight) { return; }
			if (this._calculateLHTimer) { return; }
			var lineCount = this._model.getLineCount(), i = 0;
			if (calculate) {
				var c = 0;
				var MAX_TIME = 100;
				var start = new Date().getTime(), firstLine = 0;
				while (i < lineCount) {
					if (!this._lineHeight[i]) {
						c++;
						if (!firstLine) { firstLine = i; }
						this._lineHeight[i] = this._calculateLineHeight(i);
					}
					i++;
					if ((new Date().getTime() - start) > MAX_TIME) {
						break;
					}
				}
				this.redrawRulers(0, lineCount);
				this._queueUpdate();
			}
			var window = this._getWindow();
			if (i !== lineCount) {
				var self = this;
				this._calculateLHTimer = window.setTimeout(function() {
					self._calculateLHTimer = null;
					self._calculateLineHeightTimer(true);
				}, 0);
				return;
			}
			if (this._calculateLHTimer) {
				window.clearTimeout(this._calculateLHTimer);
				this._calculateLHTimer = undefined;
			}
		},
		_calculateLineHeight: function(lineIndex) {
			var line = this._getLine(lineIndex);
			var rect = line.getBoundingClientRect();
			line.destroy();
			return Math.max(1, Math.ceil(rect.bottom - rect.top));
		},
		_calculateMetrics: function() {
			var parent = this._clientDiv;
			var document = parent.ownerDocument;
			var c = " "; //$NON-NLS-0$
			var line = util.createElement(document, "div"); //$NON-NLS-0$
			line.style.lineHeight = "normal"; //$NON-NLS-0$
			var model = this._model;
			var lineText = model.getLine(0);
			var e = {type:"LineStyle", textView: this, 0: 0, lineText: lineText, lineStart: 0}; //$NON-NLS-0$
			this.onLineStyle(e);
			applyStyle(e.style, line);
			line.style.position = "fixed"; //$NON-NLS-0$
			line.style.left = "-1000px"; //$NON-NLS-0$
			var span1 = util.createElement(document, "span"); //$NON-NLS-0$
			span1.appendChild(document.createTextNode(c));
			line.appendChild(span1);
			var span2 = util.createElement(document, "span"); //$NON-NLS-0$
			span2.style.fontStyle = "italic"; //$NON-NLS-0$
			span2.appendChild(document.createTextNode(c));
			line.appendChild(span2);
			var span3 = util.createElement(document, "span"); //$NON-NLS-0$
			span3.style.fontWeight = "bold"; //$NON-NLS-0$
			span3.appendChild(document.createTextNode(c));
			line.appendChild(span3);
			var span4 = util.createElement(document, "span"); //$NON-NLS-0$
			span4.style.fontWeight = "bold"; //$NON-NLS-0$
			span4.style.fontStyle = "italic"; //$NON-NLS-0$
			span4.appendChild(document.createTextNode(c));
			line.appendChild(span4);
			parent.appendChild(line);
			var lineRect = line.getBoundingClientRect();
			var spanRect1 = span1.getBoundingClientRect();
			var spanRect2 = span2.getBoundingClientRect();
			var spanRect3 = span3.getBoundingClientRect();
			var spanRect4 = span4.getBoundingClientRect();
			var h1 = spanRect1.bottom - spanRect1.top;
			var h2 = spanRect2.bottom - spanRect2.top;
			var h3 = spanRect3.bottom - spanRect3.top;
			var h4 = spanRect4.bottom - spanRect4.top;
			var fontStyle = 0;
			var invalid = (lineRect.bottom - lineRect.top) <= 0;
			var lineHeight = Math.max(1, lineRect.bottom - lineRect.top);
			if (h2 > h1) {
				fontStyle = 1;
			}
			if (h3 > h2) {
				fontStyle = 2;
			}
			if (h4 > h3) {
				fontStyle = 3;
			}
			var style;
			if (fontStyle !== 0) {
				style = {style: {}};
				if ((fontStyle & 1) !== 0) {
					style.style.fontStyle = "italic"; //$NON-NLS-0$
				}
				if ((fontStyle & 2) !== 0) {
					style.style.fontWeight = "bold"; //$NON-NLS-0$
				}
			}
			var trim = getLineTrim(line);
			parent.removeChild(line);

			// calculate pad and scroll width
			var pad = getPadding(this._viewDiv);
			var div1 = util.createElement(document, "div"); //$NON-NLS-0$
			div1.style.position = "fixed"; //$NON-NLS-0$
			div1.style.left = "-1000px"; //$NON-NLS-0$
			div1.style.paddingLeft = pad.left + "px"; //$NON-NLS-0$
			div1.style.paddingTop = pad.top + "px"; //$NON-NLS-0$
			div1.style.paddingRight = pad.right + "px"; //$NON-NLS-0$
			div1.style.paddingBottom = pad.bottom + "px"; //$NON-NLS-0$
			div1.style.width = "100px"; //$NON-NLS-0$
			div1.style.height = "100px"; //$NON-NLS-0$
			var div2 = util.createElement(document, "div"); //$NON-NLS-0$
			div2.style.width = "100%"; //$NON-NLS-0$
			div2.style.height = "100%"; //$NON-NLS-0$
			div1.appendChild(div2);
			parent.appendChild(div1);
			var rect1 = div1.getBoundingClientRect();
			var rect2 = div2.getBoundingClientRect();
			div1.style.overflow = 'hidden'; //$NON-NLS-0$
			div2.style.height = "200px"; //$NON-NLS-0$
			var w1 = div1.clientWidth;
			div1.style.overflow = 'scroll'; //$NON-NLS-0$
			var w2 = div1.clientWidth;
			parent.removeChild(div1);
			var scrollWidth = w1 - w2;
			pad = {
				left: rect2.left - rect1.left,
				top: rect2.top - rect1.top,
				right: rect1.right - rect2.right,
				bottom: rect1.bottom - rect2.bottom
			};
			return {lineHeight: lineHeight, largestFontStyle: style, lineTrim: trim, viewPadding: pad, scrollWidth: scrollWidth, invalid: invalid};
		},
		_clearSelection: function (direction) {
			var selection = this._getSelection();
			if (selection.isEmpty()) { return false; }
			if (direction === "next") { //$NON-NLS-0$
				selection.start = selection.end;
			} else {
				selection.end = selection.start;
			}
			this._setSelection(selection, true);
			return true;
		},
		_commitIME: function () {
			if (this._imeOffset === -1) { return; }
			// make the state of the IME match the state the view expects it be in
			// when the view commits the text and IME also need to be committed
			// this can be accomplished by changing the focus around
			this._scrollDiv.focus();
			this._clientDiv.focus();

			var model = this._model;
			var lineIndex = model.getLineAtOffset(this._imeOffset);
			var lineStart = model.getLineStart(lineIndex);
			var newText = this._getDOMText(this._getLineNode(lineIndex)).text;
			var oldText = model.getLine(lineIndex);
			var start = this._imeOffset - lineStart;
			var end = start + newText.length - oldText.length;
			if (start !== end) {
				var insertText = newText.substring(start, end);
				this._doContent(insertText);
			}
			this._imeOffset = -1;
		},
		_createActions: function () {
			var KeyBinding = mKeyBinding.KeyBinding;
			//no duplicate keybindings
			var bindings = this._keyBindings = [];

			// Cursor Navigation
			bindings.push({actionID: "lineUp",		keyBinding: new KeyBinding(38), predefined: true}); //$NON-NLS-0$
			bindings.push({actionID: "lineDown",	keyBinding: new KeyBinding(40), predefined: true}); //$NON-NLS-0$
			bindings.push({actionID: "charPrevious",	keyBinding: new KeyBinding(37), predefined: true}); //$NON-NLS-0$
			bindings.push({actionID: "charNext",	keyBinding: new KeyBinding(39), predefined: true}); //$NON-NLS-0$
			if (util.isMac) {
				bindings.push({actionID: "scrollPageUp",		keyBinding: new KeyBinding(33), predefined: true}); //$NON-NLS-0$
				bindings.push({actionID: "scrollPageDown",	keyBinding: new KeyBinding(34), predefined: true}); //$NON-NLS-0$
				bindings.push({actionID: "pageUp",		keyBinding: new KeyBinding(33, null, null, true), predefined: true}); //$NON-NLS-0$
				bindings.push({actionID: "pageDown",	keyBinding: new KeyBinding(34, null, null, true), predefined: true}); //$NON-NLS-0$
				bindings.push({actionID: "lineStart",	keyBinding: new KeyBinding(37, true), predefined: true}); //$NON-NLS-0$
				bindings.push({actionID: "lineEnd",		keyBinding: new KeyBinding(39, true), predefined: true}); //$NON-NLS-0$
				bindings.push({actionID: "wordPrevious",	keyBinding: new KeyBinding(37, null, null, true), predefined: true}); //$NON-NLS-0$
				bindings.push({actionID: "wordNext",	keyBinding: new KeyBinding(39, null, null, true), predefined: true}); //$NON-NLS-0$
				bindings.push({actionID: "scrollTextStart",	keyBinding: new KeyBinding(36), predefined: true}); //$NON-NLS-0$
				bindings.push({actionID: "scrollTextEnd",		keyBinding: new KeyBinding(35), predefined: true}); //$NON-NLS-0$
				bindings.push({actionID: "textStart",	keyBinding: new KeyBinding(38, true), predefined: true}); //$NON-NLS-0$
				bindings.push({actionID: "textEnd",		keyBinding: new KeyBinding(40, true), predefined: true}); //$NON-NLS-0$
				bindings.push({actionID: "scrollPageUp",	keyBinding: new KeyBinding(38, null, null, null, true), predefined: true}); //$NON-NLS-0$
				bindings.push({actionID: "scrollPageDown",		keyBinding: new KeyBinding(40, null, null, null, true), predefined: true}); //$NON-NLS-0$
				bindings.push({actionID: "lineStart",	keyBinding: new KeyBinding(37, null, null, null, true), predefined: true}); //$NON-NLS-0$
				bindings.push({actionID: "lineEnd",		keyBinding: new KeyBinding(39, null, null, null, true), predefined: true}); //$NON-NLS-0$
				//TODO These two actions should be changed to paragraph start and paragraph end  when word wrap is implemented
				bindings.push({actionID: "lineStart",	keyBinding: new KeyBinding(38, null, null, true), predefined: true}); //$NON-NLS-0$
				bindings.push({actionID: "lineEnd",		keyBinding: new KeyBinding(40, null, null, true), predefined: true}); //$NON-NLS-0$
			} else {
				bindings.push({actionID: "pageUp",		keyBinding: new KeyBinding(33), predefined: true}); //$NON-NLS-0$
				bindings.push({actionID: "pageDown",	keyBinding: new KeyBinding(34), predefined: true}); //$NON-NLS-0$
				bindings.push({actionID: "lineStart",	keyBinding: new KeyBinding(36), predefined: true}); //$NON-NLS-0$
				bindings.push({actionID: "lineEnd",		keyBinding: new KeyBinding(35), predefined: true}); //$NON-NLS-0$
				bindings.push({actionID: "wordPrevious",	keyBinding: new KeyBinding(37, true), predefined: true}); //$NON-NLS-0$
				bindings.push({actionID: "wordNext",	keyBinding: new KeyBinding(39, true), predefined: true}); //$NON-NLS-0$
				bindings.push({actionID: "textStart",	keyBinding: new KeyBinding(36, true), predefined: true}); //$NON-NLS-0$
				bindings.push({actionID: "textEnd",		keyBinding: new KeyBinding(35, true), predefined: true}); //$NON-NLS-0$
			}
			if (util.isFirefox && util.isLinux) {
				bindings.push({actionID: "lineUp",		keyBinding: new KeyBinding(38, true), predefined: true}); //$NON-NLS-0$
				bindings.push({actionID: "lineDown",	keyBinding: new KeyBinding(40, true), predefined: true}); //$NON-NLS-0$
			}

			// Select Cursor Navigation
			bindings.push({actionID: "selectLineUp",		keyBinding: new KeyBinding(38, null, true), predefined: true}); //$NON-NLS-0$
			bindings.push({actionID: "selectLineDown",		keyBinding: new KeyBinding(40, null, true), predefined: true}); //$NON-NLS-0$
			bindings.push({actionID: "selectCharPrevious",	keyBinding: new KeyBinding(37, null, true), predefined: true}); //$NON-NLS-0$
			bindings.push({actionID: "selectCharNext",		keyBinding: new KeyBinding(39, null, true), predefined: true}); //$NON-NLS-0$
			bindings.push({actionID: "selectPageUp",		keyBinding: new KeyBinding(33, null, true), predefined: true}); //$NON-NLS-0$
			bindings.push({actionID: "selectPageDown",		keyBinding: new KeyBinding(34, null, true), predefined: true}); //$NON-NLS-0$
			if (util.isMac) {
				bindings.push({actionID: "selectLineStart",	keyBinding: new KeyBinding(37, true, true), predefined: true}); //$NON-NLS-0$
				bindings.push({actionID: "selectLineEnd",		keyBinding: new KeyBinding(39, true, true), predefined: true}); //$NON-NLS-0$
				bindings.push({actionID: "selectWordPrevious",	keyBinding: new KeyBinding(37, null, true, true), predefined: true}); //$NON-NLS-0$
				bindings.push({actionID: "selectWordNext",	keyBinding: new KeyBinding(39, null, true, true), predefined: true}); //$NON-NLS-0$
				bindings.push({actionID: "selectTextStart",	keyBinding: new KeyBinding(36, null, true), predefined: true}); //$NON-NLS-0$
				bindings.push({actionID: "selectTextEnd",		keyBinding: new KeyBinding(35, null, true), predefined: true}); //$NON-NLS-0$
				bindings.push({actionID: "selectTextStart",	keyBinding: new KeyBinding(38, true, true), predefined: true}); //$NON-NLS-0$
				bindings.push({actionID: "selectTextEnd",		keyBinding: new KeyBinding(40, true, true), predefined: true}); //$NON-NLS-0$
				bindings.push({actionID: "selectLineStart",	keyBinding: new KeyBinding(37, null, true, null, true), predefined: true}); //$NON-NLS-0$
				bindings.push({actionID: "selectLineEnd",		keyBinding: new KeyBinding(39, null, true, null, true), predefined: true}); //$NON-NLS-0$
				//TODO These two actions should be changed to select paragraph start and select paragraph end  when word wrap is implemented
				bindings.push({actionID: "selectLineStart",	keyBinding: new KeyBinding(38, null, true, true), predefined: true}); //$NON-NLS-0$
				bindings.push({actionID: "selectLineEnd",		keyBinding: new KeyBinding(40, null, true, true), predefined: true}); //$NON-NLS-0$
			} else {
				if (util.isLinux) {
					bindings.push({actionID: "selectWholeLineUp",		keyBinding: new KeyBinding(38, true, true), predefined: true}); //$NON-NLS-0$
					bindings.push({actionID: "selectWholeLineDown",		keyBinding: new KeyBinding(40, true, true), predefined: true}); //$NON-NLS-0$
				}
				bindings.push({actionID: "selectLineStart",		keyBinding: new KeyBinding(36, null, true), predefined: true}); //$NON-NLS-0$
				bindings.push({actionID: "selectLineEnd",		keyBinding: new KeyBinding(35, null, true), predefined: true}); //$NON-NLS-0$
				bindings.push({actionID: "selectWordPrevious",	keyBinding: new KeyBinding(37, true, true), predefined: true}); //$NON-NLS-0$
				bindings.push({actionID: "selectWordNext",		keyBinding: new KeyBinding(39, true, true), predefined: true}); //$NON-NLS-0$
				bindings.push({actionID: "selectTextStart",		keyBinding: new KeyBinding(36, true, true), predefined: true}); //$NON-NLS-0$
				bindings.push({actionID: "selectTextEnd",		keyBinding: new KeyBinding(35, true, true), predefined: true}); //$NON-NLS-0$
			}

			//Undo stack
			bindings.push({actionID: "undo", keyBinding: new mKeyBinding.KeyBinding('z', true), predefined: true}); //$NON-NLS-1$ //$NON-NLS-0$
			if (util.isMac) {
				bindings.push({actionID: "redo", keyBinding: new mKeyBinding.KeyBinding('z', true, true), predefined: true}); //$NON-NLS-1$ //$NON-NLS-0$
			} else {
				bindings.push({actionID: "redo", keyBinding: new mKeyBinding.KeyBinding('y', true), predefined: true}); //$NON-NLS-1$ //$NON-NLS-0$
			}

			//Misc
			bindings.push({actionID: "deletePrevious",		keyBinding: new KeyBinding(8), predefined: true}); //$NON-NLS-0$
			bindings.push({actionID: "deletePrevious",		keyBinding: new KeyBinding(8, null, true), predefined: true}); //$NON-NLS-0$
			bindings.push({actionID: "deleteNext",		keyBinding: new KeyBinding(46), predefined: true}); //$NON-NLS-0$
			bindings.push({actionID: "deleteWordPrevious",	keyBinding: new KeyBinding(8, true), predefined: true}); //$NON-NLS-0$
			bindings.push({actionID: "deleteWordPrevious",	keyBinding: new KeyBinding(8, true, true), predefined: true}); //$NON-NLS-0$
			bindings.push({actionID: "deleteWordNext",		keyBinding: new KeyBinding(46, true), predefined: true}); //$NON-NLS-0$
			bindings.push({actionID: "tab",			keyBinding: new KeyBinding(9), predefined: true}); //$NON-NLS-0$
			bindings.push({actionID: "shiftTab",			keyBinding: new KeyBinding(9, null, true), predefined: true}); //$NON-NLS-0$
			bindings.push({actionID: "enter",			keyBinding: new KeyBinding(13), predefined: true}); //$NON-NLS-0$
			bindings.push({actionID: "enterAfter",			keyBinding: new KeyBinding(13, null, true), predefined: true}); //$NON-NLS-0$
			bindings.push({actionID: "selectAll",		keyBinding: new KeyBinding('a', true), predefined: true}); //$NON-NLS-1$ //$NON-NLS-0$
			bindings.push({actionID: "toggleTabMode",	keyBinding: new KeyBinding('m', true), predefined: true}); //$NON-NLS-1$ //$NON-NLS-0$
			if (util.isMac) {
				bindings.push({actionID: "deleteNext",		keyBinding: new KeyBinding(46, null, true), predefined: true}); //$NON-NLS-0$
				bindings.push({actionID: "deleteWordPrevious",	keyBinding: new KeyBinding(8, null, null, true), predefined: true}); //$NON-NLS-0$
				bindings.push({actionID: "deleteWordNext",		keyBinding: new KeyBinding(46, null, null, true), predefined: true}); //$NON-NLS-0$
			}

			/*
			* Feature in IE/Chrome: prevent ctrl+'u', ctrl+'i', and ctrl+'b' from applying styles to the text.
			*
			* Note that Chrome applies the styles on the Mac with Ctrl instead of Cmd.
			*/
			if (!util.isFirefox) {
				var isMacChrome = util.isMac && util.isChrome;
				bindings.push({actionID: null, keyBinding: new KeyBinding('u', !isMacChrome, false, false, isMacChrome), predefined: true}); //$NON-NLS-0$
				bindings.push({actionID: null, keyBinding: new KeyBinding('i', !isMacChrome, false, false, isMacChrome), predefined: true}); //$NON-NLS-0$
				bindings.push({actionID: null, keyBinding: new KeyBinding('b', !isMacChrome, false, false, isMacChrome), predefined: true}); //$NON-NLS-0$
			}

			if (util.isFirefox) {
				bindings.push({actionID: "copy", keyBinding: new KeyBinding(45, true), predefined: true}); //$NON-NLS-0$
				bindings.push({actionID: "paste", keyBinding: new KeyBinding(45, null, true), predefined: true}); //$NON-NLS-0$
				bindings.push({actionID: "cut", keyBinding: new KeyBinding(46, null, true), predefined: true}); //$NON-NLS-0$
			}

			// Add the emacs Control+ ... key bindings.
			if (util.isMac) {
				bindings.push({actionID: "lineStart", keyBinding: new KeyBinding("a", false, false, false, true), predefined: true}); //$NON-NLS-1$ //$NON-NLS-0$
				bindings.push({actionID: "lineEnd", keyBinding: new KeyBinding("e", false, false, false, true), predefined: true}); //$NON-NLS-1$ //$NON-NLS-0$
				bindings.push({actionID: "lineUp", keyBinding: new KeyBinding("p", false, false, false, true), predefined: true}); //$NON-NLS-1$ //$NON-NLS-0$
				bindings.push({actionID: "lineDown", keyBinding: new KeyBinding("n", false, false, false, true), predefined: true}); //$NON-NLS-1$ //$NON-NLS-0$
				bindings.push({actionID: "charPrevious", keyBinding: new KeyBinding("b", false, false, false, true), predefined: true}); //$NON-NLS-1$ //$NON-NLS-0$
				bindings.push({actionID: "charNext", keyBinding: new KeyBinding("f", false, false, false, true), predefined: true}); //$NON-NLS-1$ //$NON-NLS-0$
				bindings.push({actionID: "deletePrevious", keyBinding: new KeyBinding("h", false, false, false, true), predefined: true}); //$NON-NLS-1$ //$NON-NLS-0$
				bindings.push({actionID: "deleteNext", keyBinding: new KeyBinding("d", false, false, false, true), predefined: true}); //$NON-NLS-1$ //$NON-NLS-0$
				bindings.push({actionID: "deleteLineEnd", keyBinding: new KeyBinding("k", false, false, false, true), predefined: true}); //$NON-NLS-1$ //$NON-NLS-0$
				// SCRIPTED - pulled up from else clause. TODO work out why it was conditional
				bindings.push({actionID: "centerLine", keyBinding: new KeyBinding("l", false, false, false, true), predefined: true}); //$NON-NLS-1$ //$NON-NLS-0$
				if (util.isFirefox) {
					bindings.push({actionID: "scrollPageDown", keyBinding: new KeyBinding("v", false, false, false, true), predefined: true}); //$NON-NLS-1$ //$NON-NLS-0$
					bindings.push({actionID: "deleteLineStart", keyBinding: new KeyBinding("u", false, false, false, true), predefined: true}); //$NON-NLS-1$ //$NON-NLS-0$
					bindings.push({actionID: "deleteWordPrevious", keyBinding: new KeyBinding("w", false, false, false, true), predefined: true}); //$NON-NLS-1$ //$NON-NLS-0$
				} else {
					bindings.push({actionID: "pageDown", keyBinding: new KeyBinding("v", false, false, false, true), predefined: true}); //$NON-NLS-1$ //$NON-NLS-0$
					bindings.push({actionID: "enterNoCursor", keyBinding: new KeyBinding("o", false, false, false, true), predefined: true}); //$NON-NLS-1$ //$NON-NLS-0$
					//TODO implement: y (yank), t (transpose)
				}
			}

			//1 to 1, no duplicates
			var self = this;
			this._actions = {
				"lineUp": {defaultHandler: function() {return self._doLineUp({select: false});}}, //$NON-NLS-0$
				"lineDown": {defaultHandler: function() {return self._doLineDown({select: false});}}, //$NON-NLS-0$
				"lineStart": {defaultHandler: function() {return self._doHome({select: false, ctrl:false});}}, //$NON-NLS-0$
				"lineEnd": {defaultHandler: function() {return self._doEnd({select: false, ctrl:false});}}, //$NON-NLS-0$
				"charPrevious": {defaultHandler: function() {return self._doCursorPrevious({select: false, unit:"character"});}}, //$NON-NLS-1$ //$NON-NLS-0$
				"charNext": {defaultHandler: function() {return self._doCursorNext({select: false, unit:"character"});}}, //$NON-NLS-1$ //$NON-NLS-0$
				"pageUp": {defaultHandler: function() {return self._doPageUp({select: false});}}, //$NON-NLS-0$
				"pageDown": {defaultHandler: function() {return self._doPageDown({select: false});}}, //$NON-NLS-0$
				"scrollPageUp": {defaultHandler: function() {return self._doScroll({type: "pageUp"});}}, //$NON-NLS-1$ //$NON-NLS-0$
				"scrollPageDown": {defaultHandler: function() {return self._doScroll({type: "pageDown"});}}, //$NON-NLS-1$ //$NON-NLS-0$
				"wordPrevious": {defaultHandler: function() {return self._doCursorPrevious({select: false, unit:"word"});}}, //$NON-NLS-1$ //$NON-NLS-0$
				"wordNext": {defaultHandler: function() {return self._doCursorNext({select: false, unit:"word"});}}, //$NON-NLS-1$ //$NON-NLS-0$
				"textStart": {defaultHandler: function() {return self._doHome({select: false, ctrl:true});}}, //$NON-NLS-0$
				"textEnd": {defaultHandler: function() {return self._doEnd({select: false, ctrl:true});}}, //$NON-NLS-0$
				"scrollTextStart": {defaultHandler: function() {return self._doScroll({type: "textStart"});}}, //$NON-NLS-1$ //$NON-NLS-0$
				"scrollTextEnd": {defaultHandler: function() {return self._doScroll({type: "textEnd"});}}, //$NON-NLS-1$ //$NON-NLS-0$
				"centerLine": {defaultHandler: function() {return self._doScroll({type: "centerLine"});}}, //$NON-NLS-1$ //$NON-NLS-0$

				"selectLineUp": {defaultHandler: function() {return self._doLineUp({select: true});}}, //$NON-NLS-0$
				"selectLineDown": {defaultHandler: function() {return self._doLineDown({select: true});}}, //$NON-NLS-0$
				"selectWholeLineUp": {defaultHandler: function() {return self._doLineUp({select: true, wholeLine: true});}}, //$NON-NLS-0$
				"selectWholeLineDown": {defaultHandler: function() {return self._doLineDown({select: true, wholeLine: true});}}, //$NON-NLS-0$
				"selectLineStart": {defaultHandler: function() {return self._doHome({select: true, ctrl:false});}}, //$NON-NLS-0$
				"selectLineEnd": {defaultHandler: function() {return self._doEnd({select: true, ctrl:false});}}, //$NON-NLS-0$
				"selectCharPrevious": {defaultHandler: function() {return self._doCursorPrevious({select: true, unit:"character"});}}, //$NON-NLS-1$ //$NON-NLS-0$
				"selectCharNext": {defaultHandler: function() {return self._doCursorNext({select: true, unit:"character"});}}, //$NON-NLS-1$ //$NON-NLS-0$
				"selectPageUp": {defaultHandler: function() {return self._doPageUp({select: true});}}, //$NON-NLS-0$
				"selectPageDown": {defaultHandler: function() {return self._doPageDown({select: true});}}, //$NON-NLS-0$
				"selectWordPrevious": {defaultHandler: function() {return self._doCursorPrevious({select: true, unit:"word"});}}, //$NON-NLS-1$ //$NON-NLS-0$
				"selectWordNext": {defaultHandler: function() {return self._doCursorNext({select: true, unit:"word"});}}, //$NON-NLS-1$ //$NON-NLS-0$
				"selectTextStart": {defaultHandler: function() {return self._doHome({select: true, ctrl:true});}}, //$NON-NLS-0$
				"selectTextEnd": {defaultHandler: function() {return self._doEnd({select: true, ctrl:true});}}, //$NON-NLS-0$

				"deletePrevious": {defaultHandler: function() {return self._doBackspace({unit:"character"});}}, //$NON-NLS-1$ //$NON-NLS-0$
				"deleteNext": {defaultHandler: function() {return self._doDelete({unit:"character"});}}, //$NON-NLS-1$ //$NON-NLS-0$
				"deleteWordPrevious": {defaultHandler: function() {return self._doBackspace({unit:"word"});}}, //$NON-NLS-1$ //$NON-NLS-0$
				"deleteWordNext": {defaultHandler: function() {return self._doDelete({unit:"word"});}}, //$NON-NLS-1$ //$NON-NLS-0$
				"deleteLineStart": {defaultHandler: function() {return self._doBackspace({unit: "line"});}}, //$NON-NLS-1$ //$NON-NLS-0$
				"deleteLineEnd": {defaultHandler: function() {return self._doDelete({unit: "line"});}}, //$NON-NLS-1$ //$NON-NLS-0$
				"tab": {defaultHandler: function() {return self._doTab();}}, //$NON-NLS-0$
				"shiftTab": {defaultHandler: function() {return self._doShiftTab();}}, //$NON-NLS-0$
				"enter": {defaultHandler: function() {return self._doEnter();}}, //$NON-NLS-0$
				"enterAfter": {defaultHandler: function() {return self._doEnter({after:true});}}, //$NON-NLS-0$
				"enterNoCursor": {defaultHandler: function() {return self._doEnter({noCursor:true});}}, //$NON-NLS-0$
				"selectAll": {defaultHandler: function() {return self._doSelectAll();}}, //$NON-NLS-0$
				"copy": {defaultHandler: function() {return self._doCopy();}}, //$NON-NLS-0$
				"cut": {defaultHandler: function() {return self._doCut();}}, //$NON-NLS-0$
				"paste": {defaultHandler: function() {return self._doPaste();}}, //$NON-NLS-0$

				"toggleWrapMode": {defaultHandler: function() {return self._doWrapMode();}}, //$NON-NLS-0$
				"toggleTabMode": {defaultHandler: function() {return self._doTabMode();}} //$NON-NLS-0$
			};
		},
		_createRuler: function(ruler, index) {
			if (!this._clientDiv) { return; }
			var side = ruler.getLocation();
			var rulerParent = side === "left" ? this._leftDiv : this._rightDiv; //$NON-NLS-0$
			rulerParent.style.display = "block"; //$NON-NLS-0$
			var div = util.createElement(rulerParent.ownerDocument, "div"); //$NON-NLS-0$
			div._ruler = ruler;
			div.rulerChanged = true;
			div.style.position = "relative"; //$NON-NLS-0$
			var row = rulerParent.firstChild.rows[0];
			var length = row.cells.length;
			index = index === undefined || index < 0 || index > length ? length : index;
			var cell = row.insertCell(index);
			cell.vAlign = "top"; //$NON-NLS-0$
			cell.appendChild(div);
		},
		_createView: function() {
			if (this._clientDiv) { return; }
			var parent = this._parent;
			while (parent.hasChildNodes()) { parent.removeChild(parent.lastChild); }

			var document = parent.ownerDocument;
			var rootDiv = util.createElement(document, "div"); //$NON-NLS-0$
			this._rootDiv = rootDiv;
			rootDiv.tabIndex = -1;
			rootDiv.style.position = "relative"; //$NON-NLS-0$
			rootDiv.style.overflow = "hidden"; //$NON-NLS-0$
			rootDiv.style.width = "100%"; //$NON-NLS-0$
			rootDiv.style.height = "100%"; //$NON-NLS-0$
			parent.style.overflow = "hidden"; //$NON-NLS-0$
			rootDiv.setAttribute("role", "application"); //$NON-NLS-1$ //$NON-NLS-0$
			parent.appendChild(rootDiv);

			var leftDiv = util.createElement(document, "div"); //$NON-NLS-0$
			leftDiv.className = "textviewLeftRuler"; //$NON-NLS-0$
			this._leftDiv = leftDiv;
			leftDiv.tabIndex = -1;
			leftDiv.style.overflow = "hidden"; //$NON-NLS-0$
			leftDiv.style.MozUserSelect = "none"; //$NON-NLS-0$
			leftDiv.style.WebkitUserSelect = "none"; //$NON-NLS-0$
			leftDiv.style.position = "absolute"; //$NON-NLS-0$
			leftDiv.style.cursor = "default"; //$NON-NLS-0$
			leftDiv.style.display = "none"; //$NON-NLS-0$
			leftDiv.setAttribute("aria-hidden", "true"); //$NON-NLS-1$ //$NON-NLS-0$
			var table = util.createElement(document, "table"); //$NON-NLS-0$
			leftDiv.appendChild(table);
			table.cellPadding = "0px"; //$NON-NLS-0$
			table.cellSpacing = "0px"; //$NON-NLS-0$
			table.border = "0px"; //$NON-NLS-0$
			table.insertRow(0);
			rootDiv.appendChild(leftDiv);

			var viewDiv = util.createElement(document, "div"); //$NON-NLS-0$
			viewDiv.className = "textview"; //$NON-NLS-0$
			this._viewDiv = viewDiv;
			viewDiv.tabIndex = -1;
			viewDiv.style.overflow = "auto"; //$NON-NLS-0$
			viewDiv.style.position = "absolute"; //$NON-NLS-0$
			viewDiv.style.top = "0px"; //$NON-NLS-0$
			viewDiv.style.bottom = "0px"; //$NON-NLS-0$
			viewDiv.style.borderWidth = "0px"; //$NON-NLS-0$
			viewDiv.style.margin = "0px"; //$NON-NLS-0$
			viewDiv.style.outline = "none"; //$NON-NLS-0$
			rootDiv.appendChild(viewDiv);

			var rightDiv = util.createElement(document, "div"); //$NON-NLS-0$
			rightDiv.className = "textviewRightRuler"; //$NON-NLS-0$
			this._rightDiv = rightDiv;
			rightDiv.tabIndex = -1;
			rightDiv.style.display = "none"; //$NON-NLS-0$
			rightDiv.style.overflow = "hidden"; //$NON-NLS-0$
			rightDiv.style.MozUserSelect = "none"; //$NON-NLS-0$
			rightDiv.style.WebkitUserSelect = "none"; //$NON-NLS-0$
			rightDiv.style.position = "absolute"; //$NON-NLS-0$
			rightDiv.style.cursor = "default"; //$NON-NLS-0$
			rightDiv.style.right = "0px"; //$NON-NLS-0$
			rightDiv.setAttribute("aria-hidden", "true"); //$NON-NLS-1$ //$NON-NLS-0$
			table = util.createElement(document, "table"); //$NON-NLS-0$
			rightDiv.appendChild(table);
			table.cellPadding = "0px"; //$NON-NLS-0$
			table.cellSpacing = "0px"; //$NON-NLS-0$
			table.border = "0px"; //$NON-NLS-0$
			table.insertRow(0);
			rootDiv.appendChild(rightDiv);

			var scrollDiv = util.createElement(document, "div"); //$NON-NLS-0$
			this._scrollDiv = scrollDiv;
			scrollDiv.style.margin = "0px"; //$NON-NLS-0$
			scrollDiv.style.borderWidth = "0px"; //$NON-NLS-0$
			scrollDiv.style.padding = "0px"; //$NON-NLS-0$
			viewDiv.appendChild(scrollDiv);

			if (util.isFirefox) {
				var clipboardDiv = util.createElement(document, "div"); //$NON-NLS-0$
				this._clipboardDiv = clipboardDiv;
				clipboardDiv.style.position = "fixed"; //$NON-NLS-0$
				clipboardDiv.style.whiteSpace = "pre"; //$NON-NLS-0$
				clipboardDiv.style.left = "-1000px"; //$NON-NLS-0$
				rootDiv.appendChild(clipboardDiv);
			}

			if (!util.isIE && !util.isIOS) {
				var clipDiv = util.createElement(document, "div"); //$NON-NLS-0$
				this._clipDiv = clipDiv;
				clipDiv.style.position = "absolute"; //$NON-NLS-0$
				clipDiv.style.overflow = "hidden"; //$NON-NLS-0$
				clipDiv.style.margin = "0px"; //$NON-NLS-0$
				clipDiv.style.borderWidth = "0px"; //$NON-NLS-0$
				clipDiv.style.padding = "0px"; //$NON-NLS-0$
				rootDiv.appendChild(clipDiv);

				var clipScrollDiv = util.createElement(document, "div"); //$NON-NLS-0$
				this._clipScrollDiv = clipScrollDiv;
				clipScrollDiv.style.position = "absolute"; //$NON-NLS-0$
				clipScrollDiv.style.height = "1px"; //$NON-NLS-0$
				clipScrollDiv.style.top = "-1000px"; //$NON-NLS-0$
				clipDiv.appendChild(clipScrollDiv);
			}

			this._setFullSelection(this._fullSelection, true);

			var clientDiv = util.createElement(document, "div"); //$NON-NLS-0$
			clientDiv.className = "textviewContent"; //$NON-NLS-0$
			this._clientDiv = clientDiv;
			clientDiv.style.position = "absolute"; //$NON-NLS-0$
			clientDiv.style.borderWidth = "0px"; //$NON-NLS-0$
			clientDiv.style.margin = "0px"; //$NON-NLS-0$
			clientDiv.style.padding = "0px"; //$NON-NLS-0$
			clientDiv.style.outline = "none"; //$NON-NLS-0$
			clientDiv.style.zIndex = "1"; //$NON-NLS-0$
			clientDiv.style.WebkitUserSelect = "text"; //$NON-NLS-0$
			clientDiv.setAttribute("spellcheck", "false"); //$NON-NLS-1$ //$NON-NLS-0$
			if (util.isIOS || util.isAndroid) {
				clientDiv.style.WebkitTapHighlightColor = "transparent"; //$NON-NLS-0$
			}
			(this._clipDiv || rootDiv).appendChild(clientDiv);

			if (util.isIOS || util.isAndroid) {
				var vScrollDiv = util.createElement(document, "div"); //$NON-NLS-0$
				this._vScrollDiv = vScrollDiv;
				vScrollDiv.style.position = "absolute"; //$NON-NLS-0$
				vScrollDiv.style.borderWidth = "1px"; //$NON-NLS-0$
				vScrollDiv.style.borderColor = "white"; //$NON-NLS-0$
				vScrollDiv.style.borderStyle = "solid"; //$NON-NLS-0$
				vScrollDiv.style.borderRadius = "4px"; //$NON-NLS-0$
				vScrollDiv.style.backgroundColor = "black"; //$NON-NLS-0$
				vScrollDiv.style.opacity = "0.5"; //$NON-NLS-0$
				vScrollDiv.style.margin = "0px"; //$NON-NLS-0$
				vScrollDiv.style.padding = "0px"; //$NON-NLS-0$
				vScrollDiv.style.outline = "none"; //$NON-NLS-0$
				vScrollDiv.style.zIndex = "3"; //$NON-NLS-0$
				vScrollDiv.style.width = "8px"; //$NON-NLS-0$
				vScrollDiv.style.display = "none"; //$NON-NLS-0$
				rootDiv.appendChild(vScrollDiv);
				var hScrollDiv = util.createElement(document, "div"); //$NON-NLS-0$
				this._hScrollDiv = hScrollDiv;
				hScrollDiv.style.position = "absolute"; //$NON-NLS-0$
				hScrollDiv.style.borderWidth = "1px"; //$NON-NLS-0$
				hScrollDiv.style.borderColor = "white"; //$NON-NLS-0$
				hScrollDiv.style.borderStyle = "solid"; //$NON-NLS-0$
				hScrollDiv.style.borderRadius = "4px"; //$NON-NLS-0$
				hScrollDiv.style.backgroundColor = "black"; //$NON-NLS-0$
				hScrollDiv.style.opacity = "0.5"; //$NON-NLS-0$
				hScrollDiv.style.margin = "0px"; //$NON-NLS-0$
				hScrollDiv.style.padding = "0px"; //$NON-NLS-0$
				hScrollDiv.style.outline = "none"; //$NON-NLS-0$
				hScrollDiv.style.zIndex = "3"; //$NON-NLS-0$
				hScrollDiv.style.height = "8px"; //$NON-NLS-0$
				hScrollDiv.style.display = "none"; //$NON-NLS-0$
				rootDiv.appendChild(hScrollDiv);
			}

			if (util.isFirefox && !clientDiv.setCapture) {
				var overlayDiv = util.createElement(document, "div"); //$NON-NLS-0$
				this._overlayDiv = overlayDiv;
				overlayDiv.style.position = clientDiv.style.position;
				overlayDiv.style.borderWidth = clientDiv.style.borderWidth;
				overlayDiv.style.margin = clientDiv.style.margin;
				overlayDiv.style.padding = clientDiv.style.padding;
				overlayDiv.style.cursor = "text"; //$NON-NLS-0$
				overlayDiv.style.zIndex = "2"; //$NON-NLS-0$
				(this._clipDiv || rootDiv).appendChild(overlayDiv);
			}
			clientDiv.contentEditable = "true"; //$NON-NLS-0$
			clientDiv.setAttribute("role", "textbox"); //$NON-NLS-1$ //$NON-NLS-0$
			clientDiv.setAttribute("aria-multiline", "true"); //$NON-NLS-1$ //$NON-NLS-0$
			this._setWrapMode(this._wrapMode, true);
			this._setReadOnly(this._readonly);
			this._setThemeClass(this._themeClass, true);
			this._setTabSize(this._tabSize, true);
			if (!document.getElementById("_textviewStyle")) { //$NON-NLS-0$
				var styleText = "";
				if (util.isWebkit && this._metrics.scrollWidth > 0) {
					styleText += "\n.textviewContainer ::-webkit-scrollbar-corner {background: #eeeeee;}"; //$NON-NLS-0$
				}
				if (util.isFirefox && util.isMac && this._highlightRGB && this._highlightRGB !== "Highlight") { //$NON-NLS-0$
					styleText += "\n.textviewContainer ::-moz-selection {background: " + this._highlightRGB + ";}"; //$NON-NLS-1$ //$NON-NLS-0$
				}
				if (styleText) {
					var stylesheet = util.createElement(document, "style"); //$NON-NLS-0$
					stylesheet.id = "_textviewStyle"; //$NON-NLS-0$
					var head = document.getElementsByTagName("head")[0] || document.documentElement; //$NON-NLS-0$
					stylesheet.appendChild(document.createTextNode(styleText));
					head.insertBefore(stylesheet, head.firstChild);
				}
			}
			this._hookEvents();
			var rulers = this._rulers;
			for (var i=0; i<rulers.length; i++) {
				this._createRuler(rulers[i]);
			}
			this._update();
		},
		_defaultOptions: function() {
			return {
				parent: {value: undefined, update: null},
				model: {value: undefined, update: this.setModel},
				readonly: {value: false, update: this._setReadOnly},
				fullSelection: {value: true, update: this._setFullSelection},
				tabMode: { value: true, update: null },
				tabSize: {value: 8, update: this._setTabSize},
				expandTab: {value: false, update: null},
				wrapMode: {value: false, update: this._setWrapMode},
				themeClass: {value: undefined, update: this._setThemeClass}
			};
		},
		_destroyRuler: function(ruler) {
			var side = ruler.getLocation();
			var rulerParent = side === "left" ? this._leftDiv : this._rightDiv; //$NON-NLS-0$
			if (rulerParent) {
				var row = rulerParent.firstChild.rows[0];
				var cells = row.cells;
				for (var index = 0; index < cells.length; index++) {
					var cell = cells[index];
					if (cell.firstChild._ruler === ruler) { break; }
				}
				if (index === cells.length) { return; }
				row.cells[index]._ruler = undefined;
				row.deleteCell(index);
				if (cells.length === 0) {
					rulerParent.style.display = "none"; //$NON-NLS-0$
				}
			}
		},
		_destroyView: function() {
			var clientDiv = this._clientDiv;
			if (!clientDiv) { return; }
			this._setGrab(null);
			this._unhookEvents();

			/* Destroy timers */
			var window = this._getWindow();
			if (this._autoScrollTimerID) {
				window.clearTimeout(this._autoScrollTimerID);
				this._autoScrollTimerID = null;
			}
			if (this._updateTimer) {
				window.clearTimeout(this._updateTimer);
				this._updateTimer = null;
			}

			var rootDiv = this._rootDiv;
			rootDiv.parentNode.removeChild(rootDiv);

			/* Destroy DOM */
			this._selDiv1 = null;
			this._selDiv2 = null;
			this._selDiv3 = null;
			this._clipboardDiv = null;
			this._rootDiv = null;
			this._scrollDiv = null;
			this._viewDiv = null;
			this._clipDiv = null;
			this._clipScrollDiv = null;
			this._clientDiv = null;
			this._overlayDiv = null;
			this._leftDiv = null;
			this._rightDiv = null;
			this._vScrollDiv = null;
			this._hScrollDiv = null;
		},
		_doAutoScroll: function (direction, x, y) {
			this._autoScrollDir = direction;
			this._autoScrollX = x;
			this._autoScrollY = y;
			if (!this._autoScrollTimerID) {
				this._autoScrollTimer();
			}
		},
		_endAutoScroll: function () {
			if (this._autoScrollTimerID) {
				var window = this._getWindow();
				window.clearTimeout(this._autoScrollTimerID);
			}
			this._autoScrollDir = undefined;
			this._autoScrollTimerID = undefined;
		},
		_fixCaret: function() {
			var clientDiv = this._clientDiv;
			if (clientDiv) {
				var hasFocus = this._hasFocus;
				this._ignoreFocus = true;
				if (hasFocus) { clientDiv.blur(); }
				clientDiv.contentEditable = false;
				clientDiv.contentEditable = true;
				if (hasFocus) { clientDiv.focus(); }
				this._ignoreFocus = false;
			}
		},
		_getBaseText: function(start, end) {
			var model = this._model;
			/* This is the only case the view access the base model, alternatively the view could use a event to application to customize the text */
			if (model.getBaseModel) {
				start = model.mapOffset(start);
				end = model.mapOffset(end);
				model = model.getBaseModel();
			}
			return model.getText(start, end);
		},
		_getBottomIndex: function (fullyVisible) {
			var child = this._bottomChild;
			if (fullyVisible && this._getClientHeight() > this._getLineHeight()) {
				var rect = child.getBoundingClientRect();
				var clientRect = this._clientDiv.getBoundingClientRect();
				if (rect.bottom > clientRect.bottom) {
					child = this._getLinePrevious(child) || child;
				}
			}
			return child.lineIndex;
		},
		_getBoundsAtOffset: function(offset) {
			var model = this._model;
			var line = this._getLine(model.getLineAtOffset(offset));
			var result = line.getBoundingClientRect(offset);
			var linePixel = this._getLinePixel(line.lineIndex);
			result.top += linePixel;
			result.bottom += linePixel;
			line.destroy();
			return result;
		},
		_getClientHeight: function() {
			var viewPad = this._getViewPadding();
			return Math.max(0, this._viewDiv.clientHeight - viewPad.top - viewPad.bottom);
		},
		_getClientWidth: function() {
			var viewPad = this._getViewPadding();
			return Math.max(0, this._viewDiv.clientWidth - viewPad.left - viewPad.right);
		},
		_getClipboardText: function (event, handler) {
			var delimiter = this._model.getLineDelimiter();
			var clipboadText, text;
			var window = this._getWindow();
			if (window.clipboardData) {
				//IE
				clipboadText = [];
				text = window.clipboardData.getData("Text"); //$NON-NLS-0$
				convertDelimiter(text, function(t) {clipboadText.push(t);}, function() {clipboadText.push(delimiter);});
				text = clipboadText.join("");
				if (handler) { handler(text); }
				return text;
			}
			if (util.isFirefox) {
				this._ignoreFocus = true;
				var clipboardDiv = this._clipboardDiv;
				clipboardDiv.innerHTML = "<pre contenteditable=''></pre>"; //$NON-NLS-0$
				clipboardDiv.firstChild.focus();
				var self = this;
				var _getText = function() {
					var noteText = self._getTextFromElement(clipboardDiv);
					clipboardDiv.innerHTML = "";
					clipboadText = [];
					convertDelimiter(noteText, function(t) {clipboadText.push(t);}, function() {clipboadText.push(delimiter);});
					return clipboadText.join("");
				};

				/* Try execCommand first. Works on firefox with clipboard permission. */
				var result = false;
				this._ignorePaste = true;

				/* Do not try execCommand if middle-click is used, because if we do, we get the clipboard text, not the primary selection text. */
				if (!util.isLinux || this._lastMouseButton !== 2) {
					try {
						var document = clipboardDiv.ownerDocument;
						result = document.execCommand("paste", false, null); //$NON-NLS-0$
					} catch (ex) {
						/* Firefox can throw even when execCommand() works, see bug 362835. */
						result = clipboardDiv.childNodes.length > 1 || clipboardDiv.firstChild && clipboardDiv.firstChild.childNodes.length > 0;
					}
				}
				this._ignorePaste = false;
				if (!result) {
					/* Try native paste in DOM, works for firefox during the paste event. */
					if (event) {
						window.setTimeout(function() {
							self.focus();
							text = _getText();
							if (text && handler) {
								handler(text);
							}
							self._ignoreFocus = false;
						}, 0);
						return null;
					} else {
						/* no event and no clipboard permission, paste can't be performed */
						this.focus();
						this._ignoreFocus = false;
						return "";
					}
				}
				this.focus();
				this._ignoreFocus = false;
				text = _getText();
				if (text && handler) {
					handler(text);
				}
				return text;
			}
			//webkit
			if (event && event.clipboardData) {
				/*
				* Webkit (Chrome/Safari) allows getData during the paste event
				* Note: setData is not allowed, not even during copy/cut event
				*/
				clipboadText = [];
				text = event.clipboardData.getData("text/plain"); //$NON-NLS-0$
				convertDelimiter(text, function(t) {clipboadText.push(t);}, function() {clipboadText.push(delimiter);});
				text = clipboadText.join("");
				if (text && handler) {
					handler(text);
				}
				return text;
			} else {
				//TODO try paste using extension (Chrome only)
			}
			return "";
		},
		_getDOMText: function(child, offsetNode) {
			var lineChild = child.firstChild;
			var text = "", offset = 0;
			while (lineChild) {
				var textNode;
				if (lineChild.ignoreChars) {
					textNode = lineChild.lastChild;
					var ignored = 0, childText = [], childOffset = -1;
					while (textNode) {
						var data = textNode.data;
						for (var i = data.length - 1; i >= 0; i--) {
							var ch = data.substring(i, i + 1);
							if (ignored < lineChild.ignoreChars && (ch === " " || ch === "\u200C" || ch === "\uFEFF")) { //$NON-NLS-2$ //$NON-NLS-1$ //$NON-NLS-0$
								ignored++;
							} else {
								childText.push(ch === "\u00A0" ? "\t" : ch); //$NON-NLS-1$ //$NON-NLS-0$
							}
						}
						if (offsetNode === textNode) {
							childOffset = childText.length;
						}
						textNode = textNode.previousSibling;
					}
					childText = childText.reverse().join("");
					if (childOffset !== -1) {
						offset = text.length + childText.length - childOffset;
					}
					text += childText;
				} else {
					textNode = lineChild.firstChild;
					while (textNode) {
						if (offsetNode === textNode) {
							offset = text.length;
						}
						text += textNode.data;
						textNode = textNode.nextSibling;
					}
				}
				lineChild = lineChild.nextSibling;
			}
			return {text: text, offset: offset};
		},
		_getTextFromElement: function(element) {
			var document = element.ownerDocument;
			var window = document.defaultView;
			if (!window.getSelection) {
				return element.innerText || element.textContent;
			}

			var newRange = document.createRange();
			newRange.selectNode(element);

			var selection = window.getSelection();
			var oldRanges = [], i;
			for (i = 0; i < selection.rangeCount; i++) {
				oldRanges.push(selection.getRangeAt(i));
			}

			this._ignoreSelect = true;
			selection.removeAllRanges();
			selection.addRange(newRange);

			var text = selection.toString();

			selection.removeAllRanges();
			for (i = 0; i < oldRanges.length; i++) {
				selection.addRange(oldRanges[i]);
			}

			this._ignoreSelect = false;
			return text;
		},
		_getViewPadding: function() {
			return this._metrics.viewPadding;
		},
		_getLine: function(lineIndex) {
			var child = this._getLineNode(lineIndex);
			if (child && !child.lineChanged && !child.lineRemoved) {
				return child._line;
			}
			return new TextLine(this, lineIndex);
		},
		_getLineHeight: function(lineIndex, calculate) {
			if (lineIndex !== undefined && this._lineHeight) {
				var lineHeight = this._lineHeight[lineIndex];
				if (lineHeight) { return lineHeight; }
				if (calculate || calculate === undefined) {
					var height = this._lineHeight[lineIndex] = this._calculateLineHeight(lineIndex);
					return height;
				}
			}
			return this._metrics.lineHeight;
		},
		_getLineNode: function (lineIndex) {
			var clientDiv = this._clientDiv;
			var child = clientDiv.firstChild;
			while (child) {
				if (lineIndex === child.lineIndex) {
					return child;
				}
				child = child.nextSibling;
			}
			return undefined;
		},
		_getLineNext: function (lineNode) {
			var node = lineNode ? lineNode.nextSibling : this._clientDiv.firstChild;
			while (node && node.lineIndex === -1) {
				node = node.nextSibling;
			}
			return node;
		},
		_getLinePrevious: function (lineNode) {
			var node = lineNode ? lineNode.previousSibling : this._clientDiv.lastChild;
			while (node && node.lineIndex === -1) {
				node = node.previousSibling;
			}
			return node;
		},
		_getLinePixel: function(lineIndex) {
			lineIndex = Math.min(Math.max(0, lineIndex), this._model.getLineCount());
			if (this._lineHeight) {
				var topIndex = this._getTopIndex();
				var pixel = -this._topIndexY + this._getScroll().y, i;
				if (lineIndex > topIndex) {
					for (i = topIndex; i < lineIndex; i++) {
						pixel += this._getLineHeight(i);
					}
				} else {
					for (i = topIndex - 1; i >= lineIndex; i--) {
						pixel -= this._getLineHeight(i);
					}
				}
				return pixel;
			}
			var lineHeight = this._getLineHeight();
			return lineHeight * lineIndex;
		},
		_getLineIndex: function(y) {
			var lineHeight, lineIndex = 0;
			var lineCount = this._model.getLineCount();
			if (this._lineHeight) {
				lineIndex = this._getTopIndex();
				var pixel = -this._topIndexY + this._getScroll().y;
				if (y !== pixel) {
					if (y < pixel) {
						while (y < pixel && lineIndex > 0) {
							y += this._getLineHeight(--lineIndex);
						}
					} else {
						lineHeight = this._getLineHeight(lineIndex);
						while (y - lineHeight >= pixel && lineIndex < lineCount - 1) {
							y -= lineHeight;
							lineHeight = this._getLineHeight(++lineIndex);
						}
					}
				}
			} else {
				lineHeight = this._getLineHeight();
				lineIndex = Math.floor(y / lineHeight);
			}
			return Math.max(0, Math.min(lineCount - 1, lineIndex));
		},
		_getScroll: function() {
			var viewDiv = this._viewDiv;
			return {x: viewDiv.scrollLeft, y: viewDiv.scrollTop};
		},
		_getSelection: function () {
			return this._selection.clone();
		},
		_getTopIndex: function (fullyVisible) {
			var child = this._topChild;
			if (fullyVisible && this._getClientHeight() > this._getLineHeight()) {
				var rect = child.getBoundingClientRect();
				var viewPad = this._getViewPadding();
				var viewRect = this._viewDiv.getBoundingClientRect();
				if (rect.top < viewRect.top + viewPad.top) {
					child = this._getLineNext(child) || child;
				}
			}
			return child.lineIndex;
		},
		_hookEvents: function() {
			var self = this;
			this._modelListener = {
				/** @private */
				onChanging: function(modelChangingEvent) {
					self._onModelChanging(modelChangingEvent);
				},
				/** @private */
				onChanged: function(modelChangedEvent) {
					self._onModelChanged(modelChangedEvent);
				}
			};
			this._model.addEventListener("preChanging", this._modelListener.onChanging); //$NON-NLS-0$
			this._model.addEventListener("postChanged", this._modelListener.onChanged); //$NON-NLS-0$

			var handlers = this._handlers = [];
			var clientDiv = this._clientDiv, viewDiv = this._viewDiv, rootDiv = this._rootDiv;
			var topNode = this._overlayDiv || clientDiv;
			var document = clientDiv.ownerDocument;
			var window = this._getWindow();
			var grabNode = util.isIE ? document : window;
			handlers.push({target: window, type: "resize", handler: function(e) { return self._handleResize(e ? e : window.event);}}); //$NON-NLS-0$
			handlers.push({target: clientDiv, type: "blur", handler: function(e) { return self._handleBlur(e ? e : window.event);}}); //$NON-NLS-0$
			handlers.push({target: clientDiv, type: "focus", handler: function(e) { return self._handleFocus(e ? e : window.event);}}); //$NON-NLS-0$
			handlers.push({target: viewDiv, type: "focus", handler: function(e) { clientDiv.focus(); }}); //$NON-NLS-0$
			handlers.push({target: viewDiv, type: "scroll", handler: function(e) { return self._handleScroll(e ? e : window.event);}}); //$NON-NLS-0$
			handlers.push({target: clientDiv, type: "textInput", handler: function(e) { return self._handleTextInput(e ? e : window.event); }}); //$NON-NLS-0$
			handlers.push({target: clientDiv, type: "keydown", handler: function(e) { return self._handleKeyDown(e ? e : window.event);}}); //$NON-NLS-0$
			handlers.push({target: clientDiv, type: "keypress", handler: function(e) { return self._handleKeyPress(e ? e : window.event);}}); //$NON-NLS-0$
			handlers.push({target: clientDiv, type: "keyup", handler: function(e) { return self._handleKeyUp(e ? e : window.event);}}); //$NON-NLS-0$
			handlers.push({target: clientDiv, type: "contextmenu", handler: function(e) { return self._handleContextMenu(e ? e : window.event);}}); //$NON-NLS-0$
			handlers.push({target: clientDiv, type: "copy", handler: function(e) { return self._handleCopy(e ? e : window.event);}}); //$NON-NLS-0$
			handlers.push({target: clientDiv, type: "cut", handler: function(e) { return self._handleCut(e ? e : window.event);}}); //$NON-NLS-0$
			handlers.push({target: clientDiv, type: "paste", handler: function(e) { return self._handlePaste(e ? e : window.event);}}); //$NON-NLS-0$
			if (util.isIOS || util.isAndroid) {
				handlers.push({target: document, type: "selectionchange", handler: function(e) { return self._handleSelectionChange(e ? e : window.event); }}); //$NON-NLS-0$
				handlers.push({target: clientDiv, type: "touchstart", handler: function(e) { return self._handleTouchStart(e ? e : window.event); }}); //$NON-NLS-0$
				handlers.push({target: clientDiv, type: "touchmove", handler: function(e) { return self._handleTouchMove(e ? e : window.event); }}); //$NON-NLS-0$
				handlers.push({target: clientDiv, type: "touchend", handler: function(e) { return self._handleTouchEnd(e ? e : window.event); }}); //$NON-NLS-0$
			} else {
				handlers.push({target: clientDiv, type: "selectstart", handler: function(e) { return self._handleSelectStart(e ? e : window.event);}}); //$NON-NLS-0$
				handlers.push({target: clientDiv, type: "mousedown", handler: function(e) { return self._handleMouseDown(e ? e : window.event);}}); //$NON-NLS-0$
				handlers.push({target: clientDiv, type: "mouseover", handler: function(e) { return self._handleMouseOver(e ? e : window.event);}}); //$NON-NLS-0$
				handlers.push({target: clientDiv, type: "mouseout", handler: function(e) { return self._handleMouseOut(e ? e : window.event);}}); //$NON-NLS-0$
				handlers.push({target: grabNode, type: "mouseup", handler: function(e) { return self._handleMouseUp(e ? e : window.event);}}); //$NON-NLS-0$
				handlers.push({target: grabNode, type: "mousemove", handler: function(e) { return self._handleMouseMove(e ? e : window.event);}}); //$NON-NLS-0$
				handlers.push({target: rootDiv, type: "mousedown", handler: function(e) { return self._handleRootMouseDown(e ? e : window.event);}}); //$NON-NLS-0$
				handlers.push({target: rootDiv, type: "mouseup", handler: function(e) { return self._handleRootMouseUp(e ? e : window.event);}}); //$NON-NLS-0$
				handlers.push({target: topNode, type: "dragstart", handler: function(e) { return self._handleDragStart(e ? e : window.event);}}); //$NON-NLS-0$
				handlers.push({target: topNode, type: "drag", handler: function(e) { return self._handleDrag(e ? e : window.event);}}); //$NON-NLS-0$
				handlers.push({target: topNode, type: "dragend", handler: function(e) { return self._handleDragEnd(e ? e : window.event);}}); //$NON-NLS-0$
				handlers.push({target: topNode, type: "dragenter", handler: function(e) { return self._handleDragEnter(e ? e : window.event);}}); //$NON-NLS-0$
				handlers.push({target: topNode, type: "dragover", handler: function(e) { return self._handleDragOver(e ? e : window.event);}}); //$NON-NLS-0$
				handlers.push({target: topNode, type: "dragleave", handler: function(e) { return self._handleDragLeave(e ? e : window.event);}}); //$NON-NLS-0$
				handlers.push({target: topNode, type: "drop", handler: function(e) { return self._handleDrop(e ? e : window.event);}}); //$NON-NLS-0$
				handlers.push({target: this._clientDiv, type: util.isFirefox ? "DOMMouseScroll" : "mousewheel", handler: function(e) { return self._handleMouseWheel(e ? e : window.event); }}); //$NON-NLS-1$ //$NON-NLS-0$
				if (util.isFirefox && (!util.isWindows || util.isFirefox >= 15)) {
					var MutationObserver = window.MutationObserver || window.MozMutationObserver;
					if (MutationObserver) {
						this._mutationObserver = new MutationObserver(function(mutations) { self._handleDataModified(mutations); });
						this._mutationObserver.observe(clientDiv, {subtree: true, characterData: true});
					} else {
						handlers.push({target: this._clientDiv, type: "DOMCharacterDataModified", handler: function (e) { return self._handleDataModified(e ? e : window.event); }}); //$NON-NLS-0$
					}
				}
				if (this._overlayDiv) {
					handlers.push({target: this._overlayDiv, type: "mousedown", handler: function(e) { return self._handleMouseDown(e ? e : window.event);}}); //$NON-NLS-0$
					handlers.push({target: this._overlayDiv, type: "mouseover", handler: function(e) { return self._handleMouseOver(e ? e : window.event);}}); //$NON-NLS-0$
					handlers.push({target: this._overlayDiv, type: "mouseout", handler: function(e) { return self._handleMouseOut(e ? e : window.event);}}); //$NON-NLS-0$
					handlers.push({target: this._overlayDiv, type: "contextmenu", handler: function(e) { return self._handleContextMenu(e ? e : window.event); }}); //$NON-NLS-0$
				}
				if (!this._isW3CEvents) {
					handlers.push({target: this._clientDiv, type: "dblclick", handler: function(e) { return self._handleDblclick(e ? e : window.event); }}); //$NON-NLS-0$
				}
			}

			var leftDiv = this._leftDiv, rightDiv = this._rightDiv;
			if (util.isIE) {
				handlers.push({target: leftDiv, type: "selectstart", handler: function() {return false;}}); //$NON-NLS-0$
			}
			handlers.push({target: leftDiv, type: util.isFirefox ? "DOMMouseScroll" : "mousewheel", handler: function(e) { return self._handleMouseWheel(e ? e : window.event); }}); //$NON-NLS-1$ //$NON-NLS-0$
			handlers.push({target: leftDiv, type: "click", handler: function(e) { self._handleRulerEvent(e ? e : window.event); }}); //$NON-NLS-0$
			handlers.push({target: leftDiv, type: "dblclick", handler: function(e) { self._handleRulerEvent(e ? e : window.event); }}); //$NON-NLS-0$
			handlers.push({target: leftDiv, type: "mousemove", handler: function(e) { self._handleRulerEvent(e ? e : window.event); }}); //$NON-NLS-0$
			handlers.push({target: leftDiv, type: "mouseover", handler: function(e) { self._handleRulerEvent(e ? e : window.event); }}); //$NON-NLS-0$
			handlers.push({target: leftDiv, type: "mouseout", handler: function(e) { self._handleRulerEvent(e ? e : window.event); }}); //$NON-NLS-0$
			if (util.isIE) {
				handlers.push({target: rightDiv, type: "selectstart", handler: function() {return false;}}); //$NON-NLS-0$
			}
			handlers.push({target: rightDiv, type: util.isFirefox ? "DOMMouseScroll" : "mousewheel", handler: function(e) { return self._handleMouseWheel(e ? e : window.event); }}); //$NON-NLS-1$ //$NON-NLS-0$
			handlers.push({target: rightDiv, type: "click", handler: function(e) { self._handleRulerEvent(e ? e : window.event); }}); //$NON-NLS-0$
			handlers.push({target: rightDiv, type: "dblclick", handler: function(e) { self._handleRulerEvent(e ? e : window.event); }}); //$NON-NLS-0$
			handlers.push({target: rightDiv, type: "mousemove", handler: function(e) { self._handleRulerEvent(e ? e : window.event); }}); //$NON-NLS-0$
			handlers.push({target: rightDiv, type: "mouseover", handler: function(e) { self._handleRulerEvent(e ? e : window.event); }}); //$NON-NLS-0$
			handlers.push({target: rightDiv, type: "mouseout", handler: function(e) { self._handleRulerEvent(e ? e : window.event); }}); //$NON-NLS-0$

			for (var i=0; i<handlers.length; i++) {
				var h = handlers[i];
				addHandler(h.target, h.type, h.handler, h.capture);
			}
		},
		_getWindow: function() {
			return getWindow(this._parent.ownerDocument);
		},
		_init: function(options) {
			var parent = options.parent;
			if (typeof(parent) === "string") { //$NON-NLS-0$
				parent = (options.document || document).getElementById(parent);
			}
			if (!parent) { throw "no parent"; } //$NON-NLS-0$
			options.parent = parent;
			options.model = options.model || new mTextModel.TextModel();
			var defaultOptions = this._defaultOptions();
			for (var option in defaultOptions) {
				if (defaultOptions.hasOwnProperty(option)) {
					var value;
					if (options[option] !== undefined) {
						value = options[option];
					} else {
						value = defaultOptions[option].value;
					}
					this["_" + option] = value; //$NON-NLS-0$
				}
			}
			this._rulers = [];
			this._selection = new Selection (0, 0, false);
			this._linksVisible = false;
			this._redrawCount = 0;
			this._maxLineWidth = 0;
			this._maxLineIndex = -1;
			this._ignoreSelect = true;
			this._ignoreFocus = false;
			this._hasFocus = false;
			this._columnX = -1;
			this._dragOffset = -1;
			this._isRangeRects = (!util.isIE || util.isIE >= 9) && typeof parent.ownerDocument.createRange().getBoundingClientRect === "function"; //$NON-NLS-0$
			this._isW3CEvents = parent.addEventListener;

			/* Auto scroll */
			this._autoScrollX = null;
			this._autoScrollY = null;
			this._autoScrollTimerID = null;
			this._AUTO_SCROLL_RATE = 50;
			this._grabControl = null;
			this._moseMoveClosure  = null;
			this._mouseUpClosure = null;

			/* Double click */
			this._lastMouseX = 0;
			this._lastMouseY = 0;
			this._lastMouseTime = 0;
			this._clickCount = 0;
			this._clickTime = 250;
			this._clickDist = 5;
			this._isMouseDown = false;
			this._doubleClickSelection = null;

			/* Scroll */
			this._hScroll = 0;
			this._vScroll = 0;

			/* IME */
			this._imeOffset = -1;

			/* Create elements */
			this._createActions();
			this._createView();
		},
		_modifyContent: function(e, updateCaret) {
			if (this._readonly && !e._code) {
				return;
			}
			e.type = "Verify"; //$NON-NLS-0$
			this.onVerify(e);

			if (e.text === null || e.text === undefined) { return; }

			var model = this._model;
			try {
				if (e._ignoreDOMSelection) { this._ignoreDOMSelection = true; }
				model.setText (e.text, e.start, e.end);
			} finally {
				if (e._ignoreDOMSelection) { this._ignoreDOMSelection = false; }
			}

			if (updateCaret) {
				var selection = this._getSelection ();
				selection.setCaret(e.start + e.text.length);
				this._setSelection(selection, true);
			}
			this.onModify({type: "Modify"}); //$NON-NLS-0$
		},
		_onModelChanged: function(modelChangedEvent) {
			modelChangedEvent.type = "ModelChanged"; //$NON-NLS-0$
			this.onModelChanged(modelChangedEvent);
			modelChangedEvent.type = "Changed"; //$NON-NLS-0$
			var start = modelChangedEvent.start;
			var addedCharCount = modelChangedEvent.addedCharCount;
			var removedCharCount = modelChangedEvent.removedCharCount;
			var addedLineCount = modelChangedEvent.addedLineCount;
			var removedLineCount = modelChangedEvent.removedLineCount;
			var selection = this._getSelection();
			if (selection.end > start) {
				if (selection.end > start && selection.start < start + removedCharCount) {
					// selection intersects replaced text. set caret behind text change
					selection.setCaret(start + addedCharCount);
				} else {
					// move selection to keep same text selected
					selection.start +=  addedCharCount - removedCharCount;
					selection.end +=  addedCharCount - removedCharCount;
				}
				this._setSelection(selection, false, false);
			}

			var model = this._model;
			var startLine = model.getLineAtOffset(start);
			var child = this._getLineNext();
			while (child) {
				var lineIndex = child.lineIndex;
				if (startLine <= lineIndex && lineIndex <= startLine + removedLineCount) {
					if (startLine === lineIndex && !child.modelChangedEvent && !child.lineRemoved) {
						child.modelChangedEvent = modelChangedEvent;
						child.lineChanged = true;
					} else {
						child.lineRemoved = true;
						child.lineChanged = false;
						child.modelChangedEvent = null;
					}
				}
				if (lineIndex > startLine + removedLineCount) {
					child.lineIndex = lineIndex + addedLineCount - removedLineCount;
					child._line.lineIndex = child.lineIndex;
				}
				child = this._getLineNext(child);
			}
			if (!this._wrapMode) {
				if (startLine <= this._maxLineIndex && this._maxLineIndex <= startLine + removedLineCount) {
					this._checkMaxLineIndex = this._maxLineIndex;
					this._maxLineIndex = -1;
					this._maxLineWidth = 0;
				}
			}
			this._update();
		},
		_onModelChanging: function(modelChangingEvent) {
			modelChangingEvent.type = "ModelChanging"; //$NON-NLS-0$
			this.onModelChanging(modelChangingEvent);
			modelChangingEvent.type = "Changing"; //$NON-NLS-0$
		},
		_queueUpdate: function() {
			if (this._updateTimer || this._ignoreQueueUpdate) { return; }
			var self = this;
			var window = this._getWindow();
			this._updateTimer = window.setTimeout(function() {
				self._updateTimer = null;
				self._update();
			}, 0);
		},
		_resetLineHeight: function(startLine, endLine) {
			if (this._wrapMode) {
				if (startLine !== undefined && endLine !== undefined) {
					for (var i = startLine; i < endLine; i++) {
						this._lineHeight[i] = undefined;
					}
				} else {
					this._lineHeight = new Array(this._model.getLineCount());
				}
				this._calculateLineHeightTimer();
			} else {
				this._lineHeight = null;
			}
		},
		_resetLineWidth: function() {
			var clientDiv = this._clientDiv;
			if (clientDiv) {
				var child = clientDiv.firstChild;
				while (child) {
					child.lineWidth = undefined;
					child = child.nextSibling;
				}
			}
		},
		_reset: function() {
			this._maxLineIndex = -1;
			this._maxLineWidth = 0;
			this._columnX = -1;
			this._topChild = null;
			this._bottomChild = null;
			this._topIndexY = 0;
			this._resetLineHeight();
			this._setSelection(new Selection (0, 0, false), false, false);
			if (this._viewDiv) {
				this._viewDiv.scrollLeft = 0;
				this._viewDiv.scrollTop = 0;
			}
			var clientDiv = this._clientDiv;
			if (clientDiv) {
				var child = clientDiv.firstChild;
				while (child) {
					child.lineRemoved = true;
					child = child.nextSibling;
				}
				/*
				* Bug in Firefox.  For some reason, the caret does not show after the
				* view is refreshed.  The fix is to toggle the contentEditable state and
				* force the clientDiv to loose and receive focus if it is focused.
				*/
				if (util.isFirefox) {
					this._ignoreFocus = false;
					var hasFocus = this._hasFocus;
					if (hasFocus) { clientDiv.blur(); }
					clientDiv.contentEditable = false;
					clientDiv.contentEditable = true;
					if (hasFocus) { clientDiv.focus(); }
					this._ignoreFocus = false;
				}
			}
		},
		_scrollView: function (pixelX, pixelY) {
			/*
			* Always set _ensureCaretVisible to false so that the view does not scroll
			* to show the caret when scrollView is not called from showCaret().
			*/
			this._ensureCaretVisible = false;

			/*
			* Scrolling is done only by setting the scrollLeft and scrollTop fields in the
			* view div. This causes an update from the scroll event. In some browsers
			* this event is asynchronous and forcing update page to run synchronously
			* leads to redraw problems.
			* On Chrome 11, the view redrawing at times when holding PageDown/PageUp key.
			* On Firefox 4 for Linux, the view redraws the first page when holding
			* PageDown/PageUp key, but it will not redraw again until the key is released.
			*/
			var viewDiv = this._viewDiv;
			if (pixelX) { viewDiv.scrollLeft += pixelX; }
			if (pixelY) { viewDiv.scrollTop += pixelY; }
		},
		_setClipboardText: function (text, event) {
			var clipboardText;
			var document = this._parent.ownerDocument;
			var window = this._getWindow();
			if (window.clipboardData) {
				//IE
				clipboardText = [];
				convertDelimiter(text, function(t) {clipboardText.push(t);}, function() {clipboardText.push(util.platformDelimiter);});
				return window.clipboardData.setData("Text", clipboardText.join("")); //$NON-NLS-0$
			}
			if (event && event.clipboardData) {
				//webkit
				clipboardText = [];
				convertDelimiter(text, function(t) {clipboardText.push(t);}, function() {clipboardText.push(util.platformDelimiter);});
				if (event.clipboardData.setData("text/plain", clipboardText.join(""))) { //$NON-NLS-0$
					return true;
				}
			}
			var child = util.createElement(document, "pre"); //$NON-NLS-0$
			child.style.position = "fixed"; //$NON-NLS-0$
			child.style.left = "-1000px"; //$NON-NLS-0$
			convertDelimiter(text,
				function(t) {
					child.appendChild(document.createTextNode(t));
				},
				function() {
					child.appendChild(util.createElement(document, "br")); //$NON-NLS-0$
				}
			);
			child.appendChild(document.createTextNode(" ")); //$NON-NLS-0$
			this._clientDiv.appendChild(child);
			var range = document.createRange();
			range.setStart(child.firstChild, 0);
			range.setEndBefore(child.lastChild);
			var sel = window.getSelection();
			if (sel.rangeCount > 0) { sel.removeAllRanges(); }
			sel.addRange(range);
			var self = this;
			/** @ignore */
			var cleanup = function() {
				if (child && child.parentNode === self._clientDiv) {
					self._clientDiv.removeChild(child);
				}
				self._updateDOMSelection();
			};
			var result = false;
			/*
			* Try execCommand first, it works on firefox with clipboard permission,
			* chrome 5, safari 4.
			*/
			this._ignoreCopy = true;
			try {
				result = document.execCommand("copy", false, null); //$NON-NLS-0$
			} catch (e) {}
			this._ignoreCopy = false;
			if (!result) {
				if (event) {
					window.setTimeout(cleanup, 0);
					return false;
				}
			}
			/* no event and no permission, copy can not be done */
			cleanup();
			return true;
		},
		_setDOMSelection: function (startNode, startOffset, endNode, endOffset) {
			var startLineNode, startLineOffset, endLineNode, endLineOffset;
			var offset = 0;
			var lineChild = startNode.firstChild;
			var node, nodeLength, model = this._model;
			var startLineEnd = model.getLine(startNode.lineIndex).length;
			while (lineChild) {
				node = lineChild.firstChild;
				nodeLength = node.length;
				if (lineChild.ignoreChars) {
					nodeLength -= lineChild.ignoreChars;
				}
				if (offset + nodeLength > startOffset || offset + nodeLength >= startLineEnd) {
					startLineNode = node;
					startLineOffset = startOffset - offset;
					if (lineChild.ignoreChars && nodeLength > 0 && startLineOffset === nodeLength) {
						startLineOffset += lineChild.ignoreChars;
					}
					break;
				}
				offset += nodeLength;
				lineChild = lineChild.nextSibling;
			}
			offset = 0;
			lineChild = endNode.firstChild;
			var endLineEnd = this._model.getLine(endNode.lineIndex).length;
			while (lineChild) {
				node = lineChild.firstChild;
				nodeLength = node.length;
				if (lineChild.ignoreChars) {
					nodeLength -= lineChild.ignoreChars;
				}
				if (nodeLength + offset > endOffset || offset + nodeLength >= endLineEnd) {
					endLineNode = node;
					endLineOffset = endOffset - offset;
					if (lineChild.ignoreChars && nodeLength > 0 && endLineOffset === nodeLength) {
						endLineOffset += lineChild.ignoreChars;
					}
					break;
				}
				offset += nodeLength;
				lineChild = lineChild.nextSibling;
			}

			this._setDOMFullSelection(startNode, startOffset, startLineEnd, endNode, endOffset, endLineEnd);

			if (!this._hasFocus) { return; }
			var range;
			var window = this._getWindow();
			var document = this._parent.ownerDocument;
			if (window.getSelection) {
				//W3C
				var sel = window.getSelection();
				if ((sel.anchorNode === startLineNode && sel.anchorOffset === startLineOffset &&
					sel.focusNode === endLineNode && sel.focusOffset === endLineOffset) ||
					(sel.anchorNode === endLineNode && sel.anchorOffset === endLineOffset &&
					sel.focusNode === startLineNode && sel.focusOffset === startLineOffset)) { return; }

				range = document.createRange();
				range.setStart(startLineNode, startLineOffset);
				range.setEnd(endLineNode, endLineOffset);
				this._ignoreSelect = false;
				if (sel.rangeCount > 0) { sel.removeAllRanges(); }
				sel.addRange(range);
				this._ignoreSelect = true;
			} else if (document.selection) {
				//IE < 9
				var body = document.body;

				/*
				* Bug in IE. For some reason when text is deselected the overflow
				* selection at the end of some lines does not get redrawn.  The
				* fix is to create a DOM element in the body to force a redraw.
				*/
				var child = util.createElement(document, "div"); //$NON-NLS-0$
				body.appendChild(child);
				body.removeChild(child);

				range = body.createTextRange();
				range.moveToElementText(startLineNode.parentNode);
				range.moveStart("character", startLineOffset); //$NON-NLS-0$
				var endRange = body.createTextRange();
				endRange.moveToElementText(endLineNode.parentNode);
				endRange.moveStart("character", endLineOffset); //$NON-NLS-0$
				range.setEndPoint("EndToStart", endRange); //$NON-NLS-0$
				this._ignoreSelect = false;
				range.select();
				this._ignoreSelect = true;
			}
		},
		_setDOMFullSelection: function(startNode, startOffset, startLineEnd, endNode, endOffset, endLineEnd) {
			if (!this._selDiv1) { return; }
			var selDiv = this._selDiv1;
			selDiv.style.width = "0px"; //$NON-NLS-0$
			selDiv.style.height = "0px"; //$NON-NLS-0$
			selDiv = this._selDiv2;
			selDiv.style.width = "0px"; //$NON-NLS-0$
			selDiv.style.height = "0px"; //$NON-NLS-0$
			selDiv = this._selDiv3;
			selDiv.style.width = "0px"; //$NON-NLS-0$
			selDiv.style.height = "0px"; //$NON-NLS-0$
			if (startNode === endNode && startOffset === endOffset) { return; }
			var model = this._model;
			var viewPad = this._getViewPadding();
			var clientRect = this._clientDiv.getBoundingClientRect();
			var viewRect = this._viewDiv.getBoundingClientRect();
			var left = viewRect.left + viewPad.left;
			var right = clientRect.right;
			var top = viewRect.top + viewPad.top;
			var bottom = clientRect.bottom;
			var hd = 0, vd = 0;
			if (this._clipDiv) {
				var clipRect = this._clipDiv.getBoundingClientRect();
				hd = clipRect.left - this._clipDiv.scrollLeft;
				vd = clipRect.top;
			} else {
				var rootpRect = this._rootDiv.getBoundingClientRect();
				hd = rootpRect.left;
				vd = rootpRect.top;
			}
			this._ignoreDOMSelection = true;
			var startLine = new TextLine(this, startNode.lineIndex, startNode);
			var startRect = startLine.getBoundingClientRect(model.getLineStart(startNode.lineIndex) + startOffset, false);
			var l = startRect.left;
			var endLine = new TextLine(this, endNode.lineIndex, endNode);
			var endRect = endLine.getBoundingClientRect(model.getLineStart(endNode.lineIndex) + endOffset, false);
			var r = endRect.left;
			this._ignoreDOMSelection = false;
			var sel1Div = this._selDiv1;
			var sel1Left = Math.min(right, Math.max(left, l));
			var sel1Top = Math.min(bottom, Math.max(top, startRect.top));
			var sel1Right = right;
			var sel1Bottom = Math.min(bottom, Math.max(top, startRect.bottom));
			sel1Div.style.left = (sel1Left - hd) + "px"; //$NON-NLS-0$
			sel1Div.style.top = (sel1Top - vd) + "px"; //$NON-NLS-0$
			sel1Div.style.width = Math.max(0, sel1Right - sel1Left) + "px"; //$NON-NLS-0$
			sel1Div.style.height = Math.max(0, sel1Bottom - sel1Top) + "px"; //$NON-NLS-0$
			if (startRect.top === endRect.top) {
				sel1Right = Math.min(r, right);
				sel1Div.style.width = Math.max(0, sel1Right - sel1Left) + "px"; //$NON-NLS-0$
			} else {
				var sel3Left = left;
				var sel3Top = Math.min(bottom, Math.max(top, endRect.top));
				var sel3Right = Math.min(right, Math.max(left, r));
				var sel3Bottom = Math.min(bottom, Math.max(top, endRect.bottom));
				var sel3Div = this._selDiv3;
				sel3Div.style.left = (sel3Left - hd) + "px"; //$NON-NLS-0$
				sel3Div.style.top = (sel3Top - vd) + "px"; //$NON-NLS-0$
				sel3Div.style.width = Math.max(0, sel3Right - sel3Left) + "px"; //$NON-NLS-0$
				sel3Div.style.height = Math.max(0, sel3Bottom - sel3Top) + "px"; //$NON-NLS-0$
				if (sel3Top - sel1Bottom > 0) {
					var sel2Div = this._selDiv2;
					sel2Div.style.left = (left - hd)  + "px"; //$NON-NLS-0$
					sel2Div.style.top = (sel1Bottom - vd) + "px"; //$NON-NLS-0$
					sel2Div.style.width = Math.max(0, right - left) + "px"; //$NON-NLS-0$
					sel2Div.style.height = Math.max(0, sel3Top - sel1Bottom) + "px"; //$NON-NLS-0$
				}
			}
		},
		_setGrab: function (target) {
			if (target === this._grabControl) { return; }
			if (target) {
				if (target.setCapture) { target.setCapture(); }
				this._grabControl = target;
			} else {
				if (this._grabControl.releaseCapture) { this._grabControl.releaseCapture(); }
				this._grabControl = null;
			}
		},
		_setLinksVisible: function(visible) {
			if (this._linksVisible === visible) { return; }
			this._linksVisible = visible;
			/*
			* Feature in IE.  The client div looses focus and does not regain it back
			* when the content editable flag is reset. The fix is to remember that it
			* had focus when the flag is cleared and give focus back to the div when
			* the flag is set.
			*/
			if (util.isIE && visible) {
				this._hadFocus = this._hasFocus;
			}
			var clientDiv = this._clientDiv;
			clientDiv.contentEditable = !visible;
			if (this._hadFocus && !visible) {
				clientDiv.focus();
			}
			if (this._overlayDiv) {
				this._overlayDiv.style.zIndex = visible ? "-1" : "1"; //$NON-NLS-1$ //$NON-NLS-0$
			}
			var line = this._getLineNext();
			while (line) {
				if (line.hasLink) {
					var lineChild = line.firstChild;
					while (lineChild) {
						var next = lineChild.nextSibling;
						var style = lineChild.viewStyle;
						if (style && style.tagName === "A") { //$NON-NLS-0$
							line.replaceChild(line._line._createSpan(line, lineChild.firstChild.data, style), lineChild);
						}
						lineChild = next;
					}
				}
				line = this._getLineNext(line);
			}
		},
		_setSelection: function (selection, scroll, update, pageScroll) {
			if (selection) {
				this._columnX = -1;
				if (update === undefined) { update = true; }
				var oldSelection = this._selection;
				this._selection = selection;

				/*
				* Always showCaret(), even when the selection is not changing, to ensure the
				* caret is visible. Note that some views do not scroll to show the caret during
				* keyboard navigation when the selection does not chanage. For example, line down
				* when the caret is already at the last line.
				*/
				if (scroll) { /*update = !*/this._showCaret(false, pageScroll); }

				/*
				* Sometimes the browser changes the selection
				* as result of method calls or "leaked" events.
				* The fix is to set the visual selection even
				* when the logical selection is not changed.
				*/
				if (update) { this._updateDOMSelection(); }

				if (!oldSelection.equals(selection)) {
					var e = {
						type: "Selection", //$NON-NLS-0$
						oldValue: {start:oldSelection.start, end:oldSelection.end},
						newValue: {start:selection.start, end:selection.end}
					};
					this.onSelection(e);
				}
			}
		},
		_setSelectionTo: function (x, y, extent, drag) {
			var model = this._model, offset;
			var selection = this._getSelection();
			var pt = this.convert({x: x, y: y}, "page", "document"); //$NON-NLS-1$ //$NON-NLS-0$
			var lineIndex = this._getLineIndex(pt.y), line;
			if (this._clickCount === 1) {
				line = this._getLine(lineIndex);
				offset = line.getOffset(pt.x, pt.y - this._getLinePixel(lineIndex));
				line.destroy();
				if (drag && !extent) {
					if (selection.start <= offset && offset < selection.end) {
						this._dragOffset = offset;
						return false;
					}
				}
				selection.extend(offset);
				if (!extent) { selection.collapse(); }
			} else {
				var word = (this._clickCount & 1) === 0;
				var start, end;
				if (word) {
					line = this._getLine(lineIndex);
					offset = line.getOffset(pt.x, pt.y - this._getLinePixel(lineIndex));
					if (this._doubleClickSelection) {
						if (offset >= this._doubleClickSelection.start) {
							start = this._doubleClickSelection.start;
							end = line.getNextOffset(offset, "wordend", +1); //$NON-NLS-0$
						} else {
							start = line.getNextOffset(offset, "word", -1); //$NON-NLS-0$
							end = this._doubleClickSelection.end;
						}
					} else {
						start = line.getNextOffset(offset, "word", -1); //$NON-NLS-0$
						end = line.getNextOffset(start, "wordend", +1); //$NON-NLS-0$
					}
					line.destroy();
				} else {
					if (this._doubleClickSelection) {
						var doubleClickLine = model.getLineAtOffset(this._doubleClickSelection.start);
						if (lineIndex >= doubleClickLine) {
							start = model.getLineStart(doubleClickLine);
							end = model.getLineEnd(lineIndex);
						} else {
							start = model.getLineStart(lineIndex);
							end = model.getLineEnd(doubleClickLine);
						}
					} else {
						start = model.getLineStart(lineIndex);
						end = model.getLineEnd(lineIndex);
					}
				}
				selection.setCaret(start);
				selection.extend(end);
			}
			this._setSelection(selection, true, true);
			return true;
		},
		_setFullSelection: function(fullSelection, init) {
			this._fullSelection = fullSelection;
			if (util.isWebkit) {
				this._fullSelection = true;
			}
			var parent = this._clipDiv || this._rootDiv;
			if (!parent) {
				return;
			}
			if (!this._fullSelection) {
				if (this._selDiv1) {
					parent.removeChild(this._selDiv1);
					this._selDiv1 = null;
				}
				if (this._selDiv2) {
					parent.removeChild(this._selDiv2);
					this._selDiv2 = null;
				}
				if (this._selDiv3) {
					parent.removeChild(this._selDiv3);
					this._selDiv3 = null;
				}
				return;
			}

			if (!this._selDiv1 && (this._fullSelection && !util.isIOS)) {
				var document = parent.ownerDocument;
				this._highlightRGB = util.isWebkit ? "transparent" : "Highlight"; //$NON-NLS-1$ //$NON-NLS-0$
				var selDiv1 = util.createElement(document, "div"); //$NON-NLS-0$
				this._selDiv1 = selDiv1;
				selDiv1.style.position = "absolute"; //$NON-NLS-0$
				selDiv1.style.borderWidth = "0px"; //$NON-NLS-0$
				selDiv1.style.margin = "0px"; //$NON-NLS-0$
				selDiv1.style.padding = "0px"; //$NON-NLS-0$
				selDiv1.style.outline = "none"; //$NON-NLS-0$
				selDiv1.style.background = this._highlightRGB;
				selDiv1.style.width = "0px"; //$NON-NLS-0$
				selDiv1.style.height = "0px"; //$NON-NLS-0$
				selDiv1.style.zIndex = "0"; //$NON-NLS-0$
				parent.appendChild(selDiv1);
				var selDiv2 = util.createElement(document, "div"); //$NON-NLS-0$
				this._selDiv2 = selDiv2;
				selDiv2.style.position = "absolute"; //$NON-NLS-0$
				selDiv2.style.borderWidth = "0px"; //$NON-NLS-0$
				selDiv2.style.margin = "0px"; //$NON-NLS-0$
				selDiv2.style.padding = "0px"; //$NON-NLS-0$
				selDiv2.style.outline = "none"; //$NON-NLS-0$
				selDiv2.style.background = this._highlightRGB;
				selDiv2.style.width = "0px"; //$NON-NLS-0$
				selDiv2.style.height = "0px"; //$NON-NLS-0$
				selDiv2.style.zIndex = "0"; //$NON-NLS-0$
				parent.appendChild(selDiv2);
				var selDiv3 = util.createElement(document, "div"); //$NON-NLS-0$
				this._selDiv3 = selDiv3;
				selDiv3.style.position = "absolute"; //$NON-NLS-0$
				selDiv3.style.borderWidth = "0px"; //$NON-NLS-0$
				selDiv3.style.margin = "0px"; //$NON-NLS-0$
				selDiv3.style.padding = "0px"; //$NON-NLS-0$
				selDiv3.style.outline = "none"; //$NON-NLS-0$
				selDiv3.style.background = this._highlightRGB;
				selDiv3.style.width = "0px"; //$NON-NLS-0$
				selDiv3.style.height = "0px"; //$NON-NLS-0$
				selDiv3.style.zIndex = "0"; //$NON-NLS-0$
				parent.appendChild(selDiv3);

				/*
				* Bug in Firefox. The Highlight color is mapped to list selection
				* background instead of the text selection background.  The fix
				* is to map known colors using a table or fallback to light blue.
				*/
				if (util.isFirefox && util.isMac) {
					var window = this._getWindow();
					var style = window.getComputedStyle(selDiv3, null);
					var rgb = style.getPropertyValue("background-color"); //$NON-NLS-0$
					switch (rgb) {
						case "rgb(119, 141, 168)": rgb = "rgb(199, 208, 218)"; break; //$NON-NLS-1$ //$NON-NLS-0$
						case "rgb(127, 127, 127)": rgb = "rgb(198, 198, 198)"; break; //$NON-NLS-1$ //$NON-NLS-0$
						case "rgb(255, 193, 31)": rgb = "rgb(250, 236, 115)"; break; //$NON-NLS-1$ //$NON-NLS-0$
						case "rgb(243, 70, 72)": rgb = "rgb(255, 176, 139)"; break; //$NON-NLS-1$ //$NON-NLS-0$
						case "rgb(255, 138, 34)": rgb = "rgb(255, 209, 129)"; break; //$NON-NLS-1$ //$NON-NLS-0$
						case "rgb(102, 197, 71)": rgb = "rgb(194, 249, 144)"; break; //$NON-NLS-1$ //$NON-NLS-0$
						case "rgb(140, 78, 184)": rgb = "rgb(232, 184, 255)"; break; //$NON-NLS-1$ //$NON-NLS-0$
						default: rgb = "rgb(180, 213, 255)"; break; //$NON-NLS-0$
					}
					this._highlightRGB = rgb;
					selDiv1.style.background = rgb;
					selDiv2.style.background = rgb;
					selDiv3.style.background = rgb;
				}
				if (!init) {
					this._updateDOMSelection();
				}
			}
		},
		_setReadOnly: function (readOnly) {
			this._readonly = readOnly;
			this._clientDiv.setAttribute("aria-readonly", readOnly ? "true" : "false"); //$NON-NLS-2$ //$NON-NLS-1$ //$NON-NLS-0$
		},
		_setTabSize: function (tabSize, init) {
			this._tabSize = tabSize;
			this._customTabSize = undefined;
			var clientDiv = this._clientDiv;
			if (util.isOpera) {
				if (clientDiv) { clientDiv.style.OTabSize = this._tabSize+""; }
			} else if (util.isWebkit >= 537.1) {
				if (clientDiv) { clientDiv.style.tabSize = this._tabSize+""; }
			} else if (util.isFirefox >= 4) {
				if (clientDiv) {  clientDiv.style.MozTabSize = this._tabSize+""; }
			} else if (this._tabSize !== 8) {
				this._customTabSize = this._tabSize;
			}
			if (!init) {
				this.redrawLines();
				this._resetLineWidth();
			}
		},
		_setThemeClass: function (themeClass, init) {
			this._themeClass = themeClass;
			var viewContainerClass = "textviewContainer"; //$NON-NLS-0$
			if (this._themeClass) { viewContainerClass += " " + this._themeClass; } //$NON-NLS-0$
			this._rootDiv.className = viewContainerClass;
			// SCRIPTED - adding id so we can alter styles on it - probably not the right way to do this! TODO - bad!
			this._rootDiv.id="textviewContainerId";
			this._updateStyle(init);
		},
		_setWrapMode: function (wrapMode, init) {
			this._wrapMode = wrapMode;
			var clientDiv = this._clientDiv, viewDiv = this._viewDiv;
			if (wrapMode) {
				clientDiv.style.whiteSpace = "pre-wrap"; //$NON-NLS-0$
				clientDiv.style.wordWrap = "break-word"; //$NON-NLS-0$
				viewDiv.style.overflowX = "hidden"; //$NON-NLS-0$
				viewDiv.style.overflowY = "scroll"; //$NON-NLS-0$
			} else {
				clientDiv.style.whiteSpace = "pre"; //$NON-NLS-0$
				clientDiv.style.wordWrap = "normal"; //$NON-NLS-0$
				viewDiv.style.overflowX = "auto"; //$NON-NLS-0$
				viewDiv.style.overflowY = "auto"; //$NON-NLS-0$
			}
			if (!init) {
				this.redraw();
				this._resetLineWidth();
			}
			this._resetLineHeight();
		},
		_showCaret: function (allSelection, pageScroll) {
			if (!this._clientDiv) { return; }
			var model = this._model;
			var selection = this._getSelection();
			var scroll = this._getScroll();
			var caret = selection.getCaret();
			var start = selection.start;
			var end = selection.end;
			var endLine = model.getLineAtOffset(end);
			var endInclusive = Math.max(Math.max(start, model.getLineStart(endLine)), end - 1);
			var clientWidth = this._getClientWidth();
			var clientHeight = this._getClientHeight();
			var minScroll = clientWidth / 4;
			var bounds = this._getBoundsAtOffset(caret === start ? start : endInclusive);
			var left = bounds.left;
			var right = bounds.right;
			var top = bounds.top;
			var bottom = bounds.bottom;
			if (allSelection && !selection.isEmpty()) {
				bounds = this._getBoundsAtOffset(caret === end ? start : endInclusive);
				if (bounds.top === top) {
					if (caret === start) {
						right = left + Math.min(bounds.right - left, clientWidth);
					} else {
						left = right - Math.min(right - bounds.left, clientWidth);
					}
				} else {
					if (caret === start) {
						bottom = top + Math.min(bounds.bottom - top, clientHeight);
					} else {
						top = bottom - Math.min(bottom - bounds.top, clientHeight);
					}
				}
			}
			var pixelX = 0;
			if (left < scroll.x) {
				pixelX = Math.min(left - scroll.x, -minScroll);
			}
			if (right > scroll.x + clientWidth) {
				pixelX = Math.max(right - scroll.x - clientWidth, minScroll);
			}
			var pixelY = 0;
			if (top < scroll.y) {
				pixelY = top - scroll.y;
			} else if (bottom > scroll.y + clientHeight) {
				pixelY = bottom - scroll.y - clientHeight;
			}
			if (pageScroll) {
				if (pageScroll > 0) {
					if (pixelY > 0) {
						pixelY = Math.max(pixelY, pageScroll);
					}
				} else {
					if (pixelY < 0) {
						pixelY = Math.min(pixelY, pageScroll);
					}
				}
			}
			if (pixelX !== 0 || pixelY !== 0) {
				this._scrollView (pixelX, pixelY);
				/*
				* When the view scrolls it is possible that one of the scrollbars can show over the caret.
				* Depending on the browser scrolling can be synchronous (Safari), in which case the change
				* can be detected before showCaret() returns. When scrolling is asynchronous (most browsers),
				* the detection is done during the next update page.
				*/
				if (clientHeight !== this._getClientHeight() || clientWidth !== this._getClientWidth()) {
					this._showCaret();
				} else {
					this._ensureCaretVisible = true;
				}
				return true;
			}
			return false;
		},
		_startIME: function () {
			if (this._imeOffset !== -1) { return; }
			var selection = this._getSelection();
			if (!selection.isEmpty()) {
				this._modifyContent({text: "", start: selection.start, end: selection.end}, true);
			}
			this._imeOffset = selection.start;
		},
		_unhookEvents: function() {
			this._model.removeEventListener("preChanging", this._modelListener.onChanging); //$NON-NLS-0$
			this._model.removeEventListener("postChanged", this._modelListener.onChanged); //$NON-NLS-0$
			this._modelListener = null;
			for (var i=0; i<this._handlers.length; i++) {
				var h = this._handlers[i];
				removeHandler(h.target, h.type, h.handler);
			}
			this._handlers = null;
			if (this._mutationObserver) {
				this._mutationObserver.disconnect();
				this._mutationObserver = null;
			}
		},
		_updateDOMSelection: function () {
			if (this._ignoreDOMSelection) { return; }
			if (!this._clientDiv) { return; }
			var selection = this._getSelection();
			var model = this._model;
			var startLine = model.getLineAtOffset(selection.start);
			var endLine = model.getLineAtOffset(selection.end);
			var firstNode = this._getLineNext();
			/*
			* Bug in Firefox. For some reason, after a update page sometimes the
			* firstChild returns null incorrectly. The fix is to ignore show selection.
			*/
			if (!firstNode) { return; }
			var lastNode = this._getLinePrevious();

			var topNode, bottomNode, topOffset, bottomOffset;
			if (startLine < firstNode.lineIndex) {
				topNode = firstNode;
				topOffset = 0;
			} else if (startLine > lastNode.lineIndex) {
				topNode = lastNode;
				topOffset = 0;
			} else {
				topNode = this._getLineNode(startLine);
				topOffset = selection.start - model.getLineStart(startLine);
			}

			if (endLine < firstNode.lineIndex) {
				bottomNode = firstNode;
				bottomOffset = 0;
			} else if (endLine > lastNode.lineIndex) {
				bottomNode = lastNode;
				bottomOffset = 0;
			} else {
				bottomNode = this._getLineNode(endLine);
				bottomOffset = selection.end - model.getLineStart(endLine);
			}
			this._setDOMSelection(topNode, topOffset, bottomNode, bottomOffset);
		},
		_update: function(hScrollOnly) {
			if (this._redrawCount > 0) { return; }
			if (this._updateTimer) {
				var window = this._getWindow();
				window.clearTimeout(this._updateTimer);
				this._updateTimer = null;
				hScrollOnly = false;
			}
			var clientDiv = this._clientDiv;
			if (!clientDiv) { return; }
			if (this._metrics.invalid) {
				this._ignoreQueueUpdate = true;
				this._updateStyle();
				this._ignoreQueueUpdate = false;
			}
			var model = this._model;
			var scroll = this._getScroll();
			var viewPad = this._getViewPadding();
			var lineCount = model.getLineCount();
			var lineHeight = this._getLineHeight();
			var clientWidth = this._getClientWidth();
			if (this._wrapMode) {
				clientDiv.style.width = clientWidth + "px"; //$NON-NLS-0$
			}

			/*
			* topIndex - top line index of the view (maybe be particialy visible)
			* lineStart - top line minus one line (if any)
			* topIndexY - portion of the top line that is NOT visible.
			* top - topIndexY plus height of the line before top line (if any)
			*/
			var topIndex, lineStart, top, topIndexY,
				leftWidth, leftRect,
				clientHeight, scrollWidth, scrollHeight,
				totalHeight = 0, totalLineIndex = 0, tempLineHeight;
			if (this._lineHeight) {
				while (totalLineIndex < lineCount) {
					tempLineHeight = this._getLineHeight(totalLineIndex);
					if (totalHeight + tempLineHeight > scroll.y) {
						break;
					}
					totalHeight += tempLineHeight;
					totalLineIndex++;
				}
				topIndex = totalLineIndex;
				lineStart = Math.max(0, topIndex - 1);
				topIndexY = top = scroll.y - totalHeight;
				if (topIndex > 0) {
					top += this._getLineHeight(topIndex - 1);
				}
			} else {
				var firstLine = Math.max(0, scroll.y) / lineHeight;
				topIndex = Math.floor(firstLine);
				lineStart = Math.max(0, topIndex - 1);
				top = Math.round((firstLine - lineStart) * lineHeight);
				topIndexY = Math.round((firstLine - topIndex) * lineHeight);
				scrollHeight = lineCount * lineHeight;
			}
			this._topIndexY = topIndexY;
			var parent = this._parent;
			var parentWidth = parent.clientWidth;
			var parentHeight = parent.clientHeight;
			clientHeight = this._getClientHeight();
			if (hScrollOnly) {
				leftWidth = 0;
				if (this._leftDiv) {
					leftRect = this._leftDiv.getBoundingClientRect();
					leftWidth = leftRect.right - leftRect.left;
				}
				scrollWidth = clientWidth;
				if (!this._wrapMode) {
					scrollWidth = Math.max(this._maxLineWidth, scrollWidth);
				}
				while (totalLineIndex < lineCount) {
					tempLineHeight = this._getLineHeight(totalLineIndex, false);
					totalHeight += tempLineHeight;
					totalLineIndex++;
				}
				scrollHeight = totalHeight;
			} else {

				var viewDiv = this._viewDiv;
				var linesPerPage = Math.floor((clientHeight + topIndexY) / lineHeight);
				var bottomIndex = Math.min(topIndex + linesPerPage, lineCount - 1);
				var lineEnd = Math.min(bottomIndex + 1, lineCount - 1);

				var lineIndex, lineWidth;
				var child = clientDiv.firstChild;
				while (child) {
					lineIndex = child.lineIndex;
					var nextChild = child.nextSibling;
					if (!(lineStart <= lineIndex && lineIndex <= lineEnd) || child.lineRemoved || child.lineIndex === -1) {
						if (this._mouseWheelLine === child) {
							child.style.display = "none"; //$NON-NLS-0$
							child.lineIndex = -1;
						} else {
							clientDiv.removeChild(child);
						}
					}
					child = nextChild;
				}

				child = this._getLineNext();
				var document = viewDiv.ownerDocument;
				var frag = document.createDocumentFragment();
				for (lineIndex=lineStart; lineIndex<=lineEnd; lineIndex++) {
					if (!child || child.lineIndex > lineIndex) {
						new TextLine(this, lineIndex).create(frag, null);
					} else {
						if (frag.firstChild) {
							clientDiv.insertBefore(frag, child);
							frag = document.createDocumentFragment();
						}
						if (child && child.lineChanged) {
							child = new TextLine(this, lineIndex).create(frag, child);
							child.lineChanged = false;
						}
						child = this._getLineNext(child);
					}
				}
				if (frag.firstChild) { clientDiv.insertBefore(frag, child); }

				/*
				* Feature in WekKit. Webkit limits the width of the lines
				* computed below to the width of the client div.  This causes
				* the lines to be wrapped even though "pre" is set.  The fix
				* is to set the width of the client div to "0x7fffffffpx"
				* before computing the lines width.  Note that this value is
				* reset to the appropriate value further down.
				*/
				if (util.isWebkit && !this._wrapMode) {
					clientDiv.style.width = "0x7fffffffpx"; //$NON-NLS-0$
				}

				var rect;
				child = this._getLineNext();
				var bottomHeight = clientHeight + top;
				var foundBottomIndex = false;
				while (child) {
					lineWidth = child.lineWidth;
					if (lineWidth === undefined) {
						rect = child._line.getBoundingClientRect();
						lineWidth = child.lineWidth = Math.ceil(rect.right - rect.left);
						if (this._lineHeight) {
							this._lineHeight[child.lineIndex] = Math.ceil(rect.bottom - rect.top);
						}
					}
					if (this._lineHeight && !foundBottomIndex) {
						bottomHeight -= this._lineHeight[child.lineIndex];
						if (bottomHeight < 0) {
							bottomIndex = child.lineIndex;
							foundBottomIndex = true;
						}
					}
					if (!this._wrapMode) {
						if (lineWidth >= this._maxLineWidth) {
							this._maxLineWidth = lineWidth;
							this._maxLineIndex = child.lineIndex;
						}
						if (this._checkMaxLineIndex === child.lineIndex) { this._checkMaxLineIndex = -1; }
					}
					if (child.lineIndex === topIndex) { this._topChild = child; }
					if (child.lineIndex === bottomIndex) { this._bottomChild = child; }
					child = this._getLineNext(child);
				}
				if (this._checkMaxLineIndex !== -1) {
					lineIndex = this._checkMaxLineIndex;
					this._checkMaxLineIndex = -1;
					if (0 <= lineIndex && lineIndex < lineCount) {
						var line = new TextLine(this, lineIndex);
						rect = line.getBoundingClientRect();
						lineWidth = rect.right - rect.left;
						if (lineWidth >= this._maxLineWidth) {
							this._maxLineWidth = lineWidth;
							this._maxLineIndex = lineIndex;
						}
						line.destroy();
					}
				}

				while (totalLineIndex < lineCount) {
					tempLineHeight = this._getLineHeight(totalLineIndex, totalLineIndex <= bottomIndex);
					totalHeight += tempLineHeight;
					totalLineIndex++;
				}
				scrollHeight = totalHeight;

				// Update rulers
				this._updateRuler(this._leftDiv, topIndex, bottomIndex);
				this._updateRuler(this._rightDiv, topIndex, bottomIndex);

				leftWidth = 0;
				if (this._leftDiv) {
					leftRect = this._leftDiv.getBoundingClientRect();
					leftWidth = leftRect.right - leftRect.left;
				}
				var rightWidth = 0;
				if (this._rightDiv) {
					var rightRect = this._rightDiv.getBoundingClientRect();
					rightWidth = rightRect.right - rightRect.left;
				}
				viewDiv.style.left = leftWidth + "px"; //$NON-NLS-0$
				viewDiv.style.right = rightWidth + "px"; //$NON-NLS-0$

				/* Need to set the height first in order for the width to consider the vertical scrollbar */
				var scrollDiv = this._scrollDiv;
				scrollDiv.style.height = scrollHeight + "px"; //$NON-NLS-0$
				/*
				* TODO if frameHeightWithoutHScrollbar < scrollHeight  < frameHeightWithHScrollbar and the horizontal bar is visible,
				* then the clientWidth is wrong because the vertical scrollbar is showing. To correct code should hide both scrollbars
				* at this point.
				*/
				clientWidth = this._getClientWidth();
				var width = clientWidth;
				if (!this._wrapMode) {
					width = Math.max(this._maxLineWidth, width);
				}
				/*
				* Except by IE 8 and earlier, all other browsers are not allocating enough space for the right padding
				* in the scrollbar. It is possible this a bug since all other paddings are considered.
				*/
				scrollWidth = width;
				if ((!util.isIE || util.isIE >= 9) && this._maxLineWidth > clientWidth) { width += viewPad.right + viewPad.left; }
				scrollDiv.style.width = width + "px"; //$NON-NLS-0$
				if (this._clipScrollDiv) {
					this._clipScrollDiv.style.width = width + "px"; //$NON-NLS-0$
				}
				/* Get the left scroll after setting the width of the scrollDiv as this can change the horizontal scroll offset. */
				scroll = this._getScroll();
				var rulerHeight = clientHeight + viewPad.top + viewPad.bottom;
				this._updateRulerSize(this._leftDiv, rulerHeight);
				this._updateRulerSize(this._rightDiv, rulerHeight);
			}
			if (this._vScrollDiv) {
				var trackHeight = clientHeight - 8;
				var thumbHeight = Math.max(15, Math.ceil(Math.min(1, trackHeight / (scrollHeight + viewPad.top + viewPad.bottom)) * trackHeight));
				this._vScrollDiv.style.left = (leftWidth + clientWidth - 8) + "px"; //$NON-NLS-0$
				this._vScrollDiv.style.top = Math.floor(Math.max(0, (scroll.y * trackHeight / scrollHeight))) + "px"; //$NON-NLS-0$
				this._vScrollDiv.style.height = thumbHeight + "px"; //$NON-NLS-0$
			}
			if (!this._wrapMode && this._hScrollDiv) {
				var trackWidth = clientWidth - 8;
				var thumbWidth = Math.max(15, Math.ceil(Math.min(1, trackWidth / (this._maxLineWidth + viewPad.left + viewPad.right)) * trackWidth));
				this._hScrollDiv.style.left = leftWidth + Math.floor(Math.max(0, Math.floor(scroll.x * trackWidth / this._maxLineWidth))) + "px"; //$NON-NLS-0$
				this._hScrollDiv.style.top = (clientHeight - 9) + "px"; //$NON-NLS-0$
				this._hScrollDiv.style.width = thumbWidth + "px"; //$NON-NLS-0$
			}
			var left = scroll.x;
			var clipDiv = this._clipDiv;
			var overlayDiv = this._overlayDiv;
			var clipLeft, clipTop;
			if (clipDiv) {
				clipDiv.scrollLeft = left;
				clipLeft = leftWidth + viewPad.left;
				clipTop = viewPad.top;
				var clipWidth = clientWidth;
				var clipHeight = clientHeight;
				var clientLeft = 0, clientTop = -top;
				if (scroll.x === 0) {
					clipLeft -= viewPad.left;
					clipWidth += viewPad.left;
					clientLeft = viewPad.left;
				}
				if (scroll.x + clientWidth === scrollWidth) {
					clipWidth += viewPad.right;
				}
				if (scroll.y === 0) {
					clipTop -= viewPad.top;
					clipHeight += viewPad.top;
					clientTop += viewPad.top;
				}
				if (scroll.y + clientHeight === scrollHeight) {
					clipHeight += viewPad.bottom;
				}
				clipDiv.style.left = clipLeft + "px"; //$NON-NLS-0$
				clipDiv.style.top = clipTop + "px"; //$NON-NLS-0$
				clipDiv.style.right = (parentWidth - clipWidth - clipLeft) + "px"; //$NON-NLS-0$
				clipDiv.style.bottom = (parentHeight - clipHeight - clipTop) + "px"; //$NON-NLS-0$
				clientDiv.style.left = clientLeft + "px"; //$NON-NLS-0$
				clientDiv.style.top = clientTop + "px"; //$NON-NLS-0$
				clientDiv.style.width = scrollWidth + "px"; //$NON-NLS-0$
				clientDiv.style.height = (clientHeight + top) + "px"; //$NON-NLS-0$
				if (overlayDiv) {
					overlayDiv.style.left = clientDiv.style.left;
					overlayDiv.style.top = clientDiv.style.top;
					overlayDiv.style.width = clientDiv.style.width;
					overlayDiv.style.height = clientDiv.style.height;
				}
			} else {
				clipLeft = left;
				clipTop = top;
				var clipRight = left + clientWidth;
				var clipBottom = top + clientHeight;
				if (clipLeft === 0) { clipLeft -= viewPad.left; }
				if (clipTop === 0) { clipTop -= viewPad.top; }
				if (clipRight === scrollWidth) { clipRight += viewPad.right; }
				if (scroll.y + clientHeight === scrollHeight) { clipBottom += viewPad.bottom; }
				clientDiv.style.clip = "rect(" + clipTop + "px," + clipRight + "px," + clipBottom + "px," + clipLeft + "px)"; //$NON-NLS-4$ //$NON-NLS-3$ //$NON-NLS-2$ //$NON-NLS-1$ //$NON-NLS-0$
				clientDiv.style.left = (-left + leftWidth + viewPad.left) + "px"; //$NON-NLS-0$
				clientDiv.style.width = (util.isWebkit ? scrollWidth : clientWidth + left) + "px"; //$NON-NLS-0$
				if (!hScrollOnly) {
					clientDiv.style.top = (-top + viewPad.top) + "px"; //$NON-NLS-0$
					clientDiv.style.height = (clientHeight + top) + "px"; //$NON-NLS-0$
				}
				if (overlayDiv) {
					overlayDiv.style.clip = clientDiv.style.clip;
					overlayDiv.style.left = clientDiv.style.left;
					overlayDiv.style.width = clientDiv.style.width;
					if (!hScrollOnly) {
						overlayDiv.style.top = clientDiv.style.top;
						overlayDiv.style.height = clientDiv.style.height;
					}
				}
			}
			this._updateDOMSelection();

			/*
			* If the client height changed during the update page it means that scrollbar has either been shown or hidden.
			* When this happens update page has to run again to ensure that the top and bottom lines div are correct.
			*
			* Note: On IE, updateDOMSelection() has to be called before getting the new client height because it
			* forces the client area to be recomputed.
			*/
			var ensureCaretVisible = this._ensureCaretVisible;
			this._ensureCaretVisible = false;
			if (clientHeight !== this._getClientHeight()) {
				this._update();
				if (ensureCaretVisible) {
					this._showCaret();
				}
			}
		},
		_updateRulerSize: function (divRuler, rulerHeight) {
			if (!divRuler) { return; }
			var topIndexY = this._topIndexY;
			var lineHeight = this._getLineHeight();
			var cells = divRuler.firstChild.rows[0].cells;
			for (var i = 0; i < cells.length; i++) {
				var div = cells[i].firstChild;
				var offset = lineHeight;
				if (div._ruler.getOverview() === "page") { offset += topIndexY; } //$NON-NLS-0$
				div.style.top = -offset + "px"; //$NON-NLS-0$
				div.style.height = (rulerHeight + offset) + "px"; //$NON-NLS-0$
				div = div.nextSibling;
			}
			divRuler.style.height = rulerHeight + "px"; //$NON-NLS-0$
		},
		_updateRuler: function (divRuler, topIndex, bottomIndex) {
			if (!divRuler) { return; }
			var cells = divRuler.firstChild.rows[0].cells;
			var document = this._parent.ownerDocument;
			var lineHeight = this._getLineHeight();
			var viewPad = this._getViewPadding();
			for (var i = 0; i < cells.length; i++) {
				var div = cells[i].firstChild;
				var ruler = div._ruler;
				if (div.rulerChanged) {
					applyStyle(ruler.getRulerStyle(), div);
				}

				var widthDiv;
				var child = div.firstChild;
				if (child) {
					widthDiv = child;
					child = child.nextSibling;
				} else {
					widthDiv = util.createElement(document, "div"); //$NON-NLS-0$
					widthDiv.style.visibility = "hidden"; //$NON-NLS-0$
					div.appendChild(widthDiv);
				}
				var lineIndex, annotation;
				if (div.rulerChanged) {
					if (widthDiv) {
						lineIndex = -1;
						annotation = ruler.getWidestAnnotation();
						if (annotation) {
							applyStyle(annotation.style, widthDiv);
							if (annotation.html) {
								widthDiv.innerHTML = annotation.html;
							}
						}
						widthDiv.lineIndex = lineIndex;
						widthDiv.style.height = (lineHeight + viewPad.top) + "px"; //$NON-NLS-0$
					}
				}

				var overview = ruler.getOverview(), lineDiv, frag, annotations;
				if (overview === "page") { //$NON-NLS-0$
					annotations = ruler.getAnnotations(topIndex, bottomIndex + 1);
					while (child) {
						lineIndex = child.lineIndex;
						var nextChild = child.nextSibling;
						if (!(topIndex <= lineIndex && lineIndex <= bottomIndex) || child.lineChanged) {
							div.removeChild(child);
						}
						child = nextChild;
					}
					child = div.firstChild.nextSibling;
					frag = document.createDocumentFragment();
					for (lineIndex=topIndex; lineIndex<=bottomIndex; lineIndex++) {
						if (!child || child.lineIndex > lineIndex) {
							lineDiv = util.createElement(document, "div"); //$NON-NLS-0$
							annotation = annotations[lineIndex];
							if (annotation) {
								applyStyle(annotation.style, lineDiv);
								if (annotation.html) {
									lineDiv.innerHTML = annotation.html;
								}
								lineDiv.annotation = annotation;
							}
							lineDiv.lineIndex = lineIndex;
							lineDiv.style.height = this._getLineHeight(lineIndex) + "px"; //$NON-NLS-0$
							frag.appendChild(lineDiv);
						} else {
							if (frag.firstChild) {
								div.insertBefore(frag, child);
								frag = document.createDocumentFragment();
							}
							if (child) {
								child = child.nextSibling;
							}
						}
					}
					if (frag.firstChild) { div.insertBefore(frag, child); }
				} else {
					var clientHeight = this._getClientHeight ();
					var lineCount = this._model.getLineCount ();
					var contentHeight = lineHeight * lineCount;
					var trackHeight = clientHeight + viewPad.top + viewPad.bottom - 2 * this._metrics.scrollWidth;
					var divHeight;
					if (contentHeight < trackHeight) {
						divHeight = lineHeight;
					} else {
						divHeight = trackHeight / lineCount;
					}
					if (div.rulerChanged) {
						var count = div.childNodes.length;
						while (count > 1) {
							div.removeChild(div.lastChild);
							count--;
						}
						annotations = ruler.getAnnotations(0, lineCount);
						frag = document.createDocumentFragment();
						for (var prop in annotations) {
							lineIndex = prop >>> 0;
							if (lineIndex < 0) { continue; }
							lineDiv = util.createElement(document, "div"); //$NON-NLS-0$
							annotation = annotations[prop];
							applyStyle(annotation.style, lineDiv);
							lineDiv.style.position = "absolute"; //$NON-NLS-0$
							lineDiv.style.top = this._metrics.scrollWidth + lineHeight + Math.floor(lineIndex * divHeight) + "px"; //$NON-NLS-0$
							if (annotation.html) {
								lineDiv.innerHTML = annotation.html;
							}
							lineDiv.annotation = annotation;
							lineDiv.lineIndex = lineIndex;
							frag.appendChild(lineDiv);
						}
						div.appendChild(frag);
					} else if (div._oldTrackHeight !== trackHeight) {
						lineDiv = div.firstChild ? div.firstChild.nextSibling : null;
						while (lineDiv) {
							lineDiv.style.top = this._metrics.scrollWidth + lineHeight + Math.floor(lineDiv.lineIndex * divHeight) + "px"; //$NON-NLS-0$
							lineDiv = lineDiv.nextSibling;
						}
					}
					div._oldTrackHeight = trackHeight;
				}
				div.rulerChanged = false;
				div = div.nextSibling;
			}
		},
		_updateStyle: function (init) {
			if (!init && util.isIE) {
				this._rootDiv.style.lineHeight = "normal"; //$NON-NLS-0$
			}
			var metrics = this._metrics = this._calculateMetrics();
			if (util.isIE) {
				this._rootDiv.style.lineHeight = (metrics.lineHeight - (metrics.lineTrim.top + metrics.lineTrim.bottom)) + "px"; //$NON-NLS-0$
			} else {
				this._rootDiv.style.lineHeight = "normal"; //$NON-NLS-0$
			}
			if (!init) {
				this.redraw();
				this._resetLineWidth();
			}
		}
	};//end prototype
	mEventTarget.EventTarget.addMixin(TextView.prototype);

	return {TextView: TextView};
});

