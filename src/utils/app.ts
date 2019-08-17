
import LoadingComponent from '@/components/LoadingComponent.vue'
import ErrorComponent from '@/components/ErrorComponent.vue'

import { Task, TaskInputObj, Perspective } from '@/interfaces/app'

import moment, { months } from 'moment'
import timezone from 'moment-timezone'

export default {
  AsyncComponent(comp: any): any {
    return () => ({
      component: comp,
      loading: LoadingComponent,
      error: ErrorComponent,
      delay: 200,
      timeout: 5000,
    })
  },
  filterTasksBySmartPerspective(name: string, tasks: Task[], timeZone: string, startOfTheWeek?: string): Task[] {
    switch (name) {
      case 'Inbox': {
        return tasks.filter(el => el.labels.length === 0 && !el.date)
      }
      case 'Have tags': return tasks.filter(el => el.labels.length > 0)
      case `Doesn't have tags`: return tasks.filter(el => el.labels.length === 0)
      case 'Today': {
        return tasks.filter(el => {
          if (!el.date) return false
          const today = timezone.utc()
          const saved = timezone.utc(`${el.date} ${today.format('HH:mm')}`, 'Y-M-D HH:mm').tz(timeZone)
          today.tz(timeZone)
          return today.isSame(saved, 'day')
        })
      }
      case 'Next week': {
        return tasks.filter(el => {
          if (startOfTheWeek && el.date) {
            const m = timezone.utc()
            const saved = timezone.utc(`${el.date} ${m.format('HH:mm')}`, 'Y-M-D HH:mm').tz(timeZone)
            m.tz(timeZone)
            const start = this.getNextWeek(m.clone(), startOfTheWeek)
            const end = start.clone().add(6, 'd')
            return start.isSameOrBefore(saved, 'day') && end.isSameOrAfter(saved, 'day')
          }
          return false
        })
      }
      case 'Next month': {
        return tasks.filter(el => {
          if (el.date) {
            const nextMonth = timezone.utc().add(1, 'M')
            const saved = timezone.utc(`${el.date} ${nextMonth.format('HH:mm')}`, 'Y-M-D HH:mm').tz(timeZone)
            nextMonth.tz(timeZone)
            const start = nextMonth.clone().startOf('month')
            const end = nextMonth.clone().endOf('month')

            return start.isSameOrBefore(saved, 'day') && end.isSameOrAfter(saved, 'day')
          }
          return false
        })
      }
      case 'Tomorrow': {
        return tasks.filter(el => {
          if (el.date) {
            const tom = timezone.utc().add(1, 'd')
            const saved = timezone.utc(`${el.date} ${tom.format('HH:mm')}`, 'Y-M-D HH:mm').tz(timeZone)
            tom.tz(timeZone)
            return tom.isSame(saved, 'day')
          }
          return false
        })
      }
      case 'Overdue': {
        return tasks.filter(el => {
          if (el.date) {
            const tom = timezone.utc()
            const saved = timezone.utc(`${el.date} ${tom.format('HH:mm')}`, 'Y-M-D HH:mm').tz(timeZone)
            tom.tz(timeZone)
            return saved.isBefore(tom, 'day')
          }
          return false
        })
      }
      case 'Upcoming': {
        return tasks.filter(el => {
          if (el.date) {
            const today = timezone.utc()
            const saved = timezone.utc(`${el.date} ${today.format('HH:mm')}`, 'Y-M-D HH:mm').tz(timeZone)
            today.tz(timeZone)
            return saved.isAfter(today, 'day')
          }
          return false
        })
      }
    }
    return tasks
  },
  filterTasksByPerspective(per: Perspective, tasks: Task[], timeZone: string, startOfTheWeek?: string): Task[] {
    if (!per.isSmart) {
      const pers = per as Perspective
      if (pers.priority)
        tasks = this.filterTasksByPriority(tasks, pers.priority)
      if (pers.includeAndLabels.length > 0)
        tasks = this.filterTasksByLabels(tasks, pers.includeAndLabels)
      if (pers.includeAndSmartPers)
        for (const smart of pers.includeAndSmartPers)
          tasks = this.filterTasksBySmartPerspective(smart, tasks, timeZone, startOfTheWeek)
      return tasks
    }
    return this.filterTasksBySmartPerspective(per.name, tasks, timeZone,startOfTheWeek)
  },
  snakeToCamel(s: string) {
    return s.replace(/(\-\w)/g, (m: any) => m[1].toUpperCase())
  },
  sortArrayByIds(arr: Array<{id: string, [key: string]: any}>, order: string[]): any[] {
    const sorted: any[] = []
    for (const id of order) {
      const lab: any | undefined = arr.find(el => el.id === id)
      if (lab)
        sorted.push(lab)
    }
    return sorted
  },
  arraysEqual(arr1: any[], arr2: any[]): boolean {
    if (arr1.length !== arr2.length)
      return false
    for (let i = arr1.length; i--;)
      if (arr1[i] !== arr2[i])
        return false
    return true
  },
  // tslint:disable-next-line:max-line-length
  fixOrder(arrOfObjects: Array<{id: string, [key: string]: any}>, orderOfObjects: string[], notIncludeMissingIds: boolean = false) {
    const arr = arrOfObjects.slice()
    const order = orderOfObjects.slice()
    if (!notIncludeMissingIds)
      for (const el of arr)
        if (!order.includes(el.id))
          order.push(el.id)
    const idsToRemove: string[] = []
    for (const id of order) {
      const task = arr.find(el => el.id === id)
      if (!task)
        idsToRemove.push(id)
    }
    for (const id of idsToRemove) {
      const index = order.indexOf(id)
      order.splice(index, 1)
    }
    return order
  },
  parseMomentTimeZone(str: string): string {
    return str.replace('/', ', ').replace('_', ' ')
  },
  deParseMomentTimeZone(str: string): string {
    return str.replace(', ', '/').replace(' ', '_')
  },
  filterTasksByLabels(tasks: Task[], labels: string[]): Task[] {
    for (const id of labels)
      tasks = tasks.filter(el => el.labels.includes(id))
    return tasks
  },
  filterTasksByPriority(tasks: Task[], priority: string): Task[] {
    if (priority && priority !== 'No priority')
      return tasks.filter(el => el.priority === priority)
    else if (priority && priority === 'No priority')
      return tasks.filter(el => el.priority === '')
    return tasks
  },
  sortTasksByMultipleCriteria(tasks: Task[], sort: string[]): Task[] {
    const obj: {[key: string]: (task1: Task, task2: Task) => number} = {
      name: (task1: Task, task2: Task) => {
        return task1.name.localeCompare(task2.name)
      },
      nameReversed: (task1: Task, task2: Task) => {
        return task2.name.localeCompare(task1.name)
      },
      priorityHighest: (task1: Task, task2: Task) => {
        const priA = task1.priority
        const priB = task2.priority
        switch (priA) {
          case 'Low priority':
            switch (priB) {
              case 'Low priority': return 0
              case 'Medium priority': return 1
              case 'High priority': return 1
              default: return -1
            }
          case 'Medium priority':
            switch (priB) {
              case 'Medium priority': return 0
              case 'High priority': return 1
              case 'Low priority': return -1
              default: return -1
            }
          case 'High priority':
            switch (priB) {
              case 'High priority': return 0
              case 'Low priority': return -1
              case 'Medium priority': return -1
              default: return -1
            }
        }
        return 0
      },
      priorityLowest: (task1: Task, task2: Task) => {
        const priA = task1.priority
        const priB = task2.priority
        switch (priA) {
          case 'Low priority':
            switch (priB) {
              case 'Low priority': return 0
              case 'Medium priority': return -1
              case 'High priority': return -1
              default: return 1
            }
          case 'Medium priority':
            switch (priB) {
              case 'Medium priority': return 0
              case 'High priority': return -1
              case 'Low priority': return 1
              default: return 1
            }
          case 'High priority':
            switch (priB) {
              case 'High priority': return 0
              case 'Low priority': return 1
              case 'Medium priority': return 1
              default: return 1
            }
        }
        return 0
      },
      creationDateNewest: (t1: Task, t2: Task) => {
        const mom1 = moment(`${t1.creationDate}`, 'Y-M-D HH:mm')
        const mom2 = moment(`${t2.creationDate}`, 'Y-M-D HH:mm')
        if (mom1.isSame(mom2)) return 0
        if (mom1.isBefore(mom2)) return 1
        if (mom1.isAfter(mom2)) return -1
        return 0
      },
      creationDateOldest: (t1: Task, t2: Task) => {
        const mom1 = moment(`${t1.creationDate}`, 'Y-M-D HH:mm')
        const mom2 = moment(`${t2.creationDate}`, 'Y-M-D HH:mm')
        if (mom1.isSame(mom2)) return 0
        if (mom1.isBefore(mom2)) return -1
        if (mom1.isAfter(mom2)) return 1
        return 0
      },
      lastEditDateNewest: (t1: Task, t2: Task) => {
        const mom1 = moment(`${t1.lastEditDate}`, 'Y-M-D HH:mm')
        const mom2 = moment(`${t2.lastEditDate}`, 'Y-M-D HH:mm')
        if (mom1.isSame(mom2)) return 0
        if (mom1.isBefore(mom2)) return 1
        if (mom1.isAfter(mom2)) return -1
        return 0
      },
      lastEditDateOldest: (t1: Task, t2: Task) => {
        const mom1 = moment(`${t1.lastEditDate}`, 'Y-M-D HH:mm')
        const mom2 = moment(`${t2.lastEditDate}`, 'Y-M-D HH:mm')
        if (mom1.isSame(mom2)) return 0
        if (mom1.isBefore(mom2)) return -1
        if (mom1.isAfter(mom2)) return 1
        return 0
      },
    }

    tasks.sort((task1: Task, task2: Task) => {

      for (let i = 0; i < 7; i++) {
        const compare = obj[sort[0]]
        if (compare) {
          const result = compare(task1, task2)
          if (result) return result
        }
      }

      return 0
    })

    return tasks
  },
  parseUtcTime(time: string, timeZone: string, timeFormat: string): string {
    const t = time.toLowerCase()
    if (timeFormat === '1:00pm')
      return timezone.utc(t, 'Y-M-D HH:mm').tz(timeZone).format('hh:mm a').replace(' ', '')
    return timezone.utc(t, 'Y-M-D HH:mm').tz(timeZone).format('HH:mm')
  },
  getTaskInputTime(values: string[], timeFormat: '13:00' | '1:00pm') {
    const parseTime = (time: string): string => {
      if (timeFormat === '13:00')
        return moment(time, 'H:m').format('HH:mm')
      return moment(time, 'H:m a').format('HH:mm a')
    }
    const isValidTime = (str: string): boolean => {
      const time = parseTime(str)
      const twelveHourFormat = timeFormat === '1:00pm'
      const format = twelveHourFormat ? 'HH:mm a' : 'HH:mm'
      return moment(time, format, true).isValid()
    }
    for (const v of values)
      if (v && v.includes(':') && isValidTime(v.toLowerCase()) && !v.includes('24:00'))
        return parseTime(v)
    return null
  },
  getNextWeek(mom: any, nextWeek: string) {
    const clone = mom.clone()
    while (true) {
      const week = clone.format('dddd')
      if (week === nextWeek)
        break
      clone.add(1, 'd')
    }
    return clone
  },
  getUtcValuesFromTaskInputObj(obj: TaskInputObj, timeZone: string): {date: string, time: string} {
    let date = ''
    let time = ''
    if (obj.time) {
      const u = timezone.tz(`${obj.year}-${obj.month}-${obj.day} ${obj.time}`, 'Y-M-D HH:mm', timeZone).utc()
      date = u.format('Y-M-D')
      time = u.format('HH:mm')
    } else {
      const u = timezone.tz(`${obj.year}-${obj.month}-${obj.day}`, 'Y-M-D', timeZone).utc()
      date = u.format('Y-M-D')
    }
    return {date, time}
  },
  // tslint:disable-next-line:max-line-length
  parseTaskInputTime(input: string, timeFormat: '13:00' | '1:00pm', timeZone: string, nextWeek: string): TaskInputObj & {utc: {date: string, time: string}} {
    const parseDateInput = (value: string, callback: (str: string | null) => void): any => {
      const exists = value.includes(' $')
      let str: string | null = null
      if (exists)
        str = value.substr(value.indexOf(' $')).replace(' $', '')
      return callback(str)
    }
    const isNumber = (num: any): boolean => {
      return !isNaN(parseInt(num, 10))
    }
    const getYear = (values: string[]): number => {
      for (const v of values)
        if (isNumber(v) && v.length > 3 && !v.includes(':'))
          return parseInt(v, 10)
      return moment().year()
    }
    const getMonth = (values: string[]): number => {
      for (const str of values) {
        const mom = moment(str, 'MMMM')
        if (mom.isValid()) return mom.month() + 1
      }
      return moment().month() + 1
    }
    const getDay = (values: string[], month: number, year: number): number => {
      for (const v of values)
        if (isNumber(v) && v.length < 3 && parseInt(v, 10) < 32 && parseInt(v, 10) > 0)
          if (moment(`${v}-${month}-${year}`, 'D-M-Y', true).isValid())
            return parseInt(v, 10)
      return parseInt(moment().format('D'), 10)
    }
    const searchKeyWords = (str: string, obj: TaskInputObj): TaskInputObj => {
      const getNextWeek = (mom: any, firstDayOfTheWeek: string): any => {
        const f = firstDayOfTheWeek
        const mo = mom.clone()

        mo.add(1, 'd')
        if (f !== 'Invalid date')
          while (true) {
            if (mo.format('dddd') === f) return mo
            mo.add(1, 'd')
          }
        else return undefined
      }

      const values = str.split(' ')
      let tod = moment()
      let m = moment(`${obj.day}-${obj.month}-${obj.year} ${obj.time}`, 'D-M-Y HH:mm')
      let inKeyword = false
      let inHour = false

      // dont remove this
      // tslint:disable-next-line:curly
      if (str.includes('next ')) {
        for (let i = 0; i < values.length; i++)
          if (values[i] === 'next' && values[i + 1]) {
            const v = values[i + 1]
            let found = false
            switch (v) {
              case 'day': {
                tod.add(1, 'd')
                inKeyword = found = true
                break
              }
              case 'week': {
                tod = getNextWeek(tod, nextWeek)
                inKeyword = found = true
                found = true
                break
              }
              case 'month': {
                tod = tod.startOf('month').add(1, 'M')
                inKeyword = found = true
                break
              }
              case 'year': {
                tod = tod.startOf('month').startOf('year').add(1, 'y')
                inKeyword = found = true
                break
              }
            }
            if (found) break
            const ins = getNextWeek(tod, moment(v, 'dddd').format('dddd'))
            if (ins) {
              tod = ins
              inKeyword = true
            }
            break
          }
      } else if (str.includes('tomorrow') || str.includes('tom')) {
        tod.add(1, 'd')
        inKeyword = true
      } else if (str.includes('in '))
        for (let j = 0; j < values.length; j++) {
          const q = values[j + 1]
          const k = values[j + 2]
          if (values[j] === 'in' && q && isNumber(q) && k)
            switch (k) {
              case 'days': tod.add(q, 'd'); inKeyword = true; break
              case 'months': tod.add(q, 'M'); inKeyword = true; break
              case 'weeks': tod.add(q, 'w'); inKeyword = true; break
              case 'years': tod.add(q, 'y'); inKeyword = true; break
              case 'hours': tod.add(q, 'h'); inKeyword = true; inHour = true;  break
            }
        }
      if (inKeyword) m = tod

      const o: TaskInputObj = {
        year: parseInt(m.format('Y'), 10),
        month: parseInt(m.format('M'), 10),
        day: parseInt(m.format('D'), 10),
        time: m.format('HH:mm'),
      }
      if (!obj.time)
        o['time'] = null
      if (inHour)
        o['time'] = tod.format('HH:mm')

      return o
    }

    return parseDateInput(input, (str): any => {
      if (str) {
        const values = str.split(' ')

        const month = getMonth(values)
        const year = getYear(values)
        const day = getDay(values, month, year)
        const time = this.getTaskInputTime(values, timeFormat)

        const obj = searchKeyWords(str, {month, year, day, time})
        const utc = this.getUtcValuesFromTaskInputObj(obj, timeZone)

        return {...obj, utc}
      }
    })
  },
  // tslint:disable-next-line:max-line-length
  parseTaskInputObjectToString(obj: TaskInputObj | undefined, timeFormat: '13:00' | '1:00pm', timeZone: string): string {
    if (obj && timeZone && timeFormat) {
      let time = obj.time

      const today = timezone.utc().tz(timeZone)
      let typed!: any
      if (time)
        typed = timezone.tz(`${obj.year}-${obj.month}-${obj.day} ${time}`, 'Y-M-D HH:mm', timeZone)
      else 
        typed = timezone.tz(`${obj.year}-${obj.month}-${obj.day}`, 'Y-M-D', timeZone)

      let str = `${moment().month(obj.month - 1).format('MMMM')} ${obj.day}, ${obj.year}`

      if (today.isSame(typed, 'day')) str = 'Today'
      today.add(1, 'd')
      if (today.isSame(typed, 'day')) str = 'Tomorrow'

      if (time) {
        if (timeFormat === '1:00pm')
          time = moment(time, 'HH:mm').format('hh:mm a')
        str += ` at ${obj.time}`
      }
      str += ', ' + typed.format('dddd')

      return str
    }
    return ''
  },
}
