export class IndicatorItems {
  constructor(createItem, addMenuItem) {
    this._createItem = createItem;
    this._addMenuItem = addMenuItem;
    this._items = new Map();
  }

  add(indicator) {
    if (this._items.has(indicator.uniqueId)) return null;

    const item = this._createItem(indicator);
    this._items.set(indicator.uniqueId, item);
    this._addMenuItem(item);
    return item;
  }

  remove(indicator) {
    const item = this._items.get(indicator.uniqueId);
    if (!item) return false;

    this._items.delete(indicator.uniqueId);
    item.destroy();
    return true;
  }

  destroyAll() {
    for (const item of this._items.values()) item.destroy();
    this._items.clear();
  }
}
