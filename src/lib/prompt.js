// Simple, dependency-free diary + image prompt generator.
// Language: Japanese primary, English helpers where useful.

(function (global) {
  const STOPWORDS = new Set(
    [
      'の','に','は','を','た','が','で','て','と','も','な','だ','です','ます','する','いる','ある','から','まで','よう','こと','もの','それ','これ','あれ','そして','でも','しかし','また','ので','ため','今日','昨日','明日','今','あと','そして','とても','すごく','少し','ちょっと','など'
    ]
  );

  function formatDate(d = new Date()) {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const weekday = '日月火水木金土'[d.getDay()];
    return `${y}年${m}月${day}日(${weekday})`;
  }

  function normalize(text) {
    return (text || '')
      .replace(/[\t\r]+/g, ' ')
      .replace(/\s{2,}/g, ' ')
      .trim();
  }

  function splitSentences(text) {
    const t = normalize(text);
    if (!t) return [];
    return t
      .split(/[。！!？?\n]+/)
      .map(s => s.trim())
      .filter(Boolean);
  }

  function detectTone(text) {
    const s = text;
    const score = (
      (/(嬉|楽し|わくわく|最高|良かっ|元気|笑|晴れ)/g.test(s) ? 2 : 0) +
      (/(疲れ|大変|忙し|泣|悲し|失敗|雨|曇)/g.test(s) ? -2 : 0)
    );
    if (score >= 2) return 'positive';
    if (score <= -2) return 'negative';
    return 'neutral';
  }

  function extractKeywords(text, limit = 10) {
    const raw = (text || '')
      .replace(/[\p{P}\p{S}]/gu, ' ')
      .split(/\s+/)
      .map(w => w.trim())
      .filter(Boolean)
      .filter(w => !STOPWORDS.has(w))
      .filter(w => w.length > 1);

    const freq = new Map();
    for (const w of raw) freq.set(w, (freq.get(w) || 0) + 1);
    return [...freq.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, limit)
      .map(([w]) => w);
  }

  function generateDiary(text, opts) {
    const mode = (opts && opts.mode) || 'prose';
    const sentences = splitSentences(text);
    const date = formatDate();
    if (sentences.length === 0) {
      if (mode === 'rap') {
        return `${date}\n・静かな一日 / short memo\n・また明日 / keep it mellow`;
      }
      if (mode === 'essay') {
        return `${date}\n（短いエッセイ）静かな一日。`;
      }
      return `${date}\n今日は短いメモだけ。静かな一日。`;
    }
    if (mode === 'essay') {
      const title = firstLine(text);
      const paras = [];
      let buf = [];
      const chunks = sentences.slice();
      while (chunks.length) {
        buf.push(chunks.shift());
        if (buf.length >= 3 || chunks.length === 0) {
          const para = buf.join('。') + '。';
          paras.push(para);
          buf = [];
        }
      }
      return `${date}\n${title}\n\n${paras.join('\n\n')}`;
    }
    if (mode === 'rap') {
      // Rap-like compact lines: split into short chunks and join with slashes
      const lines = sentences.map(s => {
        const parts = s
          .replace(/[。！？!？]/g, ' ')
          .split(/[、,\s]+/)
          .map(x => x.trim())
          .filter(Boolean)
          .slice(0, 3);
        return '・' + (parts.join(' / ') || s);
      });
      // Add a tone-based hook line
      const tone = detectTone(text);
      const hint = toneHints(tone).jp.replace(/、.*/, '');
      lines.push(`・hook: ${hint}`);
      return `${date}\n${lines.join('\n')}`;
    }
    // prose (default)
    const first = sentences[0];
    const middle = sentences.slice(1, -1);
    const last = sentences[sentences.length - 1] || '';
    const body = [
      `【今日の出来事】${first}。`,
      ...(middle.length ? middle.map(s => `・${s}。`) : []),
      last ? `【気づき/感情】${last}。` : '',
    ].filter(Boolean).join('\n');
    return `${date}\n${body}`;
  }

  function stylePreset(style) {
    switch (style) {
      case 'watercolor':
        return {
          jp: '透明感のある水彩画、柔らかい滲み、淡い色彩',
          en: 'soft watercolor, gentle bleeding, light pastel palette',
        };
      case 'watercolor-minimal-portrait':
        return {
          jp: '日本の水彩ミニマル、和紙の質感、細い鉛筆線、エアリーな粒状感、現代的な服装（着物は除く）、髪は深い黒褐色（白/灰/金髪は除く）、バストアップ、清潔な構図、穏やかで親密な雰囲気、柔らかな環境光',
          en: 'Japanese watercolor minimal, washi paper texture, thin pencil line, airy grain, modern clothing (no kimono), hair deep black-brown (no white/gray/blonde), bust-up portrait, serene and intimate mood, soft ambient light, clean composition',
        };
      case 'toy-statuette-3d-desk':
        return {
          jp: '写真の被写体をトイ風スタチューに変換。背後にキャラクター画像入りの箱（ブランド風だが可読ロゴや文字は避ける）。ノートPC/モニタにはBlenderのモデリング画面。箱の前に円形スタンドを置き、その上にスタチューを座らせる。室内スタジオやデスク環境、柔らかなキーライトと控えめなレフ。3Dプリントらしいごく淡いレイヤー跡。',
          en: 'transform the subject into a toy-like statuette; behind it place a character-illustrated box (brand-like, avoid readable logos/text); add a laptop/monitor showing the Blender modeling view; place a circular stand in front of the box and seat the figure on it; indoor studio or desk environment, soft key light, subtle bounce; faint 3D-printed layer lines.',
        };
      case 'manga':
        return {
          jp: 'マンガ風、きれいな線画、ハーフトーン、シンプルな配色',
          en: 'clean manga line art, screentone, simple palette',
        };
      case 'oil':
        return {
          jp: '油絵、厚塗り、筆致が見える、重厚な陰影',
          en: 'oil painting, impasto, visible brush strokes, dramatic shading',
        };
      case 'photo':
        return {
          jp: '写真風、自然光、シネマティック、浅い被写界深度',
          en: 'photorealistic, natural light, cinematic, shallow depth of field',
        };
      default:
        return { jp: '', en: '' };
    }
  }

  function detailPreset(level) {
    switch (level) {
      case 'simple':
        return 'minimal detail, clean composition';
      case 'high':
        return 'highly detailed, intricate textures, fine lighting';
      default:
        return 'balanced detail';
    }
  }

  function moodPreset(mood) {
    switch (mood) {
      case 'warm':
        return { jp: 'あたたかい雰囲気、柔らかな光、やさしい色調', en: 'warm mood, soft light, gentle colors' };
      case 'nostalgic':
        return { jp: 'ノスタルジック、少し退色した色、フィルム風', en: 'nostalgic, slightly faded colors, film-like' };
      case 'dreamy':
        return { jp: '夢のよう、ふんわり、淡いボケ', en: 'dreamy, airy, soft bokeh' };
      case 'energetic':
        return { jp: '元気で明るい、コントラスト強め、活気', en: 'energetic, bright, strong contrast' };
      case 'melancholy':
        return { jp: 'もの静か、落ち着いた色調、やわらかな陰影', en: 'melancholic, muted tones, soft shadows' };
      case 'cozy':
        return { jp: '居心地よい、あたたかな室内灯、リラックス', en: 'cozy, warm indoor light, relaxed' };
      case 'rainy':
        return { jp: '雨の情緒、濡れた路面の反射、しっとり', en: 'rainy mood, wet reflections, gentle' };
      case 'night':
        return { jp: '夜景、ネオンや街灯、深い陰影', en: 'night scene, neon/street lights, deep shadows' };
      case 'sunny':
        return { jp: '晴れやか、クリアな光、鮮やかな色', en: 'sunny, clear light, vivid colors' };
      default:
        return { jp: '穏やかな雰囲気、自然な色調', en: 'calm mood, natural palette' };
    }
  }

  function toneHints(tone) {
    switch (tone) {
      case 'positive':
        return { jp: '明るい雰囲気、爽やか、優しい光', en: 'bright mood, fresh, gentle light' };
      case 'negative':
        return { jp: '静かな雰囲気、落ち着いた色調、弱い光', en: 'calm mood, muted colors, soft light' };
      default:
        return { jp: '自然な雰囲気、穏やかな色調', en: 'natural mood, soft palette' };
    }
  }

  function firstLine(text) {
    if (!text) return '';
    const byNl = String(text).split(/\n+/)[0].trim();
    if (byNl) return byNl;
    const sents = splitSentences(text);
    return sents[0] || '';
  }

  function buildImagePrompt({ rawText, diary, style = 'watercolor', mood = 'calm', aspect = '1:1', detail = 'balanced', includeTitle = true }) {
    const tone = detectTone(rawText);
    const kws = extractKeywords(rawText, 12);
    const preset = stylePreset(style);
    const toneHint = toneHints(tone);
    const detailHint = detailPreset(detail);
    const moodHint = moodPreset(mood);
    const title = firstLine(diary || rawText);

    const ratio = aspect; // consumer tool interprets

    const jpTextPolicy = includeTitle
      ? `文字はイメージ作成の参考情報。基本は描かない。必要な場合のみ、ごく小さなタイトルを許可（簡素・控えめ）。その他の文字・字幕・透かし・ロゴは描かない`
      : `文字はイメージ作成の参考情報であり、画像内には描かない（字幕・透かし・ロゴ・英字も不可）`;

    const enTextPolicy = includeTitle
      ? `treat text as conceptual guidance only. prefer no text. if absolutely needed, allow a tiny, subtle title only; no other text, captions, subtitles, watermarks, logos, letters`
      : `text is guidance only; do not render any text in the image (no captions, subtitles, watermarks, logos, letters)`;

    const subjectJp = kws.slice(0, 4).join('、');
    const subjectEn = kws.slice(0, 4).join(', ');

    const jp = [
      `日記の一場面を描く: ${kws.slice(0, 6).join('、')}`,
      `情景: ${moodHint.jp}（${toneHint.jp}）`,
      `スタイル: ${preset.jp}`,
      `構図: 自然で読みやすいレイアウト、主要被写体を中央付近に`,
      `質感: ${detail === 'high' ? '精密な質感、繊細な陰影' : detail === 'simple' ? '簡潔な質感、フラットな陰影' : '程よい質感、柔らかな陰影'}`,
      jpTextPolicy,
      `アスペクト比: ${ratio}`,
      subjectJp ? `被写体: ${subjectJp}` : '',
    ].filter(Boolean).join(' / ');

    const en = [
      `scene from a diary: ${kws.slice(0, 6).join(', ')}`,
      `${preset.en}`,
      `${moodHint.en} (${toneHint.en})`,
      `composition: readable layout, main subject near center`,
      `${detailHint}`,
      `${enTextPolicy}`,
      `aspect: ${ratio}`,
      `high quality, sharp focus, coherent anatomy, consistent lighting`,
      subjectEn ? `subject: ${subjectEn}` : '',
    ].join(' / ');

    const prompt = `${jp} \n-- ${en}`;
    return { prompt, tone, keywords: kws, diary };
  }

  // Public API
  const API = { generateDiary, buildImagePrompt, detectTone, extractKeywords };
  global.PictureDiary = API;
})(window);
