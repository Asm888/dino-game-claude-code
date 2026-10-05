# 🦖 Dino for Claude Code

Chrome's offline dinosaur game, right above the prompt in Claude Code. Play while Claude works.

## Install

```bash
claude plugin marketplace add Asm888/dino-game-claude-code
claude plugin install dino@dino-marketplace
```

Or open `/plugin` in an interactive `claude` session and pick **dino**.

Requires Claude Code 2.1.286 or newer (plugin hook modules with `Client` surfaces). Works in the terminal and the desktop app's Code tab.

## How to play

- **Click the game** to give it keyboard focus (Esc gives it back to the prompt).
- **Space / ↑ / Enter / W** or a mouse click: jump.
- Jump over cacti and low pterodactyls; run under the high ones.
- The game speeds up as you go. Your high score (`HI`) is kept across sessions.

## Commands

- `/dino`: hide or show the game above the prompt.
  You can also collapse the band with its `[-]` button.

## Files

- `hooks/register.tsx`: draws the game above the prompt, the `/dino` command, saves the high score.
- `hooks/game.tsx`: the game itself: physics, obstacles, pixel rendering.
- `types/index.d.ts`: types for the plugin's session state.

## License

MIT
