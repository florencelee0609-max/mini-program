# -*- coding: utf-8 -*-
"""打包成可直接导入「微信开发者工具」的 zip。

包内结构（解压后是一层文件夹，导入时选它）：
    dalilun-miniprogram/
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
TOP = "dalilun-miniprogram"
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

一、导入（3 步）
  1. 解压本 zip，得到 dalilun-miniprogram 文件夹
  2. 打开「微信开发者工具」→ 导入项目
  3. 目录选中解压出来的 dalilun-miniprogram（注意：选这一层，
     不是里面的 miniprogram 子目录）；AppID 填你自己的，
     暂时没有就点「测试号」

二、目录说明
  project.config.json  开发者工具的项目配置，miniprogramRoot 指向 miniprogram/
  miniprogram/         小程序源码（页面、组件、样式、像素图片资源）
  cloudfunctions/      4 个云函数：dt_score / dt_profile / dt_buddy / dt_rank
  tools/               像素资源与头像生成脚本、数据层自测（可选）
  docs/                PRD、开发计划、设计稿

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
  - 填写真实 AppID（project.config.json 里现在是 touristappid，只能预览不能上传）
  - 完成 ICP 备案（2023 年 9 月起小程序强制要求）
  - 在公众平台「设置 → 基本设置 → 小程序头像」上传 docs/小程序头像/icon-144.png

六、已知限制
  - 微信不开放「读取好友列表」接口，所以好友榜采用邀请码制：
    把自己的邀请码发给好友，对方填入后两人才能互相看到排名。
  - 数据默认只存本机。换手机或用「清除缓存」会丢数据，
    请在「我的 → 数据与备份」定期导出。
"""


def build_stage():
    stage = tempfile.mkdtemp(prefix="dtpack-")
    dst = os.path.join(stage, TOP)
    os.makedirs(dst)

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
        print("顶层条目：")
        seen = set()
        for n in names:
            top = n.split("/")[1] if len(n.split("/")) > 1 else n
            if top and top not in seen:
                seen.add(top)
                print("  ", top)


if __name__ == "__main__":
    main()
