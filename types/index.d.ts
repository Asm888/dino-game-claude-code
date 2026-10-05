export type Best = number

declare module 'claude-code' {
  interface PluginState {
    dino: { isHidden: boolean; best: Best }
  }
}
