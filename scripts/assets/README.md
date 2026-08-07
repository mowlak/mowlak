# Asset pipeline

Three scripts turn a finished word list into the media a pack ships:
`generate-audio.mjs` has a speech service read it, `import-recordings.mjs`
brings in a voice recorded at home, and `import-images.mjs` brings the pictures
in. All three are run by hand, rarely, by one person; none runs in CI and none
is called by the build.

The two audio paths are alternatives, not stages. A pack can be voiced either
way, and what reaches a card is the same either way: the same trim, the same
loudness target, the same encoding. What must never happen is a pack voiced
both ways at once.

## What the pipeline is for

A card is a picture, an onomatopoeia and a word, and the child meets a dozen
of them in a row. That is why the constants below are not settings:

- **One voice.** A child who hears two speakers hears two different things
  being asked. Either the voice is chosen once, in an audition, and pinned in
  `audio.config.json`, or one person records the whole pack in one sitting.
  Never half of each.
- **One loudness.** Every clip is measured and normalised to the same target
  (I −18 LUFS, TP −2 dBTP, LRA 7). A clip that arrives louder than the one
  before it is a jump scare.
- **One style, one background.** Every picture is redrawn to 1024×1024 on the
  same cream and stripped of metadata.
- **Level 1 is a human voice speaking the onomatopoeia**, never an animal
  sound effect. The child is being invited to imitate speech.

And one rule about this repository: **raw material stays outside it.** The
takes that were not chosen and the downloads straight out of an image tool are
not content. Every script refuses a raw or audition directory that is inside
the working tree.

## Requirements

- `ffmpeg` and `ffprobe` on the `PATH`, or in `$FFMPEG` and `$FFPROBE`. This is
  all `import-recordings.mjs` needs: it reads files that are already on the
  disk, calls nothing and spends nothing.
- `ELEVENLABS_API_KEY`, for `generate-audio.mjs` only. Either export it in the
  shell that runs the script, or put it in a gitignored `.env` at the root of
  the working tree:

  ```
  ELEVENLABS_API_KEY=...
  ```

  The script reads that file at startup if it is there. A variable already
  set in the environment wins, so a one-off run can override the file without
  editing it. The key is never written anywhere by the pipeline.

- A **paid** plan on the speech service. The free tier does not grant the
  rights the content license needs, so audio produced under it could not ship.
  Both live modes therefore refuse to send anything without
  `--paid-tier-confirmed`; `--dry-run` needs nothing at all.

## Audio

### 1. Audition

Only once, or when the voice is being reconsidered. It records `"hau hau"` and
`"pies"` — the two jobs every card gives a voice — for each candidate in
`audition_voices`, through the same trim and normalisation the finished clips
get, so what you hear is what a card would play.

```sh
node scripts/assets/generate-audio.mjs --audition ~/mowlak-audition --dry-run
node scripts/assets/generate-audio.mjs --audition ~/mowlak-audition \
    --paid-tier-confirmed
```

The directory must be outside the repository. You get
`<voice>.<text>.m4a` per clip.

### 2. Pin the voice

Listen on a phone speaker, not headphones — that is where the app is used.
What matters: unhurried pace, no performance, a clean `"hau hau"` that is two
syllables and not a word. Put the winner's id into `voice_id` in
`audio.config.json` and leave it there.

### 3. Record the pack

```sh
node scripts/assets/generate-audio.mjs --dry-run          # 24 clips for animals
node scripts/assets/generate-audio.mjs --paid-tier-confirmed
```

Clips that already exist are left alone; `--force` re-records them, and
`--only <card-id>` narrows a run to one card. Each clip is written under a
temporary name and renamed only when ffmpeg has finished, so an interrupted
batch never leaves a half-written recording where a card points. A clip that
fails is reported by name and the rest of the batch continues.

### 4. Listen, then check

Play the pack through before trusting it, then:

```sh
npm run validate
```

### When a voice mis-reads a short input

Some voices read a two-letter input as an initial rather than a syllable —
`"mu"` as _em-u_. Fix it in `tts_overrides` in `audio.config.json`, keyed
`"<card-id>.<kind>"`:

```json
"tts_overrides": { "cow.sound": "muu" }
```

That changes only what is spoken. The text on the card comes from the
logopedic canon and is never touched by this pipeline — the dry run prints
both so the difference is visible. An override naming a card or level the pack
does not have is an error, not a no-op.

## Recording at home

The other way to voice a pack: one person, one microphone, one sitting. The
recordings are made outside this repository and imported through the same trim,
the same loudness target and the same encoding a generated clip goes through,
so a home-recorded pack and a generated one differ in nothing but the voice.

Set aside about half an hour. Twenty-four clips is twenty minutes of recording
and a few minutes of exporting.

### 1. Set up

A quiet room: no fan, no fridge, no open window. Soft furnishings help more
than equipment does — a room with curtains, a rug and a sofa in it will beat a
bare one with a better microphone.

A cardioid condenser about 15–20 cm away, with a pop filter, or aimed slightly
off-axis if there is none — `p` in `pi pi` and `hau` will thump the diaphragm
otherwise. Record at whatever sample rate and depth the recorder offers and
export to `wav`; nothing needs adjusting beforehand.

Set the level once and leave it. Do not normalise, compress or de-noise by
hand: every clip is measured and normalised on import, and a clip that was
levelled twice is a clip levelled differently from the one beside it.

### 2. Record

**Everything in one session, in one room, in one voice.** A child who hears two
speakers hears two different things being asked. That is also why a later fix
means going back to the same room and the same setup, not recording the one
missing card wherever you happen to be.

Level 1 of a card is the onomatopoeia and level 2 is the word, both spoken.
Level 1 is never an animal sound effect — the child is being invited to imitate
speech, so speech is what is recorded.

How to say it: playfully, but unhurried. Warm and a little slower than
conversation, with the ordinary intonation the sound has when you point at a
dog with a two-year-old. Not a character voice, not a performance, no rising
excitement at the end — the clip is an invitation to repeat something, and a
child repeats what sounds repeatable. Level 2 is the same voice saying one
word, plainly.

Two or three takes of each clip, one after another, then move on. Leave a
moment of silence around each take; it is trimmed off on import.

### 3. Export

One file per clip, named after the clip, in a directory outside this
repository:

```sh
mkdir -p ~/mowlak-takes
```

The name is the whole contract — `<card-id>.<kind>.wav`, the kind being `sound`
for level 1 and `word` for level 2. The 24 files the animals pack expects, in
its order:

```
dog.sound.wav      dog.word.wav
cat.sound.wav      cat.word.wav
cow.sound.wav      cow.word.wav
horse.sound.wav    horse.word.wav
duck.sound.wav     duck.word.wav
hen.sound.wav      hen.word.wav
rooster.sound.wav  rooster.word.wav
pig.sound.wav      pig.word.wav
sheep.sound.wav    sheep.word.wav
goat.sound.wav     goat.word.wav
frog.sound.wav     frog.word.wav
mouse.sound.wav    mouse.word.wav
```

`aiff`, `flac`, `m4a` and `mp3` are read too, but prefer `wav`: nothing has
encoded the take before the normalisation hears it. Keep the takes you did not
choose in a subdirectory — the importer looks only at files sitting directly in
the directory, and refuses a file it cannot place rather than skipping it
quietly.

### 4. Import

```sh
node scripts/assets/import-recordings.mjs --raw-dir ~/mowlak-takes --dry-run
node scripts/assets/import-recordings.mjs --raw-dir ~/mowlak-takes
```

The dry run prints, per clip, the file it found or the name it is waiting for.
The real run trims, measures, normalises and encodes each one to the `m4a` the
card already names, writing under a temporary name and renaming only when
ffmpeg has finished, so an interrupted run never leaves a half-written clip
where a card points. A take that fails is reported by name and the rest
continue. The content validator runs at the end.

Importing part of a pack is fine and is how one flubbed take is redone —
`--only <card-id>` narrows a run to one card. Every run then says how many of
the pack's clips came out of these recordings and how many were left as they
were, because a pack ships in one voice or it does not ship: a clip left behind
is still in whatever voice it was recorded in before.

### 5. Listen, then check

Play the pack through on a phone speaker, which is where the app is used, then:

```sh
npm run validate
```

## Images

Generation happens outside this repository, by hand or in whichever
image-generation tool you prefer; the pipeline is tool-agnostic and only ever
imports files. The pack's provenance note covers the result as generated
media.

### 1. Generate

Twelve pictures that look like one set is the whole difficulty, and the only
reliable way to get it is to make them **in one sitting, in one tool, from one
text**. Paste the style anchor below and change **only** the word in brackets.
Do not reword it between animals, do not add adjectives for one animal that
the others do not have, and do not come back the next day for the two you did
not like.

> Flat vector children's illustration of a single [ANIMAL], centered, thick
> clean outlines, simple geometric shapes, 3–5 warm colors, plain solid
> plain solid white background (#FFFFFF), no scenery, no text, no gradients, no
> shadows, calm friendly expression. Square image.

The twelve animals of the first pack, in the order they appear in it:

dog · cat · cow · horse · duck · hen · rooster · pig · sheep · goat · frog ·
mouse

Ask for 3–4 variants of each and keep them all for now. Judge them as a set,
not one at a time: line the candidates up side by side and drop the one that
is heavier, or busier, or drawn from a different angle than its neighbours,
even when it is the nicest picture of the twelve. What a toddler needs is a
single subject read at a glance; what the set needs is to look like it came
from one hand.

### 2. Collect

Download everything into one directory **outside this repository** — the
script refuses one inside it:

```sh
mkdir -p ~/mowlak-raw
```

### 3. Pick

Write a picks file mapping each card id to the winning file name in that
directory. Ids are the `id` fields in `content/packs/pl/animals.json`.

```json
{
	"dog": "dog-3.png",
	"cat": "cat-1.png"
}
```

The file names need not mean anything; the card id decides where each picture
ends up.

### 4. Import

```sh
node scripts/assets/import-images.mjs --raw-dir ~/mowlak-raw \
    --picks ~/mowlak-raw/picks.json --dry-run
node scripts/assets/import-images.mjs --raw-dir ~/mowlak-raw \
    --picks ~/mowlak-raw/picks.json
```

Each picked file is checked for being square within 2%, redrawn to 1024×1024
over the anchor cream, stripped of metadata and written to
`content/packs/images/<category>/<id>.png`. The card's `image` is repointed at
it and the placeholder it replaces is deleted. The pack is edited as text, one
value at a time, so an import's diff is exactly the paths that changed. The
script runs the content validator itself and reports the result; a run can be
repeated safely.

Anything wrong with the picks file — a card the pack does not have, a file
that is not in the raw directory, a name with a path in it — is reported all
at once, before anything is written.

## Flags

All three scripts take `--help`, and `--pack <file>` for a pack other than
`content/packs/pl/animals.json`.

| `generate-audio.mjs`    |                                                        |
| ----------------------- | ------------------------------------------------------ |
| `--dry-run`             | print the plan and stop; nothing is called             |
| `--audition <dir>`      | record the candidates instead of the pack              |
| `--only <card-id>`      | record one card                                        |
| `--force`               | re-record clips that already exist                     |
| `--paid-tier-confirmed` | required before any request is sent                    |
| `--keep-raw <dir>`      | keep what the service returned, outside the repo       |
| `--config <file>`       | a config other than `scripts/assets/audio.config.json` |

| `import-recordings.mjs` |                                                  |
| ----------------------- | ------------------------------------------------ |
| `--raw-dir <dir>`       | the recordings to import, outside the repository |
| `--only <card-id>`      | import one card                                  |
| `--dry-run`             | print the plan and stop; nothing is written      |

| `import-images.mjs` |                                                    |
| ------------------- | -------------------------------------------------- |
| `--raw-dir <dir>`   | the downloads to pick from, outside the repository |
| `--picks <file>`    | JSON, card id to a file name in the raw directory  |
| `--dry-run`         | print the plan and stop; nothing is written        |
