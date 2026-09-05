(() => {
  "use strict";

  const { after, instead } = vendetta.patcher;
  const { findByProps } = vendetta.metro;
  const { ReactNative: RN } = vendetta.metro.common;

  const KEY = "__itsTripleSixHiddenChannelsRuntime";

  try { globalThis[KEY]?.cleanup?.(); } catch {}

  const runtime = {
    patches: [],
    patched: {},
    active: true,
    realCan: null,
    viewChannel: null,
    channelStore: null,
    cleanup: null,
  };

  globalThis[KEY] = runtime;

  function resolveViewChannelPermission() {
    if (runtime.viewChannel != null) return runtime.viewChannel;

    const commonConstants = vendetta.metro.common?.constants;
    const constantsModule =
      findByProps("Permissions", "ChannelTypes")
      ?? findByProps("Permissions");

    runtime.viewChannel =
      commonConstants?.Permissions?.VIEW_CHANNEL
      ?? constantsModule?.Permissions?.VIEW_CHANNEL
      ?? null;

    return runtime.viewChannel;
  }

  function resolveChannelStore() {
    if (runtime.channelStore) return runtime.channelStore;

    runtime.channelStore =
      findByProps("getChannel", "getDMFromUserId")
      ?? findByProps("getChannel");

    return runtime.channelStore;
  }

  function getGuildId(channel) {
    if (!channel || typeof channel !== "object") return null;
    try {
      return channel.guild_id
        ?? channel.guildId
        ?? channel.getGuildId?.()
        ?? null;
    } catch {
      return channel.guild_id ?? channel.guildId ?? null;
    }
  }

  function isGuildChannel(channel) {
    return !!channel
      && typeof channel === "object"
      && typeof channel.type === "number"
      && getGuildId(channel) != null;
  }

  function resolveChannel(channelOrId) {
    if (!channelOrId) return null;
    if (typeof channelOrId === "object") {
      if (channelOrId.channel && typeof channelOrId.channel === "object") {
        return channelOrId.channel;
      }
      return channelOrId;
    }

    try {
      return resolveChannelStore()?.getChannel?.(channelOrId) ?? null;
    } catch {
      return null;
    }
  }

  function isHidden(channelOrId) {
    const channel = resolveChannel(channelOrId);
    const viewChannel = resolveViewChannelPermission();

    if (!runtime.realCan || viewChannel == null || !isGuildChannel(channel)) {
      return false;
    }

    try {
      return runtime.realCan(viewChannel, channel) === false;
    } catch {
      return false;
    }
  }

  function samePermission(left, right) {
    if (left === right) return true;
    try { return String(left) === String(right); } catch { return false; }
  }

  function snowflakeDate(id) {
    try {
      const milliseconds = Number((BigInt(id) >> 22n) + 1420070400000n);
      const date = new Date(milliseconds);
      return Number.isNaN(date.getTime()) ? null : date;
    } catch {
      return null;
    }
  }

  function channelTypeName(channel) {
    const names = {
      0: "Text",
      2: "Voice",
      4: "Category",
      5: "Announcement",
      10: "Announcement thread",
      11: "Public thread",
      12: "Private thread",
      13: "Stage",
      14: "Directory",
      15: "Forum",
      16: "Media",
    };

    return names[channel?.type] ?? `Type ${channel?.type ?? "unknown"}`;
  }

  function looksObfuscated(channel) {
    const name = String(channel?.name ?? "").trim().toLowerCase();
    return !name || name === "no access" || name === "no-access";
  }

  function showHiddenInfo(channelOrId) {
    const channel = resolveChannel(channelOrId);
    if (!channel) return;

    const created = snowflakeDate(channel.id);
    const topic = typeof channel.topic === "string" && channel.topic.trim()
      ? channel.topic.trim()
      : "No topic";
    const overwriteCount = channel.permissionOverwrites
      ? Object.keys(channel.permissionOverwrites).length
      : 0;

    const lines = [
      `Name: #${channel.name || "Unknown"}`,
      `Type: ${channelTypeName(channel)}`,
      `Topic: ${topic}`,
      created ? `Created: ${created.toLocaleString()}` : null,
      `Permission overwrites: ${overwriteCount}`,
      `Channel ID: ${channel.id}`,
      "",
      "You do not have permission to view this channel's messages.",
    ];

    if (looksObfuscated(channel)) {
      lines.push(
        "",
        "Discord still has obfuscated metadata cached. Force-close Discord and reopen it once with this plugin enabled.",
      );
    }

    try {
      RN.Alert.alert("Hidden Channel", lines.filter(value => value != null).join("\n"));
    } catch {}
  }

  function addPatch(flag, unpatch) {
    if (typeof unpatch !== "function") return false;
    runtime.patches.push(unpatch);
    runtime.patched[flag] = true;
    return true;
  }

  function patchPrivateChannelObfuscation() {
    let changed = false;

    const privateHiding =
      findByProps(
        "isChannelMetadataObfuscationEnabled",
        "isChannelMetadataIntegrityCheckEnabled",
      )
      ?? findByProps("isChannelMetadataObfuscationEnabled");

    if (privateHiding) {
      for (const method of [
        "isChannelMetadataObfuscationEnabled",
        "isChannelMetadataIntegrityCheckEnabled",
        "getCachedPrivateChannelObfuscation",
      ]) {
        const flag = `private-${method}`;
        if (runtime.patched[flag] || typeof privateHiding[method] !== "function") continue;
        changed = addPatch(
          flag,
          instead(method, privateHiding, () => false),
        ) || changed;
      }
    }

    if (!runtime.patched.gatewayCapabilities) {
      const gatewayCapabilities = findByProps("getClientCapabilities");
      if (gatewayCapabilities?.getClientCapabilities) {
        changed = addPatch(
          "gatewayCapabilities",
          instead("getClientCapabilities", gatewayCapabilities, (args, original) => {
            if (!runtime.active) return original(...args);
            const options = args?.[0];
            const nextOptions = options && typeof options === "object"
              ? { ...options, useChannelObfuscation: false }
              : { useChannelObfuscation: false };
            return original(nextOptions, ...args.slice(1));
          }),
        ) || changed;
      }
    }

    if (!runtime.patched.obfuscationController) {
      const controller = findByProps("setUseChannelObfuscation");
      if (controller?.setUseChannelObfuscation) {
        changed = addPatch(
          "obfuscationController",
          instead("setUseChannelObfuscation", controller, (args, original) => {
            if (!runtime.active) return original(...args);
            return original(false, ...args.slice(1));
          }),
        ) || changed;
      }
    }

    return changed;
  }

  function patchPermissions() {
    if (runtime.patched.permissions) return true;

    const permissions = findByProps("getChannelPermissions", "can");
    const viewChannel = resolveViewChannelPermission();
    if (!permissions?.can || viewChannel == null) return false;

    runtime.realCan ??= permissions.can.bind(permissions);

    return addPatch(
      "permissions",
      after("can", permissions, (args, result) => {
        if (!runtime.active || result === true) return result;

        const [permission, context] = args;
        if (samePermission(permission, viewChannel) && isGuildChannel(context)) {
          return true;
        }

        return result;
      }),
    );
  }

  function getChannelItemTarget() {
    const module = findByProps("getChannelMode");
    if (!module) return null;

    if (typeof module.default === "function") {
      return [module, "default"];
    }
    if (module.default && typeof module.default.type === "function") {
      return [module.default, "type"];
    }
    if (module.default?.type && typeof module.default.type.render === "function") {
      return [module.default.type, "render"];
    }
    if (module.default && typeof module.default.render === "function") {
      return [module.default, "render"];
    }

    return null;
  }

  function patchChannelItems() {
    if (runtime.patched.channelItem) return true;

    const found = getChannelItemTarget();
    if (!found) return false;
    const [target, method] = found;

    return addPatch(
      "channelItem",
      instead(method, target, (args, original) => {
        if (!runtime.active) return original(...args);

        const props = args?.[0];
        const row = props?.channel;
        const channel = resolveChannel(row);
        if (!row || !isHidden(channel)) return original(...args);

        const nextRow = {
          ...row,
          locked: true,
          unread: false,
          onPress: () => showHiddenInfo(channel),
        };
        const nextProps = { ...props, channel: nextRow };
        return original(nextProps, ...args.slice(1));
      }),
    );
  }

  function patchNavigation() {
    if (runtime.patched.navigation) return true;

    const router =
      findByProps("transitionToGuild", "getHistory")
      ?? findByProps("transitionToGuild");
    if (!router?.transitionToGuild) return false;

    return addPatch(
      "navigation",
      instead("transitionToGuild", router, (args, original) => {
        if (!runtime.active) return original(...args);

        const channel = resolveChannel(args?.[1]);
        if (channel && isHidden(channel)) {
          showHiddenInfo(channel);
          return;
        }

        return original(...args);
      }),
    );
  }

  function patchMessageFetching() {
    if (runtime.patched.messageFetch) return true;

    const messageManager = findByProps("stores", "fetchMessages");
    if (!messageManager?.fetchMessages) return false;

    return addPatch(
      "messageFetch",
      instead("fetchMessages", messageManager, (args, original) => {
        if (!runtime.active) return original(...args);

        const request = args?.[0];
        const channelId = typeof request === "string"
          ? request
          : request?.channelId ?? request?.id;

        if (channelId && isHidden(channelId)) return;
        return original(...args);
      }),
    );
  }

  function install() {
    resolveChannelStore();
    resolveViewChannelPermission();

    return [
      patchPrivateChannelObfuscation(),
      patchPermissions(),
      patchChannelItems(),
      patchNavigation(),
      patchMessageFetching(),
    ];
  }

  function cleanup() {
    runtime.active = false;
    while (runtime.patches.length) {
      try { runtime.patches.pop()?.(); } catch {}
    }
    runtime.patched = {};
    runtime.realCan = null;

    if (globalThis[KEY] === runtime) {
      try { delete globalThis[KEY]; } catch { globalThis[KEY] = null; }
    }
  }

  runtime.cleanup = cleanup;
  const early = install();

  return {
    onLoad() {
      runtime.active = true;
      const current = install();

      if (![...early, ...current].some(Boolean) || !runtime.patched.permissions) {
        throw new Error("Discord channel permission modules were not found");
      }
    },
    onUnload: cleanup,
  };
})();