// assets.js: пишет make_assets.py — карта плит { name: { url, aspect, crop, ground, ... } }
import sg_backdrop from './assets/sg_backdrop.jpg';
import dc_backdrop from './assets/dc_backdrop.jpg';
import tp_backdrop from './assets/tp_backdrop.jpg';
import fin_backdrop from './assets/fin_backdrop.jpg';
import sg_mbs from './assets/sg_mbs.png';
import sg_wheel from './assets/sg_wheel.png';
import dc_capitol from './assets/dc_capitol.png';
import tp_101 from './assets/tp_101.png';
import tp_hall from './assets/tp_hall.png';
import sg_street from './assets/sg_street.png';
import dc_wall from './assets/dc_wall.png';
export default {
  sg_backdrop: { url: sg_backdrop, ...{"aspect": 1.7768331562167907, "crop": [0, 0, 1, 1]} },
  dc_backdrop: { url: dc_backdrop, ...{"aspect": 1.7768331562167907, "crop": [0, 0, 1, 1]} },
  tp_backdrop: { url: tp_backdrop, ...{"aspect": 1.7768331562167907, "crop": [0, 0, 1, 1]} },
  fin_backdrop: { url: fin_backdrop, ...{"aspect": 1.7768331562167907, "crop": [0, 0, 1, 1]} },
  sg_mbs: { url: sg_mbs, ...{"aspect": 1.8312342569269522, "crop": [0, 0, 1, 1]} },
  sg_wheel: { url: sg_wheel, ...{"aspect": 1.1606160616061607, "crop": [0, 0, 1, 1]} },
  dc_capitol: { url: dc_capitol, ...{"aspect": 2.150066401062417, "crop": [0, 0, 1, 1]} },
  tp_101: { url: tp_101, ...{"aspect": 0.7831715210355987, "crop": [0, 0, 1, 1]} },
  tp_hall: { url: tp_hall, ...{"aspect": 2.1463414634146343, "crop": [0, 0, 1, 1], "top_cut": 162, "ground_px": 872, "banner": [0.5, 0.5840821566110398, 0.5215311004784688, 0.2246469833119384], "ground": 0.08857509627727857} },
  sg_street: { url: sg_street, ...{"aspect": 15.494158878504672, "crop": [0, 0, 1, 1], "cx": 0.4889542335821458, "ground": 0.11214953271028037, "winY": 0.23948598130841123, "ppm": 49.1764705882353} },
  dc_wall: { url: dc_wall, ...{"aspect": 2.216967333008289, "crop": [0, 0, 1, 1], "cx": 0.5016494391906752, "winY": 0.7537786445636275, "ground": 0, "ppm": 72.14285714285714} },
};
