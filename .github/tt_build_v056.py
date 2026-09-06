from pathlib import Path
import hashlib, json

src = Path('plugins/theme-toolkit/index-v055.js')
out = Path('plugins/theme-toolkit/index-v056.js')
manifest_path = Path('plugins/theme-toolkit/manifest.json')
text = src.read_text()

def replace_once(old, new, label):
    global text
    if text.count(old) != 1:
        raise SystemExit(f'{label}: expected 1 match, got {text.count(old)}')
    text = text.replace(old, new, 1)

replace_once(
'''    mentionBackgroundEnabled: true,
    mentionLineEnabled: true,

    mentionTagSource: "theme",''',
'''    mentionBackgroundEnabled: true,
    mentionLineEnabled: true,
    mentionTextMode: "auto",
    mentionTextColor: "",

    mentionTagSource: "theme",''',
'defaults')

insert_marker = '''  function toolkitMentionTagGradient() {'''
helper = '''  function themeMessageBaseColor() {
    const data = currentTheme()?.data ?? null;
    const semantic = data?.semanticColors ?? {};
    return colorValue(semantic.CHAT_BACKGROUND)
      ?? colorValue(semantic.BACKGROUND_PRIMARY)
      ?? colorValue(semantic.BACKGROUND_BASE_LOWEST)
      ?? colorValue(semantic.BACKGROUND_BASE_LOW)
      ?? "#313338";
  }
  function rgbParts(value) {
    const hex = stripAlpha(value);
    if (!hex) return null;
    return {
      r: parseInt(hex.slice(1, 3), 16),
      g: parseInt(hex.slice(3, 5), 16),
      b: parseInt(hex.slice(5, 7), 16),
    };
  }
  function blendOver(foreground, background) {
    const fg = rgbParts(foreground);
    const bg = rgbParts(background);
    if (!fg || !bg) return stripAlpha(foreground) ?? stripAlpha(background);
    const a = colorAlpha(foreground, 1);
    const blend = (x, y) => Math.round(x * a + y * (1 - a));
    return `#${[blend(fg.r, bg.r), blend(fg.g, bg.g), blend(fg.b, bg.b)]
      .map(n => n.toString(16).padStart(2, "0")).join("")}`.toUpperCase();
  }
  function relativeLuminance(value) {
    const rgb = rgbParts(value);
    if (!rgb) return 0;
    const linear = n => {
      const s = n / 255;
      return s <= 0.04045 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
    };
    return 0.2126 * linear(rgb.r) + 0.7152 * linear(rgb.g) + 0.0722 * linear(rgb.b);
  }
  function autoContrastText(background) {
    const effective = blendOver(background, themeMessageBaseColor());
    if (!effective) return null;
    const lum = relativeLuminance(effective);
    const whiteContrast = 1.05 / (lum + 0.05);
    const blackContrast = (lum + 0.05) / 0.05;
    return blackContrast >= whiteContrast ? "#000000" : "#FFFFFF";
  }
  function effectiveMentionTextColor(cfg) {
    const mode = storage.mentionTextMode ?? "auto";
    if (mode === "theme") return null;
    if (mode === "custom") return stripAlpha(storage.mentionTextColor);
    if (mode === "auto" && cfg.backgroundEnabled && cfg.background) return autoContrastText(cfg.background);
    return null;
  }

'''
replace_once(insert_marker, helper + insert_marker, 'contrast helpers')

replace_once(
'''          if (cfg.backgroundEnabled && background != null) next.backgroundColor = background;
          if (cfg.lineEnabled && line != null) next.gutterColor = line;
          result.backgroundHighlight = next;''',
'''          if (cfg.backgroundEnabled && background != null) next.backgroundColor = background;
          if (cfg.lineEnabled && line != null) next.gutterColor = line;
          result.backgroundHighlight = next;
          const textColor = effectiveMentionTextColor(cfg);
          if (textColor && result.message && typeof result.message === "object") {
            const processed = nativeColor(textColor);
            if (processed != null) result.message.textColor = processed;
          }''',
'row text color')

replace_once(
'''        storage.mentionColorSource !== "discord" ? React.createElement(RN.View, { style: { gap: 8 } },
          React.createElement(ToggleRow, { labelText: "Message background", value: storage.mentionBackgroundEnabled !== false, onChange: value => set("mentionBackgroundEnabled", value) }),
          React.createElement(ToggleRow, { labelText: "Side line", value: storage.mentionLineEnabled !== false, onChange: value => set("mentionLineEnabled", value) }),
        ) : null,
      ),''',
'''        storage.mentionColorSource !== "discord" ? React.createElement(RN.View, { style: { gap: 8 } },
          React.createElement(ToggleRow, { labelText: "Message background", value: storage.mentionBackgroundEnabled !== false, onChange: value => set("mentionBackgroundEnabled", value) }),
          React.createElement(ToggleRow, { labelText: "Side line", value: storage.mentionLineEnabled !== false, onChange: value => set("mentionLineEnabled", value) }),
          React.createElement(RN.Text, { style: label }, "Message text"),
          React.createElement(Choice, {
            value: storage.mentionTextMode,
            options: [{ value: "theme", label: "Theme" }, { value: "auto", label: "Auto contrast" }, { value: "custom", label: "Custom" }],
            onChange: value => set("mentionTextMode", value),
          }),
          storage.mentionTextMode === "custom" ? React.createElement(ColorInput, { labelText: "Message text color", storageKey: "mentionTextColor" }) : null,
          React.createElement(RN.Text, { style: text }, "Auto contrast chooses black or white for the message body based on the effective highlight background. The @mention tag keeps its own separate styling."),
        ) : null,
      ),''',
'settings')

replace_once('Theme Toolkit v0.5.5', 'Theme Toolkit v0.5.6', 'version')
replace_once(
'Color fields now keep keyboard focus while typing or editing hex. The color preview updates as you type, and the value is normalized when editing finishes.',
'Mentioned messages can now use automatic black/white body-text contrast against the chosen highlight background. Inline @mention tag styling remains independent.',
'header')

out.write_text(text)
raw = text.encode()
blob_sha = hashlib.sha1(f'blob {len(raw)}\\0'.encode() + raw).hexdigest()
manifest = json.loads(manifest_path.read_text())
manifest['main'] = 'index-v056.js'
manifest['hash'] = blob_sha
manifest_path.write_text(json.dumps(manifest, indent=2) + '\n')
