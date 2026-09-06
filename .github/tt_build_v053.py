from pathlib import Path
import hashlib
import json

src_path = Path("plugins/theme-toolkit/index-v052.js")
out_path = Path("plugins/theme-toolkit/index-v053.js")
manifest_path = Path("plugins/theme-toolkit/manifest.json")
text = src_path.read_text()


def replace_once(old: str, new: str, label: str) -> None:
    global text
    count = text.count(old)
    if count != 1:
        raise SystemExit(f"{label}: expected exactly one match, got {count}")
    text = text.replace(old, new, 1)


def replace_between(start: str, end: str, replacement: str, label: str) -> None:
    global text
    i = text.find(start)
    if i < 0:
        raise SystemExit(f"{label}: start marker missing")
    j = text.find(end, i)
    if j < 0:
        raise SystemExit(f"{label}: end marker missing")
    text = text[:i] + replacement + text[j:]


replace_once(
    '  const { after, before } = vendetta.patcher;',
    '  const { after } = vendetta.patcher;',
    'patcher imports',
)

replace_once(
    '  const MessageStore = (() => { try { return findByProps("getMessage", "getMessages"); } catch { return null; } })();\n'
    '  const ChatManagerModule = (() => { try { return findByProps("MockChatManager"); } catch { return null; } })();',
    '  const MessageStore = (() => { try { return findByProps("getMessage", "getMessages"); } catch { return null; } })();\n'
    '  const MarkupParsers = (() => { try { return findByProps("parseMessageMarkup", "parseEmbedTitleMarkup"); } catch { return null; } })();',
    'runtime modules',
)

replace_between(
    '    mentionColorSource: "theme",',
    '  };\n\n  for (const [key, value] of Object.entries(DEFAULTS)) {',
    '''    mentionColorSource: "theme",
    mentionBackground: "",
    mentionLine: "",
    mentionBackgroundEnabled: true,
    mentionLineEnabled: true,

    mentionTagSource: "theme",
    mentionTagMode: "solid",
    mentionTagColor: "",
    mentionTagGradient1: "",
    mentionTagGradient2: "",
    mentionTagGradient3: "",
''',
    'mention defaults',
)

replace_once(
    '  let unpatchMentions = null;\n'
    '  let unpatchMentionRowRefresh = null;\n'
    '  let appStateSubscription = null;\n'
    '  const visualSubscribers = new Set();\n'
    '  const colorSubscribers = new Set();\n'
    '  let colorTimer = null;\n'
    '  let mentionAnimationEnabled = false;\n'
    '  let lastMentionRenderAt = 0;',
    '  let unpatchMentions = null;\n'
    '  let unpatchMentionTags = null;\n'
    '  let appStateSubscription = null;\n'
    '  const visualSubscribers = new Set();\n'
    '  const colorSubscribers = new Set();\n'
    '  let colorTimer = null;',
    'mention state',
)

replace_between(
    '  function mentionRecentlyVisible(now = Date.now()) {',
    '  function colorValue(value) {',
    '''  function colorTimerNeeded() {
    return colorSubscribers.size > 0;
  }
  function ensureColorTimer() {
    if (colorTimer || !colorTimerNeeded() || !appIsActive) return;
    colorTimer = setInterval(() => {
      if (!appIsActive) return;
      const now = Date.now();
      for (const fn of [...colorSubscribers]) { try { fn(now); } catch {} }
      stopColorTimerIfIdle();
    }, 150);
  }
  function stopColorTimerIfIdle() {
    if (colorTimerNeeded() || !colorTimer) return;
    clearInterval(colorTimer);
    colorTimer = null;
  }
  function stopColorTimer() {
    if (!colorTimer) return;
    clearInterval(colorTimer);
    colorTimer = null;
  }

''',
    'color timer cleanup',
)

replace_between(
    '  function normalizeMentionMode(value, fallback = "custom") {',
    '  function currentTheme() {',
    '''  function normalizeMentionTagMode(value, fallback = "solid") {
    return ["solid", "gradient"].includes(value) ? value : fallback;
  }

''',
    'mention normalizers',
)

replace_between(
    '  function themeMentionConfig() {',
    '  function discordFolderColor(folder) {',
    '''  function themeMentionConfig() {
    const theme = currentTheme();
    const data = theme?.data ?? null;
    if (!data) {
      return {
        hasTheme: false,
        background: null,
        line: null,
        tagMode: "solid",
        tagColor: null,
        tagGradient: [],
      };
    }
    const semantic = data.semanticColors ?? {};
    const raw = data.rawColors ?? {};
    const extra = data.themeToolkit?.mentions ?? {};
    const tag = extra.tag ?? extra.inline ?? {};
    const tagGradient = [
      colorValue(tag.gradient1 ?? tag.gradient?.[0]),
      colorValue(tag.gradient2 ?? tag.gradient?.[1]),
      colorValue(tag.gradient3 ?? tag.gradient?.[2]),
    ].filter(Boolean).map(stripAlpha).filter(Boolean);
    const tagColor = stripAlpha(
      colorValue(tag.color)
        ?? colorValue(tag.text)
        ?? colorValue(extra.tagColor)
        ?? colorValue(semantic.MENTION_FOREGROUND)
        ?? colorValue(semantic.TEXT_LINK)
        ?? colorValue(raw.BRAND_360)
    );
    return {
      hasTheme: true,
      background: colorValue(extra.background)
        ?? colorValue(semantic.MESSAGE_MENTIONED_BACKGROUND_DEFAULT),
      line: colorValue(extra.line)
        ?? colorValue(extra.gutter)
        ?? colorValue(raw.YELLOW_300)
        ?? colorValue(raw.YELLOW_360),
      tagMode: tagGradient.length >= 2 ? "gradient" : "solid",
      tagColor,
      tagGradient,
    };
  }

  function effectiveMentionConfig() {
    const theme = themeMentionConfig();
    const requested = storage.mentionColorSource;
    const common = {
      backgroundEnabled: storage.mentionBackgroundEnabled !== false,
      lineEnabled: storage.mentionLineEnabled !== false,
    };
    if (requested === "toolkit") {
      return {
        ...common,
        source: "toolkit",
        background: colorValue(storage.mentionBackground),
        line: colorValue(storage.mentionLine),
      };
    }
    if (requested === "theme" && theme.hasTheme) {
      return {
        ...common,
        source: "theme",
        background: theme.background,
        line: theme.line,
      };
    }
    return {
      ...common,
      source: "discord",
      background: null,
      line: null,
    };
  }

  function toolkitMentionTagGradient() {
    return [
      stripAlpha(storage.mentionTagGradient1),
      stripAlpha(storage.mentionTagGradient2),
      stripAlpha(storage.mentionTagGradient3),
    ].filter(Boolean);
  }

  function effectiveMentionTagConfig() {
    const theme = themeMentionConfig();
    const requested = storage.mentionTagSource;
    if (requested === "toolkit") {
      return {
        source: "toolkit",
        mode: normalizeMentionTagMode(storage.mentionTagMode, "solid"),
        color: stripAlpha(storage.mentionTagColor),
        gradient: toolkitMentionTagGradient(),
      };
    }
    if (requested === "theme" && theme.hasTheme) {
      if (theme.tagMode === "gradient" && theme.tagGradient.length >= 2) {
        return { source: "theme", mode: "gradient", color: theme.tagGradient[0], gradient: theme.tagGradient };
      }
      if (theme.tagColor) {
        return { source: "theme", mode: "solid", color: theme.tagColor, gradient: [] };
      }
    }
    return { source: "discord", mode: "solid", color: null, gradient: [] };
  }

  function tagColorInt(value) {
    const hex = stripAlpha(value);
    return hex ? parseInt(hex.slice(1), 16) : null;
  }

  function applyMentionTagStyle(node, cfg = effectiveMentionTagConfig()) {
    if (!node || cfg.source === "discord") return false;
    let colors = [];
    if (cfg.mode === "gradient") colors = (cfg.gradient ?? []).map(stripAlpha).filter(Boolean);
    if (cfg.mode !== "gradient") {
      const color = stripAlpha(cfg.color);
      if (color) colors = [color];
    }
    if (!colors.length || (cfg.mode === "gradient" && colors.length < 2)) return false;

    const oneHex = colors[0];
    const twoHex = colors[1] ?? colors[0];
    const threeHex = colors[2] ?? colors[0];
    const one = tagColorInt(oneHex);
    const two = tagColorInt(twoHex);
    const three = tagColorInt(threeHex);
    if (one == null || two == null || three == null) return false;

    node.color = one;
    node.colorString = oneHex;
    node.roleColor = one;
    node.roleColors = {
      primaryColor: one,
      secondaryColor: two,
      tertiaryColor: three,
    };
    return true;
  }

  function tintMentionTags(value, seen = new Set()) {
    if (value == null || typeof value !== "object") return 0;
    if (seen.has(value)) return 0;
    seen.add(value);

    let hits = 0;
    if (Array.isArray(value)) {
      for (const child of value) hits += tintMentionTags(child, seen);
      return hits;
    }

    if (value.type === "mention") {
      if (applyMentionTagStyle(value)) hits++;
    }

    for (const key of Object.keys(value)) {
      if (key === "parent" || key === "_parent") continue;
      hits += tintMentionTags(value[key], seen);
    }
    return hits;
  }

''',
    'mention config and tag AST styling',
)

replace_between(
    '  function mentionPalette(cfg) {',
    '  function perimeterSegments(pattern, width) {',
    '',
    'remove failed dynamic mention visuals',
)

replace_between(
    '  function patchMentionRowRefresh() {',
    '  async function resetAllDiscordFolderColors() {',
    '''  function patchMentionTags() {
    if (!MarkupParsers || typeof MarkupParsers.parseMessageMarkup !== "function") return null;
    try {
      return after("parseMessageMarkup", MarkupParsers, (_args, result) => {
        try { tintMentionTags(result?.content); } catch (error) {
          try { console.error("[ThemeToolkit] inline mention tag patch failed", error); } catch {}
        }
        return result;
      });
    } catch (error) {
      try { console.error("[ThemeToolkit] failed to patch inline mention tags", error); } catch {}
      return null;
    }
  }

  function patchMentionHighlights() {
    if (typeof MessageRowGenerator?.generateMessageRowData !== "function") return null;
    try {
      return after("generateMessageRowData", MessageRowGenerator, (args, result) => {
        try {
          const message = args?.[0]?.message;
          if (!message?.mentioned || !result) return result;
          const cfg = effectiveMentionConfig();
          if (cfg.source === "discord") return result;
          const existing = result.backgroundHighlight ?? {};
          const next = { ...existing };
          const background = cfg.backgroundEnabled ? nativeColor(cfg.background) : null;
          const line = cfg.lineEnabled ? nativeColor(cfg.line) : null;
          if (cfg.backgroundEnabled && background != null) next.backgroundColor = background;
          if (cfg.lineEnabled && line != null) next.gutterColor = line;
          result.backgroundHighlight = next;
        } catch (error) {
          try { console.error("[ThemeToolkit] mention highlight patch failed", error); } catch {}
        }
        return result;
      });
    } catch (error) {
      try { console.error("[ThemeToolkit] failed to patch mention highlights", error); } catch {}
      return null;
    }
  }

''',
    'safe mention patches',
)

replace_once(
    '    function set(key, value) {\n'
    '      storage[key] = value;\n'
    '      syncMentionAnimationState();\n'
    '      forceUpdate();\n'
    '      refreshToolkitUI();\n'
    '    }',
    '    function set(key, value) {\n'
    '      storage[key] = value;\n'
    '      forceUpdate();\n'
    '      refreshToolkitUI();\n'
    '    }',
    'settings set helper',
)

replace_once(
    '            syncMentionAnimationState();\n'
    '            forceUpdate(); refreshToolkitUI();',
    '            forceUpdate(); refreshToolkitUI();',
    'color input helper',
)

settings_start = '    const activeThemeText = theme\n'
folder_card = '''      React.createElement(RN.View, { style: card },
        React.createElement(RN.Text, { style: title }, "Folder colors"),'''
settings_replacement = '''    const activeThemeText = theme
      ? `${theme.data?.name ?? "Unnamed theme"}${themeCfg.hasMetadata ? " • Toolkit metadata" : " • automatic mapping"}`
      : "No custom theme active • automatic styling is off";
    return React.createElement(RN.ScrollView, { contentContainerStyle: page },
      React.createElement(RN.View, { style: card },
        React.createElement(RN.Text, { style: title }, "Theme Toolkit v0.5.3"),
        React.createElement(RN.Text, { style: text }, activeThemeText),
        React.createElement(RN.Text, { style: text }, "Mentions are split into a static full-message highlight and the native inline @mention tag. Inline tags support solid or static gradient colors. Live mention animation is intentionally disabled because native row refreshes were unstable."),
      ),
      React.createElement(RN.View, { style: card },
        React.createElement(RN.Text, { style: title }, "Mentioned-message highlight"),
        React.createElement(RN.Text, { style: text }, "Static only. Controls the whole-message background and left side line when a message mentions you."),
        React.createElement(Choice, {
          value: storage.mentionColorSource,
          options: [{ value: "theme", label: "Theme / Auto" }, { value: "toolkit", label: "Toolkit" }, { value: "discord", label: "Discord" }],
          onChange: value => set("mentionColorSource", value),
        }),
        storage.mentionColorSource === "toolkit" ? React.createElement(RN.View, { style: { gap: 8 } },
          React.createElement(ColorInput, { labelText: "Mentioned-message background", storageKey: "mentionBackground" }),
          React.createElement(RN.Text, { style: text }, "8-digit hex is supported for transparency, e.g. #FF00FF20."),
          React.createElement(ColorInput, { labelText: "Mention side line", storageKey: "mentionLine" }),
        ) : null,
        storage.mentionColorSource !== "discord" ? React.createElement(RN.View, { style: { gap: 8 } },
          React.createElement(ToggleRow, { labelText: "Message background", value: storage.mentionBackgroundEnabled !== false, onChange: value => set("mentionBackgroundEnabled", value) }),
          React.createElement(ToggleRow, { labelText: "Side line", value: storage.mentionLineEnabled !== false, onChange: value => set("mentionLineEnabled", value) }),
        ) : null,
      ),
      React.createElement(RN.View, { style: card },
        React.createElement(RN.Text, { style: title }, "Inline @mention tags"),
        React.createElement(RN.Text, { style: text }, "Controls the actual @Username / @Role tag inside messages. Discord mode leaves native tags untouched."),
        React.createElement(Choice, {
          value: storage.mentionTagSource,
          options: [{ value: "theme", label: "Theme / Auto" }, { value: "toolkit", label: "Toolkit" }, { value: "discord", label: "Discord" }],
          onChange: value => set("mentionTagSource", value),
        }),
        storage.mentionTagSource === "toolkit" ? React.createElement(RN.View, { style: { gap: 10 } },
          React.createElement(RN.Text, { style: label }, "Color style"),
          React.createElement(Choice, {
            value: storage.mentionTagMode,
            options: [{ value: "solid", label: "Solid" }, { value: "gradient", label: "Gradient" }],
            onChange: value => set("mentionTagMode", value),
          }),
          storage.mentionTagMode === "solid" ? React.createElement(ColorInput, {
            labelText: "Tag color", storageKey: "mentionTagColor",
          }) : null,
          storage.mentionTagMode === "gradient" ? React.createElement(RN.View, { style: { gap: 8 } },
            React.createElement(ColorInput, { labelText: "Gradient color 1", storageKey: "mentionTagGradient1" }),
            React.createElement(ColorInput, { labelText: "Gradient color 2", storageKey: "mentionTagGradient2" }),
            React.createElement(ColorInput, { labelText: "Gradient color 3 (optional)", storageKey: "mentionTagGradient3" }),
          ) : null,
          React.createElement(RN.Text, { style: text }, "The native renderer derives the tag highlight from these colors too. Animation is not used here because repeated native row updates caused chat-state problems during channel switching."),
        ) : null,
      ),
'''
replace_between(settings_start, folder_card, settings_replacement, 'mention settings UI')

replace_between(
    '    onLoad() {',
    '    settings: Settings,',
    '''    onLoad() {
      installAppStateListener();
      unpatchFolder = patchFolderRenderer();
      unpatchFolderBG = patchExpandedFolderBackground();
      unpatchMentions = patchMentionHighlights();
      unpatchMentionTags = patchMentionTags();
    },
    onUnload() {
      try { unpatchFolder?.(); } catch {}
      try { unpatchFolderBG?.(); } catch {}
      try { unpatchMentions?.(); } catch {}
      try { unpatchMentionTags?.(); } catch {}
      unpatchFolder = null;
      unpatchFolderBG = null;
      unpatchMentions = null;
      unpatchMentionTags = null;
      removeAppStateListener();
      visualSubscribers.clear();
      colorSubscribers.clear();
      stopColorTimer();
      stopSharedMotionClocks();
      pathGeometryCache.clear();
    },
''',
    'lifecycle',
)

# Old dynamic mention settings are intentionally ignored from v0.5.3 onward.
# Leave their storage values untouched so downgrading remains reversible.

out_path.write_text(text)
raw = text.encode()
blob_sha = hashlib.sha1(f"blob {len(raw)}\0".encode() + raw).hexdigest()

manifest = json.loads(manifest_path.read_text())
manifest["main"] = "index-v053.js"
manifest["hash"] = blob_sha
manifest_path.write_text(json.dumps(manifest, indent=2) + "\n")

print(f"Wrote {out_path} ({len(raw)} bytes), blob {blob_sha}")
