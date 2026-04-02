# Moviefax!

A simple app to learn interesting facts about your favorite movie!

- typescript
- next.js
- react
- tailwind
- postgres
- prisma
- Google OAuth
- OpenAI

All engineering documentation is kept in the docs/ subfolder, showing reasoning
behind each step. For a linear history of work, look at docs/DEVELOPMENT.md.
That document will refer to choices made over the course of development.

## Running
1. Clone this repository to your local machine.
1. cd into the root directory of this repository and run `npm install`
1. Copy .env.example to .env
1. ***RUN `git check-ignore .env` IN THE PROJECT ROOT.*** If .env is not listed,
   add it to the .gitignore. This file will contain secrets in plaintext. If it
   ever gets committed to the repository or otherwise leaks off of your machine,
   assume every secret in that file is compromised and replace them.
1. Use `npx auth secret` and copy the secret generated to the AUTH_SECRET
   variable in .env
1. Go to the [Google Cloud
   Console](https://console.cloud.google.com/welcome?project=nul) and select
   "new project" from the project picker in the top left corner. Name your
   project and navigate to `APIs & Services > OAuth Consent Screen` in the
   navigation menu. Navigate to Clients. Click Create Client, select Web
   application, and name your client. ***MAKE SURE TO COPY YOUR SECRET SOMEWHERE
   SAFE! YOU CANNOT GET IT BACK LATER!*** Set AUTH_GOOGLE_CLIENT_ID and
   AUTH_GOOGLE_CLIENT_SECRET in your .env file.
1. From the webpage for your new client on the cloud console add
   `http://localhost:3000` to your authorized javascript origins and
   `http://localhost:3000/api/auth/callback/google` to your authorized
   redirects.
1. Get an OMDb API key from [omdbapi.com/apikey.aspx](https://www.omdbapi.com/apikey.aspx).
   Copy the key you receive into `OMDB_API_KEY` in `.env`.
1. Create an OpenAI API key from the [OpenAI API keys page](https://platform.openai.com/api-keys).
   Copy that key into `OPENAI_API_KEY` in `.env`.
1. Fill in your database URL and credentials for your postgres database and run
   `npm run db:push`from the project root. This will cause Prisma to apply your
   database schema.
1. From the project root, run `npm run dev`. You will now have a server running
   at localhost:3000 with the application.

## AI Assistance

How AI was used in this project is documented in `AI_SUMMARY.md`