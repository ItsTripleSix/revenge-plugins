(() => {
  "use strict";

  const { after } = vendetta.patcher;
  const { findByProps } = vendetta.metro;
  const { React, ReactNative: RN } = vendetta.metro.common;
  const storage = vendetta.plugin.storage;
  const showToast = vendetta.ui?.toasts?.showToast;

  const MarkupParsers = (() => {
    try { return findByProps("parseMessageMarkup", "parseEmbedTitleMarkup"); }
    catch { return null; }
  })();

  const DEFAULTS = {
    mode: "gradient",
    solidColor: "#00FFFF",
    gradient1: "#00FFFF",
    gradient2: "#FF00FF",
    gradient3: "#00FFFF",
  };

  for (const [key, value] of Object.entries(DEFAULTS)) {
    try { if (storage[key] == null) storage[key] = value; } catch {}
  }

  // Native row re-dispatch animation proved unsafe across channel transitions.
  // Any install upgrading from the animated probes is reset to a static mode.
  try {
    if (storage.mode === "animated") storage.mode = "gradient";
    storage.safetyResetVersion = 11;
  } catch {}

  let unpatch = null;

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

  function applyMentionStyle(node) {
    const mode = storage.mode ?? "gradient";
    if (mode === "discord") return;

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

  function tintMentions(value, seen = new Set()) {
    if (value == null || typeof value !== "object") return 0;
    if (seen.has(value)) return 0;
    seen.add(value);

    let hits = 0;
    if (Array.isArray(value)) {
      for (const child of value) hits += tintMentions(child, seen);
      return hits;
    }

    if (value.type === "mention") {
      hits++;
      applyMentionStyle(value);
    }

    for (const key of Object.keys(value)) {
      if (key === "parent" || key === "_parent") continue;
      hits += tintMentions(value[key], seen);
    }
    return hits;
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

  function Settings() {
    const [, rerender] = React.useReducer(v => v + 1, 0);
    const page = { padding: 16, gap: 14 };
    const card = { backgroundColor: "#111214", borderRadius: 12, padding: 14, gap: 10 };
    const title = { color: "#F2F3F5", fontSize: 17, fontWeight: "700" };
    const label = { color: "#F2F3F5", fontSize: 14, fontWeight: "600" };
    const text = { color: "#B5BAC1", fontSize: 13, lineHeight: 18 };

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
        React.createElement(RN.Text, { style: title }, "Mention Tag Probe v11"),
        React.createElement(RN.Text, { style: text },
          "Safe static build. Native row re-dispatch animation has been removed because it can corrupt chat state during channel transitions. Solid and gradient mention styling remain enabled."
        ),
      ),
      React.createElement(RN.View, { style: card },
        React.createElement(RN.Text, { style: label }, "Text mode"),
        React.createElement(Choice, {
          value: storage.mode,
          options: [
            { value: "discord", label: "Discord" },
            { value: "solid", label: "Solid" },
            { value: "gradient", label: "Gradient" },
          ],
          onChange: value => { storage.mode = value; },
        }),
        storage.mode === "solid" ? React.createElement(ColorInput, {
          labelText: "Text color",
          storageKey: "solidColor",
          fallback: "#00FFFF",
        }) : null,
        storage.mode === "gradient" ? React.createElement(RN.View, { style: { gap: 8 } },
          React.createElement(ColorInput, {
            labelText: "Gradient color 1",
            storageKey: "gradient1",
            fallback: "#00FFFF",
          }),
          React.createElement(ColorInput, {
            labelText: "Gradient color 2",
            storageKey: "gradient2",
            fallback: "#FF00FF",
          }),
          React.createElement(ColorInput, {
            labelText: "Gradient color 3",
            storageKey: "gradient3",
            fallback: "#00FFFF",
          }),
        ) : null,
      ),
    );
  }

  return {
    onLoad() {
      unpatch = patchNativeMentionAst();
      try {
        showToast?.(unpatch ? "Mention probe v11 loaded - safe static mode" : "Mention probe v11: AST hook unavailable");
      } catch {}
    },

    onUnload() {
      try { unpatch?.(); } catch {}
      unpatch = null;
    },

    settings: Settings,
  };
})();
