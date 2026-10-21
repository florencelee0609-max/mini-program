# 《大理论时代》开发计划 v1.0

> 依据：`PRD.md` v1.0（唯一开发依据）、`大理论时代-设计稿.md` v2.0、`大理论时代-设计预览.html`
> 目标：把 PRD 的 20 项 P0 拆成**可照单执行**的任务，每个任务有产出文件、依赖、对应验收编号。
> 工时单位：**人日**（1 人全职 × 8 小时）。总计 **23 人日**，建议按 6 个里程碑交付，每个里程碑结束时都是**可运行、可演示**的状态。

---

## 零、总览

### 0.1 里程碑

| 里程碑 | 内容 | 累计工期 | 结束时能演示什么 |
|---|---|---|---|
| **M1 能跑起来** | 脚手架 + 数据层 + 视觉底座 + 12 个像素图标 | D5 | 能翻完 4 个 Tab，卡片/按钮/进度条/图标全是最终样式，数据能存能读（假数据） |
| **M2 能记录** | 引导 + 目标计算 + 大水 + 抗炎 + 大睡 + 薄肌 + 首页 | D12 | **核心闭环跑通**：填档案 → 出目标 → 四项都能记 → 首页显示进度。此时已可自用 |
| **M3 能看** | 趋势 6 张图 + 历史某天 + 补记 | D15 | 30 天曲线能画，能翻历史并补记 |
| **M4 能比** | 云开发 + 积分 + 搭子 + 榜单 | D20 | 两台手机能互相邀请、看到排名 |
| **M5 能备份** | 我的/设置 + 导出恢复 + 空态异常 | D22 | 数据可导出、可恢复、可清空；所有异常态有表现 |
| **M6 能上线** | 全量验收 68 条 + 真机性能 + 提审 | D23 | 提交审核版本 |

### 0.2 关键路径（不能被拖延的三条）

```
数据契约(P1) ──▶ 四模块(P4/P5) ──▶ 首页(P6) ──▶ 趋势(P7)
                                            └─▶ 积分(P8) ──▶ 榜单
像素资源(P2) ──▶ 所有页面（图标不到位，页面就"不像"）
云开发开通（用户侧，D1 就要办）──▶ P8（不开则 M4 全部阻塞）
```

**必须第一天就并行启动的两件事**（不占开发工时，但会卡上线）：

1. **用户去开微信云开发 + ICP 备案**（备案 1–2 周，赶不上就上不了线）；
2. **申请/确认小程序 AppID**（云开发、真机调试都依赖它，测试号不能开云开发）。

### 0.3 开发顺序的三条原则

1. **数据先于界面**：P1 的 service 层先写完并用 Node 脚本跑通，界面只做渲染，避免边写 UI 边改数据结构。
2. **组件先于页面**：P2 把卡片、按钮、进度条、图标做死，后面 9 个页面只是拼装，不出样式分歧。
3. **积分最后接云**：积分逻辑先在本地跑通（P4/P5 就发分），P8 只做"上云 + 榜单"，这样 M4 出问题时不影响 M2 已能自用。

---

## 一、技术选型与工程结构

### 1.1 选型（已定，不再讨论）

| 项 | 选择 | 理由 |
|---|---|---|
| 框架 | **微信小程序原生**（WXML/WXSS/JS） | 页面只有 18 个、无复杂状态共享、无多端需求。原生包体最小、启动最快（AC-K10 要求 1.5 秒内可交互），Taro/uni-app 的编译层在这里是纯负担 |
| 语言 | JS（ES2017，不开 TypeScript） | 单人项目，TS 的类型收益抵不上配置成本；用 JSDoc 给 service 层标注即可 |
| 状态管理 | **无第三方库**。页面内 `data` + `utils/store.js` 一个轻量订阅容器（约 60 行） | 只有 profile / 今日 daily / 积分三个共享状态，Redux 类方案过度设计 |
| 图表 | **Canvas 2D 手写**（约 300 行） | 要求直角折线、方形数据点、空柱不画成 0 高度——echarts 的平滑/主题体系反而要一路关掉。手写包体为 0，且像素风可控 |
| 图标 | **PNG 资源**，按 16×16 网格作画，导出 48×48（3 倍） | 小程序 WXML 不支持内联 SVG；PNG 在整数倍尺寸下最锐利。用脚本从 ASCII 网格批量生成（详见 4.1） |
| 开屏动画 | **单张 3 帧横排雪碧图** + WXSS `steps(3)` | 一帧一图会有切换闪烁；雪碧图 + `steps` 是硬切，且只需一次加载 |
| 后端 | **微信云开发**（云函数 + 云数据库），基础版免费档 | PRD 附录 D 已定。不引入自建服务器 |
| 存储 | `wx.setStorageSync`（本地） + 云数据库（仅积分/好友） | 见 PRD 7.1 |

**明确不用**：npm 依赖、组件库（Vant/WeUI）、字体文件（走系统圆体回退）、图片 CDN、埋点 SDK。

### 1.2 目录结构

```
大理论时代/                        ← 项目根（微信开发者工具导入此目录）
├─ project.config.json            appid、编译配置、miniprogramRoot
├─ project.private.config.json     个人配置（不入库）
├─ miniprogram/
│  ├─ app.js                      启动、冷启动标记、全局 store 初始化
│  ├─ app.json                    页面注册、tabBar、窗口样式
│  ├─ app.wxss                    全局 reset + tokens 引入
│  ├─ styles/
│  │  ├─ tokens.wxss              色板/圆角/描边/间距变量（唯一定义处）
│  │  └─ base.wxss                排版、通用原子类
│  ├─ utils/
│  │  ├─ date.js                  dayKey/本周起止/时长计算/跨零点
│  │  ├─ storage.js               dt_* 读写封装（含容量与失败提示）
│  │  ├─ profile.js               档案读写、默认值、overridden 合并
│  │  ├─ goals.js                 目标计算（PRD 5.2 唯一实现）
│  │  ├─ daily.js                 每日记录读写、去重计数、完成判定
│  │  ├─ points.js                发分器（幂等）、周期汇总、待同步队列
│  │  ├─ backup.js                导出/校验/恢复/清空
│  │  ├─ cloud.js                 云函数调用 + 离线队列重放
│  │  ├─ store.js                 轻量订阅
│  │  └─ format.js                升/分/千卡/分钟 的显示格式
│  ├─ components/
│  │  ├─ px-card/                 奶白卡（3px 描边 + 内线 + 底部投影）
│  │  ├─ px-btn/                  主/次按钮，按下位移 2px
│  │  ├─ px-progress10/           10 格分段进度
│  │  ├─ px-icon/                 图标 + 板块色底块
│  │  ├─ px-tag/                  状态标签（达标/合格/+10）
│  │  ├─ px-avatar/               8 款内置像素头像
│  │  ├─ px-sheet/                底部弹层（改总数、时间选择、恢复确认）
│  │  ├─ px-toast/                +10 上浮、保存失败提示
│  │  ├─ chart-line/              Canvas 折线（目标线、断点、方形点）
│  │  └─ chart-bar/               Canvas 柱状（空柱不画 0 高度）
│  ├─ pages/
│  │  ├─ splash/                  开屏
│  │  ├─ onboard/                 引导 3 屏（profile/shape/result 三个页面）
│  │  ├─ home/                    今日
│  │  ├─ water/  anti/  sleep/  muscle/
│  │  ├─ trend/
│  │  ├─ rank/  rank-invite/
│  │  └─ me/  me-profile/  me-goal/  me-buddies/  me-data/
│  └─ assets/
│     ├─ icons/                   12 个功能图标 + 8 类食物图标（PNG 48×48）
│     ├─ avatar/                  8 款头像（PNG 96×96）
│     ├─ splash/hero-3f.png       3 帧横排雪碧图（150×70）
│     └─ splash/logo-frame.png    木框（可选，能纯 CSS 就纯 CSS）
├─ cloudfunctions/
│  ├─ dt_score/                   发分（幂等 + 服务器时间）
│  ├─ dt_buddy/                   邀请/接受/解除/列表
│  ├─ dt_rank/                    榜单聚合
│  └─ dt_profile/                 昵称头像隐身同步
└─ tools/
   ├─ gen-icons.py                ASCII 网格 → PNG（开发用，不上传）
   └─ mock-check.js               service 层单元自测（Node 跑）
```

### 1.3 app.json 页面注册（照抄）

```json
{
  "pages": [
    "pages/splash/index",
    "pages/home/index",
    "pages/onboard/profile",
    "pages/onboard/shape",
    "pages/onboard/result",
    "pages/water/index",
    "pages/anti/index",
    "pages/sleep/index",
    "pages/muscle/index",
    "pages/trend/index",
    "pages/rank/index",
    "pages/rank-invite/index",
    "pages/me/index",
    "pages/me-profile/index",
    "pages/me-goal/index",
    "pages/me-buddies/index",
    "pages/me-data/index"
  ],
  "window": {
    "navigationStyle": "custom",
    "backgroundColor": "#8B5E3C",
    "backgroundTextStyle": "light"
  },
  "tabBar": {
    "custom": true,
    "color": "#7C5836",
    "selectedColor": "#3E2410",
    "backgroundColor": "#FFF9E8",
    "list": [
      { "pagePath": "pages/home/index",  "text": "今日" },
      { "pagePath": "pages/trend/index", "text": "趋势" },
      { "pagePath": "pages/rank/index",  "text": "榜单" },
      { "pagePath": "pages/me/index",    "text": "我的" }
    ]
  },
  "style": "v2",
  "sitemapLocation": "sitemap.json"
}
```

> `navigationStyle: custom` + `tabBar.custom: true`：像素风需要自绘导航条和底栏（选中项整块反色），系统 tabBar 改不了样式。

---

## 二、先落地数据契约（P1 的产出，后面全靠它）

> 这一步写完就不再改。所有页面只调这些函数，**不允许页面直接 `wx.setStorageSync`**。

### 2.1 `utils/date.js`

```js
todayKey()                      // → '2026-10-19'（按本地时区算展示；判定是否"今天"用服务器日期）
isToday(dateKey, serverToday)   // → boolean
weekRange(dateKey)              // → {start:'2026-10-19', end:'2026-10-25'}  周一起
addDays(dateKey, n)             // → '2026-10-22'
lastNDays(n)                    // → ['2026-09-20', ... , '2026-10-19']  升序
durationMin(bed:'23:40', wake:'07:10')  // → 450（自动 +24h 跨零点）
fmtDuration(450)                // → '7时30分'
dayIndex(firstLaunchAt)         // → 5（第 N 天）
```

### 2.2 `utils/storage.js`

```js
read(key, fallback)             // 内部 JSON.parse，异常返回 fallback 并打日志
write(key, value)               // 失败 → toast('保存失败，请导出备份')，返回 false
remove(key)
estimateBytes()                 // 我的页显示存储占用
```

key 常量集中在 `storage.js` 顶部：`dt_meta / dt_profile / dt_daily / dt_points / dt_social_cache / dt_sync_queue`（PRD 7.2）。

### 2.3 `utils/goals.js`（PRD 5.2 的唯一实现，禁止在别处复制公式）

```js
calcTargets(profile) → {
  calories: 2500,          // TDEE + 体型调整，取整到 10
  waterGoalL: 1.5,         // 固定，不参与计算
  waterAdvancedL: 2.2,     // 体重×32.5ml，四舍五入 0.1
  strengthPerWeek: 3,
  cardioPerWeek: 2,
  sleepText: '7–9 小时'
}
mergeOverrides(calcResult, overrides)   // 手改过的字段不被覆盖
```

### 2.4 `utils/daily.js`

```js
getDay(dateKey)                 // → dailyRecord（不存在返回默认对象，不写盘）
patchDay(dateKey, partial)      // 合并写入 + updatedAt；返回新对象
setWater(dateKey, liters)
antiCount(dateKey)              // → 去重类别数 0–8
getMuscleWeekCount(dateKey)     // → 本周训练次数（含当天）
isDone(module, dateKey)         // → boolean（按 PRD 附录 A 判定）
recentDays(n)                   // → [{date, water, calories, weightKg, sleepMin, muscleMin, score}]
```

### 2.5 `utils/points.js`

```js
tryAward(dateKey, module, serverToday)  // 幂等发分；返回 {awarded:true, points:10} | {awarded:false, reason:'already'|'notToday'}
awardAllIfDone(dateKey)                 // 每次写入 daily 后调用，逐个模块判定
todayTotal(serverToday)                 // → 0–40
rangeTotal(start, end)                  // 今日/本周/累计
enqueue(entry) / flush()                // 离线队列
```

**发分时序（必须照此实现）**：

```
用户操作 → daily.patchDay() → 写本地
        → points.awardAllIfDone(date) 
            ├─ 逐模块 isDone() → 未发过 → 写 points 账本（本地，synced:false）
            │                              → 弹 +10 → 调云函数 dt_score
            │                                   ├─ 成功 → synced:true
            │                                   └─ 失败 → 留队列，顶部「离线 · X 条待同步」
            └─ 已发过 → 交给 reconcile 判断：记录仍达标不动，改到不达标则回收
```

### 2.6 `utils/backup.js`

```js
export()      // 组装 {schemaVersion, exportedAt, appVersion, profile, daily, points, meta}
              // → 写 USER_DATA_PATH/backup/dt-backup-YYYYMMDD-HHmm.json
              // → wx.shareFileMessage；失败降级 wx.setClipboardData
validate(json) // → {ok:true, stats:{days, points}} | {ok:false, error:'第 3 天缺少 water 字段'}
apply(json)    // 完全替换；重置 sync_queue；points 全标 unsynced；返回 stats
clearAll()     // 二次确认后清 5 个 key
```

### 2.7 `utils/cloud.js`

```js
call(name, data)        // wx.cloud.callFunction 包装，统一错误码
serverToday()           // 调 dt_score 的 ping 动作取服务器日期，本地缓存 10 分钟
```

**注意**：`serverToday()` 是积分判定的唯一时间源。所有"今天"的判分逻辑都用它，不用手机时间（AC-H6）。

### 2.8 P1 自测（`tools/mock-check.js`）

用 Node 跑，不需要小程序环境。至少覆盖：

| 用例 | 断言 |
|---|---|
| 68kg/175/30/男/中度 | `calories === 2500`（±10） |
| 68kg | `waterAdvancedL === 2.2` |
| 23:40→07:10 | `durationMin === 450` |
| 同一模块连发 5 次 | 账本仅 1 条 |
| 大水 1.5 → 删记录 → 1.0 | 分数仍为 10 |
| daily 缺失日期 | `getDay()` 返回默认对象且不写盘 |

---

## 三、分阶段任务表

### P0 工程脚手架（1 人日）

| ID | 任务 | 产出 | 依赖 | 验收 |
|---|---|---|---|---|
| P0-1 | 新建小程序项目，填入 AppID，`miniprogramRoot` 指向 `miniprogram/` | `project.config.json` | AppID 到手 | — |
| P0-2 | 建目录骨架（1.2 的结构，页面先放空壳） | 22 个目录 + 18 个空页面 | P0-1 | — |
| P0-3 | `app.json` 注册全部页面 + 自定义 tabBar | 见 1.3 | P0-2 | 能翻完 4 个 Tab |
| P0-4 | `styles/tokens.wxss`：PRD 设计稿色板 12 色 + 圆角 + 描边 + 4px 栅格，做成 CSS 变量 | tokens.wxss | P0-3 | — |
| P0-5 | 云开发初始化（`wx.cloud.init`），建 4 个云函数空壳并部署成功 | cloudfunctions/* | 云开发已开通 | 调用返回 `{ok:true}` |
| P0-6 | `utils/` 全部文件建空 + JSDoc 签名（按第二章） | 10 个 js | P0-2 | — |

**完成标志**：开发者工具能编译、能真机预览、能调通一个空云函数。

---

### P1 数据层（2 人日）

| ID | 任务 | 产出 | 依赖 | 验收 |
|---|---|---|---|---|
| P1-1 | `date.js` 全部函数 + 单测 | date.js | P0-6 | `durationMin` 跨零点正确（AC-E1） |
| P1-2 | `storage.js` 读写 + 失败提示 + 容量估算 | storage.js | P0-6 | AC-J2 |
| P1-3 | `profile.js` 默认值、必填校验、`overridden` 合并 | profile.js | P1-2 | AC-A4、AC-J1 |
| P1-4 | `goals.js` 全套公式 | goals.js | P1-3 | AC-A3 |
| P1-5 | `daily.js` 读写、去重计数、周次数、`isDone` | daily.js | P1-1/2 | AC-D5、AC-F1 |
| P1-6 | `points.js` 幂等发分 + 周期汇总 + 队列 | points.js | P1-5 | AC-H3、AC-H4 |
| P1-7 | `format.js` 显示格式（`1.2 升`、`7时30分`、`2400 千卡`） | format.js | — | AC-C5（不出现毫升） |
| P1-8 | `mock-check.js` 六个用例跑通 | tools/mock-check.js | 以上 | 全绿 |

**完成标志**：不开界面，用一个临时页面点按钮就能造出 30 天假数据，`recentDays(30)` 返回正确。

---

### P2 视觉底座（3 人日）

| ID | 任务 | 产出 | 依赖 | 验收 |
|---|---|---|---|---|
| P2-1 | `tools/gen-icons.py`：ASCII 网格 + 色表 → 合并横排 → PNG（3 倍导出） | gen-icons.py | — | — |
| P2-2 | 画 12 个功能图标（水滴/火焰/弯月/哑铃/奖杯/皇冠/方格/柱状/人形/邀请/设置/返回） | assets/icons/*.png | P2-1 | AC-K5 |
| P2-3 | 画 8 类食物图标（莓果串/绿叶/鱼/核桃/油瓶/香料根/鸡蛋/橙子） | assets/icons/food-*.png | P2-1 | AC-D6（24 格无缺图） |
| P2-4 | 画 8 款像素头像 | assets/avatar/*.png | P2-1 | AC-I2 |
| P2-5 | `px-card`：奶白底 + 3px 深棕描边 + 2px 浅麦内线 + 底部 4px 实心投影 + 12px 圆角 | components/px-card | P2-1 | AC-K5 |
| P2-6 | `px-btn`：主/次按钮，按下 `translateY(2px)` + 投影收缩，60ms linear | components/px-btn | P2-5 | AC-K8 |
| P2-7 | `px-progress10`：10 格方块，格间 2px 缝 | components/px-progress10 | P2-5 | AC-K6 |
| P2-8 | `px-icon` / `px-tag` / `px-avatar` | 3 个组件 | P2-5 | AC-B3（+10 标签） |
| P2-9 | `px-sheet` 底部弹层（改总数、时间选择、恢复确认共用） | components/px-sheet | P2-6 | AC-C3 |
| P2-10 | `px-toast`（+10 上浮 240ms、失败提示） | components/px-toast | P2-5 | AC-H1 |
| P2-11 | 自绘导航条 + 自绘 tabBar（选中整块反色） | components/px-navbar、px-tabbar | P2-5 | AC-K5 |
| P2-12 | `app.wxss` 全局排版：圆体字栈、等宽数字、字号层级 | app.wxss | P2-5 | AC-K7、AC-K9 |

**完成标志**：做一个「组件预览页」，一屏看到所有组件在最终样式下长什么样。**这一步不通过，不要往下写页面**。

---

### P3 开屏与引导（2 人日）

| ID | 任务 | 产出 | 依赖 | 验收 |
|---|---|---|---|---|
| P3-1 | 生成 3 帧雪碧图（垂手/半举/顶点），150×70，透明底 | assets/splash/hero-3f.png | P2-1 | AC-K1、AC-K2 |
| P3-2 | 开屏页：木框 + 雪碧图 `steps(3)` 1.05s 循环 + 顶点帧星芒 | pages/splash | P3-1 | AC-K1、AC-K2 |
| P3-3 | 打字机口号「全民严肃进入大理论时代」30ms/字 + 方块光标 + 可点击跳过 + 1.2s 上限跳转 | pages/splash | P3-2 | AC-K3 |
| P3-4 | 冷启动标记：`app.js` 里判断是否冷启动，切后台回来不重播 | app.js | P3-3 | AC-K4 |
| P3-5 | 引导-档案：性别/年龄/身高/体重/活动量 + 越界置灰 + 数值键盘 | pages/onboard/profile | P1-3 | AC-A1、AC-A2 |
| P3-6 | 引导-体型：4 选 1 大按钮卡 | pages/onboard/shape | P3-5 | AC-A1 |
| P3-7 | 引导-结果：四张色条目标卡（热量/饮水/运动/睡眠）+ 昵称输入 + 8 款头像选择 + 可跳过 | pages/onboard/result | P1-4 | AC-A3、AC-A4 |
| P3-8 | 引导完成写入 `firstLaunchAt`，再次进入不再出现 | app.js | P3-7 | AC-A5 |

**完成标志**：清缓存后首次进入能走完 3 屏并落在首页（首页此时还是假数据）。

---

### P4 大水 + 抗炎（2.5 人日）

| ID | 任务 | 产出 | 依赖 | 验收 |
|---|---|---|---|---|
| P4-1 | 大水页：顶部深色 slogan 条 + 木桶（水位按 `water/1.5`）+ 24px 刻度线 + 水位横杠 | pages/water | P2-5 | AC-C1 |
| P4-2 | 快捷加 `0.1/0.25/0.5` + `−` 撤销上一次 + 「改总数」弹层 | pages/water | P4-1、P2-9 | AC-C1、AC-C2、AC-C3 |
| P4-3 | 水位一格一格跳（80ms/格，linear）+ 达标时桶顶小皇冠 + 「达标」反白牌 | pages/water | P4-1 | AC-C4 |
| P4-4 | 抗炎页：三餐 × 8 格，餐卡切换 + 选中态（板块色底 + 反白图标 + 2px 阴影） | pages/anti | P2-3 | AC-D1、AC-D6 |
| P4-5 | 点选/取消即时保存 + 底部「自动保存 · HH:mm 已保存」 | pages/anti | P4-4、P1-5 | AC-D4 |
| P4-6 | 顶部去重计数 + 合格/不合格标签 + 不合格提示「今天 2 项，再补 1 项」 | pages/anti | P1-5 | AC-D2、AC-D3、AC-D5 |
| P4-7 | 接入发分（大水/抗炎），本地跑通 + `+10` 动效 | pages/water、anti | P1-6、P2-10 | AC-H1、AC-H2 |

**完成标志**：这两项能真记，分数在本地正确累加、删记录不掉分。**此时可开始自己用**。

---

### P5 大睡 + 薄肌（2 人日）

| ID | 任务 | 产出 | 依赖 | 验收 |
|---|---|---|---|---|
| P5-1 | 大睡页：按时长变化的像素弯月（纯装饰）+ 大数字时长 | pages/sleep | P2-2 | AC-E1 |
| P5-2 | 入睡/起床两张卡 + 时间选择器 + 自动算时长（跨零点） | pages/sleep | P1-1 | AC-E1、AC-E2 |
| P5-3 | 优/良/差三按钮，**默认不选中**；填反时的提示 + 「算作跨天」 | pages/sleep | P5-2 | AC-E2、AC-E5 |
| P5-4 | 薄肌页：目标卡（目标体重 + 每周次数 + 本周进度）+ 「编辑」改频率 | pages/muscle | P2-7、P1-5 | AC-F1、AC-F2 |
| P5-5 | 推/拉/蹲三组动作库（12 个动作 + 一句说明）+ 「+ 自定义」持久化 | pages/muscle | P1-5 | AC-F3、AC-F6 |
| P5-6 | 训练记录弹层：项目/时长/强度/备注 → 保存 → 今日列表 | pages/muscle | P2-9 | AC-F3 |
| P5-7 | 删除当日记录 + 接入发分（大睡/薄肌） | pages/sleep、muscle | P1-6 | AC-E4、AC-F4、AC-F5 |

**完成标志**：四个模块全部可记，PRD 第八章 5–8 项完成。

---

### P6 首页（1 人日）

| ID | 任务 | 产出 | 依赖 | 验收 |
|---|---|---|---|---|
| P6-1 | B1 顶部条：日期 + 「第 N 天」+ 右侧 `X/40` | pages/home | P1-1、P1-6 | AC-B1 |
| P6-2 | 四张卡（统一结构）：图标/名称/主数值/副数值/10 格进度/状态标签 | pages/home | P2-5、P2-7 | AC-B2、AC-B3 |
| P6-3 | 四张卡各自口径（薄肌按周、进度分母不同） | pages/home | P6-2 | AC-B2、AC-F2 |
| P6-4 | B3 体重/热量两行卡 + 数字键盘 + 可清空 | pages/home | P2-9 | AC-B6 |
| P6-5 | B4 提示条 6 条优先级规则 | pages/home | P6-1 | AC-B4 |
| P6-6 | 卡片点击跳转 + 返回后刷新（`onShow` 重读） | pages/home | P6-2 | AC-B5 |
| P6-7 | 未填档案 / 全空 / 离线 / 历史日期 四种首页态 | pages/home | P6-2 | AC-B7、AC-L2 |
| P6-8 | 首页 ↔ 模块页 3 次点击内完成记录（压缩返回栈） | 全局 | P6-6 | AC-L1 |

**完成标志**：M2 达成，核心闭环完整，可以交给用户自用收集真实反馈。

---

### P7 趋势（2.5 人日）

| ID | 任务 | 产出 | 依赖 | 验收 |
|---|---|---|---|---|
| P7-1 | `chart-line`：直角折线、2px 线宽、6px 方形数据点、目标虚线、断点（无数据不连） | components/chart-line | P2-2 | AC-G2、AC-G3 |
| P7-2 | `chart-bar`：金色彩柱、**无数据画空柱（描边不填充），不画 0 高度** | components/chart-bar | P2-2 | AC-G3 |
| P7-3 | 趋势页骨架：7/30 天切换 + 6 张图布局 | pages/trend | P7-1/2 | AC-G3 |
| P7-4 | 6 张图接数：体重/热量/饮水/睡眠/运动/积分 | pages/trend、P1-5 | P7-3 | AC-G2 |
| P7-5 | 顶部三个汇总数（日均升数 / 抗炎合格天数 / 力量训练次数） | pages/trend | P1-5 | AC-G4 |
| P7-6 | 空态骨架图 + 「数据攒到 7 天就能画线了」 | pages/trend | P7-3 | AC-G1 |
| P7-7 | 点某天 → 该天详情（复用模块页带 `?date=`）+ 顶部「历史 · 补记不补分」 | pages/*（date 分支） | P4/P5/P6 | AC-G5 |
| P7-8 | 历史态下写入不触发发分（`points.tryAward` 拦 `date !== serverToday`） | utils/points.js | P7-7 | AC-G5 |

**完成标志**：M3 达成。

---

### P8 云开发 + 积分上云 + 搭子 + 榜单（4 人日）

| ID | 任务 | 产出 | 依赖 | 验收 |
|---|---|---|---|---|
| P8-1 | 建 4 个集合 + 唯一索引 `(_openid,date,module)` + 权限「仅创建者可读写」 | 云数据库 | 云开发已开 | AC-H3 |
| P8-2 | `dt_score`：`ping` 返回服务器日期；`submit` 幂等 upsert，`date !== 服务器今天` 直接拒 | cloudfunctions/dt_score | P8-1 | AC-H3、AC-H6 |
| P8-3 | `dt_profile`：昵称/头像/隐身同步 | cloudfunctions/dt_profile | P8-1 | AC-I9 |
| P8-4 | 本地发分接入云：成功标 `synced`，失败入队 | utils/cloud.js、points.js | P8-2 | AC-H5 |
| P8-5 | 断网队列重放（`wx.onNetworkStatusChange` + 启动时 flush）+ 顶部「离线 · X 条待同步」 | utils/cloud.js | P8-4 | AC-B7、AC-H5、AC-L6 |
| P8-6 | `dt_buddy`：`createInvite`（6 位码，7 天过期）/ `accept`（一次性、双向两行）/ `list` / `remove` | cloudfunctions/dt_buddy | P8-1 | AC-I1、AC-I2、AC-I3、AC-I5 |
| P8-7 | 邀请页：生成像素邀请卡（`onShareAppMessage` 带 `inviteCode`）+ 输码入口 | pages/rank-invite | P8-6 | AC-I1 |
| P8-8 | 分享进入处理：未引导→先引导→再弹「接受邀请」 | app.js、rank-invite | P8-7 | AC-I1、AC-I2 |
| P8-9 | 搭子上限 20（按钮置灰 + 提示） | pages/rank-invite | P8-6 | AC-I4 |
| P8-10 | `dt_rank`：按周期聚合（今日/本周/累计），同分取「达到该总分时间更早」 | cloudfunctions/dt_rank | P8-2 | AC-I6、AC-I7、AC-I8 |
| P8-11 | 榜单页：三段切换（默认累计）+ 头像/昵称/分数 + 自己高亮（水蓝描边）+ 前三皇冠 | pages/rank | P8-10、P2-4 | AC-I6、AC-I8 |
| P8-12 | 隐身上榜显示「隐身中 —」，名次保留 | pages/rank | P8-3 | AC-I9 |
| P8-13 | 搭子管理页：本周得分 + 解除（二次确认） | pages/me-buddies | P8-6 | AC-I5 |
| P8-14 | 隐私校验：榜单查询只返回昵称/头像/分数/名次 | dt_rank | P8-10 | AC-I10 |

**完成标志**：M4 达成。**两台真机互相邀请能看到排名**，这是这个阶段唯一的验收动作，必须真机验。

---

### P9 我的 / 备份恢复 / 收口（2 人日）

| ID | 任务 | 产出 | 依赖 | 验收 |
|---|---|---|---|---|
| P9-1 | 我的页：档案行、目标行、昵称头像、隐身开关、搭子入口、数据备份入口、关于 | pages/me | P2-5 | AC-J1 |
| P9-2 | 档案编辑页（复用引导表单，保存后重算目标但保留 `overridden`） | pages/me-profile | P3-5、P1-4 | AC-J1 |
| P9-3 | 目标编辑页：热量/饮水/运动次数/睡眠 逐项可改 | pages/me-goal | P1-4 | AC-J1 |
| P9-4 | `backup.export()`：写文件 + `shareFileMessage` + 剪贴板兜底 + 记录 `lastBackupAt` | pages/me-data、backup.js | P1-2 | AC-J3 |
| P9-5 | `backup.validate()`：5 步校验 + 精确错误定位；失败**绝不覆盖** | backup.js | P9-4 | AC-J5 |
| P9-6 | `backup.apply()`：二次确认「完全替换」→ 重置 sync_queue → points 全标 unsynced | backup.js | P9-5 | AC-J4、AC-L8 |
| P9-7 | 清空数据（二次确认文案含「榜单名次归零」） | pages/me-data | P9-6 | AC-J6 |
| P9-8 | 数据说明页：本地存什么 / 云端存什么 / 卸载会丢（PRD 7.7 原文） | pages/me-data | — | 附录 D |
| P9-9 | 全站异常态走查（PRD 第三章 3.5 + 第十章 L 组） | 全局 | P9-1~8 | AC-L1~L8 |
| P9-10 | 删除 `dt_daily` 超 400 天的滚动清理 | utils/storage.js | P1-2 | 附录 B-16 |

**完成标志**：M5 达成。功能全齐，只剩验收。

---

### P10 验收与提审（1 人日 + 等待）

| ID | 任务 | 产出 | 依赖 |
|---|---|---|---|
| P10-1 | 按 PRD 第十章 68 条 AC 逐条执行，记录结果 | 验收表 | 全部 |
| P10-2 | 真机性能：冷启动 ≤1.5s、四项记录 ≤90s、滚动不掉帧 | 测试记录 | P10-1 |
| P10-3 | 两账号交叉验收（I 组 10 条必须双机） | 测试记录 | P8 |
| P10-4 | 小程序类目、隐私协议、备案号填入——「健康管理/运动健身」 | 后台配置 | 备案完成 |
| P10-5 | 上传体验版 → 提审 → 处理驳回 | — | P10-1~4 |

---

## 四、四个"最容易卡住"的实现方案

### 4.1 像素图标批量生成（P2-1，别一个个手扣）

写一个 Python 脚本，输入是字符网格 + 色表，输出 PNG：

```python
# tools/gen-icons.py 的核心思路
SPECS = {
  "water": {
    "colors": {"w": "#3C97D4", "d": "#2A6E9E", ".": None},
    "grid": [
      "................",
      ".......ww.......",
      "......wwww......",
      ".....wwwwww.....",
      # ... 16 行 × 16 列
    ],
  },
  # ... 其余 19 个
}
# 每个非 '.' 字符 → 画 scale×scale 的实心方块（scale=3 → 48×48）
# 不做任何抗锯齿、不做圆角，边缘必须硬
```

**规则**（决定"像不像像素画"）：

- 网格固定 16×16；导出 48×48（3 倍），显示时只用 16/24/48 三个尺寸（整数倍）。
- 只用横竖线和对角阶梯，禁止斜线绘制。
- 同色区域必须连通，留至少 1px 透明边。
- 每张图颜色 ≤ 4 种（含 1 种深色描边）。

**工作量提醒**：20 个图标 × 平均 40 分钟 ≈ 1.5 人日，这是本阶段最大的一块，不要低估。

### 4.2 开屏 3 帧动画（P3-1/2）

```css
/* 雪碧图 150×70（3 帧 × 50 宽），显示 50×70 */
.hero {
  width: 50px; height: 70px;
  background: url('/assets/splash/hero-3f.png') no-repeat;
  background-size: 150px 70px;
  animation: lift 1.05s steps(3) infinite;
}
@keyframes lift {
  from { background-position: 0 0; }
  to   { background-position: -150px 0; }
}
```

**注意**：`steps(3)` 必须配 `-150px` 终点（3 帧总位移），写成 `-100px` 会跳成 2 帧。星芒单独做一个绝对定位的图层，用 opacity 在顶点帧闪一下（`animation-delay: 0.7s`），不要塞进雪碧图。

### 4.3 Canvas 折线图（P7-1）

不引库，约 120 行，关键点：

```js
// 1. 逻辑尺寸固定 750×360 rpx 换算 px，devicePixelRatio 缩放，避免糊
// 2. 数据为 null 的点：moveTo 断开，不连成一条直线（AC-G3）
// 3. 目标线用 setLineDash([4,4])
// 4. 数据点画 6×6 方形（fillRect），不是圆点——圆点会显得"不像素"
// 5. 不使用 shadowBlur / 渐变
```

柱状图同理：值为 0 或 null 时**只描边不填充**（画一个 1px 高的空心柱），否则视觉上像"断线"（AC-G3 明确要求）。

### 4.4 发分与防重（P8-2）

```js
// cloudfunctions/dt_score/index.js
exports.main = async (event) => {
  const { OPENID } = cloud.getWXContext();
  const now = new Date();
  const serverToday = fmt(now);           // 'YYYY-MM-DD'，服务器时区统一用 +08:00

  if (event.action === 'ping') return { ok: true, serverToday };

  // 铁律 4：跨天判定用服务器时间
  if (event.date !== serverToday) {
    return { ok: false, code: 'NOT_TODAY' };      // 补记、改手机日期都走这里
  }
  // 铁律 3：date+module 唯一，靠唯一索引兜底
  try {
    await db.collection('dt_scores').add({
      data: { _openid: OPENID, date: event.date, module: event.module,
              points: 10, serverAt: now.getTime() }
    });
    return { ok: true, awarded: true };
  } catch (e) {
    if (isDuplicateKey(e)) return { ok: true, awarded: false };  // 已发过，幂等
    throw e;
  }
};
```

**唯一索引必须在云控制台手动建**：`dt_scores` 上 `(_openid, date, module)` 唯一。少了它，并发双击会发两次分。

---

## 五、测试计划（对着 PRD 第十章 68 条）

| 组 | 条数 | 谁测 | 怎么造数据 | 时点 |
|---|---|---|---|---|
| A 引导与目标 | 5 | 开发自测 | 清缓存重进 | P3 结束 |
| B 首页 | 7 | 开发自测 | 手记 + 清空 | P6 结束 |
| C 大水 | 5 | 开发自测 | 快捷加/改总数 | P4 结束 |
| D 抗炎 | 6 | 开发自测 | 三档组合 | P4 结束 |
| E 大睡 | 5 | 开发自测 | 填反时间 | P5 结束 |
| F 薄肌 | 6 | 开发自测 | 改频率/删记录 | P5 结束 |
| G 趋势 | 5 | 开发自测 | 用 `mock-check` 灌 30 天假数据 | P7 结束 |
| H 积分 | 6 | 开发 + 双机 | 飞行模式、改手机日期 | P8 结束 |
| I 榜单与搭子 | 10 | **双机交叉** | 两个微信号互相邀请 | P8 结束 |
| J 数据备份 | 6 | 开发自测 | 导出→清空→恢复 | P9 结束 |
| K 视觉性能 | 10 | 真机目测 | — | P10 |
| L 异常边界 | 8 | 开发 + 真机 | 断网、越界输入 | P10 |

**两个必测的脏活**：

1. **改手机日期刷分**：把系统时间调到明天，记满四项 → 云端必须拒（`NOT_TODAY`），本地不得加满 40。测完记得调回来。
2. **断网 3 天模拟**：飞行模式连续记录，队列累积到 3 条以上，恢复网络后 3 秒内顶部提示消失，且云端只有 1 条/模块。

---

## 六、上线检查清单（提审前逐项打勾）

- [ ] AppID 已换成正式号（不是测试号）
- [ ] 云开发环境为**生产环境**，4 个云函数已部署、3 个集合已建、唯一索引已建
- [ ] 数据库权限：「仅创建者可读写」，客户端不可读他人记录
- [ ] `.png` 资源总大小 < 1 MB（20 个图标 + 8 头像 + 1 雪碧图）
- [ ] 主包 < 2 MB，无分包
- [ ] 小程序类目：**健康管理 / 运动健身**（不是医疗健康）
- [ ] 隐私协议：写明记录仅存本机、云端只存昵称头像与积分
- [ ] ICP 备案号已填，备案主体与小程序主体一致
- [ ] 「邀请搭子」是用户点击触发（无自动分享）
- [ ] 全站无「毫升/ml/mL」（AC-C5）
- [ ] 68 条 AC 全绿，记录归档
- [ ] 体验版已发给至少 1 个真实用户试用 3 天

---

## 七、风险表

| 风险 | 概率 | 影响 | 对策 |
|---|---|---|---|
| **像素图标画不完 / 画得不像** | 高 | 高（决定整体调性） | 先画 4 个板块图标定风格，确认后再画剩下 16 个；批量生成靠脚本，改色不用重画 |
| **备案赶不上** | 中 | 阻塞上线 | 第一天就提交；备案期间用体验版内部试用，不等备案也继续开发 |
| **云开发环境/配额问题** | 中 | 阻塞 M4 | P0 阶段就把云函数空壳跑通，不留到最后；免费档足够 20 人规模 |
| **微信分享回调在体验版不生效** | 中 | 阻塞 I 组验收 | 用真机 + 正式版分享路径验证；体验版分享进入的参数要单独打日志确认 |
| **同分排序做不准** | 中 | 中（榜上会"打架"） | 聚合时同时取 `sum(points)` 与 `min(serverAt)`，排序键 `(-score, firstReachAt)`；先用假数据把算法测通 |
| **Canvas 在高 DPI 上糊** | 中 | 中 | 统一用 `px = rpx * dpr` 换算并 `scale(dpr,dpr)`；在 3 台不同分辨率真机上看一次 |
| **单日上限被绕过（多设备）** | 低 | 低 | 唯一索引已兜底；榜单本就是熟人局，PRD 7.6 已声明不防作弊 |
| **备份文件在 iOS 上分享受限** | 低 | 中 | 剪贴板兜底路径必须实现并测过 |

---

## 八、逐日排期（单人全职，可直接照做）

| 天 | 内容 | 当日必交付 |
|---|---|---|
| D1 | P0-1~P0-6 全部；**同时提醒用户去开云开发 + 备案** | 项目能编译、云函数能调通 |
| D2 | P1-1~P1-4（日期、存储、档案、目标） | 目标计算单测通过 |
| D3 | P1-5~P1-8（daily、points、format、mock-check） | 6 个单测全绿 |
| D4 | P2-1~P2-4（脚本 + 4 个板块图标 + 8 个食物图标） | 图标能看，风格定稿 |
| D5 | P2-5~P2-12（组件库全量 + 组件预览页） | **M1 里程碑，组件预览页通过** |
| D6 | P3-1~P3-4（雪碧图 + 开屏） | 开屏动画循环正常 |
| D7 | P3-5~P3-8（引导 3 屏） | 能走完引导落到首页 |
| D8 | P4-1~P4-3（大水页） | 水位与判定正确 |
| D9 | P4-4~P4-7（抗炎页 + 发分接入） | 抗炎自动保存 + 去重正确 |
| D10 | P5-1~P5-3（大睡） | 跨零点正确 |
| D11 | P5-4~P5-7（薄肌） | 训练记录 + 本周进度 |
| D12 | P6-1~P6-8（首页） | **M2 里程碑，核心闭环可自用** |
| D13 | P7-1~P7-3（图表组件 + 趋势骨架） | 折线/柱状能画 |
| D14 | P7-4~P7-6（6 张图接数 + 空态） | 30 天曲线正确 |
| D15 | P7-7~P7-8（历史日期 + 补记不发分） | **M3 里程碑** |
| D16 | P8-1~P8-5（集合、dt_score、上云、离线队列） | 积分断网补传通过 |
| D17 | P8-6~P8-9（邀请、接受、上限） | 双机能成为搭子 |
| D18 | P8-10~P8-12（榜单聚合 + 榜单页 + 隐身） | 双机能看排名 |
| D19 | P8-13~P8-14（搭子管理 + 隐私校验） | **M4 里程碑，双机验收通过** |
| D20 | P9-1~P9-4（我的 + 档案/目标编辑 + 导出） | 导出文件能收到 |
| D21 | P9-5~P9-10（恢复、清空、数据说明、异常走查、滚动清理） | **M5 里程碑** |
| D22 | P10-1~P10-3（68 条 AC + 性能 + 双机交叉） | 验收表全绿或问题清单 |
| D23 | P10-4~P10-5（类目/备案/隐私、上传提审） | **M6 里程碑，已提审** |

**如果只能投入一半时间**：把 P8（云端榜单）砍到第二轮先发，D1–D15 的 M1–M3 是完整可用的单机版，先上线跑起来，榜单后补——但它需要重新提审一次。

---

## 九、每天开工前照做三件事

1. `mock-check.js` 跑一遍，确认数据层没被昨天的改动弄坏；
2. 打开「组件预览页」看一眼，确认视觉没跑偏；
3. 对照 `PRD.md` 找到今天要做的条目，做完就把对应 AC 编号在验收表里勾上——**不要等最后一周才回头找哪条没做**。
