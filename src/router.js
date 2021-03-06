import Vue from "vue"
import Router from "vue-router"

Vue.use(Router)

import LoadingComponent from './components/Illustrations/LoadingComponent.vue'
import ErrorComponent from './components/Illustrations/ErrorComponent.vue'

const AsyncComponent = comp => () => ({
  component: comp,
  loading: LoadingComponent,
  error: ErrorComponent,
  delay: 200,
  timeout: 5000,
})

export default new Router({
  mode: "history",
  base: process.env.BASE_URL,
  routes: [
    {
      path: "/",
      name: "home",
      component: AsyncComponent(import(/* webpackChunkName: "home-chunk" */ './views/Home.vue')),
    },
    {
      path: "/user",
      name: 'user',
      component: AsyncComponent(import(/* webpackChunkName: "user-chunk" */ './views/User.vue')),
    },
    {
      path: "/popup",
      name: 'popup',
      component: AsyncComponent(import(/* webpackChunkName: "user-chunk" */ './views/User.vue')),
    },
    {
      path: "/menu",
      name: 'menu',
      component: AsyncComponent(import(/* webpackChunkName: "user-chunk" */ './views/User.vue')),
    },
    {
      path: "/support",
      name: 'support',
      component: AsyncComponent(import(/* webpackChunkName: "home-chunk" */ './views/Support.vue')),
      children: [
        {
          path: '/article/:article',
          component: AsyncComponent(import(/* webpackChunkName: "home-chunk" */ './components/Support/Article.vue'))
        },
        {
          path: '/tag/:tag',
          component: AsyncComponent(import(/* webpackChunkName: "home-chunk" */ './components/Support/ArticlesView.vue'))
        },
        {
          path: 'overview',
          component: AsyncComponent(import(/* webpackChunkName: "home-chunk" */ './components/Support/Overview.vue'))
        },
      ]
    },
    {
      path: '/action',
      name: 'Action',
      component: AsyncComponent(import(/* webpackChunkName: "action-chunk" */ './views/Action.vue')),
      props: route => ({
        mode: route.query.mode,
        oobCode: route.query.oobCode,
      }),
    },
  ]
})
