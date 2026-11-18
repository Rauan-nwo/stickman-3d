# -*- coding: utf-8 -*-
"""Энергии по блокам 10 мс для микса, голоса (vocals) и остатка (no_vocals) → tmp/blocks.npz.

Для каждой дорожки: K-взвешенная мощность (сумма каналов, как в BS.1770), мощность mid=(L+R)/2 и side,
мощности mid в октавных полосах 31.5 Гц … 16 кГц и в полосах 1-4 кГц и < 120 Гц.
Любое окно, кратное 10 мс, потом считается скользящей суммой — один проход по 20 минутам звука.
"""
from scipy import signal

from common import *

BLK = 0.01
B = int(BLK * SR)
OCT = [31.5, 63, 125, 250, 500, 1000, 2000, 4000, 8000, 16000]


def blocks_of(v):
    n = len(v) // B
    return (np.asarray(v[:n * B], np.float64) ** 2).reshape(n, B).mean(1)


def bands():
    out = []
    for fc in OCT:
        lo, hi = fc / np.sqrt(2), min(fc * np.sqrt(2), SR / 2 * 0.98)
        out.append((f"oct{int(fc) if fc >= 63 else fc}", signal.butter(4, [lo, hi], "band", fs=SR, output="sos")))
    out.append(("b1k_4k", signal.butter(4, [1000, 4000], "band", fs=SR, output="sos")))
    out.append(("lt120", signal.butter(4, 120, "low", fs=SR, output="sos")))
    return out


if __name__ == "__main__":
    BANDS = bands()
    res = {}
    for name, path in (("mix", MIX_WAV), ("voc", VOC_WAV), ("res", RES_WAV)):
        x = load_wav(path).astype(np.float64)
        y = k_weight(x)
        res[f"{name}_k"] = blocks_of(y[:, 0]) + blocks_of(y[:, 1])
        del y
        mid = (x[:, 0] + x[:, 1]) / 2
        side = (x[:, 0] - x[:, 1]) / 2
        del x
        res[f"{name}_mid"] = blocks_of(mid)
        res[f"{name}_side"] = blocks_of(side)
        del side
        for bn, sos in BANDS:
            res[f"{name}_{bn}"] = blocks_of(signal.sosfilt(sos, mid))
        del mid
        print(name, "done", len(res[f"{name}_k"]))
    res["blk"] = np.array(BLK)
    res["oct"] = np.array(OCT)
    np.savez_compressed(os.path.join(TMP, "blocks.npz"), **res)
    print("saved")
