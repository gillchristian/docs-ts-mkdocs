/**
 * @since 0.0.1
 */
import * as path from 'path'
import * as humanize from 'humanize-string'
import * as matter from 'gray-matter'
import * as A from 'fp-ts/Array'
import * as RTE from 'fp-ts/ReaderTaskEither'
import * as TE from 'fp-ts/TaskEither'
import * as Tree from 'fp-ts/Tree'
import * as Tuple from 'fp-ts/Tuple'
import * as Ord from 'fp-ts/Ord'
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
  readonly isFile: (path: string) => Eff<boolean>
  readonly isDirectory: (path: string) => Eff<boolean>
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

const toc = (title: string, modules: string[]): string =>
  [
    `<h2 class="text-delta">${title}</h2>`,
    '',
    ...modules.map((m) => {
      const label = dropFirstDir(relativeToDocs(m)).replace(/\.md$/, '')
      const path = relativeToDocs(m).replace(/\.md$/, '')

      return `- [${label}](/${path})`
    })
  ]
    .join('\n')
    .trim()

interface ParseState {
  before: string[]
  after: string[]
  state: 'before' | 'nav' | 'after'
}

const parseMkDocsConfig = (contents: string): {before: string; after: string} => {
  const {before, after} = contents.split('\n').reduce<ParseState>(
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

  return {before: before.join('\n'), after: after.join('\n')}
}

type NavSection =
  | {type: 'file'; title: string; path: string}
  | {type: 'dir'; title: string; contents: {title: string; path: string}[]}

const navSection = (nav: NavSection) =>
  nav.type === 'dir'
    ? [`  - '${nav.title}':`, ...nav.contents.map((i) => `    - '${i.title}': ${i.path}`)].join('\n')
    : `  - '${nav.title}': ${nav.path}`

const handleConfig = (contents: string, navSections: NavSection[]): string => {
  const {before, after} = parseMkDocsConfig(contents)

  return [before, 'nav:', ...navSections.map(navSection), '', after].join('\n').trim()
}

const mkNav = (dirs: DirRef[], files: FileRef[], modules: string[]): NavSection[] => {
  const navDirs = dirs.map(
    (dir): NavSection => ({
      type: 'dir',
      title: dir.title,
      contents: dir.contents.map((file) => ({title: file.title, path: relativeToDocs(file.path)}))
    })
  )

  const navFiles = files.map(
    (file): NavSection => ({
      type: 'file',
      title: file.title,
      path: relativeToDocs(file.path)
    })
  )

  return [
    {type: 'file', title: 'Overview', path: 'index.md'},
    {
      type: 'dir',
      title: 'Modules',
      contents: [
        {title: 'Modules', path: 'modules/index.md'},
        ...modules.map((m) => ({title: dropFirstDir(relativeToDocs(m)).replace(/\.md$/, ''), path: relativeToDocs(m)}))
      ]
    },
    ...navDirs,
    ...navFiles
  ]
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

const dirContents = (dir: string): AppEff<string[]> => ({C}) => C.getFilenames(path.join(...dir.split(path.sep), '*'))

interface Directory {
  path: string
  files: string[]
  dirs: string[]
}

type DirectoryTree = Tree.Tree<Directory>

const buildTree = Tree.unfoldTreeM(RTE.readerTaskEither)

const readDirectory = (initialDir: string): AppEff<DirectoryTree> =>
  buildTree(initialDir, (currentDir) =>
    pipe(
      dirContents(currentDir),
      RTE.chain(splitByDirsAndFiles),
      RTE.map((dsfs) => [{path: currentDir, ...dsfs}, dsfs.dirs])
    )
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

const splitByDirsAndFiles = (paths: string[]): AppEff<{dirs: string[]; files: string[]}> => ({C}) =>
  pipe(
    A.array.traverse(TE.taskEither)(paths, C.isDirectory),
    TE.map(A.zip(paths)),
    TE.map((pairs) => ({
      dirs: pairs.filter(Tuple.fst).map(Tuple.snd),
      files: pairs.filter(not(Tuple.fst)).map(Tuple.snd)
    }))
  )

const mdFileTitle = (file: string): AppEff<string> =>
  pipe(
    readFile(file, false),
    RTE.map(matter),
    RTE.map((md) => md.data.title || path.basename(file))
  )

const mdFilesTitles = (files: string[]): AppEff<string[]> => A.array.traverse(RTE.readerTaskEither)(files, mdFileTitle)

const mkDocsPath = path.resolve('mkdocs.yml')
const docsTsConfigPath = path.resolve('docs', '_config.yml')

const readConfig: AppEff<File> = readFile(mkDocsPath, true)

const removeDocsTsConfig: AppEff<void> = ({C}) => C.rmFile(docsTsConfigPath)

const readAllMdFiles = (dir: string): AppEff<string[]> => ({C}: Context) =>
  C.getFilenames(path.join('docs', ...relativeToDocs(dir).split(path.sep), '**', '*.md'))

const readOthers: AppEff<string[]> = ({C}: Context) =>
  pipe(C.getFilenames('./docs/*'), TE.map(A.filter((m) => !m.endsWith('index.md') && !m.endsWith('modules'))))

const isIndexMd = (path: string) => path.endsWith('index.md')

const relativeToDocs = (file: string) => path.relative(path.resolve('docs'), path.resolve(file))

const mkDirectoryIndexMD = (dir: string, contents: string): File =>
  file(
    path.join(dir, 'index.md'),
    `---
title: Modules
has_children: true
---

${contents}
`,
    true
  )

const modulesIndex = ({toc, allModules}: {toc: string; allModules: string}) =>
  mkDirectoryIndexMD(path.join('docs', 'modules'), `${toc}\n\n${allModules}`)

interface FileRef {
  title: string
  path: string
}

interface DirRef {
  title: string
  contents: FileRef[]
}

const ordByTitle = <A extends {title: string}>() => Ord.contramap(({title}: A) => title)(Ord.ordString)

const mdFilesRefs = (files: string[]): AppEff<FileRef[]> =>
  pipe(
    mdFilesTitles(files),
    RTE.map((titles) => A.zipWith(files, titles, (path, title) => ({title, path}))),
    RTE.map((v) => v),
    RTE.map(A.sort(ordByTitle<FileRef>()))
  )

const dirRef = (dir: string): AppEff<DirRef> =>
  pipe(
    readAllMdFiles(dir),
    RTE.chain(mdFilesRefs),
    RTE.map((contents) => ({title: humanize(path.basename(dir)), contents}))
  )

const dirsRefs = (dirs: string[]): AppEff<DirRef[]> =>
  pipe(A.array.traverse(RTE.readerTaskEither)(dirs, dirRef), RTE.map(A.sort(ordByTitle<DirRef>())))

const createDirectoryIndex = (dir: Directory): AppEff<void> =>
  writeFile(mkDirectoryIndexMD(dir.path, toc('Table of contents', [...dir.dirs, ...dir.files])))

/**
 * Main
 *
 * @since 0.0.1
 */
export const main: AppEff<void> = pipe(
  removeDocsTsConfig,
  RTE.chain(() =>
    sequenceS(RTE.readerTaskEither)({
      mkdocsConfig: readConfig,
      others: pipe(
        readOthers,
        RTE.chain(splitByDirsAndFiles),
        RTE.chain(({dirs, files}) => sequenceS(RTE.readerTaskEither)({dirs: dirsRefs(dirs), files: mdFilesRefs(files)}))
      ),
      modulesDirectory: pipe(
        readDirectory('docs/modules'),
        RTE.chainFirst((modulesDirectory) =>
          Tree.tree.traverse(RTE.readerTaskEither)(modulesDirectory, createDirectoryIndex)
        )
      )
    })
  ),
  RTE.chain(({mkdocsConfig, others, modulesDirectory}) => {
    const allModules = pipe(
      modulesDirectory,
      Tree.foldMap(A.getMonoid<string>())((dir) => dir.files)
    )

    const root = Tree.extract(modulesDirectory)
    const modules = [...root.dirs, ...root.files]

    const rest = pipe(modules, A.filter(not(isIndexMd)))
    const nav = mkNav(others.dirs, others.files, rest)

    const mkDocsConfigNew = file(mkdocsConfig.path, handleConfig(mkdocsConfig.content, nav), true)

    const newModulesIndex = modulesIndex({
      toc: toc('Table of contents', rest),
      allModules: toc('All modules', allModules)
    })

    return writeFiles([mkDocsConfigNew, newModulesIndex])
  })
)
