/*******************************************************************************
 * @license
 * Copyright (c) 2009, 2011 IBM Corporation and others.
 * All rights reserved. This program and the accompanying materials are made 
 * available under the terms of the Eclipse Public License v1.0 
 * (http://www.eclipse.org/legal/epl-v10.html), and the Eclipse Distribution 
 * License v1.0 (http://www.eclipse.org/org/documents/edl-v10.html). 
 *
 * Contributors: IBM Corporation - initial API and implementation
 *******************************************************************************/
/*global define window document navigator*/

define(['dojo', 'dijit', 'dojo/hash', 'dijit/form/ValidationTextBox'], function(dojo, dijit) {
                
	/**
	 * This class contains static utility methods. It is not intended to be instantiated.
	 * @class This class contains static utility methods.
	 * @name orion.util
	 */

	function getUserKeyString(binding) {
		var userString = "";
		var isMac = navigator.platform.indexOf("Mac") !== -1;
	
		if (binding.mod1) {
			if (isMac) {
				userString+="Cmd+";
			} else {
				userString+="Ctrl+";
			}
		}
		if (binding.mod2) {
			userString += "Shift+";
		}
		if (binding.mod3) {
			userString += "Alt+";
		}
		if (binding.mod4 && isMac) {
			userString += "Ctrl+";
		}
		if (binding.alphaKey) {
			return userString+binding.alphaKey;
		}
		for (var keyName in dojo.keys) {
			if (typeof(dojo.keys[keyName] === "number")) {
				if (dojo.keys[keyName] === binding.keyCode) {
					return userString+keyName;
				}
			}
		}
		var character;
		switch (binding.keyCode) {
			case 59:
				character = binding.mod2 ? ":" : ";";
				break;
			case 61:
				character = binding.mod2 ? "+" : "=";
				break;
			case 188:
				character = binding.mod2 ? "<" : ",";
				break;
			case 190:
				character = binding.mod2 ? ">" : ".";
				break;
			case 191:
				character = binding.mod2 ? "?" : "/";
				break;
			case 192:
				character = binding.mod2 ? "~" : "`";
				break;
			case 219:
				character = binding.mod2 ? "{" : "[";
				break;
			case 220:
				character = binding.mod2 ? "|" : "\\";
				break;
			case 221:
				character = binding.mod2 ? "}" : "]";
				break;
			case 222:
				character = binding.mod2 ? '"' : "'";
				break;
			}
		if (character) {
			return userString+character;
		}
		return userString+String.fromCharCode(binding.keyCode);
	}

	/**
	 * Opens a dialog near the given DOM node
	 * @name orion.util#openDialog
	 * @function
	 */
	function openDialog(dialog, refNode) {
		dialog.startup();
		if (typeof refNode === "string") {
			var node = dojo.byId(refNode);
			if (!node) {
				node = dijit.byId(refNode);
				if (node) {
					node = node.domNode;
				}
			}
			if (node) {
				refNode = node;
			} else {
				refNode = null;
			}
		}
		if (refNode) {
			var pos= dojo.position(refNode); 
			// reaching into internal methods.  It seems there is not a public way.
			dialog._setStyleAttr("left:" + (pos.x + 16) + "px !important;");
			dialog._setStyleAttr("top:" + (pos.y + 16) + "px !important;");
		}
		dialog.show();
	}
	
	function getUserText(id, refNode, shouldHideRefNode, initialText, onComplete, onEditDestroy, promptMessage, selectTo, isInitialValid) {
		/** @return function(event) */
		var handler = function(isKeyEvent) {
			return function(event) {
				var editBox = dijit.byId(id),
					newValue = editBox.get("value");
				if (isKeyEvent && event.keyCode === dojo.keys.ESCAPE) {
					if (shouldHideRefNode) {
						dojo.style(refNode, "display", "inline");
					}
					// editBox.getPromptMessage(false);  // to get rid of prompting tooltip
					editBox.destroyRecursive();
					if (onEditDestroy) {
						onEditDestroy();
					}
					return;
				}
				if (isKeyEvent && event.keyCode !== dojo.keys.ENTER) {
					return;
				} else if (!editBox.isValid() || (!isInitialValid && newValue === initialText)) {
					// No change; restore the old refnode
					if (shouldHideRefNode) {
						dojo.style(refNode, "display", "inline");
					}
				} else {
					onComplete(newValue);
				}
				// editBox.getPromptMessage(false); // to get rid of prompting tooltip
				editBox.destroyRecursive();
				if (onEditDestroy) {
					onEditDestroy();
				}
			};
		};
	
		// Swap in an editable text field
		var editBox = new dijit.form.ValidationTextBox({
			id: id,
			required: true, // disallows empty string
			value: initialText || ""
			// promptMessage: promptMessage  // ignore until we can reliably dismiss this on destroy
		});
		dojo.place(editBox.domNode, refNode, "after");
		dojo.addClass(editBox.domNode, "userEditBoxPrompt");
		if (shouldHideRefNode) {
			dojo.style(refNode, "display", "none");
		}				
		dojo.connect(editBox, "onKeyDown", handler(true));
		dojo.connect(editBox, "onBlur", handler(false));
		window.setTimeout(function() { 
			editBox.focus(); 
			if (initialText) {
				var box = dojo.byId(id);
				var end = selectTo ? initialText.indexOf(selectTo) : -1;
				if (end > 0) {
					dijit.selectInputText(box, 0, end);
				} else {
					box.select();
				}
			}
		}, 0);
	}
	
	/**
	 * Returns whether the given event should cause a reference
	 * to open in a new window or not.
	 * @param {Object} event The key event
	 * @name orion.util#openInNewWindow
	 * @function
	 */
	function openInNewWindow(event) {
		var isMac = window.navigator.platform.indexOf("Mac") !== -1;
		return (isMac && event.metaKey) || (!isMac && event.ctrlKey);
	}
	
	/**
	 * Opens a link in response to some event. Whether the link
	 * is opened in the same window or a new window depends on the event
	 * @param {String} href The link location
	 * @name orion.util#followLink
	 * @function
	 */
	function followLink(href, event) {
		if (event && openInNewWindow(event)) {
			window.open(href);
		} else {
			window.location = href;
		}
	}

	function makeRelative(location) {
		if (!location) {
			return location;
		}
		var nonHash = window.location.href.split('#')[0];
		var hostName = nonHash.substring(0, nonHash.length - window.location.pathname.length);
		if (location.indexOf(hostName) === 0) {
			return location.substring(hostName.length);
		}
		return location;
	}
	
	function makeFullPath(location) {
		if (!location) {
			return location;
		}
		var nonHash = window.location.href.split('#')[0];
		var hostName = nonHash.substring(0, nonHash.length - window.location.pathname.length);
		return (hostName + location);
	}
	
	/**
	 * Determines if the path represents the workspace root
	 * @name orion.util#isAtRoot
	 * @function
	 */
	function isAtRoot(path) {
		var relative = this.makeRelative(path);
		// TODO better way?
		// I thought it should be the line below but is actually the root of all workspaces
		//  return relative == '/file/';
		return relative.indexOf('/workspace') === 0;
	}
	
	
	function processNavigatorParent(parent, children) {
		//link the parent and children together
		parent.children = children;
		for (var e in children) {
			var child = children[e];
			child.parent=parent;
		}
		// not ideal, but for now, sort here so it's done in one place.
		// this should really be something pluggable that the UI defines
		parent.children.sort(function(a, b) {
			var isDir1 = a.Directory;
			var isDir2 = b.Directory;
			if (isDir1 !== isDir2) {
				return isDir1 ? -1 : 1;
			}
			var n1 = a.Name && a.Name.toLowerCase();
			var n2 = b.Name && b.Name.toLowerCase();
			if (n1 < n2) { return -1; }
			if (n1 > n2) { return 1; }
			return 0;
		}); 
	}
	
	function rememberSuccessfulTraversal(item, registry) {
		if (item.Parents && item.Parents.length === 0) {
			registry.getService("orion.core.preference").getPreferences("/window/recent").then(function(prefs){
				var projects = prefs.get("projects");
				if (typeof projects === "string") {
					projects = JSON.parse(projects);
				}
				var storedProjects = [];
				if (projects && projects.length && projects.length > 0) {
					for (var k=0; k<projects.length; k++) {
						if (projects[k].location !== item.ChildrenLocation && projects[k].name !== item.Name) {
							storedProjects.push(projects[k]);
						}
					}
					storedProjects.push({name: item.Name, location: item.ChildrenLocation});
				} else {
					storedProjects.push({name: item.Name, location: item.ChildrenLocation});
				}
				if (storedProjects.length > 5) {
					storedProjects= storedProjects.slice(-5, storedProjects.length);
				}
				prefs.put("projects", storedProjects);
			});
		}
	}
	
	/**
	 * Returns the text contained by a DOM node.
	 * @param {DomNode} node
	 * @returns {String} The text contained by node. Note that treatment of whitespace 
	 * and child nodes is not consistent across browsers.
	 * @name orion.util#getText
	 * @function
	 */
	function getText(node) {
		return typeof(node.textContent) !== "undefined" ? node.textContent : node.innerText;
	}
	
	/**
	 * Escapes HTML in string. Use this to sanitize user input that is destined for innerHTML.
	 * @param {String} string
	 * @returns {String} The string with HTML safely escaped.
	 * @name orion.util#safeText
	 * @function
	 */
	function safeText(string) {
		return getText(document.createTextNode(string));
	}
	
	/**
	 * Removes all children of node and replaces them with a single text node containing text.
	 * HTML is safely escaped.
	 * @param {DomNode} node
	 * @param {String} text
	 */
	function setText(node, text) {
		if (typeof(node.textContent) !== "undefined") {
			node.textContent = text;
		} else {
			node.innerText = text;
		}
	}
	
	/**
	 * Create a stylized pane heading.
	 * @param {DomNode} parent the parent node of the title element
	 * @param {String} the string to use as the heading id. It will also be used to prefix any generated id's.
	 * @param {String} headingLabel the pane heading text
	 * @param {Boolean} isAuxStyle specifies whether heading is in an auxiliary pane or main pane
	 * @param {String} headingId the id for the heading label.  Optional
	 * @param {String} commandId the id for command tools.  Optional
	 * @param {Object} command service for rendering commands.  Optional, no commands are rendered if not specified.
	 * @param {Object} the handler for commands.  Optional.  
	 */
	function createPaneHeading(parent, id, headingLabel, isAuxStyle, headingId, commandId, commandService, handler) {
		headingId = headingId || id+"heading";
		commandId = commandId || id+"commands";
		var paneHeadingFragment = 
			'<div class="toolComposite" id="' + id + '">' +
				'<div class="layoutLeft" id="' + id + '"><span class="paneTitle" id="' + headingId + '">' + headingLabel + '</span></div>' +
				'<ul class="layoutRight commandList sectionActions" id="' + commandId + '"></ul>' +
				'<div id="' + parent.id + 'slideContainer" class="layoutBlock slideParameters slideContainer">' +
					'<span id="' + parent.id + 'slideOut" class="slide">' +
						'<span id="' + parent.id + 'pageCommandParameters" class="parameters"></span>' +
						'<span id="' + parent.id + 'pageCommandDismiss" class="parametersDismiss"></span>' +
					'</span>' +
				'</div>'+
			'</div>';
			
		dojo.place(paneHeadingFragment, parent, "last");
		if (isAuxStyle) {
			dojo.addClass(id, "auxpaneHeading");
		} else {
			dojo.addClass(id, "paneHeading");
		}
		if (commandService) {
			commandService.renderCommands(commandId, dojo.byId(commandId), handler, handler, "button");
		}
		return dojo.byId(id);
	}
	
	/**
	 * Force a layout in the parent tree of the specified node, if there are layout managers assigned.
	 *
	 * @param {DomNode} node the node triggering new layout.
	 */
	function forceLayout(node) {
		if (typeof node === "string") {
			node = dojo.byId(node);
		}
		while (node) {
			var widget = dijit.byId(node.id);
			if (widget && typeof widget.layout === "function") {
				widget.layout();
				return;
			}
			node = node.parentNode;
		}
	}
	
	/**
	 * Utility method for saving file contents to a specified location
	 */
	function saveFileContents(fileClient, targetMetadata, contents, afterSave) {
		var etag = targetMetadata.ETag;
		var args = { "ETag" : etag };
		fileClient.write(targetMetadata.Location, contents, args).then(
			function(result) {
				if (afterSave) {
					afterSave();
				}
			},
			/* error handling */
			function(error) {
				// expected error - HTTP 412 Precondition Failed 
				// occurs when file is out of sync with the server
				if (error.status === 412) {
					var forceSave = window.confirm("Resource is out of sync with the server. Do you want to save it anyway?");
					if (forceSave) {
						// repeat save operation, but without ETag 
						fileClient.write(targetMetadata.Location, contents).then(
							function(result) {
									targetMetadata.ETag = result.ETag;
									if (afterSave) {
										afterSave();
									}
							}
						);
					}
				}
				// unknown error
				else {
					error.log = true;
				}
			}
		);
	}
	
	/**
	 * Split file contents into lines. It also handles the mixed line endings with "\n", "\r" and "\r\n".
	 *
	 * @param {String} text The file contetns.
	 * @returns {Array} Split file lines. 
	 * @name orion.util#splitFile
	 * @function
	 */
	function splitFile(text) {
		var cr = 0, lf = 0, index = 0, start = 0;
		var splitLines = [];
		while (true) {
			if (cr !== -1 && cr <= index) { 
				cr = text.indexOf("\r", index); 
			}
			if (lf !== -1 && lf <= index) { 
				lf = text.indexOf("\n", index); 
			}
			if (lf === -1 && cr === -1) {
				break; 
			}
			var offset = 1;
			if (cr !== -1 && lf !== -1) {
				if (cr + 1 === lf) {
					offset = 2;
					index = lf + 1;
				} else {
					index = (cr < lf ? cr : lf) + 1;
				}
			} else if (cr !== -1) {
				index = cr + 1;
			} else {
				index = lf + 1;
			}
			splitLines.push(text.substring(start, index - offset));
			start = index;
		}
		return splitLines;
	}
	
	function formatMessage(msg) {
		var args = arguments;
		return msg.replace(/\$\{([^\}]+)\}/g, function(str, index) { return args[(index << 0) + 1]; });
	}
	
	//return module exports
	return {
		getUserKeyString: getUserKeyString,
		openDialog: openDialog,
		getUserText: getUserText,
		openInNewWindow: openInNewWindow,
		followLink: followLink,
		makeRelative: makeRelative,
		makeFullPath: makeFullPath,
		isAtRoot: isAtRoot,
		processNavigatorParent: processNavigatorParent,
		rememberSuccessfulTraversal: rememberSuccessfulTraversal,
		getText: getText,
		safeText: safeText,
		setText: setText,
		createPaneHeading: createPaneHeading,
		forceLayout: forceLayout,
		saveFileContents: saveFileContents,
		splitFile: splitFile,
		formatMessage: formatMessage
	};
});

