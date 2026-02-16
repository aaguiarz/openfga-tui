export type FormStatus =
  | { state: 'idle' }
  | { state: 'connecting' }
  | { state: 'success'; message: string }
  | { state: 'error'; message: string }

export type FormAction =
  | { type: 'connect' }
  | { type: 'success'; message: string }
  | { type: 'error'; message: string }
  | { type: 'reset' }

export function formStatusReducer(_state: FormStatus, action: FormAction): FormStatus {
  switch (action.type) {
    case 'connect':
      return { state: 'connecting' }
    case 'success':
      return { state: 'success', message: action.message }
    case 'error':
      return { state: 'error', message: action.message }
    case 'reset':
      return { state: 'idle' }
  }
}
