export function normalizeIconName(name) {
  if (!name) return null;

  /* Absolute paths must never be treated as theme icon names. */
  if (name.startsWith("/")) return name;

  const lower = name.toLowerCase();

  for (const extension of [".svg", ".png"]) {
    if (lower.endsWith(extension)) return name.slice(0, -extension.length);
  }

  return name;
}
