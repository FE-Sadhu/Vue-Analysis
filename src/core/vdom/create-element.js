/* @flow */

import config from '../config'
import VNode, { createEmptyVNode } from './vnode'
import { createComponent } from './create-component'
import { traverse } from '../observer/traverse'

import {
  warn,
  isDef,
  isUndef,
  isTrue,
  isObject,
  isPrimitive,
  resolveAsset
} from '../util/index'

import {
  normalizeChildren,
  simpleNormalizeChildren
} from './helpers/index'

const SIMPLE_NORMALIZE = 1
const ALWAYS_NORMALIZE = 2

// wrapper function for providing a more flexible interface
// without getting yelled at by flow
export function createElement ( // 创建 vnode
  context: Component,
  tag: any, // 标签
  data: any, // 该标签相关的 data 
  children: any, // 子节点
  normalizationType: any,
  alwaysNormalize: boolean
): VNode | Array<VNode> {
  // 因为第三个参数 data 是可以不传的，下面这个判断就是看传入的参数是不是 children 这个参数。
  if (Array.isArray(data) || isPrimitive(data)) { // true represent second param is third param => children 子节点
    // 这里就是对于传入参数不一致的处理。
    // 参数的值挨个往前移。
    normalizationType = children
    children = data // data 的值给 children
    data = undefined // data 为 undefined
  }
  if (isTrue(alwaysNormalize)) { // 如果最后一个参数为 true，代表 render 函数是用户手写的。为 false 就是编译 template 而来的 render
    normalizationType = ALWAYS_NORMALIZE
  }

  // 处理好参数问题后，真正调用 _createElement() 创建 vnode
  return _createElement(context, tag, data, children, normalizationType)
}

export function _createElement (
  context: Component,
  tag?: string | Class<Component> | Function | Object,
  data?: VNodeData,
  children?: any,
  normalizationType?: number
): VNode | Array<VNode> {

  // data 的各个属性不允许是响应式的，每个 render 函数中传进 createElement 的 data 必须是一个 fresh object.
  if (isDef(data) && isDef((data: any).__ob__)) { // 有 .__ob__ 这个属性表示已响应式
    process.env.NODE_ENV !== 'production' && warn(
      `Avoid using observed data object as vnode data: ${JSON.stringify(data)}\n` +
      'Always create fresh vnode data objects in each render!',
      context
    )
    return createEmptyVNode() // 该方法很简单，可以理解为就是创建一个注释 vnode。
  }
  // object syntax in v-bind
  if (isDef(data) && isDef(data.is)) {
    tag = data.is
  }
  if (!tag) {
    // in case of component :is set to falsy value
    return createEmptyVNode()
  }
  // warn against non-primitive key
  if (process.env.NODE_ENV !== 'production' &&
    isDef(data) && isDef(data.key) && !isPrimitive(data.key) // data 的 key 只能是基础类型的值。
  ) {
    if (!__WEEX__ || !('@binding' in data.key)) {
      warn(
        'Avoid using non-primitive value as key, ' +
        'use string/number value instead.',
        context
      )
    }
  }
  // support single function children as default scoped slot // slot 相关暂不讨论
  if (Array.isArray(children) &&
    typeof children[0] === 'function'
  ) {
    data = data || {}
    data.scopedSlots = { default: children[0] }
    children.length = 0
  }
  // 
  if (normalizationType === ALWAYS_NORMALIZE) { // 针对手写的 render 中手写的 data 参数传给 createElement(tag, data, children, normalizationType, true)
    // 把有嵌套的 children 数组(vnode[])拍平，变成一维数组。
    children = normalizeChildren(children) // 对传的 children 子节点进行序列化(正常化) =》 手写的可能传进来的 children 可能是嵌套了很多层子节点，这里就把嵌套的子节点都取出来拍平为一位数组。
  } else if (normalizationType === SIMPLE_NORMALIZE) { // 针对编译而来的 render 函数调用的 createElement(tag, data, children, normalizationType, false);
    // 把嵌套的 children 数组拍平，变成一维数组。
    children = simpleNormalizeChildren(children) // 对 children 简单正常化 => 编译而来的规定传入的 children 最多出现一层嵌套，也就是二维数组，这里拍平为一维数组。
  }
  let vnode, ns
  if (typeof tag === 'string') {
    let Ctor
    ns = (context.$vnode && context.$vnode.ns) || config.getTagNamespace(tag)
    if (config.isReservedTag(tag)) { // html native 标签
      // platform built-in elements
      if (process.env.NODE_ENV !== 'production' && isDef(data) && isDef(data.nativeOn)) {
        warn(
          `The .native modifier for v-on is only valid on components but it was used on <${tag}>.`,
          context
        )
      }
      // 根据 tag, data, children, context 创建一个 vnode。
      vnode = new VNode(
        config.parsePlatformTagName(tag), data, children,
        undefined, undefined, context
      )
    } else if ((!data || !data.pre) && isDef(Ctor = resolveAsset(context.$options, 'components', tag))) {
      // component
      vnode = createComponent(Ctor, data, context, children, tag)
    } else {
      // unknown or unlisted namespaced elements
      // check at runtime because it may get assigned a namespace when its
      // parent normalizes children
      vnode = new VNode(
        tag, data, children,
        undefined, undefined, context
      )
    }
  } else { // tag 还可能传组件，暂不看。
    // direct component options / constructor
    vnode = createComponent(tag, data, context, children)
  }
  if (Array.isArray(vnode)) {
    return vnode
  } else if (isDef(vnode)) {
    if (isDef(ns)) applyNS(vnode, ns)
    if (isDef(data)) registerDeepBindings(data)
    return vnode // 返回 vnode
  } else {
    return createEmptyVNode()
  }
}

function applyNS (vnode, ns, force) {
  vnode.ns = ns
  if (vnode.tag === 'foreignObject') {
    // use default namespace inside foreignObject
    ns = undefined
    force = true
  }
  if (isDef(vnode.children)) {
    for (let i = 0, l = vnode.children.length; i < l; i++) {
      const child = vnode.children[i]
      if (isDef(child.tag) && (
        isUndef(child.ns) || (isTrue(force) && child.tag !== 'svg'))) {
        applyNS(child, ns, force)
      }
    }
  }
}

// ref #5318
// necessary to ensure parent re-render when deep bindings like :style and
// :class are used on slot nodes
function registerDeepBindings (data) {
  if (isObject(data.style)) {
    traverse(data.style)
  }
  if (isObject(data.class)) {
    traverse(data.class)
  }
}
