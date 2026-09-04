(() => {
  "use strict";

  const { before, after } = vendetta.patcher;
  const { find, findByName } = vendetta.metro;
  const { React, ReactNative: RN } = vendetta.metro.common;
  const { storage } = vendetta.plugin;

  const patches = [];
  const patched = {
    actions: false,
    rightActions: false,
    sendButton: false,
    guard: false,
  };

  let liveChatInput = null;
  let refreshFrame = null;

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

    if (component && typeof component.default === "function") {
      return { target: component, method: "default" };
    }

    const target = component?.type ?? component;

    if (target && typeof target.render === "function") {
      return { target, method: "render" };
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
    ) return true;

    if (
      storage.hideGift === true
      && (
        /\bgift\b|\bnitro\b/.test(description)
        || description.includes("chatinputactionbuttongift")
        || description.includes("gifticon")
      )
    ) return true;

    if (
      storage.hideEmoji === true
      && (
        /\bemoji\b|\bexpression\b/.test(description)
        || description.includes("expressionpicker")
        || description.includes("smiley")
      )
    ) return true;

    if (
      storage.hideMicrophone === true
      && (
        /\bvoice message\b|\bmicrophone\b|\brecord voice\b/.test(description)
        || description.includes("microphoneicon")
      )
    ) return true;

    if (
      storage.hideApps === true
      && (
        /\bapps?\b|\bcommands?\b|\bapp launcher\b/.test(description)
        || description.includes("chatinputactionbuttonapps")
        || description.includes("appsicon")
      )
    ) return true;

    if (
      storage.hideThread === true
      && (
        /\bnew thread\b|\bstart thread\b|\bthread\b/.test(description)
        || description.includes("threadplusicon")
      )
    ) return true;

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
    if (patched.actions) return true;

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

    patched.actions = true;
    return true;
  }

  function patchRightActions() {
    if (patched.rightActions) return true;

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

    patched.rightActions = true;
    return true;
  }

  function patchSendButton() {
    if (patched.sendButton) return true;

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

    patched.sendButton = true;
    return true;
  }

  function findInReactTree(node, predicate, seen = new Set(), depth = 0) {
    if (node == null || depth > 60) return null;

    if (Array.isArray(node)) {
      for (const child of node) {
        const found = findInReactTree(child, predicate, seen, depth + 1);
        if (found) return found;
      }
      return null;
    }

    if (typeof node !== "object") return null;
    if (seen.has(node)) return null;
    seen.add(node);

    try {
      if (predicate(node)) return node;
    } catch {}

    const children = node.props?.children;
    if (children !== undefined) {
      const found = findInReactTree(children, predicate, seen, depth + 1);
      if (found) return found;
    }

    return null;
  }

  function refreshLiveComposer(ref = liveChatInput) {
    if (!ref) return false;

    try {
      ref.showSideActions?.();
      return typeof ref.showSideActions === "function";
    } catch {
      return false;
    }
  }

  function scheduleLiveRefresh(ref) {
    if (!ref) return;

    liveChatInput = ref;

    try {
      if (refreshFrame != null && typeof cancelAnimationFrame === "function") {
        cancelAnimationFrame(refreshFrame);
      }

      if (typeof requestAnimationFrame === "function") {
        refreshFrame = requestAnimationFrame(() => {
          refreshFrame = null;
          refreshLiveComposer(ref);
        });
        return;
      }
    } catch {}

    setTimeout(() => refreshLiveComposer(ref), 0);
  }

  function patchChatInputGuard() {
    if (patched.guard) return true;

    let wrapper = null;
    try {
      wrapper = findByName("ChatInputGuardWrapper", false) ?? findByName("ChatInputGuardWrapper");
    } catch {}

    if (!wrapper) return false;

    let target = null;
    let method = null;

    if (typeof wrapper.default === "function") {
      target = wrapper;
      method = "default";
    } else if (wrapper?.type && typeof wrapper.type.render === "function") {
      target = wrapper.type;
      method = "render";
    }

    if (!target || !method) return false;

    patches.push(
      after(method, target, (_, result) => {
        const node = findInReactTree(
          result,
          value => value?.props?.chatInputRef?.current,
        );

        const ref = node?.props?.chatInputRef?.current;
        if (ref) scheduleLiveRefresh(ref);

        return result;
      }),
    );

    patched.guard = true;
    return true;
  }

  function installPatches() {
    ensureDefaults();

    return [
      patchChatInputActions(),
      patchRightActions(),
      patchSendButton(),
      patchChatInputGuard(),
    ];
  }

  function refreshComposerSoon() {
    setTimeout(() => refreshLiveComposer(), 0);
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
          onValueChange: value => {
            storage[storageKey] = value;
            forceRender();
            refreshComposerSoon();
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
      for (const key of Object.keys(DEFAULTS)) storage[key] = value;
      forceRender();
      refreshComposerSoon();
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
        "Changes apply automatically without typing or switching channels.",
      ),
    );
  }

  const earlyResults = installPatches();

  return {
    onLoad() {
      const results = installPatches();

      if (![...earlyResults, ...results].some(Boolean)) {
        throw new Error("Discord composer components were not found");
      }

      refreshComposerSoon();
    },

    onUnload() {
      try {
        if (refreshFrame != null && typeof cancelAnimationFrame === "function") {
          cancelAnimationFrame(refreshFrame);
        }
      } catch {}

      refreshFrame = null;
      liveChatInput = null;

      while (patches.length) {
        try {
          patches.pop()?.();
        } catch {}
      }

      for (const key of Object.keys(patched)) patched[key] = false;
    },

    settings: Settings,
  };
})()
