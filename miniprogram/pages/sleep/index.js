const daily = require('../../utils/daily')
const points = require('../../utils/points')
const cloud = require('../../utils/cloud')
const dateUtil = require('../../utils/date')
const config = require('../../config')

Page({
  data: {
    dateKey: '',
    isHistory: false,
    dateLabel: '',
    bed: '',
    wake: '',
    durationText: '--',
    durationMin: 0,
    quality: '',
    crossDay: false,
    done: false,
    qualified: false,
    passText: '7时',
    shortText: '',
    moonText: '还没填入睡和起床时间',
    pop: false
  },

  onLoad: function (q) {
    const today = dateUtil.dayKey()
    const dateKey = (q && q.date) || today
    this.setData({
      dateKey: dateKey,
      isHistory: dateKey !== today,
      dateLabel: dateUtil.fmtDayLabel(dateKey)
    })
    this.load()
  },

  onReady: function () {
    this.drawMoon()
  },

  load: function () {
    const d = daily.getDay(this.data.dateKey)
    const s = d.sleep
    const min = s.durationMin || 0
    const pass = config.SLEEP_PASS_MIN
    const k = Math.min(1, Math.max(0, min / pass))
    const hasTime = !!(s.bed && s.wake)
    // 只要时长够 7 小时就算完成，睡眠质量不参与判定
    const qualified = hasTime && min >= pass
    this.setData({
      bed: s.bed || '',
      wake: s.wake || '',
      durationMin: min,
      durationText: dateUtil.fmtDuration(min),
      quality: s.quality || '',
      crossDay: !!(s.bed && s.wake && dateUtil.toMin(s.wake) <= dateUtil.toMin(s.bed)),
      done: qualified,
      qualified: qualified,
      passText: dateUtil.fmtDuration(pass),
      shortText: (hasTime && !qualified) ? dateUtil.fmtDuration(pass - min) : '',
      moonText: min
        ? ('睡了 ' + dateUtil.fmtDuration(min) + ' · 月相 ' + Math.round(k * 100) + '%' +
           (qualified ? ' · 达标' : ''))
        : '还没填入睡和起床时间'
    })
    const self = this
    setTimeout(function () { self.drawMoon() }, 30)
  },

  /**
   * 月相：7 小时为月圆（也就是得分线），其余按比例等分（3.5 小时正好半月）。
   * 逐格判断并整块填充，保像素硬边；不使用渐变或抗锯齿。
   */
  drawMoon: function () {
    const self = this
    wx.createSelectorQuery().in(this).select('#moonCv')
      .fields({ node: true, size: true }).exec(function (res) {
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

        node.width = Math.round(w * dpr)
        node.height = Math.round(h * dpr)
        const g = node.getContext('2d')
        g.scale(dpr, dpr)
        g.clearRect(0, 0, w, h)

        const k = Math.min(1, Math.max(0, (self.data.durationMin || 0) / config.SLEEP_PASS_MIN))
        const N = 18
        const cell = Math.min(w, h) / N
        const cx = N / 2
        const cy = N / 2
        const R = N / 2 - 0.3
        const LIT = '#FFC845'
        const DIM = '#A08A63'
        const EDGE = '#4A2E18'
        const CRATER = '#E59C22'
        const sgn = k < 0.5 ? (1 - 2 * k) : -(2 * k - 1)
        const isLit = function (nx, ny) {
          const t = Math.sqrt(Math.max(0, 1 - ny * ny))
          return nx > sgn * t
        }

        for (let y = 0; y < N; y++) {
          for (let x = 0; x < N; x++) {
            const nx = (x + 0.5 - cx) / R
            const ny = (y + 0.5 - cy) / R
            const dd = nx * nx + ny * ny
            if (dd > 1) continue
            g.fillStyle = dd > 0.84 ? EDGE : (isLit(nx, ny) ? LIT : DIM)
            g.fillRect(Math.round(x * cell), Math.round(y * cell), Math.ceil(cell), Math.ceil(cell))
          }
        }

        if (k > 0.30) {
          g.fillStyle = CRATER
          ;[[11, 10], [14, 12], [12, 14], [10, 12]].forEach(function (q) {
            const nx = (q[0] + 0.5 - cx) / R
            const ny = (q[1] + 0.5 - cy) / R
            if (nx * nx + ny * ny < 0.62 && isLit(nx, ny)) {
              g.fillRect(Math.round(q[0] * cell), Math.round(q[1] * cell), Math.ceil(cell), Math.ceil(cell))
            }
          })
        }
      })
  },

  onBed: function (e) {
    daily.setSleep(this.data.dateKey, { bed: e.detail.value })
    this.load()
    this.award()
  },

  onWake: function (e) {
    daily.setSleep(this.data.dateKey, { wake: e.detail.value })
    this.load()
    this.award()
  },

  onQuality: function (e) {
    const k = e.currentTarget.dataset.k
    daily.setSleep(this.data.dateKey, { quality: k })
    this.load()
    this.award()
  },

  award: function () {
    if (this.data.isHistory) return
    const r = points.reconcile(this.data.dateKey, dateUtil.dayKey())
    if (r.lost.indexOf('sleep') >= 0) {
      this.setData({ pop: false })
      wx.showToast({ title: '不足 7 小时，已撤回 10 分', icon: 'none' })
      cloud.pushPendingScores()
      return
    }
    if (r.got.indexOf('sleep') >= 0) {
      this.setData({ pop: true })
      const self = this
      setTimeout(function () { self.setData({ pop: false }) }, 900)
      if (wx.vibrateShort) wx.vibrateShort({ type: 'light' })
      cloud.pushPendingScores()
    }
  },

  /** 保存并前往下一个理论 */
  onNext: function () {
    this.award()
    const q = this.data.isHistory ? ('?date=' + this.data.dateKey) : ''
    wx.redirectTo({ url: '/pages/muscle/index' + q })
  }
})
