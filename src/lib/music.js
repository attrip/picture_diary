// Minimal music prompt generator (Suno-style)
// Provides genre presets, mood, vocal mode, language, and tempo.
(function (global) {
  const GENRES = {
    rap: { jp: 'Rap / Hip Hop', en: 'rap / hip hop', instr: 'boom bap drums or modern trap hats, 808/sub, piano/keys, sparse textures', bpm: '80-100' },
    reggae: { jp: 'Reggae', en: 'reggae', instr: 'offbeat guitar/skank, deep bass, laid-back drums, organ', bpm: '70-90' },
    dub: { jp: 'Dub', en: 'dub', instr: 'heavy bass, echo/delay, spring reverb, stripped drums, tape fx', bpm: '70-90' },
    jungle: { jp: 'Jungle', en: 'jungle', instr: 'amen breaks, fast breakbeats, sub-bass, pads', bpm: '160-175' },
    jpop: { jp: 'J-POP', en: 'J-POP', instr: 'clean electric guitar, synth pad, tight drums', bpm: '90-110' },
    citypop: { jp: 'City Pop', en: 'city pop', instr: 'electric piano, slap bass, clean guitar, 80s drum machine', bpm: '95-110' },
    lofi: { jp: 'Lo-fi Hip Hop', en: 'lo-fi hip hop', instr: 'dusty drums, warm tape, jazzy chords, vinyl crackle', bpm: '70-90' },
    trap: { jp: 'Trap / Emo Rap', en: 'trap / emo rap', instr: '808 sub-bass, crisp hats, sparse keys, atmospheric pad', bpm: '120-150' },
    rb: { jp: 'R&B', en: 'R&B', instr: 'smooth Rhodes, sub bass, mellow drums, backing vocals', bpm: '85-100' },
    rock: { jp: 'Rock / Indie', en: 'rock / indie', instr: 'overdrive guitars, live drums, bass guitar', bpm: '100-140' },
    acoustic: { jp: 'Acoustic / Folk', en: 'acoustic / folk', instr: 'acoustic guitar, light percussion, soft pad', bpm: '80-105' },
    edm: { jp: 'EDM / House', en: 'EDM / house', instr: 'sidechain pad, punchy kick, pluck synth, risers', bpm: '120-128' },
    futurebass: { jp: 'Future Bass', en: 'future bass', instr: 'detuned saw chords, modulated bass, bright leads', bpm: '140-160' },
    jazz: { jp: 'Jazz', en: 'jazz', instr: 'upright bass, brushed drums, piano, sax', bpm: '80-120' },
    bossa: { jp: 'Bossa Nova', en: 'bossa nova', instr: 'nylon guitar, gentle percussion, soft keys', bpm: '70-100' },
  };

  const TEMPOS = {
    slow: { jp: 'ゆっくり', en: 'slow' },
    mid: { jp: 'ふつう', en: 'medium' },
    fast: { jp: 'はやい', en: 'fast' },
  };

  function moodText(mood) {
    switch (mood) {
      case 'warm': return { jp: 'あたたかい', en: 'warm' };
      case 'nostalgic': return { jp: 'ノスタルジック', en: 'nostalgic' };
      case 'dreamy': return { jp: '夢のよう', en: 'dreamy' };
      case 'energetic': return { jp: '元気', en: 'energetic' };
      case 'melancholy': return { jp: 'もの静か', en: 'melancholy' };
      case 'cozy': return { jp: '居心地よい', en: 'cozy' };
      case 'rainy': return { jp: '雨の情緒', en: 'rainy' };
      case 'night': return { jp: '夜', en: 'night' };
      case 'sunny': return { jp: '晴れやか', en: 'sunny' };
      default: return { jp: '穏やか', en: 'calm' };
    }
  }

  function vocalText(v) {
    if (v === 'rap') return { jp: 'ラップ中心', en: 'rap-focused' };
    if (v === 'both') return { jp: '歌とラップのミックス', en: 'singing + rap mix' };
    return { jp: '歌中心', en: 'singing-focused' };
  }

  function langText(l) {
    if (l === 'en') return { jp: '英語', en: 'English' };
    if (l === 'mix') return { jp: '日英ミックス', en: 'Japanese-English mix' };
    return { jp: '日本語', en: 'Japanese' };
  }

  function structureFor(vocal) {
    if (vocal === 'rap') return 'intro, verse, verse, hook, verse, hook, outro';
    if (vocal === 'both') return 'intro, verse (sing), pre, chorus, verse (rap), chorus, bridge, outro';
    return 'intro, verse, pre, chorus, verse, chorus, bridge, outro';
  }

  function lyricIdeas({ theme, mood, vocal, lang }) {
    const t = (theme || '日常の一コマ').trim();
    const m = moodText(mood).jp;
    if (lang === 'en') {
      if (vocal === 'rap') {
        return [
          `hook) ${t}, ${m} night — we glow in slow motion`,
          `verse) footsteps on wet streets, basslines under the neon`,
          `hook) breathe in, breathe out — let the city keep going`,
        ];
      }
      if (vocal === 'both') {
        return [
          `chorus) ${t}, under soft lights — I keep on going`,
          `rap) pen taps, heart maps — tracing what I’m holding`,
          `chorus) a small spark in a quiet ocean`,
        ];
      }
      return [
        `chorus) ${t} — softly, we are floating`,
        `verse) streetlights hum, tender and golden`,
        `bridge) promises folded in the pocket I’m holding`,
      ];
    }
    // Japanese or mix -> Japanese seed lines (neutral)
    if (vocal === 'rap') {
      return [
        `hook）${t}、${m}な夜に — 静かな鼓動が刻む`,
        `verse）濡れた路地、ネオンの気配、胸のリズム`,
        `hook）吸って吐いて、街はまだ続く`,
      ];
    }
    if (vocal === 'both') {
      return [
        `サビ）${t}、柔らかな灯りの下で まだ歩ける`,
        `ラップ）ペンが鳴る 心の地図をなぞる`,
        `サビ）静かな海に灯る小さな光`,
      ];
    }
    return [
      `サビ）${t} — そっと浮かぶ夜の色`,
      `Aメロ）街灯が揺れて ひかりはやさしい`,
      `ブリッジ）ポケットの中に たたんだ約束`,
    ];
  }

  function toneText(t) {
    switch (t) {
      case 'poetic': return { jp: '詩的', en: 'poetic' };
      case 'colloquial': return { jp: '口語的', en: 'colloquial' };
      case 'punchy': return { jp: '力強い', en: 'punchy' };
      case 'humorous': return { jp: 'ユーモア', en: 'humorous' };
      case 'melancholic': return { jp: '物悲しい', en: 'melancholic' };
      case 'romantic': return { jp: 'ロマンチック', en: 'romantic' };
      case 'empowering': return { jp: '前向き', en: 'empowering' };
      case 'storytelling': return { jp: '物語調', en: 'storytelling' };
      case 'minimal': return { jp: 'ミニマル', en: 'minimal' };
      default: return { jp: '内省的', en: 'introspective' };
    }
  }

  function buildMusicPrompt({ theme = '', mood = 'nostalgic', genre = 'citypop', vocal = 'sing', language = 'ja', tempo = 'mid', tone = 'introspective' }) {
    const g = GENRES[genre] || GENRES.citypop;
    const m = moodText(mood);
    const v = vocalText(vocal);
    const l = langText(language);
    const tp = TEMPOS[tempo] || TEMPOS.mid;
    const tn = toneText(tone);
    const structure = structureFor(vocal);

    const jp = [
      `ジャンル: ${g.jp}（${g.instr}）`,
      `雰囲気: ${m.jp}`,
      `テンポ: ${tp.jp}（目安BPM: ${g.bpm}）`,
      `ボーカル: ${v.jp}`,
      `言語: ${l.jp}`,
      `歌詞トーン: ${tn.jp}`,
      `テーマ: ${theme || '日常 / 都会 / 余韻'}`,
      `構成: ${structure}`,
      `ミックス: ボーカル前面、楽器は歌を支える。過度な歪みを避け、明瞭さ重視。`,
    ].join(', ');

    const en = [
      `genre: ${g.en} (${g.instr})`,
      `mood: ${m.en}`,
      `tempo: ${tp.en} (bpm guide: ${g.bpm})`,
      `vocal: ${v.en}`,
      `language: ${l.en}`,
      `lyric tone: ${tn.en}`,
      `theme: ${theme || 'everyday / city / afterglow'}`,
      `structure: ${structure}`,
      `mix: vocals forward; instruments supportive; avoid harsh distortion; keep clarity.`,
    ].join(', ');

    return { prompt: `${jp}\n-- ${en}`, ideas: lyricIdeas({ theme, mood, vocal, lang: language }), toneLabel: tn };
  }

  function addGenre(key, data) {
    if (!key) return false;
    const k = String(key).toLowerCase().replace(/\s+/g, '-');
    GENRES[k] = {
      jp: data.jp || data.en || k,
      en: data.en || data.jp || k,
      instr: data.instr || 'custom instruments',
      bpm: data.bpm || '90-110',
    };
    return GENRES[k];
  }

  global.MusicPrompt = { buildMusicPrompt, GENRES, addGenre };
})(window);
