export class ExtensionController {
  constructor({ createWidget, createWatcher, addWidget }) {
    this._createWidget = createWidget;
    this._createWatcher = createWatcher;
    this._addWidget = addWidget;
  }

  enable() {
    this.widget = this._createWidget();
    this._addWidget(this.widget);

    this.watcher = this._createWatcher();
    this._addedId = this.watcher.connect("item-added", (_watcher, item) => {
      this.widget.addIndicator(item);
    });
    this._removedId = this.watcher.connect("item-removed", (_watcher, item) => {
      this.widget.removeIndicator(item);
    });
  }

  disable() {
    if (this.watcher) {
      if (this._addedId) this.watcher.disconnect(this._addedId);
      if (this._removedId) this.watcher.disconnect(this._removedId);
      this.watcher.destroy();
      this.watcher = null;
    }

    this._addedId = 0;
    this._removedId = 0;

    if (this.widget) {
      this.widget.destroy();
      this.widget = null;
    }
  }
}
