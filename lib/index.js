"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.main = void 0;
/**
 * @since 0.0.1
 */
var docs_ts_extra_1 = require("docs-ts-extra");
var T = require("fp-ts/Task");
var chalk = require("chalk");
var yaml = require("js-yaml");
var function_1 = require("fp-ts/lib/function");
var glob = require("glob");
var path = require("path");
var fs = require("fs");
var mkConfig = function (modules) { return ({
    site_name: "projects/cw-foo",
    theme: {
        name: "material",
        palette: { scheme: "default", primary: "white" },
        features: ["navigation.tabs"],
    },
    nav: {
        Overview: "index.md",
        Modules: modules,
    },
}); };
/**
 * @since 0.0.1
 */
exports.main = function_1.pipe(docs_ts_extra_1.main, T.chain(function () {
    var modules = glob
        .sync("./docs/modules/**/*.md")
        .map(function (mdPath) {
        return path.relative(path.resolve("docs"), path.resolve(mdPath));
    });
    var config = mkConfig(modules);
    fs.rmSync(path.resolve("docs", "_config.yml"));
    fs.writeFileSync(path.resolve("docs", "mkdocs.yml"), yaml.dump(config), "utf8");
    console.log(chalk.bold.green("MkDocs config generated succesfully!"));
    return T.of(undefined);
}));
