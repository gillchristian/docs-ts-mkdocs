/**
 * @since 0.0.1
 */
import * as path from 'path'
// import * as A from 'fp-ts/Array'
import * as RTE from 'fp-ts/ReaderTaskEither'
import * as TE from 'fp-ts/TaskEither'
import {sequenceS} from 'fp-ts/Apply'
import {pipe} from 'fp-ts/lib/function'

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

  return [before, ['nav:'].concat(modules.map((m) => `  - ${m}`)), [''], after]
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

// const writeFiles = (files: File[]): AppEff<void> =>
//   pipe(
//     A.array.traverse(RTE.readerTaskEither)(files, writeFile),
//     RTE.map(() => undefined)
//   )

const mkDocsPath = path.resolve('mkdocs.yml')
const docsTsConfigPath = path.resolve('docs', '_config.yml')

const readConfig: AppEff<File> = readFile(mkDocsPath, true)

const removeDocsTsConfig: AppEff<void> = ({C}) => C.rmFile(docsTsConfigPath)

const readModules: AppEff<string[]> = ({C}: Context) =>
  pipe(
    C.getFilenames('./docs/modules/**/*.md'),
    TE.map((files) => files.map((mdPath) => path.relative(path.resolve('docs'), path.resolve(mdPath))))
  )

/**
 * Main
 *
 * @since 0.0.1
 */
export const main: AppEff<void> = pipe(
  removeDocsTsConfig,
  // { module: AppEff<string[]>, mkdocsConfig: AppEff<File> } => AppEff<{ module: string[], mkdocsConfig: File }>
  RTE.chain(() => sequenceS(RTE.readerTaskEither)({modules: readModules, mkdocsConfig: readConfig})),
  RTE.chain(({modules, mkdocsConfig}) =>
    writeFile(file(mkdocsConfig.path, handleConfig(mkdocsConfig.content, modules), true))
  )
)
