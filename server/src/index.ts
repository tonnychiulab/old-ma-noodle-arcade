import { schema, t, type SchemaType } from '@colyseus/schema';
import { defineRoom, defineServer, Room, type Client } from '@colyseus/core';
import { WebSocketTransport } from '@colyseus/ws-transport';
import { acceptsInput, advanceGameRun, applyGameAction, createGameRun, type GameRun } from '../../src/games/gameplay.js';
import type { GameId, GameSpec } from '../../src/games/catalog.js';
import { nextConnectedHost } from './host-election.js';

const Player = schema({ nickname: t.string(), score: t.uint16().default(0), ready: t.boolean().default(false), connected: t.boolean().default(true) });
type PlayerState = SchemaType<typeof Player>;
const ArcadeState = schema({ gameId: t.string(), started: t.boolean().default(false), timeLeft: t.uint8().default(40), players: t.map(Player) });
type ArcadeRoomState = SchemaType<typeof ArcadeState>;
const multiplayerGames = new Set<GameId>(['night-market-rush','pinball-duel','ring-toss','neon-wiring','bumper-alley','hopscotch-king']);
const gameActions: Record<string, Set<string>> = {
  'night-market-rush': new Set(['A','S','D']), 'pinball-duel': new Set(['LEFT','RIGHT','ACTION']), 'ring-toss': new Set(['LEFT','RIGHT','ACTION']),
  'neon-wiring': new Set(['LEFT','RIGHT','ACTION']), 'bumper-alley': new Set(['LEFT','RIGHT','UP','DOWN','ACTION']), 'hopscotch-king': new Set(['LEFT','RIGHT','UP','DOWN']),
};

class ArcadeRoom extends Room<{ state: ArcadeRoomState }> {
  maxClients = 4;
  state = new ArcadeState();
  private hostId = '';
  private countdownTimer?: ReturnType<typeof setInterval>;
  private lastInputAt = new Map<string, number>();
  private runs = new Map<string, GameRun>();
  private seed = 1;
  messages = {
    ready: (client: { sessionId: string }, message: { ready?: boolean }) => {
      const player = this.state.players.get(client.sessionId);
      if (player && !this.state.started) { player.ready = Boolean(message?.ready); this.broadcast('players', this.playerList()); }
    },
    start: (client: Client) => {
      if (client.sessionId !== this.hostId || this.state.started) return;
      if (this.state.players.size < 2) return client.send('error', '至少邀請一位朋友才能開始對戰。');
      if (Array.from(this.state.players.values()).some((player) => !player.connected || !player.ready)) return client.send('error', '所有在線玩家都要先按「準備好」。');
      this.seed = (Date.now() ^ Math.floor(Math.random() * 0xffffffff)) >>> 0 || 1;
      this.runs.clear();
      this.state.players.forEach((player, sessionId) => {
        player.score = 0;
        this.runs.set(sessionId, createGameRun({ id: this.state.gameId as GameId, singleSeconds: 40 } as GameSpec, true, this.seed));
      });
      this.state.timeLeft = 40; this.state.started = true; this.broadcast('game-start', { gameId: this.state.gameId, seed: this.seed });
      this.broadcast('players', this.playerList());
      this.countdownTimer = setInterval(() => {
        if (!this.state.started) return;
        this.state.timeLeft = Math.max(0, this.state.timeLeft - 1);
        this.runs.forEach((run, sessionId) => {
          const next = advanceGameRun(run, 1); this.runs.set(sessionId, next);
          const player = this.state.players.get(sessionId); if (player) player.score = Math.min(65535, next.score);
        });
        this.broadcast('score', { scores: this.scores(), timeLeft: this.state.timeLeft });
        if (this.state.timeLeft === 0) {
          this.state.started = false; this.state.players.forEach((player) => { player.ready = false; });
          const scores = this.scores(); const top = scores[0]?.score ?? 0;
          this.broadcast('round-over', { scores, winners: scores.filter((player) => player.score === top).map((player) => player.nickname), seed: this.seed });
          this.broadcast('players', this.playerList());
          if (this.countdownTimer) clearInterval(this.countdownTimer);
        }
      }, 1000);
    },
    input: (client: Client, message: { action?: string }) => {
      if (!this.state.started || !message?.action || !gameActions[this.state.gameId]?.has(message.action)) return;
      const player = this.state.players.get(client.sessionId); const run = this.runs.get(client.sessionId);
      if (!player || !run || !player.connected) return;
      const now = Date.now(); if (!acceptsInput(now, this.lastInputAt.get(client.sessionId) ?? 0)) return;
      this.lastInputAt.set(client.sessionId, now);
      const next = applyGameAction(run, message.action as Parameters<typeof applyGameAction>[1]);
      this.runs.set(client.sessionId, next); player.score = Math.min(65535, next.score);
      this.broadcast('score', { scores: this.scores(), timeLeft: this.state.timeLeft });
    },
  };

  onCreate(options: { gameId?: string }) { this.state.gameId = multiplayerGames.has(options.gameId as GameId) ? options.gameId! : 'night-market-rush'; }
  onJoin(client: { sessionId: string }, options: { nickname?: string }) {
    if (!this.hostId) this.hostId = client.sessionId;
    const player = new Player(); player.nickname = (options.nickname ?? '夜市熟客').trim().slice(0, 12) || '夜市熟客'; player.connected = true;
    this.state.players.set(client.sessionId, player);
  }
  async onDrop(client: Client) {
    const player = this.state.players.get(client.sessionId); if (player) player.connected = false;
    this.broadcast('players', this.playerList());
    try { await this.allowReconnection(client, 20); } catch { /* reconnection window expired */ }
  }
  onReconnect(client: Client) { const player = this.state.players.get(client.sessionId); if (player) player.connected = true; this.broadcast('players', this.playerList()); }
  onLeave(client: { sessionId: string }) {
    this.state.players.delete(client.sessionId); this.lastInputAt.delete(client.sessionId); this.runs.delete(client.sessionId);
    if (this.hostId === client.sessionId) this.hostId = nextConnectedHost(this.state.players.entries());
    this.broadcast('players', this.playerList());
  }
  onDispose() { if (this.countdownTimer) clearInterval(this.countdownTimer); }
  private playerList() {
    return Array.from(this.state.players.entries()).map(([sessionId, player]: [string, PlayerState]) => ({ sessionId, nickname: player.nickname, score: player.score, ready: player.ready, host: sessionId === this.hostId, connected: player.connected, started: this.state.started }));
  }
  private scores() { return this.playerList().sort((a, b) => b.score - a.score); }
}

const port = Number(process.env.PORT ?? 2567);
const server = defineServer({ transport: new WebSocketTransport(), rooms: { arcade: defineRoom(ArcadeRoom) } });
server.listen(port);
console.log(`老馬麵攤多人伺服器已啟動：http://localhost:${port}`);
