
import { fire, auth } from './index'
import utils from '../utils'

const uid = () => {
  return auth.currentUser.uid
}

export default {
  namespaced: true,
  state: {
    folders: [],
    lists: [],
    foldersOrder: [],
  },
  getters: {
    sortedFolders(state) {
      const {foldersOrder, folders} = state
      return utils.checkMissingIdsAndSortArr(foldersOrder, folders)
    },
    getFolderLists: state => id => {
      const {lists, folders} = state
      const arr = []
      const fold = folders.find(el => el.id === id)
      if (fold) {
        for (const listId of fold.lists) {
          const list = lists.find(el => el.id === listId)
          if (list) arr.push(list)
        }
      }
      return arr
    },
  },
  actions: {
    getData({state}) {
      return Promise.all([
        new Promise(resolve => {
          fire.collection('folders').where('userId', '==', uid()).onSnapshot(snap => {
            utils.getDataFromFirestoreSnapshot(state, snap.docChanges(), 'folders')
            resolve()
          })
        }),
        new Promise(resolve => {
          fire.collection('lists').where('userId', '==', uid()).onSnapshot(snap => {
            utils.getDataFromFirestoreSnapshot(state, snap.docChanges(), 'lists')
            resolve()
          })
        }),
        new Promise(resolve => {
          fire.collection('foldersOrder').doc(uid()).onSnapshot((snap => {
            state.foldersOrder = snap.data().order
            resolve()
          }))
        })
      ])
    },
    addFolder(c, {name}) {
      console.log('editFolder', name)
      return fire.collection('folders').add({
        name,
        userId: uid(),
        lists: [],
      })
    },
    editFolder(c, {name, id}) {
      console.log('editFolder', name, id)
    },
  },
}
