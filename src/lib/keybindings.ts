export type KeymapMode = 'default' | 'vim'

export interface KeyAction {
  action: string
  key: string
}

// Map from logical actions to key names
export interface KeyMap {
  moveUp: string[]
  moveDown: string[]
  pageUp: string[]
  pageDown: string[]
  jumpTop: string[]
  jumpBottom: string[]
  select: string[]
  back: string[]
  search: string[]
}

const DEFAULT_KEYMAP: KeyMap = {
  moveUp: ['up'],
  moveDown: ['down'],
  pageUp: ['pageup'],
  pageDown: ['pagedown'],
  jumpTop: ['home'],
  jumpBottom: ['end'],
  select: ['return'],
  back: ['escape'],
  search: ['/'],
}

const VIM_KEYMAP: KeyMap = {
  moveUp: ['up', 'k'],
  moveDown: ['down', 'j'],
  pageUp: ['pageup', 'ctrl+u'],
  pageDown: ['pagedown', 'ctrl+d'],
  jumpTop: ['home'],  // gg requires two-key chord handling
  jumpBottom: ['end', 'shift+g'],
  select: ['return'],
  back: ['escape'],
  search: ['/'],
}

export function getKeyMap(mode: KeymapMode): KeyMap {
  switch (mode) {
    case 'vim':
      return VIM_KEYMAP
    case 'default':
      return DEFAULT_KEYMAP
  }
}

export function matchesAction(keyName: string, action: keyof KeyMap, keyMap: KeyMap): boolean {
  return keyMap[action].includes(keyName)
}

export function resolveKeyAction(keyName: string, keyMap: KeyMap): (keyof KeyMap) | null {
  for (const [action, keys] of Object.entries(keyMap)) {
    if (keys.includes(keyName)) {
      return action as keyof KeyMap
    }
  }
  return null
}
