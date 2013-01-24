function process(text) {
	return [ {
		message: "Error!",
		start: 1,
		end: 5
		}
	];
}

function getErrors(editor) {
	var text = editor.getText();
	editor.addErrors(process(text));
}

exports.onSave = getErrors;
exports.onLoad = getErrors;

exports.key


exports.commands = [
	{
		icon : 'foo.ico',
		name : "launch!",
		action : function(context) { }
	}
];

var editorAPI = require('scripted/api/editor');
//var e = editorAPI.on('save', function() {
var e = editorAPI.onSave(function() {

	if (sumpin bad happened) {
		editorAPI.remove(e);
	}
});

