/* @flow */

import VNode, { createTextVNode } from 'core/vdom/vnode'
import { isFalse, isTrue, isDef, isUndef, isPrimitive } from 'shared/util'

// The template compiler attempts to minimize the need for normalization by
// statically analyzing the template at compile time.
//
// For plain HTML markup, normalization can be completely skipped because the
// generated render function is guaranteed to return Array<VNode>. There are
// two cases where extra normalization is needed:

// 1. When the children contains components - because a functional component
// may return an Array instead of a single root. In this case, just a simple
// normalization is needed - if any child is an Array, we flatten the whole
// thing with Array.prototype.concat. It is guaranteed to be only 1-level deep
// because functional components already normalize their own children.

// 针对编译而来的 render 函数调用 _c(tag, data, children, xxx) 这里的 children 子 vnode 节点数组。
// 拍平二维数组
// 返回一维 vnode 数组
export function simpleNormalizeChildren (children: any) {
  for (let i = 0; i < children.length; i++) {
    if (Array.isArray(children[i])) {
      return Array.prototype.concat.apply([], children)
    }
  }
  return children
}

// 2. When the children contains constructs that always generated nested Arrays,
// e.g. <template>, <slot>, v-for, or when the children is provided by user
// with hand-written render functions / JSX. In such cases a full normalization
// is needed to cater to all possible types of children values.

// 针对手写的 render 函数调用 $createElement(tag, data, children, xxx) 这里的 children 子 vnode 节点数组。
// 目的也是返回一维 vnode 数组。因为这里用户手写的子 vnode 节点数组可能嵌套了很多层。
// 采用递归方式，看代码。
export function normalizeChildren (children: any): ?Array<VNode> {
  return isPrimitive(children) // 若 children 是基础类型比如 number/string 
    ? [createTextVNode(children)] // 直接返回 [文本vnode对象]。 
    : Array.isArray(children)
      ? normalizeArrayChildren(children)
      : undefined
}

function isTextNode (node): boolean {
  return isDef(node) && isDef(node.text) && isFalse(node.isComment)
}

function normalizeArrayChildren (children: any, nestedIndex?: string): Array<VNode> {
  // 递归定义： 传入一个嵌套的数组，返回拍平数组后的元素的新数组。
  // 出口： 当输入的数组非多维数组的时候。
  
  const res = []
  let i, c, lastIndex, last
  for (i = 0; i < children.length; i++) {
    c = children[i]
    if (isUndef(c) || typeof c === 'boolean') continue
    lastIndex = res.length - 1
    last = res[lastIndex]
    //  nested
    if (Array.isArray(c)) { // 如果 children 子 vnode 数组里面又遇到了一个嵌套数组，直接递归，然后 res.push.apply(res, 递归结果)。
      if (c.length > 0) {
        c = normalizeArrayChildren(c, `${nestedIndex || ''}_${i}`) // 递归拍平
        // merge adjacent text nodes
        if (isTextNode(c[0]) && isTextNode(last)) {
          res[lastIndex] = createTextVNode(last.text + (c[0]: any).text)
          c.shift()
        }
        res.push.apply(res, c)
      }
    } else if (isPrimitive(c)) {
      if (isTextNode(last)) {
        // merge adjacent text nodes
        // this is necessary for SSR hydration because text nodes are
        // essentially merged when rendered to HTML strings
        res[lastIndex] = createTextVNode(last.text + c)
      } else if (c !== '') {
        // convert primitive to vnode
        res.push(createTextVNode(c))
      }
    } else {
      if (isTextNode(c) && isTextNode(last)) {
        // merge adjacent text nodes
        res[lastIndex] = createTextVNode(last.text + c.text)
      } else {
        // default key for nested array children (likely generated by v-for)
        if (isTrue(children._isVList) &&
          isDef(c.tag) &&
          isUndef(c.key) &&
          isDef(nestedIndex)) {
          c.key = `__vlist${nestedIndex}_${i}__`
        }
        res.push(c)
      }
    }
  }
  return res
}
