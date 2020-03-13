// 真正的 Vue 构造函数在此处

import { initMixin } from './init'
import { stateMixin } from './state'
import { renderMixin } from './render'
import { eventsMixin } from './events'
import { lifecycleMixin } from './lifecycle'
import { warn } from '../util/index'

function Vue (options) { // 真正的 Vue 函数
  if (process.env.NODE_ENV !== 'production' &&
    !(this instanceof Vue)
  ) {
    warn('Vue is a constructor and should be called with the `new` keyword')
  }
  this._init(options) // _init() 是原型上的方法
}

// 往 Vue 原型上挂东西 -> 拆开到各模块中写，避免这个文件里代码太多。这也是不用 class 去定义 Vue 类的原因，会写很多原型。
initMixin(Vue)
stateMixin(Vue)
eventsMixin(Vue)
lifecycleMixin(Vue) // 混合生命周期
renderMixin(Vue)

export default Vue
