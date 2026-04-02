# Purpose

This document serves as a roughly chronological history of development for
readers, justifying decisions made and providing a clear view into my thought
process. We may refer to external files. Those files will include the hash of
the commit immediately preceding the commit that added them to the repository in
their name, disambiguating names in the case of a collision. In practice,
engineers would typically discuss decisions on platforms such as Slack, then
document decisions in a project wiki, but for this project, a linear record of
development is preferred.

## Initial Thinking

Immediately I read through the specification, making decisions on how I would
structure this. The specification is not included in this repository, but a
rough summary is as follows:

- Goal: Build a full stack web application using a fixed tech stack documented
  in README.md that follows roughly the following flow
  - Not logged in users are shown a landing page with a login with google
    option. After login, the user enters the following loop. Users who navigate
    to the site while logged in will simply enter the loop immediately
    - If the user has not yet been onboarded, they are redirected to the
      onboarding page. The onboarding page simply asks the user for their
      favorite movie. That movie is then verified, validated, and normalized,
      stored in the database, and associated with the user.
    - If the user has been onboarded, the user is taken to a dashboard. The
      dashboard must display the user's name, email, photo, favorite movie, and
      a log out button. The page will also query openAI to generate a fact about
      their favorite movie. This fact may be regenerated on each visit, and
      generated facts must be stored in the database.
  - If a user tries to access the dashboard while logged out, they are
    redirected to the landing page

A note: While old facts are stored, users have no visibility of them.
My running assumption is that we should store facts anyways, presumably for the
purpose of analyzing them later or in anticipation of a history feature.

After implementation of this basic strategy, two variants for augmenting the App are provided
- **Backend**: Modify fact verification so that if the latest generated fact is
  less than 60 seconds old, we reuse it instead of generating a new one.
  Otherwise we generate a new one and return it. The design fully revolves
  around this feature, so a numbered list was avoided in favor of an unordered
  list of constraints and the evaluation criteria
  - Generation must avoid the thundering herd problem. If the user attempts to
    access the dashboard with 500 requests at once by using multiple tabs or
    refreshing quickly, only one new fact will be generated every 60 seconds.
  - If OpenAI's API fails, we must return the most recently generated fact. If
    no fact has yet been generated, a user facing error must be shown.
  - Tests must be added to verify that
    - We verify the 60 second cache is implemented properly
    - Users cannot fetch other users facts
  - The evaluation criteria are:
    - Data is correctly modeled
    - Cache is implemented correctly
    - Concurrency is reasoned about correctly
    - OpenAI integration is safe
    - The backend is correct
- **Frontend**: Implement the following tasks..
  1. Modify the front end to go through a typed API layer. The
     specific details of this API are unspecified, but the sample methods are `GET
     api/me`, `PUT api/me/movie`, and `GET api/fact`.
  2. Create a typed client wrapper that handles requests consistently, parses
     typed responses, and normalizes error handling. Write tests to verify
  3. Modify the front end so the user can edit their favorite movie inline,
     allowing for save/cancel. The UI should optimistically assume success but
     revert if the API request fails. Write tests to verify
  4. Cache the movie fact on the front end for at least 30 seconds, reusing it
     if we hit cache unless the user explicitly requests a new one.

Notes:
- While the API is only required to be implemented in the front end, I believe
  it makes sense to implement in the back end too.
- Other than the API implementation, the two are disjoint.
- The frontend variant does not specify that it keeps the cache in a persistent
  storage. However that is likely necessary, even if that front end storage is a
  simple cookie
- The shape of the suggested API seems reasonably correct. The described flow
  does not seem to imply an SPA for the Backend variant but it does for the
  Frontend variant.
- For me the hardest bit would actually probably be the inline editing. My
  immediate instinct would be to direct to a separate page to input the new
  favorite movie but that's not a valid implementation strategy for the frontend
  variant. If I do the backend variant however, that's actually a very easy
  task.
- This implies a 3 enclave solution
    1. **Smart Dispatcher**: `/`,
       - transparently route to `/login` or `/dashboard` depending on
         authentication state

    2. **Logged out** - Landing page (`/login`):
       - If the user tries to access secured pages while logged out, they are
         redirected here

        - Handles errors with OAuth by redirecting here with params such as
          `/login?status=error&type=Redirect_failed` and any relevant metadata
          to display a meaningful error message.
        - If successful redirect to `/dashboard?status=success&type=Login`

    3. Logged in:
       - If user is not authenticated, redirect to `/login`
       - **Dashboard** (`/dashboard`).  If onboarding has not been completed,
         redirect to `/onboard`
       - Edit favorite movie page (`/edit-favorite` or `/onboard`).
         - Displays a simple form with a labeled text field for the user's
           favorite movie and a submit button.
         - Submits via `PUT api/me/favorite`
         - On success: redirect to
           `/dashboard?status=success&type=FavoriteUpdated`
         - On failure: redirect to self with parameters `status=failure` and any
           relevant metadata to construct a proper failure message



## Repository initialization

I chose to use create-t3-app, as it implements almost the full tech stack I
wanted out of the box, only missing openAI's API. I then started writing initial
documentation, including README.md and this document. Additionally, unused
variables were inserted into page.tsx to verify linting via biome works. At this
stage AI was consulted with to verify insights and act as an editor to make sure
prose was clear. The initial commit was then made to git.