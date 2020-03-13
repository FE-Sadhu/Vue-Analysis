/* eslint-disable no-new */
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
// 测试一：template 编译后生成的 render 函数，其生成的 vnode 转换成真实 DOM 后会替代 el 下的 html。 el 仅仅只是标志一个挂载点。
// new Vue({
//   el: '#app',
//   template: '<div id="#app1">{{test}}</div>',
//   data: {
//     msg: 'sadhu',
//     test: 'test'
//   }
// })

// 测试二: 测试报错
// new Vue({
//   el: '#app',
//   template: '<div id="#app1">{{test1}}</div>',
//   data: {
//     msg: 'sadhu',
//     test: 'test',
//     $test1: 'xxx'
//   }
// })
const obj = {
  el: '#app',
  // props: {
  //   msg1: {
  //     type: String,
  //     default: 'xxx'
  //   }
  // },
  template: '<h1>{{msg1}}</h1>',
  data: {
    msg: 'sadhu',
    test: 'test',
    $test1: 'xxx'
  }
  // render: function (createElement) {
  //   return createElement('h1', {
  //     attrs: {
  //       id: 'app22'
  //     }
  //   }, this.msg1)
  // }
}
// @ts-ignore
// obj.render._withStripped = true // _withStripped 存疑。

// @ts-ignore
new Vue(obj)

// 结论： compiler 构建版本执行 render(vm._renderProxy, $createElement) 的 _c 方法时，会走检查
// hasProperty 的逻辑，从而触发 vm._renderProxy 的 has() 方法拦截 render() 函数中的 this 调用的值是否有问题而是否发出警告。
// 但是 runtime-only 构建版本执行 render(vm._renderProxy, $createELement) 的 $createELement 方法时，不会走
// 检查 hasProperty 的逻辑，所以不会触发 vm._renderProxy 的 has() 方法进行拦截 render 函数中的 this 调用。
// PS: 可以手动给 runtime-only 版本设置 obj.render._withStripped = true 如上，让这个构建版本的 vm._renderProxy
// 拦截 getter ,这样就可以检测手写 render 中的 this 调用的值有没有问题了。
