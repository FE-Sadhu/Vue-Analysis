/* not type checking this file because flow doesn't play well with Proxy */

import config from 'core/config'
import { warn, makeMap, isNative } from '../util/index'

let initProxy

if (process.env.NODE_ENV !== 'production') {
  const allowedGlobals = makeMap(
    'Infinity,undefined,NaN,isFinite,isNaN,' +
    'parseFloat,parseInt,decodeURI,decodeURIComponent,encodeURI,encodeURIComponent,' +
    'Math,Number,Date,Array,Object,Boolean,String,RegExp,Map,Set,JSON,Intl,' +
    'require' // for Webpack/Browserify
  )

  const warnNonPresent = (target, key) => {
    warn(
      `Property or method "${key}" is not defined on the instance but ` +
      'referenced during render. Make sure that this property is reactive, ' +
      'either in the data option, or for class-based components, by ' +
      'initializing the property. ' +
      'See: https://vuejs.org/v2/guide/reactivity.html#Declaring-Reactive-Properties.',
      target
    )
  }

  const warnReservedPrefix = (target, key) => {
    warn(
      `Property "${key}" must be accessed with "$data.${key}" because ` +
      'properties starting with "$" or "_" are not proxied in the Vue instance to ' +
      'prevent conflicts with Vue internals. ' +
      'See: https://vuejs.org/v2/api/#data',
      target
    )
  }

  const hasProxy =
    typeof Proxy !== 'undefined' && isNative(Proxy)

  if (hasProxy) { // 浏览器支持 Proxy API 的话
    const isBuiltInModifier = makeMap('stop,prevent,self,ctrl,shift,alt,meta,exact')
    config.keyCodes = new Proxy(config.keyCodes, {
      set (target, key, value) {
        if (isBuiltInModifier(key)) {
          warn(`Avoid overwriting built-in modifier in config.keyCodes: .${key}`)
          return false
        } else {
          target[key] = value
          return true
        }
      }
    })
  }

  const hasHandler = {
    // 拦截 hasProperty，最常见行为就是 in 操作符。
    has (target, key) {
      const has = key in target
      const isAllowed = allowedGlobals(key) ||
        (typeof key === 'string' && key.charAt(0) === '_' && !(key in target.$data))
      if (!has && !isAllowed) {
        if (key in target.$data) warnReservedPrefix(target, key)
        else warnNonPresent(target, key)
      }
      return has || !isAllowed
    }
  }

  const getHandler = {
    // 拦截读
    get (target, key) {
      if (typeof key === 'string' && !(key in target)) { // in 操作符可以读 getter !!!!!!!!!!!!!!!!!!!! 
        if (key in target.$data) warnReservedPrefix(target, key) // 报警告⚠️：key 多半是 _ || $ 开头的，没被 vue 实例代理。(也就是没被加上 getter setter)
        else warnNonPresent(target, key) // 报警告⚠️：key 压根没在 data 中定义。
      }
      return target[key]
    }
  }

  initProxy = function initProxy (vm) {
    if (hasProxy) { // 支持 Proxy api 不。
      // determine which proxy handler to use
      const options = vm.$options
      const handlers = options.render && options.render._withStripped // options.render._withStripped这个属性只在测试代码中出现过，所以一般情况下这个条件都会为假，也就是使用 hasHandler 作为代理配置
        ? getHandler // 不一定 _withStripped 存疑 -> runtime-only 版本就是 getHandler ，因为需要手写 render 
        : hasHandler // 带编译器的版本就是 hasHandler，因为此时还没编译 template 没有 render 函数
        // runtime-only 极有可能的 handler 也是 hasHandler
      vm._renderProxy = new Proxy(vm, handlers)
    } else {
      vm._renderProxy = vm
    }
  }
}

export { initProxy }
