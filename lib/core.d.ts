import * as RTE from 'fp-ts/ReaderTaskEither';
import * as TE from 'fp-ts/TaskEither';
/**
 * capabilities
 *
 * @since 0.0.1
 */
export interface Eff<A> extends TE.TaskEither<string, A> {
}
/**
 * @since 0.0.1
 */
export interface MonadFileSystem {
    readonly getFilenames: (pattern: string) => Eff<string[]>;
    readonly readFile: (path: string) => Eff<string>;
    readonly writeFile: (path: string, content: string) => Eff<void>;
    readonly rmFile: (path: string) => Eff<void>;
    readonly existsFile: (path: string) => Eff<boolean>;
    readonly isFile: (path: string) => Eff<boolean>;
    readonly isDirectory: (path: string) => Eff<boolean>;
}
/**
 * @since 0.0.1
 */
export interface MonadLog {
    readonly info: (message: string) => Eff<void>;
    readonly log: (message: string) => Eff<void>;
    readonly debug: (message: string) => Eff<void>;
}
/**
 * @since 0.0.1
 */
export interface Capabilities extends MonadFileSystem, MonadLog {
}
/**
 * @since 0.0.1
 */
export interface Context {
    readonly C: Capabilities;
}
/**
 * App effect
 *
 * @since 0.0.1
 */
export interface AppEff<A> extends RTE.ReaderTaskEither<Context, string, A> {
}
/**
 * Main
 *
 * @since 0.0.1
 */
export declare const main: AppEff<void>;
