export const SUBMENU_PREVIEW_ITEMS = 5;

export function previewHeight(heights, itemCount = SUBMENU_PREVIEW_ITEMS) {
  return heights.slice(0, itemCount).reduce((height, itemHeight) => height + itemHeight, 0);
}

export function revealAdjustment(current, pageSize, upper, targetTop, targetBottom) {
  const maximum = Math.max(0, upper - pageSize);
  let value = current;

  if (targetBottom > current + pageSize) value = targetBottom - pageSize;
  if (targetTop < value) value = targetTop;

  return Math.max(0, Math.min(value, maximum));
}
