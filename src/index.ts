/**
 * @since 0.0.1
 */
import { main } from "docs-ts-extra";
import * as T from "fp-ts/Task";
import * as chalk from "chalk";
import * as yaml from "js-yaml";
import { pipe } from "fp-ts/lib/function";
import * as glob from "glob";
import * as path from "path";
import * as fs from "fs";

const mkConfig = (modules: string[]) => ({
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
});

const main2 = pipe(
  main,
  T.chain(() => {
    const modules = glob
      .sync("./docs/modules/**/*.md")
      .map((mdPath) =>
        path.relative(path.resolve("docs"), path.resolve(mdPath))
      );

    const config = mkConfig(modules);

    fs.rmSync(path.resolve("docs", "_config.yml"));

    fs.writeFileSync(
      path.resolve("docs", "mkdocs.yml"),
      yaml.dump(config),
      "utf8"
    );

    console.log(chalk.bold.green("MkDocs config generated succesfully!"));

    return T.of(undefined);
  })
);

main2().catch((e) => console.log(chalk.bold.red(`Unexpected error: ${e}`)));
