

import Icon from '@/components/Icon.vue'
import IconDrop from '@/components/IconDrop/IconDrop.vue'

import { mapGetters, mapState, mapActions } from 'vuex'

import utils from "@/utils"

export default {
  props: ['viewName', 'viewType', 'listLength', 'name', 'id', 'defaultShowing', 'item'],
  components: {
    Icon, IconDrop,
  },
  data() {
    return {
      showing: this.defaultShowing,
      headerHover: false,

      startTime: 0,
      fail: 0,
      startX: 0,
      startY: 0,
      initialScroll: 0,
      timeout: null,
    }
  },
  mounted() {
    this.bindOptions()
  },
  methods: {
    ...mapActions(['getOptions']),
    async bindOptions() {
      if (this.isDesktop && this.options) {
        utils.bindOptionsToEventListener(this.$refs.header, await this.getOptions(this.options), this)
      }
    },
    contEnter(el) {

      const s = el.style

      s.transitionDuration = 0
      s.height = 0
      s.opacity = 0

      requestAnimationFrame(() => {
        s.transitionDuration = '.25s'
        s.height = this.getItemContHeight
        s.opacity = 1

        setTimeout(() => {
          s.height = 'auto'
        }, 255)
      })
    },
    async openMobileOptions() {
      window.navigator.vibrate(100)
      this.$store.commit('pushIconDrop', await this.getOptions(this.options))
    },
    touchEnd(e) {
      clearTimeout(this.timeout)
      const time = new Date() - this.startTime
      
      if (!this.fail && (time < 250))
        this.click()
      this.fail = false
      this.allowMobileOptions = false
    },
    touchmove(evt) {
      const touch = evt.changedTouches[0]
      const move = Math.abs(document.scrollingElement.scrollTop - this.initialScroll) > 5 || Math.abs(touch.clientX - this.startX) > 5 || Math.abs(touch.clientY - this.startY) > 5
      if (move) {
        clearTimeout(this.timeout)
        this.fail = true
      }
    },
    touchstart(e) {
      this.initialScroll = document.scrollingElement.scrollTop
      this.startTime = new Date()
      const touch = e.changedTouches[0]
      this.startX = touch.clientX
      this.startY = touch.clientY
      
      this.timeout = setTimeout(() => {
        this.openMobileOptions()
      }, 350)
    },
    contLeave(el) {
      const s = el.style
      
      s.transitionDuration = 0
      s.height = this.getItemContHeight
      s.opacity = 1
      
      requestAnimationFrame(() => {
        s.transitionDuration = '.25s'
        s.height = this.itemHeight + 'px'
        s.opacity = 0
      })
    },
    go() {
      if (this.isDesktop) this.click()
    },
  },
  computed: {
    ...mapState(['isOnControl']),
    ...mapGetters(['isDesktop', 'platform']),
    getItemContHeight() {
      return (this.itemHeight * this.listLength) + 'px'
    },
    itemHeight() {
      return this.isDesktop ? 35 : 42
    },
  },
  watch: {
    options() {
      this.bindOptions()
    },
    item() {
      this.bindOptions()
    }
  },
}