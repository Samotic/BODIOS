/**
 * Random RFC 4122 version-4 ID for locally created records (routines,
 * sessions, sets). Hermes has no crypto.randomUUID, and these IDs only need
 * to be unique, not secret, so Math.random is sufficient here. Revisit if
 * IDs ever need to be unguessable (e.g. shared links).
 */
export function createId(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, char => {
    const random = Math.floor(Math.random() * 16);
    const value = char === 'x' ? random : (random % 4) + 8;
    return value.toString(16);
  });
}
