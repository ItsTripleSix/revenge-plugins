(() => {
  "use strict";

  const { after } = vendetta.patcher;
  const { findByProps } = vendetta.metro;
  const showToast = vendetta.ui?.toasts?.showToast;

  const MarkupParsers = (() => {
    try { return findByProps("parseMessageMarkup", "parseEmbedTitleMarkup"); }
    catch { return null; }
  })();

  let unpatch = null;
  let lastHitToast = 0;

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

      // Discord's native DCDChat consumes hydrated mention AST nodes rather
      // than the React MarkupMention component. Feed it every color field the
      // role-mention AST already supports so we can learn which ones it honors.
      value.color = 0x00FFFF;
      value.colorString = "#00FFFF";
      value.roleColor = 0x00FFFF;
      value.roleColors = {
        primaryColor: 0x00FFFF,
        secondaryColor: 0xFF00FF,
        tertiaryColor: 0x00FFFF,
      };
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
        try {
          const hits = tintMentions(result?.content);
          if (hits && Date.now() - lastHitToast > 1800) {
            lastHitToast = Date.now();
            showToast?.(`Mention probe v4 AST HIT x${hits}`);
          }
        } catch {}
        return result;
      });
    } catch {
      return null;
    }
  }

  return {
    onLoad() {
      unpatch = patchNativeMentionAst();
      try { showToast?.(unpatch ? "Mention probe v4 loaded" : "Mention probe v4: AST hook unavailable"); } catch {}
    },

    onUnload() {
      try { unpatch?.(); } catch {}
      unpatch = null;
    },
  };
})();
