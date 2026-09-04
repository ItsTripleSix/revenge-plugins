(() => {
  "use strict";

  const { after, instead } = vendetta.patcher;
  const { find, findByName, findByProps } = vendetta.metro;
  const {
    React,
    ReactNative: RN,
    NavigationNative,
  } = vendetta.metro.common;
  const { getAssetIDByName } = vendetta.ui.assets;
  const { storage } = vendetta.plugin;

  const patches = [];
  const refreshListeners = new Set();

  const DEFAULT_VISIBLE_COLOR = "#B5BAC1";
  const DEFAULT_SILENT_COLOR = "#B5BAC1";
  const DEFAULT_SLASH_COLOR = "#F23F42";
  const DEFAULT_ALPHA = 255;
  const CONFIG_VERSION = 2;
  const SETTINGS_HOLD_MS = 1500;

  const Typing =
    findByProps("startTyping", "stopTyping")
    ?? findByProps("startTyping");

  const Toasts =
    vendetta.ui?.toasts
    ?? findByProps("showToast");

  const ActionSheet = findByProps("openLazy", "hideActionSheet");

  const CustomColorPickerActionSheet =
    findByName("CustomColorPickerActionSheet", false)
    ?? findByName("CustomColorPickerActionSheet");

  function clampByte(value, fallback = DEFAULT_ALPHA) {
    const parsed = Number.parseInt(value, 10);
    if (!Number.isFinite(parsed)) return fallback;
    return Math.max(0, Math.min(255, parsed));
  }

  function normalizeHex(value, fallback) {
    if (typeof value !== "string") return fallback;

    let hex = value.trim().replace(/^#/, "");
    if (/^[0-9a-fA-F]{3}$/.test(hex)) {
      hex = hex.split("").map(char => char + char).join("");
    }
    if (/^[0-9a-fA-F]{8}$/.test(hex)) hex = hex.slice(0, 6);
    if (!/^[0-9a-fA-F]{6}$/.test(hex)) return fallback;

    return `#${hex.toUpperCase()}`;
  }

  function colorWithAlpha(hex, alpha) {
    const normalized = normalizeHex(hex, "#FFFFFF");
    const r = Number.parseInt(normalized.slice(1, 3), 16);
    const g = Number.parseInt(normalized.slice(3, 5), 16);
    const b = Number.parseInt(normalized.slice(5, 7), 16);
    const a = clampByte(alpha) / 255;
    return `rgba(${r}, ${g}, ${b}, ${a})`;
  }

  function notifyRefresh() {
    for (const listener of refreshListeners) {
      try {
        listener();
      } catch {}
    }
  }

  function usePluginRefresh() {
    const [, forceRender] = React.useReducer(value => value + 1, 0);

    React.useEffect(() => {
      refreshListeners.add(forceRender);
      return () => refreshListeners.delete(forceRender);
    }, []);

    return forceRender;
  }

  function showStateToast(enabled) {
    if (storage.showToast === false) return;

    const text = enabled
      ? "Enabled Silent Typing — You are Now Invisible"
      : "Disabled Silent Typing — You are Now Visible";

    try {
      Toasts?.showToast?.(
        text,
        getAssetIDByName("KeyboardIcon") ?? getAssetIDByName("ChatIcon"),
      );
    } catch {}
  }

  function showInfoToast(text) {
    try {
      Toasts?.showToast?.(
        text,
        getAssetIDByName("SettingsIcon") ?? getAssetIDByName("KeyboardIcon"),
      );
    } catch {}
  }

  function openColorPicker(storageKey, fallback) {
    if (!ActionSheet?.openLazy || !CustomColorPickerActionSheet) return false;

    const current = normalizeHex(storage[storageKey], fallback);

    try {
      ActionSheet.openLazy(
        Promise.resolve({ default: CustomColorPickerActionSheet }),
        `silent-typing-${storageKey}-color`,
        {
          color: Number.parseInt(current.slice(1), 16),
          onSelect: color => {
            const rgb = Number(color) & 0xFFFFFF;
            storage[storageKey] =
              `#${rgb.toString(16).padStart(6, "0").toUpperCase()}`;
            notifyRefresh();
          },
        },
      );
      return true;
    } catch {
      return false;
    }
  }

  function findRenderedComponent(name) {
    try {
      const byDisplayName = find(module => module?.type?.displayName === name);
      if (byDisplayName) return byDisplayName;
    } catch {}

    try {
      return findByName(name, false) ?? findByName(name);
    } catch {
      return null;
    }
  }

  function getKeyboardIcon() {
    return (
      getAssetIDByName("KeyboardIcon")
      ?? getAssetIDByName("ChatIcon")
      ?? getAssetIDByName("PencilIcon")
    );
  }

  function getKeyboardColor(enabled) {
    return enabled
      ? colorWithAlpha(
          storage.silentKeyboardColor,
          storage.silentKeyboardAlpha,
        )
      : colorWithAlpha(
          storage.visibleKeyboardColor,
          storage.visibleKeyboardAlpha,
        );
  }

  function KeyboardGraphic({ enabled, size = 30 }) {
    const keyboardColor = getKeyboardColor(enabled);
    const slashColor = colorWithAlpha(
      storage.slashColor,
      storage.slashAlpha,
    );

    return React.createElement(
      RN.View,
      {
        pointerEvents: "none",
        style: {
          width: size,
          height: size,
          alignItems: "center",
          justifyContent: "center",
        },
      },
      React.createElement(RN.Image, {
        source: getKeyboardIcon(),
        resizeMode: "contain",
        style: {
          width: size * 0.8,
          height: size * 0.8,
          tintColor: keyboardColor,
        },
      }),
      enabled && storage.showSlash !== false
        ? React.createElement(RN.View, {
            style: {
              position: "absolute",
              width: Math.max(3, size * 0.09),
              height: size * 1.05,
              borderRadius: 2,
              backgroundColor: slashColor,
              transform: [{ rotate: "45deg" }],
            },
          })
        : null,
    );
  }

  function SilentTypingButton() {
    usePluginRefresh();

    const navigation = NavigationNative?.useNavigation?.();
    const longPressTriggered = React.useRef(false);

    if (storage.showButton === false) return null;

    const enabled = storage.enabled === true;

    return React.createElement(
      RN.Pressable,
      {
        accessibilityRole: "button",
        accessibilityLabel: enabled
          ? "Silent typing enabled. Tap to disable."
          : "Silent typing disabled. Tap to enable.",
        accessibilityHint:
          "Tap to toggle silent typing. Hold to open Silent Typing settings.",
        delayLongPress: SETTINGS_HOLD_MS,
        onPressIn: () => {
          longPressTriggered.current = false;
        },
        onLongPress: () => {
          longPressTriggered.current = true;

          try {
            navigation?.push?.("VendettaCustomPage", {
              render: Settings,
            });
          } catch {
            showInfoToast("Open Silent Typing settings from Revenge → Plugins");
          }
        },
        onPress: () => {
          if (longPressTriggered.current) {
            longPressTriggered.current = false;
            return;
          }

          const nextEnabled = !enabled;
          storage.enabled = nextEnabled;
          notifyRefresh();
          showStateToast(nextEnabled);
        },
        hitSlop: { top: 8, bottom: 8, left: 8, right: 8 },
        style: {
          width: 40,
          height: 40,
          marginHorizontal: 2,
          flexShrink: 0,
          alignItems: "center",
          justifyContent: "center",
        },
      },
      React.createElement(KeyboardGraphic, { enabled, size: 30 }),
    );
  }

  function wrapWithButton(result, beforeResult) {
    const button = React.createElement(SilentTypingButton, {
      key: "silent-typing-toggle",
    });

    return React.createElement(
      RN.View,
      {
        style: {
          flexDirection: "row",
          alignItems: "center",
        },
      },
      beforeResult ? button : result,
      beforeResult ? result : button,
    );
  }

  function patchComposerComponent(name, side) {
    const component = findRenderedComponent(name);
    const target = component?.type ?? component;

    if (target && typeof target.render === "function") {
      patches.push(
        after("render", target, (_, result) => {
          const useRight = storage.buttonSide === "right";
          if ((side === "right") !== useRight) return result;
          return wrapWithButton(result, side === "right");
        }),
      );
      return true;
    }

    if (component && typeof component.default === "function") {
      patches.push(
        after("default", component, (_, result) => {
          const useRight = storage.buttonSide === "right";
          if ((side === "right") !== useRight) return result;
          return wrapWithButton(result, side === "right");
        }),
      );
      return true;
    }

    return false;
  }

  function patchComposer() {
    const rightPatched = patchComposerComponent("ChatInputRightActions", "right");
    const leftPatched = patchComposerComponent("ChatInputActions", "left");

    if (!rightPatched && !leftPatched) {
      throw new Error("Discord chat input action components were not found");
    }

    if (!leftPatched) storage.buttonSide = "right";
    if (!rightPatched) storage.buttonSide = "left";
  }

  function patchTyping() {
    if (!Typing?.startTyping) {
      throw new Error("Discord typing module was not found");
    }

    patches.push(
      instead("startTyping", Typing, (args, original) => {
        if (storage.enabled === true) return;
        return original(...args);
      }),
    );
  }

  function SettingRow({ title, description, control }) {
    return React.createElement(
      RN.View,
      {
        style: {
          paddingVertical: 12,
          borderBottomWidth: RN.StyleSheet.hairlineWidth,
          borderBottomColor: "#3F4147",
        },
      },
      React.createElement(
        RN.View,
        {
          style: {
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
          },
        },
        React.createElement(
          RN.Text,
          {
            style: {
              color: "#F2F3F5",
              fontSize: 16,
              fontWeight: "600",
              flex: 1,
              paddingRight: 12,
            },
          },
          title,
        ),
        control,
      ),
      description
        ? React.createElement(
            RN.Text,
            {
              style: {
                color: "#B5BAC1",
                fontSize: 13,
                marginTop: 4,
                lineHeight: 18,
              },
            },
            description,
          )
        : null,
    );
  }

  function AlphaInput({ storageKey, forceRender }) {
    const initial = String(clampByte(storage[storageKey]));
    const [text, setText] = React.useState(initial);

    React.useEffect(() => {
      setText(String(clampByte(storage[storageKey])));
    }, [storage[storageKey]]);

    return React.createElement(RN.TextInput, {
      value: text,
      keyboardType: "number-pad",
      maxLength: 3,
      selectTextOnFocus: true,
      onChangeText: value => {
        const cleaned = value.replace(/\D/g, "").slice(0, 3);
        setText(cleaned);

        if (cleaned.length > 0) {
          storage[storageKey] = clampByte(cleaned);
          forceRender();
          notifyRefresh();
        }
      },
      onBlur: () => {
        const normalized = clampByte(text);
        storage[storageKey] = normalized;
        setText(String(normalized));
        forceRender();
        notifyRefresh();
      },
      style: {
        width: 64,
        minHeight: 38,
        paddingHorizontal: 10,
        borderRadius: 8,
        backgroundColor: "#1E1F22",
        color: "#F2F3F5",
        textAlign: "center",
        fontSize: 15,
      },
    });
  }

  function ColorControl({
    title,
    description,
    storageKey,
    alphaKey,
    fallback,
    previewType,
    forceRender,
  }) {
    const hex = normalizeHex(storage[storageKey], fallback);
    const alpha = clampByte(storage[alphaKey]);
    const displayColor = colorWithAlpha(hex, alpha);

    const selectColor = () => {
      if (!openColorPicker(storageKey, fallback)) {
        showInfoToast("Color picker unavailable on this Discord build");
      }
      forceRender();
    };

    return React.createElement(
      RN.View,
      {
        style: {
          marginTop: 18,
          padding: 14,
          borderRadius: 12,
          backgroundColor: "#2B2D31",
        },
      },
      React.createElement(
        RN.Text,
        {
          style: {
            color: "#F2F3F5",
            fontSize: 16,
            fontWeight: "700",
          },
        },
        title,
      ),
      React.createElement(
        RN.Text,
        {
          style: {
            color: "#B5BAC1",
            fontSize: 12,
            marginTop: 3,
            marginBottom: 12,
          },
        },
        description,
      ),
      React.createElement(
        RN.View,
        {
          style: {
            flexDirection: "row",
            alignItems: "center",
          },
        },
        React.createElement(
          RN.Pressable,
          {
            accessibilityRole: "button",
            accessibilityLabel: `Open color picker for ${title.toLowerCase()}`,
            onPress: selectColor,
            style: {
              width: 58,
              height: 58,
              borderRadius: 29,
              marginRight: 12,
              backgroundColor: displayColor,
              borderWidth: 2,
              borderColor: "#4E5058",
              alignItems: "center",
              justifyContent: "center",
            },
          },
          previewType === "slash"
            ? React.createElement(RN.View, {
                style: {
                  width: 4,
                  height: 44,
                  borderRadius: 2,
                  backgroundColor: "#111214",
                  transform: [{ rotate: "45deg" }],
                },
              })
            : React.createElement(RN.Image, {
                source: getKeyboardIcon(),
                resizeMode: "contain",
                style: {
                  width: 32,
                  height: 32,
                  tintColor: "#111214",
                },
              }),
        ),
        React.createElement(
          RN.View,
          { style: { flex: 1 } },
          React.createElement(
            RN.Text,
            {
              style: {
                color: "#F2F3F5",
                fontSize: 15,
                fontWeight: "600",
              },
            },
            hex,
          ),
          React.createElement(
            RN.Pressable,
            {
              onPress: selectColor,
              style: {
                alignSelf: "flex-start",
                marginTop: 6,
                paddingVertical: 6,
                paddingHorizontal: 10,
                borderRadius: 8,
                backgroundColor: "#4E5058",
              },
            },
            React.createElement(
              RN.Text,
              {
                style: {
                  color: "#FFFFFF",
                  fontSize: 13,
                  fontWeight: "600",
                },
              },
              "Open color picker",
            ),
          ),
        ),
      ),
      React.createElement(
        RN.View,
        {
          style: {
            marginTop: 12,
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
          },
        },
        React.createElement(
          RN.View,
          null,
          React.createElement(
            RN.Text,
            {
              style: {
                color: "#F2F3F5",
                fontSize: 14,
                fontWeight: "600",
              },
            },
            "Alpha",
          ),
          React.createElement(
            RN.Text,
            {
              style: {
                color: "#B5BAC1",
                fontSize: 12,
                marginTop: 2,
              },
            },
            "0 = transparent, 255 = opaque",
          ),
        ),
        React.createElement(AlphaInput, {
          storageKey: alphaKey,
          forceRender,
        }),
      ),
      React.createElement(
        RN.Pressable,
        {
          onPress: () => {
            storage[storageKey] = fallback;
            storage[alphaKey] = DEFAULT_ALPHA;
            forceRender();
            notifyRefresh();
          },
          style: {
            marginTop: 12,
            alignSelf: "flex-start",
            paddingVertical: 7,
            paddingHorizontal: 12,
            borderRadius: 8,
            backgroundColor: "#4E5058",
          },
        },
        React.createElement(
          RN.Text,
          {
            style: {
              color: "#FFFFFF",
              fontSize: 13,
              fontWeight: "600",
            },
          },
          "Reset color",
        ),
      ),
    );
  }

  function StatePreview({ enabled, label }) {
    usePluginRefresh();

    return React.createElement(
      RN.View,
      {
        style: {
          flex: 1,
          alignItems: "center",
          justifyContent: "center",
          paddingVertical: 12,
        },
      },
      React.createElement(KeyboardGraphic, { enabled, size: 40 }),
      React.createElement(
        RN.Text,
        {
          style: {
            color: "#B5BAC1",
            fontSize: 13,
            marginTop: 8,
          },
        },
        label,
      ),
    );
  }

  function Settings() {
    const forceRender = usePluginRefresh();

    return React.createElement(
      RN.ScrollView,
      {
        contentContainerStyle: {
          padding: 16,
          paddingBottom: 32,
        },
      },
      React.createElement(
        RN.Text,
        {
          style: {
            color: "#F2F3F5",
            fontSize: 20,
            fontWeight: "700",
            marginBottom: 4,
          },
        },
        "Silent Typing",
      ),
      React.createElement(
        RN.Text,
        {
          style: {
            color: "#B5BAC1",
            fontSize: 13,
            marginBottom: 6,
          },
        },
        "Plain keyboard means visible. Silent mode can use its own keyboard color and an optional slash.",
      ),
      React.createElement(
        RN.Text,
        {
          style: {
            color: "#80848E",
            fontSize: 12,
            marginBottom: 12,
          },
        },
        "Tip: hold the composer keyboard button for 1.5 seconds to open this page.",
      ),
      React.createElement(
        RN.View,
        {
          style: {
            flexDirection: "row",
            borderRadius: 12,
            backgroundColor: "#1E1F22",
            marginBottom: 16,
            overflow: "hidden",
          },
        },
        React.createElement(StatePreview, {
          enabled: false,
          label: "Visible",
        }),
        React.createElement(StatePreview, {
          enabled: true,
          label: "Invisible",
        }),
      ),
      React.createElement(SettingRow, {
        title: "Show composer button",
        description: "Shows the keyboard toggle beside the chat controls.",
        control: React.createElement(RN.Switch, {
          value: storage.showButton !== false,
          onValueChange: value => {
            storage.showButton = value;
            forceRender();
            notifyRefresh();
          },
        }),
      }),
      React.createElement(SettingRow, {
        title: "Show confirmation popup",
        description: "Shows Visible/Invisible confirmation whenever you tap the keyboard button.",
        control: React.createElement(RN.Switch, {
          value: storage.showToast !== false,
          onValueChange: value => {
            storage.showToast = value;
            forceRender();
          },
        }),
      }),
      React.createElement(SettingRow, {
        title: "Show slash when silent",
        description: "ON = slash while invisible. OFF = active/inactive keyboard colors are the visual difference.",
        control: React.createElement(RN.Switch, {
          value: storage.showSlash !== false,
          onValueChange: value => {
            storage.showSlash = value;
            forceRender();
            notifyRefresh();
          },
        }),
      }),
      React.createElement(SettingRow, {
        title: "Button on right side",
        description: "OFF places it on the left. Reopen the chat after changing sides.",
        control: React.createElement(RN.Switch, {
          value: storage.buttonSide === "right",
          onValueChange: value => {
            storage.buttonSide = value ? "right" : "left";
            forceRender();
            notifyRefresh();
          },
        }),
      }),
      React.createElement(ColorControl, {
        title: "Inactive / visible keyboard color",
        description: "Keyboard color while silent typing is OFF.",
        storageKey: "visibleKeyboardColor",
        alphaKey: "visibleKeyboardAlpha",
        fallback: DEFAULT_VISIBLE_COLOR,
        previewType: "keyboard",
        forceRender,
      }),
      React.createElement(ColorControl, {
        title: "Active / silent keyboard color",
        description: "Keyboard color while silent typing is ON.",
        storageKey: "silentKeyboardColor",
        alphaKey: "silentKeyboardAlpha",
        fallback: DEFAULT_SILENT_COLOR,
        previewType: "keyboard",
        forceRender,
      }),
      React.createElement(ColorControl, {
        title: "Silent slash color",
        description: "Independent color for the slash shown while silent typing is ON.",
        storageKey: "slashColor",
        alphaKey: "slashAlpha",
        fallback: DEFAULT_SLASH_COLOR,
        previewType: "slash",
        forceRender,
      }),
      React.createElement(
        RN.Pressable,
        {
          onPress: () => {
            storage.visibleKeyboardColor = DEFAULT_VISIBLE_COLOR;
            storage.visibleKeyboardAlpha = DEFAULT_ALPHA;
            storage.silentKeyboardColor = DEFAULT_SILENT_COLOR;
            storage.silentKeyboardAlpha = DEFAULT_ALPHA;
            storage.slashColor = DEFAULT_SLASH_COLOR;
            storage.slashAlpha = DEFAULT_ALPHA;
            storage.showButton = true;
            storage.showToast = true;
            storage.showSlash = true;
            storage.buttonSide = "left";
            forceRender();
            notifyRefresh();
          },
          style: {
            marginTop: 22,
            minHeight: 46,
            borderRadius: 10,
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: "#4E5058",
          },
        },
        React.createElement(
          RN.Text,
          {
            style: {
              color: "#FFFFFF",
              fontSize: 15,
              fontWeight: "700",
            },
          },
          "Reset all appearance settings",
        ),
      ),
    );
  }

  function migrateStorage() {
    if (!storage.visibleKeyboardColor) {
      storage.visibleKeyboardColor =
        storage.keyboardColor ?? DEFAULT_VISIBLE_COLOR;
    }
    if (storage.visibleKeyboardAlpha == null) {
      storage.visibleKeyboardAlpha =
        storage.keyboardAlpha ?? DEFAULT_ALPHA;
    }

    if (!storage.silentKeyboardColor) {
      storage.silentKeyboardColor =
        storage.keyboardColor ?? DEFAULT_SILENT_COLOR;
    }
    if (storage.silentKeyboardAlpha == null) {
      storage.silentKeyboardAlpha =
        storage.keyboardAlpha ?? DEFAULT_ALPHA;
    }

    storage.slashColor ??= DEFAULT_SLASH_COLOR;
    storage.slashAlpha ??= DEFAULT_ALPHA;
    storage.showButton ??= true;
    storage.showToast ??= true;
    storage.showSlash ??= true;
    storage.enabled ??= false;

    if ((storage.configVersion ?? 0) < CONFIG_VERSION) {
      storage.buttonSide = "left";
      storage.configVersion = CONFIG_VERSION;
    } else {
      storage.buttonSide ??= "left";
    }
  }

  return {
    onLoad() {
      migrateStorage();
      patchComposer();
      patchTyping();
    },

    onUnload() {
      while (patches.length) {
        try {
          patches.pop()?.();
        } catch {}
      }
      refreshListeners.clear();
    },

    settings: Settings,
  };
})()