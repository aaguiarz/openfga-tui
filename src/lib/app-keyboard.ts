import type { View } from './navigation.ts'

export interface AppKeyInput {
  keyName: string
  helpVisible: boolean
  viewKind: View['kind']
}

export interface AppKeyResult {
  helpVisible: boolean
  shouldGoBack: boolean
}

export function handleAppKey({ keyName, helpVisible, viewKind }: AppKeyInput): AppKeyResult {
  if (keyName === '?') {
    return {
      helpVisible: !helpVisible,
      shouldGoBack: false,
    }
  }

  if (helpVisible) {
    if (keyName === 'escape') {
      return {
        helpVisible: false,
        shouldGoBack: false,
      }
    }

    return {
      helpVisible,
      shouldGoBack: false,
    }
  }

  if (keyName === 'escape' && (viewKind === 'store-overview' || viewKind === 'model')) {
    return {
      helpVisible,
      shouldGoBack: true,
    }
  }

  return {
    helpVisible,
    shouldGoBack: false,
  }
}
