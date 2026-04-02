# Contributing

## Naming Rules

- Variables, functions, and explicitly named database fields or tables should use `camelCase`.
- Types, interfaces, Prisma models, and other type-like constructs should use `PascalCase`.
- Use `trusted` terminology only on the server side.
- Do not use `trusted` in client-side code or any client-visible field, label, prop, form field, or payload name.
- Prefer neutral client-facing names like `movieTitle`, `movieId`, `selectedMovieId`, or `submittedMovieId`.
- Reserve `trusted` for server-validated values that have been checked against the source of truth.

## Pre-commit Checks

- Normal local editing uses `npm run check`, which follows [biome.jsonc](e:/work/moviefax/biome.jsonc) and leaves `useSortedClasses`, import organization, and sorted JSX attributes off.
- Before committing, run `npm run check:strict` to verify the stricter Biome ruleset from [biome.strict.jsonc](e:/work/moviefax/biome.strict.jsonc).
- If you want Biome to apply the strict fixes for you first, run `npm run check:write`.
- Install the repo-managed git hooks with `npm run hooks:install`.
- The pre-commit hook runs `npm run check:strict` automatically.


