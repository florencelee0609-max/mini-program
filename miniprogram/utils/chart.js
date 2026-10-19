/**
 * Canvas 2D 手写图表：直角折线、方形数据点、虚线目标线、空柱只描边。
 * 不用 echarts：像素风要关掉的东西太多，手写反而更短更可控。
 */

const INK = '#3E2410'
const INK2 = '#7C5836'
const RING = '#E8C68C'
const CREAM = '#FFF9E8'
const GOLD = '#FFC845'

function fit(canvas, w, h, dpr) {
  canvas.width = w * dpr
  canvas.height = h * dpr
  const ctx = canvas.getContext('2d')
  ctx.setTransform(1, 0, 0, 1, 0, 0)
  ctx.scale(dpr, dpr)
  ctx.clearRect(0, 0, w, h)
  return ctx
}

function bounds(values, target) {
  const nums = values.filter(function (v) { return v != null && !isNaN(v) })
  if (target != null) nums.push(target)
  if (!nums.length) return { min: 0, max: 1 }
  let min = Math.min.apply(null, nums)
  let max = Math.max.apply(null, nums)
  if (max === min) { max = min + 1 }
  const pad = (max - min) * 0.12
  return { min: min - pad, max: max + pad }
}

/** 折线图 */
function drawLine(ctx, w, h, values, opts) {
  const o = opts || {}
  const padL = 30, padR = 10, padT = 10, padB = 16
  const iw = w - padL - padR
  const ih = h - padT - padB
  const n = values.length
  const b = bounds(values, o.target)

  function x(i) { return padL + (n <= 1 ? iw / 2 : iw * i / (n - 1)) }
  function y(v) { return padT + ih - (v - b.min) / (b.max - b.min) * ih }

  // 底纹
  ctx.strokeStyle = RING
  ctx.lineWidth = 2
  ctx.beginPath()
  for (let k = 0; k <= 2; k++) {
    const yy = Math.round(padT + ih * k / 2) + 0.5
    ctx.moveTo(padL, yy)
    ctx.lineTo(w - padR, yy)
  }
  ctx.stroke()

  // 目标线
  if (o.target != null) {
    ctx.strokeStyle = o.targetColor || INK2
    ctx.lineWidth = 2
    ctx.setLineDash([4, 4])
    ctx.beginPath()
    const ty = Math.round(y(o.target)) + 0.5
    ctx.moveTo(padL, ty)
    ctx.lineTo(w - padR, ty)
    ctx.stroke()
    ctx.setLineDash([])
  }

  // 折线（null 断开）
  ctx.strokeStyle = o.color || INK
  ctx.lineWidth = 2
  ctx.beginPath()
  let started = false
  for (let i = 0; i < n; i++) {
    const v = values[i]
    if (v == null || isNaN(v)) { started = false; continue }
    if (!started) { ctx.moveTo(x(i), y(v)); started = true }
    else ctx.lineTo(x(i), y(v))
  }
  ctx.stroke()

  // 方形数据点
  ctx.fillStyle = o.color || INK
  for (let i = 0; i < n; i++) {
    const v = values[i]
    if (v == null || isNaN(v)) continue
    ctx.fillRect(Math.round(x(i)) - 3, Math.round(y(v)) - 3, 6, 6)
  }

  // 轴标签
  ctx.fillStyle = INK2
  ctx.font = '9px sans-serif'
  ctx.textBaseline = 'middle'
  if (o.unit) {
    ctx.fillText(String(Math.round(b.max)) + o.unit, 2, padT + 2)
    ctx.fillText(String(Math.round(b.min)) + o.unit, 2, h - padB - 2)
  }
}

/** 柱状图：值为 0 或 null 时只描边不填充，避免看起来像断线 */
function drawBar(ctx, w, h, values, opts) {
  const o = opts || {}
  const padL = 10, padR = 10, padT = 8, padB = 14
  const iw = w - padL - padR
  const ih = h - padT - padB
  const n = values.length
  const max = o.max || Math.max.apply(null, values.map(function (v) { return v || 0 }).concat([1]))
  const slot = iw / n
  const bw = Math.max(4, Math.min(14, slot - 3))

  ctx.strokeStyle = RING
  ctx.lineWidth = 2
  ctx.beginPath()
  ctx.moveTo(padL, Math.round(padT + ih) + 0.5)
  ctx.lineTo(w - padR, Math.round(padT + ih) + 0.5)
  ctx.stroke()

  for (let i = 0; i < n; i++) {
    const v = values[i]
    const cx = padL + slot * i + slot / 2
    const bh = v ? Math.max(2, ih * Math.min(1, v / max)) : 0
    const bx = Math.round(cx - bw / 2)
    const by = Math.round(padT + ih - bh)
    if (v) {
      ctx.fillStyle = o.color || GOLD
      ctx.fillRect(bx, by, bw, Math.round(bh))
      ctx.strokeStyle = INK
      ctx.lineWidth = 1
      ctx.strokeRect(bx + 0.5, by + 0.5, bw - 1, Math.round(bh) - 1)
    } else {
      // 空柱：只画 1px 描边的矮框
      ctx.strokeStyle = RING
      ctx.lineWidth = 1
      ctx.strokeRect(bx + 0.5, Math.round(padT + ih) - 4.5, bw - 1, 4)
    }
  }
}

module.exports = { fit, drawLine, drawBar, COLORS: { INK, INK2, GOLD, CREAM } }
