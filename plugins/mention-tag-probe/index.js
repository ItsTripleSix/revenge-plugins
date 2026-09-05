(() => {
  "use strict";

  const { after } = vendetta.patcher;
  const { findByProps } = vendetta.metro;
  const { React, ReactNative: RN } = vendetta.metro.common;

  const MarkupUtils = (() => {
    try { return findByProps("combineAndInjectMentionRule", "createReactRules"); }
    catch { return null; }
  })();

  const cleanups = [];
  const wrappedRules = new WeakMap();

  function flatten(style) {
    try { return RN.StyleSheet?.flatten?.(style) ?? {}; }
    catch { return {}; }
  }

  function styleMentionElement(element) {
    if (!element?.props) return element;

    const baseStyles = element.props.styles ?? {};
    const mentionBase = flatten(baseStyles.mention);
    const nextStyles = {
      ...baseStyles,
      mention: {
        ...mentionBase,
        color: "#00FFFF",
        backgroundColor: "#FF00FF",
        borderRadius: mentionBase.borderRadius ?? 3,
        paddingHorizontal: mentionBase.paddingHorizontal ?? 2,
      },
    };

    const nextState = {
      ...(element.props.state ?? {}),
      textColor: "#00FFFF",
    };

    try {
      return React.cloneElement(element, {
        styles: nextStyles,
        state: nextState,
      });
    } catch {
      return element;
    }
  }

  function patchRules(rules) {
    const rule = rules?.mention;
    if (!rule || typeof rule.react !== "function") return;
    if (wrappedRules.has(rule)) return;

    const original = rule.react;
    const wrapped = function (...args) {
      let element;
      try { element = original.apply(this, args); }
      catch { return original.apply(this, args); }
      return styleMentionElement(element);
    };

    wrappedRules.set(rule, { original, wrapped });
    try { rule.react = wrapped; }
    catch { return; }

    cleanups.push(() => {
      try {
        const info = wrappedRules.get(rule);
        if (info && rule.react === info.wrapped) rule.react = info.original;
      } catch {}
    });
  }

  return {
    onLoad() {
      try { patchRules(MarkupUtils?.defaultRules); } catch {}

      if (MarkupUtils && typeof MarkupUtils.createReactRules === "function") {
        try {
          cleanups.push(after("createReactRules", MarkupUtils, (_args, result) => {
            try { patchRules(result); } catch {}
            return result;
          }));
        } catch {}
      }
    },

    onUnload() {
      while (cleanups.length) {
        try { cleanups.pop()?.(); } catch {}
      }
    },
  };
})();
