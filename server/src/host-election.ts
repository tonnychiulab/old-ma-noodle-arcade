export function nextConnectedHost(players: Iterable<[string, { connected: boolean }]>): string {
  for (const [sessionId, player] of players) if (player.connected) return sessionId;
  return '';
}
