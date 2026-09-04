(() => {
  "use strict";

  const { after, instead } = vendetta.patcher;
  const { findByName, findByProps } = vendetta.metro;
  const { React, ReactNative: RN } = vendetta.metro.common;
  const { findInReactTree } = vendetta.utils;
  const { getAssetIDByName } = vendetta.ui.assets;
  const { storage } = vendetta.plugin;

  const ChatInputGuardWrapper = findByName("ChatInputGuardWrapper", false);
  const Typing = findByProps("startTyping", "stopTyping") ?? findByProps("startTyping");

  const patches = [];

  function SilentTypingButton() {
    const [, forceRender] = React.useReducer(value => value + 1, 0);
    const enabled = storage.enabled === true;

    const icon =
      getAssetIDByName(enabled ? "ChatXIcon" : "ChatIcon")
      ?? getAssetIDByName("ChatIcon");

    return React.createElement(
      RN.Pressable,
      {
        accessibilityRole: "button",
        accessibilityLabel: enabled
          ? "Disable silent typing"
          : "Enable silent typing",
        onPress: () => {
          storage.enabled = !enabled;
          forceRender();
        },
        style: {
          width: 40,
          height: 40,
          marginHorizontal: 4,
          marginLeft: 8,
          marginTop: -4,
          flexShrink: 0,
          alignItems: "center",
          justifyContent: "center",
          borderRadius: 20,
          opacity: enabled ? 1 : 0.55,
        },
      },
      React.createElement(RN.Image, {
        source: icon,
        style: {
          width: 24,
          height: 24,
        },
      }),
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

  function patchComposer() {
    if (!ChatInputGuardWrapper?.default) {
      throw new Error("Discord chat input module was not found");
    }

    patches.push(
      after("default", ChatInputGuardWrapper, (_, result) => {
        const root = result?.props?.children;
        if (!root) return;

        const inputProps = findInReactTree(
          root,
          node => node?.props?.chatInputRef?.current,
        )?.props?.chatInputRef?.current;

        if (!inputProps?.handleTextChanged) return;

        const container = findInReactTree(
          root,
          node =>
            node?.type?.displayName === "View"
            && Array.isArray(node?.props?.children),
        );

        const children = container?.props?.children;
        if (!Array.isArray(children)) return;

        if (children.some(child => child?.key === "silent-typing-toggle")) return;

        children.unshift(
          React.createElement(SilentTypingButton, {
            key: "silent-typing-toggle",
          }),
        );
      }),
    );
  }

  return {
    onLoad() {
      storage.enabled ??= false;
      patchTyping();
      patchComposer();
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