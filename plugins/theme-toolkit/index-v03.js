(() => {
  "use strict";

  const { after } = vendetta.patcher;
  const { findByProps } = vendetta.metro;
  const { React, ReactNative: RN } = vendetta.metro.common;
  const storage = vendetta.plugin.storage;
  const findInReactTree = vendetta.utils?.findInReactTree;
  const showToast = vendetta.ui?.toasts?.showToast;
  const getAssetIDByName = vendetta.ui?.assets?.getAssetIDByName;

  const Animated = RN.Animated;
  const Easing = RN.Easing;

  const GuildFolderModule = (() => {
    try { return findByProps("GuildsBarGuildFolderBG"); }
    catch { return null; }
  })();

  const FolderStore = (() => {
    try { return findByProps("getGuildFolders", "getGuildFolderById"); }
    catch { return null; }
  })();

  const FolderActions = (() => {
    try { return findByProps("saveGuildFolders"); }
    catch { return null; }
  })();

  const ColorUtils = (() => {
    try { return findByProps("int2hex", "hex2int"); }
    catch { return null; }
  })();

  const toolkitIcon = (() => {
    try {
      return getAssetIDByName?.("FolderIcon")
        ?? getAssetIDByName?.("PaintPaletteIcon")
        ?? getAssetIDByName?.("ic_theme_24px");
    } catch {
      return undefined;
    }
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
  };

  try {
    if (!storage.themeToolkitV03Migrated) {
      if (String(storage.folderBackground ?? "").toUpperCase() === "#000000") storage.folderBackground = "";
      if (String(storage.folderAccent ?? "").toUpperCase() === "#FFFFFF") storage.folderAccent = "";
      if (String(storage.closedOutlineColor ?? "").toUpperCase() === "#FFFFFF" && storage.closedOutlineColorMode === "custom") {
        storage.closedOutlineColor = "";
        storage.closedOutlineColorMode = "theme";
      }
      if (String(storage.openOutlineColor ?? "").toUpperCase() === "#FFFFFF" && storage.openOutlineColorMode === "custom") {
        storage.openOutlineColor = "";
        storage.openOutlineColorMode = "theme";
      }
      storage.themeToolkitV03Migrated = true;
    }
  } catch {}

  for (const [key, value] of Object.entries(DEFAULTS)) {
    try {
      if (storage[key] == null) storage[key] = value;
    } catch {}
  }

  let unpatchFolder = null;
  let unpatchFolderBG = null;

  function toast(text) {
    try { showToast?.(text, toolkitIcon); } catch {}
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

  function normalizePattern(value, fallback = "solid") {
    return ["solid", "dashed", "dotted", "segmented"].includes(value) ? value : fallback;
  }

  function normalizeWidth(value, fallback = 1) {
    const n = Number(value);
    return Number.isFinite(n) ? Math.max(1, Math.min(3, n)) : fallback;
  }

  function normalizeAnimation(value, fallback = "none") {
    return ["none", "pulse", "breathe", "glow", "chase", "spin"].includes(value) ? value : fallback;
  }

  function normalizeSpeed(value, fallback = "normal") {
    return ["slow", "normal", "fast"].includes(value) ? value : fallback;
  }

  function normalizeGlow(value, fallback = 2) {
    const n = Number(value);
    return Number.isFinite(n) ? Math.max(1, Math.min(3, n)) : fallback;
  }

  function currentTheme() {
    try {
      const api = globalThis?.bunny ?? globalThis?.window?.bunny;
      return api?.themes?.getCurrentTheme?.() ?? null;
    } catch {
      return null;
    }
  }

  function inactiveOutline() {
    return {
      enabled: false,
      color: null,
      colorMode: "solid",
      gradient: [],
      width: 1,
      pattern: "solid",
      animation: "none",
      speed: "normal",
      glow: 2,
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
    if (!["solid", "rgb", "gradient"].includes(colorMode)) colorMode = "solid";
    if (colorMode === "gradient" && gradient.length < 2) colorMode = "solid";

    return {
      enabled: specific.outline !== false && specific.outlineEnabled !== false,
      color: colorValue(specific.outlineColor)
        ?? colorValue(specific.border)
        ?? colorValue(extra?.border)
        ?? fallbackColor,
      colorMode,
      gradient,
      width: normalizeWidth(specific.outlineWidth ?? specific.borderWidth ?? extra?.borderWidth, 1),
      pattern: normalizePattern(specific.outlinePattern ?? specific.pattern ?? extra?.pattern, "solid"),
      animation: normalizeAnimation(specific.animation, "none"),
      speed: normalizeSpeed(specific.speed, "normal"),
      glow: normalizeGlow(specific.glowStrength ?? specific.glow, 2),
    };
  }

  function themeFolderConfig() {
    const theme = currentTheme();
    const data = theme?.data ?? null;

    if (!data) {
      return {
        hasTheme: false,
        hasMetadata: false,
        background: null,
        accent: null,
        cover: "preview",
        closed: inactiveOutline(),
        open: inactiveOutline(),
      };
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

  function discordFolderColor(folder) {
    const value = folder?.color ?? folder?.folderColor;
    if (value == null) return null;
    try {
      const hex = ColorUtils?.int2hex?.(value);
      return colorValue(hex);
    } catch {}
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
    const enabledSetting = !!storage[`${prefix}OutlineEnabled`];
    const requestedMode = storage[`${prefix}OutlineColorMode`];
    const requestedPattern = storage[`${prefix}OutlinePattern`];
    const requestedWidth = storage[`${prefix}OutlineWidth`];
    const requestedAnimation = storage[`${prefix}OutlineAnimation`];
    const requestedSpeed = storage[`${prefix}OutlineSpeed`];
    const requestedGlow = storage[`${prefix}OutlineGlow`];

    let colorMode = requestedMode;
    let color = null;
    let gradient = [];

    if (requestedMode === "theme") {
      if (!hasTheme || themeOutline.enabled === false) return inactiveOutline();
      colorMode = themeOutline.colorMode === "rgb" ? "rgb"
        : themeOutline.colorMode === "gradient" ? "gradient"
        : "solid";
      color = themeOutline.color;
      gradient = themeOutline.gradient ?? [];
    } else if (requestedMode === "custom") {
      colorMode = "solid";
      color = colorValue(storage[`${prefix}OutlineColor`]);
    } else if (requestedMode === "rgb") {
      colorMode = "rgb";
      color = "#FF0000";
    } else if (requestedMode === "gradient") {
      colorMode = "gradient";
      gradient = customGradient(prefix);
      color = gradient[0] ?? null;
    } else {
      return inactiveOutline();
    }

    const enabled = enabledSetting && (
      colorMode === "rgb"
      || (colorMode === "gradient" && gradient.length >= 2)
      || !!color
    );

    return {
      enabled,
      color,
      colorMode,
      gradient,
      pattern: requestedPattern === "theme"
        ? (hasTheme ? themeOutline.pattern : "solid")
        : normalizePattern(requestedPattern, hasTheme ? themeOutline.pattern : "solid"),
      width: requestedWidth === "theme"
        ? (hasTheme ? themeOutline.width : 1)
        : normalizeWidth(requestedWidth, hasTheme ? themeOutline.width : 1),
      animation: requestedAnimation === "theme"
        ? (hasTheme ? themeOutline.animation : "none")
        : normalizeAnimation(requestedAnimation, hasTheme ? themeOutline.animation : "none"),
      speed: requestedSpeed === "theme"
        ? (hasTheme ? themeOutline.speed : "normal")
        : normalizeSpeed(requestedSpeed, hasTheme ? themeOutline.speed : "normal"),
      glow: requestedGlow === "theme"
        ? (hasTheme ? themeOutline.glow : 2)
        : normalizeGlow(requestedGlow, hasTheme ? themeOutline.glow : 2),
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
      if (theme.hasTheme) {
        background = theme.background;
        accent = theme.accent;
      } else {
        source = "discord";
      }
    } else if (requestedSource === "toolkit") {
      background = colorValue(storage.folderBackground);
      accent = colorValue(storage.folderAccent);
    } else {
      source = "discord";
    }

    const requestedCover = storage.folderCoverMode;
    const cover = requestedCover === "theme"
      ? (theme.hasTheme ? theme.cover : "preview")
      : requestedCover;

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

  function flattened(style) {
    try { return RN.StyleSheet?.flatten?.(style) ?? {}; }
    catch { return {}; }
  }

  function radiusFor(style, fallback) {
    const flat = flattened(style);
    return flat.borderRadius ?? flat.borderTopLeftRadius ?? flat.borderTopRightRadius ?? fallback;
  }

  function speedMs(speed) {
    if (speed === "slow") return 6500;
    if (speed === "fast") return 1800;
    return 3600;
  }

  const RAINBOW = [
    "#FF0000", "#FF7F00", "#FFFF00", "#00FF00",
    "#00FFFF", "#0080FF", "#8000FF", "#FF00FF", "#FF0000",
  ];

  function hexRgb(hex) {
    const value = colorValue(hex);
    if (!value) return null;
    const h = value.slice(1, 7);
    return {
      r: parseInt(h.slice(0, 2), 16),
      g: parseInt(h.slice(2, 4), 16),
      b: parseInt(h.slice(4, 6), 16),
    };
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
    return rgbHex(
      a.r + (b.r - a.r) * local,
      a.g + (b.g - a.g) * local,
      a.b + (b.b - a.b) * local,
    );
  }

  function animatedCycleColor(phase, colors, offset = 0) {
    if (!phase?.interpolate) return gradientAt(colors, offset);
    const inputRange = [0, 0.25, 0.5, 0.75, 1];
    const outputRange = inputRange.map(step => gradientAt(colors, offset + step));
    try {
      return phase.interpolate({ inputRange, outputRange });
    } catch {
      return outputRange[0];
    }
  }

  function perimeterSegments(pattern, width) {
    const items = [];
    const pushTop = (left, size) => items.push({ top: 0, left, width: size, height: width });
    const pushRight = (top, size) => items.push({ right: 0, top, width, height: size });
    const pushBottom = (right, size) => items.push({ bottom: 0, right, width: size, height: width });
    const pushLeft = (bottom, size) => items.push({ left: 0, bottom, width, height: size });

    if (pattern === "segmented") {
      pushTop("10%", "31%"); pushTop("59%", "31%");
      pushRight("10%", "31%"); pushRight("59%", "31%");
      pushBottom("10%", "31%"); pushBottom("59%", "31%");
      pushLeft("10%", "31%"); pushLeft("59%", "31%");
      return items;
    }

    if (pattern === "dotted") {
      const dot = Math.max(2, width * 2.2);
      for (const p of ["12%", "37%", "62%", "87%"]) items.push({ top: -width * 0.4, left: p, width: dot, height: dot, borderRadius: dot });
      for (const p of ["12%", "37%", "62%", "87%"]) items.push({ right: -width * 0.4, top: p, width: dot, height: dot, borderRadius: dot });
      for (const p of ["12%", "37%", "62%", "87%"]) items.push({ bottom: -width * 0.4, right: p, width: dot, height: dot, borderRadius: dot });
      for (const p of ["12%", "37%", "62%", "87%"]) items.push({ left: -width * 0.4, bottom: p, width: dot, height: dot, borderRadius: dot });
      return items;
    }

    const size = pattern === "dashed" ? "18%" : "25.5%";
    const starts = pattern === "dashed" ? ["3%", "28%", "53%", "78%"] : ["0%", "25%", "50%", "75%"];
    for (const p of starts) pushTop(p, size);
    for (const p of starts) pushRight(p, size);
    for (const p of starts) pushBottom(p, size);
    for (const p of starts) pushLeft(p, size);
    return items;
  }

  function chaseOpacity(phase, index, count) {
    if (!phase?.interpolate || count <= 1) return 1;
    const center = index / count;
    const half = Math.max(0.035, 1.5 / count);
    const a = Math.max(0, center - half);
    const b = center;
    const c = Math.min(1, center + half);
    const inputRange = [0, a, b, c, 1].filter((v, i, arr) => i === 0 || v > arr[i - 1]);
    const outputRange = inputRange.map(v => Math.abs(v - center) < 0.0001 ? 1 : 0.16);
    try {
      return phase.interpolate({ inputRange, outputRange, extrapolate: "clamp" });
    } catch {
      return 1;
    }
  }

  function OutlineVisual({ outline, baseStyle, fallbackRadius }) {
    if (!outline?.enabled) return null;

    const radius = radiusFor(baseStyle, fallbackRadius);
    const phaseRef = React.useRef(null);
    if (!phaseRef.current && Animated?.Value) phaseRef.current = new Animated.Value(0);
    const phase = phaseRef.current;

    const needsMotion = outline.colorMode === "rgb"
      || outline.animation !== "none"
      || (outline.colorMode === "gradient" && outline.animation === "spin");

    React.useEffect(() => {
      if (!needsMotion || !phase || !Animated?.timing || !Animated?.loop) return undefined;
      try { phase.stopAnimation?.(); phase.setValue?.(0); } catch {}
      const loop = Animated.loop(Animated.timing(phase, {
        toValue: 1,
        duration: speedMs(outline.speed),
        easing: Easing?.linear,
        useNativeDriver: false,
      }));
      try { loop.start(); } catch {}
      return () => {
        try { loop.stop?.(); } catch {}
        try { phase.stopAnimation?.(); } catch {}
      };
    }, [needsMotion, outline.speed, outline.animation, outline.colorMode]);

    const cycleColors = outline.colorMode === "rgb" ? RAINBOW : outline.gradient;
    const baseColor = outline.colorMode === "rgb"
      ? animatedCycleColor(phase, RAINBOW, 0)
      : outline.color;

    let animatedOpacity = 1;
    let animatedScale = 1;
    if (phase?.interpolate && outline.animation === "pulse") {
      animatedOpacity = phase.interpolate({ inputRange: [0, 0.5, 1], outputRange: [1, 0.48, 1] });
      animatedScale = phase.interpolate({ inputRange: [0, 0.5, 1], outputRange: [1, 1.055, 1] });
    } else if (phase?.interpolate && outline.animation === "breathe") {
      animatedOpacity = phase.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0.28, 1, 0.28] });
    }

    const usePerimeter = outline.pattern === "segmented"
      || outline.colorMode === "gradient"
      || outline.animation === "chase"
      || outline.animation === "spin";

    const containerStyle = {
      position: "absolute",
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      borderRadius: radius,
      opacity: animatedOpacity,
      transform: [{ scale: animatedScale }],
    };

    const Wrapper = Animated?.View ?? RN.View;

    function glowLayer() {
      if (outline.animation !== "glow") return null;
      const strength = outline.glow;
      const glowOpacity = phase?.interpolate
        ? phase.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0.12, 0.62, 0.12] })
        : 0.35;
      return React.createElement(Wrapper, {
        key: "glow",
        pointerEvents: "none",
        style: {
          position: "absolute",
          top: strength,
          left: strength,
          right: strength,
          bottom: strength,
          borderRadius: Math.max(0, radius - strength),
          borderWidth: outline.width + strength * 2,
          borderColor: baseColor,
          borderStyle: outline.pattern === "segmented" ? "solid" : outline.pattern,
          opacity: glowOpacity,
        },
      });
    }

    if (!usePerimeter) {
      return React.createElement(Wrapper, {
        pointerEvents: "none",
        style: containerStyle,
      },
        glowLayer(),
        React.createElement(Wrapper, {
          pointerEvents: "none",
          style: {
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            borderRadius: radius,
            borderWidth: outline.width,
            borderColor: baseColor,
            borderStyle: outline.pattern,
          },
        }),
      );
    }

    const segments = perimeterSegments(outline.pattern, outline.width);
    const rotateGradient = outline.colorMode === "gradient" && outline.animation === "spin";

    return React.createElement(Wrapper, {
      pointerEvents: "none",
      style: containerStyle,
    },
      outline.animation === "glow" ? glowLayer() : null,
      segments.map((style, index) => {
        const offset = index / Math.max(1, segments.length);
        let segmentColor = outline.color;

        if (outline.colorMode === "rgb") {
          segmentColor = outline.animation === "spin" || outline.animation === "chase"
            ? animatedCycleColor(phase, RAINBOW, offset)
            : animatedCycleColor(phase, RAINBOW, 0);
        } else if (outline.colorMode === "gradient") {
          segmentColor = rotateGradient
            ? animatedCycleColor(phase, cycleColors, offset)
            : gradientAt(cycleColors, offset);
        }

        const opacity = outline.animation === "chase"
          ? chaseOpacity(phase, index, segments.length)
          : 1;

        return React.createElement(Wrapper, {
          key: `outline-segment-${index}`,
          pointerEvents: "none",
          style: [
            {
              position: "absolute",
              backgroundColor: segmentColor,
              opacity,
              borderRadius: style.borderRadius ?? Math.max(1, outline.width),
            },
            style,
          ],
        });
      }),
    );
  }

  function outlineOverlay(outline, baseStyle, key, fallbackRadius) {
    if (!outline?.enabled) return null;
    return React.createElement(OutlineVisual, {
      key,
      outline,
      baseStyle,
      fallbackRadius,
    });
  }

  function appendChild(existing, extra) {
    if (!extra) return existing;
    if (existing == null) return extra;
    if (Array.isArray(existing)) return [...existing, extra];
    return [existing, extra];
  }

  function withBackground(style, cfg) {
    if (cfg.source === "discord" || !cfg.background) return style;
    return [style, { backgroundColor: cfg.background }];
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
          const folder = args?.[0]?.id ?? args?.[0]?.folder ?? args?.[0];
          const cfg = effectiveFolderConfig(folder);
          const transition = findInReactTree(
            result,
            node => Array.isArray(node?.props?.items)
              && node.props.items.length > 0
              && typeof node?.props?.wrapChildren === "function"
              && (node.props.items[0]?.type === "preview" || node.props.items[0]?.type === "icon"),
          );

          if (!transition?.props) return result;

          const item = transition.props.items?.[0];
          const expanded = item?.type === "icon" || !!folder?.expanded;

          if (expanded && item?.type === "icon" && cfg.source !== "discord" && cfg.accent) {
            item.tintStyle = [item.tintStyle, { tintColor: cfg.accent }];
          }

          if (!expanded && cfg.cover === "folder") {
            transition.props.items = [{
              type: "icon",
              tintStyle: { tintColor: cfg.coverAccent },
            }];
          }

          if (!expanded) {
            const originalWrap = transition.props.wrapChildren;
            transition.props.wrapChildren = child => {
              const wrapped = originalWrap(child);
              try {
                const children = wrapped?.props?.children;
                const tile = Array.isArray(children) ? children[0] : null;
                if (tile?.props) {
                  const overlay = outlineOverlay(
                    cfg.closedOutline,
                    tile.props.style,
                    "theme-toolkit-closed-outline",
                    16,
                  );
                  const nextTile = React.cloneElement(
                    tile,
                    { style: withBackground(tile.props.style, cfg) },
                    appendChild(tile.props.children, overlay),
                  );
                  children[0] = nextTile;
                }
              } catch (error) {
                try { console.error("[ThemeToolkit] collapsed outline failed", error); } catch {}
              }
              return wrapped;
            };
          }
        } catch (error) {
          try { console.error("[ThemeToolkit] folder render patch failed", error); } catch {}
        }
        return result;
      });
    } catch (error) {
      try { console.error("[ThemeToolkit] failed to patch folder renderer", error); } catch {}
      return null;
    }
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
          const cfg = effectiveFolderConfig(folder);

          if (result?.props) {
            const overlay = outlineOverlay(
              cfg.openOutline,
              result.props.style,
              "theme-toolkit-open-outline",
              18,
            );
            result = React.cloneElement(
              result,
              { style: withBackground(result.props.style, cfg) },
              appendChild(result.props.children, overlay),
            );
          }
        } catch (error) {
          try { console.error("[ThemeToolkit] expanded folder patch failed", error); } catch {}
        }
        return result;
      });
    } catch (error) {
      try { console.error("[ThemeToolkit] failed to patch expanded folder background", error); } catch {}
      return null;
    }
  }

  function refreshFolderUI() {
    try { FolderStore?.emitChange?.(); } catch {}
  }

  async function resetAllDiscordFolderColors() {
    let folders;
    try { folders = FolderStore?.getGuildFolders?.(); } catch {}

    if (!Array.isArray(folders) || typeof FolderActions?.saveGuildFolders !== "function") {
      toast("Folder reset API is unavailable on this Discord build");
      return;
    }

    const changed = folders.filter(folder => folder?.folderColor != null || folder?.color != null).length;
    if (changed === 0) {
      toast("All folder colors are already at Discord default");
      return;
    }

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
    const [, forceUpdate] = React.useReducer(value => value + 1, 0);
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
      refreshFolderUI();
    }

    function Choice({ value, options, onChange }) {
      return React.createElement(RN.View, {
        style: { flexDirection: "row", gap: 6, flexWrap: "wrap" },
      }, options.map(option => {
        const active = value === option.value;
        return React.createElement(RN.Pressable, {
          key: String(option.value),
          onPress: () => onChange(option.value),
          style: {
            paddingVertical: 8,
            paddingHorizontal: 11,
            borderRadius: 8,
            borderWidth: 1,
            borderColor: active ? "#FFFFFF" : "#4E5058",
            backgroundColor: active ? "#FFFFFF18" : "#00000000",
          },
        }, React.createElement(RN.Text, {
          style: { color: "#F2F3F5", fontWeight: active ? "700" : "500" },
        }, option.label));
      }));
    }

    function ColorInput({ labelText, storageKey }) {
      return React.createElement(RN.View, { style: { gap: 6 } },
        React.createElement(RN.Text, { style: label }, labelText),
        React.createElement(RN.TextInput, {
          value: String(storage[storageKey] ?? ""),
          autoCapitalize: "characters",
          autoCorrect: false,
          placeholder: "Unset",
          placeholderTextColor: "#6D6F78",
          onChangeText(value) {
            storage[storageKey] = value;
            forceUpdate();
          },
          onEndEditing() {
            const raw = String(storage[storageKey] ?? "").trim();
            storage[storageKey] = raw ? (colorValue(raw) ?? "") : "";
            forceUpdate();
            refreshFolderUI();
          },
          style: {
            color: "#FFFFFF",
            backgroundColor: "#000000",
            borderWidth: 1,
            borderColor: "#4E5058",
            borderRadius: 8,
            paddingHorizontal: 10,
            paddingVertical: 8,
          },
        }),
      );
    }

    function OutlineCard({ stateName, prefix }) {
      const enabledKey = `${prefix}OutlineEnabled`;
      const modeKey = `${prefix}OutlineColorMode`;
      const colorKey = `${prefix}OutlineColor`;
      const patternKey = `${prefix}OutlinePattern`;
      const widthKey = `${prefix}OutlineWidth`;
      const animationKey = `${prefix}OutlineAnimation`;
      const speedKey = `${prefix}OutlineSpeed`;
      const glowKey = `${prefix}OutlineGlow`;

      return React.createElement(RN.View, { style: card },
        React.createElement(RN.View, {
          style: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12 },
        },
          React.createElement(RN.View, { style: { flex: 1 } },
            React.createElement(RN.Text, { style: title }, `${stateName} folder outline`),
            React.createElement(RN.Text, { style: text },
              `Independent styling while the folder is ${prefix === "closed" ? "collapsed" : "expanded"}.`,
            ),
          ),
          React.createElement(RN.Switch, {
            value: !!storage[enabledKey],
            onValueChange: value => set(enabledKey, value),
          }),
        ),

        React.createElement(RN.Text, { style: label }, "Color mode"),
        React.createElement(Choice, {
          value: storage[modeKey],
          options: [
            { value: "theme", label: "Theme / Auto" },
            { value: "custom", label: "Custom" },
            { value: "rgb", label: "RGB" },
            { value: "gradient", label: "Gradient" },
          ],
          onChange: value => set(modeKey, value),
        }),

        storage[modeKey] === "custom"
          ? React.createElement(ColorInput, { labelText: "Outline color", storageKey: colorKey })
          : null,

        storage[modeKey] === "gradient"
          ? React.createElement(RN.View, { style: { gap: 8 } },
              React.createElement(ColorInput, { labelText: "Gradient color 1", storageKey: `${prefix}Gradient1` }),
              React.createElement(ColorInput, { labelText: "Gradient color 2", storageKey: `${prefix}Gradient2` }),
              React.createElement(ColorInput, { labelText: "Gradient color 3 (optional)", storageKey: `${prefix}Gradient3` }),
            )
          : null,

        React.createElement(RN.Text, { style: label }, "Pattern"),
        React.createElement(Choice, {
          value: storage[patternKey],
          options: [
            { value: "theme", label: "Theme" },
            { value: "solid", label: "Solid" },
            { value: "dashed", label: "Dashed" },
            { value: "dotted", label: "Dotted" },
            { value: "segmented", label: "Segmented" },
          ],
          onChange: value => set(patternKey, value),
        }),

        React.createElement(RN.Text, { style: label }, "Animation"),
        React.createElement(Choice, {
          value: storage[animationKey],
          options: [
            { value: "theme", label: "Theme" },
            { value: "none", label: "None" },
            { value: "pulse", label: "Pulse" },
            { value: "breathe", label: "Breathe" },
            { value: "glow", label: "Glow" },
            { value: "chase", label: "Chase" },
            { value: "spin", label: "Color spin" },
          ],
          onChange: value => set(animationKey, value),
        }),

        React.createElement(RN.Text, { style: label }, "Speed"),
        React.createElement(Choice, {
          value: storage[speedKey],
          options: [
            { value: "theme", label: "Theme" },
            { value: "slow", label: "Slow" },
            { value: "normal", label: "Normal" },
            { value: "fast", label: "Fast" },
          ],
          onChange: value => set(speedKey, value),
        }),

        React.createElement(RN.Text, { style: label }, "Thickness"),
        React.createElement(Choice, {
          value: storage[widthKey],
          options: [
            { value: "theme", label: "Theme" },
            { value: 1, label: "1" },
            { value: 2, label: "2" },
            { value: 3, label: "3" },
          ],
          onChange: value => set(widthKey, value),
        }),

        React.createElement(RN.Text, { style: label }, "Glow strength"),
        React.createElement(Choice, {
          value: storage[glowKey],
          options: [
            { value: "theme", label: "Theme" },
            { value: 1, label: "Soft" },
            { value: 2, label: "Medium" },
            { value: 3, label: "Strong" },
          ],
          onChange: value => set(glowKey, value),
        }),
      );
    }

    const activeThemeText = theme
      ? `${theme.data?.name ?? "Unnamed theme"}${themeCfg.hasMetadata ? " • Toolkit metadata" : " • automatic mapping"}`
      : "No custom theme active • automatic styling is off";

    return React.createElement(RN.ScrollView, { contentContainerStyle: page },
      React.createElement(RN.View, { style: card },
        React.createElement(RN.Text, { style: title }, "Theme Toolkit v0.3"),
        React.createElement(RN.Text, { style: text }, activeThemeText),
        React.createElement(RN.Text, { style: text },
          "No theme + untouched settings = no visual changes. Your explicit Toolkit choices work with stock Discord, your themes, or third-party themes."
        ),
      ),

      React.createElement(RN.View, { style: card },
        React.createElement(RN.Text, { style: title }, "Folder colors"),
        React.createElement(Choice, {
          value: storage.folderColorSource,
          options: [
            { value: "theme", label: "Theme / Auto" },
            { value: "toolkit", label: "Toolkit" },
            { value: "discord", label: "Discord" },
          ],
          onChange: value => set("folderColorSource", value),
        }),
      ),

      React.createElement(RN.View, { style: card },
        React.createElement(RN.Text, { style: title }, "Collapsed folder cover"),
        React.createElement(Choice, {
          value: storage.folderCoverMode,
          options: [
            { value: "theme", label: "Theme / Auto" },
            { value: "preview", label: "Server previews" },
            { value: "folder", label: "Folder icon" },
          ],
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
        React.createElement(RN.Text, { style: text },
          "Clears Discord's saved folder colors back to true null/default. Folder names and contents are unchanged."
        ),
        React.createElement(RN.Pressable, {
          onPress() {
            RN.Alert.alert(
              "Reset all folder colors?",
              "Every server folder will return to Discord's true default color.",
              [
                { text: "Cancel", style: "cancel" },
                { text: "Reset", style: "destructive", onPress: () => void resetAllDiscordFolderColors() },
              ],
            );
          },
          style: {
            paddingVertical: 10,
            paddingHorizontal: 12,
            borderRadius: 8,
            borderWidth: 1,
            borderColor: "#ED4245",
            alignSelf: "flex-start",
          },
        }, React.createElement(RN.Text, {
          style: { color: "#FF6B6B", fontWeight: "700" },
        }, "Reset all folder colors to default")),
      ),
    );
  }

  return {
    onLoad() {
      unpatchFolder = patchFolderRenderer();
      unpatchFolderBG = patchExpandedFolderBackground();
    },
    onUnload() {
      try { unpatchFolder?.(); } catch {}
      try { unpatchFolderBG?.(); } catch {}
      unpatchFolder = null;
      unpatchFolderBG = null;
    },
    settings: Settings,
  };
})();