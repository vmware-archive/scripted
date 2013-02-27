/*******************************************************************************
 * @license Copyright (c) 2012 - 2013 VMware, Inc. All Rights Reserved. THIS FILE IS
 *          PROVIDED UNDER THE TERMS OF THE ECLIPSE PUBLIC LICENSE
 *          ("AGREEMENT"). ANY USE, REPRODUCTION OR DISTRIBUTION OF THIS FILE
 *          CONSTITUTES RECIPIENTS ACCEPTANCE OF THE AGREEMENT. You can obtain a
 *          current copy of the Eclipse Public License from
 *          http://www.opensource.org/licenses/eclipse-1.0.php
 *
 * Contributors: Nieraj Singh - initial implementation
 ******************************************************************************/
/*global define window $*/
/*jslint browser:true jquery:true */

define(
['scripted/contextmenus/contextmenuprovider', "scriptedLogger", 'jquery'],

function(contextMenuProvider, scriptedLogger, $) {

	var loggingCategory = "CONTEXT_MENU";

	var contextMenuClass = "context_menu";

	var contextMenuItemClass = "context_menu_item";

	var currentContextMenu = {};

	var hideContextMenu;

	var clickHandler = function(menuItem, menuTable, contextEvent) {

			if (menuItem.handler && (typeof menuItem.handler === "function")) {
				hideContextMenu(menuTable);
				menuItem.handler(contextEvent);
			}
		};

	var addClickHandler = function(menuDiv, menuItem, menuTable,
		contextEvent) {

			// This handles both the case where a user wants to invoke the context menu action
			// using a hold right click mousedown and release, as well as left-clicking on the
			// context menu action.
			menuDiv.mouseup(function(event) {
				clickHandler(menuItem, menuTable, contextEvent);
			});

			// Since there is also a window mousedown event handler that closes the context menu
			// when  user clicks anywhere in the window, to avoid the context menu from closing
			// when a user clicks on the context menu, add a separate mousedown event handler on the
			// context menu itself that prevents the event from propagating to the window handler. That
			// way the window handler only is called when a user clicks OUTSIDE of the context menu div
			menuDiv.mousedown(function(event) {
				event.stopPropagation();
				return false;
			});

		};

	var createContextMenu = function(menus, contextEvent) {

			if (menus) {

				if (!$.isArray(menus)) {
					menus = [menus];
				}

				var mainDiv = $('<div class="' + contextMenuClass + '"></div>');

				for (var i = 0; i < menus.length; i++) {
					var menuItem = menus[i];
					if (menuItem.name && menuItem.handler && (typeof menuItem.handler === "function")) {

						var menudiv = $('<div class="' + contextMenuItemClass + '">' + menuItem.name + '</div>');

						//Only add a click handler if the menu is enabled
						if ((typeof menuItem.isEnabled === "function") && menuItem.isEnabled()) {
							addClickHandler(menudiv, menuItem, mainDiv,
							contextEvent);
						} else {
							// Disable the menu item.
							menudiv.css("color", "grey");
							// Prevent the hover from highlighting the disabled action

							menudiv.hover(function(event) {
								$(this).css("background-color", "white");
							});
						}

						mainDiv.append(menudiv);
					}
				}


				return mainDiv;
			}

		};


	/**
	 * Part with context is the editor part where the context menu was invoked. It's not necessarily a node within the part, but the entire part (example: the navigator)
	 */
	var getPosition = function(absoluteMouseClickPosition, partWithContextMenu, contextMenu) {
			var contextMenuX = absoluteMouseClickPosition.clickX;
			var contextMenuY = absoluteMouseClickPosition.clickY;

			if (partWithContextMenu && $(partWithContextMenu).size() > 0) {

				// This is the offset of the part relative to the document. Therefore if there are any offsets, it should be taken
				// into account when positioning the context menu, as the mouse events are not relative to the part where the event occured, but
				// relative to the document
				var partOffset = $(partWithContextMenu).offset();

                // Needed to determine if there is enough space to show the context menu to the immediate bottom of the click event.
				var contextMenuHeight = $(contextMenu).height();
				var partHeight = $(partWithContextMenu).height();


				// Take into account the part offset and position to the right of the mouse click
				contextMenuX += partOffset.left;

				// as the mouse y click event is relative to the entire document, not the part, subtract any offset for the part, because the context menu is positioned relative to
				// the part, yet it should be positioned at the mouse click event.
				contextMenuY -= partOffset.top;

				// Position context menu to the immediate bottom of the mouse y click, if there is enough space to show the context menu.
				// Otherwise position to the immediate top of the y click.
				var remainingSpace = partHeight - contextMenuY;
				if (remainingSpace < contextMenuHeight) {
					contextMenuY -= contextMenuHeight;
				}

			}
            // https://github.com/scripted-editor/scripted/issues/162
			// Add 1 pixel to the vertical and horizontal positions as to avoid the right click to also close the context menu at the same time
			contextMenuX += 1;
			contextMenuY += 1;
			return {
				'x': contextMenuX,
				'y': contextMenuY
			};
		};

	var attachContextMenuEvents = function(contextMenu) {
			// Handle ESCAPE keypresses on the dialog
			$(window).on('keyup.' + contextMenuClass, function(e) {

				if (e.keyCode === 27 /*ESCAPE*/ ) {
					hideContextMenu(contextMenu);
				}
			});

			// click listener to the window so that the context menu disappear when clicking
			// outside the context menu to close it. Note that to prevent the context menu to close when a user is
			// clicking within the contextmenu, another mousedown event handler is needs to be attached to the
			// context menu dom node which prevents the mousedown event from propagating.
			$(window).on('mousedown.' + contextMenuClass, function(e) {
				hideContextMenu(contextMenu);
			});

		};

	var showContextMenu = function(context, contextMenuProvider) {

			var contextMenu = context.contextMenu;
			var eventContext = context.eventContext;
			var nodeToAttach = context.nodeToAttach;

			// Hide existing context menu
			if (currentContextMenu) {
				hideContextMenu(currentContextMenu);
			}

			// Keep reference of new context menu
			currentContextMenu = contextMenu;

			if (!contextMenu || !eventContext) {
				return;
			}

			if (contextMenu) {
				$(nodeToAttach).append(contextMenu);
			}

			var eventx = eventContext.pageX;
			var eventy = eventContext.pageY;

			// TODO: Hardcoded navigator wrapper as the context for now. Refactor when context menus should be more general
			var position = getPosition({
				clickX: eventx,
				clickY: eventy
			}, "#navigator-wrapper", contextMenu);

			// reposition context menu based on mouse click
			contextMenu.css({
				top: position.y + "px",
				left: position.x + "px"
			});

			attachContextMenuEvents(contextMenu);

			if (contextMenuProvider && contextMenuProvider.onContextMenuOpen) {
				contextMenuProvider.onContextMenuOpen(nodeToAttach);
			}
		};

	hideContextMenu = function(contextMenu) {
		if (contextMenu) {
			$(contextMenu).remove();
		}
		// Remove any event listeners on window
		$(window).off('keyup.' + contextMenuClass);

		$(window).off('mousedown.' + contextMenuClass);
	};

	/**
	 * nodecontext to which the context menus should be attached too.It should be a DOM element.
	 */
	var setContextMenu = function(nodeContext, contextMenuProvider) {

			var error = null;
			if (!nodeContext) {
				error = "No context provided for context menu. Unable to open context menu.";
			} else if (!$(nodeContext).size()) {
				error = "Unable to find context element to display its context menu " + nodeContext.toString();
			}

			if (error) {
				scriptedLogger.error(error, loggingCategory);
				return;
			}

			$(function() {
				$(nodeContext).contextmenu(

				function(e) {
					var menus = contextMenuProvider.getContextMenusForSelection(
					nodeContext);
					if (menus) {
						var cmenu = createContextMenu(
						menus, e);
						if (cmenu) {

							showContextMenu({
								contextMenu: cmenu,
								eventContext: e,
								nodeToAttach: nodeContext
							}, contextMenuProvider);

							e.preventDefault();

							// To avoid context menus from appearing for nested DOM elements, stop event propagation to any parents
							e.stopPropagation();
						}
					}
				});
			});

		};

	var setExplorerContextMenu = function(nodeContext, explorer) {
			var provider = contextMenuProvider.getContextMenuProvider({
				part: explorer
			});
			setContextMenu(nodeContext, provider);
		};

	return {
		setContextMenu: setContextMenu,
		setExplorerContextMenu: setExplorerContextMenu,
		loggingCategory: loggingCategory
	};

});