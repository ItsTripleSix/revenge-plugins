from pathlib import Path
import hashlib, json

src = Path('plugins/theme-toolkit/index-v063.js')
out = Path('plugins/theme-toolkit/index-v064.js')
manifest_path = Path('plugins/theme-toolkit/manifest.json')
text = src.read_text()

def replace_once(old, new, label):
    global text
    count = text.count(old)
    if count != 1:
        raise SystemExit(f'{label}: expected 1 match, got {count}')
    text = text.replace(old, new, 1)

# Broader runtime coverage points for icons/buttons and the actual guild wrapper.
replace_once(
'''  const SearchButtonModule = (() => { try { return findByProps("SEARCH_BAR_HEIGHT", "SearchButtonContent"); } catch { return null; } })();\n  const GuildBarGuildModule = (() => { try { return findByName?.("GuildsBarGuild", false); } catch { return null; } })();''',
'''  const SearchButtonModule = (() => { try { return findByProps("SEARCH_BAR_HEIGHT", "SearchButtonContent"); } catch { return null; } })();\n  const IconActionButtonModule = (() => { try { return findByProps("ICON_ACTION_BUTTON_SIZE"); } catch { return null; } })();\n  const LegacyHeaderIconModule = (() => { try { return findByProps("HeaderIcon", "ICON_SIZE"); } catch { return null; } })();\n  const HeaderSharedModule = (() => { try { return findByProps("HeaderIconButton", "getDefaultStackHeaderProps"); } catch { return null; } })();\n  const GuildBarGuildModule = (() => { try { return findByName?.("GuildsBarGuild", false); } catch { return null; } })();''',
'new runtime modules')

replace_once(
'''  let unpatchSettingsIcon = null;\n  let unpatchBaseIconImage = null;\n  let unpatchSearchButtonDirect = null;''',
'''  let unpatchSettingsIcon = null;\n  let unpatchBaseIconImage = null;\n  let unpatchSearchButtonDirect = null;\n  let unpatchIconActionButton = null;\n  let unpatchLegacyHeaderIcon = null;\n  let unpatchHeaderIconButton = null;\n  let unpatchGuildWrapperOverlay = null;''',
'new unpatch vars')

replace_once(
'''      guildStyle: 0, guildDirect: 0, guildIndicator: 0, homeExport: 0, chatExport: 0, searchExport: 0, channelSearchExport: 0, settingsExport: 0,\n      baseIcon: 0, baseHome: 0, baseChat: 0, baseSearch: 0, baseSettings: 0, searchButton: 0,\n      messageRows: 0, reactionRows: 0, rowsWithReactions: 0,''',
'''      guildStyle: 0, guildDirect: 0, guildIndicator: 0, guildWrapper: 0, guildWrapperSelected: 0, homeExport: 0, chatExport: 0, searchExport: 0, channelSearchExport: 0, settingsExport: 0,\n      baseIcon: 0, baseHome: 0, baseChat: 0, baseSearch: 0, baseChannelSearch: 0, baseSettings: 0, searchButton: 0,\n      iconAction: 0, iconActionSearch: 0, iconActionSettings: 0, headerSearch: 0, headerSettings: 0,\n      messageRows: 0, reactionRows: 0, rowsWithReactions: 0,''',
'expanded probe counters')

replace_once(
'''        search: getAssetIDByName?.("MagnifyingGlassIcon"),\n        settings: getAssetIDByName?.("SettingsIcon"),''',
'''        search: getAssetIDByName?.("MagnifyingGlassIcon"),\n        channelSearch: getAssetIDByName?.("ChannelListMagnifyingGlassIcon"),\n        legacySearch: getAssetIDByName?.("SearchIcon"),\n        settings: getAssetIDByName?.("SettingsIcon"),''',
'expanded icon asset IDs')

# Add helpers + broad action/header patches immediately before the existing generated-icon patch.
marker = '''  function patchGeneratedIcon(module, method, key) {'''
if text.count(marker) != 1:
    raise SystemExit(f'patchGeneratedIcon marker: expected 1 match, got {text.count(marker)}')
insert = r'''  function sourceMatchesAny(source, ids) {
    return ids.some(id => id != null && iconSourceMatches(source, id, ""));
  }
  function isSearchSource(source) {
    return sourceMatchesAny(source, [iconAssetIds.search, iconAssetIds.channelSearch, iconAssetIds.legacySearch]);
  }
  function isSettingsSource(source) {
    return sourceMatchesAny(source, [iconAssetIds.settings]);
  }
  function iconComponentName(component) {
    try { return String(component?.displayName ?? component?.name ?? ""); } catch { return ""; }
  }
  function makeTintedIcon(component, color) {
    if (typeof component !== "function") return component;
    return function ThemeToolkitTintedIcon(props) {
      return React.createElement(component, { ...(props ?? {}), color });
    };
  }
  function patchIconActionButtons() {
    if (!IconActionButtonModule || typeof IconActionButtonModule.default !== "function") return null;
    try {
      return before("default", IconActionButtonModule, args => {
        try {
          batchProbe.hits.iconAction++;
          const props = args?.[0];
          if (!props || typeof props !== "object") return;
          const cfg = effectiveUIAccentConfig();
          if (cfg.source === "discord") return;
          const name = iconComponentName(props.IconComponent);
          const search = /MagnifyingGlass|Search/i.test(name) || isSearchSource(props.source);
          const settings = /Settings|Gear|Cog/i.test(name) || isSettingsSource(props.source);
          if (search) {
            const color = stripAlpha(cfg.searchIcon);
            if (!color) return;
            batchProbe.hits.iconActionSearch++;
            if (typeof props.IconComponent === "function") {
              props.IconComponent = makeTintedIcon(props.IconComponent, color);
            } else if (typeof SearchIconModule?.MagnifyingGlassIcon === "function") {
              props.IconComponent = makeTintedIcon(SearchIconModule.MagnifyingGlassIcon, color);
              props.source = null;
            }
            props.color = color;
          } else if (settings) {
            const color = stripAlpha(cfg.settingsIcon);
            if (!color) return;
            batchProbe.hits.iconActionSettings++;
            if (typeof props.IconComponent === "function") {
              props.IconComponent = makeTintedIcon(props.IconComponent, color);
            } else if (typeof SettingsIconModule?.SettingsIcon === "function") {
              props.IconComponent = makeTintedIcon(SettingsIconModule.SettingsIcon, color);
              props.source = null;
            }
            props.color = color;
          }
        } catch (error) {
          try { console.error("[ThemeToolkit] action icon recolor failed", error); } catch {}
        }
      });
    } catch (error) {
      try { console.error("[ThemeToolkit] failed action icon hook", error); } catch {}
      return null;
    }
  }
  function patchLegacyHeaderIcons() {
    if (!LegacyHeaderIconModule || typeof LegacyHeaderIconModule.HeaderIcon !== "function") return null;
    try {
      return after("HeaderIcon", LegacyHeaderIconModule, (args, result) => {
        try {
          const source = args?.[0]?.source;
          const cfg = effectiveUIAccentConfig();
          if (cfg.source === "discord" || !result?.props) return result;
          if (isSearchSource(source)) {
            const color = stripAlpha(cfg.searchIcon);
            if (color) {
              batchProbe.hits.headerSearch++;
              return React.cloneElement(result, { tintColor: color });
            }
          }
          if (isSettingsSource(source)) {
            const color = stripAlpha(cfg.settingsIcon);
            if (color) {
              batchProbe.hits.headerSettings++;
              return React.cloneElement(result, { tintColor: color });
            }
          }
        } catch (error) {
          try { console.error("[ThemeToolkit] legacy header icon recolor failed", error); } catch {}
        }
        return result;
      });
    } catch (error) {
      try { console.error("[ThemeToolkit] failed legacy header icon hook", error); } catch {}
      return null;
    }
  }
  function patchHeaderIconButtons() {
    if (!HeaderSharedModule || typeof HeaderSharedModule.HeaderIconButton !== "function") return null;
    try {
      return before("HeaderIconButton", HeaderSharedModule, args => {
        try {
          const props = args?.[0];
          if (!props || typeof props !== "object") return;
          const cfg = effectiveUIAccentConfig();
          if (cfg.source === "discord") return;
          if (isSearchSource(props.source)) {
            const color = stripAlpha(cfg.searchIcon);
            if (color) { batchProbe.hits.headerSearch++; props.color = color; }
          } else if (isSettingsSource(props.source)) {
            const color = stripAlpha(cfg.settingsIcon);
            if (color) { batchProbe.hits.headerSettings++; props.color = color; }
          }
        } catch (error) {
          try { console.error("[ThemeToolkit] header icon button recolor failed", error); } catch {}
        }
      });
    } catch (error) {
      try { console.error("[ThemeToolkit] failed header icon button hook", error); } catch {}
      return null;
    }
  }
  function patchGuildWrapperSelectedOverlay() {
    if (!GuildBarWrapperModule || typeof GuildBarWrapperModule.default !== "function") return null;
    try {
      return after("default", GuildBarWrapperModule, (args, result) => {
        try {
          batchProbe.hits.guildWrapper++;
          const props = args?.[0] ?? {};
          if (!props.selected || !result?.props) return result;
          batchProbe.hits.guildWrapperSelected++;
          const cfg = effectiveUIAccentConfig();
          const color = cfg.source === "discord" ? null : stripAlpha(cfg.selectedGuild);
          if (!color) return result;
          const overlay = React.createElement(RN.View, {
            key: "tt-selected-guild-direct-overlay",
            pointerEvents: "none",
            style: {
              position: "absolute", left: -4, top: 8, width: 8, height: 40,
              borderRadius: 4, backgroundColor: color, zIndex: 999,
            },
          });
          const children = React.Children.toArray(result.props.children);
          children.push(overlay);
          return React.cloneElement(result, null, ...children);
        } catch (error) {
          try { console.error("[ThemeToolkit] selected guild direct overlay failed", error); } catch {}
          return result;
        }
      });
    } catch (error) {
      try { console.error("[ThemeToolkit] failed selected guild wrapper hook", error); } catch {}
      return null;
    }
  }

'''
text = text.replace(marker, insert + marker, 1)

# BaseIconImage sees captured generated icons too, so recognize the channel-list Search asset there.
replace_once(
'''          } else if (iconSourceMatches(props.source, iconAssetIds.search, "MagnifyingGlassIcon")) {\n            batchProbe.hits.baseSearch++;\n            chosen = cfg.searchIcon;\n          } else if (iconSourceMatches(props.source, iconAssetIds.settings, "SettingsIcon")) {''',
'''          } else if (iconSourceMatches(props.source, iconAssetIds.search, "MagnifyingGlassIcon") || iconSourceMatches(props.source, iconAssetIds.legacySearch, "SearchIcon")) {\n            batchProbe.hits.baseSearch++;\n            chosen = cfg.searchIcon;\n          } else if (iconSourceMatches(props.source, iconAssetIds.channelSearch, "ChannelListMagnifyingGlassIcon")) {\n            batchProbe.hits.baseChannelSearch++;\n            chosen = cfg.searchIcon;\n          } else if (iconSourceMatches(props.source, iconAssetIds.settings, "SettingsIcon")) {''',
'base icon channel search')

replace_once('Theme Toolkit v0.6.3 TEST', 'Theme Toolkit v0.6.4 TEST', 'version')
replace_once(
'Fourth-pass visual test: targets the channel-list Search icon, colors the actual guild indicator style, and forces the reacted-reaction native theme even when Discord leaves it null.',
'Broader icon pass: colors Search/Settings at shared action/header renderers instead of chasing screens, and draws the selected-server pill directly at the guild wrapper.',
'header description')

# Add probe lines for the broad paths.
replace_once(
'''        React.createElement(RN.Text, { style: text }, `Channel-list Search hits: ${batchProbe.hits.channelSearchExport}`),\n        React.createElement(RN.Text, { style: text }, `Settings export/base hits: ${batchProbe.hits.settingsExport}/${batchProbe.hits.baseSettings}`),''',
'''        React.createElement(RN.Text, { style: text }, `Channel-list Search export/base hits: ${batchProbe.hits.channelSearchExport}/${batchProbe.hits.baseChannelSearch}`),\n        React.createElement(RN.Text, { style: text }, `Settings export/base hits: ${batchProbe.hits.settingsExport}/${batchProbe.hits.baseSettings}`),\n        React.createElement(RN.Text, { style: text }, `Shared action icons: ${batchProbe.hits.iconAction} • Search ${batchProbe.hits.iconActionSearch} • Settings ${batchProbe.hits.iconActionSettings}`),\n        React.createElement(RN.Text, { style: text }, `Header source hits: Search ${batchProbe.hits.headerSearch} • Settings ${batchProbe.hits.headerSettings}`),\n        React.createElement(RN.Text, { style: text }, `Guild wrapper: hits ${batchProbe.hits.guildWrapper} • selected ${batchProbe.hits.guildWrapperSelected}`),''',
'probe UI')

replace_once(
'''      unpatchBaseIconImage = patchBaseIconImageRenderer();\n      unpatchSearchButtonDirect = patchSearchButtonRenderer();''',
'''      unpatchBaseIconImage = patchBaseIconImageRenderer();\n      unpatchSearchButtonDirect = patchSearchButtonRenderer();\n      unpatchIconActionButton = patchIconActionButtons();\n      unpatchLegacyHeaderIcon = patchLegacyHeaderIcons();\n      unpatchHeaderIconButton = patchHeaderIconButtons();\n      unpatchGuildWrapperOverlay = patchGuildWrapperSelectedOverlay();''',
'onload broad hooks')

replace_once(
'''      try { unpatchBaseIconImage?.(); } catch {}\n      try { unpatchSearchButtonDirect?.(); } catch {}''',
'''      try { unpatchBaseIconImage?.(); } catch {}\n      try { unpatchSearchButtonDirect?.(); } catch {}\n      try { unpatchIconActionButton?.(); } catch {}\n      try { unpatchLegacyHeaderIcon?.(); } catch {}\n      try { unpatchHeaderIconButton?.(); } catch {}\n      try { unpatchGuildWrapperOverlay?.(); } catch {}''',
'onunload broad hooks')

replace_once(
'''      unpatchBaseIconImage = null;\n      unpatchSearchButtonDirect = null;''',
'''      unpatchBaseIconImage = null;\n      unpatchSearchButtonDirect = null;\n      unpatchIconActionButton = null;\n      unpatchLegacyHeaderIcon = null;\n      unpatchHeaderIconButton = null;\n      unpatchGuildWrapperOverlay = null;''',
'onunload null broad hooks')

out.write_text(text)
raw = text.encode()
blob_sha = hashlib.sha1(f'blob {len(raw)}'.encode() + bytes([0]) + raw).hexdigest()
manifest = json.loads(manifest_path.read_text())
manifest['main'] = 'index-v064.js'
manifest['hash'] = blob_sha
manifest_path.write_text(json.dumps(manifest, indent=2) + '\n')
