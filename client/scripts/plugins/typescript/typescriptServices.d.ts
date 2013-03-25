module TypeScript {
    module CompilerDiagnostics {
        var debug: bool;
        interface IDiagnosticWriter {
            Alert(output: string): void;
        }
        var diagnosticWriter: IDiagnosticWriter;
        var analysisPass: number;
        function Alert(output: string): void;
        function debugPrint(s: string): void;
        function assert(condition: bool, s: string): void;
    }
    interface ILogger {
        information(): bool;
        debug(): bool;
        warning(): bool;
        error(): bool;
        fatal(): bool;
        log(s: string): void;
    }
    class NullLogger implements ILogger {
        public information(): bool;
        public debug(): bool;
        public warning(): bool;
        public error(): bool;
        public fatal(): bool;
        public log(s: string): void;
    }
    class LoggerAdapter implements ILogger {
        public logger: ILogger;
        private _information;
        private _debug;
        private _warning;
        private _error;
        private _fatal;
        constructor(logger: ILogger);
        public information(): bool;
        public debug(): bool;
        public warning(): bool;
        public error(): bool;
        public fatal(): bool;
        public log(s: string): void;
    }
    class BufferedLogger implements ILogger {
        public logContents: any[];
        public information(): bool;
        public debug(): bool;
        public warning(): bool;
        public error(): bool;
        public fatal(): bool;
        public log(s: string): void;
    }
    function timeFunction(logger: ILogger, funcDescription: string, func: () => any): any;
    function stringToLiteral(value: string, length: number): string;
}
module TypeScript {
    function hasFlag(val: number, flag: number): bool;
    enum ErrorRecoverySet {
        None,
        Comma,
        SColon,
        Asg,
        BinOp,
        RBrack,
        RCurly,
        RParen,
        Dot,
        Colon,
        PrimType,
        AddOp,
        LCurly,
        PreOp,
        RegExp,
        LParen,
        LBrack,
        Scope,
        In,
        SCase,
        Else,
        Catch,
        Var,
        Stmt,
        While,
        ID,
        Prefix,
        Literal,
        RLit,
        Func,
        EOF,
        TypeScriptS,
        ExprStart,
        StmtStart,
        Postfix,
    }
    enum AllowedElements {
        None,
        ModuleDeclarations,
        ClassDeclarations,
        InterfaceDeclarations,
        AmbientDeclarations,
        Properties,
        Global,
        QuickParse,
    }
    enum Modifiers {
        None,
        Private,
        Public,
        Readonly,
        Ambient,
        Exported,
        Getter,
        Setter,
        Static,
    }
    enum ASTFlags {
        None,
        ExplicitSemicolon,
        AutomaticSemicolon,
        Writeable,
        Error,
        DotLHSPartial,
        DotLHS,
        IsStatement,
        StrictMode,
        PossibleOptionalParameter,
        ClassBaseConstructorCall,
        OptionalName,
        SkipNextRParen,
    }
    enum DeclFlags {
        None,
        Exported,
        Private,
        Public,
        Ambient,
        Static,
        LocalStatic,
        GetAccessor,
        SetAccessor,
    }
    enum ModuleFlags {
        None,
        Exported,
        Private,
        Public,
        Ambient,
        Static,
        LocalStatic,
        GetAccessor,
        SetAccessor,
        IsEnum,
        ShouldEmitModuleDecl,
        IsWholeFile,
        IsDynamic,
        MustCaptureThis,
    }
    enum SymbolFlags {
        None,
        Exported,
        Private,
        Public,
        Ambient,
        Static,
        LocalStatic,
        GetAccessor,
        SetAccessor,
        Property,
        Readonly,
        ModuleMember,
        InterfaceMember,
        ClassMember,
        BuiltIn,
        TypeSetDuringScopeAssignment,
        Constant,
        Optional,
        RecursivelyReferenced,
        Bound,
        CompilerGenerated,
    }
    enum VarFlags {
        None,
        Exported,
        Private,
        Public,
        Ambient,
        Static,
        LocalStatic,
        GetAccessor,
        SetAccessor,
        AutoInit,
        Property,
        Readonly,
        Class,
        ClassProperty,
        ClassBodyProperty,
        ClassConstructorProperty,
        ClassSuperMustBeFirstCallInConstructor,
        Constant,
        MustCaptureThis,
    }
    enum FncFlags {
        None,
        Exported,
        Private,
        Public,
        Ambient,
        Static,
        LocalStatic,
        GetAccessor,
        SetAccessor,
        Signature,
        Method,
        HasReturnExpression,
        CallMember,
        ConstructMember,
        HasSelfReference,
        IsFatArrowFunction,
        IndexerMember,
        IsFunctionExpression,
        ClassMethod,
        ClassPropertyMethodExported,
        HasSuperReferenceInFatArrowFunction,
        IsPropertyBound,
    }
    enum SignatureFlags {
        None,
        IsIndexer,
        IsStringIndexer,
        IsNumberIndexer,
    }
    function ToDeclFlags(fncFlags: FncFlags): DeclFlags;
    function ToDeclFlags(varFlags: VarFlags): DeclFlags;
    function ToDeclFlags(symFlags: SymbolFlags): DeclFlags;
    function ToDeclFlags(moduleFlags: ModuleFlags): DeclFlags;
    enum TypeFlags {
        None,
        HasImplementation,
        HasSelfReference,
        MergeResult,
        IsEnum,
        BuildingName,
        HasBaseType,
        HasBaseTypeOfObject,
        IsClass,
    }
    enum TypeRelationshipFlags {
        SuccessfulComparison,
        SourceIsNullTargetIsVoidOrUndefined,
        RequiredPropertyIsMissing,
        IncompatibleSignatures,
        SourceSignatureHasTooManyParameters,
        IncompatibleReturnTypes,
        IncompatiblePropertyTypes,
        IncompatibleParameterTypes,
    }
    enum CodeGenTarget {
        ES3,
        ES5,
    }
    enum ModuleGenTarget {
        Synchronous,
        Asynchronous,
        Local,
    }
    var codeGenTarget: CodeGenTarget;
    var moduleGenTarget: ModuleGenTarget;
    var optimizeModuleCodeGen: bool;
    function flagsToString(e, flags: number): string;
}
module TypeScript {
    enum NodeType {
        None,
        Empty,
        EmptyExpr,
        True,
        False,
        This,
        Super,
        QString,
        Regex,
        Null,
        ArrayLit,
        ObjectLit,
        Void,
        Comma,
        Pos,
        Neg,
        Delete,
        Await,
        In,
        Dot,
        From,
        Is,
        InstOf,
        Typeof,
        NumberLit,
        Name,
        TypeRef,
        Index,
        Call,
        New,
        Asg,
        AsgAdd,
        AsgSub,
        AsgDiv,
        AsgMul,
        AsgMod,
        AsgAnd,
        AsgXor,
        AsgOr,
        AsgLsh,
        AsgRsh,
        AsgRs2,
        ConditionalExpression,
        LogOr,
        LogAnd,
        Or,
        Xor,
        And,
        Eq,
        Ne,
        Eqv,
        NEqv,
        Lt,
        Le,
        Gt,
        Ge,
        Add,
        Sub,
        Mul,
        Div,
        Mod,
        Lsh,
        Rsh,
        Rs2,
        Not,
        LogNot,
        IncPre,
        DecPre,
        IncPost,
        DecPost,
        TypeAssertion,
        FuncDecl,
        Member,
        VarDecl,
        ArgDecl,
        Return,
        Break,
        Continue,
        Throw,
        For,
        ForIn,
        If,
        While,
        DoWhile,
        Block,
        Case,
        Switch,
        Try,
        TryCatch,
        TryFinally,
        Finally,
        Catch,
        List,
        Script,
        ClassDeclaration,
        InterfaceDeclaration,
        ModuleDeclaration,
        ImportDeclaration,
        With,
        Label,
        LabeledStatement,
        EBStart,
        GotoEB,
        EndCode,
        Error,
        Comment,
        Debugger,
        GeneralNode,
        LastAsg,
    }
}
module TypeScript {
    class BlockIntrinsics {
        public prototype;
        public toString;
        public toLocaleString;
        public valueOf;
        public hasOwnProperty;
        public propertyIsEnumerable;
        public isPrototypeOf;
        constructor();
    }
    interface IHashTable {
        getAllKeys(): string[];
        add(key: string, data): bool;
        addOrUpdate(key: string, data): bool;
        map(fn: (k: string, v: any, c: any) => void, context): void;
        every(fn: (k: string, v: any, c: any) => bool, context): bool;
        some(fn: (k: string, v: any, c: any) => bool, context): bool;
        count(): number;
        lookup(key: string): any;
    }
    class StringHashTable implements IHashTable {
        public itemCount: number;
        public table;
        public getAllKeys(): string[];
        public add(key: string, data): bool;
        public addOrUpdate(key: string, data): bool;
        public map(fn: (k: string, v: any, c: any) => void, context): void;
        public every(fn: (k: string, v: any, c: any) => bool, context): bool;
        public some(fn: (k: string, v: any, c: any) => bool, context): bool;
        public count(): number;
        public lookup(key: string);
    }
    class DualStringHashTable implements IHashTable {
        public primaryTable: IHashTable;
        public secondaryTable: IHashTable;
        public insertPrimary: bool;
        constructor(primaryTable: IHashTable, secondaryTable: IHashTable);
        public getAllKeys(): string[];
        public add(key: string, data): bool;
        public addOrUpdate(key: string, data): bool;
        public map(fn: (k: string, v: any, c: any) => void, context): void;
        public every(fn: (k: string, v: any, c: any) => bool, context): bool;
        public some(fn: (k: string, v: any, c: any) => bool, context): bool;
        public count(): number;
        public lookup(key: string);
    }
    function numberHashFn(key: number): number;
    function combineHashes(key1: number, key2: number): number;
    class HashEntry {
        public key;
        public data;
        public next: HashEntry;
        constructor(key, data);
    }
    class HashTable {
        public size: number;
        public hashFn: (key: any) => number;
        public equalsFn: (key1: any, key2: any) => bool;
        public itemCount: number;
        public table: HashEntry[];
        constructor(size: number, hashFn: (key: any) => number, equalsFn: (key1: any, key2: any) => bool);
        public add(key, data): bool;
        public remove(key);
        public count(): number;
        public lookup(key);
    }
    class SimpleHashTable {
        private keys;
        private values;
        public lookup(key, findValue?: bool): {
            key: any;
            data: any;
        };
        public add(key, data): bool;
    }
}
module TypeScript {
    class ASTSpan {
        public minChar: number;
        public limChar: number;
    }
    class AST extends ASTSpan {
        public nodeType: NodeType;
        public type: Type;
        public flags: ASTFlags;
        public passCreated: number;
        public preComments: Comment[];
        public postComments: Comment[];
        private docComments;
        public isParenthesized: bool;
        constructor(nodeType: NodeType);
        public isExpression(): bool;
        public isStatementOrExpression(): bool;
        public isCompoundStatement(): bool;
        public isLeaf(): bool;
        public isDeclaration(): bool;
        public typeCheck(typeFlow: TypeFlow): AST;
        public emit(emitter: Emitter, tokenId: TokenID, startLine: bool): void;
        public print(context: PrintContext): void;
        public printLabel();
        public addToControlFlow(context: ControlFlowContext): void;
        public netFreeUses(container: Symbol, freeUses: StringHashTable): void;
        public treeViewLabel();
        static getResolvedIdentifierName(name: string): string;
        public getDocComments(): Comment[];
    }
    class IncompleteAST extends AST {
        constructor(min: number, lim: number);
    }
    class ASTList extends AST {
        public enclosingScope: SymbolScope;
        public members: AST[];
        constructor();
        public addToControlFlow(context: ControlFlowContext): void;
        public append(ast: AST): ASTList;
        public appendAll(ast: AST): ASTList;
        public emit(emitter: Emitter, tokenId: TokenID, startLine: bool): void;
        public typeCheck(typeFlow: TypeFlow): ASTList;
    }
    class Identifier extends AST {
        public actualText: string;
        public hasEscapeSequence: bool;
        public sym: Symbol;
        public cloId: number;
        public text: string;
        constructor(actualText: string, hasEscapeSequence?: bool);
        public setText(actualText: string, hasEscapeSequence?: bool): void;
        public isMissing(): bool;
        public isLeaf(): bool;
        public treeViewLabel(): string;
        public printLabel(): string;
        public typeCheck(typeFlow: TypeFlow): AST;
        public emit(emitter: Emitter, tokenId: TokenID, startLine: bool): void;
        static fromToken(token: Token): Identifier;
    }
    class MissingIdentifier extends Identifier {
        constructor();
        public isMissing(): bool;
        public emit(emitter: Emitter, tokenId: TokenID, startLine: bool): void;
    }
    class Label extends AST {
        public id: Identifier;
        constructor(id: Identifier);
        public printLabel(): string;
        public typeCheck(typeFlow: TypeFlow): Label;
        public emit(emitter: Emitter, tokenId: TokenID, startLine: bool): void;
    }
    class Expression extends AST {
        constructor(nodeType: NodeType);
        public isExpression(): bool;
        public isStatementOrExpression(): bool;
    }
    class UnaryExpression extends Expression {
        public operand: AST;
        public targetType: Type;
        public castTerm: AST;
        constructor(nodeType: NodeType, operand: AST);
        public addToControlFlow(context: ControlFlowContext): void;
        public typeCheck(typeFlow: TypeFlow): AST;
        public emit(emitter: Emitter, tokenId: TokenID, startLine: bool): void;
    }
    class CallExpression extends Expression {
        public target: AST;
        public arguments: ASTList;
        constructor(nodeType: NodeType, target: AST, arguments: ASTList);
        public signature: Signature;
        public typeCheck(typeFlow: TypeFlow): AST;
        public emit(emitter: Emitter, tokenId: TokenID, startLine: bool): void;
    }
    class BinaryExpression extends Expression {
        public operand1: AST;
        public operand2: AST;
        constructor(nodeType: NodeType, operand1: AST, operand2: AST);
        public typeCheck(typeFlow: TypeFlow): AST;
        public emit(emitter: Emitter, tokenId: TokenID, startLine: bool): void;
    }
    class ConditionalExpression extends Expression {
        public operand1: AST;
        public operand2: AST;
        public operand3: AST;
        constructor(operand1: AST, operand2: AST, operand3: AST);
        public typeCheck(typeFlow: TypeFlow): ConditionalExpression;
        public emit(emitter: Emitter, tokenId: TokenID, startLine: bool): void;
    }
    class NumberLiteral extends Expression {
        public value: number;
        public text: string;
        constructor(value: number, text: string);
        public typeCheck(typeFlow: TypeFlow): NumberLiteral;
        public treeViewLabel(): string;
        public emit(emitter: Emitter, tokenId: TokenID, startLine: bool): void;
        public printLabel(): string;
    }
    class RegexLiteral extends Expression {
        public text: string;
        constructor(text: string);
        public typeCheck(typeFlow: TypeFlow): RegexLiteral;
        public emit(emitter: Emitter, tokenId: TokenID, startLine: bool): void;
    }
    class StringLiteral extends Expression {
        public text: string;
        constructor(text: string);
        public emit(emitter: Emitter, tokenId: TokenID, startLine: bool): void;
        public typeCheck(typeFlow: TypeFlow): StringLiteral;
        public treeViewLabel(): string;
        public printLabel(): string;
    }
    class ModuleElement extends AST {
        constructor(nodeType: NodeType);
    }
    class ImportDeclaration extends ModuleElement {
        public id: Identifier;
        public alias: AST;
        public isStatementOrExpression(): bool;
        public varFlags: VarFlags;
        public isDynamicImport: bool;
        public isDeclaration(): bool;
        constructor(id: Identifier, alias: AST);
        public emit(emitter: Emitter, tokenId: TokenID, startLine: bool): void;
        public typeCheck(typeFlow: TypeFlow): ImportDeclaration;
        public getAliasName(aliasAST?: AST): string;
        public firstAliasedModToString(): string;
    }
    class BoundDecl extends AST {
        public id: Identifier;
        public nestingLevel: number;
        public init: AST;
        public typeExpr: AST;
        public varFlags: VarFlags;
        public sym: Symbol;
        public isDeclaration(): bool;
        constructor(id: Identifier, nodeType: NodeType, nestingLevel: number);
        public isStatementOrExpression(): bool;
        public isPrivate(): bool;
        public isPublic(): bool;
        public isProperty(): bool;
        public typeCheck(typeFlow: TypeFlow): VarDecl;
        public printLabel();
    }
    class VarDecl extends BoundDecl {
        constructor(id: Identifier, nest: number);
        public isAmbient(): bool;
        public isExported(): bool;
        public isStatic(): bool;
        public emit(emitter: Emitter, tokenId: TokenID, startLine: bool): void;
        public treeViewLabel(): string;
    }
    class ArgDecl extends BoundDecl {
        constructor(id: Identifier);
        public isOptional: bool;
        public isOptionalArg();
        public treeViewLabel(): string;
        public parameterPropertySym: FieldSymbol;
        public emit(emitter: Emitter, tokenId: TokenID, startLine: bool): void;
    }
    class FuncDecl extends AST {
        public name: Identifier;
        public bod: ASTList;
        public isConstructor: bool;
        public arguments: ASTList;
        public vars: ASTList;
        public scopes: ASTList;
        public statics: ASTList;
        public hint: string;
        public fncFlags: FncFlags;
        public returnTypeAnnotation: AST;
        public symbols: IHashTable;
        public variableArgList: bool;
        public signature: Signature;
        public envids: Identifier[];
        public jumpRefs: Identifier[];
        public internalNameCache: string;
        public tmp1Declared: bool;
        public enclosingFnc: FuncDecl;
        public freeVariables: Symbol[];
        public unitIndex: number;
        public classDecl: NamedDeclaration;
        public boundToProperty: VarDecl;
        public isOverload: bool;
        public innerStaticFuncs: FuncDecl[];
        public isInlineCallLiteral: bool;
        public accessorSymbol: Symbol;
        public leftCurlyCount: number;
        public rightCurlyCount: number;
        public returnStatementsWithExpressions: ReturnStatement[];
        public scopeType: Type;
        public endingToken: ASTSpan;
        public isDeclaration(): bool;
        public constructorSpan: ASTSpan;
        constructor(name: Identifier, bod: ASTList, isConstructor: bool, arguments: ASTList, vars: ASTList, scopes: ASTList, statics: ASTList, nodeType: number);
        public internalName(): string;
        public hasSelfReference(): bool;
        public setHasSelfReference(): void;
        public hasSuperReferenceInFatArrowFunction(): bool;
        public setHasSuperReferenceInFatArrowFunction(): void;
        public addCloRef(id: Identifier, sym: Symbol): number;
        public addJumpRef(sym: Symbol): void;
        public buildControlFlow(): ControlFlowContext;
        public typeCheck(typeFlow: TypeFlow): FuncDecl;
        public emit(emitter: Emitter, tokenId: TokenID, startLine: bool): void;
        public getNameText(): string;
        public isMethod(): bool;
        public isCallMember(): bool;
        public isConstructMember(): bool;
        public isIndexerMember(): bool;
        public isSpecialFn(): bool;
        public isAnonymousFn(): bool;
        public isAccessor(): bool;
        public isGetAccessor(): bool;
        public isSetAccessor(): bool;
        public isAmbient(): bool;
        public isExported(): bool;
        public isPrivate(): bool;
        public isPublic(): bool;
        public isStatic(): bool;
        public treeViewLabel(): string;
        public ClearFlags(): void;
        public isSignature(): bool;
    }
    class LocationInfo {
        public filename: string;
        public lineMap: number[];
        public unitIndex;
        constructor(filename: string, lineMap: number[], unitIndex);
    }
    var unknownLocationInfo: LocationInfo;
    class Script extends FuncDecl {
        public locationInfo: LocationInfo;
        public referencedFiles: IFileReference[];
        public requiresGlobal: bool;
        public requiresExtendsBlock: bool;
        public isResident: bool;
        public isDeclareFile: bool;
        public hasBeenTypeChecked: bool;
        public topLevelMod: ModuleDeclaration;
        public leftCurlyCount: number;
        public rightCurlyCount: number;
        public vars: ASTList;
        public containsUnicodeChar: bool;
        public containsUnicodeCharInComment: bool;
        public cachedEmitRequired: bool;
        private setCachedEmitRequired(value);
        constructor(vars: ASTList, scopes: ASTList);
        public typeCheck(typeFlow: TypeFlow): Script;
        public treeViewLabel(): string;
        public emitRequired(emitOptions: EmitOptions): bool;
        public emit(emitter: Emitter, tokenId: TokenID, startLine: bool): void;
        public externallyVisibleImportedSymbols: Symbol[];
        public AddExternallyVisibleImportedSymbol(symbol: Symbol, checker: TypeChecker): void;
        public isExternallyVisibleSymbol(symbol: Symbol): bool;
    }
    class NamedDeclaration extends ModuleElement {
        public name: Identifier;
        public members: ASTList;
        public leftCurlyCount: number;
        public rightCurlyCount: number;
        public isDeclaration(): bool;
        constructor(nodeType: NodeType, name: Identifier, members: ASTList);
    }
    class ModuleDeclaration extends NamedDeclaration {
        public endingToken: ASTSpan;
        public modFlags: ModuleFlags;
        public mod: ModuleType;
        public prettyName: string;
        public amdDependencies: string[];
        public vars: ASTList;
        public containsUnicodeChar: bool;
        public containsUnicodeCharInComment: bool;
        constructor(name: Identifier, members: ASTList, vars: ASTList, endingToken: ASTSpan);
        public isExported(): bool;
        public isAmbient(): bool;
        public isEnum(): bool;
        public isWholeFile(): bool;
        public recordNonInterface(): void;
        public typeCheck(typeFlow: TypeFlow): ModuleDeclaration;
        public emit(emitter: Emitter, tokenId: TokenID, startLine: bool): void;
    }
    class TypeDeclaration extends NamedDeclaration {
        public extendsList: ASTList;
        public implementsList: ASTList;
        public varFlags: VarFlags;
        constructor(nodeType: NodeType, name: Identifier, extendsList: ASTList, implementsList: ASTList, members: ASTList);
        public isExported(): bool;
        public isAmbient(): bool;
    }
    class ClassDeclaration extends TypeDeclaration {
        public knownMemberNames: any;
        public constructorDecl: FuncDecl;
        public constructorNestingLevel: number;
        public endingToken: ASTSpan;
        constructor(name: Identifier, members: ASTList, extendsList: ASTList, implementsList: ASTList);
        public typeCheck(typeFlow: TypeFlow): ClassDeclaration;
        public emit(emitter: Emitter, tokenId: TokenID, startLine: bool): void;
    }
    class InterfaceDeclaration extends TypeDeclaration {
        constructor(name: Identifier, members: ASTList, extendsList: ASTList, implementsList: ASTList);
        public typeCheck(typeFlow: TypeFlow): InterfaceDeclaration;
        public emit(emitter: Emitter, tokenId: TokenID, startLine: bool): void;
    }
    class Statement extends ModuleElement {
        constructor(nodeType: NodeType);
        public isLoop(): bool;
        public isStatementOrExpression(): bool;
        public isCompoundStatement(): bool;
        public typeCheck(typeFlow: TypeFlow): Statement;
    }
    class LabeledStatement extends Statement {
        public labels: ASTList;
        public stmt: AST;
        constructor(labels: ASTList, stmt: AST);
        public emit(emitter: Emitter, tokenId: TokenID, startLine: bool): void;
        public typeCheck(typeFlow: TypeFlow): LabeledStatement;
        public addToControlFlow(context: ControlFlowContext): void;
    }
    class Block extends Statement {
        public statements: ASTList;
        public isStatementBlock: bool;
        constructor(statements: ASTList, isStatementBlock: bool);
        public emit(emitter: Emitter, tokenId: TokenID, startLine: bool): void;
        public addToControlFlow(context: ControlFlowContext): void;
        public typeCheck(typeFlow: TypeFlow): Block;
    }
    class Jump extends Statement {
        public target: string;
        public hasExplicitTarget(): string;
        public resolvedTarget: Statement;
        constructor(nodeType: NodeType);
        public setResolvedTarget(parser: Parser, stmt: Statement): bool;
        public addToControlFlow(context: ControlFlowContext): void;
        public emit(emitter: Emitter, tokenId: TokenID, startLine: bool): void;
    }
    class WhileStatement extends Statement {
        public cond: AST;
        public body: AST;
        constructor(cond: AST);
        public isLoop(): bool;
        public emit(emitter: Emitter, tokenId: TokenID, startLine: bool): void;
        public typeCheck(typeFlow: TypeFlow): WhileStatement;
        public addToControlFlow(context: ControlFlowContext): void;
    }
    class DoWhileStatement extends Statement {
        public body: AST;
        public whileAST: AST;
        public cond: AST;
        public isLoop(): bool;
        constructor();
        public emit(emitter: Emitter, tokenId: TokenID, startLine: bool): void;
        public typeCheck(typeFlow: TypeFlow): DoWhileStatement;
        public addToControlFlow(context: ControlFlowContext): void;
    }
    class IfStatement extends Statement {
        public cond: AST;
        public thenBod: AST;
        public elseBod: AST;
        public statement: ASTSpan;
        constructor(cond: AST);
        public isCompoundStatement(): bool;
        public emit(emitter: Emitter, tokenId: TokenID, startLine: bool): void;
        public typeCheck(typeFlow: TypeFlow): IfStatement;
        public addToControlFlow(context: ControlFlowContext): void;
    }
    class ReturnStatement extends Statement {
        public returnExpression: AST;
        constructor();
        public emit(emitter: Emitter, tokenId: TokenID, startLine: bool): void;
        public addToControlFlow(context: ControlFlowContext): void;
        public typeCheck(typeFlow: TypeFlow): ReturnStatement;
    }
    class EndCode extends AST {
        constructor();
    }
    class ForInStatement extends Statement {
        public lval: AST;
        public obj: AST;
        constructor(lval: AST, obj: AST);
        public statement: ASTSpan;
        public body: AST;
        public isLoop(): bool;
        public isFiltered(): bool;
        public emit(emitter: Emitter, tokenId: TokenID, startLine: bool): void;
        public typeCheck(typeFlow: TypeFlow): ForInStatement;
        public addToControlFlow(context: ControlFlowContext): void;
    }
    class ForStatement extends Statement {
        public init: AST;
        public cond: AST;
        public body: AST;
        public incr: AST;
        constructor(init: AST);
        public isLoop(): bool;
        public emit(emitter: Emitter, tokenId: TokenID, startLine: bool): void;
        public typeCheck(typeFlow: TypeFlow): ForStatement;
        public addToControlFlow(context: ControlFlowContext): void;
    }
    class WithStatement extends Statement {
        public expr: AST;
        public body: AST;
        public isCompoundStatement(): bool;
        public withSym: WithSymbol;
        constructor(expr: AST);
        public emit(emitter: Emitter, tokenId: TokenID, startLine: bool): void;
        public typeCheck(typeFlow: TypeFlow): WithStatement;
    }
    class SwitchStatement extends Statement {
        public val: AST;
        public caseList: ASTList;
        public defaultCase: CaseStatement;
        public statement: ASTSpan;
        constructor(val: AST);
        public isCompoundStatement(): bool;
        public emit(emitter: Emitter, tokenId: TokenID, startLine: bool): void;
        public typeCheck(typeFlow: TypeFlow): SwitchStatement;
        public addToControlFlow(context: ControlFlowContext): void;
    }
    class CaseStatement extends Statement {
        public expr: AST;
        public body: ASTList;
        public colonSpan: ASTSpan;
        constructor();
        public emit(emitter: Emitter, tokenId: TokenID, startLine: bool): void;
        public typeCheck(typeFlow: TypeFlow): CaseStatement;
        public addToControlFlow(context: ControlFlowContext): void;
    }
    class TypeReference extends AST {
        public term: AST;
        public arrayCount: number;
        constructor(term: AST, arrayCount: number);
        public emit(emitter: Emitter, tokenId: TokenID, startLine: bool): void;
        public typeCheck(typeFlow: TypeFlow): TypeReference;
    }
    class TryFinally extends Statement {
        public tryNode: AST;
        public finallyNode: Finally;
        constructor(tryNode: AST, finallyNode: Finally);
        public isCompoundStatement(): bool;
        public emit(emitter: Emitter, tokenId: TokenID, startLine: bool): void;
        public typeCheck(typeFlow: TypeFlow): TryFinally;
        public addToControlFlow(context: ControlFlowContext): void;
    }
    class TryCatch extends Statement {
        public tryNode: Try;
        public catchNode: Catch;
        constructor(tryNode: Try, catchNode: Catch);
        public isCompoundStatement(): bool;
        public emit(emitter: Emitter, tokenId: TokenID, startLine: bool): void;
        public addToControlFlow(context: ControlFlowContext): void;
        public typeCheck(typeFlow: TypeFlow): TryCatch;
    }
    class Try extends Statement {
        public body: AST;
        constructor(body: AST);
        public emit(emitter: Emitter, tokenId: TokenID, startLine: bool): void;
        public typeCheck(typeFlow: TypeFlow): Try;
        public addToControlFlow(context: ControlFlowContext): void;
    }
    class Catch extends Statement {
        public param: VarDecl;
        public body: AST;
        constructor(param: VarDecl, body: AST);
        public statement: ASTSpan;
        public containedScope: SymbolScope;
        public emit(emitter: Emitter, tokenId: TokenID, startLine: bool): void;
        public addToControlFlow(context: ControlFlowContext): void;
        public typeCheck(typeFlow: TypeFlow): Catch;
    }
    class Finally extends Statement {
        public body: AST;
        constructor(body: AST);
        public emit(emitter: Emitter, tokenId: TokenID, startLine: bool): void;
        public addToControlFlow(context: ControlFlowContext): void;
        public typeCheck(typeFlow: TypeFlow): Finally;
    }
    class Comment extends AST {
        public content: string;
        public isBlockComment: bool;
        public endsLine;
        public text: string[];
        public minLine: number;
        public limLine: number;
        private docCommentText;
        constructor(content: string, isBlockComment: bool, endsLine);
        public getText(): string[];
        public isDocComment(): bool;
        public getDocCommentText(): string;
        static consumeLeadingSpace(line: string, startIndex: number, maxSpacesToRemove?: number): number;
        static isSpaceChar(line: string, index: number): bool;
        static cleanDocCommentLine(line: string, jsDocStyleComment: bool, jsDocLineSpaceToRemove?: number): {
            minChar: number;
            limChar: number;
            jsDocSpacesRemoved: number;
        };
        static cleanJSDocComment(content: string, spacesToRemove?: number): string;
        static getDocCommentText(comments: Comment[]): string;
        static getParameterDocCommentText(param: string, fncDocComments: Comment[]): string;
        static getDocCommentFirstOverloadSignature(signatureGroup: SignatureGroup): string;
    }
    class DebuggerStatement extends Statement {
        constructor();
        public emit(emitter: Emitter, tokenId: TokenID, startLine: bool): void;
    }
}
module TypeScript {
    interface IAstWalker {
        walk(ast: AST, parent: AST): AST;
        options: AstWalkOptions;
        state: any;
    }
    class AstWalkOptions {
        public goChildren: bool;
        public goNextSibling: bool;
        public reverseSiblings: bool;
        public stopWalk(stop?: bool): void;
    }
    interface IAstWalkCallback {
        (ast: AST, parent: AST, walker: IAstWalker): AST;
    }
    interface IAstWalkChildren {
        (preAst: AST, parent: AST, walker: IAstWalker): void;
    }
    class AstWalkerFactory {
        private childrenWalkers;
        constructor();
        public walk(ast: AST, pre: IAstWalkCallback, post?: IAstWalkCallback, options?: AstWalkOptions, state?: any): AST;
        public getWalker(pre: IAstWalkCallback, post?: IAstWalkCallback, options?: AstWalkOptions, state?: any): IAstWalker;
        private getSlowWalker(pre, post?, options?, state?);
        private initChildrenWalkers();
    }
    function getAstWalkerFactory(): AstWalkerFactory;
}
module TypeScript.AstWalkerWithDetailCallback {
    interface AstWalkerDetailCallback {
        EmptyCallback? (pre, ast: AST): bool;
        EmptyExprCallback? (pre, ast: AST): bool;
        TrueCallback? (pre, ast: AST): bool;
        FalseCallback? (pre, ast: AST): bool;
        ThisCallback? (pre, ast: AST): bool;
        SuperCallback? (pre, ast: AST): bool;
        QStringCallback? (pre, ast: AST): bool;
        RegexCallback? (pre, ast: AST): bool;
        NullCallback? (pre, ast: AST): bool;
        ArrayLitCallback? (pre, ast: AST): bool;
        ObjectLitCallback? (pre, ast: AST): bool;
        VoidCallback? (pre, ast: AST): bool;
        CommaCallback? (pre, ast: AST): bool;
        PosCallback? (pre, ast: AST): bool;
        NegCallback? (pre, ast: AST): bool;
        DeleteCallback? (pre, ast: AST): bool;
        AwaitCallback? (pre, ast: AST): bool;
        InCallback? (pre, ast: AST): bool;
        DotCallback? (pre, ast: AST): bool;
        FromCallback? (pre, ast: AST): bool;
        IsCallback? (pre, ast: AST): bool;
        InstOfCallback? (pre, ast: AST): bool;
        TypeofCallback? (pre, ast: AST): bool;
        NumberLitCallback? (pre, ast: AST): bool;
        NameCallback? (pre, identifierAst: Identifier): bool;
        TypeRefCallback? (pre, ast: AST): bool;
        IndexCallback? (pre, ast: AST): bool;
        CallCallback? (pre, ast: AST): bool;
        NewCallback? (pre, ast: AST): bool;
        AsgCallback? (pre, ast: AST): bool;
        AsgAddCallback? (pre, ast: AST): bool;
        AsgSubCallback? (pre, ast: AST): bool;
        AsgDivCallback? (pre, ast: AST): bool;
        AsgMulCallback? (pre, ast: AST): bool;
        AsgModCallback? (pre, ast: AST): bool;
        AsgAndCallback? (pre, ast: AST): bool;
        AsgXorCallback? (pre, ast: AST): bool;
        AsgOrCallback? (pre, ast: AST): bool;
        AsgLshCallback? (pre, ast: AST): bool;
        AsgRshCallback? (pre, ast: AST): bool;
        AsgRs2Callback? (pre, ast: AST): bool;
        QMarkCallback? (pre, ast: AST): bool;
        LogOrCallback? (pre, ast: AST): bool;
        LogAndCallback? (pre, ast: AST): bool;
        OrCallback? (pre, ast: AST): bool;
        XorCallback? (pre, ast: AST): bool;
        AndCallback? (pre, ast: AST): bool;
        EqCallback? (pre, ast: AST): bool;
        NeCallback? (pre, ast: AST): bool;
        EqvCallback? (pre, ast: AST): bool;
        NEqvCallback? (pre, ast: AST): bool;
        LtCallback? (pre, ast: AST): bool;
        LeCallback? (pre, ast: AST): bool;
        GtCallback? (pre, ast: AST): bool;
        GeCallback? (pre, ast: AST): bool;
        AddCallback? (pre, ast: AST): bool;
        SubCallback? (pre, ast: AST): bool;
        MulCallback? (pre, ast: AST): bool;
        DivCallback? (pre, ast: AST): bool;
        ModCallback? (pre, ast: AST): bool;
        LshCallback? (pre, ast: AST): bool;
        RshCallback? (pre, ast: AST): bool;
        Rs2Callback? (pre, ast: AST): bool;
        NotCallback? (pre, ast: AST): bool;
        LogNotCallback? (pre, ast: AST): bool;
        IncPreCallback? (pre, ast: AST): bool;
        DecPreCallback? (pre, ast: AST): bool;
        IncPostCallback? (pre, ast: AST): bool;
        DecPostCallback? (pre, ast: AST): bool;
        TypeAssertionCallback? (pre, ast: AST): bool;
        FuncDeclCallback? (pre, funcDecl: FuncDecl): bool;
        MemberCallback? (pre, ast: AST): bool;
        VarDeclCallback? (pre, varDecl: VarDecl): bool;
        ArgDeclCallback? (pre, ast: AST): bool;
        ReturnCallback? (pre, ast: AST): bool;
        BreakCallback? (pre, ast: AST): bool;
        ContinueCallback? (pre, ast: AST): bool;
        ThrowCallback? (pre, ast: AST): bool;
        ForCallback? (pre, ast: AST): bool;
        ForInCallback? (pre, ast: AST): bool;
        IfCallback? (pre, ast: AST): bool;
        WhileCallback? (pre, ast: AST): bool;
        DoWhileCallback? (pre, ast: AST): bool;
        BlockCallback? (pre, block: Block): bool;
        CaseCallback? (pre, ast: AST): bool;
        SwitchCallback? (pre, ast: AST): bool;
        TryCallback? (pre, ast: AST): bool;
        TryCatchCallback? (pre, ast: AST): bool;
        TryFinallyCallback? (pre, ast: AST): bool;
        FinallyCallback? (pre, ast: AST): bool;
        CatchCallback? (pre, ast: AST): bool;
        ListCallback? (pre, astList: ASTList): bool;
        ScriptCallback? (pre, script: Script): bool;
        ClassDeclarationCallback? (pre, ast: AST): bool;
        InterfaceDeclarationCallback? (pre, interfaceDecl: InterfaceDeclaration): bool;
        ModuleDeclarationCallback? (pre, moduleDecl: ModuleDeclaration): bool;
        ImportDeclarationCallback? (pre, ast: AST): bool;
        WithCallback? (pre, ast: AST): bool;
        LabelCallback? (pre, labelAST: AST): bool;
        LabeledStatementCallback? (pre, ast: AST): bool;
        EBStartCallback? (pre, ast: AST): bool;
        GotoEBCallback? (pre, ast: AST): bool;
        EndCodeCallback? (pre, ast: AST): bool;
        ErrorCallback? (pre, ast: AST): bool;
        CommentCallback? (pre, ast: AST): bool;
        DebuggerCallback? (pre, ast: AST): bool;
        DefaultCallback? (pre, ast: AST): bool;
    }
    function walk(script: Script, callback: AstWalkerDetailCallback): void;
}
module TypeScript {
    function lastOf(items: any[]): any;
    function max(a: number, b: number): number;
    function min(a: number, b: number): number;
    class AstPath {
        public asts: AST[];
        public top: number;
        static reverseIndexOf(items: any[], index: number): any;
        public clone(): AstPath;
        public pop(): AST;
        public push(ast: AST): void;
        public up(): void;
        public down(): void;
        public nodeType(): NodeType;
        public ast(): AST;
        public parent(): AST;
        public count(): number;
        public get(index: number): AST;
        public isNameOfClass(): bool;
        public isNameOfInterface(): bool;
        public isNameOfArgument(): bool;
        public isNameOfVariable(): bool;
        public isNameOfModule(): bool;
        public isNameOfFunction(): bool;
        public isChildOfScript(): bool;
        public isChildOfModule(): bool;
        public isChildOfClass(): bool;
        public isArgumentOfClassConstructor(): bool;
        public isChildOfInterface(): bool;
        public isTopLevelImplicitModule(): bool;
        public isBodyOfTopLevelImplicitModule(): bool;
        public isBodyOfScript(): bool;
        public isBodyOfSwitch(): bool;
        public isBodyOfModule(): bool;
        public isBodyOfClass(): bool;
        public isBodyOfFunction(): bool;
        public isBodyOfInterface(): bool;
        public isBodyOfBlock(): bool;
        public isBodyOfFor(): bool;
        public isBodyOfCase(): bool;
        public isBodyOfTry(): bool;
        public isBodyOfCatch(): bool;
        public isBodyOfDoWhile(): bool;
        public isBodyOfWhile(): bool;
        public isBodyOfForIn(): bool;
        public isBodyOfWith(): bool;
        public isBodyOfFinally(): bool;
        public isCaseOfSwitch(): bool;
        public isDefaultCaseOfSwitch(): bool;
        public isListOfObjectLit(): bool;
        public isBodyOfObjectLit(): bool;
        public isEmptyListOfObjectLit(): bool;
        public isMemberOfObjectLit(): bool;
        public isNameOfMemberOfObjectLit(): bool;
        public isListOfArrayLit(): bool;
        public isTargetOfMember(): bool;
        public isMemberOfMember(): bool;
        public isItemOfList(): bool;
        public isThenOfIf(): bool;
        public isElseOfIf(): bool;
        public isBodyOfDefaultCase(): bool;
        public isSingleStatementList(): bool;
        public isArgumentListOfFunction(): bool;
        public isArgumentOfFunction(): bool;
        public isArgumentListOfCall(): bool;
        public isArgumentListOfNew(): bool;
        public isSynthesizedBlock(): bool;
    }
    function isValidAstNode(ast: ASTSpan): bool;
    class AstPathContext {
        public path: AstPath;
    }
    enum GetAstPathOptions {
        Default,
        EdgeInclusive,
        DontPruneSearchBasedOnPosition,
    }
    function getAstPathToPosition(script: AST, pos: number, options?: GetAstPathOptions): AstPath;
    function getTokenizationOffset(script: Script, position: number): number;
    function walkAST(ast: AST, callback: (path: AstPath, walker: IAstWalker) => void): void;
}
module TypeScript {
    class AstLogger {
        public logger: ILogger;
        constructor(logger: ILogger);
        public logScript(script: Script): void;
        public logNode(script: Script, cur: AST, indent: number): void;
        private logComments(script, comments, indent);
        public logLinemap(linemap: number[]): void;
        private addPadding(s, targetLength, paddingString, leftPadding);
        private addLineColumn(script, position);
    }
}
module TypeScript {
    class Binder {
        public checker: TypeChecker;
        constructor(checker: TypeChecker);
        public resolveBaseTypeLinks(typeLinks: TypeLink[], scope: SymbolScope): Type[];
        public resolveBases(scope: SymbolScope, type: Type): void;
        public resolveSignatureGroup(signatureGroup: SignatureGroup, scope: SymbolScope, instanceType: Type): void;
        public bindType(scope: SymbolScope, type: Type, instanceType: Type): void;
        public bindSymbol(scope: SymbolScope, symbol: Symbol): void;
        public bind(scope: SymbolScope, table: IHashTable): void;
    }
}
module TypeScript {
    class Base64VLQFormat {
        static encode(inValue: number): string;
        static decode(inString: string): {
            value: number;
            rest: string;
        };
    }
}
var JSON2: any;
module TypeScript {
    class SourceMapPosition {
        public sourceLine: number;
        public sourceColumn: number;
        public emittedLine: number;
        public emittedColumn: number;
    }
    class SourceMapping {
        public start: SourceMapPosition;
        public end: SourceMapPosition;
        public nameIndex: number;
        public childMappings: SourceMapping[];
    }
    class SourceMapper {
        public jsFile: ITextWriter;
        public sourceMapOut: ITextWriter;
        public errorReporter: ErrorReporter;
        static MapFileExtension: string;
        public sourceMappings: SourceMapping[];
        public currentMappings: SourceMapping[][];
        public names: string[];
        public currentNameIndex: number[];
        public jsFileName: string;
        public tsFileName: string;
        constructor(tsFileName: string, jsFileName: string, jsFile: ITextWriter, sourceMapOut: ITextWriter, errorReporter: ErrorReporter, emitFullPathOfSourceMap: bool);
        static EmitSourceMapping(allSourceMappers: SourceMapper[]): void;
    }
}
module TypeScript {
    enum EmitContainer {
        Prog,
        Module,
        DynamicModule,
        Class,
        Constructor,
        Function,
        Args,
        Interface,
    }
    class EmitState {
        public column: number;
        public line: number;
        public pretty: bool;
        public inObjectLiteral: bool;
        public container: EmitContainer;
        constructor();
    }
    class EmitOptions {
        public minWhitespace: bool;
        public propagateConstants: bool;
        public emitComments: bool;
        public emitFullSourceMapPath: bool;
        public outputOption: string;
        public ioHost: EmitterIOHost;
        public outputMany: bool;
        public commonDirectoryPath: string;
        constructor(settings: CompilationSettings);
        public mapOutputFileName(fileName: string, extensionChanger: (fname: string, wholeFileNameReplaced: bool) => string): string;
    }
    class Indenter {
        static indentStep: number;
        static indentStepString: string;
        static indentStrings: string[];
        public indentAmt: number;
        public increaseIndent(): void;
        public decreaseIndent(): void;
        public getIndent(): string;
    }
    class Emitter {
        public checker: TypeChecker;
        public emittingFileName: string;
        public outfile: ITextWriter;
        public emitOptions: EmitOptions;
        public errorReporter: ErrorReporter;
        public globalThisCapturePrologueEmitted: bool;
        public extendsPrologueEmitted: bool;
        public thisClassNode: TypeDeclaration;
        public thisFnc: FuncDecl;
        public moduleDeclList: ModuleDeclaration[];
        public moduleName: string;
        public emitState: EmitState;
        public indenter: Indenter;
        public ambientModule: bool;
        public modAliasId: string;
        public firstModAlias: string;
        public allSourceMappers: SourceMapper[];
        public sourceMapper: SourceMapper;
        public captureThisStmtString: string;
        private varListCountStack;
        constructor(checker: TypeChecker, emittingFileName: string, outfile: ITextWriter, emitOptions: EmitOptions, errorReporter: ErrorReporter);
        public setSourceMappings(mapper: SourceMapper): void;
        public writeToOutput(s: string): void;
        public writeToOutputTrimmable(s: string): void;
        public writeLineToOutput(s: string): void;
        public writeCaptureThisStatement(ast: AST): void;
        public setInVarBlock(count: number): void;
        public setInObjectLiteral(val: bool): bool;
        public setContainer(c: number): number;
        private getIndentString();
        public emitIndent(): void;
        public emitCommentInPlace(comment: Comment): void;
        public emitParensAndCommentsInPlace(ast: AST, pre: bool): void;
        public emitObjectLiteral(content: ASTList): void;
        public emitArrayLiteral(content: ASTList): void;
        public emitNew(target: AST, args: ASTList): void;
        private getConstantValue(init);
        public tryEmitConstant(dotExpr: BinaryExpression): bool;
        public emitCall(callNode: CallExpression, target: AST, args: ASTList): void;
        public emitConstructorCalls(bases: ASTList, classDecl: TypeDeclaration): void;
        public emitInnerFunction(funcDecl: FuncDecl, printName: bool, isMember: bool, bases: ASTList, hasSelfRef: bool, classDecl: TypeDeclaration): void;
        public emitJavascriptModule(moduleDecl: ModuleDeclaration): void;
        public emitIndex(operand1: AST, operand2: AST): void;
        public emitStringLiteral(text: string): void;
        public emitJavascriptFunction(funcDecl: FuncDecl): void;
        public emitAmbientVarDecl(varDecl: VarDecl): void;
        private varListCount();
        private emitVarDeclVar();
        private onEmitVar();
        public emitJavascriptVarDecl(varDecl: VarDecl, tokenId: TokenID): void;
        public declEnclosed(moduleDecl: ModuleDeclaration): bool;
        public emitJavascriptName(name: Identifier, addThis: bool): void;
        public emitJavascriptStatements(stmts: AST, emitEmptyBod: bool): void;
        public emitBareJavascriptStatements(stmts: AST, emitClassPropertiesAfterSuperCall?: bool): void;
        public recordSourceMappingNameStart(name: string): void;
        public recordSourceMappingNameEnd(): void;
        public recordSourceMappingStart(ast: ASTSpan): void;
        public recordSourceMappingEnd(ast: ASTSpan): void;
        public Close(): void;
        public emitJavascriptList(ast: AST, delimiter: string, tokenId: TokenID, startLine: bool, onlyStatics: bool, emitClassPropertiesAfterSuperCall?: bool, emitPrologue?: bool, requiresExtendsBlock?: bool): void;
        public emitJavascript(ast: AST, tokenId: TokenID, startLine: bool): void;
        public emitPropertyAccessor(funcDecl: FuncDecl, className: string, isProto: bool): void;
        public emitPrototypeMember(member: AST, className: string): void;
        public emitAddBaseMethods(className: string, base: Type, classDecl: TypeDeclaration): void;
        public emitJavascriptClass(classDecl: ClassDeclaration): void;
        public emitPrologue(reqInherits: bool): void;
        public emitSuperReference(): void;
        public emitSuperCall(callEx: CallExpression): bool;
        public emitThis(): void;
        private static shouldCaptureThis(func);
        private createFile(fileName, useUTF8);
    }
}
module TypeScript {
    interface ILineCol {
        line: number;
        col: number;
    }
    class ErrorReporter {
        public outfile: ITextWriter;
        public parser: Parser;
        public checker: TypeChecker;
        public lineCol: {
            line: number;
            col: number;
        };
        public emitAsComments: bool;
        public hasErrors: bool;
        public pushToErrorSink: bool;
        public errorSink: string[];
        constructor(outfile: ITextWriter);
        public getCapturedErrors(): string[];
        public freeCapturedErrors(): void;
        public captureError(emsg: string): void;
        public setErrOut(outerr): void;
        public emitPrefix(): void;
        public writePrefix(ast: AST): void;
        public writePrefixFromSym(symbol: Symbol): void;
        public setError(ast: AST): void;
        public reportError(ast: AST, message: string): void;
        public reportErrorFromSym(symbol: Symbol, message: string): void;
        public emitterError(ast: AST, message: string): void;
        public duplicateIdentifier(ast: AST, name: string): void;
        public showRef(ast: AST, text: string, symbol: Symbol): void;
        public unresolvedSymbol(ast: AST, name: string): void;
        public symbolDoesNotReferToAValue(ast: AST, name: string): void;
        public styleError(ast: AST, msg: string): void;
        public simpleError(ast: AST, msg: string): void;
        public simpleErrorFromSym(sym: Symbol, msg: string): void;
        public invalidSuperReference(ast: AST): void;
        public valueCannotBeModified(ast: AST): void;
        public invalidCall(ast: CallExpression, nodeType: number, scope: SymbolScope): void;
        public indexLHS(ast: BinaryExpression, scope: SymbolScope): void;
        public incompatibleTypes(ast: AST, t1: Type, t2: Type, op: string, scope: SymbolScope, comparisonInfo?: TypeComparisonInfo): void;
        public expectedClassOrInterface(ast: AST): void;
        public unaryOperatorTypeError(ast: AST, op: string, type: Type): void;
    }
}
module TypeScript {
    enum TypeContext {
        NoTypes,
        ArraySuffix,
        Primitive,
        Named,
        AllSimpleTypes,
        AllTypes,
    }
    interface IStatementInfo {
        stmt: Statement;
        labels: ASTList;
    }
    interface ILambdaArgumentContext {
        preProcessedLambdaArgs: AST;
    }
    class QuickParseResult {
        public Script: Script;
        public endLexState: LexState;
        constructor(Script: Script, endLexState: LexState);
    }
    class Parser {
        private varLists;
        private scopeLists;
        private staticsLists;
        private scanner;
        private currentToken;
        private needTerminator;
        private inFunction;
        private inInterfaceDecl;
        public currentClassDecl: NamedDeclaration;
        private inFncDecl;
        private anonId;
        public style_requireSemi: bool;
        public style_funcInLoop: bool;
        private incremental;
        public errorRecovery: bool;
        public outfile: ITextWriter;
        public errorCallback: (minChar: number, charLen: number, message: string, unit: number) => void;
        private ambientModule;
        private ambientClass;
        private topLevel;
        private allowImportDeclaration;
        private currentUnitIndex;
        private prevIDTok;
        private statementInfoStack;
        private hasTopLevelImportOrExport;
        private strictMode;
        private nestingLevel;
        private prevExpr;
        private currentClassDefinition;
        private parsingClassConstructorDefinition;
        private parsingDeclareFile;
        private amdDependencies;
        public inferPropertiesFromThisAssignment: bool;
        public requiresExtendsBlock: bool;
        private resetStmtStack();
        private inLoop();
        private pushStmt(stmt, labels);
        private popStmt();
        private resolveJumpTarget(jump);
        public setErrorRecovery(outfile: ITextWriter): void;
        public getSourceLineCol(lineCol: ILineCol, minChar: number): void;
        private createRef(text, hasEscapeSequence, minChar);
        private reportParseStyleError(message);
        public reportParseError(message: string, startPos?: number, pos?: number): void;
        private checkNextToken(tokenId, errorRecoverySet, errorText?);
        private skip(errorRecoverySet);
        private checkCurrentToken(tokenId, errorRecoverySet, errorText?);
        private pushDeclLists();
        private popDeclLists();
        private topVarList();
        private topScopeList();
        private topStaticsList();
        private parseComment(comment);
        private parseCommentsInner(comments);
        private parseComments();
        private parseCommentsForLine(line);
        private combineComments(comment1, comment2);
        private parseEnumDecl(errorRecoverySet, modifiers);
        private parseDottedName(enclosedList);
        private isValidImportPath(importPath);
        private parseImportDeclaration(errorRecoverySet, modifiers);
        private parseModuleDecl(errorRecoverySet, modifiers, preComments);
        private parseTypeReferenceTail(errorRecoverySet, minChar, term);
        private parseNamedType(errorRecoverySet, minChar, term, tail);
        private parseTypeReference(errorRecoverySet, allowVoid);
        private parseObjectType(minChar, errorRecoverySet);
        private parseFunctionBlock(errorRecoverySet, allowedElements, parentModifiers, bod, bodMinChar);
        private parseFunctionStatements(errorRecoverySet, name, isConstructor, isMethod, args, allowedElements, minChar, requiresSignature, parentModifiers);
        private transformAnonymousArgsIntoFormals(formals, argList);
        private parseFormalParameterList(errorRecoverySet, formals, isClassConstr, isSig, isIndexer, isGetter, isSetter, isLambda, preProcessedLambdaArgs, expectClosingRParen);
        private parseFncDecl(errorRecoverySet, isDecl, requiresSignature, isMethod, methodName, indexer, isStatic, markedAsAmbient, modifiers, lambdaArgContext, expectClosingRParen);
        private convertToTypeReference(ast);
        private parseArgList(errorRecoverySet);
        private parseBaseList(extendsList, implementsList, errorRecoverySet, isClass);
        private parseClassDecl(errorRecoverySet, minChar, modifiers);
        private parseClassElements(classDecl, errorRecoverySet, parentModifiers);
        private parseClassConstructorDeclaration(minChar, errorRecoverySet, modifiers);
        private parseClassMemberVariableDeclaration(text, minChar, isDeclaredInConstructor, errorRecoverySet, modifiers);
        private parseClassMemberFunctionDeclaration(methodName, minChar, errorRecoverySet, modifiers);
        private parseTypeMember(errorRecoverySet);
        private parseTypeMemberList(errorRecoverySet, members);
        private parseInterfaceDecl(errorRecoverySet, modifiers);
        private makeVarDecl(id, nest);
        private parsePropertyDeclaration(errorRecoverySet, modifiers, requireSignature, isStatic, unnamedAmbientFunctionOk?);
        private parseVariableDeclaration(errorRecoverySet, modifiers, allowIn, isStatic);
        private parseMemberList(errorRecoverySet);
        private parseArrayList(errorRecoverySet);
        private parseArrayLiteral(errorRecoverySet);
        private parseTerm(errorRecoverySet, allowCall, typeContext, inCast);
        private parseLambdaExpr(errorRecoverySet, lambdaArgs, skipNextRParen, expectClosingRParen);
        private parseExpr(errorRecoverySet, minPrecedence, allowIn, typeContext, possiblyInLambda?);
        private parsePostfixOperators(errorRecoverySet, ast, allowCall, inNew, typeContext, lhsMinChar, lhsLimChar);
        private parseTry(tryNode, errorRecoverySet, parentModifiers);
        private parseCatch(errorRecoverySet, parentModifiers);
        private parseFinally(errorRecoverySet, parentModifiers);
        private parseTryCatchFinally(errorRecoverySet, parentModifiers, labelList);
        private parseStatement(errorRecoverySet, allowedElements, parentModifiers);
        private okAmbientModuleMember(ast);
        private parseStatementList(errorRecoverySet, statements, sourceElms, noLeadingCase, allowedElements, parentModifiers);
        private fname;
        public quickParse(sourceText: ISourceText, filename: string, unitIndex: number): QuickParseResult;
        public parse(sourceText: ISourceText, filename: string, unitIndex: number, allowedElements?: AllowedElements): Script;
    }
    function quickParse(logger: ILogger, scopeStartAST: AST, sourceText: ISourceText, minChar: number, limChar: number, errorCapture: (minChar: number, charLen: number, message: string, unitIndex: number) => void): QuickParseResult;
}
module TypeScript {
    class PrintContext {
        public outfile: ITextWriter;
        public parser: Parser;
        public builder: string;
        public indent1: string;
        public indentStrings: string[];
        public indentAmt: number;
        constructor(outfile: ITextWriter, parser: Parser);
        public increaseIndent(): void;
        public decreaseIndent(): void;
        public startLine(): void;
        public write(s): void;
        public writeLine(s): void;
    }
    function prePrintAST(ast: AST, parent: AST, walker: IAstWalker): AST;
    function postPrintAST(ast: AST, parent: AST, walker: IAstWalker): AST;
}
module TypeScript {
    var LexEOF: number;
    var LexCodeNWL: number;
    var LexCodeRET: number;
    var LexCodeLS: number;
    var LexCodePS: number;
    var LexCodeTAB: number;
    var LexCodeVTAB: number;
    var LexCode_e: number;
    var LexCode_E: number;
    var LexCode_x: number;
    var LexCode_X: number;
    var LexCode_a: number;
    var LexCode_A: number;
    var LexCode_f: number;
    var LexCode_F: number;
    var LexCode_g: number;
    var LexCode_m: number;
    var LexCode_i: number;
    var LexCode_u: number;
    var LexCode_0: number;
    var LexCode_9: number;
    var LexCode_8: number;
    var LexCode_7: number;
    var LexCodeBSL: number;
    var LexCodeSHP: number;
    var LexCodeBNG: number;
    var LexCodeQUO: number;
    var LexCodeAPO: number;
    var LexCodePCT: number;
    var LexCodeAMP: number;
    var LexCodeLPR: number;
    var LexCodeRPR: number;
    var LexCodePLS: number;
    var LexCodeMIN: number;
    var LexCodeMUL: number;
    var LexCodeSLH: number;
    var LexCodeXOR: number;
    var LexCodeCMA: number;
    var LexCodeDOT: number;
    var LexCodeLT: number;
    var LexCodeEQ: number;
    var LexCodeGT: number;
    var LexCodeQUE: number;
    var LexCodeLBR: number;
    var LexCodeRBR: number;
    var LexCodeUSC: number;
    var LexCodeLC: number;
    var LexCodeRC: number;
    var LexCodeBAR: number;
    var LexCodeTIL: number;
    var LexCodeCOL: number;
    var LexCodeSMC: number;
    var LexCodeUnderscore: number;
    var LexCodeDollar: number;
    var LexCodeSpace: number;
    var LexCodeAtSign: number;
    var LexCodeASCIIChars: number;
    var LexKeywordTable;
    function LexLookUpUnicodeMap(code: number, map: number[]): bool;
    function LexIsUnicodeDigit(code: number): bool;
    function LexIsUnicodeIdStart(code: number): bool;
    function LexInitialize(): void;
    function LexAdjustIndent(code, indentAmt);
    function LexIsIdentifierStartChar(code): bool;
    function LexIsDigit(code): bool;
    function LexIsIdentifierChar(code: number): bool;
    function LexMatchingOpen(code): number;
    enum NumberScanState {
        Start,
        InFraction,
        InEmptyFraction,
        InExponent,
    }
    enum LexState {
        Start,
        InMultilineComment,
        InMultilineSingleQuoteString,
        InMultilineDoubleQuoteString,
    }
    enum LexMode {
        Line,
        File,
    }
    enum CommentStyle {
        Line,
        Block,
    }
    interface ISourceText {
        getText(start: number, end: number): string;
        getLength(): number;
    }
    class StringSourceText implements ISourceText {
        public text: string;
        constructor(text: string);
        public getText(start: number, end: number): string;
        public getLength(): number;
    }
    class SourceTextSegment implements ISourceTextSegment {
        public segmentStart: number;
        public segmentEnd: number;
        public segment: string;
        constructor(segmentStart: number, segmentEnd: number, segment: string);
        public charCodeAt(index: number): number;
        public substring(start: number, end: number): string;
    }
    class AggerateSourceTextSegment implements ISourceTextSegment {
        public seg1: SourceTextSegment;
        public seg2: SourceTextSegment;
        constructor(seg1: SourceTextSegment, seg2: SourceTextSegment);
        public charCodeAt(index: number): number;
        public substring(start: number, end: number): string;
    }
    interface ISourceTextSegment {
        charCodeAt(index: number): number;
        substring(start: number, end: number): string;
    }
    class ScannerTextStream {
        public sourceText: ISourceText;
        static emptySegment: SourceTextSegment;
        public agg: AggerateSourceTextSegment;
        public len: number;
        constructor(sourceText: ISourceText);
        public max(a: number, b: number): number;
        public min(a: number, b: number): number;
        public fetchSegment(start: number, end: number): ISourceTextSegment;
        public charCodeAt(index: number): number;
        public substring(start: number, end: number): string;
    }
    interface IScanner {
        startPos: number;
        pos: number;
        scan(): Token;
        previousToken(): Token;
        prevLine: number;
        line: number;
        col: number;
        leftCurlyCount: number;
        rightCurlyCount: number;
        lastTokenLimChar(): number;
        lastTokenHadNewline(): bool;
        lexState: number;
        getComments(): CommentToken[];
        getCommentsForLine(line: number): CommentToken[];
        resetComments(): void;
        lineMap: number[];
        setSourceText(newSrc: ISourceText, textMode: number): void;
        setErrorHandler(reportError: (message: string) => void): void;
        seenUnicodeChar: bool;
        seenUnicodeCharInComment: bool;
        getLookAheadToken(): Token;
    }
    class SavedTokens implements IScanner {
        public prevToken: Token;
        public curSavedToken: SavedToken;
        public prevSavedToken: SavedToken;
        public currentTokenIndex: number;
        public currentTokens: SavedToken[];
        public tokensByLine: SavedToken[][];
        public lexStateByLine: LexState[];
        private prevToken;
        public previousToken(): Token;
        public currentToken: number;
        public tokens: SavedToken[];
        public startPos: number;
        public pos: number;
        public seenUnicodeChar: bool;
        public seenUnicodeCharInComment: bool;
        public startLine: number;
        public prevLine: number;
        public line: number;
        public col: number;
        public leftCurlyCount: number;
        public rightCurlyCount: number;
        public lexState: LexState;
        public commentStack: CommentToken[];
        public lineMap: number[];
        public addToken(tok: Token, scanner: IScanner): void;
        public scan(): Token;
        public lastTokenLimChar(): number;
        public lastTokenHadNewline(): bool;
        public getComments(): CommentToken[];
        public getCommentsForLine(line: number): CommentToken[];
        public resetComments(): void;
        public setSourceText(newSrc: ISourceText, textMode: number): void;
        public setErrorHandler(reportError: (message: string) => void): void;
        public getLookAheadToken(): Token;
    }
    class Scanner implements IScanner {
        public prevLine: number;
        public line: number;
        public col: number;
        public pos: number;
        public startPos: number;
        public startCol: number;
        public startLine: number;
        public src: string;
        public len: number;
        public lineMap: number[];
        public ch: number;
        public lexState: LexState;
        public mode: LexMode;
        public scanComments: bool;
        public interveningWhitespace: bool;
        private interveningWhitespacePos;
        public leftCurlyCount: number;
        public rightCurlyCount: number;
        public commentStack: CommentToken[];
        public saveScan: SavedTokens;
        public seenUnicodeChar: bool;
        public seenUnicodeCharInComment: bool;
        private reportError;
        private prevTok;
        constructor();
        public previousToken(): Token;
        public setSourceText(newSrc: ISourceText, textMode: number): void;
        public setErrorHandler(reportError: (message: string) => void): void;
        public setText(newSrc: string, textMode: number): void;
        public setScanComments(value: bool): void;
        public tokenStart(): void;
        public peekChar(): number;
        public peekCharAt(index: number): number;
        public IsHexDigit(c: number): bool;
        public IsOctalDigit(c: number): bool;
        public scanHexDigits(): Token;
        public scanOctalDigits(): Token;
        public scanDecimalNumber(state: number): Token;
        public scanNumber(): Token;
        public scanFraction(): Token;
        public newLine(): void;
        public finishMultilineComment(): bool;
        public pushComment(comment: CommentToken): void;
        public getComments(): CommentToken[];
        public getCommentsForLine(line: number): CommentToken[];
        public resetComments(): void;
        public endsLine(c: number): bool;
        public finishSinglelineComment(): void;
        public findClosingSLH(): number;
        public speculateRegex(): Token;
        public lastTokenHadNewline(): bool;
        public lastTokenLimChar(): number;
        public advanceChar(amt: number): void;
        public nextChar(): void;
        public getLookAheadToken(): Token;
        public scanInLine(): Token;
        public scan(): Token;
        private isValidUnicodeIdentifierChar();
        private scanStringConstant(endCode);
        private scanIdentifier();
        public innerScan(): Token;
        private reportScannerError(message);
    }
    function convertTokToIDName(tok: Token): bool;
    function convertTokToID(tok: Token, strictMode: bool): bool;
    function getLineNumberFromPosition(lineMap: number[], position: number): number;
    function getSourceLineColFromMap(lineCol: ILineCol, minChar: number, lineMap: number[]): void;
    function getLineColumnFromPosition(script: Script, position: number): ILineCol;
    function getPositionFromLineColumn(script: Script, line: number, column: number): number;
    function isPrimitiveTypeToken(token: Token): bool;
    function isModifier(token: Token): bool;
}
module TypeScript {
    class AssignScopeContext {
        public scopeChain: ScopeChain;
        public typeFlow: TypeFlow;
        public modDeclChain: ModuleDeclaration[];
        constructor(scopeChain: ScopeChain, typeFlow: TypeFlow, modDeclChain: ModuleDeclaration[]);
    }
    function pushAssignScope(scope: SymbolScope, context: AssignScopeContext, type: Type, classType: Type, fnc: FuncDecl): void;
    function popAssignScope(context: AssignScopeContext): void;
    function instanceCompare(a: Symbol, b: Symbol): Symbol;
    function instanceFilterStop(s: Symbol): bool;
    class ScopeSearchFilter {
        public select: (a: Symbol, b: Symbol) => Symbol;
        public stop: (s: Symbol) => bool;
        constructor(select: (a: Symbol, b: Symbol) => Symbol, stop: (s: Symbol) => bool);
        public result: Symbol;
        public reset(): void;
        public update(b: Symbol): bool;
    }
    var instanceFilter: ScopeSearchFilter;
    function preAssignModuleScopes(ast: AST, context: AssignScopeContext): void;
    function preAssignClassScopes(ast: AST, context: AssignScopeContext): void;
    function preAssignInterfaceScopes(ast: AST, context: AssignScopeContext): void;
    function preAssignWithScopes(ast: AST, context: AssignScopeContext): void;
    function preAssignFuncDeclScopes(ast: AST, context: AssignScopeContext): void;
    function preAssignCatchScopes(ast: AST, context: AssignScopeContext): void;
    function preAssignScopes(ast: AST, parent: AST, walker: IAstWalker): AST;
    function postAssignScopes(ast: AST, parent: AST, walker: IAstWalker): AST;
}
module TypeScript {
    class TypeCollectionContext {
        public scopeChain: ScopeChain;
        public checker: TypeChecker;
        public script: Script;
        constructor(scopeChain: ScopeChain, checker: TypeChecker);
    }
    class MemberScopeContext {
        public flow: TypeFlow;
        public pos: number;
        public matchFlag: ASTFlags;
        public type: Type;
        public ast: AST;
        public scope: SymbolScope;
        public options: AstWalkOptions;
        constructor(flow: TypeFlow, pos: number, matchFlag: ASTFlags);
    }
    class EnclosingScopeContext {
        public logger: ILogger;
        public script: Script;
        public text: ISourceText;
        public pos: number;
        public isMemberCompletion: bool;
        public scopeGetter: () => SymbolScope;
        public objectLiteralScopeGetter: () => SymbolScope;
        public scopeStartAST: AST;
        public skipNextFuncDeclForClass: bool;
        public deepestModuleDecl: ModuleDeclaration;
        public enclosingClassDecl: TypeDeclaration;
        public enclosingObjectLit: UnaryExpression;
        public publicsOnly: bool;
        public useFullAst: bool;
        private scriptFragment;
        constructor(logger: ILogger, script: Script, text: ISourceText, pos: number, isMemberCompletion: bool);
        public getScope(): SymbolScope;
        public getObjectLiteralScope(): SymbolScope;
        public getScopeAST(): AST;
        public getScopePosition(): number;
        public getScriptFragmentStartAST(): AST;
        public getScriptFragmentPosition(): number;
        public getScriptFragment(): Script;
    }
    function preFindMemberScope(ast: AST, parent: AST, walker: IAstWalker): AST;
    function pushTypeCollectionScope(container: Symbol, valueMembers: ScopedMembers, ambientValueMembers: ScopedMembers, enclosedTypes: ScopedMembers, ambientEnclosedTypes: ScopedMembers, context: TypeCollectionContext, thisType: Type, classType: Type, moduleDecl: ModuleDeclaration): void;
    function popTypeCollectionScope(context: TypeCollectionContext): void;
    function preFindEnclosingScope(ast: AST, parent: AST, walker: IAstWalker): AST;
    function findEnclosingScopeAt(logger: ILogger, script: Script, text: ISourceText, pos: number, isMemberCompletion: bool): EnclosingScopeContext;
}
module TypeScript {
    class Signature {
        public hasVariableArgList: bool;
        public returnType: TypeLink;
        public parameters: ParameterSymbol[];
        public declAST: FuncDecl;
        public typeCheckStatus: TypeCheckStatus;
        public nonOptionalParameterCount: number;
        public specializeType(pattern: Type, replacement: Type, checker: TypeChecker): Signature;
        public toString(): string;
        public toStringHelper(shortform: bool, brackets: bool, scope: SymbolScope): string;
        public toStringHelperEx(shortform: bool, brackets: bool, scope: SymbolScope, prefix?: string): MemberNameArray;
    }
    class SignatureGroup {
        public signatures: Signature[];
        public hasImplementation: bool;
        public definitionSignature: Signature;
        public hasBeenTypechecked: bool;
        public flags: SignatureFlags;
        public addSignature(signature: Signature): void;
        public toString(): string;
        public toStrings(prefix: string, shortform: bool, scope: SymbolScope, getPrettyTypeName?: bool, useSignature?: Signature): MemberName[];
        public specializeType(pattern: Type, replacement: Type, checker: TypeChecker): SignatureGroup;
        public verifySignatures(checker: TypeChecker): void;
        public typeCheck(checker: TypeChecker, ast: AST, hasConstruct: bool): void;
    }
}
module TypeScript {
    enum TypeCheckStatus {
        NotStarted,
        Started,
        Finished,
    }
    function aLexicallyEnclosesB(a: Symbol, b: Symbol): bool;
    function aEnclosesB(a: Symbol, b: Symbol): bool;
    interface PhasedTypecheckObject {
        typeCheckStatus: TypeCheckStatus;
    }
    class Symbol {
        public name: string;
        public location: number;
        public length: number;
        public unitIndex: number;
        public bound: bool;
        public container: Symbol;
        public instanceScope(): SymbolScope;
        public isVariable(): bool;
        public isMember(): bool;
        public isInferenceSymbol(): bool;
        public isWith(): bool;
        public writeable(): bool;
        public isType(): bool;
        public getType(): Type;
        public flags: SymbolFlags;
        public refs: Identifier[];
        public isAccessor(): bool;
        public isObjectLitField: bool;
        public declAST: AST;
        public declModule: ModuleDeclaration;
        public passSymbolCreated: number;
        constructor(name: string, location: number, length: number, unitIndex: number);
        public isInstanceProperty(): bool;
        public getTypeName(scope: SymbolScope): string;
        public getTypeNameEx(scope: SymbolScope): MemberName;
        public getOptionalNameString(): string;
        public pathToRoot(): Symbol[];
        public findCommonAncestorPath(b: Symbol): Symbol[];
        public getPrettyName(scopeSymbol: Symbol): string;
        public scopeRelativeName(scope: SymbolScope): string;
        public fullName(scope?: SymbolScope): string;
        public isExternallyVisible(checker: TypeChecker);
        public visible(scope: SymbolScope, checker: TypeChecker): bool;
        public addRef(identifier: Identifier): void;
        public toString(): string;
        public print(outfile): void;
        public specializeType(pattern: Type, replacement: Type, checker: TypeChecker): Symbol;
        public setType(type: Type): void;
        public kind(): SymbolKind;
        public getInterfaceDeclFromSymbol(checker: TypeChecker): InterfaceDeclaration;
        public getVarDeclFromSymbol(): VarDecl;
        public getDocComments(): Comment[];
        public isStatic(): bool;
    }
    class ValueLocation {
        public symbol: Symbol;
        public typeLink: TypeLink;
    }
    class InferenceSymbol extends Symbol {
        constructor(name: string, location: number, length: number, unitIndex: number);
        public typeCheckStatus: TypeCheckStatus;
        public isInferenceSymbol(): bool;
        public transferVarFlags(varFlags: VarFlags): void;
    }
    class TypeSymbol extends InferenceSymbol {
        public type: Type;
        public additionalLocations: number[];
        public expansions: Type[];
        public expansionsDeclAST: AST[];
        public isDynamic: bool;
        constructor(locName: string, location: number, length: number, unitIndex: number, type: Type);
        public addLocation(loc: number): void;
        public isMethod: bool;
        public aliasLink: ImportDeclaration;
        public kind(): SymbolKind;
        public isType(): bool;
        public getType(): Type;
        public prettyName: string;
        public onlyReferencedAsTypeRef: bool;
        public getTypeNameEx(scope: SymbolScope): MemberName;
        public instanceScope(): SymbolScope;
        public instanceType: Type;
        public toString(): string;
        public isClass(): bool;
        public isFunction(): bool;
        public specializeType(pattern: Type, replacement: Type, checker: TypeChecker): Symbol;
        public getPrettyName(scopeSymbol: Symbol): string;
        public getPrettyNameOfDynamicModule(scopeSymbolPath: Symbol[]): {
            name: string;
            symbol: Symbol;
        };
        public getDocComments(): Comment[];
    }
    class WithSymbol extends TypeSymbol {
        constructor(location: number, unitIndex: number, withType: Type);
        public isWith(): bool;
    }
    class FieldSymbol extends InferenceSymbol {
        public canWrite: bool;
        public field: ValueLocation;
        public name: string;
        public location: number;
        constructor(name: string, location: number, unitIndex: number, canWrite: bool, field: ValueLocation);
        public kind(): SymbolKind;
        public writeable(): bool;
        public getType(): Type;
        public getTypeNameEx(scope: SymbolScope): MemberName;
        public isMember(): bool;
        public setType(type: Type): void;
        public getter: TypeSymbol;
        public setter: TypeSymbol;
        public hasBeenEmitted: bool;
        public isAccessor(): bool;
        public isVariable(): bool;
        public toString(): string;
        public specializeType(pattern: Type, replacement: Type, checker: TypeChecker): Symbol;
        public getDocComments(): Comment[];
    }
    class ParameterSymbol extends InferenceSymbol {
        public parameter: ValueLocation;
        public name: string;
        public location: number;
        private paramDocComment;
        public funcDecl: AST;
        constructor(name: string, location: number, unitIndex: number, parameter: ValueLocation);
        public kind(): SymbolKind;
        public writeable(): bool;
        public getType(): Type;
        public setType(type: Type): void;
        public isVariable(): bool;
        public argsOffset: number;
        public isOptional(): bool;
        public getTypeNameEx(scope: SymbolScope): MemberName;
        public toString(): string;
        public specializeType(pattern: Type, replacement: Type, checker: TypeChecker): Symbol;
        public getParameterDocComments(): string;
        public fullName(): string;
    }
    class VariableSymbol extends InferenceSymbol {
        public variable: ValueLocation;
        constructor(name: string, location: number, unitIndex: number, variable: ValueLocation);
        public kind(): SymbolKind;
        public writeable(): bool;
        public getType(): Type;
        public getTypeNameEx(scope: SymbolScope): MemberName;
        public setType(type: Type): void;
        public isVariable(): bool;
    }
}
module TypeScript {
    class ScopedMembers {
        public dualMembers: DualStringHashTable;
        public allMembers: IHashTable;
        public publicMembers: IHashTable;
        public privateMembers: IHashTable;
        constructor(dualMembers: DualStringHashTable);
        public addPublicMember(key: string, data): bool;
        public addPrivateMember(key: string, data): bool;
    }
    enum SymbolKind {
        None,
        Type,
        Field,
        Parameter,
        Variable,
    }
    class SymbolScope {
        public container: Symbol;
        constructor(container: Symbol);
        public printLabel(): string;
        public getAllSymbolNames(members: bool): string[];
        public getAllTypeSymbolNames(members: bool): string[];
        public getAllValueSymbolNames(members: bool): string[];
        public search(filter: ScopeSearchFilter, name: string, publicOnly: bool, typespace: bool): Symbol;
        public findLocal(name: string, publicOnly: bool, typespace: bool): Symbol;
        public find(name: string, publicOnly: bool, typespace: bool): Symbol;
        public findImplementation(name: string, publicOnly: bool, typespace: bool): Symbol;
        public findAmbient(name: string, publicOnly: bool, typespace: bool): Symbol;
        public print(outfile: ITextWriter): void;
        public enter(container: Symbol, ast: AST, symbol: Symbol, errorReporter: ErrorReporter, publicOnly: bool, typespace: bool, ambient: bool): void;
        public getTable(): IHashTable;
    }
    class SymbolAggregateScope extends SymbolScope {
        public printLabel(): string;
        public valueCache: IHashTable;
        public valueImplCache: IHashTable;
        public valueAmbientCache: IHashTable;
        public typeCache: IHashTable;
        public typeImplCache: IHashTable;
        public typeAmbientCache: IHashTable;
        public parents: SymbolScope[];
        public container: Symbol;
        constructor(container: Symbol);
        public search(filter: ScopeSearchFilter, name: string, publicOnly: bool, typespace: bool): Symbol;
        public getAllSymbolNames(members: bool): string[];
        public getAllTypeSymbolNames(members: bool): string[];
        public getAllValueSymbolNames(members: bool): string[];
        public print(outfile: ITextWriter): void;
        public findImplementation(name: string, publicOnly: bool, typespace: bool): Symbol;
        public find(name: string, publicOnly: bool, typespace: bool): Symbol;
        public findAmbient(name: string, publicOnly: bool, typespace: bool): Symbol;
        public addParentScope(parent: SymbolScope): void;
    }
    class SymbolTableScope extends SymbolScope {
        public valueMembers: ScopedMembers;
        public ambientValueMembers: ScopedMembers;
        public enclosedTypes: ScopedMembers;
        public ambientEnclosedTypes: ScopedMembers;
        public container: Symbol;
        constructor(valueMembers: ScopedMembers, ambientValueMembers: ScopedMembers, enclosedTypes: ScopedMembers, ambientEnclosedTypes: ScopedMembers, container: Symbol);
        public printLabel(): string;
        public getAllSymbolNames(members: bool): string[];
        public getAllTypeSymbolNames(members: bool): string[];
        public getAllValueSymbolNames(members: bool): string[];
        public search(filter: ScopeSearchFilter, name: string, publicOnly: bool, typespace: bool): Symbol;
        public find(name: string, publicOnly: bool, typespace: bool): Symbol;
        public findAmbient(name: string, publicOnly: bool, typespace: bool): Symbol;
        public print(outfile: ITextWriter): void;
        public findImplementation(name: string, publicOnly: bool, typespace: bool): Symbol;
        public getTable(): IHashTable;
    }
    class SymbolScopeBuilder extends SymbolScope {
        public valueMembers: ScopedMembers;
        public ambientValueMembers: ScopedMembers;
        public enclosedTypes: ScopedMembers;
        public ambientEnclosedTypes: ScopedMembers;
        public parent: SymbolScope;
        public container: Symbol;
        constructor(valueMembers: ScopedMembers, ambientValueMembers: ScopedMembers, enclosedTypes: ScopedMembers, ambientEnclosedTypes: ScopedMembers, parent: SymbolScope, container: Symbol);
        public printLabel(): string;
        public getAllSymbolNames(members: bool): string[];
        public getAllTypeSymbolNames(members: bool): string[];
        public getAllValueSymbolNames(members: bool): string[];
        public search(filter: ScopeSearchFilter, name: string, publicOnly: bool, typespace: bool): Symbol;
        public print(outfile: ITextWriter): void;
        public find(name: string, publicOnly: bool, typespace: bool): Symbol;
        public findAmbient(name: string, publicOnly: bool, typespace: bool): Symbol;
        public findLocal(name: string, publicOnly: bool, typespace: bool): Symbol;
        public enter(container: Symbol, ast: AST, symbol: Symbol, errorReporter: ErrorReporter, insertAsPublic: bool, typespace: bool, ambient: bool): void;
        public getTable(): IHashTable;
    }
    class FilteredSymbolScope extends SymbolScope {
        public scope: SymbolScope;
        public filter: ScopeSearchFilter;
        constructor(scope: SymbolScope, container: Symbol, filter: ScopeSearchFilter);
        public print(outfile: ITextWriter): void;
        public find(name: string, publicOnly: bool, typespace: bool): Symbol;
        public findLocal(name: string, publicOnly: bool, typespace: bool): Symbol;
    }
    class FilteredSymbolScopeBuilder extends SymbolScopeBuilder {
        public filter: (sym: Symbol) => bool;
        constructor(valueMembers: ScopedMembers, parent: SymbolScope, container: Symbol, filter: (sym: Symbol) => bool);
        public findLocal(name: string, publicOnly: bool, typespace: bool): Symbol;
        public search(filter: ScopeSearchFilter, name: string, publicOnly: bool, typespace: bool): Symbol;
        public find(name: string, publicOnly: bool, typespace: bool): Symbol;
    }
}
module TypeScript {
    enum TokenID {
        Any,
        Bool,
        Break,
        Case,
        Catch,
        Class,
        Const,
        Continue,
        Debugger,
        Default,
        Delete,
        Do,
        Else,
        Enum,
        Export,
        Extends,
        Declare,
        False,
        Finally,
        For,
        Function,
        Constructor,
        Get,
        If,
        Implements,
        Import,
        In,
        InstanceOf,
        Interface,
        Let,
        Module,
        New,
        Number,
        Null,
        Package,
        Private,
        Protected,
        Public,
        Return,
        Set,
        Static,
        String,
        Super,
        Switch,
        This,
        Throw,
        True,
        Try,
        TypeOf,
        Var,
        Void,
        With,
        While,
        Yield,
        Semicolon,
        OpenParen,
        CloseParen,
        OpenBracket,
        CloseBracket,
        OpenBrace,
        CloseBrace,
        Comma,
        Equals,
        PlusEquals,
        MinusEquals,
        AsteriskEquals,
        SlashEquals,
        PercentEquals,
        AmpersandEquals,
        CaretEquals,
        BarEquals,
        LessThanLessThanEquals,
        GreaterThanGreaterThanEquals,
        GreaterThanGreaterThanGreaterThanEquals,
        Question,
        Colon,
        BarBar,
        AmpersandAmpersand,
        Bar,
        Caret,
        And,
        EqualsEquals,
        ExclamationEquals,
        EqualsEqualsEquals,
        ExclamationEqualsEquals,
        LessThan,
        LessThanEquals,
        GreaterThan,
        GreaterThanEquals,
        LessThanLessThan,
        GreaterThanGreaterThan,
        GreaterThanGreaterThanGreaterThan,
        Plus,
        Minus,
        Asterisk,
        Slash,
        Percent,
        Tilde,
        Exclamation,
        PlusPlus,
        MinusMinus,
        Dot,
        DotDotDot,
        Error,
        EndOfFile,
        EqualsGreaterThan,
        Identifier,
        StringLiteral,
        RegularExpressionLiteral,
        NumberLiteral,
        Whitespace,
        Comment,
        Lim,
        LimFixed,
        LimKeyword,
    }
    var tokenTable: TokenInfo[];
    var nodeTypeTable: string[];
    var nodeTypeToTokTable: number[];
    var noRegexTable: bool[];
    enum OperatorPrecedence {
        None,
        Comma,
        Assignment,
        Conditional,
        LogicalOr,
        LogicalAnd,
        BitwiseOr,
        BitwiseExclusiveOr,
        BitwiseAnd,
        Equality,
        Relational,
        Shift,
        Additive,
        Multiplicative,
        Unary,
        Lim,
    }
    enum Reservation {
        None,
        Javascript,
        JavascriptFuture,
        TypeScript,
        JavascriptFutureStrict,
        TypeScriptAndJS,
        TypeScriptAndJSFuture,
        TypeScriptAndJSFutureStrict,
    }
    class TokenInfo {
        public tokenId: TokenID;
        public reservation: Reservation;
        public binopPrecedence: number;
        public binopNodeType: number;
        public unopPrecedence: number;
        public unopNodeType: number;
        public text: string;
        public ers: ErrorRecoverySet;
        constructor(tokenId: TokenID, reservation: Reservation, binopPrecedence: number, binopNodeType: number, unopPrecedence: number, unopNodeType: number, text: string, ers: ErrorRecoverySet);
    }
    function lookupToken(tokenId: TokenID): TokenInfo;
    enum TokenClass {
        Punctuation,
        Keyword,
        Operator,
        Comment,
        Whitespace,
        Identifier,
        NumberLiteral,
        StringLiteral,
        RegExpLiteral,
    }
    class SavedToken {
        public tok: Token;
        public minChar: number;
        public limChar: number;
        constructor(tok: Token, minChar: number, limChar: number);
    }
    class Token {
        public tokenId: TokenID;
        constructor(tokenId: TokenID);
        public toString(): string;
        public print(line: number, outfile): void;
        public getText(): string;
        public classification(): TokenClass;
    }
    class NumberLiteralToken extends Token {
        public value: number;
        public text: string;
        constructor(value: number, text: string);
        public getText(): string;
        public classification(): TokenClass;
    }
    class StringLiteralToken extends Token {
        public value: string;
        constructor(value: string);
        public getText(): string;
        public classification(): TokenClass;
    }
    class IdentifierToken extends Token {
        public value: string;
        public hasEscapeSequence: bool;
        constructor(value: string, hasEscapeSequence: bool);
        public getText(): string;
        public classification(): TokenClass;
    }
    class WhitespaceToken extends Token {
        public value: string;
        constructor(tokenId: TokenID, value: string);
        public getText(): string;
        public classification(): TokenClass;
    }
    class CommentToken extends Token {
        public value: string;
        public isBlock: bool;
        public startPos: number;
        public line: number;
        public endsLine: bool;
        constructor(tokenID: TokenID, value: string, isBlock: bool, startPos: number, line: number, endsLine: bool);
        public getText(): string;
        public classification(): TokenClass;
    }
    class RegularExpressionLiteralToken extends Token {
        public text: string;
        constructor(text: string);
        public getText(): string;
        public classification(): TokenClass;
    }
    var staticTokens: Token[];
    function initializeStaticTokens(): void;
}
module TypeScript {
    class ArrayCache {
        public arrayType: Type;
        public arrayBase: Type;
        public specialize(arrInstType: Type, checker: TypeChecker): Type;
    }
    class TypeComparisonInfo {
        public onlyCaptureFirstError: bool;
        public flags: TypeRelationshipFlags;
        public message: string;
        public addMessageToFront(message): void;
        public setMessage(message): void;
    }
    interface SignatureData {
        parameters: ParameterSymbol[];
        nonOptionalParameterCount: number;
    }
    interface ApplicableSignature {
        signature: Signature;
        hadProvisionalErrors: bool;
    }
    enum TypeCheckCollectionMode {
        Resident,
        Transient,
    }
    class PersistentGlobalTypeState {
        public errorReporter: ErrorReporter;
        public importedGlobalsTable: ScopedMembers;
        public importedGlobalsTypeTable: ScopedMembers;
        public importedGlobals: SymbolScopeBuilder;
        public globals: IHashTable;
        public globalTypes: IHashTable;
        public ambientGlobals: IHashTable;
        public ambientGlobalTypes: IHashTable;
        public residentGlobalValues: StringHashTable;
        public residentGlobalTypes: StringHashTable;
        public residentGlobalAmbientValues: StringHashTable;
        public residentGlobalAmbientTypes: StringHashTable;
        public dualGlobalValues: DualStringHashTable;
        public dualGlobalTypes: DualStringHashTable;
        public dualAmbientGlobalValues: DualStringHashTable;
        public dualAmbientGlobalTypes: DualStringHashTable;
        public globalScope: SymbolScope;
        public voidType: Type;
        public booleanType: Type;
        public doubleType: Type;
        public stringType: Type;
        public anyType: Type;
        public nullType: Type;
        public undefinedType: Type;
        public residentTypeCheck: bool;
        public mod: ModuleType;
        public gloMod: TypeSymbol;
        public wildElm: TypeSymbol;
        constructor(errorReporter: ErrorReporter);
        public enterPrimitive(flags: number, name: string): Type;
        public setCollectionMode(mode: TypeCheckCollectionMode): void;
        public refreshPersistentState(): void;
        public defineGlobalValue(name: string, type: Type): void;
    }
    class ContextualTypeContext {
        public contextualType: Type;
        public provisional: bool;
        public contextID: number;
        public targetSig: Signature;
        public targetThis: Type;
        public targetAccessorType: Type;
        constructor(contextualType: Type, provisional: bool, contextID: number);
    }
    class ContextualTypingContextStack {
        public checker: TypeChecker;
        private contextStack;
        static contextID: number;
        public pushContextualType(type: Type, provisional: bool): void;
        public hadProvisionalErrors: bool;
        public popContextualType(): ContextualTypeContext;
        public getContextualType(): ContextualTypeContext;
        public getContextID(): number;
        public isProvisional(): bool;
        constructor(checker: TypeChecker);
    }
    class TypeChecker {
        public persistentState: PersistentGlobalTypeState;
        public errorReporter: ErrorReporter;
        public globalScope: SymbolScope;
        public checkControlFlow: bool;
        public printControlFlowGraph: bool;
        public checkControlFlowUseDef: bool;
        public styleSettings: StyleSettings;
        public units: LocationInfo[];
        public voidType: Type;
        public booleanType: Type;
        public numberType: Type;
        public stringType: Type;
        public anyType: Type;
        public nullType: Type;
        public undefinedType: Type;
        public anon: string;
        public globals: DualStringHashTable;
        public globalTypes: DualStringHashTable;
        public ambientGlobals: DualStringHashTable;
        public ambientGlobalTypes: DualStringHashTable;
        public gloModType: ModuleType;
        public gloMod: TypeSymbol;
        public wildElm: TypeSymbol;
        public locationInfo: LocationInfo;
        public typeFlow: TypeFlow;
        public currentCompareA: Symbol;
        public currentCompareB: Symbol;
        public currentModDecl: ModuleDeclaration;
        public inBind: bool;
        public inWith: bool;
        public errorsOnWith: bool;
        public typingContextStack: ContextualTypingContextStack;
        public currentContextualTypeContext: ContextualTypeContext;
        public resolvingBases: bool;
        public canCallDefinitionSignature: bool;
        public assignableCache: any[];
        public subtypeCache: any[];
        public identicalCache: any[];
        public provisionalStartedTypecheckObjects: PhasedTypecheckObject[];
        public mustCaptureGlobalThis: bool;
        constructor(persistentState: PersistentGlobalTypeState);
        public setStyleOptions(style: StyleSettings): void;
        public setContextualType(type: Type, provisional: bool): void;
        public unsetContextualType(): ContextualTypeContext;
        public hadProvisionalErrors(): bool;
        public resetProvisionalErrors(): void;
        public typeCheckWithContextualType(contextType: Type, provisional: bool, condition: bool, ast: AST): void;
        public resetTargetType(): void;
        public killCurrentContextualType(): void;
        public hasTargetType(): Type;
        public getTargetTypeContext(): ContextualTypeContext;
        public inProvisionalTypecheckMode(): bool;
        public getTypeCheckFinishedStatus(): TypeCheckStatus;
        public typeStatusIsFinished(status: TypeCheckStatus): bool;
        public addStartedPTO(pto: PhasedTypecheckObject): void;
        public cleanStartedPTO(): void;
        public collectTypes(ast: AST): void;
        public makeArrayType(type: Type): Type;
        public getParameterList(funcDecl: FuncDecl, container: Symbol): SignatureData;
        public createFunctionSignature(funcDecl: FuncDecl, container: Symbol, scope: SymbolScope, overloadGroupSym: Symbol, addToScope: bool): Signature;
        public createAccessorSymbol(funcDecl: FuncDecl, fgSym: Symbol, enclosingClass: Type, addToMembers: bool, isClassProperty: bool, scope: SymbolScope, container: Symbol): FieldSymbol;
        public addBases(resultScope: SymbolAggregateScope, type: Type, baseContext: {
                base: string;
                baseId: number;
            }): void;
        public scopeOf(type: Type): SymbolScope;
        public lookupMemberTypeSymbol(containingType: Type, name: string): Symbol;
        public findSymbolForDynamicModule(idText: string, currentFileName: string, search: (id: string) => Symbol): Symbol;
        public resolveTypeMember(scope: SymbolScope, dotNode: BinaryExpression): Type;
        public resolveFuncDecl(funcDecl: FuncDecl, scope: SymbolScope, fgSym: TypeSymbol): Symbol;
        public resolveVarDecl(varDecl: VarDecl, scope: SymbolScope): Symbol;
        public resolveTypeLink(scope: SymbolScope, typeLink: TypeLink, supplyVar: bool): void;
        public resolveBaseTypeLink(typeLink: TypeLink, scope: SymbolScope): Type;
        public findMostApplicableSignature(signatures: ApplicableSignature[], args: ASTList): {
            sig: Signature;
            ambiguous: bool;
        };
        public getApplicableSignatures(signatures: Signature[], args: ASTList, comparisonInfo: TypeComparisonInfo): ApplicableSignature[];
        public canContextuallyTypeFunction(candidateType: Type, funcDecl: FuncDecl, beStringent: bool): bool;
        public canContextuallyTypeObjectLiteral(targetType: Type, objectLit: UnaryExpression): bool;
        public widenType(t: Type): Type;
        public isNullOrUndefinedType(t: Type): bool;
        public findBestCommonType(initialType: Type, targetType: Type, collection: ITypeCollection, acceptVoid: bool, comparisonInfo?: TypeComparisonInfo): Type;
        public typesAreIdentical(t1: Type, t2: Type);
        public signatureGroupsAreIdentical(sg1: SignatureGroup, sg2: SignatureGroup): bool;
        public signaturesAreIdentical(s1: Signature, s2: Signature);
        public sourceIsSubtypeOfTarget(source: Type, target: Type, comparisonInfo?: TypeComparisonInfo);
        public signatureGroupIsSubtypeOfTarget(sg1: SignatureGroup, sg2: SignatureGroup, comparisonInfo?: TypeComparisonInfo): bool;
        public signatureIsSubtypeOfTarget(s1: Signature, s2: Signature, comparisonInfo?: TypeComparisonInfo);
        public sourceIsAssignableToTarget(source: Type, target: Type, comparisonInfo?: TypeComparisonInfo);
        public signatureGroupIsAssignableToTarget(sg1: SignatureGroup, sg2: SignatureGroup, comparisonInfo?: TypeComparisonInfo): bool;
        public signatureIsAssignableToTarget(s1: Signature, s2: Signature, comparisonInfo?: TypeComparisonInfo);
        public sourceIsRelatableToTarget(source: Type, target: Type, assignableTo: bool, comparisonCache: any, comparisonInfo: TypeComparisonInfo);
        public signatureGroupIsRelatableToTarget(sourceSG: SignatureGroup, targetSG: SignatureGroup, assignableTo: bool, comparisonCache: any, comparisonInfo?: TypeComparisonInfo): bool;
        public signatureIsRelatableToTarget(sourceSig: Signature, targetSig: Signature, assignableTo: bool, comparisonCache: any, comparisonInfo?: TypeComparisonInfo);
    }
}
module TypeScript {
    class Continuation {
        public normalBlock: number;
        public exceptionBlock: number;
        constructor(normalBlock: number);
    }
    function createNewConstructGroupForType(type: Type): void;
    function cloneParentConstructGroupForChildType(child: Type, parent: Type): void;
    var globalId: string;
    interface IAliasScopeContext {
        topLevelScope: ScopeChain;
        members: IHashTable;
        tcContext: TypeCollectionContext;
    }
    function preCollectImportTypes(ast: AST, parent: AST, context: TypeCollectionContext): bool;
    function preCollectModuleTypes(ast: AST, parent: AST, context: TypeCollectionContext): bool;
    function preCollectClassTypes(ast: AST, parent: AST, context: TypeCollectionContext): bool;
    function preCollectInterfaceTypes(ast: AST, parent: AST, context: TypeCollectionContext): bool;
    function preCollectArgDeclTypes(ast: AST, parent: AST, context: TypeCollectionContext): bool;
    function preCollectVarDeclTypes(ast: AST, parent: AST, context: TypeCollectionContext): bool;
    function preCollectFuncDeclTypes(ast: AST, parent: AST, context: TypeCollectionContext): bool;
    function preCollectTypes(ast: AST, parent: AST, walker: IAstWalker): AST;
    function postCollectTypes(ast: AST, parent: AST, walker: IAstWalker): AST;
}
module TypeScript {
    class ScopeChain {
        public container: Symbol;
        public previous: ScopeChain;
        public scope: SymbolScope;
        public thisType: Type;
        public classType: Type;
        public fnc: FuncDecl;
        public moduleDecl: ModuleDeclaration;
        constructor(container: Symbol, previous: ScopeChain, scope: SymbolScope);
    }
    class BBUseDefInfo {
        public bb: BasicBlock;
        public defsBySymbol: bool[];
        public gen: BitVector;
        public kill: BitVector;
        public top: BitVector;
        public useIndexBySymbol: number[][];
        constructor(bb: BasicBlock);
        public updateTop(): bool;
        public initialize(useDefContext: UseDefContext): void;
        public initializeGen(useDefContext: UseDefContext): void;
        public initializeKill(useDefContext: UseDefContext): void;
    }
    class UseDefContext {
        public useIndexBySymbol: number[][];
        public uses: AST[];
        public symbols: VariableSymbol[];
        public symbolMap: StringHashTable;
        public symbolCount: number;
        public func: Symbol;
        constructor();
        public getSymbolIndex(sym: Symbol): number;
        public addUse(symIndex: number, astIndex: number): void;
        public getUseIndex(ast: AST): number;
        public isLocalSym(sym: Symbol): bool;
        public killSymbol(sym: VariableSymbol, bbUses: BitVector): void;
    }
    class BitVector {
        public bitCount: number;
        static packBits: number;
        public firstBits: number;
        public restOfBits: number[];
        constructor(bitCount: number);
        public set(bitIndex: number, value: bool): void;
        public map(fn: (index: number) => any): void;
        public union(b: BitVector): void;
        public intersection(b: BitVector): void;
        public notEq(b: BitVector): bool;
        public difference(b: BitVector): void;
    }
    class BasicBlock {
        public predecessors: BasicBlock[];
        public index: number;
        public markValue: number;
        public marked(markBase: number): bool;
        public mark(): void;
        public successors: BasicBlock[];
        public useDef: BBUseDefInfo;
        public content: ASTList;
        public addSuccessor(successor: BasicBlock): void;
    }
    interface ITargetInfo {
        stmt: AST;
        continueBB: BasicBlock;
        breakBB: BasicBlock;
    }
    class ControlFlowContext {
        public current: BasicBlock;
        public exit: BasicBlock;
        public entry;
        public unreachable: AST[];
        public noContinuation: bool;
        public statementStack: ITargetInfo[];
        public currentSwitch: BasicBlock[];
        public walker: IAstWalker;
        constructor(current: BasicBlock, exit: BasicBlock);
        public walk(ast: AST, parent: AST): AST;
        public pushSwitch(bb: BasicBlock): void;
        public popSwitch(): BasicBlock;
        public reportUnreachable(er: ErrorReporter): void;
        private printAST(ast, outfile);
        private printBlockContent(bb, outfile);
        public markBase: number;
        public bfs(nodeFunc: (bb: BasicBlock) => void, edgeFunc: (node1: BasicBlock, node2: BasicBlock) => void, preEdges: () => void, postEdges: () => void): void;
        public linearBBs: BasicBlock[];
        public useDef(er: ErrorReporter, funcSym: Symbol): void;
        public print(outfile: ITextWriter): void;
        public pushStatement(stmt: Statement, continueBB: BasicBlock, breakBB: BasicBlock): void;
        public popStatement(): ITargetInfo;
        public returnStmt(): void;
        public setUnreachable(): void;
        public addUnreachable(ast: AST): void;
        public unconditionalBranch(target: AST, isContinue: bool): void;
        public addContent(ast: AST): void;
    }
    interface IResolutionData {
        actuals: Type[];
        exactCandidates: Signature[];
        conversionCandidates: Signature[];
        id: number;
    }
    class ResolutionDataCache {
        public cacheSize: number;
        public rdCache: IResolutionData[];
        public nextUp: number;
        constructor();
        public getResolutionData(): IResolutionData;
        public returnResolutionData(rd: IResolutionData): void;
    }
    class TypeFlow {
        public logger: ILogger;
        public initScope: SymbolScope;
        public parser: Parser;
        public checker: TypeChecker;
        public scope: SymbolScope;
        public globalScope: SymbolScope;
        public thisType: Type;
        public thisFnc: FuncDecl;
        public thisClassNode: TypeDeclaration;
        public enclosingFncIsMethod: bool;
        public doubleType: Type;
        public booleanType: Type;
        public stringType: Type;
        public anyType: Type;
        public regexType: Type;
        public nullType: Type;
        public voidType: Type;
        public arrayAnyType: Type;
        public arrayInterfaceType: Type;
        public stringInterfaceType: Type;
        public objectInterfaceType: Type;
        public functionInterfaceType: Type;
        public numberInterfaceType: Type;
        public booleanInterfaceType: Type;
        public iargumentsInterfaceType: Type;
        public currentScript: Script;
        public inImportTypeCheck: bool;
        public inTypeRefTypeCheck: bool;
        public inArrayElementTypeCheck: bool;
        public resolutionDataCache: ResolutionDataCache;
        public nestingLevel: number;
        public inSuperCall: bool;
        constructor(logger: ILogger, initScope: SymbolScope, parser: Parser, checker: TypeChecker);
        public initLibs(): void;
        public cast(ast: AST, type: Type): AST;
        public castWithCoercion(ast: AST, type: Type, applyCoercion: bool, typeAssertion: bool): AST;
        public inScopeTypeCheck(ast: AST, enclosingScope: SymbolScope): AST;
        public typeCheck(ast: AST): AST;
        public inScopeTypeCheckDecl(ast: AST): void;
        public inScopeTypeCheckBoundDecl(varDecl: BoundDecl): void;
        public resolveBoundDecl(varDecl: BoundDecl): void;
        public typeCheckBoundDecl(varDecl: BoundDecl): VarDecl;
        private varPrivacyErrorReporter(varDecl, typeName, isModuleName);
        public typeCheckSuper(ast: AST): AST;
        public typeCheckThis(ast: AST): AST;
        public setTypeFromSymbol(ast: AST, symbol: Symbol): void;
        public typeCheckName(ast: AST): AST;
        public typeCheckScript(script: Script): Script;
        public typeCheckBitNot(ast: AST): AST;
        public typeCheckUnaryNumberOperator(ast: AST): AST;
        public typeCheckLogNot(ast: AST): AST;
        public astIsWriteable(ast: AST): bool;
        public typeCheckIncOrDec(ast: AST): AST;
        public typeCheckBitwiseOperator(ast: AST, assignment: bool): AST;
        public typeCheckArithmeticOperator(ast: AST, assignment: bool): AST;
        public typeCheckDotOperator(ast: AST): AST;
        public typeCheckBooleanOperator(ast: AST): AST;
        public typeCheckAsgOperator(ast: AST): AST;
        public typeCheckIndex(ast: AST): AST;
        public typeCheckInOperator(binex: BinaryExpression): BinaryExpression;
        public typeCheckShift(binex: BinaryExpression, assignment: bool): BinaryExpression;
        public typeCheckQMark(trinex: ConditionalExpression): ConditionalExpression;
        public addFormals(container: Symbol, signature: Signature, table: IHashTable): void;
        public addLocalsFromScope(scope: SymbolScope, container: Symbol, vars: ASTList, table: IHashTable, isModContainer: bool): void;
        public addConstructorLocalArgs(constructorDecl: FuncDecl, table: IHashTable, isClass: bool): void;
        public checkInitSelf(funcDecl: FuncDecl): bool;
        public checkPromoteFreeVars(funcDecl: FuncDecl, constructorSym: Symbol): void;
        public allReturnsAreVoid(funcDecl: FuncDecl): bool;
        public classConstructorHasSuperCall(funcDecl: FuncDecl): bool;
        private baseListPrivacyErrorReporter(bases, i, declSymbol, extendsList, typeName, isModuleName);
        private typeCheckBaseListPrivacy(bases, declSymbol, extendsList);
        private checkSymbolPrivacy(typeSymbol, declSymbol, errorCallback);
        private checkTypePrivacy(type, declSymbol, errorCallback);
        private checkSignatureGroupPrivacy(sgroup, declSymbol, errorCallback);
        private functionArgumentPrivacyErrorReporter(funcDecl, p, paramSymbol, typeName, isModuleName);
        private returnTypePrivacyError(astError, funcDecl, typeName, isModuleName);
        private functionReturnTypePrivacyErrorReporter(funcDecl, signature, typeName, isModuleName);
        public typeCheckFunction(funcDecl: FuncDecl): FuncDecl;
        public typeCheckBases(type: Type): void;
        public checkMembersImplementInterfaces(implementingType: Type): void;
        public typeCheckBaseCalls(bases: ASTList): void;
        public assertUniqueNamesInBaseTypes(names: IHashTable, type: Type, classDecl: InterfaceDeclaration, checkUnique: bool): void;
        public checkBaseTypeMemberInheritance(derivedType: Type, derivedTypeDecl: AST): void;
        public typeCheckClass(classDecl: ClassDeclaration): ClassDeclaration;
        public typeCheckOverloadSignatures(type: Type, ast: AST): void;
        public typeCheckInterface(interfaceDecl: InterfaceDeclaration): InterfaceDeclaration;
        public typeCheckImportDecl(importDecl: ImportDeclaration): ImportDeclaration;
        public typeCheckModule(moduleDecl: ModuleDeclaration): ModuleDeclaration;
        public typeCheckFor(forStmt: ForStatement): ForStatement;
        public typeCheckWith(withStmt: WithStatement): WithStatement;
        public typeCheckForIn(forInStmt: ForInStatement): ForInStatement;
        public typeCheckWhile(whileStmt: WhileStatement): WhileStatement;
        public typeCheckDoWhile(doWhileStmt: DoWhileStatement): DoWhileStatement;
        public typeCheckCondExpr(cond: AST): void;
        public typeCheckCompoundStmtBlock(stmts: AST, stmtType: string): void;
        public typeCheckIf(ifStmt: IfStatement): IfStatement;
        public typeFromAccessorFuncDecl(funcDecl: FuncDecl): Type;
        public typeCheckObjectLit(objectLit: UnaryExpression): void;
        public typeCheckArrayLit(arrayLit: UnaryExpression): void;
        public checkForVoidConstructor(type: Type, ast: AST): void;
        public typeCheckReturn(returnStmt: ReturnStatement): ReturnStatement;
        public typeCheckInstOf(ast: AST): AST;
        public typeCheckCommaOperator(ast: AST): AST;
        public typeCheckLogOr(binex: BinaryExpression): BinaryExpression;
        public typeCheckLogAnd(binex: BinaryExpression): BinaryExpression;
        public tryAddCandidates(signature: Signature, actuals: Type[], exactCandidates: Signature[], conversionCandidates: Signature[], comparisonInfo: TypeComparisonInfo): void;
        public resolveOverload(application: AST, group: SignatureGroup): Signature;
        public typeCheckNew(ast: AST): AST;
        public preTypeCheckCallArgs(args: ASTList): void;
        public postTypeCheckCallArgs(callEx: CallExpression): void;
        public typeCheckCall(ast: AST): AST;
        public assignScopes(ast: AST): void;
        public findMemberScope(enclosingScopeContext: EnclosingScopeContext, matchFlag: ASTFlags): SymbolScope;
        public findMemberScopeAt(enclosingScopeContext: EnclosingScopeContext): SymbolScope;
        public findMemberScopeAtFullAst(enclosingScopeContext: EnclosingScopeContext): SymbolScope;
    }
}
module TypeScript {
    enum Primitive {
        None,
        Void,
        Double,
        String,
        Boolean,
        Any,
        Null,
        Undefined,
    }
    class MemberName {
        public prefix: string;
        public suffix: string;
        public isString(): bool;
        public isArray(): bool;
        public toString(): string;
        static memberNameToString(memberName: MemberName): string;
        static create(text: string): MemberName;
        static create(entry: MemberName, prefix: string, suffix: string): MemberName;
    }
    class MemberNameString extends MemberName {
        public text: string;
        constructor(text: string);
        public isString(): bool;
    }
    class MemberNameArray extends MemberName {
        public delim: string;
        public entries: MemberName[];
        public isArray(): bool;
        public add(entry: MemberName): void;
        public addAll(entries: MemberName[]): void;
    }
    class Type {
        public typeID: number;
        public members: ScopedMembers;
        public ambientMembers: ScopedMembers;
        public construct: SignatureGroup;
        public call: SignatureGroup;
        public index: SignatureGroup;
        public extendsList: Type[];
        public extendsTypeLinks: TypeLink[];
        public implementsList: Type[];
        public implementsTypeLinks: TypeLink[];
        public passTypeCreated: number;
        public baseClass(): Type;
        public elementType: Type;
        public getArrayBase(arrInstType: Type, checker: TypeChecker): Type;
        public primitiveTypeClass: number;
        public constructorScope: SymbolScope;
        public containedScope: SymbolScope;
        public memberScope: SymbolScope;
        public arrayCache: ArrayCache;
        public typeFlags: TypeFlags;
        public symbol: TypeSymbol;
        public enclosingType: Type;
        public instanceType: Type;
        public isClass(): bool;
        public isArray(): bool;
        public isClassInstance(): bool;
        public getInstanceType(): Type;
        public hasImplementation(): bool;
        public setHasImplementation(): void;
        public isDouble(): bool;
        public isString(): bool;
        public isBoolean(): bool;
        public isNull(): bool;
        public getTypeName(): string;
        public getScopedTypeName(scope: SymbolScope, getPrettyTypeName?: bool): string;
        public getScopedTypeNameEx(scope: SymbolScope, getPrettyTypeName?: bool): MemberName;
        public callCount(): number;
        public getMemberTypeName(prefix: string, topLevel: bool, isElementType: bool, scope: SymbolScope, getPrettyTypeName?: bool): string;
        public getMemberTypeNameEx(prefix: string, topLevel: bool, isElementType: bool, scope: SymbolScope, getPrettyTypeName?: bool): MemberName;
        public checkDecl(checker: TypeChecker): void;
        public getMemberScope(flow: TypeFlow): SymbolScope;
        public isReferenceType();
        public specializeType(pattern: Type, replacement: Type, checker: TypeChecker, membersOnly: bool): Type;
        public hasBase(baseType: Type): bool;
        public mergeOrdered(b: Type, checker: TypeChecker, acceptVoid: bool, comparisonInfo?: TypeComparisonInfo): Type;
        public isModuleType(): bool;
        public hasMembers(): bool;
        public getAllEnclosedTypes(): ScopedMembers;
        public getAllAmbientEnclosedTypes(): ScopedMembers;
        public getPublicEnclosedTypes(): ScopedMembers;
        public getpublicAmbientEnclosedTypes(): ScopedMembers;
        public getDocComments(): Comment[];
    }
    interface ITypeCollection {
        getLength(): number;
        setTypeAtIndex(index: number, type: Type): void;
        getTypeAtIndex(index: number): Type;
    }
    class ModuleType extends Type {
        public enclosedTypes: ScopedMembers;
        public ambientEnclosedTypes: ScopedMembers;
        constructor(enclosedTypes: ScopedMembers, ambientEnclosedTypes: ScopedMembers);
        public isModuleType(): bool;
        public hasMembers(): bool;
        public getAllEnclosedTypes(): ScopedMembers;
        public getAllAmbientEnclosedTypes(): ScopedMembers;
        public getPublicEnclosedTypes(): ScopedMembers;
        public getpublicAmbientEnclosedTypes(): ScopedMembers;
        public importedModules: ImportDeclaration[];
        static findDynamicModuleNameInHashTable(moduleType: Type, members: IHashTable): {
            name: string;
            symbol: Symbol;
        };
        public findDynamicModuleName(moduleType: Type): {
            name: string;
            symbol: Symbol;
        };
    }
    class TypeLink {
        public type: Type;
        public ast: AST;
    }
    function getTypeLink(ast: AST, checker: TypeChecker, autoVar: bool): TypeLink;
}
module TypeScript {
    function stripQuotes(str: string): string;
    function isSingleQuoted(str: string): bool;
    function isQuoted(str: string): bool;
    function quoteStr(str: string): string;
    function swapQuotes(str: string): string;
    function changeToSingleQuote(str: string): string;
    function switchToForwardSlashes(path: string): string;
    function trimModName(modName: string): string;
    function getDeclareFilePath(fname: string): string;
    function isJSFile(fname: string): bool;
    function isSTRFile(fname: string): bool;
    function isTSFile(fname: string): bool;
    function isDSTRFile(fname: string): bool;
    function isDTSFile(fname: string): bool;
    function getPrettyName(modPath: string, quote?: bool, treatAsFileName?: bool);
    function getPathComponents(path: string): string[];
    function getRelativePathToFixedPath(fixedModFilePath: string, absoluteModPath: string): string;
    function quoteBaseName(modPath: string): string;
    function changePathToSTR(modPath: string): string;
    function changePathToDSTR(modPath: string): string;
    function changePathToTS(modPath: string): string;
    function changePathToDTS(modPath: string): string;
    function isRelative(path: string): bool;
    function isRooted(path: string): bool;
    function getRootFilePath(outFname: string): string;
    function filePathComponents(fullPath: string): string[];
    function filePath(fullPath: string): string;
    function normalizeURL(url: string): string;
    var pathNormalizeRegExp: RegExp;
    function normalizePath(path: string): string;
    function normalizeImportPath(path: string): string;
}
module TypeScript {
    interface IResolvedFile {
        content: string;
        path: string;
    }
    class SourceUnit implements ISourceText, IResolvedFile {
        public path: string;
        public content: string;
        public referencedFiles: IFileReference[];
        constructor(path: string, content: string);
        public getText(start: number, end: number): string;
        public getLength(): number;
    }
    interface IFileReference {
        minChar: number;
        limChar: number;
        startLine: number;
        startCol: number;
        path: string;
        isResident: bool;
    }
    interface IFileSystemObject {
        resolvePath(path: string): string;
        readFile(path: string): string;
        findFile(rootPath: string, partialFilePath: string): IResolvedFile;
        dirName(path: string): string;
    }
    class CompilationEnvironment {
        public compilationSettings: CompilationSettings;
        public ioHost: IFileSystemObject;
        constructor(compilationSettings: CompilationSettings, ioHost: IFileSystemObject);
        public residentCode: SourceUnit[];
        public code: SourceUnit[];
        public inputOutputMap: any[];
    }
    interface IResolutionDispatcher {
        postResolutionError(errorFile: string, line: number, col: number, errorMessage: string): void;
        postResolution(path: string, source: ISourceText): void;
    }
    interface ICodeResolver {
        resolveCode(referencePath: string, rootPath: string, performSearch: bool, state: IResolutionDispatcher): void;
    }
    interface IResolverHost {
        resolveCompilationEnvironment(preEnvironment: CompilationEnvironment, resolver: ICodeResolver, traceDependencies: bool): CompilationEnvironment;
    }
    class CodeResolver implements ICodeResolver {
        public environment: CompilationEnvironment;
        public visited: any;
        constructor(environment: CompilationEnvironment);
        public resolveCode(referencePath: string, parentPath: string, performSearch: bool, resolutionDispatcher: IResolutionDispatcher): bool;
    }
}
module TypeScript {
    class StyleSettings {
        public bitwise: bool;
        public blockInCompoundStmt: bool;
        public eqeqeq: bool;
        public forin: bool;
        public emptyBlocks: bool;
        public newMustBeUsed: bool;
        public requireSemi: bool;
        public assignmentInCond: bool;
        public eqnull: bool;
        public evalOK: bool;
        public innerScopeDeclEscape: bool;
        public funcInLoop: bool;
        public reDeclareLocal: bool;
        public literalSubscript: bool;
        public implicitAny: bool;
        public setOption(opt: string, val: bool): bool;
        public parseOptions(str: string): bool;
    }
    class CompilationSettings {
        public styleSettings: StyleSettings;
        public propagateConstants: bool;
        public minWhitespace: bool;
        public parseOnly: bool;
        public errorRecovery: bool;
        public emitComments: bool;
        public watch: bool;
        public exec: bool;
        public resolve: bool;
        public controlFlow: bool;
        public printControlFlow: bool;
        public controlFlowUseDef: bool;
        public errorOnWith: bool;
        public preprocess: bool;
        public canCallDefinitionSignature: bool;
        public inferPropertiesFromThisAssignment: bool;
        public useDefaultLib: bool;
        public codeGenTarget: CodeGenTarget;
        public moduleGenTarget: ModuleGenTarget;
        public outputOption: string;
        public mapSourceFiles: bool;
        public emitFullSourceMapPath: bool;
        public generateDeclarationFiles: bool;
        public useCaseSensitiveFileResolution: bool;
        public setStyleOptions(str: string): void;
    }
    interface IPreProcessedFileInfo {
        settings: CompilationSettings;
        referencedFiles: IFileReference[];
        importedFiles: IFileReference[];
        isLibFile: bool;
    }
    function getAdditionalDependencyPath(comment: string): string;
    function getImplicitImport(comment: string): bool;
    function getStyleSettings(comment: string, styleSettings: StyleSettings): void;
    function getReferencedFiles(sourceText: ISourceText): IFileReference[];
    function preProcessFile(sourceText: ISourceText, options?: CompilationSettings, readImportFiles?: bool): IPreProcessedFileInfo;
}
module TypeScript {
    class IncrementalParser {
        private logger;
        private astLogger;
        constructor(logger: ILogger);
        public getEnclosingScopeContextIfSingleScopeEdit(previousScript: Script, scriptId: string, newSourceText: ISourceText, editRange: ScriptEditRange): EnclosingScopeContext;
        public attemptIncrementalUpdateUnit(previousScript: Script, scriptId: string, newSourceText: ISourceText, editRange: ScriptEditRange): UpdateUnitResult;
        public mergeTrees(updateResult: UpdateUnitResult): void;
        private replaceAST(script, oldAst, newAst);
        private mergeLocationInfo(script, partial, editRange);
        private applyDeltaPosition(ast, start, delta);
    }
}
module TypeScript {
    class DeclFileWriter {
        private declFile;
        public onNewLine: bool;
        constructor(declFile: ITextWriter);
        public Write(s: string): void;
        public WriteLine(s: string): void;
        public Close(): void;
    }
    class DeclarationEmitter implements AstWalkerWithDetailCallback.AstWalkerDetailCallback {
        public checker: TypeChecker;
        public emitOptions: EmitOptions;
        public errorReporter: ErrorReporter;
        private declFile;
        private indenter;
        private declarationContainerStack;
        private isDottedModuleName;
        private dottedModuleEmit;
        private ignoreCallbackAst;
        private singleDeclFile;
        private varListCount;
        private getAstDeclarationContainer();
        private emitDottedModuleName();
        constructor(checker: TypeChecker, emitOptions: EmitOptions, errorReporter: ErrorReporter);
        public setDeclarationFile(file: ITextWriter): void;
        public Close(): void;
        public emitDeclarations(script: Script): void;
        private getIndentString(declIndent?);
        private emitIndent();
        private canEmitSignature(declFlags, canEmitGlobalAmbientDecl?, useDeclarationContainerTop?);
        private canEmitPrePostAstSignature(declFlags, astWithPrePostCallback, preCallback);
        private getDeclFlagsString(declFlags, typeString);
        private emitDeclFlags(declFlags, typeString);
        private canEmitTypeAnnotationSignature(declFlag?);
        private pushDeclarationContainer(ast);
        private popDeclarationContainer(ast);
        private emitTypeNamesMember(memberName, emitIndent?);
        private emitTypeSignature(type);
        private emitComment(comment);
        private emitDeclarationComments(ast, endLine?);
        public VarDeclCallback(pre: bool, varDecl: VarDecl): bool;
        public BlockCallback(pre: bool, block: Block): bool;
        private emitArgDecl(argDecl, funcDecl);
        public FuncDeclCallback(pre: bool, funcDecl: FuncDecl): bool;
        private emitBaseList(bases, qual);
        private emitPropertyAccessorSignature(funcDecl);
        private emitClassMembersFromConstructorDefinition(funcDecl);
        public ClassDeclarationCallback(pre: bool, classDecl: ClassDeclaration): bool;
        public InterfaceDeclarationCallback(pre: bool, interfaceDecl: InterfaceDeclaration): bool;
        public ImportDeclarationCallback(pre: bool, importDecl: ImportDeclaration): bool;
        private emitEnumSignature(moduleDecl);
        public ModuleDeclarationCallback(pre: bool, moduleDecl: ModuleDeclaration): bool;
        public ScriptCallback(pre: bool, script: Script): bool;
        public DefaultCallback(pre: bool, ast: AST): bool;
    }
}
module TypeScript {
    enum UpdateUnitKind {
        Unknown,
        NoEdits,
        EditsInsideSingleScope,
    }
    class ScriptEditRange {
        public minChar: number;
        public limChar: number;
        public delta: number;
        constructor(minChar: number, limChar: number, delta: number);
        static unknown(): ScriptEditRange;
        public isUnknown(): bool;
        public containsPosition(pos: number): bool;
        public toString(): string;
    }
    class UpdateUnitResult {
        public kind: UpdateUnitKind;
        public unitIndex: number;
        public script1: Script;
        public script2: Script;
        constructor(kind: UpdateUnitKind, unitIndex: number, script1: Script, script2: Script);
        public scope1: AST;
        public scope2: AST;
        public editRange: ScriptEditRange;
        public parseErrors: ErrorEntry[];
        static noEdits(unitIndex: number): UpdateUnitResult;
        static unknownEdits(script1: Script, script2: Script, parseErrors: ErrorEntry[]): UpdateUnitResult;
        static singleScopeEdits(script1: Script, script2: Script, scope1: AST, scope2: AST, editRange: ScriptEditRange, parseErrors: ErrorEntry[]): UpdateUnitResult;
    }
    class ErrorEntry {
        public unitIndex: number;
        public minChar: number;
        public limChar: number;
        public message: string;
        constructor(unitIndex: number, minChar: number, limChar: number, message: string);
    }
    var defaultSettings: CompilationSettings;
    interface EmitterIOHost {
        createFile(path: string, useUTF8?: bool): ITextWriter;
        fileExists(path: string): bool;
        directoryExists(path: string): bool;
        resolvePath(path: string): string;
    }
    class TypeScriptCompiler {
        public errorOutput: ITextWriter;
        public logger: ILogger;
        public settings: CompilationSettings;
        public parser: Parser;
        public typeChecker: TypeChecker;
        public typeFlow: TypeFlow;
        public scripts: ASTList;
        public units: LocationInfo[];
        public errorReporter: ErrorReporter;
        public persistentTypeState: PersistentGlobalTypeState;
        public emitSettings: EmitOptions;
        constructor(errorOutput: ITextWriter, logger?: ILogger, settings?: CompilationSettings);
        public timeFunction(funcDescription: string, func: () => any): any;
        public initTypeChecker(errorOutput: ITextWriter): void;
        public setErrorOutput(outerr): void;
        public emitCommentsToOutput(): void;
        public setErrorCallback(fn: (minChar: number, charLen: number, message: string, unitIndex: number) => void): void;
        public updateUnit(prog: string, filename: string, setRecovery: bool): bool;
        public updateSourceUnit(sourceText: ISourceText, filename: string, setRecovery: bool): bool;
        public applyUpdateResult(updateResult: UpdateUnitResult): bool;
        public partialUpdateUnit(sourceText: ISourceText, filename: string, setRecovery: bool): UpdateUnitResult;
        public addUnit(prog: string, filename: string, keepResident?: bool, referencedFiles?: IFileReference[]): Script;
        public addSourceUnit(sourceText: ISourceText, filename: string, keepResident: bool, referencedFiles?: IFileReference[]): Script;
        public parseUnit(prog: string, filename: string): void;
        public parseSourceUnit(sourceText: ISourceText, filename: string): void;
        public typeCheck();
        public cleanASTTypesForReTypeCheck(ast: AST): void;
        public cleanTypesForReTypeCheck();
        public attemptIncrementalTypeCheck(updateResult: UpdateUnitResult): bool;
        public reTypeCheck();
        private isDynamicModuleCompilation();
        private updateCommonDirectoryPath();
        public parseEmitOption(ioHost: EmitterIOHost): void;
        public useUTF8ForFile(script: Script): bool;
        static mapToDTSFileName(fileName: string, wholeFileNameReplaced: bool): string;
        private canEmitDeclarations(script?);
        public emitDeclarationsUnit(script: Script, reuseEmitter?: bool, declarationEmitter?: DeclarationEmitter): DeclarationEmitter;
        public emitDeclarations(): void;
        static mapToFileNameExtension(extension: string, fileName: string, wholeFileNameReplaced: bool): string;
        static mapToJSFileName(fileName: string, wholeFileNameReplaced: bool): string;
        public emitUnit(script: Script, reuseEmitter?: bool, emitter?: Emitter, inputOutputMapper?: (unitIndex: number, outFile: string) => void): Emitter;
        public emit(ioHost: EmitterIOHost, inputOutputMapper?: (unitIndex: number, outFile: string) => void): void;
        public emitToOutfile(outputFile: ITextWriter): void;
        public emitAST(ioHost: EmitterIOHost): void;
        private outputScriptToUTF8(script);
        private outputScriptsToUTF8(scripts);
        private createFile(fileName, useUTF8);
    }
    class ScopeEntry {
        public name: string;
        public type: string;
        public sym: Symbol;
        constructor(name: string, type: string, sym: Symbol);
    }
    class ScopeTraversal {
        private compiler;
        constructor(compiler: TypeScriptCompiler);
        public getScope(enclosingScopeContext: EnclosingScopeContext): SymbolScope;
        public getScopeEntries(enclosingScopeContext: EnclosingScopeContext, getPrettyTypeName?: bool): ScopeEntry[];
        private getTypeNamesForNames(enclosingScopeContext, allNames, scope, getPrettyTypeName?);
    }
}
module Services {
    class Classifier {
        public host: IClassifierHost;
        constructor(host: IClassifierHost);
        private scanner;
        public getClassificationsForLine(text: string, lexState: TypeScript.LexState): ClassificationResult;
    }
    interface IClassifierHost extends TypeScript.ILogger {
    }
    class ClassificationResult {
        public initialState: TypeScript.LexState;
        public finalLexState: TypeScript.LexState;
        public entries: ClassificationInfo[];
        constructor();
    }
    class ClassificationInfo {
        public length: number;
        public classification: TypeScript.TokenClass;
        constructor(length: number, classification: TypeScript.TokenClass);
    }
}
module Services {
    interface ILanguageService {
        host: ILanguageServiceHost;
        refresh(): void;
        logAST(fileName: string): void;
        logSyntaxAST(fileName: string): void;
        getErrors(maxCount: number): TypeScript.ErrorEntry[];
        getScriptAST(fileName: string): TypeScript.Script;
        getScriptErrors(fileName: string, maxCount: number): TypeScript.ErrorEntry[];
        getCompletionsAtPosition(fileName: string, pos: number, isMemberCompletion: bool): CompletionInfo;
        getTypeAtPosition(fileName: string, pos: number): TypeInfo;
        getNameOrDottedNameSpan(fileName: string, startPos: number, endPos: number): SpanInfo;
        getBreakpointStatementAtPosition(fileName: string, pos: number): SpanInfo;
        getSignatureAtPosition(fileName: string, pos: number): SignatureInfo;
        getDefinitionAtPosition(fileName: string, pos: number): DefinitionInfo;
        getReferencesAtPosition(fileName: string, pos: number): ReferenceEntry[];
        getOccurrencesAtPosition(fileName: string, pos: number): ReferenceEntry[];
        getImplementorsAtPosition(fileName: string, pos: number): ReferenceEntry[];
        getNavigateToItems(searchValue: string): NavigateToItem[];
        getScriptLexicalStructure(fileName: string): NavigateToItem[];
        getOutliningRegions(fileName: string): NavigateToItem[];
        getScriptSyntaxAST(fileName: string): ScriptSyntaxAST;
        getFormattingEditsForRange(fileName: string, minChar: number, limChar: number, options: FormatCodeOptions): TextEdit[];
        getFormattingEditsForDocument(fileName: string, minChar: number, limChar: number, options: FormatCodeOptions): TextEdit[];
        getFormattingEditsOnPaste(fileName: string, minChar: number, limChar: number, options: FormatCodeOptions): TextEdit[];
        getFormattingEditsAfterKeystroke(fileName: string, position: number, key: string, options: FormatCodeOptions): TextEdit[];
        getBraceMatchingAtPosition(fileName: string, position: number): TextRange[];
        getSmartIndentAtLineNumber(fileName: string, lineNumber: number, options: EditorOptions): number;
        getAstPathToPosition(script: TypeScript.AST, pos: number, options: TypeScript.GetAstPathOptions): TypeScript.AstPath;
        getIdentifierPathToPosition(script: TypeScript.AST, pos: number): TypeScript.AstPath;
        getSymbolAtPosition(script: TypeScript.AST, pos: number): TypeScript.Symbol;
        getSymbolTree(): ISymbolTree;
        getEmitOutput(fileName: string): IOutputFile[];
    }
    interface ILanguageServiceHost extends TypeScript.ILogger {
        getCompilationSettings(): TypeScript.CompilationSettings;
        getScriptCount(): number;
        getScriptId(scriptIndex: number): string;
        getScriptSourceText(scriptIndex: number, start: number, end: number): string;
        getScriptSourceLength(scriptIndex: number): number;
        getScriptIsResident(scriptIndex: number): bool;
        getScriptVersion(scriptIndex: number): number;
        getScriptEditRangeSinceVersion(scriptIndex: number, scriptVersion: number): TypeScript.ScriptEditRange;
    }
    function logInternalError(logger: TypeScript.ILogger, err: Error): void;
    class SourceTextAdapter implements TypeScript.ISourceText {
        private host;
        private scriptIndex;
        constructor(host: ILanguageServiceHost, scriptIndex: number);
        public getText(start: number, end: number): string;
        public getLength(): number;
    }
    class CachedSourceTextAdapter implements TypeScript.ISourceText {
        private length;
        private text;
        constructor(host: ILanguageServiceHost, scriptIndex: number);
        public getText(start: number, end: number): string;
        public getLength(): number;
    }
    class SourceTextRange implements TypeScript.ISourceText {
        private sourceText;
        private minChar;
        private limChar;
        constructor(sourceText: TypeScript.ISourceText, minChar: number, limChar: number);
        public getText(start: number, end: number): string;
        public getLength(): number;
    }
    class ReferenceEntry {
        public unitIndex: number;
        public ast: TypeScript.AST;
        public isWriteAccess: bool;
        constructor(unitIndex: number, ast: TypeScript.AST, isWriteAccess: bool);
        public getHashCode(): number;
        public equals(other: ReferenceEntry): bool;
    }
    class ReferenceEntrySet {
        private hashTable;
        private entries;
        constructor();
        public getEntries(): ReferenceEntry[];
        public addAst(unitIndex: number, ast: TypeScript.AST, isWriteAccess: bool): void;
        public addSymbol(sym: TypeScript.Symbol): void;
    }
    class NavigateToItem {
        public name: string;
        public kind: string;
        public kindModifiers: string;
        public matchKind: string;
        public unitIndex: number;
        public minChar: number;
        public limChar: number;
        public containerName: string;
        public containerKind: string;
    }
    class NavigateToContext {
        public options: TypeScript.AstWalkOptions;
        public unitIndex: number;
        public containerSymbols: TypeScript.Symbol[];
        public containerKinds: string[];
        public containerASTs: TypeScript.AST[];
        public path: TypeScript.AstPath;
        public result: NavigateToItem[];
    }
    class TextRange {
        public minChar: number;
        public limChar: number;
        constructor(minChar: number, limChar: number);
    }
    class TextEdit {
        public minChar: number;
        public limChar: number;
        public text: string;
        constructor(minChar: number, limChar: number, text: string);
        static createInsert(pos: number, text: string): TextEdit;
        static createDelete(minChar: number, limChar: number): TextEdit;
        static createReplace(minChar: number, limChar: number, text: string): TextEdit;
    }
    class EditorOptions {
        public IndentSize: number;
        public TabSize: number;
        public NewLineCharacter: string;
        public ConvertTabsToSpaces: bool;
    }
    class FormatCodeOptions extends EditorOptions {
        public InsertSpaceAfterCommaDelimiter: bool;
        public InsertSpaceAfterSemicolonInForStatements: bool;
        public InsertSpaceBeforeAndAfterBinaryOperators: bool;
        public InsertSpaceAfterKeywordsInControlFlowStatements: bool;
        public InsertSpaceAfterFunctionKeywordForAnonymousFunctions: bool;
        public InsertSpaceAfterOpeningAndBeforeClosingNonemptyParenthesis: bool;
        public PlaceOpenBraceOnNewLineForFunctions: bool;
        public PlaceOpenBraceOnNewLineForControlBlocks: bool;
    }
    class GetReferencesContext {
        public scope: number[];
    }
    class DefinitionInfo {
        public unitIndex: number;
        public minChar: number;
        public limChar: number;
        public kind: string;
        public name: string;
        public containerKind: string;
        public containerName: string;
        constructor(unitIndex: number, minChar: number, limChar: number, kind: string, name: string, containerKind: string, containerName: string);
    }
    class TypeInfo {
        public memberName: TypeScript.MemberName;
        public docComment: string;
        public fullSymbolName: string;
        public kind: string;
        public minChar: number;
        public limChar: number;
        constructor(memberName: TypeScript.MemberName, docComment: string, fullSymbolName: string, kind: string, minChar: number, limChar: number);
    }
    class SpanInfo {
        public minChar: number;
        public limChar: number;
        public text: string;
        constructor(minChar: number, limChar: number, text?: string);
    }
    class SignatureInfo {
        public actual: ActualSignatureInfo;
        public formal: FormalSignatureInfo;
        public activeFormal: number;
    }
    class FormalSignatureInfo {
        public name: string;
        public isNew: bool;
        public openParen: string;
        public closeParen: string;
        public docComment: string;
        public signatureGroup: FormalSignatureItemInfo[];
    }
    class FormalSignatureItemInfo {
        public parameters: FormalParameterInfo[];
        public returnType: string;
        public docComment: string;
    }
    class FormalParameterInfo {
        public name: string;
        public type: string;
        public isOptional: bool;
        public isVariable: bool;
        public docComment: string;
    }
    class ActualSignatureInfo {
        public openParenMinChar: number;
        public closeParenLimChar: number;
        public currentParameter: number;
        public parameters: ActualParameterInfo[];
    }
    class ActualParameterInfo {
        public minChar: number;
        public limChar: number;
    }
    class CompletionInfo {
        public maybeInaccurate: bool;
        public isMemberCompletion: bool;
        public entries: CompletionEntry[];
    }
    class CompletionEntry {
        public name: string;
        public type: string;
        public kind: string;
        public kindModifiers: string;
        public fullSymbolName: string;
        public docComment: string;
    }
    class ScriptElementKind {
        static unknown: string;
        static keyword: string;
        static scriptElement: string;
        static moduleElement: string;
        static classElement: string;
        static interfaceElement: string;
        static enumElement: string;
        static variableElement: string;
        static localVariableElement: string;
        static functionElement: string;
        static localFunctionElement: string;
        static memberFunctionElement: string;
        static memberGetAccessorElement: string;
        static memberSetAccessorElement: string;
        static memberVariableElement: string;
        static constructorImplementationElement: string;
        static callSignatureElement: string;
        static indexSignatureElement: string;
        static constructSignatureElement: string;
        static parameterElement: string;
    }
    class ScriptElementKindModifier {
        static none: string;
        static publicMemberModifier: string;
        static privateMemberModifier: string;
        static exportedModifier: string;
        static ambientModifier: string;
        static staticModifier: string;
    }
    class MatchKind {
        static none: string;
        static exact: string;
        static subString: string;
        static prefix: string;
    }
    class ScriptSyntaxASTState {
        public version: number;
        public syntaxAST: ScriptSyntaxAST;
        public fileName: string;
        constructor();
    }
    interface IOutputFile {
        name: string;
        useUTF8encoding: bool;
        text: string;
    }
    interface TypeInfoAtPosition {
        spanInfo: SpanInfo;
        ast: TypeScript.AST;
        symbol?: TypeScript.Symbol;
        callSignature?: TypeScript.Signature;
        isNew: bool;
    }
    class LanguageService implements ILanguageService {
        public host: ILanguageServiceHost;
        public logger: TypeScript.ILogger;
        private compilerState;
        private syntaxASTState;
        private formattingRulesProvider;
        constructor(host: ILanguageServiceHost);
        public refresh(): void;
        public minimalRefresh(): void;
        public getSymbolTree(): ISymbolTree;
        public getScriptSyntaxAST(fileName: string): ScriptSyntaxAST;
        private _getScriptSyntaxAST(fileName);
        private attemptIncrementalSyntaxAST(syntaxASTState);
        public getScriptAST(fileName: string): TypeScript.Script;
        private getTypeInfo(type, symbol, typeInfoAtPosition, enclosingScopeContext);
        public getTypeAtPosition(fileName: string, pos: number): TypeInfo;
        public getNameOrDottedNameSpan(fileName: string, startPos: number, endPos: number): SpanInfo;
        private getBreakpointInStatement(pos, astSpan, verifyASTPos, existingResult, forceFirstStatement, isAst);
        public getBreakpointStatementAtPosition(fileName: string, pos: number): SpanInfo;
        public getSignatureAtPosition(fileName: string, pos: number): SignatureInfo;
        public getDefinitionAtPosition(fileName: string, pos: number): DefinitionInfo;
        public getSmartIndentAtLineNumber(fileName: string, lineNumber: number, options: EditorOptions): number;
        public getBraceMatchingAtPosition(fileName: string, position: number): TextRange[];
        private getFullNameOfSymbol(symbol, enclosingScopeContext);
        private getSymbolElementKind(sym, scopeSymbol?, useConstructorAsClass?);
        private getSymbolElementKindModifiers(sym);
        private getSymbolContainerKind(sym);
        private getSymbolContainerName(sym);
        public getReferencesAtPosition(fileName: string, pos: number): ReferenceEntry[];
        public getOccurrencesAtPosition(fileName: string, pos: number): ReferenceEntry[];
        public getImplementorsAtPosition(fileName: string, position: number): ReferenceEntry[];
        private getReferencesForSourceLocation(context, unitIndex, position);
        private isWriteAccess(parent, cur);
        private getReferencesForSymbol(context, sym);
        private mapUnitIndexInReferenceEntrySet(references);
        public getCompletionsAtPosition(fileName: string, pos: number, isMemberCompletion: bool): CompletionInfo;
        private getQuickCompletionsAtPosition(fileName, pos, isMemberCompletion);
        private getAccurateCompletionsAtPosition(fileName, pos, isMemberCompletion);
        private getDocCommentOfSymbol(symbol);
        private getCompletionsFromEnclosingScopeContext(enclosingScopeContext, result);
        private isObjectLiteralMemberNameCompletion(enclosingScopeContext);
        private isCompletionListBlocker(path);
        private isCompletionListTriggerPoint(path);
        public getFormattingEditsForRange(fileName: string, minChar: number, limChar: number, options: FormatCodeOptions): TextEdit[];
        public getFormattingEditsForDocument(fileName: string, minChar: number, limChar: number, options: FormatCodeOptions): TextEdit[];
        public getFormattingEditsOnPaste(fileName: string, minChar: number, limChar: number, options: FormatCodeOptions): TextEdit[];
        public getFormattingEditsAfterKeystroke(fileName: string, position: number, key: string, options: FormatCodeOptions): TextEdit[];
        public getNavigateToItems(searchValue: string): NavigateToItem[];
        public getScriptLexicalStructure(fileName: string): NavigateToItem[];
        public getOutliningRegions(fileName: string): NavigateToItem[];
        public logAST(fileName: string): void;
        public logSyntaxAST(fileName: string): void;
        public getErrors(maxCount: number): TypeScript.ErrorEntry[];
        public getScriptErrors(fileName: string, maxCount: number): TypeScript.ErrorEntry[];
        public getEmitOutput(fileName: string): IOutputFile[];
        private getTypeInfoAtPosition(pos, script, constructorIsValid?);
        private getReferencesToField(context, symbolSet, match);
        private getReferencesToType(context, symbolSet, match);
        private getReferencesToParameter(context, symbolSet, match);
        private getReferencesToVariable(context, symbolSet, match);
        private getReferencesToSymbolSet(context, symbolSet, match);
        private getDeclNodeElementKindModifiers(ast);
        private getASTItems(unitIndex, ast, match, findMinChar?, findLimChar?);
        public getAstPathToPosition(script: TypeScript.AST, pos: number, options?: TypeScript.GetAstPathOptions): TypeScript.AstPath;
        public getIdentifierPathToPosition(script: TypeScript.AST, pos: number): TypeScript.AstPath;
        public getSymbolAtPosition(script: TypeScript.AST, pos: number): TypeScript.Symbol;
        private logFormatCodeOptions(options);
        private logEditResults(syntaxAST, result);
    }
}
module Formatting {
    class SnapshotSpan {
        public snapshot: ITextSnapshot;
        public span: Span;
        private _startPoint;
        private _endPoint;
        constructor(snapshot: ITextSnapshot, span: Span);
        public start(): SnapshotPoint;
        public end(): SnapshotPoint;
        public startPosition(): number;
        public endPosition(): number;
        public GetText(): string;
        public IsEmpty(): bool;
        public OverlapsWith(spanArg: Span): bool;
        public Intersection(simpleSpan: Span): SnapshotSpan;
    }
    class SnapshotPoint {
        public snapshot: ITextSnapshot;
        public position: number;
        constructor(snapshot: ITextSnapshot, position: number);
        public GetContainingLine(): ITextSnapshotLine;
        public Add(offset: number): SnapshotPoint;
    }
    class FileAuthoringProxy {
        public scriptSyntaxAST: Services.ScriptSyntaxAST;
        constructor(scriptSyntaxAST: Services.ScriptSyntaxAST);
        public GetASTCursor(): IAuthorParseNodeCursor;
    }
    class AuthorParseNodeCursor implements IAuthorParseNodeCursor {
        private fileAuthoringProxy;
        private logger;
        private path;
        constructor(fileAuthoringProxy: FileAuthoringProxy);
        private fixupPath(newPath);
        private mapNodeType(path);
        private mapNodeFlags(path);
        private getDetails(path);
        private getEdgeLabel(path);
        private getEmptyNodeDetails();
        private getAstPath(position, options?);
        private moveToParent(path);
        private getAuthorParseNodeDetails(path);
        public Current(): AuthorParseNodeDetails;
        public Parent(): AuthorParseNodeDetails;
        public MoveToChild(edgeLabel: AuthorParseNodeEdge, index: number): AuthorParseNodeDetails;
        public MoveUp(): AuthorParseNodeDetails;
        public SeekToOffset(offset: number, excludeEndOffset: bool): AuthorParseNodeDetails;
        public MoveToEnclosingNode(startOffset: number, endOffset: number): AuthorParseNodeDetails;
        private skipNode(path);
        private mapAstNode(path, depth);
        private isBodyOfBlock(path);
        private isBodyOfCase(path);
        private mapBodyOfCase(body);
        public GetSubTree(depth: number): IAuthorParseNodeSet;
        public GetNodeProperty(nodeProperty: AuthorParseNodeProperty): number;
        public GetEdgeLabel(): AuthorParseNodeEdge;
    }
    interface ITextSnapshot {
        GetText(span: Span): string;
        GetLineNumberFromPosition(position: number): number;
        GetLineFromPosition(position: number): ITextSnapshotLine;
        GetLineFromLineNumber(lineNumber: number): ITextSnapshotLine;
    }
    class TextSnapshot implements ITextSnapshot {
        private script;
        private sourceText;
        private lines;
        constructor(script: TypeScript.Script, sourceText: TypeScript.ISourceText);
        public GetText(span: Span): string;
        public GetLineNumberFromPosition(position: number): number;
        public GetLineFromPosition(position: number): ITextSnapshotLine;
        public GetLineFromLineNumber(lineNumber: number): ITextSnapshotLine;
        private GetLineFromLineNumberWorker(lineNumber);
    }
    interface ITextSnapshotLine {
        snapshot(): ITextSnapshot;
        start(): SnapshotPoint;
        startPosition(): number;
        end(): SnapshotPoint;
        endPosition(): number;
        endIncludingLineBreak(): SnapshotPoint;
        endIncludingLineBreakPosition(): number;
        length(): number;
        lineNumber(): number;
        getText(): string;
    }
    class TextSnapshotLine implements ITextSnapshotLine {
        private _snapshot;
        private _lineNumber;
        private _start;
        private _end;
        private _lineBreak;
        constructor(_snapshot: TextSnapshot, _lineNumber: number, _start: number, _end: number, _lineBreak: string);
        public snapshot(): TextSnapshot;
        public start(): SnapshotPoint;
        public startPosition(): number;
        public end(): SnapshotPoint;
        public endPosition(): number;
        public endIncludingLineBreak(): SnapshotPoint;
        public endIncludingLineBreakPosition(): number;
        public length(): number;
        public lineNumber(): number;
        public getText(): string;
    }
    class Span {
        private _start;
        private _length;
        constructor(_start: number, _length: number);
        public start(): number;
        public end(): number;
        public length(): number;
        public Intersection(span: Span): Span;
        public OverlapsWith(span: Span): bool;
        public Contains(span: Span): bool;
        static FromBounds(start: number, end: number): Span;
    }
    interface IList {
        count(): number;
        get(index: number): any;
        add(item: any): void;
        contains(item: any): bool;
        foreach(action: (item: any) => void): void;
        GetEnumerator(): IEnumerator;
        Where(pred: (item: any) => bool): IList;
    }
    interface IList_TokenSpan extends IList {
        get(index: number): TokenSpan;
        add(item: TokenSpan): void;
        foreach(action: (item: TokenSpan) => void): void;
    }
    interface IList_TextEditInfo extends IList {
        get(index: number): TextEditInfo;
        add(item: TextEditInfo): void;
        foreach(action: (item: TextEditInfo) => void): void;
    }
    interface IList_IndentationInfo extends IList {
        get(index: number): IndentationInfo;
        add(item: IndentationInfo): void;
        foreach(action: (item: IndentationInfo) => void): void;
    }
    interface IList_IndentationEditInfo extends IList {
        get(index: number): IndentationEditInfo;
        add(item: IndentationEditInfo): void;
        foreach(action: (item: IndentationEditInfo) => void): void;
    }
    interface IList_ITextSnapshotLine extends IList {
        get(index: number): ITextSnapshotLine;
        add(item: ITextSnapshotLine): void;
        foreach(action: (item: ITextSnapshotLine) => void): void;
    }
    interface IList_ParseNode extends IList {
        get(index: number): ParseNode;
        add(item: ParseNode): void;
        foreach(action: (item: ParseNode) => void): void;
    }
    interface IEnumerator {
        MoveNext(): bool;
        Current(): any;
    }
    class ListEnumerator implements IEnumerator {
        private list;
        private index;
        constructor(list: IList);
        public MoveNext(): bool;
        public Current(): any;
    }
    class List implements IList {
        static empty: any[];
        private items;
        constructor();
        private copyOnWrite();
        public count(): number;
        public get(index: number): any;
        public add(item: any): void;
        public addAll(range: any[]): void;
        public insert(index: number, item: any): void;
        public contains(item: any): bool;
        public foreach(action: (item: any) => void): void;
        public GetEnumerator(): IEnumerator;
        public Where(pred: (item: any) => bool): IList;
    }
    class List_TokenSpan extends List implements IList_TokenSpan {
        public get(index: number): TokenSpan;
        public foreach(action: (item: TokenSpan) => void): void;
    }
    class List_AuthorTokenKind extends List {
        public get(index: number): AuthorTokenKind;
        public foreach(action: (item: AuthorTokenKind) => void): void;
    }
    class List_IndentationInfo extends List implements IList_IndentationInfo {
        public get(index: number): IndentationInfo;
        public foreach(action: (item: IndentationInfo) => void): void;
    }
    class List_IndentationEditInfo extends List implements IList_IndentationEditInfo {
        public get(index: number): IndentationEditInfo;
        public foreach(action: (item: IndentationEditInfo) => void): void;
    }
    class List_ParseNode extends List implements IList_ParseNode {
        public get(index: number): ParseNode;
        public foreach(action: (item: ParseNode) => void): void;
    }
    class List_TextEditInfo extends List implements IList_TextEditInfo {
        constructor(item?: TextEditInfo);
        public get(index: number): TextEditInfo;
        public foreach(action: (item: TextEditInfo) => void): void;
    }
    class List_Rule extends List {
        public get(index: number): Rule;
        public foreach(action: (item: Rule) => void): void;
        public Add(item: Rule): void;
        public AddRange(items: Rule[]): void;
    }
    class List_ITextSnapshotLine extends List implements IList_ITextSnapshotLine {
        public get(index: number): ITextSnapshotLine;
        public foreach(action: (item: ITextSnapshotLine) => void): void;
    }
    class Stack {
        private items;
        constructor();
        public Count(): number;
        public Push(item: any): void;
        public Pop(): any;
    }
    class Stack_ParseNode extends Stack {
        public Pop(): ParseNode;
    }
    function BinarySearch(list: IList, searchValue: any, comparer: (searchValue: any, item: any) => number): number;
    function FirstOrDefault(list: IList, pred: (item: any) => bool);
    function LastOrDefault(list: IList, pred: (item: any) => bool);
    class AuthorParseNode {
        constructor();
        public Details: AuthorParseNodeDetails;
        public Name: number;
        public Label: number;
        public EdgeLabel: AuthorParseNodeEdge;
        public Level: number;
    }
    class AuthorParseNodeDetails {
        constructor();
        public nodeType: TypeScript.NodeType;
        public ast: TypeScript.AST;
        public Kind: AuthorParseNodeKind;
        public StartOffset: number;
        public EndOffset: number;
        public Flags: AuthorParseNodeFlags;
        public Equals(other: AuthorParseNodeDetails): bool;
    }
    enum AuthorParseNodeFlags {
        apnfNone,
        apnfSyntheticNode,
    }
    enum AuthorParseNodeKind {
        apnkEmptyNode,
        apnkNone,
        apnkName,
        apnkInt,
        apnkFlt,
        apnkStr,
        apnkRegExp,
        apnkThis,
        apnkNull,
        apnkFalse,
        apnkTrue,
        apnkEmpty,
        apnkLdFncSlot,
        apnkArgRef,
        apnkHelperCall3,
        apnkNot,
        apnkNeg,
        apnkPos,
        apnkLogNot,
        apnkIncPost,
        apnkDecPost,
        apnkIncPre,
        apnkDecPre,
        apnkTypeof,
        apnkVoid,
        apnkDelete,
        apnkArray,
        apnkObject,
        apnkTempRef,
        apnkStFncSlot,
        apnkAdd,
        apnkSub,
        apnkMul,
        apnkDiv,
        apnkMod,
        apnkOr,
        apnkXor,
        apnkAnd,
        apnkEq,
        apnkNe,
        apnkLt,
        apnkLe,
        apnkGe,
        apnkGt,
        apnkCall,
        apnkDot,
        apnkAsg,
        apnkInstOf,
        apnkIn,
        apnkEqv,
        apnkNEqv,
        apnkComma,
        apnkLogOr,
        apnkLogAnd,
        apnkLsh,
        apnkRsh,
        apnkRs2,
        apnkNew,
        apnkIndex,
        apnkQmark,
        apnkAsgAdd,
        apnkAsgSub,
        apnkAsgMul,
        apnkAsgDiv,
        apnkAsgMod,
        apnkAsgAnd,
        apnkAsgXor,
        apnkAsgOr,
        apnkAsgLsh,
        apnkAsgRsh,
        apnkAsgRs2,
        apnkScope,
        apnkMember,
        apnkSetMember,
        apnkGetMember,
        apnkList,
        apnkVarDecl,
        apnkTemp,
        apnkFncDecl,
        apnkProg,
        apnkEndCode,
        apnkDebugger,
        apnkFor,
        apnkIf,
        apnkWhile,
        apnkDoWhile,
        apnkForIn,
        apnkBlock,
        apnkWith,
        apnkBreak,
        apnkContinue,
        apnkLabel,
        apnkSwitch,
        apnkCase,
        apnkTryCatch,
        apnkCatch,
        apnkReturn,
        apnkTry,
        apnkThrow,
        apnkFinally,
        apnkTryFinally,
        apnkStruct,
        apnkEnum,
        apnkTyped,
        apnkVarDeclList,
        apnkDefaultCase,
    }
    enum AuthorTokenKind {
        atkEnd,
        atkText,
        atkIdentifier,
        atkComment,
        atkNumber,
        atkString,
        atkRegexp,
        atkConditionalComp,
        atkScanError,
        atkSColon,
        atkLParen,
        atkRParen,
        atkLBrack,
        atkRBrack,
        atkLCurly,
        atkRCurly,
        atkComma,
        atkArrow,
        atkAsg,
        atkAsgAdd,
        atkAsgSub,
        atkAsgMul,
        atkAsgDiv,
        atkAsgMod,
        atkAsgAnd,
        atkAsgXor,
        atkAsgOr,
        atkAsgLsh,
        atkAsgRsh,
        atkAsgRs2,
        atkQMark,
        atkColon,
        atkLogOr,
        atkLogAnd,
        atkOr,
        atkXor,
        atkAnd,
        atkEQ,
        atkNE,
        atkEqv,
        atkNEqv,
        atkLT,
        atkLE,
        atkGT,
        atkGE,
        atkLsh,
        atkRsh,
        atkRs2,
        atkAdd,
        atkSub,
        atkMult,
        atkDiv,
        atkPct,
        atkTilde,
        atkBang,
        atkInc,
        atkDec,
        atkDot,
        atkScope,
        atkEllipsis,
        atkBreak,
        atkCase,
        atkCatch,
        atkClass,
        atkConst,
        atkContinue,
        atkDebugger,
        atkDefault,
        atkDelete,
        atkDo,
        atkElse,
        atkEnum,
        atkExport,
        atkExtends,
        atkFalse,
        atkFinally,
        atkFor,
        atkFunction,
        atkIf,
        atkImport,
        atkIn,
        atkInstanceof,
        atkNew,
        atkNull,
        atkReturn,
        atkSuper,
        atkSwitch,
        atkThis,
        atkThrow,
        atkTrue,
        atkTry,
        atkTypeof,
        atkVar,
        atkVoid,
        atkWhile,
        atkWith,
        atkConstructor,
        atkDeclare,
        atkModule,
        atkGet,
        atkSet,
        atkImplements,
        atkInterface,
        atkLet,
        atkPackage,
        atkPrivate,
        atkProtected,
        atkPublic,
        atkStatic,
        atkYield,
        Length,
    }
    enum AuthorParseNodeEdge {
        apneNone,
        apneOperand,
        apneLeft,
        apneRight,
        apneCondition,
        apneThen,
        apneElse,
        apneInitialization,
        apneIncrement,
        apneBody,
        apneBlockBody,
        apneValue,
        apneTarget,
        apneArgument,
        apneArguments,
        apneMembers,
        apneVariable,
        apneObject,
        apneTry,
        apneCatch,
        apneFinally,
        apneCase,
        apneDefaultCase,
        apneElements,
        apneListItem,
        apneMember,
        apneType,
    }
    interface IAuthorParseNodeCursor {
        Current(): AuthorParseNodeDetails;
        Parent(): AuthorParseNodeDetails;
        MoveToChild(edgeLabel: AuthorParseNodeEdge, index: number): AuthorParseNodeDetails;
        MoveUp(): AuthorParseNodeDetails;
        SeekToOffset(offset: number, excludeEndOffset: bool): AuthorParseNodeDetails;
        MoveToEnclosingNode(startOffset: number, endOffset: number): AuthorParseNodeDetails;
        GetSubTree(depth: number): IAuthorParseNodeSet;
        GetNodeProperty(nodeProperty: AuthorParseNodeProperty): number;
        GetEdgeLabel(): AuthorParseNodeEdge;
    }
    interface IAuthorParseNodeSet {
        Count(): number;
        GetItems(startIndex: number, count: number): AuthorParseNode[];
    }
    class AuthorParseNodeSet implements IAuthorParseNodeSet {
        private nodes;
        constructor(nodes: AuthorParseNode[]);
        public Count(): number;
        public GetItems(startIndex: number, count: number): AuthorParseNode[];
    }
    enum AuthorParseNodeProperty {
        apnpLCurlyMin,
        apnpRCurlyMin,
        apnpLParenMin,
        apnpRParenMin,
        apnpLBrackMin,
        apnpRBrackMin,
        apnpIdentifierMin,
        apnpFunctionKeywordMin,
    }
    class AuthorTokenKindMap {
        static instance: AuthorTokenKindMap;
        private tokenMap;
        static getInstance(): AuthorTokenKindMap;
        constructor();
        private init();
        public getTokenKind(kind: TypeScript.TokenID): AuthorTokenKind;
        private mapTokenID(kind);
    }
    class Debug {
        static Assert(cond: bool, msg: string): void;
        static Fail(msg: string): void;
    }
    class HashSet_int {
        public items: number[];
        constructor();
        public Contains(item: number): bool;
        public Add(item: number): void;
    }
    class Dictionary_int_List_IndentationEditInfo {
        private items;
        constructor();
        public GetValue(key: number): List_IndentationEditInfo;
        public Add(key: number, value: List_IndentationEditInfo): void;
    }
    class Dictionary_int_int {
        private items;
        constructor();
        public GetValue(key: number): number;
        public Add(key: number, value: number): void;
    }
    class Math {
        static Max(x: number, y: number): number;
        static Min(x: number, y: number): number;
    }
    class StringUtils {
        static IndexOf(value: string, search: string, startIndex?: number): number;
        static Equals(x: string, y: string): bool;
        static IsNullOrEmpty(x: string): bool;
        static IsWhiteSpace(charCode: number): bool;
        static create(value: string, count: number): string;
        static foreach(x: string, action: (c: string) => void): void;
    }
    class EditorUtilities {
        static IsWhitespace(charCode: number): bool;
    }
    function getTokensInSpan(logger: TypeScript.ILogger, scriptSyntaxAST: Services.ScriptSyntaxAST, tokenKindMap: AuthorTokenKindMap, span: SnapshotSpan): IList_TokenSpan;
}
module Formatting {
    class FormattingContext {
        private fileAuthoringProxy;
        private snapshot;
        private tokens;
        public formattingRequestKind: FormattingRequestKind;
        public contextNode: ParseNode;
        public tokenSpan: TokenSpan;
        public nextTokenSpan: TokenSpan;
        private contextNodeAllOnSameLine;
        private tokensAreOnSameLine;
        private tokensAreSiblingNodesOnSameLine;
        constructor(fileAuthoringProxy: FileAuthoringProxy, snapshot: ITextSnapshot, tokens: IList_TokenSpan, formattingRequestKind: FormattingRequestKind);
        public findTokenAtPosition(position: number): TokenSpan;
        public setContext(node: ParseNode, t1: TokenSpan, t2: TokenSpan): void;
        public ContextNodeAllOnSameLine(): bool;
        public TokensAreOnSameLine(): bool;
        public TokensAreSiblingNodesOnSameLine(): bool;
        private AreTokensSiblingNodesOnSameLine();
    }
}
module Formatting {
    class FormattingManager implements IFormatter {
        private scriptSyntaxAST;
        private rulesProvider;
        private editorOptions;
        private logger;
        private sourceText;
        private snapshot;
        private fileAuthoringProxy;
        private tokenKindMap;
        constructor(scriptSyntaxAST: Services.ScriptSyntaxAST, rulesProvider: RulesProvider, editorOptions: Services.EditorOptions);
        public FormatSelection(minChar: number, limChar: number): Services.TextEdit[];
        public FormatDocument(minChar: number, limChar: number): Services.TextEdit[];
        public FormatOnPaste(minChar: number, limChar: number): Services.TextEdit[];
        private CanFormatSpan(span);
        public FormatOnSemicolon(caretPosition: number): Services.TextEdit[];
        public FormatOnClosingCurlyBrace(caretPosition: number): Services.TextEdit[];
        public FormatOnEnter(caretPosition: number): Services.TextEdit[];
        private FindMatchingBlockSpan(bracePoint, formattingRequestKind);
        private FindStatementSpan(semicolonPoint, formattingRequestKind);
        private MapDownSnapshotSpan(snapshotSpan);
        private MapDownSnapshotPoint(snapshotPoint);
        private GetTokens(span);
        private IsInsideStringLiteralOrComment(point, tokens);
        private Format(span, formattingRequestKind, prerequisiteTokenTest);
    }
}
module Formatting {
    enum FormattingRequestKind {
        FormatDocument,
        FormatSelection,
        FormatOnEnter,
        FormatOnSemicolon,
        FormatOnClosingCurlyBrace,
        FormatOnPaste,
    }
}
module Formatting {
    class FormattingTask {
        public logger: TypeScript.ILogger;
        public Snapshot: ITextSnapshot;
        public span: SnapshotSpan;
        public tokens: IList_TokenSpan;
        public fileAuthoringProxy: FileAuthoringProxy;
        public rulesProvider: RulesProvider;
        public editorOptions: Services.EditorOptions;
        public languageHostIndentation: string;
        public scriptHasErrors: bool;
        public formattingRequestKind: FormattingRequestKind;
        private snapshotSpan;
        private tokenTags;
        public EditCommands: List_TextEditInfo;
        constructor(logger: TypeScript.ILogger, Snapshot: ITextSnapshot, span: SnapshotSpan, tokens: IList_TokenSpan, fileAuthoringProxy: FileAuthoringProxy, rulesProvider: RulesProvider, editorOptions: Services.EditorOptions, languageHostIndentation: string, scriptHasErrors: bool, formattingRequestKind: FormattingRequestKind);
        public Run(): void;
        private Format(tree);
        private GetProjectionEndLines();
        private GetProjectionLineEndPositionSet();
        private TrimWhitespaceInLineRange(token, startLine, endLine);
        private TrimWhitespace(token);
        private TrimWhitespace2(token, line);
        private GetRuleEdits(rule, t1, t2);
        private GetRuleEditsWorker(rule, t1, t2);
        private FindTokenNode(span, helperNode);
    }
}
module Formatting {
    interface IFormatter {
        FormatDocument(minChar: number, limChar: number): Services.TextEdit[];
        FormatSelection(minChar: number, limChar: number): Services.TextEdit[];
        FormatOnPaste(minChar: number, limChar: number): Services.TextEdit[];
        FormatOnSemicolon(caretPosition: number): Services.TextEdit[];
        FormatOnClosingCurlyBrace(caretPosition: number): Services.TextEdit[];
        FormatOnEnter(caret: number): Services.TextEdit[];
    }
}
module Formatting {
    interface ILineIndenationResolver {
        GetLineIndentationForOffset(offset: number): string;
    }
}
module Formatting {
    class IndentationBag {
        private snapshot;
        private indentationEdits;
        constructor(snapshot: ITextSnapshot);
        public AddIndent(edit: IndentationEditInfo): void;
        public FindIndent(position: number): IndentationEditInfo;
    }
}
module Formatting {
    class IndentationEdgeFinder {
        static FillIndentationLevels(node: ParseNode): void;
        static FillBodyIndentation(node: ParseNode, nextNodesToVisit: Stack_ParseNode): void;
        static FillIndentationLevels2(node: ParseNode, nextNodesToVisit: Stack_ParseNode): void;
        static FillIndentationEdgesForBlockOrNot(node: ParseNode, childrenLevel: number): void;
        static FillIndentationEdgesForBlock(node: ParseNode, childrenLevel: number): void;
    }
}
module Formatting {
    class IndentationEditInfo {
        private textEditInfo;
        public OrigIndentPosition: number;
        constructor(textEditInfo: TextEditInfo);
        public Position(): number;
        public Indentation(): string;
        public OrigIndentLength(): number;
        static create1(textEditInfo: TextEditInfo): IndentationEditInfo;
        static create2(position: number, indentString: string, origPosition: number, origIndentLength: number): IndentationEditInfo;
    }
}
module Formatting {
    class IndentationInfo {
        public Prefix: string;
        public Level: number;
        constructor(Prefix?: string, Level?: number);
    }
}
module Formatting {
    class Indenter implements ILineIndenationResolver {
        public logger: TypeScript.ILogger;
        public tree: ParseTree;
        public snapshot: ITextSnapshot;
        public languageHostIndentation: string;
        public editorOptions: Services.EditorOptions;
        public firstToken: TokenSpan;
        public smartIndent: bool;
        private indentationBag;
        private scriptBlockBeginLineNumber;
        private offsetIndentationDeltas;
        constructor(logger: TypeScript.ILogger, tree: ParseTree, snapshot: ITextSnapshot, languageHostIndentation: string, editorOptions: Services.EditorOptions, firstToken: TokenSpan, smartIndent: bool);
        public GetIndentationEdits(token: TokenSpan, nextToken: TokenSpan, node: ParseNode, sameLineIndent: bool): List_TextEditInfo;
        public GetIndentationEditsWorker(token: TokenSpan, nextToken: TokenSpan, node: ParseNode, sameLineIndent: bool): List_TextEditInfo;
        private GetCommentIndentationEdits(token);
        static GetIndentSizeFromIndentText(indentText: string, editorOptions: Services.EditorOptions): number;
        static GetIndentSizeFromText(text: string, editorOptions: Services.EditorOptions, includeNonIndentChars: bool): number;
        private GetSpecialCaseIndentation(token, node);
        private GetSpecialCaseIndentationForLCurly(node);
        private GetSpecialCaseIndentationForSemicolon(token, node);
        private GetSpecialCaseIndentationForComment(token, node);
        private CanIndentComment(token, node);
        private ApplyScriptBlockIndentation(languageHostIndentation, tree);
        private GetIndentEdit(indentInfo, tokenStartPosition, sameLineIndent);
        private ApplyIndentationLevel(existingIndentation, level);
        private GetIndentString(prefix, totalIndentSize, tabSize, convertTabsToSpaces);
        private ApplyIndentationDeltaFromParent(token, node);
        private ApplyIndentationDelta1(tokenStartPosition, delta);
        private ApplyIndentationDelta2(currentIndent, delta);
        private GetIndentationDelta(tokenStartPosition, childTokenStartPosition);
        private FillInheritedIndentation(tree);
        public GetLineIndentationForOffset(offset: number): string;
        private RegisterIndentation(indent, sameLineIndent);
        public RegisterIndentation2(position: number, indent: string): void;
        private AdjustStartOffsetIfNeeded(token, node);
        private IsMultiLineString(token);
    }
}
module Formatting {
    class MatchingBlockFinderTask {
        private bracePoint;
        private FileAuthoringProxy;
        constructor(bracePoint: SnapshotPoint, FileAuthoringProxy: FileAuthoringProxy);
        public Run(): Span;
        private FindMatchingBlockSpan(parser);
    }
}
module Formatting {
    class ParseNode {
        private _children;
        private blockSpan;
        public indentationOverride: string;
        public Parent: ParseNode;
        public AuthorNode: AuthorParseNode;
        public IsIndentationOverrideEdge: bool;
        public IndentationDelta: number;
        public ChildrenIndentationDelta: number;
        public TokenTagIndex: number;
        constructor();
        public children(): List_ParseNode;
        public addChildNode(node: ParseNode): void;
        public CanIndent(): bool;
        public CoverSpan(span: Span): bool;
        public SetIndentationOverride(newIndentationOverride: string): void;
        public GetNodeStartLineIndentation(indentResolver: ILineIndenationResolver): IndentationInfo;
        public GetEffectiveIndentation(indentResolver: ILineIndenationResolver): IndentationInfo;
        public GetEffectiveChildrenIndentation(indentResolver: ILineIndenationResolver): IndentationInfo;
        public GetEffectiveChildrenIndentationForComment(indentResolver: ILineIndenationResolver): IndentationInfo;
        static IsNonIndentableException(node: ParseNode): bool;
        public GetBlockSpan(fileAuthoringProxy: FileAuthoringProxy, tokens: IList_TokenSpan): Span;
        public toString(): string;
    }
}
module Formatting {
    class ParseNodeExtensions {
        static GetChildren(node: ParseNode): List_ParseNode;
        static FindChildrenWithEdge(node: ParseNode, edge: AuthorParseNodeEdge): List_ParseNode;
        static FindChildWithEdge(node: ParseNode, edge: AuthorParseNodeEdge): ParseNode;
        static ForAllChildren(node: ParseNode, action: (item: ParseNode) => void): void;
        static comparer(position: number, item: ParseNode): number;
        static findNodeInsertionPivot(nodes: IList_ParseNode, startOffset: number): number;
        static TryFindNodeIndexForStartOffset(nodes: IList_ParseNode, startOffset: number): number;
        static TryFindNodeForSpan(nodes: IList_ParseNode, span: Span): ParseNode;
        static SetNodeSpan(node: ParseNode, newStartOffset: number, newEndOffset: number): void;
    }
}
module Formatting {
    class ParseTree {
        public Root: ParseNode;
        public StartNodeSelf: ParseNode;
        public StartNodePreviousSibling: AuthorParseNode;
        constructor(fileAuthoringProxy: FileAuthoringProxy, span: Span, tokens: IList_TokenSpan, onlySelfAndAncestors: bool);
        static FindCommonParentNode(leftSpan: Span, rightSpan: Span, context: ParseNode): ParseNode;
        private Initialize(fileAuthoringProxy, span, onlySelfAndAncestors);
        static GetPreviousSibling(startNodeSelf: AuthorParseNode, nodes: AuthorParseNode[]): AuthorParseNode;
        static FindStartSelfNode(selfAndDescendantsNodes: IList_ParseNode, span: Span): ParseNode;
        static IsSiblingEdge(edge: AuthorParseNodeEdge): bool;
        static BuildTree(parseNodes: IList_ParseNode): ParseNode;
        static DumpTree(logger: TypeScript.ILogger, parseNode: ParseNode): void;
        static AdjustNodeSpanIfNeeded(astCursor: IAuthorParseNodeCursor, node: ParseNode): void;
    }
}
module Formatting {
    class Rule {
        public Descriptor: RuleDescriptor;
        public Operation: RuleOperation;
        public Flag: RuleFlags;
        constructor(Descriptor: RuleDescriptor, Operation: RuleOperation, Flag?: RuleFlags);
        public toString(): string;
    }
}
module Formatting {
    enum RuleAction {
        Ignore,
        Space,
        NewLine,
        Delete,
    }
}
module Formatting {
    class RuleDescriptor {
        public LeftTokenRange: Shared.TokenRange;
        public RightTokenRange: Shared.TokenRange;
        constructor(LeftTokenRange: Shared.TokenRange, RightTokenRange: Shared.TokenRange);
        public toString(): string;
        static create1(left: AuthorTokenKind, right: AuthorTokenKind): RuleDescriptor;
        static create2(left: Shared.TokenRange, right: AuthorTokenKind): RuleDescriptor;
        static create3(left: AuthorTokenKind, right: Shared.TokenRange): RuleDescriptor;
        static create4(left: Shared.TokenRange, right: Shared.TokenRange): RuleDescriptor;
    }
}
module Formatting {
    enum RuleFlags {
        None,
        CanDeleteNewLines,
    }
}
module Formatting {
    class RuleOperation {
        public Context: RuleOperationContext;
        public Action: RuleAction;
        constructor();
        public toString(): string;
        static create1(action: RuleAction): RuleOperation;
        static create2(context: RuleOperationContext, action: RuleAction): RuleOperation;
    }
}
module Formatting {
    class RuleOperationContext {
        private customContextChecks;
        constructor(...funcs: {
                (context: FormattingContext): bool;
            }[]);
        static Any: RuleOperationContext;
        public IsAny(): bool;
        public InContext(context: FormattingContext): bool;
    }
}
module Formatting {
    class Rules {
        public getRuleName(rule: Rule): string;
        public IgnoreBeforeComment: Rule;
        public IgnoreAfterLineComment: Rule;
        public NoSpaceBeforeSemicolon: Rule;
        public NoSpaceBeforeColon: Rule;
        public NoSpaceBeforeQMark: Rule;
        public SpaceAfterColon: Rule;
        public SpaceAfterQMark: Rule;
        public SpaceAfterSemicolon: Rule;
        public NewLineAfterCloseCurly: Rule;
        public SpaceAfterCloseCurly: Rule;
        public SpaceBetweenCloseCurlyAndElse: Rule;
        public SpaceBetweenCloseCurlyAndWhile: Rule;
        public NoSpaceBeforeDot: Rule;
        public NoSpaceAfterDot: Rule;
        public NoSpaceBeforeOpenBracket: Rule;
        public NoSpaceAfterOpenBracket: Rule;
        public NoSpaceBeforeCloseBracket: Rule;
        public NoSpaceAfterCloseBracket: Rule;
        public SpaceAfterOpenCurly: Rule;
        public SpaceBeforeCloseCurly: Rule;
        public NoSpaceBetweenEmptyCurlyBrackets: Rule;
        public NewLineAfterOpenCurlyInBlockContext: Rule;
        public NewLineBeforeCloseCurlyInFunctionOrControl: Rule;
        public NoSpaceAfterUnaryPrefixOperator: Rule;
        public NoSpaceAfterUnaryPreincrementOperator: Rule;
        public NoSpaceAfterUnaryPredecrementOperator: Rule;
        public NoSpaceBeforeUnaryPostincrementOperator: Rule;
        public NoSpaceBeforeUnaryPostdecrementOperator: Rule;
        public SpaceAfterPostincrementWhenFollowedByAdd: Rule;
        public SpaceAfterAddWhenFollowedByUnaryPlus: Rule;
        public SpaceAfterAddWhenFollowedByPreincrement: Rule;
        public SpaceAfterPostdecrementWhenFollowedBySubtract: Rule;
        public SpaceAfterSubtractWhenFollowedByUnaryMinus: Rule;
        public SpaceAfterSubtractWhenFollowedByPredecrement: Rule;
        public NoSpaceBeforeComma: Rule;
        public SpaceAfterCertainKeywords: Rule;
        public NoSpaceBeforeOpenParenInFuncCall: Rule;
        public SpaceAfterFunctionInFuncDecl: Rule;
        public NoSpaceBeforeOpenParenInFuncDecl: Rule;
        public SpaceBetweenStatements: Rule;
        public SpaceAfterTryFinally: Rule;
        public SpaceAfterGetSetInMember: Rule;
        public SpaceBeforeBinaryKeywordOperator: Rule;
        public SpaceAfterBinaryKeywordOperator: Rule;
        public NoSpaceAfterConstructor: Rule;
        public NoSpaceAfterModuleImport: Rule;
        public SpaceAfterCertainTypeScriptKeywords: Rule;
        public SpaceBeforeCertainTypeScriptKeywords: Rule;
        public SpaceAfterModuleName: Rule;
        public SpaceAfterArrow: Rule;
        public NoSpaceAfterEllipsis: Rule;
        public NoSpaceAfterOptionalParameters: Rule;
        public NoSpaceBetweenEmptyInterfaceCurlyBrackets: Rule;
        public HighPriorityCommonRules: Rule[];
        public LowPriorityCommonRules: Rule[];
        public SpaceAfterComma: Rule;
        public NoSpaceAfterComma: Rule;
        public SpaceBeforeBinaryOperator: Rule;
        public SpaceAfterBinaryOperator: Rule;
        public NoSpaceBeforeBinaryOperator: Rule;
        public NoSpaceAfterBinaryOperator: Rule;
        public SpaceAfterKeywordInControl: Rule;
        public NoSpaceAfterKeywordInControl: Rule;
        public FunctionOpenCurlyLeftTokenRange: Shared.TokenRange;
        public FunctionOpenCurlyLeftTokenRange_Js: Shared.TokenRange;
        public SpaceBeforeOpenCurlyInFunction: Rule;
        public NewLineBeforeOpenCurlyInFunction: Rule;
        public TypeScriptOpenCurlyLeftTokenRange: Shared.TokenRange;
        public SpaceBeforeOpenCurlyInTypeScriptDeclWithBlock: Rule;
        public NewLineBeforeOpenCurlyInTypeScriptDeclWithBlock: Rule;
        public ControlOpenCurlyLeftTokenRange: Shared.TokenRange;
        public SpaceBeforeOpenCurlyInControl: Rule;
        public NewLineBeforeOpenCurlyInControl: Rule;
        public SpaceAfterSemicolonInFor: Rule;
        public NoSpaceAfterSemicolonInFor: Rule;
        public SpaceAfterOpenParen: Rule;
        public SpaceBeforeCloseParen: Rule;
        public NoSpaceBetweenParens: Rule;
        public NoSpaceAfterOpenParen: Rule;
        public NoSpaceBeforeCloseParen: Rule;
        public SpaceAfterAnonymousFunctionKeyword: Rule;
        public NoSpaceAfterAnonymousFunctionKeyword: Rule;
        constructor();
        static IsForContext(context: FormattingContext): bool;
        static IsNotForContext(context: FormattingContext): bool;
        static IsBinaryOpContext(context: FormattingContext): bool;
        static IsNotBinaryOpContext(context: FormattingContext): bool;
        static IsBlockContext(node: ParseNode): bool;
        static IsTypeScriptDeclWithBlockContextNode(node: ParseNode): bool;
        static IsSingleLineBlockContext(context: FormattingContext): bool;
        static IsMultilineBlockContext(context: FormattingContext): bool;
        static IsFunctionDeclContext(context: FormattingContext): bool;
        static IsTypeScriptDeclWithBlockContext(context: FormattingContext): bool;
        static IsControlDeclContext(context: FormattingContext): bool;
        static IsObjectContext(context: FormattingContext): bool;
        static IsFunctionCallContext(context: FormattingContext): bool;
        static IsNewContext(context: FormattingContext): bool;
        static IsFunctionCallOrNewContext(context: FormattingContext): bool;
        static IsSameLineTokenContext(context: FormattingContext): bool;
        static IsSameLineSiblingNodeContext(context: FormattingContext): bool;
        static IsMultilineChildParentContext(context: FormattingContext): bool;
        static IsNotFormatOnEnter(context: FormattingContext): bool;
        static IsSameLineTokenOrMultilineBlockContext(context: FormattingContext): bool;
        static IsFunctionOrGetSetDeclContext(context: FormattingContext): bool;
        static IsGetSetMemberContext(context: FormattingContext): bool;
        static IsFirstTokenLineCommentContext(context: FormattingContext): bool;
        static IsModuleDeclContext(context: FormattingContext): bool;
        static IsInterfaceContext(context: FormattingContext): bool;
    }
}
module Formatting {
    class RulesMap {
        public map: RulesBucket[];
        public mapRowLength: number;
        constructor();
        static create(rules: List_Rule): RulesMap;
        public Initialize(rules: List_Rule): RulesBucket[];
        public FillRules(rules: List_Rule, rulesBucketConstructionStateList: RulesBucketConstructionState[]): void;
        private GetRuleBucketIndex(row, column);
        private FillRule(rule, rulesBucketConstructionStateList);
        public GetRule(context: FormattingContext): Rule;
    }
    enum Position {
        IgnoreRulesSpecific,
        IgnoreRulesAny,
        ContextRulesSpecific,
        ContextRulesAny,
        NoContextRulesSpecific,
        NoContextRulesAny,
    }
    class RulesBucketConstructionState {
        private rulesInsertionIndexBitmap;
        constructor();
        public GetInsertionIndex(maskPosition: Position): number;
        public IncreaseInsertionIndex(maskPosition: Position): void;
    }
    class RulesBucket {
        private rules;
        constructor();
        public Rules(): List_Rule;
        public AddRule(rule: Rule, specificTokens: bool, constructionState: RulesBucketConstructionState[], rulesBucketIndex: number): void;
    }
}
module Formatting {
    class RulesProvider {
        private logger;
        private globalRules;
        private options;
        private activeRules;
        private rulesMap;
        constructor(logger: TypeScript.ILogger);
        public getRuleName(rule: Rule): string;
        public getRuleByName(name: string): Rule;
        public setActiveRules(staticList: List_Rule): void;
        public getActiveRules(): List_Rule;
        public getRulesMap(): RulesMap;
        public ensureUptodate(options: Services.FormatCodeOptions): void;
        private createActiveRules(options);
    }
}
module Formatting {
    class SmartIndentManager {
        private scriptSyntaxAST;
        private editorOptions;
        private logger;
        private sourceText;
        private snapshot;
        private fileAuthoringProxy;
        private tokenKindMap;
        constructor(scriptSyntaxAST: Services.ScriptSyntaxAST, editorOptions: Services.EditorOptions);
        public getSmartIndentAtLineNumber(lineNumber: number): number;
        private getPossibleTokenSpan(caretPosition);
        private gtTokens(span);
        private getBlockIndent(line);
    }
}
module Formatting {
    class SmartIndentTask {
        private logger;
        private snapshotSpan;
        private tokens;
        private fileAuthoringProxy;
        private editorOptions;
        private languageHostIndentation;
        private snapshot;
        public DesiredIndentation: string;
        constructor(logger: TypeScript.ILogger, snapshotSpan: SnapshotSpan, tokens: IList_TokenSpan, fileAuthoringProxy: FileAuthoringProxy, editorOptions: Services.EditorOptions, languageHostIndentation: string);
        public Run(): void;
        private FindIndentation(tree);
        private CanDoSmartIndent(context, firstToken);
        private CanDoSmartIndentInStatement(node);
        private CanDoSmartIndentInFunction(node, firstToken);
        private CanDoSmartIndentInStatementWithBlock(node, firstToken);
        private CanDoSmartIndentInStatementWithParenAndBlock(node, firstToken);
        private CanDoSmartIndentInFor(node);
        static IsEmptyRegion(snapshot: ITextSnapshot, startLine: number, endLine: number): bool;
        static IsEmptyString(lineText: string): bool;
    }
}
module Formatting {
    class StatementFinderTask {
        private logger;
        private semicolonPoint;
        private fileAuthoringProxy;
        public BlockSpan: Span;
        constructor(logger: TypeScript.ILogger, semicolonPoint: SnapshotPoint, fileAuthoringProxy: FileAuthoringProxy);
        public Run(): void;
    }
}
module Formatting {
    class TextEditInfo {
        public position: number;
        public length: number;
        public replaceWith: string;
        public Position: number;
        public Length: number;
        public ReplaceWith: string;
        constructor(position: number, length: number, replaceWith: string);
    }
}
module Formatting.Shared {
    interface ITokenAccess {
        GetTokens(): List_AuthorTokenKind;
        Contains(token: AuthorTokenKind): bool;
    }
    class TokenRangeAccess implements ITokenAccess {
        private tokens;
        constructor(from: AuthorTokenKind, to: AuthorTokenKind, except: AuthorTokenKind[]);
        public GetTokens(): List_AuthorTokenKind;
        public Contains(token: AuthorTokenKind): bool;
        public toString(): string;
    }
    class TokenValuesAccess implements ITokenAccess {
        private tokens;
        constructor(tks: AuthorTokenKind[]);
        public GetTokens(): List_AuthorTokenKind;
        public Contains(token: AuthorTokenKind): bool;
    }
    class TokenSingleValueAccess implements ITokenAccess {
        public token: AuthorTokenKind;
        constructor(token: AuthorTokenKind);
        public GetTokens(): List_AuthorTokenKind;
        public Contains(tokenValue: AuthorTokenKind): bool;
        public toString(): string;
    }
    class TokenAllAccess implements ITokenAccess {
        public GetTokens(): List_AuthorTokenKind;
        public Contains(tokenValue: AuthorTokenKind): bool;
        public toString(): string;
    }
    class TokenRange {
        public tokenAccess: ITokenAccess;
        constructor(tokenAccess: ITokenAccess);
        static FromToken(token: AuthorTokenKind): TokenRange;
        static FromTokens(tokens: AuthorTokenKind[]): TokenRange;
        static FromRange(f: AuthorTokenKind, to: AuthorTokenKind, except?: AuthorTokenKind[]): TokenRange;
        static AllTokens(): TokenRange;
        public GetTokens(): List_AuthorTokenKind;
        public Contains(token: AuthorTokenKind): bool;
        public toString(): string;
        static Any: TokenRange;
        static Keywords: TokenRange;
        static Operators: TokenRange;
        static BinaryOperators: TokenRange;
        static BinaryKeywordOperators: TokenRange;
        static ReservedKeywords: TokenRange;
        static UnaryPrefixOperators: TokenRange;
        static UnaryPrefixExpressions: TokenRange;
        static UnaryPreincrementExpressions: TokenRange;
        static UnaryPostincrementExpressions: TokenRange;
        static UnaryPredecrementExpressions: TokenRange;
        static UnaryPostdecrementExpressions: TokenRange;
    }
}
module Formatting {
    class TokenSpan {
        public Token: AuthorTokenKind;
        public tokenID: TypeScript.TokenID;
        public Span: SnapshotSpan;
        private _lineNumber;
        constructor(Token: AuthorTokenKind, tokenID: TypeScript.TokenID, Span: SnapshotSpan);
        public lineNumber(): number;
        public toString(): string;
    }
}
var debugObjectHost;
module Services {
    interface ICoreServicesHost {
        logger: TypeScript.ILogger;
    }
    class CoreServices {
        public host: ICoreServicesHost;
        constructor(host: ICoreServicesHost);
        public getPreProcessedFileInfo(scritpId: string, sourceText: TypeScript.ISourceText): TypeScript.IPreProcessedFileInfo;
        public getDefaultCompilationSettings(): TypeScript.CompilationSettings;
        public dumpMemory(): string;
        public getMemoryInfo(): any[];
        public collectGarbage(): void;
    }
}
module Services {
    class ScriptMap {
        private map;
        constructor();
        public setEntry(id: string, isResident: bool, version: number): void;
        public getEntry(id: string): ScriptMapEntry;
    }
    class ScriptMapEntry {
        public isResident: bool;
        public version: number;
        constructor(isResident: bool, version: number);
    }
    class HostCacheEntry {
        private host;
        public hostUnitIndex: number;
        public id: string;
        public version: number;
        public isResident: bool;
        private _cachedSourceText;
        private _sourceText;
        constructor(host: ILanguageServiceHost, hostUnitIndex: number, id: string, version: number, isResident: bool);
        public getSourceText(cached: bool): TypeScript.ISourceText;
    }
    class HostCache {
        public host: ILanguageServiceHost;
        private map;
        private array;
        constructor(host: ILanguageServiceHost);
        private init();
        public count(): number;
        public getUnitIndex(scriptId: string): number;
        public getVersion(scriptIndex: number): number;
        public getIsResident(scriptIndex: number): bool;
        public getScriptId(scriptIndex: number): string;
        public getSourceText(scriptIndex: number, cached?: bool): TypeScript.ISourceText;
    }
    class CompilerCache {
        public compiler: TypeScript.TypeScriptCompiler;
        private map;
        constructor(compiler: TypeScript.TypeScriptCompiler);
        private init();
        public getUnitIndex(scriptId: string): number;
    }
    class UnitErrors {
        public parseErrors: TypeScript.ErrorEntry[];
        public typeCheckErrors: TypeScript.ErrorEntry[];
        constructor();
    }
    class CompilerErrorCollector {
        public logger: TypeScript.ILogger;
        private parseMode;
        public fileMap: UnitErrors[];
        constructor(logger: TypeScript.ILogger);
        public startParsing(unitIndex: number): void;
        public startTypeChecking(): void;
        public reportError(pos: number, len: number, message: string, unitIndex: number): void;
    }
    class CompilerState {
        public host: ILanguageServiceHost;
        public logger: TypeScript.ILogger;
        private compiler;
        private errorCollector;
        private unitIndexMap;
        private scriptMap;
        private hostCache;
        private compilerCache;
        private symbolTree;
        private compilationSettings;
        constructor(host: ILanguageServiceHost);
        public getCompilationSettings(): TypeScript.CompilationSettings;
        private setUnitMapping(unitIndex, hostUnitIndex);
        private setUnitIndexMapping(unitIndex, hostUnitIndex);
        private onTypeCheckStarting();
        public getSymbolTree(): ISymbolTree;
        public mapToHostUnitIndex(unitIndex: number): number;
        public anyType(): TypeScript.Type;
        public getScriptCount(): number;
        public getScript(index: number): TypeScript.Script;
        public getScripts(): TypeScript.Script[];
        public getUnitIndex(fileName: string): number;
        public getScriptVersion(fileName: string): number;
        private addCompilerUnit(compiler, hostUnitIndex);
        private updateCompilerUnit(compiler, hostUnitIndex, unitIndex);
        private attemptIncrementalUpdateUnit(scriptId);
        private getHostCompilationSettings();
        private createCompiler();
        public minimalRefresh(): void;
        public refresh(throwOnError?: bool): void;
        private fullRefresh();
        private partialRefresh();
        private attemptIncrementalTypeCheck(updateResult);
        private applyUpdateResult(updateResult);
        public getScriptAST(fileName: string): TypeScript.Script;
        public getLineMap(fileName: string): number[];
        public getScopeEntries(enclosingScopeContext: TypeScript.EnclosingScopeContext, getPrettyTypeName?: bool): TypeScript.ScopeEntry[];
        public getErrorEntries(maxCount: number, filter: (unitIndex: number, error: TypeScript.ErrorEntry) => bool): TypeScript.ErrorEntry[];
        public cleanASTTypesForReTypeCheck(ast: TypeScript.AST): void;
        public getScriptEditRange(script: TypeScript.Script): TypeScript.ScriptEditRange;
        public getScriptEditRangeSinceVersion(fileName: string, lastKnownVersion: number): TypeScript.ScriptEditRange;
        public getSourceText(script: TypeScript.Script, cached?: bool): TypeScript.ISourceText;
        public getSourceText2(fileName: string, cached?: bool): TypeScript.ISourceText;
        public getScriptSyntaxAST(fileName: string): ScriptSyntaxAST;
        public getEmitOutput(fileName: string): IOutputFile[];
    }
}
module Services {
    class ScriptSyntaxAST {
        private logger;
        private script;
        private sourceText;
        constructor(logger: TypeScript.ILogger, script: TypeScript.Script, sourceText: TypeScript.ISourceText);
        public getLogger(): TypeScript.ILogger;
        public getScriptId(): string;
        public getScript(): TypeScript.Script;
        public getSourceText(): TypeScript.ISourceText;
        public getTokenStream(minChar?: number, limChar?: number): TokenStream;
        public getTokenizationOffset(position: number): number;
        public getAstPathToPosition(pos: number, options?: TypeScript.GetAstPathOptions): TypeScript.AstPath;
    }
    class TokenStream {
        private scanner;
        private offset;
        private currentToken;
        constructor(scanner: TypeScript.Scanner, offset: number);
        public moveNext(): bool;
        public sourceTextOffset(): number;
        public tokenId(): TypeScript.TokenID;
        public tokenStartPos(): number;
        public tokenEndPos(): number;
    }
    class TokenStreamHelper {
        public stream: TokenStream;
        constructor(stream: TokenStream);
        public moveNext(): bool;
        public expect(token: TypeScript.TokenID): bool;
        public skipToOffset(pos: number): bool;
        public tokenId(): TypeScript.TokenID;
        public tokenStartPos(): number;
        public tokenEndPos(): number;
    }
}
module Services {
    class BraceMatchingManager {
        private scriptSyntaxAST;
        constructor(scriptSyntaxAST: ScriptSyntaxAST);
        public getBraceMatchingAtPosition(position: number): TextRange[];
        public getMatchingBraceForward(position: number, openToken: TypeScript.TokenID, closeToken: TypeScript.TokenID): number;
        public getMatchingBraceBackward(position: number, closeToken: TypeScript.TokenID, openToken: TypeScript.TokenID): number;
    }
}
module Services {
    class SymbolSet {
        private table;
        constructor();
        private isSymbolArraySet(value);
        public add(sym: TypeScript.Symbol): bool;
        public contains(sym: TypeScript.Symbol): bool;
        public isEmpty(): bool;
        public getAll(): TypeScript.Symbol[];
        public forEach(callback: (x: TypeScript.Symbol) => void): void;
        public union(other: SymbolSet): void;
    }
}
module Services {
    interface ISymbolTree {
        findBaseTypesTransitiveClosure(sym: TypeScript.TypeSymbol): SymbolSet;
        findDerivedTypesTransitiveClosure(sym: TypeScript.TypeSymbol): SymbolSet;
        getOverride(container: TypeScript.TypeSymbol, memberSym: TypeScript.Symbol): TypeScript.Symbol;
        isClass(sym: TypeScript.Symbol): bool;
        isInterface(sym: TypeScript.Symbol): bool;
        isMethod(sym: TypeScript.Symbol): bool;
        isField(sym: TypeScript.Symbol): bool;
    }
    interface ISymbolTreeHost {
        getScripts(): TypeScript.Script[];
    }
    class SymbolTree implements ISymbolTree {
        public host: ISymbolTreeHost;
        private _allTypes;
        constructor(host: ISymbolTreeHost);
        public findBaseTypesTransitiveClosure(sym: TypeScript.TypeSymbol): SymbolSet;
        public findDerivedTypesTransitiveClosure(sym: TypeScript.TypeSymbol): SymbolSet;
        public getOverride(container: TypeScript.TypeSymbol, memberSym: TypeScript.Symbol): TypeScript.Symbol;
        public getAllTypes(): TypeScript.Symbol[];
        public findBaseTypes(closure: SymbolSet, lastSet: SymbolSet): SymbolSet;
        public findDerivedTypes(alreadyFound: SymbolSet, baseSymbols: SymbolSet): SymbolSet;
        public addBaseTypes(closure: SymbolSet, syms: SymbolSet, bases: TypeScript.Type[]): void;
        private isDefinition(sym);
        public isClass(sym: TypeScript.Symbol): bool;
        public isInterface(sym: TypeScript.Symbol): bool;
        public isMethod(sym: TypeScript.Symbol): bool;
        public isField(sym: TypeScript.Symbol): bool;
        public isStatic(sym: TypeScript.Symbol): bool;
    }
}
module Services {
    class OverridesCollector {
        public symbolTree: ISymbolTree;
        constructor(symbolTree: ISymbolTree);
        public findMemberOverrides(memberSym: TypeScript.Symbol): SymbolSet;
        public findImplementors(sym: TypeScript.Symbol): SymbolSet;
        private findMemberOverridesImpl(memberSym, lookInBases, lookInDerived);
    }
}
module Services {
    interface ILanguageServiceShim {
        host: ILanguageServiceShimHost;
        languageService: ILanguageService;
        logger: TypeScript.ILogger;
        dispose(dummy: any): void;
        refresh(throwOnError: bool): void;
        logAST(fileName: string): void;
        logSyntaxAST(fileName: string): void;
        getErrors(maxCount: number): string;
        getScriptErrors(fileName: string, maxCount: number): string;
        getTypeAtPosition(fileName: string, pos: number): string;
        getSignatureAtPosition(fileName: string, pos: number): string;
        getDefinitionAtPosition(fileName: string, pos: number): string;
        getBraceMatchingAtPosition(fileName: string, pos: number): string;
        getSmartIndentAtLineNumber(fileName: string, lineNumber: number, options: string): string;
        getReferencesAtPosition(fileName: string, pos: number): string;
        getOccurrencesAtPosition(fileName: string, pos: number): string;
        getCompletionsAtPosition(fileName: string, pos: number, isMemberCompletion: bool);
        getImplementorsAtPosition(fileName: string, pos: number): string;
        getFormattingEditsForRange(fileName: string, minChar: number, limChar: number, options: string): string;
        getFormattingEditsForDocument(fileName: string, minChar: number, limChar: number, options: string): string;
        getFormattingEditsOnPaste(fileName: string, minChar: number, limChar: number, options: string): string;
        getFormattingEditsAfterKeystroke(fileName: string, position: number, key: string, options: string): string;
        getNavigateToItems(searchValue: string): string;
        getScriptLexicalStructure(fileName: string): string;
        getOutliningRegions(fileName: string): string;
    }
    interface ILanguageServiceShimHost extends TypeScript.ILogger {
        getCompilationSettings(): string;
        getScriptCount(): number;
        getScriptId(scriptIndex: number): string;
        getScriptSourceText(scriptIndex: number, start: number, end: number): string;
        getScriptSourceLength(scriptIndex: number): number;
        getScriptIsResident(scriptIndex: number): bool;
        getScriptVersion(scriptIndex: number): number;
        getScriptEditRangeSinceVersion(scriptIndex: number, scriptVersion: number): string;
    }
    class LanguageServiceShimHostAdapter implements ILanguageServiceHost {
        private shimHost;
        constructor(shimHost: ILanguageServiceShimHost);
        public information(): bool;
        public debug(): bool;
        public warning(): bool;
        public error(): bool;
        public fatal(): bool;
        public log(s: string): void;
        public getCompilationSettings(): TypeScript.CompilationSettings;
        public getScriptCount(): number;
        public getScriptId(scriptIndex: number): string;
        public getScriptSourceText(scriptIndex: number, start: number, end: number): string;
        public getScriptSourceLength(scriptIndex: number): number;
        public getScriptIsResident(scriptIndex: number): bool;
        public getScriptVersion(scriptIndex: number): number;
        public getScriptEditRangeSinceVersion(scriptIndex: number, scriptVersion: number): TypeScript.ScriptEditRange;
    }
    function simpleForwardCall(logger: TypeScript.ILogger, actionDescription: string, action: () => any): any;
    function forwardCall(logger: TypeScript.ILogger, actionDescription: string, action: () => any, throwOnError?: bool): any;
    function forwardJSONCall(logger: TypeScript.ILogger, actionDescription: string, action: () => any): string;
    class LanguageServiceShim implements ILanguageServiceShim {
        public host: ILanguageServiceShimHost;
        public languageService: ILanguageService;
        public logger: TypeScript.ILogger;
        constructor(host: ILanguageServiceShimHost, languageService: ILanguageService);
        public forwardCall(actionDescription: string, action: () => any, throwOnError?: bool): any;
        public forwardJSONCall(actionDescription: string, action: () => any): string;
        public dispose(dummy: any): void;
        public refresh(throwOnError: bool): void;
        public getErrors(maxCount: number): string;
        public getScriptErrors(fileName: string, maxCount: number): string;
        public getTypeAtPosition(fileName: string, pos: number): string;
        public getNameOrDottedNameSpan(fileName: string, startPos: number, endPos: number): string;
        public getBreakpointStatementAtPosition(fileName: string, pos: number): string;
        public getSignatureAtPosition(fileName: string, pos: number): string;
        public getDefinitionAtPosition(fileName: string, pos: number): string;
        public getBraceMatchingAtPosition(fileName: string, pos: number): string;
        public getSmartIndentAtLineNumber(fileName: string, lineNumber: number, options: string): string;
        public getReferencesAtPosition(fileName: string, pos: number): string;
        public getOccurrencesAtPosition(fileName: string, pos: number): string;
        public getImplementorsAtPosition(fileName: string, pos: number): string;
        private _referencesToResult(entries);
        public getCompletionsAtPosition(fileName: string, pos: number, isMemberCompletion: bool): string;
        public getFormattingEditsForRange(fileName: string, minChar: number, limChar: number, options: string): string;
        public getFormattingEditsForDocument(fileName: string, minChar: number, limChar: number, options: string): string;
        public getFormattingEditsOnPaste(fileName: string, minChar: number, limChar: number, options: string): string;
        public getFormattingEditsAfterKeystroke(fileName: string, position: number, key: string, options: string): string;
        public getNavigateToItems(searchValue: string): string;
        public getScriptLexicalStructure(fileName: string): string;
        public getOutliningRegions(fileName: string): string;
        public logAST(fileName: string): void;
        public logSyntaxAST(fileName: string): void;
        public getEmitOutput(fileName: string): string;
        private _navigateToItemsToString(items);
    }
    class ClassifierShim {
        public host: IClassifierHost;
        public classifier: Classifier;
        constructor(host: IClassifierHost);
        public getClassificationsForLine(text: string, lexState: TypeScript.LexState): string;
    }
    class CoreServicesShim {
        public host: ICoreServicesHost;
        public logger: TypeScript.ILogger;
        public services: CoreServices;
        constructor(host: ICoreServicesHost);
        private forwardCall(actionDescription, action, throwOnError?);
        private forwardJSONCall(actionDescription, action);
        public getPreProcessedFileInfo(scriptId: string, sourceText: TypeScript.ISourceText): string;
        public getDefaultCompilationSettings(): string;
        public dumpMemory(dummy: any): string;
        public getMemoryInfo(dummy: any): string;
    }
}
module Services {
    function copyDataObject(dst: any, src: any): any;
    function compareDataObjects(dst: any, src: any): bool;
    class TypeScriptServicesFactory {
        public createLanguageService(host: ILanguageServiceHost): ILanguageService;
        public createLanguageServiceShim(host: ILanguageServiceShimHost): ILanguageServiceShim;
        public createClassifier(host: IClassifierHost): Classifier;
        public createClassifierShim(host: IClassifierHost): ClassifierShim;
        public createCoreServices(host: ICoreServicesHost): CoreServices;
        public createCoreServicesShim(host: ICoreServicesHost): CoreServicesShim;
    }
}
