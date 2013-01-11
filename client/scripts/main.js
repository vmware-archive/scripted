define({
	scripted : {
		module : 'scripted',
		init : { 'init' : [ // calls the init() method during the init lifecycle, other lifecycle steps possible and omore complex ways of calling
				{ $ref : 'scriptedLogger' },
				{ $ref : 'fileExplorer' },
				{ $ref : 'layoutManager' }
			]
		}
	},
	scriptedLogger : {
		module : 'scriptedLogger'
	},
	
	editorPane : {
		module : "scripted/editor/editorPane"
	},
	
	layoutManager : {
		module : "layoutManager",
		properties : {
			editorNode : { $ref : "dom!editor"} // TODO more dom nodes
		}
	},
	
	fileExplorer : {
		create : {
			module : "scripted/navigator/explorer-table",
			args : [{ parentId: "explorer-tree" }]
		}
	},
	
	plugins : [ {
		module : 'wire/debug'
	},
	{
		module : 'wire/jquery/dom'
	}]
});