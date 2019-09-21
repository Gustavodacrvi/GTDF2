
import { fire, auth } from './index'
import utils from '../utils'


export default {
  namespaced: true,
  state: {
    tags: [],
  },
  actions: {
    getData({state}) {
      return new Promise(resolve => {
        const id = auth.currentUser.uid
        fire.collection('tags').where('userId', '==', id).onSnapshot(snap => {
          utils.getDataFromFirestoreSnapshot(state, snap.docChanges(), 'tags')
          resolve()
        })
      })
    },
    addTag({}, {name}) {
      return fire.collection('tags').add({
        name,
        userId: auth.currentUser.uid,
        times: 0,
      })
    },
    deleteTag({}, id) {
      return fire.collection('tags').doc(id).delete()
    },
    editTag({}, {name, id}) {
      return fire.collection('tags').doc(id).update({
        name,
      })
    }
  },
}
