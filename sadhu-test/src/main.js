import Vue from 'vue'
// import App from './App.vue'
// import router from './router'
// import store from './store'

Vue.config.productionTip = false

// new Vue({
//   router,
//   store,
//   render: h => h(App)
// }).$mount('#app')
/* eslint-disable no-new */
new Vue({
  el: '#app',
  template: '<div id="#app1">{{test}}</div>', // template 编译后生成的 render 函数，其生成的 vnode 转换成真实 DOM 后会替代 el 下的 html
  data: {
    msg: 'sadhu',
    test: 'test'
  }
})
