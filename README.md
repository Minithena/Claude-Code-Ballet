# ballet-clawd

Clawd, the Claude Code mascot, in a pink tutu as on its ballet sticker,
dancing a little ballet on a little stage just above the prompt while Claude works. It is a
[claude-toons](https://github.com/achimala/claude-toons) scene, drawn by
toons' own renderer, so it looks and moves like toons: the same Clawd, the
same faint animated backdrop, the same speech bubbles. But it's one
choreographed scene instead of a director model, so it makes no requests and
costs nothing.

![Clawd dancing ballet above the prompt](docs/demo.gif)

Fifteen pieces take turns, the acts of each ballet in order (Swan Lake
in four, the Nutcracker in two, Mayerling in three, a Wayne McGregor
triple bill), one per turn, each dissolving into the next if
Claude works long enough:

- **Gala**: a stage with velvet curtains and a spotlight. The curtains
  part, a bourrée in from the wing, the count-in, pliés and port de bras, triple pirouettes, a
  développé, grand jetés across the stage, an arabesque, and a révérence as
  roses land at Clawd's feet, and the curtains close.
- **Swan Lake**, in four acts. I: the palace garden at dusk, the
  prince's birthday, a pas de trois, a crossbow, swans flying over. II:
  the lake at midnight (below). III: the ball; Odile, the black swan, her
  32 fouettés (counted on screen), the prince swears to the wrong swan.
  IV: the lake before dawn; forgiveness, Rothbart's owl in a storm, and
  the sun coming up on a happy ending. Act II: The swan glides in with its arms
  beating like wings, holds an arabesque, turns, and the little swans dance
  in a line, arms linked (on a wide enough strip). Then the dying swan, as
  von Rothbart's owl crosses the moon... who feels better.
- **Nutcracker**, in two acts. I: Christmas Eve; Drosselmeyer's gift,
  midnight, the tree growing, the mice and their king, Clara's slipper,
  the prince, the land of snow. II: snow falling by a lit tree. The Sugar Plum Fairy turns
  across the stage, jumps, développés, leaps and does fouettés.
- **Firebird**: the enchanted garden at night, by the tree of golden
  apples. The Firebird flies in trailing embers, steals an apple, is caught,
  leaves a feather, dances the infernal dance (turns, a tour en l'air,
  entrechats), sings the lullaby and flies off.
- **Mayerling**, in three acts. I: the wedding ball at the Hofburg,
  chandeliers and parquet; Rudolf (in breeches and boots) and Princess
  Stephanie bow and waltz, she twirls under his arm, and he turns his back
  and dances alone. II: Mitzi Caspar's tavern; the Hungarian officers
  stamp, clap and turn in the air together, Mitzi dances among them and
  with Rudolf, and laughs off his talk of dying. III: the hunting lodge,
  green velvet and candlelight; Mary Vetsera (in ivory) and Rudolf: the
  pull, her turns in his arms, her flight and return, and the enveloping
  kiss, Mary held upside down above Rudolf on his knees. The lights close
  in, go to black, and... pop! Champagne. Just kidding, they're fine.
- **Wayne McGregor**, a triple bill. Chroma: John Pawson's white room,
  sharp snapping phrases, a duet pulling off balance, canon. Infra: Julian
  Opie's LED walkers along the top, couples in boxes of light, a crowd
  walking past one woman crying until one stops. Untitled, 2023: Carmen
  Herrera's white canvas cut with green, a trio in green and cream,
  frozen, slow, a burst, one long slow turn. (McGregor's extreme lines
  are beyond Clawd's block of a body, so it's in the staging.)
- **Class**: the studio barre, with the teacher counting from the piano,
  its metronome ticking. Pliés, kicks, a
  balance, then pirouettes, sautés and a bow in the center.

Clawd is drawn as on the official stickers (the ballet one above all):
the same block, two arm stubs and four little legs, a pink checked tutu,
and three-quarter views with the far side in shade when it turns. It talks
through the dance in speech bubbles, a little differently each time round. A frame takes about
a millisecond to draw.

An independent project, not affiliated with or endorsed by Anthropic.

## Install

You need Claude Code with plugin hook modules, an early-access feature
(built against 2.1.288).

1. Try it for one session:

   ```sh
   claude --plugin-dir "/Users/athenaba/Projects/mods cc/ballet-clawd"
   ```

2. To load it in every session, add the folder to the `env` block of
   `~/.claude/settings.json`, then restart Claude Code:

   ```json
   {
     "env": {
       "CLAUDE_CODE_PLUGIN_DIRS": "/Users/athenaba/Projects/mods cc/ballet-clawd"
     }
   }
   ```

   If you also use claude-toons, separate the two folders with `:`; both
   would draw while Claude works, so you'll likely want only one.

**Nothing shows up?** Run `claude --debug` and look for a `ballet-clawd`
line. If it says hook modules are turned off, your Claude Code doesn't have
the feature switched on yet.

## Using it

- **`/ballet`** shows or hides the dancer, even mid-task. `/ballet on` and
  `/ballet off` also work. The choice is remembered across sessions.
- **`/ballet gala`**, **`swan`**, **`nutcracker`**, **`firebird`**,
  **`mayerling`**, **`chroma`**, **`infra`**, **`untitled`** or **`class`**
  picks the piece the next turn starts with (a ballet in acts starts at its
  first act).

## Preview without Claude Code

```sh
node --experimental-transform-types scripts/play.ts --piece 1   # plays a piece (0-14) in the terminal; Ctrl-C stops
node --experimental-transform-types scripts/frames.ts --piece 0 | python3 scripts/gif.py docs/demo.gif   # needs Pillow
```

## License

MIT. `hooks/script.ts`, `lang.ts`, `effects.ts`, `clawd.ts` and `render3d.ts`
are from claude-toons, MIT, Copyright (c) 2026 Anshu Chimala; see
`LICENSE-claude-toons`.
