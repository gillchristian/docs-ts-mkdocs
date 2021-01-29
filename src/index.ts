/**
 * @since 0.0.1
 */
import * as glob from 'glob'
import * as fs from 'fs'
import * as chalk from 'chalk'
import * as IO from 'fp-ts/IO'
import * as IOEither from 'fp-ts/IOEither'
import * as T from 'fp-ts/Task'
import * as TE from 'fp-ts/TaskEither'
import {pipe} from 'fp-ts/lib/function'
import {log} from 'fp-ts/lib/Console'
import {main as docsTsMain} from 'docs-ts-extra'

import * as core from './core'

const readFile = (path: string) =>
  IOEither.tryCatch(
    () => fs.readFileSync(path, {encoding: 'utf8'}),
    (err) => (err instanceof Error ? err.message : `Could not read ${path}`)
  )

const writeFile = (path: string, content: string) =>
  IOEither.tryCatch(
    () => fs.writeFileSync(path, content, {encoding: 'utf8'}),
    (err) => (err instanceof Error ? err.message : `Could not write ${path}`)
  )

const rmFile = (path: string) =>
  IOEither.tryCatch(
    () => fs.rmSync(path),
    (err) => (err instanceof Error ? err.message : `Could not remove ${path}`)
  )

const lStatSync = (path: string) =>
  IOEither.tryCatch(
    () => fs.lstatSync(path),
    (err) => (err instanceof Error ? err.message : `Could not check ${path} stat`)
  )

const capabilities: core.Capabilities = {
  getFilenames: (pattern: string) => TE.rightIO(() => glob.sync(pattern)),
  readFile: (path: string) => TE.fromIOEither(readFile(path)),
  writeFile: (path: string, content: string) => TE.fromIOEither(writeFile(path, content)),
  existsFile: (path: string) => TE.rightIO(() => fs.existsSync(path)),
  rmFile: (path: string) => TE.fromIOEither(rmFile(path)),
  isDirectory: (path: string) =>
    pipe(
      lStatSync(path),
      TE.fromIOEither,
      TE.map((stat) => stat.isDirectory())
    ),
  isFile: (path: string) =>
    pipe(
      lStatSync(path),
      TE.fromIOEither,
      TE.map((stat) => stat.isFile())
    ),
  info: (message: string) => TE.rightIO(log(chalk.bold.magenta(message))),
  log: (message: string) => TE.rightIO(log(chalk.cyan(message))),
  debug: (message: string) => TE.rightIO(log(chalk.gray(message)))
}

const exit = (code: 0 | 1): IO.IO<void> => () => process.exit(code)

const onLeft = (e: string): T.Task<void> =>
  T.fromIO(
    pipe(
      log(chalk.bold.red(e)),
      IO.chain(() => exit(1))
    )
  )

const onRight: T.Task<void> = T.fromIO(log(chalk.bold.green('MkDocs config generated succesfully!')))

/**
 * @since 0.0.1
 */
export const main = pipe(
  docsTsMain,
  T.chain(() =>
    pipe(
      core.main,
      (runReader) => runReader({C: capabilities}),
      TE.fold(onLeft, () => onRight)
    )
  )
)
