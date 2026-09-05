(() => {
  "use strict";

  const { after } = vendetta.patcher;
  const { findByProps } = vendetta.metro;
  const { React, ReactNative: RN } = vendetta.metro.common;
  const storage = vendetta.plugin.storage;
  const findInReactTree = vendetta.utils?.findInReactTree;
  const showToast = vendetta.ui?.toasts?.showToast;
  const getAssetIDByName = vendetta.ui?.assets?.getAssetIDByName;

  // v0.1: folder theming + true Discord folder-color reset.
  // Later sections will build on this same plugin: mentions, icons, wallpapers,
  // fonts and other theme helpers.

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
    folderColorSource: "theme", // theme | toolkit | discord
    folderCoverMode: "theme",   // theme | preview | folder
    folderOutline: true,
    folderBackground: "#000000",
    folderAccent: "#FFFFFF",
    folderBorder: "#FFFFFF",
    folderBorderWidth: 1,
  };

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

    const border = colorValue(extra.border) ?? accent;
    const borderWidth = Number.isFinite(Number(extra.borderWidth))
      ? Math.max(0, Math.min(4, Number(extra.borderWidth)))
      : 1;

    return {
      background,
      accent,
      border,
      borderWidth,
      cover: extra.cover === "folder" ? "folder" : "preview",
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

  function effectiveFolderConfig(folder) {
    const theme = themeFolderConfig();
    const source = storage.folderColorSource;

    let background = null;
    let accent = null;
    let border = null;
    let borderWidth = 0;

    if (source === "theme") {
      background = theme.background;
      accent = theme.accent;
      border = theme.border;
      borderWidth = theme.borderWidth;
    } else if (source === "toolkit") {
      background = colorValue(storage.folderBackground) ?? DEFAULTS.folderBackground;
      accent = colorValue(storage.folderAccent) ?? DEFAULTS.folderAccent;
      border = colorValue(storage.folderBorder) ?? DEFAULTS.folderBorder;
      borderWidth = Math.max(0, Math.min(4, Number(storage.folderBorderWidth) || 1));
    } else {
      // Discord mode leaves its chosen fill/tint untouched. Accent is only
      // needed if the user explicitly chooses the folder-icon cover.
      accent = discordFolderColor(folder) ?? theme.accent;
      border = colorValue(storage.folderBorder) ?? theme.border;
      borderWidth = 1;
    }

    const requestedCover = storage.folderCoverMode;
    const cover = requestedCover === "theme" ? theme.cover : requestedCover;

    if (!storage.folderOutline) borderWidth = 0;

    return {
      source,
      cover: cover === "folder" ? "folder" : "preview",
      background,
      accent,
      border,
      borderWidth,
    };
  }

  function applyOutlineStyle(base, cfg, includeBackground) {
    const override = {};

    if (includeBackground && cfg.source !== "discord" && cfg.background) {
      override.backgroundColor = cfg.background;
    }

    if (cfg.borderWidth > 0 && cfg.border) {
      override.borderWidth = cfg.borderWidth;
      override.borderColor = cfg.border;
    }

    if (Object.keys(override).length === 0) return base;
    return [base, override];
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

          // Expanded folder icon: use Toolkit/theme accent instead of Discord's
          // stored folder color. In Discord mode, preserve Discord's tint.
          if (expanded && item?.type === "icon" && cfg.source !== "discord") {
            item.tintStyle = [item.tintStyle, { tintColor: cfg.accent }];
          }

          // Optional collapsed cover: replace the 2x2 preview with Discord's
          // own folder icon renderer. The default/theme setting stays preview
          // for AMOLED Monochrome.
          if (!expanded && cfg.cover === "folder") {
            transition.props.items = [{
              type: "icon",
              tintStyle: { tintColor: cfg.accent },
            }];
          }

          // Discord's wrapChildren callback creates the actual 48x48 collapsed
          // folder tile. Wrap it so we can independently style that tile
          // without changing the expanded folder icon tint.
          const originalWrap = transition.props.wrapChildren;
          transition.props.wrapChildren = child => {
            const wrapped = originalWrap(child);
            try {
              const tile = wrapped?.props?.children?.[0];
              if (tile?.props) {
                tile.props.style = applyOutlineStyle(tile.props.style, cfg, true);
              }
            } catch {}
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
            result.props.style = applyOutlineStyle(result.props.style, cfg, true);
          }
        } catch (error) {
          try { console.error("[ThemeToolkit] expanded folder patch failed", error); } catch {}
        }
        return result;
      });
    } catch {
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

    const changed = folders.filter(folder => folder?.folderColor != null).length;
    if (changed === 0) {
      toast("All folder colors are already at Discord default");
      return;
    }

    const next = folders.map(folder => ({ ...folder, folderColor: null }));

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

    const page = {
      padding: 16,
      gap: 14,
    };
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
          key: option.value,
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
          placeholder: "#FFFFFF",
          placeholderTextColor: "#6D6F78",
          onChangeText(value) {
            storage[storageKey] = value;
            forceUpdate();
          },
          onEndEditing() {
            const valid = colorValue(storage[storageKey]);
            if (valid) storage[storageKey] = valid;
            else storage[storageKey] = DEFAULTS[storageKey];
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

    const activeThemeText = theme
      ? `${theme.data?.name ?? "Unnamed theme"}${themeCfg.hasMetadata ? " • Toolkit metadata detected" : " • automatic fallback"}`
      : "No custom Revenge theme is currently selected";

    return React.createElement(RN.ScrollView, {
      contentContainerStyle: page,
    },
      React.createElement(RN.View, { style: card },
        React.createElement(RN.Text, { style: title }, "Theme Toolkit v0.1"),
        React.createElement(RN.Text, { style: text }, activeThemeText),
        React.createElement(RN.Text, { style: text },
          "First foundation build: folder appearance, theme-aware folder metadata, and true Discord folder-color resets. Mentions, icon replacements and wallpapers come next."
        ),
      ),

      React.createElement(RN.View, { style: card },
        React.createElement(RN.Text, { style: title }, "Folder colors"),
        React.createElement(RN.Text, { style: text },
          "Theme ignores Discord's saved folder colors and follows the active theme. Toolkit uses your colors below. Discord leaves its own selected folder colors alone."
        ),
        React.createElement(Choice, {
          value: storage.folderColorSource,
          options: [
            { value: "theme", label: "Theme" },
            { value: "toolkit", label: "Toolkit" },
            { value: "discord", label: "Discord" },
          ],
          onChange: value => set("folderColorSource", value),
        }),
      ),

      React.createElement(RN.View, { style: card },
        React.createElement(RN.Text, { style: title }, "Collapsed folder cover"),
        React.createElement(RN.Text, { style: text },
          "Theme follows the active theme's preference. Server previews keeps Discord's normal little server icons. Folder icon replaces the preview with a folder."
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

      React.createElement(RN.View, { style: card },
        React.createElement(RN.View, {
          style: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12 },
        },
          React.createElement(RN.View, { style: { flex: 1 } },
            React.createElement(RN.Text, { style: label }, "Folder outline"),
            React.createElement(RN.Text, { style: text }, "Adds the thin outline around collapsed and expanded folders."),
          ),
          React.createElement(RN.Switch, {
            value: !!storage.folderOutline,
            onValueChange: value => set("folderOutline", value),
          }),
        ),
      ),

      React.createElement(RN.View, { style: card },
        React.createElement(RN.Text, { style: title }, "Toolkit folder palette"),
        React.createElement(RN.Text, { style: text }, "Used when Folder colors is set to Toolkit."),
        React.createElement(ColorInput, { labelText: "Background", storageKey: "folderBackground" }),
        React.createElement(ColorInput, { labelText: "Icon / accent", storageKey: "folderAccent" }),
        React.createElement(ColorInput, { labelText: "Outline", storageKey: "folderBorder" }),
      ),

      React.createElement(RN.View, { style: card },
        React.createElement(RN.Text, { style: title }, "Discord folder reset"),
        React.createElement(RN.Text, { style: text },
          "This really clears Discord's saved folderColor values back to null. It is different from merely making the folders look like the theme default."
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
