#!/usr/bin/env python3
"""按项目字符集把苹方 TTF 子集化并转成 woff2。

为什么需要这个脚本
------------------
`public/fonts/` 里的三个字重(Regular / Medium / Semibold)是上游
https://github.com/refinec/PingFangSC 的 ttf/*.ttf 按**项目实际字符集**裁剪后的产物:
上游单个字重 10.4MB, 裁剪后 1.1MB woff2, 三个字重合计约 3.5MB(原先只带一个字重就有 5.2MB)。
界面文案调整后若出现了子集之外的生僻字, 重新跑一次即可。

字符集
------
1. GB2312 全集(6763 汉字 + 全角标点 + 拉丁/希腊/西里尔字母);
2. `src/` 下所有源码与语言包出现过的字符(保证界面文案一个都不缺);
3. 常用符号区(箭头、带圈数字、几何符号、℃ 等)。
生僻字(GB2312 之外)不在子集内, 会回退到字体栈的下一个族。

依赖
----
- Python 3 + fonttools(brotli 用于 woff2 压缩)。若本机没有 Python 版 brotli,
  把 `scripts/fonts/shim/` 放到 `PYTHONPATH` 最前面即可: 那里的 `brotli.py` 会把
  compress/decompress 转发给 Node 内置 brotli(Node 自带), 产物同样是标准 woff2。

用法
----
    python3 scripts/fonts/build-pingfang-subset.py            # 生成到 public/fonts/
    python3 scripts/fonts/build-pingfang-subset.py --out DIR  # 生成到别处先比对
"""
from __future__ import annotations

import argparse
import pathlib
import sys

ROOT = pathlib.Path(__file__).resolve().parents[2]
WEIGHTS = ("Regular", "Medium", "Semibold")
# 上游按字重拆分的 TTF 下载地址(HEAD 指向最新提交, 冻结版本见 PingFangSC-LICENSE.txt)
UPSTREAM = "https://raw.githubusercontent.com/refinec/PingFangSC/HEAD/ttf/PingFangSC-{weight}.ttf"


def build_charset(source_root: pathlib.Path) -> set[str]:
    chars: set[str] = set()
    # 1) GB2312 全集
    for high in range(0xA1, 0xFA):
        for low in range(0xA1, 0xFF):
            try:
                chars.add(bytes([high, low]).decode("gb2312"))
            except UnicodeDecodeError:
                pass
    # 2) 项目源码用字
    for path in source_root.rglob("*"):
        if path.is_file() and path.suffix in {".ts", ".tsx", ".css", ".json", ".html"}:
            try:
                chars.update(path.read_text(encoding="utf-8"))
            except (UnicodeDecodeError, OSError):
                pass
    # 3) 常用符号区
    for start, end in [
        (0x20, 0x7F), (0xA0, 0x100), (0x2000, 0x2070), (0x2100, 0x2140),
        (0x2190, 0x2200), (0x2460, 0x2500), (0x25A0, 0x2600), (0x2600, 0x2700),
        (0x3000, 0x3040), (0xFF00, 0xFFF0),
    ]:
        chars.update(chr(code) for code in range(start, end))
    return chars


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--out", default=str(ROOT / "public" / "fonts"))
    parser.add_argument("--keep-ttf", default="/tmp/pingfang-ttf")
    args = parser.parse_args()

    try:
        from fontTools import subset
        from fontTools.ttLib import TTFont
    except ImportError:
        print("缺少 fonttools: pip install fonttools brotli", file=sys.stderr)
        return 1

    out_dir = pathlib.Path(args.out)
    out_dir.mkdir(parents=True, exist_ok=True)
    ttf_dir = pathlib.Path(args.keep_ttf)
    ttf_dir.mkdir(parents=True, exist_ok=True)

    charset = build_charset(ROOT / "src")
    charset_file = ttf_dir / "charset.txt"
    charset_file.write_text("".join(sorted(charset)), encoding="utf-8")
    print(f"字符集: {len(charset)} 个字符 → {charset_file}")

    for weight in WEIGHTS:
        ttf = ttf_dir / f"PingFangSC-{weight}.ttf"
        if not ttf.exists():
            import urllib.request

            url = UPSTREAM.format(weight=weight)
            print(f"下载 {url}")
            urllib.request.urlretrieve(url, ttf)  # noqa: S310 - 固定上游地址
        target = out_dir / f"PingFangSC-{weight}.woff2"
        subset.main([
            str(ttf), f"--text-file={charset_file}",
            "--layout-features=*", "--glyph-names", "--symbol-cmap", "--legacy-cmap",
            "--notdef-glyph", "--notdef-outline", "--recommended-glyphs",
            "--name-IDs=*", "--name-legacy", "--name-languages=*",
            f"--output-file={target}", "--flavor=woff2",
        ])
        font = TTFont(target)
        cmap = font.getBestCmap()
        missing = [c for c in "苹方吨位规格材质合计品牌剩余已开未开" if ord(c) not in cmap]
        print(
            f"{weight}: {target.stat().st_size / 1024 / 1024:.2f} MB, "
            f"字形 {font['maxp'].numGlyphs}, 关键字符缺失 {missing or '无'}",
        )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
