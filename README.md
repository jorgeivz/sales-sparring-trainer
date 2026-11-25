# Sales Sparring Trainer

A sales coach that **reviews your phone script line by line**, then **trains you on it for
seven days** against a voice prospect who gets harder every day. Your script is on screen
on day 1 and gone by day 7.

Built for Fly.io Hacksgiving 2026. It is an agent that runs on a **Sprite** and reaches the
outside world only through **Sprites connectors**. No API key lives on the machine.

| Connector  | What it does here |
|------------|-------------------|
| OpenRouter | Drafts, splits and reviews your script against a 16-rule checklist; picks your key lines and invents your prospect; scores every call |
| ElevenLabs | One-use token for each voice call, then the finished transcript |

## What it does

1. **Your business.** What you sell, who you call, the price.
2. **Your script.** Paste yours (messy is fine) or get a first draft. The coach checks every
   part (opener, discovery, pitch, close) against 16 rules and proposes concrete edits. You
   accept or reject each one; the server applies exactly what you accepted, word for word.
   Every quote the coach shows as evidence is checked against your script.
3. **Lock it.** The coach picks your key lines, invents one realistic prospect, and lists the
   objections that prospect will hide.
4. **Seven calls.** One part of the script per day. The prospect gets harder (friendly, one
   brush-off, vague on purpose, rushed and skeptical with two hidden objections). The screen
   help is retired as you go: full script with lines that tick as you say them (days 1-3),
   hints only (4-5), an emergency button (6), nothing (7). Score 70+ to unlock the next day.
5. **A coach that remembers.** Progress lives on the Sprite's persistent disk. The objection
   you fumbled comes back first on your next call, until you handle it.

### How a call is scored

- **Checklist (80%)**: the day's checklist items, scored by the model, which must quote your
  exact words. Quotes that are not in the transcript are thrown away.
- **Script (20%)**: key lines said, computed on the server from the real transcript.
- **Screen help**: minus 2 per hint revealed (max 10), minus 4 per emergency line (max 16).
- **Graduation** also needs at least half your key lines, from memory.

### Demo company

"Explore the demo company" opens Bright Roof Solar with every day unlocked. It was built by
running the real pipeline (`scripts/seed-demo.mjs`): a weak pasted script (6/100), every
suggested edit accepted, locked, and four sample rounds scored by the real coach.

## Run it on a Sprite

```sh
sprite create sales-sparring
sprite use sales-sparring
sprite file push -r . /home/sprite/app
# Fly dashboard → Sprites → Connectors: add ElevenLabs and OpenRouter, allow this Sprite
sprite exec --dir /home/sprite/app -- node scripts/setup-agent.mjs   # prints ELEVENLABS_AGENT_ID
sprite exec --dir /home/sprite/app -- sh -c 'echo ELEVENLABS_AGENT_ID=... > .env'
sprite exec --dir /home/sprite/app -- node scripts/seed-demo.mjs        # optional demo company
sprite exec -- sprite-env services create web --cmd node --args server.mjs --dir /home/sprite/app --http-port 8080
sprite url update --auth public
```

## Run it on a laptop

```sh
cp .env.example .env   # set MODE=direct and the two keys
node scripts/setup-agent.mjs
node server.mjs        # http://localhost:8080
```

No dependencies, no build step. Node 22+.
