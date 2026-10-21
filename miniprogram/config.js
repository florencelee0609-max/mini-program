/**
 * 全局配置。上线前需要改的两个值：
 * 1. cloudEnvId：微信云开发环境 ID（不开云开发可留空，榜单会走"本地单机"降级）
 * 2. version：显示在「我的 → 关于」
 */
module.exports = {
  version: '1.1.2',
  cloudEnvId: 'cloud1-d3ghwmm9qac18a1e7',   // 云开发环境 ID（开通后从控制台复制）
  appName: '大理论时代',
  slogan: '全民严肃进入大理论时代',
  waterSlogan: '弱者喝饮料，强者喝大水',
  // 业务常量（改了要和 PRD 同步）
  WATER_MIN_L: 1.5,          // 判定线下限（体重建议更低时取这个值）
  WATER_ML_PER_KG: 32.5,     // 建议饮水 = 体重(kg) × 32.5 毫升
  SLEEP_PASS_MIN: 420,       // 睡眠得分线：≥7 小时才给分（正好 420 也算）；同时是月圆基准
  WATER_GOAL_L: 1.5,         // 兼容旧引用，等同 WATER_MIN_L
  ANTI_PASS_COUNT: 3,        // 去重类别 ≥3 合格
  POINTS_PER_MODULE: 10,
  DAILY_MAX_POINTS: 40,
  BUDDY_LIMIT: 20,
  KEEP_DAYS: 400             // 本地保留天数
}
