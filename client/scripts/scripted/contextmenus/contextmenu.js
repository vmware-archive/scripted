/*******************************************************************************
 * @license Copyright (c) 2012 VMware, Inc. All Rights Reserved. THIS FILE IS
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

function(contextMenuProvider, scriptedLogger) {

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



	var getPosition = function(clickX, clickY, relativeToContextID) {
			var x = clickX;
			var y = clickY;

			if (relativeToContextID && $(relativeToContextID).size() > 0) {
				var contextOffset = $(relativeToContextID).offset();
				// Take into account the context and position to the right of the mouse click
				x += contextOffset.left;

				y -= contextOffset.top;
			}
			return {
				'x': x,
				'y': y
			};
		};

	var attachContextMenuEvents = function(contextMenu) {
			// Handle ESCAPE keypresses on the dialog
			$(window).on('keyup.' + contextMenuClass, function(e) {

				if (e.keyCode === $.ui.keyCode.ESCAPE) {
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

	var showContextMenu = function(context, contextMenu, eventContext) {

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
				$(context).append(contextMenu);
			}

			var eventx = eventContext.pageX;
			var eventy = eventContext.pageY;

			// TODO: Hardcoded navigator wrapper as the context for now. Refactor when context menus should be more general
			var position = getPosition(eventx, eventy, "#navigator-wrapper");

			// reposition context menu based on mouse click
			contextMenu.css({
				top: position.y + "px",
				left: position.x + "px"
			});

			attachContextMenuEvents(contextMenu);


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
	var initContextMenus = function(nodeContext) {

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
					nodeContext, e);
					if (menus) {
						var cmenu = createContextMenu(
						menus, e);
						if (cmenu) {
							showContextMenu(nodeContext, cmenu,
							e);

							e.preventDefault();

							// To avoid context menus from appearing for nested DOM elements, stop event propagation to any parents
							e.stopPropagation();
						}
					}
				});
			});

		};

	return {
		initContextMenus: initContextMenus,
		loggingCategory: loggingCategory
	};

});