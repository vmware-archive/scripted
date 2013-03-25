var __extends = this.__extends || function (d, b) {
    function __() { this.constructor = d; }
    __.prototype = b.prototype;
    d.prototype = new __();
};
define(["require", "exports", 'lib/typescriptServices'], function(require, exports, __TS__) {
    var TS = __TS__;

        
        var TypeScript = TS.TypeScript;
    var Services = TS.Services;
    var setting = new TypeScript.CompilationSettings();
    var STDLIB_NAME = '<STDLIB>';
    var ScriptedLanguageServiceHost = (function (_super) {
        __extends(ScriptedLanguageServiceHost, _super);
        function ScriptedLanguageServiceHost() {
            _super.apply(this, arguments);

            this.compiledScripts = {
            };
            this.indexToPath = [];
            this.settings = new TypeScript.CompilationSettings();
            this.onResolve = ScriptedLanguageServiceHost.emptyFn;
            this.deferredResolve = ScriptedLanguageServiceHost.deferred();
        }
        ScriptedLanguageServiceHost.emptyFn = function () {
            var param = [];
            for (var _i = 0; _i < (arguments.length - 0); _i++) {
                param[_i] = arguments[_i + 0];
            }
            return undefined;
        };
        ScriptedLanguageServiceHost.deferred = function deferred() {
            var deferredTimer = null;
            return {
                run: function (callback, delay) {
                    if (typeof delay === "undefined") { delay = 100; }
                    if(deferredTimer) {
                        clearTimeout(deferredTimer);
                        deferredTimer = null;
                    }
                    deferredTimer = setTimeout(callback, delay);
                }
            };
        };
        ScriptedLanguageServiceHost.prototype.dirName = function (fileName) {
            var idx = fileName.lastIndexOf('/');
            if(idx == -1) {
                if(fileName === '..') {
                    fileName = '';
                }
                return fileName;
            } else {
                fileName = fileName.substr(0, idx);
                if(fileName[fileName.length - 1] == '/') {
                    fileName = fileName.substr(0, fileName.length - 1);
                }
                return fileName;
            }
        };
        ScriptedLanguageServiceHost.prototype.normalizeFileName = function (fileName) {
            var newFileName = fileName.replace(/\/\//g, '/').replace(/\/.\//g, '/').replace(/\/[^\/]*?\/\.\.\//g, '/');
            while(newFileName !== fileName) {
                fileName = newFileName;
                newFileName = fileName.replace(/\/\//g, '/').replace(/\/.\//g, '/').replace(/\/[^\/]*?\/\.\.\//g, '/');
            }
            return fileName;
        };
        ScriptedLanguageServiceHost.prototype.resolve = function (content, fileName, callback, errorCallback, force) {
            if (typeof callback === "undefined") { callback = ScriptedLanguageServiceHost.emptyFn; }
            if (typeof errorCallback === "undefined") { errorCallback = ScriptedLanguageServiceHost.emptyFn; }
            if (typeof force === "undefined") { force = false; }
            var _this = this;
            if(fileName in this.compiledScripts) {
                var stub = this.compiledScripts[fileName];
                if(content !== stub.text) {
                    stub.versions.push(this.getSimpleTextEdit(stub.text, content));
                    stub.text = content;
                } else if(!force) {
                    this.deferredResolve.run(function () {
                        return _this.onResolve();
                    });
                    callback();
                    return;
                }
            }
            var refs = TypeScript.getReferencedFiles(new TypeScript.StringSourceText(content));
            var len = refs.length;
            var errors = 0;
            if(len == 0) {
                this.deferredResolve.run(function () {
                    return _this.onResolve();
                });
                callback();
            } else {
                refs.forEach(function (ref) {
                    var path = ref.path;
                    if(path[0] !== '/') {
                        path = _this.normalizeFileName(_this.dirName(fileName) + '/' + path);
                    }
                    _this.requestFile(path, function (content) {
                        len--;
                        if(len === 0) {
                            if(errors) {
                                errorCallback();
                            } else {
                                _this.deferredResolve.run(function () {
                                    return _this.onResolve();
                                });
                                callback();
                            }
                        }
                    }, function (err) {
                        len--;
                        errors++;
                        if(len === 0) {
                            errorCallback();
                        }
                    });
                });
            }
        };
        ScriptedLanguageServiceHost.prototype.updateFile = function (content, fileName, callback, errorCallback) {
            if (typeof callback === "undefined") { callback = ScriptedLanguageServiceHost.emptyFn; }
            if (typeof errorCallback === "undefined") { errorCallback = ScriptedLanguageServiceHost.emptyFn; }
            if(!(fileName in this.compiledScripts)) {
                this.compiledScripts[fileName] = {
                    index: this.indexToPath.length,
                    text: '',
                    versions: []
                };
                this.indexToPath.push(fileName);
                this.resolve(content, fileName, callback, errorCallback, true);
            } else if(this.compiledScripts[fileName].text !== content) {
                this.resolve(content, fileName, callback, errorCallback);
            } else {
                callback();
            }
        };
        ScriptedLanguageServiceHost.prototype.requestRawUrl = function (url, fileName, callback, errCallback) {
            if (typeof callback === "undefined") { callback = ScriptedLanguageServiceHost.emptyFn; }
            if (typeof errCallback === "undefined") { errCallback = ScriptedLanguageServiceHost.emptyFn; }
            var _this = this;
            if(fileName in this.compiledScripts) {
                callback(this.compiledScripts[fileName].text);
            } else {
                var xhr = new XMLHttpRequest();
                xhr.open('GET', url, true);
                xhr.setRequestHeader('If-None-Match', '' + new Date().getTime());
                xhr.onreadystatechange = function () {
                    if(xhr.readyState === 4) {
                        if(xhr.status === 200) {
                            _this.updateFile(xhr.responseText, fileName, callback, errCallback);
                        } else {
                            errCallback(xhr.statusText);
                        }
                    }
                };
                if(errCallback) {
                    xhr.onerror = errCallback;
                }
                xhr.send(null);
            }
        };
        ScriptedLanguageServiceHost.prototype.requestFile = function (filePath, callback, errCallback) {
            if (typeof callback === "undefined") { callback = ScriptedLanguageServiceHost.emptyFn; }
            if (typeof errCallback === "undefined") { errCallback = function (e) {
                return undefined;
            }; }
            this.requestRawUrl('/get?file=' + filePath, filePath, callback, errCallback);
        };
        ScriptedLanguageServiceHost.prototype.getCompilationSettings = function () {
            return this.settings;
        };
        ScriptedLanguageServiceHost.prototype.getScriptCount = function () {
            return this.indexToPath.length;
        };
        ScriptedLanguageServiceHost.prototype.getScriptId = function (scriptIndex) {
            return this.indexToPath[scriptIndex];
        };
        ScriptedLanguageServiceHost.prototype.getScriptIndex = function (id) {
            if(this.compiledScripts[id]) {
                return this.compiledScripts[id].index;
            } else {
                return -1;
            }
        };
        ScriptedLanguageServiceHost.prototype.getScriptSourceText = function (scriptIndex, start, end) {
            return this.compiledScripts[this.indexToPath[scriptIndex]].text.substring(start, end);
        };
        ScriptedLanguageServiceHost.prototype.getScriptSourceLength = function (scriptIndex) {
            return this.compiledScripts[this.indexToPath[scriptIndex]].text.length;
        };
        ScriptedLanguageServiceHost.prototype.getScriptIsResident = function (scriptIndex) {
            return this.indexToPath[scriptIndex] === STDLIB_NAME;
        };
        ScriptedLanguageServiceHost.prototype.getScriptVersion = function (scriptIndex) {
            return this.compiledScripts[this.indexToPath[scriptIndex]].versions.length;
        };
        ScriptedLanguageServiceHost.prototype.getScriptEditRangeSinceVersion = function (scriptIndex, scriptVersion) {
            var stub = this.compiledScripts[this.indexToPath[scriptIndex]];
            var versions = stub.versions;
            if(versions.length > 0 && scriptVersion < versions.length) {
                var start = versions[scriptVersion].minChar;
                var end = versions[scriptVersion].limChar;
                var diff = versions[scriptVersion].text.length - end + start;
                for(var i = scriptVersion + 1; i < versions.length; i++) {
                    var edit = versions[i];
                    var itemDiff = edit.text.length - edit.limChar + edit.minChar;
                    diff += itemDiff;
                    if(edit.minChar < start) {
                        start = edit.minChar;
                    }
                    if(edit.limChar > end) {
                        end = edit.limChar;
                    }
                    end += itemDiff;
                }
                return new TypeScript.ScriptEditRange(start, end - diff, diff);
            } else {
                return new TypeScript.ScriptEditRange(0, 0, 0);
            }
        };
        ScriptedLanguageServiceHost.prototype.getSimpleTextEdit = function (prevText, newText) {
            var len1 = prevText.length;
            var len2 = newText.length;
            if(prevText == newText) {
                return null;
            }
            for(var start = 0; start < len1 && start < len2; start++) {
                if(prevText[start] != newText[start]) {
                    break;
                }
            }
            for(var end = 0; end < len1 && end < len2; end++) {
                if(prevText[len1 - end - 1] != newText[len2 - end - 1]) {
                    break;
                }
            }
            return new Services.TextEdit(start, len1 - end - 1, newText.substring(start, len2 - end));
        };
        ScriptedLanguageServiceHost.prototype.editFile = function (scriptIndex, edit) {
            var stub = this.compiledScripts[this.indexToPath[scriptIndex]];
            if(stub) {
                stub.versions.push(edit);
            }
        };
        ScriptedLanguageServiceHost.prototype.log = function (name) {
        };
        return ScriptedLanguageServiceHost;
    })(TypeScript.NullLogger);
    exports.ScriptedLanguageServiceHost = ScriptedLanguageServiceHost;    
    exports.languageServiceHost = new ScriptedLanguageServiceHost();
    exports.languageService = new Services.LanguageService(exports.languageServiceHost);
    exports.languageServiceHost.requestRawUrl('/scripts/plugins/typescript/lib.d.ts', STDLIB_NAME);
    var TypeScriptContentAssistProvider = (function () {
        function TypeScriptContentAssistProvider(fileName) {
            this.fileName = fileName;
            var _this = this;
            exports.languageServiceHost.onResolve = function () {
                console.log('resolved');
                exports.languageService.refresh();
                _this.onResolve();
            };
        }
        TypeScriptContentAssistProvider.prototype.computeProposals = function (buffer, offset, context) {
            exports.languageServiceHost.updateFile(buffer, this.fileName);
            var info = exports.languageService.getCompletionsAtPosition(this.fileName, offset, true);
            if(!info.entries.length) {
                info = exports.languageService.getCompletionsAtPosition(this.fileName, offset, false);
            }
            return info.entries.map(function (entry) {
                return {
                    proposal: entry.name,
                    description: entry.docComment,
                    relevance: 1,
                    style: 'noemphasis'
                };
            });
        };
        TypeScriptContentAssistProvider.prototype.computeHover = function (buffer, offset) {
            exports.languageServiceHost.updateFile(buffer, this.fileName);
            var sym = exports.languageService.getSymbolAtPosition(exports.languageService.getScriptAST(this.fileName), offset);
            if(sym) {
                return {
                    hoverText: sym.toString()
                };
            } else {
                return {
                    hoverText: null
                };
            }
        };
        TypeScriptContentAssistProvider.prototype.findDefinition = function (buffer, offset) {
            exports.languageServiceHost.updateFile(buffer, this.fileName);
            var definition = exports.languageService.getDefinitionAtPosition(this.fileName, offset);
            if(definition) {
                return {
                    range: [
                        definition.minChar, 
                        definition.limChar
                    ],
                    path: exports.languageServiceHost.getScriptId(definition.unitIndex)
                };
            }
        };
        TypeScriptContentAssistProvider.prototype.computeSummary = function (buffer, fileName) {
        };
        TypeScriptContentAssistProvider.prototype.makeChange = function (change) {
            exports.languageServiceHost.editFile(exports.languageServiceHost.getScriptIndex(this.fileName), new Services.TextEdit(change.start, change.end, change.text));
        };
        TypeScriptContentAssistProvider.prototype.onResolve = function () {
        };
        TypeScriptContentAssistProvider.prototype.checkSyntax = function (buffer, callback) {
            if (typeof callback === "undefined") { callback = function (a) {
                return undefined;
            }; }
            var _this = this;
            var handle = function () {
                var errors = exports.languageService.getScriptErrors(_this.fileName, 100);
                var result = errors.map(function (error, i) {
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
            exports.languageServiceHost.updateFile(buffer, this.fileName, handle, handle);
        };
        return TypeScriptContentAssistProvider;
    })();
    exports.TypeScriptContentAssistProvider = TypeScriptContentAssistProvider;    
})
//@ sourceMappingURL=typescriptContentAssist.js.map
