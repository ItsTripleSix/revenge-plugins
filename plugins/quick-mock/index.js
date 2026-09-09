(() => {
  "use strict";

  const { before, after } = vendetta.patcher;
  const { findByProps, findByName } = vendetta.metro;
  const { React, ReactNative: RN } = vendetta.metro.common;
  const storage = vendetta.plugin.storage;
  const findInReactTree = vendetta.utils?.findInReactTree;
  const showToast = vendetta.ui?.toasts?.showToast;
  const getAssetIDByName = vendetta.ui?.assets?.getAssetIDByName;
  const Forms = vendetta.ui?.components?.Forms;

  const ActionSheet = findByProps("openLazy", "hideActionSheet");
  const MessageStore = findByProps("getMessage", "getMessages");
  const DraftStore = findByProps("getDraft");
  const DraftManager = findByProps("clearDraft", "saveDraft");
  const MessageActions = findByProps("sendMessage", "editMessage");
  const PendingReplyStore = findByProps("getPendingReply");

  const FormRow = Forms?.FormRow;
  const FormIcon = Forms?.FormIcon;
  const mockIcon = (() => {
    try {
      return getAssetIDByName?.("ic_edit_24px")
        ?? getAssetIDByName?.("PencilIcon")
        ?? getAssetIDByName?.("ChatIcon");
    } catch {
      return undefined;
    }
  })();

  if (storage.sendImmediately == null) storage.sendImmediately = false;

  let unregisterCommand = null;
  let unpatchActionSheet = null;
  let unpatchContextBar = null;
  let cachedPendingReply = null;

  function toast(text) {
    try { showToast?.(text, mockIcon); } catch {}
  }

  function mockify(value) {
    return Array.from(String(value ?? ""))
      .map((char, index) => index % 2 === 1 ? char.toUpperCase() : char.toLowerCase())
      .join("");
  }

  function optionValue(args, name) {
    if (!Array.isArray(args)) return undefined;
    return args.find(arg => arg?.name === name)?.value;
  }

  function resolvePendingMessage(channelId) {
    let pending = null;

    try {
      if (PendingReplyStore?.getPendingReply) {
        pending = PendingReplyStore.getPendingReply(channelId) ?? PendingReplyStore.getPendingReply();
      }
    } catch {}

    pending ??= cachedPendingReply;
    if (!pending) return null;

    const direct = pending.message ?? pending.reply ?? pending;
    if (direct?.content != null) return direct;

    const messageId = pending.messageId ?? pending.message_id ?? direct?.id;
    const pendingChannelId = pending.channelId ?? pending.channel_id ?? direct?.channel_id ?? channelId;
    if (messageId && pendingChannelId) {
      try { return MessageStore?.getMessage?.(pendingChannelId, messageId) ?? null; } catch {}
    }

    return null;
  }

  function currentDraft(channelId) {
    try {
      const value = DraftStore?.getDraft?.(channelId, 0);
      if (typeof value === "string") return value;
    } catch {}
    try {
      const value = DraftStore?.getDraft?.(channelId);
      if (typeof value === "string") return value;
    } catch {}
    return "";
  }

  function saveDraft(channelId, text) {
    if (!DraftManager?.saveDraft || !channelId) return false;

    const attempts = [
      () => DraftManager.saveDraft(channelId, 0, text),
      () => DraftManager.saveDraft(channelId, text, 0),
      () => DraftManager.saveDraft(channelId, text),
    ];

    for (const attempt of attempts) {
      try {
        attempt();
        if (currentDraft(channelId) === text) return true;
      } catch {}
    }

    return false;
  }

  function setLiveComposerText(text) {
    try {
      const roots = Object.keys(globalThis).filter(key => key.startsWith("__reactFiber"));
      for (const key of roots) {
        const root = globalThis[key];
        let best = null;

        const visit = (node, depth) => {
          if (!node || depth > 220 || best) return;
          try {
            const props = node.memoizedProps;
            const looksLikeComposer = props
              && typeof props.onChangeText === "function"
              && (
                props.multiline === true
                || /message|chat/i.test(String(props.placeholder ?? ""))
              );

            if (looksLikeComposer) {
              best = node;
              return;
            }

            visit(node.child, depth + 1);
            if (!best) visit(node.sibling, depth + 1);
          } catch {}
        };

        visit(root, 0);
        if (!best) continue;

        try { best.memoizedProps.onChangeText(text); } catch {}
        try { best.stateNode?.focus?.(); } catch {}
        return true;
      }
    } catch {}

    return false;
  }

  function putInComposer(channelId, text) {
    let worked = saveDraft(channelId, text);

    setTimeout(() => {
      worked = setLiveComposerText(text) || worked;
      if (!worked) {
        try {
          const clipboard = vendetta.metro.common?.clipboard ?? findByProps("setString", "getString", "hasString");
          clipboard?.setString?.(text);
          toast("Mock copied — composer injection unavailable");
        } catch {
          toast("Could not place mock in composer");
        }
      }
    }, 120);

    return worked;
  }

  async function sendMock(channelId, text) {
    if (!MessageActions?.sendMessage || !channelId) return false;
    try {
      await MessageActions.sendMessage(channelId, {
        content: text,
        invalidEmojis: [],
        validNonShortcutEmojis: [],
        tts: false,
      });
      return true;
    } catch (error) {
      try { console.error("[QuickMock] send failed", error); } catch {}
      return false;
    }
  }

  function handleMessageMock(message) {
    const content = String(message?.content ?? "");
    if (!content) {
      toast("That message has no text to mock");
      return;
    }

    const mocked = mockify(content);
    const channelId = message?.channel_id ?? message?.channelId;

    try { ActionSheet?.hideActionSheet?.(); } catch {}

    if (storage.sendImmediately) {
      void sendMock(channelId, mocked).then(ok => {
        if (!ok) toast("Could not send mock");
      });
      return;
    }

    putInComposer(channelId, mocked);
  }

  function patchPendingReply() {
    try {
      const target = findByName?.("ChatInputContextBar", false);
      if (!target?.default) return null;

      return after("default", target, (args, result) => {
        try {
          const pending = args?.[0]?.pendingReply;
          cachedPendingReply = pending ?? null;
        } catch {}
        return result;
      });
    } catch {
      return null;
    }
  }

  function patchMessageActionSheet() {
    if (!ActionSheet?.openLazy || !FormRow || !findInReactTree) return null;

    return before("openLazy", ActionSheet, ([component, sheetName, context]) => {
      const message = context?.message;
      if (sheetName !== "MessageLongPressActionSheet" || !message?.content) return;

      component.then(instance => {
        const unpatchInstance = after("default", instance, (_args, tree) => {
          try { React.useEffect(() => () => unpatchInstance(), []); } catch {}

          const buttons = findInReactTree(
            tree,
            value => Array.isArray(value) && value?.[0]?.type?.name === "ButtonRow",
          );
          if (!buttons) return tree;

          if (buttons.some(button => button?.props?.label === "Mock")) return tree;

          const leading = FormIcon && mockIcon
            ? React.createElement(FormIcon, { style: { opacity: 1 }, source: mockIcon })
            : undefined;

          const row = React.createElement(FormRow, {
            label: "Mock",
            leading,
            onPress: () => handleMessageMock(message),
          });

          const replyIndex = buttons.findIndex(button => {
            const label = button?.props?.label ?? button?.props?.message;
            return typeof label === "string" && /reply/i.test(label);
          });

          buttons.splice(replyIndex >= 0 ? replyIndex + 1 : 0, 0, row);
          return tree;
        });
      }).catch?.(() => {});
    });
  }

  function registerMockCommand() {
    if (typeof vendetta.commands?.registerCommand !== "function") return null;

    return vendetta.commands.registerCommand({
      name: "mock",
      displayName: "mock",
      description: "mOcK text, or reply to a message and use /mock",
      displayDescription: "mOcK text, or reply to a message and use /mock",
      options: [
        {
          name: "message",
          displayName: "message",
          description: "Text to mock (optional when replying)",
          displayDescription: "Text to mock (optional when replying)",
          type: 3,
          required: false,
        },
      ],
      execute(args, ctx) {
        let text = optionValue(args, "message");

        if (text == null || String(text).length === 0) {
          const pending = resolvePendingMessage(ctx?.channel?.id);
          text = pending?.content;
        }

        if (text == null || String(text).length === 0) {
          toast("Reply to a text message or provide message:");
          return null;
        }

        return { content: mockify(text) };
      },
      applicationId: "-1",
      inputType: 1,
      type: 1,
    });
  }

  function Settings() {
    const [, forceUpdate] = React.useReducer(value => value + 1, 0);

    return React.createElement(
      RN.ScrollView,
      { contentContainerStyle: { padding: 16, paddingBottom: 32 } },
      React.createElement(RN.Text, {
        style: { color: "#F2F3F5", fontSize: 20, fontWeight: "700", marginBottom: 8 },
      }, "Quick Mock"),
      React.createElement(RN.Text, {
        style: { color: "#B5BAC1", fontSize: 14, lineHeight: 20, marginBottom: 18 },
      }, "Use /mock with text, reply to a message and use /mock with no argument, or long-press a message and tap Mock."),
      React.createElement(RN.View, {
        style: {
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          paddingVertical: 10,
        },
      },
      React.createElement(RN.View, { style: { flex: 1, paddingRight: 16 } },
        React.createElement(RN.Text, {
          style: { color: "#F2F3F5", fontSize: 16, fontWeight: "600", marginBottom: 3 },
        }, "Long-press sends immediately"),
        React.createElement(RN.Text, {
          style: { color: "#B5BAC1", fontSize: 13, lineHeight: 18 },
        }, storage.sendImmediately
          ? "Mock sends as soon as you tap the action."
          : "Default: put the mocked text in your composer so you can review it first."),
      ),
      React.createElement(RN.Switch, {
        value: !!storage.sendImmediately,
        onValueChange(value) {
          storage.sendImmediately = value;
          forceUpdate();
        },
      })),
    );
  }

  return {
    onLoad() {
      unregisterCommand = registerMockCommand();
      unpatchContextBar = patchPendingReply();
      unpatchActionSheet = patchMessageActionSheet();
    },
    onUnload() {
      try { unregisterCommand?.(); } catch {}
      try { unpatchContextBar?.(); } catch {}
      try { unpatchActionSheet?.(); } catch {}
      unregisterCommand = null;
      unpatchContextBar = null;
      unpatchActionSheet = null;
      cachedPendingReply = null;
    },
    settings: Settings,
  };
})();
