
import { SmartPerspective } from '@/interfaces/app'

import { States as RootState } from '@/store/index'

interface States {
  smartPerspectives: SmartPerspective[]
  customPerspectives: SmartPerspective[]
  smartOrder: string[]
  customOrder: string[]
}


interface Getters {
  sortedSmartPerspectives: (state: States) => void
  pinedSmartPerspectives: (state: States, getters: Getters) => void
}

interface Mutations {

}

interface ActionContext {
  state: States
  getters: Getters
  commit: (mutation: string, payload?: any) => void
  dispatch: (action: string, payload?: any) => void
  rootState: RootState
}

interface Actions {
  getData: (context: ActionContext) => void
  addDefaultSmartPerspectives: (context: ActionContext) => void
  saveSmartOrder: (context: ActionContext, ids: string[]) => void
  togglePerspectivePin: (context: ActionContext, obj: {id: string, pin: boolean}) => void
  [key: string]: (context: ActionContext, payload: any) => any
}

export default {
  namespaced: true,
  state: {
    smartPerspectives: [],
    smartOrder: [],
    customOrder: [],
    customPerspectives: [],
  } as States,
  mutations: {

  } as Mutations,
  getters: {
    sortedSmartPerspectives(state: States): SmartPerspective[] {
      const sorted: SmartPerspective[] = []
      for (const id of state.smartOrder) {
        const lab: SmartPerspective | undefined = state.smartPerspectives.find(el => el.id === id)
        if (lab)
          sorted.push(lab)
      }
      return sorted
    },
    pinedSmartPerspectives(state: States, getters: Getters): SmartPerspective[] {
      const pers: SmartPerspective[] = getters.sortedSmartPerspectives as any
      return pers.filter(el => el.pin)
    },
  } as Getters,
  actions: {
    saveSmartOrder({ rootState, state }, ids) {
      console.log('save smart order')
      if (rootState.firestore && rootState.uid)
      rootState.firestore.collection('perspectivesOrder').doc(rootState.uid)
        .update({
          smartOrder: ids,
        })
    },
    togglePerspectivePin({ rootState, state }, {id, pin}) {
      if (rootState.firestore && rootState.uid) {
        let collection: 'smartPerspectives' | 'customPerspectives' = 'smartPerspectives'
        let per: any = state.smartPerspectives.find(el => el.id === id)
        let finalPin: boolean = false
        if (!per) { {
          collection = 'customPerspectives'
          per = state.customPerspectives.find(el => el.id === id)
        }
        }
        finalPin = !per.pin
        if (pin)
          finalPin = pin
        rootState.firestore.collection(collection).doc(id).update({
          pin: finalPin,
        })
      }
    },
    getData({ rootState, state, dispatch }) {
      if (rootState.firestore && rootState.uid) {
        const ordersRef = rootState.firestore.collection('perspectivesOrder').where('userId', '==', rootState.uid)
        ordersRef.get().then(snap => {
          const changes = snap.docChanges()
          for (const change of changes) {
            state.smartOrder = change.doc.data().smartOrder
            state.customOrder = change.doc.data().customOrder
          }
          if (state.smartOrder.length === 0)
            dispatch('addDefaultSmartPerspectives')
          ordersRef.onSnapshot(snap => {
            const changes = snap.docChanges()
            for (const change of changes) {
              state.smartOrder = change.doc.data().smartOrder
              state.customOrder = change.doc.data().customOrder
            }
          })
        })
        rootState.firestore.collection('smartPerspectives').where('userId', '==', rootState.uid).onSnapshot(snap => {
          const changes = snap.docChanges()
          for (const change of changes)
            if (change.type === 'added') {
              const lab = state.smartPerspectives.find(el => el.id === change.doc.id)
              if (!lab)
                state.smartPerspectives.push({...change.doc.data(), id: change.doc.id} as any)
            } else if (change.type === 'removed') {
              const index = state.smartPerspectives.findIndex(el => el.id === change.doc.id)
              state.smartPerspectives.splice(index, 1)
            } else {
              const index = state.smartPerspectives.findIndex(el => el.id === change.doc.id)
              state.smartPerspectives.splice(index, 1, {...change.doc.data(), id: change.doc.id} as any)
            }
        })
      }
    },
    addDefaultSmartPerspectives({ rootState }) {
      if (rootState.firestore && rootState.uid) {
        const batch = rootState.firestore.batch()

        const perspectives: any[] = [
          {
            name: 'Today',
            pin: true,
            numberOfTasks: true,
            icon: 'calendar-day',
            iconColor: '#FFE366',
          },
          {
            name: 'Inbox',
            pin: true,
            numberOfTasks: true,
            icon: 'inbox',
            iconColor: '#83B7E2',
          },
          {
            name: 'Upcoming',
            pin: true,
            numberOfTasks: false,
            icon: 'calendar-alt',
            iconColor: '#FF6B66',
          },
          {
            name: 'Anytime',
            pin: true,
            numberOfTasks: false,
            icon: 'layer-group',
            iconColor: '#88DDB7',
          },
          {
            name: 'Someday',
            pin: true,
            numberOfTasks: false,
            icon: 'archive',
            iconColor: '#E2B983',
          },
        ]

        const ids: string[] = []
        for (const per of perspectives) {
          const ref = rootState.firestore.collection('smartPerspectives').doc()
          ids.push(ref.id)
          batch.set(ref, {
            userId: rootState.uid,
            name: per.name,
            numberOfTasks: per.numberOfTasks,
            pin: per.pin,
            icon: per.icon,
            iconColor: per.iconColor,
          } as SmartPerspective)
        }
        const ref = rootState.firestore.collection('perspectivesOrder').doc(rootState.uid)
        batch.set(ref, {
          userId: rootState.uid,
          smartOrder: ids,
          customOrder: [],
        })
        console.log('add default perspectives')

        batch.commit()
      }
    },
  } as Actions,
}
