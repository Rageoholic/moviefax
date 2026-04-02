# Repository Guidance

## Trust Terminology

- Use `trusted` terminology only on the server side.
- Never use `trusted` in client-side code, client-visible field names, form field names, UI labels, API payloads exposed to the client, or any other client-visible surface.
- Client-facing code should use neutral names such as `movieTitle`, `movieId`, `selectedMovieId`, or `submittedMovieId`.
- The word `trusted` is reserved for values that have already been validated on the server against the source of truth.
