/* extension.js
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 2 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <http://www.gnu.org/licenses/>.
 *
 * SPDX-License-Identifier: GPL-2.0-or-later
 */
import GObject from 'gi://GObject';

import * as Main from 'resource:///org/gnome/shell/ui/main.js';

import {Extension, gettext as _} from 'resource:///org/gnome/shell/extensions/extension.js';
import {QuickToggle, SystemIndicator} from 'resource:///org/gnome/shell/ui/quickSettings.js';


const RunningAppsToggle = GObject.registerClass(
class RunningAppsToggle extends QuickToggle {
    _init() {
        super._init({
            hasMenu: true,
            iconName: 'go-next-symbolic',
        });

        this.add_style_class_name('background-apps-quick-toggle');
        this._box.set_child_above_sibling(this._icon,null);
        this.title = _('Running Apps');
        this.menu.setHeader(
            'preferences-desktop-multitasking-symbolic',
            _('Running Apps')
        );

        this.connect('popup-menu', () => {
            this.menu.open();
        });
    }

    vfunc_clicked() {
        this.menu.open();
    }

});


const RunningAppsIndicator = GObject.registerClass(
class RunningAppsIndicator extends SystemIndicator {
  constructor() {
      super();

      this._indicator = this._addIndicator();
      this._indicator.iconName = 'preferences-desktop-multitasking-symbolic';

      const toggle = new RunningAppsToggle();
      toggle.bind_property('checked',
          this._indicator, 'visible',
          GObject.BindingFlags.SYNC_CREATE);
      this.quickSettingsItems.push(toggle);
  }
});

export default class RunningAppsExtension extends Extension {
    enable() {
        this._indicator = new RunningAppsIndicator();
        Main.panel.statusArea.quickSettings.addExternalIndicator(this._indicator);
    }

    disable() {
        this._indicator.quickSettingsItems.forEach(item => item.destroy());
        this._indicator.destroy();
    }
}
