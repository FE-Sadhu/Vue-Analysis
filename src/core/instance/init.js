/* @flow */

import config from '../config'
import { initProxy } from './proxy'
import { initState } from './state'
import { initRender } from './render'
import { initEvents } from './events'
import { mark, measure } from '../util/perf'
import { initLifecycle, callHook } from './lifecycle'
import { initProvide, initInjections } from './inject'
import { extend, mergeOptions, formatComponentName } from '../util/index'

let uid = 0

export function initMixin (Vue: Class<Component>) { // 初始化生命周期、事件、各种 State 后就 $mount 挂载
  Vue.prototype._init = function (options?: Object) {
    const vm: Component = this // this 指向实例的，把 this 赋给 vm， vm 就代表 Vue 实例。
    // a uid
    vm._uid = uid++

    let startTag, endTag
    /* istanbul ignore if */
    if (process.env.NODE_ENV !== 'production' && config.performance && mark) {
      startTag = `vue-perf-start:${vm._uid}`
      endTag = `vue-perf-end:${vm._uid}`
      mark(startTag)
    }

    // a flag to avoid this being observed
    vm._isVue = true
    // merge options
    if (options && options._isComponent) { // 组件的话
      // optimize internal component instantiation
      // since dynamic options merging is pretty slow, and none of the
      // internal component options needs special treatment.
      // 把组件 vnode 对应的构造函数 Ctor 的静态属性 options 上的所有属性、组件的 vnode 、activeInstance、vnode.componentOptions 上的属性 merge 到 vm.$options 上。
      initInternalComponent(vm, options) 
    } else {
      vm.$options = mergeOptions( // merge 传入的 options，挂载在 vm.$options 上
        resolveConstructorOptions(vm.constructor), // 把前面初始化的全局 API 也就是 Vue 静态属性的 options 与当前 options, vm 作合并，合并后赋给 vm.$options
        options || {},
        vm
      )
    }
    /* istanbul ignore else */
    // 这里设置 vm._renderProxy 仅作为后面调用 render 函数的上下文。 render.call(vm._renderProxy, $createElement)
    if (process.env.NODE_ENV !== 'production') { 
      initProxy(vm) // 开发环境下，看浏览器支持 Proxy API 不，支持的话 vm._renderProxy = Proxy 对象 否则 vm._renderProxy = vm .
    } else { // 生产环境下
      vm._renderProxy = vm
    }
    // expose real self
    vm._self = vm
    initLifecycle(vm) // 初始化生命周期
    initEvents(vm) // 初始化事件
    initRender(vm)
    callHook(vm, 'beforeCreate') 
    initInjections(vm) // resolve injections before data/props
    initState(vm) // 处理 options 的 props, methods, data, computed, watch
    initProvide(vm) // resolve provide after data/props
    callHook(vm, 'created')

    /* istanbul ignore if */
    if (process.env.NODE_ENV !== 'production' && config.performance && mark) {
      vm._name = formatComponentName(vm, false)
      mark(endTag)
      measure(`vue ${vm._name} init`, startTag, endTag)
    }

    // 组件初始化时是不会传 el 的。
    if (vm.$options.el) {
      // mount 方法定义在 platform 下的对应入口平台处。
      vm.$mount(vm.$options.el) // 挂载
    }
  }
}

export function initInternalComponent (vm: Component, options: InternalComponentOptions) {
  // 这个 vm 是组件 vnode 的构造函数 Ctor 的实例。
  const opts = vm.$options = Object.create(vm.constructor.options) // Ctor.options (包含组件对象的属性，Vue 的全局 api)
  // doing this because it's faster than dynamic enumeration.
  const parentVnode = options._parentVnode // 组件 vnode
  opts.parent = options.parent // activeInstance
  opts._parentVnode = parentVnode

  const vnodeComponentOptions = parentVnode.componentOptions
  opts.propsData = vnodeComponentOptions.propsData
  opts._parentListeners = vnodeComponentOptions.listeners
  opts._renderChildren = vnodeComponentOptions.children
  opts._componentTag = vnodeComponentOptions.tag

  if (options.render) {
    opts.render = options.render
    opts.staticRenderFns = options.staticRenderFns
  }
}

export function resolveConstructorOptions (Ctor: Class<Component>) {
  let options = Ctor.options
  if (Ctor.super) {
    const superOptions = resolveConstructorOptions(Ctor.super)
    const cachedSuperOptions = Ctor.superOptions
    if (superOptions !== cachedSuperOptions) {
      // super option changed,
      // need to resolve new options.
      Ctor.superOptions = superOptions
      // check if there are any late-modified/attached options (#4976)
      const modifiedOptions = resolveModifiedOptions(Ctor)
      // update base extend options
      if (modifiedOptions) {
        extend(Ctor.extendOptions, modifiedOptions)
      }
      options = Ctor.options = mergeOptions(superOptions, Ctor.extendOptions)
      if (options.name) {
        options.components[options.name] = Ctor
      }
    }
  }
  return options
}

function resolveModifiedOptions (Ctor: Class<Component>): ?Object {
  let modified
  const latest = Ctor.options
  const sealed = Ctor.sealedOptions
  for (const key in latest) {
    if (latest[key] !== sealed[key]) {
      if (!modified) modified = {}
      modified[key] = latest[key]
    }
  }
  return modified
}
