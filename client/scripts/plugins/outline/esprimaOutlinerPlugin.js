/*******************************************************************************
 * @license
 * Copyright (c) 2010, 2011 IBM Corporation and others.
 * All rights reserved. This program and the accompanying materials are made 
 * available under the terms of the Eclipse Public License v1.0 
 * (http://www.eclipse.org/legal/epl-v10.html), and the Eclipse Distribution 
 * License v1.0 (http://www.eclipse.org/org/documents/edl-v10.html). 
 *
 * Contributors:
 *     Andy Clement (vmware) - initial API and implementation
 *******************************************************************************/
 
// TODOs
// 1. navigation from ast view or regular view to right bit of file (can we do right column?)
// 2. shorter ast view
// 3. more entries in the outline view, should be nested?
// 4. foldable (show/hide) for the ast view
// 5. filter/search at the top?
// 6. What is 'text' property used for?
	 
/*jslint forin:true regexp:false*/
/*global define require eclipse esprima window*/
define(["esprima/esprima"],function () {
 
	function computeLinebreaks(offset) {
	   var linebreaks = [];
	   var len = offset.length;
	   for (var c=0;c<len;c++) {
	     if (offset.charAt(c)==='\n') {
	       linebreaks.push(c);
	     }
	   } 
	   return linebreaks;
	}
	
	function toLine(offset,linebreaks) {
	  var lblen = linebreaks.length;
	  for (var lb = 0;lb<lblen;lb++) {
	    if (offset>linebreaks[lb]) {
	       continue;
	    }
	    return lb+1;
	  }
	  return -1;
	}
	
	
	function callEsprima(contents) { 
	    var parsedProgram = esprima.parse(contents,{range:true,comments:true});
	    var linebreaks = computeLinebreaks(contents);
	    return {ast:parsedProgram,linebreaks:linebreaks};
	}
 
	function toParamString(params) {
	    if (!params || params.length===0) {
			return "()";  
		} 
		var pstring='(';
		var plen = params.length;
	    for (var p=0;p<plen;p++) {
	      if (p>0) { pstring+=','; }
	      pstring+=params[p].name;
	    } 
	    pstring+=')'; 
		return pstring;
	 }
	 
	 function _addChild(container,child) {
	     if (container instanceof Array) {
	       // It is the root outline object, it does not have children
	       container.push(child);
	     } else {
	         if (!container.children) {
	             container.children=[];
	         }
	         container.children.push(child);
	     }
	 }
	 
	 function getLineFromInitializer(ast,container,linebreaks) {
	    var line;
	    if (ast.init && ast.init.range) {
          line = toLine(ast.init.range[0],linebreaks);
        } else {
//          if (container) {
//            if (container.line) {
//            line = container.line;
//            } else {
//              line = 1;
//            }
//          } else {
            line =1;
//          }
        }
        return line;
     }
	 
	/** 
	 * Process the esprima AST and produce a representation for the outline view.
	 */
	function toOutlineModel(root, ast, container) {
	    var newContainer,len;
	    if (typeof ast === 'string' || typeof ast === 'number' || typeof ast === 'boolean') {
	      // ignore
	    } else if (ast instanceof Array) {
	      len = ast.length; 
	      for (var i=0;i<len;i++) {
	          toOutlineModel(root,ast[i],container);
	      } 
	    } else {   
	      for (var key in ast) {
		        var value = ast[key];
		        if (key === "type") {
		          if (value === "FunctionDeclaration") {
		            var name = ast.id.name+toParamString(ast.params);
		            newContainer = {label: name, children:null, line:toLine(ast.range[0],root.linebreaks), text:"xyz"};
		            _addChild(container,newContainer);
		            container = newContainer;
		          } else if (value === "VariableDeclarator") {
///		            if (ast.init && ast.init.type && ast.init.type === "ObjectExpression") {
///		                newContainer = {label: ast.id.name+" {}", children:null, line:toLine(ast.init.range[0],root.linebreaks), text:"xyz"};
///		                _addChild(container,newContainer);
///		                container = newContainer;
//		            } else {
//		                // Patching process is necessary because a range isn't kept alongside a declaration that
//		                // has no initializer, it is only on the parent - this might be an issue with the ast
//		                var line = getLineFromInitializer(ast,container,root.linebreaks);
//		                var child = {label: ast.id.name, children:null, line:line, text:"xyz"};
//		                if (line===1) {
//		                  if (!root.needspatching) {
//		                    root.needspatching=[];
//		                  }
//		                  root.needspatching.push(child);
//		                }
//		                _addChild(container,child);
///					}
//				  // This will add a nesting element for this kind of construct:
//				  // this.foo = { abc: function() {...}, def: function() {...}}
//				  // the 'this.foo' will manifest as 'foo = {}' as a node containing abc and def
//				  } else if (value === "AssignmentExpression") {
//				  	if (ast.right && ast.right.type && ast.right.type === "ObjectExpression") {
//				  		var nm = "";
//				  		if (ast.left && ast.left.object && ast.left.object.type && ast.left.object.type === "Identifier") {
//				  			nm = ast.left.object.name+".";
//				  		}
//				  		if (ast.left && ast.left.property && ast.left.property.type === "Identifier") {
//				  			nm = nm + ast.left.property.name;
//				  		}
//				  		newContainer = {label: nm+" = {}", children:null, line:toLine(ast.left.range[0],root.linebreaks), text:"xyz"};
//		                _addChild(container,newContainer);
//		                container = newContainer;
//				  	}
		          } 
		        } else if (key === "value") {
		          if (value && value.type && value.type==="FunctionExpression") {
		            // looks like it might be a named function
		            if (ast.key && ast.key.name) {
//		                newContainer = {label: ast.key.name+": function"+toParamString(value.params),children:null, line:toLine(value.range[0],root.linebreaks), text:"xyz"};
		                newContainer = {label: ast.key.name+toParamString(value.params),children:null, line:toLine(value.range[0],root.linebreaks), text:""};		                _addChild(container,newContainer);
		                container = newContainer;
		            }
		          }
		        }
		        if (typeof ast === 'string' || typeof ast === 'number' || typeof ast === 'boolean') {
                    // ignore			 
				} else if (value instanceof Array) {
					len = value.length;
					if (key === 'range' && len === 2) {
						// ignore
						if (root.needspatching) {
						  var patchlen = root.needspatching.length;
						  for (var p=0;p<patchlen;p++) {
						    root.needspatching[p].line = toLine(value[0],root.linebreaks);
						  }
						  root.needspatching=null;
						}
					} else {
				      for (var i2=0;i2<len;i2++) {
				          toOutlineModel(root, value[i2],container);
				      } 
				    } 
		        } else {
			        toOutlineModel(root, value,container);
		        }
		  }
	    } 
	}
	 
	// Process the esprima AST and produce a representation for the outline view
	function toOutlineModelAST(outline, arrayname, input,linebreaks) {
	    if (typeof input === 'string') {
	        var element3 = { label: input, children: null, line: 25, text: "xyz" };
	        outline.splice(0,0,element3);
        } else if (typeof input === 'number') {
			outline.splice(0,0,{label:input,children:null,line:25,text:"xyz"});
	    } else if (input instanceof Array) {
	      var len = input.length;
          var kids = [];
	      for (var i=0;i<len;i++) {
	          var element = input[i];
	          toOutlineModelAST(kids,null,element,linebreaks);
			  var element4 = { label: arrayname+"["+i+"]", children: kids, line: 25, text: "xyz" };
			  outline.push(element4); 
	      } 
	    } else { 
	      for (var key2 in input) {
		        var kids2 = [];
		        var value2 = input[key2];
		        var element2 = null;
		        if (typeof value2 === 'string') {
			        outline.splice(0,0,{ label: key2+": "+value2,children:null,line:25,text:"xyz"});
			    } else if (typeof value2 === 'number') {
					outline.splice(0,0,{label:key2+": "+value2,children:null,line:25,text:"xyz"});
				} else if (value2 instanceof Array) {
					var len2 = value2.length;
					if (key2 === 'range' && len2 === 2) {
						// esprima special case
						var line = toLine(value2[0],linebreaks);
						 outline.splice(0,0,{label:"range["+value2[0]+" > "+value2[1]+"]",children:null,line:line,text:"xyz"});
					} else {
				      for (var i2=0;i2<len2;i2++) {
							var kids5 = [];
				          var element5 = value2[i2];
				          toOutlineModelAST(kids5,key2,element5,linebreaks);
						  outline.push({ label: key2+"["+i2+"]", children: kids5, line: 25, text: "xyz" });
				      } 
				    }
		        } else {	
			        toOutlineModelAST(kids2,key2,value2,linebreaks);
			        element2 = { label: key2, children: kids2, line: 25, text: "xyz" };
			        outline.push(element2);
		        }
		  }
	    }
	}

	function getOutline(contents) {
		var parseResult = callEsprima(contents);
		var outline=[];
		toOutlineModel(parseResult, parseResult.ast, outline);
		return outline;
	}
	
//	var outlineASTService = {
//			getOutline : function(contents, title) {
//				var parseResult = callEsprima(contents);
//				var outline=[];
//				toOutlineModelAST(outline, null, parseResult.ast, parseResult.linebreaks);
//				return outline;
//			}
//	};
//	
//	var outlineService = {
//			getOutline : function(contents, title) {
//				var parseResult = callEsprima(contents);
//				var outline=[];
//				toOutlineModel(parseResult, parseResult.ast, outline);
//				return outline;
//			}
//	};
//	
//	var provider = new eclipse.PluginProvider();
//	provider.registerServiceProvider("orion.edit.outliner", outlineASTService, {
//		contentType: ["application/javascript"],
//		name: "Esprima AST view",
//		id: "orion.edit.outliner.esprimaAST"
//	});
//	provider.registerServiceProvider("orion.edit.outliner", outlineService, {
//	    contentType: ["application/javascript"],
//	    name: "Esprima Outline",
//	    id: "orion.edit.outliner.esprima"
//    });
//	provider.connect();
	return {
		getOutline: getOutline
	};
});
