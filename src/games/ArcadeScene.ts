import Phaser from 'phaser';
import type { GameAction, GameSpec } from './catalog';
import { acceptsInput, actionForKey, advanceGameRun, applyGameAction, createGameRun, type GameRun } from './gameplay';

const W = 960;
const H = 540;
type Session = { game: GameSpec; run: GameRun; multiplayer: boolean; nickname: string; peers: string[]; imageKeys: string[] };
const labelsFor = (action: GameAction) => ({ LEFT: '←', RIGHT: '→', UP: '↑', DOWN: '↓', ACTION: '●', A: 'A', S: 'S', D: 'D', F: 'F', '0': '0', '1': '1', '2': '2', '3': '3', '4': '4', '5': '5', '6': '6', '7': '7', '8': '8', '9': '9' })[action];

export class ArcadeScene extends Phaser.Scene {
  private paint!: Phaser.GameObjects.Graphics;
  private labels: Phaser.GameObjects.Text[] = [];
  private images: Phaser.GameObjects.Image[] = [];
  private session: Session | null = null;
  private soundEnabled = false;
  private lastSecond = 0;
  private lastInputAt = Number.NEGATIVE_INFINITY;
  private cycle?: Phaser.Sound.BaseSound;

  constructor() { super('arcade'); }
  preload() {
    this.load.on('progress', (progress: number) => window.dispatchEvent(new CustomEvent('arcade:load-progress', { detail: { progress } })));
    this.load.on('loaderror', (file: Phaser.Loader.File) => window.dispatchEvent(new CustomEvent('arcade:load-error', { detail: { file: file.key || file.url } })));
    this.load.svg('stall-sign', `${import.meta.env.BASE_URL}assets/shared/images/stall-sign.svg`);
    this.load.audio('loop', `${import.meta.env.BASE_URL}assets/shared/audio/night-market-loop.wav`);
    this.load.audio('score-chime', `${import.meta.env.BASE_URL}assets/shared/audio/score-chime.wav`);
    this.load.audio('miss-buzz', `${import.meta.env.BASE_URL}assets/shared/audio/miss-buzz.wav`);
  }
  create() {
    this.paint = this.add.graphics();
    this.scale.on('resize', () => this.draw());
    this.input.keyboard?.on('keydown', (event: KeyboardEvent) => { const action = actionForKey(event.code); if (action) this.act(action); });
    window.addEventListener('arcade:start', this.onStart as EventListener);
    window.addEventListener('arcade:action', this.onAction as EventListener);
    window.addEventListener('arcade:peers', this.onPeers as EventListener);
    window.addEventListener('arcade:audio', this.onAudio as EventListener);
    window.addEventListener('arcade:stop', this.onStop as EventListener);
    this.drawAttract(); window.dispatchEvent(new Event('arcade:ready'));
  }
  private onStart = (event: CustomEvent<{ game: GameSpec; multiplayer?: boolean; seed?: number }>) => {
    const { game, multiplayer = false, seed = Date.now() } = event.detail;
    this.clearSessionAssets();
    const base = `${import.meta.env.BASE_URL}assets/games/${game.id}`;
    const assets = [
      [`${game.id}-scene`, `${base}/scenes/${game.id}-scene.svg`],
      [`${game.id}-hero`, `${base}/characters/${game.id}-hero.svg`],
      [`${game.id}-prop`, `${base}/images/${game.id}-prop.svg`],
      [`${game.id}-icon`, `${base}/icons/${game.id}.svg`],
    ];
    const needsLoad = assets.some(([key]) => !this.textures.exists(key)) || !this.cache.audio.exists(`${game.id}-action`);
    if (needsLoad) window.dispatchEvent(new CustomEvent('arcade:load-start', { detail: { title: game.title } }));
    for (const [key, url] of assets) if (!this.textures.exists(key)) this.load.svg(key, url, { width: 256, height: 160 });
    if (!this.cache.audio.exists(`${game.id}-action`)) this.load.audio(`${game.id}-action`, `${base}/audio/${game.id}-action.wav`);
    this.session = { game, run: createGameRun(game, multiplayer, seed), multiplayer, nickname: '', peers: [], imageKeys: assets.map(([key]) => key) };
    this.lastSecond = 0;
    this.lastInputAt = Number.NEGATIVE_INFINITY;
    if (this.load.isLoading()) this.load.once('complete', () => { this.draw(); window.dispatchEvent(new Event('arcade:load-complete')); });
    else if (needsLoad) { this.load.once('complete', () => { this.draw(); window.dispatchEvent(new Event('arcade:load-complete')); }); this.load.start(); }
    else this.draw();
    if (this.soundEnabled && !this.cycle && this.cache.audio.exists('loop')) { this.cycle = this.sound.add('loop', { loop: true, volume: 0.18 }); this.cycle.play(); }
  };
  private onAction = (event: CustomEvent<{ action: string }>) => this.act(event.detail.action);
  private onPeers = (event: CustomEvent<{ peers: string[] }>) => { if (this.session) this.session.peers = event.detail.peers; this.draw(); };
  private onAudio = (event: CustomEvent<{ enabled: boolean }>) => {
    this.soundEnabled = event.detail.enabled;
    if (!this.soundEnabled) { this.cycle?.stop(); this.cycle = undefined; }
    else if (this.session && this.cache.audio.exists('loop')) { this.cycle = this.sound.add('loop', { loop: true, volume: 0.18 }); this.cycle.play(); }
  };
  private onStop = () => { this.session = null; this.cycle?.stop(); this.cycle = undefined; this.clearSessionAssets(); this.drawAttract(); };
  private clearSessionAssets() { this.images.forEach((image) => image.destroy()); this.images = []; }
  private act(raw: string) {
    const s = this.session; if (!s || s.run.finished) return;
    const now = performance.now();
    if (s.multiplayer && !acceptsInput(now, this.lastInputAt)) return;
    if (s.multiplayer) this.lastInputAt = now;
    const action = raw.toUpperCase() as Parameters<typeof applyGameAction>[1];
    const before = s.run.score; s.run = applyGameAction(s.run, action);
    if (s.multiplayer) window.dispatchEvent(new CustomEvent('arcade:network-input', { detail: { action } }));
    if (s.run.score > before && this.soundEnabled && this.cache.audio.exists('score-chime')) this.sound.play('score-chime', { volume: 0.35 });
    if (s.run.score < before && this.soundEnabled && this.cache.audio.exists('miss-buzz')) this.sound.play('miss-buzz', { volume: 0.28 });
    if (this.soundEnabled && this.cache.audio.exists(`${s.game.id}-action`)) this.sound.play(`${s.game.id}-action`, { volume: 0.16 });
    const delta = s.run.score - before;
    if (delta !== 0) this.impact(delta);
    this.emitScore(delta !== 0); this.draw();
  }
  update(_time: number, delta: number) {
    const s = this.session; if (!s || s.run.finished) return;
    this.lastSecond += delta;
    if (this.lastSecond >= 100) {
      const seconds = this.lastSecond / 1000; this.lastSecond = 0;
      s.run = advanceGameRun(s.run, seconds); this.emitScore(); this.draw();
      if (s.run.finished && !s.multiplayer) window.dispatchEvent(new CustomEvent('arcade:finish', { detail: { gameId: s.game.id, score: s.run.score } }));
    }
  }
  private emitScore(impact = false) { const s = this.session; if (s) window.dispatchEvent(new CustomEvent('arcade:score', { detail: { score: s.run.score, timeLeft: s.run.remaining, impact } })); }
  private impact(points: number) {
    const hit = points > 0; const large = Math.abs(points) >= 12;
    if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches) this.cameras.main.shake(large ? 105 : 65, large ? 0.0038 : 0.0018);
    const color = hit ? 0xffdb76 : 0xff7180;
    const count = hit ? (large ? 10 : 5) : 3;
    for (let i = 0; i < count; i++) {
      const angle = (Math.PI * 2 * i) / count;
      const distance = large ? 58 : 34;
      const shard = this.add.rectangle(480, 245, large ? 7 : 5, large ? 7 : 5, color).setDepth(50);
      this.tweens.add({ targets: shard, x: 480 + Math.cos(angle) * distance, y: 245 + Math.sin(angle) * distance, alpha: 0, scale: 0.25, duration: large ? 340 : 240, ease: 'Cubic.easeOut', onComplete: () => shard.destroy() });
    }
    if (large && hit) {
      const flash = this.add.rectangle(W / 2, H / 2, W, H, 0xfff2c7, 0.14).setDepth(49);
      this.tweens.add({ targets: flash, alpha: 0, duration: 125, ease: 'Sine.easeOut', onComplete: () => flash.destroy() });
    }
  }
  private drawAttract() {
    this.clearLabels(); this.paint?.clear(); if (!this.paint) return;
    this.drawNightStreet('night-market-rush', 0xffb02e);
    if (this.textures.exists('stall-sign')) this.images.push(this.add.image(480, 180, 'stall-sign').setDisplaySize(690, 130));
    this.text(480, 462, '台灣夜市街機 30 合 1　｜　老馬麵攤製作', 21, '#fff0c8');
  }
  private draw() {
    this.clearLabels(); this.clearSessionAssets(); const s = this.session; if (!s) return this.drawAttract();
    const p = this.paint; p.clear();
    const color = Phaser.Display.Color.HexStringToColor(s.game.color).color;
    window.dispatchEvent(new CustomEvent('arcade:prompt', { detail: { prompt: this.prompt(s.run) } }));
    this.drawNightStreet(s.game.id, color);
    // Each activity sits on a physical counter or game cabinet instead of a floating UI card.
    p.fillStyle(0x5a3420, 1).fillRect(110, 115, 740, 260).fillStyle(0x321f17, 1).fillRect(122, 128, 716, 230);
    p.fillStyle(color, 1).fillRect(122, 128, 716, 30).fillStyle(0xf7d89a, 1).fillRect(122, 158, 716, 3);
    p.fillStyle(0x8e5530, 1).fillRect(92, 372, 776, 17).fillStyle(0x39251a, 1).fillRect(105, 389, 750, 10);
    const sceneKey = `${s.game.id}-scene`, propKey = `${s.game.id}-prop`, heroKey = `${s.game.id}-hero`;
    if (this.textures.exists(sceneKey)) this.images.push(this.add.image(480, 254, sceneKey).setDisplaySize(660, 180).setAlpha(.08));
    if (this.textures.exists(propKey)) this.images.push(this.add.image(790, 342, propKey).setDisplaySize(80, 46).setAlpha(.42));
    if (this.textures.exists(heroKey)) this.images.push(this.add.image(155 + s.run.lane * 12, 343, heroKey).setDisplaySize(42, 46).setAlpha(.68));
    this.text(480, 70, s.game.title, 20, '#fff5dd');
    this.text(480, 143, '今晚開攤　·　選好招式就上菜', 14, '#fff0c8');
    this.text(225, 100, `得分 ${s.run.score}`, 16, '#fff0ae'); this.text(735, 100, `倒數 ${Math.ceil(s.run.remaining)}`, 16, '#ffe3d4');
    this.text(480, 177, this.prompt(s.run), 20, '#fff0cc');
    this.drawMechanic(s.run, color);
    p.fillStyle(0x281a13, 1).fillRect(225, 340, 510, 27).fillStyle(0xffc45d, .8).fillRect(230, 344, 500, 2);
    this.text(480, 355, s.run.feedback, 16, s.run.feedbackKind === 'miss' ? '#ff9d91' : '#efffe5');
    if (s.peers.length) this.text(810, 418, `同桌 ${s.peers.length} 人`, 13, '#c6e8dc');
    if (s.run.finished) { p.fillStyle(0x211710, .94).fillRect(125, 164, 710, 184); this.text(480, 223, '打烊了！', 36, '#ffe9b0'); this.text(480, 278, `本攤得分 ${s.run.score}　再來一局？`, 21, '#fff'); }
  }
  private drawNightStreet(gameId: string, accent: number) {
    const p = this.paint;
    const rainy = gameId === 'rain-dash' || gameId === 'shrimp-fishing';
    const temple = gameId === 'temple-drums' || gameId === 'lucky-wheel';
    const roof = gameId === 'tile-runner' || gameId === 'old-ma-adventure' || gameId === 'alley-skater';
    const sky = rainy ? 0x1c2935 : temple ? 0x38231d : 0x282019;
    p.fillStyle(sky, 1).fillRect(0, 0, W, H);
    // Taiwan lane-house silhouettes, lit upstairs windows, overhead cables.
    p.fillStyle(0x211a16, 1).fillRect(0, 42, 190, 306).fillRect(770, 28, 190, 320);
    p.fillStyle(0x4a3022, 1).fillRect(18, 68, 145, 12).fillRect(786, 58, 158, 12);
    for (let row = 0; row < 3; row++) for (let col = 0; col < 3; col++) {
      const glow = ((row * 3 + col + gameId.length) % 3 === 0) ? 0xf6b451 : 0x546064;
      p.fillStyle(glow, .8).fillRect(29 + col * 42, 101 + row * 63, 21, 34);
      p.fillStyle(glow, .65).fillRect(794 + col * 43, 91 + row * 63, 22, 34);
    }
    p.lineStyle(3, 0x0e1115, 1).lineBetween(0, 56, 960, 87).lineBetween(0, 88, 960, 51);
    // Striped awning and glowing stall fascia; the marquee color follows the game's own identity.
    p.fillStyle(0x762c24, 1).fillRect(0, 0, W, 34);
    for (let x = 0; x < W; x += 64) {
      p.fillStyle((x / 64) % 2 ? 0xf1d7b0 : 0xc54c38, 1).fillRect(x, 0, 32, 34);
      p.fillStyle((x / 64) % 2 ? 0xd9503e : 0xf5dfb5, 1).fillTriangle(x + 32, 34, x + 64, 34, x + 48, 54);
    }
    p.fillStyle(0x171414, .95).fillRect(286, 47, 388, 49).fillStyle(accent, 1).fillRect(292, 53, 376, 37);
    p.lineStyle(3, 0xffe6aa, .9).strokeRect(286, 47, 388, 49);
    p.fillStyle(0x35271d, 1).fillRect(0, 351, W, 189);
    // Worn tile pavement gives the lower half a street perspective instead of a flat backdrop.
    p.lineStyle(2, 0x5b4532, .8).lineBetween(0, 396, W, 396).lineBetween(0, 448, W, 448).lineBetween(0, 502, W, 502);
    for (let x = 0; x < W; x += 96) p.lineBetween(x, 351, x - 48, 540);
    p.fillStyle(0x17191a, .92).fillRect(0, 525, W, 15);
    if (rainy) for (let x = 18; x < W; x += 53) p.lineStyle(1, 0x8eb9d0, .35).lineBetween(x, 110 + (x % 4) * 17, x - 18, 178 + (x % 4) * 17);
    if (temple) {
      p.fillStyle(0x8d3326, 1).fillRect(26, 94, 56, 128).fillRect(877, 87, 56, 136);
      p.fillStyle(0xf5c456, 1).fillEllipse(54, 117, 36, 20).fillEllipse(905, 109, 36, 20);
    }
    if (roof) {
      p.fillStyle(0x171719, 1).fillTriangle(0, 340, 195, 180, 345, 340).fillTriangle(615, 340, 800, 163, 960, 340);
      p.fillStyle(0xf4b749, 1).fillRect(150, 210, 8, 8).fillRect(810, 205, 8, 8);
    }
    // counter lights reflect the small-shop bulbs onto the wet asphalt.
    p.fillStyle(accent, .12).fillRect(0, 351, W, 20);
    p.fillStyle(0xffdb9a, .9).fillCircle(247, 67, 6).fillCircle(713, 67, 6);
  }
  private prompt(run: GameRun) {
    const action = run.sequence[run.step % run.sequence.length];
    const labels: Record<string, string> = { LEFT: '←', RIGHT: '→', UP: '↑', DOWN: '↓', A: 'A', S: 'S', D: 'D' };
    const prompts: Record<string, string> = {
      'night-market-rush': `訂單 ${run.tokens + 1}：按 ${labels[run.sequence[(run.tokens * 3 + run.cursor) % run.sequence.length]]}`, 'pinball-duel': run.launched ? `彈珠來了！打 ${run.targetLane === 0 ? '左' : '右'} 彈板` : '按出招發射彈珠，接著跟著提示打板', 'ring-toss': `瞄準亮起的 ${run.target + 3} 號獎品，再投擲`, 'neon-wiring': '讓每段電線箭頭都朝上，接通招牌',
      'hopscotch-king': `四格路線：${labels[run.sequence[run.cursor]]}　錯步重走本輪`, 'oyster-omelet': `目前熟度 ${run.heat}%　綠色區翻鍋`, 'sausage-chef': `目前熟度 ${run.heat}%　金黃時翻面`, 'change-maker': `找零 ${run.target} 元：輸入答案`, 'shrimp-fishing': '放餌後看浮標，跳動時起竿', 'lucky-wheel': '看到獎區時按下停輪', 'mole-market': `目標洞口：${run.targetLane + 1}`, 'claw-master': `夾爪 ${run.aim + 1}　娃娃在 ${run.targetLane + 1} 號位`, 'balloon-shooter': `瞄準第 ${run.targetLane + 1} 排、橫向 ${run.target + 3} 號的氣球`,
      'braised-bites': `滷味訂單：${labels[run.sequence[run.cursor]] ?? '完成一輪'}`, 'bubble-tea-shake': `左右交替搖杯　目前搖勁 ${run.heat}%`, 'alley-delivery': `送達路線 ${run.cursor % 5 + 1}/5　剩餘餐點 ${run.stock}`, 'fishball-skewer': `魚丸串第 ${run.cursor + 1} 顆：按 ${labels[run.sequence[run.cursor]] ?? '完成一串'}`,
      'mahjong-match': '翻牌找出兩組相同筒子：A、S、D、F 選牌，空白確認', 'alley-skater': run.obstacle ? `路障在第 ${run.targetLane + 1} 線：跳過或換線` : '滑板前進：跳、蹲或切換巷道', 'temple-drums': `陣頭鼓點：${labels[run.sequence[run.cursor]]}`, 'night-market-tycoon': `訂單要 ${labels[run.sequence[run.cursor]] ?? '完成一桌'}　庫存 ${run.stock}/5`,
      'night-market-puzzle': `把磁磚推進空格　空格在第 ${run.firstPick + 1} 格`, 'sign-match': `選第 ${run.cursor + 1}、${run.cursor + 2} 面招牌交換，湊出三盞連線`, 'tile-runner': run.obstacle ? '屋頂缺口到了：左右換瓦或空白跳過' : '沿屋脊前進，留意即將出現的缺口', 'stall-defense': `搗蛋客從第 ${run.targetLane + 1} 巷來　防線 ${run.stock}/5`, 'old-ma-adventure': run.obstacle ? `巷口紙箱擋路：空白鍵跳過，或改走別線` : '左右穿巷收集食材，遇紙箱就跳',
      'planter-bowler': `瞄準第 ${run.target + 3} 號柱，等投球力道進綠區出手`, 'rain-dash': run.obstacle ? `水窪在第 ${run.targetLane + 1} 巷，立刻切到安全巷` : '雨中衝刺：左右切巷，別踩進水窪', 'sparrow-rhythm': `麻雀踩拍：${labels[run.sequence[run.cursor]]}　${run.phase % 1.2 >= 0.45 && run.phase % 1.2 <= 0.82 ? '現在亮燈！' : '等燈亮再按'}`,
    };
    return prompts[run.gameId] ?? (run.gameId === 'braised-bites' || run.gameId === 'fishball-skewer' ? `依序按 ${labels[action]}` : `${run.gameId === 'sparrow-rhythm' || run.gameId === 'temple-drums' ? '節奏提示' : '目標'}：${labels[action] ?? '按畫面操作'}`);
  }
  private drawMechanic(r: GameRun, color: number) {
    const p = this.paint;
    if (r.gameId === 'bumper-alley') {
      for (let i = 0; i < 3; i++) {
        const x = 370 + i * 110;
        p.fillStyle(i === r.lane ? 0x3a614e : 0x30271d, 1).fillRoundedRect(x - 39, 187, 78, 112, 8);
        p.lineStyle(2, i === r.lane ? 0x8ee4ba : 0x756044, 0.8).strokeRoundedRect(x - 39, 187, 78, 112, 8);
        if (r.obstacle && i === r.targetLane) { this.text(x, 214, '⚠', 24, '#ff7b76'); this.text(x, 245, '路障', 13, '#ffb4a6'); }
        if (i === r.lane) { p.fillStyle(0xffd370, 1).fillRoundedRect(x - 19, 260, 38, 24, 6); this.text(x, 271, '🛺', 17, '#24190e'); }
      }
      this.text(480, 316, `代幣 ${r.tokens}　生存 ${Math.floor(r.elapsed)} 秒　連擊 ${r.streak}`, 16, '#ffe19c');
      return;
    }
    if (r.gameId === 'night-market-rush') {
      const food = ['🍜', '🥚', '🥬'];
      for (let i = 0; i < 3; i++) { const x = 350 + i * 130; const active = i === r.cursor; p.fillStyle(active ? 0xffbd4a : 0x66533b, 1).fillRoundedRect(x - 43, 210, 86, 72, 9); this.text(x, 237, food[['A','S','D'].indexOf(r.sequence[(r.tokens * 3 + i) % r.sequence.length])], 32, '#fff2cb'); this.text(x, 270, ['A','S','D'][['A','S','D'].indexOf(r.sequence[(r.tokens * 3 + i) % r.sequence.length])], 13, '#37230e'); }
      this.text(480, 301, `完成訂單 ${r.tokens}　連擊 ${r.streak}`, 17, '#ffd978');
    } else if (r.gameId === 'hopscotch-king') {
      for (let i = 0; i < 4; i++) { const x = 340 + i * 92; const cue = r.sequence[r.cursor + i]; p.fillStyle(i === 0 ? 0xffd66f : 0x564633, 1).fillRoundedRect(x - 33, 214, 66, 58, 6); this.text(x, 241, labelsFor(cue), 24, i === 0 ? '#281b0d' : '#e8d7b5'); }
      this.text(480, 301, `四格一輪 ${r.cursor % 4}/4　完成 ${r.tokens} 輪`, 17, '#ffd978');
    } else if (r.gameId === 'neon-wiring') {
      const arrows = ['↑','→','↓','←'];
      r.tiles.forEach((tile, i) => { const x = 345 + i * 90; p.lineStyle(10, tile === 0 ? 0x7dffc1 : 0xff737d, 1).lineBetween(x, 233, x + 55, 233); p.fillStyle(i === r.cursor ? color : 0xd7b978, 1).fillCircle(x + 28, 233, i === r.cursor ? 20 : 15); this.text(x + 28, 233, arrows[tile], 21, '#24190e'); });
      this.text(480, 292, `${r.tiles.filter((tile) => tile === 0).length}/4 線路朝上`, 16, '#c6ffe9');
    } else if (r.gameId === 'ring-toss' || r.gameId === 'planter-bowler') {
      if (r.gameId === 'planter-bowler') {
        for(let row=0;row<3;row++) for(let col=0;col<3-row;col++){const x=433+col*42+row*21,y=224+row*32;p.fillStyle((row+col)%2?0x7dbb6f:0x5c8e58,1).fillRect(x,y,34,29);p.fillStyle(0x9ed28a,1).fillRect(x+7,y+6,20,4);}
        p.fillStyle(0xffd778,1).fillCircle(480+r.aim*40,315,13);p.fillStyle(0x3f3021,1).fillRect(365,334,230,10);p.fillStyle(r.heat>=55&&r.heat<=78?0x8fd36d:0xe28a4e,1).fillRect(367,336,226*r.heat/100,6);p.fillStyle(0x9ce879,.8).fillRect(367+226*.55,333,52,12);this.text(480,353,'對準盆栽柱，綠色力道時出手',12,'#fff0c5');
      } else {
        for (let i = 0; i < 5; i++) { const x = 310 + i * 86; const target = i === r.target + 2; p.lineStyle(target ? 8 : 5, target ? 0xffea7b : color, 1).strokeCircle(x, 245, target ? 22 : 15 + i % 2 * 5); if (target) this.text(x, 207, '★', 19, '#ffea7b'); }
        p.lineStyle(5, 0xfff0d0, .9).strokeCircle(310 + (r.aim + 2) * 86, 245, 26);
      }
    } else if (r.gameId === 'balloon-shooter') {
      const cx = 330 + (r.target + 3) * 50; const cy = 210 + r.targetLane * 34;
      p.fillStyle(0xff7096, 1).fillCircle(cx, cy, 18); p.lineStyle(2, 0xffe6a5, 1).lineBetween(cx, cy + 18, cx, cy + 34);
      const aimX = 330 + (r.aim + 3) * 50; const aimY = 210 + r.cursor * 34;
      p.lineStyle(3, 0xffffff, 1).strokeCircle(aimX, aimY, 20); p.lineBetween(aimX - 27, aimY, aimX + 27, aimY); p.lineBetween(aimX, aimY - 27, aimX, aimY + 27);
    } else if (r.gameId === 'pinball-duel') {
      [330, 480, 630].forEach((x, i) => { p.fillStyle([0x6de1c7, 0xffcc53, 0xff7594][i], 1).fillCircle(x, 225 + (i % 2) * 38, 18); });
      p.fillStyle(0xfff0bd, 1).fillCircle(480 + Math.sin(r.elapsed) * 110, 245 + Math.cos(r.elapsed) * 45, 9);
      this.text(480, 294, r.launched ? `← ${r.targetLane === 0 ? '打左板' : '打右板'} →` : '發射！看球的閃光提示', 17, '#f8e7c1');
    } else if (r.gameId === 'mahjong-match') {
      r.tiles.forEach((tile, i) => { const x = 326 + i * 78; const shown = i === r.selected || r.matched[i] || r.firstPick === i; p.fillStyle(r.matched[i] ? 0x789b76 : i === r.selected ? 0xf7d88a : 0xe8d4aa, 1).fillRect(x, 211, 58, 76); p.lineStyle(3, i === r.selected ? 0xffd34e : 0x806239, 1).strokeRect(x, 211, 58, 76); this.text(x + 29, 249, shown ? ['一筒','二筒','三筒'][tile] : '？', 18, '#352119'); this.text(x + 29, 302, ['A','S','D','F'][i], 13, '#ffe9b7'); });
      this.text(480, 329, `已配 ${r.matched.filter(Boolean).length}/4　選牌後按空白配對`, 14, '#e8d7b5');
    } else if (r.gameId === 'oyster-omelet' || r.gameId === 'sausage-chef') {
      p.fillStyle(0x161414, 1).fillEllipse(480, 250, 244, 92); p.fillStyle(0x6d6c68, 1).fillEllipse(480, 246, 210, 72);
      if (r.gameId === 'oyster-omelet') { p.fillStyle(0xf0bd59, 1).fillEllipse(480, 244, 128, 42); p.fillStyle(0x62412a, 1).fillEllipse(480, 246, 104, 27); p.fillStyle(0x79bb56, 1).fillCircle(443, 236, 5).fillCircle(493, 251, 6).fillCircle(521, 231, 4); this.text(480, 295, '蚵仔煎　鐵板滋滋響', 15, '#ffe5a3'); }
      else { p.fillStyle(0xd18b43, 1).fillRoundedRect(424, 230, 112, 26, 13); p.fillStyle(0xa8462c, 1).fillRect(442, 235, 72, 16); for (let i = 0; i < 5; i++) p.fillStyle(0xffd275, .5).fillRect(437 + i * 21, 232, 2, 21); this.text(480, 295, '炭火直烤　翻面顧兩側', 15, '#ffe5a3'); }
      p.fillStyle(0x39271b, 1).fillRect(325, 316, 310, 13).fillStyle(r.heat >= 55 && r.heat <= 78 ? 0x78ca67 : 0xe9874d, 1).fillRect(327, 318, Math.round(306 * r.heat / 100), 9); p.fillStyle(0x91d06b, .8).fillRect(327 + 306 * .55, 315, 70, 15); this.text(480, 344, `火候 ${r.heat}%`, 13, '#fff0ce');
    } else if (r.gameId === 'braised-bites' || r.gameId === 'fishball-skewer') {
      const food = r.gameId === 'braised-bites' ? ['蘿蔔','豆干','米血'] : ['魚丸','香菇','青菜'];
      for (let i = 0; i < 3; i++) { const x = 386 + i * 94; const active = i === r.cursor % 3; p.fillStyle(active ? 0xf0bf60 : 0x51402c, 1).fillRect(x - 34, 219, 68, 70); p.lineStyle(3, active ? 0xffedaa : 0x9b7540, 1).strokeRect(x - 34, 219, 68, 70); this.text(x, 246, r.gameId === 'fishball-skewer' ? ['●','◉','◆'][i] : ['▰','▦','■'][i], 29, '#f9e7bc'); this.text(x, 277, food[i], 12, '#fff1cb'); }
      this.text(480, 312, `本單串夾進度 ${r.cursor % 3}/3　連續 ${r.streak}`, 14, '#fff0c5');
    } else if (r.gameId === 'bubble-tea-shake') {
      p.fillStyle(0xd7b691, 1).fillRect(415, 212, 130, 92).fillStyle(0xffe4ad, 1).fillRect(427, 224, 106, 67); p.fillStyle(0x8e4c35, 1).fillRect(433, 263, 94, 24); for (let i = 0; i < 7; i++) p.fillStyle(0x211716, 1).fillCircle(444 + i * 12, 275 - (i % 2) * 6, 4); p.lineStyle(5, 0xffdf99, 1).lineBetween(491, 215, 516, 181); p.fillStyle(0x613a28, 1).fillRect(469, 203, 20, 9); p.fillStyle(0x46321f, 1).fillRect(320, 317, 320, 12).fillStyle(0xc694e8, 1).fillRect(322, 319, 316 * r.heat / 100, 8); this.text(480, 342, `搖勁 ${r.heat}%　${r.step % 2 === 0 ? '← 左搖' : '右搖 →'}`, 14, '#f4e1ff');
    } else if (r.gameId === 'alley-delivery') {
      p.lineStyle(12, 0xd6b577, .85).lineBetween(350, 225, 440, 225).lineBetween(440, 225, 440, 279).lineBetween(440, 279, 535, 279).lineBetween(535, 279, 535, 222).lineBetween(535, 222, 610, 222); const route = r.cursor % 5; const points = [[350,225],[440,225],[440,279],[535,279],[535,222],[610,222]]; for (let i = 0; i < points.length; i++) { const [x,y] = points[i]; p.fillStyle(i <= route ? 0xffd76d : 0x64533c, 1).fillCircle(x, y, i === route ? 13 : 8); } this.text(480, 317, `巷弄送達 ${r.cursor % 5}/5　餐點 ${r.stock}/3　已送 ${r.tokens} 桌`, 15, '#fff0ca');
    } else if (r.gameId === 'claw-master') {
      p.fillStyle(0x77c9d6, .2).fillRect(337, 204, 286, 104); p.lineStyle(5, 0xefd59f, 1).strokeRect(337, 204, 286, 104); p.lineStyle(3, 0xd5c39d, 1).lineBetween(352, 202, 352 + r.aim * 60, 239); p.fillStyle(0xe5dbbd, 1).fillRect(342 + r.aim * 60, 232, 22, 11); for (let i = 0; i < 5; i++) { const x = 370 + i * 52; const plush = i === r.targetLane; p.fillStyle(plush ? 0xf18bb0 : 0xe7b957, 1).fillCircle(x, 273, plush ? 14 : 10); p.fillStyle(0x32221e, 1).fillCircle(x - 5, 270, 2).fillCircle(x + 5, 270, 2); } this.text(480, 324, '投幣夾娃娃機　對準後落爪', 14, '#ffedcd');
    } else if (r.gameId === 'alley-skater' || r.gameId === 'rain-dash' || r.gameId === 'tile-runner' || r.gameId === 'old-ma-adventure') {
      const lanes = r.gameId === 'alley-skater' || r.gameId === 'rain-dash' ? 3 : 5; const left = lanes === 3 ? 350 : 300; const width = lanes === 3 ? 130 : 76;
      for (let i = 0; i < lanes; i++) { const x = left + i * width; p.fillStyle(i === r.lane ? 0x7a5a31 : 0x40332a, 1).fillRect(x, 211, width - 6, 92); p.lineStyle(2, 0xc7a878, .6).strokeRect(x, 211, width - 6, 92); if (r.obstacle && i === r.targetLane) { p.fillStyle(r.gameId === 'rain-dash' ? 0x77a9c6 : 0xdf674d, 1).fillTriangle(x + 22, 288, x + 55, 231, x + 88, 288); this.text(x + 55, 265, r.gameId === 'rain-dash' ? '水窪' : '路障', 12, '#fff2d7'); } }
      p.fillStyle(0xffd16e, 1).fillRoundedRect(left + r.lane * width + width / 2 - 16, 278, 32, 18, 5); this.text(480, 320, r.gameId === 'old-ma-adventure' ? `老馬回攤　食材 ${r.tokens}　前進 ${Math.floor(r.elapsed)} 秒` : `街巷路線　安全閃避 ${r.tokens} 次`, 14, '#fff0c5');
    } else if (r.gameId === 'temple-drums' || r.gameId === 'sparrow-rhythm') {
      if (r.gameId === 'temple-drums') { for (let i = 0; i < 4; i++) { const x = 345 + i * 90; p.fillStyle(i === 0 ? 0xd84e38 : 0x8d3427, 1).fillEllipse(x, 247, 62, 56); p.lineStyle(4, 0xf2ca7b, 1).strokeEllipse(x, 247, 54, 46); this.text(x, 247, labelsFor(r.sequence[r.cursor + i]), 22, '#fff0c8'); } this.text(480, 314, `陣頭鼓點 ${r.cursor} 拍　連擊 ${r.streak}`, 14, '#ffe5a4'); }
      else { p.fillStyle(0x5e4932, 1).fillRect(332, 285, 296, 16); p.fillStyle(0x795b37, 1).fillTriangle(330, 286, 356, 233, 382, 286); p.fillTriangle(420, 286, 446, 233, 472, 286); p.fillTriangle(510, 286, 536, 233, 562, 286); p.fillStyle(0x51402c, 1).fillEllipse(480, 251, 72, 43); p.fillStyle(0xd7a95b, 1).fillCircle(465, 246, 4).fillCircle(481, 239, 4).fillCircle(495, 249, 4); const beatOn=r.phase%1.2>=.45&&r.phase%1.2<=.82;p.fillStyle(beatOn?0x8fe178:0x553a29,1).fillCircle(480,210,12);this.text(480, 320, `麻雀追米　連續踩拍 ${r.streak}　撿到米粒 ${r.tokens}`, 14, '#fff0c5'); }
    } else if (r.gameId === 'night-market-tycoon') {
      p.fillStyle(0x9b6431, 1).fillRect(356, 228, 248, 75); p.fillStyle(0x3a2b20, 1).fillRect(369, 237, 221, 54); const stock = ['麵','湯','料']; for (let i=0;i<3;i++){ const x=407+i*70; p.fillStyle(r.sequence[r.cursor % 3] === ['A','S','D'][i] ? 0xf2ba50 : 0x92704a,1).fillRect(x-21,243,42,38); this.text(x,261,stock[i],18,'#fff0c9'); } this.text(480, 320, `備料庫存 ${r.stock}　完成訂單 ${r.tokens} 桌`, 14, '#fff0c5');
    } else if (r.gameId === 'mole-market') {
      for (let i=0;i<3;i++){const x=390+i*90;p.fillStyle(0x644329,1).fillEllipse(x,269,68,36);if(i===r.targetLane){p.fillStyle(0x9b7754,1).fillEllipse(x,249,40,39);p.fillStyle(0xf0cc9a,1).fillCircle(x-8,244,4).fillCircle(x+8,244,4);p.fillStyle(0x211714,1).fillCircle(x-7,244,2).fillCircle(x+8,244,2);}this.text(x,302,['A','S','D'][i],13,'#ffeac0');}this.text(480,327,`快敲亮起的洞口　命中 ${r.tokens} 次`,14,'#fff0c5');
    } else if (r.gameId === 'night-market-puzzle') {
      r.tiles.forEach((tile,i)=>{const x=360+i*66;p.fillStyle(tile===3?0x3b2a20:i===r.cursor?0xf4c75e:0xd9c292,1).fillRect(x,223,60,60);p.lineStyle(3,0x62452d,1).strokeRect(x,223,60,60);this.text(x+30,253,tile===3?'□':['攤','棚','燈','路'][tile],22,tile===3?'#7e6d58':'#422a1a');});this.text(480,311,`拼回夜市街景　放對 ${r.tokens} 塊　目前選第 ${r.cursor+1} 塊`,14,'#fff0c5');
    } else if (r.gameId === 'change-maker') {
      p.fillStyle(0x142021,1).fillRect(363,217,234,84);p.lineStyle(5,0x9cc8a2,1).strokeRect(363,217,234,84);this.text(480,236,`找零 ${r.target} 元`,18,'#b8ffd4');this.text(480,275,r.input || '＿ ＿ ＿',23,'#e5ffe7');this.text(480,323,'按數字輸入　空白鍵交給客人',14,'#fff0c5');
    } else if (r.gameId === 'sign-match') {
      r.tiles.forEach((tile,i)=>{const x=340+i*94;const selected=i===r.cursor||i===r.cursor+1;p.fillStyle(selected?color:0xefe1bf,1).fillRect(x-35,220,70,69);p.lineStyle(selected?5:3,selected?0xffe28a:0x9c794a,1).strokeRect(x-35,220,70,69);this.text(x,253,['麵','茶','燈'][tile],26,'#3a2419');});this.text(480,315,`交換相鄰燈牌，湊三連　已點亮 ${r.tokens} 排`,14,'#fff0c5');
    } else if (r.gameId === 'shrimp-fishing') {
      p.fillStyle(0x5da5a4,.52).fillEllipse(480,270,348,90);p.lineStyle(5,0x6b5132,1).strokeEllipse(480,270,348,90);for(let i=0;i<8;i++)p.fillStyle(i===r.targetLane?0xf39366:0xd38764,1).fillEllipse(358+i*35,271+(i%3)*13,15,8);p.lineStyle(3,0xf1dbad,1).lineBetween(480,190,480,244);p.fillStyle(r.phase%6>=2&&r.phase%6<=4?0xf9f26b:0xf1e3cc,1).fillEllipse(480,246,13,24);this.text(480,319,r.launched?'看浮標下沉再起竿':'蝦池備餌中　空白鍵下竿',14,'#fff0c5');
    } else if (r.gameId === 'lucky-wheel') {
      const colors=[0xc83e36,0xe6b849,0x37785f,0x3d7595,0x973c52,0xe6b849,0x37785f,0xc83e36];for(let i=0;i<8;i++){const a=i*Math.PI/4+r.phase*.5;const b=a+Math.PI/4;p.fillStyle(colors[i],1).fillTriangle(480,255,480+Math.cos(a)*88,255+Math.sin(a)*88,480+Math.cos(b)*88,255+Math.sin(b)*88);}p.lineStyle(5,0xffe6a2,1).strokeCircle(480,255,88);p.fillStyle(0xffe7a4,1).fillTriangle(480,154,466,182,494,182);this.text(480,314,`轉盤停在獎區　連中 ${r.streak} 次`,14,'#fff0c5');
    } else if (r.gameId === 'stall-defense') {
      for(let i=0;i<3;i++){const x=350+i*130;p.fillStyle(i===r.targetLane?0x8d3227:0x44362a,1).fillRect(x-50,220,100,75);p.lineStyle(3,0xb99b69,1).strokeRect(x-50,220,100,75);this.text(x,245,`巷 ${i+1}`,14,'#fff0ca');if(i===r.targetLane){p.fillStyle(0xe3a766,1).fillCircle(x,278,10);this.text(x,268,'搗蛋客',11,'#fff1cc');}}this.text(480,320,`守住麵攤　成功攔下 ${r.tokens} 次`,14,'#fff0c5');
    } else if (r.gameId === 'ring-toss') {
      this.text(480,322,`套圈命中 ${r.tokens} 個獎品　連續 ${r.streak}`,14,'#fff0c5');
    } else if (r.gameId === 'balloon-shooter') {
      this.text(480,322,`打中指定氣球 ${r.tokens} 顆　別浪費子彈`,14,'#fff0c5');
    } else {
      const x0 = r.gameId === 'claw-master' ? 350 : 390;
      for (let i = 0; i < (r.gameId === 'claw-master' ? 5 : 3); i++) { const x = x0 + i * 64; p.fillStyle(i === r.targetLane ? 0xff7188 : 0x68583f, 1).fillCircle(x, 245, i === r.targetLane ? 21 : 13); }
      p.lineStyle(3, 0xffe58d, 1).lineBetween(480, 180, 480 + r.aim * 18, 208);
      p.fillStyle(r.obstacle ? 0xff7481 : color, 1).fillRoundedRect(455 + r.lane * 22, 260, 32, 25, 5);
      this.text(480, 294, `連續 ${r.streak}　食材 ${r.tokens}　火候 ${r.heat}%`, 16, '#f8e7c1');
    }
  }
  private text(x: number, y: number, value: string, size: number, color: string) {
    const phoneScale = window.matchMedia('(max-width: 600px)').matches && size <= 16 ? 1.5 : 1;
    this.labels.push(this.add.text(x, y, value, { fontFamily: 'monospace', fontSize: `${Math.round(size * phoneScale)}px`, color, align: 'center', stroke: '#21180f', strokeThickness: phoneScale > 1 ? 3 : 4 }).setOrigin(.5));
  }
  private clearLabels() { this.labels.forEach((label) => label.destroy()); this.labels = []; }
}
