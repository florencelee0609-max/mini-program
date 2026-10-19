/** 业务常量表：抗炎 8 类、训练动作库、枚举文案。 */

const ANTI_CATS = [
  { key: 'berry', label: '莓果类', icon: 'berry' },
  { key: 'leafy', label: '绿叶蔬菜', icon: 'leafy' },
  { key: 'fish', label: '深海鱼类', icon: 'fish' },
  { key: 'nuts', label: '坚果种子', icon: 'nuts' },
  { key: 'oil', label: '橄榄油', icon: 'oil' },
  { key: 'spice', label: '天然香料', icon: 'spice' },
  { key: 'protein', label: '优质蛋白', icon: 'protein' },
  { key: 'fruitVc', label: '富含VC水果', icon: 'fruitvc' }
]

const MEALS = [
  { key: 'breakfast', label: '早餐' },
  { key: 'lunch', label: '午餐' },
  { key: 'dinner', label: '晚餐' }
]

const QUALITY = [
  { key: 'good', label: '优', color: 'grass' },
  { key: 'fair', label: '良', color: 'gold' },
  { key: 'poor', label: '差', color: 'fire' }
]

const INTENSITY = [
  { key: 'easy', label: '轻松' },
  { key: 'mid', label: '适中' },
  { key: 'hard', label: '力竭' }
]

const MUSCLE_LIB = {
  push: [
    { name: '俯卧撑', tip: '3 组 × 力竭前一两个' },
    { name: '哑铃卧推', tip: '3 组 × 10 次' },
    { name: '肩上推举', tip: '3 组 × 8 次' },
    { name: '双杠臂屈伸', tip: '3 组 × 力竭' }
  ],
  pull: [
    { name: '引体向上', tip: '4 组 × 力竭（可换高位下拉）' },
    { name: '哑铃划船', tip: '3 组 × 12 次' },
    { name: '面拉', tip: '3 组 × 15 次' },
    { name: '反向飞鸟', tip: '3 组 × 12 次' }
  ],
  squat: [
    { name: '深蹲', tip: '4 组 × 8 次' },
    { name: '保加利亚分腿蹲', tip: '3 组 × 10 次 / 侧' },
    { name: '罗马尼亚硬拉', tip: '3 组 × 10 次' },
    { name: '臀桥', tip: '3 组 × 15 次' }
  ]
}

const MUSCLE_TABS = [
  { key: 'push', label: '推' },
  { key: 'pull', label: '拉' },
  { key: 'squat', label: '蹲' },
  { key: 'custom', label: '自定义' }
]

const MODULES = [
  { key: 'water', label: '大水理论', icon: 'water', color: 'water', doneWord: '达标' },
  { key: 'anti', label: '抗炎理论', icon: 'fire', color: 'fire', doneWord: '合格' },
  { key: 'sleep', label: '大睡理论', icon: 'moon', color: 'night', doneWord: '完成' },
  { key: 'muscle', label: '薄肌理论', icon: 'muscle', color: 'grass', doneWord: '完成' }
]

module.exports = { ANTI_CATS, MEALS, QUALITY, INTENSITY, MUSCLE_LIB, MUSCLE_TABS, MODULES }
