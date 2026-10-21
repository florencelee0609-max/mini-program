const daily = require('../../utils/daily')
const points = require('../../utils/points')
const dateUtil = require('../../utils/date')
const profile = require('../../utils/profile')
const chart = require('../../utils/chart')
const config = require('../../config')
const goals = require('../../utils/goals')

Page({
  data: {
    range: 30,
    summary: { avgWater: '0', antiDays: 0, muscleCount: 0 },
    hasData: false,
    dayList: [],
    ready: false
  },

  onShow: function () {
    const tb = this.getTabBar && this.getTabBar()
    if (tb) tb.setData({ selected: 1 })
    this.refresh()
  },

  onRange: function (e) {
    this.setData({ range: Number(e.currentTarget.dataset.r) })
    this.refresh()
  },

  refresh: function () {
    const n = this.data.range
    const rows = daily.recentDays(n)
    const scores = points.scoreSeries(n)
    const p = profile.getProfile() || {}
    const t = p.targets || {}

    let waterSum = 0, waterDays = 0, antiDays = 0, muscleCount = 0
    rows.forEach(function (r) {
      if (r.water > 0) { waterSum += r.water; waterDays++ }
      if (r.antiCount >= config.ANTI_PASS_COUNT) antiDays++
      if (r.muscleDone) muscleCount++
    })

    const dayList = dateUtil.lastNDays(7).reverse().map(function (k) {
      const d = daily.getDay(k)
      return {
        date: k,
        label: dateUtil.fmtDayLabel(k).replace('今天 · ', '今天 '),
        water: d.water > 0,
        anti: daily.antiCount(k) >= config.ANTI_PASS_COUNT,
        sleep: !!(d.sleep.bed && d.sleep.wake && (Number(d.sleep.durationMin) || 0) >= config.SLEEP_PASS_MIN),
        muscle: d.muscle.length > 0,
        score: points.dayTotal(k)
      }
    })

    this.setData({
      summary: {
        avgWater: (waterDays ? (waterSum / waterDays) : 0).toFixed(1),
        antiDays: antiDays,
        muscleCount: muscleCount
      },
      hasData: rows.some(function (r) { return r.water > 0 || r.sleepMin > 0 || r.muscleMin > 0 || r.weightKg }),
      dayList: dayList,
      ready: true
    })

    // 画布要等布局完成
    const self = this
    setTimeout(function () { self.paint(rows, scores, t) }, 60)
  },

  paint: function (rows, scores, t) {
    this.drawOne('c1', 'line',
      rows.map(function (r) { return r.weightKg }),
      { color: '#3E2410', unit: '', target: null })

    this.drawOne('c2', 'line',
      rows.map(function (r) { return r.calories }),
      { color: '#D9542B', unit: '', target: t.calories || null, targetColor: '#7C5836' })

    this.drawOne('c3', 'line',
      rows.map(function (r) { return r.water }),
      { color: '#3C97D4', unit: '', target: goals.waterGoal(), targetColor: '#7C5836' })

    this.drawOne('c4', 'line',
      rows.map(function (r) { return r.sleepMin ? Math.round(r.sleepMin / 6) / 10 : null }),
      { color: '#7B5EA7', unit: 'h', target: config.SLEEP_PASS_MIN / 60, targetColor: '#7C5836' })

    this.drawOne('c5', 'bar',
      rows.map(function (r) { return r.muscleMin || 0 }),
      { color: '#4FA83D', max: 90 })

    this.drawOne('c6', 'bar',
      scores.map(function (s) { return s.score }),
      { color: '#FFC845', max: 40 })
  },

  drawOne: function (id, kind, values, opts) {
    const q = wx.createSelectorQuery()
    q.select('#' + id).fields({ node: true, size: true }).exec(function (res) {
      if (!res || !res[0] || !res[0].node) return
      const node = res[0].node
      const w = res[0].width
      const h = res[0].height
      if (!w || !h) return
      let dpr = 2
      try {
        const info = wx.getWindowInfo ? wx.getWindowInfo() : wx.getSystemInfoSync()
        dpr = info.pixelRatio || 2
      } catch (e) { /* 兜底 2 */ }
      const ctx = chart.fit(node, w, h, dpr)
      if (kind === 'line') chart.drawLine(ctx, w, h, values, opts)
      else chart.drawBar(ctx, w, h, values, opts)
    })
  },

  onDay: function (e) {
    const k = e.currentTarget.dataset.k
    wx.navigateTo({ url: '/pages/water/index?date=' + k })
  }
})
