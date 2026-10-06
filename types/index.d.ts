// What clawd-ballet keeps in the session's state (`$.state`).

// Each load of the plugin's code marks the session as its own: a hot reload
// writes a new mark, and the animation loop of the load before stops at it.
export type BalletLoad = string

declare module 'claude-code' {
  interface PluginState {
    'clawd-ballet': { load: BalletLoad }
  }
}
