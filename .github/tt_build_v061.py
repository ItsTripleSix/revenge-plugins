from pathlib import Path
import hashlib, json

src = Path('plugins/theme-toolkit/index-v060.js')
out = Path('plugins/theme-toolkit/index-v061.js')
manifest_path = Path('plugins/theme-toolkit/manifest.json')
text = src.read_text()

def replace_once(old, new, label):
    global text
    count = text.count(old)
    if count != 1:
        raise SystemExit(f'{label}: expected 1 match, got {count}')
    text = text.replace(old, new, 1)

replace_once(
'  const { findByProps } = vendetta.metro;',
'  const { findByProps, findByName } = vendetta.metro;',
'finder import')

replace_once(
'''  const SettingsIconModule = (() => { try { return findByProps("SettingsIcon"); } catch { return null; } })();\n  const toolkitIcon = (() => {''',
'''  const SettingsIconModule = (() => { try { return findByProps("SettingsIcon"); } catch { return null; } })();\n  const BaseIconImageModule = (() => { try { return findByProps("BaseIconImage"); } catch { return null; } })();\n  const SearchButtonModule = (() => { try { return findByProps("SEARCH_BAR_HEIGHT", "SearchButtonContent"); } catch { return null; } })();\n  const GuildBarGuildModule = (() => { try { return findByName?.("GuildsBarGuild", false); } catch { return null; } })();\n  const toolkitIcon = (() => {''',
'new probe modules')

replace_once(
'''  let unpatchGuildBarStyles = null;\n  let unpatchHomeIcon = null;\n  let unpatchSearchIcon = null;\n  let unpatchSettingsIcon = null;\n  let appStateSubscription = null;''',
'''  let unpatchGuildBarStyles = null;\n  let unpatchGuildBarDirect = null;\n  let unpatchHomeIcon = null;\n  let unpatchSearchIcon = null;\n  let unpatchSettingsIcon = null;\n  let unpatchBaseIconImage = null;\n  let unpatchSearchButtonDirect = null;\n  let appStateSubscription = null;''',
'unpatch vars')

replace_once(
'''  const pathGeometryCache = new Map();\n\n  function toast(text) {''',
'''  const pathGeometryCache = new Map();\n  const batchProbe = {\n    hits: {\n      guildStyle: 0, guildDirect: 0, homeExport: 0, searchExport: 0, settingsExport: 0,\n      baseIcon: 0, baseHome: 0, baseSearch: 0, baseSettings: 0, searchButton: 0,\n      messageRows: 0, reactionRows: 0,\n    },\n  };\n  const iconAssetIds = (() => {\n    try {\n      return {\n        home: getAssetIDByName?.("HomeIcon"),\n        search: getAssetIDByName?.("MagnifyingGlassIcon"),\n        settings: getAssetIDByName?.("SettingsIcon"),\n      };\n    } catch { return {}; }\n  })();\n\n  function toast(text) {''',
'probe state')

replace_once(
'''  function patchGeneratedIcon(module, method, key) {\n    if (!module || typeof module?.[method] !== "function") return null;\n    try {\n      return before(method, module, args => {\n        try {\n          const cfg = effectiveUIAccentConfig();\n          if (cfg.source === "discord") return;\n          const color = nativeColor(cfg[key]);\n          if (color == null) return;\n          if (!args[0] || typeof args[0] !== "object") args[0] = {};\n          args[0].color = color;\n        } catch (error) {\n          try { console.error(`[ThemeToolkit] ${method} recolor failed`, error); } catch {}\n        }\n      });\n    } catch (error) {\n      try { console.error(`[ThemeToolkit] failed to patch ${method}`, error); } catch {}\n      return null;\n    }\n  }''',
'''  function patchGeneratedIcon(module, method, key) {\n    if (!module || typeof module?.[method] !== "function") return null;\n    try {\n      return before(method, module, args => {\n        try {\n          if (method === "HomeIcon") batchProbe.hits.homeExport++;\n          else if (method === "MagnifyingGlassIcon") batchProbe.hits.searchExport++;\n          else if (method === "SettingsIcon") batchProbe.hits.settingsExport++;\n          const cfg = effectiveUIAccentConfig();\n          if (cfg.source === "discord") return;\n          const color = nativeColor(cfg[key]);\n          if (color == null) return;\n          if (!args[0] || typeof args[0] !== "object") args[0] = {};\n          args[0].color = color;\n        } catch (error) {\n          try { console.error(`[ThemeToolkit] ${method} recolor failed`, error); } catch {}\n        }\n      });\n    } catch (error) {\n      try { console.error(`[ThemeToolkit] failed to patch ${method}`, error); } catch {}\n      return null;\n    }\n  }''',
'generated icon counters')

replace_once(
'''      return after("useGuildsBarAnimatedWrapperStyles", GuildBarWrapperModule, (_args, result) => {\n        try {\n          const cfg = effectiveUIAccentConfig();''',
'''      return after("useGuildsBarAnimatedWrapperStyles", GuildBarWrapperModule, (_args, result) => {\n        try {\n          batchProbe.hits.guildStyle++;\n          const cfg = effectiveUIAccentConfig();''',
'guild style counter')

insert_marker = '''  function toolkitMentionTagGradient() {'''
new_helpers = r'''  function patchGuildBarDirectRenderer() {
    if (!GuildBarGuildModule?.default || typeof GuildBarGuildModule.default !== "function") return null;
    try {
      return after("default", GuildBarGuildModule, (_args, result) => {
        try {
          batchProbe.hits.guildDirect++;
          const cfg = effectiveUIAccentConfig();
          const color = cfg.source === "discord" ? null : nativeColor(cfg.selectedGuild);
          if (color == null || !result?.props?.styles || typeof result.props.styles !== "object") return result;
          const styles = {
            ...result.props.styles,
            itemShapeSelected: [result.props.styles.itemShapeSelected, { backgroundColor: color }],
          };
          return React.cloneElement(result, { styles });
        } catch (error) {
          try { console.error("[ThemeToolkit] direct selected guild patch failed", error); } catch {}
          return result;
        }
      });
    } catch (error) {
      try { console.error("[ThemeToolkit] failed direct selected guild patch", error); } catch {}
      return null;
    }
  }

  function patchSearchButtonRenderer() {
    if (!SearchButtonModule || typeof SearchButtonModule.SearchButtonContent !== "function") return null;
    try {
      return after("SearchButtonContent", SearchButtonModule, (_args, result) => {
        try {
          batchProbe.hits.searchButton++;
          const cfg = effectiveUIAccentConfig();
          const color = cfg.source === "discord" ? null : nativeColor(cfg.searchIcon);
          if (color == null || !result?.props) return result;
          const children = React.Children.toArray(result.props.children);
          if (!children.length || !React.isValidElement(children[0])) return result;
          children[0] = React.cloneElement(children[0], { color });
          return React.cloneElement(result, null, ...children);
        } catch (error) {
          try { console.error("[ThemeToolkit] direct search button recolor failed", error); } catch {}
          return result;
        }
      });
    } catch (error) {
      try { console.error("[ThemeToolkit] failed direct search button patch", error); } catch {}
      return null;
    }
  }

  function iconSourceMatches(source, assetId, expectedName) {
    const raw = source?.default ?? source;
    if (assetId != null && raw === assetId) return true;
    if (source?.name === expectedName || raw?.name === expectedName) return true;
    return false;
  }

  function patchBaseIconImageRenderer() {
    if (!BaseIconImageModule || typeof BaseIconImageModule.BaseIconImage !== "function") return null;
    try {
      return before("BaseIconImage", BaseIconImageModule, args => {
        try {
          batchProbe.hits.baseIcon++;
          const props = args?.[0];
          if (!props || typeof props !== "object") return;
          const cfg = effectiveUIAccentConfig();
          if (cfg.source === "discord") return;
          let chosen = null;
          if (iconSourceMatches(props.source, iconAssetIds.home, "HomeIcon")) {
            batchProbe.hits.baseHome++;
            chosen = cfg.homeIcon;
          } else if (iconSourceMatches(props.source, iconAssetIds.search, "MagnifyingGlassIcon")) {
            batchProbe.hits.baseSearch++;
            chosen = cfg.searchIcon;
          } else if (iconSourceMatches(props.source, iconAssetIds.settings, "SettingsIcon")) {
            batchProbe.hits.baseSettings++;
            chosen = cfg.settingsIcon;
          }
          const color = nativeColor(chosen);
          if (color != null) props.color = color;
        } catch (error) {
          try { console.error("[ThemeToolkit] BaseIconImage probe failed", error); } catch {}
        }
      });
    } catch (error) {
      try { console.error("[ThemeToolkit] failed BaseIconImage probe", error); } catch {}
      return null;
    }
  }

'''
replace_once(insert_marker, new_helpers + insert_marker, 'direct probe helpers')

replace_once(
'''        try {\n          if (!result) return result;\n\n          const ui = effectiveUIAccentConfig();''',
'''        try {\n          if (!result) return result;\n          batchProbe.hits.messageRows++;\n\n          const ui = effectiveUIAccentConfig();''',
'message row counter')

replace_once(
'''          if (ui.source !== "discord" && ui.reaction && result.reactionsTheme && typeof result.reactionsTheme === "object") {\n            const reaction = nativeColor(ui.reaction);''',
'''          if (ui.source !== "discord" && ui.reaction && result.reactionsTheme && typeof result.reactionsTheme === "object") {\n            batchProbe.hits.reactionRows++;\n            const reaction = nativeColor(ui.reaction);''',
'reaction counter')

replace_once('Theme Toolkit v0.6.0 TEST', 'Theme Toolkit v0.6.1 TEST', 'version')
replace_once(
'Visual batch test: intentionally loud colors are enabled for new icon and UI-accent targets so they can be validated quickly from screenshots.',
'Second-pass visual probe: keeps the loud colors, adds deeper component-level hooks, and records exactly which runtime paths are actually firing.',
'header text')

settings_marker = '''      React.createElement(RN.View, { style: card },\n        React.createElement(RN.Text, { style: title }, "UI accents + icons — batch test"),'''
probe_card = '''      React.createElement(RN.View, { style: card },\n        React.createElement(RN.Text, { style: title }, "Runtime hook probe"),\n        React.createElement(RN.Text, { style: text }, "Browse Discord first, then reopen this settings page. FOUND means the module exists; hits tells us whether Discord actually used that path."),\n        React.createElement(RN.Text, { style: text }, `Guild direct: ${GuildBarGuildModule?.default ? "FOUND" : "MISSING"} • hits ${batchProbe.hits.guildDirect}`),\n        React.createElement(RN.Text, { style: text }, `Guild style: ${GuildBarWrapperModule?.useGuildsBarAnimatedWrapperStyles ? "FOUND" : "MISSING"} • hits ${batchProbe.hits.guildStyle}`),\n        React.createElement(RN.Text, { style: text }, `Search button: ${SearchButtonModule?.SearchButtonContent ? "FOUND" : "MISSING"} • hits ${batchProbe.hits.searchButton}`),\n        React.createElement(RN.Text, { style: text }, `Base icon renderer: ${BaseIconImageModule?.BaseIconImage ? "FOUND" : "MISSING"} • hits ${batchProbe.hits.baseIcon}`),\n        React.createElement(RN.Text, { style: text }, `Home export/base hits: ${batchProbe.hits.homeExport}/${batchProbe.hits.baseHome}`),\n        React.createElement(RN.Text, { style: text }, `Search export/base hits: ${batchProbe.hits.searchExport}/${batchProbe.hits.baseSearch}`),\n        React.createElement(RN.Text, { style: text }, `Settings export/base hits: ${batchProbe.hits.settingsExport}/${batchProbe.hits.baseSettings}`),\n        React.createElement(RN.Text, { style: text }, `Message rows: ${MessageRowGenerator?.generateMessageRowData ? "FOUND" : "MISSING"} • hits ${batchProbe.hits.messageRows} • reaction-theme rows ${batchProbe.hits.reactionRows}`),\n      ),\n'''
replace_once(settings_marker, probe_card + settings_marker, 'probe settings card')

replace_once(
'''      unpatchGuildBarStyles = patchGuildBarAccent();\n      unpatchHomeIcon = patchGeneratedIcon(HomeIconModule, "HomeIcon", "homeIcon");\n      unpatchSearchIcon = patchGeneratedIcon(SearchIconModule, "MagnifyingGlassIcon", "searchIcon");\n      unpatchSettingsIcon = patchGeneratedIcon(SettingsIconModule, "SettingsIcon", "settingsIcon");''',
'''      unpatchGuildBarStyles = patchGuildBarAccent();\n      unpatchGuildBarDirect = patchGuildBarDirectRenderer();\n      unpatchHomeIcon = patchGeneratedIcon(HomeIconModule, "HomeIcon", "homeIcon");\n      unpatchSearchIcon = patchGeneratedIcon(SearchIconModule, "MagnifyingGlassIcon", "searchIcon");\n      unpatchSettingsIcon = patchGeneratedIcon(SettingsIconModule, "SettingsIcon", "settingsIcon");\n      unpatchBaseIconImage = patchBaseIconImageRenderer();\n      unpatchSearchButtonDirect = patchSearchButtonRenderer();''',
'onload additions')

replace_once(
'''      try { unpatchGuildBarStyles?.(); } catch {}\n      try { unpatchHomeIcon?.(); } catch {}\n      try { unpatchSearchIcon?.(); } catch {}\n      try { unpatchSettingsIcon?.(); } catch {}''',
'''      try { unpatchGuildBarStyles?.(); } catch {}\n      try { unpatchGuildBarDirect?.(); } catch {}\n      try { unpatchHomeIcon?.(); } catch {}\n      try { unpatchSearchIcon?.(); } catch {}\n      try { unpatchSettingsIcon?.(); } catch {}\n      try { unpatchBaseIconImage?.(); } catch {}\n      try { unpatchSearchButtonDirect?.(); } catch {}''',
'onunload calls')

replace_once(
'''      unpatchGuildBarStyles = null;\n      unpatchHomeIcon = null;\n      unpatchSearchIcon = null;\n      unpatchSettingsIcon = null;''',
'''      unpatchGuildBarStyles = null;\n      unpatchGuildBarDirect = null;\n      unpatchHomeIcon = null;\n      unpatchSearchIcon = null;\n      unpatchSettingsIcon = null;\n      unpatchBaseIconImage = null;\n      unpatchSearchButtonDirect = null;''',
'onunload nulls')

out.write_text(text)
raw = text.encode()
blob_sha = hashlib.sha1(f'blob {len(raw)}'.encode() + bytes([0]) + raw).hexdigest()
manifest = json.loads(manifest_path.read_text())
manifest['main'] = 'index-v061.js'
manifest['hash'] = blob_sha
manifest_path.write_text(json.dumps(manifest, indent=2) + '\n')
