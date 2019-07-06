
export interface Alert {
  name: string
  duration: number | null
  type: 'error' | 'normal' | 'success' | 'warning'
  btn?: string
  callback?: () => void
}

export interface SimpleAdder {
  popUpTitle: string
  buttonName: string
  inputPlaceholder: string
  inputMaximumCharacters: number
  callback: (input: string) => void
}

export interface FloatingButton {
  icon: string
  iconColor: string
  backColor: string
  click?: () => void
}

export interface Label {
  userId: string
  name: string
  id: string
}

export interface List {
  parentId: string | null
  elementId?: string
  level: number
}

export interface ListIcon {
  icon: string
  iconColor: string
  size: string
  name?: string
  callback?: (...arr: any[]) => void
}
