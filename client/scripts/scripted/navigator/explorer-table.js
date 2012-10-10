/*******************************************************************************
 * @license
 * Copyright (c) 2009 - 2012 IBM Corporation, VMware and others.
 * All rights reserved. This program and the accompanying materials are made 
 * available under the terms of the Eclipse Public License v1.0 
 * (http://www.eclipse.org/legal/epl-v10.html), and the Eclipse Distribution 
 * License v1.0 (http://www.eclipse.org/org/documents/edl-v10.html). 
 * 
 * Contributors: 
 *  IBM Corporation - initial API and implementation
 *     Andy Clement - hacked to support our needs in scripted (needs more work)
 ******************************************************************************/

/*global define window uri scriptedLogger alert $ */
/*jslint regexp:false browser:true forin:true*/

define('scripted/navigator/explorer-table', ['require', 'dojo', 'scripted/navigator/explorer', "orion/editor/jslintdriver", "jquery", "scripted/utils/fileLoader"
//,'dijit', 'orion/util', 'orion/explorer', 'orion/explorerNavHandler', 'orion/breadcrumbs', 'orion/fileCommands', 'orion/extensionCommands', 'orion/contentTypes', 'dojo/number' 
], function(require, dojo, mExplorer, mJslintDriver, mJquery, mFileLoader /*,dijit, mUtil, mNavHandler, mBreadcrumbs, mFileCommands, mExtensionCommands*/ ) {

	/**
	 * Tree model used by the FileExplorer
	 * TODO: Consolidate with eclipse.TreeModel.
	 */

	function Model(serviceRegistry, root, fileClient, treeId) {
		this.registry = serviceRegistry;
		this.root = root;
		this.fileClient = fileClient;
		this.treeId = treeId;
	}
	Model.prototype = new mExplorer.ExplorerModel();
	Model.prototype.getRoot = function(onItem) {
		onItem(this.root);
	};

	function processNavigatorParent(parent, children) {
		//link the parent and children together
		parent.children = children;
		for (var e in children) {
			var child = children[e];
			child.parent = parent;
		}
/*
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
*/
	}


	Model.prototype.getChildren = function( /* dojo.data.Item */ parentItem, /* function(items) */ onComplete) {
		// the parent already has the children fetched
		if (parentItem.children) {
			onComplete(parentItem.children);
		} else if (parentItem.Directory !== undefined && parentItem.Directory === false) {
			onComplete([]);
		} else if (parentItem.Location) {
/*
			this.fileClient.fetchChildren(parentItem.ChildrenLocation).then( 
				dojo.hitch(this, function(children) {
					mUtil.processNavigatorParent(parentItem, children);
					onComplete(children);
				})
			);
*/
			if (parentItem.ChildrenLocation) {
				var xhrobj = new XMLHttpRequest();
				try {
					var url = 'http://localhost:7261/fs_list/' + parentItem.ChildrenLocation;
					scriptedLogger.debug("url is " + url, "EXPLORER_TABLE");
					xhrobj.open("GET", url, true);
					xhrobj.onreadystatechange = function() {
						if (xhrobj.readyState === 4) {
							// TODO status =200 should proceed otherwise error (xhrObj.status     ==200)
	/*
	                                                  window.editor2.setInput("Content", null, xhrobj2.responseText);
	                                                  window.editor2.thefile = files[1];
	                                                  // TODO not sure this is the right bit to 'set' but it does work
	                                                  e2fp.firstElementChild.innerText=files[1];
	*/
							var children = JSON.parse(xhrobj.responseText).children;
							// skip kids that start '.'
							if (children) {
								var newchildren = [];
								for (var i=0;i<children.length;i++) {
									var kid = children[i];
									if (kid.name.lastIndexOf('.',0)!==0) {
										newchildren.push(kid);
									}
								}
								children = newchildren;
								children = children.sort(function (a,b) {
									return (a.name.toLowerCase().localeCompare(b.name.toLowerCase()));
								});
							}
							processNavigatorParent(parentItem, children);
							onComplete(children);
	/*
	place.treeRoot=JSON.parse(xhrobj.responseText);
	  place.model = new Model(place.registry, place.treeRoot, null);
	  place.createTree(place.parentId,place.model,{onCollapse: function(model) {
	    if (self.navHandler) {
	      self.navHandler.onCollapse(model);
	    }
	  }
	  });
	*/
						}
					};
					xhrobj.send();
				} catch (e) {
					scriptedLogger.error("xhr failed " + e, "EXPLORER_TABLE");
				}
			}
			
		} else {
			onComplete([]);
		}
	};
	Model.prototype.constructor = Model;

	/**
	 * Renders json items into columns in the tree
	 */

	function FileRenderer(options, explorer, commandService, contentTypeService) {
		this.explorer = explorer;
		this.commandService = commandService;
		this.contentTypeService = contentTypeService;
		this.openWithCommands = null;
		this.actionScopeId = "fileFolderCommands";
		this._init(options);
		this.target = "_self";
	}
	FileRenderer.prototype = new mExplorer.SelectionRenderer();

	// we are really only using the header for a spacer at this point.
	FileRenderer.prototype.getCellHeaderElement = function(col_no) {
		switch (col_no) {
		case 0:
		case 1:
		case 2:
			return dojo.create("th", {
				style: "height: 8px;"
			});
		}
	};

	//This is an optional function for explorerNavHandler. It provides the div with the "href" attribute.
	//The explorerNavHandler hooked up by the explorer will check if the href exist as the attribute and react on enter key press.
	FileRenderer.prototype.getRowActionElement = function(tableRowId) {
		return dojo.byId(tableRowId + "NameColumn");
	};

	FileRenderer.prototype.onRowIterate = function(model) {
		if (this.explorer.navHandler) {
			this.explorer.navHandler.cursorOn(model);
		}
	};

	FileRenderer.prototype.setTarget = function(target) {
		this.target = target;

		dojo.query(".targetSelector").forEach(function(node, index, arr) {
			node.target = target;
		});
	};

	FileRenderer.prototype.getCellElement = function(col_no, item, tableRow) {
		function isImage(contentType) {
			switch (contentType && contentType.id) {
			case "image.jpeg":
			case "image.png":
			case "image.gif":
			case "image.ico":
			case "image.tiff":
			case "image.svg":
				return true;
			}
			return false;
		}

		function addImageToLink(contentType, link) {
			switch (contentType && contentType.id) {
			case "image.jpeg":
			case "image.png":
			case "image.gif":
			case "image.ico":
			case "image.tiff":
			case "image.svg":
				var thumbnail = dojo.create("img", {
					src: item.Location
				}, link, "last");
				dojo.addClass(thumbnail, "thumbnail");
				break;
			default:
				if (contentType && contentType.image) {
					var image = dojo.create("img", {
						src: contentType.image
					}, link, "last");
					// to minimize the height/width in case of a large one
					dojo.addClass(image, "thumbnail");
				} else {
					var fileIcon = dojo.create("span", null, link, "last");
					dojo.addClass(fileIcon, "core-sprite-file_model modelDecorationSprite");
				}
			}
		}

		switch (col_no) {

		case 0:
			var col = document.createElement('td');
			
			var span = dojo.create("span", {
				id: tableRow.id + "Actions"
			}, col, "only");
			var link;
			//			scriptedLogger.debug("name is '"+item.name+"'", "EXPLORER_TABLE");
			if (item.directory) {
				this.getExpandImage(tableRow, span);
			} else if (item.name === "") {
				var fileIcon1 = dojo.create("span", null, span, "last");
				dojo.addClass(fileIcon1, "core-sprite-blank_model modelDecorationSprite2");
			} else {
				var fileIcon = dojo.create("span", null, span, "last");
				//link = dojo.create("a", {className: "navlink targetSelector", id: tableRow.id+"NameColumn", href: href, target:this.target}, span, "last");
				dojo.addClass(fileIcon, "core-sprite-blank_model modelDecorationSprite2");
				//               dojo.addClass(fileIcon, "core-sprite-file_model modelDecorationSprite");
			}
/*
			if (item.Directory) {
				// defined in ExplorerRenderer.  Sets up the expand/collapse behavior
				this.getExpandImage(tableRow, span);
				link = dojo.create("a", {className: "navlinkonpage", id: tableRow.id+"NameColumn", href: "#" + item.ChildrenLocation}, span, "last");
				dojo.place(document.createTextNode(item.Name), link, "last");
			} else {
				var i;			
				// Images: always generate link to file. Non-images: use the "open with" href if one matches,
				// otherwise use default editor.
				if (!this.openWithCommands) {
if (mExtensionCommands) {
					this.openWithCommands = mExtensionCommands.getOpenWithCommands(this.commandService);
					for (i=0; i < this.openWithCommands.length; i++) {
						if (this.openWithCommands[i].isEditor === "default") {
							this.defaultEditor = this.openWithCommands[i];
						}
					}
}
				}
				var href = item.Location, foundEditor = false;
				for (i=0; i < this.openWithCommands.length; i++) {
					var openWithCommand = this.openWithCommands[i];
					if (openWithCommand.visibleWhen(item)) {
						href = openWithCommand.hrefCallback({items: item});
						foundEditor = true;
						break; // use the first one
					}
				}
				var contentType = this.contentTypeService.getFileContentType(item);
				if (!foundEditor && this.defaultEditor && !isImage(contentType)) {
					href = this.defaultEditor.hrefCallback({items: item});
				}				

				link = dojo.create("a", {className: "navlink targetSelector", id: tableRow.id+"NameColumn", href: href, target:this.target}, span, "last");
				addImageToLink(contentType, link);
				dojo.place(document.createTextNode(item.Name), link, "last");
			}
			this.commandService.renderCommands(this.actionScopeId, span, item, this.explorer, "tool");
*/
			//link = dojo.create("a", {className:"navlinkonpage",id:tableRow.id+"NameColumn", href:"#"+item.ChildrenLocation},span,"last");

			//var span2 = dojo.create("span", null, span, "last");

			var path = window.location.protocol + "//" + window.location.host + window.location.pathname + '?' + item.Location;
			if (item.directory) {
				var span2 = dojo.create("span", null, span, "last");
				// When the directory name is clicked, simulate a keypress on the expand/collapse image
				tableRow.onclick = function(event){
					$(event.currentTarget).find('.modelDecorationSprite').click();
				};
				
			} else {
				var span2 = dojo.create("a", {
					href: path
				}, span, "last");
			}

			var textnode = document.createTextNode(item.name);
			dojo.place(textnode, span2, "last");

			if (!item.directory) {
				$(span2).click(mFileLoader.clickNavigation);
			}

			return col;

//		case 1:
//			var dateColumn = document.createElement('td');
//			dojo.addClass(dateColumn, "arrowoff");
//			return dateColumn;
/*
//			if (item.LocalTimeStamp) {
//				var fileDate = new Date(item.LocalTimeStamp);
//				dateColumn.innerHTML = dojo.date.locale.format(fileDate);
//			}
//			var that = this;
//			if(this.onRowIterate){
//				dojo.connect(dateColumn, "onclick", dateColumn, function() {
//					that.onRowIterate(item);
//				});
//				dojo.connect(dateColumn, "onmouseover", dateColumn, function() {
//					dateColumn.style.cursor ="pointer";
//				});
//				dojo.connect(dateColumn, "onmouseout", dateColumn, function() {
//					dateColumn.style.cursor ="default";
//				});
//			}
			return dateColumn;
*/
			//		case 2:
			//			var sizeColumn = document.createElement('td');
			//			if (!item.Directory && typeof item.Length === "number") {
			//				var length = parseInt(item.Length, 10),
			//					kb = length / 1024;
			//				sizeColumn.innerHTML = dojo.number.format(Math.ceil(kb)) + " KB";
			//			}
			//			dojo.style(sizeColumn, "textAlign", "right");
			//			return sizeColumn;
		}
	};
	FileRenderer.prototype.constructor = FileRenderer;

	/**
	 * Creates a new file explorer.
	 * @name orion.explorer-table.FileExplorer
	 * @class A user interface component that displays a table-oriented file explorer
	 * @param {orion.serviceRegistry.ServiceRegistry} options.serviceRegistry
	 * @param {Object} options.treeRoot
	 * @param {orion.selection.Selection} options.selection
	 * @param {orion.searchClient.Searcher} options.searcher
	 * @param {orion.fileClient.FileClient} options.fileClient
	 * @param {orion.commands.CommandService} options.commandService
	 * @param {orion.core.ContentTypeService} options.contentTypeService
	 * @param {String} options.parentId
	 * @param {String} options.breadcrumbId
	 * @param {String} options.toolbarId
	 * @param {String} options.selectionToolsId
	 */

	function FileExplorer(options) {
		this.registry = options.serviceRegistry;
		this.treeRoot = options.treeRoot;
		this.selection = options.selection;
		this.searcher = options.searcher;
		this.fileClient = options.fileClient;
		this.commandService = options.commandService;
		this.contentTypeService = options.contentTypeService;
		this.parentId = options.parentId;
		this.breadcrumbId = options.breadcrumbId;
		this.toolbarId = options.toolbarId;
		this.selectionToolsId = options.selectionToolsId;
		this.model = null;
		this.myTree = null;
		this.renderer = new FileRenderer({
			checkbox: true,
			decorateAlternatingLines: true,
			cachePrefix: "Navigator"
		}, this, this.commandService, this.contentTypeService);
		this.preferences = options.preferences;
		this.setTarget();
		// TODO ASC made conditional
		if (this.preferences) {
			this.storageKey = this.preferences.listenForChangedSettings(dojo.hitch(this, 'onStorage'));
		}
	}

	FileExplorer.prototype = new mExplorer.Explorer();

	// we have changed an item on the server at the specified parent node
	FileExplorer.prototype.changedItem = function(parent) {
		var self = this;
		this.fileClient.fetchChildren(parent.ChildrenLocation).then(function(children) {
//			mUtil.processNavigatorParent(parent, children);
			//If a key board navigator is hooked up, we need to sync up the model
			if (self.navHandler) {
				self.navHandler.refreshModel(self.model);
			}
			dojo.hitch(self.myTree, self.myTree.refreshAndExpand)(parent, children);
		});
	};

	FileExplorer.prototype.getNameNode = function(item) {
		var rowId = this.model.getId(item);
		if (rowId) {
			// I know this from my renderer below.
			return dojo.byId(rowId + "NameColumn");
		}
	};

	//This is an optional function for explorerNavHandler. It changes the href of the window.locatino to navigate to the parent page.
	//The explorerNavHandler hooked up by the explorer will check if this optional function exist and call it when left arrow key hits on a top level item that is aleady collapsed.
	FileExplorer.prototype.scopeUp = function() {
		if (this.treeRoot && this.treeRoot.Parents) {
			if (this.treeRoot.Parents.length === 0) {
				window.location.href = "#";
			} else if (this.treeRoot.Parents[0].ChildrenLocation) {
				window.location.href = "#" + this.treeRoot.Parents[0].ChildrenLocation;
			}
		}
	};

	FileExplorer.prototype.setTarget = function() {

		var preferences = this.preferences;
		var renderer = this.renderer;

		// TODO ASC need default for target?
		if (preferences) {
			this.preferences.getPreferences('/settings', 2).then(function(prefs) {

				var storage = JSON.parse(prefs.get("General"));

				if (storage) {
					var target = preferences.getSetting(storage, "Navigation", "Links");

					if (target === "Open in new tab") {
						target = "_blank";
					} else {
						target = "_self";
					}

					renderer.setTarget(target);
				}
			});
		}
	};

	FileExplorer.prototype.onStorage = function(e) {
		if (e.key === this.storageKey) {
			this.setTarget();
		}
	};

	// Expand the tree if necessary and highlight the specific file
	FileExplorer.prototype.highlight = function( /*String*/ fileintree) {

		/*Remove any existing highlights*/
		var element = $('.highlightrow')[0];
		if (element){
			var index = $('.highlightrow').index();
			if (index % 2 === 1){
				$('.highlightrow').addClass('darkTreeTableRow');
			} else {
				$('.highlightrow').addClass('lightTreeTableRow');
			}
			if (element.childNodes) {
				$(element.childNodes[1]).removeClass("secondaryColumnDark");
				$(element.childNodes[1]).addClass("secondaryColumn");
			}
			$('.highlightrow').removeClass('highlightrow');
		}
	
		var self = this;
		var id = this.model.getIdFromString(fileintree);
		this._highlightingId = id;
		var element = dojo.byId(id);
		if (element === null || element === undefined) {
			function expandSection(root, splits, index) {
				if (index < (splits.length - 1)) {
					var newroot = root + "/" + splits[index];
					var stringid = self.model.getIdFromString(newroot);
					self.renderer.expand(stringid, function() {
						expandSection(newroot, splits, index + 1);
					});
				} else {
					var stringid = self.model.getIdFromString(root + "/" + splits[index]);
					var element = dojo.byId(id);
					if (element) {
						$(element).addClass("highlightrow");
	//					$(element.lastChild).addClass("arrow");
	//					$(element.lastChild).removeClass("arrowoff");
						$(element).removeClass("lightTreeTableRow");
						$(element).removeClass("darkTreeTableRow");
						if (element.childNodes) {
							$(element.childNodes[1]).removeClass("secondaryColumn");
							$(element.childNodes[1]).addClass("secondaryColumnDark");
						}
						//				element.style.fontWeight="bold";
						// call expand in case the element being highlighted is a folder
						self.renderer.expand(stringid);
					}
				}
			};
			// need to open the parents
			var root = window.fsroot;
			// root = /foo/bar
			// fileintree = /foo/bar/here/there/file.js
			var topmostparent = fileintree.substr(root.length + 1); // topmostparent = here/there/file.js
			var splits = topmostparent.split('/');
			expandSection(root, splits, 0);
		} else {
			$(element).addClass("highlightrow");
			$(element).removeClass("lightTreeTableRow");
			$(element).removeClass("darkTreeTableRow");
			$(element.childNodes[1]).removeClass("secondaryColumn");
			$(element.childNodes[1]).addClass("secondaryColumnDark");
//			$(element.lastChild).addClass("arrow");
//			$(element.lastChild).removeClass("arrowoff");
			//			element.style.fontWeight="bold";
			// call expand in case the element being highlighted is a folder
			this.renderer.expand(id);
		}
	};

	/**
	 * Load the resource at the given path.
	 * @param path The path of the resource to load
	 * @param [force] If true, force reload even if the path is unchanged. Useful
	 * when the client knows the resource underlying the current path has changed.
	 * @param postLoad a function to call after loading the resource
	 */
	FileExplorer.prototype.loadResourceList = function(path, force, postLoad) {
		// scriptedLogger.info("loadResourceList old " + this._lastHash + " new " + path, "EXPLORER_TABLE");
		// TODO ASC absolute paths... for me
		// path = mUtil.makeRelative(path);
		if (!force && path === this._lastHash) {
			return;
		}

		this._lastHash = path;
		var parent = dojo.byId(this.parentId);

		// we are refetching everything so clean up the root
		this.treeRoot = {};

		if (force || (path !== this.treeRoot.Path)) {
			//the tree root object has changed so we need to load the new one

			// Progress indicator
			var progress = dojo.byId("progress");
			if (!progress) {
				progress = dojo.create("div", {
					id: "progress"
				}, parent, "only");
			}
			dojo.empty(progress);

			var progressTimeout = setTimeout(function() {
				dojo.empty(progress);
				var b = dojo.create("b");
				dojo.place(document.createTextNode("Loading "), progress, "last");
				dojo.place(document.createTextNode(path), b, "last");
				dojo.place(b, progress, "last");
				dojo.place(document.createTextNode("..."), progress, "last");
			}, 500); // wait 500ms before displaying

			this.treeRoot.Path = path;
			var self = this;
			this.postLoad = postLoad;

			// fileClient.js:156
/*
{
	Directory: true, 
	Length: 0, 
	LocalTimeStamp: 0,
	Name: "File Servers",
	Location: "/", 
	Children: _fileSystemsRoots,
	ChildrenLocation: "/"
}
*/

			//this.treeRoot = [{Directory:true,Length:0,LocalTimeStamp:0,Name:"File Servers",Location:path,}];
			var place = this;

			var xhrobj = new XMLHttpRequest();
			try {
				var url = 'http://localhost:7261/fs_list/' + path;
				scriptedLogger.debug("url is " + url, "EXPLORER_TABLE");
				xhrobj.open("GET", url, true);
				xhrobj.onreadystatechange = function() {
					if (xhrobj.readyState === 4) {
						// TODO status =200 should proceed otherwise error (xhrObj.status     ==200)
/*
                          window.editor2.setInput("Content", null, xhrobj2.responseText);
                          window.editor2.thefile = files[1];
                          // TODO not sure this is the right bit to 'set' but it does work
                          e2fp.firstElementChild.innerText=files[1];
*/
						var response = JSON.parse(xhrobj.responseText);
						// skip kids that start '.'
						if (response.children) {
							var newchildren = [];
							for (var i=0;i<response.children.length;i++) {
								var kid = response.children[i];
								if (kid.name.lastIndexOf('.',0)!==0) {
									newchildren.push(kid);
								}
							}
							response.children = newchildren;
							response.children = response.children.sort(function (a,b) {
								return (a.name.toLowerCase().localeCompare(b.name.toLowerCase()));
							});
						}
						
						place.treeRoot = response;
						place.model = new Model(place.registry, place.treeRoot, null);
						place.createTree(place.parentId, place.model, {
							onCollapse: function(model) {
								if (self.navHandler) {
									self.navHandler.onCollapse(model);
								}
							}
						}, function() {
							if (typeof self.postLoad === "function") {
								self.postLoad();
							}
						});
					}
				};
				xhrobj.send();
			} catch (e) {
				scriptedLogger.error("xhr failed " + e, "EXPLORER_TABLE");
			}


/*
			this.fileClient.loadWorkspace(path).then(
				//do we really need hitch - could just refer to self rather than this
				dojo.hitch(self, function(loadedWorkspace) {
					clearTimeout(progressTimeout);
					//copy fields of resulting object into the tree root
					for (var i in loadedWorkspace) {
						this.treeRoot[i] = loadedWorkspace[i];
					}
					mUtil.rememberSuccessfulTraversal(this.treeRoot, this.registry);
					mUtil.processNavigatorParent(this.treeRoot, loadedWorkspace.Children);	
					//If current location is not the root, set the search location in the searcher
					this.searcher.setLocationByMetaData(this.treeRoot);
					// erase any old page title
					var breadcrumb = dojo.byId(this.breadcrumbId);
					if (breadcrumb) {
						dojo.empty(breadcrumb);
						new mBreadcrumbs.BreadCrumbs({
							container: breadcrumb, 
							resource: this.treeRoot,
							firstSegmentName: this.fileClient.fileServiceName(this.treeRoot.Path)
						});
					}
					mFileCommands.updateNavTools(this.registry, this, this.toolbarId, this.selectionToolsId, this.treeRoot);
					if (typeof postLoad === "function") {
						postLoad();
					}
					this.model = new Model(this.registry, this.treeRoot, this.fileClient);
					this.createTree(this.parentId, this.model, { onCollapse: function(model){if(self.navHandler){
																							 self.navHandler.onCollapse(model);}}});
					//Hook up iterator
					if(!this.navHandler){
						this.navHandler = new mNavHandler.ExplorerNavHandler(this);
					}
					this.navHandler.refreshModel(this.model);
					this.navHandler.cursorOn();
					this.onchange && this.onchange(this.treeRoot);
				}),
				dojo.hitch(self, function(error) {
					clearTimeout(progressTimeout);
					// Show an error message when a problem happens during getting the workspace
					if (error.status !== null && error.status !== 401){
						dojo.place(document.createTextNode("Sorry, an error occurred: " + error.message), progress, "only");
					}
				})
			);
*/
		}
	};
	/**
	 * Clients can connect to this function to receive notification when the root item changes.
	 * @param {Object} item
	 */
	FileExplorer.prototype.onchange = function(item) {};
	FileExplorer.prototype.constructor = FileExplorer;

	//return module exports
	return {
		FileExplorer: FileExplorer
	};
});
