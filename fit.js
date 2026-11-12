/* FIT-Export: macht aus einem gespeicherten Training eine .fit-Datei (Garmin Activity),
   die sich in Garmin Connect («Daten importieren») oder bei Strava hochladen lässt.
   Krafttraining wird mit Sätzen, Wdh., Gewicht und Garmin-Übungstyp geschrieben.
   Format: Garmin FIT SDK (Profil 21.x), nur die nötigen Nachrichten, kein Fremdcode. */
(function () {
  'use strict';

  // ---------- Übungen → Garmin exercise_category / category_subtype ----------
  // Kategorie-Nummern siehe FIT-Profil «exercise_category». Subtyp null = nur Kategorie.
  const C = { bench: 0, calf: 1, cardio: 2, core: 5, crunch: 6, curl: 7, deadlift: 8, flye: 9, hipRaise: 10, hipStab: 11,
    hyper: 13, lateral: 14, legCurl: 15, legRaise: 16, lunge: 17, plank: 19, pullUp: 21, pushUp: 22, row: 23,
    shoulder: 24, shrug: 26, squat: 28, triceps: 30, run: 32, indoorBike: 41, indoorRow: 42, stair: 47, runIndoor: 52, unknown: 65534 };
  const EX = {
    bench: [C.bench, 1], incline_db: [C.bench, 9], db_bench: [C.bench, 6], incline_bench: [C.bench, 8],
    chest_press: [C.bench, null], incline_press_m: [C.bench, null], flys: [C.flye, 2], cable_cross: [C.flye, 0],
    pec_deck: [C.flye, null], dips_chest: [C.triceps, 2],
    db_ohp: [C.shoulder, 24], ohp: [C.shoulder, 14], shoulder_press_m: [C.shoulder, null],
    lat_raise_cable: [C.lateral, 14], lat_raise_db: [C.lateral, 34], lat_raise_m: [C.lateral, null],
    reverse_pec: [C.flye, 11], face_pull: [C.row, 5], rear_delt_db: [C.lateral, 3],
    tri_pushdown: [C.triceps, 39], tri_rope: [C.triceps, 19], overhead_ext: [C.triceps, 5], skullcrusher: [C.triceps, 13],
    dips: [C.triceps, 2], close_bench: [C.bench, 4], kickback: [C.triceps, 6],
    lat_pulldown: [C.pullUp, 13], lat_pulldown_close: [C.pullUp, 5], pullup: [C.pullUp, 38], assisted_pullup: [C.pullUp, 42],
    row_close: [C.row, 32], row_wide: [C.row, 33], db_row: [C.row, 13], tbar_row: [C.row, 28], row_machine: [C.row, null],
    pullover: [C.pullUp, 19],
    preacher: [C.curl, 19], hammer: [C.curl, 16], db_curl: [C.curl, 46], ez_curl: [C.curl, 38], cable_curl: [C.curl, 8],
    incline_curl: [C.curl, 22], bayesian_curl: [C.curl, 8], preacher_m: [C.curl, null],
    leg_press: [C.squat, 0], squat: [C.squat, 6], hack_squat: [C.squat, 9], goblet: [C.squat, 37], lunges: [C.lunge, 21],
    bulgarian: [C.lunge, 18], leg_ext: [C.squat, null],
    rdl: [C.deadlift, 23], rdl_bb: [C.deadlift, 23], deadlift: [C.deadlift, 0], leg_curl: [C.legCurl, 0],
    seated_leg_curl: [C.legCurl, 0], hip_thrust: [C.hipRaise, 1], abductor: [C.hipStab, null], back_ext: [C.hyper, null],
    calf_standing: [C.calf, 18], calf_seated: [C.calf, 6], calf_press: [C.calf, null],
    crunch_cable: [C.crunch, 1], leg_raise: [C.legRaise, 1], ab_machine: [C.crunch, null], plank: [C.plank, 43],
    cardio_stair: [C.stair, null], cardio_tread: [C.runIndoor, 1], cardio_bike: [C.indoorBike, null], cardio_ell: [C.cardio, 22],
    cardio_rower: [C.indoorRow, 0], cardio_run: [C.run, null], cardio_walk: [C.cardio, null], cardio_other: [C.cardio, null]
  };
  // Eigene Übungen: Kategorie grob über die Muskelgruppe
  const BY_MUSCLE = { 'Brust': C.bench, 'Schultern': C.shoulder, 'Trizeps': C.triceps, 'Rücken': C.row, 'Bizeps': C.curl,
    'Beine': C.squat, 'Beinbeuger & Po': C.deadlift, 'Waden': C.calf, 'Bauch': C.crunch };
  const TIMED = { plank: 1 }; // «Wdh.» sind hier Sekunden

  // Reines Cardio-Training → passende Sportart (sport, sub_sport)
  const CARDIO_SPORT = { cardio_stair: [4, 16], cardio_tread: [1, 1], cardio_bike: [2, 6], cardio_ell: [4, 15],
    cardio_rower: [4, 14], cardio_run: [1, 0], cardio_walk: [11, 0], cardio_other: [10, 26] };

  // ---------- Kleiner FIT-Schreiber ----------
  const T = { enum: [0x00, 1], u8: [0x02, 1], u16: [0x84, 2], u32: [0x86, 4], u32z: [0x8C, 4], str: [0x07, 0] };
  const INVALID = { 0x00: 0xFF, 0x02: 0xFF, 0x84: 0xFFFF, 0x86: 0xFFFFFFFF, 0x8C: 0 };
  const FIT_EPOCH = 631065600; // 1989-12-31T00:00:00Z in Unix-Sekunden
  const fitTime = d => Math.round(new Date(d).getTime() / 1000) - FIT_EPOCH;

  const CRC_T = [0x0000, 0xCC01, 0xD801, 0x1400, 0xF001, 0x3C00, 0x2800, 0xE401, 0xA001, 0x6C00, 0x7800, 0xB401, 0x5000, 0x9C01, 0x8801, 0x4400];
  function crc16(bytes, from, to) {
    let crc = 0;
    for (let i = from; i < to; i++) {
      const b = bytes[i];
      let t = CRC_T[crc & 0xF]; crc = (crc >> 4) & 0x0FFF; crc = crc ^ t ^ CRC_T[b & 0xF];
      t = CRC_T[crc & 0xF]; crc = (crc >> 4) & 0x0FFF; crc = crc ^ t ^ CRC_T[(b >> 4) & 0xF];
    }
    return crc;
  }

  function Writer() {
    const out = []; const defs = {}; let nextLocal = 0;
    const u8 = v => out.push(v & 0xFF);
    const u16 = v => { u8(v); u8(v >>> 8); };
    const u32 = v => { u16(v & 0xFFFF); u16(v >>> 16); };
    function strBytes(s, max) { const b = Array.from(new TextEncoder().encode(String(s || ''))).slice(0, max - 1); b.push(0); while (b.length < max) b.push(0); return b; }
    // fields: [[fieldNum, typeKey, value, size?]]
    function mesg(global, fields) {
      const layout = fields.map(([num, tk, , size]) => [num, T[tk][0], size || T[tk][1]]);
      const key = global + ':' + layout.map(f => f.join('.')).join(',');
      let local = defs[key];
      if (local == null) {
        local = defs[key] = nextLocal++ % 16;
        for (const k in defs) if (k !== key && defs[k] === local) delete defs[k];
        u8(0x40 | local); u8(0); u8(0); u16(global); u8(layout.length);
        layout.forEach(([n, bt, sz]) => { u8(n); u8(sz); u8(bt); });
      }
      u8(local);
      fields.forEach(([, tk, v, size], i) => {
        const bt = layout[i][1];
        if (tk === 'str') { strBytes(v, size).forEach(u8); return; }
        if (Array.isArray(v)) { v.forEach(x => (bt === 0x84 ? u16 : u8)(x == null ? INVALID[bt] : x)); return; }
        const val = v == null ? INVALID[bt] : v;
        if (T[tk][1] === 1) u8(val); else if (T[tk][1] === 2) u16(val); else u32(val);
      });
    }
    function bytes() {
      const data = out.length, buf = new Uint8Array(14 + data + 2);
      // Header: Grösse 14, Protokoll 2.0, Profil 21.00, Datenlänge, ".FIT"
      const h = [14, 0x20, 2100 & 0xFF, 2100 >> 8, data & 0xFF, (data >> 8) & 0xFF, (data >> 16) & 0xFF, (data >>> 24) & 0xFF, 0x2E, 0x46, 0x49, 0x54];
      buf.set(h, 0);
      const hc = crc16(buf, 0, 12); buf[12] = hc & 0xFF; buf[13] = hc >> 8;
      buf.set(out, 14);
      const fc = crc16(buf, 0, 14 + data); buf[14 + data] = fc & 0xFF; buf[15 + data] = fc >> 8;
      return buf;
    }
    return { mesg, bytes };
  }

  // ---------- Training → FIT ----------
  function exCat(e) {
    if (EX[e.exId]) return EX[e.exId];
    if (e.cardio) return [C.cardio, null];
    return [BY_MUSCLE[e.muscle] != null ? BY_MUSCLE[e.muscle] : C.unknown, null];
  }

  function sessionToFit(s) {
    const entries = (s.entries || []).filter(e => (e.sets && e.sets.length) || e.cardio);
    const end = Math.floor(new Date(s.date).getTime() / 1000);
    const cardioSec = entries.reduce((a, e) => a + (e.cardio && e.cardio.min > 0 ? e.cardio.min * 60 : 0), 0);
    const nSets = entries.reduce((a, e) => a + (e.sets ? e.sets.length : 0), 0);
    let total = Math.max(60, Math.round((s.durationMin || 0) * 60), Math.round(cardioSec + nSets * 60));
    const start = end - total;

    // Sportart
    const onlyCardio = entries.length && entries.every(e => e.cardio);
    const kinds = new Set(entries.map(e => e.exId));
    let sport = 10, sub = 20; // training / strength_training
    if (onlyCardio) [sport, sub] = kinds.size === 1 && CARDIO_SPORT[entries[0].exId] ? CARDIO_SPORT[entries[0].exId] : [10, 26];

    // Zeitachse: Cardio mit echter Dauer, Kraftsätze gleichmässig im Rest (Satz + Pause)
    const slot = nSets ? (total - cardioSec) / nSets : 0;
    const sets = []; let t = start, kcal = 0, dist = 0, hrSum = 0, hrMin = 0;
    for (const e of entries) {
      const [cat, subT] = exCat(e);
      if (e.cardio) {
        const d = Math.round((e.cardio.min || 0) * 60);
        if (e.cardio.kcal) kcal += e.cardio.kcal;
        if (e.cardio.dist) dist += e.cardio.dist * 1000;
        if (e.cardio.hr && d) { hrSum += e.cardio.hr * d; hrMin += d; }
        if (d > 0) { sets.push({ start: t, dur: d, type: 1, cat, sub: subT }); t += d; }
        continue;
      }
      for (const st of e.sets) {
        const timed = TIMED[e.exId];
        const work = timed ? Math.min(slot, Math.max(5, st.reps || 0)) : Math.min(45, Math.max(10, slot * 0.4));
        const reps = timed ? null : (st.reps || 0);
        sets.push({ start: t, dur: work, type: 1, cat, sub: subT, reps, kg: st.kg > 0 ? st.kg : null });
        t += work;
        const rest = slot - work;
        if (rest >= 1) { sets.push({ start: t, dur: rest, type: 0 }); t += rest; }
      }
    }

    const w = Writer();
    const ts = fitTime(start * 1000), te = fitTime(end * 1000), ms = total * 1000;
    const serial = (end % 0x7FFFFFFF) || 1;
    // file_id
    w.mesg(0, [[0, 'enum', 4], [1, 'u16', 255], [2, 'u16', 0], [3, 'u32z', serial], [4, 'u32', ts]]);
    // device_info (Ersteller)
    w.mesg(23, [[253, 'u32', ts], [0, 'u8', 0], [2, 'u16', 255], [4, 'u16', 0], [3, 'u32z', serial], [5, 'u16', 100]]);
    // sport mit Namen des Trainings
    w.mesg(12, [[0, 'enum', sport], [1, 'enum', sub], [3, 'str', s.dayName || 'Krafttraining', 32]]);
    // Start-Event
    w.mesg(21, [[253, 'u32', ts], [0, 'enum', 0], [1, 'enum', 0], [4, 'u8', 0]]);
    // Sätze
    sets.forEach((x, i) => {
      w.mesg(225, [[254, 'u32', fitTime((x.start + x.dur) * 1000)], [0, 'u32', Math.round(x.dur * 1000)],
        [3, 'u16', x.type ? x.reps : null], [4, 'u16', x.type && x.kg != null ? Math.round(x.kg * 16) : null],
        [5, 'u8', x.type], [6, 'u32', fitTime(x.start * 1000)],
        [7, 'u16', [x.type ? x.cat : null], 2], [8, 'u16', [x.type && x.sub != null ? x.sub : null], 2],
        [9, 'u16', 1], [10, 'u16', i]]);
    });
    // Stopp-Event
    w.mesg(21, [[253, 'u32', te], [0, 'enum', 0], [1, 'enum', 4], [4, 'u8', 0]]);
    const avgHr = hrMin ? Math.round(hrSum / hrMin) : null;
    // lap
    w.mesg(19, [[254, 'u16', 0], [253, 'u32', te], [0, 'enum', 9], [1, 'enum', 1], [2, 'u32', ts],
      [7, 'u32', ms], [8, 'u32', ms], [9, 'u32', dist ? Math.round(dist * 100) : null], [11, 'u16', kcal ? Math.round(kcal) : null],
      [15, 'u8', avgHr], [25, 'enum', sport], [39, 'enum', sub]]);
    // session
    w.mesg(18, [[254, 'u16', 0], [253, 'u32', te], [0, 'enum', 8], [1, 'enum', 1], [2, 'u32', ts],
      [5, 'enum', sport], [6, 'enum', sub], [7, 'u32', ms], [8, 'u32', ms], [9, 'u32', dist ? Math.round(dist * 100) : null],
      [11, 'u16', kcal ? Math.round(kcal) : null], [16, 'u8', avgHr], [25, 'u16', 0], [26, 'u16', 1]]);
    // activity
    const tzOff = -new Date(s.date).getTimezoneOffset() * 60;
    w.mesg(34, [[253, 'u32', te], [0, 'u32', ms], [1, 'u16', 1], [2, 'enum', 0], [3, 'enum', 26], [4, 'enum', 1], [5, 'u32', te + tzOff]]);
    return w.bytes();
  }

  function fitFileName(s) {
    const d = new Date(s.date), p = n => String(n).padStart(2, '0');
    const name = String(s.dayName || 'training').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^A-Za-z0-9]+/g, '-').replace(/^-|-$/g, '').toLowerCase() || 'training';
    return `gym-${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}-${name}.fit`;
  }

  window.GymFit = { sessionToFit, fitFileName, EX };
})();
