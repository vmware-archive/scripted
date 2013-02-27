/*******************************************************************************
 * @license
 * Copyright (c) 2013 Andy Clement
 * THIS FILE IS PROVIDED UNDER THE TERMS OF THE ECLIPSE PUBLIC LICENSE
 * ("AGREEMENT"). ANY USE, REPRODUCTION OR DISTRIBUTION OF THIS FILE
 * CONSTITUTES RECIPIENTS ACCEPTANCE OF THE AGREEMENT.
 * You can obtain a current copy of the Eclipse Public License from
 * http://www.opensource.org/licenses/eclipse-1.0.php
 *
 * Portions of this example are based on:
 *  http://ariya.ofilabs.com/2012/06/detecting-boolean-traps-with-esprima.html
 * and copyright according to the esprima license, see:
 *  https://github.com/ariya/esprima/blob/master/LICENSE.BSD
 * Reproduced here:
	===
	Redistribution and use in source and binary forms, with or without
	modification, are permitted provided that the following conditions are met:

	  * Redistributions of source code must retain the above copyright
	    notice, this list of conditions and the following disclaimer.
	  * Redistributions in binary form must reproduce the above copyright
	    notice, this list of conditions and the following disclaimer in the
	    documentation and/or other materials provided with the distribution.

	THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS"
	AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE
	IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE
	ARE DISCLAIMED. IN NO EVENT SHALL <COPYRIGHT HOLDER> BE LIABLE FOR ANY
	DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES
	(INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES;
	LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND
	ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
	(INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF
	THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
	===
 *
 * Contributors:
 *   Andy Clement
 *   Ariya Hidayat
 ******************************************************************************/

/**
 * Plugin sample: findbooleantrap-plugin
 * This plugin shows how to add new annotations to the text.
 *
 * Notes:
 * - annotations have a type name, expressed via a dotted notation.
 * - the lifecycle of annotations is managed by the annotationComputer api.
 *   When a annotationComputer returns new annotations for a particular editor, the
 *   previous annotations it created will be removed automatically.
 * - the annotation computer may be invoked at different points in the editor
 *   lifecycle. Presently it is only called on 'save' but it probably also
 *   makes sense to call it on 'load' to produce initial annotations when a file is opened.
 * - the styling is done via a few lines of css. See styling.css:
 */
 /*global esprima */
define(function (require) {

	var editorApi = require('scripted/api/editor-extensions');

	var esprima = require('scripted/api/esprima');

	var pathExp = new RegExp('.*\\.js$');

	var doubleNegativeList = [
	    'hidden',
	    'caseinsensitive',
	    'disabled'
	];


	// Register the new annotation type
	editorApi.registerAnnotationType('example.booleantrap');

	// Load the styling for our annotation
	editorApi.loadCss(require('text!./styling.css'));

	// Helper functions for plugin implementation

	function traverse(object, visitor) {
	    var key, child;

	    if (visitor.call(null, object) === false) {
	        return;
	    }
	    for (key in object) {
	        if (object.hasOwnProperty(key)) {
	            child = object[key];
	            if (typeof child === 'object' && child !== null) {
	                traverse(child, visitor);
	            }
	        }
	    }
	}

    function getFunctionName(node) {
        if (node.callee.type === 'Identifier') {
            return node.callee.name;
        }
        if (node.callee.type === 'MemberExpression') {
            return node.callee.property.name;
        }
    }


	function checkSingleArgument(node,report) {
        var args = node['arguments'],
            functionName = getFunctionName(node);

        if ((args.length !== 1) || (typeof args[0].value !== 'boolean')) {
            return;
        }

        // Check if the method is a setter, i.e. starts with 'set',
        // e.g. 'setEnabled(false)'.
        if (functionName.substr(0, 3) !== 'set') {
            report(node, 'Boolean literal with a non-setter function');
        }

        // Does it contain a term with double-negative meaning?
        doubleNegativeList.forEach(function (term) {
            if (functionName.toLowerCase().indexOf(term.toLowerCase()) >= 0) {
                report(node, 'Boolean literal with confusing double-negative');
            }
        });
    }

    function checkMultipleArguments(node,report) {
        var args = node['arguments'],
            literalCount = 0;

        args.forEach(function (arg) {
            if (typeof arg.value === 'boolean') {
                literalCount++;
            }
        });

        // At least two arguments must be Boolean literals.
        if (literalCount >= 2) {

            // Check for two different Boolean literals in one call.
            if (literalCount === 2 && args.length === 2) {
                if (args[0].value !== args[1].value) {
                    report(node, 'Confusing true vs false');
                    return;
                }
            }

            report(node, 'Multiple Boolean literals');
        }
    }

    function checkLastArgument(node,report) {
        var args = node['arguments'];

        if (args.length < 2) {
            return;
        }

        if (typeof args[args.length - 1].value === 'boolean') {
            report(node, 'Ambiguous Boolean literal as the last argument');
        }
    }

	// Here for demo purposes, see the call to it
    function setHidden(b) {}

	// uncomment this line to see what this sample does!
	// setHidden(false);


	editorApi.addAnnotationComputer(function (editor) {
		// Only interested in .js files
		var path = editor.getFilePath();
		if (!path || !pathExp.test(path)) {
			return;
		}

		var annotations = [];
		var text = editor.getText();
		var ast = esprima.parse(text,{tolerant:true, loc:true});
//		console.log(JSON.stringify(ast));

		var report = function(node, problem) {
			// console.log('  Line', node.loc.start.line, 'in function', getFunctionName(node) + ':', problem);
			// Convert from a line/col to an editor offset
			var startOffset = editor.toOffset(node.loc.start.line - 1, node.loc.start.column);
			var endOffset = editor.toOffset(node.loc.end.line - 1, node.loc.end.column);
			annotations.push({ type: 'example.booleantrap', start: startOffset, end: endOffset, text: problem});
		};

		traverse(ast, function (node) {
            if (node.type === 'CallExpression') {
                checkSingleArgument(node,report);
                checkLastArgument(node,report);
                checkMultipleArguments(node,report);
            }
		});

		return annotations;
	});

	console.log('FindBooleanTrap plugin loaded');

});
