import assert from 'node:assert/strict';
import { spawn, type ChildProcess } from 'node:child_process';
import { createConnection } from 'node:net';
import { after, before, it } from 'node:test';
import { Client } from '@colyseus/sdk';

const clientA = new Client('ws://127.0.0.1:2567');
const clientB = new Client('ws://127.0.0.1:2567');
const rooms: Array<{ leave: () => void }> = [];
let serverProcess: ChildProcess | undefined;
const pause = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
async function serverReady() {
  for (let attempt = 0; attempt < 100; attempt++) {
    const connected = await new Promise<boolean>((resolve) => {
      const socket = createConnection(2567, '127.0.0.1');
      socket.once('connect', () => { socket.destroy(); resolve(true); });
      socket.once('error', () => resolve(false));
    });
    if (connected) return;
    if (serverProcess?.exitCode !== null && serverProcess?.exitCode !== undefined) throw new Error(`Multiplayer server exited with ${serverProcess.exitCode}`);
    await pause(50);
  }
  throw new Error('Multiplayer server did not start on port 2567');
}
before(async () => {
  serverProcess = spawn(process.execPath, ['--import', 'tsx', 'server/src/index.ts'], { cwd: process.cwd(), env: { ...process.env, PORT: '2567' }, stdio: ['ignore', 'pipe', 'pipe'] });
  serverProcess.stdout?.resume(); serverProcess.stderr?.resume();
  await serverReady();
});
after(async () => {
  rooms.forEach((room) => room.leave());
  serverProcess?.kill();
});

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
  host.send('input', { action: 'A' }); await pause(40);
  const firstInputBroadcasts = scoreBroadcasts;
  host.send('input', { action: 'S' }); await pause(50);
  assert.equal(scoreBroadcasts, firstInputBroadcasts, '120ms 內的第二個輸入應由伺服器節流');
  await pause(80); host.send('input', { action: 'D' }); await pause(80);
  assert.ok(scoreBroadcasts > firstInputBroadcasts, '節流間隔後輸入應同步至兩位玩家');
});
