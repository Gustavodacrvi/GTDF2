<template>
  <div class="Cards">
    <Card v-for='t in hasDurationAndTimeTasks' :key="t.id"
      v-bind="t"
      :duration="t.taskDuration"
      :time="t.calendar.time"
      :collisions='collisions'
      :task='t'
      :mainView='mainView'

      :timelineHeight='height'

      @dragging='dragg'
      @scroll='v => $emit("scroll", v)'
    />

    <Card v-for="t in eventsTimeArr" :key="t.id"
      v-bind="t"
      :mainView='mainView'

      :collisions='collisions'
      :timelineHeight='height'
    />
    
  </div>
</template>

<script>

import { mapGetters, mapState } from 'vuex'

import mom from 'moment'

import Card from './Card.vue'

export default {
  components: {
    Card,
  },
  props: ['date', 'height', 'mainView'],
  data() {
    return {
      dragging: null,
    }
  },
  methods: {
    dragg(v) {
      this.dragging = v
    },
    comesBeforeThan(targetId, testId) {
      const arr = this.timeArr
      
      for (const {id} of arr)
        if (id === targetId)
          return true
        else if (id === testId)
          return false

    },
  },
  computed: {
    ...mapState(['viewEvents', 'allowCalendar']),
    ...mapGetters({
      storeTasks: 'task/tasks',
      isTaskShowingOnDate: 'task/isTaskShowingOnDate',
      hasDurationAndTime: 'task/hasDurationAndTime',
      getItemStartAndEnd: 'task/getItemStartAndEnd',
    }),

    hasDurationAndTimeTasks() {
      return this.tasks.filter(
        t => this.hasDurationAndTime(t)
      )
    },
    tasksTimeArr() {
      return this.tasks.map(t => {
        if (!this.dragging)
          return this.getItemStartAndEnd(t)
        
        return this.getItemStartAndEnd(
          this.dragging.id === t.id ? {
            ...t,
            taskDuration: this.dragging.taskDuration,
            calendar: {
              ...t.calendar,
              time: this.dragging.time,
            },
          } : t)
      })
    },
    eventsTimeArr() {
      return this.allowCalendar ? this.viewEvents.map(obj =>
        obj.items.map(o => ({
          id: o.id,
          name: o.name,
          color: o.color || obj.color || '',

          start: o.start,
          end: o.end,
        }))
      ).flat() : []
    },
    timeArr() {
      return [...this.tasksTimeArr, ...this.eventsTimeArr]
    },
    collisions() {
      const arr = this.shallowCollisions

      const getTotal = ({target, ids}) => {
        let alreadyTouched = []
        
        return ids.reduce((tot, id) => {
          const next = arr.find(col => col.target === id)

          if (next.ids.filter(i => !alreadyTouched.includes(i))) {
            return tot
          } else {
            alreadyTouched = [...alreadyTouched, ...next.ids]
            return getTotal(next) + tot
          }

        }, 0) + ids.length
      }

      const totals = arr.map(getTotal)
      let final = []

      for (let i = 0;i < arr.length;i++)
        final.push({
          target: arr[i].target,
          color: arr[i].color,
          collisions: totals[i],
        })
      
      return final
    },
    shallowCollisions() {
      const arr = this.timeArr

      return arr.map(target => {
        const {start: strStart, end: strEnd, id, color} = target

        const start = mom(target.start, 'HH:mm')
        const end = mom(target.end, 'HH:mm')

        return {
          target: id,
          color,
          ids: arr.reduce((ids, taskProperties) => {
            const tryCollide = () => {
              if (taskProperties.id === id)
                return false
              
              const test = {
                end: mom(taskProperties.end, 'HH:mm'),
                start: mom(taskProperties.start, 'HH:mm'),
              }
    
              if (
                start.isBefore(test.end, 'minute') &&
                start.isAfter(test.start, 'minute')
              )
                return true
    
              if (
                taskProperties.start === strStart &&
                end.isBefore(test.end)
              )
                return true
    
              if (
                taskProperties.start === strStart &&
                taskProperties.end === strEnd &&
                this.comesBeforeThan(id, taskProperties.id)
              )
                return true
            }

            return tryCollide() ? [...ids, taskProperties.id] : ids

          }, []),
        }
      })
    },
    tasks() {
      return this.storeTasks.filter(
        t => this.isTaskShowingOnDate(t, this.date, false, true)
      )
    },
  },
}

</script>

<style scoped>

.Cards {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  z-index: 1;
}

</style>
