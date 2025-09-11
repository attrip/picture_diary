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
      case 'ukiyoe':
        return {
          jp: '[描きたいもの]の浮世絵、歌川広重風、大胆な構図と美しいぼかし、哀愁漂う雰囲気',
          en: 'Ukiyo-e of [subject], Hiroshige Utagawa style, bold composition and beautiful blurring, melancholic atmosphere',
        };
      case 'photoreal-portrait':
        return {
          jp: '[人物の説明]の超リアルなポートレート、[感情や表情]、スタジオ照明、背景は[色]の無地、髪の毛一本一本まで鮮明',
          en: 'Ultra-realistic portrait of [person description], [emotion/expression], studio lighting, solid [color] background, every single hair is clear',
        };
      case 'anime-character':
        return {
          jp: '[キャラクターの説明]、人気アニメ映画風の壮大なイラスト、[感情]を表現する表情、[背景]、デジタルペインティング',
          en: '[Character description], epic illustration in the style of a popular anime movie, facial expression that expresses [emotion], [background], digital painting',
        };
      case 'impasto-oil':
        return {
          jp: '[描きたいもの]の厚塗りの油絵、レンブラント風の劇的な光と影、重厚な色彩、クラシックな雰囲気',
          en: 'Impasto oil painting of [subject], dramatic light and shadow in the style of Rembrandt, deep colors, classic atmosphere',
        };
      case 'retro-film':
        return {
          jp: '[被写体]を写した80年代の日本のフィルム写真風、少しノイズの入った質感、温かみのある色合い、ノスタルジックな夏の日の雰囲気',
          en: '80s Japanese film style photo of [subject], slightly noisy texture, warm colors, nostalgic summer day atmosphere',
        };
      case 'detailed-pen':
        return {
          jp: '[描きたいもの]の非常に詳細なペン画、銅版画風の繊細な線、アンティークな雰囲気、イラストレーション',
          en: 'Very detailed pen drawing of [subject], delicate lines in the style of a copperplate engraving, antique atmosphere, illustration',
        };
      case '3d-character':
        return {
          jp: '[キャラクターの説明]、高品質な3Dキャラクターモデル、トゥーンレンダリング、生き生きとした表情、明るいライティング',
          en: '[Character description], high-quality 3D character model, toon rendering, lively expression, bright lighting',
        };
      case 'pop-art':
        return {
          jp: '[描きたいもの]のポップアート、鮮やかなシルクスクリーン風、大胆な色彩の反復、グラフィカルなデザイン',
          en: 'Pop art of [subject], vivid silkscreen style, bold color repetition, graphical design',
        };
      case 'steampunk':
        return {
          jp: '[描きたいもの]のスチームパンク風イラスト、歯車と真鍮の装飾、緻密なメカニカルデザイン、ヴィクトリア朝の雰囲気、セピア調の色合い',
          en: 'Steampunk illustration of [subject], gears and brass decoration, intricate mechanical design, Victorian atmosphere, sepia tones',
        };
      case 'minimalist-line-art':
        return {
          jp: '[描きたいもの]のミニマリストなラインアート、一筆書き風、シンプルな線、白背景、洗練されたデザイン',
          en: 'Minimalist line art of [subject], one-stroke style, simple lines, white background, sophisticated design',
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
    let preset = stylePreset(style);
    const toneHint = toneHints(tone);
    const detailHint = detailPreset(detail);
    const moodHint = moodPreset(mood);

    const subject = kws.slice(0, 6).join('、');
    const personDescription = kws.slice(0, 6).join('、');
    const characterDescription = kws.slice(0, 6).join('、');
    const emotion = moodHint.jp;
    const color = '無地';
    const background = 'シンプルな背景';

    preset.jp = preset.jp.replace(/\[描きたいもの\]/g, subject);
    preset.jp = preset.jp.replace(/\ \[人物の説明\]/g, personDescription);
    preset.jp = preset.jp.replace(/\ \[感情や表情\]/g, emotion);
    preset.jp = preset.jp.replace(/\ \[色\]/g, color);
    preset.jp = preset.jp.replace(/\ \[キャラクターの説明\]/g, characterDescription);
    preset.jp = preset.jp.replace(/\ \[感情\]/g, emotion);
    preset.jp = preset.jp.replace(/\ \[背景\]/g, background);
    preset.jp = preset.jp.replace(/\ \[被写体\]/g, subject);

    preset.en = preset.en.replace(/\ \[subject\]/g, kws.slice(0, 6).join(', '));
    preset.en = preset.en.replace(/\ \[person description\]/g, kws.slice(0, 6).join(', '));
    preset.en = preset.en.replace(/\ \[emotion\/expression\]/g, moodHint.en);
    preset.en = preset.en.replace(/\ \[color\]/g, 'solid');
    preset.en = preset.en.replace(/\ \[character description\]/g, kws.slice(0, 6).join(', '));
    preset.en = preset.en.replace(/\ \[emotion\]/g, moodHint.en);
    preset.en = preset.en.replace(/\ \[background\]/g, 'simple background');

    const ratio = aspect;

    const en = [
      `scene from a diary: ${kws.slice(0, 6).join(', ')}`,
      `${preset.en}`,
      `${moodHint.en} (${toneHint.en})`,
      `composition: readable layout, main subject near center`,
      `${detailHint}`,
      `aspect: ${ratio}`,
      `high quality, sharp focus, coherent anatomy, consistent lighting`,
    ].join(' / ');

    const prompt = [
      '以下の日記の内容を元に、最も印象的な場面を想像して、感情が伝わるような画像を1枚作成してください。',
      '文章はイメージ作成の参考情報であり、画像内に文字（字幕・透かし・ロゴ・英字）は描かないでください。',
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
      '構図: 自然で読みやすいレイアウトで、日記の主題が伝わるように。',
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