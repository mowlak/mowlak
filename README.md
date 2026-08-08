# Mowlak

A calm speech-learning app for toddlers and their parents. Free, no ads,
no tracking. Polish teaching content; Polish and English interface.

The name: _niemowlak_ is Polish for an infant — literally "the one who
does not yet speak". Drop the negation and a _mowlak_ is the one who
starts to.

Status: early scaffold. The site is a fully static SvelteKit build —
a product landing at the root and the app under `/app`.

## Development

```sh
npm ci
npm run dev
```

`npm run build` produces the static site; `npm run check` type-checks.
`npm run lint` checks formatting, code and styles, and `npm run format`
rewrites the tree to match. `npm test` validates the content, runs the unit
tests, and then the browser tests, which build the static site and drive the
result, so they exercise what actually ships rather than a development
server.

Teaching content is not code and lives in its own repository:
[mowlak-content](https://github.com/mowlak/mowlak-content), consumed here
as a git submodule mounted at `content/` — clone with
`git clone --recurse-submodules`, or run `git submodule update --init`
in an existing checkout. Every commit of this repository pins the exact
content it builds against. The packs under `content/packs/` are the
source of truth — one JSON file per language and category, beside the
images and recordings it names. `npm run validate` checks them, and CI
runs it too, so a broken pack cannot ship: every card names the published
work its onomatopoeia comes from, every path resolves, and no image or
recording is left unused. Development and build runs mirror the packs
into `static/content/` first, from where the site serves them at
`/content/`. See [content/README.md](content/README.md) for the schema.

## Interface languages

Interface strings live in `src/lib/i18n`: one `Strings` interface and one
table per language, both declaring it. Adding a string means adding it to
every table, because a missing translation fails the type check rather
than falling back to another language at runtime. Teaching content is not
part of this layer.

## Licensing

- **Code**: [AGPL-3.0-only](LICENSE).
- **Content packs** (word lists, images, audio): [CC BY-NC-SA
  4.0](content/LICENSE) as compilations, with an additional permission
  for individual use in professional speech-therapy practice and
  classrooms — see [content/README.md](content/README.md).
- The **Mowlak name and logo** are excluded from both licenses and may
  not be used to identify derivative products.
