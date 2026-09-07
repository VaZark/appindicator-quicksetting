export const ACTIVE_APPS_KEY = "active-apps";

export const APP_OVERRIDES_KEY = "app-overrides";

export function readAppOverrides(settings) {
  try {
    const value = JSON.parse(settings.get_string(APP_OVERRIDES_KEY));
    if (!value || typeof value !== "object" || Array.isArray(value)) return {};
    return Object.fromEntries(
      Object.entries(value).filter(
        ([, record]) => record && typeof record === "object" && !Array.isArray(record),
      ),
    );
  } catch {
    return {};
  }
}

export function updateAppOverride(settings, id, patch) {
  if (!id) return;
  const records = readAppOverrides(settings);
  const previous = Object.hasOwn(records, id) ? records[id] : {};
  const record = { ...previous, ...patch };
  for (const key of Object.keys(record)) {
    if (record[key] === undefined) delete record[key];
  }
  if (JSON.stringify(previous) === JSON.stringify(record)) return;
  Object.defineProperty(records, id, { value: record, enumerable: true, configurable: true });
  settings.set_string(APP_OVERRIDES_KEY, JSON.stringify(records));
}

export function getAppOverride(records, id) {
  return Object.hasOwn(records, id) ? records[id] : {};
}

export function getAppOrder(records, id) {
  const order = getAppOverride(records, id).order;
  return Number.isSafeInteger(order) ? order : 0;
}

export function orderAppItems(items, records, getId) {
  // Stable sorting preserves registration order for conflicting priorities.
  return [...items].sort((a, b) => getAppOrder(records, getId(a)) - getAppOrder(records, getId(b)));
}

export function addAppOverride(settings, id, type) {
  const defaults = { label: "", order: 0, hidden: false };
  if (!id || !Object.hasOwn(defaults, type)) return false;
  const record = getAppOverride(readAppOverrides(settings), id);
  if (Object.hasOwn(record, type)) return false;
  updateAppOverride(settings, id, { [type]: defaults[type] });
  return true;
}
