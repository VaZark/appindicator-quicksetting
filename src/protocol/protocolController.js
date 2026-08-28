import { StatusNotifierWatcher } from "./statusNotifierWatcher.js";

/**
 * Owns the StatusNotifier protocol lifecycle and translates its signals into
 * the small message interface consumed by the UI controller.
 */
export class ProtocolController {
  constructor(createWatcher = () => new StatusNotifierWatcher()) {
    this._createWatcher = createWatcher;
    this._watcher = null;
    this._signalIds = [];
  }

  start({ indicatorAdded, indicatorRemoved }) {
    if (this._watcher) return;

    this._watcher = this._createWatcher();
    this._signalIds = [
      this._watcher.connect("item-added", (_watcher, indicator) => {
        indicatorAdded(indicator);
      }),
      this._watcher.connect("item-removed", (_watcher, indicator) => {
        indicatorRemoved(indicator);
      }),
    ];
  }

  stop() {
    if (!this._watcher) return;

    for (const signalId of this._signalIds) {
      this._watcher.disconnect(signalId);
    }

    this._watcher.destroy();
    this._watcher = null;
    this._signalIds = [];
  }
}
