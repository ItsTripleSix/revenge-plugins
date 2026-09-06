(() => {
  "use strict";

  const { before } = vendetta.patcher;
  const { findByProps } = vendetta.metro;
  const { ReactNative: RN } = vendetta.metro.common;
  const showToast = vendetta.ui?.toasts?.showToast;

  const TextModule = (() => {
    try { return findByProps("Text", "Heading", "TextStyleSheet"); }
    catch { return null; }
  })();

  let unpatchText = null;
  let hitShown = false;

  function flatten(style) {
    try { return RN.StyleSheet?.flatten?.(style) ?? {}; }
    catch { return {}; }
  }

  function collectText(value, depth = 0) {
    if (depth > 5 || value == null || value === false) return "";
    if (typeof value === "string" || typeof value === "number") return String(value);
    if (Array.isArray(value)) return value.map(v => collectText(v, depth + 1)).join("");
    if (typeof value === "object") {
      try { return collectText(value.props?.children, depth + 1); }
      catch { return ""; }
    }
    return "";
  }

  function looksLikeMentionProps(props) {
    const text = collectText(props?.children).trim();
    if (!text.startsWith("@") || text.length < 2) return false;

    const flat = flatten(props?.style);
    return props?.accessibilityRole === "button"
      || flat?.backgroundColor != null
      || flat?.borderRadius != null
      || flat?.paddingHorizontal != null;
  }

  function patchTextRenderer() {
    const target = TextModule?.Text;
    if (!target || typeof target.render !== "function") return null;

    try {
      return before("render", target, args => {
        try {
          const props = args?.[0];
          if (!props || !looksLikeMentionProps(props)) return;

          const text = collectText(props.children).trim();
          props.color = undefined;
          props.style = [
            props.style,
            {
              color: "#00FFFF",
              backgroundColor: "#FF00FF",
              borderRadius: 3,
              paddingHorizontal: 2,
            },
          ];

          if (!hitShown) {
            hitShown = true;
            try { showToast?.(`Mention probe v3 HIT ${text}`); } catch {}
          }
        } catch {}
      });
    } catch {
      return null;
    }
  }

  return {
    onLoad() {
      hitShown = false;
      unpatchText = patchTextRenderer();
      try { showToast?.(unpatchText ? "Mention probe v3 loaded" : "Mention probe v3: Text hook unavailable"); } catch {}
    },

    onUnload() {
      try { unpatchText?.(); } catch {}
      unpatchText = null;
      hitShown = false;
    },
  };
})();
