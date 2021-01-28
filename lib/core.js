"use strict";
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
var __spreadArrays = (this && this.__spreadArrays) || function () {
    for (var s = 0, i = 0, il = arguments.length; i < il; i++) s += arguments[i].length;
    for (var r = Array(s), k = 0, i = 0; i < il; i++)
        for (var a = arguments[i], j = 0, jl = a.length; j < jl; j++, k++)
            r[k] = a[j];
    return r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.main = void 0;
/**
 * @since 0.0.1
 */
var path = require("path");
var A = require("fp-ts/Array");
var RTE = require("fp-ts/ReaderTaskEither");
var TE = require("fp-ts/TaskEither");
var Apply_1 = require("fp-ts/Apply");
var function_1 = require("fp-ts/lib/function");
var modulesToC = function (modules) {
    return __spreadArrays([
        '<h2 class="text-delta">Table of contents</h2>',
        ''
    ], modules.map(function (m) { return "- [" + path.basename(m) + "](/" + m.replace(/\.md$/, '') + ")"; })).join('\n')
        .trim();
};
var handleConfig = function (contents, modules) {
    var lines = contents.split('\n');
    var _a = lines.reduce(function (state, line) {
        switch (state.state) {
            case 'before': {
                if (line.trim() !== 'nav:') {
                    return __assign(__assign({}, state), { before: state.before.concat([line]) });
                }
                return __assign(__assign({}, state), { state: 'nav' });
            }
            case 'nav': {
                if (/^- /.test(line.trim()) || line.trim() === '') {
                    return state;
                }
                return __assign(__assign({}, state), { after: [line], state: 'after' });
            }
            case 'after': {
                return __assign(__assign({}, state), { after: state.after.concat([line]) });
            }
        }
    }, { before: [], after: [], state: 'before' }), before = _a.before, after = _a.after;
    return [
        before,
        __spreadArrays([
            'nav:',
            '  - Overview: index.md',
            '  - Modules:'
        ], modules.map(function (m) { return "    - '" + path.basename(m).replace(/\.md$/, '') + "': " + m; })),
        [''],
        after
    ]
        .map(function (ls) { return ls.join('\n'); })
        .join('\n')
        .trim();
};
var file = function (path, content, overwrite) { return ({
    path: path,
    content: content,
    overwrite: overwrite
}); };
var readFile = function (path, overwrite) {
    if (overwrite === void 0) { overwrite = false; }
    return function (_a) {
        var C = _a.C;
        return function_1.pipe(C.readFile(path), TE.map(function (content) { return file(path, content, overwrite); }));
    };
};
// const readFiles = (paths: string[]): AppEff<File[]> => A.array.traverse(RTE.readerTaskEither)(paths, readFile)
var writeFile = function (file) { return function (_a) {
    var C = _a.C;
    var overwrite = function_1.pipe(C.debug("Overwriting file " + file.path), TE.chain(function () { return C.writeFile(file.path, file.content); }));
    var skip = C.debug("File " + file.path + " already exists, skipping creation");
    var write = function_1.pipe(C.debug('Writing file ' + file.path), TE.chain(function () { return C.writeFile(file.path, file.content); }));
    return function_1.pipe(C.existsFile(file.path), TE.chain(function (exists) { return (exists ? (file.overwrite ? overwrite : skip) : write); }));
}; };
var writeFiles = function (files) {
    return function_1.pipe(A.array.traverse(RTE.readerTaskEither)(files, writeFile), RTE.map(function () { return undefined; }));
};
var mkDocsPath = path.resolve('mkdocs.yml');
var docsTsConfigPath = path.resolve('docs', '_config.yml');
var readConfig = readFile(mkDocsPath, true);
var removeDocsTsConfig = function (_a) {
    var C = _a.C;
    return C.rmFile(docsTsConfigPath);
};
var readModules = function (_a) {
    var C = _a.C;
    return function_1.pipe(C.getFilenames('./docs/modules/*.md'), TE.map(function (files) { return files.map(function (mdPath) { return path.relative(path.resolve('docs'), path.resolve(mdPath)); }); }));
};
var isIndexMd = function (path) { return path.endsWith('index.md'); };
var modulesIndex = function (toc) {
    return file(path.join('docs', 'modules', 'index.md'), "---\ntitle: Modules\nhas_children: true\n---\n\n" + toc + "\n", true);
};
/**
 * Main
 *
 * @since 0.0.1
 */
exports.main = function_1.pipe(removeDocsTsConfig, RTE.chain(function () { return Apply_1.sequenceS(RTE.readerTaskEither)({ modules: readModules, mkdocsConfig: readConfig }); }), RTE.chain(function (_a) {
    var modules = _a.modules, mkdocsConfig = _a.mkdocsConfig;
    var rest = function_1.pipe(modules, A.filter(function_1.not(isIndexMd)));
    return writeFiles([
        file(mkdocsConfig.path, handleConfig(mkdocsConfig.content, rest), true),
        modulesIndex(modulesToC(modules))
    ]);
}));
