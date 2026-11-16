// conf.js: данные шаблонов аниматика L001 по номерам планов (карта, доска, цифра, документ, подписи).
// Карточки (T-card) и титры (T-title) берутся прямо из шотлиста (timing.json) — здесь их нет.
// Каждая запись — функция длительности плана d (с) -> опции шаблона. Времена событий — доли d.

export const NUMBERS = {
  50: d => ({ from: '1', to: '1', strike: false, label: 'MONTH OF CASH LEFT', sub: '1997 · ONE MORE MONTH OF SALARIES', at: d * .25, countDur: d * .3 }),
  67: d => ({ from: '#10', to: '#1', strike: false, label: 'MOST VALUABLE COMPANY IN THE WORLD', sub: 'NVIDIA', at: d * .2, countDur: d * .35 }),
  81: d => ({ from: '2025', to: '2025', strike: false, label: 'APRIL', sub: 'BLOCKED AS WELL', at: d * .35, countDur: d * .25 }),
  86: d => ({ from: '95%', to: '0%', label: "NVIDIA'S SHARE OF CHINA'S AI CHIP MARKET", at: d * .5, countDur: d * .3 }),
  125: d => ({ from: '$0', to: '$33 MILLION', label: 'MEGASPEED · ASSETS', sub: 'END OF 2023', at: d * .3, countDur: d * .35 }),
  151: d => ({ from: '$33 MILLION', to: '$3 BILLION', label: 'MEGASPEED · ASSETS', sub: 'END OF 2024', at: d * .3, countDur: d * .35 }),
  177: d => ({ from: '$0', to: '$2 BILLION', label: 'NEARLY', sub: "OF NVIDIA'S MOST ADVANCED CHIPS", at: d * .3, countDur: d * .35 }),
  196: d => ({ from: '0%', to: '15%', label: "THE GOVERNMENT'S CUT", sub: 'AUGUST', at: d * .4, countDur: d * .3 }),
  207: d => ({ from: '$0', to: '$50 BILLION', label: "CHINA'S AI MARKET", at: d * .3, countDur: d * .35 }),
  262: d => ({ from: '0%', to: '-13%', label: 'NVDA', sub: 'THAT DAY', at: d * .25, countDur: d * .3 }),
};

// карта: данные mapData.js есть только для Восточной и ЮВ Азии — Америка за правым краем кадра (подписи со стрелкой)
export const MAPS = {
  29: d => ({ view: { c: [150, 28], span: 90 }, focus: [150, 30],
    labels: [{ text: 'TAIWAN', at: [121, 21.2], size: 26 }, { text: 'PACIFIC OCEAN', at: [160, 18], size: 30, color: 'rgba(127,184,255,.45)' }],
    pins: [{ id: 'tw', label: 'TAIWAN', at: 'taipei', t0: d * .05 }, { id: 'ky', label: 'ONEIDA, KENTUCKY →', at: [190, 37], t0: d * .75, side: -1 }],
    routes: [{ from: 'taipei', to: [190, 37], t0: d * .12, t1: d * .7, bend: -.25 }] }),
  111: d => ({ view: { c: [106, 3], span: 30 }, focus: [105, 0],
    labels: [{ text: 'MALAYSIA', at: [102.3, 4.6], size: 30 }, { text: 'INDONESIA', at: [110, -3.4], size: 30 }],
    pins: [{ id: 'my', label: 'MALAYSIA', at: 'kualaLumpur', t0: d * .15, side: -1 }, { id: 'id', label: 'INDONESIA', at: 'jakarta', t0: d * .45 }] }),
  113: d => ({ view: { c: [108, 10], span: 60 }, focus: [106, 14], labels: [{ text: 'CHINA', at: [111.5, 24.2], size: 44 }],
    pins: [{ id: 'my', label: 'DATA CENTERS', at: 'kualaLumpur', t0: 0, side: -1 }, { id: 'id', label: 'DATA CENTERS', at: 'jakarta', t0: 0 }],
    routes: [{ from: [112, 26], to: 'kualaLumpur', t0: d * .15, t1: d * .55, bend: .2 }, { from: [113, 26], to: 'jakarta', t0: d * .3, t1: d * .7, bend: -.15 }],
    border: { id: 'china', t0: d * .75 } }),
  161: d => ({ view: { c: [150, 15], span: 100 }, focus: [140, 12],
    labels: [{ text: 'PACIFIC OCEAN', at: [160, 22], size: 30, color: 'rgba(127,184,255,.45)' }],
    pins: [{ id: 'ca', label: '← AIVRES · CALIFORNIA', at: [196, 30], t0: d * .05, side: -1 }, { id: 'my', label: 'MALAYSIA', at: 'kualaLumpur', t0: d * .75 }],
    routes: [{ from: [196, 30], to: 'kualaLumpur', t0: d * .15, t1: d * .7, bend: .2 }] }),
  187: d => ({ view: { c: [110, 10], span: 60 }, focus: [106, 8], labels: [{ text: 'CHINA', at: [111.5, 24.2], size: 44 }],
    pins: [{ id: 'sg', label: 'SINGAPORE', at: 'singapore', t0: d * .35 }, { id: 'my', label: 'MALAYSIA', at: 'kualaLumpur', t0: d * .45, side: -1 }],
    routes: [{ from: [136, 6], to: 'singapore', t0: d * .05, t1: d * .35, bend: .15 }, { from: [136, 9], to: 'kualaLumpur', t0: d * .15, t1: d * .45, bend: -.1 }],
    border: { id: 'china', t0: d * .7 } }),
  232: d => ({ view: { c: [150, 33], span: 100 }, focus: [130, 36],
    labels: [{ text: 'CHINA', at: [108, 33], size: 44 }, { text: 'PACIFIC OCEAN', at: [165, 25], size: 30, color: 'rgba(127,184,255,.45)' }],
    pins: [{ id: 'dc', label: '← WASHINGTON', at: [196, 38], t0: d * .05, side: -1 }, { id: 'bj', label: 'BEIJING', at: [116.4, 39.9], t0: d * .75 }],
    routes: [{ from: [196, 38], to: [116.4, 39.9], t0: d * .12, t1: d * .72, bend: -.18 }] }),
};

export const BOARDS = {
  63: d => ({ items: [
      { id: 'cuda', kind: 'label', x: 520, y: 300, w: 300, h: 76, rot: -.04, title: 'CUDA · 2006' },
      { id: 'math', kind: 'note', x: 470, y: 640, w: 330, h: 230, rot: .05, title: 'THE MATH', lines: ['THOUSANDS OF COOKS', 'AT ONCE'] },
      { id: 'ai', kind: 'label', x: 1420, y: 470, w: 380, h: 90, rot: .04, title: 'AI', color: '#e9d27a' },
      { id: 'labs', kind: 'note', x: 1360, y: 770, w: 360, h: 220, rot: -.05, title: 'EVERY AI LAB', lines: ['WANTS NVIDIA CHIPS'] }],
    strings: [{ from: 'cuda', to: 'math', t0: d * .35, t1: d * .5 }, { from: 'math', to: 'ai', t0: d * .5, t1: d * .65 }, { from: 'ai', to: 'labs', t0: d * .65, t1: d * .8 }],
    circle: { id: 'ai', t0: d * .8, dur: .6, pad: 30 } }),
  145: d => ({ items: [{ id: 'photo', kind: 'photo', x: 960, y: 520, w: 420, h: 360, rot: -.05, title: 'COMPUTEX PARTY · JUNE 2024' }],
    strings: [], circle: { id: 'photo', t0: d * .75, dur: .6, pad: 30 }, focus: [960, 520] }),
  159: d => ({ items: [
      { id: 'inspur', kind: 'label', x: 560, y: 360, w: 380, h: 90, rot: -.03, title: 'INSPUR · CHINA' },
      { id: 'black', kind: 'note', x: 560, y: 700, w: 340, h: 220, rot: .05, title: 'US TRADE', lines: ['BLACKLIST'] },
      { id: 'aivres', kind: 'label', x: 1400, y: 470, w: 440, h: 90, rot: .04, title: 'AIVRES · CALIFORNIA', color: '#e9d27a' }],
    strings: [{ from: 'inspur', to: 'black', t0: d * .2, t1: d * .35 }, { from: 'inspur', to: 'aivres', t0: d * .45, t1: d * .65 }],
    circle: { id: 'aivres', t0: d * .75, dur: .6, pad: 30 } }),
  216: d => ({ items: [
      { id: 'mega', kind: 'label', x: 420, y: 470, w: 400, h: 90, rot: -.04, title: 'MEGASPEED', color: '#e9d27a' },
      { id: 'sen', kind: 'note', x: 960, y: 360, w: 360, h: 220, rot: .04, title: 'SENATE', lines: ['SEN. TOM COTTON'] },
      { id: 'com', kind: 'label', x: 1480, y: 560, w: 420, h: 90, rot: .03, title: 'COMMERCE DEPT.' }],
    strings: [{ from: 'mega', to: 'sen', t0: d * .2, t1: d * .45 }, { from: 'sen', to: 'com', t0: d * .5, t1: d * .75 }],
    circle: { id: 'mega', t0: d * .8, dur: .5, pad: 30 } }),
  218: d => ({ items: [
      { id: 'mega', kind: 'label', x: 420, y: 470, w: 400, h: 90, rot: -.04, title: 'MEGASPEED', color: '#e9d27a' },
      { id: 'sen', kind: 'note', x: 960, y: 360, w: 360, h: 220, rot: .04, title: 'SENATE', lines: ['SEN. TOM COTTON'] },
      { id: 'com', kind: 'label', x: 1480, y: 560, w: 420, h: 90, rot: .03, title: 'COMMERCE DEPT.' },
      { id: 'jus', kind: 'label', x: 1180, y: 860, w: 420, h: 90, rot: -.03, title: 'JUSTICE DEPT.', color: '#e9d27a' }],
    strings: [{ from: 'mega', to: 'sen', t0: 0, t1: .01 }, { from: 'sen', to: 'com', t0: 0, t1: .01 }, { from: 'com', to: 'jus', t0: d * .25, t1: d * .55 }],
    circle: { id: 'jus', t0: d * .6, dur: .6, pad: 30 } }),
  250: d => ({ items: [
      { id: 'calls', kind: 'note', x: 420, y: 380, w: 340, h: 220, rot: -.05, title: 'THE CALLS', lines: ['SURVEILLANCE'] },
      { id: 'memo', kind: 'label', x: 960, y: 300, w: 300, h: 80, rot: .03, title: 'THE MEMO' },
      { id: 'wh', kind: 'label', x: 1480, y: 420, w: 400, h: 90, rot: .04, title: 'THE WHITE HOUSE', color: '#e9d27a' },
      { id: 'jensen', kind: 'photo', x: 980, y: 760, w: 260, h: 300, rot: .05, title: 'J. HUANG' }],
    strings: [{ from: 'calls', to: 'memo', t0: d * .15, t1: d * .35 }, { from: 'memo', to: 'wh', t0: d * .4, t1: d * .6 }],
    circle: { id: 'jensen', t0: d * .72, dur: .6, pad: 30 } }),
};

export const DOCS = {
  121: d => ({ org: 'MEGASPEED INTERNATIONAL', title: 'SERVICE AGREEMENT', fields: [['SERVICE', 'CLOUD COMPUTING (RENTAL)'], ['TERM', 'BY THE HOUR / BY THE YEAR']],
    lines: ['Customer rents computing power', 'over the internet.', 'Hardware remains in Malaysia.', 'No chips are exported.', 'The company follows the law.'],
    highlight: [2, 3], stamp: 'APPROVED', stampAt: d * .2, hlAt: d * .45, hlStep: d * .12 }),
  178: d => ({ org: 'TRADE RECORDS', title: 'SHIPMENT LOG', fields: [['CONTENTS', 'AI SERVERS · NVIDIA INSIDE'], ['TO', 'MEGASPEED']],
    lines: ['AI EQUIPMENT, NVIDIA INSIDE', 'SHIPPED TO: MEGASPEED', '.........................', 'TOTAL: MORE THAN $4.8 BILLION'],
    highlight: [3], stamp: null, hlAt: d * .6, hlStep: d * .1 }),
  224: d => ({ org: 'DEPARTMENT OF STATE', title: 'MEMORANDUM', fields: [['TO', 'THE WHITE HOUSE'], ['RE', 'ALICE HUANG / MEGASPEED']],
    lines: ['Source: electronic surveillance', 'of [[the subject]] and associates.'], sign: 'MARCO RUBIO — SECRETARY OF STATE',
    stamp: 'TOP SECRET', stampAt: d * .35, hlAt: d * 2, hlStep: .4 }),
  226: d => ({ org: 'DEPARTMENT OF STATE', title: 'MEMORANDUM', fields: [['TO', 'THE WHITE HOUSE'], ['RE', 'ALICE HUANG / MEGASPEED']],
    lines: ['Source: electronic surveillance', 'of [[the subject]] and associates.', 'Assessment: recruited by the', 'PRC Ministry of State Security', 'to gather information on U.S.', 'AI chips, and to nudge [[J. H.]]', 'toward looser export rules.'],
    highlight: [2, 3, 4], stamp: 'TOP SECRET', slideIn: .01, stampAt: .02, hlAt: d * .2, hlStep: d * .17 }),
  259: d => ({ org: 'NVIDIA CORPORATION', title: 'PRESS RELEASE', fields: [['DATE', 'NOVEMBER 12, 2026'], ['FOR', 'IMMEDIATE RELEASE']],
    lines: ['Jensen Huang has resigned as CEO,', 'president, and board member,', 'effective immediately.', 'Chief financial officer Colette', 'Kress becomes interim CEO.'],
    highlight: [0, 3, 4], sign: 'COLETTE KRESS — INTERIM CEO', stamp: null, hlAt: d * .3, hlStep: d * .15 }),
};

// подписи в нижней трети (поверх фона): [имя, роль, доля d появления]
export const LOWER = {
  8: [['Jensen Huang', 'CEO, Nvidia', .2]],
  9: [['Alice Huang', 'Megaspeed', .25]],
  44: [['Chris Malachowsky', 'co-founder', .1], ['Curtis Priem', 'co-founder', .55]],
  219: [['Sen. Tom Cotton', 'U.S. Senate', .15]],
};
// подпись года на плане (пишмашинка в углу)
export const YEAR = { 43: '1993', 58: '2006' };
