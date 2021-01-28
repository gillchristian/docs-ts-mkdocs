"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.main = void 0;
/**
 * @since 0.0.1
 */
var glob = require("glob");
var fs = require("fs");
var chalk = require("chalk");
var IO = require("fp-ts/IO");
var IOEither = require("fp-ts/IOEither");
var T = require("fp-ts/Task");
var TE = require("fp-ts/TaskEither");
var function_1 = require("fp-ts/lib/function");
var Console_1 = require("fp-ts/lib/Console");
var docs_ts_extra_1 = require("docs-ts-extra");
var readFile = function (path) {
    return IOEither.tryCatch(function () { return fs.readFileSync(path, { encoding: 'utf8' }); }, function (err) { return (err instanceof Error ? err.message : "Could not read " + path); });
};
var writeFile = function (path, content) {
    return IOEither.tryCatch(function () { return fs.writeFileSync(path, content, { encoding: 'utf8' }); }, function (err) { return (err instanceof Error ? err.message : "Could not write " + path); });
};
var rmFile = function (path) {
    return IOEither.tryCatch(function () { return fs.rmSync(path); }, function (err) { return (err instanceof Error ? err.message : "Could not remove " + path); });
};
var core = require("./core");
var capabilities = {
    getFilenames: function (pattern) { return TE.rightIO(function () { return glob.sync(pattern); }); },
    readFile: function (path) { return TE.fromIOEither(readFile(path)); },
    writeFile: function (path, content) { return TE.fromIOEither(writeFile(path, content)); },
    existsFile: function (path) { return TE.rightIO(function () { return fs.existsSync(path); }); },
    rmFile: function (path) { return TE.fromIOEither(rmFile(path)); },
    info: function (message) { return TE.rightIO(Console_1.log(chalk.bold.magenta(message))); },
    log: function (message) { return TE.rightIO(Console_1.log(chalk.cyan(message))); },
    debug: function (message) { return TE.rightIO(Console_1.log(chalk.gray(message))); }
};
var exit = function (code) { return function () { return process.exit(code); }; };
var onLeft = function (e) {
    return T.fromIO(function_1.pipe(Console_1.log(chalk.bold.red(e)), IO.chain(function () { return exit(1); })));
};
var onRight = T.fromIO(Console_1.log(chalk.bold.green('MkDocs config generated succesfully!')));
/**
 * @since 0.0.1
 */
exports.main = function_1.pipe(docs_ts_extra_1.main, T.chain(function () {
    return function_1.pipe(core.main, function (runReader) { return runReader({ C: capabilities }); }, TE.fold(onLeft, function () { return onRight; }));
}));
