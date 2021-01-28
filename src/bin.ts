/**
 * @since 0.0.1
 */
import { main } from "./index";
import * as chalk from "chalk";

main().catch((e) => console.log(chalk.bold.red(`Unexpected error: ${e}`)));
