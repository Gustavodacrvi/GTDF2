
import { Task } from '@/interfaces/app'

import { States as RootState } from '@/store/index'

interface States {
  tasks: Task[]
}

interface Getters {
  inboxTasks: () => Task[]
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
  // tslint:disable-next-line:max-line-length
  updateTask: (context: ActionContext, obj: {name: string, priority: string, id: string, labels: []}) => void
  // tslint:disable-next-line:max-line-length
  addTask: (context: ActionContext, obj: {task: Task, perspectiveId: string, position: number, order: string[]}) => void
  addTaskLabel: (context: ActionContext, obj: {task: Task, labelId: string, position: number, order: string[]}) => void
  deleteTasksById: (context: ActionContext, ids: string[]) => void
  changePrioritysByIds: (context: ActionContext, obj: {ids: string[], priority: string}) => void
  [key: string]: (context: ActionContext, payload: any) => any
}

export default {
  namespaced: true,
  state: {
    tasks: [],
  } as States,
  mutations: {

  } as Mutations,
  getters: {
    inboxTasks(state: States) {
      return state.tasks.filter(el => el.labels.length === 0)
    },
  } as Getters,
  actions: {
    getData({ rootState, state }) {
      if (rootState.firestore && rootState.uid)
        rootState.firestore.collection('tasks').where('userId', '==', rootState.uid).onSnapshot(snap => {
          const changes = snap.docChanges()
          for (const change of changes)
            if (change.type === 'added') {
              const lab = state.tasks.find(el => el.id === change.doc.id)
              if (!lab)
                state.tasks.push({...change.doc.data(), id: change.doc.id} as any)
            } else if (change.type === 'removed') {
              const index = state.tasks.findIndex(el => el.id === change.doc.id)
              state.tasks.splice(index, 1)
            } else {
              const index = state.tasks.findIndex(el => el.id === change.doc.id)
              state.tasks.splice(index, 1, {...change.doc.data(), id: change.doc.id} as any)
            }
        })
    },
    updateTask({ rootState }, {name, priority, id, labels}) {
      if (rootState.firestore && rootState.uid)
        rootState.firestore.collection('tasks').doc(id).update({
          name, priority, labels,
        })
    },
    deleteTasksById({ rootState }, ids: string[]) {
      if (rootState.firestore && rootState.uid) {
        const batch = rootState.firestore.batch()

        for (const id of ids) {
          const ref = rootState.firestore.collection('tasks').doc(id)
          batch.delete(ref)
        }

        batch.commit()
      }
    },
    addTask({ rootState }, {task, perspectiveId, order, position}) {
      if (rootState.firestore && rootState.uid) {
        const batch = rootState.firestore.batch()

        const ord = order.slice()
        const ref = rootState.firestore.collection('tasks').doc()
        ord.splice(position, 0, ref.id)
        batch.set(ref, {
          name: task.name,
          priority: task.priority,
          userId: rootState.uid,
          labels: task.labels,
        })
        const persRef = rootState.firestore.collection('perspectives').doc(perspectiveId)
        batch.update(persRef, {
          order: ord,
        })

        batch.commit()
      }
    },
    changePrioritysByIds({ rootState }, {ids, priority}) {
      if (rootState.firestore && rootState.uid) {
        const batch = rootState.firestore.batch()

        for (const id of ids) {
          const ref = rootState.firestore.collection('tasks').doc(id)
          batch.update(ref, {
            priority,
          })
        }

        batch.commit()
      }
    },
    addTaskLabel({ rootState }, {task, labelId, order, position}) {
      if (rootState.firestore && rootState.uid) {
        const batch = rootState.firestore.batch()

        const ord = order.slice()
        const ref = rootState.firestore.collection('tasks').doc()
        ord.splice(position, 0, ref.id)
        batch.set(ref, {
          name: task.name,
          priority: task.priority,
          userId: rootState.uid,
          labels: task.labels,
        })
        const persRef = rootState.firestore.collection('labels').doc(labelId)
        batch.update(persRef, {
          order: ord,
        })

        batch.commit()
      }
    },
  } as Actions,
}
