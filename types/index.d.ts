export type Best = number

declare module 'claude-code' {
  interface PluginState {
    'dino-game': { isHidden: boolean; best: Best }
  }
}
