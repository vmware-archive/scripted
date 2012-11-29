/*******************************************************************************
 * @license
 * Copyright (c) 2012 - 2012 VMware and others.
 * All rights reserved. This program and the accompanying materials are made
 * available under the terms of the Eclipse Public License v1.0
 * (http://www.eclipse.org/legal/epl-v10.html), and the Eclipse Distribution
 * License v1.0 (http://www.eclipse.org/org/documents/edl-v10.html).
 *
 * Contributors:
 *     Andy Clement
 *     Nieraj Singh
 *******************************************************************************/
/*global define window $*/
/*jslint browser:true*/

/**
 * This module is responsible for dialogs - creating them, positioning them,
 * showing/hiding them.
 */
define(['text!scripted/contextmenus/addResourceDialogue.html', 'text!scripted/contextmenus/renameResourceDialogue.html', 'text!scripted/contextmenus/deleteResourceDialogue.html'], function(
addResourceDialogue, renameResourceDialogue, deleteResourceDialogue) {

	/**
	 * Show (or resize) the mask and a particular dialog. The sizes are computed
	 * such that the mask fills the screen.
	 */
	var popupOrResizeMaskAndDialog = function(dialogId) {
			// get the screen height and width
			var maskHeight = $(document).height();
			var maskWidth = $(document).width();

			// calculate the values for center alignment
			var dialogTop = (maskHeight / 3) - ($(dialogId).height());
			var dialogLeft = (maskWidth / 2) - ($(dialogId).width() / 2);

			// assign values to the overlay and dialog box
			$('#dialog_mask').css({
				height: maskHeight,
				width: maskWidth
			}).show();
			$(dialogId).css({
				top: dialogTop,
				left: dialogLeft
			}).show();
		};

	var removeDialogue = function(dialogueID) {
			$('#dialog_mask').hide();
			$(dialogueID).remove();

		};

	var openDialogue = function(dialogueID, dialogue, operations) {

			var activeElement = document.activeElement;

			$("#dialogs").append(dialogue);

			// Clicking the mask will close the dialogue (acts the same way as cancelling or escaping)
			$('#dialog_mask').off('click.dialogs');
			$('#dialog_mask').on('click.dialogs', function() {
				$('#dialog_mask').hide();
				$(dialogueID).remove();
				$(activeElement).focus();
				return false;
			});


			// Handle ENTER and ESCAPE keypresses on the dialog
			$(dialogueID).off('keyp.dialogs');
			$(dialogueID).on('keyup.dialogs', function(e) {
				// Pressing ENTER triggers the button click
				if (e.keyCode === $.ui.keyCode.ENTER) {
					$('#dialogue_ok_button').trigger('click');
				}
				// Pressing ESCAPE closes the dialog (and mask) and refocuses to the
				// original element
				if (e.keyCode === $.ui.keyCode.ESCAPE) {
					removeDialogue(dialogueID);
					$(activeElement).focus();
				}
			});

			// Handle button clicks
			$('#dialogue_ok_button').off('click.dialogs');
			$('#dialogue_ok_button').on('click.dialogs', function() {
				var value = operations.onOK ? operations.onOK() : null;
				removeDialogue(dialogueID);
				if (operations.onClose) {
					operations.onClose(value);
				}

				$(activeElement).focus();
				return false;
			});

			$('#dialogue_cancel_button').on('click.dialogs', function() {
				removeDialogue(dialogueID);
				$(activeElement).focus();
				return false;
			});

			$(window).off('resize.dialogs');
			$(window).on('resize.dialogs', function() {
				if (!$('#dialog_mask').is(':hidden')) {
					popupOrResizeMaskAndDialog(dialogueID);
				}
			});

			popupOrResizeMaskAndDialog(dialogueID);

			if (operations.onOpen) {
				operations.onOpen();
			}
		};

	var modifyResourceDialogue = function(dialogueElementName, dialogue, onClose, initialValue) {

			var onOK = function() {
					return $("#dialogue_file_name").val();
				};

			var onOpen = function() {
					if (initialValue) {
						$('#dialogue_file_name').val(initialValue);
					}
					$('#dialogue_file_name').focus();
					$('#dialogue_file_name').select();
				};

			var operations = {
				onOK: onOK,
				onOpen: onOpen,
				onClose: onClose
			};

			openDialogue(dialogueElementName, dialogue, operations);
		};




	var createDialogue = function(initialValue) {

			var addResource = function(onClose) {
					modifyResourceDialogue("#dialog_add_resource", addResourceDialogue, onClose, null);
				};

			var renameResource = function(onClose) {
					modifyResourceDialogue("#dialog_rename_resource", renameResourceDialogue, onClose, initialValue);
				};

			var deleteResource = function(onClose) {

					var operations = {
						onClose: onClose
					};

					openDialogue("#dialog_delete_resource", deleteResourceDialogue, operations);
				};

			return {
				addResource: addResource,
				renameResource: renameResource,
				deleteResource: deleteResource
			};

		};

	return {
		createDialogue: createDialogue
	};
});