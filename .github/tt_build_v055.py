from pathlib import Path
import hashlib, json

src = Path('plugins/theme-toolkit/index-v054.js')
out = Path('plugins/theme-toolkit/index-v055.js')
manifest_path = Path('plugins/theme-toolkit/manifest.json')
text = src.read_text()

old = '''    function ColorInput({ labelText, storageKey }) {
      const current = colorValue(storage[storageKey]);
      const preview = current ?? "#00000000";
      return React.createElement(RN.View, { style: { gap: 6 } },
        React.createElement(RN.Text, { style: label }, labelText),
        React.createElement(RN.View, { style: { flexDirection: "row", alignItems: "center", gap: 8 } },
          React.createElement(RN.Pressable, {
            accessibilityRole: "button",
            accessibilityLabel: `Pick ${labelText}`,
            onPress: () => openColorPicker(storageKey, labelText),
            style: {
              width: 42,
              height: 42,
              borderRadius: 9,
              borderWidth: 1,
              borderColor: "#6D6F78",
              backgroundColor: "#1E1F22",
              padding: 4,
            },
          }, React.createElement(RN.View, {
            pointerEvents: "none",
            style: { flex: 1, borderRadius: 5, backgroundColor: preview, borderWidth: current ? 0 : 1, borderColor: "#4E5058" },
          })),
          React.createElement(RN.TextInput, {
            value: String(storage[storageKey] ?? ""), autoCapitalize: "characters", autoCorrect: false,
            placeholder: "#RRGGBB or #RRGGBBAA", placeholderTextColor: "#6D6F78",
            onChangeText(value) { storage[storageKey] = value; forceUpdate(); },
            onEndEditing() {
              const raw = String(storage[storageKey] ?? "").trim();
              storage[storageKey] = raw ? (colorValue(raw) ?? "") : "";
              forceUpdate(); refreshToolkitUI();
            },
            style: { flex: 1, color: "#FFFFFF", backgroundColor: "#000000", borderWidth: 1, borderColor: "#4E5058", borderRadius: 8, paddingHorizontal: 10, paddingVertical: 8 },
          }),
        ),
      );
    }
'''

new = '''    function ColorInput({ labelText, storageKey }) {
      const [draft, setDraft] = React.useState(String(storage[storageKey] ?? ""));
      const current = colorValue(draft);
      const preview = current ?? "#00000000";
      return React.createElement(RN.View, { style: { gap: 6 } },
        React.createElement(RN.Text, { style: label }, labelText),
        React.createElement(RN.View, { style: { flexDirection: "row", alignItems: "center", gap: 8 } },
          React.createElement(RN.Pressable, {
            accessibilityRole: "button",
            accessibilityLabel: `Pick ${labelText}`,
            onPress: () => openColorPicker(storageKey, labelText),
            style: {
              width: 42,
              height: 42,
              borderRadius: 9,
              borderWidth: 1,
              borderColor: "#6D6F78",
              backgroundColor: "#1E1F22",
              padding: 4,
            },
          }, React.createElement(RN.View, {
            pointerEvents: "none",
            style: { flex: 1, borderRadius: 5, backgroundColor: preview, borderWidth: current ? 0 : 1, borderColor: "#4E5058" },
          })),
          React.createElement(RN.TextInput, {
            value: draft, autoCapitalize: "characters", autoCorrect: false,
            placeholder: "#RRGGBB or #RRGGBBAA", placeholderTextColor: "#6D6F78",
            onChangeText(value) {
              setDraft(value);
              storage[storageKey] = value;
            },
            onEndEditing() {
              const raw = String(draft ?? "").trim();
              const normalized = raw ? (colorValue(raw) ?? "") : "";
              storage[storageKey] = normalized;
              setDraft(normalized);
              forceUpdate(); refreshToolkitUI();
            },
            style: { flex: 1, color: "#FFFFFF", backgroundColor: "#000000", borderWidth: 1, borderColor: "#4E5058", borderRadius: 8, paddingHorizontal: 10, paddingVertical: 8 },
          }),
        ),
      );
    }
'''

if text.count(old) != 1:
    raise SystemExit(f'ColorInput fragment count: {text.count(old)}')
text = text.replace(old, new, 1)
text = text.replace('Theme Toolkit v0.5.4', 'Theme Toolkit v0.5.5', 1)
text = text.replace(
    'All manual color fields now include a tappable color swatch plus an editable hex field. Picker selections write the hex value back into the field; 8-digit alpha values keep their existing alpha when RGB is changed with the picker.',
    'Color fields now keep keyboard focus while typing or editing hex. The color preview updates as you type, and the value is normalized when editing finishes.',
    1,
)

out.write_text(text)
raw = text.encode()
blob_sha = hashlib.sha1(f'blob {len(raw)}\\0'.encode() + raw).hexdigest()
manifest = json.loads(manifest_path.read_text())
manifest['main'] = 'index-v055.js'
manifest['hash'] = blob_sha
manifest_path.write_text(json.dumps(manifest, indent=2) + '\n')
