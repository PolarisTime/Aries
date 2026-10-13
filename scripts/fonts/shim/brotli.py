"""最小的 brotli 兼容层: fontTools 只用到 compress/decompress, 这里转交给 Node 内置 brotli。

用法(本机没有 Python 版 brotli 时, 把本目录放到 PYTHONPATH 最前面即可被 fontTools 当作 brotli):

    PYTHONPATH=scripts/fonts/shim python3 scripts/fonts/build-pingfang-subset.py

本机没有任何 Python brotli 模块(且 pip 出网被拦截), 而 Node 自带 brotli 编解码器,
因此构建期用子进程转发一次即可 —— 产物是标准 woff2, 与官方 brotli 输出等价。
仅构建用, 不进仓库。
"""
from __future__ import annotations

import pathlib
import subprocess
import tempfile

MODE_GENERIC = 0
MODE_TEXT = 1
MODE_FONT = 2

_NODE_FLAGS = {
    'c': "z.constants.BROTLI_PARAM_MODE",
    'q': "z.constants.BROTLI_PARAM_QUALITY",
    'w': "z.constants.BROTLI_PARAM_LGWIN",
}


def _node(action: str, data: bytes, mode: int = MODE_GENERIC, quality: int = 11, lgwin: int = 24) -> bytes:
    with tempfile.TemporaryDirectory() as tmp:
        src = pathlib.Path(tmp) / "in.bin"
        dst = pathlib.Path(tmp) / "out.bin"
        src.write_bytes(data)
        if action == "compress":
            call = (
                f"z.brotliCompressSync(b,{{params:{{"
                f"[{_NODE_FLAGS['c']}]:{mode},[{_NODE_FLAGS['q']}]:{quality},"
                f"[{_NODE_FLAGS['w']}]:{lgwin}}}}})"
            )
        else:
            call = "z.brotliDecompressSync(b)"
        script = (
            "const fs=require('fs'),z=require('zlib');"
            f"const b=fs.readFileSync({str(src)!r});"
            f"fs.writeFileSync({str(dst)!r},{call});"
        )
        subprocess.run(["node", "-e", script], check=True, capture_output=True)
        return dst.read_bytes()


def compress(data: bytes, mode: int = MODE_GENERIC, quality: int = 11, lgwin: int = 24, **_: object) -> bytes:
    return _node("compress", data, mode=mode, quality=quality, lgwin=lgwin)


def decompress(data: bytes, **_: object) -> bytes:
    return _node("decompress", data)
