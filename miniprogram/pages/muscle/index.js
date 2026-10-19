const daily = require('../../utils/daily')
const points = require('../../utils/points')
const cloud = require('../../utils/cloud')
const dateUtil = require('../../utils/date')
const profile = require('../../utils/profile')
const constants = require('../../utils/constants')

Page({
  data: {
    dateKey: '',
    isHistory: false,
    dateLabel: '',
    tabs: constants.MUSCLE_TABS,
    tab: 'push',
    lib: [],
    records: [],
    weekN: 0,
    weekTarget: 3,
    weekCells: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9],
    targetWeightText: '--',
    done: false,
    pop: false,

    // 记录弹层
    sheet: false,
    sheetMode: 'record',        // record | custom | freq
    sheetTitle: '',
    fName: '',
    fMinutes: '30',
    fIntensity: 'mid',
    fNote: '',
    fSets: '3',
    fReps: '12',
    planText: '',
    fFreq: '',
    intensities: constants.INTENSITY
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

  load: function () {
    const p = profile.getProfile() || {}
    const t = p.targets || {}
    const tab = this.data.tab
    let lib = []
    if (tab === 'custom') {
      lib = profile.getCustomExercises()
    } else {
      lib = (constants.MUSCLE_LIB[tab] || []).slice()
    }
    const d = daily.getDay(this.data.dateKey)
    this.setData({
      lib: lib,
      records: d.muscle,
      weekN: daily.getMuscleWeekCount(this.data.dateKey),
      weekTarget: t.strengthPerWeek || 3,
      targetWeightText: p.weightTargetKg
        ? p.weightTargetKg.toFixed(1) + ' kg'
        : (p.weightKg ? p.weightKg.toFixed(1) + ' kg 维持' : '--'),
      done: d.muscle.length > 0
    })
  },

  onTab: function (e) {
    this.setData({ tab: e.currentTarget.dataset.k })
    this.load()
  },

  // ---------------------------------------------------------- 记录
  onRecord: function (e) {
    const ds = e.currentTarget.dataset
    const sets = ds.sets || ''
    const reps = ds.reps || ''
    this.setData({
      sheet: true, sheetMode: 'record', sheetTitle: '记录「' + ds.name + '」',
      fName: ds.name, fMinutes: '30', fIntensity: 'mid', fNote: '',
      fSets: sets ? String(sets) : '',
      fReps: reps ? String(reps) : '',
      planText: (sets && reps) ? ('计划 ' + sets + ' 组 × ' + reps + ' 次') : ''
    })
  },

  onCustomAdd: function () {
    this.setData({
      sheet: true, sheetMode: 'custom', sheetTitle: '添加自定义项目',
      fName: '', fSets: '3', fReps: '12'
    })
  },

  onFreq: function () {
    this.setData({
      sheet: true, sheetMode: 'freq', sheetTitle: '每周练几次',
      fFreq: String(this.data.weekTarget)
    })
  },

  onName: function (e) { this.setData({ fName: e.detail.value }) },
  onSets: function (e) { this.setData({ fSets: e.detail.value }) },
  onReps: function (e) { this.setData({ fReps: e.detail.value }) },
  onMinutes: function (e) { this.setData({ fMinutes: e.detail.value }) },
  onNote: function (e) { this.setData({ fNote: e.detail.value }) },
  onFreqInput: function (e) { this.setData({ fFreq: e.detail.value }) },
  onIntensity: function (e) { this.setData({ fIntensity: e.currentTarget.dataset.k }) },

  closeSheet: function () { this.setData({ sheet: false }) },

  onSave: function () {
    const mode = this.data.sheetMode

    if (mode === 'custom') {
      const n = (this.data.fName || '').trim()
      if (!n) { wx.showToast({ title: '写个项目名', icon: 'none' }); return }
      const sets = Number(this.data.fSets)
      const reps = Number(this.data.fReps)
      if (!sets || sets < 1 || sets > 20) { wx.showToast({ title: '组数填 1–20', icon: 'none' }); return }
      if (!reps || reps < 1 || reps > 100) { wx.showToast({ title: '次数填 1–100', icon: 'none' }); return }
      profile.addCustomExercise(n, Math.round(sets), Math.round(reps))
      this.setData({ sheet: false, tab: 'custom' })
      this.load()
      wx.showToast({ title: n + '：' + Math.round(sets) + ' 组 × ' + Math.round(reps) + ' 次', icon: 'none' })
      return
    }

    if (mode === 'freq') {
      const n = Number(this.data.fFreq)
      if (!n || n < 1 || n > 7) { wx.showToast({ title: '填 1–7 次', icon: 'none' }); return }
      profile.overrideTarget('strengthPerWeek', Math.round(n))
      this.setData({ sheet: false })
      this.load()
      return
    }

    const min = Number(this.data.fMinutes)
    if (!min || min < 1 || min > 600) {
      wx.showToast({ title: '时长填 1–600 分钟', icon: 'none' })
      return
    }
    daily.muscleAdd(this.data.dateKey, {
      name: this.data.fName,
      minutes: Math.round(min),
      intensity: this.data.fIntensity,
      note: this.data.fNote,
      sets: this.data.planText ? Number(this.data.fSets) : 0,
      reps: this.data.planText ? Number(this.data.fReps) : 0
    })
    this.setData({ sheet: false })
    this.load()
    this.award()
  },

  onDelete: function (e) {
    const id = e.currentTarget.dataset.id
    const self = this
    wx.showModal({
      title: '删掉这条记录？',
      content: '删了也不会扣分。',
      success: function (r) {
        if (!r.confirm) return
        daily.muscleRemove(self.data.dateKey, id)
        self.load()
      }
    })
  },

  /** 保存并回到今日 */
  onNext: function () {
    this.award()
    wx.switchTab({ url: '/pages/home/index' })
  },

  award: function () {
    if (this.data.isHistory) return
    const got = points.awardAllIfDone(this.data.dateKey, dateUtil.dayKey())
    if (got.indexOf('muscle') >= 0) {
      this.setData({ pop: true })
      const self = this
      setTimeout(function () { self.setData({ pop: false }) }, 900)
      if (wx.vibrateShort) wx.vibrateShort({ type: 'light' })
      cloud.pushPendingScores()
    }
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
