import Vue from 'vue';
import App from './App.vue';
import router from './router';
import store from './store';
import './registerServiceWorker';

import Heading from './components/globalComponents/Heading.vue';
import Alert from './components/globalComponents/Alert.vue';
import Icon from './components/globalComponents/Icon.vue';
import Link from './components/globalComponents/Link.vue';
import Button from './components/globalComponents/Button.vue';

Vue.component('heading', Heading);
Vue.component('alert', Alert);
Vue.component('icon', Icon);
Vue.component('route', Link);
Vue.component('btn', Button);

Vue.config.productionTip = false;

new Vue({
  router,
  store,
  render: (h) => h(App),
}).$mount('#app');
