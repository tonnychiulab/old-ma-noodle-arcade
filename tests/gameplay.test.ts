import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { describe, it } from 'node:test';
import { firstBatch, games } from '../src/games/catalog.ts';
import { acceptsInput, actionForKey, advanceGameRun, applyGameAction, createGameRun } from '../src/games/gameplay.ts';
import { nextConnectedHost } from '../server/src/host-election.ts';

describe('遊戲目錄與素材契約', () => {
  it('有 30 款遊戲、六類各五款、五批各六款', () => {
    assert.equal(games.length, 30);
    const categories = new Map<string, number>(); const batches = new Map<number, number>();
    for (const game of games) { categories.set(game.category, (categories.get(game.category) ?? 0) + 1); batches.set(game.batch, (batches.get(game.batch) ?? 0) + 1); }
    assert.deepEqual([...categories.values()], [5, 5, 5, 5, 5, 5]);
    assert.deepEqual([...batches.values()], [6, 6, 6, 6, 6]);
    assert.deepEqual(firstBatch.map((game) => game.id), ['night-market-rush','pinball-duel','ring-toss','neon-wiring','bumper-alley','hopscotch-king']);
  });
  it('每款都有獨立的五類素材資料夾與可讀素材檔', () => {
    for (const game of games) for (const [folder, file] of [
      ['characters', `${game.id}-hero.svg`], ['audio', `${game.id}-action.wav`], ['images', `${game.id}-prop.svg`], ['scenes', `${game.id}-scene.svg`], ['icons', `${game.id}.svg`],
    ]) assert.ok(existsSync(`public/assets/games/${game.id}/${folder}/${file}`), `${game.id}/${folder}/${file}`);
  });
});

describe('街機玩法規則', () => {
  it('碰碰車每秒生存分要累加，不能蓋掉閃避得分', () => {
    const game = games.find((item) => item.id === 'bumper-alley')!;
    let run = advanceGameRun(createGameRun(game, false, 5), 3);
    const safeLane = (run.targetLane + 1) % 3;
    run = applyGameAction(run, safeLane < run.lane ? 'LEFT' : 'RIGHT');
    const dodgeScore = run.score;
    run = advanceGameRun(run, 1);
    assert.ok(dodgeScore >= 10, 'successful dodge must award points');
    assert.ok(run.score >= dodgeScore + 1, 'survival score is added on top of the dodge score');
  });
  it('序列遊戲會使用完整提示序列，而非每四步循環前四鍵', () => {
    const game = games.find((item) => item.id === 'hopscotch-king')!;
    let run = createGameRun(game, false, 1);
    assert.notDeepEqual(run.sequence.slice(0, 4), run.sequence.slice(4, 8), '提示不應固定重複同一組四鍵');
    for (let step = 0; step < 8; step++) {
      run = applyGameAction(run, run.sequence[step]);
      assert.equal(run.cursor, step + 1, `第 ${step + 1} 個提示鍵應能正確作答`);
    }
  });
  it('麻將開局四張牌都能配成兩對', () => {
    const game = games.find((item) => item.id === 'mahjong-match')!;
    for (const seed of [1, 42, 777, 123456]) {
      const run = createGameRun(game, false, seed);
      assert.equal(run.tiles.length, 4, `seed ${seed} should create four tiles`);
      for (const tile of new Set(run.tiles)) assert.equal(run.tiles.filter((value) => value === tile).length, 2, `tile ${tile} should have a matching pair`);
      assert.equal(run.matched.length, 4);
    }
  });
  it('麻將已配對的牌不能重複得分，清完兩對有清台獎勵', () => {
    const game = games.find((item) => item.id === 'mahjong-match')!;
    let run = createGameRun(game, false, 42);
    const keys = ['A', 'S', 'D', 'F'] as const;
    const firstPair = [0, run.tiles.findIndex((tile, index) => index > 0 && tile === run.tiles[0])];
    for (const index of firstPair) { run = applyGameAction(run, keys[index]); run = applyGameAction(run, 'ACTION'); }
    const matchedScore = run.score;
    run = applyGameAction(run, keys[firstPair[0]]);
    run = applyGameAction(run, 'ACTION');
    assert.equal(run.score, matchedScore);
    assert.equal(run.tokens, 0);
    const secondPair = run.matched.map((matched, index) => matched ? -1 : index).filter((index) => index >= 0);
    for (const index of secondPair) { run = applyGameAction(run, keys[index]); run = applyGameAction(run, 'ACTION'); }
    assert.equal(run.tokens, 1);
    assert.ok(run.score >= matchedScore + 24);
  });
  it('30 款都能由指定操作進行計分/狀態更新並在時限結束', () => {
    for (const game of games) {
      let run = createGameRun(game, false, 123456);
      assert.equal(run.remaining, game.singleSeconds);
      for (const { action } of game.actions) run = applyGameAction(run, action);
      assert.ok(run.step > 0, `${game.id} 未處理任何操作`);
      run = advanceGameRun(run, game.singleSeconds);
      assert.equal(run.finished, true, `${game.id} 未完成回合`);
      assert.equal(run.remaining, 0);
      assert.equal(applyGameAction(run, game.actions[0].action), run, `${game.id} 結束後仍接受操作`);
    }
  });
  it('同一種子會產生一致的節奏與隨機狀態', () => {
    for (const game of games) assert.deepEqual(createGameRun(game, true, 777), createGameRun(game, true, 777), game.id);
  });
  it('配對攤位一開局就有解；夜市推磚可推空格旁的磚', () => {
    for (const id of ['mahjong-match', 'sign-match'] as const) {
      const game = games.find((item) => item.id === id)!;
      const run = createGameRun(game, false, 2026);
      assert.ok(run.tiles.some((tile, index) => run.tiles.indexOf(tile) !== index), `${id} must start with a pair`);
    }
    const puzzle = games.find((item) => item.id === 'night-market-puzzle')!;
    let run = createGameRun(puzzle, false, 2026);
    assert.equal(run.tiles.filter((tile) => tile === 3).length, 1, 'one tile is the open slot');
    run = applyGameAction(run, 'ACTION');
    assert.ok(run.score > 0, 'sliding a neighboring tile should make progress');
    assert.equal(run.tiles[run.firstPick], 3, 'the open slot follows the moved tile');
  });
  it('招牌消消樂用相鄰交換湊出三連，不再只是翻牌配對', () => {
    const game = games.find((item) => item.id === 'sign-match')!;
    let run = createGameRun(game, false, 2026);
    run = applyGameAction(run, 'ACTION');
    assert.equal(run.tokens, 1);
    assert.ok(run.score >= 22);
  });
  it('盆栽投球要同時瞄準與掌握力道；麻雀要踩中亮燈節拍', () => {
    const bowl = games.find((item) => item.id === 'planter-bowler')!;
    let shot = createGameRun(bowl, false, 404);
    shot.aim = shot.target; shot.heat = 65;
    shot = applyGameAction(shot, 'ACTION');
    assert.ok(shot.score >= 20, 'perfect aim and power should clear the pot tower');

    const sparrow = games.find((item) => item.id === 'sparrow-rhythm')!;
    let rhythm = createGameRun(sparrow, false, 405);
    rhythm = applyGameAction(rhythm, rhythm.sequence[0]);
    assert.equal(rhythm.score, 0, 'an early beat should not score');
    rhythm = advanceGameRun(rhythm, .6);
    rhythm = applyGameAction(rhythm, rhythm.sequence[rhythm.cursor]);
    assert.ok(rhythm.score > 0, 'the lit beat should score the right direction');
  });
  it('同類遊戲仍有不同的核心操作結果', () => {
    const make = (id: string) => createGameRun(games.find((game) => game.id === id)!, false, 12);
    const omelet = make('oyster-omelet'); omelet.heat = 70;
    const sausage = make('sausage-chef'); sausage.heat = 70;
    assert.notEqual(applyGameAction(omelet, 'ACTION').score, applyGameAction(sausage, 'ACTION').score, '翻蚵仔煎和翻香腸的得分/存貨規則不同');

    const hop = make('hopscotch-king');
    const drums = make('temple-drums');
    assert.ok(applyGameAction(hop, hop.sequence[0]).score > 0, '跳格依記憶路線作答');
    const earlyDrum = applyGameAction(drums, drums.sequence[0]);
    assert.equal(earlyDrum.cursor, 0, '鼓陣未到拍點不能推進節奏');
    assert.match(earlyDrum.feedback, /等下一拍/);

    let braised = make('braised-bites'); let skewer = make('fishball-skewer');
    for (let i = 0; i < 3; i++) { braised = applyGameAction(braised, braised.sequence[i]); skewer = applyGameAction(skewer, skewer.sequence[i]); }
    assert.notEqual(braised.score, skewer.score, '夾滷味訂單與完成魚丸串有不同回饋');

    const rain = make('rain-dash'); rain.obstacle = true; rain.targetLane = 2; rain.lane = 1;
    const car = make('bumper-alley'); car.obstacle = true; car.targetLane = 2; car.lane = 1;
    assert.notEqual(applyGameAction(rain, 'LEFT').score, applyGameAction(car, 'LEFT').score, '避水窪和碰碰車閃避計分不同');
  });
  it('攤位大亨依序備完整桌；守攤漏守會耗盡防線', () => {
    const tycoon = games.find((item) => item.id === 'night-market-tycoon')!;
    let market = createGameRun(tycoon, false, 81);
    const order = market.sequence.slice(0, 3);
    for (const action of order) market = applyGameAction(market, action);
    assert.equal(market.tokens, 1);
    assert.equal(market.stock, 0);
    const defense = games.find((item) => item.id === 'stall-defense')!;
    let guard = createGameRun(defense, false, 91);
    for (let attempts = 0; !guard.finished && attempts < 20; attempts++) {
      guard = applyGameAction(guard, String((guard.targetLane + 1) % 3 + 1) as '1' | '2' | '3');
    }
    assert.equal(guard.finished, true, 'three missed lanes should break the stall defenses');
  });
  it('找零數字輸入期間題目固定，送出正確金額得分', () => {
    const game = games.find((item) => item.id === 'change-maker')!;
    let run = createGameRun(game, false, 123456);
    const answer = String(run.target);
    for (const digit of answer) run = applyGameAction(run, digit as Parameters<typeof applyGameAction>[1]);
    assert.equal(run.target, Number(answer));
    run = applyGameAction(run, 'ACTION');
    assert.equal(run.score, 12);
  });
  it('首批核心操作能形成連續目標、正確回饋及躲避風險', () => {
    const orderGame = games.find((game) => game.id === 'night-market-rush')!;
    let order = createGameRun(orderGame, false, 912);
    for (let index = 0; index < 3; index++) order = applyGameAction(order, order.sequence[index]);
    assert.equal(order.tokens, 1, '完成三步訂單應出現下一位客人');
    assert.ok(order.score >= 26, '完整出餐應有明顯連續得分');

    const pinball = createGameRun(games.find((game) => game.id === 'pinball-duel')!, false, 4);
    let ball = applyGameAction(pinball, 'ACTION');
    ball = applyGameAction(ball, ball.targetLane === 0 ? 'LEFT' : 'RIGHT');
    assert.ok(ball.score >= 8 && ball.launched, '跟上閃光方向要回饋並維持彈珠回合');

    const bumper = createGameRun(games.find((game) => game.id === 'bumper-alley')!, false, 5);
    let race = advanceGameRun(bumper, 3);
    assert.equal(race.obstacle, true, '三秒路程應出現首個路障');
    const safeLane = (race.targetLane + 1) % 3;
    const move = safeLane < race.lane ? 'LEFT' : 'RIGHT';
    race = applyGameAction(race, move);
    assert.ok(race.score >= 11 && race.tokens === 1, '閃到安全線應拿到代幣和連擊分');
  });
  it('多人每款統一 40 秒；數字鍵和方向鍵可轉成操作', () => {
    for (const game of firstBatch) assert.equal(createGameRun(game, true, 1).duration, 40);
    assert.equal(actionForKey('ArrowLeft'), 'LEFT'); assert.equal(actionForKey('Space'), 'ACTION');
    assert.equal(actionForKey('Digit3'), '3'); assert.equal(actionForKey('KeyA'), 'A'); assert.equal(actionForKey('KeyF'), 'F');
    assert.equal(acceptsInput(1000, 880), true); assert.equal(acceptsInput(999, 880), false);
    assert.equal(nextConnectedHost([['offline', { connected: false }], ['online', { connected: true }]]), 'online');
    assert.equal(nextConnectedHost([['offline', { connected: false }]]), '');
  });
  it('最終品牌名稱、作者/模型揭露、版本與 favicon 連結吻合', () => {
    const html = readFileSync('index.html', 'utf8'); const main = readFileSync('src/main.ts', 'utf8');
    assert.match(html, /<title>老馬麵攤製作：台灣夜市街機 30 合 1<\/title>/);
    assert.match(html, /favicon\.svg/); assert.match(main, /共同作者：老馬麵攤製作 × GPT-6 Luna/);
    assert.match(main, /企劃與程式製作使用模型：GPT-6 Luna/); assert.match(main, /v\$\{__APP_VERSION__\}/);
  });
});
