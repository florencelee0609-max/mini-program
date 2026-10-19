/**
 * 模拟微信小程序运行时：按 WXML 里真实的事件绑定逐个派发点击，检查处理函数是否抛错。
 * 用法：node tools/runtime-check.js
 */
const fs = require('fs')
const path = require('path')

const MP = path.join(__dirname, '..', 'miniprogram')

// ---------------------------------------------------------------- wx 模拟
const store = {}
const nav = []
const toasts = []
function clone(o) { return o === undefined ? undefined : JSON.parse(JSON.stringify(o)) }

global.wx = {
  getStorageSync: (k) => (k in store ? clone(store[k]) : ''),
  setStorageSync: (k, v) => { store[k] = clone(v) },
  removeStorageSync: (k) => { delete store[k] },
  getStorageInfoSync: () => ({ keys: Object.keys(store), currentSize: 1, limitSize: 10240 }),
  clearStorageSync: () => { Object.keys(store).forEach((k) => delete store[k]) },
  navigateTo: (o) => nav.push(['navigateTo', o.url]),
  redirectTo: (o) => nav.push(['redirectTo', o.url]),
  switchTab: (o) => nav.push(['switchTab', o.url]),
  navigateBack: () => nav.push(['navigateBack']),
  reLaunch: (o) => nav.push(['reLaunch', o.url]),
  showToast: (o) => toasts.push(o.title),
  hideToast: () => {}, showLoading: () => {}, hideLoading: () => {}, showActionSheet: () => {},
  showModal: (o) => { if (o && o.success) o.success({ confirm: true, cancel: false }) },
  stopPullDownRefresh: () => {}, setNavigationBarTitle: () => {},
  setClipboardData: (o) => { if (o && o.success) o.success() },
  getClipboardData: (o) => { if (o && o.success) o.success({ data: '' }) },
  getWindowInfo: () => ({ statusBarHeight: 20, windowWidth: 375, windowHeight: 667 }),
  getSystemInfoSync: () => ({ statusBarHeight: 20, windowWidth: 375, windowHeight: 667, platform: 'devtools', safeArea: { bottom: 667 } }),
  createSelectorQuery: () => {
    const q = { select: () => q, selectAll: () => q, in: () => q, fields: () => q, boundingClientRect: () => q, node: () => q, exec: (cb) => cb && cb([null]) }
    return q
  },
  createCanvasContext: () => new Proxy({}, { get: () => () => {} }),
  canvasToTempFilePath: (o) => { if (o && o.success) o.success({ tempFilePath: '/tmp/a.png' }) },
  cloud: null, onShareAppMessage: () => {}
}

// ---------------------------------------------------------------- App / Page / Component
let appInstance = null
global.App = function (cfg) { appInstance = Object.assign({}, cfg); appInstance.globalData = cfg.globalData || {} }
global.getApp = () => appInstance
let pendingPage = null
global.Page = (cfg) => { pendingPage = cfg }
global.Component = () => {}
global.getCurrentPages = () => [{ route: 'pages/home/index' }]

require(path.join(MP, 'app.js'))
if (appInstance.onLaunch) appInstance.onLaunch({ query: {} })

// 预置一个完整档案，避免所有页面都走「未填档案」分支
const profile = require(path.join(MP, 'utils/profile.js'))
profile.saveProfile({ sex: 'female', age: 30, heightCm: 165, weightKg: 55, activity: 'moderate', bodyGoal: 'thinMuscle', weightTargetKg: 52 })

function instantiate(cfg) {
  const inst = {}
  Object.keys(cfg).forEach((k) => { inst[k] = cfg[k] })
  inst.data = clone(cfg.data) || {}
  inst.setData = function (patch, cb) {
    if (patch && typeof patch === 'object') Object.keys(patch).forEach((k) => { inst.data[k] = patch[k] })
    if (cb) cb()
  }
  inst.getTabBar = () => ({ setData: () => {} })
  return inst
}

function loadPage(rel) {
  pendingPage = null
  const abs = path.join(MP, rel)
  delete require.cache[require.resolve(abs)]
  require(abs)
  if (!pendingPage) throw new Error(rel + ' 未注册页面')
  return instantiate(pendingPage)
}

// ---------------------------------------------------------------- 解析 WXML 里的绑定
function camel(s) { return s.replace(/-([a-z])/g, (_, c) => c.toUpperCase()) }

function parseBindings(rel) {
  const src = fs.readFileSync(path.join(MP, rel), 'utf8')
  const out = []
  // 逐个标签扫描，取标签内的 bind*/catch* 与 data-*
  const tagRe = /<[a-zA-Z][\s\S]*?>/g
  let m
  while ((m = tagRe.exec(src))) {
    const tag = m[0]
    const bev = /\b(?:bind|catch)(?::)?([a-zA-Z]+)\s*=\s*"([^"{}]+)"/g
    const datas = {}
    let d
    const dRe = /\bdata-([a-z0-9-]+)\s*=\s*"([^"{}]*)"/g
    while ((d = dRe.exec(tag))) datas[camel(d[1])] = d[2]
    let b
    while ((b = bev.exec(tag))) {
      out.push({ event: b[1], handler: b[2].trim(), dataset: datas })
    }
  }
  return out
}

// ---------------------------------------------------------------- 逐页跑
const PAGES = [
  'pages/splash/index', 'pages/onboard/profile', 'pages/onboard/shape', 'pages/onboard/result',
  'pages/home/index', 'pages/water/index', 'pages/anti/index', 'pages/sleep/index',
  'pages/muscle/index', 'pages/trend/index', 'pages/rank/index', 'pages/me/index',
  'pages/me-goal/index', 'pages/me-data/index'
]

const problems = []
let tapped = 0

PAGES.forEach((rel) => {
  let inst
  try {
    inst = loadPage(rel + '.js')
  } catch (e) {
    problems.push({ page: rel, handler: '(模块加载)', reason: e.message })
    return
  }
  // 生命周期
  ;['onLoad', 'onShow'].forEach((fn) => {
    if (typeof inst[fn] !== 'function') return
    try { inst[fn]({ query: {}, mode: '' }) } catch (e) {
      problems.push({ page: rel, handler: fn, reason: e.message, stack: (e.stack || '').split('\n')[1] })
    }
  })

  // 用 WXML 的绑定派发点击
  const binds = parseBindings(rel + '.wxml')
  const seen = new Set()
  binds.forEach((b) => {
    if (typeof inst[b.handler] !== 'function') {
      problems.push({ page: rel, handler: b.handler, reason: 'WXML 绑定了但 JS 里没有这个方法' })
      return
    }
    const key = b.handler + JSON.stringify(b.dataset)
    if (seen.has(key)) return
    seen.add(key)
    tapped++
    const ev = {
      currentTarget: { dataset: b.dataset },
      target: { dataset: b.dataset },
      detail: { value: '3' }
    }
    try {
      inst[b.handler](ev)
    } catch (e) {
      problems.push({ page: rel, handler: b.handler, reason: e.message, stack: (e.stack || '').split('\n')[1] })
    }
  })
})

console.log('模拟点击次数:', tapped)
console.log('发现异常:', problems.length)
problems.forEach((p) => {
  console.log('\n[FAIL]', p.page, '->', p.handler)
  console.log('       原因:', p.reason)
  if (p.stack) console.log('       位置:', p.stack.trim())
})
console.log('\n导航记录:', JSON.stringify(nav))
console.log('Toast 记录:', JSON.stringify(toasts))
process.exit(problems.length ? 1 : 0)
