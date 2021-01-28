/**
 * @since 0.0.1
 */
import * as path from 'path'
import * as A from 'fp-ts/Array'
import * as RTE from 'fp-ts/ReaderTaskEither'
import * as TE from 'fp-ts/TaskEither'
import {sequenceS} from 'fp-ts/Apply'
import {pipe, not} from 'fp-ts/lib/function'

/**
 * capabilities
 *
 * @since 0.0.1
 */
export interface Eff<A> extends TE.TaskEither<string, A> {}

/**
 * @since 0.0.1
 */
export interface MonadFileSystem {
  readonly getFilenames: (pattern: string) => Eff<string[]>
  readonly readFile: (path: string) => Eff<string>
  readonly writeFile: (path: string, content: string) => Eff<void>
  readonly rmFile: (path: string) => Eff<void>
  readonly existsFile: (path: string) => Eff<boolean>
}

/**
 * @since 0.0.1
 */
export interface MonadLog {
  readonly info: (message: string) => Eff<void>
  readonly log: (message: string) => Eff<void>
  readonly debug: (message: string) => Eff<void>
}

/**
 * @since 0.0.1
 */
export interface Capabilities extends MonadFileSystem, MonadLog {}

/**
 * @since 0.0.1
 */
export interface Context {
  readonly C: Capabilities
}

/**
 * App effect
 *
 * @since 0.0.1
 */
export interface AppEff<A> extends RTE.ReaderTaskEither<Context, string, A> {}

const dropFirstDir = (p: string): string => {
  const [dir, ...rest] = p.split(path.sep).filter(Boolean)

  return A.isEmpty(rest) ? dir : rest.join(path.sep)
}

const modulesToC = (modules: string[]): string => {
  return [
    '<h2 class="text-delta">Table of contents</h2>',
    '',
    ...modules.map((m) => `- [${dropFirstDir(m)}](/${m.replace(/\.md$/, '')})`)
  ]
    .join('\n')
    .trim()
}

const handleConfig = (contents: string, modules: string[]): string => {
  const lines = contents.split('\n')

  interface ParseState {
    before: string[]
    after: string[]
    state: 'before' | 'nav' | 'after'
  }

  const {before, after} = lines.reduce<ParseState>(
    (state, line) => {
      switch (state.state) {
        case 'before': {
          if (line.trim() !== 'nav:') {
            return {...state, before: state.before.concat([line])}
          }

          return {...state, state: 'nav'}
        }

        case 'nav': {
          if (/^- /.test(line.trim()) || line.trim() === '') {
            return state
          }

          return {...state, after: [line], state: 'after'}
        }

        case 'after': {
          return {...state, after: state.after.concat([line])}
        }
      }
    },
    {before: [], after: [], state: 'before'}
  )

  return [
    before,
    [
      'nav:',
      '  - Overview: index.md',
      '  - Modules:',
      ...modules.map((m) => `    - '${dropFirstDir(m).replace(/\.md$/, '')}': ${m}`)
    ],
    [''],
    after
  ]
    .map((ls) => ls.join('\n'))
    .join('\n')
    .trim()
}

interface File {
  readonly path: string
  readonly content: string
  readonly overwrite: boolean
}

const file = (path: string, content: string, overwrite: boolean): File => ({
  path,
  content,
  overwrite
})

const readFile = (path: string, overwrite = false): AppEff<File> => ({C}) =>
  pipe(
    C.readFile(path),
    TE.map((content) => file(path, content, overwrite))
  )

// const readFiles = (paths: string[]): AppEff<File[]> => A.array.traverse(RTE.readerTaskEither)(paths, readFile)

const writeFile = (file: File): AppEff<void> => ({C}) => {
  const overwrite = pipe(
    C.debug(`Overwriting file ${file.path}`),
    TE.chain(() => C.writeFile(file.path, file.content))
  )

  const skip = C.debug(`File ${file.path} already exists, skipping creation`)

  const write = pipe(
    C.debug('Writing file ' + file.path),
    TE.chain(() => C.writeFile(file.path, file.content))
  )

  return pipe(
    C.existsFile(file.path),
    TE.chain((exists) => (exists ? (file.overwrite ? overwrite : skip) : write))
  )
}

const writeFiles = (files: File[]): AppEff<void> =>
  pipe(
    A.array.traverse(RTE.readerTaskEither)(files, writeFile),
    RTE.map(() => undefined)
  )

const mkDocsPath = path.resolve('mkdocs.yml')
const docsTsConfigPath = path.resolve('docs', '_config.yml')

const readConfig: AppEff<File> = readFile(mkDocsPath, true)

const removeDocsTsConfig: AppEff<void> = ({C}) => C.rmFile(docsTsConfigPath)

const readModules: AppEff<string[]> = ({C}: Context) =>
  pipe(
    C.getFilenames('./docs/modules/**/*.md'),
    TE.map((files) => files.map((mdPath) => path.relative(path.resolve('docs'), path.resolve(mdPath))))
  )

const isIndexMd = (path: string) => path.endsWith('index.md')

const modulesIndex = (toc: string): File =>
  file(
    path.join('docs', 'modules', 'index.md'),
    `---
title: Modules
has_children: true
---

${toc}
`,
    true
  )

/**
 * Main
 *
 * @since 0.0.1
 */
export const main: AppEff<void> = pipe(
  removeDocsTsConfig,
  RTE.chain(() => sequenceS(RTE.readerTaskEither)({modules: readModules, mkdocsConfig: readConfig})),
  RTE.chain(({modules, mkdocsConfig}) => {
    const rest = pipe(modules, A.filter(not(isIndexMd)))

    return writeFiles([
      file(mkdocsConfig.path, handleConfig(mkdocsConfig.content, rest), true),
      modulesIndex(modulesToC(modules))
    ])
  })
)
