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

  const GuildFolderModule = (() => { try { return findByProps("GuildsBarGuildFolderBG"); } catch { return null; } })();
  const FolderStore = (() => { try { return findByProps("getGuildFolders", "getGuildFolderById"); } catch { return null; } })();
  const FolderActions = (() => { try { return findByProps("saveGuildFolders"); } catch { return null; } })();
  const ColorUtils = (() => { try { return findByProps("int2hex", "hex2int"); } catch { return null; } })();
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
  };

  for (const [key, value] of Object.entries(DEFAULTS)) {
    try { if (storage[key] == null) storage[key] = value; } catch {}
  }

  let unpatchFolder = null;
  let unpatchFolderBG = null;
  const visualSubscribers = new Set();
  const colorSubscribers = new Set();
  let colorTimer = null;

  function toast(text) { try { showToast?.(text, toolkitIcon); } catch {} }
  function notifyVisuals() { for (const fn of [...visualSubscribers]) { try { fn(); } catch {} } }
  function useToolkitRevision() {
    const [, bump] = React.useReducer(v => v + 1, 0);
    React.useEffect(() => {
      visualSubscribers.add(bump);
      return () => visualSubscribers.delete(bump);
    }, []);
  }
  function refreshFolderUI() {
    notifyVisuals();
    try { FolderStore?.emitChange?.(); } catch {}
  }
  function ensureColorTimer() {
    if (colorTimer || !colorSubscribers.size) return;
    colorTimer = setInterval(() => {
      const now = Date.now();
      for (const fn of [...colorSubscribers]) { try { fn(now); } catch {} }
    }, 110);
  }
  function stopColorTimerIfIdle() {
    if (colorSubscribers.size || !colorTimer) return;
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
  function animatedCycleColor(phase, colors, offset = 0) {
    if (!phase?.interpolate) return gradientAt(colors, offset);
    const steps = Math.max(6, Math.min(16, colors.length));
    const inputRange = Array.from({ length: steps + 1 }, (_, i) => i / steps);
    const outputRange = inputRange.map(step => gradientAt(colors, offset + step));
    try { return phase.interpolate({ inputRange, outputRange }); } catch { return outputRange[0]; }
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
    for (let i = 0; i < count; i++) {
      const p = `${i * cell}%`;
      const s = `${size}%`;
      pushTop(p, s); pushRight(p, s); pushBottom(p, s); pushLeft(p, s);
    }
    return items;
  }
  function marqueeOpacity(phase, index, count) {
    if (!phase?.interpolate || count <= 1) return 1;
    const center = index / count;
    const half = Math.max(0.045, 2 / count);
    const points = [0, Math.max(0, center - half), center, Math.min(1, center + half), 1].filter((v, i, arr) => i === 0 || v > arr[i - 1]);
    const values = points.map(v => Math.abs(v - center) < 0.0001 ? 1 : 0.12);
    try { return phase.interpolate({ inputRange: points, outputRange: values, extrapolate: "clamp" }); } catch { return 1; }
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
  function pathTransform(phase, width, height, radius, offset) {
    const samples = 96;
    const inputRange = Array.from({ length: samples + 1 }, (_, i) => i / samples);
    const points = inputRange.map(t => roundedRectPoint(t - offset, width, height, radius));
    try {
      return {
        x: phase.interpolate({ inputRange, outputRange: points.map(p => p.x), extrapolate: "clamp" }),
        y: phase.interpolate({ inputRange, outputRange: points.map(p => p.y), extrapolate: "clamp" }),
      };
    } catch { return { x: 0, y: 0 }; }
  }
  function trailSpan(trail) {
    if (trail === "short") return 0.25;
    if (trail === "long") return 0.85;
    return 0.50;
  }
  function trailCount(trail, width, height, radius, dot, pattern) {
    const minimum = trail === "short" ? 10 : trail === "long" ? 30 : 18;
    if (!(width > 0) || !(height > 0)) return minimum;
    const span = trailSpan(trail);
    const perimeter = roundedRectPerimeter(width, height, radius);
    const spacingFactor = pattern === "solid" ? 0.58 : pattern === "dotted" ? 1.45 : 1.0;
    const spacing = Math.max(1.5, dot * spacingFactor);
    const desired = Math.ceil((perimeter * span) / spacing) + 1;
    const maximum = pattern === "solid" ? 130 : 72;
    return Math.max(minimum, Math.min(maximum, desired));
  }
  function useChaseColor(palette, speed) {
    const dynamic = palette.length > 1;
    const [now, setNow] = React.useState(Date.now());
    const key = palette.join(",");
    React.useEffect(() => {
      if (!dynamic) return undefined;
      const fn = value => setNow(value);
      colorSubscribers.add(fn);
      ensureColorTimer();
      return () => {
        colorSubscribers.delete(fn);
        stopColorTimerIfIdle();
      };
    }, [dynamic, key]);
    if (!dynamic) return palette[0] ?? "#FFFFFF";
    const duration = Math.max(1500, Math.round(speedMs(speed) * 1.45));
    return gradientAt(palette, (now % duration) / duration);
  }
  function ChaseDot({ motionPhase, width, height, radius, offset, dot, opacity, scale, color, halo, haloOpacity, head }) {
    const motion = React.useMemo(
      () => pathTransform(motionPhase, width, height, radius, offset),
      [motionPhase, width, height, radius, offset],
    );
    const Wrapper = Animated?.View ?? RN.View;
    return React.createElement(Wrapper, {
      pointerEvents: "none",
      style: {
        position: "absolute",
        left: -dot / 2,
        top: -dot / 2,
        width: dot,
        height: dot,
        borderRadius: dot,
        backgroundColor: color,
        opacity,
        transform: [{ translateX: motion.x }, { translateY: motion.y }, { scale }],
      },
    },
      React.createElement(RN.View, {
        pointerEvents: "none",
        style: {
          position: "absolute", top: -halo, left: -halo, right: -halo, bottom: -halo,
          borderRadius: dot + halo * 2, backgroundColor: color, opacity: haloOpacity,
        },
      }),
      head ? React.createElement(RN.View, {
        pointerEvents: "none",
        style: {
          position: "absolute", top: dot * 0.34, left: dot * 0.34,
          width: dot * 0.32, height: dot * 0.32, borderRadius: dot,
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
    const motionRef = React.useRef(null);
    if (!motionRef.current && Animated?.Value) motionRef.current = new Animated.Value(0);
    const motionPhase = motionRef.current;
    const palette = chasePalette(outline);
    const chaseColor = useChaseColor(palette, outline.speed);

    React.useEffect(() => {
      if (!motionPhase || !Animated?.timing || !Animated?.loop) return undefined;
      try { motionPhase.stopAnimation?.(); motionPhase.setValue?.(0); } catch {}
      const loop = Animated.loop(Animated.timing(motionPhase, {
        toValue: 1,
        duration: speedMs(outline.speed),
        easing: Easing?.linear,
        useNativeDriver: true,
        isInteraction: false,
      }));
      try { loop.start(); } catch {}
      return () => { try { loop.stop?.(); } catch {} try { motionPhase.stopAnimation?.(); } catch {} };
    }, [outline.speed]);

    const radius = Math.max(0, Math.min(radiusFor(baseStyle, fallbackRadius), size.width / 2 || fallbackRadius, size.height / 2 || fallbackRadius));
    const dot = Math.max(4.6, outline.width * 2.6);
    const span = trailSpan(outline.trail);
    const count = trailCount(outline.trail, size.width, size.height, radius, dot, outline.pattern);
    const baseOpacity = outline.brightness === "max" ? 0.14 : outline.brightness === "bright" ? 0.09 : 0.05;
    const headHalo = outline.brightness === "max" ? 8 : outline.brightness === "bright" ? 6 : 4;
    const dots = [];

    if (size.width > 0 && size.height > 0 && motionPhase) {
      for (let i = count - 1; i >= 0; i--) {
        const frac = count <= 1 ? 0 : i / (count - 1);
        const offset = frac * span;
        const opacity = i === 0 ? 1 : Math.max(0.12, Math.pow(1 - frac, 0.88) * 0.92);
        const minScale = outline.pattern === "solid" ? 0.62 : 0.42;
        const scale = i === 0 ? 1.58 : Math.max(minScale, 1 - frac * (outline.pattern === "solid" ? 0.38 : 0.55));
        const halo = i === 0 ? headHalo : Math.max(0.7, headHalo * (1 - frac) * 0.5);
        const haloOpacity = i === 0 ? 0.54 : Math.max(0.035, 0.22 * (1 - frac));
        dots.push(React.createElement(ChaseDot, {
          key: `tt-chase-${i}`,
          motionPhase,
          width: size.width,
          height: size.height,
          radius,
          offset,
          dot,
          opacity,
          scale,
          color: chaseColor,
          halo,
          haloOpacity,
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

  function brightnessHalo(outline, color, radius, phase) {
    if (outline.brightness === "normal" && outline.animation !== "glow") return null;
    const maxMode = outline.brightness === "max";
    const extra = maxMode ? 4 : 2;
    let opacity = maxMode ? 0.46 : 0.26;
    if (outline.animation === "glow" && phase?.interpolate) {
      opacity = phase.interpolate({ inputRange: [0, 0.5, 1], outputRange: maxMode ? [0.22, 0.72, 0.22] : [0.12, 0.52, 0.12] });
    }
    const Wrapper = Animated?.View ?? RN.View;
    return React.createElement(Wrapper, {
      key: "brightness-halo", pointerEvents: "none",
      style: { position: "absolute", top: -extra, left: -extra, right: -extra, bottom: -extra, borderRadius: radius + extra, borderWidth: outline.width + extra, borderColor: color, opacity },
    });
  }

  function OutlineVisual({ folder, state, baseStyle, fallbackRadius }) {
    useToolkitRevision();
    const cfg = effectiveFolderConfig(folder);
    const outline = state === "open" ? cfg.openOutline : cfg.closedOutline;
    if (!outline?.enabled) return null;
    const radius = radiusFor(baseStyle, fallbackRadius);
    if (outline.animation === "chase") return React.createElement(ChaseVisual, { outline, baseStyle, fallbackRadius });

    const phaseRef = React.useRef(null);
    if (!phaseRef.current && Animated?.Value) phaseRef.current = new Animated.Value(0);
    const phase = phaseRef.current;
    const dynamicColor = ["rgb", "rainbow", "spectrum"].includes(outline.colorMode);
    const needsMotion = dynamicColor || outline.animation !== "none" || (outline.colorMode === "gradient" && outline.animation === "spin");
    React.useEffect(() => {
      if (!needsMotion || !phase || !Animated?.timing || !Animated?.loop) return undefined;
      try { phase.stopAnimation?.(); phase.setValue?.(0); } catch {}
      const loop = Animated.loop(Animated.timing(phase, {
        toValue: 1, duration: speedMs(outline.speed), easing: Easing?.linear, useNativeDriver: false, isInteraction: false,
      }));
      try { loop.start(); } catch {}
      return () => { try { loop.stop?.(); } catch {} try { phase.stopAnimation?.(); } catch {} };
    }, [needsMotion, outline.speed, outline.animation, outline.colorMode]);

    const modeColors = outline.colorMode === "rgb" ? RGB_RING
      : outline.colorMode === "rainbow" ? RAINBOW_RING
      : outline.colorMode === "spectrum" ? FULL_SPECTRUM
      : outline.gradient;
    const baseColor = outline.colorMode === "spectrum" ? animatedCycleColor(phase, FULL_SPECTRUM, 0)
      : outline.colorMode === "rgb" ? animatedCycleColor(phase, RGB_RING, 0)
      : outline.colorMode === "rainbow" ? animatedCycleColor(phase, RAINBOW_RING, 0)
      : outline.colorMode === "gradient" ? (outline.animation === "spin" ? animatedCycleColor(phase, outline.gradient, 0) : gradientAt(outline.gradient, 0))
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
        if (outline.colorMode === "rgb") segmentColor = animatedCycleColor(phase, RGB_RING, offset);
        else if (outline.colorMode === "rainbow") segmentColor = animatedCycleColor(phase, RAINBOW_RING, offset);
        else if (outline.colorMode === "gradient") segmentColor = outline.animation === "spin" ? animatedCycleColor(phase, modeColors, offset) : gradientAt(modeColors, offset);
        else if (outline.colorMode === "spectrum") segmentColor = animatedCycleColor(phase, FULL_SPECTRUM, 0);
        const segmentOpacity = outline.animation === "marquee" ? marqueeOpacity(phase, index, segments.length) : 1;
        return React.createElement(Wrapper, {
          key: `tt-seg-${index}`, pointerEvents: "none",
          style: [{ position: "absolute", backgroundColor: segmentColor, opacity: segmentOpacity, borderRadius: style.borderRadius ?? Math.max(1, outline.width) }, style],
        });
      }),
    );
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
          const folder = args?.[0]?.id ?? args?.[0]?.folder ?? args?.[0];
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
    function set(key, value) { storage[key] = value; forceUpdate(); refreshFolderUI(); }
    function Choice({ value, options, onChange }) {
      return React.createElement(RN.View, { style: { flexDirection: "row", gap: 6, flexWrap: "wrap" } }, options.map(option => {
        const active = value === option.value;
        return React.createElement(RN.Pressable, {
          key: String(option.value), onPress: () => onChange(option.value),
          style: { paddingVertical: 8, paddingHorizontal: 11, borderRadius: 8, borderWidth: 1, borderColor: active ? "#FFFFFF" : "#4E5058", backgroundColor: active ? "#FFFFFF18" : "#00000000" },
        }, React.createElement(RN.Text, { style: { color: "#F2F3F5", fontWeight: active ? "700" : "500" } }, option.label));
      }));
    }
    function ColorInput({ labelText, storageKey }) {
      return React.createElement(RN.View, { style: { gap: 6 } },
        React.createElement(RN.Text, { style: label }, labelText),
        React.createElement(RN.TextInput, {
          value: String(storage[storageKey] ?? ""), autoCapitalize: "characters", autoCorrect: false,
          placeholder: "Unset", placeholderTextColor: "#6D6F78",
          onChangeText(value) { storage[storageKey] = value; forceUpdate(); },
          onEndEditing() {
            const raw = String(storage[storageKey] ?? "").trim();
            storage[storageKey] = raw ? (colorValue(raw) ?? "") : "";
            forceUpdate(); refreshFolderUI();
          },
          style: { color: "#FFFFFF", backgroundColor: "#000000", borderWidth: 1, borderColor: "#4E5058", borderRadius: 8, paddingHorizontal: 10, paddingVertical: 8 },
        }),
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
        React.createElement(RN.Text, { style: text }, "Chase = one smooth glowing orb with a fading tail. Solid Chase now keeps the tail visually continuous even on tall expanded folders."),
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
        React.createElement(RN.Text, { style: title }, "Theme Toolkit v0.3.7"),
        React.createElement(RN.Text, { style: text }, activeThemeText),
        React.createElement(RN.Text, { style: text }, "Chase tail density now scales with the actual folder perimeter, so Solid stays continuous on expanded folders instead of turning into widely spaced dots."),
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
      unpatchFolder = patchFolderRenderer();
      unpatchFolderBG = patchExpandedFolderBackground();
    },
    onUnload() {
      try { unpatchFolder?.(); } catch {}
      try { unpatchFolderBG?.(); } catch {}
      unpatchFolder = null;
      unpatchFolderBG = null;
      visualSubscribers.clear();
      colorSubscribers.clear();
      if (colorTimer) { clearInterval(colorTimer); colorTimer = null; }
    },
    settings: Settings,
  };
})();