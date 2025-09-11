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

  function themeToEnglish(input) {
    const s = (input || '').trim();
    if (!s) return '';
    // If already ASCII-heavy, keep as-is
    const asciiRatio = s.replace(/[^\x00-\x7F]/g, '').length / s.length;
    if (asciiRatio > 0.8) return s; // likely English
    // Minimal JP->EN keyword mapping (fallbacks)
    const map = [
      { re: /日常|毎日|普段/g, kw: 'everyday life' },
      { re: /都会|街|都市|シティ|街角|交差点/g, kw: 'city' },
      { re: /余韻|アフターグロウ|残光/g, kw: 'afterglow' },
      { re: /夜|夜景|深夜|真夜中/g, kw: 'night' },
      { re: /雨|小雨|雨上がり|梅雨/g, kw: 'rain' },
      { re: /夕方|夕暮れ|黄昏/g, kw: 'sunset' },
      { re: /朝|朝焼け|朝日/g, kw: 'morning' },
      { re: /海|海辺|浜辺|波/g, kw: 'ocean' },
      { re: /旅|旅行|車窓|列車|電車/g, kw: 'travel' },
      { re: /孤独|ひとり|寂しさ/g, kw: 'loneliness' },
      { re: /週末|休日/g, kw: 'weekend' },
      { re: /春/g, kw: 'spring' },
      { re: /夏/g, kw: 'summer' },
      { re: /秋/g, kw: 'autumn' },
      { re: /冬/g, kw: 'winter' },
      { re: /恋|恋愛|愛/g, kw: 'love' },
      { re: /公園|並木|桜|彼岸花/g, kw: 'park' },
      { re: /静けさ|静か|穏やか/g, kw: 'calm' },
      { re: /ノスタルジ|懐かし|郷愁/g, kw: 'nostalgia' },
      { re: /都会の夜|夜の街/g, kw: 'city night' },
      { re: /帰り道/g, kw: 'way home' },
    ];
    const found = [];
    for (const m of map) {
      if (m.re.test(s)) found.push(m.kw);
    }
    const uniq = Array.from(new Set(found));
    return uniq.join(' / ');
  }

  function buildMusicPrompt({ theme = '', mood = 'nostalgic', genre = 'citypop', vocal = 'sing', language = 'ja', tempo = 'mid', tone = 'introspective' }) {
    const g = GENRES[genre] || GENRES.citypop;
    const m = moodText(mood);
    const v = vocalText(vocal);
    const l = langText(language);
    const tp = TEMPOS[tempo] || TEMPOS.mid;
    const tn = toneText(tone);
    const structure = structureFor(vocal);

    // Compact, single-line, English-leaning prompt (as requested)
    // Example target:
    // "Lo-fi Hip Hop, dusty drums, warm tape, jazzy chords, vinyl crackle, quiet atmosphere, medium tempo (BPM 70-90), Japanese rap, introspective tone, theme: everyday life / city / afterglow, structure: intro, verse (rap), pre-chorus, chorus"
    const genreLabel = g.jp; // nicely cased (e.g., "Lo-fi Hip Hop")
    const instrParts = String(g.instr || '')
      .split(',')
      .map(s => s.trim())
      .filter(Boolean);
    const moodPhrase = (m.en === 'calm') ? 'quiet atmosphere' : `${m.en} atmosphere`;
    const tempoWord = (tp.en === 'mid') ? 'medium' : tp.en; // defensive; tp.en usually 'medium'
    const tempoPhrase = `${tempoWord} tempo (BPM ${g.bpm})`;
    // Language + vocal phrasing
    const langWord = (language === 'ja') ? 'Japanese' : (language === 'en' ? 'English' : 'Japanese-English');
    let vocalLangPhrase = langWord;
    if (vocal === 'rap') vocalLangPhrase += ' rap';
    else if (vocal === 'both') vocalLangPhrase += ' singing + rap';
    else vocalLangPhrase += ' singing';
    const tonePhrase = `${tn.en} tone`;
    const themeText = themeToEnglish(theme) || 'everyday life / city / afterglow';
    // Short structure for readability in compact line
    let structureShort = 'intro, verse, pre-chorus, chorus';
    if (vocal === 'rap') structureShort = 'intro, verse (rap), pre-chorus, chorus';
    if (vocal === 'both') structureShort = 'intro, verse (rap), pre-chorus, chorus';

    const compact = [
      genreLabel,
      ...instrParts,
      moodPhrase,
      tempoPhrase,
      vocalLangPhrase,
      tonePhrase,
      `theme: ${themeText}`,
      `structure: ${structureShort}`,
    ].join(', ');

    return { prompt: compact, ideas: lyricIdeas({ theme, mood, vocal, lang: language }), toneLabel: tn };
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

  global.MusicPrompt = { buildMusicPrompt, GENRES, addGenre, themeToEnglish };
})(window);
