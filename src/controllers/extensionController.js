import { resetDisposable } from "../utils/lifecycle.js";

export class ExtensionController {
  constructor({ createWidget, createProtocol, addWidget }) {
    this._widgetFactory = createWidget;
    this._protocolFactory = createProtocol;
    this._addWidget = addWidget;
  }

  enable() {
    this._enableWidget();
    this._connectProtocol();
  }

  _enableWidget() {
    this.widget = this._widgetFactory();
    this._addWidget(this.widget);
  }

  _connectProtocol() {
    this.protocol = this._protocolFactory();
    this.protocol.start({
      indicatorAdded: (indicator) => this.widget.addIndicator(indicator),
      indicatorRemoved: (indicator) => this.widget.removeIndicator(indicator),
    });
  }

  disable() {
    this._disconnectProtocol();
    this._disableWidget();
  }

  _disconnectProtocol() {
    this.protocol?.stop();
    this.protocol = null;
  }

  _disableWidget() {
    this.widget = resetDisposable(this.widget);
  }
}
