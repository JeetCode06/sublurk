# Hivemind Crawl

A subreddit plays one Dungeons & Dragons party — together, by voting.

Built for Reddit's **Games with a Hook** hackathon. The whole community controls a single
adventuring party: an AI Dungeon Master narrates the scene, players propose their next
move in the comments, the community upvotes, and the top-voted comment becomes the
party's action. Server-side dice and the AI resolve it. One shared pool of HP. Permadeath.
A new run when the party falls.

## The hook

Everyone is the same character. Every turn is an election. And the world isn't canned —
when the game is installed in a subreddit, an AI generates a bespoke campaign **themed to
that community**: its own setting, its own named villain, its own recurring motifs, and a
campaign map that ends at a final boss. r/coffee crawls a different dungeon than r/spaceporn.

## How it works

- **One party, many players.** The party's class, ability scores, HP, gold, inventory, and
  conditions live in shared state. Comments are proposed actions; upvotes are the vote.
- **AI Dungeon Master.** Google Gemini narrates outcomes and authors the world, but never
  decides the dice — the server rolls. Everything the AI returns is coerced to a strict
  schema before it touches game state, so the model can flavor the world but can't break it.
- **Real tabletop mechanics.** Actions resolve as D&D-style ability checks against the SRD
  difficulty ladder. A class's strengths grant advantage; conditions like _poisoned_ or
  _frightened_ impose disadvantage; advantage and disadvantage cancel.
- **A journey with an end.** A themed campaign map moves the party node by node toward a
  named final boss. Defeat it to win the run.

## Tech

- [Devvit Web](https://developers.reddit.com/) — Reddit's developer platform
- [Hono](https://hono.dev/) — server
- [React 19](https://react.dev/) + [Vite](https://vite.dev/) — webview UI
- [Tailwind CSS 4](https://tailwindcss.com/) — styles
- [TypeScript](https://www.typescriptlang.org/) (strict) — type safety
- Google Gemini — the Dungeon Master

## Commands

- `npm run dev` — start a live development server on Reddit
- `npm run build` — build the client and server
- `npm run deploy` — upload a new version
- `npm run launch` — publish for review
- `npm run type-check` — type-check (now including tests), lint, and format

## Credits & licensing

This game's mechanics are built on the Dungeons & Dragons 5th Edition System Reference
Document. Only a subset of the SRD is used, and its content has been adapted and reskinned
to fit each AI-generated world.

> This work includes material taken from the System Reference Document 5.1 ("SRD 5.1") by
> Wizards of the Coast LLC and available at
> https://dnd.wizards.com/resources/systems-reference-document. The SRD 5.1 is licensed
> under the Creative Commons Attribution 4.0 International License available at
> https://creativecommons.org/licenses/by/4.0/legalcode.
