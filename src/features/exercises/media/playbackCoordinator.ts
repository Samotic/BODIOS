/**
 * Makes sure only one demo plays at a time: starting a player pauses
 * whichever one was playing before.
 */
type ActivePlayer = { id: symbol; pause: () => void };

let active: ActivePlayer | null = null;

export function claimPlayback(id: symbol, pause: () => void): void {
  if (active && active.id !== id) {
    active.pause();
  }
  active = { id, pause };
}

export function releasePlayback(id: symbol): void {
  if (active?.id === id) {
    active = null;
  }
}
