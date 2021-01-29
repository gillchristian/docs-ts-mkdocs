---
title: core.ts
nav_order: 2
parent: Modules
---

## core overview

Added in v0.0.1

---

<h2 class="text-delta">Table of contents</h2>

- [utils](#utils)
  - [AppEff (interface)](#appeff-interface)
  - [Capabilities (interface)](#capabilities-interface)
  - [Context (interface)](#context-interface)
  - [Eff (interface)](#eff-interface)
  - [MonadFileSystem (interface)](#monadfilesystem-interface)
  - [MonadLog (interface)](#monadlog-interface)
  - [main](#main)

---

# utils

## AppEff (interface)

App effect

**Signature**

```ts
export interface AppEff<A> extends RTE.ReaderTaskEither<Context, string, A> {}
```

Added in v0.0.1

## Capabilities (interface)

**Signature**

```ts
export interface Capabilities extends MonadFileSystem, MonadLog {}
```

Added in v0.0.1

## Context (interface)

**Signature**

```ts
export interface Context {
  readonly C: Capabilities
}
```

Added in v0.0.1

## Eff (interface)

capabilities

**Signature**

```ts
export interface Eff<A> extends TE.TaskEither<string, A> {}
```

Added in v0.0.1

## MonadFileSystem (interface)

**Signature**

```ts
export interface MonadFileSystem {
  readonly getFilenames: (pattern: string) => Eff<string[]>
  readonly readFile: (path: string) => Eff<string>
  readonly writeFile: (path: string, content: string) => Eff<void>
  readonly rmFile: (path: string) => Eff<void>
  readonly existsFile: (path: string) => Eff<boolean>
  readonly isFile: (path: string) => Eff<boolean>
  readonly isDirectory: (path: string) => Eff<boolean>
}
```

Added in v0.0.1

## MonadLog (interface)

**Signature**

```ts
export interface MonadLog {
  readonly info: (message: string) => Eff<void>
  readonly log: (message: string) => Eff<void>
  readonly debug: (message: string) => Eff<void>
}
```

Added in v0.0.1

## main

Main

**Signature**

```ts
export declare const main: AppEff<void>
```

Added in v0.0.1
