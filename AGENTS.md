You are writing a Devvit web application that will be executed on Reddit.com.

## Tech Stack

- **Frontend**: React 19, Tailwind CSS 4, Vite
- **Backend**: Node.js v22 serverless environment (Devvit), Hono
- **Communication**: plain `fetch` against Hono REST routes; request/response
  shapes are shared types in `src/shared/api.ts`

## Layout & Architecture

- `/src/server`: **Backend code**. Runs in a secure, serverless environment.
  - `index.ts`: main server entry point (Hono app); mounts `/api` and `/internal`.
  - `routes/`: HTTP surface — `community.ts`, `solo.ts`, `modrequest.ts`,
    `menu.ts`, `scheduler.ts`, `triggers.ts`, composed in `routes/api.ts`.
  - `game/`: the pure game engine (dice, rooms, combat, resolution). Keep it
    deterministic and side-effect free; randomness enters via a `RandFn` param.
  - `ai/`: Gemini calls, prompts, and reply parsing. Everything the model
    returns is coerced to a strict shape before it touches game state.
  - `data/`: Redis persistence, keyed per subreddit (community) or per user (solo).
  - Access `redis`, `reddit`, and `context` here via `@devvit/web/server`.
- `/src/client`: **Frontend code**. Executed inside an iFrame on reddit.com.
  - To add an entrypoint, create an HTML file and add it to the mapping inside
    `devvit.json`.
  - Entrypoints:
    - `game.html`: the main React entry point (Expanded View).
    - `splash.html`: the initial React entry point (Inline View), shown in the
      reddit.com feed. Keep it fast; keep heavy dependencies inside `game.html`.
- `/src/shared`: **Shared code** between client and server (game types, API
  shapes, class data, ability constants).
- `/tests`: Vitest unit tests for the server engine and AI parsing.

## Frontend

### Rules

- Instead of `window.location` or `window.assign`, use `navigateTo` from
  `@devvit/web/client`

### Limitations

- `window.alert`: Use `showToast` or `showForm` from `@devvit/web/client`
- File downloads: Use clipboard API with `showToast` to confirm
- Geolocation, camera, microphone, and notifications web APIs: No alternatives
- Inline script tags inside of `html` files: Use a script tag and separate
  js/ts file

## Commands

- `npm run type-check`: check TypeScript types (source projects and tests)
- `npm run lint`: run ESLint over `src` and `tests`
- `npm test`: run the Vitest suite (`npx vitest run my-file` for one file)

## Code Style

- Prefer type aliases over interfaces when writing TypeScript
- Prefer named exports over default exports
- Avoid type casts; the few that exist sit at the Devvit API boundary
  (e.g. re-tagging a stored post id as `t3_${string}`)

## Global Rules

- You may find code that references blocks or `@devvit/public-api` while
  building a feature. Do NOT use this code as this project is configured to use
  Devvit web only.
- Whenever you add an endpoint for a new menu item action, ensure that you've
  added the corresponding mapping to `devvit.json` so that it is properly
  registered.
- Anything the AI returns and anything read from Redis is untrusted: run it
  through the coercers (`src/server/lib/coerce.ts`, `coerce*` functions) before
  it touches game state.
- Moderator-only endpoints must check `isCurrentUserMod()` server-side; hiding
  a button in the client is not a boundary.

Docs: https://developers.reddit.com/docs/llms.txt.
