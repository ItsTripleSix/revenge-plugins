from pathlib import Path
import hashlib
import json

src_path = Path('plugins/theme-toolkit/index-v053.js')
out_path = Path('plugins/theme-toolkit/index-v054.js')
manifest_path = Path('plugins/theme-toolkit/manifest.json')
text = src_path.read_text()


def replace_once(old: str, new: str, label: str) -> None:
    global text
    count = text.count(old)
    if count != 1:
        raise SystemExit(f'{label}: expected exactly one match, got {count}')
    text = text.replace(old, new, 1)


def replace_between(start: str, end: str, replacement: str, label: str) -> None:
    global text
    i = text.find(start)
    if i < 0:
        raise SystemExit(f'{label}: start marker missing')
    j = text.find(end, i)
    if j < 0:
        raise SystemExit(f'{label}: end marker missing')
    text = text[:i] + replacement + text[j:]


replace_once(
    '  const MarkupParsers = (() => { try { return findByProps("parseMessageMarkup", "parseEmbedTitleMarkup"); } catch { return null; } })();',
    '  const MarkupParsers = (() => { try { return findByProps("parseMessageMarkup", "parseEmbedTitleMarkup"); } catch { return null; } })();\n'
    '  const ColorPickerActionSheet = (() => { try { return findByProps("CUSTOM_COLOR_PICKER_KEY"); } catch { return null; } })();',
    'color picker module',
)

replace_between(
    '    function ColorInput({ labelText, storageKey }) {',
    '    function ToggleRow({ labelText, value, onChange }) {',
    '''    function pickerHex(value) {
      try {
        const converted = ColorUtils?.int2hex?.(value);
        const parsed = stripAlpha(converted);
        if (parsed) return parsed;
      } catch {}
      const n = Number(value);
      if (!Number.isFinite(n)) return "#FFFFFF";
      return `#${(n >>> 0 & 0xFFFFFF).toString(16).padStart(6, "0")}`.toUpperCase();
    }
    function openColorPicker(storageKey, labelText) {
      const picker = ColorPickerActionSheet?.default;
      if (typeof picker !== "function") {
        toast("Discord color picker is unavailable on this build");
        return;
      }
      const current = colorValue(storage[storageKey]);
      const base = stripAlpha(current) ?? "#FFFFFF";
      const alpha = current?.length === 9 ? current.slice(7, 9) : "";
      const color = tagColorInt(base) ?? 0xFFFFFF;
      try {
        picker({
          color,
          onSelect(value) {
            const selected = pickerHex(value);
            storage[storageKey] = alpha ? `${selected}${alpha}` : selected;
            forceUpdate();
            refreshToolkitUI();
          },
        });
      } catch (error) {
        try { console.error("[ThemeToolkit] color picker failed", error); } catch {}
        toast(`Could not open color picker for ${labelText}`);
      }
    }
    function ColorInput({ labelText, storageKey }) {
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
''',
    'color input',
)

replace_once('Theme Toolkit v0.5.3', 'Theme Toolkit v0.5.4', 'version title')
replace_once(
    'Mentions are split into a static full-message highlight and the native inline @mention tag. Inline tags support solid or static gradient colors. Live mention animation is intentionally disabled because native row refreshes were unstable.',
    'All manual color fields now include a tappable color swatch plus an editable hex field. Picker selections write the hex value back into the field; 8-digit alpha values keep their existing alpha when RGB is changed with the picker.',
    'header text',
)

out_path.write_text(text)
raw = text.encode()
blob_sha = hashlib.sha1(f'blob {len(raw)}\\0'.encode() + raw).hexdigest()
manifest = json.loads(manifest_path.read_text())
manifest['main'] = 'index-v054.js'
manifest['hash'] = blob_sha
manifest_path.write_text(json.dumps(manifest, indent=2) + '\n')
