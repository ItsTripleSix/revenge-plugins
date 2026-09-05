(() => {
  "use strict";

  const { before, after } = vendetta.patcher;
  const { findByName } = vendetta.metro;
  const findInReactTree = vendetta.utils?.findInReactTree;

  // Light gray: visible against AMOLED black without being as harsh as pure white.
  const DEFAULT_FOLDER_GRAY = parseInt("8A8A8A", 16);
  const MARKER = "__itsTripleSixFolderContrastDefault";

  const GuildFolderModule = (() => {
    try { return findByName?.("GuildsBarGuildFolder", false); }
    catch { return null; }
  })();

  let unpatchBefore = null;
  let unpatchAfter = null;

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

  function patchFolderRendering() {
    if (!GuildFolderModule?.default || !findInReactTree) return;

    // Discord derives the default folder accent from BRAND_500. Changing that
    // raw theme color would also recolor unrelated Discord UI, so only inject a
    // gray render color when the user has NOT chosen a folder color themselves.
    unpatchBefore = before("default", GuildFolderModule, args => {
      try {
        const props = args?.[0];
        const folder = props?.id;
        if (!folder || folder.color != null) return;

        args[0] = {
          ...props,
          id: cloneFolderNode(folder),
        };
      } catch {}
    });

    unpatchAfter = after("default", GuildFolderModule, (args, result) => {
      try {
        const folder = args?.[0]?.id;
        if (!folder?.[MARKER]) return result;

        // The injected gray should color the collapsed folder tile / folder
        // icon only. Discord also passes that color to the expanded-folder
        // background; clear it there so the AMOLED background stays black.
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
    },
  };
})();
