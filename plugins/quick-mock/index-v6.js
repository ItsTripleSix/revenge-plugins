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
  const MessageActions = findByProps("sendMessage", "editMessage");
  const PendingReplyStore = findByProps("getPendingReply");
  const ChatInputModule = findByProps("ChatInput");
  const ChatInput = ChatInputModule?.ChatInput;

  const ActionSheetRowModule = findByProps("ActionSheetRow");
  const ActionSheetRow = ActionSheetRowModule?.ActionSheetRow ?? Forms?.FormRow;
  const FormRow = Forms?.FormRow;
  const FormIcon = Forms?.FormIcon;

  const mockIcon = (() => {
    try {
      return getAssetIDByName?.("ic_edit_24px")
        ?? getAssetIDByName?.("PencilIcon")
        ?? getAssetIDByName?.("ChatIcon")
        ?? getAssetIDByName?.("Small");
    } catch {
      return undefined;
    }
  })();

  if (storage.sendImmediately == null) storage.sendImmediately = false;

  let unregisterCommand = null;
  let unpatchActionSheet = null;
  let unpatchContextBar = null;
  let unpatchChatInput = null;
  let cachedPendingReply = null;

  let liveComposerHandle = null;
  let liveComposerChannelId = null;
  let pendingComposerWrite = null;
  const wrappedRefs = new WeakMap();
  const retryTimers = new Set();

  function toast(text) {
    try { showToast?.(text, mockIcon); } catch {}
  }

  function mockify(value) {
    let upper = false;
    return Array.from(String(value ?? ""))
      .map(char => {
        if (!/[a-z]/i.test(char)) return char;
        const out = upper ? char.toUpperCase() : char.toLowerCase();
        upper = !upper;
        return out;
      })
      .join("");
  }

  function optionValue(args, name) {
    if (!Array.isArray(args)) return undefined;
    return args.find(arg => arg?.name === name)?.value;
  }

  function resolvePendingMessage(channelId) {
    let pending = null;

    try {
      pending = PendingReplyStore?.getPendingReply?.(channelId)
        ?? PendingReplyStore?.getPendingReply?.();
    } catch {}

    pending ??= cachedPendingReply;
    if (!pending) return null;

    const direct = pending.message ?? pending.reply ?? pending;
    if (direct?.content != null) return direct;

    const messageId = pending.messageId ?? pending.message_id ?? direct?.id;
    const pendingChannelId = pending.channelId ?? pending.channel_id ?? direct?.channel_id ?? channelId;

    if (messageId && pendingChannelId) {
      try { return MessageStore?.getMessage?.(pendingChannelId, messageId) ?? null; }
      catch {}
    }

    return null;
  }

  function clearRetryTimers() {
    for (const timer of retryTimers) {
      try { clearTimeout(timer); } catch {}
    }
    retryTimers.clear();
  }

  function runSoon(fn, delay) {
    const timer = setTimeout(() => {
      retryTimers.delete(timer);
      fn();
    }, delay);
    retryTimers.add(timer);
  }

  function captureComposerHandle(handle, channelId) {
    if (handle && typeof handle.setText === "function") {
      liveComposerHandle = handle;
      liveComposerChannelId = channelId ?? liveComposerChannelId;

      if (
        pendingComposerWrite
        && pendingComposerWrite.channelId === liveComposerChannelId
        && pendingComposerWrite.expires > Date.now()
      ) {
        const pending = pendingComposerWrite;
        pendingComposerWrite = null;
        runSoon(() => applyComposerText(pending.channelId, pending.text, false), 0);
      }
      return;
    }

    if (!handle && channelId && liveComposerChannelId === channelId) {
      liveComposerHandle = null;
    }
  }

  function forwardRef(originalRef, value) {
    try {
      if (typeof originalRef === "function") originalRef(value);
      else if (originalRef && typeof originalRef === "object") originalRef.current = value;
    } catch {}
  }

  function getWrappedRef(originalRef, channelId) {
    if ((typeof originalRef !== "object" || originalRef == null) && typeof originalRef !== "function") {
      return originalRef;
    }

    let entry = wrappedRefs.get(originalRef);
    if (!entry) {
      entry = {
        channelId,
        wrapper(value) {
          captureComposerHandle(value, entry.channelId);
          forwardRef(originalRef, value);
        },
      };
      wrappedRefs.set(originalRef, entry);
    }

    entry.channelId = channelId;

    try {
      if (originalRef && typeof originalRef === "object" && originalRef.current?.setText) {
        captureComposerHandle(originalRef.current, channelId);
      }
    } catch {}

    return entry.wrapper;
  }

  function patchCurrentChatInput() {
    if (!ChatInput) return null;

    // Current Discord mobile exports ChatInput as React.forwardRef, so the
    // actual function lives at ChatInput.render. Its forwarded ref exposes the
    // official imperative chat-input API, including setText()/focus().
    if (typeof ChatInput.render === "function") {
      try {
        return before("render", ChatInput, args => {
          try {
            const props = args?.[0];
            const channelId = props?.channel?.id ?? props?.channelId;
            const originalRef = args?.[1];
            if (originalRef) args[1] = getWrappedRef(originalRef, channelId);
          } catch {}
        });
      } catch {}
    }

    // Compatibility fallback for older Vendetta/Revenge builds where ChatInput
    // was a class component and exposed an inner onChangeText callback.
    if (ChatInput?.prototype?.render && findInReactTree) {
      try {
        return after("render", ChatInput.prototype, (args, result) => {
          try {
            const props = findInReactTree(
              result?.props?.children ?? result,
              node => typeof node?.props?.onChangeText === "function"
                && (node?.type?.name === "ChatInput" || node?.props?.multiline === true),
            )?.props;
            const channelId = args?.[0]?.channel?.id ?? args?.[0]?.channelId;
            if (props?.onChangeText) {
              captureComposerHandle({
                setText: props.onChangeText,
                focus() {
                  try { props?.inputRef?.current?.focus?.(); } catch {}
                  try { props?.textInputRef?.current?.focus?.(); } catch {}
                },
              }, channelId);
            }
          } catch {}
          return result;
        });
      } catch {}
    }

    return null;
  }

  function tryComposerText(channelId, text) {
    if (!liveComposerHandle || typeof liveComposerHandle.setText !== "function") return false;
    if (liveComposerChannelId && channelId && liveComposerChannelId !== channelId) return false;

    try {
      liveComposerHandle.setText(text);
      try { liveComposerHandle.focus?.(); } catch {}
      return true;
    } catch (error) {
      try { console.error("[QuickMock] ChatInput.setText failed", error); } catch {}
      return false;
    }
  }

  function copyFallback(text) {
    try {
      const clipboard = vendetta.metro.common?.clipboard
        ?? findByProps("setString", "getString", "hasString")
        ?? findByProps("setStringAsync", "getStringAsync");

      if (typeof clipboard?.setString === "function") {
        clipboard.setString(text);
        return true;
      }
      if (typeof clipboard?.setStringAsync === "function") {
        void clipboard.setStringAsync(text);
        return true;
      }
    } catch {}
    return false;
  }

  function applyComposerText(channelId, text, allowQueue = true) {
    if (tryComposerText(channelId, text)) {
      pendingComposerWrite = null;
      return true;
    }

    if (!allowQueue) return false;

    pendingComposerWrite = {
      channelId,
      text,
      expires: Date.now() + 1800,
    };

    // Closing a message action sheet can briefly remount ChatInput. Retry the
    // official setText API as that ref becomes live again.
    for (const delay of [80, 180, 350, 650, 1050]) {
      runSoon(() => {
        if (!pendingComposerWrite) return;
        if (pendingComposerWrite.expires <= Date.now()) return;
        if (tryComposerText(channelId, text)) pendingComposerWrite = null;
      }, delay);
    }

    runSoon(() => {
      if (!pendingComposerWrite) return;
      if (pendingComposerWrite.channelId !== channelId || pendingComposerWrite.text !== text) return;
      pendingComposerWrite = null;
      if (copyFallback(text)) toast("Mock copied — composer API was unavailable");
      else toast("Could not place mock in composer");
    }, 1400);

    return false;
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
    try {
      const original = (() => {
        try {
          return MessageStore?.getMessage?.(
            message?.channel_id ?? message?.channelId,
            message?.id,
          ) ?? message;
        } catch {
          return message;
        }
      })();

      const content = String(original?.content ?? message?.content ?? "");
      if (!content) {
        try { ActionSheet?.hideActionSheet?.(); } catch {}
        toast("That message has no text to mock");
        return;
      }

      const mocked = mockify(content);
      const channelId = original?.channel_id
        ?? original?.channelId
        ?? message?.channel_id
        ?? message?.channelId;

      try { ActionSheet?.hideActionSheet?.(); } catch {}

      if (storage.sendImmediately) {
        void sendMock(channelId, mocked).then(ok => {
          if (!ok) {
            applyComposerText(channelId, mocked);
            toast("Send failed — trying composer instead");
          }
        });
        return;
      }

      runSoon(() => applyComposerText(channelId, mocked), 80);
    } catch (error) {
      try { console.error("[QuickMock] Mock action failed", error); } catch {}
      toast("Mock action failed");
    }
  }

  function patchPendingReply() {
    try {
      const target = findByName?.("ChatInputContextBar", false);
      if (!target?.default) return null;

      return after("default", target, (args, result) => {
        try { cachedPendingReply = args?.[0]?.pendingReply ?? null; } catch {}
        return result;
      });
    } catch {
      return null;
    }
  }

  function buildMockRow(message) {
    const onPress = () => handleMessageMock(message);

    if (ActionSheetRowModule?.ActionSheetRow && ActionSheetRow === ActionSheetRowModule.ActionSheetRow) {
      const props = { label: "Mock", onPress, key: "quick-mock" };

      try {
        if (mockIcon && ActionSheetRow.Icon) {
          props.icon = React.createElement(ActionSheetRow.Icon, {
            source: mockIcon,
            IconComponent: () => React.createElement(RN.Image, {
              resizeMode: "contain",
              style: { width: 24, height: 24 },
              source: mockIcon,
            }),
          });
        }
      } catch {}

      return React.createElement(ActionSheetRow, props);
    }

    if (FormRow) {
      let leading;
      try {
        leading = FormIcon && mockIcon
          ? React.createElement(FormIcon, { style: { opacity: 1 }, source: mockIcon })
          : undefined;
      } catch {}

      return React.createElement(FormRow, { key: "quick-mock", label: "Mock", leading, onPress });
    }

    return null;
  }

  function injectMockRow(tree, message) {
    if (!findInReactTree) return false;

    const row = buildMockRow(message);
    if (!row) return false;

    const groups = findInReactTree(
      tree,
      value => Array.isArray(value) && value?.[0]?.type?.name === "ActionSheetRowGroup",
    );

    if (groups?.length) {
      const preferredGroups = [groups[1], ...groups].filter(Boolean);
      for (const group of preferredGroups) {
        const rows = group?.props?.children;
        if (!Array.isArray(rows)) continue;
        if (rows.some(child => child?.key === "quick-mock" || child?.props?.label === "Mock")) return true;

        const copyIndex = rows.findIndex(child =>
          child?.props?.label?.toUpperCase?.()?.includes("COPY")
          || child?.props?.message?.toUpperCase?.()?.includes("COPY")
        );
        if (copyIndex >= 0) rows.splice(copyIndex, 0, row);
        else rows.push(row);
        return true;
      }
    }

    const actionRows = findInReactTree(
      tree,
      value => Array.isArray(value) && value.some(child => child?.type?.name === "ActionSheetRow"),
    );
    if (actionRows) {
      if (!actionRows.some(child => child?.key === "quick-mock" || child?.props?.label === "Mock")) actionRows.unshift(row);
      return true;
    }

    const buttonRows = findInReactTree(
      tree,
      value => Array.isArray(value) && value.some(child => child?.type?.name === "ButtonRow"),
    );
    if (buttonRows) {
      if (!buttonRows.some(child => child?.key === "quick-mock" || child?.props?.label === "Mock")) buttonRows.unshift(row);
      return true;
    }

    return false;
  }

  function patchMessageActionSheet() {
    if (!ActionSheet?.openLazy || !findInReactTree || !ActionSheetRow) return null;

    return before("openLazy", ActionSheet, ([component, sheetName, context]) => {
      const message = context?.message;
      if (sheetName !== "MessageLongPressActionSheet" || !message) return;

      Promise.resolve(component).then(instance => {
        if (!instance || typeof instance.default !== "function") return;

        const unpatchInstance = after("default", instance, (_args, tree) => {
          try { React.useEffect(() => () => { try { unpatchInstance(); } catch {} }, []); } catch {}
          try { injectMockRow(tree, message); }
          catch (error) {
            try { console.error("[QuickMock] action-sheet injection failed", error); } catch {}
          }
          return tree;
        });
      }).catch?.(error => {
        try { console.error("[QuickMock] action sheet load failed", error); } catch {}
      });
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
          text = resolvePendingMessage(ctx?.channel?.id)?.content;
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
    const [helpOpen, setHelpOpen] = React.useState(false);

    const headingStyle = { color: "#F2F3F5", fontSize: 15, fontWeight: "700", marginBottom: 4 };
    const bodyStyle = { color: "#B5BAC1", fontSize: 13, lineHeight: 19 };
    const codeStyle = {
      color: "#DBDEE1",
      fontSize: 13,
      lineHeight: 19,
      fontFamily: "monospace",
      backgroundColor: "#1E1F22",
      padding: 10,
      borderRadius: 6,
      marginTop: 7,
    };

    const help = helpOpen ? React.createElement(
      RN.View,
      {
        style: {
          backgroundColor: "#2B2D31",
          borderRadius: 8,
          padding: 12,
          marginTop: 8,
          marginBottom: 18,
        },
      },
      React.createElement(RN.Text, { style: headingStyle }, "1. Long-press → Mock — fastest"),
      React.createElement(RN.Text, { style: bodyStyle },
        "Long-press a text message and tap Mock. By default the mocked text is placed in the composer using Discord's current ChatInput setText API."
      ),
      React.createElement(RN.Text, { style: { ...headingStyle, marginTop: 15 } }, "2. Reply → /mock"),
      React.createElement(RN.Text, { style: bodyStyle },
        "Reply to a message, type /mock with no message argument, then send. Quick Mock uses the replied-to message."
      ),
      React.createElement(RN.Text, { style: { ...headingStyle, marginTop: 15 } }, "3. /mock message:..."),
      React.createElement(RN.Text, { style: bodyStyle },
        "Use the slash command normally and enter any text in the message field."
      ),
      React.createElement(RN.Text, { style: codeStyle },
        "/mock message:I know everything\n→ i KnOw eVeRyThInG"
      ),
      React.createElement(RN.Text, { style: { ...bodyStyle, marginTop: 12 } },
        "Spaces and punctuation do not change the alternating capitalization pattern."
      ),
    ) : null;

    return React.createElement(
      RN.ScrollView,
      { contentContainerStyle: { padding: 16, paddingBottom: 32 } },
      React.createElement(RN.Text, {
        style: { color: "#F2F3F5", fontSize: 20, fontWeight: "700", marginBottom: 8 },
      }, "Quick Mock"),
      React.createElement(RN.Text, {
        style: { color: "#B5BAC1", fontSize: 14, lineHeight: 20, marginBottom: 14 },
      }, "Quickly turn text into alternating-case mOcK text."),
      React.createElement(
        RN.Pressable,
        {
          onPress: () => setHelpOpen(open => !open),
          style: {
            minHeight: 48,
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            paddingVertical: 11,
            paddingHorizontal: 12,
            borderRadius: 8,
            backgroundColor: "#2B2D31",
          },
        },
        React.createElement(RN.View, { style: { flex: 1, paddingRight: 12 } },
          React.createElement(RN.Text, {
            style: { color: "#F2F3F5", fontSize: 16, fontWeight: "600", marginBottom: 2 },
          }, "How to use"),
          React.createElement(RN.Text, {
            style: { color: "#B5BAC1", fontSize: 13 },
          }, "Long-press, reply command, and manual slash command"),
        ),
        React.createElement(RN.Text, {
          style: { color: "#B5BAC1", fontSize: 18, fontWeight: "700" },
        }, helpOpen ? "▲" : "▼"),
      ),
      help,
      React.createElement(RN.View, {
        style: {
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          paddingVertical: 14,
          marginTop: helpOpen ? 0 : 12,
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
          : "Default: place mocked text in the composer so you can review it first."),
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
      unpatchChatInput = patchCurrentChatInput();
      unpatchActionSheet = patchMessageActionSheet();
    },
    onUnload() {
      try { unregisterCommand?.(); } catch {}
      try { unpatchContextBar?.(); } catch {}
      try { unpatchChatInput?.(); } catch {}
      try { unpatchActionSheet?.(); } catch {}
      clearRetryTimers();
      unregisterCommand = null;
      unpatchContextBar = null;
      unpatchChatInput = null;
      unpatchActionSheet = null;
      cachedPendingReply = null;
      liveComposerHandle = null;
      liveComposerChannelId = null;
      pendingComposerWrite = null;
    },
    settings: Settings,
  };
})();
