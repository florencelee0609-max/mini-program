# -*- coding: utf-8 -*-
"""生成《大理论时代》全部像素资源：图标 / 头像 / 开屏三帧雪碧图。

规则：只在 16×16（图标）、12×12（头像）、25×35（小人）的整数网格上画，
最后用 NEAREST 整数倍放大，不产生任何抗锯齿。
用法：python tools/gen_assets.py
"""
import os
from PIL import Image, ImageDraw

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ICON_DIR = os.path.join(ROOT, "miniprogram", "assets", "icons")
AVATAR_DIR = os.path.join(ROOT, "miniprogram", "assets", "avatar")
SPLASH_DIR = os.path.join(ROOT, "miniprogram", "assets", "splash")

INK = "#3E2410"
CREAM = "#FFF9E8"
WOOD = "#5E3C22"
GOLD = "#FFC845"
WATER = "#3C97D4"
FIRE = "#D9542B"
NIGHT = "#7B5EA7"
GRASS = "#4FA83D"


def canvas(w, h):
    img = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    return img, ImageDraw.Draw(img)


def save(img, path, scale):
    w, h = img.size
    img.resize((w * scale, h * scale), Image.NEAREST).save(path)


# ---------------------------------------------------------------- 图标绘制
def draw_icon(name, d, c):
    """在 16×16 画布上用整数矩形画图。c = 主色。"""
    if name == "water":                      # 水滴
        d.rectangle([7, 2, 8, 2], fill=c)
        d.rectangle([6, 3, 9, 4], fill=c)
        d.rectangle([5, 5, 10, 8], fill=c)
        d.rectangle([4, 8, 11, 11], fill=c)
        d.rectangle([5, 12, 10, 13], fill=c)
        d.rectangle([7, 12, 8, 12], fill="#FFFFFF")
    elif name == "fire":                     # 火焰
        d.rectangle([7, 1, 8, 3], fill=c)
        d.rectangle([6, 4, 9, 6], fill=c)
        d.rectangle([5, 6, 10, 9], fill=c)
        d.rectangle([4, 9, 11, 12], fill=c)
        d.rectangle([5, 13, 10, 13], fill=c)
        d.rectangle([7, 9, 8, 12], fill="#FFFFFF")
    elif name == "moon":                     # 弯月
        d.rectangle([6, 2, 10, 3], fill=c)
        d.rectangle([5, 4, 8, 5], fill=c)
        d.rectangle([4, 5, 6, 10], fill=c)
        d.rectangle([5, 11, 8, 12], fill=c)
        d.rectangle([6, 13, 10, 13], fill=c)
        d.rectangle([9, 4, 10, 5], fill=c)
        d.rectangle([10, 6, 11, 9], fill=c)
    elif name == "muscle":                   # 哑铃
        d.rectangle([2, 5, 3, 10], fill=c)
        d.rectangle([4, 4, 4, 11], fill=c)
        d.rectangle([5, 7, 10, 8], fill=c)
        d.rectangle([11, 4, 11, 11], fill=c)
        d.rectangle([12, 5, 13, 10], fill=c)
    elif name == "home":                     # 2×2 方块（今日）
        d.rectangle([3, 3, 7, 7], fill=c)
        d.rectangle([9, 3, 12, 7], fill=c)
        d.rectangle([3, 9, 7, 12], fill=c)
        d.rectangle([9, 9, 12, 12], fill=c)
    elif name == "chart":                    # 柱状
        d.rectangle([3, 9, 4, 13], fill=c)
        d.rectangle([6, 6, 7, 13], fill=c)
        d.rectangle([9, 3, 10, 13], fill=c)
        d.rectangle([12, 7, 13, 13], fill=c)
        d.rectangle([2, 14, 14, 14], fill=c)
    elif name == "trophy":                   # 奖杯
        d.rectangle([4, 2, 11, 3], fill=c)
        d.rectangle([4, 4, 5, 8], fill=c)
        d.rectangle([10, 4, 11, 8], fill=c)
        d.rectangle([6, 9, 9, 10], fill=c)
        d.rectangle([7, 11, 8, 12], fill=c)
        d.rectangle([5, 13, 10, 13], fill=c)
        d.rectangle([2, 4, 2, 6], fill=c)
        d.rectangle([13, 4, 13, 6], fill=c)
    elif name == "user":                     # 人形
        d.rectangle([6, 2, 9, 5], fill=c)
        d.rectangle([7, 6, 8, 6], fill=c)
        d.rectangle([5, 7, 10, 7], fill=c)
        d.rectangle([4, 8, 11, 8], fill=c)
        d.rectangle([3, 9, 12, 13], fill=c)
    elif name == "crown":                    # 皇冠
        d.rectangle([3, 5, 4, 11], fill=c)
        d.rectangle([11, 5, 12, 11], fill=c)
        d.rectangle([7, 4, 8, 11], fill=c)
        d.rectangle([3, 11, 12, 12], fill=c)
        d.rectangle([2, 3, 3, 4], fill=c)
        d.rectangle([7, 2, 8, 3], fill=c)
        d.rectangle([11, 3, 12, 4], fill=c)
    elif name == "plus":
        d.rectangle([7, 4, 8, 11], fill=c)
        d.rectangle([4, 7, 11, 8], fill=c)
    elif name == "minus":
        d.rectangle([4, 7, 11, 8], fill=c)
    elif name == "check":
        d.rectangle([3, 8, 4, 10], fill=c)
        d.rectangle([5, 10, 6, 12], fill=c)
        d.rectangle([7, 8, 8, 10], fill=c)
        d.rectangle([9, 6, 10, 8], fill=c)
        d.rectangle([11, 4, 12, 6], fill=c)
    elif name == "edit":                     # 铅笔
        d.rectangle([3, 11, 4, 12], fill=c)
        d.rectangle([4, 9, 6, 11], fill=c)
        d.rectangle([6, 7, 8, 9], fill=c)
        d.rectangle([8, 5, 10, 7], fill=c)
        d.rectangle([10, 3, 12, 5], fill=c)
    elif name == "invite":                   # 分享（上箭头 + 框）
        d.rectangle([7, 2, 8, 7], fill=c)
        d.rectangle([5, 4, 6, 5], fill=c)
        d.rectangle([9, 4, 10, 5], fill=c)
        d.rectangle([4, 9, 5, 12], fill=c)
        d.rectangle([10, 9, 11, 12], fill=c)
        d.rectangle([4, 12, 11, 13], fill=c)
    elif name == "lock":
        d.rectangle([5, 7, 10, 13], fill=c)
        d.rectangle([6, 3, 9, 4], fill=c)
        d.rectangle([5, 5, 6, 6], fill=c)
        d.rectangle([9, 5, 10, 6], fill=c)
        d.rectangle([7, 9, 8, 11], fill=CREAM)
    elif name == "back":
        d.rectangle([9, 3, 10, 4], fill=c)
        d.rectangle([7, 5, 8, 6], fill=c)
        d.rectangle([5, 7, 6, 8], fill=c)
        d.rectangle([7, 9, 8, 10], fill=c)
        d.rectangle([9, 11, 10, 12], fill=c)
    # -------- 8 类食物 --------
    elif name == "berry":                    # 莓果串
        d.ellipse([3, 4, 8, 9], fill=c)
        d.ellipse([8, 7, 13, 12], fill=c)
        d.ellipse([5, 9, 10, 14], fill=c)
        d.rectangle([7, 2, 8, 3], fill=c)
    elif name == "leafy":                    # 绿叶
        d.line([(4, 13), (11, 5)], fill=c, width=2)
        d.polygon([(5, 11), (6, 6), (11, 3), (12, 4), (9, 10)], fill=c)
        d.rectangle([3, 13, 4, 14], fill=c)
    elif name == "fish":                     # 鱼
        d.ellipse([2, 5, 11, 11], fill=c)
        d.polygon([(11, 5), (14, 8), (11, 11)], fill=c)
        d.rectangle([4, 7, 5, 7], fill=CREAM)
    elif name == "nuts":                     # 坚果（核桃）
        d.ellipse([3, 3, 12, 12], fill=c)
        d.rectangle([7, 4, 8, 11], fill=CREAM)
        d.rectangle([7, 7, 8, 8], fill=c)
    elif name == "oil":                      # 油瓶
        d.rectangle([6, 2, 9, 3], fill=c)
        d.rectangle([7, 4, 8, 5], fill=c)
        d.rectangle([5, 6, 10, 13], fill=c)
        d.rectangle([6, 9, 9, 12], fill=CREAM)
    elif name == "spice":                    # 天然香料（星形）
        d.rectangle([7, 2, 8, 13], fill=c)
        d.rectangle([2, 7, 13, 8], fill=c)
        d.rectangle([4, 4, 5, 5], fill=c)
        d.rectangle([10, 4, 11, 5], fill=c)
        d.rectangle([4, 10, 5, 11], fill=c)
        d.rectangle([10, 10, 11, 11], fill=c)
    elif name == "protein":                  # 优质蛋白（蛋）
        d.ellipse([3, 3, 12, 14], fill=c)
        d.rectangle([7, 6, 8, 6], fill=CREAM)
    elif name == "fruitvc":                  # 富含 VC 水果（橙子）
        d.ellipse([2, 4, 12, 14], fill=c)
        d.rectangle([5, 6, 6, 6], fill=CREAM)
        d.ellipse([9, 1, 13, 4], fill=c)
    else:
        raise ValueError("unknown icon: " + name)


ICONS = ["water", "fire", "moon", "muscle", "home", "chart", "trophy", "user",
         "crown", "plus", "minus", "check", "edit", "invite", "lock", "back",
         "berry", "leafy", "fish", "nuts", "oil", "spice", "protein", "fruitvc"]


def gen_icons():
    os.makedirs(ICON_DIR, exist_ok=True)
    for name in ICONS:
        for suffix, color in (("", INK), ("-w", CREAM)):
            img, d = canvas(16, 16)
            draw_icon(name, d, color)
            save(img, os.path.join(ICON_DIR, f"{name}{suffix}.png"), 3)


# ---------------------------------------------------------------- 头像
AVATARS = [
    ("a01", "#7A4B26", "#E0654A", "#F7CDA4"),
    ("a02", "#2F2A26", "#3C97D4", "#F7CDA4"),
    ("a03", "#8B5E3C", "#FFC845", "#F0C29B"),
    ("a04", "#4A2E18", "#4FA83D", "#E8B48C"),
    ("a05", "#A9713A", "#7B5EA7", "#F7CDA4"),
    ("a06", "#33251C", "#D9542B", "#D9A075"),
    ("a07", "#6B4020", "#FFF9E8", "#F7CDA4"),
    ("a08", "#5A3A20", "#5E3C22", "#C98A5F"),
]


def gen_avatars():
    os.makedirs(AVATAR_DIR, exist_ok=True)
    for key, hair, shirt, skin in AVATARS:
        img, d = canvas(12, 12)
        d.rectangle([1, 1, 10, 2], fill=hair)
        d.rectangle([0, 3, 1, 8], fill=hair)
        d.rectangle([10, 3, 11, 8], fill=hair)
        d.rectangle([2, 3, 9, 8], fill=skin)
        d.rectangle([3, 5, 4, 6], fill="#3B2416")
        d.rectangle([7, 5, 8, 6], fill="#3B2416")
        d.rectangle([5, 7, 6, 7], fill="#B4544A")
        d.rectangle([1, 9, 10, 11], fill=shirt)
        save(img, os.path.join(AVATAR_DIR, f"{key}.png"), 6)


# ---------------------------------------------------------------- 开屏小人
W, H = 25, 35
PAL = {
    "hair": "#7A4B26", "hair_d": "#5F3A1D",
    "skin": "#F7CDA4", "skin_d": "#E0A87C",
    "eye": "#3B2416", "white": "#FFFFFF",
    "blush": "#F29B94", "mouth": "#B4544A",
    "shirt": "#E0654A", "shirt_d": "#C24E38",
    "shorts": "#3F6FA8", "shorts_d": "#2E5480",
    "shoe": "#4A2E18",
    "db": "#9AA3AA", "db_d": "#6E767C",
    "gold": "#FFC845",
    "shadow": (58, 36, 20, 90),
}


def draw_sprite(hand_y, sparkle=False):
    img, d = canvas(W, H)
    p = PAL
    # 地面阴影
    d.rectangle([6, 31, 18, 32], fill=p["shadow"])
    # 头发（顶部 + 刘海锯齿 + 两侧）
    d.rectangle([7, 2, 17, 2], fill=p["hair"])
    d.rectangle([6, 3, 18, 6], fill=p["hair"])
    d.rectangle([6, 7, 7, 13], fill=p["hair"])
    d.rectangle([17, 7, 18, 13], fill=p["hair"])
    for x0, x1 in ((7, 9), (11, 12), (14, 16)):
        d.rectangle([x0, 7, x1, 7], fill=p["hair"])
    # 脸
    d.rectangle([8, 7, 16, 13], fill=p["skin"])
    d.rectangle([7, 9, 7, 10], fill=p["skin"])
    d.rectangle([17, 9, 17, 10], fill=p["skin"])
    # 下巴收窄
    d.rectangle([8, 13, 8, 13], fill=(0, 0, 0, 0))
    d.rectangle([16, 13, 16, 13], fill=(0, 0, 0, 0))
    # 眼睛（2×2 瞳孔 + 1px 高光）
    d.rectangle([9, 9, 10, 10], fill=p["eye"])
    d.rectangle([14, 9, 15, 10], fill=p["eye"])
    d.rectangle([9, 9, 9, 9], fill=p["white"])
    d.rectangle([14, 9, 14, 9], fill=p["white"])
    # 腮红 + 嘴
    d.rectangle([8, 11, 8, 11], fill=p["blush"])
    d.rectangle([16, 11, 16, 11], fill=p["blush"])
    d.rectangle([11, 12, 13, 12], fill=p["mouth"])
    # 脖子
    d.rectangle([11, 14, 13, 14], fill=p["skin_d"])
    # 躯干
    d.rectangle([7, 15, 17, 21], fill=p["shirt"])
    d.rectangle([11, 15, 13, 15], fill=p["skin_d"])
    d.rectangle([7, 22, 17, 22], fill=p["shirt_d"])
    # 肩袖
    d.rectangle([5, 16, 7, 18], fill=p["shirt"])
    d.rectangle([17, 16, 19, 18], fill=p["shirt"])
    # 手臂（从肩到手腕）
    for ax in (5, 18):
        top = 19
        if hand_y > top:
            d.rectangle([ax, top, ax + 1, hand_y - 1], fill=p["skin"])
        d.rectangle([ax, hand_y, ax + 1, hand_y + 1], fill=p["skin_d"])
    # 哑铃：杆 + 两侧配重片
    for ax in (5, 18):
        cx = ax + 1
        d.rectangle([cx - 2, hand_y + 1, cx + 1, hand_y + 1], fill=p["db_d"])
        d.rectangle([cx - 4, hand_y, cx - 3, hand_y + 2], fill=p["db"])
        d.rectangle([cx + 2, hand_y, cx + 3, hand_y + 2], fill=p["db"])
    # 短裤
    d.rectangle([7, 23, 17, 24], fill=p["shorts"])
    d.rectangle([12, 23, 12, 24], fill=p["shorts_d"])
    # 腿
    d.rectangle([8, 25, 10, 26], fill=p["skin"])
    d.rectangle([14, 25, 16, 26], fill=p["skin"])
    # 鞋
    d.rectangle([7, 27, 10, 27], fill=p["shoe"])
    d.rectangle([14, 27, 17, 27], fill=p["shoe"])
    # 顶点星芒
    if sparkle:
        for x, y in ((2, 13), (1, 14), (3, 14), (2, 15), (22, 13), (21, 14), (23, 14), (22, 15)):
            d.rectangle([x, y, x, y], fill=p["gold"])
    return img


def gen_sprite():
    os.makedirs(SPLASH_DIR, exist_ok=True)
    frames = [draw_sprite(24), draw_sprite(21), draw_sprite(18, sparkle=True)]
    sheet = Image.new("RGBA", (W * 3, H), (0, 0, 0, 0))
    for i, f in enumerate(frames):
        sheet.paste(f, (i * W, 0))
    save(sheet, os.path.join(SPLASH_DIR, "hero-3f.png"), 2)   # 50×70 / 帧
    # 单帧另存，方便当分享卡封面
    save(frames[2], os.path.join(SPLASH_DIR, "hero-cover.png"), 6)


if __name__ == "__main__":
    gen_icons()
    gen_avatars()
    gen_sprite()
    print("icons:", len(os.listdir(ICON_DIR)))
    print("avatars:", len(os.listdir(AVATAR_DIR)))
    print("splash:", os.listdir(SPLASH_DIR))
