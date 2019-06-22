
import { Label } from '@/interfaces/app'

import uuid from 'uuid'

interface States {
  labels: Label[]
}

interface Mutations {
  save: () => void
  getSavedData: () => void
  [key: string]: (state: States, payload: any) => any
}

interface Getters {
  getLabelNodeFromArrayPath: () => (nodePath: string[]) => Label | undefined
  labelPathById: () => (id: string) => string[] | undefined
  smartLabels: () => Label[]
  nonSmartLabels: () => Label[]
  [key: string]: (state: States, getters: any, rootState: States, rootGetters: any) => any
}

interface ActionContext {
  state: States
  getters: Getters
  commit: (mutation: string, payload?: any) => void
  dispatch: (action: string) => void
}


interface Actions {
  addLabelFromArrayPath: (context: ActionContext, path: string[]) => void
  [key: string]: (context: ActionContext, payload: any) => any
}

export default {
  namespaced: true,
  state: {
    labels: [],
  } as States,
  mutations: {
    save(state: States): void {
      if (!localStorage.getItem('watchrIsLogged')) {
        localStorage.setItem('watchrLabels', JSON.stringify(state.labels))
      }
    },
    getSavedData(state: States): void {
      if (!localStorage.getItem('watchrIsLogged')) {
        state.labels = JSON.parse(localStorage.getItem('watchrLabels') as any)
      }
    },
  } as Mutations,
  getters: {
    getLabelNodeFromArrayPath: (state: States) => (nodePath: string[]): Label | undefined => {
      if (state.labels.length === 0) {
        return undefined
      }
      const walk = (labels: Label[], path: string[]): Label | undefined => {
        const targetLabelName: string | undefined = path.shift()
        if (targetLabelName === undefined) {
          return undefined
        }
        for (const label of labels) {
          if (label.name === targetLabelName && path.length === 0) {
            return label
          } else if (label.name === targetLabelName) {
            return walk(label.subLabels, path)
          }
        }
        return undefined
      }
      return walk(state.labels, nodePath.slice())
    },
    labelPathById: (state: States) => (id: string): string[] | undefined => {
      const walk = (labels: Label[], path: string[]): string[] | undefined => {
        for (const lab of labels) {
          if (lab.id === id) {
            path.push(lab.name)
            return path
          }
          const sliced = path.slice()
          sliced.push(lab.name)
          const childPath: string[] | undefined = walk(lab.subLabels, sliced)
          if (childPath !== undefined) {
            return childPath
          }
        }
        return undefined
      }
      return walk(state.labels, [])
    },
    smartLabels(state: States): Label[] {
      return state.labels.filter((el: Label) => el.smart)
    },
    nonSmartLabels(state: States): Label[] {
      return state.labels.filter((el: Label) => !el.smart)
    },
  } as Getters,
  actions: {
    setDefaultData({state, commit}): void {
      state.labels = [
        {name: 'Someday', id: uuid(), smart: true, subLabels: []},
        {name: 'Anytime', id: uuid(), smart: true, subLabels: []},
      ]
      commit('save')
    },
    updateLabels({state, commit}, labels: Label[]): void {
      state.labels = labels
      commit('save')
    },
    addLabelFromArrayPath({state, commit}, nodePath: string[]): void {
      const walk = (labels: Label[], path: string[]): void => {
        const targetLabelName: string | undefined = path.shift()
        if (targetLabelName !== undefined) {
          const label: Label | undefined = labels.find((el: Label) => {
            return el.name === targetLabelName
          })
          if (label === undefined) {
            if (targetLabelName !== '') {
              labels.push({
                smart: false,
                name: targetLabelName,
                id: uuid(),
                subLabels: [],
              })
              walk(labels[labels.length - 1].subLabels, path)
            }
          } else {
            walk(label.subLabels, path)
          }
        }
      }
      walk(state.labels, nodePath.slice())
      commit('save')
    },
  } as Actions,
}
