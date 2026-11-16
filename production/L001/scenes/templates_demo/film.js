// templates_demo/film.js: витрина 2D-шаблонов «Стикман Нуар» (engine/src/templates) на материале L001.
// Каждый шаблон ~3 с подряд: карточка -> цифра -> карта -> доска -> документ -> плашка на фоне -> карточка -> титул главы.
// Текст служебки — иллюстрация для демо (пересказ сценария, не цитата из документа).
import { templates as T, alice, jensen, act, blinkAt, talkMouth, noirShade } from 'engine';
import officePlate from '../../assets/bg_nvidia_ceo_office.png';

const img = url => { const i = new Image(); i.src = url; i.style.display = 'none'; document.body.appendChild(i); return i; };
const LOOK = { bloom: 0, dof: false, fogDensity: 0, vignette: 0, bg: 0x000000 };

export default {
  fps: 30, size: [1920, 1080],
  setup(stage) {
    const office = img(officePlate);
    const A = alice(), J = jensen();
    J.spec.shade = noirShade([1, -.35]);
    // голова героя в окне снимка на доске: рисунок фигуры, кадрированный по плечи
    const mugshot = ch => (ctx, w, h) => {
      ctx.save(); ctx.translate(w / 2, h * 1.12); const s = h / 640; ctx.scale(s, s); ctx.translate(0, 430);
      const p = act(0, [[0, 'neutral']]); p.blink = 0; p.look = [.15, 0]; ch.draw(ctx, p); ctx.restore();
    };
    const shots = [
      ['card1', 3.0, (c, t) => T.blackCard(c, t, { text: 'Jensen has no idea.', underline: 'no idea', size: 96, dur: 3 })],
      ['number', 3.3, (c, t) => T.bigNumber(c, t, { from: '$33 MILLION', to: '$3 BILLION', label: 'Megaspeed · assets', sub: 'BY THE END OF 2024', at: .45, countDur: 1.4, dur: 3.3 })],
      ['map', 3.6, (c, t) => T.map(c, t, {
        dur: 3.6, view: { c: [108, 8.5], span: 66 }, focus: [105, 11], zoom: 1.07,
        labels: [{ text: 'CHINA', at: [111.5, 24.2], size: 44 }, { text: 'VIETNAM', at: [106.4, 15.2], size: 20 }, { text: 'SOUTH CHINA SEA', at: [114.5, 13], size: 22, color: 'rgba(127,184,255,.45)' }],
        pins: [{ id: 'sg', label: 'SINGAPORE', at: 'singapore', t0: .2 }, { id: 'my', label: 'MALAYSIA', at: 'kualaLumpur', t0: 1.0, side: -1 }, { id: 'id', label: 'INDONESIA', at: 'jakarta', t0: 1.3 }],
        routes: [{ from: 'singapore', to: 'kualaLumpur', t0: .55, t1: 1.05, bend: -.3 }, { from: 'singapore', to: 'jakarta', t0: .8, t1: 1.35, bend: .2 },
                 { from: 'singapore', to: [101.6, 22.6], t0: 1.5, t1: 2.45, bend: -.08, stop: .935 }],
        border: { id: 'china', t0: 2.35 },
      })],
      ['board', 3.4, (c, t) => T.board(c, t, {
        dur: 3.4,
        items: [
          { id: 'alice', kind: 'photo', x: 900, y: 520, w: 330, h: 390, rot: -.04, title: 'Alice Huang', draw: mugshot(A) },
          { id: 'aliceTag', kind: 'label', x: 900, y: 255, w: 360, h: 66, rot: .02, title: 'ALICE HUANG', pinned: false },
          { id: 'mega', kind: 'label', x: 1420, y: 330, w: 380, h: 80, rot: .05, title: 'MEGASPEED', color: '#e9d27a', pin: [150, 0] },
          { id: 'sg', kind: 'note', x: 420, y: 330, w: 350, h: 250, rot: -.07, title: 'SINGAPORE', lines: ['7ROAD -> MEGASPEED', 'MARCH 2023'] },
          { id: 'my', kind: 'note', x: 1560, y: 720, w: 330, h: 240, rot: .04, title: 'MALAYSIA', lines: ['DATA CENTERS', 'NVIDIA CHIPS'] },
          { id: 'jensen', kind: 'photo', x: 430, y: 760, w: 250, h: 300, rot: .06, title: 'J. Huang', draw: mugshot(J) },
        ],
        strings: [{ from: 'alice', to: 'mega', t0: .4, t1: 1.1 }, { from: 'mega', to: 'my', t0: .9, t1: 1.4 }, { from: 'sg', to: 'alice', t0: 1.1, t1: 1.7 }],
        circle: { id: 'alice', t0: 1.9, dur: .75, pad: 36 },
      })],
      ['memo', 3.4, (c, t) => T.document(c, t, {
        dur: 3.4, org: 'DEPARTMENT OF STATE', title: 'MEMORANDUM',
        fields: [['TO', 'THE WHITE HOUSE'], ['RE', 'ALICE HUANG / MEGASPEED']],
        lines: ['Source: electronic surveillance', 'of [[the subject]] and associates.', 'Assessment: recruited by the', "PRC Ministry of State Security", 'to gather information on U.S.', 'AI chips, and to nudge [[J. H.]]', 'toward looser export rules.'],
        highlight: [2, 3], stampAt: .95, hlAt: 1.5, hlStep: .5,
      })],
      ['lower', 3.0, (c, t) => {
        const W = 1920, H = 1080; c.save();
        const k = 1 + .045 * (t / 3); c.translate(W / 2, H / 2); c.scale(k, k); c.translate(-W / 2 - 20 * t, -H / 2);
        if (office.complete && office.naturalWidth) c.drawImage(office, 0, 0, W, H); else { c.fillStyle = '#0d1322'; c.fillRect(0, 0, W, H); }
        // Дженсен стоит слева от стола, говорит (2D-герой прямо на фоне)
        c.save(); c.translate(560, 1040); c.scale(.74, .74);
        const p = act(t, [[0, 'talk']]); p.blink = blinkAt(t, 3); p.mouth = talkMouth(t, ['open', 'O', 'smile', 'flat'], 5).mouth;
        if (p.mouth === 'teeth' || p.mouth === 'teethOpen') p.mouth = 'open';
        J.draw(c, p); c.restore();
        c.restore();
        T.lowerThird(c, t, { name: 'Jensen Huang', role: 'CEO, Nvidia', at: .35, point: [700, 520] });
      }],
      ['card2', 2.6, (c, t) => T.blackCard(c, t, { text: 'WHY PICK A LOCK?', underline: 'LOCK', dur: 2.6, at: .25, cps: 13, size: 104 })],
      ['chapter', 3.2, (c, t) => T.chapterTitle(c, t, { label: 'CHAPTER 3', title: 'The Locked Door', dur: 3.2 })],
    ];
    let at = 0;
    const scenes = shots.map(([id, d, fn]) => { const s = { id, from: at, to: at + d, look: LOOK, over: (t, f) => { f.ctx.save(); fn(f.ctx, f.local); f.ctx.restore(); } }; at += d; return s; });
    return { duration: at, scenes };
  },
};
