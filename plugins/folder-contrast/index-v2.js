(() => {
  "use strict";

  const { before, after } = vendetta.patcher;
  const { findByProps, findByName } = vendetta.metro;
  const findInReactTree = vendetta.utils?.findInReactTree;

  // Visible against AMOLED black without being as harsh as pure white.
  const DEFAULT_FOLDER_GRAY = parseInt("B3B3B3", 16);
  const MARKER = "__itsTripleSixFolderContrastDefault";

  // Current Discord exports the folder component as React.memo, so the real
  // render function lives at default.type. The named BG export gives us a much
  // more reliable module anchor than trying to find the memo wrapper by name.
  const GuildFolderModule = (() => {
    try {
      const exact = findByProps?.("GuildsBarGuildFolderBG");
      if (exact?.default) return exact;
    } catch {}

    try {
      const byName = findByName?.("GuildsBarGuildFolder", false);
      if (byName?.default) return byName;
    } catch {}

    return null;
  })();

  const GuildFolderConstants = (() => {
    try { return findByProps?.("DEFAULT_FOLDER_COLOR", "GuildPeekCardTypes"); }
    catch { return null; }
  })();

  let unpatchBefore = null;
  let unpatchAfter = null;
  let patchTarget = null;
  let patchKey = null;

  function isDiscordDefaultColor(color) {
    if (color == null) return true;

    try {
      const defaultColor = GuildFolderConstants?.DEFAULT_FOLDER_COLOR;
      return defaultColor != null && Number(color) === Number(defaultColor);
    } catch {
      return false;
    }
  }

  function cloneFolderNode(folder) {
    try {
      const clone = Object.assign(
        Object.create(Object.getPrototypeOf(folder) ?? Object.prototype),
        folder,
      );
      clone.color = DEFAULT_FOLDER_GRAY;
      clone[MARKER] = true;
      return clone;
    } catch {
      return { ...folder, color: DEFAULT_FOLDER_GRAY, [MARKER]: true };
    }
  }

  function resolvePatchTarget() {
    const def = GuildFolderModule?.default;

    // Current Discord: React.memo({ type: GuildsBarGuildFolder, ... }).
    if (def && typeof def.type === "function") {
      return { target: def, key: "type" };
    }

    // Compatibility fallback for older builds where default itself rendered.
    if (GuildFolderModule && typeof def === "function") {
      return { target: GuildFolderModule, key: "default" };
    }

    return null;
  }

  function patchFolderRendering() {
    if (!findInReactTree) return;

    const resolved = resolvePatchTarget();
    if (!resolved) return;

    patchTarget = resolved.target;
    patchKey = resolved.key;

    // Only alter an EXPANDED folder that is still using Discord's default
    // color. Collapsed folder previews remain black with the AMOLED theme, and
    // any color explicitly selected by the user remains completely untouched.
    unpatchBefore = before(patchKey, patchTarget, args => {
      try {
        const props = args?.[0];
        const folder = props?.id;
        if (!folder || !folder.expanded || !isDiscordDefaultColor(folder.color)) return;

        args[0] = {
          ...props,
          id: cloneFolderNode(folder),
        };
      } catch {}
    });

    unpatchAfter = after(patchKey, patchTarget, (args, result) => {
      try {
        const folder = args?.[0]?.id;
        if (!folder?.[MARKER]) return result;

        // Discord reuses the same folder color for the tall expanded-folder
        // background. Remove only that injected gray there, so the folder icon
        // is gray while the surrounding folder background stays AMOLED black.
        const bg = findInReactTree(
          result,
          node => node?.props
            && node.props.folderId === folder.id
            && node.props.color === DEFAULT_FOLDER_GRAY
            && Object.prototype.hasOwnProperty.call(node.props, "totalItems"),
        );

        if (bg?.props) bg.props.color = null;
      } catch {}

      return result;
    });
  }

  return {
    onLoad() {
      patchFolderRendering();
    },
    onUnload() {
      try { unpatchBefore?.(); } catch {}
      try { unpatchAfter?.(); } catch {}
      unpatchBefore = null;
      unpatchAfter = null;
      patchTarget = null;
      patchKey = null;
    },
  };
})();
