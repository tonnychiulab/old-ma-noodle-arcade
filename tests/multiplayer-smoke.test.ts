import assert from 'node:assert/strict';
import { after, it } from 'node:test';
import { Client } from '@colyseus/sdk';

const clientA = new Client('ws://127.0.0.1:2567');
const clientB = new Client('ws://127.0.0.1:2567');
const rooms: Array<{ leave: () => void }> = [];
const pause = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
after(() => rooms.forEach((room) => room.leave()));

it('Colyseus 雙玩家房間同步等待準備、開始與操作比分', async () => {
  const host = await clientA.create('arcade', { nickname: '測試房主', gameId: 'night-market-rush' }); rooms.push(host);
  const guest = await clientB.joinById(host.roomId, { nickname: '測試玩家' }); rooms.push(guest);
  let started = 0; let scoreBroadcasts = 0;
  host.onMessage('players', () => {}); guest.onMessage('players', () => {});
  host.onMessage('error', () => {});
  host.onMessage('game-start', () => started++); guest.onMessage('game-start', () => started++);
  host.onMessage('score', () => scoreBroadcasts++); guest.onMessage('score', () => scoreBroadcasts++);
  await pause(150);
  host.send('start'); await pause(150);
  assert.equal(started, 0, '未全員準備時不可開始');
  host.send('ready', { ready: true }); guest.send('ready', { ready: true }); await pause(200);
  host.send('start'); await pause(250);
  assert.equal(started, 2, '兩名玩家都應收到同步開始事件');
  host.send('input', { action: 'A' }); await pause(200);
  assert.ok(scoreBroadcasts >= 2, '操作後伺服器應向兩位玩家同步比分');
});
