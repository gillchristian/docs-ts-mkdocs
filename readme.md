# docs-ts-mkdocs

A wrapper to [docs-ts](https://github.com/gcanti/docs-ts) that adds support for
[MkDocs](https://www.mkdocs.org/).

## Rationale & How It Works

[docs-ts](https://github.com/gcanti/docs-ts) output is meant to be deployed with
[GitHub Pages](https://pages.github.com/) (using [Jekyll](https://jekyllrb.com/)
under the hood).

`docs-ts-mkdocs` runs `docs-ts` to generate the docs and then it adds a `nav:`
section to `mkdocs.yml` based on the generated `docs/` directory.

All the directories and markdown files in `docs/` are added to the main
navigation. And the `docs/modules` is treversed adding `index.md` files on every
directory with a table of contents of the directory files.

## Install and use

```
yarn add docs-ts-mkdocs
```

```
yarn docs-ts-mkdocs
```

See [docs-ts](https://github.com/gcanti/docs-ts) on how to configure.

NOTES: for now the `outDir` is expected to be `docs/` (the default one).
