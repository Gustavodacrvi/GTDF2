
import { fire, auth } from './index'
import fb from 'firebase/app'

import utils from '../utils'
import utilsTask from "@/utils/task"
import utilsMoment from "@/utils/moment"
import MemoizeGetters from './memoFunctionGetters'
import { listRef, setInfo, uid, listColl, taskRef, serverTimestamp, fd, setTask, folderRef, setFolder, setList, deleteList, batchSetTasks ,deleteTask, cacheBatchedItems, batchSetLists } from '../utils/firestore'
import router from '../router'

import mom from 'moment'

const TOD_STR = mom().format('Y-M-D')

export default {
  namespaced: true,
  state: {
    lists: {},
  },
  getters: {
    lists(state) {
      const keys = Object.keys(state.lists).filter(k => state.lists[k])
      return keys.map(k => state.lists[k])
    },
    sortedLists(state, d, {userInfo}, rootGetters) {
      if (userInfo)
        return rootGetters.checkMissingIdsAndSortArr(userInfo.lists, d.lists)
      return []
    },
    ...MemoizeGetters(null, {
      getTasks({}, tasks, id) {
        return tasks.filter(el => el.list === id)
      },
      isListCompleted: {
        getter({}, list, moment) {
          const c = list.calendar
          if (!c || c.type === 'someday' || c.type === 'specific') return list.completed
          
          let tod = mom(moment, 'Y-M-D')
          if (!tod.isValid()) tod = mom(TOD_STR,' Y-M-D')
          if (c.type === 'after completion') {
            if (!c.lastCompleteDate) return false
            const last = mom(c.lastCompleteDate, 'Y-M-D')
            const dayDiff = tod.diff(last, 'days')
            return dayDiff < c.afterCompletion
          }
      
          if (c.type === 'weekly' || c.type === 'monthly' || c.type === 'yearly' || c.type === 'yearly') {
            return mom(c.lastCompleteDate, 'Y-M-D').isSameOrAfter(tod, 'day')
          }

          return false
        },
        cache(args) {
          let list = args[0]
          const i = {
            completed: list.completed,
            calendar: list.calendar,
          }
          return JSON.stringify({i, a: [args[1], args[2]]})
        },
      },
      isListCanceled: {
        getter({}, list) {
          return list.canceled
        },
        cache(args) {
          return JSON.stringify({
            c: args[0].canceled,
          }) 
        },
      },
      isListShowingOnDate: {
        getter({}, list, date) {
          if (!utilsTask.hasCalendarBinding(list) || list.calendar.type === 'someday')
            return true
          
          const c = list.calendar
  
          // specific
          const tod = mom(date, 'Y-M-D')
          if (c.type === 'specific') {
            const specific = mom(c.specific, 'Y-M-D')

            return specific.isSameOrBefore(tod, 'day')
          }
  
          const begins = mom(c.begins, 'Y-M-D')
  
          if (c.ends) {
            if (c.ends.type === 'on date' && tod.isAfter(mom(c.ends.onDate, 'Y-M-D'), 'day'))
              return false
            else if (c.ends.times === null)
              return false
          }
          if (c.begins && begins.isAfter(tod, 'day'))
            return false
          
          if (c.type === 'after completion') {
            const lastComplete = c.lastCompleteDate ? mom(c.lastCompleteDate, 'Y-M-D') : begins
            if (!c.lastCompleteDate && begins.isSameOrBefore(tod, 'day')) return true
            
            const dayDiff = tod.diff(lastComplete, 'days')
            if (dayDiff < 0) return false
            const eventNotToday = dayDiff < c.afterCompletion
            if (eventNotToday) return false
          }
          
          if (c.type === 'weekly' || c.type === 'monthly' || c.type === 'yearly') {
            return tod.isSameOrAfter(
              utilsMoment.getNextEventAfterCompletionDate(c)
              , 'day')
          }  
  
          return true
        },
        cache(args) {
          return JSON.stringify({
            task: args[0].calendar,
            date: args[1],
            onlySpecific: args[2],
          })
        },
      },
      isListSomeday: {
        getter(c, list) {
          return list.calendar && list.calendar.type === 'someday'
        },
        cache(args) {
          return JSON.stringify({c: args[0].calendar})
        },
      },
      getListCalendarStr: {
        getter({}, list, l, userInfo) {
          const c = list.calendar
          if (!c) return null
    
          if (c.type === 'specific') {
            const str = utils.getHumanReadableDate(c.specific, l)
            if (str === 'Today') return 'Today'
            if (str === 'Tomorrow') return 'Tomorrow'
            return str
          }
          return utils.parseCalendarObjectToString(c, l, userInfo)
        },
        cache(args) {
          return JSON.stringify({
            c: args[0].calendar,
            u: args[2],
          })
        },
      },
      getListDeadlineStr: {
        getter({getters}, list, date, l) {
          if (!list.deadline)
            return null
          return utils.getHumanReadableDate(list.deadline, l) + ' ' + getters.getListDeadlineDaysLeftStr(list.deadline, date)
        },
        cache(args) {
          return JSON.stringify({
            c: args[0].deadline,
          })
        },
      },
      getListDeadlineDaysLeftStr: {
        getter(c, deadline, date) {
          const dead = mom(deadline, 'Y-M-D')
          const compare = mom(date, 'Y-M-D')
          const diff = dead.diff(compare, 'days')
          if (diff === 0)
            return 'Ends today'
          else if (diff === 1)
            return `1 day left`
          return `${diff} days left`
        },
        cache(args) {
          return JSON.stringify(args)
        }
      },
    }),
    ...MemoizeGetters('lists', {
      getListsByName: {
        react: [
          'name',
        ],
        getter({getters}, names) {
          const arr = []
          for (const n of names) {
            const list = getters.lists.find(el => el.name === n)
            if (list) arr.push(list)
          }
          return arr
        },
      },
      getListsById({getters}, ids) {
        const arr = []
        for (const id of ids) {
          const list = getters.lists.find(el => el.id === id)
          if (list) arr.push(list)
        }
        return arr
      },
      getListByName: {
        react: ['name'],
        getter({getters}, name) {
          return getters.lists.find(l => l.name.trim() === name)
        },
      },
      filterSidebarLists: {
        react: [
          'completed',
          'canceled',
          'folder',
          'calendar',
        ],
        getter({getters}, lists) {
          return lists.filter(l =>
              !getters.isListCompleted(l) &&
              !getters.isListCanceled(l) &&
              !getters.isListSomeday(l) &&
              getters.isListShowingOnDate(l, TOD_STR)
            )
        },
        cache(args) {
          return JSON.stringify({
            c: args[0].map(el => ({
              c: el.completed,
              ca: el.canceled,
              ca: el.calendar,
            }))
          })
        },
      },
      getAllTasksOrderByList: {
        react: [
          'headingsOrder',
          'headings',
          'tasks',
        ],
        getter({getters, rootGetters}, listId) {
          const list = getters.lists.find(el => el.id === listId)
          let ord = list.tasks.slice()
          
          let headsOrder = list.headingsOrder.slice() || []
    
          const heads = rootGetters.checkMissingIdsAndSortArr(headsOrder, list.headings)
          
          for (const h of heads) {
            ord = [...ord, ...h.tasks]
          }
          
          return ord
        },
      },
      pieProgress({getters, state}, tasks, listId, isTaskCompleted) {
        const list = getters.lists.find(el => el.id === listId)
        if (list) {
          const c = list.calendar
          const ts = getters.getTasks(tasks, listId)
          const numberOfTasks = ts.length
          let completedTasks = 0
          
          let compareDate = null
          if (c && c.lastCompleteDate)
            compareDate = c.lastCompleteDate
    
          ts.forEach(el => {
            if (isTaskCompleted(el, TOD_STR, compareDate)) completedTasks++
          })
          const result = 100 * completedTasks / numberOfTasks
          if (isNaN(result)) return 0
          return result
        }
        return 0
      },
    }, true),
    getFavoriteLists(s, getters) {
      return getters.lists.filter(el => el.favorite).map(f => ({...f, icon: 'tasks', color: 'var(--primary)', type: 'list'}))
    },
  },
  actions: {
    // ADD

    duplicateList(c, {list, rootTasks, headingTasks}) {
      const b = fire.batch()

      const name = list.name + ' (copy)'
      const newListRef = listRef()

      const writes = []

      const createTasks = (arr, tasks) => {
        for (const t of tasks) {
          const ref = taskRef()
          setTask(b, {
            ...t, id: null, list: newListRef.id,
          }, ref, writes)
          arr.push({
            oldId: t.id,
            newId: ref.id,
          })
        }
      }

      const newRootTasks = []
      const newHeadingTasks = []
      createTasks(newRootTasks, rootTasks)
      createTasks(newHeadingTasks, headingTasks)

      const headings = list.headings.slice()
      const headingsOrder = list.headingsOrder.slice()

      for (const h of headings) {
        const newIds = []
        for (const id of h.tasks) {
          const task = newHeadingTasks.find(t => t.oldId === id)
          newIds.push(task.newId)
        }
        h.tasks = newIds
      }

      setList(b, {
        headingsOrder,
        headings,
        name,
        folder: list.folder || null,
        deadline: list.deadline || null,
        tags: list.tags || [],
        calendar: list.calendar || null,
        notes: list.notes || null,
        tasks: newRootTasks.map(t => t.newId),
        userId: uid(),
      }, newListRef, writes)

      cacheBatchedItems(b, writes)

      b.commit()
    },
    addListInFolderByIndexFromView(c, {list, newItemRef, ids, folderId}) {
      const b = fire.batch()

      const writes = []

      setFolder(b, {order: ids}, folderRef(folderId), writes)

      list.folder = folderId

      setList(b, list, newItemRef, writes)

      cacheBatchedItems(b, writes)
      
      b.commit()
    },
    addList({}, {name, ids, index, folderId}) {
      const batch = fire.batch()
      
      let folder = folderId
      if (!folder) folder = null
      const obj = {
        name, folder,
        smartViewsOrders: {},
        userId: uid(),
        createdFire: serverTimestamp(),
        created: mom().format('Y-M-D HH:mm ss'),
        headings: [],
        headingsOrder: [],
        tasks: [],
      }
      if (index === undefined && folder === null) {
        setList(batch, obj, listRef())
      } else if (index !== undefined && folder === null) {
        const ord = ids.slice()
        const ref = listRef()
        setList(batch, obj, ref)
        ord.splice(index, 0, ref.id)
        setInfo(batch, {
          lists: ord,
        })
      } else {
        const ord = ids.slice()
        const ref = listRef()
        ord.splice(index, 0, ref.id)

        setFolder(batch, {order: ord}, folderRef(folder))

        setList(batch, obj, ref)
      }

      batch.commit()
    },
    completeLists(c, lists) {
      const batch = fire.batch()

      for (const l of lists) {
        let calendar = c = l.calendar || null
        if (c && c.type !== 'someday') {
          if (c.type === 'after completion') {
            c.lastCompleteDate = mom().format('Y-M-D')
          }
          else if (c.type === 'weekly' || c.type === 'monthly' || c.type === 'yearly') {
            const nextEventAfterCompletion = utilsMoment.getNextEventAfterCompletionDate(c, true)
            c.lastCompleteDate = nextEventAfterCompletion.format('Y-M-D')
          }

          if (c.times) c.times--
          if (c.times === 0) c.times = null
        }
        
        const tod = mom()
        setList(batch, {
          completedFire: serverTimestamp(),
          completeDate: tod.format('Y-M-D'),
          checkDate: tod.format('Y-M-D'),
          fullCheckDate: tod.format('Y-M-D HH:mm ss'),
          fullCompleteDate: tod.format('Y-M-D HH:mm ss'),
          completed: true,
          canceled: false,
          cancelDate: null,
          fullCancelDate: null,
          calendar,
        }, listRef(l.id))

      }
      
      batch.commit()
    },
    uncompleteLists(c, lists) {
      const batch = fire.batch()

      for (const l of lists) {
        const c = l.calendar
        if (c && c.times === 0) c.times = null
        if (c) {
          c.lastCompleteDate = null
        }
        setList(batch, {
          completedFire: null,
          completeDate: null,
          completed: false,
          checkDate: null,
          fullCheckDate: null,
          calendar: c,
        }, listRef(l.id))
      }

      batch.commit()
    },
    async cancelLists({}, ids) {
      const b = fire.batch()

      const tod = mom()
      await batchSetLists(b, {
        canceled: true,
        cancelDate: tod.format('Y-M-D'),
        checkDate: tod.format('Y-M-D'),
        fullCancelDate: tod.format('Y-M-D HH:mm ss'),
        fullCheckDate: tod.format('Y-M-D HH:mm ss'),
        completedFire: null,
        completeDate: null,
        completed: false,
      }, ids)

      b.commit()
    },
    async uncancelLists({}, ids) {
      const b = fire.batch()

      await batchSetLists(b, {
        canceled: false,
        cancelDate: null,
        checkDate: null,
        fullCancelDate: null,
        fullCheckDate: null,
      }, ids)

      b.commit()
    },
    convertHeadingToList({state, getters}, {listId, taskIds, headingId}) {
      const list = getters.getListsById([listId])[0]
      const batch = fire.batch()
      let folder = null
      if (list.folder) folder = list.folder

      const heads = list.headings.slice()
      const i = heads.findIndex(el => el.id === headingId)
      const oldHeading = {...heads[i]}
      heads.splice(i, 1)

      setList(batch, {
        headings: heads,
      }, listRef(listId))
      
      const newList = listRef()
      setList(batch, {
        folder,
        userId: uid(),
        users: [uid()],
        smartViewsOrders: {},
        name: oldHeading.name,
        notes: oldHeading.notes,
        headings: [],
        headingsOrder: [],
        tasks: taskIds,
      }, newList)
      for (const id of taskIds)
        setTask(batch, {
          list: newList.id,
          heading: null,
        }, taskRef(id))

      batch.commit()
    },

    // EDIT
    
    saveList(c, list) {
      const b = fire.batch()
      
      setList(b, list, listRef(list.id))

      b.commit()
    },
    saveListsById(c, {list, ids}) {
      const b = fire.batch()

      const writes = []
      
      ids.forEach(id => setList(b, list, listRef(id), writes))

      cacheBatchedItems(b, writes)

      b.commit()
    },
    editListTags(c, {tagIds, listId}) {
      const b = fire.batch()
      
      setList(b, {
        tags: tagIds,
      }, listRef(listId))
  
      b.commit()
    },
    removeListTag(c, {tagId, listId}) {
      const b = fire.batch()
      
      setList(b, {
        tags: fd().arrayRemove(tagId),
      }, listRef(listId))
  
      b.commit()
    },
    updateOrder(c, lists) {
      const b = fire.batch()
      
      setInfo(b, {lists})

      b.commit()
    },
    updateViewOrder({state}, {view, ids}) {
      const obj = {}
      obj[view] = {}
      obj[view].tasks = ids
      const b = fire.batch()
      
      setInfo(b, {
        viewOrders: obj,
      })

      b.commit()
    },
    sortListsByName({getters, dispatch}) {
      const lists = getters.lists.slice()
      lists.sort((a, b) => a.name.toLowerCase().localeCompare(b.name.toLowerCase()))
      dispatch('updateOrder', lists.map(el => el.id))
    },

    // TASKS
    
    async addTaskByIndexSmartViewFolder(c, {ids, index, task, folderId, viewName, newTaskRef}) {
      const b = fire.batch()

      const writes = []
      
      await setTask(b, {
        userId: uid(),
        createdFire: serverTimestamp(),
        created: mom().format('Y-M-D HH:mm ss'),
        ...task,
      }, newTaskRef, writes)
    
      const views = {}
      views[viewName] = ids

      setFolder(b, {smartViewsOrders: views}, folderRef(folderId), writes)

      cacheBatchedItems(b, writes)

      b.commit()
    },
    async addTaskByIndexCalendarOrder({rootState}, {ids, index, task, date, newTaskRef}) {
      const b = fire.batch()
      
      const writes = []
      
      await setTask(b, {
        userId: uid(),
        createdFire: serverTimestamp(),
        created: mom().format('Y-M-D HH:mm ss'),
        ...task,
      }, newTaskRef, writes)
    
      const calendarOrders = utilsTask.getUpdatedCalendarOrders(ids, date, rootState)

      setInfo(b, {calendarOrders}, writes)

      cacheBatchedItems(b, writes)

      b.commit()
    },
    addTaskByIndexSmartViewList(c, {ids, index, task, listId, viewName, newTaskRef}) {
      const b = fire.batch()

      const writes = []
      
      setTask(b, {
        userId: uid(),
        createdFire: serverTimestamp(),
        created: mom().format('Y-M-D HH:mm ss'),
        ...task,
      }, newTaskRef, writes)
      const views = {}
      views[viewName] = ids

      setList(b, {
        smartViewsOrders: views,
      }, listRef(listId), writes)

      cacheBatchedItems(b, writes)

      b.commit()
    },
    addTaskByIndexSmart(c, {ids, index, task, list, newTaskRef}) {
      const b = fire.batch()

      const writes = []
      
      setTask(b, {
        userId: uid(),
        createdFire: serverTimestamp(),
        created: mom().format('Y-M-D HH:mm ss'),
        ...task,
      }, newTaskRef, writes)
      const obj = {[list]: {}}
      // list === viewName, e.g: Today, Tomorrow
      obj[list].tasks = ids

      setInfo(b, {
        viewOrders: obj,
      }, writes)

      cacheBatchedItems(b, writes)

      b.commit()
    },
    addTaskByIndex(c, {ids, index, task, listId, newTaskRef}) {
      const b = fire.batch()

      const writes = []
      
      setTask(b, {
        createdFire: serverTimestamp(),
        created: mom().format('Y-M-D HH:mm ss'),
        userId: uid(),
        ...task,
      }, newTaskRef, writes)

      setList(b, {tasks: ids}, listRef(listId), writes)

      cacheBatchedItems(b, writes)

      b.commit()
    },

    uncompleteHeadingTasks({getters}, {headingId, listId, savedTasks}) {
      const list = getters.getListsById([listId])[0]
      const b = fire.batch()

      const writes = []
      
      const head = list.headings.find(el => el.id === headingId)
      const ids = []
      
      for (const i of head.tasks) {
        const task = savedTasks.find(el => el.id === i)
        if (task) ids.push(task.id)
      }

      batchSetTasks(b, {
        completedFire: null,
        completeDate: null,
        completed: false,
      }, ids, writes)
      
      cacheBatchedItems(b, writes)

      b.commit()
    },
    removeTasksFromSmartViewHeading(c, {taskIds, view, ids}) {
      const b = fire.batch()

      const writes = []

      batchSetTasks(b, {
        list: null, folder: null, heading: null,
      }, taskIds, writes)

      const obj = {}
      obj[view] = {}
      obj[view].tasks = ids
      setInfo(b, {
        viewOrders: obj,
      }, writes)

      cacheBatchedItems(b, writes)

      b.commit()
    },
    removeTasksFromSmartViewCalendarHeading({rootState}, {taskIds, date, ids}) {
      const b = fire.batch()

      const writes = []

      batchSetTasks(b, {
        list: null, folder: null, heading: null,
      }, taskIds, writes)
      
      const calendarOrders = utilsTask.getUpdatedCalendarOrders(ids, date, rootState)

      setInfo(b, {calendarOrders}, writes)

      cacheBatchedItems(b, writes)

      b.commit()
    },
    moveTasksToListCalendarOrder({rootState}, {ids, taskIds, date, listId}) {
      const b = fire.batch()

      batchSetTasks(b, {
        list: listId,
        folder: null,
        heading: null,
      }, taskIds, writes)

      const calendarOrders = utilsTask.getUpdatedCalendarOrders(ids, date, rootState)
      
      setInfo(b, {calendarOrders}, writes)

      cacheBatchedItems(b, writes)

      b.commit()
    },
    moveTasksToList({getters}, {ids, taskIds, listId, smartView}) {
      const list = getters.getListsById([listId])[0]
      const b = fire.batch()
      let views = list.smartViewsOrders
      if (!views) views = {}
      views[smartView] = ids

      const writes = []
      
      batchSetTasks(b, {
        list: listId,
        folder: null,
        heading: null,
      }, taskIds, writes)

      setList(b, {
        smartViewsOrders: views,
      }, listRef(listId), writes)

      cacheBatchedItems(b, writes)

      b.commit()
    },

    // HEADING
    
    addHeading({getters}, {ids, name, headings, listId, index}) {
      const list = getters.getListsById([listId])[0]
      const b = fire.batch()
      const headindgId = utils.getUid()

      const writes = []

      batchSetTasks(b, {
        heading: headindgId,
      }, ids, writes)

      const listHeadings = list.headings.slice()
      listHeadings.push({name, tasks: ids, id: headindgId})
      headings.splice(index, 0, headindgId)
      
      setList(b, {
        headings: listHeadings,
        headingsOrder: headings,
      }, listRef(listId), writes)

      cacheBatchedItems(b, writes)

      b.commit()
    },
    saveHeadingName({getters}, {listId, headingId, name}) {
      const list = getters.getListsById([listId])[0]
      const b = fire.batch()
      
      const heads = list.headings.slice()
      const i = heads.findIndex(el => el.id === headingId)
      heads[i].name = name

      setList(b, {headings: heads}, listRef(listId))

      b.commit()
    },
    saveHeadingNotes({getters}, {listId, notes, heading}) {
      const list = getters.getListsById([listId])[0]
      const b = fire.batch()
      
      const heads = list.headings.slice()
      const i = heads.findIndex(el => el.id === heading)
      heads[i].notes = notes
      setList(b, {
        headings: heads,
      }, listRef(listId))

      b.commit()
    },
    moveTasksBetweenHeadings({getters}, {ids, listId, taskIds, headingId}) {
      const list = getters.getListsById([listId])[0]
      const b = fire.batch()

      const writes = []
      
      batchSetTasks(b, {
        heading: headingId,
      }, taskIds, writes)

      const heads = list.headings.slice()
      const i = heads.findIndex(el => el.id === headingId)
      heads[i].tasks = ids
      setList(b, {headings: heads}, listRef(listId), writes)

      cacheBatchedItems(b, writes)

      b.commit()
    },
    removeTasksFromHeading(c, {listId, taskIds, ids}) {
      const b = fire.batch()

      const writes = []
      
      batchSetTasks(b, {
        heading: null,
      }, taskIds, writes)

      setList(b, {tasks: ids}, listRef(listId), writes)

      cacheBatchedItems(b, writes)

      b.commit()
    },
    deleteHeadingFromList({getters}, {listId, headingId, savedTasks}) {
      const b = fire.batch()
      
      const list = getters.getListsById([listId])[0]
      const heads = list.headings.slice()
      const i = heads.findIndex(el => el.id === headingId)
      heads.splice(i, 1)
      
      const writes = []
      
      batchSetTasks(b, {
        heading: null,
      }, savedTasks.map(el => el.id), writes)

      setList(b, {headings: heads}, listRef(listId), writes)

      cacheBatchedItems(b, writes)
      
      b.commit()
    },
    updateHeadingsTaskIds({getters}, {listId, headingId, ids}) {
      const list = getters.getListsById([listId])[0]
      const heads = list.headings.slice()
      const i = heads.findIndex(el => el.id === headingId)
      heads[i].tasks = ids
      const b = fire.batch()
      
      setList(b, {headings: heads}, listRef(listId))

      b.commit()
    },
    updateListHeadings(c, {ids, listId}) {
      const b = fire.batch()
      
      setList(batch, {headingsOrder: ids}, listRef(listId))

      b.commit()
    },
    saveSmartViewHeadingTasksOrder({getters}, {ids, listId, smartView}) {
      const list = getters.getListsById([listId])[0]
      let views = list.smartViewsOrders
      if (!views) views = {}
      views[smartView] = ids
      const b = fire.batch()
      
      setList(b, {
        smartViewsOrders: views,
      }, listRef(listId))

      b.commit()
    },
    duplicateHeading({getters}, {headingId, name, listId, tasks}) {
      const list = getters.getListsById([listId])[0]
      const b = fire.batch()
      const newId = utils.getUid()
      const oldHeading = list.headings.find(h => h.id === headingId)

      const writes = []

      const newTaskIds = []

      for (const t of tasks) {
        setTask(b, {
          ...t, heading: newId, id: null,
        }, taskRef(), writes)
        newTaskIds.push(t.id)
      }

      const heads = list.headings.slice()
      heads.push({
        name: oldHeading.name + ' (copy)',
        notes: oldHeading.notes || '',
        tasks: newTaskIds,
        id: newId,
      })
      const order = list.headingsOrder.slice()
      const i = order.findIndex(n => n === headingId)
      order.splice(i, 0, newId)

      setList(b, {
        headingsOrder: order,
        headings: heads,
      }, listRef(listId), writes)

      cacheBatchedItems(b, writes)

      b.commit()
    },
    updateHeadingsViewOrder({}, {view, ids}) {
      const obj = {}
      obj[view] = {}
      obj[view].headings = ids
      const b = fire.batch()
      
      setInfo(b, {
        viewOrders: obj,
      })

      b.commit()
    },
    updateHeadingsCalendarOrder({rootState}, {date, ids}) {
      const calendarOrders = utilsTask.getUpdatedCalendarOrders(ids, date, rootState, 'headings')
      const b = fire.batch()

      setInfo(b, {calendarOrders})

      b.commit()
    },
    addTaskHeading({getters}, {headingId, ids, listId, task, index, newTaskRef}) {
      const list = getters.getListsById([listId])[0]
      const b = fire.batch()

      const writes = []
      
      task.list = listId
      task.heading = headingId
      setTask(b, {
        userId: uid(),
        createdFire: serverTimestamp(),
        created: mom().format('Y-M-D HH:mm ss'),
        ...task,
      }, newTaskRef, writes)
      const heads = list.headings.slice()
      const i = heads.findIndex(el => el.id === headingId)
      ids.splice(index, 0, newTaskRef.id)
      heads[i].tasks = ids
      setList(b, {
        headings: heads,
      }, listRef(listId), writes)

      cacheBatchedItems(b, writes)

      b.commit()
    },

    deleteList({getters}, {listId, tasks}) {
      const b = fire.batch()
      const list = getters.getListsById([listId])[0]
      let folder = null
      if (list.folder) folder = list.folder

      const writes = []

      const ids = []
      for (const t of tasks)
      if (t.list === listId) ids.push(t.id)
      batchSetTasks(b, {
        list: null,
        folder,
        heading: null,
      }, ids, writes)

      deleteList(b, listId, writes)

      cacheBatchedItems(b, writes)

      b.commit()
    },
    deleteMultipleListsByIds({getters}, {ids, tasks}) {
      const b = fire.batch()

      const writes = []

      ids.forEach(id => {

        const list = getters.getListsById([id])[0]
        let folder = null
        if (list.folder) folder = list.folder

        const taskIds = []
        tasks.forEach(el => {
          if (el.list === id) taskIds.push(el.id)
        })
        batchSetTasks(b, {
          list: null,
          folder,
          heading: null,
        }, taskIds, writes)

        deleteList(b, id, writes)
        
      })

      cacheBatchedItems(b, writes)

      b.commit()
    },
    importTemplate(c, {list, tasks}) {
      const b = fire.batch()

      const newListRef = listRef()

      const writes = []
      
      const taskIds = {}
      const listId = newListRef.id
      for (const t of tasks) {
        setTask(b, {
          ...t, list: listId, id: ref.id, userId: uid(),
          users: [uid()],
        }, taskRef(), writes)
        taskIds[t.id] = ref.id
      }

      const heads = list.headings
      for (const h of heads) {
        const newids = []
        for (const id of h.tasks) {
          newids.push(taskIds[id])
        }
        h.tasks = newids
      }
      const newTasks = []
      for (const id of list.tasks)
        newTasks.push(taskIds[id])
      list.tasks = newTasks
      
      list.smartViewsOrders = {}
      setList(b, {
        ...list, id: listId, userId: uid(),
        users: [uid()],
      }, newListRef, writes)

      cacheBatchedItems(b, writes)

      b.commit()
    },
  },
}
