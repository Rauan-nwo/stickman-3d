# -*- coding: utf-8 -*-
"""Сверка 3D-планов L001 с рисованным миром: кадр (1920x1080) рядом с рисованным фоном того же типа, полный размер.
python compare_painted.py <scene> -> <scene>/out/compare_<shot>.jpg + таблица метрик (stdout).
Метрики — только ориентир (тон и палитра), не «похожесть стиля»: средняя яркость, насыщенность, пересечение гистограмм
яркости (16 корзин) и цвета (8x8x8). Итоговую оценку сходства ставит человек по парам кадров."""
import os, sys, subprocess
import numpy as np
from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
L001 = os.path.join(HERE, '..')
A = os.path.join(L001, 'assets')
PAIRS = {
    'conveyor': [('1.4', 'approach', os.path.join(HERE, 'conveyor', 'assets', 'plate_lab_v2.png')), ('2.4', 'stamp1', os.path.join(A, 'bg_megaspeed_reverse.png')),
                 ('5.4', 'stamp2', os.path.join(A, 'bg_megaspeed_reverse.png')), ('8.6', 'stamp3', os.path.join(A, 'bg_megaspeed_reverse.png'))],
    'hq_corridor': [('0.3', 'start', os.path.join(A, 'bg_nvidia_office_reverse.png')), ('3.5', 'mid', os.path.join(A, 'bg_nvidia_office_reverse.png')),
                    ('5.6', 'door', os.path.join(A, 'bg_nvidia_office_reverse.png')), ('end', 'end', os.path.join(A, 'bg_nvidia_office_dry.png'))],
    'dc_inspection': [('0.4', '180doors', os.path.join(L001, 'scenes', 'box_path_painted', 'raw', 'bg_datacenter.png')),
                      ('3.5', '180beam', os.path.join(L001, 'scenes', 'box_path_painted', 'raw', 'bg_datacenter.png')),
                      ('7.6', '182wrap', os.path.join(L001, 'scenes', 'box_path_painted', 'raw', 'bg_datacenter.png')),
                      ('10.5', '183w', os.path.join(L001, 'scenes', 'box_path_painted', 'raw', 'bg_datacenter.png'))],
}

def grab(mp4, t, out):
    pre = ['-sseof', '-0.05'] if t == 'end' else ['-ss', t]
    subprocess.run(['ffmpeg', '-loglevel', 'error', '-y', *pre, '-i', mp4, '-frames:v', '1', out], check=True)

def stats(im):
    a = np.asarray(im.convert('RGB').resize((480, 270)), np.float32)
    y = a @ [.299, .587, .114]; sat = a.max(-1) - a.min(-1)
    hy = np.histogram(y, 16, (0, 256))[0] / y.size
    q = (a // 32).astype(int); hc = np.bincount((q[..., 0] * 64 + q[..., 1] * 8 + q[..., 2]).ravel(), minlength=512) / y.size
    return y.mean(), sat.mean(), hy, hc

scene = sys.argv[1]
mp4 = os.path.join(HERE, scene, 'out', f'{scene}.mp4')
print(f'{"shot":10} {"t":>5}  luma ours/ref   sat ours/ref   hist-luma  hist-colour')
for t, name, ref in PAIRS[scene]:
    fr = os.path.join(HERE, scene, 'out', f'_f_{name}.png'); grab(mp4, t, fr)
    a = Image.open(fr).convert('RGB').resize((1920, 1080)); b = Image.open(ref).convert('RGB').resize((1920, 1080), Image.LANCZOS)
    sa, sb = stats(a), stats(b)
    li = np.minimum(sa[2], sb[2]).sum(); ci = np.minimum(sa[3], sb[3]).sum()
    print(f'{name:10} {t:>5}  {sa[0]:5.1f}/{sb[0]:5.1f}   {sa[1]:5.1f}/{sb[1]:5.1f}   {li:6.2f}     {ci:6.2f}')
    c = Image.new('RGB', (3840, 1080)); c.paste(a, (0, 0)); c.paste(b, (1920, 0))
    c.save(os.path.join(HERE, scene, 'out', f'compare_{name}.jpg'), quality=88); os.remove(fr)
