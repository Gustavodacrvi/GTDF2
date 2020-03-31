

import InputDrop from "@/components/Auth/DropInput.vue"
import SmartIconDrop from "@/components/Icons/SmartIconDrop.vue"
import ChecklistVue from '@/components/View/Tasks/Checklist/Checklist.vue'
import momUtils from '@/utils/moment'

import { mapGetters, mapState } from 'vuex'

import utils from "@/utils/"

export default ({
  value,
  textFields,
  checklist, leftSmartIconDrops,
  saveByShortcut = () => {},
  instance = {},
  props = [],
}) => ({
  props: ['item', 'firstFieldOptions', 'value', ...props],
  data() {
    return {
      currentPrefix: '',
      cursorPos: 0,
      isFirstEdit: true,
      isAddingChecklist: false,
      
      ...(instance.data ? instance.data() : {}),
    }
  },
  created() {
    if (this.item)
      this.model = {...this.model, ...this.item}

    setTimeout(() => this.isFirstEdit = false, 200)

    window.addEventListener('keydown', this.keydown)
    this.$store.commit('isEditing', true)
  },
  beforeDestroy() {
    this.$store.commit('isEditing', false)
    window.removeEventListener('keydown', this.keydown)
  },
  render(create) {

    let num = this.getFirstSmartIconKeyboardActionPosition - 1
    const leftComponents = leftSmartIconDrops.map(el => {
      
      num++
      return create(SmartIconDrop, {
        class: 'smart',
        props: {
          ...el.props,
          active: num === this.cursorPos,
        },
        ref: el.ref,

        on: {
          trigger: getModel => {
            if (el.onTrigger)
              el.onTrigger(this, getModel)
          },
        },
      })
    })

    const editChildren = [
      create('div', {class: 'text-fields'},
        textFields.map(el =>
          create(InputDrop, {
            class: 'field no-back',
            props: el.props,
            ref: el.ref,

            domProps: {
              value: this.model[el.vModel],
              options: el.options ? this[el.options] : [],
            },
            on: {
              input(event) {
                this.$emit('input', event.target.value)
              },
              cancel: () => this.$parent.$emit('close'),
            },
          })
        )
      ),
      create('div', {class: 'smart-icons'}, [
          create('div', {class: 'left-icons'}, leftComponents)
        ]
      )
    ]

    /*
      ref='checklist'
      :list='getChecklist'

      :activeChecklistId='activeChecklistId'
      :compareDate='getCompareDate'

      @move-cursor='moveCursor'

      @reset-cursor='resetCursor'
      @add='addSubtask'
      @remove='removeSubtask'
      @update='updateIds'
      @save-checklist='saveChecklist'
      @convert-task='convertTask'
      @is-adding-toggle='v => isAddingChecklist = v'
    */

    
    if (checklist)
      editChildren.splice(1, 0, create(ChecklistVue, {
        ref: 'checklist',

        props: {
          list: this.getChecklist,
          activeChecklistId: this.activeChecklistId,
          compareDate: this.getCompareDate,
        },

        on: {
          moveCursor: this.moveCursor,
          resetCursor: this.resetCursor,
          isAddingToggle: v => this.isAddingChecklist = v,
          add: this.addSubtask,
          remove: this.removeSubtask,
          update: this.updateIds,
          saveChecklist: this.saveChecklist,
        },
      })
    )
    
    return create('div', {
      class: 'EditBuilder',
      on: {
        click: evt => evt.stopPropagation(),
        pointerdown: evt => evt.stopPropagation(),
      },
    }, editChildren)
  },
  methods: {
    updateIds(ids) {
      this.model[checklist.order] = ids
      this.saveChecklist()
    },
    resetCursor() {
      if (!this.isAddingChecklist)
        this.cursorPos = 0
    },
    moveCursor(dire) {
      const newIndex = this.cursorPos + dire
      if (this.keyboardActions[newIndex])
        this.cursorPos = newIndex
    },
    cancel() {
      this.$emit('cancel')
    },
    incrementPos(inc) {
      const newIndex = this.cursorPos + inc
      if (this.keyboardActions[newIndex])
        this.cursorPos = newIndex
      else if (inc > 0)
        this.cursorPos = 0
      else this.cursorPos = this.lastKeyboardActionIndex
    },
    keydown(evt) {
      const p = () => evt.preventDefault()
      const {key} = evt

      const active = document.activeElement
      const isTyping = active && (active.nodeName === 'INPUT' || active.nodeName === 'TEXTAREA')

      if (checklist && this.isCursorInChecklist && !isTyping) {
        switch (key) {
          case "Delete": {
            this.removeSubtask(this.activeChecklistId)
            break
          }
          case '.': {
            this.$refs.checklist.toggleTask(this.activeChecklistId)
            p()
            break
          }
          case " ": {
            this.$refs.checklist.addEdit(this.cursorPos - 1)
            p()
            break
          }
          case "Enter": {
            if (!isTyping) {
              p()
              this.$refs.checklist.editChecklist(this.activeChecklistId)
            }
            break
          }
        }
      }

      if (key === "Escape" && !isTyping)
        this.cancel()
      if (key === "Enter" && this.isElementFunction && !isTyping)
        this.keyboardActions[this.cursorPos]()

      utils.saveByShortcut(this, true, key, p, saveByShortcut, ['CalendarPicker'])


      if (!this.iconDrop && this.firstFieldOptions.length === 0) {
        if (key === "ArrowUp") {
          p()
  
          if (this.isOnShift)
            this.cursorPos = 0
          else        
            this.incrementPos(-1)
        } else if (key === "ArrowDown") {
          p()
  
          if (this.isOnShift)
            this.cursorPos = this.lastKeyboardActionIndex
          else        
            this.incrementPos(1)
        }
      }
    },
    select(val) {
      const arr = this.value.split(' ')
      arr[arr.length - 1] = this.currentPrefix + val
      let str = ''
      for (const s of arr)
        str += s + ' '

      if (value)
        value(str.slice(0, -1), this)
    },
    match(n, prefix, arr, onFind) {
      for (const el of arr) {
        const elName = ` ${prefix}${el.name}`
        if (n.includes(elName)) {
          this.model.name = n.replace(elName, '')
          onFind(el)
          break
        }
      }

      const split = n.split(' ')
      const lastWord = split[split.length - 1]
      if (lastWord[0] === prefix) {
        this.currentPrefix = prefix
        const word = lastWord.substr(1)

        send(
          arr.map(el => el.name).filter(el => el.toLowerCase().includes(word.toLowerCase()))
        )
        changedOptions = true
      }
    },
    focusName() {
      this.$emit('focus-on-field')
    },

    ...(instance.methods || {}),
  },
  computed: {
    ...mapState({
      userInfo: state => state.userInfo,
      iconDrop: state => state.iconDrop,
      user: state => state.user,

      isOnControl: state => state.isOnControl,
      isOnShift: state => state.isOnShift,
      isOnAlt: state => state.isOnAlt,
    }),
    ...mapGetters({
      lists: 'list/sortedLists',
      folders: 'folder/sortedFolders',
      groups: 'group/sortedGroupsByName',
      tags: 'tag/sortedTagsByName',
      isRecurringTask: 'task/isRecurringTask',
    }),

    getFirstSmartIconKeyboardActionPosition() {
      return this.fieldFunctions.length + 1 + (this.hasChecklist ? this.model[checklist.vModel].length : 0)
    },
    getCompareDate() {
      if (!this.item) return null
      const c = this.item.calendar
      if (!c || !this.isRecurringItem(this.item))
        return null
      return momUtils.getNextEventAfterCompletionDate(c).format('Y-M-D')
    },
    fieldFunctions() {
      return textFields.map(el => () => this.$refs[el.ref].focusInput(0))
    },
    keyboardActions() {
      const c = ref => () => this.$refs[ref].click()

      const obj = {
        0: this.focusName,
      }

      let num = 1
      
      this.fieldFunctions.forEach(func => {
        obj[num] = func
        num++
      })
      
      const hasChecklist = this.hasChecklist

      for (const t of this.getChecklist) {
        obj[num] = t.id
        num++ 
      }
      
      const getIconsObj = () => {

        return leftSmartIconDrops.reduce((obj, {ref}) => {
          obj[num] = () => this.$refs[ref].activate()
          num++
          return obj
        }, {})
      }
      
      return {
        ...obj,
        ...getIconsObj(),
      }
    },
    hasChecklist() {
      return checklist && this.model[checklist.vModel].length > 0
    },
    isElementFunction() {
      const el = this.keyboardActions[this.cursorPos]
      return el && {}.toString.call(el) === '[object Function]'
    },
    getChecklist() {
      if (!checklist)
        return []
      return this.$store.getters.checkMissingIdsAndSortArr(this.model[checklist.order], this.model[checklist.vModel])
    },
    isEditingNotes() {
      return this.model.notes.length > 0
    },
    activeChecklistId() {
      return this.keyboardActions[this.cursorPos]
    },
    lastKeyboardActionIndex() {
      return Object.keys(this.keyboardActions).length - 1
    },
    isCursorInChecklist() {
      if (!checklist)
        return false
      return this.model[checklist.vModel].some(el => el.id === this.activeChecklistId)
    },
    
    ...(instance.computed || {}),
  },
  watch: {
    value() {
      if (value) {
        value(this.value, this)
      }
    },
    cursorPos(newPos, oldPos) {
      if (this.cursorPos < (textFields.length + 1) && this.isElementFunction)
        this.keyboardActions[this.cursorPos]()
    },
    
    ...(instance.watch || {}),
  },
})