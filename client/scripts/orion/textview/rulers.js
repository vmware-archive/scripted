/*******************************************************************************
 * @license
 * Copyright (c) 2010, 2012 IBM Corporation and others.
 * All rights reserved. This program and the accompanying materials are made 
 * available under the terms of the Eclipse Public License v1.0 
 * (http://www.eclipse.org/legal/epl-v10.html), and the Eclipse Distribution 
 * License v1.0 (http://www.eclipse.org/org/documents/edl-v10.html). 
 * 
 * Contributors: IBM Corporation - initial API and implementation
 ******************************************************************************/

/*global define*/

define("orion/textview/rulers", ['i18n!orion/textview/nls/messages', 'orion/textview/annotations', 'orion/textview/tooltip', 'orion/textview/util'], function(messages, mAnnotations, mTooltip, util) { //$NON-NLS-4$ //$NON-NLS-3$ //$NON-NLS-2$ //$NON-NLS-1$ //$NON-NLS-0$

	/**
	 * Constructs a new ruler. 
	 * <p>
	 * The default implementation does not implement all the methods in the interface
	 * and is useful only for objects implementing rulers.
	 * <p/>
	 * 
	 * @param {orion.textview.AnnotationModel} annotationModel the annotation model for the ruler.
	 * @param {String} [rulerLocation="left"] the location for the ruler.
	 * @param {String} [rulerOverview="page"] the overview for the ruler.
	 * @param {orion.textview.Style} [rulerStyle] the style for the ruler. 
	 * 
	 * @class This interface represents a ruler for the text view.
	 * <p>
	 * A Ruler is a graphical element that is placed either on the left or on the right side of 
	 * the view. It can be used to provide the view with per line decoration such as line numbering,
	 * bookmarks, breakpoints, folding disclosures, etc. 
	 * </p><p>
	 * There are two types of rulers: page and document. A page ruler only shows the content for the lines that are
	 * visible, while a document ruler always shows the whole content.
	 * </p>
	 * <b>See:</b><br/>
	 * {@link orion.textview.LineNumberRuler}<br/>
	 * {@link orion.textview.AnnotationRuler}<br/>
	 * {@link orion.textview.OverviewRuler}<br/> 
	 * {@link orion.textview.TextView}<br/>
	 * {@link orion.textview.TextView#addRuler}
	 * </p>		 
	 * @name orion.textview.Ruler
	 * @borrows orion.textview.AnnotationTypeList#addAnnotationType as #addAnnotationType
	 * @borrows orion.textview.AnnotationTypeList#getAnnotationTypePriority as #getAnnotationTypePriority
	 * @borrows orion.textview.AnnotationTypeList#getAnnotationsByType as #getAnnotationsByType
	 * @borrows orion.textview.AnnotationTypeList#isAnnotationTypeVisible as #isAnnotationTypeVisible
	 * @borrows orion.textview.AnnotationTypeList#removeAnnotationType as #removeAnnotationType
	 */
	function Ruler (annotationModel, rulerLocation, rulerOverview, rulerStyle) {
		this._location = rulerLocation || "left"; //$NON-NLS-0$
		this._overview = rulerOverview || "page"; //$NON-NLS-0$
		this._rulerStyle = rulerStyle;
		this._view = null;
		var self = this;
		this._listener = {
			onTextModelChanged: function(e) {
				self._onTextModelChanged(e);
			},
			onAnnotationModelChanged: function(e) {
				self._onAnnotationModelChanged(e);
			}
		};
		this.setAnnotationModel(annotationModel);
	}
	Ruler.prototype = /** @lends orion.textview.Ruler.prototype */ {
		/**
		 * Returns the annotations for a given line range merging multiple
		 * annotations when necessary.
		 * <p>
		 * This method is called by the text view when the ruler is redrawn.
		 * </p>
		 *
		 * @param {Number} startLine the start line index
		 * @param {Number} endLine the end line index
		 * @return {orion.textview.Annotation[]} the annotations for the line range. The array might be sparse.
		 */
		getAnnotations: function(startLine, endLine) {
			var annotationModel = this._annotationModel;
			if (!annotationModel) { return []; }
			var model = this._view.getModel();
			var start = model.getLineStart(startLine);
			var end = model.getLineEnd(endLine - 1);
			var baseModel = model;
			if (model.getBaseModel) {
				baseModel = model.getBaseModel();
				start = model.mapOffset(start);
				end = model.mapOffset(end);
			}
			var result = [];
			var annotations = this.getAnnotationsByType(annotationModel, start, end);
			for (var i = 0; i < annotations.length; i++) {
				var annotation = annotations[i];
				var annotationLineStart = baseModel.getLineAtOffset(annotation.start);
				var annotationLineEnd = baseModel.getLineAtOffset(Math.max(annotation.start, annotation.end - 1));
				for (var lineIndex = annotationLineStart; lineIndex<=annotationLineEnd; lineIndex++) {
					var visualLineIndex = lineIndex;
					if (model !== baseModel) {
						var ls = baseModel.getLineStart(lineIndex);
						ls = model.mapOffset(ls, true);
						if (ls === -1) { continue; }
						visualLineIndex = model.getLineAtOffset(ls);
					}
					if (!(startLine <= visualLineIndex && visualLineIndex < endLine)) { continue; }
					var rulerAnnotation = this._mergeAnnotation(result[visualLineIndex], annotation, lineIndex - annotationLineStart, annotationLineEnd - annotationLineStart + 1);
					if (rulerAnnotation) {
						result[visualLineIndex] = rulerAnnotation;
					}
				}
			}
			if (!this._multiAnnotation && this._multiAnnotationOverlay) {
				for (var k in result) {
					if (result[k]._multiple) {
						result[k].html = result[k].html + this._multiAnnotationOverlay.html;
					}
				}
			}
			return result;
		},
		/**
		 * Returns the annotation model.
		 *
		 * @returns {orion.textview.AnnotationModel} the ruler annotation model.
		 *
		 * @see #setAnnotationModel
		 */
		getAnnotationModel: function() {
			return this._annotationModel;
		},
		/**
		 * Returns the ruler location.
		 *
		 * @returns {String} the ruler location, which is either "left" or "right".
		 *
		 * @see #getOverview
		 */
		getLocation: function() {
			return this._location;
		},
		/**
		 * Returns the ruler overview type.
		 *
		 * @returns {String} the overview type, which is either "page" or "document".
		 *
		 * @see #getLocation
		 */
		getOverview: function() {
			return this._overview;
		},
		/**
		 * Returns the style information for the ruler.
		 *
		 * @returns {orion.textview.Style} the style information.
		 */
		getRulerStyle: function() {
			return this._rulerStyle;
		},
		/**
		 * Returns the text view.
		 *
		 * @returns {orion.textview.TextView} the text view.
		 *
		 * @see #setView
		 */
		getView: function() {
			return this._view;
		},
		/**
		 * Returns the widest annotation which determines the width of the ruler.
		 * <p>
		 * If the ruler does not have a fixed width it should provide the widest
		 * annotation to avoid the ruler from changing size as the view scrolls.
		 * </p>
		 * <p>
		 * This method is called by the text view when the ruler is redrawn.
		 * </p>
		 *
		 * @returns {orion.textview.Annotation} the widest annotation.
		 *
		 * @see #getAnnotations
		 */
		getWidestAnnotation: function() {
			return null;
		},
		/**
		 * Sets the annotation model for the ruler.
		 *
		 * @param {orion.textview.AnnotationModel} annotationModel the annotation model.
		 *
		 * @see #getAnnotationModel
		 */
		setAnnotationModel: function (annotationModel) {
			if (this._annotationModel) {
				this._annotationModel.removEventListener("Changed", this._listener.onAnnotationModelChanged); //$NON-NLS-0$
			}
			this._annotationModel = annotationModel;
			if (this._annotationModel) {
				this._annotationModel.addEventListener("Changed", this._listener.onAnnotationModelChanged); //$NON-NLS-0$
			}
		},
		/**
		 * Sets the annotation that is displayed when a given line contains multiple
		 * annotations.  This annotation is used when there are different types of
		 * annotations in a given line.
		 *
		 * @param {orion.textview.Annotation} annotation the annotation for lines with multiple annotations.
		 * 
		 * @see #setMultiAnnotationOverlay
		 */
		setMultiAnnotation: function(annotation) {
			this._multiAnnotation = annotation;
		},
		/**
		 * Sets the annotation that overlays a line with multiple annotations.  This annotation is displayed on
		 * top of the computed annotation for a given line when there are multiple annotations of the same type
		 * in the line. It is also used when the multiple annotation is not set.
		 *
		 * @param {orion.textview.Annotation} annotation the annotation overlay for lines with multiple annotations.
		 * 
		 * @see #setMultiAnnotation
		 */
		setMultiAnnotationOverlay: function(annotation) {
			this._multiAnnotationOverlay = annotation;
		},
		/**
		 * Sets the view for the ruler.
		 * <p>
		 * This method is called by the text view when the ruler
		 * is added to the view.
		 * </p>
		 *
		 * @param {orion.textview.TextView} view the text view.
		 */
		setView: function (view) {
			if (this._onTextModelChanged && this._view) {
				this._view.removeEventListener("ModelChanged", this._listener.onTextModelChanged); //$NON-NLS-0$
			}
			this._view = view;
			if (this._onTextModelChanged && this._view) {
				this._view.addEventListener("ModelChanged", this._listener.onTextModelChanged); //$NON-NLS-0$
			}
		},
		/**
		 * This event is sent when the user clicks a line annotation.
		 *
		 * @event
		 * @param {Number} lineIndex the line index of the annotation under the pointer.
		 * @param {DOMEvent} e the click event.
		 */
		onClick: function(lineIndex, e) {
		},
		/**
		 * This event is sent when the user double clicks a line annotation.
		 *
		 * @event
		 * @param {Number} lineIndex the line index of the annotation under the pointer.
		 * @param {DOMEvent} e the double click event.
		 */
		onDblClick: function(lineIndex, e) {
		},
		/**
		 * This event is sent when the user moves the mouse over a line annotation.
		 *
		 * @event
		 * @param {Number} lineIndex the line index of the annotation under the pointer.
		 * @param {DOMEvent} e the mouse move event.
		 */
		onMouseMove: function(lineIndex, e) {
			var tooltip = mTooltip.Tooltip.getTooltip(this._view);
			if (!tooltip) { return; }
			if (tooltip.isVisible() && this._tooltipLineIndex === lineIndex) { return; }
			this._tooltipLineIndex = lineIndex;
			var self = this;
			tooltip.setTarget({
				y: e.clientY,
				getTooltipInfo: function() {
					return self._getTooltipInfo(self._tooltipLineIndex, this.y);
				}
			});
		},
		/**
		 * This event is sent when the mouse pointer enters a line annotation.
		 *
		 * @event
		 * @param {Number} lineIndex the line index of the annotation under the pointer.
		 * @param {DOMEvent} e the mouse over event.
		 */
		onMouseOver: function(lineIndex, e) {
			this.onMouseMove(lineIndex, e);
		},
		/**
		 * This event is sent when the mouse pointer exits a line annotation.
		 *
		 * @event
		 * @param {Number} lineIndex the line index of the annotation under the pointer.
		 * @param {DOMEvent} e the mouse out event.
		 */
		onMouseOut: function(lineIndex, e) {
			var tooltip = mTooltip.Tooltip.getTooltip(this._view);
			if (!tooltip) { return; }
			tooltip.setTarget(null);
		},
		/** @ignore */
		_getTooltipInfo: function(lineIndex, y) {
			if (lineIndex === undefined) { return; }
			var view = this._view;
			var model = view.getModel();
			var annotationModel = this._annotationModel;
			var annotations = [];
			if (annotationModel) {
				var start = model.getLineStart(lineIndex);
				var end = model.getLineEnd(lineIndex);
				if (model.getBaseModel) {
					start = model.mapOffset(start);
					end = model.mapOffset(end);
				}
				annotations = this.getAnnotationsByType(annotationModel, start, end);
			}
			var contents = this._getTooltipContents(lineIndex, annotations);
			if (!contents) { return null; }
			var info = {
				contents: contents,
				anchor: this.getLocation()
			};
			var rect = view.getClientArea();
			if (this.getOverview() === "document") { //$NON-NLS-0$
				rect.y = view.convert({y: y}, "view", "document").y; //$NON-NLS-1$ //$NON-NLS-0$
			} else {
				rect.y = view.getLocationAtOffset(model.getLineStart(lineIndex)).y;
			}
			view.convert(rect, "document", "page"); //$NON-NLS-1$ //$NON-NLS-0$
			info.x = rect.x;
			info.y = rect.y;
			if (info.anchor === "right") { //$NON-NLS-0$
				info.x += rect.width;
			}
			return info;
		},
		/** @ignore */
		_getTooltipContents: function(lineIndex, annotations) {
			return annotations;
		},
		/** @ignore */
		_onAnnotationModelChanged: function(e) {
			var view = this._view;
			if (!view) { return; }
			var model = view.getModel(), self = this;
			var lineCount = model.getLineCount();
			if (e.textModelChangedEvent) {
				var start = e.textModelChangedEvent.start;
				if (model.getBaseModel) { start = model.mapOffset(start, true); }
				var startLine = model.getLineAtOffset(start);
				view.redrawLines(startLine, lineCount, self);
				return;
			}
			function redraw(changes) {
				for (var i = 0; i < changes.length; i++) {
					if (!self.isAnnotationTypeVisible(changes[i].type)) { continue; }
					var start = changes[i].start;
					var end = changes[i].end;
					if (model.getBaseModel) {
						start = model.mapOffset(start, true);
						end = model.mapOffset(end, true);
					}
					if (start !== -1 && end !== -1) {
						view.redrawLines(model.getLineAtOffset(start), model.getLineAtOffset(Math.max(start, end - 1)) + 1, self);
					}
				}
			}
			redraw(e.added);
			redraw(e.removed);
			redraw(e.changed);
		},
		/** @ignore */
		_mergeAnnotation: function(result, annotation, annotationLineIndex, annotationLineCount) {
			if (!result) { result = {}; }
			if (annotationLineIndex === 0) {
				if (result.html && annotation.html) {
					if (annotation.html !== result.html) {
						if (!result._multiple && this._multiAnnotation) {
							result.html = this._multiAnnotation.html;
						}
					} 
					result._multiple = true;
				} else {
					result.html = annotation.html;
				}
			}
			result.style = this._mergeStyle(result.style, annotation.style);
			return result;
		},
		/** @ignore */
		_mergeStyle: function(result, style) {
			if (style) {
				if (!result) { result = {}; }
				if (result.styleClass && style.styleClass && result.styleClass !== style.styleClass) {
					result.styleClass += " " + style.styleClass; //$NON-NLS-0$
				} else {
					result.styleClass = style.styleClass;
				}
				var prop;
				if (style.style) {
					if (!result.style) { result.style  = {}; }
					for (prop in style.style) {
						if (!result.style[prop]) {
							result.style[prop] = style.style[prop];
						}
					}
				}
				if (style.attributes) {
					if (!result.attributes) { result.attributes  = {}; }
					for (prop in style.attributes) {
						if (!result.attributes[prop]) {
							result.attributes[prop] = style.attributes[prop];
						}
					}
				}
			}
			return result;
		}
	};
	mAnnotations.AnnotationTypeList.addMixin(Ruler.prototype);

	/**
	 * Constructs a new line numbering ruler. 
	 *
	 * @param {orion.textview.AnnotationModel} annotationModel the annotation model for the ruler.
	 * @param {String} [rulerLocation="left"] the location for the ruler.
	 * @param {orion.textview.Style} [rulerStyle=undefined] the style for the ruler.
	 * @param {orion.textview.Style} [oddStyle={style: {backgroundColor: "white"}] the style for lines with odd line index.
	 * @param {orion.textview.Style} [evenStyle={backgroundColor: "white"}] the style for lines with even line index.
	 *
	 * @augments orion.textview.Ruler
	 * @class This objects implements a line numbering ruler.
	 *
	 * <p><b>See:</b><br/>
	 * {@link orion.textview.Ruler}
	 * </p>
	 * @name orion.textview.LineNumberRuler
	 */
	function LineNumberRuler (annotationModel, rulerLocation, rulerStyle, oddStyle, evenStyle) {
		Ruler.call(this, annotationModel, rulerLocation, "page", rulerStyle); //$NON-NLS-0$
		this._oddStyle = oddStyle || {style: {backgroundColor: "white"}}; //$NON-NLS-0$
		this._evenStyle = evenStyle || {style: {backgroundColor: "white"}}; //$NON-NLS-0$
		this._numOfDigits = 0;
	}
	LineNumberRuler.prototype = new Ruler(); 
	/** @ignore */
	LineNumberRuler.prototype.getAnnotations = function(startLine, endLine) {
		var result = Ruler.prototype.getAnnotations.call(this, startLine, endLine);
		var model = this._view.getModel();
		for (var lineIndex = startLine; lineIndex < endLine; lineIndex++) {
			var style = lineIndex & 1 ? this._oddStyle : this._evenStyle;
			var mapLine = lineIndex;
			if (model.getBaseModel) {
				var lineStart = model.getLineStart(mapLine);
				mapLine = model.getBaseModel().getLineAtOffset(model.mapOffset(lineStart));
			}
			if (!result[lineIndex]) { result[lineIndex] = {}; }
			result[lineIndex].html = (mapLine + 1) + "";
			if (!result[lineIndex].style) { result[lineIndex].style = style; }
		}
		return result;
	};
	/** @ignore */
	LineNumberRuler.prototype.getWidestAnnotation = function() {
		var lineCount = this._view.getModel().getLineCount();
		return this.getAnnotations(lineCount - 1, lineCount)[lineCount - 1];
	};
	/** @ignore */
	LineNumberRuler.prototype._onTextModelChanged = function(e) {
		var start = e.start;
		var model = this._view.getModel();
		var lineCount = model.getBaseModel ? model.getBaseModel().getLineCount() : model.getLineCount();
		var numOfDigits = (lineCount+"").length;
		if (this._numOfDigits !== numOfDigits) {
			this._numOfDigits = numOfDigits;
			var startLine = model.getLineAtOffset(start);
			this._view.redrawLines(startLine,  model.getLineCount(), this);
		}
	};
	
	/** 
	 * @class This is class represents an annotation for the AnnotationRuler. 
	 * <p> 
	 * <b>See:</b><br/> 
	 * {@link orion.textview.AnnotationRuler}
	 * </p> 
	 * 
	 * @name orion.textview.Annotation 
	 * 
	 * @property {String} [html=""] The html content for the annotation, typically contains an image.
	 * @property {orion.textview.Style} [style] the style for the annotation.
	 * @property {orion.textview.Style} [overviewStyle] the style for the annotation in the overview ruler.
	 */ 
	/**
	 * Constructs a new annotation ruler. 
	 *
	 * @param {orion.textview.AnnotationModel} annotationModel the annotation model for the ruler.
	 * @param {String} [rulerLocation="left"] the location for the ruler.
	 * @param {orion.textview.Style} [rulerStyle=undefined] the style for the ruler.
	 * @param {orion.textview.Annotation} [defaultAnnotation] the default annotation.
	 *
	 * @augments orion.textview.Ruler
	 * @class This objects implements an annotation ruler.
	 *
	 * <p><b>See:</b><br/>
	 * {@link orion.textview.Ruler}<br/>
	 * {@link orion.textview.Annotation}
	 * </p>
	 * @name orion.textview.AnnotationRuler
	 */
	function AnnotationRuler (annotationModel, rulerLocation, rulerStyle) {
		Ruler.call(this, annotationModel, rulerLocation, "page", rulerStyle); //$NON-NLS-0$
	}
	AnnotationRuler.prototype = new Ruler();
	
	/**
	 * Constructs a new overview ruler. 
	 * <p>
	 * The overview ruler is used in conjunction with a AnnotationRuler, for each annotation in the 
	 * AnnotationRuler this ruler displays a mark in the overview. Clicking on the mark causes the 
	 * view to scroll to the annotated line.
	 * </p>
	 *
	 * @param {orion.textview.AnnotationModel} annotationModel the annotation model for the ruler.
	 * @param {String} [rulerLocation="left"] the location for the ruler.
	 * @param {orion.textview.Style} [rulerStyle=undefined] the style for the ruler.
	 *
	 * @augments orion.textview.Ruler
	 * @class This objects implements an overview ruler.
	 *
	 * <p><b>See:</b><br/>
	 * {@link orion.textview.AnnotationRuler} <br/>
	 * {@link orion.textview.Ruler} 
	 * </p>
	 * @name orion.textview.OverviewRuler
	 */
	function OverviewRuler (annotationModel, rulerLocation, rulerStyle) {
		Ruler.call(this, annotationModel, rulerLocation, "document", rulerStyle); //$NON-NLS-0$
	}
	OverviewRuler.prototype = new Ruler();
	
	/** @ignore */
	OverviewRuler.prototype.getRulerStyle = function() {
		var result = {style: {lineHeight: "1px", fontSize: "1px"}}; //$NON-NLS-1$ //$NON-NLS-0$
		result = this._mergeStyle(result, this._rulerStyle);
		return result;
	};
	/** @ignore */	
	OverviewRuler.prototype.onClick = function(lineIndex, e) {
		if (lineIndex === undefined) { return; }
		this._view.setTopIndex(lineIndex);
	};
	/** @ignore */
	OverviewRuler.prototype._getTooltipContents = function(lineIndex, annotations) {
		if (annotations.length === 0) {
			var model = this._view.getModel();
			var mapLine = lineIndex;
			if (model.getBaseModel) {
				var lineStart = model.getLineStart(mapLine);
				mapLine = model.getBaseModel().getLineAtOffset(model.mapOffset(lineStart));
			}
			return util.formatMessage(messages.line, mapLine + 1);
		}
		return Ruler.prototype._getTooltipContents.call(this, lineIndex, annotations);
	};
	/** @ignore */
	OverviewRuler.prototype._mergeAnnotation = function(previousAnnotation, annotation, annotationLineIndex, annotationLineCount) {
		if (annotationLineIndex !== 0) { return undefined; }
		var result = previousAnnotation;
		if (!result) {
			//TODO annotationLineCount does not work when there are folded lines
			var height = 3 * annotationLineCount;
			result = {html: "&nbsp;", style: { style: {height: height + "px"}}}; //$NON-NLS-1$ //$NON-NLS-0$
			result.style = this._mergeStyle(result.style, annotation.overviewStyle);
		}
		return result;
	};

	/**
	 * Constructs a new folding ruler. 
	 *
	 * @param {orion.textview.AnnotationModel} annotationModel the annotation model for the ruler.
	 * @param {String} [rulerLocation="left"] the location for the ruler.
	 * @param {orion.textview.Style} [rulerStyle=undefined] the style for the ruler.
	 *
	 * @augments orion.textview.Ruler
	 * @class This objects implements an overview ruler.
	 *
	 * <p><b>See:</b><br/>
	 * {@link orion.textview.AnnotationRuler} <br/>
	 * {@link orion.textview.Ruler} 
	 * </p>
	 * @name orion.textview.OverviewRuler
	 */
	function FoldingRuler (annotationModel, rulerLocation, rulerStyle) {
		AnnotationRuler.call(this, annotationModel, rulerLocation, rulerStyle);
	}
	FoldingRuler.prototype = new AnnotationRuler();
	
	/** @ignore */
	FoldingRuler.prototype.onClick =  function(lineIndex, e) {
		if (lineIndex === undefined) { return; }
		var annotationModel = this._annotationModel;
		if (!annotationModel) { return; }
		var view = this._view;
		var model = view.getModel();
		var start = model.getLineStart(lineIndex);
		var end = model.getLineEnd(lineIndex, true);
		if (model.getBaseModel) {
			start = model.mapOffset(start);
			end = model.mapOffset(end);
			model = model.getBaseModel();
		}
		var annotation, iter = annotationModel.getAnnotations(start, end);
		while (!annotation && iter.hasNext()) {
			var a = iter.next();
			if (!this.isAnnotationTypeVisible(a.type)) { continue; }
			annotation = a;
		}
		if (annotation && model.getLineAtOffset(annotation.start) === model.getLineAtOffset(start)) {
			var tooltip = mTooltip.Tooltip.getTooltip(this._view);
			if (tooltip) {
				tooltip.setTarget(null);
			}
			if (annotation.expanded) {
				annotation.collapse();
			} else {
				annotation.expand();
			}
			this._annotationModel.modifyAnnotation(annotation);
		}
	};
	/** @ignore */
	FoldingRuler.prototype._getTooltipContents = function(lineIndex, annotations) {
		if (annotations.length === 1) {
			if (annotations[0].expanded) {
				return null;
			}
		}
		return AnnotationRuler.prototype._getTooltipContents.call(this, lineIndex, annotations);
	};
	/** @ignore */
	FoldingRuler.prototype._onAnnotationModelChanged = function(e) {
		if (e.textModelChangedEvent) {
			AnnotationRuler.prototype._onAnnotationModelChanged.call(this, e);
			return;
		}
		var view = this._view;
		if (!view) { return; }
		var model = view.getModel(), self = this, i;
		var lineCount = model.getLineCount(), lineIndex = lineCount;
		function redraw(changes) {
			for (i = 0; i < changes.length; i++) {
				if (!self.isAnnotationTypeVisible(changes[i].type)) { continue; }
				var start = changes[i].start;
				if (model.getBaseModel) {
					start = model.mapOffset(start, true);
				}
				if (start !== -1) {
					lineIndex = Math.min(lineIndex, model.getLineAtOffset(start));
				}
			}
		}
		redraw(e.added);
		redraw(e.removed);
		redraw(e.changed);
		var rulers = view.getRulers();
		for (i = 0; i < rulers.length; i++) {
			view.redrawLines(lineIndex, lineCount, rulers[i]);
		}
	};
	
	return {
		Ruler: Ruler,
		AnnotationRuler: AnnotationRuler,
		LineNumberRuler: LineNumberRuler,
		OverviewRuler: OverviewRuler,
		FoldingRuler: FoldingRuler
	};
});
