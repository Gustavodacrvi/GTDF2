
import { fire, auth } from './index'
import fb from 'firebase/app'

import utils from '../utils'
import utilsTask from '../utils/task'
import utilsMoment from '../utils/moment'
import MemoizeGetters from './memoFunctionGetters'
import { uid, fd, setInfo, folderRef, taskRef, listRef, setTask, deleteTask, cacheBatchedItems, batchSetTasks, batchDeleteTasks, setFolder, setList, setGroup } from '../utils/firestore'

import mom from 'moment'

const TODAY_MOM = mom()

const TODAY_DATE = TODAY_MOM.format('Y-M-D')
const TOM_DATE = TODAY_MOM.clone().add(1, 'day').format('Y-M-D')

export default {
  namespaced: true,
  state: {
    tasks: {},
    groupTasks: {},
  },
  getters: {
    allTasks(state) {
      const keys = Object.keys(state.tasks).filter(
        k => state.tasks[k]
      )
      const groupKeys = Object.keys(state.groupTasks).filter(
        k => state.groupTasks[k]
      )
      
      return keys.map(k => state.tasks[k]).concat(groupKeys.map(k => state.groupTasks[k]))
    },
    logTasks(state) {
      const keys = Object.keys(state.tasks).filter(
        k => state.tasks[k] && state.tasks[k].logbook
      )
      const groupKeys = Object.keys(state.groupTasks).filter(
        k => state.groupTasks[k] && state.groupTasks[k].logbook
      )
      
      return keys.map(k => state.tasks[k]).concat(groupKeys.map(k => state.groupTasks[k]))
    },
    tasks(state) {
      const keys = Object.keys(state.tasks).filter(
        k => state.tasks[k] && !state.tasks[k].logbook
      )
      const groupKeys = Object.keys(state.groupTasks).filter(
        k => state.groupTasks[k] && !state.groupTasks[k].logbook
      )

      return keys.map(k => state.tasks[k]).concat(groupKeys.map(k => state.groupTasks[k]))
    },
    priorityOptions() {
      return [
        {
          name: 'No priority',
          icon: 'priority',
          color: 'var(--fade)',
        },
        {
          name: 'Low priority',
          icon: 'priority',
          color: 'var(--green)',
        },
        {
          name: 'Medium priority',
          icon: 'priority',
          color: 'var(--yellow)',
        },
        {
          name: 'High priority',
          icon: 'priority',
          color: 'var(--red)',
        }
      ]
    },
    getSpecificDayCalendarObj: () => moment => {
      const obj = {
  
        type: 'specific',
        editDate: mom().format('Y-M-D'),
        begins: mom().format('Y-M-D'),
  
        specific: (moment.format) ? moment.format('Y-M-D') : moment,
      }
      return obj
    },
    ...MemoizeGetters(null, {
      isCalendarObjectShowingToday({}, calendar, date, specific) {
        const c = calendar
        if (!calendar) return false

        if (specific && c.type !== 'specific') return false
        if (c.type === 'someday') return false
        // specific
        if (c.type === 'specific') {
          return date === c.specific
        }

        const tod = mom(date, 'Y-M-D')
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
          if (!c.lastCompleteDate && begins.isSame(tod, 'day')) return true
          
          const dayDiff = tod.diff(lastComplete, 'days')
          if (dayDiff < 0) return false
          const eventNotToday = dayDiff % c.afterCompletion !== 0
          if (eventNotToday) return false
        }
        
        if (c.type === 'daily') {
          const dayDiff = tod.diff(begins, 'days')
          if (dayDiff < 0) return false
          const eventNotToday = dayDiff % c.daily !== 0
          if (eventNotToday) return false
        }
        if (c.type === 'weekly') {
          const dayOfTheWeek = parseInt(tod.format('d'), 10)
          if (!c.weekly.days.includes(dayOfTheWeek))
          return false
          
          const weekDiff = tod.diff(begins.startOf('week'), 'weeks')
          if (weekDiff < 0) return false
          const eventNotToday = weekDiff % c.weekly.every !== 0
          if (eventNotToday) return false
        }
        if (c.type === 'monthly') {
          const monthDiff = tod.diff(begins.startOf('month'), 'months')
          if (monthDiff < 0) return false
          const eventNotToday = monthDiff % c.monthly.every !== 0
          if (eventNotToday) return false

          const next = utilsMoment.getNextMonthlyDate(c, tod.clone().subtract(1, 'd'))

          if (!next.isSame(tod, 'day')) return false
        }
        if (c.type === 'yearly') {
          const month = tod.month() + 1
          if (!c.yearly.months.includes(month))
            return false
          
          const yearDiff = tod.diff(begins.startOf('year'), 'years')
          if (yearDiff < 0) return false
          const eventNotToday = yearDiff % c.yearly.every !== 0
          if (eventNotToday) return false

          const next = utilsMoment.getNextMonthlyDate({
            monthly: {...c.yearly, every: 1}, begins: c.begins
          }, tod.clone().subtract(1, 'd'))

          if (!next.isSame(tod, 'day')) return false
        }



        return true
        
        
        /* if (c.type === 'periodic') {
          const dayDiff = tod.diff(mom(c.editDate, 'Y-M-D'), 'day')
          const eventNotToday = dayDiff % c.periodic !== 0
          if (eventNotToday) return false  
        }
        if (c.type === 'weekly') {
          const todaysWeekDayName = tod.format('ddd').toLowerCase()
          const eventNotToday = !c.weekly.find(w => w.toLowerCase() === todaysWeekDayName)
          if (eventNotToday) return false
        } */
      },
      isTaskCompleted: {
        getter({}, task, moment, compareDate) {
          let isCompleted = utils.isItemCompleted(task, moment)
          if (compareDate) {
            if (!task.completeDate) return false
            const taskCompleteDate = mom(task.completeDate, 'Y-M-D')
            const compare = mom(compareDate, 'Y-M-D')
            return isCompleted && taskCompleteDate.isSameOrAfter(compare, 'day')
          }
          return isCompleted
        },
        cache(args) {
          let task = args[0]
          const i = {
            completed: task.completed,
            calendar: task.calendar,
          }
          return JSON.stringify({i, a: [args[1], args[2]]})
        },
      },
      isTaskCanceled: {
        getter({}, task) {
          return task.canceled
        },
        cache(args) {
          return JSON.stringify({
            c: args[0].canceled,
            ca: args[0].calendar,
          }) 
        },
      },
      isTaskOverdue: {
        getter({getters}, task, date) {
          const calendar = task.calendar

          let tod = null
          const getTod = () => {
            if (tod) return tod
            tod = mom(date || TODAY_DATE, 'Y-M-D')
            return tod
          }
        
          if (task.deadline && !task.checked && mom(task.deadline, 'Y-M-D').isBefore(getTod(), 'day')) return true
          
          if (!calendar || getters.isTaskInView(task, "Logbook")) return false
          
          const c = calendar
          if (c.type === 'specific') {
            const spec = mom(c.specific, 'Y-M-D')
            return spec.isBefore(getTod(), 'day')
          }
          if (c.type === 'after completion') return false
          if (c.type === 'daily' || c.type === 'weekly' || c.type === 'monthly' || c.type === 'yearly') {
            const nextEvent = utilsMoment.getNextEventAfterCompletionDate(c)
            return nextEvent.isBefore(getTod(), 'day')
          }
/*           if (c.type === 'periodic') {
            return utilsMoment.getNextEventAfterCompletionDate(c).isBefore(getTod(), 'day')
          }
          if (c.type === 'weekly') {
            const lastWeeklyEvent = utilsMoment.getLastWeeklyEvent(c, getTod())
            const lastComplete = mom(c.lastCompleteDate, 'Y-M-D')
            return lastWeeklyEvent.isAfter(lastComplete, 'day')
          } */
  
          return false
        },
        cache(args) {
          const t = args[0]
          return JSON.stringify({
            c: t.calendar, co: t.completed,
            ce: t.checked,
            d: t.deadline,
          })
        },
      },
      isTaskInPeriod: {
        getter({}, task, initial, period, onlySpecific) {
          const c = task.calendar
          if (!calendar) return false
          if (onlySpecific && c.type !== 'specific') return false
          if (c.type === 'someday') return false
          // specific
          const first = utilsMoment.getFirstDayOfMonth(mom(initial, 'Y-M-D'))
          const last = utilsMoment.getFirstLastDayOfMonth(mom(initial, 'Y-M-D'))
      
          if (c.type === 'specific') {
            const spec = mom(c.specific, 'Y-M-D')
            return spec.isSameOrAfter(first, period) && spec.isSameOrBefore(last, period)
          }
          return false
        },
        cache(args) {
          return JSON.stringify({
            calendar: args[0].calendar,
            i: args[1], p: args[2], s: args[3],
          })
        },
      },
      isTaskShowingOnDate: {
        getter({getters}, task, date, onlySpecific) {
          if (task.deadline && mom(task.deadline, 'Y-M-D').isBefore(mom(TOM_DATE, 'Y-M-D'), 'day'))
            return false

          if (!utilsTask.hasCalendarBinding(task) || task.calendar.type === 'someday')
            return false
          if (onlySpecific && task.calendar.type !== 'specific') return false

          return getters.isCalendarObjectShowingToday(task.calendar, date, onlySpecific)
        },
        cache(args) {
          return JSON.stringify({
            task: args[0].calendar,
            deadline: args[0].deadline,
            date: args[1],
            onlySpecific: args[2],
          })
        }
      },
      isTaskWeekly: {
        getter({}, task) {
          return task.calendar && task.calendar.type === 'weekly'
        },
        cache(args) {
          return JSON.stringify({
            t: args[0].calendar
          })
        },
      },
      wasTaskLoggedLastWeek: {
        getter({}, task) {
          if (!task.logbook || !task.logDate)
            return false
          return mom(task.logbook, 'Y-M-D').isSame(
            mom(TODAY_DATE, 'Y-M-D').subtract(1, 'week')
          , 'week')
        },
        cache(args) {
          return args[0].logDate
        }
      },
      doesTaskPassInclusivePriority: {
        getter({}, task, inclusive) {
          if (inclusive === 'No priority')
            return !task.priority
          return inclusive === task.priority
        },
        cache(args) {
          return JSON.stringify({
            t: args[0].priority,
            p: args[1],
          })
        }
      },
      doesTaskPassExclusivePriorities: {
        getter({}, task, exclusive) {
          return exclusive.every(p => {
            if (p === 'No priority')
              return task.priority
            return task.priority !== p
          })
        },
        cache(args) {
          return JSON.stringify({
            t: args[0].priority,
            p: args[1],
          })
        }
      },
      hasTaskBeenCompletedOnDate: {
        getter({}, task, date) {
          return task.completeDate === date || task.checkDate === date
        },
        cache(args) {
          return JSON.stringify({t: args[0].completeDate, c: args[0].checkDate})
        }
      },
      isTaskInLogbookView: {
        getter({}, task) {
          return task.logbook
        },
        cache(args) {
          return args[0].logbook + ''
        },
      },
      getTaskDeadlineStr: {
        getter({}, task, date, l) {
          const getDaysLeft = (deadline, date) => {
            const dead = mom(deadline, 'Y-M-D')
            const compare = mom(date, 'Y-M-D')
            const diff = dead.diff(compare, 'days')
            if (diff === 0)
              return 'Ends today'
            else if (diff === 1)
              return `1 day left`
            else if (diff < 0) {
              if (Math.abs(diff) === 1)
                return '1 day ago'
              return `${Math.abs(diff)} days ago`
            }
            return `${diff} days left`
          }
          
          if (!task.deadline)
            return null
          const readable = utils.getHumanReadableDate(task.deadline, l)
          return (readable === 'Today' ? '' : readable) + ' ' + getDaysLeft(task.deadline, date)
        },
        cache(args) {
          return args[0].deadline
        },
      },
      isTaskInView: {
        getter({getters}, task, view) {
          switch (view) {
            case 'Inbox': return getters.isTaskInbox(task)
            case 'Today': return getters.isTaskShowingOnDate(task, TODAY_DATE)
            case 'Someday': return getters.isTaskSomeday(task)
            case 'Overdue': return getters.isTaskOverdue(task)
            case 'Deadlines': return task.deadline
            case 'Recurring': return getters.isRecurringTask(task)
            case 'Anytime': return getters.isTaskAnytime(task)
            case 'Tomorrow': return getters.isTaskShowingOnDate(task, TOM_DATE)
            case 'Logbook': return getters.isTaskInLogbookView(task)
          }
        },
        cache(args) {
          const view = args[1]
          const t = args[0]
          let obj = {}

          switch (view) {
            case 'Inbox': {
              obj = {
                completed: t.completed,
                calendar: t.calendar,
                list: t.list,
                d: t.deadline,
                group: t.group,
                folder: t.folder,
                tags: t.tags,
              }
              break
            }
            case 'Anytime': {
              obj = {
                calendar: t.calendar,
                list: t.list,
                group: t.group,
                folder: t.folder,
                tags: t.tags,
              }
              break
            }
            case 'Today': {
              obj = {
                calendar: t.calendar,
                deadline: t.deadline,
                today: TODAY_DATE,
                complete: t.completeDate,
                checkCom: t.checkDate,
              }
              break
            }
            case 'Someday': {
              obj = t.calendar
              break
            }
            case 'Overdue': {
              obj = {
                c: t.calendar,
                t: t.completed,
                d: t.deadline,
              }
              break
            }
            case 'Tomorrow': {
              obj = {
                calendar: t.calendar,
                deadline: t.deadline,
                today: TOM_DATE,
                complete: t.completeDate,
                checkCom: t.checkDate,
              }
              break
            }
            case 'Logbook': {
              obj = {
                cal: t.calendar,
                deadline: t.deadline,
                complete: t.completeDate,
                ca: t.canceled,
              }
              break
            }
            case 'Deadlines': {
              obj = {
                d: t.deadline,
                c: t.completed,
                ca: t.canceled,
              }
              break
            }
            case 'Recurring': {
              obj = {
                cal: t.calendar,
                c: t.completed,
                ca: t.canceled,
              }
              break
            }
          }

          return JSON.stringify({obj, view})
        },
      },
      isTaskInOneYear: {
        getter({}, task) {
          if (!task.calendar || task.calendar.type !== 'specific') return false
          return mom().add(1, 'y').startOf('year').isBefore(mom(task.calendar.specific, 'Y-M-D'), 'day')
        },
        cache(args) {
          return JSON.stringify(args[0].calendar)
        },
      },
      isRecurringTask: {
        getter({}, task) {
          const c = task.calendar
          return c && c.type !== 'someday' && c.type !== 'specific'
        },
        cache(args) {
          return JSON.stringify(args[0].calendar)
        },
      },
      isTaskDeadlineInOneYear: {
        getter({}, task) {
          if (!task.deadline)
            return false
          return mom().add(1, 'y').startOf('year').isBefore(mom(task.deadline, 'Y-M-D'), 'day')
        },
        cache(args) {
          return args[0].deadline
        },
      },
      isOldTask: {
        getter({}, task) {
          if (!task.logDate)
            return false
          return mom(task.logDate, 'Y-M-D').isBefore(TODAY_MOM, 'year')
        },
        cache(args) {
          return args[0].logDate
        },
      },
      wasTaskLoggedInMonth: {
        getter({}, task, monthNum) {
          return mom(task.logDate, 'Y-M-D').isSame(mom().month(monthNum), 'month')
        },
        cache(args) {
          return ('' + args[0].logDate) + args[1]
        },
      },
      isTaskInMonth: {
        getter({}, task, monthNum) {
          if (!task.calendar || task.calendar.type !== 'specific') return false
          return mom(task.calendar.specific, 'Y-M-D').isSame(mom().month(monthNum), 'month')
        },
        cache(args) {
          return JSON.stringify([args[0].calendar, args[1]])
        },
      },
      isTaskDeadlineThisMonth: {
        getter({}, task) {
          if (!task.deadline)
            return false
          return mom(task.deadline, 'Y-M-D').isSame(mom(), 'month')
        },
        cache(args) {
          return args[0].deadline
        },
      },
      isTaskDeadlineInMonth: {
        getter({}, task, month) {
          if (!task.deadline)
            return false
          return mom(task.deadline, 'Y-M-D').isSame(mom().month(month), 'month')
        },
        cache(args) {
          return JSON.stringify([args[0].deadline, args[1]])
        },
      },
      isTaskInSevenDays: {
        getter({}, task) {
          if (!task.calendar) return false
          return mom().add(7, 'd').isBefore(mom(task.calendar.specific, 'Y-M-D'), 'day')
        },
        cache(args) {
          return JSON.stringify(args[0].calendar)
        },
      },
      isTaskInOneMonth: {
        getter({}, task) {
          if (!task.calendar) return false
          return mom().add(1, 'M').startOf('month').isBefore(mom(task.calendar.specific, 'Y-M-D'), 'day')
        },
        cache(args) {
          return JSON.stringify(args[0].calendar)
        },
      },
      isTaskInbox: {
        getter({}, task) {
          return !task.group &&
          !task.deadline &&
          !utilsTask.hasCalendarBinding(task) &&
          !task.list &&
          !task.folder &&
          (task.tags && task.tags.length === 0)
        },
        cache(args) {
          const t = args[0]
          return JSON.stringify({
            com: t.completed,
            che: t.checked,
            cal: t.calendar,
            gro: t.group,
            d: t.deadline,
            lis: t.list,
            fol: t.folder,
            tag: t.tags,
          })
        },
      },
      isTaskAnytime: {
        getter({}, task) {
          const hasListOrFolderOrTag = task.list || task.folder || task.group || (task.tags && task.tags.length > 0)
          return hasListOrFolderOrTag &&
            !utilsTask.hasCalendarBinding(task)
        },
        cache(args) {
          const t = args[0]
          return JSON.stringify({
            l: t.list, f: t.folder, t: t.tags,
            c: t.calendar,
            g: t.group,
          })
        },
      },
      isTaskSomeday: {
        getter({}, task) {
          return task.calendar && task.calendar.type === 'someday'
        },
        cache(args) {
          if (args[0].calendar)
            return JSON.stringify({
              t: args[0].calendar.type
            })
          return ''
        }
      },
      doesTaskPassExclusiveFolders: {
        getter({}, task, ids) {
          return ids.every(el => task.folder !== el)
        },
        cache(args) {
          return JSON.stringify({t: args[0].folder, l: args[1]})
        }
      },
      doesTaskIncludeText: {
        getter({}, task, name) {
          return task.name && task.name.includes(name)
        },
        cache(args) {
          return JSON.stringify({t: args[0].name, n: args[1]})
        }
      },
      doesTaskPassInclusiveFolder: {
        getter({}, task, folderId) {
          return task.folder === folderId
        },
        cache(args) {
          return JSON.stringify({t: args[0].folder, l: args[1]})
        }
      },
      doesTaskPassExclusiveLists: {
        getter({}, task, ids) {
          return ids.every(el => task.list !== el)
        },
        cache(args) {
          return JSON.stringify({t: args[0].list, l: args[1]})
        }
      },
      doesTaskPassInclusiveList: {
        getter({}, task, listId) {
          return task.list === listId
        },
        cache(args) {
          return JSON.stringify({t: args[0].list, l: args[1]})
        }
      },
      doesTaskPassExclusiveTags: {
        getter({}, task, tags, savedTags) {

          const foundChild = parent => {

            const childs = savedTags.filter(tag => tag.parent === parent)
            for (const tag of childs)
              if ((task.tags && task.tags.includes(tag.id)) || foundChild(tag.id))
                return true
            return false
          }

          for (const id of tags) {
            if ((task.tags && task.tags.includes(id)) || foundChild(id)) return false
          }

          return true
        },
        cache(args) {
          return JSON.stringify({
            k: args[0].tags, t: args[1],
            s: args[2].map(el => ({i: el.id, p: el.parent})),
          })
        }
      },
      doesTaskPassInclusiveTags: {
        getter({}, task, tags, savedTags) {
          const foundChild = parent => {

            const childs = savedTags.filter(tag => tag.parent === parent)
            for (const tag of childs)
              if ((task.tags && task.tags.includes(tag.id)) || foundChild(tag.id))
                return true
            return false
          }

          for (const id of tags)
            if ((!task.tags || !task.tags.includes(id)) && !foundChild(id)) return false

          return true
        },
        cache(args) {
          return JSON.stringify({
            k: args[0].tags, t: args[1],
            s: args[2].map(el => ({i: el.id, p: el.parent})),
          })
        }
      },
      isTaskInFolder: {
        getter({}, task, folderId) {
          return task.folder === folderId
        },
        cache(args) {
          return JSON.stringify({
            t: args[0].folder,
            l: args[1],
          })
        }
      },
      isTaskInGroup: {
        getter({}, task, groupId) {
          return task.group === groupId
        },
        cache(args) {
          return JSON.stringify({
            t: args[0].group,
            l: args[1],
          })
        }
      },
      isTaskInList: {
        getter({}, task, listId) {
          return task.list === listId
        },
        cache(args) {
          return JSON.stringify({
            t: args[0].list,
            l: args[1],
          })
        }
      },
      isTaskInHeading: {
        getter({}, task, heading) {
          return task.heading === heading.id
        },
        cache(args) {
          return JSON.stringify({
            t: args[0].heading,
            h: args[1].id,
          })
        },
      },
      isTaskInListRoot: {
        getter({}, task) {
          return task.list && !task.heading
        },
        cache(args) {
          return JSON.stringify({
            l: args[0].list,
            h: args[0].heading,
          })
        },
      },
      isTaskLastDeadlineDay: {
        getter({}, task, date) {
          if (!task.deadline || task.completed || task.canceled)
            return false
          return task.deadline === (date || TODAY_DATE)
        },
        cache(args) {
          return JSON.stringify({
            d: args[0].deadline,
            c: args[0].completed,
            ca: args[0].canceled,
            da: args[1],
          })
        },
      },
    }),
    ...MemoizeGetters('tasks', {
      getEndsTodayTasks: {
        react: [
          'completed',
          'deadline',
          'canceled',
        ],
        getter({getters}, date) {
          return getters.tasks.filter(t => getters.isTaskLastDeadlineDay(t, date)) 
        },
        cache(args) {
          return args[0]
        },
      },
      getNumberOfTasksByTag: {
        react: [
          'tags',
        ],
        getter({getters, state}, {tagId, tags}) {
          const ts = getters.tasks.filter(
            task => getters.doesTaskPassInclusiveTags(task, [tagId], tags)
          )
    
          return {
            total: ts.length,
            notCompleted: ts.filter(
              task => !getters.isTaskInView(task, "Logbook")
            ).length,
          }
        },
      },
      getOverdueTasks: {
        react: [
          'calendar',
          'completed',
        ],
        getter({getters, state}) {
          return getters.tasks.filter(getters.isTaskOverdue)
        },
      },
      getAssignedTasksByList: {
        react: [
          'canceled',
          'calendar',
          'completed',
          'group',
          'list',
          'assigned',
        ],
        getter({getters}, groupId, list) {
          const userId = uid()
          return getters.tasks.filter(t => 
              !getters.isTaskCompleted(t) &&
              !getters.isTaskCanceled(t) &&
              t.assigned === userId &&
              t.group === groupId &&
              t.list === list
            ).length
        },
      },
      numberOfAssignedToMeTasks: {
        react: [
          'canceled',
          'calendar',
          'group',
          'list',
          'completed',
          'assigned',
        ],
        getter({getters}, groupId) {
          const userId = uid()
          return getters.tasks.filter(t =>
            !getters.isTaskCompleted(t) &&
            !getters.isTaskCanceled(t) &&
            t.assigned === userId &&
            t.group === groupId
          ).length
        },
      },
      getTasksById({getters}, ids) {
        const arr = []
        for (const id of ids) {
          const task = getters.tasks.find(el => el.id === id)
          if (task) arr.push(task)
        }
        return arr
      },
      getNumberOfTasksByView: {
        react: [
          'calendar',
          'completed',
          'list',
          'folder',
          'deadline',
          'group',
          'tags',
          'completeDate',
        ],
        getter({getters}, viewName) {
          const ts = getters.tasks.filter(
            task => getters.isTaskInView(task, viewName)
          )
  
          return {
            total: ts.length,
            notCompleted: ts.filter(
              task => !getters.isTaskInView(task, "Logbook")
            ).length,
          }
        },
      },
    }, true),
  },
  actions: {
    addTask({rootState}, obj) {
      const b = fire.batch()

      setTask(b, {
        userId: uid(),
        createdFire: new Date(),
        created: mom().format('Y-M-D HH:mm ss'),
        ...obj,
      }, rootState, obj.id).then(() => {
        b.commit()
      })
    },
    addMultipleTasks({rootState}, tasks) {
      const b = fire.batch()

      const writes = []
      const pros = []
      
      for (const t of tasks) {
        const ref = taskRef()
        pros.push(
          setTask(b, {
            ...t,
            createdFire: new Date(),
            created: mom().format('Y-M-D HH:mm ss'),
            userId: uid(),
            id: ref.id,
          }, rootState, ref.id, writes)
        )
      }

      cacheBatchedItems(b, writes)
      Promise.all(pros).then(() => {
        b.commit()
      })
    },
    saveTask({rootState}, obj) {
      const b = fire.batch()
      setTask(b, obj, rootState, obj.id).then(() => {
        b.commit()
      })
    },
    deleteTasks({rootState}, ids) {
      const b = fire.batch()

      batchDeleteTasks(b, ids, rootState)

      b.commit()
    },
    saveSchedule(c, {date, schedule}) {
      const b = fire.batch()
      
      setInfo(b, {
        calendarOrders: {
          [date]: {schedule},
        }
      })

      b.commit()
    },
    saveCalendarOrder({rootState}, {ids, date}) {
      const calendarOrders = utilsTask.getUpdatedCalendarOrders(ids, date, rootState)
      const b = fire.batch()
      
      setInfo(b, {calendarOrders})

      b.commit()
    },
    convertTasksToListByIndex({rootState}, {tasks, folder, group, order, savedLists, indicies}) {
      const tasksWithConflictingListNames = {}

      tasks.forEach(task => {
        if (savedLists.find(l => l.name === task.name))
          tasksWithConflictingListNames[task.id] = true
      })
      
      const b = fire.batch()

      const writes = []

      tasks.forEach(task => {

        const list = listRef(task.id)
        deleteTask(b, task.id, rootState, writes)

        const subIds = []
        if (task.checklist)
          for (const t of task.checklist) {
            setTask(b, {
              folder: null,
              group,
              userId: uid(),
              name: t.name,
              createdFire: new Date(),
              created: mom().format('Y-M-D HH:mm ss'),
              id: t.id,
              priority: '',
              list: list.id,
              calendar: null,
              heading: null,
              tags: [],
              checklist: [],
              order: [],
            }, rootState, t.id, writes)
            subIds.push(t.id)
          }

        setList(b, {
          userId: uid(),
          smartViewsOrders: {},
          folder,
          group,
          createdFire: new Date(),
          created: mom().format('Y-M-D HH:mm ss'),
          name: tasksWithConflictingListNames[task.id] ? task.name + ' (list)' : task.name,
          notes: task.notes || null,
          tags: task.tags || [],
          assigned: task.assigned || null,
          tasks: subIds,
          headings: [],
          headingsOrder: [],
        }, list.id, rootState, writes)
        
      })

      if (folder)
        setFolder(b, {order}, folder, rootState, writes)
      else if (group)
        setGroup(b, {listsOrder: order}, group, rootState, writes)

      cacheBatchedItems(b, writes)
      
      b.commit()
    },
    convertToList({rootState}, {task, savedLists}) {
      const existingList = savedLists.find(l => l.name === task.name)
      if (!existingList) {
        const b = fire.batch()
  
        let folder = null
        let group = null
        if (task.list) {
          const list = savedLists.find(l => l.id === task.list)
          if (list && list.folder) folder = list.folder
        }
        if (task.folder)
          folder = task.folder
        if (task.group) {
          group = task.group
        }

        const writes = []
  
        const list = listRef()
        deleteTask(b, task.id, rootState, writes)
        
        const ids = []
        if (task.checklist)
        for (const t of task.checklist) {
          setTask(b, {
            id: t.id,
            createdFire: new Date(),
            created: mom().format('Y-M-D HH:mm ss'),
            cloud_function_edit: false,
            folder: null,
            group,
            userId: uid(),
            name: t.name,
            priority: '',
            list: list.id,
            calendar: null,
            heading: null,
            tags: [],
            checklist: [],
            order: [],
          }, rootState, t.id, writes)
          ids.push(t.id)
        }
  
        setList(b, {
          folder,
          group,
          userId: uid(),
          createdFire: new Date(),
          created: mom().format('Y-M-D HH:mm ss'),
          users: [uid()],
          assigned: task.assigned || null,
          smartViewsOrders: {},
          name: task.name,
          notes: task.notes || null,
          tags: task.tags || [],
          descr: '',
          tasks: ids,
          headings: [],
          headingsOrder: [],
        }, list.id, rootState, writes)

        cacheBatchedItems(b, writes)
  
        b.commit()
      }
    },
    async logTasks({rootState}, tasks) {
      const b = fire.batch()

      const writes = []

      await batchSetTasks(b, {
        logbook: true,
        logFire: new Date(),
        logDate: mom().format('Y-M-D'),
        fullLogDate: mom().format('Y-M-D HH:mm ss'),
      }, tasks, rootState, writes)

      cacheBatchedItems(b, writes)
      
      b.commit()
    },
    async unlogTasks({rootState}, tasks) {
      const b = fire.batch()

      const writes = []

      await batchSetTasks(b, {
        logbook: false,
        logFire: fd().delete(),
        logDate: fd().delete(),
        fullLogDate: fd().delete(),
      }, tasks, rootState, writes)

      cacheBatchedItems(b, writes)
      
      b.commit()
    },
    completeTasks({rootState}, tasks) {
      const b = fire.batch()

      const writes = []
      for (const t of tasks) {
        let c
        let calendar = c = t.calendar
        if (c && c.type !== 'someday') {
          if (c.type === 'after completion') {
            c.lastCompleteDate = mom().format('Y-M-D')
          }
          else if (c.type === 'daily' || c.type === 'weekly' || c.type === 'monthly' || c.type === 'yearly') {
            const nextEventAfterCompletion = utilsMoment.getNextEventAfterCompletionDate(c, true)
            c.lastCompleteDate = nextEventAfterCompletion.format('Y-M-D')
          }

          if (c.times) c.times--
          if (c.times === 0) c.times = null
        }

        const tod = mom()
        let obj = {
          completedFire: new Date(),
          completeDate: tod.format('Y-M-D'),
          checkDate: tod.format('Y-M-D'),
          fullCheckDate: tod.format('Y-M-D HH:mm ss'),
          fullCompleteDate: tod.format('Y-M-D HH:mm ss'),
          completed: true,
          checked: true,
          canceled: false,
          cancelDate: null,
          fullCancelDate: null,
          calendar,
        }

        const isNotRecurringTask = !c || (c.type == 'someday' || c.type === 'specific')

        if (!rootState.userInfo.manuallyLogTasks && isNotRecurringTask) {
          obj = {
            ...obj,
            logbook: true,
            logFire: new Date(),
            logDate: mom().format('Y-M-D'),
            fullLogDate: mom().format('Y-M-D HH:mm ss'),
          }
        }
        
        setTask(b, obj, rootState, t.id, writes)
      }

      cacheBatchedItems(b, writes)
      
      b.commit()
    },
    uncompleteTasks({commit, rootState}, tasks) {
      const b = fire.batch()

      const writes = []
      for (const t of tasks) {
        const c = t.calendar
        if (c && c.times === 0) c.times = null
        if (c) {
          c.lastCompleteDate = null
        }

        setTask(b, {
          completedFire: null,
          completeDate: null,
          completed: false,
          checked: false,
          checkDate: null,
          fullCheckDate: null,
          calendar: c,
        }, rootState, t.id, writes)
      }
      cacheBatchedItems(b, writes)

      b.commit()
    },
    async cancelTasks({rootState}, ids) {
      const b = fire.batch()

      const tod = mom()

      let obj = {
        canceled: true,
        checked: true,
        cancelDate: tod.format('Y-M-D'),
        checkDate: tod.format('Y-M-D'),
        fullCancelDate: tod.format('Y-M-D HH:mm ss'),
        fullCheckDate: tod.format('Y-M-D HH:mm ss'),
        completedFire: null,
        completeDate: null,
        completed: false,
      }

      if (!rootState.userInfo.manuallyLogTasks) {
        obj = {
          ...obj,
          logbook: true,
          logFire: new Date(),
          logDate: mom().format('Y-M-D'),
          fullLogDate: mom().format('Y-M-D HH:mm ss'),
        }
      }

      await batchSetTasks(b, obj, ids, rootState)

      b.commit()
    },
    async uncancelTasks({rootState}, ids) {
      const b = fire.batch()

      await batchSetTasks(b, {
        canceled: false,
        checked: false,
        cancelDate: null,
        checkDate: null,
        fullCancelDate: null,
        fullCheckDate: null,
      }, ids, rootState)

      b.commit()
    },
    async saveTasksById({commit, rootState}, {ids, task}) {
      const b = fire.batch()

      await batchSetTasks(b, task, ids, rootState)

      b.commit()
    },
    async addTagsToTasksById({commit, rootState}, {ids, tagIds}) {
      const b = fire.batch()

      await batchSetTasks(b, {
        tags: tagIds,
      }, ids, rootState)

      b.commit()
    },
    async addListToTasksById({rootState}, {ids, listId}) {
      const b = fire.batch()

      const list = rootState.list.lists[listId] || rootState.list.groupLists[listId]

      let group = null
      if (list && list.group)
        group = list.group

      await batchSetTasks(b, {
        list: listId,
        group,
        folder: null,
        heading: null,
      }, ids, rootState)

      b.commit()
    },
    async addTasksToGroupById({rootState}, {ids, groupId}) {
      const b = fire.batch()

      await batchSetTasks(b, {
        list: null,
        folder: null,
        group: groupId,
        heading: null,
      }, ids, rootState)
      
      b.commit()
    },
    async addFolderToTasksById({commit, rootState}, {ids, folderId}) {
      const b = fire.batch()

      await batchSetTasks(b, {
        list: null,
        folder: folderId,
        group: null,
        heading: null,
      }, ids, rootState)
      
      b.commit()
    },
    copyTask(c, task) {
      const b = fire.batch()

      setTask(b, {
        ...task, files: [],
        createdFire: new Date(),
        created: mom().format('Y-M-D HH:mm ss'),
      }, rootState)

      b.commit()
    },
    handleTasksBySidebarElementDragAndDrop({dispatch, getters}, {elIds, taskIds, type}) {
      const calObj = (mom) => {
        return getters.getSpecificDayCalendarObj(mom)
      }
      switch (type) {
        case 'tag': {
          dispatch('addTagsToTasksById', {
            tagIds: elIds.slice(),
            ids: taskIds,
          })
          break
        }
        case 'list': {
          dispatch('addListToTasksById', {
            listId: elIds[0],
            ids: taskIds,
          })
          break
        }
        case 'group': {
          dispatch('addTasksToGroupById', {
            groupId: elIds[0],
            ids: taskIds,
          })
          break
        }
        case 'folder': {
          dispatch('addFolderToTasksById', {
            folderId: elIds[0],
            ids: taskIds,
          })
          break
        }
        case 'Today': {
          dispatch('saveTasksById', {
            ids: taskIds,
            task: {
              calendar: calObj(mom()),
            }
          })
          break
        }
        case 'Tomorrow': {
          dispatch('saveTasksById', {
            ids: taskIds,
            task: {
              calendar: calObj(mom().add(1, 'day')),
            }
          })
          break
        }
        case 'Someday': {
          dispatch('saveTasksById', {
            ids: taskIds,
            task: {
              calendar: {type: 'someday'}
            }
          })
          break
        }
        case 'Logbook': {
          dispatch('logTasks', taskIds)
          break
        }
      }
    },
  },
}
