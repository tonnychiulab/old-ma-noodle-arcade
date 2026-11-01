import { Client, type Room } from '@colyseus/sdk';
import { firstBatch, games, gameById, type GameSpec } from './games/catalog';
import './style.css';

type Save = { bestSingle: Record<string, number>; bestMultiplayer: Record<string, number>; played: string[]; wins: number };
const SAVE_KEY = 'old-ma-arcade-v2';
const BRAND = '老馬麵攤製作：台灣夜市街機 30 合 1';
const PUBLIC_BASE = import.meta.env.BASE_URL;
const app = document.querySelector<HTMLDivElement>('#app')!;
const serverUrl = import.meta.env.VITE_ROOM_SERVER_URL as string | undefined;
let room: Room | null = null;
let roomIsHost = false;
let selected: GameSpec | null = null;
let save: Save = readSave();
let loadingRetry: (() => void) | null = null;
let loadingHadError = false;
let loadingAssetTitle = '';

function readSave(): Save {
  try {
    const value = JSON.parse(localStorage.getItem(SAVE_KEY) ?? localStorage.getItem('old-ma-arcade-v1') ?? '{}') as Partial<Save>;
    return { bestSingle: value.bestSingle ?? (value as unknown as { best?: Record<string, number> }).best ?? {}, bestMultiplayer: value.bestMultiplayer ?? {}, played: value.played ?? [], wins: value.wins ?? 0 };
  } catch { return { bestSingle: {}, bestMultiplayer: {}, played: [], wins: 0 }; }
}
function persist() { try { localStorage.setItem(SAVE_KEY, JSON.stringify(save)); } catch { toast('無法儲存本機紀錄，請檢查瀏覽器儲存空間。'); } }
function toast(message: string) {
  const node = document.querySelector<HTMLElement>('#toast');
  if (!node) return;
  node.textContent = message; node.classList.add('show');
  window.setTimeout(() => node.classList.remove('show'), 3200);
}

function render() {
  app.innerHTML = `
    <div class="shell">
      <header class="topbar"><a class="brand" href="#home" aria-label="回到遊戲大廳"><span class="brand-mark">老馬</span><span><strong>老馬麵攤</strong><small>街頭遊戲場</small></span></a><div class="top-actions"><span class="credit">v${__APP_VERSION__}</span><button class="sound-toggle" id="sound-toggle" aria-label="切換音效">♫ 音效關</button></div></header>
      <main id="home-view">
        <section class="hero"><div class="hero-lights"><i></i><i></i><i></i></div><div class="hero-copy"><p class="eyebrow">TAIWAN NIGHT MARKET ARCADE</p><h1 class="brand-title">${BRAND}</h1><p>投個代幣，今晚玩到打烊。</p><div class="hero-buttons"><button class="primary" id="scroll-games">開始逛夜市 <span>↓</span></button><button class="secondary" id="multiplayer-open">好友開房間 <span>↗</span></button></div><div class="author-disclosure"><b>共同作者：老馬麵攤製作 × GPT-6 Luna</b><span>企劃與程式製作使用模型：GPT-6 Luna</span><strong>v${__APP_VERSION__}</strong></div></div><div class="hero-stall"><div class="stall-sign">老馬麵攤</div><div class="steam">∿　∿　∿</div><div class="stall-counter"><span>🍜</span><span>🥢</span><span>🏮</span></div><div class="stall-wheel">✦</div></div><div class="arcade-ticket">INSERT<br/>COIN <b>▶</b></div></section>
        <section class="stats"><div><strong>${games.length}</strong><span>款街頭遊戲</span></div><div><strong>${save.played.length}</strong><span>玩過的遊戲</span></div><div><strong>${save.wins}</strong><span>達成成就</span></div><div class="progress-wrap"><span>夜市熟客進度</span><div class="progress"><i style="width:${Math.min(100, save.played.length / games.length * 100)}%"></i></div></div></section>
        <section class="catalog" id="catalog"><div class="section-head"><div><p class="eyebrow">PICK YOUR GAME</p><h2>今晚玩哪攤？</h2><p class="section-note">六批夜市街機遊戲，點選已開放的攤位開始玩。</p></div><div class="filters" role="group" aria-label="遊戲篩選"><button class="filter active" data-filter="all">全部 30</button><button class="filter" data-filter="ready">已開張 ${games.filter((g) => g.available).length}</button><button class="filter" data-filter="online">可連線</button></div></div><div class="game-grid">${games.map(gameCard).join('')}</div></section>
        <section class="achievements"><div><p class="eyebrow">LOCAL SAVE</p><h2>熟客集點簿</h2><p>成績與遊玩紀錄只存放在這台裝置的瀏覽器。</p></div><div class="achievement-badges">${achievementBadges()}</div></section>
        <footer><span>${BRAND} · v${__APP_VERSION__}</span><span>像素有點糊，回憶剛剛好。</span></footer>
      </main>
      <section id="play-view" class="play-view hidden"><div class="playbar"><button id="back-home" class="icon-button">← 回大廳</button><div><strong id="playing-title"></strong><span id="playing-hint"></span></div><div class="playing-score">得分 <b id="score">0</b><span>最佳 <b id="best-score">0</b></span></div><button id="multiplayer-ready" class="icon-button hidden">準備好</button><button id="multiplayer-start" class="icon-button hidden">開始對戰</button><button id="restart" class="icon-button">↻ 再玩一次</button></div><p class="rotate-hint">↻ 轉成橫向畫面，玩起來更過癮</p><p id="live-prompt" class="live-prompt" aria-live="polite">看清楚目標，準備開局！</p><div id="room-board" class="room-board hidden" aria-live="polite"></div><div class="game-stage"><div id="game-canvas"></div><div id="result-panel" class="result-panel hidden"><p class="eyebrow">ROUND COMPLETE</p><h2>收攤囉！</h2><p id="result-copy"></p><div class="hero-buttons"><button class="primary" id="result-retry">再來一局</button><button class="secondary" id="result-home">回大廳</button></div></div></div><div class="touch-controls" aria-label="觸控操作"></div><p class="play-credit">老馬麵攤製作 × GPT-6 Luna　·　v${__APP_VERSION__}</p></section>
      <div id="loading" class="loading-screen"><div class="loading-card"><div class="loading-logo">老馬<br/>麵攤</div><p class="eyebrow">TAIWAN NIGHT MARKET ARCADE</p><h2>Loading<span class="dots">...</span></h2><div class="loading-track"><i id="loading-progress" class="indeterminate"></i></div><p id="loading-label">正在載入街機引擎…</p><small>老馬麵攤製作</small><button id="loading-retry" class="secondary hidden">重新載入</button></div></div>
      <dialog id="room-dialog"><form method="dialog" class="room-form"><button class="close-dialog" value="cancel" aria-label="關閉">×</button><p class="eyebrow">PLAY TOGETHER</p><h2>約朋友來夜市</h2><label>你的暱稱<input id="nickname" maxlength="12" placeholder="例如：麵攤熟客" required /></label><label>房間代碼 <span class="optional">加入房間才需要</span><input id="room-code" maxlength="12" placeholder="建立房間可留空" /></label><p id="room-status" class="room-status">一間房最多 4 位玩家。</p><div class="room-actions"><button type="button" class="secondary" id="join-room">加入朋友房間</button><button type="button" class="primary" id="create-room">建立新房間</button></div></form></dialog>
      <div id="toast" class="toast" role="status"></div>
    </div>`;
  bindUI();
}

function gameCard(game: GameSpec) {
  const best = save.bestSingle[game.id] ?? 0;
  return `<article class="game-card ${game.available ? '' : 'locked'}" data-game="${game.id}" data-online="${game.multiplayer}" data-ready="${game.available}" style="--accent:${game.color}"><div class="card-art art-${game.id}"><span class="art-number">${String(games.indexOf(game) + 1).padStart(2, '0')}</span><img class="art-icon" src="${PUBLIC_BASE}assets/games/${game.id}/icons/${game.id}.svg" alt="${game.title} 圖示" loading="lazy"/><span class="pixel-spark">✦</span>${!game.available ? '<span class="coming-tag">即將開張</span>' : ''}</div><div class="card-body"><div class="card-title"><h3>${game.title}</h3>${game.multiplayer ? '<span class="online-tag">2–4人</span>' : ''}</div><p>${game.tagline}</p><div class="card-foot"><span>${game.available ? `最高 ${best}` : '後續批次'}</span><span class="card-actions">${game.multiplayer ? '<button class="room-button">開房</button>' : ''}<button class="play-button" ${game.available ? '' : 'disabled'} aria-label="${game.available ? `開始${game.title}` : `${game.title}尚未開放`}">${game.available ? '單人玩　↗' : '準備中'}</button></span></div></div></article>`;
}

function achievementBadges() {
  const items = [ ['🎟️', '第一張代幣', save.played.length >= 1], ['🏮', '夜市熟面孔', save.played.length >= 6], ['🥇', '破紀錄啦', Object.values(save.bestSingle).some((score) => score >= 50) || Object.values(save.bestMultiplayer).some((score) => score >= 50)] ] as const;
  return items.map(([icon, title, unlocked]) => `<div class="badge ${unlocked ? 'unlocked' : ''}"><span>${icon}</span><small>${title}</small></div>`).join('');
}

function bindUI() {
  document.querySelector('#scroll-games')?.addEventListener('click', () => document.querySelector('#catalog')?.scrollIntoView({ behavior: 'smooth' }));
  document.querySelector('#multiplayer-open')?.addEventListener('click', openRoomDialog);
  document.querySelectorAll<HTMLButtonElement>('.room-button').forEach((button) => button.addEventListener('click', () => {
    const game = gameById(button.closest<HTMLElement>('.game-card')?.dataset.game ?? '');
    if (game) selected = game;
    openRoomDialog();
  }));
  document.querySelector('#room-dialog .close-dialog')?.addEventListener('click', () => (document.querySelector<HTMLDialogElement>('#room-dialog')!).close());
  document.querySelectorAll<HTMLButtonElement>('.filter').forEach((button) => button.addEventListener('click', () => {
    document.querySelectorAll('.filter').forEach((item) => item.classList.remove('active')); button.classList.add('active');
    document.querySelectorAll<HTMLElement>('.game-card').forEach((card) => { const filter = button.dataset.filter; card.classList.toggle('filtered-out', filter === 'ready' && card.dataset.ready !== 'true' || filter === 'online' && card.dataset.online !== 'true'); });
  }));
  document.querySelectorAll<HTMLButtonElement>('.play-button:not(:disabled)').forEach((button) => button.addEventListener('click', () => {
    const card = button.closest<HTMLElement>('.game-card'); const game = gameById(card?.dataset.game ?? ''); if (game) openGame(game);
  }));
  document.querySelector('#back-home')?.addEventListener('click', closeGame);
  document.querySelector('#restart')?.addEventListener('click', () => selected && startGame(selected));
  document.querySelector('#result-retry')?.addEventListener('click', () => {
    if (room) { document.querySelector('#result-panel')?.classList.add('hidden'); room.send('ready', { ready: true }); document.querySelector('#multiplayer-ready')?.classList.remove('hidden'); }
    else if (selected) startGame(selected);
  });
  document.querySelector('#result-home')?.addEventListener('click', closeGame);
  document.querySelectorAll<HTMLButtonElement>('.touch-controls button').forEach((button) => {
    const act = (event: Event) => { event.preventDefault(); window.dispatchEvent(new CustomEvent('arcade:action', { detail: { action: button.dataset.action } })); };
    button.addEventListener('pointerdown', act);
  });
  document.querySelector('#create-room')?.addEventListener('click', () => connectRoom('create'));
  document.querySelector('#join-room')?.addEventListener('click', () => connectRoom('join'));
  document.querySelector('#sound-toggle')?.addEventListener('click', (event) => { const button = event.currentTarget as HTMLButtonElement; const enabled = button.dataset.enabled === 'true'; button.dataset.enabled = String(!enabled); button.textContent = enabled ? '♫ 音效關' : '♫ 音效開'; window.dispatchEvent(new CustomEvent('arcade:audio', { detail: { enabled: !enabled } })); toast(enabled ? '音效已關閉' : '音效已開啟'); });
  window.addEventListener('arcade:score', (event) => {
    const detail = (event as CustomEvent<{ score: number; timeLeft: number; impact?: boolean }>).detail;
    const score = document.querySelector<HTMLElement>('#score'); if (score) { score.textContent = String(detail.score); if (detail.impact) { score.classList.remove('score-pop'); void score.offsetWidth; score.classList.add('score-pop'); } }
  });
  window.addEventListener('arcade:prompt', (event) => {
    const prompt = document.querySelector<HTMLElement>('#live-prompt');
    if (prompt) prompt.textContent = (event as CustomEvent<{ prompt: string }>).detail.prompt;
  });
  window.addEventListener('arcade:network-input', (event) => {
    const detail = (event as CustomEvent<{ action: string; aim: number }>).detail;
    room?.send('input', { action: detail.action, aim: detail.aim });
  });
  window.addEventListener('arcade:finish', (event) => {
    const detail = (event as CustomEvent<{ gameId: string; score: number; multiplayer?: boolean; leaderboard?: Array<{ nickname: string; score: number }> }>).detail;
    save.played = Array.from(new Set([...save.played, detail.gameId]));
    const best = detail.multiplayer ? save.bestMultiplayer : save.bestSingle;
    if (detail.score > (best[detail.gameId] ?? 0)) best[detail.gameId] = detail.score;
    save.wins = Number(save.played.length >= 1) + Number(save.played.length >= 6) + Number(Object.values(save.bestSingle).some((score) => score >= 50) || Object.values(save.bestMultiplayer).some((score) => score >= 50));
    persist();
    const copy = document.querySelector('#result-copy');
    if (copy && detail.leaderboard?.length) {
      const topScore = detail.leaderboard[0].score;
      const winners = detail.leaderboard.filter((player) => player.score === topScore).map((player) => player.nickname);
      copy.textContent = winners.length > 1 ? `並列第一：${winners.join('、')}・${topScore} 分｜你拿下 ${detail.score} 分` : `冠軍 ${winners[0]}・${topScore} 分｜你拿下 ${detail.score} 分`;
    } else if (copy) copy.textContent = `本局 ${detail.score} 分・目前最佳 ${best[detail.gameId] ?? 0} 分`;
    document.querySelector('#result-panel')?.classList.remove('hidden');
  });
  window.addEventListener('arcade:ready', () => { if (!loadingHadError) setTimeout(() => finishLoading(), 450); });
  window.addEventListener('arcade:load-start', (event) => {
    loadingHadError = false;
    loadingAssetTitle = (event as CustomEvent<{ title: string }>).detail.title;
    document.querySelector('#loading')?.classList.remove('hidden', 'fade-out');
    document.querySelector('#loading-retry')?.classList.add('hidden');
    const label = document.querySelector<HTMLElement>('#loading-label'); if (label) label.textContent = `正在載入「${loadingAssetTitle}」素材…`;
    const bar = document.querySelector<HTMLElement>('#loading-progress'); if (bar) { bar.style.width = '8%'; bar.classList.remove('indeterminate'); }
  });
  window.addEventListener('arcade:load-progress', (event) => {
    const progress = (event as CustomEvent<{ progress: number }>).detail.progress;
    const percent = Math.max(8, Math.round(progress * 100));
    const bar = document.querySelector<HTMLElement>('#loading-progress');
    const label = document.querySelector<HTMLElement>('#loading-label');
    if (bar) { bar.style.width = `${percent}%`; bar.classList.remove('indeterminate'); }
    if (label) label.textContent = loadingAssetTitle ? `正在載入「${loadingAssetTitle}」素材 ${percent}%` : progress >= 1 ? '夜市開張！100%' : `正在點亮夜市招牌 ${percent}%`;
  });
  window.addEventListener('arcade:load-complete', () => { loadingAssetTitle = ''; finishLoading(); });
  window.addEventListener('arcade:load-error', (event) => {
    loadingHadError = true;
    const file = (event as CustomEvent<{ file: string }>).detail.file;
    showLoadFailure(`素材載入失敗：${file}，請重新載入。`, () => location.reload());
  });
  document.querySelector('#multiplayer-start')?.addEventListener('click', () => room?.send('start'));
  document.querySelector('#multiplayer-ready')?.addEventListener('click', (event) => { room?.send('ready', { ready: true }); (event.currentTarget as HTMLButtonElement).disabled = true; (event.currentTarget as HTMLButtonElement).textContent = '已準備'; });
}

function renderTouchControls(game: GameSpec) {
  const touch = document.querySelector<HTMLElement>('.touch-controls')!;
  touch.innerHTML = game.actions.map(({ action, label }) => `<button data-action="${action}" class="${action === 'ACTION' ? 'touch-action' : ''}">${label}</button>`).join('');
  touch.querySelectorAll<HTMLButtonElement>('button').forEach((button) => button.addEventListener('pointerdown', (event) => { event.preventDefault(); window.dispatchEvent(new CustomEvent('arcade:action', { detail: { action: button.dataset.action } })); }));
}

function openGame(game: GameSpec) {
  selected = game;
  document.querySelector('#multiplayer-start')?.classList.add('hidden');
  document.querySelector('#room-board')?.classList.add('hidden');
  document.querySelector('#restart')?.classList.remove('hidden');
  document.querySelector('#home-view')?.classList.add('hidden');
  document.querySelector('#play-view')?.classList.remove('hidden');
  document.querySelector('#playing-title')!.textContent = game.title;
  document.querySelector('#playing-hint')!.textContent = game.controls;
  document.querySelector('#live-prompt')!.textContent = game.controls;
  document.querySelector('#best-score')!.textContent = String(save.bestSingle[game.id] ?? 0);
  document.querySelector('#result-panel')?.classList.add('hidden');
  renderTouchControls(game);
  startGame(game);
}
function startGame(game: GameSpec, seed?: number) {
  document.querySelector('#result-panel')?.classList.add('hidden');
  document.querySelector('#score')!.textContent = '0';
  window.dispatchEvent(new CustomEvent('arcade:start', { detail: { game, multiplayer: Boolean(room), seed } }));
  const canvas = document.querySelector('canvas'); canvas?.focus();
}
function closeGame() {
  window.dispatchEvent(new Event('arcade:stop'));
  document.querySelector('#play-view')?.classList.add('hidden');
  document.querySelector('#home-view')?.classList.remove('hidden');
  if (room) { room.leave(); room = null; }
  roomIsHost = false;
  document.querySelector('#room-board')?.classList.add('hidden');
  document.querySelector('#multiplayer-start')?.classList.add('hidden');
  document.querySelector('#restart')?.classList.remove('hidden');
  document.querySelectorAll<HTMLElement>('.game-card').forEach((card) => {
    const id = card.dataset.game ?? '';
    const score = card.querySelector('.card-foot > span');
    if (score && card.dataset.ready === 'true') score.textContent = `最高 ${save.bestSingle[id] ?? 0}`;
  });
  const played = document.querySelector('.stats > div:nth-child(2) strong'); if (played) played.textContent = String(save.played.length);
  const unlocked = document.querySelector('.stats > div:nth-child(3) strong'); if (unlocked) unlocked.textContent = String(save.wins);
  const bar = document.querySelector<HTMLElement>('.progress i'); if (bar) bar.style.width = `${Math.min(100, save.played.length / games.length * 100)}%`;
  const badges = document.querySelector('.achievement-badges'); if (badges) badges.innerHTML = achievementBadges();
}

function openRoomDialog() {
  const dialog = document.querySelector<HTMLDialogElement>('#room-dialog')!;
  dialog.classList.remove('hidden');
  dialog.showModal();
  if (!serverUrl) setRoomStatus('多人伺服器尚未設定；可先玩單人遊戲。', true);
}
function setRoomStatus(message: string, error = false) {
  const status = document.querySelector<HTMLElement>('#room-status');
  if (status) { status.textContent = message; status.classList.toggle('error', error); }
}
async function connectRoom(mode: 'create' | 'join') {
  const nickname = (document.querySelector<HTMLInputElement>('#nickname')?.value ?? '').trim().slice(0, 12);
  const code = (document.querySelector<HTMLInputElement>('#room-code')?.value ?? '').trim();
  if (!nickname) return setRoomStatus('請先輸入暱稱。', true);
  if (!serverUrl) return setRoomStatus('多人伺服器尚未設定，單人遊戲不受影響。', true);
  setRoomStatus('正在尋找夜市包廂…');
  try {
    const client = new Client(serverUrl);
    room = mode === 'create'
      ? await client.create('arcade', { nickname, gameId: selected?.id ?? firstBatch[0].id })
      : await client.joinById(code, { nickname });
    const joinedRoom = room;
    if (!joinedRoom) throw new Error('無法建立遊戲連線。');
    roomIsHost = mode === 'create';
    joinedRoom.onMessage('players', (players: Array<{ sessionId: string; nickname: string; score: number; ready?: boolean; host?: boolean; connected?: boolean; started?: boolean }>) => {
      window.dispatchEvent(new CustomEvent('arcade:peers', { detail: { peers: players.map((player) => player.nickname) } }));
      renderRoomBoard(players);
      const own = players.find((player) => player.sessionId === joinedRoom.sessionId);
      const ready = document.querySelector<HTMLButtonElement>('#multiplayer-ready');
      if (ready && document.querySelector('#play-view')?.classList.contains('hidden') === false) { ready.classList.toggle('hidden', players.some((player) => player.started)); ready.disabled = Boolean(own?.ready); ready.textContent = own?.ready ? '已準備' : '準備好'; }
      roomIsHost = players.some((player) => player.sessionId === joinedRoom.sessionId && player.host);
      const start = document.querySelector<HTMLButtonElement>('#multiplayer-start');
      if (start) { start.classList.remove('hidden'); (start as HTMLButtonElement).disabled = players.some((player) => player.started) || !roomIsHost || players.length < 2 || !players.every((player) => player.ready && player.connected !== false); start.textContent = players.some((player) => player.started) ? '對戰中' : '開始對戰'; }
    });
    joinedRoom.onMessage('game-start', (payload: { seed: number }) => {
      if (selected) { startGame(selected, payload.seed); document.querySelector('#playing-hint')!.textContent = `房間 ${joinedRoom.roomId}・40 秒同步對戰`; }
      document.querySelector('#multiplayer-ready')?.classList.add('hidden');
      const start = document.querySelector<HTMLButtonElement>('#multiplayer-start'); if (start) { start.disabled = true; start.textContent = '對戰中'; }
    });
    joinedRoom.onMessage('score', (data: { scores: Array<{ sessionId: string; nickname: string; score: number; connected?: boolean }>; timeLeft: number }) => {
      renderRoomBoard(data.scores);
      const own = data.scores.find((item) => item.sessionId === room?.sessionId);
      if (own) { const score = document.querySelector('#score'); if (score) score.textContent = String(own.score); }
    });
    joinedRoom.onMessage('round-over', (data: { scores: Array<{ sessionId: string; nickname: string; score: number }> }) => {
      if (!selected) return;
      const own = data.scores.find((item) => item.sessionId === room?.sessionId);
      const start = document.querySelector<HTMLButtonElement>('#multiplayer-start');
      if (start) { start.disabled = !roomIsHost; start.textContent = '再開新局'; }
      const retry = document.querySelector<HTMLButtonElement>('#result-retry');
      if (retry) retry.disabled = !roomIsHost;
      window.dispatchEvent(new CustomEvent('arcade:finish', { detail: { gameId: selected.id, score: own?.score ?? 0, multiplayer: true, leaderboard: data.scores } }));
    });
    joinedRoom.onMessage('error', (message: string) => toast(message));
    joinedRoom.onDrop(() => toast('連線中斷，正在嘗試回到包廂…'));
    joinedRoom.onReconnect(() => toast('已重新連上包廂！'));
    joinedRoom.onLeave((code) => {
      if (room !== joinedRoom) return;
      room = null;
      roomIsHost = false;
      document.querySelector('#multiplayer-start')?.classList.add('hidden');
      document.querySelector('#room-board')?.classList.add('hidden');
      if (code !== 4000) toast('連線已結束，請重新加入包廂。');
    });
    selected = gameById(String(joinedRoom.state.gameId)) ?? selected;
    document.querySelector<HTMLDialogElement>('#room-dialog')?.close();
    setRoomStatus(`房間 ${joinedRoom.roomId} 已就緒，分享代碼邀請朋友。`);
    toast(`房間代碼：${joinedRoom.roomId}`);
    if (!selected) selected = firstBatch[0];
    document.querySelector('#home-view')?.classList.add('hidden');
    document.querySelector('#play-view')?.classList.remove('hidden');
    document.querySelector('#playing-title')!.textContent = selected.title;
    document.querySelector('#playing-hint')!.textContent = `房間 ${joinedRoom.roomId}・等待房主開始`;
    document.querySelector('#best-score')!.textContent = String(save.bestMultiplayer[selected.id] ?? 0);
    renderTouchControls(selected);
    document.querySelector('#multiplayer-ready')?.classList.remove('hidden');
    document.querySelector('#multiplayer-start')?.classList.remove('hidden');
    document.querySelector('#restart')?.classList.add('hidden');
    (document.querySelector('#multiplayer-ready') as HTMLButtonElement).disabled = false;
    (document.querySelector('#multiplayer-ready') as HTMLButtonElement).textContent = '準備好';
    document.querySelector('#multiplayer-start')?.classList.remove('hidden');
    const roomPlayers = (joinedRoom.state as { players?: Map<string, { nickname: string; score: number }> } | undefined)?.players;
    const players = Array.from(roomPlayers?.values() ?? []).map((player) => ({ sessionId: '', nickname: String(player.nickname), score: Number(player.score) }));
    renderRoomBoard(players);
  } catch (error) {
    room = null;
    setRoomStatus(error instanceof Error ? error.message : '連線失敗，請確認房間代碼後再試。', true);
  }
}

function renderRoomBoard(players: Array<{ sessionId: string; nickname: string; score: number; ready?: boolean; host?: boolean; connected?: boolean }>) {
  const board = document.querySelector<HTMLElement>('#room-board');
  if (!board) return;
  board.classList.remove('hidden');
  board.innerHTML = players.map((player, index) => `<span class="room-player ${player.connected === false ? 'offline' : ''}"><i>${index + 1}</i><b>${escapeHTML(player.nickname)}${player.host ? ' ★房主' : ''}</b><em>${player.connected === false ? '重連中' : player.ready ? `${player.score} 分・已準備` : `${player.score} 分・未準備`}</em></span>`).join('');
}

function escapeHTML(value: string) { return value.replace(/[&<>"']/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character]!); }

function finishLoading() {
  document.querySelector('#loading')?.classList.add('fade-out');
  window.setTimeout(() => document.querySelector('#loading')?.classList.add('hidden'), 500);
}
function showLoadFailure(message: string, retry: () => void) {
  document.querySelector('#loading')?.classList.remove('hidden', 'fade-out');
  document.querySelector('#loading-label')!.textContent = message;
  const retryButton = document.querySelector<HTMLButtonElement>('#loading-retry');
  retryButton?.classList.remove('hidden');
  loadingRetry = retry;
  if (retryButton) retryButton.onclick = () => loadingRetry?.();
}

render();
async function bootArcade() {
  try {
    const [phaserModule, sceneModule] = await Promise.all([import('phaser'), import('./games/ArcadeScene')]);
    const Phaser = phaserModule.default;
    const game = new Phaser.Game({
      type: Phaser.AUTO,
      parent: 'game-canvas',
      width: 960,
      height: 540,
      backgroundColor: '#17140f',
      pixelArt: true,
      scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
      scene: [sceneModule.ArcadeScene],
    });
    game.events.on('destroy', () => showLoadFailure('遊戲載入遇到問題，請重新載入。', () => location.reload()));
  } catch {
    showLoadFailure('遊戲引擎載入遇到問題，請重新載入。', () => location.reload());
  }
}
bootArcade();

