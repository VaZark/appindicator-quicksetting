export function getIndicatorName(indicator) {
  return indicator.appName || indicator.title || indicator.label || indicator.id || "Application";
}
