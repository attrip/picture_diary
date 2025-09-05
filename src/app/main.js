(() => {
  const $ = (sel) => document.querySelector(sel);
  // Generate PNG favicons at runtime to avoid maintaining raster files
  function ensurePngIcons() {
    function makePng(size) {
      const c = document.createElement('canvas');
      c.width = c.height = size;
      const ctx = c.getContext('2d');
      // Background
      ctx.fillStyle = '#0f1216';
      ctx.fillRect(0, 0, size, size);
      // Panel
      const r = Math.max(4, Math.floor(size * 0.18));
      ctx.fillStyle = '#151a21';
      roundRect(ctx, Math.floor(size*0.09), Math.floor(size*0.09), Math.floor(size*0.82), Math.floor(size*0.82), r);
      ctx.fill();
      // Gradient text-like mark (PD simplified)
      const g = ctx.createLinearGradient(0, 0, size, size);
      g.addColorStop(0, '#6aa4ff');
      g.addColorStop(1, '#51c28e');
      ctx.fillStyle = g;
      ctx.font = `${Math.floor(size*0.46)}px system-ui, sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('PD', size/2, size/2 + Math.floor(size*0.02));
      return c.toDataURL('image/png');
    }
    function roundRect(ctx, x, y, w, h, r) {
      const rr = Math.min(r, w/2, h/2);
      ctx.beginPath();
      ctx.moveTo(x+rr, y);
      ctx.arcTo(x+w, y, x+w, y+h, rr);
      ctx.arcTo(x+w, y+h, x, y+h, rr);
      ctx.arcTo(x, y+h, x, y, rr);
      ctx.arcTo(x, y, x+w, y, rr);
      ctx.closePath();
    }
    function upsertIcon(rel, sizes, href) {
      const selector = `link[rel='${rel}'][sizes='${sizes}']`;
      let link = document.querySelector(selector);
      if (!link) {
        link = document.createElement('link');
        link.rel = rel;
        link.sizes = sizes;
        document.head.appendChild(link);
      }
      link.href = href;
    }
    try {
      upsertIcon('icon', '16x16', makePng(16));
      upsertIcon('icon', '32x32', makePng(32));
      upsertIcon('apple-touch-icon', '180x180', makePng(180));
    } catch (_) { /* noop */ }
  }
  const rawEl = $('#rawText');
  const diaryEl = $('#diaryOut');
  const promptEl = $('#promptOut');
  const btn = $('#generateBtn');
  const styleEl = $('#style');
  const aspectEl = $('#aspect');
  const detailEl = $('#detail');
  const diaryStyleEl = document.getElementById('diaryStyle');
  const diaryStyleChips = document.getElementById('diaryStyleChips');
  const diaryStyleChips2 = document.getElementById('diaryStyleChips2');
  const titleInImageEl = $('#titleInImage');
  const moodEl = $('#mood');
  // Music elements
  const musicThemeEl = $('#musicTheme');
  const musicThemeClear = document.getElementById('musicThemeClear');
  const musicGenreEl = $('#musicGenre');
  const musicMoodEl = $('#musicMood');
  const musicVocalEl = $('#musicVocal');
  const musicLangEl = $('#musicLang');
  const musicToneEl = $('#musicTone');
  const musicTempoEl = $('#musicTempo');
  const musicGenerateBtn = $('#musicGenerate');
  const musicOutEl = $('#musicOut');
  const lyricOutEl = $('#lyricOut');
  const musicCustomChips = document.getElementById('musicCustomChips');
  const presetAddBtn = document.getElementById('presetAddBtn');
  const presetKeyEl = document.getElementById('presetKey');
  const presetNameEl = document.getElementById('presetName');
  const presetInstrEl = document.getElementById('presetInstr');
  const presetBpmEl = document.getElementById('presetBpm');
  // Chat elements
  const chatMessages = $('#chatMessages');
  const chatInput = $('#chatInput');
  const chatSend = $('#chatSend');
  const chatSkip = document.getElementById('chatSkip');
  const chatIdeas = document.getElementById('chatIdeas');
  const chatIdeasRefresh = document.getElementById('chatIdeasRefresh');
  const chatFinalize = $('#chatFinalize');
  const chatRestart = $('#chatRestart');
  const chatUndo = $('#chatUndo');
  const chatModeEl = $('#chatMode');

  function copyFrom(selector) {
    const el = document.querySelector(selector);
    if (!el) return;
    el.select();
    document.execCommand('copy');
  }

  document.addEventListener('click', (e) => {
    const t = e.target;
    if (t && t.matches('button[data-copy]')) {
      const sel = t.getAttribute('data-copy');
      copyFrom(sel);
      t.classList.add('copied');
      setTimeout(() => t.classList.remove('copied'), 1200);
    }
    if (t && t.matches('button[data-open]')) {
      const dest = t.getAttribute('data-open');
      const sourceSel = t.getAttribute('data-source') || '#promptOut';
      const source = document.querySelector(sourceSel);

      // Generate content on-demand if empty
      if (source === promptEl && !promptEl.value.trim()) {
        const raw = rawEl.value.trim();
        const diary = PictureDiary.generateDiary(raw, { mode: (diaryStyleEl && diaryStyleEl.value) || 'prose' });
        const result = PictureDiary.buildImagePrompt({
          rawText: raw,
          diary,
          style: styleEl.value,
          mood: (typeof moodEl !== 'undefined' && moodEl) ? moodEl.value : 'calm',
          aspect: aspectEl.value,
          detail: detailEl.value,
          includeTitle: !!(titleInImageEl && titleInImageEl.checked),
        });
        if (diaryEl) diaryEl.value = diary;
        promptEl.value = result.prompt;
      } else if (source === diaryEl && !diaryEl.value.trim()) {
        const raw = rawEl.value.trim();
        const diary = PictureDiary.generateDiary(raw, { mode: (diaryStyleEl && diaryStyleEl.value) || 'prose' });
        diaryEl.value = diary;
      }

      // Build text to copy; for diary, wrap with explicit intent if essay/rap
      let text = (source && 'value' in source) ? (source.value || '') : '';
      if (source === diaryEl) {
        const style = (diaryStyleEl && diaryStyleEl.value) || 'prose';
        if (style === 'essay') {
          const tone = PictureDiary && PictureDiary.detectTone ? PictureDiary.detectTone(rawEl.value || '') : 'neutral';
          const toneJp = tone === 'positive' ? '前向き' : tone === 'negative' ? '静か' : '自然';
          text = [
            'エッセイを日本語で作成してください。',
            `条件: 3〜5段落、読みやすい構成、${toneJp}なトーン。箇条書きは使わず、滑らかに。`,
            '',
            '題材メモ:',
            (text || '').trim(),
          ].join('\n');
        } else if (style === 'rap') {
          text = [
            '日本語のラップ歌詞を作成してください。',
            '構成: intro, verse, pre-chorus, chorus（hook）。短いフレーズで、自然な韻や反復を適度に。',
            '表現: 過度に露骨な表現は避け、読みやすさとリズムを両立。',
            '',
            '題材メモ:',
            (text || '').trim(),
          ].join('\n');
        }
      }
      if (text) {
        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(text).catch(() => {});
        } else if (source && source.select) {
          try { source.select(); document.execCommand('copy'); } catch(_) {}
        }
      }

      const urls = {
        chatgpt: 'https://chat.openai.com/',
        gemini: 'https://gemini.google.com/app',
      };
      const url = urls[dest] || urls.chatgpt;
      window.open(url, '_blank', 'noopener');
    }
  });

  btn.addEventListener('click', () => {
    const raw = rawEl.value.trim();
    const diaryStyle = (diaryStyleEl && diaryStyleEl.value) || 'prose';
    const diary = PictureDiary.generateDiary(raw, { mode: diaryStyle });
    const { prompt } = PictureDiary.buildImagePrompt({
      rawText: raw,
      diary,
      style: styleEl.value,
      mood: moodEl ? moodEl.value : 'calm',
      aspect: aspectEl.value,
      detail: detailEl.value,
      includeTitle: !!(titleInImageEl && titleInImageEl.checked),
    });

    diaryEl.value = diary;
    promptEl.value = prompt;
    // Log image prompt generation
    try {
      PDLog && PDLog.add('image', {
        raw,
        diary,
        prompt,
        diaryStyle,
        style: styleEl && styleEl.value,
        mood: moodEl && moodEl.value,
        aspect: aspectEl && aspectEl.value,
        detail: detailEl && detailEl.value,
        includeTitle: !!(titleInImageEl && titleInImageEl.checked),
      });
      updateHistoryCount();
    } catch (_) {}
  });

  // --- Chat Wizard ---
  const diarySteps = [
    { key: 'time', q: 'いつの出来事？（朝/昼/夕方/夜など）' },
    { key: 'weather', q: '天気は？（晴れ/雨/曇り など）' },
    { key: 'place', q: 'どこで？（場所や雰囲気）' },
    { key: 'people', q: '誰と？（一人/友達/家族/同僚など）' },
    { key: 'event', q: '何をした？（印象的な出来事）' },
    { key: 'feeling', q: 'どう感じた？（感情・気づき）' },
    { key: 'detail', q: '色・音・匂いなど、覚えている細部は？' },
  ];

  const essaySteps = [
    { key: 'theme', q: 'エッセイのテーマは？（一言で）' },
    { key: 'audience', q: '誰に向けて書きますか？（読者像）' },
    { key: 'purpose', q: '何を伝えたい？主張を一言でどう言える？' },
    { key: 'hook', q: '冒頭のフック/導入のイメージは？（印象的な一文や出来事）' },
    { key: 'scene', q: '核となる具体的な場面は？（いつ/どこで/誰が/何を）' },
    { key: 'conflict', q: 'どんな葛藤・問題がありましたか？' },
    { key: 'turn', q: '転機や気づきは？どの瞬間に変化が起きた？' },
    { key: 'evidence', q: '根拠や具体例は？（数字・引用・エピソード）' },
    { key: 'sensory', q: '感覚描写を追加しましょう（色/音/匂い/手触り）' },
    { key: 'reflection', q: 'そこから得た学びは？' },
    { key: 'takeaway', q: '読者への持ち帰り（メッセージ）は？' },
    { key: 'tone', q: '文体や雰囲気は？（親しみ/静か/ユーモア/情熱的 など）' },
    { key: 'title', q: '仮タイトル案を1〜3つください' },
  ];

  const refineSteps = [
    { key: 'analogy', q: '比喩や対比を一つ加えるなら？' },
    { key: 'cut', q: '削れる冗長部分や言い換えたい表現は？' },
    { key: 'closing', q: '締めの一文をより強く（短く力強く）してみましょう。案は？' },
  ];

  const rapSteps = [
    { key: 'theme', q: '曲のテーマは？（一言で）' },
    { key: 'vibe', q: '雰囲気/ムードは？（例：ノスタルジック/夜/雨上がり）' },
    { key: 'persona', q: '語り手の視点やキャラは？' },
    { key: 'rhyme', q: '韻の方向性は？（末尾/内部/ゆるめ 等）' },
    { key: 'tempo', q: 'テンポ感は？（ゆっくり/ふつう/はやい）' },
    { key: 'imagery', q: '映像的な情景（色/匂い/音）をいくつか' },
    { key: 'wordplay', q: '言葉遊びや反復したいフレーズは？' },
    { key: 'hook', q: 'サビ/フックの核となる一行を' },
    { key: 'v1a', q: '1番A：出来事や情景（短句）' },
    { key: 'v1b', q: '1番B：内面/比喩（短句）' },
    { key: 'v2a', q: '2番A：別の情景（短句）' },
    { key: 'v2b', q: '2番B：締めに向けた流れ（短句）' },
  ];

  let state = { i: 0, answers: {}, phase: 'main' };

  function addMsg(text, who = 'assistant', opts) {
    const options = opts || {};
    const div = document.createElement('div');
    div.className = `msg ${who}`;
    if (options.compact) div.classList.add('compact');
    chatMessages.appendChild(div);
    ensureVisible(div);
    if (options.typing) {
      div.classList.add('typing');
      typeIn(div, String(text || ''), options.speed || 30, () => {
        div.classList.remove('typing');
        ensureVisible(div);
        if (typeof options.onDone === 'function') options.onDone();
      });
    } else {
      div.textContent = text;
      ensureVisible(div);
      if (typeof options.onDone === 'function') options.onDone();
    }
  }

  function typeIn(el, text, cps, done) {
    const interval = Math.max(14, Math.floor(1000 / Math.max(1, cps)));
    let i = 0;
    const timer = setInterval(() => {
      el.textContent = text.slice(0, i + 1);
      ensureVisible(el);
      i += 1;
      if (i >= text.length) {
        clearInterval(timer);
        if (done) done();
      }
    }, interval);
  }

  function ensureVisible(node) {
    try {
      chatMessages.scrollTop = chatMessages.scrollHeight;
      // Nudge page scroll if the container bottom is below viewport
      if (typeof node.scrollIntoView === 'function') {
        node.scrollIntoView({ block: 'nearest', inline: 'nearest' });
      }
    } catch (_) { /* noop */ }
  }

  function currentSteps() {
    const mode = chatModeEl ? chatModeEl.value : 'essay';
    if (mode === 'diary') return diarySteps;
    if (mode === 'rap') return rapSteps;
    return essaySteps;
  }

  function ask(withTypingFirst) {
    const steps = state.phase === 'main' ? currentSteps() : refineSteps;
    if (state.i < steps.length) {
      const useTyping = !!withTypingFirst;
      addMsg(
        steps[state.i].q,
        'assistant',
        useTyping ? { typing: true, speed: 36, compact: true } : undefined
      );
      chatInput.placeholder = '返信を入力（Enterで改行、Ctrl/⌘+Enterで送信）';
      chatInput.focus();
      refreshChatIdeas();
    } else {
      if (state.phase === 'main') {
        // move to refine loop
        state.phase = 'refine';
        state.i = 0;
        addMsg('基本項目は揃いました。さらに少し掘り下げます。終わるときは「終わり」と入力するか「まとめて生成」を押してください。', 'assistant');
        ask();
      } else {
        // loop refine steps again for continuous improvement
        state.i = 0;
        ask();
      }
    }
  }

  function restart() {
    state = { i: 0, answers: {}, phase: 'main' };
    chatMessages.innerHTML = '';
    chatInput.value = '';
    chatFinalize.disabled = true;
    const mode = chatModeEl ? chatModeEl.value : 'essay';
    const intro = mode === 'diary'
      ? '日記作成を手伝います。いくつか質問しますね。'
      : mode === 'rap'
        ? 'ラップの下書きを作ります。短いフレーズで答えてください。'
        : 'エッセイ作成を手伝います。テーマから順に質問します。';
    addMsg(intro, 'assistant', { typing: true, speed: 32, onDone: () => ask(true) });
  }

  let sending = false;
  let composing = false;

  function handleUserInput() {
    if (sending) return;
    if (composing) return; // avoid sending mid-IME composition
    let v = (chatInput.value || '').replace(/\s+$/g, '');
    if (!v) return;
    sending = true;
    addMsg(v, 'user');
    const steps = state.phase === 'main' ? currentSteps() : refineSteps;
    const step = steps[state.i];
    if (step) state.answers[step.key] = v;
    chatInput.value = '';
    state.i += 1;
    // Live compose into raw input
    rawEl.value = composeRawFromAnswers(state.answers, chatModeEl ? chatModeEl.value : 'essay');
    ask();
    // Ensure caret reset and state released
    chatInput.blur();
    setTimeout(() => { try { chatInput.setSelectionRange(0,0); chatInput.focus(); } catch(_){} sending = false; }, 0);
  }

  function undoLast() {
    if (state.i <= 0) return;
    // If finalize message is shown, remove it and disable finalize
    if (chatFinalize && !chatFinalize.disabled) {
      const last = chatMessages.lastElementChild;
      if (last && last.classList.contains('assistant')) {
        chatMessages.removeChild(last);
      }
      chatFinalize.disabled = true;
    }
    // Remove last assistant question (for next step) if present
    let lastNode = chatMessages.lastElementChild;
    if (lastNode && lastNode.classList.contains('assistant')) {
      chatMessages.removeChild(lastNode);
    }
    // Remove last user answer
    lastNode = chatMessages.lastElementChild;
    if (lastNode && lastNode.classList.contains('user')) {
      chatMessages.removeChild(lastNode);
    }
    // Roll back state and answers
    state.i = Math.max(0, state.i - 1);
    const key = steps[state.i] && steps[state.i].key;
    if (key && state.answers[key]) delete state.answers[key];
    // Re-ask current question
    rawEl.value = composeRawFromAnswers(state.answers);
    ask();
  }

  function skipStep() {
    // Show a subtle user marker to keep rhythm, but don't record an answer
    addMsg('（スキップ）', 'user', { compact: true });
    state.i = state.i + 1;
    ask();
  }

  function composeRawFromAnswers(a, mode) {
    if (mode === 'diary') {
      const parts = [];
      if (a.time || a.weather) parts.push(`${a.time || ''}、${a.weather || ''}`.replace(/^[、]+|、{2,}/g, ''));
      if (a.place) parts.push(`${a.place}で`);
      if (a.people) parts.push(`${a.people}と`);
      if (a.event) parts.push(`${a.event}`);
      if (a.detail) parts.push(`${a.detail}`);
      if (a.feeling) parts.push(`${a.feeling}`);
      return parts.filter(Boolean).join('。') + (parts.length ? '。' : '');
    }
    if (mode === 'rap') {
      const hook = a.hook || a.wordplay || a.theme || '';
      const vibe = [a.vibe, a.persona].filter(Boolean).join(' / ');
      const lines = [];
      if (hook) lines.push(`Hook) ${hook}`);
      const v1 = [a.v1a, a.v1b].filter(Boolean).join(' / ');
      if (v1) lines.push(`Verse1) ${v1}`);
      const v2 = [a.v2a, a.v2b].filter(Boolean).join(' / ');
      if (v2) lines.push(`Verse2) ${v2}`);
      if (vibe) lines.push(`Vibe) ${vibe}`);
      if (a.imagery) lines.push(`Imagery) ${a.imagery}`);
      if (a.rhyme) lines.push(`Rhyme) ${a.rhyme}`);
      if (a.tempo) lines.push(`Tempo) ${a.tempo}`);
      return lines.join('\n');
    }
    // essay draft
    const p1 = [a.hook, a.theme, a.purpose && `（狙い: ${a.purpose}）`, a.audience && `読者: ${a.audience}`]
      .filter(Boolean).join(' ');
    const p2 = [a.scene && `場面: ${a.scene}`, a.conflict && `葛藤: ${a.conflict}`, a.turn && `転機: ${a.turn}`]
      .filter(Boolean).join('。');
    const p3 = [a.evidence && `根拠/具体例: ${a.evidence}`, a.sensory && `感覚描写: ${a.sensory}`]
      .filter(Boolean).join('。');
    const p4 = [a.reflection && `学び: ${a.reflection}`, a.takeaway && `読者への持ち帰り: ${a.takeaway}`, a.tone && `文体: ${a.tone}`, a.analogy && `比喩/対比: ${a.analogy}`, a.cut && `削除/言い換え: ${a.cut}`, a.closing && `締め案: ${a.closing}`, a.title && `仮タイトル: ${a.title}`]
      .filter(Boolean).join('。');
    return [p1, p2, p3, p4].filter(s => s && s.trim()).join('\n\n');
  }

  if (chatSend) chatSend.addEventListener('click', () => {
    if (composing) return;
    handleUserInput();
    chatInput && chatInput.focus();
  });
  if (chatInput) chatInput.addEventListener('keydown', (e) => {
    // Ignore while IME composing (Japanese input, etc.)
    if (e.isComposing || composing) return;
    const isCtrlEnter = (e.ctrlKey || e.metaKey) && e.key === 'Enter';
    if (isCtrlEnter) {
      e.preventDefault();
      handleUserInput();
      return;
    }
    // Allow Enter for newline by default
  });
  if (chatFinalize) chatFinalize.addEventListener('click', () => {
    const raw = rawEl.value.trim();
    const diary = PictureDiary.generateDiary(raw, { mode: (diaryStyleEl && diaryStyleEl.value) || 'prose' });
    const { prompt } = PictureDiary.buildImagePrompt({
      rawText: raw,
      diary,
      style: styleEl.value,
      mood: moodEl ? moodEl.value : 'calm',
      aspect: aspectEl.value,
      detail: detailEl.value,
      includeTitle: !!(titleInImageEl && titleInImageEl.checked),
    });
    diaryEl.value = diary;
    promptEl.value = prompt;
    // Log chat finalize as image prompt with answers
    try {
      PDLog && PDLog.add('chat-finalize', {
        answers: state && state.answers,
        mode: chatModeEl && chatModeEl.value,
        diaryStyle: (diaryStyleEl && diaryStyleEl.value) || 'prose',
        diary,
        prompt,
      });
      updateHistoryCount();
    } catch (_) {}
  });
  if (chatRestart) chatRestart.addEventListener('click', restart);
  if (chatUndo) chatUndo.addEventListener('click', undoLast);
  if (chatSkip) chatSkip.addEventListener('click', skipStep);
  if (chatModeEl) chatModeEl.addEventListener('change', () => restart());

  // --- Chat Ideas (suggestions) ---
  function sample(arr, n = 3) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
    return a.slice(0, n);
  }
  const SUGGEST = {
    diary: {
      time: ['朝', '昼', '夕方', '夜', '深夜'],
      weather: ['晴れ', '曇り', '小雨', '雨上がり', '強風'],
      place: ['駅前', '川沿い', '公園', 'カフェ', 'オフィス'],
      people: ['一人で', '友達と', '家族と', '同僚と', '知らない人たちと'],
      event: ['散歩した', '新しい店に入った', '小さな失敗をした', '良い知らせが来た', '遠回りをした'],
      feeling: ['少し嬉しい', '胸が静か', '疲れたけど前向き', '不思議と落ち着く', '懐かしい気持ち'],
      detail: ['赤い傘', '濡れた路面の反射', 'コーヒーの香り', 'ネオンのにじみ', '鳥のさえずり'],
    },
    essay: {
      theme: ['静けさについて', '時間の使い方', '都会の孤独', '小さな親切', '習慣の力'],
      audience: ['自分と同じ悩みの人に', '若い読者に', '未来の自分に', '親しい友人に', '初めての読者に'],
      purpose: ['気づきを共有したい', '考えを整理したい', '行動のきっかけを渡したい', '違和感を言語化したい'],
      hook: ['雨上がりの夕方、ふと立ち止まった。', 'あの時の沈黙が忘れられない。', 'ポケットの中に、折りたたんだメモがある。'],
      scene: ['終電前の駅で', '小さな公園のベンチで', 'いつもの信号待ちで', '窓辺の机で'],
      conflict: ['急ぐ気持ちと立ち止まりたい気持ち', '正しさとやさしさ', '効率と余白'],
      turn: ['見上げた瞬間に気づいた', '返ってきた一言に救われた', 'やめてみたら続いた'],
      evidence: ['数字は弱いが実感がある', '友人の事例', '失敗の記録'],
      sensory: ['湿った空気', '青い匂い', '街の遠いざわめき'],
      reflection: ['急がない日を増やしたい', '余白は余裕を生む', '小さな揺らぎを認めたい'],
      takeaway: ['読む人の明日が少し軽くなること', '選択肢は一つじゃないこと'],
      tone: ['静かに', '親しみを込めて', '少しユーモアを混ぜて'],
      title: ['雨上がりの手紙', '信号待ちの余白', '窓辺の青'],
    },
    rap: {
      theme: ['everyday life', 'city night', 'way home', 'afterglow', 'lo-fi rain'],
      vibe: ['nostalgic', 'dreamy', 'calm', 'rainy', 'night'],
      persona: ['静かな語り手', '迷いを抱えた自分', '街を見下ろす視点'],
      rhyme: ['末尾の韻で', '内部韻多め', 'ゆるめで'],
      tempo: ['ゆっくり', 'ふつう', 'はやい'],
      imagery: ['濡れた路地 / ネオン / 靴音', '淡い街灯 / テープの揺れ', '駅のアナウンス / 風の音'],
      wordplay: ['after / afterglow', 'light / night', 'rain / remain'],
      hook: ['今日はまだ終わらない', '静かな街に灯る', 'way home, we keep moving'],
      v1a: ['帰り道、傘のしずく', '胸の奥、そっと揺れる'],
      v1b: ['遠くのビートと呼吸を合わせる', '過去の自分に手を振る'],
      v2a: ['濡れたアスファルトが光る', '信号はまだ青にならない'],
      v2b: ['歩幅を合わせてほどける不安', '少しだけ未来に寄りかかる'],
    }
  };
  function getCurrentStepKey() {
    const steps = state.phase === 'main' ? currentSteps() : refineSteps;
    const step = steps[state.i];
    return step && step.key;
  }
  function refreshChatIdeas() {
    if (!chatIdeas) return;
    const mode = chatModeEl ? chatModeEl.value : 'essay';
    const key = getCurrentStepKey();
    const pool = (SUGGEST[mode] && SUGGEST[mode][key]) || [];
    const picks = sample(pool, 4);
    chatIdeas.innerHTML = '';
    for (const p of picks) {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'chip ghost';
      b.textContent = p;
      b.addEventListener('click', () => {
        if (chatInput) chatInput.value = p;
        handleUserInput();
      });
      chatIdeas.appendChild(b);
    }
  }
  if (chatIdeasRefresh) chatIdeasRefresh.addEventListener('click', refreshChatIdeas);

  // Boot chat if present
  if (chatMessages) {
    restart();
  }

  // Keyboard: Ctrl/Cmd+Z in chat input to undo last step when empty
  if (chatInput) {
    chatInput.addEventListener('compositionstart', () => { composing = true; });
    chatInput.addEventListener('compositionend', () => { composing = false; });
    chatInput.addEventListener('keydown', (e) => {
      // quick stop word to finish refining
      if (!e.isComposing && (e.key === 'Enter') && (e.ctrlKey || e.metaKey)) {
        const v = chatInput.value.trim();
        if (v === '終わり' || v.toLowerCase() === '/end') {
          e.preventDefault();
          chatInput.value = '';
          chatFinalize.disabled = false;
          addMsg('OK。まとめて生成できます。必要ならそのまま「まとめて生成」を押してください。', 'assistant');
          return;
        }
      }
      const isUndo = (e.ctrlKey || e.metaKey) && (e.key === 'z' || e.key === 'Z');
      if (isUndo) {
        if (!chatInput.value) {
          e.preventDefault();
          undoLast();
        }
      }
    });
  }

  // --- Music prompt wiring ---
  function generateMusic() {
    const theme = (musicThemeEl && musicThemeEl.value) || '';
    const mood = (musicMoodEl && musicMoodEl.value) || 'nostalgic';
    const genre = (musicGenreEl && musicGenreEl.value) || 'citypop';
    const vocal = (musicVocalEl && musicVocalEl.value) || 'sing';
    const language = (musicLangEl && musicLangEl.value) || 'ja';
    const tone = (musicToneEl && musicToneEl.value) || 'introspective';
    const tempo = (musicTempoEl && musicTempoEl.value) || 'mid';
    const { prompt, ideas, toneLabel } = MusicPrompt.buildMusicPrompt({ theme, mood, genre, vocal, language, tempo, tone });
    if (musicOutEl) musicOutEl.value = prompt;
    if (lyricOutEl) lyricOutEl.value = (toneLabel ? `トーン: ${toneLabel.jp} / tone: ${toneLabel.en}\n` : '') + ideas.join('\n');
    // Log music prompt generation
    try {
      PDLog && PDLog.add('music', { theme, mood, genre, vocal, language, tempo, tone, prompt });
      updateHistoryCount();
    } catch (_) {}
  }
  if (musicGenerateBtn) musicGenerateBtn.addEventListener('click', generateMusic);
  // Live theme -> English preview
  const musicThemePreview = document.getElementById('musicThemePreview');
  function updateThemePreview() {
    if (!musicThemePreview) return;
    const en = MusicPrompt && MusicPrompt.themeToEnglish ? MusicPrompt.themeToEnglish(musicThemeEl.value || '') : '';
    musicThemePreview.textContent = `English keywords: ${en || '—'}`;
  }
  function parseThemeTokens() {
    const cur = (musicThemeEl && musicThemeEl.value) || '';
    return cur.split('/').map(s => s.trim()).filter(Boolean);
  }
  function updateThemeChipsActive() {
    const tokens = new Set(parseThemeTokens());
    const all = document.querySelectorAll('#musicThemeChips [data-theme]');
    all.forEach(btn => {
      const v = btn.getAttribute('data-theme');
      if (tokens.has(v)) btn.classList.add('active'); else btn.classList.remove('active');
    });
  }
  function setThemeTokens(tokens) {
    if (musicThemeEl) musicThemeEl.value = tokens.join(' / ');
    updateThemePreview();
    updateThemeChipsActive();
  }
  if (musicThemeEl) {
    musicThemeEl.addEventListener('input', updateThemePreview);
    // initialize
    updateThemePreview();
    updateThemeChipsActive();
  }
  if (musicThemeClear) {
    musicThemeClear.addEventListener('click', () => {
      setThemeTokens([]);
      musicThemeEl && musicThemeEl.focus();
    });
  }
  // Theme chips: click to set/append
  const musicThemeChips = document.getElementById('musicThemeChips');
  if (musicThemeChips) {
    musicThemeChips.addEventListener('click', (e) => {
      const t = e.target;
      if (t && t.matches('button[data-theme]')) {
        const v = t.getAttribute('data-theme') || '';
        const tokens = parseThemeTokens();
        const idx = tokens.indexOf(v);
        if (idx >= 0) tokens.splice(idx, 1); else tokens.push(v);
        setThemeTokens(tokens);
      }
    });
  }
  const chips = document.getElementById('musicGenreChips');
  function updateGenreUI() {
    const current = (musicGenreEl && musicGenreEl.value) || '';
    const all = document.querySelectorAll('#musicGenreChips [data-genre], #musicCustomChips [data-genre]');
    all.forEach(btn => {
      const v = btn.getAttribute('data-genre');
      if (v === current) {
        btn.classList.add('active');
        btn.setAttribute('aria-pressed', 'true');
      } else {
        btn.classList.remove('active');
        btn.setAttribute('aria-pressed', 'false');
      }
    });
  }
  function setGenre(value) {
    if (musicGenreEl) musicGenreEl.value = value;
    updateGenreUI();
    generateMusic();
  }
  if (chips) {
    chips.addEventListener('click', (e) => {
      const t = e.target;
      if (t && t.matches('button[data-genre]')) {
        const g = t.getAttribute('data-genre');
        setGenre(g);
      }
    });
  }
  if (musicCustomChips) {
    musicCustomChips.addEventListener('click', (e) => {
      const t = e.target;
      if (t && t.matches('button[data-genre]')) {
        const g = t.getAttribute('data-genre');
        setGenre(g);
      }
    });
  }
  // Quick presets for Suno-style music
  const musicQuickPresets = document.getElementById('musicQuickPresets');
  const musicPresetLabel = document.getElementById('musicPresetLabel');
  const MUSIC_PRESETS = {
    lofi_night: { genre: 'lofi', mood: 'night', vocal: 'rap', language: 'ja', tempo: 'mid', tone: 'introspective', theme: '夜散歩 / 雨上がり' },
    city_afterglow: { genre: 'citypop', mood: 'nostalgic', vocal: 'sing', language: 'ja', tempo: 'mid', tone: 'romantic', theme: '都会 / 余韻' },
    trap_rain: { genre: 'trap', mood: 'rainy', vocal: 'rap', language: 'ja', tempo: 'fast', tone: 'punchy', theme: '雨 / 都会の夜' },
    acoustic_morning: { genre: 'acoustic', mood: 'sunny', vocal: 'sing', language: 'ja', tempo: 'slow', tone: 'minimal', theme: '朝 / 窓辺' },
    jazz_cafe: { genre: 'jazz', mood: 'cozy', vocal: 'sing', language: 'mix', tempo: 'slow', tone: 'poetic', theme: 'カフェ / 雨音' },
    bossa_sunset: { genre: 'bossa', mood: 'warm', vocal: 'sing', language: 'ja', tempo: 'slow', tone: 'romantic', theme: '夕暮れ / 海辺' },
  };
  function setMusicPresetName(name) {
    if (!musicPresetLabel) return;
    musicPresetLabel.textContent = name ? `現在のプリセット: ${name}` : '';
  }
  function applyMusicPreset(key) {
    if (key === 'clear') {
      if (musicThemeEl) musicThemeEl.value = '';
      if (musicGenreEl) musicGenreEl.value = 'citypop';
      if (musicMoodEl) musicMoodEl.value = 'nostalgic';
      if (musicVocalEl) musicVocalEl.value = 'sing';
      if (musicLangEl) musicLangEl.value = 'ja';
      if (musicTempoEl) musicTempoEl.value = 'mid';
      if (musicToneEl) musicToneEl.value = 'introspective';
      setMusicPresetName('（既定）');
      updateThemePreview();
      updateGenreUI();
      generateMusic();
      return;
    }
    if (key === 'random') {
      const keys = Object.keys(MUSIC_PRESETS);
      key = keys[Math.floor(Math.random() * keys.length)];
    }
    const p = MUSIC_PRESETS[key];
    if (!p) return;
    if (musicThemeEl) musicThemeEl.value = p.theme || '';
    if (musicGenreEl) musicGenreEl.value = p.genre;
    if (musicMoodEl) musicMoodEl.value = p.mood;
    if (musicVocalEl) musicVocalEl.value = p.vocal;
    if (musicLangEl) musicLangEl.value = p.language;
    if (musicTempoEl) musicTempoEl.value = p.tempo;
    if (musicToneEl) musicToneEl.value = p.tone;
    const btn = musicQuickPresets && musicQuickPresets.querySelector(`[data-preset='${key}']`);
    setMusicPresetName(btn ? btn.textContent : key);
    updateThemePreview();
    updateGenreUI();
    generateMusic();
  }
  if (musicQuickPresets) {
    musicQuickPresets.addEventListener('click', (e) => {
      const t = e.target;
      if (t && t.matches('button[data-preset]')) {
        const k = t.getAttribute('data-preset');
        applyMusicPreset(k);
      }
    });
  }
  if (presetAddBtn) {
    presetAddBtn.addEventListener('click', () => {
      const key = (presetKeyEl && presetKeyEl.value || '').trim();
      const name = (presetNameEl && presetNameEl.value || '').trim();
      const instr = (presetInstrEl && presetInstrEl.value || '').trim();
      const bpm = (presetBpmEl && presetBpmEl.value || '').trim();
      if (!key) return;
      // Normalize key to match MusicPrompt's internal normalization
      const norm = key.toLowerCase().replace(/\s+/g, '-');
      MusicPrompt.addGenre(norm, { jp: name || key, en: name || key, instr, bpm });
      // Ensure the select has an option for the new genre (for clarity)
      if (musicGenreEl && !Array.from(musicGenreEl.options).some(o => o.value === norm)) {
        const opt = document.createElement('option');
        opt.value = norm;
        opt.textContent = name || key;
        musicGenreEl.appendChild(opt);
      }
      // Add a chip dynamically
      const btn = document.createElement('button');
      btn.className = 'chip';
      btn.setAttribute('data-genre', norm);
      btn.textContent = name || key;
      (musicCustomChips || chips || document.body).appendChild(btn);
      setGenre(norm);
      // try bring into view
      try { btn.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'nearest' }); } catch(_) {}
      // Clear inputs
      if (presetKeyEl) presetKeyEl.value = '';
      if (presetNameEl) presetNameEl.value = '';
      if (presetInstrEl) presetInstrEl.value = '';
      if (presetBpmEl) presetBpmEl.value = '';
    });
  }
  if (musicGenreEl) musicGenreEl.addEventListener('change', updateGenreUI);
  // Initialize selection highlight on load
  updateGenreUI();

  // Diary style quick chips
  function updateDiaryStyleUI() {
    const cur = (diaryStyleEl && diaryStyleEl.value) || 'prose';
    const all = document.querySelectorAll('[data-diary-style]');
    all.forEach(btn => {
      const v = btn.getAttribute('data-diary-style');
      if (v === cur) btn.classList.add('active'); else btn.classList.remove('active');
    });
  }
  function recomputeDiaryForStyle() {
    if (!diaryEl) return;
    const raw = rawEl ? rawEl.value.trim() : '';
    const diaryStyle = (diaryStyleEl && diaryStyleEl.value) || 'prose';
    const diary = PictureDiary.generateDiary(raw, { mode: diaryStyle });
    diaryEl.value = diary;
  }
  if (diaryStyleEl) diaryStyleEl.addEventListener('change', updateDiaryStyleUI);
  if (diaryStyleChips) {
    diaryStyleChips.addEventListener('click', (e) => {
      const t = e.target;
      if (t && t.matches('button[data-diary-style]')) {
        const v = t.getAttribute('data-diary-style');
        if (diaryStyleEl) diaryStyleEl.value = v;
        updateDiaryStyleUI();
        recomputeDiaryForStyle();
      }
    });
  }
  if (diaryStyleChips2) {
    diaryStyleChips2.addEventListener('click', (e) => {
      const t = e.target;
      if (t && t.matches('button[data-diary-style]')) {
        const v = t.getAttribute('data-diary-style');
        if (diaryStyleEl) diaryStyleEl.value = v;
        updateDiaryStyleUI();
        recomputeDiaryForStyle();
      }
    });
  }
  if (diaryStyleEl) diaryStyleEl.addEventListener('change', () => {
    updateDiaryStyleUI();
    recomputeDiaryForStyle();
  });
  updateDiaryStyleUI();
  
  // --- History export/clear controls ---
  function updateHistoryCount() {
    const el = document.getElementById('historyCount');
    if (!el || !window.PDLog) return;
    try {
      el.textContent = `保存件数: ${PDLog.count()} 件（この端末内）`;
    } catch (_) {}
  }
  function downloadText(filename, text) {
    try {
      const blob = new Blob([text], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      setTimeout(() => { document.body.removeChild(a); URL.revokeObjectURL(url); }, 0);
    } catch (_) {}
  }
  const historyExportBtn = document.getElementById('historyExport');
  const historyClearBtn = document.getElementById('historyClear');
  if (historyExportBtn) {
    historyExportBtn.addEventListener('click', () => {
      if (!window.PDLog) return;
      const json = PDLog.exportJson(true);
      const ts = new Date().toISOString().replace(/[:.]/g, '-');
      downloadText(`picture-diary-history-${ts}.json`, json);
    });
  }
  if (historyClearBtn) {
    historyClearBtn.addEventListener('click', () => {
      if (!window.PDLog) return;
      const ok = confirm('履歴をすべて消去しますか？この操作は取り消せません。');
      if (ok) {
        PDLog.clear();
        updateHistoryCount();
      }
    });
  }
  // initialize count on load
  updateHistoryCount();

  // Create PNG favicon/touch icons dynamically (fallbacks in addition to SVG)
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', ensurePngIcons);
  } else {
    ensurePngIcons();
  }
})();
