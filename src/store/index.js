import Vue from "vue"
import Vuex from "vuex"
import router from './../router'

import Memoize from './memoFunctionGetters'
import utilsTask from '../utils/task'

import moment from 'moment'

Vue.use(Vuex)

const MINIMUM_DESKTOP_SCREEN_WIDTH = 820

import firebase from 'firebase/app'
import 'firebase/auth'
import 'firebase/firestore'
import 'firebase/storage'
import 'firebase/performance'

firebase.initializeApp({
  apiKey: process.env.VUE_APP_API_KEY,
  authDomain: process.env.VUE_APP_AUTH_DOMAIN,
  projectId: process.env.VUE_APP_PROJECT_ID,
  storageBucket: process.env.VUE_APP_STORAGE_BUCKET,
  messagingSenderId: process.env.VUE_APP_MESSAGING_SENDER_ID,
  appId: process.env.VUE_APP_APP_ID,
  databaseURL: process.env.VUE_APP_DATABASE_URL,
  measurementId: process.env.VUE_APP_MEASUREMENT_ID,
})

const perf = firebase.performance()

export const fire = firebase.firestore()
export const auth = firebase.auth()
export const sto = firebase.storage()

import task from './task'
import tag from './tag'
import list from './list'
import filter from './filter'
import folder from './folder'
import pomo from './pomo'

import utils from '@/utils'
import { userRef, cacheRef, setInfo } from "../utils/firestore"

const lang = localStorage.getItem('watchrlanguage') || 'en'

const getLanguageFile = (name) => {
  return new Promise(resolve => {
    import(/* webpackMode: "lazy" */`./../assets/locales/${name}.js`)
      .then((res) => resolve(res.default))
  })
}

moment.locale(lang)

const uid = () => auth.currentUser.uid


const version = '083'

let lastVersion = localStorage.getItem('watchr_version')

if (lastVersion === null) {
  lastVersion = version
  localStorage.setItem('watchr_version', version)
}


const store = new Vuex.Store({
  modules: {
    task, tag, list, filter, folder,
    pomo,
  },
  state: {
    lang,
    lastVersion,
    version,
    language: null,
    popup: {
      comp: '',
      naked: false,
      payload: null,
      callback: null,
    },
    iconDrop: null,
    user: {
      displayName: null,
      email: null,
    },
    userInfo: {
      pomo: null,
      
      tags: [],
      lists: [],
      favorites: [],
      filters: [],
      folders: [],
      hidedSections: [],
      hidedViews: [],
      links: [],
      
      calendarOrders: null,
      
      disablePmFormat: false,
      
      lists: [],
      tags: [],
      viewOrders: {},
      hidedSections: null,
      links: [],
    },
    firstFireLoad: false,
    selectedTasks: [],
    fireBaseFirstLoaded: false,
    authState: false,
    fileURL: null,
    firstFireLoad: false,
    toasts: [],
    windowWidth: 0,
    isScrolling: false,
    allowNavHide: true,
    viewName: '',
    viewType: '',
    mainSelection: null,
    mainSelectionIndex: null,
    movingTask: false,
    
    isOnControl: false,
    isOnShift: false,
    isOnAlt: false,
    pressingKey: null,
    historyPos: 0,

    isFirstSnapshot: true,
    changedIds: [],
  },
  getters: {
    ...Memoize(null, {
      checkMissingIdsAndSortArr({}, order, arr) {

        let items = []
        for (const id of order) {
          const item = arr.find(el => el.id === id)
          if (item) items.push(item)
        }
    
        let notIncluded = []
        for (const item of arr) {
          if (!order.includes(item.id))
            notIncluded.push(item)
        }
    
        let haveCreationDate = true
        for (const item of notIncluded) {
          if (!item.created) {
            haveCreationDate = false
            break
          }
        }
        if (haveCreationDate)
          notIncluded = utilsTask.sortTasksByTaskDate(notIncluded)
        items = [...items, ...notIncluded]
      
        const ids = new Set()
        const ordered = []
        for (const item of items) {
          if (!ids.has(item.id)) {
            ids.add(item.id)
            ordered.push(item)
          }
        }
        
        return ordered
      },
    }),
    fallbackSelected(state) {
      if (state.selectedTasks.length > 0)
        return state.selectedTasks
      else return state.mainSelection ? [state.mainSelection] : null
    },
    isDesktop(state) {
      return state.windowWidth >= MINIMUM_DESKTOP_SCREEN_WIDTH
    },
    platform(s, getters) {
      if (getters.isDesktop) return 'desktop'
      return 'mobile'
    },
    getInitialSmartView(state) {
      const goToLastViewOnEnter = localStorage.getItem('goToLastViewOnEnter')

      if (goToLastViewOnEnter !== 'true') {
        const arr = state.userInfo.links
        let viewName = 'Today'
        if (arr && arr[0]) viewName = arr[0]
        return { viewName, viewType: 'list'}
      } else {
        const viewName = localStorage.getItem('watchr_last_view_name')
        const viewType = localStorage.getItem('watchr_last_view_type')
        return {viewType, viewName}
      }
    },
    versionDiff(state) {
      const vers = state.lastVersion
      return parseInt(state.version, 10) - parseInt(vers, 10)
    },
    needsUpdate(state) {
      const vers = state.lastVersion
      return vers !== null && (parseInt(state.version, 10) - parseInt(vers, 10) > 0)
    },
    isStandAlone() {
      const navigator = window.navigator
      return (navigator.standalone === true)
      || (window.matchMedia('(display-mode: standalone)').matches)
    },
    parsedVersion(state) {
      let newStr = ''
      let i = 0
      for (const s of state.version) {
        if (i > 0)
          newStr += '.' + s
        else newStr += s
        i++
      }
      return 'v' + newStr
    },
    isPopupOpened(state) {
      return state.popup.comp !== ''
    },
    l(state) {
      return state.language
    },
    recentUsersStr(state) {
      if (!state.userInfo.recentUsers) return []
      return Object.values(state.userInfo.recentUsers).map(user => {
        let str = ''
        if (user.displayName) str += user.displayName + ' '
        str += user.email
        return str
      })
    },
  },
  mutations: {
    movingTask(state, bool) {
      state.movingTask = bool
    },
    saveMainSelection(state, {id, index}) {
      state.mainSelection = id
      state.mainSelectionIndex = index
    },
    unpressKey(state) {
      state.pressingKey = null
    },
    decreaseHistory(state) {
      state.historyPos--
    },
    increaseHistory(state) {
      state.historyPos++
    },
    navigate(state, {viewName, viewType, newRoute}) {
      if (!newRoute)
        state.historyPos++
      if (viewName && viewType) {
        localStorage.setItem('watchr_last_view_name', viewName)
        localStorage.setItem('watchr_last_view_type', viewType)
      }
      
      state.viewName = viewName
      state.viewType = viewType
    },
    updateVersion(state, vers) {
      state.lastVersion = vers
      localStorage.setItem('watchr_version', vers)
    },
    readFile(state, fileURL) {
      state.fileURL = fileURL
    },
    toggleAllowNavHide(state, allow) {
      state.allowNavHide = allow
    },
    toggleScroll(state, isScrolling) {
      state.isScrolling = isScrolling
    },
    saveUser(state, user) {
      state.user = user
    },
    firstFirebaseLoad(state) {
      state.firstFireLoad = true
    },
    languageFile(state, language) {
      state.language = language
    },
    saveLang(state, lang) {
      getLanguageFile(lang).then((language) => {
        state.lang = lang
        state.language = language
        localStorage.setItem('watchrlanguage', lang)
        location.reload()
      })
    },
    pushIconDrop(state, drop) {
      state.iconDrop = drop
    },
    unselectTask(state, id) {
      if (id && state.selectedTasks.includes(id)) {
        const i = state.selectedTasks.findIndex(el => el === id)
        state.selectedTasks.splice(i, 1)
      }
    },
    selectTask(state, id) {
      if (id && !state.selectedTasks.includes(id)) {
        state.selectedTasks.push(id)
      }
    },
    clearSelected(state) {
      if (state.selectedTasks.length !== 0)
        state.selectedTasks = []
    },
    toggleUser(state, isLogged) {
      state.authState = isLogged
    },
    saveWindowWidth(state) {
      state.windowWidth = document.body.clientWidth
    },
    moveToastQueue(state) {
      state.toasts.pop()
    },
    pushToast(state, toast) {
      state.toasts.unshift(toast)
    },
    toggleControl(state, clicked) {
      state.isOnControl = clicked
    },
    toggleShift(state, clicked) {
      state.isOnShift = clicked
    },
    toggleAlt(state, clicked) {
      state.isOnAlt = clicked
    },
    change(state, ids) {
      for (const id of ids)
        if (!state.changedIds.includes(id))
          state.changedIds.push(id)
    },
  },
  actions: {
    getOptions(context, options) {
      const {state, getters} = context
      return options({
        router,
        ...context,
        tags: getters['tag/tags'],
        tasks: getters['task/tasks'],
        lists: getters['list/lists'],
        folders: getters['folder/folders'],
      })
    },
    logOut({state}) {
      auth.signOut().then(() => {
        state.authState = false
        location.reload()
      })
    },
    pushKeyShortcut({dispatch, commit, state}, key) {
      const pop = (comp) => {
        dispatch('pushPopup', {comp, naked: true})
      }
      state.pressingKey = key
      if (!state.isOnControl && !state.isOnShift && !state.isOnAlt)
        switch (key.toLowerCase()) {
          case 'q': pop('AddTask'); break
          case 't': pop('AddTag'); break
          case 'l': pop('AddList'); break
          case 's': pop('Shortcuts'); break
          case 'f': pop('FastSearch'); break
        }
    },
    pushPopup({state, getters}, popup) {
      state.popup = popup
      if (!getters.isDesktop)
        router.push('/popup')
    },
    closePopup({state, getters}, persistOnTheSameView) {
      state.popup = {comp: '', payload: null, naked: false}
      if (!getters.isDesktop && !persistOnTheSameView)
        router.go(-1)
    },
    deleteProfilePic() {
      const str = `images/${auth.currentUser.uid}.jpg`
      sto.ref(str).delete().then(() => {
        auth.currentUser.updateProfile({
          photoURL: '',
        }).then(() => location.reload())
      })
    },
    setInfo(c, obj) {
      const b = fire.batch()

      setInfo(b, obj)

      b.commit()
    },
    getData({state}) {
      cacheRef().onSnapshot(snap => {
        const data = snap.data()
        const isFromHere = snap.metadata.hasPendingWrites

        utils.addIdsToObjectFromKeys(data.tasks)
        utils.addIdsToObjectFromKeys(data.tags)
        utils.addIdsToObjectFromKeys(data.folders)
        utils.addIdsToObjectFromKeys(data.stats)
        utils.addIdsToObjectFromKeys(data.lists)

        if (data.info && data.info.info)
          utils.findChangesBetweenObjs(state.userInfo, data.info.info, (key, val) => Vue.set(state.userInfo, key, val))
        
        if (!state.isFirstSnapshot) {
          utils.updateVuexObject(state.task, 'tasks', data.tasks || {}, state.changedIds, isFromHere)
          utils.updateVuexObject(state.tag, 'tags', data.tags || {}, state.changedIds, isFromHere)
          utils.updateVuexObject(state.folder, 'folders', data.folders || {}, state.changedIds, isFromHere)
          utils.updateVuexObject(state.list, 'lists', data.lists || {}, state.changedIds, isFromHere)
          
          if (isFromHere) {
            state.changedIds = []
          }
        } else {
          state.task.tasks = data.tasks || {}
          state.tag.tags = data.tags || {}
          state.folder.folders = data.folders || {}
          state.list.lists = data.lists || {}

          state.isFirstSnapshot = false
        }
      })
    },
    update({}, info) {
      const batch = fire.batch()
      
      const userRef = fire.collection('users').doc(info.uid)
      batch.set(userRef, {
        ...utils.getRelevantUserData(info),
      }, {merge: true})
      return batch.commit()
    },
    createUser(s, user) {
      return fire.collection('users').doc(user.uid).set({
        ...utils.getRelevantUserData(user),
      }, {merge: true})
    },
    createAnonymousUser(c, userId) {
      firebase.firestore().collection('users').doc(userId).set({
        ...utils.getRelevantUserData(userId),
      })
    },
    addRecentCollaborators({state}, user) {
      const add = !state.userInfo.recentUsers || !state.userInfo.recentUsers[user.userId]
      if (add)
        fire.collection('users').doc(uid()).update({
          recentUsers: {[user.userId]: user},
        })
    },
  }
})

fire.enablePersistence().then(() => enabled = true)
.catch(err => {
  if (err.code === 'failed-precondition') {
    // handle error
  }
  else if (err.code === 'unimplemented')
    store.commit('pushToast', {
      name: `Firestore's persistence is not available on your browser, therefore you won't be able to use this app offline.</br>Please chose a better browser or update the current one to the latest version.`,
      seconds: 12,
      type: 'error',
    })
})

store.commit('saveUser', null)

getLanguageFile(lang).then((l) => store.commit('languageFile', l))

auth.onAuthStateChanged((user) => {
  const isLogged = user !== null
  store.commit('toggleUser', isLogged)
  store.commit('saveUser', user)
  store.commit('firstFirebaseLoad')
  if (!isLogged) return;

  const dispatch = store.dispatch
  const loadData = () => {
    dispatch('getData')
    dispatch('pomo/getData')
  }
  const toast = (t) => store.commit('pushToast', t)

  if (!user.isAnonymous) {
    if (isLogged) loadData()
  } else {
    setTimeout(() => {
      toast({
        name: store.getters.l['Anonymous users are deleted every week, sign in to save your data indefinitely.'],
        seconds: 7,
        type: 'warning',
      })
    }, 3000)
    loadData()
  }
})

auth.getRedirectResult().then(res => {
  const user = res.user
  const toast = (t) => store.commit('pushToast', t)
  if (user) {
    toast({
      name: store.getters['l']['You have successfully logged in!'],
      seconds: 3,
      type: 'success',
    })
    setTimeout(() => {
      router.push('/user')
      fire.collection('users').doc(user.uid).set({
        ...utils.getRelevantUserData(user),
      }).catch(err => {
        firebase.auth().currentUser.delete()
        toast({
          name: err.message,
          seconds: 3,
          type: 'error',
      })})
    }, 80)
  }
}).catch(err => store.commit('pushToast', {
  name: err.message,
  seconds: 4,
  type: 'error',
}))

window.addEventListener('resize', () => store.commit('saveWindowWidth'))

store.commit('saveWindowWidth')

export default store
