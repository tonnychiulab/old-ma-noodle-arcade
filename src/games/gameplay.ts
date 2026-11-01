import type { GameAction, GameId, GameSpec } from './catalog.js';

export type FeedbackKind = 'good' | 'miss' | 'info';
export type GameRun = {
  gameId: GameId;
  score: number;
  elapsed: number;
  remaining: number;
  duration: number;
  step: number;
  streak: number;
  lane: number;
  aim: number;
  target: number;
  targetLane: number;
  phase: number;
  heat: number;
  tokens: number;
  stock: number;
  cursor: number;
  selected: number;
  firstPick: number;
  input: string;
  sequence: GameAction[];
  tiles: number[];
  matched: boolean[];
  obstacle: boolean;
  launched: boolean;
  finished: boolean;
  feedback: string;
  feedbackKind: FeedbackKind;
  randomSeed: number;
};

const arrows: GameAction[] = ['LEFT', 'UP', 'RIGHT', 'DOWN'];
const foodActions: GameAction[] = ['A', 'S', 'D'];
const cardActions: GameAction[] = ['A', 'S', 'D', 'F'];
const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));

function random(seed: number, max: number): [number, number] {
  const next = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
  return [next, (next >>> 16) % max];
}

function makeSequence(seed: number, actions: GameAction[], count: number): [number, GameAction[]] {
  const result: GameAction[] = [];
  let current = seed;
  for (let i = 0; i < count; i++) {
    const [next, value] = random(current, actions.length);
    current = next;
    result.push(actions[value]);
  }
  return [current, result];
}

export function acceptsInput(now: number, lastAcceptedAt: number, intervalMs = 120): boolean {
  return now - lastAcceptedAt >= intervalMs;
}

function ensureSequence(run: GameRun, actions: GameAction[], lookAhead = 0) {
  if (run.cursor + lookAhead >= run.sequence.length) {
    const [seed, next] = makeSequence(run.randomSeed, actions, 40);
    run.randomSeed = seed;
    run.sequence.push(...next);
  }
}

export function createGameRun(game: GameSpec, multiplayer = false, seed = Date.now()): GameRun {
  const normalizedSeed = (seed >>> 0) || 1;
  const [nextSeed, sequence] = makeSequence(normalizedSeed, game.id === 'night-market-rush' || game.id === 'braised-bites' || game.id === 'fishball-skewer' || game.id === 'night-market-tycoon' ? foodActions : arrows, 40);
  const duration = multiplayer ? 40 : game.singleSeconds;
  const targetLane = game.id === 'pinball-duel' ? normalizedSeed % 2 : normalizedSeed % 3;
  // Mahjong starts with two complete pairs, shuffled without replacement.
  const pairA = normalizedSeed % 3;
  const pairB = (pairA + 1) % 3;
  const matchTiles = [pairA, pairB, pairA, pairB];
  let tileSeed = normalizedSeed;
  for (let index = matchTiles.length - 1; index > 0; index--) {
    const [next, pick] = random(tileSeed, index + 1); tileSeed = next;
    [matchTiles[index], matchTiles[pick]] = [matchTiles[pick], matchTiles[index]];
  }
  const signTiles = [normalizedSeed % 3, (normalizedSeed + 1) % 3, normalizedSeed % 3, normalizedSeed % 3];
  const puzzleOffset = 1 + (normalizedSeed % 3);
  const puzzleTiles = [0, 1, 2, 3].map((_value, index) => (index + puzzleOffset) % 4);
  const puzzleBlank = puzzleTiles.indexOf(3);
  return {
    gameId: game.id, score: 0, elapsed: 0, remaining: duration, duration, step: 0, streak: 0,
    lane: 1, aim: 0, target: game.id === 'change-maker' ? 15 + normalizedSeed % 20 : (normalizedSeed % 5) - 2, targetLane, phase: 0,
    heat: 20 + normalizedSeed % 35, tokens: 0, stock: 3, cursor: game.id === 'night-market-puzzle' ? (puzzleBlank + 1) % 4 : 0, selected: -1,
    firstPick: game.id === 'night-market-puzzle' ? puzzleBlank : -1, input: '', sequence,
    tiles: game.id === 'mahjong-match' ? matchTiles : game.id === 'sign-match' ? signTiles : game.id === 'night-market-puzzle' ? puzzleTiles : Array.from({ length: 4 }, (_, i) => (normalizedSeed + i * 3) % 4),
    matched: Array.from({ length: 4 }, () => false), obstacle: false, launched: false, finished: false,
    feedback: '準備好了嗎？', feedbackKind: 'info', randomSeed: nextSeed,
  };
}

function result(run: GameRun, points: number, feedback: string, kind: FeedbackKind = points >= 0 ? 'good' : 'miss') {
  run.score = Math.max(0, run.score + points);
  run.feedback = feedback;
  run.feedbackKind = kind;
  run.step++;
  run.streak = points > 0 ? run.streak + 1 : 0;
  return run;
}

function sequenceAction(run: GameRun, action: GameAction, choices: GameAction[], points: number, label: string) {
  ensureSequence(run, choices, 4);
  const expected = run.sequence[run.cursor];
  if (action === expected) { run.cursor++; return result(run, points + Math.min(run.streak, 5), `${label}正確！連續 ${run.streak + 1} 次`, 'good'); }
  if (choices.includes(action)) return result(run, -1, `差一點！提示還是 ${expected}`, 'miss');
  return result(run, 0, `等一下，按 ${expected}`, 'info');
}

export function applyGameAction(current: GameRun, action: GameAction): GameRun {
  if (current.finished) return current;
  const run: GameRun = { ...current, sequence: [...current.sequence], tiles: [...current.tiles], matched: [...current.matched] };
  switch (run.gameId) {
    case 'night-market-rush':
      {
        const orderLength = 3;
        const expected = run.sequence[(run.tokens * orderLength + run.cursor) % run.sequence.length];
        if (action === expected) {
          run.cursor++;
          const complete = run.cursor >= orderLength;
          if (complete) { run.cursor = 0; run.tokens++; return result(run, 18 + Math.min(run.streak, 5) * 2, '整張訂單出完！新客人上桌', 'good'); }
          return result(run, 4, `出餐 ${run.cursor}/${orderLength}，連續出對加分！`, 'good');
        }
        if (foodActions.includes(action)) { run.cursor = 0; return result(run, -1, '食材放錯了，重新看訂單！', 'miss'); }
        return result(run, 0, '依訂單依序備料、煮麵、出餐', 'info');
      }
    case 'pinball-duel': {
      if (action === 'ACTION' && !run.launched) { run.launched = true; return result(run, 0, '彈珠發射！左右打彈板', 'info'); }
      if (!run.launched) return result(run, 0, '先按發射鍵！', 'info');
      if (action !== 'LEFT' && action !== 'RIGHT') return result(run, 0, '看彈珠方向再打板', 'info');
      const correct = action === (run.targetLane === 0 ? 'LEFT' : 'RIGHT');
      if (correct) { run.targetLane = 1 - run.targetLane; return result(run, 8 + Math.min(run.streak, 6) * 2, '漂亮反彈！連擊繼續', 'good'); }
      run.launched = false; return result(run, -3, '漏接了！再發射一次', 'miss');
    }
    case 'ring-toss':
    case 'planter-bowler': {
      if (action === 'LEFT') { run.aim = clamp(run.aim - 1, -2, 2); return result(run, 0, run.gameId === 'planter-bowler' ? `瞄準盆栽塔 ${run.aim + 3} 號柱` : `瞄準 ${run.aim + 3} 號獎品`, 'info'); }
      if (action === 'RIGHT') { run.aim = clamp(run.aim + 1, -2, 2); return result(run, 0, run.gameId === 'planter-bowler' ? `瞄準盆栽塔 ${run.aim + 3} 號柱` : `瞄準 ${run.aim + 3} 號獎品`, 'info'); }
      if (action !== 'ACTION') return result(run, 0, '左右調整，再出手', 'info');
      const distance = Math.abs(run.aim - run.target);
      if (run.gameId === 'planter-bowler') {
        const power = run.heat >= 55 && run.heat <= 78;
        const points = distance === 0 ? (power ? 20 : 12) : distance === 1 && power ? 8 : 0;
        const [seed, target] = random(run.randomSeed, 5); run.randomSeed = seed; run.target = target - 2; run.aim = 0;
        return result(run, points, points === 20 ? '力道角度都漂亮！盆栽全倒！' : points ? '擊倒幾盆！再抓一次角度和力道' : '投偏了，重新瞄準並等力道進綠區', points ? 'good' : 'miss');
      }
      const points = distance === 0 ? 15 : distance === 1 ? 8 : 0;
      run.target = ((run.target + 2) % 5) - 2;
      run.aim = 0;
      return result(run, points, points ? '命中目標！' : '偏掉了，再瞄準一次', points ? 'good' : 'miss');
    }
    case 'neon-wiring': {
      if (action === 'LEFT') { run.cursor = (run.cursor + 3) % 4; return result(run, 0, `選到第 ${run.cursor + 1} 段線路`, 'info'); }
      if (action === 'RIGHT') { run.cursor = (run.cursor + 1) % 4; return result(run, 0, `選到第 ${run.cursor + 1} 段線路`, 'info'); }
      if (action !== 'ACTION') return result(run, 0, '選擇線路後旋轉它', 'info');
      run.tiles[run.cursor] = (run.tiles[run.cursor] + 1) % 4;
      if (run.tiles[run.cursor] === 0) run.tokens++;
      const connected = run.tiles.every((tile) => tile === 0);
      if (connected) { run.tokens = 0; run.tiles = run.tiles.map((_tile, index) => (run.randomSeed + index) % 4); return result(run, 24, '招牌全亮！下一張電路板接上了', 'good'); }
      return result(run, run.tiles[run.cursor] === 0 ? 2 : 0, run.tiles[run.cursor] === 0 ? '這段線路接好了！' : '方向還沒接上，繼續旋轉', 'info');
    }
    case 'sparrow-rhythm': {
      if (!arrows.includes(action)) return result(run, 0, '聽節奏，看燈亮時按方向', 'info');
      const beat = run.phase % 1.2;
      const onBeat = beat >= 0.45 && beat <= 0.82;
      if (!onBeat) return result(run, -1, '踩早或踩晚了，等麻雀腳邊亮燈再按', 'miss');
      ensureSequence(run, arrows, 4);
      const expected = run.sequence[run.cursor];
      if (action !== expected) return result(run, -2, `拍子踩準了，但路線要按 ${expected}`, 'miss');
      run.cursor++; run.tokens++;
      return result(run, 9 + Math.min(run.streak, 5), '踩中節拍！撿到一粒米', 'good');
    }
    case 'bumper-alley':
    case 'rain-dash':
    case 'alley-delivery':
    case 'alley-skater':
    case 'tile-runner':
    case 'old-ma-adventure': {
      if (run.gameId === 'alley-delivery') {
        ensureSequence(run, arrows, 5);
        const routeStart = Math.floor(run.cursor / 5) * 5;
        if (action === run.sequence[run.cursor]) {
          run.cursor++;
          if (run.cursor % 5 === 0) { run.tokens++; return result(run, 20, '抵達客人桌邊！下一份餐點上路', 'good'); }
          return result(run, 4, `路線正確 ${run.cursor % 5}/5，注意下個路口`, 'good');
        }
        if (arrows.includes(action)) {
          run.cursor = routeStart; run.stock = Math.max(0, run.stock - 1);
          if (run.stock === 0) run.finished = true;
          return result(run, -2, `走錯巷口，餐點打翻！剩 ${run.stock} 份`, 'miss');
        }
        return result(run, 0, '依照路線箭頭穿過巷口送餐', 'info');
      }
      if (run.gameId === 'rain-dash') {
        if (action !== 'LEFT' && action !== 'RIGHT') return result(run, 0, '積水路滑，左右換巷保持平衡', 'info');
        run.lane = clamp(run.lane + (action === 'LEFT' ? -1 : 1), 0, 2);
        if (run.obstacle && run.lane === run.targetLane) { run.obstacle = false; run.heat = Math.max(0, run.heat - 20); return result(run, -3, '踩進水窪！輪胎抓地力下降', 'miss'); }
        if (run.obstacle) { run.obstacle = false; run.heat = Math.min(100, run.heat + 5); run.tokens++; return result(run, 5 + Math.floor(run.heat / 25), '避開水窪，雨衣保持乾爽', 'good'); }
        return result(run, 0, '前方巷道還算乾燥', 'info');
      }
      if (run.gameId === 'alley-skater') {
        if (action === 'UP' && run.obstacle) { run.obstacle = false; return result(run, 10, '跳過路障！', 'good'); }
        if (action === 'DOWN' && !run.obstacle) { run.obstacle = false; return result(run, 2, '低身滑行', 'good'); }
        if (action === 'LEFT' || action === 'RIGHT') { run.lane = clamp(run.lane + (action === 'LEFT' ? -1 : 1), 0, 2); return result(run, 1, '換線成功', 'good'); }
        return result(run, -2, '時機不對，留意前方路障', 'miss');
      }
      if (run.gameId === 'tile-runner') {
        if (action === 'LEFT' || action === 'RIGHT') {
          run.lane = clamp(run.lane + (action === 'LEFT' ? -1 : 1), 0, 4);
          if (run.obstacle && run.lane === run.targetLane) { run.obstacle = false; return result(run, -3, '踩進破裂的屋瓦！下個缺口提早換線', 'miss'); }
          if (run.obstacle) { run.obstacle = false; return result(run, 9, '沿屋脊切線避開缺口！', 'good'); }
          return result(run, 1, `滑到第 ${run.lane + 1} 塊屋瓦`, 'info');
        }
        if (action === 'ACTION' && run.obstacle) { run.obstacle = false; run.tokens++; return result(run, 12, '跳過屋頂缺口，順手撿到瓦片！', 'good'); }
        if (action === 'ACTION') return result(run, 1, '起跳蓄力，盯住前方屋脊', 'info');
        return result(run, 0, '選擇切線或跳躍跨過屋頂缺口', 'info');
      }
      if (run.gameId === 'old-ma-adventure') {
        if (action === 'LEFT' || action === 'RIGHT') {
          run.lane = clamp(run.lane + (action === 'LEFT' ? -1 : 1), 0, 4);
          if (run.obstacle && run.lane === run.targetLane) { run.obstacle = false; return result(run, -3, '撞上巷口紙箱，掉了一份食材', 'miss'); }
          run.tokens++; return result(run, 3, `沿巷前進，找到第 ${run.tokens} 份食材`, 'good');
        }
        if (action === 'ACTION' && run.obstacle) { run.obstacle = false; run.tokens++; return result(run, 12, '跨過紙箱，搶到攤主食材！', 'good'); }
        if (action === 'ACTION') return result(run, 1, '跳過水溝蓋，繼續往麵攤跑', 'good');
        return result(run, 0, '左右穿過巷弄，空白鍵跳障礙', 'info');
      }
      if (action === 'LEFT' || action === 'RIGHT' || action === 'UP' || action === 'DOWN') {
        const nextLane = action === 'LEFT' ? clamp(run.lane - 1, 0, 2) : action === 'RIGHT' ? clamp(run.lane + 1, 0, 2) : action === 'UP' ? 0 : 2;
        run.lane = nextLane;
        if (run.gameId === 'bumper-alley' && run.obstacle) {
          run.obstacle = false;
          if (run.lane === run.targetLane) { run.streak = 0; return result(run, -4, '碰撞！下一個路口提早換線', 'miss'); }
          run.tokens++; return result(run, 10 + Math.min(run.streak, 6) * 2, '漂亮閃過！代幣到手', 'good');
        }
        if (run.obstacle && run.lane === run.targetLane) { run.obstacle = false; return result(run, -3, '撞到障礙了！', 'miss'); }
        if (run.obstacle) { run.obstacle = false; return result(run, 8, '閃過障礙！', 'good'); }
        return result(run, 0, `切到第 ${run.lane + 1} 線`, 'info');
      }
      if (action === 'ACTION' && run.gameId === 'bumper-alley') return run.obstacle ? result(run, -2, '衝刺太早，撞上路障！', 'miss') : result(run, 0, '加速中，準備下一次閃避', 'info');
      if (run.obstacle) { run.obstacle = false; return result(run, -3, '沒有及時閃開，撞上障礙！', 'miss'); }
      return result(run, 0, '觀察前方障礙，切換到安全路線', 'info');
    }
    case 'hopscotch-king':
      ensureSequence(run, arrows, 4);
      if (action === run.sequence[run.cursor]) {
        run.cursor++;
        if (run.cursor % 4 === 0) { run.tokens++; return result(run, 18, '四格一輪踩完！踏上下一段路線', 'good'); }
        return result(run, 5, `踩對格子 ${run.cursor % 4}/4，記住本輪路線`, 'good');
      }
      if (arrows.includes(action)) {
        run.cursor = Math.floor(run.cursor / 4) * 4;
        return result(run, -2, '踩錯一格！這輪四格要重新走', 'miss');
      }
      return result(run, 0, '依序踩完四格，錯步要重走本輪', 'info');
    case 'temple-drums': {
      if (!arrows.includes(action)) return result(run, 0, '看鼓點提示，跟著拍子敲擊', 'info');
      const beat = run.phase % 1.2;
      if (beat < 0.45 || beat > 0.82) return result(run, -1, '鼓槌落早了或晚了，等下一拍', 'miss');
      return sequenceAction(run, action, arrows, 8, '鼓點正確');
    }
    case 'oyster-omelet': {
      if (action !== 'ACTION') return result(run, 0, `熟度 ${run.heat}%：等綠色區再翻面`, 'info');
      const perfect = run.heat >= 55 && run.heat <= 78;
      run.heat = 10 + (run.step * 17) % 90;
      return result(run, perfect ? 12 : -3, perfect ? '蚵仔煎翻面成功！' : '蛋皮破了，重新掌握鐵板火候', perfect ? 'good' : 'miss');
    }
    case 'sausage-chef': {
      if (action !== 'ACTION') return result(run, 0, `炭火 ${run.heat}%：盯住香腸兩側焦痕`, 'info');
      const perfect = run.heat >= 62 && run.heat <= 82;
      run.heat = 15 + (run.step * 23) % 85;
      if (perfect) run.tokens++;
      else run.stock = Math.max(0, run.stock - 1);
      if (run.stock === 0) run.finished = true;
      return result(run, perfect ? 9 : -2, perfect ? `翻面均勻，香腸完成 ${run.tokens} 支` : `烤焦一面！剩餘香腸 ${run.stock} 支`, perfect ? 'good' : 'miss');
    }
    case 'braised-bites': {
      const orderLength = 3;
      ensureSequence(run, foodActions, 4);
      if (action === run.sequence[run.cursor]) {
        run.cursor++;
        if (run.cursor % orderLength === 0) { run.tokens++; return result(run, 18, '整份滷味配好！下一張訂單上桌', 'good'); }
        return result(run, 3, `夾好 ${run.cursor % orderLength}/${orderLength} 樣滷味`, 'good');
      }
      if (foodActions.includes(action)) { run.cursor = Math.ceil(run.cursor / orderLength) * orderLength; return result(run, -2, '夾錯食材，這份訂單重來', 'miss'); }
      return result(run, 0, '依客人訂單夾取滷味', 'info');
    }
    case 'fishball-skewer': {
      ensureSequence(run, foodActions, 4);
      if (action === run.sequence[run.cursor]) {
        run.cursor++;
        if (run.cursor % 3 === 0) { run.tokens++; return result(run, 15, '魚丸串完成！竹籤交給客人', 'good'); }
        return result(run, 6, `串料 ${run.cursor % 3}/3，下一顆別掉了`, 'good');
      }
      if (foodActions.includes(action)) { run.cursor = Math.floor(run.cursor / 3) * 3; return result(run, -2, '順序不對，這串食材滑落重串', 'miss'); }
      return result(run, 0, '依序把魚丸、配料串上竹籤', 'info');
    }
    case 'bubble-tea-shake': {
      const expected = run.step % 2 === 0 ? 'LEFT' : 'RIGHT';
      if (action === expected) { run.heat = Math.min(100, run.heat + 17); return result(run, 5, `搖勁 ${run.heat}%！保持左右交替`, 'good'); }
      if (action === 'LEFT' || action === 'RIGHT') { run.heat = Math.max(0, run.heat - 12); return result(run, -2, '左右要交替，珍珠才會 Q！', 'miss'); }
      return result(run, 0, '交替搖杯', 'info');
    }
    case 'claw-master': {
      if (action === 'LEFT' || action === 'RIGHT') { run.aim = clamp(run.aim + (action === 'LEFT' ? -1 : 1), 0, 4); return result(run, 0, `夾爪位置 ${run.aim + 1}`, 'info'); }
      if (action !== 'ACTION') return result(run, 0, '左右移動到娃娃上方，再抓取', 'info');
      const hit = run.aim === run.targetLane;
      run.targetLane = (run.targetLane + 2) % 5;
      return result(run, hit ? 15 : 0, hit ? '夾到了！' : '差一點，再試一次', hit ? 'good' : 'miss');
    }
    case 'balloon-shooter': {
      if (action === 'LEFT' || action === 'RIGHT') { run.aim = clamp(run.aim + (action === 'LEFT' ? -1 : 1), -3, 3); return result(run, 0, `準星橫向 ${run.aim + 3}`, 'info'); }
      if (action === 'UP' || action === 'DOWN') { run.cursor = clamp(run.cursor + (action === 'UP' ? -1 : 1), 0, 2); return result(run, 0, `準星第 ${run.cursor + 1} 排`, 'info'); }
      if (action !== 'ACTION') return result(run, 0, '移動準星後射擊氣球', 'info');
      const hit = run.cursor === run.targetLane && run.aim === run.target;
      const [seed, lane] = random(run.randomSeed, 3); run.randomSeed = seed; run.targetLane = lane; run.target = (seed % 7) - 3;
      return result(run, hit ? 12 : -1, hit ? '命中指定氣球！' : '沒有打中，追蹤目標再試', hit ? 'good' : 'miss');
    }
    case 'mahjong-match': {
      const index = cardActions.indexOf(action);
      if (index >= 0 && run.matched[index]) return result(run, 0, '這張已配好，翻另一張牌', 'info');
      if (index >= 0) { run.selected = index; return result(run, 0, `翻開第 ${index + 1} 張牌：${run.tiles[index] + 1}筒`, 'info'); }
      if (action !== 'ACTION') return result(run, 0, '先選一張牌，再按配對', 'info');
      if (run.selected < 0) return result(run, 0, '先按 A、S、D 或 F 翻一張牌', 'info');
      if (run.matched[run.selected]) { run.selected = -1; return result(run, 0, '這張已配好，翻另一張牌', 'info'); }
      if (run.firstPick < 0) { run.firstPick = run.selected; run.selected = -1; return result(run, 0, '再選一張相同的牌', 'info'); }
      if (run.firstPick === run.selected) return result(run, 0, '再翻另一張牌比較看看', 'info');
      const match = run.tiles[run.firstPick] === run.tiles[run.selected];
      if (match) {
        run.matched[run.firstPick] = true; run.matched[run.selected] = true; run.firstPick = -1; run.selected = -1;
        if (run.matched.every(Boolean)) { const a = run.randomSeed % 3; const b = (a + 1) % 3; run.tiles = [a, b, a, b]; run.matched = run.matched.map(() => false); run.tokens++; return result(run, 24, '清台！新一桌麻將翻牌', 'good'); }
        return result(run, 12, '配對成功！', 'good');
      }
      run.firstPick = -1; run.selected = -1; return result(run, -1, '不是一對，記住牌面再來', 'miss');
    }
    case 'night-market-tycoon': {
      ensureSequence(run, foodActions, 4);
      const correct = action === run.sequence[run.cursor];
      if (correct && run.stock > 0) {
        run.stock--; run.cursor++;
        if (run.cursor % foodActions.length === 0) { run.tokens++; return result(run, 18 + Math.min(run.streak, 5), '整桌出餐！下一張訂單上桌', 'good'); }
        return result(run, 5, `備料 ${run.cursor % foodActions.length}/3，庫存 ${run.stock}`, 'good');
      }
      if (action === 'A' || action === 'S' || action === 'D') { run.stock = Math.min(5, run.stock + 1); return result(run, -2, '備錯料了，庫存補貨但少賺一單', 'miss'); }
      return result(run, 0, '依訂單備麵、湯或配料', 'info');
    }
    case 'mole-market': {
      const correct = action === foodActions[run.targetLane];
      const [seed, lane] = random(run.randomSeed, 3); run.randomSeed = seed; run.targetLane = lane;
      return result(run, correct ? 10 : -2, correct ? '敲中地鼠！' : '敲錯洞了！', correct ? 'good' : 'miss');
    }
    case 'night-market-puzzle': {
      if (action === 'LEFT') { run.cursor = (run.cursor + 3) % 4; return result(run, 0, `選取磁磚 ${run.cursor + 1}，空格在 ${run.firstPick + 1}`, 'info'); }
      if (action === 'RIGHT') { run.cursor = (run.cursor + 1) % 4; return result(run, 0, `選取磁磚 ${run.cursor + 1}，空格在 ${run.firstPick + 1}`, 'info'); }
      if (action !== 'ACTION') return result(run, 0, '只可推動緊鄰空格的磁磚', 'info');
      const adjacent = Math.abs(run.cursor - run.firstPick) === 1 || Math.abs(run.cursor - run.firstPick) === 3;
      if (!adjacent) return result(run, -1, '推不動：請選空格旁邊那一塊', 'miss');
      [run.tiles[run.cursor], run.tiles[run.firstPick]] = [run.tiles[run.firstPick], run.tiles[run.cursor]];
      run.firstPick = run.cursor;
      const solved = run.tiles.every((tile, index) => tile === index);
      if (solved) { run.tokens++; run.tiles = [1, 0, 2, 3]; run.firstPick = 3; run.cursor = 2; return result(run, 24, '拼回完整夜市招牌！下一張街景開始', 'good'); }
      return result(run, 4, '磁磚滑進空格！繼續拼回完整招牌', 'good');
    }
    case 'change-maker': {
      if (/^[0-9]$/.test(action)) { run.input += action; return result(run, 0, `找零答案：${run.input}`, 'info'); }
      if (action !== 'ACTION') return result(run, 0, '輸入數字，再按送出', 'info');
      const answer = String(run.target);
      const correct = run.input === answer;
      run.input = '';
      run.target = 15 + ((run.target + 7) % 20);
      return result(run, correct ? 12 : -2, correct ? '找零正確！' : `金額不對，正確金額是 ${answer} 元`, correct ? 'good' : 'miss');
    }
    case 'sign-match': {
      if (action === 'LEFT') { run.cursor = clamp(run.cursor - 1, 0, 2); return result(run, 0, `選取第 ${run.cursor + 1}、${run.cursor + 2} 面燈牌交換`, 'info'); }
      if (action === 'RIGHT') { run.cursor = clamp(run.cursor + 1, 0, 2); return result(run, 0, `選取第 ${run.cursor + 1}、${run.cursor + 2} 面燈牌交換`, 'info'); }
      if (action !== 'ACTION') return result(run, 0, '左右選相鄰燈牌，空白鍵交換，湊成三連燈', 'info');
      [run.tiles[run.cursor], run.tiles[run.cursor + 1]] = [run.tiles[run.cursor + 1], run.tiles[run.cursor]];
      const lineStart = [0, 1].find((start) => run.tiles[start] === run.tiles[start + 1] && run.tiles[start] === run.tiles[start + 2]);
      if (lineStart !== undefined) {
        run.tokens++; run.randomSeed = (Math.imul(run.randomSeed, 1664525) + 1013904223) >>> 0;
        const symbol = run.randomSeed % 3; run.tiles = [symbol, (symbol + 1) % 3, symbol, symbol]; run.cursor = 0;
        return result(run, 22 + Math.min(run.streak, 5) * 2, '三盞連線！整排招牌亮起', 'good');
      }
      [run.tiles[run.cursor], run.tiles[run.cursor + 1]] = [run.tiles[run.cursor + 1], run.tiles[run.cursor]];
      return result(run, -1, '沒有連成三盞，燈牌退回原位', 'miss');
    }
    case 'shrimp-fishing': {
      if (!run.launched) { run.launched = true; run.phase = 0; return result(run, 0, '魚餌放好了，盯著浮標！', 'info'); }
      if (action !== 'ACTION') return result(run, 0, '等浮標跳動時起竿', 'info');
      const bite = run.phase >= 2 && run.phase <= 4;
      run.launched = false;
      return result(run, bite ? 14 : -2, bite ? '釣到泰國蝦！' : '蝦子還沒上鉤，再等一下', bite ? 'good' : 'miss');
    }
    case 'lucky-wheel': {
      if (action !== 'ACTION') return result(run, 0, '轉盤轉動中，看到獎區再停', 'info');
      const hit = run.phase % 8 >= 3 && run.phase % 8 <= 5;
      return result(run, hit ? 15 : 0, hit ? '停在大獎區！' : '轉過頭了，再試一次', hit ? 'good' : 'miss');
    }
    case 'stall-defense': {
      const lane = action === '1' ? 0 : action === '2' ? 1 : action === '3' ? 2 : -1;
      if (lane < 0) return result(run, 0, '選擇一條巷道放置防禦物', 'info');
      const block = lane === run.targetLane;
      const [seed, nextLane] = random(run.randomSeed, 3); run.randomSeed = seed; run.targetLane = nextLane;
      if (block) { run.stock = Math.min(5, run.stock + 1); run.tokens++; return result(run, 12 + Math.min(run.streak, 4) * 2, `攔下搗蛋客！防線 ${run.stock}/5，守住 ${run.tokens} 波`, 'good'); }
      run.stock = Math.max(0, run.stock - 1);
      const miss = result(run, -2, `漏守一巷！防線剩 ${run.stock}/5`, 'miss');
      if (run.stock === 0) { run.finished = true; run.feedback = '麵攤防線失守！'; }
      return miss;
    }
    default:
      return result(run, 0, '試試畫面上的操作', 'info');
  }
}

export function advanceGameRun(current: GameRun, seconds = 1): GameRun {
  if (current.finished || seconds <= 0) return current;
  const elapsed = Math.min(seconds, current.remaining);
  const run: GameRun = { ...current, elapsed: current.elapsed + elapsed, remaining: Math.max(0, current.remaining - elapsed), phase: current.phase + elapsed };
  if (run.gameId === 'bumper-alley') run.score += Math.floor(run.elapsed) - Math.floor(current.elapsed);
  if (run.gameId === 'oyster-omelet' || run.gameId === 'sausage-chef') run.heat = 20 + Math.round((Math.sin(run.elapsed * 2.2) + 1) * 38);
  if (run.gameId === 'planter-bowler') run.heat = 20 + Math.round((Math.sin(run.elapsed * 1.5) + 1) * 38);
  if (run.gameId === 'bubble-tea-shake') run.heat = Math.max(0, run.heat - Math.round(elapsed * 3));
  if (run.gameId === 'alley-skater' || run.gameId === 'tile-runner' || run.gameId === 'old-ma-adventure' || run.gameId === 'bumper-alley' || run.gameId === 'rain-dash') {
    const obstacleInterval = run.gameId === 'bumper-alley' ? Math.max(1, 3 - Math.floor(run.elapsed / 12)) : 2;
    if (Math.floor(run.elapsed) > Math.floor(current.elapsed) && Math.floor(run.elapsed) % obstacleInterval === 0) {
      const [seed, lane] = random(run.randomSeed, 3); run.randomSeed = seed; run.targetLane = lane; run.obstacle = true;
      if (run.gameId === 'bumper-alley') run.feedback = run.elapsed >= 24 ? '車潮加快！提早看下一個路口！' : '障礙來了！切到不同顏色的安全線！';
    }
  }
  if (run.gameId === 'shrimp-fishing' && run.launched) run.feedback = run.phase % 6 >= 2 && run.phase % 6 <= 4 ? '浮標動了！快起竿！' : '耐心等待浮標訊號…';
  if (run.gameId === 'night-market-tycoon' && Math.floor(run.elapsed) > Math.floor(current.elapsed) && Math.floor(run.elapsed) % 8 === 0) run.stock = Math.min(5, run.stock + 1);
  if (run.remaining === 0) {
    run.finished = true;
    run.feedback = '時間到，本局結束！';
    run.feedbackKind = 'info';
  }
  return run;
}

export function actionForKey(code: string): GameAction | null {
  const key = code.toUpperCase();
  if (key === 'ARROWLEFT') return 'LEFT';
  if (key === 'ARROWRIGHT') return 'RIGHT';
  if (key === 'ARROWUP') return 'UP';
  if (key === 'ARROWDOWN') return 'DOWN';
  if (key === 'SPACE' || key === 'ENTER') return 'ACTION';
  if (key === 'KEYA') return 'A';
  if (key === 'KEYS') return 'S';
  if (key === 'KEYD') return 'D';
  if (key === 'KEYF') return 'F';
  if (/^[0-9]$/.test(key)) return key as GameAction;
  if (/^DIGIT[0-9]$/.test(key)) return key.slice(5) as GameAction;
  return null;
}

