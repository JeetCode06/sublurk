# Sublurk

Tap a post, fall through the screen, and talk your way out of a dungeon.

Built for Reddit's **Games with a Hook** hackathon. Play it two ways. **Solo**, you descend
alone: type what you do in plain words and the Warden, the voice of the dungeon itself,
answers. **Community**, a whole subreddit steers one hero together: players propose moves in
the comments, the community upvotes, and the top-voted comment becomes the party's action.
Server-side dice decide, the Warden narrates. One shared pool of HP. Permadeath. The only way
back to your feed is down, past the thing waiting at the bottom.

## The hook

Everyone is the same character. Every turn is an election. And the world isn't canned —
when the game is installed in a subreddit, an AI generates a bespoke campaign **themed to
that community**: its own setting, its own named villain, its own recurring motifs, and a
campaign map that ends at a final boss. r/coffee crawls a different dungeon than r/spaceporn.

## How it works

- **Two lanes, one dungeon.** A solo run is private and immediate. A community run is
  asynchronous and shared: the party's class, ability scores, HP, embers, inventory, and
  conditions live in shared state, comments are proposed actions, and upvotes are the vote.
- **The Warden.** Google Gemini narrates outcomes and authors the world, but never decides
  the dice — the server rolls. Everything the AI returns is coerced to a strict schema before
  it touches game state, so the model can flavor the world but can't break it.
- **Classes that play differently.** A Fighter shrugs off one killing blow per run; a Rogue
  rerolls a failed action each floor; a Wizard curses a foe to ease a fight. Room affinities
  grant advantage or impose disadvantage on top.
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
- Google Gemini — the Warden

## Commands

- `npm run dev` — start a live development server on Reddit
- `npm run build` — build the client and server
- `npm run deploy` — type-check, lint, and upload a new version
- `npm run launch` — publish for review
- `npm run type-check` — type-check the source projects and the tests
- `npm run lint` — lint `src` and `tests`
- `npm test` — run the Vitest suite

## Credits & licensing

This game's mechanics are built on the Dungeons & Dragons 5th Edition System Reference
Document. Only a subset of the SRD is used, and its content has been adapted and reskinned
to fit each AI-generated world.

> This work includes material taken from the System Reference Document 5.1 ("SRD 5.1") by
> Wizards of the Coast LLC and available at
> https://dnd.wizards.com/resources/systems-reference-document. The SRD 5.1 is licensed
> under the Creative Commons Attribution 4.0 International License available at
> https://creativecommons.org/licenses/by/4.0/legalcode.
