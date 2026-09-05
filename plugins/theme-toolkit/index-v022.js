(() => {
  "use strict";

  const { after } = vendetta.patcher;
  const { findByProps } = vendetta.metro;
  const { React, ReactNative: RN } = vendetta.metro.common;
  const storage = vendetta.plugin.storage;
  const findInReactTree = vendetta.utils?.findInReactTree;
  const showToast = vendetta.ui?.toasts?.showToast;
  const getAssetIDByName = vendetta.ui?.assets?.getAssetIDByName;

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

  // Empty strings mean "unset" inside plugin storage. We deliberately avoid
  // writing null into plugin storage because some Vendetta-compatible storage
  // backends are stricter about null values during plugin initialization.
  const DEFAULTS = {
    folderColorSource: "theme", // theme | toolkit | discord
    folderCoverMode: "theme",   // theme | preview | folder
    folderBackground: "",
    folderAccent: "",

    closedOutlineEnabled: true,
    closedOutlineColorMode: "theme", // theme | custom
    closedOutlineColor: "",
    closedOutlinePattern: "theme",   // theme | solid | dashed | dotted | segmented
    closedOutlineWidth: "theme",     // theme | 1 | 2 | 3

    openOutlineEnabled: true,
    openOutlineColorMode: "theme",
    openOutlineColor: "",
    openOutlinePattern: "theme",
    openOutlineWidth: "theme",
  };

  // Migrate old v0.1/v0.2 values without making a no-theme install visually active.
  try {
    if (storage.closedOutlineEnabled == null && storage.folderOutline != null) {
      storage.closedOutlineEnabled = !!storage.folderOutline;
    }
    if (storage.openOutlineEnabled == null && storage.folderOutline != null) {
      storage.openOutlineEnabled = !!storage.folderOutline;
    }
    if (storage.closedOutlineWidth == null && storage.folderBorderWidth != null) {
      storage.closedOutlineWidth = Math.max(1, Math.min(3, Number(storage.folderBorderWidth) || 1));
    }
    if (storage.openOutlineWidth == null && storage.folderBorderWidth != null) {
      storage.openOutlineWidth = Math.max(1, Math.min(3, Number(storage.folderBorderWidth) || 1));
    }

    if (!storage.neutralNoThemeDefaultsV022) {
      if (String(storage.folderBackground ?? "").toUpperCase() === "#000000") storage.folderBackground = "";
      if (String(storage.folderAccent ?? "").toUpperCase() === "#FFFFFF") storage.folderAccent = "";
      if (String(storage.closedOutlineColor ?? "").toUpperCase() === "#FFFFFF") storage.closedOutlineColor = "";
      if (String(storage.openOutlineColor ?? "").toUpperCase() === "#FFFFFF") storage.openOutlineColor = "";
      if (storage.closedOutlineColorMode === "custom" && !String(storage.closedOutlineColor ?? "").trim()) {
        storage.closedOutlineColorMode = "theme";
      }
      if (storage.openOutlineColorMode === "custom" && !String(storage.openOutlineColor ?? "").trim()) {
        storage.openOutlineColorMode = "theme";
      }
      storage.neutralNoThemeDefaultsV022 = true;
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
    return ["solid", "dashed", "dotted", "segmented"].includes(value)
      ? value
      : fallback;
  }

  function normalizeWidth(value, fallback = 1) {
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
    return { enabled: false, color: null, width: 1, pattern: "solid" };
  }

  function themeOutlineConfig(extra, state, fallbackColor) {
    const specific = extra?.[state] ?? {};
    return {
      enabled: specific.outline !== false && specific.outlineEnabled !== false,
      color: colorValue(specific.outlineColor)
        ?? colorValue(specific.border)
        ?? colorValue(extra?.border)
        ?? fallbackColor,
      width: normalizeWidth(
        specific.outlineWidth ?? specific.borderWidth ?? extra?.borderWidth,
        1,
      ),
      pattern: normalizePattern(
        specific.outlinePattern ?? specific.pattern ?? extra?.pattern,
        "solid",
      ),
    };
  }

  function themeFolderConfig() {
    const theme = currentTheme();
    const data = theme?.data ?? null;

    // Critical default: no active theme means no automatic visual changes.
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

  function effectiveOutline(themeOutline, state, hasTheme) {
    const prefix = state === "open" ? "open" : "closed";
    const enabledSetting = !!storage[`${prefix}OutlineEnabled`];
    const colorMode = storage[`${prefix}OutlineColorMode`];
    const requestedPattern = storage[`${prefix}OutlinePattern`];
    const requestedWidth = storage[`${prefix}OutlineWidth`];
    const customColor = colorValue(storage[`${prefix}OutlineColor`]);

    const color = colorMode === "custom"
      ? customColor
      : (hasTheme ? themeOutline.color : null);

    const enabled = colorMode === "custom"
      ? enabledSetting && !!customColor
      : enabledSetting && hasTheme && themeOutline.enabled !== false && !!themeOutline.color;

    return {
      enabled,
      color,
      pattern: requestedPattern === "theme"
        ? (hasTheme ? themeOutline.pattern : "solid")
        : normalizePattern(requestedPattern, hasTheme ? themeOutline.pattern : "solid"),
      width: requestedWidth === "theme"
        ? (hasTheme ? themeOutline.width : 1)
        : normalizeWidth(requestedWidth, hasTheme ? themeOutline.width : 1),
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
    return flat.borderRadius
      ?? flat.borderTopLeftRadius
      ?? flat.borderTopRightRadius
      ?? fallback;
  }

  function segmentedOutline(outline, radius, key) {
    const w = outline.width;
    const color = outline.color;
    const segments = [
      { top: 0, left: "10%", width: "31%", height: w },
      { top: 0, right: "10%", width: "31%", height: w },
      { bottom: 0, left: "10%", width: "31%", height: w },
      { bottom: 0, right: "10%", width: "31%", height: w },
      { left: 0, top: "10%", width: w, height: "31%" },
      { left: 0, bottom: "10%", width: w, height: "31%" },
      { right: 0, top: "10%", width: w, height: "31%" },
      { right: 0, bottom: "10%", width: w, height: "31%" },
    ];

    return React.createElement(RN.View, {
      key,
      pointerEvents: "none",
      style: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0, borderRadius: radius },
    }, segments.map((style, index) => React.createElement(RN.View, {
      key: `seg-${index}`,
      pointerEvents: "none",
      style: [
        { position: "absolute", backgroundColor: color, borderRadius: Math.max(1, w) },
        style,
      ],
    })));
  }

  function outlineOverlay(outline, baseStyle, key, fallbackRadius) {
    if (!outline?.enabled || !outline?.color || outline.width <= 0) return null;
    const radius = radiusFor(baseStyle, fallbackRadius);

    if (outline.pattern === "segmented") {
      return segmentedOutline(outline, radius, key);
    }

    return React.createElement(RN.View, {
      key,
      pointerEvents: "none",
      style: {
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        borderWidth: outline.width,
        borderColor: outline.color,
        borderStyle: outline.pattern,
        borderRadius: radius,
      },
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

      return React.createElement(RN.View, { style: card },
        React.createElement(RN.View, {
          style: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12 },
        },
          React.createElement(RN.View, { style: { flex: 1 } },
            React.createElement(RN.Text, { style: title }, `${stateName} folder outline`),
            React.createElement(RN.Text, { style: text },
              `Independent settings while the folder is ${prefix === "closed" ? "collapsed" : "expanded"}.`,
            ),
          ),
          React.createElement(RN.Switch, {
            value: !!storage[enabledKey],
            onValueChange: value => set(enabledKey, value),
          }),
        ),
        React.createElement(RN.Text, { style: label }, "Color source"),
        React.createElement(Choice, {
          value: storage[modeKey],
          options: [
            { value: "theme", label: "Theme / Auto" },
            { value: "custom", label: "Custom" },
          ],
          onChange: value => set(modeKey, value),
        }),
        storage[modeKey] === "custom"
          ? React.createElement(ColorInput, { labelText: "Outline color", storageKey: colorKey })
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
      );
    }

    const activeThemeText = theme
      ? `${theme.data?.name ?? "Unnamed theme"}${themeCfg.hasMetadata ? " • Toolkit metadata" : " • automatic mapping"}`
      : "No custom theme active • automatic styling is off";

    return React.createElement(RN.ScrollView, { contentContainerStyle: page },
      React.createElement(RN.View, { style: card },
        React.createElement(RN.Text, { style: title }, "Theme Toolkit v0.2.2"),
        React.createElement(RN.Text, { style: text }, activeThemeText),
        React.createElement(RN.Text, { style: text },
          "No theme + untouched settings = no visual changes. Theme / Auto only becomes active when a theme is actually selected."
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
