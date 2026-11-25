# Sales Sparring

Practice a sales call against a voice prospect who sounds human, hides a real objection,
and hangs up if you just pitch. When you hang up, you get scored on your exact words:
every quote in the report is checked against the transcript, so the coach cannot make
things up.

Built for Fly.io Hacksgiving 2026. It is an agent that runs on a **Sprite** and reaches
the outside world only through **Sprites connectors**:

| Connector  | What it does here |
|------------|-------------------|
| ElevenLabs | Mints a one-use token for the voice call, then reads the finished transcript |
| OpenRouter | Scores the call against a 6-part rubric and writes the line to say instead |

No API key lives on the Sprite. The browser talks to ElevenLabs over WebRTC with the
one-use token; the Sprite never proxies audio.

## How it works

1. Pick a prospect (or write your own: what you sell, who picks up, their hidden objection)
   and a difficulty: Warm, Skeptical or Brutal.
2. The Sprite builds the prospect's persona and asks ElevenLabs, through the connector,
   for a one-use call token. The persona travels as a per-call override.
3. You talk. The call ends when you hang up, or after 5 minutes.
4. The Sprite pulls the transcript, scores it through the OpenRouter connector, throws
   away any quote the model invented, and stores the round on the Sprite disk.
5. You get a score, the line that cost you most and what to say instead, and one drill
   for the next round. Then go again, harder.

## Run it on a Sprite

```sh
sprite create sales-sparring
sprite use sales-sparring
sprite file push -r . /home/sprite/app
# Fly dashboard → Sprites → Connectors: add ElevenLabs and OpenRouter, allow this Sprite
sprite exec --dir /home/sprite/app -- node scripts/setup-agent.mjs   # prints ELEVENLABS_AGENT_ID
sprite exec --dir /home/sprite/app -- sh -c 'echo ELEVENLABS_AGENT_ID=... > .env'
sprite exec --dir /home/sprite/app -- node server.mjs                # port 8080
sprite url update --auth public
```

## Run it on a laptop

```sh
cp .env.example .env   # set MODE=direct and the two keys
node scripts/setup-agent.mjs
node server.mjs        # http://localhost:8080
```

No dependencies, no build step. Node 22+.
