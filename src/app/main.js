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
  const titleInImageEl = $('#titleInImage');
  const moodEl = $('#mood');
  // Music elements
  const musicThemeEl = $('#musicTheme');
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
      // Ensure we have a prompt; generate if empty
      if (!promptEl.value.trim()) {
        const raw = rawEl.value.trim();
        const diary = PictureDiary.generateDiary(raw);
        const result = PictureDiary.buildImagePrompt({
          rawText: raw,
          diary,
          style: styleEl.value,
          mood: (typeof moodEl !== 'undefined' && moodEl) ? moodEl.value : 'calm',
          aspect: aspectEl.value,
          detail: detailEl.value,
          includeTitle: !!(titleInImageEl && titleInImageEl.checked),
        });
        diaryEl.value = diary;
        promptEl.value = result.prompt;
      }
      const text = promptEl.value;
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).catch(() => {});
      } else {
        promptEl.select();
        document.execCommand('copy');
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
    const diary = PictureDiary.generateDiary(raw);
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

  let state = { i: 0, answers: {}, phase: 'main' };

  function addMsg(text, who = 'assistant') {
    const div = document.createElement('div');
    div.className = `msg ${who}`;
    div.textContent = text;
    chatMessages.appendChild(div);
    chatMessages.scrollTop = chatMessages.scrollHeight;
  }

  function currentSteps() {
    const mode = chatModeEl ? chatModeEl.value : 'essay';
    return mode === 'diary' ? diarySteps : essaySteps;
  }

  function ask() {
    const steps = state.phase === 'main' ? currentSteps() : refineSteps;
    if (state.i < steps.length) {
      addMsg(steps[state.i].q, 'assistant');
      chatInput.placeholder = '返信を入力（Enterで改行、Ctrl/⌘+Enterで送信）';
      chatInput.focus();
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
    addMsg(mode === 'diary' ? '日記作成を手伝います。いくつか質問しますね。' : 'エッセイ作成を手伝います。テーマから順に質問します。', 'assistant');
    ask();
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
    const diary = PictureDiary.generateDiary(raw);
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
  });
  if (chatRestart) chatRestart.addEventListener('click', restart);
  if (chatUndo) chatUndo.addEventListener('click', undoLast);
  if (chatModeEl) chatModeEl.addEventListener('change', () => restart());

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
  }
  if (musicGenerateBtn) musicGenerateBtn.addEventListener('click', generateMusic);
  const chips = document.getElementById('musicGenreChips');
  if (chips) {
    chips.addEventListener('click', (e) => {
      const t = e.target;
      if (t && t.matches('button[data-genre]')) {
        const g = t.getAttribute('data-genre');
        if (musicGenreEl) musicGenreEl.value = g;
        generateMusic();
      }
    });
  }
  if (musicCustomChips) {
    musicCustomChips.addEventListener('click', (e) => {
      const t = e.target;
      if (t && t.matches('button[data-genre]')) {
        const g = t.getAttribute('data-genre');
        if (musicGenreEl) musicGenreEl.value = g;
        generateMusic();
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
      MusicPrompt.addGenre(key, { jp: name || key, en: name || key, instr, bpm });
      // Add a chip dynamically
      const btn = document.createElement('button');
      btn.className = 'chip';
      btn.setAttribute('data-genre', key.toLowerCase());
      btn.textContent = name || key;
      (musicCustomChips || chips || document.body).appendChild(btn);
      if (musicGenreEl) musicGenreEl.value = key.toLowerCase();
      generateMusic();
      // Clear inputs
      if (presetKeyEl) presetKeyEl.value = '';
      if (presetNameEl) presetNameEl.value = '';
      if (presetInstrEl) presetInstrEl.value = '';
      if (presetBpmEl) presetBpmEl.value = '';
    });
  }

  // Create PNG favicon/touch icons dynamically (fallbacks in addition to SVG)
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', ensurePngIcons);
  } else {
    ensurePngIcons();
  }
})();
