
import { fire, auth } from './index'
import utils from '../utils'

const uid = () => {
  return auth.currentUser.uid
}

export default {
  namespaced: true,
  state: {
    filters: [],
    order: [],
  },
  getters: {
    sortedFilters(state) {
      const {order, filters} = state
      return []
    }
  },
  actions: {
    getData({}) {
      if (uid())
        return Promise.all([
          new Promise(resolve => {
            /* fire.collection('filters').where('userId', '==', uid()).onSnapshot(snap => {
              utils.getDataFromFirestoreSnapshot(state, snap.docChanges(), 'filters')
            }) */
            resolve()
          }),
          new Promise(resolve => {
            /* fire.collection('filtersOrder').doc(uid()).onSnapshot(snap => {
              state.order = snap.data().order
              if (!state.order) state.order = []
            }) */
            resolve()
          })
        ])
    },
    deleteTag(c, id) {

    },
    updateOrder(c, ids) {

    },
    sortFiltersByName() {

    },
    deleteAllData({state}) {
      for (const el of state.filters)
        fire.collection('filters').doc(el.id).delete()
      fire.collection('filtersOrder').doc(uid()).delete()
    },
  }
}
