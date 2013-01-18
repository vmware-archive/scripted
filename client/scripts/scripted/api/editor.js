define(function (require) {

	var when = require('when');

	console.log('Editor api loaded!');
	
	var saveHooks = require('scripted/editor/save-hooks');

	return {
		onSaveTransform: function (transformFun) {
			//Use lower-level preSave hook to grab editor text, apply transformFun
			//and put contents back into the editor.
			saveHooks.onPreSave(function (editor, path) {
				return when(undefined, function () {
					return transformFun(editor.getText(), path);
				}).otherwise(function (err) {
					//If something went wrong with this transform
					//don't reject the save. Just ignore that transform.
					if (err) {
						console.log(err);
						if (err.stack) {
							console.log(err.stack);
						}
					}
					return when.resolve();
				}).then(function(newText) {
					if (typeof(newText)==='string') {
						editor.setText(newText);
					}
				});
			});
		}
	};

});