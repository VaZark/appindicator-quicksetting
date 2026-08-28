import { StatusNotifierWatcher } from "./statusNotifierWatcher.js";
import { createSignalManager, resetDisposable } from "../utils/lifecycle.js";

/**
 * Owns the StatusNotifier protocol lifecycle and translates its signals into
 * the small message interface consumed by the UI controller.
 */
export class ProtocolController {
  constructor(createWatcher = () => new StatusNotifierWatcher()) {
    this._createWatcher = createWatcher;
    this._watcher = null;
    this._signals = createSignalManager();
  }

  start({ indicatorAdded, indicatorRemoved }) {
    if (this._watcher) return;

    this._watcher = this._createWatcher();
    this._signals.connect(this._watcher, "item-added", (_watcher, indicator) => {
      indicatorAdded(indicator);
    });
    this._signals.connect(this._watcher, "item-removed", (_watcher, indicator) => {
      indicatorRemoved(indicator);
    });
  }

  stop() {
    if (!this._watcher) return;

    this._signals.reset();
    this._watcher = resetDisposable(this._watcher);
  }
}
