(() => {
  "use strict";

  const { after } = vendetta.patcher;
  const { find, findByName } = vendetta.metro;
  const { React, ReactNative: RN } = vendetta.metro.common;
  const { storage } = vendetta.plugin;

  const RUNTIME_KEY = "__itsTripleSixComposerCleanerRuntime";
  const DEFAULTS = {
    hideAttachment: false,
    hideGift: false,
    hideEmoji: false,
    hideMicrophone: false,
    hideApps: false,
    hideThread: false,
  };

  const runtime = globalThis[RUNTIME_KEY] ?? {
    patches: [],
    refreshListeners: new Set(),
    patched: {
      actions: false,
      rightActions: false,
      sendButton: false,
      guard: false,
    },
    liveChatInput: null,
    refreshFrame: null,
    refreshTimer: null,
    active: false,
    initialRefreshPending: true,
    unpatchAll: null,
  };

  globalThis[RUNTIME_KEY] = runtime;

  function cancelScheduledRefresh() {
    try {
      if (runtime.refreshFrame != null && typeof cancelAnimationFrame === "function") {
        cancelAnimationFrame(runtime.refreshFrame);
      }
    } catch {}

    if (runtime.refreshTimer != null) {
      try {
        clearTimeout(runtime.refreshTimer);
      } catch {}
    }

    runtime.refreshFrame = null;
    runtime.refreshTimer = null;
  }

  function unpatchAll() {
    cancelScheduledRefresh();

    while (runtime.patches.length) {
      try {
        runtime.patches.pop()?.();
      } catch {}
    }

    for (const key of Object.keys(runtime.patched)) runtime.patched[key] = false;
  }

  try {
    runtime.unpatchAll?.();
  } catch {}
  runtime.unpatchAll = unpatchAll;
  runtime.active = true;
  runtime.initialRefreshPending = true;

  function ensureDefaults() {
    for (const [key, value] of Object.entries(DEFAULTS)) {
      storage[key] ??= value;
    }
  }

  function notifyRefresh() {
    for (const listener of runtime.refreshListeners) {
      try {
        listener();
      } catch {}
    }
  }

  function useCleanerRefresh() {
    const [, forceRender] = React.useReducer(value => value + 1, 0);

    React.useEffect(() => {
      runtime.refreshListeners.add(forceRender);
      return () => runtime.refreshListeners.delete(forceRender);
    }, []);
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

  function CleanerOutput({ result }) {
    useCleanerRefresh();
    if (runtime.active !== true) return result;
    return cleanNativeTree(result);
  }

  function wrapCleanResult(result, key) {
    return React.createElement(CleanerOutput, {
      key: `composer-cleaner-${key}`,
      result,
    });
  }

  function patchOutput(name, flag) {
    if (runtime.patched[flag]) return true;

    const found = getRenderTarget(name);
    if (!found) return false;

    runtime.patches.push(
      after(found.method, found.target, (_, result) => wrapCleanResult(result, flag)),
    );

    runtime.patched[flag] = true;
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

  function forceComposerActionRerender(ref = runtime.liveChatInput) {
    if (!ref) return false;

    let text = "";
    try {
      text = String(ref.getText?.() ?? "");
    } catch {}

    const shouldShowSideActions = text.length === 0;
    const first = shouldShowSideActions ? "hideSideActions" : "showSideActions";
    const second = shouldShowSideActions ? "showSideActions" : "hideSideActions";

    if (typeof ref[first] !== "function" || typeof ref[second] !== "function") {
      return false;
    }

    cancelScheduledRefresh();

    try {
      ref[first]();
    } catch {
      return false;
    }

    const finish = () => {
      runtime.refreshFrame = null;
      runtime.refreshTimer = null;
      try {
        ref[second]();
      } catch {}
    };

    if (typeof requestAnimationFrame === "function") {
      runtime.refreshFrame = requestAnimationFrame(finish);
    } else {
      runtime.refreshTimer = setTimeout(finish, 0);
    }

    return true;
  }

  function refreshComposerSoon() {
    setTimeout(() => {
      notifyRefresh();
      if (runtime.refreshListeners.size === 0) forceComposerActionRerender();
    }, 0);
  }

  function patchChatInputGuard() {
    if (runtime.patched.guard) return true;

    let wrapper = null;
    try {
      wrapper = findByName("ChatInputGuardWrapper", false)
        ?? findByName("ChatInputGuardWrapper");
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

    runtime.patches.push(
      after(method, target, (_, result) => {
        const node = findInReactTree(
          result,
          value => value?.props?.chatInputRef?.current,
        );

        const ref = node?.props?.chatInputRef?.current;
        if (ref) {
          runtime.liveChatInput = ref;
          if (runtime.initialRefreshPending) {
            runtime.initialRefreshPending = false;
            setTimeout(() => forceComposerActionRerender(ref), 0);
          }
        }

        return result;
      }),
    );

    runtime.patched.guard = true;
    return true;
  }

  function installPatches() {
    ensureDefaults();

    return [
      patchOutput("ChatInputActions", "actions"),
      patchOutput("ChatInputRightActions", "rightActions"),
      patchOutput("ChatInputSendButton", "sendButton"),
      patchChatInputGuard(),
    ];
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
            notifyRefresh();
            if (runtime.refreshListeners.size === 0) forceComposerActionRerender();
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
      notifyRefresh();
      if (runtime.refreshListeners.size === 0) forceComposerActionRerender();
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
        "Changes apply immediately without typing or switching channels.",
      ),
    );
  }

  ensureDefaults();
  const earlyResults = installPatches();

  return {
    onLoad() {
      runtime.active = true;
      runtime.initialRefreshPending = true;
      const results = installPatches();

      notifyRefresh();

      if (![...earlyResults, ...results].some(Boolean)) {
        throw new Error("Discord composer components were not found");
      }

      if (runtime.liveChatInput) {
        runtime.initialRefreshPending = false;
        setTimeout(() => forceComposerActionRerender(), 0);
      }
    },

    onUnload() {
      runtime.active = false;
      notifyRefresh();
      unpatchAll();
    },

    settings: Settings,
  };
})()
