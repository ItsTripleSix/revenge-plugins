(() => {
  "use strict";

  const { after, instead } = vendetta.patcher;
  const { find, findByName, findByProps } = vendetta.metro;
  const { React, ReactNative: RN } = vendetta.metro.common;
  const { getAssetIDByName } = vendetta.ui.assets;
  const { storage } = vendetta.plugin;

  const patches = [];
  const DEFAULT_NORMAL_COLOR = "#B5BAC1";
  const DEFAULT_SILENT_COLOR = "#F23F42";

  const Typing =
    findByProps("startTyping", "stopTyping")
    ?? findByProps("startTyping");

  function validColor(value, fallback) {
    return typeof value === "string"
      && /^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/.test(value)
      ? value
      : fallback;
  }

  function findRenderedComponent(name) {
    try {
      const byDisplayName = find(
        module => module?.type?.displayName === name,
      );
      if (byDisplayName) return byDisplayName;
    } catch {}

    try {
      return findByName(name, false) ?? findByName(name);
    } catch {
      return null;
    }
  }

  function SilentTypingButton() {
    const [, forceRender] = React.useReducer(value => value + 1, 0);
    const enabled = storage.enabled === true;
    const normalColor = validColor(storage.normalColor, DEFAULT_NORMAL_COLOR);
    const silentColor = validColor(storage.silentColor, DEFAULT_SILENT_COLOR);
    const iconColor = enabled ? silentColor : normalColor;

    const keyboardIcon =
      getAssetIDByName("KeyboardIcon")
      ?? getAssetIDByName("ChatIcon")
      ?? getAssetIDByName("PencilIcon");

    return React.createElement(
      RN.Pressable,
      {
        accessibilityRole: "button",
        accessibilityLabel: enabled
          ? "Silent typing enabled. Tap to disable."
          : "Silent typing disabled. Tap to enable.",
        onPress: () => {
          storage.enabled = !enabled;
          forceRender();
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
      React.createElement(
        RN.View,
        {
          pointerEvents: "none",
          style: {
            width: 30,
            height: 30,
            alignItems: "center",
            justifyContent: "center",
          },
        },
        React.createElement(RN.Image, {
          source: keyboardIcon,
          resizeMode: "contain",
          style: {
            width: 24,
            height: 24,
            tintColor: iconColor,
          },
        }),
        enabled && storage.showSlash !== false
          ? React.createElement(RN.View, {
              style: {
                position: "absolute",
                width: 3,
                height: 32,
                borderRadius: 2,
                backgroundColor: silentColor,
                transform: [{ rotate: "45deg" }],
              },
            })
          : null,
      ),
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
          const useRight = storage.buttonSide !== "left";
          if ((side === "right") !== useRight) return result;
          return wrapWithButton(result, side === "right");
        }),
      );
      return true;
    }

    if (component && typeof component.default === "function") {
      patches.push(
        after("default", component, (_, result) => {
          const useRight = storage.buttonSide !== "left";
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

  function ColorInput({ label, storageKey, fallback, forceRender }) {
    const value = storage[storageKey] ?? fallback;
    const preview = validColor(value, fallback);

    return React.createElement(
      RN.View,
      {
        style: {
          marginTop: 14,
        },
      },
      React.createElement(
        RN.Text,
        {
          style: {
            color: "#F2F3F5",
            fontSize: 14,
            fontWeight: "600",
            marginBottom: 6,
          },
        },
        label,
      ),
      React.createElement(
        RN.View,
        {
          style: {
            flexDirection: "row",
            alignItems: "center",
          },
        },
        React.createElement(RN.View, {
          style: {
            width: 28,
            height: 28,
            borderRadius: 6,
            marginRight: 10,
            backgroundColor: preview,
          },
        }),
        React.createElement(RN.TextInput, {
          value,
          autoCapitalize: "characters",
          autoCorrect: false,
          placeholder: fallback,
          placeholderTextColor: "#80848E",
          onChangeText: text => {
            storage[storageKey] = text;
            forceRender();
          },
          style: {
            flex: 1,
            minHeight: 40,
            paddingHorizontal: 12,
            borderRadius: 8,
            backgroundColor: "#1E1F22",
            color: "#F2F3F5",
            fontSize: 15,
          },
        }),
      ),
    );
  }

  function Settings() {
    const [, forceRender] = React.useReducer(value => value + 1, 0);

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
            marginBottom: 12,
          },
        },
        "Customize the composer toggle. Color values accept hex such as #F23F42.",
      ),
      React.createElement(SettingRow, {
        title: "Show slash when silent",
        description: "Draws a diagonal line through the keyboard icon while silent typing is enabled.",
        control: React.createElement(RN.Switch, {
          value: storage.showSlash !== false,
          onValueChange: value => {
            storage.showSlash = value;
            forceRender();
          },
        }),
      }),
      React.createElement(SettingRow, {
        title: "Button on right side",
        description: "Matches the side used by BetterSilentTyping on Aliucord. Reopen the chat after changing this.",
        control: React.createElement(RN.Switch, {
          value: storage.buttonSide !== "left",
          onValueChange: value => {
            storage.buttonSide = value ? "right" : "left";
            forceRender();
          },
        }),
      }),
      React.createElement(ColorInput, {
        label: "Normal typing color",
        storageKey: "normalColor",
        fallback: DEFAULT_NORMAL_COLOR,
        forceRender,
      }),
      React.createElement(ColorInput, {
        label: "Silent typing color / slash",
        storageKey: "silentColor",
        fallback: DEFAULT_SILENT_COLOR,
        forceRender,
      }),
      React.createElement(
        RN.Pressable,
        {
          onPress: () => {
            storage.normalColor = DEFAULT_NORMAL_COLOR;
            storage.silentColor = DEFAULT_SILENT_COLOR;
            storage.showSlash = true;
            storage.buttonSide = "right";
            forceRender();
          },
          style: {
            marginTop: 20,
            minHeight: 44,
            borderRadius: 8,
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
              fontWeight: "600",
            },
          },
          "Reset appearance",
        ),
      ),
    );
  }

  return {
    onLoad() {
      storage.enabled ??= false;
      storage.showSlash ??= true;
      storage.buttonSide ??= "right";
      storage.normalColor ??= DEFAULT_NORMAL_COLOR;
      storage.silentColor ??= DEFAULT_SILENT_COLOR;

      patchComposer();
      patchTyping();
    },

    onUnload() {
      while (patches.length) {
        try {
          patches.pop()?.();
        } catch {}
      }
    },

    settings: Settings,
  };
})()
