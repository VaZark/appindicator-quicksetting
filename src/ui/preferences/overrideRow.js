import Adw from "gi://Adw";
import Gtk from "gi://Gtk";
import Pango from "gi://Pango";
import { gettext as _ } from "resource:///org/gnome/Shell/Extensions/js/extensions/prefs.js";

export function createIconButton(iconName, label, onClick) {
  const button = new Gtk.Button({ iconName, tooltipText: label, valign: Gtk.Align.CENTER });
  button.update_property([Gtk.AccessibleProperty.LABEL], [label]);
  button.add_css_class("flat");
  button.connect("clicked", onClick);
  return button;
}

function formatOverrideValue(type, value) {
  if (type === "label") return value || _("Default app name");
  return String(value ?? 0);
}

function createOverrideEditor(type) {
  if (type === "label") {
    return new Gtk.Entry({ placeholderText: _("Default app name"), widthChars: 16 });
  }
  return new Gtk.SpinButton({
    adjustment: new Gtk.Adjustment({
      lower: -10000,
      upper: 10000,
      stepIncrement: 1,
      pageIncrement: 10,
    }),
    numeric: true,
  });
}

// Each row owns its draft. Only confirmation writes to settings.
class EditableOverride {
  constructor(row, actions, type, savedValue, removeButton, onSave) {
    this.row = row;
    this.type = type;
    this.savedValue = savedValue;
    this.onSave = onSave;
    this.valueLabel = new Gtk.Label({
      label: formatOverrideValue(type, savedValue),
      ellipsize: Pango.EllipsizeMode.END,
      maxWidthChars: 24,
    });
    this.editor = createOverrideEditor(type);
    this.editButton = createIconButton("document-edit-symbolic", _("Edit override"), () =>
      this.beginEditing(),
    );
    this.confirmButton = createIconButton("object-select-symbolic", _("Confirm changes"), () =>
      this.confirmChanges(),
    );
    this.undoButton = createIconButton("edit-undo-symbolic", _("Discard changes"), () =>
      this.finishEditing(),
    );
    this.displayWidgets = [this.valueLabel, this.editButton, removeButton];
    this.editWidgets = [this.editor, this.confirmButton, this.undoButton];
    for (const widget of [
      this.valueLabel,
      this.editor,
      this.editButton,
      removeButton,
      this.confirmButton,
      this.undoButton,
    ])
      actions.append(widget);
    if (type === "label") this.editor.connect("activate", () => this.confirmChanges());
    this.setEditing(false);
  }

  setEditing(editing) {
    for (const widget of this.displayWidgets) widget.visible = !editing;
    for (const widget of this.editWidgets) widget.visible = editing;
    this.row.activatable_widget = editing ? this.editor : this.editButton;
  }

  beginEditing() {
    if (this.type === "label") this.editor.text = this.savedValue ?? "";
    else this.editor.value = this.savedValue ?? 0;
    this.setEditing(true);
    this.editor.grab_focus();
  }

  readDraft() {
    if (this.type === "label") return this.editor.text.trim();
    this.editor.update();
    return this.editor.get_value_as_int();
  }

  confirmChanges() {
    const value = this.readDraft();
    this.onSave(value);
    this.savedValue = value;
    this.valueLabel.label = formatOverrideValue(this.type, value);
    this.finishEditing();
  }

  finishEditing() {
    this.setEditing(false);
    this.editButton.grab_focus();
  }
}

export function createOverrideRow({ id, name, type, value, onSave, onRemove }) {
  const row = new Adw.ActionRow({ title: name, subtitle: id, useMarkup: false });
  const actions = new Gtk.Box({ spacing: 6, valign: Gtk.Align.CENTER });
  const removeButton = createIconButton("user-trash-symbolic", _("Delete override"), onRemove);
  row.add_suffix(actions);
  if (type === "hidden") {
    actions.append(removeButton);
    row.activatable_widget = removeButton;
    return { row, control: removeButton };
  }
  const editable = new EditableOverride(row, actions, type, value, removeButton, onSave);
  return { row, control: editable.editButton };
}
