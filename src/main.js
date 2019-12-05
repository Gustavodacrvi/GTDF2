import Vue from "vue"
import App from "./App.vue"
import router from "./router"
import store from "./store/"
import "./registerServiceWorker"
import VueWorker from 'vue-worker'
import vueSmoothScroll from 'vue2-smooth-scroll'

Vue.use(vueSmoothScroll)
Vue.use(VueWorker, '$worker')

Vue.config.productionTip = false

import { longClickDirective } from 'vue-long-click'
 
const longClickInstance = longClickDirective({delay: 400, interval: 5000})
Vue.directive('longclick', longClickInstance)

new Vue({
  router,
  store,
  render: h => h(App)
}).$mount("#app")

setTimeout(() => {
  if (store.getters.isStandAlone)
    router.replace('/user')
})
