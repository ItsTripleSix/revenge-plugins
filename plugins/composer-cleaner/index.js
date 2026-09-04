(() => {
  "use strict";

  const { before, after } = vendetta.patcher;
  const { find, findByName, findByStoreName } = vendetta.metro;
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

  const refreshStores = [
    "SelectedChannelStore",
    "SelectedGuildStore",
    "DraftStore",
  ]
    .map(name => {
      try {
        return findByStoreName?.(name);
      } catch {
        return null;
      }
    })
    .filter(Boolean);

  function ensureDefaults() {
    for (const [key, value] of Object.entries(DEFAULTS)) {
      storage[key] ??= value;
    }
  }

  function refreshComposer() {
    for (const store of refreshStores) {
      try {
        store?.emitChange?.();
      } catch {}
    }
  }

  function scheduleRefreshes() {
    for (const delay of [250, 1000, 2500]) {
      refreshTimers.push(setTimeout(refreshComposer, delay));
    }
  }

  function clearRefreshes() {
    while (refreshTimers.length) {
      try {
        clearTimeout(refreshTimers.pop());
      } catch {}
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
        .filter(child => child !== null && child !== undefined && child !== false);
    }

    if (!React.isValidElement(node)) return node;
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
      after(found.method, found.target, (_, result) => cleanNativeTree(result)),
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

        if (storage.hideGift === true && "shouldShowGiftButton" in props) {
          props.shouldShowGiftButton = false;
        }
      }),
      after(found.method, found.target, (_, result) => cleanNativeTree(result)),
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
      after(found.method, found.target, (_, result) => cleanNativeTree(result)),
    );

    return true;
  }

  function setOption(key, value, forceRender) {
    storage[key] = value;
    forceRender();
    refreshComposer();
    refreshTimers.push(setTimeout(refreshComposer, 100));
  }

  function SettingRow({ title, description, storageKey, forceRender }) {
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
          onValueChange: value => setOption(storageKey, value, forceRender),
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
      for (const key of Object.keys(DEFAULTS)) storage[key] = value;
      forceRender();
      refreshComposer();
      refreshTimers.push(setTimeout(refreshComposer, 100));
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

      React.createElement(
        RN.Text,
        {
          style: {
            color: "#80848E",
            fontSize: 12,
            lineHeight: 17,
            marginTop: 14,
          },
        },
        "Changes should apply immediately. Composer Cleaner also refreshes the current chat automatically after Discord starts.",
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

      refreshComposer();
      scheduleRefreshes();
    },

    onUnload() {
      clearRefreshes();

      while (patches.length) {
        try {
          patches.pop()?.();
        } catch {}
      }

      refreshComposer();
    },

    settings: Settings,
  };
})()
