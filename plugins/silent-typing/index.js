(() => {
  "use strict";

  const { after, instead } = vendetta.patcher;
  const { find, findByName, findByProps } = vendetta.metro;
  const { React, ReactNative: RN } = vendetta.metro.common;
  const { getAssetIDByName } = vendetta.ui.assets;
  const semanticColors = vendetta.ui.semanticColors ?? {};
  const { storage } = vendetta.plugin;

  const patches = [];

  const Typing =
    findByProps("startTyping", "stopTyping")
    ?? findByProps("startTyping");

  function findChatInputActions() {
    try {
      const byDisplayName = find(
        module => module?.type?.displayName === "ChatInputActions",
      );
      if (byDisplayName) return byDisplayName;
    } catch {}

    try {
      return (
        findByName("ChatInputActions", false)
        ?? findByName("ChatInputActions")
      );
    } catch {
      return null;
    }
  }

  function SilentTypingButton() {
    const [, forceRender] = React.useReducer(value => value + 1, 0);
    const enabled = storage.enabled === true;

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
          marginHorizontal: 4,
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
            width: 28,
            height: 28,
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
            tintColor: semanticColors.INTERACTIVE_ICON_DEFAULT,
            opacity: enabled ? 1 : 0.72,
          },
        }),
        enabled
          ? React.createElement(RN.View, {
              style: {
                position: "absolute",
                width: 3,
                height: 30,
                borderRadius: 2,
                backgroundColor:
                  semanticColors.TEXT_DANGER
                  ?? semanticColors.TEXT_FEEDBACK_CRITICAL
                  ?? "#f23f42",
                transform: [{ rotate: "45deg" }],
              },
            })
          : null,
      ),
    );
  }

  function patchComposer() {
    const component = findChatInputActions();
    const target = component?.type ?? component;

    if (!target || typeof target.render !== "function") {
      throw new Error("Discord ChatInputActions component was not found");
    }

    patches.push(
      after("render", target, (_, result) =>
        React.createElement(
          RN.View,
          {
            style: {
              flexDirection: "row",
              alignItems: "center",
            },
          },
          result,
          React.createElement(SilentTypingButton, {
            key: "silent-typing-toggle",
          }),
        ),
      ),
    );
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

  return {
    onLoad() {
      storage.enabled ??= false;

      // Install the button first. If Discord changes the composer again,
      // fail the plugin rather than silently leaving typing suppressed.
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
  };
})()