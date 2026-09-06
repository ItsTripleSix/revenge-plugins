from pathlib import Path
import hashlib, json

src = Path('plugins/theme-toolkit/index-v061.js')
out = Path('plugins/theme-toolkit/index-v062.js')
manifest_path = Path('plugins/theme-toolkit/manifest.json')
text = src.read_text()

def replace_once(old, new, label):
    global text
    count = text.count(old)
    if count != 1:
        raise SystemExit(f'{label}: expected 1 match, got {count}')
    text = text.replace(old, new, 1)

replace_once(
'''  const HomeIconModule = (() => { try { return findByProps("HomeIcon"); } catch { return null; } })();\n  const SearchIconModule = (() => { try { return findByProps("MagnifyingGlassIcon"); } catch { return null; } })();''',
'''  const HomeIconModule = (() => { try { return findByProps("HomeIcon"); } catch { return null; } })();\n  const ChatIconModule = (() => { try { return findByProps("ChatIcon"); } catch { return null; } })();\n  const SearchIconModule = (() => { try { return findByProps("MagnifyingGlassIcon"); } catch { return null; } })();''',
'chat icon module')

replace_once(
'''      guildStyle: 0, guildDirect: 0, homeExport: 0, searchExport: 0, settingsExport: 0,\n      baseIcon: 0, baseHome: 0, baseSearch: 0, baseSettings: 0, searchButton: 0,\n      messageRows: 0, reactionRows: 0,''',
'''      guildStyle: 0, guildDirect: 0, guildIndicator: 0, homeExport: 0, chatExport: 0, searchExport: 0, settingsExport: 0,\n      baseIcon: 0, baseHome: 0, baseChat: 0, baseSearch: 0, baseSettings: 0, searchButton: 0,\n      messageRows: 0, reactionRows: 0, rowsWithReactions: 0,''',
'probe counters')

replace_once(
'''        home: getAssetIDByName?.("HomeIcon"),\n        search: getAssetIDByName?.("MagnifyingGlassIcon"),''',
'''        home: getAssetIDByName?.("HomeIcon"),\n        chat: getAssetIDByName?.("ChatIcon"),\n        search: getAssetIDByName?.("MagnifyingGlassIcon"),''',
'asset ids')

replace_once(
'''  let unpatchGuildBarStyles = null;\n  let unpatchGuildBarDirect = null;''',
'''  let unpatchGuildBarStyles = null;\n  let unpatchGuildBarDirect = null;\n  let unpatchGuildIndicator = null;''',
'indicator unpatch var')

# Generated icon components and BaseIconImage expect a string color/token. Passing processColor integers was ignored.
text = text.replace('const color = nativeColor(cfg[key]);', 'const color = stripAlpha(cfg[key]);')
text = text.replace('const color = nativeColor(chosen);', 'const color = stripAlpha(chosen);')
text = text.replace('const color = cfg.source === "discord" ? null : nativeColor(cfg.searchIcon);', 'const color = cfg.source === "discord" ? null : stripAlpha(cfg.searchIcon);')
# Guild style accepts normal RN color strings too; use string for consistency.
text = text.replace('const color = cfg.source === "discord" ? null : nativeColor(cfg.selectedGuild);', 'const color = cfg.source === "discord" ? null : stripAlpha(cfg.selectedGuild);')

replace_once(
'''          if (method === "HomeIcon") batchProbe.hits.homeExport++;\n          else if (method === "MagnifyingGlassIcon") batchProbe.hits.searchExport++;''',
'''          if (method === "HomeIcon") batchProbe.hits.homeExport++;\n          else if (method === "ChatIcon") batchProbe.hits.chatExport++;\n          else if (method === "MagnifyingGlassIcon") batchProbe.hits.searchExport++;''',
'chat export counter')

replace_once(
'''          if (iconSourceMatches(props.source, iconAssetIds.home, "HomeIcon")) {\n            batchProbe.hits.baseHome++;\n            chosen = cfg.homeIcon;\n          } else if (iconSourceMatches(props.source, iconAssetIds.search, "MagnifyingGlassIcon")) {''',
'''          if (iconSourceMatches(props.source, iconAssetIds.home, "HomeIcon")) {\n            batchProbe.hits.baseHome++;\n            chosen = cfg.homeIcon;\n          } else if (iconSourceMatches(props.source, iconAssetIds.chat, "ChatIcon")) {\n            batchProbe.hits.baseChat++;\n            chosen = cfg.homeIcon;\n          } else if (iconSourceMatches(props.source, iconAssetIds.search, "MagnifyingGlassIcon")) {''',
'chat base match')

insert_marker = '''  function patchGuildBarDirectRenderer() {'''
indicator_patch = r'''  function patchSelectedGuildIndicator() {
    if (!GuildBarWrapperModule || typeof GuildBarWrapperModule.renderUnreadIndicator !== "function") return null;
    try {
      return after("renderUnreadIndicator", GuildBarWrapperModule, (args, result) => {
        try {
          batchProbe.hits.guildIndicator++;
          const selected = !!args?.[1]?.selected;
          if (!selected) return result;
          const cfg = effectiveUIAccentConfig();
          const color = cfg.source === "discord" ? null : stripAlpha(cfg.selectedGuild);
          if (!color) return result;
          const overlay = React.createElement(RN.View, {
            key: "tt-selected-guild-indicator",
            pointerEvents: "none",
            style: {
              position: "absolute", top: 8, left: -4, width: 8, height: 40,
              borderRadius: 4, backgroundColor: color, zIndex: 50,
            },
          });
          return React.createElement(React.Fragment, null, result, overlay);
        } catch (error) {
          try { console.error("[ThemeToolkit] selected guild indicator overlay failed", error); } catch {}
          return result;
        }
      });
    } catch (error) {
      try { console.error("[ThemeToolkit] failed selected guild indicator hook", error); } catch {}
      return null;
    }
  }

'''
replace_once(insert_marker, indicator_patch + insert_marker, 'selected indicator patch')

replace_once(
'''          const message = args?.[0]?.message;\n          if (!message?.mentioned) return result;''',
'''          const message = args?.[0]?.message;\n          if (Array.isArray(message?.reactions) && message.reactions.length > 0) batchProbe.hits.rowsWithReactions++;\n          if (!message?.mentioned) return result;''',
'reaction source counter')

replace_once('Theme Toolkit v0.6.1 TEST', 'Theme Toolkit v0.6.2 TEST', 'version')
replace_once(
'Second-pass visual probe: keeps the loud colors, adds deeper component-level hooks, and records exactly which runtime paths are actually firing.',
'Third-pass visual test: fixes icon color type handling, targets the actual DM/Home Chat icon, and overlays the selected-server indicator directly.',
'header text')

replace_once(
'''        React.createElement(RN.Text, { style: text }, `Guild direct: ${GuildBarGuildModule?.default ? "FOUND" : "MISSING"} • hits ${batchProbe.hits.guildDirect}`),\n        React.createElement(RN.Text, { style: text }, `Guild style: ${GuildBarWrapperModule?.useGuildsBarAnimatedWrapperStyles ? "FOUND" : "MISSING"} • hits ${batchProbe.hits.guildStyle}`),''',
'''        React.createElement(RN.Text, { style: text }, `Guild direct: ${GuildBarGuildModule?.default ? "FOUND" : "MISSING"} • hits ${batchProbe.hits.guildDirect}`),\n        React.createElement(RN.Text, { style: text }, `Guild style: ${GuildBarWrapperModule?.useGuildsBarAnimatedWrapperStyles ? "FOUND" : "MISSING"} • hits ${batchProbe.hits.guildStyle}`),\n        React.createElement(RN.Text, { style: text }, `Selected-indicator path: ${GuildBarWrapperModule?.renderUnreadIndicator ? "FOUND" : "MISSING"} • hits ${batchProbe.hits.guildIndicator}`),''',
'indicator probe line')

replace_once(
'''        React.createElement(RN.Text, { style: text }, `Home export/base hits: ${batchProbe.hits.homeExport}/${batchProbe.hits.baseHome}`),\n        React.createElement(RN.Text, { style: text }, `Search export/base hits: ${batchProbe.hits.searchExport}/${batchProbe.hits.baseSearch}`),''',
'''        React.createElement(RN.Text, { style: text }, `Home export/base hits: ${batchProbe.hits.homeExport}/${batchProbe.hits.baseHome}`),\n        React.createElement(RN.Text, { style: text }, `DM/Home Chat export/base hits: ${batchProbe.hits.chatExport}/${batchProbe.hits.baseChat}`),\n        React.createElement(RN.Text, { style: text }, `Search export/base hits: ${batchProbe.hits.searchExport}/${batchProbe.hits.baseSearch}`),''',
'chat probe line')

replace_once(
'''        React.createElement(RN.Text, { style: text }, `Message rows: ${MessageRowGenerator?.generateMessageRowData ? "FOUND" : "MISSING"} • hits ${batchProbe.hits.messageRows} • reaction-theme rows ${batchProbe.hits.reactionRows}`),''',
'''        React.createElement(RN.Text, { style: text }, `Message rows: ${MessageRowGenerator?.generateMessageRowData ? "FOUND" : "MISSING"} • hits ${batchProbe.hits.messageRows} • rows with reactions ${batchProbe.hits.rowsWithReactions} • reaction-theme rows ${batchProbe.hits.reactionRows}`),''',
'reaction probe line')

replace_once(
'''      unpatchGuildBarStyles = patchGuildBarAccent();\n      unpatchGuildBarDirect = patchGuildBarDirectRenderer();\n      unpatchHomeIcon = patchGeneratedIcon(HomeIconModule, "HomeIcon", "homeIcon");''',
'''      unpatchGuildBarStyles = patchGuildBarAccent();\n      unpatchGuildBarDirect = patchGuildBarDirectRenderer();\n      unpatchGuildIndicator = patchSelectedGuildIndicator();\n      unpatchHomeIcon = patchGeneratedIcon(HomeIconModule, "HomeIcon", "homeIcon");\n      patchGeneratedIcon(ChatIconModule, "ChatIcon", "homeIcon");''',
'onload indicator chat')

# Keep ChatIcon unpatch handle explicitly by reusing new var rather than leaking patch.
text = text.replace('let unpatchHomeIcon = null;', 'let unpatchHomeIcon = null;\n  let unpatchChatIcon = null;', 1)
text = text.replace('patchGeneratedIcon(ChatIconModule, "ChatIcon", "homeIcon");', 'unpatchChatIcon = patchGeneratedIcon(ChatIconModule, "ChatIcon", "homeIcon");', 1)

replace_once(
'''      try { unpatchGuildBarDirect?.(); } catch {}\n      try { unpatchHomeIcon?.(); } catch {}''',
'''      try { unpatchGuildBarDirect?.(); } catch {}\n      try { unpatchGuildIndicator?.(); } catch {}\n      try { unpatchHomeIcon?.(); } catch {}\n      try { unpatchChatIcon?.(); } catch {}''',
'onunload calls')

replace_once(
'''      unpatchGuildBarDirect = null;\n      unpatchHomeIcon = null;''',
'''      unpatchGuildBarDirect = null;\n      unpatchGuildIndicator = null;\n      unpatchHomeIcon = null;\n      unpatchChatIcon = null;''',
'onunload nulls')

out.write_text(text)
raw = text.encode()
blob_sha = hashlib.sha1(f'blob {len(raw)}'.encode() + bytes([0]) + raw).hexdigest()
manifest = json.loads(manifest_path.read_text())
manifest['main'] = 'index-v062.js'
manifest['hash'] = blob_sha
manifest_path.write_text(json.dumps(manifest, indent=2) + '\n')
