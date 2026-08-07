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
rewrites the tree to match. `npm test` runs the unit tests and then the
browser tests, which build the static site and drive the result, so they
exercise what actually ships rather than a development server.

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
