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

  function flatten(style) {
    try { return RN.StyleSheet?.flatten?.(style) ?? {}; }
    catch { return {}; }
  }

  function looksLikeInlineMention(style) {
    const flat = flatten(style);
    return flat
      && flat.backgroundColor != null
      && Number(flat.borderRadius) === 3
      && Number(flat.paddingHorizontal) === 2;
  }

  function patchTextRenderer() {
    const target = TextModule?.Text;
    if (!target || typeof target.render !== "function") return null;

    try {
      return before("render", target, args => {
        try {
          const props = args?.[0];
          if (!props || !looksLikeInlineMention(props.style)) return;
          props.style = [
            props.style,
            {
              color: "#00FFFF",
              backgroundColor: "#FF00FF",
              borderRadius: 3,
              paddingHorizontal: 2,
            },
          ];
        } catch {}
      });
    } catch {
      return null;
    }
  }

  return {
    onLoad() {
      unpatchText = patchTextRenderer();
      try { showToast?.(unpatchText ? "Mention probe v2 loaded" : "Mention probe v2: Text hook unavailable"); } catch {}
    },

    onUnload() {
      try { unpatchText?.(); } catch {}
      unpatchText = null;
    },
  };
})();
