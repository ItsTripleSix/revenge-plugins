(() => {
  "use strict";

  const { after, instead } = vendetta.patcher;
  const { find, findAll, findByProps } = vendetta.metro;
  const { React, ReactNative: RN } = vendetta.metro.common;

  const KEY = "__itsTripleSixHiddenChannelsRuntime";
  const RENDER_LEVEL = {
    CANNOT_SHOW: 1,
    DO_NOT_SHOW: 2,
    COLLAPSED: 3,
    SHOW: 4,
  };
  const IDENTIFY_OPCODE = 2;
  const LEGACY_GATEWAY_CAPABILITIES = 1734655;
  const OBFUSCATION_CACHE_KEY = "private_channel_obfuscation";

  try { globalThis[KEY]?.cleanup?.(); } catch {}

  const runtime = {
    patches: [],
    patched: {},
    patchedSockets: new WeakSet(),
    listeners: new Set(),
    active: true,
    permissionStore: null,
    realCan: null,
    viewChannel: null,
    channelStore: null,
    channelListModule: null,
    gatewayStore: null,
    fastConnect: null,
    forceFullSyncNextIdentify: false,
    lastIdentifyCapabilities: null,
    lastIdentifyAt: null,
    lastIdentifyForcedFullSync: false,
    originalRenderLevels: new Map(),
    touchedCategories: new Set(),
    touchedGuildLists: new Set(),
    cleanup: null,
  };

  globalThis[KEY] = runtime;

  function addPatch(flag, unpatch) {
    if (typeof unpatch !== "function") return false;
    runtime.patches.push(unpatch);
    runtime.patched[flag] = true;
    return true;
  }

  function notify() {
    for (const listener of runtime.listeners) {
      try { listener(); } catch {}
    }
  }

  function useRuntimeRefresh() {
    const [, render] = React.useReducer(value => value + 1, 0);
    React.useEffect(() => {
      runtime.listeners.add(render);
      return () => runtime.listeners.delete(render);
    }, []);
  }

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

  function resolvePermissionStore() {
    if (runtime.permissionStore) return runtime.permissionStore;

    const permissions = findByProps("getChannelPermissions", "can");
    if (!permissions?.can) return null;

    runtime.permissionStore = permissions;
    runtime.realCan = permissions.can.bind(permissions);
    return permissions;
  }

  function resolveChannelStore() {
    if (runtime.channelStore) return runtime.channelStore;

    runtime.channelStore =
      findByProps("getChannel", "getDMFromUserId")
      ?? findByProps("getChannel");

    return runtime.channelStore;
  }

  function resolveChannelListModule() {
    if (runtime.channelListModule) return runtime.channelListModule;

    try {
      runtime.channelListModule = find(module => (
        typeof module?.default === "function"
        && typeof module.default?.prototype?.getGuild === "function"
        && typeof module.default?.prototype?.getGuildChannelRowsOnly === "function"
        && module?.ChannelListSections != null
        && module?.SECTION_INDEX_FIRST_NAMED_CATEGORY != null
      ));
    } catch {
      runtime.channelListModule = null;
    }

    return runtime.channelListModule;
  }

  function resolveGatewayStore() {
    if (runtime.gatewayStore) return runtime.gatewayStore;

    runtime.gatewayStore =
      findByProps("getSocket", "isConnected")
      ?? findByProps("getSocket", "isConnectedOrOverlay");

    return runtime.gatewayStore;
  }

  function resolveFastConnect() {
    if (runtime.fastConnect) return runtime.fastConnect;

    try {
      runtime.fastConnect = findByProps(
        "closeFastConnectSocket",
        "identifyWebSocket",
      );
    } catch {
      runtime.fastConnect = null;
    }

    return runtime.fastConnect;
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
      if (channelOrId.record && typeof channelOrId.record === "object") {
        return channelOrId.record;
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

    resolvePermissionStore();

    if (!runtime.realCan || viewChannel == null || !isGuildChannel(channel)) {
      return false;
    }

    try {
      return runtime.realCan(viewChannel, channel) === false;
    } catch {
      return false;
    }
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
    try {
      if (channel?.isObfuscated?.()) return true;
    } catch {}
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
        "Discord is still holding server-obfuscated metadata. Use Reload real channel metadata in this plugin's settings.",
      );
    }

    try {
      RN.Alert.alert("Hidden Channel", lines.filter(value => value != null).join("\n"));
    } catch {}
  }

  function clearObfuscationCache() {
    try {
      const storageModule = find(module => (
        module?.Storage
        && typeof module.Storage.get === "function"
        && typeof module.Storage.set === "function"
        && typeof module.Storage.remove === "function"
      ));
      storageModule?.Storage?.remove?.(OBFUSCATION_CACHE_KEY);
    } catch {}
  }

  function forceObfuscationOffNow() {
    clearObfuscationCache();

    try {
      const controller = findByProps("setUseChannelObfuscation");
      controller?.setUseChannelObfuscation?.(false);
    } catch {}
  }

  function closeFastConnectNow() {
    const fastConnect = resolveFastConnect();

    try { fastConnect?.closeFastConnectSocket?.(); } catch {}

    try {
      const holder = globalThis.window?._ws;
      holder?.ws?.close?.(1000);
      if (globalThis.window) globalThis.window._ws = null;
    } catch {}
  }

  function patchFastConnect() {
    if (runtime.patched.fastConnectIdentify) {
      closeFastConnectNow();
      return true;
    }

    const fastConnect = resolveFastConnect();
    if (!fastConnect?.identifyWebSocket) return false;

    const patched = addPatch(
      "fastConnectIdentify",
      instead("identifyWebSocket", fastConnect, (args, original) => {
        if (!runtime.active) return original(...args);
        return;
      }),
    );

    closeFastConnectNow();
    return patched;
  }

  function patchSocketSend(socket) {
    if (!socket || typeof socket.send !== "function") return false;
    if (runtime.patchedSockets.has(socket)) return true;

    let unpatch;
    try {
      unpatch = instead("send", socket, (args, original) => {
        if (runtime.active && args?.[0] === IDENTIFY_OPCODE) {
          const payload = args?.[1];
          if (payload && typeof payload === "object") {
            const forceFullSync = runtime.forceFullSyncNextIdentify === true;
            const nextPayload = {
              ...payload,
              capabilities: LEGACY_GATEWAY_CAPABILITIES,
            };

            if (forceFullSync) {
              const clientState = payload.client_state && typeof payload.client_state === "object"
                ? payload.client_state
                : {};

              nextPayload.client_state = {
                ...clientState,
                guild_versions: {},
              };
              runtime.forceFullSyncNextIdentify = false;
            }

            const nextArgs = [...args];
            nextArgs[1] = nextPayload;

            runtime.lastIdentifyCapabilities = LEGACY_GATEWAY_CAPABILITIES;
            runtime.lastIdentifyAt = Date.now();
            runtime.lastIdentifyForcedFullSync = forceFullSync;
            notify();

            return original(...nextArgs);
          }
        }

        return original(...args);
      });
    } catch {
      return false;
    }

    if (typeof unpatch !== "function") return false;
    runtime.patchedSockets.add(socket);
    runtime.patches.push(unpatch);
    return true;
  }

  function patchGatewaySocket() {
    const gateway = resolveGatewayStore();
    if (!gateway?.getSocket) return false;

    let changed = false;

    if (!runtime.patched.gatewayGetSocket) {
      changed = addPatch(
        "gatewayGetSocket",
        after("getSocket", gateway, (_args, socket) => {
          if (runtime.active) patchSocketSend(socket);
          return socket;
        }),
      ) || changed;
    }

    try {
      changed = patchSocketSend(gateway.getSocket()) || changed;
    } catch {}

    return changed || runtime.patched.gatewayGetSocket === true;
  }

  function reconnectGatewayFresh() {
    forceObfuscationOffNow();
    patchFastConnect();
    closeFastConnectNow();
    patchGatewaySocket();

    const gateway = resolveGatewayStore();
    let socket = null;
    try { socket = gateway?.getSocket?.(); } catch {}

    if (!socket) {
      try {
        RN.Alert.alert(
          "Hidden Channels",
          "Discord's gateway connection could not be found. Force-close Discord and reopen it instead.",
        );
      } catch {}
      return;
    }

    runtime.forceFullSyncNextIdentify = true;
    runtime.lastIdentifyForcedFullSync = false;
    notify();

    try {
      socket.sessionId = null;
      socket.seq = 0;
      socket.setResumeUrl?.(null);

      if (typeof socket._handleReconnect === "function") {
        socket._handleReconnect();
      } else if (typeof socket.close === "function" && typeof socket.connect === "function") {
        socket.close();
        setTimeout(() => {
          try { socket.connect(); } catch {}
        }, 250);
      } else {
        throw new Error("No reconnect method");
      }

      RN.Alert.alert(
        "Hidden Channels",
        "Discord is reconnecting with the legacy channel-metadata capability and requesting a full guild/channel sync. Give the server list a few seconds to reload.",
      );
    } catch {
      try {
        RN.Alert.alert(
          "Hidden Channels",
          "The gateway could not be refreshed. Force-close Discord and reopen it instead.",
        );
      } catch {}
    }
  }

  function revealCategory(category) {
    if (!category?.channels || typeof category.channels !== "object") return false;

    let changed = false;
    const targetLevel = category.isCollapsed === true
      ? RENDER_LEVEL.COLLAPSED
      : RENDER_LEVEL.SHOW;

    for (const item of Object.values(category.channels)) {
      const record = item?.record;
      if (!record || !isHidden(record)) continue;

      if (!runtime.originalRenderLevels.has(item)) {
        runtime.originalRenderLevels.set(item, item.renderLevel);
      }

      if (item.renderLevel !== targetLevel) {
        item.renderLevel = targetLevel;
        changed = true;
      }
    }

    if (changed) {
      category.shownChannelIds = null;
      runtime.touchedCategories.add(category);
    }

    return changed;
  }

  function revealGuildList(guildList) {
    if (!guildList || typeof guildList !== "object") return guildList;

    const categories = [];
    if (guildList.noParentCategory) categories.push(guildList.noParentCategory);
    if (guildList.categories && typeof guildList.categories === "object") {
      categories.push(...Object.values(guildList.categories));
    }
    if (guildList.voiceChannelsCategory) {
      categories.push(guildList.voiceChannelsCategory);
    }

    let changed = false;
    for (const category of categories) {
      changed = revealCategory(category) || changed;
    }

    if (changed) {
      guildList.rows = null;
      guildList.sections = null;
      guildList.allChannelsById = null;
      guildList.firstVoiceChannel = undefined;
      if (typeof guildList.version === "number") guildList.version += 1;
      runtime.touchedGuildLists.add(guildList);
    }

    return guildList;
  }

  function patchChannelListState() {
    if (runtime.patched.channelListState) return true;

    const module = resolveChannelListModule();
    const proto = module?.default?.prototype;
    if (!proto?.getGuild || !proto?.getGuildChannelRowsOnly) return false;

    const unpatchGuild = after("getGuild", proto, (_args, result) => {
      if (!runtime.active) return result;
      return revealGuildList(result);
    });

    const unpatchRows = after("getGuildChannelRowsOnly", proto, (_args, result) => {
      if (!runtime.active) return result;
      return revealGuildList(result);
    });

    runtime.patches.push(unpatchGuild, unpatchRows);
    runtime.patched.channelListState = true;
    return true;
  }

  function patchPrivateChannelObfuscation() {
    let changed = false;

    try {
      const modules = findAll(module => (
        typeof module?.isChannelMetadataObfuscationEnabled === "function"
        || typeof module?.useIsChannelMetadataObfuscationEnabled === "function"
        || typeof module?.isChannelMetadataIntegrityCheckEnabled === "function"
        || typeof module?.getCachedPrivateChannelObfuscation === "function"
      ));

      modules.forEach((module, index) => {
        if (!module) return;

        for (const method of [
          "isChannelMetadataObfuscationEnabled",
          "useIsChannelMetadataObfuscationEnabled",
          "isChannelMetadataIntegrityCheckEnabled",
          "getCachedPrivateChannelObfuscation",
        ]) {
          if (typeof module[method] !== "function") continue;
          const flag = `private-${index}-${method}`;
          if (runtime.patched[flag]) continue;

          changed = addPatch(
            flag,
            instead(method, module, () => false),
          ) || changed;
        }
      });
    } catch {}

    if (!runtime.patched.gatewayCapabilities) {
      const gatewayCapabilities = findByProps("getClientCapabilities");
      if (gatewayCapabilities?.getClientCapabilities) {
        changed = addPatch(
          "gatewayCapabilities",
          instead("getClientCapabilities", gatewayCapabilities, () => LEGACY_GATEWAY_CAPABILITIES),
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

    forceObfuscationOffNow();
    return changed;
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

        const previous = {
          locked: row.locked,
          unread: row.unread,
          onPress: row.onPress,
        };
        const hadLocked = Object.prototype.hasOwnProperty.call(row, "locked");
        const hadUnread = Object.prototype.hasOwnProperty.call(row, "unread");
        const hadOnPress = Object.prototype.hasOwnProperty.call(row, "onPress");

        try {
          row.locked = true;
          row.unread = false;
          row.onPress = () => showHiddenInfo(channel);
          return original(...args);
        } finally {
          try {
            if (hadLocked) row.locked = previous.locked;
            else delete row.locked;
            if (hadUnread) row.unread = previous.unread;
            else delete row.unread;
            if (hadOnPress) row.onPress = previous.onPress;
            else delete row.onPress;
          } catch {}
        }
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
    resolvePermissionStore();
    resolveViewChannelPermission();

    return [
      patchPrivateChannelObfuscation(),
      patchFastConnect(),
      patchGatewaySocket(),
      patchChannelListState(),
      patchChannelItems(),
      patchNavigation(),
      patchMessageFetching(),
    ];
  }

  function Settings() {
    useRuntimeRefresh();

    let diagnostic = "No gateway IDENTIFY has been captured yet.";
    if (runtime.lastIdentifyCapabilities != null) {
      const when = runtime.lastIdentifyAt
        ? new Date(runtime.lastIdentifyAt).toLocaleTimeString()
        : "unknown time";
      diagnostic = [
        `Last IDENTIFY capabilities: ${runtime.lastIdentifyCapabilities}`,
        `Full guild/channel sync: ${runtime.lastIdentifyForcedFullSync ? "yes" : "no"}`,
        `Captured: ${when}`,
      ].join("\n");
    } else if (runtime.forceFullSyncNextIdentify) {
      diagnostic = "Waiting for the forced fresh IDENTIFY...";
    }

    return React.createElement(
      RN.ScrollView,
      { contentContainerStyle: { padding: 16, paddingBottom: 32 } },
      React.createElement(
        RN.Text,
        {
          style: {
            color: "#F2F3F5",
            fontSize: 20,
            fontWeight: "700",
            marginBottom: 8,
          },
        },
        "Hidden Channels",
      ),
      React.createElement(
        RN.Text,
        {
          style: {
            color: "#B5BAC1",
            fontSize: 14,
            lineHeight: 20,
            marginBottom: 16,
          },
        },
        "Hidden channels are inserted into Discord's normal channel list while Discord's real VIEW_CHANNEL permission stays untouched. The gateway is forced to request the non-obfuscated channel metadata format.",
      ),
      React.createElement(
        RN.Pressable,
        {
          onPress: reconnectGatewayFresh,
          style: {
            minHeight: 46,
            borderRadius: 8,
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: "#5865F2",
            paddingHorizontal: 14,
          },
        },
        React.createElement(
          RN.Text,
          { style: { color: "#FFFFFF", fontSize: 15, fontWeight: "700" } },
          "Reload real channel metadata",
        ),
      ),
      React.createElement(
        RN.Text,
        {
          style: {
            color: "#80848E",
            fontSize: 12,
            lineHeight: 17,
            marginTop: 10,
          },
        },
        "This closes Discord's fast-connect socket, forces a fresh IDENTIFY, and clears the cached guild versions once so Discord must request the channel records again. Avoid using it during an active voice call.",
      ),
      React.createElement(
        RN.View,
        {
          style: {
            marginTop: 16,
            padding: 12,
            borderRadius: 8,
            backgroundColor: "#1E1F22",
          },
        },
        React.createElement(
          RN.Text,
          {
            style: {
              color: "#DBDEE1",
              fontSize: 13,
              lineHeight: 19,
            },
          },
          diagnostic,
        ),
      ),
    );
  }

  function cleanup() {
    runtime.active = false;

    while (runtime.patches.length) {
      try { runtime.patches.pop()?.(); } catch {}
    }

    for (const [item, originalLevel] of runtime.originalRenderLevels) {
      try { item.renderLevel = originalLevel; } catch {}
    }
    for (const category of runtime.touchedCategories) {
      try { category.shownChannelIds = null; } catch {}
    }
    for (const guildList of runtime.touchedGuildLists) {
      try {
        guildList.rows = null;
        guildList.sections = null;
        guildList.allChannelsById = null;
        guildList.firstVoiceChannel = undefined;
        if (typeof guildList.version === "number") guildList.version += 1;
      } catch {}
    }

    runtime.listeners.clear();
    runtime.originalRenderLevels.clear();
    runtime.touchedCategories.clear();
    runtime.touchedGuildLists.clear();
    runtime.patched = {};
    runtime.realCan = null;
    runtime.permissionStore = null;
    runtime.forceFullSyncNextIdentify = false;

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

      if (![...early, ...current].some(Boolean) || !runtime.patched.channelListState) {
        throw new Error("Discord's channel-list modules were not found");
      }
    },
    onUnload: cleanup,
    settings: Settings,
  };
})();