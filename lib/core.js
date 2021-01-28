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
Object.defineProperty(exports, "__esModule", { value: true });
exports.main = void 0;
/**
 * @since 0.0.1
 */
var path = require("path");
// import * as A from 'fp-ts/Array'
var RTE = require("fp-ts/ReaderTaskEither");
var TE = require("fp-ts/TaskEither");
var Apply_1 = require("fp-ts/Apply");
var function_1 = require("fp-ts/lib/function");
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
    return [before, ['nav:'].concat(modules.map(function (m) { return "  - " + m; })), [''], after]
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
// const writeFiles = (files: File[]): AppEff<void> =>
//   pipe(
//     A.array.traverse(RTE.readerTaskEither)(files, writeFile),
//     RTE.map(() => undefined)
//   )
var mkDocsPath = path.resolve('mkdocs.yml');
var docsTsConfigPath = path.resolve('docs', '_config.yml');
var readConfig = readFile(mkDocsPath, true);
var removeDocsTsConfig = function (_a) {
    var C = _a.C;
    return C.rmFile(docsTsConfigPath);
};
var readModules = function (_a) {
    var C = _a.C;
    return function_1.pipe(C.getFilenames('./docs/modules/**/*.md'), TE.map(function (files) { return files.map(function (mdPath) { return path.relative(path.resolve('docs'), path.resolve(mdPath)); }); }));
};
/**
 * Main
 *
 * @since 0.0.1
 */
exports.main = function_1.pipe(removeDocsTsConfig, 
// { module: AppEff<string[]>, mkdocsConfig: AppEff<File> } => AppEff<{ module: string[], mkdocsConfig: File }>
RTE.chain(function () { return Apply_1.sequenceS(RTE.readerTaskEither)({ modules: readModules, mkdocsConfig: readConfig }); }), RTE.chain(function (_a) {
    var modules = _a.modules, mkdocsConfig = _a.mkdocsConfig;
    return writeFile(file(mkdocsConfig.path, handleConfig(mkdocsConfig.content, modules), true));
}));
