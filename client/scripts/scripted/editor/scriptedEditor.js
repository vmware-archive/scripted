/*******************************************************************************
 * @license
 * Copyright (c) 2010 - 2012 IBM Corporation, VMware and others.
 * All rights reserved. This program and the accompanying materials are made 
 * available under the terms of the Eclipse Public License v1.0 
 * (http://www.eclipse.org/legal/epl-v10.html), and the Eclipse Distribution 
 * License v1.0 (http://www.eclipse.org/org/documents/edl-v10.html). 
 *
 * Contributors:
 *     IBM Corporation - initial API and implementation
 *     Andy Clement
 *     Chris Johnson
 *     Kris De Volder
 *     Andrew Eisenberg
 *******************************************************************************/
/*global orion:true window define dojo FormData js_beautify statusReporter Worker localStorage $*/
/*jslint browser:true devel:true*/

define(["require", "orion/textview/textView", "orion/textview/keyBinding", "orion/editor/editor", "orion/editor/editorFeatures", "examples/textview/textStyler",  
"orion/editor/textMateStyler", "plugins/esprima/esprimaJsContentAssist", "orion/editor/jsTemplateContentAssist", "orion/editor/contentAssist", "plugins/esprima/indexerService", "orion/editor/jslintdriver", 
"orion/searchAndReplace/textSearcher", "orion/selection", "orion/commands", "orion/parameterCollectors", "orion/editor/htmlGrammar", 
"plugins/esprima/moduleVerifier", "orion/editor/jslintworker", "jsbeautify","orion/textview/textModel","orion/textview/projectionTextModel",
"orion/editor/htmlContentAssist", "orion/editor/cssContentAssist", "scripted/exec/exec-keys", "scripted/exec/exec-after-save"],

function(require, mTextView, mKeyBinding, mEditor, mEditorFeatures, mTextStyler, mTextMateStyler, 
mJsContentAssist, mTemplateContentAssist, mContentAssist, mIndexerService, mJslintDriver, mTextSearcher, mSelection, mCommands, mParameterCollectors, 
mHtmlGrammar, mModuleVerifier, mJsLintWorker, mJsBeautify,mTextModel,mProjectionModel,
mHtmlContentAssist, mCssContentAssist) {
	var determineIndentLevel = function(editor, startPos, options){
		var model = editor.getTextView().getModel();
		var previousLineIndex = model.getLineAtOffset(startPos) - 1;
		var previousLine = model.getLine( previousLineIndex );

		while (previousLine === "") {
			previousLineIndex--;
			previousLine = model.getLine(previousLineIndex);
		}
		
		if (previousLine) {
			var i = 0;
			var char = previousLine.charAt(0);
 
			while (char === options.indent_char) {
				i = i + options.indent_size;
				char = previousLine.charAt(i);
			}
		
			var lastChar = previousLine.charAt(previousLine.length - 1);
			if (lastChar === "{" || lastChar === "("){
				i++;
			}
			return i;
		}
	};
	
	var checkFormatSelection = function(editor, startPosition, endPosition) {
		var selection = editor.getText(startPosition, endPosition);
		
		if (selection && (endPosition > startPosition)) {
			var lastChar  = selection.charAt(endPosition - startPosition - 1);
			if (lastChar === "\n" || lastChar === "\r") {
				var revisedEndPosition = endPosition - 1;
				if (revisedEndPosition > startPosition) {
					selection = editor.getText(startPosition, revisedEndPosition);
					endPosition = revisedEndPosition;
				} 
			}
		}
		
		var checkedResult = {
				toFormat: selection,
				start: startPosition,
				end: endPosition	
		};
		
		return checkedResult;
	};

	//Recompute and set the given editor's title.
	//Everyone who wants to ensure the title is set correctly should be using this function, to ensure
	//consistency (e.g. adding "*" to a dirty editor).
	function setEditorTitle(editor, fileName) {
		if (editor.type === 'main') {
			if (editor.isDirty()) {
				document.title = "* " + fileName + " :: Scripted";
			} else {
				document.title = fileName + " :: Scripted";
			}
		} else if (editor.type === 'sub') {
			if (editor.isDirty()) {
				$(window.subeditors[0]._domNode).parent().find('.subeditor_title').text("* " + fileName);
			} else {
				$(window.subeditors[0]._domNode).parent().find('.subeditor_title').text(fileName);
			}
		}
	}
	
	var makeEditor = function(domNode, filePath, editorType){
		var editor;

		var fileName = filePath.split('/');
		fileName = fileName[fileName.length - 1];
		var isJS = (fileName.indexOf('.js') + '.js'.length === fileName.length) ||
					(fileName.indexOf('.json') + '.json'.length === fileName.length);
		var isHTML = fileName.indexOf('.html') + '.html'.length === fileName.length;
		
		if (editorType === 'main'){
			//TODO: should use setEditorTitle here. But no editor is available yet.
			//  should be ok here not to add "*" since this is a new editor so it can't
			//  possibly be dirty.
			document.title = fileName + " :: Scripted";
		}
		
		var indexer = new mIndexerService.Indexer();
		indexer.jslingConfig = window.scripted && window.scripted.config && window.scripted.config.jslint;
		
		var selection = new mSelection.Selection();
		var commandService = new mCommands.CommandService({
			selection: selection
		});
		// Set up a custom parameter collector that slides out of adjacent tool areas.
		commandService.setParameterCollector(new mParameterCollectors.CommandParameterCollector());
		var jsContentAssistant = new mJsContentAssist.EsprimaJavaScriptContentAssistProvider(indexer, window.scripted && window.scripted.config && window.scripted.config.jslint);
		var templateContentAssistant = new mTemplateContentAssist.JSTemplateContentAssistProvider();
		var htmlContentAssistant = new mHtmlContentAssist.HTMLContentAssistProvider();
		var cssContentAssistant = new mCssContentAssist.CssContentAssistProvider();
		
		var postSave = function(text) {
			var problems;
			if (isJS || isHTML) {
				problems = mJslintDriver.checkSyntax('', text).problems;
				editor.showProblems(problems);
			} else {
				problems = [];
			}

			if (isJS) {
				// if webworkers exist in this browser, it will be called as a webworker
				indexer.performIndex(filePath, function() {
					var missingModules = mModuleVerifier.checkModules(text, indexer);
					// not so pretty, but showProblems removes all old problems, so must re-add them
					problems = problems.concat(missingModules);
					editor.showProblems(problems);
				});
			}
			setEditorTitle(editor, fileName);
		};
		
		/**
		 * This function is called after successful save.
		 */
		function afterSaveSuccess(filePath) {
			editor.dispatchEvent({type: "afterSave", file: filePath});
		}
		
		var textViewFactory = function() {
			return new mTextView.TextView({
				parent: domNode,
				// without this, the listeners aren't registered in quite the right order, meaning that the
				// one that shuffles annotations along when text is entered (annotations.js _onChanged)
				// is registered after the one that determines the line style based on annotations
				// (textview.js _updatePage which calls createLine).  By adding a Projection model
				// we are more similar to orion and so don't have the problem - this suggests it is
				// just a(nother) issue with orion and us using it in an unusual way.  If the listeners
				// are in the wrong order the modified lines pickup the 'old' annotations and inherit
				// the style that indicates the 'current line'.1112412344443444
				model: new mProjectionModel.ProjectionTextModel(new mTextModel.TextModel()),
				tabSize: 4
			});
		};

		var contentAssistFactory = function(editor) {
			var contentAssist = new mContentAssist.ContentAssist(editor, "contentassist");
			var providers = [];
			if (isJS) {
				providers.push(jsContentAssistant);
				providers.push(templateContentAssistant);
			} else if (fileName.indexOf('.html') + '.html'.length === fileName.length) {
				providers.push(htmlContentAssistant);
			} else if (fileName.indexOf('.css') + '.css'.length === fileName.length) {
				providers.push(cssContentAssistant);
			}
			contentAssist.setProviders(providers);
			return contentAssist;
		};

		var annotationFactory = new mEditorFeatures.AnnotationFactory();
		
		/* for some reason, jsbeautify likes to strip the first line of its indent.  let's fix that */
		var fixFirstLineFormatting = function(toFormat, formatted) {
			var fix_format = "";
			var i = 0;
			var char = toFormat.charAt(i);
			var format_char = formatted.charAt(0);
			while (char !== format_char) {
				fix_format = char + fix_format;
				i++;
				char = toFormat.charAt(i);
			}
			formatted = fix_format + formatted;
			return formatted;
		};

		var keyBindingFactory = function(editor, keyModeStack, undoStack, contentAssist) {

			// Create keybindings for generic editing
			var genericBindings = new mEditorFeatures.TextActions(editor, undoStack);
			keyModeStack.push(genericBindings);

			// Linked Mode
			var linkedMode = new mEditorFeatures.LinkedMode(editor);
			keyModeStack.push(linkedMode);

			// create keybindings for source editing
			var codeBindings = new mEditorFeatures.SourceCodeActions(editor, undoStack, contentAssist, linkedMode);
			keyModeStack.push(codeBindings);

			editor.getTextView().setKeyBinding(new mKeyBinding.KeyBinding("h", /*command/ctrl*/ true, /*shift*/ false, /*alt*/ false), "Command Help");
			editor.getTextView().setAction("Command Help", function() {
				$('#help_open').click();
				return true;
			});
			
			// Text formatting
			editor.getTextView().setKeyBinding(new mKeyBinding.KeyBinding("f", /*command/ctrl*/ false, /*shift*/ true, /*alt*/ true), "Format text");
			editor.getTextView().setAction("Format text", function() {
				var selection = editor.getSelection();
				var start = selection.start;
				var end = selection.end;
				var selectionEmpty = start === end;
				var options = window.scripted.config && window.scripted.config.formatter && window.scripted.config.formatter.js ? window.scripted.config.formatter.js : {};
				var toFormat, formatted;
				if (!selectionEmpty) {
					var checkedFormatSelection = checkFormatSelection(editor, start, end);
					
					toFormat = checkedFormatSelection.toFormat;
					start = checkedFormatSelection.start;
					end = checkedFormatSelection.end;
					
					options.indent_level = determineIndentLevel(editor, start, options);
					formatted = js_beautify(toFormat, options);
					if (formatted) { 
//                        formatted = fixFirstLineFormatting(toFormat, formatted);
						editor.setText(formatted, start, end);
					}
				} else {
					toFormat = editor.getText();
					formatted = js_beautify(toFormat, options);
					if (formatted) {
						editor.setText(formatted);
					}
				}
				return true;
			});
			
			// Find actions
			// These variables are used among the various find actions:
			var textSearcher = new mTextSearcher.TextSearcher(editor, commandService, undoStack);
			editor.getTextView().setKeyBinding(new mKeyBinding.KeyBinding("f", true), "Find...");
			editor.getTextView().setAction("Find...", function() {
			
				$('#pageToolbar').remove();
			
				var pageToolbar = $('<div class="toolbar toolComposite" id="pageToolbar">'+
										'<ul class="layoutRight commandList pageActions" id="pageNavigationActions"></ul>'+
										'<div id="parameterArea" class="slideParameters slideContainer">'+
											'<span id="pageParameterArea" class="slide">'+
												'<span id="pageCommandParameters" class="parameters"></span>'+
												'<span id="pageCommandDismiss" class="parametersDismiss"></span>'+
											'</span>'+
										'</div>'+
									'</div>');

				$(editor._domNode).prepend(pageToolbar);
									
				var selection = editor.getSelection();
				var searchString = "";
				if (selection.end > selection.start) {
					var model = editor.getModel();
					searchString = model.getText(selection.start, selection.end);
				} else if (editor.lastSearchTerm){
					searchString = editor.lastSearchTerm;
				}
				textSearcher.buildToolBar(searchString);

				$('#closebox').click(textSearcher._commandService.closeParameterCollector);
	
				$('.scriptededitor').off('keydown');
				$('.scriptededitor').on('keydown', function(e){
					if (e.keyCode === 27){
						textSearcher._commandService.closeParameterCollector();
					}
				});
				
				 $('#localSearchFindWith').off('keyup');
				 $('#localSearchFindWith').on('keyup', function(e){
					editor.lastSearchTerm = $('#localSearchFindWith').val();
				 });

				return true;
			});
			
			// save binding
			editor.getTextView().setKeyBinding(new mKeyBinding.KeyBinding("s", true), "Save");
			editor.getTextView().setAction("Save", function() {
				var text = editor.getTextView().getText();
				var xhr = new XMLHttpRequest();
				try {
					// Make a multipart form submission otherwise the data gets encoded (CRLF pairs inserted for newlines)
					// As described here: http://www.w3.org/TR/html4/interact/forms.html - may need to add some content
					// type settings to dispositions, for funky charsets
					var boundary = Math.random().toString().substr(2);
					//var url = 'http://localhost:7261/put?file=' + window.location.search.substr(1);
					var url = 'http://localhost:7261/put?file=' + filePath;
					//				console.log("url is "+url);
					//				console.log("Saving file, length is "+text.length);
					xhr.open("POST", url, true);
					xhr.setRequestHeader('Content-Type', 'multipart/form-data;charset=utf-8; boundary=' + boundary);
					var payload = '';
					payload += '--' + boundary + '\r\n';
					payload += 'Content-Disposition: form-data; name="data"\r\n\r\n';
					payload += text;
					payload += '\r\n';
					payload += '--' + boundary + '\r\n';
					payload += 'Content-Disposition: form-data; name="length"\r\n\r\n';
					payload += text.length;
					payload += '\r\n';
					payload += '--' + boundary + '--';
					// console.log("payload is "+payload);
	/*
					xhrobj.setRequestHeader('Content-Type','application/x-www-form-urlencoded');
					xhrobj.setRequestHeader('Connection','close');
					*/
					//var params = "file="+filePath+"&"text=";
					xhr.onreadystatechange = function() {
						if (xhr.readyState === 4) {
							if (xhr.status === 200) {  
								// console.log("Saved OK I think: "+xhr.status);
								editor.setInput(null, null, null, true);
								afterSaveSuccess(filePath);
							} else {
								var message = "Failed to save the file. RC:" + xhr.status + " Details:" + xhr.responseText;
								statusReporter(message, true);
								console.error(message);
							}
							postSave(text);
						}
					};
					xhr.send(payload);
				} catch (e) {
					console.log("xhr failed " + e);
				}
				return true;
			});
			
		};

		// based on the stuff from embeddededitor.js (orion sample).
		var syntaxHighlighter = {
			styler: null,

			highlight: function(path, editor) {
				if (this.styler) {
					this.styler.destroy();
					this.styler = null;
				}
				if (path) {
					var splits = path.split(".");
					var extension = splits.pop().toLowerCase();
					var textView = editor.getTextView();
					var annotationModel = editor.getAnnotationModel();
					if (splits.length > 0) {
						switch (extension) {
						case "js":
						case "java":
						case "css":
							this.styler = new mTextStyler.TextStyler(textView, extension, annotationModel);
							break;
						case "html":
							this.styler = new mTextMateStyler.TextMateStyler(textView, new mHtmlGrammar.HtmlGrammar());
							break;
						}
					}
				}
			}
		};
		
		var dirtyIndicator = "";
		var status = "";

		var statusReporter = function(message, isError) {
			if (isError) {
				status = "ERROR: " + message;
			} else {
				status = message;
			}
			
			if(editor.type === 'main'){

			} else if (editor.type === 'sub'){

			}

			document.getElementById("status").innerHTML = dirtyIndicator + status;
		};

		editor = new mEditor.Editor({
			textViewFactory: textViewFactory,
			undoStackFactory: new mEditorFeatures.UndoFactory(),
			annotationFactory: annotationFactory,
			lineNumberRulerFactory: new mEditorFeatures.LineNumberRulerFactory(),
			contentAssistFactory: contentAssistFactory,
			keyBindingFactory: keyBindingFactory,
			statusReporter: statusReporter,
			domNode: domNode
		});

		editor.jsContentAssistant = jsContentAssistant;
		
		editor.addEventListener("DirtyChanged", function(evt) {
			dirtyIndicator = editor.isDirty()?"You have unsaved changes.  ":"";
			setEditorTitle(editor, fileName);
			document.getElementById("status").innerHTML = dirtyIndicator + status;
		});

		editor.installTextView(function(buffer, offset) {
			if (isJS) {
				return jsContentAssistant.computeHover(buffer, offset);
			} else {
				return null;
			}
		});
		editor.setInput("Content", null, "Initizal contentz.");
		
		/*function that fixes Firefox cursor problem*/
		editor.cursorFix = function(focusTarget){
			$('header').append('<a href="#" id="cursor_fix">.</a>');
			$('#cursor_fix').focus().remove();
			
			setTimeout(function(){
				$('.textviewContent', focusTarget).focus();
			}, 0);
		};
		
		editor.refreshEditorFeatures = function(text){
			syntaxHighlighter.highlight(filePath, editor);
			editor.highlightAnnotations();
			postSave(text);
		};
		
		editor.getFilePath = function(){
			return filePath;
		};
		
		editor.findDefinition = function(offset) {
			if (isJS) {
				var text = editor.getTextView().getText();
				// first check the moduleVerifier since it's faster
				var definition = mModuleVerifier.findModulePath(text, indexer, offset, offset);
				if (!definition) {
					definition = editor.jsContentAssistant.findDefinition(text, offset);
				}
				return definition;
			}
		};
		
        //Add exec key bindings defined based on what's in the .scripted file
        require('scripted/exec/exec-keys').installOn(editor);
		
		var xhrobj = new XMLHttpRequest();
		try {
			var url = 'http://localhost:7261/get?file=' + filePath;
			//console.log("Getting contents for " + url);
			xhrobj.open("GET", url, false); // synchronous xhr
			
			// set specific header to bypass the cache
			// TODO FIXADE we should be saving the etag header of the original file request and caching it in local storage
			// See http://en.wikipedia.org/wiki/HTTP_ETag
			xhrobj.setRequestHeader('If-None-Match', ''+new Date().getTime());
			xhrobj.send();
			//xhrobj.onreadystatechange = function() {
			if (xhrobj.readyState === 4) {
				if (xhrobj.status === 200) {
					editor.setInput("Content", null, xhrobj.responseText);
//						setTimeout(function() {
//						window.comms.editor.send(JSON.stringify({"registereditor":window.location.search.substr(1)}));
//						},3000);
					// As per comment at end of editor.js - doing this here will ensure the event handlers
					// are in the right order (so syntax highlighter then annotation handler)

					syntaxHighlighter.highlight(filePath, editor);
					editor.highlightAnnotations();
					postSave(xhrobj.responseText);
					
					// force caret location if required
					//window.onpopstate();
					editor.loadResponse = "success";
				} else {
					// something went wrong
					if (xhrobj.status === 500 && xhrobj.responseText === 'File not found') {
						// that is OK, start with an empty file
						editor.setInput("Content", null, "");
						syntaxHighlighter.highlight(filePath, editor);
						editor.highlightAnnotations();
						postSave(xhrobj.responseText);
						
						// force caret location if required
						//window.onpopstate();
					} else if (xhrobj.status === 500 && xhrobj.responseText === 'File is a directory') {
						$('#editor').css('display','none');
					} else if (xhrobj.status === 204 || xhrobj.status === 1223) { //IE9 turns '204' status codes into '1223'...
						alert('cannot open a binary file');
						//ret = false;
					} else if (xhrobj.status === 500 && xhrobj.responseText === "Error: Error: UNKNOWN, read64") {
						// This occurs on windows, the server side doesn't get an EISDIR rc so cannot easily
						// tell the client it was a directory - here we just 'assume'
						//	console.log("Unexpected server response, rc="+xhrobj.status+" err="+xhrobj.responseText);
						editor.loadResponse = "error";
					} else {
						editor.setInput("Content", null, xhrobj.responseText);
					}
				}
			}
			//};
			//xhrobj.send();
		} catch (e) {
			console.log("xhr failed " + e);
			editor.loadResponse = "failed - exception";
		}
		
		if (window.scripted && window.scripted.config) {
			var editorUpdateRequired = false;
			if(window.scripted.config.ui && window.scripted.config.ui.font){
				$('.textviewContainer').css('font-family', window.scripted.config.ui.font);
				$('#contentassist').css('font-family', window.scripted.config.ui.font);
				editorUpdateRequired = true;
			}
			if(window.scripted.config.ui && window.scripted.config.ui.font_size){
				$('.textviewContainer').css('font-size', window.scripted.config.ui.font_size);
				editorUpdateRequired = true; 
			}
			if(window.scripted.config.ui && window.scripted.config.ui.content_assist_font_size){
				$('#contentassist').css('font-size', window.scripted.config.ui.content_assist_font_size);
				editorUpdateRequired = true;
			}
			if (editorUpdateRequired) {
				editor.getTextView().update(true);
			}
		}
		
		editor.type = editorType;
		
		require("scripted/exec/exec-after-save").installOn(editor);
	
		return editor;
	};

	return {
		makeEditor: makeEditor
	};
});
