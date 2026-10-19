# -*- coding: utf-8 -*-
"""生成 144×144 微信小程序头像。

要点：
- 复用 tools/gen_assets.py 的 25×35 网格小人，从网格**重新绘制**，
  绝不缩放已有 PNG（150×210 → 144 不是整数倍，会产生半像素模糊）。
- 每个像素块严格对齐整数网格，NEAREST 放大，零抗锯齿。
用法：python tools/gen_icon.py
"""
import os
import sys

from PIL import Image, ImageDraw

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import gen_assets as G

OUT_DIR = os.path.join(G.ROOT, "assets", "brand")
SIZE = 144

CREAM = "#FFF9E8"        # 与 App 内 --cream 同值


def hero(drop_shadow=False):
    """取一帧小人（举哑铃 + 星芒），去掉 splash 里的地面阴影条。"""
    sp = G.draw_sprite(18, sparkle=True)
    if drop_shadow is False:
        ImageDraw.Draw(sp).rectangle(
            [0, 29, sp.width - 1, sp.height - 1], fill=(0, 0, 0, 0)
        )
    return sp


def stamp(bg, sp, scale, crop=None, y_bias=0.5, bleed_bottom=False):
    """把网格 sprite 按整数倍放大后，按内容包围盒居中贴到 bg。"""
    if crop:
        sp = sp.crop(crop)
    sp = sp.resize((sp.width * scale, sp.height * scale), Image.NEAREST)
    bbox = sp.getbbox()
    if bbox:
        sp = sp.crop(bbox)
    x = (bg.width - sp.width) // 2
    if bleed_bottom:
        y = bg.height - sp.height
    else:
        y = int((bg.height - sp.height) * y_bias)
    bg.alpha_composite(sp, (x, max(0, y)))
    return bg


def frame(bg, bw, color):
    """整数格描边（当前版本未启用，留作后续做徽章变体）。"""
    ImageDraw.Draw(bg).rectangle(
        [0, 0, bg.width - 1, bg.height - 1], outline=color, width=bw
    )
    return bg


# ---------------------------------------------------------------- 主推：麦白全身
def v_cream():
    bg = Image.new("RGBA", (SIZE, SIZE), CREAM)
    stamp(bg, hero(), 4, y_bias=0.5)
    return bg


# ---------------------------------------------------------------- 半身：底部出血
def v_portrait():
    """头肩特写，躯干切到画布底边（出血），小尺寸最清晰。"""
    bg = Image.new("RGBA", (SIZE, SIZE), CREAM)
    # 裁 x 1..24、y 1..23：含完整哑铃杆与躯干，6 倍放大 = 138×132
    stamp(bg, hero(), 6, crop=(1, 1, 24, 23), bleed_bottom=True)
    return bg


# 已弃用（保留说明，避免以后重复踩坑）：
# - 深木底 #4A2E18：人物头发 #7A4B26 与底色明度太近，头发会糊进背景。
# - 浅麦底 + 8px 细框：边框在 144px 下占掉 16px，人物被迫缩小，小尺寸发糊。
VARIANTS = [
    ("icon-144", v_cream, "麦白底 · 全身（主推）"),
    ("icon-144-portrait", v_portrait, "麦白底 · 半身特写"),
]


def compare(path):
    """对照图：144 原大 + 64/40/28 圆角缩小样张（模拟微信圆角遮罩）。"""
    pad, bgc = 14, (238, 234, 226, 255)
    tw, top_h = 190, 166
    sheet = Image.new("RGBA", (tw * len(VARIANTS), top_h + 112), bgc)
    dr = ImageDraw.Draw(sheet)
    labels = ["A full-body", "B portrait"]
    for i, (name, fn, _) in enumerate(VARIANTS):
        img = fn().convert("RGBA")
        x0 = i * tw + pad
        sheet.alpha_composite(img, (x0, pad))
        dr.text((x0, top_h - 4), labels[i], fill=(90, 74, 58))
        for j, s in enumerate((64, 40, 28)):
            small = img.resize((s, s), Image.LANCZOS)
            mask = Image.new("L", (s, s), 0)
            ImageDraw.Draw(mask).rounded_rectangle(
                [0, 0, s - 1, s - 1], radius=max(2, s // 5), fill=255
            )
            sheet.paste(small, (x0 + j * 72, top_h + 18), mask)
    sheet.save(path)


def main():
    os.makedirs(OUT_DIR, exist_ok=True)
    for name, fn, _ in VARIANTS:
        img = fn().convert("RGBA")
        img.save(os.path.join(OUT_DIR, name + ".png"))
        assert img.size == (SIZE, SIZE), img.size
        print(f"{name}.png  {img.size[0]}x{img.size[1]}")
    compare(os.path.join(OUT_DIR, "_compare.png"))


if __name__ == "__main__":
    main()
