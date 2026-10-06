# clawd-ballet: notes for agents

The ballet is a claude-toons scene, drawn by claude-toons' own renderer. Look
at how toons does a thing before doing it differently here.

- **From toons, unchanged** (MIT, see `LICENSE-claude-toons`):
  `hooks/script.ts` (the scene renderer and drawing calls), `hooks/lang.ts`
  (the scene-code interpreter), `hooks/effects.ts` (backdrop effects),
  `hooks/clawd.ts` (Clawd's pixel art, poses and anchors) and
  `hooks/render3d.ts` (needed by the renderer). Don't edit them; to update,
  copy newer ones over from toons.
- **`hooks/dance.ts`** is the dancer, as scene code every piece starts
  with. Keep it to the official Clawd stickers (the ballet sticker above
  all): the body a plain 10 by 6 block, unchanged in every view (not
  toons' sprite, whose middle rows stick out a pixel each side for its
  claws: with arm stubs on top, that reads as a second pair of arms); two
  chunky arm stubs touching the block (out, up from the top corner, high
  at 45 degrees, down onto the tutu), every pixel of an arm or a bent leg
  touching the next along an edge, never only at a corner, and stepping
  in whole rows of cells; four short orange legs, each tipped with a pointe shoe in the tutu's light
  colour (its bottom pixel; the person asked for them) (three in
  passé, the fourth drawn up under the tutu, so a pirouette reads as a
  turn), always pointing down (out to the side they read as more arms); a pink tutu
  checked in two pinks at the hips, under the whole body. Turning never
  changes the body's shape: a three-quarter view shades the far side and
  the far arm and slides the eyes toward the way it faces; from behind
  the eyes are gone. The sticker pose is a three-quarter view, the front
  arm up, the back one out, the back leg pointed down behind
  (`RAISED`, `derriere`). Rows: body 0 to 5, tutu 6 and 7, legs 8 and 9,
  arms above at -2; the body's top lands on an even pixel row, so nothing
  straddles a cell (seams in terminals with line spacing).
  The pixel art is generated: edit the coordinates in `scripts/art.py`
  and run `python3 scripts/art.py`, which rewrites the block between the
  `art:begin` and `art:end` markers. Poses are names (sprite frames); x,
  air and spin blend eased between keyframes (`P`, `blend`, `track`). A
  spin picks the view as Clawd goes round.
- **`hooks/ballet.ts`** is the pieces, each a toons scene of the dancer, the
  shared helpers (`COMMON`: keyframes, speech by time said from beside
  Clawd so bubbles keep off its raised arm, blinks, bourrée steps, leaps,
  pirouettes, tours en l'air, balancés, entrechats (`beating` flutters the
  legs in the air), the révérence, boards, sparkles that keep off Clawd
  and the floor) and its own set and choreography: the gala (curtains that
  part and close, spotlight, roses), Swan Lake (the lake at night, the
  moon on the water, wingbeat arms, the little swans in a line on a wide
  strip, the dying swan, Rothbart's owl), the Nutcracker (snow, the tree,
  turns, jumps, fouettés), the Firebird (the golden-apple tree, embers
  trailing Clawd, the feather), Mayerling in three acts, three pieces in a row
  sharing `MAYER_COMMON` (the ball, the tavern with the officers on
  `OK`, the hunting lodge; two dancers: the woman on `KEYS`,
  Rudolf on `RK`, placed by stage fraction plus `dx` columns so their
  hands meet at any width; Rudolf is `look.bare`, breeches and boots, and
  kneels with `legs: 'kneel'`; the kiss is one hand-drawn picture, `KISS`,
  Mary upside down, which the person chose: the one place legs point up;
  `lights` darkens outside an oval with `fill`. `DUETS` (the shared
  partner code, three tracks: `KEYS`, `RK`, `CK`) also serves Swan Lake's
  and the Nutcracker's acts (Swan Lake's shared set, Odette, the prince,
  the owl and `lightning` are in `SWAN_COMMON`) and the McGregor triple bill (Chroma, Infra,
  Untitled, 2023), with `phrase` for sharp pose sequences, `steps` for
  travelling in little jumps and `pirouettesOn` for turns on any track; a dancer in
  breeches never takes `derriere` or `jete` (check-frames checks); the person found the
  faithful ending with the shots too dark, so it ends on a joke, a
  champagne pop, like Swan Lake's, popped in the light so it can be
  seen: the bottle in Rudolf's hand, the cork, the foam), Don Quixote (the act III grand pas
  de deux with Basilio; Kitri's fan, a prop over the raised hand; the
  windmill, the stage stopping short of it), Giselle (act II; she sinks back into her
  grave with negative `air`, the mist drawn over her), La Fille mal gardée
  (the chicken dance: the Cockerel on `CK`, the Hens on `HK`, a track each,
  20 columns apart so tutus don't merge, their canon led from the front of
  the line; a whole-cell ribbon between partners) and MacMillan's Manon
  (act I, the coach hiding whoever is aboard), and class (the barre, the
  teacher counting from a piano with a metronome). A piece is a dance, not
  an animation (the person said so of a first cut of the four newest):
  nobody glides across on straight legs (bourrée, leap or `steps`), nobody
  stands still for long while another dances (sway in balancés, answer in
  arabesque), and the story is told in ballet's own forms (entrée, adagio,
  variations, coda; lifts, supported pirouettes) rather than in props.
  A corps dances in unison or canon, never stands. Speech is sparse
  (the person found every piece over-explained, more play than ballet):
  a title card, a story beat, a joke, three lines at most a piece (the
  person found it too wordy again at four to six); never a line naming the
  step being danced ("pirouette!", "hop, hop!"), and no counters or other
  text drawn on stage (Odile's "1 / 32" went). Nothing drawn into a
  dancer's body either: Infra's tear, a `·` put mid-body, read as a rogue
  dot. Backdrops are toons' particle swarms (`particles` in `PIECES`:
  `stars`, `rain`, `fireworks`, `confetti`, `fireflies`, `EMBERS`,
  `BIRDS`), text glyphs behind the set and dancers that show in any
  terminal; toons' backdrop effects are kept faint by its renderer
  (`stage()` paints them at 0.4, dithered) and can't be raised here.
  A swarm's expressions read the piece's clock, so `during` shows one
  only for its moment in the routine. A set that paints its sky (Swan
  Lake I's dusk) hides them; tiny static specks read as bugs, so leave
  those out.
  Keep endings light (the
  person found Mayerling's faithful one too dark), and partners at least
  14 columns apart, or two orange bodies read as one. A track's keyframes
  must be added in time order (check-frames checks): a loop adding to two
  tracks at once is the usual slip. New moves are combinations of the poses
  Clawd has: don't add pixel art for a move without the person's say.
  A spin's landing keyframe keeps the spin it ended on (`spin: 360 * n`):
  blending to 0 turns Clawd backwards while it still spins. Keep
  speech plain ASCII (toons' bubbles drop the rest), end a bare `return`
  with `;` (the interpreter reads the next line into it), and keep each
  scene's code under toons' 20,000 characters (comment lines are stripped
  when a piece is built, by `bare`, so comments cost nothing).
- **`hooks/live.ts`** is the other mode, `/ballet live`: one Clawd in
  Class's studio whose dancing is made of what Claude does, as toons'
  ready-made scenes follow the work's phase (toons' `hooks/library.ts`;
  `actOf` reads a tool call the way toons' `phaseOf` does, and a shell
  command by its first word, past a `cd ... &&`, as `COMMANDS` lists
  them). No model is asked. One set and one look throughout (the person
  asked for that over a set or lighting per kind of work). The shape is
  the person's: between tool calls Clawd holds still, in a pose for the
  moment (`hold`: light tendus and élevés while thinking, which the
  person found too idle standing still; a slow port de bras while
  writing the reply; the move's own pose while its
  tool still runs, balances in turn for tests, never one frozen pose,
  which the person found idle); each tool call fires one
  quick move of its own, about a second (`MOVES`, one per entry of the
  TS `MOVES`, which check-frames holds the scene to), with a label naming
  what set it off (`tag`: a chip in one place at the top left, as the
  person asked; bright for the move in hand, news included, dim for what
  Claude is at between moves); calls in quick succession chain.
  A first cut that looped phrases per kind of work read as one long idle
  animation, and thinking looked like reading. A queue (`QUEUE`) keeps
  only the last two moves waiting, so a burst never leaves Clawd behind;
  a new move cuts a held pose at once, and news (`ANSWERS`: a new task, a
  tool that failed or was denied, tests or a build that passed) cuts
  anything, unless Clawd is turning, in the air or off in the wings (an
  `ssh`; it leaps back on before anything else). Others come on as the
  work calls for them: a stagehand (`SK`, a track of his own, in grey
  with a cap) runs git's ribbon in (the ribbon on a wand, which the
  person chose over a crate that read badly, trails Clawd's hand for 12
  seconds after (30 stayed too long); it is a band half a cell thick
  (lower half blocks, half-width ones up, down and on a slant; whole
  cells were too chunky for the person, a box-drawing line too thin),
  drawn behind every dancer:
  circling Clawd on a turn, streaming back along the hand's path,
  fluttering out from the wand when still, away from a partner) and the web's letters
  (`PROPS` pass between hands); an MCP server's partner (`PK`, a colour
  per server) lifts Clawd and partners its turns, and bows out about 2
  seconds after the server's last call, cutting a held pose to go (the
  person found the helpers lingering; the stagehand and messenger are
  on and off in about a second). All of them keep 16 columns from Clawd, and the bare
  ones never take `derriere` or `jete`. Subagents bring a corps in white,
  at slots 22 columns either side of the middle (38 while a partner is
  on), as many as fit; they bourrée on only once Clawd is in the middle,
  dance its moves a beat behind, and while any are on Clawd's moves stay
  in place. Each corps dancer also dances a move of its own (`CREW`) for
  each of its subagent's tool calls (`liveCrewN`, `liveCrewWho`,
  `liveCrewMove`), so the agents' work shows (the person found the stage
  idle while subagents were out), and Clawd leads them with a lively
  phrase in place. Little signs (`signs`: thought bubbles, !, a count, notes,
  z's, a paper ball, a spark, a spin's whirl) mark what a pose alone
  can't. The plugin passes the moment in as the scene's globals
  (`liveAct`, `liveMove`, `liveLabel`, `liveToolN`, `liveBusy`,
  `liveNews`, `liveNewsN`, `liveCorps`, `liveGuest`, `liveCrew*`) by wrapping the
  program toons' renderer runs (`wire`), which also parses the code
  whole: it is the plugin's own and over the 20,000 characters toons'
  loader keeps, so `script.ts` stays toons' own; without the globals (the
  scripts) the scene reads `typeof` and stands ready. The scene is kept
  from turn to turn, and the band keeps whatever it shows through a blink
  of under 4 seconds mid-turn (`paused` in register.tsx: a subagent's
  message landing redraws the screen, and it used to grow in again from
  the bottom). `demoAt` is a made-up session of every move, held poses
  and news, for `play.ts --live`, `frames.ts --live` and check-frames.
  Speech only for news; the label names what set a move off or what
  Claude is at, never the step.
- **`hooks/cells.ts`** is a last pass over each frame (`solidify`) for
  terminals with line spacing, where a block glyph leaves a strip at the top
  of its cell showing the cell's background: with toons' upper half blocks
  that strip is the bottom pixel's color (lines of eye and tutu across
  Clawd, gaps between curtain rows). It turns cells whose two pixels match
  into spaces filled with that color and the rest into lower half blocks,
  so the strip shows the top pixel's color. In an exact terminal the frame
  looks the same pixel for pixel. `gif.py --gap N` simulates the seams;
  `frames.ts --raw` skips the pass to compare.
- **`hooks/register.tsx`** draws the stage in the `AbovePrompt` band, flush
  against the prompt, while Claude works (`isWorking`), and yields the band
  to surveys and when idle; the spinner line stays the engine's. The band
  grows from 1 row to 9 over 700 ms; each frame is `stage()` from toons,
  through `solidify`, repainted at about 20 fps with `$.ui.blit`. Each turn
  starts the next piece; a piece plays once, then dissolves into the next.
  In live mode the live scene plays on instead, and the hooks watch for
  it: `tool.call` (passed through untouched; a subagent's calls only mark
  it at work), the `Spinner`'s mode (thinking, writing the reply; drawn by
  the engine as ever), `prompt.submit` and `turn.complete`. The mode is
  stored (`mode`) and read again as each turn's dancing starts, as `next`
  is, since a reload starts the module afresh. Each load marks the session in
  `$.state` (`load`, declared in `types/index.d.ts`) at `session.start`, and
  the animation loop stops once a later load's mark stands: a hot reload
  left the old loop painting, two stages flickering in turn.
  `/ballet` toggles it; `/ballet live` and `/ballet standard` switch
  mode (`repertoire`, standard's old name, still works, typos too);
  `/ballet <piece>` picks what plays next, loosely
  (`hooks/choose.ts`: typos, starts of names, acts as `mayerling 3`), and
  words naming no piece reply without toggling. `/ballet programme` (or
  `program`, `settings`) opens a pane, a row each for the next piece, the
  mode (m), shown or hidden (h) and the settings (o, s, l), each a plain
  Button changed in place by its letter: a Select list trapped the arrow
  keys, which wrapped round it. n swaps the rows for every piece in
  columns (`isPicking`), a letter each, 0 back; a pick sets what plays
  next and leaves the mode alone (stepping through them one by one was too
  slow for the person). The settings are `userConfig` in
  plugin.json (in /config as "Ballet: ..."; the pane changes them with
  `$.config.set`, which reloads the plugin): `order` (shuffled keeps a
  ballet's acts in order, `following` in choose.ts), `speech` and the live
  `label`, both turned off by code added after the scene's own whose
  definitions replace its (`function say() {}`, `function tag() {}`;
  `wire`'s `extra` for the live scene). Claude Code has no argument
  completion for commands, so a `prompt.edit` hook completes `/ballet ...`
  on Tab and the idle band shows a dim hint row of the matches. Helpers
  given `$` must be top-level functions (the engine refuses the module
  otherwise). A frame costs about 1 ms at 220 columns: keep it so.
- **Judge pixel art in a real terminal, not a rendering.** Terminal.app
  draws a cell whose two pixels share a colour solid, but a cell with only
  one half coloured as a short bar set low (its block glyphs leave room for
  line spacing). So small features (arms, leg tips) are built of whole
  cells: a diagonal in half-cell steps comes out as an antler there. A cell
  is about twice as tall as wide, so a raised arm is whole-cell blocks
  stepping a column per row. `scripts/terminal.sh poses out.png` photographs
  every pose in a fresh Terminal.app window (the default profile), and
  `scripts/terminal.sh piece <n> out <seconds...>` a piece as it plays;
  `gif.py` draws exact half blocks and can't show this.
- **Checks**: `python3 scripts/check.py` checks every arm and leg drawing,
  either side, against the body and tutu: attached, edge to edge (never
  only at a corner), no two legs side by side (they merge), every eye
  inside the face and off its edge, and no pixel alone in a cell's top half (terminals with
  line spacing draw it low, so it comes loose). `node
  --experimental-transform-types scripts/check-frames.ts` plays every piece
  frame by frame at four widths and checks each scene's code fits toons'
  20,000 characters (it cuts the rest silently) and each pose drawn exists
  and fits its view (legs pointed behind or striding only in a three-quarter view, a
  stride only in the air); it plays the live dancer too, ten minutes of
  `demoAt` at each width, its keyframes checked in time order as they're
  added. `claude plugin test .` runs the engine tests.
- **`scripts/`**: `play.ts` plays it in a terminal (`--live` the live
  dancer, `terminal.sh piece live` to photograph it) and `frames.ts` (`--live` too) prints
  frames for `gif.py`, which draws the README's GIFs under a spinner line
  (the commands are in the README). For the live GIFs, `--story` plays
  `storyAt` (live.ts), a session told as real tool calls read by `actOf`,
  so the labels are the real ones (`git status`, `read README.md`, a test
  that fails and then passes; the person wanted the GIF to show Claude
  reading and using git), and `--agents` keeps four of the corps on, each
  dancing its agent's calls.
  toons runs its scripts with bun; here they run under Node 24 with
  `--experimental-transform-types` (toons' interpreter uses parameter
  properties), and `resolve.ts` lets the extensionless imports resolve.
- `claude plugin validate .` checks the manifest and hooks. Once Claude Code
  has loaded the plugin it writes `.claude-plugin/types/`, and `tsc -p .`
  type-checks.
