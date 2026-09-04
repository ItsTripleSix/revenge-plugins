(() => {
  "use strict";

  const { before, after } = vendetta.patcher;
  const {
    find,
    findByName,
    findByProps,
    findByStoreName,
  } = vendetta.metro;
  const { React, ReactNative: RN } = vendetta.metro.common;
  const { storage } = vendetta.plugin;

  const patches = [];
  const refreshTimers = [];

  const DEFAULTS = {
    hideAttachment: false,
    hideGift: false,
    hideEmoji: false,
    hideMicrophone: false,
    hideApps: false,
    hideThread: false,
  };

  function ensureDefaults() {
    for (const [key, value] of Object.entries(DEFAULTS)) {
      storage[key] ??= value;
    }
  }

  function getStore(name) {
    try {
      return findByStoreName?.(name) ?? null;
    } catch {
      return null;
    }
  }

  function getChannelActions() {
    try {
      return (
        findByProps(
          "selectChannel",
          "selectPrivateChannel",
          "selectVoiceChannel",
        )
        ?? findByProps("selectChannel", "selectPrivateChannel")
        ?? null
      );
    } catch {
      return null;
    }
  }

  function reselectCurrentChannel() {
    const selectedChannelStore = getStore("SelectedChannelStore");
    const selectedGuildStore = getStore("SelectedGuildStore");
    const actions = getChannelActions();

    if (!selectedChannelStore || !actions?.selectChannel) return false;

    let channelId = null;
    let guildId = null;

    try {
      channelId = selectedChannelStore.getChannelId?.() ?? null;
    } catch {}

    if (!channelId) return false;

    try {
      guildId = selectedGuildStore?.getGuildId?.() ?? null;
    } catch {}

    try {
      actions.selectChannel({
        guildId,
        channelId,
        skipMessageFetch: true,
        opensChannel: false,
      });
      return true;
    } catch {
      return false;
    }
  }

  function clearRefreshes() {
    while (refreshTimers.length) {
      try {
        clearTimeout(refreshTimers.pop());
      } catch {}
    }
  }

  function scheduleComposerRemount() {
    clearRefreshes();

    // Revenge can load after Discord has already mounted the initial composer.
    // Re-selecting the same channel causes Discord to rebuild that composer
    // without changing where the user is.
    for (const delay of [300, 1000, 2500, 5000]) {
      refreshTimers.push(
        setTimeout(() => {
          reselectCurrentChannel();
        }, delay),
      );
    }
  }

  function applyComposerChange() {
    refreshTimers.push(
      setTimeout(() => {
        reselectCurrentChannel();
      }, 0),
    );
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

  function getRenderTarget(name) {
    const component = findRenderedComponent(name);
    const target = component?.type ?? component;

    if (target && typeof target.render === "function") {
      return { target, method: "render" };
    }

    if (component && typeof component.default === "function") {
      return { target: component, method: "default" };
    }

    return null;
  }

  function describeElement(element) {
    if (!React.isValidElement(element)) return "";

    const props = element.props ?? {};
    const type = element.type;
    const icon = props.IconComponent ?? props.iconComponent ?? props.Icon;

    return [
      props.accessibilityLabel,
      props.accessibilityHint,
      props.label,
      props.title,
      props.testID,
      props.nativeID,
      typeof type === "string" ? type : type?.displayName,
      typeof type === "function" ? type.name : null,
      icon?.displayName,
      icon?.name,
    ]
      .filter(value => typeof value === "string" && value.length)
      .join(" ")
      .toLowerCase();
  }

  function matchesNativeControl(element) {
    const description = describeElement(element);
    if (!description) return false;

    if (
      storage.hideAttachment === true
      && (
        /\battachment\b|\bupload\b|\bphotos?\b|\bmedia\b/.test(description)
        || description.includes("mediakeyboardbuttonicon")
        || description.includes("attachmenticon")
      )
    ) {
      return true;
    }

    if (
      storage.hideGift === true
      && (
        /\bgift\b|\bnitro\b/.test(description)
        || description.includes("chatinputactionbuttongift")
        || description.includes("gifticon")
      )
    ) {
      return true;
    }

    if (
      storage.hideEmoji === true
      && (
        /\bemoji\b|\bexpression\b/.test(description)
        || description.includes("expressionpicker")
        || description.includes("smiley")
      )
    ) {
      return true;
    }

    if (
      storage.hideMicrophone === true
      && (
        /\bvoice message\b|\bmicrophone\b|\brecord voice\b/.test(description)
        || description.includes("microphoneicon")
      )
    ) {
      return true;
    }

    if (
      storage.hideApps === true
      && (
        /\bapps?\b|\bcommands?\b|\bapp launcher\b/.test(description)
        || description.includes("chatinputactionbuttonapps")
        || description.includes("appsicon")
      )
    ) {
      return true;
    }

    if (
      storage.hideThread === true
      && (
        /\bnew thread\b|\bstart thread\b|\bthread\b/.test(description)
        || description.includes("threadplusicon")
      )
    ) {
      return true;
    }

    return false;
  }

  function cleanNativeTree(node) {
    if (Array.isArray(node)) {
      return node
        .map(cleanNativeTree)
        .filter(child => (
          child !== null
          && child !== undefined
          && child !== false
        ));
    }

    if (!React.isValidElement(node)) return node;

    // Unknown/custom composer buttons are intentionally preserved.
    if (matchesNativeControl(node)) return null;

    const children = node.props?.children;
    if (children === undefined) return node;

    const cleanedChildren = cleanNativeTree(children);
    if (cleanedChildren === children) return node;

    try {
      return React.cloneElement(node, undefined, cleanedChildren);
    } catch {
      return node;
    }
  }

  function patchChatInputActions() {
    const found = getRenderTarget("ChatInputActions");
    if (!found) return false;

    patches.push(
      before(found.method, found.target, args => {
        const props = args?.[0];
        if (!props || typeof props !== "object") return;

        if (storage.hideApps === true && "isAppLauncherEnabled" in props) {
          props.isAppLauncherEnabled = false;
        }

        if (storage.hideThread === true && "canStartThreads" in props) {
          props.canStartThreads = false;
        }
      }),
      after(
        found.method,
        found.target,
        (_, result) => cleanNativeTree(result),
      ),
    );

    return true;
  }

  function patchRightActions() {
    const found = getRenderTarget("ChatInputRightActions");
    if (!found) return false;

    patches.push(
      before(found.method, found.target, args => {
        const props = args?.[0];
        if (!props || typeof props !== "object") return;

        if (
          storage.hideGift === true
          && "shouldShowGiftButton" in props
        ) {
          props.shouldShowGiftButton = false;
        }
      }),
      after(
        found.method,
        found.target,
        (_, result) => cleanNativeTree(result),
      ),
    );

    return true;
  }

  function patchSendButton() {
    const found = getRenderTarget("ChatInputSendButton");
    if (!found) return false;

    patches.push(
      before(found.method, found.target, args => {
        const props = args?.[0];
        if (!props || typeof props !== "object") return;

        if (
          storage.hideMicrophone === true
          && "canSendVoiceMessage" in props
        ) {
          props.canSendVoiceMessage = false;
        }
      }),
      after(
        found.method,
        found.target,
        (_, result) => cleanNativeTree(result),
      ),
    );

    return true;
  }

  function SettingRow({
    title,
    description,
    storageKey,
    forceRender,
  }) {
    return React.createElement(
      RN.View,
      {
        style: {
          paddingVertical: 13,
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
        React.createElement(RN.Switch, {
          value: storage[storageKey] === true,
          onValueChange: value => {
            storage[storageKey] = value;
            forceRender();
            applyComposerChange();
          },
        }),
      ),
      React.createElement(
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
      ),
    );
  }

  function ActionButton({ label, onPress }) {
    return React.createElement(
      RN.Pressable,
      {
        onPress,
        style: {
          flex: 1,
          minHeight: 42,
          borderRadius: 8,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "#4E5058",
          paddingHorizontal: 10,
        },
      },
      React.createElement(
        RN.Text,
        {
          style: {
            color: "#FFFFFF",
            fontSize: 14,
            fontWeight: "600",
          },
        },
        label,
      ),
    );
  }

  function Settings() {
    const [, forceRender] = React.useReducer(value => value + 1, 0);

    const setAll = value => {
      for (const key of Object.keys(DEFAULTS)) {
        storage[key] = value;
      }
      forceRender();
      applyComposerChange();
    };

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
        "Composer Cleaner",
      ),
      React.createElement(
        RN.Text,
        {
          style: {
            color: "#B5BAC1",
            fontSize: 13,
            lineHeight: 18,
            marginBottom: 10,
          },
        },
        "Hide Discord's native message composer buttons. Third-party composer buttons are left alone.",
      ),
      React.createElement(SettingRow, {
        title: "Hide attachment / media (+)",
        description: "Removes Discord's attachment/media button from the composer.",
        storageKey: "hideAttachment",
        forceRender,
      }),
      React.createElement(SettingRow, {
        title: "Hide Gift",
        description: "Removes Discord's gift/Nitro button.",
        storageKey: "hideGift",
        forceRender,
      }),
      React.createElement(SettingRow, {
        title: "Hide Emoji / Expression",
        description: "Removes the smiley/expression picker button.",
        storageKey: "hideEmoji",
        forceRender,
      }),
      React.createElement(SettingRow, {
        title: "Hide Microphone",
        description: "Removes the voice-message microphone when Discord shows it.",
        storageKey: "hideMicrophone",
        forceRender,
      }),
      React.createElement(SettingRow, {
        title: "Hide Apps & Commands",
        description: "Removes Discord's app/command launcher button where present.",
        storageKey: "hideApps",
        forceRender,
      }),
      React.createElement(SettingRow, {
        title: "Hide New Thread",
        description: "Removes the new-thread composer action where present.",
        storageKey: "hideThread",
        forceRender,
      }),
      React.createElement(
        RN.View,
        {
          style: {
            flexDirection: "row",
            gap: 10,
            marginTop: 18,
          },
        },
        React.createElement(ActionButton, {
          label: "Hide all",
          onPress: () => setAll(true),
        }),
        React.createElement(ActionButton, {
          label: "Show all",
          onPress: () => setAll(false),
        }),
      ),
    );
  }

  return {
    onLoad() {
      ensureDefaults();

      const results = [
        patchChatInputActions(),
        patchRightActions(),
        patchSendButton(),
      ];

      if (!results.some(Boolean)) {
        throw new Error("Discord composer components were not found");
      }

      scheduleComposerRemount();
    },

    onUnload() {
      clearRefreshes();

      while (patches.length) {
        try {
          patches.pop()?.();
        } catch {}
      }
    },

    settings: Settings,
  };
})()
