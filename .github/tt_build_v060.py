from pathlib import Path
import hashlib, json

src = Path('plugins/theme-toolkit/index-v056.js')
out = Path('plugins/theme-toolkit/index-v060.js')
manifest_path = Path('plugins/theme-toolkit/manifest.json')
text = src.read_text()

def replace_once(old, new, label):
    global text
    count = text.count(old)
    if count != 1:
        raise SystemExit(f'{label}: expected 1 match, got {count}')
    text = text.replace(old, new, 1)

replace_once(
'  const { after } = vendetta.patcher;',
'  const { after, before } = vendetta.patcher;',
'patcher import')

replace_once(
'''  const ColorPickerActionSheet = (() => { try { return findByProps("CUSTOM_COLOR_PICKER_KEY"); } catch { return null; } })();\n  const toolkitIcon = (() => {''',
'''  const ColorPickerActionSheet = (() => { try { return findByProps("CUSTOM_COLOR_PICKER_KEY"); } catch { return null; } })();\n  const GuildBarWrapperModule = (() => { try { return findByProps("useGuildsBarAnimatedWrapperStyles", "renderUnreadIndicator"); } catch { return null; } })();\n  const HomeIconModule = (() => { try { return findByProps("HomeIcon"); } catch { return null; } })();\n  const SearchIconModule = (() => { try { return findByProps("MagnifyingGlassIcon"); } catch { return null; } })();\n  const SettingsIconModule = (() => { try { return findByProps("SettingsIcon"); } catch { return null; } })();\n  const toolkitIcon = (() => {''',
'new modules')

replace_once(
'''    mentionTagGradient1: "",\n    mentionTagGradient2: "",\n    mentionTagGradient3: "",\n  };''',
'''    mentionTagGradient1: "",\n    mentionTagGradient2: "",\n    mentionTagGradient3: "",\n\n    // v0.6.0 visual batch test defaults. These are intentionally loud and will be nulled after validation.\n    uiAccentSource: "toolkit",\n    smartAccentColor: "#B026FF",\n    selectedGuildAccent: "#FF00FF",\n    reactionAccent: "#39FF14",\n    homeIconAccent: "#00FFFF",\n    searchIconAccent: "#FFEA00",\n    settingsIconAccent: "#FF6600",\n  };''',
'accent defaults')

replace_once(
'''  let unpatchMentions = null;\n  let unpatchMentionTags = null;\n  let appStateSubscription = null;''',
'''  let unpatchMentions = null;\n  let unpatchMentionTags = null;\n  let unpatchGuildBarStyles = null;\n  let unpatchHomeIcon = null;\n  let unpatchSearchIcon = null;\n  let unpatchSettingsIcon = null;\n  let appStateSubscription = null;''',
'unpatch vars')

insert_marker = '''  function toolkitMentionTagGradient() {'''
helpers = r'''  function themeUIAccentConfig() {
    const data = currentTheme()?.data ?? null;
    if (!data) return { hasTheme: false, accent: null, selectedGuild: null, reaction: null, icon: null };
    const semantic = data.semanticColors ?? {};
    const raw = data.rawColors ?? {};
    const extra = data.themeToolkit?.ui ?? data.themeToolkit?.accents ?? {};
    const accent = colorValue(extra.accent)
      ?? colorValue(semantic.BACKGROUND_BRAND)
      ?? colorValue(semantic.BUTTON_POSITIVE_BACKGROUND)
      ?? colorValue(raw.BRAND_360)
      ?? colorValue(raw.BRAND_500);
    return {
      hasTheme: true,
      accent,
      selectedGuild: colorValue(extra.selectedGuild) ?? colorValue(extra.guildSelected) ?? accent,
      reaction: colorValue(extra.reaction) ?? colorValue(semantic.REACTION_BACKGROUND_REACTED_DEFAULT) ?? accent,
      icon: colorValue(extra.icon) ?? colorValue(semantic.INTERACTIVE_ICON_DEFAULT) ?? colorValue(semantic.TEXT_STRONG) ?? accent,
    };
  }
  function effectiveUIAccentConfig() {
    const requested = storage.uiAccentSource ?? "theme";
    const theme = themeUIAccentConfig();
    if (requested === "toolkit") {
      const accent = colorValue(storage.smartAccentColor);
      return {
        source: "toolkit",
        accent,
        selectedGuild: colorValue(storage.selectedGuildAccent) ?? accent,
        reaction: colorValue(storage.reactionAccent) ?? accent,
        homeIcon: colorValue(storage.homeIconAccent) ?? accent,
        searchIcon: colorValue(storage.searchIconAccent) ?? accent,
        settingsIcon: colorValue(storage.settingsIconAccent) ?? accent,
      };
    }
    if (requested === "theme" && theme.hasTheme) {
      return {
        source: "theme",
        accent: theme.accent,
        selectedGuild: theme.selectedGuild,
        reaction: theme.reaction,
        homeIcon: theme.icon,
        searchIcon: theme.icon,
        settingsIcon: theme.icon,
      };
    }
    return { source: "discord", accent: null, selectedGuild: null, reaction: null, homeIcon: null, searchIcon: null, settingsIcon: null };
  }

  function patchGeneratedIcon(module, method, key) {
    if (!module || typeof module?.[method] !== "function") return null;
    try {
      return before(method, module, args => {
        try {
          const cfg = effectiveUIAccentConfig();
          if (cfg.source === "discord") return;
          const color = nativeColor(cfg[key]);
          if (color == null) return;
          if (!args[0] || typeof args[0] !== "object") args[0] = {};
          args[0].color = color;
        } catch (error) {
          try { console.error(`[ThemeToolkit] ${method} recolor failed`, error); } catch {}
        }
      });
    } catch (error) {
      try { console.error(`[ThemeToolkit] failed to patch ${method}`, error); } catch {}
      return null;
    }
  }

  function patchGuildBarAccent() {
    if (!GuildBarWrapperModule || typeof GuildBarWrapperModule.useGuildsBarAnimatedWrapperStyles !== "function") return null;
    try {
      return after("useGuildsBarAnimatedWrapperStyles", GuildBarWrapperModule, (_args, result) => {
        try {
          const cfg = effectiveUIAccentConfig();
          const color = cfg.source === "discord" ? null : nativeColor(cfg.selectedGuild);
          if (color != null && result && typeof result === "object") {
            result.itemShapeSelected = [result.itemShapeSelected, { backgroundColor: color }];
          }
        } catch (error) {
          try { console.error("[ThemeToolkit] selected guild accent failed", error); } catch {}
        }
        return result;
      });
    } catch (error) {
      try { console.error("[ThemeToolkit] failed to patch selected guild accent", error); } catch {}
      return null;
    }
  }

'''
replace_once(insert_marker, helpers + insert_marker, 'ui helpers')

old_patch = '''  function patchMentionHighlights() {\n    if (typeof MessageRowGenerator?.generateMessageRowData !== "function") return null;\n    try {\n      return after("generateMessageRowData", MessageRowGenerator, (args, result) => {\n        try {\n          const message = args?.[0]?.message;\n          if (!message?.mentioned || !result) return result;\n          const cfg = effectiveMentionConfig();\n          if (cfg.source === "discord") return result;\n          const existing = result.backgroundHighlight ?? {};\n          const next = { ...existing };\n          const background = cfg.backgroundEnabled ? nativeColor(cfg.background) : null;\n          const line = cfg.lineEnabled ? nativeColor(cfg.line) : null;\n          if (cfg.backgroundEnabled && background != null) next.backgroundColor = background;\n          if (cfg.lineEnabled && line != null) next.gutterColor = line;\n          result.backgroundHighlight = next;\n          const textColor = effectiveMentionTextColor(cfg);\n          if (textColor && result.message && typeof result.message === "object") {\n            const processed = nativeColor(textColor);\n            if (processed != null) result.message.textColor = processed;\n          }\n        } catch (error) {\n          try { console.error("[ThemeToolkit] mention highlight patch failed", error); } catch {}\n        }\n        return result;\n      });\n    } catch (error) {\n      try { console.error("[ThemeToolkit] failed to patch mention highlights", error); } catch {}\n      return null;\n    }\n  }'''
new_patch = '''  function patchMentionHighlights() {\n    if (typeof MessageRowGenerator?.generateMessageRowData !== "function") return null;\n    try {\n      return after("generateMessageRowData", MessageRowGenerator, (args, result) => {\n        try {\n          if (!result) return result;\n\n          const ui = effectiveUIAccentConfig();\n          if (ui.source !== "discord" && ui.reaction && result.reactionsTheme && typeof result.reactionsTheme === "object") {\n            const reaction = nativeColor(ui.reaction);\n            const reactionText = nativeColor(autoContrastText(ui.reaction) ?? "#000000");\n            result.reactionsTheme = {\n              ...result.reactionsTheme,\n              ...(reaction != null ? { activeReactionBackgroundColor: reaction, activeReactionBorderColor: reaction } : {}),\n              ...(reactionText != null ? { activeReactionTextColor: reactionText } : {}),\n            };\n          }\n\n          const message = args?.[0]?.message;\n          if (!message?.mentioned) return result;\n          const cfg = effectiveMentionConfig();\n          if (cfg.source === "discord") return result;\n          const existing = result.backgroundHighlight ?? {};\n          const next = { ...existing };\n          const background = cfg.backgroundEnabled ? nativeColor(cfg.background) : null;\n          const line = cfg.lineEnabled ? nativeColor(cfg.line) : null;\n          if (cfg.backgroundEnabled && background != null) next.backgroundColor = background;\n          if (cfg.lineEnabled && line != null) next.gutterColor = line;\n          result.backgroundHighlight = next;\n          const textColor = effectiveMentionTextColor(cfg);\n          if (textColor && result.message && typeof result.message === "object") {\n            const processed = nativeColor(textColor);\n            if (processed != null) result.message.textColor = processed;\n          }\n        } catch (error) {\n          try { console.error("[ThemeToolkit] message row styling failed", error); } catch {}\n        }\n        return result;\n      });\n    } catch (error) {\n      try { console.error("[ThemeToolkit] failed to patch message row styling", error); } catch {}\n      return null;\n    }\n  }'''
replace_once(old_patch, new_patch, 'message row patch')

replace_once('Theme Toolkit v0.5.6', 'Theme Toolkit v0.6.0 TEST', 'version')
replace_once(
'Mentioned messages can now use automatic black/white body-text contrast against the chosen highlight background. Inline @mention tag styling remains independent.',
'Visual batch test: intentionally loud colors are enabled for new icon and UI-accent targets so they can be validated quickly from screenshots.',
'header text')

mention_card_marker = '''      React.createElement(RN.View, { style: card },\n        React.createElement(RN.Text, { style: title }, "Mentioned-message highlight"),'''
accent_card = '''      React.createElement(RN.View, { style: card },\n        React.createElement(RN.Text, { style: title }, "UI accents + icons — batch test"),\n        React.createElement(RN.Text, { style: text }, "Toolkit test defaults are deliberately obvious: selected server = magenta, reacted reaction = lime, Home = cyan, Search = yellow, Settings = orange."),\n        React.createElement(Choice, {\n          value: storage.uiAccentSource,\n          options: [{ value: "theme", label: "Theme / Auto" }, { value: "toolkit", label: "Toolkit" }, { value: "discord", label: "Discord" }],\n          onChange: value => set("uiAccentSource", value),\n        }),\n        storage.uiAccentSource === "toolkit" ? React.createElement(RN.View, { style: { gap: 8 } },\n          React.createElement(ColorInput, { labelText: "Smart accent fallback", storageKey: "smartAccentColor" }),\n          React.createElement(ColorInput, { labelText: "Selected server", storageKey: "selectedGuildAccent" }),\n          React.createElement(ColorInput, { labelText: "Reacted reaction", storageKey: "reactionAccent" }),\n          React.createElement(ColorInput, { labelText: "Home icon", storageKey: "homeIconAccent" }),\n          React.createElement(ColorInput, { labelText: "Search icon", storageKey: "searchIconAccent" }),\n          React.createElement(ColorInput, { labelText: "Settings icon", storageKey: "settingsIconAccent" }),\n          React.createElement(RN.Text, { style: text }, "If an individual override is blank, it inherits Smart accent fallback."),\n        ) : null,\n      ),\n'''
replace_once(mention_card_marker, accent_card + mention_card_marker, 'accent settings card')

replace_once(
'''      unpatchMentions = patchMentionHighlights();\n      unpatchMentionTags = patchMentionTags();''',
'''      unpatchMentions = patchMentionHighlights();\n      unpatchMentionTags = patchMentionTags();\n      unpatchGuildBarStyles = patchGuildBarAccent();\n      unpatchHomeIcon = patchGeneratedIcon(HomeIconModule, "HomeIcon", "homeIcon");\n      unpatchSearchIcon = patchGeneratedIcon(SearchIconModule, "MagnifyingGlassIcon", "searchIcon");\n      unpatchSettingsIcon = patchGeneratedIcon(SettingsIconModule, "SettingsIcon", "settingsIcon");''',
'onload')

replace_once(
'''      try { unpatchMentions?.(); } catch {}\n      try { unpatchMentionTags?.(); } catch {}\n      unpatchFolder = null;\n      unpatchFolderBG = null;\n      unpatchMentions = null;\n      unpatchMentionTags = null;''',
'''      try { unpatchMentions?.(); } catch {}\n      try { unpatchMentionTags?.(); } catch {}\n      try { unpatchGuildBarStyles?.(); } catch {}\n      try { unpatchHomeIcon?.(); } catch {}\n      try { unpatchSearchIcon?.(); } catch {}\n      try { unpatchSettingsIcon?.(); } catch {}\n      unpatchFolder = null;\n      unpatchFolderBG = null;\n      unpatchMentions = null;\n      unpatchMentionTags = null;\n      unpatchGuildBarStyles = null;\n      unpatchHomeIcon = null;\n      unpatchSearchIcon = null;\n      unpatchSettingsIcon = null;''',
'onunload')

out.write_text(text)
raw = text.encode()
blob_sha = hashlib.sha1(f'blob {len(raw)}\\0'.encode() + raw).hexdigest()
manifest = json.loads(manifest_path.read_text())
manifest['main'] = 'index-v060.js'
manifest['hash'] = blob_sha
manifest_path.write_text(json.dumps(manifest, indent=2) + '\n')
