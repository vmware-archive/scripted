/// <reference path="typescriptServices.d.ts"/>
import TS = module('lib/typescriptServices');
declare module 'lib/typescriptServices' {
	module TypeScript{
	}
	module Services {
	}
	module Formatting{
	}
}

import scriptedLogger = module('scriptedLogger');
declare module 'scriptedLogger' {
	export function info(text:string, category?:string);

	export function debug(text:string, category?:string);

	export function warn(text:string, category?:string);

	export function error(text:string, category?:string);
}

var TypeScript:TypeScript = <TypeScript>TS.TypeScript;
var Services:Services = <Services>TS.Services;
var setting = new TypeScript.CompilationSettings();

interface ScriptCacheMap {
	[path:string]: {
		index:number;
		versions: Services.TextEdit[];
		text:string;
	};
}

var STDLIB_NAME = '<STDLIB>';

export class ScriptedLanguageServiceHost extends TypeScript.NullLogger implements Services.ILanguageServiceHost {
	private compiledScripts:ScriptCacheMap = <ScriptCacheMap> {};
	private indexToPath:string[] = [];
	private settings:TypeScript.CompilationSettings = new TypeScript.CompilationSettings();
	private static emptyFn = (...param:any[])=>undefined;

	static private deferred() {
		var deferredTimer = null;
		return {
			run: (callback:Function, delay:number = 100) => {
				if (deferredTimer) {
					clearTimeout(deferredTimer);
					deferredTimer = null;
				}
				deferredTimer = setTimeout(callback, delay);
			}
		};
	}

	private dirName(fileName:string):string {
		var idx = fileName.lastIndexOf('/');
		if (idx == -1) {
			if (fileName === '..') {
				fileName = '';
			}
			return fileName;
		} else {
			fileName = fileName.substr(0, idx);
			if (fileName[fileName.length - 1] == '/')
				fileName = fileName.substr(0, fileName.length - 1);
			return fileName;
		}
	}

	private normalizeFileName(fileName:string):string {
		var newFileName = fileName.replace(/\/\//g, '/').replace(/\/.\//g, '/').
        replace(/\/[^\/]*?\/\.\.\//g, '/');
    while (newFileName !== fileName) {
      fileName = newFileName;
      newFileName = fileName.replace(/\/\//g, '/').replace(/\/.\//g, '/').
          replace(/\/[^\/]*?\/\.\.\//g, '/');
    }
		return fileName;
	}

	onResolve: Function = ScriptedLanguageServiceHost.emptyFn;
	deferredResolve = ScriptedLanguageServiceHost.deferred();
	
	private resolve(content:string, fileName:string, callback:Function = ScriptedLanguageServiceHost.emptyFn,
	                errorCallback:Function = ScriptedLanguageServiceHost.emptyFn, force?:bool=false) {
		if (fileName in this.compiledScripts) {
			var stub = this.compiledScripts[fileName];
			if (content !== stub.text) {
				stub.versions.push(
					this.getSimpleTextEdit(stub.text, content));
				stub.text = content;
			} else if (!force) {
				this.deferredResolve.run(()=>this.onResolve());
				callback();
				return
			}
		}
		var refs = TypeScript.getReferencedFiles(new TypeScript.StringSourceText(content));
		var len = refs.length;
		var errors = 0;
		if (len == 0) {
			this.deferredResolve.run(()=>this.onResolve());
			callback();
		} else {
			refs.forEach((ref:TypeScript.IFileReference)=> {
				var path = ref.path;
				if (path[0] !== '/') {
					path = this.normalizeFileName(this.dirName(fileName) + '/' + path);
				}
				this.requestFile(path, (content) => {
					len--;
					if (len === 0) {
						if (errors) {
							errorCallback();
						} else {
							this.deferredResolve.run(()=>this.onResolve());
							callback();
						}
					}
				}, (err) => {
					len--;
					errors++;
					if (len === 0) {
						errorCallback();
					}
				});
			});
		}
	}

	updateFile(content:string, fileName:string, callback:Function = ScriptedLanguageServiceHost.emptyFn,
	           errorCallback:Function = ScriptedLanguageServiceHost.emptyFn) {
		if (!(fileName in this.compiledScripts)) {
			this.compiledScripts[fileName] = {
				index: this.indexToPath.length,
				text: '',
				versions: []
			};
			this.indexToPath.push(fileName);
			this.resolve(content, fileName, callback, errorCallback, true);
		} else if (this.compiledScripts[fileName].text !== content)  {
			this.resolve(content, fileName, callback, errorCallback);
		} else {
			callback();
		}
	}

	requestRawUrl(url:string, fileName:string, callback:Function = ScriptedLanguageServiceHost.emptyFn,
	              errCallback:(err:any)=>void = ScriptedLanguageServiceHost.emptyFn) {
		if (fileName in this.compiledScripts) {
			callback(this.compiledScripts[fileName].text);
		} else {
			var xhr = new XMLHttpRequest();
			xhr.open('GET', url, true);
			xhr.setRequestHeader('If-None-Match', '' + new Date().getTime());
			xhr.onreadystatechange = () => {
				if (xhr.readyState === 4) {
					if (xhr.status === 200) {
						this.updateFile(xhr.responseText, fileName, callback, errCallback);
					} else {
						errCallback(xhr.statusText);
					}
				}
			};
			if (errCallback) {
				xhr.onerror = errCallback;
			}
			xhr.send(null);
		}
	}

	requestFile(filePath:string, callback:Function = ScriptedLanguageServiceHost.emptyFn,
	            errCallback:(err:any)=>void = (e)=>undefined) {
		this.requestRawUrl('/get?file=' + filePath, filePath, callback, errCallback);
	}

	getCompilationSettings() {
		return this.settings;
	}

	getScriptCount() {
		return this.indexToPath.length;
	}

	// Id is the path
	getScriptId(scriptIndex:number) {
		return this.indexToPath[scriptIndex];
	}

	getScriptIndex(id:string):number {
		if (this.compiledScripts[id]) {
			return this.compiledScripts[id].index;
		} else {
			return -1;
		}
	}

	getScriptSourceText(scriptIndex:number, start:number, end:number):string {
		return this.compiledScripts[this.indexToPath[scriptIndex]].text.substring(start, end);
	}

	getScriptSourceLength(scriptIndex:number):number {
		return this.compiledScripts[this.indexToPath[scriptIndex]].text.length;
	}

	getScriptIsResident(scriptIndex:number):bool {
		return this.indexToPath[scriptIndex] === STDLIB_NAME;
	}

	getScriptVersion(scriptIndex:number):number {
		return this.compiledScripts[this.indexToPath[scriptIndex]].versions.length;
	}

	getScriptEditRangeSinceVersion(scriptIndex:number, scriptVersion:number):TypeScript.ScriptEditRange {
		var stub = this.compiledScripts[this.indexToPath[scriptIndex]];
		var versions = stub.versions;
		if (versions.length > 0 && scriptVersion < versions.length) {
			var start = versions[scriptVersion].minChar;
			var end = versions[scriptVersion].limChar;
			var diff = versions[scriptVersion].text.length - end + start;
			
			for (var i = scriptVersion + 1; i < versions.length; i++){
				var edit = versions[i];
				var itemDiff = edit.text.length - edit.limChar + edit.minChar;
				diff += itemDiff;
				if (edit.minChar < start) {
					start = edit.minChar;
				}
				if (edit.limChar > end) {
					end = edit.limChar;
				}
				end += itemDiff;
			}
			return new TypeScript.ScriptEditRange(start, end - diff, diff);
		} else {
			return new TypeScript.ScriptEditRange(0, 0, 0);
		}
	}
	
	private getSimpleTextEdit(prevText:string, newText:string): Services.TextEdit {
		var len1 = prevText.length;
		var len2 = newText.length;
		if (prevText == newText) {
			return null;
		}
		for(var start = 0; start < len1 && start < len2; start++){
			if (prevText[start]!=newText[start]){
				break;
			}
		}
		for (var end = 0; end < len1 && end < len2; end++){
			if (prevText[len1 - end - 1] != newText[len2 - end - 1]) {
				break;
			}
		}
		return new Services.TextEdit(
			start, len1 - end - 1,
			newText.substring(start, len2 - end)
		);
	}

	editFile(scriptIndex:number, edit:Services.TextEdit){
		var stub = this.compiledScripts[this.indexToPath[scriptIndex]];
		if (stub)
			stub.versions.push(edit);
	}

	log(name:string) {
//		scriptedLogger.info(name);
	}
}

export var languageServiceHost = new ScriptedLanguageServiceHost();
export var languageService = new Services.LanguageService(languageServiceHost);

languageServiceHost.requestRawUrl('/scripts/plugins/typescript/lib.d.ts', STDLIB_NAME);

export interface Proposal {
	proposal: string;
	description: string;
	relevance: number;
	style: string;
}

export interface HoverText {
	hoverText: string;
}

export class TypeScriptContentAssistProvider {
	constructor(public fileName:string) {
		languageServiceHost.onResolve = () => {
			console.log('resolved');
			languageService.refresh();
			this.onResolve();
		};
	}

	computeProposals(buffer:string, offset:number, context:any):Proposal[] {
		languageServiceHost.updateFile(buffer, this.fileName);
		var info = languageService.getCompletionsAtPosition(this.fileName, offset, true);
		if (!info.entries.length)
			info = languageService.getCompletionsAtPosition(this.fileName, offset, false);
		return <Proposal[]>info.entries.map(function (entry:Services.CompletionEntry) {
			return <Proposal>{
				proposal: entry.name,
				description: entry.docComment,
				relevance: 1,
				style: 'noemphasis'
			};
		});
	}

	computeHover(buffer:string, offset:number):HoverText {
		languageServiceHost.updateFile(buffer, this.fileName);
		var sym = languageService.getSymbolAtPosition(languageService.getScriptAST(this.fileName), offset);
		if (sym) {
			return {
				hoverText: sym.toString()
			};
		} else {
			return {
				hoverText: null
			};
		}
	}

	findDefinition(buffer:string, offset:number) {
		languageServiceHost.updateFile(buffer, this.fileName);
		var definition = languageService.getDefinitionAtPosition(this.fileName, offset);
		if (definition) {
			return {
				range: [definition.minChar, definition.limChar],
				path: languageServiceHost.getScriptId(definition.unitIndex)
			};
		}
	}

	computeSummary(buffer, fileName) {

	}

	makeChange(change:{start:number; end:number; text:string;}) {
		languageServiceHost.editFile(languageServiceHost.getScriptIndex(this.fileName), 
		new Services.TextEdit(change.start, change.end, change.text));
	}

	onResolve() {
		
	}

	checkSyntax(buffer:string, callback:(problems:any[])=>void = (a)=>undefined) {
		var handle = () => {
			var errors = languageService.getScriptErrors(this.fileName, 100);
			var result = errors.map((error:TypeScript.ErrorEntry, i)=> {
				return {
					id: i,
					description: error.message,
					line: 1,
					start: error.minChar + 1,
					end: error.limChar,
					severity: "error"
				};
			});
			callback(result);
		};
		languageServiceHost.updateFile(buffer, this.fileName, handle, handle);
	}
}
