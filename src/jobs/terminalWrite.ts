/** Execute exactly one terminal persistence attempt. A database error must propagate,
 * never be reclassified into a second terminal write by this boundary. */
export async function writeTerminalOnce<T>(write: () => Promise<T>): Promise<T> {
  return await write();
}
