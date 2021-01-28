"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * @since 0.0.1
 */
var index_1 = require("./index");
var chalk = require("chalk");
index_1.main().catch(function (e) { return console.log(chalk.bold.red("Unexpected error: " + e)); });
