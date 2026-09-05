(() => {
  "use strict";

  const { before } = vendetta.patcher;
  const { findByProps } = vendetta.metro;

  // Visible against AMOLED black without being as harsh as pure white.
  const DEFAULT_FOLDER_GRAY = parseInt("8A8A8A", 16);

  const GuildFolderModule = (() => {
    try { return findByProps?.("GuildsBarGuildFolderBG"); }
    catch { return null; }
  })();

  const defaultFolderIds = new Set();
  const unpatches = [];

  function patchComponent(component, callback) {
    if (!component) return false;

    try {
      // Current Discord exports these folder components through React.memo.
      if (typeof component.type === "function") {
        unpatches.push(before("type", component, callback));
        return true;
      }
    } catch {}

    return false;
  }

  function cloneFolderNode(folder) {
    try {
      return Object.assign(
        Object.create(Object.getPrototypeOf(folder) ?? Object.prototype),
        folder,
        { color: DEFAULT_FOLDER_GRAY },
      );
    } catch {
      return { ...folder, color: DEFAULT_FOLDER_GRAY };
    }
  }

  function patchFolderRendering() {
    const main = GuildFolderModule?.default;
    const background = GuildFolderModule?.GuildsBarGuildFolderBG;

    patchComponent(main, args => {
      try {
        const props = args?.[0];
        const folder = props?.id;
        if (!folder || folder.id == null) return;

        const key = String(folder.id);

        // A null/undefined color means the user has left this folder on
        // Discord's default color. Only those folders receive our gray accent.
        if (folder.color == null) {
          defaultFolderIds.add(key);
          args[0] = {
            ...props,
            id: cloneFolderNode(folder),
          };
        } else {
          // The user selected a real Discord folder color: leave it untouched.
          defaultFolderIds.delete(key);
        }
      } catch {}
    });

    patchComponent(background, args => {
      try {
        const props = args?.[0];
        if (!props || props.folderId == null) return;

        // The parent uses gray so the collapsed folder tile / expanded folder
        // icon is visible. Strip that synthetic color only from the expanded
        // folder background so AMOLED black remains black.
        if (
          defaultFolderIds.has(String(props.folderId))
          && props.color === DEFAULT_FOLDER_GRAY
        ) {
          args[0] = { ...props, color: null };
        }
      } catch {}
    });
  }

  return {
    onLoad() {
      patchFolderRendering();
    },
    onUnload() {
      for (const unpatch of unpatches.splice(0)) {
        try { unpatch?.(); } catch {}
      }
      defaultFolderIds.clear();
    },
  };
})();
