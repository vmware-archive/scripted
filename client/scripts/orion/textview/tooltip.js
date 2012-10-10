/*******************************************************************************
 * @license
 * Copyright (c) 2010, 2011 IBM Corporation and others.
 * All rights reserved. This program and the accompanying materials are made 
 * available under the terms of the Eclipse Public License v1.0 
 * (http://www.eclipse.org/legal/epl-v10.html), and the Eclipse Distribution 
 * License v1.0 (http://www.eclipse.org/org/documents/edl-v10.html). 
 * 
 * Contributors: IBM Corporation - initial API and implementation
 ******************************************************************************/

/*global define setTimeout clearTimeout setInterval clearInterval Node */

define("orion/textview/tooltip", ['i18n!orion/textview/nls/messages', 'orion/textview/textView', 'orion/textview/textModel', 'orion/textview/projectionTextModel'], function(messages, mTextView, mTextModel, mProjectionTextModel) {

	/** @private */
	function Tooltip (view) {
		this._view = view;
		this._create(view.getOptions("parent").ownerDocument);
		view.addEventListener("Destroy", this, this.destroy);
	}
	Tooltip.getTooltip = function(view) {
		if (!view._tooltip) {
			 view._tooltip = new Tooltip(view);
		}
		return view._tooltip;
	};
	Tooltip.prototype = /** @lends orion.textview.Tooltip.prototype */ {
		_create: function(document) {
			if (this._tooltipDiv) { return; }
			var tooltipDiv = this._tooltipDiv = document.createElement("DIV");
			tooltipDiv.className = "textviewTooltip";
			var tooltipContents = this._tooltipContents = document.createElement("DIV");
			tooltipDiv.appendChild(tooltipContents);
			document.body.appendChild(tooltipDiv);
			this.hide();
		},
		destroy: function() {
			if (!this._tooltipDiv) { return; }
			this.hide();
			var parent = this._tooltipDiv.parentNode;
			if (parent) { parent.removeChild(this._tooltipDiv); }
			this._tooltipDiv = null;
		},
		hide: function() {
			if (this._contentsView) {
				this._contentsView.destroy();
				this._contentsView = null;
			}
			if (this._tooltipContents) {
				this._tooltipContents.innerHTML = "";
			}
			if (this._tooltipDiv) {
				this._tooltipDiv.style.visibility = "hidden";
			}
			if (this._showTimeout) {
				clearTimeout(this._showTimeout);
				this._showTimeout = null;
			}
			if (this._hideTimeout) {
				clearTimeout(this._hideTimeout);
				this._hideTimeout = null;
			}
			if (this._fadeTimeout) {
				clearInterval(this._fadeTimeout);
				this._fadeTimeout = null;
			}
		},
		isVisible: function() {
			return this._tooltipDiv && this._tooltipDiv.style.visibility === "visible";
		},
		setTarget: function(target) {
			if (this.target === target) { return; }
			this._target = target;
			this.hide();
			if (target) {
				var self = this;
				self._showTimeout = setTimeout(function() {
					self.show(true);
				}, 500);
			}
		},
		show: function(autoHide) {
			if (!this._target) { return; }
			var info = this._target.getTooltipInfo();
			if (!info) { return; }
			var tooltipDiv = this._tooltipDiv, tooltipContents = this._tooltipContents;
			tooltipDiv.style.left = tooltipDiv.style.right = tooltipDiv.style.width = tooltipDiv.style.height = 
				tooltipContents.style.width = tooltipContents.style.height = "auto";
			var contents = info.contents;
			if (contents instanceof Array) {
				contents = this._getAnnotationContents(contents);
			}
			if (typeof contents === "string") {
				tooltipContents.innerHTML = contents;
			} else if (this._isNode(contents)) {
				tooltipContents.appendChild(contents);
			} else if (contents instanceof mProjectionTextModel.ProjectionTextModel) {
				var view = this._view;
				var options = view.getOptions();
				options.parent = tooltipContents;
				var tooltipTheme = "tooltip";
				var theme = options.themeClass;
				if (theme) {
					theme = theme.replace(tooltipTheme, "");
					if (theme) { theme = " " + theme; }
					theme = tooltipTheme + theme;
				} else {
					theme = tooltipTheme;
				}
				options.themeClass = theme;
				var contentsView = this._contentsView = new mTextView.TextView(options);
				//TODO this is need to avoid Firefox from getting focus
				contentsView._clientDiv.contentEditable = false;
				//TODO need to find a better way of sharing the styler for multiple views
				var listener = {
					onLineStyle: function(e) {
						view.onLineStyle(e);
					}
				};
				contentsView.addEventListener("LineStyle", listener.onLineStyle);
				contentsView.setModel(contents);
				var size = contentsView.computeSize();
				tooltipContents.style.width = (size.width + 20) + "px";
				tooltipContents.style.height = size.height + "px";
				contentsView.resize();
			} else {
				return;
			}
			var left = parseInt(this._getNodeStyle(tooltipDiv, "padding-left", "0"), 10);
			left += parseInt(this._getNodeStyle(tooltipDiv, "border-left-width", "0"), 10);
			if (info.anchor === "right") {
				var right = parseInt(this._getNodeStyle(tooltipDiv, "padding-right", "0"), 10);
				right += parseInt(this._getNodeStyle(tooltipDiv, "border-right-width", "0"), 10);
				tooltipDiv.style.right = (tooltipDiv.ownerDocument.body.getBoundingClientRect().right - info.x + left + right) + "px";
			} else {
				tooltipDiv.style.left = (info.x - left) + "px";
			}
			var top = parseInt(this._getNodeStyle(tooltipDiv, "padding-top", "0"), 10);
			top += parseInt(this._getNodeStyle(tooltipDiv, "border-top-width", "0"), 10);
			tooltipDiv.style.top = (info.y - top) + "px";
			tooltipDiv.style.maxWidth = info.maxWidth + "px";
			tooltipDiv.style.maxHeight = info.maxHeight + "px";
			tooltipDiv.style.opacity = "1";
			tooltipDiv.style.visibility = "visible";
			if (autoHide) {
				var self = this;
				self._hideTimeout = setTimeout(function() {
					var opacity = parseFloat(self._getNodeStyle(tooltipDiv, "opacity", "1"));
					self._fadeTimeout = setInterval(function() {
						if (tooltipDiv.style.visibility === "visible" && opacity > 0) {
							opacity -= 0.1;
							tooltipDiv.style.opacity = opacity;
							return;
						}
						self.hide();
					}, 50);
				}, 5000);
			}
		},
		_getAnnotationContents: function(annotations) {
			if (annotations.length === 0) {
				return null;
			}
			var model = this._view.getModel(), annotation;
			var baseModel = model.getBaseModel ? model.getBaseModel() : model;
			function getText(start, end) {
				var textStart = baseModel.getLineStart(baseModel.getLineAtOffset(start));
				var textEnd = baseModel.getLineEnd(baseModel.getLineAtOffset(end), true);
				return baseModel.getText(textStart, textEnd);
			}
			var title;
			if (annotations.length === 1) {
				annotation = annotations[0];
				if (annotation.title) {
					title = annotation.title.replace(/</g, "&lt;").replace(/>/g, "&gt;");
					return "<div>" + annotation.html + "&nbsp;<span style='vertical-align:middle;'>" + title + "</span><div>";
				} else {
					var newModel = new mProjectionTextModel.ProjectionTextModel(baseModel);
					var lineStart = baseModel.getLineStart(baseModel.getLineAtOffset(annotation.start));
					var charCount = baseModel.getCharCount();
					if (annotation.end !== charCount) {
						newModel.addProjection({start: annotation.end, end: charCount});
					}
					if (lineStart > 0) {
						newModel.addProjection({start: 0, end: lineStart});
					}
					return newModel;
				}
			} else {
				var tooltipHTML = "<div><em>" + messages.multipleAnnotations + "</em></div>";
				for (var i = 0; i < annotations.length; i++) {
					annotation = annotations[i];
					title = annotation.title;
					if (!title) {
						title = getText(annotation.start, annotation.end);
					}
					title = title.replace(/</g, "&lt;").replace(/>/g, "&gt;");
					tooltipHTML += "<div>" + annotation.html + "&nbsp;<span style='vertical-align:middle;'>" + title + "</span><div>";
				}
				return tooltipHTML;
			}
		},
		_getNodeStyle: function(node, prop, defaultValue) {
			var value;
			if (node) {
				value = node.style[prop];
				if (!value) {
					if (node.currentStyle) {
						var index = 0, p = prop;
						while ((index = p.indexOf("-", index)) !== -1) {
							p = p.substring(0, index) + p.substring(index + 1, index + 2).toUpperCase() + p.substring(index + 2);
						}
						value = node.currentStyle[p];
					} else {
						var css = node.ownerDocument.defaultView.getComputedStyle(node, null);
						value = css ? css.getPropertyValue(prop) : null;
					}
				}
			}
			return value || defaultValue;
		},
		_isNode: function (obj) {
			return typeof Node === "object" ? obj instanceof Node :
				obj && typeof obj === "object" && typeof obj.nodeType === "number" && typeof obj.nodeName === "string";
		}
	};
	return {Tooltip: Tooltip};
});
