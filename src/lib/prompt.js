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
      // ラップでは自動フック行は追加しない（ユーザー入力のみ反映）
      return `${date}\n${lines.join('\n')}`;
    }
    // prose (default)
    const first = sentences[0];
    const middle = sentences.slice(1, -1);
    const last = sentences[sentences.length - 1] || '';
    const includeInsight = sentences.length >= 2 && typeof last === 'string' && last.trim().length >= 2 && last !== first;
    const body = [
      `【今日の出来事】${first}。`,
      ...(middle.length ? middle.map(s => `・${s}。`) : []),
      includeInsight ? `【気づき/感情】${last}。` : '',
    ].filter(Boolean).join('\n');
    return `${date}\n${body}`;
  }

  function stylePreset(style) {
    switch (style) {
      case 'cinematic_lighting':
        return {
          jp: '映画のような劇的で感情的な照明効果、リムライト、ボリューメトリックライト、ドラマチックな影、ゴッドレイ',
          en: 'nanabanana, cinematic lighting, rim light, volumetric lighting, dramatic shadows, god rays',
        };
      case 'artist_fusion':
        return {
          jp: '著名アーティストの作風を掛け合わせたフュージョンスタイル（好みの作家名を追加可能）',
          en: 'nanabanana, by Ilya Kuvshinov, by Range Murata, by James Jean, by Yoshitaka Amano',
        };
      case 'nostalgic_film':
        return {
          jp: 'フィルム写真のような少し色褪せたノスタルジックな空気、光漏れや粒状感、エモーショナル',
          en: 'nanabanana, nostalgic film photo, light leaks, grainy, summer memories, cinematic',
        };
      case 'ukiyoe_pop':
        return {
          jp: '浮世絵の木版画表現と現代的なキャラクターデザインの融合、太い輪郭と大胆な配色',
          en: 'nanabanana, Ukiyo-e style, woodblock print, Hokusai style, Japanese print, bold outlines',
        };
      case 'retro_future_80s':
        return {
          jp: '1980年代のレトロフューチャー、SFアニメ調、メカ/カセット・フューチャリズム、VHSスクリーン感',
          en: 'nanabanana, 80s retro anime style, retro future, mecha, cassette futurism, vhs screen',
        };
      case 'retro_anime_showa':
        return {
          jp: 'レトロアニメ／昭和アニメ調のカラーリング。クリーンな線画、フラットなセル塗り、落ち着いたレトロ配色、暖かい室内光、穏やかで集中した雰囲気、日本アニメ美学。シネマティックでドラマチックな照明、感情的な光の効果、リムライト、ボリューメトリックライト、ドラマチックな影、ゴッドレイ',
          en: 'nanabanana, anime-style illustration of [scene/action], clean line art, flat cel shading, retro muted colors, warm indoor lighting, calm and focused atmosphere, Japanese animation aesthetic, cinematic dramatic lighting, emotional light effects, rim light, volumetric light, dramatic shadows, god rays',
        };
      case 'minimal_line_art':
        return {
          jp: '繊細な線の魅力に焦点、ミニマルで洗練されたモノクローム、余白を活かす',
          en: 'nanabanana, minimalist, line art, clean, monochromatic, empty space, delicate',
        };
      case 'watercolor_ink':
        return {
          jp: '水彩のにじみとインク（墨）の筆致、線と淡い彩色のコンビネーション（線とウォッシュ）',
          en: 'nanabanana, watercolor, ink wash painting, sumi-e, rough sketch, line and wash',
        };
      case 'impasto_concept':
        return {
          jp: '厚塗り・コンセプトアート風。油絵の重厚感、筆致やパレットナイフの質感を残す',
          en: 'nanabanana, impasto, oil painting style, thick brush strokes, palette knife, concept art',
        };
      case 'double_exposure':
        return {
          jp: 'ダブルエクスポージャー。シルエット内に風景やパターンを重ねて内面や心情を象徴的に表現',
          en: 'nanabanana, double exposure, silhouette, superimposed, nature pattern, cityscape',
        };
      case 'abstract_expressionism':
        return {
          jp: '抽象表現主義。ドリッピングや激しい筆致、具象と抽象の共存、カオティックでエネルギッシュ',
          en: 'nanabanana, abstract expressionism, action painting, Jackson Pollock style, paint splatter, dynamic brushstrokes, chaotic energy',
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

  function buildImagePrompt({ rawText, diary, style = 'cinematic_lighting', mood = 'calm', aspect = '1:1', detail = 'balanced', includeTitle = true }) {
    const tone = detectTone(rawText);
    const kws = extractKeywords(rawText, 12);
    const preset = stylePreset(style);
    const toneHint = toneHints(tone);
    const detailHint = detailPreset(detail);
    const moodHint = moodPreset(mood);

    const ratio = aspect;

    const en = [
      `scene from a diary: ${kws.slice(0, 6).join(', ')}`,
      `render one emotionally striking key moment inferred from the text`,
      `${preset.en}`,
      `${moodHint.en} (${toneHint.en})`,
      `composition: readable layout, main subject near center`,
      `${detailHint}`,
      `aspect: ${ratio}`,
      `no text/letters/logos/watermarks in the image`,
      `high quality, sharp focus, coherent anatomy, consistent lighting`,
    ].join(' / ');

    const prompt = [
      '以下の文章（短い日記/メモ）を読み、内容から情景を想像して「最も印象的な一場面」を1枚の画像として描いてください。',
      '文章はキーワードの羅列ではなく、イメージ構築の手がかりです。主題に焦点を当て、不要な要素は省略して構いません。',
      '画像内に文字（字幕・透かし・ロゴ・英字）は描かないでください。',
      '',
      '【日記】',
      diary,
      '',
      '【画像のスタイル・雰囲気】',
      '',
      `スタイル: ${preset.jp}`,
      '',
      `雰囲気: ${moodHint.jp}（${toneHint.jp}）`,
      '',
      '構図: 自然で読みやすいレイアウトで主題が明確に伝わるように。',
      '',
      `アスペクト比: ${ratio}`,
      '',
      `質感: ${detail === 'high' ? '精密な質感、繊細な陰影' : detail === 'simple' ? '簡潔な質感、フラットな陰影' : '程よい質感、柔らかな陰影'}`,
      '',
      '高品質で、焦点が合い、照明が一貫していること',
      '',
      '【生成の指示】',
      en,
    ].join('\n');

    return { prompt, tone, keywords: kws, diary };
  }

  // Public API
  const API = { generateDiary, buildImagePrompt, detectTone, extractKeywords };
  global.PictureDiary = API;
})(window);
