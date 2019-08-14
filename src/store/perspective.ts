
import { Perspective, Task } from '@/interfaces/app'

import { States as RootState } from '@/store/index'
import appUtils from '@/utils/app'

interface Pers {
  name: string
  description: string
  iconColor: string
  icon: string
  alwaysShowTaskLabels: boolean
  alwaysShowLastEditDate: boolean
  alwaysShowCreationDate: boolean
}

interface States {
  perspectives: Perspective[]
  smartOrder: string[]
  customOrder: string[]
}

interface Getters {
  sortedSmartPerspectives: (state: States) => Perspective[]
  smartFilters: (state: States, getters: Getters) => Perspective[]
  sortedCustomPerspectives: (state: States) => Perspective[]
  getPerspectiveByName: (state: States) => (name: string) => Perspective
  pinedSmartPerspectives: (state: States, getters: Getters) => void
  pinedCustomPerspectives: (state: States, getters: Getters) => void
  initialPerspective: (state: States, getters: Getters) => void
  getPerspectiveById: (state: States) => (id: string) => Perspective
  getNumberOfTasksByPerspectiveId: (state: States, f: any, rootState: any) => (id: string, tasks: Task[]) => number
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
  deletePerspectivesById: (context: ActionContext, ids: string[]) => void
  getData: (context: ActionContext) => void
  addDefaultPerspectives: (context: ActionContext, obj: {id: string, someday: string, anytime: string}) => void
  saveSmartOrder: (context: ActionContext, ids: string[]) => void
  saveCustomOrder: (context: ActionContext, ids: string[]) => void
  addSmartPersFilter: (context: ActionContext, obj: {id: string, persName: string}) => void
  removeSmartPersFilter: (context: ActionContext, obj: {id: string, persName: string}) => void
  togglePerspectivesPin: (context: ActionContext, arr: Array<{id: string, pin: boolean}>) => void
  togglePerspectivesNumberOfTasks: (context: ActionContext, arr: Array<{id: string, show: boolean}>) => void
  togglePerspectivesShowWhenNotEmpty: (context: ActionContext, arr: Array<{id: string, show: boolean}>) => void
  saveTaskOrder: (context: ActionContext, obj: {id: string, order: string[]}) => void
  addLabelToPerspective: (context: ActionContext, obj: {id: string, labelId: string}) => void
  removeLabelFromPerspective: (context: ActionContext, obj: {id: string, labelId: string}) => void
  savePerspectivePriority: (context: ActionContext, obj: {id: string, priority: string}) => void
  addPerspectiveSort: (context: ActionContext, obj: {sort: string, perspectiveId: string}) => void
  savePerspectiveTaskSort: (context: ActionContext, obj: {sort: string[], perspectiveId: string}) => void
  addPerspective: (context: ActionContext, obj: Pers) => void
  editPerspective: (context: ActionContext, obj: Pers & {id: string}) => void
  saveSmartPerspective: (context: ActionContext, obj: {
    alwaysShowTaskLabels: boolean,
    alwaysShowLastEditDate: boolean,
    alwaysShowCreationDate: boolean,
    id: string,
  }) => void
  [key: string]: (context: ActionContext, payload: any) => any
}

export default {
  namespaced: true,
  state: {
    smartOrder: [],
    customOrder: [],
    perspectives: [],
  } as States,
  mutations: {

  } as Mutations,
  getters: {
    getNumberOfTasksByPerspectiveId: (state: States, f: any, rootState: any) => (id: string, tasks: Task[]) => {
      const per: Perspective = state.perspectives.find(el => el.id === id) as Perspective
      return appUtils.filterTasksByPerspective(per, tasks, rootState.settings.startOfTheWeek).length
    },
    getPerspectiveByName: (state: States) => (name: string): Perspective => {
      return state.perspectives.find(el => el.name === name) as Perspective
    },
    sortedSmartPerspectives(state: States): Perspective[] {
      const smart = state.perspectives.filter(el => el.isSmart)
      // tslint:disable-next-line:max-line-length
      return appUtils.sortArrayByIds(smart, appUtils.fixOrder(smart, state.smartOrder))
    },
    smartFilters(state: States, getters: Getters) {
      const filters: string[] = [
        'Inbox',
        'Today',
        'Have tags',
        `Doesn't have tags`,
        'Next week',
        'Next month',
        'Overdue',
        'Tomorrow',
      ]
      const pers = getters.sortedSmartPerspectives as any
      return pers.filter((el: Perspective) => filters.includes(el.name))
    },
    pinedSmartPerspectives(state: States, getters: Getters): Perspective[] {
      const pers: Perspective[] = getters.sortedSmartPerspectives as any
      return pers.filter(el => el.pin)
    },
    pinedCustomPerspectives(state: States, getters: Getters): Perspective[] {
      const pers: Perspective[] = getters.sortedCustomPerspectives as any
      return pers.filter(el => el.pin)
    },
    sortedCustomPerspectives(state: States): Perspective[] {
      const custom = state.perspectives.filter(el => !el.isSmart)
      // tslint:disable-next-line:max-line-length
      return appUtils.sortArrayByIds(custom, appUtils.fixOrder(custom, state.customOrder))
    },
    getPerspectiveById: (state: States) => (id: string) => {
      return state.perspectives.find(el => el.id === id)
    },
    initialPerspective(state: States, getters: any) {
      if (getters.pinedSmartPerspectives[0])
        return getters.pinedSmartPerspectives[0].name
      else if (getters.pinedCustomPerspectives[0])
        return getters.pinedCustomPerspectives[0].name
    },
  } as Getters,
  actions: {
    addPerspective({ rootState }, obj) {
      if (rootState.firestore && rootState.uid)
        rootState.firestore.collection('perspectives').add({
          userId: rootState.uid,
          order: [],
          sort: [],
          size: 'lg',
          isSmart: false,
          priority: '',
          pin: false,
          numberOfTasks: false,
          showWhenNotEmpty: false,
          excludeLabels: [],
          excludeSmartPers: [],
          includeAndSmartPers: [],
          includeOrSmartPers: [],
          includeAndLabels: [],
          includeOrLabels: [],
          ...obj,
        })
    },
    editPerspective({ rootState, state }, obj) {
      if (rootState.firestore && rootState.uid)
        rootState.firestore.collection('perspectives').doc(obj.id).update({
          ...obj,
        })
    },
    addLabelToPerspective({ rootState }, {id, labelId}) {
      const fire = rootState.firebase.firestore.FieldValue as any
      if (rootState.firestore && rootState.uid)
        rootState.firestore.collection('perspectives').doc(id).update({
          includeAndLabels: fire.arrayUnion(labelId),
        })
    },
    addSmartPersFilter({ rootState }, {id, persName}) {
      const fire = rootState.firebase.firestore.FieldValue as any
      if (rootState.firestore && rootState.uid)
        rootState.firestore.collection('perspectives').doc(id).update({
          includeAndSmartPers: fire.arrayUnion(persName),
        })
    },
    savePerspectivePriority({ rootState }, {id, priority}) {
      if (rootState.firestore && rootState.uid)
        rootState.firestore.collection('perspectives').doc(id).update({
          priority,
        })
    },
    removeLabelFromPerspective({ rootState }, {id, labelId}) {
      const fire = rootState.firebase.firestore.FieldValue as any
      if (rootState.firestore && rootState.uid)
        rootState.firestore.collection('perspectives').doc(id).update({
          includeAndLabels: fire.arrayRemove(labelId),
        })
    },
    removeSmartPersFilter({ rootState }, {id, persName}) {
      const fire = rootState.firebase.firestore.FieldValue as any
      if (rootState.firestore && rootState.uid)
        rootState.firestore.collection('perspectives').doc(id).update({
          includeAndSmartPers: fire.arrayRemove(persName),
        })
    },
    saveSmartOrder({ rootState }, ids) {
      if (rootState.firestore && rootState.uid)
      rootState.firestore.collection('perspectivesOrder').doc(rootState.uid)
        .update({
          smartOrder: ids,
        })
    },
    saveCustomOrder({ rootState }, ids) {
      if (rootState.firestore && rootState.uid)
        rootState.firestore.collection('perspectivesOrder').doc(rootState.uid)
          .update({
            customOrder: ids,
          })
    },
    togglePerspectivesPin({ rootState, state }, pins) {
      if (rootState.firestore && rootState.uid) {
        const batch = rootState.firestore.batch()

        for (const pin of pins) {
          const per: any = state.perspectives.find(el => el.id === pin.id)
          let finalPin: boolean = !per.pin
          if (pin.pin)
            finalPin = pin.pin
          const ref = rootState.firestore.collection('perspectives').doc(pin.id)
          batch.update(ref, {
            pin: finalPin,
          })
        }

        batch.commit()
      }
    },
    deletePerspectivesById({ rootState }, ids) {
      if (rootState.firestore && rootState.uid) {
        const batch = rootState.firestore.batch()

        for (const id of ids) {
          const ref = rootState.firestore.collection('perspectives').doc(id)
          batch.delete(ref)
        }

        batch.commit()
      }
    },
    saveSmartPerspective({ rootState }, obj) {
      if (rootState.firestore && rootState.uid)
        rootState.firestore.collection('perspectives').doc(obj.id).update({
          alwaysShowCreationDate: obj.alwaysShowCreationDate,
          alwaysShowLastEditDate: obj.alwaysShowLastEditDate,
          alwaysShowTaskLabels: obj.alwaysShowTaskLabels,
        })
    },
    togglePerspectivesNumberOfTasks({ rootState, state }, arr) {
      if (rootState.firestore && rootState.uid) {
        const batch = rootState.firestore.batch()

        for (const show of arr) {
          const per: any = state.perspectives.find(el => el.id === show.id)
          let finalShow = !per.numberOfTasks
          if (show.show)
            finalShow = show.show
          const ref = rootState.firestore.collection('perspectives').doc(show.id)
          batch.update(ref, {
            numberOfTasks: finalShow,
          })
        }

        batch.commit()
      }
    },
    togglePerspectivesShowWhenNotEmpty({ rootState, state }, arr) {
      if (rootState.firestore && rootState.uid) {
        const batch = rootState.firestore.batch()

        for (const show of arr) {
          const per: any = state.perspectives.find(el => el.id === show.id)
          let finalShow = !per.showWhenNotEmpty
          if (show.show)
            finalShow = show.show
          const ref = rootState.firestore.collection('perspectives').doc(show.id)
          batch.update(ref, {
            showWhenNotEmpty: finalShow,
          })
        }

        batch.commit()
      }
    },
    saveTaskOrder({ rootState }, {id, order}) {
      if (rootState.firestore && rootState.uid)
        rootState.firestore.collection('perspectives').doc(id).update({
          order,
        })
    },
    getData({ rootState, state }) {
      if (rootState.firestore && rootState.uid) {
        rootState.firestore.collection('perspectivesOrder').where('userId', '==', rootState.uid).onSnapshot(snapS => {
          const changs = snapS.docChanges()
          for (const change of changs) {
            state.smartOrder = change.doc.data().smartOrder
            state.customOrder = change.doc.data().customOrder
          }
        })
        rootState.firestore.collection('perspectives').where('userId', '==', rootState.uid).onSnapshot(snap => {
          const changes = snap.docChanges()
          for (const change of changes)
            if (change.type === 'added') {
              const lab = state.perspectives.find(el => el.id === change.doc.id)
              if (!lab)
                state.perspectives.push({...change.doc.data(), id: change.doc.id} as any)
            } else if (change.type === 'removed') {
              const index = state.perspectives.findIndex(el => el.id === change.doc.id)
              state.perspectives.splice(index, 1)
            } else {
              const index = state.perspectives.findIndex(el => el.id === change.doc.id)
              state.perspectives.splice(index, 1, {...change.doc.data(), id: change.doc.id} as any)
            }
        })
      }
    },
    savePerspectiveTaskSort({ rootState }, {perspectiveId, sort}) {
      if (rootState.firestore && rootState.uid)
        rootState.firestore.collection('perspectives').doc(perspectiveId).update({
          sort,
        })
    },
    addPerspectiveSort({ rootState }, {perspectiveId, sort}) {
      const fire = rootState.firebase.firestore.FieldValue as any
      if (rootState.firestore && rootState.uid)
        rootState.firestore.collection('perspectives').doc(perspectiveId).update({
          sort: fire.arrayUnion(sort),
        })
    },
    addDefaultPerspectives({ rootState }, {id, someday, anytime}) {
      if (rootState.firestore) {
        const batch = rootState.firestore.batch()

        const perspectives: any[] = [
          {
            name: 'All tasks',
            pin: false,
            numberOfTasks: false,
            showWhenNotEmpty: false,
            alwaysShowTaskLabels: true,
            alwaysShowLastEditDate: true,
            alwaysShowCreationDate: true,
            icon: 'tasks',
            iconColor: '#83B7E2',
          },
          {
            name: 'Today',
            pin: true,
            numberOfTasks: true,
            showWhenNotEmpty: false,
            alwaysShowTaskLabels: true,
            alwaysShowLastEditDate: false,
            alwaysShowCreationDate: true,
            icon: 'star',
            iconColor: '#FFE366',
          },
          {
            name: 'Tomorrow',
            pin: false,
            numberOfTasks: false,
            showWhenNotEmpty: false,
            alwaysShowTaskLabels: true,
            alwaysShowLastEditDate: false,
            alwaysShowCreationDate: true,
            icon: 'sun',
            iconColor: '#FF7B66',
          },
          {
            name: 'Overdue',
            pin: false,
            numberOfTasks: true,
            showWhenNotEmpty: true,
            alwaysShowTaskLabels: true,
            alwaysShowLastEditDate: false,
            alwaysShowCreationDate: true,
            icon: 'hourglass-end',
            iconColor: '#FF6B66',
          },
          {
            name: 'Inbox',
            pin: true,
            numberOfTasks: true,
            showWhenNotEmpty: false,
            alwaysShowTaskLabels: false,
            alwaysShowLastEditDate: false,
            alwaysShowCreationDate: true,
            icon: 'inbox',
            iconColor: '#83B7E2',
            description: `All of your inbox tasks will be shown here.`,
          },
          {
            name: 'Upcoming',
            pin: true,
            numberOfTasks: false,
            showWhenNotEmpty: false,
            alwaysShowTaskLabels: true,
            alwaysShowLastEditDate: true,
            alwaysShowCreationDate: true,
            icon: 'calendar-alt',
            iconColor: '#9CE283',
          },
          {
            name: 'Next week',
            pin: false,
            numberOfTasks: true,
            showWhenNotEmpty: false,
            alwaysShowTaskLabels: true,
            alwaysShowLastEditDate: true,
            alwaysShowCreationDate: true,
            icon: 'calendar-week',
            iconColor: '#9CE283',
          },
          {
            name: 'Next month',
            pin: false,
            numberOfTasks: true,
            showWhenNotEmpty: false,
            alwaysShowTaskLabels: true,
            alwaysShowLastEditDate: true,
            alwaysShowCreationDate: true,
            icon: 'calendar',
            iconColor: '#9CE283',
          },
          {
            name: 'Have tags',
            pin: false,
            numberOfTasks: false,
            showWhenNotEmpty: false,
            alwaysShowTaskLabels: true,
            alwaysShowLastEditDate: true,
            alwaysShowCreationDate: true,
            icon: 'tags',
            iconColor: '#FF6B66',
          },
          {
            name: `Doesn't have tags`,
            pin: false,
            numberOfTasks: false,
            showWhenNotEmpty: false,
            alwaysShowTaskLabels: false,
            alwaysShowLastEditDate: true,
            alwaysShowCreationDate: true,
            icon: 'backspace',
            iconColor: '#FF6B66',
          },
        ]
        const customPerspectives: any = [
          {
            name: 'Anytime',
            pin: true,
            numberOfTasks: true,
            showWhenNotEmpty: false,
            alwaysShowTaskLabels: true,
            alwaysShowLastEditDate: true,
            alwaysShowCreationDate: true,
            icon: 'layer-group',
            iconColor: '#88DDB7',
          },
          {
            name: 'Someday',
            pin: true,
            numberOfTasks: false,
            showWhenNotEmpty: false,
            alwaysShowTaskLabels: true,
            alwaysShowLastEditDate: true,
            alwaysShowCreationDate: true,
            icon: 'archive',
            iconColor: '#E2B983',
          },
        ]

        const ids: string[] = []
        for (const per of perspectives) {
          const ref = rootState.firestore.collection('perspectives').doc()
          ids.push(ref.id)
          const obj: any = {
            userId: id,
            name: per.name,
            numberOfTasks: per.numberOfTasks,
            pin: per.pin,
            sort: [],
            icon: per.icon,
            iconColor: per.iconColor,
            description: '',
            order: [],
            showWhenNotEmpty: per.showWhenNotEmpty,
            alwaysShowTaskLabels: per.alwaysShowTaskLabels,
            alwaysShowLastEditDate: per.alwaysShowLastEditDate,
            alwaysShowCreationDate: per.alwaysShowCreationDate,
            isSmart: true,
            priority: '',
            excludeLabels: [],
            excludeSmartPers: [],
            includeAndSmartPers: [],
            includeOrSmartPers: [],
            includeAndLabels: [],
            includeOrLabels: [],
          }
          if (per.description)
            obj.description = per.description
          batch.set(ref, obj)
        }
        let orderRef = rootState.firestore.collection('perspectivesOrder').doc(id)
        const ids2 = []
        for (const per of customPerspectives) {
          const ref = rootState.firestore.collection('perspectives').doc()
          ids2.push(ref.id)
          const obj: any = {
            userId: id,
            name: per.name,
            numberOfTasks: per.numberOfTasks,
            sort: [],
            pin: per.pin,
            icon: per.icon,
            iconColor: per.iconColor,
            description: '',
            showWhenNotEmpty: per.showWhenNotEmpty,
            alwaysShowTaskLabels: per.alwaysShowTaskLabels,
            alwaysShowLastEditDate: per.alwaysShowLastEditDate,
            alwaysShowCreationDate: per.alwaysShowCreationDate,
            order: [],
            isSmart: false,
            priority: '',
            excludeLabels: [],
            includeAndLabels: [],
            excludeSmartPers: [],
            includeAndSmartPers: [],
            includeOrSmartPers: [],
            includeOrLabels: [],
          }
          if (per.description)
            obj.description = per.description
          if (per.name === 'Someday')
            per.includeCustomLabels = [someday]
          else if (per.name === 'Anytime')
            per.includeCustomLabels = [anytime]
          batch.set(ref, obj)
        }
        orderRef = rootState.firestore.collection('perspectivesOrder').doc(id)
        batch.set(orderRef, {
          userId: id,
          smartOrder: ids,
          customOrder: ids2,
        })

        batch.commit()
      }
    },
  } as Actions,
}
