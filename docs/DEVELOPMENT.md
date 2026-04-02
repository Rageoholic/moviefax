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
  1. Create a typed client wrapper that handles requests consistently, parses
     typed responses, and normalizes error handling. Write tests to verify
  1. Modify the front end so the user can edit their favorite movie inline,
     allowing for save/cancel. The UI should optimistically assume success but
     revert if the API request fails. Write tests to verify
  1. Cache the movie fact on the front end for at least 30 seconds, reusing it
     if we hit cache unless the user explicitly requests a new one.

Notes:
>- While the API is only required to be implemented in the front end, I believe
>  it makes sense to implement in the back end too.
>- Other than the API implementation, the two are disjoint.
>- The frontend variant does not specify that it keeps the cache in a persistent
>  storage. However that is likely necessary, even if that front end storage is a
>  simple cookie
>- The shape of the suggested API seems reasonably correct. The described flow
>  does not seem to imply an SPA for the Backend variant but it does for the
>  Frontend variant.
>- For me the hardest bit would actually probably be the inline editing. My
>  immediate instinct would be to direct to a separate page to input the new
>  favorite movie but that's not a valid implementation strategy for the frontend
>  variant. If I do the backend variant however, that's actually a very easy
>  task.
>- This implies a 3 enclave solution
>    1. **Smart Dispatcher**: `/`,
>       - transparently route to `/login` or `/dashboard` depending on
>         authentication state
>
>    1. **Logged out** - Landing page (`/login`):
>       - If the user tries to access secured pages while logged out, they are
>         redirected here
>
>       - Handles errors with OAuth by redirecting here with params such as
>          `/login?status=error&type=Redirect_failed` and any relevant metadata
>          to display a meaningful error message.
>        - If successful redirect to `/dashboard?status=success&type=Login`
>
>    1. Logged in:
>       - If user is not authenticated, redirect to `/login`
>       - **Dashboard** (`/dashboard`).  If onboarding has not been completed,
>         redirect to `/onboard`
>       - Edit favorite movie page (`/edit-favorite` or `/onboard`).
>         - Displays a simple form with a labeled text field for the user's
>           favorite movie and a submit button.
>         - Submits via `PUT api/me/favorite`
>         - On success: redirect to
>           `/dashboard?status=success&type=FavoriteUpdated`
>         - On failure: redirect to self with parameters `status=failure` and any
>           relevant metadata to construct a proper failure message



## Repository initialization

I chose to use create-t3-app, as it implements almost the full tech stack I
wanted out of the box, only missing openAI's API. I then started writing initial
documentation, including README.md and this document. Additionally, unused
variables were inserted into page.tsx to verify linting via biome works. At this
stage AI was consulted with to verify insights and act as an editor to make sure
prose was clear. The initial commit was then made to git.

## First Run

Whenever I initialize a template like this, one of the first things I want to do
is make sure the basic app works. I edited `.env.example` to have the correct
authentication variables (it was generated with discord, not google) and plugged
the appropriate providers into `src/server/auth/config.ts` and `src/env.js`. I then
copied the template to `.env`, filled in my variables with my generated next
secret and the id and secret from a google application I initialized. I also
started a db on my local machine, fed the authentication details into `env`, and
ran `npm run db:push` to initialize it. I then ran `npm run dev` and navigated
to `localhost:3000`, which displayed the default template page. I modified
`src/app/page.tsx` in order to test that hot code reload worked and it did, so
now we can begin building.

## Initial implementation

Because I specced out my thinking in this file. I could point my copilot model
at it and get a base implementation almost immediately. However, there was 1
clear issue, movie names were never validated. They were trimmed, but no
normalization was applied and the title was arbitrary outside a max character
limit. While fact generation was not yet online, the literal second it did, we
would effectively be spending our OpenAI credits so other people could run their
prompts. This is not acceptable and must be our next task to tackle.

## Input validation

### Planning

The core philosophy behind input validation when passing to an LLM is that the
LLM must never see a user generated string unless that LLM has no control flow
responsibility or ability to exfiltrate secure data. For example, it is not okay
to use an LLM to read an email and write a response without the user having to
explicitly read the generated response before it is sent and validate that it is
what they want. It is also not okay for an LLM that has tool access to be
exposed to any data other than explicit, developer generated commands unless
those tool uses are validated by the user through explicit whitelisting or
manual approval. Explicit whitelisting should not include any means to
exfiltrate or modify data. An example is running git branch. If one simply added
`git branch` to their whitelist, the LLM could run `git branch -D` to delete
arbitrary branches. For our purposes this means we have one truely correct
solution, which is to query a list of movie titles and attempt to fuzzily match
the user's input against that list, letting them select one and using the string
as it appears in our source of truth instead of the specific one the user
submitted. For a real application, the correct solution would be to call an API,
likely implemented as a microservice that can handle caching and update
automatically as new movies come out. However this is a simple project so I'm
outsourcing this to OMDB and acting as if their source of data is trusted.
***THIS IS NOT IDEAL***. We will perform fuzzy searches as the user types,
making sure to wait at least a few keystrokes or a half second before querying
the fuzzy match API. This is to ensure that our implementation is not spamming
the API constantly. We likely also want backoff if we get rejected. In addition,
instead of submitting a *name*, we submit the OMDB *id*.

### Implementation.

With that block written, we can point copilot to it for the implementation.
During this implementation, copilot made a mistake, which is it named four
separate things trustedId, only one of which could even theoretically be a
trusted id
- The client field in the app
- The parameter passed by the app to set the user's favorite movie
- The parsed version of that id on the server after parsing but before validation
- The field in the struct used to represent the id given to us by imdb.

The last one actually is trusted (grudgingly) but the rest all need to be
renamed and the field also needs to be renamed because the instant it hits the
client it no longer is trusted. I also added a note in CLAUDE.md and
CONTRIBUTING.md that "trusted" as a term is effectively banned from any client
visible fields.

I also turned off the sorted classes lint for biome as while it is meaningful
and useful (I use autosorted imports all the time) it is annoyingly lumped in
with lints rather than formatting settings, and you cannot granularly turn them
down. Autofixing other lints can cause code to be refactored so it's not
desirable to do automatically behind the programmer's back. Instead, I disabled
the lint in the default configuration, made a separate stricter config where
that lint is on, and we check against the strict config in a precommit hook.
write still uses the stricter config too, as we accepted we're doing the more
destructive actions too so we might as well allow the non-semantic changes. I
then consulted the AI and moved import and jsx attribute sorting to only be
enabled in strict as well.

For the commit I let copilot handle it. It was there for the whole thing and
knows the exact intended semantics. Normally I would submit a PR and do a proper
merge but I didn't bother as I don't have any specific CI set up right now and
I don't have any co-reviewers so PRs become process theater.

## OpenAI integration

### Planning

We already did things correctly so this step should be a cinch. Just make a
request to OpenAI and save the data. I also think it makes sense to fold in
variant A here since I can be a performance junkie and I like thinking about
problems like caching. The current cache plan is a per row lock on the users
table as well as the id of their most recently generated fact stored inline.
Facts will be up to 500 characters and will also retain the timestamp they were
generated and the user who created it. If this was a real project, the plan
would be to attempt to grab the user row in read only mode, read the last fact
the user generated, compare the time stamp and if the fact is outdated, release
the read only lock and attempt to grab a read write lock. This is a common
pattern for concurrency used in mutexes, RWLocks, and other local applications,
so it feels relatively intuitive that it should work here as well. However, the
cache only lasts for 60s, which means that this is probably overkill. The fast
path wants to be generating a new fact. So we'll just always grab the lock in
write mode. I don't remember if you can lock one side of a join but not the
other and honestly I don't care, the facts table will be append only in
production. We also want a button to regenerate the fact in the UI.

Tangent: At this point I'm asking if 500 characters is conservative. According
to Claude probably not. It also reminded me that we have to set max tokens.

### Constraints

We have to remember that API tokens cost. We should set a cap on the amount used
per request. We should also implement exponential backoff and rate limiting.
Ideally, we'd be able to calculate our maximum spend per day on tokens, but
that's something that would need to be discussed with an operations team. We
solved prompt injection at the data layer so it doesn't need to be worried about
here.

Claude suggested a few things I missed and pointed out that OpenAI's SDK has
rate limiting built in

- Timeout: Yeah I probably should have remembered this one. Obviously we don't
  want to hang and leave the user waiting if OpenAI is up but not responding
- Model: Claude suggested gpt-40-mini. Honestly I'm not super familiar with
  OpenAI's exact hierarchy of models, but typically when I want to use something
  explicitly for code it's GPT-5-mini because it doesn't use premium requests
  with copilot. Obviously not the constraint here. I do remember hearing that
  OpenAI has been moving to retire 4 models though. I'm checking with Claude
  again. Claude pointend me to the deprecation doc and no it's not currently not
  scheduled for deprecation. In a real app, paying attention to these
  deprecations and keeping on top is critical, and maintaining a migration path,
  but we won't bother here.

 ### Implementation

 While telling copilot to run the implementation, I realized I forgot to
 specify above the fallback to the most recent path if the call fails. I had it
 in the back of my head but I didn't write it down. Luckily copilot caught it
 and found the explicit requirement documented above. I also decided to fold
 tests in here. Copilot also flagged that the exact spec doesn't require an in
 place update but I think it's better to do it in place.

After implementation, found a silly bug where if you double click, the service
will recieve a second request to regenerate before the first one succeeded.
Copilot added both client side debouncing and request level merging, handling
this problem. However the server problem was solvedd solely via a server side
fence, which is sufficient for single machine cases but not multi-machine
cases. Me and copilot migrated to a two fence solution where the server fence
remains in place but the forced refresh also takes a timestamp of when the
request was recieved. A client timestamp could be in the future and while it's
validatable it's not really logically part of the request, so the server side
timestamp is better. If after acquiring the lock, the generated fact is newer
than the request, we don't need to regenerate again. This elegantly scales the
problem for the cost of taking 1 timestamp, which in terms of cost is almost
free.

We also noted that the fact generation has almost no variation. We solve this
by fetching several facts per generation and passing them to the model. This
has two knock on implications

- We can get rid of the most recently generated fact in the user table. It was
  used as a more efficient key. Since we need to fetch more than one, we could
  have adopted a FIFO but it's simpler to just rip it out and order by
  timestamp.
- We're feeding the model its own output. This makes me worried about output
  degredation. However a couple of notes
  - The solution is still bounded, we only feed 5 previous facts, all of which
    have a max size. Therefore the prompts are bounded and so our token costs
    are bounded. Runaway costs are not a concern
  - Model degredation is possible but not a severe risk. The worst case is
    that the prompt generates an incorrect fact and refuses to correct itself,
    but the model could also drift to only answering certain types of questions.
    There are some mitigations
    - The history window is small, so there's not some runaway scaling where
      we get off track and that fact is now considered gospel
      - The history is still conditioning the model, so it is not a pure
        negative bias. However it is being used narrowly to discourage repeats
        rather than as authoritative context, which mitigates some of the risk
        of drift.
  - The solutions suggested by copilot require us to check for duplicate
    topics ourselves and reject them manually
      - This sucks because now we start introducing major tail latency
        problems where the model generates the same types of facts repeatedly
      - This also sucks because we need to implement a means of querying the
        topics of facts in a normalized way, ideally without calling out to an
        LLM. This seems like a thesis topic, not a practical engineering solution.
  - Because of the questionableness of the suggestions, I did not implement a
    further solution, leaving the passing of the last few topics in place

## Favorite Movie Reassignment

The last task I want to touch is changing the users favorite movie. This has 1
broad implication that I have not taken into account yet, which is that facts
also must be associated with the movie they're about. That way, we feed clean
context to the model instead of facts about a completely different movie that
risk biasing it.