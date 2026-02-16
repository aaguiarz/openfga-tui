export type View =
  | { kind: 'connect' }
  | { kind: 'stores' }
  | { kind: 'store-overview'; storeId: string }
  | { kind: 'model'; storeId: string }
  | { kind: 'tuples'; storeId: string }
  | { kind: 'queries'; storeId: string }

export type NavigationAction =
  | { type: 'navigate'; view: View }
  | { type: 'back' }

export function navigationReducer(state: View, action: NavigationAction): View {
  switch (action.type) {
    case 'navigate':
      return action.view
    case 'back':
      return getParentView(state)
  }
}

export function getParentView(view: View): View {
  switch (view.kind) {
    case 'connect':
      return view // Already at root
    case 'stores':
      return { kind: 'connect' }
    case 'store-overview':
      return { kind: 'stores' }
    case 'model':
    case 'tuples':
    case 'queries':
      return { kind: 'store-overview', storeId: view.storeId }
  }
}

export function getBreadcrumb(view: View): string[] {
  switch (view.kind) {
    case 'connect':
      return ['Connect']
    case 'stores':
      return ['Stores']
    case 'store-overview':
      return ['Stores', truncateId(view.storeId)]
    case 'model':
      return ['Stores', truncateId(view.storeId), 'Model']
    case 'tuples':
      return ['Stores', truncateId(view.storeId), 'Tuples']
    case 'queries':
      return ['Stores', truncateId(view.storeId), 'Queries']
  }
}

function truncateId(id: string): string {
  return id.length > 12 ? id.slice(0, 12) + '...' : id
}

export function getViewKeybindHints(view: View): string {
  switch (view.kind) {
    case 'connect':
      return '[Tab] next field  [Enter] connect'
    case 'stores':
      return '[↑↓] navigate  [Enter] select  [c]reate  [d]elete  [r]efresh'
    case 'store-overview':
      return '[m]odel  [t]uples  [q]ueries  [Esc] back'
    case 'model':
      return '[e]dit  [v]ersion  [y]ank  [r]efresh  [Esc] back'
    case 'tuples':
      return '[↑↓] navigate  [a]dd  [d]elete  [r]efresh  [/]filter  [Esc] back'
    case 'queries':
      return '[Tab] switch tab  [Enter] run  [Esc] back'
  }
}
