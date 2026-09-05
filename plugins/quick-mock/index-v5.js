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
  let liveInputProps = null;

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

    // Current Discord/Revenge uses an object payload. Keep old signatures only
    // as compatibility fallbacks for older Vendetta/Revenge builds.
    const attempts = [
      () => DraftManager.saveDraft({ channelId, type: 0, draft: text }),
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

  function findComposerProps(tree) {
    if (!findInReactTree || !tree) return null;

    try {
      return findInReactTree(
        tree,
        node => {
          const props = node?.props;
          if (typeof props?.onChangeText !== "function") return false;
          if (node?.type?.name === "ChatInput") return true;
          if (props?.multiline === true) return true;
          return /message|chat/i.test(String(props?.placeholder ?? ""));
        },
      )?.props ?? null;
    } catch {
      return null;
    }
  }

  function patchChatInput() {
    if (!findInReactTree) return null;

    const named = (() => {
      try { return findByName?.("ChatInput", false); } catch { return null; }
    })();
    const module = (() => {
      try { return findByProps("ChatInput"); } catch { return null; }
    })();
    const ChatInput = named ?? module?.ChatInput ?? module;

    if (!ChatInput?.prototype?.render) return null;

    try {
      return after("render", ChatInput.prototype, (_args, result) => {
        const props = findComposerProps(result?.props?.children ?? result);
        if (props?.onChangeText) liveInputProps = props;
        return result;
      });
    } catch {
      return null;
    }
  }

  function setLiveComposerText(text) {
    try {
      if (typeof liveInputProps?.onChangeText !== "function") return false;
      liveInputProps.onChangeText(text);
      try { liveInputProps?.inputRef?.current?.focus?.(); } catch {}
      try { liveInputProps?.textInputRef?.current?.focus?.(); } catch {}
      return true;
    } catch {
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

  function putInComposer(channelId, text) {
    // saveDraft is the current supported way to update Discord's composer.
    // Also poke the mounted input when available so the text appears instantly.
    const draftWorked = saveDraft(channelId, text);
    const liveWorked = setLiveComposerText(text);

    if (draftWorked || liveWorked) {
      // A second live poke after the action-sheet animation helps on builds that
      // temporarily remount the input while closing the sheet.
      setTimeout(() => setLiveComposerText(text), 180);
      return true;
    }

    setTimeout(() => {
      const retryDraft = saveDraft(channelId, text);
      const retryLive = setLiveComposerText(text);
      if (retryDraft || retryLive) return;

      if (copyFallback(text)) toast("Mock copied — tap Paste in the composer");
      else toast("Could not place mock in composer");
    }, 250);

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
            putInComposer(channelId, mocked);
            toast("Send failed — mock put in composer instead");
          }
        });
        return;
      }

      setTimeout(() => putInComposer(channelId, mocked), 80);
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
      const props = { label: "Mock", onPress };

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

      return React.createElement(FormRow, { label: "Mock", leading, onPress });
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
      for (const group of groups) {
        const rows = findInReactTree(
          group,
          value => Array.isArray(value) && value.some(child => child?.type?.name === "ActionSheetRow"),
        );
        if (!rows) continue;
        if (rows.some(child => child?.props?.label === "Mock")) return true;
        rows.unshift(row);
        return true;
      }
    }

    const actionRows = findInReactTree(
      tree,
      value => Array.isArray(value) && value.some(child => child?.type?.name === "ActionSheetRow"),
    );
    if (actionRows) {
      if (!actionRows.some(child => child?.props?.label === "Mock")) actionRows.unshift(row);
      return true;
    }

    const buttonRows = findInReactTree(
      tree,
      value => Array.isArray(value) && value.some(child => child?.type?.name === "ButtonRow"),
    );
    if (buttonRows) {
      if (!buttonRows.some(child => child?.props?.label === "Mock")) buttonRows.unshift(row);
      return true;
    }

    return false;
  }

  function patchMessageActionSheet() {
    if (!ActionSheet?.openLazy || !findInReactTree || !ActionSheetRow) return null;

    return before("openLazy", ActionSheet, ([component, sheetName, context]) => {
      const message = context?.message;
      if (sheetName !== "MessageLongPressActionSheet" || !message) return;

      component.then(instance => {
        const unpatchInstance = after("default", instance, (_args, tree) => {
          try { React.useEffect(() => () => unpatchInstance(), []); } catch {}
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
        "Long-press somebody's text message and tap Mock. By default the mocked text is placed in your composer so you can review it. Enable Long-press sends immediately below if you want one-tap sending."
      ),
      React.createElement(RN.Text, { style: { ...headingStyle, marginTop: 15 } }, "2. Reply → /mock"),
      React.createElement(RN.Text, { style: bodyStyle },
        "Reply to a message, type /mock with no message argument, then send. Quick Mock uses the message you replied to."
      ),
      React.createElement(RN.Text, { style: { ...headingStyle, marginTop: 15 } }, "3. /mock message:..."),
      React.createElement(RN.Text, { style: bodyStyle },
        "Use the slash command normally and enter any text in the message field."
      ),
      React.createElement(RN.Text, { style: codeStyle },
        "/mock message:I know everything\n→ i KnOw eVeRyThInG"
      ),
      React.createElement(RN.Text, { style: { ...bodyStyle, marginTop: 12 } },
        "Quick Mock alternates capitalization across letters only; spaces and punctuation do not change the pattern."
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
      unpatchChatInput = patchChatInput();
      unpatchActionSheet = patchMessageActionSheet();
    },
    onUnload() {
      try { unregisterCommand?.(); } catch {}
      try { unpatchContextBar?.(); } catch {}
      try { unpatchChatInput?.(); } catch {}
      try { unpatchActionSheet?.(); } catch {}
      unregisterCommand = null;
      unpatchContextBar = null;
      unpatchChatInput = null;
      unpatchActionSheet = null;
      cachedPendingReply = null;
      liveInputProps = null;
    },
    settings: Settings,
  };
})();
