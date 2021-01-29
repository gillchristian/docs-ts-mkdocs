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
var humanize = require("humanize-string");
var matter = require("gray-matter");
var A = require("fp-ts/Array");
var RTE = require("fp-ts/ReaderTaskEither");
var TE = require("fp-ts/TaskEither");
var Tree = require("fp-ts/Tree");
var Tuple = require("fp-ts/Tuple");
var Ord = require("fp-ts/Ord");
var Apply_1 = require("fp-ts/Apply");
var function_1 = require("fp-ts/lib/function");
var dropFirstDir = function (p) {
    var _a = p.split(path.sep).filter(Boolean), dir = _a[0], rest = _a.slice(1);
    return A.isEmpty(rest) ? dir : rest.join(path.sep);
};
var toc = function (title, modules) {
    return __spreadArrays([
        "<h2 class=\"text-delta\">" + title + "</h2>",
        ''
    ], modules.map(function (m) { return "- [" + dropFirstDir(relativeToDocs(m)).replace(/\.md$/, '') + "](/" + m.replace(/\.md$/, '') + ")"; })).join('\n')
        .trim();
};
var parseMkDocsConfig = function (contents) {
    var _a = contents.split('\n').reduce(function (state, line) {
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
    return { before: before.join('\n'), after: after.join('\n') };
};
var navSection = function (nav) {
    return nav.type === 'dir'
        ? __spreadArrays(["  - '" + nav.title + "':"], nav.contents.map(function (i) { return "    - '" + i.title + "': " + i.path; })).join('\n')
        : "  - '" + nav.title + "': " + nav.path;
};
var handleConfig = function (contents, navSections) {
    var _a = parseMkDocsConfig(contents), before = _a.before, after = _a.after;
    return __spreadArrays([before, 'nav:'], navSections.map(navSection), ['', after]).join('\n')
        .trim();
};
var mkNav = function (dirs, files, modules) {
    var navDirs = dirs.map(function (dir) { return ({
        type: 'dir',
        title: dir.title,
        contents: dir.contents.map(function (file) { return ({ title: file.title, path: relativeToDocs(file.path) }); })
    }); });
    var navFiles = files.map(function (file) { return ({
        type: 'file',
        title: file.title,
        path: relativeToDocs(file.path)
    }); });
    return __spreadArrays([
        { type: 'file', title: 'Overview', path: 'index.md' },
        {
            type: 'dir',
            title: 'Modules',
            contents: __spreadArrays([
                { title: 'Modules', path: 'docs/modules/index.md' }
            ], modules.map(function (m) { return ({ title: dropFirstDir(m).replace(/\.md$/, ''), path: m }); }))
        }
    ], navDirs, navFiles);
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
var dirContents = function (dir) { return function (_a) {
    var C = _a.C;
    return C.getFilenames(path.join.apply(path, __spreadArrays(dir.split(path.sep), ['*'])));
}; };
var buildTree = Tree.unfoldTreeM(RTE.readerTaskEither);
var readDirectory = function (initialDir) {
    return buildTree(initialDir, function (currentDir) {
        return function_1.pipe(dirContents(currentDir), RTE.chain(splitByDirsAndFiles), RTE.map(function (dsfs) { return [__assign({ path: currentDir }, dsfs), dsfs.dirs]; }));
    });
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
var splitByDirsAndFiles = function (paths) { return function (_a) {
    var C = _a.C;
    return function_1.pipe(A.array.traverse(TE.taskEither)(paths, C.isDirectory), TE.map(A.zip(paths)), TE.map(function (pairs) { return ({
        dirs: pairs.filter(Tuple.fst).map(Tuple.snd),
        files: pairs.filter(function_1.not(Tuple.fst)).map(Tuple.snd)
    }); }));
}; };
var mdFileTitle = function (file) {
    return function_1.pipe(readFile(file, false), RTE.map(matter), RTE.map(function (md) { return md.data.title || path.basename(file); }));
};
var mdFilesTitles = function (files) { return A.array.traverse(RTE.readerTaskEither)(files, mdFileTitle); };
var mkDocsPath = path.resolve('mkdocs.yml');
var docsTsConfigPath = path.resolve('docs', '_config.yml');
var readConfig = readFile(mkDocsPath, true);
var removeDocsTsConfig = function (_a) {
    var C = _a.C;
    return C.rmFile(docsTsConfigPath);
};
var readAllMdFiles = function (dir) { return function (_a) {
    var C = _a.C;
    return C.getFilenames(path.join.apply(path, __spreadArrays(['docs'], relativeToDocs(dir).split(path.sep), ['**', '*.md'])));
}; };
var readOthers = function (_a) {
    var C = _a.C;
    return function_1.pipe(C.getFilenames('./docs/*'), TE.map(A.filter(function (m) { return !m.endsWith('index.md') && !m.endsWith('modules'); })));
};
var isIndexMd = function (path) { return path.endsWith('index.md'); };
var relativeToDocs = function (file) { return path.relative(path.resolve('docs'), path.resolve(file)); };
var mkDirectoryIndexMD = function (dir, contents) {
    return file(path.join(dir, 'index.md'), "---\ntitle: Modules\nhas_children: true\n---\n\n" + contents + "\n", true);
};
var modulesIndex = function (_a) {
    var toc = _a.toc, allModules = _a.allModules;
    return mkDirectoryIndexMD(path.join('docs', 'modules'), toc + "\n\n" + allModules);
};
var ordByTitle = function () { return Ord.contramap(function (_a) {
    var title = _a.title;
    return title;
})(Ord.ordString); };
var mdFilesRefs = function (files) {
    return function_1.pipe(mdFilesTitles(files), RTE.map(function (titles) { return A.zipWith(files, titles, function (path, title) { return ({ title: title, path: path }); }); }), RTE.map(function (v) { return v; }), RTE.map(A.sort(ordByTitle())));
};
var dirRef = function (dir) {
    return function_1.pipe(readAllMdFiles(dir), RTE.chain(mdFilesRefs), RTE.map(function (contents) { return ({ title: humanize(path.basename(dir)), contents: contents }); }));
};
var dirsRefs = function (dirs) {
    return function_1.pipe(A.array.traverse(RTE.readerTaskEither)(dirs, dirRef), RTE.map(A.sort(ordByTitle())));
};
var createDirectoryIndex = function (dir) {
    return writeFile(mkDirectoryIndexMD(dir.path, toc('Table of contents', __spreadArrays(dir.dirs, dir.files))));
};
/**
 * Main
 *
 * @since 0.0.1
 */
exports.main = function_1.pipe(removeDocsTsConfig, RTE.chain(function () {
    return Apply_1.sequenceS(RTE.readerTaskEither)({
        mkdocsConfig: readConfig,
        others: function_1.pipe(readOthers, RTE.chain(splitByDirsAndFiles), RTE.chain(function (_a) {
            var dirs = _a.dirs, files = _a.files;
            return Apply_1.sequenceS(RTE.readerTaskEither)({ dirs: dirsRefs(dirs), files: mdFilesRefs(files) });
        })),
        modulesDirectory: function_1.pipe(readDirectory('docs/modules'), RTE.chainFirst(function (modulesDirectory) {
            return Tree.tree.traverse(RTE.readerTaskEither)(modulesDirectory, createDirectoryIndex);
        }))
    });
}), RTE.chain(function (_a) {
    var mkdocsConfig = _a.mkdocsConfig, others = _a.others, modulesDirectory = _a.modulesDirectory;
    var allModules = function_1.pipe(modulesDirectory, Tree.foldMap(A.getMonoid())(function (dir) { return dir.files; }));
    var root = Tree.extract(modulesDirectory);
    var modules = __spreadArrays(root.dirs, root.files);
    var rest = function_1.pipe(modules, A.filter(function_1.not(isIndexMd)));
    var nav = mkNav(others.dirs, others.files, rest);
    var mkDocsConfigNew = file(mkdocsConfig.path, handleConfig(mkdocsConfig.content, nav), true);
    var newModulesIndex = modulesIndex({
        toc: toc('Table of contents', rest),
        allModules: toc('All modules', allModules)
    });
    return writeFiles([mkDocsConfigNew, newModulesIndex]);
}));
