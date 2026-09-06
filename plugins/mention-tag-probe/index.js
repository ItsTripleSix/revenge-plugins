(() => {
  "use strict";

  const { after, before } = vendetta.patcher;
  const { findByProps } = vendetta.metro;
  const { React, ReactNative: RN } = vendetta.metro.common;
  const storage = vendetta.plugin.storage;
  const showToast = vendetta.ui?.toasts?.showToast;

  const MarkupParsers = (() => {
    try { return findByProps("parseMessageMarkup", "parseEmbedTitleMarkup"); }
    catch { return null; }
  })();

  const NativeChatUtils = (() => {
    try { return findByProps("updateRows", "scrollToBottom", "scrollIntoView"); }
    catch { return null; }
  })();

  const SelectedChannelStore = (() => {
    try { return findByProps("getChannelId", "getVoiceChannelId", "getCurrentlySelectedChannelId"); }
    catch { return null; }
  })();

  const DEFAULTS = {
    mode: "gradient",
    solidColor: "#00FFFF",
    gradient1: "#00FFFF",
    gradient2: "#FF00FF",
    gradient3: "#00FFFF",
    speed: "normal",
  };

  for (const [key, value] of Object.entries(DEFAULTS)) {
    try { if (storage[key] == null) storage[key] = value; } catch {}
  }

  // v9 could keep stale native rows when Discord reused the same chat view for
  // another channel. Do not auto-resume animation after updating into this fix.
  try {
    if (storage.safetyResetVersion !== 10) {
      storage.mode = "gradient";
      storage.safetyResetVersion = 10;
    }
  } catch {}

  let unpatchAst = null;
  let unpatchNativeRows = null;
  let animationTimer = null;
  let appStateSubscription = null;
  let selectedChannelListener = null;
  let activeChatRef = null;
  let activeChannelId = null;
  const activeMentionRows = new Map();
  let internalNativeUpdate = false;
  const animationEpoch = Date.now();
  const FRAME_MS = 60;
  const MAX_TRACKED_ROWS = 24;

  function normalizeHex(value, fallback) {
    let text = String(value ?? "").trim();
    if (!text) return fallback;
    if (!text.startsWith("#")) text = `#${text}`;
    if (!/^#[0-9a-fA-F]{6}$/.test(text)) return fallback;
    return text.toUpperCase();
  }

  function hexInt(value, fallback = "#FFFFFF") {
    return parseInt(normalizeHex(value, fallback).slice(1), 16);
  }

  function speedMs() {
    if (storage.speed === "slow") return 7000;
    if (storage.speed === "fast") return 1800;
    return 3600;
  }

  function hsvInt(h, s = 1, v = 1) {
    h = ((h % 1) + 1) % 1;
    const i = Math.floor(h * 6);
    const f = h * 6 - i;
    const p = v * (1 - s);
    const q = v * (1 - f * s);
    const t = v * (1 - (1 - f) * s);
    let r, g, b;
    switch (i % 6) {
      case 0: r = v; g = t; b = p; break;
      case 1: r = q; g = v; b = p; break;
      case 2: r = p; g = v; b = t; break;
      case 3: r = p; g = q; b = v; break;
      case 4: r = t; g = p; b = v; break;
      default: r = v; g = p; b = q; break;
    }
    return (Math.round(r * 255) << 16) | (Math.round(g * 255) << 8) | Math.round(b * 255);
  }

  function intHex(value) {
    return `#${Number(value >>> 0).toString(16).padStart(6, "0").slice(-6)}`.toUpperCase();
  }

  function selectedChannelId() {
    try {
      const id = SelectedChannelStore?.getChannelId?.()
        ?? SelectedChannelStore?.getCurrentlySelectedChannelId?.();
      return id == null ? null : String(id);
    } catch {
      return null;
    }
  }

  function rowChannelId(row) {
    const id = row?.message?.channelId
      ?? row?.message?.channel_id
      ?? row?.channelId
      ?? row?.channel_id;
    return id == null ? null : String(id);
  }

  function rowMessageId(row) {
    const id = row?.message?.id ?? row?.messageId ?? row?.id;
    return id == null ? null : String(id);
  }

  function cloneRow(row) {
    try { return JSON.parse(JSON.stringify(row)); }
    catch { return null; }
  }

  function applyAnimatedMentionStyle(node, now = Date.now()) {
    const duration = speedMs();
    const phase = (((now - animationEpoch) % duration) + duration) % duration / duration;
    const one = hsvInt(phase);
    const two = hsvInt(phase + 1 / 3);
    const three = hsvInt(phase + 2 / 3);
    node.color = one;
    node.colorString = intHex(one);
    node.roleColor = one;
    node.roleColors = {
      primaryColor: one,
      secondaryColor: two,
      tertiaryColor: three,
    };
  }

  function applyMentionStyle(node, now = Date.now()) {
    const mode = storage.mode ?? "gradient";
    if (mode === "discord") return;

    if (mode === "animated") {
      applyAnimatedMentionStyle(node, now);
      return;
    }

    if (mode === "solid") {
      const hex = normalizeHex(storage.solidColor, "#00FFFF");
      const color = hexInt(hex);
      node.color = color;
      node.colorString = hex;
      node.roleColor = color;
      node.roleColors = {
        primaryColor: color,
        secondaryColor: color,
        tertiaryColor: color,
      };
      return;
    }

    const one = normalizeHex(storage.gradient1, "#00FFFF");
    const two = normalizeHex(storage.gradient2, "#FF00FF");
    const three = normalizeHex(storage.gradient3, one);
    node.color = hexInt(one);
    node.colorString = one;
    node.roleColor = hexInt(one);
    node.roleColors = {
      primaryColor: hexInt(one),
      secondaryColor: hexInt(two),
      tertiaryColor: hexInt(three),
    };
  }

  function collectMentions(value, out = [], seen = new Set()) {
    if (value == null || typeof value !== "object") return out;
    if (seen.has(value)) return out;
    seen.add(value);

    if (Array.isArray(value)) {
      for (const child of value) collectMentions(child, out, seen);
      return out;
    }

    if (value.type === "mention") out.push(value);

    for (const key of Object.keys(value)) {
      if (key === "parent" || key === "_parent") continue;
      collectMentions(value[key], out, seen);
    }
    return out;
  }

  function tintMentions(value) {
    const mentions = collectMentions(value);
    const now = Date.now();
    for (const node of mentions) applyMentionStyle(node, now);
    return mentions.length;
  }

  function patchNativeMentionAst() {
    if (!MarkupParsers || typeof MarkupParsers.parseMessageMarkup !== "function") return null;
    try {
      return after("parseMessageMarkup", MarkupParsers, (_args, result) => {
        try { tintMentions(result?.content); } catch {}
        return result;
      });
    } catch {
      return null;
    }
  }

  function stopAnimationTimer() {
    if (!animationTimer) return;
    clearInterval(animationTimer);
    animationTimer = null;
  }

  function resetTrackedRows(nextChannelId = null) {
    stopAnimationTimer();
    activeMentionRows.clear();
    activeChatRef = null;
    activeChannelId = nextChannelId == null ? null : String(nextChannelId);
  }

  function trimTrackedRows() {
    while (activeMentionRows.size > MAX_TRACKED_ROWS) {
      const first = activeMentionRows.keys().next().value;
      if (first == null) break;
      activeMentionRows.delete(first);
    }
  }

  function shiftTrackedIndexes(changeType, index) {
    if (!Number.isInteger(index)) return;

    if (changeType === 1) {
      for (const record of activeMentionRows.values()) {
        const current = record?.row?.index;
        if (Number.isInteger(current) && current >= index) record.row.index = current + 1;
      }
      return;
    }

    if (changeType === 3) {
      for (const [key, record] of Array.from(activeMentionRows.entries())) {
        const current = record?.row?.index;
        if (!Number.isInteger(current)) continue;
        if (current === index) activeMentionRows.delete(key);
        else if (current > index) record.row.index = current - 1;
      }
    }
  }

  function captureMentionRows(chatRef, packet) {
    if (internalNativeUpdate || !chatRef || !Array.isArray(packet?.rows)) return;

    const selected = selectedChannelId();
    if (!selected) {
      resetTrackedRows(null);
      return;
    }

    if (activeChannelId !== selected) resetTrackedRows(selected);

    const messageRows = packet.rows.filter(row => row?.message);
    const packetChannelIds = new Set(messageRows.map(rowChannelId).filter(Boolean));

    // Never let rows from a channel that is no longer selected become an
    // animation source. Discord often reuses the same native chat ref.
    if (packetChannelIds.size && (!packetChannelIds.has(selected) || packetChannelIds.size > 1)) {
      resetTrackedRows(selected);
      return;
    }

    activeChatRef = chatRef;

    const insertCount = packet.rows.reduce((n, row) => n + (row?.changeType === 1 ? 1 : 0), 0);
    const freshBatch = insertCount >= 4;
    if (freshBatch) activeMentionRows.clear();

    for (const row of packet.rows) {
      if (!row) continue;

      if (!freshBatch && (row.changeType === 1 || row.changeType === 3)) {
        shiftTrackedIndexes(row.changeType, row.index);
      }

      if (row.changeType !== 1 && row.changeType !== 2) continue;
      if (rowChannelId(row) !== selected) continue;

      const messageId = rowMessageId(row);
      if (!messageId) continue;

      const copy = cloneRow(row);
      if (!copy) continue;
      const mentions = collectMentions(copy);

      if (mentions.length) {
        activeMentionRows.delete(messageId);
        activeMentionRows.set(messageId, { row: copy, mentions });
      } else if (row.changeType === 2) {
        activeMentionRows.delete(messageId);
      }
    }

    trimTrackedRows();
    syncAnimationTimer();
  }

  function patchNativeRowDispatch() {
    if (!NativeChatUtils || typeof NativeChatUtils.updateRows !== "function") return null;
    try {
      return before("updateRows", NativeChatUtils, args => {
        try { captureMentionRows(args?.[0], args?.[1]); } catch {}
      });
    } catch {
      return null;
    }
  }

  function isAppActive() {
    return !RN.AppState?.currentState || RN.AppState.currentState === "active";
  }

  function pushAnimatedRows() {
    if (storage.mode !== "animated" || !activeChatRef || !activeMentionRows.size || !isAppActive()) return;

    const selected = selectedChannelId();
    if (!selected || selected !== activeChannelId) {
      resetTrackedRows(selected);
      return;
    }

    const now = Date.now();
    const updates = [];

    for (const [key, record] of Array.from(activeMentionRows.entries())) {
      try {
        if (rowChannelId(record.row) !== selected || !Number.isInteger(record.row?.index)) {
          activeMentionRows.delete(key);
          continue;
        }
        for (const node of record.mentions) applyAnimatedMentionStyle(node, now);
        updates.push({ ...record.row, changeType: 2 });
      } catch {
        activeMentionRows.delete(key);
      }
    }

    if (!updates.length) {
      syncAnimationTimer();
      return;
    }

    try {
      internalNativeUpdate = true;
      NativeChatUtils.updateRows(activeChatRef, {
        rows: updates,
        isLoadingAtTop: false,
        scrollData: null,
        HACK_iOSForceAnimations: false,
        forceReload: false,
        isAnimated: false,
      });
    } catch (error) {
      try { console.error("[MentionTagProbe] native animation refresh failed", error); } catch {}
      resetTrackedRows(selected);
    } finally {
      internalNativeUpdate = false;
    }
  }

  function syncAnimationTimer() {
    const shouldRun = storage.mode === "animated"
      && activeChatRef
      && activeMentionRows.size > 0
      && activeChannelId === selectedChannelId()
      && isAppActive();

    if (!shouldRun) {
      stopAnimationTimer();
      return;
    }

    if (!animationTimer) animationTimer = setInterval(pushAnimatedRows, FRAME_MS);
  }

  function installAppStateListener() {
    try {
      appStateSubscription = RN.AppState?.addEventListener?.("change", state => {
        if (state === "active") syncAnimationTimer();
        else stopAnimationTimer();
      }) ?? null;
    } catch { appStateSubscription = null; }
  }

  function removeAppStateListener() {
    try { appStateSubscription?.remove?.(); } catch {}
    appStateSubscription = null;
  }

  function installSelectedChannelListener() {
    if (!SelectedChannelStore?.addChangeListener) return;
    const listener = () => {
      const selected = selectedChannelId();
      if (selected !== activeChannelId) resetTrackedRows(selected);
    };
    try {
      SelectedChannelStore.addChangeListener(listener);
      selectedChannelListener = listener;
    } catch { selectedChannelListener = null; }
  }

  function removeSelectedChannelListener() {
    if (!selectedChannelListener) return;
    try { SelectedChannelStore?.removeChangeListener?.(selectedChannelListener); } catch {}
    selectedChannelListener = null;
  }

  function Settings() {
    const [, rerender] = React.useReducer(v => v + 1, 0);
    const page = { padding: 16, gap: 14 };
    const card = { backgroundColor: "#111214", borderRadius: 12, padding: 14, gap: 10 };
    const title = { color: "#F2F3F5", fontSize: 17, fontWeight: "700" };
    const label = { color: "#F2F3F5", fontSize: 14, fontWeight: "600" };
    const text = { color: "#B5BAC1", fontSize: 13, lineHeight: 18 };

    function setValue(key, value) {
      storage[key] = value;
      syncAnimationTimer();
      rerender();
    }

    function Choice({ value, options, onChange }) {
      return React.createElement(RN.View, { style: { flexDirection: "row", gap: 6, flexWrap: "wrap" } },
        options.map(option => React.createElement(RN.Pressable, {
          key: option.value,
          onPress: () => { onChange(option.value); rerender(); },
          style: {
            paddingVertical: 8,
            paddingHorizontal: 11,
            borderRadius: 8,
            borderWidth: 1,
            borderColor: value === option.value ? "#FFFFFF" : "#4E5058",
            backgroundColor: value === option.value ? "#FFFFFF18" : "#00000000",
          },
        }, React.createElement(RN.Text, {
          style: { color: "#F2F3F5", fontWeight: value === option.value ? "700" : "500" },
        }, option.label)))
      );
    }

    function ColorInput({ labelText, storageKey, fallback }) {
      return React.createElement(RN.View, { style: { gap: 6 } },
        React.createElement(RN.Text, { style: label }, labelText),
        React.createElement(RN.TextInput, {
          value: String(storage[storageKey] ?? ""),
          autoCapitalize: "characters",
          autoCorrect: false,
          onChangeText(value) { storage[storageKey] = value; rerender(); },
          onEndEditing() {
            storage[storageKey] = normalizeHex(storage[storageKey], fallback);
            rerender();
          },
          style: {
            color: "#FFFFFF",
            backgroundColor: "#000000",
            borderWidth: 1,
            borderColor: "#4E5058",
            borderRadius: 8,
            paddingHorizontal: 10,
            paddingVertical: 8,
          },
        })
      );
    }

    return React.createElement(RN.ScrollView, { contentContainerStyle: page },
      React.createElement(RN.View, { style: card },
        React.createElement(RN.Text, { style: title }, "Mention Tag Probe v10"),
        React.createElement(RN.Text, { style: text }, "Safety hotfix: animation is pinned to the currently selected channel and stale native rows are discarded immediately on channel changes. Animation remains at the lighter ~16 FPS rate."),
      ),
      React.createElement(RN.View, { style: card },
        React.createElement(RN.Text, { style: label }, "Text mode"),
        React.createElement(Choice, {
          value: storage.mode,
          options: [
            { value: "discord", label: "Discord" },
            { value: "solid", label: "Solid" },
            { value: "gradient", label: "Gradient" },
            { value: "animated", label: "Animated spectrum" },
          ],
          onChange: value => setValue("mode", value),
        }),
        storage.mode === "solid" ? React.createElement(ColorInput, {
          labelText: "Text color", storageKey: "solidColor", fallback: "#00FFFF",
        }) : null,
        storage.mode === "gradient" ? React.createElement(RN.View, { style: { gap: 8 } },
          React.createElement(ColorInput, { labelText: "Gradient color 1", storageKey: "gradient1", fallback: "#00FFFF" }),
          React.createElement(ColorInput, { labelText: "Gradient color 2", storageKey: "gradient2", fallback: "#FF00FF" }),
          React.createElement(ColorInput, { labelText: "Gradient color 3", storageKey: "gradient3", fallback: "#00FFFF" }),
        ) : null,
        storage.mode === "animated" ? React.createElement(React.Fragment, null,
          React.createElement(RN.Text, { style: label }, "Speed"),
          React.createElement(Choice, {
            value: storage.speed,
            options: [
              { value: "slow", label: "Slow" },
              { value: "normal", label: "Normal" },
              { value: "fast", label: "Fast" },
            ],
            onChange: value => setValue("speed", value),
          }),
          React.createElement(RN.Text, { style: text }, "All tracked mention rows in the selected channel share one batched animation update."),
        ) : null,
      ),
    );
  }

  return {
    onLoad() {
      activeChannelId = selectedChannelId();
      installAppStateListener();
      installSelectedChannelListener();
      unpatchAst = patchNativeMentionAst();
      unpatchNativeRows = patchNativeRowDispatch();
      syncAnimationTimer();
      try {
        const ok = !!unpatchAst && !!unpatchNativeRows && !!SelectedChannelStore;
        showToast?.(ok ? "Mention probe v10 loaded - animation reset for safety" : "Mention probe v10: native hook unavailable");
      } catch {}
    },

    onUnload() {
      stopAnimationTimer();
      removeAppStateListener();
      removeSelectedChannelListener();
      try { unpatchAst?.(); } catch {}
      try { unpatchNativeRows?.(); } catch {}
      unpatchAst = null;
      unpatchNativeRows = null;
      activeChatRef = null;
      activeChannelId = null;
      activeMentionRows.clear();
    },

    settings: Settings,
  };
})();
