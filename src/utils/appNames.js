export function getIndicatorName(indicator) {
  return indicator.appName || indicator.title || indicator.label || indicator.id || "Application";
}

export function lookupFlatpakAppInfo(appId, lookupApp) {
  if (typeof appId !== "string" || typeof lookupApp !== "function") return null;

  const normalizedAppId = appId.trim();
  if (!normalizedAppId) return null;

  return lookupApp(`${normalizedAppId}.desktop`)?.appInfo ?? null;
}
