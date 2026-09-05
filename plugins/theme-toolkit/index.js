(() => {
  "use strict";

  const { after } = vendetta.patcher;
  const { findByProps } = vendetta.metro;
  const { React, ReactNative: RN } = vendetta.metro.common;
  const storage = vendetta.plugin.storage;
  const findInReactTree = vendetta.utils?.findInReactTree;
  const showToast = vendetta.ui?.toasts?.showToast;
  const getAssetIDByName = vendetta.ui?.assets?.getAssetIDByName;

  // v0.2: clean independent closed/open folder outlines.
  // Animation/color engines (pulse, glow, chase, RGB, gradients) come next
  // after this outline layer is confirmed stable on-device.

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
    // Theme mode still means Theme Toolkit is in control: it reads the active
    // theme when one exists, then visually applies those values itself.
    // With no theme active it falls back to the Toolkit defaults below.
    folderColorSource: "theme", // theme | toolkit | discord
    folderCoverMode: "theme",   // theme | preview | folder

    folderBackground: "#000000",
    folderAccent: "#FFFFFF",

    closedOutlineEnabled: true,
    closedOutlineColorMode: "theme", // theme | custom (rgb/gradient later)
    closedOutlineColor: "#FFFFFF",
    closedOutlinePattern: "theme",   // theme | solid | dashed | dotted | segmented
    closedOutlineWidth: "theme",     // theme | 1 | 2 | 3

    openOutlineEnabled: true,
    openOutlineColorMode: "theme",
    openOutlineColor: "#FFFFFF",
    openOutlinePattern: "theme",
    openOutlineWidth: "theme",
  };

  // Migrate v0.1 settings so existing installs keep the same intent.
  if (storage.closedOutlineEnabled == null && storage.folderOutline != null) {
    storage.closedOutlineEnabled = !!storage.folderOutline;
  }
  if (storage.openOutlineEnabled == null && storage.folderOutline != null) {
    storage.openOutlineEnabled = !!storage.folderOutline;
  }
  if (storage.closedOutlineColor == null && storage.folderBorder != null) {
    storage.closedOutlineColor = storage.folderBorder;
    storage.closedOutlineColorMode = "custom";
  }
  if (storage.openOutlineColor == null && storage.folderBorder != null) {
    storage.openOutlineColor = storage.folderBorder;
    storage.openOutlineColorMode = "custom";
  }
  if (storage.closedOutlineWidth == null && storage.folderBorderWidth != null) {
    storage.closedOutlineWidth = Math.max(1, Math.min(3, Number(storage.folderBorderWidth) || 1));
  }
  if (storage.openOutlineWidth == null && storage.folderBorderWidth != null) {
    storage.openOutlineWidth = Math.max(1, Math.min(3, Number(storage.folderBorderWidth) || 1));
  }

  for (const [key, value] of Object.entries(DEFAULTS)) {
    if (storage[key] == null) storage[key] = value;
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
      const bunny = globalThis?.bunny ?? globalThis?.window?.bunny;
      return bunny?.themes?.getCurrentTheme?.() ?? null;
    } catch {
      return null;
    }
  }

  function currentThemeData() {
    return currentTheme()?.data ?? null;
  }

  function themeOutlineConfig(extra, state, fallbackColor) {
    const specific = extra?.[state] ?? {};
    const color = colorValue(specific.outlineColor)
      ?? colorValue(specific.border)
      ?? colorValue(extra?.border)
      ?? fallbackColor;
    const width = normalizeWidth(
      specific.outlineWidth ?? specific.borderWidth ?? extra?.borderWidth,
      1,
    );
    const pattern = normalizePattern(
      specific.outlinePattern ?? specific.pattern ?? extra?.pattern,
      "solid",
    );

    return {
      enabled: specific.outline !== false && specific.outlineEnabled !== false,
      color,
      width,
      pattern,
    };
  }

  function themeFolderConfig() {
    const data = currentThemeData() ?? {};
    const semantic = data.semanticColors ?? {};
    const raw = data.rawColors ?? {};
    const extra = data.themeToolkit?.folders ?? {};

    const background = colorValue(extra.background)
      ?? colorValue(semantic.GUILD_FOLDER_BACKGROUND)
      ?? colorValue(semantic.BACKGROUND_PRIMARY)
      ?? colorValue(semantic.BACKGROUND_BASE_LOWEST)
      ?? "#000000";

    const accent = colorValue(extra.accent)
      ?? colorValue(semantic.HEADER_PRIMARY)
      ?? colorValue(semantic.INTERACTIVE_ACTIVE)
      ?? colorValue(raw.WHITE_500)
      ?? colorValue(raw.BRAND_360)
      ?? "#FFFFFF";

    return {
      background,
      accent,
      cover: extra.cover === "folder" ? "folder" : "preview",
      closed: themeOutlineConfig(extra, "closed", accent),
      open: themeOutlineConfig(extra, "open", accent),
      hasMetadata: !!data.themeToolkit,
    };
  }

  function discordFolderColor(folder) {
    const value = folder?.color ?? folder?.folderColor;
    if (value == null) return null;

    try {
      const hex = ColorUtils?.int2hex?.(value);
      return colorValue(hex);
    } catch {}

    if (typeof value === "string") return colorValue(value);
    return null;
  }

  function effectiveOutline(themeOutline, state) {
    const prefix = state === "open" ? "open" : "closed";
    const enabled = !!storage[`${prefix}OutlineEnabled`];
    const colorMode = storage[`${prefix}OutlineColorMode`];
    const requestedPattern = storage[`${prefix}OutlinePattern`];
    const requestedWidth = storage[`${prefix}OutlineWidth`];

    return {
      enabled: enabled && themeOutline.enabled !== false,
      color: colorMode === "custom"
        ? (colorValue(storage[`${prefix}OutlineColor`]) ?? themeOutline.color)
        : themeOutline.color,
      pattern: requestedPattern === "theme"
        ? themeOutline.pattern
        : normalizePattern(requestedPattern, themeOutline.pattern),
      width: requestedWidth === "theme"
        ? themeOutline.width
        : normalizeWidth(requestedWidth, themeOutline.width),
    };
  }

  function effectiveFolderConfig(folder) {
    const theme = themeFolderConfig();
    const source = storage.folderColorSource;

    let background = null;
    let accent = null;

    if (source === "theme") {
      background = theme.background;
      accent = theme.accent;
    } else if (source === "toolkit") {
      background = colorValue(storage.folderBackground) ?? DEFAULTS.folderBackground;
      accent = colorValue(storage.folderAccent) ?? DEFAULTS.folderAccent;
    } else {
      // Discord mode leaves Discord's saved fill/tint untouched.
      accent = discordFolderColor(folder) ?? theme.accent;
    }

    const requestedCover = storage.folderCoverMode;
    const cover = requestedCover === "theme" ? theme.cover : requestedCover;

    return {
      source,
      cover: cover === "folder" ? "folder" : "preview",
      background,
      accent,
      closedOutline: effectiveOutline(theme.closed, "closed"),
      openOutline: effectiveOutline(theme.open, "open"),
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
    const horizontal = [
      { top: 0, left: "10%", width: "31%", height: w },
      { top: 0, right: "10%", width: "31%", height: w },
      { bottom: 0, left: "10%", width: "31%", height: w },
      { bottom: 0, right: "10%", width: "31%", height: w },
    ];
    const vertical = [
      { left: 0, top: "10%", width: w, height: "31%" },
      { left: 0, bottom: "10%", width: w, height: "31%" },
      { right: 0, top: "10%", width: w, height: "31%" },
      { right: 0, bottom: "10%", width: w, height: "31%" },
    ];

    return React.createElement(RN.View, {
      key,
      pointerEvents: "none",
      style: {
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        borderRadius: radius,
      },
    }, [...horizontal, ...vertical].map((style, index) => React.createElement(RN.View, {
      key: `seg-${index}`,
      pointerEvents: "none",
      style: [
        {
          position: "absolute",
          backgroundColor: color,
          borderRadius: Math.max(1, w),
        },
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

          // Expanded folder icon tint is independent from collapsed preview fill.
          if (expanded && item?.type === "icon" && cfg.source !== "discord") {
            item.tintStyle = [item.tintStyle, { tintColor: cfg.accent }];
          }

          // Optional collapsed cover replacement. Theme mode defaults to normal
          // server previews unless the active theme explicitly requests a folder.
          if (!expanded && cfg.cover === "folder") {
            transition.props.items = [{
              type: "icon",
              tintStyle: { tintColor: cfg.accent },
            }];
          }

          // The v0.1 border was applied to Discord's own preview tile and got
          // clipped by its layout. v0.2 adds a separate overlay child instead,
          // so solid/dashed/dotted/segmented outlines are clean and independent.
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
                const nextTile = React.cloneElement(tile, {
                  style: withBackground(tile.props.style, cfg),
                }, appendChild(tile.props.children, overlay));
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
            result = React.cloneElement(result, {
              style: withBackground(result.props.style, cfg),
            }, appendChild(result.props.children, overlay));
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
    const card = {
      backgroundColor: "#111214",
      borderRadius: 12,
      padding: 14,
      gap: 10,
    };
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

    function ColorInput({ labelText, storageKey, fallbackKey }) {
      return React.createElement(RN.View, { style: { gap: 6 } },
        React.createElement(RN.Text, { style: label }, labelText),
        React.createElement(RN.TextInput, {
          value: String(storage[storageKey] ?? ""),
          autoCapitalize: "characters",
          autoCorrect: false,
          placeholder: "#FFFFFF",
          placeholderTextColor: "#6D6F78",
          onChangeText(value) {
            storage[storageKey] = value;
            forceUpdate();
          },
          onEndEditing() {
            const valid = colorValue(storage[storageKey]);
            storage[storageKey] = valid ?? DEFAULTS[fallbackKey ?? storageKey] ?? "#FFFFFF";
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
              `Independent outline settings used while folders are ${prefix === "closed" ? "collapsed" : "expanded"}.`
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
      ? `${theme.data?.name ?? "Unnamed theme"}${themeCfg.hasMetadata ? " • Toolkit metadata detected" : " • automatic fallback"}`
      : "No custom Revenge theme selected • Toolkit fallback is active";

    return React.createElement(RN.ScrollView, {
      contentContainerStyle: page,
    },
      React.createElement(RN.View, { style: card },
        React.createElement(RN.Text, { style: title }, "Theme Toolkit v0.2"),
        React.createElement(RN.Text, { style: text }, activeThemeText),
        React.createElement(RN.Text, { style: text },
          "Toolkit takes visual control by default. Theme / Auto reads the active theme when available, works with third-party themes through automatic fallbacks, and uses Toolkit defaults when no theme is enabled."
        ),
      ),

      React.createElement(RN.View, { style: card },
        React.createElement(RN.Text, { style: title }, "Folder colors"),
        React.createElement(RN.Text, { style: text },
          "Theme / Auto lets Toolkit derive the look from the active theme and then apply it itself. Toolkit uses your palette below. Discord stops overriding folder fill/tint and uses Discord's saved folder colors instead."
        ),
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
        React.createElement(RN.Text, { style: text },
          "Theme follows the active theme preference. Server previews keeps Discord's normal 2x2 server icons. Folder icon replaces the preview with a folder icon."
        ),
        React.createElement(Choice, {
          value: storage.folderCoverMode,
          options: [
            { value: "theme", label: "Theme" },
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
        React.createElement(RN.Text, { style: text }, "Used when Folder colors is set to Toolkit."),
        React.createElement(ColorInput, { labelText: "Background", storageKey: "folderBackground" }),
        React.createElement(ColorInput, { labelText: "Folder icon / accent", storageKey: "folderAccent" }),
      ),

      React.createElement(RN.View, { style: card },
        React.createElement(RN.Text, { style: title }, "Animation engine — next"),
        React.createElement(RN.Text, { style: text },
          "Once the new outline layer is confirmed clean, the same separate Closed/Open sections will gain Pulse, Breathe, Glow, Chase, RGB cycle, and custom gradient modes with speed and glow controls."
        ),
      ),

      React.createElement(RN.View, { style: card },
        React.createElement(RN.Text, { style: title }, "Discord folder reset"),
        React.createElement(RN.Text, { style: text },
          "This clears Discord's saved folder colors back to true null/default. It does not change folder names or contents."
        ),
        React.createElement(RN.Pressable, {
          onPress() {
            RN.Alert.alert(
              "Reset all folder colors?",
              "Every server folder will return to Discord's true default color. Folder names and server contents are not changed.",
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