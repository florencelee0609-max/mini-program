# -*- coding: utf-8 -*-
"""打包成可直接导入「微信开发者工具」的 zip。

**包内顶层不套文件夹**：解压后得到的那个目录本身就是项目根，
里面直接是 project.config.json 与 miniprogram/。
这样无论用「解压到 xxx\\」还是「解压到当前文件夹」，落点那层都能直接导入，
不会再出现「选错层级导致找不到 app.json」。

包内结构：
    project.config.json     ← 开发者工具靠它识别项目类型与目录
    miniprogram/            ← 小程序源码（miniprogramRoot）
    cloudfunctions/         ← 云函数（cloudfunctionRoot）
    tools/                  ← 资源/自测脚本，导入不需要，留作可复现
    docs/                   ← PRD、开发计划、设计稿
    README.md
    导入说明.txt

用法：python tools/pack.py
"""
import os
import shutil
import tempfile
import zipfile

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DIST = os.path.join(ROOT, "dist")
ZIP_NAME = "大理论时代-小程序-可导入.zip"

# 包里必须带的东西（顺序即解压后的显示顺序）
INCLUDE_DIRS = ["miniprogram", "cloudfunctions", "tools"]
INCLUDE_FILES = ["project.config.json", "README.md", "导入说明.txt"]

SKIP = shutil.ignore_patterns(
    "__pycache__", "*.pyc", "node_modules", "miniprogram_npm",
    ".DS_Store", "Thumbs.db", "*.zip",
)

GUIDE = """《大理论时代》小程序 · 导入说明
================================================

★★★ 一句话判断选对没有 ★★★
    导入时选中的那个文件夹里，必须能「直接看见」这两个名字：
        project.config.json
        miniprogram            （一个文件夹）
    看不见 → 层级选错了，看第七节。
    这是「未找到 app.json」报错的唯一原因。

一、导入（4 步）
  1. 解压本 zip。解压工具一般会按 zip 名自动建一个文件夹，
     里面直接就是 project.config.json 和 miniprogram
  2. 微信开发者工具 → 导入项目 → 目录选【能看到 project.config.json
     的那一层】，即上一步那个文件夹
  3. AppID 填你自己的；暂时没有就点「测试号」
  4. 点「编译」，直接能跑

二、目录层级（解压后应该长这样）
  大理论时代-小程序-可导入\\          ← 这一层就是项目根，导入选它
    project.config.json              ← 有它才是项目根
    miniprogram\\                     ← 源码目录，它本身不是项目根
      app.json  app.js  app.wxss
      pages\\  components\\  custom-tab-bar\\  styles\\  utils\\  assets\\
    cloudfunctions\\                   ← 4 个云函数
    tools\\  docs\\  README.md  导入说明.txt

  说明：zip 内顶层已经不再套文件夹，所以「解压到 xxx\\」建出来的
  那个目录本身就能直接导入。文件夹叫什么名字无所谓，看里面有没有
  project.config.json。
  而 miniprogram 是 project.config.json 里 miniprogramRoot 指向的
  源码目录，拿它导入虽然能编译，但云函数不会挂载。


三、先跑起来
  直接点「编译」即可。全部核心功能都在本地跑：
  喝水、抗炎、大睡、薄肌、趋势、目标生成、数据备份。
  云开发未配置时，排行榜会自动降级为「本地单机」提示，不报错、不白屏。

四、要开好友排行榜（可选）
  1. 开发者工具左上角点「云开发」，开通并记下环境 ID
  2. 填到 miniprogram/config.js 的 cloudEnvId，例如：
         cloudEnvId: 'dalilun-3gxxxx'
  3. 在云开发控制台 → 数据库，手动建集合：dt_scores / dt_profiles / dt_invites
  4. 给 dt_scores 建索引：_openid + date + module 唯一索引（防重复加分）
  5. 右键 cloudfunctions 下每个云函数 → 上传并部署（云端安装依赖）

五、发布上线前还需
  - AppID 已预填 wxcd93e2f7ac0846a9，若不属于你，改成自己的
  - 完成 ICP 备案（2023 年 9 月起小程序强制要求，未备案不能发布）
  - 在公众平台「设置 → 基本设置 → 小程序头像」上传 docs/小程序头像/icon-144.png

六、已知限制
  - 微信不开放「读取好友列表」接口，所以好友榜采用邀请码制：
    把自己的邀请码发给好友，对方填入后两人才能互相看到排名。
  - 数据默认只存本机。换手机或用「清除缓存」会丢数据，
    请在「我的 → 数据与备份」定期导出。

七、常见报错

  【app.json 文件内容错误 / 在项目根目录未找到 app.json】
  意思很明确：你选的文件夹不是项目根目录。只有三种情况——

  (1) 选成了外层目录，里面只有一个子文件夹
      例如把整个 zip 又解压了一遍，得到
          某目录\\dalilun-miniprogram\\  ← 真正的项目根在这层
      如果你选的是「某目录」，它自己没有 app.json，就会报错。
      往下一层选那个装了 project.config.json 的文件夹。

  (2) 选成了 miniprogram 子目录
      该层没有 project.config.json，只是源码目录。能编译，但
      cloudfunctions 不会挂载、云函数右键上传用不了。
      要完整功能返回上一层。

  (3) 选成了 dist 目录或已失效的旧路径
      dist 里只有 zip 本身，没有源码；或者点「最近项目」打开的是
      被移动/删除过的旧目录。请用「导入项目」重新选目录，
      不要点最近列表。

  自查方法：在资源管理器里打开你要选的那个文件夹，直接能看到
  project.config.json 和 miniprogram —— 就是它，选它。
  只有 miniprogram 一个 → 往上退一层。
  只有一个别的文件夹 → 进那个文件夹。

八、代码质量良好，却上传不了？
  「代码质量/体验评分」只是把代码静态扫一遍，跟能不能上传没有关系。
  上传走的是另一条链：AppID 鉴权 → 账号权限 → 管理员扫码 → 包体积校验。
  按顺序查，90% 卡在第一、二条：

  (1) 详情 → 基本信息 → AppID 显示「测试号」或 touristappid
      游客模式没有上传权限，按钮要么是灰的、要么点了没反应。
      改 project.config.json 的 appid 后，必须关掉项目重新导入才生效。

  (2) 当前扫码登录的微信号，不是这个小程序的开发者/管理员
      表现：上传弹窗出来后，扫码确认时报「无权限」。
      让管理员去公众平台 → 管理 → 成员管理 → 添加你的微信号，
      角色选「开发者」。

  (3) 上传时会弹二维码，要用管理员微信扫码确认
      不扫码 = 一直转圈 / 最后失败，不是代码问题。

  (4) 版本号必须是新的
      重复用上次的版本号会失败。建议 1.0.0、1.0.1 递增。

  (5) 包体积：主包上限 2MB。本项目约 460KB，正常不会撞线。

  (6) 未完成备案
      上传开发版一般放行，但「提交审核 / 发布」一定被拦。
      入口：公众平台 → 设置 → 小程序备案。

  (7) 网络/代理：上传走加密长连接，公司网络或代理常把它掐断。
      换手机热点再试一次即可确认。
"""


def build_stage():
    stage = tempfile.mkdtemp(prefix="dtpack-")
    # 不套外层文件夹：stage 本身就是项目根，zip 顶层即 project.config.json
    dst = stage

    for f in INCLUDE_FILES:
        src = os.path.join(ROOT, f)
        if os.path.exists(src):
            shutil.copy2(src, os.path.join(dst, f))

    for d in INCLUDE_DIRS:
        src = os.path.join(ROOT, d)
        if os.path.isdir(src):
            shutil.copytree(src, os.path.join(dst, d), ignore=SKIP)

    # docs：文档 + 头像
    docs = os.path.join(dst, "docs")
    os.makedirs(docs)
    for f in ("PRD.md", "DEV-PLAN.md", "大理论时代-设计稿.md", "大理论时代-需求说明书-v4.md"):
        src = os.path.join(ROOT, f)
        if os.path.exists(src):
            shutil.copy2(src, os.path.join(docs, f))
    brand_src = os.path.join(ROOT, "assets", "brand")
    if os.path.isdir(brand_src):
        icon_dir = os.path.join(docs, "小程序头像")
        os.makedirs(icon_dir)
        for f in os.listdir(brand_src):
            if f.endswith(".png") and not f.startswith("_"):
                shutil.copy2(os.path.join(brand_src, f), os.path.join(icon_dir, f))

    with open(os.path.join(dst, "导入说明.txt"), "w", encoding="utf-8") as fh:
        fh.write(GUIDE)
    return stage


def zip_stage(stage):
    os.makedirs(DIST, exist_ok=True)
    out = os.path.join(DIST, ZIP_NAME)
    if os.path.exists(out):
        os.remove(out)
    count = 0
    with zipfile.ZipFile(out, "w", zipfile.ZIP_DEFLATED, compresslevel=9) as z:
        for base, _, files in os.walk(stage):
            for f in files:
                full = os.path.join(base, f)
                rel = os.path.relpath(full, stage).replace(os.sep, "/")
                z.write(full, rel)
                count += 1
    return out, count


def main():
    stage = build_stage()
    try:
        out, count = zip_stage(stage)
    finally:
        shutil.rmtree(stage, ignore_errors=True)
    size = os.path.getsize(out)
    print(f"打包完成：{count} 个文件 / {size/1024:.1f} KB")
    print(f"输出路径：{out}")
    with zipfile.ZipFile(out) as z:
        bad = z.testzip()
        print("完整性校验：", "OK" if bad is None else f"损坏于 {bad}")
        names = z.namelist()
        print("顶层条目（解压后这些就在项目根）：")
        seen = set()
        for n in names:
            top = n.split("/")[0]
            if top and top not in seen:
                seen.add(top)
                print("  ", top)
        # 导入可用性自检：解压出来那层必须直接是项目根
        ok_proj = "project.config.json" in names
        ok_app = "miniprogram/app.json" in names
        print()
        print("导入可用性自检：")
        print("  根层有 project.config.json :", "OK" if ok_proj else "X 缺失")
        print("  根层有 miniprogram/app.json:", "OK" if ok_app else "X 缺失")
        print("  → 解压后直接选落点那层即可导入"
              if (ok_proj and ok_app) else "  → 结构有问题，先修脚本再打包")


if __name__ == "__main__":
    main()
