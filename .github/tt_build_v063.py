from pathlib import Path
import hashlib, json

src = Path('plugins/theme-toolkit/index-v062.js')
out = Path('plugins/theme-toolkit/index-v063.js')
manifest_path = Path('plugins/theme-toolkit/manifest.json')
text = src.read_text()

def replace_once(old, new, label):
    global text
    count = text.count(old)
    if count != 1:
        raise SystemExit(f'{label}: expected 1 match, got {count}')
    text = text.replace(old, new, 1)

replace_once(
'''  const SearchIconModule = (() => { try { return findByProps("MagnifyingGlassIcon"); } catch { return null; } })();\n  const SettingsIconModule = (() => { try { return findByProps("SettingsIcon"); } catch { return null; } })();''',
'''  const SearchIconModule = (() => { try { return findByProps("MagnifyingGlassIcon"); } catch { return null; } })();\n  const ChannelSearchIconModule = (() => { try { return findByProps("ChannelListMagnifyingGlassIcon"); } catch { return null; } })();\n  const SettingsIconModule = (() => { try { return findByProps("SettingsIcon"); } catch { return null; } })();''',
'channel search module')

replace_once(
'''  let unpatchSearchIcon = null;\n  let unpatchSettingsIcon = null;''',
'''  let unpatchSearchIcon = null;\n  let unpatchChannelSearchIcon = null;\n  let unpatchSettingsIcon = null;''',
'unpatch channel search var')

replace_once(
'''      guildStyle: 0, guildDirect: 0, guildIndicator: 0, homeExport: 0, chatExport: 0, searchExport: 0, settingsExport: 0,\n      baseIcon: 0, baseHome: 0, baseChat: 0, baseSearch: 0, baseSettings: 0, searchButton: 0,\n      messageRows: 0, reactionRows: 0, rowsWithReactions: 0,''',
'''      guildStyle: 0, guildDirect: 0, guildIndicator: 0, homeExport: 0, chatExport: 0, searchExport: 0, channelSearchExport: 0, settingsExport: 0,\n      baseIcon: 0, baseHome: 0, baseChat: 0, baseSearch: 0, baseSettings: 0, searchButton: 0,\n      messageRows: 0, reactionRows: 0, rowsWithReactions: 0,''',
'probe counters')

replace_once(
'''          else if (method === "MagnifyingGlassIcon") batchProbe.hits.searchExport++;\n          else if (method === "SettingsIcon") batchProbe.hits.settingsExport++;''',
'''          else if (method === "MagnifyingGlassIcon") batchProbe.hits.searchExport++;\n          else if (method === "ChannelListMagnifyingGlassIcon") batchProbe.hits.channelSearchExport++;\n          else if (method === "SettingsIcon") batchProbe.hits.settingsExport++;''',
'channel search counter')

replace_once(
'''          if (color != null && result && typeof result === "object") {\n            result.itemShapeSelected = [result.itemShapeSelected, { backgroundColor: color }];\n          }''',
'''          if (color != null && result && typeof result === "object") {\n            result.itemShapeSelected = [result.itemShapeSelected, { backgroundColor: color }];\n            result.unreadIndicator = [result.unreadIndicator, { backgroundColor: color }];\n          }''',
'guild indicator style')

old_reaction = '''          const ui = effectiveUIAccentConfig();\n          if (ui.source !== "discord" && ui.reaction && result.reactionsTheme && typeof result.reactionsTheme === "object") {\n            batchProbe.hits.reactionRows++;\n            const reaction = nativeColor(ui.reaction);\n            const reactionText = nativeColor(autoContrastText(ui.reaction) ?? "#000000");\n            result.reactionsTheme = {\n              ...result.reactionsTheme,\n              ...(reaction != null ? { activeReactionBackgroundColor: reaction, activeReactionBorderColor: reaction } : {}),\n              ...(reactionText != null ? { activeReactionTextColor: reactionText } : {}),\n            };\n          }'''
new_reaction = '''          const ui = effectiveUIAccentConfig();\n          if (ui.source !== "discord" && ui.reaction) {\n            const reaction = nativeColor(ui.reaction);\n            const reactionText = nativeColor(autoContrastText(ui.reaction) ?? "#000000");\n            if (reaction != null) {\n              batchProbe.hits.reactionRows++;\n              const existingReactionTheme = result.reactionsTheme && typeof result.reactionsTheme === "object" ? result.reactionsTheme : {};\n              result.reactionsTheme = {\n                ...existingReactionTheme,\n                activeReactionBackgroundColor: reaction,\n                activeReactionBorderColor: reaction,\n                ...(reactionText != null ? { activeReactionTextColor: reactionText } : {}),\n              };\n            }\n          }'''
replace_once(old_reaction, new_reaction, 'forced reaction theme')

replace_once('Theme Toolkit v0.6.2 TEST', 'Theme Toolkit v0.6.3 TEST', 'version')
replace_once(
'Third-pass visual test: fixes icon color type handling, targets the actual DM/Home Chat icon, and overlays the selected-server indicator directly.',
'Fourth-pass visual test: targets the channel-list Search icon, colors the actual guild indicator style, and forces the reacted-reaction native theme even when Discord leaves it null.',
'header text')

replace_once(
'''        React.createElement(RN.Text, { style: text }, `Search export/base hits: ${batchProbe.hits.searchExport}/${batchProbe.hits.baseSearch}`),\n        React.createElement(RN.Text, { style: text }, `Settings export/base hits: ${batchProbe.hits.settingsExport}/${batchProbe.hits.baseSettings}`),''',
'''        React.createElement(RN.Text, { style: text }, `Search export/base hits: ${batchProbe.hits.searchExport}/${batchProbe.hits.baseSearch}`),\n        React.createElement(RN.Text, { style: text }, `Channel-list Search hits: ${batchProbe.hits.channelSearchExport}`),\n        React.createElement(RN.Text, { style: text }, `Settings export/base hits: ${batchProbe.hits.settingsExport}/${batchProbe.hits.baseSettings}`),''',
'channel search probe line')

replace_once(
'''      unpatchSearchIcon = patchGeneratedIcon(SearchIconModule, "MagnifyingGlassIcon", "searchIcon");\n      unpatchSettingsIcon = patchGeneratedIcon(SettingsIconModule, "SettingsIcon", "settingsIcon");''',
'''      unpatchSearchIcon = patchGeneratedIcon(SearchIconModule, "MagnifyingGlassIcon", "searchIcon");\n      unpatchChannelSearchIcon = patchGeneratedIcon(ChannelSearchIconModule, "ChannelListMagnifyingGlassIcon", "searchIcon");\n      unpatchSettingsIcon = patchGeneratedIcon(SettingsIconModule, "SettingsIcon", "settingsIcon");''',
'onload channel search')

replace_once(
'''      try { unpatchSearchIcon?.(); } catch {}\n      try { unpatchSettingsIcon?.(); } catch {}''',
'''      try { unpatchSearchIcon?.(); } catch {}\n      try { unpatchChannelSearchIcon?.(); } catch {}\n      try { unpatchSettingsIcon?.(); } catch {}''',
'onunload channel search call')

replace_once(
'''      unpatchSearchIcon = null;\n      unpatchSettingsIcon = null;''',
'''      unpatchSearchIcon = null;\n      unpatchChannelSearchIcon = null;\n      unpatchSettingsIcon = null;''',
'onunload channel search null')

out.write_text(text)
raw = text.encode()
blob_sha = hashlib.sha1(f'blob {len(raw)}'.encode() + bytes([0]) + raw).hexdigest()
manifest = json.loads(manifest_path.read_text())
manifest['main'] = 'index-v063.js'
manifest['hash'] = blob_sha
manifest_path.write_text(json.dumps(manifest, indent=2) + '\n')
