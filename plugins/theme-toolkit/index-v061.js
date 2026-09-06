(() => {
  "use strict";

  const { after, before } = vendetta.patcher;
  const { findByProps, findByName } = vendetta.metro;
  const { React, ReactNative: RN } = vendetta.metro.common;
  const storage = vendetta.plugin.storage;
  const findInReactTree = vendetta.utils?.findInReactTree;
  const showToast = vendetta.ui?.toasts?.showToast;
  const getAssetIDByName = vendetta.ui?.assets?.getAssetIDByName;
  const Animated = RN.Animated;
  const Easing = RN.Easing;

  const GuildFolderModule = (() => { try { return findByProps("GuildsBarGuildFolderBG"); } catch { return null; } })();
  const FolderStore = (() => { try { return findByProps("getGuildFolders", "getGuildFolderById"); } catch { return null; } })();
  const FolderActions = (() => { try { return findByProps("saveGuildFolders"); } catch { return null; } })();
  const ColorUtils = (() => { try { return findByProps("int2hex", "hex2int"); } catch { return null; } })();
  const MessageRowGenerator = (() => { try { return findByProps("generateMessageRowData"); } catch { return null; } })();
  const MessageStore = (() => { try { return findByProps("getMessage", "getMessages"); } catch { return null; } })();
  const MarkupParsers = (() => { try { return findByProps("parseMessageMarkup", "parseEmbedTitleMarkup"); } catch { return null; } })();
  const ColorPickerActionSheet = (() => { try { return findByProps("CUSTOM_COLOR_PICKER_KEY"); } catch { return null; } })();
  const GuildBarWrapperModule = (() => { try { return findByProps("useGuildsBarAnimatedWrapperStyles", "renderUnreadIndicator"); } catch { return null; } })();
  const HomeIconModule = (() => { try { return findByProps("HomeIcon"); } catch { return null; } })();
  const SearchIconModule = (() => { try { return findByProps("MagnifyingGlassIcon"); } catch { return null; } })();
  const SettingsIconModule = (() => { try { return findByProps("SettingsIcon"); } catch { return null; } })();
  const BaseIconImageModule = (() => { try { return findByProps("BaseIconImage"); } catch { return null; } })();
  const SearchButtonModule = (() => { try { return findByProps("SEARCH_BAR_HEIGHT", "SearchButtonContent"); } catch { return null; } })();
  const GuildBarGuildModule = (() => { try { return findByName?.("GuildsBarGuild", false); } catch { return null; } })();
  const toolkitIcon = (() => {
    try {
      return getAssetIDByName?.("FolderIcon")
        ?? getAssetIDByName?.("PaintPaletteIcon")
        ?? getAssetIDByName?.("ic_theme_24px");
    } catch { return undefined; }
  })();

  const DEFAULTS = {
    folderColorSource: "theme",
    folderCoverMode: "theme",
    folderBackground: "",
    folderAccent: "",

    closedOutlineEnabled: true,
    closedOutlineColorMode: "theme",
    closedOutlineColor: "",
    closedGradient1: "",
    closedGradient2: "",
    closedGradient3: "",
    closedOutlinePattern: "theme",
    closedOutlineWidth: "theme",
    closedOutlineAnimation: "theme",
    closedOutlineSpeed: "theme",
    closedOutlineGlow: "theme",
    closedOutlineBrightness: "bright",
    closedOutlineTrail: "medium",

    openOutlineEnabled: true,
    openOutlineColorMode: "theme",
    openOutlineColor: "",
    openGradient1: "",
    openGradient2: "",
    openGradient3: "",
    openOutlinePattern: "theme",
    openOutlineWidth: "theme",
    openOutlineAnimation: "theme",
    openOutlineSpeed: "theme",
    openOutlineGlow: "theme",
    openOutlineBrightness: "bright",
    openOutlineTrail: "medium",

    mentionColorSource: "theme",
    mentionBackground: "",
    mentionLine: "",
    mentionBackgroundEnabled: true,
    mentionLineEnabled: true,
    mentionTextMode: "auto",
    mentionTextColor: "",

    mentionTagSource: "theme",
    mentionTagMode: "solid",
    mentionTagColor: "",
    mentionTagGradient1: "",
    mentionTagGradient2: "",
    mentionTagGradient3: "",

    // v0.6.0 visual batch test defaults. These are intentionally loud and will be nulled after validation.
    uiAccentSource: "toolkit",
    smartAccentColor: "#B026FF",
    selectedGuildAccent: "#FF00FF",
    reactionAccent: "#39FF14",
    homeIconAccent: "#00FFFF",
    searchIconAccent: "#FFEA00",
    settingsIconAccent: "#FF6600",
  };

  for (const [key, value] of Object.entries(DEFAULTS)) {
    try { if (storage[key] == null) storage[key] = value; } catch {}
  }

  let unpatchFolder = null;
  let unpatchFolderBG = null;
  let unpatchMentions = null;
  let unpatchMentionTags = null;
  let unpatchGuildBarStyles = null;
  let unpatchGuildBarDirect = null;
  let unpatchHomeIcon = null;
  let unpatchSearchIcon = null;
  let unpatchSettingsIcon = null;
  let unpatchBaseIconImage = null;
  let unpatchSearchButtonDirect = null;
  let appStateSubscription = null;
  const visualSubscribers = new Set();
  const colorSubscribers = new Set();
  let colorTimer = null;
  let appIsActive = RN.AppState?.currentState ? RN.AppState.currentState === "active" : true;
  const animationEpoch = Date.now();
  const motionClocks = new Map();
  const pathGeometryCache = new Map();
  const batchProbe = {
    hits: {
      guildStyle: 0, guildDirect: 0, homeExport: 0, searchExport: 0, settingsExport: 0,
      baseIcon: 0, baseHome: 0, baseSearch: 0, baseSettings: 0, searchButton: 0,
      messageRows: 0, reactionRows: 0,
    },
  };
  const iconAssetIds = (() => {
    try {
      return {
        home: getAssetIDByName?.("HomeIcon"),
        search: getAssetIDByName?.("MagnifyingGlassIcon"),
        settings: getAssetIDByName?.("SettingsIcon"),
      };
    } catch { return {}; }
  })();

  function toast(text) { try { showToast?.(text, toolkitIcon); } catch {} }
  function notifyVisuals() { for (const fn of [...visualSubscribers]) { try { fn(); } catch {} } }
  function useToolkitRevision() {
    const [, bump] = React.useReducer(v => v + 1, 0);
    React.useEffect(() => {
      visualSubscribers.add(bump);
      resumeSharedMotionClocks();
      return () => {
        visualSubscribers.delete(bump);
        if (!visualSubscribers.size) pauseSharedMotionClocks();
      };
    }, []);
  }
  function refreshFolderUI() {
    notifyVisuals();
    try { FolderStore?.emitChange?.(); } catch {}
  }
  function refreshMentionUI() {
    try { MessageStore?.emitChange?.(); } catch {}
  }
  function refreshToolkitUI() {
    refreshFolderUI();
    refreshMentionUI();
  }
  function colorTimerNeeded() {
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

  function colorValue(value) {
    if (Array.isArray(value)) value = value.find(x => typeof x === "string");
    if (typeof value !== "string") return null;
    let out = value.trim();
    if (!out) return null;
    if (!out.startsWith("#")) out = `#${out}`;
    if (!/^#[0-9a-fA-F]{6}([0-9a-fA-F]{2})?$/.test(out)) return null;
    return out.toUpperCase();
  }
  function nativeColor(value) {
    const hex = colorValue(value);
    if (!hex) return null;
    try { return RN.processColor?.(hex) ?? hex; } catch { return hex; }
  }
  function stripAlpha(value) {
    const hex = colorValue(value);
    return hex ? hex.slice(0, 7) : null;
  }
  function colorAlpha(value, fallback = 1) {
    const hex = colorValue(value);
    if (!hex || hex.length !== 9) return fallback;
    return parseInt(hex.slice(7, 9), 16) / 255;
  }
  function withAlpha(value, alpha) {
    const hex = stripAlpha(value);
    if (!hex) return null;
    const byte = Math.max(0, Math.min(255, Math.round(alpha * 255))).toString(16).padStart(2, "0").toUpperCase();
    return `${hex}${byte}`;
  }
  function multiplyAlpha(value, factor, fallback = 1) {
    const hex = colorValue(value);
    if (!hex) return null;
    return withAlpha(hex, Math.max(0, Math.min(1, colorAlpha(hex, fallback) * factor)));
  }
  function normalizePattern(value, fallback = "solid") {
    return ["solid", "dashed", "dotted", "segmented"].includes(value) ? value : fallback;
  }
  function normalizeWidth(value, fallback = 1) {
    const n = Number(value);
    return Number.isFinite(n) ? Math.max(1, Math.min(3, n)) : fallback;
  }
  function normalizeAnimation(value, fallback = "none") {
    return ["none", "pulse", "breathe", "glow", "chase", "marquee", "spin"].includes(value) ? value : fallback;
  }
  function normalizeSpeed(value, fallback = "normal") {
    return ["slow", "normal", "fast"].includes(value) ? value : fallback;
  }
  function normalizeGlow(value, fallback = 2) {
    const n = Number(value);
    return Number.isFinite(n) ? Math.max(1, Math.min(3, n)) : fallback;
  }
  function normalizeBrightness(value, fallback = "bright") {
    return ["normal", "bright", "max"].includes(value) ? value : fallback;
  }
  function normalizeTrail(value, fallback = "medium") {
    return ["short", "medium", "long"].includes(value) ? value : fallback;
  }
  function normalizeMentionTagMode(value, fallback = "solid") {
    return ["solid", "gradient"].includes(value) ? value : fallback;
  }

  function currentTheme() {
    try {
      const api = globalThis?.bunny ?? globalThis?.window?.bunny;
      return api?.themes?.getCurrentTheme?.() ?? null;
    } catch { return null; }
  }
  function inactiveOutline() {
    return {
      enabled: false, color: null, colorMode: "solid", gradient: [], width: 1,
      pattern: "solid", animation: "none", speed: "normal", glow: 2,
      brightness: "bright", trail: "medium",
    };
  }
  function themeOutlineConfig(extra, state, fallbackColor) {
    const specific = extra?.[state] ?? {};
    const gradient = [
      colorValue(specific.gradient1 ?? specific.gradient?.[0]),
      colorValue(specific.gradient2 ?? specific.gradient?.[1]),
      colorValue(specific.gradient3 ?? specific.gradient?.[2]),
    ].filter(Boolean);
    let colorMode = String(specific.colorMode ?? "solid").toLowerCase();
    if (!["solid", "rgb", "rainbow", "spectrum", "gradient"].includes(colorMode)) colorMode = "solid";
    if (colorMode === "gradient" && gradient.length < 2) colorMode = "solid";
    return {
      enabled: specific.outline !== false && specific.outlineEnabled !== false,
      color: colorValue(specific.outlineColor) ?? colorValue(specific.border) ?? colorValue(extra?.border) ?? fallbackColor,
      colorMode,
      gradient,
      width: normalizeWidth(specific.outlineWidth ?? specific.borderWidth ?? extra?.borderWidth, 1),
      pattern: normalizePattern(specific.outlinePattern ?? specific.pattern ?? extra?.pattern, "solid"),
      animation: normalizeAnimation(specific.animation, "none"),
      speed: normalizeSpeed(specific.speed, "normal"),
      glow: normalizeGlow(specific.glowStrength ?? specific.glow, 2),
      brightness: normalizeBrightness(specific.brightness, "bright"),
      trail: normalizeTrail(specific.trailLength ?? specific.trail, "medium"),
    };
  }
  function themeFolderConfig() {
    const theme = currentTheme();
    const data = theme?.data ?? null;
    if (!data) {
      return { hasTheme: false, hasMetadata: false, background: null, accent: null, cover: "preview", closed: inactiveOutline(), open: inactiveOutline() };
    }
    const semantic = data.semanticColors ?? {};
    const raw = data.rawColors ?? {};
    const extra = data.themeToolkit?.folders ?? {};
    const background = colorValue(extra.background)
      ?? colorValue(semantic.GUILD_FOLDER_BACKGROUND)
      ?? colorValue(semantic.BACKGROUND_PRIMARY)
      ?? colorValue(semantic.BACKGROUND_BASE_LOWEST);
    const accent = colorValue(extra.accent)
      ?? colorValue(semantic.HEADER_PRIMARY)
      ?? colorValue(semantic.INTERACTIVE_ACTIVE)
      ?? colorValue(raw.WHITE_500)
      ?? colorValue(raw.BRAND_360);
    return {
      hasTheme: true,
      hasMetadata: !!data.themeToolkit,
      background,
      accent,
      cover: extra.cover === "folder" ? "folder" : "preview",
      closed: themeOutlineConfig(extra, "closed", accent),
      open: themeOutlineConfig(extra, "open", accent),
    };
  }
  function themeMentionConfig() {
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

  function themeMessageBaseColor() {
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

  function themeUIAccentConfig() {
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
          if (method === "HomeIcon") batchProbe.hits.homeExport++;
          else if (method === "MagnifyingGlassIcon") batchProbe.hits.searchExport++;
          else if (method === "SettingsIcon") batchProbe.hits.settingsExport++;
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
          batchProbe.hits.guildStyle++;
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

  function patchGuildBarDirectRenderer() {
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

  function discordFolderColor(folder) {
    const value = folder?.color ?? folder?.folderColor;
    if (value == null) return null;
    try { return colorValue(ColorUtils?.int2hex?.(value)); } catch {}
    return typeof value === "string" ? colorValue(value) : null;
  }
  function customGradient(prefix) {
    return [
      colorValue(storage[`${prefix}Gradient1`]),
      colorValue(storage[`${prefix}Gradient2`]),
      colorValue(storage[`${prefix}Gradient3`]),
    ].filter(Boolean);
  }

  function effectiveOutline(themeOutline, state, hasTheme) {
    const prefix = state === "open" ? "open" : "closed";
    const requestedMode = storage[`${prefix}OutlineColorMode`];
    let colorMode = requestedMode;
    let color = null;
    let gradient = [];

    if (requestedMode === "theme") {
      if (!hasTheme || themeOutline.enabled === false) return inactiveOutline();
      colorMode = themeOutline.colorMode;
      color = themeOutline.color;
      gradient = themeOutline.gradient ?? [];
    } else if (requestedMode === "custom") {
      colorMode = "solid";
      color = colorValue(storage[`${prefix}OutlineColor`]);
    } else if (["rgb", "rainbow", "spectrum"].includes(requestedMode)) {
      colorMode = requestedMode;
      color = "#FFFFFF";
    } else if (requestedMode === "gradient") {
      colorMode = "gradient";
      gradient = customGradient(prefix);
      color = gradient[0] ?? null;
    } else {
      return inactiveOutline();
    }

    const enabled = !!storage[`${prefix}OutlineEnabled`] && (
      ["rgb", "rainbow", "spectrum"].includes(colorMode)
      || (colorMode === "gradient" && gradient.length >= 2)
      || !!color
    );
    const useTheme = key => storage[`${prefix}${key}`] === "theme";
    return {
      enabled,
      color,
      colorMode,
      gradient,
      pattern: useTheme("OutlinePattern") ? (hasTheme ? themeOutline.pattern : "solid") : normalizePattern(storage[`${prefix}OutlinePattern`], "solid"),
      width: useTheme("OutlineWidth") ? (hasTheme ? themeOutline.width : 1) : normalizeWidth(storage[`${prefix}OutlineWidth`], 1),
      animation: useTheme("OutlineAnimation") ? (hasTheme ? themeOutline.animation : "none") : normalizeAnimation(storage[`${prefix}OutlineAnimation`], "none"),
      speed: useTheme("OutlineSpeed") ? (hasTheme ? themeOutline.speed : "normal") : normalizeSpeed(storage[`${prefix}OutlineSpeed`], "normal"),
      glow: useTheme("OutlineGlow") ? (hasTheme ? themeOutline.glow : 2) : normalizeGlow(storage[`${prefix}OutlineGlow`], 2),
      brightness: storage[`${prefix}OutlineBrightness`] === "theme" ? (hasTheme ? themeOutline.brightness : "bright") : normalizeBrightness(storage[`${prefix}OutlineBrightness`], "bright"),
      trail: storage[`${prefix}OutlineTrail`] === "theme" ? (hasTheme ? themeOutline.trail : "medium") : normalizeTrail(storage[`${prefix}OutlineTrail`], "medium"),
      state,
    };
  }

  function effectiveFolderConfig(folder) {
    const theme = themeFolderConfig();
    const requestedSource = storage.folderColorSource;
    let source = requestedSource;
    let background = null;
    let accent = null;
    if (requestedSource === "theme") {
      if (theme.hasTheme) { background = theme.background; accent = theme.accent; }
      else source = "discord";
    } else if (requestedSource === "toolkit") {
      background = colorValue(storage.folderBackground);
      accent = colorValue(storage.folderAccent);
    } else source = "discord";

    const cover = storage.folderCoverMode === "theme"
      ? (theme.hasTheme ? theme.cover : "preview")
      : storage.folderCoverMode;
    return {
      source,
      background,
      accent,
      cover: cover === "folder" ? "folder" : "preview",
      coverAccent: accent ?? discordFolderColor(folder) ?? theme.accent ?? "#FFFFFF",
      closedOutline: effectiveOutline(theme.closed, "closed", theme.hasTheme),
      openOutline: effectiveOutline(theme.open, "open", theme.hasTheme),
    };
  }

  function flattened(style) { try { return RN.StyleSheet?.flatten?.(style) ?? {}; } catch { return {}; } }
  function radiusFor(style, fallback) {
    const flat = flattened(style);
    return flat.borderRadius ?? flat.borderTopLeftRadius ?? flat.borderTopRightRadius ?? fallback;
  }
  function speedMs(speed) {
    if (speed === "slow") return 7000;
    if (speed === "fast") return 1600;
    return 3400;
  }
  function sharedPhaseAt(speed, now = Date.now()) {
    const duration = speedMs(speed);
    return (((now - animationEpoch) % duration) + duration) % duration / duration;
  }
  function motionAllowed() {
    return appIsActive && visualSubscribers.size > 0;
  }
  function startMotionEntry(key, entry) {
    if (!entry?.value || entry.stopped || entry.running || !motionAllowed()) return;
    const duration = speedMs(key);
    const start = sharedPhaseAt(key);
    try {
      entry.first?.stop?.();
      entry.loop?.stop?.();
      entry.value?.stopAnimation?.();
      entry.value?.setValue?.(start);
    } catch {}
    entry.running = true;
    entry.paused = false;
    const options = { easing: Easing?.linear, useNativeDriver: true, isInteraction: false };

    const beginLoop = () => {
      if (entry.stopped || !entry.running || !motionAllowed()) return;
      try { entry.value.setValue?.(0); } catch {}
      const loop = Animated.loop(Animated.timing(entry.value, { toValue: 1, duration, ...options }));
      entry.loop = loop;
      try { loop.start(); } catch { entry.running = false; }
    };

    const remaining = Math.max(1, Math.round(duration * (1 - start)));
    const first = Animated.timing(entry.value, { toValue: 1, duration: remaining, ...options });
    entry.first = first;
    try {
      first.start(result => {
        if (entry.stopped || !entry.running) return;
        if (result?.finished === false) return;
        beginLoop();
      });
    } catch {
      beginLoop();
    }
  }
  function getSharedMotionPhase(speed) {
    const key = normalizeSpeed(speed, "normal");
    const existing = motionClocks.get(key);
    if (existing?.value) {
      startMotionEntry(key, existing);
      return existing.value;
    }
    if (!Animated?.Value || !Animated?.timing || !Animated?.loop) return null;

    const value = new Animated.Value(sharedPhaseAt(key));
    const entry = { value, first: null, loop: null, stopped: false, paused: true, running: false };
    motionClocks.set(key, entry);
    startMotionEntry(key, entry);
    return value;
  }
  function pauseSharedMotionClocks() {
    for (const entry of motionClocks.values()) {
      if (!entry.running) continue;
      entry.running = false;
      entry.paused = true;
      try { entry.first?.stop?.(); } catch {}
      try { entry.loop?.stop?.(); } catch {}
      try { entry.value?.stopAnimation?.(); } catch {}
    }
  }
  function resumeSharedMotionClocks() {
    if (!motionAllowed()) return;
    for (const [key, entry] of motionClocks.entries()) startMotionEntry(key, entry);
  }
  function stopSharedMotionClocks() {
    for (const entry of motionClocks.values()) {
      entry.stopped = true;
      entry.running = false;
      try { entry.first?.stop?.(); } catch {}
      try { entry.loop?.stop?.(); } catch {}
      try { entry.value?.stopAnimation?.(); } catch {}
    }
    motionClocks.clear();
  }
  function useColorPhase(enabled, speed, multiplier = 1.45) {
    const [now, setNow] = React.useState(Date.now());
    React.useEffect(() => {
      if (!enabled) return undefined;
      const fn = value => setNow(value);
      colorSubscribers.add(fn);
      if (appIsActive) {
        try { fn(Date.now()); } catch {}
        ensureColorTimer();
      }
      return () => {
        colorSubscribers.delete(fn);
        stopColorTimerIfIdle();
      };
    }, [enabled, speed, multiplier]);
    if (!enabled) return 0;
    const duration = Math.max(1200, Math.round(speedMs(speed) * multiplier));
    return ((((now - animationEpoch) % duration) + duration) % duration) / duration;
  }
  function handleAppStateChange(nextState) {
    const nextActive = nextState === "active";
    if (nextActive === appIsActive) return;
    appIsActive = nextActive;
    if (!appIsActive) {
      stopColorTimer();
      pauseSharedMotionClocks();
      return;
    }
    const now = Date.now();
    for (const fn of [...colorSubscribers]) { try { fn(now); } catch {} }
    ensureColorTimer();
    resumeSharedMotionClocks();
  }
  function installAppStateListener() {
    try {
      appIsActive = RN.AppState?.currentState ? RN.AppState.currentState === "active" : true;
      appStateSubscription = RN.AppState?.addEventListener?.("change", handleAppStateChange) ?? null;
    } catch { appStateSubscription = null; }
  }
  function removeAppStateListener() {
    try {
      if (appStateSubscription?.remove) appStateSubscription.remove();
      else RN.AppState?.removeEventListener?.("change", handleAppStateChange);
    } catch {}
    appStateSubscription = null;
  }

  const RGB_RING = ["#FF0000", "#00FF00", "#0000FF", "#FF0000"];
  const RAINBOW_RING = ["#FF0000", "#FF8000", "#FFFF00", "#00FF00", "#00FFFF", "#0080FF", "#4B00FF", "#A000FF", "#FF00FF", "#FF0066", "#FF0000"];
  const FULL_SPECTRUM = [
    "#FF0000", "#FF4000", "#FF8000", "#FFC000", "#FFFF00", "#BFFF00",
    "#80FF00", "#40FF00", "#00FF00", "#00FF40", "#00FF80", "#00FFC0",
    "#00FFFF", "#00BFFF", "#0080FF", "#0040FF", "#0000FF", "#4000FF",
    "#8000FF", "#BF00FF", "#FF00FF", "#FF00BF", "#FF0080", "#FF0040", "#FF0000",
  ];

  function hexRgb(hex) {
    const value = colorValue(hex);
    if (!value) return null;
    const h = value.slice(1, 7);
    return { r: parseInt(h.slice(0, 2), 16), g: parseInt(h.slice(2, 4), 16), b: parseInt(h.slice(4, 6), 16) };
  }
  function rgbHex(r, g, b) {
    const part = n => Math.max(0, Math.min(255, Math.round(n))).toString(16).padStart(2, "0");
    return `#${part(r)}${part(g)}${part(b)}`.toUpperCase();
  }
  function gradientAt(colors, t) {
    const valid = colors.map(colorValue).filter(Boolean);
    if (!valid.length) return "#FFFFFF";
    if (valid.length === 1) return valid[0];
    const cycle = [...valid, valid[0]];
    const wrapped = ((t % 1) + 1) % 1;
    const scaled = wrapped * (cycle.length - 1);
    const index = Math.min(cycle.length - 2, Math.floor(scaled));
    const local = scaled - index;
    const a = hexRgb(cycle[index]);
    const b = hexRgb(cycle[index + 1]);
    if (!a || !b) return cycle[index];
    return rgbHex(a.r + (b.r - a.r) * local, a.g + (b.g - a.g) * local, a.b + (b.b - a.b) * local);
  }
  function chasePalette(outline) {
    if (outline.colorMode === "rgb") return RGB_RING.slice(0, -1);
    if (outline.colorMode === "rainbow") return RAINBOW_RING.slice(0, -1);
    if (outline.colorMode === "spectrum") return FULL_SPECTRUM.slice(0, -1);
    if (outline.colorMode === "gradient" && outline.gradient.length >= 2) return outline.gradient;
    return [outline.color ?? "#FFFFFF"];
  }
  function perimeterSegments(pattern, width) {
    const items = [];
    const pushTop = (left, size) => items.push({ top: 0, left, width: size, height: width });
    const pushRight = (top, size) => items.push({ right: 0, top, width, height: size });
    const pushBottom = (right, size) => items.push({ bottom: 0, right, width: size, height: width });
    const pushLeft = (bottom, size) => items.push({ left: 0, bottom, width, height: size });
    if (pattern === "segmented") {
      for (const p of ["8%", "58%"]) pushTop(p, "34%");
      for (const p of ["8%", "58%"]) pushRight(p, "34%");
      for (const p of ["8%", "58%"]) pushBottom(p, "34%");
      for (const p of ["8%", "58%"]) pushLeft(p, "34%");
      return items;
    }
    if (pattern === "dotted") {
      const dot = Math.max(2.4, width * 2.5);
      for (const p of ["8%", "28%", "48%", "68%", "88%"]) items.push({ top: -width * 0.5, left: p, width: dot, height: dot, borderRadius: dot });
      for (const p of ["8%", "28%", "48%", "68%", "88%"]) items.push({ right: -width * 0.5, top: p, width: dot, height: dot, borderRadius: dot });
      for (const p of ["8%", "28%", "48%", "68%", "88%"]) items.push({ bottom: -width * 0.5, right: p, width: dot, height: dot, borderRadius: dot });
      for (const p of ["8%", "28%", "48%", "68%", "88%"]) items.push({ left: -width * 0.5, bottom: p, width: dot, height: dot, borderRadius: dot });
      return items;
    }
    const count = pattern === "dashed" ? 6 : 10;
    const gap = pattern === "dashed" ? 3 : 0;
    const cell = 100 / count;
    const size = Math.max(1, cell - gap);
    for (let i = 0; i < count; i++) { const p = `${i * cell}%`; pushTop(p, `${size}%`); }
    for (let i = 0; i < count; i++) { const p = `${i * cell}%`; pushRight(p, `${size}%`); }
    for (let i = 0; i < count; i++) { const p = `${i * cell}%`; pushBottom(p, `${size}%`); }
    for (let i = 0; i < count; i++) { const p = `${i * cell}%`; pushLeft(p, `${size}%`); }
    return items;
  }
  function marqueeOpacity(phase, index, count) {
    if (!phase?.interpolate || count <= 1) return 1;
    const center = index / count;
    const samples = 32;
    const width = Math.max(0.07, 3.2 / count);
    const inputRange = Array.from({ length: samples + 1 }, (_, i) => i / samples);
    const outputRange = inputRange.map(value => {
      const raw = Math.abs(value - center);
      const distance = Math.min(raw, 1 - raw);
      const x = Math.max(0, 1 - distance / width);
      const smooth = x * x * (3 - 2 * x);
      return 0.10 + 0.90 * smooth;
    });
    try { return phase.interpolate({ inputRange, outputRange, extrapolate: "clamp" }); } catch { return 1; }
  }

  function roundedRectPoint(t, width, height, radius) {
    const w = Math.max(1, width);
    const h = Math.max(1, height);
    const r = Math.max(0, Math.min(radius, w / 2, h / 2));
    const straightW = Math.max(0, w - 2 * r);
    const straightH = Math.max(0, h - 2 * r);
    const arc = Math.PI * r / 2;
    const total = Math.max(1, 2 * straightW + 2 * straightH + 4 * arc);
    let d = (((t % 1) + 1) % 1) * total;
    if (d <= straightW) return { x: r + d, y: 0 };
    d -= straightW;
    if (d <= arc && r > 0) { const a = -Math.PI / 2 + (d / arc) * Math.PI / 2; return { x: w - r + Math.cos(a) * r, y: r + Math.sin(a) * r }; }
    d -= arc;
    if (d <= straightH) return { x: w, y: r + d };
    d -= straightH;
    if (d <= arc && r > 0) { const a = (d / arc) * Math.PI / 2; return { x: w - r + Math.cos(a) * r, y: h - r + Math.sin(a) * r }; }
    d -= arc;
    if (d <= straightW) return { x: w - r - d, y: h };
    d -= straightW;
    if (d <= arc && r > 0) { const a = Math.PI / 2 + (d / arc) * Math.PI / 2; return { x: r + Math.cos(a) * r, y: h - r + Math.sin(a) * r }; }
    d -= arc;
    if (d <= straightH) return { x: 0, y: h - r - d };
    d -= straightH;
    if (r > 0) { const a = Math.PI + (d / Math.max(arc, 0.0001)) * Math.PI / 2; return { x: r + Math.cos(a) * r, y: r + Math.sin(a) * r }; }
    return { x: 0, y: 0 };
  }
  function roundedRectPerimeter(width, height, radius) {
    const w = Math.max(1, width);
    const h = Math.max(1, height);
    const r = Math.max(0, Math.min(radius, w / 2, h / 2));
    return Math.max(1, 2 * Math.max(0, w - 2 * r) + 2 * Math.max(0, h - 2 * r) + 2 * Math.PI * r);
  }
  const PATH_SAMPLES = 64;
  const PATH_INPUT_RANGE = Array.from({ length: PATH_SAMPLES + 1 }, (_, i) => i / PATH_SAMPLES);
  function unwrapAngles(values) {
    if (!values.length) return values;
    const out = [values[0]];
    for (let i = 1; i < values.length; i++) {
      let value = values[i];
      const prev = out[i - 1];
      while (value - prev > 180) value -= 360;
      while (value - prev < -180) value += 360;
      out.push(value);
    }
    return out;
  }
  function pathGeometry(width, height, radius, offset) {
    const key = `${Math.round(width * 2) / 2}|${Math.round(height * 2) / 2}|${Math.round(radius * 2) / 2}|${offset.toFixed(4)}`;
    const cached = pathGeometryCache.get(key);
    if (cached) return cached;
    const points = PATH_INPUT_RANGE.map(t => roundedRectPoint(t - offset, width, height, radius));
    const epsilon = 1 / (PATH_SAMPLES * 4);
    const rawAngles = PATH_INPUT_RANGE.map(t => {
      const a = roundedRectPoint(t - offset, width, height, radius);
      const b = roundedRectPoint(t - offset + epsilon, width, height, radius);
      return Math.atan2(b.y - a.y, b.x - a.x) * 180 / Math.PI;
    });
    const angles = unwrapAngles(rawAngles);
    const geometry = {
      inputRange: PATH_INPUT_RANGE,
      x: points.map(p => p.x),
      y: points.map(p => p.y),
      angle: angles.map(value => `${value}deg`),
    };
    if (pathGeometryCache.size > 700) pathGeometryCache.clear();
    pathGeometryCache.set(key, geometry);
    return geometry;
  }
  function pathTransform(phase, width, height, radius, offset) {
    const geometry = pathGeometry(width, height, radius, offset);
    try {
      return {
        x: phase.interpolate({ inputRange: geometry.inputRange, outputRange: geometry.x, extrapolate: "clamp" }),
        y: phase.interpolate({ inputRange: geometry.inputRange, outputRange: geometry.y, extrapolate: "clamp" }),
        rotate: phase.interpolate({ inputRange: geometry.inputRange, outputRange: geometry.angle, extrapolate: "clamp" }),
      };
    } catch { return { x: 0, y: 0, rotate: "0deg" }; }
  }
  function trailSpan(trail) {
    if (trail === "short") return 0.25;
    if (trail === "long") return 0.85;
    return 0.50;
  }
  function trailCount(trail, width, height, radius, dot, pattern, state) {
    if (state === "closed" && pattern === "dotted") {
      if (trail === "short") return 4;
      if (trail === "long") return 10;
      return 7;
    }
    if (state === "closed" && pattern === "solid") {
      if (trail === "short") return 14;
      if (trail === "long") return 34;
      return 22;
    }
    const minimum = trail === "short" ? 9 : trail === "long" ? 24 : 16;
    if (!(width > 0) || !(height > 0)) return minimum;
    const span = trailSpan(trail);
    const perimeter = roundedRectPerimeter(width, height, radius);
    const spacingFactor = pattern === "solid" ? 0.80 : pattern === "dotted" ? 1.45 : 1.05;
    const spacing = Math.max(1.8, dot * spacingFactor);
    const desired = Math.ceil((perimeter * span) / spacing) + 1;
    const maximum = pattern === "solid" ? 72 : 56;
    return Math.max(minimum, Math.min(maximum, desired));
  }

  function MovingCapsule({ motionPhase, width, height, radius, offset, length, thickness, color, opacity = 1, glow = 0, glowOpacity = 0, head = false, crossScale = 1 }) {
    const motion = React.useMemo(
      () => pathTransform(motionPhase, width, height, radius, offset),
      [motionPhase, width, height, radius, offset],
    );
    const Wrapper = Animated?.View ?? RN.View;
    const bodyLength = head ? thickness : Math.max(thickness, length);
    const transforms = [
      { translateX: motion.x },
      { translateY: motion.y },
      ...(head ? [] : [{ rotate: motion.rotate }]),
      ...(head ? [{ scale: crossScale }] : [{ scaleY: crossScale }]),
    ];
    return React.createElement(Wrapper, {
      pointerEvents: "none",
      style: {
        position: "absolute",
        left: -bodyLength / 2,
        top: -thickness / 2,
        width: bodyLength,
        height: thickness,
        borderRadius: thickness,
        backgroundColor: color,
        opacity,
        transform: transforms,
      },
    },
      glowOpacity > 0 ? React.createElement(RN.View, {
        pointerEvents: "none",
        style: {
          position: "absolute", top: -glow, left: -glow, right: -glow, bottom: -glow,
          borderRadius: thickness + glow * 2, backgroundColor: color, opacity: glowOpacity,
        },
      }) : null,
      head ? React.createElement(RN.View, {
        pointerEvents: "none",
        style: {
          position: "absolute", top: thickness * 0.34, left: thickness * 0.34,
          width: thickness * 0.32, height: thickness * 0.32, borderRadius: thickness,
          backgroundColor: "#FFFFFF", opacity: 0.8,
        },
      }) : null,
    );
  }

  function ChaseVisual({ outline, baseStyle, fallbackRadius }) {
    const flat = flattened(baseStyle);
    const initialWidth = Number.isFinite(Number(flat.width)) ? Number(flat.width) : 0;
    const initialHeight = Number.isFinite(Number(flat.height)) ? Number(flat.height) : 0;
    const [size, setSize] = React.useState({ width: initialWidth, height: initialHeight });
    const motionPhase = getSharedMotionPhase(outline.speed);
    const palette = chasePalette(outline);
    const dynamicColor = palette.length > 1;
    const colorPhase = useColorPhase(dynamicColor, outline.speed);
    const chaseColor = dynamicColor ? gradientAt(palette, colorPhase) : (palette[0] ?? "#FFFFFF");

    const radius = Math.max(0, Math.min(radiusFor(baseStyle, fallbackRadius), size.width / 2 || fallbackRadius, size.height / 2 || fallbackRadius));
    const dot = Math.max(4.8, outline.width * 2.7);
    const span = trailSpan(outline.trail);
    const count = trailCount(outline.trail, size.width, size.height, radius, dot, outline.pattern, outline.state);
    const perimeter = roundedRectPerimeter(size.width || 1, size.height || 1, radius);
    const pathSpacing = count > 1 ? (perimeter * span) / (count - 1) : dot;
    const compactSolid = outline.state === "closed" && outline.pattern === "solid";
    const compactThickness = Math.max(2.4, outline.width * 1.45);
    const solidLength = compactSolid
      ? Math.max(compactThickness * 1.8, pathSpacing * 2.45)
      : Math.max(dot * 0.95, pathSpacing * 1.24);
    const baseOpacity = outline.brightness === "max" ? 0.14 : outline.brightness === "bright" ? 0.09 : 0.05;
    const glowFactor = outline.glow === 3 ? 1.28 : outline.glow === 1 ? 0.76 : 1;
    const headHalo = (outline.brightness === "max" ? 8 : outline.brightness === "bright" ? 6 : 4) * glowFactor;
    const dots = [];

    if (size.width > 0 && size.height > 0 && motionPhase) {
      for (let i = count - 1; i >= 0; i--) {
        const frac = count <= 1 ? 0 : i / (count - 1);
        const offset = frac * span;
        const opacity = i === 0 ? 1 : Math.max(0.12, Math.pow(1 - frac, 0.88) * 0.92);
        const minScale = outline.pattern === "solid" ? 0.74 : 0.42;
        const scale = i === 0 ? 1.58 : compactSolid ? 1 : Math.max(minScale, 1 - frac * (outline.pattern === "solid" ? 0.26 : 0.55));
        const halo = i === 0 ? headHalo : Math.max(0.7, headHalo * (1 - frac) * 0.46);
        const haloOpacity = i === 0 ? 0.54 : compactSolid ? 0 : (frac < 0.74 ? Math.max(0.04, 0.20 * (1 - frac)) : 0);
        const thickness = i === 0 ? dot : compactSolid ? compactThickness : dot;
        dots.push(React.createElement(MovingCapsule, {
          key: `tt-chase-${i}`,
          motionPhase,
          width: size.width,
          height: size.height,
          radius,
          offset,
          length: outline.pattern === "solid" && i !== 0 ? solidLength : dot,
          thickness,
          opacity,
          crossScale: scale,
          color: chaseColor,
          glow: halo,
          glowOpacity: haloOpacity,
          head: i === 0,
        }));
      }
    }

    return React.createElement(RN.View, {
      pointerEvents: "none",
      onLayout(event) {
        const width = Number(event?.nativeEvent?.layout?.width) || 0;
        const height = Number(event?.nativeEvent?.layout?.height) || 0;
        if (width > 0 && height > 0 && (Math.abs(width - size.width) > 0.5 || Math.abs(height - size.height) > 0.5)) setSize({ width, height });
      },
      style: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0, overflow: "visible" },
    },
      React.createElement(RN.View, {
        pointerEvents: "none",
        style: {
          position: "absolute", top: 0, left: 0, right: 0, bottom: 0,
          borderRadius: radiusFor(baseStyle, fallbackRadius),
          borderWidth: outline.width,
          borderColor: chaseColor,
          borderStyle: outline.pattern === "segmented" ? "solid" : outline.pattern,
          opacity: baseOpacity,
        },
      }),
      dots,
    );
  }

  function FlowVisual({ outline, baseStyle, fallbackRadius, mode }) {
    const flat = flattened(baseStyle);
    const initialWidth = Number.isFinite(Number(flat.width)) ? Number(flat.width) : 0;
    const initialHeight = Number.isFinite(Number(flat.height)) ? Number(flat.height) : 0;
    const [size, setSize] = React.useState({ width: initialWidth, height: initialHeight });
    const motionPhase = getSharedMotionPhase(outline.speed);
    const radius = Math.max(0, Math.min(radiusFor(baseStyle, fallbackRadius), size.width / 2 || fallbackRadius, size.height / 2 || fallbackRadius));
    const perimeter = roundedRectPerimeter(size.width || 1, size.height || 1, radius);
    const count = Math.max(28, Math.min(mode === "spin" ? 64 : 54, Math.ceil(perimeter / (mode === "spin" ? 7.5 : 9.0))));
    const spacing = perimeter / count;
    const thickness = Math.max(3.4, outline.width * 1.75);
    const length = Math.max(thickness, spacing * 1.26);
    const palette = chasePalette(outline);
    const baseColor = palette[0] ?? outline.color ?? "#FFFFFF";
    const brightnessBoost = outline.brightness === "max" ? 1 : outline.brightness === "bright" ? 0.92 : 0.78;
    const elements = [];

    if (size.width > 0 && size.height > 0 && motionPhase) {
      for (let i = 0; i < count; i++) {
        const fraction = i / count;
        const color = mode === "spin" && palette.length > 1
          ? gradientAt(palette, fraction)
          : palette.length > 1 ? gradientAt(palette, fraction) : baseColor;
        let opacity = brightnessBoost;
        if (mode === "marquee") {
          const raw = Math.min(fraction, 1 - fraction);
          const x = Math.max(0, 1 - raw / 0.16);
          const smooth = x * x * (3 - 2 * x);
          opacity = 0.10 + 0.90 * smooth;
        }
        elements.push(React.createElement(MovingCapsule, {
          key: `tt-${mode}-${i}`,
          motionPhase,
          width: size.width,
          height: size.height,
          radius,
          offset: fraction,
          length,
          thickness,
          color,
          opacity,
          crossScale: 1,
          glow: outline.glow === 3 ? 1.8 : outline.glow === 1 ? 0.6 : 1.1,
          glowOpacity: mode === "marquee" ? opacity * 0.12 : 0.07,
          head: false,
        }));
      }
    }

    return React.createElement(RN.View, {
      pointerEvents: "none",
      onLayout(event) {
        const width = Number(event?.nativeEvent?.layout?.width) || 0;
        const height = Number(event?.nativeEvent?.layout?.height) || 0;
        if (width > 0 && height > 0 && (Math.abs(width - size.width) > 0.5 || Math.abs(height - size.height) > 0.5)) setSize({ width, height });
      },
      style: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0, overflow: "visible" },
    },
      React.createElement(RN.View, {
        pointerEvents: "none",
        style: {
          position: "absolute", top: 0, left: 0, right: 0, bottom: 0,
          borderRadius: radiusFor(baseStyle, fallbackRadius), borderWidth: outline.width,
          borderColor: baseColor, opacity: mode === "marquee" ? 0.10 : 0.05,
        },
      }),
      elements,
    );
  }

  function brightnessHalo(outline, color, radius, phase) {
    if (outline.brightness === "normal" && outline.animation !== "glow") return null;
    const maxMode = outline.brightness === "max";
    const glowFactor = outline.glow === 3 ? 1.35 : outline.glow === 1 ? 0.72 : 1;
    const extra = (maxMode ? 4 : 2) * glowFactor;
    let opacity = (maxMode ? 0.46 : 0.26) * Math.min(1.2, glowFactor);
    if (outline.animation === "glow" && phase?.interpolate) {
      opacity = phase.interpolate({ inputRange: [0, 0.5, 1], outputRange: maxMode ? [0.22, 0.72, 0.22] : [0.12, 0.52, 0.12] });
    }
    const Wrapper = Animated?.View ?? RN.View;
    return React.createElement(Wrapper, {
      key: "brightness-halo", pointerEvents: "none",
      style: { position: "absolute", top: -extra, left: -extra, right: -extra, bottom: -extra, borderRadius: radius + extra, borderWidth: outline.width + extra, borderColor: color, opacity },
    });
  }

  function AnimatedOutlineVisual({ outline, baseStyle, fallbackRadius }) {
    const radius = radiusFor(baseStyle, fallbackRadius);
    const dynamicColor = ["rgb", "rainbow", "spectrum"].includes(outline.colorMode);
    const spinningGradient = outline.colorMode === "gradient" && outline.animation === "spin";
    const colorPhase = useColorPhase(dynamicColor || spinningGradient, outline.speed);
    const needsMotion = ["pulse", "breathe", "glow", "marquee"].includes(outline.animation);
    const phase = needsMotion ? getSharedMotionPhase(outline.speed) : null;

    const modeColors = outline.colorMode === "rgb" ? RGB_RING
      : outline.colorMode === "rainbow" ? RAINBOW_RING
      : outline.colorMode === "spectrum" ? FULL_SPECTRUM
      : outline.gradient;
    const baseColor = dynamicColor ? gradientAt(modeColors, colorPhase)
      : spinningGradient ? gradientAt(outline.gradient, colorPhase)
      : outline.colorMode === "gradient" ? gradientAt(outline.gradient, 0)
      : outline.color;

    let opacity = 1;
    let scale = 1;
    if (phase?.interpolate && outline.animation === "pulse") {
      opacity = phase.interpolate({ inputRange: [0, 0.5, 1], outputRange: [1, 0.58, 1] });
      scale = phase.interpolate({ inputRange: [0, 0.5, 1], outputRange: [1, 1.045, 1] });
    } else if (phase?.interpolate && outline.animation === "breathe") {
      opacity = phase.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0.52, 1, 0.52] });
    }
    const Wrapper = Animated?.View ?? RN.View;
    const containerStyle = { position: "absolute", top: 0, left: 0, right: 0, bottom: 0, borderRadius: radius, opacity, transform: [{ scale }] };
    const needsSegments = ["rgb", "rainbow", "gradient"].includes(outline.colorMode)
      || outline.pattern === "segmented" || outline.animation === "marquee" || outline.animation === "spin";
    if (!needsSegments) {
      return React.createElement(Wrapper, { pointerEvents: "none", style: containerStyle },
        brightnessHalo(outline, baseColor, radius, phase),
        React.createElement(Wrapper, {
          pointerEvents: "none",
          style: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0, borderRadius: radius, borderWidth: outline.width, borderColor: baseColor, borderStyle: outline.pattern },
        }),
      );
    }
    const segments = perimeterSegments(outline.pattern, outline.width);
    return React.createElement(Wrapper, { pointerEvents: "none", style: containerStyle },
      brightnessHalo(outline, baseColor, radius, phase),
      segments.map((style, index) => {
        const offset = index / Math.max(1, segments.length);
        let segmentColor = baseColor;
        if (outline.colorMode === "rgb" || outline.colorMode === "rainbow") {
          segmentColor = gradientAt(modeColors, colorPhase + offset);
        } else if (outline.colorMode === "spectrum") {
          segmentColor = baseColor;
        } else if (outline.colorMode === "gradient") {
          segmentColor = gradientAt(modeColors, (spinningGradient ? colorPhase : 0) + offset);
        }
        const segmentOpacity = outline.animation === "marquee" ? marqueeOpacity(phase, index, segments.length) : 1;
        return React.createElement(Wrapper, {
          key: `tt-seg-${index}`, pointerEvents: "none",
          style: [{ position: "absolute", backgroundColor: segmentColor, opacity: segmentOpacity, borderRadius: style.borderRadius ?? Math.max(1, outline.width) }, style],
        });
      }),
    );
  }

  function OutlineVisual({ folder, state, baseStyle, fallbackRadius }) {
    useToolkitRevision();
    const cfg = effectiveFolderConfig(folder);
    const outline = state === "open" ? cfg.openOutline : cfg.closedOutline;
    if (!outline?.enabled) return null;
    if (outline.animation === "chase") return React.createElement(ChaseVisual, { outline, baseStyle, fallbackRadius });
    if (outline.pattern === "solid" && outline.animation === "marquee") {
      return React.createElement(FlowVisual, { outline, baseStyle, fallbackRadius, mode: "marquee" });
    }
    if (outline.pattern === "solid" && outline.animation === "spin" && chasePalette(outline).length > 1) {
      return React.createElement(FlowVisual, { outline, baseStyle, fallbackRadius, mode: "spin" });
    }
    return React.createElement(AnimatedOutlineVisual, { outline, baseStyle, fallbackRadius });
  }

  function BackgroundVisual({ folder, baseStyle, fallbackRadius }) {
    useToolkitRevision();
    const cfg = effectiveFolderConfig(folder);
    if (cfg.source === "discord" || !cfg.background) return null;
    return React.createElement(RN.View, {
      pointerEvents: "none",
      style: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0, borderRadius: radiusFor(baseStyle, fallbackRadius), backgroundColor: cfg.background },
    });
  }
  function appendVisuals(existing, background, outline) {
    const children = [];
    if (background) children.push(background);
    if (Array.isArray(existing)) children.push(...existing);
    else if (existing != null) children.push(existing);
    if (outline) children.push(outline);
    return children;
  }

  function patchFolderRenderer() {
    if (!GuildFolderModule || !findInReactTree) return null;
    const memo = GuildFolderModule.default;
    const target = memo?.type ? memo : GuildFolderModule;
    const method = memo?.type ? "type" : "default";
    if (typeof target?.[method] !== "function") return null;
    try {
      return after(method, target, (args, result) => {
        try {
          const arg = args?.[0];
          let folder = arg?.folder ?? arg;
          if (arg?.id && !arg?.folder) {
            try { folder = FolderStore?.getGuildFolderById?.(arg.id) ?? arg; } catch {}
          }
          const cfg = effectiveFolderConfig(folder);
          const transition = findInReactTree(result, node => Array.isArray(node?.props?.items)
            && node.props.items.length > 0
            && typeof node?.props?.wrapChildren === "function"
            && (node.props.items[0]?.type === "preview" || node.props.items[0]?.type === "icon"));
          if (!transition?.props) return result;
          const item = transition.props.items?.[0];
          const expanded = item?.type === "icon" || !!folder?.expanded;
          if (expanded && item?.type === "icon" && cfg.source !== "discord" && cfg.accent) item.tintStyle = [item.tintStyle, { tintColor: cfg.accent }];
          if (!expanded && cfg.cover === "folder") transition.props.items = [{ type: "icon", tintStyle: { tintColor: cfg.coverAccent } }];
          if (!expanded) {
            const originalWrap = transition.props.wrapChildren;
            transition.props.wrapChildren = child => {
              const wrapped = originalWrap(child);
              try {
                const children = wrapped?.props?.children;
                const tile = Array.isArray(children) ? children[0] : null;
                if (tile?.props) {
                  const bg = React.createElement(BackgroundVisual, { key: "tt-closed-bg", folder, baseStyle: tile.props.style, fallbackRadius: 16 });
                  const outline = React.createElement(OutlineVisual, { key: "tt-closed-outline", folder, state: "closed", baseStyle: tile.props.style, fallbackRadius: 16 });
                  children[0] = React.cloneElement(tile, null, appendVisuals(tile.props.children, bg, outline));
                }
              } catch (error) { try { console.error("[ThemeToolkit] collapsed visual failed", error); } catch {} }
              return wrapped;
            };
          }
        } catch (error) { try { console.error("[ThemeToolkit] folder render patch failed", error); } catch {} }
        return result;
      });
    } catch (error) { try { console.error("[ThemeToolkit] failed to patch folder renderer", error); } catch {} return null; }
  }

  function patchExpandedFolderBackground() {
    const memo = GuildFolderModule?.GuildsBarGuildFolderBG;
    if (!memo) return null;
    const target = memo?.type ? memo : GuildFolderModule;
    const method = memo?.type ? "type" : "GuildsBarGuildFolderBG";
    if (typeof target?.[method] !== "function") return null;
    try {
      return after(method, target, (args, result) => {
        try {
          const folderId = args?.[0]?.folderId;
          let folder = null;
          try { folder = FolderStore?.getGuildFolderById?.(folderId) ?? null; } catch {}
          if (result?.props) {
            const bg = React.createElement(BackgroundVisual, { key: "tt-open-bg", folder, baseStyle: result.props.style, fallbackRadius: 18 });
            const outline = React.createElement(OutlineVisual, { key: "tt-open-outline", folder, state: "open", baseStyle: result.props.style, fallbackRadius: 18 });
            result = React.cloneElement(result, null, appendVisuals(result.props.children, bg, outline));
          }
        } catch (error) { try { console.error("[ThemeToolkit] expanded folder visual failed", error); } catch {} }
        return result;
      });
    } catch (error) { try { console.error("[ThemeToolkit] failed to patch expanded folder background", error); } catch {} return null; }
  }

  function patchMentionTags() {
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
          if (!result) return result;
          batchProbe.hits.messageRows++;

          const ui = effectiveUIAccentConfig();
          if (ui.source !== "discord" && ui.reaction && result.reactionsTheme && typeof result.reactionsTheme === "object") {
            batchProbe.hits.reactionRows++;
            const reaction = nativeColor(ui.reaction);
            const reactionText = nativeColor(autoContrastText(ui.reaction) ?? "#000000");
            result.reactionsTheme = {
              ...result.reactionsTheme,
              ...(reaction != null ? { activeReactionBackgroundColor: reaction, activeReactionBorderColor: reaction } : {}),
              ...(reactionText != null ? { activeReactionTextColor: reactionText } : {}),
            };
          }

          const message = args?.[0]?.message;
          if (!message?.mentioned) return result;
          const cfg = effectiveMentionConfig();
          if (cfg.source === "discord") return result;
          const existing = result.backgroundHighlight ?? {};
          const next = { ...existing };
          const background = cfg.backgroundEnabled ? nativeColor(cfg.background) : null;
          const line = cfg.lineEnabled ? nativeColor(cfg.line) : null;
          if (cfg.backgroundEnabled && background != null) next.backgroundColor = background;
          if (cfg.lineEnabled && line != null) next.gutterColor = line;
          result.backgroundHighlight = next;
          const textColor = effectiveMentionTextColor(cfg);
          if (textColor && result.message && typeof result.message === "object") {
            const processed = nativeColor(textColor);
            if (processed != null) result.message.textColor = processed;
          }
        } catch (error) {
          try { console.error("[ThemeToolkit] message row styling failed", error); } catch {}
        }
        return result;
      });
    } catch (error) {
      try { console.error("[ThemeToolkit] failed to patch message row styling", error); } catch {}
      return null;
    }
  }

  async function resetAllDiscordFolderColors() {
    let folders;
    try { folders = FolderStore?.getGuildFolders?.(); } catch {}
    if (!Array.isArray(folders) || typeof FolderActions?.saveGuildFolders !== "function") {
      toast("Folder reset API is unavailable on this Discord build");
      return;
    }
    const changed = folders.filter(folder => folder?.folderColor != null || folder?.color != null).length;
    if (!changed) { toast("All folder colors are already at Discord default"); return; }
    const next = folders.map(folder => ({
      ...folder,
      folderColor: null,
      ...(Object.prototype.hasOwnProperty.call(folder, "color") ? { color: null } : {}),
    }));
    try {
      await FolderActions.saveGuildFolders(next);
      refreshFolderUI();
      toast(`Reset ${changed} folder color${changed === 1 ? "" : "s"} to true default`);
    } catch (error) {
      try { console.error("[ThemeToolkit] folder reset failed", error); } catch {}
      toast("Could not reset folder colors");
    }
  }

  function Settings() {
    const [, forceUpdate] = React.useReducer(v => v + 1, 0);
    const theme = currentTheme();
    const themeCfg = themeFolderConfig();
    const page = { padding: 16, gap: 14 };
    const card = { backgroundColor: "#111214", borderRadius: 12, padding: 14, gap: 10 };
    const title = { color: "#F2F3F5", fontSize: 17, fontWeight: "700" };
    const text = { color: "#B5BAC1", fontSize: 13, lineHeight: 18 };
    const label = { color: "#F2F3F5", fontSize: 15, fontWeight: "600" };
    function set(key, value) {
      storage[key] = value;
      forceUpdate();
      refreshToolkitUI();
    }
    function Choice({ value, options, onChange }) {
      return React.createElement(RN.View, { style: { flexDirection: "row", gap: 6, flexWrap: "wrap" } }, options.map(option => {
        const active = value === option.value;
        return React.createElement(RN.Pressable, {
          key: String(option.value), onPress: () => onChange(option.value),
          style: { paddingVertical: 8, paddingHorizontal: 11, borderRadius: 8, borderWidth: 1, borderColor: active ? "#FFFFFF" : "#4E5058", backgroundColor: active ? "#FFFFFF18" : "#00000000" },
        }, React.createElement(RN.Text, { style: { color: "#F2F3F5", fontWeight: active ? "700" : "500" } }, option.label));
      }));
    }
    function pickerHex(value) {
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
    function ToggleRow({ labelText, value, onChange }) {
      return React.createElement(RN.View, { style: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12 } },
        React.createElement(RN.Text, { style: label }, labelText),
        React.createElement(RN.Switch, { value, onValueChange: onChange }),
      );
    }
    function OutlineCard({ stateName, prefix }) {
      const enabledKey = `${prefix}OutlineEnabled`;
      const modeKey = `${prefix}OutlineColorMode`;
      const patternKey = `${prefix}OutlinePattern`;
      const widthKey = `${prefix}OutlineWidth`;
      const animationKey = `${prefix}OutlineAnimation`;
      const speedKey = `${prefix}OutlineSpeed`;
      const glowKey = `${prefix}OutlineGlow`;
      const brightnessKey = `${prefix}OutlineBrightness`;
      const trailKey = `${prefix}OutlineTrail`;
      return React.createElement(RN.View, { style: card },
        React.createElement(RN.View, { style: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12 } },
          React.createElement(RN.View, { style: { flex: 1 } },
            React.createElement(RN.Text, { style: title }, `${stateName} folder outline`),
            React.createElement(RN.Text, { style: text }, `Independent styling while the folder is ${prefix === "closed" ? "collapsed" : "expanded"}.`),
          ),
          React.createElement(RN.Switch, { value: !!storage[enabledKey], onValueChange: value => set(enabledKey, value) }),
        ),
        React.createElement(RN.Text, { style: label }, "Color mode"),
        React.createElement(Choice, {
          value: storage[modeKey],
          options: [
            { value: "theme", label: "Theme / Auto" }, { value: "custom", label: "Custom" },
            { value: "rgb", label: "RGB" }, { value: "rainbow", label: "Rainbow" },
            { value: "spectrum", label: "Full spectrum" }, { value: "gradient", label: "Gradient" },
          ],
          onChange: value => set(modeKey, value),
        }),
        React.createElement(RN.Text, { style: text }, "RGB = red/green/blue. Rainbow = many rainbow hues. Full spectrum = a smooth sweep through the complete vivid hue wheel."),
        storage[modeKey] === "custom" ? React.createElement(ColorInput, { labelText: "Outline color", storageKey: `${prefix}OutlineColor` }) : null,
        storage[modeKey] === "gradient" ? React.createElement(RN.View, { style: { gap: 8 } },
          React.createElement(ColorInput, { labelText: "Gradient color 1", storageKey: `${prefix}Gradient1` }),
          React.createElement(ColorInput, { labelText: "Gradient color 2", storageKey: `${prefix}Gradient2` }),
          React.createElement(ColorInput, { labelText: "Gradient color 3 (optional)", storageKey: `${prefix}Gradient3` }),
        ) : null,
        React.createElement(RN.Text, { style: label }, "Pattern"),
        React.createElement(Choice, {
          value: storage[patternKey],
          options: [{ value: "theme", label: "Theme" }, { value: "solid", label: "Solid" }, { value: "dashed", label: "Dashed" }, { value: "dotted", label: "Dotted" }, { value: "segmented", label: "Segmented" }],
          onChange: value => set(patternKey, value),
        }),
        React.createElement(RN.Text, { style: label }, "Animation"),
        React.createElement(Choice, {
          value: storage[animationKey],
          options: [{ value: "theme", label: "Theme" }, { value: "none", label: "None" }, { value: "pulse", label: "Pulse" }, { value: "breathe", label: "Breathe" }, { value: "glow", label: "Glow" }, { value: "chase", label: "Chase" }, { value: "marquee", label: "Marquee" }, { value: "spin", label: "Color spin" }],
          onChange: value => set(animationKey, value),
        }),
        React.createElement(RN.Text, { style: text }, "Chase = one smooth glowing orb with a fading tail. Marquee = a smooth moving highlight around the border. Color spin moves the color band around solid borders natively."),
        storage[animationKey] === "chase" ? React.createElement(RN.View, { style: { gap: 6 } },
          React.createElement(RN.Text, { style: label }, "Trail length"),
          React.createElement(Choice, {
            value: storage[trailKey],
            options: [{ value: "short", label: "Short" }, { value: "medium", label: "Medium" }, { value: "long", label: "Long" }],
            onChange: value => set(trailKey, value),
          }),
        ) : null,
        React.createElement(RN.Text, { style: label }, "Speed"),
        React.createElement(Choice, {
          value: storage[speedKey],
          options: [{ value: "theme", label: "Theme" }, { value: "slow", label: "Slow" }, { value: "normal", label: "Normal" }, { value: "fast", label: "Fast" }],
          onChange: value => set(speedKey, value),
        }),
        React.createElement(RN.Text, { style: label }, "Brightness"),
        React.createElement(Choice, {
          value: storage[brightnessKey],
          options: [{ value: "normal", label: "Normal" }, { value: "bright", label: "Bright" }, { value: "max", label: "Max" }],
          onChange: value => set(brightnessKey, value),
        }),
        React.createElement(RN.Text, { style: label }, "Thickness"),
        React.createElement(Choice, {
          value: storage[widthKey],
          options: [{ value: "theme", label: "Theme" }, { value: 1, label: "1" }, { value: 2, label: "2" }, { value: 3, label: "3" }],
          onChange: value => set(widthKey, value),
        }),
        React.createElement(RN.Text, { style: label }, "Glow strength"),
        React.createElement(Choice, {
          value: storage[glowKey],
          options: [{ value: "theme", label: "Theme" }, { value: 1, label: "Soft" }, { value: 2, label: "Medium" }, { value: 3, label: "Strong" }],
          onChange: value => set(glowKey, value),
        }),
      );
    }

    const activeThemeText = theme
      ? `${theme.data?.name ?? "Unnamed theme"}${themeCfg.hasMetadata ? " • Toolkit metadata" : " • automatic mapping"}`
      : "No custom theme active • automatic styling is off";
    return React.createElement(RN.ScrollView, { contentContainerStyle: page },
      React.createElement(RN.View, { style: card },
        React.createElement(RN.Text, { style: title }, "Theme Toolkit v0.6.1 TEST"),
        React.createElement(RN.Text, { style: text }, activeThemeText),
        React.createElement(RN.Text, { style: text }, "Second-pass visual probe: keeps the loud colors, adds deeper component-level hooks, and records exactly which runtime paths are actually firing."),
      ),
      React.createElement(RN.View, { style: card },
        React.createElement(RN.Text, { style: title }, "Runtime hook probe"),
        React.createElement(RN.Text, { style: text }, "Browse Discord first, then reopen this settings page. FOUND means the module exists; hits tells us whether Discord actually used that path."),
        React.createElement(RN.Text, { style: text }, `Guild direct: ${GuildBarGuildModule?.default ? "FOUND" : "MISSING"} • hits ${batchProbe.hits.guildDirect}`),
        React.createElement(RN.Text, { style: text }, `Guild style: ${GuildBarWrapperModule?.useGuildsBarAnimatedWrapperStyles ? "FOUND" : "MISSING"} • hits ${batchProbe.hits.guildStyle}`),
        React.createElement(RN.Text, { style: text }, `Search button: ${SearchButtonModule?.SearchButtonContent ? "FOUND" : "MISSING"} • hits ${batchProbe.hits.searchButton}`),
        React.createElement(RN.Text, { style: text }, `Base icon renderer: ${BaseIconImageModule?.BaseIconImage ? "FOUND" : "MISSING"} • hits ${batchProbe.hits.baseIcon}`),
        React.createElement(RN.Text, { style: text }, `Home export/base hits: ${batchProbe.hits.homeExport}/${batchProbe.hits.baseHome}`),
        React.createElement(RN.Text, { style: text }, `Search export/base hits: ${batchProbe.hits.searchExport}/${batchProbe.hits.baseSearch}`),
        React.createElement(RN.Text, { style: text }, `Settings export/base hits: ${batchProbe.hits.settingsExport}/${batchProbe.hits.baseSettings}`),
        React.createElement(RN.Text, { style: text }, `Message rows: ${MessageRowGenerator?.generateMessageRowData ? "FOUND" : "MISSING"} • hits ${batchProbe.hits.messageRows} • reaction-theme rows ${batchProbe.hits.reactionRows}`),
      ),
      React.createElement(RN.View, { style: card },
        React.createElement(RN.Text, { style: title }, "UI accents + icons — batch test"),
        React.createElement(RN.Text, { style: text }, "Toolkit test defaults are deliberately obvious: selected server = magenta, reacted reaction = lime, Home = cyan, Search = yellow, Settings = orange."),
        React.createElement(Choice, {
          value: storage.uiAccentSource,
          options: [{ value: "theme", label: "Theme / Auto" }, { value: "toolkit", label: "Toolkit" }, { value: "discord", label: "Discord" }],
          onChange: value => set("uiAccentSource", value),
        }),
        storage.uiAccentSource === "toolkit" ? React.createElement(RN.View, { style: { gap: 8 } },
          React.createElement(ColorInput, { labelText: "Smart accent fallback", storageKey: "smartAccentColor" }),
          React.createElement(ColorInput, { labelText: "Selected server", storageKey: "selectedGuildAccent" }),
          React.createElement(ColorInput, { labelText: "Reacted reaction", storageKey: "reactionAccent" }),
          React.createElement(ColorInput, { labelText: "Home icon", storageKey: "homeIconAccent" }),
          React.createElement(ColorInput, { labelText: "Search icon", storageKey: "searchIconAccent" }),
          React.createElement(ColorInput, { labelText: "Settings icon", storageKey: "settingsIconAccent" }),
          React.createElement(RN.Text, { style: text }, "If an individual override is blank, it inherits Smart accent fallback."),
        ) : null,
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
          React.createElement(RN.Text, { style: label }, "Message text"),
          React.createElement(Choice, {
            value: storage.mentionTextMode,
            options: [{ value: "theme", label: "Theme" }, { value: "auto", label: "Auto contrast" }, { value: "custom", label: "Custom" }],
            onChange: value => set("mentionTextMode", value),
          }),
          storage.mentionTextMode === "custom" ? React.createElement(ColorInput, { labelText: "Message text color", storageKey: "mentionTextColor" }) : null,
          React.createElement(RN.Text, { style: text }, "Auto contrast chooses black or white for the message body based on the effective highlight background. The @mention tag keeps its own separate styling."),
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
      React.createElement(RN.View, { style: card },
        React.createElement(RN.Text, { style: title }, "Folder colors"),
        React.createElement(Choice, {
          value: storage.folderColorSource,
          options: [{ value: "theme", label: "Theme / Auto" }, { value: "toolkit", label: "Toolkit" }, { value: "discord", label: "Discord" }],
          onChange: value => set("folderColorSource", value),
        }),
      ),
      React.createElement(RN.View, { style: card },
        React.createElement(RN.Text, { style: title }, "Collapsed folder cover"),
        React.createElement(Choice, {
          value: storage.folderCoverMode,
          options: [{ value: "theme", label: "Theme / Auto" }, { value: "preview", label: "Server previews" }, { value: "folder", label: "Folder icon" }],
          onChange: value => set("folderCoverMode", value),
        }),
      ),
      React.createElement(OutlineCard, { stateName: "Closed", prefix: "closed" }),
      React.createElement(OutlineCard, { stateName: "Open", prefix: "open" }),
      React.createElement(RN.View, { style: card },
        React.createElement(RN.Text, { style: title }, "Toolkit folder palette"),
        React.createElement(RN.Text, { style: text }, "Only used when Folder colors is set to Toolkit."),
        React.createElement(ColorInput, { labelText: "Background", storageKey: "folderBackground" }),
        React.createElement(ColorInput, { labelText: "Folder icon / accent", storageKey: "folderAccent" }),
      ),
      React.createElement(RN.View, { style: card },
        React.createElement(RN.Text, { style: title }, "Discord folder reset"),
        React.createElement(RN.Text, { style: text }, "Clears Discord's saved folder colors back to true null/default. Folder names and contents are unchanged."),
        React.createElement(RN.Pressable, {
          onPress() {
            RN.Alert.alert("Reset all folder colors?", "Every server folder will return to Discord's true default color.", [
              { text: "Cancel", style: "cancel" },
              { text: "Reset", style: "destructive", onPress: () => void resetAllDiscordFolderColors() },
            ]);
          },
          style: { paddingVertical: 10, paddingHorizontal: 12, borderRadius: 8, borderWidth: 1, borderColor: "#ED4245", alignSelf: "flex-start" },
        }, React.createElement(RN.Text, { style: { color: "#FF6B6B", fontWeight: "700" } }, "Reset all folder colors to default")),
      ),
    );
  }

  return {
    onLoad() {
      installAppStateListener();
      unpatchFolder = patchFolderRenderer();
      unpatchFolderBG = patchExpandedFolderBackground();
      unpatchMentions = patchMentionHighlights();
      unpatchMentionTags = patchMentionTags();
      unpatchGuildBarStyles = patchGuildBarAccent();
      unpatchGuildBarDirect = patchGuildBarDirectRenderer();
      unpatchHomeIcon = patchGeneratedIcon(HomeIconModule, "HomeIcon", "homeIcon");
      unpatchSearchIcon = patchGeneratedIcon(SearchIconModule, "MagnifyingGlassIcon", "searchIcon");
      unpatchSettingsIcon = patchGeneratedIcon(SettingsIconModule, "SettingsIcon", "settingsIcon");
      unpatchBaseIconImage = patchBaseIconImageRenderer();
      unpatchSearchButtonDirect = patchSearchButtonRenderer();
    },
    onUnload() {
      try { unpatchFolder?.(); } catch {}
      try { unpatchFolderBG?.(); } catch {}
      try { unpatchMentions?.(); } catch {}
      try { unpatchMentionTags?.(); } catch {}
      try { unpatchGuildBarStyles?.(); } catch {}
      try { unpatchGuildBarDirect?.(); } catch {}
      try { unpatchHomeIcon?.(); } catch {}
      try { unpatchSearchIcon?.(); } catch {}
      try { unpatchSettingsIcon?.(); } catch {}
      try { unpatchBaseIconImage?.(); } catch {}
      try { unpatchSearchButtonDirect?.(); } catch {}
      unpatchFolder = null;
      unpatchFolderBG = null;
      unpatchMentions = null;
      unpatchMentionTags = null;
      unpatchGuildBarStyles = null;
      unpatchGuildBarDirect = null;
      unpatchHomeIcon = null;
      unpatchSearchIcon = null;
      unpatchSettingsIcon = null;
      unpatchBaseIconImage = null;
      unpatchSearchButtonDirect = null;
      removeAppStateListener();
      visualSubscribers.clear();
      colorSubscribers.clear();
      stopColorTimer();
      stopSharedMotionClocks();
      pathGeometryCache.clear();
    },
    settings: Settings,
  };
})();