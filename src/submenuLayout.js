export const SUBMENU_PREVIEW_ITEMS = 5;

export function previewHeight(heights, itemCount = SUBMENU_PREVIEW_ITEMS) {
  return heights.slice(0, itemCount).reduce((height, itemHeight) => height + itemHeight, 0);
}

export function previewStyle(style, heights) {
  const declarations = (style ?? "")
    .split(";")
    .map((declaration) => declaration.trim())
    .filter((declaration) => declaration && !declaration.startsWith("min-height:"));
  const height = previewHeight(heights);

  if (height > 0) declarations.push(`min-height: ${Math.ceil(height)}px`);

  return declarations.length > 0 ? `${declarations.join("; ")};` : null;
}

export function revealAdjustment(current, pageSize, upper, targetTop, targetBottom) {
  const maximum = Math.max(0, upper - pageSize);
  let value = current;

  if (targetBottom > current + pageSize) value = targetBottom - pageSize;
  if (targetTop < value) value = targetTop;

  return Math.max(0, Math.min(value, maximum));
}
