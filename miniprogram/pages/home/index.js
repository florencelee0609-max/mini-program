const app = getApp()
const profile = require('../../utils/profile')
const daily = require('../../utils/daily')
const points = require('../../utils/points')
const cloud = require('../../utils/cloud')
const dateUtil = require('../../utils/date')
const fmt = require('../../utils/format')
const config = require('../../config')
const goals = require('../../utils/goals')
const storage = require('../../utils/storage')

function clampCells(v) {
  if (v < 0) return 0
  if (v > 10) return 10
  return Math.floor(v + 1e-6)   // 向下取整，不虚报进度
}

Page({
  data: {
    ready: false,
    dateLabel: '',
    dayN: 1,
    score: 0,
    max: 40,
    cards: [],
    weightText: '未记录',
    calText: '未记录',
    hint: '',
    hintColor: '',
    pending: 0,

    sheet: false,
    sheetType: '',
    sheetTitle: '',
    sheetValue: '',
    sheetUnit: '',
    cells10: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9]
  },

  onShow: function () {
    const tb = this.getTabBar && this.getTabBar()
    if (tb) tb.setData({ selected: 0 })
    this.refresh()
    this.maybeAcceptInvite()
  },

  onPullDownRefresh: function () {
    const self = this
    cloud.pushPendingScores().then(function () {
      self.refresh()
      wx.stopPullDownRefresh()
    }).catch(function () { wx.stopPullDownRefresh() })
  },

  refresh: function () {
    if (!profile.hasProfile()) {
      this.setData({ ready: false })
      return
    }
    const today = dateUtil.dayKey()
    const p = profile.getProfile()
    const t = p.targets || {}
    const day = daily.getDay(today)
    const antiN = daily.antiCount(today)
    const weekN = daily.getMuscleWeekCount(today)
    const weekTarget = t.strengthPerWeek || 3
    const score = points.dayTotal(today)

    const waterGoal = goals.waterGoal()
    const sleepMin = day.sleep.durationMin || 0
    // 大睡判定只看时长：≥7 小时（420 分）才达标，质量不参与
    const sleepDone = !!(day.sleep.bed && day.sleep.wake && sleepMin >= config.SLEEP_PASS_MIN)

    const flags = {
      water: points.has(today, 'water'),
      anti: points.has(today, 'anti'),
      sleep: points.has(today, 'sleep'),
      muscle: points.has(today, 'muscle')
    }
    const prev = this.prevFlags
    const fresh = {}
    if (prev) {
      Object.keys(flags).forEach(function (k) {
        if (flags[k] && !prev[k]) fresh[k] = true
      })
    }
    this.prevFlags = flags

    const cards = [
      {
        key: 'water', label: '大水理论', icon: 'water', color: 'water',
        main: fmt.liters(day.water), sub: '升 / ' + waterGoal + ' 升',
        cells: clampCells(day.water / waterGoal * 10),
        on: day.water >= waterGoal,
        status: day.water >= waterGoal ? '达标' : '差 ' + fmt.liters(Math.max(0, waterGoal - day.water)),
        fresh: !!fresh.water
      },
      {
        key: 'anti', label: '抗炎理论', icon: 'fire', color: 'fire',
        main: String(antiN), sub: '类 / ' + config.ANTI_PASS_COUNT + ' 类合格',
        cells: clampCells(antiN / config.ANTI_PASS_COUNT * 10),
        on: antiN >= config.ANTI_PASS_COUNT,
        status: antiN >= config.ANTI_PASS_COUNT ? '合格' : '不合格',
        fresh: !!fresh.anti
      },
      {
        key: 'sleep', label: '大睡理论', icon: 'moon', color: 'night',
        main: dateUtil.fmtDuration(sleepMin),
        sub: sleepMin ? ('昨晚 · 满 ' + dateUtil.fmtDuration(config.SLEEP_PASS_MIN) + ' 计分') : '还没记',
        cells: clampCells(sleepMin / config.SLEEP_PASS_MIN * 10),
        on: sleepDone,
        status: sleepDone
          ? '达标'
          : (day.sleep.bed && day.sleep.wake
            ? ('还差 ' + dateUtil.fmtDuration(config.SLEEP_PASS_MIN - sleepMin))
            : '未记录'),
        fresh: !!fresh.sleep
      },
      {
        key: 'muscle', label: '薄肌理论', icon: 'muscle', color: 'grass',
        main: weekN + '/' + weekTarget, sub: '次 · 本周',
        cells: clampCells(weekN / weekTarget * 10),
        on: day.muscle.length > 0,
        status: day.muscle.length ? '今日已练' : '未练',
        fresh: !!fresh.muscle
      }
    ]

    this.setData({
      ready: true,
      dateLabel: dateUtil.fmtDayLabel(today),
      dayN: dateUtil.dayIndex(storage.getMeta().firstLaunchAt),
      score: score,
      cards: cards,
      weightText: day.weightKg == null ? '未记录' : fmt.weight(day.weightKg) + ' kg',
      calText: day.calories == null ? '未记录' : fmt.kcal(day.calories) + ' 千卡',
      hint: this.buildHint(cards, antiN, score, day),
      pending: points.pendingCount()
    })
  },

  buildHint: function (cards, antiN, score, day) {
    if (points.pendingCount() > 0) return { text: '有 ' + points.pendingCount() + ' 条分数待同步', tone: 'gold' }
    if (score >= 40) return { text: '今天四项全达成，40 分到手', tone: 'grass' }
    const undone = cards.filter(function (c) { return !c.on })
    if (undone.length === 1 && score > 0) return { text: '只差' + undone[0].label.replace('理论', '') + '了', tone: '' }
    if (score === 0) return { text: '从一杯水开始', tone: '' }
    return { text: '', tone: '' }
  },

  onCard: function (e) {
    const k = e.currentTarget.dataset.k
    wx.navigateTo({ url: '/pages/' + k + '/index' })
  },

  onSetup: function () {
    wx.navigateTo({ url: '/pages/onboard/profile' })
  },

  onWeight: function () {
    const day = daily.getDay(dateUtil.dayKey())
    this.setData({
      sheet: true, sheetType: 'weight', sheetTitle: '今天的体重',
      sheetValue: day.weightKg == null ? '' : String(day.weightKg), sheetUnit: 'kg'
    })
  },

  onCal: function () {
    const day = daily.getDay(dateUtil.dayKey())
    this.setData({
      sheet: true, sheetType: 'cal', sheetTitle: '今天吃了多少千卡',
      sheetValue: day.calories == null ? '' : String(day.calories), sheetUnit: '千卡'
    })
  },

  onSheetInput: function (e) {
    this.setData({ sheetValue: e.detail.value })
  },

  closeSheet: function () {
    this.setData({ sheet: false })
  },

  saveSheet: function () {
    const v = this.data.sheetValue
    const today = dateUtil.dayKey()
    const empty = v === '' || v == null
    if (this.data.sheetType === 'weight') {
      const n = Number(v)
      if (!empty && (isNaN(n) || n < 30 || n > 250)) {
        wx.showToast({ title: '体重需在 30–250 kg', icon: 'none' })
        return
      }
      daily.patchDay(today, { weightKg: empty ? null : Math.round(n * 10) / 10 })
    } else {
      const n = Number(v)
      if (!empty && (isNaN(n) || n < 0 || n > 10000)) {
        wx.showToast({ title: '热量需在 0–10000 千卡', icon: 'none' })
        return
      }
      daily.patchDay(today, { calories: empty ? null : Math.round(n) })
    }
    this.setData({ sheet: false })
    this.refresh()
  },

  onData: function () {
    wx.switchTab({ url: '/pages/me/index' })
  },

  maybeAcceptInvite: function () {
    const code = app.globalData.inviteCode
    if (!code) return
    app.globalData.inviteCode = ''
    wx.showModal({
      title: '有搭子邀请你',
      content: '接受后你们可以在榜单上看到彼此的积分。',
      confirmText: '接受',
      cancelText: '先不了',
      success: function (r) {
        if (r.confirm) {
          cloud.acceptInvite(code).then(function (res) {
            wx.showToast({ title: (res && res.ok) ? '已接受' : (res && res.msg) || '邀请已失效', icon: 'none' })
          }).catch(function () {
            wx.showToast({ title: '网络不可用，稍后再试', icon: 'none' })
          })
        }
      }
    })
  },

  // 键盘高度：input 聚焦时把键盘高度传给 px-sheet，让弹层整体抬到键盘上方。
  // 用 e.detail.height（基础库 1.0 起就有），比 wx.onKeyboardHeightChange 稳定 ——
  // 后者在真机上曾返回异常值，把弹层直接顶出屏幕。
  onKbFocus: function (e) {
    const d = (e && e.detail) || {}
    const h = Number(d.height)
    // 真机上如果弹层位置仍不对，看这行日志里的实际数值即可定位
    console.log('[px-sheet] keyboard height =', h)
    this.setData({ kb: isNaN(h) || h < 0 ? 0 : h })
  },

  onKbBlur: function () {
    this.setData({ kb: 0 })
  }
})
